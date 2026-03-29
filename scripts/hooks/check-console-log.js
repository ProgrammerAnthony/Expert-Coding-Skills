#!/usr/bin/env node

/**
 * Stop Hook：检查已修改文件中的 console.log 语句
 *
 * 跨平台（Windows、macOS、Linux）
 *
 * 每次响应后运行，扫描已修改的 JS/TS 文件，
 * 提醒开发者在提交前删除调试语句。
 *
 * 排除项：测试文件、配置文件、scripts/ 目录
 *（这些地方 console.log 是合理用法）
 */

const fs = require('fs');
const { isGitRepo, getGitModifiedFiles, readFile, log } = require('../lib/utils');

// console.log 属于预期用途、不应触发警告的文件
const EXCLUDED_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /\.config\.[jt]s$/,
  /scripts\//,
  /__tests__\//,
  /__mocks__\//,
];

const MAX_STDIN = 1024 * 1024; // 1MB 限制
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    const remaining = MAX_STDIN - data.length;
    data += chunk.substring(0, remaining);
  }
});

process.stdin.on('end', () => {
  try {
    if (!isGitRepo()) {
      process.stdout.write(data);
      process.exit(0);
    }

    const files = getGitModifiedFiles(['\\.tsx?$', '\\.jsx?$'])
      .filter(f => fs.existsSync(f))
      .filter(f => !EXCLUDED_PATTERNS.some(pattern => pattern.test(f)));

    let hasConsole = false;

    for (const file of files) {
      const content = readFile(file);
      if (content && content.includes('console.log')) {
        log(`[Hook] 警告：${file} 中存在 console.log`);
        hasConsole = true;
      }
    }

    if (hasConsole) {
      log('[Hook] 请在提交前删除 console.log 语句');
    }
  } catch (err) {
    log(`[Hook] check-console-log 错误：${err.message}`);
  }

  // 始终透传原始输入
  process.stdout.write(data);
  process.exit(0);
});
