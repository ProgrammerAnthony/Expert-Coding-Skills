#!/usr/bin/env node
/**
 * Cursor Hook - Shell 命令执行前
 * 检测危险操作（如 git push）并提示用户检查
 */
const { readStdin, hookEnabled } = require('./adapter');

readStdin()
  .then(raw => {
    try {
      const input = JSON.parse(raw || '{}');
      const cmd = String(input.command || input.args?.command || '');

      if (hookEnabled('pre:bash:git-push-reminder', ['strict']) && /\bgit\s+push\b/.test(cmd)) {
        console.error('[Hook] 推送前请检查变更：git diff origin/main...HEAD');
      }
    } catch {
      // 忽略解析错误
    }

    process.stdout.write(raw);
  })
  .catch(() => process.exit(0));
