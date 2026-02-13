import "dotenv/config";
import { createAgent, tool } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const getWeather = tool(
  (input) => {
    const weatherData: Record<string, string> = {
      tokyo: "25°C, sunny",
      beijing: "18°C, cloudy",
      shanghai: "22°C, rainy",
      new_york: "15°C, windy",
    };
    const city = input.city.toLowerCase().replace(" ", "_");
    return weatherData[city] || `Weather data not available for ${input.city}`;
  },
  {
    name: "get_weather",
    description: "Get the current weather for a given city",
    schema: z.object({
      city: z.string().describe("The city name to get the weather for"),
    }),
  }
);

const model = new ChatOpenAI({
  model: "deepseek/deepseek-v3.2-251201",
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

const agent = createAgent({
  model,
  tools: [getWeather],
});

async function main() {
  const result = await agent.invoke({
    messages: [{ role: "user", content: "What's the weather in Tokyo?" }],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  console.log("Agent Response:", lastMessage.content);
}

main().catch(console.error);
