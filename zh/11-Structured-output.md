## 文档索引
在以下位置获取完整的文档索引：https://docs.langchain.com/llms.txt
使用此文件在进一步探索之前发现所有可用页面。

# 结构化输出

结构化输出允许智能体以特定、可预测的格式返回数据。您将获得类型化的结构化数据，而不是解析自然语言响应。

<Tip>
  本页介绍使用 `createAgent` 的智能体的结构化输出。要在模型上直接使用结构化输出（在智能体之外），请参阅 [模型 - 结构化输出](/oss/javascript/langchain/models#structured-output)。
</Tip>

LangChain 的预置 ReAct 智能体 `createAgent` 自动处理结构化输出。用户设置所需的结构化输出模式，当模型生成结构化数据时，它会被捕获、验证并在智能体状态的 `structuredResponse` 键中返回。

```ts  theme={null}
type ResponseFormat = (
    | ZodSchema<StructuredResponseT> // Zod 模式
    | Record<string, unknown> // JSON 模式
)

const agent = createAgent({
    // ...
    responseFormat: ResponseFormat | ResponseFormat[]
})
```

## 响应格式

控制智能体如何返回结构化数据。您可以提供 Zod 对象或 JSON 模式。默认情况下，智能体使用工具调用策略，其中输出由额外的工具调用创建。某些模型支持原生结构化输出，在这种情况下，智能体将改用该策略。

您可以通过将 `ResponseFormat` 包装在 `toolStrategy` 或 `providerStrategy` 函数调用中来控制行为：

```ts  theme={null}
import { toolStrategy, providerStrategy } from "langchain";

const agent = createAgent({
    // 如果模型支持，使用提供者策略
    responseFormat: providerStrategy(z.object({ ... }))
    // 或者强制使用工具策略
    responseFormat: toolStrategy(z.object({ ... }))
})
```

结构化响应在智能体最终状态的 `structuredResponse` 键中返回。

<Tip>
  如果使用 `langchain>=1.1`，则会从模型的 [配置文件数据](/oss/javascript/langchain/models#model-profiles) 中动态读取对原生结构化输出功能的支持。如果数据不可用，请使用其他条件或手动指定：

  ```typescript  theme={null}
  const customProfile: ModelProfile = {
      structuredOutput: true,
      // ...
  }
  const model = await initChatModel("...", { profile: customProfile });
  ```

  如果指定了工具，模型必须支持同时使用工具和结构化输出。
</Tip>

---

## 提供者策略

一些模型提供商通过其 API 原生支持结构化输出（例如 OpenAI, xAI (Grok), Gemini, Anthropic (Claude)）。当可用时，这是最可靠的方法。

要使用此策略，请配置 `ProviderStrategy`：

```ts  theme={null}
function providerStrategy<StructuredResponseT>(
    schema: ZodSchema<StructuredResponseT> | JsonSchemaFormat
): ProviderStrategy<StructuredResponseT>
```

<ParamField path="schema" required>
  定义结构化输出格式的模式。支持：

  * **Zod Schema**: Zod 模式
  * **JSON Schema**: JSON 模式对象
</ParamField>

当您直接将模式类型传递给 `createAgent.responseFormat` 并且模型支持原生结构化输出时，LangChain 会自动使用 `ProviderStrategy`：

<CodeGroup>
  ```ts Zod Schema theme={null}
  import * as z from "zod";
  import { createAgent, providerStrategy } from "langchain";

  const ContactInfo = z.object({
      name: z.string().describe("The name of the person"),
      email: z.string().describe("The email address of the person"),
      phone: z.string().describe("The phone number of the person"),
  });

  const agent = createAgent({
      model: "gpt-5",
      tools: [],
      responseFormat: providerStrategy(ContactInfo)
  });

  const result = await agent.invoke({
      messages: [{"role": "user", "content": "Extract contact info from: John Doe, john@example.com, (555) 123-4567"}]
  });

  console.log(result.structuredResponse);
  // { name: "John Doe", email: "john@example.com", phone: "(555) 123-4567" }
  ```

  ```ts JSON Schema theme={null}
  import { createAgent, providerStrategy } from "langchain";

  const contactInfoSchema = {
      "type": "object",
      "description": "Contact information for a person.",
      "properties": {
          "name": {"type": "string", "description": "The name of the person"},
          "email": {"type": "string", "description": "The email address of the person"},
          "phone": {"type": "string", "description": "The phone number of the person"}
      },
      "required": ["name", "email", "phone"]
  }

  const agent = createAgent({
      model: "gpt-5",
      tools: [],
      responseFormat: providerStrategy(contactInfoSchema)
  });

  const result = await agent.invoke({
      messages: [{"role": "user", "content": "Extract contact info from: John Doe, john@example.com, (555) 123-4567"}]
  });

  console.log(result.structuredResponse);
  // { name: "John Doe", email: "john@example.com", phone: "(555) 123-4567" }
  ```
</CodeGroup>

提供者原生结构化输出提供了高可靠性和严格验证，因为模型提供商强制执行该模式。只要可用就使用它。

<Note>
  如果提供商原生支持您选择的模型的结构化输出，那么编写 `responseFormat: contactInfoSchema` 在功能上等同于 `responseFormat: providerStrategy(contactInfoSchema)`。

  在这两种情况下，如果不支持结构化输出，智能体将回退到工具调用策略。
</Note>

## 工具调用策略

对于不支持原生结构化输出的模型，LangChain 使用工具调用来实现相同的结果。这适用于所有支持工具调用的模型（大多数现代模型）。

要使用此策略，请配置 `ToolStrategy`：

```ts  theme={null}
function toolStrategy<StructuredResponseT>(
    responseFormat:
        | JsonSchemaFormat
        | ZodSchema<StructuredResponseT>
        | (ZodSchema<StructuredResponseT> | JsonSchemaFormat)[]
    options?: ToolStrategyOptions
): ToolStrategy<StructuredResponseT>
```

<ParamField path="schema" required>
  定义结构化输出格式的模式。支持：

  * **Zod Schema**: Zod 模式
  * **JSON Schema**: JSON 模式对象
</ParamField>

<ParamField path="options.toolMessageContent">
  生成结构化输出时返回的工具消息的自定义内容。
  如果未提供，默认为显示结构化响应数据的消息。
</ParamField>

<ParamField path="options.handleError">
  包含用于自定义错误处理策略的可选 `handleError` 参数的选项参数。

  * **`true`**: 使用默认错误模板捕获所有错误（默认）
  * **`False`**: 不重试，让异常传播
  * **`(error: ToolStrategyError) => string | Promise<string>`**: 使用提供的消息重试或抛出错误
</ParamField>

<CodeGroup>
  ```ts Zod Schema theme={null}
  import * as z from "zod";
  import { createAgent, toolStrategy } from "langchain";

  const ProductReview = z.object({
      rating: z.number().min(1).max(5).optional(),
      sentiment: z.enum(["positive", "negative"]),
      keyPoints: z.array(z.string()).describe("The key points of the review. Lowercase, 1-3 words each."),
  });

  const agent = createAgent({
      model: "gpt-5",
      tools: [],
      responseFormat: toolStrategy(ProductReview)
  })

  const result = await agent.invoke({
      "messages": [{"role": "user", "content": "Analyze this review: 'Great product: 5 out of 5 stars. Fast shipping, but expensive'"}]
  })

  console.log(result.structuredResponse);
  // { "rating": 5, "sentiment": "positive", "keyPoints": ["fast shipping", "expensive"] }
  ```

  ```ts JSON Schema theme={null}
  import { createAgent, toolStrategy } from "langchain";

  const productReviewSchema = {
      "type": "object",
      "description": "Analysis of a product review.",
      "properties": {
          "rating": {
              "type": ["integer", "null"],
              "description": "The rating of the product (1-5)",
              "minimum": 1,
              "maximum": 5
          },
          "sentiment": {
              "type": "string",
              "enum": ["positive", "negative"],
              "description": "The sentiment of the review"
          },
          "key_points": {
              "type": "array",
              "items": {"type": "string"},
              "description": "The key points of the review"
          }
      },
      "required": ["sentiment", "key_points"]
  }

  const agent = createAgent({
      model: "gpt-5",
      tools: [],
      responseFormat: toolStrategy(productReviewSchema)
  });

  const result = await agent.invoke({
      messages: [{"role": "user", "content": "Analyze this review: 'Great product: 5 out of 5 stars. Fast shipping, but expensive'"}]
  })

  console.log(result.structuredResponse);
  // { "rating": 5, "sentiment": "positive", "keyPoints": ["fast shipping", "expensive"] }
  ```

  ```ts Union Types theme={null}
  import * as z from "zod";
  import { createAgent, toolStrategy } from "langchain";

  const ProductReview = z.object({
      rating: z.number().min(1).max(5).optional(),
      sentiment: z.enum(["positive", "negative"]),
      keyPoints: z.array(z.string()).describe("The key points of the review. Lowercase, 1-3 words each."),
  });

  const CustomerComplaint = z.object({
      issueType: z.enum(["product", "service", "shipping", "billing"]),
      severity: z.enum(["low", "medium", "high"]),
      description: z.string().describe("Brief description of the complaint"),
  });

  const agent = createAgent({
      model: "gpt-5",
      tools: [],
      responseFormat: toolStrategy([ProductReview, CustomerComplaint])
  });

  const result = await agent.invoke({
      messages: [{"role": "user", "content": "Analyze this review: 'Great product: 5 out of 5 stars. Fast shipping, but expensive'"}]
  })

  console.log(result.structuredResponse);
  // { "rating": 5, "sentiment": "positive", "keyPoints": ["fast shipping", "expensive"] }
  ```
</CodeGroup>

### 自定义工具消息内容

`toolMessageContent` 参数允许您自定义生成结构化输出时出现在对话历史记录中的消息：

```ts  theme={null}
import * as z from "zod";
import { createAgent, toolStrategy } from "langchain";

const MeetingAction = z.object({
    task: z.string().describe("The specific task to be completed"),
    assignee: z.string().describe("Person responsible for the task"),
    priority: z.enum(["low", "medium", "high"]).describe("Priority level"),
});

const agent = createAgent({
    model: "gpt-5",
    tools: [],
    responseFormat: toolStrategy(MeetingAction, {
        toolMessageContent: "Action item captured and added to meeting notes!"
    })
});

const result = await agent.invoke({
    messages: [{"role": "user", "content": "From our meeting: Sarah needs to update the project timeline as soon as possible"}]
});

console.log(result);
/**
 * {
 *   messages: [
 *     { role: "user", content: "From our meeting: Sarah needs to update the project timeline as soon as possible" },
 *     { role: "assistant", content: "Action item captured and added to meeting notes!", tool_calls: [ { name: "MeetingAction", args: { task: "update the project timeline", assignee: "Sarah", priority: "high" }, id: "call_456" } ] },
 *     { role: "tool", content: "Action item captured and added to meeting notes!", tool_call_id: "call_456", name: "MeetingAction" }
 *   ],
 *   structuredResponse: { task: "update the project timeline", assignee: "Sarah", priority: "high" }
 * }
 */
```

如果没有 `toolMessageContent`，我们会看到：

```ts  theme={null}
# console.log(result);
/**
 * {
 *   messages: [
 *     ...
 *     { role: "tool", content: "Returning structured response: {'task': 'update the project timeline', 'assignee': 'Sarah', 'priority': 'high'}", tool_call_id: "call_456", name: "MeetingAction" }
 *   ],
 *   structuredResponse: { task: "update the project timeline", assignee: "Sarah", priority: "high" }
 * }
 */
```

### 错误处理

模型在通过工具调用生成结构化输出时可能会出错。LangChain 提供了智能重试机制来自动处理这些错误。

#### 多个结构化输出错误

当模型错误地调用多个结构化输出工具时，智能体会在 [`ToolMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.ToolMessage.html) 中提供错误反馈并提示模型重试：

```ts  theme={null}
import * as z from "zod";
import { createAgent, toolStrategy } from "langchain";

const ContactInfo = z.object({
    name: z.string().describe("Person's name"),
    email: z.string().describe("Email address"),
});

const EventDetails = z.object({
    event_name: z.string().describe("Name of the event"),
    date: z.string().describe("Event date"),
});

const agent = createAgent({
    model: "gpt-5",
    tools: [],
    responseFormat: toolStrategy([ContactInfo, EventDetails]),
});

const result = await agent.invoke({
    messages: [
        {
        role: "user",
        content:
            "Extract info: John Doe (john@email.com) is organizing Tech Conference on March 15th",
        },
    ],
});

console.log(result);

/**
 * {
 *   messages: [
 *     { role: "user", content: "Extract info: John Doe (john@email.com) is organizing Tech Conference on March 15th" },
 *     { role: "assistant", content: "", tool_calls: [ { name: "ContactInfo", args: { name: "John Doe", email: "john@email.com" }, id: "call_1" }, { name: "EventDetails", args: { event_name: "Tech Conference", date: "March 15th" }, id: "call_2" } ] },
 *     { role: "tool", content: "Error: Model incorrectly returned multiple structured responses (ContactInfo, EventDetails) when only one is expected.\n Please fix your mistakes.", tool_call_id: "call_1", name: "ContactInfo" },
 *     { role: "tool", content: "Error: Model incorrectly returned multiple structured responses (ContactInfo, EventDetails) when only one is expected.\n Please fix your mistakes.", tool_call_id: "call_2", name: "EventDetails" },
 *     { role: "assistant", content: "", tool_calls: [ { name: "ContactInfo", args: { name: "John Doe", email: "john@email.com" }, id: "call_3" } ] },
 *     { role: "tool", content: "Returning structured response: {'name': 'John Doe', 'email': 'john@email.com'}", tool_call_id: "call_3", name: "ContactInfo" }
 *   ],
 *   structuredResponse: { name: "John Doe", email: "john@email.com" }
 * }
 */
```

#### 模式验证错误

当结构化输出与预期模式不匹配时，智能体会提供具体的错误反馈：

```ts  theme={null}
import * as z from "zod";
import { createAgent, toolStrategy } from "langchain";

const ProductRating = z.object({
    rating: z.number().min(1).max(5).describe("Rating from 1-5"),
    comment: z.string().describe("Review comment"),
});

const agent = createAgent({
    model: "gpt-5",
    tools: [],
    responseFormat: toolStrategy(ProductRating),
});

const result = await agent.invoke({
    messages: [
        {
        role: "user",
        content: "Parse this: Amazing product, 10/10!",
        },
    ],
});

console.log(result);

/**
 * {
 *   messages: [
 *     { role: "user", content: "Parse this: Amazing product, 10/10!" },
 *     { role: "assistant", content: "", tool_calls: [ { name: "ProductRating", args: { rating: 10, comment: "Amazing product" }, id: "call_1" } ] },
 *     { role: "tool", content: "Error: Failed to parse structured output for tool 'ProductRating': 1 validation error for ProductRating\nrating\n  Input should be less than or equal to 5 [type=less_than_equal, input_value=10, input_type=int].\n Please fix your mistakes.", tool_call_id: "call_1", name: "ProductRating" },
 *     { role: "assistant", content: "", tool_calls: [ { name: "ProductRating", args: { rating: 5, comment: "Amazing product" }, id: "call_2" } ] },
 *     { role: "tool", content: "Returning structured response: {'rating': 5, 'comment': 'Amazing product'}", tool_call_id: "call_2", name: "ProductRating" }
 *   ],
 *   structuredResponse: { rating: 5, comment: "Amazing product" }
 * }
 */
```

#### 错误处理策略

您可以使用 `handleErrors` 参数自定义错误处理方式：

**自定义错误消息：**

```ts  theme={null}
const responseFormat = toolStrategy(ProductRating, {
    handleError: "Please provide a valid rating between 1-5 and include a comment."
)

// Error message becomes:
// { role: "tool", content: "Please provide a valid rating between 1-5 and include a comment." }
```

**仅处理特定异常：**

```ts  theme={null}
import { ToolInputParsingException } from "@langchain/core/tools";

const responseFormat = toolStrategy(ProductRating, {
    handleError: (error: ToolStrategyError) => {
        if (error instanceof ToolInputParsingException) {
        return "Please provide a valid rating between 1-5 and include a comment.";
        }
        return error.message;
    }
)

// Only validation errors get retried with default message:
// { role: "tool", content: "Error: Failed to parse structured output for tool 'ProductRating': ...\n Please fix your mistakes." }
```

**处理多种异常类型：**

```ts  theme={null}
const responseFormat = toolStrategy(ProductRating, {
    handleError: (error: ToolStrategyError) => {
        if (error instanceof ToolInputParsingException) {
        return "Please provide a valid rating between 1-5 and include a comment.";
        }
        if (error instanceof CustomUserError) {
        return "This is a custom user error.";
        }
        return error.message;
    }
)
```

**无错误处理：**

```ts  theme={null}
const responseFormat = toolStrategy(ProductRating, {
    handleError: false  // All errors raised
)
```

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/structured-output.mdx) 或 [提交问题](https://github.com/langchain-ai/docs/issues/new/choose).
</Callout>

<Tip icon="terminal" iconType="regular">
  [将这些文档连接](/use-these-docs) 到 Claude, VSCode, 以及更多通过 MCP 获取实时答案。
</Tip>







## 两种策略的通俗理解

在深入了解具体策略之前，先用大白话理解一下这两种策略的本质区别。

### 为什么需要这两种策略？

这两个策略都是为了解决同一个问题：**让 AI 返回格式化、结构化的数据**。

比如你问 AI："帮我分析一下这个用户评价"，你希望 AI 返回的不是一段长篇大论的文字，而是像这样整齐的数据：

```json
{
  "rating": 5,
  "sentiment": "positive",
  "keyPoints": ["快递快", "价格贵"]
}
```

### 提供者策略 = "走正门"

**提供者策略就是直接让模型提供商（OpenAI、Anthropic 等）帮你搞定结构化输出。**

就像去银行办业务：

- 你直接去柜台（官方渠道）
- 银行有专门的表格给你填
- 填完直接交给银行，他们帮你验证格式对不对

**特点**：原生支持、最可靠、但只有部分模型支持

### 工具调用策略 = "曲线救国"

**工具调用策略就是假装你定义的数据格式是一个"工具"，让 AI 通过"调用工具"的方式输出结构化数据。**

就像你想让朋友给你一个标准格式的信息：

- 你给他一个填空表格（工具）
- 告诉他："你想回答我，就必须填这个表格"
- 他为了回答你，就只能把答案填进表格里

**特点**：兼容性好（几乎所有模型都支持）、有重试机制、稍微绕一点

### 两者对比

| 对比项       | 提供者策略       | 工具调用策略       |
| ------------ | ---------------- | ------------------ |
| **原理**     | 模型原生支持     | 伪装成工具调用     |
| **可靠性**   | 最高             | 高（有重试机制）   |
| **兼容性**   | 只有部分模型支持 | 几乎所有模型都支持 |
| **推荐场景** | 模型支持时优先用 | 模型不支持原生时用 |

### 智能选择

LangChain 很聪明，**默认情况下会自动选择**：

- 如果模型支持原生结构化输出 → 用**提供者策略**
- 如果不支持 → 自动回退到**工具调用策略**

**打个比喻**：

- **提供者策略** = 去官方餐厅点菜，菜单上有什么就点什么，厨师直接给你做
- **工具调用策略** = 自己带菜谱去餐厅，告诉厨师"按这个做"，虽然绕一点但也能吃上饭
