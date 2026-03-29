---
description: "Python 相关 Hooks：在通用规则基础上补充 Python 专项"
globs: ["**/*.py", "**/*.pyi"]
alwaysApply: false
---
# Python Hooks

> 在通用 Hooks 规则基础上，补充 Python 相关说明。

## PostToolUse 类 Hook（建议在 Claude Code 中配置）

在 `~/.claude/settings.json`（或项目 `.claude/settings.json`）中可按需增加：

- **black / ruff**：编辑 `.py` 后自动格式化
- **mypy / pyright**：编辑 `.py` 后运行类型检查

## 警告类约定

- 对已编辑文件中的 `print()` 发出警告，生产代码应使用 **`logging`** 模块
