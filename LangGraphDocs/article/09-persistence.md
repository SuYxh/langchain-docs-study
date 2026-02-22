# 持久化机制：让 AI 拥有记忆与存档功能

## 简单来说

LangGraph 的持久化机制就像给你的 AI 装上了**游戏存档系统**：每执行一步都自动保存进度，随时可以读档回到过去，中途掉线也能从断点继续。这不是魔法，这是 Checkpointer。

---

## 🎯 本节目标

学完本节，你将能够：

- 理解 Thread、Checkpoint、Checkpointer 的核心概念
- 掌握 getState、getStateHistory、updateState API 的使用
- 了解不同 Checkpointer 实现的适用场景
- 学会为生产环境选择合适的持久化方案

---

## 核心痛点与解决方案

### 痛点：没有持久化时的四大灾难

| 灾难 | 具体表现 |
|------|----------|
| **健忘症** | 用户聊了 10 轮，刷新页面后 AI 完全不记得之前的对话 |
| **无法中断** | 想在关键步骤让人工审核？不好意思，要么全自动，要么从头来 |
| **出错全废** | 一个 5 步的工作流，第 4 步报错，前面 3 步全白费 |
| **无法调试** | AI 做了奇怪的决定，想回头看看它经历了什么？没门！ |

### 解决：Checkpointer 来救场

| 之前的痛苦 | 有了 Checkpointer |
|-----------|------------------|
| 对话刷新就忘 | 自动保存每一步，无缝继续 |
| 无法人工审核 | 可以在任意节点暂停，审核后继续 |
| 出错从头再来 | 从上次成功的步骤恢复 |
| 调试无从下手 | 完整的状态历史可追溯 |

---

## 生活化类比：医院病历系统

把 LangGraph 的持久化想象成一套**医院电子病历系统**：

| LangGraph 概念 | 医院类比 | 说明 |
|---------------|---------|------|
| **Thread** | 病历档案号 | 你的所有就诊记录都归档到这个号下 |
| **Checkpoint** | 单次诊疗记录 | 包括：哪个医生看的、做了什么检查、开了什么药 |
| **State** | 当前健康状况 | 体温、血压、症状描述等 |
| **thread_id** | 身份证号 | 唯一标识你是谁 |
| **checkpoint_id** | 挂号单号 | 定位到某次具体的就诊 |
| **getState()** | 调取最新病历 | 看看现在状态如何 |
| **getStateHistory()** | 调取历史病历 | 回顾所有就诊记录 |
| **updateState()** | 医生修改病历 | 手动补充或修正信息 |
| **Checkpointer** | 病历系统后台 | 负责存储和检索所有病历数据 |

```
Patient: 张三 (thread_id: "zhangsan-001")
│
├── Checkpoint 1: 2024-01-01 感冒就诊
│   ├── 状态: { 体温: 38.5, 症状: "咳嗽" }
│   └── 下一步: 开药
│
├── Checkpoint 2: 2024-01-01 开药完成
│   ├── 状态: { 体温: 38.5, 药物: ["感冒灵"] }
│   └── 下一步: 结束
│
└── Checkpoint 3: 2024-01-15 复诊
    ├── 状态: { 体温: 36.5, 状态: "康复" }
    └── 下一步: 结束
```

---

## 核心概念详解

### 1. Thread（线程）

Thread 是一个唯一的"对话 ID"，所有相关的状态都存在这个 ID 下面。

```typescript
const config = {
  configurable: {
    thread_id: "user-123-conversation"
  }
};
```

💡 **人话解读：** 就像微信群有个群 ID，所有聊天记录都在这个群里。换个 `thread_id`，就是开了个新群，从零开始。

### 2. Checkpoint（检查点）

Checkpoint 是某一时刻的"游戏存档"，包含了当时的所有状态信息。

一个 Checkpoint 包含：

| 属性 | 说明 | 类比 |
|-----|------|-----|
| `values` | 当前状态的所有数据 | 游戏存档里的角色属性、装备、金币 |
| `next` | 接下来要执行哪个节点 | 存档时你站在哪个关卡的入口 |
| `metadata` | 元信息（谁写入的、第几步等） | 存档的时间戳、存档备注 |
| `tasks` | 待执行的任务列表 | 还没完成的任务清单 |

### 3. Checkpointer（存档器）

Checkpointer 是负责"存档"和"读档"的管理员。

| 存档器 | 适用场景 | 特点 |
|-------|---------|------|
| `MemorySaver` | 开发测试 | 存内存，重启就没了 |
| `SqliteSaver` | 本地开发 | 存文件，简单轻量 |
| `PostgresSaver` | 生产环境 | 企业级，支持高并发 |
| `RedisSaver` | 高性能场景 | 内存级速度 |

---

## 代码实战

### 基础设置：给图装上存档功能

```typescript
import { StateGraph, StateSchema, MessagesValue, MemorySaver, START, END } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const chatNode = async (state) => {
  return { messages: [{ role: "ai", content: "Hello!" }] };
};

const checkpointer = new MemorySaver();

const graph = new StateGraph(State)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile({ checkpointer });
```

💡 **人话解读：** `.compile({ checkpointer })` 这一句就是"给我的工作流装上自动存档功能"。

### 执行时：指定存档位置

```typescript
const config = {
  configurable: {
    thread_id: "user-123-chat"
  }
};

await graph.invoke(
  { messages: [{ role: "user", content: "Hi!" }] },
  config
);
```

💡 **人话解读：** 执行这个工作流，所有中间状态都自动保存到 "user-123-chat" 这个档案里。

### 读取状态：看看当前进度

```typescript
const currentState = await graph.getState(config);

console.log(currentState.values);
console.log(currentState.next);
console.log(currentState.metadata);
```

输出示例：

```javascript
{
  values: { messages: [HumanMessage(...), AIMessage(...)] },
  next: [],
  metadata: { step: 2, source: "loop" }
}
```

### 查看历史：回顾所有存档

```typescript
const history = [];
for await (const state of graph.getStateHistory(config)) {
  history.push(state);
}

for (const state of history) {
  console.log(`Step ${state.metadata?.step}:`, state.values);
}
```

### 手动修改状态：作弊模式

```typescript
await graph.updateState(config, {
  messages: [{ role: "user", content: "Actually, I want to change my question" }]
});
```

💡 **人话解读：** 手动修改存档内容。注意：有 Reducer 的字段会按规则合并，没有的会直接覆盖。

---

## 生产环境配置

### PostgreSQL Checkpointer

```bash
npm install @langchain/langgraph-checkpoint-postgres
```

```typescript
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const DB_URI = "postgresql://user:pass@localhost:5432/mydb";
const checkpointer = PostgresSaver.fromConnString(DB_URI);

const graph = builder.compile({ checkpointer });
```

⚠️ **首次使用需要初始化数据库表：**

```typescript
await checkpointer.setup();
```

### 完整示例：带持久化的聊天机器人

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, StateSchema, MessagesValue, GraphNode, START } from "@langchain/langgraph";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });

const callModel: GraphNode<typeof State> = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const checkpointer = PostgresSaver.fromConnString(DB_URI);

const graph = new StateGraph(State)
  .addNode("call_model", callModel)
  .addEdge(START, "call_model")
  .compile({ checkpointer });

const config = { configurable: { thread_id: "1" } };

await graph.invoke(
  { messages: [{ role: "user", content: "Hi! I'm Bob" }] },
  config
);

await graph.invoke(
  { messages: [{ role: "user", content: "What's my name?" }] },
  config
);
```

---

## 四大核心能力

持久化为 LangGraph 带来了四个杀手级能力：

### 1. Human-in-the-loop（人机协作）

AI 执行到关键节点时可以暂停，等人类审核后再继续。

```typescript
const graph = builder.compile({
  checkpointer,
  interruptBefore: ["sensitive_action"]
});
```

### 2. Memory（记忆）

AI 能记住之前的对话内容，实现真正的多轮对话。

```typescript
const config = { configurable: { thread_id: "user-session-123" } };
await graph.invoke({ messages: [msg1] }, config);
await graph.invoke({ messages: [msg2] }, config);
```

### 3. Time Travel（时间旅行）

可以回到任意历史节点，查看当时状态，或者从那里"分叉"出新的执行路径。

```typescript
const config = {
  configurable: {
    thread_id: "...",
    checkpoint_id: "某个历史存档ID"
  }
};
await graph.invoke(null, config);
```

### 4. Fault Tolerance（容错）

某个节点失败时，不需要从头开始，可以从上次成功的地方继续。

```typescript
try {
  await graph.invoke(input, config);
} catch (error) {
  await graph.invoke(null, config);
}
```

---

## Checkpointer 选型指南

| 环境 | 推荐方案 | 说明 |
|------|---------|------|
| **本地开发** | `MemorySaver` | 简单快速，不需要数据库 |
| **测试环境** | `SqliteSaver` | 文件存储，可持久化 |
| **生产环境** | `PostgresSaver` | 企业级，支持高并发 |
| **高性能场景** | `RedisSaver` | 内存级速度 |

---

## 核心 API 速查表

| 方法 | 用途 | 示例 |
|------|------|------|
| `graph.getState(config)` | 获取当前状态 | 查看最新进度 |
| `graph.getStateHistory(config)` | 获取历史状态 | 调试、审计 |
| `graph.updateState(config, values)` | 更新状态 | 人工干预 |
| `graph.invoke(null, config)` | 从断点继续 | 错误恢复 |

---

## 核心要点回顾

1. **Thread**：对话的唯一标识，通过 `thread_id` 指定
2. **Checkpoint**：某一时刻的状态快照，自动保存
3. **Checkpointer**：存档管理器，有多种实现可选
4. **四大能力**：人机协作、记忆、时间旅行、容错
5. **生产选型**：PostgresSaver 是生产环境的首选

---

## 下一步学习

掌握了持久化基础，接下来深入：

- ⚡ **[10-持久执行](./10-durable-execution.md)**：Durable Execution 原理与实践
- 🧠 **[11-记忆系统](./11-memory.md)**：短期记忆与长期记忆详解
- ⏰ **[12-时间旅行](./12-time-travel.md)**：状态回溯与重放

---

> 📅 更新时间：2026-02-22
