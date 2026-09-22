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
import re
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_PATH = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"

W, H = 1200, 675
BG = (255, 249, 240)
INK = (58, 46, 38)
MUTED = (140, 120, 105)
CARD = (255, 255, 255)
ACCENT = (117, 177, 192)  # Milli Orbis テーマカラー
WATERMARK = (160, 140, 125)

WEEK_JP = ["月", "火", "水", "木", "金", "土", "日"]


def load_members():
    src = (ROOT / "data.js").read_text(encoding="utf-8")
    info = {}
    for m in re.finditer(
        r'id:\s*"(\w+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?color:\s*"([^"]+)"',
        src,
    ):
        mid, name, color = m.group(1), m.group(2), m.group(3)
        if mid not in info:
            info[mid] = {"name": name, "color": color}
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
    import math

    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.45
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    draw.polygon(pts, fill=color)


def truncate(draw, text, font, max_w):
    if draw.textlength(text, font=font) <= max_w:
        return text
    while text and draw.textlength(text + "…", font=font) > max_w:
        text = text[:-1]
    return text + "…"


def render(date, streams, members, out_path):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    f_title = ImageFont.truetype(FONT_PATH, 44)
    f_date = ImageFont.truetype(FONT_PATH, 30)
    f_time = ImageFont.truetype(FONT_PATH, 34)
    f_name = ImageFont.truetype(FONT_PATH, 30)
    f_body = ImageFont.truetype(FONT_PATH, 26)
    f_small = ImageFont.truetype(FONT_PATH, 22)

    # --- 背景のドット・星のおかざり ---
    pastel = [(255, 214, 220), (255, 236, 190), (205, 232, 244), (220, 235, 200), (232, 220, 245)]
    dots = [(70, 120), (150, 600), (1050, 90), (1130, 560), (600, 40), (60, 350), (1150, 330)]
    for i, (x, y) in enumerate(dots):
        c = pastel[i % len(pastel)]
        d.ellipse([x - 14, y - 14, x + 14, y + 14], fill=c)
    star(d, 220, 90, 16, (247, 203, 14))
    star(d, 980, 600, 14, (247, 143, 192))
    star(d, 1090, 200, 12, (126, 200, 255))

    # --- ヘッダー ---
    d.rounded_rectangle([36, 28, W - 36, 148], radius=28, fill=(255, 255, 255),
                        outline=ACCENT, width=4)
    datestr = f"{date.month}/{date.day}({WEEK_JP[date.weekday()]})"
    d.text((72, 48), "本日のミリプロ配信スケジュール", font=f_title, fill=INK)
    d.text((72, 102), datestr, font=f_date, fill=MUTED)
    # ロゴ
    logo_path = ROOT / "images" / "rogo" / "Milli Orbis-rogo.png"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        lw, lh = logo.size
        scale = 56 / lh
        logo = logo.resize((int(lw * scale), 56))
        img.paste(logo, (W - 36 - logo.width - 24, 60), logo)

    # --- 配信カード ---
    max_rows = 6
    shown = streams[:max_rows]
    if not shown:
        y = 200
        d.rounded_rectangle([36, y, W - 36, y + 220], radius=24, fill=CARD,
                            outline=(230, 215, 195), width=3)
        msg = "本日の配信予定はありません"
        sub = "見つけたらサイトでチェック！"
        tw = d.textlength(msg, font=f_title)
        d.text(((W - tw) / 2, y + 60), msg, font=f_title, fill=INK)
        sw = d.textlength(sub, font=f_body)
        d.text(((W - sw) / 2, y + 130), sub, font=f_body, fill=MUTED)
        star(d, 110, y + 110, 18, (247, 203, 14))
        star(d, W - 110, y + 110, 18, (247, 143, 192))
    else:
        # 行ブロックをヘッダー〜フッター間で垂直中央寄せ
        block_h = len(shown) * 74 - 10
        y = 172 + max(0, (H - 110 - 172 - block_h) // 2)
        for st in shown:
            m = members.get(st["memberId"], {})
            color = hex_to_rgb(m.get("color", "#75b1c0"))
            name = m.get("name") or st["member"] or st["memberId"]
            d.rounded_rectangle([36, y, W - 36, y + 64], radius=18, fill=CARD,
                                outline=(230, 215, 195), width=2)
            # メンカラーの帯
            d.rounded_rectangle([36, y, 52, y + 64], radius=9, fill=color)
            d.rectangle([44, y, 52, y + 64], fill=color)
            tlabel = ("🔴 " if st["live"] else "") + st["time"]
            d.text((72, y + 12), tlabel, font=f_time, fill=(200, 60, 70) if st["live"] else INK)
            d.ellipse([238, y + 22, 262, y + 46], fill=color)
            d.text((272, y + 14), truncate(d, name, f_name, 170), font=f_name, fill=INK)
            d.text((460, y + 16), truncate(d, st["title"], f_body, 660), font=f_body, fill=(90, 75, 65))
            y += 74

        # --- 残り件数 ---
        rest = len(streams) - len(shown)
        if rest > 0:
            more = f"他 {rest} 件の配信はサイトでチェック！"
            mw = d.textlength(more, font=f_body)
            d.text(((W - mw) / 2, y + 2), more, font=f_body, fill=MUTED)

    # --- フッター ---
    foot = "詳細は Milli Orbis で"
    fw = d.textlength(foot, font=f_small)
    d.text(((W - fw) / 2, H - 56), foot, font=f_small, fill=MUTED)
    wm = "※非公式ファンメイド | Milli Orbis"
    ww = d.textlength(wm, font=f_small)
    d.text((W - ww - 24, H - 56), wm, font=f_small, fill=WATERMARK)

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
