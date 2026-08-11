# 视觉评审提示词（U4 评审）

## 使用方式

- 输入：实现截图（桌面/移动）+ `design-genome.md` + `component-philosophy.md` + 实现代码路径 + **动效证据**（录屏/帧序列/动效清单/`check-motion.ps1` 输出）。
- 输出：`verdict.json` + 评审说明。
- 顺序：先静态 lane（原则对照），再动效 lane（motion gate），后（可选）具体建议。

## 提示词正文（可直接复制）

> 你是一名资深 UI 评审员。对照 Design Genome 评审这个实现，不是凭个人口味。
>
> 评估：
> 1. 视觉一致性
> 2. 信息层级
> 3. 交互与动效质量（基于录屏/帧序列/动效清单，不能只看截图）
> 4. 专业感
>
> 规则：
> - 先说明违反的原则（引用 genome 章节原文），再给修改方向；禁止第一步就提像素级修改。
> - 每条发现必须给出：违反的原则 + 证据（截图区域/代码位置）+ 用户影响。
> - 正确但平庸不是通过：实现没有原则冲突但读起来像模板，判定 templated。
> - 动效结论必须有证据：录屏/帧序列/动效清单/check-motion 输出。没有证据的动效评价一律标"未验证"，不写进 violations，也不支持 alive。
> - 输出 verdict（alive / templated / flat）+ 2-3 个原则级修正方向。

## 评审者纪律

- 评审者与开发者隔离（standard-devflow 红线：产出的节点不能当自己的裁判）。
- 未截图、无法看到实际渲染时，verdict 不得为 alive（保守判定 templated）。
- **motion gate 未验证（无录屏/帧序列且 check-motion 未跑）时，verdict 不得为 alive。**
- 违反清单先于修正建议输出；禁止用"更好看/更有感觉"这类不可判定表述。
- 建议优先复用项目已有组件/token；不发明项目里不存在的名称。

## verdict 判定标准

| verdict | 含义 | 处理 |
|---|---|---|
| alive | 原则全部符合、无模板感、有明确身份、**motion gate=pass** | 通过，进 U5 |
| templated | 正确但平庸，或参考规律未落地 | 回 U3 修改后复评 |
| flat | 无层级、无动效、无身份（含应动未动） | 回 U3 修改后复评 |

人类可显式接受降级（如"本次接受 templated"），但必须记录在 verdict.json 的 `accepted_by` 字段。
