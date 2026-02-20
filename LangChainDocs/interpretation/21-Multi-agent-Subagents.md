# LangChain Multi-agent Subagents 深度解读

## 1. 一句话省流 (The Essence)

**Subagents 就是"给你的 AI 配一群专业助手"** -- 主 Agent 像个项目经理，根据任务需求把活儿派给不同的"专家下属"，自己负责统筹协调，而不是啥都亲力亲为。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：啥都让一个 Agent 干，迟早翻车

想象一下，你让一个 AI 同时当：
- 数据分析师（查数据库）
- 邮件秘书（写邮件）
- 日程管家（管日历）
- 法律顾问（审合同）

会遇到什么问题？

1. **Context 爆炸** -- 对话越来越长，AI 的"脑子"就越来越混乱，因为它的上下文窗口是有限的
2. **能力稀释** -- 一个 Prompt 要塞进所有角色的说明，结果每个角色都做得不够专业
3. **维护噩梦** -- 改一个功能要动整个巨型 Agent，牵一发动全身
4. **并行困难** -- 任务只能串行执行，用户干等着

### 解决方案：分而治之，专人专事

Subagents 模式的核心思想：

| 角色 | 职责 |
|------|------|
| **Main Agent (主管)** | 理解用户需求，决定派谁干活，汇总结果 |
| **Subagent (专家)** | 专注做好一件事，做完就汇报，不掺和其他 |

这样带来的好处：
- **Context 隔离** -- 每个 Subagent 都是"干净"的上下文，不会被主对话污染
- **专业分工** -- 每个 Subagent 的 Prompt 可以针对性优化
- **灵活扩展** -- 新增能力？加个 Subagent 就行
- **并行执行** -- 多个独立任务可以同时跑

---

## 3. 生活化/职场类比 (The Analogy)

### 类比：五星级酒店的"金钥匙"服务

想象你住进一家五星级酒店，有一位**金钥匙管家**（Concierge）为你服务。

| 技术概念 | 酒店类比 | 说明 |
|---------|---------|------|
| **Main Agent** | 金钥匙管家 | 你只跟他打交道，他了解你的所有需求 |
| **Subagent A** | 餐厅领班 | 负责订餐、推荐菜品 |
| **Subagent B** | 礼宾车队 | 负责接送机、租车 |
| **Subagent C** | SPA 经理 | 负责预约按摩、健身 |
| **Tool** | 电话/对讲机 | 管家联系各部门的方式 |
| **Context 隔离** | 各部门独立运作 | 餐厅不知道你订了 SPA，也不需要知道 |

**场景还原：**

```
你：我想今晚安排个浪漫晚餐，然后明早 6 点去机场

金钥匙管家（Main Agent）：
  - 心想：这需要餐厅和车队两个部门
  - 打电话给餐厅领班：帮客人订今晚 7 点双人烛光晚餐
  - 同时打电话给车队：安排明早 5:30 专车送机
  - 汇总信息告诉你：已为您预订今晚 7 点湖畔餐厅双人座，
    明早 5:30 专车在大堂等候

关键点：
- 你只需要跟管家说一次
- 餐厅和车队可以同时处理（并行执行）
- 餐厅不知道你要赶飞机（Context 隔离）
- 管家记住了你的所有安排（状态由 Main Agent 维护）
```

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 Supervisor（主管 / 监督者）

就是 Main Agent 的另一个名字。它的职责是：
- 理解用户意图
- 决定调用哪个 Subagent
- 汇总各 Subagent 的结果
- 维护整个对话的记忆

注意区分 **Supervisor** vs **Router**：
- **Supervisor**：有脑子，能多轮对话，动态决策
- **Router**：没脑子，只做一次分类转发，不维护状态

### 4.2 Subagent（子代理 / 下属专家）

被 Main Agent 调用的专业 Agent。核心特点：
- **Stateless（无状态）**：每次调用都是全新的，不记得上次干过啥
- **不直接跟用户对话**：干完活向 Main Agent 汇报
- **专注单一领域**：比如只管邮件、只管日历

### 4.3 Tool Wrapping（工具包装）

这是实现 Subagents 的核心技术：**把 Agent 包装成 Tool**。

对于 Main Agent 来说，调用 Subagent 就像调用一个普通工具：
```
"我有个工具叫 research_agent，可以用来调研信息"
```

Main Agent 不知道这个"工具"背后其实是另一个 Agent，它只知道：
- 这个工具叫什么
- 输入什么
- 返回什么

### 4.4 Sync vs Async（同步 vs 异步）

| 模式 | 行为 | 适用场景 |
|------|------|---------|
| **Sync** | 等 Subagent 干完再继续 | 下一步依赖结果（查天气 -> 推荐穿搭）|
| **Async** | 后台跑，Main Agent 继续聊天 | 耗时任务（审 150 页合同）|

### 4.5 Context Isolation（上下文隔离）

每次调用 Subagent，它都运行在一个"干净"的上下文中：
- 不会被主对话的历史消息污染
- 不会让主对话变得臃肿
- 完成后只返回结果，不返回中间过程

这就像：你让秘书帮你调研一个课题，秘书给你的是一份**调研报告**，而不是他搜索过程中看的 100 篇文章。

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 5.1 基础实现：把 Subagent 包装成 Tool

```typescript
// 第一步：创建一个专业的 Subagent
// 这就像雇佣一个专门做调研的专家
const subagent = createAgent({ 
  model: "anthropic:claude-sonnet-4-20250514", 
  tools: [...] // 调研专家有自己的工具（搜索、分析等）
});

// 第二步：把专家"包装"成一个可调用的工具
// 就像给专家配一部对讲机，让主管能联系到他
const callResearchAgent = tool(
  async ({ query }) => {
    // 调用专家，把问题发给他
    const result = await subagent.invoke({
      messages: [{ role: "user", content: query }]
    });
    // 只返回专家的最终回答，不返回他的思考过程
    return result.messages.at(-1)?.content;
  },
  {
    name: "research",  // 工具名：主管用这个名字来调用
    description: "Research a topic and return findings",  // 工具说明：告诉主管这个工具能干嘛
    schema: z.object({ query: z.string() })  // 输入格式：需要一个查询字符串
  }
);

// 第三步：创建主管 Agent，把专家工具交给他
const mainAgent = createAgent({ 
  model: "anthropic:claude-sonnet-4-20250514", 
  tools: [callResearchAgent]  // 主管现在知道可以用 research 这个工具了
});
```

**执行流程：**
```
用户 -> 主管：帮我调研一下 2024 年 AI 发展趋势
主管心想：这是调研任务，用 research 工具
主管 -> 调研专家：query = "2024 年 AI 发展趋势"
调研专家：执行搜索、分析、总结...
调研专家 -> 主管：返回调研报告
主管 -> 用户：根据调研，2024 年 AI 趋势是...
```

### 5.2 高级模式：统一调度器（Single Dispatch Tool）

当你有很多 Subagent 时，不用为每个都写一个 Tool，可以用一个"统一调度器"：

```typescript
// 注册所有可用的 Subagent
const SUBAGENTS = {
  research: researchAgent,  // 调研专家
  writer: writerAgent,      // 写作专家
};

// 创建统一的 task 工具
const task = tool(
  async ({ agentName, description }) => {
    // 根据名字找到对应的专家
    const agent = SUBAGENTS[agentName];
    // 把任务发给他
    const result = await agent.invoke({
      messages: [{ role: "user", content: description }]
    });
    return result.messages.at(-1)?.content;
  },
  {
    name: "task",
    description: `调用子代理执行任务。
可用代理：
- research: 调研和信息搜集
- writer: 内容创作和编辑`,
    schema: z.object({
      agentName: z.string().describe("要调用的代理名称"),
      description: z.string().describe("任务描述"),
    }),
  }
);
```

**好处**：
- 新增 Subagent 只需要往 `SUBAGENTS` 里加一行
- 不用改 Main Agent 的 tools 列表
- 适合大型项目、多团队协作

### 5.3 异步执行：三件套模式

对于耗时任务，需要三个工具配合：

```typescript
// 工具 1：启动任务，返回任务 ID
const startJob = tool(async ({ task }) => {
  const jobId = await backgroundJobSystem.start(task);
  return `任务已启动，ID: ${jobId}`;
});

// 工具 2：查询任务状态
const checkStatus = tool(async ({ jobId }) => {
  const status = await backgroundJobSystem.getStatus(jobId);
  return `任务 ${jobId} 状态: ${status}`; // pending/running/completed/failed
});

// 工具 3：获取任务结果
const getResult = tool(async ({ jobId }) => {
  const result = await backgroundJobSystem.getResult(jobId);
  return result;
});
```

**对话流程：**
```
用户：帮我审一下这份 150 页的合同
主管：好的，已启动审核任务 (job_123)，我会通知您进度
（用户可以继续聊其他的）
用户：审完了吗？
主管：让我查一下... 还在审核中，已完成 60%
（过了一会）
用户：现在呢？
主管：审核完成！以下是发现的问题...
```

---

## 6. 真实应用场景 (Real-world Scenario)

### 场景：企业级智能客服系统

假设你在开发一个电商平台的 AI 客服，需要处理：
- 订单查询（查物流、退款）
- 商品咨询（推荐、比价）
- 账户问题（密码重置、会员积分）
- 售后投诉（差评处理、赔偿方案）

#### 不用 Subagents 的痛苦

```
一个巨型 Agent 的 System Prompt:

你是一个客服助手，你需要：
1. 处理订单相关问题，包括查询物流...（500 字说明）
2. 回答商品咨询，你需要了解所有品类...（800 字说明）
3. 解决账户问题，涉及到安全验证...（600 字说明）
4. 处理售后投诉，要遵循公司赔偿政策...（1000 字说明）

你有以下工具：
- query_order
- check_logistics
- get_product_info
- compare_prices
- reset_password
- check_points
- create_complaint
- calculate_compensation
... (20+ 个工具)
```

**问题**：
- Prompt 太长，AI 容易"忘记"某些规则
- 工具太多，AI 经常选错
- 改一个业务逻辑要改整个 Prompt
- 不同业务团队改代码容易冲突

#### 用 Subagents 的清爽

```
Main Agent（客服主管）:
  - 理解用户问题属于哪个类别
  - 调用对应的专业客服
  - 汇总结果回复用户

Subagent 1（订单专员）:
  - 只有订单相关的 Prompt（200 字）
  - 只有 3 个工具：query_order, check_logistics, request_refund

Subagent 2（商品顾问）:
  - 只有商品相关的 Prompt（300 字）
  - 只有 3 个工具：get_product_info, compare_prices, recommend

Subagent 3（账户专员）:
  - 只有账户相关的 Prompt（200 字）
  - 只有 3 个工具：verify_identity, reset_password, check_points

Subagent 4（售后经理）:
  - 只有售后相关的 Prompt（400 字）
  - 只有 3 个工具：create_complaint, calculate_compensation, escalate
```

**效果提升**：

| 指标 | 单体 Agent | Subagents 模式 |
|------|-----------|---------------|
| 准确率 | 75% | 92% |
| 响应速度 | 3-5 秒 | 1-2 秒（专业 Agent 更快） |
| 维护成本 | 高（改一处动全身） | 低（各团队独立迭代） |
| 扩展性 | 差（Prompt 爆炸） | 好（加 Subagent 即可） |

#### 实际对话示例

```
用户：我的订单 #12345 怎么还没到？另外帮我看看有没有类似的更便宜的

--- Main Agent 的思考 ---
这个问题涉及两个领域：
1. 订单物流 -> 调用订单专员
2. 商品比价 -> 调用商品顾问
两个任务相互独立，可以并行执行！

--- 并行调用 ---
-> 订单专员：查询订单 #12345 的物流状态
-> 商品顾问：查找订单 #12345 商品的替代品和价格比较

--- 汇总结果 ---
Main Agent -> 用户：
您的订单 #12345 目前在武汉中转站，预计明天送达。
关于替代品，我找到了 3 款类似商品：
- 商品 A：便宜 50 元，评分 4.8
- 商品 B：便宜 30 元，评分 4.9
- 商品 C：同价，但有满减优惠
需要我帮您下单替换吗？
```

---

## 总结：什么时候该用 Subagents？

| 场景 | 用 Subagents | 用单体 Agent |
|------|-------------|-------------|
| 多个明确分工的领域（邮件、日历、CRM）|  |  |
| 简单任务，只有几个工具 |  |  |
| 需要严格的 Context 隔离 |  |  |
| 不同团队负责不同模块 |  |  |
| 只是回答问题，不需要执行操作 |  |  |
| 需要并行执行独立任务 |  |  |

---

## 一图流总结

```
                    +-------------------+
                    |      用户         |
                    +--------+----------+
                             |
                             v
                    +--------+----------+
                    |   Main Agent      |
                    |   (项目经理)       |
                    |                   |
                    | - 理解需求        |
                    | - 分配任务        |
                    | - 汇总结果        |
                    | - 维护记忆        |
                    +--------+----------+
                             |
         +-------------------+-------------------+
         |                   |                   |
         v                   v                   v
+--------+------+   +--------+------+   +--------+------+
|  Subagent A   |   |  Subagent B   |   |  Subagent C   |
|  (订单专员)    |   |  (商品顾问)    |   |  (售后经理)    |
|               |   |               |   |               |
| - 查物流      |   | - 查商品      |   | - 处理投诉    |
| - 处理退款    |   | - 做比价      |   | - 计算赔偿    |
+---------------+   +---------------+   +---------------+

特点：
 Subagent 无状态（每次调用都是新鲜的）
 Subagent 不直接跟用户对话
 Context 隔离（各干各的，互不污染）
 可并行执行
```

希望这份解读能帮你彻底理解 Subagents 模式！有问题随时问。
