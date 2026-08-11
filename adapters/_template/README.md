# 适配器模板（_template）

复制本目录为 `adapters/<platform>/` 后填写。目标：让没看过 Codex 的人也能在你的平台上把同一套流程跑起来。

## 1. 平台信息

| 项 | 填写 |
|---|---|
| 平台名 | |
| 实测版本 | |
| agent 定义格式 | Markdown / JSON / 目录约定 |
| 子 agent 委派方式 | |
| 安装位置 | 项目级 / 全局 |

## 2. 六能力自评表

| 能力 | 平台原生机制 | 可靠吗 | 文件式兜底 |
|---|---|---|---|
| spawn | | | 任务书路径 + current.md 镜像 |
| message | | | 任务书为唯一真相 |
| interrupt | | | 每轮单 agent + STATE 登记 |
| list | | | STATE Agent Registry |
| shell | | | 共享工作区 |
| heartbeat | | | 显式心跳命令/脚本 |

## 3. 角色卡

按平台格式提供（以 `role-card.md.example` 起步），至少覆盖：

- 总控（primary）
- 模块设计员（subagent）
- 模块开发员（subagent）
- 架构评审员（subagent，只读）
- QA 评审员（subagent，只读）

每张卡必须包含：触发说明、任务书读取规则（找不到就上报，禁止猜测）、复述要求、心跳纪律、禁止递归、Scope Lock。

## 4. 心跳方案

- 平台钩子（tool.execute.after / session.idle 等）是否对子 agent 生效？必须实测说明。
- 若不生效，提供显式心跳脚本/命令，并在角色卡里写「每个工具步骤后或最多每 60 秒执行一次」。

## 5. 验收记录

- [ ] spawn 设计员 → 读任务书 → 复述 → 产出 LLD
- [ ] spawn 开发员 → 实现 → 本模块测试
- [ ] 心跳更新可观测（含长命令）
- [ ] 并行 2~3 个互不覆盖
- [ ] interrupt 可回收
- [ ] G2/G5 独立评审闭环

证据（日志/截图/命令输出）：
