# Expert Coding Skills

面向中文开发者的生产级 AI Agent 技能集，覆盖代码审查、代码安全审计、TDD、需求工程、架构设计、调试、前端开发与技能创建全流程。

<p align="center">
  <img src="https://img.shields.io/badge/技能数量-15-blue" alt="15 Skills" />
  <img src="https://img.shields.io/badge/语言-中文-red" alt="Chinese" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License" />
</p>

## 技能清单

| 技能 | 描述 | 触发方式 | 安装命令 |
|------|------|----------|----------|
| [**代码审查专家**](./skills/code-review-expert/) | 资深工程师视角的结构化代码审查，覆盖 SOLID、安全、性能、边界条件 | `/代码审查` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/code-review-expert` |
| [**代码安全审计专家**](./skills/code-security-audit/) | 深度数据流分析 + 五阶段审计协议 + 攻击链分析，WooYun 案例库，支持 9 种语言 | `/代码安全审计` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/code-security-audit` |
| [**TDD 开发大师**](./skills/tdd-master/) | 严格 RED-GREEN-REFACTOR，竖向切片，接口设计优先 | `/tdd` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/tdd-master` |
| [**需求工程师**](./skills/prd-engineer/) | 访谈驱动的 PRD 编写 + GitHub Issues 拆解 + 实施计划 | `/写PRD` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/prd-engineer` |
| [**架构顾问**](./skills/architecture-advisor/) | 全新系统设计或现有架构优化，输出 Mermaid 架构图 | `/架构分析` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/architecture-advisor` |
| [**调试专家**](./skills/debug-expert/) | 4 阶段根因分析，系统化排查，完成前强制验证 | `/调试` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/debug-expert` |
| [**技能铸造师**](./skills/skill-smith/) | 元技能，指导你创建高质量的 Agent 技能 | `/创建技能` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/skill-smith` |
| [**源码阅读分析师**](./skills/source-reading-analyst/) | 三模式（问答/导读/改造建议）源码理解技能，输出带 Mermaid 图的结构化分析报告 | `/源码分析` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/source-reading-analyst` |
| [**方案设计师**](./skills/brainstorming/) | 实施前的结构化头脑风暴，协作对话澄清需求、对比方案、输出经验证的设计文档 | `/方案设计` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/brainstorming` |
| [**React 最佳实践专家**](./skills/react-best-practices/) | React/Next.js 全场景开发指导，覆盖组件设计、Hooks 规范、状态管理选型、性能优化 | `/react最佳实践` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/react-best-practices` |
| [**前端性能优化专家**](./skills/frontend-performance-optimization/) | 基于性能数据的精准瓶颈定位，覆盖 Web Vitals、加载优化、运行时优化、打包体积优化 | `/前端性能优化` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/frontend-performance-optimization` |
| [**前端代码审查专家**](./skills/frontend-code-review/) | 前端专项代码审查，支持 React/Vue/Next.js/TypeScript，覆盖功能、性能、安全、可维护性六大维度 | `/前端代码审查` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/frontend-code-review` |
| [**AI Agent 安全专家**](./skills/ai-agent-security/) | AI Agent 安全审计，覆盖提示注入、工具滥用、权限越界等威胁 | `/agent安全审计` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/ai-agent-security` |
| [**API 设计专家**](./skills/api-design/) | RESTful/GraphQL API 设计规范，覆盖接口设计、版本管理、错误处理 | `/api设计` | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/api-design` |
| [**文档查询**](./skills/docs-lookup/) | 通过 Context7 MCP 获取库和框架的实时最新文档，防止 API 幻觉 | 自动触发 | `npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/docs-lookup` |

## Cursor / Claude Code 配置体系

本项目构建了完整的双平台配置体系，**克隆仓库即可直接使用**：

```
项目根/
├── .cursor/                    # Cursor 配置（克隆即用）
│   ├── hooks.json              # 15 个 hook 事件配置
│   ├── hooks/                  # Cursor 适配层脚本（调用 scripts/hooks/）
│   ├── rules/                  # 永久注入规则（每次对话自动生效）
│   │   ├── common-*.md         # 通用规则：编码、安全、工作流、Git、测试、Agents、模式、性能
│   │   ├── typescript-*.md     # TypeScript/JavaScript 专项规则
│   │   ├── python-*.md         # Python 专项规则
│   │   └── golang-*.md         # Go 专项规则
│   └── skills/                 # 全部 15 个技能（真实目录，内容与 skills/ 一致）
│
├── hooks/                      # Claude Code 配置（仅配置文件）
│   ├── hooks.json              # Claude Code hooks 配置
│   └── README.md               # 安装说明
│
└── scripts/                    # 所有 hook 逻辑脚本（Cursor 和 Claude Code 共用）
    ├── lib/                    # 工具库（utils、resolve-formatter、shell-split 等）
    └── hooks/                  # 核心 hook 脚本
```

### Rules（永久规则）

`alwaysApply: true` 的规则在每次对话中自动生效；语言专项规则仅在匹配文件类型时激活：

| 规则文件 | 范围 | 内容 |
|---------|------|------|
| `common-coding-style.md` | 全局 | 不可变性、文件组织、错误处理 |
| `common-security.md` | 全局 | 提交前安全检查、密钥管理 |
| `common-development-workflow.md` | 全局 | 设计→TDD→审查→提交流水线 |
| `common-git-workflow.md` | 全局 | Conventional Commits、PR 流程 |
| `common-testing.md` | 全局 | 80% 覆盖率、TDD 强制工作流 |
| `common-hooks.md` | 全局 | Hooks 系统说明 |
| `common-agents.md` | 全局 | 按场景选用技能、并行执行、多视角分析 |
| `common-patterns.md` | 全局 | 仓库模式、API 响应格式 |
| `common-performance.md` | 全局 | 模型选择策略、context 管理 |
| `typescript-*.md` | `*.ts/tsx/js/jsx` | TS 不可变性、Zod 验证、Vitest、hooks、patterns |
| `python-*.md` | `*.py/pyi` | PEP8、pytest、ruff、bandit、hooks、patterns |
| `golang-*.md` | `*.go` | gofmt、表驱动测试、gosec、hooks、patterns |

### Hooks（自动化检查）

| Hook | Cursor 事件 | Claude Code 事件 | 功能 |
|------|------------|-----------------|------|
| `check-secrets` | `beforeSubmitPrompt` | `Stop` | 检测 API Key / Token / 私钥 |
| `warn-sensitive-file` | `beforeReadFile` | `PreToolUse Read` | 读取 `.env`/`.key`/`.pem` 时警告 |
| `config-protection` | — | `PreToolUse Edit` | 阻止修改 eslint/prettier 配置 |
| `post-edit-format` | `afterFileEdit` | `PostToolUse Edit` | 自动运行 Prettier/Biome 格式化 |
| `post-edit-typecheck` | `afterFileEdit` | `PostToolUse Edit` | 编辑 TS 文件后运行 tsc 类型检查 |
| `check-console-log` | `stop` | `Stop` | 检测遗留的 `console.log` 语句 |
| `session-start` | `sessionStart` | `SessionStart` | 加载上次会话摘要，检测项目类型 |
| `session-end` | `stop` | `Stop` | 保存当前会话摘要到 `~/.claude/` |
| `pre-compact` | `preCompact` | `PreCompact` | context 压缩前保存状态 |
| `cost-tracker` | `stop` | `Stop` | 记录 token 用量和费用 |

详细说明见 [`hooks/README.md`](./hooks/README.md)。

---

## 快速开始

使用 `npx skills` 安装任意技能：

```bash
# 安装代码审查专家
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/code-review-expert

# 安装代码安全审计专家
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/code-security-audit

# 安装 TDD 开发大师
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/tdd-master

# 安装需求工程师
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/prd-engineer

# 安装架构顾问
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/architecture-advisor

# 安装调试专家
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/debug-expert

# 安装技能铸造师
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/skill-smith

# 安装源码阅读分析师
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/source-reading-analyst

# 安装方案设计师
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/brainstorming

# 安装 React 最佳实践专家
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/react-best-practices

# 安装前端性能优化专家
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/frontend-performance-optimization

# 安装前端代码审查专家
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/frontend-code-review

# 安装 AI Agent 安全专家
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/ai-agent-security

# 安装 API 设计专家
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/api-design

# 安装文档查询
npx skills add ProgrammerAnthony/Expert-Coding-Skills --path skills/docs-lookup
```

安装后，在 Agent 终端中使用斜杠命令触发：

```
/代码审查          # 审查当前 git 变更
/代码安全审计      # 深度白盒代码安全审计（五阶段协议）
/tdd              # 启动 TDD 开发流程
/写PRD            # 编写产品需求文档
/架构分析          # 分析或设计系统架构
/调试             # 系统化调试当前问题
/创建技能          # 创建一个新的 Agent 技能
/源码分析          # 阅读、理解并分析现有源码结构
/方案设计          # 实施前进行结构化头脑风暴与方案设计
/react最佳实践    # React/Next.js 开发指导、代码规范、性能优化
/前端性能优化      # 前端页面性能诊断与优化方案
/前端代码审查      # 前端项目代码质量全维度审查
/agent安全审计    # AI Agent 安全威胁分析与防御
/api设计          # API 接口设计规范与最佳实践
```

## 设计理念

- **中文优先**：所有技能流程、输出模板、错误提示均使用中文，符合中文开发者习惯
- **铁律约束**：每个技能文件 < 500 行，每行都要对得起 token 消耗
- **渐进加载**：重型参考文档放入 `references/`，按需加载，不浪费上下文
- **确认门控**：关键步骤前必须获得用户确认，不自作主张
- **防幻觉机制**：要求以代码证据为依据，禁止无中生有

## 致谢

本项目灵感来源于以下优秀开源项目，在此致以诚挚感谢：

- [everything-claude-code](https://github.com/hesreallyhim/everything-claude-code) — 提供了完整的 hooks、rules、skills 配置体系架构的参考思路
- [Anything-Extract](https://github.com/ProgrammerAnthony/Anything-Extract) — 提供了 TDD、PRD、架构文档等完整技能体系
- [superpowers](https://github.com/obra/superpowers) — 提供了头脑风暴、系统调试、TDD 铁律等核心工作流思想
- [skill-dfyx_code_security_review](https://github.com/EastSword/skill-dfyx_code_security_review) — 提供了专业的代码安全审计方法论

本项目所有技能内容均为独立的中文原创实现，基于上述项目的思想进行了重新设计与功能增强。

## 许可证

MIT
