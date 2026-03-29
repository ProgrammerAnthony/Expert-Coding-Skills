#!/usr/bin/env node
/**
 * SessionStart Hook：新会话开始时加载上次上下文
 *
 * 跨平台（Windows、macOS、Linux）
 *
 * 在新 AI 会话开始时运行，将最近的会话摘要注入上下文（通过 stdout），
 * 并报告可用的会话记录和已学习技能。
 */

const {
  getSessionsDir,
  getSessionSearchDirs,
  getLearnedSkillsDir,
  findFiles,
  ensureDir,
  readFile,
  stripAnsi,
  log
} = require('../lib/utils');
const { getPackageManager, getSelectionPrompt } = require('../lib/package-manager');
const { listAliases } = require('../lib/session-aliases');
const { detectProjectType } = require('../lib/project-detect');
const path = require('path');

/**
 * 跨多个搜索目录去重，按修改时间排序，返回最近的会话文件列表
 */
function dedupeRecentSessions(searchDirs) {
  const recentSessionsByName = new Map();

  for (const [dirIndex, dir] of searchDirs.entries()) {
    const matches = findFiles(dir, '*-session.tmp', { maxAge: 7 });

    for (const match of matches) {
      const basename = path.basename(match.path);
      const current = { ...match, basename, dirIndex };
      const existing = recentSessionsByName.get(basename);

      if (
        !existing
        || current.mtime > existing.mtime
        || (current.mtime === existing.mtime && current.dirIndex < existing.dirIndex)
      ) {
        recentSessionsByName.set(basename, current);
      }
    }
  }

  return Array.from(recentSessionsByName.values())
    .sort((a, b) => b.mtime - a.mtime || a.dirIndex - b.dirIndex);
}

async function main() {
  const sessionsDir = getSessionsDir();
  const learnedDir = getLearnedSkillsDir();
  const additionalContextParts = [];

  ensureDir(sessionsDir);
  ensureDir(learnedDir);

  // 检索最近 7 天内的会话文件
  const recentSessions = dedupeRecentSessions(getSessionSearchDirs());

  if (recentSessions.length > 0) {
    const latest = recentSessions[0];
    log(`[SessionStart] 找到 ${recentSessions.length} 个近期会话`);
    log(`[SessionStart] 最新：${latest.path}`);

    // 将最新会话内容注入上下文
    const content = stripAnsi(readFile(latest.path));
    if (content && !content.includes('[Session context goes here]')) {
      additionalContextParts.push(`上次会话摘要：\n${content}`);
    }
  }

  // 检查已学习的技能
  const learnedSkills = findFiles(learnedDir, '*.md');
  if (learnedSkills.length > 0) {
    log(`[SessionStart] ${learnedSkills.length} 个已学习技能可用，位置：${learnedDir}`);
  }

  // 检查可用的会话别名
  const aliases = listAliases({ limit: 5 });
  if (aliases.length > 0) {
    const aliasNames = aliases.map(a => a.name).join(', ');
    log(`[SessionStart] ${aliases.length} 个会话别名可用：${aliasNames}`);
    log(`[SessionStart] 使用 /sessions load <alias> 继续上次会话`);
  }

  // 检测并报告包管理器
  const pm = getPackageManager();
  log(`[SessionStart] 包管理器：${pm.name}（来源：${pm.source}）`);

  if (pm.source === 'default') {
    log('[SessionStart] 未检测到包管理器偏好设置。');
    log(getSelectionPrompt());
  }

  // 检测项目类型和框架
  const projectInfo = detectProjectType();
  if (projectInfo.languages.length > 0 || projectInfo.frameworks.length > 0) {
    const parts = [];
    if (projectInfo.languages.length > 0) {
      parts.push(`语言：${projectInfo.languages.join(', ')}`);
    }
    if (projectInfo.frameworks.length > 0) {
      parts.push(`框架：${projectInfo.frameworks.join(', ')}`);
    }
    log(`[SessionStart] 项目检测结果 — ${parts.join('；')}`);
    additionalContextParts.push(`项目类型：${JSON.stringify(projectInfo)}`);
  } else {
    log('[SessionStart] 未检测到特定项目类型');
  }

  await writeSessionStartPayload(additionalContextParts.join('\n\n'));
}

function writeSessionStartPayload(additionalContext) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const payload = JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext
      }
    });

    const handleError = (err) => {
      if (settled) return;
      settled = true;
      if (err) log(`[SessionStart] stdout 写入错误：${err.message}`);
      reject(err || new Error('stdout 流错误'));
    };

    process.stdout.once('error', handleError);
    process.stdout.write(payload, (err) => {
      process.stdout.removeListener('error', handleError);
      if (settled) return;
      settled = true;
      if (err) {
        log(`[SessionStart] stdout 写入错误：${err.message}`);
        reject(err);
        return;
      }
      resolve();
    });
  });
}

main().catch(err => {
  console.error('[SessionStart] 错误：', err.message);
  process.exitCode = 0; // 出错时不阻断流程
});
