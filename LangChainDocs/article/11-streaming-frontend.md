# 11. 前端流式集成：useStream Hook 深度指南

## 简单来说

useStream 是 LangGraph 提供的 React Hook，它让前端接入流式 AI 对话变得超级简单——自动管理对话线程、处理消息状态、支持编辑重发和分支对话。就像给你的聊天应用装上了"自动驾驶"系统。

## 本节目标

学完本节，你将能够：
- 使用 useStream Hook 构建实时流式聊天界面
- 实现对话线程管理和页面刷新后恢复
- 支持消息编辑、重新生成和分支切换
- 处理工具调用的实时渲染
- 实现人机协作审批流程

## 业务场景

想象这些真实需求：

1. **智能客服系统**：用户发送问题后，AI 回复实时逐字显示，页面刷新后能恢复之前的对话
2. **AI 写作助手**：用户可以编辑之前的提示词重新生成，或者对比不同版本的输出
3. **审批工作流**：AI 执行敏感操作前需要人工确认，用户可以批准或拒绝

这些场景都需要前端具备复杂的流式状态管理能力——而 useStream 正是为此而生。

---

## 一、useStream 基础入门

### 1.1 安装配置

```bash
npm install @langchain/langgraph-sdk
```

### 1.2 最简单的流式聊天

```tsx
import { useStream } from "@langchain/langgraph-sdk/react";

function ChatApp() {
  const thread = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
  });

  return (
    <div>
      {/* 渲染所有消息 */}
      {thread.messages.map((msg) => (
        <div key={msg.id} className={msg.type}>
          {typeof msg.content === "string" 
            ? msg.content 
            : JSON.stringify(msg.content)}
        </div>
      ))}
      
      {/* 显示加载状态 */}
      {thread.isLoading && <div>AI 正在思考...</div>}
      
      {/* 输入表单 */}
      <form onSubmit={(e) => {
        e.preventDefault();
        const input = e.currentTarget.elements.namedItem("input") as HTMLInputElement;
        thread.submit({ messages: [{ role: "user", content: input.value }] });
        input.value = "";
      }}>
        <input name="input" placeholder="输入消息..." />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

### 1.3 理解核心返回值

```tsx
const {
  messages,      // 当前对话的所有消息
  isLoading,     // 是否正在等待 AI 响应
  error,         // 错误信息（如果有）
  submit,        // 发送新消息的函数
  stop,          // 停止当前流式响应
  threadId,      // 当前对话线程 ID
} = useStream({ ... });
```

**类比理解**：useStream 就像一个"对话管家"——它帮你记录所有消息（messages）、告诉你 AI 是否在工作（isLoading）、提供发消息的按钮（submit）、还能在必要时喊停（stop）。

---

## 二、对话线程管理

### 2.1 基本线程管理

每次调用 `submit()` 时，useStream 会自动创建新线程或复用现有线程：

```tsx
function ChatWithThreads() {
  const [currentThreadId, setCurrentThreadId] = useState<string | undefined>();

  const thread = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
    threadId: currentThreadId,
    onThreadId: (id) => {
      setCurrentThreadId(id);
      localStorage.setItem("threadId", id);
    },
  });

  const startNewConversation = () => {
    setCurrentThreadId(undefined);
  };

  return (
    <div>
      <button onClick={startNewConversation}>开始新对话</button>
      <p>当前线程: {thread.threadId || "无"}</p>
      {/* 消息渲染... */}
    </div>
  );
}
```

### 2.2 页面刷新后恢复对话

```tsx
function PersistentChat() {
  const [threadId, setThreadId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("threadId") || undefined;
    }
  });

  const thread = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
    threadId,
    onThreadId: (id) => {
      setThreadId(id);
      localStorage.setItem("threadId", id);
    },
  });

  return (
    <div>
      {thread.messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

**关键点**：
- `threadId` 传入已有线程 ID，会自动加载历史消息
- `onThreadId` 回调在新线程创建时触发，用于持久化存储
- 用户刷新页面后，从 localStorage 读取 threadId 即可恢复对话

---

## 三、流式中断状态恢复

### 3.1 处理页面刷新时的流式中断

如果用户在 AI 响应过程中刷新页面，可以自动重连继续接收：

```tsx
const thread = useStream({
  apiUrl: "http://localhost:2024",
  assistantId: "agent",
  messagesKey: "messages",
  threadId,
  onThreadId: setThreadId,
});
```

useStream 内部会检测线程状态，如果存在未完成的流式响应，会自动重连。

### 3.2 显示缓存的线程内容

在等待服务端响应时，先显示本地缓存的内容：

```tsx
function ChatWithCache() {
  const [cachedMessages, setCachedMessages] = useState<Message[]>([]);
  const [threadId, setThreadId] = useState<string | undefined>();

  const thread = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
    threadId,
    onThreadId: (id, { messages }) => {
      setThreadId(id);
      if (messages) {
        setCachedMessages(messages);
      }
    },
  });

  const displayMessages = thread.messages.length > 0 
    ? thread.messages 
    : cachedMessages;

  return (
    <div>
      {displayMessages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      {thread.isLoading && displayMessages.length === 0 && (
        <div>正在加载历史消息...</div>
      )}
    </div>
  );
}
```

---

## 四、消息编辑与分支对话

### 4.1 编辑历史消息重新生成

用户可以修改之前发送的消息，让 AI 基于修改后的内容重新回复：

```tsx
function EditableChat() {
  const thread = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
  });

  const handleEdit = (messageId: string, newContent: string) => {
    const messageIndex = thread.messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const editedMessages = [
      ...thread.messages.slice(0, messageIndex),
      { ...thread.messages[messageIndex], content: newContent }
    ];

    thread.submit(
      { messages: editedMessages },
      { checkpoint: thread.messages[messageIndex - 1]?.id }
    );
  };

  return (
    <div>
      {thread.messages.map((msg) => (
        <div key={msg.id}>
          <span>{msg.content}</span>
          {msg.type === "human" && (
            <button onClick={() => {
              const newContent = prompt("编辑消息:", msg.content as string);
              if (newContent) handleEdit(msg.id, newContent);
            }}>
              编辑
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 4.2 重新生成 AI 回复

```tsx
function RegenerateChat() {
  const thread = useStream<{ messages: Message[] }>({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
  });

  const handleRegenerate = (aiMessageId: string) => {
    const aiMessageIndex = thread.messages.findIndex(m => m.id === aiMessageId);
    if (aiMessageIndex === -1) return;

    const previousMessages = thread.messages.slice(0, aiMessageIndex);
    const lastHumanMessage = previousMessages.filter(m => m.type === "human").pop();
    
    if (lastHumanMessage) {
      thread.submit(
        { messages: previousMessages },
        { checkpoint: lastHumanMessage.id }
      );
    }
  };

  return (
    <div>
      {thread.messages.map((msg) => (
        <div key={msg.id}>
          <span>{msg.content}</span>
          {msg.type === "ai" && (
            <button onClick={() => handleRegenerate(msg.id)}>
              🔄 重新生成
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### 4.3 分支切换

当用户编辑消息或重新生成时，会创建新的对话分支。可以在不同分支间切换：

```tsx
function BranchableChat() {
  const thread = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
  });

  const getBranches = (messageId: string): string[] => {
    return thread.branches[messageId] || [];
  };

  const switchBranch = (branchCheckpointId: string) => {
    thread.setBranchCheckpointId(branchCheckpointId);
  };

  return (
    <div>
      {thread.messages.map((msg) => {
        const branches = getBranches(msg.id);
        return (
          <div key={msg.id}>
            <span>{msg.content}</span>
            {branches.length > 1 && (
              <div>
                <span>分支 {branches.indexOf(msg.id) + 1}/{branches.length}</span>
                <button 
                  onClick={() => {
                    const currentIndex = branches.indexOf(msg.id);
                    const prevIndex = (currentIndex - 1 + branches.length) % branches.length;
                    switchBranch(branches[prevIndex]);
                  }}
                >
                  ← 上一个
                </button>
                <button 
                  onClick={() => {
                    const currentIndex = branches.indexOf(msg.id);
                    const nextIndex = (currentIndex + 1) % branches.length;
                    switchBranch(branches[nextIndex]);
                  }}
                >
                  下一个 →
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**类比理解**：分支对话就像 Git 的版本控制——每次编辑或重新生成都会创建一个"分支"，你可以在不同分支间切换，查看不同版本的对话历史。

---

## 五、类型安全的流式处理

### 5.1 使用 createAgent 的类型推断

```tsx
import { createAgent } from "@langchain/langgraph";
import { useStream } from "@langchain/langgraph-sdk/react";

const agent = createAgent({
  model: "gpt-4o",
  tools: [searchTool, calculatorTool],
});

type AgentState = typeof agent.State;

function TypeSafeChat() {
  const thread = useStream<AgentState>({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
  });

  return (
    <div>
      {thread.messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

### 5.2 自定义 StateGraph 的类型

```tsx
import { Annotation } from "@langchain/langgraph";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";

const AgentState = Annotation.Root({
  messages: Annotation<Message[]>({ reducer: (a, b) => [...a, ...b] }),
  context: Annotation<string>(),
  metadata: Annotation<Record<string, unknown>>(),
});

type AgentStateType = typeof AgentState.State;

function CustomStateChat() {
  const thread = useStream<AgentStateType>({
    apiUrl: "http://localhost:2024",
    assistantId: "my-graph",
    messagesKey: "messages",
  });

  return (
    <div>
      {thread.values?.context && (
        <div className="context-panel">上下文: {thread.values.context}</div>
      )}
      {thread.messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

---

## 六、工具调用的实时渲染

### 6.1 渲染工具调用过程

当 AI 调用工具时，可以实时显示工具执行状态：

```tsx
import { isToolMessage, isAIMessageChunk } from "@langchain/core/messages";

function ChatWithTools() {
  const thread = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
  });

  const renderMessage = (msg: Message) => {
    if (isToolMessage(msg)) {
      return (
        <div className="tool-result">
          <strong>🔧 工具结果 ({msg.name}):</strong>
          <pre>{JSON.stringify(msg.content, null, 2)}</pre>
        </div>
      );
    }

    if (isAIMessageChunk(msg) && msg.tool_calls?.length) {
      return (
        <div className="tool-call">
          <strong>🤖 AI 正在调用工具:</strong>
          {msg.tool_calls.map((call, i) => (
            <div key={i}>
              <span>{call.name}</span>
              <pre>{JSON.stringify(call.args, null, 2)}</pre>
            </div>
          ))}
        </div>
      );
    }

    return <div className="text-message">{msg.content}</div>;
  };

  return (
    <div>
      {thread.messages.map((msg) => (
        <div key={msg.id} className={msg.type}>
          {renderMessage(msg)}
        </div>
      ))}
    </div>
  );
}
```

### 6.2 工具调用状态指示器

```tsx
function ToolStatusIndicator({ message }: { message: Message }) {
  if (!isAIMessageChunk(message) || !message.tool_calls?.length) {
    return null;
  }

  return (
    <div className="tool-status">
      {message.tool_calls.map((call, i) => (
        <div key={i} className="tool-badge">
          <span className="spinner">⏳</span>
          <span>正在执行: {call.name}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 七、自定义流式事件

### 7.1 处理 Agent 发送的自定义更新

后端 Agent 可以使用 `streamCustomData` 或 `Command` 发送自定义事件：

```tsx
function ChatWithCustomEvents() {
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const thread = useStream({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
    onCustomEvent: (event, options) => {
      if (event.type === "progress") {
        setProgress(event.data.percentage);
        setStatusMessage(event.data.message);
      }
      if (event.type === "status") {
        setStatusMessage(event.data);
      }
    },
  });

  return (
    <div>
      {progress > 0 && progress < 100 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <span>{statusMessage}</span>
        </div>
      )}
      {thread.messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  );
}
```

### 7.2 对应的后端代码

```typescript
import { Command } from "@langchain/langgraph";

async function* myAgentNode(state) {
  yield new Command({
    update: {},
    custom: { type: "progress", data: { percentage: 30, message: "正在搜索..." } }
  });

  const searchResult = await searchTool.invoke(state.query);

  yield new Command({
    update: {},
    custom: { type: "progress", data: { percentage: 70, message: "正在分析结果..." } }
  });

  const analysis = await analyzeResults(searchResult);

  yield new Command({
    update: { messages: [{ role: "assistant", content: analysis }] },
    custom: { type: "progress", data: { percentage: 100, message: "完成" } }
  });
}
```

---

## 八、人机协作审批流程

### 8.1 实现中断等待用户确认

```tsx
function ChatWithApproval() {
  const thread = useStream<{
    messages: Message[];
    pendingAction?: { tool: string; args: Record<string, unknown> };
  }>({
    apiUrl: "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
  });

  const handleApprove = () => {
    thread.submit({ approved: true });
  };

  const handleReject = () => {
    thread.submit({ approved: false });
  };

  const pendingAction = thread.values?.pendingAction;

  return (
    <div>
      {thread.messages.map((msg) => (
        <div key={msg.id}>{msg.content}</div>
      ))}
      
      {pendingAction && thread.interrupt && (
        <div className="approval-dialog">
          <h3>⚠️ 需要您的确认</h3>
          <p>AI 想要执行以下操作：</p>
          <pre>
            工具: {pendingAction.tool}
            参数: {JSON.stringify(pendingAction.args, null, 2)}
          </pre>
          <div className="actions">
            <button onClick={handleApprove} className="approve">
              ✅ 批准执行
            </button>
            <button onClick={handleReject} className="reject">
              ❌ 拒绝
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 8.2 理解 interrupt 状态

```tsx
const {
  interrupt,     // 中断信息（如果有）
  isLoading,     // 是否正在加载
} = useStream({ ... });

if (interrupt && !isLoading) {
  console.log("Agent 已暂停，等待用户输入:", interrupt);
}
```

---

## 九、多 Agent 流式处理

### 9.1 渲染多 Agent 的消息

当系统包含多个协作的 Agent 时，需要区分不同 Agent 的输出：

```tsx
function MultiAgentChat() {
  const thread = useStream<{
    messages: Message[];
  }>({
    apiUrl: "http://localhost:2024",
    assistantId: "multi-agent-system",
    messagesKey: "messages",
  });

  const getAgentName = (msg: Message): string => {
    return msg.name || "assistant";
  };

  const getAgentColor = (agentName: string): string => {
    const colors: Record<string, string> = {
      researcher: "#4CAF50",
      writer: "#2196F3",
      reviewer: "#FF9800",
      assistant: "#9C27B0",
    };
    return colors[agentName] || "#666";
  };

  return (
    <div>
      {thread.messages.map((msg) => {
        const agentName = getAgentName(msg);
        return (
          <div 
            key={msg.id} 
            className={`message ${msg.type}`}
            style={{ borderLeftColor: getAgentColor(agentName) }}
          >
            {msg.type === "ai" && (
              <span className="agent-badge" style={{ backgroundColor: getAgentColor(agentName) }}>
                {agentName}
              </span>
            )}
            <div className="content">{msg.content}</div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## 十、完整实战示例

### 10.1 功能完整的 AI 聊天组件

```tsx
import { useState, useEffect, useRef } from "react";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message } from "@langchain/langgraph-sdk";

interface ChatState {
  messages: Message[];
  context?: string;
}

export function AdvancedChat() {
  const [threadId, setThreadId] = useState<string | undefined>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chat-thread-id") || undefined;
    }
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const thread = useStream<ChatState>({
    apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:2024",
    assistantId: "agent",
    messagesKey: "messages",
    threadId,
    onThreadId: (id) => {
      setThreadId(id);
      localStorage.setItem("chat-thread-id", id);
    },
    onError: (error) => {
      console.error("Stream error:", error);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread.messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || thread.isLoading) return;
    
    thread.submit({ 
      messages: [{ role: "user", content: input }] 
    });
    setInput("");
  };

  const handleNewChat = () => {
    setThreadId(undefined);
    localStorage.removeItem("chat-thread-id");
  };

  const handleRegenerate = (messageId: string) => {
    const messageIndex = thread.messages.findIndex(m => m.id === messageId);
    if (messageIndex <= 0) return;

    const previousMessages = thread.messages.slice(0, messageIndex);
    thread.submit(
      { messages: previousMessages },
      { checkpoint: thread.messages[messageIndex - 1].id }
    );
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>AI 助手</h1>
        <button onClick={handleNewChat}>新对话</button>
      </header>

      <div className="messages-container">
        {thread.messages.length === 0 && (
          <div className="welcome-message">
            <h2>👋 你好！有什么可以帮助你的？</h2>
          </div>
        )}

        {thread.messages.map((msg, index) => (
          <div key={msg.id} className={`message ${msg.type}`}>
            <div className="message-header">
              <span className="role">
                {msg.type === "human" ? "你" : "AI"}
              </span>
            </div>
            <div className="message-content">
              {typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}
            </div>
            {msg.type === "ai" && (
              <div className="message-actions">
                <button 
                  onClick={() => handleRegenerate(msg.id)}
                  disabled={thread.isLoading}
                >
                  🔄 重新生成
                </button>
              </div>
            )}
          </div>
        ))}

        {thread.isLoading && (
          <div className="message ai loading">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        {thread.error && (
          <div className="error-message">
            ❌ 发生错误: {thread.error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          disabled={thread.isLoading}
        />
        <button type="submit" disabled={thread.isLoading || !input.trim()}>
          {thread.isLoading ? "发送中..." : "发送"}
        </button>
        {thread.isLoading && (
          <button type="button" onClick={thread.stop}>
            停止
          </button>
        )}
      </form>
    </div>
  );
}
```

### 10.2 配套 CSS 样式

```css
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 800px;
  margin: 0 auto;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 8px;
}

.message.human {
  background: #e3f2fd;
  margin-left: 2rem;
}

.message.ai {
  background: #f5f5f5;
  margin-right: 2rem;
}

.message.loading {
  background: transparent;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #666;
  border-radius: 50%;
  animation: typing 1s infinite;
}

.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

.input-form {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid #eee;
}

.input-form input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.input-form button {
  padding: 0.75rem 1.5rem;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.input-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error-message {
  color: #d32f2f;
  padding: 1rem;
  background: #ffebee;
  border-radius: 4px;
}
```

---

## 常见问题

### Q1: 页面刷新后消息丢失怎么办？

确保正确保存和恢复 threadId：

```tsx
const [threadId, setThreadId] = useState<string | undefined>(() => {
  return localStorage.getItem("threadId") || undefined;
});

const thread = useStream({
  threadId,
  onThreadId: (id) => {
    setThreadId(id);
    localStorage.setItem("threadId", id);
  },
});
```

### Q2: 如何处理网络断开重连？

useStream 内置了重连机制，你可以通过 `onError` 监听错误：

```tsx
const thread = useStream({
  onError: (error) => {
    if (error.message.includes("network")) {
      showToast("网络连接中断，正在重试...");
    }
  },
});
```

### Q3: 如何限制消息历史长度？

可以在发送前截断消息数组：

```tsx
const submit = (newMessage: string) => {
  const recentMessages = thread.messages.slice(-20);
  thread.submit({
    messages: [...recentMessages, { role: "user", content: newMessage }]
  });
};
```

---

## 总结

useStream Hook 为 React 应用提供了强大的流式 AI 对话能力：

| 功能 | 实现方式 |
|------|----------|
| 基础流式聊天 | `useStream` + `messages` + `submit` |
| 对话持久化 | `threadId` + `onThreadId` + localStorage |
| 消息编辑/重新生成 | `submit` + `checkpoint` 选项 |
| 分支切换 | `branches` + `setBranchCheckpointId` |
| 工具调用渲染 | 检测 `tool_calls` 属性 |
| 自定义事件 | `onCustomEvent` 回调 |
| 人机协作 | `interrupt` 状态 + 条件渲染 |

**核心理念**：useStream 将复杂的流式状态管理封装成简单的 Hook API，让开发者专注于 UI 和业务逻辑，而不是底层的 WebSocket 通信和状态同步。

下一步，你可以结合实际项目需求，选择性地集成这些功能，打造流畅的 AI 对话体验！
