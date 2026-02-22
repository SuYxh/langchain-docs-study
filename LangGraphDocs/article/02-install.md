# LangGraph 环境安装与配置

## 简单来说

LangGraph 就是一个让你能搭建"会思考、有状态、能循环"的 AI 工作流的 JavaScript/TypeScript 库。这篇文章教你怎么把它装进你的项目里，就像教你怎么把乐高积木拿回家一样简单。

---

## 🎯 本节目标

学完本节，你将能够回答：

- 需要安装哪些依赖包？
- 每个包的作用是什么？
- 如何选择和配置 LLM 提供商？
- 开发环境需要哪些准备工作？

---

## 核心痛点与解决方案

### 痛点：为什么需要安装这些包？

想象一下这个场景：

- **没有 LangGraph 之前：** 你想让 AI 做一个稍微复杂点的任务（比如：先查资料、再分析、最后写报告），你得自己写一堆 if-else、while 循环，还要手动管理"AI 现在做到哪一步了"这个状态。代码写得像意大利面条一样，改一个地方全身抽搐。

- **有了 LangGraph 之后：** 它帮你把这些复杂的流程抽象成一张"图"（Graph），每个节点是一个任务，边是任务之间的流转逻辑。你只管定义"谁做什么"和"做完之后去哪"，剩下的状态管理、循环控制它全包了。

### 解决：需要安装的核心包

| 你装的包 | 它的作用 | 必需性 |
|---------|---------|--------|
| `@langchain/langgraph` | 核心引擎 - 让你能画"流程图"并执行它 | ⭐ 必装 |
| `@langchain/core` | 基础设施 - 提供消息、提示词等基础组件 | ⭐ 必装 |
| `langchain` | 工具箱 - 提供现成的 LLM 调用和工具定义方法 | 推荐 |
| LLM Provider 包 | 连接具体 AI 模型的"适配器" | 按需 |

---

## 生活化类比：开一家智能餐厅

把搭建 LangGraph 想象成**开一家智能餐厅**：

| 技术概念 | 餐厅类比 | 解释 |
|---------|---------|------|
| `@langchain/langgraph` | 餐厅的厨房系统 | 定义了点菜后，菜品如何在各个工位之间流转 |
| `@langchain/core` | 基础设施（锅碗瓢盆、燃气灶） | 不管做什么菜，这些基础工具都得有 |
| `langchain` | 预制菜和半成品 | 有些常用的菜直接用半成品更快 |
| LLM Provider（如 OpenAI） | 厨师 | 真正做菜的人，不同厨师擅长不同菜系 |

**所以安装过程就是：** 想开餐厅，先把厨房系统装好，再把基础设施搞定，然后根据你要做的菜（任务）去请对应的厨师（LLM）。

---

## 安装步骤详解

### Step 1：安装核心包（必需）

选择你熟悉的包管理器执行以下命令：

```bash
# npm
npm install @langchain/langgraph @langchain/core

# pnpm
pnpm add @langchain/langgraph @langchain/core

# yarn
yarn add @langchain/langgraph @langchain/core

# bun
bun add @langchain/langgraph @langchain/core
```

💡 **人话解读：** "嘿，包管理器，帮我把 LangGraph 引擎和它的基础配件都下载到我的项目里，我要开始搭建 AI 工作流了。"

### Step 2：安装 LangChain（推荐）

```bash
# npm
npm install langchain

# pnpm
pnpm add langchain

# yarn
yarn add langchain

# bun
bun add langchain
```

💡 **人话解读：** "顺便把那个便利工具箱也给我拿来，里面有很多现成的工具，我懒得自己造轮子。"

### Step 3：安装 LLM Provider 包（按需）

根据你要使用的 AI 模型，安装对应的 Provider 包：

```bash
# OpenAI (GPT-4, GPT-3.5)
npm install @langchain/openai

# Anthropic (Claude)
npm install @langchain/anthropic

# Google (Gemini)
npm install @langchain/google-genai

# Azure OpenAI
npm install @langchain/azure-openai
```

---

## 常用 LLM Provider 一览

| Provider | 包名 | 主要模型 | 特点 |
|----------|------|---------|------|
| **OpenAI** | `@langchain/openai` | GPT-4, GPT-3.5 | 最流行，生态成熟 |
| **Anthropic** | `@langchain/anthropic` | Claude 3.5, Claude 3 | 安全性强，上下文长 |
| **Google** | `@langchain/google-genai` | Gemini Pro, Gemini Ultra | 多模态能力强 |
| **Azure** | `@langchain/azure-openai` | Azure 托管的 OpenAI 模型 | 企业级，合规性好 |

---

## 环境变量配置

安装完包之后，还需要配置 API Key。创建 `.env` 文件：

```bash
# OpenAI
OPENAI_API_KEY=sk-xxx

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxx

# Google
GOOGLE_API_KEY=xxx

# LangSmith (可选，用于调试追踪)
LANGSMITH_API_KEY=lsv2-xxx
LANGSMITH_TRACING=true
```

⚠️ **重要提醒：**
- 永远不要把 `.env` 文件提交到 Git 仓库
- 在 `.gitignore` 中添加 `.env`

---

## 验证安装

创建一个简单的测试文件 `test-install.ts`：

```typescript
import { StateSchema, MessagesValue, GraphNode, StateGraph, START, END } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const echoNode: GraphNode<typeof State> = (state) => {
  const lastMessage = state.messages.at(-1);
  return { 
    messages: [{ 
      role: "ai", 
      content: `收到: ${lastMessage?.content}` 
    }] 
  };
};

const graph = new StateGraph(State)
  .addNode("echo", echoNode)
  .addEdge(START, "echo")
  .addEdge("echo", END)
  .compile();

const result = await graph.invoke({ 
  messages: [{ role: "user", content: "Hello LangGraph!" }] 
});

console.log("测试结果:", result.messages.at(-1)?.content);
// 输出: 测试结果: 收到: Hello LangGraph!
```

运行测试：

```bash
npx tsx test-install.ts
```

如果看到输出 `测试结果: 收到: Hello LangGraph!`，说明安装成功！🎉

---

## 推荐的项目结构

```
my-langgraph-project/
├── src/
│   ├── agents/           # Agent 定义
│   │   └── my-agent.ts
│   ├── nodes/            # 节点函数
│   │   ├── llm-node.ts
│   │   └── tool-node.ts
│   ├── tools/            # 工具定义
│   │   └── calculator.ts
│   └── index.ts          # 入口文件
├── .env                  # 环境变量（不要提交到 Git！）
├── .env.example          # 环境变量示例
├── .gitignore
├── package.json
└── tsconfig.json
```

---

## TypeScript 配置建议

推荐的 `tsconfig.json` 配置：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

---

## 安装清单汇总

### 必装

| 包名 | 说明 | 安装命令 |
|------|------|---------|
| `@langchain/langgraph` | 核心引擎，没它啥都干不了 | `npm i @langchain/langgraph` |
| `@langchain/core` | 基础组件，配套使用 | `npm i @langchain/core` |

### 推荐安装

| 包名 | 说明 | 安装命令 |
|------|------|---------|
| `langchain` | 便利工具箱，让开发更省心 | `npm i langchain` |
| `zod` | Schema 验证，定义工具参数用 | `npm i zod` |

### 按需安装

| 包名 | 说明 | 安装命令 |
|------|------|---------|
| `@langchain/openai` | 使用 OpenAI 模型 | `npm i @langchain/openai` |
| `@langchain/anthropic` | 使用 Claude 模型 | `npm i @langchain/anthropic` |
| `@langchain/langgraph-checkpoint-postgres` | PostgreSQL 持久化 | `npm i @langchain/langgraph-checkpoint-postgres` |

---

## 常见问题排查

### Q1: 安装时报错 "peer dependency" 警告

**A:** 通常可以忽略，或者使用 `--legacy-peer-deps` 参数：
```bash
npm install @langchain/langgraph --legacy-peer-deps
```

### Q2: TypeScript 报类型错误

**A:** 确保安装了匹配版本的包，可以尝试：
```bash
npm update @langchain/langgraph @langchain/core
```

### Q3: 运行时报 "API Key not found"

**A:** 检查 `.env` 文件：
1. 确保文件名是 `.env`（不是 `.env.txt`）
2. 确保没有多余的空格
3. 如果使用 ES Module，需要手动加载：
```typescript
import 'dotenv/config';
```

---

## 核心要点回顾

1. **必装两个包**：`@langchain/langgraph` + `@langchain/core`
2. **推荐安装**：`langchain` 便利工具箱
3. **按需选择 LLM Provider**：根据你用的模型安装对应的包
4. **配置环境变量**：API Key 放在 `.env` 文件中，不要提交到 Git
5. **验证安装**：写个简单测试确保一切正常

---

## 下一步学习

环境搭建完成！接下来：

- 🚀 **[03-快速开始](./03-quickstart.md)**：动手构建你的第一个完整 Agent
- 🖥️ **[04-本地服务运行](./04-local-server.md)**：把 Agent 变成可调用的 API 服务

---

> 📅 更新时间：2026-02-22
