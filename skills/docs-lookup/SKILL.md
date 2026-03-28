---
name: docs-lookup
description: "通过 Context7 MCP 获取库和框架的实时最新文档，而非依赖训练数据，防止 API 幻觉。适用于查询任何库或框架的用法、配置、示例代码。触发词：怎么用、怎么配置、API参考、文档、示例代码、用法、接口、库文档、框架文档、documentation、docs、how to use、API reference、setup、configure、React怎么用、Next.js配置、Prisma查询、Vue用法、Express路由、Tailwind类名、Supabase认证、TypeScript类型、Zod验证、shadcn组件、Drizzle ORM、tRPC、Fastify、NestJS、Astro、SvelteKit、Nuxt、Vite、Vitest、Playwright。"
---

# 文档查询

铁律：**查文档，不靠记忆。** 当用户询问任何库、框架或 API 的用法时，必须通过 Context7 MCP 获取实时文档，而非依赖训练数据给出可能已过时的答案。

## 何时触发

- 用户询问某个库或框架的用法（"React 的 useEffect 怎么用？"）
- 用户要求生成依赖特定库的代码（"帮我写一个 Prisma 查询"）
- 用户询问 API 参考或配置方式（"Next.js middleware 怎么配置？"）
- 用户提到了具体的库名（React、Vue、Next.js、Prisma、Supabase、Tailwind 等）
- 用户询问某个库的特定版本行为（"Next.js 15 的 App Router"）

## 工作流

### 第一步：解析库 ID

调用 Context7 MCP 的 **resolve-library-id** 工具：

- `libraryName`：从用户问题中提取的库名（如 `Next.js`、`Prisma`、`Supabase`）
- `query`：用户的完整问题（提升匹配相关性）

**必须先获得有效的 Context7 库 ID（格式为 `/org/project`）才能进入下一步，禁止直接调用 query-docs。**

### 第二步：选择最佳匹配

从解析结果中按以下优先级选择：

| 优先级 | 判断依据 |
|--------|---------|
| 1 | 名称与用户所问库完全匹配 |
| 2 | Benchmark 分数更高（100 分为满分） |
| 3 | Source reputation 为 High 或 Medium |
| 4 | 若用户指定了版本号，优先选版本专属 ID |

### 第三步：获取文档

调用 Context7 MCP 的 **query-docs** 工具：

- `libraryId`：第二步选出的库 ID（如 `/vercel/next.js`）
- `query`：用户的具体问题，越具体越好

**限制：每个问题最多调用 query-docs 3 次。3 次后仍不确定，说明情况并用已有最佳信息作答，不得猜测。**

### 第四步：回答用户

- 用获取到的实时文档内容回答问题
- 包含文档中的相关代码示例
- 涉及版本差异时明确标注（如"在 Next.js 15 中..."）

## 示例

### 示例 1：Next.js middleware 配置

1. 调用 `resolve-library-id`，`libraryName: "Next.js"`，`query: "Next.js middleware 怎么配置？"`
2. 从结果中选 `/vercel/next.js`（名称匹配 + 高分）
3. 调用 `query-docs`，`libraryId: "/vercel/next.js"`，`query: "middleware configuration"`
4. 用返回的文档和 `middleware.ts` 示例回答

### 示例 2：Prisma 关联查询

1. 调用 `resolve-library-id`，`libraryName: "Prisma"`，`query: "如何查询关联关系？"`
2. 选 `/prisma/prisma`
3. 调用 `query-docs`，`query: "query with relations include select"`
4. 返回 Prisma Client 的 `include` / `select` 模式与代码示例

### 示例 3：Supabase 认证方式

1. 调用 `resolve-library-id`，`libraryName: "Supabase"`，`query: "Supabase 有哪些认证方式？"`
2. 选 Supabase 官方库 ID
3. 调用 `query-docs`，汇总认证方法并给出最小示例

## 最佳实践

| 原则 | 说明 |
|------|------|
| 具体查询 | 用用户完整问题作为 query，比通用词更准确 |
| 版本感知 | 用户提到版本时，优先选版本专属库 ID |
| 官方优先 | 多个匹配时优先选官方/主包，而非社区 fork |
| 不传密钥 | 在调用 resolve-library-id 或 query-docs 前，移除问题中的 API Key、密码、Token 等敏感信息 |

## 反模式

| 反模式 | 后果 |
|--------|------|
| 跳过 resolve-library-id 直接猜测库 ID | query-docs 返回错误或无关文档 |
| 用训练数据直接回答库 API 问题 | 给出已过时或错误的 API 用法 |
| query 过于模糊（如只写库名） | 返回的文档片段不相关 |
| 超过 3 次仍继续调用 | 浪费 context，应直接说明不确定性 |
| 将含敏感数据的问题原文发送 Context7 | 泄露用户凭证 |
