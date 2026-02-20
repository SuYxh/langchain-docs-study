> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# 工作流与智能体

本指南回顾常见的工作流与智能体模式。

* 工作流具有预先确定的代码路径，并被设计为按特定顺序运行。
* 智能体是动态的，并定义自己的流程与工具使用方式。

<img src="https://qn.huat.xyz/mac/202602201638936.png" alt="智能体工作流" data-og-width="4572" width="4572" data-og-height="2047" height="2047" data-path="oss/images/agent_workflow.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent_workflow.png?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=290e50cff2f72d524a107421ec8e3ff0 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent_workflow.png?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=a2bfc87080aee7dd4844f7f24035825e 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent_workflow.png?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=ae1fa9087b33b9ff8bc3446ccaa23e3d 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent_workflow.png?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=06003ee1fe07d7a1ea8cf9200e7d0a10 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent_workflow.png?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=bc98b459a9b1fb226c2887de1696bde0 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent_workflow.png?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=1933bcdfd5c5b69b98ce96aafa456848 2500w" />

LangGraph 在构建智能体与工作流时提供多项优势，包括 [持久化](/oss/javascript/langgraph/persistence)、[流式输出](/oss/javascript/langgraph/streaming)、对调试的支持以及 [部署](/oss/javascript/langgraph/deploy) 支持。

## 设置

要构建工作流或智能体，你可以使用支持结构化输出与工具调用的 [任意聊天模型](/oss/javascript/integrations/chat)。下面的示例使用 Anthropic：

1. 安装依赖

<CodeGroup>
  ```bash npm theme={null}
  npm install @langchain/langgraph @langchain/core
  ```

  ```bash pnpm theme={null}
  pnpm add @langchain/langgraph @langchain/core
  ```

  ```bash yarn theme={null}
  yarn add @langchain/langgraph @langchain/core
  ```

  ```bash bun theme={null}
  bun add @langchain/langgraph @langchain/core
  ```
</CodeGroup>

2. 初始化大语言模型（LLM）：

```typescript  theme={null}
import { ChatAnthropic } from "@langchain/anthropic";

const llm = new ChatAnthropic({
  model: "claude-sonnet-4-5-20250929",
  apiKey: "<your_anthropic_key>"
});
```

## LLM 与增强能力

工作流与智能体系统以 LLM 为基础，并依赖你为其添加的各种增强能力。[工具调用](/oss/javascript/langchain/tools)、[结构化输出](/oss/javascript/langchain/structured-output) 以及 [短期记忆](/oss/javascript/langchain/short-term-memory) 是用于按需定制 LLM 的一些选项。

<img src="https://qn.huat.xyz/mac/202602201638941.png" alt="LLM 增强能力" data-og-width="1152" width="1152" data-og-height="778" height="778" data-path="oss/images/augmented_llm.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/augmented_llm.png?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=53613048c1b8bd3241bd27900a872ead 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/augmented_llm.png?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=7ba1f4427fd847bd410541ae38d66d40 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/augmented_llm.png?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=503822cf29a28500deb56f463b4244e4 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/augmented_llm.png?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=279e0440278d3a26b73c72695636272e 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/augmented_llm.png?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=d936838b98bc9dce25168e2b2cfd23d0 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/augmented_llm.png?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=fa2115f972bc1152b5e03ae590600fa3 2500w" />

```typescript  theme={null}

import * as z from "zod";
import { tool } from "langchain";

// 结构化输出的模式（Schema）
const SearchQuery = z.object({
  search_query: z.string().describe("为网络搜索优化的查询。"),
  justification: z
    .string()
    .describe("为什么该查询与用户请求相关。"),
});

// 使用结构化输出模式增强 LLM
const structuredLlm = llm.withStructuredOutput(SearchQuery);

// 调用增强后的 LLM
const output = await structuredLlm.invoke(
  "钙化 CT 评分与高胆固醇有什么关系？"
);

// 定义一个工具
const multiply = tool(
  ({ a, b }) => {
    return a * b;
  },
  {
    name: "multiply",
    description: "将两个数字相乘",
    schema: z.object({
      a: z.number(),
      b: z.number(),
    }),
  }
);

// 使用工具增强 LLM
const llmWithTools = llm.bindTools([multiply]);

// 使用会触发工具调用的输入来调用 LLM
const msg = await llmWithTools.invoke("2 乘以 3 等于多少？");

// 获取工具调用
console.log(msg.tool_calls);
```

## 提示词链（Prompt chaining）

提示词链是指每次 LLM 调用都处理上一次调用的输出。它通常用于执行定义明确的任务，这些任务可拆分为更小、可验证的步骤。一些示例包括：

* 将文档翻译成不同语言
* 验证生成内容的一致性

<img src="https://qn.huat.xyz/mac/202602201638930.png" alt="提示词链" data-og-width="1412" width="1412" data-og-height="444" height="444" data-path="oss/images/prompt_chain.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/prompt_chain.png?w=280&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=fda27cf4f997e350d4ce48be16049c47 280w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/prompt_chain.png?w=560&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=1374b6de11900d394fc73722a3a6040e 560w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/prompt_chain.png?w=840&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=25246c7111a87b5df5a2af24a0181efe 840w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/prompt_chain.png?w=1100&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=0c57da86a49cf966cc090497ade347f1 1100w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/prompt_chain.png?w=1650&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=a1b5c8fc644d7a80c0792b71769c97da 1650w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/prompt_chain.png?w=2500&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=8a3f66f0e365e503a85b30be48bc1a76 2500w" />

<CodeGroup>
  ```typescript Graph API theme={null}
  import { StateGraph, StateSchema, GraphNode, ConditionalEdgeRouter } from "@langchain/langgraph";
  import { z } from "zod/v4";

  // 图的状态
  const State = new StateSchema({
    topic: z.string(),
    joke: z.string(),
    improvedJoke: z.string(),
    finalJoke: z.string(),
  });

  // 定义节点函数

  // 第一次 LLM 调用：生成初始笑话
  const generateJoke: GraphNode<typeof State> = async (state) => {
    const msg = await llm.invoke(`写一个关于 ${state.topic} 的简短笑话`);
    return { joke: msg.content };
  };

  // 门禁函数：检查笑话是否有“包袱”
  const checkPunchline: ConditionalEdgeRouter<typeof State, "improveJoke"> = (state) => {
    // 简单检查：笑话是否包含 "?" 或 "!"
    if (state.joke?.includes("?") || state.joke?.includes("!")) {
      return "Pass";
    }
    return "Fail";
  };

  // 第二次 LLM 调用：改进笑话
  const improveJoke: GraphNode<typeof State> = async (state) => {
    const msg = await llm.invoke(
      `通过加入双关语让这个笑话更好笑：${state.joke}`
    );
    return { improvedJoke: msg.content };
  };

  // 第三次 LLM 调用：最终润色
  const polishJoke: GraphNode<typeof State> = async (state) => {
    const msg = await llm.invoke(
      `为这个笑话添加一个出人意料的反转：${state.improvedJoke}`
    );
    return { finalJoke: msg.content };
  };

  // 构建工作流
  const chain = new StateGraph(State)
    .addNode("generateJoke", generateJoke)
    .addNode("improveJoke", improveJoke)
    .addNode("polishJoke", polishJoke)
    .addEdge("__start__", "generateJoke")
    .addConditionalEdges("generateJoke", checkPunchline, {
      Pass: "improveJoke",
      Fail: "__end__"
    })
    .addEdge("improveJoke", "polishJoke")
    .addEdge("polishJoke", "__end__")
    .compile();

  // 调用
  const state = await chain.invoke({ topic: "cats" });
  console.log("初始笑话：");
  console.log(state.joke);
  console.log("\n--- --- ---\n");
  if (state.improvedJoke !== undefined) {
    console.log("改进后的笑话：");
    console.log(state.improvedJoke);
    console.log("\n--- --- ---\n");

    console.log("最终笑话：");
    console.log(state.finalJoke);
  } else {
    console.log("笑话未通过质量门禁——未检测到包袱！");
  }
  ```

  ```typescript Functional API theme={null}
  import { task, entrypoint } from "@langchain/langgraph";

  // 任务（Tasks）

  // 第一次 LLM 调用：生成初始笑话
  const generateJoke = task("generateJoke", async (topic: string) => {
    const msg = await llm.invoke(`写一个关于 ${topic} 的简短笑话`);
    return msg.content;
  });

  // 门禁函数：检查笑话是否有“包袱”
  function checkPunchline(joke: string) {
    // 简单检查：笑话是否包含 "?" 或 "!"
    if (joke.includes("?") || joke.includes("!")) {
      return "Pass";
    }
    return "Fail";
  }

    // 第二次 LLM 调用：改进笑话
  const improveJoke = task("improveJoke", async (joke: string) => {
    const msg = await llm.invoke(
      `通过加入双关语让这个笑话更好笑：${joke}`
    );
    return msg.content;
  });

  // 第三次 LLM 调用：最终润色
  const polishJoke = task("polishJoke", async (joke: string) => {
    const msg = await llm.invoke(
      `为这个笑话添加一个出人意料的反转：${joke}`
    );
    return msg.content;
  });

  const workflow = entrypoint(
    "jokeMaker",
    async (topic: string) => {
      const originalJoke = await generateJoke(topic);
      if (checkPunchline(originalJoke) === "Pass") {
        return originalJoke;
      }
      const improvedJoke = await improveJoke(originalJoke);
      const polishedJoke = await polishJoke(improvedJoke);
      return polishedJoke;
    }
  );

  const stream = await workflow.stream("cats", {
    streamMode: "updates",
  });

  for await (const step of stream) {
    console.log(step);
  }
  ```
</CodeGroup>

## 并行化

在并行化中，多个 LLM 会同时处理同一任务。这可以通过并发运行多个相互独立的子任务来实现，或通过多次运行同一任务来检查不同输出。并行化通常用于：

* 拆分子任务并并行运行，以提升速度
* 多次运行任务以检查不同输出，从而提升置信度

一些示例包括：

* 运行一个子任务从文档中提取关键词，同时运行第二个子任务检查格式错误
* 多次运行对文档准确性进行评分的任务，评分依据可包含引用数量、使用的来源数量以及来源质量等不同标准

<img src="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/parallelization.png?fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=8afe3c427d8cede6fed1e4b2a5107b71" alt="parallelization.png" data-og-width="1020" width="1020" data-og-height="684" height="684" data-path="oss/images/parallelization.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/parallelization.png?w=280&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=88e51062b14d9186a6f0ea246bc48635 280w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/parallelization.png?w=560&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=934941ca52019b7cbce7fbdd31d00f0f 560w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/parallelization.png?w=840&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=30b5c86c545d0e34878ff0a2c367dd0a 840w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/parallelization.png?w=1100&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=6227d2c39f332eaeda23f7db66871dd7 1100w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/parallelization.png?w=1650&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=283f3ee2924a385ab88f2cbfd9c9c48c 1650w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/parallelization.png?w=2500&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=69f6a97716b38998b7b399c3d8ac7d9c 2500w" />

<CodeGroup>
  ```typescript Graph API theme={null}
  import { StateGraph, StateSchema, GraphNode } from "@langchain/langgraph";
  import * as z from "zod";

  // 图的状态
  const State = new StateSchema({
    topic: z.string(),
    joke: z.string(),
    story: z.string(),
    poem: z.string(),
    combinedOutput: z.string(),
  });

  // 节点
  // 第一次 LLM 调用：生成笑话
  const callLlm1: GraphNode<typeof State> = async (state) => {
    const msg = await llm.invoke(`写一个关于 ${state.topic} 的笑话`);
    return { joke: msg.content };
  };

  // 第二次 LLM 调用：生成故事
  const callLlm2: GraphNode<typeof State> = async (state) => {
    const msg = await llm.invoke(`写一个关于 ${state.topic} 的故事`);
    return { story: msg.content };
  };

  // 第三次 LLM 调用：生成诗歌
  const callLlm3: GraphNode<typeof State> = async (state) => {
    const msg = await llm.invoke(`写一首关于 ${state.topic} 的诗`);
    return { poem: msg.content };
  };

  // 将笑话、故事与诗合并为单一输出
  const aggregator: GraphNode<typeof State> = async (state) => {
    const combined = `这里有一个关于 ${state.topic} 的故事、笑话和诗！\n\n` +
      `故事：\n${state.story}\n\n` +
      `笑话：\n${state.joke}\n\n` +
      `诗：\n${state.poem}`;
    return { combinedOutput: combined };
  };

  // 构建工作流
  const parallelWorkflow = new StateGraph(State)
    .addNode("callLlm1", callLlm1)
    .addNode("callLlm2", callLlm2)
    .addNode("callLlm3", callLlm3)
    .addNode("aggregator", aggregator)
    .addEdge("__start__", "callLlm1")
    .addEdge("__start__", "callLlm2")
    .addEdge("__start__", "callLlm3")
    .addEdge("callLlm1", "aggregator")
    .addEdge("callLlm2", "aggregator")
    .addEdge("callLlm3", "aggregator")
    .addEdge("aggregator", "__end__")
    .compile();

  // 调用
  const result = await parallelWorkflow.invoke({ topic: "cats" });
  console.log(result.combinedOutput);
  ```

  ```typescript Functional API theme={null}
  import { task, entrypoint } from "@langchain/langgraph";

  // 任务（Tasks）

  // 第一次 LLM 调用：生成笑话
  const callLlm1 = task("generateJoke", async (topic: string) => {
    const msg = await llm.invoke(`写一个关于 ${topic} 的笑话`);
    return msg.content;
  });

  // 第二次 LLM 调用：生成故事
  const callLlm2 = task("generateStory", async (topic: string) => {
    const msg = await llm.invoke(`写一个关于 ${topic} 的故事`);
    return msg.content;
  });

  // 第三次 LLM 调用：生成诗歌
  const callLlm3 = task("generatePoem", async (topic: string) => {
    const msg = await llm.invoke(`写一首关于 ${topic} 的诗`);
    return msg.content;
  });

  // 合并输出
  const aggregator = task("aggregator", async (params: {
    topic: string;
    joke: string;
    story: string;
    poem: string;
  }) => {
    const { topic, joke, story, poem } = params;
    return `这里有一个关于 ${topic} 的故事、笑话和诗！\n\n` +
      `故事：\n${story}\n\n` +
      `笑话：\n${joke}\n\n` +
      `诗：\n${poem}`;
  });

  // 构建工作流
  const workflow = entrypoint(
    "parallelWorkflow",
    async (topic: string) => {
      const [joke, story, poem] = await Promise.all([
        callLlm1(topic),
        callLlm2(topic),
        callLlm3(topic),
      ]);

      return aggregator({ topic, joke, story, poem });
    }
  );

  // 调用
  const stream = await workflow.stream("cats", {
    streamMode: "updates",
  });

  for await (const step of stream) {
    console.log(step);
  }
  ```
</CodeGroup>

## 路由

路由型工作流会先处理输入，然后将其导向上下文特定的任务。这使你能够为复杂任务定义专门化流程。例如，一个用于回答产品相关问题的工作流，可能会先判断问题类型，然后把请求路由到定价、退款、退货等不同流程。

<img src="https://qn.huat.xyz/mac/202602201638704.png" alt="routing.png" data-og-width="1214" width="1214" data-og-height="678" height="678" data-path="oss/images/routing.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/routing.png?w=280&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=ab85efe91d20c816f9a4e491e92a61f7 280w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/routing.png?w=560&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=769e29f9be058a47ee85e0c9228e6e44 560w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/routing.png?w=840&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=3711ee40746670731a0ce3e96b7cfeb1 840w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/routing.png?w=1100&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=9aaa28410da7643f4a2587f7bfae0f21 1100w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/routing.png?w=1650&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=6706326c7fef0511805c684d1e4f7082 1650w, https://mintcdn.com/langchain-5e9cc07a/dL5Sn6Cmy9pwtY0V/oss/images/routing.png?w=2500&fit=max&auto=format&n=dL5Sn6Cmy9pwtY0V&q=85&s=f6d603145ca33791b18c8c8afec0bb4d 2500w" />

<CodeGroup>
  ```typescript Graph API theme={null}
  import { StateGraph, StateSchema, GraphNode, ConditionalEdgeRouter } from "@langchain/langgraph";
  import * as z from "zod";

  // 用于结构化输出的模式（Schema），作为路由逻辑
  const routeSchema = z.object({
    step: z.enum(["poem", "story", "joke"]).describe(
      "路由流程中的下一步"
    ),
  });

  // 使用结构化输出模式增强 LLM
  const router = llm.withStructuredOutput(routeSchema);

  // 图的状态
  const State = new StateSchema({
    input: z.string(),
    decision: z.string(),
    output: z.string(),
  });

  // 节点
  // 写一个故事
  const llmCall1: GraphNode<typeof State> = async (state) => {
    const result = await llm.invoke([{
      role: "system",
      content: "你是一位资深的故事作者。",
    }, {
      role: "user",
      content: state.input
    }]);
    return { output: result.content };
  };

  // 写一个笑话
  const llmCall2: GraphNode<typeof State> = async (state) => {
    const result = await llm.invoke([{
      role: "system",
      content: "你是一位资深的喜剧演员。",
    }, {
      role: "user",
      content: state.input
    }]);
    return { output: result.content };
  };

  // 写一首诗
  const llmCall3: GraphNode<typeof State> = async (state) => {
    const result = await llm.invoke([{
      role: "system",
      content: "你是一位资深的诗人。",
    }, {
      role: "user",
      content: state.input
    }]);
    return { output: result.content };
  };

  const llmCallRouter: GraphNode<typeof State> = async (state) => {
    // 将输入路由到合适的节点
    const decision = await router.invoke([
      {
        role: "system",
        content: "根据用户请求，将输入路由到 story、joke 或 poem。"
      },
      {
        role: "user",
        content: state.input
      },
    ]);

    return { decision: decision.step };
  };

  // 条件边函数：路由到合适的节点
  const routeDecision: ConditionalEdgeRouter<typeof State, "llmCall1" | "llmCall2" | "llmCall3"> = (state) => {
    // 返回你希望接下来访问的节点名
    if (state.decision === "story") {
      return "llmCall1";
    } else if (state.decision === "joke") {
      return "llmCall2";
    } else {
      return "llmCall3";
    }
  };

  // 构建工作流
  const routerWorkflow = new StateGraph(State)
    .addNode("llmCall1", llmCall1)
    .addNode("llmCall2", llmCall2)
    .addNode("llmCall3", llmCall3)
    .addNode("llmCallRouter", llmCallRouter)
    .addEdge("__start__", "llmCallRouter")
    .addConditionalEdges(
      "llmCallRouter",
      routeDecision,
      ["llmCall1", "llmCall2", "llmCall3"],
    )
    .addEdge("llmCall1", "__end__")
    .addEdge("llmCall2", "__end__")
    .addEdge("llmCall3", "__end__")
    .compile();

  // 调用
  const state = await routerWorkflow.invoke({
    input: "给我写一个关于猫的笑话"
  });
  console.log(state.output);
  ```

  ```typescript Functional API theme={null}
  import * as z from "zod";
  import { task, entrypoint } from "@langchain/langgraph";

  // 用于结构化输出的模式（Schema），作为路由逻辑
  const routeSchema = z.object({
    step: z.enum(["poem", "story", "joke"]).describe(
      "路由流程中的下一步"
    ),
  });

  // 使用结构化输出模式增强 LLM
  const router = llm.withStructuredOutput(routeSchema);

  // 任务（Tasks）
  // 写一个故事
  const llmCall1 = task("generateStory", async (input: string) => {
    const result = await llm.invoke([{
      role: "system",
      content: "你是一位资深的故事作者。",
    }, {
      role: "user",
      content: input
    }]);
    return result.content;
  });

  // 写一个笑话
  const llmCall2 = task("generateJoke", async (input: string) => {
    const result = await llm.invoke([{
      role: "system",
      content: "你是一位资深的喜剧演员。",
    }, {
      role: "user",
      content: input
    }]);
    return result.content;
  });

  // 写一首诗
  const llmCall3 = task("generatePoem", async (input: string) => {
    const result = await llm.invoke([{
      role: "system",
      content: "你是一位资深的诗人。",
    }, {
      role: "user",
      content: input
    }]);
    return result.content;
  });

  // 将输入路由到合适的节点
  const llmCallRouter = task("router", async (input: string) => {
    const decision = await router.invoke([
      {
        role: "system",
        content: "根据用户请求，将输入路由到 story、joke 或 poem。"
      },
      {
        role: "user",
        content: input
      },
    ]);
    return decision.step;
  });

  // 构建工作流
  const workflow = entrypoint(
    "routerWorkflow",
    async (input: string) => {
      const nextStep = await llmCallRouter(input);

      let llmCall;
      if (nextStep === "story") {
        llmCall = llmCall1;
      } else if (nextStep === "joke") {
        llmCall = llmCall2;
      } else if (nextStep === "poem") {
        llmCall = llmCall3;
      }

      const finalResult = await llmCall(input);
      return finalResult;
    }
  );

  // 调用
  const stream = await workflow.stream("给我写一个关于猫的笑话", {
    streamMode: "updates",
  });

  for await (const step of stream) {
    console.log(step);
  }
  ```
</CodeGroup>

## 编排者-工作者（Orchestrator-worker）

在编排者-工作者配置中，编排者（orchestrator）会：

* 将任务拆分为子任务
* 将子任务委派给工作者（workers）
* 将工作者输出综合为最终结果

<img src="https://qn.huat.xyz/mac/202602201638700.png" alt="worker.png" data-og-width="1486" width="1486" data-og-height="548" height="548" data-path="oss/images/worker.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/worker.png?w=280&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=037222991ea08f889306be035c4730b6 280w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/worker.png?w=560&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=081f3ff05cc1fe50770c864d74084b5b 560w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/worker.png?w=840&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=0ef6c1b9ceb5159030aa34d0f05f1ada 840w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/worker.png?w=1100&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=92ec7353a89ae96e221a5a8f65c88adf 1100w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/worker.png?w=1650&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=71b201dd99fa234ebfb918915aac3295 1650w, https://mintcdn.com/langchain-5e9cc07a/ybiAaBfoBvFquMDz/oss/images/worker.png?w=2500&fit=max&auto=format&n=ybiAaBfoBvFquMDz&q=85&s=4f7b6e2064db575027932394a3658fbd 2500w" />

编排者-工作者工作流提供更高的灵活性，常用于子任务无法像 [并行化](#parallelization) 那样提前定义的场景。这在需要编写代码或需要跨多个文件更新内容的工作流中很常见。例如，一个需要为多个 Python 库更新安装说明、并且涉及未知数量文档的工作流，可能会使用该模式。

<CodeGroup>
  ```typescript Graph API theme={null}

  type SectionSchema = {
      name: string;
      description: string;
  }
  type SectionsSchema = {
      sections: SectionSchema[];
  }

  // 使用结构化输出模式增强 LLM
  const planner = llm.withStructuredOutput(sectionsSchema);
  ```

  ```typescript Functional API theme={null}
  import * as z from "zod";
  import { task, entrypoint } from "@langchain/langgraph";

  // 用于结构化输出的模式（Schema），用于规划
  const sectionSchema = z.object({
    name: z.string().describe("报告本节的名称。"),
    description: z.string().describe(
      "本节要覆盖的主要主题与概念的简要概述。"
    ),
  });

  const sectionsSchema = z.object({
    sections: z.array(sectionSchema).describe("报告的各个章节。"),
  });

  // 使用结构化输出模式增强 LLM
  const planner = llm.withStructuredOutput(sectionsSchema);

  // 任务（Tasks）
  const orchestrator = task("orchestrator", async (topic: string) => {
    // 生成章节规划
    const reportSections = await planner.invoke([
      { role: "system", content: "为报告生成一个计划。" },
      { role: "user", content: `这是报告主题：${topic}` },
    ]);

    return reportSections.sections;
  });

  const llmCall = task("sectionWriter", async (section: z.infer<typeof sectionSchema>) => {
    // 生成章节内容
    const result = await llm.invoke([
      {
        role: "system",
        content: "撰写报告章节。",
      },
      {
        role: "user",
        content: `这是章节名称：${section.name}，以及描述：${section.description}`,
      },
    ]);

    return result.content;
  });

  const synthesizer = task("synthesizer", async (completedSections: string[]) => {
    // 将各章节综合成完整报告
    return completedSections.join("\n\n---\n\n");
  });

  // 构建工作流
  const workflow = entrypoint(
    "orchestratorWorker",
    async (topic: string) => {
      const sections = await orchestrator(topic);
      const completedSections = await Promise.all(
        sections.map((section) => llmCall(section))
      );
      return synthesizer(completedSections);
    }
  );

  // 调用
  const stream = await workflow.stream("创建一份关于 LLM 缩放定律的报告", {
    streamMode: "updates",
  });

  for await (const step of stream) {
    console.log(step);
  }
  ```
</CodeGroup>

### 在 LangGraph 中创建工作者

编排者-工作者工作流非常常见，LangGraph 为其提供了内置支持。`Send` API 允许你动态创建工作者节点，并向其发送特定输入。每个工作者都有自己的状态，并且所有工作者输出都会写入一个共享状态键，该键可被编排者图访问。这使得编排者能够访问所有工作者输出，并将它们综合为最终输出。下面示例遍历章节列表，并使用 `Send` API 将每一节发送给对应的工作者。

```typescript  theme={null}
import { StateGraph, StateSchema, ReducedValue, GraphNode, Send } from "@langchain/langgraph";
import * as z from "zod";

// 图的状态
const State = new StateSchema({
  topic: z.string(),
  sections: z.array(z.custom<SectionsSchema>()),
  completedSections: new ReducedValue(
    z.array(z.string()).default(() => []),
    { reducer: (a, b) => a.concat(b) }
  ),
  finalReport: z.string(),
});

// 工作者状态
const WorkerState = new StateSchema({
  section: z.custom<SectionsSchema>(),
  completedSections: new ReducedValue(
    z.array(z.string()).default(() => []),
    { reducer: (a, b) => a.concat(b) }
  ),
});

// 节点
const orchestrator: GraphNode<typeof State> = async (state) => {
  // 生成规划
  const reportSections = await planner.invoke([
    { role: "system", content: "为报告生成一个计划。" },
    { role: "user", content: `这是报告主题：${state.topic}` },
  ]);

  return { sections: reportSections.sections };
};

const llmCall: GraphNode<typeof WorkerState> = async (state) => {
  // 生成章节
  const section = await llm.invoke([
    {
      role: "system",
      content: "按照提供的名称与描述撰写报告章节。每个章节不要添加前置引言。使用 Markdown 格式。",
    },
    {
      role: "user",
      content: `这是章节名称：${state.section.name}，以及描述：${state.section.description}`,
    },
  ]);

  // 将更新后的章节写入已完成章节列表
  return { completedSections: [section.content] };
};

const synthesizer: GraphNode<typeof State> = async (state) => {
  // 已完成章节列表
  const completedSections = state.completedSections;

  // 将已完成章节格式化为字符串，用作最终报告的上下文
  const completedReportSections = completedSections.join("\n\n---\n\n");

  return { finalReport: completedReportSections };
};

// 条件边函数：创建 llm_call 工作者，每个工作者撰写报告的一个章节
const assignWorkers: ConditionalEdgeRouter<typeof State, "llmCall"> = (state) => {
  // 通过 Send() API 并行启动章节撰写
  return state.sections.map((section) =>
    new Send("llmCall", { section })
  );
};

// 构建工作流
const orchestratorWorker = new StateGraph(State)
  .addNode("orchestrator", orchestrator)
  .addNode("llmCall", llmCall)
  .addNode("synthesizer", synthesizer)
  .addEdge("__start__", "orchestrator")
  .addConditionalEdges(
    "orchestrator",
    assignWorkers,
    ["llmCall"]
  )
  .addEdge("llmCall", "synthesizer")
  .addEdge("synthesizer", "__end__")
  .compile();

// 调用
const state = await orchestratorWorker.invoke({
  topic: "Create a report on LLM scaling laws"
});
console.log(state.finalReport);
```

## 评估器-优化器（Evaluator-optimizer）

在评估器-优化器工作流中，一次 LLM 调用用于生成响应，另一次用于评估该响应。如果评估器或 [人类介入（human-in-the-loop）](/oss/javascript/langgraph/interrupts) 判断响应需要改进，则提供反馈并重新生成响应。该循环会持续，直到生成可接受的响应为止。

当任务存在明确的成功标准、但需要反复迭代才能达成该标准时，评估器-优化器工作流很常见。例如，在两种语言之间翻译文本时并不总能一次就完美匹配。可能需要多次迭代，才能生成在两种语言中意义一致的译文。

<img src="https://qn.huat.xyz/mac/202602201638701.png" alt="evaluator_optimizer.png" data-og-width="1004" width="1004" data-og-height="340" height="340" data-path="oss/images/evaluator_optimizer.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/evaluator_optimizer.png?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=ab36856e5f9a518b22e71278aa8b1711 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/evaluator_optimizer.png?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=3ec597c92270278c2bac203d36b611c2 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/evaluator_optimizer.png?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=3ad3bfb734a0e509d9b87fdb4e808bfd 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/evaluator_optimizer.png?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=e82bd25a463d3cdf76036649c03358a9 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/evaluator_optimizer.png?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=d31717ae3e76243dd975a53f46e8c1f6 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/evaluator_optimizer.png?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=a9bb4fb1583f6ad06c0b13602cd14811 2500w" />

<CodeGroup>
  ```typescript Graph API theme={null}
  import { StateGraph, StateSchema, GraphNode, ConditionalEdgeRouter } from "@langchain/langgraph";
  import * as z from "zod";

  // 图的状态
  const State = new StateSchema({
    joke: z.string(),
    topic: z.string(),
    feedback: z.string(),
    funnyOrNot: z.string(),
  });

  // 用于结构化输出的模式（Schema），用于评估
  const feedbackSchema = z.object({
    grade: z.enum(["funny", "not funny"]).describe(
      "判断这个笑话是否好笑。"
    ),
    feedback: z.string().describe(
      "如果笑话不好笑，给出如何改进的反馈。"
    ),
  });

  // 使用结构化输出模式增强 LLM
  const evaluator = llm.withStructuredOutput(feedbackSchema);

  // 节点
  const llmCallGenerator: GraphNode<typeof State> = async (state) => {
    // LLM 生成一个笑话
    let msg;
    if (state.feedback) {
      msg = await llm.invoke(
        `写一个关于 ${state.topic} 的笑话，但要考虑以下反馈：${state.feedback}`
      );
    } else {
      msg = await llm.invoke(`写一个关于 ${state.topic} 的笑话`);
    }
    return { joke: msg.content };
  };

  const llmCallEvaluator: GraphNode<typeof State> = async (state) => {
    // LLM 评估该笑话
    const grade = await evaluator.invoke(`为这个笑话打分 ${state.joke}`);
    return { funnyOrNot: grade.grade, feedback: grade.feedback };
  };

  // 条件边函数：根据评估器反馈，回到笑话生成器或结束
  const routeJoke: ConditionalEdgeRouter<typeof State, "llmCallGenerator"> = (state) => {
    // 根据评估器反馈，回到笑话生成器或结束
    if (state.funnyOrNot === "funny") {
      return "Accepted";
    } else {
      return "Rejected + Feedback";
    }
  };

  // 构建工作流
  const optimizerWorkflow = new StateGraph(State)
    .addNode("llmCallGenerator", llmCallGenerator)
    .addNode("llmCallEvaluator", llmCallEvaluator)
    .addEdge("__start__", "llmCallGenerator")
    .addEdge("llmCallGenerator", "llmCallEvaluator")
    .addConditionalEdges(
      "llmCallEvaluator",
      routeJoke,
      {
        // routeJoke 返回的名称 : 下一步要访问的节点名称
        "Accepted": "__end__",
        "Rejected + Feedback": "llmCallGenerator",
      }
    )
    .compile();

  // 调用
  const state = await optimizerWorkflow.invoke({ topic: "Cats" });
  console.log(state.joke);
  ```

  ```typescript Functional API theme={null}
  import * as z from "zod";
  import { task, entrypoint } from "@langchain/langgraph";

  // 用于结构化输出的模式（Schema），用于评估
  const feedbackSchema = z.object({
    grade: z.enum(["funny", "not funny"]).describe(
      "判断这个笑话是否好笑。"
    ),
    feedback: z.string().describe(
      "如果笑话不好笑，给出如何改进的反馈。"
    ),
  });

  // 使用结构化输出模式增强 LLM
  const evaluator = llm.withStructuredOutput(feedbackSchema);

  // 任务（Tasks）
  const llmCallGenerator = task("jokeGenerator", async (params: {
    topic: string;
    feedback?: z.infer<typeof feedbackSchema>;
  }) => {
    // LLM 生成一个笑话
    const msg = params.feedback
      ? await llm.invoke(
          `写一个关于 ${params.topic} 的笑话，但要考虑以下反馈：${params.feedback.feedback}`
        )
      : await llm.invoke(`写一个关于 ${params.topic} 的笑话`);
    return msg.content;
  });

  const llmCallEvaluator = task("jokeEvaluator", async (joke: string) => {
    // LLM 评估该笑话
    return evaluator.invoke(`为这个笑话打分 ${joke}`);
  });

  // 构建工作流
  const workflow = entrypoint(
    "optimizerWorkflow",
    async (topic: string) => {
      let feedback: z.infer<typeof feedbackSchema> | undefined;
      let joke: string;

      while (true) {
        joke = await llmCallGenerator({ topic, feedback });
        feedback = await llmCallEvaluator(joke);

        if (feedback.grade === "funny") {
          break;
        }
      }

      return joke;
    }
  );

  // 调用
  const stream = await workflow.stream("Cats", {
    streamMode: "updates",
  });

  for await (const step of stream) {
    console.log(step);
    console.log("\n");
  }
  ```
</CodeGroup>

## 智能体

智能体通常实现为一个使用 [工具](/oss/javascript/langchain/tools) 执行动作的 LLM。它们在连续的反馈循环中运行，适用于问题与解决方案都不可预测的场景。智能体比工作流拥有更高的自主性，并且能够决定使用哪些工具、以及如何解决问题。你仍然可以定义可用的工具集，并为智能体行为设定指南。

<img src="https://qn.huat.xyz/mac/202602201638706.png" alt="agent.png" data-og-width="1732" width="1732" data-og-height="712" height="712" data-path="oss/images/agent.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent.png?w=280&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=f7a590604edc49cfa273b5856f3a3ee3 280w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent.png?w=560&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=dff9b17d345fe0fea25616b3b0dc6ebf 560w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent.png?w=840&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=bd932835b919f5e58be77221b6d0f194 840w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent.png?w=1100&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=d53318b0c9c898a6146991691cbac058 1100w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent.png?w=1650&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=ea66fb96bc07c595d321b8b71e651ddb 1650w, https://mintcdn.com/langchain-5e9cc07a/-_xGPoyjhyiDWTPJ/oss/images/agent.png?w=2500&fit=max&auto=format&n=-_xGPoyjhyiDWTPJ&q=85&s=b02599a3c9ba2a5c830b9a346f9d26c9 2500w" />

<Note>
  要开始使用智能体，请参阅 [快速入门](/oss/javascript/langchain/quickstart)，或阅读 LangChain 中关于 [其工作原理](/oss/javascript/langchain/agents) 的更多内容。
</Note>

```typescript Using tools theme={null}
import { tool } from "@langchain/core/tools";
import * as z from "zod";

// 定义工具
const multiply = tool(
  ({ a, b }) => {
    return a * b;
  },
  {
    name: "multiply",
    description: "将两个数字相乘",
    schema: z.object({
      a: z.number().describe("第一个数字"),
      b: z.number().describe("第二个数字"),
    }),
  }
);

const add = tool(
  ({ a, b }) => {
    return a + b;
  },
  {
    name: "add",
    description: "将两个数字相加",
    schema: z.object({
      a: z.number().describe("第一个数字"),
      b: z.number().describe("第二个数字"),
    }),
  }
);

const divide = tool(
  ({ a, b }) => {
    return a / b;
  },
  {
    name: "divide",
    description: "将两个数字相除",
    schema: z.object({
      a: z.number().describe("第一个数字"),
      b: z.number().describe("第二个数字"),
    }),
  }
);

// 使用工具增强 LLM
const tools = [add, multiply, divide];
const toolsByName = Object.fromEntries(tools.map((tool) => [tool.name, tool]));
const llmWithTools = llm.bindTools(tools);
```

<CodeGroup>
  ```typescript Graph API theme={null}
  import { StateGraph, StateSchema, MessagesValue, GraphNode, ConditionalEdgeRouter } from "@langchain/langgraph";
  import { ToolNode } from "@langchain/langgraph/prebuilt";
  import {
    SystemMessage,
    ToolMessage
  } from "@langchain/core/messages";

  // 图的状态
  const State = new StateSchema({
    messages: MessagesValue,
  });

  // 节点
  const llmCall: GraphNode<typeof State> = async (state) => {
    // LLM 决定是否调用工具
    const result = await llmWithTools.invoke([
      {
        role: "system",
        content: "你是一个乐于助人的助手，任务是对一组输入执行算术运算。"
      },
      ...state.messages
    ]);

    return {
      messages: [result]
    };
  };

  const toolNode = new ToolNode(tools);

  // 条件边函数：路由到工具节点或结束
  const shouldContinue: ConditionalEdgeRouter<typeof State, "toolNode"> = (state) => {
    const messages = state.messages;
    const lastMessage = messages.at(-1);

    // 如果 LLM 发起了工具调用，则执行动作
    if (lastMessage?.tool_calls?.length) {
      return "toolNode";
    }
    // 否则停止（回复用户）
    return "__end__";
  };

  // 构建工作流
  const agentBuilder = new StateGraph(State)
    .addNode("llmCall", llmCall)
    .addNode("toolNode", toolNode)
    // 添加边以连接节点
    .addEdge("__start__", "llmCall")
    .addConditionalEdges(
      "llmCall",
      shouldContinue,
      ["toolNode", "__end__"]
    )
    .addEdge("toolNode", "llmCall")
    .compile();

  // 调用
  const messages = [{
    role: "user",
    content: "把 3 和 4 相加。"
  }];
  const result = await agentBuilder.invoke({ messages });
  console.log(result.messages);
  ```

  ```typescript Functional API theme={null}
  import { task, entrypoint, addMessages } from "@langchain/langgraph";
  import { BaseMessageLike, ToolCall } from "@langchain/core/messages";

  const callLlm = task("llmCall", async (messages: BaseMessageLike[]) => {
    // LLM 决定是否调用工具
    return llmWithTools.invoke([
      {
        role: "system",
        content: "你是一个乐于助人的助手，任务是对一组输入执行算术运算。"
      },
      ...messages
    ]);
  });

  const callTool = task("toolCall", async (toolCall: ToolCall) => {
    // 执行工具调用
    const tool = toolsByName[toolCall.name];
    return tool.invoke(toolCall.args);
  });

  const agent = entrypoint(
    "agent",
    async (messages) => {
      let llmResponse = await callLlm(messages);

      while (true) {
        if (!llmResponse.tool_calls?.length) {
          break;
        }

        // 执行工具
        const toolResults = await Promise.all(
          llmResponse.tool_calls.map((toolCall) => callTool(toolCall))
        );

        messages = addMessages(messages, [llmResponse, ...toolResults]);
        llmResponse = await callLlm(messages);
      }

      messages = addMessages(messages, [llmResponse]);
      return messages;
    }
  );

  // 调用
  const messages = [{
    role: "user",
    content: "把 3 和 4 相加。"
  }];

  const stream = await agent.stream([messages], {
    streamMode: "updates",
  });

  for await (const step of stream) {
    console.log(step);
  }
  ```
</CodeGroup>

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/workflows-agents.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将 [这些文档](/use-these-docs) 连接到 Claude、VSCode 等，以获取实时答案。
</Callout>
