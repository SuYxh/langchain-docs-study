> ## 文档索引
> 获取完整文档索引请访问：https://docs.langchain.com/llms.txt
> 在深入探索之前，请使用此文件发现所有可用页面。

# Short-term memory (短期记忆)

## 概述

记忆是一个记住有关先前交互信息的系统。对于 AI Agent 来说，记忆至关重要，因为它让它们能够记住先前的交互、从反馈中学习并适应用户偏好。随着 Agent 处理具有大量用户交互的更复杂任务，这种能力对于效率和用户满意度都变得至关重要。

短期记忆让您的应用程序记住单个线程或对话中的先前交互。

<Note>
  线程（thread）组织会话中的多个交互，类似于电子邮件将消息分组到单个对话中的方式。
</Note>

对话历史记录是短期记忆最常见的形式。长对话对当今的 LLM 提出了挑战；完整的历史记录可能无法放入 LLM 的上下文窗口中，导致上下文丢失或错误。

即使您的模型支持完整的上下文长度，大多数 LLM 在长上下文中表现仍然不佳。它们会被陈旧或离题的内容“分心”，同时还会遭受响应时间变慢和成本增加的影响。

聊天模型使用 [消息](/oss/javascript/langchain/messages) 接受上下文，其中包括指令（系统消息）和输入（人类消息）。在聊天应用程序中，消息在人类输入和模型响应之间交替，导致消息列表随着时间的推移而变长。由于上下文窗口有限，许多应用程序可以从使用技术来删除或“忘记”陈旧信息中受益。

## 用法

要向 Agent 添加短期记忆（线程级持久性），您需要在创建 Agent 时指定一个 `checkpointer`。

<Info>
  LangChain 的 Agent 将短期记忆作为 Agent 状态的一部分进行管理。

  通过将这些存储在图的状态中，Agent 可以访问给定对话的完整上下文，同时保持不同线程之间的分离。

  使用 checkpointer 将状态持久化到数据库（或内存），以便随时恢复线程。

  短期记忆在调用 Agent 或完成步骤（如工具调用）时更新，并且在每个步骤开始时读取状态。
</Info>

```ts {highlight={2,4, 9,14}} theme={null}
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();

const agent = createAgent({
    model: "claude-sonnet-4-5-20250929",
    tools: [],
    checkpointer,
});

await agent.invoke(
    { messages: [{ role: "user", content: "hi! i am Bob" }] },
    { configurable: { thread_id: "1" } }
);
```

### 在生产环境中

在生产环境中，使用由数据库支持的 checkpointer：

```ts  theme={null}
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable";
const checkpointer = PostgresSaver.fromConnString(DB_URI);
```

<Note>
  有关包括 SQLite、Postgres 和 Azure Cosmos DB 在内的更多 checkpointer 选项，请参阅持久性文档中的 [checkpointer 库列表](/oss/javascript/langgraph/persistence#checkpointer-libraries)。
</Note>

## 自定义 Agent 记忆

您可以通过创建带有状态架构的自定义中间件来扩展 Agent 状态。自定义状态架构可以使用中间件中的 `stateSchema` 参数传递。最好使用 `StateSchema` 类进行状态定义（也支持普通的 Zod 对象）。

```typescript  theme={null}
import { createAgent, createMiddleware } from "langchain";
import { StateSchema, MemorySaver } from "@langchain/langgraph";
import * as z from "zod";

const CustomState = new StateSchema({  // [!code highlight]
    userId: z.string(),  // [!code highlight]
    preferences: z.record(z.string(), z.any()),  // [!code highlight]
});  // [!code highlight]

const stateExtensionMiddleware = createMiddleware({
    name: "StateExtension",
    stateSchema: CustomState,  // [!code highlight]
});

const checkpointer = new MemorySaver();
const agent = createAgent({
    model: "gpt-5",
    tools: [],
    middleware: [stateExtensionMiddleware],  // [!code highlight]
    checkpointer,
});

// Custom state can be passed in invoke
const result = await agent.invoke({
    messages: [{ role: "user", content: "Hello" }],
    userId: "user_123",  // [!code highlight]
    preferences: { theme: "dark" },  // [!code highlight]
});
```

## 常见模式

启用 [短期记忆](#add-short-term-memory) 后，长对话可能会超出 LLM 的上下文窗口。常见的解决方案有：

<CardGroup cols={2}>
  <Card title="Trim messages (修剪消息)" icon="scissors" href="#trim-messages" arrow>
    删除前 N 条或后 N 条消息（在调用 LLM 之前）
  </Card>

  <Card title="Delete messages (删除消息)" icon="trash" href="#delete-messages" arrow>
    从 LangGraph 状态中永久删除消息
  </Card>

  <Card title="Summarize messages (总结消息)" icon="layer-group" href="#summarize-messages" arrow>
    总结历史记录中的早期消息并将其替换为摘要
  </Card>

  <Card title="Custom strategies (自定义策略)" icon="gears">
    自定义策略（例如，消息过滤等）
  </Card>
</CardGroup>

这允许 Agent 在不超出 LLM 上下文窗口的情况下跟踪对话。

### 修剪消息 (Trim messages)

大多数 LLM 都有最大支持的上下文窗口（以 token 为单位）。

决定何时截断消息的一种方法是计算消息历史记录中的 token，并在接近该限制时进行截断。如果您使用的是 LangChain，您可以使用修剪消息实用程序并指定要从列表中保留的 token 数量，以及用于处理边界的 `strategy`（例如，保留最后的 `maxTokens`）。

要在 Agent 中修剪消息历史记录，请使用 [`createMiddleware`](https://reference.langchain.com/javascript/functions/langchain.index.createMiddleware.html) 和 `beforeModel` 钩子：

```typescript  theme={null}
import { RemoveMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { MemorySaver, REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

const trimMessages = createMiddleware({
  name: "TrimMessages",
  beforeModel: (state) => {
    const messages = state.messages;

    if (messages.length <= 3) {
      return; // No changes needed
    }

    const firstMsg = messages[0];
    const recentMessages =
      messages.length % 2 === 0 ? messages.slice(-3) : messages.slice(-4);
    const newMessages = [firstMsg, ...recentMessages];

    return {
      messages: [
        new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
        ...newMessages,
      ],
    };
  },
});

const checkpointer = new MemorySaver();
const agent = createAgent({
  model: "gpt-4.1",
  tools: [],
  middleware: [trimMessages],
  checkpointer,
});
```

### 删除消息 (Delete messages)

您可以从图状态中删除消息以管理消息历史记录。

当您想删除特定消息或清除整个消息历史记录时，这非常有用。

要从图状态中删除消息，您可以使用 `RemoveMessage`。要使 `RemoveMessage` 工作，您需要使用带有 [`messagesStateReducer`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.messagesStateReducer.html) [reducer](/oss/javascript/langgraph/graph-api#reducers) 的状态键，如 `MessagesValue`。

要删除特定消息：

```typescript  theme={null}
import { RemoveMessage } from "@langchain/core/messages";

const deleteMessages = (state) => {
    const messages = state.messages;
    if (messages.length > 2) {
        // remove the earliest two messages
        return {
        messages: messages
            .slice(0, 2)
            .map((m) => new RemoveMessage({ id: m.id })),
        };
    }
};
```

<Warning>
  删除消息时，**确保**生成的消息历史记录是有效的。检查您正在使用的 LLM 提供商的限制。例如：

  * 一些提供商期望消息历史记录以 `user` 消息开始
  * 大多数提供商要求带有工具调用的 `assistant` 消息后跟相应的 `tool` 结果消息。
</Warning>

```typescript  theme={null}
import { RemoveMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const deleteOldMessages = createMiddleware({
  name: "DeleteOldMessages",
  afterModel: (state) => {
    const messages = state.messages;
    if (messages.length > 2) {
      // remove the earliest two messages
      return {
        messages: messages
          .slice(0, 2)
          .map((m) => new RemoveMessage({ id: m.id! })),
      };
    }
    return;
  },
});

const agent = createAgent({
  model: "gpt-4.1",
  tools: [],
  systemPrompt: "Please be concise and to the point.",
  middleware: [deleteOldMessages],
  checkpointer: new MemorySaver(),
});

const config = { configurable: { thread_id: "1" } };

const streamA = await agent.stream(
  { messages: [{ role: "user", content: "hi! I'm bob" }] },
  { ...config, streamMode: "values" }
);
for await (const event of streamA) {
  const messageDetails = event.messages.map((message) => [
    message.getType(),
    message.content,
  ]);
  console.log(messageDetails);
}

const streamB = await agent.stream(
  {
    messages: [{ role: "user", content: "what's my name?" }],
  },
  { ...config, streamMode: "values" }
);
for await (const event of streamB) {
  const messageDetails = event.messages.map((message) => [
    message.getType(),
    message.content,
  ]);
  console.log(messageDetails);
}
```

```
[[ "human", "hi! I'm bob" ]]
[[ "human", "hi! I'm bob" ], [ "ai", "Hello, Bob! How can I assist you today?" ]]
[[ "human", "hi! I'm bob" ], [ "ai", "Hello, Bob! How can I assist you today?" ]]
[[ "human", "hi! I'm bob" ], [ "ai", "Hello, Bob! How can I assist you today" ], ["human", "what's my name?" ]]
[[ "human", "hi! I'm bob" ], [ "ai", "Hello, Bob! How can I assist you today?" ], ["human", "what's my name?"], [ "ai", "Your name is Bob, as you mentioned. How can I help you further?" ]]
[[ "human", "what's my name?" ], [ "ai", "Your name is Bob, as you mentioned. How can I help you further?" ]]
```

### 总结消息 (Summarize messages)

如上所示，修剪或删除消息的问题在于，您可能会因剔除消息队列而丢失信息。
因此，一些应用程序受益于使用聊天模型总结消息历史记录的更复杂的方法。

<img src="https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=c8ed3facdccd4ef5c7e52902c72ba938" alt="Summary" data-og-width="609" width="609" data-og-height="242" height="242" data-path="oss/images/summary.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=280&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=4208b9b0cc9f459f3dc4e5219918471b 280w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=560&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=7acb77c081545f57042368f4e9d0c8cb 560w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=840&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=2fcfdb0c481d2e1d361e76db763a41e5 840w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=1100&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=4abdac693a562788aa0db8681bef8ea7 1100w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=1650&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=40acfefa91dcb11b247a6e4a7705f22b 1650w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=2500&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=8d765aaf7551e8b0fc2720de7d2ac2a8 2500w" />

要在 Agent 中总结消息历史记录，请使用内置的 [`summarizationMiddleware`](/oss/javascript/langchain/middleware#summarization)：

```typescript  theme={null}
import { createAgent, summarizationMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();

const agent = createAgent({
  model: "gpt-4.1",
  tools: [],
  middleware: [
    summarizationMiddleware({
      model: "gpt-4.1-mini",
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
  ],
  checkpointer,
});

const config = { configurable: { thread_id: "1" } };
await agent.invoke({ messages: "hi, my name is bob" }, config);
await agent.invoke({ messages: "write a short poem about cats" }, config);
await agent.invoke({ messages: "now do the same but for dogs" }, config);
const finalResponse = await agent.invoke({ messages: "what's my name?" }, config);

console.log(finalResponse.messages.at(-1)?.content);
// Your name is Bob!
```

有关更多配置选项，请参阅 [`summarizationMiddleware`](/oss/javascript/langchain/middleware#summarization)。

## 访问记忆

您可以通过多种方式访问和修改 Agent 的短期记忆（状态）：

### 工具

#### 在工具中读取短期记忆

使用 `runtime` 参数（类型为 `ToolRuntime`）在工具中访问短期记忆（状态）。

`runtime` 参数在工具签名中是隐藏的（因此模型看不到它），但工具可以通过它访问状态。

```typescript  theme={null}
import { createAgent, tool, type ToolRuntime } from "langchain";
import { StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const CustomState = new StateSchema({
  userId: z.string(),
});

const getUserInfo = tool(
  async (_, config: ToolRuntime<typeof CustomState.State>) => {
    const userId = config.state.userId;
    return userId === "user_123" ? "John Doe" : "Unknown User";
  },
  {
    name: "get_user_info",
    description: "Get user info",
    schema: z.object({}),
  }
);

const agent = createAgent({
  model: "gpt-5-nano",
  tools: [getUserInfo],
  stateSchema: CustomState,
});

const result = await agent.invoke(
  {
    messages: [{ role: "user", content: "what's my name?" }],
    userId: "user_123",
  },
  {
    context: {},
  }
);

console.log(result.messages.at(-1)?.content);
// Outputs: "Your name is John Doe."
```

#### 从工具写入短期记忆

要在执行期间修改 Agent 的短期记忆（状态），您可以直接从工具返回状态更新。

这对于持久化中间结果或使信息可供后续工具或提示使用非常有用。

```typescript  theme={null}
import { tool, createAgent, ToolMessage, type ToolRuntime } from "langchain";
import { Command, StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const CustomState = new StateSchema({
  userId: z.string().optional(),
});

const updateUserInfo = tool(
  async (_, config: ToolRuntime<typeof CustomState.State>) => {
    const userId = config.state.userId;
    const name = userId === "user_123" ? "John Smith" : "Unknown user";
    return new Command({
      update: {
        userName: name,
        // 更新消息历史记录
        messages: [
          new ToolMessage({
            content: "Successfully looked up user information",
            tool_call_id: config.toolCall?.id ?? "",
          }),
        ],
      },
    });
  },
  {
    name: "update_user_info",
    description: "Look up and update user info.",
    schema: z.object({}),
  }
);

const greet = tool(
  async (_, config) => {
    const userName = config.context?.userName;
    return `Hello ${userName}!`;
  },
  {
    name: "greet",
    description: "Use this to greet the user once you found their info.",
    schema: z.object({}),
  }
);

const agent = createAgent({
  model: "openai:gpt-5-mini",
  tools: [updateUserInfo, greet],
  stateSchema: CustomState,
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "greet the user" }],
  userId: "user_123",
});

console.log(result.messages.at(-1)?.content);
// Output: "Hello! I’m here to help — what would you like to do today?"
```

### Prompt (提示)

在中间件中访问短期记忆（状态），以根据对话历史记录或自定义状态字段创建动态提示。

```typescript  theme={null}
import * as z from "zod";
import { createAgent, tool, dynamicSystemPromptMiddleware } from "langchain";

const contextSchema = z.object({
  userName: z.string(),
});
type ContextSchema = z.infer<typeof contextSchema>;

const getWeather = tool(
  async ({ city }) => {
    return `The weather in ${city} is always sunny!`;
  },
  {
    name: "get_weather",
    description: "Get user info",
    schema: z.object({
      city: z.string(),
    }),
  }
);

const agent = createAgent({
  model: "gpt-5-nano",
  tools: [getWeather],
  contextSchema,
  middleware: [
    dynamicSystemPromptMiddleware<ContextSchema>((_, config) => {
      return `You are a helpful assistant. Address the user as ${config.context?.userName}.`;
    }),
  ],
});

const result = await agent.invoke(
  {
    messages: [{ role: "user", content: "What is the weather in SF?" }],
  },
  {
    context: {
      userName: "John Smith",
    },
  }
);

for (const message of result.messages) {
  console.log(message);
}
/**
 * HumanMessage {
 *   "content": "What is the weather in SF?",
 *   // ...
 * }
 * AIMessage {
 *   // ...
 *   "tool_calls": [
 *     {
 *       "name": "get_weather",
 *       "args": {
 *         "city": "San Francisco"
 *       },
 *       "type": "tool_call",
 *       "id": "call_tCidbv0apTpQpEWb3O2zQ4Yx"
 *     }
 *   ],
 *   // ...
 * }
 * ToolMessage {
 *   "content": "The weather in San Francisco is always sunny!",
 *   "tool_call_id": "call_tCidbv0apTpQpEWb3O2zQ4Yx"
 *   // ...
 * }
 * AIMessage {
 *   "content": "John Smith, here's the latest: The weather in San Francisco is always sunny!\n\nIf you'd like more details (temperature, wind, humidity) or a forecast for the next few days, I can pull that up. What would you like?",
 *   // ...
 * }
 */
```

### Before model (模型前)

```mermaid  theme={null}
%%{
    init: {
        "fontFamily": "monospace",
        "flowchart": {
        "curve": "basis"
        },
        "themeVariables": {"edgeLabelBackground": "transparent"}
    }
}%%
graph TD
    S(["\_\_start\_\_"])
    PRE(before_model)
    MODEL(model)
    TOOLS(tools)
    END(["\_\_end\_\_"])
    S --> PRE
    PRE --> MODEL
    MODEL -.-> TOOLS
    MODEL -.-> END
    TOOLS --> PRE
    classDef blueHighlight fill:#0a1c25,stroke:#0a455f,color:#bae6fd;
    class S blueHighlight;
    class END blueHighlight;
```

```typescript  theme={null}
import { RemoveMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware, trimMessages } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

const trimMessageHistory = createMiddleware({
  name: "TrimMessages",
  beforeModel: async (state) => {
    const trimmed = await trimMessages(state.messages, {
      maxTokens: 384,
      strategy: "last",
      startOn: "human",
      endOn: ["human", "tool"],
      tokenCounter: (msgs) => msgs.length,
    });
    return {
      messages: [new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), ...trimmed],
    };
  },
});

const checkpointer = new MemorySaver();
const agent = createAgent({
  model: "gpt-5-nano",
  tools: [],
  middleware: [trimMessageHistory],
  checkpointer,
});
```

### After model (模型后)

```mermaid  theme={null}
%%{
    init: {
        "fontFamily": "monospace",
        "flowchart": {
        "curve": "basis"
        },
        "themeVariables": {"edgeLabelBackground": "transparent"}
    }
}%%
graph TD
    S(["\_\_start\_\_"])
    MODEL(model)
    POST(after_model)
    TOOLS(tools)
    END(["\_\_end\_\_"])
    S --> MODEL
    MODEL --> POST
    POST -.-> END
    POST -.-> TOOLS
    TOOLS --> MODEL
    classDef blueHighlight fill:#0a1c25,stroke:#0a455f,color:#bae6fd;
    class S blueHighlight;
    class END blueHighlight;
    class POST greenHighlight;
```

```typescript  theme={null}
import { RemoveMessage } from "@langchain/core/messages";
import { createAgent, createMiddleware } from "langchain";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

const validateResponse = createMiddleware({
  name: "ValidateResponse",
  afterModel: (state) => {
    const lastMessage = state.messages.at(-1)?.content;
    if (
      typeof lastMessage === "string" &&
      lastMessage.toLowerCase().includes("confidential")
    ) {
      return {
        messages: [
          new RemoveMessage({ id: REMOVE_ALL_MESSAGES }),
        ],
      };
    }
    return;
  },
});

const agent = createAgent({
  model: "gpt-5-nano",
  tools: [],
  middleware: [validateResponse],
});
```

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/short-term-memory.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Tip icon="terminal" iconType="regular">
  [将这些文档连接](/use-these-docs) 到 Claude、VSCode 等，通过 MCP 获取实时答案。
</Tip>
