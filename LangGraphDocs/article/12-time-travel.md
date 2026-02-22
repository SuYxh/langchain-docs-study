# 时间旅行：状态回溯与重放

## 简单来说

时间旅行（Time Travel）是 LangGraph 提供的"读档"功能：你可以回到 AI 工作流执行过程中的任意时刻，查看当时的状态，甚至从那个时刻"分叉"出新的执行路径。就像游戏里的存档回放功能，让调试和恢复变得轻而易举。

---

## 🎯 本节目标

学完本节，你将能够：

- 使用 `getState()` 查看当前状态
- 使用 `getStateHistory()` 获取完整执行历史
- 使用 `updateState()` 手动修改状态
- 通过指定 `checkpoint_id` 从历史节点恢复执行
- 理解时间旅行在调试和恢复中的应用

---

## 核心痛点与解决方案

### 痛点：AI 做了奇怪的决定，怎么查？

| 痛点 | 具体表现 |
|------|----------|
| **黑盒执行** | AI 给出了一个奇怪的结果，但不知道它是怎么想的 |
| **无法回退** | 发现某一步做错了，只能从头再来 |
| **调试困难** | 复杂工作流中找不到问题出在哪一步 |
| **无法分叉** | 想尝试不同的路径，必须重新执行整个流程 |

### 解决：时间旅行的能力

```
┌─────────────────────────────────────────────────────────────┐
│                      时间旅行能力                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   执行历史: step1 → step2 → step3 → step4 (有问题!)         │
│                            │                                │
│                            ▼                                │
│              🕐 回到 step2 的时刻                            │
│              📝 修改当时的状态                               │
│              🔀 分叉出新路径                                 │
│                            │                                │
│                            ▼                                │
│   新执行路径: step1 → step2 → step3' → step4' (问题解决!)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 生活化类比：视频回放与剪辑

把时间旅行想象成**视频编辑软件**：

| LangGraph 功能 | 视频类比 | 说明 |
|---------------|---------|------|
| **getState()** | 查看当前帧 | 看看现在播到哪了 |
| **getStateHistory()** | 时间轴 | 整个视频的所有帧 |
| **checkpoint_id** | 时间戳/帧号 | 定位到某一帧 |
| **updateState()** | 修改某一帧 | 在那个时间点改点东西 |
| **从历史恢复** | 从某帧开始播放 | 从那个时间点继续 |
| **分叉** | 另存为新视频 | 从某帧开始走不同剧情 |

---

## 核心 API 详解

### 1. getState()：获取当前状态

```typescript
const state = await graph.getState(config);

console.log(state.values);     // 当前状态数据
console.log(state.next);       // 接下来要执行的节点
console.log(state.metadata);   // 元信息（步数、来源等）
console.log(state.config);     // 配置信息（包含 checkpoint_id）
```

**StateSnapshot 结构：**

| 属性 | 类型 | 说明 |
|------|------|------|
| `values` | object | 当前状态的所有数据 |
| `next` | string[] | 下一步要执行的节点列表 |
| `metadata` | object | 元信息：step、source 等 |
| `config` | RunnableConfig | 配置，包含 checkpoint_id |
| `tasks` | Task[] | 待执行任务列表 |

### 2. getStateHistory()：获取执行历史

```typescript
const history = [];
for await (const state of graph.getStateHistory(config)) {
  history.push(state);
}

console.log(`共有 ${history.length} 个检查点`);
history.forEach((state, i) => {
  console.log(`Step ${state.metadata?.step}: ${state.next.join(", ")}`);
});
```

💡 **人话解读：** 获取从开始到现在的所有"存档点"，可以看到每一步的状态变化。

### 3. updateState()：手动修改状态

```typescript
await graph.updateState(config, {
  messages: [{ role: "user", content: "新的问题" }]
});
```

**高级用法：指定"假装是某个节点更新的"**

```typescript
await graph.updateState(config, {
  messages: [{ role: "ai", content: "手动插入的回复" }]
}, { asNode: "chat_node" });
```

💡 **人话解读：** `asNode` 让系统以为这个更新是从 `chat_node` 发出的，这会影响后续的路由决策。

---

## 实战示例

### 场景准备：创建一个带存档的聊天机器人

```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, StateSchema, MessagesValue, GraphNode, MemorySaver, START, END } from "@langchain/langgraph";

const State = new StateSchema({
  messages: MessagesValue,
});

const model = new ChatAnthropic({ model: "claude-haiku-4-5-20251001" });

const chatNode: GraphNode<typeof State> = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

const checkpointer = new MemorySaver();

const graph = new StateGraph(State)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END)
  .compile({ checkpointer });

const config = { configurable: { thread_id: "test-thread" } };
```

### 示例 1：执行并查看状态

```typescript
await graph.invoke(
  { messages: [{ role: "user", content: "Hi, I'm Alice" }] },
  config
);

const state = await graph.getState(config);
console.log("当前消息数:", state.values.messages.length);
console.log("最后一条消息:", state.values.messages.at(-1)?.content);
```

### 示例 2：查看执行历史

```typescript
await graph.invoke(
  { messages: [{ role: "user", content: "What's my name?" }] },
  config
);

console.log("=== 执行历史 ===");
for await (const snapshot of graph.getStateHistory(config)) {
  console.log(`Step ${snapshot.metadata?.step}:`);
  console.log(`  - 消息数: ${snapshot.values.messages?.length || 0}`);
  console.log(`  - 下一步: ${snapshot.next.join(", ") || "END"}`);
  console.log(`  - checkpoint_id: ${snapshot.config.configurable?.checkpoint_id}`);
  console.log();
}
```

输出示例：

```
=== 执行历史 ===
Step 2:
  - 消息数: 4
  - 下一步: END
  - checkpoint_id: abc123

Step 1:
  - 消息数: 3
  - 下一步: chat
  - checkpoint_id: def456

Step 0:
  - 消息数: 2
  - 下一步: chat
  - checkpoint_id: ghi789

...
```

### 示例 3：从历史状态恢复执行

```typescript
const history = [];
for await (const snapshot of graph.getStateHistory(config)) {
  history.push(snapshot);
}

const targetCheckpoint = history[2];
console.log("回到 Step", targetCheckpoint.metadata?.step);

const historicalConfig = {
  configurable: {
    thread_id: "test-thread",
    checkpoint_id: targetCheckpoint.config.configurable?.checkpoint_id,
  }
};

const result = await graph.invoke(
  { messages: [{ role: "user", content: "Actually, my name is Bob" }] },
  historicalConfig
);
```

💡 **人话解读：** 指定 `checkpoint_id` 就是"读档"，从那个时刻继续执行，会创建一条新的分叉路径。

### 示例 4：手动修改状态

```typescript
await graph.updateState(config, {
  messages: [{ role: "user", content: "I want to change my order" }]
});

const updatedState = await graph.getState(config);
console.log("更新后的消息数:", updatedState.values.messages.length);
console.log("最后一条消息:", updatedState.values.messages.at(-1)?.content);
```

---

## 分叉执行：创建平行宇宙

时间旅行最强大的能力是**分叉**：从历史某一点开始，走一条完全不同的路。

```
原始执行: A → B → C → D
                    │
            回到 B   │
                    ▼
分叉执行:  A → B → C' → D'  (新路径)
                    
原始路径 C → D 依然存在！
```

### 分叉示例

```typescript
const originalThread = { configurable: { thread_id: "original" } };

await graph.invoke({ messages: [{ role: "user", content: "Hello" }] }, originalThread);
await graph.invoke({ messages: [{ role: "user", content: "Tell me a joke" }] }, originalThread);

const history = [];
for await (const snapshot of graph.getStateHistory(originalThread)) {
  history.push(snapshot);
}

const branchPoint = history.find(s => s.metadata?.step === 1);

const branchConfig = {
  configurable: {
    thread_id: "branch-1",
    checkpoint_id: branchPoint.config.configurable?.checkpoint_id,
  }
};

await graph.invoke(
  { messages: [{ role: "user", content: "Tell me a story instead" }] },
  branchConfig
);
```

💡 **人话解读：** 原始对话说"讲个笑话"，分叉后从 Step 1 开始说"讲个故事"。两条路径独立存在，互不影响。

---

## 应用场景

### 场景 1：调试异常行为

```typescript
const history = [];
for await (const snapshot of graph.getStateHistory(config)) {
  history.push(snapshot);
}

for (const snapshot of history) {
  if (snapshot.metadata?.step === 3) {
    console.log("Step 3 的状态:", snapshot.values);
    console.log("Step 3 的输入:", snapshot.values.messages?.at(-2)?.content);
    console.log("Step 3 的输出:", snapshot.values.messages?.at(-1)?.content);
  }
}
```

### 场景 2：A/B 测试不同策略

```typescript
const baseConfig = { configurable: { thread_id: "base" } };
await graph.invoke({ messages: [{ role: "user", content: "Help me plan a trip" }] }, baseConfig);

const baseState = await graph.getState(baseConfig);
const checkpointId = baseState.config.configurable?.checkpoint_id;

const strategyA = {
  configurable: { thread_id: "strategy-a", checkpoint_id: checkpointId }
};
await graph.invoke(
  { messages: [{ role: "system", content: "优先推荐便宜的方案" }] },
  strategyA
);

const strategyB = {
  configurable: { thread_id: "strategy-b", checkpoint_id: checkpointId }
};
await graph.invoke(
  { messages: [{ role: "system", content: "优先推荐舒适的方案" }] },
  strategyB
);
```

### 场景 3：错误恢复

```typescript
try {
  await graph.invoke(input, config);
} catch (error) {
  console.log("执行出错，尝试从上一个成功点恢复...");
  
  const history = [];
  for await (const snapshot of graph.getStateHistory(config)) {
    if (!snapshot.metadata?.error) {
      history.push(snapshot);
    }
  }
  
  if (history.length > 0) {
    const lastGoodState = history[0];
    const recoveryConfig = {
      configurable: {
        thread_id: config.configurable.thread_id,
        checkpoint_id: lastGoodState.config.configurable?.checkpoint_id,
      }
    };
    
    await graph.invoke(null, recoveryConfig);
  }
}
```

---

## API 速查表

| 方法 | 用途 | 返回值 |
|------|------|--------|
| `getState(config)` | 获取当前状态 | StateSnapshot |
| `getStateHistory(config)` | 获取历史状态 | AsyncIterable<StateSnapshot> |
| `updateState(config, values, opts?)` | 更新状态 | void |
| `invoke(input, { checkpoint_id })` | 从历史恢复执行 | Result |

### StateSnapshot 结构

| 属性 | 说明 |
|------|------|
| `values` | 状态数据 |
| `next` | 下一步节点 |
| `metadata` | 元信息 |
| `config` | 配置（含 checkpoint_id） |
| `tasks` | 待执行任务 |

---

## 最佳实践

| 实践 | 说明 |
|------|------|
| ✅ 用有意义的 thread_id | 便于追踪和管理 |
| ✅ 记录关键 checkpoint_id | 方便后续恢复 |
| ✅ 分叉使用新 thread_id | 保持原始路径不变 |
| ✅ 定期清理旧检查点 | 避免存储膨胀 |

---

## 核心要点回顾

1. **getState()**：查看当前状态快照
2. **getStateHistory()**：获取完整执行历史
3. **updateState()**：手动修改状态
4. **checkpoint_id**：定位到历史某一时刻
5. **分叉执行**：从历史节点创建新路径
6. **应用场景**：调试、A/B 测试、错误恢复

---

## 下一步学习

掌握了时间旅行，接下来：

- ⏸️ **[13-中断机制](./13-interrupts.md)**：实现人机协作
- 🌊 **[14-流式处理](./14-streaming.md)**：5 种流模式详解
- 🔧 **[15-子图构建](./15-subgraphs.md)**：模块化复杂工作流

---

> 📅 更新时间：2026-02-22
