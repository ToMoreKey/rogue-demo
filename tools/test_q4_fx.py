#!/usr/bin/env python3
"""Q4-3 1-B 戦闘演出: ダメージ段階・CRITICAL・揺れ・撃破・ボスバナー・低HP警告・演出OFF/reduced-motion"""
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
    ev("() => { G.tutorial = { done: true }; G._charSelectOpen = false; G.p.lv = 30; G.p.hp = __rogue.maxHp(G.p); __rogue.startRun('A', 'novice'); G.view='dungeon'; __rogue.renderAll(); }")
    for _ in range(5): ev("() => __rogue.tick()")
    ev("() => { G.opts.fx = true; G._forceReducedMotion = false; }")
    ev("() => { const en = G.run.enemy; if (en) { en.maxHp = 100; } __rogue.popDamage('enemy', '60', 'dmg'); }")
    check('大ダメージで huge クラス', pg.locator('#f-enemy .pop.huge').count() >= 1)
    ev("() => __rogue.popDamage('enemy', '5', 'dmg')")
    check('小ダメージは通常(段階なし)', pg.locator('#f-enemy .pop.dmg:not(.big):not(.huge)').count() >= 1)
    ev("() => __rogue.popDamage('enemy', '30', 'crit')")
    check('CRITICAL! 表示', 'CRITICAL!' in pg.inner_text('#f-enemy .pop.crit >> nth=-1'))
    check('クリティカルで画面の揺れとヒットストップ', ev("() => { const c = document.getElementById('arena').classList; return c.contains('shake-b') && c.contains('hitstop'); }"))
    pg.wait_for_timeout(350)
    check('揺れ・ヒットストップは短時間で解除', ev("() => { const c = document.getElementById('arena').classList; return !c.contains('shake-b') && !c.contains('hitstop'); }"))
    ev("() => __rogue.popDamage('player', '9', 'bad')")
    check('被弾で小さな揺れ', ev("() => document.getElementById('arena').classList.contains('shake-s')"))
    # 撃破・ボスバナー・レベルアップ
    ev("() => { __rogue.killFx(false); }"); check('撃破演出(die)', ev("() => document.getElementById('f-enemy').classList.contains('die')"))
    ev("() => { __rogue.bossBanner('テスト'); }"); check('ボスバナー', pg.locator('.boss-banner').count() == 1)
    ev("() => { __rogue.levelBand(31); }"); check('レベルアップ帯', pg.locator('.lv-band').count() == 1)
    ev("() => { __rogue.bossBanner('A'); __rogue.bossBanner('B'); }"); check('バナーは重複しない(ノード上限)', pg.locator('.boss-banner').count() == 1)
    # 低HP
    ev("() => { G.p.hp = Math.floor(__rogue.maxHp(G.p) * 0.2); __rogue.lowHpWarn(); }")
    check('HP25%以下で低HP警告', ev("() => document.body.classList.contains('lowhp')"))
    ev("() => { G.p.hp = __rogue.maxHp(G.p); __rogue.lowHpWarn(); }")
    check('回復で解除', not ev("() => document.body.classList.contains('lowhp')"))
    # 演出OFF
    ev("() => { G.opts.fx = false; document.getElementById('arena').className = 'arena'; document.querySelectorAll('.boss-banner,.lv-band').forEach(n => n.remove()); G.p.hp = 1; }")
    ev("() => { __rogue.popDamage('enemy', '30', 'crit'); __rogue.bossBanner('X'); __rogue.levelBand(5); __rogue.killFx(true); __rogue.lowHpWarn(); }")
    check('演出OFFで全て出ない', ev("() => { const c = document.getElementById('arena').classList; return !c.contains('shake-b') && !document.querySelector('.boss-banner') && !document.querySelector('.lv-band') && !document.body.classList.contains('lowhp') && !document.getElementById('f-enemy').classList.contains('die-boss'); }"))
    check('演出OFFでもダメージ数字は出る(CRITICAL!無し)', 'CRITICAL!' not in pg.inner_text('#f-enemy .pop.crit >> nth=-1'))
    # reduced-motion
    ev("() => { G.opts.fx = true; G._forceReducedMotion = true; document.getElementById('arena').className = 'arena'; }")
    ev("() => { __rogue.popDamage('enemy', '30', 'crit'); __rogue.bossBanner('X'); }")
    check('reduced-motion で揺れ・バナー無し', ev("() => !document.getElementById('arena').classList.contains('shake-b') && !document.querySelector('.boss-banner')"))
    # ヘッドレス
    ev("() => { G._forceReducedMotion = false; G.headless = true; document.getElementById('arena').className = 'arena'; __rogue.battleImpact('big'); __rogue.bossBanner('Z'); }")
    check('ヘッドレスは何もしない', ev("() => !document.getElementById('arena').classList.contains('shake-b') && !document.querySelector('.boss-banner')"))
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: ' + ('OK' if not F else 'NG')); sys.exit(1 if F else 0)
