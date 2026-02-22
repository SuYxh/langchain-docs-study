# 31. 项目实战：智能客服系统

## 项目概述

### 简单来说

构建一个企业级智能客服系统，用户只需描述问题，系统就能自动：
- 在知识库中检索答案（RAG）
- 根据问题类型转接给专业客服（Handoffs）
- 敏感操作需要人工确认（HITL）
- 拦截违规/危险操作（护栏）

### 核心功能

| 功能 | 描述 |
|------|------|
| FAQ 自动回答 | 基于知识库的 RAG 检索，自动回答常见问题 |
| 专家路由转接 | 技术问题转技术专家，售后问题转售后专员 |
| 敏感操作拦截 | 退款、删除账户等操作需要人工审批 |
| 违规内容过滤 | 辱骂、诈骗、敏感词等内容自动拦截 |
| 多轮对话 | 保持上下文，支持追问和澄清 |
| 会话记录 | 保存完整对话历史，支持回溯和分析 |

### 技术亮点

```
┌─────────────────────────────────────────────────────────────────┐
│                 智能客服系统技术架构                              │
├─────────────────────────────────────────────────────────────────┤
│  前端：React 18 + TypeScript + Ant Design + Zustand             │
│  后端：Express + Prisma + MySQL + Redis                         │
│  AI：LangChain 1.x + RAG + Handoffs + HITL + 护栏               │
│  向量库：Chroma / Pinecone                                       │
│  消息队列：Redis Pub/Sub（人工审批通知）                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 一、系统架构

### 1.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               前端层                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  用户聊天  │  │  工单管理  │  │  知识库   │  │  审批中心  │  │  数据统计  │      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘      │
│       └──────────────┴──────────────┴──────────────┴──────────────┘          │
│                                     │                                        │
│                              ┌──────┴───────┐                                │
│                              │ Zustand Store │  ← 状态管理                    │
│                              └──────┬────────┘                                │
└─────────────────────────────────────┼────────────────────────────────────────┘
                                      │ HTTP/WebSocket
┌─────────────────────────────────────┼────────────────────────────────────────┐
│                                     ▼              后端层                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         Express API Server                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │ /chat    │  │ /tickets │  │ /knowledge│  │ /approval│              │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘              │  │
│  └───────┼──────────────┼──────────────┼──────────────┼──────────────────┘  │
│          │              │              │              │                      │
│  ┌───────┴──────────────┴──────────────┴──────────────┴──────────────────┐  │
│  │                         Service Layer                                 │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐     │  │
│  │  │ ChatService │ │TicketService│ │ RAGService  │ │ApprovalService│    │  │
│  │  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘     │  │
│  └─────────┼───────────────┼───────────────┼───────────────┼────────────┘  │
│            │               │               │               │               │
│  ┌─────────┴───────────────┴───────────────┴───────────────┴────────────┐  │
│  │                     AI Agent Layer (核心)                             │  │
│  │                                                                       │  │
│  │  ╔═══════════════════════════════════════════════════════════════╗  │  │
│  │  ║                    护栏层 (Guardrails)                         ║  │  │
│  │  ║   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            ║  │  │
│  │  ║   │输入验证  │ │敏感词过滤│ │意图检测  │ │输出审核  │            ║  │  │
│  │  ║   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘            ║  │  │
│  │  ╚════════╪══════════╪══════════╪══════════╪═══════════════════╝  │  │
│  │           │          │          │          │                       │  │
│  │  ┌────────┴──────────┴──────────┴──────────┴────────────────────┐ │  │
│  │  │               CustomerServiceGraph (LangGraph)               │ │  │
│  │  │                                                              │ │  │
│  │  │   ┌──────────────────────────────────────────────────────┐  │ │  │
│  │  │   │              General Agent (通用客服)                  │  │ │  │
│  │  │   │                                                      │  │ │  │
│  │  │   │  分析用户问题 → 决定处理方式：                         │  │ │  │
│  │  │   │  ┌────────────┬────────────┬────────────┐            │  │ │  │
│  │  │   │  │ 知识库检索  │ 专家转接   │ 人工审批    │            │  │ │  │
│  │  │   │  │   (RAG)    │ (Handoffs) │  (HITL)    │            │  │ │  │
│  │  │   │  └─────┬──────┴─────┬──────┴─────┬──────┘            │  │ │  │
│  │  │   └────────┼────────────┼────────────┼───────────────────┘  │ │  │
│  │  │            ▼            ▼            ▼                      │ │  │
│  │  │   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │ │  │
│  │  │   │  RAG Agent   │ │ Expert Agent │ │ Human Agent  │       │ │  │
│  │  │   │  知识库检索   │ │ 专家处理     │ │ 等待人工审批  │       │ │  │
│  │  │   └──────────────┘ └──────────────┘ └──────────────┘       │ │  │
│  │  │            │            │                  │                │ │  │
│  │  │            │  Handoffs  │                  │                │ │  │
│  │  │            │  ┌─────────┴─────────┐        │                │ │  │
│  │  │            │  ▼                   ▼        │                │ │  │
│  │  │     ┌──────────────┐       ┌──────────────┐│                │ │  │
│  │  │     │ Tech Expert  │       │ Sales Expert ││                │ │  │
│  │  │     │  技术专家     │       │  售后专员    ││                │ │  │
│  │  │     └──────────────┘       └──────────────┘│                │ │  │
│  │  └────────────────────────────────────────────┼────────────────┘ │  │
│  └───────────────────────────────────────────────┼──────────────────┘  │
└──────────────────────────────────────────────────┼──────────────────────┘
                                                   │
┌──────────────────────────────────────────────────┼──────────────────────┐
│                                                  ▼    数据层            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│  │    MySQL     │  │   Chroma     │  │    Redis     │  │   文件存储    ││
│  │   (Prisma)   │  │  (向量库)    │  │   (缓存)     │  │  (知识库)    ││
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 核心概念解析

#### 什么是 Handoffs（交接）？

**Handoffs** 是 LangGraph 中的一种 Agent 协作模式，允许一个 Agent 将对话控制权"交接"给另一个 Agent。

```
用户: "我的订单一直显示配送中，已经超过预计时间了"
                    │
                    ▼
         ┌─────────────────────┐
         │   General Agent     │
         │  "这是物流问题，     │
         │   需要售后专员处理"  │
         └─────────┬───────────┘
                   │ Handoffs（交接）
                   ▼
         ┌─────────────────────┐
         │   Sales Expert      │
         │  "让我帮您查询物流   │
         │   状态和处理..."    │
         └─────────────────────┘
```

**关键点：**
- 通用客服分析问题类型，决定是否需要转接
- 转接时，对话上下文会完整传递给专家
- 专家处理完成后，可以交回通用客服

#### 什么是 HITL（Human-in-the-Loop）？

**HITL** 是指在 AI 系统的关键决策点引入人工审核。

```
用户: "我要申请退款 500 元"
                    │
                    ▼
         ┌─────────────────────┐
         │   General Agent     │
         │  "退款是敏感操作，   │
         │   需要人工审批"      │
         └─────────┬───────────┘
                   │ interrupt()
                   ▼
         ┌─────────────────────┐
         │   等待人工审批       │
         │   状态: pending      │
         │   ┌───────────────┐ │
         │   │ [同意] [拒绝] │ │
         │   └───────────────┘ │
         └─────────────────────┘
                   │
          人工点击 [同意]
                   │
                   ▼
         ┌─────────────────────┐
         │  "退款已批准，       │
         │   500元将退回..."    │
         └─────────────────────┘
```

**关键点：**
- 使用 LangGraph 的 `interrupt()` 函数暂停执行
- 前端展示审批界面给管理员
- 管理员操作后，使用 `Command.resume()` 继续执行

#### 什么是护栏（Guardrails）？

**护栏** 是保护 AI 系统安全的防护机制，包括输入验证、输出过滤等。

```
┌─────────────────────────────────────────────────────────────────┐
│                        护栏层 Guardrails                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  输入护栏（Input Guardrails）                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 用户输入 → 长度检查 → 敏感词过滤 → 注入攻击检测 → Agent   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  输出护栏（Output Guardrails）                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Agent → 事实检查 → 安全审核 → 格式验证 → 返回给用户        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  工具护栏（Tool Guardrails）                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 工具调用 → 参数验证 → 权限检查 → 频率限制 → 执行工具       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 二、架构模式详解

### 2.1 为什么选择 Handoffs 模式？

| 模式 | 优点 | 缺点 | 适用场景 |
|------|-----|------|---------|
| **Router** | 简单，一次决策 | 不支持专家间协作 | 简单分流场景 |
| **Subagents** | 主Agent完全控制 | 不适合对等协作 | 流水线任务 |
| **Handoffs** | 灵活交接，保持上下文 | 复杂度稍高 | **多专家协作场景** ✓ |

**客服场景特点：**
- 不同问题需要不同专家处理
- 专家之间可能需要互相转接（技术问题发现是售后问题）
- 每个专家都有完整的对话能力

```
┌─────────────────────────────────────────────────────────────────┐
│                   Handoffs 交接流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  用户: "我的电脑开机黑屏，要退货"                                │
│              │                                                   │
│              ▼                                                   │
│  ┌─────────────────────┐                                        │
│  │   General Agent     │  分析: 包含技术问题 + 售后诉求          │
│  │                     │  决定: 先交给技术专家排查               │
│  └─────────┬───────────┘                                        │
│            │ Handoffs to Tech Expert                            │
│            ▼                                                     │
│  ┌─────────────────────┐                                        │
│  │   Tech Expert       │  诊断: 可能是显卡问题                   │
│  │                     │  建议: 尝试外接显示器                   │
│  │                     │  结果: 用户仍要退货                     │
│  └─────────┬───────────┘                                        │
│            │ Handoffs to Sales Expert                           │
│            ▼                                                     │
│  ┌─────────────────────┐                                        │
│  │   Sales Expert      │  检查: 是否在退货期                     │
│  │                     │  操作: 创建退货工单                     │
│  │                     │  通知: 需要人工审批 (HITL)              │
│  └─────────────────────┘                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Agent 角色设计

```
┌─────────────────────────────────────────────────────────────────┐
│                      Agent 角色全景图                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    General Agent (通用客服)                 │ │
│  │                                                            │ │
│  │  职责：接待用户、分析问题、决定处理方式                      │ │
│  │  工具：RAG 检索、问题分类                                   │ │
│  │  能力：可以交接给任何专家，可以触发 HITL                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│         │                │                 │                     │
│    ┌────┴────┐      ┌────┴────┐       ┌────┴────┐               │
│    ▼         ▼      ▼         ▼       ▼         ▼               │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐          │
│  │ Tech Expert   │ │ Sales Expert  │ │ Human Agent   │          │
│  │   (技术专家)   │ │  (售后专员)   │ │  (人工审批)   │          │
│  ├───────────────┤ ├───────────────┤ ├───────────────┤          │
│  │ 职责：        │ │ 职责：        │ │ 职责：        │          │
│  │ - 技术问题诊断│ │ - 退换货处理  │ │ - 敏感操作审批│          │
│  │ - 故障排查   │ │ - 投诉处理    │ │ - 异常情况处理│          │
│  │ - 使用指导   │ │ - 优惠咨询    │ │ - 规则覆盖   │          │
│  │              │ │               │ │               │          │
│  │ 工具：       │ │ 工具：        │ │ 工具：        │          │
│  │ - 查产品手册 │ │ - 查订单状态  │ │ - 执行审批操作│          │
│  │ - 查故障库   │ │ - 查物流信息  │ │               │          │
│  │ - 远程诊断   │ │ - 创建工单    │ │               │          │
│  │              │ │ - 申请退款    │ │               │          │
│  └───────────────┘ └───────────────┘ └───────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 核心流程图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         智能客服系统完整流程                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  用户输入                                                                    │
│      │                                                                       │
│      ▼                                                                       │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                         输入护栏 (Input Guardrails)                    ║  │
│  ║   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐           ║  │
│  ║   │长度检查  │ →  │敏感词   │ →  │注入攻击  │ →  │意图预检  │           ║  │
│  ║   │≤1000字  │    │过滤     │    │检测     │    │         │           ║  │
│  ║   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘           ║  │
│  ╚════════╪═════════════╪═════════════╪═════════════╪════════════════════╝  │
│           │ 通过        │ 通过        │ 通过        │                        │
│           ▼             ▼             ▼             ▼                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     General Agent (通用客服)                         │    │
│  │                                                                     │    │
│  │   1. 分析用户意图                                                   │    │
│  │   2. 判断处理方式：                                                 │    │
│  │      ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │    │
│  │      │ RAG检索  │  │ 技术转接 │  │ 售后转接 │  │ 人工审批 │            │    │
│  │      └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘            │    │
│  └───────────┼────────────┼────────────┼────────────┼──────────────────┘    │
│              │            │            │            │                        │
│              ▼            ▼            ▼            ▼                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │  RAG Agent   │ │ Tech Expert  │ │ Sales Expert │ │ Human Agent  │        │
│  │              │ │              │ │              │ │   (HITL)     │        │
│  │ 知识库检索    │ │ 技术问题处理 │ │ 售后问题处理  │ │ 等待人工审批  │        │
│  │ 返回答案     │ │ 可再转接     │ │ 可再转接     │ │ interrupt()  │        │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘        │
│         │                │                │                │                 │
│         └────────────────┴────────────────┴────────────────┘                 │
│                                    │                                         │
│                                    ▼                                         │
│  ╔═══════════════════════════════════════════════════════════════════════╗  │
│  ║                       输出护栏 (Output Guardrails)                     ║  │
│  ║   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐           ║  │
│  ║   │事实检查  │ →  │敏感信息  │ →  │格式验证  │ →  │质量评估  │           ║  │
│  ║   │         │    │脱敏     │    │         │    │         │           ║  │
│  ║   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘           ║  │
│  ╚════════╪═════════════╪═════════════╪═════════════╪════════════════════╝  │
│           │             │             │             │                        │
│           ▼             ▼             ▼             ▼                        │
│                               返回给用户                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 三、数据库设计

### 3.1 ER 图

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      users       │       │   conversations  │       │     messages     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ email            │       │ userId (FK)      │───────│ conversationId(FK│
│ name             │───────│ status           │       │ role             │
│ role             │       │ currentAgent     │       │ content          │
│ createdAt        │       │ threadId         │       │ metadata         │
│ updatedAt        │       │ createdAt        │       │ createdAt        │
└──────────────────┘       │ updatedAt        │       └──────────────────┘
                           └──────────────────┘
                                   │
                                   │
┌──────────────────┐       ┌──────┴───────────┐       ┌──────────────────┐
│   approvals      │       │    tickets       │       │  knowledge_docs  │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ conversationId(FK│───────│ conversationId(FK│       │ title            │
│ type             │       │ type             │       │ content          │
│ action           │       │ status           │       │ category         │
│ data             │       │ priority         │       │ embedding        │
│ status           │       │ assignedTo       │       │ metadata         │
│ approvedBy       │       │ description      │       │ createdAt        │
│ approvedAt       │       │ createdAt        │       │ updatedAt        │
│ createdAt        │       │ updatedAt        │       └──────────────────┘
└──────────────────┘       │ closedAt         │
                           └──────────────────┘

┌──────────────────┐       ┌──────────────────┐
│  guardrail_logs  │       │   agent_logs     │
├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │
│ conversationId(FK│       │ conversationId(FK│
│ type             │       │ agentName        │
│ input            │       │ action           │
│ result           │       │ input            │
│ blocked          │       │ output           │
│ reason           │       │ duration         │
│ createdAt        │       │ createdAt        │
└──────────────────┘       └──────────────────┘
```

### 3.2 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  name          String
  role          UserRole       @default(USER)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  
  conversations Conversation[]
  approvals     Approval[]     @relation("ApprovedBy")
  tickets       Ticket[]       @relation("AssignedTo")
}

enum UserRole {
  USER          // 普通用户
  SUPPORT       // 客服人员
  TECH_EXPERT   // 技术专家
  SALES_EXPERT  // 售后专员
  ADMIN         // 管理员
}

// 会话表
model Conversation {
  id           String             @id @default(uuid())
  userId       String
  status       ConversationStatus @default(ACTIVE)
  currentAgent String             @default("general")
  threadId     String?            // LangGraph thread ID
  metadata     Json?
  createdAt    DateTime           @default(now())
  updatedAt    DateTime           @updatedAt
  
  user         User               @relation(fields: [userId], references: [id])
  messages     Message[]
  approvals    Approval[]
  tickets      Ticket[]
  guardrailLogs GuardrailLog[]
  agentLogs    AgentLog[]
}

enum ConversationStatus {
  ACTIVE        // 进行中
  WAITING_HUMAN // 等待人工
  RESOLVED      // 已解决
  CLOSED        // 已关闭
}

// 消息表
model Message {
  id             String       @id @default(uuid())
  conversationId String
  role           MessageRole
  content        String       @db.Text
  metadata       Json?        // 附加信息：agent名称、工具调用等
  createdAt      DateTime     @default(now())
  
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}

enum MessageRole {
  USER      // 用户消息
  ASSISTANT // AI 回复
  SYSTEM    // 系统消息
  TOOL      // 工具调用结果
}

// 审批表 (HITL)
model Approval {
  id             String         @id @default(uuid())
  conversationId String
  type           ApprovalType
  action         String         // 需要审批的操作
  data           Json           // 操作数据
  status         ApprovalStatus @default(PENDING)
  reason         String?        // 审批原因
  approvedBy     String?
  approvedAt     DateTime?
  createdAt      DateTime       @default(now())
  
  conversation   Conversation   @relation(fields: [conversationId], references: [id])
  approver       User?          @relation("ApprovedBy", fields: [approvedBy], references: [id])
}

enum ApprovalType {
  REFUND           // 退款
  ACCOUNT_DELETE   // 删除账户
  COMPENSATION     // 赔偿
  PRICE_OVERRIDE   // 价格覆盖
  SENSITIVE_INFO   // 敏感信息查询
}

enum ApprovalStatus {
  PENDING   // 待审批
  APPROVED  // 已批准
  REJECTED  // 已拒绝
  EXPIRED   // 已过期
}

// 工单表
model Ticket {
  id             String       @id @default(uuid())
  conversationId String
  type           TicketType
  status         TicketStatus @default(OPEN)
  priority       Priority     @default(MEDIUM)
  title          String
  description    String       @db.Text
  assignedTo     String?
  metadata       Json?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt
  closedAt       DateTime?
  
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  assignee       User?        @relation("AssignedTo", fields: [assignedTo], references: [id])
}

enum TicketType {
  TECH_SUPPORT  // 技术支持
  REFUND        // 退款
  COMPLAINT     // 投诉
  CONSULTATION  // 咨询
  OTHER         // 其他
}

enum TicketStatus {
  OPEN        // 开放
  IN_PROGRESS // 处理中
  RESOLVED    // 已解决
  CLOSED      // 已关闭
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// 知识库文档表
model KnowledgeDoc {
  id        String   @id @default(uuid())
  title     String
  content   String   @db.LongText
  category  String
  tags      String?  // JSON array
  metadata  Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 护栏日志表
model GuardrailLog {
  id             String       @id @default(uuid())
  conversationId String
  type           String       // input_validation, sensitive_filter, etc.
  input          String       @db.Text
  result         String       @db.Text
  blocked        Boolean      @default(false)
  reason         String?
  createdAt      DateTime     @default(now())
  
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}

// Agent 日志表
model AgentLog {
  id             String       @id @default(uuid())
  conversationId String
  agentName      String       // general, tech_expert, sales_expert
  action         String       // handoff, rag_search, tool_call, etc.
  input          String       @db.Text
  output         String       @db.Text
  duration       Int          // 毫秒
  createdAt      DateTime     @default(now())
  
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}
```

---

## 四、AI Agent 核心实现

### 4.1 State 定义

```typescript
// src/agents/types.ts
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

// 会话状态
export const CustomerServiceState = Annotation.Root({
  // 继承消息列表
  ...MessagesAnnotation.spec,
  
  // 当前处理的 Agent
  currentAgent: Annotation<string>({
    default: () => "general",
    reducer: (_, v) => v,
  }),
  
  // 用户信息
  userId: Annotation<string>(),
  conversationId: Annotation<string>(),
  
  // 用户意图分析结果
  intent: Annotation<UserIntent | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  
  // RAG 检索结果
  ragResults: Annotation<RAGResult[]>({
    default: () => [],
    reducer: (_, v) => v,
  }),
  
  // 待审批的操作
  pendingApproval: Annotation<PendingApproval | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  
  // 护栏检查结果
  guardrailResult: Annotation<GuardrailResult | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
  
  // 是否需要人工介入
  needsHuman: Annotation<boolean>({
    default: () => false,
    reducer: (_, v) => v,
  }),
  
  // 工单信息
  ticket: Annotation<TicketInfo | null>({
    default: () => null,
    reducer: (_, v) => v,
  }),
});

// 类型定义
export interface UserIntent {
  category: "faq" | "tech_support" | "sales" | "complaint" | "sensitive_action";
  confidence: number;
  keywords: string[];
  requiresExpert: boolean;
  expertType?: "tech" | "sales";
  isSensitive: boolean;
  sensitiveType?: "refund" | "delete_account" | "compensation";
}

export interface RAGResult {
  docId: string;
  title: string;
  content: string;
  score: number;
  category: string;
}

export interface PendingApproval {
  type: "refund" | "delete_account" | "compensation" | "price_override";
  action: string;
  data: Record<string, unknown>;
  reason: string;
}

export interface GuardrailResult {
  passed: boolean;
  blockedReason?: string;
  filteredContent?: string;
  warnings: string[];
}

export interface TicketInfo {
  id: string;
  type: string;
  status: string;
  assignedTo?: string;
}

export type CustomerServiceStateType = typeof CustomerServiceState.State;
```

### 4.2 护栏系统实现

护栏是整个系统的第一道防线，在消息进入 Agent 之前进行检查。

```typescript
// src/agents/guardrails/index.ts
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// 敏感词列表（实际项目中应从数据库或配置文件加载）
const SENSITIVE_WORDS = [
  "傻逼", "滚", "垃圾", "骗子", // 辱骂类
  "炸弹", "杀", "死",          // 暴力类
  "账号密码", "身份证",        // 隐私类
];

// 注入攻击模式
const INJECTION_PATTERNS = [
  /ignore previous instructions/i,
  /forget your instructions/i,
  /你现在是/,
  /假装你是/,
  /system prompt/i,
  /\{\{.*\}\}/,  // 模板注入
];

// 输入护栏配置
export interface InputGuardrailConfig {
  maxLength: number;
  enableSensitiveFilter: boolean;
  enableInjectionDetection: boolean;
  enableIntentPrecheck: boolean;
}

const defaultConfig: InputGuardrailConfig = {
  maxLength: 1000,
  enableSensitiveFilter: true,
  enableInjectionDetection: true,
  enableIntentPrecheck: true,
};

// 护栏检查结果
export interface GuardrailCheckResult {
  passed: boolean;
  blockedReason?: string;
  filteredContent?: string;
  warnings: string[];
  metadata: {
    originalLength: number;
    sensitiveWordsFound: string[];
    injectionDetected: boolean;
    intentPrecheck?: string;
  };
}

// 输入护栏类
export class InputGuardrail {
  private config: InputGuardrailConfig;
  private model: ChatOpenAI;

  constructor(config: Partial<InputGuardrailConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
    });
  }

  async check(input: string): Promise<GuardrailCheckResult> {
    const result: GuardrailCheckResult = {
      passed: true,
      warnings: [],
      metadata: {
        originalLength: input.length,
        sensitiveWordsFound: [],
        injectionDetected: false,
      },
    };

    // 1. 长度检查
    if (input.length > this.config.maxLength) {
      result.passed = false;
      result.blockedReason = `输入长度超出限制（最大 ${this.config.maxLength} 字符）`;
      return result;
    }

    // 2. 敏感词过滤
    if (this.config.enableSensitiveFilter) {
      const sensitiveCheck = this.checkSensitiveWords(input);
      if (sensitiveCheck.found.length > 0) {
        result.metadata.sensitiveWordsFound = sensitiveCheck.found;
        result.filteredContent = sensitiveCheck.filtered;
        result.warnings.push(`检测到敏感词：${sensitiveCheck.found.join(", ")}`);
        
        // 如果敏感词过多，直接拦截
        if (sensitiveCheck.found.length > 3) {
          result.passed = false;
          result.blockedReason = "输入包含过多不当内容";
          return result;
        }
      }
    }

    // 3. 注入攻击检测
    if (this.config.enableInjectionDetection) {
      const injectionCheck = this.checkInjection(input);
      if (injectionCheck.detected) {
        result.passed = false;
        result.blockedReason = "检测到潜在的恶意输入";
        result.metadata.injectionDetected = true;
        return result;
      }
    }

    // 4. 意图预检（使用 LLM 判断是否为高风险意图）
    if (this.config.enableIntentPrecheck) {
      const intentCheck = await this.precheckIntent(input);
      result.metadata.intentPrecheck = intentCheck.category;
      
      if (intentCheck.isHighRisk) {
        result.warnings.push(`检测到高风险意图：${intentCheck.reason}`);
      }
    }

    return result;
  }

  private checkSensitiveWords(input: string): { found: string[]; filtered: string } {
    const found: string[] = [];
    let filtered = input;

    for (const word of SENSITIVE_WORDS) {
      if (input.includes(word)) {
        found.push(word);
        filtered = filtered.replaceAll(word, "*".repeat(word.length));
      }
    }

    return { found, filtered };
  }

  private checkInjection(input: string): { detected: boolean; pattern?: string } {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        return { detected: true, pattern: pattern.toString() };
      }
    }
    return { detected: false };
  }

  private async precheckIntent(input: string): Promise<{
    category: string;
    isHighRisk: boolean;
    reason?: string;
  }> {
    const IntentSchema = z.object({
      category: z.enum([
        "normal_query",      // 普通咨询
        "sensitive_action",  // 敏感操作（退款、删除等）
        "complaint",         // 投诉
        "potential_fraud",   // 潜在欺诈
        "other",
      ]),
      isHighRisk: z.boolean(),
      reason: z.string().optional(),
    });

    try {
      const response = await this.model
        .withStructuredOutput(IntentSchema)
        .invoke([
          {
            role: "system",
            content: `你是一个意图分类器。分析用户输入，判断其意图类别和风险等级。

高风险意图包括：
- 涉及金钱操作（退款、赔偿）
- 涉及账户安全（删除账户、修改密码）
- 明显的投诉或不满
- 可能的欺诈行为

只需返回分类结果，不要做其他回复。`,
          },
          { role: "user", content: input },
        ]);

      return response;
    } catch (error) {
      // 如果 LLM 调用失败，默认返回普通查询
      return { category: "normal_query", isHighRisk: false };
    }
  }
}

// 输出护栏类
export class OutputGuardrail {
  private sensitivePatterns = [
    /\d{15,18}/,          // 身份证号
    /\d{16,19}/,          // 银行卡号
    /1[3-9]\d{9}/,        // 手机号
    /[\w.-]+@[\w.-]+\.\w+/, // 邮箱
  ];

  check(output: string): {
    passed: boolean;
    sanitized: string;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let sanitized = output;

    // 检查并脱敏敏感信息
    for (const pattern of this.sensitivePatterns) {
      const matches = output.match(new RegExp(pattern, "g"));
      if (matches) {
        warnings.push(`检测到可能的敏感信息，已脱敏处理`);
        sanitized = sanitized.replace(pattern, "[已隐藏]");
      }
    }

    return {
      passed: true,
      sanitized,
      warnings,
    };
  }
}

// 创建护栏实例
export function createGuardrails(config?: Partial<InputGuardrailConfig>) {
  return {
    input: new InputGuardrail(config),
    output: new OutputGuardrail(),
  };
}
```

### 4.3 RAG 知识库检索

```typescript
// src/agents/rag/index.ts
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import { z } from "zod";
import { tool } from "@langchain/core/tools";
import prisma from "../../lib/prisma";

// RAG 检索结果
export interface RAGSearchResult {
  docId: string;
  title: string;
  content: string;
  score: number;
  category: string;
  metadata: Record<string, unknown>;
}

// RAG 服务类
export class RAGService {
  private vectorStore: Chroma;
  private embeddings: OpenAIEmbeddings;
  private model: ChatOpenAI;
  private collectionName = "knowledge_base";

  constructor() {
    this.embeddings = new OpenAIEmbeddings({
      modelName: "text-embedding-3-small",
    });
    
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
    });
  }

  async initialize(): Promise<void> {
    this.vectorStore = await Chroma.fromExistingCollection(this.embeddings, {
      collectionName: this.collectionName,
      url: process.env.CHROMA_URL || "http://localhost:8000",
    });
  }

  // 从数据库同步知识库到向量数据库
  async syncKnowledgeBase(): Promise<number> {
    const docs = await prisma.knowledgeDoc.findMany();
    
    const documents = docs.map(
      (doc) =>
        new Document({
          pageContent: `${doc.title}\n\n${doc.content}`,
          metadata: {
            docId: doc.id,
            title: doc.title,
            category: doc.category,
            tags: doc.tags ? JSON.parse(doc.tags) : [],
          },
        })
    );

    // 清空现有集合并重新索引
    this.vectorStore = await Chroma.fromDocuments(documents, this.embeddings, {
      collectionName: this.collectionName,
      url: process.env.CHROMA_URL || "http://localhost:8000",
    });

    return documents.length;
  }

  // 相似度检索
  async search(query: string, topK: number = 3): Promise<RAGSearchResult[]> {
    const results = await this.vectorStore.similaritySearchWithScore(query, topK);

    return results.map(([doc, score]) => ({
      docId: doc.metadata.docId as string,
      title: doc.metadata.title as string,
      content: doc.pageContent,
      score,
      category: doc.metadata.category as string,
      metadata: doc.metadata,
    }));
  }

  // 带重排序的检索
  async searchWithRerank(query: string, topK: number = 3): Promise<RAGSearchResult[]> {
    // 先检索更多结果
    const initialResults = await this.search(query, topK * 2);
    
    if (initialResults.length === 0) {
      return [];
    }

    // 使用 LLM 重排序
    const RerankSchema = z.object({
      rankings: z.array(
        z.object({
          index: z.number(),
          relevanceScore: z.number().min(0).max(1),
          reason: z.string(),
        })
      ),
    });

    const response = await this.model
      .withStructuredOutput(RerankSchema)
      .invoke([
        {
          role: "system",
          content: `你是一个搜索结果重排序器。根据用户查询和检索结果，对每个结果进行相关性评分。
评分标准：
- 1.0: 完全匹配用户问题
- 0.7-0.9: 高度相关
- 0.4-0.6: 部分相关
- 0.1-0.3: 弱相关
- 0: 不相关`,
        },
        {
          role: "user",
          content: `用户查询: ${query}

检索结果:
${initialResults.map((r, i) => `[${i}] ${r.title}\n${r.content.substring(0, 200)}...`).join("\n\n")}

请对每个结果进行相关性评分。`,
        },
      ]);

    // 根据重排序结果排序
    const reranked = response.rankings
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, topK)
      .map((r) => ({
        ...initialResults[r.index],
        score: r.relevanceScore,
      }));

    return reranked;
  }

  // 生成回答
  async generateAnswer(
    query: string,
    context: RAGSearchResult[]
  ): Promise<{
    answer: string;
    sources: { docId: string; title: string }[];
    confidence: number;
  }> {
    if (context.length === 0) {
      return {
        answer: "抱歉，我在知识库中没有找到相关信息。让我帮您转接人工客服。",
        sources: [],
        confidence: 0,
      };
    }

    const AnswerSchema = z.object({
      answer: z.string(),
      confidence: z.number().min(0).max(1),
      usedSources: z.array(z.number()),
    });

    const response = await this.model
      .withStructuredOutput(AnswerSchema)
      .invoke([
        {
          role: "system",
          content: `你是一个专业的客服助手。根据提供的知识库内容回答用户问题。

回答要求：
1. 准确：只根据知识库内容回答，不要编造
2. 友好：语气礼貌、专业
3. 简洁：直接回答问题，不要冗长
4. 如果知识库内容无法完全回答问题，说明局限性

评估你的回答置信度：
- 0.8-1.0: 知识库完全覆盖问题
- 0.5-0.7: 部分覆盖，可能需要补充
- 0-0.4: 覆盖度低，建议转人工`,
        },
        {
          role: "user",
          content: `用户问题: ${query}

知识库内容:
${context.map((r, i) => `[${i}] ${r.title}\n${r.content}`).join("\n\n---\n\n")}

请根据知识库内容回答用户问题。`,
        },
      ]);

    return {
      answer: response.answer,
      sources: response.usedSources.map((i) => ({
        docId: context[i].docId,
        title: context[i].title,
      })),
      confidence: response.confidence,
    };
  }
}

// 创建 RAG 检索工具
export function createRAGTool(ragService: RAGService) {
  return tool(
    async ({ query }) => {
      const results = await ragService.searchWithRerank(query);
      const answer = await ragService.generateAnswer(query, results);
      
      return JSON.stringify({
        answer: answer.answer,
        sources: answer.sources,
        confidence: answer.confidence,
        needsHuman: answer.confidence < 0.5,
      });
    },
    {
      name: "search_knowledge_base",
      description: "在知识库中搜索答案。用于回答常见问题（FAQ）、产品信息、使用指南等。",
      schema: z.object({
        query: z.string().describe("用户的问题或搜索关键词"),
      }),
    }
  );
}

// 导出单例
let ragService: RAGService | null = null;

export async function getRAGService(): Promise<RAGService> {
  if (!ragService) {
    ragService = new RAGService();
    await ragService.initialize();
  }
  return ragService;
}
```

### 4.4 Agent 定义与 Handoffs 实现

```typescript
// src/agents/agents/index.ts
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { SystemMessage } from "@langchain/core/messages";
import { createRAGTool, getRAGService } from "../rag";
import { CustomerServiceStateType } from "../types";

// 模型实例
const model = new ChatOpenAI({
  modelName: "gpt-4o",
  temperature: 0.3,
});

// ==================== 工具定义 ====================

// 查询订单状态
const queryOrderTool = tool(
  async ({ orderId }) => {
    // 模拟订单查询
    const mockOrders: Record<string, unknown> = {
      "ORD001": { status: "已发货", tracking: "SF1234567890", eta: "2024-01-20" },
      "ORD002": { status: "配送中", tracking: "YT9876543210", eta: "2024-01-18" },
    };
    
    const order = mockOrders[orderId];
    if (order) {
      return JSON.stringify(order);
    }
    return JSON.stringify({ error: "订单不存在" });
  },
  {
    name: "query_order",
    description: "查询订单状态、物流信息",
    schema: z.object({
      orderId: z.string().describe("订单号"),
    }),
  }
);

// 查询产品信息
const queryProductTool = tool(
  async ({ productId, infoType }) => {
    // 模拟产品查询
    return JSON.stringify({
      productId,
      name: "智能手表 Pro",
      specs: "1.5寸AMOLED屏幕，心率监测，防水50m",
      warranty: "2年质保",
      manual: "https://example.com/manual.pdf",
    });
  },
  {
    name: "query_product",
    description: "查询产品信息、规格、保修政策、使用手册",
    schema: z.object({
      productId: z.string().describe("产品ID或名称"),
      infoType: z.enum(["specs", "warranty", "manual", "all"]).describe("信息类型"),
    }),
  }
);

// 查询故障库
const queryTroubleshootTool = tool(
  async ({ symptom, productType }) => {
    // 模拟故障诊断
    const solutions: Record<string, string[]> = {
      "黑屏": [
        "1. 检查电量是否充足，尝试充电30分钟后开机",
        "2. 长按电源键15秒进行强制重启",
        "3. 如仍无法开机，可能是硬件故障，建议送修",
      ],
      "卡顿": [
        "1. 清理后台运行的应用",
        "2. 检查存储空间是否不足",
        "3. 尝试恢复出厂设置（注意备份数据）",
      ],
    };
    
    const solution = solutions[symptom] || ["建议联系技术支持进一步诊断"];
    return JSON.stringify({ symptom, solutions: solution });
  },
  {
    name: "query_troubleshoot",
    description: "查询故障库，获取常见问题的解决方案",
    schema: z.object({
      symptom: z.string().describe("故障症状描述"),
      productType: z.string().optional().describe("产品类型"),
    }),
  }
);

// 创建工单
const createTicketTool = tool(
  async ({ type, title, description, priority }) => {
    // 实际项目中应调用数据库创建工单
    const ticketId = `TK${Date.now()}`;
    return JSON.stringify({
      ticketId,
      type,
      title,
      status: "open",
      message: `工单 ${ticketId} 已创建，我们会尽快处理`,
    });
  },
  {
    name: "create_ticket",
    description: "创建工单，用于需要后续跟进的问题",
    schema: z.object({
      type: z.enum(["tech_support", "refund", "complaint", "other"]).describe("工单类型"),
      title: z.string().describe("工单标题"),
      description: z.string().describe("问题描述"),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional().describe("优先级"),
    }),
  }
);

// 申请退款（敏感操作，需要 HITL）
const requestRefundTool = tool(
  async ({ orderId, amount, reason }) => {
    // 返回需要人工审批的标记
    return JSON.stringify({
      requiresApproval: true,
      approvalType: "refund",
      data: { orderId, amount, reason },
      message: "退款申请已提交，等待审批",
    });
  },
  {
    name: "request_refund",
    description: "申请退款。注意：退款是敏感操作，需要人工审批",
    schema: z.object({
      orderId: z.string().describe("订单号"),
      amount: z.number().describe("退款金额"),
      reason: z.string().describe("退款原因"),
    }),
  }
);

// ==================== Agent 创建函数 ====================

// 通用客服 Agent
export async function createGeneralAgent() {
  const ragService = await getRAGService();
  const ragTool = createRAGTool(ragService);

  return createReactAgent({
    llm: model,
    tools: [ragTool, queryOrderTool, queryProductTool],
    messageModifier: new SystemMessage(`你是一个专业的智能客服助手。

## 你的职责：
1. 热情接待用户，分析用户问题
2. 对于常见问题，使用知识库检索回答
3. 判断是否需要转接专家处理：
   - 复杂技术问题 → 转技术专家
   - 退换货/投诉 → 转售后专员
   - 敏感操作（退款、删除账户）→ 需要人工审批

## 转接规则：
- 如果你无法回答问题，主动告知用户并转接适合的专家
- 转接时说明原因，让用户感到被重视

## 回复风格：
- 礼貌、专业、简洁
- 先表示理解用户的问题
- 给出明确的解决方案或下一步指引`),
  });
}

// 技术专家 Agent
export function createTechExpertAgent() {
  return createReactAgent({
    llm: model,
    tools: [queryProductTool, queryTroubleshootTool, createTicketTool],
    messageModifier: new SystemMessage(`你是一位专业的技术支持专家。

## 你的专长：
1. 产品技术问题诊断
2. 故障排查和解决方案提供
3. 产品使用指导

## 处理流程：
1. 了解问题症状和使用环境
2. 查询故障库寻找解决方案
3. 提供分步骤的解决指导
4. 如果远程无法解决，创建技术支持工单

## 转接规则：
- 如果问题涉及退换货 → 转售后专员
- 如果用户有投诉情绪 → 先安抚，再转售后

## 注意事项：
- 技术术语要通俗易懂
- 复杂操作要分步骤说明
- 确认用户是否理解每个步骤`),
  });
}

// 售后专员 Agent
export function createSalesExpertAgent() {
  return createReactAgent({
    llm: model,
    tools: [queryOrderTool, createTicketTool, requestRefundTool],
    messageModifier: new SystemMessage(`你是一位专业的售后服务专员。

## 你的职责：
1. 处理退换货申请
2. 处理用户投诉
3. 处理物流问题
4. 处理优惠咨询

## 处理原则：
1. 先表示歉意，共情用户感受
2. 了解问题详情和诉求
3. 查询订单状态
4. 提供解决方案

## 敏感操作（需人工审批）：
- 退款金额 > 100元
- 特殊补偿
- 规则例外处理

## 转接规则：
- 如果是技术问题 → 转技术专家
- 涉及退款 → 提交审批请求

## 沟通技巧：
- 始终保持礼貌和耐心
- 主动承担责任，不推诿
- 给用户明确的时间预期`),
  });
}

// ==================== Handoffs 工具 ====================

// 创建 Handoffs 转接工具
export function createHandoffTools() {
  const handoffToTechExpert = tool(
    async ({ reason, context }) => {
      return JSON.stringify({
        handoffTo: "tech_expert",
        reason,
        context,
      });
    },
    {
      name: "transfer_to_tech_expert",
      description: "将对话转接给技术专家。用于：复杂技术问题、故障诊断、产品使用指导",
      schema: z.object({
        reason: z.string().describe("转接原因"),
        context: z.string().describe("问题背景概述"),
      }),
    }
  );

  const handoffToSalesExpert = tool(
    async ({ reason, context }) => {
      return JSON.stringify({
        handoffTo: "sales_expert",
        reason,
        context,
      });
    },
    {
      name: "transfer_to_sales_expert",
      description: "将对话转接给售后专员。用于：退换货、投诉、物流问题、优惠咨询",
      schema: z.object({
        reason: z.string().describe("转接原因"),
        context: z.string().describe("问题背景概述"),
      }),
    }
  );

  const handoffToHuman = tool(
    async ({ reason, urgency }) => {
      return JSON.stringify({
        handoffTo: "human",
        reason,
        urgency,
        needsApproval: true,
      });
    },
    {
      name: "transfer_to_human",
      description: "将对话转接给人工客服。用于：敏感操作审批、AI无法处理的复杂情况、用户明确要求人工",
      schema: z.object({
        reason: z.string().describe("转接原因"),
        urgency: z.enum(["low", "medium", "high"]).describe("紧急程度"),
      }),
    }
  );

  const handoffBackToGeneral = tool(
    async ({ summary }) => {
      return JSON.stringify({
        handoffTo: "general",
        summary,
      });
    },
    {
      name: "transfer_back_to_general",
      description: "问题处理完成，交回通用客服。用于：专家处理完毕后的收尾工作",
      schema: z.object({
        summary: z.string().describe("处理结果摘要"),
      }),
    }
  );

  return {
    handoffToTechExpert,
    handoffToSalesExpert,
    handoffToHuman,
    handoffBackToGeneral,
  };
}
```

### 4.5 Graph 组装与 HITL 实现

```typescript
// src/agents/graph/index.ts
import { StateGraph, START, END, interrupt, Command } from "@langchain/langgraph";
import { AIMessage, BaseMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import {
  CustomerServiceState,
  CustomerServiceStateType,
  PendingApproval,
} from "../types";
import {
  createGeneralAgent,
  createTechExpertAgent,
  createSalesExpertAgent,
  createHandoffTools,
} from "../agents";
import { createGuardrails, GuardrailCheckResult } from "../guardrails";

// 创建护栏实例
const guardrails = createGuardrails();

// 创建 Handoffs 工具
const handoffTools = createHandoffTools();

// ==================== 节点函数 ====================

// 输入护栏节点
async function inputGuardrailNode(
  state: CustomerServiceStateType
): Promise<Partial<CustomerServiceStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // 只检查用户消息
  if (lastMessage._getType() !== "human") {
    return { guardrailResult: { passed: true, warnings: [] } };
  }

  const content = lastMessage.content as string;
  const result = await guardrails.input.check(content);

  return {
    guardrailResult: {
      passed: result.passed,
      blockedReason: result.blockedReason,
      filteredContent: result.filteredContent,
      warnings: result.warnings,
    },
  };
}

// 护栏路由
function guardrailRouter(state: CustomerServiceStateType): string {
  if (!state.guardrailResult?.passed) {
    return "blocked_response";
  }
  return "general_agent";
}

// 被拦截时的响应
async function blockedResponseNode(
  state: CustomerServiceStateType
): Promise<Partial<CustomerServiceStateType>> {
  const reason = state.guardrailResult?.blockedReason || "输入不符合规范";
  
  return {
    messages: [
      new AIMessage({
        content: `抱歉，${reason}。请您重新描述您的问题，我会尽力帮助您。`,
      }),
    ],
  };
}

// 通用客服节点
async function generalAgentNode(
  state: CustomerServiceStateType
): Promise<Partial<CustomerServiceStateType>> {
  const agent = await createGeneralAgent();
  
  // 添加 Handoffs 工具
  const agentWithHandoffs = agent.withConfig({
    tools: [
      ...agent.tools,
      handoffTools.handoffToTechExpert,
      handoffTools.handoffToSalesExpert,
      handoffTools.handoffToHuman,
    ],
  });

  const result = await agentWithHandoffs.invoke({
    messages: state.messages,
  });

  return {
    messages: result.messages,
    currentAgent: "general",
  };
}

// 技术专家节点
async function techExpertNode(
  state: CustomerServiceStateType
): Promise<Partial<CustomerServiceStateType>> {
  const agent = createTechExpertAgent();
  
  // 添加 Handoffs 工具
  const agentWithHandoffs = agent.withConfig({
    tools: [
      ...agent.tools,
      handoffTools.handoffToSalesExpert,
      handoffTools.handoffBackToGeneral,
    ],
  });

  const result = await agentWithHandoffs.invoke({
    messages: state.messages,
  });

  return {
    messages: result.messages,
    currentAgent: "tech_expert",
  };
}

// 售后专员节点
async function salesExpertNode(
  state: CustomerServiceStateType
): Promise<Partial<CustomerServiceStateType>> {
  const agent = createSalesExpertAgent();
  
  // 添加 Handoffs 工具
  const agentWithHandoffs = agent.withConfig({
    tools: [
      ...agent.tools,
      handoffTools.handoffToTechExpert,
      handoffTools.handoffToHuman,
      handoffTools.handoffBackToGeneral,
    ],
  });

  const result = await agentWithHandoffs.invoke({
    messages: state.messages,
  });

  // 检查是否触发了退款申请（需要 HITL）
  const lastMessage = result.messages[result.messages.length - 1];
  if (lastMessage instanceof ToolMessage) {
    try {
      const toolResult = JSON.parse(lastMessage.content as string);
      if (toolResult.requiresApproval) {
        return {
          messages: result.messages,
          currentAgent: "sales_expert",
          pendingApproval: {
            type: toolResult.approvalType,
            action: "refund",
            data: toolResult.data,
            reason: toolResult.data.reason,
          },
          needsHuman: true,
        };
      }
    } catch {
      // 不是 JSON，忽略
    }
  }

  return {
    messages: result.messages,
    currentAgent: "sales_expert",
  };
}

// 人工审批节点 (HITL)
async function humanApprovalNode(
  state: CustomerServiceStateType
): Promise<Partial<CustomerServiceStateType>> {
  if (!state.pendingApproval) {
    return {};
  }

  // 使用 interrupt 暂停执行，等待人工审批
  const approvalResult = interrupt({
    type: "approval_required",
    approval: state.pendingApproval,
    message: `需要人工审批：${state.pendingApproval.type}`,
    data: state.pendingApproval.data,
  });

  // 当 resume 被调用时，approvalResult 会包含审批结果
  const approved = approvalResult?.approved ?? false;
  const approverNote = approvalResult?.note ?? "";

  if (approved) {
    return {
      messages: [
        new AIMessage({
          content: `您的${state.pendingApproval.type === "refund" ? "退款" : ""}申请已获批准。${approverNote ? `备注：${approverNote}` : ""}我们会尽快为您处理。`,
        }),
      ],
      pendingApproval: null,
      needsHuman: false,
    };
  } else {
    return {
      messages: [
        new AIMessage({
          content: `抱歉，您的申请未能通过审批。${approverNote ? `原因：${approverNote}` : ""}如有疑问，请联系我们的客服主管。`,
        }),
      ],
      pendingApproval: null,
      needsHuman: false,
    };
  }
}

// 输出护栏节点
async function outputGuardrailNode(
  state: CustomerServiceStateType
): Promise<Partial<CustomerServiceStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (!(lastMessage instanceof AIMessage)) {
    return {};
  }

  const content = lastMessage.content as string;
  const result = guardrails.output.check(content);

  if (result.sanitized !== content) {
    // 需要脱敏处理
    const messages = state.messages.slice(0, -1);
    messages.push(new AIMessage({ content: result.sanitized }));
    return { messages };
  }

  return {};
}

// ==================== 路由函数 ====================

// Agent 路由：根据工具调用决定下一步
function agentRouter(state: CustomerServiceStateType): string {
  // 检查是否需要人工审批
  if (state.needsHuman && state.pendingApproval) {
    return "human_approval";
  }

  // 检查最后一条消息是否包含 Handoffs
  const lastMessage = state.messages[state.messages.length - 1];
  
  if (lastMessage instanceof ToolMessage) {
    try {
      const toolResult = JSON.parse(lastMessage.content as string);
      
      if (toolResult.handoffTo) {
        switch (toolResult.handoffTo) {
          case "tech_expert":
            return "tech_expert";
          case "sales_expert":
            return "sales_expert";
          case "human":
            return "human_approval";
          case "general":
            return "general_agent";
        }
      }
    } catch {
      // 不是 JSON，继续
    }
  }

  // 检查 AI 消息是否需要转接
  if (lastMessage instanceof AIMessage && lastMessage.tool_calls?.length) {
    const lastToolCall = lastMessage.tool_calls[lastMessage.tool_calls.length - 1];
    
    if (lastToolCall.name.startsWith("transfer_to_")) {
      // 等待工具执行结果
      return "continue";
    }
  }

  // 默认进入输出护栏
  return "output_guardrail";
}

// 是否继续对话
function shouldContinue(state: CustomerServiceStateType): string {
  const lastMessage = state.messages[state.messages.length - 1];
  
  // 如果最后是 AI 消息且没有工具调用，结束对话
  if (lastMessage instanceof AIMessage && !lastMessage.tool_calls?.length) {
    return END;
  }
  
  return "continue";
}

// ==================== 创建 Graph ====================

export function createCustomerServiceGraph() {
  const workflow = new StateGraph(CustomerServiceState)
    // 添加节点
    .addNode("input_guardrail", inputGuardrailNode)
    .addNode("blocked_response", blockedResponseNode)
    .addNode("general_agent", generalAgentNode)
    .addNode("tech_expert", techExpertNode)
    .addNode("sales_expert", salesExpertNode)
    .addNode("human_approval", humanApprovalNode)
    .addNode("output_guardrail", outputGuardrailNode)
    
    // 添加边
    .addEdge(START, "input_guardrail")
    .addConditionalEdges("input_guardrail", guardrailRouter, {
      blocked_response: "blocked_response",
      general_agent: "general_agent",
    })
    .addEdge("blocked_response", END)
    
    // Agent 路由
    .addConditionalEdges("general_agent", agentRouter, {
      tech_expert: "tech_expert",
      sales_expert: "sales_expert",
      human_approval: "human_approval",
      output_guardrail: "output_guardrail",
      continue: "general_agent",
    })
    .addConditionalEdges("tech_expert", agentRouter, {
      sales_expert: "sales_expert",
      general_agent: "general_agent",
      output_guardrail: "output_guardrail",
      continue: "tech_expert",
    })
    .addConditionalEdges("sales_expert", agentRouter, {
      tech_expert: "tech_expert",
      human_approval: "human_approval",
      general_agent: "general_agent",
      output_guardrail: "output_guardrail",
      continue: "sales_expert",
    })
    
    // 人工审批后继续
    .addEdge("human_approval", "output_guardrail")
    
    // 输出护栏后结束
    .addEdge("output_guardrail", END);

  // 创建带记忆的 checkpointer
  const checkpointer = new MemorySaver();

  return workflow.compile({ checkpointer });
}

// 导出类型
export type CustomerServiceGraph = ReturnType<typeof createCustomerServiceGraph>;
```

### 4.6 使用示例

```typescript
// src/agents/example.ts
import { HumanMessage } from "@langchain/core/messages";
import { createCustomerServiceGraph } from "./graph";
import { Command } from "@langchain/langgraph";

async function main() {
  const graph = createCustomerServiceGraph();
  const config = { configurable: { thread_id: "conversation-1" } };

  // 示例 1: 简单 FAQ 问题
  console.log("=== 示例 1: FAQ 问题 ===");
  let result = await graph.invoke(
    {
      messages: [new HumanMessage("你们的退货政策是什么？")],
      userId: "user-1",
      conversationId: "conv-1",
    },
    config
  );
  console.log("AI:", result.messages[result.messages.length - 1].content);

  // 示例 2: 技术问题（触发 Handoffs）
  console.log("\n=== 示例 2: 技术问题 ===");
  result = await graph.invoke(
    {
      messages: [new HumanMessage("我的手表突然黑屏了，怎么办？")],
      userId: "user-2",
      conversationId: "conv-2",
    },
    { configurable: { thread_id: "conversation-2" } }
  );
  console.log("当前 Agent:", result.currentAgent);
  console.log("AI:", result.messages[result.messages.length - 1].content);

  // 示例 3: 退款申请（触发 HITL）
  console.log("\n=== 示例 3: 退款申请 (HITL) ===");
  const refundConfig = { configurable: { thread_id: "conversation-3" } };
  
  // 第一次调用，会在 human_approval 节点暂停
  result = await graph.invoke(
    {
      messages: [new HumanMessage("我要退款，订单号 ORD001，退款 200 元，因为产品有质量问题")],
      userId: "user-3",
      conversationId: "conv-3",
    },
    refundConfig
  );
  
  console.log("状态:", result.needsHuman ? "等待人工审批" : "完成");
  
  if (result.needsHuman) {
    // 模拟人工审批通过
    console.log("管理员审批通过...");
    
    // 使用 Command.resume 继续执行
    const resumeResult = await graph.invoke(
      Command.resume({ approved: true, note: "已核实，同意退款" }),
      refundConfig
    );
    
    console.log("AI:", resumeResult.messages[resumeResult.messages.length - 1].content);
  }

  // 示例 4: 敏感词拦截
  console.log("\n=== 示例 4: 护栏拦截 ===");
  result = await graph.invoke(
    {
      messages: [new HumanMessage("你们这垃圾产品，我要投诉！退款！")],
      userId: "user-4",
      conversationId: "conv-4",
    },
    { configurable: { thread_id: "conversation-4" } }
  );
  console.log("AI:", result.messages[result.messages.length - 1].content);
}

main().catch(console.error);
```

---

## 五、API 接口设计

### 5.1 聊天接口

```typescript
// src/routes/chat.routes.ts
import { Router } from "express";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { createCustomerServiceGraph } from "../agents/graph";
import prisma from "../lib/prisma";

const router = Router();
const graph = createCustomerServiceGraph();

// 发送消息
const SendMessageSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(1000),
});

router.post("/send", async (req, res) => {
  try {
    const { conversationId, message } = SendMessageSchema.parse(req.body);
    const userId = req.user!.id;

    // 获取或创建会话
    let conversation = conversationId
      ? await prisma.conversation.findUnique({ where: { id: conversationId } })
      : null;

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId,
          threadId: `thread-${Date.now()}`,
        },
      });
    }

    // 保存用户消息
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        content: message,
      },
    });

    // 调用 Agent
    const config = { configurable: { thread_id: conversation.threadId! } };
    
    const result = await graph.invoke(
      {
        messages: [new HumanMessage(message)],
        userId,
        conversationId: conversation.id,
      },
      config
    );

    // 获取 AI 回复
    const aiResponse = result.messages[result.messages.length - 1].content as string;

    // 保存 AI 回复
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: aiResponse,
        metadata: {
          agent: result.currentAgent,
          needsHuman: result.needsHuman,
        },
      },
    });

    // 更新会话状态
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        currentAgent: result.currentAgent,
        status: result.needsHuman ? "WAITING_HUMAN" : "ACTIVE",
      },
    });

    // 如果需要人工审批，创建审批记录
    if (result.needsHuman && result.pendingApproval) {
      await prisma.approval.create({
        data: {
          conversationId: conversation.id,
          type: result.pendingApproval.type.toUpperCase() as any,
          action: result.pendingApproval.action,
          data: result.pendingApproval.data,
        },
      });
    }

    res.json({
      conversationId: conversation.id,
      response: aiResponse,
      currentAgent: result.currentAgent,
      needsHuman: result.needsHuman,
      pendingApproval: result.pendingApproval,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "处理消息时发生错误" });
  }
});

// 流式响应
router.post("/stream", async (req, res) => {
  try {
    const { conversationId, message } = SendMessageSchema.parse(req.body);
    const userId = req.user!.id;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // 获取会话
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      res.write(`data: ${JSON.stringify({ error: "会话不存在" })}\n\n`);
      res.end();
      return;
    }

    const config = { configurable: { thread_id: conversation.threadId! } };

    // 流式调用
    const stream = await graph.stream(
      {
        messages: [new HumanMessage(message)],
        userId,
        conversationId: conversation.id,
      },
      { ...config, streamMode: "messages" }
    );

    for await (const [message, metadata] of stream) {
      if (message.content) {
        res.write(
          `data: ${JSON.stringify({
            type: "content",
            content: message.content,
            agent: metadata.langgraph_node,
          })}\n\n`
        );
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    console.error("Stream error:", error);
    res.write(`data: ${JSON.stringify({ error: "流式处理错误" })}\n\n`);
    res.end();
  }
});

export default router;
```

### 5.2 审批接口

```typescript
// src/routes/approval.routes.ts
import { Router } from "express";
import { z } from "zod";
import { Command } from "@langchain/langgraph";
import { createCustomerServiceGraph } from "../agents/graph";
import prisma from "../lib/prisma";

const router = Router();
const graph = createCustomerServiceGraph();

// 获取待审批列表
router.get("/pending", async (req, res) => {
  try {
    const approvals = await prisma.approval.findMany({
      where: { status: "PENDING" },
      include: {
        conversation: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            messages: { orderBy: { createdAt: "desc" }, take: 5 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(approvals);
  } catch (error) {
    console.error("Fetch approvals error:", error);
    res.status(500).json({ error: "获取审批列表失败" });
  }
});

// 处理审批
const ApprovalActionSchema = z.object({
  approved: z.boolean(),
  note: z.string().optional(),
});

router.post("/:id/action", async (req, res) => {
  try {
    const { id } = req.params;
    const { approved, note } = ApprovalActionSchema.parse(req.body);
    const approverId = req.user!.id;

    // 获取审批记录
    const approval = await prisma.approval.findUnique({
      where: { id },
      include: { conversation: true },
    });

    if (!approval) {
      return res.status(404).json({ error: "审批记录不存在" });
    }

    if (approval.status !== "PENDING") {
      return res.status(400).json({ error: "该审批已处理" });
    }

    // 更新审批状态
    await prisma.approval.update({
      where: { id },
      data: {
        status: approved ? "APPROVED" : "REJECTED",
        approvedBy: approverId,
        approvedAt: new Date(),
        reason: note,
      },
    });

    // 使用 Command.resume 继续 Agent 执行
    const config = {
      configurable: { thread_id: approval.conversation.threadId! },
    };

    const result = await graph.invoke(
      Command.resume({ approved, note }),
      config
    );

    // 保存 AI 回复
    const aiResponse = result.messages[result.messages.length - 1].content as string;
    await prisma.message.create({
      data: {
        conversationId: approval.conversationId,
        role: "ASSISTANT",
        content: aiResponse,
        metadata: { approvalResult: approved ? "approved" : "rejected" },
      },
    });

    // 更新会话状态
    await prisma.conversation.update({
      where: { id: approval.conversationId },
      data: { status: "ACTIVE" },
    });

    res.json({
      success: true,
      message: approved ? "审批已通过" : "审批已拒绝",
      aiResponse,
    });
  } catch (error) {
    console.error("Approval action error:", error);
    res.status(500).json({ error: "处理审批失败" });
  }
});

export default router;
```

---

## 六、项目结构

```
customer-service-system/
├── src/
│   ├── agents/                    # AI Agent 核心
│   │   ├── types.ts               # 状态类型定义
│   │   ├── guardrails/            # 护栏系统
│   │   │   └── index.ts
│   │   ├── rag/                   # RAG 检索
│   │   │   └── index.ts
│   │   ├── agents/                # Agent 定义
│   │   │   └── index.ts
│   │   ├── graph/                 # LangGraph 组装
│   │   │   └── index.ts
│   │   └── example.ts             # 使用示例
│   ├── controllers/               # 控制器
│   │   ├── chat.controller.ts
│   │   ├── approval.controller.ts
│   │   ├── knowledge.controller.ts
│   │   └── ticket.controller.ts
│   ├── middlewares/               # Express 中间件
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validate.middleware.ts
│   ├── routes/                    # 路由
│   │   ├── chat.routes.ts
│   │   ├── approval.routes.ts
│   │   ├── knowledge.routes.ts
│   │   ├── ticket.routes.ts
│   │   └── index.ts
│   ├── services/                  # 服务层
│   │   ├── conversation.service.ts
│   │   ├── approval.service.ts
│   │   ├── knowledge.service.ts
│   │   └── ticket.service.ts
│   ├── lib/                       # 库
│   │   ├── prisma.ts
│   │   └── redis.ts
│   ├── types/                     # TypeScript 类型
│   │   └── index.ts
│   ├── utils/                     # 工具函数
│   │   ├── jwt.ts
│   │   ├── logger.ts
│   │   └── response.ts
│   └── app.ts                     # 应用入口
├── prisma/
│   └── schema.prisma              # 数据库模型
├── .env
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 七、总结

### 技术要点回顾

| 模块 | 技术栈 | 说明 |
|------|-------|------|
| **架构模式** | Handoffs | Agent 之间灵活交接对话控制权 |
| **知识检索** | RAG + Chroma | 向量检索 + 重排序 + 答案生成 |
| **人工介入** | HITL + interrupt | 敏感操作暂停，等待人工审批 |
| **安全防护** | Guardrails | 输入验证 + 敏感词 + 注入检测 + 输出脱敏 |
| **会话管理** | MemorySaver | 多轮对话上下文保持 |
| **流式输出** | SSE | 实时展示 AI 回复 |

### 架构亮点

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           项目架构亮点                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Handoffs 模式 - 灵活的多专家协作                                         │
│     ┌───────────────────────────────────────────────────────────────────┐   │
│     │   General Agent ←→ Tech Expert ←→ Sales Expert                    │   │
│     │        ↓                                                          │   │
│     │   Human Agent (HITL)                                              │   │
│     │                                                                   │   │
│     │   任意 Agent 都可以交接给其他 Agent，保持上下文                     │   │
│     └───────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  2. 护栏系统 - 多层防护                                                      │
│     ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│     │长度检查  │→│敏感词   │→│注入检测  │→│意图预检  │→│输出脱敏  │          │
│     └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                                              │
│  3. RAG 检索 - 知识驱动回答                                                  │
│     • 向量相似度检索                                                         │
│     • LLM 重排序提升精准度                                                   │
│     • 置信度评估，低于阈值转人工                                             │
│                                                                              │
│  4. HITL - 敏感操作人工审批                                                  │
│     • interrupt() 暂停执行                                                   │
│     • Command.resume() 继续执行                                              │
│     • 审批结果影响后续回复                                                   │
│                                                                              │
│  5. 可观测性 - 完整日志追踪                                                  │
│     • 护栏日志：记录拦截原因                                                 │
│     • Agent 日志：记录决策过程                                               │
│     • 审批日志：记录人工操作                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 项目亮点

1. **Handoffs 架构**：通用客服 + 技术专家 + 售后专员，灵活转接
2. **RAG 知识库**：向量检索 + 重排序，准确回答 FAQ
3. **HITL 人工介入**：退款等敏感操作，自动提交审批
4. **护栏系统**：输入验证 + 敏感词过滤 + 注入检测 + 输出脱敏
5. **会话记忆**：支持多轮对话，上下文完整保持
6. **工单系统**：自动创建工单，跟踪问题处理

### 扩展方向

- 添加 **情感分析**：检测用户情绪，主动安抚
- 接入 **语音客服**：支持语音输入输出
- 添加 **多语言支持**：自动检测语言，多语言回复
- 接入 **CRM 系统**：获取用户画像，个性化服务
- 添加 **智能质检**：自动评估客服质量
- 支持 **A/B 测试**：测试不同回复策略效果
