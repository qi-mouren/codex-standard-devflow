#!/usr/bin/env node
// update-heartbeat.mjs - 子 agent 心跳（跨平台版，替代 update-heartbeat.ps1）
// 用法:
//   node update-heartbeat.mjs --project-path <项目> [--task-name <task_name>] [--log-file <docs/process/logs/runs/run-N.jsonl>] [--heartbeat-file <路径>] [--note "<正在做什么>"]
// 行为: 写 .heartbeat 快照 + 追加执行账（与 PS 版同一文件语义，check-flow/watchdog 可直接复用）。
// 退出码: 0=成功 | 4=task_name 非法或参数缺失
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { hostName, nowIso, parseArgs, taskNameOk } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "taskName", type: "string" },
  { name: "logFile", type: "string" },
  { name: "heartbeatFile", type: "string" },
  { name: "note", type: "string" },
]);

const projectPath = args.projectPath ?? "";
const taskName = args.taskName ?? "child";
if (!projectPath) {
  console.error("missing --project-path");
  process.exit(4);
}
if (!taskNameOk(taskName)) {
  console.error(`invalid task_name: '${taskName}' (only lowercase letters, digits, underscores allowed)`);
  process.exit(4);
}

const tasksDir = join(projectPath, "docs", "process", "tasks");
mkdirSync(tasksDir, { recursive: true });
const hbFile = args.heartbeatFile
  ? isAbsolute(args.heartbeatFile)
    ? args.heartbeatFile
    : join(projectPath, args.heartbeatFile)
  : join(tasksDir, ".heartbeat");

const snapshot = {
  project: projectPath,
  task: taskName,
  timestamp: nowIso(),
  note: args.note ?? "",
  host: hostName(),
};
writeFileSync(hbFile, JSON.stringify(snapshot, null, 2), "utf8");
console.log(`heartbeat updated: ${hbFile}`);

if (args.logFile) {
  const runPath = isAbsolute(args.logFile) ? args.logFile : join(projectPath, args.logFile);
  mkdirSync(dirname(runPath), { recursive: true });
  appendFileSync(runPath, JSON.stringify({ ts: snapshot.timestamp, task: taskName, note: snapshot.note, host: snapshot.host }) + "\n", "utf8");
  console.log(`run log appended: ${runPath}`);
}
process.exit(0);
