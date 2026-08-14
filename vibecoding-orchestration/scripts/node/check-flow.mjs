#!/usr/bin/env node
// check-flow.mjs - 标准开发流程健康检查（跨平台版，替代 check-flow.ps1）
// 用法: node check-flow.mjs --project-path <项目路径> [--heartbeat-warn-min 3] [--heartbeat-kill-min 8] [--heartbeat-long-min 15]
// 退出码: 0=健康 | 1=发现问题或路径不存在
// 布局: 优先 V3 布局（docs/user + docs/agent）；检测到旧布局（docs/00-requirements 或 docs/process）按旧路径检查并提示建议迁移，不报错。
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, stripBom, walkFiles } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "heartbeatWarnMin", type: "number" },
  { name: "heartbeatKillMin", type: "number" },
  { name: "heartbeatLongMin", type: "number" },
]);

const projectPath = args.projectPath ?? "";
if (!projectPath || !existsSync(projectPath)) {
  console.error(`[FATAL] 项目路径不存在: ${projectPath}`);
  process.exit(1);
}
const warnMin = args.heartbeatWarnMin ?? 3;
const killMin = args.heartbeatKillMin ?? 8;
const longMin = args.heartbeatLongMin ?? 15;

const issues = [];
let okCount = 0;
const ok = (m) => {
  console.log(`[OK] ${m}`);
  okCount++;
};
const issue = (m) => {
  console.log(`[!!] ${m}`);
  issues.push(m);
};

// 布局探测：V3（docs/user + docs/agent）优先；旧布局（docs/00-requirements 或 docs/process）兼容
const docsDir = join(projectPath, "docs");
const isV3 = existsSync(join(docsDir, "user")) || existsSync(join(docsDir, "agent"));
const isLegacy = existsSync(join(docsDir, "00-requirements")) || existsSync(join(docsDir, "process"));
if (isV3) {
  ok("文档布局: V3（docs/user + docs/agent）");
} else if (isLegacy) {
  console.log("[..] 文档布局: 旧布局（docs/00-04 + docs/process），兼容检查，建议迁移（见 references/document-governance.md §8）");
} else {
  console.log("[..] 未检测到 docs/user 或 docs/00-requirements，按 V3 布局检查（缺失将报问题）");
}

const reqDir = isV3 ? join(docsDir, "user", "00-requirements") : join(docsDir, "00-requirements");
const prdDir = isV3 ? join(docsDir, "user", "01-prd") : join(docsDir, "01-prd");
const hldDir = isV3 ? join(docsDir, "user", "02-hld") : join(docsDir, "02-hld");
const scopeDir = isV3 ? join(docsDir, "user", "03-scope") : join(docsDir, "03-scope");
const lldDir = isV3 ? join(docsDir, "user", "04-lld") : join(docsDir, "04-lld");
const procDir = isV3 ? join(docsDir, "agent") : join(docsDir, "process");
const contractsDir = join(projectPath, "contracts");
const stateFile = join(procDir, "STATE.md");
const traceFile = join(procDir, "traceability.md");
const issuesFile = join(procDir, "issues.md");

// 1. 目录结构
for (const d of [reqDir, prdDir, hldDir, scopeDir, lldDir, procDir, contractsDir]) {
  if (existsSync(d)) ok(`目录存在: ${d}`);
  else issue(`目录缺失: ${d}`);
}

// 2. 状态、追踪与问题账
if (existsSync(stateFile)) ok("STATE.md 存在");
else issue(`STATE.md 缺失: ${stateFile}`);
if (existsSync(traceFile)) ok("traceability.md 存在");
else issue(`traceability.md 缺失: ${traceFile}`);
if (existsSync(issuesFile)) ok("issues.md（问题账）存在");
else issue(`issues.md（问题账）缺失: ${issuesFile}`);

// 3. 门禁产物（按 STATE 中阶段动态判断前序产物）
let stage = "UNKNOWN";
if (existsSync(stateFile)) {
  const line = stripBom(readFileSync(stateFile, "utf8")).split(/\r?\n/).find((l) => /^-\s*阶段：/.test(l));
  if (line) stage = line.replace(/^-\s*阶段：/, "").trim();
}
console.log(`\n当前阶段: ${stage}`);

const requiredByStage = {
  "需求锚定": [],
  "产品需求": ["requirements-anchor.md"],
  "架构设计": ["PRD.md"],
  "模块拆解": ["HLD.md"],
  "详细设计": ["scope.md"],
  "开发实现": ["lld", "contracts-registry.md"],
  "集成交付": ["lld", "contracts-registry.md"],
};
if (requiredByStage[stage]) {
  for (const name of requiredByStage[stage]) {
    if (name === "lld") {
      const lldFiles = walkFiles(lldDir, { filter: (f) => f.toLowerCase().includes("lld") && f.endsWith(".md") });
      if (lldFiles.length) ok(`LLD 文件存在: ${lldFiles.length} 个`);
      else issue("LLD 文件缺失");
    } else {
      const found = [reqDir, prdDir, hldDir, scopeDir, contractsDir].some(
        (d) => existsSync(d) && walkFiles(d, { filter: (f) => f.split(/[\\/]/).pop().includes(name) }).length > 0
      );
      if (found) ok(`产物存在: ${name}`);
      else issue(`产物缺失: ${name}`);
    }
  }
}

// 4. 契约注册表基本校验
const regFile = join(contractsDir, "contracts-registry.md");
if (existsSync(regFile)) {
  if (stripBom(readFileSync(regFile, "utf8")).includes("冻结版本")) ok("契约注册表含冻结版本标记");
  else issue("契约注册表缺冻结版本标记");
}

// 5. Git tag 检查（如仓库存在）
if (existsSync(join(projectPath, ".git"))) {
  try {
    const tags = execFileSync("git", ["-C", projectPath, "tag"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const frozen = tags.split(/\r?\n/).filter((t) => /contracts-frozen/.test(t));
    if (frozen.length) ok(`契约冻结 tag 存在: ${frozen.join(", ")}`);
    else issue("契约冻结 tag 缺失 (vX-contracts-frozen)");
  } catch (e) {
    issue(`无法读取 git tags: ${e.message}`);
  }
} else {
  console.log("[..] 未检测到 .git，跳过 tag 检查");
}

// 6. 心跳检查（阈值参数化：预警 / 判死 / LONG 长命令宽限）
const tasksDir = join(procDir, "tasks");
const hbFile = join(tasksDir, ".heartbeat");
if (existsSync(hbFile)) {
  try {
    const hb = JSON.parse(stripBom(readFileSync(hbFile, "utf8")));
    const ageMin = (Date.now() - Date.parse(hb.timestamp)) / 60000;
    const isLong = (hb.note ?? "").toLowerCase().startsWith("long:");
    const limit = isLong ? longMin : killMin;
    const extra = isLong ? ", LONG 宽限" : hb.note ? ` - ${hb.note}` : "";
    if (ageMin > limit) {
      issue(`心跳过期: ${ageMin.toFixed(1)} 分钟前更新 (${hb.task}${extra})`);
    } else if (ageMin > warnMin) {
      console.log(`[..] 心跳偏旧(预警): ${ageMin.toFixed(1)} 分钟前更新 (${hb.task}${isLong ? " - LONG" : ""})`);
    } else {
      ok(`心跳正常: ${ageMin.toFixed(1)} 分钟前更新 (${hb.task}${extra})`);
    }
  } catch {
    issue(`心跳文件无法解析: ${hbFile}`);
  }
} else {
  console.log("[..] 无心跳文件（尚未启动子 agent 或已清理）");
}

// 7. 追踪矩阵完整性
if (existsSync(traceFile)) {
  if (/\| REQ-\d+/.test(stripBom(readFileSync(traceFile, "utf8")))) ok("追踪矩阵含 REQ 条目");
  else issue("追踪矩阵无 REQ 条目");
}

// 8. 运行日志（可选，未启用不算问题）
const logsDir = join(procDir, "logs");
if (existsSync(logsDir)) {
  if (existsSync(join(logsDir, "orchestration.jsonl"))) ok("调度账存在 (orchestration.jsonl)");
  else console.log("[..] 调度账缺失（尚未记录调度事件）");
} else {
  console.log("[..] 无 logs 目录（尚未启用运行监控或已清理）");
}

console.log("\n==============================");
if (issues.length === 0) {
  console.log(`流程健康检查通过 (${okCount} 项 OK)`);
  process.exit(0);
}
console.log(`发现 ${issues.length} 个问题:`);
for (const m of issues) console.log(`  - ${m}`);
process.exit(1);
