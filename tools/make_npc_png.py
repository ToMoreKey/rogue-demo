#!/usr/bin/env python3
"""Gemini 製の NPC 表情シート（マゼンタ背景・3列）を切り出して 192x192 PNG にし、
src/assets/npc_portraits.js（data URI）を生成する。
使い方: python3 tools/make_npc_png.py [プレビュー出力ディレクトリ]"""
import sys, io, base64, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

A = '/mnt/user-data/attachments/31418a13-3116-538f-a41a-c3e7861122d7/'
SHEETS = [('guide', '4ce6c586'), ('inn', '0eb4d673'), ('shop', 'fdb37f0b'),
          ('smith', '09c7be2a'), ('bank', 'c95c5696')]
EX = ['normal', 'joy', 'surprise']
S = 192

def keymask(im):
    a = np.asarray(im.convert('RGB')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bg = (r > 150) & (b > 150) & (g < 140) & (abs(r - b) < 100)
    return ~bg

def cut(im):
    w, h = im.size
    m = keymask(im)
    m = ndi.binary_opening(m, iterations=1)
    out = []
    for i in range(3):
        x0, x1 = round(w * i / 3), round(w * (i + 1) / 3)
        sub = m[:, x0:x1]
        lab, n = ndi.label(sub)
        if n == 0: raise SystemExit('empty panel')
        sizes = ndi.sum(sub, lab, range(1, n + 1))
        big = max(sizes)
        keep = np.zeros_like(sub)
        for k, s in enumerate(sizes, 1):
            if s >= big * 0.02: keep |= lab == k
        rgb = np.asarray(im.convert('RGB'))[:, x0:x1]
        out.append((rgb, keep))
    return out

def main():
    prev = sys.argv[1] if len(sys.argv) > 1 else None
    res = {}
    for fac, key in SHEETS:
        im = Image.open(A + key + '-image.png')
        panels = cut(im)
        # 3表情で共通の枠（高さ基準でそろえる）
        boxes = []
        for rgb, k in panels:
            ys, xs = np.where(k); boxes.append((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        top = min(b[1] for b in boxes); bot = max(b[3] for b in boxes)
        H = bot - top
        sc = (S - 8) / max(H, max(b[2] - b[0] for b in boxes))
        res[fac] = {}
        for ex, (rgb, k), bx in zip(EX, panels, boxes):
            rgba = np.dstack([rgb, (k * 255).astype(np.uint8)])
            img = Image.fromarray(rgba, 'RGBA')
            cx = (bx[0] + bx[2]) / 2
            nw, nh = round(img.width * sc), round(img.height * sc)
            img = img.resize((nw, nh), Image.LANCZOS)
            al = np.asarray(img)[..., 3]
            a = np.asarray(img).copy(); a[..., 3] = np.where(al > 128, 255, 0)
            img = Image.fromarray(a, 'RGBA')
            canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
            ox = round(S / 2 - cx * sc); oy = round(S - 4 - bot * sc)
            canvas.paste(img, (ox, oy), img)
            buf = io.BytesIO(); canvas.save(buf, 'PNG', optimize=True)
            res[fac][ex] = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
            if prev:
                os.makedirs(prev, exist_ok=True)
                bgc = Image.new('RGBA', (S, S), (60, 70, 100, 255)); bgc.alpha_composite(canvas)
                bgc.save(f'{prev}/{fac}_{ex}.png')
    js = ['/* 自動生成: tools/make_npc_png.py（Gemini 製 NPC 立ち絵 192x192） */', 'const NPC_PNG = {']
    for fac, d in res.items():
        js.append(f'  {fac}: {{ ' + ', '.join(f'{e}: "{u}"' for e, u in d.items()) + ' },')
    js.append('};')
    open(os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'npc_portraits.js'), 'w').write('\n'.join(js) + '\n')
    print({f: {e: len(u) for e, u in d.items()} for f, d in res.items()})
main()
