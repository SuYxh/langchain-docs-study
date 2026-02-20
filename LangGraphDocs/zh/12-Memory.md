> ## 文档索引
> 在此获取完整的文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用该文件发现所有可用页面。

# 记忆

AI 应用需要[记忆](/oss/javascript/concepts/memory)在多轮交互之间共享上下文。在 LangGraph 中，你可以添加两种类型的记忆：

* [添加短期记忆](#add-short-term-memory)：将其作为智能体[状态](/oss/javascript/langgraph/graph-api#state)的一部分，以支持多轮对话。
* [添加长期记忆](#add-long-term-memory)：跨会话存储用户特定或应用级数据。

## 添加短期记忆

**短期**记忆（线程级[持久化](/oss/javascript/langgraph/persistence)）使智能体能够跟踪多轮对话。要添加短期记忆：

```typescript  theme={null}
import { MemorySaver, StateGraph } from "@langchain/langgraph";

const checkpointer = new MemorySaver();

const builder = new StateGraph(...);
const graph = builder.compile({ checkpointer });

await graph.invoke(
  { messages: [{ role: "user", content: "嗨！我叫 Bob" }] },
  { configurable: { thread_id: "1" } }
);
```

### 在生产环境中使用

在生产环境中，使用由数据库支撑的 checkpointer：

```typescript  theme={null}
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable";
const checkpointer = PostgresSaver.fromConnString(DB_URI);

const builder = new StateGraph(...);
const graph = builder.compile({ checkpointer });
```

<Accordion title="示例：使用 Postgres checkpointer">
  ```
  npm install @langchain/langgraph-checkpoint-postgres
  ```

  <Tip>
    第一次使用 Postgres checkpointer 时，你需要调用 `checkpointer.setup()`
  </Tip>

  ```typescript  theme={null}
  import { ChatAnthropic } from "@langchain/anthropic";
  import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";
  import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

  const State = new StateSchema({
    messages: MessagesValue,
  });

  const model = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });

  const DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable";
  const checkpointer = PostgresSaver.fromConnString(DB_URI);
  // await checkpointer.setup();

  const callModel: GraphNode<typeof State> = async (state) => {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  };

  const builder = new StateGraph(State)
    .addNode("call_model", callModel)
    .addEdge(START, "call_model");

  const graph = builder.compile({ checkpointer });

  const config = {
    configurable: {
      thread_id: "1"
    }
  };

  for await (const chunk of await graph.stream(
    { messages: [{ role: "user", content: "嗨！我叫 Bob" }] },
    { ...config, streamMode: "values" }
  )) {
    console.log(chunk.messages.at(-1)?.content);
  }

  for await (const chunk of await graph.stream(
    { messages: [{ role: "user", content: "我叫什么名字？" }] },
    { ...config, streamMode: "values" }
  )) {
    console.log(chunk.messages.at(-1)?.content);
  }
  ```
</Accordion>

### 在子图中使用

如果你的图包含[子图](/oss/javascript/langgraph/use-subgraphs)，你只需要在编译父图时提供 checkpointer。LangGraph 会自动将 checkpointer 传播到子图中。

```typescript  theme={null}
import { StateGraph, StateSchema, START, MemorySaver } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({ foo: z.string() });

const subgraphBuilder = new StateGraph(State)
  .addNode("subgraph_node_1", (state) => {
    return { foo: state.foo + "bar" };
  })
  .addEdge(START, "subgraph_node_1");
const subgraph = subgraphBuilder.compile();

const builder = new StateGraph(State)
  .addNode("node_1", subgraph)
  .addEdge(START, "node_1");

const checkpointer = new MemorySaver();
const graph = builder.compile({ checkpointer });
```

如果你希望子图拥有它自己的记忆，可以在编译子图时使用合适的 checkpointer 选项。这在[多智能体](/oss/javascript/langchain/multi-agent)系统中很有用，例如你希望智能体跟踪其内部消息历史。

```typescript  theme={null}
const subgraphBuilder = new StateGraph(...);
const subgraph = subgraphBuilder.compile({ checkpointer: true });  // [!code highlight]
```

## 添加长期记忆

使用长期记忆来跨对话存储用户特定或应用特定的数据。

```typescript  theme={null}
import { InMemoryStore, StateGraph } from "@langchain/langgraph";

const store = new InMemoryStore();

const builder = new StateGraph(...);
const graph = builder.compile({ store });
```

### 在节点内部访问 store

当你使用 store 编译图之后，LangGraph 会自动将 store 注入到你的节点函数中。推荐的访问方式是通过 `Runtime` 对象。

```typescript  theme={null}
import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";

const State = new StateSchema({
  messages: MessagesValue,
});

const callModel: GraphNode<typeof State> = async (state, runtime) => {
  const userId = runtime.context?.userId;
  const namespace = [userId, "memories"];

  // 搜索相关记忆
  const memories = await runtime.store?.search(namespace, {
    query: state.messages.at(-1)?.content,
    limit: 3,
  });
  const info = memories?.map((d) => d.value.data).join("\n") || "";

  // ... 在模型调用中使用 memories

  // 存储一条新的记忆
  await runtime.store?.put(namespace, uuidv4(), { data: "用户偏好深色模式" });
};

const builder = new StateGraph(State)
  .addNode("call_model", callModel)
  .addEdge(START, "call_model");
const graph = builder.compile({ store });

// 在调用时传入 context
await graph.invoke(
  { messages: [{ role: "user", content: "嗨" }] },
  { configurable: { thread_id: "1" }, context: { userId: "1" } }
);
```

### 在生产环境中使用

在生产环境中，使用由数据库支撑的 store：

```typescript  theme={null}
import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";

const DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable";
const store = PostgresStore.fromConnString(DB_URI);

const builder = new StateGraph(...);
const graph = builder.compile({ store });
```

<Accordion title="示例：使用 Postgres store">
  ```
  npm install @langchain/langgraph-checkpoint-postgres
  ```

  <Tip>
    第一次使用 Postgres store 时，你需要调用 `store.setup()`
  </Tip>

  ```typescript  theme={null}
  import { ChatAnthropic } from "@langchain/anthropic";
  import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";
  import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
  import { PostgresStore } from "@langchain/langgraph-checkpoint-postgres/store";
  import { v4 as uuidv4 } from "uuid";

  const State = new StateSchema({
    messages: MessagesValue,
  });

  const model = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });

  const callModel: GraphNode<typeof State> = async (state, runtime) => {
    const userId = runtime.context?.userId;
    const namespace = ["memories", userId];
    const memories = await runtime.store?.search(namespace, { query: state.messages.at(-1)?.content });
    const info = memories?.map(d => d.value.data).join("\n") || "";
    const systemMsg = `你是一个与用户对话的有帮助的助手。用户信息：${info}`;

    // 如果用户要求模型记住信息，则存储新的记忆
    const lastMessage = state.messages.at(-1);
    if (lastMessage?.content?.toLowerCase().includes("remember")) {
      const memory = "用户名字是 Bob";
      await runtime.store?.put(namespace, uuidv4(), { data: memory });
    }

    const response = await model.invoke([
      { role: "system", content: systemMsg },
      ...state.messages
    ]);
    return { messages: [response] };
  };

  const DB_URI = "postgresql://postgres:postgres@localhost:5442/postgres?sslmode=disable";

  const store = PostgresStore.fromConnString(DB_URI);
  const checkpointer = PostgresSaver.fromConnString(DB_URI);
  // await store.setup();
  // await checkpointer.setup();

  const builder = new StateGraph(State)
    .addNode("call_model", callModel)
    .addEdge(START, "call_model");

  const graph = builder.compile({
    checkpointer,
    store,
  });

  for await (const chunk of await graph.stream(
    { messages: [{ role: "user", content: "你好！记住：我叫 Bob" }] },
    { configurable: { thread_id: "1" }, context: { userId: "1" }, streamMode: "values" }
  )) {
    console.log(chunk.messages.at(-1)?.content);
  }

  for await (const chunk of await graph.stream(
    { messages: [{ role: "user", content: "我叫什么名字？" }] },
    { configurable: { thread_id: "2" }, context: { userId: "1" }, streamMode: "values" }
  )) {
    console.log(chunk.messages.at(-1)?.content);
  }
  ```
</Accordion>

### 使用语义检索

在图的记忆 store 中启用语义检索，使图的智能体能够按语义相似度搜索 store 中的条目。

```typescript  theme={null}
import { OpenAIEmbeddings } from "@langchain/openai";
import { InMemoryStore } from "@langchain/langgraph";

// 创建启用语义检索的 store
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
const store = new InMemoryStore({
  index: {
    embeddings,
    dims: 1536,
  },
});

await store.put(["user_123", "memories"], "1", { text: "我喜欢披萨" });
await store.put(["user_123", "memories"], "2", { text: "我是一名水管工" });

const items = await store.search(["user_123", "memories"], {
  query: "我饿了",
  limit: 1,
});
```

<Accordion title="带语义检索的长期记忆">
  ```typescript  theme={null}
  import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
  import { StateGraph, StateSchema, MessagesValue, GraphNode, START, InMemoryStore } from "@langchain/langgraph";

  const State = new StateSchema({
    messages: MessagesValue,
  });

  const model = new ChatOpenAI({ model: "gpt-4.1-mini" });

  // 创建启用语义检索的 store
  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  const store = new InMemoryStore({
    index: {
      embeddings,
      dims: 1536,
    }
  });

  await store.put(["user_123", "memories"], "1", { text: "我喜欢披萨" });
  await store.put(["user_123", "memories"], "2", { text: "我是一名水管工" });

  const chat: GraphNode<typeof State> = async (state, runtime) => {
    // 基于用户的最后一条消息进行搜索
    const items = await runtime.store.search(
      ["user_123", "memories"],
      { query: state.messages.at(-1)?.content, limit: 2 }
    );
    const memories = items.map(item => item.value.text).join("\n");
    const memoriesText = memories ? `## 用户的记忆\n${memories}` : "";

    const response = await model.invoke([
      { role: "system", content: `你是一个有帮助的助手。\n${memoriesText}` },
      ...state.messages,
    ]);

    return { messages: [response] };
  };

  const builder = new StateGraph(State)
    .addNode("chat", chat)
    .addEdge(START, "chat");
  const graph = builder.compile({ store });

  for await (const [message, metadata] of await graph.stream(
    { messages: [{ role: "user", content: "我饿了" }] },
    { streamMode: "messages" }
  )) {
    if (message.content) {
      console.log(message.content);
    }
  }
  ```
</Accordion>

## 管理短期记忆

启用[短期记忆](#add-short-term-memory)后，长对话可能会超过大语言模型的上下文窗口。常见解决方案包括：

* [裁剪消息](#trim-messages)：移除最前或最后的 N 条消息（在调用大语言模型之前）
* [删除消息](#delete-messages)：从 LangGraph 状态中永久删除消息
* [总结消息](#summarize-messages)：总结历史中较早的消息，并用摘要替换它们
* [管理检查点](#manage-checkpoints)：存储并检索消息历史
* 自定义策略（例如消息过滤等）

这使智能体能够在不超出大语言模型上下文窗口的前提下跟踪对话。

### 裁剪消息

大多数大语言模型都有最大支持的上下文窗口（以 token 计）。决定何时截断消息的一种方式是统计消息历史中的 token 数，并在其接近上限时进行截断。如果你在使用 LangChain，可以使用裁剪消息（trim messages）工具，并指定要从列表中保留的 token 数量，以及用于处理边界的 `strategy`（例如保留最后 `maxTokens` 个 token）。

要裁剪消息历史，使用 [`trimMessages`](https://js.langchain.com/docs/how_to/trim_messages/) 函数：

```typescript  theme={null}
import { trimMessages } from "@langchain/core/messages";
import { StateSchema, MessagesValue, GraphNode } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const callModel: GraphNode<typeof State> = async (state) => {
  const messages = trimMessages(state.messages, {
    strategy: "last",
    maxTokens: 128,
    startOn: "human",
    endOn: ["human", "tool"],
  });
  const response = await model.invoke(messages);
  return { messages: [response] };
};

const builder = new StateGraph(State)
  .addNode("call_model", callModel);
  // ...
```

<Accordion title="完整示例：裁剪消息">
  ```typescript  theme={null}
  import { trimMessages } from "@langchain/core/messages";
  import { ChatAnthropic } from "@langchain/anthropic";
  import { StateGraph, StateSchema, MessagesValue, GraphNode, START, MemorySaver } from "@langchain/langgraph";

  const State = new StateSchema({
    messages: MessagesValue,
  });

  const model = new ChatAnthropic({ model: "claude-3-5-sonnet-20241022" });

  const callModel: GraphNode<typeof State> = async (state) => {
    const messages = trimMessages(state.messages, {
      strategy: "last",
      maxTokens: 128,
      startOn: "human",
      endOn: ["human", "tool"],
      tokenCounter: model,
    });
    const response = await model.invoke(messages);
    return { messages: [response] };
  };

  const checkpointer = new MemorySaver();
  const builder = new StateGraph(State)
    .addNode("call_model", callModel)
    .addEdge(START, "call_model");
  const graph = builder.compile({ checkpointer });

  const config = { configurable: { thread_id: "1" } };
  await graph.invoke({ messages: [{ role: "user", content: "嗨，我叫 Bob" }] }, config);
  await graph.invoke({ messages: [{ role: "user", content: "写一首关于猫的短诗" }] }, config);
  await graph.invoke({ messages: [{ role: "user", content: "现在也为狗写一首同样风格的" }] }, config);
  const finalResponse = await graph.invoke({ messages: [{ role: "user", content: "我叫什么名字？" }] }, config);

  console.log(finalResponse.messages.at(-1)?.content);
  ```

  ```
  你的名字是 Bob，你在最开始自我介绍时提到过。
  ```
</Accordion>

### 删除消息

你可以从图状态中删除消息以管理消息历史。当你想移除特定消息或清空整个消息历史时，这会很有用。

要从图状态中删除消息，可以使用 `RemoveMessage`。为了让 `RemoveMessage` 生效，你需要在 state 中使用一个带有 [`messagesStateReducer`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.messagesStateReducer.html) 的[reducer](/oss/javascript/langgraph/graph-api#reducers) 的键，例如 `MessagesValue`。

要移除特定消息：

```typescript  theme={null}
import { RemoveMessage } from "@langchain/core/messages";

const deleteMessages = (state) => {
  const messages = state.messages;
  if (messages.length > 2) {
    // 移除最早的两条消息
    return {
      messages: messages
        .slice(0, 2)
        .map((m) => new RemoveMessage({ id: m.id })),
    };
  }
};
```

<Warning>
  删除消息时，**务必确保**得到的消息历史是有效的。请检查你所使用的大语言模型提供方的限制。例如：

  * 某些提供方要求消息历史以 `user` 消息开头
  * 大多数提供方要求带有工具调用的 `assistant` 消息后面必须跟随对应的 `tool` 结果消息。
</Warning>

<Accordion title="完整示例：删除消息">
  ```typescript  theme={null}
  import { RemoveMessage } from "@langchain/core/messages";
  import { ChatAnthropic } from "@langchain/anthropic";
  import { StateGraph, StateSchema, MessagesValue, GraphNode, START, MemorySaver } from "@langchain/langgraph";

  const State = new StateSchema({
    messages: MessagesValue,
  });

  const model = new ChatAnthropic({ model: "claude-3-5-sonnet-20241022" });

  const deleteMessages: GraphNode<typeof State> = (state) => {
    const messages = state.messages;
    if (messages.length > 2) {
      // 移除最早的两条消息
      return { messages: messages.slice(0, 2).map(m => new RemoveMessage({ id: m.id })) };
    }
    return {};
  };

  const callModel: GraphNode<typeof State> = async (state) => {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  };

  const builder = new StateGraph(State)
    .addNode("call_model", callModel)
    .addNode("delete_messages", deleteMessages)
    .addEdge(START, "call_model")
    .addEdge("call_model", "delete_messages");

  const checkpointer = new MemorySaver();
  const app = builder.compile({ checkpointer });

  const config = { configurable: { thread_id: "1" } };

  for await (const event of await app.stream(
    { messages: [{ role: "user", content: "嗨！我叫 Bob" }] },
    { ...config, streamMode: "values" }
  )) {
    console.log(event.messages.map(message => [message.getType(), message.content]));
  }

  for await (const event of await app.stream(
    { messages: [{ role: "user", content: "我叫什么名字？" }] },
    { ...config, streamMode: "values" }
  )) {
    console.log(event.messages.map(message => [message.getType(), message.content]));
  }
  ```

  ```
  [['human', "嗨！我叫 Bob"]]
  [['human', "嗨！我叫 Bob"], ['ai', '你好，Bob！你今天怎么样？有什么我可以帮你的吗？']]
  [['human', "嗨！我叫 Bob"], ['ai', '你好，Bob！你今天怎么样？有什么我可以帮你的吗？'], ['human', "我叫什么名字？"]]
  [['human', "嗨！我叫 Bob"], ['ai', '你好，Bob！你今天怎么样？有什么我可以帮你的吗？'], ['human', "我叫什么名字？"], ['ai', '你叫 Bob。']]
  [['human', "我叫什么名字？"], ['ai', '你叫 Bob。']]
  ```
</Accordion>

### 总结消息

如上所示，裁剪或移除消息的问题在于，你可能会因为裁剪消息队列而丢失信息。正因如此，一些应用会受益于更复杂的方法：使用聊天模型来总结消息历史。

<img src="https://qn.huat.xyz/mac/202602201641287.png" alt="摘要" data-og-width="609" width="609" data-og-height="242" height="242" data-path="oss/images/summary.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=280&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=4208b9b0cc9f459f3dc4e5219918471b 280w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=560&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=7acb77c081545f57042368f4e9d0c8cb 560w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=840&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=2fcfdb0c481d2e1d361e76db763a41e5 840w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=1100&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=4abdac693a562788aa0db8681bef8ea7 1100w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=1650&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=40acfefa91dcb11b247a6e4a7705f22b 1650w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/summary.png?w=2500&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=8d765aaf7551e8b0fc2720de7d2ac2a8 2500w" />

可以使用提示词与编排逻辑来总结消息历史。例如，在 LangGraph 中，你可以在 state 里与 `messages` 键并列加入一个 `summary` 键：

```typescript  theme={null}
import { StateSchema, MessagesValue, GraphNode } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({
  messages: MessagesValue,
  summary: z.string().optional(),
});
```

然后，你可以生成对话历史的摘要，并把已有摘要作为上下文用于生成下一次摘要。该 `summarizeConversation` 节点可以在 `messages` state 键中累积到一定数量的消息后被调用。

```typescript  theme={null}
import { RemoveMessage, HumanMessage } from "@langchain/core/messages";

const summarizeConversation: GraphNode<typeof State> = async (state) => {
  // 首先，获取已有摘要（如果存在）
  const summary = state.summary || "";

  // 创建我们的总结提示词
  let summaryMessage: string;
  if (summary) {
    // 已经存在摘要
    summaryMessage =
      `这是截至目前的对话摘要：${summary}\n\n` +
      "请结合上面的新消息，扩展该摘要：";
  } else {
    summaryMessage = "请为上面的对话创建摘要：";
  }

  // 将提示词加入到历史中
  const messages = [
    ...state.messages,
    new HumanMessage({ content: summaryMessage })
  ];
  const response = await model.invoke(messages);

  // 删除除最近 2 条之外的所有消息
  const deleteMessages = state.messages
    .slice(0, -2)
    .map(m => new RemoveMessage({ id: m.id }));

  return {
    summary: response.content,
    messages: deleteMessages
  };
};
```

<Accordion title="完整示例：总结消息">
  ```typescript  theme={null}
  import { ChatAnthropic } from "@langchain/anthropic";
  import {
    SystemMessage,
    HumanMessage,
    RemoveMessage,
  } from "@langchain/core/messages";
  import {
    StateGraph,
    StateSchema,
    MessagesValue,
    GraphNode,
    ConditionalEdgeRouter,
    START,
    END,
    MemorySaver,
  } from "@langchain/langgraph";
  import * as z from "zod";
  import { v4 as uuidv4 } from "uuid";

  const memory = new MemorySaver();

  // 我们将添加一个 `summary` 属性（除了 `messages` 键之外）
  const GraphState = new StateSchema({
    messages: MessagesValue,
    summary: z.string().default(""),
  });

  // 我们将使用同一个模型来进行对话与总结
  const model = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });

  // 定义调用模型的逻辑
  const callModel: GraphNode<typeof GraphState> = async (state) => {
    // 如果存在摘要，将其作为 system message 加入
    const { summary } = state;
    let { messages } = state;
    if (summary) {
      const systemMessage = new SystemMessage({
        id: uuidv4(),
        content: `先前对话的摘要：${summary}`,
      });
      messages = [systemMessage, ...messages];
    }
    const response = await model.invoke(messages);
    // 返回一个对象，因为它会被添加到现有 state 中
    return { messages: [response] };
  };

  // 定义用于判断是结束还是总结对话的逻辑
  const shouldContinue: ConditionalEdgeRouter<typeof GraphState, "summarize_conversation"> = (state) => {
    const messages = state.messages;
    // 如果消息超过六条，则总结对话
    if (messages.length > 6) {
      return "summarize_conversation";
    }
    // 否则直接结束
    return END;
  };

  const summarizeConversation: GraphNode<typeof GraphState> = async (state) => {
    // 首先，总结对话
    const { summary, messages } = state;
    let summaryMessage: string;
    if (summary) {
      // 如果已经存在摘要，我们会使用与没有摘要时不同的 system prompt
      // 来对其进行总结扩展
      summaryMessage =
        `这是截至目前的对话摘要：${summary}\n\n` +
        "请结合上面的新消息，扩展该摘要：";
    } else {
      summaryMessage = "请为上面的对话创建摘要：";
    }

    const allMessages = [
      ...messages,
      new HumanMessage({ id: uuidv4(), content: summaryMessage }),
    ];

    const response = await model.invoke(allMessages);

    // 删除那些我们不再希望出现的消息
    // 这里我会删除除最后两条之外的所有消息，你可以自行调整
    const deleteMessages = messages
      .slice(0, -2)
      .map((m) => new RemoveMessage({ id: m.id! }));

    if (typeof response.content !== "string") {
      throw new Error("期望模型返回一个字符串响应");
    }

    return { summary: response.content, messages: deleteMessages };
  };

  // 定义一张新的图
  const workflow = new StateGraph(GraphState)
    // 定义对话节点与总结节点
    .addNode("conversation", callModel)
    .addNode("summarize_conversation", summarizeConversation)
    // 将入口点设置为 conversation
    .addEdge(START, "conversation")
    // 添加一条条件边
    .addConditionalEdges(
      // 首先，定义起始节点。这里使用 `conversation`。
      // 这意味着这些边会在 `conversation` 节点被调用后被选择。
      "conversation",
      // 接下来，传入用于决定下一步调用哪个节点的函数
      shouldContinue,
    )
    // 添加一条从 `summarize_conversation` 到 END 的普通边。
    // 这意味着在 `summarize_conversation` 被调用后，我们会结束。
    .addEdge("summarize_conversation", END);

  // 最后，编译！
  const app = workflow.compile({ checkpointer: memory });
  ```
</Accordion>

### 管理检查点

你可以查看并删除 checkpointer 存储的信息。

<a id="checkpoint" />

#### 查看线程状态

```typescript  theme={null}
const config = {
  configurable: {
    thread_id: "1",
    // 可选：为特定检查点提供 ID，
    // 否则将展示最新的检查点
    // checkpoint_id: "1f029ca3-1f5b-6704-8004-820c16b69a5a"
  },
};
await graph.getState(config);
```

```
{
  values: { messages: [HumanMessage(...), AIMessage(...), HumanMessage(...), AIMessage(...)] },
  next: [],
  config: { configurable: { thread_id: '1', checkpoint_ns: '', checkpoint_id: '1f029ca3-1f5b-6704-8004-820c16b69a5a' } },
  metadata: {
    source: 'loop',
    writes: { call_model: { messages: AIMessage(...) } },
    step: 4,
    parents: {},
    thread_id: '1'
  },
  createdAt: '2025-05-05T16:01:24.680462+00:00',
  parentConfig: { configurable: { thread_id: '1', checkpoint_ns: '', checkpoint_id: '1f029ca3-1790-6b0a-8003-baf965b6a38f' } },
  tasks: [],
  interrupts: []
}
```

<a id="checkpoints" />

#### 查看线程历史

```typescript  theme={null}
const config = {
  configurable: {
    thread_id: "1",
  },
};

const history = [];
for await (const state of graph.getStateHistory(config)) {
  history.push(state);
}
```

#### 删除线程的所有检查点

```typescript  theme={null}
const threadId = "1";
await checkpointer.deleteThread(threadId);
```

## 数据库管理

如果你使用任何由数据库支撑的持久化实现（例如 Postgres 或 Redis）来存储短期和/或长期记忆，那么在与数据库一起使用之前，你需要运行迁移（migrations）来创建所需的 schema。

按照惯例，大多数数据库相关的库会在 checkpointer 或 store 实例上定义一个 `setup()` 方法，用于运行所需的迁移。不过，你仍然应当查看你所使用的 [`BaseCheckpointSaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.BaseCheckpointSaver.html) 或 [`BaseStore`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.BaseStore.html) 的具体实现，以确认准确的方法名与用法。

我们建议将迁移作为独立的部署步骤来运行，或者确保它们会在服务器启动过程中被执行。

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/add-memory.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
