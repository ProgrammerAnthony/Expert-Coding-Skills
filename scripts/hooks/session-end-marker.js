#!/usr/bin/env node
/**
 * 会话结束标记 Hook — 透传 stdin 到 stdout，不做任何处理。
 * 导出 run() 供进程内直接调用（避免 Windows 上 spawnSync 的已知问题）。
 */

'use strict';

function run(rawInput) {
  return rawInput || '';
}

// 作为独立进程运行时的 stdin 入口
if (require.main === module) {
  const MAX_STDIN = 1024 * 1024;
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (raw.length < MAX_STDIN) {
      const remaining = MAX_STDIN - raw.length;
      raw += chunk.substring(0, remaining);
    }
  });
  process.stdin.on('end', () => {
    process.stdout.write(raw);
  });
}

module.exports = { run };
