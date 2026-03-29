#!/usr/bin/env node
const { readStdin, runExistingHook, transformToClaude, hookEnabled } = require('./adapter');
readStdin().then(raw => {
  try {
    const input = JSON.parse(raw || '{}');
    const claudeInput = transformToClaude(input);
    if (hookEnabled('before:submit:check-secrets', ['standard', 'strict'])) {
      runExistingHook('check-secrets.js', JSON.stringify(claudeInput));
    }
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
