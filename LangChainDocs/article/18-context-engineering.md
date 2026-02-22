# 18. 上下文工程：让 AI Agent 更可靠的核心技术

## 简单来说

上下文工程（Context Engineering）是在正确的时机、以正确的格式，为 LLM 提供正确的信息和工具。这是 AI 工程师的核心工作——Agent 不靠谱，90% 的原因不是模型不行，而是上下文没给对。

## 本节目标

学完本节，你将能够：
- 理解上下文工程的三大类型：模型上下文、工具上下文、生命周期上下文
- 掌握动态系统提示、消息注入、工具筛选等核心技术
- 理解瞬时上下文和持久上下文的区别
- 使用中间件实现上下文管理

## 业务场景

想象这些真实问题：

1. **Agent 总是选错工具**：因为你给了太多工具，模型迷茫了
2. **长对话后 Agent 变"傻"了**：因为上下文窗口超载，关键信息被截断
3. **不同用户得到相同回复**：因为没有根据用户偏好动态调整提示
4. **敏感信息被泄露**：因为没有在关键节点做安全检查

这些问题的根源都是**上下文管理不当**——上下文工程正是为此而生。

---

## 一、为什么 Agent 不靠谱？

### 1.1 Agent 失败的两大原因

```
Agent 失败
    │
    ├── 模型能力不足（10%）
    │     └── 换更强的模型
    │
    └── 上下文没给对（90%）
          ├── 信息不够
          ├── 信息太多
          ├── 格式不对
          └── 时机不对
```

**类比理解**：想象你让新员工完成任务，他做得不好通常不是因为他笨，而是因为你的指令不清晰、背景信息不全、或者给了太多无关的东西让他迷惑。

### 1.2 Agent 执行循环

```
┌─────────────────────────────────────────┐
│               Agent Loop                │
│                                         │
│   ┌─────────┐    ┌─────────┐           │
│   │  Model  │───▶│  Tools  │           │
│   │  Call   │◀───│Execute  │           │
│   └─────────┘    └─────────┘           │
│        │              │                 │
│        └──────────────┘                 │
│         (循环直到完成)                   │
└─────────────────────────────────────────┘
```

在这个循环的每一步，你都可以控制上下文：
- **模型调用前**：决定发什么消息、用什么工具
- **工具执行时**：决定工具能访问什么数据
- **步骤之间**：决定是否摘要、过滤、跳转

---

## 二、三种上下文类型

### 2.1 概览

| 上下文类型 | 你能控制什么 | 瞬时/持久 |
|-----------|-------------|----------|
| **模型上下文** | 指令、消息历史、工具、响应格式 | 瞬时 |
| **工具上下文** | 工具能读写的数据 | 持久 |
| **生命周期上下文** | 模型和工具调用之间发生的事 | 持久 |

### 2.2 三种数据源

| 数据源 | 别名 | 作用域 | 示例 |
|--------|------|--------|------|
| **Runtime Context** | 静态配置 | 单次会话 | 用户 ID、API 密钥、权限 |
| **State** | 短期记忆 | 单次会话 | 消息历史、认证状态 |
| **Store** | 长期记忆 | 跨会话 | 用户偏好、历史数据 |

---

## 三、模型上下文

### 3.1 动态系统提示

根据对话状态动态调整系统提示：

```typescript
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [...],
  middleware: [
    dynamicSystemPromptMiddleware((state) => {
      const messageCount = state.messages.length;

      let base = "你是一个专业的客服助手。";

      if (messageCount > 10) {
        base += "\n这是一个长对话，请更简洁地回复。";
      }

      return base;
    }),
  ],
});
```

根据用户偏好调整（从 Store 读取）：

```typescript
import * as z from "zod";
import { createAgent, dynamicSystemPromptMiddleware } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [...],
  contextSchema,
  middleware: [
    dynamicSystemPromptMiddleware(async (state, runtime) => {
      const userId = runtime.context.userId;
      const store = runtime.store;
      const userPrefs = await store.get(["preferences"], userId);

      let base = "你是一个专业助手。";

      if (userPrefs) {
        const style = userPrefs.value?.communicationStyle || "balanced";
        base += `\n用户喜欢${style === "concise" ? "简洁" : "详细"}的回复。`;
      }

      return base;
    }),
  ],
});
```

### 3.2 动态消息注入

在模型调用前注入额外上下文：

```typescript
import { createMiddleware } from "langchain";

const injectFileContext = createMiddleware({
  name: "InjectFileContext",
  wrapModelCall: (request, handler) => {
    const uploadedFiles = request.state.uploadedFiles || [];

    if (uploadedFiles.length > 0) {
      const fileDescriptions = uploadedFiles.map(file =>
        `- ${file.name} (${file.type}): ${file.summary}`
      );

      const fileContext = `你可以访问以下文件：
${fileDescriptions.join("\n")}

回答问题时请参考这些文件。`;

      const messages = [
        ...request.messages,
        { role: "user", content: fileContext }
      ];
      request = request.override({ messages });
    }

    return handler(request);
  },
});
```

### 3.3 动态工具筛选

根据用户权限筛选工具：

```typescript
import * as z from "zod";
import { createMiddleware } from "langchain";

const contextSchema = z.object({
  userRole: z.string(),
});

const roleBasedTools = createMiddleware({
  name: "RoleBasedTools",
  contextSchema,
  wrapModelCall: (request, handler) => {
    const userRole = request.runtime.context.userRole;

    let filteredTools = request.tools;

    if (userRole === "admin") {
    } else if (userRole === "editor") {
      filteredTools = request.tools.filter(t => t.name !== "delete_data");
    } else {
      filteredTools = request.tools.filter(t => t.name.startsWith("read_"));
    }

    return handler({ ...request, tools: filteredTools });
  },
});
```

根据认证状态筛选：

```typescript
const authBasedTools = createMiddleware({
  name: "AuthBasedTools",
  wrapModelCall: (request, handler) => {
    const state = request.state;
    const isAuthenticated = state.authenticated || false;

    let filteredTools = request.tools;

    if (!isAuthenticated) {
      filteredTools = request.tools.filter(t => t.name.startsWith("public_"));
    }

    return handler({ ...request, tools: filteredTools });
  },
});
```

### 3.4 动态模型选择

根据对话复杂度选择模型：

```typescript
import { createMiddleware, initChatModel } from "langchain";

const largeModel = initChatModel("gpt-4o");
const standardModel = initChatModel("gpt-4o");
const efficientModel = initChatModel("gpt-4o-mini");

const dynamicModelSelector = createMiddleware({
  name: "DynamicModelSelector",
  wrapModelCall: (request, handler) => {
    const messageCount = request.messages.length;
    let model;

    if (messageCount > 20) {
      model = largeModel;
    } else if (messageCount > 10) {
      model = standardModel;
    } else {
      model = efficientModel;
    }

    return handler({ ...request, model });
  },
});
```

### 3.5 动态响应格式

根据对话阶段调整输出格式：

```typescript
import { createMiddleware } from "langchain";
import { z } from "zod";

const simpleResponse = z.object({
  answer: z.string().describe("简短回答"),
});

const detailedResponse = z.object({
  answer: z.string().describe("详细回答"),
  reasoning: z.string().describe("推理过程"),
  confidence: z.number().describe("置信度 0-1"),
});

const dynamicResponseFormat = createMiddleware({
  name: "DynamicResponseFormat",
  wrapModelCall: (request, handler) => {
    const messageCount = request.messages.length;

    let responseFormat;
    if (messageCount < 3) {
      responseFormat = simpleResponse;
    } else {
      responseFormat = detailedResponse;
    }

    return handler({ ...request, responseFormat });
  },
});
```

---

## 四、工具上下文

### 4.1 工具读取上下文

工具可以访问 State、Store 和 Runtime Context：

```typescript
import * as z from "zod";
import { tool, type ToolRuntime } from "langchain";

const contextSchema = z.object({
  userId: z.string(),
  apiKey: z.string(),
});

const fetchUserData = tool(
  async ({ query }, runtime: ToolRuntime<any, typeof contextSchema>) => {
    const { userId, apiKey } = runtime.context;

    const results = await performDatabaseQuery(query, apiKey);

    return `为用户 ${userId} 找到 ${results.length} 条结果`;
  },
  {
    name: "fetch_user_data",
    description: "使用配置获取用户数据",
    schema: z.object({
      query: z.string(),
    }),
  }
);
```

### 4.2 工具写入状态

工具可以使用 Command 更新状态：

```typescript
import * as z from "zod";
import { tool } from "@langchain/core/tools";
import { Command } from "@langchain/langgraph";

const authenticateUser = tool(
  async ({ password }) => {
    if (password === "correct") {
      return new Command({
        update: { authenticated: true },
      });
    } else {
      return new Command({ update: { authenticated: false } });
    }
  },
  {
    name: "authenticate_user",
    description: "验证用户并更新状态",
    schema: z.object({
      password: z.string(),
    }),
  }
);
```

### 4.3 工具写入 Store

工具可以持久化数据到 Store：

```typescript
import * as z from "zod";
import { tool, type ToolRuntime } from "langchain";

const savePreference = tool(
  async ({ preferenceKey, preferenceValue }, runtime: ToolRuntime) => {
    const userId = runtime.context.userId;
    const store = runtime.store;

    const existingPrefs = await store.get(["preferences"], userId);
    const prefs = existingPrefs?.value || {};
    prefs[preferenceKey] = preferenceValue;

    await store.put(["preferences"], userId, prefs);

    return `已保存偏好：${preferenceKey} = ${preferenceValue}`;
  },
  {
    name: "save_preference",
    description: "保存用户偏好",
    schema: z.object({
      preferenceKey: z.string(),
      preferenceValue: z.string(),
    }),
  }
);
```

---

## 五、生命周期上下文

### 5.1 摘要中间件

自动摘要长对话，持久更新状态：

```typescript
import { createAgent, summarizationMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4o",
  tools: [...],
  middleware: [
    summarizationMiddleware({
      model: "gpt-4o-mini",
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
  ],
});
```

**工作流程**：
1. 检测到对话超过 4000 Token
2. 用 gpt-4o-mini 摘要旧消息
3. 保留最近 20 条消息
4. **持久**更新状态，后续轮次看到的是摘要后的历史

### 5.2 瞬时 vs 持久更新

| 类型 | 实现方式 | 效果 |
|------|----------|------|
| **瞬时** | `wrapModelCall` | 仅影响当前模型调用 |
| **持久** | `beforeModel`/`afterModel` 返回更新 | 永久更新状态 |

**瞬时更新示例**（不改变保存的状态）：

```typescript
const transientInjection = createMiddleware({
  name: "TransientInjection",
  wrapModelCall: (request, handler) => {
    const messages = [
      ...request.messages,
      { role: "system", content: "临时提示：这条不会被保存" }
    ];
    return handler(request.override({ messages }));
  },
});
```

**持久更新示例**（永久修改状态）：

```typescript
const persistentUpdate = createMiddleware({
  name: "PersistentUpdate",
  afterModel: (state) => {
    return {
      callCount: (state.callCount || 0) + 1,
    };
  },
});
```

---

## 六、实战示例

### 6.1 智能客服系统

```typescript
import {
  createAgent,
  createMiddleware,
  dynamicSystemPromptMiddleware,
  summarizationMiddleware,
} from "langchain";
import * as z from "zod";

const contextSchema = z.object({
  userId: z.string(),
  userTier: z.enum(["free", "premium", "enterprise"]),
});

const customerServiceAgent = createAgent({
  model: "gpt-4o",
  tools: [orderQueryTool, productInfoTool, createTicketTool],
  contextSchema,
  middleware: [
    dynamicSystemPromptMiddleware(async (state, runtime) => {
      const { userId, userTier } = runtime.context;
      const store = runtime.store;
      const userHistory = await store.get(["customer_history"], userId);

      let prompt = "你是专业的客服助手。";

      if (userTier === "enterprise") {
        prompt += "\n这是企业级客户，提供最高优先级服务。";
      }

      if (userHistory?.value?.previousIssues?.length > 0) {
        prompt += `\n该用户之前的问题：${userHistory.value.previousIssues.join("、")}`;
      }

      return prompt;
    }),

    createMiddleware({
      name: "TierBasedTools",
      contextSchema,
      wrapModelCall: (request, handler) => {
        const { userTier } = request.runtime.context;
        let tools = request.tools;

        if (userTier === "free") {
          tools = tools.filter(t => t.name !== "create_ticket");
        }

        return handler({ ...request, tools });
      },
    }),

    summarizationMiddleware({
      model: "gpt-4o-mini",
      trigger: { tokens: 6000 },
      keep: { messages: 30 },
    }),
  ],
});
```

### 6.2 代码助手

```typescript
import {
  createAgent,
  createMiddleware,
  dynamicSystemPromptMiddleware,
} from "langchain";
import * as z from "zod";

const contextSchema = z.object({
  projectType: z.string(),
  language: z.string(),
});

const codeAssistant = createAgent({
  model: "gpt-4o",
  tools: [readFileTool, writeFileTool, searchCodeTool, runTestsTool],
  contextSchema,
  middleware: [
    dynamicSystemPromptMiddleware((state, runtime) => {
      const { projectType, language } = runtime.context;

      return `你是一个 ${language} 代码助手，专注于 ${projectType} 项目。
      
遵循以下规范：
- 使用 ${language} 最佳实践
- 写清晰的变量名和函数名
- 添加必要的错误处理`;
    }),

    createMiddleware({
      name: "FileContextInjection",
      wrapModelCall: async (request, handler) => {
        const recentFiles = request.state.recentFiles || [];

        if (recentFiles.length > 0) {
          const fileContext = `最近编辑的文件：
${recentFiles.map(f => `- ${f.path}`).join("\n")}`;

          const messages = [
            ...request.messages,
            { role: "system", content: fileContext }
          ];
          request = request.override({ messages });
        }

        return handler(request);
      },
    }),
  ],
});
```

---

## 七、最佳实践

### 7.1 上下文工程清单

1. **从简单开始**：先用静态提示和工具，有需要再加动态逻辑
2. **逐步测试**：每次只加一个上下文功能
3. **监控性能**：追踪模型调用次数、Token 使用量、延迟
4. **使用内置中间件**：优先用 `summarizationMiddleware`、`llmToolSelectorMiddleware` 等
5. **文档化策略**：记录你传了什么上下文、为什么这样传

### 7.2 常见陷阱

| 陷阱 | 解决方案 |
|------|----------|
| 工具太多，模型选不对 | 动态筛选，只给相关工具 |
| 上下文太长，关键信息被截断 | 摘要中间件 + 智能消息管理 |
| 不同用户得到相同回复 | 从 Store 读取偏好，动态调整提示 |
| 敏感操作没有检查 | 生命周期钩子做验证 |

---

## 常见问题

### Q1: 瞬时和持久更新怎么选？

- **瞬时**：临时注入上下文（如文件列表、合规规则），不想保存
- **持久**：需要跨轮次保留的变化（如摘要、计数器）

### Q2: 工具太多怎么办？

使用 `llmToolSelectorMiddleware` 让轻量模型先筛选：

```typescript
import { llmToolSelectorMiddleware } from "langchain";

middleware: [
  llmToolSelectorMiddleware({
    model: "gpt-4o-mini",
    maxTools: 5,
    alwaysInclude: ["search"],
  }),
]
```

### Q3: 如何调试上下文问题？

添加日志中间件：

```typescript
const debugMiddleware = createMiddleware({
  name: "DebugMiddleware",
  wrapModelCall: (request, handler) => {
    console.log("发送给模型的消息:", request.messages.length);
    console.log("可用工具:", request.tools.map(t => t.name));
    return handler(request);
  },
});
```

---

## 总结

上下文工程是让 Agent 可靠的核心技术：

| 上下文类型 | 你能控制什么 | 实现方式 |
|-----------|-------------|----------|
| **模型上下文** | 提示、消息、工具、模型、响应格式 | 中间件 `wrapModelCall` |
| **工具上下文** | 工具能读写的数据 | `runtime.context`、`runtime.store`、`Command` |
| **生命周期上下文** | 步骤之间的处理 | `beforeModel`、`afterModel` 钩子 |

**核心理念**：Agent 不靠谱的根源 90% 是上下文没给对。掌握上下文工程，就是掌握让 AI 可靠的关键。

下一篇，我们将学习 MCP（Model Context Protocol），了解如何通过标准协议集成外部工具！
