# Deep Agents Harness 能力深度解读

> 原文档：[04-Harness capabilities.md](file:///Users/bytedance/Desktop/langchain-ts-docs/DeepAgentsDocs/en/04-Harness%20capabilities.md)

---

## 一句话省流 (The Essence)

**Harness（马具/挽具）是给 AI Agent 配备的一整套"超能力装备"，让它能像真正的打工人一样：记笔记、分派任务、管理文件、执行代码，还能在关键时刻喊人帮忙确认！**

---

## 核心痛点与解决方案 (The "Why")

### 痛点：没有 Harness 之前，AI Agent 就是个"裸奔"的实习生

想象一下，你招了一个实习生，但是：

| 痛点 | 现实表现 |
|------|----------|
| **没有待办清单** | 做着做着就忘了自己要干嘛，复杂任务做到一半就迷路了 |
| **没有文件系统** | 想查资料？不好意思，我看不到你的文件 |
| **没有分工能力** | 所有活都自己干，一个人忙死，效率低下 |
| **上下文爆炸** | 聊天记录太长，前面说的都忘了，开始胡言乱语 |
| **不能执行代码** | 写完代码不能跑，只能纸上谈兵 |
| **自作主张** | 关键操作不问你就直接执行了，出了问题你哭都来不及 |

### 解决方案：Harness = AI 的"瑞士军刀"

Deep Agents 的 Harness 就像给这个实习生配备了：

- **备忘录** (Planning) - 不会忘事了
- **文件柜** (Virtual Filesystem) - 能读写文件了
- **团队** (Subagents) - 能分派任务了
- **压缩技能** (Context Management) - 记忆力升级了
- **终端** (Code Execution) - 能真正跑代码了
- **对讲机** (Human-in-the-loop) - 关键时刻会请示了

---

## 生活化类比 (The Analogy)

### 比喻：Harness 就像一家高效运转的餐厅后厨

把 Deep Agent 想象成一家米其林餐厅的**行政总厨**，Harness 就是这个厨房的全套管理系统：

| Harness 能力 | 餐厅类比 | 具体作用 |
|-------------|---------|---------|
| **Planning (write_todos)** | 厨房的订单管理板 | 贴满了"待做"、"进行中"、"已完成"的菜单便签 |
| **Virtual Filesystem** | 冷库 + 储物柜 | 存放所有食材（文件），需要时随时取用 |
| **Subagents** | 专业厨师团队 | 总厨派活："小王你负责甜点，小李你负责前菜"，各干各的不打架 |
| **Context Management** | 智能记忆系统 | 把旧订单归档，只保留当前最重要的信息在白板上 |
| **Code Execution** | 实际烹饪区 | 真正开火做菜的地方，不是纸上画饼 |
| **Human-in-the-loop** | 总厨确认机制 | "张总，这道鱼要加芥末吗？" 关键决策前先问老板 |
| **Skills** | 菜谱大全 | 需要做川菜时翻川菜谱，做法餐时翻法餐谱，按需加载 |
| **Memory** | 常客喜好档案 | "王先生不吃香菜，李女士要少盐" 跨越多次用餐的记忆 |

---

## 关键概念拆解 (Key Concepts)

### 1. Planning Capabilities (规划能力)

**大白话：** Agent 的"待办事项 App"

```
write_todos 工具 = 一个智能便签本
- 'pending' (待做) -> 还没开始
- 'in_progress' (进行中) -> 正在干
- 'completed' (已完成) -> 搞定了
```

**为什么重要？** 没有这个，Agent 做复杂任务就像不带购物清单去超市——进去转一圈，出来发现想买的都忘了。

---

### 2. Virtual Filesystem (虚拟文件系统)

**大白话：** Agent 的"私人云盘"

| 工具 | 做什么的 | 人话解释 |
|------|---------|---------|
| `ls` | 列出文件 | "看看文件夹里有啥" |
| `read_file` | 读文件 | "打开这个文件看看内容" |
| `write_file` | 写文件 | "新建一个文件，把内容存进去" |
| `edit_file` | 改文件 | "把文件里的 A 替换成 B" |
| `glob` | 模式匹配 | "找出所有 .py 结尾的文件" |
| `grep` | 搜索内容 | "搜搜哪些文件里提到了 'bug'" |
| `execute` | 跑命令 | "在终端里执行 npm install" |

---

### 3. Task Delegation - Subagents (任务委派 - 子代理)

**大白话：** "带团队的 Agent"

想象你是一个项目经理，手下有几个专职员工：

- **general-purpose subagent** = 万能助手，啥都能干点
- **code-reviewer subagent** = 专门审代码的同事
- **web-researcher subagent** = 专门查资料的同事
- **test-runner subagent** = 专门跑测试的同事

**核心优势：**

| 特性 | 解释 |
|------|------|
| **Context isolation** | 各干各的，不会互相干扰 |
| **Parallel execution** | 可以同时干活，不用排队 |
| **Token efficiency** | 子代理干完活只汇报结果，不把过程全带回来占位置 |

---

### 4. Context Management (上下文管理)

**大白话：** Agent 的"记忆管理术"

这是 Deep Agents 最精妙的设计之一，解决了一个世纪难题：**聊太久，AI 就忘事**。

#### 策略一：Offloading (卸载)

**触发条件：** 当工具输入/输出超过 20,000 tokens 时

**工作原理：**
```
正常情况：聊天记录里存着完整的大文件内容
           ↓
     [占用大量上下文空间]
           ↓
卸载后：聊天记录里只存一个指针 + 前10行预览
           ↓
     [需要时再去文件系统里查]
```

**生活类比：** 
- **不卸载** = 把整本《红楼梦》抄到便签上随身带
- **卸载后** = 便签上写"红楼梦在书架第三层"，需要时再去拿

#### 策略二：Summarization (摘要)

**触发条件：** 当上下文达到模型限制的 85% 时

**工作原理：**
```
原始对话：消息1 + 消息2 + ... + 消息100
              ↓
         [快爆了！]
              ↓
压缩后：[前90条的摘要] + 消息91-100
              ↓
完整记录保存到文件系统，以防万一需要回查
```

**生活类比：**
- **不摘要** = 会议纪要把每个人说的每句话都记下来
- **摘要后** = 只记"会议决定：项目延期两周，小王负责跟进"

---

### 5. Code Execution (代码执行)

**大白话：** 让 Agent 能真正"动手干活"

需要配合 Sandbox（沙箱）使用，就像：
- 没有沙箱 = Agent 只能写菜谱，不能做菜
- 有了沙箱 = Agent 有了一个隔离的厨房，可以真正开火

**安全三要素：**
- **Security** - 代码在隔离环境跑，炸了也不影响你的电脑
- **Clean environments** - 每次都是干净的环境，不会被之前的垃圾影响
- **Reproducibility** - 环境一致，张三跑和李四跑结果一样

---

### 6. Human-in-the-loop (人机协作)

**大白话：** Agent 的"请示机制"

```python
# 配置示例
interrupt_on = {
    "edit_file": True,    # 每次改文件都要问我
    "execute": True       # 每次执行命令都要问我
}
```

**使用场景：**
- 危险操作前确认（"真的要删库吗？"）
- 昂贵 API 调用前确认（"这个调用要花 $50，确定吗？"）
- 调试时手动介入

---

### 7. Skills (技能)

**大白话：** Agent 的"按需加载技能书"

**精妙设计 - Progressive Disclosure（渐进式披露）：**

```
启动时：Agent 只看每本技能书的"目录"（frontmatter）
         ↓
执行任务时：发现需要某个技能
         ↓
按需加载：只有这时才翻开那本技能书细看
```

**为什么这样设计？** 
- 省 Token！不需要开局就背诵所有技能书
- 就像你不会把《高等数学》《有机化学》《唐诗三百首》全背下来，用到哪本查哪本

---

### 8. Memory (记忆)

**大白话：** Agent 的"长期记忆本"

**与 Skills 的区别：**

| 特性 | Skills | Memory |
|------|--------|--------|
| 加载方式 | 按需加载 | 始终加载 |
| 用途 | 特定任务的专业知识 | 通用偏好和习惯 |
| 文件格式 | SKILL.md | AGENTS.md |

**典型内容：**
- 用户偏好："我喜欢用 TypeScript，不用 JavaScript"
- 代码风格："函数命名用 camelCase"
- 项目约定："API 返回统一用 JSON 格式"

---

## 代码/配置"人话"解读 (Code Walkthrough)

### 场景：配置一个带 Human-in-the-loop 的 Agent

```python
from deepagents import create_deep_agent

agent = create_deep_agent(
    # 基础配置
    system_prompt="你是一个代码助手",
    
    # 关键配置：哪些操作需要人工确认
    interrupt_on={
        "edit_file": True,    # 改文件前喊我
        "write_file": True,   # 写文件前喊我
        "execute": True       # 跑命令前喊我
    },
    
    # 内存配置：跨会话记住用户偏好
    memory=["./AGENTS.md"],
    
    # 子代理配置：带一个专门跑测试的小弟
    subagents={
        "test-runner": {
            "tools": ["execute"],
            "system_prompt": "你专门负责运行测试"
        }
    }
)
```

**这段配置在说什么？**

1. **interrupt_on** = "这三个操作是敏感操作，每次执行前都要停下来问我"
2. **memory** = "启动时去读 AGENTS.md，里面是我的偏好设置"
3. **subagents** = "我有一个叫 test-runner 的下属，专门跑测试"

---

## 真实场景案例 (Real-world Scenario)

### 场景：开发一个"智能代码重构助手"

**需求描述：** 
用户说："帮我把项目里所有的 `var` 改成 `const`，但是改之前让我确认一下"

**Harness 各能力如何协作：**

```
用户请求
    ↓
1. [Planning] Agent 创建待办清单：
   - [ ] 扫描所有 JS/TS 文件
   - [ ] 找出所有 var 声明
   - [ ] 逐个确认并替换
    ↓
2. [Virtual Filesystem] Agent 使用 glob 找文件：
   glob("**/*.{js,ts}")
   → 找到 47 个文件
    ↓
3. [Subagents] Agent 派出 "file-scanner" 子代理：
   "你去扫描这47个文件，找出所有 var"
   → 子代理返回：找到 156 处 var
    ↓
4. [Human-in-the-loop] 每次替换前暂停：
   "第一处：utils.js 第23行，var x = 1，要改吗？"
   用户：确认 ✓
    ↓
5. [Virtual Filesystem] 执行替换：
   edit_file("utils.js", "var x = 1", "const x = 1")
    ↓
6. [Context Management] 聊天记录太长？自动摘要：
   "已完成 89/156 处替换..."
    ↓
7. [Memory] 下次对话时记得：
   "用户偏好：改代码前要确认"
```

### 没有 Harness vs 有 Harness

| 方面 | 没有 Harness | 有 Harness |
|------|-------------|-----------|
| 任务追踪 | 做到一半忘了还剩多少 | 清晰的待办清单 |
| 文件操作 | 只能看用户贴的代码片段 | 能自己读写整个项目 |
| 大项目处理 | 47个文件？我看不完 | 派子代理并行处理 |
| 长对话 | 聊到后面前面的改动都忘了 | 自动摘要 + 文件备份 |
| 安全性 | 直接改代码，用户捏把汗 | 改前必问，心里踏实 |

---

## 总结：Harness 能力全景图

```
                    ┌─────────────────────────────────────┐
                    │         Deep Agent Harness          │
                    │        (AI 的超能力装备)             │
                    └─────────────────────────────────────┘
                                      │
         ┌──────────┬──────────┬──────┴──────┬──────────┬──────────┐
         │          │          │             │          │          │
         ▼          ▼          ▼             ▼          ▼          ▼
    ┌─────────┐┌─────────┐┌─────────┐┌───────────┐┌─────────┐┌─────────┐
    │Planning ││  File   ││Subagents││  Context  ││  Code   ││ Human-  │
    │  能力   ││ System  ││  子代理  ││Management ││Execution││in-loop  │
    │         ││         ││         ││  上下文    ││         ││         │
    │ 记笔记  ││ 读写文件 ││ 带团队  ││  记忆管理  ││ 跑代码  ││ 请示   │
    └─────────┘└─────────┘└─────────┘└───────────┘└─────────┘└─────────┘
         │                     │           │
         │                     │           │
         ▼                     ▼           ▼
    ┌─────────┐           ┌─────────┐┌─────────┐
    │ Skills  │           │Offload  ││Summary  │
    │ 技能书  │           │  卸载   ││  摘要   │
    │(按需加载)│           └─────────┘└─────────┘
    └─────────┘
         │
         ▼
    ┌─────────┐
    │ Memory  │
    │ 长期记忆 │
    │(始终加载)│
    └─────────┘
```

---

## 写在最后

Deep Agents 的 Harness 设计体现了一个核心理念：

> **让 AI Agent 从"只会聊天的助手"进化成"能真正干活的员工"**

它不是一个单一功能，而是一套**系统化的能力装备**，让 Agent 能够：
- 有条不紊地做复杂任务（Planning）
- 自己动手处理文件（Filesystem）
- 带领团队高效协作（Subagents）
- 长时间工作不掉链子（Context Management）
- 真正执行代码看效果（Code Execution）
- 关键时刻让人把关（Human-in-the-loop）
- 按需调用专业知识（Skills）
- 记住用户的偏好习惯（Memory）

掌握了 Harness，你就掌握了打造真正实用的 AI Agent 的关键！
