# 22. Subagents 模式：让 CEO 管理专业团队

## 简单来说

想象你是一家科技公司的 CEO，收到一个大客户的需求："我们要做一个电商系统"。你会怎么做？

❌ **错误做法**：自己一个人写代码、做设计、搞运营、处理财务...

✅ **正确做法**：
1. 把需求拆解成子任务
2. 分配给各部门经理：技术总监负责架构、设计总监负责 UI、运营总监负责推广
3. 各经理完成后向你汇报
4. 你汇总结果，交付给客户

这就是 **Subagents 模式** —— 一个主 Agent（CEO）协调多个子 Agent（部门经理），每个子 Agent 专注自己的领域。

```
用户 ──→ 主 Agent ──→ 研究 Agent ──→ 研究结果
         (CEO)   ──→ 代码 Agent ──→ 代码结果
                 ──→ 写作 Agent ──→ 文档结果
                 ←── 汇总所有结果 ────────┘
```

## 本节目标

1. 理解 Subagents 模式的核心思想
2. 掌握同步和异步两种执行方式
3. 学会设计子 Agent 的接口规范
4. 了解上下文工程在多 Agent 中的应用

## 业务场景

假设你要构建一个**内容创作助手**，能够：

1. **研究主题** —— 搜索相关资料，整理关键信息
2. **生成代码示例** —— 写演示代码，确保可运行
3. **撰写文章** —— 基于研究和代码，写出完整文章

这三个任务需要不同的专业能力，让一个 Agent 全做会很累。用 Subagents 模式拆分：

- **研究 Agent**：专门搜索和整理资料
- **代码 Agent**：专门生成和验证代码
- **写作 Agent**：专门撰写和润色文章
- **主 Agent**：协调三者，汇总结果

## 核心实现

### 第一步：定义子 Agent

每个子 Agent 都是独立的、专注于单一领域的 Agent：

```typescript
import { createAgent, tool } from "langchain";
import * as z from "zod";

const searchTool = tool(
  async ({ query }) => {
    // 调用搜索 API
    return `关于 "${query}" 的搜索结果...`;
  },
  {
    name: "search",
    description: "搜索网络获取最新信息",
    schema: z.object({ query: z.string() })
  }
);

const researchAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchTool],
  systemPrompt: `你是一个研究专家。
任务：根据用户的主题，搜索并整理相关信息。
输出格式：
1. 核心概念（3-5 个要点）
2. 最新动态
3. 参考资料链接`
});

const codeAgent = createAgent({
  model: "gpt-4.1",
  tools: [],
  systemPrompt: `你是一个编程专家。
任务：根据需求生成高质量代码示例。
要求：
1. 代码必须可运行
2. 包含必要的注释
3. 遵循最佳实践`
});

const writingAgent = createAgent({
  model: "gpt-4.1",
  tools: [],
  systemPrompt: `你是一个技术写作专家。
任务：将研究结果和代码示例整合成文章。
风格：清晰、易懂、有深度`
});
```

### 第二步：将子 Agent 包装成工具

关键步骤 —— 把子 Agent 变成主 Agent 可调用的"工具"：

```typescript
const callResearchAgent = tool(
  async ({ topic }) => {
    const result = await researchAgent.invoke({
      messages: [{ role: "user", content: `研究主题：${topic}` }]
    });
    // 返回最后一条消息的内容
    return result.messages.at(-1)?.content;
  },
  {
    name: "research",
    description: "调用研究专家，获取主题相关的背景资料和最新信息",
    schema: z.object({
      topic: z.string().describe("要研究的主题")
    })
  }
);

const callCodeAgent = tool(
  async ({ requirement }) => {
    const result = await codeAgent.invoke({
      messages: [{ role: "user", content: `代码需求：${requirement}` }]
    });
    return result.messages.at(-1)?.content;
  },
  {
    name: "generate_code",
    description: "调用编程专家，生成代码示例",
    schema: z.object({
      requirement: z.string().describe("代码功能需求描述")
    })
  }
);

const callWritingAgent = tool(
  async ({ research, code, outline }) => {
    const prompt = `
请基于以下材料撰写文章：

## 研究资料
${research}

## 代码示例
${code}

## 文章大纲
${outline}
`;
    const result = await writingAgent.invoke({
      messages: [{ role: "user", content: prompt }]
    });
    return result.messages.at(-1)?.content;
  },
  {
    name: "write_article",
    description: "调用写作专家，整合资料撰写文章",
    schema: z.object({
      research: z.string().describe("研究资料"),
      code: z.string().describe("代码示例"),
      outline: z.string().describe("文章大纲")
    })
  }
);
```

### 第三步：创建主 Agent

主 Agent 负责理解用户需求、协调子 Agent、汇总结果：

```typescript
const mainAgent = createAgent({
  model: "gpt-4.1",
  tools: [callResearchAgent, callCodeAgent, callWritingAgent],
  systemPrompt: `你是一个内容创作团队的负责人。

你的团队有三位专家：
1. 研究专家 - 负责搜索和整理资料
2. 编程专家 - 负责生成代码示例  
3. 写作专家 - 负责撰写最终文章

工作流程：
1. 分析用户需求，确定文章主题
2. 调用研究专家获取背景资料
3. 调用编程专家生成相关代码
4. 调用写作专家整合所有材料
5. 检查最终结果，确保质量

注意：
- 每个专家一次只处理一个任务
- 将专家的输出完整传递给下一个专家
- 最终向用户交付完整的文章`
});
```

### 第四步：运行

```typescript
const response = await mainAgent.invoke({
  messages: [{
    role: "user",
    content: "帮我写一篇关于 LangChain Agent 的入门教程"
  }]
});

console.log(response.messages.at(-1)?.content);
```

执行流程：
1. 主 Agent 收到请求，决定先调用研究专家
2. 研究专家搜索 LangChain Agent 资料，返回结果
3. 主 Agent 用研究结果，调用编程专家生成代码
4. 主 Agent 汇总所有材料，调用写作专家撰写文章
5. 主 Agent 检查并返回最终文章

## 两种执行方式：同步 vs 异步

### 同步执行（顺序调用）

上面的例子是同步执行 —— 主 Agent 调用工具后，等待结果返回才继续。

```
主Agent → 研究Agent → 等待 → 结果
       → 代码Agent → 等待 → 结果
       → 写作Agent → 等待 → 结果
总时间 = T1 + T2 + T3
```

**适用场景**：子任务之间有依赖关系

### 异步执行（并行调用）

如果子任务之间没有依赖，可以并行执行：

```typescript
const runParallelSubagents = tool(
  async ({ topics }) => {
    // 并行调用多个子 Agent
    const results = await Promise.all(
      topics.map(topic => 
        researchAgent.invoke({
          messages: [{ role: "user", content: topic }]
        })
      )
    );
    
    return results.map(r => r.messages.at(-1)?.content).join("\n\n---\n\n");
  },
  {
    name: "parallel_research",
    description: "并行研究多个主题",
    schema: z.object({
      topics: z.array(z.string()).describe("要研究的主题列表")
    })
  }
);
```

```
主Agent → 研究Agent1 ─┐
       → 研究Agent2 ──┼→ 汇总结果
       → 研究Agent3 ─┘
总时间 = max(T1, T2, T3)
```

**适用场景**：子任务之间相互独立

## 上下文工程：让子 Agent 更高效

子 Agent 是**无状态**的 —— 每次调用都是全新的开始。这意味着你需要在每次调用时提供完整的上下文。

### 技巧 1：定义清晰的输入规范

```typescript
const callResearchAgent = tool(
  async ({ topic, focusAreas, maxSources }) => {
    const prompt = `
研究主题：${topic}

重点关注：
${focusAreas.map((f, i) => `${i + 1}. ${f}`).join('\n')}

要求：
- 引用最多 ${maxSources} 个来源
- 每个来源需要标注可信度
`;
    const result = await researchAgent.invoke({
      messages: [{ role: "user", content: prompt }]
    });
    return result.messages.at(-1)?.content;
  },
  {
    name: "research",
    description: "调用研究专家获取背景资料",
    schema: z.object({
      topic: z.string().describe("研究主题"),
      focusAreas: z.array(z.string()).describe("重点关注的方面"),
      maxSources: z.number().default(5).describe("最多引用来源数")
    })
  }
);
```

### 技巧 2：定义清晰的输出规范

让子 Agent 返回结构化数据，方便主 Agent 处理：

```typescript
const researchAgentWithStructuredOutput = createAgent({
  model: "gpt-4.1",
  tools: [searchTool],
  systemPrompt: `你是研究专家。

输出必须严格遵循以下 JSON 格式：
{
  "summary": "一句话总结",
  "keyPoints": ["要点1", "要点2", "要点3"],
  "sources": [
    {"title": "来源标题", "url": "链接", "credibility": "高/中/低"}
  ],
  "relatedTopics": ["相关主题1", "相关主题2"]
}

不要输出任何 JSON 之外的内容。`
});
```

### 技巧 3：提供子 Agent 说明书

在主 Agent 的系统提示中，详细说明每个子 Agent 的能力和使用方式：

```typescript
const mainAgentPrompt = `你是内容创作团队负责人。

## 可用专家及使用说明

### 研究专家 (research)
- 能力：搜索网络、整理资料、验证信息
- 输入：主题 + 重点关注方向
- 输出：结构化的研究报告（JSON 格式）
- 注意：单次研究限制 5 个来源，复杂主题可分多次调用

### 编程专家 (generate_code)  
- 能力：生成代码、代码审查、Bug 修复
- 输入：功能需求描述 + 技术栈要求
- 输出：可运行的代码 + 使用说明
- 注意：不要让它处理业务逻辑，只负责技术实现

### 写作专家 (write_article)
- 能力：撰写文章、润色内容、调整风格
- 输入：所有素材 + 文章大纲 + 风格要求
- 输出：完整的文章
- 注意：确保传入完整的研究资料和代码

## 工作原则
1. 先规划，再执行
2. 明确每个专家的输入输出
3. 检查专家输出质量，必要时要求重做`;
```

## 工具设计模式

### 模式 1：每个子 Agent 一个工具

```typescript
// 独立工具
const research = tool(...);
const generateCode = tool(...);
const writeArticle = tool(...);

const agent = createAgent({
  tools: [research, generateCode, writeArticle]
});
```

**优点**：清晰、直观，主 Agent 容易理解
**缺点**：工具数量多时会增加 Token 消耗

### 模式 2：单一分发工具

```typescript
const dispatchToSubagent = tool(
  async ({ agentName, task }) => {
    const agents = {
      research: researchAgent,
      code: codeAgent,
      writing: writingAgent
    };
    
    const agent = agents[agentName];
    if (!agent) {
      return `未知的专家：${agentName}`;
    }
    
    const result = await agent.invoke({
      messages: [{ role: "user", content: task }]
    });
    return result.messages.at(-1)?.content;
  },
  {
    name: "dispatch",
    description: `分发任务给专家。可用专家：
- research: 研究专家
- code: 编程专家
- writing: 写作专家`,
    schema: z.object({
      agentName: z.enum(["research", "code", "writing"]),
      task: z.string().describe("任务描述")
    })
  }
);

const agent = createAgent({
  tools: [dispatchToSubagent]
});
```

**优点**：统一接口，减少工具数量
**缺点**：工具描述需要包含所有子 Agent 信息

## 完整示例：技术文章创作系统

```typescript
import { createAgent, tool } from "langchain";
import * as z from "zod";

const searchTool = tool(
  async ({ query }) => {
    // 实际项目中接入搜索 API
    return `搜索结果：关于 ${query} 的信息...`;
  },
  {
    name: "search",
    description: "搜索网络",
    schema: z.object({ query: z.string() })
  }
);

const researchAgent = createAgent({
  model: "gpt-4.1",
  tools: [searchTool],
  systemPrompt: "你是研究专家，擅长搜索和整理信息。输出结构化的研究报告。"
});

const codeAgent = createAgent({
  model: "gpt-4.1",
  tools: [],
  systemPrompt: "你是编程专家，擅长 TypeScript。生成可运行的代码示例。"
});

const writingAgent = createAgent({
  model: "gpt-4.1", 
  tools: [],
  systemPrompt: "你是技术写作专家。文风清晰、易懂、有深度。"
});

const callResearch = tool(
  async ({ topic, focusAreas }) => {
    const prompt = `研究主题：${topic}\n重点：${focusAreas.join('、')}`;
    const result = await researchAgent.invoke({
      messages: [{ role: "user", content: prompt }]
    });
    return result.messages.at(-1)?.content;
  },
  {
    name: "research",
    description: "调用研究专家获取背景资料",
    schema: z.object({
      topic: z.string(),
      focusAreas: z.array(z.string())
    })
  }
);

const callCode = tool(
  async ({ requirement, language }) => {
    const prompt = `用 ${language} 实现：${requirement}`;
    const result = await codeAgent.invoke({
      messages: [{ role: "user", content: prompt }]
    });
    return result.messages.at(-1)?.content;
  },
  {
    name: "generate_code",
    description: "调用编程专家生成代码",
    schema: z.object({
      requirement: z.string(),
      language: z.string().default("TypeScript")
    })
  }
);

const callWriting = tool(
  async ({ materials, style }) => {
    const prompt = `基于以下材料写文章（风格：${style}）：\n${materials}`;
    const result = await writingAgent.invoke({
      messages: [{ role: "user", content: prompt }]
    });
    return result.messages.at(-1)?.content;
  },
  {
    name: "write_article",
    description: "调用写作专家撰写文章",
    schema: z.object({
      materials: z.string(),
      style: z.string().default("技术博客")
    })
  }
);

const contentCreator = createAgent({
  model: "gpt-4.1",
  tools: [callResearch, callCode, callWriting],
  systemPrompt: `你是内容创作团队负责人。

工作流程：
1. 分析用户需求
2. 调用 research 获取背景资料
3. 调用 generate_code 生成代码示例
4. 调用 write_article 撰写最终文章

确保最终交付高质量的技术文章。`
});

const response = await contentCreator.invoke({
  messages: [{
    role: "user",
    content: "写一篇 LangChain Agent 工具调用的入门教程"
  }]
});

console.log(response.messages.at(-1)?.content);
```

## 常见陷阱

### 陷阱 1：子 Agent 之间传递过多上下文

```typescript
// ❌ 错误：把整个对话历史传给子 Agent
const result = await subagent.invoke({
  messages: mainAgent.messages  // 太多了！
});

// ✅ 正确：只传递必要的信息
const result = await subagent.invoke({
  messages: [{
    role: "user",
    content: `任务：${task}\n相关背景：${relevantContext}`
  }]
});
```

### 陷阱 2：子 Agent 职责不清晰

```typescript
// ❌ 错误：子 Agent 什么都能做
const generalAgent = createAgent({
  systemPrompt: "你是一个助手，可以帮助用户完成各种任务"
});

// ✅ 正确：职责单一明确
const researchAgent = createAgent({
  systemPrompt: "你是研究专家，只负责搜索和整理信息，不做其他事情"
});
```

### 陷阱 3：忽略错误处理

```typescript
// ✅ 正确：处理子 Agent 可能的失败
const callSubagent = tool(
  async ({ task }) => {
    try {
      const result = await subagent.invoke({
        messages: [{ role: "user", content: task }]
      });
      return result.messages.at(-1)?.content ?? "子 Agent 无响应";
    } catch (error) {
      return `子 Agent 执行失败：${error.message}`;
    }
  },
  { name: "call_subagent", ... }
);
```

## 本章小结

Subagents 模式的核心要点：

1. **架构思想**：主 Agent 作为协调者，子 Agent 作为专家
2. **实现方式**：将子 Agent 包装成工具，主 Agent 通过工具调用
3. **执行策略**：
   - 同步执行：子任务有依赖时使用
   - 异步执行：子任务独立时并行提速
4. **上下文工程**：
   - 定义清晰的输入/输出规范
   - 提供子 Agent 使用说明
   - 只传递必要的上下文
5. **常见陷阱**：
   - 避免传递过多上下文
   - 保持子 Agent 职责单一
   - 做好错误处理

下一篇我们介绍 **Handoffs 模式** —— 如何在对话中平滑切换专家。
