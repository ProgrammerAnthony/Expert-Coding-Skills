---
description: "Go 相关 Hooks：在通用规则基础上补充 Go 专项"
globs: ["**/*.go", "**/go.mod", "**/go.sum"]
alwaysApply: false
---
# Go Hooks

> 在通用 Hooks 规则基础上，补充 Go 相关说明。

## PostToolUse 类 Hook（建议在 Claude Code 中配置）

在 `~/.claude/settings.json`（或项目 `.claude/settings.json`）中可按需增加：

- **gofmt / goimports**：编辑 `.go` 后自动格式化
- **go vet**：编辑 `.go` 后做静态分析
- **staticcheck**：对变更包做扩展静态检查

具体命令与 matcher 需与本仓库 `hooks/hooks.json` 或自建配置保持一致。
