# 26. Custom Workflow：自定义执行流程

## 简单来说

前面学了 4 种标准多代理模式：
- **Subagents**：CEO 管经理
- **Handoffs**：客服转接
- **Skills**：按需学技能
- **Router**：前台分诊

但现实世界的问题往往更复杂，标准模式可能都不合适。这时候就需要 **Custom Workflow** —— 自己设计执行流程。

就像搭乐高一样，你可以：
- 自由组合**顺序执行**和**并行执行**
- 添加**条件分支**（if-else）
- 混合**确定性逻辑**和 **Agent 行为**
- 甚至**嵌套其他模式**

```
输入 → 预处理（确定性）
    → 条件判断
    → 路径 A → Agent 处理 → 后处理
    → 路径 B → 规则处理 → 直接输出
```

## 本节目标

1. 理解 Custom Workflow 的核心优势
2. 掌握 LangGraph 构建自定义工作流的方法
3. 学会混合确定性节点和 Agent 节点
4. 实现一个完整的 RAG 工作流示例

## 业务场景

假设你要构建一个 **WNBA 篮球助手**，需要：

1. **重写查询** —— 用户问题可能不清晰，需要优化
2. **检索知识** —— 从向量数据库获取相关信息
3. **Agent 推理** —— 基于检索结果回答，可能需要调用工具获取最新新闻

这个流程包含三种不同类型的步骤：
- **模型调用**（Rewrite）：优化查询
- **确定性操作**（Retrieve）：向量搜索，不需要 LLM
- **Agent 推理**（Agent）：复杂推理，可能调用工具

用标准模式很难表达这种混合流程，需要自定义工作流。

## 核心概念

### 三种节点类型

Custom Workflow 的核心是**混合不同类型的节点**：

```
┌─────────────────────────────────────────────────────┐
│  节点类型          描述              示例           │
├─────────────────────────────────────────────────────┤
│  确定性节点       固定逻辑，无 LLM    向量搜索       │
│  模型节点         单次 LLM 调用      查询重写       │
│  Agent 节点       完整 Agent 循环    推理+工具调用   │
└─────────────────────────────────────────────────────┘
```

### 工作流结构

```
   ┌────────────┐
   │   START    │
   └─────┬──────┘
         │
   ┌─────▼──────┐
   │  Rewrite   │  ← 模型节点：优化查询
   │  (Model)   │
   └─────┬──────┘
         │
   ┌─────▼──────┐
   │  Retrieve  │  ← 确定性节点：向量搜索
   │  (固定逻辑) │
   └─────┬──────┘
         │
   ┌─────▼──────┐
   │   Agent    │  ← Agent 节点：推理+工具
   │  (Agent)   │
   └─────┬──────┘
         │
   ┌─────▼──────┐
   │    END     │
   └────────────┘
```

## 实现步骤

### 第一步：定义状态

状态是节点之间传递数据的桥梁：

```typescript
import { Annotation } from "@langchain/langgraph";

const State = Annotation.Root({
  question: Annotation<string>(),
  rewrittenQuery: Annotation<string>(),
  documents: Annotation<string[]>(),
  answer: Annotation<string>()
});
```

### 第二步：准备知识库

```typescript
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

const embeddings = new OpenAIEmbeddings();

const vectorStore = await MemoryVectorStore.fromTexts(
  [
    "New York Liberty 2024 roster: Breanna Stewart, Sabrina Ionescu, Jonquel Jones.",
    "Las Vegas Aces 2024 roster: A'ja Wilson, Kelsey Plum, Jackie Young.",
    "Indiana Fever 2024 roster: Caitlin Clark, Aliyah Boston, Kelsey Mitchell.",
    "2024 WNBA Finals: New York Liberty defeated Minnesota Lynx 3-2.",
    "A'ja Wilson 2024 stats: 26.9 PPG, 11.9 RPG, 2.6 BPG. Won MVP.",
    "Caitlin Clark 2024 rookie stats: 19.2 PPG, 8.4 APG. Rookie of the Year.",
  ],
  [{}, {}, {}, {}, {}, {}],
  embeddings
);

const retriever = vectorStore.asRetriever({ k: 5 });
```

### 第三步：创建模型节点（查询重写）

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const model = new ChatOpenAI({ model: "gpt-4.1" });

const RewrittenQuery = z.object({
  query: z.string().describe("优化后的查询语句")
});

async function rewriteNode(state: typeof State.State) {
  const response = await model
    .withStructuredOutput(RewrittenQuery)
    .invoke([
      {
        role: "system",
        content: `优化用户的 WNBA 相关查询。
知识库包含：球队名单、比赛结果、球员数据（PPG、RPG、APG）。
重写时关注具体的球员名、球队名或数据类型。`
      },
      { role: "user", content: state.question }
    ]);
  
  return { rewrittenQuery: response.query };
}
```

### 第四步：创建确定性节点（检索）

这个节点**不需要 LLM**，只做向量搜索：

```typescript
async function retrieveNode(state: typeof State.State) {
  const docs = await retriever.invoke(state.rewrittenQuery);
  return { 
    documents: docs.map(doc => doc.pageContent) 
  };
}
```

### 第五步：创建 Agent 节点（推理）

Agent 可以使用检索到的文档，也可以调用工具获取更多信息：

```typescript
import { createAgent, tool } from "langchain";

const getLatestNews = tool(
  async ({ query }) => {
    // 实际项目中调用新闻 API
    return `最新消息：WNBA 宣布 2025 赛季扩军计划...`;
  },
  {
    name: "get_latest_news",
    description: "获取 WNBA 最新新闻和动态",
    schema: z.object({ query: z.string() })
  }
);

const wnbaAgent = createAgent({
  model: "gpt-4.1",
  tools: [getLatestNews],
  systemPrompt: `你是 WNBA 篮球专家。
基于提供的上下文回答问题。
如果需要最新信息，可以使用 get_latest_news 工具。`
});

async function agentNode(state: typeof State.State) {
  const context = state.documents.join("\n\n");
  const prompt = `上下文信息：\n${context}\n\n问题：${state.question}`;
  
  const response = await wnbaAgent.invoke({
    messages: [{ role: "user", content: prompt }]
  });
  
  return { answer: response.messages.at(-1)?.content };
}
```

### 第六步：构建工作流

```typescript
import { StateGraph, START, END } from "@langchain/langgraph";

const workflow = new StateGraph(State)
  .addNode("rewrite", rewriteNode)
  .addNode("retrieve", retrieveNode)
  .addNode("agent", agentNode)
  .addEdge(START, "rewrite")
  .addEdge("rewrite", "retrieve")
  .addEdge("retrieve", "agent")
  .addEdge("agent", END)
  .compile();
```

### 第七步：运行

```typescript
const result = await workflow.invoke({
  question: "谁赢了 2024 WNBA 总冠军？"
});

console.log(result.answer);
```

执行流程：
1. **Rewrite**：`"谁赢了 2024 WNBA 总冠军？"` → `"2024 WNBA Finals champion winner"`
2. **Retrieve**：向量搜索返回相关文档
3. **Agent**：基于文档推理，返回答案

## 进阶技巧

### 技巧 1：条件分支

根据状态决定下一步执行哪个节点：

```typescript
function routeByComplexity(state: typeof State.State) {
  // 简单问题直接回答，复杂问题走 Agent
  if (state.documents.length === 0) {
    return "noResults";
  }
  if (state.question.includes("最新") || state.question.includes("新闻")) {
    return "agent";  // 需要工具获取最新信息
  }
  return "directAnswer";  // 直接生成答案即可
}

const workflow = new StateGraph(State)
  .addNode("rewrite", rewriteNode)
  .addNode("retrieve", retrieveNode)
  .addNode("agent", agentNode)
  .addNode("directAnswer", directAnswerNode)
  .addNode("noResults", noResultsNode)
  .addEdge(START, "rewrite")
  .addEdge("rewrite", "retrieve")
  .addConditionalEdges("retrieve", routeByComplexity)
  .addEdge("agent", END)
  .addEdge("directAnswer", END)
  .addEdge("noResults", END)
  .compile();
```

### 技巧 2：嵌套其他模式

在自定义工作流中嵌入 Router 或 Subagents：

```typescript
async function multiSourceRetrieveNode(state: typeof State.State) {
  // 嵌入 Router 模式：并行从多个源检索
  const [wikiDocs, newsDocs, statsDocs] = await Promise.all([
    wikiRetriever.invoke(state.rewrittenQuery),
    newsRetriever.invoke(state.rewrittenQuery),
    statsRetriever.invoke(state.rewrittenQuery)
  ]);
  
  return {
    documents: [
      ...wikiDocs.map(d => d.pageContent),
      ...newsDocs.map(d => d.pageContent),
      ...statsDocs.map(d => d.pageContent)
    ]
  };
}

async function expertAgentNode(state: typeof State.State) {
  // 嵌入 Subagents 模式：调用专家子 Agent
  const analysisResult = await analysisAgent.invoke({
    messages: [{ role: "user", content: state.question }]
  });
  
  const writingResult = await writingAgent.invoke({
    messages: [{ role: "user", content: `基于分析写回答：${analysisResult}` }]
  });
  
  return { answer: writingResult.messages.at(-1)?.content };
}
```

### 技巧 3：循环执行

有时需要迭代优化结果：

```typescript
function shouldContinue(state: typeof State.State) {
  // 检查答案质量，决定是否继续优化
  if (state.iterationCount >= 3) {
    return "end";  // 最多迭代 3 次
  }
  if (state.answerQuality >= 0.8) {
    return "end";  // 质量足够好
  }
  return "refine";  // 继续优化
}

const workflow = new StateGraph(State)
  .addNode("generate", generateNode)
  .addNode("evaluate", evaluateNode)
  .addNode("refine", refineNode)
  .addEdge(START, "generate")
  .addEdge("generate", "evaluate")
  .addConditionalEdges("evaluate", shouldContinue)
  .addEdge("refine", "generate")  // 循环回 generate
  .compile();
```

## 完整示例：WNBA 智能助手

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { createAgent, tool } from "langchain";
import * as z from "zod";

const model = new ChatOpenAI({ model: "gpt-4.1" });
const embeddings = new OpenAIEmbeddings();

const State = Annotation.Root({
  question: Annotation<string>(),
  rewrittenQuery: Annotation<string>(),
  documents: Annotation<string[]>(),
  needsLatestInfo: Annotation<boolean>(),
  answer: Annotation<string>()
});

const vectorStore = await MemoryVectorStore.fromTexts(
  [
    "New York Liberty 2024: Breanna Stewart, Sabrina Ionescu, Jonquel Jones.",
    "Las Vegas Aces 2024: A'ja Wilson, Kelsey Plum, Jackie Young, Chelsea Gray.",
    "Indiana Fever 2024: Caitlin Clark, Aliyah Boston, Kelsey Mitchell.",
    "2024 WNBA Finals: New York Liberty beat Minnesota Lynx 3-2 for championship.",
    "A'ja Wilson 2024: 26.9 PPG, 11.9 RPG, 2.6 BPG. MVP award winner.",
    "Caitlin Clark 2024: 19.2 PPG, 8.4 APG, 5.7 RPG. Rookie of the Year.",
    "Breanna Stewart 2024: 20.4 PPG, 8.5 RPG, 3.5 APG for Liberty.",
  ],
  [{}, {}, {}, {}, {}, {}, {}],
  embeddings
);
const retriever = vectorStore.asRetriever({ k: 5 });

const RewriteSchema = z.object({
  query: z.string(),
  needsLatestInfo: z.boolean().describe("是否需要最新新闻信息")
});

async function rewriteNode(state: typeof State.State) {
  const response = await model.withStructuredOutput(RewriteSchema).invoke([
    {
      role: "system",
      content: `优化 WNBA 查询。判断是否需要最新新闻。
知识库有：球队名单、比赛结果、球员数据。
如果问题涉及"最新"、"新闻"、"未来"等，设置 needsLatestInfo 为 true。`
    },
    { role: "user", content: state.question }
  ]);
  
  return {
    rewrittenQuery: response.query,
    needsLatestInfo: response.needsLatestInfo
  };
}

async function retrieveNode(state: typeof State.State) {
  const docs = await retriever.invoke(state.rewrittenQuery);
  return { documents: docs.map(d => d.pageContent) };
}

function routeAfterRetrieve(state: typeof State.State) {
  if (state.documents.length === 0) {
    return "noResults";
  }
  if (state.needsLatestInfo) {
    return "agentWithTools";
  }
  return "directAnswer";
}

const getNews = tool(
  async ({ topic }) => `WNBA 最新：${topic} 相关新闻更新...`,
  {
    name: "get_wnba_news",
    description: "获取 WNBA 最新新闻",
    schema: z.object({ topic: z.string() })
  }
);

const newsAgent = createAgent({
  model: "gpt-4.1",
  tools: [getNews],
  systemPrompt: "你是 WNBA 专家。可以获取最新新闻来补充回答。"
});

async function agentWithToolsNode(state: typeof State.State) {
  const context = state.documents.join("\n");
  const result = await newsAgent.invoke({
    messages: [{
      role: "user",
      content: `上下文：\n${context}\n\n问题：${state.question}`
    }]
  });
  return { answer: result.messages.at(-1)?.content };
}

async function directAnswerNode(state: typeof State.State) {
  const context = state.documents.join("\n");
  const response = await model.invoke([
    {
      role: "system",
      content: "基于提供的上下文回答 WNBA 问题。简洁准确。"
    },
    {
      role: "user",
      content: `上下文：\n${context}\n\n问题：${state.question}`
    }
  ]);
  return { answer: response.content as string };
}

async function noResultsNode(state: typeof State.State) {
  return { answer: "抱歉，在知识库中没有找到相关信息。" };
}

const wnbaAssistant = new StateGraph(State)
  .addNode("rewrite", rewriteNode)
  .addNode("retrieve", retrieveNode)
  .addNode("agentWithTools", agentWithToolsNode)
  .addNode("directAnswer", directAnswerNode)
  .addNode("noResults", noResultsNode)
  .addEdge(START, "rewrite")
  .addEdge("rewrite", "retrieve")
  .addConditionalEdges("retrieve", routeAfterRetrieve)
  .addEdge("agentWithTools", END)
  .addEdge("directAnswer", END)
  .addEdge("noResults", END)
  .compile();

async function demo() {
  console.log("=== 测试 1：简单事实查询 ===");
  let result = await wnbaAssistant.invoke({
    question: "谁赢了 2024 WNBA 总冠军？"
  });
  console.log(result.answer);

  console.log("\n=== 测试 2：球员数据查询 ===");
  result = await wnbaAssistant.invoke({
    question: "A'ja Wilson 2024 赛季表现如何？"
  });
  console.log(result.answer);

  console.log("\n=== 测试 3：需要最新信息 ===");
  result = await wnbaAssistant.invoke({
    question: "WNBA 最新有什么新闻？"
  });
  console.log(result.answer);
}

demo();
```

## Custom Workflow vs 其他模式

| 场景 | 推荐方案 | 原因 |
|------|---------|------|
| 标准 Agent 协作 | Subagents/Handoffs | 有现成模式 |
| 清晰的问题分类 | Router | 专门优化过 |
| 知识扩展 | Skills | 渐进式披露 |
| 混合确定性+Agent | **Custom Workflow** | 完全控制 |
| 复杂条件分支 | **Custom Workflow** | 灵活路由 |
| 嵌套多种模式 | **Custom Workflow** | 自由组合 |

## 本章小结

Custom Workflow 的核心要点：

1. **核心优势**：
   - 完全控制执行流程
   - 混合不同类型的节点
   - 灵活的条件分支和循环
   
2. **节点类型**：
   - 确定性节点：固定逻辑，无 LLM
   - 模型节点：单次 LLM 调用
   - Agent 节点：完整 Agent 循环
   
3. **构建方法**：
   - 用 StateGraph 定义图结构
   - 用 Annotation 定义状态
   - 用 addEdge/addConditionalEdges 连接节点
   
4. **进阶技巧**：
   - 条件分支：根据状态动态路由
   - 嵌套模式：在节点中嵌入其他模式
   - 循环执行：迭代优化结果
   
5. **适用场景**：
   - 标准模式无法满足需求
   - 需要混合确定性逻辑和 Agent
   - 需要复杂的条件分支或循环

## 多代理系统篇总结

恭喜你完成了多代理系统篇！让我们回顾一下学到的 5 种模式：

| 模式 | 类比 | 核心思想 | 适用场景 |
|------|------|---------|---------|
| **Subagents** | CEO + 经理 | 主 Agent 协调子 Agent | 复杂任务分解 |
| **Handoffs** | 客服转接 | 对话中切换专家 | 动态专家切换 |
| **Skills** | 学习技能 | 按需加载知识 | 知识密集任务 |
| **Router** | 前台分诊 | 预处理分类分发 | 清晰分类场景 |
| **Custom Workflow** | 自定义流程 | 完全控制执行 | 特殊复杂需求 |

选择建议：
1. 先考虑标准模式能否满足需求
2. 如果不能，使用 Custom Workflow 自定义
3. 可以在 Custom Workflow 中嵌套其他模式
4. 根据实际性能和维护成本权衡
