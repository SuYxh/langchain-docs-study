# Graph API 详解：StateGraph 核心 API 完全指南

## 简单来说

Graph API 是 LangGraph 的"画流程图"编程风格。你用节点（Node）表示每个工作步骤，用边（Edge）连接步骤之间的流转关系，最终编译成一个可执行的 AI 工作流。就像用 Visio 画流程图，然后这个流程图真的能跑起来！

---

## 🎯 本节目标

学完本节，你将能够：

- 掌握 StateGraph 的所有核心 API
- 理解 State、Reducer、MessagesValue 的设计原理
- 熟练使用 addNode、addEdge、addConditionalEdges
- 学会 Command 控制节点路由

---

## 核心痛点与解决方案

### 痛点：为什么需要"画图"？

传统写法：

```typescript
async function handleTask(input) {
  const step1Result = await doStep1(input);
  if (needStep2(step1Result)) {
    const step2Result = await doStep2(step1Result);
    if (needStep3(step2Result)) {
      // 无限嵌套...
    }
  }
  // 状态管理混乱、难以调试、无法可视化
}
```

### 解决：Graph API 的清晰表达

```typescript
const graph = new StateGraph(State)
  .addNode("step1", doStep1)
  .addNode("step2", doStep2)
  .addNode("step3", doStep3)
  .addEdge(START, "step1")
  .addConditionalEdges("step1", shouldGoStep2, ["step2", END])
  .addConditionalEdges("step2", shouldGoStep3, ["step3", END])
  .compile();
```

| 对比维度 | 传统写法 | Graph API |
|---------|---------|-----------|
| 可读性 | 嵌套混乱 | 节点+边，清晰明了 |
| 可视化 | 无法可视化 | 自动生成流程图 |
| 调试 | console.log 满天飞 | 每个节点的输入输出清晰 |
| 扩展 | 改一处动全身 | 加节点连边即可 |

---

## 生活化类比：地铁线路图

把 Graph API 想象成**地铁系统**：

| Graph API 概念 | 地铁类比 | 说明 |
|---------------|----------|------|
| **StateGraph** | 整个地铁网络 | 定义了所有可能的路线 |
| **Node（节点）** | 地铁站 | 每个站做一件事（上下客） |
| **Edge（边）** | 轨道 | 连接两个站 |
| **Conditional Edge** | 换乘站 | 根据目的地选择下一条线 |
| **State** | 乘客手里的票 | 记录从哪来、要去哪、经过了哪些站 |
| **START / END** | 起点站 / 终点站 | 旅程的开始和结束 |
| **compile()** | 开通运营 | 画好图后，地铁才能真正跑起来 |

---

## 核心 API 详解

### 1. StateGraph：创建图

```typescript
import { StateGraph } from "@langchain/langgraph";

const graph = new StateGraph(StateSchema);
```

`StateGraph` 是一切的起点，传入一个状态定义（Schema），返回一个可以添加节点和边的图构建器。

### 2. StateSchema：定义状态结构

状态是所有节点共享的"公告板"，用 Zod 定义结构：

```typescript
import { StateSchema, MessagesValue, ReducedValue } from "@langchain/langgraph";
import * as z from "zod";

const MyState = new StateSchema({
  messages: MessagesValue,
  count: new ReducedValue(
    z.number().default(0),
    { reducer: (current, update) => current + update }
  ),
  data: z.string().optional(),
});
```

#### State 值类型对比

| 类型 | 用途 | 更新方式 |
|------|------|---------|
| **普通值** `z.string()` | 简单数据 | 直接覆盖 |
| **MessagesValue** | 对话消息列表 | 自动追加新消息 |
| **ReducedValue** | 需要累积/合并的数据 | 通过 reducer 函数处理 |

#### MessagesValue 详解

```typescript
const State = new StateSchema({
  messages: MessagesValue,
});
```

💡 **人话解读：**
> "MessagesValue 就像一个聊天记录本，新消息来了自动加到最后面，不会覆盖之前的内容。"

**内部实现原理：**
- 使用 `addMessages` 作为 reducer
- 自动处理消息追加、去重、更新

#### ReducedValue 详解

```typescript
const State = new StateSchema({
  llmCalls: new ReducedValue(
    z.number().default(0),
    { reducer: (current, update) => current + update }
  ),
});
```

💡 **人话解读：**
> "每次节点返回 `{ llmCalls: 1 }`，不是把值改成 1，而是在原来基础上 +1。"

**常见 Reducer 模式：**

```typescript
// 累加
{ reducer: (a, b) => a + b }

// 追加到数组
{ reducer: (arr, item) => [...arr, item] }

// 合并对象
{ reducer: (obj, update) => ({ ...obj, ...update }) }

// 取最新值
{ reducer: (_, newValue) => newValue }
```

### 3. addNode：添加节点

```typescript
graph.addNode("nodeName", nodeFunction, options?)
```

**基础用法：**

```typescript
import { GraphNode } from "@langchain/langgraph";

const myNode: GraphNode<typeof MyState> = async (state, config) => {
  return { data: "处理结果" };
};

graph.addNode("process", myNode);
```

**节点函数签名：**

```typescript
type GraphNode<State> = (
  state: StateType,           // 当前状态
  config?: RunnableConfig     // 运行配置（可选）
) => Promise<Partial<State>> | Partial<State> | Command;
```

**带选项的用法：**

```typescript
graph.addNode("risky_operation", myNode, {
  retryPolicy: {
    maxAttempts: 3,
    initialInterval: 1.0,
  },
});
```

| 选项 | 类型 | 说明 |
|------|------|------|
| `retryPolicy` | RetryPolicy | 失败重试策略 |
| `metadata` | Record | 节点元数据 |

### 4. addEdge：添加普通边

```typescript
graph.addEdge(fromNode, toNode)
```

**用法示例：**

```typescript
import { START, END } from "@langchain/langgraph";

graph
  .addEdge(START, "step1")     // 从起点到 step1
  .addEdge("step1", "step2")   // step1 完成后去 step2
  .addEdge("step2", END);      // step2 完成后结束
```

**流程图：**

```
START → step1 → step2 → END
```

💡 **人话解读：**
> "普通边就是'做完 A 一定去 B'，没有任何判断，无脑往前走。"

### 5. addConditionalEdges：添加条件边

```typescript
graph.addConditionalEdges(fromNode, routerFunction, possibleDestinations)
```

**用法示例：**

```typescript
import { ConditionalEdgeRouter, END } from "@langchain/langgraph";

const router: ConditionalEdgeRouter<typeof MyState, "step2" | "step3"> = (state) => {
  if (state.data === "important") {
    return "step3";
  }
  return "step2";
};

graph.addConditionalEdges("step1", router, ["step2", "step3", END]);
```

**流程图：**

```
        ┌→ step2
step1 ──┼→ step3
        └→ END
```

💡 **人话解读：**
> "条件边就是'十字路口'，根据当前状态决定往哪走。router 函数返回下一个节点的名字。"

**路由函数签名：**

```typescript
type ConditionalEdgeRouter<State, Destinations> = (
  state: StateType
) => Destinations | typeof END;
```

### 6. Command：节点内控制路由

```typescript
import { Command } from "@langchain/langgraph";

return new Command({
  update: { data: "新数据" },   // 状态更新
  goto: "nextNode",            // 下一个节点
});
```

**为什么用 Command？**

传统方式需要在图定义时就确定所有路由逻辑，但有时候路由决策依赖于节点内部的计算结果：

```typescript
const classifyNode: GraphNode<typeof State> = async (state) => {
  const classification = await llm.invoke(state.content);
  
  let nextNode: string;
  if (classification.type === "urgent") {
    nextNode = "urgentHandler";
  } else if (classification.type === "normal") {
    nextNode = "normalHandler";
  } else {
    nextNode = END;
  }
  
  return new Command({
    update: { classification },
    goto: nextNode,
  });
};
```

💡 **人话解读：**
> "Command 让节点自己决定下一步去哪，不用在外面画一堆条件边。逻辑更内聚，代码更好维护。"

### 7. compile：编译图

```typescript
const app = graph.compile(options?)
```

**基础用法：**

```typescript
const app = graph.compile();
```

**带 Checkpointer（启用持久化）：**

```typescript
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();
const app = graph.compile({ checkpointer });
```

**完整选项：**

| 选项 | 类型 | 说明 |
|------|------|------|
| `checkpointer` | BaseCheckpointSaver | 状态持久化器 |
| `interruptBefore` | string[] | 在这些节点之前暂停 |
| `interruptAfter` | string[] | 在这些节点之后暂停 |

### 8. invoke / stream：执行图

**同步执行：**

```typescript
const result = await app.invoke(
  { messages: [new HumanMessage("Hello")] },
  { configurable: { thread_id: "user_123" } }
);
```

**流式执行：**

```typescript
const stream = await app.stream(
  { messages: [new HumanMessage("Hello")] },
  { streamMode: "values" }
);

for await (const chunk of stream) {
  console.log(chunk);
}
```

---

## 完整示例：构建计算器 Agent

让我们把所有 API 串起来，构建一个完整的工具调用 Agent：

### Step 1：定义工具

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

const model = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  temperature: 0,
});

const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const multiply = tool(({ a, b }) => a * b, {
  name: "multiply",
  description: "Multiply two numbers",
  schema: z.object({
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  }),
});

const toolsByName = { [add.name]: add, [multiply.name]: multiply };
const tools = Object.values(toolsByName);
const modelWithTools = model.bindTools(tools);
```

### Step 2：定义状态

```typescript
import {
  StateGraph, StateSchema, MessagesValue, ReducedValue,
  GraphNode, ConditionalEdgeRouter, START, END,
} from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(
    z.number().default(0),
    { reducer: (x, y) => x + y }
  ),
});
```

### Step 3：定义节点

```typescript
import { SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

const llmNode: GraphNode<typeof State> = async (state) => {
  const response = await modelWithTools.invoke([
    new SystemMessage("你是一个数学助手，使用工具进行计算。"),
    ...state.messages,
  ]);
  return { messages: [response], llmCalls: 1 };
};

const toolNode: GraphNode<typeof State> = async (state) => {
  const lastMessage = state.messages.at(-1);
  
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return { messages: [] };
  }
  
  const results: ToolMessage[] = [];
  for (const toolCall of lastMessage.tool_calls ?? []) {
    const tool = toolsByName[toolCall.name];
    const result = await tool.invoke(toolCall);
    results.push(result);
  }
  
  return { messages: results };
};
```

### Step 4：定义路由逻辑

```typescript
const shouldContinue: ConditionalEdgeRouter<typeof State, "tools"> = (state) => {
  const lastMessage = state.messages.at(-1);
  
  if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
    return END;
  }
  
  if (lastMessage.tool_calls?.length) {
    return "tools";
  }
  
  return END;
};
```

### Step 5：构建并编译图

```typescript
const agent = new StateGraph(State)
  .addNode("llm", llmNode)
  .addNode("tools", toolNode)
  .addEdge(START, "llm")
  .addConditionalEdges("llm", shouldContinue, ["tools", END])
  .addEdge("tools", "llm")
  .compile();
```

### Step 6：执行

```typescript
import { HumanMessage } from "@langchain/core/messages";

const result = await agent.invoke({
  messages: [new HumanMessage("计算 (3 + 4) * 5")],
});

console.log("最终结果:", result.messages.at(-1)?.content);
console.log("LLM 调用次数:", result.llmCalls);
```

### 流程图可视化

```
     START
        │
        ▼
   ┌─────────┐
   │   llm   │◄────────────┐
   └────┬────┘             │
        │                  │
        ▼                  │
  [shouldContinue?]        │
   /          \            │
  ▼            ▼           │
tools         END          │
  │                        │
  └────────────────────────┘
```

---

## API 速查表

| API | 作用 | 示例 |
|-----|------|------|
| `new StateGraph(schema)` | 创建图 | `new StateGraph(State)` |
| `.addNode(name, fn, opts?)` | 添加节点 | `.addNode("llm", llmNode)` |
| `.addEdge(from, to)` | 添加普通边 | `.addEdge(START, "llm")` |
| `.addConditionalEdges(from, router, dests)` | 添加条件边 | `.addConditionalEdges("llm", router, ["tools", END])` |
| `.compile(opts?)` | 编译图 | `.compile({ checkpointer })` |
| `await app.invoke(input, config?)` | 同步执行 | `await app.invoke({ messages })` |
| `await app.stream(input, opts?)` | 流式执行 | `await app.stream({ messages })` |

| 状态类型 | 用途 | 更新行为 |
|---------|------|---------|
| `z.string()` | 普通值 | 直接覆盖 |
| `MessagesValue` | 消息列表 | 自动追加 |
| `ReducedValue` | 累积值 | 通过 reducer 处理 |

| 特殊常量 | 说明 |
|---------|------|
| `START` | 图的入口点 |
| `END` | 图的出口点 |

---

## 常见错误与避坑指南

### 错误 1：忘记连接 START

```typescript
// ❌ 错误：没有入口
const graph = new StateGraph(State)
  .addNode("step1", step1)
  .addEdge("step1", END)
  .compile();

// ✅ 正确：从 START 开始
const graph = new StateGraph(State)
  .addNode("step1", step1)
  .addEdge(START, "step1")
  .addEdge("step1", END)
  .compile();
```

### 错误 2：条件边返回值不在目标列表中

```typescript
// ❌ 错误：router 可能返回 "step3"，但没有声明
const router = (state) => {
  if (xxx) return "step3";  // step3 不在目标列表中！
  return END;
};
graph.addConditionalEdges("step1", router, ["step2", END]);

// ✅ 正确：所有可能的返回值都要声明
graph.addConditionalEdges("step1", router, ["step2", "step3", END]);
```

### 错误 3：节点函数返回完整 state 而不是更新

```typescript
// ❌ 错误：返回完整 state 会覆盖其他字段
const myNode = async (state) => {
  return { ...state, data: "new" };  // 不要这样！
};

// ✅ 正确：只返回需要更新的字段
const myNode = async (state) => {
  return { data: "new" };  // 框架会自动合并
};
```

### 错误 4：MessagesValue 手动覆盖

```typescript
// ❌ 错误：试图覆盖整个 messages 数组
const myNode = async (state) => {
  return { messages: state.messages.concat([newMessage]) };
};

// ✅ 正确：只返回新消息，框架自动追加
const myNode = async (state) => {
  return { messages: [newMessage] };
};
```

---

## 核心要点回顾

1. **StateGraph**：图的容器，传入 Schema 开始构建
2. **StateSchema**：定义状态结构，用 Zod 做类型校验
3. **MessagesValue**：消息列表专用，自动追加
4. **ReducedValue**：自定义 reducer，灵活处理更新
5. **addNode**：添加节点，节点就是函数
6. **addEdge**：固定路由，A 完成一定去 B
7. **addConditionalEdges**：动态路由，根据状态决定
8. **Command**：节点内路由，逻辑更内聚
9. **compile**：编译成可执行的应用

---

## 下一步学习

掌握了 Graph API，接下来：

- 🎯 **[07-Functional API](./07-functional-api.md)**：另一种编程风格，更接近传统函数式
- 🔄 **[08-工作流与 Agent](./08-workflows.md)**：6 种核心工作流模式详解
- 💾 **[15-持久化机制](./15-persistence.md)**：让你的 Agent 有记忆

---

> 📅 更新时间：2026-02-22
