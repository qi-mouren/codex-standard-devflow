# 子 Agent 任务书（current.md）

- 角色：架构评审员 / 模块设计员 / 模块开发员 / QA 评审员
- 创建时间：yyyy-mm-dd
- 创建者：总控负责人
- 说明：本文件固定为 docs/process/tasks/current.md；子 agent 无需知道自己的 task_name，一律读本文件。

## 任务

（一句话任务说明）

## 输入

- <产物文件路径>

## 输出

- <产物文件路径>

## 完成标准

- [ ] 标准 1
- [ ] 标准 2

## 禁止

- spawn 任何子 agent；按总控角色行动（需要额外 agent 时上报总控）
- 猜测或自行推断任务（文件缺失/无法读取时立即上报）

## 开工方式

- 读取本文件 → 引用「任务」段原文复述 → 直接开工（不等待总控确认）
- 每完成一个工具步骤或最多每 60 秒运行 scripts/update-heartbeat.ps1 -ProjectPath <项目路径> -LogFile <下方"运行日志"指定的路径> -Note "<正在做什么>"
- 预计超过 60 秒的长命令开始前，先发一条 note 以 LONG: 开头的心跳（如 -Note "LONG: 运行全量测试"），命令结束后立即补发正常心跳

## 运行日志（本轮）

- 本轮日志文件：docs/process/logs/runs/run-<N>.jsonl
- 心跳命令：scripts/update-heartbeat.ps1 -ProjectPath <项目路径> -LogFile docs/process/logs/runs/run-<N>.jsonl -Note "<正在做什么>"
- 每完成一个工具步骤或最多每 60 秒运行一次；总控据此判断你是否在干活。
- 长命令（预计超过 60 秒）开始前先发 LONG: 心跳，结束后补发；总控对 LONG 心跳宽限 15 分钟。

## 预算（本轮，总控填写）

- 定位/实验轮次上限：<N> 轮（由总控按重试上限校验，超限立即停止上报）
- 单轮时长上限：<M> 分钟（watchdog 机械校验，超时自动写 agent_budget_exceeded 事件）
- 超预算：立即停止当前方案，把已定位证据落盘到 docs/process/logs/runs/run-<N>.evidence-*.json 并上报，禁止续试同一方案
- 临时沙箱目录前缀（供 watchdog 扫描 %TEMP%）：<模块名>-（如 mod07-）

## 上下文摘要（一页）

- ...
