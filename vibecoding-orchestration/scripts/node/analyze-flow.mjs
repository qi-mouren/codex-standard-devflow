#!/usr/bin/env node
// analyze-flow.mjs - 运行复盘（跨平台版，替代 analyze-flow.ps1）
// 用法: node analyze-flow.mjs --project-path <项目路径> [--out-file <报告路径>] [--all-heartbeats]
// 输入: docs/process/logs/orchestration.jsonl（调度账）+ docs/process/logs/runs/*.jsonl（执行账）
// 输出: 概览统计、调度时间线、每轮明细、异常清单
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { parseArgs } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "outFile", type: "string" },
  { name: "allHeartbeats", type: "boolean" },
]);

const projectPath = args.projectPath ?? "";
const outFile = args.outFile ?? "";
const allHeartbeats = !!args.allHeartbeats;
if (!projectPath) {
  console.error("missing --project-path");
  process.exit(4);
}

const logsDir = join(projectPath, "docs", "process", "logs");
const orchFile = join(logsDir, "orchestration.jsonl");
const runsDir = join(logsDir, "runs");
const outPath = outFile ? (isAbsolute(outFile) ? outFile : join(projectPath, outFile)) : "";

const linesOut = [];
function writeLine(s) {
  console.log(s);
  if (outPath) linesOut.push(s);
}

function parseLines(file) {
  const out = [];
  if (!existsSync(file)) return out;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      console.log(`skip bad line: ${line}`);
    }
  }
  return out;
}

function hhmmss(d) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

if (!existsSync(logsDir)) {
  console.log(`no logs directory: ${logsDir}`);
  process.exit(0);
}

const events = parseLines(orchFile);
const runs = {};
if (existsSync(runsDir)) {
  const files = readdirSync(runsDir).filter((f) => f.endsWith(".jsonl") && !f.endsWith(".facts.jsonl")).sort();
  for (const f of files) {
    const hbs = parseLines(join(runsDir, f));
    runs[f.replace(/\.jsonl$/, "")] = hbs;
  }
}

writeLine("==== vibecoding-orchestration 运行复盘 ====");
writeLine(`生成时间: ${new Date().toLocaleString("zh-CN", { hour12: false })}`);
writeLine(`日志目录: ${logsDir}`);
writeLine("");

// 3. 概览
const byEvent = (e) => events.filter((x) => x.event === e);
const spawnStart = byEvent("spawn_start");
const spawnOk = byEvent("spawn_success");
const spawnFail = byEvent("spawn_fail");
const interrupts = byEvent("interrupt");
writeLine("[概览]");
writeLine(`  调度事件总数: ${events.length}`);
writeLine(`    spawn_start: ${spawnStart.length}`);
writeLine(`    spawn_success: ${spawnOk.length}`);
writeLine(`    spawn_fail: ${spawnFail.length}`);
writeLine(`    interrupt: ${interrupts.length}`);
writeLine(`  执行账轮次: ${Object.keys(runs).length}`);
for (const runName of Object.keys(runs).sort()) {
  const hbs = runs[runName];
  let info = `    ${runName}: 心跳 ${hbs.length} 条`;
  if (hbs.length) info += `, 首条 ${hhmmss(new Date(hbs[0].ts))}, 末条 ${hhmmss(new Date(hbs[hbs.length - 1].ts))}`;
  writeLine(info);
}
writeLine("");

// 4. 调度时间线
writeLine("[调度时间线]");
if (events.length === 0) {
  writeLine("  （无调度事件）");
} else {
  for (const ev of [...events].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))) {
    let line = `  ${hhmmss(new Date(ev.ts))}  ${String(ev.event).padEnd(16)}`;
    if (ev.run) line += ` ${ev.run}`;
    if (ev.task) line += ` task=${ev.task}`;
    if (ev.detail) line += `  ${ev.detail}`;
    writeLine(line);
  }
}
writeLine("");

// 5. 每轮明细
writeLine("[每轮明细]");
if (Object.keys(runs).length === 0) writeLine("  （无执行账记录）");
for (const runName of Object.keys(runs).sort()) {
  const hbs = runs[runName];
  writeLine(`  == ${runName} ==`);
  const spawnEv = events.find((e) => e.run === runName && (e.event === "spawn_start" || e.event === "spawn_success"));
  const intEv = events.find((e) => e.run === runName && e.event === "interrupt");
  const start = spawnEv ? new Date(spawnEv.ts) : null;
  const end = intEv ? new Date(intEv.ts) : null;
  if (start) writeLine(`    spawn: ${hhmmss(start)}`);
  else writeLine("    spawn: （无匹配调度记录）");
  if (end) {
    const dur = start ? Math.round(((end - start) / 60000) * 10) / 10 : 0;
    writeLine(`    interrupt: ${hhmmss(end)} (耗时 ${dur} 分钟)`);
  } else {
    writeLine("    interrupt: （无，槽位未回收）");
  }
  if (hbs.length > 0) {
    let maxGap = 0;
    for (let i = 1; i < hbs.length; i++) {
      const gap = (Date.parse(hbs[i].ts) - Date.parse(hbs[i - 1].ts)) / 1000;
      if (gap > maxGap) maxGap = gap;
    }
    writeLine(`    心跳: ${hbs.length} 条, 最大间隔 ${Math.round(maxGap)} 秒`);
    let shown = [...new Set(hbs.map((h) => h.note).filter(Boolean))];
    if (shown.length > 12 && !allHeartbeats) {
      shown = [...shown.slice(0, 6), "...", ...shown.slice(-4)];
    }
    writeLine(`    note: ${shown.join(" -> ")}`);
  } else {
    writeLine("    心跳: 0 条");
  }
  writeLine("");
}

// 6. 异常清单
writeLine("[异常清单]");
const anomalies = [];
for (const runName of Object.keys(runs).sort()) {
  const hbs = runs[runName];
  const hasSpawn = events.some((e) => e.run === runName && (e.event === "spawn_start" || e.event === "spawn_success"));
  if (hbs.length === 0 && hasSpawn) anomalies.push(`${runName}: spawn 后无心跳（疑似任务未送达/卡死）`);
  if (!hasSpawn) anomalies.push(`${runName}: 有心跳但无 spawn 调度记录（孤儿 run）`);
}
for (const ev of events) {
  if ((ev.event === "spawn_start" || ev.event === "spawn_success") && ev.run) {
    if (!events.some((e) => e.run === ev.run && e.event === "interrupt")) anomalies.push(`${ev.run}: spawn 后无 interrupt（槽位可能未回收）`);
    if (!runs[ev.run]) anomalies.push(`${ev.run}: spawn 后无执行账（无心跳记录，疑似未送达/卡死）`);
  }
}
for (const runName of Object.keys(runs).sort()) {
  const hbs = runs[runName];
  for (let i = 1; i < hbs.length; i++) {
    const gap = (Date.parse(hbs[i].ts) - Date.parse(hbs[i - 1].ts)) / 1000;
    const prevLong = String(hbs[i - 1].note ?? "").toLowerCase().startsWith("long:");
    if (gap > 120 && !prevLong) {
      anomalies.push(`${runName}: 心跳间隔过大 ${Math.round(gap)} 秒 (${hhmmss(new Date(hbs[i - 1].ts))} -> ${hhmmss(new Date(hbs[i].ts))})`);
    }
  }
}
if (anomalies.length === 0) {
  writeLine("  （无异常）");
} else {
  for (const a of [...new Set(anomalies)].sort()) writeLine(`  [!!] ${a}`);
}
writeLine("");
writeLine("复盘完成。");
if (outPath) {
  writeFileSync(outPath, linesOut.join("\n") + "\n", "utf8");
  console.log(`report written: ${outPath}`);
}
process.exit(0);
