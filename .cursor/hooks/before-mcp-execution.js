#!/usr/bin/env node
/**
 * Cursor Hook - MCP 工具调用前（日志记录）
 */
const { readStdin } = require('./adapter');
readStdin().then(raw => {
  try {
    const input  = JSON.parse(raw);
    const server = input.server || input.mcp_server || 'unknown';
    const tool   = input.tool   || input.mcp_tool   || 'unknown';
    console.error(`[Hook] MCP 调用：${server}/${tool}`);
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
