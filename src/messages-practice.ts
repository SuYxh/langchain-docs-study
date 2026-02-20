import "dotenv/config";
import {
  SystemMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatOpenAI({
  model: "deepseek/deepseek-v3.2-251201",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const getWeather = tool(
  (input) => {
    const weatherData: Record<string, string> = {
      paris: "18°C, Sunny with light breeze",
      tokyo: "25°C, Clear skies",
      beijing: "22°C, Partly cloudy",
      shanghai: "20°C, Light rain",
    };
    const city = input.city.toLowerCase();
    return weatherData[city] || `Weather data not available for ${input.city}`;
  },
  {
    name: "get_weather",
    description: "Get the current weather for a given city",
    schema: z.object({
      city: z.string().describe("The city name"),
    }),
  }
);

async function example1_BasicMessageTypes() {
  console.log("\n=== Example 1: Basic Message Types ===\n");

  const systemMsg = new SystemMessage(
    "You are a helpful assistant that speaks concisely."
  );
  const humanMsg = new HumanMessage("What is TypeScript?");

  const messages = [systemMsg, humanMsg];
  const response = await model.invoke(messages);

  console.log("System:", systemMsg.content);
  console.log("Human:", humanMsg.content);
  console.log("AI Response:", response.content);
}

async function example2_TextPrompt() {
  console.log("\n=== Example 2: Text Prompt (Simple) ===\n");

  const response = await model.invoke("Write a haiku about programming");
  console.log("Haiku:\n", response.content);
}

async function example3_DictionaryFormat() {
  console.log("\n=== Example 3: Dictionary Format ===\n");

  const messages = [
    { role: "system" as const, content: "You are a poetry expert." },
    { role: "user" as const, content: "What makes a good haiku?" },
    { role: "assistant" as const, content: "A good haiku follows the 5-7-5 syllable pattern and captures a moment in nature." },
    { role: "user" as const, content: "Can you give me an example?" },
  ];

  const response = await model.invoke(messages);
  console.log("Response:", response.content);
}

async function example4_MultiTurnConversation() {
  console.log("\n=== Example 4: Multi-Turn Conversation ===\n");

  const messages = [
    new SystemMessage("You are a helpful math tutor."),
    new HumanMessage("What is 2 + 2?"),
    new AIMessage("2 + 2 equals 4."),
    new HumanMessage("Now multiply that by 3"),
  ];

  const response = await model.invoke(messages);
  console.log("Conversation result:", response.content);
}

async function example5_MessageWithMetadata() {
  console.log("\n=== Example 5: Message with Metadata ===\n");

  const humanMsg = new HumanMessage({
    content: "Hello!",
    name: "alice",
    id: "msg_001",
  });

  console.log("Message content:", humanMsg.content);
  console.log("Message name:", humanMsg.name);
  console.log("Message id:", humanMsg.id);

  const response = await model.invoke([humanMsg]);
  console.log("Response:", response.content);
}

async function example6_AIMessageProperties() {
  console.log("\n=== Example 6: AIMessage Properties ===\n");

  const response = await model.invoke("Say hello in 3 languages");

  console.log("Content:", response.content);
  console.log("Message ID:", response.id);
  console.log("Usage Metadata:", response.usage_metadata);
  console.log("Response Metadata:", JSON.stringify(response.response_metadata, null, 2));
}

async function example7_ToolCalling() {
  console.log("\n=== Example 7: Tool Calling ===\n");

  const modelWithTools = model.bindTools([getWeather]);
  const response = await modelWithTools.invoke("What's the weather in Paris?");

  console.log("Content:", response.content);
  console.log("Tool Calls:", JSON.stringify(response.tool_calls, null, 2));
}

async function example8_ToolMessageWorkflow() {
  console.log("\n=== Example 8: Tool Message Workflow ===\n");

  const aiMessage = new AIMessage({
    content: "",
    tool_calls: [
      {
        name: "get_weather",
        args: { city: "Tokyo" },
        id: "call_abc123",
      },
    ],
  });

  const toolResult = getWeather.invoke({ city: "Tokyo" });
  const toolMessage = new ToolMessage({
    content: await toolResult,
    tool_call_id: "call_abc123",
    name: "get_weather",
  });

  const messages = [
    new SystemMessage("You are a helpful weather assistant."),
    new HumanMessage("What's the weather in Tokyo?"),
    aiMessage,
    toolMessage,
  ];

  const response = await model.invoke(messages);
  console.log("Final Response:", response.content);
}

async function example9_DetailedPersona() {
  console.log("\n=== Example 9: Detailed System Persona ===\n");

  const systemMsg = new SystemMessage(`
You are a senior TypeScript developer with expertise in web frameworks.
Always provide code examples and explain your reasoning.
Be concise but thorough in your explanations.
`);

  const messages = [
    systemMsg,
    new HumanMessage("How do I define a typed function in TypeScript?"),
  ];

  const response = await model.invoke(messages);
  console.log("Expert Response:\n", response.content);
}

async function example10_InsertAIMessage() {
  console.log("\n=== Example 10: Inserting AI Message in History ===\n");

  const messages = [
    new SystemMessage("You are a helpful assistant"),
    new HumanMessage("Can you help me?"),
    new AIMessage("I'd be happy to help you with that question!"),
    new HumanMessage("Great! What's 10 * 5?"),
  ];

  const response = await model.invoke(messages);
  console.log("Response:", response.content);
}

async function main() {
  try {
    await example1_BasicMessageTypes();
    await example2_TextPrompt();
    await example3_DictionaryFormat();
    await example4_MultiTurnConversation();
    await example5_MessageWithMetadata();
    await example6_AIMessageProperties();
    await example7_ToolCalling();
    await example8_ToolMessageWorkflow();
    await example9_DetailedPersona();
    await example10_InsertAIMessage();

    console.log("\n=== All examples completed! ===\n");
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
