#!/usr/bin/env node
/**
 * PostToolUse Hook：编辑 .ts/.tsx 文件后运行 TypeScript 类型检查
 *
 * 跨平台（Windows、macOS、Linux）
 *
 * 在编辑 TypeScript 文件后自动运行。从被编辑文件所在目录向上查找
 * 最近的 tsconfig.json，然后执行 tsc --noEmit 并只报告与该文件相关的错误。
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const MAX_STDIN = 1024 * 1024; // 1MB 限制
let data = "";
process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  if (data.length < MAX_STDIN) {
    const remaining = MAX_STDIN - data.length;
    data += chunk.substring(0, remaining);
  }
});

process.stdin.on("end", () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.(ts|tsx)$/.test(filePath)) {
      const resolvedPath = path.resolve(filePath);
      if (!fs.existsSync(resolvedPath)) {
        process.stdout.write(data);
        process.exit(0);
      }

      // 向上查找最近的 tsconfig.json（最多 20 层，防止无限循环）
      let dir = path.dirname(resolvedPath);
      const root = path.parse(dir).root;
      let depth = 0;

      while (dir !== root && depth < 20) {
        if (fs.existsSync(path.join(dir, "tsconfig.json"))) {
          break;
        }
        dir = path.dirname(dir);
        depth++;
      }

      if (fs.existsSync(path.join(dir, "tsconfig.json"))) {
        try {
          // Windows 上使用 npx.cmd，避免 shell: true 引入命令注入风险
          const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
          execFileSync(npxBin, ["tsc", "--noEmit", "--pretty", "false"], {
            cwd: dir,
            encoding: "utf8",
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 30000,
          });
        } catch (err) {
          // tsc 遇到错误会以非零退出码退出——仅过滤与被编辑文件相关的错误行
          const output = (err.stdout || "") + (err.stderr || "");
          // tsc 输出路径相对于 tsconfig 所在目录，因此需要同时检查
          // 相对路径、绝对路径和原始路径，避免同名文件导致误报。
          const relPath = path.relative(dir, resolvedPath);
          const candidates = new Set([filePath, resolvedPath, relPath]);
          const relevantLines = output
            .split("\n")
            .filter((line) => {
              for (const candidate of candidates) {
                if (line.includes(candidate)) return true;
              }
              return false;
            })
            .slice(0, 10);

          if (relevantLines.length > 0) {
            console.error("[Hook] TypeScript 类型错误：" + path.basename(filePath));
            relevantLines.forEach((line) => console.error(line));
          }
        }
      }
    }
  } catch {
    // 输入无效——透传
  }

  process.stdout.write(data);
  process.exit(0);
});
