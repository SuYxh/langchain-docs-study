# LangGraph 本地服务器深度解读

## 1. 一句话省流 (The Essence)

**这篇文档教你如何把你的 LangGraph AI Agent "开店营业"** -- 也就是把你写好的 AI 智能体跑起来变成一个可以被外部调用的 API 服务，这样前端、其他程序、甚至 curl 命令都能和你的 AI 对话了。

简单说：**从"代码文件"变成"在线服务"的过程。**

---

## 2. 核心痛点与解决方案 (The "Why")

### 痛点：写完 Agent 代码后，怎么让别人用？

想象你辛辛苦苦写了一个超级聪明的 AI Agent，它能帮人分析数据、回答问题、执行任务。但是现在它只是躺在你电脑里的一堆 `.ts` 文件。

- **倒霉事 1：** 想测试？每次都要改代码重新运行，太麻烦
- **倒霉事 2：** 想给前端同事联调？"喂，你来我电脑上跑一下"
- **倒霉事 3：** 想看 AI 思考过程？只能 console.log 满天飞
- **倒霉事 4：** 想对话保持上下文？自己手动管理状态，头大

### 解决：LangGraph CLI 一键开服

LangGraph CLI 就像一个"AI Agent 的容器"：

| 之前的痛苦 | 现在的快乐 |
|-----------|-----------|
| 代码改完要重启 | 热更新，改完自动生效 |
| 没有 API 接口 | 自动生成 REST API |
| 看不到执行流程 | Studio UI 可视化调试 |
| 状态管理很头疼 | 内置持久化支持 |

---

## 3. 生活化/职场类比 (The Analogy)

### 把你的 AI Agent 想象成一个"私房菜厨师"

**场景：你是一个厨艺精湛的私房菜厨师（AI Agent）**

| 技术概念 | 类比角色/动作 |
|---------|-------------|
| **你写的 Agent 代码** | 你精心研发的菜谱和烹饪技巧 |
| **langgraph.json 配置文件** | 餐厅的菜单，告诉顾客你能做什么菜 |
| **npm create langgraph** | 开一家标准化的餐厅（有厨房、点单系统、前台） |
| **langgraph dev 命令** | 正式开门营业！ |
| **http://localhost:2024** | 餐厅的门牌号和地址 |
| **Studio UI** | 厨房里的监控摄像头，让你看到每道菜是怎么做出来的 |
| **REST API / SDK** | 顾客点单的方式（打电话点单 or 小程序点单） |
| **.env 文件** | 餐厅的各种许可证（营业执照、卫生许可） |

**完整的"开店流程"：**

```
1. npm install @langchain/langgraph-cli  --> 买下一套餐厅管理软件
2. npm create langgraph                   --> 按照模板装修一家新餐厅
3. npm install                            --> 采购厨房设备和原材料
4. 创建 .env 文件                          --> 办理各种证照
5. npx @langchain/langgraph-cli dev       --> 开门营业！
6. 打开 Studio UI                          --> 老板坐在监控室看厨房干活
7. 调用 API 测试                           --> 第一位顾客进来点单
```

---

## 4. 关键概念拆解 (Key Concepts)

### LangGraph CLI
**大白话：** 一个命令行工具，专门用来启动和管理你的 AI Agent 服务。就像 `npm start` 启动前端项目一样，`langgraph dev` 启动 AI 项目。

### langgraph.json
**大白话：** 项目的"身份证"，告诉系统：
- 用什么版本的 Node.js
- 你有哪些 AI Agent（可能不止一个）
- 每个 Agent 对应哪个文件的哪个导出

```json
{
  "node_version": "24",
  "graphs": {
    "agent": "./src/agent.ts:agent",        // 名叫 "agent" 的智能体，在 agent.ts 里
    "searchAgent": "./src/search.ts:searchAgent"  // 名叫 "searchAgent" 的，在 search.ts 里
  },
  "env": ".env"
}
```

### In-memory Mode（内存模式）
**大白话：** 服务器把所有数据都存在内存里，不存硬盘。关机就没了。
- 好处：启动快，适合开发测试
- 坏处：不能用于生产，数据不持久

### Studio UI
**大白话：** LangSmith 提供的"AI 调试神器"，可以：
- 可视化看到你的 Agent 执行流程
- 实时对话测试
- 查看每一步的输入输出
- 调试复杂的多步骤流程

### Threadless Run（无线程运行）
**大白话：** 一次性对话，不保存上下文。就像打客服电话，挂了就完了，下次打进来对方不认识你。

---

## 5. 代码"人话"解读 (Code Walkthrough)

### 核心启动命令

```shell
npx @langchain/langgraph-cli dev
```

**翻译成人话：** "嘿电脑，帮我把当前项目里的 AI Agent 跑起来，变成一个网络服务，让别人可以通过 http 请求和它聊天。"

### SDK 调用示例解析

```javascript
import { Client } from "@langchain/langgraph-sdk";

// 第一步：创建一个"遥控器"，指向你本地的 AI 服务
const client = new Client({ apiUrl: "http://localhost:2024"});

// 第二步：发起一次对话请求
const streamResponse = client.runs.stream(
  null,           // null = 无线程模式，不保存对话历史
  "agent",        // 要调用哪个 Agent（对应 langgraph.json 里的 key）
  {
    input: {
      "messages": [
        { "role": "user", "content": "What is LangGraph?"}
      ]
    },
    streamMode: "messages-tuple",  // 流式返回，一边生成一边返回
  }
);

// 第三步：接收 AI 的回复（流式的，一块一块来）
for await (const chunk of streamResponse) {
  console.log(`收到新事件: ${chunk.event}...`);
  console.log(JSON.stringify(chunk.data));
}
```

**整体逻辑：**
1. 建立连接 -> 告诉 SDK 我的 AI 服务在哪
2. 发送请求 -> 指定用哪个 Agent，发什么消息
3. 接收响应 -> 用流式方式接收，体验更好（不用等 AI 说完才显示）

### REST API 调用

```bash
curl -s --request POST \
    --url "http://localhost:2024/runs/stream" \
    --header 'Content-Type: application/json' \
    --data "{
        \"assistant_id\": \"agent\",
        \"input\": {
            \"messages\": [
                { \"role\": \"human\", \"content\": \"What is LangGraph?\" }
            ]
        },
        \"stream_mode\": \"messages-tuple\"
    }"
```

**翻译成人话：** "用最原始的 HTTP 请求直接调用 AI 服务，不需要装 SDK，任何能发 HTTP 请求的语言/工具都能用。"

---

## 6. 真实场景案例 (Real-world Scenario)

### 场景：开发一个"智能电商客服"

**背景：** 你要为公司开发一个 AI 客服，能够：
- 查询订单状态
- 推荐商品
- 处理退换货

**为什么必须用本地服务器模式？**

#### 阶段一：开发调试
```
你（开发者）正在写 Agent 代码...

不用本地服务器：
- 改一行代码 -> 重新跑脚本 -> 手动输入测试问题 -> 看 console.log
- 改一行代码 -> 重新跑脚本 -> 手动输入测试问题 -> 看 console.log
- 改一行代码 -> 重新跑脚本 -> 手动输入测试问题 -> 看 console.log
- ... 累死了 ...

用本地服务器：
- 启动 langgraph dev（一次）
- 打开 Studio UI
- 直接在界面上聊天测试
- 改代码自动热更新
- 可视化看到 Agent 的思考过程
```

#### 阶段二：前后端联调
```
前端同事：API 接口给我一个
你：http://localhost:2024/runs/stream，POST 请求，参数这样传...
前端同事：收到！

（前端开始调试，你继续优化 Agent 逻辑）
（互不干扰，各自并行开发）
```

#### 阶段三：产品验收
```
产品经理：我想看看效果
你：打开这个链接 https://smith.langchain.com/studio/?baseUrl=http://127.0.0.1:2024
产品经理：（直接在网页上和 AI 对话，提出改进意见）
你：（实时看到对话内容，了解问题所在）
```

### 具体提升对比

| 方面 | 不用本地服务器 | 用本地服务器 |
|-----|--------------|------------|
| 调试效率 | 低（改代码要重启） | 高（热更新） |
| 可视化 | 无（只能看日志） | 完整（Studio UI） |
| 团队协作 | 困难（代码层面） | 简单（API 层面） |
| 测试便利性 | 低（要写测试代码） | 高（界面直接测） |

---

## 7. 完整流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    LangGraph 本地开发流程                         │
└─────────────────────────────────────────────────────────────────┘

    [1] 安装 CLI 工具
         │
         ▼
    ┌─────────────────┐
    │ npm install     │
    │ @langchain/     │
    │ langgraph-cli   │
    └────────┬────────┘
             │
             ▼
    [2] 创建项目
         │
         ▼
    ┌─────────────────┐     生成 langgraph.json
    │ npm create      │ ──────────────────────►  配置文件
    │ langgraph       │                          （菜单）
    └────────┬────────┘
             │
             ▼
    [3] 配置环境
         │
         ▼
    ┌─────────────────┐
    │ 创建 .env       │ ──► LANGSMITH_API_KEY=xxx
    │ 填入 API Keys   │
    └────────┬────────┘
             │
             ▼
    [4] 启动服务
         │
         ▼
    ┌─────────────────┐     ┌─────────────────┐
    │ langgraph dev   │────►│ localhost:2024  │
    └─────────────────┘     │   (API 服务)    │
                            └────────┬────────┘
                                     │
             ┌───────────────────────┼───────────────────────┐
             │                       │                       │
             ▼                       ▼                       ▼
    ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
    │   Studio UI     │     │   JS SDK 调用   │     │   REST API      │
    │  可视化调试      │     │   前端/后端集成  │     │   任意语言调用   │
    └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 8. 常见问题速查

### Q: Safari 浏览器打不开 Studio？
**A:** Safari 对 localhost 有限制，启动时加个参数：
```shell
langgraph dev --tunnel
```
这会创建一个安全隧道绕过限制。

### Q: 我已经有项目了，不想从模板创建？
**A:** 用这个命令自动扫描你的项目，生成配置文件：
```shell
npm create langgraph config
```
它会自动找到你代码里的 `createAgent()`、`StateGraph.compile()` 等模式。

### Q: 为什么叫 "in-memory mode"？
**A:** 所有数据都存内存，重启服务就没了。开发够用，生产环境要用 LangSmith Deployment 来持久化存储。

### Q: 如何改变默认端口 2024？
**A:** 查阅 CLI 的帮助文档，通常可以通过 `--port` 参数指定。

---

## 9. 一图总结

```
                    ┌─────────────────────────────┐
                    │    你的 Agent 代码          │
                    │   （私房菜厨师的手艺）       │
                    └──────────────┬──────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │   langgraph dev 启动        │
                    │   （餐厅正式开业）           │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
               ┌────────┐    ┌────────┐    ┌────────┐
               │ Studio │    │  SDK   │    │  REST  │
               │（监控） │    │（小程序）│    │（电话） │
               └────────┘    └────────┘    └────────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
                                   ▼
                         和你的 AI 愉快对话！
```

**记住：** `langgraph dev` 就是让你的 AI Agent "从代码变服务"的魔法咒语！

---

*下一步建议阅读：Deployment quickstart - 学习如何把本地服务部署到云端*
