/* ============================================================
   DesignLab · 视觉稿与组件画廊（仅 DEV）
   路由 /design-lab，生产不打包。

   为什么不用独立静态 HTML 原型：静态稿无法验证三件事 ——
   antd 组件级 token 是否真的生效、framer 动效在 tier 降级下的表现、
   以及改一处颜色要手改两份。这里用真实组件 + mock 数据渲染，
   确认完直接就是生产代码，零返工。

   正文示例文字为占位文本，不含任何真实作品的内容。
   ============================================================ */

import React, { useState, useContext } from 'react';
import { Segmented, Switch, Button, Input, Select, Table, Tabs, Modal, Descriptions, Tag } from 'antd';
import { FireOutlined, TrophyOutlined, ClockCircleOutlined, MessageOutlined } from '@ant-design/icons';
import {
  ZfPageShell, ZfGrid, ZfPageHeader, ZfSectionTitle, ZfGlassSurface,
  ZfPill, ZfStatCard, ZfCoverCard, ZfSkeleton, ZfSkeletonGrid,
  ZfEmptyState, ZfErrorState,
} from '@zifeng/ui/components';
import { useFx } from '@zifeng/ui/motion/FxContext';
import { BRANDS } from '@zifeng/ui/tokens';
import { readerThemes } from '@zifeng/ui/tokens/reader.js';
import { ThemeContext } from '../App';

/* ---------- mock 数据 ---------- */
const MOCK_BOOKS = [
  { name: '星海彼岸', author: '示例作者', cover: '', category: '科幻', score: 9.2, readCount: 17800000, latest: '第七百二十章 归途' },
  { name: '灵境行者', author: '示例作者', cover: '', category: '科幻', score: 8.4, readCount: 6100000, latest: '第一千零一章 新纪元' },
  { name: '宿命之环', author: '示例作者', cover: '', category: '玄幻', score: 8.9, readCount: 6000000, latest: '第八百九十章 环终' },
  { name: '我有一剑', author: '示例作者', cover: '', category: '玄幻', score: 0, readCount: 5800000, latest: '' },
  { name: '剑道第一仙', author: '示例作者', cover: '', category: '仙侠', score: 7.6, readCount: 5600000, latest: '第一千二百三十三章' },
  { name: '一个非常非常长的书名用来测试两行截断效果', author: '示例作者', cover: '', category: '都市', score: 8.1, readCount: 3400000, latest: '' },
];

const MOCK_STATS = [
  { label: '总访问量', value: '2,220' },
  { label: '今日访问', value: '16' },
  { label: '在线用户', value: '0' },
  { label: '总用户数', value: '1' },
  { label: '书架收藏', value: '2' },
  { label: '阅读记录', value: '2' },
];

const PLACEHOLDER_PARA =
  '这是一段用于检验排版层级的占位文本。衬线正文在长文阅读场景下的可读性、行高与段距的节奏、以及行长被约束在三十余字时眼睛的回行成本，都需要在这里以真实字号亲眼确认，而不是在令牌表格里推断。';

/* value 必须是 app 认得的旧主题键（config/themes.js 的 purple/green/orange/red/default），
   显示名用派生后的品牌名。二者的映射在 zifeng-ui/tokens/hue.js 的 LEGACY_BRAND_ALIAS。 */
const BRAND_OPTIONS = [
  { label: BRANDS.violet.name, value: 'purple' },
  { label: BRANDS.jade.name, value: 'green' },
  { label: BRANDS.amber.name, value: 'orange' },
  { label: BRANDS.crimson.name, value: 'red' },
  { label: BRANDS.azure.name, value: 'default' },
];

/* ---------- 小节容器 ---------- */
function Block({ title, sub, children, extra }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s5)' }}>
      <ZfSectionTitle title={title} sub={sub} extra={extra} variant="ink" animated={false} />
      {children}
    </section>
  );
}

function Swatches({ mode }) {
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s3)' }}>
      {Object.keys(BRANDS).map((key) => (
        /* 必须给每行套一个 data-brand 作用域：--zf-brand-* 是随
           html[data-brand] 切换的全局变量，若不隔离，五行会全部读到
           当前激活品牌（实测就是这样显示成五排一模一样的橙色）。 */
        <div
          key={key}
          data-brand={key}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--zf-s3)' }}
        >
          <span className="zf-label" style={{ width: 84, flexShrink: 0 }}>
            {BRANDS[key].name}
          </span>
          <div style={{ display: 'flex', gap: 2, flex: 1 }}>
            {steps.map((s) => (
              <span
                key={s}
                title={`--zf-brand-${s}`}
                style={{
                  flex: 1,
                  height: 30,
                  borderRadius: 4,
                  background: `var(--zf-brand-${s})`,
                  border: '1px solid var(--zf-glass-border)',
                }}
              />
            ))}
          </div>
        </div>
      ))}
      <p className="zf-caption" style={{ margin: 0 }}>
        色阶由 OKLCH 在生成期派生（zifeng-ui/tokens/brand.js）。切换上方「品牌」只改
        html[data-brand]，本页所有渐变、光晕、描边、阴影、滚动条与 antd 主色同时跟随。
        当前模式：{mode}
      </p>
    </div>
  );
}

export default function DesignLab() {
  const { tier, setTier, auto, clearOverride } = useFx();
  /* 必须驱动 app 真实的主题状态，而不是自己写 html 属性：
     App.jsx 的 Content 背景、Navbar 等处仍读 React 的 isDarkMode，
     只改属性会让 CSS 令牌与内联样式脱钩 —— 实测表现为「表面变浅、
     页面底仍是近黑」，浅色预览因此不可信。 */
  const { isDarkMode, setIsDarkMode, currentTheme, setCurrentTheme } = useContext(ThemeContext);

  const mode = isDarkMode ? 'dark' : 'light';
  const brand = currentTheme;
  const [readerTheme, setReaderTheme] = useState(readerThemes[6]);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <ZfPageShell size="xl" style={{ paddingBlock: 'var(--zf-s8)' }}>
      <ZfPageHeader
        title="Design Lab"
        subtitle="紫玻璃 + 书法水墨 · 扩张与精装修方向确认稿"
        back="/"
        extra={
          <Button onClick={() => setModalOpen(true)}>弹窗限高示例</Button>
        }
      />

      {/* ---------- 控制台 ---------- */}
      <ZfGlassSurface level={3} style={{ padding: 'var(--zf-s5)', display: 'flex', flexWrap: 'wrap', gap: 'var(--zf-s6)', alignItems: 'center' }}>
        <Control label="品牌">
          <Segmented
            value={brand}
            onChange={setCurrentTheme}
            options={BRAND_OPTIONS}
          />
        </Control>
        <Control label="模式">
          <Segmented
            value={mode}
            onChange={(m) => setIsDarkMode(m === 'dark')}
            options={[{ label: '深色', value: 'dark' }, { label: '浅色', value: 'light' }]}
          />
        </Control>
        <Control label={`特效 tier ${tier}${auto ? '（自动）' : '（手动）'}`}>
          <Segmented
            value={String(tier)}
            onChange={(v) => setTier(Number(v))}
            options={[
              { label: '0 基础', value: '0' },
              { label: '1 标准', value: '1' },
              { label: '2 全效', value: '2' },
            ]}
          />
        </Control>
        {!auto ? <Button size="small" onClick={clearOverride}>恢复自动</Button> : null}
      </ZfGlassSurface>

      <Block title="① 令牌总览" sub="一眼判断浅色玻璃是否还成立">
        <Swatches mode={mode} />
        <ZfGrid min={200}>
          {[
            ['页面底 canvas', 'var(--zf-canvas)'],
            ['容器底 canvas-2', 'var(--zf-canvas-2)'],
            ['玻璃 1 弱', 'var(--zf-glass-1)'],
            ['玻璃 2 标准', 'var(--zf-glass-2)'],
            ['玻璃 3 强', 'var(--zf-glass-3)'],
            ['品牌 tint', 'var(--zf-tint-brand-16)'],
          ].map(([label, expr]) => (
            <div
              key={label}
              className="zf-glass"
              style={{
                height: 88,
                borderRadius: 'var(--zf-r-lg)',
                border: '1px solid var(--zf-glass-border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: 'var(--zf-s3)',
                background: expr,
              }}
            >
              <span className="zf-label">{label}</span>
              <span className="zf-caption zf-mono">{expr}</span>
            </div>
          ))}
        </ZfGrid>
        <ZfGlassSurface level={2} sheen hover style={{ padding: 'var(--zf-s6)' }}>
          <p className="zf-lede" style={{ margin: 0 }}>
            这块卡片本身带 backdrop-filter，并把「高光跟随鼠标」作为它自己的 ::after
            —— 遵守合成器铁律第 ① 条：同一元素不同时具备 backdrop-filter、filter:blur()
            与 infinite 动画。把 tier 切到 0/1 可对比高光层是否按预算关闭。
          </p>
        </ZfGlassSurface>
      </Block>

      <Block title="② 组件画廊" sub="统一后的卡片 / 胶囊 / 统计卡 / 三态">
        <ZfGrid min={168}>
          {MOCK_BOOKS.map((b, i) => (
            <ZfCoverCard key={b.name} novel={b} rank={i + 1} size={i === 0 ? 'feature' : 'md'} />
          ))}
        </ZfGrid>
        <p className="zf-caption" style={{ margin: 0 }}>
          位次差异只体现在尺寸与描边光晕，内部结构完全一致 —— 这是修掉「第 1 名与 2-5 名基线错位」的关键。
          第 4 本 score 为 0，故评分胶囊不渲染（原实现在这里会显示「0.0 分」）。
        </p>

        <ZfSectionTitle title="胶囊与排名色" variant="bare" animated={false} />
        <div style={{ display: 'flex', gap: 'var(--zf-s2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <ZfPill tone="brand">品牌</ZfPill>
          <ZfPill>中性</ZfPill>
          <ZfPill tone="solid">实心</ZfPill>
          <ZfPill tone="success">连载中</ZfPill>
          <ZfPill tone="warning">9.2</ZfPill>
          <ZfPill tone="error">已禁用</ZfPill>
          <ZfPill tone="info">聚合中</ZfPill>
          {[1, 2, 3, 4, 5].map((r) => (
            <ZfPill key={r} rank={r}>{r}</ZfPill>
          ))}
        </div>

        <ZfSectionTitle title="统计卡" variant="bare" animated={false} />
        <ZfGrid min={150}>
          {MOCK_STATS.map((s) => (
            <ZfStatCard key={s.label} label={s.label} value={s.value} icon={<FireOutlined />} />
          ))}
          <ZfStatCard label="加载中示例" value="—" loading />
        </ZfGrid>

        <ZfSectionTitle title="三态：骨架 / 空 / 错误" variant="bare" animated={false} />
        <ZfGrid min={260}>
          <ZfGlassSurface level={1} style={{ padding: 'var(--zf-s5)' }}>
            <ZfSkeletonGrid count={4} />
          </ZfGlassSurface>
          <ZfGlassSurface level={1} style={{ padding: 'var(--zf-s5)' }}>
            <ZfEmptyState
              icon={<TrophyOutlined />}
              title="还没有收藏"
              description="登录后即可收藏书籍、记录进度、跨设备继续阅读。"
              action={<Button type="primary">立即登录</Button>}
            />
          </ZfGlassSurface>
          <ZfGlassSurface level={1} style={{ padding: 'var(--zf-s5)' }}>
            <ZfErrorState title="解析超时" description="该书源在 20 秒内未返回内容，可重试或切换书源。" onRetry={() => {}} />
          </ZfGlassSurface>
        </ZfGrid>
      </Block>

      <Block title="③ 阅读器排版" sub="正文改用衬线，行长受 measure 约束">
        <div style={{ display: 'flex', gap: 'var(--zf-s2)', flexWrap: 'wrap' }}>
          {readerThemes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setReaderTheme(t)}
              className="zf-pill"
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--zf-r-full)',
                border: `1px solid ${readerTheme.id === t.id ? 'var(--zf-brand-500)' : 'var(--zf-glass-border)'}`,
                background: t.bg,
                color: t.text,
              }}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div
          style={{
            background: readerTheme.bg,
            color: readerTheme.text,
            borderRadius: 'var(--zf-r-lg)',
            padding: 'var(--zf-s10) var(--zf-s6)',
            border: '1px solid var(--zf-glass-border)',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 'min(100%, var(--zf-measure-reader))',
              margin: '0 auto',
              fontSize: 'var(--zf-fs-lg)',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--zf-font-display)',
                fontSize: 'var(--zf-fs-xl)',
                fontWeight: 700,
                lineHeight: 'var(--zf-lh-snug)',
                marginBottom: 'var(--zf-s6)',
                textAlign: 'center',
              }}
            >
              第七章 · 占位章节名
            </h3>
            {[0, 1, 2].map((i) => (
              <p
                key={i}
                style={{
                  fontFamily: 'var(--zf-font-reader)',
                  fontSize: 'inherit',
                  lineHeight: 'var(--zf-lh-reader)',
                  textIndent: '2em',
                  marginBottom: 'var(--zf-s5)',
                }}
              >
                {PLACEHOLDER_PARA}
              </p>
            ))}
          </div>
        </div>
        <p className="zf-caption" style={{ margin: 0 }}>
          现状是正文用 Inter（无衬线）而把 Noto Serif SC 拿去做品牌标题装饰 —— 字体语义用反了。
          这里正文走 <span className="zf-mono">--zf-font-reader</span>（衬线），
          行高 <span className="zf-mono">--zf-lh-reader:1.9</span>，
          页面宽度 <span className="zf-mono">min(100%, --zf-measure-reader:46em)</span>，
          阅读器内可由「页面宽度」滑块在 30–60 字/行之间调。
        </p>
      </Block>

      <Block title="④ 详情页与搜索页要点">
        <ZfGlassSurface level={2} style={{ padding: 'var(--zf-s6)' }}>
          <ZfSectionTitle title="标签拆分后" variant="bare" animated={false} />
          <div style={{ display: 'flex', gap: 'var(--zf-s2)', flexWrap: 'wrap' }}>
            {['轻松', '热血', '杀伐果断', '探险', '无敌流', '群像', '科技', '升级流'].map((t) => (
              <ZfPill key={t} tone="brand">{t}</ZfPill>
            ))}
          </div>
          <p className="zf-caption" style={{ marginTop: 'var(--zf-s3)' }}>
            原始串是 <span className="zf-mono">"8个月前,7.8分,,轻松,热血,…"</span>：
            元数据混在题材里、含空项、且 7.8 分又在右侧胶囊重复一次。
            现在由 <span className="zf-mono">splitTags()</span> 剔除元数据与空项并去重。
          </p>
          <Descriptions column={2} size="small" style={{ marginTop: 'var(--zf-s5)' }} bordered>
            <Descriptions.Item label="字数">668 万</Descriptions.Item>
            <Descriptions.Item label="章节数">1,455 章</Descriptions.Item>
            <Descriptions.Item label="最后更新">8 个月前</Descriptions.Item>
            <Descriptions.Item label="评分">7.8</Descriptions.Item>
          </Descriptions>
        </ZfGlassSurface>
      </Block>

      <Block title="⑤ 榜单区块头" sub="六套随机图标色 → 统一品牌底 + 图标本身区分">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--zf-s3)' }}>
          {[
            ['必读榜', '精选好书', <FireOutlined key="a" />],
            ['完结榜', '已完结精品', <TrophyOutlined key="b" />],
            ['更新榜', '最近更新', <ClockCircleOutlined key="c" />],
            ['评论榜', '热门讨论', <MessageOutlined key="d" />],
          ].map(([t, s, icon]) => (
            <ZfSectionTitle
              key={t}
              title={t}
              sub={s}
              icon={icon}
              variant="line"
              animated={false}
              extra={<ZfPill>查看全部</ZfPill>}
            />
          ))}
        </div>
      </Block>

      <Block title="⑥ 后台样板要点" sub="不破版表格 + 限高弹窗">
        <Table
          size="small"
          pagination={{ pageSize: 4 }}
          columns={[
            { title: '名称', dataIndex: 'name', width: 160, ellipsis: true },
            {
              title: 'URL',
              dataIndex: 'url',
              width: 200,
              ellipsis: true,
              render: (v) => <span className="zf-mono" style={{ fontSize: 'var(--zf-fs-xs)' }}>{v}</span>,
            },
            { title: '分组', dataIndex: 'group', width: 100, render: (v) => <Tag>{v}</Tag> },
            { title: '类型', dataIndex: 'type', width: 80 },
            { title: '启用', dataIndex: 'on', width: 70, render: (v) => <Switch size="small" checked={v} /> },
          ]}
          dataSource={[
            { key: '1', name: '名著阅读', url: 'http://m.example-one.com/modules/article/search.php@searchkey=%searchKey|char=gbk', group: '发现', type: 'API', on: true },
            { key: '2', name: '追书神器', url: 'http://www.example-two.com', group: '发现', type: 'API', on: true },
            { key: '3', name: '漫客栈', url: 'https://www.example-three.com#◇Haxc', group: '新增', type: '漫画', on: false },
            { key: '4', name: '逐浪小说', url: 'https://m.example-four.com', group: '新增', type: 'API', on: true },
          ]}
        />
      </Block>

      <Modal
        title="弹窗限高示例"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => setModalOpen(false)}
        width={780}
        styles={{ body: { maxHeight: 'calc(100vh - 260px)', overflowY: 'auto', paddingBlock: 16 } }}
      >
        <Tabs
          items={Array.from({ length: 6 }, (_, i) => ({
            key: String(i),
            label: `规则组 ${i + 1}`,
            children: (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--zf-s4)' }}>
                {Array.from({ length: 8 }, (_, j) => (
                  <Input key={j} addonBefore={`字段 ${j + 1}`} placeholder="规则串" />
                ))}
              </div>
            ),
          }))}
        />
        <p className="zf-caption">
          原实现在这里平铺 6 个 Tab、40+ 个无分组无说明的 Input，且弹窗不限高，
          导致「确定/取消」被顶到视口之外。现在 body 内部滚动、footer 常驻。
        </p>
      </Modal>
    </ZfPageShell>
  );
}

function Control({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="zf-label">{label}</span>
      {children}
    </div>
  );
}
