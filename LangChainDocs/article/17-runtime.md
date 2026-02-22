# 17. 运行时配置：灵活管理 Agent 的执行环境

## 简单来说

Runtime（运行时）是 Agent 执行时的配置环境——包括超时设置、并发控制、信号监听等。就像程序运行时的"环境变量"，让你能够精细控制 Agent 的行为。

## 本节目标

学完本节，你将能够：
- 配置 Agent 的超时和取消机制
- 使用 AbortSignal 优雅中断执行
- 设置递归深度限制防止无限循环
- 传递运行时上下文给中间件和工具
- 配置调用级别的覆盖参数

## 业务场景

想象这些运维需求：

1. **超时控制**：API 网关要求 30 秒内响应，超时需要优雅降级
2. **用户取消**：用户点击"停止生成"，需要立即中断 Agent
3. **资源保护**：防止 Agent 陷入无限工具调用循环
4. **多租户**：不同租户有不同的配置（模型、限制等）

这些场景都需要在运行时灵活控制 Agent 的行为——Runtime 正是为此而生。

---

## 一、基础运行时配置

### 1.1 配置结构

```typescript
import { createAgent, HumanMessage } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
});

const result = await agent.invoke(
  { messages: [new HumanMessage("你好")] },
  {
    signal: new AbortController().signal,
    recursionLimit: 25,
    maxConcurrency: 1,
    configurable: {
      thread_id: "user-123",
    },
    context: {
      userId: "user-123",
      tenantId: "acme-corp",
    },
  }
);
```

### 1.2 主要配置项

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `signal` | `AbortSignal` | 中断信号，用于取消执行 |
| `recursionLimit` | `number` | 最大递归深度（默认 25） |
| `maxConcurrency` | `number` | 最大并发数 |
| `configurable` | `object` | 可配置参数（如 thread_id） |
| `context` | `object` | 运行时上下文（只读） |
| `tags` | `string[]` | 标签，用于追踪和过滤 |
| `metadata` | `object` | 元数据，用于日志和监控 |

---

## 二、超时与取消

### 2.1 使用 AbortSignal

```typescript
import { createAgent, HumanMessage } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool],
});

const controller = new AbortController();

setTimeout(() => {
  controller.abort();
  console.log("请求已取消");
}, 30000);

try {
  const result = await agent.invoke(
    { messages: [new HumanMessage("搜索最新的 AI 新闻")] },
    { signal: controller.signal }
  );
  console.log(result);
} catch (error) {
  if (error.name === "AbortError") {
    console.log("请求被用户取消或超时");
  } else {
    throw error;
  }
}
```

### 2.2 封装超时函数

```typescript
async function invokeWithTimeout<T>(
  agent: Agent,
  input: AgentInput,
  timeoutMs: number,
  config?: RunnableConfig
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await agent.invoke(input, {
      ...config,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return result as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(`Agent 执行超时 (${timeoutMs}ms)`);
    }
    throw error;
  }
}

const result = await invokeWithTimeout(
  agent,
  { messages: [new HumanMessage("复杂查询")] },
  60000
);
```

### 2.3 前端取消按钮

```typescript
function ChatComponent() {
  const [controller, setController] = useState<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (message: string) => {
    const newController = new AbortController();
    setController(newController);
    setIsLoading(true);

    try {
      const result = await agent.invoke(
        { messages: [new HumanMessage(message)] },
        { signal: newController.signal }
      );
      setMessages(prev => [...prev, result.messages.at(-1)]);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("请求失败:", error);
      }
    } finally {
      setIsLoading(false);
      setController(null);
    }
  };

  const handleCancel = () => {
    controller?.abort();
  };

  return (
    <div>
      {isLoading && <button onClick={handleCancel}>停止生成</button>}
    </div>
  );
}
```

---

## 三、递归深度限制

### 3.1 防止无限循环

```typescript
const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool, calculatorTool],
});

const result = await agent.invoke(
  { messages: [new HumanMessage("分析这个复杂问题...")] },
  { recursionLimit: 10 }
);
```

### 3.2 不同场景的推荐值

| 场景 | 推荐值 | 说明 |
|------|--------|------|
| 简单问答 | 5-10 | 通常 1-2 轮就完成 |
| 工具调用 | 15-25 | 可能需要多轮工具调用 |
| 复杂推理 | 25-50 | 深度分析任务 |
| 生产默认 | 25 | 平衡安全和能力 |

### 3.3 递归限制错误处理

```typescript
try {
  const result = await agent.invoke(
    { messages: [new HumanMessage("...")]},
    { recursionLimit: 5 }
  );
} catch (error) {
  if (error.message.includes("recursion limit")) {
    console.log("Agent 执行轮次过多，请简化请求或增加限制");
  }
}
```

---

## 四、运行时上下文 (Context)

### 4.1 传递上下文

上下文是只读的运行时数据，可在中间件和工具中访问：

```typescript
import * as z from "zod";
import { createAgent, createMiddleware, HumanMessage } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  subscription: z.enum(["free", "pro", "enterprise"]),
  permissions: z.array(z.string()),
});

const contextAwareMiddleware = createMiddleware({
  name: "ContextAwareMiddleware",
  contextSchema,
  wrapModelCall: (request, handler) => {
    const { subscription, permissions } = request.runtime.context;
    
    if (subscription === "free" && request.messages.length > 10) {
      throw new Error("免费用户消息数量受限");
    }
    
    return handler(request);
  },
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  middleware: [contextAwareMiddleware],
  contextSchema,
});

const result = await agent.invoke(
  { messages: [new HumanMessage("你好")] },
  {
    context: {
      userId: "user-123",
      tenantId: "acme-corp",
      subscription: "pro",
      permissions: ["read", "write"],
    },
  }
);
```

### 4.2 工具中访问上下文

```typescript
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const contextAwareTool = tool(
  async (input, config) => {
    const context = config?.context;
    const userId = context?.userId;
    
    if (!userId) {
      return "错误：未提供用户上下文";
    }
    
    return await fetchUserData(userId, input.field);
  },
  {
    name: "get_user_data",
    description: "获取当前用户的数据",
    schema: z.object({
      field: z.string().describe("要获取的字段"),
    }),
  }
);
```

---

## 五、可配置参数 (Configurable)

### 5.1 线程管理

```typescript
import { createAgent, HumanMessage } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  checkpointer: new MemorySaver(),
});

const config = {
  configurable: {
    thread_id: "conversation-123",
  },
};

await agent.invoke({ messages: [new HumanMessage("你好")] }, config);

await agent.invoke({ messages: [new HumanMessage("我之前说了什么？")] }, config);
```

### 5.2 动态模型选择

```typescript
const agent = createAgent({
  model: "gpt-4o",
  tools: [],
});

const config = {
  configurable: {
    model: "gpt-4o-mini",
  },
};

const result = await agent.invoke(
  { messages: [new HumanMessage("简单问题")] },
  config
);
```

### 5.3 多租户配置

```typescript
interface TenantConfig {
  thread_id: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

function getTenantConfig(tenantId: string, threadId: string): TenantConfig {
  const configs: Record<string, Partial<TenantConfig>> = {
    "enterprise-tenant": {
      model: "gpt-4o",
      temperature: 0.3,
      maxTokens: 4000,
    },
    "free-tenant": {
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 1000,
    },
  };

  return {
    thread_id: threadId,
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 2000,
    ...configs[tenantId],
  };
}

const result = await agent.invoke(
  { messages: [new HumanMessage("查询")] },
  { configurable: getTenantConfig("enterprise-tenant", "thread-456") }
);
```

---

## 六、标签与元数据

### 6.1 添加追踪标签

```typescript
const result = await agent.invoke(
  { messages: [new HumanMessage("帮我分析数据")] },
  {
    tags: ["data-analysis", "user-request", "priority-high"],
    metadata: {
      requestId: "req-abc-123",
      source: "web-app",
      userTier: "premium",
    },
  }
);
```

### 6.2 在回调中使用

```typescript
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";

class AnalyticsHandler extends BaseCallbackHandler {
  name = "AnalyticsHandler";

  async handleChainStart(chain: any, inputs: any, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, any>) {
    console.log(`[${runId}] Chain started`);
    console.log(`Tags: ${tags?.join(", ")}`);
    console.log(`Metadata:`, metadata);
    
    await analytics.track("agent_start", {
      runId,
      tags,
      ...metadata,
    });
  }

  async handleChainEnd(outputs: any, runId: string) {
    console.log(`[${runId}] Chain ended`);
    await analytics.track("agent_end", { runId });
  }
}

const result = await agent.invoke(
  { messages: [new HumanMessage("分析")] },
  {
    callbacks: [new AnalyticsHandler()],
    tags: ["analysis"],
    metadata: { userId: "user-123" },
  }
);
```

---

## 七、并发控制

### 7.1 限制并发

```typescript
const result = await agent.invoke(
  { messages: [new HumanMessage("处理大量数据")] },
  { maxConcurrency: 2 }
);
```

### 7.2 批量处理

```typescript
const inputs = [
  { messages: [new HumanMessage("问题 1")] },
  { messages: [new HumanMessage("问题 2")] },
  { messages: [new HumanMessage("问题 3")] },
];

const results = await agent.batch(inputs, {
  maxConcurrency: 3,
  returnExceptions: true,
});

results.forEach((result, i) => {
  if (result instanceof Error) {
    console.error(`请求 ${i} 失败:`, result.message);
  } else {
    console.log(`请求 ${i} 成功`);
  }
});
```

---

## 八、实战示例

### 8.1 生产环境配置

```typescript
import { createAgent, HumanMessage, createMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool, databaseTool],
  checkpointer: new MemorySaver(),
});

async function handleUserRequest(
  userId: string,
  tenantId: string,
  threadId: string,
  message: string,
  signal?: AbortSignal
) {
  const config = {
    signal,
    recursionLimit: 25,
    maxConcurrency: 2,
    configurable: {
      thread_id: threadId,
    },
    context: {
      userId,
      tenantId,
      timestamp: Date.now(),
    },
    tags: [tenantId, `user:${userId}`],
    metadata: {
      requestId: crypto.randomUUID(),
      source: "api",
    },
  };

  try {
    const result = await agent.invoke(
      { messages: [new HumanMessage(message)] },
      config
    );
    return { success: true, data: result };
  } catch (error) {
    if (error.name === "AbortError") {
      return { success: false, error: "REQUEST_CANCELLED" };
    }
    return { success: false, error: error.message };
  }
}
```

### 8.2 Express API 集成

```typescript
import express from "express";

const app = express();
app.use(express.json());

const activeRequests = new Map<string, AbortController>();

app.post("/api/chat", async (req, res) => {
  const { userId, tenantId, threadId, message } = req.body;
  const requestId = crypto.randomUUID();
  
  const controller = new AbortController();
  activeRequests.set(requestId, controller);

  const timeout = setTimeout(() => {
    controller.abort();
  }, 60000);

  try {
    const result = await handleUserRequest(
      userId,
      tenantId,
      threadId,
      message,
      controller.signal
    );
    
    clearTimeout(timeout);
    activeRequests.delete(requestId);
    
    res.json({ requestId, ...result });
  } catch (error) {
    clearTimeout(timeout);
    activeRequests.delete(requestId);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/chat/:requestId/cancel", (req, res) => {
  const { requestId } = req.params;
  const controller = activeRequests.get(requestId);
  
  if (controller) {
    controller.abort();
    activeRequests.delete(requestId);
    res.json({ success: true, message: "Request cancelled" });
  } else {
    res.status(404).json({ error: "Request not found" });
  }
});
```

---

## 九、最佳实践

### 9.1 配置模板

```typescript
const defaultConfig = {
  recursionLimit: 25,
  maxConcurrency: 2,
  tags: ["production"],
};

function createRequestConfig(
  userId: string,
  options?: Partial<RunnableConfig>
): RunnableConfig {
  return {
    ...defaultConfig,
    ...options,
    context: {
      userId,
      ...options?.context,
    },
    metadata: {
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      ...options?.metadata,
    },
  };
}
```

### 9.2 错误恢复

```typescript
async function invokeWithRetry(
  agent: Agent,
  input: AgentInput,
  config: RunnableConfig,
  maxRetries: number = 3
): Promise<AgentOutput> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await agent.invoke(input, config);
    } catch (error) {
      if (error.name === "AbortError") {
        throw error;
      }
      
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }
  }
  
  throw new Error("Max retries exceeded");
}
```

---

## 常见问题

### Q1: AbortSignal 触发后，Agent 会立即停止吗？

不一定。Agent 会在下一个可中断点检查信号。正在进行的 LLM 调用会等待完成或超时。

### Q2: recursionLimit 和 modelCallLimit 中间件有什么区别？

- `recursionLimit`：LangGraph 底层的安全限制，针对整个图的节点执行
- `modelCallLimitMiddleware`：应用层的限制，专门针对模型调用次数

### Q3: context 和 configurable 的区别？

- `context`：只读的运行时数据，用于传递用户信息等
- `configurable`：可配置参数，用于 thread_id、模型选择等

---

## 总结

Runtime 配置让你精细控制 Agent 的执行环境：

| 功能 | 配置项 |
|------|--------|
| 超时取消 | `signal: AbortSignal` |
| 递归限制 | `recursionLimit: number` |
| 并发控制 | `maxConcurrency: number` |
| 线程管理 | `configurable.thread_id` |
| 运行上下文 | `context: object` |
| 追踪标签 | `tags: string[]` |
| 元数据 | `metadata: object` |

**核心理念**：Runtime 配置是 Agent 的"操作手册"——让你能够在不修改 Agent 定义的情况下，灵活控制每次执行的行为。

恭喜你完成了高级功能篇的学习！你现在已经掌握了 LangChain Agent 的核心能力：结构化输出、中间件系统、安全护栏和运行时配置。接下来可以探索多 Agent 系统和实战项目了！
