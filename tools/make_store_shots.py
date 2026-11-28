#!/usr/bin/env python3
"""Google Play 用スクリーンショット（1080x1920）を docs/store/ に作る。"""
import os
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'store'); os.makedirs(OUT, exist_ok=True)
with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 640}, device_scale_factor=3, is_mobile=True, has_touch=True)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(500)
    pg.evaluate("() => { localStorage.setItem('rogue_tut_done_v1','1'); G.p.lv = 3; __rogue.save(); }")
    pg.goto('file://' + ROOT + '/index.html'); pg.wait_for_timeout(800)
    pg.evaluate("""() => { const R = __rogue; G._titleUp = false; const p = G.p; p.skin = 'stella'; p.lv = 42; p.sp = 60; p.gold = 18450; p.gacha.drops = 36;
      p.name = p.name || 'ステラ'; R.ACTS.spAlloc({ tree: 'sword', amount: 15 }); R.ACTS.spAlloc({ tree: 'sword_a', amount: 12 }); p.skills.heal = p.skills.heal; const sk = Object.keys(p.skills).filter(k => p.skills[k]); p.equippedSkills = [sk[0] || null, sk[1] || null, sk[2] || null]; p.sp = 9; p.hp = R.maxHp(p); }""")
    pg.add_style_tag(content='#toast{display:none!important}')
    def shot(name, js, wait=500):
        pg.evaluate(js); pg.wait_for_timeout(wait); pg.screenshot(path=f'{OUT}/{name}.png'); print(name)
    shot('1_town', "() => { G.view='town'; __rogue.renderAll(); }")
    shot('2_dungeon', "() => { G.view='dungeon'; __rogue.renderAll(); }")
    pg.evaluate("() => { const R = __rogue; G.view='dungeon'; R.renderAll(); R.ACTS.dgTab && R.ACTS.dgTab({tab:'normal'}); R.ACTS.go({ d: 'A', df: 'novice' }); }")
    pg.evaluate("() => { const R = __rogue; G.noTimer = true; for (let i = 0; i < 160; i++) R.tick(); }")
    pg.wait_for_timeout(400); pg.screenshot(path=f'{OUT}/2b_battle.png'); print('2b_battle')
    pg.evaluate("() => { const R = __rogue; if (G.run) R.ACTS.retreat({}); }"); pg.wait_for_timeout(400)
    pg.evaluate("() => { const b = [...document.querySelectorAll('#modal button')].find(x => x.innerText.includes('街へ戻る')); if (b) b.click(); }"); pg.wait_for_timeout(500)
    shot('3_skill', "() => { G.view='status'; G.statusTab='skill'; __rogue.renderAll(); }")
    shot('4_gacha', "() => { G.view='town'; __rogue.renderAll(); __rogue.ACTS.townEnter({v:'gacha'}); }")
    shot('5_help', "() => { G.view='help'; G.helpTab='world'; __rogue.renderAll(); }")
    print(errs)
    b.close()
