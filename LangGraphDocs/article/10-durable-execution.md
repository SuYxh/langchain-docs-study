# 持久执行：让工作流永不丢失进度

## 简单来说

Durable Execution（持久执行）是一种"永不放弃"的执行模式：工作流在关键步骤保存进度，即使服务器崩溃、网络断开、甚至一周后才恢复，也能从上次停下的地方继续执行，而不是从头再来。

---

## 🎯 本节目标

学完本节，你将能够：

- 理解 Durable Execution 的原理和价值
- 掌握确定性与一致性重放的概念
- 学会使用 task 包装非确定性操作
- 了解三种持久化模式的选择

---

## 核心痛点与解决方案

### 痛点：长任务执行的噩梦

想象一下这个场景：

```
用户请求 → 步骤1(成功) → 步骤2(成功) → 步骤3(成功) → 步骤4 💥 服务器崩溃
                                                              │
                                                              ▼
                                                   步骤1-3 的工作全白费！
```

| 灾难场景 | 具体表现 |
|---------|---------|
| **服务器重启** | 正在执行的任务直接丢失 |
| **网络超时** | API 调用失败，整个流程中断 |
| **人工介入** | 等待审核期间服务器重启，之前的进度全没了 |
| **长时间任务** | 跑了一个小时的任务，第 59 分钟失败，从头再来 |

### 解决：Durable Execution 的存档机制

```
用户请求 → 步骤1(存档✓) → 步骤2(存档✓) → 步骤3(存档✓) → 步骤4 💥 崩溃
                                                              │
                                              服务器恢复后     │
                                                              ▼
                                              从步骤4继续（不用从头来！）
```

---

## 生活化类比：游戏自动存档

把 Durable Execution 想象成**现代游戏的自动存档系统**：

| 技术概念 | 游戏类比 |
|---------|---------|
| **Durable Execution** | 每打完一关自动存档 |
| **Checkpoint** | 存档点 |
| **Resume** | 读档继续 |
| **Replay** | 快进到存档点（跳过已完成的步骤） |
| **task 包装** | 标记"这个操作有副作用，要记录下来" |

**对比：**

| 场景 | 没有自动存档 | 有自动存档 |
|------|------------|-----------|
| 游戏崩溃 | 从第一关重新打 | 从最近存档点继续 |
| 中途退出 | 进度全丢 | 下次继续 |
| 打到 BOSS 死了 | 从头开始 | 从 BOSS 房门口重试 |

---

## 核心原理

### 1. 恢复执行的起点

当你恢复一个被中断的工作流时，代码**不是**从中断的那一行继续执行，而是：

| API 类型 | 恢复起点 |
|---------|---------|
| **Graph API** | 从被中断的**节点开头**重新执行 |
| **Functional API** | 从 **entrypoint** 开头重新执行 |
| **子图** | 父节点会重新执行，子图从被中断的节点继续 |

这意味着：恢复执行时，系统会"快进"（replay）已完成的步骤，直到到达中断点。

### 2. 确定性与一致性重放

为了正确重放，你的工作流必须是**确定性**的：给定相同的输入，必须产生相同的输出。

**需要特别处理的操作：**

| 操作类型 | 问题 | 解决方案 |
|---------|------|---------|
| **随机数生成** | 每次结果不同 | 用 task 包装 |
| **API 调用** | 结果可能变化 | 用 task 包装 |
| **文件读写** | 有副作用 | 用 task 包装 |
| **当前时间** | 每次不同 | 用 task 包装 |

### 3. task 包装的作用

用 `task` 包装操作后，LangGraph 会：

1. **首次执行**：正常执行并保存结果
2. **重放时**：跳过执行，直接返回保存的结果

```
首次执行: task("api_call") → 调用 API → 保存结果 "success"
                                              │
                                              ▼
重放时:   task("api_call") → 从存档读取 → 直接返回 "success"（不再调用 API）
```

---

## 代码实战

### 问题示例：未包装的非确定性操作

```typescript
import { StateGraph, StateSchema, GraphNode, START, END, MemorySaver } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  url: z.string(),
  result: z.string().optional(),
});

const callApi: GraphNode<typeof State> = async (state) => {
  const response = await fetch(state.url);
  const text = await response.text();
  return { result: text.slice(0, 100) };
};

const graph = new StateGraph(State)
  .addNode("callApi", callApi)
  .addEdge(START, "callApi")
  .addEdge("callApi", END)
  .compile({ checkpointer: new MemorySaver() });
```

**问题**：如果在 `callApi` 执行后、状态保存前崩溃，恢复时会重新调用 API。如果 API 有副作用（如创建订单），就会重复执行！

### 正确做法：用 task 包装

```typescript
import { StateGraph, StateSchema, GraphNode, START, END, MemorySaver, task } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  urls: z.array(z.string()),
  results: z.array(z.string()).optional(),
});

const makeRequest = task("makeRequest", async (url: string) => {
  const response = await fetch(url);
  const text = await response.text();
  return text.slice(0, 100);
});

const callApi: GraphNode<typeof State> = async (state) => {
  const requests = state.urls.map((url) => makeRequest(url));
  const results = await Promise.all(requests);
  return { results };
};

const graph = new StateGraph(State)
  .addNode("callApi", callApi)
  .addEdge(START, "callApi")
  .addEdge("callApi", END)
  .compile({ checkpointer: new MemorySaver() });
```

💡 **人话解读：**
> "把 `fetch` 调用包装成 `task`，这样恢复执行时不会重复调用 API，而是直接返回之前保存的结果。"

---

## 三种持久化模式

LangGraph 支持三种持久化模式，让你在性能和可靠性之间做权衡：

```typescript
await graph.stream(
  { input: "test" },
  { durability: "sync" }
);
```

| 模式 | 说明 | 性能 | 可靠性 |
|------|------|------|--------|
| `"exit"` | 只在执行结束时保存 | ⭐⭐⭐ 最快 | ⭐ 最低 |
| `"async"` | 异步保存（下一步执行时） | ⭐⭐ 较快 | ⭐⭐ 中等 |
| `"sync"` | 同步保存（每步执行前） | ⭐ 较慢 | ⭐⭐⭐ 最高 |

### 模式选择建议

| 场景 | 推荐模式 |
|------|---------|
| 开发测试 | `"exit"` - 快速迭代 |
| 普通生产 | `"async"` - 平衡选择 |
| 关键任务 | `"sync"` - 不能丢数据 |
| 短任务 | `"exit"` - 反正很快完成 |
| 长任务 | `"sync"` - 必须保证恢复 |

---

## 常见陷阱与避坑指南

### 陷阱 1：节点内多个副作用操作

```typescript
// ❌ 错误：多个操作混在一起
const processNode: GraphNode<typeof State> = async (state) => {
  const data1 = await fetchFromApi1();
  const data2 = await fetchFromApi2();
  await saveToDatabase(data1 + data2);
  return { result: data1 + data2 };
};
```

**问题**：如果在 `fetchFromApi2` 后崩溃，恢复时会重新执行 `fetchFromApi1`。

```typescript
// ✅ 正确：每个操作单独包装
const fetchApi1 = task("fetchApi1", async () => {
  return fetch("https://api1.example.com");
});

const fetchApi2 = task("fetchApi2", async () => {
  return fetch("https://api2.example.com");
});

const saveToDB = task("saveToDB", async (data: string) => {
  return database.save(data);
});

const processNode: GraphNode<typeof State> = async (state) => {
  const data1 = await fetchApi1();
  const data2 = await fetchApi2();
  await saveToDB(data1 + data2);
  return { result: data1 + data2 };
};
```

### 陷阱 2：非幂等操作

```typescript
// ❌ 危险：创建订单不是幂等的
const createOrder = task("createOrder", async (items: Item[]) => {
  return api.createOrder(items);
});
```

**问题**：如果 task 执行成功但保存失败，恢复时会重复创建订单。

```typescript
// ✅ 正确：使用幂等键
const createOrder = task("createOrder", async (items: Item[], idempotencyKey: string) => {
  return api.createOrder(items, { idempotencyKey });
});
```

### 陷阱 3：使用当前时间

```typescript
// ❌ 错误：每次执行时间不同
const processNode: GraphNode<typeof State> = async (state) => {
  const now = new Date();
  return { timestamp: now.toISOString() };
};
```

```typescript
// ✅ 正确：包装成 task
const getCurrentTime = task("getCurrentTime", () => {
  return new Date().toISOString();
});

const processNode: GraphNode<typeof State> = async (state) => {
  const timestamp = await getCurrentTime();
  return { timestamp };
};
```

---

## 恢复执行示例

### 场景：API 调用失败后恢复

```typescript
import { v4 as uuidv4 } from "uuid";

const config = {
  configurable: { thread_id: uuidv4() }
};

try {
  await graph.invoke({ urls: ["https://example.com"] }, config);
} catch (error) {
  console.log("执行失败，错误:", error);
  console.log("从断点恢复...");
  
  const result = await graph.invoke(null, config);
  console.log("恢复成功:", result);
}
```

💡 **关键点**：恢复执行时传入 `null` 作为输入，系统会自动从上次的状态继续。

### 场景：人工介入后恢复

```typescript
import { Command } from "@langchain/langgraph";

const state = await graph.invoke({ question: "需要审核的问题" }, config);

console.log("当前进度:", state);
console.log("需要人工审核...");

const humanDecision = await waitForHumanApproval();

await graph.invoke(
  new Command({ resume: humanDecision }),
  config
);
```

---

## 最佳实践总结

### DO（应该做的）

| 实践 | 说明 |
|------|------|
| ✅ 用 task 包装 API 调用 | 避免重复调用 |
| ✅ 用 task 包装随机操作 | 保证确定性 |
| ✅ 使用幂等键 | 防止重复创建 |
| ✅ 关键任务用 sync 模式 | 保证数据不丢 |

### DON'T（不应该做的）

| 反模式 | 问题 |
|--------|------|
| ❌ 在节点内直接调用 API | 恢复时会重复调用 |
| ❌ 依赖当前时间做逻辑判断 | 重放时时间不同 |
| ❌ 在 task 外使用随机数 | 结果不可重现 |
| ❌ 假设操作只执行一次 | 可能因恢复重复执行 |

---

## 核心要点回顾

1. **Durable Execution**：在关键步骤保存进度，中断后可恢复
2. **确定性原则**：相同输入必须产生相同输出
3. **task 包装**：用于非确定性操作和有副作用的操作
4. **三种模式**：exit（快）、async（平衡）、sync（可靠）
5. **幂等性**：确保操作重复执行不会产生副作用

---

## 下一步学习

掌握了持久执行，接下来：

- 🧠 **[11-记忆系统](./11-memory.md)**：短期记忆与长期记忆详解
- ⏰ **[12-时间旅行](./12-time-travel.md)**：状态回溯与重放
- ⏸️ **[13-中断机制](./13-interrupts.md)**：实现人机协作

---

> 📅 更新时间：2026-02-22
