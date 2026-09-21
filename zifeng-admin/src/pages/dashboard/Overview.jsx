import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Typography, message } from 'antd';
import { Area, Pie, Column } from '@ant-design/charts';
import {
  EyeOutlined,
  CalendarOutlined,
  UserOutlined,
  UserAddOutlined,
  TeamOutlined,
  StarOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { ZfPageHeader, ZfStatCard, ZfGrid, ZfSkeleton, ZfErrorState } from '@zifeng/ui/components';
import { useBreakpoint } from '@zifeng/ui/hooks';
import {
  areaConfig,
  donutConfig,
  columnConfig,
  chartSize,
  sequenceColors,
  splitByMagnitude,
} from '@zifeng/ui/charts/preset';
import { getDashboard, getOnlineUsers } from '../../utils/adminApi';
import { ThemeContext } from '../../App';
import ChartCard from '../../components/ChartCard';

const { Text } = Typography;

/* KPI 定义与配色解耦：数字一律 var(--zf-text-primary) + tabular-nums（ZfStatCard 内置）。
   原先这里挂着 7 组高饱和色字面量（蓝/绿/紫/靛/橙/粉/青）配 7 条同色渐变，
   纯装饰，且在暗色模式下刺眼、在浅色模式下对比度失控。 */
const KPI_FIELDS = [
  { title: '总访问量', field: 'totalVisits', icon: <EyeOutlined /> },
  { title: '今日访问', field: 'todayVisits', icon: <CalendarOutlined /> },
  { title: '在线用户', liveKey: 'onlineUsers', icon: <UserOutlined /> },
  { title: '在线访客', liveKey: 'onlineVisitors', icon: <UserAddOutlined /> },
  { title: '总用户数', field: 'totalUsers', icon: <TeamOutlined /> },
  { title: '书架收藏', field: 'totalBookshelfItems', icon: <StarOutlined /> },
  { title: '阅读记录', field: 'totalReadingHistory', icon: <HistoryOutlined /> },
];

/* 图表卡见 src/components/ChartCard.jsx —— 标题前不再放渐变小圆点，
   全站只保留侧栏顶端一条渐变装饰。 */

const Overview = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { isDesktop } = useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [onlineVisitors, setOnlineVisitors] = useState(0);

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：effect 的同步路径上
     不产生任何状态更新。loading 的首屏值由 useState(true) 给出，不再在取数开头置位 */
  const fetchData = useCallback(() => {
    const run = async () => {
      try {
        const res = await getDashboard();
        setData(res.data?.data || {});
      } catch {
        message.error('获取仪表盘数据失败');
        setError(new Error('无法加载仪表盘数据'));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  /* 重试是事件触发，在回调里回到加载态并清掉错误 */
  const retry = () => {
    setLoading(true);
    setError(null);
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* 原先这里是一个空的 catch {} —— 在线人数悄悄停在 0，看起来像「真的没人在线」。
     现在至少给出一次提示；轮询本身保持原行为（30s 一次）。 */
  useEffect(() => {
    const fetchOnline = async () => {
      try {
        const res = await getOnlineUsers();
        setOnlineUsers(res.data?.data?.onlineUsers || 0);
        setOnlineVisitors(res.data?.data?.onlineVisitors || 0);
      } catch {
        message.error('获取在线数据失败');
      }
    };
    fetchOnline();
    const interval = setInterval(fetchOnline, 30000);
    return () => clearInterval(interval);
  }, []);

  const live = { onlineUsers, onlineVisitors };
  const statItems = KPI_FIELDS.map((k) => ({
    title: k.title,
    icon: k.icon,
    value: Number(k.liveKey ? live[k.liveKey] : (data?.[k.field] ?? 0)),
  }));

  const visitTrendData = (data?.visitTrend || []).map((v) => ({ date: v.date, value: v.count }));

  const ipPieData = [
    { type: '今日IP', value: data?.todayIps || 0 },
    { type: '历史累计IP', value: Math.max((data?.totalIps || 0) - (data?.todayIps || 0), 0) },
  ];

  /* 数据模型护栏：原先把「总访问量 2206」和「在线用户 0」塞进同一根 Column，
     6 根柱子视觉高度全是 0 —— 既误导也读不出信息。
     现在数量级悬殊的指标一律走上面的 KPI 排；只有当这些值确实可比时
     （splitByMagnitude 判定跨度 ≤ 20×）才画同轴柱图。 */
  const mode = isDarkMode ? 'dark' : 'light';
  const magnitude = splitByMagnitude(statItems.map((s) => ({ name: s.title, value: s.value })));
  const showComparableColumn = magnitude.kpi.length === 0 && magnitude.comparable.length > 1;

  const columnCfg = {
    ...columnConfig({ mode, height: chartSize.featured }),
    data: magnitude.comparable,
    xField: 'name',
    yField: 'value',
    colorField: 'name',
    label: { text: (d) => Number(d.value).toLocaleString(), textBaseline: 'bottom' },
    tooltip: (d) => ({ name: d.name, value: Number(d.value).toLocaleString() }),
  };

  const donutCfg = {
    ...donutConfig({ mode, height: chartSize.standard }),
    data: ipPieData,
    angleField: 'value',
    colorField: 'type',
    label: {
      ...donutConfig({ mode }).label,
      text: (d) => `${d.type}: ${Number(d.value).toLocaleString()}`,
      connector: true,
      layout: [{ type: 'overlap-hide' }, { type: 'limit-in-canvas' }],
    },
    tooltip: (d) => ({ name: d.type, value: Number(d.value).toLocaleString() }),
  };

  const areaCfg = {
    ...areaConfig({ mode, height: chartSize.featured }),
    data: visitTrendData,
    xField: 'date',
    yField: 'value',
    smooth: true,
    line: { style: { stroke: sequenceColors[0], lineWidth: 2 } },
    tooltip: (d) => ({ name: '访问量', value: Number(d.value).toLocaleString(), title: d.date }),
  };

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      <ZfPageHeader title="数据概览" subtitle={today} />

      {error ? (
        <ZfErrorState error={error} onRetry={retry} title="仪表盘数据加载失败" style={{ paddingTop: 'var(--zf-s8)' }} />
      ) : (
        <>
          <ZfGrid min={172} gap="var(--zf-s3)" style={{ marginTop: 'var(--zf-s5)' }}>
            {statItems.map((item) => (
              <ZfStatCard
                key={item.title}
                label={item.title}
                icon={item.icon}
                value={item.value.toLocaleString()}
                loading={loading}
              />
            ))}
          </ZfGrid>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                showComparableColumn && isDesktop ? 'minmax(0, 3fr) minmax(0, 2fr)' : 'minmax(0, 1fr)',
              gap: 'var(--zf-s4)',
              marginTop: 'var(--zf-s4)',
            }}
          >
            {showComparableColumn ? (
              <ChartCard title="核心数据指标">
                <Column {...columnCfg} />
              </ChartCard>
            ) : null}
            <ChartCard title="IP分布">
              {loading ? (
                <ZfSkeleton variant="block" height={chartSize.standard} />
              ) : (
                <Pie {...donutCfg} />
              )}
            </ChartCard>
          </div>

          <ChartCard title="访问趋势" style={{ marginTop: 'var(--zf-s4)' }}>
            {loading ? (
              <ZfSkeleton variant="block" height={chartSize.featured} />
            ) : visitTrendData.length === 0 ? (
              <Text style={{ color: 'var(--zf-text-muted)', fontSize: 'var(--zf-fs-sm)' }}>
                暂无访问趋势数据
              </Text>
            ) : (
              <Area {...areaCfg} />
            )}
          </ChartCard>
        </>
      )}
    </div>
  );
};

export default Overview;
