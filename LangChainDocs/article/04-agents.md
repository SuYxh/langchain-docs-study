# Agent（智能代理）：让 AI 学会"自己干活"

---

## 简单来说

**Agent 就是一个"会思考、会用工具、能自己干活"的 AI 打工仔。**

你给它一个目标，它会自己琢磨该用什么工具、按什么顺序干，一步步把活儿干完，直到任务完成或者你喊停。

---

## 🎯 本节目标

读完本节，你将能够回答这些问题：

- ❓ 为什么说 Agent 是 LangChain 的核心？它和普通的 LLM 调用有什么区别？
- ❓ `createAgent()` 怎么用？10 行代码能创建一个什么样的 Agent？
- ❓ Agent 的四大组件（Model、Tools、ReAct Loop、System Prompt）各自负责什么？
- ❓ 什么时候用静态配置，什么时候用动态配置？
- ❓ ReAct 循环是怎么让 Agent "自己干活"的？

---

## 核心痛点与解决方案

### 痛点：没有 Agent 之前，我们有多惨？

| 场景 | 传统做法 | 有多痛苦 |
|------|----------|----------|
| 查天气 + 订机票 + 写邮件 | 你得写一堆 if-else，手动串联每个步骤 | 代码像面条一样难维护 |
| 处理用户模糊请求 | 硬编码所有可能的分支 | 用户稍微换个说法就崩 |
| 多步骤任务 | 每一步都要你手动调用 API | 累死，而且容易出错 |

**举个例子：** 用户说"帮我查一下北京明天天气，如果下雨就提醒我带伞"。

传统做法：
```
1. 调用天气 API
2. 解析返回结果
3. 判断是否下雨
4. 生成提醒语
5. 每一步都要你写代码串起来...
```

### 解决：Agent 怎么救你的？

Agent 的核心思路是：**让 AI 自己决定该干啥！**

```
你：帮我查北京明天天气，下雨就提醒我
Agent（内心活动）：
  - 思考：我需要查天气 → 用天气工具
  - 行动：调用 weather_tool("北京")
  - 观察：返回结果是"有雨"
  - 思考：需要生成提醒
  - 输出：明天北京有雨，记得带伞哦！
```

**你只需要：** 定义好工具 + 告诉它目标，剩下的它自己搞定！

---

## 生活化类比：Agent 就像一个"全能管家"

想象你雇了一个超级管家（Agent），他具备以下能力：

| 角色/概念 | 对应到 Agent | 说明 |
|-----------|--------------|------|
| **管家的大脑** | Model（模型） | 负责思考和决策，"我该干啥？" |
| **管家的工具箱** | Tools（工具） | 各种技能：会做饭、会开车、会订票... |
| **主人的指示** | System Prompt | "你是一个严谨的管家，做事要细心" |
| **管家的记事本** | Memory（记忆） | 记住之前聊过什么，别重复问 |
| **工作流程** | ReAct Loop | 想一想 → 干一下 → 看结果 → 再想... |

### 一个完整的场景演绎

**你（主人）：** "帮我安排一下明天的出差行程"

**管家（Agent）的工作流程：**

```
第1轮：
  [思考] 出差需要：机票、酒店、日程安排
  [行动] 先查机票 → 调用"订票工具"
  [观察] 找到3趟航班

第2轮：
  [思考] 需要选一个合适的航班，再订酒店
  [行动] 选早班机 + 调用"酒店工具"
  [观察] 酒店预订成功

第3轮：
  [思考] 信息都齐了，可以汇报了
  [输出] "主人，已为您预订了明早8点航班，入住希尔顿酒店..."
```

**这就是 ReAct 模式：Reasoning（推理） + Acting（行动） 循环往复！**

---

## 核心组件详解

### 1. Model（模型）— AI 的大脑

**是什么：** Agent 的"推理引擎"，负责思考和决策。

```
┌─────────────────────────────────────────────┐
│                  Model                       │
│                                              │
│   "用户想查天气..."  →  "我应该用天气工具"    │
│                                              │
│   输入：用户消息 + 上下文                     │
│   输出：决策（调用什么工具 / 直接回答）        │
└─────────────────────────────────────────────┘
```

#### 静态模型（Static Model）

静态模型在创建 Agent 时配置一次，整个执行过程中保持不变。这是最常见、最直接的方式。

**基础用法 - 使用模型标识字符串：**

```typescript
import { createAgent } from "langchain";

const agent = createAgent({
  model: "openai:gpt-5",  // 格式：provider:model
  tools: []
});
```

> 💡 **人话解读**：就像告诉管家"你今天用脑子1号"，简单直接。`provider:model` 格式让你一行代码就能指定用哪家的哪个模型。

**进阶用法 - 使用模型实例：**

```typescript
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0.1,    // 控制输出的随机性（0=确定性强，1=更随机）
  maxTokens: 1000,     // 最大输出长度
  timeout: 30          // 超时时间（秒）
});

const agent = createAgent({
  model,
  tools: []
});
```

> 💡 **人话解读**：这次你可以精细调教管家的大脑——让他更严谨（低 temperature）还是更有创意（高 temperature）。用模型实例可以控制更多参数。

#### 动态模型（Dynamic Model）

动态模型在运行时根据当前状态和上下文来选择。这能实现复杂的路由逻辑和成本优化。

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, createMiddleware } from "langchain";

const basicModel = new ChatOpenAI({ model: "gpt-4.1-mini" });    // 便宜的
const advancedModel = new ChatOpenAI({ model: "gpt-4.1" });      // 贵的

const dynamicModelSelection = createMiddleware({
  name: "DynamicModelSelection",
  wrapModelCall: (request, handler) => {
    // 根据对话复杂度选择模型
    const messageCount = request.messages.length;

    return handler({
      ...request,
      // 对话超过10轮用高级模型，否则用基础模型
      model: messageCount > 10 ? advancedModel : basicModel,
    });
  },
});

const agent = createAgent({
  model: "gpt-4.1-mini",  // 默认用便宜的
  tools,
  middleware: [dynamicModelSelection],
});
```

> 💡 **人话解读**：就像滴滴打车——平时叫快车省钱，重要场合叫专车有面子。简单问题用便宜模型，复杂问题自动切换到更强的模型。这招能帮你**省不少 API 费用**！

| 模型类型 | 比喻 | 适用场景 |
|----------|------|----------|
| **静态模型** | 固定的专属司机 | 任务单一，用一个模型就够 |
| **动态模型** | 按需派车服务 | 简单任务用便宜模型，复杂任务用贵的 |

---

### 2. Tools（工具）— AI 的手和脚

**是什么：** Agent 能执行的具体动作，比如搜索、计算、调用 API 等。

**Agent 比普通"模型+工具"强在哪？**

| 能力 | 说明 | 类比 |
|------|------|------|
| 多工具顺序调用 | 先查天气，再订票 | 管家先打电话再出门办事 |
| 并行调用 | 同时查机票和酒店 | 一边煮饭一边炒菜 |
| 动态选择工具 | 根据上一步结果决定下一步 | 看情况灵活应变 |
| 错误重试 | 工具调用失败会自动重试 | 电话没打通，再打一次 |
| 状态保持 | 记住之前用工具查到的信息 | 不会查完就忘 |

#### 静态工具（Static Tools）

静态工具在创建 Agent 时定义，整个执行过程中保持不变。

```typescript
import * as z from "zod";
import { createAgent, tool } from "langchain";

// 定义搜索工具
const search = tool(
  ({ query }) => `Results for: ${query}`,
  {
    name: "search",
    description: "Search for information",  // 🔥 重要！模型靠这个决定何时用它
    schema: z.object({
      query: z.string().describe("The query to search for"),
    }),
  }
);

// 定义天气工具
const getWeather = tool(
  ({ location }) => `Weather in ${location}: Sunny, 72°F`,
  {
    name: "get_weather",
    description: "Get weather information for a location",
    schema: z.object({
      location: z.string().describe("The location to get weather for"),
    }),
  }
);

// 创建带工具的 Agent
const agent = createAgent({
  model: "gpt-4.1",
  tools: [search, getWeather],  // 工具箱里放两个工具
});
```

> 💡 **人话解读**：
> - `tool()` 函数用来定义一个工具
> - 第一个参数是工具的执行逻辑（函数）
> - `description` **超级重要**！模型就是靠这个描述来判断什么时候该用这个工具
> - `schema` 定义了工具需要什么参数，用 Zod 做类型校验

#### 动态工具（Dynamic Tools）

有时候工具不是提前知道的，需要在运行时动态添加。比如：
- 从 MCP 服务器加载工具
- 根据用户数据动态生成工具
- 根据权限过滤可用工具

**方式一：过滤预注册的工具（基于权限）**

```typescript
import { createMiddleware } from "langchain";

const stateBasedTools = createMiddleware({
  name: "StateBasedTools",
  wrapModelCall: (request, handler) => {
    const state = request.state;
    const isAuthenticated = state.authenticated ?? false;
    const messageCount = state.messages.length;

    let filteredTools = request.tools;

    // 未认证用户只能用公开工具
    if (!isAuthenticated) {
      filteredTools = request.tools.filter(
        (t) => t.name.startsWith("public_")
      );
    } 
    // 对话不到5轮不开放高级搜索
    else if (messageCount < 5) {
      filteredTools = request.tools.filter(
        (t) => t.name !== "advanced_search"
      );
    }

    return handler({ ...request, tools: filteredTools });
  },
});
```

> 💡 **人话解读**：就像公司分级授权——实习生只能用基础工具，转正后才能用高级功能。

**方式二：运行时动态注册工具**

```typescript
import { createAgent, createMiddleware, tool } from "langchain";
import * as z from "zod";

// 一个将在运行时动态添加的工具
const calculateTip = tool(
  ({ billAmount, tipPercentage = 20 }) => {
    const tip = billAmount * (tipPercentage / 100);
    return `Tip: $${tip.toFixed(2)}, Total: $${(billAmount + tip).toFixed(2)}`;
  },
  {
    name: "calculate_tip",
    description: "Calculate the tip amount for a bill",
    schema: z.object({
      billAmount: z.number().describe("The bill amount"),
      tipPercentage: z.number().default(20).describe("Tip percentage"),
    }),
  }
);

const dynamicToolMiddleware = createMiddleware({
  name: "DynamicToolMiddleware",
  // 钩子1：添加动态工具到请求
  wrapModelCall: (request, handler) => {
    return handler({
      ...request,
      tools: [...request.tools, calculateTip],  // 把动态工具加进去
    });
  },
  // 钩子2：处理动态工具的执行
  wrapToolCall: (request, handler) => {
    if (request.toolCall.name === "calculate_tip") {
      return handler({ ...request, tool: calculateTip });
    }
    return handler(request);
  },
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [getWeather],  // 只注册静态工具
  middleware: [dynamicToolMiddleware],  // 动态工具通过中间件添加
});
```

> ⚠️ **重要提示**：动态注册的工具必须**同时实现** `wrapModelCall`（添加工具）和 `wrapToolCall`（处理执行），否则 Agent 不知道怎么执行这个工具！

#### 工具错误处理

```typescript
import { createAgent, createMiddleware, ToolMessage } from "langchain";

const handleToolErrors = createMiddleware({
  name: "HandleToolErrors",
  wrapToolCall: async (request, handler) => {
    try {
      return await handler(request);
    } catch (error) {
      // 返回自定义错误消息给模型
      return new ToolMessage({
        content: `Tool error: Please check your input and try again. (${error})`,
        tool_call_id: request.toolCall.id!,
      });
    }
  },
});
```

> 💡 **人话解读**：给工具调用包一层保护罩——出错了不会崩溃，而是告诉 AI "这个工具出问题了，换个方式试试"。

---

### 3. ReAct 循环 — Agent 的工作模式

Agent 遵循 ReAct（Reasoning + Acting）模式：**推理 → 行动 → 观察 → 再推理...**

```
┌─────────────────────────────────────┐
│                                     │
│   Reason（思考）                     │
│      ↓                              │
│   Act（行动/调用工具）                │
│      ↓                              │
│   Observe（观察结果）                 │
│      ↓                              │
│   是否完成？ ──否──→ 继续循环         │
│      │                              │
│      是                             │
│      ↓                              │
│   输出最终结果                       │
│                                     │
└─────────────────────────────────────┘
```

#### 真实示例：查找热门耳机并检查库存

**用户提问：** "帮我找一下现在最火的无线耳机，看看有没有货"

```
================================ Human Message =================================
Find the most popular wireless headphones right now and check if they're in stock
```

**第1轮 - 思考+行动：**
- **思考**："热门产品信息需要实时查询，我要用搜索工具"
- **行动**：调用 `search_products("wireless headphones")`

```
================================== Ai Message ==================================
Tool Calls:
  search_products (call_abc123)
   Call ID: call_abc123
    Args:
      query: wireless headphones
```

**观察结果：**
```
================================= Tool Message =================================
Found 5 products matching "wireless headphones". Top 5 results: WH-1000XM5, ...
```

**第2轮 - 思考+行动：**
- **思考**："需要确认排名第一的产品是否有货"
- **行动**：调用 `check_inventory("WH-1000XM5")`

```
================================== Ai Message ==================================
Tool Calls:
  check_inventory (call_def456)
   Call ID: call_def456
    Args:
      product_id: WH-1000XM5
```

**观察结果：**
```
================================= Tool Message =================================
Product WH-1000XM5: 10 units in stock
```

**第3轮 - 思考+输出：**
- **思考**："信息齐了，可以回答用户了"
- **输出**：最终答案

```
================================== Ai Message ==================================
I found wireless headphones (model WH-1000XM5) with 10 units in stock...
```

> 💡 **关键洞察**：Agent 不是一次性调用所有工具，而是**根据每一步的结果来决定下一步做什么**。这就是它比传统编程灵活的地方！

---

### 4. System Prompt（系统提示）— AI 的人设

告诉 Agent "你是谁"、"你该怎么做事"。

#### 基础用法

```typescript
const agent = createAgent({
  model,
  tools,
  systemPrompt: "You are a helpful assistant. Be concise and accurate.",
});
```

> 💡 **人话解读**：没有 systemPrompt 时，Agent 会直接从用户消息推断任务。加上它可以让 Agent 有固定的"人设"和行为准则。

#### 高级用法 - 使用 SystemMessage（支持缓存等特性）

```typescript
import { createAgent } from "langchain";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

const literaryAgent = createAgent({
  model: "anthropic:claude-sonnet-4-5",
  systemPrompt: new SystemMessage({
    content: [
      {
        type: "text",
        text: "You are an AI assistant tasked with analyzing literary works.",
      },
      {
        type: "text",
        text: "<the entire contents of 'Pride and Prejudice'>",  // 长文本
        cache_control: { type: "ephemeral" }  // 启用缓存，省钱！
      }
    ]
  })
});
```

> 💡 **人话解读**：`cache_control` 告诉 Anthropic "这段内容缓存起来"，重复请求时可以**省钱省时间**。适合需要大量固定上下文的场景。

#### 动态系统提示（根据上下文调整人设）

```typescript
import * as z from "zod";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";

const contextSchema = z.object({
  userRole: z.enum(["expert", "beginner"]),
});

const agent = createAgent({
  model: "gpt-4.1",
  tools: [/* ... */],
  contextSchema,
  middleware: [
    dynamicSystemPromptMiddleware((state, runtime) => {
      const userRole = runtime.context.userRole || "user";
      const basePrompt = "You are a helpful assistant.";

      if (userRole === "expert") {
        return `${basePrompt} Provide detailed technical responses.`;  // 专家模式
      } else if (userRole === "beginner") {
        return `${basePrompt} Explain concepts simply and avoid jargon.`;  // 新手模式
      }
      return basePrompt;
    }),
  ],
});

// 调用时传入用户角色
const result = await agent.invoke(
  { messages: [{ role: "user", content: "Explain machine learning" }] },
  { context: { userRole: "expert" } }  // 专家用户
);
```

> 💡 **人话解读**：同一个问题，对专家深入讲，对新手通俗讲。Agent 会根据用户类型自动调整回答风格。

---

## 调用方式

### 基本调用

```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What's the weather in San Francisco?" }],
});

console.log(result.messages.at(-1)?.content);
// "The weather in San Francisco is sunny, 72°F..."
```

> 💡 **人话解读**：`invoke` 是最简单的调用方式——等 Agent 把所有事情做完，返回最终结果。适合不需要实时进度反馈的场景。

### 流式调用（推荐用于用户界面）

```typescript
const stream = await agent.stream(
  {
    messages: [{
      role: "user",
      content: "Search for AI news and summarize the findings"
    }],
  },
  { streamMode: "values" }
);

for await (const chunk of stream) {
  const latestMessage = chunk.messages.at(-1);
  if (latestMessage?.content) {
    console.log(`Agent: ${latestMessage.content}`);
  } else if (latestMessage?.tool_calls) {
    const toolCallNames = latestMessage.tool_calls.map((tc) => tc.name);
    console.log(`Calling tools: ${toolCallNames.join(", ")}`);
  }
}
```

> 💡 **人话解读**：
> - 用 `stream` 代替 `invoke`
> - 每一步都能看到 Agent 在干什么："正在调用搜索工具..."、"正在总结..."
> - 用户体验好多了！

---

## 高级概念预览

### 结构化输出（Structured Output）

有时候你希望 Agent 返回固定格式的数据，而不是自由文本。

```typescript
import * as z from "zod";
import { createAgent } from "langchain";

// 定义输出结构
const ContactInfo = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
});

const agent = createAgent({
  model: "gpt-4.1",
  responseFormat: ContactInfo,  // 告诉 Agent 返回这个格式
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "Extract contact info from: John Doe, john@example.com, (555) 123-4567",
    },
  ],
});

console.log(result.structuredResponse);
// {
//   name: 'John Doe',
//   email: 'john@example.com',
//   phone: '(555) 123-4567'
// }
```

> 💡 **人话解读**：不用自己解析文本了！Agent 直接返回 JSON 对象，拿来就能用。

### 记忆（Memory）

Agent 通过消息状态自动维护对话历史。你也可以用自定义状态来记住额外信息。

```typescript
import { z } from "zod/v4";
import { StateSchema, MessagesValue } from "@langchain/langgraph";
import { createAgent } from "langchain";

// 自定义状态：除了消息，还记住用户偏好
const CustomAgentState = new StateSchema({
  messages: MessagesValue,
  userPreferences: z.record(z.string(), z.string()),  // 自定义字段
});

const customAgent = createAgent({
  model: "gpt-4.1",
  tools: [],
  stateSchema: CustomAgentState,
});
```

> 💡 **人话解读**：
> - 默认状态只记消息（对话历史）
> - 自定义状态可以记任何东西，比如用户喜好、会话数据等

### 中间件（Middleware）

中间件让你在 Agent 执行的各个阶段插入自定义逻辑。

**可以用来做什么：**
- 在调用模型前处理状态（比如裁剪消息、注入上下文）
- 验证/修改模型的响应（比如内容过滤、安全检查）
- 自定义工具错误处理
- 动态选择模型
- 添加日志、监控、埋点

> 💡 **人话解读**：中间件就像流水线上的"检查站"，数据经过时你可以检查、修改、拦截。

---

## 业务场景：电商智能客服

**需求：** 用户问"我上周买的那双鞋发货了吗？如果没发，帮我催一下"

### 没有 Agent 的做法

```
你需要写代码：
1. 先调用订单查询接口
2. 判断订单状态
3. 如果未发货，调用催单接口
4. 生成回复语句
5. 每个分支都要写 if-else...
```

### 用 Agent 的做法

```typescript
const tools = [
  orderQueryTool,   // 查询订单
  shipmentTool,     // 查物流
  reminderTool      // 催单工具
];

const agent = createAgent({
  model: chatModel,
  tools,
  systemPrompt: "你是电商客服，帮用户处理订单问题"
});

// 用户一句话，Agent 自己搞定全流程！
await agent.invoke({
  messages: [{ role: "user", content: "我上周买的鞋发货了吗？没发帮我催一下" }]
});
```

**Agent 内部执行过程：**

```
[思考] 用户想查订单状态，需要先查订单
[行动] 调用 orderQueryTool → 找到订单 #12345
[观察] 状态：待发货

[思考] 还没发货，用户要求催单
[行动] 调用 reminderTool → 催单成功
[观察] 已提醒仓库加急处理

[思考] 可以回复用户了
[输出] 您上周购买的鞋子（订单#12345）还未发货，我已帮您催促，
       预计明天发出，请您耐心等待～
```

---

## 总结对比表

| 维度 | 传统写法 | 使用 Agent |
|------|----------|------------|
| 开发效率 | 每个流程都要硬编码 | 定义工具 + 目标，自动执行 |
| 灵活性 | 用户换个说法可能就挂 | AI 理解意图，灵活应对 |
| 维护成本 | 分支越多代码越乱 | 加工具就行，核心逻辑不变 |
| 错误处理 | 自己写 try-catch | 内置重试和错误处理 |

---

## 一图总结 Agent 架构

```
┌──────────────────────────────────────────────────┐
│                    Agent                         │
│  ┌────────────┐    ┌────────────┐               │
│  │   Model    │    │   Tools    │               │
│  │  (大脑)    │    │  (工具箱)   │               │
│  └─────┬──────┘    └─────┬──────┘               │
│        │                 │                       │
│        └────────┬────────┘                       │
│                 │                                │
│         ┌──────┴──────┐                         │
│         │ ReAct Loop  │ ← 核心执行循环           │
│         │ 想→做→看→想  │                         │
│         └──────┬──────┘                         │
│                │                                │
│  ┌─────────────┴─────────────┐                  │
│  │    Memory + State         │ ← 记住上下文     │
│  └───────────────────────────┘                  │
│                                                  │
│  System Prompt: "你是..."    ← 设定人设          │
└──────────────────────────────────────────────────┘
```

---

## 核心要点回顾

1. ✅ **Agent = Model + Tools + 循环推理**，是"会自己干活"的 AI
2. ✅ **ReAct 模式**是灵魂：想一想 → 干一下 → 看结果 → 再想...
3. ✅ **静态 vs 动态**：模型和工具都可以运行时动态选择，实现成本优化和权限控制
4. ✅ **Memory** 让 Agent 有上下文感知能力，不会"健忘"
5. ✅ **Middleware** 可以在各个阶段插入自定义逻辑
6. ✅ **Structured Output** 让 Agent 返回结构化数据，方便后续处理
7. ✅ **Streaming** 提供实时进度反馈，提升用户体验

---

## 下一步学习

| 主题 | 链接 | 说明 |
|------|------|------|
| Models | [05-models.md](./05-models.md) | 深入了解模型配置和调用方式 |
| Tools | [07-tools.md](./07-tools.md) | 学习如何定义和使用工具 |
| Short-term Memory | [08-short-term-memory.md](./08-short-term-memory.md) | 会话记忆管理 |
| Streaming | [09-streaming-overview.md](./09-streaming-overview.md) | 流式输出详解 |

---

**记住这个比喻：Agent 就是你雇的一个全能管家，你告诉他目标，他自己琢磨怎么用工具把活干完！** 🎉
