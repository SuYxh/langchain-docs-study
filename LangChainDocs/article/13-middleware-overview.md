# 13. 中间件概述：在 Agent 执行的每一步插入你的逻辑

## 简单来说

中间件（Middleware）让你能在 Agent 执行的关键节点插入自定义逻辑——就像高速公路上的收费站，每辆车（每次调用）经过时都会被检查、记录或修改。

## 本节目标

学完本节，你将能够：
- 理解 Agent 执行循环和中间件的作用点
- 掌握中间件的两种 Hook 风格：节点式和包装式
- 了解 LangChain 提供的预置中间件
- 为后续学习自定义中间件打下基础

## 业务场景

想象这些真实需求：

1. **日志追踪**：记录每次模型调用的输入输出，用于调试和审计
2. **成本控制**：限制单次会话的 API 调用次数，防止失控
3. **安全防护**：在用户输入到达模型前检测敏感信息
4. **智能重试**：当外部 API 调用失败时自动重试

这些需求都需要在 Agent 执行过程中"插一脚"——中间件正是为此而生。

---

## 一、Agent 执行循环

### 1.1 核心循环

Agent 的核心执行循环很简单：

```
用户输入 → 调用模型 → 模型决定调用工具 → 执行工具 → 返回结果给模型 → 模型继续或结束
```

```
┌─────────────────────────────────────────┐
│               Agent Loop                │
│                                         │
│   ┌─────────┐    ┌─────────┐           │
│   │  Model  │───▶│  Tools  │           │
│   │  Call   │◀───│Execute  │           │
│   └─────────┘    └─────────┘           │
│        │              │                 │
│        └──────────────┘                 │
│         (循环直到完成)                   │
└─────────────────────────────────────────┘
```

### 1.2 中间件的作用点

中间件在循环的关键位置暴露钩子（Hooks）：

```
                    beforeAgent
                        │
                        ▼
              ┌─────────────────┐
              │  Agent 开始执行  │
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              ▼              │
        │        beforeModel          │
        │              │              │
        │        wrapModelCall        │
        │              │              │
        │         ▼▼▼▼▼▼▼▼           │
        │      ┌──────────┐          │
        │      │  Model   │          │
        │      └──────────┘          │
        │         ▼▼▼▼▼▼▼▼           │
        │              │              │
        │         afterModel          │
        │              │              │
        │        wrapToolCall         │
        │              │              │
        │         ▼▼▼▼▼▼▼▼           │
        │      ┌──────────┐          │
        │      │  Tools   │          │
        │      └──────────┘          │
        │              │              │
        └──────────────┼──────────────┘
                       │ (循环)
              ┌────────┴────────┐
              │  Agent 执行完成  │
              └────────┬────────┘
                       │
                  afterAgent
                       │
                       ▼
                   返回结果
```

---

## 二、中间件基础用法

### 2.1 添加中间件

通过 `createAgent` 的 `middleware` 参数添加中间件：

```typescript
import {
  createAgent,
  summarizationMiddleware,
  humanInTheLoopMiddleware,
} from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool, calculatorTool],
  middleware: [
    summarizationMiddleware({ model: "gpt-4o-mini", trigger: { tokens: 4000 } }),
    humanInTheLoopMiddleware({ interruptOn: { dangerousTool: true } }),
  ],
});
```

### 2.2 中间件执行顺序

当有多个中间件时，执行顺序如下：

```typescript
const agent = createAgent({
  model: "gpt-4o",
  middleware: [middleware1, middleware2, middleware3],
  tools: [...],
});
```

**执行流程**：

1. **Before 钩子**：按顺序执行
   - `middleware1.beforeAgent()`
   - `middleware2.beforeAgent()`
   - `middleware3.beforeAgent()`

2. **Wrap 钩子**：嵌套执行（像洋葱一样）
   - `middleware1.wrapModelCall()` → `middleware2.wrapModelCall()` → `middleware3.wrapModelCall()` → 模型

3. **After 钩子**：逆序执行
   - `middleware3.afterModel()`
   - `middleware2.afterModel()`
   - `middleware1.afterModel()`

**类比理解**：想象三道安检门，进去时按 1→2→3 顺序过，出来时按 3→2→1 顺序过。Wrap 钩子则像俄罗斯套娃，最外层的中间件包裹着里面的。

---

## 三、两种 Hook 风格

### 3.1 节点式 Hook（Node-style）

在特定执行点**顺序**运行，适合日志记录、验证和状态更新：

| Hook | 触发时机 |
|------|----------|
| `beforeAgent` | Agent 开始执行前（每次调用一次） |
| `beforeModel` | 每次模型调用前 |
| `afterModel` | 每次模型响应后 |
| `afterAgent` | Agent 执行完成后（每次调用一次） |

```typescript
import { createMiddleware, AIMessage } from "langchain";

const loggingMiddleware = createMiddleware({
  name: "LoggingMiddleware",
  beforeModel: (state) => {
    console.log(`即将调用模型，当前消息数: ${state.messages.length}`);
    return;
  },
  afterModel: (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    console.log(`模型返回: ${lastMessage.content}`);
    return;
  },
});
```

### 3.2 包装式 Hook（Wrap-style）

**包裹**模型或工具调用，你决定是否执行、执行几次：

| Hook | 作用 |
|------|------|
| `wrapModelCall` | 包裹每次模型调用 |
| `wrapToolCall` | 包裹每次工具调用 |

```typescript
import { createMiddleware } from "langchain";

const retryMiddleware = createMiddleware({
  name: "RetryMiddleware",
  wrapModelCall: (request, handler) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return handler(request);
      } catch (e) {
        if (attempt === 2) throw e;
        console.log(`重试 ${attempt + 1}/3`);
      }
    }
    throw new Error("不可达");
  },
});
```

**包装式 Hook 的超能力**：
- **零次调用**：短路返回，跳过实际执行
- **一次调用**：正常执行
- **多次调用**：实现重试逻辑

---

## 四、预置中间件速览

LangChain 提供了丰富的开箱即用中间件：

### 4.1 通用中间件

| 中间件 | 功能 | 使用场景 |
|--------|------|----------|
| `summarizationMiddleware` | 自动摘要长对话 | 长对话超出上下文窗口 |
| `humanInTheLoopMiddleware` | 人工审批工具调用 | 高风险操作需人工确认 |
| `modelCallLimitMiddleware` | 限制模型调用次数 | 防止无限循环、控制成本 |
| `toolCallLimitMiddleware` | 限制工具调用次数 | 限制 API 调用频率 |
| `modelFallbackMiddleware` | 模型故障自动降级 | 提高系统可用性 |
| `piiMiddleware` | 检测隐私信息 | 合规要求、日志脱敏 |
| `todoListMiddleware` | 任务规划与追踪 | 复杂多步骤任务 |
| `llmToolSelectorMiddleware` | 智能筛选相关工具 | 工具数量多时提高准确性 |
| `toolRetryMiddleware` | 工具调用失败重试 | 处理临时网络故障 |
| `modelRetryMiddleware` | 模型调用失败重试 | 处理 API 限流 |
| `toolEmulatorMiddleware` | 用 LLM 模拟工具执行 | 开发测试阶段 |
| `contextEditingMiddleware` | 清理旧工具输出 | 长对话上下文管理 |

### 4.2 快速示例

```typescript
import {
  createAgent,
  summarizationMiddleware,
  modelCallLimitMiddleware,
  piiMiddleware,
} from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool],
  middleware: [
    summarizationMiddleware({
      model: "gpt-4o-mini",
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
    modelCallLimitMiddleware({
      threadLimit: 10,
      runLimit: 5,
      exitBehavior: "end",
    }),
    piiMiddleware("email", { strategy: "redact", applyToInput: true }),
  ],
});
```

---

## 五、中间件能做什么

### 5.1 日志与监控

```typescript
const analyticsMiddleware = createMiddleware({
  name: "AnalyticsMiddleware",
  beforeAgent: (state) => {
    console.log(`[开始] 会话开始，用户消息: ${state.messages[0]?.content}`);
    return;
  },
  afterAgent: (state) => {
    console.log(`[结束] 会话结束，总消息数: ${state.messages.length}`);
    return;
  },
  wrapModelCall: (request, handler) => {
    const start = Date.now();
    const result = handler(request);
    console.log(`[模型] 调用耗时: ${Date.now() - start}ms`);
    return result;
  },
});
```

### 5.2 转换与过滤

```typescript
const promptEnhanceMiddleware = createMiddleware({
  name: "PromptEnhanceMiddleware",
  beforeModel: (state) => {
    return {
      messages: [
        ...state.messages,
        { role: "system", content: "请用简洁专业的语言回复。" }
      ]
    };
  },
});
```

### 5.3 流程控制

```typescript
const rateLimitMiddleware = createMiddleware({
  name: "RateLimitMiddleware",
  beforeModel: {
    canJumpTo: ["end"],
    hook: (state) => {
      if (state.messages.length > 50) {
        return {
          messages: [new AIMessage("对话已达上限，请开始新会话。")],
          jumpTo: "end",
        };
      }
      return;
    }
  },
});
```

---

## 六、中间件 vs 其他方案

| 方案 | 适用场景 | 优势 | 劣势 |
|------|----------|------|------|
| **中间件** | Agent 执行过程中的横切关注点 | 解耦、可复用、可组合 | 学习曲线 |
| **直接修改代码** | 简单一次性逻辑 | 直接、快速 | 难以复用、代码耦合 |
| **外部包装器** | Agent 调用前后的处理 | 简单 | 无法介入内部执行 |

**选择中间件的信号**：
- 需要在多个 Agent 间复用相同逻辑
- 需要介入模型或工具调用的内部过程
- 需要条件性地短路或重试执行

---

## 常见问题

### Q1: 中间件和 LangGraph 的节点有什么区别？

中间件是"横切关注点"，在现有执行流程中插入逻辑；LangGraph 节点是"核心业务逻辑"，定义执行流程本身。

### Q2: 中间件执行失败会怎样？

默认情况下，中间件错误会导致整个 Agent 调用失败。建议在中间件内部进行错误处理，避免影响主流程。

### Q3: 可以动态添加/移除中间件吗？

中间件在 `createAgent` 时固定。如果需要动态行为，可以在中间件内部使用条件判断，或创建多个 Agent 配置。

---

## 总结

中间件是 Agent 执行过程中的"拦截器"：

| 概念 | 说明 |
|------|------|
| **执行循环** | Model → Tools → Model（循环直到完成） |
| **作用点** | beforeAgent/Model、afterAgent/Model、wrapModelCall、wrapToolCall |
| **节点式 Hook** | 顺序执行，用于日志、验证 |
| **包装式 Hook** | 嵌套执行，用于重试、缓存、转换 |
| **执行顺序** | before 正序，after 逆序，wrap 嵌套 |

**核心理念**：中间件让你在不修改核心逻辑的情况下，灵活地添加日志、安全、重试等横切关注点。

下一篇，我们将深入学习 LangChain 提供的各种预置中间件！
