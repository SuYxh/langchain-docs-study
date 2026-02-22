# LangGraph 系列教程内容规划

> 基于 LangGraph 官方文档整理的教程大纲，专注于图结构工作流编排与持久化执行

---

## 📘 一、基础入门篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **1. LangGraph 概述** | 介绍 LangGraph 是什么、核心优势（持久执行、人机协作、完整记忆）、与 LangChain 的关系 | `01-LangGraph overview.md` |
| **2. 环境安装与配置** | 安装指南、TypeScript/JavaScript 环境配置、基础依赖 | `02-Install LangGraph.md` |
| **3. 快速开始** | 10 分钟创建第一个 Graph、聊天机器人示例 | `03-Quickstart.md` |
| **4. 本地服务运行** | 启动本地 LangGraph 服务、API 调用方式 | `04-Run a local server.md` |

---

## 📗 二、核心概念篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **5. LangGraph 思维模式** | 5 步构建 Agent（映射工作流、识别节点、设计状态、构建节点、连接边）、错误处理策略 | `05-Thinking in LangGraph.md` |
| **6. Graph API 详解** | StateGraph 核心 API、节点(Nodes)、边(Edges)、状态(State)、Reducers、入口/出口点 | `06-graph-api.md` (基于多文档整合) |
| **7. Functional API** | task/entrypoint 函数式写法、与 Graph API 对比 | `07-functional-api.md` (基于多文档整合) |

---

## 📙 三、工作流模式篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **8. 工作流与 Agent** | Workflow vs Agent 区别、6 种核心模式（Prompt Chaining、并行化、路由、编排者-工作者、评估者-优化者、Agent）详解 | `06-Workflows and agents.md` |

> 💡 本篇将 6 种工作流模式合并为一篇综合文章，便于对比学习和查阅

---

## 📕 四、持久化与记忆篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **9. 持久化机制** | Checkpointer、Threads、Checkpoints、getState/updateState API | `07-Persistence.md` |
| **10. 持久执行** | Durable Execution 原理、确定性与重放、task 包装、持久化模式 | `08-Durable execution.md` |
| **11. 记忆系统** | 短期记忆（对话记忆）、长期记忆（跨会话）、消息管理策略、语义搜索 | `12-Memory.md` |
| **12. 时间旅行** | 状态回溯、检查点历史、状态修改与重放、分叉执行 | `11-Use time-travel.md` |

---

## 📓 五、流式处理篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **13. 流式处理详解** | 5 种流模式（values/updates/custom/messages/debug）、子图流式、LLM Token 流、自定义流数据 | `09-Streaming.md` |

> 💡 本篇将流式处理相关内容合并为一篇综合文章

---

## 📒 六、人机协作篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **14. 中断机制** | interrupt() 函数、Command({ resume })、中断规则、审批工作流、审查与编辑、多轮输入 | `10-Interrupts.md` |

> 💡 本篇将人机协作相关内容合并为一篇综合文章

---

## 📔 七、高级架构篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **15. 子图构建** | 子图嵌套、状态共享与隔离、父子通信 | `13-Subgraphs.md` |
| **16. 应用结构** | 项目组织、代码分层、最佳实践 | `14-Application structure.md` |

---

## 📖 八、开发工具篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **17. LangSmith Studio** | 可视化调试、图执行追踪 | `15-LangSmith Studio.md` |
| **18. LangSmith 部署** | 生产环境部署、云端托管 | `16-LangSmith Deployment.md` |
| **19. LangSmith 可观测性** | 监控、日志、性能分析 | `17-LangSmith Observability.md` |

---

## 🎯 九、项目实战篇

综合运用前面所学知识，从零构建完整的 AI 应用项目。

| 章节 | 内容说明 | 涉及知识点 | 难度 |
|------|----------|-----------|------|
| **20. 多轮对话助手** | 带记忆的聊天机器人：对话持久化、上下文管理、消息摘要 | Graph API + Checkpointer + 短期记忆 | ⭐⭐ |
| **21. 智能审批系统** | 多级审批流程：条件路由、人工审批、状态回退、审批日志 | 路由模式 + HITL + 时间旅行 | ⭐⭐⭐ |
| **22. 并行数据处理器** | 多源数据聚合：并行采集、结果合并、错误重试、进度流式 | 并行化模式 + Durable Execution + 流式 | ⭐⭐⭐ |
| **23. 文档摘要工作流** | 长文档处理：分块处理、并行摘要、层级汇总、质量评估 | 编排者-工作者 + 评估者-优化者 + 子图 | ⭐⭐⭐⭐ |
| **24. 自主研究 Agent** | 自主决策 Agent：工具调用循环、多轮推理、人机协作 | Agent 模式 + ToolNode + HITL + 长期记忆 | ⭐⭐⭐⭐⭐ |
| **25. 多 Agent 协作系统** | 复杂多 Agent：角色分工、任务分发、结果聚合、状态同步 | 子图 + Send API + 长期记忆 + 流式 | ⭐⭐⭐⭐⭐ |

### 项目架构预览

#### 20. 多轮对话助手架构

```
用户消息 → StateGraph
              │
              ├→ 加载历史消息（Checkpointer）
              │
              ├→ 消息过长检测
              │   ├→ 是 → 摘要节点（压缩历史）
              │   └→ 否 → 直接处理
              │
              ├→ 调用 LLM 生成回复
              │
              └→ 保存状态 → 返回响应
```

#### 21. 智能审批系统架构

```
审批请求 → 路由节点
              │
              ├→ 金额 < 1000 → 自动审批 → 完成
              │
              ├→ 金额 1000-10000 → 主管审批（HITL）
              │                      ├→ 通过 → 完成
              │                      └→ 拒绝 → 通知申请人
              │
              └→ 金额 > 10000 → 多级审批
                                 ├→ 主管审批 → 财务审批 → 完成
                                 └→ 任一拒绝 → 回退/终止
```

#### 22. 并行数据处理器架构

```
数据源列表 → Fan-out 节点
                │
                ├→ [并行] 数据源1采集（task 包装）
                ├→ [并行] 数据源2采集（task 包装）
                ├→ [并行] 数据源3采集（task 包装）
                │
                └→ Fan-in 聚合节点
                      │
                      ├→ 结果合并
                      ├→ 错误处理（重试/跳过）
                      └→ 流式输出进度
```

#### 23. 文档摘要工作流架构

```
长文档 → 编排者节点
           │
           ├→ 文档分块
           │
           ├→ [Send API 动态生成] 摘要工作节点
           │   ├→ Worker 1: 摘要 Chunk 1
           │   ├→ Worker 2: 摘要 Chunk 2
           │   └→ Worker N: 摘要 Chunk N
           │
           ├→ 汇总节点（合并摘要）
           │
           └→ 评估节点
               ├→ 质量通过 → 输出最终摘要
               └→ 质量不足 → 反馈优化（循环）
```

#### 24. 自主研究 Agent 架构

```
研究问题 → Research Agent
              │
              ├→ LLM 推理（选择行动）
              │
              ├→ 工具调用循环
              │   ├→ 搜索工具
              │   ├→ 阅读工具
              │   └→ 笔记工具
              │
              ├→ shouldContinue 判断
              │   ├→ 需要更多信息 → 继续调用工具
              │   ├→ 需要用户确认 → interrupt()
              │   └→ 研究完成 → 输出结论
              │
              └→ 长期记忆存储（跨会话复用）
```

#### 25. 多 Agent 协作系统架构

```
复杂任务 → 协调者 Agent（父图）
              │
              ├→ 任务分解
              │
              ├→ 子图分发（Send API）
              │   ├→ [子图] 研究 Agent
              │   ├→ [子图] 分析 Agent
              │   └→ [子图] 写作 Agent
              │
              ├→ 状态同步（共享 Memory Store）
              │
              ├→ 结果汇总
              │
              └→ 人工审核（HITL）→ 最终输出
```

---

## 💡 写作建议

### 写作风格：三合一融合法

每篇文章建议**同时包含**以下三种风格，形成完整的教学体验：

| 风格 | 作用 | 文章位置 |
|------|------|----------|
| 🎯 **问题驱动** | 告诉读者"为什么要学这个"，解决了什么痛点 | 文章开头 |
| 🎭 **类比教学** | 用生活化比喻让抽象概念具象化 | 概念讲解时 |
| 💻 **大白话 + 代码** | 每段代码都有"人话解读"，降低理解门槛 | 代码示例处 |

### LangGraph 特色类比建议

| 概念 | 推荐类比 |
|------|----------|
| **StateGraph** | 流程图/地图导航 - 定义从哪里到哪里，怎么走 |
| **Node（节点）** | 流水线上的工位 - 每个工位做一件具体的事 |
| **Edge（边）** | 传送带 - 把上一工位的成果传到下一工位 |
| **State（状态）** | 流水线上的托盘 - 承载当前的所有物品 |
| **Reducer** | 托盘管理员 - 决定新物品是替换还是追加 |
| **Checkpointer** | 游戏存档点 - 随时存档，随时读档 |
| **interrupt()** | 暂停按钮 - 等人来确认再继续 |
| **Thread** | 独立存档槽 - 每个用户有自己的游戏进度 |
| **Subgraph** | 外包团队 - 把复杂任务交给专业团队处理 |

### 推荐文章结构模板

```markdown
# 章节标题

## 简单来说
（一句话总结这节的核心内容，让读者快速了解）

## 🎯 本节目标
（用问句形式列出学完能回答的问题，激发好奇心）

## 核心痛点与解决方案
### 痛点：没有 XXX 之前，我们有多惨？
（表格列举问题场景）

### 解决：XXX 怎么救你的？
（代码对比 + 效果演示）

## 生活化类比
（用流水线/地图/游戏等比喻解释概念）

## 核心组件详解
### 1. 组件A（Graph API 写法）
（代码示例 + 人话解读）

### 2. 组件A（Functional API 写法）
（对比讲解两种 API 风格）

## 业务场景
（完整的业务场景代码 + 执行过程演示）

## 总结对比表
（表格形式总结关键概念）

## 核心要点回顾
（3-5 条要点）

## 下一步学习
（引导到相关章节）
```

### 代码注释规范

```typescript
// ✅ 好的注释：解释"为什么"和"人话解读"
const graph = new StateGraph(State)
  .addNode("chat", chatNode)      // 聊天节点：接收消息并调用 LLM
  .addEdge(START, "chat")         // 入口边：从起点进入聊天节点
  .addEdge("chat", END);          // 出口边：聊天完成后结束

const checkpointer = new MemorySaver();  // 存档器：让对话有记忆
const app = graph.compile({ checkpointer });
// 💡 人话解读：创建一个"有记忆的流水线"，每次对话都能接上之前的内容

// ❌ 避免的注释：只描述"是什么"
const graph = new StateGraph(State)
  .addNode("chat", chatNode)      // 添加节点
  .addEdge(START, "chat")         // 添加边
  .addEdge("chat", END);          // 添加边
```

### 视觉元素使用指南

**Emoji 标记统一规范：**
- 💡 人话解读 / 提示
- ⚠️ 注意 / 警告
- ✅ 正确做法
- ❌ 错误做法
- 🔥 重点 / 核心
- 📝 示例 / 补充说明
- 🎮 类比（游戏相关）
- 🏭 类比（工厂/流水线相关）

**善用 ASCII 流程图（LangGraph 核心）：**
```
┌─────────┐
│  START  │
└────┬────┘
     │
     ▼
┌─────────┐    条件边
│  Node1  │───────────┐
└────┬────┘           │
     │                ▼
     ▼          ┌─────────┐
┌─────────┐    │  Node3  │
│  Node2  │    └────┬────┘
└────┬────┘         │
     │              │
     ▼              ▼
┌─────────────────────┐
│         END         │
└─────────────────────┘
```

### 教学原则

1. **循序渐进**：从简单 Graph 开始，逐步引入复杂模式
2. **Graph API + Functional API 双讲**：每个模式都展示两种写法
3. **状态设计重点**：LangGraph 的核心是状态管理，要重点讲
4. **对比讲解**：不同工作流模式的适用场景对比
5. **避坑指南**：常见错误（如 interrupt 规则、reducer 使用）
6. **参考 interpretation**：写作时参考 `interpretation/` 文件夹下对应文章的风格

---

## 🎯 核心重点内容

根据官方文档，以下是教程应该**重点讲解**的内容：

### 必须掌握

| 内容 | 重要性 | 说明 |
|------|--------|------|
| **StateGraph API** | ⭐⭐⭐⭐⭐ | LangGraph 的核心 API，必须熟练 |
| **状态设计（State + Reducer）** | ⭐⭐⭐⭐⭐ | 决定了整个图的数据流动方式 |
| **Checkpointer 持久化** | ⭐⭐⭐⭐⭐ | 实现记忆和持久执行的关键 |
| **工作流模式（6 种）** | ⭐⭐⭐⭐⭐ | 解决不同业务场景的核心模式 |

### 进阶掌握

| 内容 | 重要性 | 说明 |
|------|--------|------|
| **interrupt() 中断机制** | ⭐⭐⭐⭐ | 人机协作的核心能力 |
| **流式处理（5 种模式）** | ⭐⭐⭐⭐ | 提升用户体验的关键 |
| **子图构建** | ⭐⭐⭐⭐ | 复杂应用的模块化设计 |
| **Durable Execution** | ⭐⭐⭐ | 生产环境的可靠性保障 |
| **Memory Store** | ⭐⭐⭐ | 跨会话长期记忆实现 |

---

## 📂 文档结构说明

```
LangGraphDocs/
├── en/                    # 英文原版文档
│   ├── 01-LangGraph overview.md
│   ├── 02-Install LangGraph.md
│   ├── 03-Quickstart.md
│   ├── ...
│   └── 17-LangSmith Observability.md
├── zh/                    # 中文翻译版本
│   ├── 01-LangGraph overview.md
│   ├── 02-Install LangGraph.md
│   ├── ...
│   └── 17-LangSmith Observability.md
├── interpretation/        # 深度解读版本（写作参考素材）
│   ├── 01-LangGraph overview.md
│   ├── 02-Install LangGraph.md
│   ├── ...
│   └── 17-LangSmith Observability.md
├── article/               # 📚 LangGraph 系列教程文章（最终输出）
│   ├── 01-overview.md
│   ├── 02-install.md
│   ├── 03-quickstart.md
│   ├── ...
│   ├── 19-langsmith-observability.md
│   ├── 20-project-chat-assistant.md
│   ├── 21-project-approval-system.md
│   ├── 22-project-parallel-processor.md
│   ├── 23-project-doc-summarizer.md
│   ├── 24-project-research-agent.md
│   └── 25-project-multi-agent.md
└── LangGraph-Tutorial-Outline.md  # 本文件（教程大纲）
```

### 文件夹职责说明

| 文件夹 | 职责 | 说明 |
|--------|------|------|
| `en/` | 原版文档 | LangGraph 官方英文文档 |
| `zh/` | 中文翻译 | 官方文档的中文翻译版本 |
| `interpretation/` | 深度解读 | 写作参考素材，包含通俗解释和代码注解 |
| `article/` | **教程文章** | 🔥 最终输出的系列教程，融合三种写作风格 |

---

## 🔗 相关资源

- [LangGraph 官方文档](https://langchain-ai.github.io/langgraph/)
- [LangGraph JavaScript Reference](https://reference.langchain.com/javascript)
- [LangChain 文档](https://docs.langchain.com)
- [LangSmith 平台](https://smith.langchain.com)

---

## 📊 LangChain vs LangGraph 定位对比

| 维度 | LangChain | LangGraph |
|------|-----------|-----------|
| **核心定位** | 高层 Agent 抽象 | 底层工作流编排 |
| **API 风格** | `createAgent()` 一行创建 | `StateGraph` 精细控制 |
| **适用场景** | 快速构建标准 Agent | 自定义复杂工作流 |
| **控制粒度** | 粗粒度（预设模式） | 细粒度（节点级控制） |
| **学习曲线** | 较低 | 较高 |
| **灵活性** | 中等 | 极高 |
| **推荐使用** | 标准场景快速开发 | 复杂场景精细控制 |

> 💡 **建议学习路径**：先学 LangChain 了解 Agent 概念，再学 LangGraph 掌握底层编排

---

> 📅 最后更新：2026-02-22
