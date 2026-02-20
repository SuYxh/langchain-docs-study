> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用此文件来发现所有可用页面。

# 概览

> 从深度智能体运行与子智能体执行中流式获取实时更新

深度智能体构建于 LangGraph 的流式基础设施之上，并对**子智能体流**提供一等支持。当深度智能体将工作委派给子智能体时，你可以独立地从每个子智能体流式获取更新——实时跟踪进度、LLM token 以及工具调用。

深度智能体流式传输可以实现的能力：

* <Icon icon="diagram-subtask" size={16} /> [**流式展示子智能体进度**](#subagent-progress) — 在子智能体并行运行时跟踪其执行过程。
* <Icon icon="square-binary" size={16} /> [**流式输出 LLM token**](#llm-tokens) — 从主智能体与每个子智能体流式输出 token。
* <Icon icon="screwdriver-wrench" size={16} /> [**流式展示工具调用**](#tool-calls) — 查看子智能体执行过程中的工具调用与结果。
* <Icon icon="table" size={16} /> [**流式发送自定义更新**](#custom-updates) — 在子智能体节点内部发出用户自定义信号。

## 启用子图流式传输

深度智能体使用 LangGraph 的子图流式传输，将子智能体执行期间的事件暴露出来。要接收子智能体事件，请在流式传输时启用 `stream_subgraphs`。

```typescript  theme={null}
import { createDeepAgent } from "deepagents";

const agent = createDeepAgent({
  systemPrompt: "你是一位乐于助人的研究助手",
  subagents: [
    {
      name: "researcher",
      description: "对某个主题进行深入研究",
      systemPrompt: "你是一名严谨的研究员。",
    },
  ],
});

for await (const [namespace, chunk] of await agent.stream(
  { messages: [{ role: "user", content: "研究量子计算的最新进展" }] },
  {
    streamMode: "updates",
    subgraphs: true,  // [!code highlight]
  }
)) {
  if (namespace.length > 0) {
    // 子智能体事件 —— namespace 用于标识来源
    console.log(`[子智能体: ${namespace.join("|")}]`);
  } else {
    // 主智能体事件
    console.log("[主智能体]");
  }
  console.log(chunk);
}
```

## 命名空间

启用 `subgraphs` 后，每个流式事件都会包含一个**命名空间（namespace）**，用于标识由哪个智能体产生。命名空间是一条由节点名称与任务 ID 组成的路径，用于表示智能体层级结构。

| 命名空间                                  | 来源                                                         |
| ----------------------------------------- | ------------------------------------------------------------ |
| `()`（空）                                | 主智能体                                                     |
| `("tools:abc123",)`                       | 由主智能体的 `task` 工具调用 `abc123` 生成的子智能体           |
| `("tools:abc123", "model_request:def456")` | 子智能体内部的模型请求节点                                   |

使用命名空间将事件路由到正确的 UI 组件：

```typescript  theme={null}
for await (const [namespace, chunk] of await agent.stream(
  { messages: [{ role: "user", content: "规划我的假期" }] },
  { streamMode: "updates", subgraphs: true }
)) {
  // 判断该事件是否来自子智能体
  const isSubagent = namespace.some(
    (segment: string) => segment.startsWith("tools:")
  );

  if (isSubagent) {
    // 从命名空间中提取工具调用 ID
    const toolCallId = namespace
      .find((s: string) => s.startsWith("tools:"))
      ?.split(":")[1];
    console.log(`子智能体 ${toolCallId}:`, chunk);
  } else {
    console.log("主智能体:", chunk);
  }
}
```

## 子智能体进度

使用 `stream_mode="updates"` 在每一步完成时跟踪子智能体进度。这对于展示哪些子智能体处于活跃状态以及它们已完成了哪些工作非常有用。

```typescript  theme={null}
import { createDeepAgent } from "deepagents";

const agent = createDeepAgent({
  systemPrompt:
    "你是一名项目协调者。始终使用 task 工具将研究任务委派给你的 researcher 子智能体。" +
    "最终回复保持为一句话。",
  subagents: [
    {
      name: "researcher",
      description: "深入研究主题",
      systemPrompt:
        "你是一名严谨的研究员。研究给定主题，并用 2-3 句话给出简明总结。",
    },
  ],
});

for await (const [namespace, chunk] of await agent.stream(
  {
    messages: [
      { role: "user", content: "写一段关于 AI 安全的简短总结" },
    ],
  },
  { streamMode: "updates", subgraphs: true },
)) {
  // 主智能体更新（空命名空间）
  if (namespace.length === 0) {
    for (const [nodeName, data] of Object.entries(chunk)) {
      if (nodeName === "tools") {
        // 子智能体结果返回给主智能体
        for (const msg of (data as any).messages ?? []) {
          if (msg.type === "tool") {
            console.log(`\n子智能体完成：${msg.name}`);
            console.log(`  结果：${String(msg.content).slice(0, 200)}...`);
          }
        }
      } else {
        console.log(`[主智能体] 步骤：${nodeName}`);
      }
    }
  }
  // 子智能体更新（非空命名空间）
  else {
    for (const [nodeName] of Object.entries(chunk)) {
      console.log(`  [${namespace[0]}] 步骤：${nodeName}`);
    }
  }
}
```

```shell title="输出" theme={null}
主智能体步骤：model_request
  [tools:call_abc123] 步骤：model_request
  [tools:call_abc123] 步骤：tools
  [tools:call_abc123] 步骤：model_request
子智能体完成：task
结果：## AI Safety Report...
主智能体步骤：model_request
  [tools:call_def456] 步骤：model_request
  [tools:call_def456] 步骤：model_request
子智能体完成：task
结果：# Comprehensive Report on AI Safety...
主智能体步骤：model_request
```

## LLM token

使用 `stream_mode="messages"` 从主智能体与子智能体流式输出单个 token。每个消息事件都包含用于标识来源智能体的元数据。

```typescript  theme={null}
let currentSource = "";

for await (const [namespace, chunk] of await agent.stream(
  {
    messages: [
      {
        role: "user",
        content: "研究量子计算的最新进展",
      },
    ],
  },
  { streamMode: "messages", subgraphs: true },
)) {
  const [message] = chunk;

  // 判断该事件是否来自子智能体（namespace 包含 "tools:"）
  const isSubagent = namespace.some((s: string) => s.startsWith("tools:"));

  if (isSubagent) {
    // 来自子智能体的 token
    const subagentNs = namespace.find((s: string) => s.startsWith("tools:"))!;
    if (subagentNs !== currentSource) {
      process.stdout.write(`\n\n--- [子智能体: ${subagentNs}] ---\n`);
      currentSource = subagentNs;
    }
    if (message.text) {
      process.stdout.write(message.text);
    }
  } else {
    // 来自主智能体的 token
    if ("main" !== currentSource) {
      process.stdout.write(`\n\n--- [主智能体] ---\n`);
      currentSource = "main";
    }
    if (message.text) {
      process.stdout.write(message.text);
    }
  }
}

process.stdout.write("\n");
```

## 工具调用

当子智能体使用工具时，你可以流式获取工具调用事件，以展示每个子智能体正在做什么。工具调用 chunk 会出现在 `messages` 流模式中。

```typescript  theme={null}
import { AIMessageChunk, ToolMessage } from "langchain";

for await (const [namespace, chunk] of await agent.stream(
  {
    messages: [
      {
        role: "user",
        content: "研究近期量子计算的最新进展",
      },
    ],
  },
  { streamMode: "messages", subgraphs: true },
)) {
  const [message] = chunk;

  // 识别来源："main" 或子智能体的命名空间片段
  const isSubagent = namespace.some((s: string) => s.startsWith("tools:"));
  const source = isSubagent
    ? namespace.find((s: string) => s.startsWith("tools:"))!
    : "main";

  // 工具调用 chunk（流式工具调用）
  if (AIMessageChunk.isInstance(message) && message.tool_call_chunks?.length) {
    for (const tc of message.tool_call_chunks) {
      if (tc.name) {
        console.log(`\n[${source}] 工具调用：${tc.name}`);
      }
      // 参数会分块流式输出 —— 逐步写入
      if (tc.args) {
        process.stdout.write(tc.args);
      }
    }
  }

  // 工具结果
  if (ToolMessage.isInstance(message)) {
    console.log(
      `\n[${source}] 工具结果 [${message.name}]：${message.text?.slice(0, 150)}`,
    );
  }

  // 常规 AI 内容（跳过工具调用消息）
  if (
    AIMessageChunk.isInstance(message) &&
    message.text &&
    !message.tool_call_chunks?.length
  ) {
    process.stdout.write(message.text);
  }
}

process.stdout.write("\n");
```

## 自定义更新

在你的子智能体工具内部使用 `config.writer` 发出自定义进度事件：

```typescript  theme={null}
import { createDeepAgent } from "deepagents";
import { tool, type ToolRuntime } from "langchain";
import { z } from "zod";

/**
 * 一个通过 config.writer 发出自定义进度事件的工具。
 * writer 会将数据发送到 "custom" 流模式。
 */
const analyzeData = tool(
  async ({ topic }: { topic: string }, config: ToolRuntime) => {
    const writer = config.writer;

    writer?.({ status: "starting", topic, progress: 0 });
    await new Promise((r) => setTimeout(r, 500));

    writer?.({ status: "analyzing", progress: 50 });
    await new Promise((r) => setTimeout(r, 500));

    writer?.({ status: "complete", progress: 100 });
    return `对“${topic}”的分析：客户情绪 85% 为正面，主要由产品质量与支持响应时效驱动。`;
  },
  {
    name: "analyze_data",
    description:
      "对给定主题运行数据分析。" +
      "该工具执行实际分析并发出进度更新。" +
      "对于任何分析请求，你必须调用该工具。",
    schema: z.object({
      topic: z.string().describe("要分析的主题或对象"),
    }),
  },
);

const agent = createDeepAgent({
  systemPrompt:
    "你是一名协调者。对于任何分析请求，你必须使用 task 工具将其委派给 analyst 子智能体。" +
    "绝不要尝试直接回答。" +
    "在收到结果后，用一句话总结。",
  subagents: [
    {
      name: "analyst",
      description: "执行数据分析，并提供实时进度跟踪",
      systemPrompt:
        "你是一名数据分析师。对于每个分析请求，你必须调用 analyze_data 工具。" +
        "不要使用任何其他工具。" +
        "分析完成后，汇报结果。",
      tools: [analyzeData],
    },
  ],
});

for await (const [namespace, chunk] of await agent.stream(
  {
    messages: [
      {
        role: "user",
        content: "分析客户满意度趋势",
      },
    ],
  },
  { streamMode: "custom", subgraphs: true },
)) {
  const isSubagent = namespace.some((s: string) => s.startsWith("tools:"));
  if (isSubagent) {
    const subagentNs = namespace.find((s: string) => s.startsWith("tools:"))!;
    console.log(`[${subagentNs}]`, chunk);
  } else {
    console.log("[主智能体]", chunk);
  }
}
```

```shell title="输出" theme={null}
[tools:call_abc123] { status: 'fetching', progress: 0 }
[tools:call_abc123] { status: 'analyzing', progress: 50 }
[tools:call_abc123] { status: 'complete', progress: 100 }
```

## 流式传输多个模式

组合多个流模式，以获得对智能体执行过程的完整视图：

```typescript  theme={null}
// 跳过内部中间件步骤 —— 仅展示有意义的节点名称
const INTERESTING_NODES = new Set(["model_request", "tools"]);

let lastSource = "";
let midLine = false; // 当我们已输出 token 但还未写入行尾换行时为 true

for await (const [namespace, mode, data] of await agent.stream(
  {
    messages: [
      {
        role: "user",
        content: "分析远程办公对团队生产力的影响",
      },
    ],
  },
  { streamMode: ["updates", "messages", "custom"], subgraphs: true },
)) {
  const isSubagent = namespace.some((s: string) => s.startsWith("tools:"));
  const source = isSubagent ? "subagent" : "main";

  if (mode === "updates") {
    for (const nodeName of Object.keys(data)) {
      if (!INTERESTING_NODES.has(nodeName)) continue;
      if (midLine) {
        process.stdout.write("\n");
        midLine = false;
      }
      console.log(`[${source}] 步骤：${nodeName}`);
    }
  } else if (mode === "messages") {
    const [message] = data;
    if (message.text) {
      // 当来源发生变化时打印一个头部
      if (source !== lastSource) {
        if (midLine) {
          process.stdout.write("\n");
          midLine = false;
        }
        process.stdout.write(`\n[${source}] `);
        lastSource = source;
      }
      process.stdout.write(message.text);
      midLine = true;
    }
  } else if (mode === "custom") {
    if (midLine) {
      process.stdout.write("\n");
      midLine = false;
    }
    console.log(`[${source}] 自定义事件：`, data);
  }
}

process.stdout.write("\n");
```

## 常见模式

### 跟踪子智能体生命周期

监控子智能体何时开始、运行与完成：

```typescript  theme={null}
for await (const [namespace, chunk] of await agent.stream(
  {
    messages: [
      { role: "user", content: "研究最新的 AI 安全进展" },
    ],
  },
  { streamMode: "updates", subgraphs: true },
)) {
  for (const [nodeName, data] of Object.entries(chunk)) {
    // ─── 阶段 1：检测子智能体启动 ────────────────────────
    // 当主智能体的 model_request 包含 task 工具调用时，
    // 说明已生成一个子智能体。
    if (namespace.length === 0 && nodeName === "model_request") {
      for (const msg of (data as any).messages ?? []) {
        for (const tc of msg.tool_calls ?? []) {
          if (tc.name === "task") {
            activeSubagents.set(tc.id, {
              type: tc.args?.subagent_type,
              description: tc.args?.description?.slice(0, 80),
              status: "pending",
            });
            console.log(
              `[lifecycle] PENDING  → 子智能体 "${tc.args?.subagent_type}" (${tc.id})`,
            );
          }
        }
      }
    }

    // ─── 阶段 2：检测子智能体运行 ─────────────────────────
    // 当我们从 tools:UUID 命名空间收到事件时，
    // 该子智能体正在执行。
    if (namespace.length > 0 && namespace[0].startsWith("tools:")) {
      const pregelId = namespace[0].split(":")[1];
      // 检查是否需要将某个 pending 子智能体标记为 running。
      // 注意：pregel 任务 ID 与 tool_call_id 不同，
      // 因此我们在收到首个子智能体事件时，将任意一个 pending 子智能体标记为 running。
      for (const [id, sub] of activeSubagents) {
        if (sub.status === "pending") {
          sub.status = "running";
          console.log(
            `[lifecycle] RUNNING  → 子智能体 "${sub.type}"（pregel: ${pregelId}）`,
          );
          break;
        }
      }
    }

    // ─── 阶段 3：检测子智能体完成 ──────────────────────
    // 当主智能体的 tools 节点返回一条 tool 消息时，
    // 说明子智能体已完成并返回其结果。
    if (namespace.length === 0 && nodeName === "tools") {
      for (const msg of (data as any).messages ?? []) {
        if (msg.type === "tool") {
          const subagent = activeSubagents.get(msg.tool_call_id);
          if (subagent) {
            subagent.status = "complete";
            console.log(
              `[lifecycle] COMPLETE → 子智能体 "${subagent.type}" (${msg.tool_call_id})`,
            );
            console.log(
              `  结果预览：${String(msg.content).slice(0, 120)}...`,
            );
          }
        }
      }
    }
  }
}

// 打印最终状态
console.log("\n--- 最终子智能体状态 ---");
for (const [id, sub] of activeSubagents) {
  console.log(`  ${sub.type}: ${sub.status}`);
}
```

## 相关内容

* [子智能体](/oss/javascript/deepagents/subagents) — 配置并使用深度智能体的子智能体
* [前端流式传输](/oss/javascript/deepagents/streaming/frontend) — 使用 `useStream` 为深度智能体构建 React UI
* [LangChain 流式传输概览](/oss/javascript/langchain/streaming/overview) — LangChain 智能体的通用流式传输概念

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/streaming/overview.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[连接这些文档](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
