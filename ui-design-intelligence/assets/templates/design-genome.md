# Design Genome

> 版本：v1 | 状态：草稿/已确认 | 生成方式：截图分析 / 降级起草（未经过截图分析）
> 来源样本：`ui_reference/`（N 张）+ 种子：<DESIGN.md 来源>

## Personality

Interface should feel:

- <形容词 1>
- <形容词 2>
- <形容词 3>

Avoid:

- <形容词>
- <形容词>

## Visual Language

Prefer:

- <原则，一句话可判定>

Avoid:

- <原则>

## Information Philosophy

- 主信息：<始终可见的内容>
- 次信息：<通过什么上下文揭示>
- 复杂度暴露方式：<渐进/分层/一步到位>

## Spatial Model

- 空间模型：<workspace / document page / canvas / …>
- 密度倾向：<compact / comfortable / spacious>
- 界面应像：<一个操作环境，而不是一个文档页…>

## Interaction & Motion Philosophy

Actions should feel:

- <可预测 / 可逆 / 平静…>

Motion (什么该动)：

- 进入：<如：菜单 fade+scale，编排顺序…>
- 退出：<如：快速淡出，不拖沓…>
- 状态过渡：<如：选中/悬停/展开/错误…>
- 流式/加载：<如：文本流式呈现、骨架屏…>
- 减少动态：<如：prefers-reduced-motion 下全部收敛为瞬时…>

Avoid (什么不能动)：

- <闪烁 / 无意义转场 / 无限装饰动画 / 进入用 ease-in…>

> 动效证据要求：以上内容若来自静态截图，标注 `motion: unobserved`，待录屏/帧序列确认。

## Component Philosophy

见 `component-philosophy.md`。原则：组件服务于任务完成，而不是吸引注意力。

## Anti-Patterns（禁用清单）

- <本项目禁止出现的具体倾向，如：大量独立卡片堆成 dashboard 感、默认蓝紫渐变、emoji 当图标>

## 元数据

- generated_by：<角色/模型>
- reviewed_by：<人>
- version：v1
- 变更记录：<v1 初始定稿>
