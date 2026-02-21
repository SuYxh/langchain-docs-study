# 快速开始：10 分钟创建你的第一个智能 Agent

---

## 简单来说

**快速开始只需 5 步**：定义工具 → 创建 Agent → 配置参数 → 运行测试 → 扩展功能。

就像做一道菜：准备食材（工具）→ 点火（创建 Agent）→ 调味（配置）→ 翻炒（运行）→ 摆盘（扩展）。

---

## 🎯 本节目标

读完本节，你将能够回答这些问题：

- ❓ 如何用 10 行代码创建一个会查天气的 Agent？
- ❓ 系统提示（System Prompt）有什么用？如何写一个好的系统提示？
- ❓ 什么是结构化输出？为什么要用它？
- ❓ 如何让 Agent 记住之前的对话？
- ❓ 真实世界的 Agent 需要哪些组件？

---

## 核心痛点与解决方案

### 痛点：AI 开发的"起步困难症"

| 痛点 | 传统做法 | 有多痛苦 |
|------|----------|----------|
| **不知从何开始** | 面对一堆文档，无从下手 | 看了一天文档，一行代码没写 |
| **功能太简单** | 只能调用模型，不会用工具 | 说是 AI 助手，其实就是个聊天机器人 |
| **难以扩展** | 想加个功能，要重写一半代码 | 越写越复杂，最后成了"代码屎山" |
| **没有记忆** | 聊完就忘，无法持续对话 | 用户："我刚才问什么来着？"

**举个例子：** 你想做一个能查天气的 AI 助手。

传统做法：
```
1. 注册天气 API 账号
2. 写天气 API 调用代码
3. 写 OpenAI 调用代码
4. 写逻辑：用户问天气就调用天气 API
5. 测试、调试、修复 bug
6. 想加记忆功能？重写一半代码
```

### 解决：LangChain 一键生成

```typescript
import { createAgent, tool } from "langchain";
import * as z from "zod";

// 1. 定义天气工具
const getWeather = tool(
  (input) => `It's always sunny in ${input.city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({ city: z.string() }),
  }
);

// 2. 创建 Agent
const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  tools: [getWeather],
});

// 3. 运行测试
const result = await agent.invoke({
  messages: [{ role: "user", content: "东京天气怎么样？" }],
});

console.log(result.messages.at(-1)?.content);
// Output: It's always sunny in Tokyo!
```

**效果对比：**

| 指标 | 传统做法 | LangChain |
|------|----------|-----------|
| 代码量 | 50+ 行 | 10+ 行 |
| 开发时间 | 半天 | 10 分钟 |
| 功能完整度 | 基础 | 完整（工具 + 推理 + 记忆） |
| 可扩展性 | 差 | 好（加工具就行） |

---

## 生活化类比：创建 Agent 就像开咖啡店

| 步骤 | 类比 | LangChain 对应 |
|------|------|---------------|
| **准备工具** | 咖啡机、磨豆机、冰箱 | `tool()` 定义工具 |
| **设定规则** | 咖啡店规则（"微笑服务"） | `systemPrompt` 设定行为 |
| **配置原料** | 咖啡豆、牛奶、糖 | `model` 配置模型 |
| **记住常客** | 会员卡、偏好记录 | `checkpointer` 添加记忆 |
| **规范输出** | 统一杯型、标签 | `responseFormat` 结构化输出 |
| **开始营业** | 迎接客人 | `invoke()` 运行 Agent |

---

## 步骤一：创建基础 Agent（10 行代码）

### 完整代码

```typescript
import { createAgent, tool } from "langchain";
import * as z from "zod";

// 1. 定义天气工具
const getWeather = tool(
  (input) => `It's always sunny in ${input.city}!`,
  {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({ city: z.string() }),
  }
);

// 2. 创建 Agent
const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  tools: [getWeather],
});

// 3. 运行测试
const result = await agent.invoke({
  messages: [{ role: "user", content: "东京天气怎么样？" }],
});

// 4. 查看结果
console.log(result.messages.at(-1)?.content);
// Output: It's always sunny in Tokyo!
```

### 代码解析

| 行号 | 代码 | 人话解读 |
|------|------|----------|
| 5-14 | `tool()` 定义 | "我创建了一个叫 get_weather 的工具，能查指定城市的天气" |
| 6 | 工具逻辑 | "工具被调用时，返回一个固定的天气信息" |
| 8-12 | 工具配置 | "告诉 Agent：这个工具叫什么、能做什么、需要什么参数" |
| 17-20 | `createAgent()` | "创建一个 AI 助手，用 Claude 模型，会使用天气工具" |
| 23-26 | `invoke()` | "启动任务：用户问东京天气，Agent 会自己决定调用什么工具" |
| 29 | 查看结果 | "从返回的消息中找到最后一条，那是 Agent 的回答" |

> 💡 **人话解读**：
> - `tool()` 函数就像"注册一个技能"，告诉 Agent 它会什么
> - `createAgent()` 就像"雇佣一个员工"，给他技能和大脑
> - `invoke()` 就像"给员工派任务"，他会自己想办法完成

---

## 步骤二：创建真实世界的 Agent

### 真实世界的 Agent 需要什么？

| 组件 | 作用 | 为什么需要 |
|------|------|------------|
| **系统提示** | 设定角色和行为 | 让 Agent 知道自己是谁，该怎么说话 |
| **多个工具** | 扩展能力 | 一个工具不够用，需要多个工具配合 |
| **模型配置** | 控制输出 | 调整温度、超时等参数，让输出更稳定 |
| **结构化输出** | 格式统一 | 让 Agent 返回固定格式的数据，方便后续处理 |
| **记忆** | 持续对话 | 记住之前的对话，像人类一样聊天 |

### 完整示例：天气预报助手（会说双关语）

```typescript
import { createAgent, tool } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import * as z from "zod";

// 1. 定义系统提示
const systemPrompt = `You are an expert weather forecaster, who speaks in puns.

You have access to two tools:

- get_weather_for_location: use this to get the weather for a specific location
- get_user_location: use this to get the user's location

If a user asks you for the weather, make sure you know the location. 
If you can tell from the question that they mean wherever they are, 
use the get_user_location tool to find their location.`;

// 2. 定义工具
const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,
  {
    name: "get_weather_for_location",
    description: "Get the weather for a specific location",
    schema: z.object({ city: z.string() }),
  }
);

const getUserLocation = tool(
  (_, config) => {
    const { user_id } = config.context;
    return user_id === "1" ? "Florida" : "SF";
  },
  {
    name: "get_user_location",
    description: "Get the user's current location",
    schema: z.object({}),
  }
);

// 3. 定义结构化输出格式
const responseFormat = z.object({
  punny_response: z.string(),
  weather_conditions: z.string().optional(),
});

// 4. 设置记忆
const checkpointer = new MemorySaver();

// 5. 创建 Agent
const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  systemPrompt,
  tools: [getUserLocation, getWeather],
  responseFormat,
  checkpointer,
});

// 6. 运行 Agent
const config = {
  configurable: { thread_id: "1" },
  context: { user_id: "1" },
};

// 第一次提问：问外面的天气
const response1 = await agent.invoke(
  { messages: [{ role: "user", content: "外面天气怎么样？" }] },
  config
);
console.log("First response:", response1.structuredResponse);

// 第二次提问：继续对话
const response2 = await agent.invoke(
  { messages: [{ role: "user", content: "谢谢！" }] },
  config
);
console.log("Second response:", response2.structuredResponse);
```

### 预期输出

```javascript
// 第一次回答
First response: {
  punny_response: "Florida is still having a 'sun-derful' day! The sunshine is playing 'ray-dio' hits all day long!",
  weather_conditions: "It's always sunny in Florida!"
}

// 第二次回答
Second response: {
  punny_response: "You're 'thund-erfully' welcome! It's always a 'breeze' to help you stay 'current' with the weather.",
  weather_conditions: undefined
}
```

> 💡 **人话解读**：
> - 系统提示让 Agent 成为"会说双关语的天气预报员"
> - `get_user_location` 工具让 Agent 知道用户在哪里
> - 结构化输出让 Agent 返回固定格式的数据
> - `checkpointer` 让 Agent 记住之前的对话

---

## 核心组件详解

### 1. 系统提示（System Prompt）

**什么是系统提示？** 系统提示是给 Agent 的"身份说明书"，告诉它：

- 你是谁（角色）
- 你该怎么说话（风格）
- 你有什么工具（能力）
- 你该怎么使用工具（规则）

**好的系统提示的特点：**

| 特点 | 示例 | 为什么重要 |
|------|------|------------|
| **具体** | "你是会说双关语的天气预报员" | 让 Agent 知道自己的定位 |
| **可操作** | "如果不知道位置，使用 get_user_location 工具" | 给 Agent 明确的行动指南 |
| **简洁** | 控制在 100-200 字 | 避免占用太多上下文空间 |
| **个性化** | "说话要幽默，多用天气相关的双关语" | 让 Agent 有独特的人格 |

### 2. 工具（Tools）

**工具的结构：**

```typescript
const myTool = tool(
  (input, config) => {
    // 工具逻辑：接收输入，返回结果
    return "工具执行结果";
  },
  {
    name: "tool_name",          // 工具名字
    description: "工具描述",     // Agent 靠这个决定何时使用
    schema: z.object({          // 参数验证
      param1: z.string(),
      param2: z.number(),
    }),
  }
);
```

**工具的参数：**

| 参数 | 类型 | 说明 | 例子 |
|------|------|------|------|
| `input` | `object` | 工具的输入参数 | `{ city: "Tokyo" }` |
| `config` | `object` | 上下文信息 | `{ context: { user_id: "1" } }` |

### 3. 结构化输出（Response Format）

**什么是结构化输出？** 让 Agent 返回固定格式的数据，而不是自由文本。

**为什么要用？**
- ✅ 格式统一，方便后续处理
- ✅ 类型安全，减少错误
- ✅ 前端展示更方便

**使用方法：**

```typescript
const responseFormat = z.object({
  name: z.string(),         // 必需字段
  age: z.number().optional(), // 可选字段
  tags: z.array(z.string()), // 数组
});

const agent = createAgent({
  // ...
  responseFormat, // 告诉 Agent 返回这个格式
});

// 使用时
const result = await agent.invoke({/* ... */});
console.log(result.structuredResponse); // 直接得到结构化对象
```

### 4. 记忆（Memory）

**什么是记忆？** 让 Agent 记住之前的对话，保持上下文连续性。

**如何使用？**

```typescript
import { MemorySaver } from "@langchain/langgraph";

// 创建记忆存储
const checkpointer = new MemorySaver();

const agent = createAgent({
  // ...
  checkpointer, // 添加记忆
});

// 运行时需要 thread_id
const config = {
  configurable: { thread_id: "conversation_1" }, // 每个对话一个 ID
};

// 第一次对话
await agent.invoke({/* ... */}, config);

// 第二次对话（用同一个 thread_id）
await agent.invoke({/* ... */}, config);
```

> ⚠️ **注意**：`MemorySaver` 是内存存储，重启后会丢失。生产环境要用持久化存储，比如数据库。

---

## 业务场景：不同类型的快速应用

| 场景 | 工具需求 | 系统提示 | 特色功能 |
|------|----------|----------|----------|
| **客服助手** | 查询订单、查物流、处理退款 | "你是专业客服，语气友好，解决问题"
 | 结构化输出：统一回复格式 |
| **个人助手** | 查天气、定闹钟、发邮件 | "你是贴心助手，记住用户偏好" | 记忆功能：记住用户习惯 |
| **学习助手** | 搜索资料、解答问题、生成练习 | "你是耐心老师，讲解详细，鼓励学生" | 多工具协作：搜索 + 总结 |
| **营销助手** | 生成文案、分析数据、找客户 | "你是创意营销专家，善于抓痛点" | 结构化输出：营销文案模板 |
| **代码助手** | 搜索文档、生成代码、调试错误 | "你是资深程序员，代码简洁，注释清晰" | 工具集成：查 API 文档 |

### 示例：客服助手

**工具：**
- `query_order`：查询订单状态
- `track_shipment`：查询物流信息
- `process_refund`：处理退款

**系统提示：**
```
You are a helpful customer service agent. 
Be friendly and patient. 
Always try to solve the customer's problem. 
If you need order information, use the query_order tool. 
If you need shipping information, use the track_shipment tool. 
If the customer wants a refund, use the process_refund tool.
```

**使用：**
```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "我的订单 #12345 发货了吗？" }]
});
```

---

## 常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| **Agent 不知道用工具** | 工具描述不够清晰 | 写更详细的 `description`，说明什么时候用 |
| **Agent 回答格式不对** | 没有使用结构化输出 | 添加 `responseFormat` |
| **Agent 记不住对话** | 没有添加记忆 | 使用 `checkpointer` 和 `thread_id` |
| **Agent 说话风格不对** | 系统提示不够具体 | 写更详细的系统提示，指定风格 |
| **运行速度慢** | 模型参数设置不当 | 调整 `temperature`、`timeout` 等参数 |
| **API Key 错误** | 环境变量没配置 | 检查环境变量是否正确设置 |

> 💡 **调试技巧**：
> - 先从简单的工具开始
> - 逐步添加功能
> - 用 `console.log` 打印中间结果
> - 检查 Agent 的思考过程

---

## 总结对比表

| 功能 | 基础 Agent | 真实世界 Agent | 区别 |
|------|------------|----------------|------|
| **工具数量** | 1 个 | 多个 | 能力更全面 |
| **系统提示** | 无 | 详细 | 行为更规范 |
| **模型配置** | 默认 | 自定义 | 输出更稳定 |
| **结构化输出** | 无 | 有 | 格式更统一 |
| **记忆** | 无 | 有 | 能持续对话 |
| **代码量** | 10 行 | 50 行 | 功能更完整 |
| **适用场景** | 快速测试 | 生产环境 | 更专业可靠 |

---

## 核心要点回顾

1. ✅ **快速开始 5 步**：定义工具 → 创建 Agent → 配置参数 → 运行测试 → 扩展功能

2. ✅ **10 行代码**：`tool()` 定义技能，`createAgent()` 创建助手，`invoke()` 启动任务

3. ✅ **系统提示**：给 Agent 设定角色、风格和规则，越具体越好

4. ✅ **结构化输出**：用 Zod 定义格式，让 Agent 返回固定结构的数据

5. ✅ **记忆功能**：用 `MemorySaver` 和 `thread_id` 让 Agent 记住对话

6. ✅ **真实世界**：多个工具、详细系统提示、自定义模型配置、结构化输出、记忆，这些是生产级 Agent 的标配

---

## 下一步学习

| 主题 | 链接 | 说明 |
|------|------|------|
| Agent 详解 | [04-agents.md](./04-agents.md) | 深入理解 Agent 的工作原理 |
| Models | [05-models.md](./05-models.md) | 模型配置和调用方式详解 |
| Tools | [07-tools.md](./07-tools.md) | 如何定义和使用工具 |
| Short-term Memory | [08-short-term-memory.md](./08-short-term-memory.md) | 会话记忆管理 |
| Structured Output | [11-structured-output.md](./11-structured-output.md) | 结构化输出详细指南 |

---

**记住：快速开始的目的不是写完美的代码，而是快速体验 LangChain 的魅力**。

先跑起来，再慢慢优化。你已经迈出了 AI 应用开发的第一步，接下来的路会越来越精彩！🚀
