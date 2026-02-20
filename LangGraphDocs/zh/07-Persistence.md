> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# 持久化

LangGraph 内置了一层持久化机制，通过 checkpointer（检查点保存器）实现。当你在编译图时配置了 checkpointer，checkpointer 会在每个 super-step（超步）保存一次图状态的 `checkpoint`（检查点）。这些检查点会被保存到一个 `thread`（线程）中，并且在图执行之后仍可访问。由于 `thread` 允许在执行后访问图的状态，因此包括人类介入（human-in-the-loop）、记忆、时间旅行以及容错等多种强大能力都成为可能。下面将对这些概念逐一展开说明。

<img src="https://qn.huat.xyz/mac/202602201639454.jpg" alt="检查点" data-og-width="2316" width="2316" data-og-height="748" height="748" data-path="oss/images/checkpoints.jpg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=7bb8525bfcd22b3903b3209aa7497f47 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=e8d07fc2899b9a13c7b00eb9b259c3c9 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=46a2f9ed3b131a7c78700711e8c314d6 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=c339bd49757810dad226e1846f066c94 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=8333dfdb9d766363f251132f2dfa08a1 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints.jpg?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=33ba13937eed043ba4a7a87b36d3046f 2500w" />

<Info>
  **Agent Server 会自动处理检查点**
  使用 [Agent Server](/langsmith/agent-server) 时，你无需手动实现或配置 checkpointer。Server 会在幕后为你处理所有持久化基础设施。
</Info>

## Threads

thread 是一个唯一 ID（线程标识符），由 checkpointer 为其保存的每个检查点赋值。它包含一系列 [运行（runs）](/langsmith/assistants#execution) 的累积状态。当某次运行被执行时，助手底层图的 [状态（state）](/oss/javascript/langgraph/graph-api#state) 会被持久化到该 thread。

当使用 checkpointer 调用图时，你**必须**在配置的 `configurable` 部分指定 `thread_id`：

```typescript  theme={null}
{
  configurable: {
    thread_id: "1";
  }
}
```

thread 的当前与历史状态都可以被检索。要持久化状态，必须在执行一次运行之前创建 thread。LangSmith API 提供了多个用于创建与管理 thread 及其状态的端点。更多细节请参阅 [API 参考](https://reference.langchain.com/python/langsmith/)。

checkpointer 使用 `thread_id` 作为存储与检索检查点的主键。没有它，checkpointer 就无法保存状态，也无法在发生 [中断（interrupt）](/oss/javascript/langgraph/interrupts) 后恢复执行，因为 checkpointer 需要用 `thread_id` 来加载已保存的状态。

## Checkpoints

thread 在某一时间点的状态称为 checkpoint（检查点）。检查点是在每个 super-step 保存的图状态快照，并以 `StateSnapshot` 对象表示，包含以下关键属性：

* `config`：与该检查点关联的配置。
* `metadata`：与该检查点关联的元数据。
* `values`：此时刻各状态通道（state channel）的值。
* `next`：一个元组，表示图中接下来要执行的节点名称。
* `tasks`：一个由 `PregelTask` 对象组成的元组，包含待执行的下一批任务的信息。如果该 step 之前曾尝试执行，则会包含错误信息。如果图是在某个节点内部 [动态](/oss/javascript/langgraph/interrupts#pause-using-interrupt) 中断的，则 tasks 还会包含与中断相关的额外数据。

检查点会被持久化，并可用于在之后恢复 thread 的状态。

下面通过一个简单图的调用来看看会保存哪些检查点：

```typescript  theme={null}
import { StateGraph, StateSchema, ReducedValue, START, END, MemorySaver } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({
  foo: z.string(),
  bar: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      inputSchema: z.array(z.string()),
      reducer: (x, y) => x.concat(y),
    }
  ),
});

const workflow = new StateGraph(State)
  .addNode("nodeA", (state) => {
    return { foo: "a", bar: ["a"] };
  })
  .addNode("nodeB", (state) => {
    return { foo: "b", bar: ["b"] };
  })
  .addEdge(START, "nodeA")
  .addEdge("nodeA", "nodeB")
  .addEdge("nodeB", END);

const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });

const config = { configurable: { thread_id: "1" } };
await graph.invoke({ foo: "", bar: [] }, config);
```

运行该图后，我们预计会看到恰好 4 个检查点：

* 空检查点，下一步要执行的节点为 [`START`](https://reference.langchain.com/javascript/variables/_langchain_langgraph.index.START.html)
* 包含用户输入 `{'foo': '', 'bar': []}` 的检查点，下一步要执行的节点为 `nodeA`
* 包含 `nodeA` 输出 `{'foo': 'a', 'bar': ['a']}` 的检查点，下一步要执行的节点为 `nodeB`
* 包含 `nodeB` 输出 `{'foo': 'b', 'bar': ['a', 'b']}` 的检查点，并且没有后续节点需要执行

注意，`bar` 通道的值包含来自两个节点的输出，因为我们为 `bar` 通道定义了 reducer。

### 获取状态（Get state）

当与已保存的图状态交互时，你**必须**指定一个 [thread 标识符](#threads)。你可以通过调用 `graph.getState(config)` 查看图的*最新*状态。该方法会返回一个 `StateSnapshot` 对象，它对应于 config 中提供的 thread ID 所关联的最新检查点；或者如果你为该 thread 指定了 checkpoint ID，则返回对应检查点的 `StateSnapshot`。

```typescript  theme={null}
// 获取最新状态快照
const config = { configurable: { thread_id: "1" } };
await graph.getState(config);

// 获取某个特定 checkpoint_id 的状态快照
const config = {
  configurable: {
    thread_id: "1",
    checkpoint_id: "1ef663ba-28fe-6528-8002-5a559208592c",
  },
};
await graph.getState(config);
```

在本示例中，`getState` 的输出如下所示：

```
StateSnapshot {
  values: { foo: 'b', bar: ['a', 'b'] },
  next: [],
  config: {
    configurable: {
      thread_id: '1',
      checkpoint_ns: '',
      checkpoint_id: '1ef663ba-28fe-6528-8002-5a559208592c'
    }
  },
  metadata: {
    source: 'loop',
    writes: { nodeB: { foo: 'b', bar: ['b'] } },
    step: 2
  },
  createdAt: '2024-08-29T19:19:38.821749+00:00',
  parentConfig: {
    configurable: {
      thread_id: '1',
      checkpoint_ns: '',
      checkpoint_id: '1ef663ba-28f9-6ec4-8001-31981c2c39f8'
    }
  },
  tasks: []
}
```

### 获取状态历史（Get state history）

你可以通过调用 `graph.getStateHistory(config)` 获取给定 thread 的完整图执行历史。该方法会返回一个与 config 中 thread ID 关联的 `StateSnapshot` 对象列表。重要的是，这些检查点会按时间顺序排序，列表中的第一个元素是最新的检查点 / `StateSnapshot`。

```typescript  theme={null}
const config = { configurable: { thread_id: "1" } };
for await (const state of graph.getStateHistory(config)) {
  console.log(state);
}
```

在本示例中，`getStateHistory` 的输出如下所示：

```
[
  StateSnapshot {
    values: { foo: 'b', bar: ['a', 'b'] },
    next: [],
    config: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28fe-6528-8002-5a559208592c'
      }
    },
    metadata: {
      source: 'loop',
      writes: { nodeB: { foo: 'b', bar: ['b'] } },
      step: 2
    },
    createdAt: '2024-08-29T19:19:38.821749+00:00',
    parentConfig: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f9-6ec4-8001-31981c2c39f8'
      }
    },
    tasks: []
  },
  StateSnapshot {
    values: { foo: 'a', bar: ['a'] },
    next: ['nodeB'],
    config: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f9-6ec4-8001-31981c2c39f8'
      }
    },
    metadata: {
      source: 'loop',
      writes: { nodeA: { foo: 'a', bar: ['a'] } },
      step: 1
    },
    createdAt: '2024-08-29T19:19:38.819946+00:00',
    parentConfig: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f4-6b4a-8000-ca575a13d36a'
      }
    },
    tasks: [
      PregelTask {
        id: '6fb7314f-f114-5413-a1f3-d37dfe98ff44',
        name: 'nodeB',
        error: null,
        interrupts: []
      }
    ]
  },
  StateSnapshot {
    values: { foo: '', bar: [] },
    next: ['node_a'],
    config: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f4-6b4a-8000-ca575a13d36a'
      }
    },
    metadata: {
      source: 'loop',
      writes: null,
      step: 0
    },
    createdAt: '2024-08-29T19:19:38.817813+00:00',
    parentConfig: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f0-6c66-bfff-6723431e8481'
      }
    },
    tasks: [
      PregelTask {
        id: 'f1b14528-5ee5-579c-949b-23ef9bfbed58',
        name: 'node_a',
        error: null,
        interrupts: []
      }
    ]
  },
  StateSnapshot {
    values: { bar: [] },
    next: ['__start__'],
    config: {
      configurable: {
        thread_id: '1',
        checkpoint_ns: '',
        checkpoint_id: '1ef663ba-28f0-6c66-bfff-6723431e8481'
      }
    },
    metadata: {
      source: 'input',
      writes: { foo: '' },
      step: -1
    },
    createdAt: '2024-08-29T19:19:38.816205+00:00',
    parentConfig: null,
    tasks: [
      PregelTask {
        id: '6d27aa2e-d72b-5504-a36f-8620e54a76dd',
        name: '__start__',
        error: null,
        interrupts: []
      }
    ]
  }
]
```

<img src="https://qn.huat.xyz/mac/202602201639933.jpg" alt="状态" data-og-width="2692" width="2692" data-og-height="1056" height="1056" data-path="oss/images/get_state.jpg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=e932acac5021614d0eb99b90e54be004 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=2eaf153fd49ba728e1d679c12bb44b6f 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=0ac091c7dbe8b1f0acff97615a3683ee 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=9921a482f1c4f86316fca23a5150b153 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=9412cd906f6d67a9fe1f50a5d4f4c674 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/get_state.jpg?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=ccc5118ed85926bda3715c81ce728fcc 2500w" />

### 回放（Replay）

你也可以回放之前的图执行。如果我们在 `invoke` 图时同时提供 `thread_id` 与 `checkpoint_id`，那么系统会在对应 `checkpoint_id` 的检查点之前，*回放*之前已执行过的步骤，并且只执行检查点之后的步骤。

* `thread_id` 是 thread 的 ID。
* `checkpoint_id` 是一个标识符，用于引用某个 thread 内的特定检查点。

调用图时必须在 config 的 `configurable` 部分传入它们：

```typescript  theme={null}
const config = {
  configurable: {
    thread_id: "1",
    checkpoint_id: "0c62ca34-ac19-445d-bbb0-5b4984975b2a",
  },
};
await graph.invoke(null, config);
```

重要的是，LangGraph 知道某个 step 是否曾经执行过。如果曾经执行过，LangGraph 会对该 step 进行*回放*而不是重新执行——但仅限于提供的 `checkpoint_id` 之前的步骤。所有在 `checkpoint_id` 之后的步骤都会被执行（即创建一个新的分支），即便它们过去也曾执行过。要了解更多有关回放的信息，请参阅这份关于时间旅行的 [操作指南](/oss/javascript/langgraph/use-time-travel)。

<img src="https://qn.huat.xyz/mac/202602201639245.png" alt="回放" data-og-width="2276" width="2276" data-og-height="986" height="986" data-path="oss/images/re_play.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=280&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=627d1fb4cb0ce3e5734784cc4a841cca 280w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=560&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=ab462e9559619778d1bdfced578ee0ba 560w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=840&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=7cc304a2a0996e22f783e9a5f7a69f89 840w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=1100&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=b322f66ef96d6734dcac38213104f080 1100w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=1650&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=922f1b014b33fae4fda1e576d57a9983 1650w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/re_play.png?w=2500&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=efae9196c69a2908846c9d23ad117a90 2500w" />

### 更新状态（Update state）

除了从特定 `checkpoints` 回放图之外，我们还可以*编辑*图状态。我们通过 `graph.updateState()` 来实现。该方法接受三个不同的参数：

#### `config`

config 应包含 `thread_id`，以指定要更新哪个 thread。当只传入 `thread_id` 时，我们会更新（或 fork）当前状态。可选地，如果还包含 `checkpoint_id` 字段，则会从选定检查点进行 fork。

#### `values`

这些值将用于更新状态。注意，该更新会被当作“来自某个节点的更新”来处理。这意味着：如果图状态中的某些通道定义了 [reducer](/oss/javascript/langgraph/graph-api#reducers) 函数，这些值会传入 reducer。也就是说，[`update_state`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#updateState) 并不会自动覆盖每个通道的值；它只会覆盖那些没有 reducer 的通道。下面通过示例说明。

假设你为图状态定义了如下模式（见上方完整示例）：

```typescript  theme={null}
import { StateSchema, ReducedValue } from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  foo: z.number(),
  bar: new ReducedValue(
    z.array(z.string()).default(() => []),
    {
      inputSchema: z.array(z.string()),
      reducer: (x, y) => x.concat(y),
    }
  ),
});
```

再假设图的当前状态为：

```typescript  theme={null}
{ foo: 1, bar: ["a"] }
```

如果你按如下方式更新状态：

```typescript  theme={null}
await graph.updateState(config, { foo: 2, bar: ["b"] });
```

那么图的新状态将变为：

```typescript  theme={null}
{ foo: 2, bar: ["a", "b"] }
```

`foo` 键（通道）被完全替换（因为该通道没有定义 reducer，因此 `updateState` 会覆盖它）。而 `bar` 键定义了 reducer，因此它会将 `"b"` 追加到 `bar` 的状态中。

#### `as_node`

调用 `updateState` 时，最后一个可选参数是 `asNode`。如果提供它，该更新会被当作来自节点 `asNode` 的更新来应用。如果未提供 `asNode`，在不产生歧义的情况下，它将被设置为最后一个更新状态的节点。之所以重要，是因为接下来要执行哪些步骤取决于最后一个产生更新的节点，因此你可以用它控制下一个将执行的节点。要了解更多关于 fork 状态的信息，请参阅这份关于时间旅行的 [操作指南](/oss/javascript/langgraph/use-time-travel)。

<img src="https://qn.huat.xyz/mac/202602201639747.jpg" alt="更新" data-og-width="3705" width="3705" data-og-height="2598" height="2598" data-path="oss/images/checkpoints_full_story.jpg" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=06de1669d4d62f0e8013c4ffef021437 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=b149bed4f842c4f179e55247a426befe 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=58cfc0341a77e179ce443a89d667784c 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=29776799d5a22c3aec7d4a45f675ba14 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=5600d9dd7c52dda79e4eb240c344f84a 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/checkpoints_full_story.jpg?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=e428c9c4fc060579c0b7fead1d4a54cb 2500w" />

## 记忆存储（Memory store）

<img src="https://qn.huat.xyz/mac/202602201639047.png" alt="共享状态模型" data-og-width="1482" width="1482" data-og-height="777" height="777" data-path="oss/images/shared_state.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=280&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=1965b83f077aea6301b95b59a9a1e318 280w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=560&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=02898a7498e355e04919ac4121678179 560w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=840&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=4ef92e64d1151922511c78afde7abdca 840w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=1100&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=abddd799a170aa9af9145574e46cff6f 1100w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=1650&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=14025324ecb0c462ee1919033d2ae9c5 1650w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/shared_state.png?w=2500&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=a4f7989c4392a7ba8160f559d6fd8942 2500w" />

[状态模式（state schema）](/oss/javascript/langgraph/graph-api#schema) 指定了一组 key，会在图执行过程中逐步被填充。如上所述，checkpointer 可以在每个图 step 将状态写入 thread，从而实现状态持久化。

但是，如果我们希望在 *thread 之间* 保留一些信息该怎么办？考虑一个聊天机器人场景：我们希望在用户与该机器人进行的*所有*聊天会话（即不同 threads）中，都保留该用户的某些特定信息！

仅靠 checkpointer，我们无法跨 thread 共享信息。这就引出了 [`Store`](https://reference.langchain.com/python/langgraph/store/) 接口的需求。举例来说，我们可以定义一个 `InMemoryStore`，用于跨 threads 存储某个用户的信息。我们像之前一样在编译图时配置 checkpointer，并额外传入 store。

<Info>
  **LangGraph API 会自动处理 store**
  使用 LangGraph API 时，你无需手动实现或配置 store。API 会在幕后为你处理所有存储基础设施。
</Info>

<Note>
  [InMemoryStore](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.InMemoryStore.html) 适用于开发与测试。生产环境中，请使用持久化存储，例如 `PostgresStore` 或 `RedisStore`。所有实现都扩展自 [BaseStore](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.BaseStore.html)，它也是在节点函数签名中应使用的类型注解。
</Note>

### 基本用法

首先，我们在不使用 LangGraph 的情况下单独演示：

```typescript  theme={null}
import { MemoryStore } from "@langchain/langgraph";

const memoryStore = new MemoryStore();
```

记忆（memory）按一个 `tuple` 进行命名空间划分。在这个例子中命名空间为 `(<user_id>, "memories")`。命名空间可以是任意长度并代表任何含义，不一定必须与用户相关。

```typescript  theme={null}
const userId = "1";
const namespaceForMemory = [userId, "memories"];
```

我们使用 `store.put` 方法将记忆保存到 store 中的命名空间。调用时需要指定命名空间以及记忆的键值对：key 只是该记忆的唯一标识符（`memory_id`），value（一个字典）则是记忆本身。

```typescript  theme={null}
import { v4 as uuidv4 } from "uuid";

const memoryId = uuidv4();
const memory = { food_preference: "我喜欢披萨" };
await memoryStore.put(namespaceForMemory, memoryId, memory);
```

我们可以使用 `store.search` 方法读取命名空间中的记忆，它会以列表形式返回给定用户的所有记忆。列表中最后一个元素是最新的记忆。

```typescript  theme={null}
const memories = await memoryStore.search(namespaceForMemory);
memories[memories.length - 1];

// {
//   value: { food_preference: 'I like pizza' },
//   key: '07e0caf4-1631-47b7-b15f-65515d4c1843',
//   namespace: ['1', 'memories'],
//   createdAt: '2024-10-02T17:22:31.590602+00:00',
//   updatedAt: '2024-10-02T17:22:31.590605+00:00'
// }
```

该对象包含以下属性：

* `value`：该记忆的值

* `key`：该命名空间内该记忆的唯一 key

* `namespace`：字符串元组，表示该记忆类型的命名空间

  <Note>
    尽管类型是 `tuple`，但在转换为 JSON 时可能会被序列化为列表（例如 `['1', 'memories']`）。
  </Note>

* `createdAt`：该记忆创建时的时间戳

* `updatedAt`：该记忆更新时的时间戳

### 语义搜索（Semantic search）

除了简单检索，store 还支持语义搜索，使你能够基于“含义”而不是精确匹配来查找记忆。要启用它，请使用嵌入模型配置 store：

```typescript  theme={null}
import { OpenAIEmbeddings } from "@langchain/openai";

const store = new InMemoryStore({
  index: {
    embeddings: new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
    dims: 1536,
    fields: ["food_preference", "$"], // 要进行嵌入的字段
  },
});
```

现在在搜索时，你可以使用自然语言查询来找到相关记忆：

```typescript  theme={null}
// 查找与食物偏好相关的记忆
// （这可以在将记忆写入 store 之后进行）
const memories = await store.search(namespaceForMemory, {
  query: "用户喜欢吃什么？",
  limit: 3, // 返回前 3 条匹配结果
});
```

你可以通过配置 `fields` 参数来控制记忆中哪些部分会被嵌入；或者在存储记忆时通过指定 `index` 参数来控制：

```typescript  theme={null}
// 存储时指定要进行嵌入的字段
await store.put(
  namespaceForMemory,
  uuidv4(),
  {
    food_preference: "我喜欢意大利菜",
    context: "在讨论晚餐计划",
  },
  { index: ["food_preference"] } // 只对 "food_preferences" 字段做嵌入
);

// 存储时不做嵌入（仍可检索，但不可用于语义搜索）
await store.put(
  namespaceForMemory,
  uuidv4(),
  { system_info: "最后更新：2024-01-01" },
  { index: false }
);
```

### 在 LangGraph 中使用

完成上述准备后，我们在 LangGraph 中使用 `memoryStore`。`memoryStore` 与 checkpointer 协同工作：checkpointer 将状态保存到 threads（如上所述），而 `memoryStore` 让我们能够存储任意信息，从而在 *thread 之间* 访问。我们在编译图时同时传入 checkpointer 与 `memoryStore`：

```typescript  theme={null}
import { MemorySaver } from "@langchain/langgraph";

// 需要它来启用 threads（会话）
const checkpointer = new MemorySaver();

// ... 定义图 ...

// 在编译图时传入 checkpointer 与 store
const graph = workflow.compile({ checkpointer, store: memoryStore });
```

我们像之前一样使用 `thread_id` 调用图，并同时传入一个 `user_id`，用于将记忆命名空间绑定到该用户（如上所示）。

```typescript  theme={null}
// 调用图
const userId = "1";
const config = { configurable: { thread_id: "1" }, context: { userId } };

// 首先对 AI 打个招呼
for await (const update of await graph.stream(
  { messages: [{ role: "user", content: "你好" }] },
  { ...config, streamMode: "updates" }
)) {
  console.log(update);
}
```

你可以在*任意节点*通过 `runtime` 参数访问 store 与 `userId`。下面演示如何使用它保存记忆：

```typescript  theme={null}
import { StateSchema, MessagesValue, Runtime } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";

const MessagesState = new StateSchema({
  messages: MessagesValue,
});

const updateMemory: GraphNode<typeof MessagesState> = async (state, runtime) => {
  // 从 config 中获取 user id
  const userId = runtime.context?.user_id;
  if (!userId) throw new Error("需要 User ID");

  // 记忆命名空间
  const namespace = [userId, "memories"];

  // ... 分析对话并创建一条新记忆
  const memory = "一些记忆内容";

  // 创建新的 memory ID
  const memoryId = uuidv4();

  // 写入一条新记忆
  await runtime.store?.put(namespace, memoryId, { memory });
};
```

如上所示，我们也可以在任意节点访问 store，并使用 `store.search` 方法获取记忆。回想一下，返回的记忆是对象列表，这些对象可以转换为字典。

```typescript  theme={null}
memories[memories.length - 1];
// {
//   value: { food_preference: 'I like pizza' },
//   key: '07e0caf4-1631-47b7-b15f-65515d4c1843',
//   namespace: ['1', 'memories'],
//   createdAt: '2024-10-02T17:22:31.590602+00:00',
//   updatedAt: '2024-10-02T17:22:31.590605+00:00'
// }
```

我们可以访问这些记忆并把它们用到模型调用中。

```typescript  theme={null}
const callModel: GraphNode<typeof MessagesState> = async (state, runtime) => {
  // 从 config 中获取 user id
  const userId = runtime.context?.user_id;

  // 记忆命名空间
  const namespace = [userId, "memories"];

  // 根据最新消息进行检索
  const memories = await runtime.store?.search(namespace, {
    query: state.messages[state.messages.length - 1].content,
    limit: 3,
  });
  const info = memories.map((d) => d.value.memory).join("\n");

  // ... 在模型调用中使用记忆
};
```

如果我们创建一个新的 thread，只要 `user_id` 相同，仍然可以访问同一批记忆。

```typescript  theme={null}
// 调用图
const config = { configurable: { thread_id: "2" }, context: { userId: "1" } };

// 再次对 AI 打招呼
for await (const update of await graph.stream(
  { messages: [{ role: "user", content: "你好，告诉我我的记忆里有什么" }] },
  { ...config, streamMode: "updates" }
)) {
  console.log(update);
}
```

当你使用 LangSmith（本地，例如 [Studio](/langsmith/studio)；或 [由 LangSmith 托管](/langsmith/platform-setup)）时，默认就可以使用 base store，并且在编译图时无需显式指定。但如果要启用语义搜索，你**确实**需要在 `langgraph.json` 文件中配置索引设置。例如：

```json  theme={null}
{
    ...
    "store": {
        "index": {
            "embed": "openai:text-embeddings-3-small",
            "dims": 1536,
            "fields": ["$"]
        }
    }
}
```

更多细节与配置选项请参阅 [部署指南](/langsmith/semantic-search)。

## Checkpointer 库

在底层，检查点由符合 [`BaseCheckpointSaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.BaseCheckpointSaver.html) 接口的 checkpointer 对象提供支持。LangGraph 提供多种 checkpointer 实现，它们都以独立可安装的库形式提供：

* `@langchain/langgraph-checkpoint`：checkpointer saver 的基础接口（[`BaseCheckpointSaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.BaseCheckpointSaver.html)）以及序列化/反序列化接口（[`SerializerProtocol`](https://reference.langchain.com/javascript/interfaces/_langchain_langgraph-checkpoint.SerializerProtocol.html)）。其中包含用于实验的内存 checkpointer 实现（[`MemorySaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.MemorySaver.html)）。LangGraph 默认包含 `@langchain/langgraph-checkpoint`。
* `@langchain/langgraph-checkpoint-sqlite`：使用 SQLite 数据库的 LangGraph checkpointer 实现（[`SqliteSaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint-sqlite.SqliteSaver.html)）。适合实验与本地工作流。需要单独安装。
* `@langchain/langgraph-checkpoint-postgres`：使用 Postgres 数据库的高级 checkpointer（[`PostgresSaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint-postgres.index.PostgresSaver.html)），LangSmith 也使用该实现。适合生产环境使用。需要单独安装。
* `@langchain/langgraph-checkpoint-mongodb`：使用 MongoDB 数据库的高级 checkpointer（@\[`MongoDBSaver`])。适合生产环境使用。需要单独安装。
* `@langchain/langgraph-checkpoint-redis`：使用 Redis 数据库的高级 checkpointer（@\[`RedisSaver`])。适合生产环境使用。需要单独安装。

### Checkpointer 接口

每个 checkpointer 都符合 [`BaseCheckpointSaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.BaseCheckpointSaver.html) 接口，并实现以下方法：

* `.put` - 存储一个检查点及其配置与元数据。
* `.putWrites` - 存储与某个检查点关联的中间写入（即 [pending writes](#pending-writes)）。
* `.getTuple` - 针对给定配置（`thread_id` 与 `checkpoint_id`）获取检查点元组。该方法用于在 `graph.getState()` 中填充 `StateSnapshot`。
* `.list` - 列出匹配给定配置与过滤条件的检查点。该方法用于在 `graph.getStateHistory()` 中填充状态历史。

## 能力

### 人类介入（Human-in-the-loop）

首先，checkpointer 通过允许人类检查、中断并批准图步骤，从而支持 [人类介入工作流](/oss/javascript/langgraph/interrupts)。这些工作流需要 checkpointer，因为人类必须能够在任意时间点查看图状态，并且图也必须能够在人工对状态做出更新后恢复执行。示例请参阅 [操作指南](/oss/javascript/langgraph/interrupts)。

### 记忆（Memory）

其次，checkpointer 支持交互之间的“[记忆](/oss/javascript/concepts/memory)”。在重复的人类交互（如对话）场景中，后续消息可以发送到同一 thread，从而保留此前的记忆。关于如何使用 checkpointer 添加与管理对话记忆，请参阅 [添加记忆](/oss/javascript/langgraph/add-memory)。

### 时间旅行（Time travel）

第三，checkpointer 支持“[时间旅行](/oss/javascript/langgraph/use-time-travel)”，允许用户回放之前的图执行以审阅和/或调试特定图步骤。此外，checkpointer 也使得在任意检查点 fork 图状态成为可能，以探索替代轨迹。

### 容错（Fault-tolerance）

最后，检查点还提供容错与错误恢复：如果在某个 superstep 一个或多个节点失败，你可以从最后一次成功的 step 重启图。此外，当某个图节点在某个 superstep 的执行过程中失败时，LangGraph 会存储在该 superstep 内其他成功完成节点的 pending checkpoint writes，从而使得当我们从该 superstep 恢复图执行时，不会重新运行那些已成功的节点。

#### Pending writes

此外，当某个图节点在某个 superstep 的执行过程中失败时，LangGraph 会存储在该 superstep 内其他成功完成节点的 pending checkpoint writes，从而使得当我们从该 superstep 恢复图执行时，不会重新运行那些已成功的节点。

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/persistence.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将 [这些文档](/use-these-docs) 连接到 Claude、VSCode 等，以获取实时答案。
</Callout>
