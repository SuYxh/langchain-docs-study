> ## 文档索引
> 在此获取完整的文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用该文件发现所有可用页面。

# 使用时间旅行

在处理会做出基于模型的决策的非确定性系统时（例如，由大语言模型驱动的智能体），深入审视其决策过程往往很有帮助：

1. <Icon icon="bulb" size={16} /> **理解推理过程**：分析导致成功结果的步骤。
2. <Icon icon="bug" size={16} /> **调试错误**：识别错误发生的位置与原因。
3. <Icon icon="search" size={16} /> **探索替代方案**：测试不同路径，以发现更优解。

LangGraph 提供时间旅行（time-travel）功能来支持这些用例。具体而言，你可以从先前的检查点恢复执行——既可以回放相同状态，也可以修改状态以探索替代方案。在所有情况下，从过去恢复执行都会在历史中产生一个新的分叉。

在 LangGraph 中使用时间旅行：

1. 使用 [`invoke`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#invoke) 或 [`stream`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#stream) 方法，以初始输入来[运行图](#1-run-the-graph)。
2. [在现有线程中识别一个检查点](#2-identify-a-checkpoint)：使用 [`getStateHistory`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#getStateHistory) 方法，检索特定 `thread_id` 的执行历史，并定位所需的 `checkpoint_id`。
   或者，在你希望执行暂停的节点之前设置一个[断点](/oss/javascript/langgraph/interrupts)。然后，你可以找到截至该断点记录的最新检查点。
3. [更新图状态（可选）](#3-update-the-state-optional)：使用 [`updateState`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#updateState) 方法，在检查点处修改图的状态，并从替代状态恢复执行。
4. [从检查点恢复执行](#4-resume-execution-from-the-checkpoint)：使用 `invoke` 或 `stream` 方法，传入 `null` 作为输入，并在配置中包含正确的 `thread_id` 与 `checkpoint_id`。

## 在工作流中

本示例构建了一个简单的 LangGraph 工作流：先生成一个笑话主题，再使用大语言模型写一个笑话。它演示了如何运行图、检索过去执行的检查点、可选地修改状态，以及从选定检查点恢复执行以探索不同结果。

### 设置

要在本示例中构建该工作流，你需要配置 Anthropic 大语言模型并安装所需依赖：

1. 安装依赖

<CodeGroup>
  ```bash npm theme={null}
  npm install @langchain/langgraph @langchain/core
  ```

  ```bash pnpm theme={null}
  pnpm add @langchain/langgraph @langchain/core
  ```

  ```bash yarn theme={null}
  yarn add @langchain/langgraph @langchain/core
  ```

  ```bash bun theme={null}
  bun add @langchain/langgraph @langchain/core
  ```
</CodeGroup>

2. 初始化大语言模型：

```typescript  theme={null}
import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  apiKey: "<your_anthropic_key>"
});
```

<Tip>
  注册 [LangSmith](https://smith.langchain.com)，以便快速发现问题并提升 LangGraph 项目的性能。LangSmith 允许你使用追踪（trace）数据来调试、测试并监控基于 LangGraph 构建的大语言模型应用。你也可以[从 LangSmith 拉取 traces](/langsmith/export-traces#fetch-a-single-run-by-id)，以在本地回放并调试生产问题。
</Tip>

3. 实现工作流
   该工作流的实现是一个包含两个节点的简单图：一个用于生成笑话主题，另一个用于编写笑话本身，并使用一个状态来存储中间值。

```typescript  theme={null}
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";
import { StateGraph, StateSchema, GraphNode, START, END, MemorySaver } from "@langchain/langgraph";
import { ChatAnthropic } from "@langchain/anthropic";

const State = new StateSchema({
  topic: z.string().optional(),
  joke: z.string().optional(),
});

const model = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  temperature: 0,
});

const generateTopic: GraphNode<typeof State> = async (state) => {
  // 调用大语言模型生成笑话主题
  const msg = await model.invoke("给我一个有趣的笑话主题");
  return { topic: msg.content };
};

const writeJoke: GraphNode<typeof State> = async (state) => {
  // 调用大语言模型基于主题写一个笑话
  const msg = await model.invoke(`写一个关于 ${state.topic} 的简短笑话`);
  return { joke: msg.content };
};

// 构建工作流
const workflow = new StateGraph(State)
  // 添加节点
  .addNode("generateTopic", generateTopic)
  .addNode("writeJoke", writeJoke)
  // 添加边以连接节点
  .addEdge(START, "generateTopic")
  .addEdge("generateTopic", "writeJoke")
  .addEdge("writeJoke", END);

// 编译
const checkpointer = new MemorySaver();
const graph = workflow.compile({ checkpointer });
```

### 1. 运行图

要启动该工作流，调用 [`invoke`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#invoke) 且不传入任何输入。注意 `thread_id`：它用于追踪本次执行并在之后检索对应的检查点。

```typescript  theme={null}
const config = {
  configurable: {
    thread_id: uuidv4(),
  },
};

const state = await graph.invoke({}, config);

console.log(state.topic);
console.log();
console.log(state.joke);
```

**输出：**

```
不如来个《烘干机里袜子的秘密生活》？我们可以探讨一个神秘现象：袜子成双进入洗衣机，却常常单只出来。它们去哪儿了？是不是在别处开始了新生活？有没有我们不知道的“袜子天堂”？这个日常谜题把大家都联系在一起，喜剧潜力巨大！

# 烘干机里袜子的秘密生活

我终于发现了烘干机之后那些“失踪”的袜子都去哪儿了。结果它们根本没丢——只是跟洗衣房里别人的袜子私奔了，去一起开始新生活。

我的蓝色菱格袜现在跟一只红色波点袜住在百慕大，在 Sockstagram 上晒度假照，还给我寄绒毛当赡养费。
```

### 2. 识别一个检查点

要从图运行的先前位置继续执行，使用 [`get_state_history`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.pregel.Pregel.html#getStateHistory) 检索所有状态，并选择你希望恢复执行的那个状态。

```typescript  theme={null}
// 状态会按时间倒序返回。
const states = [];
for await (const state of graph.getStateHistory(config)) {
  states.push(state);
}

for (const state of states) {
  console.log(state.next);
  console.log(state.config.configurable?.checkpoint_id);
  console.log();
}
```

**输出：**

```
[]
1f02ac4a-ec9f-6524-8002-8f7b0bbeed0e

['writeJoke']
1f02ac4a-ce2a-6494-8001-cb2e2d651227

['generateTopic']
1f02ac4a-a4e0-630d-8000-b73c254ba748

['__start__']
1f02ac4a-a4dd-665e-bfff-e6c8c44315d9
```

```typescript  theme={null}
// 这是倒数第二个状态（states 按时间顺序列出）
const selectedState = states[1];
console.log(selectedState.next);
console.log(selectedState.values);
```

**输出：**

```
['writeJoke']
{'topic': '不如来个《烘干机里袜子的秘密生活》？我们可以探讨一个神秘现象：袜子成双进入洗衣机，却常常单只出来。它们去哪儿了？是不是在别处开始了新生活？有没有我们不知道的“袜子天堂”？这个日常谜题把大家都联系在一起，喜剧潜力巨大！'}
```

<a id="optional" />

### 3. 更新状态（可选）

`updateState` 会创建一个新的检查点。新检查点会关联到同一个线程，但会生成新的检查点 ID。

```typescript  theme={null}
const newConfig = await graph.updateState(selectedState.config, {
  topic: "鸡",
});
console.log(newConfig);
```

**输出：**

```
{'configurable': {'thread_id': 'c62e2e03-c27b-4cb6-8cea-ea9bfedae006', 'checkpoint_ns': '', 'checkpoint_id': '1f02ac4a-ecee-600b-8002-a1d21df32e4c'}}
```

### 4. 从检查点恢复执行

要从所选检查点恢复执行，使用指向新检查点的配置来调用 [`invoke`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.CompiledStateGraph.html#invoke)。

```typescript  theme={null}
await graph.invoke(null, newConfig);
```

**输出：**

```typescript  theme={null}
{
  'topic': '鸡',
  'joke': '为什么鸡要加入乐队？\n\n因为它有很棒的“鼓槌”（鸡腿）！'
}
```

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/use-time-travel.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
