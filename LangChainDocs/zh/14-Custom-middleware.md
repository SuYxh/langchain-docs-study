## 文档索引
在以下位置获取完整的文档索引：https://docs.langchain.com/llms.txt
使用此文件在进一步探索之前发现所有可用页面。

# 自定义中间件

通过实现在智能体执行流程中特定点运行的钩子来构建自定义中间件。

## 钩子 (Hooks)

中间件提供了两种风格的钩子来拦截智能体执行：

<CardGroup cols={2}>
  <Card title="Node-style hooks" icon="share-nodes" href="#node-style-hooks">
    在特定执行点顺序运行。
  </Card>

  <Card title="Wrap-style hooks" icon="container-storage" href="#wrap-style-hooks">
    在每个模型或工具调用周围运行。
  </Card>
</CardGroup>

### 节点式钩子 (Node-style hooks)

在特定执行点顺序运行。用于日志记录、验证和状态更新。

**可用钩子：**

* `beforeAgent` - 在智能体开始之前（每次调用一次）
* `beforeModel` - 在每次模型调用之前
* `afterModel` - 在每次模型响应之后
* `afterAgent` - 在智能体完成之后（每次调用一次）

**示例：**

```typescript  theme={null}
import { createMiddleware, AIMessage } from "langchain";

const createMessageLimitMiddleware = (maxMessages: number = 50) => {
  return createMiddleware({
    name: "MessageLimitMiddleware",
    beforeModel: {
      canJumpTo: ["end"],
      hook: (state) => {
        if (state.messages.length === maxMessages) {
          return {
            messages: [new AIMessage("Conversation limit reached.")],
            jumpTo: "end",
          };
        }
        return;
      }
    },
    afterModel: (state) => {
      const lastMessage = state.messages[state.messages.length - 1];
      console.log(`Model returned: ${lastMessage.content}`);
      return;
    },
  });
};
```

### 包裹式钩子 (Wrap-style hooks)

拦截执行并控制何时调用处理程序。用于重试、缓存和转换。

您可以决定处理程序是被调用零次（短路）、一次（正常流程）还是多次（重试逻辑）。

**可用钩子：**

* `wrapModelCall` - 在每次模型调用周围
* `wrapToolCall` - 在每次工具调用周围

**示例：**

```typescript  theme={null}
import { createMiddleware } from "langchain";

const createRetryMiddleware = (maxRetries: number = 3) => {
  return createMiddleware({
    name: "RetryMiddleware",
    wrapModelCall: (request, handler) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return handler(request);
        } catch (e) {
          if (attempt === maxRetries - 1) {
            throw e;
          }
          console.log(`Retry ${attempt + 1}/${maxRetries} after error: ${e}`);
        }
      }
      throw new Error("Unreachable");
    },
  });
};
```

## 创建中间件

使用 `createMiddleware` 函数定义自定义中间件：

```typescript  theme={null}
import { createMiddleware } from "langchain";

const loggingMiddleware = createMiddleware({
  name: "LoggingMiddleware",
  beforeModel: (state) => {
    console.log(`About to call model with ${state.messages.length} messages`);
    return;
  },
  afterModel: (state) => {
    const lastMessage = state.messages[state.messages.length - 1];
    console.log(`Model returned: ${lastMessage.content}`);
    return;
  },
});
```

## 自定义状态模式

中间件可以使用自定义属性扩展智能体的状态。这使得中间件能够：

* **跨执行跟踪状态**：维护在整个智能体执行生命周期中持久存在的计数器、标志或其他值

* **在钩子之间共享数据**：将信息从 `beforeModel` 传递到 `afterModel` 或在不同中间件实例之间传递

* **实现横切关注点**：添加速率限制、使用情况跟踪、用户上下文或审计日志等功能，而无需修改核心智能体逻辑

* **做出有条件的决定**：使用累积状态来确定是否继续执行、跳转到不同节点或动态修改行为

```typescript  theme={null}
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
  model: "gpt-4.1",
  tools: [...],
  middleware: [callCounterMiddleware],
});

const result = await agent.invoke({
  messages: [new HumanMessage("Hello")],
  modelCallCount: 0,
  userId: "user-123",
});
```

状态字段可以是公共的或私有的。以特定下划线 (`_`) 开头的字段被视为私有字段，不会包含在智能体的结果中。仅返回公共字段（那些没有前导下划线的字段）。

这对于存储不应暴露给调用者的内部中间件状态很有用，例如临时跟踪变量或内部标志：

```typescript  theme={null}
import { StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const PrivateState = new StateSchema({
  // Public field - included in invoke result
  publicCounter: z.number().default(0),
  // Private field - excluded from invoke result
  _internalFlag: z.boolean().default(false),
});

const middleware = createMiddleware({
  name: "ExampleMiddleware",
  stateSchema: PrivateState,
  afterModel: (state) => {
    // Both fields are accessible during execution
    if (state._internalFlag) {
      return { publicCounter: state.publicCounter + 1 };
    }
    return { _internalFlag: true };
  },
});

const result = await agent.invoke({
  messages: [new HumanMessage("Hello")],
  publicCounter: 0
});

// result only contains publicCounter, not _internalFlag
console.log(result.publicCounter); // 1
console.log(result._internalFlag); // undefined
```

## 自定义上下文

中间件可以定义自定义上下文模式以访问每次调用的元数据。与状态不同，上下文是只读的，并且不会在调用之间持久存在。这使其非常适合：

* **用户信息**：传递执行期间不会更改的用户 ID、角色或首选项
* **配置覆盖**：提供每次调用的设置，如速率限制或功能标志
* **租户/工作区上下文**：包含多租户应用程序的组织特定数据
* **请求元数据**：传递中间件所需的请求 ID、API 密钥或其他元数据

使用 Zod 定义上下文模式，并通过中间件钩子中的 `runtime.context` 访问它。上下文模式中的必填字段将在 TypeScript 级别强制执行，确保您在调用 `agent.invoke()` 时必须提供它们。

```typescript  theme={null}
import { createAgent, createMiddleware, HumanMessage } from "langchain";
import * as z from "zod";

const contextSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  apiKey: z.string().optional(),
});

const userContextMiddleware = createMiddleware({
  name: "UserContextMiddleware",
  contextSchema,
  wrapModelCall: (request, handler) => {
    // Access context from runtime
    const { userId, tenantId } = request.runtime.context;

    // Add user context to system message
    const contextText = `User ID: ${userId}, Tenant: ${tenantId}`;
    const newSystemMessage = request.systemMessage.concat(contextText);

    return handler({
      ...request,
      systemMessage: newSystemMessage,
    });
  },
});

const agent = createAgent({
  model: "gpt-4.1",
  middleware: [userContextMiddleware],
  tools: [],
  contextSchema,
});

const result = await agent.invoke(
  { messages: [new HumanMessage("Hello")] },
  // Required fields (userId, tenantId) must be provided
  {
    context: {
      userId: "user-123",
      tenantId: "acme-corp",
    },
  }
);
```

**必填上下文字段**：当您在 `contextSchema` 中定义必填字段（没有 `.optional()` 或 `.default()` 的字段）时，TypeScript 将强制执行在 `agent.invoke()` 调用期间必须提供这些字段。这确保了类型安全并防止因缺少所需上下文而导致的运行时错误。

```typescript  theme={null}
// This will cause a TypeScript error if userId or tenantId are missing
const result = await agent.invoke(
  { messages: [new HumanMessage("Hello")] },
  { context: { userId: "user-123" } } // Error: tenantId is required
);
```

## 执行顺序

当使用多个中间件时，了解它们如何执行：

```typescript  theme={null}
const agent = createAgent({
  model: "gpt-4.1",
  middleware: [middleware1, middleware2, middleware3],
  tools: [...],
});
```

<Accordion title="Execution flow">
  **Before 钩子按顺序运行：**

  1. `middleware1.before_agent()`
  2. `middleware2.before_agent()`
  3. `middleware3.before_agent()`

  **智能体循环开始**

  4. `middleware1.before_model()`
  5. `middleware2.before_model()`
  6. `middleware3.before_model()`

  **Wrap 钩子像函数调用一样嵌套：**

  7. `middleware1.wrap_model_call()` → `middleware2.wrap_model_call()` → `middleware3.wrap_model_call()` → model

  **After 钩子按相反顺序运行：**

  8. `middleware3.after_model()`
  9. `middleware2.after_model()`
  10. `middleware1.after_model()`

  **智能体循环结束**

  11. `middleware3.after_agent()`
  12. `middleware2.after_agent()`
  13. `middleware1.after_agent()`
</Accordion>

**关键规则：**

* `before_*` 钩子：从前到后
* `after_*` 钩子：从后到前（反向）
* `wrap_*` 钩子：嵌套（第一个中间件包裹所有其他中间件）

## 智能体跳转 (Agent jumps)

要提前退出中间件，请返回带有 `jump_to` 的字典：

**可用跳转目标：**

* `'end'`: 跳转到智能体执行的末尾（或第一个 `after_agent` 钩子）
* `'tools'`: 跳转到工具节点
* `'model'`: 跳转到模型节点（或第一个 `before_model` 钩子）

```typescript  theme={null}
import { createAgent, createMiddleware, AIMessage } from "langchain";

const agent = createAgent({
  model: "gpt-4.1",
  middleware: [
    createMiddleware({
      name: "BlockedContentMiddleware",
      beforeModel: {
        canJumpTo: ["end"],
        hook: (state) => {
          if (state.messages.at(-1)?.content.includes("BLOCKED")) {
            return {
              messages: [new AIMessage("I cannot respond to that request.")],
              jumpTo: "end" as const,
            };
          }
          return;
        },
      },
    }),
  ],
});

const result = await agent.invoke({
    messages: "Hello, world! BLOCKED"
});

/**
 * Expected output:
 * I cannot respond to that request.
 */
console.log(result.messages.at(-1)?.content);
```

## 最佳实践

1. 保持中间件专注 - 每个中间件应该做好一件事
2. 优雅地处理错误 - 不要让中间件错误导致智能体崩溃
3. **使用适当的钩子类型**：
   * 节点式用于顺序逻辑（日志记录、验证）
   * 包裹式用于控制流（重试、回退、缓存）
4. 清晰地记录任何自定义状态属性
5. 在集成之前独立地对中间件进行单元测试
6. 考虑执行顺序 - 将关键中间件放在列表的最前面
7. 尽可能使用内置中间件

## 示例

### 动态模型选择

```typescript  theme={null}
import { createMiddleware, initChatModel } from "langchain";

const dynamicModelMiddleware = createMiddleware({
  name: "DynamicModelMiddleware",
  wrapModelCall: (request, handler) => {
    const modifiedRequest = { ...request };
    if (request.messages.length > 10) {
      modifiedRequest.model = initChatModel("gpt-4.1");
    } else {
      modifiedRequest.model = initChatModel("gpt-4.1-mini");
    }
    return handler(modifiedRequest);
  },
});
```

### 工具调用监控

```typescript  theme={null}
import { createMiddleware } from "langchain";

const toolMonitoringMiddleware = createMiddleware({
  name: "ToolMonitoringMiddleware",
  wrapToolCall: (request, handler) => {
    console.log(`Executing tool: ${request.toolCall.name}`);
    console.log(`Arguments: ${JSON.stringify(request.toolCall.args)}`);
    try {
      const result = handler(request);
      console.log("Tool completed successfully");
      return result;
    } catch (e) {
      console.log(`Tool failed: ${e}`);
      throw e;
    }
  },
});
```

### 动态选择工具

在运行时选择相关工具以提高性能和准确性。本节介绍过滤预注册的工具。有关注册在运行时发现的工具（例如，从 MCP 服务器），请参阅 [运行时工具注册](/oss/javascript/langchain/agents#dynamic-tools)。

**好处：**

* **更短的提示** - 通过仅暴露相关工具来降低复杂性
* **更好的准确性** - 模型从更少的选项中正确选择
* **权限控制** - 根据用户访问权限动态过滤工具

```typescript  theme={null}
import { createAgent, createMiddleware } from "langchain";

const toolSelectorMiddleware = createMiddleware({
  name: "ToolSelector",
  wrapModelCall: (request, handler) => {
    // Select a small, relevant subset of tools based on state/context
    const relevantTools = selectRelevantTools(request.state, request.runtime);
    const modifiedRequest = { ...request, tools: relevantTools };
    return handler(modifiedRequest);
  },
});

const agent = createAgent({
  model: "gpt-4.1",
  tools: allTools,
  middleware: [toolSelectorMiddleware],
});
```

### 使用系统消息

使用 `ModelRequest` 中的 `systemMessage` 字段在中间件中修改系统消息。它包含一个 [`SystemMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.SystemMessage.html) 对象（即使智能体是使用字符串 [`systemPrompt`](https://reference.langchain.com/javascript/types/langchain.index.CreateAgentParams.html#systemprompt) 创建的）。

**示例：链接中间件** - 不同的中间件可以使用不同的方法：

```typescript  theme={null}
import { createMiddleware, SystemMessage, createAgent } from "langchain";

// Middleware 1: Uses systemMessage with simple concatenation
const myMiddleware = createMiddleware({
  name: "MyMiddleware",
  wrapModelCall: async (request, handler) => {
    return handler({
      ...request,
      systemMessage: request.systemMessage.concat(`Additional context.`),
    });
  },
});

// Middleware 2: Uses systemMessage with structured content (preserves structure)
const myOtherMiddleware = createMiddleware({
  name: "MyOtherMiddleware",
  wrapModelCall: async (request, handler) => {
    return handler({
      ...request,
      systemMessage: request.systemMessage.concat(
        new SystemMessage({
          content: [
            {
              type: "text",
              text: " More additional context. This will be cached.",
              cache_control: { type: "ephemeral", ttl: "5m" },
            },
          ],
        })
      ),
    });
  },
});

const agent = createAgent({
  model: "anthropic:claude-3-5-sonnet",
  systemPrompt: "You are a helpful assistant.",
  middleware: [myMiddleware, myOtherMiddleware],
});
```

结果系统消息将是：

```typescript  theme={null}
new SystemMessage({
  content: [
    { type: "text", text: "You are a helpful assistant." },
    { type: "text", text: "Additional context." },
    {
        type: "text",
        text: " More additional context. This will be cached.",
        cache_control: { type: "ephemeral", ttl: "5m" },
    },
  ],
});
```

使用 [`SystemMessage.concat`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.SystemMessage.html#concat) 来保留缓存控制元数据或由其他中间件创建的结构化内容块。

## 其他资源

* [Middleware API reference](https://reference.langchain.com/python/langchain/middleware/)
* [Built-in middleware](/oss/javascript/langchain/middleware/built-in)
* [Testing agents](/oss/javascript/langchain/test)

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/middleware/custom.mdx) 或 [提交问题](https://github.com/langchain-ai/docs/issues/new/choose).
</Callout>

<Tip icon="terminal" iconType="regular">
  [将这些文档连接](/use-these-docs) 到 Claude, VSCode, 以及更多通过 MCP 获取实时答案。
</Tip>
