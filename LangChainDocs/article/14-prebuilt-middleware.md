# 14. 预置中间件：开箱即用的 Agent 增强能力

## 简单来说

LangChain 提供了一系列开箱即用的中间件，涵盖对话摘要、人工审批、调用限制、故障回退、隐私保护等常见需求。不用重复造轮子，直接用就行。

## 本节目标

学完本节，你将能够：
- 使用摘要中间件处理长对话
- 实现人工审批敏感操作
- 通过调用限制控制成本
- 配置模型回退提高可用性
- 检测和处理隐私信息

## 业务场景

想象这些真实需求：

1. **客服系统**：对话太长超出上下文，需要自动摘要
2. **金融应用**：转账操作必须人工确认
3. **成本控制**：限制每个用户每天的 API 调用量
4. **高可用**：主模型故障时自动切换备用模型
5. **合规要求**：检测并脱敏用户输入中的邮箱、手机号

这些都可以用预置中间件快速实现！

---

## 一、摘要中间件 (Summarization)

### 1.1 基础配置

当对话历史接近 Token 上限时，自动摘要旧消息：

```typescript
import { createAgent, summarizationMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool, calculatorTool],
  middleware: [
    summarizationMiddleware({
      model: "gpt-4o-mini",
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
  ],
});
```

### 1.2 触发条件详解

触发条件支持多种配置方式：

```typescript
summarizationMiddleware({
  model: "gpt-4o-mini",
  trigger: { tokens: 4000, messages: 10 },
  keep: { messages: 20 },
})

summarizationMiddleware({
  model: "gpt-4o-mini",
  trigger: [
    { tokens: 3000, messages: 6 },
  ],
  keep: { messages: 20 },
})

summarizationMiddleware({
  model: "gpt-4o-mini",
  trigger: { fraction: 0.8 },
  keep: { fraction: 0.3 },
})
```

| 参数 | 说明 |
|------|------|
| `trigger.tokens` | Token 数量阈值 |
| `trigger.messages` | 消息数量阈值 |
| `trigger.fraction` | 上下文窗口占比 (0-1) |
| `keep.messages` | 保留最近 N 条消息 |
| `keep.tokens` | 保留最近 N 个 Token |
| `keep.fraction` | 保留上下文窗口的比例 |

**类比理解**：摘要中间件就像笔记整理——当笔记本快写满时，把旧内容整理成摘要，给新内容腾出空间。

---

## 二、人工审批中间件 (Human-in-the-Loop)

### 2.1 基础配置

对敏感操作暂停执行，等待人工确认：

```typescript
import { createAgent, humanInTheLoopMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "gpt-4o",
  tools: [readEmailTool, sendEmailTool],
  checkpointer: new MemorySaver(),
  middleware: [
    humanInTheLoopMiddleware({
      interruptOn: {
        sendEmailTool: {
          allowedDecisions: ["approve", "edit", "reject"],
        },
        readEmailTool: false,
      }
    })
  ]
});
```

### 2.2 审批流程

```typescript
import { Command } from "@langchain/langgraph";

const config = { configurable: { thread_id: "user-123" } };

let result = await agent.invoke(
  { messages: [{ role: "user", content: "给团队发邮件通知下周会议" }] },
  config
);

result = await agent.invoke(
  new Command({ resume: { decisions: [{ type: "approve" }] } }),
  config
);

result = await agent.invoke(
  new Command({ 
    resume: { 
      decisions: [{ 
        type: "edit", 
        newArgs: { subject: "下周三团队会议通知", body: "..." } 
      }] 
    } 
  }),
  config
);

result = await agent.invoke(
  new Command({ resume: { decisions: [{ type: "reject" }] } }),
  config
);
```

---

## 三、调用限制中间件

### 3.1 模型调用限制

```typescript
import { createAgent, modelCallLimitMiddleware } from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "gpt-4o",
  checkpointer: new MemorySaver(),
  tools: [],
  middleware: [
    modelCallLimitMiddleware({
      threadLimit: 10,
      runLimit: 5,
      exitBehavior: "end",
    }),
  ],
});
```

| 参数 | 说明 |
|------|------|
| `threadLimit` | 整个会话的最大模型调用次数 |
| `runLimit` | 单次调用的最大模型调用次数 |
| `exitBehavior` | 达到上限时的行为：`"end"`（优雅结束）或 `"error"`（抛出异常） |

### 3.2 工具调用限制

```typescript
import { createAgent, toolCallLimitMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool, databaseTool],
  middleware: [
    toolCallLimitMiddleware({ threadLimit: 20, runLimit: 10 }),
    toolCallLimitMiddleware({
      toolName: "search",
      threadLimit: 5,
      runLimit: 3,
    }),
  ],
});
```

| 参数 | 说明 |
|------|------|
| `toolName` | 指定限制的工具名（不填则全局限制） |
| `exitBehavior` | `"continue"`（返回错误消息继续）、`"error"`（抛出异常）、`"end"`（立即结束） |

---

## 四、模型回退中间件 (Model Fallback)

当主模型失败时自动切换到备用模型：

```typescript
import { createAgent, modelFallbackMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  middleware: [
    modelFallbackMiddleware(
      "gpt-4o-mini",
      "claude-3-5-sonnet-20241022"
    ),
  ],
});
```

**工作流程**：
1. 尝试 gpt-4o（主模型）
2. 失败 → 尝试 gpt-4o-mini（第一备用）
3. 失败 → 尝试 claude-3-5-sonnet（第二备用）
4. 全部失败 → 抛出异常

---

## 五、PII 检测中间件

### 5.1 内置 PII 类型

```typescript
import { createAgent, piiMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  middleware: [
    piiMiddleware("email", { strategy: "redact", applyToInput: true }),
    piiMiddleware("credit_card", { strategy: "mask", applyToInput: true }),
  ],
});
```

内置 PII 类型：`email`、`credit_card`、`ip`、`mac_address`、`url`

### 5.2 处理策略

| 策略 | 说明 | 示例 |
|------|------|------|
| `block` | 检测到 PII 时抛出异常 | 错误 |
| `redact` | 替换为 `[REDACTED_TYPE]` | `[REDACTED_EMAIL]` |
| `mask` | 部分遮盖 | `****-****-****-1234` |
| `hash` | 替换为哈希值 | `<email_hash:a1b2c3d4>` |

### 5.3 自定义 PII 检测

```typescript
piiMiddleware("api_key", {
  detector: "sk-[a-zA-Z0-9]{32}",
  strategy: "block",
})

piiMiddleware("phone_number", {
  detector: /\+?\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{4}/,
  strategy: "mask",
})

import type { PIIMatch } from "langchain";

function detectSSN(content: string): PIIMatch[] {
  const matches: PIIMatch[] = [];
  const pattern = /\d{3}-\d{2}-\d{4}/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const ssn = match[0];
    const firstThree = parseInt(ssn.substring(0, 3), 10);
    if (firstThree !== 0 && firstThree !== 666 && !(firstThree >= 900)) {
      matches.push({
        text: ssn,
        start: match.index ?? 0,
        end: (match.index ?? 0) + ssn.length,
      });
    }
  }
  return matches;
}

piiMiddleware("ssn", {
  detector: detectSSN,
  strategy: "hash",
})
```

---

## 六、重试中间件

### 6.1 工具重试

```typescript
import { createAgent, toolRetryMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool, databaseTool],
  middleware: [
    toolRetryMiddleware({
      maxRetries: 3,
      backoffFactor: 2.0,
      initialDelayMs: 1000,
    }),
  ],
});
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `maxRetries` | 最大重试次数 | 2 |
| `backoffFactor` | 退避乘数 | 2.0 |
| `initialDelayMs` | 初始延迟（毫秒） | 1000 |
| `maxDelayMs` | 最大延迟（毫秒） | 60000 |
| `jitter` | 是否添加随机抖动 | true |
| `onFailure` | 失败处理：`"continue"`/`"error"`/自定义函数 | `"continue"` |

### 6.2 模型重试

```typescript
import { createAgent, modelRetryMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool],
  middleware: [
    modelRetryMiddleware({
      maxRetries: 3,
      backoffFactor: 2.0,
      initialDelayMs: 1000,
      retryOn: (error) => error.message.includes("rate limit"),
    }),
  ],
});
```

---

## 七、智能工具选择中间件

当工具数量多时，用 LLM 先筛选相关工具：

```typescript
import { createAgent, llmToolSelectorMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [tool1, tool2, tool3, tool4, tool5],
  middleware: [
    llmToolSelectorMiddleware({
      model: "gpt-4o-mini",
      maxTools: 3,
      alwaysInclude: ["search"],
    }),
  ],
});
```

**工作原理**：
1. 用轻量模型分析用户查询
2. 选出最相关的 N 个工具
3. 只把这些工具传给主模型

**优势**：减少 Token 消耗，提高模型选择准确性。

---

## 八、任务列表中间件

为 Agent 添加任务规划能力：

```typescript
import { createAgent, todoListMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [readFile, writeFile, runTests],
  middleware: [todoListMiddleware()],
});
```

自动添加 `write_todos` 工具，Agent 可以用它来规划和追踪复杂任务。

---

## 九、上下文编辑中间件

清理旧的工具输出，管理长对话上下文：

```typescript
import { createAgent, contextEditingMiddleware, ClearToolUsesEdit } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  middleware: [
    contextEditingMiddleware({
      edits: [
        new ClearToolUsesEdit({
          triggerTokens: 100000,
          keep: 3,
          placeholder: "[已清理]",
        }),
      ],
    }),
  ],
});
```

| 参数 | 说明 |
|------|------|
| `triggerTokens` | 触发清理的 Token 阈值 |
| `keep` | 保留最近 N 个工具结果 |
| `clearToolInputs` | 是否同时清理工具参数 |
| `excludeTools` | 排除的工具列表（永不清理） |

---

## 十、工具模拟中间件

用 LLM 模拟工具执行，用于开发测试：

```typescript
import { createAgent, toolEmulatorMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [getWeather, sendEmail],
  middleware: [
    toolEmulatorMiddleware(),
  ],
});

const agent2 = createAgent({
  model: "gpt-4o",
  tools: [getWeather, sendEmail],
  middleware: [
    toolEmulatorMiddleware({
      tools: ["get_weather"],
      model: "gpt-4o-mini",
    }),
  ],
});
```

---

## 十一、组合使用示例

### 11.1 生产环境配置

```typescript
import {
  createAgent,
  summarizationMiddleware,
  modelCallLimitMiddleware,
  toolCallLimitMiddleware,
  modelFallbackMiddleware,
  piiMiddleware,
  toolRetryMiddleware,
  humanInTheLoopMiddleware,
} from "langchain";
import { MemorySaver } from "@langchain/langgraph";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool, emailTool, databaseTool],
  checkpointer: new MemorySaver(),
  middleware: [
    piiMiddleware("email", { strategy: "redact", applyToInput: true }),
    piiMiddleware("credit_card", { strategy: "mask", applyToInput: true }),
    
    summarizationMiddleware({
      model: "gpt-4o-mini",
      trigger: { tokens: 8000 },
      keep: { messages: 30 },
    }),
    
    modelCallLimitMiddleware({
      threadLimit: 50,
      runLimit: 10,
      exitBehavior: "end",
    }),
    
    toolCallLimitMiddleware({
      toolName: "search",
      runLimit: 5,
    }),
    
    humanInTheLoopMiddleware({
      interruptOn: {
        emailTool: { allowedDecisions: ["approve", "edit", "reject"] },
        databaseTool: { allowedDecisions: ["approve", "reject"] },
      }
    }),
    
    modelFallbackMiddleware("gpt-4o-mini", "claude-3-5-sonnet-20241022"),
    
    toolRetryMiddleware({
      maxRetries: 3,
      backoffFactor: 2.0,
    }),
  ],
});
```

---

## 常见问题

### Q1: 中间件的顺序重要吗？

非常重要！Before 钩子按顺序执行，After 钩子逆序执行。建议把安全相关（PII）放前面，重试相关放后面。

### Q2: 多个限制中间件怎么配合？

可以组合使用，比如全局限制 + 特定工具限制。各自独立计数。

### Q3: 人工审批需要持久化吗？

是的，必须配置 `checkpointer`（如 `MemorySaver`）才能在中断后恢复。

---

## 总结

LangChain 预置中间件覆盖了常见的生产需求：

| 类别 | 中间件 | 核心功能 |
|------|--------|----------|
| **上下文管理** | `summarizationMiddleware` | 自动摘要长对话 |
| | `contextEditingMiddleware` | 清理旧工具输出 |
| **安全控制** | `humanInTheLoopMiddleware` | 人工审批 |
| | `piiMiddleware` | 隐私信息检测 |
| **限流保护** | `modelCallLimitMiddleware` | 模型调用限制 |
| | `toolCallLimitMiddleware` | 工具调用限制 |
| **可靠性** | `modelFallbackMiddleware` | 模型故障回退 |
| | `modelRetryMiddleware` | 模型调用重试 |
| | `toolRetryMiddleware` | 工具调用重试 |
| **智能增强** | `llmToolSelectorMiddleware` | 智能工具筛选 |
| | `todoListMiddleware` | 任务规划追踪 |
| **开发测试** | `toolEmulatorMiddleware` | 工具模拟 |

**核心理念**：不要重复造轮子，先看看预置中间件能否满足需求。

下一篇，我们将学习如何创建自定义中间件，实现更个性化的需求！
