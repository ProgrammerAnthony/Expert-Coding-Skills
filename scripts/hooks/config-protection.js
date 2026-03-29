#!/usr/bin/env node
/**
 * 配置文件保护 Hook
 *
 * 阻止 AI 修改代码规范配置文件（eslint、prettier 等）。
 * AI 经常通过降低规范标准来让检查通过，而不是真正修复代码。
 * 此 hook 引导 AI 回归到修复源码本身的正确路径。
 *
 * 退出码：
 *   0 = 允许（不是受保护的配置文件）
 *   2 = 阻断（尝试修改受保护的配置文件）
 */

'use strict';

const path = require('path');

const MAX_STDIN = 1024 * 1024;
let raw = '';

// 受保护的配置文件列表（basename 匹配）
const PROTECTED_FILES = new Set([
  // ESLint（旧版 + v9 扁平配置，支持 JS/TS/MJS/CJS）
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.json',
  '.eslintrc.yml',
  '.eslintrc.yaml',
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.cjs',
  'eslint.config.ts',
  'eslint.config.mts',
  'eslint.config.cts',
  // Prettier（含 ESM 变体的所有配置格式）
  '.prettierrc',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.json',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
  // Biome
  'biome.json',
  'biome.jsonc',
  // Ruff（Python）
  '.ruff.toml',
  'ruff.toml',
  // 注意：pyproject.toml 不在此列，因为它同时包含项目元数据和规范配置，
  // 完全屏蔽会阻止合法的依赖变更。
  // Shell / 样式 / Markdown
  '.shellcheckrc',
  '.stylelintrc',
  '.stylelintrc.json',
  '.stylelintrc.yml',
  '.markdownlint.json',
  '.markdownlint.yaml',
  '.markdownlintrc',
]);

function parseInput(inputOrRaw) {
  if (typeof inputOrRaw === 'string') {
    try {
      return inputOrRaw.trim() ? JSON.parse(inputOrRaw) : {};
    } catch {
      return {};
    }
  }
  return inputOrRaw && typeof inputOrRaw === 'object' ? inputOrRaw : {};
}

/**
 * 核心逻辑——导出 run() 供进程内直接调用，避免 spawnSync 的开销。
 */
function run(inputOrRaw, options = {}) {
  if (options.truncated) {
    return {
      exitCode: 2,
      stderr:
        `已阻断：Hook 输入超过 ${options.maxStdin || MAX_STDIN} 字节。` +
        '拒绝在截断的载荷上绕过配置保护。' +
        '请缩小编辑范围或临时禁用此 hook 后重试。'
    };
  }

  const input = parseInput(inputOrRaw);
  const filePath = input?.tool_input?.file_path || input?.tool_input?.file || '';
  if (!filePath) return { exitCode: 0 };

  const basename = path.basename(filePath);
  if (PROTECTED_FILES.has(basename)) {
    return {
      exitCode: 2,
      stderr:
        `已阻断：不允许修改 ${basename}。` +
        '请修复源码以满足规范要求，而不是降低规范标准。' +
        '如确有必要修改此配置，请临时禁用该 hook。',
    };
  }

  return { exitCode: 0 };
}

module.exports = { run };

// stdin 入口（作为独立进程运行时的回退）
let truncated = /^(1|true|yes)$/i.test(String(process.env.HOOK_INPUT_TRUNCATED || ''));
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (raw.length < MAX_STDIN) {
    const remaining = MAX_STDIN - raw.length;
    raw += chunk.substring(0, remaining);
    if (chunk.length > remaining) truncated = true;
  } else {
    truncated = true;
  }
});

process.stdin.on('end', () => {
  const result = run(raw, {
    truncated,
    maxStdin: Number(process.env.HOOK_INPUT_MAX_BYTES) || MAX_STDIN,
  });

  if (result.stderr) {
    process.stderr.write(result.stderr + '\n');
  }

  if (result.exitCode === 2) {
    process.exit(2);
  }

  process.stdout.write(raw);
});
