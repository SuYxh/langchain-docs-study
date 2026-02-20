import { Annotation, StateGraph, MemorySaver } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { MessagesAnnotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SkillInfo {
  name: string;
  displayName: string;
  description: string;
  icon: string;
}

const skillsDir = path.resolve(__dirname, "../../skills");

interface SkillFrontmatter {
  name: string;
  description: string;
  metadata?: {
    author?: string;
    version?: string;
    icon?: string;
    "display-name"?: string;
  };
}

function parseSkillFile(content: string): { frontmatter: SkillFrontmatter; body: string } | null {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return null;
  }

  const yamlContent = match[1];
  const body = match[2];

  const frontmatter: SkillFrontmatter = {
    name: "",
    description: "",
  };

  const lines = yamlContent.split("\n");
  let inMetadata = false;
  const metadata: Record<string, string> = {};

  for (const line of lines) {
    if (line.startsWith("metadata:")) {
      inMetadata = true;
      continue;
    }

    if (inMetadata && line.startsWith("  ")) {
      const metaMatch = line.match(/^\s+([^:]+):\s*"?([^"]*)"?$/);
      if (metaMatch) {
        metadata[metaMatch[1].trim()] = metaMatch[2].trim();
      }
    } else {
      inMetadata = false;
      const keyValueMatch = line.match(/^([^:]+):\s*(.*)$/);
      if (keyValueMatch) {
        const key = keyValueMatch[1].trim();
        const value = keyValueMatch[2].trim().replace(/^["']|["']$/g, "");
        if (key === "name") frontmatter.name = value;
        if (key === "description") frontmatter.description = value;
      }
    }
  }

  frontmatter.metadata = metadata as SkillFrontmatter["metadata"];
  return { frontmatter, body };
}

function discoverSkills(): SkillInfo[] {
  const skills: SkillInfo[] = [];
  
  try {
    const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
        if (fs.existsSync(skillPath)) {
          const content = fs.readFileSync(skillPath, "utf-8");
          const parsed = parseSkillFile(content);
          
          if (parsed) {
            skills.push({
              name: parsed.frontmatter.name,
              displayName: parsed.frontmatter.metadata?.["display-name"] || parsed.frontmatter.name,
              description: parsed.frontmatter.description,
              icon: parsed.frontmatter.metadata?.icon || "📦",
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error discovering skills:", error);
  }
  
  return skills;
}

export const availableSkills: SkillInfo[] = discoverSkills();

function loadSkillContent(skillName: string): string | null {
  const skillPath = path.join(skillsDir, skillName, "SKILL.md");
  try {
    if (fs.existsSync(skillPath)) {
      const content = fs.readFileSync(skillPath, "utf-8");
      const parsed = parseSkillFile(content);
      return parsed ? parsed.body : content;
    }
    return null;
  } catch (error) {
    console.error(`Error loading skill ${skillName}:`, error);
    return null;
  }
}

const loadSkillTool = tool(
  async ({ skillName }: { skillName: string }) => {
    const content = loadSkillContent(skillName);
    if (!content) {
      return `Error: Skill "${skillName}" not found. Available skills: ${availableSkills.map(s => s.name).join(", ")}`;
    }
    return `Successfully loaded skill: ${skillName}\n\n---SKILL PROMPT START---\n${content}\n---SKILL PROMPT END---\n\nYou are now operating with the "${skillName}" skill. Use the loaded prompt to guide your responses.`;
  },
  {
    name: "load_skill",
    description: "Load a specific skill to enhance the assistant's capabilities. Available skills: sql-expert, code-reviewer, doc-writer",
    schema: z.object({
      skillName: z.string().describe("The name of the skill to load (e.g., 'sql-expert', 'code-reviewer', 'doc-writer')"),
    }),
  }
);

const listSkillsTool = tool(
  async () => {
    const skillsList = availableSkills.map(skill => 
      `- ${skill.icon} **${skill.displayName}** (\`${skill.name}\`): ${skill.description}`
    ).join("\n");
    return `Available skills:\n${skillsList}`;
  },
  {
    name: "list_skills",
    description: "List all available skills that can be loaded",
    schema: z.object({}),
  }
);

const unloadSkillTool = tool(
  async () => {
    return "Skill unloaded successfully. You are now operating in general assistant mode.";
  },
  {
    name: "unload_skill",
    description: "Unload the current skill and return to general assistant mode. Use this when the user's question is not related to the current skill.",
    schema: z.object({}),
  }
);

const tools = [loadSkillTool, listSkillsTool, unloadSkillTool];
const toolNode = new ToolNode(tools);

const model = new ChatOpenAI({
  model: "deepseek/deepseek-v3.2-251201",
  temperature: 0.7,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
}).bindTools(tools);

const SkillsAssistantState = Annotation.Root({
  ...MessagesAnnotation.spec,
  currentSkill: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  skillPrompt: Annotation<string | null>({
    reducer: (_, b) => b,
    default: () => null,
  }),
  currentStage: Annotation<string>({
    reducer: (_, b) => b,
    default: () => "idle",
  }),
});

type SkillsAssistantStateType = typeof SkillsAssistantState.State;

const systemPrompt = `你是一个智能助手，拥有动态加载技能(Skills)的能力。

## 工作流程：
1. 当用户请求特定领域的帮助时，首先使用 \`list_skills\` 工具查看可用技能
2. 使用 \`load_skill\` 工具加载适合的技能
3. 加载技能后，按照技能提示的指导来回答用户问题
4. 当用户的问题明显与当前技能无关时，使用 \`unload_skill\` 卸载当前技能

## 可用技能：
- **sql-expert**: SQL 查询编写和优化
- **code-reviewer**: 代码审查和质量分析
- **doc-writer**: 技术文档撰写

## 注意事项：
- 如果用户问题涉及多个领域，可以先处理一个技能的内容，然后再加载另一个技能
- 加载技能后，你的回复应该遵循该技能定义的格式和规范
- 如果用户没有明确需要特定技能，可以使用通用知识回答
- 当用户话题转换到与当前技能无关的领域时，应主动卸载技能或切换到合适的技能`;

async function routeMessage(state: SkillsAssistantStateType) {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = (lastMessage as AIMessage)?.tool_calls;
  if (lastMessage && lastMessage._getType() === "ai" && toolCalls && toolCalls.length > 0) {
    return "tools";
  }
  return "__end__";
}

async function agentNode(state: SkillsAssistantStateType): Promise<Partial<SkillsAssistantStateType>> {
  const messages = [
    new SystemMessage(systemPrompt),
    ...state.messages,
  ];

  if (state.skillPrompt) {
    messages.splice(1, 0, new SystemMessage(`当前已加载技能:\n${state.skillPrompt}`));
  }

  const response = await model.invoke(messages);

  let newSkill = state.currentSkill;
  let newSkillPrompt = state.skillPrompt;

  if (response.tool_calls && response.tool_calls.length > 0) {
    for (const toolCall of response.tool_calls) {
      if (toolCall.name === "load_skill" && toolCall.args.skillName) {
        const skillContent = loadSkillContent(toolCall.args.skillName);
        if (skillContent) {
          newSkill = toolCall.args.skillName;
          newSkillPrompt = skillContent;
        }
      } else if (toolCall.name === "unload_skill") {
        newSkill = null;
        newSkillPrompt = null;
      }
    }
  }

  return {
    messages: [response],
    currentSkill: newSkill,
    skillPrompt: newSkillPrompt,
    currentStage: response.tool_calls && response.tool_calls.length > 0 ? "loading_skill" : "responding",
  };
}

async function toolsNode(state: SkillsAssistantStateType): Promise<Partial<SkillsAssistantStateType>> {
  const result = await toolNode.invoke(state);
  
  let newSkill = state.currentSkill;
  let newSkillPrompt = state.skillPrompt;

  const lastAiMessage = state.messages[state.messages.length - 1] as AIMessage;
  if (lastAiMessage.tool_calls) {
    for (const toolCall of lastAiMessage.tool_calls) {
      if (toolCall.name === "load_skill" && toolCall.args.skillName) {
        const skillContent = loadSkillContent(toolCall.args.skillName);
        if (skillContent) {
          newSkill = toolCall.args.skillName;
          newSkillPrompt = skillContent;
        }
      } else if (toolCall.name === "unload_skill") {
        newSkill = null;
        newSkillPrompt = null;
      }
    }
  }

  return {
    messages: result.messages,
    currentSkill: newSkill,
    skillPrompt: newSkillPrompt,
    currentStage: newSkill ? "skill_loaded" : "skill_unloaded",
  };
}

const checkpointer = new MemorySaver();

const workflow = new StateGraph(SkillsAssistantState)
  .addNode("agent", agentNode)
  .addNode("tools", toolsNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", routeMessage)
  .addEdge("tools", "agent");

export const skillsAssistantGraph = workflow.compile({ checkpointer });

export async function runSkillsAssistant(userMessage: string, threadId: string) {
  const result = await skillsAssistantGraph.invoke(
    { messages: [new HumanMessage(userMessage)] },
    { configurable: { thread_id: threadId } }
  );
  return result;
}
