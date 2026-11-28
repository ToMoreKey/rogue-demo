#!/usr/bin/env python3
"""Google Play 用フィーチャーグラフィック（1024x500）を docs/store/feature_graphic.png に作る。"""
import os, base64
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
icon = base64.b64encode(open(ROOT + '/icon-512.png', 'rb').read()).decode()
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 400, 'height': 800})
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(800)
    imgs = pg.evaluate("() => [...document.querySelectorAll('[data-act=\"selectStartChar\"] img')].map(i => i.src)")
    bg = pg.evaluate("() => { const e = document.querySelector('.plaza-bg, .view-hero'); return '' }")
    print(len(imgs), 'chars')
    page = b.new_page(viewport={'width': 1024, 'height': 500})
    ch = ''.join(f'<img src="{s}" style="height:150px;width:auto;image-rendering:pixelated;margin:0 -4px;filter:drop-shadow(0 6px 10px #000a)">' for s in imgs)
    page.set_content(f'''<html><body style="margin:0;width:1024px;height:500px;overflow:hidden;position:relative;
      background:radial-gradient(ellipse at 70% 30%,#3b2a5e 0%,#1b2440 45%,#0b1220 100%);font-family:'Noto Sans CJK JP','Noto Sans CJK SC',sans-serif;color:#f6e7b4">
      <div style="position:absolute;inset:0;background:radial-gradient(circle at 20% 80%,#e8c87233,transparent 40%)"></div>
      <img src="data:image/png;base64,{icon}" style="position:absolute;left:56px;top:70px;width:120px;height:120px;border-radius:26px;box-shadow:0 8px 24px #000a">
      <div style="position:absolute;left:200px;top:62px;font-size:62px;font-weight:900;letter-spacing:4px;text-shadow:0 4px 0 #5a3a00,0 8px 20px #000a">鐘鳴りのダンジョン</div>
      <div style="position:absolute;left:204px;top:146px;font-size:26px;color:#cfe0f5;letter-spacing:2px">鐘の音を取り戻せ。ひとり、また一歩。</div>
      <div style="position:absolute;left:60px;top:250px;font-size:22px;line-height:1.9;color:#e6edf3">
        ✦ 自動戦闘で進む、ローグライクRPG<br>✦ 4人の勇者とルート式スキルで育成<br>✦ 全15ダンジョンと無限回廊</div>
      <div style="position:absolute;right:12px;bottom:12px;display:flex;align-items:flex-end">{ch}</div>
    </body></html>''')
    page.wait_for_timeout(500); page.screenshot(path=ROOT + '/docs/store/feature_graphic.png'); b.close()
