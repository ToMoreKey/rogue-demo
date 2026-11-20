#!/usr/bin/env python3
"""長いモーダル（図鑑・実績など）で、閉じるボタンが常に画面内に見えるテスト。
  python3 tools/test_modal_close.py
"""
import os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FAILS = 0


def check(name, ok, info=''):
    global FAILS
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ' ' + str(info)))
    if not ok:
        FAILS += 1


VISIBLE = '''() => { const b = document.querySelector("#m-sheet [data-act=closeTowerModal]"); if (!b) return null;
  const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.height > 20; }'''

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w, h in ((420, 700), (360, 640), (390, 560)):
        pg = b.new_page(viewport={'width': w, 'height': h})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto('file://' + os.path.join(ROOT, 'index.html'))
        pg.wait_for_timeout(500)
        pg.evaluate('() => { G.tutorial = { done: true }; document.getElementById("nav-status").click(); }')
        pg.evaluate('() => document.querySelector("[data-act=openDex]").click()')
        pg.wait_for_timeout(300)
        for tab in ('enemies', 'items', 'ach'):
            pg.evaluate('(t) => document.querySelector("[data-act=dexTab][data-tab=" + t + "]").click()', tab)
            pg.wait_for_timeout(250)
            check(f'{w}x{h} 図鑑 {tab}: 閉じるが画面内', pg.evaluate(VISIBLE) is True)
        pg.evaluate('() => document.querySelector("#m-sheet [data-act=closeTowerModal]").click()')
        pg.wait_for_timeout(200)
        check(f'{w}x{h} 閉じるで図鑑が閉じ、ステータス画面に戻る', pg.evaluate('() => document.getElementById("modal").hidden === true && !G.modalOpen'))
        check(f'{w}x{h} ページエラーなし', len(errors) == 0, errors)
        pg.close()
    b.close()

print('\nRESULT:', 'OK' if FAILS == 0 else f'FAIL({FAILS})')
sys.exit(1 if FAILS else 0)
