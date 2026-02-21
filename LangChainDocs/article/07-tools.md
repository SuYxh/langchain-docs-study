# Tools：LangChain 中的能力扩展

## 简单来说
Tools 是 LangChain 中让 Agent 拥有超能力的工具包，它们就像 Agent 的“手臂”，让 AI 能够获取实时数据、执行代码、查询外部数据库，甚至在现实世界中采取行动。通过定义清晰的输入和输出，Tools 使得 AI 可以根据对话上下文自主决定何时调用何种工具。

## 本节目标
- 理解 Tools 在 LangChain 中的作用和价值
- 掌握创建自定义工具的方法
- 学会在工具中访问上下文和持久化存储
- 了解 ToolNode 的使用方法
- 掌握如何将工具集成到 Agent 中
- 了解内置工具的使用场景

## 什么是 Tools？

### 问题驱动
在构建 AI 应用时，我们经常遇到以下限制：
- AI 模型的知识截止到训练时间，无法获取实时信息
- 模型无法执行复杂计算或代码
- 无法与外部系统（如数据库、API）交互
- 无法在现实世界中执行操作

Tools 正是为了解决这些问题而设计的，它们扩展了 Agent 的能力边界，让 AI 能够与外部世界互动。

### 核心概念
Tools 是具有明确定义输入和输出的可调用函数，它们被传递给聊天模型。模型根据对话上下文决定何时调用工具以及提供什么输入参数。

### 类比教学
想象一下 Tools 就像智能手机的应用程序：
- 主屏幕（Agent）是用户交互的界面
- 应用程序（Tools）提供特定功能，如天气查询、地图导航、在线购物
- 用户（或系统）根据需要打开不同的应用程序来完成任务
- 每个应用程序都有自己的输入要求（如搜索词、位置）和输出格式（如天气信息、路线规划）

## 创建工具

### 基本工具定义
创建工具的最简单方法是使用 `langchain` 包中的 `tool` 函数，并使用 Zod 定义工具的输入模式：

```typescript
import * as z from "zod"
import { tool } from "langchain"

const searchDatabase = tool(
  ({ query, limit }) => `Found ${limit} results for '${query}'`,
  {
    name: "search_database",
    description: "Search the customer database for records matching the query.",
    schema: z.object({
      query: z.string().describe("Search terms to look for"),
      limit: z.number().describe("Maximum number of results to return"),
    }),
  }
);
```

### 工具的核心组成部分
1. **执行函数**：实际执行工具逻辑的函数，接收输入参数并返回结果
2. **名称**：工具的唯一标识符，用于模型识别和调用
3. **描述**：工具功能的详细说明，帮助模型理解何时使用此工具
4. **模式**：工具输入参数的结构化定义，使用 Zod 进行验证

## 访问上下文

工具的真正威力在于它们能够访问运行时信息，如对话历史、用户数据和持久化存储。

### 上下文（Context）
上下文提供了在调用时传递的不可变配置数据，适用于用户 ID、会话详情或应用程序特定设置等不应在对话过程中更改的信息。

```typescript
import * as z from "zod"
import { ChatOpenAI } from "@langchain/openai"
import { createAgent, tool } from "langchain"

const getUserName = tool(
  (_, config) => {
    return config.context.user_name
  },
  {
    name: "get_user_name",
    description: "Get the user's name.",
    schema: z.object({}),
  }
);

const contextSchema = z.object({
  user_name: z.string(),
});

const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4.1" }),
  tools: [getUserName],
  contextSchema,
});

const result = await agent.invoke(
  {
    messages: [{ role: "user", content: "What is my name?" }]
  },
  {
    context: { user_name: "John Smith" }
  }
);
```

### 长期记忆（Store）
`BaseStore` 提供了跨对话持久存在的存储，与短期记忆不同，保存到存储中的数据在未来会话中仍然可用。

```typescript
import * as z from "zod";
import { createAgent, tool } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

const store = new InMemoryStore();

// 访问记忆
const getUserInfo = tool(
  async ({ user_id }) => {
    const value = await store.get(["users"], user_id);
    console.log("get_user_info", user_id, value);
    return value;
  },
  {
    name: "get_user_info",
    description: "Look up user info.",
    schema: z.object({
      user_id: z.string(),
    }),
  }
);

// 更新记忆
const saveUserInfo = tool(
  async ({ user_id, name, age, email }) => {
    console.log("save_user_info", user_id, name, age, email);
    await store.put(["users"], user_id, { name, age, email });
    return "Successfully saved user info.";
  },
  {
    name: "save_user_info",
    description: "Save user info.",
    schema: z.object({
      user_id: z.string(),
      name: z.string(),
      age: z.number(),
      email: z.string(),
    }),
  }
);

const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4.1" }),
  tools: [getUserInfo, saveUserInfo],
  store,
});

// 第一个会话：保存用户信息
await agent.invoke({
  messages: [
    {
      role: "user",
      content: "Save the following user: userid: abc123, name: Foo, age: 25, email: foo@langchain.dev",
    },
  ],
});

// 第二个会话：获取用户信息
const result = await agent.invoke({
  messages: [
    { role: "user", content: "Get user info for user with id 'abc123'" },
  ],
});

console.log(result);
// Here is the user info for user with ID "abc123":
// - Name: Foo
// - Age: 25
// - Email: foo@langchain.dev
```

### 流式写入
在工具执行过程中，您可以使用 `config.writer` 实时流式传输更新，这对于在长时间运行的操作期间向用户提供进度反馈非常有用。

```typescript
import * as z from "zod";
import { tool, ToolRuntime } from "langchain";

const getWeather = tool(
  ({ city }, config: ToolRuntime) => {
    const writer = config.writer;

    // 在工具执行过程中流式传输自定义更新
    if (writer) {
      writer(`Looking up data for city: ${city}`);
      writer(`Acquired data for city: ${city}`);
    }

    return `It's always sunny in ${city}!`;
  },
  {
    name: "get_weather",
    description: "Get weather for a given city.",
    schema: z.object({ city: z.string() }),
  }
);
```

## ToolNode

`ToolNode` 是 LangGraph 工作流中执行工具的预构建节点，它自动处理并行工具执行、错误处理和状态注入。

### 基本使用

```typescript
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import * as z from "zod";

// 创建搜索工具
const search = tool(
  ({ query }) => `Results for: ${query}`,
  {
    name: "search",
    description: "Search for information.",
    schema: z.object({ query: z.string() }),
  }
);

// 创建计算器工具
const calculator = tool(
  ({ expression }) => String(eval(expression)),
  {
    name: "calculator",
    description: "Evaluate a math expression.",
    schema: z.object({ expression: z.string() }),
  }
);

// 使用工具创建 ToolNode
const toolNode = new ToolNode([search, calculator]);
```

### 错误处理

您可以配置工具错误的处理方式：

```typescript
import { ToolNode } from "@langchain/langgraph/prebuilt";

// 默认行为
const toolNode = new ToolNode(tools);

// 捕获所有错误
const toolNode = new ToolNode(tools, { handleToolErrors: true });

// 自定义错误消息
const toolNode = new ToolNode(tools, {
  handleToolErrors: "Something went wrong, please try again."
});
```

### 使用 tools_condition 进行路由

使用 `tools_condition` 基于 LLM 是否进行工具调用来进行条件路由：

```typescript
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";

// 假设 callLlm 是一个调用语言模型的函数
const builder = new StateGraph(MessagesAnnotation)
  .addNode("llm", callLlm)
  .addNode("tools", new ToolNode(tools))
  .addEdge("__start__", "llm")
  .addConditionalEdges("llm", toolsCondition)  // 路由到 "tools" 或 "__end__"
  .addEdge("tools", "llm");

const graph = builder.compile();
```

### 状态注入

工具可以通过 `ToolRuntime` 访问当前图状态，这使得工具能够根据整个对话历史和当前状态做出更智能的决策。

## 内置工具

LangChain 提供了大量预构建的工具和工具包，用于常见任务如网络搜索、代码解释、数据库访问等。这些现成的工具可以直接集成到您的 Agent 中，无需编写自定义代码。

### 常见内置工具类别
- **网络搜索**：获取实时网络信息
- **代码解释器**：执行和解释代码
- **数据库访问**：查询和操作数据库
- **文件操作**：读取和写入文件
- **API 集成**：与各种外部 API 交互
- **图像处理**：分析和处理图像

### 服务器端工具使用

一些聊天模型具有内置工具（如网络搜索、代码解释器），这些工具在服务器端执行。这些工具通常由模型提供商托管和维护，使用起来更加简单，但可能具有一些使用限制。

## 业务场景

### 场景一：实时天气助手
**问题**：如何构建一个能够提供实时天气信息的 AI 助手？

**解决方案**：创建一个天气查询工具并集成到 Agent 中

```typescript
import * as z from "zod";
import { tool, createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

// 模拟天气 API 调用
function fetchWeatherFromAPI(city: string): string {
  // 实际应用中这里会调用真实的天气 API
  const weatherData = {
    "北京": "晴天，25°C",
    "上海": "多云，22°C",
    "广州": "雨天，28°C",
    "深圳": "晴天，26°C"
  };
  
  return weatherData[city] || `未知城市: ${city}`;
}

// 创建天气工具
const getWeather = tool(
  ({ city }) => {
    return fetchWeatherFromAPI(city);
  },
  {
    name: "get_weather",
    description: "获取指定城市的实时天气信息",
    schema: z.object({
      city: z.string().describe("要查询天气的城市名称"),
    }),
  }
);

// 创建 Agent
const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4.1" }),
  tools: [getWeather],
  systemPrompt: "你是一个天气助手，能够使用天气工具查询实时天气信息。请根据用户的问题，使用工具获取最新的天气数据。",
});

// 测试天气助手
const result = await agent.invoke({
  messages: [{ role: "user", content: "北京今天的天气怎么样？" }]
});

console.log(result.content);
```

### 场景二：客户数据库查询
**问题**：如何构建一个能够查询客户数据库的 AI 客服助手？

**解决方案**：创建一个数据库查询工具并集成到 Agent 中

```typescript
import * as z from "zod";
import { tool, createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

// 模拟客户数据库
const customerDatabase = [
  { id: 1, name: "张三", email: "zhangsan@example.com", membership: "premium" },
  { id: 2, name: "李四", email: "lisi@example.com", membership: "standard" },
  { id: 3, name: "王五", email: "wangwu@example.com", membership: "premium" },
];

// 创建数据库查询工具
const searchCustomers = tool(
  ({ query, limit = 5 }) => {
    const results = customerDatabase.filter(customer => 
      customer.name.includes(query) || 
      customer.email.includes(query)
    ).slice(0, limit);
    
    if (results.length === 0) {
      return "没有找到匹配的客户记录。";
    }
    
    return `找到 ${results.length} 条匹配记录：\n${results.map(c => 
      `ID: ${c.id}, 姓名: ${c.name}, 邮箱: ${c.email}, 会员等级: ${c.membership}`
    ).join("\n" )}`;
  },
  {
    name: "search_customers",
    description: "在客户数据库中搜索匹配查询条件的记录",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
      limit: z.number().optional().describe("返回结果的最大数量"),
    }),
  }
);

// 创建客服助手 Agent
const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4.1" }),
  tools: [searchCustomers],
  systemPrompt: "你是一位客服助手，能够使用客户数据库查询工具获取客户信息。请根据用户的问题，使用工具查询相关客户数据。",
});

// 测试客服助手
const result = await agent.invoke({
  messages: [{ role: "user", content: "帮我查找所有 premium 会员的信息" }]
});

console.log(result.content);
```

### 场景三：多工具协作助手
**问题**：如何构建一个能够同时使用多个工具的综合 AI 助手？

**解决方案**：创建多个工具并集成到同一个 Agent 中

```typescript
import * as z from "zod";
import { tool, createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

// 1. 天气工具
const getWeather = tool(
  ({ city }) => {
    const weatherData = {
      "北京": "晴天，25°C",
      "上海": "多云，22°C",
      "广州": "雨天，28°C",
      "深圳": "晴天，26°C"
    };
    return weatherData[city] || `未知城市: ${city}`;
  },
  {
    name: "get_weather",
    description: "获取指定城市的实时天气信息",
    schema: z.object({ city: z.string().describe("要查询天气的城市名称") }),
  }
);

// 2. 计算器工具
const calculator = tool(
  ({ expression }) => {
    try {
      // 使用更安全的方式执行计算
      // 注意：在生产环境中应该使用更严格的表达式验证
      const result = eval(expression);
      return `计算结果: ${result}`;
    } catch (error) {
      return `计算错误: ${error.message}`;
    }
  },
  {
    name: "calculator",
    description: "计算数学表达式的值",
    schema: z.object({ expression: z.string().describe("要计算的数学表达式") }),
  }
);

// 3. 时间工具
const getCurrentTime = tool(
  () => {
    const now = new Date();
    return `当前时间: ${now.toLocaleString("zh-CN")}`;
  },
  {
    name: "get_current_time",
    description: "获取当前的日期和时间",
    schema: z.object({}),
  }
);

// 创建综合助手 Agent
const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4.1" }),
  tools: [getWeather, calculator, getCurrentTime],
  systemPrompt: "你是一个综合助手，能够使用多种工具来回答用户的问题。请根据用户的问题，选择合适的工具来获取信息并提供准确的回答。",
});

// 测试综合助手
async function testAssistant() {
  console.log("测试 1: 天气查询");
  const weatherResult = await agent.invoke({
    messages: [{ role: "user", content: "北京今天的天气怎么样？" }]
  });
  console.log(weatherResult.content);
  
  console.log("\n测试 2: 数学计算");
  const calcResult = await agent.invoke({
    messages: [{ role: "user", content: "计算 123 * 456 的结果" }]
  });
  console.log(calcResult.content);
  
  console.log("\n测试 3: 当前时间");
  const timeResult = await agent.invoke({
    messages: [{ role: "user", content: "现在几点了？" }]
  });
  console.log(timeResult.content);
  
  console.log("\n测试 4: 多工具协作");
  const multiResult = await agent.invoke({
    messages: [{ role: "user", content: "北京现在的天气怎么样？现在几点了？然后计算一下 100 + 200 的结果。" }]
  });
  console.log(multiResult.content);
}

testAssistant();
```

## 技术要点

### 1. 工具设计最佳实践
- **清晰的描述**：编写详细、准确的工具描述，帮助模型理解工具的用途
- **精确的模式**：使用 Zod 定义严格的输入模式，确保工具接收到正确格式的数据
- **合理的错误处理**：在工具中添加错误处理逻辑，提高系统的健壮性
- **适度的功能**：每个工具应该专注于一个特定功能，避免创建过于复杂的工具

### 2. 上下文管理
- **会话上下文**：使用 context 传递会话相关的配置信息
- **持久化存储**：使用 store 保存跨会话的持久化数据
- **状态访问**：通过 ToolRuntime 访问当前图状态

### 3. 工具集成策略
- **工具选择**：根据业务需求选择合适的工具或创建自定义工具
- **工具绑定**：使用 `bindTools` 为模型绑定工具
- **工具路由**：使用 `toolsCondition` 在 LangGraph 中进行条件路由
- **错误处理**：配置适当的错误处理策略，确保系统稳定性

### 4. 性能优化
- **工具执行时间**：避免创建执行时间过长的工具，影响用户体验
- **并行执行**：利用 ToolNode 的并行执行能力，提高多工具使用效率
- **流式输出**：对于长时间运行的工具，使用流式输出提供实时反馈

### 5. 安全考虑
- **输入验证**：严格验证工具输入，防止恶意输入
- **权限控制**：确保工具只能访问授权的资源
- **速率限制**：对外部 API 调用实施速率限制，避免过度使用
- **敏感信息**：避免在工具输出中包含敏感信息

## 总结

Tools 是 LangChain 中扩展 Agent 能力的关键组件，它们使得 AI 从一个只能处理文本的系统转变为一个能够与外部世界交互的智能助手。通过创建自定义工具或使用内置工具，开发者可以构建功能强大、能够解决实际问题的 AI 应用。

### 核心优势
- **能力扩展**：突破模型固有的知识和能力限制
- **实时数据**：获取最新的外部信息
- **系统集成**：与现有系统和服务无缝集成
- **自主决策**：让模型根据上下文自主决定工具使用
- **灵活定制**：根据业务需求创建专用工具

### 应用前景
Tools 的应用前景非常广阔，从简单的信息查询到复杂的业务流程自动化，都可以通过 Tools 实现。未来，随着更多专业领域工具的开发和集成，LangChain 基于 Tools 的应用将会在各个行业发挥越来越重要的作用。

通过掌握 Tools 的使用方法，您可以构建出真正具有实用价值的 AI 应用，让 AI 不仅能够理解和生成内容，还能够执行具体任务，为用户提供更加全面和个性化的服务。