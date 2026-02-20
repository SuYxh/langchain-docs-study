> ## 文档索引
> 在此获取完整的文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用该文件发现所有可用页面。

# 子图

本指南解释如何使用子图的机制。子图是一个[图](/oss/javascript/langgraph/graph-api#graphs)，它在另一个图中作为一个[节点](/oss/javascript/langgraph/graph-api#nodes)被使用。

子图适用于：

* 构建[多智能体系统](/oss/javascript/langchain/multi-agent)
* 在多个图中复用一组节点
* 分布式开发：当你希望不同团队独立开发图的不同部分时，可以将每一部分定义为子图；只要遵守子图接口（输入与输出 schema），父图就可以在不了解子图细节的情况下构建

添加子图时，你需要定义父图与子图如何通信：

* [从节点中调用图](#invoke-a-graph-from-a-node)——从父图的某个节点内部调用子图
* [将图作为节点添加](#add-a-graph-as-a-node)——将子图直接作为父图中的一个节点添加，并与父图**共享[状态键](/oss/javascript/langgraph/graph-api#state)**（state keys）

## 设置

```bash  theme={null}
npm install @langchain/langgraph
```

<Tip>
  **为 LangGraph 开发配置 LangSmith**
  注册 [LangSmith](https://smith.langchain.com)，以便快速发现问题并提升 LangGraph 项目的性能。LangSmith 允许你使用追踪（trace）数据来调试、测试并监控基于 LangGraph 构建的大语言模型应用——关于如何开始使用，请阅读[此处](https://docs.smith.langchain.com)。
</Tip>

## 从节点中调用图

实现子图的一种简单方式是在另一个图的节点内部调用一个图。在这种情况下，子图可以与父图拥有**完全不同的 schema**（不共享键）。例如，在[多智能体](/oss/javascript/langchain/multi-agent)系统中，你可能希望为每个智能体维护一份私有消息历史。

如果你的应用属于这种情况，你需要定义一个**调用子图的节点函数**。该函数在调用子图前需要将（父图）输入 state 转换为子图 state，并在返回节点的 state 更新之前，将子图的结果再转换回父图 state。

```typescript  theme={null}
import { StateGraph, StateSchema, START } from "@langchain/langgraph";
import * as z from "zod";

const SubgraphState = new StateSchema({
  bar: z.string(),
});

// 子图
const subgraphBuilder = new StateGraph(SubgraphState)
  .addNode("subgraphNode1", (state) => {
    return { bar: "你好！" + state.bar };
  })
  .addEdge(START, "subgraphNode1");

const subgraph = subgraphBuilder.compile();

// 父图
const State = new StateSchema({
  foo: z.string(),
});

// 将 state 转换为子图 state，再转换回来
const builder = new StateGraph(State)
  .addNode("node1", async (state) => {
    const subgraphOutput = await subgraph.invoke({ bar: state.foo });
    return { foo: subgraphOutput.bar };
  })
  .addEdge(START, "node1");

const graph = builder.compile();
```

<Accordion title="完整示例：不同的 state schema">
  ```typescript  theme={null}
  import { StateGraph, StateSchema, START } from "@langchain/langgraph";
  import * as z from "zod";

  // 定义子图
  const SubgraphState = new StateSchema({
    // 注意：这些键都不会与父图 state 共享
    bar: z.string(),
    baz: z.string(),
  });

  const subgraphBuilder = new StateGraph(SubgraphState)
    .addNode("subgraphNode1", (state) => {
      return { baz: "baz" };
    })
    .addNode("subgraphNode2", (state) => {
      return { bar: state.bar + state.baz };
    })
    .addEdge(START, "subgraphNode1")
    .addEdge("subgraphNode1", "subgraphNode2");

  const subgraph = subgraphBuilder.compile();

  // 定义父图
  const ParentState = new StateSchema({
    foo: z.string(),
  });

  const builder = new StateGraph(ParentState)
    .addNode("node1", (state) => {
      return { foo: "你好！" + state.foo };
    })
    .addNode("node2", async (state) => {
      const response = await subgraph.invoke({ bar: state.foo });   // [!code highlight]
      return { foo: response.bar };   // [!code highlight]
    })
    .addEdge(START, "node1")
    .addEdge("node1", "node2");

  const graph = builder.compile();

  for await (const chunk of await graph.stream(
    { foo: "foo" },
    { subgraphs: true }
  )) {
    console.log(chunk);
  }
  ```

  1. 将 state 转换为子图 state
  2. 将响应转换回父图 state

  ```
  [[], { node1: { foo: '你好！foo' } }]
  [['node2:9c36dd0f-151a-cb42-cbad-fa2f851f9ab7'], { subgraphNode1: { baz: 'baz' } }]
  [['node2:9c36dd0f-151a-cb42-cbad-fa2f851f9ab7'], { subgraphNode2: { bar: '你好！foobaz' } }]
  [[], { node2: { foo: '你好！foobaz' } }]
  ```
</Accordion>

<Accordion title="完整示例：不同的 state schema（两级子图）">
  这是一个包含两级子图的示例：父图 -> 子图 -> 孙子图。

  ```typescript  theme={null}
  import { StateGraph, StateSchema, START, END } from "@langchain/langgraph";
  import * as z from "zod";

  // 孙子图
  const GrandChildState = new StateSchema({
    myGrandchildKey: z.string(),
  });

  const grandchild = new StateGraph(GrandChildState)
    .addNode("grandchild1", (state) => {
      // 注意：在这里无法访问子图或父图的键
      return { myGrandchildKey: state.myGrandchildKey + "，你好吗" };
    })
    .addEdge(START, "grandchild1")
    .addEdge("grandchild1", END);

  const grandchildGraph = grandchild.compile();

  // 子图
  const ChildState = new StateSchema({
    myChildKey: z.string(),
  });

  const child = new StateGraph(ChildState)
    .addNode("child1", async (state) => {
      // 注意：在这里无法访问父图或孙子图的键
      const grandchildGraphInput = { myGrandchildKey: state.myChildKey };   // [!code highlight]
      const grandchildGraphOutput = await grandchildGraph.invoke(grandchildGraphInput);
      return { myChildKey: grandchildGraphOutput.myGrandchildKey + "，今天怎么样？" };   // [!code highlight]
    })   // [!code highlight]
    .addEdge(START, "child1")
    .addEdge("child1", END);

  const childGraph = child.compile();

  // 父图
  const ParentState = new StateSchema({
    myKey: z.string(),
  });

  const parent = new StateGraph(ParentState)
    .addNode("parent1", (state) => {
      // 注意：在这里无法访问子图或孙子图的键
      return { myKey: "你好 " + state.myKey };
    })
    .addNode("child", async (state) => {
      const childGraphInput = { myChildKey: state.myKey };   // [!code highlight]
      const childGraphOutput = await childGraph.invoke(childGraphInput);
      return { myKey: childGraphOutput.myChildKey };   // [!code highlight]
    })   // [!code highlight]
    .addNode("parent2", (state) => {
      return { myKey: state.myKey + " 再见！" };
    })
    .addEdge(START, "parent1")
    .addEdge("parent1", "child")
    .addEdge("child", "parent2")
    .addEdge("parent2", END);

  const parentGraph = parent.compile();

  for await (const chunk of await parentGraph.stream(
    { myKey: "Bob" },
    { subgraphs: true }
  )) {
    console.log(chunk);
  }
  ```

  1. 将 state 从子图 state 通道（`myChildKey`）转换为孙子图 state 通道（`myGrandchildKey`）
  2. 将 state 从孙子图 state 通道（`myGrandchildKey`）转换回子图 state 通道（`myChildKey`）
  3. 这里传入的是一个函数，而不是仅传入已编译的图（`grandchildGraph`）
  4. 将 state 从父图 state 通道（`myKey`）转换为子图 state 通道（`myChildKey`）
  5. 将 state 从子图 state 通道（`myChildKey`）转换回父图 state 通道（`myKey`）
  6. 这里传入的是一个函数，而不是仅传入已编译的图（`childGraph`）

  ```
  [[], { parent1: { myKey: '你好 Bob' } }]
  [['child:2e26e9ce-602f-862c-aa66-1ea5a4655e3b', 'child1:781bb3b1-3971-84ce-810b-acf819a03f9c'], { grandchild1: { myGrandchildKey: '你好 Bob，你好吗' } }]
  [['child:2e26e9ce-602f-862c-aa66-1ea5a4655e3b'], { child1: { myChildKey: '你好 Bob，你好吗，今天怎么样？' } }]
  [[], { child: { myKey: '你好 Bob，你好吗，今天怎么样？' } }]
  [[], { parent2: { myKey: '你好 Bob，你好吗，今天怎么样？ 再见！' } }]
  ```
</Accordion>

## 将图作为节点添加

当父图与子图可以通过[schema](/oss/javascript/langgraph/graph-api#state)中的共享状态键（通道，channel）进行通信时，你可以将一个图作为另一个图中的[节点](/oss/javascript/langgraph/graph-api#nodes)添加。例如，在[多智能体](/oss/javascript/langchain/multi-agent)系统中，智能体通常通过共享的 [messages](/oss/javascript/langgraph/graph-api#why-use-messages) 键进行通信。

<img src="https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/subgraph.png?fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=c280df5c968cd4237b0b5d03823d8946" alt="SQL 智能体图" style={{ height: "450px" }} data-og-width="1177" width="1177" data-og-height="818" height="818" data-path="oss/images/subgraph.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/subgraph.png?w=280&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=e3d08dae8fb81e15b4d8069a48999eac 280w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/subgraph.png?w=560&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=8d8942031ba051119e0cb772ef697e0b 560w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/subgraph.png?w=840&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=0d5285bd104c542fe660bc09fed53e5e 840w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/subgraph.png?w=1100&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=32bc8ffa0eda13a0f3bb163631774a60 1100w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/subgraph.png?w=1650&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=6a511f3b9dc44383614803d32390875a 1650w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/subgraph.png?w=2500&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=169d55e154e5ea0146a57373235f768e 2500w" />

如果你的子图与父图共享状态键，可以按以下步骤将其添加到你的图中：

1. 定义子图工作流（示例中的 `subgraphBuilder`）并编译
2. 在定义父图工作流时，将已编译的子图传给 `.addNode` 方法

```typescript  theme={null}
import { StateGraph, StateSchema, START } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  foo: z.string(),
});

// 子图
const subgraphBuilder = new StateGraph(State)
  .addNode("subgraphNode1", (state) => {
    return { foo: "你好！" + state.foo };
  })
  .addEdge(START, "subgraphNode1");

const subgraph = subgraphBuilder.compile();

// 父图
const builder = new StateGraph(State)
  .addNode("node1", subgraph)
  .addEdge(START, "node1");

const graph = builder.compile();
```

<Accordion title="完整示例：共享 state schema">
  ```typescript  theme={null}
  import { StateGraph, StateSchema, START } from "@langchain/langgraph";
  import * as z from "zod";

  // 定义子图
  const SubgraphState = new StateSchema({
    foo: z.string(),    // [!code highlight]
    bar: z.string(),    // [!code highlight]
  });

  const subgraphBuilder = new StateGraph(SubgraphState)
    .addNode("subgraphNode1", (state) => {
      return { bar: "bar" };
    })
    .addNode("subgraphNode2", (state) => {
      // 注意：该节点使用了一个只在子图中可用的状态键（'bar'）
      // 并且在共享状态键（'foo'）上发送更新
      return { foo: state.foo + state.bar };
    })
    .addEdge(START, "subgraphNode1")
    .addEdge("subgraphNode1", "subgraphNode2");

  const subgraph = subgraphBuilder.compile();

  // 定义父图
  const ParentState = new StateSchema({
    foo: z.string(),
  });

  const builder = new StateGraph(ParentState)
    .addNode("node1", (state) => {
      return { foo: "你好！" + state.foo };
    })
    .addNode("node2", subgraph)
    .addEdge(START, "node1")
    .addEdge("node1", "node2");

  const graph = builder.compile();

  for await (const chunk of await graph.stream({ foo: "foo" })) {
    console.log(chunk);
  }
  ```

  1. 该键与父图 state 共享
  2. 该键是 `SubgraphState` 私有的，父图不可见

  ```
  { node1: { foo: '你好！foo' } }
  { node2: { foo: '你好！foobar' } }
  ```
</Accordion>

## 添加持久化

你只需要**在编译父图时提供 checkpointer**。LangGraph 会自动将 checkpointer 传播到子图中。

```typescript  theme={null}
import { StateGraph, StateSchema, START, MemorySaver } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  foo: z.string(),
});

// 子图
const subgraphBuilder = new StateGraph(State)
  .addNode("subgraphNode1", (state) => {
    return { foo: state.foo + "bar" };
  })
  .addEdge(START, "subgraphNode1");

const subgraph = subgraphBuilder.compile();

// 父图
const builder = new StateGraph(State)
  .addNode("node1", subgraph)
  .addEdge(START, "node1");

const checkpointer = new MemorySaver();
const graph = builder.compile({ checkpointer });
```

如果你希望子图**拥有它自己的记忆**，可以在编译子图时使用合适的 checkpointer 选项。这在[多智能体](/oss/javascript/langchain/multi-agent)系统中很有用，例如你希望智能体跟踪其内部消息历史：

```typescript  theme={null}
const subgraphBuilder = new StateGraph(...)
const subgraph = subgraphBuilder.compile({ checkpointer: true });
```

## 查看子图 state

当你启用[持久化](/oss/javascript/langgraph/persistence)后，可以通过相应方法[检查图 state](/oss/javascript/langgraph/persistence#checkpoints)（检查点，checkpoint）。要查看子图 state，可以使用 `subgraphs` 选项。

你可以通过 `graph.getState(config)` 检查图 state。要查看子图 state，可以使用 `graph.getState(config, { subgraphs: true })`。

<Note>
  查看子图 state 要求 LangGraph 能够**静态发现**（statically discover）子图——也就是说，子图必须是[作为节点添加](#add-a-graph-as-a-node)的，或是[从节点函数中调用](#invoke-a-graph-from-a-node)的。当子图是在[工具](/oss/javascript/langchain/tools)函数内部或其他间接层（例如 [subagents](/oss/javascript/langchain/multi-agent/subagents) 模式）中被调用时，该功能不会生效。需要注意的是，无论嵌套层级如何，interrupt 仍然会向最顶层图传播。
</Note>

<Accordion title="查看被中断的子图 state">
  ```typescript  theme={null}
  import { StateGraph, StateSchema, START, MemorySaver, interrupt, Command } from "@langchain/langgraph";
  import * as z from "zod";

  const State = new StateSchema({
    foo: z.string(),
  });

  // 子图
  const subgraphBuilder = new StateGraph(State)
    .addNode("subgraphNode1", (state) => {
      const value = interrupt("请提供值：");
      return { foo: state.foo + value };
    })
    .addEdge(START, "subgraphNode1");

  const subgraph = subgraphBuilder.compile();

  // 父图
  const builder = new StateGraph(State)
    .addNode("node1", subgraph)
    .addEdge(START, "node1");

  const checkpointer = new MemorySaver();
  const graph = builder.compile({ checkpointer });

  const config = { configurable: { thread_id: "1" } };

  await graph.invoke({ foo: "" }, config);
  const parentState = await graph.getState(config);
  const subgraphState = (await graph.getState(config, { subgraphs: true })).tasks[0].state;   // [!code highlight]

  // 恢复子图执行
  await graph.invoke(new Command({ resume: "bar" }), config);
  ```
</Accordion>

## 流式输出子图结果

要在流式输出中包含子图输出，你可以在父图的 `stream` 方法中设置 `subgraphs` 选项。这将同时流式输出父图与其子图的结果。

```typescript  theme={null}
for await (const chunk of await graph.stream(
  { foo: "foo" },
  {
    subgraphs: true,   // [!code highlight]
    streamMode: "updates",
  }
)) {
  console.log(chunk);
}
```

1. 设置 `subgraphs: true` 以流式输出子图的结果。

<Accordion title="从子图流式输出">
  ```typescript  theme={null}
  import { StateGraph, StateSchema, START } from "@langchain/langgraph";
  import * as z from "zod";

  // 定义子图
  const SubgraphState = new StateSchema({
    foo: z.string(),
    bar: z.string(),
  });

  const subgraphBuilder = new StateGraph(SubgraphState)
    .addNode("subgraphNode1", (state) => {
      return { bar: "bar" };
    })
    .addNode("subgraphNode2", (state) => {
      // 注意：该节点使用了一个只在子图中可用的状态键（'bar'）
      // 并且在共享状态键（'foo'）上发送更新
      return { foo: state.foo + state.bar };
    })
    .addEdge(START, "subgraphNode1")
    .addEdge("subgraphNode1", "subgraphNode2");

  const subgraph = subgraphBuilder.compile();

  // 定义父图
  const ParentState = new StateSchema({
    foo: z.string(),
  });

  const builder = new StateGraph(ParentState)
    .addNode("node1", (state) => {
      return { foo: "你好！" + state.foo };
    })
    .addNode("node2", subgraph)
    .addEdge(START, "node1")
    .addEdge("node1", "node2");

  const graph = builder.compile();

  for await (const chunk of await graph.stream(
    { foo: "foo" },
    {
      streamMode: "updates",
      subgraphs: true,   // [!code highlight]
    }
  )) {
    console.log(chunk);
  }
  ```

  1. 设置 `subgraphs: true` 以流式输出子图的结果。

  ```
  [[], { node1: { foo: '你好！foo' } }]
  [['node2:e58e5673-a661-ebb0-70d4-e298a7fc28b7'], { subgraphNode1: { bar: 'bar' } }]
  [['node2:e58e5673-a661-ebb0-70d4-e298a7fc28b7'], { subgraphNode2: { foo: '你好！foobar' } }]
  [[], { node2: { foo: '你好！foobar' } }]
  ```
</Accordion>

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/use-subgraphs.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
