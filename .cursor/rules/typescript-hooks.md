---
description: "TypeScript/JavaScript Hooks：在通用规则基础上补充 TS/JS 专项"
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
alwaysApply: false
---
# TypeScript / JavaScript Hooks

> 在通用 Hooks 规则基础上，补充 TS/JS 相关说明（与本仓库 `scripts/hooks/` 行为对齐）。

## PostToolUse / afterFileEdit

在 Claude Code 的 `~/.claude/settings.json` 或本仓库 `hooks/hooks.json` 中通常包含：

- **Prettier / Biome**：编辑 JS/TS 后自动格式化
- **TypeScript**：编辑 `.ts`/`.tsx` 后运行 `tsc` 检查
- **console.log**：对已编辑文件中的 `console.log` 给出警告

## Stop 类 Hook

- 在会话结束前可扫描已修改文件中的 `console.log`（见 `check-console-log.js`）
