#!/usr/bin/env node
/**
 * Cursor Hook - 子 Agent 启动（日志记录）
 */
const { readStdin } = require('./adapter');
readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const agent = input.agent_name || input.agent || 'unknown';
    console.error(`[Hook] 子 Agent 已启动：${agent}`);
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
