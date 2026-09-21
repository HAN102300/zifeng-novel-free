import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Typography, message } from 'antd';
import { Pie, Column } from '@ant-design/charts';
import {
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { ZfPageHeader, ZfStatCard, ZfGrid, ZfEmptyState } from '@zifeng/ui/components';
import { useBreakpoint } from '@zifeng/ui/hooks';
import {
  donutConfig,
  columnConfig,
  chartSize,
  splitByMagnitude,
} from '@zifeng/ui/charts/preset';
import { getAdminSourceStats } from '../../utils/adminApi';
import { ThemeContext } from '../../App';
import ChartCard from '../../components/ChartCard';

const { Text } = Typography;

const SummaryGrid = ({ stats, loading }) => (
  <ZfGrid min={200} gap="var(--zf-s4)">
    <ZfStatCard
      label="总书源数"
      icon={<DatabaseOutlined />}
      value={Number(stats?.total || 0).toLocaleString()}
      loading={loading}
    />
    <ZfStatCard
      label="已启用"
      icon={<CheckCircleOutlined />}
      tone="success"
      value={Number(stats?.enabled || 0).toLocaleString()}
      loading={loading}
    />
    <ZfStatCard
      label="已禁用"
      icon={<CloseCircleOutlined />}
      tone="error"
      value={Number(Math.max((stats?.total || 0) - (stats?.enabled || 0), 0)).toLocaleString()}
      loading={loading}
    />
  </ZfGrid>
);

const SourceStats = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { isDesktop } = useBreakpoint();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  /* 取数包在异步 run() 里（与 zifeng-web 的 RankDetail 同形）：effect 的同步路径上
     不产生任何状态更新。loading 的首屏值由 useState(true) 给出，不再在取数开头置位 */
  const fetchData = useCallback(() => {
    const run = async () => {
      try {
        const res = await getAdminSourceStats();
        setStats(res.data?.data || {});
      } catch {
        message.error('获取统计数据失败');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const n = (key) => Number(stats?.[key] || 0);

  const enablePieData = [
    { type: '已启用', value: n('enabled') },
    { type: '已禁用', value: Math.max(n('total') - n('enabled'), 0) },
  ].filter((d) => d.value > 0);

  const typePieData = [
    { type: '文本(API)', value: n('typeText') },
    { type: '网页', value: n('typeWeb') },
    { type: '漫画', value: n('typeComic') },
    { type: '音频', value: n('typeAudio') },
  ].filter((d) => d.value > 0);

  const featureBarData = [
    { feature: '含搜索', value: n('hasSearch') },
    { feature: '含正文', value: n('hasContent') },
    { feature: '含发现', value: n('hasExploreUrl') },
    { feature: '含登录', value: n('hasLogin') },
    { feature: '含发现规则', value: n('hasExplore') },
    { feature: '含JS脚本', value: n('hasJs') },
    { feature: '含Cookie', value: n('hasCookie') },
  ];

  const mode = isDarkMode ? 'dark' : 'light';

  /* 功能特性这组是同口径的书源计数，数量级可比 —— 所以它才是真正适合画柱图的那张。
     用同一个 splitByMagnitude 做护栏：一旦某项（例如「含JS脚本」）与其他项拉开 20× 以上，
     柱子会集体贴底变成 0，此时退回 KPI 卡读数，而不是画一根误导人的图。 */
  const featureMagnitude = splitByMagnitude(featureBarData, { valueOf: (d) => d.value });
  const featureComparable = featureMagnitude.kpi.length === 0;

  const mkDonut = (data) => ({
    ...donutConfig({ mode, height: chartSize.standard }),
    data,
    angleField: 'value',
    colorField: 'type',
    label: {
      ...donutConfig({ mode }).label,
      text: (d) => `${d.type}: ${Number(d.value).toLocaleString()}`,
      connector: true,
      layout: [{ type: 'hide-overlap' }, { type: 'limit-in-canvas', margin: 10 }],
    },
    tooltip: (d) => ({ name: d.type, value: Number(d.value).toLocaleString() }),
  });

  const featureBarCfg = {
    ...columnConfig({ mode, height: chartSize.featured }),
    data: featureBarData,
    xField: 'feature',
    yField: 'value',
    colorField: 'feature',
    label: { text: (d) => Number(d.value).toLocaleString(), position: 'top', dy: -4 },
    tooltip: (d) => ({ name: d.feature, value: Number(d.value).toLocaleString() }),
  };

  const donutGrid = {
    display: 'grid',
    gridTemplateColumns: isDesktop ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
    gap: 'var(--zf-s4)',
  };

  const pieBody = (data, cfg) =>
    data.length === 0 ? (
      <ZfEmptyState compact icon="◍" title="暂无数据" description="当前书源集合里没有命中该项。" />
    ) : (
      <Pie {...cfg} />
    );

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
      <ZfPageHeader title="书源统计" subtitle="书源启用状态、类型与功能覆盖度" />

      <div style={{ marginTop: 'var(--zf-s5)' }}>
        <SummaryGrid stats={stats} loading={loading} />
      </div>

      <div style={{ ...donutGrid, marginTop: 'var(--zf-s4)' }}>
        <ChartCard title="启用状态分布">{pieBody(enablePieData, mkDonut(enablePieData))}</ChartCard>
        <ChartCard title="书源类型分布">{pieBody(typePieData, mkDonut(typePieData))}</ChartCard>
      </div>

      <ChartCard title="功能特性统计" style={{ marginTop: 'var(--zf-s4)' }}>
        {featureBarData.length === 0 ? (
          <Text style={{ color: 'var(--zf-text-muted)', fontSize: 'var(--zf-fs-sm)' }}>
            暂无书源，无法统计功能覆盖度
          </Text>
        ) : featureComparable ? (
          <Column {...featureBarCfg} />
        ) : (
          /* 数量级悬殊时不画同轴柱图，直接用 KPI 卡读数 */
          <ZfGrid min={140} gap="var(--zf-s3)">
            {featureBarData.map((f) => (
              <ZfStatCard key={f.feature} label={f.feature} value={Number(f.value).toLocaleString()} />
            ))}
          </ZfGrid>
        )}
      </ChartCard>
    </div>
  );
};

export default SourceStats;
