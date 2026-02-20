> ## 文档索引
> 获取完整文档索引：https://docs.langchain.com/llms.txt
> 在进一步探索之前，使用此文件发现所有可用页面。

# 快速入门

本快速入门演示如何使用 LangGraph 的 Graph API 或 Functional API 构建一个计算器智能体。

* 如果你更喜欢将智能体定义为由节点与边组成的图，请使用 [Graph API](#use-the-graph-api)。
* 如果你更喜欢将智能体定义为单个函数，请使用 [Functional API](#use-the-functional-api)。

有关概念性信息，请参阅 [Graph API 概览](/oss/javascript/langgraph/graph-api) 与 [Functional API 概览](/oss/javascript/langgraph/functional-api)。

<Info>
  对于此示例，你需要创建一个 [Claude (Anthropic)](https://www.anthropic.com/) 账户并获取 API key。然后，在你的终端中设置 `ANTHROPIC_API_KEY` 环境变量。
</Info>

<Tabs>
  <Tab title="使用 Graph API">
    ## 1. 定义工具与模型

    在此示例中，我们将使用 Claude Sonnet 4.5 模型，并定义用于加法、乘法与除法的工具。
    
    ```typescript  theme={null}
    import { ChatAnthropic } from "@langchain/anthropic";
    import { tool } from "@langchain/core/tools";
    import * as z from "zod";
    
    const model = new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      temperature: 0,
    });
    
    // 定义工具
    const add = tool(({ a, b }) => a + b, {
      name: "add",
      description: "将两个数字相加",
      schema: z.object({
        a: z.number().describe("第一个数字"),
        b: z.number().describe("第二个数字"),
      }),
    });
    
    const multiply = tool(({ a, b }) => a * b, {
      name: "multiply",
      description: "将两个数字相乘",
      schema: z.object({
        a: z.number().describe("第一个数字"),
        b: z.number().describe("第二个数字"),
      }),
    });
    
    const divide = tool(({ a, b }) => a / b, {
      name: "divide",
      description: "将两个数字相除",
      schema: z.object({
        a: z.number().describe("第一个数字"),
        b: z.number().describe("第二个数字"),
      }),
    });
    
    // 为大语言模型绑定工具
    const toolsByName = {
      [add.name]: add,
      [multiply.name]: multiply,
      [divide.name]: divide,
    };
    const tools = Object.values(toolsByName);
    const modelWithTools = model.bindTools(tools);
    ```
    
    ## 2. 定义状态
    
    图的状态用于存储消息，以及 LLM 调用次数。
    
    <Tip>
      LangGraph 中的状态会在智能体执行期间持续存在。
    
      `MessagesValue` 提供了一个内置 reducer，用于追加消息。`llmCalls` 字段使用一个 `ReducedValue`，并通过 `(x, y) => x + y` 来累加计数。
    </Tip>
    
    ```typescript  theme={null}
    import {
      StateGraph,
      StateSchema,
      MessagesValue,
      ReducedValue,
      GraphNode,
      ConditionalEdgeRouter,
      START,
      END,
    } from "@langchain/langgraph";
    import { z } from "zod/v4";
    
    const MessagesState = new StateSchema({
      messages: MessagesValue,
      llmCalls: new ReducedValue(
        z.number().default(0),
        { reducer: (x, y) => x + y }
      ),
    });
    ```
    
    ## 3. 定义模型节点
    
    模型节点用于调用 LLM，并决定是否要调用工具。
    
    ```typescript  theme={null}
    import { SystemMessage } from "@langchain/core/messages";
    
    const llmCall: GraphNode<typeof MessagesState> = async (state) => {
      const response = await modelWithTools.invoke([
        new SystemMessage(
          "你是一个乐于助人的助手，负责对一组输入执行算术运算。"
        ),
        ...state.messages,
      ]);
      return {
        messages: [response],
        llmCalls: 1,
      };
    };
    ```
    
    ## 4. 定义工具节点
    
    工具节点用于调用工具并返回结果。
    
    ```typescript  theme={null}
    import { AIMessage, ToolMessage } from "@langchain/core/messages";
    
    const toolNode: GraphNode<typeof MessagesState> = async (state) => {
      const lastMessage = state.messages.at(-1);
    
      if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
        return { messages: [] };
      }
    
      const result: ToolMessage[] = [];
      for (const toolCall of lastMessage.tool_calls ?? []) {
        const tool = toolsByName[toolCall.name];
        const observation = await tool.invoke(toolCall);
        result.push(observation);
      }
    
      return { messages: result };
    };
    ```
    
    ## 5. 定义结束逻辑
    
    条件边函数用于基于 LLM 是否发起了工具调用，路由到工具节点或结束。
    
    ```typescript  theme={null}
    const shouldContinue: ConditionalEdgeRouter<typeof MessagesState, "toolNode"> = (state) => {
      const lastMessage = state.messages.at(-1);
    
      // 在访问 tool_calls 之前检查它是否为 AIMessage
      if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
        return END;
      }
    
      // 如果 LLM 发起工具调用，则执行动作
      if (lastMessage.tool_calls?.length) {
        return "toolNode";
      }
    
      // 否则停止（回复用户）
      return END;
    };
    ```
    
    ## 6. 构建并编译智能体
    
    智能体通过 [`StateGraph`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.StateGraph.html) 类构建，并通过 [`compile`](https://reference.langchain.com/javascript/classes/_langchain_langgraph.index.StateGraph.html#compile) 方法编译。
    
    ```typescript  theme={null}
    const agent = new StateGraph(MessagesState)
      .addNode("llmCall", llmCall)
      .addNode("toolNode", toolNode)
      .addEdge(START, "llmCall")
      .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
      .addEdge("toolNode", "llmCall")
      .compile();
    
    // 调用
    import { HumanMessage } from "@langchain/core/messages";
    const result = await agent.invoke({
      messages: [new HumanMessage("把 3 和 4 相加。")],
    });
    
    for (const message of result.messages) {
      console.log(`[${message.type}]: ${message.text}`);
    }
    ```
    
    <Tip>
      要了解如何使用 LangSmith 追踪你的智能体，请参阅 [LangSmith 文档](/langsmith/trace-with-langgraph)。
    </Tip>
    
    恭喜！你已经使用 LangGraph Graph API 构建了你的第一个智能体。
    
    <Accordion title="完整代码示例">
      ```typescript  theme={null}
      // 第 1 步：定义工具与模型
    
      import { ChatAnthropic } from "@langchain/anthropic";
      import { tool } from "@langchain/core/tools";
      import * as z from "zod";
    
      const model = new ChatAnthropic({
        model: "claude-sonnet-4-5-20250929",
        temperature: 0,
      });
    
      // 定义工具
      const add = tool(({ a, b }) => a + b, {
        name: "add",
        description: "将两个数字相加",
        schema: z.object({
          a: z.number().describe("第一个数字"),
          b: z.number().describe("第二个数字"),
        }),
      });
    
      const multiply = tool(({ a, b }) => a * b, {
        name: "multiply",
        description: "将两个数字相乘",
        schema: z.object({
          a: z.number().describe("第一个数字"),
          b: z.number().describe("第二个数字"),
        }),
      });
    
      const divide = tool(({ a, b }) => a / b, {
        name: "divide",
        description: "将两个数字相除",
        schema: z.object({
          a: z.number().describe("第一个数字"),
          b: z.number().describe("第二个数字"),
        }),
      });
    
      // 为大语言模型绑定工具
      const toolsByName = {
        [add.name]: add,
        [multiply.name]: multiply,
        [divide.name]: divide,
      };
      const tools = Object.values(toolsByName);
      const modelWithTools = model.bindTools(tools);
      ```
    
      ```typescript  theme={null}
      // 第 2 步：定义状态
    
      import {
        StateGraph,
        StateSchema,
        MessagesValue,
        ReducedValue,
        GraphNode,
        ConditionalEdgeRouter,
        START,
        END,
      } from "@langchain/langgraph";
      import * as z from "zod";
    
      const MessagesState = new StateSchema({
        messages: MessagesValue,
        llmCalls: new ReducedValue(
          z.number().default(0),
          { reducer: (x, y) => x + y }
        ),
      });
      ```
    
      ```typescript  theme={null}
      // 第 3 步：定义模型节点
    
      import { SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
    
      const llmCall: GraphNode<typeof MessagesState> = async (state) => {
        return {
          messages: [await modelWithTools.invoke([
            new SystemMessage(
              "你是一个乐于助人的助手，负责对一组输入执行算术运算。"
            ),
            ...state.messages,
          ])],
          llmCalls: 1,
        };
      };
    
      // 第 4 步：定义工具节点
    
      const toolNode: GraphNode<typeof MessagesState> = async (state) => {
        const lastMessage = state.messages.at(-1);
    
        if (lastMessage == null || !AIMessage.isInstance(lastMessage)) {
          return { messages: [] };
        }
    
        const result: ToolMessage[] = [];
        for (const toolCall of lastMessage.tool_calls ?? []) {
          const tool = toolsByName[toolCall.name];
          const observation = await tool.invoke(toolCall);
          result.push(observation);
        }
    
        return { messages: result };
      };
      ```
    
      ```typescript  theme={null}
      // 第 5 步：定义用于判断是否结束的逻辑
      import { ConditionalEdgeRouter, END } from "@langchain/langgraph";
    
      const shouldContinue: ConditionalEdgeRouter<typeof MessagesState, "toolNode"> = (state) => {
        const lastMessage = state.messages.at(-1);
    
        // 在访问 tool_calls 之前检查它是否为 AIMessage
        if (!lastMessage || !AIMessage.isInstance(lastMessage)) {
          return END;
        }
    
        // 如果 LLM 发起工具调用，则执行动作
        if (lastMessage.tool_calls?.length) {
          return "toolNode";
        }
    
        // 否则停止（回复用户）
        return END;
      };
      ```
    
      ```typescript  theme={null}
      // 第 6 步：构建并编译智能体
      import { HumanMessage } from "@langchain/core/messages";
      import { StateGraph, START, END } from "@langchain/langgraph";
    
      const agent = new StateGraph(MessagesState)
        .addNode("llmCall", llmCall)
        .addNode("toolNode", toolNode)
        .addEdge(START, "llmCall")
        .addConditionalEdges("llmCall", shouldContinue, ["toolNode", END])
        .addEdge("toolNode", "llmCall")
        .compile();
    
      // 调用
      const result = await agent.invoke({
        messages: [new HumanMessage("把 3 和 4 相加。")],
      });
    
      for (const message of result.messages) {
        console.log(`[${message.type}]: ${message.text}`);
      }
      ```
    </Accordion>
  </Tab>

  <Tab title="使用 Functional API">
    ## 1. 定义工具与模型

    在此示例中，我们将使用 Claude Sonnet 4.5 模型，并定义用于加法、乘法与除法的工具。
    
    ```typescript  theme={null}
    import { ChatAnthropic } from "@langchain/anthropic";
    import { tool } from "@langchain/core/tools";
    import * as z from "zod";
    
    const model = new ChatAnthropic({
      model: "claude-sonnet-4-5-20250929",
      temperature: 0,
    });
    
    // 定义工具
    const add = tool(({ a, b }) => a + b, {
      name: "add",
      description: "将两个数字相加",
      schema: z.object({
        a: z.number().describe("第一个数字"),
        b: z.number().describe("第二个数字"),
      }),
    });
    
    const multiply = tool(({ a, b }) => a * b, {
      name: "multiply",
      description: "将两个数字相乘",
      schema: z.object({
        a: z.number().describe("第一个数字"),
        b: z.number().describe("第二个数字"),
      }),
    });
    
    const divide = tool(({ a, b }) => a / b, {
      name: "divide",
      description: "将两个数字相除",
      schema: z.object({
        a: z.number().describe("第一个数字"),
        b: z.number().describe("第二个数字"),
      }),
    });
    
    // 为大语言模型绑定工具
    const toolsByName = {
      [add.name]: add,
      [multiply.name]: multiply,
      [divide.name]: divide,
    };
    const tools = Object.values(toolsByName);
    const modelWithTools = model.bindTools(tools);
    
    ```
    
    ## 2. 定义模型节点
    
    模型节点用于调用 LLM，并决定是否要调用工具。
    
    ```typescript  theme={null}
    import { task, entrypoint } from "@langchain/langgraph";
    import { SystemMessage } from "@langchain/core/messages";
    
    const callLlm = task({ name: "callLlm" }, async (messages: BaseMessage[]) => {
      return modelWithTools.invoke([
        new SystemMessage(
          "你是一个乐于助人的助手，负责对一组输入执行算术运算。"
        ),
        ...messages,
      ]);
    });
    ```
    
    ## 3. 定义工具节点
    
    工具节点用于调用工具并返回结果。
    
    ```typescript  theme={null}
    import type { ToolCall } from "@langchain/core/messages/tool";
    
    const callTool = task({ name: "callTool" }, async (toolCall: ToolCall) => {
      const tool = toolsByName[toolCall.name];
      return tool.invoke(toolCall);
    });
    ```
    
    ## 4. 定义智能体
    
    ```typescript  theme={null}
    import { addMessages } from "@langchain/langgraph";
    import { type BaseMessage } from "@langchain/core/messages";
    
    const agent = entrypoint({ name: "agent" }, async (messages: BaseMessage[]) => {
      let modelResponse = await callLlm(messages);
    
      while (true) {
        if (!modelResponse.tool_calls?.length) {
          break;
        }
    
        // 执行工具
        const toolResults = await Promise.all(
          modelResponse.tool_calls.map((toolCall) => callTool(toolCall))
        );
        messages = addMessages(messages, [modelResponse, ...toolResults]);
        modelResponse = await callLlm(messages);
      }
    
      return messages;
    });
    
    // 调用
    import { HumanMessage } from "@langchain/core/messages";
    
    const result = await agent.invoke([new HumanMessage("把 3 和 4 相加。")]);
    
    for (const message of result) {
      console.log(`[${message.getType()}]: ${message.text}`);
    }
    ```
    
    <Tip>
      要了解如何使用 LangSmith 追踪你的智能体，请参阅 [LangSmith 文档](/langsmith/trace-with-langgraph)。
    </Tip>
    
    恭喜！你已经使用 LangGraph Functional API 构建了你的第一个智能体。
    
    <Accordion title="完整代码示例" icon="code">
      ```typescript  theme={null}
      import { ChatAnthropic } from "@langchain/anthropic";
      import { tool } from "@langchain/core/tools";
      import {
        task,
        entrypoint,
        addMessages,
      } from "@langchain/langgraph";
      import {
        SystemMessage,
        HumanMessage,
        type BaseMessage,
      } from "@langchain/core/messages";
      import type { ToolCall } from "@langchain/core/messages/tool";
      import * as z from "zod";
    
      // 第 1 步：定义工具与模型
    
      const model = new ChatAnthropic({
        model: "claude-sonnet-4-5-20250929",
        temperature: 0,
      });
    
      // 定义工具
      const add = tool(({ a, b }) => a + b, {
        name: "add",
        description: "将两个数字相加",
        schema: z.object({
          a: z.number().describe("第一个数字"),
          b: z.number().describe("第二个数字"),
        }),
      });
    
      const multiply = tool(({ a, b }) => a * b, {
        name: "multiply",
        description: "将两个数字相乘",
        schema: z.object({
          a: z.number().describe("第一个数字"),
          b: z.number().describe("第二个数字"),
        }),
      });
    
      const divide = tool(({ a, b }) => a / b, {
        name: "divide",
        description: "将两个数字相除",
        schema: z.object({
          a: z.number().describe("第一个数字"),
          b: z.number().describe("第二个数字"),
        }),
      });
    
      // 为大语言模型绑定工具
      const toolsByName = {
        [add.name]: add,
        [multiply.name]: multiply,
        [divide.name]: divide,
      };
      const tools = Object.values(toolsByName);
      const modelWithTools = model.bindTools(tools);
    
      // 第 2 步：定义模型节点
    
      const callLlm = task({ name: "callLlm" }, async (messages: BaseMessage[]) => {
        return modelWithTools.invoke([
          new SystemMessage(
            "你是一个乐于助人的助手，负责对一组输入执行算术运算。"
          ),
          ...messages,
        ]);
      });
    
      // 第 3 步：定义工具节点
    
      const callTool = task({ name: "callTool" }, async (toolCall: ToolCall) => {
        const tool = toolsByName[toolCall.name];
        return tool.invoke(toolCall);
      });
    
      // 第 4 步：定义智能体
    
      const agent = entrypoint({ name: "agent" }, async (messages: BaseMessage[]) => {
        let modelResponse = await callLlm(messages);
    
        while (true) {
          if (!modelResponse.tool_calls?.length) {
            break;
          }
    
          // 执行工具
          const toolResults = await Promise.all(
            modelResponse.tool_calls.map((toolCall) => callTool(toolCall))
          );
          messages = addMessages(messages, [modelResponse, ...toolResults]);
          modelResponse = await callLlm(messages);
        }
    
        return messages;
      });
    
      // 调用
    
      const result = await agent.invoke([new HumanMessage("把 3 和 4 相加。")]);
    
      for (const message of result) {
        console.log(`[${message.type}]: ${message.text}`);
      }
      ```
    </Accordion>
  </Tab>
</Tabs>

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langgraph/quickstart.mdx) 或 [提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档连接](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
