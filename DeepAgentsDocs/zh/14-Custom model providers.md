> ## 文档索引
> 在此获取完整文档索引：https://docs.langchain.com/llms.txt
> 在继续探索之前，使用此文件来发现所有可用页面。

# 自定义模型提供方

> 为 Deep Agents CLI 配置任意与 LangChain 兼容的模型提供方

Deep Agents CLI 支持任意[与 LangChain 兼容的聊天模型提供方](/oss/javascript/langchain/models)，从而几乎可以使用任何支持工具调用的 LLM。任何暴露 OpenAI 兼容或 Anthropic 兼容 API 的服务也可开箱即用——参见[兼容 API](#compatible-apis)。

## 快速开始

CLI 会自动集成[以下模型提供方](#provider-reference)——除安装相关提供方软件包外，无需额外配置。

1. **安装提供方软件包**

   每个模型提供方都需要安装其对应的 LangChain 集成包。在安装 CLI 时，这些包作为可选 extra 提供：

   ```bash  theme={null}
   # 安装并启用一个提供方
   uv tool install 'deepagents-cli[anthropic]'

   # 一次安装并启用多个提供方
   uv tool install 'deepagents-cli[anthropic,openai,groq]'

   # 之后再添加额外的软件包
   uv tool upgrade deepagents-cli --with langchain-ollama

   # 所有提供方
   uv tool install 'deepagents-cli[anthropic,bedrock,cohere,deepseek,fireworks,google-genai,groq,huggingface,ibm,mistralai,nvidia,ollama,openai,openrouter,perplexity,vertexai,xai]'
   ```

2. **设置 API key**

   大多数提供方都需要 API key。请设置下表中列出的对应环境变量。具体细节请参阅各集成包的文档。

### 提供方参考

使用的提供方不在列表中？请参阅[任意提供方](#arbitrary-providers)——任何与 LangChain 兼容的提供方都可以在 CLI 中使用，但需要进行一些额外设置。

| 提供方               | 软件包                                                       | API key 环境变量                           | 模型配置档案 |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------ | ------------ |
| OpenAI               | [`langchain-openai`](/oss/javascript/integrations/chat/openai) | `OPENAI_API_KEY`                           | ✅            |
| Anthropic            | [`langchain-anthropic`](/oss/javascript/integrations/chat/anthropic) | `ANTHROPIC_API_KEY`                        | ✅            |
| Google Gemini API    | [`langchain-google-genai`](/oss/javascript/integrations/chat/google_generative_ai) | `GOOGLE_API_KEY`                           | ✅            |
| Google Vertex AI     | [`langchain-google-vertexai`](/oss/javascript/integrations/chat/google_generative_ai#credentials) | `GOOGLE_CLOUD_PROJECT`                     | ✅            |
| AWS Bedrock          | [`langchain-aws`](/oss/javascript/integrations/chat/bedrock) | `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY` | ✅         |
| AWS Bedrock Converse | [`langchain-aws`](/oss/javascript/integrations/chat/bedrock) | `AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY` | ✅         |
| Ollama               | [`langchain-ollama`](/oss/javascript/integrations/chat/ollama) | 可选                                       | ❌            |
| Groq                 | [`langchain-groq`](/oss/javascript/integrations/chat/groq)   | `GROQ_API_KEY`                             | ✅            |
| Cohere               | [`langchain-cohere`](/oss/javascript/integrations/chat/cohere) | `COHERE_API_KEY`                           | ❌            |
| Fireworks            | [`langchain-fireworks`](/oss/javascript/integrations/chat/fireworks) | `FIREWORKS_API_KEY`                        | ✅            |
| DeepSeek             | [`langchain-deepseek`](/oss/javascript/integrations/chat/deepseek) | `DEEPSEEK_API_KEY`                         | ✅            |
| xAI                  | [`langchain-xai`](/oss/javascript/integrations/chat/xai)     | `XAI_API_KEY`                              | ✅            |
| Perplexity           | [`langchain-perplexity`](/oss/javascript/integrations/chat/perplexity) | `PPLX_API_KEY`                             | ✅            |

<Tip>
  **[模型配置档案（model profile）](/oss/javascript/langchain/models#model-profiles)**是一组随提供方软件包一起发布的元数据（模型名、默认参数、能力等），主要由 [models.dev](https://models.dev/) 项目驱动。包含模型配置档案的提供方，其模型会自动出现在交互式 `/model` 切换器中；不包含模型配置档案的提供方则需要你直接指定模型名。
</Tip>

### 切换模型

要在 CLI 中切换模型，可以：

1. **使用交互式模型切换器**：通过 `/model` 命令打开。它会显示一份硬编码的已知模型配置档案列表，这些配置档案来源于各个 LangChain 提供方软件包。

   <Note>
     这些配置档案并不是可用模型的穷尽列表。如果你想要的模型未显示，请改用选项 2（对于尚未被加入配置档案的新发布模型尤其有用）。
   </Note>
2. **直接指定模型名**：例如 `/model openai:gpt-4o`。你可以使用所选提供方支持的任意模型，而不论它是否出现在选项 1 的列表中。模型名会被传入 API 请求。
3. **在启动时指定模型**：通过 `--model`，例如：

   ```txt  theme={null}
   deepagents --model openai:gpt-4o
   ```

### 设置默认模型

你可以设置一个持久化默认模型，用于未来所有 CLI 启动：

* **通过模型选择器**：打开 `/model`，导航到目标模型，并按 `Ctrl+S` 将其固定为默认值。在当前默认模型上再次按 `Ctrl+S` 会清除默认值。
* **通过命令**：`/model --default provider:model`（例如 `/model --default anthropic:claude-opus-4-6`）
* **通过配置文件**：在 `~/.deepagents/config.toml` 中设置 `[models].default`（参见[配置文件](#config-file)）。
* **通过 shell：**

  ```bash  theme={null}
  deepagents --default-model anthropic:claude-opus-4-6
  ```

查看当前默认值：

```bash  theme={null}
deepagents --default-model
```

清除默认值：

* **通过 shell：**

  ```bash  theme={null}
  deepagents --clear-default-model
  ```

* **通过命令**：`/model --default --clear`

* **通过模型选择器**：在当前已固定的默认模型上按 `Ctrl+S`。

如果未设置默认值，CLI 会默认使用最近一次使用的模型。

### 模型解析顺序

当 CLI 启动时，会按以下顺序解析要使用的模型：

1. **`--model` 标志**：只要提供，就始终优先生效。
2. `~/.deepagents/config.toml` 中的 **`[models].default`**：用户有意设置的长期偏好。
3. `~/.deepagents/config.toml` 中的 **`[models].recent`**：通过 `/model` 最近一次切换到的模型。该值自动写入；永远不会覆盖 `[models].default`。
4. **环境变量自动检测**：回退到第一个具有有效 API key 的提供方，按以下顺序检查：`OPENAI_API_KEY`、`ANTHROPIC_API_KEY`、`GOOGLE_API_KEY`、`GOOGLE_CLOUD_PROJECT`（Vertex AI）。

***

## 配置文件

Deep Agents CLI 允许通过 `~/.deepagents/config.toml` 扩展与修改单个模型与提供方配置。

每个提供方都是 `[models.providers]` 命名空间下的一个 TOML 表：

```toml  theme={null}
[models.providers.<name>]
models = ["gpt-4o"]
api_key_env = "OPENAI_API_KEY"
base_url = "https://api.openai.com/v1"
class_path = "my_package.models:MyChatModel"

[models.providers.<name>.params]
temperature = 0
max_tokens = 4096

[models.providers.<name>.params."gpt-4o"]
temperature = 0.7
```

**键：**

<ResponseField name="models" type="string[]">
  要在交互式 `/model` 切换器中为该提供方展示的模型名列表。对于已随包提供模型配置档案的提供方，你在此处添加的任何名称都会与内置名称一起显示——这对尚未加入配置档案的新发布模型很有用。对于[任意提供方](#arbitrary-providers)，该列表是切换器中模型的唯一来源。

  该键为可选项。无论模型名是否出现在切换器中，你都可以始终通过 `/model` 或 `--model` 直接传入任意模型名；提供方会在发起请求时验证名称。
</ResponseField>

<ResponseField name="api_key_env" type="string">
  可选：覆盖用于检查凭据的环境变量名。
</ResponseField>

<ResponseField name="base_url" type="string">
  可选：如果提供方支持，则覆盖提供方使用的 base URL。更多信息请参阅你所用提供方软件包的[参考文档](https://reference.langchain.com/python/integrations/)。
</ResponseField>

<ResponseField name="params" type="object">
  额外的关键字参数，会被转发到模型构造函数。扁平键（例如 `temperature = 0`）适用于该提供方的所有模型。以模型名为键的子表（例如 `[params."gpt-4o"]`）只覆盖该模型的单个值；合并为浅合并（冲突时以模型覆盖项为准）。
</ResponseField>

<ResponseField name="class_path" type="string">
  用于[任意模型](#arbitrary-providers)提供方。可选：以 `module.path:ClassName` 格式指定完整限定的 Python 类。当设置后，CLI 会为提供方 `<name>` 直接导入并实例化该类。该类必须是 `BaseChatModel` 的子类。
</ResponseField>

你可以在 `~/.deepagents/config.toml` 中设置默认模型——可以直接编辑文件、使用 `/model --default`，或在交互式模型切换器中选择默认值。

```toml  theme={null}
[models]
default = "ollama:qwen3:4b"               # 你有意设置的长期偏好
recent = "anthropic:claude-sonnet-4-5"    # 最近一次 /model 切换（自动写入）
```

`[models].default` 总是优先于 `[models].recent`。`/model` 命令只会写入 `[models].recent`，因此你配置的默认值永远不会被会话中途切换覆盖。要移除默认值，可使用 `/model --default --clear`，或从配置文件中删除 `default` 键。

## 示例

### 模型构造参数

任何提供方都可以使用 `params` 表向模型构造函数传入额外参数：

```toml  theme={null}
[models.providers.ollama.params]
temperature = 0
num_ctx = 8192
```

#### 按模型覆盖

如果某个特定模型需要不同的 params，可在 `params` 下添加一个以模型名为键的子表，以覆盖单个值而无需复制整段提供方配置：

```toml  theme={null}
[models.providers.ollama]
models = ["qwen3:4b", "llama3"]

[models.providers.ollama.params]
temperature = 0
num_ctx = 8192

[models.providers.ollama.params."qwen3:4b"]
temperature = 0.5
num_ctx = 4000
```

使用该配置时：

* `ollama:qwen3:4b` 会得到 `{temperature: 0.5, num_ctx: 4000}` — 模型覆盖项优先生效。
* `ollama:llama3` 会得到 `{temperature: 0, num_ctx: 8192}` — 无覆盖项，仅使用提供方级 params。

合并为浅合并：模型子表中出现的任意键都会替换提供方级 params 中同名键；仅在提供方级出现的键会被保留。

#### 使用 `--model-params` 在 CLI 中覆盖

如果只想做一次性调整而不编辑配置文件，可以通过 `--model-params` 传入一个 JSON 对象：

```bash  theme={null}
deepagents --model ollama:llama3 --model-params '{"temperature": 0.9, "num_ctx": 16384}'

# 非交互模式
deepagents -n "总结这个仓库" --model ollama:llama3 --model-params '{"temperature": 0}'
```

这些覆盖项优先级最高，会覆盖配置文件 params 中的值。

### 指定自定义 `base_url`

某些提供方软件包接受 `base_url` 用于覆盖默认端点。例如，`langchain-ollama` 通过底层 `ollama` 客户端默认使用 `http://localhost:11434`。若要指向其他地址，可在配置中设置 `base_url`：

```toml  theme={null}
[models.providers.ollama]
base_url = "http://your-host-here:port"
```

关于兼容性信息与其他注意事项，请参阅你所用提供方的参考文档。

### 兼容 API

许多 LLM 提供方暴露的 API 在协议层与 OpenAI 或 Anthropic 兼容。你可以通过将 `base_url` 指向该提供方端点，继续使用现有的 `langchain-openai` 或 `langchain-anthropic` 软件包。需要注意的是，提供方在规范之上添加的额外特性可能无法完整覆盖。

例如，使用一个 OpenAI 兼容提供方：

```toml  theme={null}
[models.providers.openai]
base_url = "https://api.example.com/v1"
api_key_env = "EXAMPLE_API_KEY"
models = ["my-model"]
```

或使用一个 Anthropic 兼容提供方：

```toml  theme={null}
[models.providers.anthropic]
base_url = "https://api.example.com"
api_key_env = "EXAMPLE_API_KEY"
models = ["my-model"]
```

### 将模型加入交互式切换器

某些提供方（例如 `langchain-ollama`）不附带模型配置档案数据（完整列表请参阅[提供方参考](#provider-reference)）。此时，交互式 `/model` 切换器不会列出该提供方的模型。你可以在配置文件中为该提供方定义一个 `models` 列表来补齐：

```toml  theme={null}
[models.providers.ollama]
models = ["llama3", "mistral", "codellama"]
```

此后，`/model` 切换器将包含一个 Ollama 分组，并列出这些模型。

这完全是可选的。你始终可以通过直接指定完整名称来切换到任意模型：

```txt  theme={null}
/model ollama:llama3
```

### 任意提供方

你可以通过 `class_path` 使用任意 [LangChain `BaseChatModel`](https://reference.langchain.com/python/langchain_core/language_models/#langchain_core.language_models.BaseChatModel) 子类。CLI 会直接导入并实例化它：

```toml  theme={null}
[models.providers.my_custom]
class_path = "my_package.models:MyChatModel"
api_key_env = "MY_API_KEY"
base_url = "https://my-endpoint.example.com"

[models.providers.my_custom.params]
temperature = 0
max_tokens = 4096
```

该软件包必须安装在与 `deepagents-cli` 相同的 Python 环境中：

```bash  theme={null}
# 如果 deepagents-cli 是通过 uv tool 安装的：
uv tool upgrade deepagents-cli --with my_package
```

当你切换到 `my_custom:my-model-v1`（通过 `/model` 或 `--model`）时，模型名（`my-model-v1`）会作为 `model` kwarg 传入：

```python  theme={null}
MyChatModel(model="my-model-v1", base_url="...", api_key="...", temperature=0, max_tokens=4096)
```

<Warning>
  `class_path` 会执行来自配置文件的任意 Python 代码。这与 `pyproject.toml` 构建脚本采用相同的信任模型——你控制的是你自己的机器。
</Warning>

你的提供方软件包也可以选择在 `<package>.data._profiles` 的 `_PROFILES` 字典中提供模型配置档案，而不是在 `models` 键下定义。更多信息请参阅 LangChain 的[模型配置档案](https://github.com/langchain-ai/langchain/tree/master/libs/model-profiles)。

***

<Callout icon="edit">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/deepagents/cli/providers.mdx)或[提交 issue](https://github.com/langchain-ai/docs/issues/new/choose)。
</Callout>

<Callout icon="terminal-2">
  通过 MCP 将[连接这些文档](/use-these-docs)到 Claude、VSCode 等，以获得实时答案。
</Callout>
