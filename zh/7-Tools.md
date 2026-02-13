> ## 文档索引
> 获取完整文档索引请访问：https://docs.langchain.com/llms.txt
> 在深入探索之前，请使用此文件发现所有可用页面。

# Tools (工具)

工具扩展了 [Agent](/oss/javascript/langchain/agents) 的能力——让它们能够获取实时数据、执行代码、查询外部数据库以及在现实世界中采取行动。

在底层，工具是具有明确定义的输入和输出的可调用函数，这些函数被传递给 [聊天模型](/oss/javascript/langchain/models)。模型根据对话上下文决定何时调用工具，以及提供什么输入参数。

<Tip>
  有关模型如何处理工具调用的详细信息，请参阅 [工具调用](/oss/javascript/langchain/models#tool-calling)。
</Tip>

## 创建工具

### 基本工具定义

创建工具最简单的方法是从 `langchain` 包导入 `tool` 函数。您可以使用 [zod](https://zod.dev/) 定义工具的输入架构：

```ts  theme={null}
import * as z from "zod"
import { tool } from "langchain"

const searchDatabase = tool(
  ({ query, limit }) => `Found ${limit} results for '${query}'`,
  {
    name: "search_database",
    description: "Search the customer database for records matching the query.", // 在客户数据库中搜索与查询匹配的记录。
    schema: z.object({
      query: z.string().describe("Search terms to look for"), // 要查找的搜索词
      limit: z.number().describe("Maximum number of results to return"), // 要返回的最大结果数
    }),
  }
);
```

<Note>
  **服务器端工具使用：** 一些聊天模型具有内置工具（网络搜索、代码解释器），这些工具在服务器端执行。有关详细信息，请参阅 [服务器端工具使用](#server-side-tool-use)。
</Note>

## 访问上下文

当工具可以访问运行时信息（如对话历史记录、用户数据和持久记忆）时，它们最为强大。本节介绍如何在工具中访问和更新这些信息。

### 上下文 (Context)

上下文提供在调用时传递的不可变配置数据。将其用于用户 ID、会话详细信息或在对话期间不应更改的特定于应用程序的设置。

工具可以通过 `config` 参数访问 Agent 的运行时上下文：

```ts  theme={null}
import * as z from "zod"
import { ChatOpenAI } from "@langchain/openai"
import { createAgent } from "langchain"

const getUserName = tool(
  (_, config) => {
    return config.context.user_name
  },
  {
    name: "get_user_name",
    description: "Get the user's name.",
    schema: z.object({}),
  }
);

const contextSchema = z.object({
  user_name: z.string(),
});

const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4.1" }),
  tools: [getUserName],
  contextSchema,
});

const result = await agent.invoke(
  {
    messages: [{ role: "user", content: "What is my name?" }]
  },
  {
    context: { user_name: "John Smith" }
  }
);
```

### 长期记忆 (Store)

[`BaseStore`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.BaseStore.html) 提供跨对话存在的持久存储。与状态（短期记忆）不同，保存到存储中的数据在未来的会话中仍然可用。

通过 `config.store` 访问存储。存储使用命名空间/键模式来组织数据：

```ts expandable theme={null}
import * as z from "zod";
import { createAgent, tool } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const store = new InMemoryStore();

// Access memory
const getUserInfo = tool(
  async ({ user_id }) => {
    const value = await store.get(["users"], user_id);
    console.log("get_user_info", user_id, value);
    return value;
  },
  {
    name: "get_user_info",
    description: "Look up user info.",
    schema: z.object({
      user_id: z.string(),
    }),
  }
);

// Update memory
const saveUserInfo = tool(
  async ({ user_id, name, age, email }) => {
    console.log("save_user_info", user_id, name, age, email);
    await store.put(["users"], user_id, { name, age, email });
    return "Successfully saved user info.";
  },
  {
    name: "save_user_info",
    description: "Save user info.",
    schema: z.object({
      user_id: z.string(),
      name: z.string(),
      age: z.number(),
      email: z.string(),
    }),
  }
);

const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4.1" }),
  tools: [getUserInfo, saveUserInfo],
  store,
});

// First session: save user info
await agent.invoke({
  messages: [
    {
      role: "user",
      content: "Save the following user: userid: abc123, name: Foo, age: 25, email: foo@langchain.dev",
    },
  ],
});

// Second session: get user info
const result = await agent.invoke({
  messages: [
    { role: "user", content: "Get user info for user with id 'abc123'" },
  ],
});

console.log(result);
// Here is the user info for user with ID "abc123":
// - Name: Foo
// - Age: 25
// - Email: foo@langchain.dev
```

### 流写入器 (Stream writer)

在执行期间从工具流式传输实时更新。这对于在长时间运行的操作期间向用户提供进度反馈非常有用。

使用 `config.writer` 发出自定义更新：

```ts  theme={null}
import * as z from "zod";
import { tool, ToolRuntime } from "langchain";

const getWeather = tool(
  ({ city }, config: ToolRuntime) => {
    const writer = config.writer;

    // Stream custom updates as the tool executes
    if (writer) {
      writer(`Looking up data for city: ${city}`);
      writer(`Acquired data for city: ${city}`);
    }

    return `It's always sunny in ${city}!`;
  },
  {
    name: "get_weather",
    description: "Get weather for a given city.",
    schema: z.object({
      city: z.string(),
    }),
  }
);
```

## ToolNode

[`ToolNode`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.prebuilt.ToolNode.html) 是一个预构建的节点，用于在 LangGraph 工作流中执行工具。它自动处理并行工具执行、错误处理和状态注入。

<Info>
  对于需要对工具执行模式进行细粒度控制的自定义工作流，请使用 [`ToolNode`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.prebuilt.ToolNode.html) 而不是 @\[`create_agent`]。它是驱动 Agent 工具执行的构建块。
</Info>

### 基本用法

```typescript  theme={null}
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const search = tool(
  ({ query }) => `Results for: ${query}`,
  {
    name: "search",
    description: "Search for information.",
    schema: z.object({ query: z.string() }),
  }
);

const calculator = tool(
  ({ expression }) => String(eval(expression)),
  {
    name: "calculator",
    description: "Evaluate a math expression.",
    schema: z.object({ expression: z.string() }),
  }
);

// Create the ToolNode with your tools
const toolNode = new ToolNode([search, calculator]);
```

### 错误处理

配置如何处理工具错误。有关所有选项，请参阅 [`ToolNode`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.prebuilt.ToolNode.html) API 参考。

```typescript  theme={null}
import { ToolNode } from "@langchain/langgraph/prebuilt";

// Default behavior
const toolNode = new ToolNode(tools);

// Catch all errors
const toolNode = new ToolNode(tools, { handleToolErrors: true });

// Custom error message
const toolNode = new ToolNode(tools, {
  handleToolErrors: "Something went wrong, please try again."
});
```

### 使用 tools\_condition 进行路由

使用 @\[`tools_condition`] 基于 LLM 是否进行工具调用进行条件路由：

```typescript  theme={null}
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

const builder = new StateGraph(MessagesAnnotation)
  .addNode("llm", callLlm)
  .addNode("tools", new ToolNode(tools))
  .addEdge("__start__", "llm")
  .addConditionalEdges("llm", toolsCondition)  // 路由到 "tools" 或 "__end__"
  .addEdge("tools", "llm");

const graph = builder.compile();
```

### 状态注入

工具可以通过 @\[`ToolRuntime`] 访问当前图状态：

有关从工具访问状态、上下文和长期记忆的更多详细信息，请参阅 [访问上下文](#access-context)。

## 预构建工具

LangChain 提供了大量预构建的工具和工具包，用于常见任务，如网络搜索、代码解释、数据库访问等。这些现成的工具可以直接集成到您的 Agent 中，而无需编写自定义代码。

有关按类别组织的可用工具的完整列表，请参阅 [工具和工具包](/oss/javascript/integrations/tools) 集成页面。

## 服务器端工具使用

一些聊天模型具有由模型提供商在服务器端执行的内置工具。这些包括网络搜索和代码解释器等功能，不需要您定义或托管工具逻辑。

请参阅各个 [聊天模型集成页面](/oss/javascript/integrations/providers) 和 [工具调用文档](/oss/javascript/langchain/models#server-side-tool-use) 以获取有关启用和使用这些内置工具的详细信息。

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/tools.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Tip icon="terminal" iconType="regular">
  [将这些文档连接](/use-these-docs) 到 Claude、VSCode 等，通过 MCP 获取实时答案。
</Tip>
