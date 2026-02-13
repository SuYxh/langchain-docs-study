## 文档索引
在以下位置获取完整的文档索引：https://docs.langchain.com/llms.txt
使用此文件在进一步探索之前发现所有可用页面。

# 概览

> 控制和自定义智能体执行的每一步

中间件提供了一种更紧密地控制智能体内部发生的事情的方法。中间件对于以下情况非常有用：

* 通过日志记录、分析和调试来跟踪智能体行为。
* 转换提示、[工具选择](/oss/javascript/langchain/middleware/built-in#llm-tool-selector) 和输出格式。
* 添加 [重试](/oss/javascript/langchain/middleware/built-in#tool-retry)、[回退](/oss/javascript/langchain/middleware/built-in#model-fallback) 和提前终止逻辑。
* 应用 [速率限制](/oss/javascript/langchain/middleware/built-in#model-call-limit)、护栏和 [PII 检测](/oss/javascript/langchain/middleware/built-in#pii-detection)。

通过将中间件传递给 `createAgent` 来添加它们：

```typescript  theme={null}
import {
  createAgent,
  summarizationMiddleware,
  humanInTheLoopMiddleware,
} from "langchain";

const agent = createAgent({
  model: "gpt-4.1",
  tools: [...],
  middleware: [summarizationMiddleware, humanInTheLoopMiddleware],
});
```

## 智能体循环

核心智能体循环涉及调用模型，让它选择要执行的工具，然后在它不再调用工具时结束：

<img src="https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=ac72e48317a9ced68fd1be64e89ec063" alt="Core agent loop diagram" style={{height: "200px", width: "auto", justifyContent: "center"}} className="rounded-lg block mx-auto" data-og-width="300" width="300" data-og-height="268" height="268" data-path="oss/images/core_agent_loop.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=280&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=a4c4b766b6678ef52a6ed556b1a0b032 280w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=560&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=111869e6e99a52c0eff60a1ef7ddc49c 560w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=840&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=6c1e21de7b53bd0a29683aca09c6f86e 840w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=1100&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=88bef556edba9869b759551c610c60f4 1100w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=1650&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=9b0bdd138e9548eeb5056dc0ed2d4a4b 1650w, https://mintcdn.com/langchain-5e9cc07a/Tazq8zGc0yYUYrDl/oss/images/core_agent_loop.png?w=2500&fit=max&auto=format&n=Tazq8zGc0yYUYrDl&q=85&s=41eb4f053ed5e6b0ba5bad2badf6d755 2500w" />

中间件在这些步骤的前后暴露了钩子：

<img src="https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=eb4404b137edec6f6f0c8ccb8323eaf1" alt="Middleware flow diagram" style={{height: "300px", width: "auto", justifyContent: "center"}} className="rounded-lg mx-auto" data-og-width="500" width="500" data-og-height="560" height="560" data-path="oss/images/middleware_final.png" data-optimize="true" data-opv="3" srcset="https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=280&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=483413aa87cf93323b0f47c0dd5528e8 280w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=560&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=41b7dd647447978ff776edafe5f42499 560w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=840&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=e9b14e264f68345de08ae76f032c52d4 840w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=1100&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=ec45e1932d1279b1beee4a4b016b473f 1100w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=1650&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=3bca5ebf8aa56632b8a9826f7f112e57 1650w, https://mintcdn.com/langchain-5e9cc07a/RAP6mjwE5G00xYsA/oss/images/middleware_final.png?w=2500&fit=max&auto=format&n=RAP6mjwE5G00xYsA&q=85&s=437f141d1266f08a95f030c2804691d9 2500w" />

## 其他资源

<CardGroup cols={2}>
  <Card title="Built-in middleware" icon="box" href="/oss/javascript/langchain/middleware/built-in">
    探索常见用例的内置中间件。
  </Card>

  <Card title="Custom middleware" icon="code" href="/oss/javascript/langchain/middleware/custom">
    使用钩子和装饰器构建您自己的中间件。
  </Card>

  <Card title="Middleware API reference" icon="book" href="https://reference.langchain.com/python/langchain/middleware/">
    中间件的完整 API 参考。
  </Card>

  <Card title="Testing agents" icon="scale-unbalanced" href="/oss/javascript/langchain/test">
    使用 LangSmith 测试您的智能体。
  </Card>
</CardGroup>

***

<Callout icon="pen-to-square" iconType="regular">
  [在 GitHub 上编辑此页面](https://github.com/langchain-ai/docs/edit/main/src/oss/langchain/middleware/overview.mdx) 或 [提交问题](https://github.com/langchain-ai/docs/issues/new/choose).
</Callout>

<Tip icon="terminal" iconType="regular">
  [将这些文档连接](/use-these-docs) 到 Claude, VSCode, 以及更多通过 MCP 获取实时答案。
</Tip>
