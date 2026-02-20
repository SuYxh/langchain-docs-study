import { Link } from "react-router-dom";
import styles from "./HomePage.module.css";

const demos = [
  {
    id: "tool-calling",
    path: "/tool-calling",
    icon: "🔧",
    title: "渲染工具调用",
    description: "展示如何使用 getToolCalls 从 AI 消息中提取并渲染工具调用，包括调用详情、结果和状态。",
  },
  {
    id: "custom-events",
    path: "/custom-events",
    icon: "⚡",
    title: "自定义流式事件",
    description: "使用 writer 从代理流式传输自定义数据，并在 UI 中使用 onCustomEvent 回调处理这些事件。",
  },
  {
    id: "multi-agent",
    path: "/multi-agent",
    icon: "👥",
    title: "多智能体流式传输",
    description: "处理多智能体系统，使用消息元数据标识哪个节点生成了每条消息，并以不同样式显示输出。",
  },
  {
    id: "human-in-loop",
    path: "/human-in-loop",
    icon: "🤝",
    title: "人机交互",
    description: "当代理需要人工批准才能执行工具时处理中断，实现批准、拒绝和编辑操作。",
  },
];

export default function HomePage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🦜</span>
          <span className={styles.logoText}>LangChain Streaming</span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>前端流式传输演示</h1>
          <p className={styles.subtitle}>
            使用 LangChain 代理、LangGraph 图构建生成式 UI，
            <br />
            探索 <code>useStream</code> React hook 的各种用法。
          </p>
        </div>

        <div className={styles.grid}>
          {demos.map((demo) => (
            <Link key={demo.id} to={demo.path} className={styles.card}>
              <div className={styles.cardIcon}>{demo.icon}</div>
              <h2 className={styles.cardTitle}>{demo.title}</h2>
              <p className={styles.cardDescription}>{demo.description}</p>
              <div className={styles.cardArrow}>→</div>
            </Link>
          ))}
        </div>
      </main>

      <footer className={styles.footer}>
        <p>
          基于{" "}
          <a
            href="https://docs.langchain.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            LangChain 文档
          </a>{" "}
          构建
        </p>
      </footer>
    </div>
  );
}
