---
description: "Hooks 系统：自动化检查、TodoWrite 最佳实践"
alwaysApply: true
---
# Hooks 系统

本项目已配置自动化 Hooks（见项目根 `.cursor/hooks.json`；Claude Code 侧见 `hooks/hooks.json`）。

## 已启用的 Hooks（Cursor 侧示例）

| 事件 | 行为 |
|------|------|
| `beforeSubmitPrompt` | 检测提示词中的 API Key / Token 等（`check-secrets`） |
| `beforeReadFile` | 读取 `.env`/`.key`/`.pem` 等敏感路径时警告（`warn-sensitive-file`） |
| `afterFileEdit` | 编辑后：格式化、TS 类型检查、`console.log` 相关检查（`scripts/hooks/` 内多脚本串联） |

说明：部分 Hook 可通过环境变量 `HOOK_PROFILE`、`HOOK_DISABLED_HOOKS` 调节；`config-protection` 等在 Claude Code 的 `PreToolUse` 中可能**阻断**危险编辑。

核心脚本目录：**`scripts/hooks/`**（Cursor 经 `.cursor/hooks/` 薄适配层调用同一套脚本）。

## TodoWrite 最佳实践

使用 TodoWrite 工具来：

- 追踪多步骤任务进度
- 确认对需求的理解是否一致
- 给用户可跟进的实施步骤
- 暴露粒度不当或顺序混乱

待办列表有助于发现：

- 步骤顺序不合理
- 遗漏子任务
- 多余或重复的步骤
- 任务拆分过粗或过细
- 对需求的误解
