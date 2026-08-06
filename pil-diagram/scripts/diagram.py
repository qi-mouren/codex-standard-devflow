# -*- coding: utf-8 -*-
"""PIL 手绘图表辅助库（pil-diagram skill）

用法：
    from diagram import Canvas
    c = Canvas(1560, 1320)
    c.rect(100, 200, 300, 80, fill=BLUE_F, outline=BLUE, width=2, r=12)
    c.text(250, 240, "标题", 15, bold=True, fill=INK)
    c.arrow(400, 240, 500, 240)
    assert c.fits("标题", 15, bold=True, max_w=280)
    c.save(r"D:\\path\\out.png")

所有坐标/字号以逻辑像素为单位，导出时自动乘 SCALE（默认 2），保证文字清晰。
"""
from PIL import Image, ImageDraw, ImageFont
import math

SCALE = 2
BG = (250, 251, 253)
FONT_REG = r"C:\Windows\Fonts\msyh.ttc"
FONT_BOLD = r"C:\Windows\Fonts\msyhbd.ttc"

INK = (34, 48, 63)
SUB = (102, 114, 127)
GRAY = (91, 107, 123)

# 语义色板：fill=浅底，line=深描边
RED = (231, 76, 60);      RED_F = (253, 236, 234)
BLUE = (74, 127, 181);    BLUE_F = (238, 244, 251); BLUE2_F = (232, 240, 251)
GREEN = (46, 158, 91);    GREEN_F = (237, 248, 240); GREEN_F2 = (240, 250, 242)
DGREEN = (46, 125, 91);   DGREEN_T = (220, 239, 228)
ORANGE = (230, 126, 34);  ORANGE_F = (253, 243, 231)
PURPLE = (91, 110, 225);  PURPLE_F = (238, 241, 251)
VIOLET = (142, 108, 192); VIOLET_F = (244, 240, 250)
CARD_LN = (215, 222, 232)
WHITE = (255, 255, 255)

_font_cache = {}


def _font(size, bold=False):
    key = (bold, round(size * SCALE))
    if key not in _font_cache:
        path = FONT_BOLD if bold else FONT_REG
        _font_cache[key] = ImageFont.truetype(path, key[1])
    return _font_cache[key]


class Canvas:
    def __init__(self, w, h, scale=SCALE, bg=BG):
        self.w, self.h, self.s = w, h, scale
        self.img = Image.new("RGB", (w * scale, h * scale), bg)
        self.d = ImageDraw.Draw(self.img)

    def rect(self, x, y, w, h, fill=None, outline=None, width=2, r=12):
        self.d.rounded_rectangle(
            [x * self.s, y * self.s, (x + w) * self.s, (y + h) * self.s],
            radius=r * self.s, fill=fill, outline=outline,
            width=max(1, round(width * self.s)))

    def text(self, x, y, s, size, bold=False, fill=INK, anchor="mm"):
        self.d.text((x * self.s, y * self.s), s,
                    font=_font(size, bold), fill=fill, anchor=anchor)

    def line(self, x1, y1, x2, y2, color=GRAY, width=1.5, dash=False):
        if not dash:
            self.d.line([x1 * self.s, y1 * self.s, x2 * self.s, y2 * self.s],
                        fill=color, width=max(1, round(width * self.s)))
            return
        seg, gap = 7 * self.s, 5 * self.s
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        ux, uy = dx / L, dy / L
        t = 0.0
        while t < L:
            e = min(t + seg, L)
            self.d.line([(x1 + ux * t) * self.s, (y1 + uy * t) * self.s,
                         (x1 + ux * e) * self.s, (y1 + uy * e) * self.s],
                        fill=color, width=max(1, round(width * self.s)))
            t = e + gap

    def arrow(self, x1, y1, x2, y2, color=GRAY, width=1.5):
        self.line(x1, y1, x2, y2, color=color, width=width)
        ang = math.atan2(y2 - y1, x2 - x1)
        L = 9 * self.s
        a1, a2 = ang + math.radians(150), ang - math.radians(150)
        p1 = (x2 * self.s + L * math.cos(a1), y2 * self.s + L * math.sin(a1))
        p2 = (x2 * self.s + L * math.cos(a2), y2 * self.s + L * math.sin(a2))
        self.d.polygon([(x2 * self.s, y2 * self.s), p1, p2], fill=color)

    def measure(self, s, size, bold=False):
        """返回文字逻辑像素宽高 (w, h)。"""
        bbox = self.d.textbbox((0, 0), s, font=_font(size, bold))
        return (bbox[2] - bbox[0]) / self.s, (bbox[3] - bbox[1]) / self.s

    def fits(self, s, size, bold=False, max_w=None, max_h=None):
        """校验文字是否溢出；只给 max_w/max_h 时返回 bool。"""
        w, h = self.measure(s, size, bold)
        if max_w is None and max_h is None:
            return w, h
        ok = True
        if max_w is not None:
            ok = ok and w <= max_w
        if max_h is not None:
            ok = ok and h <= max_h
        return ok

    def check_texts(self, items):
        """批量校验，items=[(text, size, bold, max_w), ...]；返回溢出清单。"""
        bad = []
        for text, size, bold, max_w in items:
            if not self.fits(text, size, bold, max_w=max_w):
                bad.append((text, round(self.measure(text, size, bold)[0], 1), max_w))
        return bad

    def save(self, path):
        self.img.save(path)
        print("saved:", path, self.img.size)
