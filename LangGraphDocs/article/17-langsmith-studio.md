# 17. LangSmith Studio：给你的 AI Agent 装一个"透视眼镜"

## 简单来说

**LangSmith Studio** 是一个免费的可视化调试界面，它能让你实时看到 Agent 内部的每一步操作：发了什么 Prompt、调用了哪些工具、工具返回了什么、消耗了多少 Token。**从此告别 `console.log` 地狱，让本地开发 Agent 的体验从"蒙着眼开车"变成"开着导航跑高速"。**

---

## 🎯 本节目标

学完本节，你将能够回答：

1. LangSmith Studio 能解决什么调试痛点？
2. 如何配置本地 Agent 连接到 Studio？
3. 如何使用 Trace 追踪功能定位问题？
4. 什么是热重载（Hot-reload）？它如何提升开发效率？
5. 如何从对话的任意节点重新运行测试？

---

## 核心痛点与解决方案

### 痛点：开发 AI Agent 就像在黑箱里摸鱼

在没有 Studio 之前，开发 AI Agent 会遇到这些倒霉事：

| 😵 痛点 | 具体表现 |
|--------|---------|
| 黑箱调试 | Agent 给了个奇怪的回答，你完全不知道它中间经历了什么 |
| 反复重启 | 改一行代码就要重新运行整个对话流程，从头测试 |
| 日志地狱 | 为了调试，疯狂 `console.log`，最后代码里全是打印语句 |
| 状态难追 | 某个 bug 只在特定对话上下文中出现，复现困难 |
| Token 花费盲区 | 不知道每次调用消耗了多少 token，成本控制无从谈起 |

### 解决：Studio 让一切"可视化 + 可交互"

Studio 的解决思路很直接：**把 Agent 的"大脑活动"全部可视化，并允许你像玩游戏存档一样，从任意节点重新开始。**

```
开发 Agent 的传统方式：

  你 → 运行代码 → Agent 输出 → 🤷 "中间发生了什么？"
        │
        └── 出 bug → console.log → 重启 → 再测试 → 崩溃...

使用 Studio 的方式：

  你 → 运行代码 → Studio 可视化追踪
                      │
                      ├── Prompt 发了什么？ ✅ 清晰可见
                      ├── 工具调用了什么？ ✅ 参数、返回值全有
                      ├── 哪一步出问题？ ✅ 一眼定位
                      └── 从那一步重跑？ ✅ 一键搞定
```

---

## 生活化类比

### 把 Agent 开发比作"拍电影" 🎬

想象你是一个电影导演，正在拍一部 AI 主演的电影：

| 电影概念 | LangGraph 对应 | 说明 |
|----------|----------------|------|
| 演员 | Agent | AI 主演，执行各种任务 |
| 道具 | Tool (工具) | 发邮件工具 = 一部道具手机 |
| 剧本台词 | Prompt | 导演给演员的指示 |
| 导演监视器 | LangSmith Studio | 看每一个镜头的执行细节 |
| 拍摄录像 | Trace (追踪) | 完整记录每个镜头 |
| 一场戏的录像 | Thread (线程) | 从开拍到喊卡的完整记录 |

**没有 Studio 的情况：**
- 导演喊"开始！"，演员演完了，导演只能看到最终结果
- 演员中间演砸了，导演不知道是哪个环节出问题
- 想重拍中间某一段？对不起，必须从头来

**有了 Studio 的情况：**
- 导演面前有个大监视器，能看到演员的每一个表情、每一句台词
- 演砸了？导演可以回放录像，定位到具体哪一秒出的问题
- 想重拍中间某一段？直接从那个镜头开始，不用从头化妆

---

## 核心组件详解

### 1. 环境准备

使用 Studio 需要准备以下内容：

| 准备项 | 说明 | 获取方式 |
|--------|------|----------|
| LangSmith 账号 | 免费注册 | [smith.langchain.com](https://smith.langchain.com) |
| LangSmith API Key | 连接凭证 | 在 LangSmith 设置页面创建 |
| LangGraph CLI | 本地开发服务器 | `npx @langchain/langgraph-cli` |

### 2. 安装 LangGraph CLI

```bash
npx @langchain/langgraph-cli
```

**💡 人话解读：** CLI 就像一根 USB 数据线，把你的 Agent（手机）连接到 Studio（电脑）上。

### 3. 创建示例 Agent

```typescript
import { createAgent } from "@langchain/langgraph";

function sendEmail(to: string, subject: string, body: string): string {
  const email = { to, subject, body };
  console.log("Sending email:", email);
  return `Email sent to ${to}`;
}

const agent = createAgent({
  model: "gpt-4.1",
  tools: [sendEmail],
  systemPrompt: "You are an email assistant. Always use the sendEmail tool.",
});

export { agent };
```

**💡 人话解读：**
- **sendEmail 函数** —— 给 Agent 配备的"技能"，就像给员工一部能发邮件的手机
- **createAgent** —— 把大模型、工具、提示词组装成一个"智能员工"
- **export { agent }** —— 让外部（CLI）能找到并运行这个 Agent

### 4. 配置 langgraph.json

```json
{
  "dependencies": ["."],
  "graphs": {
    "agent": "./src/agent.ts:agent"
  },
  "env": ".env"
}
```

**逐行人话翻译：**

| 配置项 | 意思 |
|--------|------|
| `"dependencies": ["."]` | "去当前目录找依赖" |
| `"graphs": {...}` | "我的 Agent 在这些位置" |
| `"agent": "./src/agent.ts:agent"` | "Agent 在 agent.ts 文件里，导出名叫 agent" |
| `"env": ".env"` | "环境变量在 .env 文件里" |

### 5. 配置环境变量

创建 `.env` 文件：

```bash
LANGSMITH_API_KEY=lsv2_xxx...
OPENAI_API_KEY=sk-xxx...
```

**⚠️ 重要提醒：** 
- 确保 `.env` 文件不要提交到 Git！
- 在 `.gitignore` 中添加 `.env`

### 6. 项目结构

```plaintext
my-app/
├── src/
│   └── agent.ts           # Agent 代码
├── .env                   # 环境变量（不要提交到 Git！）
├── package.json           # 依赖清单
└── langgraph.json         # LangGraph 配置文件
```

### 7. 启动 Studio

```bash
npx @langchain/langgraph-cli dev
```

**启动后会发生什么：**
- 本地 Agent Server 启动在 `http://127.0.0.1:2024`
- 自动打开 Studio UI：`https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024`
- 热重载模式开启，代码修改自动生效

---

## Studio 核心功能

### 1. 执行追踪 (Trace)

Trace 是 Agent 执行过程的"完整录像"，包含：

```
Trace 示例：
├── Step 1: 收到用户输入
│   └── 内容: "帮我给 Alice 发一封会议邀请邮件"
│
├── Step 2: LLM 推理
│   ├── Prompt: [system + user 消息]
│   ├── Token 消耗: 150 tokens
│   └── 延迟: 1.2s
│
├── Step 3: 工具调用
│   ├── 工具: sendEmail
│   ├── 参数: { to: "alice@example.com", subject: "会议邀请", body: "..." }
│   └── 返回: "Email sent to alice@example.com"
│
└── Step 4: 最终输出
    └── 内容: "已成功发送邮件给 Alice！"
```

**💡 人话解读：** 就像行车记录仪，记录了 Agent 从起点到终点的每一个动作，出了问题随时回放查看。

### 2. 热重载 (Hot-reload)

```
传统开发流程：
  修改代码 → 停止服务 → 重新启动 → 测试 → 发现问题 → 再改... 🔄

Studio 热重载：
  修改代码 → 自动更新 → 直接测试 ✅
```

**改代码后，Studio 自动感知并更新，不用手动重启服务器！** 这个功能省去了无数次"改代码 → 停服务 → 重启服务 → 测试"的循环。

### 3. Thread 回放

Thread 是一次完整的对话会话，你可以：

- **从任意节点重新运行** —— 不用从头开始
- **修改中间状态** —— 测试不同的输入
- **对比不同版本** —— 看修改前后的效果差异

```
对话 Thread：
├── [用户] 帮我查询订单 #12345
├── [Agent] 调用 queryOrder 工具
├── [工具返回] { status: "已发货" }    ← 可以从这里重跑！
└── [Agent] 您的订单已发货...
```

### 4. Token/延迟指标

Studio 清晰展示每次调用的资源消耗：

| 指标 | 说明 |
|------|------|
| Token 消耗 | 每次 LLM 调用用了多少 token |
| 延迟 | 每个步骤花了多长时间 |
| 成本估算 | 大概花了多少钱（基于 token 价格） |

---

## 业务场景：电商客服 Agent 调试实战

### 场景描述

你正在开发一个电商客服 AI，它需要：
- 查询订单状态
- 处理退款请求
- 回答商品问题

### 问题出现

```
用户：我的订单 #12345 怎么还没发货？

Agent：[返回了一个奇怪的回答] "抱歉，我无法找到相关信息..."

你：？？？它中间到底干了啥？
```

### 没有 Studio 的痛苦调试

```typescript
async function queryOrder(orderId: string) {
  console.log("queryOrder called with:", orderId);  // 加日志
  const result = await database.query(orderId);
  console.log("queryOrder result:", result);        // 加日志
  return result;
}

// 3 小时后...
// 终于发现是订单号格式解析错误
// 用户说的是 "#12345"，但工具收到的是 "12345"
```

### 有了 Studio 的丝滑调试

**步骤 1：打开 Studio，查看 Trace**

```
Trace 显示：
├── Step 1: 收到用户输入
│   └── 内容: "我的订单 #12345 怎么还没发货？"
│
├── Step 2: LLM 推理 → 决定调用 queryOrder
│
├── Step 3: 工具调用 queryOrder
│   ├── 参数: { orderId: "12345" }  ← 🔴 发现问题！应该是 "#12345"
│   └── 返回: null
│
└── Step 4: LLM 收到空结果，开始瞎编...
```

**步骤 2：定位问题**

原来是订单号格式解析问题！`#` 符号被丢失了。

**步骤 3：修复代码**

```typescript
function parseOrderId(input: string): string {
  const match = input.match(/#?(\d+)/);
  return match ? `#${match[1]}` : input;
}

async function queryOrder(orderId: string) {
  const normalizedId = parseOrderId(orderId);
  return await database.query(normalizedId);
}
```

**步骤 4：热重载自动更新，从 Step 3 重新运行**

```
Trace 显示：
├── Step 3: 工具调用 queryOrder（重跑）
│   ├── 参数: { orderId: "#12345" }  ← ✅ 格式正确
│   └── 返回: { status: "已发货", trackingNumber: "SF123..." }
│
└── Step 4: 正确回复
    └── "您的订单 #12345 已发货，快递单号 SF123..."
```

### 效率对比

| 方面 | 没有 Studio | 有 Studio |
|------|-------------|-----------|
| 定位问题 | 3 小时 | 5 分钟 |
| 代码侵入 | 满屏 console.log | 零侵入 |
| 测试效率 | 每次从头跑 | 从断点重跑 |
| Token 消耗 | 不清楚 | 一目了然 |
| 心情指数 | 😤 暴躁 | 😊 平和 |

---

## 完整示例：带调试支持的客服 Agent

### 项目结构

```plaintext
customer-service-bot/
├── src/
│   ├── tools/
│   │   └── orderTools.ts    # 订单查询工具
│   ├── agent.ts             # Agent 定义
│   └── index.ts             # 入口文件
├── .env
├── package.json
└── langgraph.json
```

### 工具定义 (src/tools/orderTools.ts)

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const queryOrderTool = tool(
  async ({ orderId }: { orderId: string }) => {
    const normalizedId = orderId.replace(/^#/, "");
    
    const mockDatabase: Record<string, any> = {
      "12345": { status: "已发货", tracking: "SF1234567890" },
      "12346": { status: "处理中", tracking: null },
      "12347": { status: "已完成", tracking: "YT9876543210" },
    };
    
    const order = mockDatabase[normalizedId];
    if (!order) {
      return JSON.stringify({ error: "订单不存在" });
    }
    
    return JSON.stringify({
      orderId: `#${normalizedId}`,
      ...order,
    });
  },
  {
    name: "queryOrder",
    description: "查询订单状态，输入订单号（可以带或不带 # 前缀）",
    schema: z.object({
      orderId: z.string().describe("订单号，如 #12345 或 12345"),
    }),
  }
);

export const requestRefundTool = tool(
  async ({ orderId, reason }: { orderId: string; reason: string }) => {
    return JSON.stringify({
      success: true,
      message: `退款申请已提交，订单 ${orderId}，原因：${reason}`,
      estimatedTime: "3-5 个工作日",
    });
  },
  {
    name: "requestRefund",
    description: "申请退款",
    schema: z.object({
      orderId: z.string().describe("订单号"),
      reason: z.string().describe("退款原因"),
    }),
  }
);
```

### Agent 定义 (src/agent.ts)

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { BaseMessage, AIMessage } from "@langchain/core/messages";
import { queryOrderTool, requestRefundTool } from "./tools/orderTools.js";

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
});

const tools = [queryOrderTool, requestRefundTool];
const toolNode = new ToolNode(tools);

const llm = new ChatOpenAI({
  model: "gpt-4o-mini",
}).bindTools(tools);

async function callModel(state: typeof AgentState.State) {
  const response = await llm.invoke([
    {
      role: "system",
      content: `你是一个友好的电商客服助手。
      你可以帮用户：
      1. 查询订单状态 - 使用 queryOrder 工具
      2. 申请退款 - 使用 requestRefund 工具
      
      请始终保持礼貌和专业。`,
    },
    ...state.messages,
  ]);
  
  return { messages: [response] };
}

function shouldContinue(state: typeof AgentState.State) {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    return "tools";
  }
  
  return "end";
}

const graph = new StateGraph(AgentState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    end: END,
  })
  .addEdge("tools", "agent");

export const customerServiceAgent = graph.compile();
```

### langgraph.json

```json
{
  "dependencies": ["."],
  "graphs": {
    "customer_service": "./src/agent.js:customerServiceAgent"
  },
  "env": ".env"
}
```

### .env

```bash
LANGSMITH_API_KEY=lsv2_xxx...
OPENAI_API_KEY=sk-xxx...
```

### 启动调试

```bash
npm run build

npx @langchain/langgraph-cli dev
```

---

## 避坑指南

### ❌ 坑 1：Safari 浏览器无法连接

Safari 会阻止 localhost 连接。

**解决方案：**
```bash
npx @langchain/langgraph-cli dev --tunnel
```

然后在 Studio UI 中手动添加 tunnel URL。

### ❌ 坑 2：.env 文件被提交到 Git

**解决方案：** 在 `.gitignore` 中添加：
```
.env
.env.local
```

### ❌ 坑 3：忘记导出 Agent

配置文件中 `"./src/agent.ts:agent"` 后面的 `agent` 是导出名。

**错误代码：**
```typescript
const agent = graph.compile();
// 忘记导出！
```

**正确代码：**
```typescript
const agent = graph.compile();
export { agent };  // 必须导出！
```

### ❌ 坑 4：引用 .ts 文件而非编译后的 .js

```json
// ❌ 错误
{
  "graphs": {
    "agent": "./src/agent.ts:agent"
  }
}

// ✅ 正确（如果用 TypeScript 编译）
{
  "graphs": {
    "agent": "./dist/agent.js:agent"
  }
}
```

**💡 提示：** 如果使用 tsx 或 ts-node 直接运行 TypeScript，可以使用 `.ts` 文件。

---

## 总结对比表

| 功能 | 作用 | 类比 |
|------|------|------|
| **Trace** | 执行过程的完整记录 | 行车记录仪 |
| **Thread** | 一次完整对话会话 | 一场戏的录像 |
| **Hot-reload** | 代码修改自动更新 | 换剧本不用重新化妆 |
| **断点重跑** | 从任意节点重新执行 | 从某个镜头重拍 |
| **Token 指标** | 资源消耗统计 | 拍摄成本核算 |

---

## 核心要点回顾

1. **Studio 是免费的** —— 注册 LangSmith 账号即可使用
2. **零代码侵入** —— 不需要在代码里加 console.log
3. **热重载提升效率** —— 改代码后自动更新，不用重启
4. **断点重跑** —— 从对话的任意节点重新运行，不用从头开始
5. **Token 可视化** —— 清晰看到每次调用的资源消耗

---

## 下一步学习

- **LangSmith 部署**：学习如何将 Agent 部署到生产环境
- **可观测性**：监控、日志和性能分析
- **项目实战**：构建完整的多 Agent 协作系统
