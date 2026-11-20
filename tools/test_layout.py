#!/usr/bin/env python3
"""戦闘画面の4ボタン（1行・撤退が下のタブに隠れない）と、下のタブの固定のテスト。
  python3 tools/test_layout.py
"""
import os, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FAILS = 0


def check(name, ok, info=''):
    global FAILS
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ' ' + str(info)))
    if not ok:
        FAILS += 1


RECTS = '''() => { const q = s => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
  return { auto: q('#btn-autoskill'), hp: q('#btn-pot-hp'), mp: q('#btn-pot-mp'), ret: q('[data-act=retreat]'), nav: q('.nav'), vw: innerWidth, vh: innerHeight,
           autoText: document.getElementById('btn-autoskill').textContent.replace(/\\s/g, '') }; }'''

with sync_playwright() as pw:
    b = pw.chromium.launch()
    for w, h in ((390, 844), (390, 700), (360, 640)):
        pg = b.new_page(viewport={'width': w, 'height': h})
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.goto('file://' + os.path.join(ROOT, 'index.html'))
        pg.wait_for_timeout(500)
        pg.evaluate('() => { G.tutorial = { done: true }; const o = document.getElementById("tut-overlay"); if (o) o.hidden = true; document.getElementById("nav-dungeon").click(); }')
        pg.evaluate('() => document.querySelector("[data-act=go][data-d=A]").click()')
        pg.wait_for_timeout(600)
        r = pg.evaluate(RECTS)
        tops = [round(r[k]['t']) for k in ('auto', 'hp', 'mp', 'ret')]
        lefts = [r[k]['l'] for k in ('auto', 'hp', 'mp', 'ret')]
        tag = f'{w}x{h}'
        check(f'{tag} 4ボタンが1行に並ぶ', max(tops) - min(tops) <= 2 and lefts == sorted(lefts), (tops, lefts))
        check(f'{tag} 撤退が画面の幅に収まる', r['ret']['r'] <= r['vw'] - 8, r['ret'])
        check(f'{tag} 撤退が下のタブに隠れない', r['ret']['b'] <= r['nav']['t'] + 1, (r['ret'], r['nav']))
        check(f'{tag} スキル自動の表示（ON/OFF）', 'スキル自動' in r['autoText'] and ('ON' in r['autoText'] or 'OFF' in r['autoText']), r['autoText'])
        # スクロールしても、下のタブは一番下に固定される
        n0 = pg.evaluate('() => document.querySelector(".nav").getBoundingClientRect().bottom')
        pg.evaluate('() => { document.getElementById("app").scrollTop = 400; window.scrollTo(0, 400); }')
        pg.wait_for_timeout(200)
        n1 = pg.evaluate('() => document.querySelector(".nav").getBoundingClientRect().bottom')
        sc = pg.evaluate('() => ({ doc: document.documentElement.scrollHeight - innerHeight, win: window.scrollY })')
        check(f'{tag} スクロールしても下のタブが動かない・画面の一番下', abs(n0 - n1) < 0.5 and abs(n1 - h) <= 1, (n0, n1, h))
        check(f'{tag} 画面全体（ページ）はスクロールしない', sc['doc'] <= 1 and sc['win'] == 0, sc)
        check(f'{tag} 横スクロールなし', pg.evaluate('() => document.documentElement.scrollWidth <= document.documentElement.clientWidth'))
        check(f'{tag} ページエラーなし', len(errors) == 0, errors)
        pg.close()
    b.close()

print('\nRESULT:', 'OK' if FAILS == 0 else f'FAIL({FAILS})')
sys.exit(1 if FAILS else 0)
