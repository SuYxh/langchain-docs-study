import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./SkillsPage.module.css";

interface SkillInfo {
  name: string;
  displayName: string;
  description: string;
  icon: string;
}

interface Message {
  id: string;
  type: "human" | "ai" | "tool";
  content: string;
  toolCalls?: {
    id: string;
    name: string;
    args: Record<string, unknown>;
  }[];
}

const EXAMPLE_QUERIES = [
  { text: "帮我写一个查询所有活跃用户的 SQL", skill: "sql-expert" },
  { text: "Review this code: function add(a,b){return a+b}", skill: "code-reviewer" },
  { text: "帮我写一个 API 接口文档", skill: "doc-writer" },
  { text: "有哪些技能可用？", skill: "general" },
  { text: "今天天气怎么样？", skill: "none" },
];

export default function SkillsPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [currentSkill, setCurrentSkill] = useState<string | null>(null);
  const [availableSkills, setAvailableSkills] = useState<SkillInfo[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("http://localhost:2024/skills/available")
      .then((res) => res.json())
      .then((data) => setAvailableSkills(data))
      .catch(console.error);
  }, []);

  const createThread = async () => {
    const response = await fetch("http://localhost:2024/threads", {
      method: "POST",
    });
    const data = await response.json();
    return data.thread_id;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      type: "human",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = await createThread();
        setThreadId(currentThreadId);
      }

      const response = await fetch(
        `http://localhost:2024/threads/${currentThreadId}/runs/stream/skills-assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: {
              messages: [{ type: "human", content: input }],
            },
          }),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      let buffer = "";
      let streamingMsgId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            continue;
          }
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.id && data.type === "ai" && data.token === undefined && data.content === undefined) {
                streamingMsgId = data.id;
                setMessages((prev) => [...prev, {
                  id: data.id,
                  type: "ai",
                  content: "",
                }]);
              }

              if (data.token && streamingMsgId) {
                setMessages((prev) => prev.map((msg) =>
                  msg.id === streamingMsgId
                    ? { ...msg, content: msg.content + data.token }
                    : msg
                ));
              }

              if (data.content !== undefined && data.tool_calls !== undefined && streamingMsgId) {
                setMessages((prev) => prev.map((msg) =>
                  msg.id === streamingMsgId
                    ? { 
                        ...msg, 
                        content: data.content,
                        toolCalls: data.tool_calls?.map((tc: { id: string; name: string; args: Record<string, unknown> }) => ({
                          id: tc.id,
                          name: tc.name,
                          args: tc.args,
                        })),
                      }
                    : msg
                ));
                streamingMsgId = null;
              }

              if (Array.isArray(data) && data[0]) {
                const msgData = data[0];
                if (msgData.type === "tool") {
                  setMessages((prev) => [...prev, {
                    id: msgData.id || `tool_${Date.now()}`,
                    type: "tool",
                    content: msgData.content || "",
                  }]);
                } else if (msgData.type === "ai" && msgData.tool_calls) {
                  setMessages((prev) => [...prev, {
                    id: msgData.id || `ai_${Date.now()}`,
                    type: "ai",
                    content: msgData.content || "",
                    toolCalls: msgData.tool_calls?.map((tc: { id: string; name: string; args: Record<string, unknown> }) => ({
                      id: tc.id,
                      name: tc.name,
                      args: tc.args,
                    })),
                  }]);
                }
              }

              if (data.agent?.currentSkill !== undefined) {
                setCurrentSkill(data.agent.currentSkill);
              }
              if (data.currentSkill !== undefined) {
                setCurrentSkill(data.currentSkill);
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          type: "ai",
          content: `❌ 错误: ${error instanceof Error ? error.message : "未知错误"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setMessages([]);
    setThreadId(null);
    setCurrentSkill(null);
    setInput("");
  };

  const getSkillInfo = (skillName: string): SkillInfo | undefined => {
    return availableSkills.find((s) => s.name === skillName);
  };

  const formatToolCall = (toolCall: { name: string; args: Record<string, unknown> }) => {
    if (toolCall.name === "load_skill") {
      const skillName = toolCall.args.skillName as string;
      const skill = getSkillInfo(skillName);
      return (
        <div className={styles.toolCallContent}>
          <span className={styles.toolCallIcon}>🔧</span>
          <span>正在加载技能: </span>
          <span className={styles.skillBadge}>
            {skill?.icon || "📦"} {skill?.displayName || skillName}
          </span>
        </div>
      );
    }
    if (toolCall.name === "list_skills") {
      return (
        <div className={styles.toolCallContent}>
          <span className={styles.toolCallIcon}>📋</span>
          <span>查询可用技能列表</span>
        </div>
      );
    }
    if (toolCall.name === "unload_skill") {
      return (
        <div className={styles.toolCallContent}>
          <span className={styles.toolCallIcon}>🔄</span>
          <span className={styles.unloadBadge}>卸载当前技能</span>
        </div>
      );
    }
    return (
      <div className={styles.toolCallContent}>
        <span className={styles.toolCallIcon}>🔧</span>
        <span>调用工具: {toolCall.name}</span>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>
          ← 返回
        </Link>
        <h1>🎯 动态技能加载助手</h1>
        <div className={styles.headerStatus}>
          {currentSkill ? (
            <span className={styles.headerSkillActive}>
              {getSkillInfo(currentSkill)?.icon} {getSkillInfo(currentSkill)?.displayName}
              <span className={styles.headerStatusDot}></span>
            </span>
          ) : (
            <span className={styles.headerSkillInactive}>
              💤 通用模式
            </span>
          )}
        </div>
        {threadId && (
          <span className={styles.threadId}>
            Thread: {threadId.slice(0, 15)}...
          </span>
        )}
        <button onClick={handleNewSession} className={styles.newButton}>
          新建会话
        </button>
      </header>

      <div className={styles.mainContent}>
        <aside className={styles.sidebar}>
          <div className={styles.currentSkillSection}>
            <h3>⚡ 当前技能状态</h3>
            {currentSkill ? (
              <div className={styles.currentSkillCard}>
                <div className={styles.currentSkillIcon}>
                  {getSkillInfo(currentSkill)?.icon || "📦"}
                </div>
                <div className={styles.currentSkillInfo}>
                  <div className={styles.currentSkillName}>
                    {getSkillInfo(currentSkill)?.displayName || currentSkill}
                  </div>
                  <div className={styles.currentSkillStatus}>
                    <span className={styles.statusDot}></span>
                    已激活
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.noSkillCard}>
                <div className={styles.noSkillIcon}>💤</div>
                <div className={styles.noSkillInfo}>
                  <div className={styles.noSkillName}>通用模式</div>
                  <div className={styles.noSkillStatus}>未加载专业技能</div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.skillsSection}>
            <h3>🎯 可用技能</h3>
            {availableSkills.map((skill) => (
              <div 
                key={skill.name} 
                className={`${styles.skillCard} ${currentSkill === skill.name ? styles.activeSkill : ""}`}
              >
                <div className={styles.skillIcon}>{skill.icon}</div>
                <div className={styles.skillInfo}>
                  <div className={styles.skillName}>{skill.displayName}</div>
                  <div className={styles.skillDesc}>{skill.description}</div>
                </div>
                {currentSkill === skill.name && (
                  <div className={styles.activeIndicator}>✓</div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.examplesSection}>
            <h3>💡 示例问题</h3>
            {EXAMPLE_QUERIES.map((query, idx) => (
              <button
                key={idx}
                className={styles.exampleButton}
                onClick={() => setInput(query.text)}
                disabled={isLoading}
              >
                {query.text}
              </button>
            ))}
          </div>
        </aside>

        <main className={styles.chatArea}>
          <div className={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div className={styles.welcome}>
                <div className={styles.welcomeIcon}>🎯</div>
                <h2>Skills 动态加载演示</h2>
                <p>
                  这是一个智能助手，可以根据你的问题动态加载专业技能。
                  <br />
                  当你提出特定领域的问题时，助手会自动加载相应的技能来更好地回答。
                </p>
                <div className={styles.skillsOverview}>
                  <h3>可用技能</h3>
                  <div className={styles.skillsList}>
                    {availableSkills.map((skill) => (
                      <div key={skill.name} className={styles.skillPreview}>
                        <span className={styles.previewIcon}>{skill.icon}</span>
                        <div>
                          <div className={styles.previewName}>{skill.displayName}</div>
                          <div className={styles.previewDesc}>{skill.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${
                    msg.type === "human" 
                      ? styles.humanMessage 
                      : msg.type === "tool"
                      ? styles.toolMessage
                      : styles.aiMessage
                  }`}
                >
                  <div className={styles.messageIcon}>
                    {msg.type === "human" ? "👤" : msg.type === "tool" ? "🔧" : "🤖"}
                  </div>
                  <div className={styles.messageContent}>
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className={styles.toolCalls}>
                        {msg.toolCalls.map((tc) => (
                          <div key={tc.id} className={styles.toolCall}>
                            {formatToolCall(tc)}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.content && (
                      <pre className={styles.messageText}>{msg.content}</pre>
                    )}
                  </div>
                </div>
              ))
            )}

            {isLoading && (
              <div className={styles.loading}>
                <div className={styles.loadingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span>AI 正在处理...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入你的问题，AI 会自动选择合适的技能来回答..."
              disabled={isLoading}
              className={styles.input}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={styles.submitButton}
            >
              {isLoading ? "处理中..." : "发送"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
