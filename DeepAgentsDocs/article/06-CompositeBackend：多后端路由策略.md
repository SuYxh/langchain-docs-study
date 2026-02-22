# 06. CompositeBackend：多后端路由策略

> 统一入口，分路存储——构建灵活的混合存储架构

## 引言

在前两篇文章中，我们学习了五种独立的后端类型。但在实际项目中，往往需要**混合使用多种存储策略**：

- 临时计算结果 → 存在内存中（StateBackend）
- 用户偏好 → 跨会话持久化（StoreBackend）
- 项目文件 → 本地磁盘（FilesystemBackend）

**CompositeBackend** 就是为这种场景设计的——它像一个"智能路由器"，根据文件路径自动选择合适的后端。

## 核心概念

### 路径路由机制

```
代理写入文件
     │
     ▼
┌─────────────────────────────────────────────────┐
│              CompositeBackend                   │
│  ┌───────────────────────────────────────────┐ │
│  │            路径路由表                      │ │
│  │  /memories/*  →  StoreBackend             │ │
│  │  /workspace/* →  FilesystemBackend        │ │
│  │  其他路径     →  StateBackend (默认)       │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
     │               │                │
     ▼               ▼                ▼
┌─────────┐   ┌────────────┐   ┌─────────────┐
│ Store   │   │ Filesystem │   │   State     │
│ Backend │   │  Backend   │   │  Backend    │
│ (持久化) │   │  (本地)    │   │  (临时)     │
└─────────┘   └────────────┘   └─────────────┘
```

### 生活类比

CompositeBackend 像一个**智能快递柜系统**：

- 你只需要把包裹（文件）放入柜子
- 系统根据包裹标签（路径前缀）自动分拣
- 生鲜（临时数据）放冷藏格，文件放普通格，重要物品放保险柜

## 基础用法

### 创建 CompositeBackend

```typescript
import { createDeepAgent } from "deepagents";
import { 
  CompositeBackend, 
  StateBackend, 
  StoreBackend, 
  FilesystemBackend 
} from "deepagents/backends";
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();

const agent = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),  // 第一个参数：默认后端
    {
      // 第二个参数：路径路由映射
      "/memories/": new StoreBackend(rt),
      "/workspace/": new FilesystemBackend(rt, { 
        rootDir: process.cwd() 
      }),
    }
  ),
  store: store,
  systemPrompt: `你是一个智能助手。

文件存储规则：
- /memories/ - 需要跨会话保存的内容（用户偏好、学习到的知识）
- /workspace/ - 项目文件（代码、配置）
- 其他路径 - 临时数据（计算中间结果、草稿）
`
});
```

### 路由规则解析

| 代理操作 | 匹配规则 | 使用的后端 |
|---------|---------|-----------|
| `write_file("/memories/user.md", ...)` | 前缀匹配 `/memories/` | StoreBackend |
| `write_file("/workspace/src/app.ts", ...)` | 前缀匹配 `/workspace/` | FilesystemBackend |
| `write_file("/temp/calc.md", ...)` | 无匹配，使用默认 | StateBackend |
| `write_file("/draft.md", ...)` | 无匹配，使用默认 | StateBackend |

### 路径前缀注意事项

```typescript
// ✅ 正确：路径前缀以 "/" 结尾
{
  "/memories/": new StoreBackend(rt),
}

// ⚠️ 注意：不以 "/" 结尾会匹配更多路径
{
  "/mem": new StoreBackend(rt),
  // 会匹配 /mem, /memory, /memories, /memorial 等
}

// ✅ 推荐：使用明确的目录前缀
{
  "/memories/": new StoreBackend(rt),
  "/projects/": new FilesystemBackend(rt, {...}),
}
```

## 经典架构模式

### 模式一：长期记忆 + 临时工作区

最常见的模式，用于构建"有记忆"的助手：

```typescript
const agentWithMemory = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),  // 临时数据
    {
      "/memories/": new StoreBackend(rt),  // 持久化记忆
    }
  ),
  store: store,
  systemPrompt: `你是一个个人助理，具有长期记忆能力。

## 记忆管理
- 用户偏好 → /memories/preferences.md
- 重要事项 → /memories/notes.md
- 对话历史摘要 → /memories/history.md

## 使用方法
1. 首次对话时，检查 /memories/ 目录是否有历史记录
2. 学到用户的新偏好时，更新 /memories/preferences.md
3. 临时计算和草稿放在 /temp/ 目录
`
});
```

**工作流程示例**：

```
用户: "记住我喜欢简洁的回复风格"
     ↓
代理: write_file("/memories/preferences.md", "- 回复风格：简洁")
     ↓
[下次对话]
     ↓
用户: "今天天气怎么样？"
     ↓
代理: 
  1. read_file("/memories/preferences.md")  ← 读取偏好
  2. [获取天气]
  3. "晴，25°C。"  ← 简洁回复
```

### 模式二：开发助手（本地 + 记忆）

用于编码助手，既能操作项目文件，又能记住开发偏好：

```typescript
const devAssistant = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),
    {
      "/project/": new FilesystemBackend(rt, {
        rootDir: "/Users/me/my-project",
        virtualMode: true
      }),
      "/memories/": new StoreBackend(rt),
    }
  ),
  store: store,
  systemPrompt: `你是一个编码助手。

## 文件系统
- /project/ → 项目文件（可读写本地磁盘）
- /memories/ → 开发偏好（跨会话持久化）
- 其他路径 → 临时工作区

## 工作流程
1. 首先读取 /memories/project_conventions.md 了解项目约定
2. 修改代码前，先理解现有架构
3. 学到新的项目约定时，更新记忆
`
});
```

### 模式三：研究助手（多层存储）

用于复杂研究任务，需要多层次的数据管理：

```typescript
const researchAssistant = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),
    {
      "/research/": new StateBackend(rt),      // 当前研究（会话级）
      "/archive/": new StoreBackend(rt),       // 研究存档（持久化）
      "/knowledge/": new StoreBackend(rt),     // 知识库（持久化）
      "/output/": new FilesystemBackend(rt, {  // 输出文件（本地）
        rootDir: "./research-output"
      }),
    }
  ),
  store: store,
  systemPrompt: `你是一个研究助手。

## 存储分层
- /research/   - 当前研究的临时数据（搜索结果、笔记）
- /archive/    - 完成的研究存档（持久保存）
- /knowledge/  - 积累的知识库（跨研究共享）
- /output/     - 最终输出文件（保存到本地）

## 研究流程
1. 搜索资料 → 保存到 /research/
2. 分析整理 → 更新 /knowledge/
3. 撰写报告 → 输出到 /output/
4. 研究完成 → 存档到 /archive/
`
});
```

## 实现长期记忆

CompositeBackend 最重要的应用就是实现**长期记忆**——让代理能够跨会话"记住"信息。

### 记忆的类型

| 记忆类型 | 示例 | 存储位置 |
|---------|------|---------|
| 用户偏好 | 喜欢的回复风格、时区 | `/memories/preferences.md` |
| 事实知识 | 用户的姓名、职业 | `/memories/facts.md` |
| 工作约定 | 项目的编码规范 | `/memories/conventions.md` |
| 历史摘要 | 过去对话的要点 | `/memories/history.md` |

### 记忆的读写模式

```typescript
const memoryAgent = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),
    { "/memories/": new StoreBackend(rt) }
  ),
  store: store,
  systemPrompt: `你是一个有记忆的助手。

## 记忆协议

### 启动时
1. ls("/memories/") 检查现有记忆
2. read_file("/memories/preferences.md") 加载用户偏好
3. read_file("/memories/facts.md") 加载已知事实

### 对话中
- 发现用户新偏好 → edit_file("/memories/preferences.md", ...)
- 学到新事实 → edit_file("/memories/facts.md", ...)
- 重要对话 → 追加到 /memories/history.md

### 记忆格式
使用 YAML 前置元数据 + Markdown 正文：

\`\`\`markdown
---
updated: 2024-01-15
confidence: high
---

# 用户偏好

## 回复风格
- 简洁
- 技术性

## 时区
- Asia/Shanghai
\`\`\`
`
});
```

### 记忆 vs 技能

| 特性 | 记忆 (Memory) | 技能 (Skills) |
|------|--------------|--------------|
| 来源 | 代理从交互中学习 | 开发者预定义 |
| 内容 | 用户偏好、事实 | 操作指南、模板 |
| 可修改 | ✅ 代理可读写 | ❌ 通常只读 |
| 作用域 | 特定用户/线程 | 全局共享 |
| 存储 | StoreBackend | 文件系统或嵌入 |

## 高级配置

### 嵌套路由

CompositeBackend 支持多层路径路由：

```typescript
const agent = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),
    {
      "/memories/": new StoreBackend(rt),
      "/memories/important/": new StoreBackend(rt, {
        // 可以为嵌套路径配置不同的 Store
        namespace: "important-memories"
      }),
      "/workspace/": new FilesystemBackend(rt, {...}),
    }
  ),
});

// 匹配规则：最长前缀优先
// /memories/important/note.md → StoreBackend (important-memories)
// /memories/general.md → StoreBackend (默认)
// /workspace/code.ts → FilesystemBackend
// /temp/draft.md → StateBackend
```

### 动态后端选择

可以在运行时根据条件选择后端：

```typescript
function createDynamicBackend(rt, options) {
  const routes = {
    "/memories/": new StoreBackend(rt),
  };
  
  // 根据环境决定是否启用本地文件系统
  if (options.enableLocalFilesystem) {
    routes["/local/"] = new FilesystemBackend(rt, {
      rootDir: options.rootDir
    });
  }
  
  return new CompositeBackend(
    new StateBackend(rt),
    routes
  );
}

const agent = createDeepAgent({
  backend: (rt) => createDynamicBackend(rt, {
    enableLocalFilesystem: process.env.NODE_ENV === "development",
    rootDir: process.cwd()
  }),
});
```

### 与 Checkpointer 配合

CompositeBackend 与 LangGraph 的 Checkpointer 配合使用，可以实现完整的状态管理：

```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const store = new InMemoryStore();

const agent = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),  // 会被 checkpoint 保存
    { "/memories/": new StoreBackend(rt) }  // 独立持久化
  ),
  checkpointer,  // 保存整体状态
  store,         // StoreBackend 使用
});

// 状态恢复
// 1. checkpointer 恢复 StateBackend 中的临时数据
// 2. StoreBackend 自动连接持久化存储
```

## 完整示例：构建有记忆的助手

```typescript
import { createDeepAgent } from "deepagents";
import { CompositeBackend, StateBackend, StoreBackend } from "deepagents/backends";
import { InMemoryStore, MemorySaver } from "@langchain/langgraph";

const store = new InMemoryStore();
const checkpointer = new MemorySaver();

const assistant = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),
    { "/memories/": new StoreBackend(rt) }
  ),
  store,
  checkpointer,
  systemPrompt: `你是一个具有长期记忆能力的个人助理。

## 记忆系统

你有一个持久化的记忆系统，可以跨对话保存和检索信息。

### 记忆文件
- /memories/user_profile.md - 用户基本信息
- /memories/preferences.md - 用户偏好设置
- /memories/notes.md - 重要事项和笔记
- /memories/history.md - 对话历史摘要

### 工作流程

1. **对话开始时**：
   - 检查 /memories/ 目录
   - 读取 user_profile.md 和 preferences.md
   - 根据用户偏好调整回复风格

2. **对话过程中**：
   - 发现用户新偏好 → 更新 preferences.md
   - 用户提到重要信息 → 更新 user_profile.md
   - 完成重要任务 → 记录到 notes.md

3. **对话结束前**：
   - 有价值的对话 → 摘要保存到 history.md

### 记忆格式示例

\`\`\`markdown
# 用户偏好

## 回复风格
- 简洁明了
- 包含代码示例

## 技术栈
- TypeScript
- React
- Node.js
\`\`\`

注意：记忆是宝贵的，只保存真正有价值的信息。
`
});

async function chat(message: string, threadId: string) {
  const result = await assistant.invoke(
    { messages: [{ role: "user", content: message }] },
    { configurable: { thread_id: threadId } }
  );
  
  return result.messages[result.messages.length - 1].content;
}

async function main() {
  // 第一次对话
  console.log(await chat("你好，我是张三，我是一名前端工程师", "thread-1"));
  // 助手会记住用户信息
  
  // 同一线程的后续对话
  console.log(await chat("我喜欢简洁的回复", "thread-1"));
  // 助手会更新偏好
  
  // 新线程，但记忆仍然存在
  console.log(await chat("你还记得我是谁吗？", "thread-2"));
  // 助手会读取 /memories/ 中的信息
}

main();
```

## 小结

本文介绍了 CompositeBackend 的核心概念和使用方法：

| 概念 | 说明 |
|------|------|
| 路径路由 | 根据文件路径前缀选择后端 |
| 默认后端 | 无匹配路由时使用 |
| 最长前缀匹配 | 多个路由匹配时选择最长的 |
| 长期记忆 | `/memories/` + StoreBackend |

**三种经典模式**：
1. **记忆模式**：StateBackend + StoreBackend(/memories/)
2. **开发模式**：StateBackend + FilesystemBackend(/project/) + StoreBackend(/memories/)
3. **研究模式**：多层分离的临时/存档/知识库/输出

**最佳实践**：
- ✅ 使用明确的目录前缀（以 `/` 结尾）
- ✅ 为不同类型的数据选择合适的后端
- ✅ 在 systemPrompt 中说明存储规则
- ✅ 结合 checkpointer 实现完整状态管理

## 下一步

在下一部分（高级功能篇）中，我们将学习：
- 子代理系统：任务委托的艺术
- 人机协作：interrupt_on 机制详解
- 长期记忆的更多模式
- 技能系统：可复用的专业能力

## 实践任务

1. 创建一个 CompositeBackend，实现临时数据 + 持久记忆的分离
2. 让代理在首次对话时创建记忆文件，后续对话时读取和更新
3. 尝试添加第三层路由（如 `/archive/`）实现历史存档

## 参考资源

- [后端官方文档](https://docs.langchain.com/oss/javascript/deepagents/backends)
- [长期记忆文档](https://docs.langchain.com/oss/javascript/deepagents/long-term-memory)
- [LangGraph Store](https://docs.langchain.com/oss/javascript/langgraph/persistence)
