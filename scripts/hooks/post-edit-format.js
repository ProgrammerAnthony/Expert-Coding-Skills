#!/usr/bin/env node
/**
 * PostToolUse Hook：编辑 JS/TS 文件后自动格式化
 *
 * 跨平台（Windows、macOS、Linux）
 *
 * 在 Edit 工具执行后运行。若编辑的是 JS/TS 文件，
 * 自动检测项目使用的格式化工具（Biome 或 Prettier）并执行格式化。
 *
 * Biome：使用 `check --write`（格式化 + lint 一次完成）
 * Prettier：使用 `--write`（仅格式化）
 *
 * 优先使用本地 node_modules/.bin 中的二进制文件，
 * 避免 npx 包解析开销（每次可节省约 200-500ms）。
 *
 * 找不到格式化工具时静默忽略，不阻断流程。
 */

const { execFileSync, spawnSync } = require('child_process');
const path = require('path');

// Windows cmd.exe 会将这些字符解释为命令分隔符/运算符
const UNSAFE_PATH_CHARS = /[&|<>^%!]/;

const { findProjectRoot, detectFormatter, resolveFormatterBin } = require('../lib/resolve-formatter');

const MAX_STDIN = 1024 * 1024; // 1MB 限制

/**
 * 核心逻辑——导出供进程内直接调用，避免子进程开销。
 * @param {string} rawInput - stdin 传入的原始 JSON 字符串
 * @returns {string} 原始输入（透传）
 */
function run(rawInput) {
  try {
    const input = JSON.parse(rawInput);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.(ts|tsx|js|jsx)$/.test(filePath)) {
      try {
        const resolvedFilePath = path.resolve(filePath);
        const projectRoot = findProjectRoot(path.dirname(resolvedFilePath));
        const formatter = detectFormatter(projectRoot);
        if (!formatter) return rawInput;

        const resolved = resolveFormatterBin(projectRoot, formatter);
        if (!resolved) return rawInput;

        // Biome: check --write = 格式化 + lint 一次完成
        // Prettier: --write = 仅格式化
        const args = formatter === 'biome'
          ? [...resolved.prefix, 'check', '--write', resolvedFilePath]
          : [...resolved.prefix, '--write', resolvedFilePath];

        if (process.platform === 'win32' && resolved.bin.endsWith('.cmd')) {
          // Windows：.cmd 文件需要 shell 才能执行。
          // 通过拒绝含 shell 元字符的路径来防止命令注入。
          if (UNSAFE_PATH_CHARS.test(resolvedFilePath)) {
            throw new Error('文件路径包含不安全的 shell 字符');
          }
          const result = spawnSync(resolved.bin, args, {
            cwd: projectRoot,
            shell: true,
            stdio: 'pipe',
            timeout: 15000
          });
          if (result.error) throw result.error;
          if (typeof result.status === 'number' && result.status !== 0) {
            throw new Error(result.stderr?.toString() || `格式化工具退出码：${result.status}`);
          }
        } else {
          execFileSync(resolved.bin, args, {
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 15000
          });
        }
      } catch {
        // 格式化工具未安装、文件不存在或执行失败——不阻断流程
      }
    }
  } catch {
    // 输入无效——透传
  }

  return rawInput;
}

// stdin 入口（向后兼容，作为独立进程运行时使用）
if (require.main === module) {
  let data = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', chunk => {
    if (data.length < MAX_STDIN) {
      const remaining = MAX_STDIN - data.length;
      data += chunk.substring(0, remaining);
    }
  });

  process.stdin.on('end', () => {
    data = run(data);
    process.stdout.write(data);
    process.exit(0);
  });
}

module.exports = { run };
