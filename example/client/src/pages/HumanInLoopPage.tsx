import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./HumanInLoopPage.module.css";

interface SQLQuery {
  sql: string;
  description: string;
  affectedTable: string;
  operationType: "SELECT" | "INSERT" | "UPDATE" | "DELETE" | "DROP" | "CREATE" | "ALTER";
  estimatedRows?: number;
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface HITLRequest {
  type: "hitl_request";
  query: SQLQuery;
  message: string;
  allowedDecisions: ("approve" | "edit" | "reject")[];
}

interface HITLDecision {
  type: "approve" | "edit" | "reject";
  editedSQL?: string;
  rejectReason?: string;
}

interface Message {
  id: string;
  type: "human" | "ai";
  content: string;
}

const EXAMPLE_QUERIES = [
  { text: "查询所有订单", risk: "low" },
  { text: "删除30天前的已取消订单", risk: "high" },
  { text: "更新所有用户的角色为普通用户", risk: "critical" },
  { text: "查询金额超过200的订单", risk: "low" },
  { text: "删除products表", risk: "critical" },
];

const DATABASE_SCHEMA = [
  {
    name: "orders",
    description: "订单信息表",
    columns: ["id", "customer", "amount", "status", "created_at"],
  },
  {
    name: "users", 
    description: "用户信息表",
    columns: ["id", "name", "email", "role"],
  },
  {
    name: "products",
    description: "产品信息表", 
    columns: ["id", "name", "price", "stock", "category"],
  },
];

export default function HumanInLoopPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [currentSQL, setCurrentSQL] = useState<SQLQuery | null>(null);
  const [hitlRequest, setHitlRequest] = useState<HITLRequest | null>(null);
  const [editedSQL, setEditedSQL] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    setHitlRequest(null);
    setCurrentSQL(null);

    try {
      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = await createThread();
        setThreadId(currentThreadId);
      }

      const response = await fetch(
        `http://localhost:2024/threads/${currentThreadId}/runs/stream/sql-assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: {
              userRequest: input,
              messages: [{ type: "human", content: input }],
            },
          }),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const eventType = line.slice(7);
            continue;
          }
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (Array.isArray(data) && data[0]?.type === "ai") {
                const aiMsg: Message = {
                  id: data[0].id || `ai_${Date.now()}`,
                  type: "ai",
                  content: data[0].content,
                };
                setMessages((prev) => {
                  const exists = prev.some((m) => m.id === aiMsg.id);
                  if (exists) return prev;
                  return [...prev, aiMsg];
                });
              }
              
              if (data.generatedSQL) {
                setCurrentSQL(data.generatedSQL);
              }
              
              if (data.hasInterrupt && data.interruptData) {
                setHitlRequest(data.interruptData as HITLRequest);
                setEditedSQL(data.interruptData.query?.sql || "");
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

  const handleDecision = async (decision: HITLDecision) => {
    if (!threadId) return;
    
    setIsLoading(true);
    setHitlRequest(null);
    setShowEditModal(false);
    setShowRejectModal(false);

    const decisionMessage: Message = {
      id: `decision_${Date.now()}`,
      type: "human",
      content: decision.type === "approve" 
        ? "✅ 批准执行" 
        : decision.type === "edit"
        ? `✏️ 修改后执行:\n\`\`\`sql\n${decision.editedSQL}\n\`\`\``
        : `❌ 拒绝: ${decision.rejectReason || "用户选择不执行"}`,
    };
    setMessages((prev) => [...prev, decisionMessage]);

    try {
      const response = await fetch(
        `http://localhost:2024/threads/${threadId}/runs/resume/sql-assistant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (Array.isArray(data) && data[0]?.type === "ai") {
                const aiMsg: Message = {
                  id: data[0].id || `ai_${Date.now()}`,
                  type: "ai",
                  content: data[0].content,
                };
                setMessages((prev) => {
                  const exists = prev.some((m) => m.id === aiMsg.id);
                  if (exists) return prev;
                  return [...prev, aiMsg];
                });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error("Resume error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setMessages([]);
    setThreadId(null);
    setCurrentSQL(null);
    setHitlRequest(null);
    setInput("");
  };

  const getRiskBadge = (risk: string) => {
    const badges: Record<string, { emoji: string; label: string; className: string }> = {
      low: { emoji: "🟢", label: "低风险", className: styles.riskLow },
      medium: { emoji: "🟡", label: "中风险", className: styles.riskMedium },
      high: { emoji: "🟠", label: "高风险", className: styles.riskHigh },
      critical: { emoji: "🔴", label: "严重", className: styles.riskCritical },
    };
    return badges[risk] || badges.low;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backLink}>
          ← 返回
        </Link>
        <h1>🗄️ 智能 SQL 执行助手</h1>
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
          <div className={styles.schemaSection}>
            <h3>📊 数据库结构</h3>
            {DATABASE_SCHEMA.map((table) => (
              <div key={table.name} className={styles.tableCard}>
                <div className={styles.tableName}>{table.name}</div>
                <div className={styles.tableDesc}>{table.description}</div>
                <div className={styles.columns}>
                  {table.columns.map((col) => (
                    <span key={col} className={styles.column}>{col}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.examplesSection}>
            <h3>💡 示例查询</h3>
            {EXAMPLE_QUERIES.map((query, idx) => {
              const badge = getRiskBadge(query.risk);
              return (
                <button
                  key={idx}
                  className={styles.exampleButton}
                  onClick={() => setInput(query.text)}
                  disabled={isLoading}
                >
                  <span className={badge.className}>{badge.emoji}</span>
                  {query.text}
                </button>
              );
            })}
          </div>
        </aside>

        <main className={styles.chatArea}>
          <div className={styles.messagesContainer}>
            {messages.length === 0 ? (
              <div className={styles.welcome}>
                <div className={styles.welcomeIcon}>🤝</div>
                <h2>Human-in-the-Loop 演示</h2>
                <p>
                  这是一个智能 SQL 执行助手，演示 LangGraph 的人机协作功能。
                  <br />
                  当 AI 生成的 SQL 涉及危险操作时，系统会暂停执行并请求您的批准。
                </p>
                <div className={styles.decisionTypes}>
                  <div className={styles.decisionType}>
                    <span className={styles.decisionIcon}>✅</span>
                    <span className={styles.decisionLabel}>Approve</span>
                    <span className={styles.decisionDesc}>批准执行</span>
                  </div>
                  <div className={styles.decisionType}>
                    <span className={styles.decisionIcon}>✏️</span>
                    <span className={styles.decisionLabel}>Edit</span>
                    <span className={styles.decisionDesc}>修改后执行</span>
                  </div>
                  <div className={styles.decisionType}>
                    <span className={styles.decisionIcon}>❌</span>
                    <span className={styles.decisionLabel}>Reject</span>
                    <span className={styles.decisionDesc}>拒绝执行</span>
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${
                    msg.type === "human" ? styles.humanMessage : styles.aiMessage
                  }`}
                >
                  <div className={styles.messageIcon}>
                    {msg.type === "human" ? "👤" : "🤖"}
                  </div>
                  <div className={styles.messageContent}>
                    <pre>{msg.content}</pre>
                  </div>
                </div>
              ))
            )}

            {hitlRequest && (
              <div className={styles.hitlPanel}>
                <div className={styles.hitlHeader}>
                  <span className={styles.hitlIcon}>⚠️</span>
                  <span>需要人工审批</span>
                </div>
                <div className={styles.hitlContent}>
                  <div className={styles.sqlPreview}>
                    <div className={styles.sqlHeader}>
                      <span>待执行的 SQL</span>
                      <span className={getRiskBadge(hitlRequest.query.riskLevel).className}>
                        {getRiskBadge(hitlRequest.query.riskLevel).emoji}{" "}
                        {getRiskBadge(hitlRequest.query.riskLevel).label}
                      </span>
                    </div>
                    <pre className={styles.sqlCode}>{hitlRequest.query.sql}</pre>
                    <div className={styles.sqlMeta}>
                      <span>📋 {hitlRequest.query.operationType}</span>
                      <span>📁 {hitlRequest.query.affectedTable}</span>
                      <span>📊 预估影响 {hitlRequest.query.estimatedRows} 行</span>
                    </div>
                  </div>
                  <div className={styles.hitlActions}>
                    {hitlRequest.allowedDecisions.includes("approve") && (
                      <button
                        className={`${styles.hitlButton} ${styles.approveButton}`}
                        onClick={() => handleDecision({ type: "approve" })}
                        disabled={isLoading}
                      >
                        ✅ 批准执行
                      </button>
                    )}
                    {hitlRequest.allowedDecisions.includes("edit") && (
                      <button
                        className={`${styles.hitlButton} ${styles.editButton}`}
                        onClick={() => setShowEditModal(true)}
                        disabled={isLoading}
                      >
                        ✏️ 编辑 SQL
                      </button>
                    )}
                    {hitlRequest.allowedDecisions.includes("reject") && (
                      <button
                        className={`${styles.hitlButton} ${styles.rejectButton}`}
                        onClick={() => setShowRejectModal(true)}
                        disabled={isLoading}
                      >
                        ❌ 拒绝
                      </button>
                    )}
                  </div>
                </div>
              </div>
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
              placeholder="用自然语言描述您的数据需求，例如：查询金额最高的5个订单"
              disabled={isLoading || !!hitlRequest}
              className={styles.input}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !!hitlRequest}
              className={styles.submitButton}
            >
              {isLoading ? "处理中..." : "发送"}
            </button>
          </form>
        </main>
      </div>

      {showEditModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>✏️ 编辑 SQL</h3>
            <p>修改下方的 SQL 语句后执行：</p>
            <textarea
              value={editedSQL}
              onChange={(e) => setEditedSQL(e.target.value)}
              className={styles.sqlEditor}
              rows={6}
            />
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowEditModal(false)}
                className={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={() => handleDecision({ type: "edit", editedSQL })}
                className={styles.confirmButton}
                disabled={!editedSQL.trim()}
              >
                确认修改并执行
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>❌ 拒绝执行</h3>
            <p>请说明拒绝原因（可选）：</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className={styles.reasonEditor}
              placeholder="例如：这个操作太危险，请改为只删除已取消的订单"
              rows={4}
            />
            <div className={styles.modalActions}>
              <button
                onClick={() => setShowRejectModal(false)}
                className={styles.cancelButton}
              >
                取消
              </button>
              <button
                onClick={() => handleDecision({ type: "reject", rejectReason })}
                className={styles.rejectConfirmButton}
              >
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
