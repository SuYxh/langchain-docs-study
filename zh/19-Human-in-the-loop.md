# 人机交互 (Human-in-the-loop)

Human-in-the-loop (HITL) 模式允许人工介入 Agent 的执行过程。这对于需要审批、澄清或人工指导的场景非常有用。LangGraph 通过其持久化和断点机制原生支持 HITL。

## 关键概念

- **断点 (Breakpoints)**：在图执行的特定点暂停。
- **持久化 (Persistence)**：保存图的状态，以便稍后恢复。
- **状态更新**：在恢复执行之前，人工可以检查并修改状态。

## 设置断点

您可以在编译图时指定 `interruptBefore` 或 `interruptAfter` 参数来设置断点。

```typescript
import { StateGraph } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";

// ... 定义图构建逻辑 ...

const checkpointer = new MemorySaver();

const graph = builder.compile({
  checkpointer,
  // 在执行 'human_review' 节点之前中断
  interruptBefore: ["human_review"],
});
```

## 执行流程

1.  **运行并暂停**：像往常一样运行图。当到达断点节点时，执行将暂停。
2.  **检查状态**：使用 `get_state` 检查当前状态。
3.  **人工干预（可选）**：如果需要，使用 `update_state` 修改状态（例如，编辑模型的响应或提供反馈）。
4.  **恢复执行**：再次调用运行命令（使用相同的 `thread_id`），图将从暂停的地方继续执行。

## 示例：审批工具调用

一个常见的用例是在执行敏感操作（如写入数据库或发送电子邮件）之前要求人工批准。

```typescript
// 定义一个节点，实际上什么都不做，只是作为断点
function humanReviewNode(state: typeof GraphState.State) {
  console.log("等待人工审核...");
  // 可以在这里记录日志或发送通知
  return {};
}

// ... 将节点添加到图中 ...
builder.addNode("human_review", humanReviewNode);
builder.addEdge("agent", "human_review");
builder.addEdge("human_review", "action");

// 编译时在 'action' 节点之前中断，或者在 'human_review' 之后中断
const app = builder.compile({
  checkpointer,
  interruptBefore: ["action"],
});

// 运行图
const config = { configurable: { thread_id: "123" } };
await app.invoke({ messages: [/*...*/] }, config);

// 此时图已暂停。人工可以检查下一个要执行的操作。
const snapshot = await app.getState(config);
console.log("下一步操作:", snapshot.next);

// 如果批准，继续执行
// await app.invoke(null, config);

// 如果拒绝或需要修改，可以更新状态然后继续，或者终止。
```

这种模式确保了 Agent 在执行关键任务时的安全性和可控性。
