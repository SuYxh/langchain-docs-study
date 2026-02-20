> ## 文档索引
> 在此获取完整的文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用该文件发现所有可用页面。

# LangSmith 可观测性

Trace 是你的应用从输入到输出所经历的一系列步骤。每一个单独步骤都会以一个 run 表示。你可以使用 [LangSmith](https://smith.langchain.com/) 来可视化这些执行步骤。要使用它，请为你的应用[启用追踪](/langsmith/trace-with-langgraph)。启用后，你可以做到：

* [调试本地运行的应用](/langsmith/observability-studio#debug-langsmith-traces)。
* [评估应用性能](/oss/javascript/langchain/evals)。
* [监控应用](/langsmith/dashboards)。

## 前置条件

在开始之前，请确保你具备以下条件：

* **LangSmith 账号**：在 [smith.langchain.com](https://smith.langchain.com) 免费注册或登录。
* **LangSmith API key**：按照[创建 API key](/langsmith/create-account-api-key#create-an-api-key) 指南操作。

## 启用追踪

要为你的应用启用追踪，请设置以下环境变量：

```python  theme={null}
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=<your-api-key>
```

默认情况下，trace 会记录到名为 `default` 的项目中。要配置自定义项目名，请参阅[记录到项目](#log-to-a-project)。

更多信息请参阅[使用 LangGraph 追踪](/langsmith/trace-with-langgraph)。

## 选择性追踪

你可以选择仅追踪特定调用或应用的某些部分，方法是使用 LangSmith 的 `tracing_context` 上下文管理器：

```ts  theme={null}
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

// 这次调用将会被追踪
const tracer = new LangChainTracer();
await agent.invoke(
  {
    messages: [{role: "user", content: "向 alice@example.com 发送一封测试邮件"}]
  },
  { callbacks: [tracer] }
);

// 这次调用不会被追踪（如果未设置 LANGSMITH_TRACING）
await agent.invoke(
  {
    messages: [{role: "user", content: "再发送一封邮件"}]
  }
);
```

## 记录到项目

<Accordion title="静态配置">
  你可以通过设置 `LANGSMITH_PROJECT` 环境变量，为整个应用设置自定义项目名：

  ```bash  theme={null}
  export LANGSMITH_PROJECT=my-agent-project
  ```
</Accordion>

<Accordion title="动态配置">
  你可以针对特定操作，以编程方式设置项目名：

  ```ts  theme={null}
  import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

  const tracer = new LangChainTracer({ projectName: "email-agent-test" });
  await agent.invoke(
    {
      messages: [{role: "user", content: "向 alice@example.com 发送一封测试邮件"}]
    },
    { callbacks: [tracer] }
  );
  ```
</Accordion>

## 为 traces 添加元数据

你可以用自定义元数据与标签（tags）来标注 traces：

```ts  theme={null}
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer({ projectName: "email-agent-test" });
await agent.invoke(
  {
    messages: [{role: "user", content: "向 alice@example.com 发送一封测试邮件"}]
  },
  config: {
    tags: ["production", "email-assistant", "v1.0"],
    metadata: {
      userId: "user123",
      sessionId: "session456",
      environment: "production"
    }
  },
);

```

这些自定义元数据与标签将会附加到 LangSmith 中的 trace 上。

<Tip>
  若要进一步了解如何使用 traces 来调试、评估与监控你的智能体，请参阅 [LangSmith 文档](/langsmith/home)。
</Tip>

## 使用匿名化器防止在 traces 中记录敏感数据

你可能希望对敏感数据进行掩码处理，以防其被记录到 LangSmith。你可以创建[匿名化器（anonymizers）](/langsmith/mask-inputs-outputs#rule-based-masking-of-inputs-and-outputs)，并通过配置将其应用到你的图上。本示例会将发送到 LangSmith 的 traces 中，任何符合社会安全号（Social Security Number）格式 XXX-XX-XXXX 的内容进行脱敏。

```typescript TypeScript theme={null}
import { StateGraph } from "@langchain/langgraph";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";
import { StateAnnotation } from "./state.js";
import { createAnonymizer } from "langsmith/anonymizer"
import { Client } from "langsmith"

const anonymizer = createAnonymizer([
  // 匹配社会安全号（SSN）
  { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/, replace: "<ssn>" }
])

const langsmithClient = new Client({ anonymizer })
const tracer = new LangChainTracer({
  client: langsmithClient,
});

export const graph = new StateGraph(StateAnnotation)
  .compile()
  .withConfig({ callbacks: [tracer] });
```

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/observability.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
