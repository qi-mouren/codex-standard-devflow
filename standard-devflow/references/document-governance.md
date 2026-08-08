# 文档治理（document-governance.md）

> V2 文档整合协议：解决"项目文档越积越多，单会话上下文撑爆、用户无法跨史诗阅读"。
> 核心：每个会话/用户只吃自己需要的一小片；汇总用引用不复制；历史按生命周期归档。

## 1. 分层阅读模型

| 读者 | 必读 | 目的 |
|---|---|---|
| 用户 | PRODUCT-PRD / PRODUCT-HLD / ROADMAP | 跨史诗全局视角 |
| 主控会话 | STATE + INDEX + 当前阶段摘要 + 契约接口行 | 调度，不吃全文 |
| 子 agent | 自己的 LLD + 任务书接口速查 | 干活，最窄上下文 |
| 需要细节时 | 链接进单史诗文档 / rg 检索 | 按需，不常驻 |

## 2. 触发规则

- **新项目**：从 G0 起增量维护（INDEX/摘要/汇总随门禁逐步建立）。
- **存量历史项目（已用标准流程产出过文档）**：**首次接入本协议时触发一次性文件整合**——判定条件：存在 STATE.md / PRD / HLD / LLD / 契约等历史产物，且尚无 `docs/process/INDEX.md`。
- 触发动作：运行 `scripts/consolidate-docs.ps1 -ProjectPath <项目>` → 生成 INDEX.md、一页摘要骨架、归档计划；总控/用户审核后执行归档与摘要填写，并产出 PRODUCT-PRD/HLD/ROADMAP 初稿（由总控开一轮"文档整合轮"或人工完成）。

## 3. 产物约定

- `docs/process/INDEX.md`：全局文档地图（每个史诗：产物清单 + 版本 + 状态 + 指针 + 摘要链接）。
- `docs/process/STATE.md`：当前状态（已有，保持）。
- `docs/archive/epic-XX/`：已交付史诗的全文归档；INDEX/STATE 只留指针 + 摘要。
- `docs/product/PRODUCT-PRD.md` / `PRODUCT-HLD.md` / `ROADMAP.md`：产品级汇总（用户视角，门禁增量合并，引用不复制）。
- 一页摘要：每个门禁通过时蒸馏（模板 `assets/templates/SUMMARY.md`）。

## 4. 维护规则（门禁点增量，不重写）

- G1 通过：PRD 负责人把本史诗增量并入 PRODUCT-PRD。
- G2 通过：架构负责人把模块/接口全景并入 PRODUCT-HLD（接口行指向契约注册表）。
- 史诗完成（G5+发布）：总控把产物移入 archive，INDEX/STATE 更新指针，生成 EPIC 一页总结。
- 任何汇总文档改动走版本号 + 变更记录，禁止原地静默覆盖。

## 5. 检索优先

- 会话需要细节时用 `rg` / `Select-String` 定位段落，不整篇读。
- INDEX.md 提供每类文档的检索关键词建议。

## 6. 上下文预算（主控）

- 主控会话必读：STATE + INDEX + 当前阶段摘要 + 契约注册表接口行。
- PRD/HLD/LLD 全文由对应子 agent 按任务书读取；历史史诗全文不进主控上下文。
