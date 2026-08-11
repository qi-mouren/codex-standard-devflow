#!/usr/bin/env node
// devflow-heartbeat.mjs — 子 agent 显式心跳（跨平台，Node 即可）
// 用法:
//   node docs/process/.opencode-heartbeat.mjs "<正在做什么>"
//   node docs/process/.opencode-heartbeat.mjs --task-name mod01_r1 --heartbeat-file docs/process/tasks/.heartbeat-mod01_r1 --log-file docs/process/logs/runs/run-01.jsonl "<正在做什么>"
// 配置(可选默认值): docs/process/.devflow-heartbeat.json（BOM 容错；CLI 参数优先）
//   { "projectPath": ".", "taskName": "mod01_r1",
//     "heartbeatFile": "docs/process/tasks/.heartbeat-mod01_r1",
//     "logFile": "docs/process/logs/runs/run-01.jsonl" }
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
const flagNames = ["--project-path", "--task-name", "--heartbeat-file", "--log-file"];
function flagValue(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}
const hasCli = flagNames.some((f) => args.includes(f));
const note = args.find((a) => !a.startsWith("--") && !flagNames.includes(a)) ?? "heartbeat";

let cfg = null;
try {
  cfg = JSON.parse(stripBom(readFileSync(resolve(root, "docs/process/.devflow-heartbeat.json"), "utf8")));
} catch {
  cfg = null;
}
if (!cfg && !hasCli) {
  console.error("devflow-heartbeat: missing/invalid docs/process/.devflow-heartbeat.json 且无 CLI 参数");
  process.exit(2);
}

const projectPath = flagValue("--project-path") ?? cfg?.projectPath ?? ".";
const task = flagValue("--task-name") ?? cfg?.taskName ?? "child";
if (!/^[a-z0-9_]+$/.test(task)) {
  console.error(`invalid task_name: '${task}' (only lowercase letters, digits, underscores allowed)`);
  process.exit(4);
}
const hbArg = flagValue("--heartbeat-file") ?? cfg?.heartbeatFile ?? "docs/process/tasks/.heartbeat";
const logArg = flagValue("--log-file") ?? cfg?.logFile ?? "";

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
