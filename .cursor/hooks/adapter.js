#!/usr/bin/env node
/**
 * Cursor → Claude Code Hook 格式适配器
 *
 * 将 Cursor 的 hook 事件 stdin JSON 统一转换为 Claude Code 格式，
 * 让 scripts/hooks/*.js 无需修改即可在两个平台复用。
 */

'use strict';

const { execFileSync } = require('child_process');
const path = require('path');

const MAX_STDIN = 1024 * 1024;

/**
 * 从 stdin 读取原始输入
 */
function readStdin() {
  return new Promise(resolve => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
    });
    process.stdin.on('end',   () => resolve(data));
    process.stdin.on('error', () => resolve(data));
  });
}

/**
 * 获取项目根目录（.cursor/hooks/ 向上两级）
 */
function getPluginRoot() {
  return path.resolve(__dirname, '..', '..');
}

/**
 * 将 Cursor 的输入格式转换为 Claude Code hook 格式
 */
function transformToClaude(cursorInput, overrides = {}) {
  return {
    tool_input: {
      file_path: cursorInput.path || cursorInput.file || cursorInput.args?.filePath || '',
      prompt:    cursorInput.prompt || cursorInput.content || cursorInput.message || '',
      command:   cursorInput.command || cursorInput.args?.command || '',
      ...overrides.tool_input,
    },
    tool_output: {
      output: cursorInput.output || cursorInput.result || '',
      ...overrides.tool_output,
    },
    transcript_path: cursorInput.transcript_path || cursorInput.transcriptPath || cursorInput.session?.transcript_path || '',
    _cursor: {
      conversation_id: cursorInput.conversation_id,
      hook_event_name: cursorInput.hook_event_name,
      workspace_roots: cursorInput.workspace_roots,
      model:           cursorInput.model,
    },
  };
}

/**
 * 调用 scripts/hooks/ 下的指定脚本。
 * exit code 2 表示阻断操作，向上透传。
 */
function runExistingHook(scriptName, stdinData) {
  const scriptPath = path.join(getPluginRoot(), 'scripts', 'hooks', scriptName);
  try {
    execFileSync(process.execPath, [scriptPath], {
      input: typeof stdinData === 'string' ? stdinData : JSON.stringify(stdinData),
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
      cwd: process.cwd(),
    });
  } catch (e) {
    // exit code 2 = 阻断，转发给 Cursor
    if (e.status === 2) process.exit(2);
  }
}

/**
 * 判断指定 hook 在当前环境配置下是否应当执行。
 *
 * 环境变量：
 *   HOOK_PROFILE         - 当前配置档（minimal / standard / strict，默认 standard）
 *   HOOK_DISABLED_HOOKS  - 逗号分隔的 hook ID 禁用列表
 */
function hookEnabled(hookId, allowedProfiles = ['standard', 'strict']) {
  const rawProfile = String(process.env.HOOK_PROFILE || 'standard').toLowerCase();
  const profile = ['minimal', 'standard', 'strict'].includes(rawProfile) ? rawProfile : 'standard';

  const disabled = new Set(
    String(process.env.HOOK_DISABLED_HOOKS || '')
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(Boolean)
  );

  if (disabled.has(String(hookId || '').toLowerCase())) return false;
  return allowedProfiles.includes(profile);
}

module.exports = { readStdin, getPluginRoot, transformToClaude, runExistingHook, hookEnabled };
