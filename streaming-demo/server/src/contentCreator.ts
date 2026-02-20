import { ChatOpenAI } from "@langchain/openai";
import { tool } from "langchain";
import { z } from "zod";
import {
  StateGraph,
  MessagesAnnotation,
  Annotation,
  MemorySaver,
} from "@langchain/langgraph";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";

const model = new ChatOpenAI({
  model: "deepseek/deepseek-v3.2-251201",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const webSearch = tool(
  async ({ query }) => {
    await new Promise((r) => setTimeout(r, 800));
    const mockResults: Record<string, string> = {
      "AI 医疗": `
## AI 医疗行业调研
1. **市场规模**: 2024年全球AI医疗市场规模预计达到150亿美元，年增长率超过40%
2. **主要应用**: 医学影像诊断、药物研发、个性化治疗、医疗机器人
3. **典型案例**: 
   - Google DeepMind 的 AlphaFold 蛋白质结构预测
   - IBM Watson 肿瘤诊断系统
   - 达芬奇手术机器人
4. **挑战**: 数据隐私、算法透明度、医疗责任界定`,
      default: `
## 调研结果
关于 "${query}" 的调研显示：
- 这是一个快速发展的领域
- 市场潜力巨大
- 技术创新活跃
- 需要关注政策法规动态`,
    };

    const key = Object.keys(mockResults).find((k) => query.includes(k));
    return key ? mockResults[key] : mockResults["default"];
  },
  {
    name: "web_search",
    description: "搜索互联网获取最新信息",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
    }),
  }
);

const newsSearch = tool(
  async ({ query, days }) => {
    await new Promise((r) => setTimeout(r, 600));
    return `
## 最近${days}天的相关新闻
1. [行业动态] ${query}领域迎来新突破，多家企业宣布重大进展
2. [政策解读] 国家出台新政策支持${query}产业发展
3. [投资热点] 资本持续涌入${query}赛道，头部企业融资不断`;
  },
  {
    name: "news_search",
    description: "搜索最近的新闻动态",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
      days: z.number().default(7).describe("搜索最近多少天的新闻"),
    }),
  }
);

const factCheck = tool(
  async ({ statement }) => {
    await new Promise((r) => setTimeout(r, 500));
    const checks = [
      { pattern: /\d+%/, result: "数据来源可靠，已核实" },
      { pattern: /\d+亿/, result: "金额数据已通过公开报告验证" },
      { pattern: /专家|研究/, result: "引用来源真实可查" },
    ];

    for (const check of checks) {
      if (check.pattern.test(statement)) {
        return `✅ 事实核查通过: ${check.result}`;
      }
    }
    return `⚠️ 建议补充数据来源`;
  },
  {
    name: "fact_check",
    description: "核实文章中的事实陈述",
    schema: z.object({
      statement: z.string().describe("需要核实的陈述"),
    }),
  }
);

const researcherModel = model.bindTools([webSearch, newsSearch]);
const editorModel = model.bindTools([factCheck]);

const ContentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  topic: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  style: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "专业",
  }),
  researchReport: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  articleDraft: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  reviewResult: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  finalArticle: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
  currentStage: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "idle",
  }),
  agentName: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "",
  }),
});

async function supervisorNode(
  state: typeof ContentState.State
): Promise<Partial<typeof ContentState.State>> {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage instanceof HumanMessage) {
    const topic = lastMessage.content as string;
    return {
      topic,
      currentStage: "researching",
      agentName: "supervisor",
      messages: [
        new AIMessage({
          content: `好的，我来协调团队为您创作关于「${topic}」的文章。\n\n🔍 **第一步：资料调研**\n正在启动研究员收集相关资料...`,
          id: `supervisor_${Date.now()}`,
        }),
      ],
    };
  }

  if (state.currentStage === "research_done") {
    return {
      currentStage: "writing",
      agentName: "supervisor",
      messages: [
        new AIMessage({
          content: `📝 **第二步：文章撰写**\n调研完成！现在让写手根据资料撰写文章...`,
          id: `supervisor_${Date.now()}`,
        }),
      ],
    };
  }

  if (state.currentStage === "writing_done") {
    return {
      currentStage: "reviewing",
      agentName: "supervisor",
      messages: [
        new AIMessage({
          content: `📋 **第三步：内容审核**\n草稿完成！现在让审核员进行质量检查...`,
          id: `supervisor_${Date.now()}`,
        }),
      ],
    };
  }

  if (state.currentStage === "review_done") {
    return {
      currentStage: "completed",
      agentName: "supervisor",
      messages: [
        new AIMessage({
          content: `✅ **创作完成！**\n\n文章已通过审核，以下是最终稿件：\n\n---\n\n${state.finalArticle}`,
          id: `supervisor_${Date.now()}`,
        }),
      ],
    };
  }

  return {};
}

async function researcherNode(
  state: typeof ContentState.State
): Promise<Partial<typeof ContentState.State>> {
  const systemPrompt = new SystemMessage({
    content: `你是一位专业的资料研究员。你的任务是：
1. 使用 web_search 工具搜索主题相关的背景信息
2. 使用 news_search 工具获取最新动态
3. 整理成结构化的调研报告

输出格式：
## 调研报告：[主题]
### 行业概述
[内容]
### 关键数据
[内容]
### 最新动态
[内容]
### 参考要点
[内容]`,
  });

  const userMessage = new HumanMessage({
    content: `请调研以下主题：${state.topic}`,
  });

  let report = "";
  const messages: BaseMessage[] = [];

  const response1 = await researcherModel.invoke([systemPrompt, userMessage]);
  messages.push(response1);

  if (response1.tool_calls && response1.tool_calls.length > 0) {
    for (const toolCall of response1.tool_calls) {
      let result = "";
      if (toolCall.name === "web_search") {
        result = await webSearch.invoke(toolCall.args as { query: string });
      } else if (toolCall.name === "news_search") {
        result = await newsSearch.invoke(
          toolCall.args as { query: string; days: number }
        );
      }
      report += result + "\n\n";
    }
  }

  const finalResponse = await model.invoke([
    systemPrompt,
    userMessage,
    new AIMessage({ content: "以下是搜索到的资料：\n" + report }),
    new HumanMessage({ content: "请根据以上资料整理一份结构化的调研报告" }),
  ]);

  const finalReport = finalResponse.content as string;

  return {
    researchReport: finalReport,
    currentStage: "research_done",
    agentName: "researcher",
    messages: [
      new AIMessage({
        content: `🔍 **研究员调研报告**\n\n${finalReport}`,
        id: `researcher_${Date.now()}`,
      }),
    ],
  };
}

async function writerNode(
  state: typeof ContentState.State
): Promise<Partial<typeof ContentState.State>> {
  const systemPrompt = new SystemMessage({
    content: `你是一位专业的内容写手。你的任务是：
1. 基于调研资料撰写高质量文章
2. 确保结构清晰、逻辑严谨
3. 语言生动、易于理解
4. 合理引用数据和观点

文章要求：
- 引人入胜的开头
- 清晰的章节划分（3-4个章节）
- 每个章节有小标题
- 有力的结尾/总结
- 字数约 800-1200 字
- 风格：${state.style}`,
  });

  const userMessage = new HumanMessage({
    content: `请根据以下调研资料撰写文章：

主题：${state.topic}

调研资料：
${state.researchReport}`,
  });

  const response = await model.invoke([systemPrompt, userMessage]);
  const draft = response.content as string;

  return {
    articleDraft: draft,
    currentStage: "writing_done",
    agentName: "writer",
    messages: [
      new AIMessage({
        content: `✍️ **写手文章草稿**\n\n${draft}`,
        id: `writer_${Date.now()}`,
      }),
    ],
  };
}

async function editorNode(
  state: typeof ContentState.State
): Promise<Partial<typeof ContentState.State>> {
  const systemPrompt = new SystemMessage({
    content: `你是一位资深的内容审核编辑。你的任务是：
1. 检查文章的事实准确性（使用 fact_check 工具）
2. 优化语言表达，提升可读性
3. 检查逻辑是否通顺
4. 给出评分和改进建议

输出格式：
## 审核结果
- 整体评分：[1-10分]
- 通过状态：[通过/需修改]

## 修改要点
1. [要点1]
2. [要点2]

## 润色后文章
[完整的润色后文章]`,
  });

  const userMessage = new HumanMessage({
    content: `请审核并润色以下文章：

${state.articleDraft}`,
  });

  let factCheckResults = "";
  const sentences = state.articleDraft.match(/[^。！？]+[。！？]/g) || [];
  const samplesToCheck = sentences.slice(0, 3);

  for (const sentence of samplesToCheck) {
    if (sentence.match(/\d+|专家|研究|报告/)) {
      const result = await factCheck.invoke({ statement: sentence });
      factCheckResults += result + "\n";
    }
  }

  const response = await model.invoke([
    systemPrompt,
    userMessage,
    new AIMessage({
      content: `事实核查结果：\n${factCheckResults || "未发现需要核查的关键数据"}`,
    }),
    new HumanMessage({ content: "请根据核查结果完成审核并输出润色后的文章" }),
  ]);

  const reviewContent = response.content as string;
  const articleMatch = reviewContent.match(
    /## 润色后文章\s*([\s\S]*?)(?=$|##)/
  );
  const finalArticle = articleMatch
    ? articleMatch[1].trim()
    : state.articleDraft;

  return {
    reviewResult: reviewContent,
    finalArticle,
    currentStage: "review_done",
    agentName: "editor",
    messages: [
      new AIMessage({
        content: `📋 **审核员审核结果**\n\n${reviewContent}`,
        id: `editor_${Date.now()}`,
      }),
    ],
  };
}

function routeAfterSupervisor(
  state: typeof ContentState.State
): "researcher" | "writer" | "editor" | "__end__" {
  switch (state.currentStage) {
    case "researching":
      return "researcher";
    case "writing":
      return "writer";
    case "reviewing":
      return "editor";
    case "completed":
      return "__end__";
    default:
      return "__end__";
  }
}

function routeBackToSupervisor(
  state: typeof ContentState.State
): "supervisor" | "__end__" {
  if (state.currentStage === "completed") {
    return "__end__";
  }
  return "supervisor";
}

const workflow = new StateGraph(ContentState)
  .addNode("supervisor", supervisorNode)
  .addNode("researcher", researcherNode)
  .addNode("writer", writerNode)
  .addNode("editor", editorNode)
  .addEdge("__start__", "supervisor")
  .addConditionalEdges("supervisor", routeAfterSupervisor)
  .addConditionalEdges("researcher", routeBackToSupervisor)
  .addConditionalEdges("writer", routeBackToSupervisor)
  .addConditionalEdges("editor", routeBackToSupervisor);

const checkpointer = new MemorySaver();

export const contentCreatorGraph = workflow.compile({
  checkpointer,
});

export type ContentCreatorType = typeof contentCreatorGraph;
