# Deep Agents 概览 - 深度解读

---

## 1. 一句话省流 (The Essence)

**Deep Agents 就是一个"开箱即用的超级 AI 管家套件"** —— 它帮你打包好了任务规划、文件管理、分身术（子代理）、长期记忆等高级功能，让你不用从零搭建就能创建一个能处理复杂任务的 AI 助手。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：没有 Deep Agents 之前，我们有多惨？

| 痛点 | 具体表现 |
|------|----------|
| **上下文爆炸** | 你让 AI 分析一个超长文档，结果 token 超限，AI 直接"失忆"了前面的内容，回答驴唇不对马嘴 |
| **复杂任务一团糟** | 让 AI 做个多步骤任务（比如：先查资料、再写代码、最后测试），它经常做到一半就忘了下一步该干嘛 |
| **重复造轮子** | 每次想给 AI 加个"读写文件"或"记住用户偏好"的功能，都得自己写一大堆代码 |
| **子任务管理混乱** | AI 在处理主任务时又要处理子任务，结果上下文全混在一起，脑子都乱了 |
| **健忘症** | 今天告诉 AI "我喜欢简洁的代码风格"，明天它就忘得一干二净 |

### 解决方案：Deep Agents 是怎么拯救我们的？

| 功能 | 解决方案 |
|------|----------|
| **Planning（任务规划）** | 内置 `write_todos` 工具，让 AI 自动把大任务拆成小步骤，一步步执行，再也不会"做着做着忘了" |
| **File System（文件系统）** | 内置 `ls`、`read_file`、`write_file` 等工具，AI 可以把长内容"暂存"到文件里，避免上下文爆炸 |
| **Subagent（子代理）** | 内置 `task` 工具，可以派出"分身"去处理子任务，互不干扰，主 Agent 保持头脑清醒 |
| **Long-term Memory（长期记忆）** | 集成 LangGraph 的 Memory Store，AI 能跨对话记住你的偏好和历史 |
| **Pluggable Backend（可插拔后端）** | 文件系统可以是内存、本地磁盘、云存储、沙箱，随你切换，超级灵活 |

---

## 3. 生活化/职场类比 (The Analogy)

想象你是一家公司的 **CEO（老板）**，你需要完成一个超级复杂的项目。

### 没有 Deep Agents 的情况：

你一个人干所有事：

- 自己记所有待办事项（经常忘）
- 所有文档堆在脑子里（信息过载，头都炸了）
- 想找人帮忙？得自己从头培训
- 昨天客户说的需求？早忘了

### 有了 Deep Agents 的情况：

你有了一整套现代化办公系统！

| Deep Agents 功能 | 对应办公场景 |
|-----------------|-------------|
| **Planning（任务规划）** | 你有一个智能的 **项目管理软件**，自动把大项目拆成小任务，还会追踪进度 |
| **File System（文件系统）** | 你有一个 **智能文件柜**，随时存取大量资料，不用全塞脑子里 |
| **Subagent（子代理）** | 你可以 **派出专员/外包团队** 处理具体子任务，他们有独立工位，不会和你的工作搅在一起 |
| **Long-term Memory（长期记忆）** | 你有一本 **公司知识库/CRM系统**，记录客户偏好、历史订单，永不丢失 |
| **Pluggable Backend（可插拔后端）** | 你可以选择把文件存在 **本地服务器、云端、或保密沙箱**，按需切换 |

**核心类比映射表：**

| 技术术语 | 生活类比 |
|---------|---------|
| Deep Agent（深度代理） | 你，CEO + 整套办公系统 |
| Context（上下文） | 你当前脑子里记着的所有信息 |
| Planning/Todos | 项目管理软件里的任务清单 |
| File System | 智能文件柜 |
| Subagent（子代理） | 专项外包团队，干完活交报告就走 |
| Memory Store | 公司知识库/CRM |

---

## 4. 关键概念拆解 (Key Concepts)

### 1) Agent Harness（代理框架/马甲）

官方称 Deep Agents 是一个 "Agent Harness"——你可以理解为一套 **"预装了各种神器的战甲"**。普通 Agent 就是个光杆司令，而 Deep Agent 出场就自带装备（任务规划、文件系统、记忆等）。

### 2) Planning and Task Decomposition（任务规划与分解）

内置的 `write_todos` 工具，让 AI 能把复杂任务拆成一步步的 checklist，并追踪进度。就像项目经理把"发布一款 APP"拆成"设计 -> 开发 -> 测试 -> 上线"。

### 3) Context Management（上下文管理）

通过文件系统工具（`ls`、`read_file`、`write_file`、`edit_file`），AI 可以把大量信息"卸载"到虚拟文件里，而不是全塞在对话上下文中。这样就不会触发 token 上限导致"失忆"。

### 4) Subagent Spawning（子代理召唤/分身术）

通过 `task` 工具，主 Agent 可以"生成"一个独立的子 Agent 去处理特定子任务。子 Agent 有自己独立的上下文，干完活汇报结果，不会污染主 Agent 的思路。

### 5) Pluggable Filesystem Backends（可插拔文件系统后端）

虚拟文件系统的存储位置可以随意切换：
- **In-memory**：内存里，速度快但关了就没了
- **Local Disk**：本地硬盘
- **LangGraph Store**：持久化存储，跨对话保留
- **Sandbox**：沙箱环境（Modal、Daytona、Deno），隔离执行代码，安全又放心

---

## 5. 代码"人话"解读 (Code Walkthrough)

文档中的示例代码：

```ts
import * as z from "zod";
import { createDeepAgent } from "deepagents";
import { tool } from "langchain";

// 第一步：定义一个自定义工具 —— 查天气
const getWeather = tool(
  ({ city }) => `It's always sunny in ${city}!`,  // 工具的执行逻辑：返回天气信息
  {
    name: "get_weather",                           // 工具名称
    description: "Get the weather for a given city", // 工具描述（AI 靠这个理解什么时候用它）
    schema: z.object({ city: z.string() }),        // 参数校验：city 必须是字符串
  },
);

// 第二步：创建一个 Deep Agent，把工具装进去
const agent = createDeepAgent({
  tools: [getWeather],                             // 给 Agent 装备上 getWeather 工具
  system: "You are a helpful assistant",           // 系统人设：你是一个乐于助人的助手
});

// 第三步：调用 Agent，让它处理用户问题
console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  })
);
```

### 这段代码在干嘛？（人话版）

1. **造了一个"查天气"的工具**：告诉 AI，如果用户问天气，就用这个工具，传入城市名，返回天气结果。

2. **创建一个 Deep Agent**：这个 Agent 开箱就带 planning、文件系统、子代理等功能，你只需要额外加上自己的业务工具（比如 getWeather）。

3. **让 Agent 干活**：用户问"东京天气怎么样"，Agent 自动识别需要调用 `get_weather` 工具，传入 `Tokyo`，返回结果。

**重点理解：**
- `createDeepAgent` 比普通的 `createAgent` 强大，因为它自带了一堆内置能力（规划、文件、记忆等）
- 你只需要关心自己的业务逻辑（比如查天气），其他脏活累活 Deep Agents 帮你搞定

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：开发一个"智能代码审查助手"

假设你要开发一个 AI 助手，帮团队审查代码：

**需求：**
1. 读取 GitHub PR 里的所有改动文件（可能有几十个文件，内容超长）
2. 分析每个文件的代码质量
3. 生成审查报告
4. 记住团队的代码规范偏好（比如：我们团队禁止使用 `any` 类型）

**不用 Deep Agents 的痛苦：**

| 问题 | 后果 |
|------|------|
| 文件太多，上下文爆炸 | AI 分析到第 10 个文件就"失忆"了，前面的分析全忘了 |
| 任务复杂，步骤丢失 | AI 分析完 A 文件忘了还要分析 B、C、D 文件 |
| 团队规范记不住 | 每次审查都要重新告诉 AI "我们不允许用 any"，累死 |
| 代码隔离执行难 | 想让 AI 跑一下代码看看有没有 bug？风险太大 |

**用了 Deep Agents 之后：**

| Deep Agents 功能 | 效果 |
|-----------------|------|
| **File System** | 把每个文件内容存入虚拟文件系统，AI 按需读取，不会上下文爆炸 |
| **Planning** | 自动拆解任务："1. 列出所有文件 -> 2. 逐个分析 -> 3. 汇总报告"，有条不紊 |
| **Subagent** | 每个文件派一个子 Agent 分析，互不干扰，最后汇总结果 |
| **Memory** | 团队代码规范存入长期记忆，下次审查自动调用，再也不用重复交代 |
| **Sandbox Backend** | 代码跑在隔离沙箱里，安全执行，不怕误操作 |

---

## 7. Deep Agents vs 普通 Agent —— 什么时候该用？

| 场景 | 推荐方案 |
|------|---------|
| 简单问答、单轮对话 | 普通 `createAgent` 就够了 |
| 复杂多步骤任务 | **Deep Agents** |
| 需要处理大量上下文 | **Deep Agents**（文件系统卸载上下文） |
| 需要跨对话记住用户偏好 | **Deep Agents**（长期记忆） |
| 需要隔离执行代码 | **Deep Agents**（沙箱后端） |
| 需要多个 Agent 协作 | **Deep Agents**（子代理） |

---

## 8. 总结 (Takeaway)

Deep Agents 就像给你的 AI 助手装上了一套 **"高级办公套件"**：

- **任务管理器**：不再丢三落四
- **智能文件柜**：处理海量信息不爆炸
- **分身术**：复杂子任务独立处理
- **长期记忆**：永远记住你的偏好
- **灵活存储**：内存、磁盘、云端、沙箱随你选

如果你要做一个"能打"的 AI 应用，尤其是涉及复杂任务、大量上下文、多轮记忆的场景，**Deep Agents 是你的首选**。

---

> 原文档路径：`/Users/bytedance/Desktop/langchain-ts-docs/DeepAgentsDocs/en/01-Deep Agents overview.md`
