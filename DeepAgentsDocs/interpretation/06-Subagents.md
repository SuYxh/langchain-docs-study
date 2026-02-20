# Deep Agents Subagents (子代理) 深度解读

---

## 1. 一句话省流 (The Essence)

**Subagents（子代理）就是"主代理的专业外包团队"，当主代理遇到复杂任务时，可以把活儿分配给这些"专业选手"去干，干完只汇报结果，不带回一堆中间过程的"垃圾"。**

核心价值：**Context Quarantine（上下文隔离）** - 让主代理的"大脑"保持清爽，不被海量中间数据塞满。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：Context Bloat - 上下文膨胀问题

想象一下这个场景：

> 你让 AI Agent 帮你"调研一下2024年最火的10个AI框架"。
> 
> Agent 很努力地执行任务：
> - 第1次网络搜索... 返回了5000字
> - 第2次网络搜索... 又5000字
> - 读取了3个文件... 每个2000字
> - 数据库查询... 3000字结果
> 
> 最后，Agent的Context Window（上下文窗口）被这些"中间结果"塞得满满当当，足足有 **30000+ tokens**！

**问题来了：**

1. **模型变笨**：Context太长，模型对早期内容的"记忆"会变差
2. **响应变慢**：处理这么多token需要更多时间
3. **成本飙升**：按token计费，你的钱包在哭泣
4. **容易跑偏**：太多"噪音"让模型容易忘记最初的任务目标

### 解决方案：子代理 - 专业的"外包隔离间"

```
传统做法：
主代理 --> 搜索1 --> 搜索2 --> 搜索3 --> 读文件 --> 分析 --> 输出
         (所有中间结果都堆在主代理的context里)

子代理做法：
主代理 --> task("调研AI框架") --> 子代理独立工作区
                                    |
                                    v
                                  搜索1, 搜索2, 搜索3, 读文件, 分析
                                  (这些垃圾都在子代理里)
                                    |
                                    v
         <-- 返回精简摘要 <------ 最终结果
         (主代理只收到干净的总结)
```

**子代理的隔离魔法**：
- 子代理独立执行任务，所有脏活累活都在"隔离间"完成
- 主代理只收到最终结果（比如一个500字的摘要）
- 主代理的Context保持清爽，可以继续高效工作

---

## 3. 生活化/职场类比 (The Analogy)

### 类比：公司CEO与专业部门的协作

把 **Main Agent（主代理）** 想象成一家公司的 **CEO**。

#### 没有子代理时（CEO事必躬亲）

CEO想了解市场情况，于是：
- 自己上网搜了20篇行业报告
- 自己读完了500页的竞品分析
- 自己打电话访谈了10个客户
- 自己整理了所有的Excel数据

**结果**：CEO的大脑被这些细节塞满了，开董事会时已经记不清公司战略是什么了。

#### 有子代理时（CEO授权专业部门）

```
CEO (Main Agent)
    |
    |-- 市场部 (research-agent): "帮我调研市场趋势"
    |       --> 独立搜索、分析、整理
    |       <-- 返回：《2024市场趋势报告-3页精华摘要》
    |
    |-- 财务部 (finance-agent): "帮我分析财务数据"
    |       --> 独立查询数据库、跑模型、做表格
    |       <-- 返回：《Q3财务健康评估-核心指标》
    |
    |-- 技术部 (code-agent): "帮我评估技术方案"
            --> 独立读代码、测试、对比
            <-- 返回：《三个方案优劣对比-1页总结》
```

**CEO的好处**：
- 脑子里只需要记住"3页摘要 + 核心指标 + 1页总结"
- 不用记住那20篇报告的每个细节
- 可以专注于**高层决策和协调**，而不是溺死在细节里

#### 术语映射表

| 文档术语 | 类比角色 | 作用 |
|---------|---------|------|
| **Main Agent** | CEO | 高层协调者，分配任务，整合结果 |
| **Subagent** | 专业部门（市场部/财务部等） | 专注特定领域，独立完成任务 |
| **task() tool** | CEO的工作委派 | CEO说"市场部，去调研一下XXX" |
| **Context** | CEO的大脑容量 | 能记住的信息有限，需要保持清爽 |
| **Context Quarantine** | 部门独立工作区 | 部门干活产生的文件不堆到CEO办公室 |
| **tools** | 部门的专业工具 | 市场部有搜索引擎，财务部有数据库 |
| **system_prompt** | 部门的岗位职责说明 | "你是市场调研专家，负责..." |

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 Subagent（子代理）

**口语解释**：就是主代理的"专业小弟"，专门干某一类活儿的。

**两种类型**：
- **字典形式（Dictionary-based）**：简单场景，直接写配置就行
- **CompiledSubAgent**：复杂场景，可以传入一个完整的LangGraph图

### 4.2 Context Quarantine（上下文隔离）

**口语解释**：把子代理干活产生的"中间垃圾"关在一个"隔离间"里，不让它污染主代理的上下文。

**效果**：主代理问子代理"帮我调研量子计算"，子代理内部可能搜了10次网页、读了20个文件，但主代理只收到一个500字的摘要。

### 4.3 General-Purpose Subagent（通用子代理）

**口语解释**：Deep Agents内置的"万金油小弟"，啥都能干，和主代理配置一模一样。

**什么时候用**：当你只想要"上下文隔离"的好处，但不需要专门的指令或工具时。

```typescript
// 主代理可以直接调用，无需配置
task(name="general-purpose", task="Research quantum computing trends")
```

### 4.4 Skills（技能）

**口语解释**：子代理的"专业证书"，告诉子代理它会哪些技能。

**继承规则**：
- **通用子代理（general-purpose）**：自动继承主代理的技能
- **自定义子代理**：不继承，需要手动指定自己的技能

### 4.5 Streaming Metadata（流式元数据）

**口语解释**：当AI边生成边输出时，你可以通过`lc_agent_name`知道"这是哪个代理说的话"。

**用途**：Debug和追踪时，能区分主代理和各个子代理的输出。

---

## 5. 代码/配置"人话"解读 (Code Walkthrough)

### 5.1 定义一个研究型子代理

```python
research_subagent = {
    "name": "research-agent",           # 身份证：子代理的名字，主代理通过这个名字调用它
    "description": "Used to research more in depth questions",  # 自我介绍：主代理根据这个描述决定什么时候派你出场
    "system_prompt": "You are a great researcher",  # 岗位职责：告诉子代理它是谁、该怎么干活
    "tools": [internet_search],         # 装备：这个子代理能用哪些工具
    "model": "openai:gpt-4.1",          # 大脑：用哪个模型（可选，不写就用主代理的模型）
}
```

**人话翻译**：这段代码在说——

> "我要创建一个叫'research-agent'的小弟，它专门干调研的活儿。它的人设是'优秀研究员'，干活时可以用网络搜索工具，脑子用的是GPT-4.1。"

### 5.2 创建主代理并挂载子代理

```python
agent = create_deep_agent(
    model="claude-sonnet-4-5-20250929",  # 主代理用Claude大模型
    subagents=subagents                   # 把子代理列表挂上去
)
```

**人话翻译**：

> "创建一个CEO（主代理），它用Claude做大脑，下面管着一群小弟（子代理）。"

### 5.3 最佳实践：详细的系统提示

```typescript
const researchSubagent = {
  name: "research-agent",
  description: "Conducts in-depth research using web search and synthesizes findings",
  systemPrompt: `You are a thorough researcher. Your job is to:

  1. Break down the research question into searchable queries  // 第一步：把问题拆成可搜索的小问题
  2. Use internet_search to find relevant information         // 第二步：用搜索工具找信息
  3. Synthesize findings into a comprehensive but concise summary  // 第三步：把发现整理成摘要
  4. Cite sources when making claims                          // 第四步：引用来源

  Output format:                                              // 输出格式要求
  - Summary (2-3 paragraphs)                                  // 摘要：2-3段
  - Key findings (bullet points)                              // 关键发现：要点列表
  - Sources (with URLs)                                       // 来源：带链接

  Keep your response under 500 words to maintain clean context.`,  // 限制字数！这是防止context膨胀的关键
  tools: [internetSearch],
};
```

**人话翻译**：

> "这个研究员小弟的岗位说明书非常详细：
> 1. 明确工作流程（拆问题 -> 搜索 -> 整理 -> 引用）
> 2. 规定输出格式（摘要+要点+来源）
> 3. **最重要的**：限制输出字数在500字以内，这样返回给CEO的报告才够精简！"

### 5.4 多专业子代理协作

```typescript
const subagents = [
  {
    name: "data-collector",          // 数据采集员
    description: "Gathers raw data from various sources",
    tools: [webSearch, apiCall, databaseQuery],  // 能上网、调API、查数据库
  },
  {
    name: "data-analyzer",           // 数据分析师
    description: "Analyzes collected data for insights",
    tools: [statisticalAnalysis],    // 会统计分析
  },
  {
    name: "report-writer",           // 报告撰写员
    description: "Writes polished reports from analysis",
    tools: [formatDocument],         // 会格式化文档
  },
];
```

**人话翻译**：

> "这是一个数据团队的配置：
> - 采集员：负责到处收集原始数据
> - 分析师：把原始数据变成洞察
> - 写手：把洞察变成漂亮的报告
> 
> 主代理（CEO）只需要协调他们的工作顺序，不用亲自干每一步。"

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：开发一个"智能投资顾问"

你正在开发一个AI投资顾问，用户问：**"帮我分析一下特斯拉这只股票值不值得买？"**

#### 不用子代理的悲剧

```
用户提问 -> 主代理开始工作

主代理：
1. 搜索"特斯拉最新财报" -> 返回10000字
2. 搜索"特斯拉竞争对手分析" -> 返回8000字
3. 搜索"电动车行业趋势" -> 返回6000字
4. 查询股价数据库 -> 返回5000字历史数据
5. 搜索"马斯克最新动态" -> 返回3000字新闻
6. 分析技术指标 -> 返回2000字计算过程

此时主代理的Context：10000+8000+6000+5000+3000+2000 = 34000 tokens

主代理：（已经有点懵逼了）"呃...用户问的啥来着？"
```

**结果**：回答质量下降，响应缓慢，成本爆炸。

#### 用子代理的优雅解法

```typescript
const investmentAdvisor = createDeepAgent({
  model: "claude-sonnet-4-5-20250929",
  systemPrompt: `你是一位投资顾问。对于股票分析请求：
    1. 使用 fundamental-analyst 分析基本面
    2. 使用 technical-analyst 分析技术面
    3. 使用 news-researcher 了解最新动态
    4. 综合所有结果给出最终建议`,
  subagents: [
    {
      name: "fundamental-analyst",
      description: "分析公司财报、估值、竞争格局等基本面因素",
      systemPrompt: `你是基本面分析专家。
        - 查阅财报数据
        - 分析P/E、ROE等指标
        - 输出不超过300字的结论`,
      tools: [financialDatabase, webSearch],
    },
    {
      name: "technical-analyst", 
      description: "分析股价走势、技术指标等技术面因素",
      systemPrompt: `你是技术分析专家。
        - 分析K线形态
        - 计算MACD、RSI等指标
        - 输出不超过200字的结论`,
      tools: [stockPriceAPI, technicalIndicators],
    },
    {
      name: "news-researcher",
      description: "调研公司和行业最新新闻动态",
      systemPrompt: `你是新闻调研专家。
        - 搜索最近1个月的相关新闻
        - 总结利好和利空消息
        - 输出不超过200字的摘要`,
      tools: [newsSearch],
    },
  ],
});
```

**工作流程**：

```
用户："分析一下特斯拉"

主代理（CEO模式启动）：
    |
    |-- 派遣 fundamental-analyst --> 独立分析财报 --> 返回300字结论
    |-- 派遣 technical-analyst --> 独立分析K线 --> 返回200字结论  
    |-- 派遣 news-researcher --> 独立搜新闻 --> 返回200字摘要
    |
    v
主代理收到：300 + 200 + 200 = 700 tokens（而不是34000！）
    |
    v
主代理综合三份报告，给出最终投资建议
```

**效果对比**：

| 指标 | 不用子代理 | 用子代理 |
|-----|-----------|---------|
| Context大小 | 34000 tokens | ~1000 tokens |
| 回答质量 | 容易跑偏 | 清晰聚焦 |
| 响应速度 | 慢 | 快 |
| API成本 | 高 | 低 |
| 可维护性 | 难（全在一起） | 易（职责分明） |

---

## 7. 使用场景速查表

| 场景 | 推荐做法 |
|-----|---------|
| 简单问答（"今天天气怎样"） | 不用子代理，直接回答 |
| 需要1-2次工具调用的任务 | 不用子代理 |
| 需要5次以上工具调用的复杂任务 | 用子代理隔离 |
| 多个专业领域的综合任务 | 用多个专业子代理 |
| 只需要上下文隔离，不需要特殊能力 | 用general-purpose子代理 |
| 需要不同模型能力（长上下文vs数学能力） | 用不同model的子代理 |

---

## 8. 常见坑点与解决方案

### 坑1：子代理根本不被调用

**症状**：主代理自己干活，不派小弟。

**原因**：description写得太模糊。

**解决**：
```typescript
// 差劲的描述
{ description: "helps with stuff" }

// 优秀的描述
{ description: "Conducts in-depth research on specific topics using web search. Use when you need detailed information that requires multiple searches." }
```

### 坑2：用了子代理但Context还是很大

**症状**：子代理返回的结果太长。

**解决**：在system_prompt里明确要求精简输出：
```typescript
systemPrompt: `...
IMPORTANT: Return only the essential summary.
Do NOT include raw data or intermediate results.
Your response should be under 500 words.`
```

### 坑3：选错了子代理

**症状**：应该找"深度研究员"却找了"快速查询员"。

**解决**：让描述更加区分明确：
```typescript
{
  name: "quick-researcher",
  description: "For simple, quick questions that need 1-2 searches",
},
{
  name: "deep-researcher", 
  description: "For complex, in-depth research requiring multiple searches and synthesis",
}
```

---

## 9. 总结：子代理的核心价值

```
       +------------------+
       |   Main Agent     |  <-- 保持头脑清醒，专注高层协调
       |   (CEO)          |
       +--------+---------+
                |
     +----------+----------+
     |          |          |
+----v----+ +---v----+ +---v----+
|研究子代理| |分析子代理| |写作子代理|  <-- 各司其职，隔离工作
+---------+ +--------+ +--------+
     |          |          |
     v          v          v
  [垃圾隔离]  [垃圾隔离]  [垃圾隔离]    <-- 中间结果不回传
     |          |          |
     v          v          v
  精简结果    精简结果    精简结果     <-- 只返回核心价值
```

**一句话总结**：Subagents就是让你的AI系统从"一个人累死"变成"一个团队高效协作"的架构设计。CEO（主代理）只需要做决策和协调，具体干活的事儿交给专业部门（子代理），而且部门干活产生的垃圾不会堆到CEO的办公桌上。

---

*本文档基于 Deep Agents Subagents 官方文档深度解读，旨在帮助开发者快速理解和应用子代理功能。*
