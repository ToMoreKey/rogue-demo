#!/usr/bin/env python3
"""物語（会話シーン）: データ網羅・再生/スキップ・初回上級クリアで自動再生・見返し・セーブ"""
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
    pg.goto('file://' + ROOT + '/index.html?story=1'); pg.wait_for_timeout(500)
    ev = pg.evaluate
    ev("() => { G.tutorial = { done: true }; G.opts.fx = false; }")
    # データ網羅
    r = ev("""() => { const S = __rogue.STORY, heroes = ['ruby','stella','silia','chloe'], bad = [];
      for (const d of __rogue.DUNGEONS) { const sc = S[d.id]; if (!sc) { bad.push(d.id + ':なし'); continue; }
        if (sc.lines.length < 3 || sc.lines.length > 6) bad.push(d.id + ':行数' + sc.lines.length);
        for (const l of sc.lines) { if (l.sp === 'hero' && !(typeof l.t === 'object' && heroes.every(h => l.t[h]))) bad.push(d.id + ':主人公差分不足');
          if (!['hero','narr','guide','inn','shop','smith','bank'].includes(l.sp)) bad.push(d.id + ':話者' + l.sp); } }
      return bad; }""")
    check('A〜O全15場面が揃い、3〜6行・主人公4人分の差分あり', r == [], r)
    ev("() => { G.p.skin = 'stella'; __rogue.playStory('A'); }"); pg.wait_for_timeout(300)
    check('再生中は戦闘が止まり、場面が出る', ev("() => G._storyUp === true") and pg.locator('#story-screen').count() == 1)
    check('1行目はナレーション（名前なし）', pg.locator('#stv-text').inner_text().startswith('墓守の王'))
    pg.locator('#story-screen').click(); pg.wait_for_timeout(100)
    check('2行目は主人公ステラのセリフ（立ち絵つき）', pg.locator('#stv-name').inner_text() == 'ステラ' and '鐘守' in pg.locator('#stv-text').inner_text() and pg.locator('.stv-hero').count() == 1, pg.locator('#stv-text').inner_text())
    pg.locator('#story-screen').click(); pg.wait_for_timeout(100)
    check('3行目はルル（NPC立ち絵）', pg.locator('#stv-name').inner_text() == 'ルル' and pg.locator('.stv-npc').count() == 1)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(100); pg.keyboard.press('Enter'); pg.wait_for_timeout(500)
    check('最後まで進むと閉じて戦闘再開・既読になる', pg.locator('#story-screen').count() == 0 and ev("() => G._storyUp === false && __rogue.storySeen(G.p, 'A')"))
    ev("() => __rogue.playStory('B')"); pg.wait_for_timeout(200)
    pg.locator('#stv-skip').click(); pg.wait_for_timeout(500)
    check('スキップで即終了し既読になる', pg.locator('#story-screen').count() == 0 and ev("() => __rogue.storySeen(G.p, 'B')"))
    ev("() => __rogue.playStory('C')"); pg.wait_for_timeout(200); pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    check('Escでも終了', pg.locator('#story-screen').count() == 0)
    # 初回の上級クリアで予約→リザルトを閉じると再生
    ev("() => { G.p.story = { seen: {} }; G.p.cleared = { A: { novice: true, mid: true } }; G.p.lv = 40; G.view = 'dungeon'; __rogue.renderAll(); }")
    ev("() => { __rogue.startRun('A', 'high'); G.run.floor = G.run.floors; __rogue.finishRun('clear'); }"); pg.wait_for_timeout(300)
    check('クリア直後はリザルトが先で、まだ物語は出ない', pg.locator('#story-screen').count() == 0 and ev("() => !document.getElementById('modal').hidden"))
    ev("() => document.querySelector('[data-act=mTown]') ? document.querySelector('[data-act=mTown]').click() : document.querySelector('#m-retry').click()"); pg.wait_for_timeout(900)
    check('リザルトを閉じると物語が始まる', pg.locator('#story-screen').count() == 1, ev("() => document.getElementById('modal').hidden"))
    pg.locator('#stv-skip').click(); pg.wait_for_timeout(500)
    # 2回目のクリアでは出ない
    ev("() => { G.run = null; __rogue.startRun('A', 'high'); G.run.floor = G.run.floors; __rogue.finishRun('clear'); }"); pg.wait_for_timeout(200)
    ev("() => { const b = document.querySelector('[data-act=mTown]') || document.querySelector('#m-retry'); b && b.click(); }"); pg.wait_for_timeout(900)
    check('同じ場面は2回目のクリアで自動再生しない', pg.locator('#story-screen').count() == 0)
    # 初級クリアでは出ない
    ev("() => { G.p.story = { seen: {} }; __rogue.queueStory(G.p, 'B', 'novice', true); }")
    check('上級以外では予約されない', ev("() => !(G._storyQueue && G._storyQueue.length)"))
    # 見返し
    ev("() => { G.p.cleared = { A: { high: true } }; G.view = 'status'; G.statusTab = 'data'; __rogue.renderAll(); }"); pg.wait_for_timeout(200)
    pg.locator('[data-act=openStoryList]').click(); pg.wait_for_timeout(200)
    check('見返し一覧: クリア済みのAは押せて、未到達は鍵つき', pg.locator('[data-act=storyPlay][data-id=A]:not([disabled])').count() == 1 and pg.locator('[data-act=storyPlay][data-id=B][disabled]').count() == 1)
    pg.locator('[data-act=storyPlay][data-id=A]').click(); pg.wait_for_timeout(400)
    check('一覧から再生できる', pg.locator('#story-screen').count() == 1)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    # セーブ往復
    ev("() => { G.p.story = { seen: { A: true, I: true } }; __rogue.save(true); }")
    pg.goto('file://' + ROOT + '/index.html?story=1'); pg.wait_for_timeout(500)
    check('既読がセーブされ復元される', ev("() => __rogue.storySeen(G.p, 'A') && __rogue.storySeen(G.p, 'I') && !__rogue.storySeen(G.p, 'B')"))
    # 自動テストではクリアしても勝手に出ない
    pg2 = b.new_page(viewport={'width': 390, 'height': 844})
    pg2.goto('file://' + ROOT + '/index.html'); pg2.wait_for_timeout(400)
    check('?story=1なしの自動テストでは予約しない', pg2.evaluate("() => { G.tutorial = { done: true }; __rogue.queueStory(G.p, 'A', 'high', true); return !(G._storyQueue && G._storyQueue.length); }"))
    # チュートリアルの導入会話とルルの会話枠
    pt = b.new_page(viewport={'width': 390, 'height': 844}); et = []; pt.on('pageerror', lambda e: et.append(str(e)))
    pt.goto('file://' + ROOT + '/index.html?story=1'); pt.wait_for_timeout(700); pt.evaluate("() => { G.opts.fx = false; }")
    pt.locator('[data-act=selectStartChar]').first.click(); pt.wait_for_timeout(200); pt.locator('[data-act=confirmStartChar]').click(); pt.wait_for_timeout(900)
    check('新規開始でルルとの導入会話が始まる', pt.locator('#story-screen').count() == 1 and 'はじめまして' in pt.locator('.stv-title').inner_text())
    for _ in range(6):
        pt.evaluate("() => { const s = document.querySelector('#story-screen:not(.out)'); if (s) s.click(); }"); pt.wait_for_timeout(150)
    pt.wait_for_timeout(900)
    check('導入が終わるとチュートリアル(ダンジョンタブ)へ', pt.locator('#story-screen:not(.out)').count() == 0 and pt.evaluate("() => G.tutorial.step") == 0)
    tb = pt.locator('#tut-bubble')
    check('ルルの会話枠で案内される', tb.is_visible() and 'ルル' in tb.inner_text() and 'ダンジョン' in tb.inner_text() and tb.locator('img.tut-lulu-img').count() == 1, tb.inner_text())
    check('導入のあともページエラーなし', not et, et)
    pa = b.new_page(viewport={'width': 390, 'height': 844})
    pa.goto('file://' + ROOT + '/index.html'); pa.wait_for_timeout(700)
    pa.locator('[data-act=selectStartChar]').first.click(); pa.wait_for_timeout(200); pa.locator('[data-act=confirmStartChar]').click(); pa.wait_for_timeout(900)
    check('自動テストでは導入会話を飛ばして直接チュートリアル', pa.locator('#story-screen').count() == 0 and pa.evaluate("() => G.tutorial.step") == 0)
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: OK' if F == 0 else f'RESULT: NG ({F} fails)')
sys.exit(1 if F else 0)
