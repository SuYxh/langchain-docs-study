> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用此文件来发现所有可用页面。

# Deep Agents CLI

> 构建于 Deep Agents SDK 之上的终端编码智能体

Deep Agents CLI 是一个开源的终端编码智能体，构建于 [Deep Agents SDK](/oss/javascript/deepagents/quickstart) 之上。
它具备持久化记忆能力，能够跨会话维护上下文，学习项目约定，使用可自定义的技能，并在执行代码时提供审批控制。

<img src="https://qn.huat.xyz/mac/202602201653627.png" alt="Deep Agents CLI" data-og-width="1204" width="1204" data-og-height="1132" height="1132" data-path="oss/images/deepagents/deepagents-cli.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/nXZs0b5yGVcImq0G/oss/images/deepagents/deepagents-cli.png?w=280&fit=max&auto=format&n=nXZs0b5yGVcImq0G&q=85&s=a7cb09b9995adbcc3445aa2374ca4336 280w, https://mintcdn.com/langchain-5e9cc07a/nXZs0b5yGVcImq0G/oss/images/deepagents/deepagents-cli.png?w=560&fit=max&auto=format&n=nXZs0b5yGVcImq0G&q=85&s=a5150dcbd0cea821469e0e901a561e62 560w, https://mintcdn.com/langchain-5e9cc07a/nXZs0b5yGVcImq0G/oss/images/deepagents/deepagents-cli.png?w=840&fit=max&auto=format&n=nXZs0b5yGVcImq0G&q=85&s=7da91c2ffaba75b95648817bf2762e95 840w, https://mintcdn.com/langchain-5e9cc07a/nXZs0b5yGVcImq0G/oss/images/deepagents/deepagents-cli.png?w=1100&fit=max&auto=format&n=nXZs0b5yGVcImq0G&q=85&s=cabfd70a7a1dc7f98a635598322ece1c 1100w, https://mintcdn.com/langchain-5e9cc07a/nXZs0b5yGVcImq0G/oss/images/deepagents/deepagents-cli.png?w=1650&fit=max&auto=format&n=nXZs0b5yGVcImq0G&q=85&s=7a7f2595ffe66b305933820c1604312e 1650w, https://mintcdn.com/langchain-5e9cc07a/nXZs0b5yGVcImq0G/oss/images/deepagents/deepagents-cli.png?w=2500&fit=max&auto=format&n=nXZs0b5yGVcImq0G&q=85&s=500ed43457f59f55e490f5730981f236 2500w" />

Deep Agents CLI 具备以下内置能力：

* <Icon icon="file" size={16} /> **文件操作** - 通过工具在项目中读取、写入与编辑文件，使智能体能够管理并修改代码与文档。
* <Icon icon="terminal" size={16} /> **Shell 命令执行** - 执行 Shell 命令以运行测试、构建项目、管理依赖以及与版本控制系统交互。
* <Icon icon="search" size={16} /> **Web 搜索** - 在 Web 上搜索最新信息与文档（需要 Tavily API key）。
* <Icon icon="globe" size={16} /> **HTTP 请求** - 向 API 与外部服务发起 HTTP 请求，用于数据获取与集成任务。
* <Icon icon="list-check" size={16} /> **任务规划与跟踪** - 将复杂任务拆分为离散步骤，并通过内置 todo 系统跟踪进度。
* <Icon icon="brain" size={16} /> **记忆存储与检索** - 跨会话存取信息，使智能体能够记住项目约定与已学习的模式。
* <Icon icon="user" size={16} /> **人类介入（human-in-the-loop）** - 对敏感工具操作要求人工审批。
* <Icon icon="puzzle" size={16} /> **技能（Skills）** - 使用存储在技能目录中的自定义专长与指令扩展智能体能力。

<Accordion title="内置工具完整列表">
  ## 内置工具

  智能体自带以下内置工具，无需额外配置即可使用：

| 工具           | 说明                                                         | 人类介入（human-in-the-loop） |
| -------------- | ------------------------------------------------------------ | ----------------------------- |
| `ls`           | 列出文件与目录                                               | -                             |
| `read_file`    | 读取文件内容；支持将图片（`.png`、`.jpg`、`.jpeg`、`.gif`、`.webp`）作为多模态内容 | -                             |
| `write_file`   | 创建或覆盖文件                                               | 必需<sup>1</sup>              |
| `edit_file`    | 对现有文件进行定向编辑                                       | 必需<sup>1</sup>              |
| `glob`         | 查找匹配模式的文件（例如 `**/*.py`）                          | -                             |
| `grep`         | 跨文件搜索文本模式                                           | -                             |
| `shell`        | 执行 Shell 命令（本地模式）                                  | 必需<sup>1</sup>              |
| `execute`      | 在远程沙箱中执行命令（沙箱模式）                              | 必需<sup>1</sup>              |
| `web_search`   | 使用 Tavily API 进行 Web 搜索                                | 必需<sup>1</sup>              |
| `fetch_url`    | 抓取 Web 页面并转换为 Markdown                               | 必需<sup>1</sup>              |
| `task`         | 将工作委派给子智能体并行执行                                 | 必需<sup>1</sup>              |
| `write_todos`  | 为复杂工作创建并管理任务列表                                 | -                             |

  <sup>1</sup>：可能具有破坏性的操作在执行前需要用户批准。
  若要绕过人工批准，你可以切换自动批准，或使用 `auto-approve` 选项启动深度智能体：

  ```bash  theme={null}
  deepagents --auto-approve
  ```
</Accordion>

<Tip>
  观看[演示视频](https://youtu.be/IrnacLa9PJc?si=3yUnPbxnm2yaqVQb)，了解 Deep Agents CLI 的工作方式。
</Tip>

## 快速开始

<Steps>
  <Step title="设置 API key" icon="key">
    选择你想要使用的模型提供方，并将对应的 API key 以环境变量形式设置。

    <Tabs>
      <Tab title="OpenAI">
        以环境变量形式导出：

        ```bash  theme={null}
        export OPENAI_API_KEY="your-api-key"
        ```
      </Tab>

      <Tab title="Anthropic">
        以环境变量形式导出：

        ```bash  theme={null}
        export ANTHROPIC_API_KEY="your-api-key"
        ```
      </Tab>

      <Tab title="Google">
        以环境变量形式导出：

        ```bash  theme={null}
        export GOOGLE_API_KEY="your-api-key"
        ```
      </Tab>
    </Tabs>
  </Step>

  <Step title="运行 CLI" icon="terminal">
    <CodeGroup>
      ```bash 全局安装 theme={null}
      uv tool install deepagents-cli
      deepagents
      ```

      ```bash 运行（无需全局安装） theme={null}
      uvx deepagents-cli
      ```
    </CodeGroup>
  </Step>

  <Step title="给智能体一个任务" icon="message">
    ```txt  theme={null}
    > 创建一个 Python 脚本，打印 "Hello, World!"
    ```

    智能体会在修改文件之前，先以 diff 的形式提出变更并请求你批准。
  </Step>
</Steps>

<Accordion title="更多安装与配置选项">
  每个模型提供方都需要安装其对应的 LangChain 集成包。在安装 CLI 时，这些包作为可选 extra 提供：

  ```bash  theme={null}
  # 安装并启用一个提供方
  uv tool install 'deepagents-cli[anthropic]'

  # 一次安装并启用多个提供方
  uv tool install 'deepagents-cli[ollama,groq]'

  # 之后再添加额外的软件包
  uv tool upgrade deepagents-cli --with langchain-xai
  ```

  支持的提供方与配置选项完整列表，请参阅[自定义模型提供方](/oss/javascript/deepagents/cli/providers)。

  如果你在 `~/.deepagents/config.toml` 中保存了默认模型，CLI 会使用该默认模型。否则，它会根据可用的 API key 自动选择提供方。如果同时设置了多个 key，则按以下顺序使用第一个匹配项：

| 优先级 | API key                | 默认模型                              |
| ------ | ---------------------- | ------------------------------------- |
| 第 1 个 | `OPENAI_API_KEY`       | `gpt-5.2`                             |
| 第 2 个 | `ANTHROPIC_API_KEY`    | `claude-sonnet-4-5-20250929`          |
| 第 3 个 | `GOOGLE_API_KEY`       | `gemini-3-pro-preview`                |
| 第 4 个 | `GOOGLE_CLOUD_PROJECT` | `gemini-3-pro-preview`（Vertex AI）   |

  要使用不同模型，可传入 `--model` 标志，或使用 `provider:model` 格式显式指定提供方：

  ```bash  theme={null}
  deepagents --model anthropic:claude-opus-4-5
  deepagents --model openai:gpt-4o
  deepagents --model google_genai:gemini-2.5-pro
  ```

  你也可以使用不带提供方前缀的模型名进行自动检测：

  ```bash  theme={null}
  deepagents --model claude-opus-4-5-20251101
  ```

  启用 Web 搜索（可选）：

  ```bash  theme={null}
  export TAVILY_API_KEY="your-key"
  ```

  API key 可通过环境变量或 `.env` 文件设置。
</Accordion>

## 使用 LangSmith 进行追踪

启用 LangSmith 追踪，以在 LangSmith 控制台中查看智能体操作：

1. 启用 LangSmith 追踪：

   ```bash  theme={null}
   export LANGCHAIN_TRACING=true
   export LANGCHAIN_API_KEY="your-api-key"
   ```

2. 为深度智能体操作（例如工具调用与智能体决策）配置追踪：

   ```bash  theme={null}
   export DEEPAGENTS_LANGSMITH_PROJECT="my-deep-agent-execution"
   ```

3. 如果你正在构建一个带有深度智能体的 LangChain 应用，并希望将智能体追踪与应用追踪分开，还需要配置 `LANGSMITH_PROJECT`：

   ```bash  theme={null}
   export LANGSMITH_PROJECT="my-app-calls-to-langchain"
   ```

配置完成后，CLI 会显示：

```sh  theme={null}
✓ LangSmith tracing: 'my-project'
```

## 配置

每个智能体都有自己的配置目录：`~/.deepagents/<agent_name>/`。
默认智能体名称为 `agent`。
当你启动智能体时，如果该智能体名称对应的文件夹不存在，则会在该路径 `~/.deepagents/<new_agent>/` 创建。

```bash  theme={null}
# 列出所有已配置的智能体
deepagents list

# 使用指定智能体配置
deepagents --agent mybot

# 使用指定模型（provider:model 格式或自动检测）
deepagents --model anthropic:claude-sonnet-4-5
deepagents --model gpt-4o

# 自动批准工具使用（跳过人类介入提示）
deepagents --auto-approve

# 在远程沙箱中执行代码
deepagents --sandbox modal        # 或 runloop、daytona
deepagents --sandbox-id dbx_123   # 复用已有沙箱
```

<AccordionGroup>
  <Accordion title="命令行选项" icon="flag">
    | 选项                           | 说明                                                                                                                              |
    | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
    | `-a`、`--agent NAME`           | 使用命名智能体并维护独立记忆（默认：`agent`）                                                                                      |
    | `-M`、`--model MODEL`          | 使用指定模型（`provider:model`）                                                                                                   |
    | `--model-params JSON`          | 以 JSON 字符串形式向模型传递额外 kwargs（例如 `'{"temperature": 0.7}'`）                                                           |
    | `--default-model [MODEL]`      | 设置默认模型                                                                                                                       |
    | `--clear-default-model`        | 清除默认模型                                                                                                                       |
    | `-r`、`--resume [ID]`          | 恢复会话：`-r` 表示最近一次，`-r <ID>` 表示指定线程                                                                                |
    | `-m`、`--message TEXT`         | 会话开始时自动提交的初始提示词（交互模式）                                                                                         |
    | `-n`、`--non-interactive TEXT` | 以非交互方式运行单个任务后退出。除非设置 `--shell-allow-list`，否则禁用 shell                                                       |
    | `-q`、`--quiet`                | 适合管道处理的干净输出——仅将智能体回复写入 stdout。需要 `-n` 或通过管道传入 stdin                                                   |
    | `--no-stream`                  | 缓冲完整回复并一次性写入 stdout，而不是流式输出。需要 `-n` 或通过管道传入 stdin                                                     |
    | `--auto-approve`               | 自动批准所有工具调用而不提示（禁用人类介入）。在交互会话中可用 `Shift+Tab` 切换                                                     |
    | `--shell-allow-list LIST`      | 逗号分隔的 shell 命令自动批准列表，或使用 `'recommended'` 作为安全默认值。同时适用于 `-n` 与交互模式                                |
    | `--sandbox TYPE`               | 远程代码执行沙箱：`none`（默认）、`modal`、`daytona`、`runloop`、`langsmith`                                                        |
    | `--sandbox-id ID`              | 复用现有沙箱（跳过创建与清理）                                                                                                      |
    | `--sandbox-setup PATH`         | 沙箱创建后要运行的初始化脚本路径                                                                                                    |
    | `-v`、`--version`              | 显示版本                                                                                                                           |
    | `-h`、`--help`                 | 显示帮助                                                                                                                           |
  </Accordion>

  <Accordion title="CLI 命令" icon="terminal">
    | 命令                                                 | 说明                                           |
    | ---------------------------------------------------- | ---------------------------------------------- |
    | `deepagents help`                                    | 显示帮助                                       |
    | `deepagents list`                                    | 列出所有智能体                                 |
    | `deepagents reset --agent NAME`                      | 清空智能体记忆并重置为默认状态                 |
    | `deepagents reset --agent NAME --target SOURCE`      | 从另一个智能体复制记忆                         |
    | `deepagents skills list [--project]`                 | 列出所有技能（别名：`ls`）                     |
    | `deepagents skills create NAME [--project]`          | 使用模板 `SKILL.md` 创建新技能                 |
    | `deepagents skills info NAME [--project]`            | 显示技能的详细信息                             |
    | `deepagents skills delete NAME [--project] [-f]`     | 删除技能及其内容                               |
    | `deepagents threads list [--agent NAME] [--limit N]` | 列出会话（别名：`ls`）。默认 limit：20         |
    | `deepagents threads delete ID`                       | 删除会话                                       |
  </Accordion>
</AccordionGroup>

## 交互模式

像在聊天界面中一样自然输入即可。
智能体会使用其内置工具、技能与记忆来帮助你完成任务。

<AccordionGroup>
  <Accordion title="Slash 命令" icon="slash">
    在 CLI 会话中可使用以下命令：

    * `/model` - 打开交互式模型选择器
    * `/model <provider:model>` - 直接切换到指定模型（例如 `/model anthropic:claude-sonnet-4-5`）
    * `/model --default <provider:model>` - 设置持久化默认模型
    * `/model --default --clear` - 清除已保存的默认模型
    * `/remember [context]` - 回顾对话并更新记忆与技能。可选传入额外上下文
    * `/tokens` - 显示当前上下文窗口 token 使用量
    * `/clear` - 清空对话历史并启动新线程
    * `/threads` - 浏览并恢复之前的对话线程
    * `/trace` - 在 LangSmith 中打开当前线程（需要 `LANGSMITH_API_KEY`）
    * `/changelog` - 在浏览器中打开 CLI 更新日志
    * `/docs` - 在浏览器中打开文档
    * `/feedback` - 打开 GitHub issues 页面以提交 bug 或功能请求
    * `/version` - 显示已安装的 `deepagents-cli` 与 SDK 版本
    * `/help` - 显示帮助与可用命令
    * `/quit`（或 `/q`） - 退出 CLI
  </Accordion>

  <Accordion title="Bash 命令" icon="terminal">
    在前面加上 `!` 可直接执行 shell 命令：

    ```bash  theme={null}
    !git status
    !npm test
    !ls -la
    ```
  </Accordion>

  <Accordion title="快捷键" icon="keyboard">
    **通用**

    | 快捷键                                                 | 动作                                         |
    | ----------------------------------------------------- | -------------------------------------------- |
    | `Enter`                                               | 提交提示词                                   |
    | `Shift+Enter`、`Ctrl+J`、`Alt+Enter` 或 `Ctrl+Enter`  | 插入换行                                     |
    | `Ctrl+A`                                              | 选择输入中的所有文本                         |
    | `@filename`                                           | 自动补全文件并注入内容                       |
    | `Shift+Tab` 或 `Ctrl+T`                               | 切换自动批准                                 |
    | `Ctrl+E`                                              | 展开/折叠最近一次工具输出                    |
    | `Escape`                                              | 中断当前操作                                 |
    | `Ctrl+C`                                              | 中断或退出                                   |
    | `Ctrl+D`                                              | 退出                                         |
  </Accordion>
</AccordionGroup>

## 非交互模式与管道

使用 `-n` 运行单个任务，而不启动交互式 UI：

```bash  theme={null}
deepagents -n "编写一个 Python 脚本，打印 hello world"
```

你也可以通过 stdin 管道传入输入。管道输入时，CLI 会自动以非交互方式运行：

```bash  theme={null}
echo "解释这段代码" | deepagents
cat error.log | deepagents -n "这个错误的原因是什么？"
git diff | deepagents -n "审查这些变更"
```

当管道输入与 `-n` 或 `-m` 结合使用时，管道内容会被追加到标志值之前。

<Note>
  管道输入的最大大小为 10 MiB。
</Note>

使用 `-q` 以获得适合管道输出的干净输出，使用 `--no-stream` 在写入 stdout 之前缓冲完整回复（而非流式输出）：

```bash  theme={null}
deepagents -n "为 Python 生成一个 .gitignore" -q > .gitignore
deepagents -n "列出依赖项" -q --no-stream | sort
```

默认情况下，非交互模式禁用 shell 执行。使用 `--shell-allow-list` 允许特定命令：

```bash  theme={null}
deepagents -n "运行测试并修复失败项" --shell-allow-list "pytest,git,make"
deepagents -n "构建项目" --shell-allow-list recommended
```

## 切换模型

你可以在会话期间使用 `/model` 命令切换模型而无需重启 CLI；也可以在启动时使用 `--model` 标志切换：

```txt  theme={null}
> /model anthropic:claude-opus-4-5
> /model openai:gpt-4o
```

```bash  theme={null}
deepagents --model openai:gpt-4o
```

`/model` 不带参数时会打开一个交互式模型选择器，按提供方分组显示可用模型。

关于切换模型、设置默认值、配置自定义提供方，以及使用 `~/.deepagents/config.toml` 配置文件的完整说明，请参阅[自定义模型提供方](/oss/javascript/deepagents/cli/providers)。

## 教会智能体项目约定

在你使用智能体的过程中，它会使用“记忆优先（memory-first）”协议，自动将信息以 Markdown 文件形式存入 `~/.deepagents/<agent_name>/memories/`：

1. **Research**：任务开始前先搜索记忆以获取相关上下文
2. **Response**：执行过程中不确定时检查记忆
3. **Learning**：自动保存新信息以供未来会话使用

智能体会按主题组织记忆，并使用具有描述性的文件名：

```txt  theme={null}
~/.deepagents/backend-dev/memories/
├── api-conventions.md
├── database-schema.md
└── deployment-process.md
```

当你教给智能体约定时：

```bash  theme={null}
uvx deepagents-cli --agent backend-dev
> 我们的 API 使用 snake_case，并包含 created_at/updated_at 时间戳
```

它会在未来会话中记住这些内容：

```bash  theme={null}
> 创建一个 /users 端点
# 无需提示即可应用约定
```

## 自定义你的深度智能体

自定义任意智能体主要有两种方式：

* **记忆**：全局与项目级的 `AGENTS.md` 文件，会在会话启动时被完整加载。
  记忆适合用于通用编码风格与偏好。

* **技能**：全局与项目级的上下文、约定、指南或指令。
  技能适用于仅在执行特定任务时才需要的上下文。

### 提供项目或用户上下文

[`AGENTS.md` 文件](https://agents.md/)提供会话启动时始终会加载的持久化记忆。

你可以在 `~/.deepagents/<agent_name>/AGENTS.md` 中为智能体提供全局用户记忆。
当你启动新的深度智能体会话时，该文件总会被加载。
当你询问与项目相关的问题，或你引用过去的工作/模式时，智能体也可能读取其记忆文件。

对于项目级记忆，只要项目使用 git，你就可以在任意项目根目录下添加 `.deepagents/AGENTS.md`。
当你在项目文件夹内任意位置启动 CLI 时，CLI 会通过查找包含的 `.git` 目录来定位项目根目录。

全局与项目级 `AGENTS.md` 文件会在启动时一起加载，并追加到系统提示词中。
随着你使用智能体，它会更新这些文件，并为其补充行为方式、对其工作的反馈，或需要记住的指令。
如果它从你的交互中识别出模式或偏好，也会更新其记忆。

如果你希望显式提示深度智能体基于当前线程上下文更新技能与记忆，请使用 `/remember` 命令，它会加载一条自定义指令来回顾上下文并执行更新。

若要将更多结构化的项目知识放入额外的记忆文件，你可以将它们添加到 `.deepagents/` 中，并在 `AGENTS.md` 文件中引用它们。
你必须在 `AGENTS.md` 中引用额外文件，智能体才会知晓这些文件的存在。
这些额外文件不会在启动时读取，但智能体可在需要时引用并更新它们。

<Accordion title="何时使用全局 vs. 项目级 `AGENTS.md`">
  **全局 `AGENTS.md`**（`~/.deepagents/agent/AGENTS.md`）

  * 你的个性、风格与通用编码偏好
  * 通用语气与沟通风格
  * 通用编码偏好（格式、类型提示等）
  * 适用于所有场景的工具使用模式
  * 不随项目改变的工作流与方法论

  **项目级 `AGENTS.md`**（项目根目录的 `.deepagents/AGENTS.md`）

  * 项目特定的上下文与约定
  * 项目架构与设计模式
  * 该代码库特定的编码约定
  * 测试策略与部署流程
  * 团队规范与项目结构
</Accordion>

## 使用远程沙箱

在隔离的远程环境中执行代码，以获得更高安全性与灵活性。远程沙箱具有以下优势：

* **安全性**：保护本机免受潜在有害代码执行的影响
* **干净环境**：无需本地配置即可使用特定依赖或 OS 配置
* **并行执行**：在隔离环境中同时运行多个智能体
* **长任务**：执行耗时操作而不阻塞你的机器
* **可复现性**：确保团队之间一致的执行环境

使用远程沙箱可按以下步骤进行：

1. 配置你的沙箱提供方（[Runloop](https://www.runloop.ai/)、[Daytona](https://www.daytona.io/) 或 [Modal](https://modal.com/)）：

   ```bash  theme={null}
   # Runloop
   export RUNLOOP_API_KEY="your-key"

   # Daytona
   export DAYTONA_API_KEY="your-key"

   # Modal
   modal setup
   ```

2. 使用沙箱运行 CLI：

   ```bash  theme={null}
   uvx deepagents-cli --sandbox runloop --sandbox-setup ./setup.sh
   ```

   智能体在本地运行，但所有代码相关操作都在远程沙箱中执行。可选的初始化脚本可以设置环境变量、克隆仓库并准备依赖。

3. （可选）创建一个 `setup.sh` 文件来配置沙箱环境：

   ```bash  theme={null}
   #!/bin/bash
   set -e

   # 使用 GitHub token 克隆仓库
   git clone https://x-access-token:${GITHUB_TOKEN}@github.com/username/repo.git $HOME/workspace
   cd $HOME/workspace

   # 让环境变量持久化
   cat >> ~/.bashrc <<'EOF'
   export GITHUB_TOKEN="${GITHUB_TOKEN}"
   export OPENAI_API_KEY="${OPENAI_API_KEY}"
   cd $HOME/workspace
   EOF

   source ~/.bashrc
   ```

   将 secret 存在本地 `.env` 文件中，以供 setup 脚本读取。

<Warning>
  沙箱可以隔离代码执行，但在处理不可信输入时，智能体仍然容易受到提示注入（prompt injection）攻击。请结合使用人类介入审批、短生命周期 secret，以及仅使用可信的初始化脚本。

  需要注意的是，沙箱 API 正在快速演进，我们预计会有更多提供方支持代理（proxy），以帮助缓解提示注入与 secret 管理方面的顾虑。
</Warning>

## 使用技能

技能是可复用的智能体能力，提供专门的工作流与领域知识。
你可以使用[技能](/oss/javascript/deepagents/skills)为深度智能体提供新能力与专长。
深度智能体技能遵循 [Agent Skills 标准](https://agentskills.io/)。
添加技能后，深度智能体会自动利用这些技能，并在你使用智能体、为其补充信息的过程中更新技能。

如果你希望显式提示深度智能体基于当前线程上下文更新技能与记忆，请使用 `/remember` 命令，它会加载一条自定义指令来回顾上下文并执行更新。

### 添加技能

1. 先创建一个技能：

   <Tabs>
     <Tab title="用户技能">
       ```bash  theme={null}
       deepagents skills create test-skill
       ```

       这会在你的 `~/.deepagents/<agent_name>` 文件夹中生成以下文件：
     </Tab>

     <Tab title="项目技能">
       ```bash  theme={null}
       deepagents skills create test-skill --project
       ```

       这会在你的 `~/{project}/.deepagents/skills` 文件夹中生成以下文件：
     </Tab>
   </Tabs>

   ```plaintext  theme={null}
   skills/
   └── test-skill
       └── SKILL.md
   ```

2. 打开生成的 `SKILL.md` 并编辑文件以加入你的指令。

3. 可选：向 `test-skill` 文件夹添加额外脚本或其他资源。
   更多信息请参阅[示例](/oss/javascript/deepagents/skills#examples)。

如果你已经有一个包含技能文件的 skills 文件夹，也可以将它们直接复制到智能体文件夹中：

```bash  theme={null}
mkdir -p ~/.deepagents/<agent_name>/skills
cp -r examples/skills/web-research ~/.deepagents/<agent_name>/skills/
```

启动时，CLI 会扫描 `~/.deepagents/<agent_name>/skills/` 与 `.deepagents/skills/` 目录。
对于项目级技能，项目根目录必须包含 `.git` 文件夹。
当你在项目文件夹内任意位置启动 CLI 时，CLI 会通过检查包含的 `.git` 文件夹来定位项目根目录。

对于每个技能，CLI 会从 `SKILL.md` 的 frontmatter 中读取名称与描述。
当你使用 CLI 时，如果某个任务与技能描述匹配，智能体会读取该技能文件并遵循其指令。

### 列出技能

要查看你安装的技能列表，请运行：

<Tabs>
  <Tab title="用户技能">
    ```bash  theme={null}
    deepagents skills list
    ```
  </Tab>

  <Tab title="项目技能">
    ```bash  theme={null}
    deepagents skills list --project
    ```
  </Tab>
</Tabs>

要获取某个技能的更多信息，请运行：

<Tabs>
  <Tab title="用户技能">
    ```bash  theme={null}
    deepagents skills info test-skill
    ```
  </Tab>

  <Tab title="项目技能">
    ```bash  theme={null}
    deepagents skills info test-skill --project
    ```
  </Tab>
</Tabs>

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/cli/overview.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[连接这些文档](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
