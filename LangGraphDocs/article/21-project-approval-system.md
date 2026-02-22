# 21. 项目实战：智能审批系统

## 项目简介

本项目将从零构建一个**多级智能审批系统**，实现：
- 🚦 **条件路由**：根据金额自动分流到不同审批流程
- 👨‍💼 **人工审批**：使用 interrupt() 实现人机协作
- ⏪ **状态回退**：支持驳回后重新提交
- 📋 **审批日志**：完整记录审批历史

**难度等级：** ⭐⭐⭐

**涉及知识点：** 路由模式 + HITL（人机协作）+ 时间旅行 + 状态管理

---

## 🎯 学习目标

完成本项目后，你将掌握：

1. 如何使用条件边实现复杂路由逻辑
2. 如何使用 interrupt() 实现人工审批
3. 如何使用 Command({ resume }) 恢复中断
4. 如何实现审批状态回退和重新提交
5. 如何记录完整的审批日志

---

## 项目架构

```
审批请求 → 路由节点
              │
              ├→ 金额 < 1000 → 自动审批 → 完成
              │
              ├→ 金额 1000-10000 → 主管审批（HITL）
              │                      ├→ 通过 → 完成
              │                      └→ 拒绝 → 通知申请人
              │
              └→ 金额 > 10000 → 多级审批
                                 ├→ 主管审批 → 财务审批 → 完成
                                 └→ 任一拒绝 → 回退/终止
```

---

## 项目结构

```plaintext
approval-system/
├── src/
│   ├── state.ts           # 状态定义
│   ├── nodes.ts           # 节点函数
│   ├── graph.ts           # 图构建
│   └── index.ts           # 入口文件
├── package.json
├── tsconfig.json
└── .env
```

---

## 第一步：状态定义

### src/state.ts

```typescript
import { Annotation } from "@langchain/langgraph";

export type ApprovalStatus = 
  | "pending"      // 待审批
  | "approved"     // 已通过
  | "rejected"     // 已拒绝
  | "cancelled";   // 已取消

export type ApprovalLevel = 
  | "auto"         // 自动审批
  | "manager"      // 主管审批
  | "finance"      // 财务审批
  | "director";    // 总监审批

export interface ApprovalLog {
  timestamp: string;
  level: ApprovalLevel;
  approver: string;
  action: "approved" | "rejected" | "pending";
  comment?: string;
}

export interface ApprovalRequest {
  id: string;
  applicant: string;
  amount: number;
  reason: string;
  department: string;
  createdAt: string;
}

export const ApprovalState = Annotation.Root({
  request: Annotation<ApprovalRequest>(),
  
  status: Annotation<ApprovalStatus>({
    reducer: (_, update) => update,
    default: () => "pending",
  }),
  
  currentLevel: Annotation<ApprovalLevel>({
    reducer: (_, update) => update,
    default: () => "auto",
  }),
  
  logs: Annotation<ApprovalLog[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  
  result: Annotation<{
    approved: boolean;
    message: string;
    approvedBy?: string[];
  } | null>({
    reducer: (_, update) => update,
    default: () => null,
  }),
});

export type ApprovalStateType = typeof ApprovalState.State;
```

**💡 人话解读：**

| 状态字段 | 作用 |
|----------|------|
| `request` | 审批请求的详细信息 |
| `status` | 当前审批状态（待审批/通过/拒绝/取消） |
| `currentLevel` | 当前所在的审批级别 |
| `logs` | 审批历史日志（追加模式） |
| `result` | 最终审批结果 |

---

## 第二步：节点函数

### src/nodes.ts

```typescript
import { interrupt, Command } from "@langchain/langgraph";
import { ApprovalStateType, ApprovalLevel, ApprovalLog } from "./state.js";

const AMOUNT_THRESHOLDS = {
  AUTO: 1000,
  MANAGER: 10000,
  FINANCE: 50000,
};

function createLog(
  level: ApprovalLevel, 
  approver: string, 
  action: "approved" | "rejected" | "pending",
  comment?: string
): ApprovalLog {
  return {
    timestamp: new Date().toISOString(),
    level,
    approver,
    action,
    comment,
  };
}

export function routeByAmount(state: ApprovalStateType): string {
  const amount = state.request.amount;
  
  if (amount < AMOUNT_THRESHOLDS.AUTO) {
    return "autoApprove";
  } else if (amount < AMOUNT_THRESHOLDS.MANAGER) {
    return "managerApproval";
  } else if (amount < AMOUNT_THRESHOLDS.FINANCE) {
    return "managerApproval";
  } else {
    return "managerApproval";
  }
}

export async function autoApproveNode(state: ApprovalStateType) {
  console.log(`\n🤖 自动审批: 金额 ¥${state.request.amount} 低于 ¥${AMOUNT_THRESHOLDS.AUTO}，自动通过`);
  
  return {
    status: "approved" as const,
    currentLevel: "auto" as const,
    logs: [createLog("auto", "System", "approved", "金额低于阈值，自动通过")],
    result: {
      approved: true,
      message: "审批通过（自动）",
      approvedBy: ["System"],
    },
  };
}

export async function managerApprovalNode(state: ApprovalStateType) {
  console.log(`\n👨‍💼 主管审批节点`);
  console.log(`   申请人: ${state.request.applicant}`);
  console.log(`   金额: ¥${state.request.amount}`);
  console.log(`   原因: ${state.request.reason}`);
  
  const decision = interrupt({
    type: "manager_approval",
    message: "请主管审批此申请",
    request: state.request,
    options: ["approve", "reject"],
  });

  const { action, approver, comment } = decision as {
    action: "approve" | "reject";
    approver: string;
    comment?: string;
  };

  if (action === "approve") {
    console.log(`   ✅ 主管 ${approver} 已通过`);
    
    if (state.request.amount >= AMOUNT_THRESHOLDS.MANAGER) {
      return {
        currentLevel: "finance" as const,
        logs: [createLog("manager", approver, "approved", comment)],
      };
    }
    
    return {
      status: "approved" as const,
      currentLevel: "manager" as const,
      logs: [createLog("manager", approver, "approved", comment)],
      result: {
        approved: true,
        message: "审批通过（主管）",
        approvedBy: [approver],
      },
    };
  } else {
    console.log(`   ❌ 主管 ${approver} 已拒绝`);
    
    return {
      status: "rejected" as const,
      logs: [createLog("manager", approver, "rejected", comment)],
      result: {
        approved: false,
        message: `审批被拒绝: ${comment || "无"}`,
      },
    };
  }
}

export async function financeApprovalNode(state: ApprovalStateType) {
  console.log(`\n💰 财务审批节点`);
  console.log(`   申请人: ${state.request.applicant}`);
  console.log(`   金额: ¥${state.request.amount}`);
  
  const decision = interrupt({
    type: "finance_approval",
    message: "请财务审批此申请",
    request: state.request,
    previousApprovals: state.logs.filter(l => l.action === "approved"),
    options: ["approve", "reject"],
  });

  const { action, approver, comment } = decision as {
    action: "approve" | "reject";
    approver: string;
    comment?: string;
  };

  if (action === "approve") {
    console.log(`   ✅ 财务 ${approver} 已通过`);
    
    if (state.request.amount >= AMOUNT_THRESHOLDS.FINANCE) {
      return {
        currentLevel: "director" as const,
        logs: [createLog("finance", approver, "approved", comment)],
      };
    }
    
    const approvedBy = state.logs
      .filter(l => l.action === "approved")
      .map(l => l.approver);
    approvedBy.push(approver);
    
    return {
      status: "approved" as const,
      currentLevel: "finance" as const,
      logs: [createLog("finance", approver, "approved", comment)],
      result: {
        approved: true,
        message: "审批通过（财务）",
        approvedBy,
      },
    };
  } else {
    console.log(`   ❌ 财务 ${approver} 已拒绝`);
    
    return {
      status: "rejected" as const,
      logs: [createLog("finance", approver, "rejected", comment)],
      result: {
        approved: false,
        message: `审批被财务拒绝: ${comment || "无"}`,
      },
    };
  }
}

export async function directorApprovalNode(state: ApprovalStateType) {
  console.log(`\n🎯 总监审批节点`);
  console.log(`   申请人: ${state.request.applicant}`);
  console.log(`   金额: ¥${state.request.amount}`);
  
  const decision = interrupt({
    type: "director_approval",
    message: "请总监最终审批此申请",
    request: state.request,
    previousApprovals: state.logs.filter(l => l.action === "approved"),
    options: ["approve", "reject"],
  });

  const { action, approver, comment } = decision as {
    action: "approve" | "reject";
    approver: string;
    comment?: string;
  };

  const approvedBy = state.logs
    .filter(l => l.action === "approved")
    .map(l => l.approver);

  if (action === "approve") {
    console.log(`   ✅ 总监 ${approver} 已通过`);
    approvedBy.push(approver);
    
    return {
      status: "approved" as const,
      currentLevel: "director" as const,
      logs: [createLog("director", approver, "approved", comment)],
      result: {
        approved: true,
        message: "审批通过（总监）",
        approvedBy,
      },
    };
  } else {
    console.log(`   ❌ 总监 ${approver} 已拒绝`);
    
    return {
      status: "rejected" as const,
      logs: [createLog("director", approver, "rejected", comment)],
      result: {
        approved: false,
        message: `审批被总监拒绝: ${comment || "无"}`,
      },
    };
  }
}

export function routeAfterManager(state: ApprovalStateType): string {
  if (state.status === "rejected") {
    return "end";
  }
  
  if (state.request.amount >= AMOUNT_THRESHOLDS.MANAGER) {
    return "financeApproval";
  }
  
  return "end";
}

export function routeAfterFinance(state: ApprovalStateType): string {
  if (state.status === "rejected") {
    return "end";
  }
  
  if (state.request.amount >= AMOUNT_THRESHOLDS.FINANCE) {
    return "directorApproval";
  }
  
  return "end";
}
```

**💡 人话解读：**

| 节点 | 触发条件 | 功能 |
|------|----------|------|
| `autoApprove` | 金额 < ¥1,000 | 自动通过，无需人工 |
| `managerApproval` | 金额 ≥ ¥1,000 | 主管审批（interrupt） |
| `financeApproval` | 金额 ≥ ¥10,000 | 财务审批（interrupt） |
| `directorApproval` | 金额 ≥ ¥50,000 | 总监审批（interrupt） |

---

## 第三步：构建图

### src/graph.ts

```typescript
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { ApprovalState } from "./state.js";
import {
  routeByAmount,
  autoApproveNode,
  managerApprovalNode,
  financeApprovalNode,
  directorApprovalNode,
  routeAfterManager,
  routeAfterFinance,
} from "./nodes.js";

const graph = new StateGraph(ApprovalState)
  .addNode("autoApprove", autoApproveNode)
  .addNode("managerApproval", managerApprovalNode)
  .addNode("financeApproval", financeApprovalNode)
  .addNode("directorApproval", directorApprovalNode)
  
  .addConditionalEdges(START, routeByAmount, {
    autoApprove: "autoApprove",
    managerApproval: "managerApproval",
  })
  
  .addEdge("autoApprove", END)
  
  .addConditionalEdges("managerApproval", routeAfterManager, {
    financeApproval: "financeApproval",
    end: END,
  })
  
  .addConditionalEdges("financeApproval", routeAfterFinance, {
    directorApproval: "directorApproval",
    end: END,
  })
  
  .addEdge("directorApproval", END);

const checkpointer = new MemorySaver();

export const approvalSystem = graph.compile({ checkpointer });
```

**💡 流程图：**

```
                    START
                      │
                      ▼
              ┌───────────────┐
              │ routeByAmount │
              └───────┬───────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
   < ¥1,000      ¥1K-¥10K       ≥ ¥10K
        │             │             │
        ▼             ▼             │
 ┌────────────┐ ┌───────────────┐  │
 │ autoApprove│ │managerApproval│◄─┘
 └─────┬──────┘ └───────┬───────┘
       │                │
       │         ┌──────┴──────┐
       │         │             │
       │    通过 & ≥¥10K   拒绝或 <¥10K
       │         │             │
       │         ▼             │
       │  ┌───────────────┐    │
       │  │financeApproval│    │
       │  └───────┬───────┘    │
       │          │            │
       │    ┌─────┴─────┐      │
       │    │           │      │
       │ 通过 & ≥¥50K  其他    │
       │    │           │      │
       │    ▼           │      │
       │ ┌────────────┐ │      │
       │ │directorApp │ │      │
       │ └─────┬──────┘ │      │
       │       │        │      │
       ▼       ▼        ▼      ▼
      ───────────────────────────
                  END
```

---

## 第四步：入口文件

### src/index.ts

```typescript
import { approvalSystem } from "./graph.js";
import { Command } from "@langchain/langgraph";
import { ApprovalRequest } from "./state.js";

function generateRequestId(): string {
  return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function submitApproval(request: Omit<ApprovalRequest, "id" | "createdAt">) {
  const fullRequest: ApprovalRequest = {
    ...request,
    id: generateRequestId(),
    createdAt: new Date().toISOString(),
  };

  const config = {
    configurable: {
      thread_id: fullRequest.id,
    },
  };

  console.log("\n" + "=".repeat(60));
  console.log("📋 新审批请求");
  console.log("=".repeat(60));
  console.log(`   ID: ${fullRequest.id}`);
  console.log(`   申请人: ${fullRequest.applicant}`);
  console.log(`   部门: ${fullRequest.department}`);
  console.log(`   金额: ¥${fullRequest.amount.toLocaleString()}`);
  console.log(`   原因: ${fullRequest.reason}`);
  console.log("=".repeat(60));

  let result = await approvalSystem.invoke(
    { request: fullRequest },
    config
  );

  while (true) {
    const state = await approvalSystem.getState(config);
    
    if (!state.next || state.next.length === 0) {
      break;
    }

    const interruptValue = state.tasks?.[0]?.interrupts?.[0]?.value;
    if (!interruptValue) {
      break;
    }

    console.log("\n⏸️  等待审批...");
    console.log(`   类型: ${interruptValue.type}`);
    console.log(`   消息: ${interruptValue.message}`);

    const decision = await simulateHumanDecision(interruptValue);
    
    result = await approvalSystem.invoke(
      new Command({ resume: decision }),
      config
    );
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 审批结果");
  console.log("=".repeat(60));
  console.log(`   状态: ${result.status}`);
  console.log(`   结果: ${result.result?.message}`);
  if (result.result?.approvedBy) {
    console.log(`   审批人: ${result.result.approvedBy.join(" → ")}`);
  }
  console.log("\n📜 审批日志:");
  result.logs.forEach((log: any, i: number) => {
    const icon = log.action === "approved" ? "✅" : "❌";
    console.log(`   ${i + 1}. ${icon} [${log.level}] ${log.approver}: ${log.comment || log.action}`);
  });
  console.log("=".repeat(60));

  return result;
}

async function simulateHumanDecision(interruptValue: any): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const approvers: Record<string, string> = {
    manager_approval: "张经理",
    finance_approval: "李财务",
    director_approval: "王总监",
  };

  const approver = approvers[interruptValue.type] || "审批人";
  const shouldApprove = Math.random() > 0.2;

  return {
    action: shouldApprove ? "approve" : "reject",
    approver,
    comment: shouldApprove 
      ? "符合公司规定，同意审批" 
      : "金额超出预算，建议调整后重新提交",
  };
}

async function main() {
  console.log("🚀 智能审批系统演示\n");

  console.log("\n【测试1】小额申请 - 自动审批");
  await submitApproval({
    applicant: "小明",
    amount: 500,
    reason: "购买办公用品",
    department: "技术部",
  });

  console.log("\n\n【测试2】中额申请 - 主管审批");
  await submitApproval({
    applicant: "小红",
    amount: 5000,
    reason: "团队建设活动经费",
    department: "市场部",
  });

  console.log("\n\n【测试3】大额申请 - 多级审批");
  await submitApproval({
    applicant: "小李",
    amount: 30000,
    reason: "采购新服务器设备",
    department: "运维部",
  });

  console.log("\n\n【测试4】超大额申请 - 需要总监审批");
  await submitApproval({
    applicant: "小王",
    amount: 80000,
    reason: "年度软件许可证续费",
    department: "研发部",
  });
}

main().catch(console.error);
```

---

## 第五步：运行测试

```bash
npm install

npm run dev
```

### 预期输出

```
🚀 智能审批系统演示


【测试1】小额申请 - 自动审批

============================================================
📋 新审批请求
============================================================
   ID: REQ-1708xxx-abc123
   申请人: 小明
   部门: 技术部
   金额: ¥500
   原因: 购买办公用品
============================================================

🤖 自动审批: 金额 ¥500 低于 ¥1000，自动通过

============================================================
📊 审批结果
============================================================
   状态: approved
   结果: 审批通过（自动）
   审批人: System

📜 审批日志:
   1. ✅ [auto] System: 金额低于阈值，自动通过
============================================================


【测试2】中额申请 - 主管审批

============================================================
📋 新审批请求
============================================================
   ID: REQ-1708xxx-def456
   申请人: 小红
   部门: 市场部
   金额: ¥5,000
   原因: 团队建设活动经费
============================================================

👨‍💼 主管审批节点
   申请人: 小红
   金额: ¥5000
   原因: 团队建设活动经费

⏸️  等待审批...
   类型: manager_approval
   消息: 请主管审批此申请

   ✅ 主管 张经理 已通过

============================================================
📊 审批结果
============================================================
   状态: approved
   结果: 审批通过（主管）
   审批人: 张经理

📜 审批日志:
   1. ✅ [manager] 张经理: 符合公司规定，同意审批
============================================================
```

---

## 进阶功能：真实人工审批

### 交互式审批版本

```typescript
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function realHumanDecision(interruptValue: any): Promise<any> {
  return new Promise((resolve) => {
    console.log("\n" + "-".repeat(40));
    console.log("🔔 需要人工审批");
    console.log("-".repeat(40));
    console.log(`申请人: ${interruptValue.request.applicant}`);
    console.log(`金额: ¥${interruptValue.request.amount}`);
    console.log(`原因: ${interruptValue.request.reason}`);
    console.log("-".repeat(40));

    rl.question("请输入审批人姓名: ", (approver) => {
      rl.question("是否通过? (y/n): ", (answer) => {
        rl.question("审批意见: ", (comment) => {
          resolve({
            action: answer.toLowerCase() === "y" ? "approve" : "reject",
            approver: approver || "匿名审批人",
            comment: comment || undefined,
          });
        });
      });
    });
  });
}
```

---

## 进阶功能：状态回退（时间旅行）

### 实现驳回后重新提交

```typescript
async function resubmitAfterRejection(threadId: string, newAmount: number) {
  const config = { configurable: { thread_id: threadId } };
  
  const history = await approvalSystem.getStateHistory(config);
  
  let initialCheckpoint = null;
  for await (const checkpoint of history) {
    if (checkpoint.values.status === "pending") {
      initialCheckpoint = checkpoint;
    }
  }
  
  if (!initialCheckpoint) {
    console.log("找不到初始状态，无法重新提交");
    return;
  }
  
  await approvalSystem.updateState(
    config,
    {
      request: {
        ...initialCheckpoint.values.request,
        amount: newAmount,
      },
      status: "pending",
      logs: [],
      result: null,
    },
    initialCheckpoint.config.configurable?.checkpoint_id
  );
  
  console.log(`\n♻️ 已重新提交，新金额: ¥${newAmount}`);
  
  const result = await approvalSystem.invoke(null, config);
  return result;
}
```

---

## 项目总结

### 核心实现

| 功能 | 实现方式 |
|------|----------|
| 条件路由 | `addConditionalEdges` + 路由函数 |
| 人工审批 | `interrupt()` 暂停 + `Command({ resume })` 恢复 |
| 多级审批 | 链式节点 + 条件流转 |
| 审批日志 | `logs` 状态字段（追加 reducer） |
| 状态回退 | `getStateHistory` + `updateState` |

### 审批流程对照

| 金额范围 | 审批流程 |
|----------|----------|
| < ¥1,000 | 自动审批 |
| ¥1,000 - ¥9,999 | 主管审批 |
| ¥10,000 - ¥49,999 | 主管 → 财务 |
| ≥ ¥50,000 | 主管 → 财务 → 总监 |

### 关键代码模式

**interrupt() 模式：**
```typescript
const decision = interrupt({
  type: "approval_type",
  message: "审批提示",
  request: state.request,
});

const { action, approver, comment } = decision;
```

**Command({ resume }) 模式：**
```typescript
const result = await graph.invoke(
  new Command({ 
    resume: { action: "approve", approver: "张三" } 
  }),
  config
);
```

---

## 核心要点回顾

1. **条件路由实现分流** —— `addConditionalEdges` 根据金额分配审批流程
2. **interrupt() 实现人机协作** —— 暂停图执行等待人工决策
3. **Command({ resume }) 恢复执行** —— 传入审批决策继续流程
4. **日志追加模式记录历史** —— reducer 使用追加策略
5. **时间旅行支持回退** —— `getStateHistory` 获取历史状态

---

## 下一步

继续学习下一个项目：**并行数据处理器**，学习并行化模式和 Durable Execution 的实战应用。
