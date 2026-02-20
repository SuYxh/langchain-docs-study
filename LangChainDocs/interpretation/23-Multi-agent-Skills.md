# LangChain 多智能体 Skills 模式 - 深度解读

## 1. 一句话省流 (The Essence)

**Skills 就是给 AI Agent 装上的"技能包"——需要哪个技能，就临时加载哪个，而不是一开始就把所有技能塞进脑子里。**

就像游戏里的角色切换技能栏，不同场景切换不同的技能组合，轻量又灵活。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：一个 Agent 想当全能选手，但"脑容量"不够用！

想象一下，你要开发一个超级助手，它既要会写 SQL、又要能审合同、还得懂数据分析、能写代码……如果把所有这些能力的指令和知识**一股脑全塞进 system prompt 里**，会发生什么？

1. **Context Window 爆炸**：大模型的上下文窗口是有限的（比如 4K、8K、128K tokens）。塞太多东西进去，关键信息就被稀释了，AI 反而变笨。
2. **Token 成本飙升**：每次调用都带着一堆用不上的"技能说明书"，白花花的银子啊！
3. **维护噩梦**：所有技能写在一起，改一个就可能影响另一个，不同团队协作起来更是灾难。

### 解决方案：按需加载，渐进式披露 (Progressive Disclosure)

Skills 模式的核心思想是：**Agent 不需要一开始就知道所有事情，它只需要知道"有哪些技能可用"以及"怎么去获取这些技能"。**

```
用户提问 → Agent 判断需要什么技能 → 动态加载对应 Skill → 执行任务 → 返回结果
```

这就像：
- 你不需要把整个图书馆的书都背下来
- 你只需要知道图书馆在哪，需要的时候去借就行

---

## 3. 生活化类比 (The Analogy)

### 类比：瑞士军刀 vs 工具房

想象你是一个万能维修工：

| 场景 | 传统做法（塞满所有工具）| Skills 模式（按需取用）|
|------|------------------------|------------------------|
| 类比 | 背着一个 100 斤的工具箱出门 | 随身带个小包，需要什么工具就回工具房拿 |
| Agent | 把所有技能的 prompt 都写进 system message | 只告诉 Agent "你有个工具房"，需要时再加载 |
| 优点 | 啥都有（但累死了）| 轻装上阵，灵活切换 |
| 缺点 | 背不动、找工具费劲 | 需要多一步"取工具"的操作 |

### 角色映射

| 文档术语 | 类比角色 | 解释 |
|----------|----------|------|
| **Agent** | 维修工本人 | 接收任务、决策、执行 |
| **Skill** | 工具房里的专业工具箱 | 每个工具箱针对特定任务（水电箱、木工箱）|
| **load_skill** | 去工具房取工具的动作 | Agent 判断需要什么技能，主动去加载 |
| **Progressive Disclosure** | 按需借取 | 不是一次性搬空工具房，而是用什么拿什么 |
| **System Prompt** | 维修工的基本培训手册 | 告诉他有哪些工具箱可用，但不详细写每个工具怎么用 |

---

## 4. 关键概念拆解 (Key Concepts)

### Skill (技能)
- **是什么**：一段专门针对某个领域的 prompt + 相关上下文资源
- **不是什么**：不是一个完整的 sub-agent，比那个轻量多了
- **举例**：`write_sql` 技能可能包含"你是一个 SQL 专家，擅长写优化查询……"这样的专业 prompt

### Progressive Disclosure (渐进式披露)
- **白话**：别一次性把所有东西都倒出来，需要什么再展示什么
- **好处**：节省 token、保持上下文清晰、提高 AI 回答质量
- **来源**：这个概念来自 Jeremy Howard 提出的 [llms.txt](https://llmstxt.org/) 标准

### Prompt-driven Specialization (Prompt 驱动的专业化)
- **白话**：Skill 的核心就是一段精心设计的 prompt
- **关键点**：不是靠复杂代码实现专业能力，而是靠精准的"角色设定 + 上下文"让 AI 变专业

### Dynamic Tool Registration (动态工具注册)
- **白话**：加载技能的同时，顺便解锁一些新工具
- **举例**：加载"数据库管理员"技能时，同时解锁 backup、restore、migrate 等工具

### Hierarchical Skills (层级技能)
- **白话**：技能可以像俄罗斯套娃一样嵌套
- **举例**：加载"数据科学"大技能后，里面还有"Pandas专家"、"可视化"、"统计分析"等小技能可选

---

## 5. 代码"人话"解读 (Code Walkthrough)

```typescript
// 第一步：定义一个"加载技能"的工具
const loadSkill = tool(
  async ({ skillName }) => {
    // 实际场景：从文件/数据库读取对应技能的 prompt 内容
    return "";  // 返回技能的专业 prompt
  },
  {
    name: "load_skill",  // 工具名称
    description: `Load a specialized skill.

Available skills:
- write_sql: SQL query writing expert      // 可用技能清单
- review_legal_doc: Legal document reviewer

Returns the skill's prompt and context.`,  // 返回值说明
    schema: z.object({
      skillName: z.string().describe("Name of skill to load")
    })
  }
);
```

**这段代码在干嘛？**
> 定义了一个叫 `load_skill` 的工具，Agent 可以调用它来加载特定技能。就像给维修工一张"工具房目录卡"——上面写着有哪些工具箱可借，需要时报名字就能拿到。

```typescript
// 第二步：创建 Agent，把"取技能工具"交给它
const agent = createAgent({
  model: "gpt-4.1",
  tools: [loadSkill],  // 只给了一个工具：加载技能
  systemPrompt: (
    "You are a helpful assistant. " +
    "You have access to two skills: " +
    "write_sql and review_legal_doc. " +  // 告知可用技能
    "Use load_skill to access them."       // 告知使用方式
  ),
});
```

**这段代码在干嘛？**
> 创建了一个 Agent，它的 system prompt 非常简洁——只告诉它"你有两个技能可以用，需要的话调用 load_skill 去拿"。这就是 **Progressive Disclosure** 的精髓：不提前塞，要用再取。

### 完整流程图示

```
用户: "帮我写一个查询用户订单的 SQL"
       ↓
Agent: 判断这是 SQL 任务，需要 write_sql 技能
       ↓
Agent: 调用 load_skill({ skillName: "write_sql" })
       ↓
系统: 返回 write_sql 的专业 prompt（比如"你是 SQL 专家..."）
       ↓
Agent: 带着专业 prompt 上下文，生成高质量 SQL
       ↓
用户: 收到优化过的 SQL 查询语句
```

---

## 6. 真实应用场景 (Real-world Scenario)

### 场景：企业级智能助手平台

假设你在一家大公司开发一个**内部智能助手**，需要服务多个部门：

| 部门 | 需要的能力 |
|------|-----------|
| 技术部 | 写 SQL、代码审查、API 文档生成 |
| 法务部 | 合同审核、法律条款解读 |
| 市场部 | 文案撰写、竞品分析 |
| 财务部 | 报表解读、税务计算 |

### 不用 Skills 的惨状

```python
# 一个臃肿无比的 system prompt
system_prompt = """
你是一个全能助手。

## SQL 专家模式
当用户问 SQL 相关问题时，你要...（2000 字）

## 法务专家模式  
当用户问法律相关问题时，你要...（3000 字）

## 市场专家模式
当用户问营销相关问题时，你要...（1500 字）

## 财务专家模式
当用户问财务相关问题时，你要...（2500 字）

...
"""
# 结果：每次调用消耗 10000+ tokens，AI 经常搞混不同领域的知识
```

### 用 Skills 的优雅方案

```typescript
// 每个部门维护自己的 Skill
const skills = {
  "write_sql": "sql_skill.md",      // 技术部维护
  "review_contract": "legal_skill.md",  // 法务部维护
  "write_copy": "marketing_skill.md",   // 市场部维护
  "analyze_report": "finance_skill.md"  // 财务部维护
};

// Agent 的 system prompt 极其简洁
const systemPrompt = `
你是企业智能助手。根据用户需求，加载对应技能：
- 技术问题 → write_sql
- 法务问题 → review_contract
- 营销问题 → write_copy
- 财务问题 → analyze_report
使用 load_skill 工具加载所需技能。
`;
```

### 收益对比

| 指标 | 传统方案 | Skills 方案 |
|------|---------|------------|
| 每次调用 Token 消耗 | ~10000 | ~1500 |
| 跨领域混淆概率 | 高 | 低 |
| 团队协作难度 | 困难（改一处影响全局）| 简单（各自维护各自的 Skill）|
| 新增能力成本 | 重构整个 prompt | 新增一个 Skill 文件 |
| 响应质量 | 泛而不精 | 专业精准 |

---

## 7. 拓展玩法速览

| 扩展模式 | 说明 | 适用场景 |
|----------|------|---------|
| **动态工具注册** | 加载技能时顺便解锁新工具 | 数据库管理（解锁 backup/restore）|
| **层级技能** | 技能套技能，像文件夹层级 | 大型知识库分类管理 |
| **资源引用感知** | Skill 知道有哪些外部资源可用 | 需要读取模板、脚本的场景 |

---

## 8. 总结：什么时候该用 Skills 模式？

**适合用 Skills 的场景：**
1. 一个 Agent 需要应对多种差异化任务
2. 不同技能之间没有强依赖/约束关系
3. 不同团队需要独立开发和维护各自的能力模块
4. 想要控制 token 成本和上下文窗口使用率

**常见应用：**
- 多语言编程助手（Python Skill、JavaScript Skill、Go Skill...）
- 多领域知识库（医疗、法律、金融...）
- 多风格创作助手（正式风格、幽默风格、学术风格...）

---

**一句话记住 Skills 模式：**
> "不要背着整个工具房出门，带上工具房的钥匙就够了。"
