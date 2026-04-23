# 小说工作台配置文件类型定义

本文件定义了小说工作台所有配置文件的类型、字段说明和使用规范，供 AI 生成 SKILLS 时作为类型约束参考。

## 目录结构

```
.writerHelper/novelWorkbench/
├── outline.json              # 大纲配置
├── outline_details.json      # 细纲配置
├── settings.json             # 全局设置配置
├── works.json                # 作品管理配置
├── timelineNetwork.json      # 章节网络线配置
├── rules.json                # 写作规则配置
├── settings/                 # 设定目录
│   ├── characters.json       # 人物设定
│   ├── world.json            # 世界设定
│   ├── skills.json           # 技能设定
│   ├── items.json            # 物品设定
│   ├── scenes.json           # 场景设定
│   └── factions.json         # 势力设定
└── types/
    └── typing.md             # 本文件
```

---

## 1. outline.json - 大纲配置

**文件路径**: `.writerHelper/novelWorkbench/outline.json`

**用途**: 存储小说的核心大纲信息，包括世界观、核心冲突、卖点等。

**类型定义**:
```typescript
interface OutlineConfig {
  summary: string;              // 大纲梗概 - 小说整体故事概要
  conflict: string;             // 核心冲突 - 小说的主要矛盾
  sellingPoint: string;         // 核心卖点 - 小说的吸引力所在
  worldView: string;            // 世界观 - 小说的世界观设定
  volume_outline: Record<string, string>;  // 卷大纲 - key为卷标识，value为卷概要
  outline: Record<string, OutlineChapter>;  // 章节概要
  meta?: ConfigMeta;            // 元数据
}

interface OutlineChapter {
  person: string[];             // 本章出场人物
  site: string[];               // 本章发生场景
  info: string;                 // 本章内容概要
}

interface ConfigMeta {
  updatedAt: number | string;   // 更新时间戳
  sourcePaths: string[];        // 源文件路径
  sourceMtimes: Record<string, number | string>;  // 源文件修改时间
  changeRanges?: Record<string, FileChangeRange[]>;  // 文件变更范围
}

interface FileChangeRange {
  startLine: number;            // 起始行号
  endLine: number;              // 结束行号
  timestamp: number | string;   // 时间戳
}
```

---

## 2. outline_details.json - 细纲配置

**文件路径**: `.writerHelper/novelWorkbench/outline_details.json`

**用途**: 存储详细的章节大纲信息，包括卷结构、章节列表、章节详情等。

**类型定义**:
```typescript
interface OutlineDetailsConfig {
  volumes?: ChapterOutlineVolume[];  // 卷列表
  meta?: ConfigMeta;            // 元数据（同 outline.json）
  [key: string]: any;           // 可扩展字段
}

interface ChapterOutlineVolume {
  id: string;                   // 卷唯一标识
  name: string;                 // 卷名称
  summary?: string;             // 卷概要
  chapters: ChapterOutlineChapter[];  // 章节列表
}

interface ChapterOutlineChapter {
  id: string;                   // 章节唯一标识
  name: string;                 // 章节名称
  title?: string;               // 章节标题
  summary?: string;             // 章节梗概
  characters?: string[];        // 出场人物
  settings?: string[];          // 涉及场景
  locked?: boolean;             // 是否锁定（禁止编辑）
  filePath?: string;            // 关联的章节文件路径
  plotDescription?: string;     // 剧情描述
}
```

---

## 3. settings.json - 全局设置配置

**文件路径**: `.writerHelper/novelWorkbench/settings.json`

**用途**: 存储小说工作台的全局设置。

**类型定义**:
```typescript
interface SettingsConfig {
  tabHighlightColors?: Partial<Record<SettingType, string>>;  // 标签页高亮颜色
}

type SettingType = 'characters' | 'world' | 'skills' | 'items' | 'scenes' | 'factions';
```

---

## 4. works.json - 作品管理配置

**文件路径**: `.writerHelper/novelWorkbench/works.json`

**用途**: 存储作品列表和作品信息。

**类型定义**:
```typescript
interface Work {
  id: string;                   // 作品唯一标识
  name: string;                 // 作品名称
  folderPath: string;           // 作品文件夹路径
  novelType?: string;           // 小说类型
  novelGenre?: string;          // 小说题材
  expectedWordCount?: number;   // 预期字数
  coverPath?: string;           // 封面图片路径（base64或路径）
  wordCount?: number;           // 当前字数
  createdAt: number;            // 创建时间
  updatedAt: number;            // 更新时间
}
```

---

## 5. timelineNetwork.json - 章节网络线配置

**文件路径**: `.writerHelper/novelWorkbench/timelineNetwork.json`

**用途**: 存储小说的时间线、关系网络，包括人物线、剧情线、伏笔等。

**类型定义**:
```typescript
interface TimelineNetwork {
  nodes: TimelineNode[];        // 节点列表
  relations: TimelineRelation[];  // 关系列表
  meta?: {
    updatedAt: number;          // 更新时间戳
    version: string;            // 版本号
  };
}

interface TimelineNode {
  id: string;                   // 节点唯一标识
  type: 'character' | 'item' | 'setting' | 'story' | 'foreshadow' | 'hook';
                                // 节点类型：人物、物品、场景、剧情、伏笔、钩子
  name: string;                 // 节点名称
  description: string;          // 节点描述
  chapterIds: string[];         // 关联的章节ID列表
  recovered?: boolean;          // 伏笔是否已回收
  recoveredChapterId?: string;  // 回收伏笔的章节ID
  recoveredDescription?: string;  // 伏笔回收说明
}

interface TimelineRelation {
  id: string;                   // 关系唯一标识
  fromNodeId: string;           // 起始节点ID
  toNodeId: string;             // 目标节点ID
  type: 'appears_in' | 'related_to' | 'foreshadows' | 'hooks' | 'contains';
                                // 关系类型：出现在、关联于、伏笔、钩子、包含
  description?: string;         // 关系描述
}
```

---

## 6. rules.json - 写作规则配置

**文件路径**: `.writerHelper/novelWorkbench/rules.json`

**用途**: 存储写作规则，包括常用词汇、禁止词汇、写作手法等。

**类型定义**:
```typescript
interface RulesConfig {
  commonWords: Array<{
    id: string;                 // 唯一标识
    content: string;            // 词汇内容
    description?: string;       // 词汇说明
  }>;
  commonSentences: Array<{
    id: string;                 // 唯一标识
    content: string;            // 句式内容
    description?: string;       // 句式说明
  }>;
  forbiddenWords: Array<{
    id: string;                 // 唯一标识
    content: string;            // 禁止词汇内容
    description?: string;       // 禁止原因说明
  }>;
  forbiddenSentences: Array<{
    id: string;                 // 唯一标识
    content: string;            // 禁止句式内容
    description?: string;       // 禁止原因说明
  }>;
  writingTechniques: string;    // 写作手法说明
  savedAt?: number;             // 保存时间戳
}
```

---

## 7. settings/characters.json - 人物设定

**文件路径**: `.writerHelper/novelWorkbench/settings/characters.json`

**用途**: 存储小说中的人物设定。

**类型定义**:
```typescript
type CharactersConfig = Array<{
  name: string;                 // 人物名称
  description?: string;         // 人物描述/设定
}>;
```

---

## 8. settings/world.json - 世界设定

**文件路径**: `.writerHelper/novelWorkbench/settings/world.json`

**用途**: 存储小说的世界观设定。

**类型定义**:
```typescript
type WorldConfig = Array<{
  name: string;                 // 设定项名称
  description?: string;         // 设定项描述
}>;
```

---

## 9. settings/skills.json - 技能设定

**文件路径**: `.writerHelper/novelWorkbench/settings/skills.json`

**用途**: 存储小说中的技能/能力设定。

**类型定义**:
```typescript
type SkillsConfig = Array<{
  name: string;                 // 技能名称
  description?: string;         // 技能描述
}>;
```

---

## 10. settings/items.json - 物品设定

**文件路径**: `.writerHelper/novelWorkbench/settings/items.json`

**用途**: 存储小说中的物品设定。

**类型定义**:
```typescript
type ItemsConfig = Array<{
  name: string;                 // 物品名称
  description?: string;         // 物品描述
}>;
```

---

## 11. settings/scenes.json - 场景设定

**文件路径**: `.writerHelper/novelWorkbench/settings/scenes.json`

**用途**: 存储小说中的场景设定。

**类型定义**:
```typescript
type ScenesConfig = Array<{
  name: string;                 // 场景名称
  description?: string;         // 场景描述
}>;
```

---

## 12. settings/factions.json - 势力设定

**文件路径**: `.writerHelper/novelWorkbench/settings/factions.json`

**用途**: 存储小说中的势力/组织设定。

**类型定义**:
```typescript
type FactionsConfig = Array<{
  name: string;                 // 势力名称
  description?: string;         // 势力描述
}>;
```

---

## 使用说明

1. **读取配置文件**: 使用 Read 工具读取上述 JSON 文件获取创作资料
2. **更新配置文件**: 使用 Write 工具更新配置文件，保持 JSON 格式正确
3. **类型约束**: 生成 SKILLS 时，严格按照本文件定义的字段类型进行操作
4. **元数据处理**: 操作配置文件时，注意维护 meta 字段的更新时间
