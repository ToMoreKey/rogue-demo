#!/usr/bin/env python3
"""Q4-4 5-B 図鑑・実績: NEWバッジ・コンプ率・フィルタ・実績バナー・シルエット"""
import os, sys, re
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
    ev("() => { G.tutorial = { done: true }; G._charSelectOpen = false; G.run = null; G.view='status'; G.statusTab='hero'; G.dexFilter = 'all'; G.p.dexNew = { e: {}, i: {}, a: {} }; __rogue.renderAll(); }")
    eid = ev("() => { const g = document.createElement('div'); return null; }") or None
    # 敵を初発見
    ev("() => { G.p.dex.enemies = {}; }")
    first = ev("() => { const e = document.querySelector('.dex-card'); return null; }")
    ev("() => __rogue.openDexModal('enemies')")
    ids = ev("() => Array.from(document.querySelectorAll('.dex-card')).length")
    check('図鑑に敵カードがある', ids > 0)
    ev("() => { G.p.dexNew = { e: {}, i: {}, a: {} }; }")
    # テストでは dungeon A のスケルトン等の実在IDを使う
    eid = ev("() => __rogue.DUNGEONS[0].mobs[0]")
    eid = eid if isinstance(eid, str) else ev("() => __rogue.DUNGEONS[0].mobs[0].id")
    ev("(id) => { __rogue.recordDexEnemy(G.p, id, false); }", eid)
    check('初発見でNEW印が立つ', ev("(id) => !!G.p.dexNew.e[id]", eid))
    ev("(id) => { __rogue.recordDexEnemy(G.p, id, true); }", eid)
    check('再遭遇では増えない', ev("() => Object.keys(G.p.dexNew.e).length") == 1)
    ev("() => { G.view='status'; G.statusTab='hero'; __rogue.renderAll(); }")
    check('ステータスの図鑑ボタンにNEW件数', 'NEW 1' in pg.inner_text('[data-act=openDex]'))
    ev("() => __rogue.openDexModal('enemies')")
    check('図鑑でNEWバッジが見える', pg.locator('.dex-card .dex-new').count() == 1)
    ev("() => __rogue.openDexModal('enemies')")
    check('見た後はNEWが消える', pg.locator('.dex-card .dex-new').count() == 0 and ev("() => Object.keys(G.p.dexNew.e).length") == 0)
    # コンプ率
    txt = pg.inner_text('#m-sheet .dex-prog')
    m = re.search(r'(\d+)/(\d+)（(\d+)%）', txt)
    exp = ev("() => { const p = G.p; const R = __rogue; return null; }")
    check('全体コンプ率の表示', m is not None, txt)
    if m:
        d, t, pc = map(int, m.groups())
        check('コンプ率の計算が一致', pc == round(d / t * 100), (d, t, pc))
    # シルエット
    check('未発見は「？？？」のシルエット', pg.locator('.dex-card .dex-sil').count() > 0 and '？？？' in pg.inner_text('.dex-grid'))
    # フィルタ
    pg.click('[data-act=dexFilter][data-v=done]'); pg.wait_for_timeout(80)
    check('達成済みのみ: 発見済みだけ', pg.locator('.dex-card').count() == 1 and pg.locator('.dex-card .dex-sil').count() == 0, pg.locator('.dex-card').count())
    pg.click('[data-act=dexFilter][data-v=todo]'); pg.wait_for_timeout(80)
    check('未達成のみ: シルエットだけ', pg.locator('.dex-card').count() > 1 and pg.locator('.dex-card:not(:has(.dex-sil))').count() == 0)
    pg.click('[data-act=dexFilter][data-v=all]'); pg.wait_for_timeout(80)
    # 装備・実績
    ev("() => { G.dexFilter = 'all'; __rogue.openDexModal('items'); }")
    check('装備図鑑にも進捗バー', pg.locator('#m-sheet .dex-prog').count() >= 2)
    ev("() => { G.p.ach = {}; G.p.dexNew.a = {}; __rogue.openDexModal('ach'); }")
    check('実績タブにカテゴリ別バー', pg.locator('#m-sheet .dex-grp .dex-prog').count() >= 1)
    # 実績バナー
    ev("() => { __rogue.closeModal && __rogue.closeModal(); document.getElementById('modal').hidden = true; G.modalOpen = false; G.opts.fx = true; G._forceReducedMotion = false; G.p.ach = {}; const a = __rogue.ACHIEVEMENTS[0]; __rogue.achBanner(a, '🪙+' + a.coins, null); }")
    check('実績バナーが中央に出る', pg.locator('.ach-banner').count() == 1)
    ev("() => { document.querySelectorAll('.ach-banner').forEach(n => n.remove()); G.opts.fx = false; __rogue.achBanner(__rogue.ACHIEVEMENTS[0], 'x', null); }")
    check('演出OFFならバナーなし(トーストにフォールバック)', pg.locator('.ach-banner').count() == 0 and not ev("() => document.getElementById('toast').hidden"))
    # 保存
    ev("(id) => { G.opts.fx = true; G.p.dexNew = { e: { [id]: true }, i: {}, a: {} }; __rogue.save(true); }", eid)
    pg.reload(); pg.wait_for_timeout(500)
    check('NEW印が保存される', ev("(id) => !!(G.p.dexNew && G.p.dexNew.e[id])", eid))
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: ' + ('OK' if not F else 'NG')); sys.exit(1 if F else 0)
