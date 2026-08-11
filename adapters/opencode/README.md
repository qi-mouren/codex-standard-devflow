# opencode 适配器（样板）

把本流程的「文件式执行协议」映射到 opencode 的最小可用样板。官方文档依据：opencode Agents / Config / Plugins（https://opencode.ai/docs/）。

状态：**实机验收通过（2026-08-12）**，见文末「验收记录」；验收清单见 `adapters/README.md`。

## 安装

项目级（推荐，随仓库提交）：

```powershell
# 1. 角色卡 + 可选心跳插件
Copy-Item -LiteralPath '.opencode' -Destination '<项目根>' -Recurse -Force

# 2. 心跳脚本（子 agent 显式心跳，跨平台）
Copy-Item -LiteralPath 'scripts\heartbeat.mjs' -Destination '<项目根>\docs\process\.opencode-heartbeat.mjs'

# 3. Node 套件（record-event / watchdog / check-flow / analyze-flow 依赖；推荐）
Copy-Item -LiteralPath 'vibecoding-orchestration\scripts\node' -Destination '<项目根>\scripts\node' -Recurse -Force

# 4. 配置示例 → 项目 opencode.json（与已有配置合并）
Copy-Item -LiteralPath 'opencode.json.example' -Destination '<项目根>\opencode.json'
```

全局（所有项目可用）：把 agents 放到 `~/.config/opencode/agents/`、plugins 放到 `~/.config/opencode/plugins/`，并把 `instructions` 指向你的流程文档副本。

## 角色卡

| 文件 | mode | 对应流程角色 |
|---|---|---|
| `devflow-controller.md` | primary | 总控负责人 |
| `devflow-module-designer.md` | subagent | 模块设计员 |
| `devflow-module-developer.md` | subagent | 模块开发员 |
| `devflow-architect-reviewer.md` | subagent | 架构评审员（G2，只读源码、可写评审报告） |
| `devflow-qa-reviewer.md` | subagent | QA 评审员（G5，只读源码、可写 QA 报告） |

## 六能力映射

| 能力 | opencode 机制 | 说明 |
|---|---|---|
| spawn | 总控用 `task` 工具：`subagent_type` 指定角色卡名，`description` 写「读 <任务书路径> 执行任务」 | description 即 spawn 消息；任务书路径是唯一强依赖 |
| message | task description / @提及 / 子会话 | 按文件式协议，任务正文以任务书为准，不依赖消息通道 |
| interrupt | TUI 子会话导航（`<Leader>+Down` 进入子会话，可结束）；headless 用 `opencode run` 一次一进程，结束即回收 | 无编程式 kill API 是主要差异；用 STATE Agent Registry 记录生命周期 |
| list | 无一等公民 API；TUI 有会话列表 | 以 STATE.md Agent Registry + 心跳文件为真相 |
| shell | `bash` 工具，子 agent 共享项目工作区，cwd = 项目根 | 与 Codex 一致，无需额外适配 |
| heartbeat | 插件 `tool.execute.after`（仅 primary 生效）+ 子 agent 显式执行 `heartbeat.mjs` | 见下方「心跳」小节 |

## 关键配置（opencode.json.example）

- `subagent_depth: 1`：总控可开子 agent，子 agent 禁止再开——原生对齐「禁止递归」红线。
- `default_agent: "devflow-controller"`：会话默认落在总控角色。
- controller 的 `permission.task` 白名单只有四个子角色。
- 子角色卡全部 `task: deny`；评审员卡 `edit` 只放行 `docs/process/reviews/**`（glob 映射，其余路径 deny）。
- `instructions` 指向流程文档；opencode 也会自动加载项目根 `AGENTS.md`。

## 心跳

**子 agent（可靠路径，必须）**：角色卡要求每个工具步骤后或最多每 60 秒执行：

```bash
node docs/process/.opencode-heartbeat.mjs "<当前动作>"
```

**并行轮（同一回合多个子 agent）必须用任务书里的覆盖参数，每 agent 独立心跳文件，禁止共用：**

```bash
node docs/process/.opencode-heartbeat.mjs --task-name <task> --heartbeat-file docs/process/tasks/.heartbeat-<task> --log-file docs/process/logs/runs/run-<N>.jsonl "<当前动作>"
```

脚本写心跳快照 + 追加执行账，跨平台（Windows/macOS/Linux 都有 Node）。可选配置文件 `docs/process/.devflow-heartbeat.json` 提供默认值（BOM 容错）；**CLI 参数优先于配置**，配置缺失时纯 CLI 模式可用。

**主会话（增强，可选）**：`devflow-heartbeat.js` 插件在 `tool.execute.after` 时自动写心跳。

**已知限制**：opencode 插件钩子不拦截子 agent（task 子会话）的工具调用（上游 issue #5894 未关闭），所以插件只能覆盖 primary；子 agent 心跳必须走显式命令。不要依赖插件判断子 agent 存活。

**流程库 Node 套件**：完整的跨平台脚本套件（check-flow / watchdog / record-event / lock / long-cmd / run-tests-parallel / analyze-flow / consolidate-docs）在 `vibecoding-orchestration/scripts/node/`，与 PS 版同文件语义，macOS/Linux 用户可直接使用（Node 20+，opencode 自带）。

## 快速开始（新项目）

1. 总控会话（devflow-controller / build）按流程产出需求锚点 → PRD → HLD → 拆解 → LLD。
2. G4 冻结契约后，写任务书 `docs/process/tasks/<task_name>.md` + `current.md` 镜像；心跳命令写进任务书（并行轮带 `--task-name/--heartbeat-file/--log-file`）。主会话插件的 `.devflow-heartbeat.json` 可选。
3. 在总控会话调用 `task` 工具：
   - `subagent_type`: `devflow-module-designer`（或对应角色）
   - `description`: `读 docs/process/tasks/<task_name>.md 执行任务；先引用"任务"段原文复述，再开工`
4. 通过心跳文件与产出观察子会话；完成后进入子会话确认并结束，更新 STATE 与 Agent Registry。
5. 评审轮：`@devflow-architect-reviewer` / `@devflow-qa-reviewer`，独立报告落盘后过门禁。

## 已知限制与绕法

| 限制 | 绕法 |
|---|---|
| 无编程式 interrupt/list API（TUI 为主） | 每批少量 agent + 文件账本记录状态；headless 场景可自建外层调度 |
| 插件钩子不拦截子 agent 工具调用 | 子 agent 心跳用显式 `heartbeat.mjs`，插件只做 primary 增强 |
| 子 agent 上下文 = description + 角色卡，不继承总控对话 | 与「零上下文继承 + 自包含任务书」一致，任务书必须完整 |
| 并行 task 调用 | 实测无产出冲突；心跳必须用 CLI 覆盖参数隔离（修复后 PASS） |

## 验收记录（2026-08-12）

环境：Windows + opencode CLI 1.18.16（npx headless，真实加载项目 `.opencode/agents` + `opencode.json`）、Python 3.12、Node 24。测试项目：`Temp\opencode\devflow-e2e\`。

| 验收项 | 结果 | 备注 |
|---|---|---|
| spawn 模块开发员 → 读任务书 → 复述 → 产出 | PASS | dev01 实现 src/calc + 测试 4/4 |
| 按 LLD+契约实现 → 测试通过 | PASS | dev02 5/5（含 CON-001 交叉校验）、dev03 4/4 |
| 心跳持续更新 | PASS（修复后） | 见问题 1/2 |
| 并行同角色、心跳不互踩、产出不冲突 | PASS（修复后） | strings+textutil 并行无冲突 |
| interrupt 回收可重开 | PASS | qa02 重跑闭环 |
| G2/G5 独立评审落盘 | PASS | qa01 真实 FAIL 驳回 → qa02 PASS |
| 复盘 | PASS | analyze-flow 时间线完整（补调度账后） |

实测发现并已修复的问题：

1. [P1] `heartbeat.mjs` 无 BOM 容错 → 已修复（读配置 `stripBom`），冒烟覆盖。
2. [P1] 并行心跳无隔离 → 已修复：新增 `--task-name/--heartbeat-file/--log-file` CLI 覆盖参数，任务书写入每 agent 独立心跳命令，冒烟覆盖。
3. [P2] 总控卡缺调度账纪律 → 已补：`record-event` 必记事件清单 + analyze-flow 复盘说明。
4. [P2] 评审员 `edit: deny` 与写报告矛盾 → 已改：`edit` 只放行 `docs/process/reviews/**`。
5. [P3] 契约注册表路径不一致 → 已统一为 `contracts/contracts-registry.md`（与 workflow/check-flow 一致）。

验证正确项：`subagent_depth` / `default_agent` / `permission.task` 白名单 / `instructions` 实测生效；插件只覆盖 primary（#5894）实测成立；插件与子 agent 心跳双通道并存于同一执行账；`check-flow.mjs` 12 项 OK。
