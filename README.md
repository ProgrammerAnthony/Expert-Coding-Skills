# Expert Coding Skills

面向中文开发者的生产级 AI Agent 技能集，覆盖代码审查、安全审计、TDD、需求工程、架构设计、调试与技能创建全流程。

<p align="center">
  <img src="https://img.shields.io/badge/技能数量-7-blue" alt="7 Skills" />
  <img src="https://img.shields.io/badge/语言-中文-red" alt="Chinese" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="MIT License" />
</p>

## 技能清单

| 技能 | 描述 | 触发方式 | 安装命令 |
|------|------|----------|----------|
| [**代码审查专家**](./skills/code-review-expert/) | 资深工程师视角的结构化代码审查，覆盖 SOLID、安全、性能、边界条件 | `/代码审查` | `npx skills add <username>/expert-coding-skills --path skills/code-review-expert` |
| [**安全审计专家**](./skills/security-audit/) | 白盒静态分析，10 个安全维度，三种扫描模式 | `/安全审计` | `npx skills add <username>/expert-coding-skills --path skills/security-audit` |
| [**TDD 开发大师**](./skills/tdd-master/) | 严格 RED-GREEN-REFACTOR，竖向切片，接口设计优先 | `/tdd` | `npx skills add <username>/expert-coding-skills --path skills/tdd-master` |
| [**需求工程师**](./skills/prd-engineer/) | 访谈驱动的 PRD 编写 + GitHub Issues 拆解 + 实施计划 | `/写PRD` | `npx skills add <username>/expert-coding-skills --path skills/prd-engineer` |
| [**架构顾问**](./skills/architecture-advisor/) | 全新系统设计或现有架构优化，输出 Mermaid 架构图 | `/架构分析` | `npx skills add <username>/expert-coding-skills --path skills/architecture-advisor` |
| [**调试专家**](./skills/debug-expert/) | 4 阶段根因分析，系统化排查，完成前强制验证 | `/调试` | `npx skills add <username>/expert-coding-skills --path skills/debug-expert` |
| [**技能铸造师**](./skills/skill-smith/) | 元技能，指导你创建高质量的 Agent 技能 | `/创建技能` | `npx skills add <username>/expert-coding-skills --path skills/skill-smith` |

## 快速开始

使用 `npx skills` 安装任意技能：

```bash
# 安装代码审查专家
npx skills add <username>/expert-coding-skills --path skills/code-review-expert

# 安装安全审计专家
npx skills add <username>/expert-coding-skills --path skills/security-audit

# 安装 TDD 开发大师
npx skills add <username>/expert-coding-skills --path skills/tdd-master

# 安装需求工程师
npx skills add <username>/expert-coding-skills --path skills/prd-engineer

# 安装架构顾问
npx skills add <username>/expert-coding-skills --path skills/architecture-advisor

# 安装调试专家
npx skills add <username>/expert-coding-skills --path skills/debug-expert

# 安装技能铸造师
npx skills add <username>/expert-coding-skills --path skills/skill-smith
```

安装后，在 Agent 终端中使用斜杠命令触发：

```
/代码审查          # 审查当前 git 变更
/安全审计          # 对项目进行安全扫描
/tdd              # 启动 TDD 开发流程
/写PRD            # 编写产品需求文档
/架构分析          # 分析或设计系统架构
/调试             # 系统化调试当前问题
/创建技能          # 创建一个新的 Agent 技能
```

## 设计理念

- **中文优先**：所有技能流程、输出模板、错误提示均使用中文，符合中文开发者习惯
- **铁律约束**：每个技能文件 < 500 行，每行都要对得起 token 消耗
- **渐进加载**：重型参考文档放入 `references/`，按需加载，不浪费上下文
- **确认门控**：关键步骤前必须获得用户确认，不自作主张
- **防幻觉机制**：要求以代码证据为依据，禁止无中生有

## 致谢

本项目灵感来源于以下优秀开源项目，在此致以诚挚感谢：

- [Anything-Extract](https://github.com/ProgrammerAnthony/Anything-Extract) — 提供了 TDD、PRD、架构文档等完整技能体系
- [superpowers](https://github.com/obra/superpowers) — 提供了头脑风暴、系统调试、TDD 铁律等核心工作流思想
- [skill-dfyx_code_security_review](https://github.com/EastSword/skill-dfyx_code_security_review) — 提供了专业的代码安全审计方法论

本项目所有技能内容均为独立的中文原创实现，基于上述项目的思想进行了重新设计与功能增强。

## 许可证

MIT
