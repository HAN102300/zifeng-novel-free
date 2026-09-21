import React, { useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Slider, Switch, Select } from 'antd';
import {
  BgColorsOutlined,
  MoonOutlined,
  SunOutlined,
  CheckOutlined,
  FontSizeOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { ThemeContext } from '../App';
import { version } from '../../package.json';
import { ZfPageShell, ZfGrid, ZfPageHeader, ZfSectionTitle, ZfGlassSurface, ZfPill } from '@zifeng/ui/components';
import { BRANDS, BRAND_KEYS, normalizeBrand } from '@zifeng/ui/tokens';
import { variants } from '@zifeng/ui/motion';

/* ============================================================
   紫枫免费小说 · 设置页（P2 迁移）
   - 主题色板重做：原先是 5 张约 300×150 的卡 + 5 个 2019 默认取色器式的
     高饱和纯色圆点（纯绿/纯橙/纯红/纯蓝那种），选个颜色要两行 400px。
     现在是一行 5 枚紧凑色卡，色块取该品牌**真实派生色阶**
     （data-brand 作用域下的 --zf-grad-brand = 700→500），高度收到约 62px。
   - ★存储键仍是 config/themes.js 的旧键 purple/green/orange/red/default，
     否则用户已存的 zifeng_theme 偏好会失效；只有显示名与色阶换成
     zifeng-ui/tokens/hue.js 的 BRANDS（优雅紫/青玉/琥珀/胭脂/黛蓝）。
   - 主题切换完全由 useTheme 写 html[data-brand] 驱动，本页不再出现任何
     setProperty('--zf-primary-*') 补丁。
   - 容器 → ZfPageShell、页头 → ZfPageHeader、分区头 → ZfSectionTitle、
     卡片 → ZfGlassSurface（毛玻璃开关由 [data-glass='off'] 承接，
     不再手写 glassCardStyle）
   - 全部 isDarkMode ? '#xxx' : '#yyy' 三元 → 令牌，字面色清零
   - 保留：自动夜间模式的读写逻辑、全局字号 Slider、玻璃开关
   ============================================================ */

/* 存储键 ← 品牌键。azure 对应旧键 default（不是 blue），必须显式写死，
   否则换个命名就会把用户的既有偏好写丢。 */
const STORAGE_KEY_OF_BRAND = {
  violet: 'purple',
  jade: 'green',
  amber: 'orange',
  crimson: 'red',
  azure: 'default',
};

/* 一行放得下 5 枚：色块 28px + 名称 14px + 上下内边距 8px×2 + 间隙 */
const BRAND_OPTIONS = BRAND_KEYS.map((brand) => ({
  brand,
  key: STORAGE_KEY_OF_BRAND[brand],
  name: BRANDS[brand].name,
}));

// 生成时间选项 (00:00 - 23:30, 每30分钟一个)
const generateTimeOptions = () => {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      options.push({ value, label: value });
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

/* ---------- 版式常量：同一组合只写一次 ---------- */
const COL = { display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)', minWidth: 0 };
const ROW = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: 'var(--zf-s4)',
  padding: 'var(--zf-s4)',
  borderRadius: 'var(--zf-r-md)',
  background: 'var(--zf-glass-1)',
  border: '1px solid var(--zf-glass-border)',
};
const ROW_TEXT = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 };
const ROW_TITLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--zf-s2)',
  fontSize: 'var(--zf-fs-md)',
  fontWeight: 'var(--zf-fw-strong)',
  color: 'var(--zf-text-primary)',
};
const ROW_DESC = { fontSize: 'var(--zf-fs-xs)', color: 'var(--zf-text-muted)' };
const ROW_CTRL = { display: 'flex', alignItems: 'center', gap: 'var(--zf-s3)', minWidth: 0 };

/** 一行设置项：左文案右控件，窄屏自然换行 */
function SettingRow({ icon, title, desc, children }) {
  return (
    <div style={ROW}>
      <div style={ROW_TEXT}>
        <span style={ROW_TITLE}>
          <span aria-hidden="true" style={{ display: 'inline-flex', color: 'var(--zf-brand-500)' }}>
            {icon}
          </span>
          {title}
        </span>
        {desc ? <span style={ROW_DESC}>{desc}</span> : null}
      </div>
      <div style={ROW_CTRL}>{children}</div>
    </div>
  );
}

const Setting = () => {
  const {
    currentTheme,
    setCurrentTheme,
    isDarkMode,
    setIsDarkMode,
    refreshAutoNightMode,
    clearManualDarkOverride,
    globalFontSize,
    setGlobalFontSize,
    glassMode,
    handleGlassModeToggle,
  } = useContext(ThemeContext);

  const currentBrand = normalizeBrand(currentTheme);

  // 夜间模式自动切换状态
  const [autoNightEnabled, setAutoNightEnabled] = useState(() => {
    const saved = localStorage.getItem('zifeng_auto_night_mode');
    if (saved) {
      const config = JSON.parse(saved);
      return config.enabled || false;
    }
    return false;
  });

  const [nightStartTime, setNightStartTime] = useState(() => {
    const saved = localStorage.getItem('zifeng_auto_night_mode');
    if (saved) {
      const config = JSON.parse(saved);
      return config.startTime || '20:00';
    }
    return '20:00';
  });

  const [nightEndTime, setNightEndTime] = useState(() => {
    const saved = localStorage.getItem('zifeng_auto_night_mode');
    if (saved) {
      const config = JSON.parse(saved);
      return config.endTime || '07:00';
    }
    return '07:00';
  });

  /* 排程的读取与定时比对在 useTheme 里（跟着 App 一起活），这里只管写配置 + 立刻生效 */
  const saveNightConfig = (override) => {
    const config = {
      enabled: autoNightEnabled,
      startTime: nightStartTime,
      endTime: nightEndTime,
      ...override,
    };
    localStorage.setItem('zifeng_auto_night_mode', JSON.stringify(config));
  };

  const applySchedule = () => {
    clearManualDarkOverride();
    refreshAutoNightMode();
  };

  const handleAutoNightToggle = (checked) => {
    setAutoNightEnabled(checked);
    saveNightConfig({ enabled: checked });
    if (checked) applySchedule();
  };

  const handleNightTimeChange = (type, value) => {
    if (type === 'start') setNightStartTime(value);
    else setNightEndTime(value);
    saveNightConfig(type === 'start' ? { startTime: value } : { endTime: value });
    /* 改了时间段却没立刻生效，多半是被之前手动拨过的开关挡住了 —— 按新排程走 */
    if (autoNightEnabled) applySchedule();
  };

  return (
    <ZfPageShell
      size="lg"
      header={
        <ZfPageHeader
          title="设置"
          subtitle="主题配色、显示模式与阅读偏好，保存后立即生效并写入本机。"
          extra={<ZfPill tone="brand">{BRANDS[currentBrand]?.name}</ZfPill>}
        />
      }
    >
      <div style={COL}>
        {/* ============ 主题配色 ============ */}
        <ZfGlassSurface level={2} style={{ padding: 'var(--zf-s6)' }}>
          <div style={COL}>
            <ZfSectionTitle
              animated={false}
              variant="line"
              icon={<BgColorsOutlined />}
              title="主题配色"
              sub="色块取自该品牌的真实派生色阶，切换后渐变/光晕/描边/滚动条同时跟随"
              extra={<span style={ROW_DESC}>共 {BRAND_OPTIONS.length} 套</span>}
            />
            <ZfGrid columns={5} gap="var(--zf-s2)">
              {BRAND_OPTIONS.map((opt) => {
                const selected = opt.brand === currentBrand;
                return (
                  <motion.button
                    key={opt.key}
                    type="button"
                    /* 悬停/按下走 framer 的 whileHover/whileTap，不碰 DOM style */
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={variants.hoverLift.transition}
                    /* data-brand 把这一枚色卡变成该品牌的局部作用域：
                       否则五枚色块都会读到 html[data-brand] 的当前品牌，
                       实测表现为「五个一模一样的色块」。 */
                    data-brand={opt.brand}
                    aria-pressed={selected}
                    onClick={() => setCurrentTheme(opt.key)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--zf-s2)',
                      padding: 'var(--zf-s2)',
                      minWidth: 0,
                      cursor: 'pointer',
                      borderRadius: 'var(--zf-r-md)',
                      border: `1px solid ${
                        selected ? 'rgb(var(--zf-brand-rgb-500) / 0.55)' : 'var(--zf-glass-border)'
                      }`,
                      background: selected ? 'var(--zf-tint-brand-10)' : 'var(--zf-glass-1)',
                      transition:
                        'border-color var(--zf-dur-fast) var(--zf-ease-out), background-color var(--zf-dur-fast) var(--zf-ease-out), transform var(--zf-dur-fast) var(--zf-ease-out)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        height: 28,
                        borderRadius: 'var(--zf-r-sm)',
                        background: 'var(--zf-grad-brand)',
                        boxShadow: selected ? 'var(--zf-glow-brand)' : 'none',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--zf-on-accent)',
                        fontSize: 'var(--zf-fs-xs)',
                      }}
                    >
                      {selected ? <CheckOutlined /> : null}
                    </span>
                    <span
                      className="zf-truncate"
                      title={opt.name}
                      style={{
                        textAlign: 'center',
                        fontSize: 'var(--zf-fs-2xs)',
                        lineHeight: 'var(--zf-lh-snug)',
                        color: selected ? 'var(--zf-on-tint)' : 'var(--zf-text-muted)',
                        fontWeight: selected ? 'var(--zf-fw-strong)' : 'var(--zf-fw-normal)',
                      }}
                    >
                      {opt.name}
                    </span>
                  </motion.button>
                );
              })}
            </ZfGrid>
          </div>
        </ZfGlassSurface>

        {/* ============ 显示模式 ============ */}
        <ZfGlassSurface level={2} style={{ padding: 'var(--zf-s6)' }}>
          <div style={COL}>
            <ZfSectionTitle
              animated={false}
              variant="line"
              icon={isDarkMode ? <MoonOutlined /> : <SunOutlined />}
              title="显示模式"
              sub="浅色与深色只换令牌值，玻璃身份与品牌描边都保留"
            />
            <SettingRow
              icon={<DesktopOutlined />}
              title={isDarkMode ? '深色模式' : '浅色模式'}
              desc={isDarkMode ? '适合夜间阅读，减少眼睛疲劳' : '适合日间阅读，清晰明亮'}
            >
              <Switch
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                checked={isDarkMode}
                onChange={setIsDarkMode}
                size="large"
              />
            </SettingRow>
            <SettingRow
              icon={<EyeOutlined />}
              title="毛玻璃风格"
              desc="开启后全站呈现毛玻璃半透明质感，界面更具层次感"
            >
              <Switch checked={glassMode} onChange={handleGlassModeToggle} size="large" />
            </SettingRow>
          </div>
        </ZfGlassSurface>

        {/* ============ 阅读设置 ============ */}
        <ZfGlassSurface level={2} style={{ padding: 'var(--zf-s6)' }}>
          <div style={COL}>
            <ZfSectionTitle
              animated={false}
              variant="line"
              icon={<FontSizeOutlined />}
              title="阅读设置"
              sub="全局字号会同时改变 html 基准，因此令牌一律用 px，不用 rem"
            />
            <SettingRow icon={<FontSizeOutlined />} title="字体大小" desc="调整网站全局字体大小">
              <div style={{ flex: '1 1 200px', minWidth: 180, paddingInline: 'var(--zf-s2)' }}>
                <Slider
                  min={12}
                  max={24}
                  step={1}
                  value={globalFontSize}
                  onChange={setGlobalFontSize}
                  marks={{ 12: '12', 14: '14', 18: '18', 24: '24' }}
                  tooltip={{ formatter: (val) => `${val}px` }}
                />
              </div>
            </SettingRow>
            <SettingRow
              icon={<ClockCircleOutlined />}
              title="夜间模式自动切换"
              desc="按设定时间段自动切换，手动开关会覆盖它"
            >
              <div style={ROW_CTRL}>
                <Switch size="small" checked={autoNightEnabled} onChange={handleAutoNightToggle} />
                {autoNightEnabled ? (
                  <div style={{ ...ROW_CTRL, flexWrap: 'wrap' }}>
                    <span
                      aria-hidden="true"
                      style={{ display: 'inline-flex', color: 'var(--zf-brand-500)' }}
                    >
                      <ClockCircleOutlined />
                    </span>
                    <Select
                      size="small"
                      value={nightStartTime}
                      onChange={(val) => handleNightTimeChange('start', val)}
                      options={timeOptions}
                      style={{ width: 90 }}
                    />
                    <span style={ROW_DESC}>至</span>
                    <Select
                      size="small"
                      value={nightEndTime}
                      onChange={(val) => handleNightTimeChange('end', val)}
                      options={timeOptions}
                      style={{ width: 90 }}
                    />
                  </div>
                ) : null}
              </div>
            </SettingRow>
          </div>
        </ZfGlassSurface>

        {/* ============ 关于 ============ */}
        <p style={{ ...ROW_DESC, textAlign: 'center' }}>
          紫枫免费小说 v{version} · 为您提供优质的小说阅读体验
        </p>
      </div>
    </ZfPageShell>
  );
};

export default Setting;
