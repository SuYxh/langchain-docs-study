import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { agent } from "./agent.js";
import { contentCreatorGraph } from "./contentCreator.js";
import { AIMessage, HumanMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";

const app = express();
const PORT = 2024;

app.use(cors());
app.use(express.json());

const threadStates = new Map<string, { messages: unknown[]; checkpoint: unknown }>();

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.get("/assistants/:assistantId", (req, res) => {
  res.json({
    assistant_id: req.params.assistantId,
    name: "Tool Calling Agent",
    graph_id: "agent",
    config: {},
    metadata: {},
  });
});

app.post("/threads", (_, res) => {
  const threadId = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  res.json({ thread_id: threadId });
});

app.get("/threads/:threadId/state", async (req, res) => {
  const { threadId } = req.params;
  try {
    const state = await agent.getState({ configurable: { thread_id: threadId } }) as {
      values?: { messages?: BaseMessage[] };
      next?: string[];
      tasks?: unknown[];
    };
    const checkpoint = {
      checkpoint_id: `cp_${Date.now()}`,
      thread_id: threadId,
    };
    res.json({
      values: state?.values || { messages: [] },
      next: state?.next || [],
      tasks: state?.tasks || [],
      metadata: {},
      created_at: new Date().toISOString(),
      checkpoint,
    });
  } catch {
    res.json({
      values: { messages: [] },
      next: [],
      tasks: [],
      metadata: {},
      created_at: new Date().toISOString(),
      checkpoint: { checkpoint_id: `cp_${Date.now()}`, thread_id: threadId },
    });
  }
});

app.post("/threads/:threadId/history", async (req, res) => {
  const { threadId } = req.params;
  const cached = threadStates.get(threadId);
  if (cached) {
    res.json([
      {
        values: { messages: cached.messages },
        next: [],
        tasks: [],
        metadata: {},
        created_at: new Date().toISOString(),
        checkpoint: cached.checkpoint,
        parent_checkpoint: null,
      },
    ]);
  } else {
    res.json([]);
  }
});

app.get("/threads/:threadId", (req, res) => {
  res.json({
    thread_id: req.params.threadId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    metadata: {},
    status: "idle",
    values: { messages: [] },
  });
});

function serializeMessage(msg: BaseMessage): Record<string, unknown> {
  if (msg instanceof HumanMessage) {
    return {
      type: "human",
      id: msg.id,
      content: msg.content,
    };
  }
  if (msg instanceof AIMessage) {
    return {
      type: "ai",
      id: msg.id,
      content: msg.content,
      tool_calls: msg.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.name,
        args: tc.args,
      })),
    };
  }
  if (msg instanceof ToolMessage) {
    return {
      type: "tool",
      id: msg.id,
      content: msg.content,
      tool_call_id: msg.tool_call_id,
    };
  }
  return {
    type: msg.getType(),
    id: msg.id,
    content: msg.content,
  };
}

function serializeStreamMessage(msg: BaseMessage): Record<string, unknown> {
  const msgType = msg.getType();

  if (msgType === "human") {
    return {
      type: "human",
      content: msg.content,
      id: msg.id,
    };
  }

  if (msgType === "ai") {
    const aiMsg = msg as AIMessage;
    return {
      type: "ai",
      content: aiMsg.content,
      id: aiMsg.id,
      tool_calls: aiMsg.tool_calls?.map((tc) => ({
        id: tc.id,
        name: tc.name,
        args: tc.args,
      })),
    };
  }

  if (msgType === "tool") {
    const toolMsg = msg as ToolMessage;
    return {
      type: "tool",
      content: toolMsg.content,
      id: toolMsg.id,
      tool_call_id: toolMsg.tool_call_id,
    };
  }

  return {
    type: msgType,
    content: msg.content,
    id: msg.id,
  };
}

app.post("/threads/:threadId/runs/stream", async (req: Request, res: Response) => {
  let threadId = req.params.threadId;
  if (!threadId || threadId === "undefined") {
    threadId = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  const { input } = req.body;

  console.log(`[${new Date().toISOString()}] Stream request:`, {
    threadId,
    input: JSON.stringify(input).slice(0, 100),
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Content-Location", `/threads/${threadId}/runs/run_${Date.now()}`);
  res.flushHeaders();

  const runId = `run_${Date.now()}`;
  const checkpointId = `cp_${Date.now()}`;

  try {
    res.write(`event: metadata\ndata: ${JSON.stringify({ run_id: runId, thread_id: threadId })}\n\n`);

    const stream = await agent.stream(input, {
      configurable: { thread_id: threadId },
      streamMode: "messages",
    });

    for await (const [message, metadata] of stream) {
      const serialized = serializeStreamMessage(message);
      res.write(`event: messages\ndata: ${JSON.stringify([serialized, metadata])}\n\n`);
    }

    const finalState = await agent.getState({ configurable: { thread_id: threadId } }) as {
      values?: { messages?: BaseMessage[] };
    } | undefined;
    const messages = finalState?.values?.messages || [];
    const serializedMessages = messages.map(serializeMessage);

    const checkpoint = {
      checkpoint_id: checkpointId,
      thread_id: threadId,
    };

    threadStates.set(threadId, { messages: serializedMessages, checkpoint });

    res.write(
      `event: values\ndata: ${JSON.stringify({
        messages: serializedMessages,
      })}\n\n`
    );

    res.write(`event: end\ndata: {}\n\n`);
  } catch (error) {
    console.error("Stream error:", error);
    res.write(
      `event: error\ndata: ${JSON.stringify({
        error: "StreamError",
        message: error instanceof Error ? error.message : "Unknown error",
      })}\n\n`
    );
  } finally {
    res.end();
  }
});

app.post("/threads/:threadId/runs", async (req, res) => {
  const { threadId } = req.params;
  const { input } = req.body;

  try {
    const result = await agent.invoke(input, {
      configurable: { thread_id: threadId },
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const contentCreatorThreadStates = new Map<string, { messages: unknown[]; checkpoint: unknown }>();

app.get("/assistants/content-creator", (req, res) => {
  res.json({
    assistant_id: "content-creator",
    name: "Content Creator Multi-Agent",
    graph_id: "content-creator",
    config: {},
    metadata: {},
  });
});

app.get("/threads/:threadId/state/content-creator", async (req, res) => {
  const { threadId } = req.params;
  try {
    const state = await contentCreatorGraph.getState({ configurable: { thread_id: threadId } });
    const checkpoint = {
      checkpoint_id: `cp_${Date.now()}`,
      thread_id: threadId,
    };
    res.json({
      values: state.values || { messages: [] },
      next: state.next || [],
      tasks: state.tasks || [],
      metadata: {},
      created_at: new Date().toISOString(),
      checkpoint,
    });
  } catch {
    res.json({
      values: { messages: [] },
      next: [],
      tasks: [],
      metadata: {},
      created_at: new Date().toISOString(),
      checkpoint: { checkpoint_id: `cp_${Date.now()}`, thread_id: threadId },
    });
  }
});

app.post("/threads/:threadId/runs/stream/content-creator", async (req: Request, res: Response) => {
  let threadId = req.params.threadId;
  if (!threadId || threadId === "undefined") {
    threadId = `thread_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  const { input } = req.body;

  console.log(`[${new Date().toISOString()}] Content Creator stream request:`, {
    threadId,
    input: JSON.stringify(input).slice(0, 100),
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Content-Location", `/threads/${threadId}/runs/run_${Date.now()}`);
  res.flushHeaders();

  const runId = `run_${Date.now()}`;
  const checkpointId = `cp_${Date.now()}`;

  try {
    res.write(`event: metadata\ndata: ${JSON.stringify({ run_id: runId, thread_id: threadId })}\n\n`);

    const stream = await contentCreatorGraph.stream(input, {
      configurable: { thread_id: threadId },
      streamMode: "updates",
    });

    for await (const update of stream) {
      for (const [nodeName, nodeOutput] of Object.entries(update)) {
        const output = nodeOutput as {
          messages?: BaseMessage[];
          currentStage?: string;
          agentName?: string;
          researchReport?: string;
          articleDraft?: string;
          reviewResult?: string;
          finalArticle?: string;
        };

        if (output.messages && output.messages.length > 0) {
          for (const msg of output.messages) {
            const serialized = {
              ...serializeStreamMessage(msg),
              langgraph_node: nodeName,
              agent_name: output.agentName || nodeName,
            };
            res.write(`event: messages\ndata: ${JSON.stringify([serialized, {
              langgraph_node: nodeName,
              agent_name: output.agentName || nodeName,
            }])}\n\n`);
          }
        }

        res.write(`event: updates\ndata: ${JSON.stringify({
          [nodeName]: {
            currentStage: output.currentStage,
            agentName: output.agentName,
            researchReport: output.researchReport,
            articleDraft: output.articleDraft,
            reviewResult: output.reviewResult,
            finalArticle: output.finalArticle,
          }
        })}\n\n`);
      }
    }

    const finalState = await contentCreatorGraph.getState({ configurable: { thread_id: threadId } });
    const stateValues = finalState.values as {
      messages?: BaseMessage[];
      currentStage?: string;
      researchReport?: string;
      articleDraft?: string;
      reviewResult?: string;
      finalArticle?: string;
    };
    
    const messages = stateValues?.messages || [];
    const serializedMessages = messages.map(serializeMessage);

    const checkpoint = {
      checkpoint_id: checkpointId,
      thread_id: threadId,
    };

    contentCreatorThreadStates.set(threadId, { messages: serializedMessages, checkpoint });

    res.write(
      `event: values\ndata: ${JSON.stringify({
        messages: serializedMessages,
        currentStage: stateValues.currentStage,
        researchReport: stateValues.researchReport,
        articleDraft: stateValues.articleDraft,
        reviewResult: stateValues.reviewResult,
        finalArticle: stateValues.finalArticle,
      })}\n\n`
    );

    res.write(`event: end\ndata: {}\n\n`);
  } catch (error) {
    console.error("Content Creator stream error:", error);
    res.write(
      `event: error\ndata: ${JSON.stringify({
        error: "StreamError",
        message: error instanceof Error ? error.message : "Unknown error",
      })}\n\n`
    );
  } finally {
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 LangGraph Server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Content Creator: http://localhost:${PORT}/threads/:threadId/runs/stream/content-creator\n`);
});
