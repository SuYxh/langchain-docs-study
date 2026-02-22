# 24. Skills 模式：让 Agent 按需加载专业能力

## 简单来说

想象你是一个程序员，今天要写 SQL 查询，明天要写 Python 脚本，后天要审查法律合同。你会怎么做？

❌ **死记硬背**：把所有 SQL 语法、Python 库、法律条款都背下来

✅ **按需学习**：遇到 SQL 就翻 SQL 手册，遇到法律就查法律知识库

这就是 **Skills 模式** —— Agent 不需要预先加载所有知识，而是**按需加载**专业技能。

```
用户："帮我写个查询用户订单的 SQL"

Agent 思考："这需要 SQL 技能，让我加载一下..."
     ↓
加载 SQL 技能提示词
     ↓
Agent："好的，根据 SQL 最佳实践，查询语句如下..."
```

与其他模式的区别：
- **Subagents**：派任务给专家，专家完成后汇报 → 调用独立的 Agent
- **Handoffs**：转接给专家，专家直接对话 → 切换到另一个 Agent
- **Skills**：自己学习新技能 → 同一个 Agent，能力增强

## 本节目标

1. 理解 Skills 模式的"渐进式披露"思想
2. 掌握技能加载工具的实现方式
3. 学会设计技能提示词和引用资源
4. 了解动态工具注册和层级技能

## 业务场景

假设你要构建一个**全能编程助手**，需要支持：

1. **SQL 编写** —— 了解各种数据库语法、优化技巧
2. **代码审查** —— 知道各语言最佳实践、常见漏洞
3. **API 设计** —— 熟悉 RESTful 规范、版本管理
4. **法律审查** —— 了解隐私法规、合规要求

如果把所有知识都写进系统提示词：
- 提示词会有几万字，Token 爆炸
- 大部分时候用不到，浪费资源
- 知识太多，模型可能"晕"

Skills 模式的解决方案：**用到什么，加载什么**。

## 核心概念：渐进式披露

Skills 模式借鉴了 [llms.txt](https://llmstxt.org/) 和 [Agent Skills](https://agentskills.io/) 的思想 —— **渐进式披露（Progressive Disclosure）**。

核心原理：
1. **初始状态**：Agent 只知道有哪些技能可用
2. **按需加载**：遇到需要某技能的任务时，加载该技能的详细提示词
3. **上下文扩展**：加载后，Agent 的能力动态增强

```
初始上下文：
┌─────────────────────────────────────┐
│ 系统提示词（通用）                    │
│ 可用技能：write_sql, review_code     │
└─────────────────────────────────────┘

加载 SQL 技能后：
┌─────────────────────────────────────┐
│ 系统提示词（通用）                    │
│ 可用技能：write_sql, review_code     │
│ ─────────────────────────────────── │
│ SQL 技能提示词（详细）               │
│ - 语法规范                          │
│ - 优化技巧                          │
│ - 示例模板                          │
└─────────────────────────────────────┘
```

## 基础实现

### 第一步：定义技能库

每个技能就是一段专业的提示词：

```typescript
const skillLibrary = {
  write_sql: {
    name: "SQL 编写专家",
    prompt: `你现在是 SQL 编写专家。

## 核心原则
1. 始终使用参数化查询，防止 SQL 注入
2. 优先使用 JOIN 而非子查询
3. 为常用查询字段添加索引建议
4. 使用有意义的别名提高可读性

## 常用模式

### 分页查询
SELECT * FROM table
ORDER BY id
LIMIT :limit OFFSET :offset;

### 聚合统计
SELECT 
  DATE(created_at) as date,
  COUNT(*) as count,
  SUM(amount) as total
FROM orders
GROUP BY DATE(created_at);

## 注意事项
- 避免 SELECT *，明确列出需要的字段
- 大表查询必须有 WHERE 条件
- 考虑查询计划，避免全表扫描`
  },
  
  review_code: {
    name: "代码审查专家",
    prompt: `你现在是代码审查专家。

## 审查重点
1. **安全性**：检查注入、XSS、敏感数据泄露
2. **性能**：检查 N+1 查询、内存泄漏、死循环
3. **可维护性**：检查命名、注释、模块划分
4. **测试覆盖**：检查边界情况、异常处理

## 反馈格式
每个问题按以下格式输出：
- 位置：文件名:行号
- 严重程度：Critical / Major / Minor
- 问题描述：具体说明问题
- 建议修复：给出修复方案

## 常见问题清单
- 硬编码的密钥或密码
- 未验证的用户输入
- 缺少错误处理
- 过于复杂的函数（超过 50 行）
- 重复代码`
  },
  
  review_legal: {
    name: "法律审查专家", 
    prompt: `你现在是法律审查专家。

## 关注领域
1. **隐私合规**：GDPR、CCPA、个人信息保护法
2. **数据安全**：数据分类、加密要求、访问控制
3. **用户协议**：条款清晰度、权利义务平衡
4. **知识产权**：开源协议、版权声明

## 审查输出
- 合规风险等级：高/中/低
- 具体问题条款
- 修改建议
- 参考法规依据`
  }
};
```

### 第二步：创建技能加载工具

```typescript
import { tool, createAgent } from "langchain";
import * as z from "zod";

const loadSkill = tool(
  async ({ skillName }) => {
    const skill = skillLibrary[skillName];
    
    if (!skill) {
      return `未找到技能：${skillName}。可用技能：${Object.keys(skillLibrary).join(", ")}`;
    }
    
    return `=== 已加载技能：${skill.name} ===\n\n${skill.prompt}`;
  },
  {
    name: "load_skill",
    description: `加载专业技能以增强能力。

可用技能：
- write_sql: SQL 编写专家，擅长数据库查询优化
- review_code: 代码审查专家，擅长发现代码问题
- review_legal: 法律审查专家，擅长合规检查

使用时机：
- 用户请求写 SQL 时，加载 write_sql
- 用户请求审查代码时，加载 review_code
- 涉及隐私、合同、法规时，加载 review_legal`,
    schema: z.object({
      skillName: z.string().describe("要加载的技能名称")
    })
  }
);
```

### 第三步：创建 Agent

```typescript
const skillfulAgent = createAgent({
  model: "gpt-4.1",
  tools: [loadSkill],
  systemPrompt: `你是一个全能助手，可以通过加载技能来扩展能力。

工作流程：
1. 分析用户需求
2. 判断是否需要专业技能
3. 如需要，先用 load_skill 加载相应技能
4. 加载后，按照技能提示词的要求完成任务

重要：
- 加载技能后，严格遵循技能提示词中的规范
- 不确定用哪个技能时，可以询问用户
- 同一任务可以加载多个技能`
});
```

### 第四步：运行

```typescript
const response = await skillfulAgent.invoke({
  messages: [{
    role: "user",
    content: "帮我写一个查询用户最近 30 天订单的 SQL"
  }]
});

console.log(response.messages.at(-1)?.content);
```

执行流程：
1. Agent 收到请求，识别出需要 SQL 技能
2. 调用 `load_skill({ skillName: "write_sql" })`
3. 技能提示词返回，Agent 的上下文扩展
4. Agent 按照 SQL 技能的规范生成查询语句

## 进阶特性

### 特性 1：引用外部资源

技能提示词可以引用外部文件，实现更细粒度的按需加载：

```typescript
const skillLibrary = {
  write_sql: {
    name: "SQL 编写专家",
    prompt: `你现在是 SQL 编写专家。

## 资源引用
当需要更详细的信息时，可以读取以下文件：
- /docs/sql/mysql-syntax.md - MySQL 特有语法
- /docs/sql/postgresql-syntax.md - PostgreSQL 特有语法
- /docs/sql/optimization-guide.md - 性能优化指南
- /docs/sql/examples/*.sql - 常用查询模板

使用 read_file 工具按需读取这些文件。

## 基础指南
...`
  }
};

const readFile = tool(
  async ({ filePath }) => {
    // 读取文件内容
    return await fs.readFile(filePath, "utf-8");
  },
  {
    name: "read_file",
    description: "读取文件内容",
    schema: z.object({ filePath: z.string() })
  }
);

const agent = createAgent({
  model: "gpt-4.1",
  tools: [loadSkill, readFile]
});
```

这样实现了**两级渐进式披露**：
1. 先加载技能提示词（通用知识）
2. 需要时再读取具体文件（详细知识）

### 特性 2：层级技能

技能可以包含子技能，形成树状结构：

```typescript
const skillLibrary = {
  data_science: {
    name: "数据科学",
    prompt: `你现在是数据科学专家。

## 子技能
当需要更专业的能力时，可以加载以下子技能：
- pandas_expert: Pandas 数据处理
- visualization: 数据可视化（Matplotlib、Seaborn）
- statistical_analysis: 统计分析

使用 load_skill 加载子技能。

## 通用指南
...`,
    subSkills: ["pandas_expert", "visualization", "statistical_analysis"]
  },
  
  pandas_expert: {
    name: "Pandas 专家",
    parent: "data_science",
    prompt: `你现在是 Pandas 数据处理专家。

## 常用操作
### 数据读取
df = pd.read_csv("file.csv")
df = pd.read_excel("file.xlsx")

### 数据清洗
df.dropna()  # 删除空值
df.fillna(0)  # 填充空值
df.drop_duplicates()  # 去重

...`
  }
};
```

### 特性 3：动态工具注册

加载技能时，同时注册专属工具：

```typescript
import { createMiddleware } from "langchain";

const skillTools = {
  write_sql: [
    tool(
      async ({ query }) => {
        // 模拟执行 SQL，检查语法
        return "SQL 语法检查通过";
      },
      {
        name: "validate_sql",
        description: "验证 SQL 语法是否正确",
        schema: z.object({ query: z.string() })
      }
    ),
    tool(
      async ({ query }) => {
        // 分析查询计划
        return "查询计划分析：建议为 user_id 字段添加索引";
      },
      {
        name: "analyze_query_plan",
        description: "分析 SQL 查询计划，给出优化建议",
        schema: z.object({ query: z.string() })
      }
    )
  ]
};

const dynamicToolMiddleware = createMiddleware({
  preModelCall: ({ state }) => {
    const loadedSkills = state.loadedSkills || [];
    const additionalTools = loadedSkills.flatMap(
      skill => skillTools[skill] || []
    );
    
    return {
      tools: [...baseTools, ...additionalTools]
    };
  }
});
```

## 完整示例：多技能编程助手

```typescript
import { createAgent, tool } from "langchain";
import * as z from "zod";

const skillLibrary: Record<string, { name: string; prompt: string }> = {
  write_sql: {
    name: "SQL 编写专家",
    prompt: `你现在是 SQL 编写专家。

核心原则：
1. 使用参数化查询防止注入
2. 优先 JOIN 而非子查询
3. 添加索引建议
4. 使用有意义的别名

输出格式：
\`\`\`sql
-- 查询说明
SELECT ...
\`\`\`

优化建议：
- 建议索引：...
- 注意事项：...`
  },
  
  review_code: {
    name: "代码审查专家",
    prompt: `你现在是代码审查专家。

审查维度：
1. 安全性（注入、XSS、数据泄露）
2. 性能（N+1、内存泄漏）
3. 可维护性（命名、注释）
4. 测试覆盖

输出格式：
## 审查报告

### 问题 1
- 位置：file.ts:42
- 严重程度：Major
- 问题：...
- 建议：...`
  },
  
  api_design: {
    name: "API 设计专家",
    prompt: `你现在是 API 设计专家。

设计原则：
1. RESTful 命名规范
2. 合理的 HTTP 状态码
3. 版本控制策略
4. 分页和过滤设计

输出格式：
## API 端点

### GET /api/v1/users
- 描述：获取用户列表
- 参数：page, limit, filter
- 响应：200, 400, 401`
  }
};

const loadSkill = tool(
  async ({ skillName }) => {
    const skill = skillLibrary[skillName];
    
    if (!skill) {
      const available = Object.entries(skillLibrary)
        .map(([key, val]) => `- ${key}: ${val.name}`)
        .join("\n");
      return `未找到技能"${skillName}"。\n\n可用技能：\n${available}`;
    }
    
    return `
╔════════════════════════════════════════╗
║ 已加载技能：${skill.name.padEnd(26)}║
╚════════════════════════════════════════╝

${skill.prompt}`;
  },
  {
    name: "load_skill",
    description: `加载专业技能。可用技能：
- write_sql: SQL 编写专家
- review_code: 代码审查专家  
- api_design: API 设计专家

根据用户需求加载对应技能。`,
    schema: z.object({
      skillName: z.enum(["write_sql", "review_code", "api_design"])
        .describe("技能名称")
    })
  }
);

const programmingAssistant = createAgent({
  model: "gpt-4.1",
  tools: [loadSkill],
  systemPrompt: `你是一个编程助手，可以通过加载技能来获得专业能力。

工作方式：
1. 分析用户请求
2. 如果需要专业知识，先加载对应技能
3. 按照技能提示词的规范完成任务
4. 确保输出格式符合技能要求

可加载的技能：
- write_sql: 编写 SQL 查询
- review_code: 审查代码质量
- api_design: 设计 API 接口`
});

async function demo() {
  console.log("=== 场景 1：SQL 编写 ===\n");
  let result = await programmingAssistant.invoke({
    messages: [{
      role: "user",
      content: "帮我写一个统计每日订单金额的 SQL"
    }]
  });
  console.log(result.messages.at(-1)?.content);

  console.log("\n=== 场景 2：代码审查 ===\n");
  result = await programmingAssistant.invoke({
    messages: [{
      role: "user",
      content: `帮我审查这段代码：
function getUser(id) {
  const query = "SELECT * FROM users WHERE id = " + id;
  return db.query(query);
}`
    }]
  });
  console.log(result.messages.at(-1)?.content);

  console.log("\n=== 场景 3：API 设计 ===\n");
  result = await programmingAssistant.invoke({
    messages: [{
      role: "user",
      content: "帮我设计一个用户管理的 RESTful API"
    }]
  });
  console.log(result.messages.at(-1)?.content);
}

demo();
```

## Skills vs 其他模式对比

| 对比项 | Skills | Subagents | Handoffs |
|-------|--------|-----------|----------|
| 本质 | 能力扩展 | 任务委派 | 控制转移 |
| Agent 数量 | 1 个 | 多个 | 多个 |
| 上下文 | 动态扩展 | 独立隔离 | 共享传递 |
| 复杂度 | 低 | 中 | 中 |
| 适用场景 | 知识密集 | 任务密集 | 交互密集 |

**选择建议**：
- 需要很多专业知识，但任务相对简单 → **Skills**
- 需要多个独立专家协作完成复杂任务 → **Subagents**
- 需要在对话中切换专家 → **Handoffs**

## 本章小结

Skills 模式的核心要点：

1. **核心思想**：渐进式披露，按需加载专业知识
2. **实现方式**：
   - 定义技能库（提示词集合）
   - 创建技能加载工具
   - Agent 根据需要调用加载
3. **进阶特性**：
   - 引用外部资源：多级按需加载
   - 层级技能：技能树结构
   - 动态工具注册：加载技能同时增加工具
4. **优势**：
   - Token 效率高
   - 知识组织清晰
   - 团队可独立维护技能
5. **适用场景**：
   - 知识密集型任务
   - 需要多种专业能力但不复杂
   - 不同团队维护不同领域知识

下一篇我们介绍 **Router 模式** —— 高效的问题分类和分发机制。
