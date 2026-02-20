import { useState } from "react";
import { Link } from "react-router-dom";
import { useStream } from "@langchain/langgraph-sdk/react";
import type { Message, ToolMessage } from "@langchain/langgraph-sdk";
import type { ToolCallWithResult } from "@langchain/langgraph-sdk/react";
import styles from "./ToolCallingPage.module.css";

function parseToolResult(result?: ToolMessage): {
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

function WeatherCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const { call, result, state } = toolCall;
  const isLoading = state === "pending";
  const parsedResult = parseToolResult(result);
  const location = (call.args as { city?: string }).city || "";

  return (
    <div className={styles.weatherCard}>
      <div className={styles.weatherGradient} />
      <div className={styles.weatherContent}>
        <div className={styles.weatherHeader}>
          <span className={styles.weatherLocation}>{location}</span>
          {isLoading && <span className={styles.weatherLoading}>加载中...</span>}
        </div>
        {parsedResult.status === "error" ? (
          <div className={styles.weatherError}>{parsedResult.content}</div>
        ) : (
          <div className={styles.weatherResult}>
            {parsedResult.content || "获取天气中..."}
          </div>
        )}
      </div>
    </div>
  );
}

function CalculatorCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const { call, result, state } = toolCall;
  const isLoading = state === "pending";
  const parsedResult = parseToolResult(result);

  return (
    <div className={styles.calculatorCard}>
      <div className={styles.toolCardHeader}>
        <span className={styles.toolIcon}>🔢</span>
        <span className={styles.toolName}>calculator</span>
        <span className={`${styles.toolStatus} ${styles[state]}`}>
          {isLoading ? "计算中..." : "完成"}
        </span>
      </div>
      <div className={styles.calculatorExpression}>
        {(call.args as { expression?: string }).expression}
      </div>
      {parsedResult.content && (
        <div className={styles.calculatorResult}>{parsedResult.content}</div>
      )}
    </div>
  );
}

function GenericToolCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  const { call, result, state } = toolCall;
  const isLoading = state === "pending";
  const parsedResult = parseToolResult(result);

  const toolIcons: Record<string, string> = {
    search: "🔍",
    get_weather: "🌤️",
    calculator: "🔢",
  };

  return (
    <div className={styles.genericToolCard}>
      <div className={styles.toolCardHeader}>
        <span className={styles.toolIcon}>{toolIcons[call.name] || "🔧"}</span>
        <span className={styles.toolName}>{call.name}</span>
        <span className={`${styles.toolStatus} ${styles[state]}`}>
          {isLoading ? "处理中..." : state === "error" ? "错误" : "完成"}
        </span>
      </div>
      <pre className={styles.toolArgs}>{JSON.stringify(call.args, null, 2)}</pre>
      {parsedResult.content && (
        <div
          className={`${styles.toolResult} ${parsedResult.status === "error" ? styles.resultError : ""}`}
        >
          {parsedResult.content}
        </div>
      )}
    </div>
  );
}

function ToolCallCard({ toolCall }: { toolCall: ToolCallWithResult }) {
  if (toolCall.call.name === "get_weather") {
    return <WeatherCard toolCall={toolCall} />;
  }
  if (toolCall.call.name === "calculator") {
    return <CalculatorCard toolCall={toolCall} />;
  }
  return <GenericToolCard toolCall={toolCall} />;
}

function MessageBubble({ message }: { message: Message }) {
  const isHuman = message.type === "human";
  if (!message.content) return null;

  return (
    <div className={`${styles.message} ${isHuman ? styles.human : styles.ai}`}>
      <div className={styles.messageAvatar}>{isHuman ? "👤" : "🤖"}</div>
      <div className={styles.messageContent}>{message.content as string}</div>
    </div>
  );
}

export default function ToolCallingPage() {
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);

  const stream = useStream({
    assistantId: "agent",
    apiUrl: "http://localhost:2024",
    threadId: threadId ?? undefined,
    onThreadId: setThreadId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || stream.isLoading) return;

    stream.submit({
      messages: [{ type: "human", content: input.trim() }],
    });
    setInput("");
  };

  const handleNewChat = () => {
    setThreadId(null);
    stream.stop();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backButton}>
          ← 返回
        </Link>
        <h1 className={styles.title}>渲染工具调用</h1>
        <div className={styles.headerActions}>
          {threadId && (
            <span className={styles.threadId}>Thread: {threadId.slice(0, 12)}...</span>
          )}
          <button onClick={handleNewChat} className={styles.newChatButton}>
            新对话
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.messages}>
          {stream.messages.length === 0 && stream.toolCalls.length === 0 && (
            <div className={styles.welcome}>
              <h2>👋 工具调用演示</h2>
              <p>这个演示展示如何渲染工具调用卡片，包括调用详情、结果和状态。</p>
              <div className={styles.examples}>
                <p>试试这些例子：</p>
                <ul>
                  <li>🌤️ "北京天气怎么样？"</li>
                  <li>🔢 "计算 123 * 456 + 789"</li>
                  <li>🔍 "搜索 LangChain 是什么"</li>
                </ul>
              </div>
            </div>
          )}

          {stream.messages.map((message, idx) => {
            if (message.type === "ai") {
              const toolCalls = stream.getToolCalls(message);

              if (toolCalls.length > 0) {
                return (
                  <div key={message.id ?? idx} className={styles.toolCallsGroup}>
                    {toolCalls.map((toolCall) => (
                      <ToolCallCard key={toolCall.id} toolCall={toolCall} />
                    ))}
                  </div>
                );
              }
            }

            if (message.type === "tool") {
              return null;
            }

            return <MessageBubble key={message.id ?? idx} message={message} />;
          })}

          {stream.isLoading && stream.toolCalls.length === 0 && (
            <div className={styles.loading}>
              <div className={styles.loadingDot} />
              <div className={styles.loadingDot} />
              <div className={styles.loadingDot} />
            </div>
          )}

          {stream.error != null && (
            <div className={styles.errorBox}>
              ❌ 错误:{" "}
              {stream.error instanceof Error
                ? stream.error.message
                : String(stream.error)}
            </div>
          )}
        </div>
      </main>

      <footer className={styles.inputArea}>
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            disabled={stream.isLoading}
            className={styles.input}
          />
          <button
            type="submit"
            disabled={stream.isLoading || !input.trim()}
            className={styles.sendButton}
          >
            {stream.isLoading ? "发送中..." : "发送"}
          </button>
        </form>
      </footer>
    </div>
  );
}
