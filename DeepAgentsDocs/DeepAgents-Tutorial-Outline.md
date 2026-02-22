# DeepAgents 系列教程内容规划

## 一、系列定位

### 目标读者
- 有一定 TypeScript/JavaScript 基础的开发者
- 对 AI Agent 开发感兴趣的工程师
- 希望构建生产级自主代理系统的团队
- 已了解 LangChain/LangGraph 基础概念的学习者

### 学习目标
- 掌握 DeepAgents 核心 API 和架构设计
- 理解虚拟文件系统和后端抽象层
- 学会构建多代理协作系统
- 实现人机协作和安全执行环境
- 掌握长期记忆和技能系统
- 能够独立开发生产级 AI 代理应用

### 写作方法：三合一融合法

每篇文章采用"官方文档 + 通俗解读 + 实践示例"的三合一融合方式：

1. **官方概念（What）**：准确呈现 DeepAgents 官方定义和 API 规范
2. **通俗理解（Why）**：用生活化类比解释设计理念和使用场景
3. **代码实践（How）**：提供可运行的完整示例，边学边练

---

## 二、教程大纲

### 第一部分：基础入门篇（3篇）

#### 01. DeepAgents 概览：重新定义自主代理
**对应文档**: `01-Deep Agents overview.md`

**核心内容**:
- DeepAgents 是什么：从"指令执行"到"自主规划"
- 五大核心能力：规划、上下文管理、子代理、记忆、代码执行
- createDeepAgent() API 初识
- 与传统 Agent 框架的对比

**通俗类比**: 
- 普通 Agent 像"计算器"，给一步算一步
- DeepAgents 像"项目经理"，能自己拆解任务、分配工作、记住经验

**实践项目**: 创建第一个 DeepAgent，实现天气查询助手

**预计篇幅**: 2500-3000字

---

#### 02. 快速开始：5分钟创建你的第一个深度代理
**对应文档**: `02-Quickstart.md`

**核心内容**:
- 环境安装与配置
- 最小化示例：带工具的代理
- invoke vs stream 调用方式
- 理解代理的执行流程

**代码示例**:
```typescript
import { createDeepAgent } from "@langchain/langgraph-agents";

const agent = createDeepAgent({
  tools: [getWeatherTool],
  systemPrompt: "你是一个天气助手",
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "北京天气如何？" }]
});
```

**实践项目**: 构建一个多功能助手（天气 + 计算 + 搜索）

**预计篇幅**: 2000-2500字

---

#### 03. 自定义配置：打造专属代理
**对应文档**: `03-Customize Deep Agents.md`

**核心内容**:
- 九大配置项详解：model、tools、systemPrompt、middleware、subagents、backend、interruptOn、skills、memory
- 多模型提供商支持（OpenAI、Anthropic、Google、Azure）
- 结构化输出（responseFormat）
- 配置最佳实践

**通俗类比**: 
- 配置代理就像"装修房子"
- model 是"大脑"，tools 是"双手"，systemPrompt 是"职业培训"
- backend 是"档案室"，skills 是"技能证书"

**实践项目**: 创建一个可切换模型的多功能代理

**预计篇幅**: 3000-3500字

---

### 第二部分：后端系统篇（3篇）

#### 04. 虚拟文件系统：代理的"数据仓库"
**对应文档**: `05-Backends.md`（基础部分）

**核心内容**:
- 为什么需要虚拟文件系统？
- Backend 抽象层设计理念
- FileData 数据结构解析
- 文件系统工具（ls、read_file、write_file、edit_file）

**通俗类比**: 
- 虚拟文件系统像代理的"个人云盘"
- 可以存临时笔记（State），也可以写入本地（Filesystem），还能跨会话保存（Store）

**实践项目**: 实现一个笔记管理代理

**预计篇幅**: 2500-3000字

---

#### 05. 后端类型详解：五种存储策略
**对应文档**: `05-Backends.md`（进阶部分）

**核心内容**:
- StateBackend：临时状态存储（内存级）
- FilesystemBackend：本地磁盘持久化
- LocalShellBackend：带命令执行能力
- StoreBackend：跨线程持久化存储
- 各后端的适用场景对比

**代码示例**:
```typescript
// StateBackend - 临时存储
const stateBackend = (rt) => new StateBackend(rt);

// FilesystemBackend - 本地持久化
const fsBackend = (rt) => new FilesystemBackend(rt, {
  workingDirectory: "/project"
});

// LocalShellBackend - 带执行能力
const shellBackend = (rt) => new LocalShellBackend(rt, {
  workingDirectory: "/project"
});
```

**实践项目**: 构建一个文件管理代理，支持本地读写

**预计篇幅**: 3000-3500字

---

#### 06. CompositeBackend：多后端路由策略
**对应文档**: `05-Backends.md` + `08-Long-term memory.md`

**核心内容**:
- CompositeBackend 设计理念：统一入口，分路存储
- 路径路由机制详解
- 默认后端与路由后端的协作
- 典型架构模式

**代码示例**:
```typescript
const compositeBackend = (rt) => new CompositeBackend(
  new StateBackend(rt),  // 默认后端
  {
    "/memories/": new StoreBackend(rt),      // 记忆路由
    "/workspace/": new FilesystemBackend(rt), // 工作区路由
  },
);
```

**通俗类比**: 
- CompositeBackend 像"智能快递柜"
- 根据包裹标签（路径前缀），自动分拣到不同储物格

**实践项目**: 实现带持久记忆的助手代理

**预计篇幅**: 2500-3000字

---

### 第三部分：高级功能篇（4篇）

#### 07. 子代理系统：任务委托的艺术
**对应文档**: `06-Subagents.md`

**核心内容**:
- 子代理的设计理念：专业化分工
- SubAgent vs CompiledSubAgent
- 上下文隔离机制
- 子代理配置项详解
- task 工具的使用

**通俗类比**: 
- 主代理像"项目总监"，子代理像"专业顾问"
- 总监遇到专业问题时，找对应顾问处理
- 顾问有自己的"办公室"（隔离上下文），完成后只汇报结果

**代码示例**:
```typescript
const researchAgent: SubAgent = {
  name: "researcher",
  description: "专门负责信息搜索和整理",
  systemPrompt: "你是一个研究专家...",
  tools: [webSearchTool, summarizeTool],
};

const mainAgent = createDeepAgent({
  subagents: [researchAgent],
  systemPrompt: "你是一个项目经理..."
});
```

**实践项目**: 构建"经理+研究员+写手"三代理协作系统

**预计篇幅**: 3500-4000字

---

#### 08. 人机协作：interrupt_on 机制详解
**对应文档**: `07-Human-in-the-loop.md`

**核心内容**:
- 为什么需要人机协作？
- interrupt_on 配置详解
- 三种决策类型：approve、edit、reject
- 检查点（Checkpointer）的作用
- 状态恢复与继续执行

**通俗类比**: 
- interrupt_on 像"审批流程"
- 代理遇到重要操作时"暂停等待签字"
- 人类可以"批准"、"修改后批准"或"拒绝"

**代码示例**:
```typescript
const agent = createDeepAgent({
  tools: [writeFileTool, deleteFileTool],
  interruptOn: [
    { toolName: "delete_file" },  // 删除文件需审批
    { toolName: "write_file", condition: "size > 1000" }
  ],
});
```

**实践项目**: 构建带审批流程的文件管理代理

**预计篇幅**: 3000-3500字

---

#### 09. 长期记忆：让代理"记住"你
**对应文档**: `08-Long-term memory.md`

**核心内容**:
- 长期记忆的实现原理
- StoreBackend 的跨线程持久化
- /memories/ 路径约定
- 记忆的读写模式
- 记忆 vs 上下文 vs 技能的区别

**代码示例**:
```typescript
const agentWithMemory = createDeepAgent({
  backend: (rt) => new CompositeBackend(
    new StateBackend(rt),
    { "/memories/": new StoreBackend(rt) }
  ),
  systemPrompt: `你有长期记忆能力。
    读取记忆：read_file("/memories/user_preferences.md")
    保存记忆：write_file("/memories/learned_facts.md", content)`
});
```

**通俗类比**: 
- 普通代理像"金鱼"，对话结束就忘了
- 带记忆的代理像"老朋友"，记得你的喜好和历史

**实践项目**: 构建"记住用户偏好"的个性化助手

**预计篇幅**: 2500-3000字

---

#### 10. 技能系统：可复用的专业能力
**对应文档**: `09-Skills.md`

**核心内容**:
- Skills 的设计理念：渐进式披露
- SKILL.md 文件格式详解
- Frontmatter 元数据配置
- 技能加载时机和触发条件
- Skills vs Memory 对比

**SKILL.md 格式**:
```markdown
---
name: react-component-generator
description: 生成 React 组件的技能
compatibility:
  - React
allowed-tools:
  - write_file
  - read_file
---

# React 组件生成技能

## 使用方法
当用户要求创建 React 组件时...

## 代码模板
...
```

**通俗类比**: 
- Skills 像"技能证书"，代理按需加载
- Memory 像"日记本"，记录个人经历
- Skills 是"公共知识"，Memory 是"私人记忆"

**实践项目**: 为代理创建"代码生成"技能包

**预计篇幅**: 3000-3500字

---

### 第四部分：安全执行篇（2篇）

#### 11. 沙箱系统概览：安全的代码执行环境
**对应文档**: `10-Sandboxes.md`（上篇）

**核心内容**:
- 为什么需要沙箱？安全性考量
- 两种模式："代理在沙箱内" vs "沙箱作为工具"
- 沙箱提供商对比（Modal、Daytona、Deno）
- 安全最佳实践

**通俗类比**: 
- 沙箱像"实验室防护服"
- 代理执行危险操作时，在隔离环境中进行
- 即使出错，也不会影响真实系统

**实践项目**: 搭建基于 Deno 的安全执行环境

**预计篇幅**: 2500-3000字

---

#### 12. 沙箱实战：Modal 和 Daytona 集成
**对应文档**: `10-Sandboxes.md`（下篇）

**核心内容**:
- Modal 沙箱配置与使用
- Daytona 沙箱配置与使用
- 沙箱内的文件系统操作
- 网络访问控制
- 资源限制配置

**代码示例**:
```typescript
// Modal 沙箱
import { ModalSandbox } from "@langchain/langgraph-agents/sandbox";

const sandbox = new ModalSandbox({
  image: "python:3.11",
  timeout: 60,
});

// Daytona 沙箱
import { DaytonaSandbox } from "@langchain/langgraph-agents/sandbox";

const sandbox = new DaytonaSandbox({
  workspace: "my-project",
});
```

**实践项目**: 构建安全的代码执行代理

**预计篇幅**: 3000-3500字

---

### 第五部分：流式处理篇（2篇）

#### 13. 流式输出概览：实时响应的艺术
**对应文档**: `12-stream-Overview.md`

**核心内容**:
- 为什么需要流式输出？用户体验优化
- 子图流式处理机制
- 命名空间路由详解
- 流模式选择（updates、messages、custom）
- LLM Token 流式输出

**代码示例**:
```typescript
const stream = await agent.stream(
  { messages },
  { 
    streamMode: "messages",
    subgraphs: true  // 启用子代理流式
  }
);

for await (const [namespace, chunk] of stream) {
  if (namespace.includes("researcher")) {
    console.log("研究员:", chunk);
  } else {
    console.log("主代理:", chunk);
  }
}
```

**通俗类比**: 
- 非流式像"等外卖"，必须全部做好才送
- 流式像"自助餐厅"，做好一道上一道

**预计篇幅**: 2500-3000字

---

#### 14. 前端流式集成：useStream Hook 详解
**对应文档**: `11-stream-Frontend.md`

**核心内容**:
- useStream React Hook 介绍
- SubagentStream 接口详解
- filterSubagentMessages 选项
- 前端 UI 状态管理
- 实时更新最佳实践

**代码示例**:
```typescript
import { useStream } from "@langchain/langgraph-sdk/react";

function ChatComponent() {
  const { messages, subagentStreams, isLoading } = useStream({
    assistantId: "deep-agent",
    filterSubagentMessages: true,
  });

  return (
    <div>
      {subagentStreams.map(stream => (
        <SubagentPanel 
          key={stream.name}
          status={stream.status}
          toolCalls={stream.toolCalls}
        />
      ))}
    </div>
  );
}
```

**实践项目**: 构建带子代理状态展示的聊天界面

**预计篇幅**: 3000-3500字

---

### 第六部分：CLI 工具篇（2篇）

#### 15. Deep Agents CLI：终端中的 AI 助手
**对应文档**: `13-Deep Agents CLI.md`（上篇）

**核心内容**:
- CLI 安装与配置
- 内置工具介绍（12个核心工具）
- 斜杠命令和快捷键
- 配置文件 config.toml 详解
- 模型提供商配置

**内置工具清单**:
| 工具 | 功能 |
|------|------|
| ls | 列出目录内容 |
| read_file | 读取文件 |
| write_file | 写入文件 |
| edit_file | 编辑文件 |
| glob | 文件模式匹配 |
| grep | 正则搜索 |
| shell/execute | 执行命令 |
| web_search | 网络搜索 |
| fetch_url | 获取 URL 内容 |
| task | 委托子代理 |
| write_todos | 任务管理 |

**实践项目**: 使用 CLI 完成一个代码重构任务

**预计篇幅**: 3000-3500字

---

#### 16. CLI 高级用法：记忆协议与沙箱集成
**对应文档**: `13-Deep Agents CLI.md`（下篇）

**核心内容**:
- 记忆优先协议（Memory-first Protocol）
- AGENTS.md 项目约定文件
- 沙箱模式配置
- 多模型切换
- 自定义工具集成

**AGENTS.md 示例**:
```markdown
# 项目约定

## 代码风格
- 使用 TypeScript
- 遵循 ESLint 配置
- 组件使用函数式写法

## 测试约定
- 使用 Vitest
- 覆盖率要求 > 80%
```

**实践项目**: 为项目配置 CLI 开发环境

**预计篇幅**: 2500-3000字

---

### 第七部分：进阶配置篇（2篇）

#### 17. 中间件系统：扩展代理能力
**对应文档**: `03-Customize Deep Agents.md` + `04-Harness capabilities.md`

**核心内容**:
- 中间件设计模式
- 内置中间件详解
  - TodoListMiddleware：任务管理
  - FilesystemMiddleware：文件系统增强
  - SubAgentMiddleware：子代理管理
  - SummarizationMiddleware：上下文摘要
  - AnthropicPromptCachingMiddleware：缓存优化
  - PatchToolCallsMiddleware：工具调用修补
- 自定义中间件开发

**代码示例**:
```typescript
import { 
  SummarizationMiddleware,
  TodoListMiddleware 
} from "@langchain/langgraph-agents/middleware";

const agent = createDeepAgent({
  middleware: [
    new TodoListMiddleware(),
    new SummarizationMiddleware({ maxTokens: 4000 }),
  ],
});
```

**实践项目**: 开发一个"操作日志"中间件

**预计篇幅**: 3500-4000字

---

#### 18. 自定义模型提供商
**对应文档**: `14-Custom model providers.md`

**核心内容**:
- config.toml 配置详解
- 支持的模型提供商列表
- class_path 自定义提供商
- 模型参数配置
- 多模型策略

**代码示例**:
```toml
# ~/.deepagents/config.toml

[providers.my-custom-model]
class_path = "langchain_community.chat_models.ChatOllama"
model = "llama3.1"
temperature = 0.7

[providers.anthropic]
api_key_env = "ANTHROPIC_API_KEY"
default_model = "claude-sonnet-4-20250514"
```

**实践项目**: 配置本地 Ollama 模型作为后端

**预计篇幅**: 2500-3000字

---

### 第八部分：项目实战篇（4篇）

#### 19. 实战项目一：智能代码助手
**综合应用**: 后端系统 + CLI工具 + 子代理

**项目描述**:
构建一个能够理解项目结构、执行代码修改、运行测试的智能代码助手

**核心功能**:
- 项目结构分析
- 代码搜索和定位
- 智能代码修改
- 自动化测试执行
- 错误诊断和修复

**技术栈**:
- FilesystemBackend 本地文件操作
- LocalShellBackend 命令执行
- SubAgent 任务分工（分析、修改、测试）

**预计篇幅**: 4000-4500字

---

#### 20. 实战项目二：研究助理系统
**综合应用**: 子代理 + 长期记忆 + 流式输出

**项目描述**:
构建一个能够搜索资料、整理笔记、生成报告的研究助理

**核心功能**:
- 多源信息搜索
- 自动笔记整理
- 知识图谱构建
- 研究报告生成
- 历史研究记录

**架构设计**:
```
MainAgent (研究总监)
├── SearcherAgent (信息搜索)
├── AnalyzerAgent (内容分析)
├── WriterAgent (报告撰写)
└── MemoryStore (知识库)
```

**预计篇幅**: 4500-5000字

---

#### 21. 实战项目三：安全代码执行平台
**综合应用**: 沙箱系统 + 人机协作 + 流式输出

**项目描述**:
构建一个安全的代码执行平台，支持多语言代码运行

**核心功能**:
- 多语言代码执行（Python、JavaScript、Go）
- 执行结果可视化
- 资源使用监控
- 危险操作审批
- 执行历史记录

**安全策略**:
- 沙箱隔离执行
- 资源限制配置
- 网络访问控制
- 人机协作审批

**预计篇幅**: 4000-4500字

---

#### 22. 实战项目四：多代理协作工作流
**综合应用**: 全部核心功能

**项目描述**:
构建一个完整的多代理协作系统，模拟软件开发团队

**角色设计**:
- ProductManager：需求分析和任务拆解
- Architect：技术方案设计
- Developer：代码实现
- Reviewer：代码审查
- Tester：测试执行

**工作流程**:
```
需求输入 → PM分析 → 架构设计 → 开发实现 → 代码审查 → 测试验证 → 交付
```

**核心技术**:
- CompiledSubAgent 复杂子代理
- CompositeBackend 多后端路由
- interrupt_on 关键节点审批
- 流式输出实时展示

**预计篇幅**: 5000-5500字

---

## 三、教程统计

| 部分 | 篇数 | 预计总字数 |
|------|------|------------|
| 基础入门篇 | 3 | 7,500-9,000 |
| 后端系统篇 | 3 | 8,000-9,500 |
| 高级功能篇 | 4 | 12,000-14,000 |
| 安全执行篇 | 2 | 5,500-6,500 |
| 流式处理篇 | 2 | 5,500-6,500 |
| CLI工具篇 | 2 | 5,500-6,500 |
| 进阶配置篇 | 2 | 6,000-7,000 |
| 项目实战篇 | 4 | 17,500-19,500 |
| **总计** | **22** | **67,500-78,500** |

---

## 四、学习路径建议

### 快速入门路径（3篇）
适合想快速上手的开发者：
1. 01-DeepAgents 概览
2. 02-快速开始
3. 03-自定义配置

### 后端专精路径（+3篇）
适合需要深入理解存储机制的开发者：
4. 04-虚拟文件系统
5. 05-后端类型详解
6. 06-CompositeBackend

### 多代理专精路径（+2篇）
适合构建复杂代理系统的开发者：
7. 07-子代理系统
8. 20-研究助理系统

### 安全执行路径（+2篇）
适合需要安全代码执行的场景：
9. 11-沙箱系统概览
10. 12-沙箱实战

### 完整学习路径（22篇）
按顺序学习全部内容，约需 15-20 小时

---

## 五、项目架构模板

### 基础项目结构
```
my-deep-agent-project/
├── src/
│   ├── agents/
│   │   ├── main-agent.ts      # 主代理配置
│   │   └── sub-agents/        # 子代理定义
│   │       ├── researcher.ts
│   │       └── writer.ts
│   ├── backends/
│   │   └── composite.ts       # 后端配置
│   ├── skills/
│   │   └── SKILL.md           # 技能定义
│   ├── middleware/
│   │   └── custom.ts          # 自定义中间件
│   └── tools/
│       └── custom-tools.ts    # 自定义工具
├── config/
│   └── config.toml            # 模型配置
├── tests/
│   └── agent.test.ts
├── package.json
└── tsconfig.json
```

### 核心文件模板

**main-agent.ts**:
```typescript
import { createDeepAgent } from "@langchain/langgraph-agents";
import { compositeBackend } from "../backends/composite";
import { researcherAgent, writerAgent } from "./sub-agents";
import { customTools } from "../tools/custom-tools";

export const mainAgent = createDeepAgent({
  model: "gpt-4o",
  tools: customTools,
  subagents: [researcherAgent, writerAgent],
  backend: compositeBackend,
  systemPrompt: `你是一个智能助手...`,
  interruptOn: [{ toolName: "dangerous_operation" }],
});
```

**composite.ts**:
```typescript
import {
  CompositeBackend,
  StateBackend,
  StoreBackend,
  FilesystemBackend,
} from "@langchain/langgraph-agents/backends";

export const compositeBackend = (rt) => new CompositeBackend(
  new StateBackend(rt),
  {
    "/memories/": new StoreBackend(rt),
    "/workspace/": new FilesystemBackend(rt, {
      workingDirectory: process.cwd(),
    }),
  }
);
```

---

## 六、附录

### 官方资源
- DeepAgents 官方文档
- LangGraph 文档
- LangChain 文档

### 相关教程
- LangChain 系列教程（36篇）
- LangGraph 系列教程（25篇）

### 术语表
| 术语 | 解释 |
|------|------|
| DeepAgent | 具有规划、记忆、代码执行能力的自主代理 |
| Backend | 虚拟文件系统的存储后端抽象 |
| SubAgent | 可被主代理委托任务的子代理 |
| HITL | Human-in-the-Loop，人机协作机制 |
| Sandbox | 隔离的安全代码执行环境 |
| Skills | 可按需加载的专业能力模块 |
| Middleware | 扩展代理能力的中间件 |
| Checkpointer | 状态检查点，用于状态持久化和恢复 |
