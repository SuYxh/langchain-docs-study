# 01. DeepAgents 概览：重新定义自主代理

> 从"指令执行"到"自主规划"的进化

## 引言：什么是真正的"智能"代理？

想象你有一个助手。普通的 AI 助手像一台"智能计算器"——你给它一个问题，它算出答案，然后等待下一个指令。但真正优秀的助手应该像一位"项目经理"——不仅能完成任务，还能自己拆解复杂问题、规划执行步骤、在遇到困难时灵活调整策略。

**DeepAgents** 就是这样的"项目经理级"代理框架。

## DeepAgents 是什么？

DeepAgents 是 LangChain 团队推出的自主代理 SDK，专为处理复杂、多步骤任务而设计。它不仅仅是一个简单的工具调用循环，而是一个完整的"智能体编排器"（Agent Harness）。

```typescript
import { createDeepAgent } from "deepagents";
import { tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  ({ city }) => `在 ${city} 总是晴天！`,
  {
    name: "get_weather",
    description: "获取指定城市的天气",
    schema: z.object({
      city: z.string(),
    }),
  },
);

const agent = createDeepAgent({
  tools: [getWeather],
  systemPrompt: "你是一个乐于助人的助手",
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "东京的天气怎么样？" }],
});
```

这个简单的例子背后，隐藏着 DeepAgents 的五大核心能力。

## 五大核心能力

### 1. 规划与任务拆解 📋

**痛点**：传统代理遇到复杂任务时，往往"一头扎进去"，容易迷失方向或遗漏步骤。

**DeepAgents 的解决方案**：内置 `write_todos` 工具，让代理能够：
- 将复杂任务拆解为离散步骤
- 跟踪每个步骤的完成进度
- 根据新信息动态调整计划

**生活类比**：就像优秀的项目经理，接到一个大项目后，第一件事不是埋头干活，而是先列出任务清单，分配优先级，然后按部就班地推进。

```typescript
// DeepAgent 会自动使用 write_todos 工具
// 将"研究 LangGraph 并写一份报告"拆解为：
// 1. 搜索 LangGraph 的官方文档
// 2. 了解核心概念和架构
// 3. 收集实际使用案例
// 4. 整理并撰写报告
```

### 2. 上下文管理 📁

**痛点**：LLM 的上下文窗口有限，处理大量信息时容易"记不住"或"溢出"。

**DeepAgents 的解决方案**：提供文件系统工具（`ls`、`read_file`、`write_file`、`edit_file`），让代理能够：
- 将大量信息"卸载"到虚拟文件系统
- 需要时再读取特定内容
- 避免上下文窗口溢出

**生活类比**：这就像一个有笔记本的研究员——不会把所有资料都塞在脑子里，而是记在笔记本上，需要时再翻阅。

```typescript
// 代理可以这样管理大量搜索结果：
// 1. 执行搜索，获取大量结果
// 2. write_file("/research/search_results.md", results)
// 3. 继续其他任务...
// 4. 需要时：read_file("/research/search_results.md")
```

### 3. 可插拔的文件系统后端 🔌

**痛点**：不同场景需要不同的存储策略——有时需要临时存储，有时需要持久化，有时需要隔离执行。

**DeepAgents 的解决方案**：提供多种可插拔后端：

| 后端类型 | 特点 | 适用场景 |
|---------|------|---------|
| StateBackend | 临时存储，存在状态中 | 单次会话任务 |
| FilesystemBackend | 本地磁盘读写 | 本地开发、文件操作 |
| StoreBackend | 跨线程持久化 | 长期记忆、知识库 |
| CompositeBackend | 多后端路由 | 混合存储策略 |
| 沙盒后端 | 隔离执行环境 | 安全代码执行 |

**生活类比**：这就像一个智能快递柜系统——根据包裹类型（路径前缀），自动分拣到合适的储物格。

### 4. 子代理生成 👥

**痛点**：单一代理处理所有任务时，上下文容易被细节"污染"，影响主任务的判断。

**DeepAgents 的解决方案**：内置 `task` 工具，允许主代理生成专用子代理：
- 子代理有独立的上下文空间
- 完成任务后只返回结果摘要
- 主代理上下文保持干净

**生活类比**：项目总监遇到专业问题时，会找对应的专家顾问处理。顾问在自己的办公室完成工作，最后只汇报结论，不会把所有过程细节都塞给总监。

```typescript
const researchAgent = {
  name: "researcher",
  description: "专门负责信息搜索和整理",
  systemPrompt: "你是一个研究专家...",
  tools: [internetSearchTool],
};

const mainAgent = createDeepAgent({
  subagents: [researchAgent],
  systemPrompt: "你是项目经理，可以委托研究任务给 researcher"
});
```

### 5. 长期记忆 🧠

**痛点**：普通代理像"金鱼"，对话结束就忘了一切，无法积累经验。

**DeepAgents 的解决方案**：通过 LangGraph 的 Memory Store，实现跨会话的持久化记忆：
- 记住用户偏好
- 保存历史交互中学到的知识
- 在新对话中检索和应用过去的经验

**生活类比**：带记忆的代理像一位"老朋友"——记得你喜欢什么、不喜欢什么，每次见面都能延续上次的话题。

```typescript
import { CompositeBackend, StateBackend, StoreBackend } from "deepagents/backends";

const agent = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),
    { "/memories/": new StoreBackend(rt) }
  ),
  systemPrompt: `你有长期记忆能力。
    保存重要信息：write_file("/memories/user_preferences.md", content)
    检索记忆：read_file("/memories/user_preferences.md")`
});
```

## DeepAgents vs 传统 Agent

| 特性 | 传统 Agent | DeepAgents |
|------|-----------|------------|
| 任务处理 | 单步执行 | 自动规划与拆解 |
| 上下文管理 | 依赖窗口大小 | 文件系统卸载 |
| 存储策略 | 固定 | 可插拔后端 |
| 复杂任务 | 单代理处理 | 子代理委托 |
| 记忆能力 | 仅当前会话 | 跨会话持久化 |
| 代码执行 | 通常不支持 | 沙盒安全执行 |

## 何时使用 DeepAgents？

✅ **适合使用 DeepAgents SDK 的场景**：
- 复杂、多步骤任务（需要规划与拆解）
- 需要管理大量上下文
- 需要灵活切换存储后端
- 需要委派任务给专门的子代理
- 需要跨对话持久化记忆

✅ **适合使用 DeepAgents CLI 的场景**：
- 在命令行中交互式编码
- 希望代理学习你的偏好和项目约定
- 需要在本地或沙盒中执行代码

❌ **不太需要 DeepAgents 的场景**：
- 简单的问答任务
- 单步工具调用
- 对延迟敏感的实时应用

对于简单场景，可以考虑使用 LangChain 的 `createAgent` 或直接构建 LangGraph 工作流。

## DeepAgents 生态定位

```
┌─────────────────────────────────────────────────────────────┐
│                     DeepAgents                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Deep Agents SDK        Deep Agents CLI             │   │
│  │  (构建自主代理)          (终端编码助手)              │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ▲                                 │
│                           │ 构建于                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              LangGraph (运行时 & 持久化)             │   │
│  └─────────────────────────────────────────────────────┘   │
│                           ▲                                 │
│                           │ 基于                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              LangChain (核心构建模块)                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- **LangChain**：提供模型调用、工具定义、Prompt 模板等基础能力
- **LangGraph**：提供状态管理、检查点、持久化等运行时能力
- **DeepAgents**：在此基础上提供开箱即用的自主代理能力

## 小结

DeepAgents 代表了 AI Agent 开发的一个重要进化方向——从"指令执行"走向"自主规划"。它的五大核心能力（规划、上下文管理、可插拔后端、子代理、长期记忆）共同构成了一个强大的"智能体编排器"，让开发者能够轻松构建处理复杂任务的自主代理。

在下一篇文章中，我们将动手创建第一个 DeepAgent，亲身体验这些能力。

## 实践任务

1. 思考一个你日常工作中的复杂任务，尝试将其拆解为 DeepAgent 的五大能力如何协作解决
2. 对比你之前使用过的 AI 工具（如 ChatGPT、GitHub Copilot），思考它们与 DeepAgents 的差异

## 参考资源

- [DeepAgents 官方文档](https://docs.langchain.com/oss/javascript/deepagents/)
- [DeepAgents NPM 包](https://www.npmjs.com/package/deepagents)
- [LangGraph 文档](https://docs.langchain.com/oss/javascript/langgraph/)
