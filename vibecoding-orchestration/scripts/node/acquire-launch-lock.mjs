#!/usr/bin/env node
// acquire-launch-lock.mjs - 全局启动锁（跨平台版，替代 acquire-launch-lock.ps1）
// 用法:
//   node acquire-launch-lock.mjs --project-path <项目> --task-name <task_name> --active-agent-count <N> [--max-concurrent-threads <M>] [--timeout-seconds 30] [--lock-ttl-minutes 10] [--lock-root <目录>]
// 退出码: 0=抢锁成功 | 2=锁被占用超时 | 3=槽位不足（不持锁） | 4=参数/task_name 非法
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hostName, nowIso, parseArgs, pickLockRoot, taskNameOk } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "taskName", type: "string" },
  { name: "activeAgentCount", type: "number" },
  { name: "maxConcurrentThreads", type: "number" },
  { name: "timeoutSeconds", type: "number" },
  { name: "lockTtlMinutes", type: "number" },
  { name: "lockRoot", type: "string" },
]);

const projectPath = args.projectPath ?? "";
const taskName = args.taskName ?? "";
const active = args.activeAgentCount;
if (!projectPath || !taskName || Number.isNaN(active)) {
  console.error("missing --project-path / --task-name / --active-agent-count");
  process.exit(4);
}
if (!taskNameOk(taskName)) {
  console.error(`invalid task_name: '${taskName}' (only lowercase letters, digits, underscores allowed)`);
  process.exit(4);
}

const maxThreads = args.maxConcurrentThreads ?? 7;
const timeoutSec = args.timeoutSeconds ?? 30;
const ttlMin = args.lockTtlMinutes ?? 10;
const lockRoot = args.lockRoot ?? pickLockRoot();
if (args.lockRoot) {
  try {
    mkdirSync(lockRoot, { recursive: true });
  } catch {
    console.error(`lock root 不可写: ${lockRoot}`);
    process.exit(4);
  }
}
const lockFile = join(lockRoot, "launch.lock");
const deadline = Date.now() + timeoutSec * 1000;

const lock = {
  project: projectPath,
  task: taskName,
  pid: process.pid,
  timestamp: nowIso(),
  host: hostName(),
};

function isStale(content) {
  if (!content || !content.trim()) return true;
  try {
    const j = JSON.parse(content);
    const ageMin = (Date.now() - Date.parse(j.timestamp)) / 60000;
    return ageMin > ttlMin;
  } catch {
    return true;
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

while (true) {
  try {
    writeFileSync(lockFile, JSON.stringify(lock, null, 2), { flag: "wx" });
    if (active >= maxThreads) {
      rmSync(lockFile, { force: true });
      console.error(`slot insufficient: active=${active} max=${maxThreads} (含主控)`);
      process.exit(3);
    }
    console.log(`acquired: ${lockFile} (active=${active} max=${maxThreads})`);
    process.exit(0);
  } catch {
    let existing = null;
    try {
      existing = readFileSync(lockFile, "utf8");
    } catch {
      // 文件可能刚被释放
    }
    if (isStale(existing)) {
      rmSync(lockFile, { force: true });
      continue;
    }
    if (Date.now() > deadline) {
      console.error(`lock timeout: ${lockFile}`);
      if (existing) console.error(`current owner: ${existing.trim()}`);
      process.exit(2);
    }
    await sleep(2000);
  }
}
