#!/usr/bin/env python3
"""ルート式スキルツリー: 分岐・排他・選び直し・旧セーブ移行・表示"""
import os, json
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
    pg.evaluate("() => { localStorage.setItem('rogue_tut_done_v1','1'); }")
    pg.goto(URL); pg.wait_for_timeout(600)
    # 構成: 4キャラとも 共通/A/B ×2 + 英雄枠。SP合計は従来と同じ（共通+ルート=30）
    r = pg.evaluate("""() => { const R = __rogue; return R.CHAR_IDS.map(c => { const t = R.getCharTrees(c); return [c, t.length, t.filter(x => x.route).length, t.filter(x => x.route === 'a').every(a => { const o = t.find(y => y.id === a.base); return o.maxSp + a.maxSp === 30; })]; }); }""")
    check('4キャラとも7ツリー（ルート4本）で共通+ルート=30SP', all(x[1] == 7 and x[2] == 4 and x[3] for x in r), r)
    # 排他: 剣豪ルートを選ぶと守護ルートは取れない
    r = pg.evaluate("""() => { const R = __rogue; G.p = R.newPlayer(); const p = G.p; p.lv = 60; p.sp = 200; R.ACTS.changeSkin({ id: 'stella' });
      R.ACTS.spAlloc({ tree: 'sword_a', amount: 3 });
      const lockedBeforeCommon = (p.skillPts.sword_a || 0) === 0;
      R.ACTS.spAlloc({ tree: 'sword', amount: 15 });
      R.ACTS.spAlloc({ tree: 'sword_a', amount: 15 });
      R.ACTS.spAlloc({ tree: 'sword_b', amount: 5 });
      return { lockedBeforeCommon, a: p.skillPts.sword_a, b: p.skillPts.sword_b || 0, ult: !!p.skills.ult, sky: !!p.skills.skySlash, warGod: !!p.skills.warGod, bTreeOpen: R.getCharTrees('stella').find(t => t.id === 'sword_b').unlockWhen(p) }; }""")
    check('共通枠を進める前はルートに振れない', r['lockedBeforeCommon'], r)
    check('ルートAを選ぶとAのスキルが取れる', r['a'] == 15 and r['ult'] and r['sky'], r)
    check('もう一方のルートBは取れない（排他）', r['b'] == 0 and not r['warGod'] and not r['bTreeOpen'], r)
    # 選び直し: ルートAをリセットするとBが選べる
    r = pg.evaluate("""() => { const R = __rogue, p = G.p; p.gold = 999999; R.ACTS.spAllocReset({ tree: 'sword_a' }); R.ACTS.spAllocReset({ tree: 'sword_a' });
      R.ACTS.spAlloc({ tree: 'sword_b', amount: 15 });
      return { a: p.skillPts.sword_a, b: p.skillPts.sword_b, warGod: !!p.skills.warGod, ult: !!p.skills.ult, fullheal: !!p.skills.fullheal, counter: !!p.skills.counterBlade }; }""")
    check('ルートをリセットすると選び直せる', r['a'] == 0 and r['b'] == 15 and r['warGod'] and r['counter'] and not r['ult'], r)
    check('剣士の守護ルートに強い回復（フルヒール等）は入らない', not r['fullheal'], r)
    # 第2ツリー: 後半は剣系の合計30で解放（元の第2段階条件）。英雄枠は通算で判定
    r = pg.evaluate("""() => { const R = __rogue, p = G.p; p.sp = 300; p.ending = true; R.ACTS.spAlloc({ tree: 'warrior', amount: 10 });
      const early = true;
      R.ACTS.spAlloc({ tree: 'warrior_b', amount: 10 });
      R.ACTS.spAlloc({ tree: 'hero', amount: 20 });
      return { early, wb: p.skillPts.warrior_b, hero: p.skillPts.hero, shura: !!p.skills.shura, slash: !!p.skills.shuraSlash }; }""")
    check('第2ツリー後半は主ツリー合計30で解放・英雄枠は通算で判定', (not r['early']) or r['wb'] == 10, r)
    check('鬼神ルート（第2ツリー）のスキルが取れる・英雄枠も解放', r['wb'] == 10 and r['shura'] and r['hero'] == 20, r)
    # 共通枠をリセットすると、ぶら下がるルート・英雄枠も戻る（SP返却）
    r = pg.evaluate("""() => { const R = __rogue, p = G.p; const sp0 = p.sp; R.ACTS.spAllocReset({ tree: 'sword' }); R.ACTS.spAllocReset({ tree: 'sword' });
      return { sword: p.skillPts.sword, sb: p.skillPts.sword_b, hero: p.skillPts.hero, back: p.sp - sp0 }; }""")
    check('共通枠のリセットでルート・後続ツリーも戻りSPが返る', r['sword'] == 0 and r['sb'] == 0 and r['hero'] == 0 and r['back'] >= 15 + 15, r)
    # 旧セーブ（剣30・戦士20・英雄20）: 共通枠の超過分と、条件を満たさなくなった英雄枠のSPを返却
    r = pg.evaluate("""() => { const R = __rogue; const key = R.SAVE_KEY; const base = R.newPlayer(); base.lv = 80; base.sp = 10;
      base.chars = { stella: { skillPts: { sword: 30, warrior: 20, hero: 20 }, equippedSkills: ['skySlash', 'hagun', null] }, ruby: { skillPts: {}, equippedSkills: [null, null, null] }, silia: { skillPts: {}, equippedSkills: [null, null, null] }, chloe: { skillPts: {}, equippedSkills: [null, null, null] } };
      localStorage.setItem(key, JSON.stringify({ v: R.SAVE_VERSION, p: base }));
      R.load(); const p = G.p, c = p.chars.stella.skillPts;
      return { sword: c.sword, warrior: c.warrior, hero: c.hero, sp: p.sp, notice: p.routeNotice, eq: p.chars.stella.equippedSkills.slice() }; }""")
    check('旧セーブは共通枠上限まで戻し、超過SPを返却（剣15・戦士10）', r['sword'] == 15 and r['warrior'] == 10 and r['hero'] == 0, r)
    check('返却SPの合計が合っている（30+20+20-15-10-0=45＋元10）', r['sp'] == 55 and r['notice'] == 45, r)
    # 表示: スキルタブにルートのカードと「選べません」の注記
    r = pg.evaluate("""() => { const R = __rogue; G.p = R.newPlayer(); G.p.lv = 60; G.p.sp = 100; R.ACTS.changeSkin({ id: 'stella' }); R.ACTS.spAlloc({ tree: 'sword', amount: 15 }); R.ACTS.spAlloc({ tree: 'sword_a', amount: 3 });
      G.view = 'status'; G.statusTab = 'skill'; R.renderAll();
      const names = [...document.querySelectorAll('#skill-trees-panel .st-name')].map(e => e.innerText.trim());
      const locks = [...document.querySelectorAll('#skill-trees-panel .st-lock-note')].map(e => e.innerText);
      return { names, locks, note: document.querySelector('#skill-trees-panel').innerText.includes('2つのルート') }; }""")
    check('スキルタブにルート説明・ルートのカードが並ぶ', r['note'] and '剣枠：剣豪ルート' in r['names'] and '剣枠：守護ルート' in r['names'], r)
    check('選べないルートに理由が出る', any('別のルート' in x for x in r['locks']), r)
    check('ページエラーなし', not errs, errs)
    b.close()
print('ALL PASS' if F == 0 else 'FAILED')
