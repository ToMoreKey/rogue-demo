#!/usr/bin/env python3
"""UI-1 ステータス画面の項目分け（5サブタブ・1行配置・全パネル網羅・sticky・スクロールリセット・保持・チュートリアル）テスト"""
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
        pg.click('#nav-status')
        pg.wait_for_timeout(100)
        info = pg.evaluate('''() => {
            const bar = document.querySelector('#view-status .st-tabs');
            const btns = [...document.querySelectorAll('#view-status .st-tab')];
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

    # 基準2: 各タブの見出し収集（全12パネルがちょうど1つのタブに入り、欠落・重複なし）& SP通知ドット & 極意未解放表示
    tab_headings = {}
    for t in ('hero', 'gear', 'skill', 'mastery', 'data'):
        pg.click(f'[data-act="statusTab"][data-tab="{t}"]')
        pg.wait_for_timeout(100)
        pg.screenshot(path=str(shot_dir / f'status_{t}_390x844.png'))
        hs = pg.evaluate('() => [...document.querySelectorAll("#view-status .panel h2")].map(e => e.innerText.trim())')
        tab_headings[t] = hs

    all_hs = [h for hs in tab_headings.values() for h in hs]
    expected_prefixes = [
        ('hero', '戦闘力'), ('hero', '勇者'), ('hero', '称号'), ('hero', '外見変更'),
        ('gear', '装備'), ('gear', 'バッグ'), ('gear', '薬'), ('gear', '強化石'),
        ('skill', 'スキルセット'), ('skill', 'スキル枠'),
        ('mastery', '極意（共通パッシブ）'),
        ('data', 'データ')
    ]
    exact_match = (len(all_hs) == 12 and all(
        any(h.startswith(pref) for h in tab_headings[t]) for t, pref in expected_prefixes
    ))
    check('基準2_全12パネルが欠落・重複なく5タブに割り当て', exact_match, tab_headings)

    # 極意クリア前表示とSPドット確認
    dot_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p.sp = 3; G.p.ending = false;
        G.statusTab = 'mastery';
        R.renderAll();
        const lockedTxt = document.querySelector('#view-status').innerText;
        const dotSkill1 = !!document.querySelector('[data-tab="skill"] .st-dot');
        const dotMas1 = !!document.querySelector('[data-tab="mastery"] .st-dot');
        G.p.ending = true;
        R.renderAll();
        const dotMas2 = !!document.querySelector('[data-tab="mastery"] .st-dot');
        G.p.sp = 0;
        R.renderAll();
        const dotSkill0 = !!document.querySelector('[data-tab="skill"] .st-dot');
        return { locked: lockedTxt.includes('本編クリア'), dotSkill1, dotMas1, dotMas2, dotSkill0 };
    }''')
    check('基準2_極意クリア前表示とSP通知ドット',
          dot_res['locked'] and dot_res['dotSkill1'] and (not dot_res['dotMas1']) and dot_res['dotMas2'] and (not dot_res['dotSkill0']),
          dot_res)

    # 基準3: 各タブの主要ボタン動作（外見変更・図鑑開閉でタブ保持・自動装備切替・薬・SP割り振り・極意強化・読み込み/不具合報告モーダル）
    target_skin = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p.sp = 10; G.p.ending = true; G.p.potions.hp = 2; G.p.hp = 10;
        R.renderAll();
        return R.CHAR_SKINS[1].id;
    }''')
    # hero: 外見変更
    pg.click('[data-act="statusTab"][data-tab="hero"]')
    pg.click(f'[data-act="changeSkin"][data-id="{target_skin}"]')
    skin_now = pg.evaluate('() => G.p.skin')
    # gear: 自動装備トグル & 薬 & 図鑑モーダル開閉でタブ保持
    pg.click('[data-act="statusTab"][data-tab="gear"]')
    ae_before = pg.evaluate('() => G.opts.autoEquip')
    pg.click('[data-act="autoEquipToggle"]')
    ae_after = pg.evaluate('() => G.opts.autoEquip')
    hp_before = pg.evaluate('() => G.p.hp')
    pg.click('#view-status [data-act="potion"][data-k="hp"]')
    hp_after = pg.evaluate('() => G.p.hp')
    # skill: SP割り振り & スキル装備（target_skin は stella なので sword -> strike）
    pg.click('[data-act="statusTab"][data-tab="skill"]')
    pg.click('[data-act="spAlloc"][data-tree="sword"][data-amount="1"]')
    pg.click('[data-act="spAlloc"][data-tree="sword"][data-amount="1"]')
    pg.click('[data-act="spAlloc"][data-tree="sword"][data-amount="1"]')
    pg.click('[data-act="equipSkill"][data-id="strike"][data-slot="0"]')
    eq0 = pg.evaluate('() => G.p.equippedSkills[0]')
    # mastery: 極意強化 & 図鑑モーダル開閉後も mastery タブ保持
    pg.click('[data-act="statusTab"][data-tab="mastery"]')
    pg.click('[data-act="masteryUp"][data-id="m_atk"]')
    m_lv = pg.evaluate('() => G.p.mastery.m_atk')
    pg.evaluate('() => window.__rogue.ACTS.openDex()')
    pg.wait_for_timeout(100)
    pg.click('#m-sheet [data-act="closeTowerModal"]')
    tab_after_dex = pg.evaluate('() => G.statusTab')
    # data: 読み込みモーダル
    pg.click('[data-act="statusTab"][data-tab="data"]')
    pg.click('[data-act="openImportModal"]')
    imp_open = pg.evaluate('() => !document.querySelector("#modal").hidden && document.querySelector("#m-title").innerText.includes("読み込む")')
    pg.click('#m-sheet [data-act="closeTowerModal"]')

    check('基準3_各タブ主要ボタン動作とモーダル後のタブ保持',
          skin_now == target_skin and (ae_before != ae_after) and (hp_after > hp_before)
          and eq0 == 'strike' and m_lv == 1 and tab_after_dex == 'mastery' and imp_open,
          (skin_now, target_skin, ae_before, ae_after, hp_before, hp_after, eq0, m_lv, tab_after_dex, imp_open))

    # 基準4: スクロールしてもタブバーがstickyで上端に残る & タブ切り替えで scrollTop が 0 に戻る
    pg.click('[data-act="statusTab"][data-tab="skill"]')
    pg.wait_for_timeout(100)
    sticky_res = pg.evaluate('''() => {
        const app = document.getElementById('app');
        app.scrollTop = 420;
        const r = document.querySelector('#view-status .st-tabs').getBoundingClientRect();
        const scrolledTop = app.scrollTop;
        return { scrolledTop, barTop: r.top, barBottom: r.bottom };
    }''')
    pg.click('[data-act="statusTab"][data-tab="hero"]')
    pg.wait_for_timeout(100)
    after_switch_scroll = pg.evaluate('() => document.getElementById("app").scrollTop')
    check('基準4_タブバーstickyと切り替え時スクロールリセット',
          sticky_res['scrolledTop'] > 100 and sticky_res['barTop'] >= 0 and sticky_res['barTop'] <= 20
          and after_switch_scroll == 0,
          (sticky_res, after_switch_scroll))

    # 基準5: 再描画・画面往復で選択タブが保持され、localStorageにstatusTabが保存されない
    pg.click('[data-act="statusTab"][data-tab="gear"]')
    pg.click('#nav-town')
    pg.wait_for_timeout(80)
    pg.click('#nav-status')
    pg.wait_for_timeout(80)
    keep_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.renderAll();
        const raw = localStorage.getItem(R.SAVE_KEY) || '';
        return {
            tab: G.statusTab,
            hasGearH2: [...document.querySelectorAll('#view-status .panel h2')].some(e => e.innerText.includes('装備')),
            savedInJson: raw.includes('statusTab')
        };
    }''')
    check('基準5_再描画・他画面往復で保持＆セーブ非保存',
          keep_res['tab'] == 'gear' and keep_res['hasGearH2'] and (not keep_res['savedInJson']),
          keep_res)

    # 基準6: チュートリアル step 4 -> 41 で自動的に「スキル」タブに切り替わる
    tut_tab = pg.evaluate('''() => {
        const R = window.__rogue;
        G.statusTab = 'hero';
        G.view = 'town';
        G.tutorial = { step: 4, done: false };
        R.ACTS.nav({ v: 'status' });
        return G.statusTab;
    }''')
    pg.evaluate('() => { G.tutorial = { done: true }; }')
    check('基準6_チュートリアルでスキルタブ自動切替', tut_tab == 'skill', tut_tab)
    check('ページエラーなし', len(errors) == 0, errors)

    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
