> ## 文档索引
> 获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# 运行本地服务器

本指南将向你展示如何在本地运行一个 LangGraph 应用。

## 前置条件

开始之前，请确保你具备以下条件：

* 一个 [LangSmith](https://smith.langchain.com/settings) 的 API key（可免费注册）

## 1. 安装 LangGraph CLI

```shell  theme={null}
npm install --save-dev @langchain/langgraph-cli
```

## 2. 创建 LangGraph 应用

使用 [`new-langgraph-project-js` 模板](https://github.com/langchain-ai/new-langgraphjs-project)创建一个新应用。该模板演示了一个单节点应用，你可以在其基础上扩展自己的逻辑。

```shell  theme={null}
npm create langgraph
```

<Accordion title="将 LangGraph 添加到现有项目中">
  如果你有一个包含 LangGraph 智能体的现有项目，可以使用 `config` 命令自动生成 `langgraph.json` 配置文件：

  ```shell  theme={null}
  npm create langgraph config
  ```

  该命令会扫描你的项目，以查找 LangGraph 智能体（例如 `createAgent()`、`StateGraph.compile()` 或 `workflow.compile()` 之类的模式），并生成一个包含所有导出智能体的配置文件。

  示例输出：

  ```json  theme={null}
  {
    "node_version": "24",
    "graphs": {
      "agent": "./src/agent.ts:agent",
      "searchAgent": "./src/search.ts:searchAgent"
    },
    "env": ".env"
  }
  ```

  <Tip>
    配置中只会包含 **已导出（exported）** 的智能体。如果某个智能体未导出，该命令会提示警告，便于你添加 `export` 关键字。
  </Tip>
</Accordion>

## 3. 安装依赖

在新 LangGraph 应用的根目录中安装依赖（`edit` 模式），以便服务器使用你的本地修改：

```shell  theme={null}
cd path/to/your/app
npm install
```

## 4. 创建 `.env` 文件

在新 LangGraph 应用的根目录中，你会找到一个 `.env.example`。请在根目录创建 `.env` 文件，并将 `.env.example` 的内容复制进去，然后填写必要的 API key：

```bash  theme={null}
LANGSMITH_API_KEY=lsv2...
```

## 5. 启动 Agent server

在本地启动 LangGraph API 服务器：

```shell  theme={null}
npx @langchain/langgraph-cli dev
```

示例输出：

```
INFO:langgraph_api.cli:

        欢迎使用

╦  ┌─┐┌┐┌┌─┐╔═╗┬─┐┌─┐┌─┐┬ ┬
║  ├─┤││││ ┬║ ╦├┬┘├─┤├─┘├─┤
╩═╝┴ ┴┘└┘└─┘╚═╝┴└─┴ ┴┴  ┴ ┴

- 🚀 API: http://127.0.0.1:2024
- 🎨 Studio UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
- 📚 API Docs: http://127.0.0.1:2024/docs

该内存内服务器专为开发与测试而设计。
用于生产环境时，请使用 LangSmith Deployment。
```

`langgraph dev` 命令会以内存模式启动 Agent Server。该模式适合开发与测试。用于生产环境时，请部署可访问持久化存储后端的 Agent Server。更多信息请参阅 [平台设置概览](/langsmith/platform-setup)。

## 6. 在 Studio 中测试你的应用

[Studio](/langsmith/studio) 是一个专用 UI，你可以将其连接到 LangGraph API server，以便在本地可视化、交互与调试应用。要在 Studio 中测试你的图，请访问 `langgraph dev` 命令输出中提供的 URL：

```
>    - LangGraph Studio Web UI: https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
```

如果你的 Agent Server 运行在自定义 host/port 上，请更新 URL 中 `baseUrl` 查询参数。例如，如果你的服务器运行在 `http://myhost:3000`：

```
https://smith.langchain.com/studio/?baseUrl=http://myhost:3000
```

<Accordion title="Safari 兼容性">
  由于 Safari 在连接 localhost 服务器时存在限制，请在命令中使用 `--tunnel` 标志来创建安全隧道：

  ```shell  theme={null}
  langgraph dev --tunnel
  ```
</Accordion>

## 7. 测试 API

<Tabs>
  <Tab title="JavaScript SDK">
    1. 安装 LangGraph JS SDK：
       ```shell  theme={null}
       npm install @langchain/langgraph-sdk
       ```
    2. 向助手发送一条消息（无线程运行 / threadless run）：

    ```js  theme={null}
    import { Client } from "@langchain/langgraph-sdk";
    
    // 仅当你在调用 langgraph dev 时修改了默认端口，才需要设置 apiUrl
    const client = new Client({ apiUrl: "http://localhost:2024"});
    
    const streamResponse = client.runs.stream(
      null, // 无线程运行
      "agent", // 助手 ID
      {
        input: {
          "messages": [
            { "role": "user", "content": "什么是 LangGraph？"}
          ]
        },
        streamMode: "messages-tuple",
      }
    );
    
    for await (const chunk of streamResponse) {
      console.log(`正在接收类型为：${chunk.event} 的新事件...`);
      console.log(JSON.stringify(chunk.data));
      console.log("\n\n");
    }
    ```
  </Tab>

  <Tab title="Rest API">
    ```bash  theme={null}
    curl -s --request POST \
        --url "http://localhost:2024/runs/stream" \
        --header 'Content-Type: application/json' \
        --data "{
            \"assistant_id\": \"agent\",
            \"input\": {
                \"messages\": [
                    {
                        \"role\": \"human\",
                        \"content\": \"什么是 LangGraph？\"
                    }
                ]
            },
            \"stream_mode\": \"messages-tuple\"
        }"
    ```
  </Tab>
</Tabs>

## 后续步骤

现在你已经在本地运行了 LangGraph 应用，可以进一步探索部署与高级功能：

* [部署快速入门](/langsmith/deployment-quickstart)：使用 LangSmith 部署你的 LangGraph 应用。

* [LangSmith](/langsmith/home)：了解 LangSmith 的基础概念。

* [SDK Reference](https://reference.langchain.com/javascript/modules/_langchain_langgraph-sdk.html)：探索 SDK API 参考文档。

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/local-server.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
