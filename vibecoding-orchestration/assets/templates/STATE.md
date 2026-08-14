# 项目状态（STATE.md）

## 身份

- 产品：...
- 当前史诗：EPIC-xx
- 当前里程碑：Mx
- 流程模式：standard / quick

## 当前阶段

- 阶段：需求锚定 / 产品需求 / 架构设计 / 模块拆解 / 详细设计 / 开发实现 / 集成交付
- 进行中的门禁：Gx
- 下一步动作：...

## Agent Registry（活跃 agent，总控维护）

| task_name | 角色 | 任务书 | 心跳文件 | run | 状态 |
|---|---|---|---|---|---|
| mod01_r1 | 模块设计员 | docs/agent/tasks/mod01_r1.md | docs/agent/tasks/.heartbeat-mod01_r1 | run-9 | running |

## 门禁记录

```
gates:
  g0: { status: PASS, by: 人类, date: yyyy-mm-dd, note: ... }
  g1: { status: PENDING }
```

## 冻结决策表（禁止原地重设计；变更走变更请求升版本）

| 决策 | 版本 | 冻结日期 | 状态 | 依据/链接 |
|---|---|---|---|---|
| 技术选型 / 架构基线 / 契约 | v1 | yyyy-mm-dd | FROZEN | docs/user/02-hld/...、contracts/contracts-registry.md |

## 产物索引

| 产物 | 路径 | 版本 |
|---|---|---|
| 需求锚点 | docs/user/00-requirements/requirements-anchor.md | v1 |
| PRD | docs/user/01-prd/prd.md | v1 |
| ... | ... | ... |

## 阻塞项（指针式，详情在问题账）

- 未决问题见 `docs/agent/issues.md`：<ISS-xxx / 无>

## 变更记录

- ...
