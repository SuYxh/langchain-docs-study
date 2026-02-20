## 文档索引
在以下位置获取完整的文档索引：https://docs.langchain.com/llms.txt
使用此文件在进一步探索之前发现所有可用页面。

# 前端

> 使用来自 LangChain 代理、LangGraph 图和自定义 API 的实时流构建生成式 UI

`useStream` React hook 提供了与 LangGraph 流式传输功能的无缝集成。它处理了流式传输、状态管理和分支逻辑的所有复杂性，让您可以专注于构建出色的生成式 UI 体验。

主要特性：

* <Icon icon="messages" size={16} /> **消息流式传输** — 处理消息块流以形成完整的消息
* <Icon icon="arrows-rotate" size={16} /> **自动状态管理** — 针对消息、中断、加载状态和错误
* <Icon icon="code-branch" size={16} /> **对话分支** — 从聊天历史记录的任何点创建备用对话路径
* <Icon icon="palette" size={16} /> **UI 无关设计** — 自带组件和样式

## 安装

安装 LangGraph SDK 以在您的 React 应用程序中使用 `useStream` hook：

```bash  theme={null}
npm install @langchain/langgraph-sdk
```

## 基本用法

`useStream` hook 可以连接到任何 LangGraph 图，无论是从您自己的端点运行，还是使用 [LangSmith deployments](/langsmith/deployments) 部署的。

```tsx  theme={null}
import { useStream } from "@langchain/langgraph-sdk/react";

function Chat() {
  const stream = useStream({
    assistantId: "agent",
    // 本地开发
    apiUrl: "http://localhost:2024",
    // 生产部署 (LangSmith 托管)
    // apiUrl: "https://your-deployment.us.langgraph.app"
  });

  const handleSubmit = (message: string) => {
    stream.submit({
      messages: [
        { content: message, type: "human" }
      ],
    });
  };

  return (
    <div>
      {stream.messages.map((message, idx) => (
        <div key={message.id ?? idx}>
          {message.type}: {message.content}
        </div>
      ))}

      {stream.isLoading && <div>Loading...</div>}
      {stream.error && <div>Error: {stream.error.message}</div>}
    </div>
  );
}
```

<Tip>
  了解如何 [将您的代理部署到 LangSmith](/oss/javascript/langchain/deploy) 以获得具有内置可观测性、身份验证和扩展性的生产就绪型托管。
</Tip>

<Accordion title="`useStream` 参数">
  <ParamField body="assistantId" type="string" required>
    要连接的代理的 ID。使用 LangSmith 部署时，这必须与部署仪表板中显示的代理 ID 匹配。对于自定义 API 部署或本地开发，这可以是您的服务器用于标识代理的任何字符串。
  </ParamField>

  <ParamField body="apiUrl" type="string">
    LangGraph 服务器的 URL。本地开发默认为 `http://localhost:2024`。
  </ParamField>

  <ParamField body="apiKey" type="string">
    用于身份验证的 API 密钥。连接到 LangSmith 上部署的代理时需要。
  </ParamField>

  <ParamField body="threadId" type="string">
    连接到现有线程而不是创建新线程。用于恢复对话。
  </ParamField>

  <ParamField body="onThreadId" type="(id: string) => void">
    创建新线程时调用的回调。使用它来持久化线程 ID 以供以后使用。
  </ParamField>

  <ParamField body="reconnectOnMount" type="boolean | (() => Storage)">
    组件挂载时自动恢复正在进行的运行。设置为 `true` 以使用会话存储，或提供自定义存储函数。
  </ParamField>

  <ParamField body="onCreated" type="(run: Run) => void">
    创建新运行时调用的回调。用于持久化运行元数据以进行恢复。
  </ParamField>

  <ParamField body="onError" type="(error: Error) => void">
    流式传输期间发生错误时调用的回调。
  </ParamField>

  <ParamField body="onFinish" type="(state: StateType, run?: Run) => void">
    流式传输成功完成并返回最终状态时调用的回调。
  </ParamField>

  <ParamField body="onCustomEvent" type="(data: unknown, context: { mutate }) => void">
    使用 `writer` 处理从您的代理发出的自定义事件。请参阅 [自定义流式事件](#custom-streaming-events)。
  </ParamField>

  <ParamField body="onUpdateEvent" type="(data: unknown, context: { mutate }) => void">
    处理每个图步骤后的状态更新事件。
  </ParamField>

  <ParamField body="onMetadataEvent" type="(metadata: { run_id, thread_id }) => void">
    处理包含运行和线程信息的元数据事件。
  </ParamField>

  <ParamField body="messagesKey" type="string" default="messages">
    图状态中包含消息数组的键。
  </ParamField>

  <ParamField body="throttle" type="boolean" default="true">
    批量处理状态更新以获得更好的渲染性能。禁用以进行立即更新。
  </ParamField>

  <ParamField body="initialValues" type="StateType | null">
    第一个流加载时显示的初始状态值。用于立即显示缓存的线程数据。
  </ParamField>
</Accordion>

<Accordion title="`useStream` 返回值">
  <ParamField body="messages" type="Message[]">
    当前线程中的所有消息，包括人类和 AI 消息。
  </ParamField>

  <ParamField body="values" type="StateType">
    当前的图状态值。类型是从代理或图类型参数推断出来的。
  </ParamField>

  <ParamField body="isLoading" type="boolean">
    流是否当前正在进行中。使用它来显示加载指示器。
  </ParamField>

  <ParamField body="error" type="Error | null">
    流式传输期间发生的任何错误。没有错误时为 `null`。
  </ParamField>

  <ParamField body="interrupt" type="Interrupt | undefined">
    当前需要用户输入的中断，例如人机交互 (human-in-the-loop) 批准请求。
  </ParamField>

  <ParamField body="toolCalls" type="ToolCallWithResult[]">
    所有消息中的所有工具调用，及其结果和状态（`pending`、`completed` 或 `error`）。
  </ParamField>

  <ParamField body="submit" type="(input, options?) => Promise<void>">
    向代理提交新输入。当使用命令从中断恢复时，传递 `null` 作为输入。选项包括用于分支的 `checkpoint`、用于乐观更新的 `optimisticValues` 和用于乐观线程创建的 `threadId`。
  </ParamField>

  <ParamField body="stop" type="() => void">
    立即停止当前流。
  </ParamField>

  <ParamField body="joinStream" type="(runId: string) => void">
    通过运行 ID 恢复现有流。与 `onCreated` 一起使用以进行手动流恢复。
  </ParamField>

  <ParamField body="setBranch" type="(branch: string) => void">
    切换到对话历史记录中的不同分支。
  </ParamField>

  <ParamField body="getToolCalls" type="(message) => ToolCall[]">
    获取特定 AI 消息的所有工具调用。
  </ParamField>

  <ParamField body="getMessagesMetadata" type="(message) => MessageMetadata">
    获取消息的元数据，包括用于识别源节点的 `langgraph_node` 等流式信息，以及用于分支的 `firstSeenState`。
  </ParamField>

  <ParamField body="experimental_branchTree" type="BranchTree">
    用于非基于消息的图的高级分支控制的线程树表示。
  </ParamField>
</Accordion>

## 线程管理

使用内置的线程管理跟踪对话。您可以访问当前线程 ID 并在创建新线程时获得通知：

```tsx  theme={null}
import { useState } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";

function Chat() {
  const [threadId, setThreadId] = useState<string | null>(null);

  const stream = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    threadId: threadId,
    onThreadId: setThreadId,
  });

  // 创建新线程时 threadId 会更新
  // 将其存储在 URL 参数或 localStorage 中以进行持久化
}
```

我们建议存储 `threadId` 以便用户在页面刷新后恢复对话。

### 页面刷新后恢复

`useStream` hook 可以通过设置 `reconnectOnMount: true` 在挂载时自动恢复正在进行的运行。这对于在页面刷新后继续流式传输非常有用，可确保不会丢失停机期间生成的消息和事件。

```tsx  theme={null}
const stream = useStream({
  apiUrl: "http://localhost:2024",
  assistantId: "agent",
  reconnectOnMount: true,
});
```

默认情况下，创建的运行 ID 存储在 `window.sessionStorage` 中，可以通过传递自定义存储函数来交换：

```tsx  theme={null}
const stream = useStream({
  apiUrl: "http://localhost:2024",
  assistantId: "agent",
  reconnectOnMount: () => window.localStorage,
});
```

要手动控制恢复过程，请使用运行回调来持久化元数据，并使用 `joinStream` 进行恢复：

```tsx  theme={null}
import { useStream } from "@langchain/langgraph-sdk/react";
import { useEffect, useRef } from "react";

function Chat({ threadId }: { threadId: string | null }) {
  const stream = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    threadId,
    onCreated: (run) => {
      // 流开始时持久化运行 ID
      window.sessionStorage.setItem(`resume:${run.thread_id}`, run.run_id);
    },
    onFinish: (_, run) => {
      // 流完成时清理
      window.sessionStorage.removeItem(`resume:${run?.thread_id}`);
    },
  });

  // 如果有存储的运行 ID，则在挂载时恢复流
  const joinedThreadId = useRef<string | null>(null);
  useEffect(() => {
    if (!threadId) return;
    const runId = window.sessionStorage.getItem(`resume:${threadId}`);
    if (runId && joinedThreadId.current !== threadId) {
      stream.joinStream(runId);
      joinedThreadId.current = threadId;
    }
  }, [threadId]);

  const handleSubmit = (text: string) => {
    // 使用 streamResumable 确保不会丢失事件
    stream.submit(
      { messages: [{ type: "human", content: text }] },
      { streamResumable: true }
    );
  };
}
```

<Card title="尝试会话持久化示例" icon="rotate" href="https://github.com/langchain-ai/langgraphjs/tree/main/examples/ui-react/src/examples/session-persistence">
  在 `session-persistence` 示例中查看带有 `reconnectOnMount` 和线程持久化的流恢复的完整实现。
</Card>

## 乐观更新

您可以在执行网络请求之前乐观地更新客户端状态，从而向用户提供即时反馈：

```tsx  theme={null}
const stream = useStream({
  apiUrl: "http://localhost:2024",
  assistantId: "agent",
});

const handleSubmit = (text: string) => {
  const newMessage = { type: "human" as const, content: text };

  stream.submit(
    { messages: [newMessage] },
    {
      optimisticValues(prev) {
        const prevMessages = prev.messages ?? [];
        return { ...prev, messages: [...prevMessages, newMessage] };
      },
    }
  );
};
```

### 乐观线程创建

在 `submit` 中使用 `threadId` 选项以启用乐观 UI 模式，在这种模式下，您需要在创建线程之前知道线程 ID：

```tsx  theme={null}
import { useState } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";

function Chat() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [optimisticThreadId] = useState(() => crypto.randomUUID());

  const stream = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    threadId,
    onThreadId: setThreadId,
  });

  const handleSubmit = (text: string) => {
    // 立即导航，无需等待线程创建
    window.history.pushState({}, "", `/threads/${optimisticThreadId}`);

    // 使用预定的 ID 创建线程
    stream.submit(
      { messages: [{ type: "human", content: text }] },
      { threadId: optimisticThreadId }
    );
  };
}
```

### 缓存线程显示

使用 `initialValues` 选项在从服务器加载历史记录的同时立即显示缓存的线程数据：

```tsx  theme={null}
function Chat({ threadId, cachedData }) {
  const stream = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    threadId,
    initialValues: cachedData?.values,
  });

  // 立即显示缓存的消息，然后在服务器响应时更新
}
```

## 分支

通过编辑以前的消息或重新生成 AI 响应来创建备用对话路径。使用 `getMessagesMetadata()` 访问用于分支的检查点信息：

<CodeGroup>
  ```tsx Chat.tsx theme={null}
  import { useStream } from "@langchain/langgraph-sdk/react";
  import { BranchSwitcher } from "./BranchSwitcher";

  function Chat() {
    const stream = useStream({
      assistantId: "agent",
      apiUrl: "http://localhost:2024",
    });

    return (
      <div>
        {stream.messages.map((message) => {
          const meta = stream.getMessagesMetadata(message);
          const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;

          return (
            <div key={message.id}>
              <div>{message.content as string}</div>

              {/* 编辑人类消息 */}
              {message.type === "human" && (
                <button
                  onClick={() => {
                    const newContent = prompt("Edit message:", message.content as string);
                    if (newContent) {
                      stream.submit(
                        { messages: [{ type: "human", content: newContent }] },
                        { checkpoint: parentCheckpoint }
                      );
                    }
                  }}
                >
                  Edit
                </button>
              )}

              {/* 重新生成 AI 消息 */}
              {message.type === "ai" && (
                <button
                  onClick={() => stream.submit(undefined, { checkpoint: parentCheckpoint })}
                >
                  Regenerate
                </button>
              )}

              {/* 在分支之间切换 */}
              <BranchSwitcher
                branch={meta?.branch}
                branchOptions={meta?.branchOptions}
                onSelect={(branch) => stream.setBranch(branch)}
              />
            </div>
          );
        })}
      </div>
    );
  }
  ```

  ```tsx BranchSwitcher.tsx theme={null}
  /**
   * 用于在对话分支之间导航的组件。
   * 显示当前分支位置并允许在备选方案之间切换。
   */
  export function BranchSwitcher({
    branch,
    branchOptions,
    onSelect,
  }: {
    branch: string | undefined;
    branchOptions: string[] | undefined;
    onSelect: (branch: string) => void;
  }) {
    if (!branchOptions || !branch) return null;
    const index = branchOptions.indexOf(branch);

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => onSelect(branchOptions[index - 1])}
        >
          ←
        </button>
        <span>{index + 1} / {branchOptions.length}</span>
        <button
          type="button"
          disabled={index >= branchOptions.length - 1}
          onClick={() => onSelect(branchOptions[index + 1])}
        >
          →
        </button>
      </div>
    );
  }
  ```
</CodeGroup>

对于高级用例，请使用 `experimental_branchTree` 属性来获取非基于消息的图的线程树表示。

<Card title="尝试分支示例" icon="code-branch" href="https://github.com/langchain-ai/langgraphjs/tree/main/examples/ui-react/src/examples/branching-chat">
  在 `branching-chat` 示例中查看对话分支的完整实现，包括编辑、重新生成和分支切换。
</Card>

## 类型安全流式传输

`useStream` hook 在与通过 [`createAgent`](https://reference.langchain.com/javascript/functions/langchain.index.createAgent.html) 创建的代理或通过 [`StateGraph`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.StateGraph.html) 创建的图一起使用时，支持完整的类型推断。传递 `typeof agent` 或 `typeof graph` 作为类型参数以自动推断工具调用类型。

### 使用 `createAgent`

当使用 [`createAgent`](https://reference.langchain.com/javascript/functions/langchain.index.createAgent.html) 时，工具调用类型会自动从您注册到代理的工具中推断出来：

<CodeGroup>
  ```typescript agent.ts theme={null}
  import { createAgent, tool } from "langchain";
  import { z } from "zod";

  const getWeather = tool(
    async ({ location }) => `Weather in ${location}: Sunny, 72°F`,
    {
      name: "get_weather",
      description: "Get weather for a location",
      schema: z.object({
        location: z.string().describe("The city to get weather for"),
      }),
    }
  );

  export const agent = createAgent({
    model: "openai:gpt-4.1-mini",
    tools: [getWeather],
  });
  ```

  ```tsx Chat.tsx theme={null}
  import { useStream } from "@langchain/langgraph-sdk/react";
  import type { agent } from "./agent";

  function Chat() {
    // 工具调用会根据代理的工具自动设定类型
    const stream = useStream<typeof agent>({
      assistantId: "agent",
      apiUrl: "http://localhost:2024",
    });

    // stream.toolCalls[0].call.name 类型为 "get_weather"
    // stream.toolCalls[0].call.args 类型为 { location: string }
  }
  ```
</CodeGroup>

### 使用 `StateGraph`

对于自定义 [`StateGraph`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.StateGraph.html) 应用程序，状态类型是从图的注释中推断出来的：

<CodeGroup>
  ```typescript graph.ts theme={null}
  import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
  import { ChatOpenAI } from "@langchain/openai";

  const model = new ChatOpenAI({ model: "gpt-4.1-mini" });

  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      const response = await model.invoke(state.messages);
      return { messages: [response] };
    })
    .addEdge(START, "agent")
    .addEdge("agent", END);

  export const graph = workflow.compile();
  ```

  ```tsx Chat.tsx theme={null}
  import { useStream } from "@langchain/langgraph-sdk/react";
  import type { graph } from "./graph";

  function Chat() {
    // 状态类型会自动从图中推断出来
    const stream = useStream<typeof graph>({
      assistantId: "my-graph",
      apiUrl: "http://localhost:2024",
    });

    // stream.values 基于图的状态注释进行类型定义
  }
  ```
</CodeGroup>

### 使用 Annotation 类型

如果您正在使用 LangGraph.js，您可以重用图的 Annotation 类型。请确保仅导入类型，以避免导入整个 LangGraph.js 运行时：

```tsx  theme={null}
import {
  Annotation,
  MessagesAnnotation,
  type StateType,
  type UpdateType,
} from "@langchain/langgraph/web";

const AgentState = Annotation.Root({
  ...MessagesAnnotation.spec,
  context: Annotation<string>(),
});

const stream = useStream<
  StateType<typeof AgentState.spec>,
  { UpdateType: UpdateType<typeof AgentState.spec> }
>({
  apiUrl: "http://localhost:2024",
  assistantId: "agent",
});
```

### 高级类型配置

您可以为中断、自定义事件和可配置选项指定其他类型参数：

```tsx  theme={null}
import type { Message } from "@langchain/langgraph-sdk";

type State = { messages: Message[]; context?: string };

const stream = useStream<
  State,
  {
    UpdateType: { messages: Message[] | Message; context?: string };
    InterruptType: string;
    CustomEventType: { type: "progress" | "debug"; payload: unknown };
    ConfigurableType: { model: string };
  }
>({
  apiUrl: "http://localhost:2024",
  assistantId: "agent",
});

// stream.interrupt 类型为 string | undefined
// onCustomEvent 接收类型化的事件
```

## 渲染工具调用

使用 `getToolCalls` 从 AI 消息中提取并渲染工具调用。工具调用包括调用详细信息、结果（如果已完成）和状态。

<CodeGroup>
  ```tsx Chat.tsx theme={null}
  import { useStream } from "@langchain/langgraph-sdk/react";
  import type { agent } from "./agent";
  import { ToolCallCard } from "./ToolCallCard";
  import { MessageBubble } from "./MessageBubble";

  function Chat() {
    const stream = useStream<typeof agent>({
      assistantId: "agent",
      apiUrl: "http://localhost:2024",
    });

    return (
      <div className="flex flex-col gap-4">
        {stream.messages.map((message, idx) => {
          if (message.type === "ai") {
            const toolCalls = stream.getToolCalls(message);

            if (toolCalls.length > 0) {
              return (
                <div key={message.id ?? idx} className="flex flex-col gap-2">
                  {toolCalls.map((toolCall) => (
                    <ToolCallCard key={toolCall.id} toolCall={toolCall} />
                  ))}
                </div>
              );
            }
          }

          return <MessageBubble key={message.id ?? idx} message={message} />;
        })}
      </div>
    );
  }
  ```

  ```tsx ToolCallCard.tsx theme={null}
  import type {
    ToolCallWithResult,
    ToolCallFromTool,
    ToolCallState,
    InferAgentToolCalls,
  } from "@langchain/langgraph-sdk/react";
  import type { ToolMessage } from "@langchain/langgraph-sdk";
  import type { agent } from "./agent";
  import type { getWeather } from "./tools";
  import { parseToolResult } from "./utils";
  import { WeatherCard } from "./WeatherCard";

  /**
   * 为此组件定义工具调用类型。
   * 对于代理使用 InferAgentToolCalls，对于单个工具使用 ToolCallFromTool。
   */
  type AgentToolCalls = InferAgentToolCalls<typeof agent>;

  /**
   * 渲染工具调用及其结果的组件。
   * 使用类型化的 ToolCallWithResult 进行可辨识联合类型缩小。
   */
  export function ToolCallCard({
    toolCall,
  }: {
    toolCall: ToolCallWithResult<AgentToolCalls>;
  }) {
    const { call, result, state } = toolCall;

    // 当 call.name 是字面量类型时，类型缩小起作用
    if (call.name === "get_weather") {
      return <WeatherCard call={call} result={result} state={state} />;
    }

    // 其他工具的后备方案
    return <GenericToolCallCard call={call} result={result} state={state} />;
  }
  ```

  ```tsx GenericToolCallCard.tsx theme={null}
  import type { ToolCallState } from "@langchain/langgraph-sdk/react";
  import type { ToolMessage } from "@langchain/langgraph-sdk";
  import { parseToolResult } from "./utils";

  /**
   * 未知或未处理工具的通用后备方案。
   * 使用适用于任何工具调用的简单类型。
   */
  export function GenericToolCallCard({
    call,
    result,
    state,
  }: {
    call: { name: string; args: Record<string, unknown> };
    result?: ToolMessage;
    state: ToolCallState;
  }) {
    const isLoading = state === "pending";
    const parsedResult = parseToolResult(result);

    return (
      <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <div className="text-sm font-medium text-white font-mono">
              {call.name}
            </div>
            <div className="text-xs text-neutral-500">
              {isLoading ? "Processing..." : "Completed"}
            </div>
          </div>
        </div>
        <pre className="text-xs bg-black rounded p-2 mb-2 overflow-x-auto">
          {JSON.stringify(call.args, null, 2)}
        </pre>
        {result && (
          <div className="text-sm rounded-lg p-3 bg-black text-neutral-300">
            {parsedResult.content}
          </div>
        )}
      </div>
    );
  }
  ```

  ```tsx WeatherCard.tsx theme={null}
  import type { ToolCallFromTool, ToolCallState } from "@langchain/langgraph-sdk/react";
  import type { ToolMessage } from "@langchain/langgraph-sdk";
  import type { getWeather } from "./tools";
  import { parseToolResult } from "./utils";

  // 直接从工具定义推断工具调用类型
  type GetWeatherToolCall = ToolCallFromTool<typeof getWeather>;

  /**
   * 具有丰富 UI 的天气特定工具卡片。
   * 使用 ToolCallFromTool 从工具架构推断 args 类型。
   */
  export function WeatherCard({
    call,
    result,
    state,
  }: {
    call: GetWeatherToolCall;
    result?: ToolMessage;
    state: ToolCallState;
  }) {
    const isLoading = state === "pending";
    const parsedResult = parseToolResult(result);

    return (
      <div className="relative overflow-hidden rounded-xl">
        {/* 天空渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-600 to-indigo-600" />

        <div className="relative p-4">
          <div className="flex items-center gap-2 text-white/80 text-xs mb-3">
            {/* call.args 类型为 { location: string }，来自工具架构 */}
            <span className="font-medium">{call.args.location}</span>
            {isLoading && <span className="ml-auto">Loading...</span>}
          </div>

          {parsedResult.status === "error" ? (
            <div className="bg-red-500/20 rounded-lg p-3 text-red-200 text-sm">
              {parsedResult.content}
            </div>
          ) : (
            <div className="text-white text-lg font-medium">
              {parsedResult.content || "Fetching weather..."}
            </div>
          )}
        </div>
      </div>
    );
  }
  ```

  ```typescript tools.ts theme={null}
  import { tool } from "@langchain/core/tools";
  import { z } from "zod";

  // 使用 Zod 架构定义天气工具
  export const getWeather = tool(
    async ({ location }) => {
      // 工具实现
      return JSON.stringify({ status: "success", content: `Weather in ${location}: Sunny, 72°F` });
    },
    {
      name: "get_weather",
      description: "Get the current weather for a location",
      schema: z.object({
        location: z.string().describe("The city and state, e.g. San Francisco, CA"),
      }),
    }
  );
  ```

  ```typescript utils.ts theme={null}
  import type { ToolMessage } from "@langchain/langgraph-sdk";

  /**
   * 安全解析工具结果的辅助函数。
   * 工具结果可以是 JSON 字符串或纯文本。
   */
  export function parseToolResult(result?: ToolMessage): {
    status: string;
    content: string;
  } {
    if (!result) return { status: "pending", content: "" };
    try {
      return JSON.parse(result.content as string);
    } catch {
      return { status: "success", content: result.content as string };
    }
  }
  ```
</CodeGroup>

<Card title="尝试工具调用示例" icon="hammer" href="https://github.com/langchain-ai/langgraphjs/tree/main/examples/ui-react/src/examples/tool-calling-agent">
  在 `tool-calling-agent` 示例中查看带有天气、计算器和笔记工具的工具调用渲染的完整实现。
</Card>

## 自定义流式事件

使用工具或节点中的 `writer` 从您的代理流式传输自定义数据。使用 `onCustomEvent` 回调在 UI 中处理这些事件。

<CodeGroup>
  ```typescript agent.ts theme={null}
  import { tool, type ToolRuntime } from "langchain";
  import { z } from "zod";

  // 定义您的自定义事件类型
  interface ProgressData {
    type: "progress";
    id: string;
    message: string;
    progress: number;
  }

  const analyzeDataTool = tool(
    async ({ dataSource }, config: ToolRuntime) => {
      const steps = ["Connecting...", "Fetching...", "Processing...", "Done!"];

      for (let i = 0; i < steps.length; i++) {
        // 在执行期间发出进度事件
        config.writer?.({
          type: "progress",
          id: `analysis-${Date.now()}`,
          message: steps[i],
          progress: ((i + 1) / steps.length) * 100,
        } satisfies ProgressData);

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      return JSON.stringify({ result: "Analysis complete" });
    },
    {
      name: "analyze_data",
      description: "Analyze data with progress updates",
      schema: z.object({
        dataSource: z.string().describe("Data source to analyze"),
      }),
    }
  );
  ```

  ```tsx Chat.tsx theme={null}
  import { useState, useCallback } from "react";
  import { useStream } from "@langchain/langgraph-sdk/react";
  import type { agent } from "./agent";

  interface ProgressData {
    type: "progress";
    id: string;
    message: string;
    progress: number;
  }

  function isProgressData(data: unknown): data is ProgressData {
    return (
      typeof data === "object" &&
      data !== null &&
      "type" in data &&
      (data as ProgressData).type === "progress"
    );
  }

  function CustomStreamingUI() {
    const [progressData, setProgressData] = useState<Map<string, ProgressData>>(
      new Map()
    );

    const handleCustomEvent = useCallback((data: unknown) => {
      if (isProgressData(data)) {
        setProgressData((prev) => {
          const updated = new Map(prev);
          updated.set(data.id, data);
          return updated;
        });
      }
    }, []);

    const stream = useStream<typeof agent>({
      assistantId: "custom-streaming",
      apiUrl: "http://localhost:2024",
      onCustomEvent: handleCustomEvent,
    });

    return (
      <div>
        {/* 渲染进度卡片 */}
        {Array.from(progressData.values()).map((data) => (
          <div key={data.id} className="bg-neutral-800 rounded-lg p-4 mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-white">{data.message}</span>
              <span className="text-xs text-neutral-400">{data.progress}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${data.progress}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }
  ```
</CodeGroup>

<Card title="尝试自定义流式示例" icon="bolt" href="https://github.com/langchain-ai/langgraphjs/tree/main/examples/ui-react/src/examples/custom-streaming">
  在 `custom-streaming` 示例中查看带有进度条、状态徽章和文件操作卡片的自定义事件的完整实现。
</Card>

## 事件处理

`useStream` hook 提供了回调选项，让您可以访问不同类型的流式事件。您不需要显式配置流模式——只需为您想要处理的事件类型传递回调：

```tsx  theme={null}
const stream = useStream({
  apiUrl: "http://localhost:2024",
  assistantId: "agent",

  // 处理每个图步骤后的状态更新
  onUpdateEvent: (update, options) => {
    console.log("Graph update:", update);
  },

  // 处理从您的图流式传输的自定义事件
  onCustomEvent: (event, options) => {
    console.log("Custom event:", event);
  },

  // 处理带有运行/线程信息的元数据事件
  onMetadataEvent: (metadata) => {
    console.log("Run ID:", metadata.run_id);
    console.log("Thread ID:", metadata.thread_id);
  },

  onError: (error) => {
    console.error("Stream error:", error);
  },

  onFinish: (state, options) => {
    console.log("Stream finished with final state:", state);
  },
});
```

### 可用回调

| 回调 | 描述 | 流模式 |
| ----------------- | ------------------------------------------------------------ | ----------- |
| `onUpdateEvent` | 在每个图步骤后接收到状态更新时调用 | `updates` |
| `onCustomEvent` | 当从您的图接收到自定义事件时调用 | `custom` |
| `onMetadataEvent` | 使用运行和线程元数据调用 | `metadata` |
| `onError` | 发生错误时调用 | - |
| `onFinish` | 流完成时调用 | - |

## 多智能体流式传输

在处理多智能体系统或具有多个节点的图时，使用消息元数据来标识哪个节点生成了每条消息。当多个 LLM 并行运行并且您希望以不同的视觉样式显示其输出时，这特别有用。

<CodeGroup>
  ```tsx Chat.tsx theme={null}
  import { useStream } from "@langchain/langgraph-sdk/react";
  import type { agent } from "./agent";
  import { MessageBubble } from "./MessageBubble";

  // 用于视觉显示的节点配置
  const NODE_CONFIG: Record<string, { label: string; color: string }> = {
    researcher_analytical: { label: "Analytical Research", color: "cyan" },
    researcher_creative: { label: "Creative Research", color: "purple" },
    researcher_practical: { label: "Practical Research", color: "emerald" },
  };

  function MultiAgentChat() {
    const stream = useStream<typeof agent>({
      assistantId: "parallel-research",
      apiUrl: "http://localhost:2024",
    });

    return (
      <div className="flex flex-col gap-4">
        {stream.messages.map((message, idx) => {
          if (message.type !== "ai") {
            return <MessageBubble key={message.id ?? idx} message={message} />;
          }

          // 获取流式元数据以识别源节点
          const metadata = stream.getMessagesMetadata?.(message);
          const nodeName =
            (metadata?.streamMetadata?.langgraph_node as string) ||
            (message as { name?: string }).name;

          const config = nodeName ? NODE_CONFIG[nodeName] : null;

          if (!config) {
            return <MessageBubble key={message.id ?? idx} message={message} />;
          }

          return (
            <div
              key={message.id ?? idx}
              className={`bg-${config.color}-950/30 border border-${config.color}-500/30 rounded-xl p-4`}
            >
              <div className={`text-sm font-semibold text-${config.color}-400 mb-2`}>
                {config.label}
              </div>
              <div className="text-neutral-200 whitespace-pre-wrap">
                {typeof message.content === "string" ? message.content : ""}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  ```

  ```typescript agent.ts theme={null}
  import { ChatOpenAI } from "@langchain/openai";
  import {
    StateGraph,
    START,
    END,
    Send,
    StateSchema,
    MessagesValue,
    GraphNode,
    ConditionalEdgeRouter,
  } from "@langchain/langgraph";
  import { AIMessage } from "@langchain/core/messages";
  import { z } from "zod";

  // 使用不同的模型实例以获得多样性
  const analyticalModel = new ChatOpenAI({ model: "gpt-4.1-mini", temperature: 0.3 });
  const creativeModel = new ChatOpenAI({ model: "gpt-4.1-mini", temperature: 0.9 });
  const practicalModel = new ChatOpenAI({ model: "gpt-4.1-mini", temperature: 0.5 });

  // 定义状态架构
  const StateAnnotation = new StateSchema({
    messages: MessagesValue,
    topic: z.string().default(""),
    analyticalResearch: z.string().default(""),
    creativeResearch: z.string().default(""),
    practicalResearch: z.string().default(""),
  });

  type State = typeof StateAnnotation.State;

  // 扇出到并行研究人员
  const fanOutToResearchers: ConditionalEdgeRouter<State> = (state) => {
    return [
      new Send("researcher_analytical", state),
      new Send("researcher_creative", state),
      new Send("researcher_practical", state),
    ];
  };

  const dispatcherNode: GraphNode<State> = async (state) => {
    const lastMessage = state.messages.at(-1);
    const topic = typeof lastMessage?.content === "string" ? lastMessage.content : "";
    return { topic };
  };

  const analyticalResearcherNode: GraphNode<State> = async (state) => {
    const response = await analyticalModel.invoke([
      { role: "system", content: "You are an analytical research expert. Focus on data and evidence." },
      { role: "user", content: `Research: ${state.topic}` },
    ]);
    return {
      analyticalResearch: response.content as string,
      messages: [new AIMessage({ content: response.content as string, name: "researcher_analytical" })],
    };
  };

  // 创意和实践研究人员的类似节点...

  // 构建具有并行执行的图
  const workflow = new StateGraph(StateAnnotation)
    .addNode("dispatcher", dispatcherNode)
    .addNode("researcher_analytical", analyticalResearcherNode)
    .addNode("researcher_creative", creativeResearcherNode)
    .addNode("researcher_practical", practicalResearcherNode)
    .addEdge(START, "dispatcher")
    .addConditionalEdges("dispatcher", fanOutToResearchers)
    .addEdge("researcher_analytical", END)
    .addEdge("researcher_creative", END)
    .addEdge("researcher_practical", END);

  export const agent = workflow.compile();
  ```
</CodeGroup>

<Card title="尝试并行研究示例" icon="users" href="https://github.com/langchain-ai/langgraphjs/tree/main/examples/ui-react/src/examples/parallel-research">
  在 `parallel-research` 示例中查看多智能体流式传输的完整实现，该示例具有三个并行研究人员和独特的视觉样式。
</Card>

## 人机交互 (Human-in-the-loop)

当代理需要人工批准才能执行工具时处理中断。在 [如何处理中断](/oss/javascript/langgraph/interrupts#pause-using-interrupt) 指南中了解更多信息。

<CodeGroup>
  ```tsx Chat.tsx theme={null}
  import { useState } from "react";
  import { useStream } from "@langchain/langgraph-sdk/react";
  import type { HITLRequest, HITLResponse } from "langchain";
  import type { agent } from "./agent";
  import { MessageBubble } from "./MessageBubble";

  function HumanInTheLoopChat() {
    const stream = useStream<typeof agent, { InterruptType: HITLRequest }>({
      assistantId: "human-in-the-loop",
      apiUrl: "http://localhost:2024",
    });

    const [isProcessing, setIsProcessing] = useState(false);

    // 中断值的类型断言
    const hitlRequest = stream.interrupt?.value as HITLRequest | undefined;

    const handleApprove = async (index: number) => {
      if (!hitlRequest) return;
      setIsProcessing(true);

      try {
        const decisions: HITLResponse["decisions"] =
          hitlRequest.actionRequests.map((_, i) =>
            i === index ? { type: "approve" } : { type: "approve" }
          );

        await stream.submit(null, {
          command: {
            resume: { decisions } as HITLResponse,
          },
        });
      } finally {
        setIsProcessing(false);
      }
    };

    const handleReject = async (index: number, reason: string) => {
      if (!hitlRequest) return;
      setIsProcessing(true);

      try {
        const decisions: HITLResponse["decisions"] =
          hitlRequest.actionRequests.map((_, i) =>
            i === index
              ? { type: "reject", message: reason }
              : { type: "reject", message: "Rejected along with other actions" }
          );

        await stream.submit(null, {
          command: {
            resume: { decisions } as HITLResponse,
          },
        });
      } finally {
        setIsProcessing(false);
      }
    };

    return (
      <div>
        {/* 渲染消息 */}
        {stream.messages.map((message, idx) => (
          <MessageBubble key={message.id ?? idx} message={message} />
        ))}

        {/* 中断时渲染批准 UI */}
        {hitlRequest && hitlRequest.actionRequests.length > 0 && (
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 mt-4">
            <h3 className="text-amber-400 font-semibold mb-4">
              Action requires approval
            </h3>

            {hitlRequest.actionRequests.map((action, idx) => (
              <div
                key={idx}
                className="bg-neutral-900 rounded-lg p-4 mb-4 last:mb-0"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-mono text-white">
                    {action.name}
                  </span>
                </div>

                <pre className="text-xs bg-black rounded p-2 mb-3 overflow-x-auto">
                  {JSON.stringify(action.args, null, 2)}
                </pre>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(idx)}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(idx, "User rejected")}
                    disabled={isProcessing}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  ```

  ```typescript agent.ts theme={null}
  import { createAgent, tool, humanInTheLoopMiddleware } from "langchain";
  import { ChatOpenAI } from "@langchain/openai";
  import { MemorySaver } from "@langchain/langgraph";
  import { z } from "zod";

  const model = new ChatOpenAI({ model: "gpt-4.1-mini" });

  // 需要人工批准的工具
  const sendEmail = tool(
    async ({ to, subject, body }) => {
      return {
        status: "success",
        content: `Email sent to ${to} with subject "${subject}"`,
      };
    },
    {
      name: "send_email",
      description: "Send an email. Requires human approval.",
      schema: z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject"),
        body: z.string().describe("Email body"),
      }),
    }
  );

  // 需要批准但选项有限的工具
  const deleteFile = tool(
    async ({ path }) => {
      return { status: "success", content: `File "${path}" deleted` };
    },
    {
      name: "delete_file",
      description: "Delete a file. Requires human approval.",
      schema: z.object({
        path: z.string().describe("File path to delete"),
      }),
    }
  );

  // 安全工具 - 无需批准
  const readFile = tool(
    async ({ path }) => {
      return { status: "success", content: `Contents of ${path}...` };
    },
    {
      name: "read_file",
      description: "Read file contents. No approval needed.",
      schema: z.object({
        path: z.string().describe("File path to read"),
      }),
    }
  );

  // 创建带有 HITL 中间件的代理
  export const agent = createAgent({
    model,
    tools: [sendEmail, deleteFile, readFile],
    middleware: [
      humanInTheLoopMiddleware({
        interruptOn: {
          // 电子邮件需要所有决策类型
          send_email: {
            allowedDecisions: ["approve", "edit", "reject"],
            description: "📧 Review email before sending",
          },
          // 删除仅允许批准/拒绝
          delete_file: {
            allowedDecisions: ["approve", "reject"],
            description: "🗑️ Confirm file deletion",
          },
          // 读取是安全的 - 自动批准
          read_file: false,
        },
      }),
    ],
    // HITL 所需 - 跨中断持久化状态
    checkpointer: new MemorySaver(),
  });
  ```
</CodeGroup>

<Card title="尝试人机交互示例" icon="hand" href="https://github.com/langchain-ai/langgraphjs/tree/main/examples/ui-react/src/examples/human-in-the-loop">
  在 `human-in-the-loop` 示例中查看批准工作流的完整实现，包括批准、拒绝和编辑操作。
</Card>

## 推理模型

<Warning>
  扩展推理/思考支持目前是实验性的。推理 token 的流式接口因提供商（OpenAI vs. Anthropic）而异，并且随着抽象的发展可能会发生变化。
</Warning>

当使用具有扩展推理能力的模型（如 OpenAI 的推理模型或 Anthropic 的扩展思考）时，思考过程嵌入在消息内容中。您需要单独提取并显示它。

<CodeGroup>
  ```tsx Chat.tsx theme={null}
  import { useStream } from "@langchain/langgraph-sdk/react";
  import type { Message } from "@langchain/langgraph-sdk";
  import type { agent } from "./agent";
  import { getReasoningFromMessage, getTextContent } from "./utils";

  function ReasoningChat() {
    const stream = useStream<typeof agent>({
      assistantId: "reasoning-agent",
      apiUrl: "http://localhost:2024",
    });

    return (
      <div className="flex flex-col gap-4">
        {stream.messages.map((message, idx) => {
          if (message.type === "ai") {
            const reasoning = getReasoningFromMessage(message);
            const textContent = getTextContent(message);

            return (
              <div key={message.id ?? idx}>
                {/* 如果存在，渲染推理气泡 */}
                {reasoning && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-amber-400/80 mb-2">
                      Reasoning
                    </div>
                    <div className="bg-amber-950/50 border border-amber-500/20 rounded-2xl px-4 py-3">
                      <div className="text-sm text-amber-100/90 whitespace-pre-wrap">
                        {reasoning}
                      </div>
                    </div>
                  </div>
                )}

                {/* 渲染文本内容 */}
                {textContent && (
                  <div className="text-neutral-100 whitespace-pre-wrap">
                    {textContent}
                  </div>
                )}
              </div>
            );
          }

          return <MessageBubble key={message.id ?? idx} message={message} />;
        })}

        {stream.isLoading && (
          <div className="flex items-center gap-2 text-amber-400/70">
            <span className="text-sm">Thinking...</span>
          </div>
        )}
      </div>
    );
  }
  ```

  ```typescript utils.ts theme={null}
  import type { Message, AIMessage } from "@langchain/langgraph-sdk";

  /**
   * 从 AI 消息中提取推理/思考内容。
   * 支持 OpenAI 推理 (additional_kwargs.reasoning.summary)
   * 和 Anthropic 扩展思考 (content blocks with type "thinking")。
   */
  export function getReasoningFromMessage(message: Message): string | undefined {
    type MessageWithExtras = AIMessage & {
      additional_kwargs?: {
        reasoning?: {
          summary?: Array<{ type: string; text: string }>;
        };
      };
      contentBlocks?: Array<{ type: string; thinking?: string }>;
    };

    const msg = message as MessageWithExtras;

    // 检查 additional_kwargs 中的 OpenAI 推理
    if (msg.additional_kwargs?.reasoning?.summary) {
      const content = msg.additional_kwargs.reasoning.summary
        .filter((item) => item.type === "summary_text")
        .map((item) => item.text)
        .join("");

      if (content.trim()) return content;
    }

    // 检查 contentBlocks 中的 Anthropic 思考
    if (msg.contentBlocks?.length) {
      const thinking = msg.contentBlocks
        .filter((b) => b.type === "thinking" && b.thinking)
        .map((b) => b.thinking)
        .join("\n");

      if (thinking) return thinking;
    }

    // 检查 message.content 数组中的思考
    if (Array.isArray(msg.content)) {
      const thinking = msg.content
        .filter((b): b is { type: "thinking"; thinking: string } =>
          typeof b === "object" && b?.type === "thinking" && "thinking" in b
        )
        .map((b) => b.thinking)
        .join("\n");

      if (thinking) return thinking;
    }

    return undefined;
  }

  /**
   * 从消息中提取文本内容。
   */
  export function getTextContent(message: Message): string {
    if (typeof message.content === "string") return message.content;

    if (Array.isArray(message.content)) {
      return message.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("");
    }

    return "";
  }
  ```
</CodeGroup>

<Card title="尝试推理示例" icon="brain" href="https://github.com/langchain-ai/langgraphjs/tree/main/examples/ui-react/src/examples/reasoning-agent">
  在 `reasoning-agent` 示例中查看使用 OpenAI 和 Anthropic 模型显示推理 token 的完整实现。
</Card>

## 自定义状态类型

对于自定义 LangGraph 应用程序，将您的工具调用类型嵌入到状态的 messages 属性中。

```tsx  theme={null}
import { Message } from "@langchain/langgraph-sdk";
import { useStream } from "@langchain/langgraph-sdk/react";

// 将您的工具调用类型定义为可辨识联合
type MyToolCalls =
  | { name: "search"; args: { query: string }; id?: string }
  | { name: "calculate"; args: { expression: string }; id?: string };

// 将工具调用类型嵌入到您的状态消息中
interface MyGraphState {
  messages: Message<MyToolCalls>[];
  context?: string;
}

function CustomGraphChat() {
  const stream = useStream<MyGraphState>({
    assistantId: "my-graph",
    apiUrl: "http://localhost:2024",
  });

  // stream.values 类型为 MyGraphState
  // stream.toolCalls[0].call.name 类型为 "search" | "calculate"
}
```

您还可以为中断和可配置选项指定其他类型配置：

```tsx  theme={null}
interface MyGraphState {
  messages: Message<MyToolCalls>[];
}

function CustomGraphChat() {
  const stream = useStream<
    MyGraphState,
    {
      InterruptType: { question: string };
      ConfigurableType: { userId: string };
    }
  >({
    assistantId: "my-graph",
    apiUrl: "http://localhost:2024",
  });

  // stream.interrupt 类型为 { question: string } | undefined
}
```

## 自定义传输

对于自定义 API 端点或非标准部署，请使用 `transport` 选项配合 `FetchStreamTransport` 连接到任何流式 API。

```tsx  theme={null}
import { useMemo } from "react";
import { useStream, FetchStreamTransport } from "@langchain/langgraph-sdk/react";

function CustomAPIChat({ apiKey }: { apiKey: string }) {
  // 使用自定义请求处理创建传输
  const transport = useMemo(() => {
    return new FetchStreamTransport({
      apiUrl: "/api/my-agent",
      onRequest: async (url: string, init: RequestInit) => {
        // 将 API 密钥或其他自定义数据注入请求
        const customBody = JSON.stringify({
          ...(JSON.parse(init.body as string) || {}),
          apiKey,
        });

        return {
          ...init,
          body: customBody,
          headers: {
            ...init.headers,
            "X-Custom-Header": "value",
          },
        };
      },
    });
  }, [apiKey]);

  const stream = useStream({
    transport,
  });

  // 像往常一样使用 stream
  return (
    <div>
      {stream.messages.map((message, idx) => (
        <MessageBubble key={message.id ?? idx} message={message} />
      ))}
    </div>
  );
}
```

## 相关内容

* [流式传输概述](/oss/javascript/langchain/streaming/overview) — 使用 LangChain 代理的服务器端流式传输
* [useStream API 参考](https://reference.langchain.com/javascript/functions/_langchain_langgraph-sdk.react.useStream.html) — 完整的 API 文档
* [代理聊天 UI](/oss/javascript/langchain/ui) — LangGraph 代理的预构建聊天界面
* [人机交互](/oss/javascript/langchain/human-in-the-loop) — 配置用于人工审核的中断
* [多智能体系统](/oss/javascript/langchain/multi-agent) — 构建具有多个 LLM 的代理

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/streaming/frontend.mdx) 或 [提交问题](https://github.com/langchain-ai/docs/issues/new/choose).
</Callout>

<Tip icon="terminal" iconType="regular">
  [将这些文档连接](/use-these-docs) 到 Claude, VSCode, 以及更多通过 MCP 获取实时答案。
</Tip>
