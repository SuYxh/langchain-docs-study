# LangChain Test 深度解读

## 一句话省流 (The Essence)

**Agent 测试就是给你的 AI "员工" 写一份标准操作规范(SOP)考核表，检查它是不是按照你预期的步骤和方式来干活，而不是"自由发挥"瞎搞。**

---

## 核心痛点与解决方案 (The "Why")

### 痛点：AI 是个"黑盒子"，改一处可能全崩

想象一下这个场景：

你开发了一个电商客服 Agent，它能查订单、处理退款、推荐商品。一切运行良好。

然后你心血来潮，改了一行 Prompt："请更友好一些..."

结果第二天，用户投诉说：Agent 不查订单状态就直接给退款了！

**为什么会这样？**

因为 LLM（大语言模型）本质上是**非确定性**的——同样的输入，它可能给出不同的输出。更可怕的是，你改了系统某一处，可能会"蝴蝶效应"般地影响整个执行链条。

这就是 Agent 应用的噩梦：
- 你不知道 Agent 下一步会调用什么工具
- 你不知道它会按什么顺序执行
- 你不知道一个小改动会不会让整个流程跑偏

### 解决方案：给 Agent 建立"执行轨迹"考核体系

LangChain 的测试方案核心思路是：**不只看结果，还要看过程！**

```
传统测试: 输入 A -> 输出 B (只看结果对不对)
Agent 测试: 输入 A -> [步骤1 -> 步骤2 -> 步骤3] -> 输出 B (过程+结果都要对)
```

通过两种主要方式来验证：

| 方式 | 特点 | 适用场景 |
|------|------|----------|
| **Trajectory Match（轨迹匹配）** | 硬核比对，一步步对照 | 流程必须严格按顺序执行的场景 |
| **LLM-as-Judge（AI 裁判）** | 让另一个 AI 来评判执行质量 | 灵活场景，只要合理就行 |

---

## 生活化/职场类比 (The Analogy)

### 类比：新员工考核

想象你是一家餐厅的经理，刚招了一个新厨师（Agent），你要确保他做菜符合标准。

**场景：顾客点了一份"酸辣土豆丝"**

#### Trajectory Match = 标准化考核表

你拿着一份 SOP 检查：

```
[ ] 第1步：拿土豆（调用 get_potato 工具）
[ ] 第2步：削皮切丝（调用 prepare_potato 工具）  
[ ] 第3步：热锅下油（调用 heat_pan 工具）
[ ] 第4步：放调料炒制（调用 stir_fry 工具）
[ ] 第5步：装盘上菜（返回最终结果）
```

如果厨师跳过了"削皮"直接下锅，即使最后端出来的菜看起来也不错，但因为**流程不对**，考核不通过！

**对应代码概念：**
- `referenceTrajectory`（参考轨迹）= SOP 标准流程
- `outputs`（实际输出）= 厨师实际操作步骤
- `trajectoryMatchMode`（匹配模式）= 考核严格程度

#### LLM-as-Judge = 请米其林主厨来点评

你请了一位米其林主厨（另一个更聪明的 AI）来评估：

> "这道菜做得怎么样？步骤合理吗？有没有浪费食材或者多余操作？"

米其林主厨会给出一个综合评价：

> "嗯，这个厨师虽然没有完全按标准流程，但他的替代方案也是合理的，而且更高效。通过！"

**对应代码概念：**
- `createTrajectoryLLMAsJudge`（创建 AI 裁判）= 请米其林主厨
- `TRAJECTORY_ACCURACY_PROMPT`（评判标准）= 告诉主厨从哪些角度评判

---

## 关键概念拆解 (Key Concepts)

### 1. **Trajectory（轨迹）**

Agent 从接收用户请求到返回最终答案的**完整执行路径**，包括：
- 用户说了什么（HumanMessage）
- AI 决定调用什么工具（AIMessage + tool_calls）
- 工具返回了什么结果（ToolMessage）
- AI 最终回复了什么（AIMessage）

> 通俗理解：就像快递追踪记录，能看到包裹经过的每一站。

### 2. **Reference Trajectory（参考轨迹）**

你预先定义的"标准答案"——Agent **应该**按照怎样的步骤来执行任务。

> 通俗理解：就是 SOP 标准操作手册。

### 3. **Trajectory Match Mode（轨迹匹配模式）**

四种考核严格程度：

| 模式 | 大白话解释 | 例子 |
|------|-----------|------|
| `strict` | 必须一模一样，顺序都不能差 | "先查权限再操作"的安全场景 |
| `unordered` | 工具都调了就行，顺序无所谓 | "查天气+查新闻"的信息收集 |
| `subset` | 只能调参考轨迹里有的工具，不能多 | 限制 Agent 不要越权 |
| `superset` | 至少调了参考的工具，多调无所谓 | 确保关键步骤不被跳过 |

### 4. **LLM-as-Judge（LLM 裁判）**

让另一个（通常更强的）LLM 来评判 Agent 的执行轨迹是否合理。

> 通俗理解：让一个资深员工来评价新员工的工作表现。

### 5. **AgentEvals**

LangChain 官方提供的 Agent 测试工具包，专门用来评估 Agent 的执行轨迹。

---

## 代码"人话"解读 (Code Walkthrough)

### 示例1：严格轨迹匹配

```typescript
// 创建一个"严格模式"的考核官
const evaluator = createTrajectoryMatchEvaluator({
  trajectoryMatchMode: "strict",  // 严格模式：步骤必须一模一样
});

// 定义"标准答案"——Agent 应该这样执行
const referenceTrajectory = [
  new HumanMessage("What's the weather in San Francisco?"),  // 用户问天气
  new AIMessage({
    content: "",
    tool_calls: [
      { id: "call_1", name: "get_weather", args: { city: "San Francisco" } }
    ]  // AI 应该调用天气查询工具
  }),
  new ToolMessage({
    content: "It's 75 degrees and sunny in San Francisco.",
    tool_call_id: "call_1"
  }),  // 工具应该返回天气信息
  new AIMessage("The weather in San Francisco is 75 degrees and sunny."),
  // AI 应该用自然语言回复用户
];

// 让考核官对比"实际执行"和"标准答案"
const evaluation = await evaluator({
  outputs: result.messages,        // Agent 实际的执行轨迹
  referenceOutputs: referenceTrajectory  // 标准答案
});

// evaluation.score = true/false，告诉你考核是否通过
```

**人话翻译：**
> 我定义了一套标准操作流程：用户问天气 -> AI 调天气工具 -> 工具返回结果 -> AI 回复用户。
> 然后让考核官检查 Agent 是不是完全按照这个流程来的，一步都不能差。

### 示例2：LLM 裁判模式

```typescript
// 创建一个 AI 裁判，用 o3-mini 模型来评判
const evaluator = createTrajectoryLLMAsJudge({
  model: "openai:o3-mini",  // 裁判用的 AI 模型
  prompt: TRAJECTORY_ACCURACY_PROMPT,  // 告诉裁判从哪些角度评判
});

// 让裁判评估 Agent 的执行轨迹
const evaluation = await evaluator({
  outputs: result.messages,  // Agent 的执行轨迹
});

// evaluation.score = true/false
// evaluation.comment = "The provided agent trajectory is reasonable..."
// 裁判还会给出文字评语！
```

**人话翻译：**
> 我请了一个 AI 裁判（o3-mini），让它看看我家 Agent 干活的过程是否合理。
> 裁判不需要标准答案，它会根据自己的"专业判断"来评分，还会写评语解释为什么。

### 示例3：集成到测试框架（Vitest/Jest）

```typescript
import * as ls from "langsmith/vitest";

ls.describe("trajectory accuracy", () => {
  ls.test("accurate trajectory", {
    // 输入
    inputs: { messages: [{ role: "user", content: "What is the weather in SF?" }] },
    // 参考答案
    referenceOutputs: { messages: referenceTrajectory },
  }, async ({ inputs, referenceOutputs }) => {
    
    // 运行 Agent
    const result = await agent.invoke({ messages: [...] });
    
    // 记录输出到 LangSmith
    ls.logOutputs({ messages: result.messages });
    
    // 用裁判来评判
    await trajectoryEvaluator({
      inputs,
      outputs: result.messages,
      referenceOutputs,
    });
  });
});
```

**人话翻译：**
> 这段代码把 Agent 测试集成到了 Vitest 测试框架里。
> 每次运行测试，都会：1)运行 Agent 2)把执行轨迹和结果记录到 LangSmith 3)用裁判来评分
> 这样你就能在 CI/CD 流程中自动化测试 Agent 了！

---

## 真实应用场景 (Real-world Scenario)

### 场景：电商智能客服 Agent

假设你开发了一个电商客服 Agent，它能处理以下任务：
- 查询订单状态
- 处理退款申请
- 推荐相关商品

#### 为什么必须用 Agent 测试？

**场景1：安全合规要求（必须用 strict 模式）**

```
业务规则：处理退款前，必须先验证用户身份，再查订单状态
```

你需要确保 Agent 的执行顺序是：
```
用户请求退款 -> 调用 verify_identity 工具 -> 调用 check_order 工具 -> 调用 process_refund 工具
```

如果 Agent 跳过了身份验证直接退款，那就是重大安全漏洞！

```typescript
const evaluator = createTrajectoryMatchEvaluator({
  trajectoryMatchMode: "strict",  // 必须严格按顺序
});

const referenceTrajectory = [
  new HumanMessage("I want to refund my order #12345"),
  new AIMessage({ tool_calls: [{ name: "verify_identity", ... }] }),
  new ToolMessage({ content: "Identity verified" }),
  new AIMessage({ tool_calls: [{ name: "check_order", ... }] }),
  new ToolMessage({ content: "Order found: $100" }),
  new AIMessage({ tool_calls: [{ name: "process_refund", ... }] }),
  new ToolMessage({ content: "Refund processed" }),
  new AIMessage("Your refund of $100 has been processed."),
];
```

**场景2：信息收集场景（可以用 unordered 模式）**

```
业务规则：回答"这个商品怎么样"时，需要同时查询商品详情和用户评价
```

Agent 可以先查商品再查评价，也可以先查评价再查商品，顺序无所谓，只要都查了就行。

```typescript
const evaluator = createTrajectoryMatchEvaluator({
  trajectoryMatchMode: "unordered",  // 顺序不重要
});
```

**场景3：限制 Agent 权限（使用 subset 模式）**

```
业务规则：普通客服只能查询信息，不能执行退款操作
```

你需要确保 Agent 只调用了允许的工具，没有越权。

```typescript
const evaluator = createTrajectoryMatchEvaluator({
  trajectoryMatchMode: "subset",  // 只能调用参考轨迹中的工具
});

// 参考轨迹只包含查询工具，不包含 process_refund
```

#### 集成 LangSmith 的好处

当你把测试结果记录到 LangSmith 后，你可以：

1. **追踪历史表现**：看看 Agent 在不同版本 Prompt 下的通过率变化
2. **发现回归问题**：如果某次代码改动导致通过率下降，立刻能发现
3. **积累测试数据集**：把真实用户的问题添加到测试数据集中，不断完善测试覆盖

---

## 总结

| 你想达到的目的 | 该用什么 |
|----------------|----------|
| 确保 Agent 严格按顺序执行步骤 | `strict` 模式 |
| 确保关键工具都被调用了，顺序无所谓 | `unordered` 模式 |
| 确保 Agent 没有调用不该调的工具 | `subset` 模式 |
| 确保 Agent 至少调用了必要的工具 | `superset` 模式 |
| 灵活评判执行质量，不需要严格匹配 | `LLM-as-Judge` |
| 自动化测试 + 追踪历史表现 | 集成 LangSmith |

**核心记住一点：** Agent 测试不只是看最终答案对不对，更重要的是看 Agent "做事的方式" 对不对！

就像你不会只看员工交上来的报表对不对，你还得确保他是通过正当途径拿到的数据，而不是瞎编的。
