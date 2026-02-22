# 流式处理概述：LangChain 中的实时响应

## 简单来说
流式处理是 LangChain 中实现实时响应的核心机制，它能够在完整响应生成之前就开始向用户展示输出，大大提升用户体验。通过不同的流式模式（updates、messages、custom），开发者可以灵活地向应用程序传递代理进度、LLM tokens 和自定义更新。

## 本节目标
- 理解流式处理在 AI 应用中的重要性
- 掌握不同流式模式的特点和使用场景
- 学会流式传输代理进度更新
- 学会流式传输 LLM tokens
- 学会发送自定义流式更新
- 了解如何组合使用多种流式模式

## 为什么需要流式处理？

### 问题驱动
在构建 AI 应用时，我们经常遇到以下挑战：
- LLM 生成响应需要较长时间，用户等待体验差
- 用户无法知道 AI 正在进行什么操作
- 长时间的"空白等待"让用户感到不确定
- 复杂任务执行过程中缺乏进度反馈

流式处理正是为了解决这些问题而设计的，它能够在响应完全生成之前就开始显示输出，让用户实时看到 AI 的"思考过程"。

### 核心优势
- **即时反馈**：用户立即看到 AI 正在工作
- **渐进式显示**：内容逐步呈现，而非一次性加载
- **进度可视化**：显示当前执行阶段和状态
- **更好的 UX**：显著减少用户感知的等待时间

### 类比教学
想象一下流式处理就像观看直播：
- **传统方式（非流式）**：就像看电影，必须等整部片子拍完才能观看
- **流式处理**：就像看直播，内容实时传输，边制作边观看

再比如餐厅上菜：
- **传统方式**：等所有菜都做好才一起上
- **流式处理**：做好一道上一道，顾客可以边吃边等

## 流式模式

LangChain 支持三种主要的流式模式：

| 模式 | 描述 | 使用场景 |
|------|------|----------|
| `updates` | 每个代理步骤后流式传输状态更新 | 显示代理执行进度 |
| `messages` | 流式传输 LLM 生成的 token 和元数据 | 实时显示 AI 生成的文本 |
| `custom` | 从工具中流式传输自定义数据 | 发送进度信息、状态更新 |

## 流式传输代理进度

使用 `streamMode: "updates"` 来流式传输代理的执行进度，每个代理步骤完成后都会发出一个事件。

```typescript
import z from "zod";
import { createAgent, tool } from "langchain";

// 创建天气工具
const getWeather = tool(
    async ({ city }) => {
        return `The weather in ${city} is always sunny!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
            city: z.string(),
        }),
    }
);

// 创建代理
const agent = createAgent({
    model: "gpt-5-nano",
    tools: [getWeather],
});

// 流式传输代理进度
for await (const chunk of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "updates" }
)) {
    const [step, content] = Object.entries(chunk)[0];
    console.log(`步骤: ${step}`);
    console.log(`内容: ${JSON.stringify(content, null, 2)}`);
}
```

### 输出示例
当代理调用一次工具时，你会看到以下更新序列：

1. **LLM 节点**：AIMessage 包含工具调用请求
2. **工具节点**：ToolMessage 包含执行结果
3. **LLM 节点**：最终 AI 响应

```
步骤: model
内容: {
  "messages": [
    {
      "kwargs": {
        "tool_calls": [
          {
            "name": "get_weather",
            "args": { "city": "San Francisco" },
            "type": "tool_call",
            "id": "call_0qLS2Jp3MCmaKJ5MAYtr4jJd"
          }
        ]
      }
    }
  ]
}

步骤: tools
内容: {
  "messages": [
    {
      "kwargs": {
        "content": "The weather in San Francisco is always sunny!",
        "name": "get_weather"
      }
    }
  ]
}

步骤: model
内容: {
  "messages": [
    {
      "kwargs": {
        "content": "旧金山的天气总是阳光明媚！如果你需要更详细的天气信息，我可以为你获取。"
      }
    }
  ]
}
```

## 流式传输 LLM Tokens

使用 `streamMode: "messages"` 来流式传输 LLM 生成的每个 token：

```typescript
import z from "zod";
import { createAgent, tool } from "langchain";

// 创建天气工具
const getWeather = tool(
    async ({ city }) => {
        return `The weather in ${city} is always sunny!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
            city: z.string(),
        }),
    }
);

// 创建代理
const agent = createAgent({
    model: "gpt-4.1-mini",
    tools: [getWeather],
});

// 流式传输 LLM tokens
for await (const [token, metadata] of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "messages" }
)) {
    console.log(`节点: ${metadata.langgraph_node}`);
    console.log(`内容: ${JSON.stringify(token.contentBlocks, null, 2)}`);
}
```

### 使用场景
- **打字机效果**：逐字显示 AI 生成的回复
- **实时聊天**：模拟真人对话的即时感
- **长文本生成**：让用户在生成过程中就能开始阅读

## 自定义流式更新

使用 `config.writer` 从工具中发送自定义更新，这对于长时间运行的操作特别有用：

```typescript
import z from "zod";
import { tool, createAgent } from "langchain";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

// 创建带自定义更新的天气工具
const getWeather = tool(
    async (input, config: LangGraphRunnableConfig) => {
        // 流式传输自定义数据
        config.writer?.(`正在查找城市数据: ${input.city}`);
        
        // 模拟获取城市数据
        await new Promise(resolve => setTimeout(resolve, 500));
        
        config.writer?.(`已获取城市数据: ${input.city}`);
        
        // 模拟获取天气数据
        await new Promise(resolve => setTimeout(resolve, 500));
        
        config.writer?.(`正在分析天气数据...`);
        
        return `It's always sunny in ${input.city}!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
            city: z.string().describe("The city to get weather for."),
        }),
    }
);

// 创建代理
const agent = createAgent({
    model: "gpt-4.1-mini",
    tools: [getWeather],
});

// 流式传输自定义更新
for await (const chunk of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "custom" }
)) {
    console.log(chunk);
}
```

### 输出示例
```
正在查找城市数据: San Francisco
已获取城市数据: San Francisco
正在分析天气数据...
```

### 使用场景
- **进度反馈**：显示 "已处理 10/100 条记录"
- **状态更新**：显示 "正在连接数据库..."
- **日志输出**：实时显示操作日志

## 组合多种流式模式

你可以通过传递数组来同时使用多种流式模式：

```typescript
import z from "zod";
import { tool, createAgent } from "langchain";
import { LangGraphRunnableConfig } from "@langchain/langgraph";

// 创建带自定义更新的天气工具
const getWeather = tool(
    async (input, config: LangGraphRunnableConfig) => {
        config.writer?.(`正在查找城市数据: ${input.city}`);
        config.writer?.(`已获取城市数据: ${input.city}`);
        return `It's always sunny in ${input.city}!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
            city: z.string().describe("The city to get weather for."),
        }),
    }
);

// 创建代理
const agent = createAgent({
    model: "gpt-4.1-mini",
    tools: [getWeather],
});

// 同时使用多种流式模式
for await (const [streamMode, chunk] of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: ["updates", "messages", "custom"] }
)) {
    console.log(`[${streamMode}]: ${JSON.stringify(chunk, null, 2)}`);
}
```

### 输出格式
当使用多种模式时，流式输出是 `[mode, chunk]` 元组：
- `mode`：流式模式名称（updates、messages、custom）
- `chunk`：该模式的数据

## 禁用流式传输

在某些情况下，你可能需要禁用特定模型的流式传输：

```typescript
import { ChatOpenAI } from "@langchain/openai";

// 禁用流式传输
const model = new ChatOpenAI({
  model: "gpt-4.1",
  streaming: false,  // 禁用流式传输
});
```

### 禁用流式传输的场景
- **多代理系统**：控制哪些代理输出流式内容
- **混合模型**：部分模型不支持流式传输
- **部署到 LangSmith**：防止某些模型输出被流式传输到客户端

## 业务场景

### 场景一：智能客服聊天机器人
**问题**：如何构建一个能够实时显示回复的客服聊天机器人？

**解决方案**：使用 messages 模式实现打字机效果

```typescript
import z from "zod";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

// 创建知识库查询工具
const searchKnowledgeBase = tool(
    async ({ query }) => {
        // 模拟知识库查询
        return `关于 "${query}" 的答案：这是来自知识库的详细解答...`;
    },
    {
        name: "search_knowledge_base",
        description: "搜索客服知识库获取答案",
        schema: z.object({
            query: z.string().describe("搜索关键词"),
        }),
    }
);

// 创建客服代理
const supportAgent = createAgent({
    model: new ChatOpenAI({ model: "gpt-4.1" }),
    tools: [searchKnowledgeBase],
    systemPrompt: "你是一个专业的客服助手，请用友好的语气回答用户问题。",
});

// 模拟聊天界面
async function handleUserMessage(userMessage: string) {
    console.log(`用户: ${userMessage}\n`);
    console.log("客服: ");
    
    // 使用 messages 模式实现打字机效果
    for await (const [token, metadata] of await supportAgent.stream(
        { messages: [{ role: "user", content: userMessage }] },
        { streamMode: "messages" }
    )) {
        // 只输出文本内容
        if (token.content) {
            process.stdout.write(token.content);
        }
    }
    
    console.log("\n");
}

// 测试客服对话
handleUserMessage("如何重置我的密码？");
```

### 场景二：数据分析助手
**问题**：如何构建一个能够实时显示分析进度的数据分析助手？

**解决方案**：使用 custom 模式发送进度更新

```typescript
import z from "zod";
import { tool, createAgent } from "langchain";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

// 创建数据分析工具
const analyzeData = tool(
    async ({ dataSource, analysisType }, config: LangGraphRunnableConfig) => {
        const writer = config.writer;
        
        // 步骤 1：连接数据源
        writer?.(`🔗 正在连接数据源: ${dataSource}`);
        await new Promise(resolve => setTimeout(resolve, 500));
        writer?.(`✅ 数据源连接成功`);
        
        // 步骤 2：加载数据
        writer?.(`📊 正在加载数据...`);
        await new Promise(resolve => setTimeout(resolve, 800));
        writer?.(`✅ 已加载 10,000 条记录`);
        
        // 步骤 3：数据清洗
        writer?.(`🧹 正在清洗数据...`);
        await new Promise(resolve => setTimeout(resolve, 600));
        writer?.(`✅ 数据清洗完成，有效记录 9,850 条`);
        
        // 步骤 4：执行分析
        writer?.(`📈 正在执行 ${analysisType} 分析...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        writer?.(`✅ 分析完成`);
        
        return `数据分析结果：基于 ${dataSource} 的 ${analysisType} 分析显示，用户活跃度同比增长 15%，转化率提升 8%。`;
    },
    {
        name: "analyze_data",
        description: "对指定数据源执行数据分析",
        schema: z.object({
            dataSource: z.string().describe("数据源名称"),
            analysisType: z.enum(["趋势分析", "用户画像", "转化漏斗", "留存分析"]).describe("分析类型"),
        }),
    }
);

// 创建数据分析代理
const analyticsAgent = createAgent({
    model: new ChatOpenAI({ model: "gpt-4.1" }),
    tools: [analyzeData],
    systemPrompt: "你是一个专业的数据分析助手，能够帮助用户分析各类业务数据。",
});

// 执行数据分析
async function runAnalysis() {
    console.log("=== 数据分析任务开始 ===\n");
    
    // 同时使用 custom 和 updates 模式
    for await (const [mode, chunk] of await analyticsAgent.stream(
        { messages: [{ role: "user", content: "请对销售数据库执行趋势分析" }] },
        { streamMode: ["custom", "updates"] }
    )) {
        if (mode === "custom") {
            console.log(`[进度] ${chunk}`);
        } else if (mode === "updates") {
            const [step, content] = Object.entries(chunk)[0];
            if (step === "model" && content.messages?.[0]?.kwargs?.content) {
                console.log(`\n[结果] ${content.messages[0].kwargs.content}`);
            }
        }
    }
    
    console.log("\n=== 数据分析任务完成 ===");
}

runAnalysis();
```

### 场景三：代码生成助手
**问题**：如何构建一个能够实时显示代码生成过程的编程助手？

**解决方案**：组合使用 messages 和 updates 模式

```typescript
import z from "zod";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

// 创建代码执行工具
const executeCode = tool(
    async ({ code, language }) => {
        // 模拟代码执行
        return `代码执行成功！\n输出：Hello, World!`;
    },
    {
        name: "execute_code",
        description: "执行代码并返回结果",
        schema: z.object({
            code: z.string().describe("要执行的代码"),
            language: z.enum(["python", "javascript", "typescript"]).describe("编程语言"),
        }),
    }
);

// 创建代码生成代理
const codeAgent = createAgent({
    model: new ChatOpenAI({ model: "gpt-4.1" }),
    tools: [executeCode],
    systemPrompt: `你是一个专业的编程助手，能够帮助用户编写和执行代码。
当用户请求编写代码时，请先展示代码，然后询问是否需要执行。`,
});

// 代码生成聊天
async function codeChat(userMessage: string) {
    console.log(`👤 用户: ${userMessage}\n`);
    console.log("🤖 助手: ");
    
    let currentStep = "";
    
    for await (const [mode, chunk] of await codeAgent.stream(
        { messages: [{ role: "user", content: userMessage }] },
        { streamMode: ["messages", "updates"] }
    )) {
        if (mode === "messages") {
            const [token, metadata] = chunk;
            if (token.content) {
                process.stdout.write(token.content);
            }
        } else if (mode === "updates") {
            const [step, content] = Object.entries(chunk)[0];
            if (step !== currentStep) {
                currentStep = step;
                if (step === "tools") {
                    console.log("\n\n📦 [执行工具中...]");
                }
            }
        }
    }
    
    console.log("\n");
}

// 测试代码生成
codeChat("帮我写一个 TypeScript 函数，计算斐波那契数列的第 n 项");
```

## 技术要点

### 1. 流式模式选择
- **updates**：适合显示代理执行步骤，如工具调用进度
- **messages**：适合实时显示 LLM 生成的文本内容
- **custom**：适合发送自定义进度信息和状态更新
- **组合使用**：复杂场景可以同时使用多种模式

### 2. 性能优化
- **按需流式**：只在需要的地方启用流式传输
- **批量处理**：对于大量小更新，考虑批量发送
- **错误处理**：在流式传输过程中正确处理错误

### 3. 用户体验
- **进度指示**：使用 custom 模式提供明确的进度反馈
- **打字机效果**：使用 messages 模式实现自然的文本输出
- **状态显示**：使用 updates 模式显示当前执行阶段

### 4. 注意事项
- **writer 依赖**：使用 writer 的工具只能在 LangGraph 执行上下文中调用
- **流式支持**：并非所有模型都支持流式传输
- **禁用流式**：在不需要流式输出的场景中禁用以节省资源

## 总结

流式处理是构建现代 AI 应用的关键技术，它能够显著提升用户体验，让用户实时感知 AI 的工作进度。通过合理使用不同的流式模式，开发者可以为用户提供更加流畅、响应式的交互体验。

### 核心优势
- **即时响应**：用户立即看到 AI 正在工作
- **进度可视化**：显示当前执行阶段和状态
- **灵活控制**：支持多种流式模式的组合使用
- **更好的 UX**：显著减少用户感知的等待时间

### 应用前景
流式处理在各类 AI 应用中都有广泛的应用前景：
- **聊天机器人**：实现打字机效果的实时对话
- **代码生成**：逐步展示生成的代码
- **数据分析**：实时显示分析进度
- **内容创作**：边写边看的创作体验

通过掌握流式处理的使用技巧，开发者可以构建出更加智能、响应式的 AI 应用，为用户提供更加自然、流畅的交互体验。