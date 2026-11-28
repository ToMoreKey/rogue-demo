#!/usr/bin/env python3
"""src/assets/*.js に埋め込まれた PNG(data URI) を減色して軽量化する（何度実行しても同じ結果）。
使い方: python3 tools/optimize_assets.py [--dry]
  ファイルごとの色数: char_skins 96 / npc_portraits 96 / enemy_images 64 / outfit_images 96 / item_icons 128
  ※ 元画像を差し替えたら、そのファイルに対して再実行する。"""
import re, io, sys, base64, os
from PIL import Image
COLORS = {'char_skins': 96, 'npc_portraits': 96, 'enemy_images': 64, 'outfit_images': 96, 'item_icons': 128}
RE = re.compile(r'data:image/png;base64,([A-Za-z0-9+/=]+)')
def shrink(d, n):
    raw = base64.b64decode(d); im = Image.open(io.BytesIO(raw))
    q = im.convert('RGBA').quantize(colors=n, method=Image.FASTOCTREE, dither=Image.NONE)
    b = io.BytesIO(); q.save(b, 'PNG', optimize=True); out = b.getvalue()
    return base64.b64encode(out if len(out) < len(raw) else raw).decode(), len(raw), min(len(out), len(raw))
def main():
    dry = '--dry' in sys.argv; tb = ta = 0
    base = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'assets')
    for name, n in COLORS.items():
        p = os.path.join(base, name + '.js'); s = open(p, encoding='utf-8').read(); st = [0, 0]
        def rep(m):
            d, a, b = shrink(m.group(1), n); st[0] += a; st[1] += b; return 'data:image/png;base64,' + d
        s2 = RE.sub(rep, s); tb += st[0]; ta += st[1]
        print(f'{name}: {st[0]//1024}KB -> {st[1]//1024}KB ({n}色)')
        if not dry: open(p, 'w', encoding='utf-8').write(s2)
    print(f'合計: {tb//1024}KB -> {ta//1024}KB')
main()
