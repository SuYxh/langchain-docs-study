# 测试 (Test)

智能体应用程序让 LLM 决定自己解决问题的下一步。这种灵活性很强大，但模型的黑盒性质使得很难预测对智能体一部分的调整将如何影响其余部分。为了构建生产就绪的智能体，彻底的测试至关重要。

有几种方法可以测试您的智能体：

*   单元测试使用内存中的伪造对象隔离地测试智能体的小型、确定性部分，以便您可以快速且确定地断言确切行为。

*   [集成测试](#integration-testing) 使用真实的网络调用测试智能体，以确认组件协同工作、凭据和模式一致且延迟可接受。

智能体应用程序往往更依赖于集成测试，因为它们将多个组件链接在一起，并且必须处理由于 LLM 的不确定性而导致的片状性。

## 集成测试

许多智能体行为仅在使用真实 LLM 时才会出现，例如智能体决定调用哪个工具、如何格式化响应，或者提示词修改是否会影响整个执行轨迹。LangChain 的 [`agentevals`](https://github.com/langchain-ai/agentevals) 包提供了专门设计用于使用实时模型测试智能体轨迹的评估器。

AgentEvals 让您可以通过执行 **轨迹匹配** 或使用 **LLM 法官** 来轻松评估智能体的轨迹（消息的确切序列，包括工具调用）：

<Card title="轨迹匹配" icon="equals" arrow="true" href="#trajectory-match-evaluator">
  为给定的输入硬编码参考轨迹，并通过逐步比较验证运行。

  非常适合测试您知道预期行为的明确定义的工作流。当您对应该调用哪些工具以及按什么顺序调用有具体期望时使用。这种方法是确定性的、快速且具有成本效益的，因为它不需要额外的 LLM 调用。
</Card>

<Card title="LLM 作为法官" icon="gavel" arrow="true" href="#llm-as-judge-evaluator">
  使用 LLM 定性验证您的智能体的执行轨迹。“法官” LLM 根据提示词准则（可能包括参考轨迹）审查智能体的决策。

  更灵活，可以评估效率和适当性等细微方面，但需要 LLM 调用且确定性较低。当您想评估智能体轨迹的整体质量和合理性，而没有严格的工具调用或排序要求时使用。
</Card>

### 安装 AgentEvals

```bash
npm install agentevals @langchain/core
```

或者，直接克隆 [AgentEvals 仓库](https://github.com/langchain-ai/agentevals)。

### 轨迹匹配评估器

AgentEvals 提供 `createTrajectoryMatchEvaluator` 函数，将您的智能体轨迹与参考轨迹进行匹配。有四种模式可供选择：

| 模式        | 描述                                          | 用例                                                  |
| ----------- | --------------------------------------------- | ----------------------------------------------------- |
| `strict`    | 以相同顺序精确匹配消息和工具调用              | 测试特定序列（例如，授权前的策略查找）                |
| `unordered` | 允许以任何顺序进行相同的工具调用              | 验证信息检索，当顺序无关紧要时                        |
| `subset`    | 智能体仅调用参考中的工具（无额外工具）        | 确保智能体不超过预期范围                              |
| `superset`  | 智能体至少调用参考工具（允许额外工具）        | 验证已采取最低要求的操作                              |

<Accordion title="严格匹配">
  `strict` 模式确保轨迹包含相同顺序的相同消息和相同的工具调用，尽管它允许消息内容有所不同。当您需要强制执行特定的操作序列时（例如要求在授权操作之前进行策略查找），这很有用。

  ```ts
  import { createAgent, tool, HumanMessage, AIMessage, ToolMessage } from "langchain"
  import { createTrajectoryMatchEvaluator } from "agentevals";
  import * as z from "zod";

  const getWeather = tool(
    async ({ city }: { city: string }) => {
      return `It's 75 degrees and sunny in ${city}.`;
    },
    {
      name: "get_weather",
      description: "Get weather information for a city.",
      schema: z.object({
        city: z.string(),
      }),
    }
  );

  const agent = createAgent({
    model: "gpt-4.1",
    tools: [getWeather]
  });

  const evaluator = createTrajectoryMatchEvaluator({
    trajectoryMatchMode: "strict",
  });

  async function testWeatherToolCalledStrict() {
    const result = await agent.invoke({
      messages: [new HumanMessage("What's the weather in San Francisco?")]
    });

    const referenceTrajectory = [
      new HumanMessage("What's the weather in San Francisco?"),
      new AIMessage({
        content: "",
        tool_calls: [
          { id: "call_1", name: "get_weather", args: { city: "San Francisco" } }
        ]
      }),
      new ToolMessage({
        content: "It's 75 degrees and sunny in San Francisco.",
        tool_call_id: "call_1"
      }),
      new AIMessage("The weather in San Francisco is 75 degrees and sunny."),
    ];

    const evaluation = await evaluator({
      outputs: result.messages,
      referenceOutputs: referenceTrajectory
    });
    // {
    //     'key': 'trajectory_strict_match',
    //     'score': true,
    //     'comment': null,
    // }
    expect(evaluation.score).toBe(true);
  }
  ```
</Accordion>

<Accordion title="无序匹配">
  `unordered` 模式允许以任何顺序进行相同的工具调用，这在您想要验证是否检索了特定信息但不关心顺序时很有帮助。例如，智能体可能需要检查城市的具体天气和事件，但顺序无关紧要。

  ```ts
  import { createAgent, tool, HumanMessage, AIMessage, ToolMessage } from "langchain"
  import { createTrajectoryMatchEvaluator } from "agentevals";
  import * as z from "zod";

  const getWeather = tool(
    async ({ city }: { city: string }) => {
      return `It's 75 degrees and sunny in ${city}.`;
    },
    {
      name: "get_weather",
      description: "Get weather information for a city.",
      schema: z.object({ city: z.string() }),
    }
  );

  const getEvents = tool(
    async ({ city }: { city: string }) => {
      return `Concert at the park in ${city} tonight.`;
    },
    {
      name: "get_events",
      description: "Get events happening in a city.",
      schema: z.object({ city: z.string() }),
    }
  );

  const agent = createAgent({
    model: "gpt-4.1",
    tools: [getWeather, getEvents]
  });

  const evaluator = createTrajectoryMatchEvaluator({
    trajectoryMatchMode: "unordered",
  });

  async function testMultipleToolsAnyOrder() {
    const result = await agent.invoke({
      messages: [new HumanMessage("What's happening in SF today?")]
    });

    // 参考显示工具调用的顺序与实际执行不同
    const referenceTrajectory = [
      new HumanMessage("What's happening in SF today?"),
      new AIMessage({
        content: "",
        tool_calls: [
          { id: "call_1", name: "get_events", args: { city: "SF" } },
          { id: "call_2", name: "get_weather", args: { city: "SF" } },
        ]
      }),
      new ToolMessage({
        content: "Concert at the park in SF tonight.",
        tool_call_id: "call_1"
      }),
      new ToolMessage({
        content: "It's 75 degrees and sunny in SF.",
        tool_call_id: "call_2"
      }),
      new AIMessage("Today in SF: 75 degrees and sunny with a concert at the park tonight."),
    ];

    const evaluation = await evaluator({
      outputs: result.messages,
      referenceOutputs: referenceTrajectory,
    });
    // {
    //     'key': 'trajectory_unordered_match',
    //     'score': true,
    // }
    expect(evaluation.score).toBe(true);
  }
  ```
</Accordion>

<Accordion title="子集和超集匹配">
  `superset` 和 `subset` 模式匹配部分轨迹。`superset` 模式验证智能体至少调用了参考轨迹中的工具，允许额外的工具调用。`subset` 模式确保智能体没有调用参考以外的任何工具。

  ```ts
  import { createAgent } from "langchain"
  import { tool } from "@langchain/core/tools";
  import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
  import { createTrajectoryMatchEvaluator } from "agentevals";
  import * as z from "zod";

  const getWeather = tool(
    async ({ city }: { city: string }) => {
      return `It's 75 degrees and sunny in ${city}.`;
    },
    {
      name: "get_weather",
      description: "Get weather information for a city.",
      schema: z.object({ city: z.string() }),
    }
  );

  const getDetailedForecast = tool(
    async ({ city }: { city: string }) => {
      return `Detailed forecast for ${city}: sunny all week.`;
    },
    {
      name: "get_detailed_forecast",
      description: "Get detailed weather forecast for a city.",
      schema: z.object({ city: z.string() }),
    }
  );

  const agent = createAgent({
    model: "gpt-4.1",
    tools: [getWeather, getDetailedForecast]
  });

  const evaluator = createTrajectoryMatchEvaluator({
    trajectoryMatchMode: "superset",
  });

  async function testAgentCallsRequiredToolsPlusExtra() {
    const result = await agent.invoke({
      messages: [new HumanMessage("What's the weather in Boston?")]
    });

    // 参考仅要求 getWeather，但智能体可能会调用其他工具
    const referenceTrajectory = [
      new HumanMessage("What's the weather in Boston?"),
      new AIMessage({
        content: "",
        tool_calls: [
          { id: "call_1", name: "get_weather", args: { city: "Boston" } },
        ]
      }),
      new ToolMessage({
        content: "It's 75 degrees and sunny in Boston.",
        tool_call_id: "call_1"
      }),
      new AIMessage("The weather in Boston is 75 degrees and sunny."),
    ];

    const evaluation = await evaluator({
      outputs: result.messages,
      referenceOutputs: referenceTrajectory,
    });
    // {
    //     'key': 'trajectory_superset_match',
    //     'score': true,
    //     'comment': null,
    // }
    expect(evaluation.score).toBe(true);
  }
  ```
</Accordion>

<Info>
  您还可以设置 `toolArgsMatchMode` 属性和/或 `toolArgsMatchOverrides` 以自定义评估器如何考虑实际轨迹与参考轨迹中工具调用之间的相等性。默认情况下，只有对同一工具且参数相同的工具调用才被视为相等。访问 [仓库](https://github.com/langchain-ai/agentevals?tab=readme-ov-file#tool-args-match-modes) 了解更多详情。
</Info>

### LLM 作为法官评估器

您还可以使用 `createTrajectoryLLMAsJudge` 函数使用 LLM 来评估智能体的执行路径。与轨迹匹配评估器不同，它不需要参考轨迹，但如果有的话可以提供。

<Accordion title="无参考轨迹">
  ```ts
  import { createAgent } from "langchain"
  import { tool } from "@langchain/core/tools";
  import { HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
  import { createTrajectoryLLMAsJudge, TRAJECTORY_ACCURACY_PROMPT } from "agentevals";
  import * as z from "zod";

  const getWeather = tool(
    async ({ city }: { city: string }) => {
      return `It's 75 degrees and sunny in ${city}.`;
    },
    {
      name: "get_weather",
      description: "Get weather information for a city.",
      schema: z.object({ city: z.string() }),
    }
  );

  const agent = createAgent({
    model: "gpt-4.1",
    tools: [getWeather]
  });

  const evaluator = createTrajectoryLLMAsJudge({
    model: "openai:o3-mini",
    prompt: TRAJECTORY_ACCURACY_PROMPT,
  });

  async function testTrajectoryQuality() {
    const result = await agent.invoke({
      messages: [new HumanMessage("What's the weather in Seattle?")]
    });

    const evaluation = await evaluator({
      outputs: result.messages,
    });
    // {
    //     'key': 'trajectory_accuracy',
    //     'score': true,
    //     'comment': 'The provided agent trajectory is reasonable...'
    // }
    expect(evaluation.score).toBe(true);
  }
  ```
</Accordion>

<Accordion title="有参考轨迹">
  如果您有参考轨迹，您可以向提示词添加额外的变量并传入参考轨迹。下面，我们使用预构建的 `TRAJECTORY_ACCURACY_PROMPT_WITH_REFERENCE` 提示词并配置 `reference_outputs` 变量：

  ```ts
  import { TRAJECTORY_ACCURACY_PROMPT_WITH_REFERENCE } from "agentevals";

  const evaluator = createTrajectoryLLMAsJudge({
    model: "openai:o3-mini",
    prompt: TRAJECTORY_ACCURACY_PROMPT_WITH_REFERENCE,
  });

  const evaluation = await evaluator({
    outputs: result.messages,
    referenceOutputs: referenceTrajectory,
  });
  ```
</Accordion>

<Info>
  有关 LLM 如何评估轨迹的更多可配置性，请访问 [仓库](https://github.com/langchain-ai/agentevals?tab=readme-ov-file#trajectory-llm-as-judge)。
</Info>

## LangSmith 集成

为了随时间推移跟踪实验，您可以将评估器结果记录到 [LangSmith](https://smith.langchain.com/)，这是一个用于构建生产级 LLM 应用程序的平台，包括跟踪、评估和实验工具。

首先，通过设置所需的环境变量来设置 LangSmith：

```bash
export LANGSMITH_API_KEY="your_langsmith_api_key"
export LANGSMITH_TRACING="true"
```

LangSmith 提供了两种运行评估的主要方法：[Vitest/Jest](/langsmith/vitest-jest) 集成和 `evaluate` 函数。

<Accordion title="使用 vitest/jest 集成">
  ```ts
  import * as ls from "langsmith/vitest";
  // import * as ls from "langsmith/jest";

  import { createTrajectoryLLMAsJudge, TRAJECTORY_ACCURACY_PROMPT } from "agentevals";

  const trajectoryEvaluator = createTrajectoryLLMAsJudge({
    model: "openai:o3-mini",
    prompt: TRAJECTORY_ACCURACY_PROMPT,
  });

  ls.describe("trajectory accuracy", () => {
    ls.test("accurate trajectory", {
      inputs: {
        messages: [
          {
            role: "user",
            content: "What is the weather in SF?"
          }
        ]
      },
      referenceOutputs: {
        messages: [
          new HumanMessage("What is the weather in SF?"),
          new AIMessage({
            content: "",
            tool_calls: [
              { id: "call_1", name: "get_weather", args: { city: "SF" } }
            ]
          }),
          new ToolMessage({
            content: "It's 75 degrees and sunny in SF.",
            tool_call_id: "call_1"
          }),
          new AIMessage("The weather in SF is 75 degrees and sunny."),
        ],
      },
    }, async ({ inputs, referenceOutputs }) => {
      const result = await agent.invoke({
        messages: [new HumanMessage("What is the weather in SF?")]
      });

      ls.logOutputs({ messages: result.messages });

      await trajectoryEvaluator({
        inputs,
        outputs: result.messages,
        referenceOutputs,
      });
    });
  });
  ```

  使用您的测试运行器运行评估：

  ```bash
  vitest run test_trajectory.eval.ts
  # or
  jest test_trajectory.eval.ts
  ```
</Accordion>

<Accordion title="使用 evaluate 函数">
  或者，您可以在 LangSmith 中创建一个数据集并使用 `evaluate` 函数：

  ```ts
  import { evaluate } from "langsmith/evaluation";
  import { createTrajectoryLLMAsJudge, TRAJECTORY_ACCURACY_PROMPT } from "agentevals";

  const trajectoryEvaluator = createTrajectoryLLMAsJudge({
    model: "openai:o3-mini",
    prompt: TRAJECTORY_ACCURACY_PROMPT,
  });

  async function runAgent(inputs: any) {
    const result = await agent.invoke(inputs);
    return result.messages;
  }

  await evaluate(
    runAgent,
    {
      data: "your_dataset_name",
      evaluators: [trajectoryEvaluator],
    }
  );
  ```

  结果将自动记录到 LangSmith。
</Accordion>

<Tip>
  要了解有关评估您的智能体的更多信息，请参阅 [LangSmith 文档](/langsmith/vitest-jest)。
</Tip>
