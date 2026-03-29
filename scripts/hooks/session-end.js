#!/usr/bin/env node
/**
 * Stop Hook（会话结束）：在活跃会话中持久化学习内容
 *
 * 跨平台（Windows、macOS、Linux）
 *
 * 在每次响应结束时（Stop 事件）运行。从会话 transcript 中提取有意义的摘要，
 * 并更新会话文件以实现跨会话的上下文延续。
 */

const path = require('path');
const fs = require('fs');
const {
  getSessionsDir,
  getDateString,
  getTimeString,
  getSessionIdShort,
  getProjectName,
  ensureDir,
  readFile,
  writeFile,
  runCommand,
  stripAnsi,
  log
} = require('../lib/utils');

// 摘要块的边界标记（用于幂等更新）
const SUMMARY_START_MARKER = '<!-- HOOK:SUMMARY:START -->';
const SUMMARY_END_MARKER   = '<!-- HOOK:SUMMARY:END -->';
const SESSION_SEPARATOR    = '\n---\n';

/**
 * 从 transcript 中提取有意义的摘要。
 * 读取 JSONL 格式的 transcript，提取关键信息：
 * - 用户消息（请求的任务）
 * - 使用的工具
 * - 修改的文件
 */
function extractSessionSummary(transcriptPath) {
  const content = readFile(transcriptPath);
  if (!content) return null;

  const lines = content.split('\n').filter(Boolean);
  const userMessages = [];
  const toolsUsed = new Set();
  const filesModified = new Set();
  let parseErrors = 0;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // 收集用户消息（每条最多取前 200 个字符）
      if (entry.type === 'user' || entry.role === 'user' || entry.message?.role === 'user') {
        // 同时支持直接 content 和嵌套 message.content（JSONL 格式）
        const rawContent = entry.message?.content ?? entry.content;
        const text = typeof rawContent === 'string'
          ? rawContent
          : Array.isArray(rawContent)
            ? rawContent.map(c => (c && c.text) || '').join(' ')
            : '';
        const cleaned = stripAnsi(text).trim();
        if (cleaned) userMessages.push(cleaned.slice(0, 200));
      }

      // 收集工具名称和修改的文件（直接的 tool_use 条目）
      if (entry.type === 'tool_use' || entry.tool_name) {
        const toolName = entry.tool_name || entry.name || '';
        if (toolName) toolsUsed.add(toolName);

        const filePath = entry.tool_input?.file_path || entry.input?.file_path || '';
        if (filePath && (toolName === 'Edit' || toolName === 'Write')) {
          filesModified.add(filePath);
        }
      }

      // 从 assistant 消息的 content blocks 中提取工具调用
      if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'tool_use') {
            const toolName = block.name || '';
            if (toolName) toolsUsed.add(toolName);

            const filePath = block.input?.file_path || '';
            if (filePath && (toolName === 'Edit' || toolName === 'Write')) {
              filesModified.add(filePath);
            }
          }
        }
      }
    } catch {
      parseErrors++;
    }
  }

  if (parseErrors > 0) {
    log(`[SessionEnd] 跳过 ${parseErrors}/${lines.length} 行无法解析的 transcript`);
  }

  if (userMessages.length === 0) return null;

  return {
    userMessages:  userMessages.slice(-10),              // 取最后 10 条用户消息
    toolsUsed:     Array.from(toolsUsed).slice(0, 20),
    filesModified: Array.from(filesModified).slice(0, 30),
    totalMessages: userMessages.length
  };
}

// 从 stdin 读取 hook 输入（transcript_path 通过 stdin JSON 传入）
const MAX_STDIN = 1024 * 1024;
let stdinData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (stdinData.length < MAX_STDIN) {
    const remaining = MAX_STDIN - stdinData.length;
    stdinData += chunk.substring(0, remaining);
  }
});

process.stdin.on('end', () => {
  main().catch(err => {
    console.error('[SessionEnd] 错误：', err.message);
    process.exit(0);
  });
});

function getSessionMetadata() {
  const branchResult = runCommand('git rev-parse --abbrev-ref HEAD');
  return {
    project:  getProjectName() || 'unknown',
    branch:   branchResult.success ? branchResult.output : 'unknown',
    worktree: process.cwd()
  };
}

function extractHeaderField(header, label) {
  const match = header.match(new RegExp(`\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

function buildSessionHeader(today, currentTime, metadata, existingContent = '') {
  const headingMatch = existingContent.match(/^#\s+.+$/m);
  const heading  = headingMatch ? headingMatch[0] : `# 会话：${today}`;
  const date     = extractHeaderField(existingContent, '日期') || today;
  const started  = extractHeaderField(existingContent, '开始时间') || currentTime;

  return [
    heading,
    `**日期：** ${date}`,
    `**开始时间：** ${started}`,
    `**最后更新：** ${currentTime}`,
    `**项目：** ${metadata.project}`,
    `**分支：** ${metadata.branch}`,
    `**工作目录：** ${metadata.worktree}`,
    ''
  ].join('\n');
}

function mergeSessionHeader(content, today, currentTime, metadata) {
  const separatorIndex = content.indexOf(SESSION_SEPARATOR);
  if (separatorIndex === -1) return null;

  const existingHeader = content.slice(0, separatorIndex);
  const body = content.slice(separatorIndex + SESSION_SEPARATOR.length);
  const nextHeader = buildSessionHeader(today, currentTime, metadata, existingHeader);
  return `${nextHeader}${SESSION_SEPARATOR}${body}`;
}

async function main() {
  // 解析 stdin JSON 获取 transcript_path
  let transcriptPath = null;
  try {
    const input = JSON.parse(stdinData);
    transcriptPath = input.transcript_path;
  } catch {
    // 回退到环境变量（向后兼容）
    transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
  }

  const sessionsDir    = getSessionsDir();
  const today          = getDateString();
  const shortId        = getSessionIdShort();
  const sessionFile    = path.join(sessionsDir, `${today}-${shortId}-session.tmp`);
  const sessionMetadata = getSessionMetadata();

  ensureDir(sessionsDir);

  const currentTime = getTimeString();
  let summary = null;

  if (transcriptPath) {
    if (fs.existsSync(transcriptPath)) {
      summary = extractSessionSummary(transcriptPath);
    } else {
      log(`[SessionEnd] Transcript 不存在：${transcriptPath}`);
    }
  }

  if (fs.existsSync(sessionFile)) {
    const existing = readFile(sessionFile);
    let updatedContent = existing;

    if (existing) {
      const merged = mergeSessionHeader(existing, today, currentTime, sessionMetadata);
      if (merged) {
        updatedContent = merged;
      } else {
        log(`[SessionEnd] 无法规范化 ${sessionFile} 的头部`);
      }
    }

    // 若有新摘要，仅更新自动生成的摘要块（幂等操作，保留用户手写内容）
    if (summary && updatedContent) {
      const summaryBlock = buildSummaryBlock(summary);

      if (updatedContent.includes(SUMMARY_START_MARKER) && updatedContent.includes(SUMMARY_END_MARKER)) {
        updatedContent = updatedContent.replace(
          new RegExp(`${escapeRegExp(SUMMARY_START_MARKER)}[\\s\\S]*?${escapeRegExp(SUMMARY_END_MARKER)}`),
          summaryBlock
        );
      } else {
        // 兼容摘要标记出现前创建的旧文件
        updatedContent = updatedContent.replace(
          /## (?:会话摘要|Session Summary|Current State)[\s\S]*?$/,
          `${summaryBlock}\n\n### 下次会话备注\n-\n\n### 需要加载的上下文\n\`\`\`\n[相关文件]\n\`\`\`\n`
        );
      }
    }

    if (updatedContent) {
      writeFile(sessionFile, updatedContent);
    }

    log(`[SessionEnd] 会话文件已更新：${sessionFile}`);
  } else {
    // 创建新会话文件
    const summarySection = summary
      ? `${buildSummaryBlock(summary)}\n\n### 下次会话备注\n-\n\n### 需要加载的上下文\n\`\`\`\n[相关文件]\n\`\`\``
      : `## 当前状态\n\n[此处填写会话上下文]\n\n### 已完成\n- [ ]\n\n### 进行中\n- [ ]\n\n### 下次会话备注\n-\n\n### 需要加载的上下文\n\`\`\`\n[相关文件]\n\`\`\``;

    const template = `${buildSessionHeader(today, currentTime, sessionMetadata)}${SESSION_SEPARATOR}${summarySection}\n`;
    writeFile(sessionFile, template);
    log(`[SessionEnd] 会话文件已创建：${sessionFile}`);
  }

  process.exit(0);
}

function buildSummarySection(summary) {
  let section = '## 会话摘要\n\n';

  // 任务（来自用户消息——折叠换行符，转义反引号以防 markdown 破坏）
  section += '### 任务\n';
  for (const msg of summary.userMessages) {
    section += `- ${msg.replace(/\n/g, ' ').replace(/`/g, '\\`')}\n`;
  }
  section += '\n';

  if (summary.filesModified.length > 0) {
    section += '### 修改的文件\n';
    for (const f of summary.filesModified) {
      section += `- ${f}\n`;
    }
    section += '\n';
  }

  if (summary.toolsUsed.length > 0) {
    section += `### 使用的工具\n${summary.toolsUsed.join(', ')}\n\n`;
  }

  section += `### 统计\n- 用户消息总数：${summary.totalMessages}\n`;
  return section;
}

function buildSummaryBlock(summary) {
  return `${SUMMARY_START_MARKER}\n${buildSummarySection(summary).trim()}\n${SUMMARY_END_MARKER}`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
