> ## 文档索引
> 在此获取完整的文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用该文件发现所有可用页面。

# 应用结构

一个 LangGraph 应用由一个或多个图、一个配置文件（`langgraph.json`）、一个用于指定依赖的文件，以及一个可选的用于指定环境变量的 `.env` 文件组成。

本指南展示了应用的典型结构，并说明如何提供将应用部署到 [LangSmith Deployment](/langsmith/deployments) 所需的配置。

<Info>
  LangSmith Deployment 是一个托管式托管平台，用于部署与扩缩容 LangGraph 智能体。它处理基础设施、扩缩容与运维方面的问题，使你能够直接从仓库部署有状态、长时间运行的智能体。更多信息请参阅[部署文档](/langsmith/deployments)。
</Info>

## 关键概念

要使用 LangSmith 进行部署，需要提供以下信息：

1. [LangGraph 配置文件](#configuration-file-concepts)（`langgraph.json`），用于指定该应用要使用的依赖、图与环境变量。
2. 实现应用逻辑的[图](#graphs)。
3. 一个用于指定运行应用所需[依赖](#dependencies)的文件。
4. 应用运行所需的[环境变量](#environment-variables)。

## 文件结构

以下是应用目录结构示例：

```plaintext  theme={null}
my-app/
├── src # 所有项目代码都位于此目录
│   ├── utils # 图的可选工具函数
│   │   ├── tools.ts # 图的工具
│   │   ├── nodes.ts # 图的节点函数
│   │   └── state.ts # 图的 state 定义
│   └── agent.ts # 构建图的代码
├── package.json # 包依赖
├── .env # 环境变量
└── langgraph.json # LangGraph 配置文件
```

<Note>
  LangGraph 应用的目录结构会因编程语言与所使用的包管理器而有所不同。
</Note>

<a id="configuration-file-concepts" />

## 配置文件

`langgraph.json` 文件是一个 JSON 文件，用于指定部署 LangGraph 应用所需的依赖、图、环境变量以及其他设置。

关于该 JSON 文件中所有受支持键的详细信息，请参阅 [LangGraph 配置文件参考](/langsmith/cli#configuration-file)。

<Tip>
  [LangGraph CLI](/langsmith/cli) 默认使用当前目录中的配置文件 `langgraph.json`。
</Tip>

### 示例

* 依赖将从本地目录中的依赖文件加载（例如 `package.json`）。
* 将从文件 `./your_package/your_file.js` 中加载一个图，并使用其中的函数 `agent`。
* 环境变量 `OPENAI_API_KEY` 以内联方式设置。

```json  theme={null}
{
  "dependencies": ["."],
  "graphs": {
    "my_agent": "./your_package/your_file.js:agent"
  },
  "env": {
    "OPENAI_API_KEY": "secret-key"
  }
}
```

## 依赖

LangGraph 应用可能依赖其他 TypeScript/JavaScript 库。

通常你需要提供以下信息，以便正确设置依赖：

1. 目录中用于指定依赖的文件（例如 `package.json`）。

2. [LangGraph 配置文件](#configuration-file-concepts)中的 `dependencies` 键，用于指定运行 LangGraph 应用所需的依赖。

3. 任何额外的二进制文件或系统库可以通过 [LangGraph 配置文件](#configuration-file-concepts)中的 `dockerfile_lines` 键来指定。

## 图

使用 [LangGraph 配置文件](#configuration-file-concepts)中的 `graphs` 键来指定在已部署的 LangGraph 应用中可用的图。

你可以在配置文件中指定一个或多个图。每个图由一个名称（应当唯一）与一个路径标识，该路径指向：（1）已编译的图，或（2）用于构建图的函数所在位置。

## 环境变量

如果你在本地使用已部署的 LangGraph 应用，可以在 [LangGraph 配置文件](#configuration-file-concepts)的 `env` 键中配置环境变量。

对于生产部署，你通常希望在部署环境中配置环境变量。

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/application-structure.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
