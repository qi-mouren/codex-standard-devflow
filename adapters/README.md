# 多平台适配（adapters）

流程核心与平台无关：阶段、门禁、角色、红线在任何 agent 上都一样。真正有差异的只有一层——**子 agent 编排能力**。本目录把这一层抽成契约：

- 官方维护：Codex 原生实现（本 skill 核心 + `vibecoding-orchestration/references/environment-adaptation.md`）与一个 opencode 样板（`adapters/opencode/`）。
- 社区贡献：其余平台从 `adapters/_template/` 起步，按本文件验收后提交 PR。

## 六项能力契约

任何平台适配器必须回答这六项能力，并给出「平台原生机制 + 文件式兜底」：

| # | 能力 | 必须回答的问题 |
|---|---|---|
| 1 | spawn | 如何创建子 agent？是否支持指定角色、工具白名单、初始上下文？ |
| 2 | message | 如何向子 agent 投递任务？正文是否可靠？失败如何兜底？ |
| 3 | interrupt | 如何中断/回收子 agent？完成后槽位是否自动释放？ |
| 4 | list | 如何枚举存活 agent？能否拿到角色/任务/状态？ |
| 5 | shell | 子 agent 是否共享同一工作区？能否执行命令？cwd 语义是什么？ |
| 6 | heartbeat | 能否挂钩工具事件/API 流量自动心跳？还是只能靠 agent 主动上报？ |

## 通用结论（所有平台适用）

1. **文件即真相优先**：任务书（`docs/process/tasks/<task_name>.md` + `current.md` 镜像）、心跳文件、调度账/执行账照常落盘。平台原生能力只做增强，不做依赖。
2. **任务书必须自包含**：角色、任务、输入、输出、完成标准、禁止项、心跳命令，一个文件说清；子 agent 找不到就上报，禁止猜测。
3. **子 agent 禁止递归**：平台能力越强越要显式禁止（如 opencode 的 `subagent_depth: 1`）；需要额外验证时由总控创建。
4. **主会话只做编排与门禁**：LLD/开发/评审等模块级工作必须由子 agent 执行。
5. **记录要可复盘**：调度账 + 执行账 + 事实账；没有平台级监控就用文件账本，复盘脚本按平台语言移植。

## 适配器交付物

每个 `adapters/<platform>/` 必须包含：

1. `README.md`：安装方式 + 六能力映射表 + 与 Codex 的差异与绕法 + 已知限制。
2. 角色卡：用平台自己的 agent 定义格式覆盖：
   - 总控（primary）
   - 模块设计员（subagent）
   - 模块开发员（subagent）
   - 架构评审员（subagent，只读）
   - QA 评审员（subagent，只读）
3. 心跳方案：平台钩子（若对子 agent 生效）或显式心跳脚本/命令；角色卡必须写明心跳纪律。脚本层优先跨平台运行时（Node，macOS/Linux/Windows 通用），PowerShell 仅作为 Windows Codex 兼容层。
4. 验收记录：真实跑一轮的证据（首次提交可为「待验收」，合并前必须补）。

## 验收清单

适配器必须真实跑通以下闭环，验收记录随 PR 提交：

- [ ] spawn 模块设计员 → 读到任务书 → 复述任务 → 产出 LLD
- [ ] spawn 模块开发员 → 按 LLD + 契约实现 → 本模块测试通过
- [ ] 心跳：子 agent 工作时心跳文件/执行账持续更新；长命令有 LONG 心跳
- [ ] 并行：2~3 个同角色 agent 并行，心跳文件互不覆盖，产出不冲突
- [ ] interrupt：中断后可回收、可重开，不泄漏槽位
- [ ] 门禁闭环：G2 或 G5 独立评审（评审员 ≠ 产出者）报告落盘
- [ ] 复盘：基于日志能输出时间线与异常

## 官方维护矩阵

| 平台 | 状态 | 位置 |
|---|---|---|
| Codex | 官方原生 | 本 skill + `vibecoding-orchestration/references/environment-adaptation.md` |
| opencode | 官方样板（实机验收通过 2026-08-12） | `adapters/opencode/` |
| 其他 | 社区贡献 | `adapters/<platform>/`（从 `_template` 起步） |

## 社区贡献流程

1. 复制 `adapters/_template/` 为 `adapters/<platform>/`。
2. 填六能力映射表，写角色卡与心跳方案。
3. 在目标平台真实跑通验收清单，记录附在 PR。
4. 只允许新增/修改 `adapters/` 目录与根 README 的维护矩阵；核心流程文件不动。
