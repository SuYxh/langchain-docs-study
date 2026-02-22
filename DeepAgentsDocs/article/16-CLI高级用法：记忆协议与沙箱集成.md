# CLI 高级用法：记忆协议与沙箱集成

上一篇我们学习了 Deep Agents CLI 的基础用法。本文将深入探讨 CLI 的高级特性：记忆优先协议、AGENTS.md 项目约定文件、技能系统管理和远程沙箱集成。

## 记忆优先协议（Memory-First Protocol）

Deep Agents CLI 采用"记忆优先"协议，自动将学习到的信息存储为 Markdown 文件。这个协议包含三个阶段：

### 1. Research（研究）

任务开始前，智能体会先搜索记忆获取相关上下文：

```
用户：创建一个新的 API 端点

智能体内部流程：
1. 搜索 memories/ 目录
2. 找到 api-conventions.md
3. 读取其中的命名规范和结构约定
4. 应用这些约定来完成任务
```

### 2. Response（响应）

执行过程中遇到不确定的情况，智能体会检查记忆：

```
智能体：不确定错误处理方式...
智能体：检查 memories/error-handling.md
智能体：找到团队的错误处理模式
智能体：按照约定实现错误处理
```

### 3. Learning（学习）

智能体会自动保存新学到的信息供未来使用：

```
用户：我们使用 snake_case 命名，所有 API 都需要 created_at 字段

智能体：好的，我会记住这个约定

# 自动创建或更新 memories/api-conventions.md
```

### 记忆目录结构

智能体按主题组织记忆，使用描述性文件名：

```
~/.deepagents/backend-dev/memories/
├── api-conventions.md       # API 设计约定
├── database-schema.md       # 数据库结构
├── deployment-process.md    # 部署流程
├── testing-patterns.md      # 测试模式
└── code-style.md           # 代码风格
```

### 教智能体项目约定

直接告诉智能体你的约定，它会自动记住：

```bash
uvx deepagents-cli --agent backend-dev

> 我们的 API 使用 snake_case，所有响应都包含 created_at 和 updated_at 时间戳
```

在未来的会话中，智能体会自动应用这些约定：

```
> 创建一个 /users 端点
# 无需提示，智能体自动使用 snake_case 和时间戳字段
```

## AGENTS.md：项目约定文件

`AGENTS.md` 是一种特殊的记忆文件，会在会话启动时自动加载。它有两个级别：

### 全局 AGENTS.md

位置：`~/.deepagents/<agent_name>/AGENTS.md`

适合存放：
- 个人编码风格和偏好
- 通用语气和沟通方式
- 适用于所有项目的工具使用模式
- 不随项目改变的工作流方法论

```markdown
# 全局约定

## 编码风格
- 优先使用函数式编程
- 避免类继承，使用组合
- 所有函数添加类型注解

## 沟通风格
- 简洁直接
- 用代码示例说明
- 主动解释设计决策

## 工具偏好
- 测试使用 vitest
- 格式化使用 prettier
- 类型检查使用 tsc --noEmit
```

### 项目级 AGENTS.md

位置：`项目根目录/.deepagents/AGENTS.md`

适合存放：
- 项目特定的上下文和约定
- 架构和设计模式
- 该代码库的编码约定
- 测试策略和部署流程
- 团队规范和项目结构

```markdown
# 项目约定

## 项目概述
这是一个 Next.js 全栈应用，使用 Prisma + PostgreSQL。

## 架构规范
- 页面放在 app/ 目录
- API 路由放在 app/api/
- 共享组件放在 components/
- 工具函数放在 lib/

## 数据库约定
- 模型使用 PascalCase
- 字段使用 camelCase
- 所有表都有 createdAt 和 updatedAt

## 测试约定
- 单元测试放在 __tests__/ 目录
- 使用 Jest + React Testing Library
- 覆盖率要求 > 80%

## 相关文档
- 数据库结构详见 ./database-schema.md
- API 设计指南详见 ./api-guidelines.md
```

### 启动时加载顺序

1. 全局 `~/.deepagents/<agent>/AGENTS.md`
2. 项目级 `.deepagents/AGENTS.md`
3. 两者内容追加到系统提示词

### 使用 /remember 更新记忆

如果想让智能体基于当前对话更新记忆和技能：

```
> /remember 我们讨论的认证方案
```

智能体会：
1. 回顾当前对话
2. 提取关键信息
3. 更新相关的记忆文件或技能

## 技能系统管理

技能是可复用的智能体能力，提供专门的工作流和领域知识。

### 创建技能

```bash
# 创建用户级技能
deepagents skills create code-review

# 创建项目级技能
deepagents skills create api-generator --project
```

这会创建以下结构：

```
skills/
└── code-review/
    └── SKILL.md
```

### SKILL.md 格式

```markdown
---
name: code-review
description: 执行代码审查，检查代码质量、安全性和最佳实践
trigger: 当用户请求代码审查或 PR 审查时
---

# 代码审查技能

## 审查流程

1. **代码质量检查**
   - 命名是否清晰
   - 函数是否单一职责
   - 是否有重复代码

2. **安全性检查**
   - 是否有硬编码的密钥
   - 是否有 SQL 注入风险
   - 输入是否经过验证

3. **性能检查**
   - 是否有不必要的循环
   - 是否有内存泄漏风险
   - 数据库查询是否优化

## 输出格式

```
## 代码审查报告

### 严重问题
- [ ] 问题描述

### 建议改进
- [ ] 改进建议

### 优点
- 值得称赞的地方
```
```

### 技能管理命令

```bash
# 列出用户技能
deepagents skills list

# 列出项目技能
deepagents skills list --project

# 查看技能详情
deepagents skills info code-review

# 删除技能
deepagents skills delete code-review
deepagents skills delete code-review --project -f  # 强制删除
```

### 技能 vs 记忆的区别

| 特性 | 技能 (Skills) | 记忆 (Memory) |
|------|---------------|---------------|
| 加载时机 | 任务匹配时按需加载 | 会话启动时自动加载 |
| 内容类型 | 专业工作流和领域知识 | 项目约定和个人偏好 |
| 共享性 | 可在团队间共享 | 通常是个人化的 |
| 触发方式 | 描述匹配自动触发 | 始终可用 |

## 远程沙箱集成

在隔离的远程环境中执行代码，获得更高的安全性和灵活性。

### 沙箱的优势

- **安全性**：保护本机免受有害代码影响
- **干净环境**：无需本地配置即可使用特定依赖
- **并行执行**：在隔离环境中同时运行多个智能体
- **长任务**：执行耗时操作不阻塞本机
- **可复现性**：确保团队间一致的执行环境

### 支持的沙箱提供商

| 提供商 | 特点 |
|--------|------|
| Modal | 函数级隔离，按使用付费 |
| Daytona | 完整开发环境，持久化工作区 |
| Runloop | 针对 AI 代理优化 |

### 配置沙箱提供商

```bash
# Runloop
export RUNLOOP_API_KEY="your-key"

# Daytona
export DAYTONA_API_KEY="your-key"

# Modal
modal setup  # 交互式配置
```

### 使用沙箱运行

```bash
# 使用 Runloop 沙箱
deepagents --sandbox runloop

# 使用 Modal 沙箱
deepagents --sandbox modal

# 使用 Daytona 沙箱
deepagents --sandbox daytona

# 复用已有沙箱
deepagents --sandbox modal --sandbox-id sbx_123
```

### 沙箱初始化脚本

可以提供初始化脚本配置沙箱环境：

```bash
deepagents --sandbox runloop --sandbox-setup ./setup.sh
```

`setup.sh` 示例：

```bash
#!/bin/bash
set -e

# 使用 GitHub token 克隆仓库
git clone https://x-access-token:${GITHUB_TOKEN}@github.com/username/repo.git $HOME/workspace
cd $HOME/workspace

# 安装依赖
npm install

# 配置环境变量持久化
cat >> ~/.bashrc <<'EOF'
export GITHUB_TOKEN="${GITHUB_TOKEN}"
export OPENAI_API_KEY="${OPENAI_API_KEY}"
cd $HOME/workspace
EOF

source ~/.bashrc
```

### 安全注意事项

沙箱可以隔离代码执行，但仍需注意：

1. **提示注入风险**：处理不可信输入时，智能体可能被误导
2. **Secret 管理**：使用短生命周期的 token
3. **人机协作**：对敏感操作保留审批
4. **可信脚本**：只使用可信的初始化脚本

## 自定义模型提供商

### config.toml 配置

创建 `~/.deepagents/config.toml`：

```toml
# 设置默认模型
[default]
model = "anthropic:claude-sonnet-4-5"

# 自定义提供商配置
[providers.my-ollama]
class_path = "langchain_community.chat_models.ChatOllama"
model = "llama3.1"
temperature = 0.7
base_url = "http://localhost:11434"

[providers.azure-openai]
class_path = "langchain_openai.AzureChatOpenAI"
api_key_env = "AZURE_OPENAI_API_KEY"
azure_endpoint = "https://my-resource.openai.azure.com"
api_version = "2024-02-15-preview"
deployment_name = "gpt-4"
```

### 使用自定义提供商

```bash
# 使用配置文件中定义的提供商
deepagents --model my-ollama:llama3.1
deepagents --model azure-openai:gpt-4
```

## 完整项目配置示例

一个完整配置的项目结构：

```
my-project/
├── .deepagents/
│   ├── AGENTS.md              # 项目约定
│   ├── database-schema.md     # 数据库文档（在 AGENTS.md 中引用）
│   ├── api-guidelines.md      # API 指南（在 AGENTS.md 中引用）
│   └── skills/
│       ├── code-review/
│       │   └── SKILL.md
│       └── api-generator/
│           └── SKILL.md
├── src/
└── package.json
```

`.deepagents/AGENTS.md`：

```markdown
# 项目约定

## 项目概述
React + Node.js 全栈应用

## 架构
- 前端：React 18 + TypeScript + Zustand
- 后端：Express + Prisma + PostgreSQL
- 测试：Vitest + Testing Library

## 约定
- 所有组件使用函数式写法
- 状态管理使用 Zustand
- API 响应统一格式：{ success, data, error }

## 参考文档
- 数据库结构：./database-schema.md
- API 规范：./api-guidelines.md

## 命令
- 开发：npm run dev
- 测试：npm test
- 构建：npm run build
```

## 小结

本文介绍了 Deep Agents CLI 的高级用法：

1. **记忆优先协议**：Research → Response → Learning 三阶段学习
2. **AGENTS.md**：全局和项目级约定文件，启动时自动加载
3. **技能系统**：按需加载的专业能力，用 SKILL.md 定义
4. **远程沙箱**：Modal、Daytona、Runloop 三大提供商
5. **自定义模型**：通过 config.toml 配置任意模型提供商

至此，第六部分「CLI 工具篇」完成。下一部分我们将学习进阶配置，包括中间件系统和自定义模型提供商的详细配置。
