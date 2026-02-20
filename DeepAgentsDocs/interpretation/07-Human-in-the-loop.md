# Deep Agents Human-in-the-loop 深度解读

> 原文档：Human-in-the-loop - Learn how to configure human approval for sensitive tool operations

---

## 1. 一句话省流 (The Essence)

**Human-in-the-loop（人机协作）就是给 AI 装一个"确认对话框"——在 AI 执行敏感操作之前，先暂停下来问问你："老板，这事儿我能干吗？"**

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：AI 太"自信"可能会闯祸

想象一下这个场景：你让 AI 助手帮你整理文件夹，结果它一个 `rm -rf` 把你的重要文件全删了，你连说"不"的机会都没有。

没有人机协作机制时，会遇到这些倒霉事：

| 问题 | 后果 |
|------|------|
| AI 删除重要文件 | 数据丢失，哭都来不及 |
| AI 自动发送邮件 | 发错人、内容不当，社死现场 |
| AI 执行数据库操作 | 误删数据，老板请你喝茶 |
| AI 调用付费 API | 账单爆炸，钱包流泪 |

### 解决方案：在关键节点设置"人工关卡"

Human-in-the-loop 让你可以：
- **定义哪些工具需要审批**（比如删除文件要审批，读取文件不用）
- **控制审批选项**（批准/修改/拒绝）
- **在 AI 执行前介入**，修改参数或直接拒绝

---

## 3. 生活化/职场类比 (The Analogy)

### 把 AI Agent 想象成一个"实习生"

想象你是一家公司的部门主管，你招了一个超级聪明但刚入职的实习生（AI Agent）。

| 技术概念 | 类比角色 | 说明 |
|---------|---------|------|
| **Agent** | 实习生 | 能干活，但需要监督 |
| **Tools** | 实习生的权限 | 有些事能直接做，有些事得请示 |
| **interrupt_on** | 审批流程配置 | 规定哪些事需要请示领导 |
| **Checkpointer** | 工作进度存档 | 记住干到哪了，等批复后继续 |
| **approve** | 领导说"可以" | 按原计划执行 |
| **edit** | 领导说"改一下" | 调整方案后执行 |
| **reject** | 领导说"不行" | 取消这个操作 |

**完整的工作流程是这样的：**

```
实习生(Agent): "老板，我要删除 temp.txt 文件"
     ↓
系统检查: 这个操作需要审批吗？
     ↓
[如果需要] → 暂停，等待老板批复
     ↓
老板(Human): 
  - "批准" → 删！
  - "改一下，删 temp2.txt" → 改后再删！  
  - "拒绝" → 别删了，继续干别的活
```

### 为什么需要 Checkpointer（存档机制）？

还是用实习生的例子：

如果实习生问你"能删这个文件吗"，然后你去开了个会，等你回来时，实习生已经忘了刚才在做什么了——这就很尴尬。

**Checkpointer 就像实习生的工作笔记本**：
- 记录"我正在等老板批复删除文件这件事"
- 等老板回复后，翻开笔记本就知道接下来该做什么

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 interrupt_on（中断配置）

**白话**：告诉 AI "执行这些工具之前，必须先来问我"

```typescript
interrupt_on: {
  "delete_file": true,        // 删文件？先问我！
  "read_file": false,         // 读文件？直接读，不用问
  "send_email": { ... }       // 发邮件？有条件地问
}
```

### 4.2 allowed_decisions（允许的决策类型）

**白话**：规定你作为老板能做什么选择

| 决策类型 | 含义 | 使用场景 |
|---------|------|---------|
| `approve` | "可以，就这么干" | 方案没问题 |
| `edit` | "改一下参数再干" | 方向对，细节要调整 |
| `reject` | "别干了，跳过" | 这事不该做 |

### 4.3 \_\_interrupt\_\_（中断信号）

**白话**：AI 返回的结果里如果有这个字段，说明它正在"举手等批复"

```typescript
if (result.__interrupt__) {
  // AI 在等你批复，不是干完活了
}
```

### 4.4 Command({ resume: ... })（恢复指令）

**白话**：你给出批复后，用这个指令让 AI 继续工作

```typescript
// 告诉 AI：我批准了，继续干吧
await agent.invoke(new Command({ resume: { decisions } }), config);
```

### 4.5 thread_id（线程 ID）

**白话**：每次对话的"会话编号"，恢复时必须用同一个编号，否则 AI 不知道你批的是哪件事

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 5.1 基础配置：给 AI 设置审批规则

```python
agent = create_deep_agent(
    model="claude-sonnet-4-5-20250929",
    tools=[delete_file, read_file, send_email],
    interrupt_on={
        "delete_file": True,   # 删文件：所有选项都开放
        "read_file": False,    # 读文件：直接执行，不问
        "send_email": {"allowed_decisions": ["approve", "reject"]},  # 发邮件：只能批准或拒绝，不能改
    },
    checkpointer=checkpointer  # 必须有存档器！
)
```

**这段代码在说什么：**

"我创建了一个 AI 助手，它有三个技能（删文件、读文件、发邮件）。其中：
- 删文件是高危操作，要完整审批
- 读文件没风险，随便执行
- 发邮件有风险，但邮件内容我不想让你改（可能怕 AI 自作聪明改了收件人），只能选批准或拒绝"

### 5.2 处理中断：当 AI 来问你时

```typescript
// 第一步：发起请求
let result = await agent.invoke({
  messages: [{ role: "user", content: "Delete the file temp.txt" }],
}, config);

// 第二步：检查是不是在等批复
if (result.__interrupt__) {
  // AI 说："老板，我想删 temp.txt，您看行不？"
  
  const interrupts = result.__interrupt__[0].value;
  const actionRequests = interrupts.actionRequests;  // 要做什么
  
  // 你的批复
  const decisions = [{ type: "approve" }];  // "可以，删吧"
  
  // 第三步：告诉 AI 你的决定
  result = await agent.invoke(
    new Command({ resume: { decisions } }),
    config  // 注意：必须用同一个 config！
  );
}
```

**这段代码的完整故事：**

1. 你跟 AI 说"删掉 temp.txt"
2. AI 发现删文件需要审批，于是暂停并返回一个带 `__interrupt__` 的结果
3. 你检查到有中断，看了看 AI 要干什么
4. 你决定批准，发送 `{ type: "approve" }`
5. AI 收到批复，继续执行删除操作

### 5.3 批量审批：一次批多个操作

```typescript
// 你说："删掉 temp.txt，然后发邮件给 admin"
// AI 想做两件事，都需要审批

const decisions = [
  { type: "approve" },  // 第一件：删文件 → 批准
  { type: "reject" }    // 第二件：发邮件 → 拒绝
];
```

**重点**：批复的顺序必须和 AI 请求的顺序一致！第一个 decision 对应第一个请求的工具。

### 5.4 修改参数：不只是批准，还能改

```typescript
const decisions = [{
  type: "edit",
  editedAction: {
    name: "send_email",
    args: { 
      to: "team@company.com",  // 原来是 everyone@company.com，改成团队邮箱
      subject: "重要通知", 
      body: "..." 
    }
  }
}];
```

**场景**：AI 想发邮件给全公司，你觉得范围太大，改成只发给团队。

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：企业级 AI 运维助手

假设你在开发一个**服务器运维 AI 助手**，它可以帮运维人员执行各种操作。

**工具清单**：

| 工具 | 风险等级 | 审批配置 |
|------|---------|---------|
| `check_server_status` | 低 | 无需审批 |
| `view_logs` | 低 | 无需审批 |
| `restart_service` | 中 | 需审批（批准/拒绝） |
| `delete_old_logs` | 中 | 需审批（批准/修改/拒绝） |
| `shutdown_server` | 高 | 必须审批 + 只能批准 |

**配置代码**：

```typescript
const agent = createDeepAgent({
  tools: [
    checkServerStatus, 
    viewLogs, 
    restartService, 
    deleteOldLogs, 
    shutdownServer
  ],
  interruptOn: {
    "check_server_status": false,
    "view_logs": false,
    "restart_service": { allowedDecisions: ["approve", "reject"] },
    "delete_old_logs": { allowedDecisions: ["approve", "edit", "reject"] },
    "shutdown_server": { allowedDecisions: ["approve"] },  // 只能批准，确保不会误操作
  },
  checkpointer
});
```

**实际工作流程**：

```
运维人员: "帮我清理一下 7 天前的日志，然后重启 web 服务"

AI: 
  1. [查看日志] → 直接执行，发现有 500MB 日志
  2. [删除旧日志] → 暂停，请求审批
     "我要删除 /var/log/app/*.log 中 7 天前的文件，共 500MB，确定吗？"

运维人员: 
  - "批准" → 删除日志
  - "修改" → 改成删除 30 天前的 → 执行修改后的命令
  - "拒绝" → 跳过删除，继续下一步

  3. [重启服务] → 暂停，请求审批
     "我要重启 web-service，会导致约 30 秒的服务中断，确定吗？"

运维人员: "批准"

AI: 完成！日志已清理，服务已重启。
```

**使用 Human-in-the-loop 的收益**：

| 方面 | 没有人机协作 | 有人机协作 |
|-----|-------------|-----------|
| 安全性 | AI 可能误删重要日志 | 关键操作必须人工确认 |
| 可控性 | 执行后才发现问题 | 执行前可以修改参数 |
| 审计 | 不知道 AI 具体做了什么 | 每个敏感操作都有记录 |
| 灵活性 | 要么全自动要么全手动 | 按风险等级精细控制 |

---

## 7. 子 Agent 的人机协作 (Subagent Interrupts)

### 场景：主管 Agent 管理多个专业 Agent

```
主 Agent（项目经理）
    ├── 文件管理 Agent（文件专员）
    ├── 邮件 Agent（行政助理）
    └── 数据库 Agent（DBA）
```

**关键点**：每个子 Agent 可以有自己的审批规则！

```typescript
const agent = createDeepAgent({
  interruptOn: {
    delete_file: true,   // 主 Agent：删文件要审批
    read_file: false,    // 主 Agent：读文件不用
  },
  subagents: [{
    name: "file-manager",
    tools: [deleteFile, readFile],
    interruptOn: {
      delete_file: true,
      read_file: true,   // 子 Agent：读文件也要审批（可能因为处理敏感文件）
    }
  }],
});
```

**类比**：就像公司里不同部门有不同的审批流程——财务部花 100 块都要批，市场部花 1000 块才要批。

---

## 8. 最佳实践清单

| 要点 | 说明 | 后果 |
|------|------|------|
| **必须使用 Checkpointer** | 用于保存中断时的状态 | 没有会导致恢复失败 |
| **使用相同的 thread_id** | 中断和恢复必须是同一个会话 | 不同会导致 AI 不知道你在批什么 |
| **决策顺序要匹配** | decisions 数组顺序必须和 actionRequests 一致 | 顺序错了会批错操作 |
| **按风险配置** | 高风险操作严格审批，低风险操作放行 | 平衡效率和安全 |

---

## 9. 核心流程图

```
用户发出请求
     ↓
Agent 开始执行
     ↓
执行到某个工具 ──→ 检查 interrupt_on 配置
                        ↓
              ┌─────────┴─────────┐
              ↓                   ↓
         不需要审批            需要审批
              ↓                   ↓
         直接执行            暂停，返回 __interrupt__
              ↓                   ↓
              ↓              等待人类决策
              ↓                   ↓
              ↓         ┌────────┼────────┐
              ↓         ↓        ↓        ↓
              ↓      approve    edit    reject
              ↓         ↓        ↓        ↓
              ↓      原参数执行  改参数执行  跳过此操作
              ↓         ↓        ↓        ↓
              └─────────┴────────┴────────┘
                              ↓
                     继续执行下一步
```

---

## 10. 总结

Human-in-the-loop 就是给 AI 加了一个"安全带"——让 AI 在关键时刻必须"请示"人类。它解决了 AI 自动化带来的安全和可控性问题，让你能够：

1. **精细控制**：哪些操作需要审批，哪些不用
2. **灵活干预**：不仅能批准/拒绝，还能修改参数
3. **层级管理**：主 Agent 和子 Agent 可以有不同的审批规则
4. **状态保持**：通过 Checkpointer 确保中断后能正确恢复

记住核心公式：

> **安全的 AI = 自动化 + 关键节点的人工干预**

---

*解读完成于 2026-02-20*
