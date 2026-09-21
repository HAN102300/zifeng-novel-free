import React, { useState, useEffect, useMemo } from 'react';
import { Input, Switch, Tooltip, Button, message } from 'antd';
import {
  SearchOutlined,
  DatabaseOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  GlobalOutlined,
  SoundOutlined,
  ReadOutlined,
  CloudSyncOutlined,
  AimOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import {
  getBookSources,
  toggleBookSource as toggleLocalSource,
  getActiveSource,
  setActiveSource,
  saveBookSources,
  normalizeSources,
} from '../utils/bookSourceManager';
import {
  getAllEnabledSources,
  toggleBookSource as toggleBackendSource,
  importBookSources,
} from '../utils/apiClient';
import { CountUp, ShinyText, ReactBitsErrorBoundary } from '../components/react-bits';
import {
  ZfPageShell,
  ZfGrid,
  ZfPageHeader,
  ZfGlassSurface,
  ZfPill,
  ZfStatCard,
  ZfSkeleton,
  ZfEmptyState,
} from '@zifeng/ui/components';
import { variants } from '@zifeng/ui/motion';

/* ============================================================
   紫枫免费小说 · 书源管理（P2 迁移）
   - 三张「一人一色」统计卡 → ZfStatCard（数字统一文本色 + tabular-nums，
     tone 只给图标/语义色），加载态用它的 loading 骨架而不是整块灰条
   - 标签汤收敛：每行只剩「类型 + 分组」两枚中性胶囊；
     「当前默认」不再是名字旁边的紫色 Tag，而是右侧那颗按钮的选中态
     （ZfPill tone=brand）；启用/禁用才用 status tone（用途锁定）
   - 选中态从「只有被选中那一行有紫色左边框」改为每行同一根槽位：
     未选中是 transparent，选中是品牌渐变条 + tint 底 + 品牌描边
   - 行内补常驻可见的操作位：「设为默认」按钮与启用开关一直看得见，
     不再靠「点整行」这种零提示的隐藏交互（编辑/删除/导入在 web 端
     没有对应接口，故不放假按钮 —— 见 README 说明）
   - URL 行改 --zf-font-mono，等宽且可断词
   - 搜索框与导航栏同一枚（同为 className="zf-search-input"，
     共用 App.css 里那条焦点磁吸），不再自己写 borderRadius
   - 容器 → ZfPageShell size="md"（原先页面自己写 maxWidth 900）
   - 行入场不再 DOM 逐帧（staggerFadeIn / fadeInUp 直接改元素 style）：
     整块列表用 variants.fadeUp 一次揭示，行本身只挂 CSS 悬停底色
   - 保留：本地/后端双通道取数、resolveActiveUrl 归一匹配、开关回滚
   ============================================================ */

/* 类型是「书源种类」而非状态语义，故全部中性色；只有状态位才用语义色 */
const SOURCE_TYPE = {
  0: { label: 'API', icon: <ApiOutlined /> },
  1: { label: '网页', icon: <GlobalOutlined /> },
  2: { label: '漫画', icon: <ReadOutlined /> },
  3: { label: '音频', icon: <SoundOutlined /> },
};

const COL = { display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)', minWidth: 0 };
const ROW_MAIN = { display: 'flex', alignItems: 'center', gap: 'var(--zf-s4)', minWidth: 0 };
const ROW_BODY = { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 };
const NAME_LINE = { display: 'flex', alignItems: 'center', gap: 'var(--zf-s2)', flexWrap: 'wrap', minWidth: 0 };
const URL_LINE = {
  fontSize: 'var(--zf-fs-xs)',
  color: 'var(--zf-text-muted)',
  wordBreak: 'break-all',
};
const ACTIONS = { display: 'flex', alignItems: 'center', gap: 'var(--zf-s3)', flexShrink: 0 };

/** 一行书源 */
function SourceRow({ source, isActive, onSetActive, onToggle }) {
  const type = SOURCE_TYPE[source.bookSourceType] ?? SOURCE_TYPE[0];

  return (
    <div
      className="zf-row-hover"
      role="button"
      tabIndex={0}
      onClick={() => onSetActive(source.bookSourceUrl)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSetActive(source.bookSourceUrl);
        }
      }}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--zf-s4)',
        padding: 'var(--zf-s4) var(--zf-s5)',
        cursor: 'pointer',
        overflow: 'hidden',
        borderBottom: '1px solid var(--zf-glass-border)',
        background: isActive ? 'var(--zf-tint-brand-08)' : undefined,
      }}
    >
      {/* 选中态槽位：每行都有这根 3px 竖条，未选中时透明 —— 不再只有
          选中那一行才「凭空」多出左边框 */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: isActive ? 'var(--zf-grad-brand)' : 'transparent',
        }}
      />

      <div style={ROW_BODY}>
        <div style={NAME_LINE}>
          <span
            className="zf-truncate"
            title={source.bookSourceName}
            style={{
              fontSize: 'var(--zf-fs-base)',
              fontWeight: 'var(--zf-fw-strong)',
              color: 'var(--zf-text-primary)',
              maxWidth: 260,
            }}
          >
            {source.bookSourceName || '未命名书源'}
          </span>
          <ZfPill size="xs" icon={type.icon}>
            {type.label}
          </ZfPill>
          {source.bookSourceGroup ? <ZfPill size="xs">{source.bookSourceGroup}</ZfPill> : null}
        </div>
        <span className="zf-mono" style={URL_LINE} title={source.bookSourceUrl}>
          {source.bookSourceUrl}
        </span>
      </div>

      <div style={ACTIONS} onClick={(e) => e.stopPropagation()}>
        {isActive ? (
          <ZfPill tone="brand" size="sm" icon={<AimOutlined />}>
            当前默认
          </ZfPill>
        ) : (
          <Tooltip title="搜索时把这本书源作为默认源">
            <Button size="small" classNames={{ root: 'zf-btn zf-btn--ghost' }} onClick={() => onSetActive(source.bookSourceUrl)}>
              设为默认
            </Button>
          </Tooltip>
        )}

        <Tooltip title={source.enabled ? '已启用 · 搜索时可使用此书源' : '已禁用 · 搜索时将跳过此书源'}>
          <div style={ROW_MAIN}>
            <Switch size="small" checked={source.enabled} onChange={(checked) => onToggle(source.bookSourceUrl, checked)} />
            <ZfPill size="xs" tone={source.enabled ? 'success' : 'error'}>
              {source.enabled ? '启用' : '禁用'}
            </ZfPill>
          </div>
        </Tooltip>
      </div>
    </div>
  );
}

const BookSourcePage = () => {
  const [sources, setSources] = useState([]);
  const [activeSourceUrl, setActiveSourceUrl] = useState('');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const isLoggedIn = !!localStorage.getItem('zifeng_token');

  const resolveActiveUrl = (list) => {
    let activeUrl = '';
    try {
      activeUrl = localStorage.getItem('zifeng_active_source') || '';
    } catch {
      /* 隐私模式 / 禁用 localStorage：没有已存默认源，走后续兜底 */
    }

    const normalizeUrl = (url) => (url || '').replace(/^https?:\/\//, '').replace(/\/+$/, '').toLowerCase();

    if (activeUrl) {
      const exact = list.find((s) => s.bookSourceUrl === activeUrl);
      if (exact) return exact.bookSourceUrl;
      const norm = normalizeUrl(activeUrl);
      const fuzzy = list.find((s) => normalizeUrl(s.bookSourceUrl) === norm);
      if (fuzzy) return fuzzy.bookSourceUrl;
    }

    const localActive = getActiveSource();
    if (localActive && localActive.bookSourceUrl) {
      const exact = list.find((s) => s.bookSourceUrl === localActive.bookSourceUrl);
      if (exact) return exact.bookSourceUrl;
      const norm = normalizeUrl(localActive.bookSourceUrl);
      const fuzzy = list.find((s) => normalizeUrl(s.bookSourceUrl) === norm);
      if (fuzzy) return fuzzy.bookSourceUrl;
      const byName = list.find((s) => s.bookSourceName === localActive.bookSourceName);
      if (byName) return byName.bookSourceUrl;
    }

    if (list.length > 0) return list[0].bookSourceUrl;
    return '';
  };

  const syncToLocal = (backendSources) => {
    saveBookSources(normalizeSources(backendSources));
  };

  const syncToBackend = async (localSources) => {
    try {
      const cleanSources = localSources.map((s) => {
        const copy = { ...s };
        delete copy.id;
        delete copy.userId;
        delete copy.createdAt;
        delete copy.updatedAt;
        return copy;
      });
      await importBookSources(cleanSources);
    } catch {
      /* 本地新增书源回推服务器失败不打断浏览：下次进页面还会再试 */
    }
  };

  const loadSources = async () => {
    setLoading(true);
    try {
      let list = [];

      try {
        const res = await getAllEnabledSources();
        const backendSources = res.data?.data;
        if (backendSources && backendSources.length > 0) {
          list = normalizeSources(backendSources);
          syncToLocal(backendSources);
        } else {
          list = getBookSources();
          if (list.length > 0) {
            syncToBackend(list);
          }
        }
      } catch {
        list = getBookSources();
      }

      setSources(list);
      setActiveSourceUrl(resolveActiveUrl(list));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
  }, []);

  const handleSyncFromBackend = async () => {
    setSyncLoading(true);
    try {
      const res = await getAllEnabledSources();
      const backendSources = res.data?.data;
      if (backendSources && backendSources.length > 0) {
        const list = normalizeSources(backendSources);
        setSources(list);
        syncToLocal(backendSources);
        setActiveSourceUrl(resolveActiveUrl(list));
        message.success(`已从服务器同步 ${backendSources.length} 个书源`);
      } else {
        message.info('服务器暂无书源数据');
      }
    } catch {
      message.error('同步失败，请检查网络连接');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleSetActive = (url) => {
    if (url === activeSourceUrl) return;
    setActiveSource(url);
    setActiveSourceUrl(url);
    message.success('已设为搜索默认书源');
  };

  const handleToggle = async (url, enabled) => {
    setSources((prev) => prev.map((s) => (s.bookSourceUrl === url ? { ...s, enabled } : s)));

    const updated = toggleLocalSource(url, enabled);

    try {
      await toggleBackendSource(url, enabled);
    } catch {
      setSources(updated);
    }

    message.info(enabled ? '已启用该书源，搜索时可使用' : '已禁用该书源，搜索时将跳过');
  };

  const filteredSources = useMemo(() => {
    if (!searchText) return sources;
    const q = searchText.toLowerCase();
    return sources.filter(
      (s) =>
        (s.bookSourceName || '').toLowerCase().includes(q) ||
        (s.bookSourceUrl || '').toLowerCase().includes(q) ||
        (s.bookSourceGroup || '').toLowerCase().includes(q),
    );
  }, [sources, searchText]);

  const enabledCount = useMemo(() => sources.filter((s) => s.enabled).length, [sources]);

  const headerExtra = (
    <>
      <ZfPill tone={enabledCount ? 'success' : 'neutral'}>启用 {enabledCount}</ZfPill>
      <Input
        className="zf-search-input"
        placeholder="搜索书源..."
        prefix={<SearchOutlined style={{ color: 'var(--zf-text-faint)' }} />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ width: 200 }}
        allowClear
      />
    </>
  );

  if (loading) {
    return (
      <ZfPageShell
        size="md"
        header={<ZfPageHeader icon={<DatabaseOutlined />} title="现有书源" subtitle="载入中…" extra={headerExtra} />}
      >
        <div style={COL}>
          <ZfGrid min={150}>
            <ZfStatCard label="总书源" value="0" loading icon={<DatabaseOutlined />} />
            <ZfStatCard label="已启用" value="0" loading tone="success" icon={<CheckCircleOutlined />} />
            <ZfStatCard label="已禁用" value="0" loading tone="error" icon={<CloseCircleOutlined />} />
          </ZfGrid>
          <ZfGlassSurface level={1} style={{ padding: 'var(--zf-s5)' }}>
            {/* ZfSkeleton 的 text 变体不吃 style，间距得由外层 flex 给 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s4)' }}>
              <ZfSkeleton variant="text" height={18} />
              <ZfSkeleton variant="text" height={18} width="72%" />
              <ZfSkeleton variant="text" height={18} width="88%" />
            </div>
          </ZfGlassSurface>
        </div>
      </ZfPageShell>
    );
  }

  return (
    <ZfPageShell
      size="md"
      header={
        <ZfPageHeader
          icon={<DatabaseOutlined />}
          title="现有书源"
          subtitle="用行内「设为默认」指定搜索默认源；禁用的源在聚合搜索时会被跳过。"
          extra={headerExtra}
        />
      }
    >
      <div style={COL}>
        {/* ============ 云端同步（仅登录可见） ============ */}
        {isLoggedIn ? (
          <motion.div variants={variants.fadeUp} initial="initial" animate="animate">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--zf-s3)',
                padding: 'var(--zf-s5)',
                borderRadius: 'var(--zf-r-lg)',
                background: 'var(--zf-grad-brand)',
                boxShadow: 'var(--zf-glow-brand-soft)',
                color: 'var(--zf-on-accent)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--zf-fs-md)', fontWeight: 'var(--zf-fw-strong)' }}>
                  <ReactBitsErrorBoundary fallback="云端书源同步">
                    <ShinyText
                      text="云端书源同步"
                      speed={3}
                      color="var(--zf-on-accent)"
                      shineColor="var(--zf-brand-200)"
                    />
                  </ReactBitsErrorBoundary>
                </div>
                <div style={{ fontSize: 'var(--zf-fs-xs)', opacity: 0.82 }}>从服务器同步最新书源数据</div>
              </div>
              <Button
                icon={<CloudSyncOutlined />}
                loading={syncLoading}
                onClick={handleSyncFromBackend}
                style={{
                  background: 'var(--zf-glass-3)',
                  border: '1px solid var(--zf-glass-border-strong)',
                  color: 'var(--zf-on-tint)',
                  fontWeight: 'var(--zf-fw-strong)',
                }}
              >
                刷新书源
              </Button>
            </div>
          </motion.div>
        ) : null}

        {/* ============ 统计：三张卡只靠 tone 区分语义 ============ */}
        <ZfGrid min={150}>
          <ZfStatCard
            label="总书源"
            icon={<DatabaseOutlined />}
            value={
              <ReactBitsErrorBoundary fallback={sources.length}>
                <CountUp to={sources.length} from={0} duration={1} />
              </ReactBitsErrorBoundary>
            }
          />
          <ZfStatCard
            label="已启用"
            tone="success"
            icon={<CheckCircleOutlined />}
            value={
              <ReactBitsErrorBoundary fallback={enabledCount}>
                <CountUp to={enabledCount} from={0} duration={1} />
              </ReactBitsErrorBoundary>
            }
          />
          <ZfStatCard
            label="已禁用"
            tone="error"
            icon={<CloseCircleOutlined />}
            value={
              <ReactBitsErrorBoundary fallback={sources.length - enabledCount}>
                <CountUp to={sources.length - enabledCount} from={0} duration={1} />
              </ReactBitsErrorBoundary>
            }
          />
        </ZfGrid>

        {/* ============ 列表：整块一张玻璃卡，行本身不再各自重采样 ============ */}
        <ZfGlassSurface
          level={1}
          style={{
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {filteredSources.length > 0 ? (
            <motion.div
              variants={variants.fadeUp}
              initial="initial"
              animate="animate"
              style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }}
            >
              {filteredSources.map((source, index) => (
                <SourceRow
                  key={source.bookSourceUrl || index}
                  source={source}
                  isActive={source.bookSourceUrl === activeSourceUrl}
                  onSetActive={handleSetActive}
                  onToggle={handleToggle}
                />
              ))}
            </motion.div>
          ) : (
            <ZfEmptyState
              icon={<DatabaseOutlined />}
              title={searchText ? '没有匹配的书源' : '暂无书源'}
              description={
                searchText
                  ? `换个关键词试试，当前过滤词「${searchText}」。`
                  : '书源由管理后台维护，导入后在此处启用与设为默认。'
              }
              action={
                searchText ? (
                  <Button classNames={{ root: 'zf-btn zf-btn--ghost' }} onClick={() => setSearchText('')}>
                    清空筛选
                  </Button>
                ) : null
              }
            />
          )}
        </ZfGlassSurface>
      </div>
    </ZfPageShell>
  );
};

export default BookSourcePage;
