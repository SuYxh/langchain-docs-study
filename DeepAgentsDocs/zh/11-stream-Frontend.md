> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用此文件来发现所有可用页面。

# 前端

> 构建 React UI，用于展示深度智能体的实时子智能体流

`useStream` React Hook 为深度智能体流式传输提供了内置支持。它会自动跟踪子智能体生命周期，将子智能体消息与主对话流分离，并暴露丰富的 API，用于构建多智能体 UI。

深度智能体的关键特性：

* <Icon icon="diagram-subtask" size={16} /> **子智能体跟踪** — 自动管理每个子智能体的生命周期（pending、running、complete、error）
* <Icon icon="filter" size={16} /> **消息过滤** — 将子智能体消息从主对话流中分离
* <Icon icon="screwdriver-wrench" size={16} /> **工具调用可见性** — 在子智能体执行过程中访问工具调用及其结果
* <Icon icon="arrows-rotate" size={16} /> **状态重建** — 页面刷新后从线程历史中恢复子智能体状态

## 安装

在 React 应用中使用 `useStream` Hook，需要安装 LangGraph SDK：

```bash  theme={null}
npm install @langchain/langgraph-sdk
```

## 基础用法

要从包含子智能体的深度智能体进行流式传输，请使用 `filterSubagentMessages` 配置 `useStream`，并在提交时传入 `streamSubgraphs: true`：

```tsx  theme={null}
import { useStream } from "@langchain/langgraph-sdk/react";
import type { agent } from "./agent";

function DeepAgentChat() {
  const stream = useStream<typeof agent>({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    filterSubagentMessages: true,  // 将子智能体消息保持为独立流
  });

  const handleSubmit = (message: string) => {
    stream.submit(
      { messages: [{ content: message, type: "human" }] },
      { streamSubgraphs: true }  // 启用子智能体流式传输
    );
  };

  return (
    <div>
      {/* 主对话消息（已过滤掉子智能体消息） */}
      {stream.messages.map((message, idx) => (
        <div key={message.id ?? idx}>
          {message.type}: {message.content}
        </div>
      ))}

      {/* 子智能体进度 */}
      {stream.activeSubagents.length > 0 && (
        <div>
          <h3>活动子智能体：</h3>
          {stream.activeSubagents.map((subagent) => (
            <SubagentCard key={subagent.id} subagent={subagent} />
          ))}
        </div>
      )}

      {stream.isLoading && <div>加载中...</div>}
    </div>
  );
}
```

<Tip>
  了解如何将[你的深度智能体部署到 LangSmith](/oss/javascript/langchain/deploy)，以获得面向生产的托管能力，并内置可观测性、鉴权与扩缩容。
</Tip>

<Accordion title="深度智能体 `useStream` 参数">
  除了[标准 `useStream` 参数](/oss/javascript/langchain/streaming/frontend)之外，深度智能体流式传输还支持：

  <ParamField body="filterSubagentMessages" type="boolean" default="false">
    当为 `true` 时，子智能体消息会从主 `stream.messages` 数组中排除。请改为通过 `stream.subagents.get(id).messages` 访问它们。这能保持主对话更整洁。
  </ParamField>

  <ParamField body="subagentToolNames" type="string[]" default="['task']">
    用于生成子智能体的工具名称。默认情况下，深度智能体使用 `task` 工具将工作委派给子智能体。仅当你自定义了工具名称时才需要修改此项。
  </ParamField>
</Accordion>

<Accordion title="深度智能体 `useStream` 返回值">
  除了[标准返回值](/oss/javascript/langchain/streaming/frontend)之外，深度智能体流式传输还提供：

  <ParamField body="subagents" type="Map<string, SubagentStream>">
    所有子智能体的 Map，以工具调用 ID 为键。每个子智能体都包含其消息、状态、工具调用与结果。
  </ParamField>

  <ParamField body="activeSubagents" type="SubagentStream[]">
    当前正在运行的子智能体数组（状态为 `"pending"` 或 `"running"`）。
  </ParamField>

  <ParamField body="getSubagent" type="(toolCallId: string) => SubagentStream | undefined">
    通过工具调用 ID 获取指定子智能体。
  </ParamField>

  <ParamField body="getSubagentsByMessage" type="(messageId: string) => SubagentStream[]">
    获取由某条 AI 消息触发的所有子智能体。可用于将子智能体与生成它们的消息关联起来。
  </ParamField>

  <ParamField body="getSubagentsByType" type="(type: string) => SubagentStream[]">
    按 `subagent_type` 过滤子智能体（例如 `"researcher"`、`"writer"`）。
  </ParamField>
</Accordion>

## 子智能体流接口

`stream.subagents` Map 中的每个子智能体都会暴露一个类似流的接口：

```tsx  theme={null}
interface SubagentStream {
  // 身份
  id: string;                    // 工具调用 ID
  toolCall: {                    // 原始 task 工具调用
    subagent_type: string;
    description: string;
  };

  // 生命周期
  status: "pending" | "running" | "complete" | "error";
  startedAt: Date | null;
  completedAt: Date | null;
  isLoading: boolean;

  // 内容
  messages: Message[];           // 子智能体的消息
  values: Record<string, any>;   // 子智能体的状态
  result: string | null;         // 最终结果
  error: string | null;          // 错误信息

  // 工具调用
  toolCalls: ToolCallWithResult[];
  getToolCalls: (message: Message) => ToolCallWithResult[];

  // 层级
  depth: number;                 // 嵌套深度（顶层子智能体为 0）
  parentId: string | null;       // 父子智能体 ID（用于嵌套子智能体）
}
```

## 渲染子智能体流

### 子智能体卡片

构建用于展示每个子智能体流式内容、状态与进度的卡片：

```tsx  theme={null}
import { AIMessage } from "langchain";
import { useStream, type SubagentStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";
import type { agent } from "./agent";

function SubagentCard({ subagent }: { subagent: SubagentStream<typeof agent> }) {
  const content = getStreamingContent(subagent.messages);

  return (
    <div className="border rounded-lg p-4">
      {/* 头部 */}
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon status={subagent.status} />
        <span className="font-medium">{subagent.toolCall.subagent_type}</span>
        <span className="text-sm text-gray-500">
          {subagent.toolCall.description}
        </span>
      </div>

      {/* 流式内容 */}
      {content && (
        <div className="prose text-sm mt-2">
          {content}
        </div>
      )}

      {/* 结果 */}
      {subagent.status === "complete" && subagent.result && (
        <div className="mt-2 p-2 bg-green-50 rounded text-sm">
          {subagent.result}
        </div>
      )}

      {/* 错误 */}
      {subagent.status === "error" && subagent.error && (
        <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
          {subagent.error}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <span className="text-gray-400">⏳</span>;
    case "running":
      return <span className="animate-spin">⚙️</span>;
    case "complete":
      return <span className="text-green-500">✓</span>;
    case "error":
      return <span className="text-red-500">✗</span>;
    default:
      return null;
  }
}

/** 从子智能体消息中提取文本内容 */
function getStreamingContent(messages: Message[]): string {
  return messages
    .filter((m) => m.type === "ai")
    .map((m) => {
      if (typeof m.content === "string") return m.content;
      if (Array.isArray(m.content)) {
        return m.content
          .filter((c): c is { type: "text"; text: string } =>
            c.type === "text" && "text" in c
          )
          .map((c) => c.text)
          .join("");
      }
      return "";
    })
    .join("");
}
```

### 将子智能体映射到消息

使用 `getSubagentsByMessage` 将子智能体卡片与触发它们的 AI 消息关联起来：

```tsx  theme={null}
import { useMemo } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { agent } from "./agent";

function DeepAgentChat() {
  const stream = useStream<typeof agent>({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    filterSubagentMessages: true,
  });

  // 将子智能体映射到触发它们的人类消息
  const subagentsByMessage = useMemo(() => {
    const result = new Map();
    const messages = stream.messages;

    for (let i = 0; i < messages.length; i++) {
      if (messages[i].type !== "human") continue;

      // 下一条消息应该是带有 task 工具调用的 AI 消息
      const next = messages[i + 1];
      if (!next || next.type !== "ai" || !next.id) continue;

      const subagents = stream.getSubagentsByMessage(next.id);
      if (subagents.length > 0) {
        result.set(messages[i].id, subagents);
      }
    }
    return result;
  }, [stream.messages, stream.subagents]);

  return (
    <div>
      {stream.messages.map((message, idx) => (
        <div key={message.id ?? idx}>
          <MessageBubble message={message} />

          {/* 在触发它的那条人类消息之后展示子智能体流水线 */}
          {message.type === "human" && subagentsByMessage.has(message.id) && (
            <SubagentPipeline
              subagents={subagentsByMessage.get(message.id)!}
              isLoading={stream.isLoading}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

### 带进度的子智能体流水线

展示进度条与子智能体卡片网格：

```tsx  theme={null}
function SubagentPipeline({
  subagents,
  isLoading,
}: {
  subagents: SubagentStream[];
  isLoading: boolean;
}) {
  const completed = subagents.filter(
    (s) => s.status === "complete" || s.status === "error"
  ).length;

  const allDone = completed === subagents.length;

  return (
    <div className="my-4 space-y-3">
      {/* 进度头部 */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          子智能体（{completed}/{subagents.length}）
        </span>
        {allDone && isLoading && (
          <span className="text-blue-500 animate-pulse">
            正在综合结果...
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${(completed / subagents.length) * 100}%` }}
        />
      </div>

      {/* 子智能体卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {subagents.map((subagent) => (
          <SubagentCard key={subagent.id} subagent={subagent} />
        ))}
      </div>
    </div>
  );
}
```

## 渲染工具调用

使用 `toolCalls` 属性展示子智能体执行过程中的工具调用及其结果：

```tsx  theme={null}
function SubagentWithTools({ subagent }: { subagent: SubagentStream }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <StatusIcon status={subagent.status} />
        <span className="font-medium">{subagent.toolCall.subagent_type}</span>
        {subagent.toolCalls.length > 0 && (
          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
            {subagent.toolCalls.length} 次工具调用
          </span>
        )}
      </div>

      {/* 工具调用 */}
      {subagent.toolCalls.map((tc) => (
        <div key={tc.call.id} className="mb-2 p-2 bg-gray-50 rounded text-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs">{tc.call.name}</span>
            {tc.result !== undefined ? (
              <span className="text-green-600 text-xs">已完成</span>
            ) : (
              <span className="text-yellow-600 text-xs animate-pulse">
                运行中...
              </span>
            )}
          </div>

          {/* 工具参数 */}
          <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
            {JSON.stringify(tc.call.args, null, 2)}
          </pre>

          {/* 工具结果 */}
          {tc.result !== undefined && (
            <div className="mt-1 pt-1 border-t text-xs">
              {typeof tc.result === "string"
                ? tc.result.slice(0, 200)
                : JSON.stringify(tc.result, null, 2)}
            </div>
          )}
        </div>
      ))}

      {/* 流式内容 */}
      <div className="mt-2 prose text-sm">
        {getStreamingContent(subagent.messages)}
      </div>
    </div>
  );
}
```

## 线程持久化

在页面刷新后持久化线程 ID，使用户能够回到他们的深度智能体对话：

```tsx  theme={null}
import { useCallback, useState, useEffect } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { agent } from "./agent";

function useThreadIdParam() {
  const [threadId, setThreadId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("threadId");
  });

  const updateThreadId = useCallback((id: string) => {
    setThreadId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("threadId", id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  return [threadId, updateThreadId] as const;
}

function PersistentDeepAgentChat() {
  const [threadId, onThreadId] = useThreadIdParam();

  const stream = useStream<typeof agent>({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    filterSubagentMessages: true,
    threadId,
    onThreadId,
    reconnectOnMount: true,  // 页面刷新后自动恢复流
  });

  return (
    <div>
      {stream.messages.map((message, idx) => (
        <div key={message.id ?? idx}>
          {message.type}: {message.content}
        </div>
      ))}

      {/* 刷新后会从线程历史中重建子智能体 */}
      {[...stream.subagents.values()].map((subagent) => (
        <SubagentCard key={subagent.id} subagent={subagent} />
      ))}
    </div>
  );
}
```

<Note>
  当页面刷新时，`useStream` 会从线程历史中重建子智能体状态。已完成的子智能体会连同其最终状态与结果一并恢复，因此用户会看到包含子智能体工作的完整对话历史。
</Note>

## 类型安全

要获得完整的类型安全，请将你的智能体类型传给 `useStream`。这会让你以带类型的方式访问状态、消息、工具调用与子智能体数据：

```tsx  theme={null}
import { useStream } from "@langchain/langgraph-sdk/react";
import type { agent } from "./agent";

function TypedDeepAgentChat() {
  const stream = useStream<typeof agent>({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    filterSubagentMessages: true,
  });

  // stream.values 会按你的智能体状态类型进行推断
  // stream.messages 包含带类型的工具调用
  // stream.subagents 包含带类型的子智能体数据
}
```

## 完整示例

如需将上述所有模式组合起来的可运行实现，请参阅 LangGraph.js 仓库中的这些示例：

<Card title="深度智能体示例" icon="diagram-subtask" href="https://github.com/langchain-ai/langgraphjs/tree/main/examples/ui-react/src/examples/deepagent">
  并行子智能体与网格布局、流式内容、进度跟踪与综合结果检测。
</Card>

<Card title="带工具调用的深度智能体" icon="screwdriver-wrench" href="https://github.com/langchain-ai/langgraphjs/tree/main/examples/ui-react/src/examples/deepagent-tools">
  工具调用可见性、线程持久化、可展开的子智能体卡片，以及页面刷新后的自动重连。
</Card>

## 相关内容

* [流式传输概览](/oss/javascript/deepagents/streaming/overview) — 使用深度智能体的服务端流式传输
* [子智能体](/oss/javascript/deepagents/subagents) — 配置并使用深度智能体的子智能体
* [LangChain 前端流式传输](/oss/javascript/langchain/streaming/frontend) — 通用 `useStream` 文档
* [useStream API 参考](https://reference.langchain.com/javascript/functions/_langchain_langgraph-sdk.react.useStream.html) — 完整 API 文档
* [Agent Chat UI](/oss/javascript/langchain/ui) — 面向 LangGraph 智能体的预构建聊天界面

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/streaming/frontend.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[连接这些文档](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
