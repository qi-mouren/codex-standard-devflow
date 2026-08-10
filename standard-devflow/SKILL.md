---
name: standard-devflow
description: 大型项目标准开发流程：需求蒸馏、产品需求（PRD）、架构设计（HLD）、模块拆解、详细设计（LLD）、契约管理、开发实现与集成，含门禁 G0-G5、强制子 agent 编排（独立评审、模块设计员、模块开发员）、Git 分支规范与史诗/里程碑切分。当用户开始新项目或新史诗、需要蒸馏需求锚点、撰写产品需求/架构设计/详细设计、拆解模块范围、冻结契约、管理开发任务、执行门禁评审、切分史诗与里程碑、恢复跨会话项目状态，或在多 agent 环境下需要并行实现与独立评审时使用本 skill。
---

# Standard DevFlow（标准开发流程）

## 命名对照（旧代号 → 新名称）

| 旧代号 | 新名称 |
|---|---|
| A0 | 需求锚定 |
| B-1 | 产品需求 |
| B-2 | 架构设计 |
| B-3 | 模块拆解 |
| B-4 | 详细设计 |
| G4 | 契约冻结（门禁） |
| B-5 | 开发实现 |
| 最终集成 | 集成交付 |

完整流程：需求锚定 → 产品需求 → 架构设计 → 模块拆解 → 详细设计 → 契约冻结 → 开发实现 → 集成交付

## 核心原则

1. 需求先蒸馏：需求会话的冗长讨论必须在需求锚定阶段收敛为结构化锚定文档，下游只见锚点，不见噪声。
2. 主管层串行、执行层必须起子 agent：产品需求、架构设计、模块拆解、详细设计、开发实现严格先后；进入详细设计和开发实现阶段必须 spawn 模块设计员 / 模块开发员子 agent 并行执行，禁止主会话代劳。
3. 文件即真相：会话记忆会丢，文件不会。每个产出落盘，交接只传"文件路径 + 一页摘要"。
4. 产出的节点不能当自己的裁判：G2/G5 必须由独立评审子 agent 把关，主会话不得自评。
5. 契约冻结后走版本升级：禁止原地修改已冻结文档。
6. 每个里程碑/史诗独立跑完整流程，产品层不重复跑。

## 启动新会话（每次必做）

1. 读取项目 `docs/process/STATE.md`，确认当前史诗、阶段、门禁状态。
2. 运行 `scripts/check-flow.ps1 -ProjectPath <项目路径>` 检查流程健康度。
3. 依据 STATE.md 判断当前阶段与下一步动作。
4. 按需加载 references/ 中对应文档。

## 流程总览

需求锚定 → G0 → 产品需求 → G1 → 架构设计 → G2 → 模块拆解 → G3 → 详细设计 → G4 契约冻结 → 开发实现 → CI/G5 → 集成交付

- 完整流程、数据流与回路规则：`references/workflow.md`
- 角色职责与提示词：`references/roles.md`
- 门禁 owner 与检查表：`references/gates.md`
- 史诗/模块/里程碑切分：`references/splitting.md`
- Git 分支与 tag 规范：`references/git-flow.md`
- 环境适配与子 agent 执行协议：`references/environment-adaptation.md`
- 角色卡素材（社区 MIT，原文）：`assets/role-cards/`；提炼速查：`references/role-cards.md`

## UI 相关模块挂载（可选）

史诗含 UI/前端模块且项目启用 `ui-design-intelligence` 时：

- 详细设计：UI 模块任务书加载项目的 `design-genome.md` + `component-philosophy.md`，LLD 只写原则级设计约束。
- 开发实现：UI 模块开发员先读 genome 再写代码，产出截图供视觉评审。
- G5：增加视觉验收 lane，对照 genome 评审，verdict=alive 才算过；评审独立于开发。

核心流程、门禁、红线不变；该 skill 只提供领域知识与评审回路。

## 子 Agent 强制规则

以下工作**必须**由子 agent 执行。主会话（总控负责人）只做编排、门禁与状态同步，不得代劳：

| 阶段/门禁 | 必须 spawn 的子 agent | 数量 | 提示词来源 |
|---|---|---|---|
| G2 架构评审 | 架构评审员 | 1 个 | references/roles.md |
| 详细设计 | 模块设计员 | 每模块 1 个 | references/roles.md |
| 开发实现 | 模块开发员 | 每模块 1 个 | references/roles.md |
| G5 集成/QA | QA 评审员 | 1 个（不得由开发相关 agent 担任） | references/roles.md |

### 执行协议（进入子 agent 阶段前必读）

执行协议与全部环境适配规则见 `references/environment-adaptation.md`。进入详细设计、开发实现、G2、G5 任何子 agent 阶段前**必须先读该文件**。

核心要点（不可违反）：

- 契约冻结后按依赖图分批并行（每批 ≤2~3 个且按剩余槽位），每批全部 interrupt 回收后再开下一批；单 agent 串行仍是兜底。
- 任务书写入 `docs/process/tasks/<task_name>.md` 并镜像 current.md 兜底；spawn 消息写任务书路径。
- 子 agent 心跳：每完成一个工具步骤或最多每 60 秒一次（带 `-Note`）；并行轮各用独立心跳文件（`-HeartbeatFile`）；预计超过 60 秒的长命令必须用 `scripts/long-cmd.ps1` 包装（自动 LONG 心跳 + 可选超时）；spawn 后 3 分钟无首心跳预警、8 分钟无心跳且无产出才判卡死；interrupt 前必须重读心跳文件并做全仓最近 2 分钟变更扫描，任一新鲜即不得打断。
- 运行监控：spawn 成功后由总控启动后台 watchdog（事实账 `run-N.facts.jsonl` + 3/8/15 判卡死 + 预算校验，自动写账与事件；并行轮传 `-HeartbeatFile`）；interrupt 前先 `watchdog.ps1 -Once` 取证；任务书必须含预算节（N×M）与关键接口速查；全量回归用 `scripts/run-tests-parallel.ps1` 分片并行（dev 轮只跑本模块单测 + 契约测试）；外部会话写项目文件需登记 `external_change`。
- 快速模式：小改动（修 bug / 小接口 / 小重构，不跨模块、不碰契约）走 `references/quick-mode.md`：需求→任务→实现→评审→提交，不跑完整 G0-G5；评审不可免。
- 文档治理：`references/document-governance.md`（INDEX/摘要/归档/产品级汇总/首次触发整合）；存量历史项目首次接入跑 `scripts/consolidate-docs.ps1`。
- task_name 只允许小写字母/数字/下划线；每轮结束必须 interrupt 回收（槽位不自动释放）。
- 子 agent 禁止再 spawn；总控每个调度动作必须 record-event 落调度账，复盘跑 analyze-flow.ps1。
## 角色清单

| 角色 | 职责 | 产出 |
|---|---|---|
| 需求负责人（原 A-0） | 需求提炼与固化 | 需求锚定文档 |
| 总控负责人（原 B 总控） | 维护追踪矩阵、STATE、契约注册表，把关 G3/G4 形式检查 | 追踪矩阵、STATE |
| 产品需求负责人（原 B-1） | 产品需求文档（PRD） | PRD |
| 架构负责人（原 B-2） | 架构设计文档（HLD） | HLD |
| 架构评审员（G2） | 独立审查架构设计：可行性、覆盖率、风险 | 评审报告 |
| 拆解负责人（原 B-3） | 模块拆解 | 模块清单与边界 |
| 详细设计负责人（原 B-4） | 详细设计（LLD）与契约整合 | LLD + 契约注册表（冻结） |
| 开发负责人（原 B-5） | 开发任务管理与集成 | 实现、测试、集成 |
| QA 评审员（G5） | 独立回归与验收 | QA 报告 |

详细提示词见 `references/roles.md`。

## 门禁速查

| 门禁 | 判定 | 控制者 |
|---|---|---|
| G0 需求评审 | 需求完整可测、无废案 | 人类 |
| G1 产品需求评审 | 产品需求覆盖全部 REQ | 人类 PO + 总控负责人 |
| G2 架构评审 | 技术可行、风险可接受 | 人类架构师 + 架构评审员（必须 spawn） |
| G3 范围对照 | 模块清单与产品需求双向追踪 | 总控负责人（可脚本化） |
| G4 契约冻结 | 接口交叉校验通过、归属唯一 | 总控负责人 + 独立评审 + 人类签字 |
| G5 集成/QA | 回归通过、验收全绿 | QA 评审员（必须 spawn，独立于开发） |

完整检查表见 `references/gates.md`。

## 产物模板

`assets/templates/` 下的模板，按需复制到项目中：

- `01-requirements-anchor.md`：需求锚定文档
- `02-PRD.md`：产品需求文档
- `03-HLD.md`：架构设计文档
- `04-scope.md`：模块拆解清单
- `05-LLD.md`：模块详细设计
- `contracts-registry.md`：契约注册表
- `STATE.md`：项目状态
- `traceability.md`：追踪矩阵
- `06-task.md`：子 agent 任务书（spawn 前落盘）

## 红线规则

1. 未过 G0 不得进入产品需求阶段。
2. 契约冻结（G4）后禁止原地修改；变更走"变更请求"，产物升版本号。
3. 每一步完成时三件事必须同时发生：产物落盘、Git tag、STATE.md 更新。
4. 单史诗模块数 3-8；超过 8 必须再切一刀。
5. 任何 agent 不得评审自己的产出（含子 agent 自评）。
6. 交接物必须是"文件路径 + 一页摘要"，禁止把全部历史上下文传给下游。
7. 详细设计和开发实现阶段必须 spawn 模块设计员 / 模块开发员子 agent，主会话不得代劳模块级工作。
8. G2/G5 必须由独立评审子 agent 执行；无法 spawn 时暂停询问用户，禁止自评替代。
9. 子 agent spawn/投递失败重试不超过 2 次，仍失败必须上报用户，禁止主会话代做模块级工作。
