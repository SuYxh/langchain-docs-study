# Deep Agents Backends 深度解读

---

## 1. 一句话省流 (The Essence)

**Backend（后端）就是 AI Agent 的"文件管家"，它决定了 Agent 把文件存在哪里、怎么读写文件。**

你可以把它理解为：Agent 需要一个"存储空间"来放它的工作文件，Backend 就是帮你选择这个存储空间是放在内存里（临时的）、本地硬盘（真实的）、云端数据库（持久的），还是一个安全沙箱里（隔离的）。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：AI Agent 的"无处安身"困境

想象一下，你让 AI Agent 帮你写代码、做数据分析。这个过程中，Agent 需要：
- 读取你的项目文件
- 创建临时的中间结果
- 保存最终产出物
- 有时候还需要执行 shell 命令

**但问题来了：**

1. **安全风险** - 如果让 Agent 随便访问你电脑上的所有文件，万一它读到了你的密码文件、API 密钥，再通过网络发出去呢？
2. **数据丢失** - Agent 在对话中产生的临时文件，对话结束就没了，下次还得重新来
3. **场景不同** - 开发环境想让 Agent 随便折腾，生产环境却需要严格隔离
4. **多源整合** - 有时候 Agent 需要同时访问本地文件和云端数据库

### 解决方案：可插拔的 Backend 架构

Deep Agents 设计了一套**可插拔的后端系统**，让你根据不同场景选择不同的"存储管家"：

| 场景 | 推荐 Backend | 理由 |
|------|-------------|------|
| 本地开发调试 | `FilesystemBackend` / `LocalShellBackend` | 方便，能直接操作本地文件 |
| 生产环境 API | `StateBackend` / `StoreBackend` | 安全，不暴露真实文件系统 |
| 需要执行代码 | Sandbox（Modal/Daytona/Deno） | 隔离，代码在沙箱里跑 |
| 混合需求 | `CompositeBackend` | 灵活，不同路径对应不同后端 |

---

## 3. 生活化/职场类比 (The Analogy)

### 类比：AI Agent 是一个"实习生"，Backend 是他的"办公区域"

想象你公司来了一个超级能干的实习生（AI Agent），他可以帮你处理各种文件工作。但问题是：**你给他什么样的办公环境？**

#### 场景一：StateBackend = 临时工位（热桌）

```
实习生坐在一个"热桌"工位，桌上有纸笔可以临时记录。
但每天下班后，桌子会被清理干净。
```

- **特点**：临时存储，对话结束就清空
- **适用**：Agent 的草稿本、中间计算结果
- **代码映射**：`agent = create_deep_agent()` (默认就是这个)

#### 场景二：FilesystemBackend = 固定办公室

```
实习生有了自己的固定办公室，可以在里面放文件柜。
但你需要决定：给他多大的房间？能访问哪些区域？
```

- **特点**：真实读写你电脑的文件
- **风险**：如果不设限，他可能翻到你的机密文件夹
- **代码映射**：`FilesystemBackend(root_dir="/project", virtual_mode=True)`
  - `root_dir` = 他的办公室边界
  - `virtual_mode=True` = 禁止他走出办公室

#### 场景三：LocalShellBackend = 办公室 + 电脑权限

```
不仅有办公室，还给了他一台能联网、能装软件的电脑。
他可以执行任何命令，包括 rm -rf / 
```

- **特点**：能执行 shell 命令，权力很大
- **风险**：相当于给实习生 root 权限，慎用！
- **代码映射**：`LocalShellBackend(root_dir=".", env={...})`

#### 场景四：StoreBackend = 公司档案室

```
实习生可以把重要文件存到公司的档案室。
这些文件不会因为他离职（对话结束）而消失，
下次来新实习生还能继续用。
```

- **特点**：跨对话持久化存储
- **适用**：Agent 的长期记忆、用户偏好
- **代码映射**：`StoreBackend(rt)` + LangGraph Store

#### 场景五：CompositeBackend = 分区管理

```
实习生的工作区域被分成几块：
- /workspace/ -> 临时工位（热桌）
- /memories/ -> 档案室
- /docs/ -> 公司资料库（只读）
```

- **特点**：不同路径对应不同存储后端
- **适用**：复杂的混合存储需求
- **代码映射**：
  ```python
  CompositeBackend(
      default=StateBackend(rt),
      routes={
          "/memories/": StoreBackend(rt),
          "/docs/": FilesystemBackend(...)
      }
  )
  ```

#### 场景六：Sandbox = 隔离实验室

```
实习生被安排到一个完全隔离的实验室工作。
他可以在里面随便折腾，但绝对影响不到外面的世界。
```

- **特点**：完全隔离的执行环境
- **适用**：执行不信任的代码、生产环境
- **代码映射**：使用 Modal/Daytona/Deno 等沙箱

---

## 4. 关键概念拆解 (Key Concepts)

### 1) BackendProtocol（后端协议）

**大白话**：这是一份"工作说明书"，规定了任何 Backend 都必须会做的事情。

```
必须实现的能力：
- ls_info()    -> 列出目录内容（相当于 ls 命令）
- read()       -> 读取文件内容
- write()      -> 写入新文件
- edit()       -> 编辑现有文件
- glob_info()  -> 按模式匹配文件（如 *.py）
- grep_raw()   -> 在文件中搜索内容
```

### 2) virtual_mode（虚拟模式）

**大白话**：给 Agent 戴上"眼罩"，让它以为整个世界只有 `root_dir` 这个目录。

- `virtual_mode=False`：Agent 可以用 `../` 跳出限制目录
- `virtual_mode=True`：Agent 被锁死在限制目录里，无法逃逸

**重要警告**：即使设置了 `root_dir`，如果 `virtual_mode=False`，Agent 依然可以访问任何文件！

### 3) ToolRuntime（工具运行时）

**大白话**：Agent 的"上下文环境"，包含了 Agent 运行时需要的各种资源（状态、存储等）。

有些 Backend（如 StateBackend、StoreBackend）需要访问运行时资源，所以要用工厂函数：

```python
# 不需要运行时的 Backend
backend=FilesystemBackend(root_dir=".")

# 需要运行时的 Backend（用 lambda 创建工厂函数）
backend=(lambda rt: StateBackend(rt))
```

### 4) CompositeBackend Routes（组合路由）

**大白话**：就像快递分拣系统，根据地址前缀把包裹分到不同的仓库。

```python
routes={
    "/memories/": StoreBackend(rt),     # /memories/xxx 走这个
    "/memories/projects/": OtherBackend  # /memories/projects/xxx 走这个（更长的路径优先）
}
```

### 5) execute tool（执行工具）

**大白话**：让 Agent 能执行 shell 命令的"超能力"。

只有 `LocalShellBackend` 和沙箱类 Backend 才提供这个工具。这是把双刃剑：
- 好处：Agent 可以运行代码、安装依赖、执行脚本
- 风险：Agent 可以执行任何命令，包括删除文件、发送网络请求

---

## 5. 代码/配置"人话"解读 (Code Walkthrough)

### 示例 1：最简单的用法（默认 StateBackend）

```python
agent = create_deep_agent()
```

**人话解读**：
> "创建一个 Agent，给它一个临时的内存文件系统。它可以在对话期间创建文件、写东西，但对话结束后全部清空。就像给实习生一张白纸，用完就扔。"

### 示例 2：访问本地文件系统

```python
from deepagents.backends import FilesystemBackend

agent = create_deep_agent(
    backend=FilesystemBackend(root_dir="/Users/nh/project", virtual_mode=True)
)
```

**人话解读**：
> "创建一个 Agent，让它能读写我 `/Users/nh/project` 目录下的真实文件。`virtual_mode=True` 意味着它被锁在这个目录里，不能用 `../` 之类的手段逃出去访问其他地方。"

### 示例 3：组合多个 Backend

```python
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend

composite_backend = lambda rt: CompositeBackend(
    default=StateBackend(rt),
    routes={
        "/memories/": StoreBackend(rt),
    }
)

agent = create_deep_agent(
    backend=composite_backend,
    store=InMemoryStore()
)
```

**人话解读**：
> "创建一个 Agent，它有两个存储区域：
> 1. 默认区域（StateBackend）：临时的，对话结束就清空
> 2. `/memories/` 路径（StoreBackend）：持久的，跨对话保存
> 
> 这样 Agent 可以把重要的东西（比如学到的用户偏好）存到 `/memories/` 下面，下次对话还能用；临时的草稿就放默认区域，用完就扔。"

### 示例 4：TypeScript 版本的路由配置

```typescript
import { createDeepAgent, CompositeBackend, FilesystemBackend, StateBackend } from "deepagents";

const compositeBackend = (rt) => new CompositeBackend(
  new StateBackend(rt),
  {
    "/memories/": new FilesystemBackend({ rootDir: "/deepagents/myagent", virtualMode: true }),
  },
);

const agent = createDeepAgent({ backend: compositeBackend });
```

**人话解读**：
> "这是 TypeScript 版本，逻辑一样：
> - 访问 `/workspace/plan.md` -> 走 StateBackend（临时存储）
> - 访问 `/memories/agent.md` -> 走 FilesystemBackend，实际保存到 `/deepagents/myagent` 目录
> 
> `ls`、`glob`、`grep` 这些命令会智能地聚合两个 Backend 的结果。"

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：开发一个"AI 编程助手"

假设你要开发一个类似 Cursor/GitHub Copilot 的 AI 编程助手，它需要：

1. **读取用户的代码仓库**（真实文件）
2. **记住用户的编码风格偏好**（跨会话持久化）
3. **执行测试命令**（shell 执行）
4. **产生临时的分析结果**（临时存储）

#### 错误做法：只用 LocalShellBackend

```python
# 危险！Agent 可以访问整个系统
agent = create_deep_agent(
    backend=LocalShellBackend(root_dir="/")
)
```

**问题**：
- Agent 可能读到 `~/.ssh/id_rsa`（你的私钥）
- Agent 可能执行 `curl` 把敏感信息发到外网
- 没有任何隔离，一旦 Agent "发疯"，后果不堪设想

#### 正确做法：组合使用多种 Backend

```python
from deepagents import create_deep_agent
from deepagents.backends import CompositeBackend, StateBackend, StoreBackend, FilesystemBackend
from langgraph.store.postgres import PostgresStore

def create_coding_assistant(project_path: str):
    composite_backend = lambda rt: CompositeBackend(
        default=StateBackend(rt),  # 临时分析结果
        routes={
            "/project/": FilesystemBackend(
                root_dir=project_path, 
                virtual_mode=True  # 锁定在项目目录
            ),
            "/memories/": StoreBackend(rt),  # 用户偏好
        }
    )
    
    return create_deep_agent(
        backend=composite_backend,
        store=PostgresStore(...)  # 持久化存储
    )

# 使用
agent = create_coding_assistant("/Users/me/my-project")
```

**这样设计的好处**：

| 路径 | Backend | 用途 | 安全性 |
|------|---------|------|--------|
| `/project/*` | FilesystemBackend | 读写用户代码 | 被锁定在项目目录 |
| `/memories/*` | StoreBackend | 存储用户偏好 | 持久化到数据库 |
| 其他路径 | StateBackend | 临时草稿 | 对话结束清空 |

#### 如果需要执行代码怎么办？

**开发环境**：可以用 LocalShellBackend，但一定要：
1. 开启 Human-in-the-Loop（人工审批）
2. 限制 `root_dir`
3. 设置环境变量白名单

**生产环境**：必须用沙箱！

```python
from deepagents.sandboxes import DaytonaSandbox

sandbox = DaytonaSandbox(...)
agent = create_deep_agent(backend=sandbox)
```

---

## 7. 安全警示总结

### FilesystemBackend 安全清单

| 配置项 | 是否必须 | 说明 |
|--------|---------|------|
| `root_dir` | 推荐 | 限制访问范围 |
| `virtual_mode=True` | **必须** | 没有它，`root_dir` 形同虚设 |
| HITL 中间件 | 强烈推荐 | 敏感操作需人工审批 |

### LocalShellBackend 安全清单

| 风险 | 级别 | 说明 |
|------|------|------|
| 任意命令执行 | 致命 | Agent 可以执行 `rm -rf /` |
| 密钥泄露 | 严重 | Agent 可以读取并发送 `.env` 文件 |
| 资源耗尽 | 中等 | 命令可能消耗无限 CPU/内存 |

**黄金法则**：
> **生产环境永远不要用 LocalShellBackend，用沙箱替代！**

---

## 8. 速查表：如何选择 Backend

```
你的场景是什么？
│
├── 只是聊天，不需要文件操作
│   └── StateBackend（默认）
│
├── 需要访问本地文件
│   ├── 开发环境，信任 Agent
│   │   └── FilesystemBackend + virtual_mode=True
│   └── 生产环境
│       └── Sandbox（Modal/Daytona/Deno）
│
├── 需要执行 shell 命令
│   ├── 开发环境，信任 Agent
│   │   └── LocalShellBackend + HITL
│   └── 生产环境
│       └── Sandbox（绝对不要用 LocalShellBackend）
│
├── 需要跨对话记忆
│   └── StoreBackend
│
└── 混合需求（上面好几个都要）
    └── CompositeBackend
```

---

## 总结

Backend 是 Deep Agents 架构中的"存储层抽象"，它解耦了 Agent 的文件操作逻辑和具体的存储实现。通过可插拔的设计，你可以：

1. **按需选择**：临时存储、本地磁盘、云端数据库、隔离沙箱
2. **灵活组合**：用 CompositeBackend 让不同路径对应不同后端
3. **安全可控**：通过 virtual_mode、沙箱、HITL 等机制控制风险
4. **自定义扩展**：实现 BackendProtocol 即可接入 S3、Postgres 等任意存储

记住那个比喻：**Backend 就是给 AI 实习生分配的办公区域**。给太大的权限，它可能翻箱倒柜找到你的私房钱；给太小的空间，它可能施展不开。关键是**根据场景，选择合适的 Backend 组合**。
