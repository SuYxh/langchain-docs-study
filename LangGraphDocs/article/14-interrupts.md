# 14. 中断机制：人机协作的核心

## 简单来说

**Interrupt（中断）就是 AI 工作流里的"暂停键"** —— 让你的 AI Agent 在关键时刻停下来，等人类拍板说"行"或"不行"之后再继续执行。配合 Checkpointer 持久化，即使服务重启也能从断点继续。

## 🎯 本节目标

学完本节，你将能够回答：

1. 如何在代码的任意位置暂停图的执行？
2. 如何获取中断信息并恢复执行？
3. 审批工作流、内容审查、输入验证等常见模式怎么实现？
4. 使用中断时有哪些"军规"必须遵守？
5. 如何在工具（Tool）内部实现中断？

---

## 核心痛点与解决方案

### 痛点：AI 太"自作主张"了

| 场景 | 风险 |
|------|------|
| AI 客服直接转账 $10000 | 转错人了，损失惨重 |
| AI 助手直接删除数据库记录 | 不可逆操作，数据丢失 |
| AI 自动发送邮件 | 内容错误，影响公司形象 |
| 敏感操作无人审批 | 合规风险，法律问题 |

**两难困境**：
- AI 一路狂奔到底 → 太危险
- 每一步都人工介入 → 太低效

### 解决：精准的"人机协作"控制点

```
AI 自动执行 → 遇到关键决策点 → 暂停! → 等人类输入 → 继续执行
     ↑                                              │
     └──────────────────────────────────────────────┘
```

**核心价值**：
- 🚀 **该快的地方快** —— 普通任务全自动
- 🛑 **该慢的地方慢** —— 敏感操作必须人工审批
- 💾 **状态不丢失** —— 暂停期间所有上下文都保存着

---

## 生活化类比

### 🏥 类比：医院手术室

把 LangGraph 的中断机制想象成**手术室里的"暂停决策"流程**：

| LangGraph 概念 | 医院场景 |
|---------------|---------|
| **Graph（图）** | 整个手术流程 |
| **Node（节点）** | 具体手术步骤（消毒、麻醉、切开…） |
| **State（状态）** | 病人当前生命体征 + 手术进度 |
| **interrupt()** | 手术室"暂停按钮"，等主刀医生决策 |
| **Command({ resume })** | 主刀医生的"继续指令" |
| **Checkpointer** | 完整的手术记录本 |
| **thread_id** | 病人的住院号 |

**场景演绎**：

```
Step 1: 常规消毒 → 自动完成 ✓
Step 2: 局部麻醉 → 自动完成 ✓
Step 3: 准备切开 → INTERRUPT! 暂停！
        
        [AI]: "主刀医生，检测到患者对某种药物过敏，
               请确认是否更换切口方案？"
               
        [手术记录本自动保存当前所有状态...]
        
        --- 等待主刀医生决策 ---
        
        [医生]: "同意更换为 B 方案"
        
        [系统恢复，继续执行...]
        
Step 4: 按方案B切开 → 自动完成 ✓
```

---

## 核心概念详解

### 中断工作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         第一次调用                              │
│        graph.invoke(input, { configurable: { thread_id } })    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │    Node 执行     │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  interrupt(msg)  │ ← 暂停点
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
     ┌────────────────┐           ┌────────────────┐
     │ 保存状态到      │           │ 返回结果        │
     │ Checkpointer   │           │ { __interrupt__ }│
     └────────────────┘           └────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │    等待中...    │
                    └────────┬────────┘
                             │
┌─────────────────────────────────────────────────────────────────┐
│                         第二次调用                              │
│     graph.invoke(new Command({ resume: value }), config)       │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ 从 Node 开头重新  │
                    │ 执行             │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ interrupt() 返回 │
                    │ resume 的值      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  继续执行后续代码  │
                    └──────────────────┘
```

### 1. interrupt() — 暂停函数

```typescript
import { interrupt } from "@langchain/langgraph";

async function approvalNode(state: State) {
  const approved = interrupt("Do you approve this action?");
  return { approved };
}
```

**关键特点**：
- 可以在代码的**任意位置**调用（不限于节点前后）
- 可以传递任何 JSON 可序列化的值
- 调用后图的执行**完全冻结**，直到恢复

💡 **人话解读**：
> "执行到这行时，整个图就'冻住'了。括号里的内容会被抛给外部调用者，告诉他们'我在等什么'。"

### 2. Command({ resume }) — 恢复指令

```typescript
import { Command } from "@langchain/langgraph";

const config = { configurable: { thread_id: "thread-1" } };

const result = await graph.invoke({ input: "data" }, config);
console.log(result.__interrupt__);

await graph.invoke(new Command({ resume: true }), config);
```

**关键点**：
- `resume` 里的值会成为 `interrupt()` 的返回值
- 必须用**相同的 thread_id** 才能恢复正确的暂停点

💡 **人话解读**：
> "外部调用者说'我看完了，这是我的回复，你可以继续了'。resume 的值会被传回给 interrupt()，成为它的返回值。"

### 3. __interrupt__ — 中断信息载体

```typescript
const result = await graph.invoke({ input: "data" }, config);
console.log(result.__interrupt__);
// [{ value: 'Do you approve this action?', id: 'xxx' }]
```

💡 **人话解读**：
> "当图被暂停时，返回结果里有个特殊字段 `__interrupt__`，告诉你 AI 正在等什么。value 是你传给 interrupt() 的内容。"

---

## 基础用法

### 使用中断的三个前提

1. **Checkpointer** —— 持久化图状态（生产环境用数据库）
2. **thread_id** —— 标识会话，用于恢复
3. **interrupt()** —— 在需要暂停的地方调用

### 完整示例：审批工作流

```typescript
import {
  Command,
  MemorySaver,
  START,
  END,
  StateGraph,
  Annotation,
  interrupt,
} from "@langchain/langgraph";

const State = Annotation.Root({
  actionDetails: Annotation<string>(),
  status: Annotation<"pending" | "approved" | "rejected">(),
});

const graph = new StateGraph(State)
  .addNode("approval", async (state) => {
    const decision = interrupt({
      question: "Approve this action?",
      details: state.actionDetails,
    });
    return new Command({ goto: decision ? "proceed" : "cancel" });
  }, { ends: ["proceed", "cancel"] })
  .addNode("proceed", () => ({ status: "approved" }))
  .addNode("cancel", () => ({ status: "rejected" }))
  .addEdge(START, "approval")
  .addEdge("proceed", END)
  .addEdge("cancel", END)
  .compile({ checkpointer: new MemorySaver() });

async function main() {
  const config = { configurable: { thread_id: "approval-123" } };
  
  const initial = await graph.invoke(
    { actionDetails: "Transfer $500", status: "pending" },
    config
  );
  
  console.log("中断信息:", initial.__interrupt__);
  
  const resumed = await graph.invoke(
    new Command({ resume: true }),
    config
  );
  
  console.log("最终状态:", resumed.status);
}

main();
```

**执行流程**：

```
1. 首次调用 → approval 节点执行 → interrupt() 暂停
2. 返回 __interrupt__ 信息给调用者
3. 调用者展示给用户，用户做出决定
4. 第二次调用 Command({ resume: true }) → approval 节点从头执行
5. interrupt() 返回 true → 路由到 proceed 节点
6. 返回最终状态 { status: "approved" }
```

---

## 常见模式

### 模式一：审批或拒绝

最常见的场景 —— 在关键操作前暂停，等待人工批准：

```typescript
import { interrupt, Command } from "@langchain/langgraph";

const approvalNode = async (state: typeof State.State) => {
  const isApproved = interrupt({
    question: "Do you want to proceed?",
    details: state.actionDetails,
  });

  if (isApproved) {
    return new Command({ goto: "proceed" });
  } else {
    return new Command({ goto: "cancel" });
  }
};
```

**恢复时**：

```typescript
await graph.invoke(new Command({ resume: true }), config);

await graph.invoke(new Command({ resume: false }), config);
```

### 模式二：审查与编辑

让人类审查并修改 AI 生成的内容：

```typescript
const reviewNode = async (state: typeof State.State) => {
  const editedContent = interrupt({
    instruction: "Review and edit this content",
    content: state.generatedText,
  });

  return { generatedText: editedContent };
};
```

**恢复时**：

```typescript
await graph.invoke(
  new Command({ resume: "The edited and improved text" }),
  config
);
```

💡 **人话解读**：
> "AI 生成了一段文字，先暂停让人审查。人可以直接用原文，也可以修改后再提交。resume 的值就是最终采用的内容。"

### 模式三：工具内中断

在工具（Tool）内部实现审批逻辑，让 LLM 自然调用时自动触发：

```typescript
import { tool } from "@langchain/core/tools";
import { interrupt } from "@langchain/langgraph";
import { z } from "zod";

const sendEmailTool = tool(
  async ({ to, subject, body }) => {
    const response = interrupt({
      action: "send_email",
      to,
      subject,
      body,
      message: "Approve sending this email?",
    });

    if (response?.action === "approve") {
      const finalTo = response.to ?? to;
      const finalSubject = response.subject ?? subject;
      const finalBody = response.body ?? body;
      return `Email sent to ${finalTo} with subject '${finalSubject}'`;
    }
    return "Email cancelled by user";
  },
  {
    name: "send_email",
    description: "Send an email to a recipient",
    schema: z.object({
      to: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
  }
);
```

**恢复时（可修改参数）**：

```typescript
await graph.invoke(
  new Command({
    resume: {
      action: "approve",
      subject: "Updated subject",
    },
  }),
  config
);
```

💡 **人话解读**：
> "审批逻辑'内聚'在 Tool 里。LLM 调用这个工具时会自动暂停等审批。人类还可以在审批时修改邮件的收件人、标题等参数！"

### 模式四：输入验证循环

多次中断直到获得有效输入：

```typescript
const getAgeNode = (state: typeof State.State) => {
  let prompt = "What is your age?";

  while (true) {
    const answer = interrupt(prompt);

    if (typeof answer === "number" && answer > 0) {
      return { age: answer };
    } else {
      prompt = `'${answer}' is not a valid age. Please enter a positive number.`;
    }
  }
};
```

**执行流程**：

```
第一次调用: interrupt("What is your age?") → 暂停
恢复: Command({ resume: "thirty" }) → 验证失败
第二次中断: interrupt("'thirty' is not valid...") → 暂停
恢复: Command({ resume: 30 }) → 验证通过，返回 { age: 30 }
```

### 模式五：处理多个并行中断

当并行分支都触发中断时：

```typescript
import { INTERRUPT, isInterrupted } from "@langchain/langgraph";

function nodeA(_state: typeof State.State) {
  const answer = interrupt("question_a") as string;
  return { vals: [`a:${answer}`] };
}

function nodeB(_state: typeof State.State) {
  const answer = interrupt("question_b") as string;
  return { vals: [`b:${answer}`] };
}

const graph = new StateGraph(State)
  .addNode("a", nodeA)
  .addNode("b", nodeB)
  .addEdge(START, "a")
  .addEdge(START, "b")
  .addEdge("a", END)
  .addEdge("b", END)
  .compile({ checkpointer: new MemorySaver() });

async function main() {
  const config = { configurable: { thread_id: "1" } };

  const interruptedResult = await graph.invoke({ vals: [] }, config);
  // __interrupt__: [
  //   { id: 'xxx', value: 'question_a' },
  //   { id: 'yyy', value: 'question_b' }
  // ]

  const resumeMap: Record<string, string> = {};
  if (isInterrupted(interruptedResult)) {
    for (const i of interruptedResult[INTERRUPT]) {
      if (i.id != null) {
        resumeMap[i.id] = `answer for ${i.value}`;
      }
    }
  }

  const result = await graph.invoke(
    new Command({ resume: resumeMap }),
    config
  );
  // { vals: ['a:answer for question_a', 'b:answer for question_b'] }
}
```

💡 **人话解读**：
> "当有多个并行中断时，每个中断都有唯一的 id。用这个 id 来'精准投喂'每个中断对应的答案。"

---

## 中断规则（军规）

### ⚠️ 规则 1：不要把 interrupt() 包在 try/catch 里

```typescript
async function nodeA(state: State) {
  try {
    const name = interrupt("What's your name?");
  } catch (err) {
    console.error(err);
  }
  return state;
}
```

**为什么？** `interrupt()` 通过抛异常实现暂停，如果你捕获了这个异常，暂停就失效了。

**正确做法**：

```typescript
async function nodeA(state: State) {
  const name = interrupt("What's your name?");
  try {
    await riskyOperation();
  } catch (err) {
    console.error(err);
  }
  return state;
}
```

或者重新抛出：

```typescript
async function nodeA(state: State) {
  try {
    const name = interrupt("What's your name?");
    await riskyOperation();
  } catch (err) {
    if (err instanceof NetworkError) {
      console.error(err);
    }
    throw err;
  }
  return state;
}
```

### ⚠️ 规则 2：不要改变 interrupt 调用的顺序

```typescript
async function nodeA(state: State) {
  const name = interrupt("What's your name?");
  
  if (state.needsAge) {
    const age = interrupt("What's your age?");
  }
  
  const city = interrupt("What's your city?");
  
  return { name, city };
}
```

**为什么？** 恢复时是按**索引**匹配的，顺序乱了就对不上了。

**正确做法**：

```typescript
async function nodeA(state: State) {
  const name = interrupt("What's your name?");
  const age = interrupt("What's your age?");
  const city = interrupt("What's your city?");

  return { name, age, city };
}
```

### ⚠️ 规则 3：interrupt 前的副作用必须幂等

```typescript
async function nodeA(state: State) {
  await db.createRecord({ userId: state.userId });
  const approved = interrupt("Approve?");
  return { approved };
}
```

**为什么？** 恢复时节点会从头执行，interrupt 之前的代码会**再跑一遍**，可能创建重复记录。

**正确做法**：

```typescript
async function nodeA(state: State) {
  await db.upsertRecord({ 
    id: state.recordId, 
    userId: state.userId 
  });
  const approved = interrupt("Approve?");
  return { approved };
}

async function nodeA(state: State) {
  const approved = interrupt("Approve?");
  if (approved) {
    await db.createRecord({ userId: state.userId });
  }
  return { approved };
}
```

### ⚠️ 规则 4：不要传复杂对象给 interrupt

```typescript
const response = interrupt({
  validator: (x) => x > 0
});
```

**为什么？** 暂停时状态要存到数据库，函数、类实例这些复杂对象无法序列化。

**正确做法**：

```typescript
const response = interrupt({
  question: "Enter a number",
  validation: "must be positive"
});
```

---

## 规则速查表

| 规则 | ❌ 错误做法 | ✅ 正确做法 |
|------|-----------|-----------|
| try/catch | 捕获 interrupt 异常 | 分离逻辑或重新抛出 |
| 顺序一致 | 条件跳过某个 interrupt | 保持顺序始终一致 |
| 幂等性 | interrupt 前创建新记录 | 用 upsert 或放到 interrupt 后 |
| 序列化 | 传函数/类实例 | 只传 JSON 可序列化值 |

---

## 完整业务场景：退款审批系统

```typescript
import {
  Command,
  MemorySaver,
  START,
  END,
  StateGraph,
  Annotation,
  interrupt,
} from "@langchain/langgraph";

const RefundState = Annotation.Root({
  orderId: Annotation<string>(),
  userId: Annotation<string>(),
  amount: Annotation<number>(),
  reason: Annotation<string>(),
  riskScore: Annotation<number>(),
  status: Annotation<"pending" | "approved" | "rejected">(),
  approvedBy: Annotation<string>(),
  rejectReason: Annotation<string>(),
});

const analyzeRisk = async (state: typeof RefundState.State) => {
  const riskScore = state.amount > 1000 ? 80 : 30;
  return { riskScore };
};

const humanApproval = async (state: typeof RefundState.State) => {
  const decision = interrupt({
    type: "refund_approval",
    orderId: state.orderId,
    userId: state.userId,
    amount: state.amount,
    reason: state.reason,
    riskScore: state.riskScore,
    suggestion: state.riskScore > 70 ? "建议拒绝" : "建议通过",
  });

  if (decision.approved) {
    return new Command({
      goto: "executeRefund",
      update: { approvedBy: decision.approver, status: "approved" },
    });
  } else {
    return new Command({
      goto: "notifyRejection",
      update: { rejectReason: decision.reason, status: "rejected" },
    });
  }
};

const executeRefund = async (state: typeof RefundState.State) => {
  console.log(`执行退款: 订单 ${state.orderId}, 金额 ${state.amount}`);
  return {};
};

const notifyRejection = async (state: typeof RefundState.State) => {
  console.log(`退款被拒绝: ${state.rejectReason}`);
  return {};
};

const graph = new StateGraph(RefundState)
  .addNode("analyzeRisk", analyzeRisk)
  .addNode("humanApproval", humanApproval, {
    ends: ["executeRefund", "notifyRejection"],
  })
  .addNode("executeRefund", executeRefund)
  .addNode("notifyRejection", notifyRejection)
  .addEdge(START, "analyzeRisk")
  .addEdge("analyzeRisk", "humanApproval")
  .addEdge("executeRefund", END)
  .addEdge("notifyRejection", END)
  .compile({ checkpointer: new MemorySaver() });

async function main() {
  const config = { configurable: { thread_id: "refund-001" } };

  console.log("=== 退款审批系统 ===\n");

  const result = await graph.invoke(
    {
      orderId: "ORD-12345",
      userId: "user-001",
      amount: 299,
      reason: "商品与描述不符",
      status: "pending",
    },
    config
  );

  console.log("等待审批:", result.__interrupt__?.[0]?.value);

  const finalResult = await graph.invoke(
    new Command({
      resume: {
        approved: true,
        approver: "admin@company.com",
      },
    }),
    config
  );

  console.log("最终状态:", finalResult.status);
}

main();
```

**执行效果**：

```
=== 退款审批系统 ===

等待审批: {
  type: 'refund_approval',
  orderId: 'ORD-12345',
  userId: 'user-001',
  amount: 299,
  reason: '商品与描述不符',
  riskScore: 30,
  suggestion: '建议通过'
}
执行退款: 订单 ORD-12345, 金额 299
最终状态: approved
```

---

## 静态断点（调试用）

除了动态的 `interrupt()` 函数，LangGraph 还支持静态断点用于调试：

```typescript
const graph = builder.compile({
  interruptBefore: ["node_a"],
  interruptAfter: ["node_b", "node_c"],
  checkpointer,
});

await graph.invoke(inputs, config);

await graph.invoke(null, config);
```

⚠️ **注意**：静态断点**不推荐**用于人机协作，仅用于调试。生产环境请使用 `interrupt()` 函数。

---

## 总结对比表

| 概念 | 作用 | 关键点 |
|------|------|--------|
| `interrupt(value)` | 暂停执行，等待外部输入 | 可在任意位置调用 |
| `Command({ resume })` | 恢复执行，传入回复 | 必须用相同 thread_id |
| `__interrupt__` | 中断信息载体 | 包含 value 和 id |
| `Checkpointer` | 持久化状态 | 生产环境用数据库 |
| `thread_id` | 会话标识 | 相同 id = 继续，新 id = 重新开始 |

---

## 核心要点回顾

1. **interrupt() 是动态断点** —— 可以在代码任意位置暂停，不限于节点边界

2. **必须有 Checkpointer** —— 否则暂停后状态就丢了，生产环境用持久化存储

3. **thread_id 是恢复的钥匙** —— 用对了才能恢复到正确的暂停点

4. **节点会从头执行** —— 恢复时不是从 interrupt 那行继续，而是从节点开头

5. **遵守四条军规** —— 不包 try/catch、顺序一致、幂等副作用、只传简单值

---

## 下一步学习

- **第 15 章：子图构建** - 学习如何用子图模块化复杂工作流
- **第 16 章：应用结构** - 学习 LangGraph 项目的最佳组织方式
