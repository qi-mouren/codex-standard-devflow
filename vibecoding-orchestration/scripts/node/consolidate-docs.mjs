#!/usr/bin/env node
// consolidate-docs.mjs - 存量历史项目首次文档整合（跨平台版，替代 consolidate-docs.ps1）
// 用法: node consolidate-docs.mjs --project-path <项目> [--force]
// 行为: 若项目已有历史产物（STATE/PRD/HLD/LLD/契约）且尚无 docs/agent/INDEX.md，
//       触发一次性整合：生成 INDEX.md + 摘要骨架 + 归档计划 consolidation-plan.md。
//       本脚本不做任何文件移动/删除；记录 external_change 事件。
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, stripBom } from "./_util.mjs";

const args = parseArgs(process.argv.slice(2), [
  { name: "projectPath", type: "string" },
  { name: "force", type: "boolean" },
]);

const projectPath = args.projectPath ?? "";
if (!projectPath) {
  console.error("missing --project-path");
  process.exit(2);
}
const force = !!args.force;

// 布局探测：V3（docs/agent）优先；旧布局（docs/process）兼容
const isV3 = existsSync(join(projectPath, "docs", "agent")) || !existsSync(join(projectPath, "docs", "process"));
const procDir = isV3 ? join(projectPath, "docs", "agent") : join(projectPath, "docs", "process");
const indexFile = join(procDir, "INDEX.md");
const planFile = join(procDir, "consolidation-plan.md");
const stateFile = join(procDir, "STATE.md");
const archiveRoot = isV3 ? join(projectPath, "docs", "user", "archive") : join(projectPath, "docs", "archive");
const productRoot = isV3 ? join(projectPath, "docs", "user", "product") : join(projectPath, "docs", "product");
const archiveRel = isV3 ? "docs/user/archive" : "docs/archive";
const productRel = isV3 ? "docs/user/product" : "docs/product";
const stageDirs = isV3
  ? [["需求", "docs/user/00-requirements"], ["PRD", "docs/user/01-prd"], ["HLD", "docs/user/02-hld"], ["范围", "docs/user/03-scope"], ["LLD", "docs/user/04-lld"]]
  : [["需求", "docs/00-requirements"], ["PRD", "docs/01-prd"], ["HLD", "docs/02-hld"], ["范围", "docs/03-scope"], ["LLD", "docs/04-lld"]];

if (!existsSync(procDir)) {
  console.log("项目无 docs/agent 或 docs/process 目录，未按标准流程组织，跳过整合");
  process.exit(2);
}
if (!existsSync(stateFile) && !force) {
  console.log("无 STATE.md（无历史产物），新项目请走增量维护，不需要一次性整合");
  process.exit(2);
}
if (existsSync(indexFile) && !force) {
  console.log("INDEX.md 已存在（非首次接入），如需重建请加 --force");
  process.exit(0);
}

console.log("触发：存量历史项目首次文档整合" + (isV3 ? "（V3 布局）" : "（旧布局，建议迁移）"));
mkdirSync(procDir, { recursive: true });
mkdirSync(archiveRoot, { recursive: true });
mkdirSync(productRoot, { recursive: true });

// 1. 扫描产物
const rows = [];
function addRows(stage, dirRel) {
  const d = join(projectPath, dirRel);
  if (!existsSync(d)) return;
  const files = readdirSync(d, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name)
    .sort();
  for (const f of files) rows.push({ stage, file: f, path: `${dirRel.replace(/\\/g, "/")}/${f}` });
}
for (const [stage, dir] of stageDirs) addRows(stage, dir);
if (existsSync(join(projectPath, "contracts", "contracts-registry.md"))) {
  rows.push({ stage: "契约", file: "contracts-registry.md", path: "contracts/contracts-registry.md" });
}

// 2. 从 STATE 门禁记录探测史诗
const epics = [];
if (existsSync(stateFile)) {
  const state = stripBom(readFileSync(stateFile, "utf8"));
  for (const m of state.matchAll(/g0[-_](epic\d+)/gi)) {
    const e = m[1].toLowerCase();
    if (!epics.includes(e)) epics.push(e);
  }
  for (const m of state.matchAll(/g5[-_](epic\d+)/gi)) {
    const e = m[1].toLowerCase();
    if (!epics.includes(e)) epics.push(e);
  }
}

// 3. 生成 INDEX.md
const today = new Date().toISOString().slice(0, 10);
const sb = [];
sb.push("# 项目文档地图（INDEX.md）");
sb.push("");
sb.push(`> 由 scripts/consolidate-docs.mjs 首次生成（${today}）；新会话第一件事 = 读本文件 + STATE.md。`);
sb.push("");
sb.push("## 当前状态");
sb.push("");
sb.push("- 当前史诗/阶段：见 docs/agent/STATE.md（本索引只给地图）");
sb.push("");
sb.push("## 问题账");
sb.push("");
sb.push("- docs/agent/issues.md：流程运行层问题唯一登记处（评审驳回 / 延期缺陷 / 环境缺陷 / 流程偏差）；门禁通过前核对无未分诊 open 或 Blocking 未决项。");
sb.push("");
sb.push("## 产物清单");
sb.push("");
sb.push("| 阶段 | 文件 | 路径 |");
sb.push("|---|---|---|");
for (const r of rows.sort((a, b) => (a.stage < b.stage ? -1 : a.stage > b.stage ? 1 : a.file < b.file ? -1 : 1))) {
  sb.push(`| ${r.stage} | ${r.file} | ${r.path} |`);
}
sb.push("");
sb.push("## 历史史诗（归档）");
sb.push("");
if (epics.length === 0) {
  sb.push("（未从 STATE 探测到史诗标记，或全部为当前史诗）");
} else {
  for (const e of epics.sort()) sb.push(`- ${e}：${archiveRel}/${e}/（summary.md 待整合轮填写）`);
}
sb.push("");
sb.push("## 产品级汇总（用户视角，待整合轮生成）");
sb.push("");
sb.push(`- 产品需求总览：${productRel}/PRODUCT-PRD.md（待生成）`);
sb.push(`- 产品架构总览：${productRel}/PRODUCT-HLD.md（待生成）`);
sb.push(`- 里程碑与发布：${productRel}/ROADMAP.md（待生成）`);
sb.push("");
sb.push("## 检索建议");
sb.push("");
sb.push("- 找接口：rg \"CON-\" contracts/contracts-registry.md");
sb.push(`- 找验收口径：rg \"验收\" ${isV3 ? "docs/user/01-prd/" : "docs/01-prd/"}`);
sb.push(`- 找历史决策：rg \"<关键词>\" ${archiveRel}/ docs/agent/`);
writeFileSync(indexFile, sb.join("\n") + "\n", "utf8");
console.log(`已生成: ${indexFile}`);

// 4. 摘要骨架 + 归档计划
const plan = [];
plan.push("# 文档整合计划（consolidation-plan.md）");
plan.push("");
plan.push("> 本计划由 consolidate-docs.mjs 生成，需总控/用户审核后执行；脚本不移动任何文件。");
plan.push("");
if (epics.length === 0) {
  plan.push("未探测到已完成史诗，无需归档。");
} else {
  for (const e of epics.sort()) {
    const target = join(archiveRoot, e);
    const skeleton = join(target, "summary.md");
    mkdirSync(target, { recursive: true });
    if (!existsSync(skeleton)) {
      const sum = [
        `# ${e} 一页总结`,
        "",
        "- 状态：待整合轮填写",
        "- 交付版本：<tag>",
        "- 范围：<一句话>",
        "- 关键决策：<3 条>",
        "- 遗留/延期：<列表或链接>",
        "- 契约影响：<新增/零升级>",
      ].join("\n");
      writeFileSync(skeleton, sum + "\n", "utf8");
      plan.push(`- [${e}] 已生成摘要骨架 ${skeleton}；请整合轮填写并确认是否归档（移动 ${e} 相关产物到 ${archiveRel}/${e}/）`);
    } else {
      plan.push(`- [${e}] 摘要已存在：${skeleton}`);
    }
  }
}
plan.push("- [ ] 生成 PRODUCT-PRD / PRODUCT-HLD / ROADMAP 初稿（整合轮）");
plan.push("- [ ] 更新 INDEX.md 状态与链接");
writeFileSync(planFile, plan.join("\n") + "\n", "utf8");
console.log(`已生成: ${planFile}`);

// 5. 登记 external_change
try {
  const rec = fileURLToPath(new URL("./record-event.mjs", import.meta.url));
  execFileSync(process.execPath, [rec, "--project-path", projectPath, "--event", "external_change", "--detail", "首次文档整合：生成 INDEX.md / consolidation-plan.md / 史诗摘要骨架"], { stdio: "ignore" });
} catch {
  console.log("（未找到可用的 record-event，跳过 external_change 登记）");
}
process.exit(0);
