# LangChain Tools (工具) 深度解读

## 1. 一句话省流 (The Essence)

**Tool 就是你给 AI 配备的"技能包"——让大模型从"光说不练"变成"真能干活"。**

光靠嘴皮子（生成文字）是不够的，AI 需要"手脚"来查数据、调 API、操作数据库、执行代码。Tool 就是这双"手脚"。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：大模型的"四体不勤"

| 问题 | 具体表现 |
|------|----------|
| **数据实时性差** | 模型训练数据有截止日期，无法回答"今天的天气"、"最新股价" |
| **无法操作外部系统** | 不能帮你发邮件、查数据库、调用第三方 API |
| **计算能力有限** | 大模型做复杂数学计算经常出错（著名的 9.11 vs 9.8 问题） |
| **没有持久化能力** | 模型本身不能"记住"用户信息到下次对话 |

### 解决方案：Tool = 给 AI 装上"外挂"

```
用户问: "北京今天天气怎么样？"
       ↓
AI 思考: "我训练数据里没有今天的天气，但我有个叫 get_weather 的工具可以用！"
       ↓
AI 调用: get_weather({ city: "北京" })
       ↓
工具返回: "北京今天 25°C，晴转多云"
       ↓
AI 回答: "北京今天天气不错，25度，晴转多云，适合出门~"
```

---

## 3. 生活化类比 (The Analogy)

### 把 Agent 想象成一个"万能管家"

| 技术概念 | 生活类比 |
|----------|----------|
| **Agent** | 你家的超级管家，聪明但手无寸铁 |
| **Tool** | 管家手里的"工具箱"——有扳手(查数据库)、电话(调API)、计算器(算数)、笔记本(存储) |
| **Zod Schema** | 工具说明书——"扳手需要拧什么尺寸的螺丝" |
| **Context** | 管家的工作证——记录"这是谁家的管家、有什么权限" |
| **Store** | 管家的长期记事本——跨越多次服务也能记住"主人喜欢喝什么咖啡" |
| **Writer** | 管家的对讲机——干活时实时汇报"我正在做XXX..." |
| **ToolNode** | 工具房——把所有工具集中管理，统一调度 |

**场景模拟：**

你对管家说："帮我查下用户 abc123 的信息，然后发个邮件给他"

```
管家(Agent): "好的，我需要用到两个工具"
   ↓
第一步: 拿起"用户查询扳手"(getUserInfo tool)
        -> 查到: {name: "小明", email: "xm@test.com"}
   ↓
第二步: 拿起"邮件电话"(sendEmail tool)
        -> 发送邮件给 xm@test.com
   ↓
管家: "主人，搞定了！"
```

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 `tool` 函数 - 工具的"出生证明"

```typescript
const myTool = tool(
  执行函数,        // 真正干活的代码
  {
    name: "xxx",       // 工具名字（AI用来认识它）
    description: "xxx", // 工具说明（AI用来决定什么时候用它）
    schema: z.object({ ... }), // 参数定义（AI用来知道怎么用它）
  }
);
```

**人话：** 就像你招聘员工要填简历——姓名、特长、需要什么资源才能干活。

### 4.2 `Zod Schema` - 参数的"合同"

```typescript
schema: z.object({
  query: z.string().describe("搜索关键词"),
  limit: z.number().describe("最多返回几条"),
})
```

**人话：** 
- `z.string()` = 这个参数必须是文字
- `z.number()` = 这个参数必须是数字
- `.describe("xxx")` = 告诉 AI "这个参数是干嘛用的"

这很关键！因为 AI 要根据这些描述来决定传什么值。

### 4.3 `Context` - 运行时的"身份证"

```typescript
// 调用时传入
await agent.invoke(
  { messages: [...] },
  { context: { user_id: "123", role: "admin" } }  // <- 这就是 context
);

// 工具内访问
const myTool = tool(
  (_, config) => {
    const userId = config.context.user_id;  // 拿到 "123"
    // ...
  },
  { ... }
);
```

**人话：** Context 是"只读的工牌信息"——在整个对话过程中不会变，工具可以读但不能改。

### 4.4 `Store` - 跨对话的"长期记忆"

```typescript
// 存数据（像写笔记）
await store.put(["users"], "abc123", { name: "小明", age: 25 });

// 取数据（像翻笔记）
const user = await store.get(["users"], "abc123");
```

**人话：** 
- `["users"]` 是命名空间（哪个抽屉）
- `"abc123"` 是 key（哪张卡片）
- 数据存进去后，即使用户关掉浏览器明天再来，也能找到

### 4.5 `Writer` - 实时进度的"对讲机"

```typescript
const myTool = tool(
  ({ query }, config: ToolRuntime) => {
    config.writer?.("开始搜索...");
    // ... 做一些耗时操作
    config.writer?.("搜索完成，正在处理...");
    // ...
    return "最终结果";
  },
  { ... }
);
```

**人话：** 工具执行可能很慢（比如调外部 API），用 writer 可以实时告诉前端"我在干嘛"，避免用户以为卡死了。

### 4.6 `ToolNode` - 工具的"统一调度中心"

```typescript
const toolNode = new ToolNode([tool1, tool2, tool3]);
```

**人话：** 把所有工具打包成一个"工具房"，在 LangGraph 工作流里统一管理。它会自动处理：
- 并行执行多个工具
- 捕获工具报错
- 注入状态信息

### 4.7 `toolsCondition` - 智能路由的"红绿灯"

```typescript
.addConditionalEdges("llm", toolsCondition)  // AI 想调工具 -> 去 tools 节点
                                              // AI 不调工具 -> 直接结束
```

**人话：** 就是个判断器——"AI 这次回复里有没有说要用工具？有的话去执行工具，没有的话直接输出答案"。

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 场景：创建一个数据库搜索工具

```typescript
import * as z from "zod"
import { tool } from "langchain"

const searchDatabase = tool(
  // 第一个参数：真正干活的函数
  ({ query, limit }) => `Found ${limit} results for '${query}'`,
  
  // 第二个参数：工具的"说明书"
  {
    name: "search_database",  // AI 看到的工具名
    description: "Search the customer database for records matching the query.",
    // ↑ 这段描述超级重要！AI 根据这个决定什么时候用这个工具
    
    schema: z.object({
      query: z.string().describe("Search terms to look for"),
      // ↑ 告诉 AI：你要给我一个字符串类型的搜索词
      limit: z.number().describe("Maximum number of results to return"),
      // ↑ 告诉 AI：你要给我一个数字，表示最多返回几条
    }),
  }
);
```

**逻辑意图解读：**
1. 这段代码在"注册"一个工具，让 AI 知道有这么个能力可用
2. `description` 就像工具的广告词，AI 会据此判断"用户的问题需不需要用这个工具解决"
3. `schema` 定义了调用这个工具需要传什么参数，AI 会自动从对话中提取相关信息填进去

---

### 场景：带有上下文访问的工具

```typescript
const getUserName = tool(
  (_, config) => {
    // config 里有运行时的上下文信息
    return config.context.user_name  // 直接返回用户名
  },
  {
    name: "get_user_name",
    description: "Get the user's name.",
    schema: z.object({}),  // 这个工具不需要任何参数
  }
);

// 创建 Agent 时定义 context 的结构
const contextSchema = z.object({
  user_name: z.string(),
});

const agent = createAgent({
  model: new ChatOpenAI({ model: "gpt-4.1" }),
  tools: [getUserName],
  contextSchema,  // 告诉 Agent：context 长这样
});

// 调用时传入实际的 context 值
const result = await agent.invoke(
  { messages: [{ role: "user", content: "What is my name?" }] },
  { context: { user_name: "John Smith" } }  // 注入用户信息
);
```

**逻辑意图解读：**
1. 工具本身不需要参数（`schema: z.object({})`），但它需要"偷偷"访问上下文
2. `config.context.user_name` 是在调用 agent 时从外部注入的，不是 AI 生成的
3. 这种模式适合：用户 ID、权限级别、Session 信息等"业务侧已知"的数据

---

### 场景：构建工具执行图（LangGraph 工作流）

```typescript
const builder = new StateGraph(MessagesAnnotation)
  .addNode("llm", callLlm)              // 节点1: 调用大模型
  .addNode("tools", new ToolNode(tools)) // 节点2: 执行工具
  .addEdge("__start__", "llm")          // 开始 -> 先问大模型
  .addConditionalEdges("llm", toolsCondition)  // 大模型输出后，看要不要调工具
  .addEdge("tools", "llm");             // 工具执行完 -> 把结果喂回大模型

const graph = builder.compile();
```

**逻辑意图解读（用流程图理解）：**

```
       开始
         │
         ▼
    ┌─────────┐
    │   LLM   │ ← 大模型思考
    └────┬────┘
         │
    toolsCondition 判断
         │
    ┌────┴────┐
    │         │
有工具调用   无工具调用
    │         │
    ▼         ▼
┌───────┐   结束
│ Tools │
└───┬───┘
    │
    └──────→ 回到 LLM（带着工具结果继续对话）
```

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：电商客服 AI 助手

**需求：** 用户可以问"我的订单到哪了"、"帮我改收货地址"、"推荐类似商品"

**必须用 Tool 的原因：**

| 用户问题 | 为什么必须用 Tool |
|----------|-------------------|
| "我的订单 #12345 到哪了？" | 需要查询物流 API，AI 不知道实时物流数据 |
| "帮我把收货地址改成北京" | 需要调用订单系统 API 修改数据 |
| "推荐类似商品" | 需要查商品数据库，做向量相似度搜索 |
| "记住我喜欢红色" | 需要 Store 持久化用户偏好 |

**代码结构示意：**

```typescript
// 工具1: 查订单状态
const getOrderStatus = tool(
  async ({ orderId }, config) => {
    const userId = config.context.user_id;
    const order = await db.orders.findOne({ id: orderId, userId });
    return JSON.stringify(order.logistics);
  },
  {
    name: "get_order_status",
    description: "查询用户订单的物流状态",
    schema: z.object({ orderId: z.string().describe("订单号") }),
  }
);

// 工具2: 修改收货地址
const updateAddress = tool(
  async ({ orderId, newAddress }, config) => {
    const userId = config.context.user_id;
    await db.orders.updateOne(
      { id: orderId, userId },
      { $set: { address: newAddress } }
    );
    return "地址修改成功";
  },
  {
    name: "update_address",
    description: "修改订单的收货地址",
    schema: z.object({
      orderId: z.string().describe("订单号"),
      newAddress: z.string().describe("新的收货地址"),
    }),
  }
);

// 工具3: 保存用户偏好（用 Store 持久化）
const savePreference = tool(
  async ({ preference }, config) => {
    const userId = config.context.user_id;
    await config.store.put(["user_prefs"], userId, { preference });
    return "偏好已保存";
  },
  {
    name: "save_preference",
    description: "保存用户的购物偏好",
    schema: z.object({
      preference: z.string().describe("用户的偏好，如颜色、风格等"),
    }),
  }
);
```

**使用效果：**

```
用户: 我的订单 ORD-789 到哪了？另外帮我记住我喜欢蓝色的东西

AI 内心OS: 这个问题需要两个工具
  1. get_order_status({ orderId: "ORD-789" })
  2. save_preference({ preference: "蓝色" })

AI 回复: 您的订单 ORD-789 目前已到达北京分拨中心，预计明天送达。
         另外我已经记住您喜欢蓝色啦，下次推荐商品时会优先考虑~
```

---

## 总结对比表

| 概念 | 一句话总结 | 使用场景 |
|------|-----------|----------|
| **tool()** | 定义工具的工厂函数 | 创建任何自定义工具 |
| **Zod Schema** | 参数的类型合同 | 确保 AI 传参正确 |
| **Context** | 只读的运行时配置 | 用户ID、权限、Session |
| **Store** | 跨对话的持久化存储 | 用户偏好、历史记录 |
| **Writer** | 实时进度流 | 长耗时操作的进度反馈 |
| **ToolNode** | 工具执行的调度器 | LangGraph 工作流中统一管理工具 |
| **toolsCondition** | 路由判断器 | 决定是否执行工具 |

---

希望这份解读能帮你真正理解 LangChain Tools 的精髓！核心就一句话：**Tool 是 AI 的"手脚"，让它从"只会说"变成"真能干"。**
