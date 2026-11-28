#!/usr/bin/env python3
"""特別衣装の立ち絵を src/assets/outfit_images.js に埋め込む。
使い方: python3 tools/make_outfit_assets.py <画像フォルダ>
  フォルダ内のPNGを「<衣装キー>_<キャラID>.png」（立ち絵）と「<衣装キー>_<キャラID>_atk.png」（攻撃ポーズ・任意）で置く。
  衣装キー: sailor / blazer / nurse / swim / towel   キャラID: ruby / stella / silia / chloe
  例: swim_ruby.png, swim_ruby_atk.png
画像は192x192に縮小し、透過PNGとして軽量化（パレット化）して埋め込む。"""
import sys, os, re, io, base64, json
from PIL import Image
KEYS = {'sailor', 'blazer', 'nurse', 'swim', 'towel'}; SKINS = {'ruby', 'stella', 'silia', 'chloe'}
def enc(path):
    im = Image.open(path).convert('RGBA')
    bbox = im.getbbox()
    if bbox is None: raise SystemExit('空の画像: ' + path)
    im = im.resize((192, 192), Image.LANCZOS) if im.size != (192, 192) else im
    q = im.convert('RGBA').quantize(colors=128, method=Image.FASTOCTREE, dither=Image.NONE)
    buf = io.BytesIO(); q.save(buf, 'PNG', optimize=True)
    return 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
def main():
    src = sys.argv[1]
    out = {}
    for fn in sorted(os.listdir(src)):
        m = re.fullmatch(r'(\w+?)_(ruby|stella|silia|chloe)(_atk)?\.png', fn)
        if not m or m.group(1) not in KEYS: print('skip', fn); continue
        k = m.group(1) + '_' + m.group(2)
        out.setdefault(k, {})['atk' if m.group(3) else 'img'] = enc(os.path.join(src, fn))
    out = {k: v for k, v in out.items() if 'img' in v}
    dst = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'assets', 'outfit_images.js')
    # 既存分とマージ
    old = {}
    if os.path.exists(dst):
        t = open(dst, encoding='utf-8').read(); m = re.search(r'const OUTFIT_IMG = (\{.*\});', t, re.S)
        if m and m.group(1).strip() != '{}': old = json.loads(m.group(1))
    old.update(out)
    open(dst, 'w', encoding='utf-8').write('/* 特別衣装の立ち絵（tools/make_outfit_assets.py が生成）。キー: <衣装キー>_<キャラID> → { img, atk? } */\nconst OUTFIT_IMG = ' + json.dumps(old, ensure_ascii=False) + ';\n')
    print('埋め込み:', ', '.join(sorted(old)), f'（{os.path.getsize(dst)//1024}KB）')
main()
