import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { MemorySaver } from "@langchain/langgraph";
import { z } from "zod";

// 天气查询工具
const getWeather = tool(
  async ({ city }) => {
    const weatherData: Record<string, string> = {
      beijing: "北京: 22°C, 晴朗",
      shanghai: "上海: 25°C, 多云",
      tokyo: "东京: 20°C, 小雨",
      "san francisco": "旧金山: 18°C, 雾",
      "new york": "纽约: 15°C, 阴天",
    };
    const result = weatherData[city.toLowerCase()] || `${city}: 暂无数据`;
    return JSON.stringify({ status: "success", content: result });
  },
  {
    name: "get_weather",
    description: "获取指定城市的天气信息",
    schema: z.object({
      city: z.string().describe("城市名称，如 'Beijing' 或 '北京'"),
    }),
  }
);

// 计算器工具
const calculator = tool(
  async ({ expression }) => {
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return JSON.stringify({
        status: "success",
        content: `${expression} = ${result}`,
      });
    } catch {
      return JSON.stringify({
        status: "error",
        content: `无法计算表达式: ${expression}`,
      });
    }
  },
  {
    name: "calculator",
    description: "计算数学表达式",
    schema: z.object({
      expression: z.string().describe("数学表达式，如 '2 + 2' 或 '10 * 5'"),
    }),
  }
);

// 搜索工具
const search = tool(
  async ({ query }) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return JSON.stringify({
      status: "success",
      content: `搜索 "${query}" 的结果: 这是一个模拟的搜索结果。在实际应用中，这里会返回真实的搜索数据。`,
    });
  },
  {
    name: "search",
    description: "搜索互联网获取信息",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
    }),
  }
);

const model = new ChatOpenAI({
  model: "deepseek/deepseek-v3.2-251201",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 使用 MemorySaver 支持多轮对话
const checkpointer = new MemorySaver();

export const agent = createAgent({
  model,
  tools: [getWeather, calculator, search],
  checkpointer,
  systemPrompt: `你是一个友好的 AI 助手。你可以:
1. 查询天气信息 (get_weather)
2. 进行数学计算 (calculator)  
3. 搜索信息 (search)

请用中文回答用户的问题，保持友好和专业。`,
});

export type AgentType = typeof agent;
