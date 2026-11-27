#!/usr/bin/env python3
"""Q4-3 1-A 導線: はじめの目標・初回ヒント・チュートリアルのやり直し"""
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
    ev("() => { G.tutorial = { done: true }; G._charSelectOpen = false; G.run = null; G.view='town'; G.townView='plaza'; __rogue.renderAll(); }")
    check('目標カードが出る(0/5)', pg.locator('.goal-card').count() == 1 and '0/5' in pg.inner_text('.goal-card'))
    ev("() => { G.p.cleared = { A: { novice: true } }; __rogue.renderAll(); }")
    check('Aクリアで自動チェック', '1/5' in pg.inner_text('.goal-card') or '2/5' in pg.inner_text('.goal-card'))
    ev("() => { G.p.cleared = { A: { novice: true }, B: { novice: true } }; G.p.skills = { x: true }; G.p.goalFlags = { equip: true }; G.p.lv = 30; G.p.weapon = G.p.weapon; __rogue.renderAll(); }")
    check('既存進行を反映し、全達成で消える（戦闘力条件次第）', ev("() => __rogue.goalState(G.p).filter(x => x.ok).length") >= 4)
    ev("() => { G.p.goalsHidden = true; __rogue.renderAll(); }")
    check('閉じると非表示', pg.locator('.goal-card').count() == 0)
    # ヒント
    ev("() => { G.view='status'; G.statusTab='hero'; __rogue.renderAll(); }")
    check('ステータスで初回ヒント', pg.locator('.hint-bubble').count() == 1)
    pg.click('.hint-bubble [data-act=hintOk]'); pg.wait_for_timeout(100)
    check('「わかった」で消え再表示なし', pg.locator('.hint-bubble').count() == 0 and ev("() => G.p.hints.status") is True)
    # スキップ/やり直し
    ev("() => { G.view='help'; G.helpTab='intro'; __rogue.renderAll(); }")
    pg.click('[data-act=tutRestart]'); pg.wait_for_timeout(300)
    check('やり直しで step0 から', ev("() => !G.tutorial.done && G.tutorial.step === 0"))
    # 保存の往復
    ev("() => { G.tutorial = { done: true }; G.p.hints = { shop: true }; G.p.goalFlags = { tryB: true }; G.p.goalsHidden = true; __rogue.save(true); }")
    pg.reload(); pg.wait_for_timeout(500)
    check('hints/goalFlags/goalsHidden が保存される', ev("() => [G.p.hints.shop, G.p.goalFlags.tryB, G.p.goalsHidden]") == [True, True, True])
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: ' + ('OK' if not F else 'NG')); sys.exit(1 if F else 0)
