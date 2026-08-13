# 评估报告:superpowers / agent-skills 与标准开发流程的关系

> 结论先行:**不能取代,但值得分层吸收。** 三者不在同一个抽象层级上,不是同类竞品。
> 本文给出逐维度对比、结论论证、吸收清单(带优先级)与兼容风险,供后续决策使用。

- 评估日期:2026-08-13
- 评估对象:
  - [obra/superpowers](https://github.com/obra/superpowers)(Jesse Vincent, agentic skills framework + 软件开发方法论,MIT)
  - [jnMetaCode/superpowers-zh](https://github.com/jnMetaCode/superpowers-zh)(superpowers 中文增强版,MIT)
  - [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)(Addy Osmani, 生产级工程技能集,MIT)
- 对照基准:本仓库维护的 `vibecoding-orchestration` skill(及其 skill 家族)

---

## 1. 背景与目的

用户了解到 superpowers(原版 + 中文增强版)与 agent-skills 三个外部开源项目,想确认它们**能否取代本仓库的标准开发流程**(vibecoding-orchestration)。

本报告要回答的问题:

1. 三者是否同类?能不能"换掉"我们的流程?
2. 如果能吸收,分别吸收什么、吸收到哪里、优先级如何?
3. 兼容与风险是什么?

### 1.1 调研方式与证据分级

| 证据级别 | 来源 | 覆盖对象 |
|---|---|---|
| A(一手,本地源码通读) | 本仓库 vibecoding-orchestration/ 全部 SKILL.md / references / scripts / assets | 本地流程 |
| B(一手,官方 README 桌面调研) | 三个项目的 GitHub README 抓取 | 外部项目 |
| C(间接,README 转述) | star 数、维护活跃度等外部数据(可能与实况有出入) | 外部项目 |

> 局限说明:外部项目评估基于其 GitHub README 与页面公开信息,未实际安装实测;star 数等数字以调研当日抓取为准,仅供参考,不作为决策依据。

---

## 2. 执行摘要

**结论:superpowers / agent-skills 无法取代 vibecoding-orchestration,三者是不同抽象层级、定位互补的工具,应"骨架保持 + 战术分层吸收"。**

三条核心理由:

1. **抽象层级不同。** vibecoding-orchestration 是**项目级编排层**(管"一个项目/史诗怎么从需求走到交付"),superpowers 是**任务级方法论层**(管"一次编码任务怎么做好"),agent-skills 是**战术技能层**(管"某个工程活动怎么做得专业")。不存在替代关系,只有上下游互补关系。
2. **编排层能力是外部两者都没有的。** 契约冻结 + 跨模块约束、强制独立评审("产出的节点不能当自己的裁判")、心跳/watchdog/锁/三本账的可观测层——这些组织级管控能力是 agent-skills 与 superpowers 都不提供的。
3. **外部两者的强项恰好是本地流程的"空白战术点"。** 五轴代码审查、OWASP 安全加固、TDD 纪律、任务粒度拆分、verification 证据要求——值得按优先级吸收进本地流程的对应阶段。

---

## 3. 外部项目概述

### 3.1 obra/superpowers(原版)

**定位**:自述为 "An agentic skills framework & software development methodology that works."——一套**自动触发的强制工作流**,而非建议。核心工作方式:启动 agent 后先澄清问题 → 提炼规格分小段确认 → 设计获批后生成实现计划 → "go" 后启动 subagent-driven-development 派发子 agent 逐任务执行/检查/评审,可自主运行数小时。

**核心哲学**(Philosophy 章节):

- TDD(Test-Driven Development)— 先写测试,永远如此
- Systematic over ad-hoc(系统性优于即兴)
- Complexity reduction(简洁为第一目标)
- Evidence over claims(用证据说话,验证后才算成功)

**技能清单**(skills/,每个以 SKILL.md 组织):

| 分类 | 技能 | 要点 |
|---|---|---|
| Testing | `test-driven-development` | RED-GREEN-REFACTOR 循环,测试前的代码会被删除 |
| Debugging | `systematic-debugging` | 4 阶段根因定位,含 root-cause-tracing / defense-in-depth / condition-based-waiting |
| Debugging | `verification-before-completion` | 确保问题真正被修复 |
| Collaboration | `brainstorming` | 苏格拉底式设计打磨,分节展示设计供确认,保存设计文档 |
| Collaboration | `writing-plans` | 把工作拆成 2–5 分钟小任务,每任务有精确文件路径、完整代码、验证步骤 |
| Collaboration | `executing-plans` | 按批次执行计划,带人工检查点 |
| Collaboration | `subagent-driven-development` | 每任务派发全新子 agent,两阶段评审(先规格符合性,再代码质量) |
| Collaboration | `dispatching-parallel-agents` | 并发子 agent 工作流 |
| Collaboration | `requesting-code-review` / `receiving-code-review` | 评审前检查清单与回应反馈;关键问题阻塞进度 |
| Collaboration | `using-git-worktrees` | 设计获批后创建隔离工作区/新分支,验证干净测试基线 |
| Collaboration | `finishing-a-development-branch` | 完成后验证测试,提供 merge/PR/keep/discard 选项 |
| Meta | `writing-skills` / `using-superpowers` | 创建技能 / 系统入门 |

**环境**:按 harness 分别安装(Claude Code、Codex App/CLI、Cursor、Gemini CLI、OpenCode、Copilot 等十余种);**许可 MIT**。

### 3.2 jnMetaCode/superpowers-zh(中文增强版)

**定位**:**完整汉化 + 6 个中国原创 skills**,让 23 款 AI 编程工具"真正会干活"——不是单纯翻译,而是"方法论内核 + 工具链适配 + 本土化增强"的活跃维护项目(调研时 v1.7.10,持续对齐上游)。

**与原版差异**:

| 维度 | 原版 obra/superpowers | superpowers-zh |
|---|---|---|
| 技能规模 | 14 个 | 20 个(14 翻译 + 4 国产原创 + 2 上游历史保留) |
| 工具支持 | 6 款 | 23 款 |
| 本土化 | 英文 | 中文(技术术语保留英文)+ 国内 Git 平台(Gitee/Coding/极狐 GitLab/CNB)、国内 CI/CD、Conventional Commits 中文适配、中文排版 |
| 安装 | 按工具分命令 | `npx superpowers-zh` 一条命令自动识别工具 |
| 社区策略 | 一般不接受新 skill PR | 欢迎中国开发者痛点相关 PR |

**6 个中国特色 skills**:`chinese-code-review`(中文代码审查)、`chinese-git-workflow`(中文 Git 工作流)、`chinese-documentation`(中文技术文档)、`chinese-commit-conventions`(中文提交规范)、`mcp-builder`(MCP 服务器构建,自动)、`workflow-runner`(工作流执行器,自动)。前 4 个设计为**手动调用**,避免污染上游自动调度。

> 注意:superpowers-zh 是 superpowers 的汉化增强版,**不是** vibecoding-orchestration 的替代品;两者同样不冲突。

### 3.3 addyosmani/agent-skills

**定位**:24 个(23 生命周期 + 1 meta)"生产级工程技能",把资深工程师的工作流、质量门禁与最佳实践编码为结构化技能,让 agent 在每个开发阶段一致遵守。核心理念:

- **Process, not prose**(过程而非散文)— 技能是可执行工作流(步骤/检查点/退出标准),不是参考文档
- **Anti-rationalization**(反合理化)— 每个技能含"常见借口与反驳"表格,防止 agent 跳过步骤
- **Verification is non-negotiable**(验证不可妥协)— 每个技能以证据要求结尾(测试通过/构建输出/运行时数据),"seems right" 永远不够
- **Progressive disclosure**(渐进式披露)— SKILL.md 是入口,支持性参考按需加载,省 token
- 融入 Google 工程文化(SWE at Google、Hyrum's Law、Beyonce Rule、测试金字塔、Chesterton's Fence、主干开发)

**8 个斜杠命令入口 + 技能清单**:

| 阶段 | 命令 | 关键原则 | 代表技能 |
|---|---|---|---|
| Define | `/spec` | Spec before code | `interview-me`、`idea-refine`、`spec-driven-development` |
| Plan | `/plan` | Small, atomic tasks | `planning-and-task-breakdown` |
| Build | `/build` | One slice at a time | `incremental-implementation`、`test-driven-development`、`context-engineering`、`source-driven-development`、`doubt-driven-development`、`frontend-ui-engineering`、`api-and-interface-design` |
| Test | `/test` | Tests are proof | `browser-testing-with-devtools`、`debugging-and-error-recovery` |
| Review | `/review` | Improve code health | `code-review-and-quality`(五轴审查)、`code-simplification`、`security-and-hardening`、`performance-optimization` |
| 性能审计 | `/webperf` | Measure before you optimize | `performance-optimization` |
| 简化 | `/code-simplify` | Clarity over cleverness | `code-simplification` |
| Ship | `/ship` | Faster is safer | `git-workflow-and-versioning`、`ci-cd-and-automation`、`deprecation-and-migration`、`documentation-and-adrs`、`observability-and-instrumentation`、`shipping-and-launch` |

**辅助专家 persona(4 个)**:`code-reviewer`(Staff Engineer 视角五轴审查)、`test-engineer`(测试策略与覆盖)、`security-auditor`(漏洞检测与威胁建模)、`web-performance-auditor`(Core Web Vitals 审计)。

**结构**:`skills/`(24 个)+ `agents/`(4 persona)+ `references/`(7 个共享检查清单:definition-of-done、testing-patterns、security-checklist 等)+ `hooks/` + 各 harness 插件目录。**许可 MIT**("use these skills in your projects, teams, and tools")。

---

## 4. 本地标准开发流程概述

### 4.1 vibecoding-orchestration 核心架构

- **完整流程**:需求锚定 → G0 → 产品需求(PRD) → G1 → 架构设计(HLD) → G2 → 模块拆解(scope) → G3 → 详细设计(LLD) → G4 契约冻结 → 开发实现 → CI/G5 → 集成交付(`SKILL.md:23,43`)
- **门禁总表 G0-G5**(`SKILL.md:107-114`、`references/gates.md`):G0 需求评审(人类判定) → G1 产品需求评审(人类 PO+总控,覆盖全部 REQ) → G2 架构评审(人类架构师 + **必须 spawn 架构评审员**) → G3 范围对照(总控可脚本化,check-flow.ps1) → G4 契约冻结(总控+独立评审+人类签字,打 tag `vX-contracts-frozen`) → G5 集成/QA(**必须 spawn QA 评审员**,独立于开发)
- **核心原则**(`SKILL.md:25-32`):需求先蒸馏;主管层串行、执行层必须起子 agent;文件即真相;产出的节点不能当自己的裁判;契约冻结后走版本升级;每里程碑/史诗独立跑完整流程
- **强制子 agent 规则**(`SKILL.md:63-88`):G2 架构评审员、详细设计每模块 1 个模块设计员、开发实现每模块 1 个模块开发员、G5 QA 评审员——均必须由子 agent 执行,主会话不得代劳;文件式任务书 + current.md 兜底、心跳/watchdog/锁/账本监控、禁止递归 spawn、失败重试 ≤2 次
- **红线规则**(`SKILL.md:132-142`):未过 G0 不进产品需求;G4 后禁止原地改契约;每步完成 = 落盘 + tag + STATE 三件事同时发生;单史诗模块数 3-8(超 8 再切);任何 agent 不得评审自己;交接只传"文件路径 + 一页摘要"
- **Git 分支规范**(`references/git-flow.md`):main=冻结基线;各阶段独立分支;契约冻结打 tag;main 只收 MR
- **切分规范**(`references/splitting.md`):产品 → 史诗 → 模块(3-8) → 里程碑;委托度 full/review 两档
- **快速模式**(`references/quick-mode.md`):小改动(<200 行、不跨模块、不碰契约)不跑完整 G0-G5,但独立评审不可免

### 4.2 可观测层(外部项目没有的部分)

- `scripts/`:check-flow(流程健康检查/门禁形式检查)、analyze-flow(复盘,调度账+执行账)、watchdog(后台卡死检测 3/8/15 判卡死)、update-heartbeat(心跳)、record-event(调度账)、acquire/release-launch-lock(跨项目启动锁)、long-cmd(长命令包装)、run-tests-parallel(分片并行回归)、consolidate-docs(存量文档整合)
- 三本账:**调度账**(orchestration.jsonl)+ **执行账**(心跳/事件)+ **事实账**(产物落盘),支撑复盘与卡死取证
- PowerShell 与 Node(.mjs)双实现,CI 三平台冒烟保证语义一致

### 4.3 skill 家族

本仓库并非单 skill,而是**流程 + 协作 skill 家族**:

- `vibecoding-orchestration`:流程编排(本文基准)
- `analyze-idea`:上游前置阶段(想法可行性评估,通过后再衔接本流程)
- `ui-design-intelligence`:UI 设计基线(design-genome/DNA),被 LLD/开发/G5 显式挂载
- `pil-diagram`:PIL 手绘架构图/流程图

---

## 5. 逐维度对比表

| 维度 | vibecoding-orchestration(本地) | obra/superpowers(原版) | addyosmani/agent-skills |
|---|---|---|---|
| 抽象层级 | **项目级流程编排(组织管控层)** | 任务级方法论(个人工作流层) | 战术技能库(工程技能层) |
| 管控对象 | 一个项目/史诗从需求到交付的完整生命周期 | 一次编码任务(从澄清到合并) | 单个工程活动(写码/测试/审查/加固…) |
| 流程覆盖 | 需求→PRD→HLD→scope→LLD→契约→开发→QA→集成(8 阶段) | 澄清→设计→计划→开发→评审→收尾(轻量链条) | define→plan→build→test→review→ship(按命令即插即用) |
| 门禁机制 | **G0-G5 六道门禁 + 契约冻结 tag + 人类签字** | 人工检查点 + merge 前 review(无冻结概念) | quality gates 融入各技能,无跨阶段门禁体系 |
| 多 agent 编排 | **强制 spawn 角色子 agent**(架构评审/模块设计/模块开发/QA),禁止自评 | 可选 subagent-driven-development(每任务新子 agent) | 4 个专家 persona,以单 agent 流程为主 |
| 可观测性 | **心跳/watchdog/调度账/执行账/事实账/锁** | 无 | 无 |
| 产物体系 | 全套:需求锚定/PRD/HLD/scope/LLD/契约注册表/STATE/追踪矩阵/INDEX | 设计文档 + 计划文档(轻量) | spec/plan(轻量) |
| Git 策略 | 分阶段分支 + 契约冻结 tag + main 只收 MR | git worktree + 特性分支 + 完成分支清理 | 主干开发 + 原子提交 + 提交即保存点 |
| 环境适配 | 双实现脚本(PS/Node)+ 三平台 CI + 多 harness 适配层(adapters/) | 按 harness 分装插件 | 70+ 工具 via `npx skills`,多 harness 插件目录 |
| 语言本土化 | 全中文,面向国内团队 | 英文(zh 版汉化 + 4 国产 skill) | 英文 |
| 许可 | MIT | MIT | MIT |
| 自动触发 | 流程由总控按门禁推进 | **技能自动触发,强制工作流** | 命令入口触发(斜杠命令) |

---

## 6. "能否取代"结论分析

### 6.1 为什么不能取代(三条核心理由)

**理由一:抽象层级不同,不存在替代关系。**

- vibecoding-orchestration 回答的是"**项目怎么编排**":切史诗、拆模块、排门禁、管契约、保证多 agent 协作不失控。
- superpowers 回答的是"**一次任务怎么做好**":澄清需求、写计划、派发子 agent、TDD、评审、收尾分支。
- agent-skills 回答的是"**某个工程活动怎么做专业**":代码审查该看哪五轴、安全该查什么、测试怎么写才算证明。

把 superpowers 或 agent-skills 装进项目,它们**无法回答"这个史诗该拆成哪几个模块、什么时候该冻结契约"**——这正是标准开发流程的核心职责。

**理由二:编排层能力是外部两者都没有的。**

| 本地独有能力 | 外部项目对应情况 |
|---|---|
| G4 契约冻结 + tag + 冻结后禁止原地改、走版本升级 | 无。superpowers/agent-skills 只有"merge 前 review",无跨模块约束概念 |
| 强制独立评审("产出的节点不能当自己的裁判") | superpowers 的 review 是同一会话内流程;agent-skills 是 persona 换视角,都不是"物理上独立的 agent 评审产出节点" |
| 心跳/watchdog/锁/三本账 可观测层 | 两者均无。它们面向单任务会话,不需要"自主跑数小时的多 agent 项目"的兜底机制 |
| 文件式任务书 + 交接协议 + 文档治理(INDEX/摘要/归档) | superpowers 面向单次任务收尾;无长期文档治理 |
| 史诗→模块→里程碑切分、G3 范围对照可脚本化 | 无 |

**理由三:外部两者的强项恰是本地流程的"空白战术点",吸收而非取代。**

本地流程强在"编排骨架",但对"一次代码审查具体看什么、一次安全加固查什么"只有角色提示词与门禁检查表,粒度不如 agent-skills 的专业检查清单;对"任务怎么拆到 2-5 分钟、调试怎么做根因分析",粒度不如 superpowers 的方法论细节。**这些空白正是吸收空间(见第 7 节)。**

### 6.2 定位互补论证

三者是**上下游关系**,可以同时存在:

```
需求蒸馏(analyze-idea,本地)
  → 项目编排(vibecoding-orchestration,本地,G0-G5 骨架)
      → 战术执行吸收:
          · 写码纪律 ← superpowers TDD / writing-plans
          · 审查 ← agent-skills 五轴审查 / superpowers 两阶段评审
          · 安全 ← agent-skills security-and-hardening
          · 调试 ← superpowers systematic-debugging
```

### 6.3 什么情况下"可以部分取代"

- 若只是**单人、小项目、单次任务**,superpowers 或 agent-skills 完全可以独立工作,不需要完整 G0-G5——但本地流程已有 `quick-mode` 覆盖该场景,谈不上"取代"。
- 若团队只想要"审查/安全/测试纪律"这些战术能力,可以**只吸收对应技能,不引入外部整套流程**(见第 7 节落地方式)。

---

## 7. 值得吸收清单(带优先级)

> 落地原则:只吸收**战术细节**,不引入外部**编排骨架**;所有吸收以"不破坏本地红线规则"为前提。

### 7.1 从 superpowers 吸收(任务粒度与纪律)

| 吸收项 | 来源技能 | 吸收到本地哪里 | 优先级 |
|---|---|---|---|
| 任务拆到 2-5 分钟 + 精确文件路径 + 完整代码 + 验证步骤 | `writing-plans` | 强化 `assets/templates/06-task.md` 任务书模板(任务粒度要求) | **P1** |
| 两阶段评审:先规格符合性、再代码质量 | `subagent-driven-development` | 细化 G5 QA 评审流程(`references/gates.md`) | **P1** |
| TDD 强制执行(RED-GREEN-REFACTOR) | `test-driven-development` | 开发实现阶段默认纪律,写入开发负责人角色提示词 | **P1** |
| 4 阶段根因定位 + 修复后验证 | `systematic-debugging` + `verification-before-completion` | 开发期调试纪律 + G5 验收补充 | P2 |
| 苏格拉底式澄清、分节确认 | `brainstorming` | G0 需求蒸馏与需求锚定模板的追问方式 | P2 |

### 7.2 从 agent-skills 吸收(战术检查清单)

| 吸收项 | 来源技能 | 吸收到本地哪里 | 优先级 |
|---|---|---|---|
| 五轴代码审查框架 + 严重级别标签(Nit/Optional/FYI) | `code-review-and-quality` | G5 评审检查表 + QA 评审员角色提示词 | **P1** |
| OWASP Top 10 / 认证模式 / 密钥管理 / 三层边界 | `security-and-hardening` | G5 新增安全 lane(`references/gates.md` 已有视觉验收 lane,可类比扩展) | **P1** |
| "Verification 证据要求"(测试通过/构建输出,seems-right 不够) | 全项目理念(Definition of Done) | 强化"文件即真相"的验收落盘标准 | **P1** |
| anti-rationalization 表(常见借口与反驳) | 各技能内建结构 | 融入门禁检查表,防 agent 跳过步骤 | P2 |
| 4 个专家 persona(code-reviewer/test-engineer/security-auditor/web-performance-auditor) | `agents/` | 直接对应本地已有角色,可作角色提示词素材 | P2 |
| definition-of-done.md / security-checklist.md 等共享检查清单 | `references/` | 本地 `assets/templates/` 增补检查清单 | P3 |

### 7.3 优先级说明

- **P1**:直接补上本地流程的战术空白,收益明确、风险低,建议优先吸收。
- **P2**:提升质量深度,需适配本地角色/模板结构,中等工作量。
- **P3**:锦上添花,视维护成本决定。

---

## 8. 兼容风险与注意事项

1. **superpowers 自动触发 = 抢控制权风险(最高优先级注意)。**
   superpowers 的技能是**自动触发的强制工作流**(进入编码会话先问"你想解决什么问题"),与本地流程"总控按门禁推进"是两套指挥权。直接全量安装会在同一会话里出现两套流程争着管"先计划后执行"。→ 建议:**选择性安装 / 手动触发**相关技能,或划定触发边界(如只在开发实现阶段用 TDD 技能、只在 G5 用审查技能),不要让 superpowers 的 bootstrap 接管会话开头。

2. **产物重叠需映射。**
   agent-skills 的 `/spec` `/plan` 产物与本地 PRD/scope 重叠,superpowers 的 writing-plans 与本地 task.md 重叠。→ 吸收时做**内容映射**,不重复造产物;本地产物体系(契约注册表/追踪矩阵/STATE)是权威,外部模板只是内容来源。

3. **ZCode/Codex 生态安装可行性。**
   - agent-skills:Codex CLI v0.122+ 支持 `codex plugin marketplace add addyosmani/agent-skills`;本地是 Codex 系(ZCode),可直接按插件安装,也可手工取 skills/ 内容。
   - superpowers:支持 Codex App/CLI(官方插件市场),zh 版 `npx superpowers-zh --tool <name>`。
   - 但注意:ZCode 的 skill 体系以本仓库全局安装的 skill 为准,**不建议在 ZCode 里装整套外部插件**,避免技能优先级/触发冲突;优先以"手动调用式"或"内容吸收式"落地。

4. **触发边界设计(建议规则)。**
   - 本地总控/门禁/红线的执行权不交给外部技能;
   - 外部技能只作**阶段内战术工具**:TDD 纪律限于开发实现、五轴审查限于 G5、anti-rationalization 限于门禁检查;
   - 任何外部技能产物进入本地流程前,必须落盘为本地模板格式(文件即真相)。

5. **MIT 许可合规。**
   三个项目均 MIT,可自由吸收;但引用时**保留出处与版权声明**,若复制检查清单/模板内容,在对应文件头注明来源项目与链接。

6. **中文语境差异。**
   agent-skills 与 superpowers 原版为英文;superpowers-zh 虽有汉化,但其"中文提交规范/中文文档"类技能与本地已有文档治理(`references/document-governance.md`)可能有重复,吸收时按本地规范为准。

7. **维护成本与双实现。**
   外部项目快速迭代(superpowers-zh v1.7.10 仍在对齐上游),吸收的内容若直接复制会随上游漂移。→ 建议吸收时**改写成本地风格的流程细则/检查表**,而不是拷贝外部 SKILL.md 原文,保持本地仓库单一事实源。

---

## 9. 后续路径建议(供决策,不在本报告范围内执行)

| 路径 | 内容 | 建议时机 |
|---|---|---|
| A. 登记优化 backlog | 将第 7 节 P1 项登记进 `references/optimization-backlog.md`(该文件已有 A/B/C/E 已实施记录机制),作为流程演进的候选项 | 可立即做 |
| B. 制定吸收方案 | 对 P1 项逐一制定"改源 → 重装全局 skill"实施方案(五轴审查入 G5、TDD 入开发角色、writing-plans 粒度入任务书模板) | 决策后做 |
| C. 实测对比 | 在 Codex/ZCode 中临时安装 superpowers 或 agent-skills,挑一个小任务实测一轮(含触发冲突观察),拿到亲身体验后再定吸收范围 | 可选,增强决策证据 |
| D. 维持现状 | 仅保留本报告作为评估基线,暂不吸收 | 若资源有限 |

**推荐顺序**:A(立即登记)→ C(若想验证)→ B(按实测结果定 P1 吸收范围)。本报告本身即"是否取代"的结论存档,后续吸收决策以此为基线。

---

## 参考与证据来源

- 本地源码:本仓库 `vibecoding-orchestration/`(SKILL.md、references/gates.md、references/git-flow.md、references/splitting.md、references/quick-mode.md、references/document-governance.md、references/optimization-backlog.md、scripts/、assets/templates/)、`analyze-idea/`、`ui-design-intelligence/`、`pil-diagram/`、`adapters/`
- 外部项目(GitHub README,调研日 2026-08-13):
  - https://github.com/obra/superpowers
  - https://github.com/jnMetaCode/superpowers-zh
  - https://github.com/addyosmani/agent-skills
- 许可:三个外部项目与本地仓库均为 MIT
