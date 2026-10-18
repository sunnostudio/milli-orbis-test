#!/usr/bin/env python3
"""cur_util.py — CUR/ICO を透過付き RGBA で展開する共有ユーティリティ。

Pillow は 32bpp+アルファのカーソルだけ RGBA で返し、24bpp+ANDマスク形式
(Windows標準の古い形式) は RGB(背景透過なし・黒ベタ) で返すため、
配布zip/png/告知画像の生成で透過が失われる。本モジュールは DIB を自前デコードし
ANDマスク(1=透過)を適用して正しい RGBA を返す。

使い方:
    from cur_util import load_cur_rgba
    im = load_cur_rgba("images/cursors/aoi/arrow.cur")  # -> PIL.Image RGBA
"""
import pathlib
import struct

from PIL import Image

_SUPPORTED_BPP = (1, 4, 8, 16, 24, 32)


def load_cur_rgba(path):
    """CUR/ICO ファイルを (w, h, RGBA) で返す。

    - 32bpp: ディレクトリ/ALPHAチャンネルを直接デコード
    - 24bpp/8bpp等: パレット展開＋ANDマスクをアルファに適用
    - いずれも ANDマスク(存在すれば)で「1=透過」を反映
    """
    p = pathlib.Path(path)
    data = p.read_bytes()
    if len(data) < 6 + 16:
        raise ValueError(f"{p}: too small for a cursor file")
    _reserved, typ, count = struct.unpack_from("<HHH", data, 0)
    if typ not in (1, 2) or count < 1:
        raise ValueError(f"{p}: not a cursor/icon (type={typ}, count={count})")

    w, h, _colors, _res, hotspot_x, hotspot_y, _size, offset = struct.unpack_from(
        "<BBBBHHII", data, 6)
    if offset + 40 > len(data):
        raise ValueError(f"{p}: bad image offset {offset}")
    (bi_size, bi_w, bi_h, _planes, bpp, _comp, _imgsize,
     _xppm, _yppm, clr_used, _clr_important) = struct.unpack_from(
        "<IiiHHIIiiII", data, offset)
    if bi_size < 40:
        raise ValueError(f"{p}: unsupported DIB header (biSize={bi_size})")
    if bpp not in _SUPPORTED_BPP:
        raise ValueError(f"{p}: unsupported bit count {bpp}")

    xor_w = w or 256
    xor_h = h or 256
    px_off = offset + bi_size

    # パレット (1/4/8bpp)
    palette = []
    if bpp <= 8:
        n_colors = clr_used or (1 << bpp)
        for i in range(n_colors):
            b, g, r, _a = data[px_off + i * 4: px_off + i * 4 + 4]
            palette.append((r, g, b))
        px_off += n_colors * 4

    stride = ((xor_w * bpp + 31) // 32) * 4
    bottom_up = bi_h > 0
    need = px_off + stride * xor_h
    if need > len(data):
        raise ValueError(f"{p}: truncated pixel data (need {need}, have {len(data)})")

    img = Image.new("RGBA", (xor_w, xor_h), (0, 0, 0, 0))
    out = img.load()
    alpha_seen = set()
    for y in range(xor_h):
        sy = (xor_h - 1 - y) if bottom_up else y
        row = data[px_off + sy * stride: px_off + sy * stride + stride]
        for x in range(xor_w):
            if bpp == 32:
                b, g, r, a = row[x * 4: x * 4 + 4]
                alpha_seen.add(a)
            elif bpp == 24:
                b, g, r = row[x * 3: x * 3 + 3]
                a = 255
            elif bpp == 8:
                r, g, b = palette[row[x]]
                a = 255
            elif bpp == 4:
                byte = row[x >> 1]
                idx = (byte >> 4) if (x & 1) == 0 else (byte & 15)
                r, g, b = palette[idx]
                a = 255
            elif bpp == 1:
                byte = row[x >> 3]
                idx = (byte >> (7 - (x & 7))) & 1
                r, g, b = palette[idx]
                a = 255
            else:  # 16bpp (555)
                v = row[x * 2] | (row[x * 2 + 1] << 8)
                r = ((v >> 10) & 31) * 255 // 31
                g = ((v >> 5) & 31) * 255 // 31
                b = (v & 31) * 255 // 31
                a = 255
            out[x, y] = (r, g, b, a)

    # ANDマスク (1 = 透明)。
    # - 32bpp で実アルファ(0と255以外、または混合)がある場合はWindows/Pillow同様
    #   アルファチャンネルを優先しマスクは無効化。
    # - それ以外(24bpp/8bpp、32bppだがアルファ情報なし)はマスクを適用。
    apply_mask = True
    if bpp == 32 and alpha_seen and (alpha_seen - {0, 255} or (0 in alpha_seen and 255 in alpha_seen)):
        apply_mask = False
    mask_h = bi_h - xor_h if bi_h > xor_h else 0
    if apply_mask and mask_h > 0:
        m_stride = ((xor_w + 31) // 32) * 4
        m_off = px_off + stride * xor_h
        if m_off + m_stride * mask_h <= len(data):
            for y in range(min(mask_h, xor_h)):
                sy = (xor_h - 1 - y) if bottom_up else y
                row = data[m_off + sy * m_stride: m_off + sy * m_stride + m_stride]
                for x in range(xor_w):
                    if row[x >> 3] & (0x80 >> (x & 7)):
                        r, g, b, _a = out[x, y]
                        out[x, y] = (r, g, b, 0)
    return img


def load_cursor_rgba(path):
    """32bppはPillowと同結果、24bpp等はANDマスク適用済みのRGBAを返す。"""
    return load_cur_rgba(path)
