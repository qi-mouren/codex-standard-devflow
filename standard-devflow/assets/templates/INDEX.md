# 项目文档地图（INDEX.md）

> 由 `scripts/consolidate-docs.ps1` 生成/更新；新会话第一件事 = 读本文件 + STATE.md。

## 当前史诗

- 当前史诗：<EPIC-XX 名称>
- 当前阶段：<阶段 + 门禁状态>（详见 docs/process/STATE.md）

## 产物清单

| 阶段 | 产物 | 版本 | 状态 | 路径 |
|---|---|---|---|---|
| 需求 | 需求锚定 | vX | 冻结/进行中 | docs/00-requirements/... |
| PRD | 产品需求 | vX | 冻结/进行中 | docs/01-prd/... |
| HLD | 架构设计 | vX | 冻结/进行中 | docs/02-hld/... |
| 范围 | 模块清单 | vX | 冻结/进行中 | docs/03-scope/... |
| LLD | 详细设计 | vX | 冻结/进行中 | docs/04-lld/... |
| 契约 | 契约注册表 | vX | 冻结 | contracts/contracts-registry.md |

## 历史史诗（归档）

| 史诗 | 状态 | 一页总结 | 归档路径 |
|---|---|---|---|
| <EPIC-XX> | 已交付 | docs/archive/epic-XX/summary.md | docs/archive/epic-XX/ |

## 产品级汇总（用户视角）

- 产品需求总览：docs/product/PRODUCT-PRD.md
- 产品架构总览：docs/product/PRODUCT-HLD.md
- 里程碑与发布：docs/product/ROADMAP.md

## 检索建议

- 找接口：`rg "CON-" contracts/contracts-registry.md`
- 找验收口径：`rg "验收" docs/01-prd/`
- 找历史决策：`rg "<关键词>" docs/archive/ docs/process/`
