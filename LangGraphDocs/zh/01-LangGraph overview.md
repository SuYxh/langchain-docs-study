> ## 文档索引
> 获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# LangGraph 概览

> 使用 LangGraph 获得更强控制力，设计能够可靠处理复杂任务的智能体

LangGraph 深受塑造智能体未来的公司信赖——包括 Klarna、Replit、Elastic 等——它是一个低层编排框架与运行时，用于构建、管理并部署长时间运行、具备状态的智能体。

LangGraph 非常偏底层，并且完全聚焦于智能体的 **编排（orchestration）**。在使用 LangGraph 之前，我们建议你先熟悉一些用于构建智能体的组件，从 [模型](/oss/javascript/langchain/models) 和 [工具](/oss/javascript/langchain/tools) 开始。

在本文档中，我们会经常使用 [LangChain](/oss/javascript/langchain/overview) 组件来集成模型与工具，但使用 LangGraph 并不要求你必须使用 LangChain。如果你刚开始接触智能体，或希望使用更高层的抽象，我们建议你使用 LangChain 的 [agents](/oss/javascript/langchain/agents)，它们为常见的 LLM 与工具调用循环提供了预构建架构。

LangGraph 聚焦于智能体编排所需的底层能力：持久化执行、流式传输、人类介入（human-in-the-loop）等。

## <Icon icon="download" size={20} /> 安装

<CodeGroup>
  ```bash npm theme={null}
  npm install @langchain/langgraph @langchain/core
  ```

  ```bash pnpm theme={null}
  pnpm add @langchain/langgraph @langchain/core
  ```

  ```bash yarn theme={null}
  yarn add @langchain/langgraph @langchain/core
  ```

  ```bash bun theme={null}
  bun add @langchain/langgraph @langchain/core
  ```
</CodeGroup>

然后，创建一个简单的 hello world 示例：

```typescript  theme={null}
import { StateSchema, MessagesValue, GraphNode, StateGraph, START, END } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const mockLlm: GraphNode<typeof State> = (state) => {
  return { messages: [{ role: "ai", content: "你好，世界" }] };
};

const graph = new StateGraph(State)
  .addNode("mock_llm", mockLlm)
  .addEdge(START, "mock_llm")
  .addEdge("mock_llm", END)
  .compile();

await graph.invoke({ messages: [{ role: "user", content: "你好！" }] });
```

## 核心优势

LangGraph 为 *任何* 长时间运行、具备状态的工作流或智能体提供底层支撑基础设施。LangGraph 不会抽象提示词或架构，并提供以下核心优势：

* [持久化执行](/oss/javascript/langgraph/durable-execution)：构建能够贯穿故障并可长时间运行的智能体，从中断位置继续恢复执行。
* [人类介入（Human-in-the-loop）](/oss/javascript/langgraph/interrupts)：通过在任意时刻检查并修改智能体状态来引入人工监督。
* [全面的记忆](/oss/javascript/concepts/memory)：创建具备状态的智能体，既拥有用于持续推理的短期工作记忆，也拥有跨会话的长期记忆。
* [使用 LangSmith 调试](/langsmith/home)：借助可视化工具获得对复杂智能体行为的深度可见性，这些工具可追踪执行路径、捕获状态迁移，并提供详细的运行时指标。
* [面向生产的部署](/langsmith/deployments)：通过可扩展的基础设施自信部署复杂的智能体系统，该基础设施专为具备状态、长时间运行的工作流的独特挑战而设计。

## LangGraph 生态

LangGraph 可以独立使用，同时也能与任何 LangChain 产品无缝集成，为开发者提供构建智能体的完整工具套件。为了提升你的 LLM 应用开发体验，可以将 LangGraph 与以下产品搭配使用：

<Columns cols={1}>
  <Card title="LangSmith" icon="chart-line" href="http://www.langchain.com/langsmith" arrow cta="Learn more">
    在一个地方完成请求追踪、输出评估与部署监控。使用 LangGraph 在本地进行原型开发，然后借助集成的可观测性与评估能力进入生产环境，以构建更可靠的智能体系统。
  </Card>

  <Card title="LangSmith Agent Server" icon="server" href="/langsmith/agent-server" arrow cta="Learn more">
    借助专为长时间运行、具备状态的工作流打造的部署平台，轻松部署并扩展智能体。在团队间发现、复用、配置与共享智能体——并通过 Studio 中的可视化原型快速迭代。
  </Card>

  <Card title="LangChain" icon="link" href="/oss/javascript/langchain/overview" arrow cta="Learn more">
    提供集成与可组合组件，以简化 LLM 应用开发。包含构建在 LangGraph 之上的智能体抽象。
  </Card>
</Columns>

## 致谢

LangGraph 受到 [Pregel](https://research.google/pubs/pub37252/) 与 [Apache Beam](https://beam.apache.org/) 的启发。其公共接口借鉴了 [NetworkX](https://networkx.org/documentation/latest/) 的设计。LangGraph 由 LangChain Inc（LangChain 的创建者）构建，但也可以在不使用 LangChain 的情况下使用。

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/overview.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
