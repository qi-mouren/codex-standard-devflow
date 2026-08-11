# 角色卡（来自社区 awesome-codex-subagents）

本目录收录从 [VoltAgent/awesome-codex-subagents](https://github.com/VoltAgent/awesome-codex-subagents)
（MIT License）挑选的角色卡原文，作为 vibecoding-orchestration 各角色提示词的参考素材。
提炼后的中文速查见 `references/role-cards.md`，质量纪律已融合进 `references/roles.md`。

## 收录清单

| 文件 | 上游原路径 | 对应流程角色 |
| --- | --- | --- |
| architect-reviewer.toml | categories/04-quality-security/architect-reviewer.toml | 架构评审员（G2） |
| reviewer.toml | categories/04-quality-security/reviewer.toml | 独立评审（正确性/安全/回归） |
| code-reviewer.toml | categories/04-quality-security/code-reviewer.toml | 独立评审（可维护性/设计质量） |
| qa-expert.toml | categories/04-quality-security/qa-expert.toml | QA 评审员（G5） |
| test-automator.toml | categories/04-quality-security/test-automator.toml | 模块开发员测试 / QA 补测 |
| multi-agent-coordinator.toml | categories/09-meta-orchestration/multi-agent-coordinator.toml | 总控负责人 |
| task-distributor.toml | categories/09-meta-orchestration/task-distributor.toml | 拆解负责人 / 任务分发 |
| product-manager.toml | categories/08-business-product/product-manager.toml | 产品需求负责人 |

## 使用注意

- 原卡中的 `model` / `model_reasoning_effort` / `sandbox_mode` 是上游针对
  OpenAI 官方模型的默认值；在 DeepSeek 等自定义 provider 下使用时应删除或
  改为本地模型配置。
- 本仓库只把原文作为提示词素材；流程执行仍以 `references/roles.md` 的提示词
  为准（含任务书 / 心跳 / 禁止递归等环境适配协议）。
- 许可：上游为 MIT License，完整文本见 `LICENSE-VoltAgent.txt`；吸收时保留来源署名。
