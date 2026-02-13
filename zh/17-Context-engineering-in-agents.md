# 上下文工程 (Context Engineering)

上下文工程是构建有效 Agent 的关键部分。它涉及如何向模型呈现信息以引导其行为。

## 提示词工程 (Prompt Engineering)

这是最直接的上下文形式。通过系统消息或特定的用户指令，您可以定义 Agent 的角色、目标和约束。

```typescript
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// 定义系统消息以设定行为
const systemMessage = new SystemMessage(
  "你是一个乐于助人的助手。请始终用简洁的要点回答。"
);

const humanMessage = new HumanMessage("解释一下量子计算。");

const messages = [systemMessage, humanMessage];
```

## 动态上下文

在复杂的 Agent 中，上下文不仅仅是静态的提示词。它通常包括：

1.  **对话历史**：之前的消息交换。
2.  **工具输出**：执行工具调用的结果。
3.  **检索到的文档**：来自 RAG（检索增强生成）系统的相关信息。
4.  **状态**：Agent 当前的状态变量（在 LangGraph 中定义）。

### 示例：向状态添加上下文

在 LangGraph 中，您可以设计状态模式来保存和管理这些上下文信息。

```typescript
import { Annotation } from "@langchain/langgraph";

// 定义包含特定上下文信息的状态
const GraphState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
  // 存储检索到的文档
  context: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
  }),
  // 存储用户偏好
  userPreferences: Annotation<Record<string, any>>({
    reducer: (x, y) => ({ ...x, ...y }),
  }),
});
```

通过精心设计状态，您可以确保 Agent 在每一步都能访问做出明智决策所需的所有信息。
