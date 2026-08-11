#!/usr/bin/env node
// classify-change.mjs — 自动模式判断（Quick / Standard / Enterprise）
// 用法:
//   node classify-change.mjs --project-path <项目> [--files "src/user/api.py docs/01-prd/prd.md"] [--base main] [--head HEAD] [--max-files 3] [--max-lines 200] [--json]
// 说明: 启发式建议，最终由人/总控拍板；触发条件详见 references/quick-mode.md。
// 退出码: 0=给出建议 | 2=参数错误/非 git 且无 --files
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "files", type: "string" },
  { name: "base", type: "string" },
  { name: "head", type: "string" },
  { name: "maxFiles", type: "number" },
  { name: "maxLines", type: "number" },
  { name: "json", type: "boolean" },
]);

const project = args.projectPath ?? "";
if (!project || !existsSync(project)) {
  console.error("missing/invalid --project-path");
  process.exit(2);
}
const maxFiles = args.maxFiles ?? 3;
const maxLines = args.maxLines ?? 200;
const base = args.base ?? "main";
const head = args.head ?? "HEAD";

let files = [];
if (args.files) {
  files = args.files.split(/[\s,]+/).filter(Boolean);
} else {
  try {
    let diff = "";
    try {
      diff = execFileSync("git", ["-C", project, "diff", "--name-only", `${base}...${head}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      diff = execFileSync("git", ["-C", project, "diff", "--name-only"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    }
    const untracked = execFileSync("git", ["-C", project, "ls-files", "--others", "--exclude-standard"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    files = [...new Set([...diff.split(/\r?\n/).filter(Boolean), ...untracked.split(/\r?\n/).filter(Boolean)])];
  } catch {
    console.error("不是 git 仓库且未提供 --files");
    process.exit(2);
  }
}

function estimateLines() {
  if (args.files) {
    let n = 0;
    for (const f of files) {
      try {
        n += readFileSync(join(project, f), "utf8").split(/\r?\n/).length;
      } catch {
        // 文件不存在时不计行数
      }
    }
    return n;
  }
  try {
    const out = execFileSync("git", ["-C", project, "diff", "--numstat", `${base}...${head}`], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    let n = 0;
    for (const line of out.split(/\r?\n/)) {
      const m = line.match(/^(\d+)\s+(\d+)\s+/);
      if (m) n += Number(m[1]) + Number(m[2]);
    }
    return n;
  } catch {
    return 0;
  }
}

const moduleDirs = new Set();
for (const f of files) {
  const parts = f.split(/[\\/]/);
  if (parts[0] === "src" && parts[1]) moduleDirs.add(parts[1]);
  else if (parts[0] === "tests" && parts[1] && /^test_/.test(parts[1])) {
    moduleDirs.add(parts[1].replace(/^test_/, "").replace(/\.py$/, ""));
  }
}

const contractTouch = files.some((f) => /(^|\/)contracts(\/|$)/.test(f) || f.includes("contracts-registry"));
const archTouch = files.some((f) => /^docs\/(00-requirements|01-prd|02-hld|03-scope|04-lld)\//.test(f));
const anchorAdded = files.some((f) => /^docs\/00-requirements\/requirements-anchor/.test(f));
const fileCount = files.length;
const lines = estimateLines();

const quickOk = !contractTouch && !archTouch && fileCount <= maxFiles && lines <= maxLines && moduleDirs.size <= 1;
const enterpriseHits = [];
if (anchorAdded) enterpriseHits.push("新增需求锚点（新史诗）");
if (moduleDirs.size >= 4) enterpriseHits.push(`跨 ${moduleDirs.size} 个模块目录`);
if (lines > 1000) enterpriseHits.push(`改动约 ${lines} 行（>1000）`);
if (fileCount > 20) enterpriseHits.push(`改动文件 ${fileCount} 个（>20）`);

const mode = enterpriseHits.length ? "Enterprise" : quickOk ? "Quick" : "Standard";
const reasons = {
  fileCount,
  estimatedLines: lines,
  moduleDirs: [...moduleDirs].sort(),
  contractTouch,
  archTouch,
  anchorAdded,
};

if (args.json) {
  console.log(JSON.stringify({ mode, quick: mode === "Quick", standard: mode === "Standard", enterprise: mode === "Enterprise", reasons }, null, 2));
} else {
  console.log(`建议模式: ${mode}`);
  console.log(`  改动文件: ${fileCount} 个（快速上限 ${maxFiles}）`);
  console.log(`  预估行数: ${lines} 行（快速上限 ${maxLines}）`);
  console.log(`  模块目录: ${moduleDirs.size ? [...moduleDirs].sort().join(", ") : "无 src 改动"}`);
  console.log(`  触碰契约: ${contractTouch ? "是" : "否"}`);
  console.log(`  触碰流程产物(锚点/PRD/HLD/范围/LLD): ${archTouch ? "是" : "否"}`);
  if (mode === "Quick") console.log("  满足快速条件：不跨模块、不碰契约、改动面小");
  if (mode === "Enterprise") console.log(`  命中大型条件: ${enterpriseHits.join("；")}`);
  console.log("  提示：自动判断只是建议，最终由人/总控拍板（见 references/quick-mode.md）");
}
process.exit(0);
