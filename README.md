# LangChain TypeScript 文档翻译计划

本项目旨在将 LangChain TypeScript 的官方英文文档翻译为中文。

## 翻译范围
- **源目录**: `./en`
- **目标目录**: `./zh`

## 翻译规则
1. **文件对应**: 保持与源目录完全一致的文件名。
2. **代码处理**: 
   - 代码块（Code Blocks）内的代码逻辑保持不变。
   - **重点**: 必须翻译代码中的英文注释（包括行内注释 `//` 和块注释 `/* ... */`），以便中文读者理解代码意图。
3. **文本内容**: 将所有英文正文翻译为准确、流畅的中文技术文档风格。
4. **格式保留**: 严格保留 Markdown 的原有格式（标题、列表、加粗、链接、图片引用等）。
5. **专业术语**: 保持 LangChain 专有术语的一致性（如 Agent, Chain, Tool, LLM 等通常保留英文或使用惯用中文译名）。

## 执行流程
1. **环境准备**: 确保目标目录 `./zh` 存在（已完成）。
2. **任务执行**: 
   - 遍历 `./en` 目录下的所有 `.md` 文件。
   - 读取源文件内容。
   - 进行翻译处理。
   - 将结果写入 `./zh` 目录。
3. **人工/自我审查**: 检查翻译后的 Markdown 渲染效果及代码注释翻译是否准确。

## 待翻译文件列表
- [x] 1-overview.md
- [x] 2-install.md
- [x] 3-Quickstart.md
- [x] 4-Agents.md
- [x] 5-Models.md
- [x] 6-Messages.md
- [x] 7-Tools.md
- [x] 8-Short-term-memory.md
- [x] 9-Streaming-Overview.md
- [x] 10-Streaming-Frontend.md
- [x] 11-Structured-output.md
- [x] 12-Middleware-Overview.md
- [x] 13-Prebuilt-middleware.md
- [x] 14-Custom-middleware.md
- [x] 15-Guardrails.md
- [x] 16-Runtime.md
- [x] 17-Context-engineering-in-agents.md
- [x] 18-mcp.md
- [x] 19-Human-in-the-loop.md
- [x] 20-Multi-agent-Overview.md
- [x] 21-Multi-agent-Subagents.md
- [x] 22-Multi-agent-Handoffs.md
- [x] 23-Multi-agent-Skills.md
- [x] 24-Multi-agent-Router.md
- [x] 25-Multi-agent-Custom-workflow.md
- [x] 26-Retrieval.md
- [x] 27-Long-term-memory.md
- [x] 28-LangSmith-Studio.md
- [x] 29-AgentChatUI.md
- [x] 30-Test.md
