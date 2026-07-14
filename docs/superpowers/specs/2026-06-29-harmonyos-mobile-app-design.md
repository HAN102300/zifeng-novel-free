# 紫枫免费小说 · HarmonyOS 7.0 beta 移动端应用 UI 设计规格

> **目标设备**：手机（竖屏为主）+ 平板（横屏分栏）
> **HarmonyOS 版本**：HarmonyOS 7.0 Developer Beta（API 26）
> **设计基准**：与 zifeng-web 前端网站功能对齐，视觉风格独立重新设计
> **核心新特性**：沉浸光感（ImmersiveMaterial）、浮窗闪控球、应用快启技术
> **移动端增强**：离线阅读、系统通知推送、语音搜索、桌面快捷菜单

---

## 目录

- [模块一：基础层 — 设计系统](#模块一基础层--设计系统)
- [模块二：认证模块](#模块二认证模块)
- [模块三：发现模块](#模块三发现模块)
- [模块四：阅读模块](#模块四阅读模块)
- [模块五：用户模块](#模块五用户模块)
- [移动端增强功能](#移动端增强功能)
- [自适应布局规则](#自适应布局规则)
- [核心组件库完整清单](#核心组件库完整清单)

---

## 模块一：基础层 — 设计系统

### 1.1 多主题色彩体系

延续 Web 端 5 套主题色，每套包含完整色阶（50→900）和深浅色模式中性色。

#### 主题定义

| 主题 Key | 名称 | 主色 (500) | 深色 (700) | 浅色 (50) | 渐变 (400→600) |
|:---------|:-----|:-----------|:-----------|:-----------|:----------------|
| `purple` | 优雅紫 | `#8B5CF6` | `#6D28D9` | `#F5F3FF` | `#A78BFA → #7C3AED` |
| `green` | 清新绿 | `#52C41A` | `#389E0D` | `#F6FFED` | `#73D13D → #389E0D` |
| `orange` | 活力橙 | `#FA8C16` | `#D46B08` | `#FFF7E6` | `#FFA940 → #D46B08` |
| `red` | 热情红 | `#F5222D` | `#CF1322` | `#FFF1F0` | `#FF4D4F → #CF1322` |
| `blue` | 经典蓝 | `#1890FF` | `#096DD9` | `#E6F7FF` | `#40A9FF → #096DD9` |

#### 强调色（跨主题统一）

| 名称 | 色值 | 用途 |
|:-----|:-----|:-----|
| Magenta | `#EC4899` | 高亮、热搜榜标识 |
| Cyan | `#06B6D4` | 信息提示、更新榜标识 |
| Amber | `#F59E0B` | 警告、完本榜标识 |
| Emerald | `#10B981` | 成功、在读状态标识 |
| Rose | `#F43F5E` | 危险、删除操作标识 |

#### 中性色 — 浅色模式

| 令牌 | 色值 | 用途 |
|:-----|:-----|:-----|
| `TEXT_PRIMARY` | `#1E1B2E` | 主文字 |
| `TEXT_SECONDARY` | `#475569` | 次要文字 |
| `TEXT_MUTED` | `#94A3B8` | 辅助文字 |
| `TEXT_FAINT` | `#64748B` | 占位/禁用 |
| `BG_BASE` | `#F6F4FF` | 页面背景 |
| `BG_ELEVATED` | `#FFFFFF` | 卡片背景 |
| `BORDER_LIGHT` | `rgba(124,58,237,0.14)` | 普通边框 |
| `BORDER_STRONG` | `rgba(124,58,237,0.28)` | 强调边框 |

#### 中性色 — 深色模式

| 令牌 | 色值 | 用途 |
|:-----|:-----|:-----|
| `TEXT_PRIMARY` | `#F8FAFC` | 主文字 |
| `TEXT_SECONDARY` | `#CBD5E1` | 次要文字 |
| `TEXT_MUTED` | `#94A3B8` | 辅助文字 |
| `TEXT_FAINT` | `#64748B` | 占位/禁用 |
| `BG_BASE` | `#0B0814` | 页面背景 |
| `BG_ELEVATED` | `#131022` | 卡片背景 |
| `BORDER_LIGHT` | `rgba(255,255,255,0.12)` | 普通边框 |
| `BORDER_STRONG` | `rgba(255,255,255,0.20)` | 强调边框 |

#### ArkTS 实现方式

```typescript
// ThemeManager.ets
import { uiMaterial } from '@kit.ArkUI'

export class ThemeTokens {
  private currentTheme: string = 'purple'
  private isDarkMode: boolean = false

  // 获取当前主题的主色阶
  getPrimaryColor(level: 50 | 100 | 300 | 400 | 500 | 600 | 700 | 900): string {
    return THEME_PRESETS[this.currentTheme].colors[level]
  }

  // 获取中性色（自动适配深浅色）
  getNeutralColor(token: NeutralToken): string {
    return this.isDarkMode
      ? DARK_NEUTRAL[token]
      : LIGHT_NEUTRAL[token]
  }

  // 主题切换
  setTheme(themeKey: string): void {
    this.currentTheme = themeKey
    AppStorage.setOrCreate('currentTheme', themeKey)
  }
}
```

### 1.2 ImmersiveMaterial 沉浸光感配置

#### 应用级开启

在 `module.json5` 中全局开启沉浸光感：

```json5
{
  "module": {
    "name": "entry",
    "type": "entry",
    "metadata": [{
      "name": "ohos.arkui.UIMaterial.state",
      "value": "enable"
    }]
  }
}
```

#### 材质样式映射

| 场景 | ImmersiveStyle | materialColor | applyShadow | interactive | lightEffect |
|:-----|:---------------|:-------------|:------------|:------------|:------------|
| 浮动工具栏/浮窗 | `ULTRA_THIN` | — | true | true | true |
| 搜索框/输入面板 | `THIN` | 主题色 50 | true | false | false |
| 卡片/列表项 | `REGULAR` | — | true | true | false |
| 底部导航栏/Tab | `THICK` | 主题色 50 | true | false | false |
| 模态弹窗背景 | `ULTRA_THICK` | — | true | false | false |

#### 组件级使用

```typescript
import { uiMaterial } from '@kit.ArkUI'

// GlassCard 组件示例
@Component
export struct GlassCard {
  @Prop style: ImmersiveStyle = ImmersiveStyle.REGULAR
  @Prop materialColor?: ResourceColor

  build() {
    Column() {
      // 子内容
    }
    .systemMaterial({
      style: this.style,
      materialColor: this.materialColor,
      applyShadow: true,
      interactive: true,
      lightEffect: false
    } as uiMaterial.ImmersiveOptions)
    .borderRadius(AppRadius.LG)
    .padding(AppSpacing.S4)
  }
}
```

### 1.3 字体规范

#### 字体族

| 用途 | 字体族 | 备注 |
|:-----|:-------|:-----|
| UI 文字 | HarmonyOS Sans | 系统默认无衬线 |
| 标题强调 | HarmonyOS Sans Medium | 区域标题、卡片标题 |
| 阅读正文 | HarmonyOS Sans / 宋体 | 用户可在设置中切换 |
| 数字/代码 | HarmonyOS Sans Mono | 阅读进度、章节编号 |

#### 字号体系

| 令牌 | 字号(vp) | 字重 | 行高 | 用途 |
|:-----|:---------|:-----|:-----|:-----|
| `SIZE_DISPLAY` | 32 | Bold | 1.2 | 启动页 Logo、大标题 |
| `SIZE_H1` | 28 | Medium | 1.2 | 页面主标题 |
| `SIZE_H2` | 24 | Medium | 1.3 | 区域标题 |
| `SIZE_H3` | 20 | Normal | 1.4 | 卡片标题 |
| `SIZE_H4` | 18 | Normal | 1.4 | 小区域标题 |
| `SIZE_BODY_LARGE` | 16 | Normal | 1.5 | 重要正文 |
| `SIZE_BODY` | 14 | Normal | 1.6 | 默认正文 |
| `SIZE_BODY_SMALL` | 13 | Normal | 1.5 | 辅助正文 |
| `SIZE_CAPTION` | 12 | Normal | 1.4 | 标签、时间戳 |
| `SIZE_TINY` | 10 | Normal | 1.4 | 角标、徽章 |
| `SIZE_READING` | 16-24 | Normal | 1.6-2.0 | 阅读正文（用户可调） |

### 1.4 间距与圆角

#### 间距令牌

| 令牌 | 值(vp) | 用途 |
|:-----|:-------|:-----|
| `S1` | 4 | 紧凑间距（图标与文字） |
| `S2` | 8 | 组件内部间距 |
| `S3` | 12 | 列表项间距 |
| `S4` | 16 | 卡片内边距、默认间距 |
| `S5` | 20 | 区域间距 |
| `S6` | 24 | 大区域间距 |
| `S8` | 32 | 模块间距 |
| `S10` | 40 | 页面顶部间距 |
| `S12` | 48 | 大段落间距 |
| `S16` | 64 | Hero 区域高度 |

#### 圆角令牌

| 令牌 | 值(vp) | 用途 |
|:-----|:-------|:-----|
| `R_SM` | 8 | 小组件（Tag、按钮内图标） |
| `R_MD` | 12 | 中等组件（输入框、小卡片） |
| `R_LG` | 16 | 标准卡片 |
| `R_XL` | 22 | 大容器、Hero 区 |
| `R_FULL` | 999 | 胶囊按钮、圆形头像 |

### 1.5 动效规范

#### 动效曲线

| 类型 | API | 参数 | 场景 |
|:-----|:-----|:-----|:-----|
| 微交互 | `curves.easeOutCubic` | — | 按钮点击、Tab 切换 |
| 页面转场 | `curves.interpolatingSpring` | `(0.5, 0.5, 0.6, 0.7)` | 页面推入/弹出 |
| 弹性回弹 | `curves.springMotion` | `(0.6, 0.8)` | 卡片放大、下拉刷新 |
| 列表入场 | `curves.responsiveSpringMotion` | `(0.4, 0.6)` | 列表项依次出现 |

#### 时长规范

| 类型 | 时长 | 场景 |
|:-----|:-----|:-----|
| `DUR_FAST` | 180ms | 按钮反馈、颜色切换 |
| `DUR_NORMAL` | 320ms | 页面转场、卡片展开 |
| `DUR_SLOW` | 600ms | 复杂动画序列 |
| `DUR_SLOWER` | 1100ms | 启动页淡出、首屏入场 |

#### 沉浸光感空间动效

启用 ImmersiveMaterial 后，组件弹出时系统自动附加：
- **形变效果**：组件从 0.92 缩放 + 透明度 0→1 渐显
- **流光效果**：材质表面掠过一道高光
- **自适应降级**：低算力设备自动关闭流光，保留形变

---

## 模块二：认证模块

### 2.1 启动页（StartPage）

**用途说明**：应用冷启动时的过渡页面，利用应用快启技术优化启动体验。展示品牌 Logo 和加载动画，同时后台预加载首页数据。

**核心组件清单**：
- `Image`（Logo 图片，180vp × 180vp）
- `Text`（应用名称「紫枫免费小说」，SIZE_H1）
- `LoadingProgress`（系统加载指示器，主题色）
- `Text`（版本号，SIZE_CAPTION，TEXT_MUTED）

**布局详细说明**：
```
Column（居中，全屏）
├── Spacer（flex: 1）
├── Image（Logo，180vp，带渐变光晕动画）
├── Text（应用名称，marginTop: S4）
├── Text（Slogan「海量小说 · 免费阅读」，marginTop: S2）
├── Spacer（flex: 1）
├── LoadingProgress（28vp，主题色）
└── Text（版本号 v1.0.0，marginBottom: S6）
```

全屏背景使用主色渐变：`linearGradient({ direction: GradientDirection.Bottom, colors: [[primary_900, 0], [primary_700, 0.5], [primary_500, 1]] })`

**关键交互描述**：
1. 应用启动 → 显示启动页（应用快启技术优化，启动时间 < 800ms）
2. 后台并行：预加载首页推荐数据、恢复登录状态、加载主题配置
3. 数据就绪或 1.5s 超时 → 淡出动画（opacity 1→0, 600ms）→ 跳转首页或登录页
4. 若已登录且 token 有效 → 直接进入首页；否则 → 进入登录页

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 初始化中 | Logo 渐显 + 加载指示器旋转 |
| 数据加载完成 | Logo 光晕脉冲一次 → 淡出 |
| 超时（1.5s） | 直接淡出，不阻塞用户 |
| 网络异常 | 淡出后进入离线模式首页 |

### 2.2 登录页（LoginPage）

**用途说明**：用户登录入口，支持账号密码登录和注册切换。采用沉浸光感卡片设计。

**核心组件清单**：
- `GlassCard`（ImmersiveStyle.REGULAR，登录卡片容器）
- `TextInput`（用户名输入框，带 UserOutlined 图标前缀）
- `TextInput`（密码输入框，PasswordType，带可见性切换）
- `TextInput`（验证码输入框，4 位，右侧验证码图片）
- `Button`（登录按钮，主色渐变背景）
- `Checkbox`（记住我）
- `Text`（忘记密码链接、注册链接）
- `Image`（验证码图片，可点击刷新）

**布局详细说明**：
```
Column（全屏，背景为主题色渐变 + 粒子光斑）
├── Spacer（flex: 0.5）
├── Image（Logo，72vp）+ Text（「欢迎回来」，SIZE_H2）
├── GlassCard（width: 90%，maxWidth: 400vp，padding: S6）
│   ├── Form.TextInput（用户名）
│   ├── Form.TextInput（密码，marginTop: S3）
│   ├── Form.TextInput（验证码 + 图片，marginTop: S3）
│   ├── Row（记住我 | 忘记密码，marginTop: S3）
│   └── Button（「登录」，width: 100%，marginTop: S4）
├── Row（「还没账号？」+ 「立即注册」链接）
├── Spacer（flex: 1）
└── Text（「登录即代表同意《用户协议》和《隐私政策》」）
```

**关键交互描述**：
1. 输入用户名/密码/验证码 → 实时校验格式
2. 点击验证码图片 → 刷新验证码（`getCaptcha` API）
3. 点击「登录」→ 表单校验 → 调用 `authLogin(username, password, rememberMe, captchaId, captchaCode)`
4. 登录成功 → 存储 token → 返回上一页或进入首页
5. 登录失败 → 提示错误信息 → 自动刷新验证码
6. 点击「立即注册」→ 转场到注册页（共享元素动画：表单卡片）
7. 点击「忘记密码」→ 跳转重置密码页

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 默认 | 玻璃卡片正常显示，按钮可点击 |
| 输入中 | 输入框获主题色边框高亮 |
| 提交中 | 按钮显示 Loading，禁用所有输入 |
| 登录成功 | 卡片缩放 1→1.02→淡出，转场到首页 |
| 登录失败 | 卡片横向震动（springMotion），错误提示 Toast |
| 验证码刷新 | 验证码图片区域 Loading → 新图片淡入 |

### 2.3 注册页（RegisterPage）

**用途说明**：新用户注册，包含用户名、密码、邮箱和验证码。

**核心组件清单**：
- `GlassCard`（与登录页共享样式）
- `TextInput`（用户名，3-20 字符校验）
- `TextInput`（密码，强度指示器）
- `TextInput`（邮箱，格式校验）
- `TextInput`（验证码 + 图片）
- `Button`（注册按钮）
- `Text`（返回登录链接）

**布局详细说明**：
与登录页结构一致，表单字段增加密码强度指示器（弱/中/强三段进度条）。

**关键交互描述**：
1. 输入密码时实时计算强度：长度 < 6 弱、6-12 中、>12 且含数字/符号 强
2. 注册成功 → 自动调用 `authLogin` → 进入首页
3. 注册失败 → 提示原因（用户名已存在/邮箱已注册等）

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 密码弱 | 强度条红色 1/3 |
| 密码中 | 强度条琥珀色 2/3 |
| 密码强 | 强度条翠绿色 3/3 |
| 注册中 | 按钮 Loading |
| 用户名已存在 | 输入框红色边框 + 错误提示 |

### 2.4 重置密码页（ResetPasswordPage）

**用途说明**：两步式密码重置流程：验证身份 → 设置新密码。

**核心组件清单**：
- `Steps`（步骤指示器：验证身份 → 设置新密码）
- `GlassCard`（表单容器）
- `TextInput`（用户名）
- `TextInput`（邮箱）
- `TextInput`（验证码）
- `TextInput`（新密码）
- `TextInput`（确认密码）
- `Alert`（验证成功后显示账号信息）
- `Button`（验证/重置按钮）

**布局详细说明**：
```
Column
├── BackButton + Title（「重置密码」）
├── Steps（current: currentStep, items: [验证身份, 设置新密码]）
├── GlassCard
│   ├── Step 0: 用户名 + 邮箱 + 验证码 + 「验证身份」按钮
│   └── Step 1: Alert(账号信息) + 新密码 + 确认密码 + 「重置密码」按钮
└── Text（返回登录链接）
```

**关键交互描述**：
1. Step 0：输入用户名 + 邮箱 + 验证码 → 调用 `verifyUserForReset(username, email)`
2. 验证成功 → 显示 Alert（用户名 + 邮箱确认）→ 切换到 Step 1
3. Step 1：输入新密码（两次）→ 调用 `resetPasswordDev({ username, email, newPassword })`
4. 重置成功 → Toast「密码重置成功」→ 跳转登录页

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| Step 0 默认 | 显示用户名/邮箱/验证码表单 |
| Step 0 验证中 | 按钮 Loading |
| Step 0 失败 | 错误 Toast + 刷新验证码 |
| Step 1 | Alert 显示账号信息 + 新密码表单 |
| Step 1 重置中 | 按钮 Loading |
| Step 1 成功 | 成功 Toast → 300ms 后跳转登录 |

---

## 模块三：发现模块

### 3.1 首页（HomePage）

**用途说明**：应用主入口，展示推荐小说、热门榜单、最近阅读和分类导航。采用滚动式信息流布局。

**核心组件清单**：
- `GlassNavBar`（顶部导航栏，ImmersiveStyle.THICK，滚动时隐藏）
- `SearchBar`（搜索入口，点击跳转搜索页，ImmersiveStyle.THIN）
- `SectionHeader`（区域标题 + 「查看更多」按钮）
- `NovelCard`（小说卡片，封面 180vp 高，含评分/简介）
- `RankItem`（排行榜列表项，排名 + 封面 + 信息）
- `Tabs`（榜单切换：必读/潜力/完本/更新/热搜/评论）
- `LoadingSkel`（骨架屏）

**布局详细说明**：

手机布局（< 600vp）：
```
Navigation（隐藏标题栏）
└── Scroll（column方向）
    ├── GlassNavBar（Logo + 搜索入口 + 用户头像，固定顶部）
    │   └── SearchBar（「搜索小说...」，点击跳转搜索页）
    ├── 最近阅读区域（仅登录时显示）
    │   ├── SectionHeader（「最近阅读」+ 「查看全部」）
    │   └── List（横向滑动，3本最近阅读卡片）
    ├── 推荐区域
    │   ├── SectionHeader（「为你推荐」）
    │   └── Grid（2列，NovelCard 网格）
    ├── 榜单区域
    │   ├── SectionHeader（「热门榜单」）
    │   ├── Tabs（必读/潜力/完本/更新/热搜/评论）
    │   └── List（RankItem 列表，每页5条）
    └── 分类导航区域
        ├── SectionHeader（「分类导航」）
        └── Grid（4列，分类图标卡片）
```

平板布局（>= 600vp）：
```
RowSplit
├── SideBar（左侧导航，固定宽度 200vp）
└── Navigation（右侧内容区）
    └── Scroll
        ├── 推荐 Grid（3列）
        ├── 榜单 List（双列）
        └── 分类 Grid（6列）
```

**关键交互描述**：
1. 下拉刷新 → 触发 `springMotion` 弹性动画 → 重新加载推荐数据
2. 上滑滚动 → 导航栏收缩为搜索栏（高度从 64vp → 48vp，ImmersiveStyle 不变）
3. 继续上滑 → 导航栏完全隐藏，下滑时重新出现
4. 点击搜索栏 → 转场到搜索页（搜索框获得焦点）
5. 点击 NovelCard → 跳转小说详情页（共享元素：封面图片放大动画）
6. 点击榜单 Tab → 切换榜单数据，列表项 `stagger` 动画依次入场
7. 点击「查看更多」→ 跳转对应榜单详情页
8. 点击分类卡片 → 跳转分类详情页

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 加载中 | 骨架屏（与卡片尺寸匹配，灰色脉冲动画） |
| 加载完成 | 数据淡入 + stagger 入场动画 |
| 加载失败 | 空状态图 + 「重试」按钮 |
| 空数据 | 空状态插画 + 「去发现好书」按钮 |
| 下拉刷新 | 顶部出现刷新指示器，旋转动画 |
| 导航栏隐藏 | 滚动 > 200vp 时，导航栏上滑隐藏 |

### 3.2 分类页（CategoryPage）

**用途说明**：展示所有小说分类，支持按分类浏览。

**核心组件清单**：
- `SectionHeader`（「全部分类」）
- `Grid`（分类网格，4列手机 / 6列平板）
- 分类卡片：`Image`（分类图标）+ `Text`（分类名称）+ `Text`（小说数量）

**布局详细说明**：
```
Scroll
├── SectionHeader（「全部分类」）
└── Grid（columns: 4手机/6平板, gap: S3）
    └── GridItem × N
        ├── Column（GlassCard 容器）
        │   ├── Image（分类图标，48vp，主题色渐变背景圆形）
        │   ├── Text（分类名称，SIZE_H4）
        │   └── Text（「N 本」，SIZE_CAPTION，TEXT_MUTED）
        └── ...
```

**关键交互描述**：
1. 点击分类卡片 → 跳转分类详情页（卡片缩放反馈）
2. 长按分类卡片 → 显示分类简介弹窗（bindSheet 半模态）

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 加载中 | 骨架网格 |
| 加载完成 | 卡片 stagger 入场 |
| 空数据 | 空状态提示 |

### 3.3 分类详情页（CategoryDetailPage）

**用途说明**：展示某一分类下的小说列表，支持排序和分页加载。

**核心组件清单**：
- `BackButton` + `Text`（分类名称）
- `Segmented`（排序方式：热门/最新/完本）
- `List`（NovelCard 列表，lazyForEach 懒加载）
- `LoadingSkel`（底部加载骨架）

**布局详细说明**：
```
Column
├── Row（BackButton + 分类名称 + Segmented 排序）
├── List（lazyForEach）
│   └── ListItem
│       └── NovelCard（横向布局：封面左侧 + 信息右侧）
└── 加载指示器（底部）
```

**关键交互描述**：
1. 切换排序方式 → 清空列表 → 重新加载第一页
2. 滚动到底部 → 自动加载下一页（`onReachEnd` 事件）
3. 点击 NovelCard → 跳转详情页

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 加载中 | 骨架屏列表 |
| 加载更多 | 底部 Loading 指示器 |
| 全部加载 | 底部「没有更多了」提示 |
| 切换排序 | 列表淡出 → 新数据淡入 |

### 3.4 排行榜页（RankPage）

**用途说明**：展示各维度排行榜（必读/潜力/完本/更新/热搜/评论），支持 Tab 切换。

**核心组件清单**：
- `BackButton` + `Text`（「排行榜」）
- `Tabs`（6 个榜单 Tab，可横向滚动）
- `List`（RankItem 列表）
- `LoadingSkel`

**布局详细说明**：
```
Column
├── Row（BackButton + Title「排行榜」）
├── Tabs（scrollable: true）
│   └── TabContent × 6（必读/潜力/完本/更新/热搜/评论）
│       └── List（RankItem × 20，lazyForEach）
└── 底部安全区
```

每个 Tab 使用不同强调色作为排名标识：
- 必读榜：金色 `#FAAD14`
- 潜力榜：薄荷绿 `#13C2C2`
- 完本榜：翠绿 `#52C41A`
- 更新榜：橙黄 `#FA8C16`
- 热搜榜：朱红 `#F5222D`
- 评论榜：深紫 `#722ED1`

**关键交互描述**：
1. 左右滑动切换 Tab → 列表数据切换，stagger 入场
2. 点击 RankItem → 跳转小说详情页
3. 滚动到底部 → 加载更多

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| Tab 切换中 | 旧列表淡出 → 新列表 stagger 入场 |
| 加载中 | 骨架屏 |
| 加载失败 | 错误提示 + 重试 |

### 3.5 搜索页（SearchPage）

**用途说明**：小说搜索入口，支持文字搜索和语音搜索，聚合多书源结果。

**核心组件清单**：
- `TextInput`（搜索输入框，ImmersiveStyle.THIN，带语音按钮）
- `Image`（语音搜索图标，点击启动语音识别）
- `Segmented`（搜索模式：聚合搜索 / 单书源搜索）
- `List`（搜索结果列表，NovelCard 横向布局）
- `Text`（搜索进度提示：「正在搜索更多书源... (3/10)」）
- `Button`（停止搜索按钮）
- `Tag`（书源来源标签）
- `Text`（搜索历史，最近 10 条）

**布局详细说明**：
```
Column
├── Row（BackButton + SearchBar）
│   └── SearchBar
│       ├── TextInput（placeholder: 「搜索小说...」）
│       ├── Image（语音图标，右侧）
│       └── Button（搜索按钮）
├── Segmented（聚合搜索 | 单书源）
├── 搜索历史区域（无输入时显示）
│   ├── Text（「搜索历史」）
│   └── FlowRow（Tag × N，可删除）
├── 搜索结果区域
│   ├── 书源来源标签（聚合模式，FlowRow）
│   ├── List（NovelCard 横向列表）
│   ├── 搜索进度提示（聚合模式）
│   └── 空结果提示
└── 底部安全区
```

**关键交互描述**：
1. 输入关键词 → 300ms 防抖后触发搜索
2. 点击语音图标 → 启动 `@ohos.ai.asr` 语音识别 → 识别结果填入搜索框 → 自动搜索
3. 聚合搜索模式 → `BatchSearchController` 并行搜索多书源 → 实时显示进度
4. 点击「停止」→ 取消搜索，保留已获取的结果
5. 点击书源标签 → 筛选该书源的结果
6. 点击结果卡片 → 跳转小说详情页
7. 搜索结果存入搜索历史（最近 10 条，可清空）

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 无输入 | 显示搜索历史 |
| 搜索中 | 结果区域 Loading + 进度提示 |
| 聚合搜索中 | 实时显示「正在搜索更多书源... (3/10)」+ 停止按钮 |
| 有结果 | 结果列表 stagger 入场 |
| 无结果 | 空状态 + 「换个关键词试试」 |
| 语音识别中 | 麦克风图标脉冲动画 + 「请说出书名...」提示 |
| 语音识别完成 | 结果自动填入搜索框 → 触发搜索 |

---

## 模块四：阅读模块

### 4.1 小说详情页（NovelDetailPage）

**用途说明**：展示小说完整信息，提供加入书架、开始阅读和章节目录入口。

**核心组件清单**：
- `BackButton`（浮动返回按钮，ImmersiveStyle.ULTRA_THIN）
- `Image`（封面图片，200vp × 280vp，圆角 R_LG）
- `Text`（小说名称，SIZE_H1，HarmonyOS Sans Bold）
- `Text`（作者，SIZE_BODY_LARGE，TEXT_SECONDARY）
- `Tag`（分类标签 × N）
- `Text`（简介，可展开/收起，最多 3 行）
- `Button`（「开始阅读」，主色渐变，全宽）
- `Button`（「加入书架」，ImmersiveStyle.REGULAR 玻璃按钮）
- `Text`（最新章节、更新时间、字数等元信息）
- `List`（最新章节预览，前 5 章）
- `Button`（「查看完整目录」）

**布局详细说明**：
```
Scroll
├── Stack（Hero 区域，height: 320vp）
│   ├── Image（模糊封面背景，filter: blur(20vp)）
│   └── Row（前景内容）
│       ├── Image（封面，120vp × 168vp）
│       └── Column（名称 + 作者 + 标签 + 元信息）
├── Column（信息区，padding: S4）
│   ├── Row（按钮组）
│   │   ├── Button（「开始阅读」，flex: 2）
│   │   └── Button（「加入书架」，flex: 1）
│   ├── Text（简介标题「内容简介」）
│   ├── Text（简介内容，maxLines: expandable ? undefined : 3）
│   └── Text（展开/收起按钮）
├── SectionHeader（「最新章节」+ 「查看目录」）
└── List（最新章节列表，前 5 章）
```

**关键交互描述**：
1. 进入页面 → 调用 `getBookInfoAPI` + `getTocAPI` 获取详情和章节
2. 点击「开始阅读」→ 跳转阅读器，传递 bookUrl、sourceUrl、startChapter
3. 点击「加入书架」→ 调用 `addToBookshelf` API → 按钮变为「已在书架」
4. 点击「查看目录」→ 跳转章节目录页（或 bindSheet 半模态展示）
5. 点击简介「展开」→ 简介展开显示全部内容 → 按钮变为「收起」
6. 滚动时 → Hero 区域封面视差效果（滚动速度 × 0.5）
7. 点击封面 → 全屏预览封面图片（bindContentCover）

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 加载中 | 骨架屏（Hero 区 + 信息区 + 章节列表） |
| 加载完成 | 内容淡入 + stagger 入场 |
| 未加入书架 | 「加入书架」按钮正常显示 |
| 已加入书架 | 按钮变为「已在书架 ✓」，主题色边框 |
| 简介收起 | 最多 3 行 + 「展开」 |
| 简介展开 | 完整内容 + 「收起」 |
| 加载失败 | 错误提示 + 重试按钮 |

### 4.2 阅读器页（ReaderPage）

**用途说明**：小说核心阅读体验，支持章节切换、字体调节、主题切换、离线阅读。

**核心组件清单**：
- `Scroll`（阅读内容滚动容器）
- `Text`（章节标题，SIZE_H3，居中）
- `Text`（章节正文，SIZE_READING，可调字号/行距）
- `Row`（底部控制栏：上一章 / 章节目录 / 下一章 / 设置）
- `Slider`（亮度调节，系统亮度）
- `bindSheet`（设置面板：字号/行距/背景色/字体）
- `bindSheet`（章节目录面板）
- `Text`（离线缓存指示器）
- `Progress`（阅读进度条）

**布局详细说明**：
```
Stack（全屏）
├── Column（阅读内容区）
│   ├── Scroll
│   │   └── Column（padding: S5）
│   │       ├── Text（章节标题）
│   │       ├── Text（正文内容，lineHeight 可调）
│   │       └── Row（上一章 / 下一章导航）
│   └── 顶部信息栏（章节名 + 进度，滚动时隐藏）
├── 底部控制栏（点击屏幕中央时显示/隐藏）
│   ├── Row（上一章 | 目录 | 设置 | 下一章）
│   └── Slider（亮度，仅在设置展开时显示）
├── bindSheet（设置面板）
│   ├── 字号调节（Slider: 16-24vp）
│   ├── 行距调节（Slider: 1.4-2.0）
│   ├── 背景色选择（6 种：白/米/绿/深灰/深褐/纯黑）
│   └── 字体选择（无衬线 / 宋体）
└── bindSheet（章节目录）
    ├── Search（章节搜索）
    └── List（全部章节，lazyForEach，当前章节高亮）
```

**阅读背景色预设**：

| 名称 | 背景色 | 文字色 | 适用场景 |
|:-----|:-------|:-------|:---------|
| 白色 | `#FFFFFF` | `#1E1B2E` | 日间 |
| 米色 | `#F5F0E8` | `#3D3326` | 护眼 |
| 绿色 | `#C7EDCC` | `#2D4A2D` | 护眼 |
| 深灰 | `#2B2B2B` | `#B0B0B0` | 夜间 |
| 深褐 | `#1A1410` | `#8A7A6A` | 深夜 |
| 纯黑 | `#000000` | `#888888` | AMOLED |

**关键交互描述**：
1. 点击屏幕中央 → 显示/隐藏控制栏（opacity 0↔1, 320ms）
2. 左右滑动 → 上一章/下一章（`SwipeGesture`，阈值 100vp）
3. 字号/行距调节 → 实时预览效果，存储到 `AppStorage`
4. 背景色切换 → 平滑过渡（`transition` 320ms）
5. 阅读进度自动保存 → 每 5 秒或切章时保存当前进度
6. 离线模式 → 若章节已缓存，显示「离线」标签，可正常阅读
7. 章节预加载 → 阅读当前章节时后台预加载下一章
8. 长按文字 → 选中文本，支持复制（`copyOption` API）
9. 亮度调节 → 调用 `@ohos.window` 设置窗口亮度

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 加载中 | 居中 LoadingProgress |
| 加载完成 | 标题 + 正文淡入 |
| 控制栏显示 | 底部栏从下方滑入（springMotion） |
| 控制栏隐藏 | 底部栏向下滑出 |
| 设置面板 | bindSheet 从底部弹出，ImmersiveStyle.ULTRA_THICK |
| 章节目录 | bindSheet 弹出，当前章节高亮+滚动到可视区 |
| 离线模式 | 顶部显示「离线阅读」标签 |
| 网络异常 | 提示 + 「重试」或「阅读缓存」选项 |
| 切章动画 | 旧内容向左滑出 → 新内容从右滑入（320ms） |

### 4.3 书架页（ShelfPage）

**用途说明**：用户收藏管理和阅读历史，支持列表/网格双视图切换。

**核心组件清单**：
- `SectionHeader`（「我的收藏」+ Segmented 列表/网格切换）
- `SectionHeader`（「最近阅读」+ Segmented 列表/网格切换 + 「清空历史」按钮）
- `NovelCard`（网格模式卡片）
- `NovelListItem`（列表模式横向卡片：封面 + 信息 + 进度条 + 继续阅读按钮）
- `ProgressBar`（阅读进度条，渐变填充 + 光泽动画）
- `Button`（「继续」阅读按钮）
- `Button`（删除记录按钮，圆形，ImmersiveStyle.ULTRA_THIN）
- `LoadingSkel`

**布局详细说明**：

收藏区域（在上方）：
```
Column
├── SectionHeader（「我的收藏」+ Segmented [网格 | 列表]）
├── if gridMode:
│   └── Grid（2列手机/3列平板, gap: S3）
│       └── NovelCard × N
├── if listMode:
│   └── List
│       └── NovelListItem × N（横向卡片）
└── 空状态（无收藏时）
```

最近阅读区域（在下方，marginTop: S8）：
```
Column
├── SectionHeader（「最近阅读」+ Segmented + 「清空历史」）
├── if gridMode:
│   └── Grid（2列手机/3列平板）
│       └── NovelCard + 删除浮层
├── if listMode:
│   └── List
│       └── NovelListItem（进度条 + 继续按钮 + 删除按钮）
└── 空状态（无历史时）
```

**关键交互描述**：
1. 切换列表/网格 → 内容淡出 → 新布局淡入（320ms）
2. 点击「继续」→ 跳转阅读器，恢复上次阅读位置
3. 点击删除按钮 → 确认弹窗 → 删除记录
4. 点击「清空历史」→ 确认弹窗 → 清空全部阅读历史
5. 点击 NovelCard / NovelListItem → 跳转小说详情页
6. 长按小说卡片 → 弹出操作菜单（详情/移出书架/加入书架）
7. 下拉刷新 → 重新加载书架数据

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 未登录 | 显示登录引导卡片 |
| 加载中 | 骨架屏 |
| 空收藏 | 空状态插画 + 「去发现好书」按钮 |
| 空历史 | 空状态插画 + 「开始阅读」按钮 |
| 列表/网格切换 | 淡出 → 淡入 |
| 删除确认 | bindSheet 确认弹窗 |

---

## 模块五：用户模块

### 5.1 用户中心页（UserCenterPage）

**用途说明**：展示用户信息、阅读统计和功能入口。

**核心组件清单**：
- `Image`（用户头像，80vp 圆形，可点击更换）
- `Text`（用户名，SIZE_H2）
- `Text`（注册天数 / 阅读统计）
- `Row`（统计卡片：收藏数 / 阅读时长 / 章节数）
- `List`（功能入口：阅读历史 / 我的反馈 / 主题设置 / 书源管理 / 关于）
- `Button`（退出登录）

**布局详细说明**：
```
Scroll
├── Stack（Hero 区域，height: 200vp，主题色渐变背景）
│   ├── Image（模糊背景）
│   ├── Column（居中）
│   │   ├── Image（头像，80vp 圆形，白色边框）
│   │   ├── Text（用户名）
│   │   └── Text（「已阅读 N 天」）
│   └── Button（编辑头像，右上角）
├── Row（统计卡片，marginTop: -32vp 覆盖 Hero 底部）
│   ├── GlassCard（收藏数）
│   ├── GlassCard（阅读时长）
│   └── GlassCard（章节数）
├── List（功能入口）
│   ├── ListItem（阅读历史 →）
│   ├── ListItem（我的反馈 →）
│   ├── ListItem（主题设置 →）
│   ├── ListItem（书源管理 →）
│   ├── ListItem（离线缓存管理 →）
│   └── ListItem（关于紫枫 →）
└── Button（「退出登录」，红色文字，marginTop: S6）
```

**关键交互描述**：
1. 点击头像 → 调用 `@ohos.multimedia.camera` 或相册 → 裁剪上传
2. 点击统计卡片 → 跳转对应详情页
3. 点击功能入口 → 跳转对应页面
4. 点击「退出登录」→ 确认弹窗 → 清除 token → 跳转登录页
5. 点击「离线缓存管理」→ 跳转缓存管理页

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 未登录 | 显示登录引导 |
| 加载中 | 骨架屏 |
| 已登录 | 用户信息 + 功能列表 |
| 退出确认 | bindSheet 确认弹窗 |

### 5.2 设置页（SettingsPage）

**用途说明**：应用全局设置，包括主题、阅读、通知和离线配置。

**核心组件清单**：
- `List`（设置分组）
- `ThemeSelector`（5 色主题选择器）
- `Toggle`（深色模式开关）
- `Toggle`（通知推送开关）
- `Toggle`（离线自动缓存开关）
- `Slider`（默认字号）
- `Slider`（默认行距）
- `Select`（默认阅读背景）
- `Toggle`（仅 WiFi 下载开关）
- `Button`（清除缓存）
- `Text`（缓存大小显示）

**布局详细说明**：
```
Column
├── Row（BackButton + Title「设置」）
├── Scroll
│   ├── List（分组：外观）
│   │   ├── ListItem（主题色 → ThemeSelector，5 色圆形）
│   │   ├── ListItem（深色模式 → Toggle，跟随系统/手动）
│   │   └── ListItem（字体大小 → Slider 预览）
│   ├── List（分组：阅读）
│   │   ├── ListItem（默认字号 → Slider）
│   │   ├── ListItem（默认行距 → Slider）
│   │   └── ListItem（阅读背景 → Select 6 种）
│   ├── List（分组：通知与缓存）
│   │   ├── ListItem（更新提醒 → Toggle）
│   │   ├── ListItem（阅读提醒 → Toggle）
│   │   ├── ListItem（自动缓存 → Toggle）
│   │   ├── ListItem（仅 WiFi 下载 → Toggle）
│   │   └── ListItem（清除缓存 → Text + Button）
│   └── List（分组：关于）
│       ├── ListItem（版本号 → v1.0.0）
│       ├── ListItem（用户协议 →）
│       └── ListItem（隐私政策 →）
└── 底部安全区
```

**关键交互描述**：
1. 选择主题色 → 全局立即生效，所有页面颜色实时切换
2. 深色模式 Toggle → 跟随系统/手动切换
3. 通知开关 → 调用 `@ohos.notificationManager` 请求权限
4. 自动缓存开关 → 开启后阅读过的章节自动缓存
5. 清除缓存 → 确认弹窗 → 清除离线缓存 → 更新缓存大小显示

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 主题切换 | 全局颜色过渡动画（320ms） |
| 深色模式切换 | 全局深浅色过渡（320ms） |
| 清除缓存中 | Loading 指示器 |
| 清除完成 | Toast 提示 + 更新大小 |

### 5.3 书源管理页（BookSourcePage）

**用途说明**：管理小说书源，支持启用/禁用、排序、添加和编辑。

**核心组件清单**：
- `BackButton` + `Text`（「书源管理」）
- `Button`（「添加书源」，右上角）
- `List`（书源列表，可拖拽排序）
- `Toggle`（书源启用/禁用开关）
- `Tag`（书源类型标签：API/HTML/JS）
- `Text`（书源 URL、名称）
- `Button`（编辑、删除）
- `bindSheet`（添加/编辑书源表单）

**布局详细说明**：
```
Column
├── Row（BackButton + Title + 添加按钮）
├── List（可拖拽排序）
│   └── ListItem × N
│       ├── Row
│       │   ├── Image（书源图标，40vp）
│       │   ├── Column（书源名称 + URL）
│       │   ├── Tag（类型标签）
│       │   └── Toggle（启用开关）
│       └── Row（操作按钮：编辑 | 删除）
└── bindSheet（添加/编辑表单）
```

**关键交互描述**：
1. 长按书源项 → 进入拖拽排序模式
2. 切换 Toggle → 启用/禁用书源
3. 点击「编辑」→ bindSheet 弹出编辑表单
4. 点击「删除」→ 确认弹窗 → 删除书源
5. 点击「添加书源」→ bindSheet 弹出添加表单
6. 表单支持：书源名称、URL、类型选择、规则配置（JSON）

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 加载中 | 骨架列表 |
| 拖拽中 | 被拖拽项放大 1.05 + 阴影增强 |
| 编辑/添加 | bindSheet 半模态弹出 |
| 删除确认 | AlertDialog |

### 5.4 反馈页（FeedbackPage）

**用途说明**：用户提交反馈和查看反馈历史。

**核心组件清单**：
- `BackButton` + `Text`（「意见反馈」）
- `TextArea`（反馈内容输入，最多 500 字）
- `Select`（反馈类型：功能建议/Bug 反馈/内容问题/其他）
- `TextInput`（联系方式，可选）
- `Button`（提交反馈）
- `List`（历史反馈记录）

**布局详细说明**：
```
Column
├── Row（BackButton + Title）
├── Scroll
│   ├── GlassCard（反馈表单）
│   │   ├── Select（反馈类型）
│   │   ├── TextArea（反馈内容，maxLines: 6）
│   │   ├── TextInput（联系方式）
│   │   └── Button（「提交反馈」）
│   ├── SectionHeader（「历史反馈」）
│   └── List（历史反馈 × N）
│       └── ListItem（类型标签 + 内容摘要 + 时间 + 状态）
└── 底部安全区
```

**关键交互描述**：
1. 输入反馈内容 → 实时字数统计
2. 点击「提交反馈」→ 表单校验 → 调用 `submitFeedback` API
3. 提交成功 → Toast 提示 → 清空表单 → 刷新历史列表

**状态变化说明**：
| 状态 | 界面表现 |
|:-----|:---------|
| 输入中 | 字数统计实时更新 |
| 提交中 | 按钮 Loading |
| 提交成功 | Toast + 表单清空 |
| 历史为空 | 空状态提示 |

### 5.5 阅读历史页（ReadingHistoryPage）

**用途说明**：完整的阅读历史记录，支持按时间筛选和批量管理。

**核心组件清单**：
- `BackButton` + `Text`（「阅读历史」）
- `Segmented`（时间筛选：今天 / 本周 / 全部）
- `List`（历史记录列表）
- `NovelListItem`（小说信息 + 阅读进度 + 最后阅读时间）
- `Button`（继续阅读、删除记录）

**布局详细说明**：
```
Column
├── Row（BackButton + Title + Segmented）
├── List
│   └── ListItem × N
│       └── NovelListItem
│           ├── Row（封面 + 信息 + 操作按钮）
│           └── ProgressBar（阅读进度）
└── 底部安全区
```

**关键交互描述**：
1. 切换时间筛选 → 重新加载对应时间段记录
2. 点击「继续」→ 跳转阅读器恢复进度
3. 点击删除 → 移除单条记录

---

## 移动端增强功能

### 6.1 离线阅读

**用途说明**：章节内容缓存到本地，无网络时可继续阅读。

**技术实现**：
- 使用 `@ohos.file.fs` 将章节内容写入应用沙箱目录
- 缓存结构：`/files/cache/novels/{bookUrl}/{chapterIndex}.json`
- 缓存元数据存储在 `@ohos.data.relationalStore`（SQLite）
- 阅读时自动检测网络状态，离线时加载缓存

**缓存策略**：
| 场景 | 行为 |
|:-----|:-----|
| 阅读章节 | 当前章节 + 自动预缓存下一章 |
| 手动缓存 | 详情页「缓存全本」按钮，批量下载 |
| 缓存过期 | 7 天未阅读的缓存自动清理 |
| 存储不足 | LRU 策略清理最久未读的缓存 |

**界面集成**：
- 阅读器顶部显示「离线」标签（无网络时）
- 详情页显示缓存状态：「已缓存 N/N 章」
- 设置页可查看缓存大小、手动清除

### 6.2 系统通知推送

**用途说明**：小说更新提醒和阅读提醒。

**通知类型**：
| 类型 | 触发条件 | 通知内容 |
|:-----|:---------|:---------|
| 更新提醒 | 书架内小说有新章节 | 「《{小说名}》更新了第 N 章」 |
| 阅读提醒 | 用户设置的定时提醒 | 「继续阅读《{小说名}》第 N 章」 |
| 系统通知 | 重要公告 | 应用内公告推送 |

**技术实现**：
- 使用 `@ohos.notificationManager` 发布通知
- 后台任务使用 `@ohos.backgroundTasks` 定时检查更新
- 通知点击 → 通过 `wantAgent` 跳转到对应小说阅读页

**界面集成**：
- 设置页：通知开关 + 提醒时间设置
- 通知样式：封面缩略图 + 标题 + 内容

### 6.3 语音搜索

**用途说明**：语音输入搜索小说，解放双手。

**技术实现**：
- 使用 `@ohos.ai.asr`（自动语音识别）Kit
- 流程：点击语音按钮 → 启动识别 → 实时显示识别结果 → 识别完成自动搜索

**界面集成**：
- 搜索页输入框右侧语音图标
- 识别中：麦克风脉冲动画 + 「请说出书名...」提示
- 识别完成：结果自动填入搜索框 → 触发搜索

### 6.4 桌面快捷菜单

**用途说明**：应用图标长按弹出快捷操作菜单。

**快捷菜单项**：
| 菜单项 | 图标 | 行为 |
|:-------|:-----|:-----|
| 继续阅读 | 图书图标 | 跳转最近阅读的小说阅读页 |
| 搜索 | 放大镜图标 | 跳转搜索页 |
| 书架 | 书架图标 | 跳转书架页 |
| 我的 | 人物图标 | 跳转用户中心 |

**技术实现**：
- 在 `module.json5` 中配置 `shortcutItems`
- 使用 `ShortcutManager` API 注册动态快捷方式
- 「继续阅读」根据阅读历史动态更新目标小说

### 6.5 浮窗闪控球

**用途说明**：在桌面或其他应用上方显示快速操作浮窗。

**功能**：
- 浮窗显示当前阅读小说名 + 进度
- 点击浮窗 → 快速回到阅读页
- 浮窗可拖拽到屏幕边缘
- ImmersiveStyle.ULTRA_THIN 材质

**技术实现**：
- 使用 `@ohos.window` 创建悬浮窗
- 通过 `window.createWindow` 设置 `WindowType.TYPE_FLOAT`
- 浮窗内容使用 ImmersiveMaterial ULTRA_THIN 样式

**界面集成**：
- 阅读器设置中可开启/关闭浮窗
- 退出阅读器时浮窗自动显示
- 点击浮窗回到阅读页时浮窗消失

---

## 自适应布局规则

### 断点定义

| 断点 | 宽度范围 | 布局策略 | 导航方式 |
|:-----|:---------|:---------|:---------|
| `sm` | < 600vp | 单列流式 | 底部 Tabs 导航 |
| `md` | 600-840vp | 双列（列表+详情） | 侧边 Tabs 导航 |
| `lg` | > 840vp | 三列（导航+列表+详情） | 侧边栏导航 |

### 实现方式

使用 `Navigation` 组件的分栏模式 + `GridRow/GridCol` 响应式栅格：

```typescript
@Entry
@Component
struct MainPage {
  @State currentBreakpoint: string = 'sm'

  build() {
    Navigation(this.navPathStack) {
      // 主内容区
      GridRow({
        breakpoints: { value: ['600vp', '840vp'],
          reference: BreakpointsReference.WindowSize },
        onBreakpointChange: (bp: string) => {
          this.currentBreakpoint = bp
        }
      }) {
        GridCol({ span: { sm: 24, md: 12, lg: 8 } }) {
          // 列表区
        }
        GridCol({ span: { sm: 0, md: 12, lg: 16 } }) {
          // 详情区（md/lg 显示）
        }
      }
    }
    .navBarWidth(this.currentBreakpoint === 'lg' ? 200 : 0)
    .mode(this.currentBreakpoint === 'sm' ? NavigationMode.Stack : NavigationMode.Split)
  }
}
```

### 各页面适配策略

| 页面 | 手机 (sm) | 平板 (md) | 平板 (lg) |
|:-----|:----------|:----------|:----------|
| 首页 | 单列滚动 + 底部 Tab | 双列（侧边导航 + 内容） | 三列（导航 + 推荐 + 榜单） |
| 详情页 | 全屏页面 | 右侧分栏 | 右侧分栏 |
| 阅读器 | 全屏 | 全屏（沉浸式） | 全屏（沉浸式） |
| 书架 | 2 列网格 | 3 列网格 | 4 列网格 |
| 搜索 | 全屏搜索 | 左侧搜索 + 右侧结果 | 左侧搜索 + 右侧结果 |
| 设置 | 单列列表 | 双列分组 | 双列分组 |

---

## 核心组件库完整清单

### 通用组件

| 组件名 | 文件路径 | 用途 | 关键属性 |
|:-------|:---------|:-----|:---------|
| `GlassCard` | `common/GlassCard.ets` | 玻璃卡片容器 | `immersiveStyle`, `padding`, `borderRadius` |
| `GlassNavBar` | `common/GlassNavBar.ets` | 磁吸玻璃导航栏 | `scrollOffset`, `autoHide`, `immersiveStyle: THICK` |
| `GlassSearchBar` | `common/GlassSearchBar.ets` | 搜索栏 | `immersiveStyle: THIN`, `voiceEnabled` |
| `SectionHeader` | `common/SectionHeader.ets` | 区域标题 | `title`, `actionText`, `actionVisible` |
| `BackButton` | `common/BackButton.ets` | 返回按钮 | `immersiveStyle: ULTRA_THIN` |
| `LoadingSkel` | `common/LoadingSkel.ets` | 骨架屏 | `width`, `height`, `shape: 'card' \| 'text' \| 'circle'` |

### 业务组件

| 组件名 | 文件路径 | 用途 | 关键属性 |
|:-------|:---------|:-----|:---------|
| `NovelCard` | `components/NovelCard.ets` | 小说卡片 | `novel`, `layout: 'grid' \| 'list'`, `showScore`, `showSummary` |
| `NovelListItem` | `components/NovelListItem.ets` | 小说列表项 | `novel`, `showProgress`, `showActions` |
| `RankItem` | `components/RankItem.ets` | 排行榜项 | `rank`, `novel`, `accentColor` |
| `ProgressBar` | `components/ProgressBar.ets` | 阅读进度条 | `percent`, `gradient`, `animated` |
| `ThemeSelector` | `components/ThemeSelector.ets` | 主题选择器 | `currentTheme`, `onSelect` |
| `FloatingControl` | `components/FloatingControl.ets` | 浮窗闪控球 | `novelName`, `progress`, `immersiveStyle: ULTRA_THIN` |

### 页面组件

| 页面 | 文件路径 | 模块 |
|:-----|:---------|:-----|
| StartPage | `pages/StartPage.ets` | 认证 |
| LoginPage | `pages/LoginPage.ets` | 认证 |
| RegisterPage | `pages/RegisterPage.ets` | 认证 |
| ResetPasswordPage | `pages/ResetPasswordPage.ets` | 认证 |
| HomePage | `pages/HomePage.ets` | 发现 |
| CategoryPage | `pages/CategoryPage.ets` | 发现 |
| CategoryDetailPage | `pages/CategoryDetailPage.ets` | 发现 |
| RankPage | `pages/RankPage.ets` | 发现 |
| SearchPage | `pages/SearchPage.ets` | 发现 |
| NovelDetailPage | `pages/NovelDetailPage.ets` | 阅读 |
| ReaderPage | `pages/ReaderPage.ets` | 阅读 |
| ShelfPage | `pages/ShelfPage.ets` | 阅读 |
| DirectoryPage | `pages/DirectoryPage.ets` | 阅读 |
| UserCenterPage | `pages/UserCenterPage.ets` | 用户 |
| SettingsPage | `pages/SettingsPage.ets` | 用户 |
| BookSourcePage | `pages/BookSourcePage.ets` | 用户 |
| FeedbackPage | `pages/FeedbackPage.ets` | 用户 |
| ReadingHistoryPage | `pages/ReadingHistoryPage.ets` | 用户 |

### 服务层

| 服务名 | 文件路径 | 职责 |
|:-------|:---------|:-----|
| `ApiClient` | `service/ApiClient.ets` | HTTP 请求封装 |
| `AuthService` | `service/AuthService.ets` | 登录/注册/重置密码 |
| `BookService` | `service/BookService.ets` | 小说信息/章节内容 |
| `BookshelfService` | `service/BookshelfService.ets` | 书架 CRUD |
| `SearchService` | `service/SearchService.ets` | 搜索（聚合/单源） |
| `RankService` | `service/RankService.ets` | 排行榜数据 |
| `CategoryService` | `service/CategoryService.ets` | 分类数据 |
| `FeedbackService` | `service/FeedbackService.ets` | 反馈提交/查询 |
| `ThemeManager` | `service/ThemeManager.ets` | 主题切换/持久化 |
| `OfflineCacheManager` | `service/OfflineCacheManager.ets` | 离线缓存管理 |
| `NotificationService` | `service/NotificationService.ets` | 通知推送 |
| `VoiceSearchService` | `service/VoiceSearchService.ets` | 语音识别搜索 |

### 文件结构总览

```
zifeng-harmony/entry/src/main/ets/
├── common/
│   ├── DesignSystem.ets          # 设计令牌（颜色/字体/间距/圆角/动效）
│   ├── GlassCard.ets              # 玻璃卡片组件
│   ├── GlassNavBar.ets            # 磁吸玻璃导航栏
│   ├── GlassSearchBar.ets         # 玻璃搜索栏
│   ├── SectionHeader.ets          # 区域标题
│   ├── BackButton.ets             # 返回按钮
│   ├── LoadingSkel.ets            # 骨架屏
│   └── ParticleEffects.ets        # 粒子光斑效果
├── components/
│   ├── NovelCard.ets              # 小说卡片（网格布局）
│   ├── NovelListItem.ets          # 小说列表项（横向布局）
│   ├── RankItem.ets               # 排行榜列表项
│   ├── ProgressBar.ets            # 进度条
│   ├── ThemeSelector.ets          # 主题选择器
│   └── FloatingControl.ets        # 浮窗闪控球
├── pages/
│   ├── StartPage.ets
│   ├── LoginPage.ets
│   ├── RegisterPage.ets
│   ├── ResetPasswordPage.ets
│   ├── HomePage.ets
│   ├── CategoryPage.ets
│   ├── CategoryDetailPage.ets
│   ├── RankPage.ets
│   ├── SearchPage.ets
│   ├── NovelDetailPage.ets
│   ├── ReaderPage.ets
│   ├── ShelfPage.ets
│   ├── DirectoryPage.ets
│   ├── UserCenterPage.ets
│   ├── SettingsPage.ets
│   ├── BookSourcePage.ets
│   ├── FeedbackPage.ets
│   └── ReadingHistoryPage.ets
├── service/
│   ├── ApiClient.ets
│   ├── AuthService.ets
│   ├── BookService.ets
│   ├── BookshelfService.ets
│   ├── SearchService.ets
│   ├── RankService.ets
│   ├── CategoryService.ets
│   ├── FeedbackService.ets
│   ├── ThemeManager.ets
│   ├── OfflineCacheManager.ets
│   ├── NotificationService.ets
│   └── VoiceSearchService.ets
├── model/
│   ├── NovelItem.ets              # 小说数据模型
│   ├── NovelDetails.ets           # 小说详情模型
│   ├── Chapters.ets               # 章节模型
│   └── NovelContent.ets           # 章节内容模型
├── entryability/
│   └── EntryAbility.ets           # 入口 Ability
└── platform/
    └── PlatformAdapter.ets         # 平台适配器
```

---

## 设计决策记录

1. **ImmersiveMaterial 替代 BlurStyle**：API 26 的 ImmersiveMaterial 提供更高级的视觉品质和自适应能力，完全替代原有 BlurStyle 方案。
2. **多主题色而非单一主题**：与 Web 端保持一致，用户可自由选择 5 套主题色，增强个性化体验。
3. **手机+平板双适配**：使用 Navigation 分栏模式 + GridRow 响应式栅格，无需维护两套代码。
4. **离线缓存使用 relationalStore**：相比纯文件存储，SQLite 提供更好的查询能力和 LRU 管理。
5. **浮窗闪控球使用 ULTRA_THIN 材质**：最薄材质确保浮窗不影响底层应用可见性。
6. **阅读器全屏沉浸式**：不使用底部导航栏，通过点击屏幕中央呼出控制栏，最大化阅读区域。
7. **bindSheet 用于设置和目录**：半模态页面保留上下文，比全屏页面更适合辅助操作。
8. **应用快启技术**：在 module.json5 中配置快启优化，启动页展示品牌同时后台预加载数据。
