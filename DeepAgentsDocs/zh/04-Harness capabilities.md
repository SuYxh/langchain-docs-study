> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用此文件来发现所有可用页面。

# 编排器能力

智能体编排器（agent harness）由若干不同能力组合而成，使构建长时间运行的智能体更容易：

* [规划能力](#planning-capabilities)
* [虚拟文件系统](#virtual-filesystem-access)
* [任务委派（子智能体）](#task-delegation-subagents)
* [上下文与 Token 管理](#context-management)
* [代码执行](#code-execution)
* [人类介入](#human-in-the-loop)

除上述能力外，deep agents 还使用[技能](#skills)与[记忆](#memory)来提供额外上下文与指令。

## <a id="planning-capabilities"></a> 规划能力

编排器提供了一个 `write_todos` 工具，智能体可用它维护结构化的任务列表。

**特性：**

* 使用状态（`'pending'`、`'in_progress'`、`'completed'`）跟踪多个任务
* 持久化存储于智能体状态中
* 帮助智能体组织复杂的多步骤工作
* 适用于长时间运行的任务与规划

## <a id="virtual-filesystem-access"></a> 虚拟文件系统访问

编排器提供一个可配置的虚拟文件系统，可由不同的可插拔后端支撑。
这些后端支持以下文件系统操作：

| 工具         | 描述                                                         |
| ------------ | ------------------------------------------------------------ |
| `ls`         | 列出目录下的文件及其元数据（大小、修改时间）                  |
| `read_file`  | 读取文件内容并附带行号，支持对大文件设置 offset/limit。也支持读取图片（`.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`），并将其作为多模态内容块返回。 |
| `write_file` | 创建新文件                                                   |
| `edit_file`  | 对文件执行精确字符串替换（支持全局替换模式）                  |
| `glob`       | 查找匹配模式的文件（例如 `**/*.py`）                          |
| `grep`       | 在文件内容中搜索，支持多种输出模式（仅文件、带上下文的内容，或计数） |
| `execute`    | 在环境中运行 Shell 命令（仅在[沙盒后端](/oss/javascript/deepagents/sandboxes)中可用） |

虚拟文件系统也被若干其他编排器能力使用，例如技能、记忆、代码执行与上下文管理。
在为 deep agents 构建自定义工具与中间件时，你也可以使用文件系统。

更多信息请参阅[后端](/oss/javascript/deepagents/backends)。

## <a id="task-delegation-subagents"></a> 任务委派（子智能体）

编排器允许主智能体创建临时的“子智能体”，用于执行隔离的多步骤任务。

**为什么有用：**

* **上下文隔离**：子智能体的工作不会污染主智能体的上下文
* **并行执行**：多个子智能体可并发运行
* **专门化**：子智能体可拥有不同的工具/配置
* **Token 效率**：较大的子任务上下文会被压缩为单个结果返回

**它如何工作：**

* 主智能体拥有一个 `task` 工具
* 调用后，会创建一个全新的智能体实例，并拥有独立上下文
* 子智能体会自主执行直至完成
* 仅向主智能体返回一份最终报告
* 子智能体是无状态的（无法向主智能体发送多条消息）

**默认子智能体：**

* 自动提供一个“通用”子智能体
* 默认包含文件系统工具
* 可通过附加工具/中间件进行自定义

**自定义子智能体：**

* 使用特定工具定义专用子智能体
* 示例：code-reviewer、web-researcher、test-runner
* 通过 `subagents` 参数进行配置

## <a id="context-management"></a> 上下文管理

Deep agents 可以通过有效的上下文管理来处理长时间运行的任务。

智能体可以访问多种类型的上下文。
其中一些来源会在启动时提供给智能体；另一些会在运行时出现，例如用户输入。

本节概述你的深度智能体可以访问并管理的不同类型上下文。

### 输入上下文

输入上下文由在启动时提供给深度智能体、并会被加入提示词中的信息来源构成。

#### 提示词

Deep agents 使用系统提示词来定义智能体的角色、行为、能力与知识库。
如果你提供了自定义系统提示词，它会被前置到内置系统提示词之前；内置系统提示词包含如何使用内置工具（如规划工具、文件系统工具与子智能体）的详细指导。

会添加工具的中间件（例如文件系统中间件）会自动将与工具相关的指令追加到系统提示词中，从而创建工具提示词，用于解释如何高效使用这些工具。

最终的深度智能体提示词由以下部分组成：

1. 自定义 system_prompt（若提供）
2. [基础智能体提示词](https://github.com/langchain-ai/deepagents/blob/595f6fe66bd974eaba9d429a76217607cb02f7a8/libs/deepagents/deepagents/graph.py#L36)
3. To-do 列表提示词：如何用待办列表进行规划的指令
4. 记忆提示词：AGENTS.md + 记忆使用指南（仅在提供 `memory` 时）
5. 技能提示词：技能位置 + 带 frontmatter 信息的技能列表 + 使用方式（仅在提供 skills 时）
6. 虚拟文件系统提示词（文件系统 + 如适用则包含 execute 工具文档）
7. 子智能体提示词：Task 工具用法
8. 用户提供的中间件提示词（若提供自定义中间件）
9. 人类介入提示词（当设置 `interrupt_on` 时）
10. 本地上下文提示词：当前目录、项目信息……（本地使用 CLI 时）

### 运行时上下文

Deep agents 使用一种称为上下文压缩（context compression）的模式：在保留与任务相关细节的同时，缩减智能体工作记忆中信息的规模。
以下技术是内置特性，用于确保传给 LLM 的上下文保持在其上下文窗口限制之内：

* [卸载大型工具输入与结果](#offloading-large-tool-inputs-and-results)
* [总结](#summarization)

你也可以将 deep agents 配置为使用[长期记忆](#long-term-memory)，使其能够跨不同线程与对话存储信息。

#### <a id="offloading-large-tool-inputs-and-results"></a> 卸载大型工具输入与结果

Deep agents 使用[内置文件系统工具](#virtual-filesystem-access)来自动卸载内容，并在需要时搜索与检索这些已卸载的内容。
内容卸载会在两种情况下发生：

1. **工具调用输入超过 20,000 个 Token**（可通过 `tool_token_limit_before_evict` 配置）：文件写入与编辑操作会在智能体对话历史中留下包含完整文件内容的工具调用。
   由于内容已被持久化到文件系统，这些历史往往是冗余的。
   当会话上下文跨过模型可用窗口的 85% 时，Deep agents 会截断更早的工具调用，用磁盘文件指针替换，从而降低活跃上下文的大小。

   <img src="https://qn.huat.xyz/mac/202602201648483.png" alt="一个卸载示例：展示将较大的输入保存到磁盘，并在工具调用中使用截断后的版本" data-og-width="1091" width="1091" data-og-height="814" height="814" data-path="oss/images/deepagents/offloading-inputs.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-inputs.png?w=280&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=544650b68280a6d91241bbfbdc613e81 280w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-inputs.png?w=560&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=5c93768e7d456633d690b9c9f24ad9d3 560w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-inputs.png?w=840&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=a8553da6f05aa7699cb084e25b12af23 840w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-inputs.png?w=1100&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=9f906ee84955a23c4e5be0df6ffa5c84 1100w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-inputs.png?w=1650&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=472f7567cae9a81b3c4fe79f91766d80 1650w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-inputs.png?w=2500&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=f45994d77cce0d734924e6763b6568c3 2500w" />

2. **工具调用结果超过 20,000 个 Token**（可通过 `tool_token_limit_before_evict` 配置）：当发生这种情况时，深度智能体会将响应卸载到配置的后端中，并用文件路径引用与前 10 行预览替换之。随后，智能体可按需重新读取或搜索该内容。

   <img src="https://qn.huat.xyz/mac/202602201648891.png" alt="一个卸载示例：展示将较大的工具响应替换为关于卸载结果位置的消息与结果前 10 行" data-og-width="1360" width="1360" data-og-height="922" height="922" data-path="oss/images/deepagents/offloading-results.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-results.png?w=280&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=4dabd620ea3ac3b5ba315d4137b43de3 280w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-results.png?w=560&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=afc65620e0a37a325fc886b44de819c1 560w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-results.png?w=840&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=c2a490f1318d7cb0e7e0330a9a970fb1 840w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-results.png?w=1100&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=c659515395a509db746d8e5f34717886 1100w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-results.png?w=1650&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=1614c8a3a5632e81d77a166a1414f99c 1650w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/offloading-results.png?w=2500&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=355a417f6404bc617a062d7f7f9907f1 2500w" />

#### <a id="summarization"></a> 总结

当上下文规模跨过模型的上下文窗口限制（例如 `max_input_tokens` 的 85%），且没有更多符合卸载条件的上下文时，深度智能体会对消息历史进行总结。

该过程包含两个组成部分：

* **上下文内总结**：LLM 生成对话的结构化总结——包括会话意图、已创建的产物以及下一步——并以此替换智能体工作记忆中的完整对话历史。
* **文件系统保全**：将完整、原始的对话消息写入文件系统，作为权威记录。

这种双重方式确保智能体通过总结维持对目标与进度的感知，同时也保留在需要时恢复具体细节的能力（通过文件系统搜索）。

<img src="https://qn.huat.xyz/mac/202602201648377.png" alt="一个总结示例：展示智能体的对话历史，其中若干步骤被压缩" data-og-width="1000" width="1000" data-og-height="587" height="587" data-path="oss/images/deepagents/summarization.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/summarization.png?w=280&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=e7259f3c8ca61e5329fbe7ae8d0eebed 280w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/summarization.png?w=560&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=184c0f8a43c2127a5356d07bfaa4ba27 560w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/summarization.png?w=840&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=1b572c3908e87a6003dbfe5d94e3172b 840w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/summarization.png?w=1100&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=88d8df1393ae90391e6813d6d83a63f8 1100w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/summarization.png?w=1650&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=7593561188db79b3dfb949dc19f6dd0d 1650w, https://mintcdn.com/langchain-5e9cc07a/0G7fpRWZQ2tFN1wL/oss/images/deepagents/summarization.png?w=2500&fit=max&auto=format&n=0G7fpRWZQ2tFN1wL&q=85&s=d0f14c6b93f20245dba5a3c83169ba37 2500w" />

**配置：**

* 触发条件为模型[模型画像](/oss/javascript/langchain/models#model-profiles)中的 `max_input_tokens` 的 85%
* 保留 10% 的 Token 作为近期上下文
* 若模型画像不可用，则回退为：170,000 Token 触发 / 保留 6 条消息
* 更早的消息由模型进行总结

**为什么有用：**

* 支持非常长的对话而不触及上下文限制
* 保留近期上下文，同时压缩久远历史
* 对智能体透明（表现为特殊的系统消息）

#### <a id="long-term-memory"></a> 长期记忆

使用默认文件系统时，你的深度智能体会将其工作记忆文件存储在智能体状态中，而该状态仅会在单个线程内持久化。
长期记忆使深度智能体能够跨不同线程与对话持久化信息。
要使用长期记忆，你必须使用一个 `CompositeBackend`，将特定路径（通常是 `/memories/`）路由到 LangGraph Store，从而提供可跨线程持久化的耐久存储。
`CompositeBackend` 是一种混合存储系统：部分文件会无限期持久化，而其他文件仍然限定在单个线程范围内。

智能体存储在长期记忆路径（例如 `/memories/preferences.txt`）下的文件，会在智能体重启后依然存在，并且可从任意对话线程访问。
Deep agents 可以使用这些文件存储用户偏好、累积知识、研究进度，或任何应超出单次会话而持久化的信息。

更多信息请参阅[长期记忆](/oss/javascript/deepagents/long-term-memory)。

## <a id="code-execution"></a> 代码执行

当你使用[沙盒后端](/oss/javascript/deepagents/sandboxes)时，编排器会暴露一个 `execute` 工具，使智能体能够在隔离环境中运行 Shell 命令。这使智能体可以在其任务过程中安装依赖、运行脚本与执行代码。

**它如何工作：**

* 沙盒后端实现 `SandboxBackendProtocol` —— 当被检测到时，编排器会将 `execute` 工具加入智能体可用工具
* 不使用沙盒后端时，智能体只拥有文件系统工具（`read_file`、`write_file` 等），无法运行命令
* `execute` 工具返回合并后的 stdout/stderr、退出码，并会截断较大输出（保存到文件中，供智能体增量读取）

**为什么有用：**

* **安全性**：代码在隔离环境中运行，保护宿主系统免受智能体操作影响
* **干净环境**：无需本地配置即可使用特定依赖或 OS 配置
* **可复现性**：团队间保持一致的执行环境

关于设置、提供商与文件传输 API，请参阅[沙盒](/oss/javascript/deepagents/sandboxes)。

## <a id="human-in-the-loop"></a> 人类介入

编排器可以在指定的工具调用处暂停智能体执行，以允许人类批准或修改。该特性通过 `interrupt_on` 参数选择性启用（opt-in）。

**配置：**

* 在 `create_deep_agent` 中传入 `interrupt_on`，它是一个将工具名称映射到中断配置的映射表
* 示例：`interrupt_on={"edit_file": True}` 会在每次编辑前暂停
* 在提示时，你可以提供批准消息或修改工具输入

**为什么有用：**

* 为破坏性操作设置安全闸门
* 在昂贵的 API 调用前进行用户校验
* 交互式调试与引导

## <a id="skills"></a> 技能

编排器支持技能（skills），用于向深度智能体提供专门的工作流与领域知识。

**它如何工作：**

* 技能遵循 [Agent Skills 标准](https://agentskills.io/)
* 每个技能是一个目录，包含带指令与元数据的 `SKILL.md` 文件
* 技能可包含额外脚本、参考文档、模板与其他资源
* 技能使用渐进式披露（progressive disclosure）——只有当智能体判断其对当前任务有用时才会加载
* 智能体在启动时读取每个 `SKILL.md` 的 frontmatter，然后在需要时再查看完整技能内容

**为什么有用：**

* 仅在需要时加载相关技能，从而减少 Token 使用
* 将能力与额外上下文打包成更大的动作
* 在不污染系统提示词的情况下提供专门知识
* 启用模块化、可复用的智能体能力

更多信息请参阅[技能](/oss/javascript/deepagents/skills)。

## <a id="memory"></a> 记忆

编排器支持持久化的记忆文件，用于在对话之间为深度智能体提供额外上下文。
这些文件通常包含通用编码风格、偏好、约定与指南，帮助智能体理解如何与代码库协作并遵循你的偏好。

**它如何工作：**

* 使用 [`AGENTS.md` 文件](https://agents.md/) 提供持久化上下文
* 记忆文件始终会被加载（不同于技能的渐进式披露）
* 在创建智能体时，将一个或多个文件路径传给 `memory` 参数
* 文件存储在智能体后端中（StateBackend、StoreBackend 或 FilesystemBackend）
* 智能体可基于你的交互、反馈与识别到的模式更新记忆

**为什么有用：**

* 提供无需在每次对话中重复说明的持久化上下文
* 适合存储用户偏好、项目指南或领域知识
* 对智能体始终可用，确保一致行为

关于配置细节与示例，请参阅[记忆](/oss/javascript/deepagents/customization#memory)。

***

<Callout icon="edit">
  在 GitHub 上[编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/harness.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[连接这些文档](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
