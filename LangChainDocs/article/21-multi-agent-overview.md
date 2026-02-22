# 21. 多代理系统概述：当一个 Agent 不够用时

## 简单来说

想象你是一家创业公司的 CEO。刚开始，你一个人干所有事：写代码、做销售、搞财务、修 Bug。但公司做大了，你会发现：

- **一个人忙不过来** —— 任务太多，需要同时处理
- **术业有专攻** —— 法务问题找专业律师，财务问题找专业会计
- **复杂任务需要协作** —— 一个大项目需要多个人分工合作

AI Agent 也是一样。当任务复杂到一定程度，一个 Agent 就不够用了 —— 你需要**多个 Agent 协作**。

LangChain 提供了 5 种多代理协作模式，就像公司管理的 5 种组织架构：

| 模式 | 类比 | 适用场景 |
|------|------|----------|
| **Subagents** | CEO + 各部门经理 | 复杂任务需要协调多个专家 |
| **Handoffs** | 客服转接专员 | 对话中需要切换专家 |
| **Skills** | 员工学习新技能 | 单个 Agent 需要多种专业能力 |
| **Router** | 前台分流客户 | 不同问题分给不同处理人 |
| **Custom Workflow** | 自定义业务流程 | 标准模式都不满足需求 |

## 本节目标

1. 理解为什么需要多代理系统
2. 掌握 5 种模式的核心特点和适用场景
3. 学会如何选择合适的模式
4. 了解不同模式的性能对比

## 业务场景

假设你要构建一个**企业级智能助手**，需要：

1. 回答技术问题（需要查代码库）
2. 回答业务问题（需要查业务文档）
3. 处理报销审批（需要调用财务系统）
4. 帮助写代码（需要代码生成能力）

用一个 Agent 做所有事情会遇到什么问题？

```typescript
const superAgent = createAgent({
  model: "gpt-4.1",
  tools: [
    searchCodeTool,      // 搜索代码
    searchDocsTool,      // 搜索文档
    approveExpenseTool,  // 审批报销
    generateCodeTool,    // 生成代码
    // ... 还有几十个工具
  ],
  systemPrompt: `你是一个全能助手，需要：
    1. 熟悉所有代码库的架构和实现
    2. 了解所有业务流程和规范
    3. 掌握财务审批的所有规则
    4. 精通多种编程语言
    // ... 几千字的提示词
  `
});
```

这个"超级 Agent"会遇到三个致命问题：

1. **Token 爆炸** —— 系统提示词太长，每次调用都浪费大量 Token
2. **能力退化** —— 要求太多，每个能力都做不精
3. **维护噩梦** —— 修改一个功能可能影响其他功能

## 5 种多代理模式详解

### 模式 1：Subagents（子代理模式）

**类比**：CEO 把任务分配给各部门经理，经理完成后汇报结果

```
用户 → 主 Agent → 子 Agent A → 结果
              → 子 Agent B → 结果
              → 子 Agent C → 结果
         ← 汇总结果
```

**核心特点**：
- 主 Agent 负责理解任务、分配工作、汇总结果
- 子 Agent 专注于各自领域
- 子 Agent 之间相互独立，不直接通信

**适用场景**：
- 需要协调多个专家完成复杂任务
- 不同子任务可以并行执行
- 需要明确的任务分解和结果汇总

### 模式 2：Handoffs（交接模式）

**类比**：客服热线 —— "这个问题我处理不了，帮您转接专业客服"

```
用户 → Agent A → "我来处理..."
            → "这个问题需要专家，转接中..."
            → Agent B → "我是专家，来帮您..."
```

**核心特点**：
- 对话过程中动态切换 Agent
- 切换时保持上下文连续
- 用户感知是在和一个助手对话

**适用场景**：
- 对话中用户需求发生变化
- 需要专家介入但不想中断对话
- 客服场景的专员转接

### 模式 3：Skills（技能模式）

**类比**：员工学习新技能 —— "我需要 SQL 知识，让我查一下手册"

```
用户 → Agent → "这个问题需要 SQL 技能"
          → 加载 SQL 技能提示词
          → 用新能力回答问题
```

**核心特点**：
- 单个 Agent 通过加载技能扩展能力
- 技能是预定义的提示词和知识
- 渐进式披露，按需加载

**适用场景**：
- 单个 Agent 需要多种专业能力
- 不同团队独立开发维护技能
- 想要轻量级的能力扩展

### 模式 4：Router（路由模式）

**类比**：医院前台分诊 —— "发烧请去内科，骨折请去骨科"

```
用户请求 → 路由器 → 分析问题类型
                → Agent A（代码问题）
                → Agent B（文档问题）
                → Agent C（财务问题）
         ← 返回结果
```

**核心特点**：
- 有一个专门的路由步骤
- 路由后直接执行，不需要复杂协调
- 可以并行分发到多个 Agent

**适用场景**：
- 问题类型明确，可以清晰分类
- 不同类型需要不同的专业处理
- 想要高效的预处理分发

### 模式 5：Custom Workflow（自定义工作流）

**类比**：设计自己的业务流程 —— 完全自主控制每个步骤

```
输入 → 条件判断 → 路径 A → 确定性步骤 → 输出
              → 路径 B → Agent 步骤 → 输出
```

**核心特点**：
- 完全控制执行流程
- 可以混合确定性逻辑和 Agent 行为
- 可以嵌套其他模式

**适用场景**：
- 标准模式无法满足需求
- 需要复杂的条件分支
- 需要混合自动和手动步骤

## 如何选择合适的模式？

这是一个决策矩阵，帮你快速选择：

| 考虑因素 | Subagents | Handoffs | Skills | Router |
|---------|-----------|----------|--------|--------|
| 分布式开发 | ✅ | ✅ | ✅ | ✅ |
| 并行执行 | ✅ | ❌ | ❌ | ✅ |
| 多轮复杂任务 | ✅ | ✅ | ❌ | ❌ |
| 直接用户交互 | ❌ | ✅ | ❌ | ❌ |

**具体建议**：

1. **需要并行处理多个子任务？** → **Subagents** 或 **Router**
2. **对话中需要专家介入？** → **Handoffs**
3. **单 Agent 需要多种能力但不复杂？** → **Skills**
4. **问题类型清晰，分类后直接处理？** → **Router**
5. **以上都不满足？** → **Custom Workflow**

## 性能对比

不同模式在不同场景下的性能差异显著：

### 场景 1：一次性任务（One-shot）

用户问一个问题，Agent 直接回答。

| 模式 | 模型调用次数 | Token 消耗 |
|------|-------------|-----------|
| Skills | 2 | 低 |
| Handoffs | 3 | 中 |
| Subagents | 4 | 高 |
| Router | 4 | 高 |

**结论**：简单任务用 Skills 最高效

### 场景 2：重复请求（Repeat Request）

用户连续问多个同类型问题。

| 模式 | 模型调用次数 | Token 消耗 |
|------|-------------|-----------|
| Skills | 4 | 低 |
| Handoffs | 6 | 中 |
| Subagents | 8 | 高 |
| Router | 8 | 高 |

**结论**：同类型问题用 Skills 或 Handoffs

### 场景 3：多领域任务（Multi-domain）

用户问的问题涉及多个专业领域。

| 模式 | 模型调用次数 | Token 消耗 | 特点 |
|------|-------------|-----------|------|
| Subagents | 4 | 高 | ⚡ 可并行 |
| Router | 4 | 高 | ⚡ 可并行 |
| Skills | 6 | 中 | 串行 |
| Handoffs | 7 | 中 | 串行 |

**结论**：多领域任务用 Subagents 或 Router（可并行）

## 代码结构预览

接下来几篇文章会详细介绍每种模式的实现。这里先预览一下代码结构：

### Subagents 模式结构

```typescript
// 子 Agent 定义
const researchAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchTool],
  systemPrompt: "你是研究专家..."
});

// 将子 Agent 包装成工具
const callResearch = tool(
  async ({ query }) => {
    const result = await researchAgent.invoke({
      messages: [{ role: "user", content: query }]
    });
    return result.messages.at(-1)?.content;
  },
  {
    name: "research",
    description: "调用研究专家",
    schema: z.object({ query: z.string() })
  }
);

// 主 Agent 使用子 Agent
const mainAgent = createAgent({
  model: "gpt-4.1",
  tools: [callResearch, callCodeReview, callWriting]
});
```

### Handoffs 模式结构

```typescript
// 转接工具
const transferToSpecialist = tool(
  async (_, config) => {
    return new Command({
      update: {
        messages: [new ToolMessage({
          content: "已转接到专家",
          tool_call_id: config.toolCallId
        })],
        currentAgent: "specialist"
      }
    });
  },
  { name: "transfer_to_specialist", ... }
);

// 根据状态选择 Agent
const selectAgent = (state) => {
  return state.currentAgent === "specialist" 
    ? specialistAgent 
    : generalAgent;
};
```

### Skills 模式结构

```typescript
// 技能加载工具
const loadSkill = tool(
  async ({ skillName }) => {
    const skillPrompt = await loadSkillFromDB(skillName);
    return skillPrompt;
  },
  {
    name: "load_skill",
    description: `加载专业技能。可用技能：
      - write_sql: SQL 编写专家
      - review_code: 代码审查专家`,
    schema: z.object({ skillName: z.string() })
  }
);
```

### Router 模式结构

```typescript
// 路由函数
function routeQuery(state) {
  const classification = classifyQuery(state.query);
  
  // 单一路由
  return new Command({ goto: classification.agent });
  
  // 或并行路由
  return classifications.map(c => new Send(c.agent, { query: c.query }));
}

// 构建工作流
const workflow = new StateGraph(State)
  .addNode("router", routeQuery)
  .addNode("codeAgent", codeAgentNode)
  .addNode("docsAgent", docsAgentNode)
  .addEdge(START, "router")
  .compile();
```

## 本章小结

多代理系统是构建复杂 AI 应用的关键架构。核心要点：

1. **5 种模式各有特点**：
   - Subagents —— CEO 管理经理，适合协调复杂任务
   - Handoffs —— 客服转接，适合对话中切换专家
   - Skills —— 学习技能，适合单 Agent 扩展能力
   - Router —— 前台分流，适合清晰的问题分类
   - Custom Workflow —— 自定义流程，适合特殊需求

2. **选择依据**：
   - 是否需要并行？→ Subagents/Router
   - 是否需要对话交接？→ Handoffs
   - 是否轻量扩展？→ Skills
   - 都不满足？→ Custom Workflow

3. **性能考虑**：
   - 简单任务：Skills 最高效
   - 多领域任务：Subagents/Router 可并行

下一篇我们详细介绍 **Subagents 模式** —— 最强大的多代理协作方式。
