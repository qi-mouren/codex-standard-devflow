#!/usr/bin/env node
// record-event.mjs - 总控调度事件记录（跨平台版，替代 record-event.ps1）
// 用法: node record-event.mjs --project-path <项目> --event <事件> [--task-name <task_name>] [--run <run-N>] [--detail "<一句话或 JSON>"]
// 退出码: 0=成功 | 5=事件非法或参数缺失
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { hostName, nowIso, parseArgs } from "./_util.mjs";

const VALID_EVENTS = [
  "taskbook_write", "lock_acquire", "lock_release", "spawn_start", "spawn_success",
  "spawn_fail", "interrupt", "gate", "state_update", "user_decision",
  "agent_stale_warning", "agent_stale_critical", "agent_budget_exceeded", "external_change",
];

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "event", type: "string" },
  { name: "taskName", type: "string" },
  { name: "run", type: "string" },
  { name: "detail", type: "string" },
]);

const projectPath = args.projectPath ?? "";
const event = args.event ?? "";
if (!projectPath || !event) {
  console.error("missing --project-path / --event");
  process.exit(5);
}
if (!VALID_EVENTS.includes(event)) {
  console.error(`invalid event: '${event}' (allowed: ${VALID_EVENTS.join(", ")})`);
  process.exit(5);
}

const logsDir = join(projectPath, "docs", "process", "logs");
mkdirSync(logsDir, { recursive: true });
const logFile = join(logsDir, "orchestration.jsonl");
const payload = {
  ts: nowIso(),
  event,
  task: args.taskName ?? "",
  run: args.run ?? "",
  detail: args.detail ?? "",
  host: hostName(),
};
appendFileSync(logFile, JSON.stringify(payload) + "\n", "utf8");
console.log(`event recorded: ${logFile} (${event} ${payload.run} ${payload.task})`);
process.exit(0);
