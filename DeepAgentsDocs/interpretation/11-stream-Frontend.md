# Deep Agents 前端流式输出 - 深度解读

---

## 1. 一句话省流 (The Essence)

**`useStream` 是一个 React Hook，让你能实时看到"老板 AI"和它派出的"小弟 AI"们正在干什么活，就像看直播一样！**

它能让前端页面实时显示：主 Agent 说了什么、派了哪些子 Agent、子 Agent 干到哪一步了、最后结果是什么——全程"现场直播"，而不是干等结果。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：用户等得花儿都谢了

想象一下这个场景：

你问 AI："帮我做一份市场调研报告"。

**没有流式输出时：**
- 用户点击发送 -> 看到一个转圈圈的 loading -> 等 30 秒 -> 等 1 分钟 -> 开始怀疑人生 -> "这玩意是不是卡死了？" -> 想刷新页面但又怕进度丢失...
- 最后突然"砰"一下，所有内容一次性涌出来，吓你一跳

**问题总结：**
1. **黑盒体验**：用户完全不知道后台发生了什么
2. **焦虑等待**：不知道要等多久，是 10 秒还是 10 分钟
3. **状态丢失**：刷新页面就前功尽弃
4. **消息混乱**：主 Agent 和子 Agent 的消息混在一起，像一锅粥

### 解决方案：全程直播 + 分区管理

`useStream` 提供了四大杀手锏：

| 功能 | 解决的问题 |
|------|-----------|
| **Subagent tracking** | 自动追踪每个子 Agent 的生命周期（等待中、执行中、完成、出错） |
| **Message filtering** | 主对话和子 Agent 的消息分开管理，互不干扰 |
| **Tool call visibility** | 能看到子 Agent 调用了哪些工具，干了什么 |
| **State reconstruction** | 刷新页面后能恢复之前的状态，不用从头开始 |

---

## 3. 生活化/职场类比 (The Analogy)

### 类比：项目经理的实时看板系统

把 Deep Agent 想象成一个**项目经理（PM）**，他手下有一群**专业员工（Subagents）**。

**传统方式（没有 useStream）：**
```
你（甲方）："帮我做个 PPT"
PM："好的"（然后消失了...）
你：（干等，啥也看不到）
PM：（3小时后）"做好了！"
```

**使用 useStream 后：**
```
你（甲方）："帮我做个 PPT"
PM："好的，我来安排一下！"

【你的实时看板显示】
┌──────────────────────────────────────┐
│  任务进度面板                          │
├──────────────────────────────────────┤
│  [调研员-小王] 状态：执行中             │
│    └─ 正在搜索行业数据... 找到 15 条    │
│                                        │
│  [设计师-小李] 状态：等待中             │
│    └─ 等待调研员的数据                  │
│                                        │
│  [写手-小张]   状态：执行中             │
│    └─ 正在撰写大纲... 已完成 60%        │
└──────────────────────────────────────┘
```

**术语映射：**

| 类比 | 技术概念 | 作用 |
|------|----------|------|
| 甲方（你） | 前端用户 | 发起请求，查看结果 |
| PM | Main Agent | 接收任务，分配给子 Agent |
| 员工 | Subagent | 执行具体工作 |
| 实时看板 | `useStream` Hook | 展示所有进度 |
| 任务卡片 | SubagentCard 组件 | 显示单个子 Agent 状态 |
| 进度条 | `activeSubagents` / `status` | 追踪完成进度 |
| 工作日志 | `messages` | 子 Agent 的输出内容 |
| 工具使用记录 | `toolCalls` | 子 Agent 调用的工具 |

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 `useStream` Hook

**大白话：** 一个 React 钩子函数，帮你"订阅"后台 Agent 的实时消息流。就像订阅了一个直播间，后台有任何风吹草动你都能第一时间看到。

### 4.2 `filterSubagentMessages`

**大白话：** 一个开关，打开后会把子 Agent 的消息"关进小黑屋"，不让它们污染主对话。

```
filterSubagentMessages: false（关闭）
┌────────────────────────────┐
│ 用户：帮我写报告             │
│ AI：好的                    │
│ [子Agent消息] 正在搜索...    │  <- 混在一起，很乱！
│ [子Agent消息] 找到10条...    │
│ AI：报告完成了               │
└────────────────────────────┘

filterSubagentMessages: true（开启）
┌────────────────────────────┐
│ 主对话区域                   │
│ 用户：帮我写报告             │
│ AI：好的                    │
│ AI：报告完成了               │
└────────────────────────────┘
┌────────────────────────────┐
│ 子Agent区域（独立展示）       │
│ [调研员] 正在搜索...         │
│ [调研员] 找到10条...         │
└────────────────────────────┘
```

### 4.3 `SubagentStream` 接口

**大白话：** 每个子 Agent 的"身份证"和"工作日志"的数据结构。

```typescript
interface SubagentStream {
  id: string;              // 子Agent的工号
  status: "pending" | "running" | "complete" | "error";  // 当前状态
  messages: Message[];     // 工作记录/输出内容
  result: string | null;   // 最终结果
  toolCalls: ToolCallWithResult[];  // 用了哪些工具
  depth: number;           // 嵌套层级（子Agent还能有自己的子Agent）
}
```

**状态流转图：**
```
pending（待命）-> running（执行中）-> complete（完成）
                        |
                        └─────-> error（出错了）
```

### 4.4 `streamSubgraphs: true`

**大白话：** 告诉后台："别光给我主 Agent 的消息，子 Agent 的也要！"就像看电视时说"主频道和分频道我都要看"。

### 4.5 `reconnectOnMount: true`

**大白话：** 页面刷新后自动恢复之前的对话，不用从头开始。就像游戏的"存档读档"功能。

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 5.1 基础配置 - 开启流式直播

```tsx
const stream = useStream<typeof agent>({
  assistantId: "deep-agent",        // 告诉它：我要连接哪个Agent
  apiUrl: "http://localhost:2024",  // Agent的地址在哪
  filterSubagentMessages: true,     // 子Agent消息单独放，别和主对话混一起
});
```

**人话版：** "喂，我要订阅 deep-agent 这个直播间，地址是 localhost:2024，记得把子 Agent 的弹幕单独整理出来。"

### 5.2 发送消息 - 开始任务

```tsx
stream.submit(
  { messages: [{ content: message, type: "human" }] },
  { streamSubgraphs: true }  // 开启子Agent流
);
```

**人话版：** "用户说了句话，发给 Agent 处理，而且我要看所有子 Agent 的干活过程。"

### 5.3 渲染子 Agent 卡片 - 看进度

```tsx
{stream.activeSubagents.map((subagent) => (
  <SubagentCard key={subagent.id} subagent={subagent} />
))}
```

**人话版：** "把所有正在干活的子 Agent 都显示出来，每个给它一张卡片。"

### 5.4 状态图标 - 一眼看状态

```tsx
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pending":  return <span>等待中...</span>;   // 排队等着
    case "running":  return <span>执行中...</span>;   // 正在干活
    case "complete": return <span>完成!</span>;       // 搞定了
    case "error":    return <span>出错了</span>;      // 翻车了
  }
}
```

**人话版：** "根据子 Agent 的状态，显示不同的图标，让用户一眼就知道进展。"

### 5.5 进度条组件 - 整体进度

```tsx
function SubagentPipeline({ subagents, isLoading }) {
  // 数一数完成了多少个
  const completed = subagents.filter(
    (s) => s.status === "complete" || s.status === "error"
  ).length;

  return (
    <div>
      {/* 显示进度：3/5 */}
      <span>Subagents ({completed}/{subagents.length})</span>
      
      {/* 进度条 */}
      <div style={{ width: `${(completed / subagents.length) * 100}%` }} />
    </div>
  );
}
```

**人话版：** "统计有多少子 Agent 干完了，然后画个进度条。5 个任务干完 3 个，进度条就显示 60%。"

### 5.6 线程持久化 - 刷新不丢失

```tsx
function useThreadIdParam() {
  // 从 URL 里读取 threadId
  const [threadId, setThreadId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("threadId");
  });

  // 更新 threadId 并写入 URL
  const updateThreadId = useCallback((id: string) => {
    setThreadId(id);
    const url = new URL(window.location.href);
    url.searchParams.set("threadId", id);
    window.history.replaceState({}, "", url.toString());
  }, []);

  return [threadId, updateThreadId];
}
```

**人话版：** "把对话 ID 存到浏览器地址栏里（?threadId=xxx）。这样用户刷新页面或分享链接，都能回到同一个对话。就像给每次对话发了一张'身份证'。"

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：电商智能客服系统

**需求：** 用户问"帮我对比一下 iPhone 15 和 Samsung S24 哪个更值得买"

**没有流式输出的体验：**
```
用户：帮我对比一下 iPhone 15 和 Samsung S24
客服AI：[转圈圈 30 秒...]
用户：???这玩意是不是卡了
用户：[想刷新，又怕进度丢失]
用户：[再等 20 秒...]
客服AI：[突然弹出一大段文字，3000字]
用户：妈呀吓死我了，我还以为它死了
```

**使用 useStream 后的体验：**
```
用户：帮我对比一下 iPhone 15 和 Samsung S24

┌─────────────────────────────────────────────┐
│ 客服AI：好的，我来为您做详细对比！           │
│                                             │
│ 【正在执行的任务】                            │
│ ┌─────────────────────────────────────────┐ │
│ │ [价格调研员] 执行中                       │ │
│ │   正在查询两款手机的最新价格...            │ │
│ │   -> iPhone 15: 5999 元起                │ │
│ │   -> Samsung S24: 5499 元起 ✓            │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ [配置分析师] 执行中                       │ │
│ │   正在对比硬件配置...                     │ │
│ │   -> 处理器对比: A17 vs 骁龙8G3          │ │
│ │   -> 屏幕对比中...                        │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ [用户评价分析师] 等待中                   │ │
│ │   等待前序任务完成...                     │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ 进度：[████████░░░░░░░░] 2/4               │
└─────────────────────────────────────────────┘
```

**用了 useStream 后的提升：**

| 方面 | 提升效果 |
|------|----------|
| **用户焦虑** | 降低 90%。用户能看到"原来 AI 在干活，不是卡了" |
| **体验流畅度** | 文字像打字机一样逐字出现，不是一坨坨冒出来 |
| **信息透明度** | 用户知道 AI 调用了什么工具、查了什么数据 |
| **容错能力** | 某个子 Agent 出错了，用户能看到具体哪个出错，其他的还在继续 |
| **会话恢复** | 手滑刷新页面？没事，状态都还在 |

### 代码实现要点

```tsx
function SmartCustomerService() {
  const stream = useStream<typeof agent>({
    assistantId: "ecommerce-assistant",
    apiUrl: "http://api.example.com",
    filterSubagentMessages: true,  // 关键！把子Agent消息分离出来
    reconnectOnMount: true,        // 关键！支持刷新恢复
  });

  return (
    <div className="chat-container">
      {/* 主对话区 - 干净清爽 */}
      <div className="main-chat">
        {stream.messages.map(msg => <MessageBubble message={msg} />)}
      </div>

      {/* 任务进度区 - 实时更新 */}
      {stream.activeSubagents.length > 0 && (
        <div className="task-panel">
          <h3>正在为您调研中...</h3>
          <ProgressBar 
            completed={getCompletedCount(stream.subagents)}
            total={stream.subagents.size}
          />
          {stream.activeSubagents.map(agent => (
            <TaskCard 
              key={agent.id}
              name={agent.toolCall.subagent_type}
              status={agent.status}
              content={getStreamingContent(agent.messages)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 7. 总结对比表

| 特性 | 没有 useStream | 有 useStream |
|------|----------------|--------------|
| 等待体验 | 干等 + 焦虑 | 实时看进度 |
| 消息展示 | 一坨坨冒出来 | 像打字机一样流畅 |
| 子Agent状态 | 完全不知道 | 每个都能追踪 |
| 错误处理 | 黑盒，不知道哪里出错 | 精确到哪个子Agent出问题 |
| 刷新页面 | 完蛋，从头开始 | 无缝恢复 |
| 消息管理 | 主对话和子Agent混在一起 | 分区管理，清清爽爽 |

---

## 8. 快速上手清单

1. **安装依赖**
   ```bash
   npm install @langchain/langgraph-sdk
   ```

2. **引入 Hook**
   ```tsx
   import { useStream } from "@langchain/langgraph-sdk/react";
   ```

3. **配置三要素**
   ```tsx
   const stream = useStream({
     assistantId: "你的Agent名称",
     apiUrl: "你的API地址",
     filterSubagentMessages: true,  // 推荐开启
   });
   ```

4. **发送时开启子图流**
   ```tsx
   stream.submit(input, { streamSubgraphs: true });
   ```

5. **渲染四件套**
   - `stream.messages` - 主对话消息
   - `stream.activeSubagents` - 正在执行的子Agent
   - `stream.subagents` - 所有子Agent的Map
   - `stream.isLoading` - 是否在加载中

---

**一句话总结：** `useStream` 就是给你的 AI 应用装上了"透明玻璃墙"，让用户能看到里面所有小 Agent 正在忙什么，从"黑盒等待"变成"全程直播"！
