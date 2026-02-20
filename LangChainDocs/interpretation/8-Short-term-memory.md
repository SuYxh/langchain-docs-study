# LangChain Short-term Memory 深度解读

## 1. 一句话省流 (The Essence)

**短期记忆 = 让 AI 在同一个对话中"记住"你说过什么的能力，就像你跟朋友微信聊天时，他能记住这个聊天窗口里你之前说了什么一样。**

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：没有记忆的 AI 像"金鱼" 

想象一下，你跟客服说：
- 你："我是张三，订单号 12345 有问题"
- AI："好的，我帮您查一下"
- 你："退款到哪了？"
- AI："请问您是哪位？订单号是多少？"

这就是没有记忆的 AI！每次对话都是**从零开始**，完全不记得之前说了什么。更要命的是：

| 问题 | 后果 |
|------|------|
| **上下文超长** | 聊了 100 轮后，聊天记录可能超过模型的"脑容量"（context window），直接报错 |
| **模型变笨** | 即使不报错，模型在处理长文本时会"走神"，被无关信息分散注意力 |
| **成本爆炸** | Token 越多，API 调用费用越高，响应速度越慢 |

### 解决方案：Checkpointer + 线程管理 + 消息裁剪

LangChain 的短期记忆系统提供了三板斧：

```
Checkpointer  ->  存储状态到数据库，随时恢复
Thread ID     ->  区分不同对话，互不干扰
消息管理策略   ->  裁剪/删除/摘要，控制上下文长度
```

---

## 3. 生活化类比 (The Analogy)

### 把 AI Agent 想象成一个"餐厅服务员"

| 技术概念 | 餐厅类比 |
|----------|----------|
| **Thread (线程)** | 一张餐桌的订单记录。3号桌的菜单不会跟5号桌混在一起 |
| **Checkpointer** | 服务员的小本本。点菜、加菜、退菜都记在上面，即使中途换班，新服务员拿起本本也能继续服务 |
| **Messages** | 顾客和服务员之间的对话。"我要一份宫保鸡丁"、"少放辣"、"再来瓶啤酒" |
| **State (状态)** | 这桌顾客的"用餐档案"：几位客人、是否VIP、已点菜品、消费金额 |
| **Trim (裁剪)** | 本本写满了，只保留最近的关键信息："主菜已上，还差两个甜点" |
| **Summarize (摘要)** | 把详细点单压缩成："3号桌，2人套餐+加菜宫保鸡丁，已结账200元" |

**工作流程**：
1. 顾客坐下（thread_id: "table-3"）
2. 服务员记录点菜（checkpointer 保存 messages）
3. 顾客问"我刚才点了什么"，服务员翻小本本（读取 state.messages）
4. 本本快写满了（context window 要超了），服务员只保留最近订单（trim）或者写个摘要（summarize）

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 Checkpointer - "状态存档员"

```typescript
// 开发测试用：存在内存里，程序重启就没了
const checkpointer = new MemorySaver();

// 生产环境用：存在数据库里，持久化
const checkpointer = PostgresSaver.fromConnString(DB_URI);
```

**大白话**：Checkpointer 就是帮你"存档"的家伙。就像打游戏时的存档点，让你随时能读档继续。

### 4.2 Thread ID - "对话房间号"

```typescript
await agent.invoke(
  { messages: [...] },
  { configurable: { thread_id: "session-123" } }  // 指定房间号
);
```

**大白话**：不同用户、不同对话，用不同的 thread_id，状态完全隔离。就像酒店房间号，你的房间不会有别人的行李。

### 4.3 RemoveMessage - "消息橡皮擦"

```typescript
import { RemoveMessage } from "@langchain/core/messages";
import { REMOVE_ALL_MESSAGES } from "@langchain/langgraph";

// 删除特定消息
new RemoveMessage({ id: message.id })

// 删除所有消息（全部清空）
new RemoveMessage({ id: REMOVE_ALL_MESSAGES })
```

**大白话**：当聊天记录太长时，用它来"擦掉"一些旧消息，给新内容腾地方。

### 4.4 Middleware Hooks - "卡口检查站"

| Hook | 触发时机 | 典型用途 |
|------|----------|----------|
| `beforeModel` | 调用模型**之前** | 裁剪消息、注入上下文 |
| `afterModel` | 模型返回**之后** | 删除旧消息、验证回复、生成摘要 |

### 4.5 Command - "状态更新指令"

```typescript
return new Command({
  update: {
    cart: newCart,           // 更新购物车状态
    messages: [ToolMessage]  // 同时更新消息历史
  }
});
```

**大白话**：工具执行完想改状态？用 Command 打包更新，状态和消息一起改。

---

## 5. 代码逻辑详解 (Code Walkthrough)

### 5.1 基础设置 - "开启记忆功能"

```typescript
import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const checkpointer = new MemorySaver();  // 1. 创建存档员

const agent = createAgent({
    model: "claude-sonnet-4-5-20250929",
    tools: [],
    checkpointer,  // 2. 告诉 Agent 用这个存档员
});

await agent.invoke(
    { messages: [{ role: "user", content: "hi! i am Bob" }] },
    { configurable: { thread_id: "1" } }  // 3. 指定房间号
);
```

**逻辑意图**：
1. 创建一个内存存档员（开发用）
2. 把存档员交给 Agent
3. 调用时指定 thread_id，这样后续对话能继续

### 5.2 消息裁剪 - "只保留关键对话"

```typescript
const trimMessages = createMiddleware({
  name: "TrimMessages",
  beforeModel: (state) => {
    const messages = state.messages;
    
    if (messages.length <= 3) {
      return; // 消息少于3条，不用裁剪
    }
    
    // 保留第一条（通常是系统指令）+ 最近几条
    const firstMsg = messages[0];
    const recentMessages = messages.slice(-3);
    
    return {
      messages: [
        new RemoveMessage({ id: REMOVE_ALL_MESSAGES }), // 先清空
        firstMsg,         // 再放回第一条
        ...recentMessages // 再放回最近几条
      ],
    };
  },
});
```

**逻辑意图**：
- 在**调用模型之前**检查消息数量
- 如果太多，只保留"第一条 + 最近几条"
- 这样既保留了系统指令，又有最新上下文

### 5.3 摘要策略 - "压缩历史记忆"

```typescript
const agent = createAgent({
  model: "gpt-4.1",
  middleware: [
    summarizationMiddleware({
      model: "gpt-4.1-mini",  // 用小模型生成摘要（省钱）
      trigger: { tokens: 4000 },  // 超过4000 token 触发摘要
      keep: { messages: 20 },  // 保留最近20条完整消息
    }),
  ],
  checkpointer,
});
```

**逻辑意图**：
- 聊天记录超过 4000 token 时，自动触发摘要
- 用便宜的小模型把旧消息压缩成摘要
- 保留最近 20 条不动，确保上下文连贯

### 5.4 工具读写状态 - "让工具访问记忆"

```typescript
// 读取状态
const getUserInfo = tool(
  async (_, config: ToolRuntime<CustomState>) => {
    // 通过 config.state 访问当前状态
    const userId = config.state.userId;
    const cart = config.state.cart || [];
    return `用户: ${userId}, 购物车: ${cart.length}件商品`;
  },
  { name: "get_user_info", ... }
);

// 写入状态
const addToCart = tool(
  async (input, config: ToolRuntime<CustomState>) => {
    // 通过 Command 更新状态
    return new Command({
      update: {
        cart: [...currentCart, newItem],  // 更新购物车
        messages: [new ToolMessage({ ... })]  // 同时返回消息
      }
    });
  },
  { name: "add_to_cart", ... }
);
```

**逻辑意图**：
- **读取**：通过 `config.state.xxx` 访问任意状态字段
- **写入**：通过返回 `Command({ update: {...} })` 批量更新状态
- `ToolMessage` 是告诉模型"工具执行结果"的方式，**必须返回**！

---

## 6. 真实应用场景 (Real-world Scenario)

### 场景：电商客服机器人

想象你在开发一个电商客服助手，需要处理这样的对话：

```
用户: 我是张三，帮我查下订单
AI: 好的张三，您有3个待处理订单...
用户: 第二个订单想退款
AI: 已为您发起退款申请，订单号 xxx...
[... 聊了50轮 ...]
用户: 我刚才要退款的是哪个订单来着？
AI: 您要退款的是订单号 xxx，商品是...（能记住！）
```

#### 为什么必须用短期记忆？

| 没有记忆 | 有记忆 |
|----------|--------|
| 每次都要重新问用户信息 | 首次确认后自动记住 |
| 聊了50轮后 context 爆了 | 自动摘要/裁剪保持健康 |
| 工具无法访问用户状态 | 工具可读写购物车、订单等 |
| 不同客服窗口混乱 | thread_id 隔离完美 |

#### 实现架构

```typescript
// 1. 定义状态结构
const stateSchema = z.object({
  userId: z.string(),
  currentOrder: z.object({...}).optional(),
  conversationSummary: z.string().optional(),
});

// 2. 配置 Agent
const agent = createAgent({
  model: "gpt-4.1",
  tools: [queryOrder, refund, trackShipping],
  stateSchema,
  middleware: [
    summarizationMiddleware({ trigger: { tokens: 3000 } }),  // 防止 context 爆炸
  ],
  checkpointer: PostgresSaver.fromConnString(DB_URI),  // 生产环境数据库存储
});

// 3. 按用户会话调用
await agent.invoke(
  { messages: [...], userId: "user_zhangsan" },
  { configurable: { thread_id: `session_${sessionId}` } }
);
```

#### 实际收益

| 指标 | 提升 |
|------|------|
| 用户满意度 | 不用重复自我介绍，体验流畅 |
| API 成本 | 摘要后 token 减少 60%+ |
| 系统稳定性 | 不会因 context 超长而崩溃 |
| 开发效率 | 状态管理开箱即用 |

---

## 总结对照表

| 概念 | 是什么 | 解决什么问题 | 类比 |
|------|--------|--------------|------|
| **Short-term Memory** | 同一对话内的记忆 | AI "金鱼脑" | 服务员的小本本 |
| **Checkpointer** | 状态持久化器 | 程序重启/换班后失忆 | 存档点 |
| **Thread ID** | 对话标识符 | 不同用户对话混淆 | 餐桌号/房间号 |
| **Trim** | 消息裁剪 | Context 太长模型变笨 | 只保留最近的点单 |
| **Summarize** | 消息摘要 | 裁剪会丢失重要信息 | 写个简短的账单备注 |
| **Command** | 状态更新指令 | 工具需要修改状态 | 服务员改菜单 |
| **beforeModel/afterModel** | 中间件钩子 | 在特定时机介入处理 | 上菜前/后的检查 |

---

**最后一句话总结**：短期记忆就是给 AI 装了一个"对话回放器 + 笔记本 + 自动清理器"的三件套，让它在单次对话中既能记住关键信息，又不会被信息淹没！
