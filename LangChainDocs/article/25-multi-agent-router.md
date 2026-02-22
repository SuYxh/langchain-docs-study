# 25. Router 模式：高效的问题分类和分发

## 简单来说

想象你去医院看病：

1. **挂号处分诊**："头疼发烧挂内科，骨折挂骨科，皮肤问题挂皮肤科"
2. **分诊后直接去科室**：不需要再经过挂号处
3. **复杂情况**：可能需要会诊（多科室同时处理）

这就是 **Router 模式** —— 有一个专门的"路由器"负责分类问题，然后直接分发给对应的专业 Agent 处理。

```
用户问题 → 路由器 → 分析问题类型
                 ├→ 代码 Agent（代码问题）→ 回答
                 ├→ 文档 Agent（文档问题）→ 回答
                 └→ 数据 Agent（数据问题）→ 回答
         ← 汇总结果（如果需要）
```

与其他模式的区别：
- **Subagents**：主 Agent 动态决定调用哪个子 Agent（**对话感知**）
- **Router**：路由器预先分类，直接分发（**轻量预处理**）

## 本节目标

1. 理解 Router 与 Subagents 的关键区别
2. 掌握单一路由和并行分发两种模式
3. 学会使用 Command 和 Send 实现路由
4. 了解有状态和无状态路由的选择

## 业务场景

假设你要构建一个**多源知识库助手**，能够：

1. **搜索 GitHub 仓库** —— 代码相关问题
2. **搜索 Notion 文档** —— 业务文档问题
3. **搜索 Slack 历史** —— 团队沟通记录

用户的问题可能涉及一个源，也可能涉及多个源。

需求特点：
- 问题类型比较清晰，容易分类
- 多个源可以**并行**查询
- 需要把多个结果**汇总**成一个答案

这正是 Router 模式的典型场景。

## 核心架构

```
         ┌─────────────────────────────────────┐
         │              路由器                 │
         │   分析问题 → 决定分发到哪些 Agent    │
         └─────────────┬───────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
 ┌───────────┐   ┌───────────┐   ┌───────────┐
 │ GitHub    │   │ Notion    │   │ Slack     │
 │ Agent     │   │ Agent     │   │ Agent     │
 └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
       │               │               │
       └───────────────┼───────────────┘
                       ▼
                 ┌───────────┐
                 │  汇总节点  │
                 │ Synthesize│
                 └───────────┘
```

## 基础实现

### 第一步：定义状态

```typescript
import { Annotation } from "@langchain/langgraph";

const State = Annotation.Root({
  query: Annotation<string>(),
  classification: Annotation<{
    targets: string[];
    queries: Record<string, string>;
  }>(),
  results: Annotation<Record<string, string>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({})
  }),
  finalAnswer: Annotation<string>()
});
```

### 第二步：创建分类函数

路由器的核心 —— 分析问题，决定分发目标：

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const model = new ChatOpenAI({ model: "gpt-4.1" });

const ClassificationSchema = z.object({
  targets: z.array(z.enum(["github", "notion", "slack"]))
    .describe("需要查询的数据源"),
  queries: z.record(z.string())
    .describe("每个数据源的具体查询语句")
});

async function classifyQuery(query: string) {
  const response = await model.withStructuredOutput(ClassificationSchema).invoke([
    {
      role: "system",
      content: `你是一个查询分类器。根据用户问题，决定需要查询哪些数据源。

数据源说明：
- github: 代码仓库，适合代码实现、API 用法、技术架构问题
- notion: 业务文档，适合产品需求、流程规范、设计文档问题
- slack: 团队沟通，适合历史讨论、决策记录、人员联系问题

规则：
1. 一个问题可能需要查询多个数据源
2. 为每个数据源生成优化后的查询语句
3. 不相关的数据源不要包含`
    },
    { role: "user", content: query }
  ]);
  
  return response;
}
```

### 第三步：创建专业 Agent

```typescript
import { createAgent, tool } from "langchain";

const searchGitHub = tool(
  async ({ query }) => {
    // 实际调用 GitHub API
    return `GitHub 搜索结果：找到 3 个相关代码文件...`;
  },
  {
    name: "search_github",
    description: "搜索 GitHub 代码仓库",
    schema: z.object({ query: z.string() })
  }
);

const searchNotion = tool(
  async ({ query }) => {
    // 实际调用 Notion API
    return `Notion 搜索结果：找到 2 个相关文档...`;
  },
  {
    name: "search_notion",
    description: "搜索 Notion 文档",
    schema: z.object({ query: z.string() })
  }
);

const searchSlack = tool(
  async ({ query }) => {
    // 实际调用 Slack API
    return `Slack 搜索结果：找到 5 条相关消息...`;
  },
  {
    name: "search_slack",
    description: "搜索 Slack 历史消息",
    schema: z.object({ query: z.string() })
  }
);

const githubAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchGitHub],
  systemPrompt: "你是代码搜索专家，帮助用户查找代码相关信息。"
});

const notionAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchNotion],
  systemPrompt: "你是文档搜索专家，帮助用户查找业务文档。"
});

const slackAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchSlack],
  systemPrompt: "你是沟通记录搜索专家，帮助用户查找历史讨论。"
});
```

### 第四步：构建工作流

#### 方式 A：单一路由（Command）

适合问题只需要一个 Agent 处理的场景：

```typescript
import { StateGraph, START, END, Command } from "@langchain/langgraph";

async function routeNode(state: typeof State.State) {
  const classification = await classifyQuery(state.query);
  
  // 只选择第一个目标
  const target = classification.targets[0];
  
  return new Command({
    update: { classification },
    goto: target  // 跳转到对应节点
  });
}

async function githubNode(state: typeof State.State) {
  const query = state.classification.queries["github"] || state.query;
  const result = await githubAgent.invoke({
    messages: [{ role: "user", content: query }]
  });
  return { results: { github: result.messages.at(-1)?.content } };
}

async function notionNode(state: typeof State.State) {
  const query = state.classification.queries["notion"] || state.query;
  const result = await notionAgent.invoke({
    messages: [{ role: "user", content: query }]
  });
  return { results: { notion: result.messages.at(-1)?.content } };
}

async function slackNode(state: typeof State.State) {
  const query = state.classification.queries["slack"] || state.query;
  const result = await slackAgent.invoke({
    messages: [{ role: "user", content: query }]
  });
  return { results: { slack: result.messages.at(-1)?.content } };
}

const singleRouteWorkflow = new StateGraph(State)
  .addNode("router", routeNode)
  .addNode("github", githubNode)
  .addNode("notion", notionNode)
  .addNode("slack", slackNode)
  .addEdge(START, "router")
  .addEdge("github", END)
  .addEdge("notion", END)
  .addEdge("slack", END)
  .compile();
```

#### 方式 B：并行分发（Send）

适合问题需要多个 Agent 同时处理的场景：

```typescript
import { Send } from "@langchain/langgraph";

async function parallelRouteNode(state: typeof State.State) {
  const classification = await classifyQuery(state.query);
  
  // 向多个目标并行发送
  return classification.targets.map(target => 
    new Send(target, {
      query: classification.queries[target] || state.query,
      classification
    })
  );
}

async function synthesizeNode(state: typeof State.State) {
  const resultsText = Object.entries(state.results)
    .map(([source, content]) => `## ${source} 结果\n${content}`)
    .join("\n\n");
  
  const response = await model.invoke([
    {
      role: "system",
      content: "将以下多个数据源的搜索结果汇总成一个连贯的回答。"
    },
    {
      role: "user",
      content: `原始问题：${state.query}\n\n${resultsText}`
    }
  ]);
  
  return { finalAnswer: response.content };
}

const parallelWorkflow = new StateGraph(State)
  .addNode("router", parallelRouteNode)
  .addNode("github", githubNode)
  .addNode("notion", notionNode)
  .addNode("slack", slackNode)
  .addNode("synthesize", synthesizeNode)
  .addEdge(START, "router")
  .addEdge("github", "synthesize")
  .addEdge("notion", "synthesize")
  .addEdge("slack", "synthesize")
  .addEdge("synthesize", END)
  .compile();
```

## 有状态 vs 无状态路由

### 无状态路由

每个请求独立处理，没有历史记忆：

```typescript
// 无状态 - 每次都是新的开始
const result = await workflow.invoke({
  query: "如何实现用户认证？"
});
```

**优点**：简单、无副作用、易于扩展
**缺点**：不能处理多轮对话

### 有状态路由

维护对话历史，支持多轮交互：

```typescript
// 方式 1：将无状态路由包装成工具
const searchDocs = tool(
  async ({ query }) => {
    const result = await workflow.invoke({ query });
    return result.finalAnswer;
  },
  {
    name: "search_docs",
    description: "搜索多个文档源",
    schema: z.object({ query: z.string() })
  }
);

// 会话 Agent 管理对话历史
const conversationalAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchDocs],
  systemPrompt: "你是一个助手，可以搜索多个知识库来回答问题。"
});

// 有状态 - 维护对话历史
let messages = [];
messages.push({ role: "user", content: "如何实现用户认证？" });
const result1 = await conversationalAgent.invoke({ messages });
messages = result1.messages;

messages.push({ role: "user", content: "那 OAuth 怎么集成呢？" });
const result2 = await conversationalAgent.invoke({ messages });
```

**优点**：支持多轮对话、上下文连续
**缺点**：需要管理状态、可能增加复杂度

## Router vs Subagents：何时选择？

| 场景 | 推荐模式 | 原因 |
|------|---------|------|
| 问题类型清晰，易分类 | Router | 分类开销小，效率高 |
| 需要并行查询多个源 | Router | Send 支持并行执行 |
| 多轮复杂对话 | Subagents | 主 Agent 维护上下文 |
| 动态决定调用顺序 | Subagents | 主 Agent 灵活协调 |
| 轻量级预处理 | Router | 路由器只做分类 |
| 需要结果协调 | Subagents | 主 Agent 汇总判断 |

**总结**：
- **Router**：确定性分类 + 并行执行 + 结果汇总
- **Subagents**：动态协调 + 多轮对话 + 复杂逻辑

## 完整示例：多源知识库助手

```typescript
import { StateGraph, START, END, Annotation, Send } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { createAgent, tool } from "langchain";
import * as z from "zod";

const model = new ChatOpenAI({ model: "gpt-4.1" });

const State = Annotation.Root({
  query: Annotation<string>(),
  classification: Annotation<{
    targets: string[];
    queries: Record<string, string>;
  }>(),
  results: Annotation<Record<string, string>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({})
  }),
  finalAnswer: Annotation<string>()
});

const ClassificationSchema = z.object({
  targets: z.array(z.enum(["github", "notion", "slack"])),
  queries: z.record(z.string())
});

async function routerNode(state: typeof State.State) {
  const classification = await model
    .withStructuredOutput(ClassificationSchema)
    .invoke([
      {
        role: "system",
        content: `分析用户问题，决定查询哪些数据源。
- github: 代码、API、技术实现
- notion: 业务文档、需求、设计
- slack: 团队讨论、决策记录`
      },
      { role: "user", content: state.query }
    ]);
  
  if (classification.targets.length === 0) {
    return { finalAnswer: "抱歉，无法确定合适的数据源来回答这个问题。" };
  }
  
  return classification.targets.map(target =>
    new Send(target, {
      query: classification.queries[target] || state.query,
      classification,
      results: {}
    })
  );
}

const searchGitHub = tool(
  async ({ query }) => `GitHub: 找到关于 "${query}" 的 3 个代码文件和 2 个 Issue`,
  {
    name: "search_github",
    description: "搜索代码",
    schema: z.object({ query: z.string() })
  }
);

const searchNotion = tool(
  async ({ query }) => `Notion: 找到关于 "${query}" 的 2 个文档`,
  {
    name: "search_notion",
    description: "搜索文档",
    schema: z.object({ query: z.string() })
  }
);

const searchSlack = tool(
  async ({ query }) => `Slack: 找到关于 "${query}" 的 5 条消息`,
  {
    name: "search_slack",
    description: "搜索消息",
    schema: z.object({ query: z.string() })
  }
);

const githubAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchGitHub],
  systemPrompt: "你是代码搜索专家。搜索并总结代码相关信息。"
});

const notionAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchNotion],
  systemPrompt: "你是文档搜索专家。搜索并总结文档信息。"
});

const slackAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchSlack],
  systemPrompt: "你是消息搜索专家。搜索并总结相关讨论。"
});

async function githubNode(state: typeof State.State) {
  const result = await githubAgent.invoke({
    messages: [{ role: "user", content: state.query }]
  });
  return { results: { github: result.messages.at(-1)?.content } };
}

async function notionNode(state: typeof State.State) {
  const result = await notionAgent.invoke({
    messages: [{ role: "user", content: state.query }]
  });
  return { results: { notion: result.messages.at(-1)?.content } };
}

async function slackNode(state: typeof State.State) {
  const result = await slackAgent.invoke({
    messages: [{ role: "user", content: state.query }]
  });
  return { results: { slack: result.messages.at(-1)?.content } };
}

async function synthesizeNode(state: typeof State.State) {
  const sources = Object.entries(state.results)
    .map(([source, content]) => `### ${source.toUpperCase()}\n${content}`)
    .join("\n\n");
  
  const response = await model.invoke([
    {
      role: "system",
      content: `你是一个知识汇总专家。
将多个数据源的搜索结果整合成一个完整、连贯的回答。
如果不同来源有矛盾，指出差异并给出建议。`
    },
    {
      role: "user",
      content: `问题：${state.query}\n\n搜索结果：\n${sources}`
    }
  ]);
  
  return { finalAnswer: response.content };
}

const knowledgeBaseRouter = new StateGraph(State)
  .addNode("router", routerNode)
  .addNode("github", githubNode)
  .addNode("notion", notionNode)
  .addNode("slack", slackNode)
  .addNode("synthesize", synthesizeNode)
  .addEdge(START, "router")
  .addEdge("github", "synthesize")
  .addEdge("notion", "synthesize")
  .addEdge("slack", "synthesize")
  .addEdge("synthesize", END)
  .compile();

async function demo() {
  console.log("=== 多源知识库查询 ===\n");
  
  const result = await knowledgeBaseRouter.invoke({
    query: "用户认证模块是怎么实现的？有相关的设计文档吗？"
  });
  
  console.log("查询结果：");
  console.log(result.finalAnswer);
}

demo();
```

## 本章小结

Router 模式的核心要点：

1. **核心思想**：预处理分类 + 分发执行 + 结果汇总
2. **实现方式**：
   - 单一路由（Command）：跳转到单个目标
   - 并行分发（Send）：同时分发到多个目标
3. **与 Subagents 区别**：
   - Router：轻量分类，确定性分发
   - Subagents：动态协调，对话感知
4. **状态管理**：
   - 无状态：简单高效，适合单次查询
   - 有状态：包装成工具，支持多轮对话
5. **适用场景**：
   - 问题类型清晰易分类
   - 需要并行查询多个数据源
   - 结果需要汇总但不需要复杂协调

下一篇我们介绍 **Custom Workflow** —— 当标准模式都不满足时，如何自定义执行流程。
