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
    ev("() => { window.__ms = __rogue.bossBanner('テスト'); }"); check('ボス登場: 待ち時間を返す', ev("() => window.__ms") == 3300)
    check('登場直後はボスが隠れ WARNING が出る', pg.locator('#f-enemy.boss-hide').count() == 1 and pg.locator('.warn-txt').count() == 1)
    pg.wait_for_timeout(2500)
    check('WARNING後にゴゴゴ・せり上がり・揺れ', pg.locator('.goro-txt').count() == 1 and pg.locator('#f-enemy.boss-rise').count() == 1 and ev("() => document.getElementById('arena').classList.contains('rumble')"))
    pg.wait_for_selector('.boss-banner', timeout=3000)
    check('名前バナー', pg.locator('.boss-banner').count() == 1)
    ev("() => { __rogue.levelBand(31); }"); check('レベルアップ帯', pg.locator('.lv-band').count() == 1)
    check('レベルアップ時にキャラの喜びモーション(ジャンプ+きらめき)', pg.locator('#f-player.lv-joy').count() == 1 and pg.locator('#f-player .lv-spark').count() == 4)
    ev("() => { __rogue.bossBanner('A'); __rogue.bossBanner('B'); }"); pg.wait_for_selector('.boss-banner', timeout=5000); check('バナーは重複しない(ノード上限)', pg.locator('.boss-banner').count() == 1, pg.locator('.boss-banner').count())
    ev("() => { G.run.introUntil = Date.now() + 5000; }"); __t = ev("() => { const h = G.run.enemy.hp; __rogue.tick(); return h === G.run.enemy.hp; }")
    check('演出中は tick で戦闘が進まない', __t)
    # 右向きの敵は左向きに反転
    check('右向きの敵(d_beetle)は反転クラス', 'flip' in ev("() => __rogue.enemyArt({ id: 'd_beetle', name: 'x' }, 'D')"))
    check('左向き/正面の敵は反転しない', 'flip' not in ev("() => __rogue.enemyArt({ id: 'a_slime', name: 'x' }, 'A')"))
    ev("() => __rogue.killFx(true)")
    check('ボス撃破: 白フラッシュ+連続爆発7つ', pg.locator('.boss-white').count() == 1 and pg.locator('.boss-burst').count() == 7)
    # ルルの表情: 目標達成で喜び、全達成で驚き
    ev("() => { G.view='town'; G.townView='plaza'; G._npc=null; G._npcEx=null; G._goalJoy='joy'; __rogue.renderAll(); }")
    check('目標達成後の広場でルルが喜ぶ', pg.locator('.npc[data-fac=guide][data-ex=joy]').count() == 1)
    ev("() => { G._npc=null; G._npcEx=null; G._goalJoy='surprise'; __rogue.renderAll(); }")
    check('全目標達成でルルが驚く', pg.locator('.npc[data-fac=guide][data-ex=surprise]').count() == 1)
    # 低HP
    ev("() => { G.p.hp = Math.floor(__rogue.maxHp(G.p) * 0.2); __rogue.lowHpWarn(); }")
    check('HP25%以下で低HP警告', ev("() => document.body.classList.contains('lowhp')"))
    ev("() => { G.p.hp = __rogue.maxHp(G.p); __rogue.lowHpWarn(); }")
    check('回復で解除', not ev("() => document.body.classList.contains('lowhp')"))
    # 演出OFF
    ev("() => { G.opts.fx = false; document.getElementById('arena').className = 'arena'; document.querySelectorAll('.boss-banner,.lv-band,.boss-white,.boss-burst').forEach(n => n.remove()); document.getElementById('f-enemy').classList.remove('die', 'die-boss'); G.p.hp = 1; }")
    ev("() => { __rogue.popDamage('enemy', '30', 'crit'); __rogue.bossBanner('X'); __rogue.levelBand(5); __rogue.killFx(true); __rogue.lowHpWarn(); }")
    check('演出OFFで全て出ない', ev("() => { const c = document.getElementById('arena').classList; return !c.contains('shake-b') && !document.querySelector('.boss-banner') && !document.querySelector('.boss-burst') && !document.querySelector('.lv-band') && !document.body.classList.contains('lowhp') && !document.getElementById('f-enemy').classList.contains('die-boss'); }"))
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
