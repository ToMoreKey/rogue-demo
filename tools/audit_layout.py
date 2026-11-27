#!/usr/bin/env python3
"""画面レイアウト監査（Q4-2B）。複数ビューポート×主要画面で、横スクロール・画面外にはみ出す要素・小さいタップ領域を調べる。
  python3 tools/audit_layout.py          # 一覧を表示
  from audit_layout import run_audit     # test_q4_layout.py から利用
"""
import os, sys, json
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
VIEWPORTS = [(320, 568), (360, 640), (375, 667), (390, 844), (430, 932), (768, 1024), (844, 390), (1024, 768)]

SETUP = """() => { const R = window.__rogue; G.tutorial = { done: true }; const o = document.getElementById('tut-overlay'); if (o) o.hidden = true; R.noTimer(true);
  G._charSelectOpen = false; const m = document.getElementById('modal'); if (m) m.hidden = true; G.modalOpen = false;
  const p = G.p; p.lv = 30; p.gold = 5000; p.sp = 6; p.ending = true; p.cleared = { A: { novice: true, mid: true, high: true }, B: { novice: true } };
  const mk = (slot, star, roll, r) => { const it = R.genItem(R.DIFFS[1], false, slot, star); it.star = star; it.roll = roll; it.rarity = r; it.props = []; it.prop = null; return it; };
  p.weapon = mk('weapon', 3, .8, 1); p.armor = mk('armor', 3, .7, 1); p.bag = [mk('weapon', 5, .9, 2), mk('weapon', 2, .5, 0), mk('armor', 4, .9, 2), mk('armor', 1, .3, 0)]; p.bagCap = 20;
  p.hp = R.maxHp(p); p.mp = R.maxMp(p); G.run = null; }"""

# 画面の開き方（JS）。各画面は「その画面が見える状態」にする
SCREENS = {
    'town':       "() => { G.view = 'town'; G.townView = 'plaza'; R_.renderAll(); }",
    'inn':        "() => { G.view = 'town'; G.townView = 'inn'; R_.renderAll(); }",
    'shop':       "() => { G.view = 'town'; G.townView = 'shop'; R_.renderAll(); }",
    'smith':      "() => { G.view = 'town'; G.townView = 'smith'; R_.renderAll(); }",
    'bank':       "() => { G.view = 'town'; G.townView = 'bank'; R_.renderAll(); }",
    'dungeon':    "() => { G.view = 'dungeon'; R_.renderAll(); }",
    'st_hero':    "() => { G.view = 'status'; G.statusTab = 'hero'; R_.renderAll(); }",
    'st_gear':    "() => { G.view = 'status'; G.statusTab = 'gear'; G.gearSlot = 'weapon'; R_.renderAll(); }",
    'st_skill':   "() => { G.view = 'status'; G.statusTab = 'skill'; R_.renderAll(); }",
    'st_mastery': "() => { G.view = 'status'; G.statusTab = 'mastery'; R_.renderAll(); }",
    'st_data':    "() => { G.view = 'status'; G.statusTab = 'data'; R_.renderAll(); }",
    'help_intro': "() => { G.view = 'help'; G.helpTab = 'intro'; R_.renderAll(); }",
    'help_skill': "() => { G.view = 'help'; G.helpTab = 'skill'; R_.renderAll(); }",
    'battle':     "() => { G.view = 'dungeon'; R_.startRun('A', 'novice'); R_.renderAll(); }",
    'result':     "() => { G.view = 'dungeon'; R_.renderAll(); R_.openModal && 0; }",
}

# 画面外へはみ出した要素を探す（意図的な横スクロール枠の中身は除外）
PROBE = """() => {
  const vw = window.innerWidth, vh = window.innerHeight, out = { hscroll: document.documentElement.scrollWidth - vw, over: [], small: [], offscreenBtns: [] };
  const inScroller = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const c = getComputedStyle(e); if ((c.overflowX === 'auto' || c.overflowX === 'scroll') && e.scrollWidth > e.clientWidth) return true; } return false; };
  const visible = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const c = getComputedStyle(el); return c.visibility !== 'hidden' && c.display !== 'none' && c.opacity !== '0'; };
  const root = document.querySelector('.view:not([hidden])') || document.body;
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.closest('svg') || el.closest('#toast')) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1.5 && !inScroller(el) && out.over.length < 6) out.over.push((el.className || el.tagName) + ':' + Math.round(r.right));
  }
  for (const b of document.querySelectorAll('[data-act]')) {
    if (!visible(b) || b.disabled) continue;
    const r = b.getBoundingClientRect(), nav = document.querySelector('.nav');
    if (r.width < 30 || r.height < 30) { if (out.small.length < 8) out.small.push((b.dataset.act || '') + ':' + Math.round(r.width) + 'x' + Math.round(r.height)); }
    if (r.right > vw + 1.5 || r.left < -1.5) out.offscreenBtns.push(b.dataset.act + ':x');
  }
  return out;
}"""


def run_audit(screens=None, viewports=None, verbose=False):
    screens = screens or list(SCREENS)
    viewports = viewports or VIEWPORTS
    res = []
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        for (w, h) in viewports:
            pg = b.new_page(viewport={'width': w, 'height': h})
            errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto('file://' + os.path.join(ROOT, 'index.html'))
            pg.wait_for_timeout(400)
            pg.evaluate('() => { window.R_ = window.__rogue; }')
            for name in screens:
                try:
                    pg.evaluate(SETUP)
                    if name == 'result':
                        pg.evaluate("""() => { const R = R_, p = G.p; const mk = (slot, star, roll, r) => { const it = R.genItem(R.DIFFS[1], false, slot, star); it.star = star; it.roll = roll; it.rarity = r; it.props = []; it.prop = null; return it; };
                          const a = mk('weapon', 5, .9, 2), c = mk('armor', 1, .3, 1); p.bag.push(a, c);
                          G.last = { result: 'clear', d: R.DUNGEONS[0], df: R.DIFFS[1], floors: 5, floor: 5, cleared: true, gold: 300, clearGold: 260, lost: 0, sp: 1, items: [a, c], potions: { hp: 1, mp: 0 }, lvFrom: 29, lvTo: 30, snap: R.statSnap(p), after: R.statSnap(p), kills: 12, part1End: false, ending: false, tower: null, abyss: null };
                          G.view = 'dungeon'; R.renderAll(); R.openModal(); document.getElementById('modal').hidden = false; G.modalOpen = true; }""")
                    else:
                        pg.evaluate(SCREENS[name])
                    pg.wait_for_timeout(60)
                    r = pg.evaluate(PROBE)
                    r.update({'vp': f'{w}x{h}', 'screen': name})
                    if name == 'battle':
                        r['battle'] = pg.evaluate("""() => { const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; };
                          return { ret: q('[data-act=retreat]'), nav: q('.nav'), vh: innerHeight, vw: innerWidth }; }""")
                    res.append(r)
                except Exception as e:
                    res.append({'vp': f'{w}x{h}', 'screen': name, 'error': str(e)[:120]})
            pg.close()
        b.close()
    return res


if __name__ == '__main__':
    rows = run_audit()
    bad = 0
    for r in rows:
        probs = []
        if 'error' in r: probs.append('ERROR ' + r['error'])
        else:
            if r['hscroll'] > 1: probs.append(f"横スクロール +{r['hscroll']}px")
            if r['over']: probs.append('はみ出し ' + ','.join(r['over']))
            if r['offscreenBtns']: probs.append('ボタン画面外 ' + ','.join(r['offscreenBtns'][:4]))
            if r['small']: probs.append('小さいタップ ' + ','.join(r['small'][:5]))
            bt = r.get('battle')
            if bt and bt['ret'] and (bt['ret']['b'] > bt['nav']['t'] + 0.5 or bt['ret']['t'] < 0): probs.append(f"撤退ボタンが見切れ(b={bt['ret']['b']:.0f}/nav={bt['nav']['t']:.0f})")
        if probs:
            bad += 1
            print(f"{r['vp']:>9} {r['screen']:<11} " + ' | '.join(probs))
    print(f'--- {len(rows)}件中 {bad}件に指摘')
