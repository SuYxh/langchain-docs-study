> ## 文档索引
> 获取完整的文档索引请访问：https://docs.langchain.com/llms.txt
> 使用此文件可发现所有可用页面，以便进一步探索。

# Model Context Protocol (MCP)

[Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) 是一个开放协议，用于标准化应用程序向大语言模型（LLM）提供工具和上下文的方式。LangChain 智能体可以通过 [`@langchain/mcp-adapters`](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-mcp-adapters) 库使用在 MCP 服务器上定义的工具。

## 快速入门

安装 `@langchain/mcp-adapters` 库：

<CodeGroup>
  ```bash npm theme={null}
  npm install @langchain/mcp-adapters
  ```

  ```bash pnpm theme={null}
  pnpm add @langchain/mcp-adapters
  ```

  ```bash yarn theme={null}
  yarn add @langchain/mcp-adapters
  ```

  ```bash bun theme={null}
  bun add @langchain/mcp-adapters
  ```
</CodeGroup>

`@langchain/mcp-adapters` 允许智能体使用在一个或多个 MCP 服务器上定义的工具。

<Note>
  `MultiServerMCPClient` **默认是无状态的**。每次工具调用都会创建一个新的 MCP `ClientSession`，执行工具后进行清理。更多详情请参阅[有状态会话](#stateful-sessions)章节。
</Note>

```ts Accessing multiple MCP servers icon="server" theme={null}
import { MultiServerMCPClient } from "@langchain/mcp-adapters";  // [!code highlight]
import { ChatAnthropic } from "@langchain/anthropic";
import { createAgent } from "langchain";

const client = new MultiServerMCPClient({  // [!code highlight]
    math: {
        transport: "stdio",  // Local subprocess communication
        command: "node",
        // Replace with absolute path to your math_server.js file
        args: ["/path/to/math_server.js"],
    },
    weather: {
        transport: "http",  // HTTP-based remote server
        // Ensure you start your weather server on port 8000
        url: "http://localhost:8000/mcp",
    },
});

const tools = await client.getTools();  // [!code highlight]
const agent = createAgent({
    model: "claude-sonnet-4-5-20250929",
    tools,  // [!code highlight]
});

const mathResponse = await agent.invoke({
    messages: [{ role: "user", content: "what's (3 + 5) x 12?" }],
});

const weatherResponse = await agent.invoke({
    messages: [{ role: "user", content: "what is the weather in nyc?" }],
});
```

## 自定义服务器

要创建你自己的 MCP 服务器，可以使用 `@modelcontextprotocol/sdk` 库。该库提供了一种简单的方式来定义[工具](https://modelcontextprotocol.io/docs/learn/server-concepts#tools-ai-actions)并将其作为服务器运行。

<CodeGroup>
  ```bash npm theme={null}
  npm install @modelcontextprotocol/sdk
  ```

  ```bash pnpm theme={null}
  pnpm add @modelcontextprotocol/sdk
  ```

  ```bash yarn theme={null}
  yarn add @modelcontextprotocol/sdk
  ```

  ```bash bun theme={null}
  bun add @modelcontextprotocol/sdk
  ```
</CodeGroup>

要使用 MCP 工具服务器测试你的智能体，请参考以下示例：

```typescript title="Math server (stdio transport)" icon="floppy-disk" theme={null}
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
    {
        name: "math-server",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
        {
            name: "add",
            description: "Add two numbers",
            inputSchema: {
                type: "object",
                properties: {
                    a: {
                        type: "number",
                        description: "First number",
                    },
                    b: {
                        type: "number",
                        description: "Second number",
                    },
                },
                required: ["a", "b"],
            },
        },
        {
            name: "multiply",
            description: "Multiply two numbers",
            inputSchema: {
                type: "object",
                properties: {
                    a: {
                        type: "number",
                        description: "First number",
                    },
                    b: {
                        type: "number",
                        description: "Second number",
                    },
                },
                required: ["a", "b"],
            },
        },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "add": {
            const { a, b } = request.params.arguments as { a: number; b: number };
            return {
                content: [
                {
                    type: "text",
                    text: String(a + b),
                },
                ],
            };
        }
        case "multiply": {
            const { a, b } = request.params.arguments as { a: number; b: number };
            return {
                content: [
                {
                    type: "text",
                    text: String(a * b),
                },
                ],
            };
        }
        default:
            throw new Error(`Unknown tool: ${request.params.name}`);
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Math MCP server running on stdio");
}

main();
```

```typescript title="Weather server (SSE transport)" icon="wifi" theme={null}
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";

const app = express();
app.use(express.json());

const server = new Server(
    {
        name: "weather-server",
        version: "0.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
        {
            name: "get_weather",
            description: "Get weather for location",
            inputSchema: {
            type: "object",
            properties: {
                location: {
                type: "string",
                description: "Location to get weather for",
                },
            },
            required: ["location"],
            },
        },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "get_weather": {
            const { location } = request.params.arguments as { location: string };
            return {
                content: [
                    {
                        type: "text",
                        text: `It's always sunny in ${location}`,
                    },
                ],
            };
        }
        default:
            throw new Error(`Unknown tool: ${request.params.name}`);
    }
});

app.post("/mcp", async (req, res) => {
    const transport = new SSEServerTransport("/mcp", res);
    await server.connect(transport);
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Weather MCP server running on port ${PORT}`);
});
```

## Transports

MCP 支持不同的 Transport 机制用于客户端与服务器之间的通信。

### HTTP

`http` transport（也称为 `streamable-http`）使用 HTTP 请求进行客户端-服务器通信。更多详情请参阅 [MCP HTTP transport 规范](https://modelcontextprotocol.io/specification/2025-03-26/basic/transports#streamable-http)。

```typescript  theme={null}
const client = new MultiServerMCPClient({
    weather: {
        transport: "sse",
        url: "http://localhost:8000/mcp",
    },
});
```

#### 传递 Headers

#### 认证

### stdio

客户端将服务器作为子进程启动，并通过标准输入/输出进行通信。最适合本地工具和简单的配置场景。

<Note>
  与 HTTP transports 不同，`stdio` 连接本质上是**有状态的**——子进程在客户端连接的整个生命周期内持续存在。然而，当使用 `MultiServerMCPClient` 而不进行显式会话管理时，每次工具调用仍会创建一个新的会话。有关管理持久连接的详情，请参阅[有状态会话](#stateful-sessions)。
</Note>

```typescript  theme={null}
const client = new MultiServerMCPClient({
    math: {
        transport: "stdio",
        command: "node",
        args: ["/path/to/math_server.js"],
    },
});
```

## 核心特性

### Tools

[Tools](https://modelcontextprotocol.io/docs/concepts/tools) 允许 MCP 服务器暴露可执行函数，供大语言模型（LLM）调用以执行操作——例如查询数据库、调用 API 或与外部系统交互。LangChain 将 MCP Tools 转换为 LangChain [工具](/oss/javascript/langchain/tools)，使其可以直接在任何 LangChain 智能体或工作流中使用。

#### 加载 Tools

使用 `client.get_tools()` 从 MCP 服务器获取工具并传递给你的智能体：

```typescript  theme={null}
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent } from "langchain";

const client = new MultiServerMCPClient({...});
const tools = await client.getTools();  // [!code highlight]
const agent = createAgent({ model: "claude-sonnet-4-5-20250929", tools });
```

## 其他资源

* [MCP 文档](https://modelcontextprotocol.io/introduction)

* [MCP Transport 文档](https://modelcontextprotocol.io/docs/concepts/transports)

* [`@langchain/mcp-adapters`](https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-mcp-adapters/)

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/mcp.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Tip icon="terminal" iconType="regular">
  通过 MCP [连接这些文档](/use-these-docs)到 Claude、VSCode 等工具，以获取实时答案。
</Tip>
