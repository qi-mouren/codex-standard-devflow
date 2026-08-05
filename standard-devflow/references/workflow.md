# 完整流程（workflow.md）

## 阶段与数据流

严格顺序：需求锚定 → G0 → 产品需求 → G1 → 架构设计 → G2 → 模块拆解 → G3 → 详细设计 → G4 契约冻结 → 开发实现 → CI/G5 → 集成交付

```
需求会话需求讨论 → 需求锚定 → 需求锚点 v1 → G0
产品需求 产出 PRD → G1 → 架构设计 产出 HLD → G2
模块拆解 产出 模块清单与边界 → G3 → 详细设计 产出 LLD + 契约注册表 → G4 冻结
开发实现 并行实现 → CI（编译+单测+契约测试）→ G5 → 集成交付
```

## 各阶段输入输出

| 阶段 | 输入 | 输出 | 落盘位置 |
|---|---|---|---|
| 需求负责人 | 需求会话讨论记录 | 需求锚定文档（REQ 清单） | docs/00-requirements/ |
| 产品需求 | 需求锚点 | PRD | docs/01-prd/ |
| 架构设计 | PRD | HLD（含风险清单） | docs/02-hld/ |
| 模块拆解 | HLD | 模块清单与边界 | docs/03-scope/ |
| 详细设计 | 模块清单 + HLD | LLD + 契约注册表（冻结） | docs/04-lld/ + contracts/ |
| 开发实现 | 冻结契约 | 模块实现 | src/（按模块） |
| 集成交付 | 全部模块 | 可交付史诗增量 | main 分支 + tag |

## 回路规则（遇到问题怎么回退）

1. G1 发现需求冲突 → 回到需求锚定修订锚点，版本 +1。
2. G2 发现技术不可行 → 回到产品需求重写 PRD 方案部分。
3. G3 发现遗漏/越界 → 回到模块拆解修订范围。
4. G4 发现接口冲突 → 回到详细设计仲裁修订，禁止 模块设计员 自行改契约。
5. G5 发现缺陷 → 回到开发实现对应模块修复。
6. 契约冻结后的需求变更 → 走"变更请求"，升版本号，禁止原地改已冻结文档。

所有回退都走 Git：驳回 = MR 不合并/关闭；变更 = 从冻结 tag 拉新分支。

## 子 Agent 编排（文件式协议，最终方案）

以下工作必须由子 agent 执行，主会话（总控负责人）只做编排、门禁与 STATE 同步：

1. 串行轮次：默认每轮只 spawn 1 个子 agent，完成后 interrupt 回收再开下一个；确需并行时每批 ≤2~3 个且按剩余槽位。
2. 任务书唯一化：每轮把任务正文覆盖写入 docs/process/tasks/current.md（模板 assets/templates/06-task.md），不含 task_name；子 agent 一律读 current.md。
3. 兜底查找：README 与 STATE.md 写明"当前任务 = docs/process/tasks/current.md"；子 agent 找不到时先查 STATE.md/README，仍无则上报，禁止猜测。
4. 预审放行：总控 spawn 前预审 current.md（任务、输入、输出、完成标准、禁止项）完整可执行；子 agent 读取并引用"任务"段原文复述后直接开工，不等待总控确认（确认通道不可靠，等待会死锁）。
5. spawn 消息只写"读 docs/process/tasks/current.md 执行任务"（双保险）。
6. 心跳与超时：子 agent 每完成一个工具步骤或最多每 60 秒调用 scripts/update-heartbeat.ps1 -ProjectPath <项目> -LogFile docs/process/logs/runs/run-<N>.jsonl -Note "<正在做什么>"，写 .heartbeat 快照并追加执行账（note 必须写当前动作，总控据此区分长任务与卡死）；总控每轮检查：spawn 后 90 秒内应出现首条心跳，未见提前预警/准备重试；超过 3 分钟无心跳且无产出变更 = 卡死，interrupt + 重试 ≤2 次 + 上报；心跳在更新 = 合法长任务，不打断。
7. 生命周期与命名：task_name 只允许小写字母/数字/下划线（如 mod01_r1、mod02_20260805，连字符被校验拒绝）；同名残留换新名，禁止同名重 spawn；总控用 list_agents 核对，完成/卡死 agent 一律 interrupt 回收（官方 issue #13947：agent 完成/中断后不会自动释放槽位，不回收会泄漏）。
8. 禁止递归：任务书显式禁止 spawn 子 agent、禁止按总控角色行动；需要额外验证 agent 时上报总控创建。
9. 失败上限：spawn/投递失败最多重试 2 次，仍失败暂停上报用户，禁止主会话代做。
10. 数量 + 锁：spawn 前 list_agents 查存活数，再 acquire-launch-lock.ps1（锁内槽位校验，exit 2/3 重试 ≤2 次后上报）；投递完成后 release-launch-lock.ps1 -ProjectPath <项目> -TaskName <task_name> 释放。
11. 规范路径：spawn/消息目标用完整规范路径（如 /root/<task_name>），不用裸相对名。
12. 子 agent 产出后，主会话先做形式校验，再更新 STATE/追踪矩阵，最后推进门禁。
13. 交接物 = 文件路径 + 一页摘要，禁止传递全部历史上下文。
14. 新会话第一件事：读 docs/process/STATE.md，再跑 check-flow.ps1。
15. G5 独立补验：模块已实现、仅需验证的场景，QA 评审员上报总控，由总控用新 task_name 创建独立验证 agent 补跑，并纳入 QA 报告。
16. 环境约束说明：消息正文/确认通道经代理不可靠（encrypted_content 被丢弃、无可靠 task_name），本协议不依赖它们；这是当前环境的既定约束，不是可选项。
17. 工作目录（cwd）规则：子 agent 继承父会话 cwd；spawn 前确认当前会话 cwd = 项目根目录（Get-Location），否则子 agent 找不到任务书/产物；切换项目先开新会话再 spawn。
18. 运行监控（两本账）：总控每个调度动作用 record-event.ps1 追加 docs/process/logs/orchestration.jsonl（taskbook_write / lock_acquire / lock_release / spawn_start / spawn_success / spawn_fail / interrupt / gate / state_update / user_decision），必须带 -Run run-<N> 关联轮次；子 agent 心跳追加 docs/process/logs/runs/run-<N>.jsonl；复盘跑 analyze-flow.ps1 生成时间线与异常清单（如 spawn 后无首心跳、心跳间隔过大、spawn 后无 interrupt 槽位未回收）。日志策略：调度账随项目提交，runs/ 量大建议 gitignore（示例 assets/templates/gitignore-logs.example）。
## 状态持久化

| 内容 | 位置 | 维护者 |
|---|---|---|
| 流程规则 | AGENTS.md（薄）+ 本 skill | 全局 |
| 当前进度 | docs/process/STATE.md | 总控负责人 |
| 追踪矩阵 | docs/process/traceability.md | 总控负责人 |
| 契约注册表 | contracts/contracts-registry.md | 详细设计 |
| 冻结基线 | Git tag vX-contracts-frozen | 总控负责人 |

门禁通过 = 产物落盘 + tag + STATE 更新，三件事必须同时发生。
