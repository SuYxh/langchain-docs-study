# Deep Agents 流式输出概览 - 深度解读

---

## 1. 一句话省流 (The Essence)

**Deep Agents 流式输出就像给你的 AI 团队装上了"实时摄像头"，让你能在大老板（主 Agent）和各个小弟（子 Agent）干活的时候，实时看到他们每一个动作、每一句话、甚至每一个字是怎么蹦出来的。**

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：等到花儿都谢了

想象一下这个场景：你让 AI 帮你做一个复杂的研究报告，AI 说"好的，请稍等"... 然后界面就卡住了。

你不知道：
- AI 现在在干嘛？是在查资料还是在发呆？
- 进度到哪了？还要等多久？
- 万一中间出错了怎么办？我是不是白等了？
- 主 Agent 派了几个子 Agent 出去干活？他们各自进展如何？

这种"黑盒子"体验简直让人抓狂！尤其是当你的 Deep Agent 系统有多个子 Agent 并行工作时，你完全不知道这个"AI 团队"内部在发生什么。

### 解决：实时直播 AI 的大脑活动

Deep Agents 的流式输出系统提供了四个关键能力：

| 能力 | 解决的问题 |
|------|-----------|
| **流式子 Agent 进度** | 追踪每个子 Agent 的执行状态，知道谁在干活、干到哪了 |
| **流式 LLM Token** | 像 ChatGPT 那样一个字一个字地往外蹦，用户不用干等 |
| **流式工具调用** | 看到 AI 正在调用什么工具（搜索、计算、查数据库等） |
| **流式自定义更新** | 你可以自己定义要广播什么信息（比如进度百分比） |

---

## 3. 生活化/职场类比 (The Analogy)

### 比喻：一个项目经理带着多个外包团队

假设你是公司老板，你有一个**项目经理**（主 Agent），他手下有几个**外包团队**（子 Agents）。

**没有流式输出之前**的工作方式：
- 你跟项目经理说："帮我做个市场调研报告"
- 项目经理说："好的"，然后消失了
- 你只能在会议室干坐着，等到项目经理拿着成品回来
- 中间发生了什么？不知道。进度多少？不知道。有没有问题？不知道。

**有了流式输出之后**的工作方式：
- 项目经理给你装了一套**实时监控系统**
- 你能看到：
  - 项目经理正在分配任务给"市场组"和"数据组"（子 Agent 启动）
  - "市场组"正在网上搜索竞品信息（工具调用）
  - "数据组"的分析报告正在一行一行地写出来（LLM Token 流）
  - 每个团队都会汇报："我完成 50% 了"（自定义进度更新）

**关键术语映射：**

| 职场角色 | Deep Agents 概念 |
|---------|-----------------|
| 你（老板） | 用户/前端界面 |
| 项目经理 | 主 Agent (Main Agent) |
| 外包团队 | 子 Agent (Subagent) |
| 实时监控系统 | Stream（流） |
| 监控画面的标签（"市场组"/"数据组"） | Namespace（命名空间） |
| 团队使用的工具（搜索引擎、Excel） | Tool Calls（工具调用） |
| 团队汇报进度的对讲机 | config.writer（自定义更新发射器） |

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 Stream Mode（流模式）

这是选择你要"看什么"的开关：

| 模式 | 你能看到什么 | 适用场景 |
|-----|-------------|---------|
| `updates` | 每个步骤完成时的状态快照 | 追踪整体进度，做进度条 |
| `messages` | 一个字一个字的 Token 输出 | 做打字机效果，实时显示 AI 在说什么 |
| `custom` | 你自己定义的任意数据 | 显示自定义进度、状态信息 |

你甚至可以同时开多个模式：`streamMode: ["updates", "messages", "custom"]`

### 4.2 Namespace（命名空间）

这是一个"地址标签"，告诉你这条消息是谁发出来的。

```
空数组 []           --> 来自主 Agent（大老板本人说的）
["tools:abc123"]    --> 来自 ID 为 abc123 的子 Agent
["tools:abc123", "model_request:def456"]  --> 子 Agent 内部更细节的位置
```

就像快递单上的发件人地址，让你知道这个包裹是谁寄的。

### 4.3 subgraphs: true（开启子图流）

这是一个开关。不开的话，你只能看到主 Agent 的动态；开了之后，所有子 Agent 的动态也能看到。

```typescript
agent.stream(input, { 
  streamMode: "updates", 
  subgraphs: true  // 这个开关必须打开！
})
```

### 4.4 config.writer（自定义消息发射器）

这是给子 Agent 内部的工具用的"对讲机"。工具执行过程中可以随时用它广播消息：

```typescript
writer?.({ status: "analyzing", progress: 50 });
// "喂喂喂，这里是数据分析工具，我已经完成 50% 了！"
```

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 5.1 基础流式输出

```typescript
for await (const [namespace, chunk] of await agent.stream(
  { messages: [{ role: "user", content: "Research quantum computing advances" }] },
  {
    streamMode: "updates",
    subgraphs: true,  // 关键：打开子 Agent 监控
  }
)) {
  if (namespace.length > 0) {
    // 这条消息来自某个子 Agent
    console.log(`[subagent: ${namespace.join("|")}]`);
  } else {
    // 这条消息来自主 Agent
    console.log("[main agent]");
  }
  console.log(chunk);
}
```

**人话翻译**：
1. 我们启动一个流式监听
2. 每收到一条消息，先看 `namespace` 判断是谁发的
3. 如果 namespace 是空的，说明是主 Agent 自己说的话
4. 如果 namespace 不为空，说明是某个子 Agent 的汇报
5. 然后打印出具体内容

### 5.2 追踪子 Agent 生命周期

这段代码展示了如何追踪子 Agent 的"生老病死"：

```typescript
// Phase 1: 检测子 Agent 启动
if (tc.name === "task") {
  // 主 Agent 调用了 task 工具 = 派了一个子 Agent 出去干活
  console.log(`子 Agent "${tc.args?.subagent_type}" 已派出！`);
}

// Phase 2: 检测子 Agent 正在工作
if (namespace[0].startsWith("tools:")) {
  // 收到了来自子 Agent 的消息 = 它正在干活
  console.log(`子 Agent 正在工作中...`);
}

// Phase 3: 检测子 Agent 完成
if (nodeName === "tools" && msg.type === "tool") {
  // tools 节点返回了工具消息 = 子 Agent 交差了
  console.log(`子 Agent 完成任务，结果: ${msg.content}`);
}
```

**人话翻译**：
- **Phase 1**：主 Agent 说"我要派人去做 XX"-> 子 Agent 被创建
- **Phase 2**：收到子 Agent 发来的消息 -> 说明它还活着，正在干活
- **Phase 3**：主 Agent 收到子 Agent 的回复 -> 任务完成了

### 5.3 自定义进度广播

```typescript
const analyzeData = tool(
  async ({ topic }, config) => {
    const writer = config.writer;
    
    writer?.({ status: "starting", progress: 0 });   // "开工了！0%"
    await someWork();
    
    writer?.({ status: "analyzing", progress: 50 }); // "干到一半了！50%"
    await moreWork();
    
    writer?.({ status: "complete", progress: 100 }); // "搞定了！100%"
    return result;
  },
  { name: "analyze_data", ... }
);
```

**人话翻译**：
这个工具在执行过程中，会通过 `writer` 这个"对讲机"不断向外广播自己的进度。前端可以监听这些消息来显示进度条。

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：电商智能客服系统

假设你在开发一个电商平台的 AI 客服，用户问："帮我比较一下 iPhone 15 和 Samsung S24 哪个更适合我"。

**不用流式输出的体验**：
- 用户发送问题
- 界面显示"正在处理..."（转圈圈）
- 等待 30 秒...
- 突然蹦出一大段完整回复
- 用户："我还以为系统挂了呢..."

**使用流式输出后的体验**：

```
[主 Agent] 好的，我来帮您比较这两款手机。
[主 Agent] 正在派出产品专家...

  [子 Agent: 产品研究员] 
  正在搜索 iPhone 15 参数...
  自定义进度: { status: "fetching", progress: 25 }
  iPhone 15 配备 A16 仿生芯片，6.1 英寸显示屏...

  [子 Agent: 产品研究员]
  正在搜索 Samsung S24 参数...
  自定义进度: { status: "fetching", progress: 50 }
  Samsung S24 配备骁龙 8 Gen 3，6.2 英寸显示屏...

  [子 Agent: 产品研究员]
  正在生成对比分析...
  自定义进度: { status: "analyzing", progress: 75 }

[子 Agent 完成] 返回详细对比报告

[主 Agent] 根据分析结果，如果您更注重...（一个字一个字地打出来）
```

**具体提升**：

| 方面 | 提升效果 |
|-----|---------|
| 用户体验 | 用户能看到 AI 在"思考"，不会以为系统卡死 |
| 透明度 | 知道 AI 调用了什么工具、查了什么资料 |
| 可调试性 | 出问题时能知道是哪个子 Agent 的锅 |
| 进度感知 | 复杂任务能显示进度条，减少用户焦虑 |
| 可中断性 | 用户看到方向不对可以及时叫停 |

---

## 7. 总结：什么时候必须用这个功能？

| 场景 | 是否需要流式输出 |
|-----|----------------|
| 简单的一问一答 | 可以不用 |
| 需要调用多个工具的复杂任务 | **强烈建议** |
| 有多个子 Agent 协作的场景 | **必须用** |
| 面向用户的产品界面 | **必须用**（不然用户体验很差） |
| 内部调试和监控 | **强烈建议**（方便排查问题） |
| 需要显示进度的长任务 | **必须用** |

---

## 8. 快速上手 Checklist

1. **开启子图流**：`subgraphs: true`（不开的话看不到子 Agent 的动态）
2. **选择流模式**：
   - 要看进度？用 `updates`
   - 要看打字效果？用 `messages`
   - 要自定义信息？用 `custom`
   - 都要？用数组 `["updates", "messages", "custom"]`
3. **判断消息来源**：检查 `namespace` 是否为空
4. **自定义进度**：在工具里用 `config.writer` 发送进度

---

## 相关链接

- [子 Agent 配置](/oss/javascript/deepagents/subagents) - 如何配置和使用子 Agent
- [前端流式渲染](/oss/javascript/deepagents/streaming/frontend) - 如何在 React 中使用 `useStream`
- [LangChain 流式概览](/oss/javascript/langchain/streaming/overview) - LangChain 的通用流式概念

---

> 记住：流式输出不是可选的锦上添花，在复杂的 Deep Agent 场景下，它是用户体验和系统可观测性的**刚需**！
