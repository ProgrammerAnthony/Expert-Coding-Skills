/**
 * Hook 和脚本通用工具函数库
 * 跨平台支持：Windows、macOS、Linux
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');

// 平台检测
const isWindows = process.platform === 'win32';
const isMacOS   = process.platform === 'darwin';
const isLinux   = process.platform === 'linux';
const SESSION_DATA_DIR_NAME = 'session-data';
const LEGACY_SESSIONS_DIR_NAME = 'sessions';
const WINDOWS_RESERVED_SESSION_IDS = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

/**
 * 获取用户主目录（跨平台）
 */
function getHomeDir() {
  return os.homedir();
}

/**
 * 获取 Claude 配置目录
 */
function getClaudeDir() {
  return path.join(getHomeDir(), '.claude');
}

/**
 * 获取会话数据目录
 */
function getSessionsDir() {
  return path.join(getClaudeDir(), SESSION_DATA_DIR_NAME);
}

/**
 * 获取旧版会话目录（兼容历史数据）
 */
function getLegacySessionsDir() {
  return path.join(getClaudeDir(), LEGACY_SESSIONS_DIR_NAME);
}

/**
 * 获取所有会话搜索目录（按优先级排序）
 */
function getSessionSearchDirs() {
  return Array.from(new Set([getSessionsDir(), getLegacySessionsDir()]));
}

/**
 * 获取已学习技能的存储目录
 */
function getLearnedSkillsDir() {
  return path.join(getClaudeDir(), 'skills', 'learned');
}

/**
 * 获取系统临时目录（跨平台）
 */
function getTempDir() {
  return os.tmpdir();
}

/**
 * 确保目录存在，不存在则创建
 * @param {string} dirPath - 目标目录路径
 * @returns {string} 目录路径
 * @throws {Error} 目录无法创建时抛出（如权限不足）
 */
function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (err) {
    // EEXIST is fine (race condition with another process creating it)
    if (err.code !== 'EEXIST') {
      throw new Error(`Failed to create directory '${dirPath}': ${err.message}`);
    }
  }
  return dirPath;
}

/**
 * 获取当前日期，格式：YYYY-MM-DD
 */
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 获取当前时间，格式：HH:MM
 */
function getTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 获取 git 仓库名称
 */
function getGitRepoName() {
  const result = runCommand('git rev-parse --show-toplevel');
  if (!result.success) return null;
  return path.basename(result.output);
}

/**
 * 获取项目名称（优先从 git 仓库名获取，否则使用当前目录名）
 */
function getProjectName() {
  const repoName = getGitRepoName();
  if (repoName) return repoName;
  return path.basename(process.cwd()) || null;
}

/**
 * 将字符串规范化为会话文件名片段。
 * 将无效字符替换为连字符，合并连续连字符，去除首尾连字符，
 * 去除开头的点（使 ".claude" 映射为 "claude"）。
 *
 * 纯非 ASCII 输入通过稳定的 8 位哈希表示，确保不同名称不会合并为相同 ID。
 * 混合脚本输入保留 ASCII 部分，并追加短哈希后缀用于消歧。
 */
function sanitizeSessionId(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const hasNonAscii = Array.from(raw).some(char => char.codePointAt(0) > 0x7f);
  const normalized = raw.replace(/^\.+/, '');
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  if (sanitized.length > 0) {
    const suffix = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 6);
    if (WINDOWS_RESERVED_SESSION_IDS.has(sanitized.toUpperCase())) {
      return `${sanitized}-${suffix}`;
    }
    if (!hasNonAscii) return sanitized;
    return `${sanitized}-${suffix}`;
  }

  const meaningful = normalized.replace(/[\s\p{P}]/gu, '');
  if (meaningful.length === 0) return null;

  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 8);
}

/**
 * 从 CLAUDE_SESSION_ID 环境变量获取短会话 ID（取末 8 位），
 * 依次回退到规范化的项目名称，最后回退到 'default'。
 */
function getSessionIdShort(fallback = 'default') {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (sessionId && sessionId.length > 0) {
    const sanitized = sanitizeSessionId(sessionId.slice(-8));
    if (sanitized) return sanitized;
  }
  return sanitizeSessionId(getProjectName()) || sanitizeSessionId(fallback) || 'default';
}

/**
 * 获取当前日期时间，格式：YYYY-MM-DD HH:MM:SS
 */
function getDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 在目录中查找匹配指定模式的文件（跨平台，替代 find 命令）
 * @param {string} dir - 搜索目录
 * @param {string} pattern - 文件匹配模式（如 "*.tmp"、"*.md"）
 * @param {object} options - 选项：{ maxAge: 天数, recursive: 是否递归 }
 */
function findFiles(dir, pattern, options = {}) {
  if (!dir || typeof dir !== 'string') return [];
  if (!pattern || typeof pattern !== 'string') return [];

  const { maxAge = null, recursive = false } = options;
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  // 先转义正则特殊字符，再将 glob 通配符转换为正则等价形式
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);

  function searchDir(currentDir) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isFile() && regex.test(entry.name)) {
          let stats;
          try {
            stats = fs.statSync(fullPath);
          } catch {
            continue; // 文件在 readdir 和 stat 之间被删除
          }

          if (maxAge !== null) {
            const ageInDays = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60 * 24);
            if (ageInDays <= maxAge) {
              results.push({ path: fullPath, mtime: stats.mtimeMs });
            }
          } else {
            results.push({ path: fullPath, mtime: stats.mtimeMs });
          }
        } else if (entry.isDirectory() && recursive) {
          searchDir(fullPath);
        }
      }
    } catch (_err) {
      // 忽略权限错误
    }
  }

  searchDir(dir);

  // 按修改时间倒序排序（最新在前）
  results.sort((a, b) => b.mtime - a.mtime);

  return results;
}

/**
 * 从 stdin 读取并解析 JSON（用于 hook 输入）
 * @param {object} options - 选项
 * @param {number} options.timeoutMs - 超时毫秒数（默认 5000），防止 stdin 未关闭时 hook 无限等待
 * @returns {Promise<object>} 解析后的 JSON 对象，stdin 为空时返回空对象
 */
async function readStdinJson(options = {}) {
  const { timeoutMs = 5000, maxSize = 1024 * 1024 } = options;

  return new Promise((resolve) => {
    let data = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        // 清理 stdin 监听器，让事件循环能够正常退出
        process.stdin.removeAllListeners('data');
        process.stdin.removeAllListeners('end');
        process.stdin.removeAllListeners('error');
        if (process.stdin.unref) process.stdin.unref();
        // 使用已读取的内容 resolve，避免挂起
        try {
          resolve(data.trim() ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      }
    }, timeoutMs);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => {
      if (data.length < maxSize) {
        data += chunk;
      }
    });

    process.stdin.on('end', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        resolve(data.trim() ? JSON.parse(data) : {});
      } catch {
        // 输入格式异常时 resolve 空对象，保持 hook 非阻断
        resolve({});
      }
    });

    process.stdin.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // stdin 出错时 resolve 空对象，保持 hook 非阻断
      resolve({});
    });
  });
}

/**
 * 输出日志到 stderr（AI 会话中对用户可见）
 */
function log(message) {
  console.error(message);
}

/**
 * 输出到 stdout（返回给 AI 作为 hook 输出）
 */
function output(data) {
  if (typeof data === 'object') {
    console.log(JSON.stringify(data));
  } else {
    console.log(data);
  }
}

/**
 * 安全读取文本文件（失败时返回 null）
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * 写入文本文件（自动创建父目录）
 */
function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * 追加内容到文本文件（自动创建父目录）
 */
function appendFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, content, 'utf8');
}

/**
 * 检查命令是否存在于 PATH 中（使用 execFileSync 防止命令注入）
 */
function commandExists(cmd) {
  // 仅允许字母、数字、短横线、下划线、点号
  if (!/^[a-zA-Z0-9_.-]+$/.test(cmd)) {
    return false;
  }

  try {
    if (isWindows) {
      // 使用 spawnSync 避免 shell 插值
      const result = spawnSync('where', [cmd], { stdio: 'pipe' });
      return result.status === 0;
    } else {
      const result = spawnSync('which', [cmd], { stdio: 'pipe' });
      return result.status === 0;
    }
  } catch {
    return false;
  }
}

/**
 * 执行命令并返回输出
 *
 * 安全说明：此函数执行 shell 命令，仅用于已知安全的硬编码命令。
 * 切勿直接传入用户输入；如有用户输入，请改用 spawnSync + 参数数组形式。
 *
 * @param {string} cmd - 要执行的命令（应为受信任的硬编码命令）
 * @param {object} options - execSync 选项
 */
function runCommand(cmd, options = {}) {
  // 白名单：仅允许已知安全的命令前缀
  const allowedPrefixes = ['git ', 'node ', 'npx ', 'which ', 'where '];
  if (!allowedPrefixes.some(prefix => cmd.startsWith(prefix))) {
    return { success: false, output: 'runCommand 已阻断：未识别的命令前缀' };
  }

  // 拒绝 shell 元字符：$() 和反引号在双引号内仍会被执行，因此
  // 在整个命令中禁止 $ 和 `；其他操作符（;|&）仅在非引号部分检测
  const unquoted = cmd.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '');
  if (/[;|&\n]/.test(unquoted) || /[`$]/.test(cmd)) {
    return { success: false, output: 'runCommand 已阻断：不允许使用 shell 元字符' };
  }

  try {
    const result = execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      ...options
    });
    return { success: true, output: result.trim() };
  } catch (err) {
    return { success: false, output: err.stderr || err.message };
  }
}

/**
 * 检查当前目录是否是 git 仓库
 */
function isGitRepo() {
  return runCommand('git rev-parse --git-dir').success;
}

/**
 * 获取 git 已修改的文件列表，可按正则模式过滤
 * @param {string[]} patterns - 用于过滤文件的正则模式数组，无效模式会被静默跳过
 * @returns {string[]} 已修改文件路径数组
 */
function getGitModifiedFiles(patterns = []) {
  if (!isGitRepo()) return [];

  const result = runCommand('git diff --name-only HEAD');
  if (!result.success) return [];

  let files = result.output.split('\n').filter(Boolean);

  if (patterns.length > 0) {
    // 预编译正则，跳过无效模式
    const compiled = [];
    for (const pattern of patterns) {
      if (typeof pattern !== 'string' || pattern.length === 0) continue;
      try {
        compiled.push(new RegExp(pattern));
      } catch {
        // 跳过无效正则
      }
    }
    if (compiled.length > 0) {
      files = files.filter(file => compiled.some(regex => regex.test(file)));
    }
  }

  return files;
}

/**
 * 替换文件中的文本（跨平台 sed 替代方案）
 * @param {string} filePath - 文件路径
 * @param {string|RegExp} search - 搜索模式。字符串模式仅替换第一处；
 *   全局替换请使用带 `g` 标志的 RegExp
 * @param {string} replace - 替换字符串
 * @param {object} options - 选项
 * @param {boolean} options.all - 为 true 且 search 为字符串时，替换所有匹配项（RegExp 模式忽略此项）
 * @returns {boolean} 写入成功返回 true，失败返回 false
 */
function replaceInFile(filePath, search, replace, options = {}) {
  const content = readFile(filePath);
  if (content === null) return false;

  try {
    let newContent;
    if (options.all && typeof search === 'string') {
      newContent = content.replaceAll(search, replace);
    } else {
      newContent = content.replace(search, replace);
    }
    writeFile(filePath, newContent);
    return true;
  } catch (err) {
    log(`[Utils] replaceInFile 失败，文件：${filePath}，错误：${err.message}`);
    return false;
  }
}

/**
 * 统计文件中某模式的出现次数
 * @param {string} filePath - 文件路径
 * @param {string|RegExp} pattern - 统计模式。字符串视为全局正则；
 *   RegExp 实例会强制加上 global 标志以确保正确计数
 * @returns {number} 匹配次数
 */
function countInFile(filePath, pattern) {
  const content = readFile(filePath);
  if (content === null) return 0;

  let regex;
  try {
    if (pattern instanceof RegExp) {
      // 创建新 RegExp 以避免共享 lastIndex；强制加上 global 标志
      regex = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    } else if (typeof pattern === 'string') {
      regex = new RegExp(pattern, 'g');
    } else {
      return 0;
    }
  } catch {
    return 0; // 无效正则
  }
  const matches = content.match(regex);
  return matches ? matches.length : 0;
}

/**
 * 去除字符串中的所有 ANSI 转义序列。
 *
 * 处理以下类型：
 * - CSI 序列：\x1b[ … <字母>（颜色、光标移动、清屏等）
 * - OSC 序列：\x1b] … BEL/ST（窗口标题、超链接）
 * - 字符集选择：\x1b(B
 * - 裸 ESC + 单字母：\x1b <字母>（如 \x1bM 反向索引）
 *
 * @param {string} str - 可能包含 ANSI 代码的输入字符串
 * @returns {string} 去除所有转义序列后的干净字符串
 */
function stripAnsi(str) {
  if (typeof str !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b(?:\[[0-9;?]*[A-Za-z]|\][^\x07\x1b]*(?:\x07|\x1b\\)|\([A-Z]|[A-Z])/g, '');
}

/**
 * 在文件中搜索匹配模式，返回带行号的匹配行
 */
function grepFile(filePath, pattern) {
  const content = readFile(filePath);
  if (content === null) return [];

  let regex;
  try {
    if (pattern instanceof RegExp) {
      // 创建不带 'g' 标志的新 RegExp，防止 .test() 在循环中因 lastIndex
      // 状态而导致交替匹配/未匹配的问题
      const flags = pattern.flags.replace('g', '');
      regex = new RegExp(pattern.source, flags);
    } else {
      regex = new RegExp(pattern);
    }
  } catch {
    return []; // 无效正则
  }
  const lines = content.split('\n');
  const results = [];

  lines.forEach((line, index) => {
    if (regex.test(line)) {
      results.push({ lineNumber: index + 1, content: line });
    }
  });

  return results;
}

module.exports = {
  // 平台信息
  isWindows,
  isMacOS,
  isLinux,

  // 目录
  getHomeDir,
  getClaudeDir,
  getSessionsDir,
  getLegacySessionsDir,
  getSessionSearchDirs,
  getLearnedSkillsDir,
  getTempDir,
  ensureDir,

  // 日期/时间
  getDateString,
  getTimeString,
  getDateTimeString,

  // 会话/项目
  sanitizeSessionId,
  getSessionIdShort,
  getGitRepoName,
  getProjectName,

  // 文件操作
  findFiles,
  readFile,
  writeFile,
  appendFile,
  replaceInFile,
  countInFile,
  grepFile,

  // 字符串处理
  stripAnsi,

  // Hook I/O
  readStdinJson,
  log,
  output,

  // 系统工具
  commandExists,
  runCommand,
  isGitRepo,
  getGitModifiedFiles
};
