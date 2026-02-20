> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用此文件来发现所有可用页面。

# 自定义 Deep Agents

> 学习如何通过系统提示词、工具、子智能体等来自定义 deep agents

`createDeepAgent` 提供以下配置选项：

* [模型](#model)
* [工具](#tools)
* [系统提示词](#system-prompt)
* [中间件](#middleware)
* [子智能体](#subagents)
* [后端（虚拟文件系统）](#backends)
* [人类介入](#human-in-the-loop)
* [技能](#skills)
* [记忆](#memory)

```typescript  theme={null}
const agent = createDeepAgent({
  name?: string,
  model?: BaseLanguageModel | string,
  tools?: TTools | StructuredTool[],
  systemPrompt?: string | SystemMessage,
});
```

更多信息请参阅 [Customizing Deep Agents](https://reference.langchain.com/javascript/modules/deepagents.html#customizing-deep-agents)。

## <a id="model"></a> 模型

默认情况下，`deepagents` 使用 [`claude-sonnet-4-5-20250929`](https://platform.claude.com/docs/en/about-claude/models/overview)。你可以通过传入任意受支持的 <Tooltip tip="遵循格式 `provider:model` 的字符串（例如 openai:gpt-5）" cta="查看映射" href="https://reference.langchain.com/python/langchain/models/#langchain.chat_models.init_chat_model(model)">模型标识符字符串</Tooltip> 或 [LangChain 模型对象](/oss/javascript/integrations/chat) 来自定义模型。

<Tip>
  使用 `provider:model` 格式（例如 `openai:gpt-5`）可以快速在不同模型之间切换。
</Tip>

<Tabs>
  <Tab title="OpenAI">
    👉 阅读 [OpenAI 聊天模型集成文档](/oss/javascript/integrations/chat/openai/)

    <CodeGroup>
      ```bash npm theme={null}
      npm install @langchain/openai deepagents
      ```
    
      ```bash pnpm theme={null}
      pnpm install @langchain/openai deepagents
      ```
    
      ```bash yarn theme={null}
      yarn add @langchain/openai deepagents
      ```
    
      ```bash bun theme={null}
      bun add @langchain/openai deepagents
      ```
    </CodeGroup>
    
    <CodeGroup>
      ```typescript default parameters theme={null}
      import { createDeepAgent } from "deepagents";
    
      process.env.OPENAI_API_KEY = "your-api-key";
    
      const agent = createDeepAgent({ model: "gpt-4.1" });
      // 这会使用默认参数为指定模型调用 initChatModel
      // 若要使用特定模型参数，请直接使用 initChatModel
      ```
    
      ```typescript initChatModel theme={null}
      import { initChatModel } from "langchain";
      import { createDeepAgent } from "deepagents";
    
      process.env.OPENAI_API_KEY = "your-api-key";
    
      const model = await initChatModel("gpt-4.1");
      const agent = createDeepAgent({
        model,
        temperature: 0,
      });
      ```
    
      ```typescript Model Class theme={null}
      import { ChatOpenAI } from "@langchain/openai";
      import { createDeepAgent } from "deepagents";
    
      const agent = createDeepAgent({
        model: new ChatOpenAI({
          model: "gpt-4.1",
          apiKey: "your-api-key",
          temperature: 0,
        }),
      });
      ```
    </CodeGroup>
  </Tab>

  <Tab title="Anthropic">
    👉 阅读 [Anthropic 聊天模型集成文档](/oss/javascript/integrations/chat/anthropic/)

    <CodeGroup>
      ```bash npm theme={null}
      npm install @langchain/anthropic deepagents
      ```
    
      ```bash pnpm theme={null}
      pnpm install @langchain/anthropic deepagents
      ```
    
      ```bash yarn theme={null}
      yarn add @langchain/anthropic deepagents
      ```
    
      ```bash bun theme={null}
      bun add @langchain/anthropic deepagents
      ```
    </CodeGroup>
    
    <CodeGroup>
      ```typescript default parameters theme={null}
      import { createDeepAgent } from "deepagents";
    
      process.env.ANTHROPIC_API_KEY = "your-api-key";
    
      const agent = createDeepAgent({ model: "claude-sonnet-4-5-20250929" });
      // 这会使用默认参数为指定模型调用 initChatModel
      // 若要使用特定模型参数，请直接使用 initChatModel
      ```
    
      ```typescript initChatModel theme={null}
      import { initChatModel } from "langchain";
      import { createDeepAgent } from "deepagents";
    
      process.env.ANTHROPIC_API_KEY = "your-api-key";
    
      const model = await initChatModel("claude-sonnet-4-5-20250929");
      const agent = createDeepAgent({
        model,
        temperature: 0,
      });
      ```
    
      ```typescript Model Class theme={null}
      import { ChatAnthropic } from "@langchain/anthropic";
      import { createDeepAgent } from "deepagents";
    
      const agent = createDeepAgent({
        model: new ChatAnthropic({
          model: "claude-sonnet-4-5-20250929",
          apiKey: "your-api-key",
          temperature: 0,
        }),
      });
      ```
    </CodeGroup>
  </Tab>

  <Tab title="Azure">
    👉 阅读 [Azure 聊天模型集成文档](/oss/javascript/integrations/chat/azure/)

    <CodeGroup>
      ```bash npm theme={null}
      npm install @langchain/azure deepagents
      ```
    
      ```bash pnpm theme={null}
      pnpm install @langchain/azure deepagents
      ```
    
      ```bash yarn theme={null}
      yarn add @langchain/azure deepagents
      ```
    
      ```bash bun theme={null}
      bun add @langchain/azure deepagents
      ```
    </CodeGroup>
    
    <CodeGroup>
      ```typescript default parameters theme={null}
      import { createDeepAgent } from "deepagents";
    
      process.env.AZURE_OPENAI_API_KEY = "your-api-key";
      process.env.AZURE_OPENAI_ENDPOINT = "your-endpoint";
      process.env.OPENAI_API_VERSION = "your-api-version";
    
      const agent = createDeepAgent({ model: "azure_openai:gpt-4.1" });
      // 这会使用默认参数为指定模型调用 initChatModel
      // 若要使用特定模型参数，请直接使用 initChatModel
      ```
    
      ```typescript initChatModel theme={null}
      import { initChatModel } from "langchain";
      import { createDeepAgent } from "deepagents";
    
      process.env.AZURE_OPENAI_API_KEY = "your-api-key";
      process.env.AZURE_OPENAI_ENDPOINT = "your-endpoint";
      process.env.OPENAI_API_VERSION = "your-api-version";
    
      const model = await initChatModel("azure_openai:gpt-4.1");
      const agent = createDeepAgent({
        model,
        temperature: 0,
      });
      ```
    
      ```typescript Model Class theme={null}
      import { AzureChatOpenAI } from "@langchain/openai";
      import { createDeepAgent } from "deepagents";
    
      const agent = createDeepAgent({
        model: new AzureChatOpenAI({
          model: "gpt-4.1",
          azureOpenAIApiKey: "your-api-key",
          azureOpenAIApiEndpoint: "your-endpoint",
          azureOpenAIApiVersion: "your-api-version",
          temperature: 0,
        }),
      });
      ```
    </CodeGroup>
  </Tab>

  <Tab title="Google Gemini">
    👉 阅读 [Google GenAI 聊天模型集成文档](/oss/javascript/integrations/chat/google_generative_ai/)

    <CodeGroup>
      ```bash npm theme={null}
      npm install @langchain/google-genai deepagents
      ```
    
      ```bash pnpm theme={null}
      pnpm install @langchain/google-genai deepagents
      ```
    
      ```bash yarn theme={null}
      yarn add @langchain/google-genai deepagents
      ```
    
      ```bash bun theme={null}
      bun add @langchain/google-genai deepagents
      ```
    </CodeGroup>
    
    <CodeGroup>
      ```typescript default parameters theme={null}
      import { createDeepAgent } from "deepagents";
    
      process.env.GOOGLE_API_KEY = "your-api-key";
    
      const agent = createDeepAgent({ model: "google-genai:gemini-2.5-flash-lite" });
      // 这会使用默认参数为指定模型调用 initChatModel
      // 若要使用特定模型参数，请直接使用 initChatModel
      ```
    
      ```typescript initChatModel theme={null}
      import { initChatModel } from "langchain";
      import { createDeepAgent } from "deepagents";
    
      process.env.GOOGLE_API_KEY = "your-api-key";
    
      const model = await initChatModel("google-genai:gemini-2.5-flash-lite");
      const agent = createDeepAgent({
        model,
        temperature: 0,
      });
      ```
    
      ```typescript Model Class theme={null}
      import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
      import { createDeepAgent } from "deepagents";
    
      const agent = createDeepAgent({
        model: new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash-lite",
          apiKey: "your-api-key",
          temperature: 0,
        }),
      });
      ```
    </CodeGroup>
  </Tab>

  <Tab title="Bedrock Converse">
    👉 阅读 [AWS Bedrock 聊天模型集成文档](/oss/javascript/integrations/chat/bedrock_converse/)

    <CodeGroup>
      ```bash npm theme={null}
      npm install @langchain/aws deepagents
      ```
    
      ```bash pnpm theme={null}
      pnpm install @langchain/aws deepagents
      ```
    
      ```bash yarn theme={null}
      yarn add @langchain/aws deepagents
      ```
    
      ```bash bun theme={null}
      bun add @langchain/aws deepagents
      ```
    </CodeGroup>
    
    <CodeGroup>
      ```typescript default parameters theme={null}
      import { createDeepAgent } from "deepagents";
    
      // 按照以下步骤配置你的凭据：
      // https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html
    
      const agent = createDeepAgent({ model: "bedrock:gpt-4.1" });
      // 这会使用默认参数为指定模型调用 initChatModel
      // 若要使用特定模型参数，请直接使用 initChatModel
      ```
    
      ```typescript initChatModel theme={null}
      import { initChatModel } from "langchain";
      import { createDeepAgent } from "deepagents";
    
      // 按照以下步骤配置你的凭据：
      // https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html
    
      const model = await initChatModel("bedrock:gpt-4.1");
      const agent = createDeepAgent({
        model,
        temperature: 0,
      });
      ```
    
      ```typescript Model Class theme={null}
      import { ChatBedrockConverse } from "@langchain/aws";
      import { createDeepAgent } from "deepagents";
    
      // 按照以下步骤配置你的凭据：
      // https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started.html
    
      const agent = createDeepAgent({
        model: new ChatBedrockConverse({
          model: "gpt-4.1",
          region: "us-east-2",
          temperature: 0,
        }),
      });
      ```
    </CodeGroup>
  </Tab>
</Tabs>

## <a id="tools"></a> 工具

除了用于规划、文件管理与子智能体生成的[内置工具](/oss/javascript/deepagents/overview#core-capabilities)之外，你还可以提供自定义工具：

```typescript  theme={null}
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
import { z } from "zod";

const internetSearch = tool(
  async ({
    query,
    maxResults = 5,
    topic = "general",
    includeRawContent = false,
  }: {
    query: string;
    maxResults?: number;
    topic?: "general" | "news" | "finance";
    includeRawContent?: boolean;
  }) => {
    const tavilySearch = new TavilySearch({
      maxResults,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      includeRawContent,
      topic,
    });
    return await tavilySearch._call({ query });
  },
  {
    name: "internet_search",
    description: "运行一次网页搜索",
    schema: z.object({
      query: z.string().describe("搜索查询词"),
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  },
);

const agent = createDeepAgent({
  tools: [internetSearch],
});
```

## <a id="system-prompt"></a> 系统提示词

Deep agents 自带一个内置系统提示词。默认系统提示词包含使用内置规划工具、文件系统工具与子智能体的详细指令。
当中间件添加特殊工具（例如文件系统工具）时，它会将这些工具追加到系统提示词中。

每个深度智能体也应包含一个与其具体用例相关的自定义系统提示词：

```typescript  theme={null}
import { createDeepAgent } from "deepagents";

const researchInstructions = `你是一名专业研究员。 ` +
  `你的工作是进行全面调研，然后 ` +
  `撰写一份打磨完善的报告。`;

const agent = createDeepAgent({
  systemPrompt: researchInstructions,
});
```

## <a id="middleware"></a> 中间件

默认情况下，deep agents 可以访问以下[中间件](/oss/javascript/langchain/middleware/overview)：

* `TodoListMiddleware`：跟踪并管理待办列表，用于组织智能体任务与工作
* `FilesystemMiddleware`：处理读取、写入与目录导航等文件系统操作
* `SubAgentMiddleware`：生成并协调子智能体，将任务委派给专门智能体
* `SummarizationMiddleware`：在对话增长变长时压缩消息历史，以保持在上下文限制内
* `AnthropicPromptCachingMiddleware`：在使用 Anthropic 模型时，自动减少冗余 Token 处理
* `PatchToolCallsMiddleware`：当工具调用在收到结果前被中断或取消时，自动修复消息历史

如果你使用了记忆、技能或人类介入，还会包含以下中间件：

* `MemoryMiddleware`：当提供 `memory` 参数时，在会话之间持久化与检索对话上下文
* `SkillsMiddleware`：当提供 `skills` 参数时启用自定义技能
* `HumanInTheLoopMiddleware`：当提供 `interrupt_on` 参数时，在指定点暂停以等待人类批准或输入

你可以提供额外的中间件来扩展功能、添加工具或实现自定义 hook：

```typescript  theme={null}
import { tool, createMiddleware } from "langchain";
import { createDeepAgent } from "deepagents";
import * as z from "zod";

const getWeather = tool(
  ({ city }: { city: string }) => {
    return `在 ${city} 是晴天。`;
  },
  {
    name: "get_weather",
    description: "获取某个城市的天气。",
    schema: z.object({
      city: z.string(),
    }),
  }
);

let callCount = 0;

const logToolCallsMiddleware = createMiddleware({
  name: "LogToolCallsMiddleware",
  wrapToolCall: async (request, handler) => {
    // 拦截并记录每一次工具调用——演示横切关注点
    callCount += 1;
    const toolName = request.toolCall.name;

    console.log(`[中间件] 工具调用 #${callCount}：${toolName}`);
    console.log(
      `[中间件] 参数：${JSON.stringify(request.toolCall.args)}`
    );

    // 执行工具调用
    const result = await handler(request);

    // 记录结果
    console.log(`[中间件] 工具调用 #${callCount} 已完成`);

    return result;
  },
});

const agent = await createDeepAgent({
  model: "claude-sonnet-4-20250514",
  tools: [getWeather] as any,
  middleware: [logToolCallsMiddleware] as any,
});
```

<Warning>
  **初始化后不要对属性做原地变更（mutation）**

  如果你需要跨 hook 调用跟踪值（例如计数器或累积数据），请使用图状态（graph state）。
  图状态按设计以线程为作用域，因此在并发场景下更新是安全的。

  **这样做：**

  ```python  theme={null}
  class CustomMiddleware(AgentMiddleware):
      def __init__(self):
          pass

      def before_agent(self, state, runtime):
          return {"x": state.get("x", 0) + 1}  # 改为更新图状态
  ```

  不要这样做：

  ```python  theme={null}
  class CustomMiddleware(AgentMiddleware):
      def __init__(self):
          self.x = 1

      def before_agent(self, state, runtime):
          self.x += 1  # 原地变更会导致竞态条件
  ```

  原地变更——例如在 `before_agent` 或其他 hook 中修改 `self.x`——可能导致微妙的 bug 与竞态条件，因为许多操作会并发运行（子智能体、并行工具，以及不同线程上的并行调用）。

  关于如何用自定义属性扩展状态的完整细节，请参阅[自定义中间件 - 自定义状态模式](/oss/javascript/langchain/middleware/custom#custom-state-schema)。
  如果你必须在自定义中间件中使用原地变更，请考虑当子智能体、并行工具或并发智能体调用同时运行时会发生什么。
</Warning>

## <a id="subagents"></a> 子智能体

为隔离细节工作并避免上下文膨胀（context bloat），请使用子智能体：

```python  theme={null}
import os
from typing import Literal
from tavily import TavilyClient
from deepagents import create_deep_agent

tavily_client = TavilyClient(api_key=os.environ["TAVILY_API_KEY"])

def internet_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
    include_raw_content: bool = False,
):
    """运行一次网页搜索"""
    return tavily_client.search(
        query,
        max_results=max_results,
        include_raw_content=include_raw_content,
        topic=topic,
    )

research_subagent = {
    "name": "research-agent",
    "description": "用于更深入地研究问题",
    "system_prompt": "你是一名出色的研究员",
    "tools": [internet_search],
    "model": "openai:gpt-4.1",  # 可选覆盖，默认使用主智能体模型
}
subagents = [research_subagent]

agent = create_deep_agent(
    model="claude-sonnet-4-5-20250929",
    subagents=subagents
)
```

更多信息请参阅[子智能体](/oss/javascript/deepagents/subagents)。

{/* ## Context - You can persist agent state between runs to store information like user IDs. */}

## <a id="backends"></a> 后端

深度智能体工具可以使用虚拟文件系统来存储、访问与编辑文件。默认情况下，deep agents 使用 `StateBackend`。

如果你使用了[技能](#skills)或[记忆](#memory)，则必须在创建智能体之前，将预期的技能或记忆文件添加到后端中。

<Tabs>
  <Tab title="StateBackend">
    存储在 `langgraph` 状态中的临时文件系统后端。

    该文件系统仅会在*单个线程*内持久化。
    
    ```python  theme={null}
    # 默认情况下，我们提供 StateBackend
    agent = create_deep_agent()
    
    # 在底层，它看起来像这样
    from deepagents.backends import StateBackend
    
    agent = create_deep_agent(
        backend=(lambda rt: StateBackend(rt))   # 注意：这些工具会通过 runtime.state 访问 State
    )
    ```
  </Tab>

  <Tab title="FilesystemBackend">
    本机的本地文件系统。

    <Warning>
      该后端会赋予智能体对文件系统的直接读写权限。
      请谨慎使用，并仅在合适的环境中启用。
      更多信息请参阅 [`FilesystemBackend`](/oss/javascript/deepagents/backends#filesystembackend-local-disk)。
    </Warning>
    
    ```python  theme={null}
    from deepagents.backends import FilesystemBackend
    
    agent = create_deep_agent(
        backend=FilesystemBackend(root_dir=".", virtual_mode=True)
    )
    ```
  </Tab>

  <Tab title="LocalShellBackend">
    在宿主机上直接执行 Shell 的文件系统。除文件系统工具外，还提供用于运行命令的 `execute` 工具。

    <Warning>
      该后端会赋予智能体对文件系统的直接读写权限，**并且**允许其在宿主机上不受限制地执行 Shell。
      请极其谨慎使用，并仅在合适的环境中启用。
      更多信息请参阅 [`LocalShellBackend`](/oss/javascript/deepagents/backends#localshellbackend-local-shell)。
    </Warning>
    
    ```python  theme={null}
    from deepagents.backends import LocalShellBackend
    
    agent = create_deep_agent(
        backend=LocalShellBackend(root_dir=".", env={"PATH": "/usr/bin:/bin"})
    )
    ```
  </Tab>

  <Tab title="StoreBackend">
    提供*跨线程持久化*的长期存储文件系统。

    ```python  theme={null}
    from langgraph.store.memory import InMemoryStore
    from deepagents.backends import StoreBackend
    
    agent = create_deep_agent(
        backend=(lambda rt: StoreBackend(rt)),
        store=InMemoryStore()  # 适用于本地开发；LangSmith Deployment 时省略
    )
    ```
    
    <Note>
      部署到 [LangSmith Deployment](/langsmith/deployments) 时，请省略 `store` 参数。平台会自动为你的智能体配置 store。
    </Note>
  </Tab>

  <Tab title="CompositeBackend">
    一种灵活的后端，你可以指定文件系统中的不同路由指向不同后端。

    ```python  theme={null}
    from deepagents import create_deep_agent
    from deepagents.backends import CompositeBackend, StateBackend, StoreBackend
    from langgraph.store.memory import InMemoryStore
    
    composite_backend = lambda rt: CompositeBackend(
        default=StateBackend(rt),
        routes={
            "/memories/": StoreBackend(rt),
        }
    )
    
    agent = create_deep_agent(
        backend=composite_backend,
        store=InMemoryStore()  # store 传给 create_deep_agent，而不是 backend
    )
    ```
  </Tab>
</Tabs>

更多信息请参阅[后端](/oss/javascript/deepagents/backends)。

### 沙盒

沙盒是专门的[后端](/oss/javascript/deepagents/backends)，会在隔离环境中运行智能体代码，拥有各自的文件系统，并提供用于 Shell 命令的 `execute` 工具。
当你希望深度智能体写入文件、安装依赖并运行命令，但不想对本地机器造成任何更改时，请使用沙盒后端。

你可以在创建深度智能体时，通过向 `backend` 传入沙盒后端来配置沙盒：

```typescript  theme={null}
import { createDeepAgent } from "deepagents";
import { ChatAnthropic } from "@langchain/anthropic";
import { DenoSandbox } from "@langchain/deno";

// 创建并初始化沙盒
const sandbox = await DenoSandbox.create({
  memoryMb: 1024,
  lifetime: "10m",
});

try {
  const agent = createDeepAgent({
    model: new ChatAnthropic({ model: "claude-opus-4-6" }),
    systemPrompt: "你是一个具备沙盒访问权限的 JavaScript 编码助手。",
    backend: sandbox,
  });

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "使用 Deno.serve 创建一个简单的 HTTP 服务器，并用 curl 测试它",
      },
    ],
  });
} finally {
  await sandbox.close();
}
```

更多信息请参阅[沙盒](/oss/javascript/deepagents/sandboxes)。

## <a id="human-in-the-loop"></a> 人类介入

某些工具操作可能较为敏感，需要在执行前获得人类批准。
你可以为每个工具配置批准策略：

```python  theme={null}
from langchain.tools import tool
from deepagents import create_deep_agent
from langgraph.checkpoint.memory import MemorySaver

@tool
def delete_file(path: str) -> str:
    """从文件系统中删除一个文件。"""
    return f"已删除 {path}"

@tool
def read_file(path: str) -> str:
    """从文件系统中读取一个文件。"""
    return f"{path} 的内容"

@tool
def send_email(to: str, subject: str, body: str) -> str:
    """发送一封邮件。"""
    return f"已向 {to} 发送邮件"

# 人类介入需要 Checkpointer
checkpointer = MemorySaver()

agent = create_deep_agent(
    model="claude-sonnet-4-5-20250929",
    tools=[delete_file, read_file, send_email],
    interrupt_on={
        "delete_file": True,  # 默认：approve、edit、reject
        "read_file": False,   # 无需中断
        "send_email": {"allowed_decisions": ["approve", "reject"]},  # 不允许编辑
    },
    checkpointer=checkpointer  # 必需！
)
```

你可以在工具调用处为智能体与子智能体配置中断，也可以在工具调用内部触发中断。
更多信息请参阅[人类介入](/oss/javascript/deepagents/human-in-the-loop)。

## <a id="skills"></a> 技能

你可以使用[技能](/oss/javascript/deepagents/overview)为深度智能体提供新的能力与专业知识。
相比之下，[工具](/oss/javascript/deepagents/customization#tools)往往覆盖较底层的功能，例如原生文件系统动作或规划；而技能可以包含完成任务的详细指令、参考信息与其他资产（例如模板）。
这些文件只会在智能体判断该技能对当前提示有用时才会被加载。
这种渐进式披露会减少智能体在启动时需要考虑的 Token 与上下文数量。

关于技能示例，请参阅 [Deep Agent example skills](https://github.com/langchain-ai/deepagentsjs/tree/main/examples/skills)。

要向深度智能体添加技能，请将其作为参数传给 `create_deep_agent`：

<Tabs>
  <Tab title="StateBackend">
    ```typescript  theme={null}
    import { createDeepAgent, type FileData } from "deepagents";
    import { MemorySaver } from "@langchain/langgraph";

    const checkpointer = new MemorySaver();
    
    function createFileData(content: string): FileData {
      const now = new Date().toISOString();
      return {
        content: content.split("\n"),
        created_at: now,
        modified_at: now,
      };
    }
    
    const skillsFiles: Record<string, FileData> = {};
    
    const skillUrl =
      "https://raw.githubusercontent.com/langchain-ai/deepagentsjs/refs/heads/main/examples/skills/langgraph-docs/SKILL.md";
    const response = await fetch(skillUrl);
    const skillContent = await response.text();
    
    skillsFiles["/skills/langgraph-docs/SKILL.md"] = createFileData(skillContent);
    
    const agent = await createDeepAgent({
      checkpointer,
      // 重要：deepagents 的技能源路径是相对于后端 root 的虚拟（POSIX）路径。
      skills: ["/skills/"],
    });
    
    const config = {
      configurable: {
        thread_id: `thread-${Date.now()}`,
      },
    };
    
    const result = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content: "什么是 langraph？如果可用，请使用 langgraph-docs 技能。",
          },
        ],
        files: skillsFiles,
      },
      config,
    );
    ```
  </Tab>

  <Tab title="StoreBackend">
    ```typescript  theme={null}
    import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
    import {
      InMemoryStore,
      MemorySaver,
      type BaseStore,
    } from "@langchain/langgraph";

    const checkpointer = new MemorySaver();
    const store = new InMemoryStore();
    
    function createFileData(content: string): FileData {
      const now = new Date().toISOString();
      return {
        content: content.split("\n"),
        created_at: now,
        modified_at: now,
      };
    }
    
    const skillUrl =
      "https://raw.githubusercontent.com/langchain-ai/deepagentsjs/refs/heads/main/examples/skills/langgraph-docs/SKILL.md";
    
    const response = await fetch(skillUrl);
    const skillContent = await response.text();
    const fileData = createFileData(skillContent);
    
    await store.put(["filesystem"], "/skills/langgraph-docs/SKILL.md", fileData);
    
    const backendFactory = (config: { state: unknown; store?: BaseStore }) => {
      return new StoreBackend({
        state: config.state,
        store: config.store ?? store,
      });
    };
    
    const agent = await createDeepAgent({
      backend: backendFactory,
      store: store,
      checkpointer,
      // 重要：deepagents 的技能源路径是相对于后端 root 的虚拟（POSIX）路径。
      skills: ["/skills/"],
    });
    
    const config = {
      recursionLimit: 50,
      configurable: {
        thread_id: `thread-${Date.now()}`,
      },
    };
    
    const result = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content: "什么是 langraph？如果可用，请使用 langgraph-docs 技能。",
          },
        ],
      },
      config,
    );
    ```
  </Tab>

  <Tab title="FilesystemBackend">
    ```typescript  theme={null}
    import { createDeepAgent, FilesystemBackend } from "deepagents";
    import { MemorySaver } from "@langchain/langgraph";

    const checkpointer = new MemorySaver();
    const backend = new FilesystemBackend({ rootDir: process.cwd() });
    
    const agent = await createDeepAgent({
      backend,
      skills: ["./examples/skills/"],
      interruptOn: {
        read_file: true,
        write_file: true,
        delete_file: true,
      },
      checkpointer, // 必需！
    });
    
    const config = {
      configurable: {
        thread_id: `thread-${Date.now()}`,
      },
    };
    
    const result = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content: "什么是 langraph？如果可用，请使用 langgraph-docs 技能。",
          },
        ],
      },
      config,
    );
    ```
  </Tab>
</Tabs>

## <a id="memory"></a> 记忆

使用 [`AGENTS.md` 文件](https://agents.md/) 为深度智能体提供额外上下文。

在创建深度智能体时，你可以向 `memory` 参数传入一个或多个文件路径：

<Tabs>
  <Tab title="StateBackend">
    ```typescript  theme={null}
    import { createDeepAgent, type FileData } from "deepagents";
    import { MemorySaver } from "@langchain/langgraph";

    const AGENTS_MD_URL =
      "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";
    
    async function fetchText(url: string): Promise<string> {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`拉取 ${url} 失败：${res.status} ${res.statusText}`);
      }
      return await res.text();
    }
    
    const agentsMd = await fetchText(AGENTS_MD_URL);
    const checkpointer = new MemorySaver();
    
    function createFileData(content: string): FileData {
      const now = new Date().toISOString();
      return {
        content: content.split("\n"),
        created_at: now,
        modified_at: now,
      };
    }
    
    const agent = await createDeepAgent({
      memory: ["/AGENTS.md"],
      checkpointer: checkpointer,
    });
    
    const result = await agent.invoke(
      {
        messages: [
          {
            role: "user",
            content: "请告诉我你的记忆文件里包含什么。",
          },
        ],
        // 为默认的 StateBackend 的 in-state 文件系统写入初始内容（虚拟路径必须以 "/" 开头）。
        files: { "/AGENTS.md": createFileData(agentsMd) },
      },
      { configurable: { thread_id: "12345" } }
    );
    ```
  </Tab>

  <Tab title="StoreBackend">
    ```typescript  theme={null}
        import { createDeepAgent, StoreBackend, type FileData } from "deepagents";
        import {
          InMemoryStore,
          MemorySaver,
          type BaseStore,
        } from "@langchain/langgraph";

        const AGENTS_MD_URL =
          "https://raw.githubusercontent.com/langchain-ai/deepagents/refs/heads/main/examples/text-to-sql-agent/AGENTS.md";
    
        async function fetchText(url: string): Promise<string> {
          const res = await fetch(url);
          if (!res.ok) {
            throw new Error(`拉取 ${url} 失败：${res.status} ${res.statusText}`);
          }
          return await res.text();
        }
    
        const agentsMd = await fetchText(AGENTS_MD_URL);
    
        function createFileData(content: string): FileData {
          const now = new Date().toISOString();
          return {
            content: content.split("\n"),
            created_at: now,
            modified_at: now,
          };
        }
    
        const store = new InMemoryStore();
        const fileData = createFileData(agentsMd);
        await store.put(["filesystem"], "/AGENTS.md", fileData);
    
        const checkpointer = new MemorySaver();
    
        const backendFactory = (config: { state: unknown; store?: BaseStore }) => {
          return new StoreBackend({
            state: config.state,
            store: config.store ?? store,
          });
        };
    
        const agent = await createDeepAgent({
          backend: backendFactory,
          store: store,
          checkpointer: checkpointer,
          memory: ["/AGENTS.md"],
        });
    
        const result = await agent.invoke(
          {
            messages: [
              {
                role: "user",
                content: "请告诉我你的记忆文件里包含什么。",
              },
            ],
          },
          { configurable: { thread_id: "12345" } }
        );
    ```
  </Tab>

  <Tab title="Filesystem">
    ```typescript  theme={null}
    import { createDeepAgent, FilesystemBackend } from "deepagents";
    import { MemorySaver } from "@langchain/langgraph";

    // 人类介入需要 Checkpointer
    const checkpointer = new MemorySaver();
    
    const agent = await createDeepAgent({
      backend: (config) =>
        new FilesystemBackend({ rootDir: "/Users/user/{project}" }),
      memory: ["./AGENTS.md", "./.deepagents/AGENTS.md"],
      interruptOn: {
        read_file: true,
        write_file: true,
        delete_file: true,
      },
      checkpointer, // 必需！
    });
    ```
  </Tab>
</Tabs>

## 结构化输出

Deep agents 支持[结构化输出](/oss/javascript/langchain/structured-output)。

你可以在调用 `createDeepAgent()` 时通过 `responseFormat` 参数传入期望的结构化输出模式。
当模型生成结构化数据时，它会被捕获、校验，并在智能体状态的 `structuredResponse` 键中返回。

```typescript  theme={null}
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { createDeepAgent } from "deepagents";
import { z } from "zod";

const internetSearch = tool(
  async ({
    query,
    maxResults = 5,
    topic = "general",
    includeRawContent = false,
  }: {
    query: string;
    maxResults?: number;
    topic?: "general" | "news" | "finance";
    includeRawContent?: boolean;
  }) => {
    const tavilySearch = new TavilySearch({
      maxResults,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      includeRawContent,
      topic,
    });
    return await tavilySearch._call({ query });
  },
  {
    name: "internet_search",
    description: "运行一次网页搜索",
    schema: z.object({
      query: z.string().describe("搜索查询词"),
      maxResults: z.number().optional().default(5),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general"),
      includeRawContent: z.boolean().optional().default(false),
    }),
  }
);

const weatherReportSchema = z.object({
  location: z.string().describe("本次天气报告的地点"),
  temperature: z.number().describe("当前摄氏温度"),
  condition: z
    .string()
    .describe("当前天气状况（例如：晴、阴、多云、雨）"),
  humidity: z.number().describe("湿度百分比"),
  windSpeed: z.number().describe("风速（km/h）"),
  forecast: z.string().describe("未来 24 小时的简要预报"),
});

const agent = await createDeepAgent({
  responseFormat: weatherReportSchema,
  tools: [internetSearch],
});

const result = await agent.invoke({
  messages: [
    {
      role: "user",
      content: "旧金山的天气怎么样？",
    },
  ],
});

console.log(result.structuredResponse);
// {
//   location: 'San Francisco, California',
//   temperature: 18.3,
//   condition: '晴',
//   humidity: 48,
//   windSpeed: 7.6,
//   forecast: '天空晴朗，气温保持温和。白天气温最高 18°C（64°F），夜间降至约 11°C（52°F）。'
// }
```

更多信息与示例请参阅[response format](/oss/javascript/langchain/structured-output#response-format)。

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/customization.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[连接这些文档](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
