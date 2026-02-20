> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用此文件来发现所有可用页面。

# Deep Agents 概览

> 构建能够规划、使用子智能体，并利用文件系统处理复杂任务的智能体

Deep agents 是开始构建由大语言模型（LLM）驱动的智能体与应用的最简单方式——内置任务规划能力、用于上下文管理的文件系统、子智能体生成，以及长期记忆。
你可以将 deep agents 用于任何任务，包括复杂的多步骤任务。

我们将 `deepagents` 视为一个[“智能体编排器（agent harness）”](/oss/javascript/concepts/products#agent-harnesses-like-the-deep-agents-sdk)。
它与其他智能体框架一样采用相同的核心工具调用循环，但提供了内置工具与能力。

[`deepagents`](https://www.npmjs.com/package/deepagents) 是一个独立库，构建于 [LangChain](/oss/javascript/langchain/) 的智能体核心构建模块之上，并使用 [LangGraph](/oss/javascript/langgraph/) 的工具来在生产环境中运行智能体。

`deepagents` 库包含：

* **Deep Agents SDK**：用于构建能够处理任意任务的智能体的软件包
* **Deep Agents CLI**：构建于 `deepagents` 软件包之上的终端编码智能体

[LangChain](/oss/javascript/langchain/) 是提供智能体核心构建模块的框架。
要了解 LangChain、LangGraph 与 Deep Agents 之间的差异，请参阅[框架、运行时与编排器](/oss/javascript/concepts/products)。

## <Icon icon="wand" /> 创建深度智能体

```ts  theme={null}
import * as z from "zod";
// npm install deepagents langchain @langchain/core
import { createDeepAgent } from "deepagents";
import { tool } from "langchain";

const getWeather = tool(
  ({ city }) => `在 ${city} 总是晴天！`,
  {
    name: "get_weather",
    description: "获取指定城市的天气",
    schema: z.object({
      city: z.string(),
    }),
  },
);

const agent = createDeepAgent({
  tools: [getWeather],
  system: "你是一个乐于助人的助手",
});

console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "东京的天气怎么样？" }],
  })
);
```

请参阅[快速开始](/oss/javascript/deepagents/quickstart/)与[自定义指南](/oss/javascript/deepagents/customization/)，开始使用 deep agents 构建你自己的智能体与应用。

## 何时使用 Deep Agents

当你希望构建能够满足以下需求的智能体时，使用 **Deep Agents SDK**：

* **处理复杂、多步骤任务**：需要规划与拆解
* **管理大量上下文**：通过文件系统工具
* **切换文件系统后端**：使用内存态、本地磁盘、持久化存储、[沙盒](/oss/javascript/deepagents/sandboxes)或[自定义后端](/oss/javascript/deepagents/backends)
* **委派工作**：将任务交给专门的子智能体以实现上下文隔离
* **跨对话与线程持久化记忆**

若要构建更简单的智能体，请考虑使用 LangChain 的 [`createAgent`](/oss/javascript/langchain/agents)，或构建一个自定义的 [LangGraph](/oss/javascript/langgraph/overview) 工作流。

当你希望在命令行中以交互方式使用深度智能体进行编码或其他任务时，使用 **Deep Agents CLI**：

* **自定义**：通过技能与记忆自定义智能体。
* **边用边教**：在使用过程中让智能体学习你的偏好、常见模式与自定义项目知识。
* **执行代码**：在你的机器上或在沙盒中执行代码。

## 核心能力

<Card title="规划与任务拆解" icon="timeline">
  Deep agents 内置了 [`write_todos`](/oss/javascript/langchain/middleware/built-in#to-do-list) 工具，使智能体能够将复杂任务拆解为离散步骤、跟踪进度，并在出现新信息时调整计划。
</Card>

<Card title="上下文管理" icon="scissors">
  文件系统工具（[`ls`](/oss/javascript/deepagents/harness#file-system-access)、[`read_file`](/oss/javascript/deepagents/harness#file-system-access)、[`write_file`](/oss/javascript/deepagents/harness#file-system-access)、[`edit_file`](/oss/javascript/deepagents/harness#file-system-access)）允许智能体将大量上下文卸载到内存或文件系统存储中，防止上下文窗口溢出，并支持处理长度可变的工具结果。
</Card>

<Card title="可插拔的文件系统后端" icon="plug">
  虚拟文件系统由[可插拔后端](/oss/javascript/deepagents/backends)驱动，你可以按用例进行切换。可选项包括内存态、本地磁盘、用于跨线程持久化的 LangGraph store、用于隔离代码执行的[沙盒](/oss/javascript/deepagents/sandboxes)（Modal、Daytona、Deno），或通过复合路由组合多个后端。你也可以实现自己的自定义后端。
</Card>

<Card title="子智能体生成" icon="users-group">
  内置的 `task` 工具使智能体能够生成专用子智能体以实现上下文隔离。这可以让主智能体的上下文保持干净，同时仍能在特定子任务上深入推进。
</Card>

<Card title="长期记忆" icon="database">
  通过 LangGraph 的 [Memory Store](/oss/javascript/langgraph/persistence#memory-store)，为智能体扩展跨线程的持久化记忆。智能体可以保存并检索以往对话中的信息。
</Card>

## 开始使用

<CardGroup cols={2}>
  <Card title="SDK 快速开始" icon="rocket" href="/oss/javascript/deepagents/quickstart">
    构建你的第一个深度智能体
  </Card>

  <Card title="自定义" icon="adjustments" href="/oss/javascript/deepagents/customization">
    了解 SDK 的自定义选项
  </Card>

  <Card title="后端" icon="plug" href="/oss/javascript/deepagents/backends">
    选择并配置可插拔的文件系统后端
  </Card>

  <Card title="CLI" icon="terminal" href="/oss/javascript/deepagents/cli/overview">
    使用 Deep Agents CLI
  </Card>

  <Card title="参考" icon="external-link" href="https://reference.langchain.com/javascript/modules/deepagents.html">
    查看 `deepagents` API 参考
  </Card>
</CardGroup>

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/overview.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[连接这些文档](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
