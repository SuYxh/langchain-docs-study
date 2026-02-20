> ## 文档索引
> 获取完整文档索引请访问：https://docs.langchain.com/llms.txt
> 在深入探索之前，请使用此文件发现所有可用页面。

# Messages (消息)

消息是 LangChain 中模型上下文的基本单位。它们代表模型的输入和输出，携带与 LLM 交互时表示对话状态所需的内容和元数据。

消息是包含以下内容的对象：

* <Icon icon="user" size={16} /> [**Role (角色)**](#message-types) - 标识消息类型（例如 `system`, `user`）
* <Icon icon="folder-closed" size={16} /> [**Content (内容)**](#message-content) - 代表消息的实际内容（如文本、图像、音频、文档等）
* <Icon icon="tag" size={16} /> [**Metadata (元数据)**](#message-metadata) - 可选字段，如响应信息、消息 ID 和 token 使用情况

LangChain 提供了一种标准的消息类型，适用于所有模型提供商，确保无论调用哪个模型都能保持一致的行为。

## 基本用法

使用消息的最简单方法是创建消息对象，并在 [调用](/oss/javascript/langchain/models#invocation) 时将其传递给模型。

```typescript  theme={null}
import { initChatModel, HumanMessage, SystemMessage } from "langchain";

const model = await initChatModel("gpt-5-nano");

const systemMsg = new SystemMessage("You are a helpful assistant."); // 你是一个乐于助人的助手。
const humanMsg = new HumanMessage("Hello, how are you?"); // 你好，你好吗？

const messages = [systemMsg, humanMsg];
const response = await model.invoke(messages);  // 返回 AIMessage
```

### 文本提示 (Text prompts)

文本提示是字符串——非常适合不需要保留对话历史记录的简单生成任务。

```typescript  theme={null}
const response = await model.invoke("Write a haiku about spring"); // 写一首关于春天的俳句
```

**在以下情况下使用文本提示：**

* 您有一个单独的、独立的请求
* 您不需要对话历史记录
* 您希望代码复杂性最小化

### 消息提示 (Message prompts)

或者，您可以通过提供消息对象列表将消息列表传递给模型。

```typescript  theme={null}
import { SystemMessage, HumanMessage, AIMessage } from "langchain";

const messages = [
  new SystemMessage("You are a poetry expert"), // 你是一位诗歌专家
  new HumanMessage("Write a haiku about spring"), // 写一首关于春天的俳句
  new AIMessage("Cherry blossoms bloom..."), // 樱花盛开...
];
const response = await model.invoke(messages);
```

**在以下情况下使用消息提示：**

* 管理多轮对话
* 处理多模态内容（图像、音频、文件）
* 包含系统指令

### 字典格式 (Dictionary format)

您也可以直接以 OpenAI 聊天完成格式指定消息。

```typescript  theme={null}
const messages = [
  { role: "system", content: "You are a poetry expert" }, // 你是一位诗歌专家
  { role: "user", content: "Write a haiku about spring" }, // 写一首关于春天的俳句
  { role: "assistant", content: "Cherry blossoms bloom..." }, // 樱花盛开...
];
const response = await model.invoke(messages);
```

## 消息类型 (Message types)

* <Icon icon="gear" size={16} /> [系统消息 (System message)](#system-message) - 告诉模型如何表现并提供交互上下文
* <Icon icon="user" size={16} /> [人类消息 (Human message)](#human-message) - 代表用户输入和与模型的交互
* <Icon icon="robot" size={16} /> [AI 消息 (AI message)](#ai-message) - 模型生成的响应，包括文本内容、工具调用和元数据
* <Icon icon="wrench" size={16} /> [工具消息 (Tool message)](#tool-message) - 代表 [工具调用](/oss/javascript/langchain/models#tool-calling) 的输出

### 系统消息 (System message)

[`SystemMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.SystemMessage.html) 代表一组初始化指令，用于引导模型的行为。您可以使用系统消息来设定基调、定义模型的角色并建立响应准则。

```typescript Basic instructions theme={null}
import { SystemMessage, HumanMessage, AIMessage } from "langchain";

const systemMsg = new SystemMessage("You are a helpful coding assistant."); // 你是一个乐于助人的编码助手。

const messages = [
  systemMsg,
  new HumanMessage("How do I create a REST API?"), // 我该如何创建一个 REST API？
];
const response = await model.invoke(messages);
```

```typescript Detailed persona theme={null}
import { SystemMessage, HumanMessage } from "langchain";

const systemMsg = new SystemMessage(`
You are a senior TypeScript developer with expertise in web frameworks.
Always provide code examples and explain your reasoning.
Be concise but thorough in your explanations.
`);
// 你是一位在 Web 框架方面具有专业知识的高级 TypeScript 开发人员。
// 始终提供代码示例并解释你的推理。
// 解释要简洁但透彻。

const messages = [
  systemMsg,
  new HumanMessage("How do I create a REST API?"),
];
const response = await model.invoke(messages);
```

***

### 人类消息 (Human message)

[`HumanMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.HumanMessage.html) 代表用户输入和交互。它们可以包含文本、图像、音频、文件以及任何其他数量的多模态 [内容](#message-content)。

#### 文本内容

```typescript Message object theme={null}
const response = await model.invoke([
  new HumanMessage("What is machine learning?"), // 什么是机器学习？
]);
```

```typescript String shortcut theme={null}
const response = await model.invoke("What is machine learning?");
```

#### 消息元数据

```typescript Add metadata theme={null}
const humanMsg = new HumanMessage({
  content: "Hello!",
  name: "alice",
  id: "msg_123",
});
```

<Note>
  `name` 字段的行为因提供商而异——有些用它来标识用户，有些则忽略它。要检查，请参考模型提供商的 [参考](https://reference.langchain.com/python/integrations/)。
</Note>

***

### AI 消息 (AI message)

[`AIMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessage.html) 代表模型调用的输出。它们可以包括多模态数据、工具调用以及您稍后可以访问的提供商特定元数据。

```typescript  theme={null}
const response = await model.invoke("Explain AI");
console.log(typeof response);  // AIMessage
```

[`AIMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessage.html) 对象在调用模型时返回，其中包含响应中的所有关联元数据。

提供商对消息类型的权重/上下文处理不同，这意味着有时手动创建一个新的 [`AIMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessage.html) 对象并将其插入消息历史记录中（就好像它来自模型一样）是有帮助的。

```typescript  theme={null}
import { AIMessage, SystemMessage, HumanMessage } from "langchain";

const aiMsg = new AIMessage("I'd be happy to help you with that question!"); // 我很乐意帮你回答这个问题！

const messages = [
  new SystemMessage("You are a helpful assistant"),
  new HumanMessage("Can you help me?"),
  aiMsg,  // 插入，就像它来自模型一样
  new HumanMessage("Great! What's 2+2?")
]

const response = await model.invoke(messages);
```

<Accordion title="属性">
  <ParamField path="text" type="string">
    消息的文本内容。
  </ParamField>

  <ParamField path="content" type="string | ContentBlock[]">
    消息的原始内容。
  </ParamField>

  <ParamField path="content_blocks" type="ContentBlock.Standard[]">
    消息的标准化内容块。（见 [内容](#message-content)）
  </ParamField>

  <ParamField path="tool_calls" type="ToolCall[] | None">
    模型进行的工具调用。

    如果没有调用工具，则为空。
  </ParamField>

  <ParamField path="id" type="string">
    消息的唯一标识符（由 LangChain 自动生成或在提供商响应中返回）
  </ParamField>

  <ParamField path="usage_metadata" type="UsageMetadata | None">
    消息的使用元数据，可用时包含 token 计数。见 [`UsageMetadata`](https://reference.langchain.com/javascript/types/_langchain_core.messages.UsageMetadata.html)。
  </ParamField>

  <ParamField path="response_metadata" type="ResponseMetadata | None">
    消息的响应元数据。
  </ParamField>
</Accordion>

#### 工具调用

当模型进行 [工具调用](/oss/javascript/langchain/models#tool-calling) 时，它们包含在 [`AIMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessage.html) 中：

```typescript  theme={null}
const modelWithTools = model.bindTools([getWeather]);
const response = await modelWithTools.invoke("What's the weather in Paris?");

for (const toolCall of response.tool_calls) {
  console.log(`Tool: ${toolCall.name}`);
  console.log(`Args: ${toolCall.args}`);
  console.log(`ID: ${toolCall.id}`);
}
```

其他结构化数据，如推理或引用，也可以出现在消息 [内容](/oss/javascript/langchain/messages#message-content) 中。

#### Token 使用情况

[`AIMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessage.html) 可以在其 [`usage_metadata`](https://reference.langchain.com/javascript/types/_langchain_core.messages.UsageMetadata.html) 字段中保存 token 计数和其他使用元数据：

```typescript  theme={null}
import { initChatModel } from "langchain";

const model = await initChatModel("gpt-5-nano");

const response = await model.invoke("Hello!");
console.log(response.usage_metadata);
```

```json  theme={null}
{
  "output_tokens": 304,
  "input_tokens": 8,
  "total_tokens": 312,
  "input_token_details": {
    "cache_read": 0
  },
  "output_token_details": {
    "reasoning": 256
  }
}
```

有关详细信息，请参阅 [`UsageMetadata`](https://reference.langchain.com/javascript/types/_langchain_core.messages.UsageMetadata.html)。

#### 流式传输和块

在流式传输期间，您将收到 [`AIMessageChunk`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessageChunk.html) 对象，这些对象可以组合成完整的消息对象：

<CodeGroup>
  ```typescript  theme={null}
  import { AIMessageChunk } from "langchain";

  let finalChunk: AIMessageChunk | undefined;
  for (const chunk of chunks) {
    finalChunk = finalChunk ? finalChunk.concat(chunk) : chunk;
  }
  ```
</CodeGroup>

<Note>
  了解更多：

  * [从聊天模型流式传输 token](/oss/javascript/langchain/models#stream)
  * [从 Agent 流式传输 token 和/或步骤](/oss/javascript/langchain/streaming)
</Note>

***

### 工具消息 (Tool message)

对于支持 [工具调用](/oss/javascript/langchain/models#tool-calling) 的模型，AI 消息可以包含工具调用。工具消息用于将单个工具执行的结果传回模型。

[工具](/oss/javascript/langchain/tools) 可以直接生成 [`ToolMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.ToolMessage.html) 对象。下面，我们展示一个简单的例子。在 [工具指南](/oss/javascript/langchain/tools) 中阅读更多内容。

```typescript  theme={null}
import { AIMessage, ToolMessage } from "langchain";

const aiMessage = new AIMessage({
  content: [],
  tool_calls: [{
    name: "get_weather",
    args: { location: "San Francisco" },
    id: "call_123"
  }]
});

const toolMessage = new ToolMessage({
  content: "Sunny, 72°F",
  tool_call_id: "call_123"
});

const messages = [
  new HumanMessage("What's the weather in San Francisco?"),
  aiMessage,  // 模型的工具调用
  toolMessage,  // 工具执行结果
];

const response = await model.invoke(messages);  // 模型处理结果
```

<Accordion title="属性">
  <ParamField path="content" type="string" required>
    工具调用的字符串化输出。
  </ParamField>

  <ParamField path="tool_call_id" type="string" required>
    此消息响应的工具调用的 ID。必须与 [`AIMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessage.html) 中的工具调用 ID 匹配。
  </ParamField>

  <ParamField path="name" type="string" required>
    被调用工具的名称。
  </ParamField>

  <ParamField path="artifact" type="dict">
    未发送给模型但可以通过编程方式访问的附加数据。
  </ParamField>
</Accordion>

<Note>
  `artifact` 字段存储不会发送给模型但可以通过编程方式访问的补充数据。这对于存储原始结果、调试信息或用于下游处理的数据非常有用，而不会弄乱模型的上下文。

  <Accordion title="示例：使用 artifact 存储检索元数据">
    例如，[检索](/oss/javascript/langchain/retrieval) 工具可以从文档中检索一段话供模型参考。如果消息 `content` 包含模型将引用的文本，则 `artifact` 可以包含文档标识符或应用程序可以使用的其他元数据（例如，用于呈现页面）。见下例：

    ```typescript  theme={null}
    import { ToolMessage } from "langchain";

    // 下游可用的 Artifact
    const artifact = { document_id: "doc_123", page: 0 };

    const toolMessage = new ToolMessage({
      content: "It was the best of times, it was the worst of times.",
      tool_call_id: "call_123",
      name: "search_books",
      artifact
    });
    ```

    请参阅 [RAG 教程](/oss/javascript/langchain/rag) 获取使用 LangChain 构建检索 [Agent](/oss/javascript/langchain/agents) 的端到端示例。
  </Accordion>
</Note>

***

## 消息内容 (Message content)

您可以将消息的内容视为发送给模型的数据有效负载。消息具有 `content` 属性，该属性是松散类型的，支持字符串和非类型化对象的列表（例如字典）。这允许在 LangChain 聊天模型中直接支持提供商原生结构，例如 [多模态](#multimodal) 内容和其他数据。

此外，LangChain 为文本、推理、引用、多模态数据、服务器端工具调用和其他消息内容提供专用的内容类型。请参阅下面的 [内容块](#standard-content-blocks)。

LangChain 聊天模型在 `content` 属性中接受消息内容。

这可以包含：

1. 一个字符串
2. 提供商原生格式的内容块列表
3. [LangChain 的标准内容块](#standard-content-blocks) 列表

请参阅下面使用 [多模态](#multimodal) 输入的示例：

```typescript  theme={null}
import { HumanMessage } from "langchain";

// 字符串内容
const humanMessage = new HumanMessage("Hello, how are you?");

// 提供商原生格式（例如，OpenAI）
const humanMessage = new HumanMessage({
  content: [
    { type: "text", text: "Hello, how are you?" },
    {
      type: "image_url",
      image_url: { url: "https://example.com/image.jpg" },
    },
  ],
});

// 标准内容块列表
const humanMessage = new HumanMessage({
  contentBlocks: [
    { type: "text", text: "Hello, how are you?" },
    { type: "image", url: "https://example.com/image.jpg" },
  ],
});
```

### 标准内容块 (Standard content blocks)

LangChain 为消息内容提供了跨提供商工作的标准表示。

消息对象实现了一个 `contentBlocks` 属性，该属性将惰性地将 `content` 属性解析为标准的、类型安全的表示形式。例如，从 [`ChatAnthropic`](/oss/javascript/integrations/chat/anthropic) 或 [`ChatOpenAI`](/oss/javascript/integrations/chat/openai) 生成的消息将包含相应提供商格式的 `thinking` 或 `reasoning` 块，但可以惰性解析为一致的 [`ReasoningContentBlock`](#content-block-reference) 表示形式：

<Tabs>
  <Tab title="Anthropic">
    ```typescript  theme={null}
    import { AIMessage } from "@langchain/core/messages";

    const message = new AIMessage({
      content: [
        {
          "type": "thinking",
          "thinking": "...",
          "signature": "WaUjzkyp...",
        },
        {
          "type":"text",
          "text": "...",
          "id": "msg_abc123",
        },
      ],
      response_metadata: { model_provider: "anthropic" },
    });

    console.log(message.contentBlocks);
    ```
  </Tab>

  <Tab title="OpenAI">
    ```typescript  theme={null}
    import { AIMessage } from "@langchain/core/messages";

    const message = new AIMessage({
      content: [
        {
          "type": "reasoning",
          "id": "rs_abc123",
          "summary": [
            {"type": "summary_text", "text": "summary 1"},
            {"type": "summary_text", "text": "summary 2"},
          ],
        },
        {"type": "text", "text": "..."},
      ],
      response_metadata: { model_provider: "openai" },
    });

    console.log(message.contentBlocks);
    ```
  </Tab>
</Tabs>

请参阅 [集成指南](/oss/javascript/integrations/providers/overview) 以开始使用您选择的推理提供商。

<Note>
  **序列化标准内容**

  如果 LangChain 之外的应用程序需要访问标准内容块表示形式，您可以选择将内容块存储在消息内容中。

  为此，您可以将 `LC_OUTPUT_VERSION` 环境变量设置为 `v1`。或者，使用 `outputVersion: "v1"` 初始化任何聊天模型：

  ```typescript  theme={null}
  import { initChatModel } from "langchain";

  const model = await initChatModel(
    "gpt-5-nano",
    { outputVersion: "v1" }
  );
  ```
</Note>

### 多模态 (Multimodal)

**多模态** 指的是处理不同形式数据的能力，如文本、音频、图像和视频。LangChain 包含这些数据的标准类型，可跨提供商使用。

[聊天模型](/oss/javascript/langchain/models) 可以接受多模态数据作为输入并将其作为输出生成。下面我们展示以多模态数据为特色的输入消息的简短示例。

<Note>
  额外的键可以包含在内容块的顶级或嵌套在 `"extras": {"key": value}` 中。

  例如，[OpenAI](/oss/javascript/integrations/chat/openai#pdfs) 和 [AWS Bedrock Converse](/oss/javascript/integrations/chat/bedrock) 需要 PDF 的文件名。有关详细信息，请参阅您选择的模型的 [提供商页面](/oss/javascript/integrations/providers/overview)。
</Note>

<CodeGroup>
  ```typescript Image input theme={null}
  // From URL
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this image." },
      {
        type: "image",
        source_type: "url",
        url: "https://example.com/path/to/image.jpg"
      },
    ],
  });

  // From base64 data
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this image." },
      {
        type: "image",
        source_type: "base64",
        data: "AAAAIGZ0eXBtcDQyAAAAAGlzb21tcDQyAAACAGlzb2...",
      },
    ],
  });

  // From provider-managed File ID
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this image." },
      { type: "image", source_type: "id", id: "file-abc123" },
    ],
  });
  ```

  ```typescript PDF document input theme={null}
  // From URL
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this document." },
      { type: "file", source_type: "url", url: "https://example.com/path/to/document.pdf", mime_type: "application/pdf" },
    ],
  });

  // From base64 data
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this document." },
      {
        type: "file",
        source_type: "base64",
        data: "AAAAIGZ0eXBtcDQyAAAAAGlzb21tcDQyAAACAGlzb2...",
        mime_type: "application/pdf",
      },
    ],
  });

  // From provider-managed File ID
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this document." },
      { type: "file", source_type: "id", id: "file-abc123" },
    ],
  });
  ```

  ```typescript Audio input theme={null}
  // From base64 data
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this audio." },
      {
        type: "audio",
        source_type: "base64",
        data: "AAAAIGZ0eXBtcDQyAAAAAGlzb21tcDQyAAACAGlzb2...",
      },
    ],
  });

  // From provider-managed File ID
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this audio." },
      { type: "audio", source_type: "id", id: "file-abc123" },
    ],
  });
  ```

  ```typescript Video input theme={null}
  // From base64 data
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this video." },
      {
        type: "video",
        source_type: "base64",
        data: "AAAAIGZ0eXBtcDQyAAAAAGlzb21tcDQyAAACAGlzb2...",
      },
    ],
  });

  // From provider-managed File ID
  const message = new HumanMessage({
    content: [
      { type: "text", text: "Describe the content of this video." },
      { type: "video", source_type: "id", id: "file-abc123" },
    ],
  });
  ```
</CodeGroup>

<Warning>
  并非所有模型都支持所有文件类型。请检查模型提供商的 [参考](https://reference.langchain.com/python/integrations/) 了解支持的格式和大小限制。
</Warning>

### 内容块参考 (Content block reference)

内容块（在创建消息或访问 `contentBlocks` 字段时）表示为类型化对象的列表。列表中的每个项目必须遵守以下块类型之一：

<AccordionGroup>
  <Accordion title="Core (核心)" icon="cube">
    <AccordionGroup>
      <Accordion title="ContentBlock.Text" icon="text">
        **目的:** 标准文本输出

        <ParamField body="type" type="string" required>
          总是 `"text"`
        </ParamField>

        <ParamField body="text" type="string" required>
          文本内容
        </ParamField>

        <ParamField body="annotations" type="Citation[]">
          文本的注释列表
        </ParamField>

        **示例:**

        ```typescript  theme={null}
        {
            type: "text",
            text: "Hello world",
            annotations: []
        }
        ```
      </Accordion>

      <Accordion title="ContentBlock.Reasoning" icon="brain">
        **目的:** 模型推理步骤

        <ParamField body="type" type="string" required>
          总是 `"reasoning"`
        </ParamField>

        <ParamField body="reasoning" type="string" required>
          推理内容
        </ParamField>

        **示例:**

        ```typescript  theme={null}
        {
            type: "reasoning",
            reasoning: "The user is asking about..."
        }
        ```
      </Accordion>
    </AccordionGroup>
  </Accordion>

  <Accordion title="Multimodal (多模态)" icon="images">
    <AccordionGroup>
      <Accordion title="ContentBlock.Multimodal.Image" icon="image">
        **目的:** 图像数据

        <ParamField body="type" type="string" required>
          总是 `"image"`
        </ParamField>

        <ParamField body="url" type="string">
          指向图像位置的 URL。
        </ParamField>

        <ParamField body="data" type="string">
          Base64 编码的图像数据。
        </ParamField>

        <ParamField body="fileId" type="string">
          外部文件存储系统中图像的引用（例如，OpenAI 或 Anthropic 的 Files API）。
        </ParamField>

        <ParamField body="mimeType" type="string">
          图像 [MIME 类型](https://www.iana.org/assignments/media-types/media-types.xhtml#image)（例如 `image/jpeg`, `image/png`）。Base64 数据需要。
        </ParamField>
      </Accordion>

      <Accordion title="ContentBlock.Multimodal.Audio" icon="volume-high">
        **目的:** 音频数据

        <ParamField body="type" type="string" required>
          总是 `"audio"`
        </ParamField>

        <ParamField body="url" type="string">
          指向音频位置的 URL。
        </ParamField>

        <ParamField body="data" type="string">
          Base64 编码的音频数据。
        </ParamField>

        <ParamField body="fileId" type="string">
          外部文件存储系统中音频文件的引用（例如，OpenAI 或 Anthropic 的 Files API）。
        </ParamField>

        <ParamField body="mimeType" type="string">
          音频 [MIME 类型](https://www.iana.org/assignments/media-types/media-types.xhtml#audio)（例如 `audio/mpeg`, `audio/wav`）。Base64 数据需要。
        </ParamField>
      </Accordion>

      <Accordion title="ContentBlock.Multimodal.Video" icon="video">
        **目的:** 视频数据

        <ParamField body="type" type="string" required>
          总是 `"video"`
        </ParamField>

        <ParamField body="url" type="string">
          指向视频位置的 URL。
        </ParamField>

        <ParamField body="data" type="string">
          Base64 编码的视频数据。
        </ParamField>

        <ParamField body="fileId" type="string">
          外部文件存储系统中视频文件的引用（例如，OpenAI 或 Anthropic 的 Files API）。
        </ParamField>

        <ParamField body="mimeType" type="string">
          视频 [MIME 类型](https://www.iana.org/assignments/media-types/media-types.xhtml#video)（例如 `video/mp4`, `video/webm`）。Base64 数据需要。
        </ParamField>
      </Accordion>

      <Accordion title="ContentBlock.Multimodal.File" icon="file">
        **目的:** 通用文件（PDF 等）

        <ParamField body="type" type="string" required>
          总是 `"file"`
        </ParamField>

        <ParamField body="url" type="string">
          指向文件位置的 URL。
        </ParamField>

        <ParamField body="data" type="string">
          Base64 编码的文件数据。
        </ParamField>

        <ParamField body="fileId" type="string">
          外部文件存储系统中文件的引用（例如，OpenAI 或 Anthropic 的 Files API）。
        </ParamField>

        <ParamField body="mimeType" type="string">
          文件 [MIME 类型](https://www.iana.org/assignments/media-types/media-types.xhtml)（例如 `application/pdf`）。Base64 数据需要。
        </ParamField>
      </Accordion>

      <Accordion title="ContentBlock.Multimodal.PlainText" icon="align-left">
        **目的:** 文档文本 (`.txt`, `.md`)

        <ParamField body="type" type="string" required>
          总是 `"text-plain"`
        </ParamField>

        <ParamField body="text" type="string" required>
          文本内容
        </ParamField>

        <ParamField body="title" type="string">
          文本内容的标题
        </ParamField>

        <ParamField body="mimeType" type="string">
          文本的 [MIME 类型](https://www.iana.org/assignments/media-types/media-types.xhtml)（例如 `text/plain`, `text/markdown`）
        </ParamField>
      </Accordion>
    </AccordionGroup>
  </Accordion>

  <Accordion title="Tool Calling (工具调用)" icon="wrench">
    <AccordionGroup>
      <Accordion title="ContentBlock.Tools.ToolCall" icon="function">
        **目的:** 函数调用

        <ParamField body="type" type="string" required>
          总是 `"tool_call"`
        </ParamField>

        <ParamField body="name" type="string" required>
          要调用的工具名称
        </ParamField>

        <ParamField body="args" type="object" required>
          传递给工具的参数
        </ParamField>

        <ParamField body="id" type="string" required>
          此工具调用的唯一标识符
        </ParamField>

        **示例:**

        ```typescript  theme={null}
        {
            type: "tool_call",
            name: "search",
            args: { query: "weather" },
            id: "call_123"
        }
        ```
      </Accordion>

      <Accordion title="ContentBlock.Tools.ToolCallChunk" icon="puzzle-piece">
        **目的:** 流式工具片段

        <ParamField body="type" type="string" required>
          总是 `"tool_call_chunk"`
        </ParamField>

        <ParamField body="name" type="string">
          被调用工具的名称
        </ParamField>

        <ParamField body="args" type="string">
          部分工具参数（可能是不完整的 JSON）
        </ParamField>

        <ParamField body="id" type="string">
          工具调用标识符
        </ParamField>

        <ParamField body="index" type="number | string" required>
          此块在流中的位置
        </ParamField>
      </Accordion>

      <Accordion title="ContentBlock.Tools.InvalidToolCall" icon="triangle-exclamation">
        **目的:** 格式错误的调用

        <ParamField body="type" type="string" required>
          总是 `"invalid_tool_call"`
        </ParamField>

        <ParamField body="name" type="string">
          调用失败的工具名称
        </ParamField>

        <ParamField body="args" type="string">
          无法解析的原始参数
        </ParamField>

        <ParamField body="error" type="string" required>
          错误描述
        </ParamField>

        **常见错误:** 无效的 JSON，缺少必填字段
      </Accordion>
    </AccordionGroup>
  </Accordion>

  <Accordion title="Server-Side Tool Execution (服务器端工具执行)" icon="server">
    <AccordionGroup>
      <Accordion title="ContentBlock.Tools.ServerToolCall" icon="wrench">
        **目的:** 在服务器端执行的工具调用。

        <ParamField body="type" type="string" required>
          总是 `"server_tool_call"`
        </ParamField>

        <ParamField body="id" type="string" required>
          与工具调用关联的标识符。
        </ParamField>

        <ParamField body="name" type="string" required>
          要调用的工具名称。
        </ParamField>

        <ParamField body="args" type="string" required>
          部分工具参数（可能是不完整的 JSON）
        </ParamField>
      </Accordion>

      <Accordion title="ContentBlock.Tools.ServerToolCallChunk" icon="puzzle-piece">
        **目的:** 流式服务器端工具调用片段

        <ParamField body="type" type="string" required>
          总是 `"server_tool_call_chunk"`
        </ParamField>

        <ParamField body="id" type="string">
          与工具调用关联的标识符。
        </ParamField>

        <ParamField body="name" type="string">
          被调用工具的名称
        </ParamField>

        <ParamField body="args" type="string">
          部分工具参数（可能是不完整的 JSON）
        </ParamField>

        <ParamField body="index" type="number | string">
          此块在流中的位置
        </ParamField>
      </Accordion>

      <Accordion title="ContentBlock.Tools.ServerToolResult" icon="box-open">
        **目的:** 搜索结果

        <ParamField body="type" type="string" required>
          总是 `"server_tool_result"`
        </ParamField>

        <ParamField body="tool_call_id" type="string" required>
          相应服务器工具调用的标识符。
        </ParamField>

        <ParamField body="id" type="string">
          与服务器工具结果关联的标识符。
        </ParamField>

        <ParamField body="status" type="string" required>
          服务器端工具的执行状态。`"success"` 或 `"error"`。
        </ParamField>

        <ParamField body="output">
          执行工具的输出。
        </ParamField>
      </Accordion>
    </AccordionGroup>
  </Accordion>

  <Accordion title="Provider-Specific Blocks (提供商特定块)" icon="plug">
    <Accordion title="ContentBlock.NonStandard" icon="asterisk">
      **目的:** 提供商特定的逃生舱

      <ParamField body="type" type="string" required>
        总是 `"non_standard"`
      </ParamField>

      <ParamField body="value" type="object" required>
        提供商特定的数据结构
      </ParamField>

      **用法:** 用于实验性或提供商独有的功能
    </Accordion>

    其他提供商特定的内容类型可以在每个模型提供商的 [参考文档](/oss/javascript/integrations/providers/overview) 中找到。
  </Accordion>
</AccordionGroup>

上述每个内容块在导入 [`ContentBlock`](https://reference.langchain.com/javascript/types/_langchain_core.messages.MessageContent.html) 类型时都可以作为单独的类型进行寻址。

```typescript  theme={null}
import { ContentBlock } from "langchain";

// Text block
const textBlock: ContentBlock.Text = {
    type: "text",
    text: "Hello world",
}

// Image block
const imageBlock: ContentBlock.Multimodal.Image = {
    type: "image",
    url: "https://example.com/image.png",
    mimeType: "image/png",
}
```

<Tip>
  在 [API 参考](https://reference.langchain.com/javascript/modules/_langchain_core.messages.html) 中查看规范类型定义。
</Tip>

<Info>
  内容块是在 LangChain v1 中作为消息的新属性引入的，旨在跨提供商标准化内容格式，同时保持与现有代码的向后兼容性。

  内容块不是 [`content`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.BaseMessage.html#content) 属性的替代品，而是一个新属性，可用于以标准化格式访问消息内容。
</Info>

## 与聊天模型一起使用

[聊天模型](/oss/javascript/langchain/models) 接受一系列消息对象作为输入，并返回一个 [`AIMessage`](https://reference.langchain.com/javascript/classes/_langchain_core.messages.AIMessage.html) 作为输出。交互通常是无状态的，因此简单的对话循环涉及使用不断增长的消息列表调用模型。

请参阅以下指南了解更多信息：

* 用于 [持久化和管理对话历史记录](/oss/javascript/langchain/short-term-memory) 的内置功能
* 管理上下文窗口的策略，包括 [修剪和总结消息](/oss/javascript/langchain/short-term-memory#common-patterns)

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/messages.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Tip icon="terminal" iconType="regular">
  [将这些文档连接](/use-these-docs) 到 Claude、VSCode 等，通过 MCP 获取实时答案。
</Tip>
