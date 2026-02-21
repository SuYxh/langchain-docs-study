# 环境安装与配置：从 0 到 1 搭建 LangChain 开发环境

---

## 简单来说

**安装 LangChain 只需 3 步**：安装核心包、安装模型集成包、配置 API Key。

就像组装电脑一样：先装主板（核心包），再装显卡（模型），最后插电源（API Key）。

---

## 🎯 本节目标

读完本节，你将能够回答这些问题：

- ❓ 安装 LangChain 需要什么环境？Node.js 版本有什么要求？
- ❓ 为什么要安装 `@langchain/core`？它和 `langchain` 有什么区别？
- ❓ 不同的模型提供商（OpenAI、Anthropic、Google）需要安装什么包？
- ❓ API Key 怎么配置？放在哪里安全？
- ❓ 安装后如何验证环境是否正确？

---

## 核心痛点与解决方案

### 痛点：AI 开发环境搭建的三大坑

| 痛点 | 传统做法 | 有多痛苦 |
|------|----------|----------|
| **依赖混乱** | 各种 SDK 装一堆，版本冲突 | 项目跑不起来，debug 半天 |
| **API Key 管理** | 硬编码在代码里，泄露风险 | 账号被盗，API 费用爆炸 |
| **模型切换** | 想换模型？重写集成代码 | 时间全浪费在重复工作上 |

**举个例子：** 你想先试试 OpenAI，后来觉得 Anthropic 更适合。

传统做法：
```
1. 安装 openai SDK
2. 写 OpenAI 集成代码
3. 硬编码 API Key
4. 想换 Anthropic？重复 1-3 步
```

### 解决：LangChain 统一管理

```bash
# 1. 安装核心包（所有模型通用）
npm install langchain @langchain/core

# 2. 安装需要的模型集成
npm install @langchain/openai  # OpenAI
npm install @langchain/anthropic  # Anthropic

# 3. 配置 API Key（环境变量）
export OPENAI_API_KEY=sk-xxx
export ANTHROPIC_API_KEY=sk-ant-xxx
```

**效果对比：**

| 指标 | 传统做法 | LangChain |
|------|----------|-----------|
| 依赖管理 | 多个 SDK 冲突 | 统一包管理 |
| API Key | 硬编码在代码 | 环境变量安全管理 |
| 模型切换 | 重写集成代码 | 改一行字符串 |
| 版本控制 | 混乱 | 统一版本兼容 |

---

## 生活化类比：组装你的 AI 开发环境

| 组件 | 类比 | 作用 |
|------|------|------|
| **Node.js** | 电源插座 | 提供运行环境 |
| **langchain** | 主板 | 核心框架，提供基础功能 |
| **@langchain/core** | CPU | 核心库，所有功能的基础 |
| **@langchain/openai** | NVIDIA 显卡 | 提供 OpenAI 模型能力 |
| **@langchain/anthropic** | AMD 显卡 | 提供 Anthropic 模型能力 |
| **API Key** | 电费卡 | 没有它，模型用不了 |
| **环境变量** | 保险箱 | 安全存放 API Key |

### 安装流程图

```
┌─────────────────────────────────────┐
│                                     │
│   1. 检查 Node.js 版本 ≥ 20         │
│      ↓                              │
│   2. 安装核心包                      │
│      langchain + @langchain/core     │
│      ↓                              │
│   3. 安装模型集成                    │
│      @langchain/openai 等            │
│      ↓                              │
│   4. 配置 API Key（环境变量）         │
│      ↓                              │
│   5. 验证安装成功                    │
│      ↓                              │
│   6. 开始开发！                      │
│                                     │
└─────────────────────────────────────┘
```

---

## 安装步骤详解

### 1. 环境准备

**Node.js 版本要求：** ≥ 20.x

**检查版本：**

```bash
node -v
# v20.11.1 ✅ 合格
# v18.17.0 ❌ 不合格（需要升级）
```

**升级 Node.js：**

- 使用 [nvm](https://github.com/nvm-sh/nvm)（推荐）：
  ```bash
  nvm install 20
  nvm use 20
  ```

- 或下载安装包：访问 [Node.js 官网](https://nodejs.org/)

### 2. 安装核心包

**为什么需要两个核心包？**

| 包名 | 作用 | 大小 | 是否必需 |
|------|------|------|----------|
| **langchain** | 完整框架，包含所有功能 | 较大 | ✅ 必需 |
| **@langchain/core** | 核心库，提供基础类型和接口 | 较小 | ✅ 必需 |

**安装命令：**

```bash
# npm
npm install langchain @langchain/core

# pnpm
pnpm add langchain @langchain/core

# yarn
yarn add langchain @langchain/core

# bun
bun add langchain @langchain/core
```

> 💡 **人话解读**：
> - `langchain` 是完整的工具箱，包含所有工具
> - `@langchain/core` 是工具箱的基础零件，被其他模块依赖
> - 两个都要装，否则会缺零件

### 3. 安装模型集成包

**根据你想用的模型选择：**

| 模型提供商 | 安装命令 | 模型标识 | 示例 |
|-----------|----------|----------|------|
| **OpenAI** | `npm install @langchain/openai` | `openai:model` | `openai:gpt-4.1` |
| **Anthropic** | `npm install @langchain/anthropic` | `anthropic:model` | `anthropic:claude-3.5-sonnet` |
| **Google** | `npm install @langchain/google-genai` | `google:model` | `google:gemini-1.5-pro` |
| **Mistral** | `npm install @langchain/mistralai` | `mistralai:model` | `mistralai:mistral-large-2` |
| **Cohere** | `npm install @langchain/cohere` | `cohere:model` | `cohere:command-r-plus` |
| **Azure OpenAI** | `npm install @langchain/openai` | `azure-openai:model` | `azure-openai:gpt-4` |

> ⚠️ **注意**：安装哪个模型的包，才能用哪个模型。如果只装了 `@langchain/openai`，就不能用 Anthropic 的模型。

### 4. 配置 API Key

**最安全的方式：环境变量**

#### 方法一：临时设置（仅当前终端）

```bash
# OpenAI
export OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# Anthropic
export ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx

# Google
export GOOGLE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxx
```

#### 方法二：持久设置（推荐）

**Mac/Linux：**

编辑 `~/.bashrc` 或 `~/.zshrc`：

```bash
# 打开文件
nano ~/.zshrc

# 添加以下内容
export OPENAI_API_KEY=sk-xxx
export ANTHROPIC_API_KEY=sk-ant-xxx

# 保存并生效
source ~/.zshrc
```

**Windows：**

1. 右键"此电脑" → 属性 → 高级系统设置 → 环境变量
2. 在"用户变量"中点击"新建"
3. 变量名输入 `OPENAI_API_KEY`，变量值输入你的 API Key
4. 同理添加其他 API Key

#### 方法三：使用 `.env` 文件（开发环境）

**安装 dotenv：**

```bash
npm install dotenv
```

**创建 `.env` 文件：**

```env
# .env 文件
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
```

**在代码中加载：**

```typescript
import dotenv from "dotenv";
dotenv.config();  // 加载 .env 文件

// 现在可以用 process.env.OPENAI_API_KEY 了
```

> ⚠️ **安全提示**：
> - `.env` 文件不要提交到 GitHub！在 `.gitignore` 中添加 `*.env`
> - 生产环境建议使用云服务的密钥管理服务

---

## 验证安装

### 快速验证：10 行代码

```typescript
import { createAgent } from "langchain";

// 测试 OpenAI
const agent1 = createAgent({
  model: "openai:gpt-4.1",
});

// 测试 Anthropic （需要安装 @langchain/anthropic）
const agent2 = createAgent({
  model: "anthropic:claude-3.5-sonnet",
});

console.log("LangChain 安装成功！");
console.log("OpenAI 模型配置：", agent1 ? "✅" : "❌");
console.log("Anthropic 模型配置：", agent2 ? "✅" : "❌");
```

### 常见错误与解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| `Cannot find module 'langchain'` | 核心包没安装 | 运行 `npm install langchain @langchain/core` |
| `Provider not found: openai` | 模型集成包没安装 | 运行 `npm install @langchain/openai` |
| `API key not found` | API Key 没配置 | 检查环境变量或 .env 文件 |
| `429 Too Many Requests` | API 调用频率过高 | 检查是否有死循环，或升级 API 计划 |
| `401 Unauthorized` | API Key 无效 | 检查 API Key 是否正确，是否过期 |
| `Node.js version v18.x is not supported` | Node.js 版本太低 | 升级到 Node.js 20+ |

> 💡 **人话解读**：
> - 找不到模块 → 没装对应的包
> - API Key 错误 → 配置有问题
> - 版本错误 → Node.js 版本太低

---

## 业务场景：不同用户的安装选择

| 用户类型 | 需求 | 推荐安装包 | 配置重点 |
|---------|------|------------|----------|
| **新手学习** | 快速上手，试试不同模型 | `langchain @langchain/core @langchain/openai @langchain/anthropic` | 用 `.env` 文件管理 API Key |
| **生产开发** | 稳定可靠，安全第一 | `langchain @langchain/core @langchain/openai` | 使用云服务密钥管理 |
| **成本敏感** | 想省钱，用开源模型 | `langchain @langchain/core @langchain/mistralai` | 选择便宜的模型 |
| **多模型对比** | 实验不同模型效果 | 所有模型集成包 | 环境变量统一管理 |
| **Azure 用户** | 企业级需求，合规要求 | `langchain @langchain/core @langchain/openai` | 配置 Azure 端点 |

### 示例：企业级配置（Azure OpenAI）

**安装：**

```bash
npm install langchain @langchain/core @langchain/openai
```

**配置：**

```bash
export AZURE_OPENAI_API_KEY=xxxxxxxxxxxxxxxx
export AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
export AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

**使用：**

```typescript
const agent = createAgent({
  model: "azure-openai:gpt-4",
});
```

---

## 总结对比表

| 包名 | 作用 | 是否必需 | 大小 | 适用场景 |
|------|------|----------|------|----------|
| **langchain** | 完整框架，所有功能 | ✅ 必需 | 较大 | 所有场景 |
| **@langchain/core** | 核心库，基础类型 | ✅ 必需 | 较小 | 所有场景 |
| **@langchain/openai** | OpenAI 集成 | ❌ 按需 | 中等 | 使用 OpenAI 模型 |
| **@langchain/anthropic** | Anthropic 集成 | ❌ 按需 | 中等 | 使用 Claude 模型 |
| **@langchain/google-genai** | Google 集成 | ❌ 按需 | 中等 | 使用 Gemini 模型 |
| **@langchain/mistralai** | Mistral 集成 | ❌ 按需 | 中等 | 使用 Mistral 模型 |
| **dotenv** | 加载 .env 文件 | ❌ 开发环境 | 很小 | 本地开发 |

---

## 核心要点回顾

1. ✅ **环境要求**：Node.js 20+，Bun v1.0.0+（如果用 Bun）

2. ✅ **必装包**：`langchain` + `@langchain/core`（核心框架）

3. ✅ **模型包**：想用哪个模型，就装哪个模型的集成包
   - OpenAI → `@langchain/openai`
   - Anthropic → `@langchain/anthropic`
   - Google → `@langchain/google-genai`

4. ✅ **API Key 配置**：
   - 开发环境：`.env` 文件 + `dotenv`
   - 生产环境：环境变量或云服务密钥管理
   - **绝对不要**硬编码在代码里！

5. ✅ **验证步骤**：
   - 运行简单的创建 Agent 代码
   - 检查是否能成功初始化不同模型
   - 处理常见错误：模块缺失、API Key 错误、版本问题

---

## 下一步学习

| 主题 | 链接 | 说明 |
|------|------|------|
| 快速开始 | [03-quickstart.md](./03-quickstart.md) | 10 行代码创建第一个 Agent |
| Agent 详解 | [04-agents.md](./04-agents.md) | 深入理解 Agent 的工作原理 |
| Models | [05-models.md](./05-models.md) | 模型配置和调用方式详解 |
| Tools | [07-tools.md](./07-tools.md) | 如何定义和使用工具 |

---

**记住：安装配置是 AI 开发的第一步，也是最基础的一步**。

把环境搭好，后面的开发会顺畅很多。就像盖房子一样，地基打好了，楼才能盖得高。

现在，你的 LangChain 开发环境已经准备就绪，接下来就是创造奇迹的时候了！🚀
