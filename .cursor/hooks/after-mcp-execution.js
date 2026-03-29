#!/usr/bin/env node
/**
 * Cursor Hook - MCP 工具调用后（日志记录）
 */
const { readStdin } = require('./adapter');
readStdin().then(raw => {
  try {
    const input   = JSON.parse(raw);
    const server  = input.server || input.mcp_server || 'unknown';
    const tool    = input.tool   || input.mcp_tool   || 'unknown';
    const success = input.error ? '失败' : '成功';
    console.error(`[Hook] MCP 结果：${server}/${tool} - ${success}`);
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
