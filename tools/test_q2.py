#!/usr/bin/env python3
"""Q2 テスト版のエフェクト確認パネル（本番非表示・全スキル網羅・速度/激昂/バフ/敵切替/停止・状態不変・stickyレイアウト）テスト"""
import functools
import http.server
import os
import subprocess
import sys
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FAILS = 0


def check(name, cond, detail=''):
    global FAILS
    if cond:
        print('PASS', name)
    else:
        FAILS += 1
        print('FAIL', name, detail)


tmp = tempfile.mkdtemp()
site = os.path.join(tmp, 'site')
subprocess.check_call(
    [sys.executable, os.path.join(ROOT, 'tools', 'make_site.py'), '--main', ROOT, '--dev', ROOT, '--out', site],
    stdout=subprocess.DEVNULL
)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


handler = functools.partial(QuietHandler, directory=site)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE_URL = f'http://127.0.0.1:{port}'

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    errors = []

    # 基準1: 本番ビルドにはボタンもモーダルも出ない・開けない。devビルドでは「データ」タブにボタンが出て開閉できる
    pg_prod = ctx.new_page()
    pg_prod.on('pageerror', lambda e: errors.append('prod:' + str(e)))
    pg_prod.goto(BASE_URL + '/index.html')
    pg_prod.wait_for_timeout(300)
    prod_res = pg_prod.evaluate('''() => {
        const R = window.__rogue;
        G.tutorial = { done: true };
        R.ACTS.nav({ v: 'status' });
        R.ACTS.statusTab({ tab: 'data' });
        const hasBtn = !!document.querySelector('[data-act="openFxDebug"]');
        R.ACTS.openFxDebug();
        R.openFxDebugModal();
        const modalOpen = G.modalOpen || !document.getElementById('modal').hidden || !!document.getElementById('fxd-arena');
        return { isDev: R.IS_DEV_BUILD, hasBtn, modalOpen };
    }''')
    check('基準1_本番ビルドにはボタンが出ず直接呼んでもモーダルが開かない',
          (not prod_res['isDev']) and (not prod_res['hasBtn']) and (not prod_res['modalOpen']),
          prod_res)
    pg_prod.close()

    # dev ビルドを開く
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append('dev:' + str(e)))
    pg.goto(BASE_URL + '/dev/index.html')
    pg.wait_for_timeout(300)
    dev_open_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.tutorial = { done: true };
        const o = document.getElementById('tut-overlay'); if (o) o.hidden = true;
        R.ACTS.nav({ v: 'status' });
        R.ACTS.statusTab({ tab: 'data' });
        const btn = document.querySelector('[data-act="openFxDebug"]');
        const hasBtn = !!btn && btn.innerText.includes('エフェクト確認');
        if (btn) btn.click();
        const opened = G.modalOpen && !document.getElementById('modal').hidden && !!document.getElementById('fxd-arena');
        const closeBtn = document.querySelector('#m-sheet [data-act="closeTowerModal"]');
        if (closeBtn) closeBtn.click();
        const closed = !G.modalOpen && document.getElementById('modal').hidden;
        return { isDev: R.IS_DEV_BUILD, hasBtn, opened, closed };
    }''')
    check('基準1_devビルドで「🎬 エフェクト確認」ボタンが出てモーダルが開閉できる',
          dev_open_res['isDev'] and dev_open_res['hasBtn'] and dev_open_res['opened'] and dev_open_res['closed'],
          dev_open_res)

    # 基準2 & 基準4: 全スキルIDのボタンが漏れ・重複なく並び、各ボタンで要素が出て消える & 操作前後でG.p/G.run/localStorageが不変
    # 設定 G.opts.fx = false でもパネル内では再生されることも同時に確認
    snap_before = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p.gold = 54321;
        G.opts.fx = false; // 設定OFFでもパネル内は再生されることを確認
        G.opts.speed = 2;  // 実戦闘の速度設定がパネル操作で書き換わらないことを確認
        R.save();
        return {
            pJson: JSON.stringify(G.p),
            runVal: G.run,
            optsJson: JSON.stringify(G.opts),
            lsRaw: localStorage.getItem(R.SAVE_KEY)
        };
    }''')

    sk_panel_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.ACTS.openFxDebug();
        const btns = [...document.querySelectorAll('#fxd-skills [data-act="fxDbgSkill"]')];
        const btnIds = btns.map(b => b.dataset.id);
        const allSkIds = Object.keys(R.SK);
        const grps = [...document.querySelectorAll('#fxd-skills .fxd-grp')];
        // 高速 ×4 にして全42ボタンを順にクリックし、毎回 #fxd-layer に要素が出ることを確認
        R.ACTS.fxDbgSpeed({ v: '4' });
        const counts = {};
        for (const b of btns) {
            b.click();
            counts[b.dataset.id] = document.getElementById('fxd-layer').children.length;
        }
        return {
            grpCount: grps.length,
            btnCount: btnIds.length,
            uniqueCount: new Set(btnIds).size,
            totalSk: allSkIds.length,
            allCovered: allSkIds.every(id => btnIds.includes(id)),
            allSpawned: Object.values(counts).every(c => c > 0 && c <= 12),
            realBattleLayerEmpty: document.getElementById('fx-layer').children.length === 0,
            counts
        };
    }''')
    pg.wait_for_timeout(300)
    after_wait_layer = pg.evaluate('() => document.getElementById("fxd-layer").children.length')
    check('基準2_全スキルIDのボタンが5分類に漏れ・重複なく並ぶ',
          sk_panel_res['grpCount'] == 5 and sk_panel_res['btnCount'] == sk_panel_res['totalSk']
          and sk_panel_res['uniqueCount'] == sk_panel_res['totalSk'] and sk_panel_res['allCovered'],
          sk_panel_res)
    check('基準2_設定OFFでも全スキルボタンで演出要素が出現し規定時間内に消える（実戦闘DOM非干渉）',
          sk_panel_res['allSpawned'] and sk_panel_res['realBattleLayerEmpty'] and after_wait_layer == 0,
          (sk_panel_res['allSpawned'], after_wait_layer))

    # 基準3: 速度・激昂ON/OFF・激昂の瞬間・バフオーラ・敵切替・停止が動く & 連打しても要素が12個を超えない
    ctrl_res = pg.evaluate('''() => {
        const R = window.__rogue;
        // 速度切替（G.opts.speed は 2 のまま変わらないこと）
        R.ACTS.fxDbgSpeed({ v: '1' });
        R.playSkillFx('cosmicNova', 1, R.fxDebugTarget());
        const dur1 = document.getElementById('fxd-layer').style.getPropertyValue('--fx-dur');
        R.ACTS.fxDbgSpeed({ v: '4' });
        R.playSkillFx('cosmicNova', 1, R.fxDebugTarget());
        const dur4 = document.getElementById('fxd-layer').style.getPropertyValue('--fx-dur');
        const realSpeedUnchanged = G.opts.speed === 2;

        // 敵切替（雑魚 -> ボス(O)）
        const enemyBefore = document.getElementById('fxd-ename').textContent;
        R.ACTS.fxDbgEnemy({ v: 'boss' });
        const enemyBoss = document.getElementById('fxd-ename').textContent;

        // 激昂ON/OFF
        R.ACTS.fxDbgRageToggle();
        const arena = document.getElementById('fxd-arena');
        const fe = document.getElementById('fxd-enemy');
        const nm = document.getElementById('fxd-ename');
        const sprImg = document.querySelector('#fxd-spr-enemy img, #fxd-spr-enemy div');
        const rageOn = {
            arenaActive: arena.classList.contains('rage-active'),
            feAura: fe.classList.contains('rage-aura'),
            nmRage: nm.classList.contains('rage-name'),
            bossName: nm.textContent,
            filter: sprImg ? (sprImg.getAttribute('style') || '') : ''
        };
        R.ACTS.fxDbgRageToggle();
        const rageOff = !arena.classList.contains('rage-active') && !fe.classList.contains('rage-aura') && !nm.classList.contains('rage-name');

        // 激昂の瞬間を再生
        R.ACTS.fxDbgRageBurst();
        const rageBurst = arena.classList.contains('rage-burst') && fe.classList.contains('rage-burst') && arena.classList.contains('rage-active');

        // バフオーラ（攻撃 / 防御 / 全能力 / なし）
        const fp = document.getElementById('fxd-player');
        R.ACTS.fxDbgBuff({ v: 'atk' });
        const buffAtk = fp.classList.contains('buff-aura-atk');
        R.ACTS.fxDbgBuff({ v: 'def' });
        const buffDef = fp.classList.contains('buff-aura-def') && !fp.classList.contains('buff-aura-atk');
        R.ACTS.fxDbgBuff({ v: 'all' });
        const buffAll = fp.classList.contains('buff-aura-all') && !fp.classList.contains('buff-aura-def');
        R.ACTS.fxDbgBuff({ v: 'none' });
        const buffNone = !fp.classList.contains('buff-aura-atk') && !fp.classList.contains('buff-aura-def') && !fp.classList.contains('buff-aura-all');

        // 連打テスト（100回連続クリックで最大要素数 <= 12）
        const btns = [...document.querySelectorAll('#fxd-skills [data-act="fxDbgSkill"]')];
        let maxNodes = 0;
        for (let i = 0; i < 100; i++) {
            btns[i % btns.length].click();
            const n = document.getElementById('fxd-layer').children.length;
            if (n > maxNodes) maxNodes = n;
        }

        // 「演出を止める」ボタンで即座にすべて消える
        R.ACTS.fxDbgBuff({ v: 'all' });
        R.ACTS.fxDbgStop();
        const stopped = document.getElementById('fxd-layer').children.length === 0
            && !arena.classList.contains('rage-active')
            && !arena.classList.contains('rage-burst')
            && !fe.classList.contains('rage-aura')
            && !fp.classList.contains('buff-aura-all');

        return {
            dur1, dur4, realSpeedUnchanged,
            enemyBefore, enemyBoss,
            rageOn, rageOff, rageBurst,
            buffAtk, buffDef, buffAll, buffNone,
            maxNodes, stopped
        };
    }''')
    check('基準3_速度・敵切替・激昂ON/OFF・激昂の瞬間・バフオーラ・停止がすべて動作し連打でも<=12要素',
          ctrl_res['dur1'] == '840ms' and ctrl_res['dur4'] == '210ms' and ctrl_res['realSpeedUnchanged']
          and ctrl_res['enemyBefore'] != ctrl_res['enemyBoss'] and 'ニヒル' in ctrl_res['enemyBoss']
          and ctrl_res['rageOn']['arenaActive'] and ctrl_res['rageOn']['feAura'] and ctrl_res['rageOn']['nmRage']
          and ('hue-rotate(140deg)' in ctrl_res['rageOn']['filter'])
          and ctrl_res['rageOff'] and ctrl_res['rageBurst']
          and ctrl_res['buffAtk'] and ctrl_res['buffDef'] and ctrl_res['buffAll'] and ctrl_res['buffNone']
          and (0 < ctrl_res['maxNodes'] <= 12) and ctrl_res['stopped'],
          ctrl_res)

    # 基準4: 演出再生中にモーダルを閉じたら全部消え、操作前後で G.p / G.run / localStorage が一切変わらない
    snap_after = pg.evaluate('''() => {
        const R = window.__rogue;
        R.ACTS.fxDbgRageBurst();
        R.ACTS.fxDbgBuff({ v: 'all' });
        R.ACTS.fxDbgSkill({ id: 'meteorNova' });
        const beforeCloseNodes = document.getElementById('fxd-layer').children.length;
        R.ACTS.closeTowerModal();
        const afterCloseNodes = document.getElementById('fxd-layer') ? document.getElementById('fxd-layer').children.length : 0;
        const afterCloseRage = document.getElementById('fxd-arena') ? document.getElementById('fxd-arena').classList.contains('rage-active') : false;
        return {
            beforeCloseNodes,
            afterCloseNodes,
            afterCloseRage,
            modalHidden: document.getElementById('modal').hidden && !G.modalOpen,
            pJson: JSON.stringify(G.p),
            runVal: G.run,
            optsJson: JSON.stringify(G.opts),
            lsRaw: localStorage.getItem(R.SAVE_KEY)
        };
    }''')
    check('基準4_操作前後でG.p・G.run・設定・localStorageが不変＆閉じたら演出が完全消去',
          snap_after['beforeCloseNodes'] > 0
          and snap_after['afterCloseNodes'] == 0
          and (not snap_after['afterCloseRage'])
          and snap_after['modalHidden']
          and snap_after['pJson'] == snap_before['pJson']
          and snap_after['runVal'] == snap_before['runVal']
          and snap_after['optsJson'] == snap_before['optsJson']
          and snap_after['lsRaw'] == snap_before['lsRaw'],
          (snap_before, snap_after))

    # 基準5: 360/390/420px で確認用アリーナが見えたままボタン一覧をスクロールでき、崩れない
    for w in (360, 390, 420):
        pg.set_viewport_size({'width': w, 'height': 844})
        lay_res = pg.evaluate('''() => {
            const R = window.__rogue;
            R.ACTS.openFxDebug();
            const sheet = document.getElementById('m-sheet');
            const arena = document.getElementById('fxd-arena');
            const rBefore = arena.getBoundingClientRect();
            sheet.scrollTop = 320;
            const rAfter = arena.getBoundingClientRect();
            const sheetRect = sheet.getBoundingClientRect();
            const ovDoc = document.documentElement.scrollWidth - document.documentElement.clientWidth;
            const ovSheet = sheet.scrollWidth - sheet.clientWidth;
            const arenaVisibleWhileScrolled = sheet.scrollTop > 150
                && rAfter.top >= sheetRect.top - 4
                && rAfter.bottom <= sheetRect.bottom;
            R.ACTS.closeTowerModal();
            return {
                scrolled: sheet.scrollTop,
                rBeforeTop: Math.round(rBefore.top),
                rAfterTop: Math.round(rAfter.top),
                rAfterH: Math.round(rAfter.height),
                arenaVisibleWhileScrolled,
                ovDoc,
                ovSheet
            };
        }''')
        check(f'基準5_{w}px_確認用アリーナがstickyで見えたままスクロール可能・横溢れなし',
              lay_res['arenaVisibleWhileScrolled'] and lay_res['rAfterH'] >= 60
              and lay_res['ovDoc'] <= 0 and lay_res['ovSheet'] <= 0,
              lay_res)

    check('ページエラーなし', len(errors) == 0, errors)
    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
