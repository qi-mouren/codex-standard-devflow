# Git 分支规范（git-flow.md）

## 映射关系

main = 冻结基线；branch = 工作区；MR = 门禁；tag = 里程碑。

## 分支/合入表

| 阶段 | 分支 | 合入条件 |
|---|---|---|
| 需求锚定 | docs/requirements 直接在 main | G0 通过 |
| 产品需求 | docs/prd | G1 通过 |
| 架构设计 | docs/hld | G2 通过 |
| 模块拆解 | docs/scope | G3 通过 |
| 详细设计/契约 | lld/module-* + contracts/ | G4 通过 → tag vX-contracts-frozen |
| 开发实现 | feat/module-*（从冻结 tag 切出） | CI 绿 + G5 通过 |
| 缺陷修复 | fix/*（从冻结 tag 切出） | CI 绿 + 评审 |
| 集成交付 | release/* | G5 通过 |

## 纪律

1. main 只接受 MR，禁止直接 push（branch protection 强制）。
2. 契约冻结 = 打 tag：vX-contracts-frozen。tag 之后契约目录禁止原地改，变更升版本号。
3. 每个 agent 在独立分支干活，交接物 = 一个 MR + 一页摘要。
4. 流程回路对应 Git 操作：G2 驳回 = MR 不合并/关闭；需求变更 = 从冻结 tag 拉新分支。
5. CI 在每次 MR 上跑：G3 追踪脚本、G4 契约冲突校验、G5 前后单测/契约测试/集成测试。

## 项目目录结构

```
docs/
  00-requirements/   需求锚点
  01-prd/            产品需求（PRD）
  02-hld/            架构设计（HLD）
  03-scope/          模块拆解清单
  04-lld/            模块详细设计
  process/
    STATE.md         当前进度
    traceability.md  追踪矩阵
    epic-inputs.md   全委托时的输入文档
contracts/
  contracts-registry.md   契约注册表
src/                 实现代码（按模块）
scripts/
  check-flow.ps1     流程健康检查
```

## CI 校验

每次 MR 至少运行：
- check-flow.ps1（目录结构 + 产物齐全）
- 追踪矩阵完整性检查
- 编译 + 单测 + 契约测试
- 集成回归（G5 阶段）