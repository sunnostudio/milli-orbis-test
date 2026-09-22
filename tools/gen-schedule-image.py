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

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "tools" / "fonts"
FONT_FALLBACK = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"

W, H = 1200, 675
INK = (45, 40, 38)
MUTED = (135, 125, 118)
WATERMARK = (165, 150, 140)
LIVE_RED = (230, 70, 85)

WEEK_JP = ["月", "火", "水", "木", "金", "土", "日"]


def font(weight, size):
    p = FONT_DIR / f"MPLUSRounded1c-{weight}.ttf"
    if p.exists():
        return ImageFont.truetype(str(p), size)
    return ImageFont.truetype(FONT_FALLBACK, size)


def load_members():
    src = (ROOT / "data.js").read_text(encoding="utf-8")
    info = {}
    for m in re.finditer(
        r'id:\s*"(\w+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?color:\s*"([^"]+)"[\s\S]*?icon:\s*"([^"]*)"',
        src,
    ):
        mid, name, color, icon = m.group(1), m.group(2), m.group(3), m.group(4)
        if mid not in info:
            fan = re.search(r'fanName:\s*"([^"]*)"', m.group(0))
            info[mid] = {
                "name": name,
                "color": color,
                "icon": urllib.parse.unquote(icon),
                "fan": fan.group(1) if fan else "",
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


def load_launchers():
    src = (ROOT / "data.js").read_text(encoding="utf-8")
    m = re.search(r"const LAUNCHERS = \[(.*?)\];", src, re.S)
    out = []
    if not m:
        return out
    for e in re.finditer(
        r'\{\s*icon:\s*"([^"]*)".*?name:\s*"([^"]+)".*?desc:\s*"([^"]+)".*?url:\s*"([^"]*)"',
        m.group(1),
    ):
        icon, name, desc, url = e.groups()
        if not url:
            continue
        out.append(
            {"icon": urllib.parse.unquote(icon), "name": name, "desc": desc, "url": url}
        )
    return out


def load_fortune():
    try:
        return json.loads((ROOT / "data" / "fortune.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"millilis": None, "messages": {}}


def pick_fortune(date, members, fdata):
    """推し運勢1位: ファンネーム設定済み + ミリリスから日付シードで1枠抽選。"""
    pool = []
    for mid, m in members.items():
        if m.get("fan"):
            pool.append({"key": mid, "fan": m["fan"], "color": m.get("color", "#75b1c0")})
    mili = fdata.get("millilis")
    if mili:
        pool.append({"key": "_millilis", "fan": mili.get("fan", "ミリリス"),
                     "color": mili.get("color", "#75b1c0")})
    if not pool:
        return None
    pool.sort(key=lambda p: p["key"])
    win = random.Random("fortune" + date.isoformat()).choice(pool)
    msgs = fdata.get("messages", {}).get(win["key"])
    if win["key"] == "_millilis":
        msgs = mili.get("messages", [])
    if not msgs:
        msgs = ["今日も推し活日和"]
    msg = random.Random("fortunemsg" + date.isoformat() + win["key"]).choice(msgs)
    return {"fan": win["fan"], "msg": msg, "color": win["color"]}


def pick_promos(date, members):
    """配信なし時の穴埋め: 自サイト宣伝1件 + 販売中グッズ1件(日付シードで決定的)。"""
    rng = random.Random("promo" + date.isoformat())
    promos = []
    launchers = load_launchers()
    if launchers:
        l = rng.choice(launchers)
        host = re.sub(r"^https?://", "", l["url"]).rstrip("/").split("/")[0]
        promos.append(
            {
                "kind": "site",
                "badge": "オススメ",
                "title": l["name"],
                "sub": l["desc"],
                "meta": host,
                "icon": l["icon"],
                "shape": None,
                "color": "#4FA3E0",
            }
        )
    try:
        goods = json.loads((ROOT / "data" / "goods-fetched.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        goods = []
    goods = [g for g in goods if g.get("name") and g.get("price")]
    if goods:
        g = rng.choice(goods)
        mname = members.get(g.get("memberId", ""), {}).get("name", "")
        sub = f"¥{g['price']:,}" + (f"｜{mname}" if mname else "")
        promos.append(
            {
                "kind": "goods",
                "badge": "販売中",
                "title": g["name"],
                "sub": sub,
                "meta": "shop.milpr.com",
                "icon": "",
                "shape": ("グ", None),
                "color": "#E8A03C",
            }
        )
    return promos


def star(draw, cx, cy, r, color):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * 0.45
        a = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    draw.polygon(pts, fill=color)


def truncate(draw, text, fnt, max_w):
    if draw.textlength(text, font=fnt) <= max_w:
        return text
    while text and draw.textlength(text + "…", font=fnt) > max_w:
        text = text[:-1]
    return text + "…"


def draw_pill(draw, x, y, text, fnt, fill, fg=(255, 255, 255), pad_x=15, h=None):
    """文字を光学中央に収めたピルを描画し、幅を返す。"""
    if h is None:
        h = fnt.size + 14
    tw = draw.textlength(text, font=fnt)
    draw.rounded_rectangle([x, y, x + tw + pad_x * 2, y + h], radius=h // 2, fill=fill)
    draw.text((x + pad_x, y + h / 2), text, font=fnt, fill=fg, anchor="lm")
    return tw + pad_x * 2


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


def soft_blob(base, cx, cy, r, color, alpha=60):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color + (alpha,))
    layer = layer.filter(ImageFilter.GaussianBlur(r // 2))
    base.alpha_composite(layer)


def card(base, box, radius=24, fill=(255, 255, 255, 255)):
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle(
        [x0, y0 + 5, x1, y1 + 5], radius=radius, fill=(70, 60, 55, 38)
    )
    sh = sh.filter(ImageFilter.GaussianBlur(7))
    base.alpha_composite(sh)
    ImageDraw.Draw(base).rounded_rectangle(box, radius=radius, fill=fill)


def render(date, streams, collabs, promos, fortune, members, theme, out_path):
    tcol = hex_to_rgb(theme.get("color", "#75b1c0"))
    tsoft = lighten(tcol, 0.82)
    tdark = darken(tcol, 0.38)

    img = Image.new("RGBA", (W, H), (250, 247, 243, 255))
    # 背景: ブロブ + リング + プラス + 星(別レイヤーで正しく合成)
    def ring(draw, cx, cy, r, color, w=4):
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=w)

    def plus(draw, cx, cy, s, color, w=4):
        draw.line([cx - s, cy, cx + s, cy], fill=color, width=w)
        draw.line([cx, cy - s, cx, cy + s], fill=color, width=w)

    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    ring(d, 1050, 130, 64, tcol + (46,), 5)
    ring(d, 1050, 130, 40, tcol + (60,), 3)
    ring(d, 120, 560, 52, tcol + (40,), 4)
    ring(d, 620, 640, 34, (240, 180, 120, 70), 3)
    plus(d, 560, 60, 12, tcol + (90,), 5)
    plus(d, 80, 320, 10, (240, 170, 190, 110), 5)
    plus(d, 1130, 480, 11, tcol + (80,), 5)
    star(d, 965, 250, 13, tcol + (120,))
    star(d, 210, 610, 15, (240, 175, 95, 140))
    star(d, 700, 90, 9, (240, 180, 120, 120))
    for gx in range(60, W, 120):
        d.ellipse([gx - 2, 622 - 2, gx + 2, 622 + 2], fill=(0, 0, 0, 12))
    img.alpha_composite(ov)
    soft_blob(img, 140, 80, 200, tcol, 52)
    soft_blob(img, 1070, 590, 220, tcol, 44)
    soft_blob(img, 1090, 140, 110, (255, 190, 205), 55)
    d = ImageDraw.Draw(img)

    f_title = font("ExtraBold", 46)
    f_date = font("Bold", 27)
    f_sec = font("Bold", 23)
    f_time = font("Bold", 26)
    f_name = font("Bold", 29)
    f_body = font("Medium", 24)
    f_small = font("Regular", 21)
    f_note = font("Regular", 19)

    # --- ヘッダー ---
    card(img, [36, 26, W - 36, 146], radius=30)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([36, 26, 52, 146], radius=12, fill=tcol)
    d.rectangle([44, 26, 52, 146], fill=tcol)
    f_en = font("Bold", 17)
    d.text((76, 34), "MILLI ORBIS — DAILY INFO", font=f_en, fill=tdark)
    title = "本日の配信・イベント情報"
    d.text((74, 52), title, font=f_title, fill=INK)
    title_w = d.textlength(title, font=f_title)
    datestr = f"{date.month}/{date.day}({WEEK_JP[date.weekday()]})"
    tw = d.textlength(datestr, font=f_date)
    px0 = 76 + title_w + 22
    d.rounded_rectangle([px0, 58, px0 + tw + 32, 96], radius=19, fill=tcol)
    d.text((px0 + 16, 60), datestr, font=f_date, fill=(255, 255, 255))
    logo_path = ROOT / "images" / "rogo" / "Milli Orbis-rogo.png"
    if logo_path.exists():
        logo = Image.open(logo_path).convert("RGBA")
        lw, lh = logo.size
        scale = 40 / lh
        logo = logo.resize((int(lw * scale), 40))
        img.paste(logo, (W - 36 - logo.width - 26, 100), logo)

    y = 162
    y_max = H - 62

    if collabs:
        n_s, n_c = 3, 2
    else:
        n_s, n_c = 5, 3
    if not streams:
        n_c = 3
    shown_s = streams[:n_s]
    shown_c = collabs[:n_c]
    rest_s = len(streams) - len(shown_s)
    rest_c = len(collabs) - len(shown_c)

    if shown_s:
        stream_h = len(shown_s) * 68
    elif promos:
        stream_h = 32 + len(promos) * 68
    else:
        stream_h = 68
    total_h = 32 + stream_h
    if collabs:
        total_h += 30 + len(shown_c) * 52
    if rest_s > 0 or rest_c > 0:
        total_h += 42
    if fortune:
        total_h += 48
    y = 162 + max(0, (y_max - 162 - total_h) // 2)

    f_sec_en = font("Bold", 15)

    def section(text, en, accent):
        d.rounded_rectangle([36, y, 36 + 10, y + 26], radius=5, fill=accent)
        d.text((52, y - 1), text, font=f_sec, fill=INK)
        jw = d.textlength(text, font=f_sec)
        d.text((52 + jw + 10, y + 5), en, font=f_sec_en, fill=accent)

    # --- 配信セクション ---
    section("配信", "STREAM", tcol)
    y += 32
    if not shown_s:
        if promos:
            section("ピックアップ", "PICKUP", (79, 163, 224))
            y += 30
            for p in promos:
                pcol = hex_to_rgb(p.get("color", "#4FA3E0"))
                card(img, [36, y, W - 36, y + 58], radius=20)
                d = ImageDraw.Draw(img)
                icon_file = (ROOT / p["icon"]) if p.get("icon") else None
                if icon_file and icon_file.exists():
                    try:
                        badge = circle_icon(icon_file, 40, pcol)
                        img.paste(badge, (48, y + 5), badge)
                        d = ImageDraw.Draw(img)
                    except OSError:
                        d.ellipse([50, y + 9, 98, y + 57], fill=pcol)
                else:
                    d.ellipse([50, y + 9, 98, y + 57], fill=pcol)
                    if p.get("shape"):
                        ch, _ = p["shape"]
                        cw = d.textlength(ch, font=f_name)
                        d.text((74 - cw / 2, y + 11), ch, font=f_name, fill=(255, 255, 255))
                bw = draw_pill(d, 112, y + 14, p["badge"], f_body, pcol)
                nx = 112 + bw + 14
                mw = d.textlength(p.get("meta", ""), font=f_small)
                d.text((nx, y + 8), truncate(d, p["title"], f_name, W - 36 - nx - mw - 30),
                       font=f_name, fill=INK)
                d.text((nx, y + 36), truncate(d, p["sub"], f_small, W - 36 - nx - mw - 30),
                       font=f_small, fill=MUTED)
                if p.get("meta"):
                    d.text((W - 36 - mw - 14, y + 36), p["meta"], font=f_small, fill=MUTED)
                y += 68
        else:
            d.text((52, y + 8), "本日の配信予定はありません", font=f_body, fill=MUTED)
            y += 68
    else:
        for st in shown_s:
            m = members.get(st["memberId"], {})
            color = hex_to_rgb(m.get("color", "#75b1c0"))
            name = m.get("name") or st["member"] or st["memberId"]
            card(img, [36, y, W - 36, y + 58], radius=20)
            d = ImageDraw.Draw(img)
            d.rounded_rectangle([36, y, 46, y + 58], radius=5, fill=color)
            d.rectangle([41, y, 46, y + 58], fill=color)
            icon_file = (ROOT / m.get("icon", "")) if m.get("icon") else None
            if icon_file and icon_file.exists():
                try:
                    badge = circle_icon(icon_file, 40, color)
                    img.paste(badge, (48, y + 5), badge)
                    d = ImageDraw.Draw(img)
                except OSError:
                    d.ellipse([50, y + 9, 98, y + 57], fill=color)
            else:
                d.ellipse([50, y + 9, 98, y + 57], fill=color)
            pill_c = LIVE_RED if st["live"] else color
            label = ("LIVE " if st["live"] else "") + st["time"]
            tw_lab = d.textlength(label, font=f_time)
            pw = max(108, tw_lab + 32)
            d.rounded_rectangle([112, y + 11, 112 + pw, y + 47], radius=18, fill=pill_c)
            d.text((112 + (pw - tw_lab) / 2, y + 29), label, font=f_time,
                   fill=(255, 255, 255), anchor="lm")
            nx = 112 + pw + 14
            d.text((nx, y + 10), truncate(d, name, f_name, 172), font=f_name, fill=INK)
            d.text((nx + 186, y + 14), truncate(d, st["title"], f_body, W - 36 - (nx + 186) - 18),
                   font=f_body, fill=(95, 88, 82))
            y += 68

    # --- イベント・コラボセクション ---
    if collabs:
        section("イベント・コラボ", "EVENT", (232, 160, 60))
        y += 30
        for c in shown_c:
            ccol = hex_to_rgb(c.get("color", "#E8A03C"))
            card(img, [36, y, W - 36, y + 44], radius=16)
            d = ImageDraw.Draw(img)
            d.rounded_rectangle([36, y, 50, y + 44], radius=8, fill=ccol)
            d.rectangle([43, y, 50, y + 44], fill=ccol)
            pill = "コラボ"
            pw2 = draw_pill(d, 62, y + 7, pill, f_body, ccol)
            tx0 = 62 + pw2 + 12
            try:
                e = datetime.date.fromisoformat(c["end"])
                period = f"〜{e.month}/{e.day}まで"
            except (ValueError, KeyError):
                period = ""
            pw3 = d.textlength(period, font=f_small)
            title = truncate(d, f"{c.get('shop','')} {c.get('title','')}".strip(), f_body,
                             W - 36 - tx0 - pw3 - 36)
            d.text((tx0, y + 9), title, font=f_body, fill=INK)
            d.text((W - 36 - pw3 - 12, y + 12), period, font=f_small, fill=MUTED)
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
        d.rounded_rectangle([W / 2 - mw / 2 - 20, y + 2, W / 2 + mw / 2 + 20, y + 36],
                            radius=17, fill=(255, 255, 255),
                            outline=tcol, width=2)
        d.text(((W - mw) / 2, y + 6), more, font=f_body, fill=tdark)

    # --- 配信ゼロ & イベントゼロ & 宣伝ゼロ ---
    if not shown_s and not collabs and not promos:
        yy = 250
        card(img, [36, yy, W - 36, yy + 170], radius=26)
        d = ImageDraw.Draw(img)
        f_msg = font("Bold", 36)
        msg = "本日の配信・イベント情報はありません"
        tw = d.textlength(msg, font=f_msg)
        d.text(((W - tw) / 2, yy + 48), msg, font=f_msg, fill=INK)
        sub = "見つけたらサイトでチェック！"
        sw = d.textlength(sub, font=f_body)
        d.text(((W - sw) / 2, yy + 106), sub, font=f_body, fill=MUTED)
        star(d, 130, yy + 85, 20, (247, 203, 14))
        star(d, W - 130, yy + 85, 20, (247, 143, 192))

    # --- 推し運勢バナー ---
    if fortune:
        fcol = hex_to_rgb(fortune.get("color", "#E8B93C"))
        card(img, [36, y, W - 36, y + 42], radius=15)
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([36, y, 50, y + 42], radius=7, fill=fcol)
        d.rectangle([43, y, 50, y + 42], fill=fcol)
        bw = draw_pill(d, 62, y + 6, "運勢", f_body, fcol, h=30)
        ftext = f"今日の1位：{fortune['fan']}！ {fortune['msg']}"
        ftext = truncate(d, ftext, f_body, W - 36 - (62 + bw + 12) - 60)
        d.text((62 + bw + 12, y + 8), ftext, font=f_body, fill=INK)
        star(d, W - 66, y + 21, 13, fcol)
        y += 48

    # --- フッター ---
    d = ImageDraw.Draw(img)
    d.line([36, H - 52, W - 36, H - 52], fill=tcol + (90,), width=3)
    d.text((36, H - 44), "今朝6:00時点の情報です", font=f_note, fill=MUTED)
    wm = "※非公式ファンメイド | Milli Orbis"
    ww = d.textlength(wm, font=f_note)
    d.text((W - ww - 36, H - 44), wm, font=f_note, fill=WATERMARK)

    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGB").save(out)
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
    promos = pick_promos(date, members) if not streams else []
    fortune = pick_fortune(date, members, load_fortune())
    render(date, streams, collabs, promos, fortune, members, theme, ROOT / args.out)


if __name__ == "__main__":
    sys.exit(main())
