> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用此文件来发现所有可用页面。

# 快速开始

> 在几分钟内构建你的第一个深度智能体

本指南将带你创建第一个深度智能体，并使用规划、文件系统工具与子智能体能力。你将构建一个能够开展调研并撰写报告的研究型智能体。

## 前置条件

开始之前，请确保你拥有某个模型提供商（例如 Anthropic、OpenAI）的 API Key。

<Note>
  Deep agents 需要一个支持[工具调用](/oss/javascript/langchain/models#tool-calling)的模型。关于如何配置模型，请参阅[自定义](/oss/javascript/deepagents/customization#model)。
</Note>

### 第 1 步：安装依赖

<CodeGroup>
  ```bash npm theme={null}
  npm install deepagents langchain @langchain/core @langchain/tavily
  ```

  ```bash yarn theme={null}
  yarn add deepagents langchain @langchain/core @langchain/tavily
  ```

  ```bash pnpm theme={null}
  pnpm add deepagents langchain @langchain/core @langchain/tavily
  ```
</CodeGroup>

<Note>
  本指南以 [Tavily](https://tavily.com/) 作为示例搜索提供商，但你可以替换为任何搜索 API（例如 DuckDuckGo、SerpAPI、Brave Search）。
</Note>

### 第 2 步：设置你的 API Key

```bash  theme={null}
export ANTHROPIC_API_KEY="your-api-key"
export TAVILY_API_KEY="your-tavily-api-key"
```

### 第 3 步：创建一个搜索工具

```typescript  theme={null}
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";

const internetSearch = tool(
  async ({
    query,
    maxResults = 5,
    topic = "general",
    includeRawContent = false,
  }: {
    query: string;
    maxResults?: number;
    topic?: "general" | "news" | "finance";
    includeRawContent?: boolean;
  }) => {
    const tavilySearch = new TavilySearch({
      maxResults,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      includeRawContent,
      topic,
    });
    return await tavilySearch._call({ query });
  },
  {
    name: "internet_search",
    description: "运行一次网页搜索",
    schema: z.object({
      query: z.string().describe("搜索查询词"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("返回结果的最大数量"),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general")
        .describe("搜索主题类别"),
      includeRawContent: z
        .boolean()
        .optional()
        .default(false)
        .describe("是否包含原始内容"),
    }),
  },
);
```

### 第 4 步：创建一个深度智能体

```typescript  theme={null}
import { createDeepAgent } from "deepagents";

// 用于引导智能体成为专业研究员的系统提示词
const researchInstructions = `你是一名专业研究员。你的工作是进行全面调研，然后撰写一份打磨完善的报告。

你可以使用一个互联网搜索工具，作为收集信息的主要手段。

## \`internet_search\`

使用它对给定查询执行互联网搜索。你可以指定要返回的最大结果数、主题，以及是否应包含原始内容。
`;

const agent = createDeepAgent({
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
```

### 第 5 步：运行智能体

```typescript  theme={null}
const result = await agent.invoke({
  messages: [{ role: "user", content: "什么是 LangGraph？" }],
});

// 打印智能体的响应
console.log(result.messages[result.messages.length - 1].content);
```

## 它是如何工作的？

你的深度智能体会自动执行：

1. 通过内置的 [`write_todos`](/oss/javascript/deepagents/harness#to-do-list-tracking) 工具**规划研究方式**，将研究任务拆解开来。
2. 调用 `internet_search` 工具**开展调研**以收集信息。
3. 使用文件系统工具（[`write_file`](/oss/javascript/deepagents/harness#file-system-access)、[`read_file`](/oss/javascript/deepagents/harness#file-system-access)）**管理上下文**，将较大的搜索结果卸载出去。
4. 按需**生成子智能体**，将复杂子任务委派给专门的子智能体。
5. **综合生成报告**，将发现整理为连贯的响应。

## 示例

关于可以使用 Deep Agents 构建的智能体、模式与应用，请参阅 [Examples](https://github.com/langchain-ai/deepagents/tree/main/examples)。

## 流式传输

Deep agents 内置了[流式传输](/oss/javascript/langchain/streaming/overview)，可通过 LangGraph 在智能体执行期间实时输出更新。
这使你能够渐进式地观察输出，并审阅与调试智能体与子智能体的工作，例如工具调用、工具结果与 LLM 响应。

## 下一步

现在你已经构建了第一个深度智能体：

* **自定义你的智能体**：了解[自定义选项](/oss/javascript/deepagents/customization)，包括自定义系统提示词、工具与子智能体。
* **添加长期记忆**：启用跨对话的[持久化记忆](/oss/javascript/deepagents/long-term-memory)。
* **部署到生产环境**：了解 LangGraph 应用的[部署选项](/oss/javascript/langgraph/deploy)。

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/quickstart.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[连接这些文档](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
