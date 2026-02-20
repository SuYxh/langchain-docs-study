import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import styles from "./MultiAgentPage.module.css";

interface AgentMessage {
  id: string;
  type: "human" | "ai";
  content: string;
  agentName?: string;
  nodeName?: string;
}

interface PipelineState {
  currentStage: string;
  researchReport?: string;
  articleDraft?: string;
  reviewResult?: string;
  finalArticle?: string;
}

type StageStatus = "pending" | "active" | "completed";

const STAGES = [
  { id: "researching", name: "资料调研", icon: "🔍", agent: "研究员" },
  { id: "writing", name: "文章撰写", icon: "✍️", agent: "写手" },
  { id: "reviewing", name: "内容审核", icon: "📋", agent: "审核员" },
  { id: "completed", name: "创作完成", icon: "✅", agent: "主管" },
];

function getStageStatus(stageId: string, currentStage: string): StageStatus {
  const stageOrder = ["idle", "researching", "research_done", "writing", "writing_done", "reviewing", "review_done", "completed"];
  const currentIndex = stageOrder.indexOf(currentStage);
  
  if (stageId === "researching") {
    if (currentStage === "researching") return "active";
    if (currentIndex > stageOrder.indexOf("researching")) return "completed";
  }
  if (stageId === "writing") {
    if (currentStage === "writing") return "active";
    if (currentIndex > stageOrder.indexOf("writing")) return "completed";
  }
  if (stageId === "reviewing") {
    if (currentStage === "reviewing") return "active";
    if (currentIndex > stageOrder.indexOf("reviewing")) return "completed";
  }
  if (stageId === "completed") {
    if (currentStage === "completed") return "completed";
  }
  return "pending";
}

function StageCard({ stage, status }: { stage: typeof STAGES[0]; status: StageStatus }) {
  return (
    <div className={`${styles.stageCard} ${styles[status]}`}>
      <div className={styles.stageIcon}>
        {status === "active" ? <span className={styles.spinner}>⏳</span> : stage.icon}
      </div>
      <div className={styles.stageInfo}>
        <div className={styles.stageName}>{stage.name}</div>
        <div className={styles.stageAgent}>{stage.agent}</div>
      </div>
      <div className={styles.stageStatus}>
        {status === "pending" && "等待中"}
        {status === "active" && "进行中..."}
        {status === "completed" && "✓ 完成"}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AgentMessage }) {
  const isHuman = message.type === "human";
  
  const agentStyles: Record<string, { icon: string; color: string }> = {
    supervisor: { icon: "👔", color: "#6366f1" },
    researcher: { icon: "🔍", color: "#10b981" },
    writer: { icon: "✍️", color: "#f59e0b" },
    editor: { icon: "📋", color: "#ec4899" },
  };
  
  const agentStyle = message.agentName 
    ? agentStyles[message.agentName] || { icon: "🤖", color: "#6b7280" }
    : { icon: "🤖", color: "#6b7280" };

  return (
    <div className={`${styles.message} ${isHuman ? styles.human : styles.agent}`}>
      <div 
        className={styles.messageAvatar}
        style={!isHuman ? { backgroundColor: agentStyle.color + "20", borderColor: agentStyle.color } : {}}
      >
        {isHuman ? "👤" : agentStyle.icon}
      </div>
      <div className={styles.messageWrapper}>
        {!isHuman && message.agentName && (
          <div className={styles.agentLabel} style={{ color: agentStyle.color }}>
            {message.agentName === "supervisor" && "主管"}
            {message.agentName === "researcher" && "研究员"}
            {message.agentName === "writer" && "写手"}
            {message.agentName === "editor" && "审核员"}
          </div>
        )}
        <div className={styles.messageContent}>
          {message.content.split("\n").map((line, i) => (
            <span key={i}>
              {line}
              {i < message.content.split("\n").length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentPanel({ 
  title, 
  content, 
  isActive 
}: { 
  title: string; 
  content: string; 
  isActive: boolean;
}) {
  if (!content) return null;
  
  return (
    <div className={`${styles.contentPanel} ${isActive ? styles.active : ""}`}>
      <div className={styles.contentHeader}>{title}</div>
      <div className={styles.contentBody}>
        {content.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < content.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function MultiAgentPage() {
  const [input, setInput] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [pipelineState, setPipelineState] = useState<PipelineState>({ currentStage: "idle" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"research" | "draft" | "review">("research");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (pipelineState.currentStage.includes("research")) {
      setActiveTab("research");
    } else if (pipelineState.currentStage.includes("writing")) {
      setActiveTab("draft");
    } else if (pipelineState.currentStage.includes("review")) {
      setActiveTab("review");
    }
  }, [pipelineState.currentStage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: AgentMessage = {
      id: `human_${Date.now()}`,
      type: "human",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);
    setPipelineState({ currentStage: "idle" });

    abortControllerRef.current = new AbortController();

    try {
      let currentThreadId = threadId;
      if (!currentThreadId) {
        const threadRes = await fetch("http://localhost:2024/threads", { method: "POST" });
        const threadData = await threadRes.json();
        currentThreadId = threadData.thread_id;
        setThreadId(currentThreadId);
      }

      const response = await fetch(
        `http://localhost:2024/threads/${currentThreadId}/runs/stream/content-creator`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { messages: [{ type: "human", content: userMessage.content }] },
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.slice(6).trim();
          } else if (line.startsWith("data:") && currentEvent) {
            try {
              const data = JSON.parse(line.slice(5).trim());
              
              if (currentEvent === "messages" && Array.isArray(data)) {
                const [msgData, metadata] = data;
                if (msgData.type === "ai" && msgData.content) {
                  const newMessage: AgentMessage = {
                    id: msgData.id || `ai_${Date.now()}`,
                    type: "ai",
                    content: msgData.content,
                    agentName: metadata?.agent_name || msgData.agent_name,
                    nodeName: metadata?.langgraph_node || msgData.langgraph_node,
                  };
                  setMessages((prev) => {
                    const exists = prev.some((m) => m.id === newMessage.id);
                    if (exists) return prev;
                    return [...prev, newMessage];
                  });
                }
              }
              
              if (currentEvent === "updates" && typeof data === "object") {
                for (const nodeOutput of Object.values(data)) {
                  const output = nodeOutput as Partial<PipelineState>;
                  setPipelineState((prev) => ({
                    ...prev,
                    currentStage: output.currentStage || prev.currentStage,
                    researchReport: output.researchReport || prev.researchReport,
                    articleDraft: output.articleDraft || prev.articleDraft,
                    reviewResult: output.reviewResult || prev.reviewResult,
                    finalArticle: output.finalArticle || prev.finalArticle,
                  }));
                }
              }

              if (currentEvent === "values" && typeof data === "object") {
                setPipelineState((prev) => ({
                  ...prev,
                  currentStage: data.currentStage || prev.currentStage,
                  researchReport: data.researchReport || prev.researchReport,
                  articleDraft: data.articleDraft || prev.articleDraft,
                  reviewResult: data.reviewResult || prev.reviewResult,
                  finalArticle: data.finalArticle || prev.finalArticle,
                }));
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "发生未知错误");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setThreadId(null);
    setMessages([]);
    setPipelineState({ currentStage: "idle" });
    setError(null);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link to="/" className={styles.backButton}>← 返回</Link>
        <h1 className={styles.title}>🎨 智能内容创作工作台</h1>
        <div className={styles.headerActions}>
          {threadId && (
            <span className={styles.threadId}>Thread: {threadId.slice(0, 12)}...</span>
          )}
          <button onClick={handleNewChat} className={styles.newChatButton}>新建</button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarTitle}>📊 工作流进度</div>
          <div className={styles.stages}>
            {STAGES.map((stage) => (
              <StageCard
                key={stage.id}
                stage={stage}
                status={getStageStatus(stage.id, pipelineState.currentStage)}
              />
            ))}
          </div>
          
          {(pipelineState.researchReport || pipelineState.articleDraft || pipelineState.reviewResult) && (
            <div className={styles.contentTabs}>
              <div className={styles.tabButtons}>
                <button
                  className={`${styles.tabButton} ${activeTab === "research" ? styles.active : ""}`}
                  onClick={() => setActiveTab("research")}
                  disabled={!pipelineState.researchReport}
                >
                  调研报告
                </button>
                <button
                  className={`${styles.tabButton} ${activeTab === "draft" ? styles.active : ""}`}
                  onClick={() => setActiveTab("draft")}
                  disabled={!pipelineState.articleDraft}
                >
                  文章草稿
                </button>
                <button
                  className={`${styles.tabButton} ${activeTab === "review" ? styles.active : ""}`}
                  onClick={() => setActiveTab("review")}
                  disabled={!pipelineState.reviewResult}
                >
                  审核结果
                </button>
              </div>
              <div className={styles.tabContent}>
                {activeTab === "research" && pipelineState.researchReport && (
                  <ContentPanel 
                    title="调研报告" 
                    content={pipelineState.researchReport} 
                    isActive={pipelineState.currentStage.includes("research")}
                  />
                )}
                {activeTab === "draft" && pipelineState.articleDraft && (
                  <ContentPanel 
                    title="文章草稿" 
                    content={pipelineState.articleDraft}
                    isActive={pipelineState.currentStage.includes("writing")}
                  />
                )}
                {activeTab === "review" && pipelineState.reviewResult && (
                  <ContentPanel 
                    title="审核结果" 
                    content={pipelineState.reviewResult}
                    isActive={pipelineState.currentStage.includes("review")}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.chatArea}>
          <div className={styles.messagesContainer}>
            {messages.length === 0 && (
              <div className={styles.welcome}>
                <h2>👥 多智能体协作演示</h2>
                <p>这是一个内容创作流水线，由多个 AI 智能体协作完成：</p>
                <div className={styles.agentList}>
                  <div className={styles.agentItem}>
                    <span className={styles.agentIcon}>👔</span>
                    <div>
                      <strong>主管 (Supervisor)</strong>
                      <p>协调整个创作流程</p>
                    </div>
                  </div>
                  <div className={styles.agentItem}>
                    <span className={styles.agentIcon}>🔍</span>
                    <div>
                      <strong>研究员 (Researcher)</strong>
                      <p>收集和整理资料</p>
                    </div>
                  </div>
                  <div className={styles.agentItem}>
                    <span className={styles.agentIcon}>✍️</span>
                    <div>
                      <strong>写手 (Writer)</strong>
                      <p>撰写文章草稿</p>
                    </div>
                  </div>
                  <div className={styles.agentItem}>
                    <span className={styles.agentIcon}>📋</span>
                    <div>
                      <strong>审核员 (Editor)</strong>
                      <p>审核和润色内容</p>
                    </div>
                  </div>
                </div>
                <div className={styles.examples}>
                  <p>试试输入一个主题：</p>
                  <ul>
                    <li>"写一篇关于 AI 在医疗领域应用的文章"</li>
                    <li>"帮我写一篇介绍量子计算的科普文章"</li>
                    <li>"创作一篇关于远程办公趋势的分析文章"</li>
                  </ul>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isLoading && messages.length > 0 && (
              <div className={styles.loading}>
                <div className={styles.loadingDot} />
                <div className={styles.loadingDot} />
                <div className={styles.loadingDot} />
              </div>
            )}

            {error && (
              <div className={styles.errorBox}>
                ❌ 错误: {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="输入文章主题，例如：写一篇关于 AI 在医疗领域应用的文章"
              disabled={isLoading}
              className={styles.input}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={styles.sendButton}
            >
              {isLoading ? "创作中..." : "开始创作"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
