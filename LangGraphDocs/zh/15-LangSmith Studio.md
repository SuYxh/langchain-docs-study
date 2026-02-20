> ## 文档索引
> 在此获取完整的文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用该文件发现所有可用页面。

# LangSmith Studio

在本地使用 LangChain 构建智能体时，可视化智能体内部发生的事情、实时与其交互并在问题出现时进行调试会很有帮助。**LangSmith Studio** 是一个免费的可视化界面，可用于在本地机器上开发与测试你的 LangChain 智能体。

Studio 会连接到你本地运行的智能体，展示智能体执行的每一步：发送给模型的提示词、工具调用及其结果，以及最终输出。你可以测试不同输入、检查中间状态，并在无需额外代码或部署的情况下迭代智能体行为。

本页面介绍如何将 Studio 与本地 LangChain 智能体一起设置使用。

## 前置条件

在开始之前，请确保你具备以下条件：

* **LangSmith 账号**：在 [smith.langchain.com](https://smith.langchain.com) 免费注册或登录。
* **LangSmith API Key**：按照[创建 API key](/langsmith/create-account-api-key#create-an-api-key) 指南操作。
* 如果你不希望数据被追踪（[traced](/langsmith/observability-concepts#traces)）到 LangSmith，请在应用的 `.env` 文件中设置 `LANGSMITH_TRACING=false`。禁用追踪后，不会有数据离开你的本地服务器。

## 设置本地智能体服务器

### 1. 安装 LangGraph CLI

[LangGraph CLI](/langsmith/cli) 提供本地开发服务器（也称为 [Agent Server](/langsmith/agent-server)），用于将你的智能体连接到 Studio。

```shell  theme={null}
npx @langchain/langgraph-cli
```

### 2. 准备你的智能体

如果你已经有一个 LangChain 智能体，可以直接使用它。本示例使用一个简单的邮件智能体：

```typescript title="agent.ts" theme={null}
import { createAgent } from "@langchain/langgraph";

function sendEmail(to: string, subject: string, body: string): string {
    // 发送邮件
    const email = {
        to: to,
        subject: subject,
        body: body
    };
    // ... 邮件发送逻辑

    return `已向 ${to} 发送邮件`;
}

const agent = createAgent({
    model: "gpt-4.1",
    tools: [sendEmail],
    systemPrompt: "你是一个邮件助手。始终使用 sendEmail 工具。",
});

export { agent };
```

### 3. 环境变量

Studio 需要 LangSmith API key 才能连接你的本地智能体。在项目根目录创建一个 `.env` 文件，并添加你在 [LangSmith](https://smith.langchain.com/settings) 中的 API key。

<Warning>
  确保不要将 `.env` 文件提交到版本控制系统（例如 Git）。
</Warning>

```bash .env theme={null}
LANGSMITH_API_KEY=lsv2...
```

### 4. 创建 LangGraph 配置文件

LangGraph CLI 使用配置文件来定位你的智能体并管理依赖。在应用目录中创建一个 `langgraph.json` 文件：

```json title="langgraph.json" theme={null}
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.ts:agent"
  },
  "env": ".env"
}
```

[`createAgent`](https://reference.langchain.com/javascript/functions/langchain.index.createAgent.html) 函数会自动返回一个已编译的 LangGraph 图，这正是配置文件中 `graphs` 键所期望的内容。

<Info>
  若要查看配置文件 JSON 对象中每个键的详细解释，请参阅 [LangGraph 配置文件参考](/langsmith/cli#configuration-file)。
</Info>

此时，项目结构将如下所示：

```bash  theme={null}
my-app/
├── src
│   └── agent.ts
├── .env
├── package.json
└── langgraph.json
```

### 5. 安装依赖

```shell  theme={null}
yarn install
```

### 6. 在 Studio 中查看你的智能体

启动开发服务器，将你的智能体连接到 Studio：

```shell  theme={null}
npx @langchain/langgraph-cli dev
```

<Warning>
  Safari 会阻止 `localhost` 与 Studio 的连接。作为变通方案，请在运行上述命令时加上 `--tunnel`，通过安全隧道访问 Studio。你需要在 Studio UI 中点击 **Connect to a local server**，并手动将隧道 URL 添加到允许的 origins 中。操作步骤请参阅[故障排查指南](/langsmith/troubleshooting-studio#safari-connection-issues)。
</Warning>

当服务器运行后，你的智能体既可以通过 API 访问（`http://127.0.0.1:2024`），也可以通过 Studio UI 访问（`https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`）：

<Frame>
    <img src="https://qn.huat.xyz/mac/202602201643098.png" alt="Studio UI 中的智能体视图" data-og-width="2836" width="2836" data-og-height="1752" height="1752" data-path="oss/images/studio_create-agent.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=280&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=cf9c05bdd08661d4d546c540c7a28cbe 280w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=560&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=484b2fd56957d048bd89280ce97065a0 560w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=840&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=92991302ac24604022ab82ac22729f68 840w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=1100&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=ed366abe8dabc42a9d7c300a591e1614 1100w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=1650&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=d5865d3c4b0d26e9d72e50d474547a63 1650w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=2500&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=6b254add2df9cc3c10ac0c2bcb3a589c 2500w" />
</Frame>

当 Studio 连接到你的本地智能体后，你可以快速迭代智能体行为：运行一条测试输入，检查完整的执行 trace（包含提示词、工具参数、返回值，以及 token/延迟等指标）。当出现问题时，Studio 会捕获异常并附带周边 state，帮助你理解发生了什么。

开发服务器支持热重载（hot-reloading）——你在代码中修改提示词或工具签名后，Studio 会立即反映这些变化。你还可以从任意步骤重新运行对话线程，在无需从头开始的情况下测试改动。该工作流既适用于简单的单工具智能体，也可扩展到复杂的多节点图。

关于如何运行 Studio 的更多信息，请参阅 [LangSmith 文档](/langsmith/home)中的以下指南：

* [运行应用](/langsmith/use-studio#run-application)
* [管理 assistants](/langsmith/use-studio#manage-assistants)
* [管理线程](/langsmith/use-studio#manage-threads)
* [迭代提示词](/langsmith/observability-studio)
* [调试 LangSmith traces](/langsmith/observability-studio#debug-langsmith-traces)
* [将节点加入数据集](/langsmith/observability-studio#add-node-to-dataset)

## 视频指南

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/Mi1gSlHwZLM?si=zA47TNuTC5aH0ahd" title="Studio" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/studio.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
