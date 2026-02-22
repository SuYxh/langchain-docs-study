# 12. 结构化输出：让 AI 返回你想要的数据格式

## 简单来说

结构化输出让 Agent 返回预定义格式的数据，而不是自由文本。你定义一个 Schema，AI 就按这个格式输出——就像填表格一样，每个字段都有明确的类型和约束。

## 本节目标

学完本节，你将能够：
- 使用 Zod Schema 定义结构化输出格式
- 理解 Provider 策略和 Tool 策略的区别
- 处理结构化输出的验证错误和重试
- 实现联合类型让 AI 选择合适的输出结构

## 业务场景

想象这些真实需求：

1. **客户信息提取**：从用户消息中提取姓名、邮箱、电话，存入 CRM 系统
2. **产品评论分析**：从用户评价中提取评分、情感倾向、关键词，用于数据分析
3. **会议纪要生成**：从会议记录中提取待办事项、负责人、优先级

这些场景都需要 AI 输出结构化数据，而不是自由文本——结构化输出正是为此而生。

---

## 一、基础用法

### 1.1 使用 Zod Schema 定义输出格式

```typescript
import * as z from "zod";
import { createAgent } from "langchain";

const ContactInfo = z.object({
  name: z.string().describe("联系人姓名"),
  email: z.string().describe("邮箱地址"),
  phone: z.string().describe("电话号码"),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: ContactInfo,
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "提取联系信息：张三，zhangsan@example.com，13800138000" }]
});

console.log(result.structuredResponse);
// { name: "张三", email: "zhangsan@example.com", phone: "13800138000" }
```

### 1.2 使用 JSON Schema 定义

如果你更熟悉 JSON Schema，也可以这样定义：

```typescript
const contactInfoSchema = {
  type: "object",
  description: "联系人信息",
  properties: {
    name: { type: "string", description: "联系人姓名" },
    email: { type: "string", description: "邮箱地址" },
    phone: { type: "string", description: "电话号码" }
  },
  required: ["name", "email", "phone"]
};

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: contactInfoSchema,
});
```

**类比理解**：结构化输出就像让 AI 填写表单——你设计好表单字段（Schema），AI 负责把信息填到正确的位置。这比让 AI 自由发挥然后你再解析要可靠得多。

---

## 二、两种策略：Provider vs Tool

### 2.1 Provider 策略（推荐）

Provider 策略利用模型提供商（如 OpenAI、Anthropic）的原生结构化输出能力：

```typescript
import { createAgent, providerStrategy } from "langchain";
import * as z from "zod";

const ContactInfo = z.object({
  name: z.string().describe("联系人姓名"),
  email: z.string().describe("邮箱地址"),
  phone: z.string().describe("电话号码"),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: providerStrategy(ContactInfo)
});
```

**优点**：
- 高可靠性：模型提供商在底层强制执行 Schema
- 严格验证：输出一定符合定义的格式

**适用模型**：OpenAI GPT-4o、xAI Grok、Google Gemini、Anthropic Claude

### 2.2 Tool 策略

对于不支持原生结构化输出的模型，LangChain 使用工具调用来实现：

```typescript
import { createAgent, toolStrategy } from "langchain";
import * as z from "zod";

const ProductReview = z.object({
  rating: z.number().min(1).max(5).optional(),
  sentiment: z.enum(["positive", "negative"]),
  keyPoints: z.array(z.string()).describe("评论要点，小写，1-3 个词"),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: toolStrategy(ProductReview)
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "分析评论：'产品很棒，5 星好评！发货快但价格偏贵'" }]
});

console.log(result.structuredResponse);
// { rating: 5, sentiment: "positive", keyPoints: ["发货快", "价格贵"] }
```

**工作原理**：LangChain 把 Schema 转换成一个"虚拟工具"，AI 调用这个工具来输出结构化数据。

---

## 三、联合类型：让 AI 选择输出结构

有时候，根据输入内容，AI 需要选择不同的输出结构：

```typescript
import * as z from "zod";
import { createAgent, toolStrategy } from "langchain";

const ProductReview = z.object({
  rating: z.number().min(1).max(5).optional(),
  sentiment: z.enum(["positive", "negative"]),
  keyPoints: z.array(z.string()),
});

const CustomerComplaint = z.object({
  issueType: z.enum(["product", "service", "shipping", "billing"]),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string().describe("投诉简述"),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: toolStrategy([ProductReview, CustomerComplaint])
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "分析：'产品很棒，5 星好评！'" }]
});
// 返回 ProductReview

const result2 = await agent.invoke({
  messages: [{ role: "user", content: "分析：'发货延迟一周，非常不满意！'" }]
});
// 返回 CustomerComplaint
```

---

## 四、自定义工具消息

当使用 Tool 策略时，可以自定义结构化输出生成后的消息：

```typescript
import * as z from "zod";
import { createAgent, toolStrategy } from "langchain";

const MeetingAction = z.object({
  task: z.string().describe("具体任务"),
  assignee: z.string().describe("负责人"),
  priority: z.enum(["low", "medium", "high"]).describe("优先级"),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: toolStrategy(MeetingAction, {
    toolMessageContent: "已记录待办事项！"
  })
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "会议纪要：小李需要尽快更新项目时间表" }]
});

console.log(result.structuredResponse);
// { task: "更新项目时间表", assignee: "小李", priority: "high" }
```

---

## 五、错误处理与自动重试

### 5.1 多结构输出错误

当 AI 错误地同时输出多个结构时，LangChain 会自动提示重试：

```typescript
const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: toolStrategy([ContactInfo, EventDetails]),
});

const result = await agent.invoke({
  messages: [{
    role: "user",
    content: "提取信息：张三 (zhangsan@email.com) 正在组织 3 月 15 日的技术大会"
  }]
});

// 如果 AI 同时输出 ContactInfo 和 EventDetails
// LangChain 会自动发送错误消息，要求 AI 只选择一个
```

### 5.2 Schema 验证错误

当输出不符合 Schema 约束时，LangChain 会提供具体错误信息：

```typescript
const ProductRating = z.object({
  rating: z.number().min(1).max(5).describe("1-5 分评分"),
  comment: z.string().describe("评论内容"),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: toolStrategy(ProductRating),
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "解析：太棒了，10/10！" }]
});

// AI 可能先输出 rating: 10，LangChain 会返回验证错误
// AI 会自动修正为 rating: 5
```

### 5.3 自定义错误处理

```typescript
import { ToolInputParsingException } from "@langchain/core/tools";

const responseFormat = toolStrategy(ProductRating, {
  handleError: (error) => {
    if (error instanceof ToolInputParsingException) {
      return "请提供 1-5 分的有效评分和评论内容。";
    }
    return error.message;
  }
});

// 禁用错误处理（直接抛出异常）
const strictFormat = toolStrategy(ProductRating, {
  handleError: false
});
```

---

## 六、复杂嵌套结构

### 6.1 嵌套对象

```typescript
const OrderInfo = z.object({
  customer: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string(),
  }),
  items: z.array(z.object({
    productName: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
  })),
  totalAmount: z.number(),
  status: z.enum(["pending", "processing", "shipped", "delivered"]),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: OrderInfo,
});
```

### 6.2 可选字段和默认值

```typescript
const UserProfile = z.object({
  name: z.string(),
  email: z.string(),
  age: z.number().optional(),
  preferences: z.object({
    theme: z.enum(["light", "dark"]).default("light"),
    notifications: z.boolean().default(true),
  }).optional(),
});
```

---

## 七、实战示例

### 7.1 发票信息提取

```typescript
import * as z from "zod";
import { createAgent } from "langchain";

const InvoiceItem = z.object({
  description: z.string().describe("商品描述"),
  quantity: z.number().describe("数量"),
  unitPrice: z.number().describe("单价"),
  amount: z.number().describe("金额"),
});

const InvoiceInfo = z.object({
  invoiceNumber: z.string().describe("发票号"),
  date: z.string().describe("开票日期"),
  vendor: z.object({
    name: z.string().describe("供应商名称"),
    address: z.string().describe("供应商地址"),
  }),
  items: z.array(InvoiceItem).describe("商品明细"),
  subtotal: z.number().describe("小计"),
  tax: z.number().describe("税额"),
  total: z.number().describe("总计"),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: InvoiceInfo,
});

const result = await agent.invoke({
  messages: [{
    role: "user",
    content: `
      提取发票信息：
      发票号：INV-2024-001
      日期：2024-01-15
      供应商：ABC 科技有限公司，北京市海淀区中关村大街 1 号
      
      商品明细：
      - 笔记本电脑 x2 @8999 = 17998
      - 无线鼠标 x5 @199 = 995
      
      小计：18993
      税额（13%）：2469
      总计：21462
    `
  }]
});

console.log(JSON.stringify(result.structuredResponse, null, 2));
```

### 7.2 简历信息解析

```typescript
const WorkExperience = z.object({
  company: z.string(),
  position: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  responsibilities: z.array(z.string()),
});

const Education = z.object({
  school: z.string(),
  degree: z.string(),
  major: z.string(),
  graduationYear: z.number(),
});

const ResumeInfo = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  summary: z.string().describe("个人简介"),
  skills: z.array(z.string()),
  experience: z.array(WorkExperience),
  education: z.array(Education),
});

const agent = createAgent({
  model: "gpt-4o",
  tools: [],
  responseFormat: ResumeInfo,
});
```

---

## 常见问题

### Q1: Provider 策略和 Tool 策略怎么选？

优先使用 Provider 策略（如果模型支持），因为它更可靠。LangChain 会自动检测模型能力，如果不支持会自动回退到 Tool 策略。

### Q2: 结构化输出失败怎么办？

LangChain 内置了自动重试机制。如果仍然失败，可以：
1. 检查 Schema 定义是否过于复杂
2. 在字段 `describe()` 中添加更清晰的说明
3. 自定义 `handleError` 提供更好的错误提示

### Q3: 可以同时使用工具和结构化输出吗？

可以，但模型需要支持同时使用工具和结构化输出。大多数现代模型（GPT-4o、Claude 3.5 等）都支持。

---

## 总结

结构化输出让 Agent 返回可预测、可解析的数据格式：

| 功能 | 实现方式 |
|------|----------|
| 基础定义 | Zod Schema 或 JSON Schema |
| 原生支持 | `providerStrategy()` |
| 通用支持 | `toolStrategy()` |
| 联合类型 | 传入 Schema 数组 |
| 错误处理 | `handleError` 选项 |
| 自定义消息 | `toolMessageContent` 选项 |

**核心理念**：结构化输出将 AI 的自由文本输出转换为类型安全的结构化数据，让后续处理更简单、更可靠。

下一篇，我们将学习中间件系统，掌握在 Agent 执行过程中插入自定义逻辑的能力！
