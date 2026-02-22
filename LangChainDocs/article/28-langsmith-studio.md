# 28. LangSmith Studio：Agent 开发的"显微镜"

## 简单来说

想象你在开发一个复杂的 Agent，用户说："帮我发一封邮件给张三"。Agent 应该：
1. 理解用户意图
2. 调用 `send_email` 工具
3. 返回结果

但实际运行时，Agent 没有发邮件，只是说"好的，我帮你发了"。

**出了什么问题？**

- LLM 没有调用工具？
- 工具调用了但参数错误？
- 工具返回了错误但 Agent 忽略了？

没有可视化工具，你只能加一堆 `console.log`，然后在满屏日志中大海捞针。

**LangSmith Studio** 就是为此而生的"显微镜"——它让你**看见** Agent 内部发生的一切：

```
┌─────────────────────────────────────────────────────────┐
│  LangSmith Studio                                       │
├─────────────────────────────────────────────────────────┤
│  Step 1: User Input                                     │
│  └── "帮我发邮件给张三"                                  │
│                                                         │
│  Step 2: LLM Call                                       │
│  ├── Prompt: [系统提示 + 用户消息]                       │
│  ├── Response: tool_call: send_email                    │
│  └── Tokens: 150 | Latency: 800ms                       │
│                                                         │
│  Step 3: Tool Execution                                 │
│  ├── Tool: send_email                                   │
│  ├── Args: { to: "zhangsan@example.com", ... }          │
│  └── Result: "Email sent successfully"                  │
│                                                         │
│  Step 4: Final Response                                 │
│  └── "已成功发送邮件给张三"                              │
└─────────────────────────────────────────────────────────┘
```

## 本节目标

1. 理解 LangSmith Studio 解决什么问题
2. 学会搭建本地 Agent 服务器
3. 掌握 Studio 的核心调试功能
4. 了解热重载和状态回放

## 业务场景

假设你在开发一个**邮件助手 Agent**：

```typescript
import { createAgent, tool } from "langchain";
import * as z from "zod";

const sendEmail = tool(
  async ({ to, subject, body }) => {
    // 发送邮件逻辑
    return `Email sent to ${to}`;
  },
  {
    name: "send_email",
    description: "发送邮件",
    schema: z.object({
      to: z.string().describe("收件人邮箱"),
      subject: z.string().describe("邮件主题"),
      body: z.string().describe("邮件正文")
    })
  }
);

const emailAgent = createAgent({
  model: "gpt-4.1",
  tools: [sendEmail],
  systemPrompt: "你是一个邮件助手。始终使用 send_email 工具发送邮件。"
});
```

开发过程中你会遇到这些问题：

1. **Agent 不调用工具** —— 直接回复"好的"但没执行
2. **工具参数错误** —— 邮箱格式不对、主题为空
3. **多步骤调试难** —— 复杂流程不知道哪一步出错
4. **性能问题** —— 不知道哪一步耗时最长

LangSmith Studio 能帮你**一眼看清**所有这些问题。

## 环境准备

### 1. 注册 LangSmith 账号

访问 [smith.langchain.com](https://smith.langchain.com) 注册免费账号。

### 2. 获取 API Key

在 LangSmith 设置页面创建 API Key。

### 3. 安装 LangGraph CLI

```bash
# Python >= 3.11 required
pip install --upgrade "langgraph-cli[inmem]"
```

## 搭建本地 Agent 服务器

### 项目结构

```
my-email-agent/
├── src/
│   └── agent.ts        # Agent 代码
├── .env                # 环境变量
└── langgraph.json      # LangGraph 配置
```

### Step 1：编写 Agent 代码

```typescript
// src/agent.ts
import { createAgent, tool } from "langchain";
import * as z from "zod";

const sendEmail = tool(
  async ({ to, subject, body }) => {
    console.log(`Sending email to ${to}...`);
    // 实际的邮件发送逻辑
    return `Email sent to ${to} with subject "${subject}"`;
  },
  {
    name: "send_email",
    description: "发送邮件给指定收件人",
    schema: z.object({
      to: z.string().email().describe("收件人邮箱地址"),
      subject: z.string().min(1).describe("邮件主题"),
      body: z.string().describe("邮件正文内容")
    })
  }
);

export const agent = createAgent({
  model: "gpt-4.1",
  tools: [sendEmail],
  systemPrompt: `你是一个专业的邮件助手。

职责：
- 帮用户撰写和发送邮件
- 始终使用 send_email 工具发送邮件
- 发送前确认收件人、主题和正文

注意：
- 如果用户没有提供收件人邮箱，请询问
- 邮件正文要专业、礼貌`
});
```

### Step 2：配置环境变量

```bash
# .env
LANGSMITH_API_KEY=lsv2_your_api_key_here
OPENAI_API_KEY=sk-your_openai_key_here

# 可选：禁用追踪（数据不会发送到 LangSmith 云端）
# LANGSMITH_TRACING=false
```

⚠️ **重要**：确保 `.env` 文件不被提交到 Git！

### Step 3：创建 LangGraph 配置

```json
// langgraph.json
{
  "dependencies": ["."],
  "graphs": {
    "email_agent": "./src/agent.ts:agent"
  },
  "env": ".env"
}
```

### Step 4：安装依赖

```bash
npm install langchain @langchain/openai zod
```

### Step 5：启动开发服务器

```bash
langgraph dev
```

启动后，你会看到：
- **API 端点**：`http://127.0.0.1:2024`
- **Studio UI**：自动打开浏览器

## Studio 核心功能

### 功能 1：实时执行追踪

每一步执行都清晰可见：

```
┌─ Thread: 新对话 ─────────────────────────────────────┐
│                                                      │
│  [User] 帮我给 john@example.com 发一封会议邀请       │
│                                                      │
│  [LLM Call]                                          │
│  ├─ Model: gpt-4.1                                   │
│  ├─ Tokens: Input 180 / Output 45                    │
│  ├─ Latency: 1.2s                                    │
│  └─ Response: tool_call → send_email                 │
│                                                      │
│  [Tool: send_email]                                  │
│  ├─ Args:                                            │
│  │   to: "john@example.com"                          │
│  │   subject: "会议邀请"                              │
│  │   body: "您好，诚邀您参加..."                      │
│  ├─ Duration: 50ms                                   │
│  └─ Result: "Email sent to john@example.com..."      │
│                                                      │
│  [Assistant] 已成功发送会议邀请给 john@example.com   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 功能 2：Prompt 检查

点击任意 LLM 调用，可以看到完整的 Prompt：

```
System: 你是一个专业的邮件助手...

User: 帮我给 john@example.com 发一封会议邀请

Tools: [
  {
    name: "send_email",
    description: "发送邮件给指定收件人",
    parameters: { to, subject, body }
  }
]
```

这对于调试"为什么 Agent 没有调用工具"非常有用 —— 可能是 Prompt 里根本没包含工具描述！

### 功能 3：热重载

修改代码后，Studio **自动刷新**，无需重启服务器：

```typescript
// 修改前
systemPrompt: "你是一个邮件助手"

// 修改后 - 保存文件，Studio 自动更新
systemPrompt: "你是一个专业的邮件助手，必须使用 send_email 工具"
```

这让迭代速度极快 —— 改 Prompt、看效果、再改、再看，几秒钟一个循环。

### 功能 4：状态回放（Time Travel）

最强大的功能 —— 从任意步骤**重新开始**执行：

```
对话执行了 5 步，第 3 步工具调用失败

传统调试：从头开始，重新输入，等待前两步执行
Studio：点击第 2 步的"从这里重新开始"，直接跳到第 3 步
```

这对于调试长流程特别有用，节省大量等待时间。

### 功能 5：性能指标

每一步都有详细的性能数据：

| 指标 | 说明 | 用途 |
|------|------|------|
| Tokens | 输入/输出 Token 数 | 成本估算 |
| Latency | 响应时间 | 性能瓶颈定位 |
| Model | 使用的模型 | 确认配置正确 |

## 调试实战

### 场景 1：Agent 不调用工具

**现象**：用户说"发邮件"，Agent 直接回复"好的，已发送"

**Studio 诊断**：
1. 查看 LLM Call 的 Response
2. 发现没有 `tool_calls`，只有纯文本回复
3. 检查 Prompt，发现系统提示没有明确要求使用工具

**修复**：
```typescript
// 修改前
systemPrompt: "你是一个邮件助手"

// 修改后
systemPrompt: "你是一个邮件助手。发送邮件时必须使用 send_email 工具，不要只是说已发送。"
```

### 场景 2：工具参数错误

**现象**：邮件发送失败

**Studio 诊断**：
1. 查看 Tool Execution 的 Args
2. 发现 `to: "张三"` 而不是邮箱地址
3. 工具的 Schema 验证失败

**修复**：
```typescript
// 在系统提示中明确要求
systemPrompt: `...
发送邮件前，确保收件人是有效的邮箱地址（xxx@xxx.com 格式）。
如果用户只提供了名字，请询问邮箱地址。`
```

### 场景 3：多步骤流程调试

**现象**：复杂任务执行到一半失败

**Studio 诊断**：
1. 展开完整的执行轨迹
2. 找到失败的那一步
3. 查看该步的输入、输出和错误信息
4. 使用"从这里重新开始"测试修复

## 最佳实践

### 1. 开发时始终开启 Studio

```bash
# 开发环境始终这样启动
langgraph dev
```

比 `console.log` 调试高效 10 倍。

### 2. Safari 用户使用 Tunnel

Safari 会阻止 localhost 连接，使用 `--tunnel` 参数：

```bash
langgraph dev --tunnel
```

### 3. 敏感数据保护

如果不想让数据发送到云端：

```bash
# .env
LANGSMITH_TRACING=false
```

这样 Studio 仍然可用，但数据只在本地。

### 4. 利用状态回放加速调试

```
复杂流程调试顺序：
1. 完整执行一次，找到失败点
2. 修改代码
3. 从失败点的前一步重新开始
4. 验证修复
5. 重复直到成功
```

## 完整示例：邮件助手开发流程

```typescript
// src/agent.ts
import { createAgent, tool } from "langchain";
import * as z from "zod";

const sendEmail = tool(
  async ({ to, subject, body }) => {
    // 验证邮箱格式
    if (!to.includes("@")) {
      throw new Error(`Invalid email address: ${to}`);
    }
    
    // 模拟发送
    console.log(`📧 Sending email...`);
    console.log(`   To: ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Body: ${body.substring(0, 50)}...`);
    
    return `Email sent successfully to ${to}`;
  },
  {
    name: "send_email",
    description: "发送邮件。必须提供有效的邮箱地址。",
    schema: z.object({
      to: z.string().email().describe("收件人邮箱地址（必须是 xxx@xxx.com 格式）"),
      subject: z.string().min(1).describe("邮件主题（不能为空）"),
      body: z.string().min(10).describe("邮件正文（至少 10 个字符）")
    })
  }
);

const draftEmail = tool(
  async ({ purpose, tone }) => {
    const templates = {
      meeting: "您好，\n\n诚邀您参加...",
      followup: "您好，\n\n感谢您上次的沟通...",
      introduction: "您好，\n\n我是..."
    };
    return templates[purpose] || "您好，\n\n...";
  },
  {
    name: "draft_email",
    description: "生成邮件草稿",
    schema: z.object({
      purpose: z.enum(["meeting", "followup", "introduction"]).describe("邮件目的"),
      tone: z.enum(["formal", "casual"]).describe("语气风格")
    })
  }
);

export const agent = createAgent({
  model: "gpt-4.1",
  tools: [sendEmail, draftEmail],
  systemPrompt: `你是一个专业的邮件助手。

## 工作流程
1. 理解用户的邮件需求
2. 如果需要，使用 draft_email 生成草稿
3. 确认收件人邮箱地址（必须是 xxx@xxx.com 格式）
4. 使用 send_email 发送邮件

## 重要规则
- 发送邮件必须使用 send_email 工具
- 如果用户没有提供邮箱地址，必须询问
- 发送前确认主题和正文

## 错误处理
- 如果邮箱格式不对，提示用户重新提供
- 如果发送失败，告知用户具体错误`
});
```

开发流程：

1. **启动 Studio**：`langgraph dev`
2. **测试基本功能**：在 Studio 中输入"帮我发邮件给 test@example.com"
3. **检查执行轨迹**：确认工具被正确调用
4. **测试边界情况**：输入"发邮件给张三"，看 Agent 是否询问邮箱
5. **性能优化**：查看每一步的延迟，优化慢的部分
6. **迭代改进**：修改 Prompt，立即看到效果

## 本章小结

LangSmith Studio 的核心价值：

1. **可视化调试**：
   - 看见每一步的输入输出
   - 检查完整的 Prompt
   - 追踪工具调用和返回值

2. **开发效率**：
   - 热重载，改代码立即生效
   - 状态回放，从任意步骤重新开始
   - 比 console.log 高效 10 倍

3. **性能分析**：
   - Token 使用量
   - 响应延迟
   - 瓶颈定位

4. **最佳实践**：
   - 开发时始终开启 Studio
   - 利用状态回放加速调试
   - 敏感数据可以禁用云端追踪

Studio 是 Agent 开发的必备工具，就像 Chrome DevTools 之于前端开发一样重要！

下一篇我们介绍 **Agent Chat UI** —— 快速搭建 Agent 聊天界面。