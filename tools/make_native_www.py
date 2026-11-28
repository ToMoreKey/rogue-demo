#!/usr/bin/env python3
"""Capacitor 用の www/ を作る（本番ビルドの index.html とアイコン類を集める）。
  python3 tools/make_native_www.py [出力先=native/www]
本番ビルド（--variant なし）であることを確認してから使うこと。"""
import os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'native', 'www')
html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
if 'rogue_dev_' in html or 'dev-badge' in html or '[TEST]' in html:
    sys.exit('index.html がテスト版ビルドです。python3 tools/build.py（本番）でビルドし直してください')
if os.path.exists(out): shutil.rmtree(out)
os.makedirs(out)
for f in ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'privacy.html']:
    shutil.copy2(os.path.join(ROOT, f), os.path.join(out, f))
os.makedirs(os.path.join(out, 'data'), exist_ok=True)
shutil.copy2(os.path.join(ROOT, 'data', 'ranking.json'), os.path.join(out, 'data', 'ranking.json'))
print('www ready:', out)
