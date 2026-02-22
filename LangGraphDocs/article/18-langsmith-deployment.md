# 18. LangSmith 部署：给你的 AI Agent 找个"托管保姆"

## 简单来说

**LangSmith Cloud** 是专为 AI Agent 设计的托管部署平台。你只需要把代码推到 GitHub，剩下的服务器配置、自动扩容、状态管理这些脏活累活，全都由 LangSmith 帮你搞定。**从"推代码"到"上线服务"，只需要 15 分钟。**

---

## 🎯 本节目标

学完本节，你将能够回答：

1. 为什么传统服务器不适合部署 AI Agent？
2. LangSmith Cloud 解决了哪些部署痛点？
3. 如何将 GitHub 代码一键部署到 LangSmith？
4. 如何获取 API URL 并调用已部署的 Agent？
5. Thread 和 Threadless Run 有什么区别？

---

## 核心痛点与解决方案

### 痛点：传统部署方式的三大"噩梦"

传统的 Web 服务器是为**无状态、短请求**设计的，但 AI Agent 需要：

| 😵 痛点 | 具体表现 |
|--------|---------|
| 服务器选型头疼 | AWS? GCP? Azure? 光选服务器就够喝一壶 |
| 状态管理噩梦 | 传统服务无状态，对话上下文分分钟丢失 |
| 长任务超时 | Agent 可能要跑几分钟，但服务器 30 秒就给你断了 |
| 扩容难题 | 用户暴增时手动加机器？等你加完，用户早跑了 |

### 解决：LangSmith Cloud 的"全家桶服务"

```
传统部署：代码 → 配置服务器 → 配置数据库 → 配置负载均衡 → 手动运维 → 累死

LangSmith：代码 → 推送 GitHub → 点击部署 → 完事儿
```

**LangSmith Cloud 是专门为"有状态、长运行"的 AI Agent 设计的：**
- ✅ **有状态（Stateful）** —— 自动管理对话上下文，用户说"我叫小明"，过一会儿还能记得
- ✅ **长运行（Long-running）** —— 分析 100 页 PDF 要跑 5 分钟？不会中途断掉
- ✅ **自动扩容** —— 流量暴增时自动加机器，无需手动干预

---

## 生活化类比

### 开餐厅 vs. 入驻美团外卖 🍔

想象你是个厨师，想开餐厅卖饭：

| 传统方式（自己开餐厅） | LangSmith 方式（入驻美团） |
|-----------------------|--------------------------|
| 找店面 → 选服务器 | 把菜谱（代码）上传 GitHub |
| 装修 → 配置环境 | 点击 "New Deployment" |
| 招服务员 → 配置负载均衡 | 等 15 分钟，自动完成 |
| 生意好扩店 → 手动扩容 | 美团自动调配（自动扩容） |
| 累死 | 专注做好菜就行 |

**关键对应关系：**

| 餐厅概念 | LangSmith 对应 |
|----------|----------------|
| 你的菜谱 | GitHub 仓库（Agent 代码） |
| 美团外卖平台 | LangSmith Cloud |
| 上架到美团 | Deploy 部署 |
| 外卖店铺链接 | API URL |
| 美团商家后台 | Studio（测试调试界面） |

---

## 部署流程详解

### 前置条件

| 准备项 | 说明 |
|--------|------|
| GitHub 账号 | 代码托管平台 |
| LangSmith 账号 | 免费注册 [smith.langchain.com](https://smith.langchain.com) |
| 符合规范的项目 | 包含 `langgraph.json` 配置文件 |

### 步骤 1：准备项目结构

确保你的项目包含以下文件：

```plaintext
my-agent/
├── src/
│   └── agent.ts           # Agent 代码
├── package.json           # 依赖清单
├── .env                   # 环境变量（不要提交到 Git！）
└── langgraph.json         # LangGraph 配置文件
```

**langgraph.json 示例：**

```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.js:agentGraph"
  },
  "env": ".env"
}
```

### 步骤 2：推送代码到 GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/my-agent.git
git push -u origin main
```

**⚠️ 重要提醒：** 确保 `.env` 文件在 `.gitignore` 中，不要把 API Key 提交到 GitHub！

### 步骤 3：在 LangSmith 创建部署

1. 登录 [LangSmith](https://smith.langchain.com/)
2. 在左侧边栏点击 **Deployments**
3. 点击 **+ New Deployment** 按钮
4. 连接你的 GitHub 账号（首次需要授权）
5. 选择你的仓库
6. 点击 **Submit** 开始部署

### 步骤 4：等待部署完成

部署过程大约需要 **15 分钟**。你可以在 **Deployment details** 页面查看进度：

```
部署状态：
├── 🔄 拉取代码...
├── 🔄 安装依赖...
├── 🔄 构建应用...
├── 🔄 启动服务...
└── ✅ 部署完成！
```

### 步骤 5：获取 API URL

部署完成后：
1. 点击刚创建的 deployment
2. 在 **Deployment details** 页面找到 **API URL**
3. 点击复制到剪贴板

```
API URL: https://your-deployment.langsmith.com
```

### 步骤 6：在 Studio 测试

点击右上角的 **Studio** 按钮，打开可视化测试界面：
- 发送测试消息
- 查看执行 Trace
- 调试问题

---

## 调用已部署的 Agent

### 方式 1：使用 LangGraph SDK（推荐）

**安装 SDK：**

```bash
npm install @langchain/langgraph-sdk
```

**调用示例：**

```typescript
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ 
  apiUrl: "https://your-deployment.langsmith.com",
  apiKey: "your-langsmith-api-key"
});

const streamResponse = client.runs.stream(
  null,
  "agent",
  {
    input: {
      messages: [
        { role: "user", content: "What is LangGraph?" }
      ]
    },
    streamMode: "messages",
  }
);

for await (const chunk of streamResponse) {
  console.log(`Event: ${chunk.event}`);
  console.log(JSON.stringify(chunk.data));
}
```

**💡 人话解读：**

| 代码片段 | 意思 |
|----------|------|
| `new Client({...})` | 创建一个"遥控器"，连接到你的 Agent 服务 |
| `client.runs.stream(null, "agent", {...})` | `null` 表示一次性对话，`"agent"` 是在 langgraph.json 中定义的图名 |
| `streamMode: "messages"` | 流式输出，AI 一个字一个字回复 |
| `for await (const chunk of streamResponse)` | 实时接收 AI 输出的每一个片段 |

### 方式 2：使用 REST API

```bash
curl -s --request POST \
    --url https://your-deployment.langsmith.com/runs/stream \
    --header 'Content-Type: application/json' \
    --header 'X-Api-Key: your-langsmith-api-key' \
    --data '{
        "assistant_id": "agent",
        "input": {
            "messages": [
                {"role": "human", "content": "What is LangGraph?"}
            ]
        },
        "stream_mode": "updates"
    }'
```

---

## Thread vs Threadless Run

### Threadless Run（无线程运行）

```typescript
const response = client.runs.stream(
  null,  // ← null 表示 Threadless
  "agent",
  { input: { messages: [...] } }
);
```

**特点：**
- 一次性对话，说完就散
- 不保留对话历史
- 适合独立的单轮问答

### Thread Run（线程运行）

```typescript
const thread = await client.threads.create();

const response = client.runs.stream(
  thread.thread_id,  // ← 指定 Thread ID
  "agent",
  { input: { messages: [...] } }
);
```

**特点：**
- 对话有上下文
- 历史消息自动保存
- 适合多轮对话场景

**对比表格：**

| 特性 | Threadless Run | Thread Run |
|------|----------------|------------|
| 上下文记忆 | ❌ 无 | ✅ 有 |
| 历史保存 | ❌ 不保存 | ✅ 自动保存 |
| 适用场景 | 单轮问答 | 多轮对话 |
| 参数值 | `null` | `thread.thread_id` |

---

## 业务场景：电商智能客服部署

### 场景需求

- 用户可以查询订单状态
- 需要记住用户之前提供的订单号
- 有时候查询数据库需要几秒钟

### 不用 LangSmith Cloud 的痛苦

```
Day 1: 在 AWS EC2 上部署，配置安全组、负载均衡...
Day 2: 发现对话记录丢失，开始研究 Redis 存会话
Day 3: 双十一流量暴增，服务器崩了，手动加机器
Day 4: 发现 Bug，需要重新部署，又是一顿配置
Day 5: 老板问为什么还没上线...
```

### 用 LangSmith Cloud 的体验

```
Step 1: 把客服 Agent 代码推到 GitHub        (10 分钟)
Step 2: 在 LangSmith 点击 "New Deployment"  (2 分钟)
Step 3: 等待自动部署完成                     (15 分钟)
Step 4: 把 API URL 给前端同学集成            (5 分钟)
Step 5: 上线完成，去喝咖啡 ☕
```

### 效率对比

| 维度 | 传统方式 | LangSmith Cloud |
|------|----------|-----------------|
| 部署时间 | 1-3 天 | 15 分钟 |
| 状态管理 | 自己搞 Redis | 自动处理 |
| 自动扩容 | 需要配置 | 内置支持 |
| 长任务支持 | 可能超时 | 原生支持 |
| 监控调试 | 自己接入监控 | Studio 内置 |

---

## 完整部署示例

### 项目代码 (src/agent.ts)

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
});

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

async function chatNode(state: typeof AgentState.State) {
  const response = await llm.invoke([
    { role: "system", content: "你是一个友好的 AI 助手。" },
    ...state.messages,
  ]);
  
  return { messages: [response] };
}

const graph = new StateGraph(AgentState)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END);

export const agentGraph = graph.compile();
```

### langgraph.json

```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./dist/agent.js:agentGraph"
  },
  "env": ".env"
}
```

### package.json

```json
{
  "name": "my-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/agent.js"
  },
  "dependencies": {
    "@langchain/langgraph": "^0.2.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/core": "^0.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

### .gitignore

```
node_modules/
dist/
.env
.env.local
```

### 部署后调用

```typescript
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ 
  apiUrl: "https://your-deployment.langsmith.com",
  apiKey: process.env.LANGSMITH_API_KEY!
});

async function chat(message: string) {
  const thread = await client.threads.create();
  
  const response = client.runs.stream(
    thread.thread_id,
    "agent",
    {
      input: {
        messages: [{ role: "user", content: message }]
      },
      streamMode: "messages",
    }
  );
  
  let fullResponse = "";
  for await (const chunk of response) {
    if (chunk.event === "messages/partial") {
      const content = chunk.data?.[0]?.content;
      if (content) {
        process.stdout.write(content);
        fullResponse += content;
      }
    }
  }
  
  return fullResponse;
}

chat("你好，介绍一下你自己");
```

---

## 部署选项对比

LangSmith 提供多种部署方式，适合不同需求：

| 部署方式 | 适用场景 | 复杂度 | 数据控制 |
|----------|----------|--------|----------|
| **Cloud（本文）** | 想省事、快速上线 | ⭐ 低 | LangSmith 托管 |
| **Control Plane** | 数据安全要求高 | ⭐⭐ 中 | 混合部署 |
| **Standalone** | 完全自主控制 | ⭐⭐⭐ 高 | 完全自托管 |

---

## 避坑指南

### ❌ 坑 1：忘记配置环境变量

部署后 Agent 无法工作，通常是因为环境变量没配置。

**解决方案：** 在 LangSmith 的 Deployment 设置中添加环境变量：
- `OPENAI_API_KEY`
- `LANGSMITH_API_KEY`

### ❌ 坑 2：引用 .ts 文件而非 .js

```json
// ❌ 错误
{
  "graphs": {
    "agent": "./src/agent.ts:agentGraph"
  }
}

// ✅ 正确
{
  "graphs": {
    "agent": "./dist/agent.js:agentGraph"
  }
}
```

### ❌ 坑 3：没有导出 Graph

```typescript
// ❌ 错误：没有导出
const agentGraph = graph.compile();

// ✅ 正确：必须导出
export const agentGraph = graph.compile();
```

### ❌ 坑 4：把 API Key 提交到 GitHub

**解决方案：**
1. 在 `.gitignore` 中添加 `.env`
2. 使用 LangSmith 的环境变量管理功能

---

## 总结对比表

| 概念 | 说明 | 类比 |
|------|------|------|
| **LangSmith Cloud** | 全托管部署平台 | 美团外卖平台 |
| **API URL** | 部署后的访问地址 | 外卖店铺链接 |
| **Thread** | 有上下文的对话会话 | 聊天房间 |
| **Threadless Run** | 一次性无记忆对话 | 路人问路 |
| **Studio** | 可视化测试界面 | 商家后台 |

---

## 核心要点回顾

1. **专为 AI Agent 设计** —— 解决有状态、长运行的部署难题
2. **GitHub 集成** —— 推代码即部署，无需配置服务器
3. **15 分钟上线** —— 从代码到可用 API，极速部署
4. **Thread 管理** —— 自动处理对话上下文，无需自己存储
5. **免运维** —— 自动扩容、监控、日志，全部内置

---

## 下一步学习

- **可观测性**：学习如何监控和分析生产环境的 Agent
- **项目实战**：构建完整的多轮对话助手
- **性能优化**：提升 Agent 响应速度和降低成本
