# LangChain 系列教程内容规划

> 基于 LangChain 官方文档整理的教程大纲，涵盖 LangChain 核心概念与高级功能

---

## 📘 一、基础入门篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **1. LangChain 概述** | 介绍 LangChain 是什么、核心价值、与 LangGraph/Deep Agents 的关系 | `1-overview.md` |
| **2. 环境安装与配置** | 安装指南、API Key 配置、模型提供商选择 | `2-install.md` |
| **3. 快速开始** | 10 行代码创建第一个 Agent、天气查询示例 | `3-Quickstart.md` |

---

## 📗 二、核心概念篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **4. Agent（智能代理）** | Agent 架构、ReAct 模式、核心组件（Model、Tools、System Prompt）、调用方式 | `4-Agents.md` |
| **5. Models（模型）** | 模型初始化、参数配置、invoke/stream/batch 调用、多模态、推理能力 | `5-Models.md` |
| **6. Messages（消息）** | 消息类型（Human/AI/System/Tool）、消息格式、多模态内容 | `6-Messages.md` |
| **7. Tools（工具）** | 工具定义、Schema 验证、Context 访问、ToolNode、Server-side 工具 | `7-Tools.md` |

---

## 📙 三、记忆系统篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **8. 短期记忆（Short-term Memory）** | Checkpointer、会话持久化、消息裁剪/删除/摘要 | `8-Short-term-memory.md` |
| **9. 长期记忆（Long-term Memory）** | Store 存储、跨会话记忆、在工具中读写长期记忆 | `27-Long-term-memory.md` |

---

## 📕 四、流式处理篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **10. 流式处理概述** | 流式模式（updates/messages/custom）、Agent 进度流、Token 流 | `9-Streaming-Overview.md` |
| **11. 前端流式集成** | React useStream、实时 UI 更新 | `10-Streaming-Frontend.md` |

---

## 📓 五、高级功能篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **12. 结构化输出** | Zod Schema 定义、responseFormat、嵌套结构 | `11-Structured-output.md` |
| **13. Middleware 中间件** | 中间件概述、beforeModel/afterModel 钩子、wrapToolCall | `12-Middleware-Overview.md` |
| **14. 预置中间件** | 摘要、重试、模型回退、PII 检测、限流等 | `13-Prebuilt-middleware.md` |
| **15. 自定义中间件** | 创建自定义中间件、动态 Prompt、动态工具选择 | `14-Custom-middleware.md` |
| **16. Guardrails（安全护栏）** | 内容过滤、安全检查 | `15-Guardrails.md` |
| **17. Runtime（运行时）** | Runtime Context、状态管理 | `16-Runtime.md` |

---

## 📒 六、上下文工程篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **18. Context Engineering** | 上下文管理策略、Prompt 优化 | `17-Context-engineering-in-agents.md` |
| **19. MCP 集成** | Model Context Protocol、工具服务器 | `18-mcp.md` |
| **20. Human-in-the-Loop** | 人机协作、Interrupt、审批流程 | `19-Human-in-the-loop.md` |

---

## 📔 七、多代理系统篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **21. 多代理概述** | 多代理设计模式、性能对比、模式选择 | `20-Multi-agent-Overview.md` |
| **22. Subagents 模式** | 主代理协调子代理、并行执行 | `21-Multi-agent-Subagents.md` |
| **23. Handoffs 模式** | 代理间控制权转移 | `22-Multi-agent-Handoffs.md` |
| **24. Skills 模式** | 按需加载专业知识 | `23-Multi-agent-Skills.md` |
| **25. Router 模式** | 路由分发、结果聚合 | `24-Multi-agent-Router.md` |
| **26. Custom Workflow** | LangGraph 自定义工作流 | `25-Multi-agent-Custom-workflow.md` |

---

## 📖 八、RAG 与知识库篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **27. Retrieval（检索）** | RAG 架构、2-Step RAG、Agentic RAG、Hybrid RAG | `26-Retrieval.md` |

---

## 📚 九、工具与部署篇

| 章节 | 内容说明 | 对应官方文档 |
|------|----------|-------------|
| **28. LangSmith Studio** | 调试、追踪、可视化 | `28-LangSmith-Studio.md` |
| **29. Agent Chat UI** | 聊天界面搭建 | `29-AgentChatUI.md` |
| **30. 测试** | Agent 测试策略 | `30-Test.md` |

---

## 💡 写作建议

### 写作风格：三合一融合法

每篇文章建议**同时包含**以下三种风格，形成完整的教学体验：

| 风格 | 作用 | 文章位置 |
|------|------|----------|
| 🎯 **问题驱动** | 告诉读者"为什么要学这个"，解决了什么痛点 | 文章开头 |
| 🎭 **类比教学** | 用生活化比喻让抽象概念具象化 | 概念讲解时 |
| 💻 **大白话 + 代码** | 每段代码都有"人话解读"，降低理解门槛 | 代码示例处 |

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
（用管家/工具箱/公司组织等比喻解释概念）

## 核心组件详解
### 1. 组件A
（是什么 + 代码示例 + 人话解读）

### 2. 组件B
...

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
const agent = createAgent({
  model: "gpt-4",           // 推理引擎：负责思考和决策
  tools: [weatherTool],     // 工具箱：Agent 能用的技能
  checkpointer,             // 记事本：让 Agent 有记忆
});
// 💡 人话解读：创建一个会查天气、有记忆的 AI 管家

// ❌ 避免的注释：只描述"是什么"
const agent = createAgent({
  model: "gpt-4",           // 模型
  tools: [weatherTool],     // 工具
  checkpointer,             // checkpointer
});
```

### 视觉元素使用指南

**Emoji 标记统一规范：**
- 💡 人话解读 / 提示
- ⚠️ 注意 / 警告
- ✅ 正确做法
- ❌ 错误做法
- 🔥 重点 / 核心
- 📝 示例 / 补充说明

**善用 ASCII 流程图：**
```
┌─────────┐
│  Input  │
└────┬────┘
     ▼
┌─────────┐
│  Model  │ ◄── 思考
└────┬────┘
     ▼
┌─────────┐
│  Tools  │ ◄── 行动
└────┬────┘
     ▼
┌─────────┐
│ Output  │
└─────────┘
```

### 教学原则

1. **循序渐进**：从基础概念开始，逐步深入高级功能
2. **代码优先**：每个章节都配套可运行的代码示例
3. **对比讲解**：不同模式/方案的优缺点对比
4. **避坑指南**：常见错误和最佳实践
5. **参考 interpretation**：写作时参考 `interpretation/` 文件夹下对应文章的风格

### 推荐实战项目

可以设计几个贯穿全书的实战项目：

| 项目 | 涉及知识点 | 难度 |
|------|-----------|------|
| **客服机器人** | 单 Agent + 工具 + 短期记忆 | ⭐⭐ |
| **知识问答系统** | RAG + 向量检索 + 长期记忆 | ⭐⭐⭐ |
| **智能助手** | 多 Agent 协作 + Handoffs | ⭐⭐⭐⭐ |
| **代码助手** | MCP 集成 + Skills 模式 | ⭐⭐⭐⭐⭐ |

---

## 🎯 核心重点内容

根据官方文档，以下是教程应该**重点讲解**的内容：

### 必须掌握

| 内容 | 重要性 | 说明 |
|------|--------|------|
| **`createAgent()` API** | ⭐⭐⭐⭐⭐ | LangChain 的核心 API |
| **Tool 定义与使用** | ⭐⭐⭐⭐⭐ | 工具是扩展 Agent 能力的关键 |
| **Memory 系统** | ⭐⭐⭐⭐⭐ | 短期/长期记忆的实现 |
| **流式处理** | ⭐⭐⭐⭐ | 提升用户体验的关键 |

### 进阶掌握

| 内容 | 重要性 | 说明 |
|------|--------|------|
| **Middleware 机制** | ⭐⭐⭐⭐ | 控制 Agent 行为的重要手段 |
| **多代理模式** | ⭐⭐⭐⭐ | Subagents/Handoffs/Skills/Router 四种模式的选择 |
| **RAG 架构** | ⭐⭐⭐⭐ | 知识增强的核心技术 |
| **结构化输出** | ⭐⭐⭐ | 确保输出格式可控 |

---

## 📂 文档结构说明

```
LangChainDocs/
├── en/                    # 英文原版文档
│   ├── 1-overview.md
│   ├── 2-install.md
│   ├── ...
│   └── 30-Test.md
├── zh/                    # 中文翻译版本
│   ├── 1-overview.md
│   ├── 2-install.md
│   ├── ...
│   └── 30-Test.md
├── interpretation/        # 深度解读版本（写作参考素材）
│   ├── 4-Agents.md
│   ├── 5-Models.md
│   ├── ...
│   └── 30-Test.md
├── article/               # 📚 LangChain 系列教程文章（最终输出）
│   ├── 01-overview.md
│   ├── 02-install.md
│   ├── 03-quickstart.md
│   ├── 04-agents.md
│   ├── ...
│   └── 30-test.md
└── LangChain-Tutorial-Outline.md  # 本文件（教程大纲）
```

### 文件夹职责说明

| 文件夹 | 职责 | 说明 |
|--------|------|------|
| `en/` | 原版文档 | LangChain 官方英文文档 |
| `zh/` | 中文翻译 | 官方文档的中文翻译版本 |
| `interpretation/` | 深度解读 | 写作参考素材，包含通俗解释和代码注解 |
| `article/` | **教程文章** | 🔥 最终输出的系列教程，融合三种写作风格 |

---

## 🔗 相关资源

- [LangChain 官方文档](https://docs.langchain.com)
- [LangChain JavaScript API Reference](https://reference.langchain.com/javascript)
- [LangGraph 文档](https://langchain-ai.github.io/langgraph/)
- [LangSmith 平台](https://smith.langchain.com)

---

> 📅 最后更新：2026-02-21
