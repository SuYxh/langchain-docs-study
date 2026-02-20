# LangChain 前端流式处理 (Frontend Streaming) 深度解读

> **私教版深度解读** - 让你像老司机一样玩转 React + LangGraph 流式交互

---

## 一句话省流 (The Essence)

**`useStream` 就是 LangGraph 给 React 前端开发者的"全家桶"Hook，它帮你搞定了与 AI Agent 实时对话所需要的一切：消息流、状态管理、对话分支、加载状态、错误处理，一个 Hook 通吃！**

---

## 核心痛点与解决方案 (The "Why")

### 痛点：手动实现流式聊天有多惨？

想象一下，你要从零开始实现一个 AI 聊天界面，你需要：

| 你要处理的事情 | 有多痛苦 |
|---------------|---------|
| **WebSocket/SSE 连接管理** | 连接断了要重连，页面刷新要恢复，简直是噩梦 |
| **消息拼接** | AI 的回复是一个字一个字蹦出来的，你要手动拼起来 |
| **Loading 状态** | 正在请求？正在生成？生成完了？三种状态傻傻分不清 |
| **错误处理** | 网络断了、Token 过期了、AI 抽风了，都要处理 |
| **对话分支** | 用户想改之前的问题？想让 AI 重新回答？分支管理让人头秃 |
| **类型安全** | Tool Call 的参数类型？消息的类型？全是 `any` |
| **乐观更新** | 用户发消息要立刻显示，不能等服务器响应 |

**如果你手写这些，代码量轻松上千行，而且 bug 满天飞！**

### 解决方案：useStream 一把梭

```tsx
// 就这么简单，上面所有痛点都解决了
const stream = useStream({
  assistantId: "agent",
  apiUrl: "http://localhost:2024",
});

// 直接用就完事了
stream.messages    // 所有消息
stream.isLoading   // 加载状态
stream.error       // 错误信息
stream.submit()    // 发送消息
stream.stop()      // 停止生成
```

---

## 生活化类比 (The Analogy)

### 把 useStream 想象成一个"智能外卖平台"

| 技术概念 | 外卖平台类比 |
|---------|------------|
| **useStream Hook** | 饿了么/美团 App，一个 App 搞定所有 |
| **assistantId** | 你选的餐厅（不同餐厅做不同菜）|
| **apiUrl** | 外卖平台的服务器地址 |
| **messages** | 订单历史 + 实时聊天记录 |
| **submit()** | 下单按钮 |
| **isLoading** | "骑手正在取餐中..." |
| **stream.stop()** | 取消订单 |
| **Branching（分支）** | "这份餐不好吃，换一家重新点" |
| **Optimistic Updates** | 下单后立刻显示"已下单"，不用等餐厅确认 |
| **threadId** | 你的会员账号，记录你所有订单历史 |
| **interrupt（中断）** | 骑手打电话问你"楼下没电梯，能下来取吗？" |
| **Tool Calls** | 餐厅的各种服务：切菜、打包、加辣等 |

### 举个完整的例子

```
你（用户）：我要一份宫保鸡丁（submit 消息）

App 显示：已下单，正在处理...（isLoading = true）

餐厅（AI）一边做一边告诉你：
  - "鸡肉切好了"（第一个 token）
  - "开始炒菜了"（第二个 token）
  - "起锅装盘"（第三个 token）
  
餐厅问：要加花生米吗？（interrupt 中断等待你确认）

你：加！（submit command.resume）

餐厅：好的，已加好，订单完成！（isLoading = false）

你：等等，我想改成麻婆豆腐（Branching - 从某个检查点重新开始）
```

---

## 关键概念拆解 (Key Concepts)

### 1. `useStream` - 核心 Hook

就像 React Query 的 `useQuery` 管理数据请求一样，`useStream` 管理的是与 AI Agent 的流式交互。

```tsx
const stream = useStream({
  assistantId: "agent",     // 我要跟哪个 AI 聊天
  apiUrl: "http://...",     // AI 住在哪里
  threadId: "xxx",          // 继续之前的对话（可选）
});
```

### 2. `Thread` - 对话线程

**Thread = 一次完整的对话历史**

想象你用微信和朋友聊天，那个聊天窗口就是一个 Thread。你们说过的每句话都记在这个 Thread 里。

- `threadId`：Thread 的唯一 ID，像微信聊天记录的云端存储 ID
- 有了 threadId，关掉页面再打开，对话记录还在

### 3. `Checkpoint` - 对话检查点（存档点）

玩过游戏吗？**Checkpoint 就是游戏存档！**

- 每当对话进行到一个关键节点，系统会自动"存档"
- 如果你想"读档"重来（比如修改之前的问题），就需要找到那个 checkpoint

```tsx
// 从某个检查点重新开始
stream.submit(
  { messages: [{ type: "human", content: "新问题" }] },
  { checkpoint: parentCheckpoint }  // 从这个存档点重新开始
);
```

### 4. `Branching` - 对话分支

**分支就是对话的"平行宇宙"**

假设你问 AI："推荐一部电影"
- 分支 A：AI 推荐了《肖申克的救赎》
- 你不满意，让它重新推荐
- 分支 B：AI 推荐了《盗梦空间》
- 你又不满意...
- 分支 C：AI 推荐了《星际穿越》

这三个分支都存在，你可以随时切换查看，就像 Git 的不同 branch 一样。

### 5. `Optimistic Updates` - 乐观更新

**先斩后奏：用户发消息，界面先显示，网络请求后台跑**

为什么叫"乐观"？因为我们"乐观地"认为请求一定会成功，所以先更新 UI。

```tsx
stream.submit(
  { messages: [newMessage] },
  {
    optimisticValues(prev) {
      // 乐观地把新消息加进去，不等服务器响应
      return { ...prev, messages: [...prev.messages, newMessage] };
    },
  }
);
```

### 6. `Interrupt` - 人机交互中断

**AI 在执行任务时暂停，等待人类确认**

比如 AI 要帮你发邮件，但发之前需要你确认：
- AI："我准备发一封邮件给老板，内容是...,可以吗？"
- 你："可以"或"不行，改一下"
- AI 收到你的回复后继续执行

```tsx
// 检查是否有中断等待处理
if (stream.interrupt) {
  // 显示确认对话框
  // 用户确认后：
  stream.submit(null, {
    command: { resume: { decisions: [{ type: "approve" }] } }
  });
}
```

### 7. `Tool Calls` - 工具调用

**AI 的"外挂能力"：调用外部工具完成任务**

AI 本身只会说话，但通过 Tool，它可以：
- 查天气
- 搜索网页
- 发邮件
- 读写文件
- ...

```tsx
// 获取某条消息里的所有工具调用
const toolCalls = stream.getToolCalls(message);

// toolCalls 的状态：
// - pending: 工具正在执行
// - completed: 执行完成
// - error: 执行出错
```

---

## useStream 参数详解（人话版）

### 输入参数

| 参数 | 类型 | 人话解释 |
|-----|------|---------|
| `assistantId` | string | **必填**。你要连接的 AI 的名字/ID |
| `apiUrl` | string | AI 服务器的地址，本地开发默认是 `http://localhost:2024` |
| `apiKey` | string | 访问 AI 的密钥（部署到线上才需要）|
| `threadId` | string | 传入已有的对话 ID，可以继续之前的聊天 |
| `onThreadId` | function | 新对话创建时的回调，用来保存对话 ID |
| `reconnectOnMount` | boolean | 组件挂载时自动恢复上次的流，页面刷新不丢失 |
| `initialValues` | object | 初始数据，用于显示缓存的对话内容 |
| `messagesKey` | string | 状态中存储消息的 key，默认是 "messages" |
| `throttle` | boolean | 是否批量更新状态（提高性能），默认 true |

### 回调函数

| 回调 | 人话解释 |
|-----|---------|
| `onCreated` | 新的运行创建时触发，可以拿到 run_id |
| `onError` | 出错时触发，用来显示错误提示 |
| `onFinish` | 流结束时触发，拿到最终状态 |
| `onCustomEvent` | 收到自定义事件时触发（工具发送的进度等）|
| `onUpdateEvent` | 每个图节点执行完后触发 |
| `onMetadataEvent` | 收到元数据时触发（run_id, thread_id 等）|

### 返回值

| 返回值 | 类型 | 人话解释 |
|-------|------|---------|
| `messages` | Message[] | 所有消息，包括人说的和 AI 说的 |
| `values` | object | 当前图的完整状态 |
| `isLoading` | boolean | 是否正在加载/生成中 |
| `error` | Error | 如果出错了，这里有错误信息 |
| `interrupt` | object | 如果 AI 暂停等人确认，这里有详情 |
| `toolCalls` | array | 所有工具调用及其状态 |
| `submit()` | function | 发送消息或恢复执行 |
| `stop()` | function | 停止当前生成 |
| `joinStream()` | function | 加入一个正在进行的流 |
| `setBranch()` | function | 切换对话分支 |
| `getToolCalls()` | function | 获取某条消息的工具调用 |
| `getMessagesMetadata()` | function | 获取消息的元数据（分支信息等）|

---

## 代码逻辑深度拆解

### 场景 1: 最基础的聊天界面

```tsx
import { useStream } from "@langchain/langgraph-sdk/react";

function Chat() {
  // 第一步：建立与 AI 的连接
  const stream = useStream({
    assistantId: "agent",           // 告诉它：我要和名叫 "agent" 的 AI 聊天
    apiUrl: "http://localhost:2024", // AI 在本地 2024 端口
  });

  // 第二步：处理用户发送消息
  const handleSubmit = (message: string) => {
    stream.submit({
      messages: [
        { content: message, type: "human" }  // 这是人说的话
      ],
    });
  };

  // 第三步：渲染界面
  return (
    <div>
      {/* 遍历所有消息并显示 */}
      {stream.messages.map((message, idx) => (
        <div key={message.id ?? idx}>
          {message.type}: {message.content}  {/* "human: 你好" 或 "ai: 你好呀！" */}
        </div>
      ))}

      {/* 如果正在加载，显示 loading */}
      {stream.isLoading && <div>Loading...</div>}
      
      {/* 如果出错了，显示错误 */}
      {stream.error && <div>Error: {stream.error.message}</div>}
    </div>
  );
}
```

**逻辑流程图：**
```
用户输入 "你好"
    ↓
handleSubmit("你好")
    ↓
stream.submit({ messages: [{ content: "你好", type: "human" }] })
    ↓
发送请求到 http://localhost:2024
    ↓
isLoading = true
    ↓
服务器开始流式返回 AI 的回复
    ↓
messages 实时更新：["你好呀", "！", "有什么可以帮您？"]
    ↓
isLoading = false
    ↓
界面显示完整对话
```

---

### 场景 2: Thread 管理 - 对话记忆

```tsx
import { useState } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";

function Chat() {
  // 用 state 保存 threadId
  const [threadId, setThreadId] = useState<string | null>(null);

  const stream = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    threadId: threadId,           // 传入 threadId，继续之前的对话
    onThreadId: setThreadId,      // 新对话创建时，保存 threadId
  });

  // threadId 拿到后，可以存到 URL 或 localStorage
  // 这样用户刷新页面，对话不会丢失
}
```

**这段代码在干什么？**

1. 第一次进入页面，`threadId` 是 `null`
2. 用户发送第一条消息后，服务器创建新的 Thread
3. `onThreadId` 回调被触发，我们拿到 `threadId` 并存起来
4. 用户刷新页面，我们从存储中读取 `threadId`，传给 `useStream`
5. `useStream` 自动加载该 Thread 的历史消息

---

### 场景 3: 乐观更新 - 秒级响应体验

```tsx
const handleSubmit = (text: string) => {
  const newMessage = { type: "human" as const, content: text };

  stream.submit(
    { messages: [newMessage] },
    {
      // 乐观更新：在网络请求发出之前，先在本地显示这条消息
      optimisticValues(prev) {
        const prevMessages = prev.messages ?? [];
        return { 
          ...prev, 
          messages: [...prevMessages, newMessage]  // 立刻把新消息加到列表里
        };
      },
    }
  );
};
```

**时间线对比：**

| 时刻 | 没有乐观更新 | 有乐观更新 |
|------|-------------|-----------|
| 0ms | 用户点击发送 | 用户点击发送 |
| 0ms | 发送请求... | **消息立刻显示在界面上** + 发送请求 |
| 200ms | 服务器响应，消息显示 | 服务器响应，确认消息 |

**用户体验差距巨大！** 乐观更新让用户感觉 App 快如闪电。

---

### 场景 4: 对话分支 - 重新生成回答

```tsx
function Chat() {
  const stream = useStream({ assistantId: "agent", apiUrl: "..." });

  return (
    <div>
      {stream.messages.map((message) => {
        // 获取这条消息的元数据，包含分支信息
        const meta = stream.getMessagesMetadata(message);
        const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;

        return (
          <div key={message.id}>
            <div>{message.content}</div>

            {/* 如果是 AI 的消息，显示"重新生成"按钮 */}
            {message.type === "ai" && (
              <button
                onClick={() => {
                  // 从这条消息的父检查点重新开始
                  // 相当于：回到 AI 说这句话之前，让它重新说
                  stream.submit(undefined, { checkpoint: parentCheckpoint });
                }}
              >
                重新生成
              </button>
            )}

            {/* 分支切换器：如果有多个分支，可以切换查看 */}
            {meta?.branchOptions && meta.branchOptions.length > 1 && (
              <div>
                <button onClick={() => stream.setBranch(meta.branchOptions[0])}>←</button>
                <span>分支 {meta.branchOptions.indexOf(meta.branch) + 1}/{meta.branchOptions.length}</span>
                <button onClick={() => stream.setBranch(meta.branchOptions[1])}>→</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**分支的工作原理：**

```
原始对话：
  用户: 推荐一部电影
  AI(v1): 《肖申克的救赎》  ← checkpoint_A

用户点击"重新生成"：
  从 checkpoint_A 重新执行

新分支：
  用户: 推荐一部电影
  AI(v2): 《盗梦空间》  ← 新的 checkpoint_B

现在有两个分支：
  - 分支1: 《肖申克的救赎》
  - 分支2: 《盗梦空间》
  
可以用 setBranch() 在两个分支间切换
```

---

### 场景 5: Tool Calls 渲染 - 显示 AI 在做什么

```tsx
import { useStream } from "@langchain/langgraph-sdk/react";
import type { agent } from "./agent";

function Chat() {
  // 注意这里传入了 typeof agent，实现类型推断
  const stream = useStream<typeof agent>({
    assistantId: "agent",
    apiUrl: "http://localhost:2024",
  });

  return (
    <div>
      {stream.messages.map((message, idx) => {
        // 如果是 AI 消息，检查是否有工具调用
        if (message.type === "ai") {
          const toolCalls = stream.getToolCalls(message);

          if (toolCalls.length > 0) {
            return (
              <div key={message.id ?? idx}>
                {toolCalls.map((toolCall) => (
                  <div key={toolCall.id}>
                    {/* toolCall.call.name 会被正确推断类型，比如 "get_weather" */}
                    <div>工具: {toolCall.call.name}</div>
                    
                    {/* toolCall.call.args 也有类型，比如 { location: string } */}
                    <div>参数: {JSON.stringify(toolCall.call.args)}</div>
                    
                    {/* 显示执行状态 */}
                    <div>状态: {toolCall.state}</div>
                    {/* state 可能是: "pending" | "completed" | "error" */}
                    
                    {/* 如果执行完成，显示结果 */}
                    {toolCall.result && (
                      <div>结果: {toolCall.result.content}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          }
        }

        return <div key={message.id ?? idx}>{message.content}</div>;
      })}
    </div>
  );
}
```

**工具调用的生命周期：**

```
AI 决定调用工具 get_weather({ location: "北京" })
    ↓
toolCall.state = "pending"（界面显示：正在查询北京天气...）
    ↓
工具执行完成，返回 "晴，25°C"
    ↓
toolCall.state = "completed"
toolCall.result = "晴，25°C"（界面显示天气卡片）
```

---

### 场景 6: 自定义流式事件 - 进度条等高级 UI

**后端（在 Tool 里发送自定义事件）：**

```typescript
import { tool, type ToolRuntime } from "langchain";

const analyzeDataTool = tool(
  async ({ dataSource }, config: ToolRuntime) => {
    const steps = ["连接中...", "获取数据...", "分析中...", "完成!"];

    for (let i = 0; i < steps.length; i++) {
      // 通过 config.writer 发送自定义事件
      config.writer?.({
        type: "progress",
        id: `analysis-${Date.now()}`,
        message: steps[i],
        progress: ((i + 1) / steps.length) * 100,
      });

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return JSON.stringify({ result: "分析完成" });
  },
  {
    name: "analyze_data",
    description: "分析数据，带进度更新",
    schema: z.object({
      dataSource: z.string().describe("数据源"),
    }),
  }
);
```

**前端（接收并显示进度）：**

```tsx
function CustomStreamingUI() {
  const [progressData, setProgressData] = useState<Map<string, ProgressData>>(new Map());

  // 处理自定义事件
  const handleCustomEvent = useCallback((data: unknown) => {
    if (isProgressData(data)) {
      setProgressData(prev => {
        const updated = new Map(prev);
        updated.set(data.id, data);
        return updated;
      });
    }
  }, []);

  const stream = useStream({
    assistantId: "custom-streaming",
    apiUrl: "http://localhost:2024",
    onCustomEvent: handleCustomEvent,  // 关键：监听自定义事件
  });

  return (
    <div>
      {/* 渲染进度条 */}
      {Array.from(progressData.values()).map((data) => (
        <div key={data.id}>
          <div>{data.message}</div>
          <div style={{ width: `${data.progress}%`, background: 'blue', height: 8 }} />
          <div>{data.progress}%</div>
        </div>
      ))}
    </div>
  );
}
```

**这套机制的威力：**

- **进度条**：分析数据、处理文件时显示实时进度
- **状态更新**：长时间任务的各阶段状态
- **实时日志**：调试模式下显示内部执行日志
- **任意自定义数据**：你想传什么就传什么

---

### 场景 7: 人机交互 (Human-in-the-Loop)

**这是最复杂但也最有价值的功能之一**

```tsx
function HumanInTheLoopChat() {
  const stream = useStream<typeof agent, { InterruptType: HITLRequest }>({
    assistantId: "human-in-the-loop",
    apiUrl: "http://localhost:2024",
  });

  // 类型断言获取中断请求
  const hitlRequest = stream.interrupt?.value as HITLRequest | undefined;

  // 用户批准操作
  const handleApprove = async (index: number) => {
    if (!hitlRequest) return;

    const decisions = hitlRequest.actionRequests.map((_, i) =>
      i === index 
        ? { type: "approve" }      // 批准
        : { type: "approve" }
    );

    // 关键：用 command.resume 恢复执行
    await stream.submit(null, {
      command: {
        resume: { decisions }
      },
    });
  };

  // 用户拒绝操作
  const handleReject = async (index: number, reason: string) => {
    if (!hitlRequest) return;

    const decisions = hitlRequest.actionRequests.map((_, i) =>
      i === index
        ? { type: "reject", message: reason }  // 拒绝并说明原因
        : { type: "reject", message: "随其他操作一起被拒绝" }
    );

    await stream.submit(null, {
      command: {
        resume: { decisions }
      },
    });
  };

  return (
    <div>
      {/* 渲染消息 */}
      {stream.messages.map((message, idx) => (
        <div key={message.id ?? idx}>{message.content}</div>
      ))}

      {/* 当有中断请求时，显示批准界面 */}
      {hitlRequest && hitlRequest.actionRequests.length > 0 && (
        <div className="approval-dialog">
          <h3>需要您的批准</h3>
          
          {hitlRequest.actionRequests.map((action, idx) => (
            <div key={idx}>
              <div>工具: {action.name}</div>
              <div>参数: {JSON.stringify(action.args)}</div>
              
              <button onClick={() => handleApprove(idx)}>批准</button>
              <button onClick={() => handleReject(idx, "用户拒绝")}>拒绝</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

**人机交互的典型场景：**

| 场景 | 为什么需要人工确认 |
|-----|------------------|
| **发送邮件** | 邮件一旦发出无法撤回，必须人工确认 |
| **删除文件** | 删错了就没了，高危操作 |
| **支付转账** | 涉及金钱，必须人工确认 |
| **发布内容** | 发到公开平台前需要审核 |
| **修改配置** | 系统配置改错可能导致服务崩溃 |

---

### 场景 8: 多 Agent 流式处理

当你的系统有多个 AI 同时工作时（比如一个负责研究，一个负责写作，一个负责审核），如何在界面上区分它们？

```tsx
// 每个 Agent 的配置
const NODE_CONFIG = {
  researcher_analytical: { label: "分析型研究员", color: "cyan" },
  researcher_creative: { label: "创意型研究员", color: "purple" },
  researcher_practical: { label: "实践型研究员", color: "emerald" },
};

function MultiAgentChat() {
  const stream = useStream<typeof agent>({
    assistantId: "parallel-research",
    apiUrl: "http://localhost:2024",
  });

  return (
    <div>
      {stream.messages.map((message, idx) => {
        if (message.type !== "ai") {
          return <div key={message.id ?? idx}>{message.content}</div>;
        }

        // 关键：通过 metadata 获取消息来自哪个 Agent
        const metadata = stream.getMessagesMetadata?.(message);
        const nodeName = metadata?.streamMetadata?.langgraph_node as string;
        const config = nodeName ? NODE_CONFIG[nodeName] : null;

        if (!config) {
          return <div key={message.id ?? idx}>{message.content}</div>;
        }

        // 根据不同 Agent 显示不同样式
        return (
          <div
            key={message.id ?? idx}
            style={{ borderColor: config.color, background: `${config.color}10` }}
          >
            <div style={{ color: config.color, fontWeight: 'bold' }}>
              {config.label}  {/* 显示 "分析型研究员" 等 */}
            </div>
            <div>{message.content}</div>
          </div>
        );
      })}
    </div>
  );
}
```

**多 Agent 的视觉效果：**

```
┌─────────────────────────────────┐
│ 👤 用户                          │
│ 帮我研究一下 AI 的未来发展        │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🔬 分析型研究员 (cyan 边框)      │
│ 从数据角度来看，AI 市场规模...    │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🎨 创意型研究员 (purple 边框)    │
│ 想象一下未来的 AI 可能会...      │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🔧 实践型研究员 (emerald 边框)   │
│ 从落地角度来说，目前可行的是...   │
└─────────────────────────────────┘
```

---

### 场景 9: 推理模型的"思考过程"显示

OpenAI 的 o1/o3 和 Anthropic 的 Claude 在回答复杂问题时会有"思考过程"，如何显示这个过程？

```tsx
function ReasoningChat() {
  const stream = useStream<typeof agent>({
    assistantId: "reasoning-agent",
    apiUrl: "http://localhost:2024",
  });

  return (
    <div>
      {stream.messages.map((message, idx) => {
        if (message.type === "ai") {
          // 提取思考过程
          const reasoning = getReasoningFromMessage(message);
          // 提取最终回答
          const textContent = getTextContent(message);

          return (
            <div key={message.id ?? idx}>
              {/* 如果有思考过程，用特殊样式显示 */}
              {reasoning && (
                <div className="reasoning-bubble">
                  <div className="label">思考中...</div>
                  <div className="content">{reasoning}</div>
                </div>
              )}

              {/* 最终回答 */}
              {textContent && (
                <div className="answer">{textContent}</div>
              )}
            </div>
          );
        }

        return <div key={message.id ?? idx}>{message.content}</div>;
      })}

      {/* 正在思考的动画 */}
      {stream.isLoading && (
        <div className="thinking-indicator">
          <span>AI 正在深度思考...</span>
        </div>
      )}
    </div>
  );
}
```

**提取推理内容的工具函数：**

```typescript
function getReasoningFromMessage(message: Message): string | undefined {
  const msg = message as any;

  // OpenAI 的推理格式
  if (msg.additional_kwargs?.reasoning?.summary) {
    return msg.additional_kwargs.reasoning.summary
      .filter(item => item.type === "summary_text")
      .map(item => item.text)
      .join("");
  }

  // Anthropic 的思考格式
  if (Array.isArray(msg.content)) {
    const thinking = msg.content
      .filter(b => b.type === "thinking")
      .map(b => b.thinking)
      .join("\n");
    if (thinking) return thinking;
  }

  return undefined;
}
```

---

## 类型安全详解

### 为什么类型安全很重要？

没有类型安全：
```tsx
const toolCall = stream.toolCalls[0];
toolCall.call.name  // 类型是 string，你不知道有哪些可能的值
toolCall.call.args  // 类型是 any，你不知道有什么参数
```

有类型安全：
```tsx
const toolCall = stream.toolCalls[0];
toolCall.call.name  // 类型是 "get_weather" | "search" | ...（编辑器自动补全）
toolCall.call.args  // 类型是 { location: string } 等（编辑器提示参数）
```

### 如何实现类型安全

**方式 1：使用 `createAgent`（推荐）**

```tsx
// agent.ts
import { createAgent, tool } from "langchain";

const getWeather = tool(
  async ({ location }) => `${location}: 晴天`,
  {
    name: "get_weather",
    schema: z.object({
      location: z.string(),
    }),
  }
);

export const agent = createAgent({
  model: "openai:gpt-4.1-mini",
  tools: [getWeather],
});

// Chat.tsx
import type { agent } from "./agent";

const stream = useStream<typeof agent>({  // 传入 typeof agent
  assistantId: "agent",
  apiUrl: "...",
});

// 现在 stream.toolCalls 有完整的类型推断！
```

**方式 2：手动定义类型**

```tsx
// 定义工具调用类型
type MyToolCalls =
  | { name: "search"; args: { query: string }; id?: string }
  | { name: "calculate"; args: { expression: string }; id?: string };

// 定义状态类型
interface MyGraphState {
  messages: Message<MyToolCalls>[];
  context?: string;
}

// 使用
const stream = useStream<MyGraphState>({
  assistantId: "my-graph",
  apiUrl: "...",
});
```

**方式 3：高级类型配置**

```tsx
const stream = useStream<
  State,
  {
    UpdateType: { messages: Message[] | Message; context?: string };
    InterruptType: string;  // 中断的数据类型
    CustomEventType: { type: "progress"; payload: unknown };  // 自定义事件类型
    ConfigurableType: { model: string };  // 配置项类型
  }
>({
  apiUrl: "...",
  assistantId: "agent",
});
```

---

## 真实场景案例

### 案例 1: 电商客服机器人

**需求：**
- 用户可以查询订单、申请退款、咨询商品
- 退款操作需要人工审核
- 查询操作要显示实时进度

```tsx
function EcommerceBot() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const stream = useStream<typeof agent, { InterruptType: RefundRequest }>({
    assistantId: "ecommerce-agent",
    apiUrl: "http://localhost:2024",
    threadId,
    onThreadId: setThreadId,
    onCustomEvent: (data) => {
      // 显示查询进度
      if (data.type === "progress") {
        setProgress(data.message);
      }
    },
  });

  // 处理退款审核
  const handleRefundDecision = async (approved: boolean) => {
    await stream.submit(null, {
      command: {
        resume: { approved, reason: approved ? "同意" : "已超过退款期限" }
      }
    });
  };

  return (
    <div>
      {/* 消息列表 */}
      {stream.messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} />
      ))}

      {/* 进度提示 */}
      {progress && <div className="progress">{progress}</div>}

      {/* 退款审核弹窗 */}
      {stream.interrupt && (
        <RefundApprovalDialog
          request={stream.interrupt.value as RefundRequest}
          onApprove={() => handleRefundDecision(true)}
          onReject={() => handleRefundDecision(false)}
        />
      )}

      {/* 输入框 */}
      <ChatInput
        onSubmit={(text) => {
          stream.submit(
            { messages: [{ type: "human", content: text }] },
            { optimisticValues: (prev) => ({
              ...prev,
              messages: [...(prev.messages ?? []), { type: "human", content: text }]
            })}
          );
        }}
        disabled={stream.isLoading}
      />
    </div>
  );
}
```

### 案例 2: 多人协作研究助手

**需求：**
- 三个 AI 从不同角度研究问题
- 每个 AI 的回答用不同颜色标识
- 用户可以让某个 AI 重新回答

```tsx
const AI_PERSONAS = {
  optimist: { name: "乐观派", color: "#4CAF50", icon: "😊" },
  pessimist: { name: "悲观派", color: "#f44336", icon: "😟" },
  realist: { name: "现实派", color: "#2196F3", icon: "🤔" },
};

function MultiPerspectiveChat() {
  const stream = useStream<typeof researchAgent>({
    assistantId: "multi-perspective",
    apiUrl: "http://localhost:2024",
  });

  return (
    <div>
      {stream.messages.map((message, idx) => {
        if (message.type === "human") {
          return <UserMessage key={idx} content={message.content} />;
        }

        const meta = stream.getMessagesMetadata(message);
        const persona = AI_PERSONAS[meta?.streamMetadata?.langgraph_node];
        const checkpoint = meta?.firstSeenState?.parent_checkpoint;

        return (
          <AIMessage
            key={idx}
            content={message.content}
            persona={persona}
            onRegenerate={() => {
              stream.submit(undefined, { checkpoint });
            }}
            branchInfo={{
              current: meta?.branchOptions?.indexOf(meta?.branch) + 1,
              total: meta?.branchOptions?.length,
              onSwitch: stream.setBranch,
              options: meta?.branchOptions,
            }}
          />
        );
      })}
    </div>
  );
}
```

---

## 常见问题 FAQ

### Q1: 页面刷新后对话记录丢失怎么办？

**A:** 使用 `threadId` 持久化 + `reconnectOnMount`

```tsx
const [threadId, setThreadId] = useState(() => {
  // 从 URL 或 localStorage 读取
  return new URLSearchParams(window.location.search).get('thread');
});

const stream = useStream({
  assistantId: "agent",
  apiUrl: "...",
  threadId,
  onThreadId: (id) => {
    setThreadId(id);
    // 存到 URL
    window.history.replaceState({}, '', `?thread=${id}`);
  },
  reconnectOnMount: true,  // 自动恢复进行中的流
});
```

### Q2: 如何实现"停止生成"功能？

**A:** 直接调用 `stream.stop()`

```tsx
<button onClick={() => stream.stop()} disabled={!stream.isLoading}>
  停止生成
</button>
```

### Q3: 工具调用时如何显示 loading 状态？

**A:** 检查 `toolCall.state`

```tsx
const toolCalls = stream.getToolCalls(message);
toolCalls.map(tc => (
  <div key={tc.id}>
    {tc.state === "pending" && <Spinner />}
    {tc.state === "completed" && <Result data={tc.result} />}
    {tc.state === "error" && <Error message={tc.result?.content} />}
  </div>
));
```

### Q4: 如何自定义请求头（比如加 API Key）？

**A:** 使用 `FetchStreamTransport`

```tsx
import { FetchStreamTransport } from "@langchain/langgraph-sdk/react";

const transport = useMemo(() => {
  return new FetchStreamTransport({
    apiUrl: "/api/agent",
    onRequest: async (url, init) => ({
      ...init,
      headers: {
        ...init.headers,
        "Authorization": `Bearer ${apiKey}`,
      },
    }),
  });
}, [apiKey]);

const stream = useStream({ transport });
```

---

## 总结

`useStream` 是 LangGraph 前端开发的**终极武器**，它把复杂的流式交互逻辑封装成一个简洁的 React Hook。

**核心价值：**

| 特性 | 价值 |
|-----|------|
| **消息流管理** | 自动拼接 token，无需手动处理 |
| **状态管理** | isLoading、error 开箱即用 |
| **对话分支** | 编辑重发、重新生成、版本切换 |
| **类型安全** | 工具调用参数有完整类型提示 |
| **乐观更新** | 秒级响应，极致用户体验 |
| **人机交互** | 敏感操作前的人工审核 |
| **多 Agent** | 区分不同 AI 的输出 |
| **自定义事件** | 进度条、状态等高级 UI |

**一句话：有了 `useStream`，你可以把精力 100% 放在产品体验上，而不是和流式通信的各种坑较劲！**

---

*本文档基于 LangGraph SDK 官方文档深度解读，如有疑问欢迎交流讨论。*
