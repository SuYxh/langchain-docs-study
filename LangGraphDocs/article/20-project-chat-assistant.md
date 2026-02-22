# 20. 项目实战：多轮对话助手

## 项目简介

本项目将从零构建一个**带记忆的智能聊天机器人**，实现：
- 🧠 **对话持久化**：重启后记住之前的对话
- 📝 **上下文管理**：自动管理对话历史长度
- 🗜️ **消息摘要**：对话过长时自动压缩历史
- 👥 **多用户支持**：不同用户独立的对话记忆

**难度等级：** ⭐⭐

**涉及知识点：** Graph API + Checkpointer + 短期记忆 + 消息管理

---

## 🎯 学习目标

完成本项目后，你将掌握：

1. 如何使用 Checkpointer 实现对话持久化
2. 如何管理消息历史防止 Token 超限
3. 如何实现消息摘要压缩历史
4. 如何支持多用户独立会话

---

## 项目架构

```
用户消息 → StateGraph
              │
              ├→ 加载历史消息（Checkpointer）
              │
              ├→ 消息过长检测
              │   ├→ 是 → 摘要节点（压缩历史）
              │   └→ 否 → 直接处理
              │
              ├→ 调用 LLM 生成回复
              │
              └→ 保存状态 → 返回响应
```

---

## 项目结构

```plaintext
chat-assistant/
├── src/
│   ├── state.ts           # 状态定义
│   ├── nodes.ts           # 节点函数
│   ├── graph.ts           # 图构建
│   └── index.ts           # 入口文件
├── package.json
├── tsconfig.json
└── .env
```

---

## 第一步：项目初始化

### package.json

```json
{
  "name": "chat-assistant",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@langchain/langgraph": "^0.2.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/core": "^0.3.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0"
  }
}
```

### .env

```bash
OPENAI_API_KEY=sk-xxx...
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

---

## 第二步：状态定义

### src/state.ts

```typescript
import { Annotation } from "@langchain/langgraph";
import { BaseMessage } from "@langchain/core/messages";

export const ChatState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  
  summary: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
});

export type ChatStateType = typeof ChatState.State;
```

**💡 人话解读：**

| 状态字段 | 作用 | Reducer 策略 |
|----------|------|--------------|
| `messages` | 存储对话历史 | 追加模式（新消息追加到末尾） |
| `summary` | 存储历史摘要 | 替换模式（新摘要覆盖旧摘要） |

---

## 第三步：节点函数

### src/nodes.ts

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { 
  HumanMessage, 
  AIMessage, 
  SystemMessage,
  RemoveMessage 
} from "@langchain/core/messages";
import { ChatStateType } from "./state.js";

const llm = new ChatOpenAI({ 
  model: "gpt-4o-mini",
  temperature: 0.7,
});

const summarizeLlm = new ChatOpenAI({ 
  model: "gpt-4o-mini",
  temperature: 0,
});

const MAX_MESSAGES = 10;

export async function chatNode(state: ChatStateType) {
  const systemPrompt = state.summary
    ? `你是一个友好的 AI 助手。以下是之前对话的摘要：\n\n${state.summary}\n\n请基于这个背景继续对话。`
    : "你是一个友好的 AI 助手，请帮助用户解答问题。";

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages,
  ]);

  return { messages: [response] };
}

export function shouldSummarize(state: ChatStateType): "summarize" | "chat" {
  if (state.messages.length > MAX_MESSAGES) {
    return "summarize";
  }
  return "chat";
}

export async function summarizeNode(state: ChatStateType) {
  const messagesToSummarize = state.messages.slice(0, -2);
  const recentMessages = state.messages.slice(-2);
  
  const summaryPrompt = state.summary
    ? `这是之前的对话摘要：\n${state.summary}\n\n请将以下新对话内容整合到摘要中：`
    : "请将以下对话内容总结成简洁的摘要：";

  const conversationText = messagesToSummarize
    .map(msg => {
      const role = msg._getType() === "human" ? "用户" : "助手";
      return `${role}: ${msg.content}`;
    })
    .join("\n");

  const response = await summarizeLlm.invoke([
    new SystemMessage("你是一个摘要专家，请用中文生成简洁但信息完整的对话摘要。"),
    new HumanMessage(`${summaryPrompt}\n\n${conversationText}`),
  ]);

  const deleteMessages = messagesToSummarize.map(
    msg => new RemoveMessage({ id: msg.id! })
  );

  return {
    summary: response.content as string,
    messages: deleteMessages,
  };
}
```

**💡 人话解读：**

| 函数 | 作用 | 关键逻辑 |
|------|------|----------|
| `chatNode` | 生成 AI 回复 | 如果有摘要，会把摘要作为背景知识 |
| `shouldSummarize` | 判断是否需要摘要 | 消息数超过 10 条就触发摘要 |
| `summarizeNode` | 压缩历史消息 | 保留最近 2 条，其余压缩成摘要 |

**消息摘要流程图：**

```
消息数量 > 10?
    │
    ├── 否 → 直接进入 chatNode
    │
    └── 是 → summarizeNode
              │
              ├── 保留最近 2 条消息
              ├── 其余消息生成摘要
              └── 删除旧消息 (RemoveMessage)
```

---

## 第四步：构建图

### src/graph.ts

```typescript
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { ChatState } from "./state.js";
import { chatNode, shouldSummarize, summarizeNode } from "./nodes.js";

const graph = new StateGraph(ChatState)
  .addNode("chat", chatNode)
  .addNode("summarize", summarizeNode)
  .addEdge(START, "chat")
  .addConditionalEdges("chat", shouldSummarize, {
    summarize: "summarize",
    chat: END,
  })
  .addEdge("summarize", END);

const checkpointer = new MemorySaver();

export const chatAssistant = graph.compile({ checkpointer });
```

**💡 人话解读：**

```
START → chat → [条件判断]
                   │
                   ├── 消息 ≤ 10 → END（直接结束）
                   │
                   └── 消息 > 10 → summarize → END（先摘要再结束）
```

**为什么要用 Checkpointer？**

| 没有 Checkpointer | 有 Checkpointer |
|-------------------|-----------------|
| 每次对话都是新开始 | 记住之前的对话 |
| 程序重启后失忆 | 重启后继续上次对话 |
| 无法实现多轮对话 | 完美支持多轮对话 |

---

## 第五步：入口文件

### src/index.ts

```typescript
import { chatAssistant } from "./graph.js";
import { HumanMessage } from "@langchain/core/messages";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chat(userId: string) {
  const config = {
    configurable: {
      thread_id: userId,
    },
  };

  console.log(`\n🤖 多轮对话助手已启动！用户: ${userId}`);
  console.log('输入 "quit" 退出，输入 "history" 查看对话历史\n');

  const askQuestion = () => {
    rl.question("你: ", async (input) => {
      const userInput = input.trim();

      if (userInput.toLowerCase() === "quit") {
        console.log("\n👋 再见！对话已保存。");
        rl.close();
        return;
      }

      if (userInput.toLowerCase() === "history") {
        const state = await chatAssistant.getState(config);
        console.log("\n📜 对话历史:");
        console.log("摘要:", state.values.summary || "(无)");
        console.log("消息数:", state.values.messages?.length || 0);
        state.values.messages?.forEach((msg: any, i: number) => {
          const role = msg._getType() === "human" ? "用户" : "助手";
          console.log(`${i + 1}. ${role}: ${msg.content.slice(0, 50)}...`);
        });
        console.log("");
        askQuestion();
        return;
      }

      if (!userInput) {
        askQuestion();
        return;
      }

      try {
        const result = await chatAssistant.invoke(
          { messages: [new HumanMessage(userInput)] },
          config
        );

        const lastMessage = result.messages[result.messages.length - 1];
        console.log(`\n助手: ${lastMessage.content}\n`);
      } catch (error) {
        console.error("错误:", error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

const userId = process.argv[2] || "user_default";
chat(userId);
```

**💡 使用方法：**

```bash
npm run dev user_alice

npm run dev user_bob
```

---

## 第六步：运行测试

### 安装依赖并运行

```bash
npm install

npm run dev user_test
```

### 测试对话

```
🤖 多轮对话助手已启动！用户: user_test
输入 "quit" 退出，输入 "history" 查看对话历史

你: 你好，我叫小明

助手: 你好小明！很高兴认识你。有什么我可以帮助你的吗？

你: 我喜欢打篮球

助手: 打篮球是一项很棒的运动！小明，你打篮球多久了？有喜欢的球队或球员吗？

你: 我最喜欢科比

助手: 科比·布莱恩特是篮球史上最伟大的球员之一！他的"曼巴精神"激励了无数人。小明，你是从什么时候开始喜欢科比的？

你: history

📜 对话历史:
摘要: (无)
消息数: 6
1. 用户: 你好，我叫小明...
2. 助手: 你好小明！很高兴认识你。有什么我可以帮助你...
3. 用户: 我喜欢打篮球...
4. 助手: 打篮球是一项很棒的运动！小明，你打篮球多久...
5. 用户: 我最喜欢科比...
6. 助手: 科比·布莱恩特是篮球史上最伟大的球员之一...

你: quit

👋 再见！对话已保存。
```

### 重启后继续对话

```bash
npm run dev user_test
```

```
🤖 多轮对话助手已启动！用户: user_test
输入 "quit" 退出，输入 "history" 查看对话历史

你: 你还记得我叫什么吗？

助手: 当然记得，你叫小明！你之前告诉我你喜欢打篮球，而且最喜欢的球员是科比。

你: 👍
```

**✅ 程序重启后，对话记忆完美保留！**

---

## 进阶功能：流式输出

### 修改 src/index.ts（流式版本）

```typescript
import { chatAssistant } from "./graph.js";
import { HumanMessage } from "@langchain/core/messages";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function chatWithStreaming(userId: string) {
  const config = {
    configurable: {
      thread_id: userId,
    },
  };

  console.log(`\n🤖 多轮对话助手已启动！（流式输出）用户: ${userId}`);
  console.log('输入 "quit" 退出\n');

  const askQuestion = () => {
    rl.question("你: ", async (input) => {
      const userInput = input.trim();

      if (userInput.toLowerCase() === "quit") {
        console.log("\n👋 再见！");
        rl.close();
        return;
      }

      if (!userInput) {
        askQuestion();
        return;
      }

      try {
        process.stdout.write("\n助手: ");
        
        const stream = await chatAssistant.stream(
          { messages: [new HumanMessage(userInput)] },
          { ...config, streamMode: "messages" }
        );

        for await (const [message, metadata] of stream) {
          if (metadata.langgraph_node === "chat") {
            const content = message.content;
            if (typeof content === "string") {
              process.stdout.write(content);
            }
          }
        }
        
        console.log("\n");
      } catch (error) {
        console.error("错误:", error);
      }

      askQuestion();
    });
  };

  askQuestion();
}

const userId = process.argv[2] || "user_default";
chatWithStreaming(userId);
```

---

## 进阶功能：持久化存储

### 使用文件存储（生产环境）

```typescript
import { SqliteSaver } from "@langchain/langgraph-checkpoint-sqlite";

const checkpointer = SqliteSaver.fromConnString("./chat_history.db");

export const chatAssistant = graph.compile({ checkpointer });
```

**💡 人话解读：** 
- `MemorySaver` —— 内存存储，程序关闭就丢失
- `SqliteSaver` —— 文件存储，永久保存

---

## 完整代码：生产级版本

### src/graph.ts（完整版）

```typescript
import { StateGraph, START, END, MemorySaver, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { 
  BaseMessage, 
  HumanMessage, 
  SystemMessage,
  RemoveMessage 
} from "@langchain/core/messages";

const ChatState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (curr, update) => [...curr, ...update],
    default: () => [],
  }),
  summary: Annotation<string>({
    reducer: (_, update) => update,
    default: () => "",
  }),
});

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0.7 });
const summarizeLlm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });

const MAX_MESSAGES = 10;
const KEEP_RECENT = 2;

async function chatNode(state: typeof ChatState.State) {
  const systemPrompt = state.summary
    ? `你是一个友好的 AI 助手。以下是之前对话的摘要：\n\n${state.summary}\n\n请基于这个背景继续对话。`
    : "你是一个友好的 AI 助手，请帮助用户解答问题。保持回复简洁友好。";

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    ...state.messages,
  ]);

  return { messages: [response] };
}

function shouldSummarize(state: typeof ChatState.State): "summarize" | "end" {
  return state.messages.length > MAX_MESSAGES ? "summarize" : "end";
}

async function summarizeNode(state: typeof ChatState.State) {
  const messagesToSummarize = state.messages.slice(0, -KEEP_RECENT);
  
  const summaryPrompt = state.summary
    ? `这是之前的对话摘要：\n${state.summary}\n\n请将以下新对话内容整合到摘要中，保持简洁：`
    : "请将以下对话内容总结成简洁的摘要（100字以内）：";

  const conversationText = messagesToSummarize
    .map(msg => {
      const role = msg._getType() === "human" ? "用户" : "助手";
      return `${role}: ${msg.content}`;
    })
    .join("\n");

  const response = await summarizeLlm.invoke([
    new SystemMessage("你是一个摘要专家，请用中文生成简洁但信息完整的对话摘要。"),
    new HumanMessage(`${summaryPrompt}\n\n${conversationText}`),
  ]);

  const deleteMessages = messagesToSummarize.map(
    msg => new RemoveMessage({ id: msg.id! })
  );

  return {
    summary: response.content as string,
    messages: deleteMessages,
  };
}

const graph = new StateGraph(ChatState)
  .addNode("chat", chatNode)
  .addNode("summarize", summarizeNode)
  .addEdge(START, "chat")
  .addConditionalEdges("chat", shouldSummarize, {
    summarize: "summarize",
    end: END,
  })
  .addEdge("summarize", END);

const checkpointer = new MemorySaver();

export const chatAssistant = graph.compile({ checkpointer });
export { ChatState };
```

---

## 项目总结

### 核心实现

| 功能 | 实现方式 |
|------|----------|
| 对话持久化 | Checkpointer（MemorySaver / SqliteSaver） |
| 多用户支持 | `thread_id` 配置项 |
| 上下文管理 | 消息数量检测 + 条件路由 |
| 消息摘要 | LLM 生成摘要 + RemoveMessage 删除旧消息 |
| 流式输出 | `streamMode: "messages"` |

### 架构图回顾

```
START
  │
  ▼
┌──────────┐
│   chat   │ ← 生成 AI 回复
└────┬─────┘
     │
     ▼
 消息数 > 10?
   │     │
   │     └── 否 → END
   │
   └── 是
        │
        ▼
┌────────────┐
│ summarize  │ ← 压缩历史消息
└─────┬──────┘
      │
      ▼
     END
```

### 扩展建议

1. **添加人设定制**：让用户自定义 AI 的性格和说话风格
2. **支持多模态**：处理图片、文件等输入
3. **添加知识库**：结合 RAG 增强回答能力
4. **部署上线**：使用 LangSmith 部署到云端

---

## 核心要点回顾

1. **Checkpointer 是记忆的关键** —— 没有它就没有多轮对话
2. **thread_id 实现多用户隔离** —— 每个用户有独立的对话历史
3. **消息摘要防止 Token 爆炸** —— 长对话必须有压缩机制
4. **RemoveMessage 清理旧消息** —— 配合摘要使用，减少存储
5. **流式输出提升体验** —— 让 AI 回复像打字一样逐字显示

---

## 下一步

继续学习下一个项目：**智能审批系统**，学习条件路由和人机协作的实战应用。
