#!/usr/bin/env python3
"""課金（倍速・広告スキップ）とリワード広告。ウェブ版は従来どおり、?monet=mock でネイティブ相当を再現"""
import os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
F = 0
def check(n, c, d=''):
    global F
    print('PASS' if c else 'FAIL', n, '' if c else d); F += 0 if c else 1
BASE = 'file://' + ROOT + '/index.html'
def boot(pw, q=''):
    b = pw.chromium.launch(); pg = b.new_page(viewport={'width': 390, 'height': 844}); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(400)
    pg.evaluate("() => { localStorage.setItem('rogue_tut_done_v1','1'); G.p.lv = 5; __rogue.ensureGacha(G.p).drops = 0; __rogue.save(); }")
    pg.goto(BASE + q); pg.wait_for_timeout(700)
    pg.evaluate("() => { G._titleUp = false; }")
    return b, pg, errs
R = '__rogue.'
with sync_playwright() as pw:
    # ウェブ版: 従来どおり
    b, pg, errs = boot(pw)
    r = pg.evaluate("() => [1, __rogue.speedLocked(2), __rogue.speedLocked(4), __rogue.monetAdsOn(), __rogue.adButtonHtml('drops')]")
    check('ウェブ版: 倍速は全部使える・広告ボタンなし', r[1] is False and r[2] is False and r[3] is False and r[4] == '', r)
    pg.evaluate("() => { __rogue.ACTS.speed({ v: 4 }); }")
    check('ウェブ版: ×4に切り替えられる', pg.evaluate("() => G.opts.speed") == 4)
    check('ウェブ版: JSエラーなし', not errs, errs); b.close()
    # mock（ネイティブ相当）
    b, pg, errs = boot(pw, '?monet=mock')
    r = pg.evaluate("() => [__rogue.speedLocked(1), __rogue.speedLocked(2), __rogue.speedLocked(4), __rogue.monetAdsOn()]")
    check('mock: ×2は無料、×4だけ鍵つき、広告あり', r == [False, False, True, True], r)
    pg.evaluate("() => { __rogue.ACTS.speed({ v: 4 }); }")
    check('鍵つき×4を押すとショップが開き、速度は変わらない', pg.evaluate("() => G.modalOpen && !!document.querySelector('[data-act=monetBuy][data-id=speed4]') && G.opts.speed") == 1)
    pg.evaluate("() => { __rogue.ACTS.monetBuy({ id: 'speed4' }); }"); pg.wait_for_timeout(300)
    r = pg.evaluate("() => [G.p.iap.speed4, __rogue.speedLocked(2), __rogue.speedLocked(4)]")
    check('4倍速を購入→×4が解放', r == [True, False, False], r)
    pg.evaluate("() => { __rogue.closeModal(); __rogue.ACTS.speed({ v: 4 }); }")
    check('購入後は×4に切り替えられる', pg.evaluate("() => G.opts.speed") == 4)
    # 保存→再読込で購入が残り、速度は有効
    pg.evaluate("() => __rogue.save()"); pg.reload(); pg.wait_for_timeout(600)
    check('購入はセーブされる', pg.evaluate("() => G.p.iap.speed4") is True)
    # 未購入のまま×4で保存されたセーブは、読み込み時に×2へ引き下げる
    pg.evaluate("() => { G.p.iap.speed4 = false; G.opts.speed = 4; __rogue.save(); }"); pg.goto(BASE + '?monet=mock'); pg.wait_for_timeout(700)
    check('未購入の×4は起動時に×2へ戻る', pg.evaluate("() => G.opts.speed") == 2)
    # しずく広告: 1日3回まで、+1ずつ
    pg.evaluate("() => { G._titleUp = false; G.view='town'; __rogue.renderAll(); __rogue.ACTS.townEnter({v:'gacha'}); }")
    check('くじ画面に広告ボタンが出る', pg.locator('[data-act="monetReward"][data-kind="drops"]').count() == 1)
    for i in range(4):
        pg.evaluate("() => __rogue.monetReward('drops')"); pg.wait_for_timeout(1400)
    r = pg.evaluate("() => [G.p.gacha.drops, G.p.ads.drops, __rogue.adLeft('drops')]")
    check('広告のしずくは+1×3回で打ち止め', r == [3, 3, 0], r)
    # 広告スキップ購入で、見ずに受け取れる（上限は同じ）
    pg.evaluate("() => { G.p.ads.drops = 0; __rogue.ACTS.monetBuy({ id: 'adfree' }); }"); pg.wait_for_timeout(300)
    t0 = pg.evaluate("() => G.p.gacha.drops"); pg.evaluate("() => __rogue.monetReward('drops')"); pg.wait_for_timeout(150)
    check('広告スキップ購入後は広告を見ずに即受け取れる', pg.evaluate("() => G.p.gacha.drops") == t0 + 1 and pg.locator('#mock-ad').count() == 0)
    # 限定ダンジョン: 使い切った日だけ回数+1（1日1回）
    pg.evaluate("() => { __rogue.ensureDaily(G.p).used = 3; __rogue.ACTS.dgTab && __rogue.ACTS.dgTab({ tab: 'daily' }); G.view='dungeon'; __rogue.renderAll(); }")
    check('回数0のとき広告ボタンが出る', pg.locator('[data-act="monetReward"][data-kind="daily"]').count() == 1)
    pg.evaluate("() => __rogue.monetReward('daily')"); pg.wait_for_timeout(200)
    r = pg.evaluate("() => [__rogue.dailyLeft(G.p), __rogue.adLeft('daily')]")
    check('挑戦回数が+1され、その日はもう押せない', r == [1, 0], r)
    # 日付が変われば広告回数も回復
    pg.evaluate("() => { G.p.ads.date = '2000-01-01'; __rogue.ensureIap(G.p); }")
    check('日付が変わると広告回数が回復', pg.evaluate("() => [__rogue.adLeft('drops'), __rogue.adLeft('daily')]") == [3, 1])
    # 戦闘画面の速度ボタン表示
    pg.evaluate("() => { G.view='dungeon'; __rogue.renderAll(); }")
    check('ページエラーなし', not errs, errs); b.close()
print('ALL PASS' if F == 0 else 'FAILED'); raise SystemExit(1 if F else 0)
