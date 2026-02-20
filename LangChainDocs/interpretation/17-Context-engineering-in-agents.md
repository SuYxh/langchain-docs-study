# LangChain Agent 上下文工程 (Context Engineering) 深度解读

---

## 1. 一句话省流 (The Essence)

**Context Engineering (上下文工程)** 就是：**给 AI 喂对的信息，让它干对的活儿。**

> 就像你给新来的实习生交代任务 —— 你讲不清楚，他肯定干不明白。上下文工程就是教你如何把任务交代得明明白白，让 AI Agent 变得靠谱可靠。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：为什么你的 Agent 总是"犯傻"？

你有没有遇到过这种情况：

- **Demo 的时候神乎其神，上线就拉胯** —— 原型演示时 AI 无所不能，真正用起来各种掉链子
- **AI 总是"选错工具"** —— 明明该查数据库，它偏要去调 API；明明该简单回复，它非要长篇大论
- **对话太长就"失忆"** —— 聊着聊着，AI 就忘了前面说的话，答非所问
- **不同用户一视同仁** —— 管理员和普通用户能看到的功能应该不一样，但 AI 傻傻分不清

**根本原因只有两个：**

1. 底层模型能力不够（这个你控制不了）
2. **你没有把"对的上下文"传给模型**（这个你能控制！）

> 90% 的 Agent 失败案例，都是第二个原因导致的！

### 解决方案：Context Engineering 三大法宝

LangChain 的上下文工程让你可以精细控制：

| 控制点 | 你能控制什么 | 持久性 |
|--------|-------------|--------|
| **Model Context（模型上下文）** | 每次调用模型时看到什么（指令、历史、工具、输出格式） | 临时的 |
| **Tool Context（工具上下文）** | 工具能访问什么数据、能写入什么数据 | 持久的 |
| **Life-cycle Context（生命周期上下文）** | 调用之间发生什么（摘要、护栏、日志等） | 持久的 |

---

## 3. 生活化类比 (The Analogy)

### 类比：把 Agent 想象成一家"智能餐厅"

想象你经营一家高端餐厅，AI Agent 就是你的**智能服务系统**：

```
餐厅智能系统 = AI Agent
              |
    +---------+---------+
    |         |         |
 领班大脑   服务员工具  餐厅管理流程
(Model)    (Tools)    (Life-cycle)
```

#### Model Context = 领班看到的"点单小票"

每次有客人点餐，领班（LLM）需要知道：
- **System Prompt（菜单和餐厅规矩）**：今天有什么特色菜？有什么忌口要注意？
- **Messages（对话历史）**：客人之前点了什么？有没有过敏史？
- **Tools（可用厨房）**：今天哪个厨房开着？能做中餐还是西餐？
- **Response Format（出餐格式）**：客人要打包还是堂食？

#### Tool Context = 服务员能做的事

服务员（Tools）可以：
- **Read（读取）**：查看客人的会员档案、过敏信息、历史订单
- **Write（写入）**：记录本次消费、更新会员积分、保存偏好

#### Life-cycle Context = 餐厅运营流程

在服务过程中穿插的管理动作：
- **Summarization（历史摘要）**：老客户来太多次了，不能把每次消费记录都念一遍，得生成个"消费摘要"
- **Guardrails（护栏检查）**：某些菜品不能同时点（比如海鲜和某些药物冲突），要自动拦截

### 三种数据来源的类比

| 数据源 | 餐厅类比 | 作用域 |
|--------|----------|--------|
| **Runtime Context（运行时配置）** | 餐厅的固定设置：营业时间、API 密钥、数据库连接 | 整个对话期间不变 |
| **State（短期记忆）** | 这一桌客人的当前状态：点了什么菜、已上几道菜 | 单次对话内 |
| **Store（长期记忆）** | 客户档案库：VIP 等级、历史偏好、过敏记录 | 跨对话持久存储 |

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 Agent Loop（Agent 循环）

Agent 的工作就是一个不断重复的循环：

```
┌─────────────────────────────────────┐
│  1. Model Call（模型调用）           │
│     - 把提示词+工具列表发给 LLM      │
│     - LLM 返回：回复 或 "我要用工具" │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  2. Tool Execution（工具执行）       │
│     - 执行 LLM 请求的工具           │
│     - 把结果返回给 LLM              │
└──────────────┬──────────────────────┘
               │
               ▼
         继续循环，直到 LLM 决定结束
```

### 4.2 Transient vs Persistent（临时 vs 持久）

这是个特别重要的概念：

- **Transient（临时的）**：只在当前这一次模型调用生效，不会保存
  - 比如：临时给消息列表加点上下文，但不改变实际存储的对话历史
  
- **Persistent（持久的）**：会永久修改状态，影响后续所有对话
  - 比如：把太长的对话历史压缩成摘要，后续对话看到的就是摘要了

### 4.3 Middleware（中间件）

**Middleware = 钩子函数**，让你可以在 Agent 生命周期的任何节点"插一脚"：

```
用户输入 → [before_model] → 模型调用 → [after_model] → 工具执行 → [after_tool] → 继续...
              ^                                         ^                ^
              |                                         |                |
           可以修改                                   可以拦截          可以修改
           输入内容                                   执行流程          工具结果
```

### 4.4 三种数据存储

| 名称 | 别名 | 生命周期 | 用途举例 |
|------|------|----------|----------|
| **Runtime Context** | 静态配置 | 整个会话 | 用户 ID、API 密钥、数据库连接、权限设置 |
| **State** | 短期记忆 | 单次对话 | 当前消息列表、已上传文件、认证状态 |
| **Store** | 长期记忆 | 跨对话 | 用户偏好、历史洞察、学习到的模式 |

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 5.1 动态系统提示词：根据对话长度调整语气

```typescript
const agent = createAgent({
  model: "gpt-4.1",
  tools: [...],
  middleware: [
    dynamicSystemPromptMiddleware((state) => {
      // 检查当前对话有多少条消息了
      const messageCount = state.messages.length;

      let base = "You are a helpful assistant.";

      // 如果聊了超过 10 轮，提醒 AI 要简洁点
      if (messageCount > 10) {
        base += "\nThis is a long conversation - be extra concise.";
      }

      return base;
    }),
  ],
});
```

**人话解读：**
> 这段代码在说："嘿 AI，如果用户跟你已经聊了超过 10 轮了，你就别啰嗦了，简洁点回答！" 
> 
> 这就像餐厅领班发现客人已经点了很多菜了，就别再推荐了，直接问"还需要什么"就行。

### 5.2 根据用户角色动态筛选工具

```typescript
const contextBasedTools = createMiddleware({
  name: "ContextBasedTools",
  wrapModelCall: (request, handler) => {
    // 从运行时配置中读取用户角色
    const userRole = request.runtime.context.userRole;

    let filteredTools = request.tools;

    if (userRole === "admin") {
      // 管理员：啥工具都能用，不筛选
    } else if (userRole === "editor") {
      // 编辑者：不能用"删除数据"的工具
      filteredTools = request.tools.filter(t => t.name !== "delete_data");
    } else {
      // 普通用户：只能用"读取"类工具
      filteredTools = request.tools.filter(t => t.name.startsWith("read_"));
    }

    // 把筛选后的工具列表传给模型
    return handler({ ...request, tools: filteredTools });
  },
});
```

**人话解读：**
> 这段代码实现了**权限控制**：
> - 管理员可以使用所有工具（包括删除数据）
> - 编辑者不能删除数据，但能做其他操作
> - 普通用户只能查看，不能改任何东西
>
> 就像餐厅里，大堂经理能退菜、改单、打折；普通服务员只能看看客人点了什么。

### 5.3 自动摘要：对话太长就压缩

```typescript
const agent = createAgent({
  model: "gpt-4.1",
  tools: [...],
  middleware: [
    summarizationMiddleware({
      model: "gpt-4.1-mini",    // 用便宜的小模型来做摘要
      trigger: { tokens: 4000 }, // 超过 4000 token 就触发摘要
      keep: { messages: 20 },    // 保留最近 20 条消息不压缩
    }),
  ],
});
```

**人话解读：**
> 这段代码解决了"AI 失忆"问题：
> - 当对话历史超过 4000 个 token 时，自动把老消息压缩成摘要
> - 但最近 20 条消息保持原样（因为最近的上下文最重要）
> - 用便宜的小模型来做摘要，省钱！
>
> 就像餐厅的老客户档案：不可能记录每一次点菜详情，但会记录"这位客人喜欢清淡口味，不吃辣，常点鱼类菜品"。

### 5.4 工具读写 State 和 Store

```typescript
// 工具写入 State（短期记忆）—— 记录用户已认证
const authenticateUser = tool(
  async ({ password }) => {
    if (password === "correct") {
      // 返回一个 Command，告诉系统更新 State
      return new Command({
        update: { authenticated: true },  // 把 authenticated 设为 true
      });
    }
    return new Command({ update: { authenticated: false } });
  },
  { name: "authenticate_user", ... }
);

// 工具写入 Store（长期记忆）—— 保存用户偏好
const savePreference = tool(
  async ({ preferenceKey, preferenceValue }, runtime) => {
    const userId = runtime.context.userId;
    const store = runtime.store;
    
    // 读取已有偏好
    const existingPrefs = await store.get(["preferences"], userId);
    const prefs = existingPrefs?.value || {};
    
    // 更新偏好
    prefs[preferenceKey] = preferenceValue;
    
    // 持久化保存到 Store
    await store.put(["preferences"], userId, prefs);
    
    return `Saved: ${preferenceKey} = ${preferenceValue}`;
  },
  { name: "save_preference", ... }
);
```

**人话解读：**
> - **State 写入**：就像在收银台贴个标签"这位客人已验证会员身份"，本次服务期间有效
> - **Store 写入**：就像在客户档案库里更新记录"这位客人偏好口味：清淡"，永久保存，下次来还能用

---

## 6. 真实应用场景 (Real-world Scenario)

### 场景：电商智能客服 Agent

假设你在开发一个电商平台的智能客服，需要处理：
- 订单查询
- 退款申请  
- 商品推荐
- 投诉处理

**没有 Context Engineering 之前的痛点：**

1. **权限混乱**：普通客服和高级客服能做的事情一样多，可能误操作
2. **上下文丢失**：客户说"我要查上次那个订单"，AI 不知道"上次"是哪次
3. **千人一面**：VIP 客户和普通客户得到一样的服务，没有个性化
4. **对话越长越傻**：聊了 50 轮后，AI 开始答非所问

**用了 Context Engineering 之后：**

```typescript
const customerServiceAgent = createAgent({
  model: "gpt-4.1",
  tools: [queryOrder, processRefund, recommendProduct, escalateComplaint],
  contextSchema: z.object({
    userId: z.string(),
    userRole: z.enum(["customer", "vip", "agent", "supervisor"]),
    region: z.string(),
  }),
  middleware: [
    // 1. 动态系统提示词：VIP 客户用更热情的语气
    dynamicSystemPromptMiddleware(async (state, runtime) => {
      const store = runtime.store;
      const userProfile = await store.get(["profiles"], runtime.context.userId);
      
      let prompt = "你是电商客服助手。";
      if (userProfile?.value?.isVIP) {
        prompt += "\n这是 VIP 客户，请提供更热情周到的服务，可以主动提供专属优惠。";
      }
      if (runtime.context.region === "overseas") {
        prompt += "\n这是海外客户，请注意时区差异，提供国际运费说明。";
      }
      return prompt;
    }),
    
    // 2. 动态工具筛选：普通客户不能直接退款，只能申请
    createMiddleware({
      name: "RoleBasedTools",
      wrapModelCall: (request, handler) => {
        const role = request.runtime.context.userRole;
        let tools = request.tools;
        
        if (role === "customer" || role === "vip") {
          // 客户只能查询和申请，不能直接执行退款
          tools = tools.filter(t => !t.name.includes("process"));
        }
        return handler({ ...request, tools });
      },
    }),
    
    // 3. 自动摘要：对话太长就压缩，避免 AI 失忆
    summarizationMiddleware({
      model: "gpt-4.1-mini",
      trigger: { tokens: 3000 },
      keep: { messages: 15 },
    }),
  ],
});
```

**效果对比：**

| 方面 | 之前 | 之后 |
|------|------|------|
| 权限控制 | 所有人能用所有工具 | 按角色动态筛选工具 |
| 个性化 | 千篇一律的回复 | VIP 有专属服务话术 |
| 长对话 | 聊久了就犯傻 | 自动摘要保持清醒 |
| 地区适配 | 忽略地区差异 | 根据地区调整提示 |

---

## 7. 最佳实践总结

| 实践 | 说明 |
|------|------|
| **从简单开始** | 先用静态提示词和工具，有需要再加动态逻辑 |
| **增量测试** | 每次只加一个 Context Engineering 特性，测稳了再加下一个 |
| **监控性能** | 追踪模型调用次数、Token 消耗、响应延迟 |
| **用内置中间件** | LangChain 提供了 `summarizationMiddleware`、`LLMToolSelectorMiddleware` 等，别重复造轮子 |
| **区分临时和持久** | 搞清楚你的修改是"只影响这一次"还是"永久保存" |

---

## 8. 一张图总结

```
┌─────────────────────────────────────────────────────────────────┐
│                    Context Engineering 全景图                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  数据源                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │Runtime Context│  │    State     │  │    Store     │           │
│  │  (静态配置)   │  │  (短期记忆)  │  │  (长期记忆)  │           │
│  │ API密钥、权限 │  │ 当前对话消息 │  │ 用户偏好历史 │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         └────────────────┼─────────────────┘                    │
│                          │                                       │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                     Middleware 中间件                        ││
│  │   before_model → Model Call → after_model → Tool → after_tool││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                       │
│         ┌────────────────┼────────────────┐                     │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │Model Context │ │ Tool Context │ │Life-cycle    │             │
│  │  提示词、工具  │ │  读写数据    │ │Context 摘要  │             │
│  │  模型、格式   │ │  返回结果    │ │  护栏、日志  │             │
│  │  (临时)      │ │  (持久)      │ │  (持久)      │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 延伸阅读

- **Context 概念概览**：理解不同类型的上下文及何时使用
- **Middleware 中间件**：完整的中间件指南
- **Tools 工具**：工具创建和上下文访问
- **Memory 记忆**：短期和长期记忆模式
- **Agents**：核心 Agent 概念

---

> **记住**：Context Engineering 不是什么高深的黑魔法，它就是**让 AI 在正确的时间看到正确的信息**。就像带新人一样 —— 你把背景交代清楚了，他自然就能把活儿干好。
