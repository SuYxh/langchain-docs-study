# Deep Agents 快速入门 - 深度解读

---

## 1. 一句话省流 (The Essence)

**Deep Agents 就是一个"开箱即用的超级 AI 员工"框架** —— 你只需要告诉它"你是谁"和"你能用什么工具"，它就能自动规划任务、搜索资料、管理上下文、甚至派活给"小弟"（子代理），最后帮你交出一份漂亮的成果。

简单说：**你负责提需求，它负责拆任务、干活、交付。**

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：没有 Deep Agents 之前的倒霉事

想象一下，你让一个普通的 AI 帮你做一份"量子计算发展现状"的研究报告：

| 问题 | 具体表现 |
|------|----------|
| **不会规划** | AI 直接开干，想到哪搜到哪，思路像面条一样乱 |
| **上下文爆炸** | 搜了 10 篇文章，token 数直接超限，AI 开始"失忆" |
| **单打独斗** | 复杂任务只有一个 AI 在扛，效率低下 |
| **没有持久化** | 搜到的资料没地方存，下次问就全忘了 |

最终结果：要么报错，要么输出一坨不知所云的东西。

### 解决：Deep Agents 的四大杀手锏

| 能力 | 怎么解决的 |
|------|-----------|
| **自动规划** | 内置 `write_todos` 工具，AI 会先列出"To-Do List"再动手 |
| **文件系统** | 用 `write_file`/`read_file` 把大段资料存到"外部硬盘"，不占上下文 |
| **子代理分工** | 遇到复杂子任务，主 Agent 可以派出"小弟 Agent"去处理 |
| **流式输出** | 实时看到 AI 在干什么，工具调用、中间结果全程透明 |

---

## 3. 生活化类比 (The Analogy)

### 把 Deep Agent 想象成一家「咨询公司」

| 技术概念 | 公司角色 | 干什么 |
|----------|----------|--------|
| **Deep Agent** | 项目总监 | 接收客户需求，规划项目，统筹全局 |
| **write_todos** | 项目计划书 | 总监先列出"任务清单"，明确先做什么后做什么 |
| **internet_search** | 市场调研部 | 出去搜集资料、竞品分析、行业报告 |
| **write_file / read_file** | 文档管理系统 | 把调研资料存档，需要时随时调取，不用全记脑子里 |
| **Subagent（子代理）** | 专项小组 | 遇到细分领域（如财务分析），总监会派专人去搞 |
| **Streaming** | 实时周报 | 随时能看到项目进展，不用等到最后才知道结果 |

**整个流程就是：**

1. 客户（你）跟项目总监（Deep Agent）说："帮我调研 LangGraph 是什么"
2. 总监先写项目计划（write_todos）：搜资料 -> 整理 -> 写报告
3. 总监派市场调研部（internet_search）去网上搜信息
4. 调研结果太多？存到文档系统（write_file）里，用的时候再读
5. 遇到需要深入分析的部分，派专项小组（Subagent）去处理
6. 最后总监整合所有材料，交给你一份完整报告

---

## 4. 关键概念拆解 (Key Concepts)

### (1) Deep Agent

**口语解释：** 一个"全能型 AI 员工"，自带任务规划能力和文件管理能力，比普通的 LLM 聪明得多。

### (2) Tool（工具）

**口语解释：** 给 AI 配的"技能包"。比如你给它配一个 `internet_search` 工具，它就学会了上网搜东西。没有工具的 AI 就是个"光说不练"的嘴炮。

### (3) System Prompt（系统提示词）

**口语解释：** 给 AI 设定的"人设说明书"。比如告诉它"你是一个专业研究员"，它就会按研究员的方式思考和行动。

### (4) Subagent（子代理）

**口语解释：** 主 Agent 的"小弟"。遇到复杂任务，主 Agent 可以 spawn（召唤）一个专门的子代理去处理特定子任务，实现"分工协作"。

### (5) Streaming（流式输出）

**口语解释：** 让你能"实时围观" AI 干活。不是等它全部做完才给你结果，而是边做边输出，你能看到它调用了什么工具、拿到了什么中间结果。

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 第一部分：创建搜索工具

```typescript
const internetSearch = tool(
  async ({ query, maxResults = 5, topic = "general", includeRawContent = false }) => {
    const tavilySearch = new TavilySearch({ ... });
    return await tavilySearch._call({ query });
  },
  {
    name: "internet_search",
    description: "Run a web search",
    schema: z.object({ ... }),
  }
);
```

**这段代码在干嘛？**

你在给 AI 做一个"搜索技能包"：
- **name**: 给技能取名叫 `internet_search`
- **description**: 告诉 AI 这技能是"用来搜网页的"
- **schema**: 定义这个技能需要哪些参数（搜什么、返回几条、搜哪类内容）
- **async 函数体**: 具体执行逻辑 —— 调用 Tavily 搜索服务

AI 看到用户问题后，会自己判断"我需要搜一下"，然后自动调用这个工具。

---

### 第二部分：创建 Deep Agent

```typescript
const researchInstructions = `You are an expert researcher...`;

const agent = createDeepAgent({
  tools: [internetSearch],
  systemPrompt: researchInstructions,
});
```

**这段代码在干嘛？**

你在"招聘"一个 AI 员工：
- **systemPrompt**: 给它写份岗位说明书 —— "你是个专家研究员，任务是做调研和写报告"
- **tools**: 给它发配装备 —— 这里发了一把"搜索工具"

一旦创建完成，这个 agent 就具备了：
- 自动规划能力（内置）
- 搜索能力（你给的）
- 文件管理能力（内置）
- 分派子任务能力（内置）

---

### 第三部分：运行 Agent

```typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "What is langgraph?" }],
});
```

**这段代码在干嘛？**

你在给这个"员工"派活：
- 发一条消息："LangGraph 是什么？"
- agent 会自动开始工作：规划 -> 搜索 -> 整理 -> 输出报告
- 最后把结果存在 `result.messages` 里

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：开发一个「科技资讯助手」

**需求：** 用户问"最近 AI 领域有什么大新闻"，你的应用能自动搜索、整理、输出一份简报。

**没有 Deep Agents 时怎么做：**

```
用户提问 -> 调用搜索 API -> 拿到一堆原始数据 -> 手动拼接 prompt 让 LLM 总结 
          -> 结果太长超 token 限制 -> 报错 
          -> 手动分批处理 -> 终于拿到结果 -> 累死了
```

**有 Deep Agents 时怎么做：**

```
用户提问 -> agent.invoke() -> 完事儿
```

**Deep Agent 在背后自动完成了：**

1. **规划阶段**：列出 To-Do（搜新闻 -> 按类别整理 -> 写简报）
2. **搜索阶段**：调用 `internet_search` 工具，拿到 10 条新闻
3. **存储阶段**：数据太多？用 `write_file` 存到临时文件
4. **分析阶段**：遇到需要深入分析的新闻，spawn 一个子代理专门处理
5. **输出阶段**：整合所有信息，生成结构化简报

**提升效果：**

| 指标 | 之前 | 之后 |
|------|------|------|
| 开发代码量 | 200+ 行 | 20 行 |
| 上下文溢出风险 | 高 | 几乎没有 |
| 可调试性 | 差（黑盒） | 好（流式可观测） |
| 复杂任务处理 | 手动拆分 | 自动分工 |

---

## 7. 快速上手清单 (Checklist)

如果你想跑通这个示例，按这个顺序来：

- [ ] 安装依赖：`npm install deepagents langchain @langchain/core @langchain/tavily`
- [ ] 申请 API Key：Anthropic（或 OpenAI）+ Tavily
- [ ] 设置环境变量：`export ANTHROPIC_API_KEY=xxx` 和 `export TAVILY_API_KEY=xxx`
- [ ] 复制代码，创建 tool -> 创建 agent -> invoke 运行
- [ ] 观察输出，看 agent 是怎么规划和执行的

---

## 8. 总结

Deep Agents 的核心价值就是：**把"构建复杂 AI 工作流"这件事变得像"招个员工、派个任务"一样简单。**

你不需要操心：
- 怎么让 AI 学会规划（内置了）
- 怎么处理上下文过长（文件系统帮你存）
- 怎么让多个 AI 协作（子代理机制）

你只需要：
- 定义"它是谁"（systemPrompt）
- 定义"它能干啥"（tools）
- 然后喊一嗓子"开干"（invoke）

---

**下一步建议：**
- 想让 agent 更聪明？去看 [Customization 定制化](/oss/javascript/deepagents/customization)
- 想让 agent 有记忆？去看 [Long-term Memory 长期记忆](/oss/javascript/deepagents/long-term-memory)
- 想把 agent 部署上线？去看 [Deployment 部署](/oss/javascript/langgraph/deploy)
