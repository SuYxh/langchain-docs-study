# 25. 项目实战：多 Agent 协作系统

## 项目简介

本项目将从零构建一个**多 Agent 协作系统**，实现：
- 🎭 **角色分工**：多个专业化 Agent 各司其职
- 📋 **任务分发**：协调者 Agent 分配和调度任务
- 🔄 **结果聚合**：汇总各 Agent 的产出
- 🔗 **状态同步**：通过共享 Memory Store 协同
- 👤 **人工审核**：最终输出前的人工确认

**难度等级：** ⭐⭐⭐⭐⭐

**涉及知识点：** 子图 + Send API + 长期记忆 + 流式 + HITL

---

## 🎯 学习目标

完成本项目后，你将掌握：

1. 如何设计多 Agent 协作架构
2. 如何使用子图封装专业 Agent
3. 如何使用 Send API 动态分发任务
4. 如何通过 Memory Store 实现状态共享
5. 如何整合人工审核流程

---

## 项目架构

```
复杂任务 → 协调者 Agent（父图）
              │
              ├→ 任务分解
              │
              ├→ 子图分发（Send API）
              │   ├→ [子图] 研究 Agent
              │   ├→ [子图] 分析 Agent
              │   └→ [子图] 写作 Agent
              │
              ├→ 状态同步（共享 Memory Store）
              │
              ├→ 结果汇总
              │
              └→ 人工审核（HITL）→ 最终输出
```

---

## 项目结构

```plaintext
multi-agent/
├── src/
│   ├── state.ts           # 状态定义
│   ├── agents/
│   │   ├── researcher.ts  # 研究 Agent
│   │   ├── analyst.ts     # 分析 Agent
│   │   └── writer.ts      # 写作 Agent
│   ├── coordinator.ts     # 协调者节点
│   ├── memory.ts          # 共享记忆
│   ├── graph.ts           # 主图构建
│   └── index.ts           # 入口文件
├── package.json
├── tsconfig.json
└── .env
```

---

## 第一步：项目初始化

### package.json

```json
{
  "name": "multi-agent",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@langchain/langgraph": "^0.2.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/core": "^0.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0"
  }
}
```

### .env

```bash
OPENAI_API_KEY=sk-xxx...
```

---

## 第二步：状态定义

### src/state.ts

```typescript
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export type AgentRole = "researcher" | "analyst" | "writer";

export interface AgentTask {
  id: string;
  role: AgentRole;
  description: string;
  input: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  output?: string;
  metadata?: Record<string, any>;
}

export interface AgentResult {
  taskId: string;
  role: AgentRole;
  success: boolean;
  output: string;
  insights?: string[];
  duration: number;
  timestamp: string;
}

export const MultiAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  
  mainTask: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  
  subTasks: Annotation<AgentTask[]>({
    reducer: (_, update) => update,
    default: () => [],
  }),
  
  agentResults: Annotation<AgentResult[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  
  currentTask: Annotation<AgentTask | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  
  synthesis: Annotation<{
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    finalReport: string;
  } | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
  
  phase: Annotation<"planning" | "executing" | "synthesizing" | "reviewing" | "complete">({
    reducer: (_, update) => update,
    default: () => "planning",
  }),
  
  humanApproval: Annotation<{
    required: boolean;
    approved?: boolean;
    feedback?: string;
  }>({
    reducer: (_, update) => update,
    default: () => ({ required: true }),
  }),
});

export type MultiAgentStateType = typeof MultiAgentState.State;
```

**💡 人话解读：**

| 状态字段 | 作用 |
|----------|------|
| `mainTask` | 主任务描述 |
| `subTasks` | 分解后的子任务列表 |
| `agentResults` | 各 Agent 的执行结果（追加模式） |
| `currentTask` | 当前执行的子任务（用于并行） |
| `synthesis` | 最终综合结果 |
| `phase` | 当前执行阶段 |
| `humanApproval` | 人工审批状态 |

---

## 第三步：专业 Agent 子图

### src/agents/researcher.ts

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const ResearcherState = Annotation.Root({
  task: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  findings: Annotation<string[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  output: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
});

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.7 });

async function researchNode(state: typeof ResearcherState.State) {
  console.log(`      🔬 研究 Agent 开始工作...`);
  
  const response = await llm.invoke([
    new SystemMessage(`你是一个专业的研究员。你的任务是深入研究给定的主题，收集关键信息和数据。

输出格式：
1. 首先列出 3-5 个关键发现
2. 然后提供详细的研究报告

请确保研究内容准确、全面。`),
    new HumanMessage(`请研究以下主题：${state.task}`),
  ]);
  
  const content = response.content as string;
  
  const findingsMatch = content.match(/关键发现[：:]([\s\S]*?)(?=详细|报告|$)/i);
  const findings = findingsMatch 
    ? findingsMatch[1].split(/\d+\./g).filter(f => f.trim()).map(f => f.trim())
    : [content.slice(0, 200)];
  
  console.log(`      ✅ 研究完成，发现 ${findings.length} 个关键点`);
  
  return {
    findings,
    output: content,
  };
}

const researcherGraph = new StateGraph(ResearcherState)
  .addNode("research", researchNode)
  .addEdge(START, "research")
  .addEdge("research", END);

export const researcherAgent = researcherGraph.compile();
export { ResearcherState };
```

### src/agents/analyst.ts

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const AnalystState = Annotation.Root({
  task: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  data: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  analysis: Annotation<{
    insights: string[];
    trends: string[];
    risks: string[];
  }>({
    reducer: (_, update) => update,
    default: () => ({ insights: [], trends: [], risks: [] }),
  }),
  output: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
});

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

async function analyzeNode(state: typeof AnalystState.State) {
  console.log(`      📊 分析 Agent 开始工作...`);
  
  const response = await llm.invoke([
    new SystemMessage(`你是一个专业的数据分析师。你的任务是分析给定的信息，提取洞察、识别趋势和评估风险。

请按以下格式输出：
## 关键洞察
- 洞察1
- 洞察2

## 趋势分析
- 趋势1
- 趋势2

## 风险评估
- 风险1
- 风险2

## 综合分析
详细的分析报告...`),
    new HumanMessage(`请分析以下内容：

任务：${state.task}

数据/背景：
${state.data || "无额外数据"}`),
  ]);
  
  const content = response.content as string;
  
  const insightsMatch = content.match(/关键洞察[：:]([\s\S]*?)(?=趋势|##|$)/i);
  const trendsMatch = content.match(/趋势分析[：:]([\s\S]*?)(?=风险|##|$)/i);
  const risksMatch = content.match(/风险评估[：:]([\s\S]*?)(?=综合|##|$)/i);
  
  const parseList = (text: string | undefined) => 
    text ? text.split(/[-•]/g).filter(i => i.trim()).map(i => i.trim()).slice(0, 5) : [];
  
  console.log(`      ✅ 分析完成`);
  
  return {
    analysis: {
      insights: parseList(insightsMatch?.[1]),
      trends: parseList(trendsMatch?.[1]),
      risks: parseList(risksMatch?.[1]),
    },
    output: content,
  };
}

const analystGraph = new StateGraph(AnalystState)
  .addNode("analyze", analyzeNode)
  .addEdge(START, "analyze")
  .addEdge("analyze", END);

export const analystAgent = analystGraph.compile();
export { AnalystState };
```

### src/agents/writer.ts

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const WriterState = Annotation.Root({
  task: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  materials: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
  style: Annotation<"formal" | "casual" | "technical">({
    reducer: (_, update) => update,
    default: () => "formal",
  }),
  output: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
});

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.8 });

async function writeNode(state: typeof WriterState.State) {
  console.log(`      ✍️  写作 Agent 开始工作...`);
  
  const styleGuide: Record<string, string> = {
    formal: "使用正式、专业的语言，适合商业报告",
    casual: "使用轻松、易读的语言，适合博客文章",
    technical: "使用技术性语言，包含专业术语",
  };
  
  const response = await llm.invoke([
    new SystemMessage(`你是一个专业的写作专家。你的任务是根据提供的素材撰写高质量的内容。

写作风格要求：${styleGuide[state.style]}

请确保：
1. 内容结构清晰
2. 语言流畅自然
3. 论述有理有据
4. 结论明确有力`),
    new HumanMessage(`请根据以下素材撰写内容：

任务：${state.task}

素材：
${state.materials}`),
  ]);
  
  console.log(`      ✅ 写作完成，${(response.content as string).length} 字符`);
  
  return {
    output: response.content as string,
  };
}

const writerGraph = new StateGraph(WriterState)
  .addNode("write", writeNode)
  .addEdge(START, "write")
  .addEdge("write", END);

export const writerAgent = writerGraph.compile();
export { WriterState };
```

**💡 Agent 角色说明：**

| Agent | 角色 | 专长 |
|-------|------|------|
| Researcher | 研究员 | 深入调研，收集信息 |
| Analyst | 分析师 | 数据分析，洞察挖掘 |
| Writer | 写作者 | 内容撰写，报告生成 |

---

## 第四步：协调者节点

### src/coordinator.ts

```typescript
import { Send, interrupt } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MultiAgentStateType, AgentTask, AgentRole } from "./state.js";
import { researcherAgent } from "./agents/researcher.js";
import { analystAgent } from "./agents/analyst.js";
import { writerAgent } from "./agents/writer.js";

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.3 });

export async function planningNode(state: MultiAgentStateType) {
  console.log(`\n🎯 协调者: 任务规划`);
  console.log(`   主任务: ${state.mainTask}`);
  
  const response = await llm.invoke([
    new SystemMessage(`你是一个任务规划专家。请将复杂任务分解为可以由不同专业 Agent 执行的子任务。

可用的 Agent 角色：
1. researcher - 研究员：负责调研、收集信息
2. analyst - 分析师：负责数据分析、洞察挖掘
3. writer - 写作者：负责内容撰写、报告生成

请以 JSON 格式输出任务分解：
{
  "tasks": [
    { "role": "researcher", "description": "任务描述" },
    { "role": "analyst", "description": "任务描述" },
    { "role": "writer", "description": "任务描述" }
  ]
}`),
    new HumanMessage(`请分解以下任务：${state.mainTask}`),
  ]);
  
  let tasks: AgentTask[] = [];
  
  try {
    const content = response.content as string;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      tasks = parsed.tasks.map((t: any, i: number) => ({
        id: `task-${i}-${Date.now()}`,
        role: t.role as AgentRole,
        description: t.description,
        input: state.mainTask,
        status: "pending" as const,
      }));
    }
  } catch (e) {
    tasks = [
      { id: `task-0-${Date.now()}`, role: "researcher", description: "研究主题背景", input: state.mainTask, status: "pending" },
      { id: `task-1-${Date.now()}`, role: "analyst", description: "分析关键要素", input: state.mainTask, status: "pending" },
      { id: `task-2-${Date.now()}`, role: "writer", description: "撰写综合报告", input: state.mainTask, status: "pending" },
    ];
  }
  
  console.log(`   📋 分解为 ${tasks.length} 个子任务:`);
  tasks.forEach((t, i) => {
    console.log(`      ${i + 1}. [${t.role}] ${t.description}`);
  });
  
  return {
    subTasks: tasks,
    phase: "executing" as const,
  };
}

export function dispatchNode(state: MultiAgentStateType): Send[] {
  console.log(`\n📤 协调者: 分发任务`);
  
  const researchTasks = state.subTasks.filter(t => t.role === "researcher");
  const analysisTasks = state.subTasks.filter(t => t.role === "analyst");
  const writingTasks = state.subTasks.filter(t => t.role === "writer");
  
  const sends: Send[] = [];
  
  researchTasks.forEach(task => {
    console.log(`   → 分发研究任务: ${task.description}`);
    sends.push(new Send("executeResearcher", { currentTask: task }));
  });
  
  analysisTasks.forEach(task => {
    console.log(`   → 分发分析任务: ${task.description}`);
    sends.push(new Send("executeAnalyst", { currentTask: task }));
  });
  
  writingTasks.forEach(task => {
    console.log(`   → 分发写作任务: ${task.description}`);
    sends.push(new Send("executeWriter", { currentTask: task }));
  });
  
  return sends;
}

export async function executeResearcherNode(state: MultiAgentStateType) {
  const task = state.currentTask;
  if (!task) return { agentResults: [] };
  
  console.log(`\n   🔬 执行研究任务: ${task.description}`);
  
  const startTime = Date.now();
  
  const result = await researcherAgent.invoke({
    task: `${task.description}\n\n背景：${task.input}`,
  });
  
  const duration = Date.now() - startTime;
  
  return {
    agentResults: [{
      taskId: task.id,
      role: "researcher" as const,
      success: true,
      output: result.output,
      insights: result.findings,
      duration,
      timestamp: new Date().toISOString(),
    }],
  };
}

export async function executeAnalystNode(state: MultiAgentStateType) {
  const task = state.currentTask;
  if (!task) return { agentResults: [] };
  
  console.log(`\n   📊 执行分析任务: ${task.description}`);
  
  const startTime = Date.now();
  
  const researchResults = state.agentResults
    .filter(r => r.role === "researcher")
    .map(r => r.output)
    .join("\n\n");
  
  const result = await analystAgent.invoke({
    task: task.description,
    data: researchResults || task.input,
  });
  
  const duration = Date.now() - startTime;
  
  return {
    agentResults: [{
      taskId: task.id,
      role: "analyst" as const,
      success: true,
      output: result.output,
      insights: [
        ...result.analysis.insights,
        ...result.analysis.trends,
      ],
      duration,
      timestamp: new Date().toISOString(),
    }],
  };
}

export async function executeWriterNode(state: MultiAgentStateType) {
  const task = state.currentTask;
  if (!task) return { agentResults: [] };
  
  console.log(`\n   ✍️  执行写作任务: ${task.description}`);
  
  const startTime = Date.now();
  
  const allResults = state.agentResults
    .map(r => `[${r.role}]\n${r.output}`)
    .join("\n\n---\n\n");
  
  const result = await writerAgent.invoke({
    task: task.description,
    materials: allResults || task.input,
    style: "formal",
  });
  
  const duration = Date.now() - startTime;
  
  return {
    agentResults: [{
      taskId: task.id,
      role: "writer" as const,
      success: true,
      output: result.output,
      duration,
      timestamp: new Date().toISOString(),
    }],
  };
}

export async function synthesizeNode(state: MultiAgentStateType) {
  console.log(`\n📥 协调者: 综合结果`);
  
  const researchOutputs = state.agentResults
    .filter(r => r.role === "researcher")
    .map(r => r.output);
    
  const analysisOutputs = state.agentResults
    .filter(r => r.role === "analyst")
    .map(r => r.output);
    
  const writingOutputs = state.agentResults
    .filter(r => r.role === "writer")
    .map(r => r.output);
  
  const allInsights = state.agentResults
    .flatMap(r => r.insights || []);
  
  const response = await llm.invoke([
    new SystemMessage(`你是一个综合分析专家。请根据多个 Agent 的输出，生成最终的综合报告。

请包含：
1. 执行摘要（200字以内）
2. 关键发现（3-5个要点）
3. 建议与行动项（3-5条）
4. 详细报告`),
    new HumanMessage(`请综合以下内容生成最终报告：

## 研究结果
${researchOutputs.join("\n\n")}

## 分析结果
${analysisOutputs.join("\n\n")}

## 撰写内容
${writingOutputs.join("\n\n")}

## 关键洞察
${allInsights.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}`),
  ]);
  
  const content = response.content as string;
  
  const summaryMatch = content.match(/执行摘要[：:]([\s\S]*?)(?=关键|##|$)/i);
  const findingsMatch = content.match(/关键发现[：:]([\s\S]*?)(?=建议|##|$)/i);
  const recommendationsMatch = content.match(/建议[：:]([\s\S]*?)(?=详细|##|$)/i);
  
  const parseList = (text: string | undefined) =>
    text ? text.split(/\d+\./g).filter(i => i.trim()).map(i => i.trim()) : [];
  
  console.log(`   📝 综合报告生成完成`);
  
  return {
    synthesis: {
      summary: summaryMatch?.[1]?.trim() || content.slice(0, 200),
      keyFindings: parseList(findingsMatch?.[1]),
      recommendations: parseList(recommendationsMatch?.[1]),
      finalReport: content,
    },
    phase: "reviewing" as const,
  };
}

export async function humanReviewNode(state: MultiAgentStateType) {
  console.log(`\n👤 等待人工审核...`);
  
  const reviewData = interrupt({
    type: "final_review",
    message: "请审核最终报告",
    synthesis: state.synthesis,
    agentResults: state.agentResults.map(r => ({
      role: r.role,
      success: r.success,
      duration: r.duration,
    })),
    options: ["approve", "revise", "reject"],
  });
  
  const { action, feedback } = reviewData as {
    action: "approve" | "revise" | "reject";
    feedback?: string;
  };
  
  if (action === "approve") {
    console.log(`   ✅ 人工审核通过`);
    return {
      humanApproval: { required: true, approved: true, feedback },
      phase: "complete" as const,
    };
  }
  
  if (action === "revise") {
    console.log(`   ✏️  需要修改: ${feedback}`);
    return {
      humanApproval: { required: true, approved: false, feedback },
      messages: [new HumanMessage(feedback || "请根据反馈修改")],
      phase: "executing" as const,
    };
  }
  
  console.log(`   ❌ 审核被拒绝: ${feedback}`);
  return {
    humanApproval: { required: true, approved: false, feedback },
    phase: "complete" as const,
  };
}

export function routeAfterExecution(state: MultiAgentStateType): string {
  const completedTasks = state.agentResults.length;
  const totalTasks = state.subTasks.length;
  
  if (completedTasks >= totalTasks) {
    return "synthesize";
  }
  
  return "dispatch";
}
```

---

## 第五步：构建主图

### src/graph.ts

```typescript
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { MultiAgentState } from "./state.js";
import {
  planningNode,
  dispatchNode,
  executeResearcherNode,
  executeAnalystNode,
  executeWriterNode,
  synthesizeNode,
  humanReviewNode,
  routeAfterExecution,
} from "./coordinator.js";

const graph = new StateGraph(MultiAgentState)
  .addNode("planning", planningNode)
  .addNode("dispatch", dispatchNode)
  .addNode("executeResearcher", executeResearcherNode)
  .addNode("executeAnalyst", executeAnalystNode)
  .addNode("executeWriter", executeWriterNode)
  .addNode("synthesize", synthesizeNode)
  .addNode("humanReview", humanReviewNode)
  
  .addEdge(START, "planning")
  .addEdge("planning", "dispatch")
  
  .addEdge("executeResearcher", "synthesize")
  .addEdge("executeAnalyst", "synthesize")
  .addEdge("executeWriter", "synthesize")
  
  .addConditionalEdges("synthesize", (state) => {
    if (state.humanApproval.required) {
      return "humanReview";
    }
    return "end";
  }, {
    humanReview: "humanReview",
    end: END,
  })
  
  .addConditionalEdges("humanReview", (state) => {
    if (state.phase === "executing") {
      return "dispatch";
    }
    return "end";
  }, {
    dispatch: "dispatch",
    end: END,
  });

const checkpointer = new MemorySaver();

export const multiAgentSystem = graph.compile({ checkpointer });
```

**💡 流程图：**

```
START
  │
  ▼
┌──────────────┐
│   planning   │ ← 任务分解
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   dispatch   │ ← 返回 Send[]
└──────┬───────┘
       │
    ┌──┴───────────────────┐
    │          │           │
    ▼          ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐
│Research│ │Analyst │ │Writer  │  ← 并行执行
└───┬────┘ └───┬────┘ └───┬────┘
    │          │           │
    └──────────┴───────────┘
               │
               ▼
        ┌────────────┐
        │ synthesize │ ← 综合结果
        └─────┬──────┘
              │
              ▼
        ┌────────────┐
        │humanReview │ ← 人工审核
        └─────┬──────┘
              │
         ┌────┴────┐
         │         │
      approve   revise
         │         │
         ▼         ▼
        END    dispatch（循环）
```

---

## 第六步：入口文件

### src/index.ts

```typescript
import { multiAgentSystem } from "./graph.js";
import { Command } from "@langchain/langgraph";

async function runMultiAgentTask(task: string) {
  console.log("═".repeat(70));
  console.log("🤖 多 Agent 协作系统");
  console.log("═".repeat(70));
  console.log(`\n📋 主任务: ${task}`);
  
  const config = {
    configurable: {
      thread_id: `multi-agent-${Date.now()}`,
    },
  };
  
  const startTime = Date.now();
  
  let result = await multiAgentSystem.invoke(
    {
      mainTask: task,
      humanApproval: { required: true },
    },
    config
  );
  
  while (true) {
    const state = await multiAgentSystem.getState(config);
    
    if (!state.next || state.next.length === 0) {
      break;
    }
    
    const interruptValue = state.tasks?.[0]?.interrupts?.[0]?.value;
    if (interruptValue) {
      console.log("\n" + "─".repeat(70));
      console.log("👤 人工审核");
      console.log("─".repeat(70));
      
      const decision = await simulateHumanReview(interruptValue);
      result = await multiAgentSystem.invoke(
        new Command({ resume: decision }),
        config
      );
    } else {
      break;
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  console.log("\n" + "═".repeat(70));
  console.log("📊 执行结果");
  console.log("═".repeat(70));
  
  console.log(`\n⏱️  总耗时: ${totalTime}ms`);
  console.log(`📝 子任务数: ${result.subTasks?.length || 0}`);
  console.log(`✅ 完成任务: ${result.agentResults?.length || 0}`);
  
  if (result.agentResults && result.agentResults.length > 0) {
    console.log("\n📋 各 Agent 执行情况:");
    result.agentResults.forEach((r: any, i: number) => {
      const icon = r.success ? "✅" : "❌";
      console.log(`   ${i + 1}. ${icon} [${r.role}] ${r.duration}ms`);
      if (r.insights && r.insights.length > 0) {
        console.log(`      洞察: ${r.insights.slice(0, 2).join("; ")}...`);
      }
    });
  }
  
  if (result.synthesis) {
    console.log("\n" + "─".repeat(70));
    console.log("📝 执行摘要:");
    console.log("─".repeat(70));
    console.log(result.synthesis.summary);
    
    if (result.synthesis.keyFindings.length > 0) {
      console.log("\n🔍 关键发现:");
      result.synthesis.keyFindings.forEach((f: string, i: number) => {
        console.log(`   ${i + 1}. ${f}`);
      });
    }
    
    if (result.synthesis.recommendations.length > 0) {
      console.log("\n💡 建议:");
      result.synthesis.recommendations.forEach((r: string, i: number) => {
        console.log(`   ${i + 1}. ${r}`);
      });
    }
    
    console.log("\n" + "─".repeat(70));
    console.log("📄 完整报告:");
    console.log("─".repeat(70));
    console.log(result.synthesis.finalReport);
  }
  
  if (result.humanApproval) {
    console.log("\n" + "─".repeat(70));
    console.log("👤 审核状态:");
    console.log(`   ${result.humanApproval.approved ? "✅ 已通过" : "❌ 未通过"}`);
    if (result.humanApproval.feedback) {
      console.log(`   反馈: ${result.humanApproval.feedback}`);
    }
  }
  
  console.log("\n" + "═".repeat(70));
  
  return result;
}

async function simulateHumanReview(interruptValue: any): Promise<any> {
  console.log(`\n   类型: ${interruptValue.type}`);
  console.log(`   消息: ${interruptValue.message}`);
  
  if (interruptValue.synthesis) {
    console.log(`   摘要预览: ${interruptValue.synthesis.summary?.slice(0, 100)}...`);
  }
  
  if (interruptValue.agentResults) {
    console.log(`   Agent 执行情况:`);
    interruptValue.agentResults.forEach((r: any) => {
      console.log(`      - ${r.role}: ${r.success ? "成功" : "失败"} (${r.duration}ms)`);
    });
  }
  
  await new Promise(r => setTimeout(r, 500));
  
  return {
    action: "approve",
    feedback: "报告内容完整，分析深入，同意发布",
  };
}

async function main() {
  await runMultiAgentTask(
    "分析人工智能对未来教育的影响，并提出应对策略建议"
  );
}

main().catch(console.error);
```

---

## 第七步：运行测试

```bash
npm install

npm run dev
```

### 预期输出

```
══════════════════════════════════════════════════════════════════════
🤖 多 Agent 协作系统
══════════════════════════════════════════════════════════════════════

📋 主任务: 分析人工智能对未来教育的影响，并提出应对策略建议

🎯 协调者: 任务规划
   主任务: 分析人工智能对未来教育的影响，并提出应对策略建议
   📋 分解为 3 个子任务:
      1. [researcher] 研究AI在教育领域的应用现状和发展趋势
      2. [analyst] 分析AI对教育的正面和负面影响
      3. [writer] 撰写综合分析报告和策略建议

📤 协调者: 分发任务
   → 分发研究任务: 研究AI在教育领域的应用现状和发展趋势
   → 分发分析任务: 分析AI对教育的正面和负面影响
   → 分发写作任务: 撰写综合分析报告和策略建议

   🔬 执行研究任务: 研究AI在教育领域的应用现状和发展趋势
      🔬 研究 Agent 开始工作...
      ✅ 研究完成，发现 4 个关键点

   📊 执行分析任务: 分析AI对教育的正面和负面影响
      📊 分析 Agent 开始工作...
      ✅ 分析完成

   ✍️  执行写作任务: 撰写综合分析报告和策略建议
      ✍️  写作 Agent 开始工作...
      ✅ 写作完成，2456 字符

📥 协调者: 综合结果
   📝 综合报告生成完成

──────────────────────────────────────────────────────────────────────
👤 人工审核
──────────────────────────────────────────────────────────────────────

   类型: final_review
   消息: 请审核最终报告
   摘要预览: 人工智能正在深刻改变教育领域，从个性化学习到智能评估，AI技术...
   Agent 执行情况:
      - researcher: 成功 (1234ms)
      - analyst: 成功 (1567ms)
      - writer: 成功 (2345ms)
   ✅ 人工审核通过

══════════════════════════════════════════════════════════════════════
📊 执行结果
══════════════════════════════════════════════════════════════════════

⏱️  总耗时: 6234ms
📝 子任务数: 3
✅ 完成任务: 3

📋 各 Agent 执行情况:
   1. ✅ [researcher] 1234ms
      洞察: AI个性化学习系统快速普及; 智能评估工具提升效率...
   2. ✅ [analyst] 1567ms
      洞察: 教育公平性可能受到影响; 教师角色将发生转变...
   3. ✅ [writer] 2345ms

──────────────────────────────────────────────────────────────────────
📝 执行摘要:
──────────────────────────────────────────────────────────────────────
人工智能正在深刻改变教育领域，带来个性化学习、智能评估等创新应用，
同时也引发教育公平、教师角色转变等挑战。本报告综合分析了AI对教育的
多维度影响，并提出了循序渐进、人机协作、重视伦理的应对策略。

🔍 关键发现:
   1. AI个性化学习系统可将学习效率提升40%
   2. 教师角色正从知识传授者转变为学习引导者
   3. 教育资源不平等可能因技术差距而加剧
   4. 学生数据隐私保护成为核心关注点

💡 建议:
   1. 制定AI教育应用的伦理准则和监管框架
   2. 加强教师AI素养培训，实现人机协作
   3. 建立教育AI公共服务平台，促进资源共享
   4. 保护学生数据隐私，确保算法透明可解释

──────────────────────────────────────────────────────────────────────
📄 完整报告:
──────────────────────────────────────────────────────────────────────
[完整的综合报告内容...]

──────────────────────────────────────────────────────────────────────
👤 审核状态:
   ✅ 已通过
   反馈: 报告内容完整，分析深入，同意发布

══════════════════════════════════════════════════════════════════════
```

---

## 多 Agent 协作模式详解

### 架构对比

```
┌─────────────────────────────────────────────────────────────────┐
│                    多 Agent 协作架构                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌──────────────┐                             │
│                    │  协调者 Agent │ ← 任务分解、分发、汇总      │
│                    └──────┬───────┘                             │
│                           │                                     │
│            ┌──────────────┼──────────────┐                      │
│            │              │              │                      │
│            ▼              ▼              ▼                      │
│     ┌──────────┐   ┌──────────┐   ┌──────────┐                  │
│     │研究 Agent│   │分析 Agent│   │写作 Agent│  ← 专业子图      │
│     └─────┬────┘   └─────┬────┘   └─────┬────┘                  │
│           │              │              │                       │
│           └──────────────┼──────────────┘                       │
│                          │                                      │
│                          ▼                                      │
│                   ┌────────────┐                                │
│                   │ 结果汇总   │                                │
│                   └─────┬──────┘                                │
│                         │                                       │
│                         ▼                                       │
│                   ┌────────────┐                                │
│                   │ 人工审核   │                                │
│                   └────────────┘                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 协作模式对比

| 模式 | 特点 | 适用场景 |
|------|------|----------|
| 顺序执行 | Agent 按固定顺序执行 | 有严格依赖关系的任务 |
| 并行执行 | 多个 Agent 同时执行 | 可独立完成的子任务 |
| 层级协作 | 主 Agent 协调子 Agent | 复杂的多阶段任务 |
| 对等协作 | Agent 之间平等通信 | 需要频繁交互的任务 |

---

## 项目总结

### 核心实现

| 功能 | 实现方式 |
|------|----------|
| 任务分解 | 协调者 Agent + LLM 规划 |
| 并行执行 | Send API 分发到子图 |
| 专业 Agent | 独立子图封装 |
| 结果汇总 | 综合节点 + LLM 整合 |
| 人工审核 | interrupt() + 条件循环 |

### 系统架构回顾

```
┌───────────────────────────────────────────────────────────┐
│                      主图（协调者）                        │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  planning → dispatch → [并行子图] → synthesize → review   │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                        子图层                              │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐          │
│  │ Researcher │  │  Analyst   │  │   Writer   │          │
│  │   子图     │  │   子图     │  │   子图     │          │
│  └────────────┘  └────────────┘  └────────────┘          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

### 关键代码模式

**Send API 分发：**
```typescript
function dispatchNode(state: MultiAgentStateType): Send[] {
  return state.subTasks.map(task => 
    new Send(`execute${capitalize(task.role)}`, { currentTask: task })
  );
}
```

**子图调用：**
```typescript
const result = await researcherAgent.invoke({
  task: task.description,
});
```

**结果汇聚：**
```typescript
const allResults = state.agentResults
  .map(r => `[${r.role}]\n${r.output}`)
  .join("\n\n");
```

---

## 核心要点回顾

1. **协调者模式** —— 中央 Agent 负责任务分解、分发和汇总
2. **子图封装** —— 每个专业 Agent 独立为一个子图
3. **Send API 并行** —— 动态分发任务到不同子图
4. **结果聚合** —— 追加 Reducer 自动收集所有 Agent 输出
5. **人工审核闭环** —— interrupt() 实现最终确认

---

## 系列教程总结

恭喜你完成了 **LangGraph 系列教程** 的全部学习！

### 学习路径回顾

| 篇章 | 核心内容 |
|------|----------|
| 基础入门篇 | LangGraph 概述、安装、快速开始 |
| 核心概念篇 | Graph API、State、Reducer、Edges |
| 工作流模式篇 | 6 种核心工作流模式 |
| 持久化与记忆篇 | Checkpointer、Memory、时间旅行 |
| 流式处理篇 | 5 种流模式、Token 流 |
| 人机协作篇 | interrupt()、Command({ resume }) |
| 高级架构篇 | 子图、应用结构 |
| 开发工具篇 | LangSmith Studio、部署、可观测性 |
| 项目实战篇 | 6 个完整项目实战 |

### 掌握的核心技能

1. ✅ 使用 StateGraph 构建复杂工作流
2. ✅ 设计合理的状态结构和 Reducer
3. ✅ 实现持久化和多轮对话记忆
4. ✅ 使用流式输出提升用户体验
5. ✅ 通过 interrupt() 实现人机协作
6. ✅ 使用子图模块化复杂应用
7. ✅ 使用 Send API 实现动态并行
8. ✅ 构建自主决策的 Agent
9. ✅ 设计多 Agent 协作系统

### 下一步建议

1. **深入实践** —— 将所学应用到实际项目中
2. **探索进阶** —— 研究 LangGraph 源码和高级特性
3. **社区贡献** —— 分享你的经验和最佳实践
4. **持续学习** —— 关注 LangGraph 的最新更新和功能

---

**感谢你的学习！祝你在 AI 应用开发的道路上越走越远！** 🚀
