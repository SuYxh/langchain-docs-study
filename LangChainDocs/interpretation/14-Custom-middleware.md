# Custom Middleware (自定义中间件) 深度解读

## 一句话省流

**中间件就是你在 AI Agent 执行流程中安插的"监听器+控制器"，让你可以在 AI 思考前、思考后、调用工具前后等关键节点，插入自己的逻辑（比如日志、重试、拦截、限流等），而不用动 Agent 的核心代码。**

---

## 核心痛点与解决方案

### 痛点：没有中间件之前的倒霉事

1. **日志散落各处**：想记录 AI 每次调用模型的情况？只能在业务代码里到处 `console.log`，代码乱成一锅粥。

2. **重试逻辑重复写**：调用 OpenAI 偶尔会超时，你得在每个调用点都写一遍 try-catch + 重试，简直是复制粘贴地狱。

3. **横切关注点难以统一管理**：比如限流、权限校验、用量统计……这些需求散落在各处，改起来牵一发动全身。

4. **想动态修改行为太难**：想根据对话长度自动切换模型？想在敏感词出现时直接拦截？只能硬编码在业务逻辑里，耦合度爆表。

### 解决方案：中间件的魔法

中间件让你可以：
- 在 **固定的执行节点** 插入自定义逻辑（如：模型调用前/后）
- **包裹** 模型或工具的调用，实现重试、缓存、熔断等高级控制
- 通过 **自定义状态** 跨多次调用追踪数据
- 通过 **上下文** 传递请求级别的元数据（用户ID、租户信息等）

核心思想：**"关注点分离"** —— 把日志、重试、限流等逻辑从业务代码中抽离出来，统一管理。

---

## 生活化类比：机场安检流程

把 AI Agent 想象成一架从出发到降落的航班，中间件就是 **机场安检和服务流程**：

| 技术概念 | 类比 |
|---------|------|
| **Agent** | 整架航班（从登机到降落的完整旅程） |
| **Model 调用** | 飞机起飞、巡航、降落等核心动作 |
| **beforeModel Hook** | 起飞前的安检：检查乘客证件、行李，有问题就不让登机 |
| **afterModel Hook** | 降落后的行李提取：记录飞行数据，统计乘客数量 |
| **wrapModelCall** | VIP 通道服务员：可以决定让你快速通过（缓存），让你排队等候（限流），甚至带你走三次安检（重试） |
| **jumpTo: "end"** | 发现违禁品，直接终止登机，航班取消 |
| **State (状态)** | 航班的"飞行记录本"，记录已起飞次数、油耗等，整个旅程共享 |
| **Context (上下文)** | 乘客的登机牌信息（姓名、座位号），只读，不能改 |

**关键洞察**：
- **Node-style hooks**（节点钩子）= 安检站，飞机起飞前、降落后各执行一次
- **Wrap-style hooks**（包裹钩子）= VIP 通道服务员，可以控制你过几次安检，甚至直接放行

---

## 关键概念拆解

### 1. Node-style Hooks（节点式钩子）

**大白话**：在 Agent 执行的"关键路口"埋伏的观察员，按顺序执行。

- `beforeAgent`：Agent 启动前（整个对话只执行一次）
- `beforeModel`：每次调用模型前
- `afterModel`：每次模型返回后
- `afterAgent`：Agent 完成后（整个对话只执行一次）

**适用场景**：日志记录、参数校验、状态更新

### 2. Wrap-style Hooks（包裹式钩子）

**大白话**：把模型/工具调用"包起来"，你来决定什么时候执行、执行几次。

- `wrapModelCall`：包裹模型调用
- `wrapToolCall`：包裹工具调用

**适用场景**：重试、缓存、熔断、动态修改请求

### 3. State Schema（状态模式）

**大白话**：中间件自己的"小账本"，可以在整个 Agent 执行过程中记录和传递数据。

- 以 `_` 开头的字段是私有的，不会返回给调用者
- 其他字段是公开的，会出现在最终结果里

### 4. Context Schema（上下文模式）

**大白话**：调用时传入的"只读配置"，比如用户ID、租户信息，中间件可以读取但不能修改。

### 5. jumpTo（跳转控制）

**大白话**：紧急刹车或换道行驶。

- `"end"`：直接结束 Agent
- `"tools"`：跳转到工具节点
- `"model"`：跳转到模型节点

---

## 代码"人话"解读

### 示例 1：消息数量限制中间件

```typescript
const createMessageLimitMiddleware = (maxMessages: number = 50) => {
  return createMiddleware({
    name: "MessageLimitMiddleware",
    beforeModel: {
      canJumpTo: ["end"],  // 声明：我可能会直接跳到结束
      hook: (state) => {
        // 如果消息数量到达上限
        if (state.messages.length === maxMessages) {
          return {
            messages: [new AIMessage("Conversation limit reached.")],
            jumpTo: "end",  // 直接结束对话
          };
        }
        return;  // 否则正常继续
      }
    },
    afterModel: (state) => {
      // 模型返回后，打印最后一条消息
      const lastMessage = state.messages[state.messages.length - 1];
      console.log(`Model returned: ${lastMessage.content}`);
      return;
    },
  });
};
```

**人话解读**：
> "在每次调用模型之前，先检查对话是不是已经太长了。如果达到 50 条消息，就直接告诉用户'对话超限了'，然后结束对话。否则正常执行，模型返回后顺便打个日志。"

### 示例 2：重试中间件

```typescript
const createRetryMiddleware = (maxRetries: number = 3) => {
  return createMiddleware({
    name: "RetryMiddleware",
    wrapModelCall: (request, handler) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return handler(request);  // 尝试调用模型
        } catch (e) {
          if (attempt === maxRetries - 1) {
            throw e;  // 最后一次还失败，就抛出错误
          }
          console.log(`Retry ${attempt + 1}/${maxRetries} after error: ${e}`);
        }
      }
      throw new Error("Unreachable");
    },
  });
};
```

**人话解读**：
> "把模型调用包起来。如果调用失败了，不要立刻放弃，最多重试 3 次。只有 3 次都失败了，才真正报错。"

### 示例 3：自定义状态 —— 调用计数器

```typescript
const CustomState = new StateSchema({
  modelCallCount: z.number().default(0),  // 模型调用次数，默认 0
  userId: z.string().optional(),           // 用户ID，可选
});

const callCounterMiddleware = createMiddleware({
  name: "CallCounterMiddleware",
  stateSchema: CustomState,
  beforeModel: {
    canJumpTo: ["end"],
    hook: (state) => {
      if (state.modelCallCount > 10) {
        return { jumpTo: "end" };  // 超过 10 次调用就强制结束
      }
      return;
    },
  },
  afterModel: (state) => {
    return { modelCallCount: state.modelCallCount + 1 };  // 每次调用后计数+1
  },
});
```

**人话解读**：
> "我要记录模型被调用了多少次。每次调用前检查，超过 10 次就不让它继续了。每次调用后，计数器加 1。"

### 示例 4：动态模型选择

```typescript
const dynamicModelMiddleware = createMiddleware({
  name: "DynamicModelMiddleware",
  wrapModelCall: (request, handler) => {
    const modifiedRequest = { ...request };
    if (request.messages.length > 10) {
      // 对话超过 10 条，用更强的模型
      modifiedRequest.model = initChatModel("gpt-4.1");
    } else {
      // 对话较短，用便宜的模型
      modifiedRequest.model = initChatModel("gpt-4.1-mini");
    }
    return handler(modifiedRequest);
  },
});
```

**人话解读**：
> "根据对话长度自动选模型：对话短就用便宜的 mini 版，对话长了上下文复杂，就切换到更强的 gpt-4.1。省钱又保质量！"

### 示例 5：内容拦截中间件

```typescript
createMiddleware({
  name: "BlockedContentMiddleware",
  beforeModel: {
    canJumpTo: ["end"],
    hook: (state) => {
      if (state.messages.at(-1)?.content.includes("BLOCKED")) {
        return {
          messages: [new AIMessage("I cannot respond to that request.")],
          jumpTo: "end" as const,
        };
      }
      return;
    },
  },
})
```

**人话解读**：
> "在调用模型之前，先检查用户的最后一条消息。如果包含敏感词'BLOCKED'，就直接拒绝回答并结束对话，根本不让请求到达模型。"

---

## 中间件执行顺序详解

假设你配置了三个中间件：`[middleware1, middleware2, middleware3]`

```
                    执行顺序图
                    
     before_* 钩子：正序执行
     ┌──────────────────────────────────┐
     │  1. middleware1.beforeAgent()    │
     │  2. middleware2.beforeAgent()    │
     │  3. middleware3.beforeAgent()    │
     └──────────────────────────────────┘
                    ↓
     ┌──────────────────────────────────┐
     │  4. middleware1.beforeModel()    │
     │  5. middleware2.beforeModel()    │
     │  6. middleware3.beforeModel()    │
     └──────────────────────────────────┘
                    ↓
     wrap_* 钩子：嵌套执行（像洋葱）
     ┌──────────────────────────────────────────────┐
     │  middleware1.wrapModelCall(                  │
     │    middleware2.wrapModelCall(                │
     │      middleware3.wrapModelCall(              │
     │        → 真正的模型调用 ←                    │
     │      )                                       │
     │    )                                         │
     │  )                                           │
     └──────────────────────────────────────────────┘
                    ↓
     after_* 钩子：倒序执行
     ┌──────────────────────────────────┐
     │  7. middleware3.afterModel()     │
     │  8. middleware2.afterModel()     │
     │  9. middleware1.afterModel()     │
     └──────────────────────────────────┘
                    ↓
     ┌──────────────────────────────────┐
     │ 10. middleware3.afterAgent()     │
     │ 11. middleware2.afterAgent()     │
     │ 12. middleware1.afterAgent()     │
     └──────────────────────────────────┘
```

**记忆口诀**：
- **before** 钩子：先来后到（1, 2, 3）
- **after** 钩子：后来先走（3, 2, 1）
- **wrap** 钩子：洋葱模型（外层包内层）

---

## 真实应用场景

### 场景 1：电商客服机器人 —— 用量控制 + 成本优化

**需求**：
- 限制每个用户每天最多 100 次对话
- 简单问题用便宜模型，复杂问题用贵模型
- 记录每次调用的 token 消耗

**中间件方案**：

```typescript
// 中间件 1：用户限流
const rateLimitMiddleware = createMiddleware({
  name: "RateLimitMiddleware",
  stateSchema: new StateSchema({ callCount: z.number().default(0) }),
  beforeModel: {
    canJumpTo: ["end"],
    hook: async (state) => {
      const todayCount = await redis.get(`user:${state.userId}:count`);
      if (todayCount > 100) {
        return {
          messages: [new AIMessage("今日对话次数已用完，请明天再来~")],
          jumpTo: "end",
        };
      }
      return;
    },
  },
});

// 中间件 2：动态模型选择
const smartModelMiddleware = createMiddleware({
  name: "SmartModelMiddleware",
  wrapModelCall: (request, handler) => {
    const complexity = analyzeComplexity(request.messages);
    const model = complexity > 0.7 ? "gpt-4.1" : "gpt-4.1-mini";
    return handler({ ...request, model: initChatModel(model) });
  },
});

// 中间件 3：用量统计
const usageTrackingMiddleware = createMiddleware({
  name: "UsageTrackingMiddleware",
  afterModel: async (state) => {
    await analytics.track({
      userId: state.userId,
      tokens: state.lastResponse.usage.totalTokens,
      model: state.lastResponse.model,
    });
    return;
  },
});

const agent = createAgent({
  model: "gpt-4.1",
  middleware: [rateLimitMiddleware, smartModelMiddleware, usageTrackingMiddleware],
  tools: [searchProducts, checkOrder, contactSupport],
});
```

**效果**：
- 用户超限自动拦截
- 80% 的简单问题用便宜模型，节省 60% 成本
- 所有调用自动记录，方便分析和计费

### 场景 2：企业内部知识助手 —— 权限控制 + 审计日志

**需求**：
- 不同部门员工只能访问自己部门的工具
- 所有对话要记录审计日志
- 敏感信息自动脱敏

**中间件方案**：

```typescript
// 中间件 1：基于部门的工具过滤
const permissionMiddleware = createMiddleware({
  name: "PermissionMiddleware",
  contextSchema: z.object({
    userId: z.string(),
    department: z.string(),
    role: z.enum(["employee", "manager", "admin"]),
  }),
  wrapModelCall: (request, handler) => {
    const { department, role } = request.runtime.context;
    const allowedTools = filterToolsByPermission(request.tools, department, role);
    return handler({ ...request, tools: allowedTools });
  },
});

// 中间件 2：审计日志
const auditMiddleware = createMiddleware({
  name: "AuditMiddleware",
  beforeAgent: (state) => {
    auditLog.start({ sessionId: state.sessionId, userId: state.userId });
    return;
  },
  afterAgent: (state) => {
    auditLog.complete({
      sessionId: state.sessionId,
      messages: state.messages,
      toolCalls: state.toolCalls,
    });
    return;
  },
});

// 中间件 3：敏感信息脱敏
const sanitizeMiddleware = createMiddleware({
  name: "SanitizeMiddleware",
  afterModel: (state) => {
    const lastMessage = state.messages.at(-1);
    if (lastMessage) {
      lastMessage.content = sanitizePII(lastMessage.content);
    }
    return { messages: state.messages };
  },
});
```

**效果**：
- 财务部员工看不到人事工具，人事部员工看不到财务工具
- 所有对话自动记录，满足合规要求
- 模型返回的内容自动脱敏，防止信息泄露

---

## Best Practices 最佳实践

1. **单一职责**：每个中间件只做一件事（日志是日志，重试是重试）

2. **错误处理**：中间件里的错误不要让它炸掉整个 Agent，该兜底兜底

3. **选对钩子类型**：
   - 顺序逻辑（日志、校验）→ Node-style
   - 控制流程（重试、缓存）→ Wrap-style

4. **注意执行顺序**：关键中间件放前面，它会最先执行（before）或最后收尾（after）

5. **善用私有状态**：用 `_` 前缀隐藏内部变量，保持返回结果干净

6. **先测试再集成**：中间件单独跑通了，再挂到 Agent 上

---

## 总结

| 你想做的事 | 用什么中间件钩子 |
|-----------|-----------------|
| 记录日志 | `beforeModel` / `afterModel` |
| 参数校验 | `beforeModel` |
| 重试机制 | `wrapModelCall` |
| 缓存响应 | `wrapModelCall` |
| 动态切换模型 | `wrapModelCall` |
| 内容过滤/拦截 | `beforeModel` + `jumpTo: "end"` |
| 工具调用监控 | `wrapToolCall` |
| 动态选择工具 | `wrapModelCall` |
| 用量统计 | `afterModel` |
| 审计日志 | `beforeAgent` / `afterAgent` |

**核心价值**：中间件让你的 Agent 从"能用"变成"好用、可控、可观测、可扩展"。就像给汽车加装了仪表盘、安全气囊和自动驾驶辅助系统 —— 核心引擎不用改，但整车体验大幅提升！
