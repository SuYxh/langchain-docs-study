# Deep Agents 自定义模型提供商 - 深度解读

---

## 1. 一句话省流 (The Essence)

**Deep Agents CLI 就像一个"万能插座"，让你可以接入几乎任何大语言模型（OpenAI、Anthropic、Google、本地Ollama等），而且换模型就像换台灯一样简单。**

简单说：你不用被绑定在某一家模型厂商上，想用谁就用谁，想换就换，配置一下就行。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：被厂商"锁死"的烦恼

在没有这个功能之前，开发者会遇到这些倒霉事：

| 痛点 | 具体表现 |
|------|----------|
| **厂商锁定** | 代码写死了用 OpenAI，想换成 Claude 或者国产模型？得改一堆代码 |
| **成本焦虑** | OpenAI 太贵了，想试试便宜的模型，但切换成本太高 |
| **新模型尝鲜难** | 新模型发布了（比如 GPT-5），但工具还没支持，干着急 |
| **本地部署麻烦** | 想用本地的 Ollama 跑开源模型省钱，但不知道怎么接入 |
| **参数调优麻烦** | 不同任务想用不同的 temperature，每次都要改代码 |

### 解决方案：统一的"模型适配层"

Deep Agents CLI 的做法很聪明：

```
┌─────────────────────────────────────────────────────────┐
│                    Deep Agents CLI                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │           统一的模型接口（LangChain）              │    │
│  └─────────────────────────────────────────────────┘    │
│        │          │          │           │              │
│        v          v          v           v              │
│   ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐        │
│   │ OpenAI │ │Anthropic│ │ Google │ │  Ollama  │  ...   │
│   └────────┘ └────────┘ └────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────┘
```

**核心思路**：不管底层用什么模型，上层的调用方式都一样。就像 USB 接口一样，不管是苹果手机还是安卓手机，只要有 USB 口就能充电。

---

## 3. 生活化类比 (The Analogy)

### 比喻：智能家居的"万能遥控器"

想象一下，你家里有各种品牌的智能设备：

- **小米的空调**
- **海尔的电视**
- **格力的风扇**
- **自己组装的 DIY 灯**

每个设备都有自己的遥控器/APP，切换设备要换遥控器，太麻烦了！

**Deep Agents CLI 就像一个万能遥控器：**

| 类比角色 | 对应概念 | 说明 |
|----------|----------|------|
| 万能遥控器 | Deep Agents CLI | 统一的控制入口 |
| 各品牌设备 | 不同的 LLM 提供商 | OpenAI、Anthropic、Ollama 等 |
| 遥控器适配码 | Provider Package | `langchain-openai`、`langchain-anthropic` 等 |
| 设备配对码 | API Key | `OPENAI_API_KEY`、`ANTHROPIC_API_KEY` |
| 遥控器设置菜单 | config.toml 配置文件 | 保存你的偏好设置 |
| 切换设备按钮 | `/model` 命令 | 快速切换不同模型 |
| 默认设备 | default model | 开机自动控制的设备 |

**使用流程类比：**

1. **买适配器**（安装 provider package）：要控制小米空调，先买个小米适配器
2. **输入配对码**（设置 API Key）：让遥控器和设备配对
3. **开始使用**（运行 CLI）：按一下按钮就能控制了
4. **切换设备**（`/model` 命令）：想控制电视？按个切换键就行

---

## 4. 关键概念拆解 (Key Concepts)

### 4.1 Provider（提供商）

**大白话**：就是"谁家的模型"。OpenAI 是一个 Provider，Anthropic 是另一个 Provider，就像"移动"和"联通"是不同的运营商。

### 4.2 Provider Package（提供商包）

**大白话**：就是"驱动程序"。想用打印机得先装驱动，想用 OpenAI 的模型得先装 `langchain-openai` 这个包。

```bash
# 装一个驱动
uv tool install 'deepagents-cli[openai]'

# 装多个驱动
uv tool install 'deepagents-cli[anthropic,openai,groq]'
```

### 4.3 Model Profile（模型配置文件）

**大白话**：就是"设备说明书"。里面写着这个模型叫什么名字、有什么能力、默认参数是多少。有些厂商（如 OpenAI）自带说明书，有些（如 Ollama）需要你自己写。

### 4.4 Model Resolution Order（模型解析顺序）

**大白话**：就是"CLI 怎么决定用哪个模型"的优先级规则。

```
命令行指定（--model）> 配置文件默认值 > 最近使用的 > 自动检测有 API Key 的
```

就像你回家开灯：
1. 你说"开客厅灯" -> 就开客厅灯（命令行指定）
2. 你没说 -> 开你设置的默认灯（配置文件）
3. 没设默认 -> 开你上次开的那个灯（最近使用）
4. 都没有 -> 随便开一个能开的灯（自动检测）

### 4.5 Compatible APIs（兼容接口）

**大白话**：很多小厂商的 API 格式和 OpenAI/Anthropic 一样（山寨版？），所以你可以用 OpenAI 的包去调用它们，只要改一下地址（base_url）。

---

## 5. 代码/配置"人话"解读 (Code Walkthrough)

### 5.1 安装命令解读

```bash
uv tool install 'deepagents-cli[anthropic,openai,groq]'
```

**人话翻译**：
> "嘿，帮我装一下 Deep Agents 命令行工具，顺便把 Anthropic、OpenAI、Groq 三家的驱动都装上，我可能都会用到。"

### 5.2 配置文件解读

```toml
[models.providers.ollama]
models = ["qwen3:4b", "llama3"]

[models.providers.ollama.params]
temperature = 0
num_ctx = 8192

[models.providers.ollama.params."qwen3:4b"]
temperature = 0.5
num_ctx = 4000
```

**人话翻译**：

```
第1-2行：告诉 CLI "我本地有两个模型可以用：qwen3:4b 和 llama3"
         这样在模型选择菜单里就能看到它们了

第4-6行：给 Ollama 的所有模型设置"默认参数"
         - temperature = 0 意味着：回答要稳定、不要天马行空
         - num_ctx = 8192 意味着：上下文窗口设为 8192 个 token

第8-10行：但是！qwen3:4b 这个模型比较特殊，我想给它单独设置
         - temperature = 0.5：让它稍微有点创意
         - num_ctx = 4000：它比较小，上下文窗口调小一点
```

**参数合并逻辑（重点）**：

| 模型 | 最终参数 | 原因 |
|------|----------|------|
| `ollama:llama3` | `{temperature: 0, num_ctx: 8192}` | 用通用设置 |
| `ollama:qwen3:4b` | `{temperature: 0.5, num_ctx: 4000}` | 专属设置覆盖通用设置 |

### 5.3 兼容 API 配置解读

```toml
[models.providers.openai]
base_url = "https://api.example.com/v1"
api_key_env = "EXAMPLE_API_KEY"
models = ["my-model"]
```

**人话翻译**：
> "我要用一个山寨 OpenAI 的服务（比如某个国内中转服务），它的地址是 `https://api.example.com/v1`，API Key 存在 `EXAMPLE_API_KEY` 这个环境变量里，模型名字叫 `my-model`。"

### 5.4 自定义提供商（高级）

```toml
[models.providers.my_custom]
class_path = "my_package.models:MyChatModel"
api_key_env = "MY_API_KEY"
```

**人话翻译**：
> "我自己写了一个模型类，代码在 `my_package/models.py` 文件里，类名叫 `MyChatModel`。请用这个类来创建模型实例。"

这个功能适合：
- 公司内部有自研模型服务
- 想接入一个 LangChain 官方还没支持的模型
- 需要在模型调用前后加一些自定义逻辑

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：创业公司的 AI 客服系统

**背景**：小王在一家创业公司做开发，要搭建一个 AI 客服系统。

#### 阶段一：快速验证（用贵的）

刚开始，预算充足，追求效果：

```bash
# 直接用最强的 Claude
deepagents --model anthropic:claude-opus-4-6
```

效果很好，但一个月烧了 5000 美元...

#### 阶段二：成本优化（换便宜的）

老板说要省钱：

```toml
# ~/.deepagents/config.toml
[models]
default = "deepseek:deepseek-chat"  # 便宜又好用

[models.providers.deepseek.params]
temperature = 0.3  # 客服回答要稳定
```

```bash
# 现在默认就用 DeepSeek
deepagents
```

成本降到了 500 美元/月，效果也不错！

#### 阶段三：本地部署（更省钱）

用户量上来了，想完全省掉 API 费用：

```toml
# ~/.deepagents/config.toml
[models.providers.ollama]
base_url = "http://192.168.1.100:11434"  # 公司服务器
models = ["qwen3:14b"]

[models.providers.ollama.params]
temperature = 0.3
num_ctx = 32768

[models]
default = "ollama:qwen3:14b"
```

现在 API 费用是 0，只需要一台 GPU 服务器。

#### 阶段四：灵活切换（不同场景用不同模型）

业务复杂了，不同场景用不同模型：

```bash
# 简单问答 - 用便宜的
deepagents --model ollama:qwen3:4b

# 复杂推理 - 用强的
deepagents --model anthropic:claude-sonnet-4-5

# 代码生成 - 用专业的
deepagents --model deepseek:deepseek-coder
```

**总结收益**：

| 收益点 | 具体表现 |
|--------|----------|
| 成本灵活 | 从 5000 美元/月降到几乎 0 |
| 无缝切换 | 换模型不用改代码，改配置就行 |
| 风险分散 | OpenAI 挂了？秒切 Anthropic |
| 尝鲜方便 | 新模型发布，`/model` 一下就能试 |

---

## 7. 速查表：常用命令和配置

### 模型切换命令

```bash
# 启动时指定模型
deepagents --model openai:gpt-4o

# 运行时切换（交互式菜单）
/model

# 运行时直接切换
/model anthropic:claude-sonnet-4-5

# 设置默认模型
deepagents --default-model openai:gpt-4o

# 查看当前默认
deepagents --default-model

# 清除默认
deepagents --clear-default-model
```

### 常用提供商 API Key

| 提供商 | 环境变量 | 
|--------|----------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Google | `GOOGLE_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Ollama | 不需要（本地部署）|

### 配置文件位置

```
~/.deepagents/config.toml
```

---

## 8. 避坑指南

### 坑1：忘了装 Provider Package

```
错误：ModuleNotFoundError: No module named 'langchain_anthropic'
```

**解决**：
```bash
uv tool upgrade deepagents-cli --with langchain-anthropic
```

### 坑2：API Key 没设置

```
错误：AuthenticationError: Invalid API key
```

**解决**：
```bash
export OPENAI_API_KEY="sk-xxx"  # 或加到 .bashrc/.zshrc
```

### 坑3：Ollama 模型不显示

Ollama 没有 model profile，所以 `/model` 菜单里看不到。

**解决**：手动配置
```toml
[models.providers.ollama]
models = ["llama3", "qwen3:4b", "codellama"]
```

### 坑4：参数没生效

检查优先级：命令行 > 模型专属配置 > 提供商通用配置

```bash
# 命令行参数优先级最高
deepagents --model-params '{"temperature": 0.9}'
```

---

## 9. 总结

Deep Agents 的自定义模型提供商功能，本质上是给你提供了一套**"模型自由切换"的基础设施**：

1. **插件化设计**：想用哪家模型，装个包就行
2. **统一接口**：不管用谁家的模型，调用方式一样
3. **灵活配置**：从 API Key 到参数调优，全都可配置
4. **无缝切换**：开发时用贵的，上线用便宜的，一行命令搞定

这就是为什么说 Deep Agents CLI 像"万能插座"——它让你在 AI 模型的世界里来去自如，不被任何一家厂商绑架。

---

*文档解读完成 | 基于 Deep Agents CLI 官方文档*
