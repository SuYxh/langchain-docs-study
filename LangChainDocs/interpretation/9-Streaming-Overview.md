# LangChain Streaming Overview 深度解读

## 1. 一句话省流 (The Essence)

**Streaming 就是让 AI 应用"边想边说"，而不是憋半天一口气说完。** 它能让用户实时看到 AI 的进度、逐字输出，甚至自定义的进度提示——就像你看直播，而不是等录播。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：AI 太慢，用户等到怀疑人生

想象一下这个场景：
- 用户问了 AI 一个问题
- 然后...屏幕上啥也没有
- 10 秒过去了...还是啥也没有
- 用户开始怀疑：是不是卡死了？是不是网断了？要不要刷新？

**这就是传统"请求-响应"模式的问题**：LLM 生成内容本身就慢（需要逐 token 计算），如果等到全部生成完再返回，用户体验极差。

### 解决方案：流式输出，边生成边展示

Streaming 的核心思想：**不等了，有多少输出多少！**

| 没有 Streaming | 有 Streaming |
|---------------|-------------|
| 用户等 10 秒，突然蹦出一大段文字 | 用户立刻看到文字一个字一个字地"打"出来 |
| 不知道 AI 在干嘛 | 能看到"正在调用天气工具"、"正在生成回答" |
| 焦虑、想刷新 | 安心、有"在对话"的感觉 |

---

## 3. 生活化类比 (The Analogy)

### 餐厅厨房比喻

想象你去一家高级餐厅吃饭，点了一个有 5 道菜的套餐：

**传统模式（无 Streaming）：**
- 服务员把菜单收走
- 然后...你等了 45 分钟
- 突然！5 道菜同时端上来，有的凉了

**Streaming 模式：**
- 前菜做好了，立刻端出来（`updates` 模式）
- 厨师喊："主菜正在煎！"（`custom` 模式）
- 你能闻到牛排的香味一点点飘出来（`messages` 模式，逐 token 流出）

| LangChain 概念 | 餐厅比喻 |
|---------------|---------|
| `streamMode: "updates"` | 每道菜做好就上，告诉你"前菜好了" |
| `streamMode: "messages"` | 你能闻到/看到食物一点点成形的过程 |
| `streamMode: "custom"` | 服务员主动来报告："牛排煎到 3 分熟了" |
| Agent | 主厨，决定先做什么、后做什么 |
| Tool | 具体的厨具（烤箱、煎锅） |
| State | 当前这桌客人的点单状态 |

---

## 4. 关键概念拆解 (Key Concepts)

### Stream Modes（流模式）—— 你想看到什么？

| 模式 | 大白话解释 | 适用场景 |
|------|-----------|---------|
| **`updates`** | "每完成一步，告诉我一声" | 想知道 Agent 执行到哪一步了（调工具了？生成完了？） |
| **`messages`** | "一个字一个字地告诉我 LLM 在说什么" | 实现 ChatGPT 那种打字机效果 |
| **`custom`** | "我自己定义要发什么" | 自定义进度条，比如"已处理 50/100 条记录" |
| **`values`** | "每一步都告诉我完整的状态" | 调试用，想看全貌 |
| **`debug`** | "把能给的信息全给我" | 深度调试 |

### Writer（写入器）—— 自定义广播员

`config.writer?.()` 就像你在厨房里安排了一个专门的广播员，随时可以喊话给前台：

```typescript
config.writer?.(`正在查询 ${city} 的天气数据...`);
// 做一些操作
config.writer?.(`已获取到 ${city} 的数据！`);
```

### Subgraphs（子图流输出）—— 嵌套的厨房

如果你的 Agent 里还嵌套了子 Agent（比如主厨调动了甜点师），设置 `subgraphs: true` 就能看到子 Agent 的进度。

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 案例 1：监控 Agent 执行进度（`updates` 模式）

```typescript
for await (const chunk of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "updates" }  // 关键：告诉 LangChain 我要看"每一步更新"
)) {
    const [step, content] = Object.entries(chunk)[0];
    console.log(`step: ${step}`);  // 打印当前是哪一步
    console.log(`content: ${JSON.stringify(content, null, 2)}`);  // 打印这一步的内容
}
```

**人话解释：**
- 这段代码就像是给 Agent 装了一个实时追踪器
- 每当 Agent 完成一个步骤（比如调用 LLM、执行工具），你就能收到一条"播报"
- 输出大概是这样：
  - **第 1 条**：`step: model` —— "模型在思考，它想调用天气工具"
  - **第 2 条**：`step: tools` —— "工具执行完了，返回：旧金山天气晴"
  - **第 3 条**：`step: model` —— "模型组织好了最终答案"

### 案例 2：实现打字机效果（`messages` 模式）

```typescript
for await (const [token, metadata] of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "messages" }  // 关键：我要看 LLM 的每一个字
)) {
    console.log(`node: ${metadata.langgraph_node}`);  // 当前在哪个节点
    console.log(`content: ${JSON.stringify(token.contentBlocks)}`);  // 这次吐出的字
}
```

**人话解释：**
- 这段代码让你能**逐字**接收 LLM 的输出
- 每次循环，`token` 就是 LLM 刚"说"出来的一小段内容
- `metadata` 告诉你这是从哪个节点来的（方便你区分是哪个 LLM 在说话）

### 案例 3：自定义进度播报（`custom` 模式）

```typescript
const getWeather = tool(
    async (input, config: LangGraphRunnableConfig) => {
        // 第一次广播：开始干活了
        config.writer?.(`Looking up data for city: ${input.city}`);
        
        // ... 实际执行查询 ...
        
        // 第二次广播：活干完了
        config.writer?.(`Acquired data for city: ${input.city}`);
        
        return `It's always sunny in ${input.city}!`;
    },
    {
        name: "get_weather",
        description: "Get weather for a given city.",
        schema: z.object({
            city: z.string().describe("The city to get weather for."),
        }),
    }
);

// 接收自定义广播
for await (const chunk of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: "custom" }  // 我只想收自定义消息
)) {
    console.log(chunk);  // 输出自定义的进度信息
}
```

**人话解释：**
- `config.writer?.()` 就是一个"对讲机"，让你在工具执行过程中随时向前端喊话
- 前端用 `streamMode: "custom"` 来接收这些喊话
- 非常适合：下载进度、批量处理进度、长任务的中间状态

### 案例 4：多模式同时监听

```typescript
for await (const [streamMode, chunk] of await agent.stream(
    { messages: [{ role: "user", content: "what is the weather in sf" }] },
    { streamMode: ["updates", "messages", "custom"] }  // 三个模式全都要！
)) {
    console.log(`${streamMode}: ${JSON.stringify(chunk, null, 2)}`);
}
```

**人话解释：**
- 这就像同时装了三个监控摄像头
- 每收到一条数据，会先告诉你它是哪个"频道"的（updates/messages/custom）
- 然后再给你具体内容

---

## 6. 真实应用场景 (Real-world Scenario)

### 场景：电商智能客服

假设你在开发一个电商平台的 AI 客服，用户问："我上个月买的蓝牙耳机能退吗？"

**不用 Streaming 的悲惨体验：**
1. 用户发送问题
2. AI 默默地：查订单 -> 查退货政策 -> 生成回复
3. 15 秒后，突然蹦出一大段话
4. 用户以为卡死了，期间已经点了 3 次刷新...

**用 Streaming 的丝滑体验：**

```typescript
const agent = createAgent({
    model: "gpt-4",
    tools: [queryOrderTool, checkReturnPolicyTool],
});

for await (const [mode, chunk] of await agent.stream(
    { messages: [{ role: "user", content: "我上个月买的蓝牙耳机能退吗？" }] },
    { streamMode: ["updates", "messages", "custom"] }
)) {
    if (mode === "custom") {
        // 显示自定义进度
        showProgressToUser(chunk);  // "正在查询您的订单..."
    } else if (mode === "updates") {
        // 显示步骤完成状态
        showStepStatus(chunk);  // "已找到订单 #12345"
    } else if (mode === "messages") {
        // 逐字显示最终回复
        appendToChat(chunk);  // "根" -> "据" -> "我" -> "们" -> "的" -> ...
    }
}
```

**用户看到的界面：**
```
[系统] 正在查询您的订单...
[系统] 已找到订单 #12345（蓝牙耳机 AirPods Max）
[系统] 正在查询退货政策...
[AI] 根据我们的退货政策，您购买的蓝牙耳机 AirPods Max（订单号 #12345）
     是在 25 天前购买的，仍在 30 天无理由退货期内。
     您可以通过以下步骤申请退货：
     1. 登录账户...
     2. ...
```

### 具体提升：

| 指标 | 无 Streaming | 有 Streaming |
|------|------------|--------------|
| **首字节时间** | 15 秒 | < 1 秒 |
| **用户焦虑度** | 高（不知道在干嘛） | 低（看得到进度） |
| **感知速度** | 慢 | 快（虽然总时间相同） |
| **用户中途放弃率** | 高 | 低 |

---

## 彩蛋：关键配置速查表

| 你想实现的效果 | 使用的配置 |
|--------------|-----------|
| ChatGPT 打字机效果 | `streamMode: "messages"` |
| 监控 Agent 执行步骤 | `streamMode: "updates"` |
| 自定义进度条 | `streamMode: "custom"` + `config.writer?.()` |
| 调试/看全部信息 | `streamMode: "debug"` |
| 多种效果同时要 | `streamMode: ["updates", "messages", "custom"]` |
| 看子 Agent 的进度 | 加上 `subgraphs: true` |
| 某个模型不要流式 | 该模型设置 `streaming: false` |

---

总结一下：**Streaming 是让 AI 应用从"闷葫芦"变成"话痨"的关键技术。** 用户不喜欢等，但喜欢看到进度——这就是 Streaming 存在的意义！