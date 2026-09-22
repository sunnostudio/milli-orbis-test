#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen-schedule-image.py — 本日の配信スケジュール画像(1200x675)を生成する
data/youtube.json の streams から当日(JST)分を抽出し、
images/x-schedule.png に書き出す。X半自動投稿(iPhoneショートカット)用。

使い方:
  python3 tools/gen-schedule-image.py [--date YYYY-MM-DD] [--out images/x-schedule.png]
"""
import argparse
import datetime
import json
import math
import re
import sys
import urllib.parse
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_PATH = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"

W, H = 1200, 675
INK = (58, 46, 38)
MUTED = (140, 120, 105)
CARD = (255, 255, 255)
ACCENT = (117, 177, 192)  # Milli Orbis テーマカラー
WATERMARK = (160, 140, 125)
LIVE_RED = (225, 70, 80)

WEEK_JP = ["月", "火", "水", "木", "金", "土", "日"]


def load_members():
    src = (ROOT / "data.js").read_text(encoding="utf-8")
    info = {}
    for m in re.finditer(
        r'id:\s*"(\w+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?color:\s*"([^"]+)"[\s\S]*?icon:\s*"([^"]*)"',
        src,
    ):
        mid, name, color, icon = m.group(1), m.group(2), m.group(3), m.group(4)
        if mid not in info:
            info[mid] = {
                "name": name,
                "color": color,
                "icon": urllib.parse.unquote(icon),
            }
    return info


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def today_streams(date):
    data = json.loads((ROOT / "data" / "youtube.json").read_text(encoding="utf-8"))
    jst = datetime.timezone(datetime.timedelta(hours=9))
    out = []
    for st in data.get("streams", []) + data.get("live", []):
        ts = st.get("scheduledStartTime") or st.get("actualStartTime") or ""
        try:
            dt = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(jst)
        except ValueError:
            continue
        if dt.date() != date:
            continue
        if st.get("status") not in ("upcoming", "live"):
            continue
        out.append(
            {
                "time": dt.strftime("%H:%M"),
                "dt": dt,
                "memberId": st.get("memberId", ""),
                "member": st.get("member", ""),
                "title": st.get("title", ""),
                "live": st.get("status") == "live",
            }
        )
    out.sort(key=lambda s: s["dt"])
    return out


def star(draw, cx, cy, r, color):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.45
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    draw.polygon(pts, fill=color)


def heart(draw, cx, cy, s, color):
    r = s / 2
    draw.ellipse([cx - s, cy - r * 0.7, cx, cy + r * 0.7], fill=color)
    draw.ellipse([cx, cy - r * 0.7, cx + s, cy + r * 0.7], fill=color)
    draw.polygon(
        [(cx - s + r * 0.35, cy + r * 0.25), (cx + s - r * 0.35, cy + r * 0.25),
         (cx, cy + s * 0.95)],
        fill=color,
    )


def truncate(draw, text, font, max_w):
    if draw.textlength(text, font=font) <= max_w:
        return text
    while text and draw.textlength(text + "…", font=font) > max_w:
        text = text[:-1]
    return text + "…"


def circle_icon(path, size, ring):
    """正方形に切り抜いて丸アイコン化。ring色の縁付き。"""
    im = Image.open(path).convert("RGB")
    w, h = im.size
    side = min(w, h)
    im = im.crop(((w - side) // 2, (h - side) // 2, (w + side) // 2, (h + side) // 2))
    im = im.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size, size], fill=255)
    pad = 5
    out = Image.new("RGBA", (size + pad * 2, size + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    d.ellipse([0, 0, size + pad * 2, size + pad * 2], fill=ring)
    out.paste(im, (pad, pad), mask)
    return out


def render(date, streams, members, out_path):
    img = Image.new("RGB", (W, H), (255, 250, 242))
    # 縦グラデーション
    grad = Image.new("RGB", (1, H))
    top = (255, 251, 243)
    bottom = (255, 238, 226)
    for yy in range(H):
        t = yy / H
        grad.putpixel((0, yy), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    img.paste(grad.resize((W, H)))
    d = ImageDraw.Draw(img, "RGBA")
    f_title = ImageFont.truetype(FONT_PATH, 46)
    f_date = ImageFont.truetype(FONT_PATH, 30)
    f_time = ImageFont.truetype(FONT_PATH, 28)
    f_name = ImageFont.truetype(FONT_PATH, 30)
    f_body = ImageFont.truetype(FONT_PATH, 26)
    f_small = ImageFont.truetype(FONT_PATH, 22)

    # --- 背景コンフェッティ ---
    pastel = [(255, 190, 200, 110), (255, 225, 170, 110), (180, 220, 245, 110),
              (200, 230, 185, 110), (220, 200, 240, 110)]
    dots = [(60, 200), (110, 560), (450, 30), (760, 40), (1080, 120), (1150, 420),
            (90, 430), (620, 640), (980, 620)]
    for i, (x, y) in enumerate(dots):
        c = pastel[i % len(pastel)]
        d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=c)
    star(d, 200, 170, 15, (247, 203, 14, 160))
    star(d, 1010, 540, 13, (247, 143, 192, 160))
    star(d, 1120, 250, 11, (126, 200, 255, 160))
    star(d, 540, 90, 10, (247, 203, 14, 130))
    heart(d, 80, 620, 26, (255, 170, 185, 130))
    heart(d, 1130, 80, 22, (255, 170, 185, 130))
    heart(d, 700, 620, 18, (255, 205, 175, 130))

    # --- ヘッダー(グラデ帯) ---
    hb = Image.new("RGB", (W - 72, 124), (244, 160, 180))
    for xx in range(W - 72):
        t = xx / (W - 72)
        c = (int(244 + (180 - 244) * t), int(160 + (140 - 160) * t), int(180 + (220 - 180) * t))
        for yy in range(124):
            hb.putpixel((xx, yy), c)
    mask = Image.new("L", (W - 72, 124), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 72, 124], radius=30, fill=255)
    img.paste(hb, (36, 26), mask)
    d = ImageDraw.Draw(img, "RGBA")
    d.text((72, 42), "本日のミリプロ配信スケジュール", font=f_title, fill=(255, 255, 255),
           stroke_width=1, stroke_fill=(190, 120, 140))
    datestr = f"{date.month}/{date.day}({WEEK_JP[date.weekday()]})"
    tw = d.textlength(datestr, font=f_date)
    d.rounded_rectangle([72, 100, 72 + tw + 36, 136], radius=18, fill=(255, 255, 255, 235))
    d.text((90, 102), datestr, font=f_date, fill=(200, 110, 130))
    # ロゴ
    logo_path = ROOT / "images" / "rogo" / "Milli Orbis-rogo.png"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        lw, lh = logo.size
        scale = 52 / lh
        logo = logo.resize((int(lw * scale), 52))
        white = Image.new("RGBA", (logo.width + 28, 76), (255, 255, 255, 235))
        wmask = Image.new("L", white.size, 0)
        ImageDraw.Draw(wmask).rounded_rectangle([0, 0, *white.size], radius=20, fill=255)
        img.paste(white, (W - 36 - white.width - 10, 52), wmask)
        img.paste(logo, (W - 36 - white.width - 10 + 14, 64), logo)

    # --- 配信カード ---
    max_rows = 6
    shown = streams[:max_rows]
    if not shown:
        y = 262
        d.rounded_rectangle([36, y, W - 36, y + 200], radius=24, fill=CARD,
                            outline=(235, 210, 195), width=3)
        msg = "本日の配信予定はありません"
        sub = "見つけたらサイトでチェック！"
        tw = d.textlength(msg, font=f_title)
        d.text(((W - tw) / 2, y + 52), msg, font=f_title, fill=INK)
        sw = d.textlength(sub, font=f_body)
        d.text(((W - sw) / 2, y + 124), sub, font=f_body, fill=MUTED)
        star(d, 130, y + 100, 20, (247, 203, 14, 200))
        star(d, W - 130, y + 100, 20, (247, 143, 192, 200))
    else:
        block_h = len(shown) * 76 - 12
        y = 168 + max(0, (H - 110 - 168 - block_h) // 2)
        for st in shown:
            m = members.get(st["memberId"], {})
            color = hex_to_rgb(m.get("color", "#75b1c0"))
            name = m.get("name") or st["member"] or st["memberId"]
            d.rounded_rectangle([36, y, W - 36, y + 64], radius=20, fill=CARD,
                                outline=(235, 210, 195), width=2)
            # 丸アイコン
            icon_file = (ROOT / m.get("icon", "")) if m.get("icon") else None
            if icon_file and icon_file.exists():
                try:
                    badge = circle_icon(icon_file, 46, color)
                    img.paste(badge, (50, y + 4), badge)
                except OSError:
                    d.ellipse([52, y + 9, 104, y + 61], fill=color)
            else:
                d.ellipse([52, y + 9, 104, y + 61], fill=color)
            # 時刻ピル
            pill_c = LIVE_RED if st["live"] else color
            label = ("LIVE " if st["live"] else "") + st["time"]
            pw = max(118, int(d.textlength(label, font=f_time)) + 36)
            d.rounded_rectangle([122, y + 13, 122 + pw, y + 51], radius=19, fill=pill_c)
            tx = 122 + (pw - d.textlength(label, font=f_time)) / 2
            d.text((tx, y + 15), label, font=f_time, fill=(255, 255, 255))
            # 名前・タイトル
            nx = 122 + pw + 16
            d.text((nx, y + 14), truncate(d, name, f_name, 185), font=f_name, fill=INK)
            d.text((nx + 200, y + 17), truncate(d, st["title"], f_body, W - 36 - (nx + 200) - 20),
                   font=f_body, fill=(100, 85, 72))
            y += 76

        # --- 残り件数 ---
        rest = len(streams) - len(shown)
        if rest > 0:
            more = f"他 {rest} 件の配信はサイトでチェック！"
            mw = d.textlength(more, font=f_body)
            pill = [W / 2 - mw / 2 - 22, y + 4, W / 2 + mw / 2 + 22, y + 40]
            d.rounded_rectangle(pill, radius=18, fill=(255, 255, 255, 220),
                                outline=ACCENT, width=2)
            d.text(((W - mw) / 2, y + 8), more, font=f_body, fill=(70, 130, 145))

    # --- フッター ---
    for i in range(3):
        d.ellipse([W / 2 - 30 + i * 22, H - 62, W / 2 - 18 + i * 22, H - 50],
                  fill=(244, 190, 200))
    wm = "※非公式ファンメイド | Milli Orbis"
    ww = d.textlength(wm, font=f_small)
    d.text((W - ww - 24, H - 52), wm, font=f_small, fill=WATERMARK)

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print(f"saved: {out} ({len(streams)} streams)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=None, help="YYYY-MM-DD (JST, default: today)")
    ap.add_argument("--out", default="images/x-schedule.png")
    args = ap.parse_args()
    jst = datetime.timezone(datetime.timedelta(hours=9))
    if args.date:
        date = datetime.date.fromisoformat(args.date)
    else:
        date = datetime.datetime.now(jst).date()
    members = load_members()
    streams = today_streams(date)
    render(date, streams, members, ROOT / args.out)


if __name__ == "__main__":
    sys.exit(main())
