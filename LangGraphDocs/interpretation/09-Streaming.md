# LangGraph Streaming 深度解读

---

## 1. 一句话省流 (The Essence)

**Streaming 就是让 AI 回复"边想边说"，而不是"憋半天一口气全吐出来"。**

它是 LangGraph 提供的一套实时输出系统，让你能在 LLM 还在绞尽脑汁思考的时候，就开始接收到部分结果，大幅提升用户体验。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：用户盯着空白屏幕等到焦虑

想象一下你问 ChatGPT 一个问题，然后屏幕上什么都没有，等了 10 秒、20 秒……你开始怀疑：

- "它是不是挂了？"
- "我是不是该刷新一下？"
- "这破东西到底在干嘛？"

传统的 `invoke()` 调用方式就是这样——LLM 必须把**整个回答**都想好了，才一次性返回给你。对于复杂任务，这个等待时间可能长达 30 秒甚至更久。

### 解决：像直播一样实时推送

Streaming 的思路很简单：**不要等全部完成，有一点就给一点**。

- LLM 生成了第一个 token？立刻推送！
- 图的某个节点执行完了？立刻通知！
- 有什么自定义的进度信息？随时发送！

用户看到屏幕上的文字在"流淌"，心理感受完全不同——即使总时间一样，"看着它在干活" vs "干等着不知道在干嘛"，体验天差地别。

---

## 3. 生活化/职场类比 (The Analogy)

### 类比：外卖配送系统

把 LangGraph 的 Streaming 想象成一个**高级外卖配送系统**：

| LangGraph 概念 | 外卖类比 |
|---------------|---------|
| **Graph（图）** | 整个餐厅的出餐流程 |
| **Node（节点）** | 各个工位：备菜员、厨师、打包员 |
| **State（状态）** | 订单的当前状态：待处理、制作中、已打包 |
| **Streaming（流式输出）** | 外卖 App 的实时配送追踪 |
| **`updates` 模式** | 只告诉你"厨师开始炒菜了"、"打包员正在装盒" |
| **`values` 模式** | 每次都告诉你完整状态："订单123，已备菜，正在炒制，预计5分钟" |
| **`messages` 模式** | 厨师一边炒菜一边直播："现在放盐……加点糖……起锅！" |
| **`custom` 模式** | 餐厅自定义推送："本店今日特惠菜品已加入您的订单" |
| **Subgraph（子图）** | 餐厅的独立饮品站：制作奶茶也有自己的流程，但最终汇入总订单 |

**重点理解**：

没有 Streaming 的话，你点完外卖就只能等，直到骑手敲门。有了 Streaming，你能看到：

> "商家已接单" -> "备菜中" -> "制作中" -> "已出餐" -> "骑手已取餐" -> "距您还有2公里"

整个过程透明可见，焦虑感大大降低！

---

## 4. 关键概念拆解 (Key Concepts)

### (1) Stream Modes（流模式）

LangGraph 提供 5 种流模式，各有用途：

| 模式 | 大白话解释 | 适用场景 |
|-----|-----------|---------|
| **`values`** | 每一步都给你**完整的当前状态**快照 | 需要随时知道"现在整体是什么情况" |
| **`updates`** | 只告诉你**这一步改变了什么**（增量更新） | 只关心变化的部分，节省带宽 |
| **`messages`** | 一个 token 一个 token 地推送 **LLM 的输出** | 实现打字机效果，最常用！ |
| **`custom`** | 你自己定义的**任意数据** | 推送进度条、状态提示等自定义信息 |
| **`debug`** | 把**能给的信息全给你**，事无巨细 | 调试问题，排查 bug |

### (2) Subgraph Streaming（子图流式输出）

当你的图里面嵌套了另一个图（子图），默认情况下你只能看到父图的输出。设置 `subgraphs: true` 后，子图内部的执行细节也会被推送出来。

**类比**：主餐厅（父图）外包了饮品制作给隔壁奶茶店（子图）。设置 `subgraphs: true` 就相当于让奶茶店也接入了同一个配送追踪系统。

### (3) Writer（写入器）

`config.writer()` 是你在节点内部用来**主动推送自定义数据**的工具。想象成一个"广播喇叭"，随时可以喊话给前端。

### (4) Tags（标签）过滤

当图里有多个 LLM 调用时，你可以给每个 LLM 打标签，然后在流式输出时按标签筛选。比如只看"生成笑话"的 LLM 输出，忽略"生成诗歌"的。

---

## 5. 代码/配置"人话"解读 (Code Walkthrough)

### 场景一：基础流式输出

```typescript
for await (const chunk of await graph.stream(
  { topic: "ice cream" },
  { streamMode: "updates" }
)) {
  console.log(chunk);
}
```

**人话解读**：
> "嘿 graph，开始执行吧，输入是 `topic: ice cream`。执行过程中，每当有节点完成并更新了状态，就立刻告诉我改了啥。"

**输出示例**：
```
{'refineTopic': {'topic': 'ice cream and cats'}}
{'generateJoke': {'joke': 'This is a joke about ice cream and cats'}}
```

每行代表一个节点执行完毕后的状态变化。

---

### 场景二：LLM Token 逐字输出（打字机效果）

```typescript
for await (const [messageChunk, metadata] of await graph.stream(
  { topic: "ice cream" },
  { streamMode: "messages" }
)) {
  if (messageChunk.content) {
    console.log(messageChunk.content + "|");
  }
}
```

**人话解读**：
> "执行 graph，但我要的是 LLM 生成的每一个字（token）！每蹦出一个字就推给我，我要实现那种一个字一个字往外蹦的打字机效果。"

**输出效果**：
```
Why| did| the| ice| cream| go| to| therapy|?| ...
```

每个 `|` 代表一次推送，用户看到的就是文字在实时"打"出来。

---

### 场景三：按标签筛选特定 LLM 的输出

```typescript
const jokeModel = new ChatOpenAI({
  model: "gpt-4.1-mini",
  tags: ["joke"]  // 打上 "joke" 标签
});

const poemModel = new ChatOpenAI({
  model: "gpt-4.1-mini",
  tags: ["poem"]  // 打上 "poem" 标签
});

// 流式输出时，只看 joke 标签的内容
for await (const [msg, metadata] of await graph.stream(
  { topic: "cats" },
  { streamMode: "messages" }
)) {
  if (metadata.tags?.includes("joke")) {
    console.log(msg.content + "|");
  }
}
```

**人话解读**：
> "我有两个 LLM，一个写笑话，一个写诗。我只想看笑话那个的实时输出，写诗的那个爱咋地咋地，反正我不看。"

**使用场景**：界面上有两个区域，一边显示笑话一边显示诗歌，各自独立流式更新。

---

### 场景四：自定义数据推送（进度条）

```typescript
const queryDatabase = tool(
  async (input, config: LangGraphRunnableConfig) => {
    // 推送进度：0%
    config.writer({ data: "Retrieved 0/100 records", type: "progress" });
    
    // 执行数据库查询...
    
    // 推送进度：100%
    config.writer({ data: "Retrieved 100/100 records", type: "progress" });
    
    return "some-answer";
  },
  { /* tool 配置 */ }
);
```

**人话解读**：
> "这个工具要查数据库，查询过程可能很慢。我想在查询过程中告诉用户'已经查了多少条了'，让用户知道我没偷懒。"

**前端效果**：用户看到进度条从 0% 慢慢涨到 100%，而不是傻等。

---

### 场景五：子图流式输出

```typescript
for await (const chunk of await graph.stream(
  { foo: "foo" },
  {
    subgraphs: true,      // 关键：开启子图流式输出
    streamMode: "updates",
  }
)) {
  console.log(chunk);
}
```

**人话解读**：
> "我的图里套了子图，我想连子图内部的执行细节也一起看到，给我全部透出来！"

**输出示例**：
```
[[], {'node1': {'foo': 'hi! foo'}}]                                    // 父图节点
[['node2:xxx'], {'subgraphNode1': {'bar': 'bar'}}]                    // 子图节点
[['node2:xxx'], {'subgraphNode2': {'foo': 'hi! foobar'}}]             // 子图节点
[[], {'node2': {'foo': 'hi! foobar'}}]                                // 父图节点
```

`[]` 表示父图，`['node2:xxx']` 表示在 `node2` 内部的子图。

---

## 6. 真实场景案例 (Real-world Scenario)

### 案例：智能客服系统

假设你在开发一个电商智能客服，用户问："我订单 #12345 的物流状态是什么？"

**没有 Streaming 的情况**：

```
用户: 我订单 #12345 的物流状态是什么？
[空白屏幕等待 8 秒...]
AI: 您的订单 #12345 当前状态是"运输中"，预计明天送达。
```

用户体验：焦虑、不确定、可能以为系统坏了。

**有 Streaming 的情况**：

```
用户: 我订单 #12345 的物流状态是什么？

[实时显示]
> 正在查询订单信息...              (custom 模式推送进度)
> 已找到订单 #12345               (custom 模式推送进度)
> 正在获取物流状态...              (custom 模式推送进度)
> 您|的|订|单| |#12345| |当|前|状|态|是|...|   (messages 模式逐字输出)
```

用户体验：全程可见，心里有数，感觉系统很"灵敏"。

### 必须使用 Streaming 的场景：

1. **长文本生成**（如写文章、代码）：没人愿意盯着空白等 30 秒
2. **多步骤任务**（如数据分析流水线）：需要展示"当前执行到哪一步了"
3. **工具调用场景**：工具执行可能很慢，需要实时反馈进度
4. **复杂 Agent**：Agent 要思考、调用工具、再思考……每一步都应该透明

### 使用后的具体提升：

| 指标 | 提升效果 |
|-----|---------|
| **感知响应时间** | 从"等 10 秒才有反应"变成"0.5 秒就开始输出" |
| **用户留存率** | 减少因等待焦虑而离开的用户 |
| **调试效率** | `debug` 模式让问题定位快 10 倍 |
| **用户信任度** | 透明的执行过程让用户更信任 AI 系统 |

---

## 7. 速查表 (Quick Reference)

```typescript
// 基础流式输出（只看更新）
for await (const chunk of await graph.stream(inputs, { streamMode: "updates" })) { }

// LLM Token 逐字输出
for await (const [msg, meta] of await graph.stream(inputs, { streamMode: "messages" })) { }

// 多模式组合
for await (const [mode, chunk] of await graph.stream(inputs, { streamMode: ["updates", "custom"] })) { }

// 包含子图输出
for await (const chunk of await graph.stream(inputs, { subgraphs: true, streamMode: "updates" })) { }

// 自定义数据推送（在节点内部）
config.writer({ progress: "50%", status: "processing" });

// 禁用某个模型的流式（该模型不支持流式时）
const model = new ChatOpenAI({ model: "o1-preview", streaming: false });
```

---

## 8. 总结

Streaming 是 LangGraph 中**最能提升用户体验**的功能之一。它的核心思想很简单：

> **别让用户干等，有啥说啥，边做边汇报！**

五种流模式各有分工：
- `values` / `updates` 追踪图状态
- `messages` 实现打字机效果
- `custom` 推送自定义进度
- `debug` 用于排查问题

掌握了 Streaming，你的 AI 应用就从"傻愣愣的黑箱"变成了"实时透明的智能助手"！
