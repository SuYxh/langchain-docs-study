# 运行时环境 (Runtimes)

LangGraph.js 是同构的（Isomorphic），这意味着它可以在多种 JavaScript 环境中运行，包括：

- Node.js
- Deno
- Cloudflare Workers
- Edge Runtime (Vercel, Next.js)
- 浏览器

## 特定环境注意事项

### Cloudflare Workers

在 Cloudflare Workers 中使用 LangGraph 时，请确保按照他们的指南正确设置环境。您可能需要根据具体的 worker 配置调整某些依赖项。

### 浏览器

虽然 LangGraph 可以在浏览器中运行，但请注意，在客户端暴露 API 密钥通常是不安全的。对于生产应用程序，建议将 LangGraph 逻辑放在服务器端（或使用像 LangGraph Cloud 这样的后端服务），并让前端通过 API 与之通信。

如果您必须在浏览器中运行（例如用于演示或本地优先的应用程序），请确保使用适当的安全措施，或者使用不需要 API 密钥的模型/工具（例如本地 LLM 或公共 API）。

## 依赖管理

LangGraph 旨在尽量减少依赖项，以确保广泛的兼容性。但是，如果您使用的自定义工具或集成具有特定的运行时要求，这些要求也将适用于您的 LangGraph 应用程序。
