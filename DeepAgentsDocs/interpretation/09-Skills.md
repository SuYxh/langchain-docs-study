# Deep Agents Skills (技能系统) 深度解读

---

## 1. 一句话省流 (The Essence)

**Skills 就是给 AI Agent 装的"外挂模块"** —— 一套可插拔的专业能力包，让你的 Agent 在遇到特定任务时，能临时"开挂"，获得额外的专业知识和执行指南。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：没有 Skills 之前，我们有多惨？

1. **System Prompt 爆炸问题**：如果你想让 Agent 精通很多领域（比如既会查文档、又会搜论文、还会写代码），你得把所有指令都塞进系统提示词里。结果呢？Token 数量爆炸，模型又慢又贵，还可能因为上下文太长变"傻"。

2. **能力耦合问题**：所有能力写在一起，代码像一锅乱炖，改一个功能可能影响其他功能，维护起来想哭。

3. **复用困难**：你好不容易写了一套"如何正确查 LangGraph 文档"的指令，换个项目又得重写一遍。

### 解决方案：Skills 的聪明之处

Skills 采用了一个超聪明的设计——**渐进式披露（Progressive Disclosure）**：

- Agent **不会**一开始就加载所有技能的详细内容
- 它只读取每个技能的"简介"（frontmatter 里的 description）
- **只有当用户的问题确实需要某个技能时**，才去读取完整的技能文件

这就像你手机里装了 100 个 App，但不会同时打开它们，只有点击时才启动——**省内存、省流量、不卡顿**！

---

## 3. 生活化/职场类比 (The Analogy)

### 类比：公司的"外包顾问团"

想象你是一家创业公司的 CEO（主 Agent），你啥都要管，但不可能啥都精通。于是你建立了一个"顾问资源库"：

| 技术概念 | 类比角色 | 说明 |
|---------|---------|------|
| **Skills 目录** | 顾问通讯录 | 一个文件夹里存着各种顾问的联系方式和专长简介 |
| **SKILL.md 文件** | 顾问的"能力说明书" | 写着这个顾问能干嘛、怎么找他、他的工作流程 |
| **frontmatter (description)** | 顾问名片 | 一句话描述"我是干嘛的"，让你快速判断要不要找他 |
| **Progressive Disclosure** | 按需咨询 | 你不会一开始就让所有顾问来开会，而是有问题了才去找对应的人 |
| **Subagent Skills** | 外包团队的专属顾问 | 你外包出去的团队可以有自己的专属顾问，和你的顾问互不干扰 |

**具体场景**：

1. 有客户问"LangGraph 怎么用？"（用户 Prompt）
2. 你（Agent）翻了翻顾问通讯录，发现有个"LangGraph 文档专家"（看到 skill description 匹配）
3. 你打电话给他，让他发详细资料过来（读取完整的 SKILL.md）
4. 按照他给的 SOP 来回答客户（执行 skill 里的 instructions）

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 SKILL.md

技能的"说明书"文件，包含两部分：
- **Frontmatter**（头部元数据）：用 YAML 格式写的技能简介，必须包含 `name` 和 `description`
- **Instructions**（正文）：详细的执行指南，告诉 Agent 遇到这类问题该怎么一步步做

### 4.2 Progressive Disclosure（渐进式披露）

一种"懒加载"策略。Agent 平时只记住每个技能的"一句话简介"，只有确认需要用某个技能时，才去读取完整内容。好处是**省 Token、提高效率**。

### 4.3 Source Precedence（来源优先级）

当多个地方有同名技能时，**后来者居上**（last one wins）。比如：
```typescript
skills: ["/skills/user/", "/skills/project/"]
```
如果两个目录都有叫 `web-search` 的技能，用 `/skills/project/` 里的那个。

### 4.4 Skills vs Memory（技能 vs 记忆）

| 维度 | Skills | Memory (AGENTS.md) |
|-----|--------|-------------------|
| 加载时机 | 按需加载 | 启动时就全部加载 |
| 适用场景 | 任务相关、内容可能很大 | 项目级别的约定、偏好设置 |
| 比喻 | 外卖菜单（想吃什么再点） | 冰箱里的常备食材 |

### 4.5 Subagent Skills Isolation（子代理技能隔离）

主 Agent 和子 Agent 的技能是**完全隔离**的：
- 主 Agent 的技能，子 Agent 看不到
- 子 Agent 自己配置的技能，主 Agent 也看不到
- 这保证了各司其职、互不干扰

---

## 5. 代码/配置"人话"解读 (Code Walkthrough)

### 5.1 SKILL.md 文件结构

```markdown
---
name: langgraph-docs
description: Use this skill for requests related to LangGraph...
license: MIT
allowed-tools: fetch_url
---

# langgraph-docs

## Instructions

### 1. Fetch the documentation index
Use the fetch_url tool to read: https://docs.langchain.com/llms.txt
...
```

**人话翻译**：
- `name`: 这个技能叫什么（Agent 内部用来识别的 ID）
- `description`: **最重要！** Agent 就是靠这一句话决定要不要用这个技能的
- `allowed-tools`: 这个技能可以用哪些工具（相当于"授权清单"）
- 正文部分就是 SOP（标准操作流程），告诉 Agent："遇到 LangGraph 问题时，你要先访问这个 URL，然后挑 2-4 个相关链接，再去读详细文档，最后回答用户"

### 5.2 创建带技能的 Agent

```typescript
const agent = await createDeepAgent({
  backend,
  skills: ["./examples/skills/"],  // 告诉 Agent：你的技能包在这个目录
  checkpointer,
});
```

**人话翻译**：
"嘿 Agent，我给你准备了一堆技能，都放在 `./examples/skills/` 目录下了。你启动的时候先扫一眼有哪些技能可用，用户问问题时你自己判断要不要调用。"

### 5.3 子代理的独立技能配置

```typescript
const researchSubagent = {
  name: "researcher",
  description: "Research assistant with specialized skills",
  skills: ["/skills/research/", "/skills/web-search/"],  // 研究员专属技能
};

const agent = await createDeepAgent({
  skills: ["/skills/main/"],  // 主 Agent 的技能
  subagents: [researchSubagent],  // 研究员有自己的技能，不和主 Agent 共享
});
```

**人话翻译**：
"主 Agent 你用 `/skills/main/` 里的技能；研究员这个子代理，你有自己专属的技能包，别去用主 Agent 的。各干各的，别串台！"

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：构建一个"全能型技术客服 Bot"

假设你要为一家 AI 公司做客服机器人，需要回答关于三个产品的问题：
- LangGraph（工作流编排）
- LangSmith（调试追踪）
- LangChain（基础框架）

#### 不用 Skills 的做法（老办法）

把三个产品的所有文档说明都塞进 System Prompt：
```
你是 XX 公司的客服。当用户问 LangGraph 时，你要...（500字）
当用户问 LangSmith 时，你要...（500字）
当用户问 LangChain 时，你要...（500字）
```

**问题**：System Prompt 爆炸到 1500+ 字，每次请求都要把这些内容发给模型，又慢又贵。而且大部分时候用户只问一个产品，其他两个产品的说明完全浪费。

#### 用 Skills 的做法（新办法）

创建三个技能目录：
```
skills/
├── langgraph-docs/
│   └── SKILL.md
├── langsmith-docs/
│   └── SKILL.md
└── langchain-docs/
    └── SKILL.md
```

每个 SKILL.md 的 description 写清楚：
- `langgraph-docs`: "当用户问工作流编排、状态图相关问题时使用"
- `langsmith-docs`: "当用户问调试、追踪、监控相关问题时使用"
- `langchain-docs`: "当用户问 Chain、基础组件问题时使用"

**效果**：
1. Agent 启动时只读取 3 句话的简介（超省 Token）
2. 用户问"LangGraph 的 State 怎么定义？"
3. Agent 匹配到 `langgraph-docs` 技能
4. 才去读取该技能的完整指南
5. 按照指南去查文档、回答问题

**提升**：
- Token 消耗降低 60%+
- 响应速度更快
- 代码更好维护（改一个产品的逻辑不影响其他的）
- 技能可以在其他项目复用

---

## 7. 总结：Skills 的核心价值

| 特性 | 价值 |
|-----|------|
| 渐进式披露 | 省 Token、省钱、更快 |
| 模块化设计 | 好维护、好复用 |
| 来源优先级 | 灵活覆盖、分层管理 |
| 子代理隔离 | 职责清晰、互不干扰 |

---

## 8. 一图胜千言：Skills 工作流程

```
用户提问
    ↓
Agent 扫描所有技能的 description（只看名片）
    ↓
找到匹配的技能？
    ├── 是 → 读取完整 SKILL.md → 按照 Instructions 执行
    └── 否 → 用默认能力回答
```

---

**记住这个金句**：Skills 就是给你的 Agent 准备的"按需外挂"——平时不占内存，需要时一键激活！
