# Deep Agents 长期记忆 (Long-term Memory) 深度解读

---

## 1. 一句话省流 (The Essence)

**长期记忆就是给你的 AI Agent 配了一个"云端硬盘"，让它能像人一样跨对话记住重要的事情，而不是每次聊完就"失忆"。**

简单来说：让 Agent 从"金鱼记忆"进化成"大象记忆"！

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：Agent 的"健忘症"问题

在没有长期记忆功能之前，你的 Agent 就像一个每天都会被"消除记忆"的员工：

- **场景 1**：今天你跟 Agent 说"我喜欢深色主题"，明天再开新对话，它完全不记得了
- **场景 2**：Agent 帮你做了一周的研究分析，结果对话一结束，所有研究笔记都蒸发了
- **场景 3**：每次新对话都要重新告诉 Agent 一遍你的偏好、项目背景、公司规范...

这就好比你公司招了一个能力超强的实习生，但他每天上班都会忘记前一天学的所有东西。崩溃不？

### 解决：混合存储架构 (Composite Backend)

Deep Agents 的解决方案非常聪明——**两套文件系统并行运行**：

| 存储类型 | 比喻 | 特点 | 路径示例 |
|---------|------|------|---------|
| **短期记忆 (State Backend)** | 便签纸 | 对话结束就扔掉 | `/draft.txt`, `/notes.md` |
| **长期记忆 (Store Backend)** | 归档柜 | 永久保存，跨对话访问 | `/memories/preferences.txt` |

**关键机制**：通过路径前缀 `/memories/` 来区分！就像你办公桌上的东西随时可能被清理，但放进档案室的文件会永久保留。

---

## 3. 生活化类比：医院病历系统

想象一下，你的 Agent 就是一位**全科医生**，而患者（用户）会多次来看病。

### 没有长期记忆时（传统模式）

```
第一次看诊：
患者：我对青霉素过敏
医生：好的，记下了（写在便签上）

第二次看诊（新对话）：
患者：我感冒了
医生：我给你开点青霉素...
患者：???我上次不是说过敏了吗！
医生：抱歉，我完全不记得了...便签不见了
```

### 有长期记忆时（CompositeBackend 模式）

```
第一次看诊：
患者：我对青霉素过敏
医生：好的，我把这个写进您的【病历档案】
      → 保存到 /memories/patient_allergies.txt

第二次看诊（新对话）：
患者：我感冒了  
医生：（先查阅病历档案）我看到您对青霉素过敏，
      我给您换一种抗生素...
患者：太好了！您居然记得！
```

### 角色映射表

| 技术概念 | 医院类比 |
|---------|---------|
| `StateBackend` (短期存储) | 医生的便签本 - 看完就扔 |
| `StoreBackend` (长期存储) | 医院病历档案室 - 永久保存 |
| `CompositeBackend` (路由器) | 护士分类员 - 决定什么归档什么丢弃 |
| `/memories/` 路径前缀 | "请归档"的红色标签 |
| `thread_id` | 每次看诊的挂号单编号 |
| `assistant_id` | 医生的工号 |

---

## 4. 关键概念拆解 (Key Concepts)

### (1) CompositeBackend - 智能路由器

这是整个长期记忆系统的"交通警察"，它根据文件路径决定数据往哪存：

- 看到 `/memories/xxx` → 送去持久化存储
- 看到其他路径 → 留在临时存储

### (2) StateBackend - 临时便签

- 数据存在 Agent 的运行状态里
- 对话结束就清空
- 适合：草稿、中间计算结果、临时笔记

### (3) StoreBackend - 永久档案室

- 数据存在外部数据库（如 PostgreSQL）
- 跨所有对话持久保存
- Agent 重启也不会丢失
- 适合：用户偏好、长期项目资料、学到的知识

### (4) Namespace (命名空间)

数据在 Store 中的"门牌号"：`(assistant_id, "filesystem")`

就像档案室里：`(张医生的工号, "病历档案")` 这样的分类标签。

### (5) Path Stripping (路径裁剪)

一个小细节但很重要：

- Agent 使用完整路径：`/memories/preferences.txt`
- 实际存储时会去掉前缀：`/preferences.txt`

就像你给档案室送文件说"请归档这份客户偏好表"，档案室收到后标签上只写"客户偏好表"。

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 核心配置：一看就懂

```typescript
const agent = createDeepAgent({
  // 第一步：告诉 Agent 用什么"数据库"存长期记忆
  store: new InMemoryStore(),  // 开发用内存，生产用 PostgresStore
  
  // 第二步：配置"智能路由器"
  backend: (config) => new CompositeBackend(
    new StateBackend(config),   // 默认：临时存储（便签纸）
    { "/memories/": new StoreBackend(config) }  // 特殊路径：永久存储（档案室）
  ),
});
```

**逻辑意图**：
1. 创建一个 Agent
2. 给它配一个内存数据库（开发环境）
3. 设置路由规则："/memories/" 开头的文件送去永久存储，其他的用临时存储

### 跨对话读写示例

```typescript
// === 第一次对话：用户告诉 Agent 自己的偏好 ===
const config1 = { configurable: { thread_id: "对话A的ID" } };
await agent.invoke({
  messages: [{ role: "user", content: "保存我的偏好到 /memories/preferences.txt" }],
}, config1);
// Agent 会把偏好写入永久存储

// === 第二次对话（完全新的对话！）===
const config2 = { configurable: { thread_id: "对话B的ID" } };  // 注意：不同的对话ID！
await agent.invoke({
  messages: [{ role: "user", content: "我的偏好是什么？" }],
}, config2);
// Agent 能从永久存储读取到第一次对话保存的偏好！
```

**逻辑意图**：
- 两个完全不同的对话（不同的 thread_id）
- 但因为用了 `/memories/` 路径，第二次对话能访问第一次存的数据
- 这就是"跨对话持久化"的魔力！

### 系统提示词配置：教会 Agent 使用记忆

```typescript
systemPrompt: `你有一个文件 /memories/instructions.txt 存储了额外的指令和偏好。

每次对话开始时，读取这个文件了解用户偏好。

当用户说"请总是这样做"或"我喜欢那样"时，用 edit_file 工具更新这个文件。`
```

**逻辑意图**：
- 告诉 Agent：你有个"小本本"可以用
- 每次聊天先看看小本本
- 用户教你新东西时，记到小本本里

这就是"自我改进指令"的核心——Agent 会越用越懂你！

---

## 6. 真实场景案例 (Real-world Scenarios)

### 场景 1：智能客服 - 记住 VIP 客户的一切

**需求**：电商平台的客服机器人，要记住每个客户的购买历史、偏好、投诉记录

**为什么必须用长期记忆**：
- 客户张三上个月投诉过发货慢，这个月再来咨询，客服应该主动关心"上次的问题解决了吗"
- 没有长期记忆 = 每次都像"初次见面"，客户体验极差

**配置方案**：
```
/memories/customers/{customer_id}/profile.txt     - 基本信息
/memories/customers/{customer_id}/history.txt    - 历史记录
/memories/customers/{customer_id}/preferences.txt - 个人偏好
```

**效果提升**：
- 客户满意度 +40%
- 重复问询减少 60%
- 转化率提升（因为 Agent 知道客户喜欢什么）

### 场景 2：研究助手 - 跨 Session 的深度研究

**需求**：帮用户做为期一周的市场调研，每天对话 1-2 小时

**为什么必须用长期记忆**：
- 周一找到了 10 个数据源，周二要继续用
- 周三写了分析报告初稿，周四要修改
- 没有长期记忆 = 每天从零开始，一周的调研变成 7 次独立的 1 小时调研

**配置方案**：
```
/memories/research/sources.txt   - 已找到的资料来源
/memories/research/notes.txt     - 分析笔记
/memories/research/report.md     - 报告草稿
/memories/research/todo.txt      - 待办事项
```

**效果提升**：
- 研究连贯性：从"每天重来"变成"持续深入"
- 效率：节省 60% 的重复工作时间
- 质量：积累的上下文让分析更深入

### 场景 3：个人编程助手 - 懂你的代码习惯

**需求**：团队里每个开发者有自己的代码风格偏好

**配置方案**：
```typescript
systemPrompt: `读取 /memories/code_style.txt 了解用户的编码偏好。

当用户说"我喜欢用驼峰命名"、"我们团队要求写 JSDoc 注释"时，
更新 /memories/code_style.txt。

生成代码时严格遵循这些偏好。`
```

**效果提升**：
- 代码风格一致性：从"每次都要提醒"变成"自动遵循"
- 开发效率：减少代码审查时的风格修改
- 用户体验：Agent 真的"懂你"

---

## 7. 存储选型指南

| 场景 | 推荐方案 | 理由 |
|-----|---------|------|
| 本地开发/测试 | `InMemoryStore` | 快速迭代，不用配数据库 |
| 生产环境 | `PostgresStore` | 数据持久化，支持高并发 |
| 多租户 SaaS | PostgresStore + assistant_id 命名空间 | 数据隔离，互不干扰 |

---

## 8. 最佳实践清单

### 路径设计
```
/memories/user_preferences.txt           - 用户偏好
/memories/context/background.txt         - 长期背景信息
/memories/knowledge/{topic}/notes.txt    - 按主题分类的知识
/memories/projects/{project_name}/...    - 按项目组织
```

### 系统提示词必须包含
```
你的持久化记忆结构如下：
- /memories/preferences.txt: 用户偏好设置
- /memories/context/: 关于用户的长期上下文
- /memories/knowledge/: 学到的知识和信息

每次对话开始时，先检查这些文件获取上下文。
```

### 数据治理
- 定期清理过期数据，避免存储膨胀
- 敏感信息考虑加密存储
- 实现数据导出功能，满足合规要求

---

## 9. 总结

Deep Agents 的长期记忆功能，本质上就是给 AI 配了一套**"云端档案系统"**：

1. **用 `/memories/` 路径前缀**区分什么该永久保存
2. **CompositeBackend 智能路由**决定数据去向
3. **跨 thread_id 访问**实现真正的记忆持久化
4. **灵活的存储后端**适配开发到生产的全流程

有了这个功能，你的 Agent 终于可以从"金鱼"进化成"大象"，真正记住与用户的每一次互动，越用越聪明！

---

> 原文档：[Long-term memory](https://docs.langchain.com/oss/deepagents/long-term-memory)
