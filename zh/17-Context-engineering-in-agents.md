# 智能体中的上下文工程 (Context Engineering in Agents)

## 概览

构建智能体（或任何 LLM 应用程序）的困难之处在于使它们足够可靠。虽然它们可能在原型中工作，但在实际用例中往往会失败。

### 为什么智能体会失败？

当智能体失败时，通常是因为智能体内部的 LLM 调用采取了错误的行动/没有做我们期望的事情。LLM 失败有两个原因之一：

1. 底层 LLM 的能力不够
2. "正确的"上下文没有传递给 LLM

更多情况下——实际上是第二个原因导致智能体不可靠。

**上下文工程** 是以正确的格式提供正确的信息和工具，以便 LLM 可以完成任务。这是 AI 工程师的首要工作。缺乏"正确的"上下文是更可靠智能体的头号阻碍，而 LangChain 的智能体抽象专门设计用于促进上下文工程。

<Tip>
  刚接触上下文工程？从 [概念概览](/oss/javascript/concepts/context) 开始，了解不同类型的上下文以及何时使用它们。
</Tip>

### 智能体循环

典型的智能体循环包含两个主要步骤：

1. **模型调用** - 使用提示词和可用工具调用 LLM，返回响应或执行工具的请求
2. **工具执行** - 执行 LLM 请求的工具，返回工具结果

<div style={{ display: "flex", justifyContent: "center" }}>
  <img src="https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=ac72e48317a9ced68fd1be64e89ec063" alt="Core agent loop diagram" className="rounded-lg" data-og-width="300" width="300" data-og-height="268" height="268" data-path="oss/images/core_agent_loop.png" data-optimize="true" data-opv="3" />
</div>

此循环持续进行，直到 LLM 决定完成。

### 您可以控制什么

要构建可靠的智能体，您需要控制智能体循环每一步发生的事情，以及步骤之间发生的事情。

| 上下文类型                                    | 您控制什么                                                                           | 瞬态或持久 |
| --------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- |
| **[模型上下文](#model-context)**              | 进入模型调用的内容（指令、消息历史、工具、响应格式）                                 | 瞬态       |
| **[工具上下文](#tool-context)**               | 工具可以访问和产生什么（对状态、存储、运行时上下文的读/写）                          | 持久       |
| **[生命周期上下文](#life-cycle-context)**     | 在模型和工具调用之间发生什么（摘要、护栏、日志记录等）                               | 持久       |

<CardGroup>
  <Card title="瞬态上下文" icon="bolt" iconType="duotone">
    LLM 在单次调用中看到的内容。您可以修改消息、工具或提示词，而不更改状态中保存的内容。
  </Card>

  <Card title="持久上下文" icon="database" iconType="duotone">
    在多轮对话中保存在状态中的内容。生命周期钩子和工具写入会永久修改这些内容。
  </Card>
</CardGroup>

### 数据源

在整个过程中，您的智能体访问（读取/写入）不同的数据源：

| 数据源              | 别名                 | 范围                | 示例                                                                       |
| ------------------- | -------------------- | ------------------- | -------------------------------------------------------------------------- |
| **运行时上下文**    | 静态配置             | 会话范围            | 用户 ID、API 密钥、数据库连接、权限、环境设置                              |
| **状态**            | 短期记忆             | 会话范围            | 当前消息、上传的文件、认证状态、工具结果                                   |
| **存储**            | 长期记忆             | 跨会话              | 用户偏好、提取的见解、记忆、历史数据                                       |

### 工作原理

LangChain [中间件](/oss/javascript/langchain/middleware) 是底层机制，使上下文工程对使用 LangChain 的开发者变得实用。

中间件允许您挂钩到智能体生命周期的任何步骤，并且：

* 更新上下文
* 跳转到智能体生命周期的不同步骤

在本指南中，您将频繁看到中间件 API 作为实现上下文工程目标的手段。

## 模型上下文

控制进入每个模型调用的内容——指令、可用工具、使用哪个模型和输出格式。这些决策直接影响可靠性和成本。

<CardGroup cols={2}>
  <Card title="系统提示词" icon="message-lines" href="#system-prompt">
    开发者给 LLM 的基础指令。
  </Card>

  <Card title="消息" icon="comments" href="#messages">
    发送给 LLM 的完整消息列表（对话历史）。
  </Card>

  <Card title="工具" icon="wrench" href="#tools">
    智能体可以访问以执行操作的实用程序。
  </Card>

  <Card title="模型" icon="brain-circuit" href="#model">
    要调用的实际模型（包括配置）。
  </Card>

  <Card title="响应格式" icon="brackets-curly" href="#response-format">
    模型最终响应的模式规范。
  </Card>
</CardGroup>

所有这些类型的模型上下文都可以从 **状态**（短期记忆）、**存储**（长期记忆）或 **运行时上下文**（静态配置）中提取。

### 系统提示词

系统提示词设置 LLM 的行为和能力。不同的用户、上下文或对话阶段需要不同的指令。成功的智能体借助记忆、偏好和配置来为当前对话状态提供正确的指令。

<Tabs>
  <Tab title="状态">
    从状态访问消息计数或对话上下文：

    ```typescript
    import { createAgent } from "langchain";

    const agent = createAgent({
      model: "gpt-4.1",
      tools: [...],
      middleware: [
        dynamicSystemPromptMiddleware((state) => {
          // 从状态读取：检查对话长度
          const messageCount = state.messages.length;

          let base = "You are a helpful assistant.";

          if (messageCount > 10) {
            base += "\nThis is a long conversation - be extra concise.";
          }

          return base;
        }),
      ],
    });
    ```
  </Tab>

  <Tab title="存储">
    从长期记忆访问用户偏好：

    ```typescript
    import * as z from "zod";
    import { createAgent, dynamicSystemPromptMiddleware } from "langchain";

    const contextSchema = z.object({
      userId: z.string(),
    });

    type Context = z.infer<typeof contextSchema>;

    const agent = createAgent({
      model: "gpt-4.1",
      tools: [...],
      contextSchema,
      middleware: [
        dynamicSystemPromptMiddleware<Context>(async (state, runtime) => {
          const userId = runtime.context.userId;

          // 从存储读取：获取用户偏好
          const store = runtime.store;
          const userPrefs = await store.get(["preferences"], userId);

          let base = "You are a helpful assistant.";

          if (userPrefs) {
            const style = userPrefs.value?.communicationStyle || "balanced";
            base += `\nUser prefers ${style} responses.`;
          }

          return base;
        }),
      ],
    });
    ```
  </Tab>

  <Tab title="运行时上下文">
    从运行时上下文访问用户 ID 或配置：

    ```typescript
    import * as z from "zod";
    import { createAgent, dynamicSystemPromptMiddleware } from "langchain";

    const contextSchema = z.object({
      userRole: z.string(),
      deploymentEnv: z.string(),
    });

    type Context = z.infer<typeof contextSchema>;

    const agent = createAgent({
      model: "gpt-4.1",
      tools: [...],
      contextSchema,
      middleware: [
        dynamicSystemPromptMiddleware<Context>((state, runtime) => {
          // 从运行时上下文读取：用户角色和环境
          const userRole = runtime.context.userRole;
          const env = runtime.context.deploymentEnv;

          let base = "You are a helpful assistant.";

          if (userRole === "admin") {
            base += "\nYou have admin access. You can perform all operations.";
          } else if (userRole === "viewer") {
            base += "\nYou have read-only access. Guide users to read operations only.";
          }

          if (env === "production") {
            base += "\nBe extra careful with any data modifications.";
          }

          return base;
        }),
      ],
    });
    ```
  </Tab>
</Tabs>

### 消息

消息构成发送给 LLM 的提示词。
管理消息内容至关重要，以确保 LLM 拥有正确的信息来做出良好的响应。

<Tabs>
  <Tab title="状态">
    当与当前查询相关时，从状态注入上传的文件上下文：

    ```typescript
    import { createMiddleware } from "langchain";

    const injectFileContext = createMiddleware({
      name: "InjectFileContext",
      wrapModelCall: (request, handler) => {
        // request.state 是 request.state.messages 的快捷方式
        const uploadedFiles = request.state.uploadedFiles || [];

        if (uploadedFiles.length > 0) {
          // 构建关于可用文件的上下文
          const fileDescriptions = uploadedFiles.map(file =>
            `- ${file.name} (${file.type}): ${file.summary}`
          );

          const fileContext = `Files you have access to in this conversation:
    ${fileDescriptions.join("\n")}

    Reference these files when answering questions.`;

          // 在最近的消息之前注入文件上下文
          const messages = [
            ...request.messages,  // 其余对话
            { role: "user", content: fileContext }
          ];
          request = request.override({ messages });
        }

        return handler(request);
      },
    });

    const agent = createAgent({
      model: "gpt-4.1",
      tools: [...],
      middleware: [injectFileContext],
    });
    ```
  </Tab>

  <Tab title="存储">
    从存储注入用户的电子邮件写作风格以指导起草：

    ```typescript
    import * as z from "zod";
    import { createMiddleware } from "langchain";

    const contextSchema = z.object({
      userId: z.string(),
    });

    const injectWritingStyle = createMiddleware({
      name: "InjectWritingStyle",
      contextSchema,
      wrapModelCall: async (request, handler) => {
        const userId = request.runtime.context.userId;

        // 从存储读取：获取用户的写作风格示例
        const store = request.runtime.store;
        const writingStyle = await store.get(["writing_style"], userId);

        if (writingStyle) {
          const style = writingStyle.value;
          // 从存储的示例构建风格指南
          const styleContext = `Your writing style:
    - Tone: ${style.tone || 'professional'}
    - Typical greeting: "${style.greeting || 'Hi'}"
    - Typical sign-off: "${style.signOff || 'Best'}"
    - Example email you've written:
    ${style.exampleEmail || ''}`;

          // 追加到末尾 - 模型更关注最后的消息
          const messages = [
            ...request.messages,
            { role: "user", content: styleContext }
          ];
          request = request.override({ messages });
        }

        return handler(request);
      },
    });
    ```
  </Tab>

  <Tab title="运行时上下文">
    根据用户的管辖区从运行时上下文注入合规规则：

    ```typescript
    import * as z from "zod";
    import { createMiddleware } from "langchain";

    const contextSchema = z.object({
      userJurisdiction: z.string(),
      industry: z.string(),
      complianceFrameworks: z.array(z.string()),
    });

    type Context = z.infer<typeof contextSchema>;

    const injectComplianceRules = createMiddleware<Context>({
      name: "InjectComplianceRules",
      contextSchema,
      wrapModelCall: (request, handler) => {
        // 从运行时上下文读取：获取合规要求
        const { userJurisdiction, industry, complianceFrameworks } = request.runtime.context;

        // 构建合规约束
        const rules = [];
        if (complianceFrameworks.includes("GDPR")) {
          rules.push("- Must obtain explicit consent before processing personal data");
          rules.push("- Users have right to data deletion");
        }
        if (complianceFrameworks.includes("HIPAA")) {
          rules.push("- Cannot share patient health information without authorization");
          rules.push("- Must use secure, encrypted communication");
        }
        if (industry === "finance") {
          rules.push("- Cannot provide financial advice without proper disclaimers");
        }

        if (rules.length > 0) {
          const complianceContext = `Compliance requirements for ${userJurisdiction}:
    ${rules.join("\n")}`;

          // 追加到末尾 - 模型更关注最后的消息
          const messages = [
            ...request.messages,
            { role: "user", content: complianceContext }
          ];
          request = request.override({ messages });
        }

        return handler(request);
      },
    });
    ```
  </Tab>
</Tabs>

<Note>
  **瞬态与持久消息更新：**

  上面的示例使用 `wrap_model_call` 进行 **瞬态** 更新——修改发送给模型的消息进行单次调用，而不更改状态中保存的内容。

  对于永久修改状态的 **持久** 更新（如 [生命周期上下文](#summarization) 中的摘要示例），使用生命周期钩子如 `before_model` 或 `after_model` 来永久更新对话历史。有关更多详情，请参阅 [中间件文档](/oss/javascript/langchain/middleware)。
</Note>

### 工具

工具让模型与数据库、API 和外部系统交互。您如何定义和选择工具直接影响模型是否能有效完成任务。

#### 定义工具

每个工具需要清晰的名称、描述、参数名称和参数描述。这些不仅仅是元数据——它们指导模型关于何时以及如何使用工具的推理。

```typescript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const searchOrders = tool(
  async ({ userId, status, limit }) => {
    // 实现在这里
  },
  {
    name: "search_orders",
    description: `按状态搜索用户订单。

    当用户询问订单历史或想要检查订单状态时使用此工具。始终按提供的状态进行筛选。`,
    schema: z.object({
      userId: z.string().describe("用户的唯一标识符"),
      status: z.enum(["pending", "shipped", "delivered"]).describe("要筛选的订单状态"),
      limit: z.number().default(10).describe("要返回的最大结果数"),
    }),
  }
);
```

#### 选择工具

并非每个工具都适合每种情况。太多的工具可能会让模型不堪重负（超载上下文）并增加错误；太少则限制能力。动态工具选择根据认证状态、用户权限、功能标志或对话阶段调整可用的工具集。

<Tabs>
  <Tab title="状态">
    仅在某些对话里程碑后启用高级工具：

    ```typescript
    import { createMiddleware } from "langchain";

    const stateBasedTools = createMiddleware({
      name: "StateBasedTools",
      wrapModelCall: (request, handler) => {
        // 从状态读取：检查认证和对话长度
        const state = request.state;
        const isAuthenticated = state.authenticated || false;
        const messageCount = state.messages.length;

        let filteredTools = request.tools;

        // 仅在认证后启用敏感工具
        if (!isAuthenticated) {
          filteredTools = request.tools.filter(t => t.name.startsWith("public_"));
        } else if (messageCount < 5) {
          filteredTools = request.tools.filter(t => t.name !== "advanced_search");
        }

        return handler({ ...request, tools: filteredTools });
      },
    });
    ```
  </Tab>

  <Tab title="存储">
    根据存储中的用户偏好或功能标志筛选工具：

    ```typescript
    import * as z from "zod";
    import { createMiddleware } from "langchain";

    const contextSchema = z.object({
      userId: z.string(),
    });

    const storeBasedTools = createMiddleware({
      name: "StoreBasedTools",
      contextSchema,
      wrapModelCall: async (request, handler) => {
        const userId = request.runtime.context.userId;

        // 从存储读取：获取用户启用的功能
        const store = request.runtime.store;
        const featureFlags = await store.get(["features"], userId);

        let filteredTools = request.tools;

        if (featureFlags) {
          const enabledFeatures = featureFlags.value?.enabledTools || [];
          filteredTools = request.tools.filter(t => enabledFeatures.includes(t.name));
        }

        return handler({ ...request, tools: filteredTools });
      },
    });
    ```
  </Tab>

  <Tab title="运行时上下文">
    根据运行时上下文中的用户权限筛选工具：

    ```typescript
    import * as z from "zod";
    import { createMiddleware } from "langchain";

    const contextSchema = z.object({
      userRole: z.string(),
    });

    const contextBasedTools = createMiddleware({
      name: "ContextBasedTools",
      contextSchema,
      wrapModelCall: (request, handler) => {
        // 从运行时上下文读取：获取用户角色
        const userRole = request.runtime.context.userRole;

        let filteredTools = request.tools;

        if (userRole === "admin") {
          // 管理员获得所有工具
        } else if (userRole === "editor") {
          filteredTools = request.tools.filter(t => t.name !== "delete_data");
        } else {
          filteredTools = request.tools.filter(t => t.name.startsWith("read_"));
        }

        return handler({ ...request, tools: filteredTools });
      },
    });
    ```
  </Tab>
</Tabs>

有关筛选预注册工具和在运行时注册工具（例如，从 MCP 服务器），请参阅 [动态工具](/oss/javascript/langchain/agents#dynamic-tools)。

### 模型

不同的模型有不同的优势、成本和上下文窗口。为手头的任务选择正确的模型，这可能在智能体运行期间发生变化。

<Tabs>
  <Tab title="状态">
    根据状态中的对话长度使用不同的模型：

    ```typescript
    import { createMiddleware, initChatModel } from "langchain";

    // 在中间件外部初始化模型一次
    const largeModel = initChatModel("claude-sonnet-4-5-20250929");
    const standardModel = initChatModel("gpt-4.1");
    const efficientModel = initChatModel("gpt-4.1-mini");

    const stateBasedModel = createMiddleware({
      name: "StateBasedModel",
      wrapModelCall: (request, handler) => {
        // request.messages 是 request.state.messages 的快捷方式
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
  </Tab>

  <Tab title="存储">
    从存储使用用户首选的模型：

    ```typescript
    import * as z from "zod";
    import { createMiddleware, initChatModel } from "langchain";

    const contextSchema = z.object({
      userId: z.string(),
    });

    // 初始化可用模型一次
    const MODEL_MAP = {
      "gpt-4.1": initChatModel("gpt-4.1"),
      "gpt-4.1-mini": initChatModel("gpt-4.1-mini"),
      "claude-sonnet": initChatModel("claude-sonnet-4-5-20250929"),
    };

    const storeBasedModel = createMiddleware({
      name: "StoreBasedModel",
      contextSchema,
      wrapModelCall: async (request, handler) => {
        const userId = request.runtime.context.userId;

        // 从存储读取：获取用户首选的模型
        const store = request.runtime.store;
        const userPrefs = await store.get(["preferences"], userId);

        let model = request.model;

        if (userPrefs) {
          const preferredModel = userPrefs.value?.preferredModel;
          if (preferredModel && MODEL_MAP[preferredModel]) {
            model = MODEL_MAP[preferredModel];
          }
        }

        return handler({ ...request, model });
      },
    });
    ```
  </Tab>

  <Tab title="运行时上下文">
    根据运行时上下文中的成本限制或环境选择模型：

    ```typescript
    import * as z from "zod";
    import { createMiddleware, initChatModel } from "langchain";

    const contextSchema = z.object({
      costTier: z.string(),
      environment: z.string(),
    });

    // 在中间件外部初始化模型一次
    const premiumModel = initChatModel("claude-sonnet-4-5-20250929");
    const standardModel = initChatModel("gpt-4.1");
    const budgetModel = initChatModel("gpt-4.1-mini");

    const contextBasedModel = createMiddleware({
      name: "ContextBasedModel",
      contextSchema,
      wrapModelCall: (request, handler) => {
        // 从运行时上下文读取：成本层和环境
        const costTier = request.runtime.context.costTier;
        const environment = request.runtime.context.environment;

        let model;

        if (environment === "production" && costTier === "premium") {
          model = premiumModel;
        } else if (costTier === "budget") {
          model = budgetModel;
        } else {
          model = standardModel;
        }

        return handler({ ...request, model });
      },
    });
    ```
  </Tab>
</Tabs>

有关更多示例，请参阅 [动态模型](/oss/javascript/langchain/agents#dynamic-model)。

### 响应格式

结构化输出将非结构化文本转换为经过验证的结构化数据。当提取特定字段或为下游系统返回数据时，自由格式文本是不够的。

**工作原理：** 当您提供模式作为响应格式时，模型的最终响应保证符合该模式。智能体运行模型/工具调用循环直到模型完成调用工具，然后最终响应被强制转换为提供的格式。

#### 定义格式

模式定义指导模型。字段名称、类型和描述确切指定输出应该遵循的格式。

```typescript
import { z } from "zod";

const customerSupportTicket = z.object({
  category: z.enum(["billing", "technical", "account", "product"]).describe(
    "问题类别"
  ),
  priority: z.enum(["low", "medium", "high", "critical"]).describe(
    "紧急程度"
  ),
  summary: z.string().describe(
    "客户问题的一句话摘要"
  ),
  customerSentiment: z.enum(["frustrated", "neutral", "satisfied"]).describe(
    "客户的情绪基调"
  ),
}).describe("从客户消息中提取的结构化工单信息");
```

#### 选择格式

动态响应格式选择根据用户偏好、对话阶段或角色调整模式——早期返回简单格式，随着复杂性增加返回详细格式。

<Tabs>
  <Tab title="状态">
    根据对话状态配置结构化输出：

    ```typescript
    import { createMiddleware } from "langchain";
    import { z } from "zod";

    const simpleResponse = z.object({
      answer: z.string().describe("简短回答"),
    });

    const detailedResponse = z.object({
      answer: z.string().describe("详细回答"),
      reasoning: z.string().describe("推理解释"),
      confidence: z.number().describe("置信度分数 0-1"),
    });

    const stateBasedOutput = createMiddleware({
      name: "StateBasedOutput",
      wrapModelCall: (request, handler) => {
        // request.state 是 request.state.messages 的快捷方式
        const messageCount = request.messages.length;

        let responseFormat;
        if (messageCount < 3) {
          // 早期对话 - 使用简单格式
          responseFormat = simpleResponse;
        } else {
          // 已建立的对话 - 使用详细格式
          responseFormat = detailedResponse;
        }

        return handler({ ...request, responseFormat });
      },
    });
    ```
  </Tab>

  <Tab title="存储">
    根据存储中的用户偏好配置输出格式：

    ```typescript
    import * as z from "zod";
    import { createMiddleware } from "langchain";

    const contextSchema = z.object({
      userId: z.string(),
    });

    const verboseResponse = z.object({
      answer: z.string().describe("详细回答"),
      sources: z.array(z.string()).describe("使用的来源"),
    });

    const conciseResponse = z.object({
      answer: z.string().describe("简短回答"),
    });

    const storeBasedOutput = createMiddleware({
      name: "StoreBasedOutput",
      wrapModelCall: async (request, handler) => {
        const userId = request.runtime.context.userId;

        // 从存储读取：获取用户首选的响应风格
        const store = request.runtime.store;
        const userPrefs = await store.get(["preferences"], userId);

        if (userPrefs) {
          const style = userPrefs.value?.responseStyle || "concise";
          if (style === "verbose") {
            request.responseFormat = verboseResponse;
          } else {
            request.responseFormat = conciseResponse;
          }
        }

        return handler(request);
      },
    });
    ```
  </Tab>

  <Tab title="运行时上下文">
    根据运行时上下文（如用户角色或环境）配置输出格式：

    ```typescript
    import * as z from "zod";
    import { createMiddleware } from "langchain";

    const contextSchema = z.object({
      userRole: z.string(),
      environment: z.string(),
    });

    const adminResponse = z.object({
      answer: z.string().describe("回答"),
      debugInfo: z.record(z.any()).describe("调试信息"),
      systemStatus: z.string().describe("系统状态"),
    });

    const userResponse = z.object({
      answer: z.string().describe("回答"),
    });

    const contextBasedOutput = createMiddleware({
      name: "ContextBasedOutput",
      wrapModelCall: (request, handler) => {
        // 从运行时上下文读取：用户角色和环境
        const userRole = request.runtime.context.userRole;
        const environment = request.runtime.context.environment;

        let responseFormat;
        if (userRole === "admin" && environment === "production") {
          responseFormat = adminResponse;
        } else {
          responseFormat = userResponse;
        }

        return handler({ ...request, responseFormat });
      },
    });
    ```
  </Tab>
</Tabs>

## 工具上下文

工具的特殊之处在于它们既读取又写入上下文。

在最基本的情况下，当工具执行时，它接收 LLM 的请求参数并返回工具消息。工具完成其工作并产生结果。

工具还可以为模型获取重要信息，使其能够执行和完成任务。

### 读取

大多数实际工具不仅仅需要 LLM 的参数。它们需要用户 ID 进行数据库查询、API 密钥用于外部服务，或当前会话状态来做出决策。工具从状态、存储和运行时上下文读取以访问这些信息。

<Tabs>
  <Tab title="状态">
    从状态读取以检查当前会话信息：

    ```typescript
    import * as z from "zod";
    import { createAgent, tool, type ToolRuntime } from "langchain";

    const checkAuthentication = tool(
      async (_, runtime: ToolRuntime) => {
        // 从状态读取：检查当前认证状态
        const currentState = runtime.state;
        const isAuthenticated = currentState.authenticated || false;

        if (isAuthenticated) {
          return "User is authenticated";
        } else {
          return "User is not authenticated";
        }
      },
      {
        name: "check_authentication",
        description: "检查用户是否已认证",
        schema: z.object({}),
      }
    );
    ```
  </Tab>

  <Tab title="存储">
    从存储读取以访问持久化的用户偏好：

    ```typescript
    import * as z from "zod";
    import { createAgent, tool, type ToolRuntime } from "langchain";

    const contextSchema = z.object({
      userId: z.string(),
    });

    const getPreference = tool(
      async ({ preferenceKey }, runtime: ToolRuntime) => {
        const userId = runtime.context.userId;

        // 从存储读取：获取现有偏好
        const store = runtime.store;
        const existingPrefs = await store.get(["preferences"], userId);

        if (existingPrefs) {
          const value = existingPrefs.value?.[preferenceKey];
          return value ? `${preferenceKey}: ${value}` : `No preference set for ${preferenceKey}`;
        } else {
          return "No preferences found";
        }
      },
      {
        name: "get_preference",
        description: "从存储获取用户偏好",
        schema: z.object({
          preferenceKey: z.string(),
        }),
      }
    );
    ```
  </Tab>

  <Tab title="运行时上下文">
    从运行时上下文读取配置，如 API 密钥和用户 ID：

    ```typescript
    import * as z from "zod";
    import { tool } from "@langchain/core/tools";
    import { createAgent } from "langchain";

    const contextSchema = z.object({
      userId: z.string(),
      apiKey: z.string(),
      dbConnection: z.string(),
    });

    const fetchUserData = tool(
      async ({ query }, runtime: ToolRuntime<any, typeof contextSchema>) => {
        // 从运行时上下文读取：获取 API 密钥和数据库连接
        const { userId, apiKey, dbConnection } = runtime.context;

        // 使用配置获取数据
        const results = await performDatabaseQuery(dbConnection, query, apiKey);

        return `Found ${results.length} results for user ${userId}`;
      },
      {
        name: "fetch_user_data",
        description: "使用运行时上下文配置获取数据",
        schema: z.object({
          query: z.string(),
        }),
      }
    );

    const agent = createAgent({
      model: "gpt-4.1",
      tools: [fetchUserData],
      contextSchema,
    });
    ```
  </Tab>
</Tabs>

### 写入

工具结果可用于帮助智能体完成给定任务。工具既可以直接将结果返回给模型，也可以更新智能体的记忆，使重要上下文可用于未来步骤。

<Tabs>
  <Tab title="状态">
    使用 Command 写入状态以跟踪会话特定信息：

    ```typescript
    import * as z from "zod";
    import { tool } from "@langchain/core/tools";
    import { createAgent } from "langchain";
    import { Command } from "@langchain/langgraph";

    const authenticateUser = tool(
      async ({ password }) => {
        // 执行认证
        if (password === "correct") {
          // 写入状态：使用 Command 标记为已认证
          return new Command({
            update: { authenticated: true },
          });
        } else {
          return new Command({ update: { authenticated: false } });
        }
      },
      {
        name: "authenticate_user",
        description: "认证用户并更新状态",
        schema: z.object({
          password: z.string(),
        }),
      }
    );
    ```
  </Tab>

  <Tab title="存储">
    写入存储以跨会话持久化数据：

    ```typescript
    import * as z from "zod";
    import { createAgent, tool, type ToolRuntime } from "langchain";

    const savePreference = tool(
      async ({ preferenceKey, preferenceValue }, runtime: ToolRuntime<any, typeof contextSchema>) => {
        const userId = runtime.context.userId;

        // 读取现有偏好
        const store = runtime.store;
        const existingPrefs = await store.get(["preferences"], userId);

        // 与新偏好合并
        const prefs = existingPrefs?.value || {};
        prefs[preferenceKey] = preferenceValue;

        // 写入存储：保存更新的偏好
        await store.put(["preferences"], userId, prefs);

        return `Saved preference: ${preferenceKey} = ${preferenceValue}`;
      },
      {
        name: "save_preference",
        description: "将用户偏好保存到存储",
        schema: z.object({
          preferenceKey: z.string(),
          preferenceValue: z.string(),
        }),
      }
    );
    ```
  </Tab>
</Tabs>

有关在工具中访问状态、存储和运行时上下文的全面示例，请参阅 [工具](/oss/javascript/langchain/tools)。

## 生命周期上下文

控制核心智能体步骤 **之间** 发生的事情——拦截数据流以实现跨领域关注点，如摘要、护栏和日志记录。

正如您在 [模型上下文](#model-context) 和 [工具上下文](#tool-context) 中看到的，[中间件](/oss/javascript/langchain/middleware) 是使上下文工程实用的机制。中间件允许您挂钩到智能体生命周期的任何步骤，并且：

1. **更新上下文** - 修改状态和存储以持久化更改、更新对话历史或保存见解
2. **在生命周期中跳转** - 根据上下文移动到智能体循环中的不同步骤（例如，如果满足条件则跳过工具执行，使用修改后的上下文重复模型调用）

<div style={{ display: "flex", justifyContent: "center" }}>
  <img src="https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=eb4404b137edec6f6f0c8ccb8323eaf1" alt="Middleware hooks in the agent loop" className="rounded-lg" data-og-width="500" width="500" data-og-height="560" height="560" data-path="oss/images/middleware_final.png" data-optimize="true" data-opv="3" />
</div>

### 示例：摘要

最常见的生命周期模式之一是当对话历史变得太长时自动压缩它。与 [模型上下文](#messages) 中显示的瞬态消息修剪不同，摘要 **持久更新状态** - 用为所有未来轮次保存的摘要永久替换旧消息。

LangChain 为此提供了内置中间件：

```typescript
import { createAgent, summarizationMiddleware } from "langchain";

const agent = createAgent({
  model: "gpt-4.1",
  tools: [...],
  middleware: [
    summarizationMiddleware({
      model: "gpt-4.1-mini",
      trigger: { tokens: 4000 },
      keep: { messages: 20 },
    }),
  ],
});
```

当对话超过 token 限制时，`SummarizationMiddleware` 会自动：

1. 使用单独的 LLM 调用摘要较旧的消息
2. 在状态中用摘要消息替换它们（永久）
3. 保持最近的消息完整以提供上下文

摘要后的对话历史被永久更新——未来的轮次将看到摘要而不是原始消息。

<Note>
  有关内置中间件的完整列表、可用钩子以及如何创建自定义中间件，请参阅 [中间件文档](/oss/javascript/langchain/middleware)。
</Note>

## 最佳实践

1. **从简单开始** - 从静态提示词和工具开始，仅在需要时添加动态功能
2. **增量测试** - 一次添加一个上下文工程功能
3. **监控性能** - 跟踪模型调用、token 使用和延迟
4. **使用内置中间件** - 利用 [`SummarizationMiddleware`](/oss/javascript/langchain/middleware#summarization)、[`LLMToolSelectorMiddleware`](/oss/javascript/langchain/middleware#llm-tool-selector) 等
5. **记录您的上下文策略** - 清楚地说明传递了什么上下文以及为什么
6. **理解瞬态与持久**：模型上下文更改是瞬态的（每次调用），而生命周期上下文更改持久化到状态

## 相关资源

* [上下文概念概览](/oss/javascript/concepts/context) - 了解上下文类型以及何时使用它们
* [中间件](/oss/javascript/langchain/middleware) - 完整的中间件指南
* [工具](/oss/javascript/langchain/tools) - 工具创建和上下文访问
* [记忆](/oss/javascript/concepts/memory) - 短期和长期记忆模式
* [智能体](/oss/javascript/langchain/agents) - 核心智能体概念
