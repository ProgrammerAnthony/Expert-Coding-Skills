#!/usr/bin/env node
const { readStdin, runExistingHook, transformToClaude, hookEnabled } = require('./adapter');
readStdin().then(raw => {
  try {
    const input = JSON.parse(raw || '{}');
    const claudeInput = transformToClaude(input, {
      tool_input: { file_path: input.path || input.file || '' }
    });
    if (hookEnabled('before:read:warn-sensitive', ['standard', 'strict'])) {
      runExistingHook('warn-sensitive-file.js', JSON.stringify(claudeInput));
    }
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
