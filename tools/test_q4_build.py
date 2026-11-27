#!/usr/bin/env python3
"""Q4-2E 複数ビルド・全ツリーリセット"""
import os, sys
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = 0
def check(n, c, d=''):
    global F
    print('PASS' if c else 'FAIL', n, '' if c else d)
    F += 0 if c else 1
with sync_playwright() as pw:
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(400)
    ev = pg.evaluate
    ev("() => { G.tutorial = { done: true }; G._charSelectOpen = false; G.run = null; G.view='status'; G.statusTab='skill'; }")
    check('既定は1枠', ev("() => __rogue.buildCount(G.p)") == 1)
    ev("() => { G.p.gold = 100000; G.p.sp = 10; }")
    tree = ev("() => Object.keys(G.p.skillPts)[0]")
    ev("(t) => { G.p.skillPts[t] = 3; G.p.sp = 2; __rogue.syncActiveCharState(G.p); }", tree)
    ev("() => __rogue.buyBuildBook()")
    check('1冊目 5,000G', ev("() => G.p.gold") == 95000 and ev("() => __rogue.buildCount(G.p)") == 2)
    ev("() => __rogue.buyBuildBook()")
    check('2冊目 60,000G', ev("() => G.p.gold") == 35000 and ev("() => __rogue.buildCount(G.p)") == 3)
    ev("() => __rogue.buyBuildBook()")
    check('3冊目は買えない', ev("() => __rogue.buildCount(G.p)") == 3 and ev("() => G.p.gold") == 35000)
    ev("() => { G.run = {}; }")
    ev("() => __rogue.switchBuild(1)")
    check('攻略中は切替不可', ev("() => G.p.chars[G.p.skin].activeBuild") == 0)
    ev("() => { G.run = null; }")
    ev("() => __rogue.switchBuild(1)")
    check('ビルド2: SPが全て戻り振り分けは空', ev("(t) => [G.p.sp, G.p.skillPts[t]]", tree) == [5, 0], ev("() => G.p.sp"))
    ev("() => { G.p.sp += 4; }")
    ev("(t) => { G.p.skillPts[t] = 1; G.p.sp -= 1; }", tree)
    ev("() => __rogue.switchBuild(0)")
    check('ビルド1に戻ると元の振り分け(SP差分で増減)', ev("(t) => [G.p.skillPts[t], G.p.sp]", tree) == [3, 6])
    check('ビルド1の振り分けが3', ev("(t) => G.p.skillPts[t]", tree) == 3)
    check('ビルド2の振り分けは独立(1)', ev("(t) => G.p.chars[G.p.skin].builds[1].skillPts[t]", tree) == 1)
    ev("() => __rogue.switchBuild(2)")
    ev("() => __rogue.switchBuild(0)")
    check('ビルド3→1 往復で落ちない', ev("(t) => G.p.skillPts[t]", tree) == 3)
    ev("() => { G.p.sp = 0; }")
    ev("() => __rogue.switchBuild(1)")  # 戻りSPで足りるので成功
    ev("() => { G.p.sp = 0; G.p.chars[G.p.skin].builds[0].skillPts[Object.keys(G.p.skillPts)[0]] = 9; }")
    ev("() => __rogue.switchBuild(0)")
    check('SP不足なら切替不可', ev("() => G.p.chars[G.p.skin].activeBuild") == 1)
    # 全ツリーリセット
    ev("(t) => { G.p.skillPts[t] = 4; G.p.sp = 0; G.p.gold = 10000; G.resetAllArm = false; }", tree)
    info = ev("() => __rogue.allResetInfo(G.p)")
    ev("() => __rogue.resetAllTrees()")
    check('1回目は実行されない', ev("(t) => G.p.skillPts[t]", tree) == 4)
    ev("() => __rogue.resetAllTrees()")
    check('2回目で実行・SP返還・費用=合計', ev("(t) => [G.p.skillPts[t], G.p.sp, G.p.gold]", tree) == [0, info['sp'], 10000 - info['cost']], str(info))
    # 保存→再読込
    ev("() => { G.p.gold = 99999; __rogue.save && __rogue.save(true); }")
    pg.reload(); pg.wait_for_timeout(500)
    check('再読込でビルド3枠が残る', ev("() => __rogue.buildCount(G.p)") == 3)
    check('再読込でアクティブビルド保持', ev("() => G.p.chars[G.p.skin].activeBuild") == 1)
    # 旧セーブ移行
    r = ev("() => { const p = JSON.parse(JSON.stringify(G.p)); delete p.buildSlots; for (const k in p.chars) { delete p.chars[k].builds; delete p.chars[k].activeBuild; } const m = __rogue.migrateSave({ v: 9, p }); return m && [m.v, m.p.buildSlots]; }")
    check('v9→v10 移行', r == [10, 0], str(r))
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: ' + ('OK' if not F else 'NG')); sys.exit(1 if F else 0)
