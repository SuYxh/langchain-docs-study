> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# 流式输出（Streaming）

LangGraph 实现了一套流式系统，用于对外暴露实时更新。流式输出对于提升基于 LLM 构建的应用的响应性至关重要。通过逐步展示输出（即使完整响应尚未准备就绪），流式输出能显著改善用户体验（UX），尤其是在需要应对 LLM 延迟时。

LangGraph 流式输出可以实现的能力包括：

* <Icon icon="share" size={16} /> [**流式输出图状态**](#stream-graph-state) —— 使用 `updates` 与 `values` 模式获取状态更新 / 状态值。
* <Icon icon="chart-bar" size={16} /> [**流式输出子图结果**](#stream-subgraph-outputs) —— 同时包含父图与任意嵌套子图的输出。
* <Icon icon="binary" size={16} /> [**流式输出 LLM tokens**](#messages) —— 在任意位置捕获 token 流：节点、子图或工具内部均可。
* <Icon icon="table" size={16} /> [**流式输出自定义数据**](#stream-custom-data) —— 直接从工具函数发送自定义更新或进度信号。
* <Icon icon="stack-push" size={16} /> [**使用多个流式模式**](#stream-multiple-modes) —— 可选择 `values`（完整状态）、`updates`（状态增量）、`messages`（LLM tokens + 元数据）、`custom`（任意用户数据）或 `debug`（详细追踪信息）。

## 支持的 stream modes

向 [`stream`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#stream) 方法传入下列一个或多个 stream mode（以列表形式）：

| 模式       | 说明                                                         |
| ---------- | ------------------------------------------------------------ |
| `values`   | 在图的每一步之后流式输出 state 的完整值。                     |
| `updates`  | 在图的每一步之后流式输出 state 的更新（增量）。如果同一步中发生多个更新（例如运行了多个节点），这些更新会被分别流式输出。 |
| `custom`   | 从你的图节点内部流式输出自定义数据。                          |
| `messages` | 从任何调用了 LLM 的图节点流式输出 2 元组（LLM token，元数据）。 |
| `debug`    | 在图的整个执行过程中尽可能流式输出更多信息。                  |

## 基本用法示例

LangGraph 图暴露了 [`stream`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#stream) 方法，用于以迭代器形式产出流式输出。

```typescript  theme={null}
for await (const chunk of await graph.stream(inputs, {
  streamMode: "updates",
})) {
  console.log(chunk);
}
```

<Accordion title="扩展示例：流式输出 updates">
  ```typescript  theme={null}
  import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
  import { z } from "zod/v4";

  const State = new StateSchema({
    topic: z.string(),
    joke: z.string(),
  });

  const graph = new StateGraph(State)
    .addNode("refineTopic", (state) => {
      return { topic: state.topic + " and cats" };
    })
    .addNode("generateJoke", (state) => {
      return { joke: `这是一个关于 ${state.topic} 的笑话` };
    })
    .addEdge(START, "refineTopic")
    .addEdge("refineTopic", "generateJoke")
    .addEdge("generateJoke", END)
    .compile();

  for await (const chunk of await graph.stream(
    { topic: "ice cream" },
    // 将 streamMode 设为 "updates"，以便在每个节点之后只流式输出图状态的更新
    // 也支持其他 stream mode。详见“支持的 stream modes”
    { streamMode: "updates" }
  )) {
    console.log(chunk);
  }
  ```

  ```python  theme={null}
  {'refineTopic': {'topic': 'ice cream and cats'}}
  {'generateJoke': {'joke': '这是一个关于 ice cream and cats 的笑话'}}
  ```
</Accordion>

## 流式输出多个模式

你可以将数组作为 `streamMode` 参数，以同时流式输出多个模式。

流式输出将是 `[mode, chunk]` 形式的元组，其中 `mode` 是 stream mode 名称，`chunk` 是该模式流式输出的数据。

```typescript  theme={null}
for await (const [mode, chunk] of await graph.stream(inputs, {
  streamMode: ["updates", "custom"],
})) {
  console.log(chunk);
}
```

## 流式输出图状态

使用 `updates` 与 `values` 两种 stream mode 在图执行过程中流式输出图状态。

* `updates` 在图的每一步之后流式输出 state 的**更新**。
* `values` 在图的每一步之后流式输出 state 的**完整值**。

```typescript  theme={null}
import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({
  topic: z.string(),
  joke: z.string(),
});

const graph = new StateGraph(State)
  .addNode("refineTopic", (state) => {
    return { topic: state.topic + " and cats" };
  })
  .addNode("generateJoke", (state) => {
    return { joke: `这是一个关于 ${state.topic} 的笑话` };
  })
  .addEdge(START, "refineTopic")
  .addEdge("refineTopic", "generateJoke")
  .addEdge("generateJoke", END)
  .compile();
```

<Tabs>
  <Tab title="updates">
    用于在每一步之后仅流式输出节点返回的**状态更新**。流式输出包含节点名称以及更新内容。

    ```typescript  theme={null}
    for await (const chunk of await graph.stream(
      { topic: "ice cream" },
      { streamMode: "updates" }
    )) {
      console.log(chunk);
    }
    ```
  </Tab>

  <Tab title="values">
    用于在每一步之后流式输出图的**完整状态**。

    ```typescript  theme={null}
    for await (const chunk of await graph.stream(
      { topic: "ice cream" },
      { streamMode: "values" }
    )) {
      console.log(chunk);
    }
    ```
  </Tab>
</Tabs>

## 流式输出子图结果

要在流式输出中包含 [子图](/oss/javascript/langgraph/use-subgraphs) 的输出，你可以在父图的 `.stream()` 方法中设置 `subgraphs: true`。这会同时流式输出父图与任意子图的输出。

输出会以 `[namespace, data]` 形式的元组流式输出，其中 `namespace` 是一个元组，表示调用子图的节点路径，例如 `["parent_node:<task_id>", "child_node:<task_id>"]`。

```typescript  theme={null}
for await (const chunk of await graph.stream(
  { foo: "foo" },
  {
    // 将 subgraphs 设为 true，以便流式输出子图的结果
    subgraphs: true,
    streamMode: "updates",
  }
)) {
  console.log(chunk);
}
```

<Accordion title="扩展示例：从子图流式输出">
  ```typescript  theme={null}
  import { StateGraph, StateSchema, START } from "@langchain/langgraph";
  import { z } from "zod/v4";

  // 定义子图
  const SubgraphState = new StateSchema({
    foo: z.string(), // 注意：该 key 与父图的状态共享
    bar: z.string(),
  });

  const subgraphBuilder = new StateGraph(SubgraphState)
    .addNode("subgraphNode1", (state) => {
      return { bar: "bar" };
    })
    .addNode("subgraphNode2", (state) => {
      return { foo: state.foo + state.bar };
    })
    .addEdge(START, "subgraphNode1")
    .addEdge("subgraphNode1", "subgraphNode2");
  const subgraph = subgraphBuilder.compile();

  // 定义父图
  const ParentState = new StateSchema({
    foo: z.string(),
  });

  const builder = new StateGraph(ParentState)
    .addNode("node1", (state) => {
      return { foo: "你好！" + state.foo };
    })
    .addNode("node2", subgraph)
    .addEdge(START, "node1")
    .addEdge("node1", "node2");
  const graph = builder.compile();

  for await (const chunk of await graph.stream(
    { foo: "foo" },
    {
      streamMode: "updates",
      // 将 subgraphs 设为 true，以便流式输出子图的结果
      subgraphs: true,
    }
  )) {
    console.log(chunk);
  }
  ```

  ```
  [[], {'node1': {'foo': '你好！foo'}}]
  [['node2:dfddc4ba-c3c5-6887-5012-a243b5b377c2'], {'subgraphNode1': {'bar': 'bar'}}]
  [['node2:dfddc4ba-c3c5-6887-5012-a243b5b377c2'], {'subgraphNode2': {'foo': '你好！foobar'}}]
  [[], {'node2': {'foo': '你好！foobar'}}]
  ```

  **注意**：我们收到的不仅是节点更新，还包括命名空间（namespace），它告诉我们正在从哪个图（或子图）流式输出。
</Accordion>

<a id="debug" />

### 调试（Debugging）

使用 `debug` stream mode 在图执行过程中尽可能流式输出更多信息。流式输出包含节点名称以及完整状态。

```typescript  theme={null}
for await (const chunk of await graph.stream(
  { topic: "ice cream" },
  { streamMode: "debug" }
)) {
  console.log(chunk);
}
```

<a id="messages" />

## LLM tokens

使用 `messages` stream mode，从图的任意位置（包括节点、工具、子图或 task）逐 token 流式输出大语言模型（LLM）结果。

来自 [`messages` mode](#supported-stream-modes) 的流式输出是一个 `[message_chunk, metadata]` 元组，其中：

* `message_chunk`：来自 LLM 的 token 或消息片段。
* `metadata`：一个字典，包含关于图节点与 LLM 调用的详细信息。

> 如果你的 LLM 没有以 LangChain 集成形式提供，你可以改用 `custom` 模式来流式输出其结果。详见 [与任意 LLM 配合使用](#use-with-any-llm)。

```typescript  theme={null}
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph, StateSchema, GraphNode, START } from "@langchain/langgraph";
import * as z from "zod";

const MyState = new StateSchema({
  topic: z.string(),
  joke: z.string().default(""),
});

const model = new ChatOpenAI({ model: "gpt-4.1-mini" });

const callModel: GraphNode<typeof MyState> = async (state) => {
  // 调用 LLM 生成一个关于主题的笑话
  // 注意：即使使用 .invoke 而不是 .stream 运行 LLM，也会产生 message 事件
  const modelResponse = await model.invoke([
    { role: "user", content: `生成一个关于 ${state.topic} 的笑话` },
  ]);
  return { joke: modelResponse.content };
};

const graph = new StateGraph(MyState)
  .addNode("callModel", callModel)
  .addEdge(START, "callModel")
  .compile();

// "messages" stream mode 返回一个由 [messageChunk, metadata] 元组构成的迭代器
// 其中 messageChunk 是 LLM 流式输出的 token，metadata 是字典
// 包含调用 LLM 的图节点信息以及其他信息
for await (const [messageChunk, metadata] of await graph.stream(
  { topic: "ice cream" },
  { streamMode: "messages" }
)) {
  if (messageChunk.content) {
    console.log(messageChunk.content + "|");
  }
}
```

#### 按 LLM 调用过滤

你可以为 LLM 调用关联 `tags`，从而按 LLM 调用过滤流式 token。

```typescript  theme={null}
import { ChatOpenAI } from "@langchain/openai";

// model1 带有 "joke" 标签
const model1 = new ChatOpenAI({
  model: "gpt-4.1-mini",
  tags: ['joke']
});
// model2 带有 "poem" 标签
const model2 = new ChatOpenAI({
  model: "gpt-4.1-mini",
  tags: ['poem']
});

const graph = // ... 定义一个使用这些 LLM 的图

// 将 streamMode 设为 "messages" 来流式输出 LLM tokens
// metadata 中包含 LLM 调用信息，包括 tags
for await (const [msg, metadata] of await graph.stream(
  { topic: "cats" },
  { streamMode: "messages" }
)) {
  // 通过 metadata 的 tags 字段过滤，仅包含带有 "joke" 标签的那次 LLM 调用输出的 token
  if (metadata.tags?.includes("joke")) {
    console.log(msg.content + "|");
  }
}
```

<Accordion title="扩展示例：按 tags 过滤">
  ```typescript  theme={null}
  import { ChatOpenAI } from "@langchain/openai";
  import { StateGraph, StateSchema, GraphNode, START } from "@langchain/langgraph";
  import * as z from "zod";

  // jokeModel 带有 "joke" 标签
  const jokeModel = new ChatOpenAI({
    model: "gpt-4.1-mini",
    tags: ["joke"]
  });
  // poemModel 带有 "poem" 标签
  const poemModel = new ChatOpenAI({
    model: "gpt-4.1-mini",
    tags: ["poem"]
  });

  const State = new StateSchema({
    topic: z.string(),
    joke: z.string(),
    poem: z.string(),
  });

  const callModel: GraphNode<typeof State> = async (state) => {
    const topic = state.topic;
    console.log("正在写笑话……");

    const jokeResponse = await jokeModel.invoke([
      { role: "user", content: `写一个关于 ${topic} 的笑话` }
    ]);

    console.log("\n\n正在写诗……");
    const poemResponse = await poemModel.invoke([
      { role: "user", content: `写一首关于 ${topic} 的短诗` }
    ]);

    return {
      joke: jokeResponse.content,
      poem: poemResponse.content
    };
  };

  const graph = new StateGraph(State)
    .addNode("callModel", callModel)
    .addEdge(START, "callModel")
    .compile();

  // 将 streamMode 设为 "messages" 来流式输出 LLM tokens
  // metadata 中包含 LLM 调用信息，包括 tags
  for await (const [msg, metadata] of await graph.stream(
    { topic: "cats" },
    { streamMode: "messages" }
  )) {
    // 通过 metadata 的 tags 字段过滤，仅包含带有 "joke" 标签的那次 LLM 调用输出的 token
    if (metadata.tags?.includes("joke")) {
      console.log(msg.content + "|");
    }
  }
  ```
</Accordion>

#### 按节点过滤

若只想流式输出特定节点的 tokens，请使用 `stream_mode="messages"` 并通过流式 metadata 中的 `langgraph_node` 字段过滤输出：

```typescript  theme={null}
// "messages" stream mode 返回 [messageChunk, metadata] 元组
// 其中 messageChunk 是 LLM 流式输出的 token，metadata 是字典
// 包含调用 LLM 的图节点信息以及其他信息
for await (const [msg, metadata] of await graph.stream(
  inputs,
  { streamMode: "messages" }
)) {
  // 通过 metadata 的 langgraph_node 字段过滤
  // 仅包含指定节点输出的 token
  if (msg.content && metadata.langgraph_node === "some_node_name") {
    // ...
  }
}
```

<Accordion title="扩展示例：从特定节点流式输出 LLM tokens">
  ```typescript  theme={null}
  import { ChatOpenAI } from "@langchain/openai";
  import { StateGraph, StateSchema, GraphNode, START } from "@langchain/langgraph";
  import * as z from "zod";

  const model = new ChatOpenAI({ model: "gpt-4.1-mini" });

  const State = new StateSchema({
    topic: z.string(),
    joke: z.string(),
    poem: z.string(),
  });

  const writeJoke: GraphNode<typeof State> = async (state) => {
    const topic = state.topic;
    const jokeResponse = await model.invoke([
      { role: "user", content: `写一个关于 ${topic} 的笑话` }
    ]);
    return { joke: jokeResponse.content };
  };

  const writePoem: GraphNode<typeof State> = async (state) => {
    const topic = state.topic;
    const poemResponse = await model.invoke([
      { role: "user", content: `写一首关于 ${topic} 的短诗` }
    ]);
    return { poem: poemResponse.content };
  };

  const graph = new StateGraph(State)
    .addNode("writeJoke", writeJoke)
    .addNode("writePoem", writePoem)
    // 并发写笑话与诗
    .addEdge(START, "writeJoke")
    .addEdge(START, "writePoem")
    .compile();

  // "messages" stream mode 返回 [messageChunk, metadata] 元组
  // 其中 messageChunk 是 LLM 流式输出的 token，metadata 是字典
  // 包含调用 LLM 的图节点信息以及其他信息
  for await (const [msg, metadata] of await graph.stream(
    { topic: "cats" },
    { streamMode: "messages" }
  )) {
    // 通过 metadata 的 langgraph_node 字段过滤
    // 仅包含 writePoem 节点输出的 token
    if (msg.content && metadata.langgraph_node === "writePoem") {
      console.log(msg.content + "|");
    }
  }
  ```
</Accordion>

## 流式输出自定义数据

若要从 LangGraph 的节点或工具内部发送**自定义用户数据**，请按以下步骤：

1. 使用 `LangGraphRunnableConfig` 中的 `writer` 参数发出自定义数据。
2. 调用 `.stream()` 时设置 `streamMode: "custom"`，以便在流中接收自定义数据。你可以组合多个模式（例如 `["updates", "custom"]`），但其中至少一个必须是 `"custom"`。

<Tabs>
  <Tab title="node">
    ```typescript  theme={null}
    import { StateGraph, StateSchema, GraphNode, START, LangGraphRunnableConfig } from "@langchain/langgraph";
    import * as z from "zod";

    const State = new StateSchema({
      query: z.string(),
      answer: z.string(),
    });
    
    const node: GraphNode<typeof State> = async (state, config) => {
      // 使用 writer 发出自定义键值对（例如进度更新）
      config.writer({ custom_key: "在节点内部生成自定义数据" });
      return { answer: "some data" };
    };
    
    const graph = new StateGraph(State)
      .addNode("node", node)
      .addEdge(START, "node")
      .compile();
    
    const inputs = { query: "example" };
    
    // 将 streamMode 设为 "custom" 以在流中接收自定义数据
    for await (const chunk of await graph.stream(inputs, { streamMode: "custom" })) {
      console.log(chunk);
    }
    ```
  </Tab>

  <Tab title="tool">
    ```typescript  theme={null}
    import { tool } from "@langchain/core/tools";
    import { LangGraphRunnableConfig } from "@langchain/langgraph";
    import * as z from "zod";

    const queryDatabase = tool(
      async (input, config: LangGraphRunnableConfig) => {
        // 使用 writer 发出自定义键值对（例如进度更新）
        config.writer({ data: "已检索 0/100 条记录", type: "progress" });
        // 执行查询
        // 再发出一个自定义键值对
        config.writer({ data: "已检索 100/100 条记录", type: "progress" });
        return "some-answer";
      },
      {
        name: "query_database",
        description: "查询数据库。",
        schema: z.object({
          query: z.string().describe("要执行的查询语句。"),
        }),
      }
    );
    
    const graph = // ... 定义一个使用该工具的图
    
    // 将 streamMode 设为 "custom" 以在流中接收自定义数据
    for await (const chunk of await graph.stream(inputs, { streamMode: "custom" })) {
      console.log(chunk);
    }
    ```
  </Tab>
</Tabs>

## 与任意 LLM 配合使用

你可以使用 `streamMode: "custom"` 从**任意 LLM API** 流式输出数据——即使该 API **没有**实现 LangChain 的聊天模型接口。

这使你能够集成原生 LLM 客户端或提供自定义流式接口的外部服务，从而让 LangGraph 在自定义场景中保持高度灵活。

```typescript  theme={null}
import { StateGraph, GraphNode, StateSchema } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({ result: z.string() });

const callArbitraryModel: GraphNode<typeof State> = async (state, config) => {
  // 示例节点：调用任意模型并流式输出结果
  // 假设你有一个会产出 chunk 的流式客户端
  // 使用自定义流式客户端生成 LLM tokens
  for await (const chunk of yourCustomStreamingClient(state.topic)) {
    // 使用 writer 将自定义数据发送到流中
    config.writer({ custom_llm_chunk: chunk });
  }
  return { result: "completed" };
};

const graph = new StateGraph(State)
  .addNode("callArbitraryModel", callArbitraryModel)
  // 根据需要添加其他节点与边
  .compile();

// 将 streamMode 设为 "custom" 以在流中接收自定义数据
for await (const chunk of await graph.stream(
  { topic: "cats" },
  { streamMode: "custom" }
)) {
  // chunk 将包含从 llm 流式输出的自定义数据
  console.log(chunk);
}
```

<Accordion title="扩展示例：流式输出任意聊天模型">
  ```typescript  theme={null}
  import { StateGraph, StateSchema, MessagesValue, GraphNode, START, LangGraphRunnableConfig } from "@langchain/langgraph";
  import { tool } from "@langchain/core/tools";
  import * as z from "zod";
  import OpenAI from "openai";

  const openaiClient = new OpenAI();
  const modelName = "gpt-4.1-mini";

  async function* streamTokens(modelName: string, messages: any[]) {
    const response = await openaiClient.chat.completions.create({
      messages,
      model: modelName,
      stream: true,
    });

    let role: string | null = null;
    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.role) {
        role = delta.role;
      }

      if (delta?.content) {
        yield { role, content: delta.content };
      }
    }
  }

  // 这是我们的工具
  const getItems = tool(
    async (input, config: LangGraphRunnableConfig) => {
      let response = "";
      for await (const msgChunk of streamTokens(
        modelName,
        [
          {
            role: "user",
            content: `你能告诉我在以下地点可能会找到哪些物品吗：'${input.place}'？至少列出 3 件物品，用逗号分隔，并为每件物品给出简要描述。`,
          },
        ]
      )) {
        response += msgChunk.content;
        config.writer?.(msgChunk);
      }
      return response;
    },
    {
      name: "get_items",
      description: "当被问及某个地点时，使用该工具列出该地点可能出现的物品。",
      schema: z.object({
        place: z.string().describe("要查询物品的地点。"),
      }),
    }
  );

  const State = new StateSchema({
    messages: MessagesValue,
  });

  const callTool: GraphNode<typeof State> = async (state) => {
    const aiMessage = state.messages.at(-1);
    const toolCall = aiMessage.tool_calls?.at(-1);

    const functionName = toolCall?.function?.name;
    if (functionName !== "get_items") {
      throw new Error(`不支持工具 ${functionName}`);
    }

    const functionArguments = toolCall?.function?.arguments;
    const args = JSON.parse(functionArguments);

    const functionResponse = await getItems.invoke(args);
    const toolMessage = {
      tool_call_id: toolCall.id,
      role: "tool",
      name: functionName,
      content: functionResponse,
    };
    return { messages: [toolMessage] };
  };

  const graph = new StateGraph(State)
    // 这是工具调用的图节点
    .addNode("callTool", callTool)
    .addEdge(START, "callTool")
    .compile();
  ```

  使用一个包含工具调用的 [`AIMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessage.html) 来调用该图：

  ```typescript  theme={null}
  const inputs = {
    messages: [
      {
        content: null,
        role: "assistant",
        tool_calls: [
          {
            id: "1",
            function: {
              arguments: '{"place":"bedroom"}',
              name: "get_items",
            },
            type: "function",
          }
        ],
      }
    ]
  };

  for await (const chunk of await graph.stream(
    inputs,
    { streamMode: "custom" }
  )) {
    console.log(chunk.content + "|");
  }
  ```
</Accordion>

## 为特定聊天模型禁用流式输出

如果你的应用混用支持流式输出与不支持流式输出的模型，你可能需要为不支持的模型显式禁用流式输出。

在初始化模型时设置 `streaming: false`。

```typescript  theme={null}
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "o1-preview",
  // 将 streaming 设为 false 以禁用聊天模型的流式输出
  streaming: false,
});
```

<Note>
  并非所有聊天模型集成都支持 `streaming` 参数。如果你的模型不支持它，请改用 `disableStreaming: true`。该参数在所有聊天模型的基类上都可用。
</Note>

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/streaming.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将 [这些文档](/use-these-docs) 连接到 Claude、VSCode 等，以获取实时答案。
</Callout>
