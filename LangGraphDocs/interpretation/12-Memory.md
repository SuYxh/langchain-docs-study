# LangGraph Memory 机制深度解读

> 文档来源: [12-Memory.md](file:///Users/bytedance/Desktop/langchain-ts-docs/LangGraphDocs/en/12-Memory.md)

---

## 1. 一句话省流 (The Essence)

**Memory 就是给 AI 装个"脑子"，让它不再是只金鱼——能记住之前聊了什么，甚至能跨会话记住用户的偏好和信息。**

LangGraph 把记忆分成两种:
- **短期记忆 (Short-term Memory)**: 单次对话内的"工作记忆"
- **长期记忆 (Long-term Memory)**: 跨对话、跨会话的"永久档案"

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点: AI 是个"失忆患者"

想象一下这个尴尬场景:

```
用户: 你好，我叫小明
AI: 你好小明!很高兴认识你!

用户: 我喜欢吃川菜
AI: 川菜确实很棒，麻辣鲜香!

用户: 你还记得我叫什么吗?
AI: 抱歉，我不知道你叫什么...... (尴尬)
```

**为什么会这样?**

默认情况下，大语言模型是**无状态的**。每次调用都像是一次全新的对话，AI 完全不记得之前发生了什么。这就好比你每天上班见到同事，他都问你:"你是谁？"——简直社死现场!

### 更深层的痛点

| 痛点 | 具体表现 |
|------|----------|
| **对话断裂** | 多轮对话中，AI 无法关联上下文 |
| **上下文爆炸** | 聊天记录太长，超过 LLM 的 token 限制 |
| **用户体验差** | 每次都要重新介绍自己，重复解释需求 |
| **个性化缺失** | 无法记住用户的偏好、习惯、历史行为 |

### 解决方案: 两种记忆机制

| 记忆类型 | 作用 | 存储位置 | 生命周期 |
|----------|------|----------|----------|
| **短期记忆 (Checkpointer)** | 保存对话历史 | 内存/数据库 | 单个对话线程 |
| **长期记忆 (Store)** | 保存用户画像、偏好 | 数据库 | 跨所有会话 |

---

## 3. 生活化类比: 酒店前台与 CRM 系统

让我用一个**酒店服务**的类比来解释这两种记忆:

### 短期记忆 = 前台的便签本

想象你入住一家酒店:

```
你: 我是张先生，订了1008房间
前台: 好的张先生，这是您的房卡

你: 我想要一个加枕头
前台: (在便签本上记下) 好的，马上给您送去

你: 对了，刚才那个枕头要软的
前台: (看了眼便签本) 好的，软枕头，没问题!
```

**便签本 (Checkpointer)** 记录的是**这次入住期间**的所有请求。一旦你退房 (对话结束)，便签本就可以撕掉了。

在代码中，`thread_id` 就是你的**房间号**——同一个 thread_id 下的所有对话都会被关联起来。

### 长期记忆 = 酒店的 VIP 会员系统

假设你是这家酒店的常客:

```
你: (第二次入住) 我是张先生
前台: (查系统) 张先生您好!欢迎再次光临!
      我看到您上次住的时候喜欢高楼层，需要软枕头，
      早餐偏好中式。这次还是同样的安排吗?
```

**VIP 系统 (Store)** 记录的是**用户的长期偏好**，不会因为一次入住结束就消失。下次来还能读取!

### 类比映射表

| LangGraph 概念 | 酒店类比 | 说明 |
|----------------|----------|------|
| `Checkpointer` | 前台便签本 | 记录单次对话的历史 |
| `Store` | VIP 会员系统 | 存储用户长期偏好 |
| `thread_id` | 房间号 | 标识一次对话 |
| `userId` | 会员卡号 | 标识一个用户 |
| `namespace` | 信息分类文件夹 | 组织存储的数据 |
| `MemorySaver` | 临时便签本 | 开发测试用 |
| `PostgresSaver` | 正式档案系统 | 生产环境用 |

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 Checkpointer (检查点保存器)

**大白话**: 就是帮你自动保存游戏进度的机制。

每次 AI 处理完一轮对话，Checkpointer 就会把当前的"状态快照"存下来。下次继续对话时，能从这个快照恢复。

```typescript
const checkpointer = new MemorySaver();  // 开发用，存内存里
const graph = builder.compile({ checkpointer });
```

生产环境要换成数据库版本:
```typescript
const checkpointer = PostgresSaver.fromConnString(DB_URI);  // 生产用，存数据库
```

### 4.2 Store (存储器)

**大白话**: 就是用户的"永久档案库"。

Store 用来存放那些需要**长期保留**的信息，比如:
- 用户说"我叫小明" → 存下来
- 用户说"我喜欢深色模式" → 存下来
- 用户的购买历史、偏好设置等

```typescript
const store = new InMemoryStore();  // 开发用
// 或
const store = PostgresStore.fromConnString(DB_URI);  // 生产用
```

### 4.3 thread_id (线程ID)

**大白话**: 就是"聊天房间号"。

同一个 `thread_id` 下的所有消息都属于同一个对话。换一个 `thread_id`，就是开启新对话。

```typescript
await graph.invoke(
  { messages: [...] },
  { configurable: { thread_id: "conversation_001" } }  // 房间号
);
```

### 4.4 namespace (命名空间)

**大白话**: 就是档案的"文件夹路径"。

在 Store 中存取数据时，用 namespace 来组织数据:

```typescript
const namespace = ["user_123", "memories"];  // 文件夹路径: user_123/memories
await store.put(namespace, "key1", { data: "用户喜欢深色模式" });
```

### 4.5 Semantic Search (语义搜索)

**大白话**: 不是死板地搜关键词，而是搜"意思相近"的内容。

比如存了"我爱吃披萨"，搜索"我饿了"也能找到这条记录——因为语义上相关!

```typescript
const store = new InMemoryStore({
  index: {
    embeddings,  // 把文本转成向量
    dims: 1536,
  }
});
```

---

## 5. 代码逻辑拆解 (Code Walkthrough)

### 5.1 基础短期记忆设置

```typescript
import { MemorySaver, StateGraph } from "@langchain/langgraph";

// 1. 创建一个"便签本"
const checkpointer = new MemorySaver();

// 2. 构建你的工作流
const builder = new StateGraph(...);

// 3. 把便签本装到工作流上
const graph = builder.compile({ checkpointer });

// 4. 调用时指定"房间号"
await graph.invoke(
  { messages: [{ role: "user", content: "hi! i am Bob" }] },
  { configurable: { thread_id: "1" } }  // 关键!这是对话的唯一标识
);
```

**这段代码在说什么?**

> "嘿系统，我要开始聊天了。帮我准备个便签本(checkpointer)，我这次聊天的房间号是'1'(thread_id)。之后只要还是房间号'1'，你就要记得之前聊的内容!"

### 5.2 长期记忆 + 读写操作

```typescript
const callModel: GraphNode<typeof State> = async (state, runtime) => {
  // 1. 获取用户ID (从调用参数传入)
  const userId = runtime.context?.userId;
  
  // 2. 定义这个用户的档案文件夹
  const namespace = [userId, "memories"];

  // 3. 搜索相关记忆 (语义搜索!)
  const memories = await runtime.store?.search(namespace, {
    query: state.messages.at(-1)?.content,  // 用用户最新消息搜索
    limit: 3,  // 最多返回3条
  });

  // 4. 存储新记忆
  await runtime.store?.put(namespace, uuidv4(), { 
    data: "User prefers dark mode" 
  });
};
```

**这段代码在说什么?**

> "当用户发消息过来时，我先去档案库(store)里搜搜有没有跟这条消息相关的历史记录。搜到了就带着这些背景信息去回答用户。如果用户告诉了我新的偏好，我就把它存到档案库里。"

### 5.3 消息裁剪 (防止上下文爆炸)

```typescript
const callModel: GraphNode<typeof State> = async (state) => {
  // 裁剪消息，只保留最后 128 个 token
  const messages = trimMessages(state.messages, {
    strategy: "last",      // 保留最新的
    maxTokens: 128,        // 最多128个token
    startOn: "human",      // 从用户消息开始
    endOn: ["human", "tool"],  // 以用户消息或工具消息结束
  });
  
  const response = await model.invoke(messages);
  return { messages: [response] };
};
```

**这段代码在说什么?**

> "对话太长了，LLM 装不下! 我来做个减法——只保留最近的消息(最多128个token)，把太早的消息扔掉。但要注意，裁剪出来的消息列表得是完整的对话结构，不能从 AI 的回复开始。"

### 5.4 消息摘要 (高级版裁剪)

```typescript
const summarizeConversation: GraphNode<typeof State> = async (state) => {
  const summary = state.summary || "";
  
  // 让 AI 生成对话摘要
  let summaryMessage = summary 
    ? `已有摘要: ${summary}\n请扩展摘要，纳入以上新消息:`
    : "请为以上对话创建摘要:";

  const messages = [...state.messages, new HumanMessage({ content: summaryMessage })];
  const response = await model.invoke(messages);

  // 删除旧消息，只保留最近2条 + 摘要
  const deleteMessages = state.messages
    .slice(0, -2)
    .map(m => new RemoveMessage({ id: m.id }));

  return {
    summary: response.content,  // 存储摘要
    messages: deleteMessages    // 删除旧消息
  };
};
```

**这段代码在说什么?**

> "简单裁剪太粗暴了，重要信息可能会丢! 我换个策略——让 AI 先把之前的对话总结成一段摘要，然后把旧消息删掉，只保留摘要+最近2条消息。这样既省空间，又不丢信息!"

---

## 6. 真实场景案例

### 场景: 电商客服助手

假设你在开发一个电商平台的 AI 客服:

**需求分析**:

| 功能需求 | 需要的记忆类型 |
|----------|----------------|
| 用户问完商品问题，接着问物流问题，AI 要能关联上下文 | **短期记忆** |
| 用户之前买过某商品，下次咨询时 AI 主动提及 | **长期记忆** |
| 用户说"上次那个蓝色的"，AI 要知道是指什么 | **短期记忆** |
| VIP 用户享受更热情的服务态度 | **长期记忆** |

**代码实现思路**:

```typescript
import { StateGraph, StateSchema, MessagesValue, MemorySaver, InMemoryStore } from "@langchain/langgraph";

// 1. 定义状态
const State = new StateSchema({
  messages: MessagesValue,
  summary: z.string().optional(),  // 对话摘要
});

// 2. 配置记忆系统
const checkpointer = new PostgresSaver(DB_URI);  // 短期记忆
const store = new PostgresStore(DB_URI);          // 长期记忆

// 3. 客服节点
const customerService: GraphNode<typeof State> = async (state, runtime) => {
  const userId = runtime.context?.userId;
  
  // 读取用户画像
  const userProfile = await runtime.store?.search(
    [userId, "profile"], 
    { query: "user preferences" }
  );
  
  // 读取购买历史
  const purchaseHistory = await runtime.store?.search(
    [userId, "purchases"],
    { query: state.messages.at(-1)?.content }
  );

  // 组装系统提示词
  const systemPrompt = `
    你是电商客服助手。
    用户信息: ${JSON.stringify(userProfile)}
    相关购买记录: ${JSON.stringify(purchaseHistory)}
  `;

  // 调用模型
  const response = await model.invoke([
    { role: "system", content: systemPrompt },
    ...state.messages
  ]);

  return { messages: [response] };
};

// 4. 编译并运行
const graph = builder.compile({ checkpointer, store });
```

**效果对比**:

| 场景 | 无记忆 | 有记忆 |
|------|--------|--------|
| 用户: "我上次买的那个手机壳有问题" | "请问是哪个手机壳?" | "您是说3天前购买的iPhone 15透明手机壳吗?请问遇到了什么问题?" |
| 用户: "换个颜色行吗" | "请问什么颜色?" | "好的，您原本选的是透明款，我们还有黑色、蓝色可选，您想换哪个?" |
| 用户退出后第二天再来 | 完全不记得 | "张先生您好!上次手机壳的问题解决了吗?" |

---

## 7. 最佳实践总结

### 开发 vs 生产环境

| 环境 | 短期记忆 | 长期记忆 |
|------|----------|----------|
| **开发/测试** | `MemorySaver()` | `InMemoryStore()` |
| **生产环境** | `PostgresSaver.fromConnString()` | `PostgresStore.fromConnString()` |

### 记忆管理策略选择

| 策略 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| **trimMessages** | 简单聊天机器人 | 简单直接 | 可能丢失重要信息 |
| **RemoveMessage** | 需要精确控制删除 | 灵活 | 需要手动管理 |
| **Summarize** | 长对话、复杂场景 | 保留关键信息 | 额外调用 LLM，有成本 |

### 常见坑点

1. **别忘了 `thread_id`**: 不传就没法关联上下文!
2. **生产环境必须用数据库**: `MemorySaver` 重启就没了
3. **注意消息格式**: 删除消息后要确保格式合法(比如不能以 AI 消息开头)
4. **首次使用要 `setup()`**: 数据库需要建表

---

## 8. 一图总结

```
┌─────────────────────────────────────────────────────────────┐
│                    LangGraph Memory 架构                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   用户对话                                                   │
│      │                                                       │
│      ▼                                                       │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                   StateGraph                         │   │
│   │  ┌───────────────────────────────────────────────┐  │   │
│   │  │               Node (节点处理)                  │  │   │
│   │  │                    │                          │  │   │
│   │  │     ┌──────────────┴──────────────┐          │  │   │
│   │  │     ▼                             ▼          │  │   │
│   │  │ ┌─────────────┐           ┌─────────────┐    │  │   │
│   │  │ │ Checkpointer│           │   Store     │    │  │   │
│   │  │ │ (短期记忆)   │           │ (长期记忆)  │    │  │   │
│   │  │ │             │           │             │    │  │   │
│   │  │ │ 按 thread_id│           │ 按 namespace│    │  │   │
│   │  │ │ 存储对话历史│           │ 存储用户画像│    │  │   │
│   │  │ └──────┬──────┘           └──────┬──────┘    │  │   │
│   │  │        │                         │           │  │   │
│   │  └────────┼─────────────────────────┼───────────┘  │   │
│   │           │                         │              │   │
│   └───────────┼─────────────────────────┼──────────────┘   │
│               ▼                         ▼                   │
│        ┌─────────────┐           ┌─────────────┐            │
│        │MemorySaver  │           │InMemoryStore│   开发环境  │
│        │(内存存储)    │           │(内存存储)   │            │
│        └─────────────┘           └─────────────┘            │
│               或                        或                   │
│        ┌─────────────┐           ┌─────────────┐            │
│        │PostgresSaver│           │PostgresStore│   生产环境  │
│        │(数据库存储)  │           │(数据库存储) │            │
│        └─────────────┘           └─────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**记住**: Memory 就是让 AI 从"金鱼"变成"老朋友"的关键! 短期记忆让它记住"我们正在聊什么"，长期记忆让它记住"你是谁、你喜欢什么"。两者配合，才能打造出真正智能的对话体验!
