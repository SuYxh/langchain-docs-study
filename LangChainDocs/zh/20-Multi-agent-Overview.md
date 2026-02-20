# 多智能体概览 (Multi-agent Overview)

多智能体系统 (Multi-Agent Systems) 涉及多个独立的 Agent 协同工作以解决复杂问题。LangGraph 非常适合构建此类系统，因为它允许您明确定义 Agent 之间的交互流和状态共享。

## 为什么使用多智能体？

- **关注点分离**：每个 Agent 可以专注于特定的任务或领域（例如，一个负责研究，一个负责编码，一个负责写作）。
- **模块化**：更容易开发、测试和维护独立的 Agent。
- **复杂性管理**：将复杂的任务分解为更小、更易于管理的子任务。

## 架构模式

### 1. 协作 (Collaboration)

Agent 共享一个公共状态（"黑板"模式），并轮流通过消息进行贡献。所有 Agent 都可以看到整个对话历史。

### 2. 监督 (Supervision) / 层次化 (Hierarchical)

一个“主管” (Supervisor) Agent 负责规划并将任务委派给下属的 Worker Agent。Worker Agent 完成任务后向主管汇报。主管整合结果并决定下一步行动。

### 3. 网络 (Network)

Agent 之间通过定义的路由逻辑直接相互传递控制权。这类似于状态机，其中每个状态都是一个独立的 Agent。

## LangGraph 实现

在 LangGraph 中，多智能体系统通常通过以下方式实现：

1.  **节点即 Agent**：图中的每个节点可以是一个完整的 Agent（可能有自己的内部循环）。
2.  **路由**：条件边决定了下一个轮到哪个 Agent 执行。
3.  **共享状态**：图的 schema 定义了 Agent 之间传递的数据结构。

### 示例结构（主管模式）

```typescript
// 伪代码结构示例

// 1. 定义状态
const TeamState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({ reducer: (x, y) => x.concat(y) }),
  next: Annotation<string>({ reducer: (x, y) => y ?? x }), // 决定下一个是谁
});

// 2. 定义 Worker Agents
const researcherNode = async (state) => { /* 执行研究 */ };
const coderNode = async (state) => { /* 编写代码 */ };

// 3. 定义主管 Agent
const supervisorNode = async (state) => {
  // 使用 LLM 决定下一个是 'researcher'、'coder' 还是 'FINISH'
  const decision = await llm.invoke([/*...*/]);
  return { next: decision.content };
};

// 4. 构建图
const workflow = new StateGraph(TeamState)
  .addNode("supervisor", supervisorNode)
  .addNode("researcher", researcherNode)
  .addNode("coder", coderNode)
  .addEdge(START, "supervisor")
  .addConditionalEdges("supervisor", (x) => x.next); // 根据主管的决定路由

// 添加从 worker 回到 supervisor 的边
workflow.addEdge("researcher", "supervisor");
workflow.addEdge("coder", "supervisor");

const app = workflow.compile();
```

通过这种方式，您可以构建极其复杂且灵活的 AI 团队。
