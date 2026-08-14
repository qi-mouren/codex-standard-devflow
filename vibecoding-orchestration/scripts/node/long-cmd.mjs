#!/usr/bin/env node
// long-cmd.mjs - 长命令包装器（跨平台版，替代 long-cmd.ps1）
// 用法:
//   node long-cmd.mjs --project-path <项目> --log-file <docs/agent/logs/runs/run-N.jsonl> --command "<命令>" [--timeout-sec <秒>] [--interval-sec 60] [--task-name child]
// 行为: 启动前写 LONG 心跳；运行中每 interval-sec 续发带耗时的 LONG 心跳；命令输出结束后透传；
//       超时则终止子进程树并以 exit 3 结束；正常完成透传命令退出码。
// 说明: Windows 用 powershell.exe（保持与 PS 版一致的执行语义），macOS/Linux 用 /bin/sh -c；
//       工作目录固定为项目根，避免相对路径命令跑错目录。
import { execFileSync, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "logFile", type: "string" },
  { name: "command", type: "string" },
  { name: "timeoutSec", type: "number" },
  { name: "intervalSec", type: "number" },
  { name: "taskName", type: "string" },
]);

const projectPath = args.projectPath ?? "";
const logFile = args.logFile ?? "";
const command = args.command ?? "";
if (!projectPath || !logFile || !command) {
  console.error("missing --project-path / --log-file / --command");
  process.exit(4);
}
const timeoutSec = args.timeoutSec ?? 0;
const intervalSec = Math.max(1, args.intervalSec ?? 60);
const taskName = args.taskName ?? "child";

const hbScript = fileURLToPath(new URL("./update-heartbeat.mjs", import.meta.url));
const started = Date.now();
const summary = command.length > 60 ? command.slice(0, 60) + "..." : command;

function heartbeat(note) {
  try {
    execFileSync(process.execPath, [hbScript, "--project-path", projectPath, "--task-name", taskName, "--log-file", logFile, "--note", note], { stdio: "ignore" });
  } catch {
    // 心跳失败不阻塞命令本身
  }
}

heartbeat(`LONG: 开始 ${summary}`);

const isWin = process.platform === "win32";
const child = isWin
  ? spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", command], { cwd: projectPath })
  : spawn("/bin/sh", ["-c", command], { cwd: projectPath, detached: true });

let output = "";
child.stdout?.on("data", (d) => {
  output += d.toString();
});
child.stderr?.on("data", (d) => {
  output += d.toString();
});

function killChild() {
  if (isWin) {
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // 进程可能已退出
    }
  } else {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {
        // 进程可能已退出
      }
    }
  }
}

async function main() {
  let timedOut = false;
  while (child.exitCode === null && child.signalCode === null) {
    const elapsed = Math.floor((Date.now() - started) / 1000);
    if (timeoutSec > 0 && elapsed > timeoutSec) {
      timedOut = true;
      break;
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
    if (child.exitCode !== null || child.signalCode !== null) break;
    heartbeat(`LONG: 进行中 ${Math.floor((Date.now() - started) / 1000)}s (${summary})`);
  }

  if (timedOut) {
    killChild();
    heartbeat(`LONG: 超时 ${timeoutSec}s，已停止 (${summary})`);
    console.error(`LONG-CMD TIMEOUT after ${timeoutSec} s`);
    process.exit(3);
  }
  if (output) process.stdout.write(output);
  heartbeat(`LONG: 完成 ${Math.floor((Date.now() - started) / 1000)}s (${summary})`);
  process.exit(child.exitCode ?? 1);
}

main();
