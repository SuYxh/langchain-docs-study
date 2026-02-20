# LangChain Prebuilt Middleware 深度解读

---

## 一句话省流 (The Essence)

**Middleware (中间件) 就是 AI Agent 的"瑞士军刀"——一堆开箱即用的功能插件，让你无需从零编写就能给 Agent 加上"自动摘要"、"人工审核"、"防止跑飞"、"隐私保护"等超能力。**

---

## 核心痛点与解决方案 (The "Why")

### 痛点：没有中间件之前，我们有多惨？

| 痛点场景 | 倒霉事 |
|---------|--------|
| 对话太长 | 上下文超出模型限制，Agent 直接"失忆"或报错 |
| Agent 失控 | 疯狂调用 API，一晚上烧光你的 OpenAI 账户余额 |
| 敏感操作 | Agent 自作主张发了一封骂老板的邮件，你被开除了 |
| 工具调用失败 | 网络抖一下，整个流程就崩了，没有重试机制 |
| 隐私泄露 | 用户的身份证号、银行卡号被 Agent 明文记录到日志里 |
| 工具太多 | 给 Agent 配了 50 个工具，结果它每次都挑错的用 |

### 解决：中间件的"一键加 Buff"方案

LangChain 预置了 **13+ 种中间件**，每一种解决一个特定痛点：

| 中间件 | 解决的问题 |
|--------|-----------|
| `summarizationMiddleware` | 对话太长？自动压缩历史，保留精华 |
| `humanInTheLoopMiddleware` | 敏感操作？暂停等人工批准 |
| `modelCallLimitMiddleware` | 怕烧钱？限制模型调用次数 |
| `toolCallLimitMiddleware` | 工具调用也限制，防止无限循环 |
| `modelFallbackMiddleware` | OpenAI 挂了？自动切换到 Claude |
| `piiMiddleware` | 隐私数据自动打码/脱敏 |
| `toolRetryMiddleware` | 工具失败？指数退避自动重试 |
| `llmToolSelectorMiddleware` | 工具太多？让 LLM 先帮你筛选 |

---

## 生活化类比 (The Analogy)

### 中间件 = 高级餐厅的"服务流程系统"

想象你开了一家米其林三星餐厅，你的 **Agent 是主厨**，**Tools 是各种厨具和食材**，**用户的消息是客人的点单**。

| 中间件 | 餐厅类比 |
|--------|---------|
| **Summarization** | 客人说了 2 小时的废话，服务员只把重点记给厨房："番茄过敏，要全熟牛排" |
| **Human-in-the-loop** | 客人要吃河豚（有风险），厨师必须先问店长批准 |
| **Model Call Limit** | 规定厨师一晚上最多出 100 道菜，防止累死 |
| **Tool Call Limit** | 烤箱一晚上最多用 20 次，防止烧坏 |
| **Model Fallback** | 主厨病了？副厨顶上，副厨也病了？外卖顶上 |
| **PII Detection** | 客人说"我住在XX路XX号"，服务员记成"[地址已隐藏]" |
| **Tool Retry** | 烤箱第一次没点着？等 1 秒再试，还不行等 2 秒再试 |
| **LLM Tool Selector** | 客人要甜点，服务员只把甜点菜单给厨师看，不给他看烧烤菜单 |
| **To-do List** | 厨师面对 10 桌订单，先列个清单：1.炒菜 2.烤肉 3.摆盘... |
| **Filesystem** | 厨师的小本本，记录客人喜好、常用菜谱 |
| **Subagent** | 主厨太忙？派一个"甜点专精副厨"去做蛋糕 |

---

## 关键概念拆解 (Key Concepts)

### 1. Middleware（中间件）

> **大白话**：就是夹在"用户请求"和"Agent 执行"之间的"拦截器"，可以在执行前/后做一些额外处理。

类似于：网站的"登录验证"中间件——请求来了先检查你有没有登录。

### 2. Trigger（触发条件）

> **大白话**：什么时候启动某个中间件的功能？

比如 `summarizationMiddleware` 的 `trigger: { tokens: 4000 }` 意思是：当对话超过 4000 个 token 时，才开始压缩。

### 3. Exponential Backoff（指数退避）

> **大白话**：重试的"冷静期"越来越长——第一次等 1 秒，第二次等 2 秒，第三次等 4 秒...

为什么要这样？防止"服务器刚恢复就被你重试请求打死"的惨剧。

### 4. Checkpointer（检查点/存档器）

> **大白话**：给 Agent 的"存档系统"，让它记住之前发生了什么。

就像游戏的存档功能——中断后可以继续。Human-in-the-loop 暂停后能恢复，就靠它。

### 5. PII (Personally Identifiable Information)

> **大白话**：能让别人认出你是谁的信息——身份证号、手机号、邮箱、银行卡号等。

---

## 代码"人话"解读 (Code Walkthrough)

### 示例 1：自动摘要中间件

```typescript
const agent = createAgent({
  model: "gpt-4.1",
  tools: [weatherTool, calculatorTool],
  middleware: [
    summarizationMiddleware({
      model: "gpt-4.1-mini",        // 用便宜的小模型来做摘要
      trigger: { tokens: 4000 },    // 对话超过 4000 token 就触发
      keep: { messages: 20 },       // 保留最近 20 条消息不压缩
    }),
  ],
});
```

**人话翻译**：
> "嘿 Agent，你用 GPT-4.1 干活。但如果对话太长（超过 4000 token），就让 GPT-4.1-mini 这个便宜小弟帮忙把老消息总结成一段摘要，但最近 20 条消息别动，那些可能还有用。"

---

### 示例 2：人工审核中间件

```typescript
const agent = createAgent({
  model: "gpt-4.1",
  tools: [readEmailTool, sendEmailTool],
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        sendEmailTool: {
          allowedDecisions: ["approve", "edit", "reject"],
        },
        readEmailTool: false,  // 读邮件不用审核
      }
    })
  ]
});
```

**人话翻译**：
> "Agent 可以随便读邮件，但要发邮件？先暂停！等人类老板看一眼，老板可以说'发吧'、'改一下再发'或者'别发了'。"

---

### 示例 3：工具重试中间件

```typescript
const agent = createAgent({
  model: "gpt-4.1",
  tools: [searchTool, databaseTool],
  middleware: [
    toolRetryMiddleware({
      maxRetries: 3,           // 最多重试 3 次
      backoffFactor: 2.0,      // 每次等待时间翻倍
      initialDelayMs: 1000,    // 第一次等 1 秒
    }),
  ],
});
```

**人话翻译**：
> "工具调用失败了？别慌，等 1 秒再试一次。还失败？等 2 秒再试。还失败？等 4 秒再试。3 次都失败？那就放弃吧..."

**等待时间计算**：
- 第 1 次重试：1000ms (1 秒)
- 第 2 次重试：1000 × 2 = 2000ms (2 秒)
- 第 3 次重试：1000 × 4 = 4000ms (4 秒)

---

### 示例 4：PII 隐私保护中间件

```typescript
const agent = createAgent({
  model: "gpt-4.1",
  tools: [],
  middleware: [
    piiMiddleware("email", { strategy: "redact", applyToInput: true }),
    piiMiddleware("credit_card", { strategy: "mask", applyToInput: true }),
  ],
});
```

**人话翻译**：
> "用户发来的消息里如果有邮箱，替换成 `[REDACTED_EMAIL]`；如果有信用卡号，替换成 `****-****-****-1234` 这种格式。这样日志里就不会有敏感信息了。"

**四种处理策略**：
| 策略 | 效果 | 示例 |
|------|------|------|
| `block` | 直接报错，拒绝处理 | 抛出异常 |
| `redact` | 完全删除，替换占位符 | `john@test.com` -> `[REDACTED_EMAIL]` |
| `mask` | 部分遮挡 | `4111111111111234` -> `****-****-****-1234` |
| `hash` | 哈希替换 | `john@test.com` -> `<email_hash:a1b2c3d4>` |

---

### 示例 5：模型降级中间件

```typescript
const agent = createAgent({
  model: "gpt-4.1",
  tools: [],
  middleware: [
    modelFallbackMiddleware(
      "gpt-4.1-mini",              // 第一备选
      "claude-3-5-sonnet-20241022" // 第二备选
    ),
  ],
});
```

**人话翻译**：
> "主力用 GPT-4.1。如果 OpenAI 挂了，自动切换到 GPT-4.1-mini。如果 OpenAI 整个都挂了，自动切换到 Claude。永不宕机！"

---

### 示例 6：LLM 工具选择器中间件

```typescript
const agent = createAgent({
  model: "gpt-4.1",
  tools: [tool1, tool2, tool3, tool4, tool5, /* ...50 个工具 */],
  middleware: [
    llmToolSelectorMiddleware({
      model: "gpt-4.1-mini",    // 用小模型来筛选
      maxTools: 3,              // 最多选 3 个工具
      alwaysInclude: ["search"], // search 工具永远带着
    }),
  ],
});
```

**人话翻译**：
> "我给 Agent 配了 50 个工具，但每次用户问问题时，先让 GPT-4.1-mini 看看用户想干嘛，挑出最相关的 3 个工具给主 Agent 用。`search` 工具是万能的，每次都带上。"

**为什么需要这个？**
- 工具太多会导致 Token 消耗大
- 模型可能"挑花眼"选错工具
- 筛选后更精准、更省钱

---

### 示例 7：子 Agent 中间件

```typescript
const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  middleware: [
    createSubAgentMiddleware({
      defaultModel: "claude-sonnet-4-5-20250929",
      subagents: [
        {
          name: "weather",
          description: "这个子 Agent 专门查天气",
          systemPrompt: "用 get_weather 工具查天气",
          tools: [getWeather],
          model: "gpt-4.1",  // 子 Agent 可以用不同的模型
        },
      ],
    }),
  ],
});
```

**人话翻译**：
> "主 Agent 是 Claude 大总管。遇到查天气的事，派一个'天气专员'子 Agent 去干。子 Agent 用 GPT-4.1，干完活汇报结果，主 Agent 的上下文不会被天气查询的中间过程污染。"

**核心价值**：**上下文隔离**——子 Agent 的工具调用细节不会塞满主 Agent 的脑子。

---

## 真实应用场景 (Real-world Scenario)

### 场景：开发一个企业级客服 AI Agent

假设你在开发一个银行的智能客服系统，需要：

1. **对话可能很长**（客户唠叨半天）
2. **涉及敏感操作**（转账、改密码）
3. **要合规**（不能泄露客户隐私）
4. **服务稳定**（API 偶尔抖动不能崩）
5. **成本可控**（不能让 Agent 疯狂调用付费接口）

#### 解决方案：中间件组合拳

```typescript
import { 
  createAgent, 
  summarizationMiddleware,
  humanInTheLoopMiddleware,
  piiMiddleware,
  toolRetryMiddleware,
  modelCallLimitMiddleware,
  toolCallLimitMiddleware,
  modelFallbackMiddleware,
} from "langchain";

const bankingAgent = createAgent({
  model: "gpt-4.1",
  tools: [
    queryBalanceTool,      // 查余额
    transferMoneyTool,     // 转账
    changePasswordTool,    // 改密码
    searchFAQTool,         // 搜索 FAQ
  ],
  middleware: [
    // 1. 隐私保护 - 银行卡号、身份证号自动脱敏
    piiMiddleware("credit_card", { strategy: "mask", applyToInput: true }),
    piiMiddleware("ssn", { strategy: "redact", applyToInput: true }),
    
    // 2. 敏感操作人工审核 - 转账和改密码必须人工批准
    humanInTheLoopMiddleware({
      interruptOn: {
        transferMoneyTool: { allowedDecisions: ["approve", "reject"] },
        changePasswordTool: { allowedDecisions: ["approve", "reject"] },
      }
    }),
    
    // 3. 长对话自动摘要 - 超过 8000 token 就压缩
    summarizationMiddleware({
      model: "gpt-4.1-mini",
      trigger: { tokens: 8000 },
      keep: { messages: 10 },
    }),
    
    // 4. 工具重试 - 网络抖动自动重试
    toolRetryMiddleware({
      maxRetries: 3,
      backoffFactor: 2.0,
      initialDelayMs: 500,
    }),
    
    // 5. 成本控制 - 每个对话最多调用 50 次模型
    modelCallLimitMiddleware({
      threadLimit: 50,
      exitBehavior: "end",
    }),
    
    // 6. 工具调用限制 - 搜索工具每轮最多用 5 次
    toolCallLimitMiddleware({
      toolName: "searchFAQ",
      runLimit: 5,
    }),
    
    // 7. 高可用 - OpenAI 挂了切 Claude
    modelFallbackMiddleware("claude-3-5-sonnet-20241022"),
  ],
});
```

#### 效果提升

| 维度 | 没用中间件 | 用了中间件 |
|------|-----------|-----------|
| **隐私合规** | 客户银行卡号明文存日志，等着被罚款 | 自动脱敏，合规无忧 |
| **风险控制** | Agent 可能自动给骗子转钱 | 敏感操作必须人工点头 |
| **稳定性** | 网络抖一下就崩 | 自动重试 + 模型降级，永不宕机 |
| **成本** | 一个客户能聊出 $100 的账单 | 50 次调用封顶，成本可控 |
| **体验** | 对话太长模型变傻 | 自动摘要，始终保持聪明 |

---

## 中间件速查表

| 中间件 | 一句话说明 | 典型参数 |
|--------|-----------|---------|
| `summarizationMiddleware` | 对话太长自动压缩 | `trigger`, `keep`, `model` |
| `humanInTheLoopMiddleware` | 敏感操作暂停等人工审批 | `interruptOn` |
| `modelCallLimitMiddleware` | 限制模型调用次数防烧钱 | `threadLimit`, `runLimit` |
| `toolCallLimitMiddleware` | 限制工具调用次数 | `toolName`, `threadLimit`, `runLimit` |
| `modelFallbackMiddleware` | 主模型挂了自动切备用 | 备用模型列表 |
| `piiMiddleware` | 隐私数据自动脱敏 | `strategy`, `detector` |
| `todoListMiddleware` | 给 Agent 任务管理能力 | 无需配置 |
| `llmToolSelectorMiddleware` | LLM 帮你筛选相关工具 | `maxTools`, `alwaysInclude` |
| `toolRetryMiddleware` | 工具失败自动重试 | `maxRetries`, `backoffFactor` |
| `modelRetryMiddleware` | 模型调用失败自动重试 | `maxRetries`, `backoffFactor` |
| `toolEmulatorMiddleware` | 用 LLM 模拟工具执行（测试用） | `tools`, `model` |
| `contextEditingMiddleware` | 清理老旧工具输出节省 Token | `triggerTokens`, `keep` |
| `createFilesystemMiddleware` | 给 Agent 文件系统存储 | `backend` |
| `createSubAgentMiddleware` | 派子 Agent 干活 | `subagents` |

---

## 小贴士

1. **中间件顺序有讲究**：PII 检测应该放前面（先脱敏再处理），重试类的放后面。

2. **组合使用更强大**：一个 Agent 可以同时用多个中间件，它们会按顺序叠加生效。

3. **checkpointer 是刚需**：如果你用了 `humanInTheLoopMiddleware` 或者需要跨会话记住调用次数，必须配置 checkpointer。

4. **测试时用 toolEmulatorMiddleware**：开发阶段不想真的调用外部 API？用模拟器中间件，LLM 帮你编造合理的返回值。

5. **Deep Agents 中间件更强**：`createFilesystemMiddleware` 和 `createSubAgentMiddleware` 来自 Deep Agents 包，适合更复杂的场景。

---

> **总结**：Middleware 就是 LangChain 的"插件商店"，让你用几行代码就能给 Agent 加上企业级的稳定性、安全性和成本控制能力。别再自己造轮子了，直接用！
