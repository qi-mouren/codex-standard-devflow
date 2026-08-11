# Component Philosophy

> 只写原则，不写参数（禁止 height:32px / border-radius:8px 这类实现值）。

## Button

### Purpose

Button 代表意图，不是装饰。

### Visual Role

主操作通过层级吸引注意，但不支配界面；次操作安静存在。

### Behavior

交互反馈应确认状态变化、保持用户焦点；禁用无意义弹跳。

### Motion

<该组件的动效哲学：进入/退出/状态过渡怎么动、动多久、什么不能动；如：按钮按下只做轻微 scale 反馈，不做弹跳>

### Variants

- Primary：重要的前进操作。
- Secondary：支持性操作。
- Danger：需要明确确认。

## <Component Name>

### Purpose

### Visual Role

### Behavior

### Variants

### Motion

<每个组件都应有 Motion 小节；不动的组件写 none>

## 组件清单

- <实现前确认此清单：Button / Input / Card / Modal / Nav / Empty State / Error State…>
