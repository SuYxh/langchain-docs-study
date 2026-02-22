# 16. 应用结构：给你的 AI 应用办一张"营业执照"

## 简单来说

**LangGraph 应用结构**就是一套标准化的"户口本"规范 —— 通过 `langgraph.json` 配置文件告诉部署平台：你的 AI 应用长什么样、需要哪些依赖、有哪些图、需要什么环境变量。**简单说，就是让你的 AI 应用能被正确打包、部署和运行的配置清单。**

---

## 🎯 本节目标

学完本节，你将能够回答：

1. 为什么需要 `langgraph.json` 配置文件？
2. 标准的 LangGraph 项目目录结构是什么样的？
3. 如何配置 `graphs`、`dependencies` 和 `env`？
4. 如何让项目结构支持多个 AI Agent？
5. 生产环境部署有哪些注意事项？

---

## 核心痛点与解决方案

### 痛点：没有标准化结构之前，部署有多痛苦？

想象一下，你写了一个超酷的 AI Agent，本地跑得飞起。但当你想把它部署到云端服务器时...

| 😵 问题 | 具体表现 |
|--------|---------|
| 代码乱放 | `tools.ts` 在根目录，`state.ts` 在某个神秘的子文件夹里 |
| 依赖不明 | 部署平台不知道你需要哪些包，运行时 `Module not found` |
| 入口不清 | "你到底有几个 Graph？入口函数叫什么？" 部署系统一脸懵 |
| 配置缺失 | API Key 没配置，应用跑不起来，用户看到一堆报错 |

**这就像你搬家时，搬家公司问："你的东西在哪？要搬哪些？"，而你说："我也不知道，你自己找吧"。**

### 解决：一个"户口本"搞定一切

LangGraph 通过 **`langgraph.json`** 配置文件，强制你把所有关键信息都写清楚：

```
配置文件 (langgraph.json)
           │
           ├── dependencies → 告诉平台去哪找 package.json
           │
           ├── graphs → 指明每个 Graph 的文件路径和导出函数
           │
           └── env → 配置 API Key 等敏感信息
```

---

## 生活化类比

### 把 LangGraph 应用想象成开一家新餐厅 🍽️

假设你要开一家智能餐厅（你的 AI 应用），你需要向市政府（LangSmith 部署平台）提交一份完整的**开业申请表**（`langgraph.json`）。

| 餐厅开业 | LangGraph 应用 | 作用说明 |
|----------|----------------|----------|
| 餐厅名称和地址 | 项目根目录 `my-app/` | 你的应用"住在哪" |
| 营业执照申请表 | `langgraph.json` | 核心配置文件，没它开不了业 |
| 厨房设备清单 | `package.json` | 需要哪些工具（依赖库） |
| 菜单（提供什么菜品） | `graphs` 配置 | 你的餐厅能提供哪些服务（AI 图） |
| 厨师和服务员 | `src/utils/` 目录 | 工具函数、节点函数、状态定义 |
| 主厨的招牌菜配方 | `src/agent.ts` | 核心图的构建逻辑 |
| 食材供应商联系方式 | `.env` 环境变量 | API Key、数据库密码等机密信息 |

**如果没有这份"开业申请表"会怎样？**

市政府（部署平台）："你说你要开餐厅，但你没告诉我你在哪、卖什么、用什么设备，我怎么批准你？" → 结果：**开业失败（部署失败）**

---

## 核心组件详解

### 1. 标准目录结构

```plaintext
my-app/
├── src/                   # 📁 所有业务代码都放这里
│   ├── utils/             # 📁 工具箱
│   │   ├── tools.ts       # 🔧 AI 能调用的工具（搜索、计算等）
│   │   ├── nodes.ts       # 🔲 图中每个节点的具体逻辑
│   │   └── state.ts       # 📋 状态的"模板"，定义数据结构
│   └── agent.ts           # ⭐ 主角！把节点、工具组装成完整的图
├── package.json           # 📦 npm 依赖清单
├── .env                   # 🔐 机密信息（API Key 等）
└── langgraph.json         # 🎫 部署配置文件（最重要！）
```

**💡 人话解读：**
- `src/` —— 代码的"家"，所有业务逻辑都住在这
- `src/utils/` —— 公共工具箱，存放可复用的组件
- `langgraph.json` —— 应用的"身份证"，部署时必须有

### 2. `langgraph.json` 配置详解

```json
{
  "dependencies": ["."],
  "graphs": {
    "my_agent": "./src/agent.js:agentGraph"
  },
  "env": {
    "OPENAI_API_KEY": "your-api-key"
  }
}
```

**逐行人话翻译：**

| 配置项 | 值 | 意思 |
|--------|-----|------|
| `"dependencies": ["."]` | `["."]` | "嘿平台，去当前目录找 `package.json`，把依赖都装上" |
| `"graphs"` | `{...}` | "我这个应用有哪些 AI 图可以用" |
| `"my_agent": "./src/agent.js:agentGraph"` | 路径:函数名 | "图叫 `my_agent`，代码在 `agent.js`，导出函数叫 `agentGraph`" |
| `"env"` | `{...}` | "运行时需要这些环境变量" |

### 3. graphs 配置格式

```
"图名称": "文件路径:导出函数名"
         │         │
         │         └── 冒号后面是函数名，别忘了！
         │
         └── 相对于项目根目录的路径
```

**多图配置示例：**

```json
{
  "graphs": {
    "chat_agent": "./src/agents/chat.js:chatGraph",
    "search_agent": "./src/agents/search.js:searchGraph",
    "summary_agent": "./src/agents/summary.js:summaryGraph"
  }
}
```

**💡 人话解读：** 一个项目可以有多个独立的 AI Agent，每个都有自己的入口。部署后，平台会为每个图创建独立的 API 端点。

### 4. dependencies 配置

```json
{
  "dependencies": ["."]
}
```

**工作原理：**
- `"."` 表示当前目录
- 平台会自动找到 `package.json` 并安装所有依赖
- 如果依赖在子目录，可以写 `["./packages/core"]`

**需要系统级依赖怎么办？**

```json
{
  "dependencies": ["."],
  "dockerfile_lines": [
    "RUN apt-get update && apt-get install -y ffmpeg"
  ]
}
```

**💡 人话解读：** 如果你的应用需要 `ffmpeg` 处理视频，或者其他系统工具，用 `dockerfile_lines` 添加安装命令。

### 5. env 环境变量配置

```json
{
  "env": {
    "OPENAI_API_KEY": "",
    "DATABASE_URL": "",
    "LANGCHAIN_API_KEY": ""
  }
}
```

**⚠️ 重要提醒：**

| 环境 | 推荐做法 |
|------|----------|
| 本地开发 | 在 `.env` 文件中配置，或在 `langgraph.json` 的 `env` 中填写 |
| 生产部署 | **永远不要把 Key 明文写在代码中！** 使用平台的环境变量管理功能 |

**`.env` 文件示例：**

```bash
OPENAI_API_KEY=sk-xxx...
DATABASE_URL=postgres://user:pass@host:5432/db
LANGCHAIN_API_KEY=lsv2_xxx...
```

---

## 业务场景：电商智能客服系统

让我们构建一个完整的电商客服系统，包含多个 Agent：

### 项目目录结构

```plaintext
ecommerce-support-bot/
├── src/
│   ├── utils/
│   │   ├── tools.ts         # 查订单、查库存、发邮件等工具
│   │   ├── state.ts         # 会话状态定义
│   │   └── prompts.ts       # 系统提示词
│   ├── agents/
│   │   ├── orderAgent.ts    # 处理订单查询
│   │   ├── refundAgent.ts   # 处理退款申请
│   │   └── faqAgent.ts      # 处理常见问题
│   └── router.ts            # 路由分发逻辑
├── package.json
├── .env
└── langgraph.json
```

### 状态定义 (src/utils/state.ts)

```typescript
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export const CustomerState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  customerId: Annotation<string>(),
  orderInfo: Annotation<Record<string, any> | null>({
    default: () => null,
  }),
  intent: Annotation<string>({
    default: () => "unknown",
  }),
});
```

### 订单查询 Agent (src/agents/orderAgent.ts)

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { CustomerState } from "../utils/state.js";
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

async function fetchOrderInfo(state: typeof CustomerState.State) {
  const orderId = extractOrderId(state.messages);
  const orderInfo = await queryDatabase(orderId);
  
  return { orderInfo };
}

async function generateResponse(state: typeof CustomerState.State) {
  const { orderInfo, messages } = state;
  
  const response = await llm.invoke([
    { role: "system", content: "你是订单查询助手，根据订单信息回复用户。" },
    ...messages,
    { role: "user", content: `订单信息：${JSON.stringify(orderInfo)}` },
  ]);
  
  return { messages: [response] };
}

function extractOrderId(messages: any[]): string {
  return "ORDER-12345";
}

async function queryDatabase(orderId: string) {
  return {
    orderId,
    status: "已发货",
    trackingNumber: "SF1234567890",
    estimatedDelivery: "2026-02-25",
  };
}

const orderGraph = new StateGraph(CustomerState)
  .addNode("fetchOrder", fetchOrderInfo)
  .addNode("respond", generateResponse)
  .addEdge(START, "fetchOrder")
  .addEdge("fetchOrder", "respond")
  .addEdge("respond", END);

export const orderAgent = orderGraph.compile();
```

### 退款 Agent (src/agents/refundAgent.ts)

```typescript
import { StateGraph, START, END, interrupt } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { CustomerState } from "../utils/state.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

async function analyzeRefundRequest(state: typeof CustomerState.State) {
  const response = await llm.invoke([
    { role: "system", content: "分析用户的退款请求，提取关键信息。" },
    ...state.messages,
  ]);
  
  return { 
    messages: [response],
    intent: "refund_request"
  };
}

async function humanApproval(state: typeof CustomerState.State) {
  const decision = interrupt({
    type: "refund_approval",
    message: "退款申请需要人工审核",
    orderInfo: state.orderInfo,
    amount: 299.00,
  });
  
  return { 
    messages: [{ role: "assistant", content: decision ? "退款已批准" : "退款被拒绝" }]
  };
}

async function processRefund(state: typeof CustomerState.State) {
  return { 
    messages: [{ role: "assistant", content: "退款处理完成，金额将在 3-5 个工作日内退回。" }]
  };
}

const refundGraph = new StateGraph(CustomerState)
  .addNode("analyze", analyzeRefundRequest)
  .addNode("approval", humanApproval)
  .addNode("process", processRefund)
  .addEdge(START, "analyze")
  .addEdge("analyze", "approval")
  .addEdge("approval", "process")
  .addEdge("process", END);

export const refundAgent = refundGraph.compile();
```

### FAQ Agent (src/agents/faqAgent.ts)

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { CustomerState } from "../utils/state.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

const FAQ_KNOWLEDGE = `
## 常见问题
1. 配送时间：一般 3-5 个工作日
2. 退换货政策：7 天无理由退换
3. 支付方式：支持微信、支付宝、银行卡
4. 会员权益：9 折优惠 + 免运费
`;

async function answerFAQ(state: typeof CustomerState.State) {
  const response = await llm.invoke([
    { role: "system", content: `你是客服助手，根据以下知识库回答问题：\n${FAQ_KNOWLEDGE}` },
    ...state.messages,
  ]);
  
  return { messages: [response] };
}

const faqGraph = new StateGraph(CustomerState)
  .addNode("answer", answerFAQ)
  .addEdge(START, "answer")
  .addEdge("answer", END);

export const faqAgent = faqGraph.compile();
```

### 路由器 (src/router.ts)

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { CustomerState } from "./utils/state.js";
import { orderAgent } from "./agents/orderAgent.js";
import { refundAgent } from "./agents/refundAgent.js";
import { faqAgent } from "./agents/faqAgent.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

async function classifyIntent(state: typeof CustomerState.State) {
  const response = await llm.invoke([
    { 
      role: "system", 
      content: "分析用户意图，返回：order_query | refund_request | faq。只返回分类结果。"
    },
    ...state.messages,
  ]);
  
  return { intent: response.content as string };
}

function routeByIntent(state: typeof CustomerState.State) {
  const intent = state.intent.trim().toLowerCase();
  
  if (intent.includes("order")) return "orderHandler";
  if (intent.includes("refund")) return "refundHandler";
  return "faqHandler";
}

async function handleOrder(state: typeof CustomerState.State) {
  const result = await orderAgent.invoke(state);
  return { messages: result.messages };
}

async function handleRefund(state: typeof CustomerState.State) {
  const result = await refundAgent.invoke(state);
  return { messages: result.messages };
}

async function handleFAQ(state: typeof CustomerState.State) {
  const result = await faqAgent.invoke(state);
  return { messages: result.messages };
}

const routerGraph = new StateGraph(CustomerState)
  .addNode("classify", classifyIntent)
  .addNode("orderHandler", handleOrder)
  .addNode("refundHandler", handleRefund)
  .addNode("faqHandler", handleFAQ)
  .addEdge(START, "classify")
  .addConditionalEdges("classify", routeByIntent, [
    "orderHandler", "refundHandler", "faqHandler"
  ])
  .addEdge("orderHandler", END)
  .addEdge("refundHandler", END)
  .addEdge("faqHandler", END);

export const mainRouter = routerGraph.compile();
```

### langgraph.json 配置

```json
{
  "dependencies": ["."],
  "graphs": {
    "main_router": "./src/router.js:mainRouter",
    "order_agent": "./src/agents/orderAgent.js:orderAgent",
    "refund_agent": "./src/agents/refundAgent.js:refundAgent",
    "faq_agent": "./src/agents/faqAgent.js:faqAgent"
  },
  "env": {
    "OPENAI_API_KEY": "",
    "DATABASE_URL": "",
    "EMAIL_API_KEY": ""
  }
}
```

### package.json

```json
{
  "name": "ecommerce-support-bot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/router.js",
    "dev": "ts-node src/router.ts"
  },
  "dependencies": {
    "@langchain/langgraph": "^0.2.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/core": "^0.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### 系统架构图

```
用户消息 → main_router
              │
              ├→ classify（意图分类）
              │
              ├→ [条件路由]
              │   │
              │   ├─ order_query → orderHandler → 查询订单信息 → 返回物流状态
              │   │
              │   ├─ refund_request → refundHandler → 人工审批 → 处理退款
              │   │
              │   └─ faq → faqHandler → 知识库回答 → 返回答案
              │
              └→ END
```

---

## 部署检查清单

在部署前，确保以下事项都已完成：

| 检查项 | 状态 | 说明 |
|--------|------|------|
| ✅ `langgraph.json` 存在 | 必须 | 没有这个文件无法部署 |
| ✅ `graphs` 路径正确 | 必须 | 路径指向编译后的 `.js` 文件，不是 `.ts` |
| ✅ 导出函数名正确 | 必须 | `文件路径:函数名` 格式，冒号不能忘 |
| ✅ `package.json` 完整 | 必须 | 所有依赖都已声明 |
| ✅ 环境变量已配置 | 必须 | 生产环境在平台配置，不要明文写代码 |
| ✅ 代码已编译 | 必须 | TypeScript 项目需要先 `npm run build` |

---

## 常见问题与避坑指南

### ❌ 错误 1：路径格式错误

```json
// ❌ 错误：忘记函数名
{
  "graphs": {
    "my_agent": "./src/agent.js"
  }
}

// ✅ 正确：文件路径:函数名
{
  "graphs": {
    "my_agent": "./src/agent.js:agentGraph"
  }
}
```

### ❌ 错误 2：引用 .ts 文件

```json
// ❌ 错误：引用 TypeScript 源文件
{
  "graphs": {
    "my_agent": "./src/agent.ts:agentGraph"
  }
}

// ✅ 正确：引用编译后的 JavaScript 文件
{
  "graphs": {
    "my_agent": "./src/agent.js:agentGraph"
  }
}
```

### ❌ 错误 3：环境变量明文提交

```json
// ❌ 错误：把 Key 明文写在配置中并提交到 Git
{
  "env": {
    "OPENAI_API_KEY": "sk-xxxxxxxxxxxx"
  }
}

// ✅ 正确：只声明需要的变量名，值留空
{
  "env": {
    "OPENAI_API_KEY": ""
  }
}
// 实际值通过平台环境变量或 .env 文件（不要提交）配置
```

### ❌ 错误 4：dependencies 格式错误

```json
// ❌ 错误：字符串格式
{
  "dependencies": "."
}

// ✅ 正确：数组格式
{
  "dependencies": ["."]
}
```

---

## 总结对比表

| 配置项 | 作用 | 格式 | 类比 |
|--------|------|------|------|
| `langgraph.json` | 应用配置清单 | JSON 文件 | 餐厅营业执照 |
| `graphs` | 声明可用的 AI 图 | `"名称": "路径:函数"` | 餐厅菜单 |
| `dependencies` | 指定依赖来源 | `["."]` 数组 | 设备清单 |
| `env` | 配置环境变量 | `{"KEY": "value"}` | 供应商联系方式 |
| `dockerfile_lines` | 系统级依赖 | Dockerfile 命令数组 | 特殊设备采购 |

---

## 核心要点回顾

1. **`langgraph.json` 是必需的** —— 没有它，再牛的代码也只能在本地跑
2. **路径格式是 `文件:函数`** —— 冒号分隔，指向编译后的 `.js` 文件
3. **环境变量要安全管理** —— 本地用 `.env`，生产用平台配置，绝不明文提交
4. **支持多图部署** —— 一个项目可以有多个独立的 Agent，各自有 API 端点
5. **目录结构要清晰** —— 代码放 `src/`，配置放根目录，各司其职

---

## 下一步学习

- **开发工具篇**：学习 LangSmith Studio 可视化调试
- **部署实战**：深入了解 LangSmith 云端部署流程
- **可观测性**：监控、日志和性能分析
