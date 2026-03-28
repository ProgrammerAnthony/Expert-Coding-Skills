# 文档查询

通过 Context7 MCP 获取库和框架的**实时最新文档**，防止 AI 给出过时或错误的 API 用法。

## 前提条件

需要在 Cursor / Claude Code 中配置 **Context7 MCP**。

## 安装

```bash
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/docs-lookup
```

## 使用方式

直接用自然语言提问即可触发，无需特殊命令：

```text
React 的 useEffect 怎么用？
```

```text
帮我写一个 Prisma 的关联查询
```

```text
Next.js 15 的 App Router 如何配置 middleware？
```

```text
Tailwind CSS 的 grid 布局怎么写？
```

## 工作原理

| 步骤 | 操作 |
|------|------|
| 1 | 识别用户问题中的库/框架名 |
| 2 | 通过 Context7 `resolve-library-id` 获取官方库 ID |
| 3 | 通过 Context7 `query-docs` 拉取实时文档片段 |
| 4 | 基于真实文档内容回答，附代码示例 |

## 支持的库（示例，不限于此）

React、Next.js、Vue、Nuxt、Svelte、SvelteKit、Astro、Vite、Vitest、
Prisma、Drizzle ORM、Supabase、Express、Fastify、NestJS、tRPC、
Tailwind CSS、shadcn/ui、Zod、TypeScript、Playwright、…

## 注意事项

- 需要 Context7 MCP 正确配置才能正常工作
- 每个问题最多调用 3 次文档接口，超出后使用已有信息作答
- 包含 API Key 等敏感信息的问题会在发送前自动脱敏
