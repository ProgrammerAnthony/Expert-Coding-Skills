#!/usr/bin/env node
/**
 * 文档文件规范警告 Hook（PreToolUse - Write）
 *
 * 当 AI 创建非标准文档文件时发出警告。
 * 始终返回 exit 0（仅警告，不阻断）。
 */

'use strict';

const path = require('path');

const MAX_STDIN = 1024 * 1024;
let data = '';

/**
 * 判断文件路径是否属于允许的文档位置
 */
function isAllowedDocPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const basename = path.basename(filePath);

  // 非文档文件一律放行
  if (!/\.(md|txt)$/i.test(filePath)) return true;

  // 标准根级文档文件
  if (/^(README|CLAUDE|AGENTS|CONTRIBUTING|CHANGELOG|LICENSE|SKILL|MEMORY|WORKLOG)\.md$/i.test(basename)) {
    return true;
  }

  // .claude/ 下的命令、计划、项目目录
  if (/\.claude\/(commands|plans|projects)\//.test(normalized)) {
    return true;
  }

  // 允许的文档目录
  if (/(^|\/)(docs|skills|\.history|memory)\//.test(normalized)) {
    return true;
  }

  // 计划文件
  if (/\.plan\.md$/i.test(basename)) {
    return true;
  }

  return false;
}

process.stdin.setEncoding('utf8');
process.stdin.on('data', c => {
  if (data.length < MAX_STDIN) {
    const remaining = MAX_STDIN - data.length;
    data += c.substring(0, remaining);
  }
});

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = String(input.tool_input?.file_path || '');

    if (filePath && !isAllowedDocPath(filePath)) {
      console.error('[Hook] 警告：检测到非标准文档文件');
      console.error(`[Hook] 文件：${filePath}`);
      console.error('[Hook] 建议将文档整合到 README.md 或 docs/ 目录中');
    }
  } catch {
    // 忽略解析错误
  }

  process.stdout.write(data);
});
