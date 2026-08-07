# 子 Agent 任务书（<task_name>.md）

- 角色：架构评审员 / 模块设计员 / 模块开发员 / QA 评审员
- 创建时间：yyyy-mm-dd
- 创建者：总控负责人
- 说明：本文件为 docs/process/tasks/<task_name>.md；总控会同步镜像 current.md 作兜底。优先读本文件，找不到再读 current.md，仍无则上报。

## 任务

（一句话任务说明）

## 输入

- <产物文件路径>

## 输出

- <产物文件路径>

## 完成标准

- [ ] 标准 1
- [ ] 标准 2
- [ ] 本模块单测 + 契约测试通过（全量回归由装配/G5 统一执行，dev 轮不要求全量）

## 禁止

- spawn 任何子 agent；按总控角色行动（需要额外 agent 时上报总控）
- 猜测或自行推断任务（文件缺失/无法读取时立即上报）

## 开工方式

- 读取本文件 → 引用「任务」段原文复述 → 直接开工（不等待总控确认）
- 每完成一个工具步骤或最多每 60 秒运行 scripts/update-heartbeat.ps1 -ProjectPath <项目路径> -LogFile <下方"运行日志"指定的路径> -Note "<正在做什么>"
- 预计超过 60 秒的命令必须用 scripts/long-cmd.ps1 包装（自动 LONG 心跳 + 可选超时）；如无法包装，则手动按 LONG 约定：开始前发 LONG: 心跳、每 ≤60 秒续发、结束后补发
- 使用约束：long-cmd 只包装**原生命令**（python / unittest / powershell -File 等）；禁止包装以纯 PS `exit N` 结尾的命令串（exit 会先于哨兵结束 Job，导致退出码丢失、输出截断）

## 运行日志（本轮）

- 本轮日志文件：docs/process/logs/runs/run-<N>.jsonl
- 心跳命令：scripts/update-heartbeat.ps1 -ProjectPath <项目路径> -LogFile docs/process/logs/runs/run-<N>.jsonl -HeartbeatFile docs/process/tasks/.heartbeat-<task_name> -Note "<正在做什么>"（并行轮次必带 -HeartbeatFile，串行轮次可省略）
- 每完成一个工具步骤或最多每 60 秒运行一次；总控据此判断你是否在干活。
- 长命令（预计超过 60 秒）：scripts/long-cmd.ps1 -ProjectPath <项目路径> -LogFile docs/process/logs/runs/run-<N>.jsonl -Command "<命令>" [-TimeoutSec <秒>]；总控对 LONG 心跳宽限 15 分钟。
- 同上使用约束：只包装原生命令；纯 PS `exit N` 结尾的命令串退出码不可靠，应去掉 exit 或改为调用原生命令。

## 预算（本轮，总控填写）

- 定位/实验轮次上限：<N> 轮（由总控按重试上限校验，超限立即停止上报）
- 单轮时长上限：<M> 分钟（watchdog 机械校验，超时自动写 agent_budget_exceeded 事件）
- 超预算：立即停止当前方案，把已定位证据落盘到 docs/process/logs/runs/run-<N>.evidence-*.json 并上报，禁止续试同一方案
- 临时沙箱目录前缀（供 watchdog 扫描 %TEMP%）：<模块名>-（如 mod07-）

## 关键接口速查（总控预填，以 LLD/契约为准）

| 接口 ID | 签名 / 说明 | 来源文件 |
| --- | --- | --- |
| CON-XX-XX | <签名> | <LLD 或契约注册表路径> |

> 摘要可能过期：与 LLD/契约不一致时以 LLD/契约为准并上报总控，禁止按摘要猜测。

## 上下文摘要（一页）

- ...
