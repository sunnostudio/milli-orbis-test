#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""gen-schedule-image.py — 本日の配信・イベント情報画像(1200x675)を生成する
data/youtube.json の streams から当日(JST)分、data/collabs.json から
開催中のコラボを抽出し、images/x-schedule.png に書き出す。
X半自動投稿(iPhoneショートカット)用。テーマカラーは日替わりで
ランダムなメンバーのメンカラーになる(日付シードで決定的)。

使い方:
  python3 tools/gen-schedule-image.py [--date YYYY-MM-DD] [--out images/x-schedule.png]
"""
import argparse
import datetime
import json
import math
import random
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


def lighten(rgb, amt=0.55):
    return tuple(int(c + (255 - c) * amt) for c in rgb)


def darken(rgb, amt=0.35):
    return tuple(int(c * (1 - amt)) for c in rgb)


def pick_theme(date, members):
    ids = [mid for mid in members if members[mid].get("color")]
    mid = random.Random(date.isoformat()).choice(sorted(ids))
    return members[mid]


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


def active_collabs(date):
    try:
        data = json.loads((ROOT / "data" / "collabs.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    out = []
    for c in data:
        try:
            s = datetime.date.fromisoformat(c.get("start", ""))
            e = datetime.date.fromisoformat(c.get("end", ""))
        except ValueError:
            continue
        if s <= date <= e:
            out.append(c)
    out.sort(key=lambda c: c.get("end", ""))
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
    pad = 4
    out = Image.new("RGBA", (size + pad * 2, size + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(out)
    d.ellipse([0, 0, size + pad * 2, size + pad * 2], fill=ring)
    out.paste(im, (pad, pad), mask)
    return out


def section_label(d, y, text, accent, f_sec):
    d.rounded_rectangle([36, y, 48, y + 26], radius=6, fill=accent)
    d.text((58, y - 2), text, font=f_sec, fill=INK)


def render(date, streams, collabs, members, theme, out_path):
    tcol = hex_to_rgb(theme.get("color", "#75b1c0"))
    tlight = lighten(tcol, 0.72)
    tpale = lighten(tcol, 0.88)
    tdark = darken(tcol, 0.35)

    img = Image.new("RGB", (W, H), (255, 250, 242))
    grad = Image.new("RGB", (1, H))
    top, bottom = (255, 251, 243), tuple(int(c * 0.96) for c in tpale)
    for yy in range(H):
        t = yy / H
        grad.putpixel((0, yy), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    img.paste(grad.resize((W, H)))
    d = ImageDraw.Draw(img, "RGBA")
    f_title = ImageFont.truetype(FONT_PATH, 44)
    f_date = ImageFont.truetype(FONT_PATH, 28)
    f_sec = ImageFont.truetype(FONT_PATH, 24)
    f_time = ImageFont.truetype(FONT_PATH, 26)
    f_name = ImageFont.truetype(FONT_PATH, 28)
    f_body = ImageFont.truetype(FONT_PATH, 24)
    f_small = ImageFont.truetype(FONT_PATH, 22)

    # --- 背景コンフェッティ(テーマ色混じり) ---
    pastel = [tlight + (110,), (255, 225, 170, 110), (180, 220, 245, 110),
              (200, 230, 185, 110), (220, 200, 240, 110)]
    dots = [(60, 210), (110, 570), (450, 24), (760, 30), (1085, 110), (1150, 430),
            (90, 440), (620, 648), (980, 630)]
    for i, (x, y) in enumerate(dots):
        c = pastel[i % len(pastel)]
        d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=c)
    star(d, 200, 168, 14, tcol + (150,))
    star(d, 1010, 545, 12, (247, 143, 192, 150))
    star(d, 1120, 250, 11, (126, 200, 255, 150))
    heart(d, 80, 625, 24, tlight + (140,))
    heart(d, 1130, 80, 20, (255, 170, 185, 130))

    # --- ヘッダー(日替わりテーマ帯) ---
    hb = Image.new("RGB", (W - 72, 118), tcol)
    for xx in range(W - 72):
        t = xx / (W - 72)
        c = tuple(int(tcol[i] + (tlight[i] - tcol[i]) * t * 0.55) for i in range(3))
        for yy in range(118):
            hb.putpixel((xx, yy), c)
    mask = Image.new("L", (W - 72, 118), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 72, 118], radius=28, fill=255)
    img.paste(hb, (36, 24), mask)
    d = ImageDraw.Draw(img, "RGBA")
    d.text((70, 36), "本日の配信・イベント情報", font=f_title, fill=(255, 255, 255),
           stroke_width=1, stroke_fill=tdark)
    datestr = f"{date.year}年{date.month}月{date.day}日({WEEK_JP[date.weekday()]})"
    tw = d.textlength(datestr, font=f_date)
    d.rounded_rectangle([70, 94, 70 + tw + 34, 128], radius=17, fill=(255, 255, 255, 235))
    d.text((87, 96), datestr, font=f_date, fill=tdark)
    logo_path = ROOT / "images" / "rogo" / "Milli Orbis-rogo.png"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        lw, lh = logo.size
        scale = 48 / lh
        logo = logo.resize((int(lw * scale), 48))
        white = Image.new("RGBA", (logo.width + 26, 70), (255, 255, 255, 235))
        wmask = Image.new("L", white.size, 0)
        ImageDraw.Draw(wmask).rounded_rectangle([0, 0, *white.size], radius=18, fill=255)
        img.paste(white, (W - 36 - white.width - 10, 50), wmask)
        img.paste(logo, (W - 36 - white.width - 10 + 13, 61), logo)

    y = 158
    y_max = H - 66

    # --- 表示件数の決定(上限内に収める) ---
    if collabs:
        n_s, n_c = 4, 2
    else:
        n_s, n_c = 5, 3
    if not streams:
        n_c = 3
    shown_s = streams[:n_s]
    shown_c = collabs[:n_c]
    rest_s = len(streams) - len(shown_s)
    rest_c = len(collabs) - len(shown_c)

    # --- コンテンツ全体を垂直中央寄せ ---
    total_h = 34 + max(len(shown_s), 1) * 66
    if collabs:
        total_h += 32 + len(shown_c) * 52
    if rest_s > 0 or rest_c > 0:
        total_h += 44
    y = 158 + max(0, (y_max - 158 - total_h) // 2)

    # --- 配信セクション ---
    section_label(d, y, "配信", tcol, f_sec)
    y += 34
    if not shown_s:
        d.text((58, y + 8), "本日の配信予定はありません", font=f_body, fill=MUTED)
        y += 66
    else:
        for st in shown_s:
            m = members.get(st["memberId"], {})
            color = hex_to_rgb(m.get("color", "#75b1c0"))
            name = m.get("name") or st["member"] or st["memberId"]
            d.rounded_rectangle([36, y, W - 36, y + 58], radius=18, fill=CARD,
                                outline=(235, 210, 195), width=2)
            icon_file = (ROOT / m.get("icon", "")) if m.get("icon") else None
            if icon_file and icon_file.exists():
                try:
                    badge = circle_icon(icon_file, 40, color)
                    img.paste(badge, (48, y + 5), badge)
                except OSError:
                    d.ellipse([50, y + 9, 98, y + 57], fill=color)
            else:
                d.ellipse([50, y + 9, 98, y + 57], fill=color)
            pill_c = LIVE_RED if st["live"] else color
            label = ("LIVE " if st["live"] else "") + st["time"]
            pw = max(108, int(d.textlength(label, font=f_time)) + 32)
            d.rounded_rectangle([112, y + 11, 112 + pw, y + 47], radius=18, fill=pill_c)
            tx = 112 + (pw - d.textlength(label, font=f_time)) / 2
            d.text((tx, y + 13), label, font=f_time, fill=(255, 255, 255))
            nx = 112 + pw + 14
            d.text((nx, y + 12), truncate(d, name, f_name, 175), font=f_name, fill=INK)
            d.text((nx + 190, y + 15), truncate(d, st["title"], f_body, W - 36 - (nx + 190) - 18),
                   font=f_body, fill=(100, 85, 72))
            y += 66

    # --- イベント・コラボセクション ---
    if collabs:
        section_label(d, y, "イベント・コラボ", (232, 160, 60), f_sec)
        y += 32
        for c in shown_c:
            ccol = hex_to_rgb(c.get("color", "#E8A03C"))
            d.rounded_rectangle([36, y, W - 36, y + 46], radius=16, fill=CARD,
                                outline=(240, 220, 190), width=2)
            d.rounded_rectangle([36, y, 50, y + 46], radius=8, fill=ccol)
            d.rectangle([43, y, 50, y + 46], fill=ccol)
            pill = "コラボ"
            pw2 = int(d.textlength(pill, font=f_body)) + 30
            d.rounded_rectangle([64, y + 8, 64 + pw2, y + 38], radius=15, fill=ccol)
            d.text((64 + 15, y + 10), pill, font=f_body, fill=(255, 255, 255))
            tx0 = 64 + pw2 + 14
            try:
                e = datetime.date.fromisoformat(c["end"])
                period = f"〜{e.month}/{e.day}まで"
            except (ValueError, KeyError):
                period = ""
            pw3 = d.textlength(period, font=f_small)
            title = truncate(d, f"{c.get('shop','')} {c.get('title','')}".strip(), f_body,
                             W - 36 - tx0 - pw3 - 40)
            d.text((tx0, y + 9), title, font=f_body, fill=INK)
            d.text((W - 36 - pw3 - 14, y + 12), period, font=f_small, fill=MUTED)
            y += 52

    # --- 残り件数 ---
    notes = []
    if rest_s > 0:
        notes.append(f"配信他{rest_s}件")
    if rest_c > 0:
        notes.append(f"イベント他{rest_c}件")
    if notes:
        more = "・".join(notes) + "はサイトでチェック！"
        mw = d.textlength(more, font=f_body)
        d.rounded_rectangle([W / 2 - mw / 2 - 22, y + 2, W / 2 + mw / 2 + 22, y + 38],
                            radius=18, fill=(255, 255, 255, 220),
                            outline=ACCENT, width=2)
        d.text(((W - mw) / 2, y + 6), more, font=f_body, fill=(70, 130, 145))

    # --- 配信ゼロ & イベントゼロ ---
    if not shown_s and not collabs:
        yy = 250
        d.rounded_rectangle([36, yy, W - 36, yy + 170], radius=24, fill=CARD,
                            outline=(235, 210, 195), width=3)
        msg = "本日の配信・イベント情報はありません"
        f_msg = ImageFont.truetype(FONT_PATH, 38)
        tw = d.textlength(msg, font=f_msg)
        d.text(((W - tw) / 2, yy + 48), msg, font=f_msg, fill=INK)
        sub = "見つけたらサイトでチェック！"
        sw = d.textlength(sub, font=f_body)
        d.text(((W - sw) / 2, yy + 108), sub, font=f_body, fill=MUTED)
        star(d, 130, yy + 85, 20, (247, 203, 14, 200))
        star(d, W - 130, yy + 85, 20, (247, 143, 192, 200))

    # --- フッター ---
    f_note = ImageFont.truetype(FONT_PATH, 20)
    f_wm = ImageFont.truetype(FONT_PATH, 18)
    note = "今朝6:00時点の情報です"
    d.text((36, H - 48), note, font=f_note, fill=MUTED)
    wm = "※非公式ファンメイド | Milli Orbis"
    ww = d.textlength(wm, font=f_wm)
    d.text((W - ww - 24, H - 46), wm, font=f_wm, fill=WATERMARK)

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)
    print(f"saved: {out} ({len(shown_s)} streams, theme={theme.get('name')})")


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
    collabs = active_collabs(date)
    theme = pick_theme(date, members)
    render(date, streams, collabs, members, theme, ROOT / args.out)


if __name__ == "__main__":
    sys.exit(main())
