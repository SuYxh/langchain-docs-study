# Agent Chat UI

[Agent Chat UI](https://github.com/langchain-ai/agent-chat-ui) 是一个 Next.js 应用程序，它为与任何 LangChain 智能体交互提供了一个对话界面。它支持实时聊天、工具可视化以及时间旅行调试和状态分叉等高级功能。Agent Chat UI 与使用 [`create_agent`](../langchain/agents) 创建的智能体无缝协作，并以最少的设置提供交互体验，无论您是在本地运行还是在部署的上下文（如 [LangSmith](/langsmith/home)）中。

Agent Chat UI 是开源的，可以根据您的应用程序需求进行调整。

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/lInrwVnZ83o?si=Uw66mPtCERJm0EjU" title="Agent Chat UI" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

<Tip>
  您可以在 Agent Chat UI 中使用生成式 UI。有关更多信息，请参阅 [使用 LangGraph 实现生成式用户界面](/langsmith/generative-ui-react)。
</Tip>

### 快速开始

最快的入门方法是使用托管版本：

1.  **访问 [Agent Chat UI](https://agentchat.vercel.app)**
2.  **连接您的智能体**，输入您的部署 URL 或本地服务器地址
3.  **开始聊天** - UI 将自动检测并渲染工具调用和中断

### 本地开发

对于自定义或本地开发，您可以在本地运行 Agent Chat UI：

<CodeGroup>
  ```bash 使用 npx
  # 创建一个新的 Agent Chat UI 项目
  npx create-agent-chat-app --project-name my-chat-ui
  cd my-chat-ui

  # 安装依赖项并启动
  pnpm install
  pnpm dev
  ```

  ```bash 克隆仓库
  # 克隆仓库
  git clone https://github.com/langchain-ai/agent-chat-ui.git
  cd agent-chat-ui

  # 安装依赖项并启动
  pnpm install
  pnpm dev
  ```
</CodeGroup>

### 连接到您的智能体

Agent Chat UI 可以连接到 [本地](/oss/javascript/langchain/studio#setup-local-agent-server) 和 [已部署的智能体](/oss/javascript/langchain/deploy)。

启动 Agent Chat UI 后，您需要配置它以连接到您的智能体：

1.  **图 ID (Graph ID)**：输入您的图名称（在 `langgraph.json` 文件的 `graphs` 下找到此名称）
2.  **部署 URL (Deployment URL)**：您的 Agent 服务器的端点（例如，用于本地开发的 `http://localhost:2024`，或您部署的智能体的 URL）
3.  **LangSmith API 密钥（可选）**：添加您的 LangSmith API 密钥（如果您使用本地 Agent 服务器则不需要）

配置完成后，Agent Chat UI 将自动获取并显示来自您的智能体的任何中断线程。

<Tip>
  Agent Chat UI 开箱即用地支持渲染工具调用和工具结果消息。要自定义显示哪些消息，请参阅 [在聊天中隐藏消息](https://github.com/langchain-ai/agent-chat-ui?tab=readme-ov-file#hiding-messages-in-the-chat)。
</Tip>
