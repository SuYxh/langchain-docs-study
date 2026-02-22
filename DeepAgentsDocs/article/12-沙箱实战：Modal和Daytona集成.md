# 12. 沙箱实战：Modal 和 Daytona 集成

> 构建生产级安全代码执行平台

## 引言

在上一篇文章中，我们了解了沙箱系统的核心概念。本文将实战配置两个主流沙箱提供商——**Modal** 和 **Daytona**，构建完整的安全代码执行平台。

## 提供商对比

| 特性 | Modal | Daytona |
|------|-------|---------|
| 主要语言 | Python | TypeScript/Python |
| GPU 支持 | ✅ 支持 | ❌ 不支持 |
| 冷启动时间 | 中等 | 快速 |
| 计费方式 | 按秒计费 | 按使用量 |
| 网络控制 | blockNetwork 选项 | 可配置 |
| 适用场景 | ML/AI、数据分析 | Web 开发、编码代理 |

## Modal 沙箱

Modal 是一个专为 ML/AI 工作负载设计的云平台，提供 GPU 访问和容器化执行环境。

### 安装依赖

```bash
npm install @langchain/modal deepagents
```

### 环境配置

```bash
# 设置 Modal API Token
export MODAL_TOKEN_ID="your-token-id"
export MODAL_TOKEN_SECRET="your-token-secret"
```

> 💡 **获取 Token**：在 [modal.com](https://modal.com/) 注册并在设置中创建 API Token。

### 基础用法

```typescript
import { createDeepAgent } from "deepagents";
import { ModalSandbox } from "@langchain/modal";

const sandbox = await ModalSandbox.create({
  image: "python:3.11",
  memoryMb: 2048,
  timeout: 300,
});

try {
  const agent = createDeepAgent({
    backend: sandbox,
    systemPrompt: `你是一个 Python 编码助手。你可以在安全的沙箱环境中执行 Python 代码。

工作流程：
1. 理解用户需求
2. 编写 Python 代码
3. 使用 execute 工具运行代码
4. 分析结果并提供解释`
  });

  const result = await agent.invoke({
    messages: [{
      role: "user",
      content: "用 Python 计算斐波那契数列的前 20 项",
    }],
  });

  console.log(result.messages[result.messages.length - 1].content);
} finally {
  await sandbox.close();
}
```

### Modal 配置选项

```typescript
const sandbox = await ModalSandbox.create({
  image: "python:3.11",
  memoryMb: 2048,
  timeout: 300,
  blockNetwork: true,
  gpu: "T4",
  env: {
    PYTHONUNBUFFERED: "1",
  },
});
```

| 选项 | 类型 | 说明 |
|------|------|------|
| `image` | string | Docker 镜像 |
| `memoryMb` | number | 内存限制（MB） |
| `timeout` | number | 超时时间（秒） |
| `blockNetwork` | boolean | 阻断网络访问 |
| `gpu` | string | GPU 类型（T4、A10G、A100等） |
| `env` | object | 环境变量 |

### Modal 实战：数据分析代理

```typescript
import { createDeepAgent } from "deepagents";
import { ModalSandbox } from "@langchain/modal";

const sandbox = await ModalSandbox.create({
  image: "python:3.11",
  memoryMb: 4096,
  timeout: 600,
});

const dataAnalyst = createDeepAgent({
  backend: sandbox,
  systemPrompt: `你是一个数据分析师。你可以在沙箱中运行 Python 代码进行数据分析。

## 可用库
- pandas: 数据处理
- numpy: 数值计算
- matplotlib: 可视化

## 工作流程
1. 安装所需库：execute("pip install pandas numpy matplotlib")
2. 编写分析代码
3. 执行并保存结果
4. 返回分析结论

## 注意事项
- 将图表保存到文件而非显示
- 使用 print() 输出关键结果
- 处理可能的异常`
});

async function analyzeData() {
  const encoder = new TextEncoder();
  
  await sandbox.uploadFiles([
    ["data/sales.csv", encoder.encode(`
date,product,sales,region
2024-01-01,A,100,North
2024-01-01,B,150,South
2024-01-02,A,120,North
2024-01-02,B,130,South
2024-01-03,A,110,North
2024-01-03,B,160,South
`)],
  ]);

  const result = await dataAnalyst.invoke({
    messages: [{
      role: "user",
      content: "分析 data/sales.csv 文件，计算每个产品的总销售额，并生成柱状图保存到 output/sales_chart.png",
    }],
  });

  const downloadResults = await sandbox.downloadFiles(["output/sales_chart.png"]);
  
  if (downloadResults[0].content) {
    const fs = await import("fs");
    fs.writeFileSync("sales_chart.png", downloadResults[0].content);
    console.log("图表已保存到 sales_chart.png");
  }

  return result;
}

try {
  await analyzeData();
} finally {
  await sandbox.close();
}
```

### Modal GPU 加速示例

```typescript
const mlSandbox = await ModalSandbox.create({
  image: "python:3.11-cuda",
  memoryMb: 8192,
  gpu: "T4",
  timeout: 1200,
});

const mlAgent = createDeepAgent({
  backend: mlSandbox,
  systemPrompt: `你是一个机器学习工程师。你可以使用 GPU 加速的沙箱环境。

## 可用资源
- NVIDIA T4 GPU
- CUDA 工具包
- PyTorch / TensorFlow

## 工作流程
1. 安装框架：execute("pip install torch torchvision")
2. 验证 GPU：execute("python -c 'import torch; print(torch.cuda.is_available())'")
3. 运行模型代码`
});
```

---

## Daytona 沙箱

Daytona 是一个专为开发环境设计的平台，提供快速冷启动和丰富的开发工具支持。

### 安装依赖

```bash
npm install @langchain/daytona @daytonaio/sdk deepagents
```

### 环境配置

```bash
# 设置 Daytona API Key
export DAYTONA_API_KEY="your-api-key"
export DAYTONA_API_URL="https://api.daytona.io"
```

### 基础用法

```typescript
import { createDeepAgent } from "deepagents";
import { DaytonaSandbox } from "@langchain/daytona";

const sandbox = await DaytonaSandbox.create();

try {
  const agent = createDeepAgent({
    backend: sandbox,
    systemPrompt: `你是一个全栈开发助手。你可以在沙箱中创建和运行代码。

支持的语言：
- JavaScript / TypeScript
- Python
- Go
- Rust

工具支持：
- Git
- npm / yarn / pnpm
- pip
- Docker (部分支持)`
  });

  const result = await agent.invoke({
    messages: [{
      role: "user",
      content: "创建一个 Express.js 服务器并测试它",
    }],
  });

  console.log(result.messages[result.messages.length - 1].content);
} finally {
  await sandbox.close();
}
```

### Daytona 配置选项

```typescript
import { Daytona, CreateSandboxFromSnapshotParams } from "@daytonaio/sdk";

const client = new Daytona();

const params: CreateSandboxFromSnapshotParams = {
  labels: {
    project: "my-project",
    user: "developer",
  },
  autoDeleteInterval: 3600,
  resources: {
    cpu: 2,
    memory: 4096,
    disk: 10240,
  },
};

const rawSandbox = await client.create(params);
const sandbox = await DaytonaSandbox.fromId(rawSandbox.id);
```

| 选项 | 类型 | 说明 |
|------|------|------|
| `labels` | object | 元数据标签 |
| `autoDeleteInterval` | number | 自动删除时间（秒） |
| `resources.cpu` | number | CPU 核心数 |
| `resources.memory` | number | 内存（MB） |
| `resources.disk` | number | 磁盘空间（MB） |

### Daytona 实战：编码代理

```typescript
import { createDeepAgent } from "deepagents";
import { DaytonaSandbox } from "@langchain/daytona";
import { Daytona } from "@daytonaio/sdk";
import { v4 as uuidv4 } from "uuid";

const client = new Daytona();

async function getOrCreateSandbox(threadId: string) {
  try {
    const existing = await client.findOne({ labels: { thread_id: threadId } });
    return await DaytonaSandbox.fromId(existing.id);
  } catch {
    const newSandbox = await client.create({
      labels: { thread_id: threadId },
      autoDeleteInterval: 3600,
    });
    return await DaytonaSandbox.fromId(newSandbox.id);
  }
}

async function createCodingAgent(threadId: string) {
  const sandbox = await getOrCreateSandbox(threadId);
  
  return createDeepAgent({
    backend: sandbox,
    systemPrompt: `你是一个专业的编码助手。你有一个持久化的沙箱环境。

## 能力
- 创建和编辑代码文件
- 运行 npm/yarn 命令
- 执行测试
- 使用 Git

## 工作流程
1. 理解需求
2. 创建项目结构
3. 编写代码
4. 运行测试
5. 修复问题

## 目录约定
- /workspace/project - 项目根目录
- 使用 ls 检查当前状态
- 保持代码整洁`
  });
}

async function main() {
  const threadId = uuidv4();
  const agent = await createCodingAgent(threadId);

  const result = await agent.invoke({
    messages: [{
      role: "user",
      content: `在 /workspace/project 创建一个 TypeScript 项目：
        1. 初始化 npm 项目
        2. 安装 TypeScript
        3. 创建一个简单的 Hello World 程序
        4. 编译并运行它`,
    }],
  }, { configurable: { thread_id: threadId } });

  console.log(result.messages[result.messages.length - 1].content);
}

main().catch(console.error);
```

### Daytona Git 集成

Daytona 原生支持 Git 操作：

```typescript
const devAgent = createDeepAgent({
  backend: sandbox,
  systemPrompt: `你是一个开发助手，可以克隆和管理 Git 仓库。

## Git 操作示例
- 克隆仓库：execute("git clone https://github.com/user/repo.git")
- 创建分支：execute("git checkout -b feature/new-feature")
- 提交更改：execute("git add . && git commit -m 'message'")
- 推送（需要配置凭据）：execute("git push origin branch-name")

## 安全提示
- 不要在命令中包含凭据
- 使用 SSH 密钥或 Git 凭据助手`
});
```

---

## 综合实战：安全代码执行平台

结合前面学到的知识，构建一个完整的安全代码执行平台：

```typescript
import { createDeepAgent, SubAgent } from "deepagents";
import { DaytonaSandbox } from "@langchain/daytona";
import { MemorySaver } from "@langchain/langgraph";
import { tool } from "langchain";
import * as z from "zod";

const checkpointer = new MemorySaver();

const authenticatedFetch = tool(
  async ({ url, method, body }) => {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return response.json();
  },
  {
    name: "authenticated_fetch",
    description: "调用需要认证的外部 API（凭据安全地保存在沙箱外部）",
    schema: z.object({
      url: z.string(),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]),
      body: z.any().optional(),
    }),
  }
);

const codeReviewer: SubAgent = {
  name: "code-reviewer",
  description: "审查代码质量、安全性和最佳实践",
  systemPrompt: `你是一个代码审查专家。审查代码时关注：
    - 安全漏洞
    - 代码质量
    - 最佳实践
    - 性能问题
    
    返回结构化的审查报告。`,
  tools: [],
};

async function createSecureCodePlatform() {
  const sandbox = await DaytonaSandbox.create({
    labels: { platform: "secure-code-executor" },
    autoDeleteInterval: 7200,
  });

  const agent = createDeepAgent({
    backend: sandbox,
    tools: [authenticatedFetch],
    subagents: [codeReviewer],
    interruptOn: {
      execute: { allowedDecisions: ["approve", "reject"] },
    },
    checkpointer,
    systemPrompt: `你是一个安全的代码执行平台。

## 安全策略
- 所有 Shell 命令执行前需要人工审批
- 外部 API 调用通过 authenticated_fetch（凭据在沙箱外部）
- 敏感代码提交前由 code-reviewer 审查

## 工作流程
1. 理解用户需求
2. 编写代码
3. 交给 code-reviewer 审查
4. 请求执行审批
5. 执行并返回结果

## 目录结构
/workspace/
├── src/       # 源代码
├── tests/     # 测试文件
├── output/    # 输出产物
└── logs/      # 执行日志`
  });

  return { agent, sandbox };
}

async function runWithApproval(
  agent: any,
  message: string,
  threadId: string
) {
  const config = { configurable: { thread_id: threadId } };
  
  let result = await agent.invoke(
    { messages: [{ role: "user", content: message }] },
    config
  );

  while (result.__interrupt__) {
    const actionRequests = result.__interrupt__[0].value.actionRequests;
    
    console.log("\n🔒 需要审批的操作：");
    for (const action of actionRequests) {
      console.log(`  命令: ${action.args.command}`);
    }
    
    const userApproval = await getUserApproval();
    
    const decisions = actionRequests.map(() => ({
      type: userApproval ? "approve" : "reject"
    }));

    const { Command } = await import("@langchain/langgraph");
    result = await agent.invoke(
      new Command({ resume: { decisions } }),
      config
    );
  }

  return result;
}

async function getUserApproval(): Promise<boolean> {
  return true;
}

async function main() {
  const { agent, sandbox } = await createSecureCodePlatform();

  try {
    const result = await runWithApproval(
      agent,
      `创建一个 Node.js 项目，实现一个简单的 REST API：
        - GET /api/users - 返回用户列表
        - POST /api/users - 创建用户
        
        使用 Express.js，包含基本的错误处理。
        编写测试并运行。`,
      "secure-platform-thread-1"
    );

    console.log("\n📋 执行结果：");
    console.log(result.messages[result.messages.length - 1].content);

  } finally {
    await sandbox.close();
  }
}

main().catch(console.error);
```

## 生产环境最佳实践

### 1. 资源限制

```typescript
const sandbox = await DaytonaSandbox.create({
  resources: {
    cpu: 2,
    memory: 4096,
    disk: 10240,
  },
  autoDeleteInterval: 3600,
});
```

### 2. 错误处理

```typescript
async function safeExecute(sandbox, command) {
  try {
    const result = await sandbox.execute(command);
    return { success: true, result };
  } catch (error) {
    console.error(`执行失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

### 3. 日志记录

```typescript
const loggingMiddleware = createMiddleware({
  name: "ExecutionLogger",
  wrapToolCall: async (request, handler) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 开始: ${request.toolCall.name}`);
    
    try {
      const result = await handler(request);
      console.log(`[${new Date().toISOString()}] 完成: ${request.toolCall.name} (${Date.now() - startTime}ms)`);
      return result;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] 失败: ${request.toolCall.name} - ${error.message}`);
      throw error;
    }
  },
});
```

### 4. 清理策略

```typescript
process.on("SIGINT", async () => {
  console.log("正在清理沙箱...");
  await sandbox.close();
  process.exit(0);
});

process.on("uncaughtException", async (error) => {
  console.error("未捕获的异常:", error);
  await sandbox.close();
  process.exit(1);
});
```

## 小结

本文实战演示了 Modal 和 Daytona 两个沙箱提供商的集成：

| 提供商 | 优势 | 适用场景 |
|--------|------|---------|
| Modal | GPU 支持、ML/AI 优化 | 数据分析、机器学习 |
| Daytona | 快速冷启动、开发工具丰富 | Web 开发、编码代理 |

**关键实践**：
- ✅ 使用 uploadFiles/downloadFiles 传输文件
- ✅ 配置 TTL 自动清理
- ✅ 敏感操作配合 interrupt_on
- ✅ 凭据保留在沙箱外部
- ✅ 完善的错误处理和日志

## 下一步

在下一部分（流式处理篇）中，我们将学习：
- 流式输出概览
- useStream React Hook 详解

## 实践任务

1. 使用 Modal 创建一个数据分析代理，分析 CSV 文件并生成图表
2. 使用 Daytona 创建一个编码代理，能够克隆仓库并运行测试
3. 实现一个带审批流程的安全代码执行平台

## 参考资源

- [Modal 官方文档](https://modal.com/docs)
- [Daytona 官方文档](https://www.daytona.io/docs)
- [LangChain Modal 集成](https://docs.langchain.com/oss/javascript/integrations/providers/modal)
- [LangChain Daytona 集成](https://docs.langchain.com/oss/javascript/integrations/providers/daytona)
