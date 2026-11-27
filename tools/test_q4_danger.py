#!/usr/bin/env python3
"""危険判定のダンジョンに入る前の確認ポップアップ / Now Loading 表示"""
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
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(500)
    pg.evaluate("() => { G.p.lv = 12; G.tutorial = { done: true }; G.p.cleared = { A: { novice: true } }; __rogue.save(); }")
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(600)
    ev = pg.evaluate
    check('Now Loading は起動後に消える', pg.locator('#boot-loading').count() == 0)
    ev("() => { G.p.lv = 1; G.view = 'dungeon'; __rogue.renderAll(); }"); pg.wait_for_timeout(200)
    check('Lv1で中級は危険判定', ev("() => !!__rogue.dangerOf('A', 'mid')"))
    check('Lv1で初級は危険ではない', ev("() => !__rogue.dangerOf('A', 'novice')"))
    ev("() => { G.sel.A = 'mid'; __rogue.renderAll(); }"); pg.wait_for_timeout(100)
    pg.locator('[data-act=go][data-d=A]').first.click(); pg.wait_for_timeout(300)
    t = pg.locator('#m-sheet').inner_text()
    check('危険だと確認ポップアップが出て、まだ潜らない', '厳しい戦いになるかも' in t and '本当に挑戦する' in t and ev("() => !G.run"), t)
    check('推奨Lvと現在Lvが出る', '推奨Lv' in t and 'あなた Lv1' in t, t)
    pg.locator('[data-act=dangerCancel]').click(); pg.wait_for_timeout(200)
    check('「やめる」で閉じて潜らない', ev("() => !G.run && document.getElementById('modal').hidden"))
    pg.locator('[data-act=go][data-d=A]').first.click(); pg.wait_for_timeout(300)
    pg.locator('[data-act=dangerGo]').click(); pg.wait_for_timeout(300)
    check('「それでも挑戦する」で潜る', ev("() => !!G.run && G.run.d.id === 'A' && G.run.df.id === 'mid'"))
    # 危険でなければ即潜る
    ev("() => { G.run = null; G.p.lv = 30; G.view = 'dungeon'; __rogue.renderAll(); }"); pg.wait_for_timeout(100)
    pg.locator('[data-act=go][data-d=A]').first.click(); pg.wait_for_timeout(300)
    check('危険でないなら確認なしで潜る', ev("() => !!G.run"))
    u = lambda cl, df: ev("([cl, df]) => { const p = __rogue.newPlayer(); p.cleared = cl; return __rogue.isDiffUnlocked(p, __rogue.DUNGEONS[0], __rogue.DIFFS.find(x => x.id === df)); }", [cl, df])
    check('初級→中級→上級の順に解放される', u({}, 'novice') and not u({}, 'mid') and not u({}, 'high') and u({'A': {'novice': True}}, 'mid') and not u({'A': {'novice': True}}, 'high') and u({'A': {'novice': True, 'mid': True}}, 'high'))
    check('以前のセーブ(上級だけクリア済み)は中級・上級が解放のまま', u({'A': {'high': True}}, 'mid') and u({'A': {'high': True}}, 'high'))
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: OK' if F == 0 else f'RESULT: NG ({F} fails)')
sys.exit(1 if F else 0)
