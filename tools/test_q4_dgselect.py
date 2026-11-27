#!/usr/bin/env python3
"""Q4-2D ダンジョン選択: バッジ・次の目標カード"""
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = 0
def check(n, c, d=''):
    global F
    print('PASS' if c else 'FAIL', n, '' if c else d)
    F += 0 if c else 1
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(400)
    def show(cleared):
        pg.evaluate("""(c) => { const R = window.__rogue; G.tutorial = { done: true }; G._charSelectOpen = false; G.p.cleared = c; G.run = null; G.view = 'dungeon'; R.renderAll(); }""", cleared)
        pg.wait_for_timeout(80)
    show({})
    t = pg.inner_text('#dg-list')
    check('新規: 次の目標カードがA初級', '次の目標' in t and 'ダンジョンA' in t)
    check('新規: おすすめバッジが1つ', pg.locator('.b-rec').count() == 1)
    check('新規: 未解放バッジあり', pg.locator('.b-lock').count() >= 1)
    show({'A': {'novice': True}})
    check('一部踏破バッジ', pg.locator('.b-part').count() == 1)
    check('次の目標が更新(Aの次難易度)', 'ダンジョンA' in pg.inner_text('.dg-goal'))
    pg.evaluate("() => { const R = window.__rogue; G.p.cleared = { A: Object.fromEntries(R.DIFFS.map(d => [d.id, true])) }; R.renderAll(); }")
    pg.wait_for_timeout(80)
    check('全踏破バッジ', pg.locator('.b-done').count() >= 1)
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: ' + ('OK' if not F else 'NG')); sys.exit(1 if F else 0)
