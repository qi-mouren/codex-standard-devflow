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
  "docs/user/00-requirements",
  "docs/user/01-prd",
  "docs/user/02-hld",
  "docs/user/03-scope",
  "docs/user/04-lld",
  "docs/agent/tasks",
  "contracts",
];
for (const d of dirs) mkdirSync(join(root, d), { recursive: true });

writeFileSync(join(root, "docs/agent/STATE.md"), "# STATE\n\n- 阶段：产品需求\n", "utf8");
writeFileSync(join(root, "docs/agent/issues.md"), "# 问题账\n\n| ID | 状态 |\n|---|---|\n| ISS-001 | fixed |\n", "utf8");
writeFileSync(join(root, "docs/user/00-requirements/requirements-anchor.md"), "# 需求锚定\n", "utf8");
writeFileSync(join(root, "docs/user/01-prd/PRD.md"), "# PRD\n", "utf8");
writeFileSync(join(root, "docs/user/02-hld/HLD.md"), "# HLD\n", "utf8");
writeFileSync(join(root, "docs/user/03-scope/scope.md"), "# 范围\n", "utf8");
writeFileSync(join(root, "docs/user/04-lld/MOD-LLD.md"), "# LLD\n", "utf8");
writeFileSync(join(root, "contracts/contracts-registry.md"), "# 契约注册表\n\n冻结版本：v1\n", "utf8");
writeFileSync(join(root, "docs/agent/traceability.md"), "| REQ-01 | PRD-01 |\n", "utf8");

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

run("update-heartbeat.mjs", ["--project-path", root, "--task-name", "smoke_r1", "--log-file", "docs/agent/logs/runs/run-smoke.jsonl", "--note", "冒烟测试"]);
expectFile(join(root, "docs/agent/tasks/.heartbeat"));
expectFile(join(root, "docs/agent/logs/runs/run-smoke.jsonl"));

run("record-event.mjs", ["--project-path", root, "--event", "state_update", "--run", "run-smoke", "--task-name", "smoke_r1", "--detail", "smoke"]);
expectFile(join(root, "docs/agent/logs/orchestration.jsonl"));

run("acquire-launch-lock.mjs", ["--project-path", root, "--task-name", "smoke_r1", "--active-agent-count", "1", "--timeout-seconds", "5", "--lock-root", lockTestRoot]);
run("release-launch-lock.mjs", ["--project-path", root, "--task-name", "smoke_r1", "--lock-root", lockTestRoot]);

run("watchdog.mjs", ["--project-path", root, "--run", "run-smoke", "--once", "--heartbeat-file", "docs/agent/tasks/.heartbeat"]);
expectFile(join(root, "docs/agent/logs/runs/run-smoke.facts.jsonl"));

run("analyze-flow.mjs", ["--project-path", root, "--out-file", "docs/agent/report-smoke.md"]);
expectFile(join(root, "docs/agent/report-smoke.md"));

run("long-cmd.mjs", ["--project-path", root, "--log-file", "docs/agent/logs/runs/run-smoke.jsonl", "--command", "node -e \"console.log('LONG_OK')\"", "--interval-sec", "1"]);

run("check-flow.mjs", ["--project-path", root]);

// 旧布局兼容：构造旧布局项目，check-flow 应通过（不报布局问题）
const legacyRoot = join(root, "legacy-layout");
mkdirSync(join(legacyRoot, "docs/00-requirements"), { recursive: true });
mkdirSync(join(legacyRoot, "docs/01-prd"), { recursive: true });
mkdirSync(join(legacyRoot, "docs/02-hld"), { recursive: true });
mkdirSync(join(legacyRoot, "docs/03-scope"), { recursive: true });
mkdirSync(join(legacyRoot, "docs/04-lld"), { recursive: true });
mkdirSync(join(legacyRoot, "docs/process/tasks"), { recursive: true });
mkdirSync(join(legacyRoot, "contracts"), { recursive: true });
writeFileSync(join(legacyRoot, "docs/process/STATE.md"), "# STATE\n\n- 阶段：产品需求\n", "utf8");
writeFileSync(join(legacyRoot, "docs/process/issues.md"), "# 问题账\n\n| ID | 状态 |\n|---|---|\n", "utf8");
writeFileSync(join(legacyRoot, "docs/00-requirements/requirements-anchor.md"), "# 需求锚定\n", "utf8");
writeFileSync(join(legacyRoot, "docs/01-prd/PRD.md"), "# PRD\n", "utf8");
writeFileSync(join(legacyRoot, "docs/02-hld/HLD.md"), "# HLD\n", "utf8");
writeFileSync(join(legacyRoot, "docs/03-scope/scope.md"), "# 范围\n", "utf8");
writeFileSync(join(legacyRoot, "docs/04-lld/MOD-LLD.md"), "# LLD\n", "utf8");
writeFileSync(join(legacyRoot, "contracts/contracts-registry.md"), "# 契约注册表\n\n冻结版本：v1\n", "utf8");
writeFileSync(join(legacyRoot, "docs/process/traceability.md"), "| REQ-01 | PRD-01 |\n", "utf8");
try {
  execFileSync("git", ["init", "-q"], { cwd: legacyRoot, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=smoke", "-c", "user.email=smoke@local", "add", "-A"], { cwd: legacyRoot, stdio: "ignore" });
  execFileSync("git", ["-c", "user.name=smoke", "-c", "user.email=smoke@local", "commit", "-q", "-m", "smoke-legacy"], { cwd: legacyRoot, stdio: "ignore" });
  execFileSync("git", ["tag", "v1-contracts-frozen"], { cwd: legacyRoot, stdio: "ignore" });
} catch (e) {
  console.error(`[WARN] legacy git 初始化失败: ${e.message}`);
}
run("check-flow.mjs", ["--project-path", legacyRoot]);

run("consolidate-docs.mjs", ["--project-path", root, "--force"]);
expectFile(join(root, "docs/agent/INDEX.md"));
expectFile(join(root, "docs/agent/consolidation-plan.md"));

// opencode 适配器心跳：BOM 容错 + CLI 覆盖参数（并行隔离）
const adapterHb = join(scriptsDir, "..", "..", "..", "adapters", "opencode", "scripts", "heartbeat.mjs");
writeFileSync(
  join(root, "docs/agent/.devflow-heartbeat.json"),
  "\uFEFF" + JSON.stringify({
    projectPath: ".",
    taskName: "cfg_r1",
    heartbeatFile: "docs/agent/tasks/.heartbeat-cfg_r1",
    logFile: "docs/agent/logs/runs/run-cfg.jsonl",
  }),
  "utf8"
);
run(adapterHb, ["BOM 配置默认"], 0, root);
expectFile(join(root, "docs/agent/tasks/.heartbeat-cfg_r1"));
run(adapterHb, ["--task-name", "cli_r1", "--heartbeat-file", "docs/agent/tasks/.heartbeat-cli_r1", "--log-file", "docs/agent/logs/runs/run-cli.jsonl", "CLI 隔离"], 0, root);
expectFile(join(root, "docs/agent/tasks/.heartbeat-cli_r1"));
const cliHb = readFileSync(join(root, "docs/agent/tasks/.heartbeat-cli_r1"), "utf8");
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

run(adapterHb, ["--task-name", "cli_r2", "--heartbeat-file", "docs/agent/tasks/.heartbeat-cli_r2", "--note", "显式 note flag"], 0, root);
const cliHb2 = readFileSync(join(root, "docs/agent/tasks/.heartbeat-cli_r2"), "utf8");
if (!cliHb2.includes('"note": "显式 note flag"')) {
  console.error("[FAIL] 适配器心跳 --note flag 未生效");
  process.exit(1);
}
passed++;
console.log("[PASS] 适配器心跳 --note flag 生效");

// classify-change：小改动 → Quick；碰契约 → Standard；新锚点 → Enterprise
const qOut = run("classify-change.mjs", ["--project-path", root, "--files", "src/user/api.py"]);
if (!qOut.includes("建议模式: Quick")) {
  console.error("[FAIL] classify-change 未判 Quick");
  process.exit(1);
}
passed++;
console.log("[PASS] classify-change 小改动判 Quick");

const sOut = run("classify-change.mjs", ["--project-path", root, "--files", "src/order/api.py contracts/contracts-registry.md"]);
if (!sOut.includes("建议模式: Standard")) {
  console.error("[FAIL] classify-change 未判 Standard");
  process.exit(1);
}
passed++;
console.log("[PASS] classify-change 碰契约判 Standard");

const eOut = run("classify-change.mjs", ["--project-path", root, "--files", "docs/00-requirements/requirements-anchor-epic99.md"]);
if (!eOut.includes("建议模式: Enterprise")) {
  console.error("[FAIL] classify-change 未判 Enterprise（旧布局路径）");
  process.exit(1);
}
passed++;
console.log("[PASS] classify-change 新锚点判 Enterprise（旧布局路径兼容）");

const eOutV3 = run("classify-change.mjs", ["--project-path", root, "--files", "docs/user/00-requirements/requirements-anchor-epic99.md"]);
if (!eOutV3.includes("建议模式: Enterprise")) {
  console.error("[FAIL] classify-change 未判 Enterprise（V3 路径）");
  process.exit(1);
}
passed++;
console.log("[PASS] classify-change 新锚点判 Enterprise（V3 路径）");

// generate-taskbooks：scope → design/build 任务书骨架
mkdirSync(join(root, "docs/user/03-scope"), { recursive: true });
writeFileSync(
  join(root, "docs/user/03-scope/scope.md"),
  "# 模块拆解清单\n\n| 模块 ID | 名称 | 职责 |\n|---|---|---|\n| MOD-01 | 用户模块 | ... |\n| MOD-02 | 订单模块 | ... |\n",
  "utf8"
);
run("generate-taskbooks.mjs", ["--project-path", root, "--phase", "design"]);
expectFile(join(root, "docs/agent/tasks/mod01_design.md"));
expectFile(join(root, "docs/agent/tasks/mod02_design.md"));
run("generate-taskbooks.mjs", ["--project-path", root, "--phase", "build"]);
expectFile(join(root, "docs/agent/tasks/mod01_build.md"));

rmSync(root, { recursive: true, force: true });
console.log(`\n全部通过：${passed} 项检查`);
process.exit(0);
