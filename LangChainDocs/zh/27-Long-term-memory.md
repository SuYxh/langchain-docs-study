# 长期记忆 (Long-term memory)

## 概览

LangChain 智能体使用 [LangGraph 持久化](/oss/javascript/langgraph/persistence#memory-store) 来启用长期记忆。这是一个更高级的主题，需要 LangGraph 的知识才能使用。

## 记忆存储

LangGraph 将长期记忆作为 JSON 文档存储在 [store](/oss/javascript/langgraph/persistence#memory-store) 中。

每个记忆都在自定义 `namespace`（类似于文件夹）和不同的 `key`（类似于文件名）下组织。命名空间通常包含用户或组织 ID 或其他标签，以便更容易组织信息。

这种结构支持记忆的分层组织。然后通过内容过滤器支持跨命名空间搜索。

```typescript
import { InMemoryStore } from "@langchain/langgraph";

const embed = (texts: string[]): number[][] => {
    // 替换为实际的嵌入函数或 LangChain 嵌入对象
    return texts.map(() => [1.0, 2.0]);
};

// InMemoryStore 将数据保存到内存字典中。在生产环境中使用支持 DB 的存储。
const store = new InMemoryStore({ index: { embed, dims: 2 } });
const userId = "my-user";
const applicationContext = "chitchat";
const namespace = [userId, applicationContext];

await store.put(
    namespace,
    "a-memory",
    {
        rules: [
            "User likes short, direct language",
            "User only speaks English & TypeScript",
        ],
        "my-key": "my-value",
    }
);

// 通过 ID 获取 "memory"
const item = await store.get(namespace, "a-memory");

// 在此命名空间内搜索 "memories"，过滤内容等价性，按向量相似度排序
const items = await store.search(
    namespace,
    {
        filter: { "my-key": "my-value" },
        query: "language preferences"
    }
);
```

有关记忆存储的更多信息，请参阅 [持久化](/oss/javascript/langgraph/persistence#memory-store) 指南。

## 在工具中读取长期记忆

```typescript 智能体可以用来查找用户信息的工具
import * as z from "zod";
import { createAgent, tool, type ToolRuntime } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";

// InMemoryStore 将数据保存到内存字典中。在生产环境中使用支持 DB 的存储。
const store = new InMemoryStore();
const contextSchema = z.object({
  userId: z.string(),
});

// 使用 put 方法将示例数据写入存储
await store.put(
  ["users"], // 将相关数据分组在一起的命名空间（用于用户数据的 users 命名空间）
  "user_123", // 命名空间内的键（用户 ID 作为键）
  {
    name: "John Smith",
    language: "English",
  } // 为给定用户存储的数据
);

const getUserInfo = tool(
  // 查找用户信息。
  async (_, runtime: ToolRuntime<unknown, z.infer<typeof contextSchema>>) => {
    // 访问存储 - 与提供给 `createAgent` 的相同
    const userId = runtime.context.userId;
    if (!userId) {
      throw new Error("userId is required");
    }
    // 从存储中检索数据 - 返回带有值和元数据的 StoreValue 对象
    const userInfo = await runtime.store.get(["users"], userId);
    return userInfo?.value ? JSON.stringify(userInfo.value) : "Unknown user";
  },
  {
    name: "getUserInfo",
    description: "通过 userId 从存储中查找用户信息。",
    schema: z.object({}),
  }
);

const agent = createAgent({
  model: "gpt-4.1-mini",
  tools: [getUserInfo],
  contextSchema,
  // 将存储传递给智能体 - 启用智能体在运行工具时访问存储
  store,
});

// 运行智能体
const result = await agent.invoke(
  { messages: [{ role: "user", content: "look up user information" }] },
  { context: { userId: "user_123" } }
);

console.log(result.messages.at(-1)?.content);

/**
 * 输出:
 * User Information:
 * - Name: John Smith
 * - Language: English
 */
```

<a id="write-long-term" />

## 从工具写入长期记忆

```typescript 更新用户信息的工具示例
import * as z from "zod";
import { tool, createAgent, type ToolRuntime } from "langchain";
import { InMemoryStore } from "@langchain/langgraph";

// InMemoryStore 将数据保存到内存字典中。在生产环境中使用支持 DB 的存储。
const store = new InMemoryStore();

const contextSchema = z.object({
  userId: z.string(),
});

// 模式定义了 LLM 的用户信息结构
const UserInfo = z.object({
  name: z.string(),
});

// 允许智能体更新用户信息的工具（对于聊天应用程序很有用）
const saveUserInfo = tool(
  async (
    userInfo: z.infer<typeof UserInfo>,
    runtime: ToolRuntime<unknown, z.infer<typeof contextSchema>>
  ) => {
    const userId = runtime.context.userId;
    if (!userId) {
      throw new Error("userId is required");
    }
    // 将数据存储在存储中（命名空间，键，数据）
    await runtime.store.put(["users"], userId, userInfo);
    return "Successfully saved user info.";
  },
  {
    name: "save_user_info",
    description: "Save user info",
    schema: UserInfo,
  }
);

const agent = createAgent({
  model: "gpt-4.1-mini",
  tools: [saveUserInfo],
  contextSchema,
  store,
});

// 运行智能体
await agent.invoke(
  { messages: [{ role: "user", content: "My name is John Smith" }] },
  // userId 在上下文中传递，以识别正在更新其信息的人
  { context: { userId: "user_123" } }
);

// 您可以直接访问存储以获取值
const result = await store.get(["users"], "user_123");
console.log(result?.value); // Output: { name: "John Smith" }

```
