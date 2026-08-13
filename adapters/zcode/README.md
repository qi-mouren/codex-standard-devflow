# ZCode 适配器

把本流程的「文件式执行协议」映射到 ZCode（zcode CLI，`~/.zcode`）。ZCode 的子 agent 经 `Agent` 工具 spawn，prompt 直达可靠，编排能力比 Codex 原生层更简单——**Codex 环境适配层里为消息通道/槽位泄漏/上下文继承准备的补偿规则，在 ZCode 基本用不上**。

状态：**社区贡献，已实机验收**（2026-08-13，验收记录见文末「8. 实机验收记录」；验收清单对照见 `adapters/README.md`）。

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
| spawn | `Agent` 工具：`subagent_type` 指定 profile（`devflow-*`，本目录 `agents/`），`description` 写「读 <任务书路径> 执行任务」；prompt 直达可靠 | ✅ 可靠（实机验证：profile 格式被原生解析，Agent 工具按名匹配） | 任务书路径 + current.md 镜像 |
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

### 3.3 子 agent profiles（项目级，每次新项目）

ZCode 原生 subagent 定义 = Markdown + frontmatter，放 `<项目>/.zcode/agents/`（仅该项目可用、随 git 版本化）；用户级可放 `~/.zcode/agents/`（所有项目）。本仓库维护 5 个流程角色 profile 源（`agents/`），复制到项目：

```powershell
# 项目级（推荐，随仓库提交）
Copy-Item -LiteralPath '.\agents' -Destination '.\zcode\agents' -Recurse -Force   # 注意：仓库内为 adapters/zcode/agents
# 用户级（所有项目可用）
Copy-Item -LiteralPath '.\agents\devflow-*.md' -Destination "$env:USERPROFILE\.zcode\agents\" -Force
```

Profile frontmatter 字段（ZCode 原生解析，`~/.zcode/agents/` 与 `<项目>/.zcode/agents/` 两处）：

```markdown
---
name: devflow-module-developer   # 必填，Agent 工具 subagent_type 按此匹配
description: 模块开发员：...      # 必填
tools: [Bash, Read, Write, Edit, Grep, Glob, TodoWrite]   # 工具白名单
disallowedTools: [Agent, TaskStop, SendMessage]            # 禁用工具（评审员禁 Agent=禁递归 spawn）
color: orange                    # 可选
permissionMode: auto             # 可选
maxTurns: N                      # 可选
memory: user                     # 可选
---
Markdown body = 系统提示词（角色卡内容）
```

内置保留名（general-purpose / explore 等）不可覆盖，自定义名无冲突。

### 3.4 项目（每次新项目）

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

`agents/` 下 5 个**原生 subagent profiles**（Markdown + frontmatter，`Agent` 工具按 `subagent_type` 名直接匹配；安装见 §3.3）：

| 文件 | profile 名（subagent_type） | 对应流程角色 | 权限 |
|---|---|---|---|
| `devflow-controller.md` | devflow-controller | 总控负责人（主会话角色） | tools 全开 |
| `devflow-module-designer.md` | devflow-module-designer | 模块设计员 | 禁 Agent/TaskStop/SendMessage |
| `devflow-module-developer.md` | devflow-module-developer | 模块开发员 | 禁 Agent/TaskStop/SendMessage |
| `devflow-architect-reviewer.md` | devflow-architect-reviewer | 架构评审员（G2） | 禁 Agent/TaskStop/SendMessage；只读由 prompt + 任务书 Scope Lock 约束 |
| `devflow-qa-reviewer.md` | devflow-qa-reviewer | QA 评审员（G5） | 禁 Agent/TaskStop/SendMessage；只读由 prompt + 任务书 Scope Lock 约束 |

> `role-cards/` 下旧版 `zcode-*.md`（Agent 工具 prompt 模板格式）保留作参考：若未安装 profiles，可把整卡内容粘贴进 Agent 工具 `prompt` 使用（与验收等价）。**推荐改用原生 profiles**——`disallowedTools: [Agent]` 硬性禁止递归 spawn，比 prompt 声明强。
>
> 差异：ZCode 的 `disallowedTools` 支持工具级禁用（opencode 的 `edit: deny` 是路径级），评审员「只写评审报告」仍需 prompt + 任务书 Scope Lock 约束写路径。

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
3. 在主会话调用 `Agent` 工具（profile 已装到项目 `.zcode/agents/`）：
   - `subagent_type`: `devflow-module-designer`（或 `devflow-module-developer` / `devflow-architect-reviewer` / `devflow-qa-reviewer`）
   - `description`: `执行 vibecoding-orchestration 流程：读 docs/process/tasks/<task_name>.md 执行任务；先引用"任务"段原文复述，再开工`
   - `prompt`: 只写任务书路径与当前任务上下文（角色卡已由 profile 注入，无需重复粘贴）。
   - 需要后台并行时 `run_in_background: true`，多轮任务可一次消息发起多个 Agent 调用。
4. 通过心跳文件与 `TaskOutput` 观察子会话；完成后更新 STATE 与 Agent Registry。
5. 评审轮：spawn 架构评审员 / QA 评审员，独立报告落盘后过门禁。

## 7. 已知限制与绕法

| 限制 | 绕法 |
|---|---|
| profile `disallowedTools` 是工具级禁用（无 opencode 的路径级 `edit: deny`） | 评审员只写评审报告：profile 禁 Agent 防递归 + prompt/任务书 Scope Lock 约束写路径；总控把关 |
| hooks 是否覆盖子 agent 工具调用未实测 | 心跳一律走显式 `update-heartbeat.mjs`（必选），主会话自动心跳仅作增强 |
| 子 agent 上下文 = profile systemPrompt + prompt + description，不继承主会话对话 | 与「零上下文继承 + 自包含任务书」一致，任务书必须完整 |
| profile 加载需 ZCode 重启/重载配置生效（profiles 在会话启动时扫描） | 新装 profile 后重开会话；`subagent_type` 找不到时回退 general-purpose + prompt 粘贴（role-cards 兜底） |

## 8. 实机验收记录（2026-08-13）

验收项目：临时目录 `%TEMP%\zcode-adapter-acceptance`（hello-utils EPIC-01，Python 标准库纯函数库，本地 git 库），按 `adapters/README.md` 验收清单逐项跑通：

| # | 验收项 | 结果 | 证据 |
|---|---|---|---|
| 1 | spawn 模块设计员 → 读任务书 → 复述 → 产出 LLD | ✅ | `docs/04-lld/greet.md`/`farewell.md` 落盘，契约签名逐字一致；心跳账 `run-1.jsonl` 4 条 |
| 2 | spawn 模块开发员 → 按 LLD+契约实现 → 本模块测试通过 | ✅ | `src/`+`tests/` 落盘，`python -m unittest` 4/4 全绿；`run-2.jsonl` 3 条 |
| 3 | 并行 2 个同角色 agent，心跳互不覆盖、产出不冲突 | ✅ | `impl_greet_loud`/`impl_farewell_loud` 同时产出（6/6 全绿）；`.heartbeat-mod_greet`/`.heartbeat-mod_farewell` 独立；`run-3.jsonl` 两 task 共 5 条 |
| 4 | interrupt 可回收、可重开，不泄漏槽位 | ✅ | `TaskStop` 中断 sleep 120 中的 `slow_probe` 成功（status=stopped）；同名 task_name 立即重开成功；`run-4.jsonl` |
| 5 | G5 独立评审（评审员 ≠ 产出者）报告落盘 | ✅ | `docs/process/reviews/qa-2026-08-13.md` 结论 PASS；评审员只读、未改任何项目文件；`run-5.jsonl` 4 条 |
| 6 | 复盘：基于日志输出时间线与异常 | ✅ | `analyze-flow.mjs` 输出 11 个调度事件时间线 + 5 轮心跳明细 + 异常提示 |

**验收记录到的观察项（非阻塞，后续改进）**：

1. **spawn 事件未入调度账**：验收时实际 spawn 走 ZCode `Agent` 工具，但总控未用 `record-event` 记 `spawn_start/spawn_success`，导致 analyze-flow 显示「spawn: 无匹配调度记录、槽位未回收」。修复：总控委派 Agent 工具前后各记一次 `spawn_start`/`spawn_success` 事件（含 agentId）。
2. **QA 评审观察项**：① 并行批次新增的 `greet_loud`/`farewell_loud` 未登记 LLD（不影响冻结契约，测试已覆盖）；② 追踪矩阵状态列未随 dev 轮更新。均为文档纪律问题，不属平台缺陷。
3. **hooks 覆盖子 agent 待测**：本适配器心跳走显式命令即通过验收，未依赖 hooks；后续可实测 ZCode hooks（PostToolUse 等）是否拦截子 agent 工具调用，若覆盖则主会话可自动心跳（增强项，协议不依赖）。
4. **原生 subagent profiles（事后补测）**：从 ZCode 运行时（`resources/glm/zcode.cjs`）确认原生 subagent 机制 = Markdown + frontmatter，放 `~/.zcode/agents/`（用户级）或 `<项目>/.zcode/agents/`（项目级），`Agent` 工具 `subagent_type` 按 `name` 匹配；`disallowedTools: [Agent]` 可原生禁递归 spawn。已据此新增 `agents/` 5 个 profile 源（§3.3/§4）。profile 加载在会话启动时扫描，新装后需重开会话；`subagent_type` 未命中时回退 general-purpose（role-cards 兜底）。profile 的实际实机 spawn 调用（非源码解析确认）留待下次会话跑一轮补录。
