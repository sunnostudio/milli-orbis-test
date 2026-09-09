#!/usr/bin/env python3
"""make-x-announce-scatter.py — X告知用カーソル散らばり画像(1600x900)生成

- 12タレント分の Normal(arrow)大 + おまけ1種(完全ランダム)小 = 24個を散らばり配置
- 32pxドット絵は PIL NEAREST で拡大(ノーマルx5=160px / おまけx3=96px)、回転なし
- AI生成・AI超解像は不使用。純粋な画像処理+合成のみ
- 実行毎にランダム。--seed 指定で再現可

使い方:
    python3 scripts/make-x-announce-scatter.py --font /tmp/opencode/fonts/NotoSansJP-Bold.ttf
    python3 scripts/make-x-announce-scatter.py --seed 42 --out dist/announce/x-cursor-scatter-1600x900-seed42.png
"""
import argparse
import pathlib
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
CURSORS_ROOT = ROOT / "images" / "cursors"

W, H = 1600, 900
HEADER_H = 200
FIELD = (40, HEADER_H + 10, W - 40, H - 20)  # x0,y0,x1,y1 散らばり領域
NORMAL_SCALE = 4  # 32px -> 128px
EXTRA_SCALE = 3   # 32px -> 96px
PLACE_TRIES = 3000
PLACE_PAD = 2

# portalId, folder, EN, JP, color
TALENTS = [
    ("konomi", "konomi", "Konomi", "甘狼このみ", "#5f97a4"),
    ("nono", "nono", "Nono", "音ノ乃のの", "#6d609d"),
    ("akubi", "akubi", "Akubi", "あくび", "#5c1125"),
    ("koma", "koma", "Koma", "小廻こま", "#d09559"),
    ("raco", "rako", "Rako", "音ノ瀬らこ", "#cba60b"),
    ("yura", "yura", "Yura", "ゆらぎゆら", "#7f96bf"),
    ("nuhu", "nuhu", "Nuhu", "ぬふ", "#c6989a"),
    ("tsukuri", "tsukuri", "Tsukuri", "眠雲ツクリ", "#a8a6ab"),
    ("liz", "rizu", "Rizu", "雨夜リズ", "#617a7a"),
    ("rei", "rei", "Rei", "夕霧レイ", "#7e97b1"),
    ("mahoro", "mahoro", "Mahoro", "鹿乃まほろ", "#EF454A"),
    ("milchan", "milli-chan", "MilliChan", "ミリちゃん", "#74a5ae"),
]

EXTRAS = ["appstar", "beam", "cross", "hand", "help", "move", "no",
          "pen", "person", "sizenesw", "sizens", "sizenwse", "sizewe", "wait"]
EXTRA_JP = {"appstar": "動作中", "beam": "テキスト", "cross": "精度", "hand": "リンク",
            "help": "ヘルプ", "move": "移動", "no": "使用不可", "pen": "手書き",
            "person": "人物", "sizenesw": "斜め↙", "sizens": "垂直", "sizenwse": "斜め↘",
            "sizewe": "水平", "wait": "待機"}


def load_font(path, size, weight=700):
    if path and pathlib.Path(path).exists():
        f = ImageFont.truetype(str(path), size)
        try:
            f.set_variation_by_axes([weight])
        except Exception:
            pass
        return f, True
    return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size), False


def pastel_bg():
    """OGP風の淡パステル対角グラデーション + 星屑"""
    tl = (186, 226, 246)   # 水色
    tr = (255, 214, 196)   # ピーチ
    bl = (232, 220, 248)   # 藤
    br = (255, 244, 214)   # クリーム
    base = Image.new("RGB", (W, H))
    px = base.load()
    for y in range(H):
        ty = y / (H - 1)
        for x in range(W):
            tx = x / (W - 1)
            top = tuple(int(tl[i] + (tr[i] - tl[i]) * tx) for i in range(3))
            bot = tuple(int(bl[i] + (br[i] - bl[i]) * tx) for i in range(3))
            px[x, y] = tuple(int(top[i] + (bot[i] - top[i]) * ty) for i in range(3))
    d = ImageDraw.Draw(base, "RGBA")
    rng = random.Random(20260908)
    for _ in range(90):  # ぼけ玉
        x, y = rng.randint(0, W), rng.randint(0, H)
        r = rng.randint(6, 26)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, 46))
    for _ in range(40):  # キラ星(十字)
        x, y = rng.randint(10, W - 10), rng.randint(10, H - 10)
        r = rng.randint(5, 11)
        d.line([x - r, y, x + r, y], fill=(255, 255, 255, 150), width=2)
        d.line([x, y - r, x, y + r], fill=(255, 255, 255, 150), width=2)
    # 内側フレーム
    d.rounded_rectangle([18, 18, W - 18, H - 18], radius=36,
                        outline=(255, 255, 255, 230), width=6)
    return base


def with_outline_glow(img, outline=4):
    """白縁+柔影付きRGBA。imgは拡大済みRGBA"""
    a = img.split()[3].point(lambda v: 255 if v > 8 else 0)
    glow_a = a.filter(ImageFilter.MaxFilter(outline * 2 + 1)).filter(ImageFilter.GaussianBlur(2))
    glow = Image.new("RGBA", img.size, (255, 255, 255, 0))
    glow.putalpha(glow_a)
    white = Image.new("RGBA", img.size, (255, 255, 255, 255))
    white.putalpha(glow_a)
    shadow = Image.new("RGBA", (img.size[0] + 16, img.size[1] + 16), (0, 0, 0, 0))
    sh_a = a.filter(ImageFilter.GaussianBlur(4)).point(lambda v: int(v * 0.30))
    sh_img = Image.new("RGBA", a.size, (60, 60, 90, 255))
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
                        fill=(255, 255, 255, 245), outline=border, width=3)
    d.text((4 + pad_x - bb[0], 5 + pad_y - bb[1]), text, font=font, fill=fg)
    return pill


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--out", default="dist/announce/x-cursor-scatter-1600x900.png")
    ap.add_argument("--font", default="/tmp/opencode/fonts/NotoSansJP-Bold.ttf")
    args = ap.parse_args()
    rng = random.Random(args.seed) if args.seed is not None else random.Random()

    font_title, has_jp = load_font(args.font, 84)
    font_sub, _ = load_font(args.font, 34)
    font_name, _ = load_font(args.font, 27)
    font_tag, _ = load_font(args.font, 21)
    font_note, _ = load_font(args.font, 22)

    # おまけ完全ランダム
    picks = [(t, rng.choice(EXTRAS)) for t in TALENTS]
    print("extra picks (seed=%s):" % args.seed)
    for (pid, folder, en, jp, _c), ex in picks:
        print(f"  {pid:8s} {ex:10s} ({EXTRA_JP[ex]})")

    img = pastel_bg()
    d = ImageDraw.Draw(img)
    title = "オリジナルカーソル配布中!" if has_jp else "Original Cursors Available!"
    tb = font_title.getbbox(title)
    d.text(((W - (tb[2] - tb[0])) / 2 - tb[0], 52 - tb[1]), title,
           font=font_title, fill=(74, 74, 110))
    sub = "11タレント＋ミリちゃんのカーソルを配布しています！｜Win/Mac/Chromebook 全15種配布" if has_jp \
        else "Cursors for 11 talents + Milli-chan! | 15 roles for Win/Mac/Chromebook"
    sb = font_sub.getbbox(sub)
    d.text(((W - (sb[2] - sb[0])) / 2 - sb[0], 158 - sb[1]), sub,
           font=font_sub, fill=(110, 110, 140))

    # 配置物リスト作成(大→小の順に置くと収まりが良い)
    items = []  # (w,h,kind,talent,role,pil_img,pill)
    for (pid, folder, en, jp, color), ex in picks:
        arrow = Image.open(CURSORS_ROOT / folder / "png" / "arrow.png").convert("RGBA")
        big = arrow.resize((32 * NORMAL_SCALE, 32 * NORMAL_SCALE), Image.NEAREST)
        big = with_outline_glow(big)
        pill = text_pill(jp if has_jp else en, font_name, (60, 60, 80), color)
        items.append({"w": max(big.width, pill.width), "h": big.height + pill.height // 2,
                      "kind": "normal", "label": jp if has_jp else en, "overlap": pill.height // 2,
                      "cursor": big, "pill": pill, "color": color})
        ex_img = Image.open(CURSORS_ROOT / folder / "png" / f"{ex}.png").convert("RGBA")
        small = ex_img.resize((32 * EXTRA_SCALE, 32 * EXTRA_SCALE), Image.NEAREST)
        small = with_outline_glow(small, outline=3)
        items.append({"w": small.width, "h": small.height,
                      "kind": "extra", "label": ex, "overlap": 0,
                      "cursor": small, "pill": None, "color": "#9aa3b2"})
    rng.shuffle(items)
    items.sort(key=lambda it: 0 if it["kind"] == "normal" else 1)

    placed = []  # (x0,y0,x1,y1)
    fx0, fy0, fx1, fy1 = FIELD
    copyright_zone = (W - 460, H - 62, W - 30, H - 10)  # 右下コピーライトと重ねない
    placed.append(copyright_zone)
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
            print(f"  WARN: 配置失敗 {it['label']} (重なり回避できずスキップ)")
    items = [it for it in items if "x" in it]
    rng.shuffle(items)  # 重なり順もランダム
    base = img.convert("RGBA")
    for it in items:
        x, y = it["x"], it["y"]
        cx = x + (it["w"] - it["cursor"].width) // 2
        base.alpha_composite(it["cursor"], (cx, y))
        if it["pill"] is not None:
            px = x + (it["w"] - it["pill"].width) // 2
            py = y + it["cursor"].height - it["overlap"]  # 札をカーソル下部に半重ね
            base.alpha_composite(it["pill"], (px, py))
    img = base.convert("RGB")
    d = ImageDraw.Draw(img)
    nb = font_note.getbbox("© Milli Orbis (非公式ファンサイト)")
    d.text((W - (nb[2] - nb[0]) - 34 - nb[0], H - 30 - (nb[3] - nb[1]) - nb[1]),
           "© Milli Orbis (非公式ファンサイト)" if has_jp else "© Milli Orbis (unofficial fan site)",
           font=font_note, fill=(140, 140, 165))

    out = ROOT / args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out, "PNG")
    print(f"saved {out} ({out.stat().st_size/1024:.0f} KB) items={len(items)}/24 jp_font={has_jp}")


if __name__ == "__main__":
    main()
