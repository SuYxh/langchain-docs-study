# 前端流式集成：useStream Hook 详解

上一篇我们学习了流式输出的后端机制。在实际应用中，我们需要将这些流式数据优雅地展示给用户。LangGraph SDK 提供了强大的 `useStream` React Hook，让前端集成变得简单而高效。

## 安装和基础设置

首先安装必要的依赖：

```bash
npm install @langchain/langgraph-sdk
```

基础使用：

```tsx
import { useStream } from "@langchain/langgraph-sdk/react";

function ChatApp() {
  const stream = useStream({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
  });

  return (
    <div>
      {stream.messages.map((msg, i) => (
        <Message key={i} message={msg} />
      ))}
    </div>
  );
}
```

## useStream 核心配置

`useStream` 接受丰富的配置选项：

```tsx
const stream = useStream<typeof agent>({
  // 必需配置
  assistantId: "deep-agent",        // 代理 ID
  apiUrl: "http://localhost:2024",  // LangGraph 服务地址
  
  // 可选配置
  threadId: existingThreadId,       // 复用已有会话
  filterSubagentMessages: true,     // 过滤子代理消息（推荐开启）
  onError: (error) => {             // 错误处理
    console.error("Stream error:", error);
  },
  onFinish: (result) => {           // 完成回调
    console.log("Stream finished:", result);
  },
});
```

## 理解 filterSubagentMessages

这是 DeepAgents 前端集成最重要的配置。当启用时，Hook 会自动：

1. **分离子代理消息**：子代理的消息不会混入主对话流
2. **追踪子代理状态**：提供独立的 `subagents` 对象
3. **保持主线清晰**：`messages` 只包含用户和主代理的对话

```tsx
const stream = useStream({
  assistantId: "deep-agent",
  apiUrl: "http://localhost:2024",
  filterSubagentMessages: true,  // 强烈推荐开启
});

// stream.messages     - 主对话消息
// stream.subagents    - 所有子代理的状态映射
// stream.activeSubagents - 当前活跃的子代理 ID 列表
```

## SubagentStream 接口详解

每个子代理都有一个 `SubagentStream` 对象描述其状态：

```typescript
interface SubagentStream {
  id: string;              // 子代理调用 ID
  status: "running" | "completed" | "error";  // 执行状态
  messages: Message[];     // 子代理内部消息
  toolCalls: ToolCall[];   // 子代理的工具调用
  result?: string;         // 执行结果（完成时）
  error?: Error;           // 错误信息（失败时）
  depth: number;           // 嵌套深度（0 = 直接子代理）
  parentId?: string;       // 父子代理 ID（嵌套时）
}
```

## 完整的聊天界面实现

```tsx
import { useStream } from "@langchain/langgraph-sdk/react";
import { useState } from "react";

function DeepAgentChat() {
  const [input, setInput] = useState("");
  
  const stream = useStream({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    filterSubagentMessages: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    await stream.submit({ messages: [{ role: "human", content: input }] });
    setInput("");
  };

  return (
    <div className="chat-container">
      {/* 主对话区域 */}
      <div className="messages">
        {stream.messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        
        {/* 流式输出中的内容 */}
        {stream.isLoading && stream.currentMessage && (
          <MessageBubble message={stream.currentMessage} isStreaming />
        )}
      </div>

      {/* 活跃子代理面板 */}
      {stream.activeSubagents.length > 0 && (
        <SubagentPanel 
          subagents={stream.subagents}
          activeIds={stream.activeSubagents}
        />
      )}

      {/* 输入区域 */}
      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入消息..."
          disabled={stream.isLoading}
        />
        <button type="submit" disabled={stream.isLoading}>
          发送
        </button>
      </form>
    </div>
  );
}
```

## 子代理状态面板

展示子代理工作状态的组件：

```tsx
function SubagentPanel({ 
  subagents, 
  activeIds 
}: { 
  subagents: Record<string, SubagentStream>;
  activeIds: string[];
}) {
  return (
    <div className="subagent-panel">
      <h3>🤖 子代理工作中</h3>
      
      {activeIds.map(id => {
        const sub = subagents[id];
        if (!sub) return null;
        
        return (
          <div key={id} className="subagent-card">
            <div className="subagent-header">
              <span className="subagent-name">{id}</span>
              <StatusBadge status={sub.status} />
            </div>
            
            {/* 子代理的工具调用 */}
            {sub.toolCalls.length > 0 && (
              <div className="tool-calls">
                {sub.toolCalls.map((tc, i) => (
                  <ToolCallItem key={i} toolCall={tc} />
                ))}
              </div>
            )}
            
            {/* 子代理的消息流 */}
            <div className="subagent-messages">
              {sub.messages.slice(-3).map((msg, i) => (
                <MiniMessage key={i} message={msg} />
              ))}
            </div>
            
            {/* 执行结果 */}
            {sub.status === "completed" && sub.result && (
              <div className="subagent-result">
                ✅ {sub.result.slice(0, 100)}...
              </div>
            )}
            
            {/* 错误信息 */}
            {sub.status === "error" && sub.error && (
              <div className="subagent-error">
                ❌ {sub.error.message}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    running: { emoji: "⏳", text: "执行中", color: "blue" },
    completed: { emoji: "✅", text: "完成", color: "green" },
    error: { emoji: "❌", text: "错误", color: "red" },
  }[status] || { emoji: "❓", text: status, color: "gray" };
  
  return (
    <span className={`status-badge ${config.color}`}>
      {config.emoji} {config.text}
    </span>
  );
}
```

## 展示工具调用

```tsx
function ToolCallItem({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="tool-call">
      <div 
        className="tool-call-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="tool-icon">🔧</span>
        <span className="tool-name">{toolCall.name}</span>
        <span className="expand-icon">{expanded ? "▼" : "▶"}</span>
      </div>
      
      {expanded && (
        <div className="tool-call-details">
          <div className="tool-args">
            <strong>参数:</strong>
            <pre>{JSON.stringify(toolCall.args, null, 2)}</pre>
          </div>
          {toolCall.result && (
            <div className="tool-result">
              <strong>结果:</strong>
              <pre>{toolCall.result}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

## 会话持久化与恢复

当用户刷新页面或重新访问时，可以恢复之前的会话：

```tsx
function ChatWithPersistence() {
  const [threadId, setThreadId] = useState<string | null>(() => {
    return localStorage.getItem("currentThreadId");
  });
  
  const stream = useStream({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    threadId: threadId || undefined,
    filterSubagentMessages: true,
    onThreadCreated: (newThreadId) => {
      setThreadId(newThreadId);
      localStorage.setItem("currentThreadId", newThreadId);
    },
  });

  const startNewConversation = () => {
    localStorage.removeItem("currentThreadId");
    setThreadId(null);
    // 刷新页面或重置 stream
    window.location.reload();
  };

  return (
    <div>
      <button onClick={startNewConversation}>新对话</button>
      {/* 聊天界面 */}
    </div>
  );
}
```

## 从历史记录重建子代理状态

页面刷新后，子代理的实时状态会丢失。但可以从会话历史中重建：

```tsx
function useSubagentHistory(threadId: string | null) {
  const [historicalSubagents, setHistoricalSubagents] = useState<
    Record<string, SubagentStream>
  >({});

  useEffect(() => {
    if (!threadId) return;
    
    async function loadHistory() {
      const response = await fetch(
        `http://localhost:2024/threads/${threadId}/history`
      );
      const history = await response.json();
      
      // 从历史消息中提取子代理调用
      const subagents: Record<string, SubagentStream> = {};
      
      for (const message of history.messages) {
        if (message.tool_calls) {
          for (const tc of message.tool_calls) {
            if (isSubagentCall(tc)) {
              subagents[tc.id] = {
                id: tc.id,
                status: "completed",
                messages: [],
                toolCalls: [],
                result: tc.result,
                depth: 0,
              };
            }
          }
        }
      }
      
      setHistoricalSubagents(subagents);
    }
    
    loadHistory();
  }, [threadId]);

  return historicalSubagents;
}
```

## 处理中断和恢复

当代理需要人工确认时：

```tsx
function ChatWithInterrupt() {
  const stream = useStream({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    filterSubagentMessages: true,
  });

  const handleApprove = async () => {
    await stream.resume({ action: "approve" });
  };

  const handleReject = async () => {
    await stream.resume({ action: "reject" });
  };

  return (
    <div>
      {/* 消息列表 */}
      
      {stream.isInterrupted && (
        <div className="interrupt-dialog">
          <h3>需要确认</h3>
          <p>{stream.interruptMessage}</p>
          <div className="actions">
            <button onClick={handleApprove}>✅ 批准</button>
            <button onClick={handleReject}>❌ 拒绝</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## 错误处理和重试

```tsx
function ChatWithErrorHandling() {
  const [error, setError] = useState<Error | null>(null);
  
  const stream = useStream({
    assistantId: "deep-agent",
    apiUrl: "http://localhost:2024",
    filterSubagentMessages: true,
    onError: (err) => {
      setError(err);
      console.error("Stream error:", err);
    },
  });

  const handleRetry = async () => {
    setError(null);
    await stream.retry();
  };

  return (
    <div>
      {/* 消息列表 */}
      
      {error && (
        <div className="error-banner">
          <span>❌ 发生错误: {error.message}</span>
          <button onClick={handleRetry}>重试</button>
        </div>
      )}
    </div>
  );
}
```

## 样式参考

```css
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.subagent-panel {
  background: #f5f5f5;
  border-top: 1px solid #ddd;
  padding: 1rem;
  max-height: 200px;
  overflow-y: auto;
}

.subagent-card {
  background: white;
  border-radius: 8px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.tool-call {
  background: #f9f9f9;
  border-radius: 4px;
  margin: 0.5rem 0;
  font-size: 0.875rem;
}

.tool-call-header {
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.status-badge.blue { background: #e3f2fd; color: #1976d2; }
.status-badge.green { background: #e8f5e9; color: #388e3c; }
.status-badge.red { background: #ffebee; color: #d32f2f; }
```

## 小结

本文详细介绍了 DeepAgents 的前端流式集成：

1. **useStream Hook**：简化流式数据处理的 React Hook
2. **filterSubagentMessages**：自动分离子代理消息，保持主线清晰
3. **SubagentStream**：子代理状态的完整接口
4. **UI 组件**：消息列表、子代理面板、工具调用展示
5. **会话持久化**：支持页面刷新后恢复会话
6. **错误处理**：优雅处理错误和重试机制

至此，第五部分「流式处理篇」完成。下一部分我们将学习 DeepAgents 的 CLI 工具，了解如何快速创建和管理代理项目。
