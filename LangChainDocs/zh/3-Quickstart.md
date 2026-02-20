> ## 文档索引
> 获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# 快速入门

本快速入门将带您在几分钟内从简单的设置到一个功能齐全的 AI Agent。

<Tip>
  **LangChain 文档 MCP 服务器**

  如果您正在使用 AI 编码助手或 IDE（例如 Claude Code 或 Cursor），您应该安装 [LangChain 文档 MCP 服务器](/use-these-docs) 以充分利用它。这确保您的 Agent 可以访问最新的 LangChain 文档和示例。
</Tip>

## 要求

对于这些示例，您需要：

* [安装](/oss/javascript/langchain/install) LangChain 包
* 设置一个 [Claude (Anthropic)](https://www.anthropic.com/) 账户并获取 API 密钥
* 在您的终端中设置 `ANTHROPIC_API_KEY` 环境变量

虽然这些示例使用 Claude，但您可以通过更改代码中的模型名称并设置相应的 API 密钥来使用 [任何支持的模型](/oss/javascript/integrations/providers/overview)。

## 构建一个基本 Agent

首先创建一个可以回答问题和调用工具的简单 Agent。该 Agent 将使用 Claude Sonnet 4.5 作为其语言模型，一个基本的天气函数作为工具，以及一个简单的提示来指导其行为。

```ts  theme={null}
import { createAgent, tool } from "langchain";
import * as z from "zod";

const getWeather = tool(
  (input) => `It's always sunny in ${input.city}!`,
  {
    name: "get_weather",
    description: "获取指定城市的天气",
    schema: z.object({
      city: z.string().describe("要获取天气的城市"),
    }),
  }
);

const agent = createAgent({
  model: "claude-sonnet-4-5-20250929",
  tools: [getWeather],
});

console.log(
  await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  })
);
```

<Tip>
  要了解如何使用 LangSmith 跟踪您的 Agent，请参阅 [LangSmith 文档](/langsmith/trace-with-langchain)。
</Tip>

## 构建一个真实世界的 Agent

接下来，构建一个实用的天气预报 Agent，演示关键的生产概念：

1. **详细的系统提示** 以获得更好的 Agent 行为
2. **创建工具** 以集成外部数据
3. **模型配置** 以获得一致的响应
4. **结构化输出** 以获得可预测的结果
5. **对话记忆** 以进行类似聊天的交互
6. **创建并运行 Agent** 以测试功能齐全的 Agent

让我们逐步进行：

<Steps>
  <Step title="定义系统提示">
    系统提示定义了您 Agent 的角色和行为。保持具体和可操作：

    ```ts wrap theme={null}
    const systemPrompt = `你是一个专业的天气预报员，说话喜欢用双关语。

    你可以使用两个工具：

    - get_weather_for_location: 使用此工具获取特定位置的天气
    - get_user_location: 使用此工具获取用户的位置

    如果用户询问天气，请确保你知道地点。如果你能从问题中判断出他们是指他们所在的任何地方，请使用 get_user_location 工具查找他们的位置。`;
    ```
  </Step>

  <Step title="创建工具">
    [工具](/oss/javascript/langchain/tools) 是您的 Agent 可以调用的函数。通常工具会想要连接到外部系统，并且将依赖运行时配置来这样做。注意这里 `getUserLocation` 工具是如何做到这一点的：

    ```ts  theme={null}
    import { tool, type ToolRuntime } from "langchain";
    import * as z from "zod";

    const getWeather = tool(
      (input) => `It's always sunny in ${input.city}!`,
      {
        name: "get_weather_for_location",
        description: "获取指定城市的天气",
        schema: z.object({
          city: z.string().describe("要获取天气的城市"),
        }),
      }
    );

    type AgentRuntime = ToolRuntime<unknown, { user_id: string }>;

    const getUserLocation = tool(
      (_, config: AgentRuntime) => {
        const { user_id } = config.context;
        return user_id === "1" ? "Florida" : "SF";
      },
      {
        name: "get_user_location",
        description: "根据用户 ID 检索用户信息",
      }
    );
    ```

    <Note>
      [Zod](https://zod.dev/) 是一个用于验证和解析预定义模式的库。您可以使用它来定义工具的输入模式，以确保 Agent 仅使用正确的参数调用工具。

      或者，您可以将 `schema` 属性定义为 [JSON schema](https://json-schema.org/overview/what-is-jsonschema) 对象。请记住，JSON schema **不会** 在运行时进行验证。

      <Accordion title="示例：使用 JSON schema 作为工具输入">
        ```ts  theme={null}
        const getWeather = tool(
          ({ city }) => `It's always sunny in ${city}!`,
          {
            name: "get_weather_for_location",
            description: "获取指定城市的天气",
            schema: {
              type: "object",
              properties: {
                city: {
                  type: "string",
                  description: "要获取天气的城市"
                }
              },
              required: ["city"]
            },
          }
        );
        ```
      </Accordion>
    </Note>
  </Step>

  <Step title="配置您的模型">
    为您的用例设置具有正确参数的 [语言模型](/oss/javascript/langchain/models)：

    ```ts  theme={null}
    import { initChatModel } from "langchain";

    const model = await initChatModel(
      "claude-sonnet-4-5-20250929",
      { temperature: 0.5, timeout: 10, maxTokens: 1000 }
    );
    ```

    根据选择的模型和提供商，初始化参数可能会有所不同；请参阅其参考页面以获取详细信息。
  </Step>

  <Step title="定义响应格式">
    可选地，如果您需要 Agent 响应匹配特定模式，请定义结构化响应格式。

    ```ts  theme={null}
    const responseFormat = z.object({
      punny_response: z.string(),
      weather_conditions: z.string().optional(),
    });
    ```
  </Step>

  <Step title="添加记忆">
    为您的 Agent 添加 [记忆](/oss/javascript/langchain/short-term-memory) 以在交互之间维护状态。这允许 Agent 记住以前的对话和上下文。

    ```ts  theme={null}
    import { MemorySaver } from "@langchain/langgraph";

    const checkpointer = new MemorySaver();
    ```

    <Info>
      在生产中，使用将消息历史记录保存到数据库的持久检查点。
      有关更多详细信息，请参阅 [添加和管理记忆](/oss/javascript/langgraph/add-memory#manage-short-term-memory)。
    </Info>
  </Step>

  <Step title="创建并运行 Agent">
    现在用所有组件组装您的 Agent 并运行它！

    ```ts  theme={null}
    import { createAgent } from "langchain";

    const agent = createAgent({
      model: "claude-sonnet-4-5-20250929",
      systemPrompt: systemPrompt,
      tools: [getUserLocation, getWeather],
      responseFormat,
      checkpointer,
    });

    // `thread_id` 是给定对话的唯一标识符。
    const config = {
      configurable: { thread_id: "1" },
      context: { user_id: "1" },
    };

    const response = await agent.invoke(
      { messages: [{ role: "user", content: "what is the weather outside?" }] },
      config
    );
    console.log(response.structuredResponse);
    // {
    //   punny_response: "Florida is still having a 'sun-derful' day ...",
    //   weather_conditions: "It's always sunny in Florida!"
    // }

    // 注意，我们可以使用相同的 `thread_id` 继续对话。
    const thankYouResponse = await agent.invoke(
      { messages: [{ role: "user", content: "thank you!" }] },
      config
    );
    console.log(thankYouResponse.structuredResponse);
    // {
    //   punny_response: "You're 'thund-erfully' welcome! ...",
    //   weather_conditions: undefined
    // }
    ```
  </Step>
</Steps>

<Expandable title="完整示例代码">
  ```ts  theme={null}
  import { createAgent, tool, initChatModel, type ToolRuntime } from "langchain";
  import { MemorySaver } from "@langchain/langgraph";
  import * as z from "zod";

  // 定义系统提示
  const systemPrompt = `你是一个专业的天气预报员，说话喜欢用双关语。

  你可以使用两个工具：

  - get_weather_for_location: 使用此工具获取特定位置的天气
  - get_user_location: 使用此工具获取用户的位置

  如果用户询问天气，请确保你知道地点。如果你能从问题中判断出他们是指他们所在的任何地方，请使用 get_user_location 工具查找他们的位置。`;

  // 定义工具
  const getWeather = tool(
    ({ city }) => `It's always sunny in ${city}!`,
    {
      name: "get_weather_for_location",
      description: "获取指定城市的天气",
      schema: z.object({
        city: z.string(),
      }),
    }
  );

  type AgentRuntime = ToolRuntime<unknown, { user_id: string }>;

  const getUserLocation = tool(
    (_, config: AgentRuntime) => {
      const { user_id } = config.context;
      return user_id === "1" ? "Florida" : "SF";
    },
    {
      name: "get_user_location",
      description: "根据用户 ID 检索用户信息",
      schema: z.object({}),
    }
  );

  // 配置模型
  const model = await initChatModel(
    "claude-sonnet-4-5-20250929",
    { temperature: 0 }
  );

  // 定义响应格式
  const responseFormat = z.object({
    punny_response: z.string(),
    weather_conditions: z.string().optional(),
  });

  // 设置记忆
  const checkpointer = new MemorySaver();

  // 创建 Agent
  const agent = createAgent({
    model,
    systemPrompt,
    responseFormat,
    checkpointer,
    tools: [getUserLocation, getWeather],
  });

  // 运行 Agent
  // `thread_id` 是给定对话的唯一标识符。
  const config = {
    configurable: { thread_id: "1" },
    context: { user_id: "1" },
  };

  const response = await agent.invoke(
    { messages: [{ role: "user", content: "what is the weather outside?" }] },
    config
  );
  console.log(response.structuredResponse);
  // {
  //   punny_response: "Florida is still having a 'sun-derful' day! The sunshine is playing 'ray-dio' hits all day long! I'd say it's the perfect weather for some 'solar-bration'! If you were hoping for rain, I'm afraid that idea is all 'washed up' - the forecast remains 'clear-ly' brilliant!",
  //   weather_conditions: "It's always sunny in Florida!"
  // }

  // 注意，我们可以使用相同的 `thread_id` 继续对话。
  const thankYouResponse = await agent.invoke(
    { messages: [{ role: "user", content: "thank you!" }] },
    config
  );
  console.log(thankYouResponse.structuredResponse);
  // {
  //   punny_response: "You're 'thund-erfully' welcome! It's always a 'breeze' to help you stay 'current' with the weather. I'm just 'cloud'-ing around waiting to 'shower' you with more forecasts whenever you need them. Have a 'sun-sational' day in the Florida sunshine!",
  //   weather_conditions: undefined
  // }
  ```
</Expandable>

<Tip>
  要了解如何使用 LangSmith 跟踪您的 Agent，请参阅 [LangSmith 文档](/langsmith/trace-with-langchain)。
</Tip>

恭喜！您现在拥有一个 AI Agent，它可以：

* **理解上下文** 并记住对话
* 智能地 **使用多个工具**
* 以一致的格式 **提供结构化响应**
* 通过上下文 **处理用户特定信息**
* 在交互之间 **维护对话状态**

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/quickstart.mdx) 或 [提交问题](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Tip icon="terminal" iconType="regular">
  通过 MCP 将 [这些文档](/use-these-docs) 连接到 Claude、VSCode 等，以获取实时答案。
</Tip>
