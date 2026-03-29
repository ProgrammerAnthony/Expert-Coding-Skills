#!/usr/bin/env node
/**
 * Cursor Tab Hook - 文件读取前
 * 阻断 Tab 读取敏感文件（.env、密钥、证书等）
 */
const { readStdin } = require('./adapter');
readStdin().then(raw => {
  try {
    const input    = JSON.parse(raw);
    const filePath = input.path || input.file || '';
    if (/\.(env|key|pem)$|\.env\.|credentials|secret/i.test(filePath)) {
      console.error('[Hook] 已阻断：Tab 不允许读取敏感文件：' + filePath);
      process.exit(2);
    }
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
