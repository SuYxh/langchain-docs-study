> ## 文档索引
> 获取完整文档索引：https://docs.langchain.com/llms.txt
> 使用此文件了解所有可用页面，然后再进一步探索。

# 人机协作 (Human-in-the-loop)

人机协作 (HITL) [中间件](/oss/javascript/langchain/middleware/built-in#human-in-the-loop) 允许您为智能体的工具调用添加人工监督。
当模型提出可能需要审查的操作时 — 例如，写入文件或执行 SQL — 中间件可以暂停执行并等待决策。

它通过根据可配置的策略检查每个工具调用来实现这一点。如果需要干预，中间件会发出一个 [interrupt](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 来暂停执行。图状态使用 LangGraph 的[持久化层](/oss/javascript/langgraph/persistence)保存，因此执行可以安全地暂停并在稍后恢复。

然后由人工决策来决定接下来会发生什么：操作可以按原样批准（`approve`），在运行前修改（`edit`），或带反馈拒绝（`reject`）。

## 中断决策类型

该[中间件](/oss/javascript/langchain/middleware/built-in#human-in-the-loop)定义了三种内置的方式供人工响应中断：

| 决策类型 | 描述                                                               | 示例用例                                    |
| ------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| ✅ `approve`   | 操作按原样批准并执行，无需更改。                | 完全按照撰写的内容发送电子邮件草稿              |
| ✏️ `edit`     | 工具调用在修改后执行。                             | 在发送电子邮件前更改收件人        |
| ❌ `reject`    | 工具调用被拒绝，并在对话中添加解释。 | 拒绝电子邮件草稿并解释如何重写 |

每个工具可用的决策类型取决于您在 `interrupt_on` 中配置的策略。
当多个工具调用同时暂停时，每个操作需要单独的决策。
决策必须按照中断请求中操作出现的相同顺序提供。

<Tip>
  在**编辑**工具参数时，请保守地进行更改。对原始参数的重大修改可能会导致模型重新评估其方法，并可能多次执行工具或采取意外操作。
</Tip>

## 配置中断

要使用 HITL，请在创建智能体时将[中间件](/oss/javascript/langchain/middleware/built-in#human-in-the-loop)添加到智能体的 `middleware` 列表中。

您需要配置一个工具操作到每个操作允许的决策类型的映射。当工具调用匹配映射中的操作时，中间件将中断执行。

```ts  theme={null}
import { createAgent, humanInTheLoopMiddleware } from "langchain"; // [!code highlight]
import { MemorySaver } from "@langchain/langgraph"; // [!code highlight]

const agent = createAgent({
    model: "gpt-4.1",
    tools: [writeFileTool, executeSQLTool, readDataTool],
    middleware: [
        humanInTheLoopMiddleware({
            interruptOn: {
                write_file: true, // 允许所有决策（approve、edit、reject）
                execute_sql: {
                    allowedDecisions: ["approve", "reject"],
                    // 不允许编辑
                    description: "🚨 SQL 执行需要 DBA 批准",
                },
                // 安全操作，无需批准
                read_data: false,
            },
            // 中断消息前缀 - 与工具名称和参数组合形成完整消息
            // 例如，"工具执行待批准: execute_sql with query='DELETE FROM...'"
            // 单个工具可以通过在其中断配置中指定 "description" 来覆盖此设置
            descriptionPrefix: "Tool execution pending approval",
        }),
    ],
    // 人机协作需要检查点来处理中断。
    // 在生产环境中，使用持久化检查点器如 AsyncPostgresSaver。
    checkpointer: new MemorySaver(), // [!code highlight]
});
```

<Info>
  您必须配置检查点器以在中断之间持久化图状态。
  在生产环境中，使用持久化检查点器如 [`AsyncPostgresSaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint-postgres.AsyncPostgresSaver.html)。对于测试或原型开发，使用 [`InMemorySaver`](https://reference.langchain.com/javascript/classes/_langchain_langgraph-checkpoint.MemorySaver.html)。

  调用智能体时，传递一个包含 **thread ID** 的 `config` 以将执行与对话线程关联。
  详情请参阅 [LangGraph 中断文档](/oss/javascript/langgraph/interrupts)。
</Info>

<Accordion title="配置选项">
  <ParamField body="interruptOn" type="object" required>
    工具名称到批准配置的映射
  </ParamField>

  **工具批准配置选项：**

  <ParamField body="allowAccept" type="boolean" default="false">
    是否允许批准
  </ParamField>

  <ParamField body="allowEdit" type="boolean" default="false">
    是否允许编辑
  </ParamField>

  <ParamField body="allowRespond" type="boolean" default="false">
    是否允许响应/拒绝
  </ParamField>
</Accordion>

## 响应中断

当您调用智能体时，它会运行直到完成或引发中断。当工具调用匹配您在 `interrupt_on` 中配置的策略时，会触发中断。在这种情况下，调用结果将包含一个 `__interrupt__` 字段，其中包含需要审查的操作。然后您可以将这些操作呈现给审查者，并在提供决策后恢复执行。

```typescript  theme={null}
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";

// 您必须提供线程 ID 以将执行与对话线程关联，
// 以便对话可以暂停和恢复（这是人工审查所需的）。
const config = { configurable: { thread_id: "some_id" } }; // [!code highlight]

// 运行图直到命中中断。
const result = await agent.invoke(
    {
        messages: [new HumanMessage("Delete old records from the database")],
    },
    config // [!code highlight]
);


// 中断包含完整的 HITL 请求，包括 action_requests 和 review_configs
console.log(result.__interrupt__);
// > [
// >    Interrupt(
// >       value: {
// >          action_requests: [
// >             {
// >                name: 'execute_sql',
// >                arguments: { query: 'DELETE FROM records WHERE created_at < NOW() - INTERVAL \'30 days\';' },
// >                description: 'Tool execution pending approval\n\nTool: execute_sql\nArgs: {...}'
// >             }
// >          ],
// >          review_configs: [
// >             {
// >                action_name: 'execute_sql',
// >                allowed_decisions: ['approve', 'reject']
// >             }
// >          ]
// >       }
// >    )
// > ]

// 使用批准决策恢复
await agent.invoke(
    new Command({ // [!code highlight]
        resume: { decisions: [{ type: "approve" }] }, // 或 "reject" [!code highlight]
    }), // [!code highlight]
    config // 使用相同的线程 ID 恢复暂停的对话
);
```

### 决策类型

<Tabs>
  <Tab title="✅ approve">
    使用 `approve` 按原样批准工具调用并执行，无需更改。

    ```typescript  theme={null}
    await agent.invoke(
        new Command({
            // 决策以列表形式提供，每个待审查的操作对应一个决策。
            // 决策的顺序必须与 `__interrupt__` 请求中
            // 列出的操作顺序相匹配。
            resume: {
                decisions: [
                    {
                        type: "approve",
                    }
                ]
            }
        }),
        config  // 使用相同的线程 ID 恢复暂停的对话
    );
    ```
  </Tab>

  <Tab title="✏️ edit">
    使用 `edit` 在执行前修改工具调用。
    提供包含新工具名称和参数的已编辑操作。

    ```typescript  theme={null}
    await agent.invoke(
        new Command({
            // 决策以列表形式提供，每个待审查的操作对应一个决策。
            // 决策的顺序必须与 `__interrupt__` 请求中
            // 列出的操作顺序相匹配。
            resume: {
                decisions: [
                    {
                        type: "edit",
                        // 包含工具名称和参数的已编辑操作
                        editedAction: {
                            // 要调用的工具名称。
                            // 通常与原始操作相同。
                            name: "new_tool_name",
                            // 传递给工具的参数。
                            args: { key1: "new_value", key2: "original_value" },
                        }
                    }
                ]
            }
        }),
        config  // 使用相同的线程 ID 恢复暂停的对话
    );
    ```

    <Tip>
      在**编辑**工具参数时，请保守地进行更改。对原始参数的重大修改可能会导致模型重新评估其方法，并可能多次执行工具或采取意外操作。
    </Tip>
  </Tab>

  <Tab title="❌ reject">
    使用 `reject` 拒绝工具调用并提供反馈而非执行。

    ```typescript  theme={null}
    await agent.invoke(
        new Command({
            // 决策以列表形式提供，每个待审查的操作对应一个决策。
            // 决策的顺序必须与 `__interrupt__` 请求中
            // 列出的操作顺序相匹配。
            resume: {
                decisions: [
                    {
                        type: "reject",
                        // 关于为什么拒绝该操作的解释
                        message: "No, this is wrong because ..., instead do this ...",
                    }
                ]
            }
        }),
        config  // 使用相同的线程 ID 恢复暂停的对话
    );
    ```

    `message` 作为反馈添加到对话中，帮助智能体理解为什么操作被拒绝以及应该做什么替代操作。

    ***

    ### 多个决策

    当多个操作待审查时，为每个操作提供决策，顺序与它们在中断中出现的顺序相同：

    ```typescript  theme={null}
    {
        decisions: [
            { type: "approve" },
            {
                type: "edit",
                editedAction: {
                    name: "tool_name",
                    args: { param: "new_value" }
                }
            },
            {
                type: "reject",
                message: "This action is not allowed"
            }
        ]
    }
    ```
  </Tab>
</Tabs>

## 流式处理与人机协作

您可以使用 `stream()` 代替 `invoke()` 来在智能体运行和处理中断时获取实时更新。使用 `stream_mode=['updates', 'messages']` 同时流式传输智能体进度和 LLM 令牌。

```typescript  theme={null}
import { Command } from "@langchain/langgraph";

const config = { configurable: { thread_id: "some_id" } };

// 流式传输智能体进度和 LLM 令牌直到中断
for await (const [mode, chunk] of await agent.stream(
    { messages: [{ role: "user", content: "Delete old records from the database" }] },
    { ...config, streamMode: ["updates", "messages"] }  // [!code highlight]
)) {
    if (mode === "messages") {
        // LLM 令牌
        const [token, metadata] = chunk;
        if (token.content) {
            process.stdout.write(token.content);
        }
    } else if (mode === "updates") {
        // 检查中断
        if ("__interrupt__" in chunk) {
            console.log(`\n\n中断: ${JSON.stringify(chunk.__interrupt__)}`);
        }
    }
}

// 在人工决策后使用流式处理恢复
for await (const [mode, chunk] of await agent.stream(
    new Command({ resume: { decisions: [{ type: "approve" }] } }),
    { ...config, streamMode: ["updates", "messages"] }
)) {
    if (mode === "messages") {
        const [token, metadata] = chunk;
        if (token.content) {
            process.stdout.write(token.content);
        }
    }
}
```

有关流模式的更多详情，请参阅[流式处理](/oss/javascript/langchain/streaming)指南。

## 执行生命周期

中间件定义了一个 `after_model` 钩子，在模型生成响应后但在执行任何工具调用之前运行：

1. 智能体调用模型生成响应。
2. 中间件检查响应中的工具调用。
3. 如果任何调用需要人工输入，中间件构建一个包含 `action_requests` 和 `review_configs` 的 `HITLRequest` 并调用 [interrupt](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html)。
4. 智能体等待人工决策。
5. 根据 `HITLResponse` 决策，中间件执行已批准或已编辑的调用，为已拒绝的调用合成 [ToolMessage](https://reference.langchain.com/javascript/classes/_langchain_core.messages.ToolMessage.html)，并恢复执行。

## 自定义 HITL 逻辑

对于更专业的工作流，您可以直接使用 [interrupt](https://reference.langchain.com/javascript/functions/_langchain_langgraph.index.interrupt.html) 原语和[中间件](/oss/javascript/langchain/middleware)抽象构建自定义 HITL 逻辑。

查看上面的[执行生命周期](#执行生命周期)以了解如何将中断集成到智能体的操作中。

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/human-in-the-loop.mdx) 或 [提交问题](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Tip icon="terminal" iconType="regular">
  通过 MCP [连接这些文档](/use-these-docs) 到 Claude、VSCode 等，获取实时答案。
</Tip>
