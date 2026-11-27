#!/usr/bin/env python3
"""assets_src/scenes/<ID>.jpg|png（Gemini製の背景。ID は A〜O / T / Y）を WebP 化して
src/assets/scene_images.js（data URI）を生成する。画像を追加したら再実行してビルドする。"""
import base64, io, glob, os
from PIL import Image
root = os.path.join(os.path.dirname(__file__), '..')
rows = []
for f in sorted(glob.glob(os.path.join(root, 'assets_src', 'scenes', '*.*'))):
    k = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert('RGB')
    if im.width > 1280: im = im.resize((1280, round(im.height * 1280 / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=80, method=6)
    rows.append(f"  {k}: 'data:image/webp;base64,{base64.b64encode(buf.getvalue()).decode()}',")
    print(k, im.size, len(buf.getvalue()) // 1024, 'KB')
open(os.path.join(root, 'src', 'assets', 'scene_images.js'), 'w').write(
    '/* 自動生成: tools/make_scene_assets.py（Gemini製 ダンジョン背景 WebP） */\nconst SCENE_IMG = {\n' + '\n'.join(rows) + '\n};\n')
