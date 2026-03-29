/**
 * 格式化器检测与路径解析工具（带缓存）
 *
 * 将项目根目录查找、格式化器检测、可执行文件路径解析提取为单独模块，
 * 避免 post-edit-format.js 等多处调用时重复执行文件系统操作。
 */

'use strict';

const fs = require('fs');
const path = require('path');

// 进程内缓存（每次 hook 调用后自动清除）
const projectRootCache = new Map();
const formatterCache   = new Map();
const binCache         = new Map();

// 配置文件名列表（单一数据源）

const BIOME_CONFIGS = ['biome.json', 'biome.jsonc'];

const PRETTIER_CONFIGS = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  '.prettierrc.yml',
  '.prettierrc.yaml',
  '.prettierrc.toml',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs'
];

// 用于向上查找项目根的标记文件
const PROJECT_ROOT_MARKERS = ['package.json', ...BIOME_CONFIGS, ...PRETTIER_CONFIGS];

// Windows .cmd shim 映射
const WIN_CMD_SHIMS = { npx: 'npx.cmd', pnpm: 'pnpm.cmd', yarn: 'yarn.cmd', bunx: 'bunx.cmd' };

// 格式化器 → 包名映射
const FORMATTER_PACKAGES = {
  biome:    { binName: 'biome',    pkgName: '@biomejs/biome' },
  prettier: { binName: 'prettier', pkgName: 'prettier' }
};

/**
 * 从 startDir 向上查找，直到找到包含已知标记文件的目录（即项目根）。
 * 若未找到任何标记文件，则回退到 startDir 本身。
 *
 * @param {string} startDir - 起始目录的绝对路径
 * @returns {string} 项目根目录的绝对路径
 */
function findProjectRoot(startDir) {
  if (projectRootCache.has(startDir)) return projectRootCache.get(startDir);

  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    for (const marker of PROJECT_ROOT_MARKERS) {
      if (fs.existsSync(path.join(dir, marker))) {
        projectRootCache.set(startDir, dir);
        return dir;
      }
    }
    dir = path.dirname(dir);
  }

  projectRootCache.set(startDir, startDir);
  return startDir;
}

/**
 * 检测项目使用的格式化器。Biome 优先级高于 Prettier。
 *
 * @param {string} projectRoot - 项目根目录的绝对路径
 * @returns {'biome' | 'prettier' | null}
 */
function detectFormatter(projectRoot) {
  if (formatterCache.has(projectRoot)) return formatterCache.get(projectRoot);

  for (const cfg of BIOME_CONFIGS) {
    if (fs.existsSync(path.join(projectRoot, cfg))) {
      formatterCache.set(projectRoot, 'biome');
      return 'biome';
    }
  }

  // 在文件检测前先检查 package.json 中的 "prettier" 键
  try {
    const pkgPath = path.join(projectRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if ('prettier' in pkg) {
        formatterCache.set(projectRoot, 'prettier');
        return 'prettier';
      }
    }
  } catch {
    // package.json 格式异常——继续通过文件名检测
  }

  for (const cfg of PRETTIER_CONFIGS) {
    if (fs.existsSync(path.join(projectRoot, cfg))) {
      formatterCache.set(projectRoot, 'prettier');
      return 'prettier';
    }
  }

  formatterCache.set(projectRoot, null);
  return null;
}

/**
 * 根据包管理器解析运行器二进制路径和前缀参数。
 *
 * @param {string} projectRoot - 项目根目录的绝对路径
 * @returns {{ bin: string, prefix: string[] }}
 */
function getRunnerFromPackageManager(projectRoot) {
  const isWin = process.platform === 'win32';
  const { getPackageManager } = require('./package-manager');
  const pm = getPackageManager({ projectDir: projectRoot });
  const execCmd = pm?.config?.execCmd || 'npx';
  const [rawBin = 'npx', ...prefix] = execCmd.split(/\s+/).filter(Boolean);
  const bin = isWin ? WIN_CMD_SHIMS[rawBin] || rawBin : rawBin;
  return { bin, prefix };
}

/**
 * 解析格式化器可执行文件路径，优先使用本地 node_modules/.bin，
 * 以避免包管理器 exec 命令的解析开销。
 *
 * @param {string} projectRoot - 项目根目录的绝对路径
 * @param {'biome' | 'prettier'} formatter - 已检测到的格式化器名称
 * @returns {{ bin: string, prefix: string[] } | null}
 *   bin    — 可执行文件路径（本地绝对路径或运行器二进制名）
 *   prefix — 需要前置的额外参数（如通过 npx 调用时的包名）
 */
function resolveFormatterBin(projectRoot, formatter) {
  const cacheKey = `${projectRoot}:${formatter}`;
  if (binCache.has(cacheKey)) return binCache.get(cacheKey);

  const pkg = FORMATTER_PACKAGES[formatter];
  if (!pkg) {
    binCache.set(cacheKey, null);
    return null;
  }

  const isWin = process.platform === 'win32';
  const localBin = path.join(
    projectRoot, 'node_modules', '.bin',
    isWin ? `${pkg.binName}.cmd` : pkg.binName
  );

  if (fs.existsSync(localBin)) {
    const result = { bin: localBin, prefix: [] };
    binCache.set(cacheKey, result);
    return result;
  }

  const runner = getRunnerFromPackageManager(projectRoot);
  const result = { bin: runner.bin, prefix: [...runner.prefix, pkg.pkgName] };
  binCache.set(cacheKey, result);
  return result;
}

/**
 * 清空所有缓存（主要用于测试）。
 */
function clearCaches() {
  projectRootCache.clear();
  formatterCache.clear();
  binCache.clear();
}

module.exports = {
  findProjectRoot,
  detectFormatter,
  resolveFormatterBin,
  clearCaches
};
