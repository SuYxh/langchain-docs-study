# LangSmith Studio

当在本地使用 LangChain 构建智能体时，可视化智能体内部发生的事情、与其进行实时交互并调试发生的问题会很有帮助。**LangSmith Studio** 是一个免费的可视化界面，用于从本地机器开发和测试您的 LangChain 智能体。

Studio 连接到您本地运行的智能体，向您展示智能体采取的每一步：发送给模型的提示词、工具调用及其结果以及最终输出。您可以测试不同的输入，检查中间状态，并在不需要额外代码或部署的情况下迭代智能体的行为。

本页介绍了如何使用您的本地 LangChain 智能体设置 Studio。

## 先决条件

在开始之前，请确保您具备以下条件：

*   **一个 LangSmith 帐户**：在 [smith.langchain.com](https://smith.langchain.com) 注册（免费）或登录。
*   **一个 LangSmith API 密钥**：按照 [创建 API 密钥](/langsmith/create-account-api-key#create-an-api-key) 指南操作。
*   如果您不希望数据 [追踪](/langsmith/observability-concepts#traces) 到 LangSmith，请在您的应用程序的 `.env` 文件中设置 `LANGSMITH_TRACING=false`。禁用追踪后，没有任何数据会离开您的本地服务器。

## 设置本地 Agent 服务器

### 1. 安装 LangGraph CLI

[LangGraph CLI](/langsmith/cli) 提供了一个本地开发服务器（也称为 [Agent Server](/langsmith/agent-server)），它将您的智能体连接到 Studio。

```shell
# 需要 Python >= 3.11。
pip install --upgrade "langgraph-cli[inmem]"
```

### 2. 准备您的智能体

如果您已经有一个 LangChain 智能体，您可以直接使用它。此示例使用一个简单的电子邮件智能体：

```python title="agent.py"
from langchain.agents import create_agent

def send_email(to: str, subject: str, body: str):
    """Send an email"""
    email = {
        "to": to,
        "subject": subject,
        "body": body
    }
    # ... email sending logic

    return f"Email sent to {to}"

agent = create_agent(
    "gpt-4.1",
    tools=[send_email],
    system_prompt="You are an email assistant. Always use the send_email tool.",
)
```

### 3. 环境变量

Studio 需要一个 LangSmith API 密钥来连接您的本地智能体。在项目的根目录下创建一个 `.env` 文件，并从 [LangSmith](https://smith.langchain.com/settings) 添加您的 API 密钥。

<Warning>
  确保您的 `.env` 文件没有提交到版本控制，例如 Git。
</Warning>

```bash .env
LANGSMITH_API_KEY=lsv2...
```

### 4. 创建 LangGraph 配置文件

LangGraph CLI 使用配置文件来定位您的智能体并管理依赖项。在您的应用程序目录中创建一个 `langgraph.json` 文件：

```json title="langgraph.json"
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.py:agent"
  },
  "env": ".env"
}
```

[`create_agent`](https://reference.langchain.com/python/langchain/agents/#langchain.agents.create_agent) 函数会自动返回一个编译后的 LangGraph 图，这正是配置文件的 `graphs` 键所期望的。

<Info>
  有关配置文件 JSON 对象中每个键的详细说明，请参阅 [LangGraph 配置文件参考](/langsmith/cli#configuration-file)。
</Info>

此时，项目结构将如下所示：

```bash
my-app/
├── src
│   └── agent.py
├── .env
└── langgraph.json
```

### 5. 安装依赖项

从根目录安装您的项目依赖项：

<CodeGroup>
  ```shell pip
  pip install langchain langchain-openai 
  ```

  ```shell uv
  uv add langchain langchain-openai
  ```
</CodeGroup>

### 6. 在 Studio 中查看您的智能体

启动开发服务器以将您的智能体连接到 Studio：

```shell
langgraph dev
```

<Warning>
  Safari 阻止 `localhost` 连接到 Studio。要解决此问题，请使用 `--tunnel` 运行上述命令，以通过安全隧道访问 Studio。
</Warning>

服务器运行后，您的智能体可以通过 API 在 `http://127.0.0.1:2024` 访问，也可以通过 Studio UI 在 `https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024` 访问：

<Frame>
    <img src="https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=ebd259e9fa24af7d011dfcc568f74be2" alt="Agent view in the Studio UI" data-og-width="2836" width="2836" data-og-height="1752" height="1752" data-path="oss/images/studio_create-agent.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=280&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=cf9c05bdd08661d4d546c540c7a28cbe 280w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=560&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=484b2fd56957d048bd89280ce97065a0 560w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=840&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=92991302ac24604022ab82ac22729f68 840w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=1100&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=ed366abe8dabc42a9d7c300a591e1614 1100w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=1650&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=d5865d3c4b0d26e9d72e50d474547a63 1650w, https://mintcdn.com/langchain-5e9cc07a/TCDks4pdsHdxWmuJ/oss/images/studio_create-agent.png?w=2500&fit=max&auto=format&n=TCDks4pdsHdxWmuJ&q=85&s=6b254add2df9cc3c10ac0c2bcb3a589c 2500w" />
</Frame>

将 Studio 连接到您的本地智能体后，您可以快速迭代智能体的行为。运行测试输入，检查完整的执行跟踪，包括提示词、工具参数、返回值和 token/延迟指标。当出现问题时，Studio 会捕获异常以及周围的状态，以帮助您了解发生了什么。

开发服务器支持热重载——在代码中更改提示词或工具签名，Studio 会立即反映出来。从任何步骤重新运行对话线程以测试您的更改，而无需重新开始。此工作流可从简单的单工具智能体扩展到复杂的多节点图。

有关如何运行 Studio 的更多信息，请参阅 [LangSmith 文档](/langsmith/home) 中的以下指南：

*   [运行应用程序](/langsmith/use-studio#run-application)
*   [管理助手](/langsmith/use-studio#manage-assistants)
*   [管理线程](/langsmith/use-studio#manage-threads)
*   [迭代提示词](/langsmith/observability-studio)
*   [调试 LangSmith 跟踪](/langsmith/observability-studio#debug-langsmith-traces)
*   [将节点添加到数据集](/langsmith/observability-studio#add-node-to-dataset)

## 视频指南

<Frame>
  <iframe className="w-full aspect-video rounded-xl" src="https://www.youtube.com/embed/Mi1gSlHwZLM?si=zA47TNuTC5aH0ahd" title="Studio" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
</Frame>

<Tip>
  有关本地和部署智能体的更多信息，请参阅 [设置本地 Agent Server](/oss/javascript/langchain/studio#setup-local-agent-server) 和 [部署](/oss/javascript/langchain/deploy)。
</Tip>
