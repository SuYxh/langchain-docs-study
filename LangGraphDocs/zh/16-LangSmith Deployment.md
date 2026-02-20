> ## 文档索引
> 在此获取完整的文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用该文件发现所有可用页面。

# LangSmith Deployment

本指南介绍如何将你的智能体部署到 **[LangSmith Cloud](/langsmith/deploy-to-cloud)**。LangSmith Cloud 是一个为智能体工作负载设计的全托管托管平台。使用 Cloud 部署时，你可以直接从 GitHub 仓库进行部署——LangSmith 会处理基础设施、扩缩容与运维方面的问题。

传统托管平台面向无状态、短生命周期的 Web 应用构建。LangSmith Cloud 则是**为有状态、长时间运行的智能体量身打造**的：它们需要持久化 state 与后台执行能力。

<Tip>
  LangSmith 除了 Cloud 之外，还提供多种部署选项，包括使用[控制平面（混合/自托管）](/langsmith/deploy-with-control-plane)进行部署，或作为[独立服务器](/langsmith/deploy-standalone-server)部署。更多信息请参阅[部署概览](/langsmith/deployments)。
</Tip>

## 前置条件

在开始之前，请确保你具备以下条件：

* 一个 [GitHub 账号](https://github.com/)
* 一个 [LangSmith 账号](https://smith.langchain.com/)（可免费注册）

## 部署你的智能体

### 1. 在 GitHub 上创建仓库

要在 LangSmith 上部署，你的应用代码必须位于 GitHub 仓库中。支持公开与私有仓库。对于本快速入门，请先按照[本地服务器设置指南](/oss/javascript/langgraph/studio#setup-local-agent-server)确保你的应用与 LangGraph 兼容，然后将代码推送到仓库。

### 2. 部署到 LangSmith

<Steps>
  <Step title="进入 LangSmith Deployment">
    登录 [LangSmith](https://smith.langchain.com/)。在左侧边栏选择 **Deployments**。
  </Step>

  <Step title="创建新部署">
    点击 **+ New Deployment** 按钮。将打开一个面板，你可以在其中填写所需字段。
  </Step>

  <Step title="关联仓库">
    如果你是首次使用，或正在添加一个此前未连接过的私有仓库，请点击 **Add new account** 按钮，并按照指引连接你的 GitHub 账号。
  </Step>

  <Step title="部署仓库">
    选择你的应用仓库。点击 **Submit** 开始部署。完成可能需要大约 15 分钟。你可以在 **Deployment details** 视图中查看状态。
  </Step>
</Steps>

### 3. 在 Studio 中测试你的应用

当你的应用完成部署后：

1. 选择你刚创建的 deployment 以查看更多细节。
2. 点击右上角的 **Studio** 按钮。Studio 将打开并显示你的图。

### 4. 获取 deployment 的 API URL

1. 在 LangGraph 的 **Deployment details** 视图中，点击 **API URL** 将其复制到剪贴板。
2. 点击 `URL` 将其复制到剪贴板。

### 5. 测试 API

现在你可以测试 API：

<Tabs>
  <Tab title="TypeScript">
    1. 安装 LangGraph SDK：

    ```shell  theme={null}
    npm install @langchain/langgraph-sdk
    ```
    
    2. 向智能体发送一条消息：
    
    ```ts  theme={null}
    import { Client } from "@langchain/langgraph-sdk";
    
    const client = new Client({ apiUrl: "your-deployment-url", apiKey: "your-langsmith-api-key" });
    
    const streamResponse = client.runs.stream(
      null,    // 无线程运行（threadless run）
      "agent", // 智能体名称。在 langgraph.json 中定义。
      {
        input: {
          "messages": [
            { "role": "user", "content": "什么是 LangGraph？"}
          ]
        },
        streamMode: "messages",
      }
    );
    
    for await (const chunk of streamResponse) {
      console.log(`正在接收类型为 ${chunk.event} 的新事件...`);
      console.log(JSON.stringify(chunk.data));
      console.log("\n\n");
    }
    ```
  </Tab>

  <Tab title="Rest API">
    ```bash  theme={null}
    curl -s --request POST \
        --url <DEPLOYMENT_URL>/runs/stream \
        --header 'Content-Type: application/json' \
        --header "X-Api-Key: <LANGSMITH API KEY> \
        --data "{
            \"assistant_id\": \"agent\", `# 智能体名称。在 langgraph.json 中定义。`
            \"input\": {
                \"messages\": [
                    {
                        \"role\": \"human\",
                        \"content\": \"什么是 LangGraph？\"
                    }
                ]
            },
            \"stream_mode\": \"updates\"
        }"
    ```
  </Tab>
</Tabs>

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/deploy.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
