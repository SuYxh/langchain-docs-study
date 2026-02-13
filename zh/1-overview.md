> ## 文档索引
> 获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# LangChain 概览

> LangChain 是一个开源框架，具有预构建的 Agent 架构以及与任何模型或工具的集成——因此您可以构建随生态系统快速发展的 Agent。

LangChain 是开始构建完全自定义的 Agent 和由 LLM 驱动的应用程序的简单方法。
只需不到 10 行代码，您就可以连接到 OpenAI、Anthropic、Google 和 [更多](/oss/javascript/integrations/providers/overview)。
LangChain 提供预构建的 Agent 架构和模型集成，帮助您快速入门并将 LLM 无缝整合到您的 Agent 和应用程序中。

<Tip>
  **LangChain vs. LangGraph vs. Deep Agents**

  如果您想构建一个 Agent，我们建议您从 [Deep Agents](/oss/javascript/deepagents/overview/) 开始，它“开箱即用”，具有现代功能，如自动压缩长对话、虚拟文件系统以及用于管理和隔离上下文的子 Agent 生成。

  Deep Agents 是 LangChain [Agent](/oss/javascript/langchain/agents) 的实现。如果您不需要这些功能，或者想为您的 Agent 和自主应用程序自定义自己的功能，请从 LangChain 开始。

  当您有更高级的需求，需要结合确定性和 Agent 工作流以及大量自定义时，请使用我们的低级 Agent 编排框架和运行时 [LangGraph](/oss/javascript/langgraph/overview)。
</Tip>

LangChain [Agent](/oss/javascript/langchain/agents) 构建在 LangGraph 之上，以提供持久执行、流式传输、人机交互、持久性等。基本使用 LangChain Agent 不需要了解 LangGraph。

如果您想快速构建 Agent 和自主应用程序，我们建议您使用 LangChain。

## <Icon icon="wand-magic-sparkles" /> 创建一个 Agent

```ts  theme={null}
import * as z from "zod";
// npm install @langchain/anthropic 以调用模型
import { createAgent, tool } from "langchain";

const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather",
    description: "获取指定城市的天气",
    schema: z.object({
      city: z.string(),
    }),
  },
);

const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  tools: [getWeather],
});

console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  })
);
```

请参阅 [安装说明](/oss/javascript/langchain/install) 和 [快速入门指南](/oss/javascript/langchain/quickstart) 开始使用 LangChain 构建您自己的 Agent 和应用程序。

## <Icon icon="star" size={20} /> 核心优势

<Columns cols={2}>
  <Card title="标准模型接口" icon="arrows-rotate" href="/oss/javascript/langchain/models" arrow cta="Learn more">
    不同的提供商有独特的 API 用于与模型交互，包括响应格式。LangChain 标准化了您与模型交互的方式，以便您可以无缝切换提供商并避免锁定。
  </Card>

  <Card title="易于使用，高度灵活的 Agent" icon="wand-magic-sparkles" href="/oss/javascript/langchain/agents" arrow cta="Learn more">
    LangChain 的 Agent 抽象旨在易于上手，让您在不到 10 行代码中构建一个简单的 Agent。但它也提供了足够的灵活性，让您可以随心所欲地进行上下文工程。
  </Card>

  <Card title="构建在 LangGraph 之上" icon="circle-nodes" href="/oss/javascript/langgraph/overview" arrow cta="Learn more">
    LangChain 的 Agent 构建在 LangGraph 之上。这使我们能够利用 LangGraph 的持久执行、人机交互支持、持久性等优势。
  </Card>

  <Card title="使用 LangSmith 调试" icon="eye" href="/langsmith/home" arrow cta="Learn more">
    通过可视化工具深入了解复杂的 Agent 行为，这些工具可以跟踪执行路径、捕获状态转换并提供详细的运行时指标。
  </Card>
</Columns>

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/overview.mdx) 或 [提交问题](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Tip icon="terminal" iconType="regular">
  通过 MCP 将 [这些文档](/use-these-docs) 连接到 Claude、VSCode 等，以获取实时答案。
</Tip>
