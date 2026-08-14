#!/usr/bin/env node
// generate-taskbooks.mjs — 从模块拆解清单生成任务书骨架（design / build）
// 用法:
//   node generate-taskbooks.mjs --project-path <项目> [--scope docs/user/03-scope/scope.md] [--phase design|build] [--run run-<N>] [--overwrite] [--mirror-current]
// 说明: 生成骨架后必须由总控预审（任务/输入/输出/完成标准/预算/接口速查齐全）才能 spawn；
//       只生成 docs/agent/tasks/<task_name>.md，不写任何业务产物。
// 退出码: 0=成功 | 2=参数错误/scope 缺失或无模块
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "scope", type: "string" },
  { name: "phase", type: "string" },
  { name: "run", type: "string" },
  { name: "overwrite", type: "boolean" },
  { name: "mirrorCurrent", type: "boolean" },
]);

const project = args.projectPath ?? "";
const phase = args.phase ?? "design";
if (!project || !existsSync(project)) {
  console.error("missing/invalid --project-path");
  process.exit(2);
}
if (!["design", "build"].includes(phase)) {
  console.error("--phase 只支持 design / build");
  process.exit(2);
}

const scopeRel = args.scope ?? "docs/user/03-scope/scope.md";
const scopePath = join(project, scopeRel);
if (!existsSync(scopePath)) {
  console.error(`scope 文件不存在: ${scopePath}`);
  process.exit(2);
}
const modules = [];
for (const line of readFileSync(scopePath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\|\s*(MOD-\d+)\s*\|\s*([^|]+)/i);
  if (m) modules.push({ id: m[1].toUpperCase(), name: m[2].trim() });
}
if (!modules.length) {
  console.error(`scope 中未发现模块行（期望 | MOD-xx | 名称 | ...）: ${scopePath}`);
  process.exit(2);
}

const run = args.run ?? "run-<N>";
const today = new Date().toISOString().slice(0, 10);
// 布局探测：V3（docs/agent）优先；旧布局（docs/process）兼容
const isV3 = existsSync(join(project, "docs", "agent")) || !existsSync(join(project, "docs", "process"));
const docsRel = (p) => (isV3 ? p : p.replace("docs/user/", "docs/").replace("docs/agent/", "docs/process/"));
const outDir = join(project, isV3 ? join("docs", "agent", "tasks") : join("docs", "process", "tasks"));
mkdirSync(outDir, { recursive: true });

function skeleton(taskName, mod) {
  const slug = mod.id.toLowerCase().replace(/[^a-z0-9]/g, "");
  const role = phase === "design" ? "模块设计员" : "模块开发员";
  const task = phase === "design"
    ? `完成 ${mod.id} ${mod.name} 的详细设计（LLD）并登记契约条目（新增/修改接口同步契约注册表，已冻结部分走变更请求）。`
    : `按 LLD 与冻结契约实现 ${mod.id} ${mod.name}，跑本模块单测与契约测试（全量回归由装配/G5 执行）。`;
  const inputs = phase === "design"
    ? [docsRel("docs/user/00-requirements/"), docsRel("docs/user/01-prd/"), docsRel("docs/user/02-hld/"), docsRel("docs/user/03-scope/"), "contracts/contracts-registry.md"]
    : [docsRel("docs/user/04-lld/"), "contracts/contracts-registry.md"];
  const outputs = phase === "design"
    ? [docsRel(`docs/user/04-lld/${taskName}.md（接口、数据结构、依赖、Scope Lock 建议）`)]
    : [`src/${slug}/（模块实现）`, `tests/test_${slug}.py（单测 + 契约测试）`];
  return [
    `# 子 Agent 任务书（${taskName}.md）`,
    "",
    `- 角色：${role}`,
    `- 创建时间：${today}`,
    "- 创建者：总控负责人（骨架由 scripts/node/generate-taskbooks.mjs 生成，需总控预审后放行）",
    `- 说明：本文件为 ${docsRel("docs/agent/tasks/")}${taskName}.md；总控会同步镜像 current.md 作兜底。优先读本文件，找不到再读 current.md，仍无则上报。`,
    "",
    "## 任务",
    "",
    `- ${task}`,
    "",
    "## 输入",
    "",
    ...inputs.map((p) => `- ${p}`),
    "",
    "## 输出",
    "",
    ...outputs.map((p) => `- ${p}`),
    "",
    "## 完成标准",
    "",
    "- [ ] <总控预填验收点 1>",
    "- [ ] <总控预填验收点 2>",
    "- [ ] 本模块单测 + 契约测试通过（全量回归由装配/G5 统一执行，dev 轮不要求全量）",
    "",
    "## 禁止",
    "",
    "- spawn 任何子 agent；按总控角色行动（需要额外 agent 时上报总控）",
    "- 猜测或自行推断任务（文件缺失/无法读取时立即上报）",
    "",
    "## 开工方式",
    "",
    `- 读取本文件 → 引用「任务」段原文复述 → 直接开工（不等待总控确认）`,
    `- 心跳（Node 跨平台；Windows Codex 可用 PS 版等价命令，见模板 06-task.md）：`,
    `  scripts/node/update-heartbeat.mjs --project-path <项目路径> --task-name ${taskName} --log-file ${docsRel("docs/agent/logs/runs/")}${run}.jsonl --heartbeat-file ${docsRel("docs/agent/tasks/")}.heartbeat-${taskName} --note "<正在做什么>"`,
    `- 预计超过 60 秒的命令用 scripts/node/long-cmd.mjs 包装（自动 LONG 心跳 + 可选超时）`,
    "",
    "## 允许修改 / 禁止修改（Scope Lock，总控预填）",
    "",
    `- 允许修改：<src/${slug}/**、tests/test_${slug}.py>`,
    `- 禁止修改：<contracts/**、${docsRel("docs/user/02-hld/")}**、其它模块代码、流程脚本/skill 文件>`,
    "",
    "## 运行日志（本轮）",
    "",
    `- 本轮日志文件：${docsRel("docs/agent/logs/runs/")}${run}.jsonl`,
    "- 心跳命令：见「开工方式」（并行轮次必带 --heartbeat-file，串行轮次可省略）",
    "",
    "## 预算（本轮，总控填写）",
    "",
    "- 定位/实验轮次上限：<N> 轮（由总控按重试上限校验）",
    "- 单轮时长上限：<M> 分钟（watchdog 机械校验）",
    "- 超预算：立即停止并上报，禁止续试同一方案",
    "- 临时沙箱目录前缀（供 watchdog 扫描）：<模块名>-",
    "",
    "## 关键接口速查（总控预填，以 LLD/契约为准）",
    "",
    "| 接口 ID | 签名 / 说明 | 来源文件 |",
    "| --- | --- | --- |",
    "| CON-XX-XX | <签名> | <LLD 或契约注册表路径> |",
    "",
    "> 摘要可能过期：与 LLD/契约不一致时以 LLD/契约为准并上报总控，禁止按摘要猜测。",
    "",
    "## 上下文摘要（一页）",
    "",
    "- ...",
    "",
  ].join("\n");
}

const created = [];
for (const mod of modules) {
  const taskName = `${mod.id.toLowerCase().replace(/[^a-z0-9]/g, "")}_${phase}`;
  const target = join(outDir, `${taskName}.md`);
  if (existsSync(target) && !args.overwrite) {
    console.log(`[skip] 已存在: ${taskName}.md（--overwrite 覆盖）`);
    continue;
  }
  const content = skeleton(taskName, mod);
  writeFileSync(target, content, "utf8");
  if (args.mirrorCurrent) writeFileSync(join(outDir, "current.md"), content, "utf8");
  created.push(target);
}
console.log(`生成 ${created.length} 份任务书骨架 -> ${outDir}`);
for (const f of created) console.log("  " + f);
console.log("提示：spawn 前必须由总控预审（任务/输入/输出/完成标准/预算/接口速查齐全）并镜像 current.md。");
process.exit(0);
