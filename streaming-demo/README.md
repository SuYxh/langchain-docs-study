# LangChain 流式聊天演示

这是一个基于 LangChain 和 React 的流式聊天应用演示，展示了 `useStream` hook 的使用方法。

## 功能特性

- 🔄 **流式响应** - 实时显示 AI 回复
- 🛠️ **工具调用** - 支持天气查询、计算器、搜索等工具
- 💬 **多轮对话** - 支持上下文记忆
- ⚡ **乐观更新** - 用户消息立即显示
- 🎨 **现代 UI** - 深色主题，流畅动画

## 快速开始

### 1. 安装依赖

```bash
# 安装服务端依赖
cd server
pnpm install

# 安装客户端依赖
cd ../client
pnpm install
```

### 2. 启动服务端

```bash
cd server
pnpm dev
```

服务端将在 http://localhost:2024 启动

### 3. 启动客户端

```bash
cd client
pnpm dev
```

客户端将在 http://localhost:5173 启动

## 项目结构

```
streaming-demo/
├── server/                 # 服务端 (Express + LangChain)
│   ├── src/
│   │   ├── agent.ts       # Agent 定义和工具
│   │   └── server.ts      # Express 服务器
│   ├── .env               # 环境变量
│   └── package.json
│
├── client/                 # 客户端 (Vite + React + TS)
│   ├── src/
│   │   ├── App.tsx        # 主应用组件
│   │   └── App.css        # 样式
│   └── package.json
│
└── README.md
```

## 核心知识点

### useStream Hook

```tsx
const stream = useStream({
  apiUrl: "http://localhost:2024",  // LangGraph 服务地址
  assistantId: "agent",              // Agent ID
  threadId: threadId,                // 线程 ID（用于多轮对话）
  onThreadId: setThreadId,           // 线程创建回调
});
```

### 提交消息

```tsx
stream.submit(
  { messages: [{ type: "human", content: message }] },
  {
    // 乐观更新
    optimisticValues(prev) {
      return {
        ...prev,
        messages: [...prev.messages, { type: "human", content: message }],
      };
    },
  }
);
```

### 渲染工具调用

```tsx
const toolCalls = stream.getToolCalls(message);
toolCalls.map((tc) => (
  <ToolCallCard
    call={tc.call}      // { name, args }
    result={tc.result}  // ToolMessage
    state={tc.state}    // "pending" | "completed" | "error"
  />
));
```

## 可用工具

| 工具 | 描述 | 示例 |
|-----|------|------|
| `get_weather` | 查询城市天气 | "北京天气怎么样？" |
| `calculator` | 数学计算 | "计算 123 * 456" |
| `search` | 搜索信息 | "搜索 LangChain 是什么" |
