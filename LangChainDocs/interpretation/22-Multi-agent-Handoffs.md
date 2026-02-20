# Multi-agent Handoffs 深度解读

## 1. 一句话省流 (The Essence)

**Handoffs (交接模式) 就是让 AI Agent 可以像"接力赛跑"一样，根据对话状态自动切换角色或传递给其他 Agent 处理。**

简单说：当客户说"我要退款"，系统自动从"售前客服"切换到"售后客服"，整个过程无缝衔接，用户甚至感觉不到换人了。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：一个 Agent 打天下的困境

想象一下，你开发了一个智能客服：

```
用户: 我想买个手机 (销售问题)
用户: 上次买的手机坏了怎么办？(售后问题)  
用户: 你们公司招人吗？(招聘问题)
```

**传统做法的问题：**

| 问题 | 后果 |
|------|------|
| 一个超级大 Agent 啥都干 | System Prompt 写成裹脚布，又臭又长 |
| 工具太多太杂 | 模型选择困难症，容易调用错误工具 |
| 逻辑全靠 if-else 硬编码 | 新增流程就改代码，维护到头秃 |
| 状态管理混乱 | 用户说到一半换话题，Agent 直接懵逼 |

### 解决方案：Handoffs 模式

Handoffs 模式的核心思想：

```
状态变量 (State) --> 决定行为 --> 工具调用 --> 更新状态 --> 新行为
```

- **状态驱动**：用一个变量（比如 `currentStep: "售前" | "售后"`）来决定当前该用什么配置
- **工具触发切换**：Agent 通过调用特定工具来更新状态，实现"交棒"
- **无缝过渡**：用户感受不到背后发生了什么，对话自然流畅

---

## 3. 生活化类比：医院分诊台的故事

想象你去一家大医院看病：

```
你走进医院大门 --> 分诊台护士 --> 根据症状分配科室 --> 专科医生接诊
```

**类比对照表：**

| 医院角色 | Handoffs 概念 | 作用 |
|---------|--------------|------|
| 分诊台护士 | 初始 Agent / Router | 初步了解情况，决定分配给谁 |
| 挂号单上的"科室" | State 变量 (`currentStep`) | 记录当前状态，决定下一步去哪 |
| "请到3号诊室" | Handoff Tool | 工具调用，触发转移 |
| 专科医生 | 目标 Agent (如 `sales_agent`) | 接手后提供专业服务 |
| 病历本 | Messages (消息历史) | 上下文传递，新医生知道之前的情况 |
| 医院大楼 | StateGraph | 整个流程的容器 |

**关键流程：**

```
护士: "您好，哪里不舒服？" (收集信息)
患者: "手机屏幕...啊不是，我心脏不舒服"
护士: [在系统里点击 - 心内科] --> 状态更新为 "cardiology"
护士: "请到心内科3号诊室"
心内科医生: [读取病历] "我看到您说心脏不舒服，能描述一下吗？"
```

这就是 Handoffs 的精髓 -- **状态驱动 + 无缝交接**!

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 State (状态)

**口语解释：** 就像你手机上的 App 记住你登录了哪个账号、在看第几页一样。State 记住了对话进行到哪一步。

```typescript
const SupportState = new StateSchema({
  currentStep: z.string().default("triage"),  // 当前步骤：分诊
  warrantyStatus: z.string().optional(),       // 保修状态：可选
});
```

**重点**：`currentStep` 就是那个"指挥棒"，它的值决定了 Agent 表现什么行为。

### 4.2 Command (命令)

**口语解释：** 工具执行完后，不只是返回结果，还能"发号施令"：更新状态、跳转到其他 Agent。

```typescript
return new Command({
  update: {
    currentStep: "specialist",  // 更新状态
    messages: [...]             // 添加消息
  },
  goto: "sales_agent",          // 跳转到哪个节点
  graph: Command.PARENT         // 在父图层面操作
});
```

**Command 就像一个"打包指令"，告诉系统："我干完了，顺便帮我做这些事。"**

### 4.3 ToolMessage (工具消息)

**口语解释：** LLM 调用工具后，必须有个"回执"，就像你寄快递后要有签收确认一样。

```typescript
new ToolMessage({
  content: "Transferred to specialist",   // 消息内容
  tool_call_id: config.toolCallId         // 对应哪次工具调用
})
```

**为什么必须有？** 没有 ToolMessage，LLM 会困惑："我调用了工具，结果呢？" 对话历史就会"畸形"，后续推理可能出错。

### 4.4 Middleware (中间件)

**口语解释：** 每次 LLM 要思考之前，先"过一道安检门"，根据当前状态动态调整它的"人设"和"武器库"（System Prompt 和 Tools）。

```typescript
const applyStepConfig = createMiddleware({
  wrapModelCall: async (request, handler) => {
    const step = request.state.currentStep;  // 读取当前步骤
    const config = configs[step];             // 获取对应配置
    return handler({
      ...request,
      systemPrompt: config.prompt,            // 换人设
      tools: config.tools,                    // 换武器
    });
  },
});
```

### 4.5 Subgraph (子图)

**口语解释：** 当一个 Agent 不够复杂，需要独立的多步骤流程时，可以把它单独做成一个"子流程"。多个子图组合成完整系统。

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 场景一：单 Agent + 中间件 (推荐的简单方案)

```typescript
// 这行代码的意思是：定义一个工具，名叫"记录保修状态"
const recordWarrantyStatus = tool(
  // 当 LLM 调用这个工具时，执行这个函数
  async ({ status }, config) => {
    // 返回一个"命令包"
    return new Command({
      update: {
        // 1. 往消息列表里加一条回执
        messages: [
          new ToolMessage({
            content: `保修状态已记录: ${status}`,
            tool_call_id: config.toolCallId,
          }),
        ],
        // 2. 记录保修状态到 State
        warrantyStatus: status,
        // 3. 关键! 把 currentStep 改成 "specialist"
        //    这会触发中间件在下一轮切换配置!
        currentStep: "specialist",
      },
    });
  },
  {
    name: "record_warranty_status",
    description: "记录保修状态并进入下一步",
    schema: z.object({ status: z.string() }),
  }
);
```

**人话总结：**
1. 用户说"我的手机还在保修期内"
2. LLM 调用 `record_warranty_status("in_warranty")`
3. 工具执行后，`currentStep` 变成 `"specialist"`
4. 下一轮对话时，中间件检测到状态变了，自动切换 System Prompt 和可用工具
5. 用户感受：客服变得更专业了，开始提供解决方案

### 场景二：多 Agent 子图 (复杂场景)

```typescript
// 这个工具的作用：把对话转给销售 Agent
const transferToSales = tool(
  async (_, runtime) => {
    // 1. 找到最后一条 AI 消息 (包含工具调用的那条)
    const lastAiMessage = [...runtime.state.messages]
      .reverse()
      .find(AIMessage.isInstance);
    
    // 2. 创建工具回执
    const transferMessage = new ToolMessage({
      content: "已转接至销售专员",
      tool_call_id: runtime.toolCallId,
    });
    
    // 3. 返回命令：跳转到 sales_agent 节点
    return new Command({
      goto: "sales_agent",              // 去哪个节点
      update: {
        activeAgent: "sales_agent",     // 更新状态
        // 关键：只传递必要的消息，不是全部历史!
        messages: [lastAiMessage, transferMessage].filter(Boolean),
      },
      graph: Command.PARENT,            // 在父图层面操作
    });
  },
  // ... 工具配置
);
```

**为什么只传两条消息？**

| 做法 | 后果 |
|------|------|
| 传全部消息历史 | 新 Agent 收到一堆无关信息，困惑 + 浪费 Token |
| 只传交接消息 | 新 Agent 知道"从哪来"，保持上下文简洁 |
| 需要更多上下文？ | 在 ToolMessage 里写总结，而不是塞原始消息 |

---

## 6. 真实应用场景 (Real-world Scenario)

### 场景：电商智能客服系统

想象你在开发淘宝/京东级别的智能客服：

```
用户: "我买的衣服想退货"

[系统流程]
Step 1 - 分诊 (Triage)
- System Prompt: "收集订单信息和退货原因"
- 可用工具: [查询订单, 记录退货原因]

用户: "订单号是 ABC123，尺码不合适"
--> Agent 调用: record_issue_type("size_mismatch")
--> currentStep 变为 "refund_assessment"

Step 2 - 退款评估 (Refund Assessment)  
- System Prompt: "根据退货政策评估是否符合条件"
- 可用工具: [检查退货期限, 评估商品状态, 批准退款, 拒绝退款]

--> Agent 判断：在7天内，符合条件
--> 调用: approve_refund()
--> currentStep 变为 "refund_processing"

Step 3 - 退款处理 (Refund Processing)
- System Prompt: "指导用户完成退货流程"
- 可用工具: [生成退货单, 预约快递, 转人工]

用户: "好的，我怎么把衣服寄回去？"
Agent: "已为您生成退货单，顺丰快递明天上门取件..."
```

**用 Handoffs 的好处：**

| 不用 Handoffs | 用 Handoffs |
|--------------|-------------|
| 一个大 Agent，20+ 工具，选择困难 | 每步只暴露 3-4 个相关工具 |
| System Prompt 3000 字，啥都说 | 每步精准提示，聚焦当前任务 |
| 用户说啥都可能跳流程 | 强制按顺序走，先收集信息再处理 |
| 出错难排查 | 状态清晰，知道卡在哪一步 |

### 场景变体：需要多 Agent 子图的情况

当你的某个"步骤"本身就很复杂时：

```
退款评估 Agent (不是简单工具调用，而是)
  --> 调用数据库查询历史订单
  --> 调用风控系统评估欺诈风险
  --> 如果金额 > 500，自动加入人工复核流程
  --> 生成评估报告
```

这种情况下，把"退款评估"做成独立的 Agent 子图更合适，它内部可能有自己的多轮推理和工具调用。

---

## 7. 两种实现方式对比

| 维度 | 单 Agent + Middleware | 多 Agent Subgraph |
|------|----------------------|-------------------|
| 复杂度 | 低，推荐大多数场景 | 高，按需使用 |
| 状态管理 | 简单，共享 State | 需要精心设计消息传递 |
| 消息历史 | 自然流动 | 需要手动处理上下文 |
| 适用场景 | 同一个 Agent 换人设/工具 | 每个角色有独立复杂逻辑 |
| Token 效率 | 好 | 容易出现上下文膨胀 |
| 调试难度 | 简单 | 需要关注跨 Agent 交接 |

**选择建议：**
- 90% 的场景用 **单 Agent + Middleware** 就够了
- 只有当某个角色需要独立的复杂流程（比如 RAG + 反思 + 多轮规划）时，才考虑 **Subgraph**

---

## 8. 实现注意事项 Checklist

在设计 Handoffs 系统时，问自己这些问题：

- [ ] **上下文策略**：每个 Agent 需要完整历史、筛选后的历史、还是摘要？
- [ ] **工具职责**：Handoff 工具只负责切换，还是同时执行副作用（如创建工单）？
- [ ] **Token 预算**：对话长了怎么办？何时触发摘要/裁剪？
- [ ] **错误恢复**：如果切换失败，怎么回退？
- [ ] **用户体验**：切换时要不要告诉用户？（"已为您转接专业客服"）

---

## 9. 总结：Handoffs 核心心法

```
                    +-----------------+
                    |   State 状态    |
                    | (currentStep)   |
                    +--------+--------+
                             |
                             v
+----------------+    读取状态     +----------------+
|                | <------------- |                |
|  Middleware    |                |  Agent 决策    |
|  动态配置      | -------------> |  调用工具      |
|                |    应用配置     |                |
+----------------+                +-------+--------+
                                         |
                                         v
                                  +------+------+
                                  | Handoff Tool |
                                  | 更新 State   |
                                  +------+------+
                                         |
                                         v
                                  (循环继续...)
```

**三句话记住 Handoffs：**

1. **状态是老大**：`currentStep` 决定一切行为
2. **工具是扳道工**：通过 `Command` 更新状态、跳转节点
3. **消息是凭证**：`ToolMessage` 让对话历史保持完整

掌握这个模式，你就能构建出像真人客服团队一样协作流畅的 AI 系统!
