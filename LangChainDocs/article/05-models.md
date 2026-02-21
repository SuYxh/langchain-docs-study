# Models（模型）：AI 的大脑，Agent 的推理引擎

---

## 简单来说

**模型是 AI 的大脑**，负责思考、决策和生成内容。

就像人类的大脑一样，不同的模型有不同的能力：有的擅长逻辑推理，有的擅长创意写作，有的能看懂图片，有的能调用工具。

---

## 🎯 本节目标

读完本节，你将能够回答这些问题：

- ❓ 如何初始化一个模型？`initChatModel` 和直接实例化有什么区别？
- ❓ 模型的三种调用方式（invoke/stream/batch）分别适合什么场景？
- ❓ 什么是工具调用（Tool Calling）？模型如何使用工具？
- ❓ 结构化输出有什么用？如何让模型返回固定格式的数据？
- ❓ 什么是多模态？模型如何处理和生成图片？

---

## 核心痛点与解决方案

### 痛点：模型使用的四大难题

| 痛点 | 传统做法 | 有多痛苦 |
|------|----------|----------|
| **模型切换困难** | 每个模型有不同的 API，重写集成代码 | 想换模型？半天时间没了 |
| **调用方式单一** | 只能同步调用，等半天才返回结果 | 用户体验差，等得黄花菜都凉了 |
| **输出格式混乱** | 自由文本，解析困难，容易出错 | 写一堆正则表达式，还经常出错 |
| **能力扩展有限** | 只能聊天，不能调用工具，不能处理图片 | 功能太单一，满足不了复杂需求 |

**举个例子：** 你先用 OpenAI，后来想试试 Anthropic。

传统做法：
```
1. 看 OpenAI API 文档
2. 写 OpenAI 集成代码
3. 看 Anthropic API 文档
4. 重写 Anthropic 集成代码
5. 想加流式输出？再看文档，再重写
```

### 解决：LangChain 统一接口

```typescript
import { initChatModel } from "langchain";

// 1. 初始化 OpenAI
const openaiModel = await initChatModel("gpt-4.1");

// 2. 初始化 Anthropic
const anthropicModel = await initChatModel("claude-sonnet-4-5-20250929");

// 3. 调用方式完全一样
const response1 = await openaiModel.invoke("你好");
const response2 = await anthropicModel.invoke("你好");

// 4. 流式输出也一样
const stream1 = await openaiModel.stream("讲个故事");
const stream2 = await anthropicModel.stream("讲个故事");
```

**效果对比：**

| 指标 | 传统做法 | LangChain |
|------|----------|-----------|
| 模型切换 | 重写集成代码 | 改一行字符串 |
| 调用方式 | 单一同步调用 | 三种方式（invoke/stream/batch） |
| 输出格式 | 自由文本 | 结构化输出，格式统一 |
| 能力扩展 | 有限 | 工具调用、多模态、推理 |

---

## 生活化类比：模型就像不同的专家

| 模型类型 | 类比 | 擅长什么 | 适合场景 |
|---------|------|----------|----------|
| **GPT-4.1** | 全能科学家 | 逻辑推理、创意写作、工具调用 | 复杂任务，需要深度思考 |
| **Claude 3.5** | 文学教授 | 长文本理解、细腻表达 | 内容创作，文档分析 |
| **Gemini 2.5** | 多学科专家 | 多模态、代码、数学 | 图片分析，代码生成 |
| **Mistral Large** | 效率专家 | 速度快，成本低 | 高频简单任务 |
| **本地模型** | 私人顾问 | 数据隐私，无网络依赖 | 敏感数据处理 |

### 模型的能力层级

```
┌─────────────────────────────────────┐
│                                     │
│   🎯 基础能力：文本生成            │
│      ↓                              │
│   🛠️ 进阶能力：工具调用            │
│      ↓                              │
│   📊 高级能力：结构化输出            │
│      ↓                              │
│   🖼️ 专家能力：多模态                │
│      ↓                              │
│   🤔 顶级能力：推理                  │
│                                     │
└─────────────────────────────────────┘
```

---

## 基础用法：初始化与调用

### 初始化模型

**方法一：使用 `initChatModel`（推荐）**

```typescript
import { initChatModel } from "langchain";

// 1. 最简单的方式
const model = await initChatModel("gpt-4.1");

// 2. 带参数初始化
const modelWithParams = await initChatModel(
  "claude-sonnet-4-5-20250929",
  {
    temperature: 0.7,  // 创造性（0-1）
    timeout: 30,        // 超时时间（秒）
    maxTokens: 1000,    // 最大输出长度
  }
);
```

> 💡 **人话解读**：
> - `initChatModel` 是一个工厂函数，帮你自动创建模型实例
> - 第一个参数是模型标识，格式可以是 `model` 或 `provider:model`
> - 第二个参数是模型参数，控制输出行为

**方法二：直接实例化（高级用法）**

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

// OpenAI
const openaiModel = new ChatOpenAI({
  model: "gpt-4.1",
  temperature: 0.1,
  apiKey: "sk-xxx",  // 可以直接传 API Key
});

// Anthropic
const anthropicModel = new ChatAnthropic({
  model: "claude-3.5-sonnet",
  temperature: 0.7,
});
```

> 💡 **人话解读**：
> - 直接实例化更灵活，可以访问所有模型特定的参数
> - 需要安装对应的包：`@langchain/openai` 或 `@langchain/anthropic`
> - 适合需要深度定制的场景

### 三种调用方式

| 方式 | 作用 | 适合场景 | 示例 |
|------|------|----------|------|
| **invoke** | 同步调用，返回完整结果 | 简单任务，需要完整结果 | 短文本生成，分类 |
| **stream** | 流式调用，实时返回结果 | 用户界面，长文本生成 | 聊天机器人，故事生成 |
| **batch** | 批量调用，并行处理多个请求 | 批量任务，提高效率 | 批量翻译，批量总结 |

#### 1. invoke（同步调用）

```typescript
// 单个消息
const response = await model.invoke("为什么天空是蓝色的？");
console.log(response.text);

// 对话历史
const conversation = [
  { role: "system", content: "你是一个英语翻译助手" },
  { role: "user", content: "翻译：我爱编程" },
  { role: "assistant", content: "I love programming." },
  { role: "user", content: "翻译：我喜欢 LangChain" },
];

const response2 = await model.invoke(conversation);
console.log(response2.text);
```

> 💡 **人话解读**：
> - `invoke` 是最基本的调用方式
> - 可以传单个字符串，也可以传对话历史数组
> - 返回一个 `AIMessage` 对象，用 `.text` 获取文本内容

#### 2. stream（流式调用）

```typescript
// 基本流式调用
const stream = await model.stream("讲一个关于 AI 的故事，至少 500 字");

for await (const chunk of stream) {
  process.stdout.write(chunk.text);  // 实时输出，不换行
}

// 处理不同类型的内容块
const stream2 = await model.stream("天空为什么是蓝色的？");

for await (const chunk of stream2) {
  for (const block of chunk.contentBlocks) {
    if (block.type === "text") {
      console.log(`文本：${block.text}`);
    } else if (block.type === "reasoning") {
      console.log(`推理：${block.reasoning}`);
    }
  }
}
```

> 💡 **人话解读**：
> - `stream` 返回一个异步迭代器，用 `for await...of` 循环处理
> - 每一个 `chunk` 是模型生成的一部分内容
> - 适合需要实时反馈的场景，用户体验更好

#### 3. batch（批量调用）

```typescript
const responses = await model.batch([
  "为什么苹果会掉下来？",
  "如何学习编程？",
  "什么是人工智能？",
]);

for (const response of responses) {
  console.log(response.text);
  console.log("---");
}

// 控制并发数
const responses2 = await model.batch(
  ["问题1", "问题2", "问题3", "问题4", "问题5"],
  {
    maxConcurrency: 2,  // 最多同时处理 2 个请求
  }
);
```

> 💡 **人话解读**：
> - `batch` 接收一个数组，并行处理多个请求
> - 返回一个结果数组，顺序和输入一致
> - `maxConcurrency` 控制并发数，避免触发 API 速率限制

---

## 进阶能力：工具调用（Tool Calling）

### 什么是工具调用？

**工具调用** 是模型的超能力，让模型能够：

- 🔍 搜索网络
- 📊 查询数据库
- 📧 发送邮件
- 🎵 调用 API
- 🧮 执行代码

**就像人类使用工具一样**：遇到问题，找合适的工具，使用工具，根据结果继续解决问题。

### 工具调用的流程

```
┌─────────────────────────────────────┐
│                                     │
│   用户："北京明天天气怎么样？"         │
│      ↓                              │
│   模型（思考）："需要查天气"         │
│      ↓                              │
│   模型（行动）：调用 get_weather     │
│      ↓                              │
│   工具返回："北京明天晴，25°C"        │
│      ↓                              │
│   模型（总结）："明天北京晴，适合出门"  │
│      ↓                              │
│   用户：收到回答                     │
│                                     │
└─────────────────────────────────────┘
```

### 实现工具调用

```typescript
import { tool } from "langchain";
import * as z from "zod";
import { initChatModel } from "langchain";

// 1. 定义天气工具
const getWeather = tool(
  ({ location }) => `Weather in ${location}: Sunny, 25°C`,
  {
    name: "get_weather",
    description: "Get weather information for a location",
    schema: z.object({
      location: z.string().describe("The location to get weather for"),
    }),
  }
);

// 2. 初始化模型并绑定工具
const model = await initChatModel("gpt-4.1");
const modelWithTools = model.bindTools([getWeather]);

// 3. 调用模型
const response = await modelWithTools.invoke("北京明天天气怎么样？");

// 4. 处理工具调用
if (response.tool_calls) {
  // 执行工具
  const toolResults = [];
  for (const toolCall of response.tool_calls) {
    if (toolCall.name === "get_weather") {
      const result = await getWeather.invoke(toolCall);
      toolResults.push(result);
    }
  }
  
  // 将结果传回模型
  const finalResponse = await modelWithTools.invoke([
    { role: "user", content: "北京明天天气怎么样？" },
    response,
    ...toolResults,
  ]);
  
  console.log(finalResponse.text);
}
```

> 💡 **人话解读**：
> - `tool()` 定义工具，告诉模型这个工具能做什么
> - `bindTools()` 给模型绑定工具，让模型知道有哪些工具可用
> - 模型返回 `tool_calls` 表示要调用工具
> - 执行工具后，将结果传回模型，模型会生成最终回答

### 并行工具调用

```typescript
const modelWithTools = model.bindTools([getWeather, getTime]);

const response = await modelWithTools.invoke(
  "北京和上海的天气怎么样？现在几点了？"
);

// 模型可能会并行调用多个工具
console.log(response.tool_calls);
// [
//   { name: "get_weather", args: { location: "北京" } },
//   { name: "get_weather", args: { location: "上海" } },
//   { name: "getTime", args: {} }
// ]
```

> 💡 **人话解读**：
> - 很多模型支持并行工具调用，提高效率
> - 模型会根据问题的独立性决定是否并行调用
> - 可以同时获取多个信息，不用等待一个工具执行完再执行下一个

---

## 高级能力：结构化输出

### 什么是结构化输出？

**结构化输出** 让模型返回固定格式的数据，而不是自由文本。

**为什么要用？**

- ✅ 格式统一，方便后续处理
- ✅ 类型安全，减少错误
- ✅ 前端展示更方便
- ✅ 与数据库、API 集成更容易

### 使用结构化输出

**方式一：使用 Zod Schema（推荐）**

```typescript
import * as z from "zod";
import { initChatModel } from "langchain";

// 定义输出结构
const Movie = z.object({
  title: z.string().describe("电影标题"),
  year: z.number().describe("上映年份"),
  director: z.string().describe("导演"),
  rating: z.number().describe("评分，满分10分"),
  genres: z.array(z.string()).describe("电影类型"),
});

// 初始化模型
const model = await initChatModel("gpt-4.1");

// 绑定结构化输出
const modelWithStructure = model.withStructuredOutput(Movie);

// 调用模型
const response = await modelWithStructure.invoke(
  "提供《盗梦空间》的详细信息"
);

console.log(response);
// {
//   title: "盗梦空间",
//   year: 2010,
//   director: "克里斯托弗·诺兰",
//   rating: 9.3,
//   genres: ["科幻", "动作", "惊悚"]
// }
```

> 💡 **人话解读**：
> - `z.object()` 定义输出结构，每个字段都有类型和描述
> - `withStructuredOutput()` 告诉模型返回这个格式
> - 模型会严格按照格式返回数据，自动验证类型

**方式二：使用 JSON Schema**

```typescript
const jsonSchema = {
  "title": "Movie",
  "description": "电影信息",
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "description": "电影标题"
    },
    "year": {
      "type": "integer",
      "description": "上映年份"
    }
  },
  "required": ["title", "year"]
};

const modelWithStructure = model.withStructuredOutput(
  jsonSchema,
  { method: "jsonSchema" }
);
```

> 💡 **人话解读**：
> - JSON Schema 更通用，适合与其他系统集成
> - 但没有 Zod 的自动验证功能
> - 需要指定 `method: "jsonSchema"`

### 嵌套结构

```typescript
import * as z from "zod";

const Actor = z.object({
  name: z.string().describe("演员姓名"),
  role: z.string().describe("扮演角色"),
});

const MovieDetails = z.object({
  title: z.string().describe("电影标题"),
  year: z.number().describe("上映年份"),
  director: z.string().describe("导演"),
  cast: z.array(Actor).describe("演员阵容"),
  budget: z.number().nullable().describe("预算，单位：百万美元"),
});

const modelWithStructure = model.withStructuredOutput(MovieDetails);

const response = await modelWithStructure.invoke(
  "提供《复仇者联盟4》的详细信息，包括主要演员"
);
```

> 💡 **人话解读**：
> - 可以定义嵌套结构，比如电影包含演员数组
> - Zod 会自动处理嵌套结构的验证
> - 模型会返回完整的嵌套对象

---

## 专家能力：多模态

### 什么是多模态？

**多模态** 是模型的超能力，让模型能够：

- 🖼️ **理解图片**：看懂图片内容
- 🎵 **理解音频**：听懂语音
- 📹 **理解视频**：看懂视频内容
- 🎨 **生成图片**：根据描述生成图片
- 🎭 **生成音频**：生成语音

### 处理图片输入

```typescript
import { initChatModel } from "langchain";
import { HumanMessage } from "@langchain/core/messages";

const model = await initChatModel("gpt-4.1"); // GPT-4 支持图片

// 方式一：使用图片 URL
const message = new HumanMessage({
  content: [
    {
      type: "text",
      text: "这张图片里有什么？",
    },
    {
      type: "image",
      image_url: {
        url: "https://example.com/cat.jpg",
      },
    },
  ],
});

// 方式二：使用 base64 编码的图片
const message2 = new HumanMessage({
  content: [
    {
      type: "text",
      text: "分析这张图片",
    },
    {
      type: "image",
      data: "base64-encoded-image-data",
      mimeType: "image/jpeg",
    },
  ],
});

const response = await model.invoke(message);
console.log(response.text);
```

> 💡 **人话解读**：
> - 多模态模型需要接收特殊格式的消息
> - 消息内容是一个数组，包含文本和图片
> - 图片可以是 URL 或 base64 编码

### 生成图片输出

```typescript
const model = await initChatModel("dall-e-3"); // DALL-E 支持生成图片

const response = await model.invoke(
  "生成一张可爱的小猫在草地上玩耍的图片，风格：卡通"
);

console.log(response.contentBlocks);
// [
//   {
//     type: "text",
//     text: "这是一张可爱的小猫在草地上玩耍的图片"
//   },
//   {
//     type: "image",
//     data: "base64-encoded-image-data",
//     mimeType: "image/jpeg"
//   }
// ]
```

> 💡 **人话解读**：
> - 支持生成图片的模型会返回包含图片的内容块
> - `contentBlocks` 包含文本和图片数据
> - 可以将图片数据保存或直接显示

---

## 顶级能力：推理

### 什么是推理？

**推理** 是模型的高级能力，让模型能够：

- 🤔 分步思考
- 🧩 解决复杂问题
- 🎯 逻辑分析
- 🔍 演绎归纳

**就像人类解题一样**：遇到复杂问题，拆分成小步骤，一步步解决，最后得出结论。

### 查看模型的推理过程

```typescript
const model = await initChatModel("gpt-4.1");

const stream = await model.stream(
  "为什么 1 + 1 = 2？请详细解释数学原理"
);

for await (const chunk of stream) {
  for (const block of chunk.contentBlocks) {
    if (block.type === "reasoning") {
      console.log(`🤔 ${block.reasoning}`);
    } else if (block.type === "text") {
      console.log(`💬 ${block.text}`);
    }
  }
}
```

**输出示例：**

```
🤔 要解释为什么 1 + 1 = 2，需要从数学基础说起...
🤔 首先，我们需要理解自然数的定义...
💬 为什么 1 + 1 = 2 是数学中的一个基本公理，它基于自然数的定义...
🤔 在皮亚诺公理中，1 的后继数被定义为 2...
💬 因此，根据自然数的定义和加法的定义，1 + 1 必然等于 2...
```

> 💡 **人话解读**：
> - 支持推理的模型会在内容块中包含 `reasoning` 类型
> - 推理过程帮助模型理清思路，得出更准确的结论
> - 查看推理过程有助于理解模型的思考方式

---

## 业务场景：不同模型的最佳使用场景

| 场景 | 推荐模型 | 理由 | 调用方式 |
|------|----------|------|----------|
| **客服机器人** | GPT-4.1 | 逻辑清晰，工具调用能力强 | stream |
| **创意写作** | Claude 3.5 | 文笔优美，长文本能力强 | invoke |
| **图片分析** | GPT-4o | 多模态，理解图片能力强 | invoke |
| **代码生成** | Gemini 2.5 | 代码能力强，多语言支持 | invoke |
| **批量处理** | Mistral Large | 速度快，成本低 | batch |
| **敏感数据** | 本地模型（Ollama） | 数据隐私，无网络依赖 | invoke |

### 示例：智能客服机器人

**需求**：用户问天气，机器人查天气并回答

```typescript
import { initChatModel, tool } from "langchain";
import * as z from "zod";

// 1. 定义天气工具
const getWeather = tool(
  ({ city }) => {
    // 实际项目中调用真实的天气 API
    return `Weather in ${city}: 25°C, sunny`;
  },
  {
    name: "get_weather",
    description: "获取指定城市的天气",
    schema: z.object({ city: z.string() }),
  }
);

// 2. 初始化模型
const model = await initChatModel("gpt-4.1");
const modelWithTools = model.bindTools([getWeather]);

// 3. 处理用户请求
async function handleUserQuery(query: string) {
  let messages = [{ role: "user", content: query }];
  let response = await modelWithTools.invoke(messages);
  messages.push(response);

  // 处理工具调用
  if (response.tool_calls) {
    for (const toolCall of response.tool_calls) {
      if (toolCall.name === "get_weather") {
        const toolResult = await getWeather.invoke(toolCall);
        messages.push(toolResult);
      }
    }
    
    // 获取最终回答
    response = await modelWithTools.invoke(messages);
  }

  return response.text;
}

// 测试
const result = await handleUserQuery("北京今天天气怎么样？");
console.log(result);
// Output: 北京今天天气晴朗，温度 25°C，适合户外活动。
```

---

## 常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **API Key 错误** | 环境变量没配置或配置错误 | 检查环境变量，确保 API Key 正确 |
| **模型不支持某个功能** | 模型能力有限 | 查看模型文档，选择支持该功能的模型 |
| **流式调用没反应** | 代码没处理异步迭代器 | 确保使用 `for await...of` 循环 |
| **结构化输出格式错误** | Schema 定义不当或模型能力不足 | 简化 Schema，选择更强的模型 |
| **批量调用超时** | 并发数太高或请求太多 | 减少 `maxConcurrency`，分批处理 |
| **多模态不工作** | 模型不支持或格式错误 | 选择支持多模态的模型，检查消息格式 |

> 💡 **调试技巧**：
> - 先从简单的 `invoke` 调用开始
> - 逐步添加功能：工具调用 → 结构化输出 → 多模态
> - 用 `console.log` 打印中间结果
> - 检查模型的 `profile` 属性，了解模型能力

---

## 总结对比表

| 能力 | 描述 | 代表模型 | 适用场景 |
|------|------|----------|----------|
| **文本生成** | 生成文本内容 | 所有模型 | 聊天、写作、翻译 |
| **工具调用** | 调用外部工具 | GPT-4.1, Claude 3.5 | 客服、助手、自动化 |
| **结构化输出** | 返回固定格式数据 | GPT-4.1, Gemini 2.5 | 数据处理、API 集成 |
| **多模态** | 处理图片、音频 | GPT-4o, Gemini 2.5 | 图片分析、内容创作 |
| **推理** | 分步思考，解决复杂问题 | GPT-4.1, Claude 3.5 | 数学题、逻辑分析 |
| **速度** | 快速响应 | Mistral Large | 高频简单任务 |
| **隐私** | 本地运行，数据不离开设备 | Ollama 本地模型 | 敏感数据处理 |

---

## 核心要点回顾

1. ✅ **模型是 AI 的大脑**：负责思考、决策和生成内容

2. ✅ **三种初始化方式**：
   - `initChatModel`：简单快捷，推荐
   - 直接实例化：灵活定制，高级用法
   - 本地模型：隐私优先，无网络依赖

3. ✅ **三种调用方式**：
   - `invoke`：同步调用，适合简单任务
   - `stream`：流式调用，适合用户界面
   - `batch`：批量调用，适合批量处理

4. ✅ **四大超能力**：
   - **工具调用**：模型使用工具解决问题
   - **结构化输出**：返回固定格式数据
   - **多模态**：处理和生成图片
   - **推理**：分步思考，解决复杂问题

5. ✅ **模型选择**：根据任务需求选择合适的模型
   - 复杂任务：GPT-4.1, Claude 3.5
   - 图片处理：GPT-4o
   - 代码生成：Gemini 2.5
   - 速度优先：Mistral Large
   - 隐私优先：本地模型

---

## 下一步学习

| 主题 | 链接 | 说明 |
|------|------|------|
| Messages | [06-messages.md](./06-messages.md) | 消息类型和格式详解 |
| Tools | [07-tools.md](./07-tools.md) | 工具定义和使用 |
| Streaming Overview | [09-streaming-overview.md](./09-streaming-overview.md) | 流式输出详细指南 |
| Structured Output | [11-structured-output.md](./11-structured-output.md) | 结构化输出详细指南 |
| Multi-agent Overview | [20-multi-agent-overview.md](./20-multi-agent-overview.md) | 多代理系统概述 |

---

**记住：选择合适的模型，就像选择合适的专家**。不同的任务需要不同的专业知识，模型也一样。了解模型的能力边界，才能让 AI 发挥最大价值！🚀
