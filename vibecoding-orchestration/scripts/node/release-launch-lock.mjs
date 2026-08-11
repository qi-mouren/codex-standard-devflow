#!/usr/bin/env node
// release-launch-lock.mjs - 释放全局启动锁（跨平台版，替代 release-launch-lock.ps1）
// 用法: node release-launch-lock.mjs --project-path <项目> --task-name <task_name> [--lock-root <目录>]
// 退出码: 0=已释放/无需释放 | 1=锁由其他项目+任务持有（不释放） | 4=参数/task_name 非法
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, pickLockRoot, taskNameOk } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "taskName", type: "string" },
  { name: "lockRoot", type: "string" },
]);

const projectPath = args.projectPath ?? "";
const taskName = args.taskName ?? "";
if (!projectPath || !taskName) {
  console.error("missing --project-path / --task-name");
  process.exit(4);
}
if (!taskNameOk(taskName)) {
  console.error(`invalid task_name: '${taskName}' (only lowercase letters, digits, underscores allowed)`);
  process.exit(4);
}

const lockRoot = args.lockRoot ?? pickLockRoot();
const lockFile = join(lockRoot, "launch.lock");
if (!existsSync(lockFile)) {
  console.log("no lock to release");
  process.exit(0);
}

let existing = "";
try {
  existing = readFileSync(lockFile, "utf8");
} catch {
  // 竞争读取失败按无内容处理
}
try {
  const j = JSON.parse(existing);
  if (j.project === projectPath && j.task === taskName) {
    rmSync(lockFile, { force: true });
    console.log(`released: ${lockFile}`);
    process.exit(0);
  }
  console.error(`lock owned by project=${j.project} task=${j.task}, not releasing`);
  process.exit(1);
} catch {
  rmSync(lockFile, { force: true });
  console.log(`cleaned corrupt lock: ${lockFile}`);
  process.exit(0);
}
