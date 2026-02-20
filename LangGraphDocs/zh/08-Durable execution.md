> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# 持久化执行（Durable execution）

**持久化执行（durable execution）** 是一种技术：流程或工作流会在关键节点保存其进度，使其能够暂停，并在之后从中断处精确恢复。这在需要 [人类介入（human-in-the-loop）](/oss/javascript/langgraph/interrupts) 的场景中特别有用，用户可以在继续之前检查、验证或修改流程；也适用于可能遭遇中断或错误的长时间任务（例如调用 LLM 超时）。通过保留已完成的工作，持久化执行使流程在恢复时无需重新处理之前的步骤——即便间隔很久（例如一周后）也同样如此。

LangGraph 内置的 [持久化](/oss/javascript/langgraph/persistence) 层为工作流提供持久化执行，确保每一步执行的状态都会保存到持久化存储中。该能力保证：无论工作流是因系统故障还是为了 [人类介入（human-in-the-loop）](/oss/javascript/langgraph/interrupts) 交互而中断，都可以从最后记录的状态恢复。

<Tip>
  如果你在 LangGraph 中使用了 checkpointer，那么持久化执行已经启用。你可以在任意位置暂停并恢复工作流，即便发生中断或失败也可以。
  为了最大化发挥持久化执行的价值，请确保你的工作流被设计为 [确定性的](#determinism-and-consistent-replay) 且 [幂等的](#determinism-and-consistent-replay)，并将任何副作用或非确定性操作封装到 [tasks](/oss/javascript/langgraph/functional-api#task) 中。你可以在 [StateGraph（Graph API）](/oss/javascript/langgraph/graph-api) 与 [Functional API](/oss/javascript/langgraph/functional-api) 中使用 [tasks](/oss/javascript/langgraph/functional-api#task)。
</Tip>

## 要求

要在 LangGraph 中使用持久化执行，你需要：

1. 在工作流中启用 [持久化](/oss/javascript/langgraph/persistence)，通过指定一个会保存工作流进度的 [checkpointer](/oss/javascript/langgraph/persistence#checkpointer-libraries)。

2. 在执行工作流时指定一个 [thread 标识符](/oss/javascript/langgraph/persistence#threads)。它将跟踪该工作流某个实例的执行历史。

3. 将任何非确定性操作（例如随机数生成）或带副作用的操作（例如文件写入、API 调用）封装到 [tasks](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.task.html) 中，以确保当工作流恢复时，这些操作不会在该次运行中被重复执行，而是从持久化层检索其结果。更多信息参见 [确定性与一致回放](#determinism-and-consistent-replay)。

## 确定性与一致回放

当你恢复一次工作流运行时，代码**不会**从停止执行的**同一行代码**继续；相反，它会识别一个合适的 [起点](#starting-points-for-resuming-workflows) 来接续执行。这意味着工作流会从该 [起点](#starting-points-for-resuming-workflows) 回放所有步骤，直到到达之前停止的位置。

因此，当你为持久化执行编写工作流时，必须将任何非确定性操作（例如随机数生成）以及任何带副作用的操作（例如文件写入、API 调用）封装到 [tasks](/oss/javascript/langgraph/functional-api#task) 或 [nodes](/oss/javascript/langgraph/graph-api#nodes) 中。

为确保你的工作流具有确定性并能一致回放，请遵循以下指南：

* **避免重复执行工作**：如果某个 [node](/oss/javascript/langgraph/graph-api#nodes) 包含多个带副作用的操作（例如日志、文件写入或网络调用），请将每个操作封装到独立的 **task** 中。这可以确保当工作流恢复时，这些操作不会被重复执行，而是从持久化层检索其结果。
* **封装非确定性操作**：将任何可能产生非确定性结果的代码（例如随机数生成）封装到 **tasks** 或 **nodes** 中。这保证在恢复后，工作流会按照完全一致的已记录步骤序列与结果继续运行。
* **使用幂等操作**：尽可能确保副作用（例如 API 调用、文件写入）是幂等的。也就是说，当工作流失败后重试该操作时，它产生的效果与第一次执行相同。这对于会写入数据的操作尤为重要。如果某个 **task** 已启动但未成功完成，那么在恢复工作流时会重新运行该 **task**，并依赖已记录的结果来保持一致性。请使用幂等键或验证已存在结果以避免非预期的重复，从而保证工作流执行顺畅且可预测。

关于需要避免的一些陷阱示例，请参阅 Functional API 中的 [常见陷阱](/oss/javascript/langgraph/functional-api#common-pitfalls) 章节，其中展示了如何使用 **tasks** 组织代码来规避这些问题。同样的原则也适用于 [StateGraph（Graph API）](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.StateGraph.html)。

## 持久化级别（Durability modes）

LangGraph 支持三种持久化级别，可根据应用需求在性能与数据一致性之间进行权衡。更高的持久化级别会为工作流执行带来更多开销。你可以在调用任意图执行方法时指定持久化级别：

```typescript  theme={null}
await graph.stream(
  { input: "test" },
  { durability: "sync" }
)
```

持久化级别从低到高如下：

* `"exit"`：LangGraph 仅在图执行退出时（成功、错误，或由于人类介入中断）持久化变更。这为长时间运行的图提供最佳性能，但意味着中间状态不会保存，因此你无法从执行过程中的系统故障（例如进程崩溃）中恢复。
* `"async"`：LangGraph 在下一步执行的同时异步持久化变更。这在性能与持久化之间提供良好平衡，但存在一个小风险：如果进程在执行期间崩溃，LangGraph 可能来不及写入检查点。
* `"sync"`：LangGraph 在下一步开始之前同步持久化变更。这确保 LangGraph 在继续执行前写入每一个检查点，以牺牲一定性能为代价提供更高的持久性。

## 在节点中使用 tasks

如果某个 [node](/oss/javascript/langgraph/graph-api#nodes) 包含多个操作，你可能会发现：与其将这些操作重构为多个独立节点，不如将每个操作转换为一个 **task** 更容易。

<Tabs>
  <Tab title="原始版">
    ```typescript  theme={null}
    import { StateGraph, StateSchema, GraphNode, START, END, MemorySaver } from "@langchain/langgraph";
    import { v4 as uuidv4 } from "uuid";
    import * as z from "zod";

    // 定义一个 StateSchema 来表示状态
    const State = new StateSchema({
      url: z.string(),
      result: z.string().optional(),
    });
    
    const callApi: GraphNode<typeof State> = async (state) => {
      const response = await fetch(state.url);  // [!code highlight]
      const text = await response.text();
      const result = text.slice(0, 100); // 副作用
      return {
        result,
      };
    };
    
    // 创建 StateGraph 构建器，并为 callApi 函数添加一个节点
    const builder = new StateGraph(State)
      .addNode("callApi", callApi)
      .addEdge(START, "callApi")
      .addEdge("callApi", END);
    
    // 指定一个 checkpointer
    const checkpointer = new MemorySaver();
    
    // 使用 checkpointer 编译图
    const graph = builder.compile({ checkpointer });
    
    // 定义带 thread ID 的 config
    const threadId = uuidv4();
    const config = { configurable: { thread_id: threadId } };
    
    // 调用图
    await graph.invoke({ url: "https://www.example.com" }, config);
    ```
  </Tab>

  <Tab title="使用 task">
    ```typescript  theme={null}
    import { StateGraph, StateSchema, GraphNode, START, END, MemorySaver, task } from "@langchain/langgraph";
    import { v4 as uuidv4 } from "uuid";
    import * as z from "zod";

    // 定义一个 StateSchema 来表示状态
    const State = new StateSchema({
      urls: z.array(z.string()),
      results: z.array(z.string()).optional(),
    });
    
    const makeRequest = task("makeRequest", async (url: string) => {
      const response = await fetch(url);  // [!code highlight]
      const text = await response.text();
      return text.slice(0, 100);
    });
    
    const callApi: GraphNode<typeof State> = async (state) => {
      const requests = state.urls.map((url) => makeRequest(url));  // [!code highlight]
      const results = await Promise.all(requests);
      return {
        results,
      };
    };
    
    // 创建 StateGraph 构建器，并为 callApi 函数添加一个节点
    const builder = new StateGraph(State)
      .addNode("callApi", callApi)
      .addEdge(START, "callApi")
      .addEdge("callApi", END);
    
    // 指定一个 checkpointer
    const checkpointer = new MemorySaver();
    
    // 使用 checkpointer 编译图
    const graph = builder.compile({ checkpointer });
    
    // 定义带 thread ID 的 config
    const threadId = uuidv4();
    const config = { configurable: { thread_id: threadId } };
    
    // 调用图
    await graph.invoke({ urls: ["https://www.example.com"] }, config);
    ```
  </Tab>
</Tabs>

## 恢复工作流

当你在工作流中启用持久化执行后，可以在以下场景中恢复执行：

* **暂停与恢复工作流**：使用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 函数在特定点暂停工作流，并使用 [`Command`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.Command.html) 原语携带更新后的状态来恢复。详见 [**Interrupts**](/oss/javascript/langgraph/interrupts)。
* **从失败中恢复**：在异常发生后（例如 LLM 供应商中断），自动从最后一次成功的检查点恢复工作流。这需要使用相同的 thread 标识符再次执行工作流，并将输入值设为 `null`（Functional API 的示例见此 [示例](/oss/javascript/langgraph/use-functional-api#resuming-after-an-error)）。

## 恢复工作流的起点

* 如果你使用的是 [StateGraph（Graph API）](/oss/javascript/langgraph/graph-api)，起点是停止执行的 [**node**](/oss/javascript/langgraph/graph-api#nodes) 的开头。
* 如果你在某个节点内部调用子图，那么起点将是调用该子图且被中止的**父**节点。
  在子图内部，起点将是停止执行的具体 [**node**](/oss/javascript/langgraph/graph-api#nodes)。
* 如果你使用的是 Functional API，起点是停止执行的 [**entrypoint**](/oss/javascript/langgraph/functional-api#entrypoint) 的开头。

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/durable-execution.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将 [这些文档](/use-these-docs) 连接到 Claude、VSCode 等，以获取实时答案。
</Callout>
