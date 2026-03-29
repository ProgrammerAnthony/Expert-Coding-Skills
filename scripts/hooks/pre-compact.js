#!/usr/bin/env node
/**
 * PreCompact Hook：context 压缩前保存状态
 *
 * 跨平台（Windows、macOS、Linux）
 *
 * 在 AI 压缩上下文前运行，将压缩事件记录到日志文件，
 * 并在活跃会话文件中追加标记，防止重要信息在摘要中丢失。
 */

const path = require('path');
const {
  getSessionsDir,
  getDateTimeString,
  getTimeString,
  findFiles,
  ensureDir,
  appendFile,
  log
} = require('../lib/utils');

async function main() {
  const sessionsDir = getSessionsDir();
  const compactionLog = path.join(sessionsDir, 'compaction-log.txt');

  ensureDir(sessionsDir);

  // 记录本次压缩事件及时间戳
  const timestamp = getDateTimeString();
  appendFile(compactionLog, `[${timestamp}] 上下文压缩已触发\n`);

  // 若存在活跃会话文件，追加压缩标记
  const sessions = findFiles(sessionsDir, '*-session.tmp');

  if (sessions.length > 0) {
    const activeSession = sessions[0].path;
    const timeStr = getTimeString();
    appendFile(activeSession, `\n---\n**[${timeStr} 上下文压缩]** - 上下文已摘要化\n`);
  }

  log('[PreCompact] 压缩前状态已保存');
  process.exit(0);
}

main().catch(err => {
  console.error('[PreCompact] 错误：', err.message);
  process.exit(0);
});
