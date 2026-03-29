#!/usr/bin/env node
/**
 * Cursor Hook - Shell 命令执行后
 * 记录 PR 创建链接、构建完成等关键事件
 */
const { readStdin, hookEnabled } = require('./adapter');

readStdin().then(raw => {
  try {
    const input = JSON.parse(raw || '{}');
    const cmd    = String(input.command || input.args?.command || '');
    const output = String(input.output  || input.result        || '');

    if (hookEnabled('post:bash:pr-created', ['standard', 'strict']) && /\bgh\s+pr\s+create\b/.test(cmd)) {
      const m = output.match(/https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/);
      if (m) {
        console.error('[Hook] PR 已创建：' + m[0]);
        const repo = m[0].replace(/https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/\d+/, '$1');
        const pr   = m[0].replace(/.+\/pull\/(\d+)/, '$1');
        console.error('[Hook] 代码审查：gh pr review ' + pr + ' --repo ' + repo);
      }
    }

    if (hookEnabled('post:bash:build-complete', ['standard', 'strict']) && /(npm run build|pnpm build|yarn build)/.test(cmd)) {
      console.error('[Hook] 构建完成');
    }
  } catch {
    // 忽略解析错误
  }

  process.stdout.write(raw);
}).catch(() => process.exit(0));
