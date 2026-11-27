#!/usr/bin/env python3
"""Q4-3 1-C サウンド: 設定・間引き・ミュート・ヘッドレス無音・自動再生ポリシー・戦闘フック"""
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = 0
def check(n, c, d=''):
    global F
    print('PASS' if c else 'FAIL', n, '' if c else d); F += 0 if c else 1
INIT = """(() => { window.__ac = { made: 0, osc: 0 }; const AC = window.AudioContext || window.webkitAudioContext;
  const W = function () { window.__ac.made++; const c = new AC(); const co = c.createOscillator.bind(c); c.createOscillator = () => { window.__ac.osc++; return co(); }; return c; };
  W.prototype = AC.prototype; window.AudioContext = W; })();"""
with sync_playwright() as pw:
    b = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg = b.new_page(viewport={'width': 390, 'height': 844})
    pg.add_init_script(INIT)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(400); ev = pg.evaluate
    ev("() => { G.tutorial = { done: true }; G._charSelectOpen = false; G.run = null; G.view='status'; G.statusTab='data'; __rogue.renderAll(); }")
    check('既定: SE ON・小音量・BGM OFF', ev("() => [G.opts.se !== false, G.opts.seVol | 0, G.opts.bgm === true]") == [True, 0, False])
    check('操作前は AudioContext を作らない', ev("() => window.__ac.made") == 0)
    ev("() => __rogue.Sound.play('atk')")
    check('操作前の再生要求でも音は出ない(osc=0)', ev("() => window.__ac.osc") == 0)
    pg.click('[data-act=seVolSet][data-v="1"]'); pg.wait_for_timeout(150)
    check('最初の操作で AudioContext 生成', ev("() => window.__ac.made") >= 1)
    check('音量設定が反映', ev("() => G.opts.seVol") == 1)
    ev("() => { __rogue.Sound.calls.length = 0; }")
    ev("() => { __rogue.Sound.play('hit'); __rogue.Sound.play('hit'); }")
    check('同種SEは50ms以内に間引き', ev("() => __rogue.Sound.calls.filter(x => x === 'hit').length") == 1)
    pg.wait_for_timeout(80)
    ev("() => __rogue.Sound.play('hit')")
    check('間隔が空けば再生', ev("() => __rogue.Sound.calls.filter(x => x === 'hit').length") == 2)
    oscs = ev("() => window.__ac.osc")
    pg.click('[data-act=seToggle]'); pg.wait_for_timeout(100)
    check('SE OFF が保存される', ev("() => G.opts.se") is False)
    ev("() => { __rogue.Sound.calls.length = 0; }"); n0 = ev("() => window.__ac.osc")
    pg.wait_for_timeout(80); ev("() => __rogue.Sound.play('crit')")
    check('ミュート時は呼び出し記録も発音も無し', ev("() => __rogue.Sound.calls.length") == 0 and ev("() => window.__ac.osc") == n0)
    pg.click('[data-act=seToggle]'); pg.wait_for_timeout(100)
    # 戦闘フック
    ev("() => { G.p.hp = 9999; G.p.lv = 30; G.opts.se = true; __rogue.Sound.calls.length = 0; __rogue.startRun('A', 'novice'); }")
    for _ in range(40):
        ev("() => { if (G.run) { G.p.hp = __rogue.maxHp(G.p); __rogue.tick(); } }")
        pg.wait_for_timeout(55)
        if 'kill' in ev("() => __rogue.Sound.calls"): break
    calls = ev("() => __rogue.Sound.calls")
    check('戦闘で攻撃SEと撃破SEが鳴る', 'atk' in calls or 'crit' in calls, calls)
    check('撃破SE', 'kill' in calls or 'bossKill' in calls, calls)
    # BGM: 5場面・フェード切替・停止
    ev("() => { G.headless = false; G.opts.bgm = true; G.opts.bgmVol = 1; }")
    pg.mouse.click(10, 10); pg.wait_for_timeout(200)
    check('BGM場面が5つ', sorted(ev("() => __rogue.Sound.scenes")) == ['boss', 'dungeon', 'title', 'tower', 'town'])
    ev("() => { G._titleUp = true; }")   # 戦闘ループによる場面上書きを止める
    for sc in ['town', 'dungeon', 'boss', 'tower', 'title']:
        ev("(s) => __rogue.Sound.setScene(s)" .replace('(s)', '()').replace('(s)', "('" + sc + "')")) if False else ev("() => __rogue.Sound.setScene('%s')" % sc)
        pg.wait_for_timeout(900)
        st = ev("() => __rogue.Sound.bgmState()")
        check('BGM再生中: ' + sc, st['playing'] and st['scene'] == sc, st)
    # 描画のたびにsetSceneが呼ばれても切替が遅れない
    ev("() => { __rogue.Sound.setScene('town'); }")
    for _ in range(8):
        pg.wait_for_timeout(100); ev("() => __rogue.Sound.setScene('town')")
    check('連続呼び出しでも場面が切り替わる', ev("() => __rogue.Sound.bgmState().scene") == 'town')
    ev("() => { G.opts.bgm = false; __rogue.Sound.bgmUpdate(); }"); pg.wait_for_timeout(900)
    ev("() => { G._titleUp = false; }")
    check('BGM OFFでフェード後に停止', ev("() => __rogue.Sound.bgmState().playing") is False)
    # ヘッドレス無音
    ev("() => { G.headless = true; __rogue.Sound.calls.length = 0; }"); pg.wait_for_timeout(80)
    ev("() => __rogue.Sound.play('levelup')")
    check('ヘッドレスでは無音', ev("() => __rogue.Sound.calls.length") == 0)
    ev("() => { G.headless = false; G.opts.bgm = true; __rogue.Sound.bgmUpdate(); }")
    # 保存→再読込
    ev("() => { G.opts.seVol = 2; G.opts.bgmVol = 1; G.opts.bgm = true; __rogue.save(true); }")
    pg.reload(); pg.wait_for_timeout(500)
    check('opts(se/bgm/音量)が復元される', ev("() => [G.opts.seVol, G.opts.bgmVol, G.opts.bgm]") == [2, 1, True])
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: ' + ('OK' if not F else 'NG')); sys.exit(1 if F else 0)
