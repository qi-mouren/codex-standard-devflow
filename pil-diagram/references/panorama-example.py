# -*- coding: utf-8 -*-
"""完整参考实现：从产品到落地切分全景图（与原图同款，可直接运行）

复刻方法：改标题/段落文字与 EPICS/MILESTONES 数据，坐标结构保持不变。
运行：python panorama-example.py
"""
from PIL import Image, ImageDraw, ImageFont
import math

S = 2
W, H = 1560 * S, 1320 * S
img = Image.new("RGB", (W, H), (250, 251, 253))
d = ImageDraw.Draw(img)

FONT_REG = r"C:\Windows\Fonts\msyh.ttc"
FONT_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"
_cache = {}


def fr(sz):
    k = ("r", sz)
    if k not in _cache:
        _cache[k] = ImageFont.truetype(FONT_REG, round(sz * S))
    return _cache[k]


def fb(sz):
    k = ("b", sz)
    if k not in _cache:
        _cache[k] = ImageFont.truetype(FONT_BOLD, round(sz * S))
    return _cache[k]


def rect(x, y, w, h, fill=None, outline=None, width=2, r=12):
    d.rounded_rectangle([x * S, y * S, (x + w) * S, (y + h) * S], radius=r * S,
                        fill=fill, outline=outline, width=max(1, round(width * S)))


def text(x, y, s, font, fill=(34, 48, 63), anchor="mm"):
    d.text((x * S, y * S), s, font=font, fill=fill, anchor=anchor)


def line(x1, y1, x2, y2, color=(91, 107, 123), width=1.5, dash=False):
    if not dash:
        d.line([x1 * S, y1 * S, x2 * S, y2 * S], fill=color,
               width=max(1, round(width * S)))
    else:
        seg, gap = 7 * S, 5 * S
        x, y = x1, y1
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        ux, uy = dx / L, dy / L
        t = 0.0
        while t < L:
            e = min(t + seg, L)
            d.line([(x + ux * t) * S, (y + uy * t) * S,
                    (x + ux * e) * S, (y + uy * e) * S],
                   fill=color, width=max(1, round(width * S)))
            t = e + gap


def arrow(x1, y1, x2, y2, color=(91, 107, 123), width=1.5):
    d.line([x1 * S, y1 * S, x2 * S, y2 * S], fill=color,
           width=max(1, round(width * S)))
    ang = math.atan2(y2 - y1, x2 - x1)
    L = 9 * S
    a1, a2 = ang + math.radians(150), ang - math.radians(150)
    p1 = (x2 * S + L * math.cos(a1), y2 * S + L * math.sin(a1))
    p2 = (x2 * S + L * math.cos(a2), y2 * S + L * math.sin(a2))
    d.polygon([(x2 * S, y2 * S), p1, p2], fill=color)


# ---- colors ----
INK = (34, 48, 63)
SUB = (102, 114, 127)
GRAY = (91, 107, 123)
PRODUCT = (45, 58, 79)
PSUB = (200, 210, 223)
RED = (231, 76, 60)
RED_F = (253, 236, 234)
BLUE = (74, 127, 181)
BLUE_F = (238, 244, 251)
BLUE2_F = (232, 240, 251)
GREEN = (46, 158, 91)
GREEN_F = (237, 248, 240)
GREEN_F2 = (240, 250, 242)
DGREEN = (46, 125, 91)
DGREEN_T = (220, 239, 228)
ORANGE = (230, 126, 34)
ORANGE_F = (253, 243, 231)
PURPLE = (91, 110, 225)
PURPLE_F = (238, 241, 251)
VIOLET = (142, 108, 192)
VIOLET_F = (244, 240, 250)
CARD_LN = (215, 222, 232)
WHITE = (255, 255, 255)

# ---- title ----
text(780, 46, "从产品到落地：切分全景图（产品 → 史诗 → 模块 → 里程碑）", fb(26), INK)
text(780, 74, "每个史诗独立跑一遍标准流程；里程碑是多个史诗的可发布汇合点", fr(14), SUB)

# legend
d.rectangle([1258 * S, 32 * S, 1268 * S, 42 * S], fill=RED)
text(1282, 37, "需求锚定", fr(11), INK, anchor="lm")
d.rectangle([1364 * S, 32 * S, 1374 * S, 42 * S], fill=BLUE)
text(1388, 37, "设计", fr(11), INK, anchor="lm")
d.rectangle([1438 * S, 32 * S, 1448 * S, 42 * S], fill=GREEN)
text(1462, 37, "实现 / 集成", fr(11), INK, anchor="lm")

# ---- section 1 ----
text(90, 108, "第一步 · 产品按业务能力切分成史诗（人定边界，agent 提候选）", fb(15), INK, anchor="lm")
rect(640, 120, 280, 64, fill=PRODUCT, width=0, r=12)
text(780, 147, "产品（整个系统）", fb(18), WHITE)
text(780, 170, "= 所有业务能力的总和", fr(12.5), PSUB)
arrow(780, 184, 780, 212)
text(792, 204, "按业务能力切分", fr(12), GRAY, anchor="lm")

# ---- epic cards ----
EPICS = [
    ("EPIC-01 账户与认证", ["契约奠基 · 第一个做", "定义用户/会话共享契约", "最小可验证路径（薄片）"], ORANGE, ORANGE_F),
    ("EPIC-02 商品目录", ["完整跑一遍标准流程", "引用 EPIC-01 契约", "↓ 本图下方展开"], GREEN, GREEN_F2),
    ("EPIC-03 购物车", ["独立跑标准流程", "依赖 EPIC-01/02 契约", "引入购物车契约"], BLUE, BLUE_F),
    ("EPIC-04 订单与支付", ["独立跑标准流程", "依赖购物车契约", "核心交易闭环"], PURPLE, PURPLE_F),
    ("EPIC-05 后台管理", ["独立跑标准流程", "依赖全部前置契约", "最后一个做"], VIOLET, VIOLET_F),
]
xs = [115, 385, 655, 925, 1195]
for (title, lines, bcol, fcol), x in zip(EPICS, xs):
    rect(x, 222, 250, 120, fill=fcol, outline=bcol, width=2, r=12)
    cx = x + 125
    text(cx, 250, title, fb(14.5), INK)
    text(cx, 275, lines[0], fr(12), (68, 84, 106))
    text(cx, 296, lines[1], fr(12), (68, 84, 106))
    text(cx, 317, lines[2], fr(12), (68, 84, 106))

text(780, 363, "每个史诗都是一次完整的 A0→B1→B2→B3→B4→B5→集成 循环；史诗之间不共享上下文，只通过契约注册表衔接", fr(12.5), GRAY)

# ---- section 2 : pipeline (EPIC-02) ----
text(90, 400, "第二步 · 史诗内部的标准流程（以 EPIC-02 为例）", fb(15), INK, anchor="lm")
PIPE = [
    ("A0 需求锚定", "REQ 清单 · 可测 · 无废案", RED, RED_F),
    ("B-1 PRD", "覆盖全部 REQ", BLUE, BLUE_F),
    ("B-2 HLD", "技术方案 · 风险", BLUE, BLUE_F),
    ("B-3 模块拆解", "3–8 个模块 + 边界", BLUE, (234, 242, 253)),
]
pxs = [90, 274, 458, 642]
for (t1, t2, bcol, fcol), x in zip(PIPE, pxs):
    rect(x, 424, 150, 66, fill=fcol, outline=bcol, width=2, r=10)
    text(x + 75, 451, t1, fb(13.5), INK)
    text(x + 75, 473, t2, fr(11), SUB)
arrow(240, 457, 274, 457)
arrow(424, 457, 458, 457)
arrow(608, 457, 642, 457)
text(257, 446, "PRD", fr(11), GRAY)
text(441, 446, "HLD", fr(11), GRAY)
text(625, 446, "模块范围", fr(11), GRAY)

# fan out to B4 columns
arrow(717, 490, 270, 540)
arrow(717, 490, 710, 540)
arrow(717, 490, 1150, 540)

# B4 LLD boxes
B4 = [
    (140, "B-4-1 LLD · 模块A"),
    (580, "B-4-2 LLD · 模块B"),
    (1020, "B-4-3 LLD · 模块C"),
]
for x, t in B4:
    rect(x, 540, 260, 52, fill=BLUE2_F, outline=BLUE, width=2, r=10)
    text(x + 130, 562, t, fb(13.5), INK)
    text(x + 130, 582, "接口登记契约注册表", fr(11), SUB)
text(1300, 562, "…最多 8 个", fr(11), SUB, anchor="lm")

arrow(270, 592, 270, 640)
arrow(710, 592, 710, 640)
arrow(1150, 592, 1150, 640)

# B5 impl boxes
B5 = [
    (140, "B-5-1 实现 · 模块A"),
    (580, "B-5-2 实现 · 模块B"),
    (1020, "B-5-3 实现 · 模块C"),
]
for x, t in B5:
    rect(x, 640, 260, 52, fill=GREEN_F, outline=GREEN, width=2, r=10)
    text(x + 130, 662, t, fb(13.5), INK)
    text(x + 130, 682, "单测 + 契约测试", fr(11), SUB)

arrow(270, 692, 620, 748)
arrow(710, 692, 780, 748)
arrow(1150, 692, 940, 748)

# integration
rect(560, 748, 440, 60, fill=DGREEN, width=0, r=12)
text(780, 774, "集成：CI 编译 + 契约测试 + 全量回归", fb(13.5), WHITE)
text(780, 794, "代码合入 main · 产出可交付史诗增量", fr(12), DGREEN_T)

text(780, 828, "每步之间设门禁 G0–G5：评审通过才继续；契约冻结（G4）后变更走版本升级，禁止原地改已冻结文档", fr(12), SUB)

# ---- section 3 : milestones ----
text(90, 866, "第三步 · 史诗汇合 → 里程碑（可发布增量；依赖图由 B 总控推导，范围与日期由人拍板）", fb(15), INK, anchor="lm")

MILESTONES = [
    ("里程碑 M1", ORANGE, ORANGE_F, ["EPIC-01", "EPIC-02"],
     "可发布增量1：注册 / 登录 / 浏览商品 —— 薄片验证架构，契约奠基（先做）"),
    ("里程碑 M2", GREEN, (237, 247, 239), ["EPIC-01", "EPIC-02", "EPIC-03", "EPIC-04"],
     "可发布增量2：购物车 / 下单 / 支付 —— 核心交易闭环（依赖 M1）"),
    ("里程碑 M3", PURPLE, (238, 241, 251), ["EPIC-01", "EPIC-02", "EPIC-03", "EPIC-04", "EPIC-05"],
     "可发布增量3：后台管理 —— 产品完整可用（对外交付承诺：范围 + 日期由人签字）"),
]
my = 884
epic_border = {"EPIC-01": ORANGE, "EPIC-02": GREEN, "EPIC-03": BLUE, "EPIC-04": PURPLE, "EPIC-05": VIOLET}
for label, bcol, fcol, chips, desc in MILESTONES:
    rect(190, my, 1180, 74, fill=fcol, outline=bcol, width=2, r=12)
    rect(206, my + 14, 120, 40, fill=bcol, width=0, r=8)
    text(266, my + 34, label, fb(13), WHITE)
    cx = 350
    for c in chips:
        rect(cx, my + 16, 96, 30, fill=WHITE, outline=epic_border[c], width=2, r=6)
        text(cx + 48, my + 31, c, fr(12), INK)
        cx += 112
    text(780, my + 58, desc, fr(12.5), (68, 84, 106))
    my += 88

# ---- section 4 : bottom cards ----
rect(90, 1164, 690, 126, fill=WHITE, outline=CARD_LN, width=1.5, r=12)
text(110, 1190, "④ 谁负责切分（委托度可配置）", fb(15), INK, anchor="lm")
left_lines = [
    "产品 → 史诗：人定业务能力边界，agent 提候选（业务判断）",
    "史诗 → 模块：B-3 按冻结 HLD 拆 3–8 个（可全委托）",
    "史诗 → 里程碑：agent 推导依赖图，人定范围与日期（承诺签字）",
    "全委托前提：优先级 / 硬日期 / 约束已写成输入文档",
]
ly = 1215
for ln in left_lines:
    text(110, ly, ln, fr(12.5), (68, 84, 106), anchor="lm")
    ly += 23

rect(800, 1164, 690, 126, fill=WHITE, outline=CARD_LN, width=1.5, r=12)
text(820, 1190, "⑤ 拆得太大的红线信号", fb(15), INK, anchor="lm")
right_lines = [
    "薄片先行：先跑通最小可验证路径，再横向铺开",
    "单史诗 > 8 个模块 / 单模块实现 > 3 周 → 再切一刀",
    "A0 蒸馏一个会话未收敛 / PRD 超过十几页 → 史诗过大",
    "契约奠基史诗（EPIC-01）必须最先跑，其余引用其契约",
]
ly = 1215
for ln in right_lines:
    text(820, ly, ln, fr(12.5), (68, 84, 106), anchor="lm")
    ly += 23

out = r"D:\Agent\work space\services\codex树形标准开发流程\产品到落地-切分全景图.png"
img.save(out)
print("saved:", out, img.size)
