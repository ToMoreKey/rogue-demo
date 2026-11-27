#!/usr/bin/env python3
"""タイトル画面: 自動テストでは出ない / ?title=1 で出る / タップで閉じる / 表示中は戦闘が進まない / 2回目は出ない"""
import os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = 0
def check(n, c, d=''):
    global F
    print('PASS' if c else 'FAIL', n, '' if c else d); F += 0 if c else 1
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(500)
    check('自動テスト(webdriver)ではタイトルを出さない', pg.locator('#title-screen').count() == 0)
    pg.goto('file://' + ROOT + '/index.html?title=1'); pg.wait_for_timeout(600)
    check('?title=1 でタイトルが出る', pg.locator('#title-screen').count() == 1)
    check('ロゴ「鐘鳴りのダンジョン」', pg.locator('.ttl-l1').inner_text() == '鐘鳴りの' and pg.locator('.ttl-l2').inner_text() == 'ダンジョン')
    check('4人の主人公が並ぶ', pg.locator('.ttl-heroes img').count() == 4)
    check('新規は「はじめる」', pg.locator('#ttl-start').inner_text() == 'はじめる')
    check('タイトル中は戦闘ループが止まる', pg.evaluate("() => G._titleUp === true"))
    pg.locator('#title-screen').click(); pg.wait_for_timeout(900)
    check('タップで閉じる', pg.locator('#title-screen').count() == 0 and pg.evaluate("() => G._titleUp === false"))
    # セーブありなら「つづきから」
    pg.evaluate("() => { G.p.lv = 12; save(); }") if False else None
    pg2 = b.new_page(viewport={'width': 390, 'height': 844})
    pg2.add_init_script("if (!sessionStorage.__t) { sessionStorage.__t = 1; }")
    pg2.goto('file://' + ROOT + '/index.html?title=1'); pg2.wait_for_timeout(400)
    pg2.evaluate("() => { G.p.lv = 12; G.tutorial = { done: true }; __rogue.save(); }")
    pg2.goto('file://' + ROOT + '/index.html?title=1'); pg2.wait_for_timeout(600)
    check('セーブありは「つづきから」とLv表示', pg2.locator('#ttl-start').inner_text() == 'つづきから' and 'Lv12' in pg2.locator('.ttl-hint').inner_text(), pg2.locator('.ttl-hint').inner_text())
    pg2.keyboard.press('Enter'); pg2.wait_for_timeout(900)
    check('Enterでも閉じる', pg2.locator('#title-screen').count() == 0)
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: OK' if F == 0 else f'RESULT: NG ({F} fails)')
