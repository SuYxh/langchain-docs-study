# Deep Agents CLI：终端中的 AI 助手

Deep Agents CLI 是一个强大的终端编码智能体，构建于 Deep Agents SDK 之上。它具备持久化记忆、项目约定学习、可自定义技能和执行审批控制等能力。本文将带你快速上手这个终端中的 AI 助手。

## CLI 能做什么？

Deep Agents CLI 内置了丰富的能力：

- **文件操作**：读取、写入、编辑项目中的文件
- **Shell 命令执行**：运行测试、构建项目、管理依赖
- **Web 搜索**：搜索最新信息和文档（需要 Tavily API key）
- **HTTP 请求**：向 API 和外部服务发起请求
- **任务规划**：将复杂任务拆分为步骤，通过 todo 系统跟踪进度
- **记忆存储**：跨会话存取信息，记住项目约定和学习模式
- **人机协作**：对敏感操作要求人工审批
- **技能系统**：使用自定义专长扩展智能体能力

## 快速安装

### 1. 设置 API Key

选择你的模型提供商，设置对应的 API key：

```bash
# OpenAI
export OPENAI_API_KEY="your-api-key"

# 或 Anthropic
export ANTHROPIC_API_KEY="your-api-key"

# 或 Google
export GOOGLE_API_KEY="your-api-key"
```

### 2. 安装并运行

```bash
# 全局安装
uv tool install deepagents-cli
deepagents

# 或不安装直接运行
uvx deepagents-cli
```

### 3. 开始对话

```
> 创建一个 Python 脚本，打印 "Hello, World!"
```

智能体会在修改文件之前，以 diff 形式展示变更并请求你批准。

## 内置工具详解

CLI 自带 12 个核心工具，无需额外配置：

| 工具 | 功能 | 需要审批 |
|------|------|----------|
| `ls` | 列出文件与目录 | - |
| `read_file` | 读取文件内容（支持图片多模态） | - |
| `write_file` | 创建或覆盖文件 | ✓ |
| `edit_file` | 对现有文件进行定向编辑 | ✓ |
| `glob` | 查找匹配模式的文件（如 `**/*.py`） | - |
| `grep` | 跨文件搜索文本模式 | - |
| `shell` | 执行 Shell 命令（本地模式） | ✓ |
| `execute` | 在远程沙箱中执行命令 | ✓ |
| `web_search` | 使用 Tavily API 进行 Web 搜索 | ✓ |
| `fetch_url` | 抓取网页并转换为 Markdown | ✓ |
| `task` | 委托子智能体并行执行 | ✓ |
| `write_todos` | 创建并管理任务列表 | - |

标记为"需要审批"的工具在执行前会暂停等待你确认。

### 绕过审批

如果你信任智能体的操作，可以启用自动批准：

```bash
# 启动时启用
deepagents --auto-approve

# 会话中按 Shift+Tab 切换
```

## Slash 命令

在会话中使用以下命令：

| 命令 | 功能 |
|------|------|
| `/model` | 打开交互式模型选择器 |
| `/model <provider:model>` | 切换到指定模型 |
| `/model --default <model>` | 设置持久化默认模型 |
| `/remember [context]` | 回顾对话并更新记忆与技能 |
| `/tokens` | 显示当前上下文 token 使用量 |
| `/clear` | 清空对话历史，启动新线程 |
| `/threads` | 浏览并恢复之前的对话 |
| `/trace` | 在 LangSmith 中打开当前线程 |
| `/help` | 显示帮助信息 |
| `/quit` 或 `/q` | 退出 CLI |

### 快速执行 Shell 命令

在命令前加 `!` 可直接执行：

```bash
!git status
!npm test
!ls -la
```

## 快捷键

| 快捷键 | 动作 |
|--------|------|
| `Enter` | 提交提示词 |
| `Shift+Enter` / `Ctrl+J` | 插入换行 |
| `Ctrl+A` | 选择输入中的所有文本 |
| `@filename` | 自动补全文件并注入内容 |
| `Shift+Tab` / `Ctrl+T` | 切换自动批准 |
| `Ctrl+E` | 展开/折叠最近一次工具输出 |
| `Escape` | 中断当前操作 |
| `Ctrl+C` | 中断或退出 |
| `Ctrl+D` | 退出 |

## 命令行选项

```bash
# 使用命名智能体（独立记忆）
deepagents --agent backend-dev

# 指定模型
deepagents --model anthropic:claude-sonnet-4-5
deepagents --model openai:gpt-4o

# 恢复会话
deepagents --resume           # 恢复最近一次
deepagents --resume <ID>      # 恢复指定线程

# 自动批准（跳过人工审批）
deepagents --auto-approve

# 使用远程沙箱
deepagents --sandbox modal
deepagents --sandbox daytona

# 传递模型参数
deepagents --model-params '{"temperature": 0.7}'
```

## 非交互模式

使用 `-n` 运行单个任务，无需启动交互界面：

```bash
deepagents -n "编写一个 Python 脚本，打印 hello world"
```

### 管道输入

可以通过 stdin 管道传入内容：

```bash
echo "解释这段代码" | deepagents
cat error.log | deepagents -n "这个错误的原因是什么？"
git diff | deepagents -n "审查这些变更"
```

### 干净输出

使用 `-q` 获得适合管道的干净输出：

```bash
deepagents -n "为 Python 生成一个 .gitignore" -q > .gitignore
deepagents -n "列出依赖项" -q --no-stream | sort
```

### 允许特定 Shell 命令

非交互模式默认禁用 shell，使用 `--shell-allow-list` 允许特定命令：

```bash
deepagents -n "运行测试并修复失败项" --shell-allow-list "pytest,git,make"
deepagents -n "构建项目" --shell-allow-list recommended
```

## 配置目录结构

每个智能体都有独立的配置目录：

```
~/.deepagents/
├── config.toml           # 全局配置（模型设置等）
├── agent/                # 默认智能体
│   ├── AGENTS.md         # 全局记忆
│   ├── memories/         # 学习到的记忆
│   │   ├── api-conventions.md
│   │   └── coding-style.md
│   └── skills/           # 用户技能
│       └── web-research/
│           └── SKILL.md
└── backend-dev/          # 命名智能体
    ├── AGENTS.md
    └── memories/
```

## 模型选择优先级

如果在 `~/.deepagents/config.toml` 中设置了默认模型，CLI 会使用该模型。否则根据可用的 API key 自动选择：

| 优先级 | API Key | 默认模型 |
|--------|---------|----------|
| 1 | `OPENAI_API_KEY` | gpt-5.2 |
| 2 | `ANTHROPIC_API_KEY` | claude-sonnet-4-5-20250929 |
| 3 | `GOOGLE_API_KEY` | gemini-3-pro-preview |
| 4 | `GOOGLE_CLOUD_PROJECT` | gemini-3-pro-preview (Vertex) |

## 切换模型

会话中随时切换模型：

```
> /model anthropic:claude-opus-4-5
> /model openai:gpt-4o
```

或启动时指定：

```bash
deepagents --model openai:gpt-4o
```

不带参数的 `/model` 会打开交互式选择器，按提供商分组显示可用模型。

## 启用 LangSmith 追踪

追踪智能体操作，便于调试和分析：

```bash
export LANGCHAIN_TRACING=true
export LANGCHAIN_API_KEY="your-api-key"
export DEEPAGENTS_LANGSMITH_PROJECT="my-deep-agent-execution"
```

配置完成后，CLI 会显示：

```
✓ LangSmith tracing: 'my-deep-agent-execution'
```

## 智能体管理命令

```bash
# 列出所有智能体
deepagents list

# 重置智能体（清空记忆）
deepagents reset --agent backend-dev

# 从另一个智能体复制记忆
deepagents reset --agent new-agent --target backend-dev

# 列出会话历史
deepagents threads list --agent backend-dev --limit 10

# 删除会话
deepagents threads delete <ID>
```

## 实战示例：代码重构任务

让我们用 CLI 完成一个实际任务：

```
> 重构 src/utils.ts 文件，将所有函数改为使用 async/await 语法

智能体会：
1. 读取 src/utils.ts 文件内容
2. 分析现有的 Promise 链式调用
3. 提出 diff 形式的修改建议
4. 等待你批准后执行修改
5. 可选：运行测试确认修改正确
```

## 小结

本文介绍了 Deep Agents CLI 的核心功能：

1. **快速安装**：通过 uv 一键安装运行
2. **12 个内置工具**：文件操作、Shell 执行、Web 搜索等
3. **Slash 命令**：模型切换、记忆管理、会话控制
4. **快捷键**：高效的终端交互体验
5. **非交互模式**：支持管道和脚本集成
6. **配置管理**：独立的智能体配置目录

下一篇文章，我们将深入 CLI 的高级用法，包括记忆优先协议、AGENTS.md 配置和远程沙箱集成。
