# 模型上下文协议 (MCP)

Model Context Protocol (MCP) 是一个开放标准，用于将 AI 模型连接到外部数据和工具。LangGraph 支持集成 MCP 服务器，使您的 Agent 能够轻松访问各种资源。

## 什么是 MCP？

MCP 提供了一种标准化的方式来公开：
- **资源 (Resources)**：类似于文件的数据，可以被读取。
- **提示词 (Prompts)**：预定义的模板，用于与模型交互。
- **工具 (Tools)**：模型可以调用的可执行函数。

通过使用 MCP，您不需要为每个新工具或数据源编写自定义集成代码。只要它是 MCP 兼容的，就可以直接插入。

## 在 LangGraph 中使用 MCP

要使用 MCP 服务器，您通常需要一个客户端来连接它并将公开的功能转换为 LangGraph/LangChain 可用的格式。

*(注：具体的 MCP 集成细节可能会随着标准的发展而更新。请查阅最新的官方文档以获取详细的 API 用法。)*

### 概念示例

假设您有一个连接到本地文件系统的 MCP 服务器。

```typescript
// 这是一个概念性的伪代码示例
import { MCPClient } from "some-mcp-library";
import { ToolNode } from "@langchain/langgraph/prebuilt";

// 连接到 MCP 服务器
const client = new MCPClient({ url: "ws://localhost:3000" });
await client.connect();

// 获取可用工具
const mcpTools = await client.listTools();

// 将 MCP 工具转换为 LangChain 工具
const tools = mcpTools.map(convertMCPToolToLangChain);

// 在 LangGraph 中使用这些工具
const toolNode = new ToolNode(tools);

// ... 定义图的其余部分 ...
```

通过这种方式，您的 LangGraph Agent 可以利用生态系统中不断增长的 MCP 服务器库。
