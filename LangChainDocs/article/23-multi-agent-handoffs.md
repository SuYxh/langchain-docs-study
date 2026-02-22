# 23. Handoffs 模式：对话中平滑切换专家

## 简单来说

想象你打客服电话：

> "您好，我想咨询一下退款问题"
> "好的，这个问题需要转接售后专员，请稍等..."
> "您好，我是售后专员小王，了解到您想退款，请问是什么原因呢？"

注意这个过程：
1. **普通客服**先接听，了解问题
2. 发现需要**专业处理**，转接专员
3. **专员接手**，并且知道之前聊了什么（上下文保持）

这就是 **Handoffs 模式** —— 对话过程中，根据需要把控制权"交接"给更合适的 Agent，同时保持对话连贯。

```
用户 → 通用 Agent → "我需要技术支持"
                 → 状态更新：currentAgent = "techSupport"
                 → 技术 Agent 接管 → "好的，我是技术专家..."
```

与 Subagents 的区别：
- **Subagents**：CEO 派任务给经理，经理完成后汇报给 CEO
- **Handoffs**：前台转接专员，专员**直接**和客户对话

## 本节目标

1. 理解 Handoffs 与 Subagents 的核心区别
2. 掌握基于状态的交接实现
3. 学会使用 Command 更新状态并切换 Agent
4. 了解单 Agent 中间件 vs 多 Agent 子图两种架构

## 业务场景

假设你要构建一个**智能客服系统**：

1. **通用客服** —— 处理简单问题、问候、导航
2. **技术专家** —— 处理技术故障、代码问题
3. **销售顾问** —— 处理购买咨询、报价、优惠

用户一开始和通用客服对话，根据问题类型，随时可以转接给专家。

关键需求：
- 转接时用户**无感知**，体验像和一个人聊天
- 专家**知道之前聊了什么**，不需要用户重复
- 可以**来回转接**，技术专家也可以转回通用客服

## 核心概念：状态驱动的行为切换

Handoffs 的核心是**状态驱动** —— 通过修改状态中的某个字段，改变 Agent 的行为。

```typescript
// 状态定义
const State = {
  messages: [],         // 对话历史
  currentAgent: "general"  // 当前激活的 Agent
};

// 状态改变 → 行为改变
if (state.currentAgent === "general") {
  // 使用通用客服的提示词和工具
} else if (state.currentAgent === "techSupport") {
  // 使用技术专家的提示词和工具
}
```

## 实现方式一：单 Agent + 中间件

最简单的方式 —— 一个 Agent，通过中间件根据状态切换提示词和工具。

### 第一步：定义状态

```typescript
import { z } from "zod";
import { StateSchema, MessagesValue } from "@langchain/langgraph";

const AgentState = new StateSchema({
  messages: MessagesValue,
  currentAgent: z.enum(["general", "techSupport", "sales"]).default("general")
});
```

### 第二步：创建转接工具

关键是使用 `Command` 来更新状态：

```typescript
import { tool } from "langchain";
import { Command, ToolRuntime } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";

const transferToTechSupport = tool(
  async (_, config: ToolRuntime<typeof AgentState>) => {
    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: "已转接到技术支持专家，我会帮您处理技术问题。",
            tool_call_id: config.toolCallId
          })
        ],
        currentAgent: "techSupport"
      }
    });
  },
  {
    name: "transfer_to_tech_support",
    description: "当用户遇到技术问题、Bug、代码错误时，转接到技术支持专家",
    schema: z.object({})
  }
);

const transferToSales = tool(
  async (_, config: ToolRuntime<typeof AgentState>) => {
    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: "已转接到销售顾问，我会帮您了解产品和价格。",
            tool_call_id: config.toolCallId
          })
        ],
        currentAgent: "sales"
      }
    });
  },
  {
    name: "transfer_to_sales",
    description: "当用户咨询产品价格、购买、优惠活动时，转接到销售顾问",
    schema: z.object({})
  }
);

const transferToGeneral = tool(
  async (_, config: ToolRuntime<typeof AgentState>) => {
    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: "好的，我帮您转回通用客服。",
            tool_call_id: config.toolCallId
          })
        ],
        currentAgent: "general"
      }
    });
  },
  {
    name: "transfer_to_general",
    description: "当问题处理完毕或不属于当前专家领域时，转回通用客服",
    schema: z.object({})
  }
);
```

### 第三步：创建中间件切换提示词

```typescript
import { createMiddleware } from "langchain";

const agentConfigs = {
  general: {
    systemPrompt: `你是一个友好的客服助手。
职责：
- 问候用户，了解需求
- 简单问题直接回答
- 技术问题转接技术专家
- 购买咨询转接销售顾问`,
    tools: [transferToTechSupport, transferToSales]
  },
  techSupport: {
    systemPrompt: `你是技术支持专家。
职责：
- 诊断技术问题
- 提供解决方案
- 指导用户操作
问题解决后，可以转回通用客服。`,
    tools: [transferToGeneral, debugTool, checkSystemTool]
  },
  sales: {
    systemPrompt: `你是销售顾问。
职责：
- 介绍产品功能
- 提供报价方案
- 解答购买疑问
咨询结束后，可以转回通用客服。`,
    tools: [transferToGeneral, getPricingTool, getDiscountTool]
  }
};

const switchAgentMiddleware = createMiddleware({
  preModelCall: ({ state }) => {
    const config = agentConfigs[state.currentAgent];
    return {
      systemPrompt: config.systemPrompt,
      tools: config.tools
    };
  }
});
```

### 第四步：创建 Agent

```typescript
import { createAgent } from "langchain";

const customerServiceAgent = createAgent({
  model: "gpt-4.1",
  tools: [], // 工具通过中间件动态注入
  middleware: [switchAgentMiddleware],
  stateSchema: AgentState
});
```

### 运行效果

```typescript
// 对话 1：简单问候
let result = await customerServiceAgent.invoke({
  messages: [{ role: "user", content: "你好" }]
});
// Agent 回复："您好！有什么可以帮您的吗？"
// currentAgent: "general"

// 对话 2：遇到技术问题
result = await customerServiceAgent.invoke({
  messages: [
    ...result.messages,
    { role: "user", content: "我的代码报错了，TypeError: Cannot read properties of undefined" }
  ]
});
// Agent 调用 transfer_to_tech_support
// Agent 回复："我是技术专家，这个错误通常是因为..."
// currentAgent: "techSupport"

// 对话 3：技术问题解决，想了解产品
result = await customerServiceAgent.invoke({
  messages: [
    ...result.messages,
    { role: "user", content: "问题解决了，谢谢！对了，你们有企业版吗？" }
  ]
});
// Agent 调用 transfer_to_sales
// Agent 回复："好的，我是销售顾问，我们的企业版提供..."
// currentAgent: "sales"
```

## 实现方式二：多 Agent 子图

更复杂的场景，每个 Agent 是独立的子图，通过 `Command.PARENT` 返回控制权。

### 架构图

```
                    ┌─────────────────────────┐
                    │      主路由图           │
                    │  根据 currentAgent 路由  │
                    └─────────┬───────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
    ┌───────────┐       ┌───────────┐       ┌───────────┐
    │ 通用客服   │       │ 技术专家   │       │ 销售顾问   │
    │  子图      │       │  子图      │       │  子图      │
    └───────────┘       └───────────┘       └───────────┘
```

### 实现代码

```typescript
import { StateGraph, START, END, Annotation, Command } from "@langchain/langgraph";
import { createAgent, tool } from "langchain";

const State = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => []
  }),
  currentAgent: Annotation<string>({ default: () => "general" })
});

const transferToTech = tool(
  async () => {
    return new Command({
      goto: Command.PARENT,
      update: { currentAgent: "techSupport" }
    });
  },
  {
    name: "transfer_to_tech",
    description: "转接到技术专家",
    schema: z.object({})
  }
);

const transferToSales = tool(
  async () => {
    return new Command({
      goto: Command.PARENT,
      update: { currentAgent: "sales" }
    });
  },
  {
    name: "transfer_to_sales", 
    description: "转接到销售顾问",
    schema: z.object({})
  }
);

const generalAgent = createAgent({
  model: "gpt-4.1",
  tools: [transferToTech, transferToSales],
  systemPrompt: "你是通用客服..."
});

const techAgent = createAgent({
  model: "gpt-4.1",
  tools: [transferToGeneral],
  systemPrompt: "你是技术专家..."
});

const salesAgent = createAgent({
  model: "gpt-4.1",
  tools: [transferToGeneral],
  systemPrompt: "你是销售顾问..."
});

async function generalNode(state: typeof State.State) {
  const result = await generalAgent.invoke({ messages: state.messages });
  return { messages: result.messages };
}

async function techNode(state: typeof State.State) {
  const result = await techAgent.invoke({ messages: state.messages });
  return { messages: result.messages };
}

async function salesNode(state: typeof State.State) {
  const result = await salesAgent.invoke({ messages: state.messages });
  return { messages: result.messages };
}

function routeToAgent(state: typeof State.State) {
  return state.currentAgent;
}

const workflow = new StateGraph(State)
  .addNode("general", generalNode)
  .addNode("techSupport", techNode)
  .addNode("sales", salesNode)
  .addConditionalEdges(START, routeToAgent)
  .addEdge("general", END)
  .addEdge("techSupport", END)
  .addEdge("sales", END)
  .compile();
```

## ToolMessage 的重要性

注意转接工具返回的 `ToolMessage` —— 这是**必须**的！

```typescript
return new Command({
  update: {
    messages: [
      new ToolMessage({
        content: "已转接到技术专家",
        tool_call_id: config.toolCallId  // 关键！
      })
    ],
    currentAgent: "techSupport"
  }
});
```

**为什么需要 ToolMessage？**

LLM 的工具调用是一个**请求-响应**模式：
1. LLM 发出工具调用请求（AIMessage with tool_calls）
2. 工具执行并返回响应（ToolMessage）
3. LLM 收到响应，继续对话

如果没有 ToolMessage，LLM 会认为工具调用没有完成，可能导致：
- 重复调用工具
- 进入死循环
- 对话中断

## 两种架构的选择

| 考虑因素 | 单 Agent + 中间件 | 多 Agent 子图 |
|---------|------------------|---------------|
| 复杂度 | 简单 | 复杂 |
| 状态隔离 | 共享状态 | 可独立状态 |
| 适用场景 | Agent 差异小 | Agent 差异大 |
| 维护性 | 配置集中 | 模块独立 |
| 性能 | 更高效 | 略有开销 |

**建议**：
- 如果各 Agent 只是提示词和工具不同 → **单 Agent + 中间件**
- 如果各 Agent 有独立的状态、复杂逻辑 → **多 Agent 子图**

## 完整示例：智能客服系统

```typescript
import { createAgent, tool, createMiddleware } from "langchain";
import { Command, ToolRuntime, StateSchema, MessagesValue } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";
import * as z from "zod";

const AgentState = new StateSchema({
  messages: MessagesValue,
  currentAgent: z.enum(["general", "techSupport", "sales"]).default("general")
});

const createTransferTool = (targetAgent: string, description: string) => tool(
  async (_, config: ToolRuntime<typeof AgentState>) => {
    const agentNames = {
      general: "通用客服",
      techSupport: "技术专家",
      sales: "销售顾问"
    };
    return new Command({
      update: {
        messages: [
          new ToolMessage({
            content: `已转接到${agentNames[targetAgent]}`,
            tool_call_id: config.toolCallId
          })
        ],
        currentAgent: targetAgent
      }
    });
  },
  {
    name: `transfer_to_${targetAgent}`,
    description,
    schema: z.object({})
  }
);

const toTechSupport = createTransferTool(
  "techSupport",
  "当用户遇到技术问题、Bug、代码错误、系统故障时使用"
);

const toSales = createTransferTool(
  "sales", 
  "当用户咨询产品价格、购买方案、优惠活动时使用"
);

const toGeneral = createTransferTool(
  "general",
  "当专业问题处理完毕，或用户需要其他帮助时使用"
);

const debugTool = tool(
  async ({ errorMessage }) => {
    return `诊断结果：这个错误通常是由于 ${errorMessage.includes("undefined") ? "空值引用" : "类型不匹配"} 导致的...`;
  },
  {
    name: "debug_error",
    description: "诊断代码错误",
    schema: z.object({ errorMessage: z.string() })
  }
);

const getPricing = tool(
  async ({ plan }) => {
    const prices = { basic: 99, pro: 299, enterprise: 999 };
    return `${plan} 版本价格：¥${prices[plan] || 299}/月`;
  },
  {
    name: "get_pricing",
    description: "获取产品价格",
    schema: z.object({ plan: z.string() })
  }
);

const agentConfigs = {
  general: {
    systemPrompt: `你是友好的客服助手。
- 问候用户，了解需求
- 简单问题直接回答
- 技术问题转接技术专家（transfer_to_techSupport）
- 购买咨询转接销售顾问（transfer_to_sales）`,
    tools: [toTechSupport, toSales]
  },
  techSupport: {
    systemPrompt: `你是技术支持专家。
- 诊断技术问题
- 提供解决方案和代码示例
- 问题解决后转回通用客服（transfer_to_general）`,
    tools: [toGeneral, debugTool]
  },
  sales: {
    systemPrompt: `你是销售顾问。
- 介绍产品功能和优势
- 提供价格方案
- 咨询结束后转回通用客服（transfer_to_general）`,
    tools: [toGeneral, getPricing]
  }
};

const dynamicAgentMiddleware = createMiddleware({
  preModelCall: ({ state }) => {
    const config = agentConfigs[state.currentAgent];
    return {
      systemPrompt: config.systemPrompt,
      tools: config.tools
    };
  }
});

const customerService = createAgent({
  model: "gpt-4.1",
  tools: [],
  middleware: [dynamicAgentMiddleware],
  stateSchema: AgentState
});

async function chat() {
  let state = { messages: [], currentAgent: "general" };
  
  const conversations = [
    "你好，我想咨询一下",
    "我的代码报错了：TypeError: Cannot read property 'name' of undefined",
    "太好了，问题解决了！你们有企业版吗？多少钱？",
    "好的，我考虑一下，谢谢！"
  ];
  
  for (const userMessage of conversations) {
    console.log(`\n用户: ${userMessage}`);
    console.log(`当前 Agent: ${state.currentAgent}`);
    
    state = await customerService.invoke({
      messages: [...state.messages, { role: "user", content: userMessage }],
      currentAgent: state.currentAgent
    });
    
    const lastMessage = state.messages.at(-1);
    console.log(`助手: ${lastMessage?.content}`);
  }
}

chat();
```

## 常见问题

### Q1：转接后用户看到了什么？

用户看到的是连续的对话，不会看到"正在转接"这样的系统消息（除非你想让用户知道）。

```
用户: 我的代码报错了
助手: 我是技术专家，让我来帮您诊断这个问题...
```

### Q2：如何保证上下文传递？

状态中的 `messages` 数组会一直保留，新 Agent 可以看到完整对话历史。

### Q3：可以转接多次吗？

可以！只要状态正确更新，可以 通用→技术→销售→通用 无限循环。

## 本章小结

Handoffs 模式的核心要点：

1. **核心思想**：状态驱动的 Agent 切换，对话中平滑交接
2. **与 Subagents 区别**：
   - Subagents：主 Agent 调用子 Agent，结果汇总给主 Agent
   - Handoffs：控制权完全转移，新 Agent 直接与用户对话
3. **实现方式**：
   - 单 Agent + 中间件：简单场景，配置集中
   - 多 Agent 子图：复杂场景，模块独立
4. **关键技术**：
   - `Command` 更新状态并触发切换
   - `ToolMessage` 完成工具调用的请求-响应循环
5. **适用场景**：
   - 客服系统的专员转接
   - 对话中需求变化的动态处理
   - 需要保持上下文连续的专家切换

下一篇我们介绍 **Skills 模式** —— 让 Agent 按需加载专业能力。
