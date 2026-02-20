> ## 文档索引
> 获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# 安装 LangChain

要安装 LangChain 包：

<CodeGroup>
  ```bash npm theme={null}
  npm install langchain @langchain/core
  # 需要 Node.js 20+
  ```

  ```bash pnpm theme={null}
  pnpm add langchain @langchain/core
  # 需要 Node.js 20+
  ```

  ```bash yarn theme={null}
  yarn add langchain @langchain/core
  # 需要 Node.js 20+
  ```

  ```bash bun theme={null}
  bun add langchain @langchain/core
  # 需要 Bun v1.0.0+
  ```
</CodeGroup>

LangChain 提供与数百个 LLM 和数千个其他集成的集成。这些位于独立的提供商包中。

<CodeGroup>
  ```bash npm theme={null}
  # 安装 OpenAI 集成
  npm install @langchain/openai
  # 安装 Anthropic 集成
  npm install @langchain/anthropic
  ```

  ```bash pnpm theme={null}
  # 安装 OpenAI 集成
  pnpm install @langchain/openai
  # 安装 Anthropic 集成
  pnpm install @langchain/anthropic
  ```

  ```bash yarn theme={null}
  # 安装 OpenAI 集成
  yarn add @langchain/openai
  # 安装 Anthropic 集成
  yarn add @langchain/anthropic
  ```

  ```bash bun theme={null}
  # 安装 OpenAI 集成
  bun add @langchain/openai
  # 安装 Anthropic 集成
  bun add @langchain/anthropic
  ```
</CodeGroup>

<Tip>
  请参阅 [集成选项卡](/oss/javascript/integrations/providers/overview) 获取可用集成的完整列表。
</Tip>

现在您已经安装了 LangChain，可以按照 [快速入门指南](/oss/javascript/langchain/quickstart) 开始使用。

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/install.mdx) 或 [提交问题](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Tip icon="terminal" iconType="regular">
  通过 MCP 将 [这些文档](/use-these-docs) 连接到 Claude、VSCode 等，以获取实时答案。
</Tip>
