# Expert Coding Skills — Hooks

自动化安全与质量检查钩子集，支持 **Claude Code** 和 **Cursor** 双平台。

## 目录结构

```
项目根/
├── hooks/                      # 仅配置文件
│   ├── hooks.json              # Claude Code hooks 配置
│   └── README.md               # 本文档
│
├── scripts/                    # 所有实际脚本逻辑
│   ├── lib/
│   │   ├── utils.js            # 跨平台工具函数（两平台共用）
│   │   ├── resolve-formatter.js # 格式化器检测工具
│   │   ├── shell-split.js      # Shell 命令解析工具
│   │   ├── package-manager.js  # 包管理器检测
│   │   ├── project-detect.js   # 项目类型检测
│   │   └── session-aliases.js  # 会话别名管理
│   └── hooks/                  # 核心 hook 脚本（两平台共用）
│       ├── check-secrets.js         # 敏感凭证检测
│       ├── warn-sensitive-file.js   # 敏感文件读取警告
│       ├── config-protection.js     # 保护 eslint/prettier 配置
│       ├── post-edit-format.js      # 编辑后自动格式化
│       ├── post-edit-typecheck.js   # 编辑后 TS 类型检查
│       ├── check-console-log.js     # 检测遗留 console.log
│       ├── post-edit-console-warn.js # check-console-log 的别名
│       ├── doc-file-warning.js      # 非标准文档文件警告
│       ├── session-start.js         # 加载上次会话摘要
│       ├── session-end.js           # 保存当前会话摘要
│       ├── session-end-marker.js    # 会话结束标记
│       ├── pre-compact.js           # 压缩前保存状态
│       └── cost-tracker.js          # Token 用量统计
│
└── .cursor/                    # Cursor 配置
    ├── hooks.json              # Cursor hooks 配置（15 个事件）
    └── hooks/                  # Cursor 适配层（极薄，只做格式转换）
        ├── adapter.js               # Cursor → Claude Code 格式转换
        ├── before-submit-prompt.js  # beforeSubmitPrompt → check-secrets
        ├── before-read-file.js      # beforeReadFile → warn-sensitive-file
        ├── after-file-edit.js       # afterFileEdit → format + typecheck + console-warn
        ├── before-shell-execution.js # beforeShellExecution → git push 提醒
        ├── after-shell-execution.js  # afterShellExecution → PR/build 通知
        ├── session-start.js         # sessionStart → session-start
        ├── session-end.js           # sessionEnd → session-end-marker
        ├── stop.js                  # stop → console-log + session-end + cost-tracker
        ├── pre-compact.js           # preCompact → pre-compact
        ├── before-mcp-execution.js  # beforeMCPExecution → MCP 调用日志
        ├── after-mcp-execution.js   # afterMCPExecution → MCP 结果日志
        ├── subagent-start.js        # subagentStart → Agent 启动日志
        ├── subagent-stop.js         # subagentStop → Agent 完成日志
        ├── before-tab-file-read.js  # beforeTabFileRead → 阻止 Tab 读敏感文件
        └── after-tab-file-edit.js   # afterTabFileEdit → Tab 编辑后格式化
```

**核心设计原则**：
- `hooks/` 只放配置文件，不放脚本
- `scripts/hooks/` 放所有实际逻辑，两平台共用
- `.cursor/hooks/` 是极薄的适配层，负责将 Cursor 事件格式转换后调用 `scripts/hooks/`

## 包含的 Hooks

| Hook 脚本 | Claude Code 事件 | Cursor 事件 | 功能 | 模式 |
|-----------|-----------------|-------------|------|------|
| `check-secrets` | `Stop` | `beforeSubmitPrompt` | 检测 API Key、Token、私钥 | 仅警告 |
| `warn-sensitive-file` | `PreToolUse Read` | `beforeReadFile` | 读取 `.env`/`.key`/`.pem` 时警告 | 仅警告 |
| `config-protection` | `PreToolUse Edit` | — | 阻止修改 eslint/prettier 配置 | **阻断** |
| `post-edit-format` | `PostToolUse Edit` | `afterFileEdit` | 自动运行 Prettier/Biome 格式化 | 静默执行 |
| `post-edit-typecheck` | `PostToolUse Edit` | `afterFileEdit` | 编辑 TS 文件后运行 tsc 类型检查 | 仅警告 |
| `check-console-log` | `Stop` | `stop` | 检测遗留的 `console.log` 语句 | 仅警告 |
| `session-start` | `SessionStart` | `sessionStart` | 加载上次会话摘要，检测项目类型 | 静默执行 |
| `session-end` | `Stop` | `stop` | 保存会话摘要到 `~/.claude/session-data/` | 静默执行 |
| `pre-compact` | `PreCompact` | `preCompact` | context 压缩前保存状态 | 静默执行 |
| `cost-tracker` | `Stop` | `stop` | 记录 token 用量到 `~/.claude/metrics/` | 静默执行 |
| `before-tab-file-read` | — | `beforeTabFileRead` | 阻止 Tab 读取敏感文件 | **阻断** |

---

## 安装

### Cursor（克隆即用）

克隆本仓库后，`.cursor/` 目录已包含完整配置，无需任何额外操作。

### Claude Code

将 `hooks/hooks.json` 中的 `hooks` 配置合并到项目的 `.claude/settings.json`（或 `~/.claude/settings.json` 用于全局生效），并确保 `scripts/` 目录位于项目根：

```json
{
  "hooks": {
    "PreToolUse": [ ... ],
    "PostToolUse": [ ... ],
    "Stop": [ ... ],
    "SessionStart": [ ... ],
    "PreCompact": [ ... ]
  }
}
```

所有命令路径已使用相对路径（`scripts/hooks/xxx.js`），从项目根目录运行即可。

---

## Hook 控制

通过环境变量控制 hook 行为：

```bash
# 设置 hook 执行模式（minimal / standard / strict）
export HOOK_PROFILE=standard

# 禁用特定 hook（逗号分隔）
export HOOK_DISABLED_HOOKS=stop:cost-tracker,stop:session-end
```

| 模式 | 说明 |
|------|------|
| `minimal` | 仅运行会话管理 hooks |
| `standard` | 运行所有常规 hooks（默认） |
| `strict` | 额外启用 git push 提醒等严格检查 |

---

## 自定义

编辑 `scripts/hooks/` 下对应脚本中的模式列表：

- **密钥检测规则**：`check-secrets.js` → `SECRET_PATTERNS`
- **敏感文件规则**：`warn-sensitive-file.js` → `SENSITIVE_PATTERNS`
- **保护的配置文件**：`config-protection.js` → `PROTECTED_FILES`
- **console.log 排除规则**：`check-console-log.js` → `EXCLUDED_PATTERNS`
