#!/usr/bin/env node
// run-tests-parallel.mjs - 全量 unittest 分片并行（跨平台版，替代 run-tests-parallel.ps1）
// 用法:
//   node run-tests-parallel.mjs --project-path <项目> [--shards 3] [--test-dir tests] [--python python] [--timeout-sec 900] [--retries 1]
// 行为: 扫描 <test-dir>/test_*.py 按轮询分成 N 片，每片一个独立 python -m unittest 进程，
//       输出各自日志到系统临时目录 rtp-<HHmmss>；失败分片串行重跑；任一最终失败 exit 1。
import { spawn, execFileSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { parseArgs } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "shards", type: "number" },
  { name: "testDir", type: "string" },
  { name: "python", type: "string" },
  { name: "timeoutSec", type: "number" },
  { name: "retries", type: "number" },
]);

const projectPath = args.projectPath ?? "";
if (!projectPath || !existsSync(projectPath)) {
  console.error(`项目路径不存在: ${projectPath}`);
  process.exit(2);
}
const shards = Math.max(1, args.shards ?? 3);
const testDirName = args.testDir ?? "tests";
const python = args.python ?? "python";
const timeoutSec = args.timeoutSec ?? 900;
const retries = Math.max(0, args.retries ?? 1);

const testDir = join(projectPath, testDirName);
if (!existsSync(testDir)) {
  console.error(`测试目录不存在: ${testDir}`);
  process.exit(2);
}
let files = [];
try {
  files = readdirSync(testDir, { withFileTypes: true })
    .filter((e) => e.isFile() && /^test_.*\.py$/.test(e.name))
    .map((e) => e.name)
    .sort();
} catch {
  files = [];
}
if (files.length === 0) {
  console.error("未发现测试文件");
  process.exit(2);
}

const groups = Array.from({ length: shards }, () => []);
files.forEach((f, i) => groups[i % shards].push(f));

const now = new Date();
const runId = `rtp-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
const logDir = join(tmpdir(), runId);
mkdirSync(logDir, { recursive: true });

function moduleNames(mods) {
  return mods.map((f) => relative(projectPath, join(testDir, f)).replace(/[\\/]/g, ".").replace(/\.py$/, ""));
}

function readTail(file, n) {
  try {
    const lines = readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
    return lines.slice(-n).join(" | ");
  } catch {
    return "";
  }
}

function killProc(child) {
  try {
    if (process.platform === "win32") execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGKILL");
  } catch {
    // 进程可能已退出
  }
}

function runShard(i, mods, tag) {
  const outLog = join(logDir, `${tag}.out.log`);
  const errLog = join(logDir, `${tag}.err.log`);
  const outStream = createWriteStream(outLog);
  const errStream = createWriteStream(errLog);
  const modNames = moduleNames(mods);
  console.log(`SHARD ${i + 1} (${tag}): ${python} -m unittest ${modNames.join(" ")}`);
  const child = spawn(python, ["-m", "unittest", ...modNames], { cwd: projectPath, stdio: ["ignore", "pipe", "pipe"] });
  child.stdout.pipe(outStream);
  child.stderr.pipe(errStream);
  const deadline = Date.now() + timeoutSec * 1000;

  return new Promise((resolve) => {
    let done = false;
    const timer = setInterval(() => {
      if (done) return;
      if (child.exitCode !== null || child.signalCode !== null) {
        done = true;
        clearInterval(timer);
        outStream.end();
        errStream.end();
        const okc = child.exitCode === 0;
        console.log(`SHARD ${i + 1}: exit=${child.exitCode} ${okc ? "OK" : "FAIL"} ${readTail(outLog, 3)}`);
        resolve({ shard: i + 1, ok: okc, out: outLog });
      } else if (Date.now() > deadline) {
        done = true;
        clearInterval(timer);
        killProc(child);
        outStream.end();
        errStream.end();
        console.error(`SHARD ${i + 1}: 超时（>${timeoutSec}s），已终止`);
        resolve({ shard: i + 1, ok: false, out: outLog });
      }
    }, 500);
  });
}

async function main() {
  const results = [];
  for (let i = 0; i < shards; i++) {
    if (groups[i].length === 0) continue;
    results.push(await runShard(i, groups[i], `shard${i + 1}`));
    await new Promise((r) => setTimeout(r, 800));
  }

  let finalFail = 0;
  for (const r of results) {
    if (r.ok) continue;
    let recovered = false;
    for (let r2 = 1; r2 <= retries; r2++) {
      console.log(`SHARD ${r.shard}: 重跑 ${r2}/${retries} ...`);
      const retry = await runShard(r.shard - 1, groups[r.shard - 1], `shard${r.shard}-retry${r2}`);
      if (retry.ok) {
        recovered = true;
        break;
      }
    }
    if (!recovered) finalFail = 1;
  }

  console.log(`分片汇总: ${results.length} 片, 测试文件 ${files.length} 个, 日志 ${logDir}, 重试上限 ${retries}`);
  process.exit(finalFail);
}

main();
