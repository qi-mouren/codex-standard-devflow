#!/usr/bin/env node
// devflow-heartbeat.mjs — 子 agent 显式心跳（跨平台，Node 即可）
// 用法:
//   node docs/agent/.opencode-heartbeat.mjs --note "<正在做什么>"
//   node docs/agent/.opencode-heartbeat.mjs "<正在做什么>"   # 位置参数兼容
//   node docs/agent/.opencode-heartbeat.mjs --task-name mod01_r1 --heartbeat-file docs/agent/tasks/.heartbeat-mod01_r1 --log-file docs/agent/logs/runs/run-01.jsonl --note "<正在做什么>"
// 配置(可选默认值): docs/agent/.devflow-heartbeat.json（BOM 容错；CLI 参数优先）
//   { "projectPath": ".", "taskName": "mod01_r1",
//     "heartbeatFile": "docs/agent/tasks/.heartbeat-mod01_r1",
//     "logFile": "docs/agent/logs/runs/run-01.jsonl" }
// 行为: 写心跳快照（.heartbeat-*）+ 追加执行账（run-*.jsonl），与 Codex 的
//       update-heartbeat.ps1 / scripts/node/update-heartbeat.mjs 同一文件语义。
// 退出码: 0=成功 | 2=配置缺失/无效且无 CLI 参数 | 4=task_name 非法
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

function stripBom(s) {
  return s && s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

const root = process.cwd();
const args = process.argv.slice(2);
const flagNames = ["--project-path", "--task-name", "--heartbeat-file", "--log-file", "--note"];
// 逐个 flag 消费自己的值；剩余非 flag 参数才视为位置参数（note 兼容）。
const values = {};
const positionals = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (flagNames.includes(a)) {
    values[a] = args[i + 1];
    i++;
  } else if (!a.startsWith("--")) {
    positionals.push(a);
  }
}
const hasCli = Object.keys(values).length > 0;
const note = values["--note"] ?? positionals[0] ?? "heartbeat";

let cfg = null;
try {
  cfg = JSON.parse(stripBom(readFileSync(resolve(root, "docs/agent/.devflow-heartbeat.json"), "utf8")));
} catch {
  cfg = null;
}
if (!cfg && !hasCli) {
  console.error("devflow-heartbeat: missing/invalid docs/agent/.devflow-heartbeat.json 且无 CLI 参数");
  process.exit(2);
}

const projectPath = values["--project-path"] ?? cfg?.projectPath ?? ".";
const task = values["--task-name"] ?? cfg?.taskName ?? "child";
if (!/^[a-z0-9_]+$/.test(task)) {
  console.error(`invalid task_name: '${task}' (only lowercase letters, digits, underscores allowed)`);
  process.exit(4);
}
const hbArg = values["--heartbeat-file"] ?? cfg?.heartbeatFile ?? "docs/agent/tasks/.heartbeat";
const logArg = values["--log-file"] ?? cfg?.logFile ?? "";

const project = resolve(root, projectPath);
const hbFile = isAbsolute(hbArg) ? hbArg : resolve(project, hbArg);
const logFile = logArg ? (isAbsolute(logArg) ? logArg : resolve(project, logArg)) : "";
const ts = new Date().toISOString();
const host = process.env.COMPUTERNAME || process.env.HOSTNAME || "unknown";

const snapshot = { project, task, timestamp: ts, note, host };
mkdirSync(dirname(hbFile), { recursive: true });
writeFileSync(hbFile, JSON.stringify(snapshot, null, 2), "utf8");
console.log(`heartbeat updated: ${hbFile}`);

if (logFile) {
  mkdirSync(dirname(logFile), { recursive: true });
  appendFileSync(logFile, JSON.stringify({ ts, task, note, host }) + "\n", "utf8");
  console.log(`run log appended: ${logFile}`);
}
process.exit(0);
