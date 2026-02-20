> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用此文件来发现所有可用页面。

# 技能

> 了解如何通过技能扩展你的深度智能体能力

技能是可复用的智能体能力，用于提供专门化工作流与领域知识。

你可以使用 [Agent Skills](https://agentskills.io/) 为你的深度智能体提供新的能力与专业知识。

Deep agent 技能遵循 [Agent Skills 规范](https://agentskills.io/specification)。

## 什么是技能

技能是一组目录（文件夹）的集合，其中每个文件夹包含一个或多个文件，这些文件提供智能体可使用的上下文：

* 一个包含技能指令与元数据的 `SKILL.md` 文件
* 额外脚本（可选）
* 额外参考信息（例如文档，可选）
* 额外资源（例如模板与其他资源，可选）

<Note>
  任何额外资源（脚本、文档、模板或其他资源）都必须在 `SKILL.md` 文件中被引用，并说明该文件包含什么以及如何使用它，以便智能体能决定何时使用这些资源。
</Note>

## 技能如何工作

当你创建深度智能体时，可以传入一个包含技能的目录列表。智能体启动时，会读取每个 `SKILL.md` 文件 frontmatter 中的内容。

当智能体收到提示词时，它会检查在完成该提示词的过程中是否可以使用任何技能。如果找到了匹配的提示词，它随后会读取该技能的其余文件。仅在需要时才读取技能信息的这种模式称为*渐进式披露（progressive disclosure）*。

## 示例

你可能有一个 skills 文件夹，其中包含一个以某种方式使用文档站点的技能，以及另一个用于搜索研究论文 arXiv 预印本仓库的技能：

```plaintext  theme={null}
    skills/
    ├── langgraph-docs
    │   └── SKILL.md
    └── arxiv_search
        ├── SKILL.md
        └── arxiv_search.ts # 用于搜索 arXiv 的代码
```

`SKILL.md` 文件始终遵循相同的模式：先在 frontmatter 中给出元数据，然后给出技能指令。

下面示例展示了一个技能：当收到提示时，提供如何给出相关 LangGraph 文档的指令：

```md  theme={null}
---
name: langgraph-docs
description: 当请求与 LangGraph 相关时使用该技能，以获取相关文档，从而提供准确、最新的指导。
---

# langgraph-docs

## 概览

该技能解释了如何访问 LangGraph Python 文档，以帮助回答问题并指导实现。

## 指令

### 1. 获取文档索引

使用 fetch_url 工具读取以下 URL：
https://docs.langchain.com/llms.txt

它会提供一份结构化的可用文档列表及其描述。

### 2. 选择相关文档

根据问题，从索引中识别 2-4 个最相关的文档 URL。优先选择：

- 面向实现问题的具体操作指南（how-to）
- 用于理解问题的核心概念页面
- 端到端示例教程
- 用于 API 细节的参考文档

### 3. 获取所选文档

使用 fetch_url 工具读取所选文档 URL。

### 4. 提供准确指导

在阅读文档后，完成用户的请求。
```

更多示例技能请参阅 [Deep Agent 示例技能](https://github.com/langchain-ai/deepagentsjs/tree/main/examples/skills)。

<Warning>
  **重要**

  有关编写技能文件的约束与最佳实践，请参阅完整的 [Agent Skills 规范](https://agentskills.io/specification)。特别需要注意：

  * 若 `description` 字段超过 1024 个字符，将被截断为 1024 个字符。
  * 在 Deep Agents 中，`SKILL.md` 文件必须小于 10 MB。超过此限制的文件会在技能加载期间被跳过。
</Warning>

### 完整示例

以下示例展示了一个使用全部可用 frontmatter 字段的 `SKILL.md` 文件：

```md expandable theme={null}
---
name: langgraph-docs
description: 当请求与 LangGraph 相关时使用该技能，以获取相关文档，从而提供准确、最新的指导。
license: MIT
compatibility: 需要联网以获取文档 URL
metadata:
  author: langchain
  version: "1.0"
allowed-tools: fetch_url
---

# langgraph-docs

## 概览

该技能解释了如何访问 LangGraph Python 文档，以帮助回答问题并指导实现。

## 指令

### 1. 获取文档索引

使用 fetch_url 工具读取以下 URL：
https://docs.langchain.com/llms.txt

它会提供一份结构化的可用文档列表及其描述。

### 2. 选择相关文档

根据问题，从索引中识别 2-4 个最相关的文档 URL。优先选择：

- 面向实现问题的具体操作指南（how-to）
- 用于理解问题的核心概念页面
- 端到端示例教程
- 用于 API 细节的参考文档

### 3. 获取所选文档

使用 fetch_url 工具读取所选文档 URL。

### 4. 提供准确指导

在阅读文档后，完成用户的请求。
```

## 用法

在创建深度智能体时传入 skills 目录：

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
      // IMPORTANT: deepagents 的技能源路径是虚拟（POSIX）路径，且相对于 backend 根目录。
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
            content: "什么是 LangGraph？如果可用，请使用 langgraph-docs 技能。",
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
      // IMPORTANT: deepagents 的技能源路径是虚拟（POSIX）路径，且相对于 backend 根目录。
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
            content: "什么是 LangGraph？如果可用，请使用 langgraph-docs 技能。",
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
            content: "什么是 LangGraph？如果可用，请使用 langgraph-docs 技能。",
          },
        ],
      },
      config,
    );
    ```
  </Tab>
</Tabs>

<ParamField body="skills" type="list[str]" optional>
  技能源路径列表。

  路径必须使用正斜杠指定，并且相对于 backend 的根目录。

  * 当使用 `StateBackend`（默认）时，通过 `invoke(files={...})` 提供技能文件。
  * 使用 `FilesystemBackend` 时，技能会从磁盘加载，路径相对于 backend 的 `root_dir`。

  当多个来源中存在同名技能时，后面的来源会覆盖前面的来源（最后一个生效）。
</ParamField>

## 来源优先级

当多个技能来源包含同名技能时，`skills` 数组中靠后的来源具有更高优先级（最后一个生效）。这使你可以将来自不同来源的技能进行叠加。

```typescript  theme={null}
// 如果两个来源都包含名为 "web-search" 的技能，
// 则 "/skills/project/" 中的那个会生效（最后加载）。
const agent = await createDeepAgent({
  skills: ["/skills/user/", "/skills/project/"],
  ...
});
```

## 子智能体的技能

当你使用[子智能体](/oss/javascript/deepagents/subagents)时，可以配置每种类型可访问的技能：

* **通用子智能体**：当你向 `create_deep_agent` 传入 `skills` 时，会自动继承主智能体的技能；无需额外配置。
* **自定义子智能体**：不会继承主智能体的技能。请在每个子智能体定义中添加 `skills` 参数，以指定该子智能体的技能源路径。

技能状态完全隔离：主智能体的技能对子智能体不可见，子智能体的技能对主智能体也不可见。

```typescript  theme={null}
const researchSubagent = {
  name: "researcher",
  description: "具备专门化技能的研究助手",
  systemPrompt: "你是一名研究员。",
  tools: [webSearch],
  skills: ["/skills/research/", "/skills/web-search/"],  // 子智能体专属技能
};

const agent = await createDeepAgent({
  model: "claude-sonnet-4-5-20250929",
  skills: ["/skills/main/"],  // 主智能体与通用子智能体会获得这些技能
  subagents: [researchSubagent],  // researchSubagent 仅获得自己的技能
});
```

有关子智能体配置与技能继承的更多信息，请参阅[子智能体](/oss/javascript/deepagents/subagents)。

## 智能体看到什么

当配置了技能后，系统提示词中会注入一个 “Skills System” 部分。智能体会使用该信息遵循三步流程：

1. **匹配（Match）**——当用户提示词到达时，智能体检查是否有任何技能的描述与任务匹配。
2. **读取（Read）**——若某技能适用，智能体会使用其技能列表中显示的路径读取完整 `SKILL.md` 文件。
3. **执行（Execute）**——智能体遵循技能指令，并按需访问任何支撑文件（脚本、模板、参考文档等）。

<Tip>
  在你的 `SKILL.md` frontmatter 中编写清晰、具体的描述。智能体仅基于描述来决定是否使用某个技能——越具体的描述越有利于技能匹配。
</Tip>

## 技能 vs. 记忆

技能与[记忆](/oss/javascript/deepagents/customization#memory)（`AGENTS.md` 文件）服务于不同目的：

| | 技能 | 记忆 |
| --- | --- | --- |
| **目的** | 通过渐进式披露发现的按需能力 | 启动时始终加载的持久化上下文 |
| **加载方式** | 仅当智能体判断相关时才读取 | 始终注入系统提示词 |
| **格式** | 命名目录中的 `SKILL.md` | `AGENTS.md` 文件 |
| **分层** | 用户 → 项目（最后一个生效） | 用户 → 项目（合并） |
| **适用场景** | 指令是任务特定且可能较大 | 上下文始终相关（项目约定、偏好） |

## 何时使用技能与工具

以下是一些使用工具与技能的通用指导原则：

* 当上下文较多、希望减少系统提示词 token 数量时，使用技能。
* 使用技能将多个能力打包为更大的动作，并提供超出单个工具描述的额外上下文。
* 如果智能体无法访问文件系统，则使用工具。

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/skills.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[这些文档](/use-these-docs)连接到 Claude、VSCode 等，以获得实时答案。
</Callout>
