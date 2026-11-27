#!/usr/bin/env python3
"""ガチャ「福音のくじ」・鐘のしずく・ログインボーナス"""
import os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = 0
def check(n, c, d=''):
    global F
    print('PASS' if c else 'FAIL', n, '' if c else d); F += 0 if c else 1
URL = 'file://' + ROOT + '/index.html'
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL + '?login=1'); pg.wait_for_timeout(500)
    pg.evaluate("() => { localStorage.setItem('rogue_tut_done_v1','1'); G.p.lv = 2; __rogue.save(); }")
    pg.goto(URL + '?login=1'); pg.wait_for_timeout(1800)
    check('ログインボーナスが出る', pg.locator('[data-act="loginClaim"]').count() == 1)
    check('7日分のマス', pg.locator('.lg-cell').count() == 7)
    pg.locator('[data-act="loginClaim"]').click(); pg.wait_for_timeout(300)
    d = pg.evaluate("() => G.p.gacha.drops")
    check('1日目 +2しずく', d == 2, d)
    pg.goto(URL + '?login=1'); pg.wait_for_timeout(1800)
    check('同日2回目は出ない', pg.locator('[data-act="loginClaim"]').count() == 0)
    # ガチャ画面
    pg.evaluate("() => { G.p.gacha.drops = 100; __rogue.renderAll(); }"); pg.wait_for_timeout(200)
    pg.locator('[data-act="townEnter"][data-v="gacha"]').click(); pg.wait_for_timeout(300)
    check('ガチャ施設が開く', pg.locator('.gc-top').count() == 1)
    check('提供割合を表示', pg.locator('.gc-rates').count() >= 1)
    pg.locator('[data-act="gachaPull"][data-n="10"]').click(); pg.wait_for_timeout(300)
    check('10連の結果', pg.locator('.gc-res').count() == 10)
    st = pg.evaluate("() => ({ t: G.p.gacha.total, d: G.p.gacha.drops })")
    check('10連で消費と累計', st['t'] == 10 and st['d'] >= 70, st)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
    # 装備反映
    pg.evaluate("() => { const g = G.p.gacha; g.owned['cos:c_back_angel'] = 1; g.eq.back = 'c_back_angel'; save(); __rogue.renderAll(); }") if False else None
    ids = pg.evaluate("() => COSMETICS.map(c => c.id).slice(0, 3).join(',')") if False else ''
    pg.evaluate("() => { __rogue.GACHA_CFG; }")
    res = pg.evaluate("""() => { const c = __rogue.COSMETICS.find(x => x.slot === 'back'); const g = G.p.gacha; g.owned['cos:' + c.id] = 1; g.eq.back = c.id; return c.id; }""")
    html = pg.evaluate("() => __rogue.cosOverlayHtml(G.p)")
    check('装備でオーバーレイが出る', 'cos-' in html, html[:80])
    # 景品一覧・着せ替え
    pg.evaluate("() => { __rogue.closeModal ? __rogue.closeModal() : (document.getElementById('modal').hidden = true, G.modalOpen = false); }"); pg.wait_for_timeout(200)
    pg.evaluate("() => { const g = G.p.gacha; g.owned = {}; g.eq = {}; g.frame = null; const c = __rogue.COSMETICS.filter(x => x.slot === 'back'); g.owned['cos:' + c[0].id] = 1; __rogue.renderAll(); }")
    pg.locator('[data-act="townEnter"][data-v="gacha"]').click() if pg.locator('[data-act="townEnter"][data-v="gacha"]').count() else None
    pg.locator('[data-act="gachaCollection"]').click(); pg.wait_for_timeout(300)
    check('景品一覧が開く（3タブ）', pg.locator('.gc-tabs .seg-b').count() == 3 and pg.locator('.gc-card').count() > 20)
    ids = pg.evaluate("() => __rogue.COSMETICS.filter(x => x.slot === 'back').map(x => x.id)")
    pg.locator(f'[data-act="gcTry"][data-id="{ids[0]}"]').click(); pg.wait_for_timeout(200)
    check('試着で立ち絵に反映', pg.locator('.gc-stage.big .cos-ov').count() == 1)
    check('入手済みなら反映ボタンが押せる', pg.locator('[data-act="gcApply"]').is_enabled())
    pg.locator(f'[data-act="gcTry"][data-id="{ids[1]}"]').click(); pg.wait_for_timeout(200)
    check('未入手を試着中は反映不可', pg.locator('[data-act="gcApply"]').is_disabled())
    pg.locator(f'[data-act="gcTry"][data-id="{ids[0]}"]').click(); pg.wait_for_timeout(200)
    pg.locator('[data-act="gcApply"]').click(); pg.wait_for_timeout(300)
    check('反映すると実際の装備になる', pg.evaluate("(id) => G.p.gacha.eq.back === id", ids[0]))
    pg.locator('[data-act="gcTab"][data-tab="frame"]').click(); pg.wait_for_timeout(200)
    check('図鑑の飾りタブ', pg.locator('[data-act="gcFrame"]').count() == pg.evaluate('() => __rogue.DEX_FRAMES.length') + 1)
    pg.locator('[data-act="gcTab"][data-tab="title"]').click(); pg.wait_for_timeout(200)
    check('称号タブ', pg.locator('[data-act="gcTitle"]').count() == pg.evaluate('() => __rogue.GACHA_TITLES.length'))
    pg.locator('[data-act="gcClose"]').click(); pg.wait_for_timeout(200)
    check('閉じられる', pg.evaluate("() => document.getElementById('modal').hidden === true"))
    # ジャンル別（闇鍋ではない）
    pg.evaluate("() => { G.p.gacha.drops = 500; }")
    for gk in ['cos', 'frame', 'title']:
        r = pg.evaluate("(gk) => __rogue.gachaPull(10, gk).map(x => x.it.type)", gk)
        check(f'{gk}くじは{gk}の景品だけが出る', len(r) == 10 and set(r) == {gk}, r)
    pg.evaluate("() => { __rogue.closeModal && 0; G.modalOpen = false; document.getElementById('modal').hidden = true; G.p.gacha.pities.frame = 5; G.p.gacha.pities.cos = 20; }")
    pg.evaluate("() => { __rogue.renderAll(); }")
    pg.locator('[data-act="gachaGenre"][data-g="frame"]').click(); pg.wait_for_timeout(200)
    check('ジャンル切替・天井はジャンル別', '天井まであと 45 回' in pg.locator('.gc-bal').inner_text(), pg.locator('.gc-bal').inner_text())
    check('ジャンル切替で3タブ', pg.locator('.gc-genres .seg-b').count() == 3)
    # 重複時の返却・天井
    pg.evaluate("() => { const g = G.p.gacha; g.pities.cos = 49; g.drops = 10; }")
    r = pg.evaluate("() => { const x = __rogue.gachaPull(1, 'cos'); return x && x[0].rar; }")
    check('天井でSSR', r == 3, r)
    # 実績ドロップ
    before = pg.evaluate("() => G.p.gacha.drops")
    pg.evaluate("() => { __rogue.addDrops(3, 'test'); }")
    check('addDropsで加算', pg.evaluate("() => G.p.gacha.drops") == before + 3)
    # 引く演出（?reveal=1 で有効）
    pg.goto(URL + '?reveal=1'); pg.wait_for_timeout(600)
    pg.evaluate("() => { G._titleUp = false; G.p.gacha.drops = 50; __rogue.renderAll(); }")
    pg.locator('[data-act="townEnter"][data-v="gacha"]').click(); pg.wait_for_timeout(300)
    pg.locator('[data-act="gachaPull"][data-n="1"]').click(); pg.wait_for_timeout(300)
    check('演出オーバーレイが出る', pg.locator('.gc-rv').count() == 1)
    pg.locator('.gc-rv').click(); pg.wait_for_timeout(600)
    check('タップでスキップして結果が見える', pg.locator('.gc-rv').count() == 0 and pg.locator('.gc-res').count() == 1)
    check('JSエラーなし', not errs, errs)
    b.close()
print('FAILED' if F else 'ALL PASS'); raise SystemExit(1 if F else 0)
