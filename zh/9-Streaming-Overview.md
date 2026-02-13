> ## 文档索引
> 获取完整文档索引请访问：https://docs.langchain.com/llms.txt
> 在深入探索之前，请使用此文件发现所有可用页面。

# Overview (概览)

> 从 Agent 运行中流式传输实时更新

LangChain 实现了一个流式传输系统来展示实时更新。

流式传输对于增强构建在 LLM 上的应用程序的响应能力至关重要。通过逐步显示输出，即使在完整响应准备好之前，流式传输也能显著改善用户体验 (UX)，特别是在处理 LLM 的延迟时。

## 概述

LangChain 的流式传输系统让您可以将来自 Agent 运行的实时反馈展示给您的应用程序。

LangChain 流式传输可以做什么：

* <Icon icon="brain" size={16} /> [**流式传输 Agent 进度**](#agent-progress) — 在每个 Agent 步骤后获取状态更新。
* <Icon icon="square-binary" size={16} /> [**流式传输 LLM token**](#llm-tokens) — 在语言模型生成 token 时流式传输它们。
* <Icon icon="table" size={16} /> [**流式传输自定义更新**](#custom-updates) — 发出用户定义的信号（例如，`"已获取 10/100 条记录"`）。
* <Icon icon="layer-plus" size={16} /> [**流式传输多种模式**](#stream-multiple-modes) — 从 `updates`（Agent 进度）、`messages`（LLM token + 元数据）或 `custom`（任意用户数据）中选择。

请参阅下面的 [常见模式](#common-patterns) 部分以获取其他端到端示例。

## 支持的流模式

将以下一个或多个流模式作为列表传递给 [`stream`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#stream) 方法：

| 模式       | 描述                                                                                                                                                       |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `updates`  | 在每个 Agent 步骤后流式传输状态更新。如果在同一步骤中进行了多次更新（例如，运行了多个节点），则这些更新将分别流式传输。 |
| `messages` | 从调用 LLM 的任何图节点流式传输 `(token, metadata)` 元组。                                                                               |
| `custom`   | 使用流写入器从图节点内部流式传输自定义数据。                                                                                         |

## Agent 进度 (Agent progress)

要流式传输 Agent 进度，请使用 `streamMode: "updates"` 调用 [`stream`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#stream) 方法。这会在每个 Agent 步骤后发出一个事件。

例如，如果您有一个调用工具一次的 Agent，您应该看到以下更新：

* **LLM 节点**: [`AIMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessage.html) 带有工具调用请求
* **Tool 节点**: [`ToolMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.ToolMessage.html) 带有执行结果
* **LLM 节点**: 最终 AI 响应

```typescript  theme={null}
import z from "zod";
import { createAgent, tool } from "langchain";

const getWeather = tool(
    async ({ city }) => {
        return `The weather in ${city} is always sunny!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
        city: z.string(),
        }),
    }
);

const agent = createAgent({
    model: "gpt-5-nano",
    tools: [getWeather],
});

for await (const chunk of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "updates" }
)) {
    const [step, content] = Object.entries(chunk)[0];
    console.log(`step: ${step}`);
    console.log(`content: ${JSON.stringify(content, null, 2)}`);
}
/**
 * step: model
 * content: {
 *   "messages": [
 *     {
 *       "kwargs": {
 *         // ...
 *         "tool_calls": [
 *           {
 *             "name": "get_weather",
 *             "args": {
 *               "city": "San Francisco"
 *             },
 *             "type": "tool_call",
 *             "id": "call_0qLS2Jp3MCmaKJ5MAYtr4jJd"
 *           }
 *         ],
 *         // ...
 *       }
 *     }
 *   ]
 * }
 * step: tools
 * content: {
 *   "messages": [
 *     {
 *       "kwargs": {
 *         "content": "The weather in San Francisco is always sunny!",
 *         "name": "get_weather",
 *         // ...
 *       }
 *     }
 *   ]
 * }
 * step: model
 * content: {
 *   "messages": [
 *     {
 *       "kwargs": {
 *         "content": "The latest update says: The weather in San Francisco is always sunny!\n\nIf you'd like real-time details (current temperature, humidity, wind, and today's forecast), I can pull the latest data for you. Want me to fetch that?",
 *         // ...
 *       }
 *     }
 *   ]
 * }
 */
```

## LLM tokens

要流式传输 LLM 生成的 token，请使用 `streamMode: "messages"`：

```typescript  theme={null}
import z from "zod";
import { createAgent, tool } from "langchain";

const getWeather = tool(
    async ({ city }) => {
        return `The weather in ${city} is always sunny!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
        city: z.string(),
        }),
    }
);

const agent = createAgent({
    model: "gpt-4.1-mini",
    tools: [getWeather],
});

for await (const [token, metadata] of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "messages" }
)) {
    console.log(`node: ${metadata.langgraph_node}`);
    console.log(`content: ${JSON.stringify(token.contentBlocks, null, 2)}`);
}
```

## 自定义更新 (Custom updates)

要在执行工具时流式传输更新，您可以使用配置中的 `writer` 参数。

```typescript  theme={null}
import z from "zod";
import { tool, createAgent } from "langchain";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

const getWeather = tool(
    async (input, config: LangGraphRunnableConfig) => {
        // Stream any arbitrary data
        config.writer?.(`Looking up data for city: ${input.city}`);
        // ... fetch city data
        config.writer?.(`Acquired data for city: ${input.city}`);
        return `It's always sunny in ${input.city}!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
        city: z.string().describe("The city to get weather for."),
        }),
    }
);

const agent = createAgent({
    model: "gpt-4.1-mini",
    tools: [getWeather],
});

for await (const chunk of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "custom" }
)) {
    console.log(chunk);
}
```

```shell title="Output" theme={null}
Looking up data for city: San Francisco
Acquired data for city: San Francisco
```

<Note>
  如果您向工具添加 `writer` 参数，则如果不提供 writer 函数，您将无法在 LangGraph 执行上下文之外调用该工具。
</Note>

## 流式传输多种模式

您可以通过将 streamMode 作为数组传递来指定多种流模式：`streamMode: ["updates", "messages", "custom"]`。

流式输出将是 `[mode, chunk]` 元组，其中 `mode` 是流模式的名称，`chunk` 是该模式流式传输的数据。

```typescript  theme={null}
import z from "zod";
import { tool, createAgent } from "langchain";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

const getWeather = tool(
    async (input, config: LangGraphRunnableConfig) => {
        // Stream any arbitrary data
        config.writer?.(`Looking up data for city: ${input.city}`);
        // ... fetch city data
        config.writer?.(`Acquired data for city: ${input.city}`);
        return `It's always sunny in ${input.city}!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
        city: z.string().describe("The city to get weather for."),
        }),
    }
);

const agent = createAgent({
    model: "gpt-4.1-mini",
    tools: [getWeather],
});

for await (const [streamMode, chunk] of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: ["updates", "messages", "custom"] }
)) {
    console.log(`${streamMode}: ${JSON.stringify(chunk, null, 2)}`);
}
```

## 禁用流式传输

在某些应用程序中，您可能需要禁用给定模型的单个 token 流式传输。这在以下情况下很有用：

* 使用 [多 Agent](/oss/javascript/langchain/multi-agent) 系统控制哪些 Agent 流式传输其输出
* 混合支持流式传输的模型和不支持流式传输的模型
* 部署到 [LangSmith](/langsmith/home) 并希望防止某些模型输出流式传输到客户端

初始化模型时设置 `streaming: false`。

```typescript  theme={null}
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "gpt-4.1",
  streaming: false,  // [!code highlight]
});
```

<Tip>
  部署到 LangSmith 时，在您不希望将其输出流式传输到客户端的任何模型上设置 `streaming=False`。这在部署前的图形代码中配置。
</Tip>

<Note>
  并非所有聊天模型集成都支持 `streaming` 参数。如果您的模型不支持它，请改用 `disableStreaming: true`。此参数可通过基类在所有聊天模型上使用。
</Note>

有关更多详细信息，请参阅 [LangGraph 流式传输指南](/oss/javascript/langgraph/streaming#disable-streaming-for-specific-chat-models)。

## 相关内容

* [前端流式传输](/oss/javascript/langchain/streaming/frontend) — 使用 `useStream` 构建 React UI 以进行实时 Agent 交互
* [使用聊天模型进行流式传输](/oss/javascript/langchain/models#stream) — 直接从聊天模型流式传输 token，而无需使用 Agent 或图
* [带有人机交互的流式传输](/oss/javascript/langchain/human-in-the-loop#streaming-with-hil) — 在处理人工审查中断的同时流式传输 Agent 进度
* [LangGraph 流式传输](/oss/javascript/langgraph/streaming) — 高级流式传输选项，包括 `values`、`debug` 模式和子图流式传输

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/streaming/overview.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Tip icon="terminal" iconType="regular">
  [将这些文档连接](/use-these-docs) 到 Claude、VSCode 等，通过 MCP 获取实时答案。
</Tip>
