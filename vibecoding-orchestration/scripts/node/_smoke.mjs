#!/usr/bin/env node
// _smoke.mjs - scripts/node 套件冒烟测试（本地与 CI 三平台复用）
// 用法: node scripts/node/_smoke.mjs
// 行为: 在临时目录构造最小项目 → 依次跑心跳/事件/锁/watchdog/复盘/long-cmd/check-flow/文档整合 →
//       校验退出码与产物文件 → 全部通过 exit 0。
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = fileURLToPath(new URL(".", import.meta.url));
const node = process.execPath;
let passed = 0;

function run(script, args, expect = 0, cwd = undefined) {
  const p = isAbsolute(script) ? script : join(scriptsDir, script);
  const label = `${script} ${args.join(" ")}`;
  try {
    const out = execFileSync(node, [p, ...args], { encoding: "utf8", cwd });
    passed++;
    console.log(`[PASS] ${label}`);
    return out;
  } catch (e) {
    const code = e.status;
    if (code === expect) {
      passed++;
      console.log(`[PASS] ${label} (exit=${code} 符合预期)`);
      return e.stdout ? e.stdout.toString() : "";
    }
    console.error(`[FAIL] ${label} expect=${expect} got=${code}`);
    if (e.stdout) console.error(e.stdout.toString());
    if (e.stderr) console.error(e.stderr.toString());
    process.exit(1);
  }
}

function expectFile(p) {
  if (!existsSync(p)) {
    console.error(`[FAIL] 缺少产物: ${p}`);
    process.exit(1);
  }
  passed++;
  console.log(`[PASS] 产物存在: ${p}`);
}

const root = mkdtempSync(join(tmpdir(), "devflow-smoke-"));
const lockTestRoot = join(root, "lock-test");
mkdirSync(lockTestRoot, { recursive: true });
const dirs = [
  "docs/00-requirements",
  "docs/01-prd",
  "docs/02-hld",
  "docs/03-scope",
  "docs/04-lld",
  "docs/process/tasks",
  "contracts",
];
for (const d of dirs) mkdirSync(join(root, d), { recursive: true });

writeFileSync(join(root, "docs/process/STATE.md"), "# STATE\n\n- 阶段：产品需求\n", "utf8");
writeFileSync(join(root, "docs/00-requirements/requirements-anchor.md"), "# 需求锚定\n", "utf8");
writeFileSync(join(root, "docs/01-prd/PRD.md"), "# PRD\n", "utf8");
writeFileSync(join(root, "docs/02-hld/HLD.md"), "# HLD\n", "utf8");
writeFileSync(join(root, "docs/03-scope/scope.md"), "# 范围\n", "utf8");
writeFileSync(join(root, "docs/04-lld/MOD-LLD.md"), "# LLD\n", "utf8");
writeFileSync(join(root, "contracts/contracts-registry.md"), "# 契约注册表\n\n冻结版本：v1\n", "utf8");
writeFileSync(join(root, "docs/process/traceability.md"), "| REQ-01 | PRD-01 |\n", "utf8");

// git 仓库 + 契约冻结 tag（check-flow 需要）
try {
  execFileSync("git", ["init", "-q"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=smoke", "-c", "user.email=smoke@local", "add", "-A"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=smoke", "-c", "user.email=smoke@local", "commit", "-q", "-m", "smoke"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["tag", "v1-contracts-frozen"], { cwd: root, stdio: "ignore" });
} catch (e) {
  console.error(`[WARN] git 初始化失败（check-flow 的 tag 检查将报问题）: ${e.message}`);
}

console.log(`临时项目: ${root}`);

run("update-heartbeat.mjs", ["--project-path", root, "--task-name", "smoke_r1", "--log-file", "docs/process/logs/runs/run-smoke.jsonl", "--note", "冒烟测试"]);
expectFile(join(root, "docs/process/tasks/.heartbeat"));
expectFile(join(root, "docs/process/logs/runs/run-smoke.jsonl"));

run("record-event.mjs", ["--project-path", root, "--event", "state_update", "--run", "run-smoke", "--task-name", "smoke_r1", "--detail", "smoke"]);
expectFile(join(root, "docs/process/logs/orchestration.jsonl"));

run("acquire-launch-lock.mjs", ["--project-path", root, "--task-name", "smoke_r1", "--active-agent-count", "1", "--timeout-seconds", "5", "--lock-root", lockTestRoot]);
run("release-launch-lock.mjs", ["--project-path", root, "--task-name", "smoke_r1", "--lock-root", lockTestRoot]);

run("watchdog.mjs", ["--project-path", root, "--run", "run-smoke", "--once", "--heartbeat-file", "docs/process/tasks/.heartbeat"]);
expectFile(join(root, "docs/process/logs/runs/run-smoke.facts.jsonl"));

run("analyze-flow.mjs", ["--project-path", root, "--out-file", "docs/process/report-smoke.md"]);
expectFile(join(root, "docs/process/report-smoke.md"));

run("long-cmd.mjs", ["--project-path", root, "--log-file", "docs/process/logs/runs/run-smoke.jsonl", "--command", "node -e \"console.log('LONG_OK')\"", "--interval-sec", "1"]);

run("check-flow.mjs", ["--project-path", root]);

run("consolidate-docs.mjs", ["--project-path", root, "--force"]);
expectFile(join(root, "docs/process/INDEX.md"));
expectFile(join(root, "docs/process/consolidation-plan.md"));

// opencode 适配器心跳：BOM 容错 + CLI 覆盖参数（并行隔离）
const adapterHb = join(scriptsDir, "..", "..", "..", "adapters", "opencode", "scripts", "heartbeat.mjs");
writeFileSync(
  join(root, "docs/process/.devflow-heartbeat.json"),
  "\uFEFF" + JSON.stringify({
    projectPath: ".",
    taskName: "cfg_r1",
    heartbeatFile: "docs/process/tasks/.heartbeat-cfg_r1",
    logFile: "docs/process/logs/runs/run-cfg.jsonl",
  }),
  "utf8"
);
run(adapterHb, ["BOM 配置默认"], 0, root);
expectFile(join(root, "docs/process/tasks/.heartbeat-cfg_r1"));
run(adapterHb, ["--task-name", "cli_r1", "--heartbeat-file", "docs/process/tasks/.heartbeat-cli_r1", "--log-file", "docs/process/logs/runs/run-cli.jsonl", "CLI 隔离"], 0, root);
expectFile(join(root, "docs/process/tasks/.heartbeat-cli_r1"));
const cliHb = readFileSync(join(root, "docs/process/tasks/.heartbeat-cli_r1"), "utf8");
if (!cliHb.includes('"task": "cli_r1"')) {
  console.error("[FAIL] 适配器心跳 CLI 覆盖未生效");
  process.exit(1);
}
if (!cliHb.includes('"note": "CLI 隔离"')) {
  console.error("[FAIL] 适配器心跳 note 被 flag 值污染（应为 CLI 隔离）");
  process.exit(1);
}
passed++;
console.log("[PASS] 适配器心跳 CLI 覆盖写入独立心跳文件且 note 正确");

run(adapterHb, ["--task-name", "cli_r2", "--heartbeat-file", "docs/process/tasks/.heartbeat-cli_r2", "--note", "显式 note flag"], 0, root);
const cliHb2 = readFileSync(join(root, "docs/process/tasks/.heartbeat-cli_r2"), "utf8");
if (!cliHb2.includes('"note": "显式 note flag"')) {
  console.error("[FAIL] 适配器心跳 --note flag 未生效");
  process.exit(1);
}
passed++;
console.log("[PASS] 适配器心跳 --note flag 生效");

rmSync(root, { recursive: true, force: true });
console.log(`\n全部通过：${passed} 项检查`);
process.exit(0);
