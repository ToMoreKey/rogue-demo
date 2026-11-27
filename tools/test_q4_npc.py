#!/usr/bin/env python3
"""Q4-4 5-A NPC拡張: ルル・進行度/時間帯/主人公別台詞・タップで会話・ネタバレ走査"""
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
    # --- ネタバレ走査: 段階①〜③で出る可能性のある全台詞に「ニヒル」を含まない
    bad = ev("""() => {
      const R = __rogue, out = [], walk = (o, path) => { if (typeof o === 'string') { if (o.includes('ニヒル')) out.push(path + ': ' + o); } else if (Array.isArray(o)) o.forEach((x, i) => walk(x, path + '[' + i + ']')); else if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], path + '.' + k); };
      for (const k of Object.keys(R.NPCS)) walk(R.NPCS[k], 'NPCS.' + k);
      for (const k of Object.keys(R.NPC_EXTRA)) { const x = R.NPC_EXTRA[k]; walk({ time: x.time, chars: x.chars, trivia: x.trivia, s1: x.stage[1], s2: x.stage[2], s3: x.stage[3] }, 'EXTRA.' + k); }
      const g = R.GUIDE_LINES; walk({ first: g.first, s1: g.stage[1], s2: g.stage[2], s3: g.stage[3], time: g.time, chars: g.chars, tower: g.tower, trivia: g.trivia }, 'GUIDE');
      return out; }""")
    check('段階①〜③の台詞にニヒルを含まない', bad == [], bad)
    check('段階④にはニヒルの名が出てよい(ルル)', ev("() => __rogue.GUIDE_LINES.stage[4].some(l => l.includes('ニヒル'))"))
    # --- 追加台詞の本数（施設NPCごと10本以上）
    cnt = ev("() => Object.fromEntries(Object.keys(__rogue.NPC_EXTRA).map(k => { const x = __rogue.NPC_EXTRA[k]; const n = Object.values(x.stage).flat().length + Object.values(x.time).flat().length + Object.values(x.chars).flat().length + x.trivia.length; return [k, n]; }))")
    check('各NPCに追加台詞10本以上', all(v >= 10 for v in cnt.values()), cnt)
    # --- 進行度・時間帯の注入
    ev("() => { G._npcStage = 2; G._hour = 23; }")
    pool = ev("() => __rogue.npcTalkPool('inn', G.p)")
    X = ev("() => __rogue.NPC_EXTRA.inn")
    check('段階2の台詞が選択肢に入り、段階1/3は入らない', all(l in pool for l in X['stage']['2']) and not any(l in pool for l in X['stage']['1'] + X['stage']['3']))
    check('時間帯(深夜)の台詞が入る', all(l in pool for l in X['time']['mid']) and not any(l in pool for l in X['time']['morning']))
    ev("() => { G._hour = 8; }")
    check('時間帯(朝)に切り替わる', all(l in ev("() => __rogue.npcTalkPool('inn', G.p)") for l in X['time']['morning']))
    ev("() => { G.p.skin = 'silia'; }")
    check('主人公別の台詞', X['chars']['silia'][0] in ev("() => __rogue.npcTalkPool('inn', G.p)"))
    ev("() => { G._npcStage = null; G._hour = null; G.p.skin = 'ruby'; }")
    # --- 段階の自動判定
    st = ev("() => { const p = G.p; const r = []; p.ending = false; p.part1Cleared = false; p.cleared = {}; r.push(__rogue.npcStage(p)); p.part1Cleared = true; r.push(__rogue.npcStage(p)); p.cleared = { J: { novice: true } }; r.push(__rogue.npcStage(p)); p.ending = true; r.push(__rogue.npcStage(p)); p.ending = false; p.part1Cleared = false; p.cleared = {}; return r; }")
    check('進行度判定 1/2/3/4', st == [1, 2, 3, 4], st)
    # --- DOM: ルル・タップで会話
    ev("() => { G.p.hints = {}; G._npc = null; G.townView='plaza'; __rogue.renderAll(); }")
    check('広場にルルが居る', pg.locator('.npc[data-fac=guide]').count() == 1)
    check('初回はルルの自己紹介', 'ルル' in pg.inner_text('.npc[data-fac=guide]') and '魔王ガルゼ' in pg.inner_text('.npc[data-fac=guide] .npc-bub p'))
    prev = pg.inner_text('.npc[data-fac=guide] .npc-bub p'); diffs = 0
    for _ in range(12):
        pg.click('.npc[data-fac=guide] .npc-bub'); pg.wait_for_timeout(30)
        cur = pg.inner_text('.npc[data-fac=guide] .npc-bub p')
        if cur != prev: diffs += 1
        prev = cur
    check('タップするたびに別の台詞(連続同一なし)', diffs == 12, diffs)
    # --- 施設: 入店→タップ→操作後の表情
    ev("() => { G._npc = null; G._npcEvt = null; G.townView='smith'; __rogue.renderAll(); }")
    check('施設NPCにもタップ会話', pg.locator('.npc[data-fac=smith] .npc-bub[data-act=npcTalk]').count() == 1)
    check('通常時の表情は normal', pg.locator('.npc[data-fac=smith][data-ex=normal]').count() == 1)
    ev("() => { G._npcEvt = 'smithUpgrade'; G._npc = null; __rogue.renderAll(); }")
    check('操作後は joy の表情差分(DOM反映)', pg.locator('.npc[data-fac=smith][data-ex=joy] .npc-emote').count() == 1)
    # --- PNG立ち絵と3表情
    check('施設NPCはPNG立ち絵(img)', pg.locator('.npc[data-fac=smith] .npc-pt img').count() == 1)
    ok = ev("() => ['guide','inn','shop','smith','bank'].every(f => ['normal','joy','surprise'].every(e => __rogue.NPC_PNG[f][e].startsWith('data:image/png')))")
    check('5人×3表情のPNGが揃っている', ok)
    srcs = ev("() => ['normal','joy','surprise'].map(e => __rogue.NPC_PNG.smith[e]).filter((v,i,a)=>a.indexOf(v)===i).length")
    check('3表情は別画像', srcs == 3, srcs)
    ev("() => { G._npc = null; G._npcEvt = 'smithUpgrade'; __rogue.npcReact('smith','surprise'); __rogue.renderAll(); }")
    check('★9などで surprise 表情', pg.locator('.npc[data-fac=smith][data-ex=surprise] .npc-emote').count() == 1)
    ev("() => { G.townView='plaza'; __rogue.renderAll(); }")
    check('ルルはPNG', pg.locator('.npc[data-fac=guide] .npc-pt img').count() == 1)
    check('ページエラーなし', not errs, errs)
    b.close()
print('RESULT: ' + ('OK' if not F else 'NG')); sys.exit(1 if F else 0)
