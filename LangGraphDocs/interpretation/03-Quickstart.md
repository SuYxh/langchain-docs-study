# LangGraph Quickstart 深度解读

> 原文档：构建一个计算器 Agent 的快速入门指南

---

## 1. 一句话省流 (The Essence)

**LangGraph 就是让你的 AI 学会"思考-行动-再思考"的循环框架，这份文档手把手教你用两种风格（图模式 vs 函数模式）搭建一个会做数学计算的 AI 助手。**

简单说：以前的 AI 是"一问一答"的傻瓜式对话，现在通过 LangGraph，AI 可以像人一样：遇到问题 -> 想想用什么工具 -> 用工具算一下 -> 拿到结果 -> 继续想下一步...直到任务完成。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：没有 LangGraph 之前的倒霉事

**场景还原：** 假设你让 AI 帮你算 `(3 + 4) * 5 / 2`

**传统做法的问题：**

| 问题 | 具体表现 |
|------|----------|
| **单次调用的局限** | LLM 一次只能给你一个回答，复杂计算可能算错 |
| **无法使用工具** | 纯靠"脑算"，不能调用计算器确保精确 |
| **流程控制混乱** | 想实现"先加后乘再除"的逻辑，代码写得像意大利面条 |
| **状态丢失** | 每次调用都是"失忆"的，不记得上一步算了什么 |

**真实痛苦：** 你得自己写一堆 if-else 判断 AI 要不要调工具、调完工具怎么处理结果、什么时候该停下来...代码越写越乱！

### 解决方案：LangGraph 的救赎

LangGraph 把这个循环过程**标准化**了：

```
用户提问 -> [LLM思考] -> 要用工具? 
                            |
                     是     |     否
                     v      |      v
              [执行工具] ----+---> [返回答案]
                     |
                     v
              [把结果告诉LLM，继续思考]
```

**核心价值：**
- **状态自动管理**：消息历史、调用次数...框架帮你记着
- **流程可视化**：用"图"的方式定义流程，清晰明了
- **灵活可扩展**：想加新工具？加个节点就行

---

## 3. 生活化类比：智能餐厅厨房

想象你走进一家高级餐厅，点了一道复杂的菜："我要一份先煎后炖再烤的牛排"。

### 传统餐厅（没有 LangGraph）

厨师长一个人扛所有：
- 听到你的要求 -> 自己煎 -> 自己炖 -> 自己烤 -> 手忙脚乱 -> 可能搞砸

### LangGraph 餐厅（智能调度系统）

| LangGraph 概念 | 餐厅类比 | 职责 |
|---------------|----------|------|
| **State（状态）** | 订单追踪系统 | 记录：这道菜现在到哪一步了？用了哪些食材？ |
| **Node（节点）** | 不同工位的厨师 | 煎炸台、炖煮台、烧烤台...各司其职 |
| **Edge（边）** | 传菜员 | 把半成品从一个工位传到下一个工位 |
| **Conditional Edge（条件边）** | 质检员 | 判断"煎好了吗？好了送去炖；没好继续煎" |
| **START / END** | 下单窗口 / 出菜窗口 | 流程的起点和终点 |
| **Tool（工具）** | 专业厨具 | 计算器、搜索引擎、数据库...AI 的"锅碗瓢盆" |

**流程演示：**
```
顾客点单("3+4等于多少")
    |
    v
[订单进入系统] -- START
    |
    v
[厨师长看单] -- llmCall节点
    |  
    |  "这道菜需要用加法厨具！"
    v
[质检员判断] -- shouldContinue
    |
    |  "确实要用工具，送去加法工位"
    v
[加法工位干活] -- toolNode
    |
    |  "3+4=7，结果出来了"
    v
[回到厨师长] -- 再次llmCall
    |
    |  "好了，可以出菜了"
    v
[质检员判断] -- "不需要更多工具了"
    |
    v
[出菜窗口] -- END
    |
    v
顾客收到答案："7"
```

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 StateGraph（状态图）

**大白话：** 整个流程的"画布"，你在上面画节点、连线，定义 AI 怎么一步步干活。

```typescript
const agent = new StateGraph(MessagesState)
  .addNode("llmCall", llmCall)      // 画一个"LLM思考"的圈
  .addNode("toolNode", toolNode)    // 画一个"执行工具"的圈  
  .addEdge(START, "llmCall")        // 从起点连到LLM
  .addConditionalEdges(...)         // 根据条件决定下一步
  .compile();                        // 画完了，编译成可执行的程序
```

### 4.2 State（状态）

**大白话：** AI 的"记事本"，记录对话历史和各种需要追踪的数据。

```typescript
const MessagesState = new StateSchema({
  messages: MessagesValue,        // 对话记录（自动追加新消息）
  llmCalls: new ReducedValue(...) // LLM被调用了几次（自动累加）
});
```

**神奇之处：** `MessagesValue` 会自动帮你把新消息追加到历史记录里，不用手动管理！

### 4.3 Node（节点）

**大白话：** 流程中的一个"工作站"，负责干一件具体的事。

文档中有两个核心节点：
- **llmCall**：让 AI 思考，决定要不要用工具
- **toolNode**：真正执行工具（加减乘除）

### 4.4 Conditional Edge（条件边）

**大白话：** 一个"十字路口"，根据当前状态决定往哪走。

```typescript
const shouldContinue = (state) => {
  // AI 说要用工具？-> 去 toolNode
  if (lastMessage.tool_calls?.length) {
    return "toolNode";
  }
  // 不用工具？-> 结束，回复用户
  return END;
};
```

### 4.5 Tool（工具）

**大白话：** AI 的"外挂能力"，让它能做本来做不了的事。

```typescript
const add = tool(({ a, b }) => a + b, {
  name: "add",
  description: "Add two numbers",  // 告诉AI：这个工具是干啥的
  schema: z.object({...})          // 告诉AI：要给我什么参数
});
```

**重点：** `description` 和 `schema` 是给 AI 看的"使用说明书"，AI 会根据这些信息决定什么时候用、怎么用。

---

## 5. 代码逻辑"人话"解读 (Code Walkthrough)

### Graph API 风格（画流程图派）

**第一步：给 AI 配装备**

```typescript
const modelWithTools = model.bindTools(tools);
```
> "嘿 Claude，这里有三把'武器'（加减乘除），你需要的时候可以用。"

**第二步：定义 AI 的"记忆系统"**

```typescript
const MessagesState = new StateSchema({
  messages: MessagesValue,
  llmCalls: new ReducedValue(z.number().default(0), { reducer: (x, y) => x + y }),
});
```
> "AI 你有两个记事本：一个记对话内容（自动往后追加），一个记你被叫了几次（自动累加）"

**第三步：画流程图**

```typescript
const agent = new StateGraph(MessagesState)
  .addNode("llmCall", llmCall)           // 画圈：LLM思考站
  .addNode("toolNode", toolNode)         // 画圈：工具执行站
  .addEdge(START, "llmCall")             // 连线：开始 -> LLM思考
  .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])  // 岔路口
  .addEdge("toolNode", "llmCall")        // 连线：执行完工具 -> 回去让LLM继续想
  .compile();                             // 图画完了，编译！
```

**流程图可视化：**
```
     START
        |
        v
   +----------+
   | llmCall  |<---------+
   +----------+          |
        |                |
        v                |
  [shouldContinue?]      |
   /          \          |
  v            v         |
toolNode      END        |
  |                      |
  +----------------------+
```

### Functional API 风格（写函数派）

**核心思想：** 不画图，用 `while` 循环 + 函数调用搞定

```typescript
const agent = entrypoint({ name: "agent" }, async (messages) => {
  let modelResponse = await callLlm(messages);  // 先问一次AI

  while (true) {  // 无限循环
    if (!modelResponse.tool_calls?.length) {
      break;  // AI说不用工具了，跳出循环
    }

    // AI要用工具，那就执行
    const toolResults = await Promise.all(
      modelResponse.tool_calls.map((toolCall) => callTool(toolCall))
    );
    
    // 把工具结果加到对话历史，再问AI
    messages = addMessages(messages, [modelResponse, ...toolResults]);
    modelResponse = await callLlm(messages);
  }

  return messages;
});
```

> "一直循环：问AI -> AI要工具就执行 -> 把结果告诉AI -> 再问...直到AI说'我算完了'"

---

## 6. 两种 API 风格对比

| 维度 | Graph API (图模式) | Functional API (函数模式) |
|------|-------------------|--------------------------|
| **思维方式** | 画流程图，节点+连线 | 写代码，循环+条件判断 |
| **可视化** | 天然适合可视化调试 | 需要额外工具 |
| **灵活性** | 结构固定，改流程要改图 | 代码逻辑随便改 |
| **适合场景** | 复杂的多分支流程 | 简单的线性流程 |
| **学习曲线** | 需要理解图的概念 | 更接近传统编程 |

**选择建议：**
- 流程复杂、需要可视化调试 -> **Graph API**
- 流程简单、喜欢传统写法 -> **Functional API**

---

## 7. 真实场景案例 (Real-world Scenario)

### 场景：电商客服机器人

**需求：** 用户问 "我买的订单 #12345 运费是多少？总价减去商品价格就是运费"

**为什么必须用 LangGraph？**

1. **需要调用工具**：查询订单数据库
2. **需要计算**：总价 - 商品价格 = 运费
3. **需要多轮交互**：先查 -> 再算 -> 再回答

**LangGraph 的解法：**

```typescript
// 定义工具
const queryOrder = tool(async ({ orderId }) => {
  // 查数据库，返回 { totalPrice: 100, productPrice: 85 }
}, { name: "queryOrder", ... });

const subtract = tool(({ a, b }) => a - b, { name: "subtract", ... });

// Agent 执行流程
// 1. 用户问问题
// 2. LLM: "我需要先查订单" -> 调用 queryOrder
// 3. 拿到结果 { totalPrice: 100, productPrice: 85 }
// 4. LLM: "我需要算运费" -> 调用 subtract(100, 85)  
// 5. 拿到结果 15
// 6. LLM: "运费是15元" -> 结束
```

**提升效果：**
- 代码逻辑清晰，不是一坨 if-else
- 状态自动管理，不怕"失忆"
- 流程可追踪，出问题好排查
- 扩展方便，加新工具就加个节点

---

## 8. 小结与行动建议

### 这份文档教会你的核心技能

1. **用 Tool 给 AI 加能力**：让 AI 能调用计算器、查数据库等
2. **用 State 管理记忆**：让 AI 记住对话历史和中间结果
3. **用 Graph/Function 编排流程**：让 AI 按照你设计的逻辑一步步干活
4. **用 Conditional Edge 做决策**：让 AI 在关键节点自动判断下一步

### 下一步行动

1. **跑通示例**：把文档的代码复制下来跑一遍
2. **加点难度**：试试让 AI 算 `(3 + 4) * 5`，看它能不能正确地先加后乘
3. **换个工具**：把计算器换成调用 API 查天气，感受工具的灵活性
4. **画个图**：用 LangSmith Studio 可视化你的 Agent，看看流程是不是你想的那样

---

> **记住：** LangGraph 的核心就是让 AI 从"一问一答的傻瓜"变成"会思考、会使用工具、会循环迭代的智能助手"。掌握了这个框架，你就能构建真正有用的 AI 应用！
