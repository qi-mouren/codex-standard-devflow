#!/usr/bin/env node
// watchdog.mjs - 子 agent 运行监控（跨平台版，替代 watchdog.ps1）
// 用法:
//   取证(单次): node watchdog.mjs --project-path <项目> --run run-N --once [--temp-prefix <前缀>] [--process-match <串>] [--heartbeat-file <路径>]
//   后台监控:   node watchdog.mjs --project-path <项目> --run run-N [--budget-min <M>] [--interval-sec 60] [--temp-prefix <前缀>] [--process-match <串>] [--heartbeat-file <路径>] [--max-minutes <分钟>]
// 行为: 每个 tick 追加一行事实到 run-N.facts.jsonl；阈值 3/8/15 分钟与 check-flow 一致；
//       超阈值/超预算自动写 orchestration 事件；critical/budget 时落证据快照；
//       首心跳基线=本轮启动时间；检测到本 Run 的 interrupt 事件后自动退出。
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hostName, nowIso, parseArgs, stripBom, walkFiles } from "./_util.mjs";

const WARN_MIN = 3;
const KILL_MIN = 8;
const LONG_MIN = 15;

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "run", type: "string" },
  { name: "budgetMin", type: "number" },
  { name: "intervalSec", type: "number" },
  { name: "tempPrefix", type: "string" },
  { name: "processMatch", type: "string" },
  { name: "heartbeatFile", type: "string" },
  { name: "maxMinutes", type: "number" },
  { name: "once", type: "boolean" },
]);

const projectPath = args.projectPath ?? "";
const run = args.run ?? "";
if (!projectPath || !run) {
  console.error("missing --project-path / --run");
  process.exit(4);
}
const budgetMin = args.budgetMin ?? 60;
const intervalSec = args.intervalSec ?? 60;
const tempPrefix = args.tempPrefix ?? "";
const processMatch = args.processMatch ?? "";
const heartbeatFile = args.heartbeatFile ?? "";
const maxMinutes = args.maxMinutes > 0 ? args.maxMinutes : budgetMin + 20;
const once = !!args.once;

const started = Date.now();
// 布局探测：V3（docs/agent）优先；旧布局（docs/process）兼容
const agentDir = existsSync(join(projectPath, "docs", "agent")) ? join(projectPath, "docs", "agent") : join(projectPath, "docs", "process");
const runsDir = join(agentDir, "logs", "runs");
const hbFile = heartbeatFile
  ? isAbsolute(heartbeatFile)
    ? heartbeatFile
    : join(projectPath, heartbeatFile)
  : join(agentDir, "tasks", ".heartbeat");
const factsFile = join(runsDir, `${run}.facts.jsonl`);
mkdirSync(runsDir, { recursive: true });

let hbStartMtime = null;
if (existsSync(hbFile)) hbStartMtime = statSync(hbFile).mtimeMs;
let tick = 0;
const state = { warn: "off", critical: "off", budget: "off" };

function getHbFact() {
  let age = -1;
  let isLong = false;
  let note = "";
  let fresh = false;
  if (existsSync(hbFile)) {
    try {
      const hb = JSON.parse(stripBom(readFileSync(hbFile, "utf8")));
      age = (Date.now() - Date.parse(hb.timestamp)) / 60000;
      note = String(hb.note ?? "");
      isLong = note.toLowerCase().startsWith("long:");
      const mtime = statSync(hbFile).mtimeMs;
      fresh = hbStartMtime == null || mtime > hbStartMtime;
    } catch {
      note = "<unparseable>";
    }
  }
  return { age_min: Math.round(age * 10) / 10, long: isLong, note, fresh };
}

function getRepoChanges() {
  if (!existsSync(projectPath)) return [];
  const cutoff = Date.now() - Math.max(1, (intervalSec / 60) * 2) * 60000;
  return walkFiles(projectPath, { skipSegments: [".git"] })
    .filter((f) => !f.replace(/\\/g, "/").includes("/docs/process/logs/") && !f.replace(/\\/g, "/").includes("/docs/agent/logs/") && statSync(f).mtimeMs > cutoff)
    .slice(0, 50)
    .map((f) => f.slice(projectPath.length).replace(/^[\\/]/, ""));
}

function getTempActivity() {
  if (!tempPrefix) return { count: 0, latest: null };
  let dirs = [];
  try {
    dirs = readdirSync(tmpdir(), { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith(tempPrefix))
      .map((e) => join(tmpdir(), e.name));
  } catch {
    // 临时目录不可读时按无活动处理
  }
  const recent = dirs
    .map((d) => ({ d, m: statSync(d).mtimeMs }))
    .filter((x) => x.m > Date.now() - 120000)
    .sort((a, b) => b.m - a.m);
  return { count: dirs.length, latest: recent.length ? new Date(recent[0].m).toISOString() : null };
}

function getProcs() {
  if (!processMatch) return [];
  try {
    if (process.platform === "win32") {
      const out = execFileSync(
        "powershell.exe",
        ["-NoProfile", "-Command", `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${processMatch}*' } | Select-Object -ExpandProperty ProcessId`],
        { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
      );
      return out
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n));
    }
    const out = execFileSync("ps", ["-axo", "pid=,command="], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out
      .split("\n")
      .filter((l) => l.includes(processMatch))
      .map((l) => Number(l.trim().split(/\s+/)[0]))
      .filter((n) => !Number.isNaN(n));
  } catch {
    return [];
  }
}

function writeFact(f) {
  appendFileSync(factsFile, JSON.stringify(f) + "\n", "utf8");
}

function hhmmss(d) {
  return `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}${String(d.getSeconds()).padStart(2, "0")}`;
}

function writeEvidence(f) {
  const ev = {
    ts: nowIso(),
    run,
    heartbeat: f.heartbeat,
    repo_changes: f.repo_changes,
    temp_count: f.temp.count,
    temp_latest: f.temp.latest,
    processes: f.processes,
  };
  const evFile = join(runsDir, `${run}.evidence-${hhmmss(new Date())}.json`);
  writeFileSync(evFile, JSON.stringify(ev, null, 2), "utf8");
  console.error(`evidence saved: ${evFile}`);
}

function recordEvent(event, detail) {
  try {
    const script = fileURLToPath(new URL("./record-event.mjs", import.meta.url));
    execFileSync(process.execPath, [script, "--project-path", projectPath, "--event", event, "--run", run, "--detail", detail], { stdio: "ignore" });
  } catch {
    // 调度账不可写时不阻塞监控
  }
}

function testInterrupted() {
  const orch = join(agentDir, "logs", "orchestration.jsonl");
  if (!existsSync(orch)) return false;
  const lines = stripBom(readFileSync(orch, "utf8")).split(/\r?\n/).filter(Boolean).slice(-60);
  const esc = run.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return lines.some((l) => /"event"\s*:\s*"interrupt"/.test(l) && new RegExp(`"run"\\s*:\\s*"${esc}"`).test(l));
}

function checkStates(f) {
  const elapsed = (Date.now() - started) / 60000;
  const age = f.heartbeat.fresh ? f.heartbeat.age_min : elapsed;
  const isLong = f.heartbeat.fresh && f.heartbeat.long;
  const limit = isLong ? LONG_MIN : KILL_MIN;
  const warn = isLong ? LONG_MIN : WARN_MIN;
  const hasFacts = f.repo_changes.length > 0 || f.temp.latest != null || f.processes.length > 0;

  if (elapsed > budgetMin && state.budget !== "exceeded") {
    state.budget = "exceeded";
    recordEvent("agent_budget_exceeded", `预算超时：已运行 ${elapsed.toFixed(1)} 分钟（上限 ${budgetMin}），最后心跳 ${age.toFixed(1)} 分钟前`);
    writeEvidence(f);
  }
  if (age > warn && state.warn !== "on") {
    state.warn = "on";
    recordEvent("agent_stale_warning", `心跳 ${age.toFixed(1)} 分钟未更新（LONG=${isLong}，fresh=${f.heartbeat.fresh}），阈值预警`);
  } else if (age <= warn) {
    state.warn = "off";
  }
  if (age > limit && !hasFacts && state.critical !== "on") {
    state.critical = "on";
    recordEvent("agent_stale_critical", `心跳 ${age.toFixed(1)} 分钟未更新且无产出（LONG=${isLong}，fresh=${f.heartbeat.fresh}），判定卡死候选`);
    writeEvidence(f);
  } else if (age <= limit || hasFacts) {
    state.critical = "off";
  }
}

async function main() {
  while (true) {
    tick++;
    const fact = {
      ts: nowIso(),
      tick,
      run,
      heartbeat: getHbFact(),
      repo_changes: getRepoChanges(),
      temp: getTempActivity(),
      processes: getProcs(),
      host: hostName(),
    };
    writeFact(fact);
    checkStates(fact);
    if (once) break;
    if (testInterrupted()) {
      console.log("watchdog 检测到本轮 interrupt，退出");
      break;
    }
    if ((Date.now() - started) / 60000 > maxMinutes) {
      console.log(`watchdog 到期（${maxMinutes} 分钟），退出`);
      break;
    }
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
  process.exit(0);
}

main();
