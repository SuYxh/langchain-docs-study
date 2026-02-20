# LangChain Runtime 深度解读

## 一句话省流 (The Essence)

**Runtime 就是 Agent 运行时的"随身背包"，里面装着用户信息、数据库连接、长期记忆等运行时需要的一切"行李"，让 Agent 在执行任务时随时可以取用。**

---

## 核心痛点与解决方案 (The "Why")

### 痛点：全局变量的噩梦

在没有 Runtime 之前，开发者面临一个经典难题：

- **场景**：你的 AI Agent 需要知道"当前用户是谁"、"要连哪个数据库"、"用户的偏好设置是什么"
- **土方法**：把这些信息存到全局变量里
- **后果**：
  - 多用户并发时数据串台（张三的请求拿到了李四的用户名）
  - 代码测试困难（全局状态到处飞，单元测试写到怀疑人生）
  - 依赖关系混乱（工具函数偷偷依赖某个全局变量，换个环境就挂）

### 解决方案：Runtime 上下文注入

Runtime 提供了一个**优雅的"上下文传递机制"**：

- 每次调用 Agent 时，把该次运行需要的信息**显式打包**传进去
- 工具（Tools）和中间件（Middleware）都能通过 `runtime` 参数**直接访问**这些信息
- 完全无状态（Stateless），每次调用互不干扰

---

## 生活化类比 (The Analogy)

### 想象你是一个外卖骑手

**没有 Runtime 的情况：**
- 你是外卖骑手，接到订单后要去餐厅取餐、送到客户家
- 但问题是：客户地址、联系电话、特殊备注全都写在公司大门口的白板上
- 你要去看白板，其他骑手也要看，写得乱七八糟
- 有时候你刚看完，另一个骑手就把白板擦了改成他的订单...

**有了 Runtime 的情况：**
- 每次接单时，调度系统给你一个**专属的订单袋**（Runtime）
- 袋子里装着：
  - **Context（上下文）**：客户姓名、地址、电话、备注（静态配置信息）
  - **Store（长期记忆）**：这个客户的历史偏好（"这位客户每次都要求放门口"）
  - **Stream Writer（流式写入器）**：你的对讲机，可以实时汇报"已取餐"、"正在路上"

这个订单袋**只属于这一单**，送完即作废，不会和别人的订单混淆！

| Runtime 组件 | 外卖类比 | 实际用途 |
|-------------|---------|---------|
| Context | 订单袋里的订单详情 | 用户ID、配置、DB连接等静态信息 |
| Store | 客户历史订单记录本 | 长期记忆存储，跨会话持久化 |
| Stream Writer | 骑手的对讲机 | 实时向前端推送进度更新 |

---

## 关键概念拆解 (Key Concepts)

### 1. Runtime（运行时）
> Agent 执行一次任务时的**完整运行环境**，包含所有需要的依赖和上下文。

### 2. Context（上下文）
> 静态配置信息的容器。可以放用户ID、数据库连接、API密钥等**这次调用专用**的数据。通过 `contextSchema` 用 Zod 定义结构，TypeScript 会自动推断类型。

### 3. Store（存储/长期记忆）
> 实现 `BaseStore` 接口的存储实例，用于**跨会话的持久化记忆**。比如记住用户的偏好设置，下次聊天还能想起来。

### 4. Stream Writer（流写入器）
> 实时输出通道。当你需要在 Agent 执行过程中**向前端推送自定义更新**时使用，比如"正在搜索..."、"找到 3 条结果"。

### 5. contextSchema（上下文模式）
> 用 Zod 定义的 Context 结构说明书。告诉 Agent："嘿，调用我的时候必须给我这些字段，类型必须对！"

---

## 代码"人话"解读 (Code Walkthrough)

### 代码片段一：定义和使用 Context

```ts
const contextSchema = z.object({
  userName: z.string(),
});

const agent = createAgent({
  model: "gpt-4.1",
  tools: [/* ... */],
  contextSchema,  // 告诉 Agent：我需要一个带 userName 的上下文
});

const result = await agent.invoke(
  { messages: [{ role: "user", content: "What's my name?" }] },
  { context: { userName: "John Smith" } }  // 实际传入上下文数据
);
```

**人话解读：**
1. 先用 Zod 写一份"清单"（`contextSchema`），声明需要 `userName` 这个字段
2. 创建 Agent 时把清单给它，Agent 就知道以后调用时要带这个
3. 真正调用 `invoke` 时，在第二个参数里把 `userName: "John Smith"` 传进去
4. 这样 Agent 内部的工具和中间件都能拿到这个名字了

### 代码片段二：在工具里读取 Runtime

```ts
const fetchUserEmailPreferences = tool(
  async (_, runtime: ToolRuntime<any, typeof contextSchema>) => {
    // 从 runtime 里取出用户名
    const userName = runtime.context?.userName;
    
    // 从 runtime.store（长期记忆）里查询用户偏好
    if (runtime.store) {
      const memory = await runtime.store?.get(["users"], userName);
      if (memory) {
        preferences = memory.value.preferences;
      }
    }
    return preferences;
  },
  { name: "fetch_user_email_preferences", /* ... */ }
);
```

**人话解读：**
1. 工具函数的第二个参数 `runtime` 就是那个"订单袋"
2. `runtime.context?.userName` —— 从袋子里掏出用户名
3. `runtime.store?.get(["users"], userName)` —— 去长期记忆库里查这个用户的历史偏好
4. 这个工具完全**不依赖任何全局变量**，所有信息都从 runtime 来

### 代码片段三：在中间件里动态生成提示词

```ts
const dynamicPromptMiddleware = createMiddleware({
  name: "DynamicPrompt",
  contextSchema,
  beforeModel: (state, runtime) => {
    const userName = runtime.context?.userName;
    
    // 根据用户名动态生成系统提示
    const systemMsg = `You are a helpful assistant. Address the user as ${userName}.`;
    return {
      messages: [new SystemMessage(systemMsg), ...state.messages],
    };
  },
});
```

**人话解读：**
1. `beforeModel` 是在**模型被调用之前**执行的钩子
2. 从 runtime 里取出用户名，动态拼一句"请称呼用户为 xxx"
3. 把这句话包装成 SystemMessage，**塞到消息列表最前面**
4. 这样 AI 就知道该怎么称呼用户了——每个用户都能获得个性化体验！

---

## 真实应用场景 (Real-world Scenario)

### 场景：多租户 SaaS 客服系统

假设你在开发一个**企业级 AI 客服平台**，服务多家公司（租户），每家公司都有自己的：
- 用户数据库
- 产品目录
- 客服话术风格

#### 没有 Runtime 时的噩梦：

```ts
// 反面教材：全局变量地狱
let currentTenantId: string;  // 当前租户ID
let currentUserId: string;    // 当前用户ID
let dbConnection: Database;   // 数据库连接

// 工具函数偷偷依赖全局变量
async function lookupOrder() {
  const orders = await dbConnection.query(
    `SELECT * FROM orders WHERE tenant_id = '${currentTenantId}' AND user_id = '${currentUserId}'`
  );
  // ...
}
```

问题：
- 用户 A 和用户 B 同时发请求，全局变量被覆盖，A 看到了 B 的订单
- 测试时必须先设置一堆全局变量
- 代码耦合度爆表

#### 有了 Runtime 的优雅写法：

```ts
// 定义上下文结构
const contextSchema = z.object({
  tenantId: z.string(),
  userId: z.string(),
  dbConnection: z.custom<Database>(),
});

// 查询订单的工具
const lookupOrderTool = tool(
  async (_, runtime) => {
    const { tenantId, userId, dbConnection } = runtime.context!;
    const orders = await dbConnection.query(
      `SELECT * FROM orders WHERE tenant_id = ? AND user_id = ?`,
      [tenantId, userId]
    );
    return orders;
  },
  { name: "lookup_order", /* ... */ }
);

// 调用时传入该次请求的专属上下文
await agent.invoke(
  { messages: userMessages },
  { 
    context: { 
      tenantId: "company_abc",
      userId: "user_123",
      dbConnection: getDbConnectionForTenant("company_abc")
    } 
  }
);
```

#### 收益：

| 方面 | 改进 |
|-----|-----|
| **并发安全** | 每次调用有独立的 context，不会串台 |
| **可测试性** | 单元测试时直接 mock 一个 context 传进去 |
| **可维护性** | 依赖关系显式声明，一目了然 |
| **多租户支持** | 天然隔离，每个租户的数据库连接独立 |

### 场景进阶：结合长期记忆

```ts
// 在工具里使用 Store 记住用户偏好
const updatePreferenceTool = tool(
  async ({ preference }, runtime) => {
    const { userId } = runtime.context!;
    
    // 把偏好存到长期记忆里
    await runtime.store?.put(
      ["user_preferences"],
      userId,
      { preferredLanguage: preference }
    );
    
    return "偏好已更新！";
  },
  { /* ... */ }
);
```

下次这个用户再来聊天，即使是新会话，Agent 也能从 Store 里取出他之前的偏好设置！

---

## 总结

| 你想做的事 | Runtime 怎么帮你 |
|-----------|-----------------|
| 传递用户信息给工具 | `runtime.context` |
| 跨会话记住用户偏好 | `runtime.store` |
| 实时推送执行进度 | `runtime.streamWriter` |
| 动态修改系统提示词 | 在 middleware 的 `beforeModel` 里用 `runtime.context` |

**一句话总结**：Runtime 让你的 Agent 从"靠全局变量续命的脆弱系统"变成"优雅的无状态、可测试、并发安全的专业架构"。

---

> 原文档：[LangChain Runtime](https://docs.langchain.com/oss/javascript/langchain/runtime)
