# 19. LangSmith 可观测性：给你的 AI 装上"行车记录仪"

## 简单来说

**LangSmith Observability** 是一套完整的追踪和监控系统，能让你看到 AI 从接收问题到给出答案的每一个"心路历程"。**你的 AI 在干嘛？它为什么这么回答？中间调用了哪些工具？花了多长时间？哪一步出了问题？—— LangSmith 全都帮你记录下来。**

---

## 🎯 本节目标

学完本节，你将能够回答：

1. 什么是 Trace 和 Run？它们有什么关系？
2. 如何开启和关闭追踪功能？
3. 如何给追踪添加元数据和标签？
4. 如何保护敏感信息不被记录？
5. 如何利用追踪数据进行调试和性能分析？

---

## 核心痛点与解决方案

### 痛点：AI 应用就像一个"黑箱"

想象一下这个场景：

- 你辛辛苦苦搭了一个 AI Agent，用户说"帮我发封邮件给 Alice"
- AI 愣是给用户发了封邮件给 Bob，还抄送给了老板
- 你抓狂地想："它到底是怎么想的？哪一步出了问题？"

| 😵 痛点 | 具体表现 |
|--------|---------|
| 调试全靠猜 | 出 Bug 不知道是 LLM 理解错了还是工具调用失败 |
| 日志地狱 | 满屏 `console.log`，眼睛都看花了 |
| 无法复现 | 用户的具体输入已经不记得了 |
| 隐私风险 | 敏感信息（身份证号、密码）可能被无意记录 |
| 性能盲区 | 不知道哪一步最慢，优化无从下手 |

### 解决：全链路追踪 + 可视化

LangSmith 提供一套完整的"追踪系统"：

```
用户输入 → Agent 执行 → 输出结果
              │
              └── LangSmith 追踪 (Trace)
                      │
                      ├── Run 1: 解析用户意图     (耗时 0.5s)
                      ├── Run 2: 调用 LLM        (耗时 1.2s, 150 tokens)
                      ├── Run 3: 调用工具        (耗时 0.3s)
                      └── Run 4: 返回结果        (耗时 0.1s)
```

---

## 生活化类比

### 把 AI 应用想象成一家"外卖配送中心" 🛵

你是外卖公司的老板，每天有无数订单进来。你需要知道：
- 这个订单是怎么处理的？
- 哪个骑手送的？走的哪条路？
- 为什么这单迟到了？

| 外卖配送 | LangSmith 概念 | 说明 |
|----------|----------------|------|
| 整个配送过程 | **Trace** | 从接单到送达的完整链路 |
| 每一个环节 | **Run** | 接单、取餐、配送等独立步骤 |
| 订单分组 | **Project** | 按项目管理追踪记录 |
| 订单备注 | **Metadata & Tags** | 附加的标签和元数据 |
| 顾客电话打码 | **Anonymizer** | 敏感信息脱敏 |
| 配送监控大屏 | **Dashboard** | 可视化监控界面 |

**没有追踪系统：** 顾客投诉"外卖洒了"，你只能挨个问骑手，效率极低。

**有了追踪系统：** 打开订单详情，一眼看到骑手在某路口急刹车，餐洒了，还能看到当时的速度、时间、GPS 轨迹。

---

## 核心概念详解

### 1. Trace（追踪）

一次完整的"执行记录"，记录了 AI 从接收输入到返回结果的全过程。

```
Trace 示例：
├── 开始时间: 2026-02-22 10:30:00
├── 结束时间: 2026-02-22 10:30:03
├── 总耗时: 3 秒
├── 输入: "帮我发封邮件给 Alice"
├── 输出: "邮件已发送给 Alice"
└── 包含 4 个 Run
```

**💡 类比：** 就像一通客服电话录音，从"您好"到"再见"的完整记录。

### 2. Run（运行步骤）

Trace 里面的每一个小步骤：

```
Trace: 发送邮件任务
├── Run 1: 解析用户意图      (input → intent: "send_email")
├── Run 2: 提取邮件参数      (intent → { to: "alice", subject: "..." })
├── Run 3: 调用 LLM 生成内容  (params → email_body)
├── Run 4: 调用发送工具       (email → "success")
└── Run 5: 返回结果给用户
```

### 3. Project（项目）

用来给 Trace 分组的"文件夹"：

| 项目名 | 用途 |
|--------|------|
| `dev` | 开发环境的追踪记录 |
| `staging` | 测试环境的追踪记录 |
| `production` | 生产环境的追踪记录 |
| `email-agent-v2` | 特定功能的追踪记录 |

### 4. Metadata & Tags（元数据和标签）

给追踪添加额外信息，方便后续筛选：

```typescript
{
  tags: ["production", "email-assistant", "v1.0"],
  metadata: {
    userId: "user123",
    sessionId: "session456",
    environment: "production"
  }
}
```

**💡 作用：** 10 万条追踪记录中，快速筛选 `userId: user123 AND environment: production`。

### 5. Anonymizer（匿名器）

自动把敏感信息"打码"：

```
用户输入: "我的社保号是 123-45-6789"
    ↓ 匿名化
记录内容: "我的社保号是 <ssn>"
```

---

## 配置与使用

### 1. 开启全局追踪

**最简单的方式：设置环境变量**

```bash
export LANGSMITH_TRACING=true
export LANGSMITH_API_KEY=lsv2_xxx...
```

**💡 人话解读：** "从现在开始，所有 AI 的动作都给我记录下来，用这个 API Key 验证身份。"

**关闭追踪：**

```bash
export LANGSMITH_TRACING=false
```

### 2. 选择性追踪

只记录重要的操作，节省成本：

```typescript
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer();

await agent.invoke(
  { messages: [{ role: "user", content: "重要操作" }] },
  { callbacks: [tracer] }
);

await agent.invoke(
  { messages: [{ role: "user", content: "不重要的测试" }] }
);
```

**💡 人话解读：**
- 第一次调用：带上追踪器，记录下来
- 第二次调用：没带追踪器，不记录

### 3. 指定项目名

**静态设置（环境变量）：**

```bash
export LANGSMITH_PROJECT=my-agent-project
```

**动态设置（代码中）：**

```typescript
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer({ 
  projectName: "email-agent-test" 
});

await agent.invoke(
  { messages: [{ role: "user", content: "测试邮件" }] },
  { callbacks: [tracer] }
);
```

### 4. 添加元数据和标签

```typescript
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer({ projectName: "production-agent" });

await agent.invoke(
  {
    messages: [{ role: "user", content: "帮我查询订单" }]
  },
  {
    callbacks: [tracer],
    tags: ["production", "order-query", "v2.0"],
    metadata: {
      userId: "user_123",
      sessionId: "sess_456",
      environment: "production",
      requestId: "req_789"
    }
  }
);
```

**💡 人话解读：** "记录这次操作，顺便贴几个标签（生产环境、订单查询、v2.0），再备注是哪个用户在哪个会话触发的。"

### 5. 敏感信息脱敏

```typescript
import { StateGraph } from "@langchain/langgraph";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";
import { createAnonymizer } from "langsmith/anonymizer";
import { Client } from "langsmith";

const anonymizer = createAnonymizer([
  { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/, replace: "<ssn>" },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, replace: "<email>" },
  { pattern: /\b1[3-9]\d{9}\b/, replace: "<phone>" },
]);

const langsmithClient = new Client({ anonymizer });
const tracer = new LangChainTracer({
  client: langsmithClient,
});

const graph = new StateGraph(StateAnnotation)
  .compile()
  .withConfig({ callbacks: [tracer] });
```

**💡 人话解读：** 创建一个"智能打码机"：
- 社保号格式 `XXX-XX-XXXX` → `<ssn>`
- 邮箱地址 → `<email>`
- 手机号 → `<phone>`

---

## 业务场景：电商客服调试实战

### 问题出现

用户投诉："我让 AI 帮我查订单，它给我发了封邮件给陌生人！"

### 没有 LangSmith 的调试

```
Day 1: 翻看代码，加了 50 个 console.log
Day 2: 尝试复现问题，但用户的输入已经不记得了
Day 3: 猜测可能是工具调用出错了？还是 LLM 理解错了？
Day 4: 还在猜...
Day 5: 终于定位到问题
```

### 有了 LangSmith 的调试

**步骤 1：打开 LangSmith Dashboard**

```
访问 https://smith.langchain.com
选择项目 → 筛选用户 ID → 找到那条 Trace
```

**步骤 2：查看 Trace 详情**

```
Trace: 用户请求处理
├── Run 1: 接收用户输入
│   └── 输入: "帮我查一下订单 12345 的状态"
│
├── Run 2: LLM 意图识别
│   ├── 输入: [system prompt + user message]
│   ├── 输出: { intent: "send_email" }  ← 🔴 问题！应该是 "query_order"
│   └── Token: 150, 耗时: 1.2s
│
├── Run 3: 调用工具
│   ├── 工具: sendEmail
│   └── 参数: { to: "???@example.com" }  ← 🔴 错误的收件人
│
└── Run 4: 返回结果
    └── "邮件已发送"
```

**步骤 3：定位问题**

原来是 LLM 把"查订单"误识别成了"发邮件"！

**步骤 4：修复**

优化 System Prompt，增加意图识别的准确性：

```typescript
const systemPrompt = `你是一个电商客服助手。

用户意图识别规则：
- 包含"查询"、"订单"、"状态"等词 → query_order
- 包含"发送"、"邮件"、"通知"等词 → send_email
- 包含"退款"、"退货"等词 → refund

请严格按照上述规则识别用户意图。`;
```

**整个过程：15 分钟搞定！**

### 效率对比

| 维度 | 没有 LangSmith | 有 LangSmith |
|------|----------------|--------------|
| 定位问题 | 数天 | 15 分钟 |
| 问题定位精度 | 全靠猜 | 精准到具体 Run |
| 用户隐私 | 可能泄露 | 自动脱敏 |
| 性能分析 | 无从下手 | 每步耗时清晰 |

---

## 完整示例：带可观测性的 Agent

### 项目结构

```plaintext
observable-agent/
├── src/
│   ├── agent.ts           # Agent 定义
│   ├── tracing.ts         # 追踪配置
│   └── index.ts           # 入口文件
├── .env
├── package.json
└── langgraph.json
```

### 追踪配置 (src/tracing.ts)

```typescript
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";
import { createAnonymizer } from "langsmith/anonymizer";
import { Client } from "langsmith";

const anonymizer = createAnonymizer([
  { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/, replace: "<ssn>" },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i, replace: "<email>" },
  { pattern: /\b1[3-9]\d{9}\b/, replace: "<phone>" },
  { pattern: /\b\d{15,19}\b/, replace: "<card_number>" },
]);

const langsmithClient = new Client({ anonymizer });

export function createTracer(projectName: string = "default") {
  return new LangChainTracer({
    client: langsmithClient,
    projectName,
  });
}

export function getTracingConfig(options: {
  userId?: string;
  sessionId?: string;
  environment?: string;
  tags?: string[];
}) {
  const tracer = createTracer(options.environment || "default");
  
  return {
    callbacks: [tracer],
    tags: options.tags || [],
    metadata: {
      userId: options.userId,
      sessionId: options.sessionId,
      environment: options.environment,
      timestamp: new Date().toISOString(),
    },
  };
}
```

### Agent 定义 (src/agent.ts)

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { BaseMessage } from "@langchain/core/messages";

const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
});

const llm = new ChatOpenAI({ model: "gpt-4o-mini" });

async function chatNode(state: typeof AgentState.State) {
  const response = await llm.invoke([
    { role: "system", content: "你是一个友好的 AI 助手。" },
    ...state.messages,
  ]);
  
  return { messages: [response] };
}

const graph = new StateGraph(AgentState)
  .addNode("chat", chatNode)
  .addEdge(START, "chat")
  .addEdge("chat", END);

export const agent = graph.compile();
```

### 使用示例 (src/index.ts)

```typescript
import { agent } from "./agent.js";
import { getTracingConfig } from "./tracing.js";
import { HumanMessage } from "@langchain/core/messages";

async function main() {
  const tracingConfig = getTracingConfig({
    userId: "user_123",
    sessionId: "sess_456",
    environment: "production",
    tags: ["chat", "v1.0"],
  });

  const result = await agent.invoke(
    {
      messages: [new HumanMessage("你好，介绍一下你自己")]
    },
    tracingConfig
  );

  console.log("Agent 回复:", result.messages[result.messages.length - 1].content);
}

main();
```

### .env

```bash
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=lsv2_xxx...
LANGSMITH_PROJECT=my-observable-agent
OPENAI_API_KEY=sk-xxx...
```

---

## 可观测性最佳实践

### 1. 环境区分

```typescript
const environment = process.env.NODE_ENV || "development";

const tracingConfig = getTracingConfig({
  environment,
  tags: [environment, "agent-v2"],
});
```

### 2. 关键操作必追踪

```typescript
await agent.invoke(input, tracingConfig);

await agent.invoke(testInput);
```

### 3. 敏感信息必脱敏

```typescript
const anonymizer = createAnonymizer([
  { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/, replace: "<ssn>" },
  { pattern: /password[:=]\s*\S+/i, replace: "password=<redacted>" },
  { pattern: /api[_-]?key[:=]\s*\S+/i, replace: "api_key=<redacted>" },
]);
```

### 4. 有意义的标签

```typescript
const tags = [
  "production",
  "customer-service",
  `version-${packageJson.version}`,
  `model-${modelName}`,
];
```

---

## 监控仪表板功能

LangSmith Dashboard 提供的核心功能：

| 功能 | 说明 |
|------|------|
| **Trace 列表** | 查看所有追踪记录，支持筛选和搜索 |
| **Trace 详情** | 展开查看每个 Run 的输入、输出、耗时 |
| **性能统计** | 平均延迟、成功率、Token 消耗统计 |
| **错误追踪** | 快速定位失败的 Trace 和具体错误信息 |
| **对比分析** | 对比不同版本的 Agent 表现 |

---

## 避坑指南

### ❌ 坑 1：忘记设置环境变量

追踪不生效，通常是因为没设置 `LANGSMITH_TRACING=true`。

### ❌ 坑 2：敏感信息泄露

用户的手机号、身份证号被记录到 LangSmith。

**解决方案：** 始终配置 Anonymizer。

### ❌ 坑 3：追踪成本过高

所有调用都追踪，导致存储成本上升。

**解决方案：** 生产环境只追踪重要操作，测试环境可以追踪全部。

### ❌ 坑 4：标签混乱

没有统一的标签规范，后续筛选困难。

**解决方案：** 定义标签规范，如 `[environment]-[feature]-[version]`。

---

## 总结对比表

| 概念 | 说明 | 类比 |
|------|------|------|
| **Trace** | 完整的执行记录 | 一通电话录音 |
| **Run** | 单个执行步骤 | 电话中的每句对话 |
| **Project** | 追踪记录分组 | 文件夹 |
| **Tags** | 标签分类 | 便利贴 |
| **Metadata** | 附加信息 | 备注说明 |
| **Anonymizer** | 敏感信息脱敏 | 打码机 |

---

## 核心要点回顾

1. **开启追踪很简单** —— 设置环境变量 `LANGSMITH_TRACING=true`
2. **选择性追踪节省成本** —— 只在重要操作时使用 tracer
3. **标签和元数据很重要** —— 方便后续筛选和分析
4. **敏感信息必须脱敏** —— 使用 Anonymizer 保护用户隐私
5. **三大核心价值** —— Debug（调试）、Evaluate（评估）、Monitor（监控）

---

## 下一步学习

- **项目实战篇**：运用所学知识构建完整的 AI 应用
- **多轮对话助手**：实现带记忆的聊天机器人
- **智能审批系统**：构建多级审批工作流
