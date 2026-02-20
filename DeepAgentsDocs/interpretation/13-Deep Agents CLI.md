# Deep Agents CLI 深度解读

## 1. 一句话省流 (The Essence)

**Deep Agents CLI 就是一个"住在终端里的超级程序员助手"，它不仅能帮你写代码、跑命令，还能记住你的项目习惯，下次干活更懂你！**

简单说：它把 Deep Agents SDK 的能力包装成了一个命令行工具，让你在终端里就能和 AI 编程助手对话协作，而且这个助手还有"长期记忆"。

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：传统 AI 编程助手的三大硬伤

| 硬伤 | 具体表现 |
|------|----------|
| **健忘症** | 每次对话都是"初次见面"，之前教过的项目规范、代码风格全忘光 |
| **权限失控** | 要么 AI 什么都不能做，要么放开权限后 AI 乱搞把项目搞崩 |
| **能力单一** | 只会聊天，不能真正动手改文件、跑测试、搜资料 |

### 解决方案：Deep Agents CLI 的四大杀手锏

| 杀手锏 | 怎么解决的 |
|--------|------------|
| **持久记忆 (Persistent Memory)** | 对话结束后，重要信息自动保存到 `~/.deepagents/` 目录，下次启动还能记起来 |
| **人机协作审批 (Human-in-the-Loop)** | 危险操作（写文件、跑命令）先问你同不同意，防止 AI "一时冲动" |
| **全能工具箱 (Built-in Tools)** | 内置文件操作、Shell 执行、网页搜索、HTTP 请求等十多种工具 |
| **可扩展技能 (Skills)** | 像给游戏角色装备技能一样，给 AI 装上不同领域的专业知识 |

---

## 3. 生活化/职场类比 (The Analogy)

### 把 Deep Agents CLI 想象成"你的专属实习生"

想象一下，你招了一个超级实习生，他有以下特点：

| CLI 概念 | 实习生类比 |
|----------|------------|
| **CLI 本身** | 这个实习生本人，坐在你旁边随时待命 |
| **Built-in Tools (内置工具)** | 实习生的基本能力：会打字(写文件)、会跑腿(执行命令)、会上网查资料(Web Search) |
| **Memory (记忆)** | 实习生的笔记本，记录了"老板喜欢用驼峰命名"、"这个项目的数据库用 PostgreSQL" |
| **AGENTS.md** | 你给实习生的《新人手册》，写明了公司规范和项目须知 |
| **Skills (技能)** | 实习生考的各种证书：Python 专家证、前端开发证、数据库管理证... |
| **Human-in-the-Loop** | 实习生的工作原则：重要决策先请示，不擅自做主 |
| **Sandbox (沙箱)** | 公司给实习生配的"隔离测试机"，实验代码别在生产服务器上乱搞 |
| **Agent Name** | 不同岗位的实习生：`backend-dev` 是后端实习生，`frontend-dev` 是前端实习生，各有各的笔记本 |

**工作流程就是这样的：**

```
你说："帮我写个用户注册接口"
        ↓
实习生翻笔记本(Memory)："老板之前说过用 snake_case，要加时间戳字段"
        ↓
实习生干活，但写文件前问你："我打算创建 user_controller.py，可以吗？"
        ↓
你批准后，实习生执行，并把新学到的东西记到笔记本里
```

---

## 4. 关键概念拆解 (Key Concepts)

### (1) Human-in-the-Loop (人机协作审批)

**人话版：** AI 干活前先"举手请示"，你说 OK 它才动手。

**为什么需要：** 防止 AI 手滑执行 `rm -rf /` 这种毁天灭地的命令。

**可以关掉吗：** 可以！用 `--auto-approve` 参数，但后果自负。

```bash
# 我信任这个 AI，让它放飞自我
deepagents --auto-approve
```

### (2) Memory / AGENTS.md (记忆系统)

**人话版：** AI 的"小本本"，记录你教过它的东西。

**两种记忆层级：**
- **全局记忆** (`~/.deepagents/agent/AGENTS.md`)：你的通用偏好，所有项目都适用
- **项目记忆** (`.deepagents/AGENTS.md`)：特定项目的规范，只在这个项目生效

**类比：** 全局记忆是公司员工手册，项目记忆是项目组规范文档。

### (3) Skills (技能)

**人话版：** 给 AI 装的"外挂模块"，让它在特定领域更专业。

**怎么用：**
```bash
# 创建一个叫 "api-testing" 的技能
deepagents skills create api-testing
```

**效果：** AI 遇到相关任务时，会自动"激活"这个技能里的知识。

### (4) Sandbox (沙箱)

**人话版：** 一个"隔离房间"，AI 在里面随便折腾也不会弄坏你的电脑。

**支持的沙箱：** Modal、Daytona、Runloop

```bash
# 让 AI 在 Modal 沙箱里执行代码
deepagents --sandbox modal
```

### (5) Non-interactive Mode (非交互模式)

**人话版：** 让 AI "执行完就走"，不用来回对话，适合写脚本和自动化流程。

```bash
# 一句话任务，跑完就结束
deepagents -n "Write a Python script that prints hello world"

# 可以配合管道使用
cat error.log | deepagents -n "What's causing this error?"
```

---

## 5. 代码/配置"人话"解读 (Code Walkthrough)

### 场景 1：快速上手三步走

```bash
# Step 1: 告诉系统你的 API Key（相当于给 AI 发工资卡）
export OPENAI_API_KEY="your-api-key"

# Step 2: 安装并启动 CLI（把实习生请到公司）
uv tool install deepagents-cli
deepagents

# Step 3: 开始对话（给实习生派活）
> Create a Python script that prints "Hello, World!"
```

**逻辑意图：** 这三步就是"给钱 -> 招人 -> 派活"，标准的老板操作。

### 场景 2：教 AI 记住项目规范

```bash
# 启动一个专门干后端的 Agent（招一个后端实习生）
uvx deepagents-cli --agent backend-dev

# 告诉它你的代码规范
> Our API uses snake_case and includes created_at/updated_at timestamps

# 以后再派类似的活
> Create a /users endpoint
# AI 会自动用 snake_case，自动加时间戳，不用你再叮嘱
```

**逻辑意图：** 你在"培训实习生"，培训一次，以后都记得。

### 场景 3：切换 AI 模型

```bash
# 方式 1：启动时指定
deepagents --model anthropic:claude-opus-4-5

# 方式 2：对话中途切换
> /model openai:gpt-4o
```

**逻辑意图：** 像换手机一样换 AI 大脑，觉得这个笨了就换个聪明的。

### 场景 4：在沙箱里安全执行代码

```bash
# 启动时指定使用 Modal 沙箱
deepagents --sandbox modal --sandbox-setup ./setup.sh
```

**setup.sh 里写的是：**
```bash
#!/bin/bash
# 克隆你的代码仓库到沙箱里
git clone https://github.com/username/repo.git $HOME/workspace
# 进入项目目录
cd $HOME/workspace
```

**逻辑意图：** "给实习生一台隔离的测试机，让他在那边折腾，弄坏了也不影响生产环境"。

---

## 6. 真实场景案例 (Real-world Scenario)

### 案例：开发一个电商后台管理系统

**背景：** 你是一个全栈工程师，正在开发电商后台，项目有以下规范：
- API 用 RESTful 风格
- 数据库字段用 snake_case
- 所有接口要写单元测试
- 代码要符合 ESLint 规范

**不用 Deep Agents CLI 的痛苦：**

```
Day 1: 用 ChatGPT 生成了订单接口代码，它用了 camelCase...
Day 2: 再让它生成用户接口，又用了 camelCase，又要手动改...
Day 3: 让它生成商品接口，它忘了加 created_at 字段...
Day 4: 让它跑测试，它说"我无法执行代码"...
Day 5: 你崩溃了...
```

**用 Deep Agents CLI 后的幸福生活：**

```bash
# Step 1: 创建专属 Agent
deepagents --agent ecommerce-backend

# Step 2: 教它项目规范（只需要教一次！）
> Remember: This project uses snake_case for database fields, 
> RESTful API style, and every endpoint needs unit tests.

# Step 3: 开始干活
> Create a /orders endpoint with CRUD operations

# AI 自动：
# - 用 snake_case 命名所有字段
# - 添加 created_at 和 updated_at
# - 生成 RESTful 风格的路由
# - 自动创建对应的单元测试文件
# - 干活前询问你是否同意修改文件

# Step 4: 跑测试
> Run the tests and fix any failures

# AI 自动执行 pytest，发现问题自动修复
```

**具体提升：**

| 维度 | 之前 | 之后 |
|------|------|------|
| 规范一致性 | 每次都要提醒 | 教一次，永远记得 |
| 执行能力 | 只能聊天 | 能改文件、跑命令、搜资料 |
| 安全性 | 复制代码手动粘贴 | 危险操作有审批机制 |
| 效率 | 反复纠正 AI 的错误 | 一次到位 |

---

## 7. 内置工具速查表 (Built-in Tools Cheat Sheet)

| 工具名 | 干啥用的 | 需要审批吗？ |
|--------|----------|--------------|
| `ls` | 看目录里有啥文件 | 不用 |
| `read_file` | 读文件内容（包括图片！） | 不用 |
| `write_file` | 创建或覆盖文件 | **要** |
| `edit_file` | 精准修改现有文件 | **要** |
| `glob` | 按模式找文件（如 `**/*.py`） | 不用 |
| `grep` | 在文件里搜文字 | 不用 |
| `shell` | 执行 Shell 命令 | **要** |
| `web_search` | 上网搜资料 | **要** |
| `fetch_url` | 抓网页内容 | **要** |
| `task` | 派子任务给其他 Agent | **要** |
| `write_todos` | 管理任务清单 | 不用 |

**记忆口诀：** "看和搜不用批，改和跑要请示"

---

## 8. 常用命令速查 (Command Cheat Sheet)

### 启动相关

```bash
# 基础启动
deepagents

# 使用特定 Agent
deepagents --agent backend-dev

# 使用特定模型
deepagents --model anthropic:claude-sonnet-4-5

# 跳过审批（危险！）
deepagents --auto-approve

# 使用沙箱
deepagents --sandbox modal
```

### 交互模式斜杠命令

```bash
/model              # 切换模型
/remember           # 让 AI 总结并记住当前对话重点
/tokens             # 看看用了多少 Token
/clear              # 清空对话历史
/threads            # 查看历史对话
/quit               # 退出
```

### 技能管理

```bash
deepagents skills list                    # 看看有哪些技能
deepagents skills create api-test         # 创建新技能
deepagents skills info api-test           # 查看技能详情
deepagents skills delete api-test         # 删除技能
```

### Agent 管理

```bash
deepagents list                           # 查看所有 Agent
deepagents reset --agent mybot            # 重置某个 Agent 的记忆
```

---

## 9. 最佳实践 (Best Practices)

### 记忆管理

- **全局 AGENTS.md**：放你的通用偏好（比如"我喜欢简洁的代码注释"）
- **项目 AGENTS.md**：放项目特有规范（比如"这个项目用 PostgreSQL"）
- **定期用 `/remember`**：让 AI 总结对话，更新记忆

### 安全使用

- **生产环境**：保持 Human-in-the-Loop 开启
- **实验阶段**：可以用 `--auto-approve` 或沙箱
- **敏感项目**：使用远程沙箱隔离执行

### 效率提升

- **非交互模式**：适合写脚本自动化
  ```bash
  deepagents -n "Generate a .gitignore for Python" -q > .gitignore
  ```
- **管道组合**：把 AI 变成 Unix 工具链的一环
  ```bash
  git diff | deepagents -n "Review these changes"
  ```

---

## 10. 总结：为什么选择 Deep Agents CLI？

| 如果你是... | Deep Agents CLI 能帮你... |
|------------|--------------------------|
| **独立开发者** | 有个记性好的 AI 搭档，不用反复解释项目规范 |
| **团队 Leader** | 统一项目规范，新人上手更快 |
| **效率控** | 用非交互模式 + 管道，把 AI 嵌入自动化流程 |
| **安全控** | Human-in-the-Loop + 沙箱，AI 干活你放心 |

**一句话总结：** Deep Agents CLI 就是把"一个会记事、能干活、听指挥的 AI 程序员"装进了你的终端里。

---

*文档解读完成，祝你用得开心！*
