# Multi-agent Router 深度解读

## 一句话省流 (The Essence)

**Router 就是多 Agent 系统里的"智能前台"** —— 它负责听懂用户的问题，然后把问题分配给最合适的专家 Agent 去处理，最后把各个专家的答案汇总成一个完整的回复。

---

## 核心痛点与解决方案 (The "Why")

### 痛点：没有 Router 之前的倒霉事

想象一下，你开发了一个企业知识库系统，里面有三种类型的数据：

1. **GitHub 上的代码文档**
2. **Notion 里的产品文档**
3. **Slack 聊天记录里的讨论**

**问题来了：**

- 如果让一个"万能 Agent"处理所有问题，它需要同时精通 GitHub API、Notion API、Slack API... 系统提示词会写得又臭又长，模型越来越"懵"
- 更要命的是，用户问"最新的登录功能怎么实现的"，可能需要**同时**查 GitHub 代码 + Notion 设计文档 + Slack 讨论记录，一个 Agent 串行查询会非常慢

### 解决：Router 的救场方式

Router 模式的核心思想是 **"专业的事交给专业的人"**：

1. **Router（路由器）先分类**：判断这个问题应该问谁
2. **并行分发给专家 Agent**：GitHub Agent、Notion Agent、Slack Agent 同时干活
3. **汇总合成答案**：把各个专家的回答整合成一个连贯的答复

```
用户提问 --> [Router 分类] --> Agent A (并行) --> [汇总合成] --> 最终答案
                         --> Agent B (并行) ↗
                         --> Agent C (并行) ↗
```

---

## 生活化类比 (The Analogy)

### 类比：大型医院的"分诊台"

把 Router 系统想象成一家大型综合医院的**分诊台**：

| 技术概念 | 医院类比 | 职责说明 |
|---------|---------|---------|
| **Router（路由器）** | 分诊台护士 | 听患者描述症状，判断应该挂哪个科室 |
| **Agent A/B/C（专家 Agent）** | 各科室专家（心内科、骨科、皮肤科） | 各自擅长特定领域，深度解决问题 |
| **Query（用户查询）** | 患者主诉 | "我胸口疼，还有点皮疹" |
| **Parallel Execution（并行执行）** | 多科室会诊 | 心内科和皮肤科同时看诊 |
| **Synthesize（结果汇总）** | 会诊报告 | 综合各科意见，给出完整诊断方案 |
| **Send** | 分诊单 | 分诊护士给患者开的单子，写明去哪个科室 |
| **Command** | 指定挂号 | 直接指定挂某一个科室 |

**场景还原：**

> 患者（用户）："我胸口疼，还有点皮疹"
>
> 分诊台护士（Router）分析后说："您这个情况比较复杂，我同时给您挂了心内科和皮肤科，两位专家会同时给您看诊"
>
> 心内科专家（Agent A）："心脏方面没有器质性问题"
> 皮肤科专家（Agent B）："皮疹是带状疱疹引起的，神经痛会放射到胸口"
>
> 最终报告（Synthesize）："您是带状疱疹引起的神经痛，表现为胸口疼痛，心脏没有问题，建议皮肤科治疗..."

---

## 关键概念拆解 (Key Concepts)

### 1. Router（路由器）

**大白话：** 就是个"问题分拣员"，看看用户的问题属于哪个类别，然后派给对应的专家处理。

**技术实现：** 通常是一个 LLM 调用 + 分类 Prompt，或者简单的规则匹配。

---

### 2. Verticals（垂直领域）

**大白话：** 就是"专业方向"。比如代码问题是一个 vertical，产品文档是另一个 vertical。每个 vertical 都有自己的专家 Agent。

**举例：** 电商客服系统里：订单查询、退款申请、商品咨询 就是三个不同的 verticals。

---

### 3. Command vs Send

| 概念 | 作用 | 使用场景 |
|------|------|---------|
| **Command** | 导航到**单个** Agent | 问题明确属于某一个领域（"查一下我的订单"） |
| **Send** | 并行分发给**多个** Agent | 问题需要多个领域协作（"最新功能的代码和文档"） |

**口诀：** Command 是"指名道姓找一个人"，Send 是"群发通知找一群人"。

---

### 4. Stateless vs Stateful Router（无状态 vs 有状态路由）

| 类型 | 特点 | 适用场景 |
|------|------|---------|
| **Stateless** | 每次请求独立处理，不记住之前聊过什么 | 单轮问答、搜索查询 |
| **Stateful** | 记住对话历史，支持多轮对话 | 复杂的客服对话、追问场景 |

**大白话：** Stateless 像"问路的路人"，每次问完就忘；Stateful 像"你的私人管家"，记得你之前说过什么。

---

### 5. Tool Wrapper（工具包装器）

**大白话：** 把一个复杂的 Router 系统"打包"成一个简单的工具，让一个会聊天的 Agent 来调用它。

**好处：** 聊天记忆由外层 Agent 管理，Router 本身保持简单（无状态），避免复杂度爆炸。

---

## 代码"人话"解读 (Code Walkthrough)

### 场景一：单 Agent 路由（用 Command）

```typescript
function routeQuery(state: z.infer<typeof ClassificationResult>) {
  const classification = classifyQuery(state.query);  // 让 LLM 分析这个问题属于哪个领域
  
  return new Command({ goto: classification.agent }); // 跳转到对应的 Agent
}
```

**人话翻译：**

> "嘿，LLM，帮我看看用户这个问题是问代码的、问文档的、还是问别的。哦，是问代码的？好，直接跳转到 CodeAgent 那里去处理。"

---

### 场景二：多 Agent 并行（用 Send）

```typescript
function routeQuery(state: typeof State.State) {
  const classifications = classifyQuery(state.query);  // LLM 分析出这个问题涉及多个领域
  
  // 给每个相关的 Agent 都发一份任务，让他们同时干活
  return classifications.map(
    (c) => new Send(c.agent, { query: c.query })
  );
}
```

**人话翻译：**

> "用户问的这个问题有点复杂，既涉及代码又涉及文档。那我同时通知 CodeAgent 和 DocAgent，让他们一起查，查完了我再汇总。"

---

### 场景三：Tool Wrapper 模式

```typescript
const searchDocs = tool(
  async ({ query }) => {
    const result = await workflow.invoke({ query }); // 调用整个 Router 工作流
    return result.finalAnswer;                        // 返回汇总后的答案
  },
  {
    name: "search_docs",
    description: "Search across multiple documentation sources",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

// 聊天 Agent 把 Router 当成一个工具来用
const conversationalAgent = createAgent({
  model,
  tools: [searchDocs],  // Router 被包装成了一个叫 "search_docs" 的工具
  systemPrompt: "You are a helpful assistant. Use search_docs to answer questions.",
});
```

**人话翻译：**

> "我有一个很复杂的多源搜索系统（Router），但我懒得让它自己管理聊天记录。于是我把它包装成一个工具叫 `search_docs`，让一个专门负责聊天的 Agent 来调用它。聊天记忆归聊天 Agent 管，搜索归 Router 管，各司其职。"

---

## 真实应用场景 (Real-world Scenario)

### 场景：企业内部知识库助手

**业务背景：**

某科技公司有三个核心知识源：
- **GitHub**：存放代码和技术文档
- **Notion**：存放产品需求和设计文档
- **Slack**：存放团队讨论和决策记录

**没用 Router 之前的痛点：**

1. 员工问"登录功能的最新设计是什么"，系统只能查一个地方，信息不全
2. 串行查询三个系统，响应时间长达 10 秒以上
3. 一个大而全的 Agent 经常"答非所问"，因为 Prompt 太复杂

**用了 Router 之后的提升：**

| 指标 | 改进前 | 改进后 |
|------|--------|--------|
| 响应时间 | 10+ 秒 | 3-4 秒（并行查询） |
| 信息完整性 | 只能查单一来源 | 自动聚合多源信息 |
| 回答准确率 | 60%（Prompt 过载） | 90%+（专家分工） |

**实际交互示例：**

```
用户：最新的支付功能是怎么实现的？

[Router 分析]：这个问题涉及"代码实现"和"产品设计"，需要查 GitHub 和 Notion

[并行执行]：
  - GitHub Agent：查到支付模块代码，使用了 Stripe SDK...
  - Notion Agent：查到产品文档，支付流程为：选择商品 -> 确认订单 -> 调用支付 -> 回调确认...

[汇总输出]：
支付功能的实现如下：
1. 产品设计：采用标准电商支付流程，支持微信、支付宝、信用卡...
2. 技术实现：前端使用 React 组件，后端集成 Stripe SDK，代码位于 /src/payment/...
3. 相关讨论：团队在上周决定新增 Apple Pay 支持...
```

---

## 总结对比表

| 模式 | 适用场景 | 核心优势 | 注意事项 |
|------|---------|---------|---------|
| **Router** | 明确的分类场景，需要并行处理 | 轻量、高效、可并行 | 不适合复杂的多轮对话 |
| **Supervisor（主管模式）** | 需要 LLM 动态决策的复杂流程 | 灵活、上下文感知 | 开销更大 |
| **Handoffs（交接模式）** | Agent 之间需要明确交接 | 流程清晰 | 需要定义好交接规则 |

**选择口诀：**

- 问题分类明确，要并行 --> 用 **Router**
- 需要 LLM 边聊边决策 --> 用 **Supervisor**
- Agent 之间要接力赛 --> 用 **Handoffs**

---

## 架构图解

```
                    ┌─────────────────────────────────────────┐
                    │             用户提问                     │
                    │   "最新的支付功能是怎么实现的？"          │
                    └─────────────────┬───────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────────────┐
                    │             Router (分诊台)              │
                    │   分析问题 → 涉及"代码"和"文档"两个领域   │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
            ┌───────────┐     ┌───────────┐     ┌───────────┐
            │ GitHub    │     │ Notion    │     │ Slack     │
            │ Agent     │     │ Agent     │     │ Agent     │
            │ (代码专家) │     │ (文档专家) │     │ (讨论专家) │
            └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
                  │                 │                 │
                  └─────────────────┼─────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │           Synthesize (结果汇总)          │
                    │   整合各专家的回答，生成完整答复          │
                    └─────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────────────────┐
                    │             最终答案返回给用户           │
                    └─────────────────────────────────────────┘
```

---

**一句话总结：** Router 模式就像医院的分诊系统，让专业的问题找专业的人，还能让多个专家同时会诊，最后给你一个完整的诊断报告。简单、高效、各司其职！
