# Deep Agents 自定义配置 - 深度解读

---

## 1. 一句话省流 (The Essence)

**Deep Agents 就是一个"超级员工配置中心"，让你可以像组装乐高一样，给 AI Agent 配备大脑(Model)、工具箱(Tools)、性格(System Prompt)、助手团队(Subagents)、文件柜(Backends)等模块，打造专属你的 AI 员工。**

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：没有这个功能之前，我们有多惨？

想象一下，你想让 AI 帮你完成一个复杂任务，比如"调研市场 + 写报告 + 发邮件"：

1. **大脑不够用** - 你只能用一个固定的模型，不能根据任务难度切换不同的"大脑"
2. **手无寸铁** - AI 只会聊天，不能搜网页、不能读文件、不能发邮件
3. **性格单一** - AI 要么是通用助手，要么你得每次手动告诉它"你现在是研究员"
4. **一个人干到死** - 所有任务都堆在一个 Agent 身上，上下文爆炸，AI 越来越"懵"
5. **健忘症晚期** - 对话一结束，AI 就忘了之前聊过什么
6. **脱缰野马** - 敏感操作（比如删文件）没人审批，分分钟酿成大祸

### 解决：Deep Agents 的"九大金刚"配置项

| 配置项 | 解决什么问题 |
|--------|-------------|
| **Model** | 想用 GPT-4.1？想用 Claude？随便换大脑 |
| **Tools** | 给 AI 配上"瑞士军刀"，能搜索、能操作文件 |
| **System Prompt** | 设定 AI 的"人设"和专业领域 |
| **Middleware** | 像"插件系统"，扩展底层能力 |
| **Subagents** | 分身术！主 Agent 太忙就派小弟去干活 |
| **Backends** | 文件存哪？内存里？本地磁盘？你说了算 |
| **Human-in-the-loop** | 敏感操作要人类审批，防止 AI 闯祸 |
| **Skills** | 预装"技能包"，AI 按需加载专业知识 |
| **Memory** | 长期记忆，跨会话也能记住你是谁 |

---

## 3. 生活化/职场类比 (The Analogy)

### 把 Deep Agent 想象成开一家"全能外包公司"

你是老板，`createDeepAgent()` 就是你的**员工招聘和配置系统**：

| Deep Agent 概念 | 外包公司类比 |
|----------------|-------------|
| **Model (模型)** | 员工的"学历和智商" - 你可以招清华的(Claude)，也可以招北大的(GPT-4.1)，根据预算和任务难度选 |
| **Tools (工具)** | 员工的"工具箱" - 研究员需要图书馆借阅卡(网络搜索)，财务需要 Excel(计算工具) |
| **System Prompt** | 员工的"岗位说明书" - "你是高级研究员，负责深度调研和撰写报告" |
| **Middleware** | 公司的"管理制度" - 比如"所有工具使用都要记录日志"、"对话太长要自动总结" |
| **Subagents** | 部门下面的"小弟/实习生" - 主管太忙了，派小弟去专门搞搜索，结果汇总给主管 |
| **Backends** | 公司的"文件存储系统" - 是放内部服务器(StateBackend)？还是本地 NAS(FilesystemBackend)？ |
| **Human-in-the-loop** | "重大事项需老板签字" - 删客户文件？发重要邮件？必须人工批准！ |
| **Skills** | 员工的"技能证书" - 需要时才亮出来，避免简历太长面试官看不完 |
| **Memory** | 员工的"工作日志本" - 离职再入职也能记得之前项目做了啥 |

### 一个生动的场景

老板（你）说："我要一个能帮我调研市场的 AI 员工"

```
createDeepAgent({
  name: "market_researcher",           // 员工姓名：小市
  model: "claude-sonnet-4-5",          // 学历：Claude 系毕业，聪明但不太贵
  systemPrompt: "你是资深市场分析师", // 岗位说明书
  tools: [internetSearch],             // 工具箱：给他开通网络搜索权限
  subagents: [dataAnalyst],            // 给他配个数据分析小弟
  interruptOn: {
    send_email: true                   // 发邮件要老板审批
  }
})
```

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 Model - 大脑选择

**大白话：** 就是选择 AI 的"智商"来自哪家公司。

```typescript
// 方式一：直接写字符串，最简单
model: "gpt-4.1"                      // OpenAI 家的
model: "claude-sonnet-4-5-20250929"   // Anthropic 家的
model: "azure_openai:gpt-4.1"         // 微软 Azure 托管的

// 方式二：精细控制，比如设置 temperature
const model = new ChatOpenAI({ model: "gpt-4.1", temperature: 0 });
```

**关键点：** 用 `provider:model` 格式可以一行代码切换不同厂商！

---

### 4.2 Tools - 工具箱

**大白话：** AI 只会"动嘴"不会"动手"，Tools 就是给它装上"手"。

```typescript
// 定义一个网络搜索工具
const internetSearch = tool(
  async ({ query }) => {
    // 真正干活的代码：调用 Tavily 搜索 API
    return await tavilySearch._call({ query });
  },
  {
    name: "internet_search",      // 工具名称
    description: "Run a web search", // 告诉 AI 这玩意儿是干嘛的
    schema: z.object({...})       // 参数校验：query 必须是字符串
  }
);
```

**逻辑意图：** 
- AI 想搜索时，会自动调用这个工具
- `schema` 确保 AI 传的参数格式正确，不会乱传

---

### 4.3 Middleware - 中间件/插件系统

**大白话：** 在 AI 干活的"流水线"上插入自定义环节，比如：
- 每次调用工具都打印日志（监控）
- 对话太长自动压缩（省 token）
- 用 Anthropic 模型时自动开启缓存（省钱）

```typescript
const logToolCallsMiddleware = createMiddleware({
  name: "LogToolCallsMiddleware",
  wrapToolCall: async (request, handler) => {
    console.log(`工具调用: ${request.toolCall.name}`);  // 干活前：打日志
    const result = await handler(request);             // 干活
    console.log(`调用完成`);                           // 干活后：打日志
    return result;
  },
});
```

**逻辑意图：** 这就像在"调用工具"这条流水线上安装了一个"监控摄像头"。

**内置的 6 大中间件：**
| 中间件 | 干啥的 |
|--------|--------|
| TodoListMiddleware | 管理任务清单，AI 干活更有条理 |
| FilesystemMiddleware | 让 AI 能读写文件 |
| SubAgentMiddleware | 让 AI 能派小弟干活 |
| SummarizationMiddleware | 对话太长自动压缩，防止超 token |
| AnthropicPromptCachingMiddleware | Anthropic 模型专属：省钱缓存 |
| PatchToolCallsMiddleware | 修复工具调用中断的问题 |

---

### 4.4 Subagents - 分身术

**大白话：** 主 Agent 太忙或上下文太长，就派"专业小弟"去处理子任务。

```python
research_subagent = {
    "name": "research-agent",                    # 小弟名字
    "description": "Used to research questions", # 能力简介
    "system_prompt": "You are a great researcher", # 小弟的人设
    "tools": [internet_search],                  # 小弟专属工具
    "model": "openai:gpt-4.1",                   # 小弟可以用不同的大脑！
}
```

**为什么要分身？**
- **隔离上下文** - 小弟干活的过程不会污染主 Agent 的"记忆"
- **专业分工** - 搜索交给搜索小弟，分析交给分析小弟
- **并行处理** - 多个小弟可以同时干活

---

### 4.5 Backends - 文件存储后端

**大白话：** AI 读写文件时，文件到底存在哪儿？

| Backend 类型 | 通俗解释 | 适用场景 |
|-------------|---------|---------|
| **StateBackend** | 临时便签纸，对话结束就扔 | 默认选项，简单任务 |
| **FilesystemBackend** | 直接操作你电脑的硬盘 | 需要真正读写本地文件 (危险!) |
| **LocalShellBackend** | 不仅能读写文件，还能执行命令 | 开发者工具 (更危险!!) |
| **StoreBackend** | 跨对话持久存储 | 需要长期记忆 |
| **CompositeBackend** | 混合模式：不同路径用不同后端 | 复杂场景 |

**Sandbox 沙箱：** 如果不想让 AI 直接操作你的电脑，可以用沙箱隔离！

```typescript
const sandbox = await DenoSandbox.create({ memoryMb: 1024 });
const agent = createDeepAgent({ backend: sandbox });
// AI 只能在沙箱里折腾，不会弄坏你的系统
```

---

### 4.6 Human-in-the-loop - 人工审批

**大白话：** 敏感操作必须人类点头才能执行。

```python
agent = create_deep_agent(
    tools=[delete_file, read_file, send_email],
    interrupt_on={
        "delete_file": True,    # 删文件：必须审批
        "read_file": False,     # 读文件：随便读
        "send_email": {"allowed_decisions": ["approve", "reject"]},  # 发邮件：批准或拒绝，不能改内容
    },
    checkpointer=checkpointer  # 必须配置！不然没法"暂停等审批"
)
```

**重要：** 必须配置 `checkpointer`，否则 Agent 没法"暂停"等你审批！

---

### 4.7 Skills - 技能包

**大白话：** 预先写好的"专业知识手册"，AI 觉得需要时才加载。

**为什么不直接塞进 System Prompt？**
- 塞太多 AI 会"记不住"（上下文限制）
- 浪费 token（很多时候用不上）

**技能包的工作方式：**
1. 你把技能文件放在 `/skills/` 目录
2. AI 接到任务后，先扫一眼有哪些技能包
3. 觉得"这个任务需要 langgraph 知识"，就加载 `langgraph-docs` 技能包
4. **按需加载，省 token 又精准**

---

### 4.8 Memory - 长期记忆

**大白话：** 用 `AGENTS.md` 文件给 AI "塞小抄"，告诉它项目背景、注意事项等。

```typescript
const agent = await createDeepAgent({
  memory: ["/AGENTS.md"],  // 指定记忆文件路径
});
```

**典型用途：**
- 项目代码规范
- 用户偏好设置
- 常见问题 FAQ

---

### 4.9 Structured Output - 结构化输出

**大白话：** 让 AI 的回答必须符合你定义的"模板"。

```typescript
// 定义天气报告必须长这样
const weatherReportSchema = z.object({
  location: z.string(),     // 必须有地点
  temperature: z.number(),  // 必须有温度(数字)
  condition: z.string(),    // 必须有天气状况
});

const agent = await createDeepAgent({
  responseFormat: weatherReportSchema,
});

// AI 返回的结果保证是这个格式，可以直接当 JSON 用！
result.structuredResponse.temperature  // 直接取温度值
```

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 一个完整的 Agent 配置示例

```typescript
const agent = createDeepAgent({
  // 1. 起个名字
  name: "research_assistant",
  
  // 2. 选个聪明的大脑
  model: "claude-sonnet-4-5-20250929",
  
  // 3. 告诉它"你是谁"
  systemPrompt: "你是一位资深研究员，擅长深度调研和撰写专业报告。",
  
  // 4. 给它装备工具
  tools: [internetSearch],
  
  // 5. 给它配几个小弟
  subagents: [dataAnalyst, factChecker],
  
  // 6. 敏感操作要审批
  interruptOn: {
    send_email: true,
    delete_file: true,
  },
  
  // 7. 配置记忆
  memory: ["/project-context.md"],
  
  // 8. 返回结构化数据
  responseFormat: researchReportSchema,
  
  // 9. 记录状态（审批必需）
  checkpointer: new MemorySaver(),
});
```

**这段配置翻译成人话就是：**

"招一个叫 `research_assistant` 的员工，用 Claude 的大脑，定位是资深研究员，能用网络搜索工具，有两个小弟（数据分析师和事实核查员），发邮件和删文件要我批准，入职先看 project-context.md 了解项目背景，最后交的报告必须按模板来。"

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：电商客服智能助手

**需求：** 做一个能处理退款、查物流、推荐产品的客服 AI

```typescript
// 定义工具
const checkOrderStatus = tool(...);   // 查订单
const processRefund = tool(...);      // 处理退款
const recommendProducts = tool(...);  // 推荐商品

// 定义子 Agent
const refundSpecialist = {
  name: "refund-specialist",
  description: "处理复杂退款案例",
  systemPrompt: "你是退款专家，熟悉退款政策...",
  tools: [processRefund],
};

// 创建主 Agent
const customerServiceAgent = createDeepAgent({
  model: "gpt-4.1",
  systemPrompt: `你是电商客服，友善专业。遇到复杂退款找 refund-specialist。`,
  tools: [checkOrderStatus, recommendProducts],
  subagents: [refundSpecialist],
  interruptOn: {
    processRefund: true,  // 退款必须人工审批！
  },
  memory: ["/refund-policy.md", "/shipping-faq.md"],
  checkpointer: new MemorySaver(),
});
```

### 为什么这么配置？

| 配置项 | 为什么这么设 |
|--------|-------------|
| **model: gpt-4.1** | 客服对话不需要最聪明的模型，gpt-4.1 性价比高 |
| **subagents: refundSpecialist** | 退款逻辑复杂，分离出去避免主 Agent 上下文爆炸 |
| **interruptOn: processRefund** | 退款涉及金钱，必须人工最终确认 |
| **memory** | 预加载退款政策和物流 FAQ，AI 回答更准确 |

### 效果对比

| 没有 Deep Agent 配置 | 有 Deep Agent 配置 |
|---------------------|-------------------|
| AI 只会聊天，查不了订单 | 能直接调用系统查订单 |
| 退款自动执行，可能出错 | 退款必须人工确认 |
| 复杂退款处理混乱 | 专业小弟处理，结果清晰 |
| 每次都要重复问政策 | 预加载政策文档，回答一致 |

---

## 7. 重要注意事项

### 中间件的坑：不要在 Middleware 里改自己的属性！

```python
# 错误示范 - 会导致并发 bug
class BadMiddleware(AgentMiddleware):
    def __init__(self):
        self.count = 0
    
    def before_agent(self, state, runtime):
        self.count += 1  # 多个线程同时改，会出问题！

# 正确做法 - 用 graph state 来存
class GoodMiddleware(AgentMiddleware):
    def before_agent(self, state, runtime):
        return {"count": state.get("count", 0) + 1}  # 安全！
```

**记住：** Deep Agent 可能同时跑多个子任务（subagents、并行工具），改自己的变量会炸！

---

## 8. 总结

Deep Agents 的自定义配置，本质上就是回答这几个问题：

1. **用谁的大脑？** -> Model
2. **能干什么活？** -> Tools
3. **是什么人设？** -> System Prompt
4. **底层怎么扩展？** -> Middleware
5. **要不要派小弟？** -> Subagents
6. **文件存哪里？** -> Backends
7. **敏感操作谁批？** -> Human-in-the-loop
8. **专业知识怎么装？** -> Skills
9. **怎么记住上下文？** -> Memory
10. **输出什么格式？** -> Structured Output

掌握这些配置项，你就能像"捏脸游戏"一样，打造出完全符合你需求的 AI Agent！

---

> 文档来源：[LangChain Deep Agents - Customize Deep Agents](https://docs.langchain.com)
> 
> 解读版本：v1.0
> 
> 适用人群：LangChain 初学者 / AI 应用开发者
