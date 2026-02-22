# 15. 自定义中间件：构建你自己的 Agent 增强逻辑

## 简单来说

当预置中间件无法满足需求时，你可以使用 `createMiddleware` 创建完全自定义的中间件——在 Agent 执行的任意节点插入你的逻辑，实现日志、验证、转换、流程控制等功能。

## 本节目标

学完本节，你将能够：
- 使用 `createMiddleware` 创建自定义中间件
- 实现节点式 Hook 和包装式 Hook
- 为中间件添加自定义状态
- 使用 Context 传递运行时配置
- 实现流程跳转和提前终止

## 业务场景

想象这些个性化需求：

1. **动态模型选择**：根据对话长度自动切换更强的模型
2. **自定义日志**：记录每次调用的详细信息到你的监控系统
3. **对话计数器**：追踪模型调用次数并基于此做决策
4. **动态工具筛选**：根据用户权限动态调整可用工具

预置中间件无法覆盖所有场景，自定义中间件让你拥有完全的控制权。

---

## 一、创建基础中间件

### 1.1 最简单的中间件

```typescript
import { createMiddleware } from "langchain";

const loggingMiddleware = createMiddleware({
  name: "LoggingMiddleware",
  beforeModel: (state) => {
    console.log(`即将调用模型，消息数: ${state.messages.length}`);
    return;
  },
  afterModel: (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    console.log(`模型返回: ${lastMessage.content}`);
    return;
  },
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  middleware: [loggingMiddleware],
});
```

### 1.2 可用的 Hook 点

| Hook | 触发时机 | 典型用途 |
|------|----------|----------|
| `beforeAgent` | Agent 开始执行前 | 请求验证、初始化 |
| `beforeModel` | 每次模型调用前 | 消息预处理、日志 |
| `afterModel` | 每次模型响应后 | 结果处理、日志 |
| `afterAgent` | Agent 执行完成后 | 清理、统计 |
| `wrapModelCall` | 包裹模型调用 | 重试、缓存、转换 |
| `wrapToolCall` | 包裹工具调用 | 重试、权限检查 |

---

## 二、节点式 Hook 详解

### 2.1 beforeAgent / afterAgent

每次 `agent.invoke()` 只执行一次：

```typescript
const sessionMiddleware = createMiddleware({
  name: "SessionMiddleware",
  beforeAgent: (state) => {
    console.log(`[会话开始] 用户消息: ${state.messages[0]?.content}`);
    return;
  },
  afterAgent: (state) => {
    console.log(`[会话结束] 总消息数: ${state.messages.length}`);
    return;
  },
});
```

### 2.2 beforeModel / afterModel

Agent 循环中每次模型调用都会触发：

```typescript
const modelCallMiddleware = createMiddleware({
  name: "ModelCallMiddleware",
  beforeModel: (state) => {
    console.log(`[模型调用] 当前轮次消息数: ${state.messages.length}`);
    return;
  },
  afterModel: (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    if (lastMessage.tool_calls?.length) {
      console.log(`[模型响应] 将调用工具: ${lastMessage.tool_calls.map(c => c.name).join(", ")}`);
    } else {
      console.log(`[模型响应] 直接回复: ${lastMessage.content?.slice(0, 50)}...`);
    }
    return;
  },
});
```

### 2.3 返回值修改状态

Hook 可以返回部分状态来修改：

```typescript
const injectSystemPromptMiddleware = createMiddleware({
  name: "InjectSystemPrompt",
  beforeModel: (state) => {
    return {
      messages: [
        { role: "system", content: "请用简洁专业的语言回复用户。" },
        ...state.messages,
      ]
    };
  },
});
```

---

## 三、包装式 Hook 详解

### 3.1 wrapModelCall

完全控制模型调用过程：

```typescript
const cachingMiddleware = createMiddleware({
  name: "CachingMiddleware",
  wrapModelCall: (request, handler) => {
    const cacheKey = JSON.stringify(request.messages.map(m => m.content));
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log("[缓存命中]");
      return cached;
    }
    
    const result = handler(request);
    cache.set(cacheKey, result);
    return result;
  },
});
```

### 3.2 wrapToolCall

控制工具执行：

```typescript
const toolMonitorMiddleware = createMiddleware({
  name: "ToolMonitorMiddleware",
  wrapToolCall: (request, handler) => {
    const { name, args } = request.toolCall;
    console.log(`[工具调用] ${name}(${JSON.stringify(args)})`);
    
    const start = Date.now();
    try {
      const result = handler(request);
      console.log(`[工具完成] ${name} 耗时: ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      console.error(`[工具失败] ${name}: ${error.message}`);
      throw error;
    }
  },
});
```

### 3.3 实现重试逻辑

```typescript
const retryMiddleware = createMiddleware({
  name: "RetryMiddleware",
  wrapModelCall: async (request, handler) => {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await handler(request);
      } catch (error) {
        if (attempt === maxRetries - 1) throw error;
        console.log(`重试 ${attempt + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error("不可达");
  },
});
```

---

## 四、自定义状态 Schema

### 4.1 定义状态扩展

中间件可以为 Agent 添加自定义状态字段：

```typescript
import { createMiddleware, createAgent, HumanMessage } from "langchain";
import { StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const CustomState = new StateSchema({
  modelCallCount: z.number().default(0),
  userId: z.string().optional(),
});

const callCounterMiddleware = createMiddleware({
  name: "CallCounterMiddleware",
  stateSchema: CustomState,
  beforeModel: {
    canJumpTo: ["end"],
    hook: (state) => {
      if (state.modelCallCount > 10) {
        return { jumpTo: "end" };
      }
      return;
    },
  },
  afterModel: (state) => {
    return { modelCallCount: state.modelCallCount + 1 };
  },
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  middleware: [callCounterMiddleware],
});

const result = await agent.invoke({
  messages: [new HumanMessage("你好")],
  modelCallCount: 0,
  userId: "user-123",
});

console.log(result.modelCallCount);
```

### 4.2 私有状态字段

以 `_` 开头的字段是私有的，不会出现在最终结果中：

```typescript
const PrivateState = new StateSchema({
  publicCounter: z.number().default(0),
  _internalFlag: z.boolean().default(false),
});

const middleware = createMiddleware({
  name: "PrivateStateMiddleware",
  stateSchema: PrivateState,
  afterModel: (state) => {
    if (state._internalFlag) {
      return { publicCounter: state.publicCounter + 1 };
    }
    return { _internalFlag: true };
  },
});

const result = await agent.invoke({
  messages: [new HumanMessage("你好")],
  publicCounter: 0
});

console.log(result.publicCounter);
console.log(result._internalFlag);
```

---

## 五、自定义 Context

### 5.1 定义 Context Schema

Context 用于传递只读的运行时配置：

```typescript
import * as z from "zod";
import { createAgent, createMiddleware, HumanMessage } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  apiKey: z.string().optional(),
});

const userContextMiddleware = createMiddleware({
  name: "UserContextMiddleware",
  contextSchema,
  wrapModelCall: (request, handler) => {
    const { userId, tenantId } = request.runtime.context;
    
    const newSystemMessage = request.systemMessage.concat(
      `用户 ID: ${userId}, 租户: ${tenantId}`
    );

    return handler({
      ...request,
      systemMessage: newSystemMessage,
    });
  },
});

const agent = createAgent({
  model: "gpt-4o",
  middleware: [userContextMiddleware],
  tools: [],
  contextSchema,
});

const result = await agent.invoke(
  { messages: [new HumanMessage("你好")] },
  {
    context: {
      userId: "user-123",
      tenantId: "acme-corp",
    },
  }
);
```

### 5.2 State vs Context

| 特性 | State | Context |
|------|-------|---------|
| 可修改 | ✅ 是 | ❌ 否（只读） |
| 持久化 | ✅ 是 | ❌ 否 |
| 返回结果 | ✅ 是 | ❌ 否 |
| 用途 | 追踪执行状态 | 传递配置信息 |

---

## 六、流程跳转

### 6.1 使用 jumpTo 提前结束

```typescript
import { createMiddleware, AIMessage } from "langchain";

const messageLimitMiddleware = (maxMessages: number = 50) => {
  return createMiddleware({
    name: "MessageLimitMiddleware",
    beforeModel: {
      canJumpTo: ["end"],
      hook: (state) => {
        if (state.messages.length >= maxMessages) {
          return {
            messages: [new AIMessage("对话已达上限，请开始新会话。")],
            jumpTo: "end",
          };
        }
        return;
      }
    },
  });
};
```

### 6.2 可用的跳转目标

| 目标 | 说明 |
|------|------|
| `"end"` | 跳到 Agent 执行结束（或第一个 afterAgent 钩子） |
| `"tools"` | 跳到工具执行节点 |
| `"model"` | 跳到模型调用节点（或第一个 beforeModel 钩子） |

### 6.3 内容过滤示例

```typescript
const contentFilterMiddleware = (bannedKeywords: string[]) => {
  return createMiddleware({
    name: "ContentFilterMiddleware",
    beforeAgent: {
      canJumpTo: ["end"],
      hook: (state) => {
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage._getType() !== "human") return;

        const content = lastMessage.content.toString().toLowerCase();
        for (const keyword of bannedKeywords) {
          if (content.includes(keyword.toLowerCase())) {
            return {
              messages: [new AIMessage("我无法处理包含不当内容的请求。")],
              jumpTo: "end",
            };
          }
        }
        return;
      }
    },
  });
};
```

---

## 七、实战示例

### 7.1 动态模型选择

```typescript
import { createMiddleware, initChatModel } from "langchain";

const dynamicModelMiddleware = createMiddleware({
  name: "DynamicModelMiddleware",
  wrapModelCall: (request, handler) => {
    let model;
    if (request.messages.length > 10) {
      model = initChatModel("gpt-4o");
    } else {
      model = initChatModel("gpt-4o-mini");
    }
    return handler({ ...request, model });
  },
});
```

### 7.2 动态工具筛选

```typescript
const toolSelectorMiddleware = createMiddleware({
  name: "ToolSelector",
  wrapModelCall: (request, handler) => {
    const userRole = request.runtime.context?.role;
    
    let relevantTools = request.tools;
    if (userRole !== "admin") {
      relevantTools = request.tools.filter(
        t => !["delete_database", "modify_config"].includes(t.name)
      );
    }
    
    return handler({ ...request, tools: relevantTools });
  },
});
```

### 7.3 操作系统消息

```typescript
import { createMiddleware, SystemMessage } from "langchain";

const systemMessageMiddleware = createMiddleware({
  name: "SystemMessageMiddleware",
  wrapModelCall: async (request, handler) => {
    const enhancedSystemMessage = request.systemMessage.concat(
      "请确保回复准确、专业。"
    );
    
    return handler({
      ...request,
      systemMessage: enhancedSystemMessage,
    });
  },
});

const structuredSystemMiddleware = createMiddleware({
  name: "StructuredSystemMiddleware",
  wrapModelCall: async (request, handler) => {
    const structuredMessage = request.systemMessage.concat(
      new SystemMessage({
        content: [
          {
            type: "text",
            text: " 这部分内容将被缓存。",
            cache_control: { type: "ephemeral", ttl: "5m" },
          },
        ],
      })
    );
    
    return handler({
      ...request,
      systemMessage: structuredMessage,
    });
  },
});
```

### 7.4 完整的分析中间件

```typescript
interface AnalyticsData {
  modelCalls: number;
  toolCalls: number;
  totalTokens: number;
  errors: Error[];
}

const AnalyticsState = new StateSchema({
  _analytics: z.object({
    modelCalls: z.number().default(0),
    toolCalls: z.number().default(0),
    totalTokens: z.number().default(0),
    errors: z.array(z.any()).default([]),
  }).default({}),
});

const analyticsMiddleware = createMiddleware({
  name: "AnalyticsMiddleware",
  stateSchema: AnalyticsState,
  
  beforeAgent: (state) => {
    console.log(`[Analytics] 会话开始`);
    return {
      _analytics: {
        modelCalls: 0,
        toolCalls: 0,
        totalTokens: 0,
        errors: [],
      }
    };
  },
  
  wrapModelCall: async (request, handler) => {
    const start = Date.now();
    try {
      const result = await handler(request);
      console.log(`[Analytics] 模型调用耗时: ${Date.now() - start}ms`);
      return result;
    } catch (error) {
      console.error(`[Analytics] 模型调用失败: ${error.message}`);
      throw error;
    }
  },
  
  afterModel: (state) => {
    return {
      _analytics: {
        ...state._analytics,
        modelCalls: state._analytics.modelCalls + 1,
      }
    };
  },
  
  wrapToolCall: async (request, handler) => {
    console.log(`[Analytics] 工具调用: ${request.toolCall.name}`);
    return handler(request);
  },
  
  afterAgent: (state) => {
    console.log(`[Analytics] 会话结束 - 模型调用: ${state._analytics.modelCalls}, 工具调用: ${state._analytics.toolCalls}`);
    return;
  },
});
```

---

## 八、最佳实践

### 8.1 设计原则

1. **单一职责**：每个中间件只做一件事
2. **错误处理**：在中间件内部捕获并处理错误
3. **性能意识**：避免在热路径上执行耗时操作
4. **文档清晰**：为自定义状态字段添加说明

### 8.2 Hook 选择指南

| 需求 | 推荐 Hook |
|------|-----------|
| 记录日志 | `beforeModel` / `afterModel` |
| 验证输入 | `beforeAgent` |
| 统计结果 | `afterAgent` |
| 实现重试 | `wrapModelCall` / `wrapToolCall` |
| 修改消息 | `beforeModel` |
| 动态选模型 | `wrapModelCall` |

### 8.3 测试建议

```typescript
import { createAgent, createMiddleware, HumanMessage } from "langchain";

describe("CustomMiddleware", () => {
  it("should increment call count", async () => {
    const calls: number[] = [];
    
    const testMiddleware = createMiddleware({
      name: "TestMiddleware",
      afterModel: () => {
        calls.push(Date.now());
        return;
      },
    });
    
    const agent = createAgent({
      model: "gpt-4o",
      tools: [],
      middleware: [testMiddleware],
    });
    
    await agent.invoke({ messages: [new HumanMessage("测试")] });
    
    expect(calls.length).toBeGreaterThan(0);
  });
});
```

---

## 常见问题

### Q1: 中间件返回 undefined 会怎样？

不会修改状态，等同于 `return;`。

### Q2: 如何在多个中间件间共享数据？

使用自定义状态字段。定义 `stateSchema` 后，所有中间件都能访问这些字段。

### Q3: wrapModelCall 可以不调用 handler 吗？

可以，这样就实现了"短路"——完全跳过模型调用，直接返回自定义结果。

---

## 总结

自定义中间件让你完全控制 Agent 的执行过程：

| 功能 | 实现方式 |
|------|----------|
| 创建中间件 | `createMiddleware({ name, hooks })` |
| 节点式 Hook | `beforeAgent/Model`、`afterAgent/Model` |
| 包装式 Hook | `wrapModelCall`、`wrapToolCall` |
| 自定义状态 | `stateSchema` + Zod Schema |
| 运行时配置 | `contextSchema` + `runtime.context` |
| 流程跳转 | `jumpTo: "end" \| "tools" \| "model"` |
| 私有状态 | 字段名以 `_` 开头 |

**核心理念**：中间件是声明式的横切关注点——把日志、安全、重试等逻辑从业务代码中分离出来，让代码更清晰、更可维护。

下一篇，我们将学习 Guardrails（安全护栏），实现输入输出的安全检查！
