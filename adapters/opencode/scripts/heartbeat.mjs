#!/usr/bin/env node
// devflow-heartbeat.mjs — 子 agent 显式心跳（跨平台，Node 即可）
// 用法: node docs/process/.opencode-heartbeat.mjs "<正在做什么>"
// 配置: docs/process/.devflow-heartbeat.json
//   {
//     "projectPath": ".",
//     "taskName": "mod01_r1",
//     "heartbeatFile": "docs/process/tasks/.heartbeat-mod01_r1",
//     "logFile": "docs/process/logs/runs/run-01.jsonl"
//   }
// 行为: 写心跳快照（.heartbeat-*）+ 追加执行账（run-*.jsonl），与 Codex 的
//       update-heartbeat.ps1 保持同一文件语义，check-flow/watchdog 可直接复用。

import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = process.cwd();
const note = process.argv[2] ?? "heartbeat";
const configPath = resolve(root, "docs/process/.devflow-heartbeat.json");

let cfg;
try {
  cfg = JSON.parse(readFileSync(configPath, "utf8"));
} catch {
  console.error(`devflow-heartbeat: missing/invalid ${configPath}`);
  console.error("总控必须先写 .devflow-heartbeat.json 再委派任务。");
  process.exit(2);
}

const project = resolve(root, cfg.projectPath ?? ".");
const task = cfg.taskName ?? "child";
const hbFile = resolve(project, cfg.heartbeatFile ?? "docs/process/tasks/.heartbeat");
const logFile = resolve(project, cfg.logFile ?? "docs/process/logs/runs/run.jsonl");
const ts = new Date().toISOString();
const host = process.env.COMPUTERNAME || process.env.HOSTNAME || "unknown";

const snapshot = { project, task, timestamp: ts, note, host };
mkdirSync(dirname(hbFile), { recursive: true });
writeFileSync(hbFile, JSON.stringify(snapshot, null, 2), "utf8");

mkdirSync(dirname(logFile), { recursive: true });
appendFileSync(logFile, JSON.stringify({ ts, task, note, host }) + "\n", "utf8");

console.log(`heartbeat updated: ${hbFile}`);
