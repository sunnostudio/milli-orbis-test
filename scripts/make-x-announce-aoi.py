#!/usr/bin/env python3
"""make-x-announce-aoi.py — 海琳あおいカーソル配布告知画像(1600x900)生成

- 緑主体の海グラデ背景＋下部の海藻シルエット＋泡＋水面からの光の筋
- 中央に Normal(arrow) 大 + 残り14種をランダムな大きさで散らばり
- フォント: M PLUS Rounded 1c（レポジトリ内 tools/fonts）
- AI生成なし。純粋なPIL合成のみ。--seed で再現可

使い方:
    python3 scripts/make-x-announce-aoi.py
    python3 scripts/make-x-announce-aoi.py --seed 42 --out dist/announce/x-cursor-aoi-1600x900.png
"""
import argparse
import math
import pathlib
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter

import sys as _sys
_sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from cur_util import load_cur_rgba  # 24bpp CURの透過展開用

ROOT = pathlib.Path(__file__).resolve().parent.parent
CURSORS_ROOT = ROOT / "images" / "cursors"
FONT_DIR = ROOT / "tools" / "fonts"

W, H = 1600, 900
HEADER_H = 210
FIELD = (48, HEADER_H + 10, W - 48, H - 90)
HERO_SCALE = 6  # 32px -> 192px
MIN_SCALE, MAX_SCALE = 2, 4  # 64px〜128px ランダム
PLACE_TRIES = 4000
PLACE_PAD = 2

# 海テーマカラー
DEEP_GREEN = (46, 93, 52)       # #2e5d34 濃い海緑（文字用）
MID_GREEN = (122, 168, 84)
AOI_GREEN = (174, 208, 86)      # #aed056 あおいカラー
WHITE = (255, 255, 255)

# 全15種（arrow は主役として中央、他14種を散らばり）
HERO = "arrow"
EXTRAS = ["appstar", "beam", "cross", "hand", "help", "move", "no",
          "pen", "person", "sizenesw", "sizens", "sizenwse", "sizewe", "wait"]
EXTRA_JP = {"appstar": "動作中", "beam": "テキスト", "cross": "精度", "hand": "リンク",
            "help": "ヘルプ", "move": "移動", "no": "使用不可", "pen": "手書き",
            "person": "人物", "sizenesw": "斜め↙", "sizens": "垂直", "sizenwse": "斜め↘",
            "sizewe": "水平", "wait": "待機"}


def load_font(size, weight="ExtraBold"):
    p = FONT_DIR / f"MPLUSRounded1c-{weight}.ttf"
    if p.exists():
        return ImageFont.truetype(str(p), size)
    fb = pathlib.Path("/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf")
    if fb.exists():
        return ImageFont.truetype(str(fb), size)
    return ImageFont.load_default()


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sea_bg(rng):
    """上：淡ミント→下：濃い海緑のグラデ＋光の筋＋泡＋海藻＋フレーム"""
    top = (214, 240, 220)     # 淡ミント
    mid = (168, 214, 160)
    bot = (86, 140, 78)       # 濃いめの海緑
    deep = (58, 108, 60)      # 最下部（海藻背景）
    base = Image.new("RGB", (W, H))
    px = base.load()
    for y in range(H):
        t = y / (H - 1)
        if t < 0.55:
            col = lerp(top, mid, t / 0.55)
        else:
            col = lerp(mid, bot, (t - 0.55) / 0.45)
        for x in range(W):
            px[x, y] = col
    d = ImageDraw.Draw(base, "RGBA")

    # 水面からの光の筋（斜め半透明ストライプ）
    for i in range(7):
        x0 = 120 + i * 220 + rng.randint(-40, 40)
        w_ray = rng.randint(28, 70)
        skew = rng.randint(60, 140)
        d.polygon([(x0, 0), (x0 + w_ray, 0),
                   (x0 + w_ray - skew, H), (x0 - skew, H)],
                  fill=(255, 255, 255, 18))

    # 泡バブル
    for _ in range(70):
        x = rng.randint(0, W)
        y = rng.randint(H // 4, H)
        r = rng.randint(3, 22)
        a = rng.randint(28, 70)
        d.ellipse([x - r, y - r, x + r, y + r], outline=(255, 255, 255, a + 40), width=2)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a // 3))
    for _ in range(26):  # 小泡
        x, y = rng.randint(0, W), rng.randint(H // 3, H)
        r = rng.randint(2, 6)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, rng.randint(40, 90)))

    # 下部の海藻シルエット
    seaweed_col = (34, 78, 42, 200)
    seaweed_col2 = (52, 102, 56, 170)
    for i in range(14):
        bx = int(40 + i * (W - 80) / 13) + rng.randint(-18, 18)
        h_sw = rng.randint(140, 320)
        w_sw = rng.randint(16, 34)
        col = seaweed_col if i % 2 == 0 else seaweed_col2
        # ゆらゆらした多角形の葉
        pts_l, pts_r = [], []
        segs = 7
        phase = rng.uniform(0, math.pi * 2)
        amp = rng.randint(10, 26)
        for s in range(segs + 1):
            t = s / segs
            y = H - t * h_sw
            sway = math.sin(phase + t * 3.2) * amp * t
            halfw = w_sw * (1 - t * 0.75)
            pts_l.append((bx + sway - halfw, y))
            pts_r.append((bx + sway + halfw, y))
        d.polygon(pts_l + pts_r[::-1], fill=col)

    # 底の濃く沈む帯
    d.rectangle([0, H - 70, W, H], fill=(40, 86, 46, 90))

    # ぼけ玉
    for _ in range(40):
        x, y = rng.randint(0, W), rng.randint(0, H)
        r = rng.randint(6, 20)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 30))

    # 内側フレーム（白→淡緑）
    d.rounded_rectangle([18, 18, W - 18, H - 18], radius=36,
                        outline=(255, 255, 255, 220), width=6)
    d.rounded_rectangle([30, 30, W - 30, H - 30], radius=28,
                        outline=(234, 246, 220, 140), width=2)
    return base


def with_outline_glow(img, outline=4, tint=WHITE):
    """縁取り+柔影付きRGBA"""
    a = img.split()[3].point(lambda v: 255 if v > 8 else 0)
    glow_a = a.filter(ImageFilter.MaxFilter(outline * 2 + 1)).filter(ImageFilter.GaussianBlur(2))
    white = Image.new("RGBA", img.size, (*tint, 255))
    white.putalpha(glow_a)
    shadow = Image.new("RGBA", (img.size[0] + 16, img.size[1] + 16), (0, 0, 0, 0))
    sh_a = a.filter(ImageFilter.GaussianBlur(4)).point(lambda v: int(v * 0.30))
    sh_img = Image.new("RGBA", a.size, (20, 60, 30, 255))
    sh_img.putalpha(sh_a)
    shadow.alpha_composite(sh_img, (8, 10))
    canvas = Image.new("RGBA", shadow.size, (0, 0, 0, 0))
    canvas.alpha_composite(shadow, (0, 0))
    canvas.alpha_composite(white, (8, 8))
    canvas.alpha_composite(img, (8, 8))
    return canvas


def text_pill(text, font, fg, border):
    pad_x, pad_y = 16, 8
    bb = font.getbbox(text)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    pw, ph = tw + pad_x * 2, th + pad_y * 2
    pill = Image.new("RGBA", (pw + 8, ph + 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(pill)
    d.rounded_rectangle([4, 5, 4 + pw, 5 + ph], radius=ph // 2,
                        fill=(255, 255, 250, 245), outline=border, width=3)
    d.text((4 + pad_x - bb[0], 5 + pad_y - bb[1]), text, font=font, fill=fg)
    return pill


def draw_turtle(d, cx, cy, s, col=(255, 255, 255, 170)):
    """小さなカメモチーフ（線画）"""
    d.ellipse([cx - s, cy - s * 0.7, cx + s, cy + s * 0.7], outline=col, width=3)
    d.ellipse([cx + s * 0.7, cy - s * 0.35, cx + s * 1.15, cy + s * 0.1], outline=col, width=3)
    for dx, dy in [(-0.6, 0.7), (0.6, 0.7), (-0.6, -0.7), (0.6, -0.7)]:
        d.ellipse([cx + s * dx - 5, cy + s * dy - 4, cx + s * dx + 5, cy + s * dy + 4],
                  outline=col, width=2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--out", default="dist/announce/x-cursor-aoi-1600x900.png")
    args = ap.parse_args()
    rng = random.Random(args.seed) if args.seed is not None else random.Random()

    font_title = load_font(64, "ExtraBold")
    font_sub = load_font(34, "Medium")
    font_name = load_font(27, "Bold")
    font_note = load_font(22, "Medium")

    img = sea_bg(rng)
    d = ImageDraw.Draw(img, "RGBA")

    # ヘッダー文字（濃い海緑・白ドロップシャドウ付き）
    title = "海琳あおい オリジナルカーソル配布開始！"
    tb = font_title.getbbox(title)
    tx = (W - (tb[2] - tb[0])) / 2 - tb[0]
    ty = 48 - tb[1]
    d.text((tx + 3, ty + 4), title, font=font_title, fill=(255, 255, 255, 160))
    d.text((tx, ty), title, font=font_title, fill=DEEP_GREEN)

    sub = "全15種｜Win / Mac / Chromebook 対応"
    sb = font_sub.getbbox(sub)
    sx = (W - (sb[2] - sb[0])) / 2 - sb[0]
    sy = 152 - sb[1]
    d.text((sx + 2, sy + 3), sub, font=font_sub, fill=(255, 255, 255, 150))
    d.text((sx, sy), sub, font=font_sub, fill=DEEP_GREEN)

    # 🐢 と泡の装飾（タイトル脇）
    draw_turtle(d, 150, 95, 26, col=(*DEEP_GREEN, 160))
    draw_turtle(d, W - 150, 100, 22, col=(255, 255, 255, 190))

    # ---- 中央ヒーロー（arrow 大）----
    hero_img = load_cur_rgba(CURSORS_ROOT / "aoi" / "arrow.cur")
    hero = hero_img.resize((32 * HERO_SCALE, 32 * HERO_SCALE), Image.NEAREST)
    hero = with_outline_glow(hero, outline=5, tint=WHITE)
    hx = (W - hero.width) // 2
    hy = (H - hero.height) // 2 - 10
    base = img.convert("RGBA")
    base.alpha_composite(hero, (hx, hy))

    hero_pill = text_pill("海琳あおい", font_name, DEEP_GREEN, AOI_GREEN)
    px_ = hx + (hero.width - hero_pill.width) // 2
    py_ = hy + hero.height - 24
    base.alpha_composite(hero_pill, (px_, py_))

    # ---- 残り14種をランダムサイズで散らばり ----
    items = []
    for role in EXTRAS:
        sc = rng.randint(MIN_SCALE, MAX_SCALE)
        src = load_cur_rgba(CURSORS_ROOT / "aoi" / f"{role}.cur")
        im = src.resize((32 * sc, 32 * sc), Image.NEAREST)
        im = with_outline_glow(im, outline=3, tint=WHITE)
        show_label = rng.random() < 0.5
        pill = text_pill(EXTRA_JP[role], font_name, DEEP_GREEN, AOI_GREEN) if show_label else None
        w_item = max(im.width, pill.width if pill else 0)
        h_item = im.height + (pill.height // 2 if pill else 0)
        items.append({"role": role, "w": w_item, "h": h_item, "cursor": im,
                      "pill": pill, "overlap": (pill.height // 2 if pill else 0)})
    # 大きい順に置くと収まりが良い
    items.sort(key=lambda it: -(it["w"] * it["h"]))

    placed = [(hx - 30, hy - 30, hx + hero.width + 30, hy + hero.height + 40)]  # ヒーロー周辺は避ける
    placed.append((W - 470, H - 66, W - 30, H - 14))  # コピーライト
    fx0, fy0, fx1, fy1 = FIELD
    for it in items:
        ok = False
        for _ in range(PLACE_TRIES):
            x = rng.randint(fx0, fx1 - it["w"])
            y = rng.randint(fy0, fy1 - it["h"])
            box = (x - PLACE_PAD, y - PLACE_PAD, x + it["w"] + PLACE_PAD, y + it["h"] + PLACE_PAD)
            if all(box[2] < p[0] or box[0] > p[2] or box[3] < p[1] or box[1] > p[3]
                   for p in placed):
                it["x"], it["y"] = x, y
                placed.append((x, y, x + it["w"], y + it["h"]))
                ok = True
                break
        if not ok:
            print(f"  WARN: 配置失敗 {it['role']} (スキップ)")
    items = [it for it in items if "x" in it]
    rng.shuffle(items)
    for it in items:
        x, y = it["x"], it["y"]
        cx = x + (it["w"] - it["cursor"].width) // 2
        base.alpha_composite(it["cursor"], (cx, y))
        if it["pill"] is not None:
            px2 = x + (it["w"] - it["pill"].width) // 2
            py2 = y + it["cursor"].height - it["overlap"]
            base.alpha_composite(it["pill"], (px2, py2))

    img = base.convert("RGB")
    d = ImageDraw.Draw(img, "RGBA")

    # コピーライト
    note = "© Milli Orbis (非公式ファンサイト)"
    nb = font_note.getbbox(note)
    d.text((W - (nb[2] - nb[0]) - 34 - nb[0], H - 42 - (nb[3] - nb[1]) - nb[1]),
           note, font=font_note, fill=(240, 250, 235, 220))

    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG")
    print(f"saved {out} ({out.stat().st_size/1024:.0f} KB) extras={len(items)}/14 seed={args.seed}")


if __name__ == "__main__":
    main()
