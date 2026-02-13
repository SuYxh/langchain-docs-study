## 文档索引
在以下位置获取完整的文档索引：https://docs.langchain.com/llms.txt
使用此文件在进一步探索之前发现所有可用页面。

# 护栏 (Guardrails)

> 为您的智能体实施安全检查和内容过滤

护栏帮助您通过在智能体执行的关键点验证和过滤内容来构建安全、合规的 AI 应用程序。它们可以检测敏感信息、强制执行内容策略、验证输出，并在不安全行为导致问题之前阻止它们。

常见用例包括：

* 防止 PII 泄露
* 检测并阻止提示注入攻击
* 阻止不适当或有害的内容
* 强制执行业务规则和合规性要求
* 验证输出质量和准确性

您可以使用 [中间件](/oss/javascript/langchain/middleware) 在战略点拦截执行来实现护栏——在智能体启动之前、完成后或在模型和工具调用周围。

<div style={{ display: "flex", justifyContent: "center" }}>
  <img src="https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=eb4404b137edec6f6f0c8ccb8323eaf1" alt="Middleware flow diagram" className="rounded-lg" data-og-width="500" width="500" data-og-height="560" height="560" data-path="oss/images/middleware_final.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=280&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=483413aa87cf93323b0f47c0dd5528e8 280w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=560&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=41b7dd647447978ff776edafe5f42499 560w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=840&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=e9b14e264f68345de08ae76f032c52d4 840w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=1100&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=ec45e1932d1279b1beee4a4b016b473f 1100w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=1650&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=3bca5ebf8aa56632b8a9826f7f112e57 1650w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=2500&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=437f141d1266f08a95f030c2804691d9 2500w" />
</div>

护栏可以使用两种互补的方法来实现：

<CardGroup cols={2}>
  <Card title="Deterministic guardrails" icon="list-check">
    使用基于规则的逻辑，如正则表达式模式、关键字匹配或显式检查。快速、可预测且具有成本效益，但可能会遗漏细微的违规行为。
  </Card>

  <Card title="Model-based guardrails" icon="brain">
    使用 LLM 或分类器通过语义理解来评估内容。捕获规则遗漏的细微问题，但速度较慢且成本较高。
  </Card>
</CardGroup>

LangChain 提供了内置护栏（例如，[PII 检测](#pii-detection)、[人机交互](#human-in-the-loop)）和灵活的中间件系统，用于使用任一方法构建自定义护栏。

## 内置护栏

### PII 检测 (PII detection)

LangChain 提供了内置中间件，用于检测和处理对话中的个人身份信息 (PII)。此中间件可以检测常见的 PII 类型，如电子邮件、信用卡、IP 地址等。

PII 检测中间件有助于具有合规要求的医疗保健和金融应用程序、需要清理日志的客户服务智能体，以及通常处理敏感用户数据的任何应用程序。

PII 中间件支持多种处理检测到的 PII 的策略：

| 策略 | 描述 | 示例 |
| -------- | --------------------------------------- | --------------------- |
| `redact` | 替换为 `[REDACTED_{PII_TYPE}]` | `[REDACTED_EMAIL]` |
| `mask` | 部分掩盖（例如，最后 4 位数字） | `****-****-****-1234` |
| `hash` | 替换为确定性哈希 | `a8f5f167...` |
| `block` | 检测到时引发异常 | Error thrown |

```typescript  theme={null}
import { createAgent, piiRedactionMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4.1",
  tools: [customerServiceTool, emailTool],
  middleware: [
    // Redact emails in user input before sending to model
    piiRedactionMiddleware({
      piiType: "email",
      strategy: "redact",
      applyToInput: true,
    }),
    // Mask credit cards in user input
    piiRedactionMiddleware({
      piiType: "credit_card",
      strategy: "mask",
      applyToInput: true,
    }),
    // Block API keys - raise error if detected
    piiRedactionMiddleware({
      piiType: "api_key",
      detector: /sk-[a-zA-Z0-9]{32}/,
      strategy: "block",
      applyToInput: true,
    }),
  ],
});

// When user provides PII, it will be handled according to the strategy
const result = await agent.invoke({
  messages: [{
    role: "user",
    content: "My email is john.doe@example.com and card is 5105-1051-0510-5100"
  }]
});
```

<Accordion title="Built-in PII types and configuration">
  **内置 PII 类型:**

  * `email` - 电子邮件地址
  * `credit_card` - 信用卡号 (Luhn 验证)
  * `ip` - IP 地址
  * `mac_address` - MAC 地址
  * `url` - URLs

  **配置选项:**

  | 参数 | 描述 | 默认值 |
  | -------------------- | ---------------------------------------------------------------------- | --------------------------- |
  | `piiType` | 要检测的 PII 类型（内置或自定义） | Required |
  | `strategy` | 如何处理检测到的 PII (`"block"`, `"redact"`, `"mask"`, `"hash"`) | `"redact"` |
  | `detector` | 自定义检测器正则模式 | `undefined` (使用内置) |
  | `applyToInput` | 在模型调用之前检查用户消息 | `true` |
  | `applyToOutput` | 在模型调用之后检查 AI 消息 | `false` |
  | `applyToToolResults` | 在执行之后检查工具结果消息 | `false` |
</Accordion>

有关 PII 检测功能的完整详细信息，请参阅 [中间件文档](/oss/javascript/langchain/middleware#pii-detection)。

### 人机交互 (Human-in-the-loop)

LangChain 提供了内置中间件，用于在执行敏感操作之前要求人工批准。这是针对高风险决策最有效的护栏之一。

人机交互中间件有助于金融交易和转账、删除或修改生产数据、向外部方发送通信以及任何具有重大业务影响的操作。

```typescript  theme={null}
import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { MemorySaver, Command } from "@langchain/langgraph";

const agent = createAgent({
  model: "gpt-4.1",
  tools: [searchTool, sendEmailTool, deleteDatabaseTool],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        // Require approval for sensitive operations
        send_email: { allowAccept: true, allowEdit: true, allowRespond: true },
        delete_database: { allowAccept: true, allowEdit: true, allowRespond: true },
        // Auto-approve safe operations
        search: false,
      }
    }),
  ],
  checkpointer: new MemorySaver(),
});

// Human-in-the-loop requires a thread ID for persistence
const config = { configurable: { thread_id: "some_id" } };

// Agent will pause and wait for approval before executing sensitive tools
let result = await agent.invoke(
  { messages: [{ role: "user", content: "Send an email to the team" }] },
  config
);

result = await agent.invoke(
  new Command({ resume: { decisions: [{ type: "approve" }] } }),
  config  // Same thread ID to resume the paused conversation
);
```

<Tip>
  有关实施批准工作流的完整详细信息，请参阅 [人机交互文档](/oss/javascript/langchain/human-in-the-loop)。
</Tip>

## 自定义护栏

对于更复杂的护栏，您可以创建在智能体执行之前或之后运行的自定义中间件。这使您可以完全控制验证逻辑、内容过滤和安全检查。

### 智能体前护栏 (Before agent guardrails)

使用“智能体前”钩子在每次调用开始时验证请求。这对于会话级检查（如身份验证、速率限制）或在开始任何处理之前阻止不适当的请求非常有用。

```typescript  theme={null}
import { createMiddleware, AIMessage } from "langchain";

const contentFilterMiddleware = (bannedKeywords: string[]) => {
  const keywords = bannedKeywords.map(kw => kw.toLowerCase());

  return createMiddleware({
    name: "ContentFilterMiddleware",
    beforeAgent: {
      hook: (state) => {
        // Get the first user message
        if (!state.messages || state.messages.length === 0) {
          return;
        }

        const firstMessage = state.messages[0];
        if (firstMessage._getType() !== "human") {
          return;
        }

        const content = firstMessage.content.toString().toLowerCase();

        // Check for banned keywords
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            // Block execution before any processing
            return {
              messages: [
                new AIMessage(
                  "I cannot process requests containing inappropriate content. Please rephrase your request."
                )
              ],
              jumpTo: "end",
            };
          }
        }

        return;
      },
      canJumpTo: ['end']
    }
  });
};

// Use the custom guardrail
import { createAgent } from "langchain";

const agent = createAgent({
  model: "gpt-4.1",
  tools: [searchTool, calculatorTool],
  middleware: [
    contentFilterMiddleware(["hack", "exploit", "malware"]),
  ],
});

// This request will be blocked before any processing
const result = await agent.invoke({
  messages: [{ role: "user", content: "How do I hack into a database?" }]
});
```

### 智能体后护栏 (After agent guardrails)

使用“智能体后”钩子在返回给用户之前验证最终输出。这对于基于模型的安全检查、质量验证或对完整智能体响应的最终合规性扫描非常有用。

```typescript  theme={null}
import { createMiddleware, AIMessage, initChatModel } from "langchain";

const safetyGuardrailMiddleware = () => {
  const safetyModel = initChatModel("gpt-4.1-mini");

  return createMiddleware({
    name: "SafetyGuardrailMiddleware",
    afterAgent: {
      hook: async (state) => {
        // Get the final AI response
        if (!state.messages || state.messages.length === 0) {
          return;
        }

        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage._getType() !== "ai") {
          return;
        }

        // Use a model to evaluate safety
        const safetyPrompt = `Evaluate if this response is safe and appropriate.
        Respond with only 'SAFE' or 'UNSAFE'.

        Response: ${lastMessage.content.toString()}`;

        const result = await safetyModel.invoke([
          { role: "user", content: safetyPrompt }
        ]);

        if (result.content.toString().includes("UNSAFE")) {
          return {
            messages: [
              new AIMessage(
                "I cannot provide that response. Please rephrase your request."
              )
            ],
            jumpTo: "end",
          };
        }

        return;
      },
      canJumpTo: ['end']
    }
  });
};

// Use the safety guardrail
import { createAgent } from "langchain";

const agent = createAgent({
  model: "gpt-4.1",
  tools: [searchTool, calculatorTool],
  middleware: [safetyGuardrailMiddleware()],
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "How do I make explosives?" }]
});
```

### 组合多个护栏

您可以通过将它们添加到中间件数组来堆叠多个护栏。它们按顺序执行，允许您构建分层保护：

```typescript  theme={null}
import { createAgent, piiRedactionMiddleware, humanInTheLoopMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4.1",
  tools: [searchTool, sendEmailTool],
  middleware: [
    // Layer 1: Deterministic input filter (before agent)
    contentFilterMiddleware(["hack", "exploit"]),

    // Layer 2: PII protection (before and after model)
    piiRedactionMiddleware({
      piiType: "email",
      strategy: "redact",
      applyToInput: true,
    }),
    piiRedactionMiddleware({
      piiType: "email",
      strategy: "redact",
      applyToOutput: true,
    }),

    // Layer 3: Human approval for sensitive tools
    humanInTheLoopMiddleware({
      interruptOn: {
        send_email: { allowAccept: true, allowEdit: true, allowRespond: true },
      }
    }),

    // Layer 4: Model-based safety check (after agent)
    safetyGuardrailMiddleware(),
  ],
});
```

## 其他资源

* [Middleware documentation](/oss/javascript/langchain/middleware) - 自定义中间件的完整指南
* [Middleware API reference](https://reference.langchain.com/python/langchain/middleware/) - 自定义中间件的完整指南
* [Human-in-the-loop](/oss/javascript/langchain/human-in-the-loop) - 为敏感操作添加人工审核
* [Testing agents](/oss/javascript/langchain/test) - 测试安全机制的策略

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/guardrails.mdx) 或 [提交问题](https://github.com/langchain-ai/docs/issues/new/choose).
</Callout>

<Tip icon="terminal" iconType="regular">
  [将这些文档连接](/use-these-docs) 到 Claude, VSCode, 以及更多通过 MCP 获取实时答案。
</Tip>
