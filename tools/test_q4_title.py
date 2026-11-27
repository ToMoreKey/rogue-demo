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
    # クレジット
    pg3 = b.new_page(viewport={'width': 390, 'height': 844}); e3 = []; pg3.on('pageerror', lambda e: e3.append(str(e)))
    pg3.goto('file://' + ROOT + '/index.html?title=1'); pg3.wait_for_timeout(600)
    pg3.locator('#ttl-credit').click(); pg3.wait_for_timeout(400)
    check('クレジットが開く（タイトルは閉じない）', pg3.locator('#credits-screen').count() == 1 and pg3.locator('#title-screen').count() == 1 and pg3.evaluate("() => G._titleUp === true"))
    t = pg3.locator('#credits-screen').inner_text()
    check('ToMoreKey/Gemini/Claude/フォント/©表記', all(k in t for k in ['ToMoreKey', 'Gemini', 'Claude', 'DotGothic16', 'Zen Kaku Gothic New', '© 2026']), t)
    pg3.keyboard.press('Escape'); pg3.wait_for_timeout(200)
    check('Escで閉じる', pg3.locator('#credits-screen').count() == 0 and pg3.locator('#title-screen').count() == 1)
    pg3.locator('#ttl-credit').click(); pg3.locator('#cr-close').click(); pg3.wait_for_timeout(200)
    check('閉じるボタンで閉じる', pg3.locator('#credits-screen').count() == 0)
    pg3.locator('#title-screen').click(); pg3.wait_for_timeout(900)
    # データタブから
    pg3.evaluate("() => { G.p.lv = 12; G.tutorial = { done: true }; __rogue.save(); }")
    pg3.goto('file://' + ROOT + '/index.html'); pg3.wait_for_timeout(600)
    pg3.evaluate("() => { G.view = 'status'; G.statusTab = 'data'; __rogue.renderAll(); }"); pg3.wait_for_timeout(200)
    pg3.locator('[data-act=openCredits]').click(); pg3.wait_for_timeout(300)
    check('データ画面のクレジットから開く', pg3.locator('#credits-screen').count() == 1)
    check('クレジットのページエラーなし', not e3, e3)
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: OK' if F == 0 else f'RESULT: NG ({F} fails)')
