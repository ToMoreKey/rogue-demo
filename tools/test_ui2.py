#!/usr/bin/env python3
"""UI-2 ヘルプ画面の項目分け（5サブタブ・1行配置・全7パネル網羅・sticky・スクロールリセット・保持・ステータス説明更新）テスト"""
import functools
import http.server
import socketserver
import sys
import tempfile
import threading
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FAILS = 0


def check(name, cond, detail=''):
    global FAILS
    if cond:
        print('PASS', name)
    else:
        FAILS += 1
        print('FAIL', name, detail)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


handler = functools.partial(QuietHandler, directory=str(ROOT))
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
HTTP_URL = f'http://127.0.0.1:{port}/index.html'
shot_dir = Path(tempfile.mkdtemp())

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(HTTP_URL)
    pg.wait_for_timeout(300)
    pg.evaluate('() => { G.tutorial = { done: true }; const o = document.getElementById("tut-overlay"); if (o) o.hidden = true; }')

    # 基準1: 360px / 390px / 420px で5タブが1行・高さ40px以上・横スクロールなし・ARIA属性
    for w in (360, 390, 420):
        pg.set_viewport_size({'width': w, 'height': 844})
        pg.click('#nav-help')
        pg.wait_for_timeout(100)
        info = pg.evaluate('''() => {
            const bar = document.querySelector('#view-help .st-tabs');
            const btns = [...document.querySelectorAll('#view-help .st-tab')];
            const rects = btns.map(b => b.getBoundingClientRect());
            return {
                roleBar: bar ? bar.getAttribute('role') : null,
                roles: btns.map(b => b.getAttribute('role')),
                arias: btns.map(b => b.getAttribute('aria-selected')),
                count: btns.length,
                tops: rects.map(r => Math.round(r.top)),
                minH: Math.min(...rects.map(r => r.height)),
                maxR: Math.max(...rects.map(r => r.right)),
                vw: window.innerWidth,
                ov: document.documentElement.scrollWidth - document.documentElement.clientWidth
            };
        }''')
        one_row = len(info['tops']) == 5 and (max(info['tops']) - min(info['tops']) <= 2)
        check(f'基準1_{w}px_5タブ1行・高さ>=40px・横溢れなし・ARIA',
              one_row and info['minH'] >= 40 and info['maxR'] <= info['vw'] and info['ov'] <= 0
              and info['roleBar'] == 'tablist' and all(r == 'tab' for r in info['roles'])
              and info['arias'].count('true') == 1,
              info)

    pg.set_viewport_size({'width': 390, 'height': 844})

    # 基準2: 全7パネルが欠落・重複なく5タブに割り当て & ステータスタブ説明がUI-1の5タブに更新されている
    tab_headings = {}
    for t in ('intro', 'world', 'skill', 'status', 'endgame'):
        pg.click(f'#view-help [data-act="helpTab"][data-tab="{t}"]')
        pg.wait_for_timeout(100)
        pg.screenshot(path=str(shot_dir / f'help_{t}_390x844.png'))
        hs = pg.evaluate('() => [...document.querySelectorAll("#view-help .panel h2")].map(e => e.innerText.trim())')
        tab_headings[t] = hs

    all_hs = [h for hs in tab_headings.values() for h in hs]
    expected_prefixes = [
        ('intro', '初心者ガイド'), ('intro', '💡 その他のヒント'),
        ('world', '🏘️ 街タブでできること'), ('world', '⚔️ ダンジョンタブでできること'),
        ('skill', '🎯 スキルシステムガイド'),
        ('status', '📊 ステータスタブでできること'),
        ('endgame', '🌌 後編・クリア後の要素ガイド')
    ]
    exact_match = (len(all_hs) == 7 and all(
        any(h.startswith(pref) for h in tab_headings[t]) for t, pref in expected_prefixes
    ))
    check('基準2_全7パネルが欠落・重複なく5タブに割り当て', exact_match, tab_headings)

    pg.click('#view-help [data-act="helpTab"][data-tab="status"]')
    pg.wait_for_timeout(80)
    status_help_txt = pg.evaluate('() => document.querySelector("#view-help").innerText')
    check('基準2_ステータス説明がUI-1の5タブ構成に更新',
          all(k in status_help_txt for k in ('勇者', '装備', 'スキル', '極意', 'データ')),
          status_help_txt)

    # 基準3: スクロールしてもタブバーがstickyで上端に残る & タブ切り替えで scrollTop が 0 に戻る
    pg.click('#view-help [data-act="helpTab"][data-tab="skill"]')
    pg.wait_for_timeout(100)
    sticky_res = pg.evaluate('''() => {
        const app = document.getElementById('app');
        app.scrollTop = 420;
        const r = document.querySelector('#view-help .st-tabs').getBoundingClientRect();
        const scrolledTop = app.scrollTop;
        return { scrolledTop, barTop: r.top, barBottom: r.bottom };
    }''')
    pg.click('#view-help [data-act="helpTab"][data-tab="intro"]')
    pg.wait_for_timeout(100)
    after_switch_scroll = pg.evaluate('() => document.getElementById("app").scrollTop')
    check('基準3_タブバーstickyと切り替え時スクロールリセット',
          sticky_res['scrolledTop'] > 100 and sticky_res['barTop'] >= 0 and sticky_res['barTop'] <= 20
          and after_switch_scroll == 0,
          (sticky_res, after_switch_scroll))

    # 基準4: 再描画・他画面往復で選択タブが保持され、localStorageにhelpTabが保存されない
    pg.click('#view-help [data-act="helpTab"][data-tab="world"]')
    pg.click('#nav-town')
    pg.wait_for_timeout(80)
    pg.click('#nav-help')
    pg.wait_for_timeout(80)
    keep_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.save();
        R.renderAll();
        const raw = localStorage.getItem(R.SAVE_KEY) || '';
        return {
            tab: G.helpTab,
            hasWorldH2: [...document.querySelectorAll('#view-help .panel h2')].some(e => e.innerText.includes('街タブでできること')),
            savedInJson: raw.includes('helpTab')
        };
    }''')
    check('基準4_再描画・他画面往復で保持＆セーブ非保存',
          keep_res['tab'] == 'world' and keep_res['hasWorldH2'] and (not keep_res['savedInJson']),
          keep_res)

    # 基準5: チュートリアル step 6 で #nav-help を押してヘルプ画面が開ける
    tut_help = pg.evaluate('''() => {
        const R = window.__rogue;
        G.view = 'status';
        G.tutorial = { step: 6, done: false };
        R.ACTS.nav({ v: 'help' });
        return G.view === 'help';
    }''')
    pg.evaluate('() => { G.tutorial = { done: true }; }')
    check('基準5_チュートリアルstep6でヘルプ遷移可能', tut_help)
    check('ページエラーなし', len(errors) == 0, errors)

    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
