# 环境适配层（environment-adaptation.md）

> 本文件是**唯一允许因环境/平台问题增删改的流程文件**。
> 核心层（SKILL.md 的阶段/门禁/角色/红线，workflow.md 的阶段数据流）冻结；
> 平台修复后只摘除本文件与对应脚本，核心流程不动。

## 1. 已知平台约束（根因，勿再尝试消息制）

- 消息通道不可靠：spawn/followup 消息正文经 encrypted_content 被代理丢弃（正文与确认均送不到）；子 agent 上下文中无可靠 task_name。
- 生命周期缺陷：已完成/中断 agent 不自动释放槽位（openai/codex issue #13947）；同名重 spawn 报 agent path already exists；无删除工具。
- cwd 继承：子 agent 继承父会话 cwd；父会话切目录后 spawn 的 agent 找不到任务书/产物。
- 上下文继承反噬：fork_turns=all 时子 agent 继承总控全量对话上下文，消息丢失后会把"总控的延续"当角色（自行建任务书、做探针、递归 spawn）。
- 并发上限：同时活跃 agent 数受限（默认 4 含主控；32G 内存推荐 agents=6 共 7 线程，改后重启生效；总线程不要到 8）。
- 结论：协议一律**不依赖消息正文、不依赖 task_name、不依赖确认回执**。

## 2. 文件式执行协议（最终方案）

1. **串行轮次**：默认**每轮只 spawn 1 个子 agent**（单 agent 串行），完成后回收再开下一个。确需并行时每批 ≤2~3 个且按剩余槽位。串行是当前环境的可靠基线，并行只是可选加速。
2. **任务书唯一化**：任务书固定写入 `docs/process/tasks/current.md`（模板 `assets/templates/06-task.md`，每轮覆盖，不含 task_name）。子 agent **无需知道自己的名字**，一律读 current.md。
3. **兜底查找**：README 与 STATE.md 写明"当前任务 = docs/process/tasks/current.md"；子 agent 找不到 current.md 时先查 STATE.md/README，仍无则上报，**禁止猜测**。
4. **预审放行**：总控在 spawn 前**预审 current.md**（任务、输入、输出、完成标准、禁止项完整可执行）后才 spawn；子 agent 读取 current.md、引用"任务"段原文复述后**直接开工**，**不再等待总控确认**（确认通道不可靠，等待会死锁）。
5. **spawn 消息只写路径 + 零上下文继承**："读 docs/process/tasks/current.md 执行任务"（双保险；正文不可达时靠第 2/3 条兜底）；spawn 一律用 **fork_turns=none**，子 agent 不继承总控对话上下文，只依赖自包含的 current.md——消息丢失时干净空转（可被无心跳检测），不会模仿总控递归 spawn。任务书必须自包含（角色、任务、输入、输出、完成标准、禁止项、心跳命令、运行日志路径）。策略待实测验证；若连续 spawn 因零上下文无法执行，回退 fork_turns=all + 任务书显式禁止递归并记录。
6. **心跳与超时**：子 agent 每完成一个工具步骤或最多每 60 秒调用 `scripts/update-heartbeat.ps1 -ProjectPath <项目> -LogFile docs/process/logs/runs/run-<N>.jsonl -Note "<正在做什么>"`，同时更新心跳快照 `.heartbeat` 并追加执行账（**note 必须写当前动作**，总控据此判断是否真在干活，而不只是存活）。总控每次检查：**spawn 后 90 秒内应出现首条心跳**，未见即提前预警/准备重试（不必死等超时）；**超过 3 分钟无心跳且无产出变更 = 判定卡死**，interrupt 并重试（≤2 次）后上报；**"无产出"必须做全仓库最近变更扫描（按 LastWriteTime 递归全仓），不只查 src/tests/tasks 等固定目录**（实测 dev05_r7 的产出在 tools/ 被漏判）；心跳在更新 = 合法长任务，不得打断。
7. **生命周期与命名**：task_name 只允许小写字母/数字/下划线（源码校验，如 `mod01_r1`、`mod02_20260805`；**连字符会被拒绝**）；同名残留时换新名，**禁止同名重 spawn**；每轮结束必须 interrupt 回收，否则槽位永久泄漏；总控用 list_agents 核对后再进下一轮。
8. **禁止递归**：任务书显式写"禁止 spawn 子 agent、禁止按总控角色行动"；需要额外验证 agent 时上报总控，由总控创建。
9. **失败上限**：spawn/投递失败**最多重试 2 次**；仍失败必须暂停上报用户，**禁止主会话代做**该子 agent 的工作。
10. **数量 + 锁**：spawn 前先 list_agents 查存活 agent 数（含主控），再运行 `scripts/acquire-launch-lock.ps1 -ProjectPath <项目> -TaskName <task_name> -ActiveAgentCount <N> -MaxConcurrentThreads <M>`（默认 M=7）：exit 2=锁占用、exit 3=槽位不足，均重试 ≤2 次后上报，禁止强行 spawn；投递完成后 `scripts/release-launch-lock.ps1 -ProjectPath <项目> -TaskName <task_name>` 释放。
11. **规范路径**：spawn/消息目标一律用完整规范路径（如 `/root/<task_name>`），不使用裸相对名。
12. **并发容量**：并发槽位以环境为准（默认 4 含主控；32G 内存推荐 agents=6 共 7 线程；改后重启生效；总线程不要到 8）。
13. **工作目录（cwd）规则**：子 agent 继承父会话的当前工作目录；spawn 前必须确认当前会话 cwd = 项目根目录（`Get-Location`），否则子 agent 找不到任务书/产物。切换项目时先开新会话，再在新会话里 spawn。
14. **运行监控（两本账）**：总控每个调度动作必须用 `scripts/record-event.ps1 -ProjectPath <项目> -Event <事件> -Run <run-N> [-TaskName <task_name>] [-Detail "..."]` 追加 `docs/process/logs/orchestration.jsonl`；子 agent 心跳同时追加 `docs/process/logs/runs/run-<N>.jsonl`。

## 3. 运行监控（两本账）

- 调度账 `docs/process/logs/orchestration.jsonl`：事件 = taskbook_write / lock_acquire / lock_release / spawn_start / spawn_success / spawn_fail / interrupt / gate / state_update / user_decision；用 `scripts/record-event.ps1` 追加。
- 执行账 `docs/process/logs/runs/run-<N>.jsonl`：由子 agent 心跳追加（`update-heartbeat.ps1 -LogFile ...`）；`.heartbeat` 快照仅用于 check-flow 实时判定。
- 复盘：`scripts/analyze-flow.ps1 -ProjectPath <项目> [-OutFile <报告.md>]` 输出概览、时间线、每轮明细与异常（spawn 后无首心跳、心跳间隔过大、spawn 后无 interrupt）。
- 日志策略：调度账随项目提交；执行账 runs/ 量大建议按 `assets/templates/gitignore-logs.example` 忽略。

## 4. 适配层维护规则

1. 新环境问题先记入问题账（如 codex-proxy 的 docs/process/skill-issues.md），确认是平台缺陷而非流程缺陷。
2. 适配只允许改**本文件 + scripts/ + assets/templates/**；SKILL.md 核心流程/门禁/角色/红线不改。
3. 优先参数化（心跳间隔、超时阈值、并发数），禁止为单次事故新增协议条款或新脚本；扩展现有事件类型/脚本优先。
4. 平台修复后的摘除清单：
   - 消息通道可用 → 可回消息制（按 task_name 或消息正文投递），删第 2/3/4/5 条；
   - 生命周期可用 → 去掉 interrupt 硬回收与启动锁，删第 7/10/12 条；
   - 有可靠 task_name → 任务书可从 current.md 恢复按名匹配；
   - cwd 由平台固定到项目根 → 删第 13 条；
   - 摘除只改本文件与对应脚本，核心流程不动。

## 5. 总控每轮执行清单

- [ ] 确认 cwd = 项目根目录
- [ ] current.md 写入并预审 → record-event taskbook_write
- [ ] list_agents 查存活数 → acquire-launch-lock 抢锁
- [ ] spawn（fork_turns=none，消息只写路径）→ record-event spawn_start/spawn_success
- [ ] 90 秒内未见首条心跳 → 预警/准备重试
- [ ] 完成/卡死 → interrupt → record-event interrupt → release-launch-lock
- [ ] 每轮结束更新 STATE/追踪矩阵 → record-event state_update
