#!/usr/bin/env python3
"""デイリーダンジョン「鐘の試練」"""
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
    pg.goto(URL); pg.wait_for_timeout(500)
    pg.evaluate("() => { localStorage.setItem('rogue_tut_done_v1','1'); G.p.lv = 3; __rogue.save(); }")
    pg.goto(URL); pg.wait_for_timeout(800)
    pg.evaluate("() => { G._titleUp = false; G.view = 'dungeon'; __rogue.renderAll(); }")
    check('デイリーカードが出る', pg.locator('.dl-card').count() == 1)
    check('初日は残り3回', pg.evaluate("() => __rogue.dailyLeft(G.p)") == 3)
    check('曜日テーマが7種', pg.evaluate("() => __rogue.DAILY_THEMES.length") == 7)
    # 強さはLvに追従（Lv1 < Lv30）
    s = pg.evaluate("() => { const p = G.p; p.lv = 1; const a = __rogue.dailyScale(p); p.lv = 30; const b = __rogue.dailyScale(p); p.lv = 3; return [a, b]; }")
    check('敵の強さがLvに追従', s[0] < s[1], s)
    pg.locator('[data-act="goDaily"]').click(); pg.wait_for_timeout(300)
    check('挑戦で戦闘開始・回数消費', pg.evaluate("() => !!G.run && !!G.run.daily && G.p.daily.used === 1"))
    pg.evaluate("() => { __rogue.setHeadless(true); __rogue.noTimer(true); G.p.lv = 40; G.p.hp = 99999; }")
    # 強化して踏破させる
    pg.evaluate("() => { const r = G.run; r.daily.S0 = 0.05; let n = 0; while (G.run && n < 50000) { __rogue.tick(); n++; } }")
    last = pg.evaluate("() => ({ r: G.last.result, dr: G.last.daily && G.last.daily.drops, f: G.last.floors })")
    check('10階層で踏破', last['r'] == 'clear' and last['f'] == 10, last)
    check('しずくが貰える', (pg.evaluate("() => G.p.gacha.drops") or 0) >= 2)
    # 3回で打ち止め、日付が変われば回復
    pg.evaluate("() => { __rogue.setHeadless(false); G.p.daily.used = 3; }")
    check('使い切ると0回', pg.evaluate("() => __rogue.dailyLeft(G.p)") == 0)
    pg.evaluate("() => { G.last = null; __rogue.startDailyRun(); }")
    check('0回では開始しない', pg.evaluate("() => !G.run"))
    pg.evaluate("() => { G.p.daily.date = '2000-01-01'; }")
    check('日付が変わると回復', pg.evaluate("() => __rogue.dailyLeft(G.p)") == 3)
    # セーブ往復
    pg.evaluate("() => { G.p.daily.used = 2; __rogue.save(); }")
    pg.reload(); pg.wait_for_timeout(600)
    check('回数がセーブされる', pg.evaluate("() => G.p.daily.used") == 2)
    check('JSエラーなし', not errs, errs)
    b.close()
print('FAILED' if F else 'ALL PASS'); raise SystemExit(1 if F else 0)
