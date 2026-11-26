#!/usr/bin/env python3
"""チュートリアルのスキップ廃止テスト: スキップボタンが無く、チュートリアルが最後まで進められる。
  python3 tools/test_noskip.py
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


html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
check('index.html にスキップボタン・処理が無い', all(x not in html for x in ('tut-skip', 'tutSkip', 'チュートリアルをスキップ')))

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 420, 'height': 900})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto('file://' + os.path.join(ROOT, 'index.html'))
    pg.wait_for_timeout(800)
    check('新規プレイヤーでチュートリアルが始まる', pg.evaluate('() => !!G.tutorial && !G.tutorial.done'))
    check('画面上にスキップの文字が無い', pg.evaluate('() => !document.body.innerText.includes("スキップ") && !document.getElementById("tut-skip")'))

    def click(sel):
        pg.evaluate('(s) => document.querySelector(s).click()', sel)
        pg.wait_for_timeout(500)

    # 新規ゲームの最初にキャラクター選択モーダルが出るので、シリアを選んで確定する
    click('[data-act="selectStartChar"][data-id="silia"]')
    click('#btn-confirm-char')

    click('#nav-dungeon')
    check('step1 へ進む', pg.evaluate('() => G.tutorial.step') == 1, pg.evaluate('() => G.tutorial.step'))
    click('[data-act="go"][data-d="A"]')
    check('step2（戦闘中）へ進む', pg.evaluate('() => G.tutorial.step') == 2)
    # 戦闘を進めて HP 50% 未満にする（敵の攻撃で減る）。上限を決めて回す
    stepped = pg.evaluate('''() => { const R = window.__rogue; G.noTimer = true; let n = 0;
        while (G.tutorial && G.tutorial.step === 2 && G.run && n < 3000) { R.tick(); n++; }
        return { step: G.tutorial.step, run: !!G.run, n }; }''')
    check('step3（撤退を促す）へ進む', stepped['step'] == 3, stepped)
    pg.wait_for_timeout(300)
    click('[data-act="retreat"]')
    pg.wait_for_timeout(1200)
    check('step4 へ進む', pg.evaluate('() => G.tutorial.step') == 4, pg.evaluate('() => G.tutorial.step'))
    click('#nav-status')
    pg.wait_for_timeout(600)
    check('step41（SP割り振り）へ進む', pg.evaluate('() => G.tutorial.step') == 41, pg.evaluate('() => G.tutorial.step'))
    for _ in range(3):
        click('[data-act="spAlloc"][data-tree="life"][data-amount="1"]')
    pg.wait_for_timeout(800)
    check('step5（スキル装備）へ進む', pg.evaluate('() => G.tutorial.step') == 5, pg.evaluate('() => [G.tutorial.step, !!G.p.skills.heal]'))
    click('[data-act="equipSkill"][data-id="heal"]:not([disabled])')
    pg.wait_for_timeout(800)
    check('step6（完了メッセージ）へ進む', pg.evaluate('() => G.tutorial.step') == 6)
    pg.wait_for_timeout(3600)
    check('チュートリアルが完了する', pg.evaluate('() => G.tutorial.done === true'))
    check('ページエラーなし', len(errors) == 0, errors)
    b.close()

print('\nRESULT:', 'OK' if FAILS == 0 else f'FAIL({FAILS})')
sys.exit(1 if FAILS else 0)
