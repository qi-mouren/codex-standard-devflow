# 样本库与种子来源（含许可）

调研于 2026-08-10。使用前先核实许可与配额；所有来源仅作参考/提炼输入，不直接复制成品。

## 种子 genome（现成抽象结果）

| 来源 | 许可 | 内容 | 用法 |
|---|---|---|---|
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | MIT | 73+ 品牌 DESIGN.md（Stripe/Linear/Notion/Vercel/Apple/Airbnb…） | **首选种子**：选同品类 1-2 份做 genome 底稿 |
| [Refero Styles](https://styles.refero.design) | SaaS（社区 MCP 为 MIT） | 约 200 个精选站点的 DESIGN.md（token + rationale + avoid） | 按需查某产品风格 |
| [design-dna schema](https://github.com/zanwei/design-dna) | MIT | 提取模板（token/风格/特效三层） | 本 skill 的 genome-schema 改编来源 |

## 真实截图样本库

| 来源 | 许可 | 内容 | 用法 |
|---|---|---|---|
| [Lazyweb](https://github.com/aboul3ata/lazyweb-skill) | MIT（skill）；数据经托管 MCP，免费档有额度 | 25.7 万张真实产品截图，可搜 screen/flow/AB 实验；原生支持 Codex（`~/.codex/skills`） | 首选检索真实参考 |
| [referodesign/refero_skill](https://github.com/referodesign/refero_skill) | MIT | 15 万+ 真实 App 截图与流程（经 Refero MCP） | 真实产品参考 |
| [ScreenBench](https://huggingface.co/datasets/Leigest/ScreenCoder) | Apache-2.0 | 1000 组真实截图 + 清洗后 HTML | 小样本校验/离线样例 |
| [RICO](https://interactionmining.org/rico)（Google） | 研究用途许可 | 7.2 万张 Android 截图 + 视图层级 | 移动端批量分析（**不可商用**） |

## 批量/离线数据集

| 来源 | 许可 | 内容 | 用法 |
|---|---|---|---|
| [WebSight](https://huggingface.co/datasets/HuggingFaceM4/WebSight) | CC-BY-4.0 | 190 万张网页截图 + HTML（v0.2，AI 合成） | 离线批量取样池；合成站点不代表人类审美，需人工抽查 |
| [Aria-UI Data](https://huggingface.co/datasets/Aria-UI/Aria-UI_Data) | Apache-2.0 | 17.3 万张网页截图 + 标注 | 需要 UI grounding/批量标注时 |

## 设计系统索引

| 来源 | 许可 | 内容 | 用法 |
|---|---|---|---|
| [awesome-design-systems](https://github.com/alexpate/awesome-design-systems) | Unlicense | 73+ 品牌官方设计系统索引 | 按品牌找官方 token/组件文档 |

## 原则/审查准则（抽象结果，评审时接线）

| 来源 | 许可 | 内容 |
|---|---|---|
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | MIT | 反 slop 规则、anti-template 检查 |
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | MIT | 动效准则 + review-animations 门禁 |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | Apache-2.0 | critique/audit + 确定性反模式检测器 |
| [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) | MIT | MUST/SHOULD/NEVER 网页规范 |
| Anthropic `frontend-design`（官方 skills 仓库） | 官方条款 | 生成侧设计准则（token-plan + signature + 反默认三板斧） |
| `ui-ux-pro-max` / `ui-styling` / `design-system` | 本机已装 | 知识检索 / 实现层 / token 架构 |

## 使用规则

1. **选种**：优先同品类（desktop_app / web_app / mobile）种子 1-2 份 + 跨产品截图 10-30 张。
2. **许可红线**：RICO 不可商用；Lazyweb/Refero 数据可用性以账号计划与 MCP 响应为准；WebSight 需人工抽查质量。
3. **不直接复制**：样本只用于提炼规律；实现必须从原则推导，禁止截图直出代码。
4. **动效准则接线**：动效评审/设计以 [emilkowalski/skills](https://github.com/emilkowalski/skills)（MIT，emil-design-eng + review-animations）为准绳；代码级检测用本 skill 的 `scripts/check-motion.ps1`。
5. **动效证据采集**：录屏优先（无头浏览器 + DevTools Protocol / Playwright 录屏，或桌面录屏）；无录屏时至少保留动效清单 + `check-motion.ps1` 输出，并显式标注 motion gate=unverified。
6. **reduce-motion**：实现必须提供 `prefers-reduced-motion` 降级；评审时对照 W3C 减少动态规范检查。
7. **文本通道**：种子 DESIGN.md 与源码/CSS/DOM 都是文本证据，截图非必需；纯文本 Agent（如 DS-Flash）可全程跑通 U1-U4，多模态只影响感知复核精度（perceptual: pending）。
