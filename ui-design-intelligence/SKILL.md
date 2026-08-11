---
name: ui-design-intelligence
description: >-
  让纯文本 LLM Agent 获得高质量 UI 设计能力的闭环流程。用多模态模型从参考 UI 提炼 Design Genome（原则层）
  与 Design DNA（token 层），把人类审美转成 Agent 可执行的抽象知识，注入代码 Agent 生成界面，再以
  "对照 genome 的原则级评审"形成修改闭环。当用户要求"生成有设计感的界面/去掉 AI 味"、需要为项目建立 UI
  设计基线（design-genome.md）、评审界面是否符合设计语言，或 standard-devflow 的详细设计/开发实现/G5
  涉及 UI 模块时使用。触发词：design genome、UI 设计基线、视觉评审、界面没设计感、按这个风格做。
---

# UI Design Intelligence（UI 设计智能）

## 定位

standard-devflow 的**领域挂载 skill**（与 analyze-idea、pil-diagram 同层，不改变流程本身）。当史诗含 UI/前端模块时，在三个位置挂载：

| standard-devflow 阶段 | 挂载动作 |
|---|---|
| 详细设计（LLD） | UI 模块任务书注明加载 `design-genome.md` + `component-philosophy.md`；LLD 写原则级设计约束，禁止写死像素值 |
| 开发实现 | UI 模块开发员先读 genome 再写代码；产出截图供评审 |
| G5 集成/QA | 增加视觉验收 lane：截图对照 genome 评审，verdict=alive 才算过；评审必须独立于开发 |

## 核心原则

1. **不要学结果，学产生结果的方法。** 原则层（genome）禁止 px/hex/CSS 代码；具体数值只允许进入 token 层（design-dna.json）。
2. **多模态模型 = 设计师与审稿人，文本 LLM = 工程师。** 多模态提炼审美规律，文本 Agent 负责实现。
3. **评审必须对照 genome，先给原则级意见，再谈具体修改。** 评审者不得评审自己的产出。
4. **样本要跨产品、有数量。** 不复制单一产品；提炼共同规律。
5. **静态验证形，动效验证势。** 截图只能证明"长什么样"；"怎么动"必须用录屏/帧序列或代码级检测证明。verdict=alive 必须动效 gate 通过。

## 产物

| 产物 | 内容 | 位置 |
|---|---|---|
| design-genome.md | 原则层：Personality / Visual Language / Information Philosophy / Spatial Model / Interaction Philosophy / Anti-Patterns | 项目 `.agent/knowledge/` |
| design-dna.json | token 层：色板/字体/间距/圆角/动效等具体值（实现约束） | 同上 |
| component-philosophy.md | 核心组件的 Purpose / Visual Role / Behavior / Variants | 同上 |
| verdict.json | 评审结论：alive / templated / flat + 违反条目 + 2-3 个修正方向 + **motion gate**（unverified / pass / fail） | 同上 |

## 工作流

```
U0 选种子 → U1 提炼 Genome → U2 组件哲学 → U3 注入代码 Agent → U4 视觉评审闭环 → U5 G5 验收
```

### U0 选种子与样本（15 分钟内）

- 从 `references/sources.md` 选来源：**首选 awesome-design-md 同品类 DESIGN.md 做种子**（73+ 品牌现成抽象结果，MIT）；真实截图用 Lazyweb/Refero 检索（10-30 张，跨产品）。
- 样本落 `ui_reference/<desktop_app|web_app|mobile>/`，附 `notes.md` 记录每张样本"为什么选它"。
- 完成标准：种子 + ≥10 张跨产品样本；单一产品样本占比 < 50%。

### U1 提炼 Design Genome

- 有视觉模型：按 `references/analysis-prompt.md` 让多模态模型逐张分析样本，收敛为原则 → 产出 `design-genome.md` + `design-dna.json`（字段见 `references/genome-schema.md`）。
- 样本含录屏/帧序列时，**必须**追加动效分析通道（`references/analysis-prompt.md` 第三遍提示词），把进入/退出/状态过渡/流式节奏收进 genome 的 Interaction & Motion Philosophy 与 token 层 motion 阶段表。
- 样本只有静态截图时，genome 的动效章节标注 `motion: unobserved`，禁止凭静态截图推断动效。
- 无视觉模型（显式降级）：以种子 DESIGN.md + taste-skill/前端准则为底稿起草 genome，**必须标注"未经过截图分析"**，交人类确认。
- 完成标准：genome 六个章节齐全、每条原则可判定、Anti-Patterns 非空；`scripts/check-genome.ps1` 通过。

### U2 生成 Component Philosophy

- 按 `assets/templates/component-philosophy.md` 为每个核心组件写 Purpose / Visual Role / Behavior / Variants；禁止直接写组件参数（如 height:32px）。
- 完成后 genome 定稿：版本 +1、冻结，UI 实现以此为准。

### U3 注入代码 Agent

- 任务书/系统提示必须包含："实现前先读 design-genome.md + component-philosophy.md；从原则推导 UI 决策，禁止盲抄固定值。"
- 实现层准则：shadcn/ui + Tailwind 用 `ui-styling` skill；设计系统 token 用 `design-system`；知识检索用 `ui-ux-pro-max`。
- 动效实现规则：用声明式 CSS（transition/animation）；只动 transform/opacity；时长取 token 层 motion 阶段表；进入用 ease-out；必须提供 `prefers-reduced-motion` 降级；禁止无限装饰动画。
- UI 完成后产出截图（桌面/移动至少各一张）到 `.agent/knowledge/screenshots/`。
- UI 含动效时，**尽量**产出录屏或关键帧序列到 `.agent/knowledge/motion/`，并写一份动效清单（每个动效：触发、阶段、时长、缓动、是否 reduce-motion 降级）。无法录屏时必须运行 `scripts/check-motion.ps1` 做代码级检测。

### U4 视觉评审闭环

- 评审输入：截图 + genome + 实现代码 + **动效证据**（录屏/帧序列/动效清单/check-motion 输出）。
- 评审分两条 lane：
  - **静态 lane**：截图 → 原则级对照（`references/reviewer-prompt.md`）→ 本地确定性审查（impeccable `audit`/`critique`，如有）→ 可选多模态外部评审。
  - **动效 lane**：代码级 `scripts/check-motion.ps1`（必跑，确定性）→ 有录屏/帧序列时用多模态模型评审动效（进入/退出/状态过渡/流式/反馈/减少动态）→ 汇总到 verdict 的 motion gate。
- 输出 `verdict.json`：alive（通过，含 motion gate=pass）/ templated（正确但平庸，违反 genome）/ flat（无层级无动效无身份）。
- 非 alive：给 2-3 个原则级修正方向 → 回 U3 修改 → 重新评审，闭环直至 alive 或人类显式接受降级。

### U5 G5 验收挂载

- 视觉验收作为 G5 的一条 lane：QA 评审员（或独立视觉评审）对照 genome 复核 verdict；与开发隔离。
- verdict=alive 且无原则冲突 → 视觉验收 PASS；否则 G5 驳回回开发修复。

## 参考文档

- 提取/评审 schema：`references/genome-schema.md`
- 多模态分析提示词：`references/analysis-prompt.md`
- 视觉评审提示词：`references/reviewer-prompt.md`
- 样本库与种子来源（含许可）：`references/sources.md`

## 产物模板

`assets/templates/` 下按需复制：

- `design-genome.md`：项目 UI 设计基线
- `component-philosophy.md`：组件哲学
- `verdict.json`：评审结论

## 脚本

- `scripts/check-genome.ps1`：校验 design-genome.md 章节完整性与禁用项（px/hex 泄漏警告）。
- `scripts/check-motion.ps1`：代码级动效检测——只动 transform/opacity、时长范围、进入 ease-out、reduce-motion 存在性、无限动画警告。

## 红线规则

1. genome 定稿前禁止 UI 实现；定稿后禁止原地改，变更走版本 +1。
2. 原则层禁止 px/hex/CSS；具体值只进 token 层（design-dna.json）。
3. 无多模态时必须显式降级并标注，禁止假装分析过截图。
4. 评审先讲原则违反，再谈修改；禁止第一步就抛像素级修改。
5. 评审者不得评审自己产出（含代码 Agent 自评）。
6. 样本必须跨产品，禁止单产品复制式提炼。
7. **静态评审不能证明动效通过。** 无动效证据（录屏/帧序列/check-motion 输出）时，motion gate=unverified，verdict 不得为 alive。
8. 本 skill 只做 UI 设计智能；流程门禁、任务书、状态管理一律走 standard-devflow。

## 来源与署名

- schema 改编自 [zanwei/design-dna](https://github.com/zanwei/design-dna)（MIT）
- 评审/反模板原则吸收 [pbakaus/impeccable](https://github.com/pbakaus/impeccable)（Apache-2.0）、[Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill)（MIT）、[vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines)（MIT）、Anthropic `frontend-design`（官方）
- 闭环编排思路参考 [davidgarciagordo/design-review](https://github.com/davidgarciagordo/design-review)（MIT）
- 种子 genome：VoltAgent/awesome-design-md（MIT）；样本库见 `references/sources.md`
