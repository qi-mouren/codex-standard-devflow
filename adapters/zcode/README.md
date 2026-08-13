# ZCode 适配器

把本流程的「文件式执行协议」映射到 ZCode（zcode CLI，`~/.zcode`）。ZCode 的子 agent 经 `Agent` 工具 spawn，prompt 直达可靠，编排能力比 Codex 原生层更简单——**Codex 环境适配层里为消息通道/槽位泄漏/上下文继承准备的补偿规则，在 ZCode 基本用不上**。

状态：**社区贡献，待实机验收**（验收清单见 `adapters/README.md`；本适配器随「接入 ZCode」实测完成安装与单 agent 闭环，并行/中断/门禁闭环待补跑）。

## 1. 平台信息

| 项 | 填写 |
|---|---|
| 平台名 | ZCode（zcode CLI，配置目录 `~/.zcode/`） |
| 实测版本 | 2026-08 本地安装（Windows，Git Bash） |
| agent 定义格式 | skill 用 `SKILL.md`；子 agent 用 `Agent` 工具的 prompt 模板（`role-cards/`）；Settings→Subagents 原生定义格式**待实测** |
| 子 agent 委派方式 | `Agent` 工具：`subagent_type`（general-purpose / Explore）+ `prompt` + `description`；支持 `run_in_background` 与并行 |
| 安装位置 | 用户级：skill 装 `~/.zcode/skills/`，全局规则装 `~/.zcode/AGENTS.md`；所有项目可用 |

## 2. 六能力自评表

| 能力 | ZCode 原生机制 | 实测 | 文件式兜底 |
|---|---|---|---|
| spawn | `Agent` 工具：prompt 直达子 agent，`description` 写「读 <任务书路径> 执行任务」 | ✅ 可靠（本会话实机验证：prompt 完整可达、任务可执行） | 任务书路径 + current.md 镜像 |
| message | prompt 直达 + `SendMessage`（agent 间消息）+ `TaskOutput` 查执行结果 | ✅ 可靠 | 任务书为唯一真相 |
| interrupt | `TaskStop` 编程式中断；background 任务完成自动通知主会话并回收 | ✅ 完成即回收（本会话 background 子任务完成后自动通知） | 每轮单 agent + STATE Agent Registry |
| list | `/tasks` 命令 + `TaskOutput` 状态查询 | ✅ 可用 | STATE Agent Registry |
| shell | 子 agent 共享同一工作区，可执行 Bash/Read/Edit 等 | ✅ 一致（本会话子 agent 读写同一目录） | 共享工作区 |
| heartbeat | 无子 agent 级自动心跳钩子（hooks 是否覆盖子 agent **待实测**） | ⚠️ 待实测 | 显式 `update-heartbeat.mjs`（复用流程库 node 套件） |

## 3. 安装

### 3.1 安装 skill（一次性，用户级）

```powershell
# 4 个 skill 复制到用户级 skills 目录（目标不存在则直接复制，无嵌套陷阱）
Copy-Item -LiteralPath '.\vibecoding-orchestration' -Destination "$env:USERPROFILE\.zcode\skills\vibecoding-orchestration" -Recurse -Force
Copy-Item -LiteralPath '.\ui-design-intelligence'   -Destination "$env:USERPROFILE\.zcode\skills\ui-design-intelligence"   -Recurse -Force
Copy-Item -LiteralPath '.\pil-diagram'              -Destination "$env:USERPROFILE\.zcode\skills\pil-diagram"              -Recurse -Force
Copy-Item -LiteralPath '.\analyze-idea'             -Destination "$env:USERPROFILE\.zcode\skills\analyze-idea"             -Recurse -Force
```

### 3.2 全局规则（一次性）

把 [docs/global-agents.md.example](../../docs/global-agents.md.example) 的内容放入 `~/.zcode/AGENTS.md`，所有 ZCode 会话自动加载 skill 触发规则。

### 3.3 项目（每次新项目）

1. 项目 `AGENTS.md` 只写身份：产品名、当前史诗、STATE 指针（`docs/process/STATE.md`）。
2. 任务书（`assets/templates/06-task.md`）的心跳/长命令脚本路径，引用已安装 skill 的 `scripts/node/`：

```powershell
# 项目内约定（二选一，写入任务书时保持一致）：
# A. 引用已安装 skill 的绝对路径（不改项目结构，但跨机需重装）
$nodeScripts = "$env:USERPROFILE\.zcode\skills\vibecoding-orchestration\scripts\node"
# B. 复制 node 套件到项目（推荐：自包含、随仓库提交）
Copy-Item -LiteralPath "$env:USERPROFILE\.zcode\skills\vibecoding-orchestration\scripts\node" -Destination ".\scripts\node" -Recurse -Force
```

## 4. 角色卡

`role-cards/` 下 5 张卡（`Agent` 工具 prompt 模板格式，`role-card.md.example` 派生）：

| 文件 | 委派方式 | 对应流程角色 |
|---|---|---|
| `zcode-controller.md` | 主会话（skill 的 SKILL.md 即总控指引） | 总控负责人 |
| `zcode-module-designer.md` | Agent 工具（general-purpose） | 模块设计员 |
| `zcode-module-developer.md` | Agent 工具（general-purpose） | 模块开发员 |
| `zcode-architect-reviewer.md` | Agent 工具（general-purpose，prompt 声明只读） | 架构评审员（G2，只读） |
| `zcode-qa-reviewer.md` | Agent 工具（general-purpose，prompt 声明只读） | QA 评审员（G5，只读） |

> 差异：ZCode `Agent` 工具无原生权限字段（opencode 有 `edit: deny` / `task: deny`），评审员「只读、禁止递归」靠 prompt 明示 + 任务书 Scope Lock 约束（见「已知限制」）。

## 5. 心跳方案

- **子 agent（必选，可靠路径）**：任务书预填完整心跳命令，角色卡要求「每完成一个工具步骤或最多每 60 秒执行一次」：

```bash
node <scripts/node 路径>/update-heartbeat.mjs --project-path <项目> --task-name <task_name> --log-file docs/process/logs/runs/run-<N>.jsonl [--heartbeat-file docs/process/tasks/.heartbeat-<task_name>] --note "<当前动作>"
```

  - 并行轮次必带 `--heartbeat-file`（每个并行 agent 独立心跳文件，互不覆盖）；串行可省略。
  - 预计超过 60 秒的工具调用**必须**用 `long-cmd.mjs` 包装（自动 LONG 心跳 + 可选超时）：

```bash
node <scripts/node 路径>/long-cmd.mjs --project-path <项目> --log-file docs/process/logs/runs/run-<N>.jsonl --command "<命令>"
```

- **主会话（增强，待实测）**：ZCode hooks（`PostToolUse` 等）是否拦截子 agent 工具调用未实测；若覆盖则主会话可自动心跳，但协议不依赖。判卡死阈值沿用流程默认（3 分钟无首心跳预警 / 8 分钟无心跳且无产出判卡死 / LONG 宽限 15 分钟）。
- **watchdog（总控侧）**：spawn 成功后主会话后台启动 `node <scripts/node 路径>/watchdog.mjs --project-path <项目> --run run-<N> [--heartbeat-file ...]`，自动写事实账与 stale/budget 事件；interrupt 前先 `--once` 取证。

## 6. 快速开始（新项目）

1. 主会话按流程产出需求锚点 → PRD → HLD → 拆解 → LLD。
2. G4 冻结契约后，写任务书 `docs/process/tasks/<task_name>.md` + `current.md` 镜像（预填心跳命令、Scope Lock、关键接口速查）。
3. 在主会话调用 `Agent` 工具：
   - `description`: `执行 vibecoding-orchestration 流程：读 docs/process/tasks/<task_name>.md 执行任务；先引用"任务"段原文复述，再开工`
   - `prompt`: 对应角色卡内容（`role-cards/zcode-module-designer.md` 等）+ 任务书路径。
   - 需要后台并行时 `run_in_background: true`，多轮任务可一次消息发起多个 Agent 调用。
4. 通过心跳文件与 `TaskOutput` 观察子会话；完成后更新 STATE 与 Agent Registry。
5. 评审轮：spawn 架构评审员 / QA 评审员，独立报告落盘后过门禁。

## 7. 已知限制与绕法

| 限制 | 绕法 |
|---|---|
| `Agent` 工具无原生权限字段（不能 `edit: deny` / `task: deny`） | 评审员卡 prompt 明示「只读、禁止修改任何文件、禁止 spawn」；任务书 Scope Lock 收紧允许修改范围；总控把关 |
| hooks 是否覆盖子 agent 工具调用未实测 | 心跳一律走显式 `update-heartbeat.mjs`（必选），主会话自动心跳仅作增强 |
| 子 agent 上下文 = prompt + description，不继承主会话对话 | 与「零上下文继承 + 自包含任务书」一致，任务书必须完整 |
| 并行 Agent spawn 行为未在本适配器实机验收 | 本会话已验证单 agent 闭环；并行先 2 个起步验证再放开 |
| 本适配器未实机验收 | 按 `adapters/README.md` 验收清单补跑后更新本节 |
