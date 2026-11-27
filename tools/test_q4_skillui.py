#!/usr/bin/env python3
"""Q4-2A スキル画面: 次の習得表示・戦闘力プレビューが状態を壊さない・スロット説明"""
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = 0
def check(n, c, d=''):
    global F
    print('PASS' if c else 'FAIL', n, '' if c else d); F += 0 if c else 1
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(400); ev = pg.evaluate
    ev("() => { G.tutorial = { done: true }; G._charSelectOpen = false; G.run = null; G.p.sp = 10; G.view='status'; G.statusTab='skill'; __rogue.renderAll(); }")
    before = ev("() => JSON.stringify([G.p.skillPts, Object.keys(G.p.skills), G.p.equippedSkills])")
    pw_before = ev("() => __rogue.playerPower ? __rogue.playerPower(G.p) : 0")
    check('次の習得が表示される', pg.locator('.st-next').count() >= 1 and '次の習得' in pg.inner_text('.st-next'))
    after = ev("() => JSON.stringify([G.p.skillPts, Object.keys(G.p.skills), G.p.equippedSkills])")
    check('プレビューで状態が変わらない', before == after)
    ev("() => { const t = Object.keys(G.p.skillPts)[0]; G.p.skillPts[t] = 3; __rogue.syncActiveCharState(G.p); const id = Object.keys(G.p.skills)[0]; if (id) G.p.equippedSkills[0] = id; __rogue.renderAll(); }")
    check('装備スロットに効果説明', pg.locator('.sk-slot-desc').count() >= 1 or ev("() => !Object.keys(G.p.skills).length"))
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: ' + ('OK' if not F else 'NG')); sys.exit(1 if F else 0)
