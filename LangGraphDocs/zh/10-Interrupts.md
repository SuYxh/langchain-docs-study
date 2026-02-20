> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# 中断（Interrupts）

中断允许你在特定位置暂停图的执行，并在继续之前等待外部输入。这使得在需要外部输入才能继续的场景中，可以实现人类介入（human-in-the-loop）模式。当中断被触发时，LangGraph 会使用其 [持久化](/oss/javascript/langgraph/persistence) 层保存图状态，并无限期等待，直到你恢复执行。

中断的工作方式是在任意图节点中调用 `interrupt()` 函数。该函数接受任意可 JSON 序列化的值，并将其暴露给调用方。当你准备继续时，通过使用 `Command` 重新调用图来恢复执行；此时 `Command` 会成为节点内部 `interrupt()` 调用的返回值。

与静态断点（在特定节点之前或之后暂停）不同，中断是**动态**的——它们可以放置在代码的任意位置，并且可根据你的应用逻辑进行条件触发。

* **Checkpointing 会帮你保留执行位置：**checkpointer 会写入精确的图状态，因此你可以稍后恢复，即便处于错误状态也可以。
* **`thread_id` 是你的指针：**在 `invoke` 方法的 options 中使用 `{ configurable: { thread_id: ... } }`，告诉 checkpointer 应该加载哪份状态。
* **中断载荷会以 `__interrupt__` 暴露：**你传给 `interrupt()` 的值会通过 `__interrupt__` 字段返回给调用方，以便你知道图正在等待什么。

你选择的 `thread_id` 本质上是一个持久化游标。复用它会恢复到同一检查点；使用新的值则会启动一个全新的 thread，并从空状态开始。

## 使用 `interrupt` 暂停

[`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 函数会暂停图执行并向调用方返回一个值。当你在某个节点内调用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 时，LangGraph 会保存当前图状态，并等待你带着输入恢复执行。

要使用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html)，你需要：

1. 一个 **checkpointer** 来持久化图状态（生产环境请使用可持久化的 checkpointer）
2. 在 config 中提供 **thread ID**，以便运行时知道从哪份状态恢复
3. 在你希望暂停的位置调用 `interrupt()`（payload 必须可 JSON 序列化）

```typescript  theme={null}
import { interrupt } from "@langchain/langgraph";

async function approvalNode(state: State) {
    // 暂停并请求批准
    const approved = interrupt("你批准该操作吗？");

    // Command({ resume: ... }) 提供的值会返回到该变量中
    return { approved };
}
```

当你调用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 时，会发生以下事情：

1. **图执行会在调用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 的精确位置被挂起**
2. **状态会被保存**（通过 checkpointer），以便稍后恢复执行。生产环境中，这应当是持久化的 checkpointer（例如由数据库支持）
3. **返回值会在 `__interrupt__` 下返回**给调用方；它可以是任意可 JSON 序列化的值（字符串、对象、数组等）
4. **图会无限期等待**，直到你带着响应恢复执行
5. **恢复时的响应会被传回**节点内部，成为 `interrupt()` 调用的返回值

## 恢复中断

当中断暂停执行后，你可以通过再次调用图并传入包含 resume 值的 `Command` 来恢复。resume 值会被传回 `interrupt` 调用，使节点能够利用外部输入继续执行。

```typescript  theme={null}
import { Command } from "@langchain/langgraph";

// 初次运行：触发 interrupt 并暂停
// thread_id 是回到已保存检查点的持久化指针
const config = { configurable: { thread_id: "thread-1" } };
const result = await graph.invoke({ input: "data" }, config);

// 查看中断内容
// __interrupt__ 会镜像你传给 interrupt() 的每个 payload
console.log(result.__interrupt__);
// [{ value: 'Do you approve this action?', ... }]

// 使用人类的响应恢复
// Command({ resume }) 会把该值作为节点内 interrupt() 的返回值
await graph.invoke(new Command({ resume: true }), config);
```

**关于恢复的关键点：**

* 恢复时必须使用触发中断时使用的**同一个 thread ID**
* `new Command({ resume: ... })` 中传入的值会成为 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 调用的返回值
* 恢复后节点会从触发 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 的那个节点的开头重新开始执行，因此 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 之前的代码会再次运行
* 你可以传入任意可 JSON 序列化的值作为 resume 值

## 常见模式

中断解锁的关键能力是：暂停执行并等待外部输入。这适用于多种用例，包括：

* <Icon icon="circle-check" /> [审批工作流](#approve-or-reject)：在执行关键动作（API 调用、数据库变更、金融交易）之前暂停
* <Icon icon="link" /> [处理多个中断](#handling-multiple-interrupts)：在一次调用中恢复多个中断时，将 interrupt ID 与 resume 值配对
* <Icon icon="pencil" /> [审阅与编辑](#review-and-edit-state)：让人类在继续之前审阅并修改 LLM 输出或工具调用
* <Icon icon="tool" /> [中断工具调用](#interrupts-in-tools)：在执行工具调用前暂停，以便审阅并编辑工具调用，然后再执行
* <Icon icon="shield-check" /> [校验人类输入](#validating-human-input)：在进入下一步之前暂停，以校验人类输入

### 与人类介入（HITL）中断一起流式输出

在构建包含人类介入工作流的交互式智能体时，你可以同时流式输出消息 chunk 与节点更新，从而在处理中断的同时提供实时反馈。

在存在子图时，使用多个 stream mode（`"messages"` 与 `"updates"`）并设置 `subgraphs=True`，以实现：

* 实时流式输出 AI 响应生成过程
* 检测图何时遇到中断
* 处理用户输入并无缝恢复执行

```python  theme={null}
async for metadata, mode, chunk in graph.astream(
    initial_input,
    stream_mode=["messages", "updates"],
    subgraphs=True,
    config=config
):
    if mode == "messages":
        # 处理流式消息内容
        msg, _ = chunk
        if isinstance(msg, AIMessageChunk) and msg.content:
            # 实时展示内容
            display_streaming_content(msg.content)

    elif mode == "updates":
        # 检查是否中断
        if "__interrupt__" in chunk:
            # 停止流式展示
            interrupt_info = chunk["__interrupt__"][0].value

            # 处理用户输入
            user_response = get_user_input(interrupt_info)

            # 使用更新后的输入恢复图
            initial_input = Command(resume=user_response)
            break

        else:
            # 跟踪节点切换
            current_node = list(chunk.keys())[0]
```

* **`stream_mode=["messages", "updates"]`**：同时启用消息 chunk 与图状态更新的双流式输出
* **`subgraphs=True`**：在嵌套图中进行中断检测时必需
* **检测 `"__interrupt__"`**：表示需要人类输入
* **`Command(resume=...)`**：使用用户提供的数据恢复图执行

### 处理多个中断

当并行分支同时中断（例如 fan-out 到多个节点，而这些节点都调用了 `interrupt()`）时，你可能需要在一次调用中恢复多个中断。
在一次调用中恢复多个中断时，应将每个 interrupt ID 映射到其 resume 值。
这可以确保在运行时每个响应都会与正确的中断配对。

```typescript  theme={null}
import {
  Annotation,
  Command,
  END,
  INTERRUPT,
  MemorySaver,
  START,
  StateGraph,
  interrupt,
  isInterrupted,
} from "@langchain/langgraph";

const State = Annotation.Root({
  vals: Annotation<string[]>({
    reducer: (left, right) =>
      left.concat(Array.isArray(right) ? right : [right]),
    default: () => [],
  }),
});

function nodeA(_state: typeof State.State) {
  const answer = interrupt("question_a") as string;
  return { vals: [`a:${answer}`] };
}

function nodeB(_state: typeof State.State) {
  const answer = interrupt("question_b") as string;
  return { vals: [`b:${answer}`] };
}

const graph = new StateGraph(State)
  .addNode("a", nodeA)
  .addNode("b", nodeB)
  .addEdge(START, "a")
  .addEdge(START, "b")
  .addEdge("a", END)
  .addEdge("b", END)
  .compile({ checkpointer: new MemorySaver() });

const config = { configurable: { thread_id: "1" } };

async function main() {
  // Step 1：invoke —— 两个并行节点都触发 interrupt() 并暂停
  const interruptedResult = await graph.invoke({ vals: [] }, config);
  console.log(interruptedResult);
  /*
  {
    vals: [],
    __interrupt__: [
      { id: '...', value: 'question_a' },
      { id: '...', value: 'question_b' }
    ]
  }
  */

  // Step 2：一次性恢复所有待处理的中断
  const resumeMap: Record<string, string> = {};
  if (isInterrupted(interruptedResult)) {
    for (const i of interruptedResult[INTERRUPT]) {
      if (i.id != null) {
        resumeMap[i.id] = `answer for ${i.value}`;
      }
    }
  }
  const result = await graph.invoke(new Command({ resume: resumeMap }), config);

  console.log("最终状态：", result);
  //> 最终状态：{ vals: ['a:answer for question_a', 'b:answer for question_b'] }
}

main().catch(console.error);
```

### 通过 / 拒绝（Approve or reject）

中断最常见的用途之一是在关键动作之前暂停并请求批准。例如，你可能希望让人类批准一次 API 调用、一次数据库变更，或其他重要决策。

```typescript  theme={null}
import { interrupt, Command } from "@langchain/langgraph";

const approvalNode: typeof State.Node = (state) => {
  // 暂停执行；payload 会出现在 result.__interrupt__ 中
  const isApproved = interrupt({
    question: "你要继续吗？",
    details: state.actionDetails
  });

  // 根据响应进行路由
  if (isApproved) {
    return new Command({ goto: "proceed" }); // 在提供 resume payload 后运行
  } else {
    return new Command({ goto: "cancel" });
  }
}
```

恢复图时，传入 `true` 表示批准，或传入 `false` 表示拒绝：

```typescript  theme={null}
// 批准
await graph.invoke(new Command({ resume: true }), config);

// 拒绝
await graph.invoke(new Command({ resume: false }), config);
```

<Accordion title="完整示例">
  ```typescript  theme={null}
  import {
    Command,
    MemorySaver,
    START,
    END,
    StateGraph,
    StateSchema,
    interrupt,
  } from "@langchain/langgraph";
  import * as z from "zod";

  const State = new StateSchema({
    actionDetails: z.string(),
    status: z.enum(["pending", "approved", "rejected"]).nullable(),
  });

  const graphBuilder = new StateGraph(State)
    .addNode("approval", async (state) => {
      // 暴露细节，便于调用方在 UI 中渲染
      const decision = interrupt({
        question: "批准该操作吗？",
        details: state.actionDetails,
      });
      return new Command({ goto: decision ? "proceed" : "cancel" });
    }, { ends: ['proceed', 'cancel'] })
    .addNode("proceed", () => ({ status: "approved" }))
    .addNode("cancel", () => ({ status: "rejected" }))
    .addEdge(START, "approval")
    .addEdge("proceed", END)
    .addEdge("cancel", END);

  // 生产环境中请使用更持久化的 checkpointer
  const checkpointer = new MemorySaver();
  const graph = graphBuilder.compile({ checkpointer });

  const config = { configurable: { thread_id: "approval-123" } };
  const initial = await graph.invoke(
    { actionDetails: "转账 $500", status: "pending" },
    config,
  );
  console.log(initial.__interrupt__);
  // [{ value: { question: ..., details: ... } }]

  // 使用决策恢复；true 路由到 proceed，false 路由到 cancel
  const resumed = await graph.invoke(new Command({ resume: true }), config);
  console.log(resumed.status); // -> "approved"
  ```
</Accordion>

### 审阅并编辑状态（Review and edit state）

有时你希望在继续之前让人类审阅并编辑图状态的某一部分。这对于纠正 LLM 输出、补充缺失信息或进行调整很有用。

```typescript  theme={null}
import { interrupt } from "@langchain/langgraph";

const reviewNode: typeof State.Node = (state) => {
  // 暂停并展示当前内容以供审阅（会出现在 result.__interrupt__ 中）
  const editedContent = interrupt({
    instruction: "请审阅并编辑以下内容",
    content: state.generatedText
  });

  // 用编辑后的版本更新状态
  return { generatedText: editedContent };
}
```

恢复时，提供编辑后的内容：

```typescript  theme={null}
await graph.invoke(
  new Command({ resume: "编辑并改进后的文本" }), // 该值将成为 interrupt() 的返回值
  config
);
```

<Accordion title="完整示例">
  ```typescript  theme={null}
  import {
    Command,
    MemorySaver,
    START,
    END,
    StateGraph,
    StateSchema,
    interrupt,
  } from "@langchain/langgraph";
  import * as z from "zod";

  const State = new StateSchema({
    generatedText: z.string(),
  });

  const builder = new StateGraph(State)
    .addNode("review", async (state) => {
      // 让审阅者编辑生成内容
      const updated = interrupt({
        instruction: "请审阅并编辑以下内容",
        content: state.generatedText,
      });
      return { generatedText: updated };
    })
    .addEdge(START, "review")
    .addEdge("review", END);

  const checkpointer = new MemorySaver();
  const graph = builder.compile({ checkpointer });

  const config = { configurable: { thread_id: "review-42" } };
  const initial = await graph.invoke({ generatedText: "初稿" }, config);
  console.log(initial.__interrupt__);
  // [{ value: { instruction: ..., content: ... } }]

  // 使用审阅者编辑后的文本恢复
  const finalState = await graph.invoke(
    new Command({ resume: "审阅后改进的稿件" }),
    config,
  );
  console.log(finalState.generatedText); // -> "审阅后改进的稿件"
  ```
</Accordion>

### 在工具中中断（Interrupts in tools）

你也可以将中断直接放在工具函数内部。这样工具在每次被调用时都会为了审批而暂停，并允许在执行之前对工具调用进行人类审阅与编辑。

首先，定义一个使用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 的工具：

```typescript  theme={null}
import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import * as z from "zod";

const sendEmailTool = tool(
  async ({ to, subject, body }) => {
    // 发送前暂停；payload 会出现在 result.__interrupt__ 中
    const response = interrupt({
      action: "send_email",
      to,
      subject,
      body,
      message: "批准发送这封邮件吗？",
    });

    if (response?.action === "approve") {
      // resume 值可以在执行前覆盖输入
      const finalTo = response.to ?? to;
      const finalSubject = response.subject ?? subject;
      const finalBody = response.body ?? body;
      return `已向 ${finalTo} 发送邮件，主题为 '${finalSubject}'`;
    }
    return "邮件已被用户取消";
  },
  {
    name: "send_email",
    description: "向收件人发送邮件",
    schema: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  },
);
```

当你希望审批逻辑与工具本身放在一起时，这种方式非常有用，使其能够在图的不同部分复用。LLM 可以自然地调用该工具，而中断会在工具被调用时暂停执行，允许你批准、编辑或取消动作。

<Accordion title="完整示例">
  ```typescript  theme={null}
  import { tool } from "@langchain/core/tools";
  import { ChatAnthropic } from "@langchain/anthropic";
  import {
    Command,
    MemorySaver,
    START,
    END,
    StateGraph,
    StateSchema,
    MessagesValue,
    GraphNode,
    interrupt,
  } from "@langchain/langgraph";
  import * as z from "zod";

  const sendEmailTool = tool(
    async ({ to, subject, body }) => {
      // 发送前暂停；payload 会出现在 result.__interrupt__ 中
      const response = interrupt({
        action: "send_email",
        to,
        subject,
        body,
        message: "批准发送这封邮件吗？",
      });

      if (response?.action === "approve") {
        const finalTo = response.to ?? to;
        const finalSubject = response.subject ?? subject;
        const finalBody = response.body ?? body;
        console.log("[sendEmailTool]", finalTo, finalSubject, finalBody);
        return `已向 ${finalTo} 发送邮件`;
      }
      return "邮件已被用户取消";
    },
    {
      name: "send_email",
      description: "向收件人发送邮件",
      schema: z.object({
        to: z.string(),
        subject: z.string(),
        body: z.string(),
      }),
    },
  );

  const model = new ChatAnthropic({ model: "claude-sonnet-4-5-20250929" }).bindTools([sendEmailTool]);

  const State = new StateSchema({
    messages: MessagesValue,
  });

  const agent: typeof State.Node = async (state) => {
    // LLM 可能决定调用工具；中断会在发送前暂停
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  };

  const graphBuilder = new StateGraph(State)
    .addNode("agent", agent)
    .addEdge(START, "agent")
    .addEdge("agent", END);

  const checkpointer = new MemorySaver();
  const graph = graphBuilder.compile({ checkpointer });

  const config = { configurable: { thread_id: "email-workflow" } };
  const initial = await graph.invoke(
    {
      messages: [
        { role: "user", content: "给 alice@example.com 发一封关于会议的邮件" },
      ],
    },
    config,
  );
  console.log(initial.__interrupt__); // -> [{ value: { action: 'send_email', ... } }]

  // 用批准信息恢复，并可选地编辑参数
  const resumed = await graph.invoke(
    new Command({
      resume: { action: "approve", subject: "更新后的主题" },
    }),
    config,
  );
  console.log(resumed.messages.at(-1)); // -> send_email 返回的工具结果
  ```
</Accordion>

### 校验人类输入（Validating human input）

有时你需要校验人类输入，如果无效则再次询问。你可以在循环中多次调用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 来实现。

```typescript  theme={null}
import { interrupt } from "@langchain/langgraph";

const getAgeNode: typeof State.Node = (state) => {
  let prompt = "你的年龄是多少？";

  while (true) {
    const answer = interrupt(prompt); // payload 会出现在 result.__interrupt__ 中

    // 校验输入
    if (typeof answer === "number" && answer > 0) {
      // 输入有效——继续
      return { age: answer };
    } else {
      // 输入无效——用更具体的提示重新询问
      prompt = `'${answer}' 不是一个有效的年龄。请输入一个正数。`;
    }
  }
}
```

每次你使用无效输入恢复图，它都会用更清晰的消息再次询问。一旦提供有效输入，节点完成并继续执行图的后续步骤。

<Accordion title="完整示例">
  ```typescript  theme={null}
  import {
    Command,
    MemorySaver,
    START,
    END,
    StateGraph,
    StateSchema,
    interrupt,
  } from "@langchain/langgraph";
  import * as z from "zod";

  const State = new StateSchema({
    age: z.number().nullable(),
  });

  const builder = new StateGraph(State)
    .addNode("collectAge", (state) => {
      let prompt = "你的年龄是多少？";

      while (true) {
        const answer = interrupt(prompt); // payload 会出现在 result.__interrupt__ 中

        if (typeof answer === "number" && answer > 0) {
          return { age: answer };
        }

        prompt = `'${answer}' 不是一个有效的年龄。请输入一个正数。`;
      }
    })
    .addEdge(START, "collectAge")
    .addEdge("collectAge", END);

  const checkpointer = new MemorySaver();
  const graph = builder.compile({ checkpointer });

  const config = { configurable: { thread_id: "form-1" } };
  const first = await graph.invoke({ age: null }, config);
  console.log(first.__interrupt__); // -> [{ value: "你的年龄是多少？", ... }]

  // 提供无效数据；节点会重新提示
  const retry = await graph.invoke(new Command({ resume: "thirty" }), config);
  console.log(retry.__interrupt__); // -> [{ value: "'thirty' 不是一个有效的年龄...", ... }]

  // 提供有效数据；循环结束并更新状态
  const final = await graph.invoke(new Command({ resume: 30 }), config);
  console.log(final.age); // -> 30
  ```
</Accordion>

## 中断规则（Rules of interrupts）

当你在节点内调用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 时，LangGraph 会通过抛出一个异常来挂起执行，该异常用于向运行时发出暂停信号。该异常会沿调用栈向上传播，并被运行时捕获；运行时随后通知图保存当前状态并等待外部输入。

当执行恢复（你提供了所需输入之后），运行时会从头重新启动整个节点——不会从调用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 的那一行继续。这意味着，所有在 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 之前运行过的代码都会再次执行。因此，在使用中断时需要遵循一些重要规则，以确保其行为符合预期。

### 不要用 try/catch 包裹 `interrupt` 调用

[`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 通过抛出一个特殊异常来在调用点暂停执行。如果你用 try/catch 包裹 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 调用，你会捕获该异常，从而导致中断无法传回图运行时。

* ✅ 将 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 调用与可能出错的代码分离
* ✅ 如有需要，可条件性地捕获错误

<CodeGroup>
  ```typescript Separating logic theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ✅ Good：先中断，再单独处理错误条件
    const name = interrupt("你叫什么名字？");
    try {
      await fetchData(); // 这一步可能失败
    } catch (err) {
      console.error(error);
    }
    return state;
  }
  ```

  ```typescript Conditionally handling errors theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ✅ Good：重新抛出该异常将
    // 允许中断被传回图运行时
    try {
      const name = interrupt("你叫什么名字？");
      await fetchData(); // 这一步可能失败
    } catch (err) {
      if (error instanceof NetworkError) {
        console.error(error);
      }
      throw error;
    }
    return state;
  }
  ```
</CodeGroup>

* 🔴 不要用裸 try/catch 块包裹 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 调用

```typescript  theme={null}
async function nodeA(state: State) {
    // ❌ Bad：在裸 try/catch 中包裹 interrupt 会捕获中断异常
    try {
        const name = interrupt("你叫什么名字？");
    } catch (err) {
        console.error(error);
    }
    return state;
}
```

### 不要在节点内部重排 `interrupt` 调用顺序

在同一节点中使用多个中断很常见，但如果处理不当会导致非预期行为。

当一个节点包含多个中断调用时，LangGraph 会维护一份与执行该节点的 task 相关的 resume 值列表。每次恢复执行时，节点都会从头开始运行。对于每个遇到的中断，LangGraph 会检查该 task 的 resume 列表中是否存在匹配值。匹配是**严格基于索引**的，因此节点内 `interrupt` 调用的顺序非常重要。

* ✅ 在节点的多次执行中保持 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 调用一致

```typescript  theme={null}
async function nodeA(state: State) {
    // ✅ Good：每次中断调用都以相同顺序发生
    const name = interrupt("你叫什么名字？");
    const age = interrupt("你的年龄是多少？");
    const city = interrupt("你所在的城市是哪里？");

    return {
        name,
        age,
        city
    };
}
```

* 🔴 不要在节点内通过条件逻辑跳过 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 调用
* 🔴 不要用非确定性的逻辑在循环中调用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html)（导致不同执行之间的调用次数变化）

<CodeGroup>
  ```typescript Skipping interrupts theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ❌ Bad：条件性跳过中断会改变顺序
    const name = interrupt("你叫什么名字？");

    // 首次运行时可能跳过该中断
    // 恢复时可能不跳过——导致索引不匹配
    if (state.needsAge) {
      const age = interrupt("你的年龄是多少？");
    }

    const city = interrupt("你所在的城市是哪里？");

    return { name, city };
  }
  ```

  ```typescript Looping interrupts theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ❌ Bad：基于非确定性数据进行循环
    // 中断次数会在不同执行之间变化
    const results = [];
    for (const item of state.dynamicList || []) {  // 列表可能在不同运行之间变化
      const result = interrupt(`批准 ${item} 吗？`);
      results.push(result);
    }

    return { results };
  }
  ```
</CodeGroup>

### 不要在 `interrupt` 中返回复杂值

取决于所使用的 checkpointer，复杂值可能无法被序列化（例如你无法序列化一个函数）。为了让你的图能够适配任意部署环境，最佳实践是只使用合理可序列化的值。

* ✅ 向 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 传入简单、可 JSON 序列化的类型
* ✅ 传入由简单值组成的字典/对象

<CodeGroup>
  ```typescript Simple values theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ✅ Good：传入简单且可序列化的类型
    const name = interrupt("你叫什么名字？");
    const count = interrupt(42);
    const approved = interrupt(true);

    return { name, count, approved };
  }
  ```

  ```typescript Structured data theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ✅ Good：传入由简单值组成的对象
    const response = interrupt({
      question: "请输入用户信息",
      fields: ["name", "email", "age"],
      currentValues: state.user || {}
    });

    return { user: response };
  }
  ```
</CodeGroup>

* 🔴 不要向 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 传入函数、类实例或其他复杂对象

<CodeGroup>
  ```typescript Functions theme={null}
  function validateInput(value: string): boolean {
      return value.length > 0;
  }

  const nodeA: GraphNode<typeof State> = async (state) => {
    // ❌ Bad：向 interrupt 传入函数
    // 函数无法被序列化
    const response = interrupt({
      question: "你叫什么名字？",
      validator: validateInput  // 这会失败
    });
    return { name: response };
  }
  ```

  ```typescript Class instances theme={null}
  class DataProcessor {
      constructor(private config: any) {}
  }

  const nodeA: GraphNode<typeof State> = async (state) => {
    const processor = new DataProcessor({ mode: "strict" });

    // ❌ Bad：向 interrupt 传入类实例
    // 实例无法被序列化
    const response = interrupt({
      question: "输入要处理的数据",
      processor: processor  // 这会失败
    });
    return { result: response };
  }
  ```
</CodeGroup>

### 在 `interrupt` 之前调用的副作用必须是幂等的

由于中断通过重新运行触发它们的节点来实现，因此在 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 之前调用的副作用（理想情况下）应该是幂等的。幂等意味着同一操作被多次应用时，除第一次之外不会改变结果。

例如，你可能在节点中调用一个 API 来更新记录。如果在该调用之后触发了 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html)，当节点恢复时该 API 调用会被多次重跑，可能覆盖第一次更新或创建重复记录。

* ✅ 在 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 之前使用幂等操作
* ✅ 将副作用放在 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 之后
* ✅ 尽可能将副作用拆分到独立节点中

<CodeGroup>
  ```typescript Idempotent operations theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ✅ Good：使用 upsert 操作（幂等）
    // 多次运行会产生相同结果
    await db.upsertUser({
      userId: state.userId,
      status: "pending_approval"
    });

    const approved = interrupt("批准该变更吗？");

    return { approved };
  }
  ```

  ```typescript Side effects after interrupt theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ✅ Good：将副作用放在 interrupt 之后
    // 确保只在收到批准后执行一次
    const approved = interrupt("批准该变更吗？");

    if (approved) {
      await db.createAuditLog({
        userId: state.userId,
        action: "approved"
      });
    }

    return { approved };
  }
  ```

  ```typescript Separating into different nodes theme={null}
  const approvalNode: GraphNode<typeof State> = async (state) => {
    // ✅ Good：该节点只处理中断
    const approved = interrupt("批准该变更吗？");

    return { approved };
  }

  const notificationNode: GraphNode<typeof State> = async (state) => {
    // ✅ Good：副作用放在独立节点中
    // 它发生在批准之后，因此只会执行一次
    if (state.approved) {
      await sendNotification({
        userId: state.userId,
        status: "approved",
      });
    }

    return state;
  }
  ```
</CodeGroup>

* 🔴 不要在 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 之前执行非幂等操作
* 🔴 不要在未检查是否已存在的情况下创建新记录

<CodeGroup>
  ```typescript Creating records theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ❌ Bad：在 interrupt 之前创建新记录
    // 每次恢复都会创建重复记录
    const auditId = await db.createAuditLog({
      userId: state.userId,
      action: "pending_approval",
      timestamp: new Date()
    });

    const approved = interrupt("批准该变更吗？");

    return { approved, auditId };
  }
  ```

  ```typescript Appending to arrays theme={null}
  const nodeA: GraphNode<typeof State> = async (state) => {
    // ❌ Bad：在 interrupt 之前向数组追加元素
    // 每次恢复都会产生重复条目
    await db.appendToHistory(state.userId, "approval_requested");

    const approved = interrupt("批准该变更吗？");

    return { approved };
  }
  ```
</CodeGroup>

## 与作为函数调用的子图配合使用

当你在某个节点内调用子图时，父图会从**调用子图并触发了 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 的那个节点的开头**恢复执行。类似地，**子图**也会从触发 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 的节点开头恢复。

```typescript  theme={null}
async function nodeInParentGraph(state: State) {
    someCode(); // <-- 恢复时会再次执行
    // 将子图作为函数调用。
    // 子图内部包含一个 `interrupt` 调用。
    const subgraphResult = await subgraph.invoke(someInput);
    // ...
}

async function nodeInSubgraph(state: State) {
    someOtherCode(); // <-- 恢复时也会再次执行
    const result = interrupt("你叫什么名字？");
    // ...
}
```

## 使用中断进行调试

要调试与测试图，你可以使用静态中断作为断点，从而逐节点推进图执行。静态中断会在定义好的位置触发：要么在节点执行之前，要么在节点执行之后。你可以在编译图时通过 `interruptBefore` 与 `interruptAfter` 来设置。

<Note>
  静态中断**不建议**用于人类介入工作流。对于此类工作流，请使用 [`interrupt`](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 函数。
</Note>

<Tabs>
  <Tab title="编译时设置">
    ```typescript  theme={null}
    const graph = builder.compile({
        interruptBefore: ["node_a"],  // [!code highlight]
        interruptAfter: ["node_b", "node_c"],  // [!code highlight]
        checkpointer,
    });

    // 为图传入 thread ID
    const config = {
        configurable: {
            thread_id: "some_thread"
        }
    };
    
    // 运行图直到命中断点
    await graph.invoke(inputs, config);# [!code highlight]
    
    await graph.invoke(null, config);  # [!code highlight]
    ```
    
    1. 断点在 `compile` 阶段设置。
    2. `interruptBefore` 指定在节点执行之前暂停的节点。
    3. `interruptAfter` 指定在节点执行之后暂停的节点。
    4. 需要 checkpointer 来启用断点。
    5. 运行图直到命中第一个断点。
    6. 通过将输入设为 `null` 来恢复图，这会继续运行直到命中下一个断点。
  </Tab>

  <Tab title="运行时设置">
    ```typescript  theme={null}
    // 运行图直到命中断点
    graph.invoke(inputs, {
        interruptBefore: ["node_a"],  // [!code highlight]
        interruptAfter: ["node_b", "node_c"],  // [!code highlight]
        configurable: {
            thread_id: "some_thread"
        }
    });

    // 恢复图
    await graph.invoke(null, config);  // [!code highlight]
    ```
    
    1. `graph.invoke` 被调用时传入 `interruptBefore` 与 `interruptAfter` 参数。这是运行时配置，可在每次调用时变更。
    2. `interruptBefore` 指定在节点执行之前暂停的节点。
    3. `interruptAfter` 指定在节点执行之后暂停的节点。
    4. 运行图直到命中第一个断点。
    5. 通过将输入设为 `null` 来恢复图，这会继续运行直到命中下一个断点。
  </Tab>
</Tabs>

### 使用 LangSmith Studio

你可以使用 [LangSmith Studio](/langsmith/studio) 在 UI 中为图设置静态中断，然后再运行图。你也可以使用 UI 在执行过程中的任意时间点检查图状态。

<img src="https://qn.huat.xyz/mac/202602201640595.png" alt="image" data-og-width="1252" width="1252" data-og-height="1040" height="1040" data-path="oss/images/static-interrupt.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/static-interrupt.png?w=280&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=52d02b507d0a6a879f7fb88d9c6767d0 280w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/static-interrupt.png?w=560&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=e363cd4980edff9bab422f4f1c0ee3c8 560w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/static-interrupt.png?w=840&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=49d26a3641953c23ef3fbc51e828c305 840w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/static-interrupt.png?w=1100&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=2dba15683b3baa1a61bc3bcada35ae1e 1100w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/static-interrupt.png?w=1650&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=9f9a2c0f2631c0e69cd248f6319933fe 1650w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/static-interrupt.png?w=2500&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=5a46b765b436ab5d0dc2f41c01ffad80 2500w" />

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/interrupts.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将 [这些文档](/use-these-docs) 连接到 Claude、VSCode 等，以获取实时答案。
</Callout>
