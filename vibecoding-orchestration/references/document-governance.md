# 文档治理（document-governance.md）

> V3 文档治理协议：解决"项目文档越积越多，单会话上下文撑爆、用户无法跨史诗阅读、问题散落各文件容易遗漏"。
> 核心：**文档按读者分目录**（docs/user 用户看、docs/agent Agent 看）；每个会话/用户只吃自己需要的一小片；汇总用引用不复制；历史按生命周期归档；**问题统一进问题账**。

## 1. 目录布局（V3 标准）

```
docs/user/                    用户看的业务产物（业务语义，跨史诗可读）
  00-requirements/            需求锚点（含 raw/ 蒸馏来源）
  01-prd/                     PRD
  02-hld/                     HLD
  03-scope/                   模块拆解清单
  04-lld/                     模块 LLD
  product/                    产品级汇总（PRODUCT-PRD / PRODUCT-HLD / ROADMAP）
  archive/                    已交付史诗全文归档（epic-XX/）
docs/agent/                   Agent 运行与状态（进程语义，会话恢复与调度用）
  STATE.md                    当前状态（阶段/门禁/Agent Registry/产物索引）
  traceability.md             追踪矩阵
  INDEX.md                    全局文档地图
  issues.md                   问题账（唯一登记处，模板 07-issues.md）
  epic-inputs.md              全委托时的输入文档
  tasks/                      任务书 + current.md + .heartbeat*
  logs/                       调度账 / 执行账 / 事实账
  reviews/                    G2/G5 评审报告、代码评审、缺陷报告
contracts/
  contracts-registry.md       契约注册表（冻结只读，绑定 contracts-frozen tag，保持根级）
```

- `docs/user/` 按业务语义命名，用户按目录即可浏览全部产品文档；`docs/agent/` 按运行语义命名，Agent 会话恢复时按固定入口读取。
- `contracts/` 保持根级：契约是"冻结真相"，被 git tag（vX-contracts-frozen）、check-flow、全部脚本与角色提示词绑定，不属于任何一类的"分类文档"。
- 评审报告（G2/G5/CR）是 Agent 工作产物与门禁证据，归 `docs/agent/reviews/`；用户经 STATE 门禁记录与 INDEX 链接查看，无需直接翻目录。

## 2. 问题账（统一登记，防遗漏）

- **唯一登记处**：`docs/agent/issues.md`（模板 `assets/templates/07-issues.md`）。流程运行层的一切问题只在这里登记：评审驳回项、G5 延期缺陷、环境/平台缺陷、流程偏差、挂起决策。需求层开放问题/废案记在需求锚点，不混入。
- **登记人 = 总控负责人**：子 agent / 评审员发现问题 → 上报总控 → 总控登记（避免多 agent 并发写同一文件）。登记即分配 ID（ISS-xxx）与严重度。
- **状态流转**：`open → triaged → fixed / deferred / wontfix`，必须走到终态，禁止长期滞留 open。
- **门禁联动**：每个门禁通过前检查问题账——存在未分诊 open 项或 Blocking 级未决项不得放行；G5 的延期缺陷必须登记为 deferred 并附日期。
- 一页摘要与 STATE 的「阻塞项」只放问题 ID 指针，详情在 issues.md（引用不复制）。

## 3. 分层阅读模型

| 读者 | 必读 | 目的 |
|---|---|---|
| 用户 | docs/user/product/ + 当前史诗 docs/user/00-04 | 跨史诗全局视角 / 当前史诗业务内容 |
| 主控会话 | docs/agent/STATE + INDEX + issues.md + 当前阶段摘要 + 契约接口行 | 调度与问题追踪，不吃全文 |
| 子 agent | 自己的任务书 + LLD 接口速查 + reviews/（评审时） | 干活，最窄上下文 |
| 需要细节时 | 链接进单史诗文档 / rg 检索 | 按需，不常驻 |

## 4. 触发规则

- **新项目**：从 G0 起增量维护（INDEX/摘要/汇总随门禁逐步建立），目录直接按 V3 布局建。
- **存量历史项目（已用旧布局产出过文档）**：**首次接入 V3 时触发一次性文档整合**——判定条件：存在 STATE.md / PRD / HLD / LLD / 契约等历史产物，且尚无 `docs/agent/INDEX.md`。
  - 触发动作：运行 `scripts/consolidate-docs.ps1`（或 node 版）→ 生成 INDEX.md、一页摘要骨架、归档计划；总控/用户审核后执行归档与摘要填写，并产出 PRODUCT-PRD/HLD/ROADMAP 初稿。
  - 目录迁移：见 §8 迁移指引。**正在进行的史诗不做迁移**（避免打断活跃任务书/心跳/日志路径），本史诗收官后再迁。

## 5. 产物约定

- `docs/agent/INDEX.md`：全局文档地图（每个史诗：产物清单 + 版本 + 状态 + 指针 + 摘要链接 + 问题账指针）。
- `docs/agent/STATE.md`：当前状态（阶段/门禁/Agent Registry/阻塞项=问题 ID 指针）。
- `docs/agent/issues.md`：问题账（见 §2）。
- `docs/user/archive/epic-XX/`：已交付史诗全文归档；INDEX/STATE 只留指针 + 摘要。
- `docs/user/product/PRODUCT-PRD.md` / `PRODUCT-HLD.md` / `ROADMAP.md`：产品级汇总（用户视角，门禁增量合并，引用不复制）。
- 一页摘要：每个门禁通过时蒸馏（模板 `assets/templates/SUMMARY.md`）。

## 6. 维护规则（门禁点增量，不重写）

- G1 通过：PRD 负责人把本史诗增量并入 PRODUCT-PRD。
- G2 通过：架构负责人把模块/接口全景并入 PRODUCT-HLD（接口行指向契约注册表）。
- 史诗完成（G5+发布）：总控把产物移入 docs/user/archive/，INDEX/STATE 更新指针，生成 EPIC 一页总结；本史诗遗留问题收敛进问题账（deferred）。
- 任何汇总文档改动走版本号 + 变更记录，禁止原地静默覆盖。

## 7. 检索优先与上下文预算

- 会话需要细节时用 `rg` / `Select-String` 定位段落，不整篇读；INDEX.md 提供每类文档的检索关键词建议。
- 主控会话必读：STATE + INDEX + issues.md + 当前阶段摘要 + 契约注册表接口行；PRD/HLD/LLD 全文由对应子 agent 按任务书读取；历史史诗全文不进主控上下文。

## 8. 存量项目迁移指引（整理轮执行，不在进行中的史诗中途执行）

迁移时机：当前史诗 G5 交付后开"文档整理轮"。用 `git mv` 保持历史；迁移后跑 check-flow 确认健康，同步修正全部内部链接（rg 检索旧路径逐个改）。

| 旧路径 | 新路径 |
|---|---|
| docs/00-requirements/（含 raw/） | docs/user/00-requirements/ |
| docs/01-prd/ 02-hld/ 03-scope/ 04-lld/ | docs/user/01-prd/ 02-hld/ 03-scope/ 04-lld/ |
| docs/product/ | docs/user/product/ |
| docs/archive/ | docs/user/archive/ |
| docs/process/STATE.md / traceability.md / INDEX.md | docs/agent/ 同名 |
| docs/process/tasks/ logs/ | docs/agent/tasks/ logs/ |
| docs/process/reviews/、qa-*、g2/g4-review-*、cr-*、code-review-* | docs/agent/reviews/ |
| docs/process/backlog-epicNN-p3.md（QA-OBS 观察项） | 收敛进 docs/agent/issues.md（源文件按需归档） |
| docs/process/decision-*、proposal、handoff、epic-*提案 | docs/agent/（运行决策与交接记录） |
| docs/process/release-notes-*、milestone-*、产品图 | docs/user/（用户可读的发布与规划信息） |
| docs/process/skill-issues.md（若有） | 并入 docs/agent/issues.md |

兼容说明：脚本（check-flow / consolidate-docs / classify-change / generate-taskbooks）同时识别新旧两套布局——新布局按新路径检查；检测到旧布局（存在 docs/00-requirements/）按旧路径检查并提示建议迁移，不报错。存量项目未迁移期间可继续用旧路径跑流程。
