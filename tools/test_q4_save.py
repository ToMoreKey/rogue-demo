#!/usr/bin/env python3
"""Q4-1 セーブの安全性（保存失敗警告・破損復旧・3世代バックアップ・別タブ・移行）テスト"""
import functools
import http.server
import json
import os
import socketserver
import subprocess
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


tmp = tempfile.mkdtemp()
site = Path(tmp) / 'site'
subprocess.check_call([sys.executable, str(ROOT / 'tools' / 'make_site.py'), '--main', str(ROOT), '--dev', str(ROOT), '--out', str(site)],
                      stdout=subprocess.DEVNULL)

handler = functools.partial(QuietHandler, directory=str(site))
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE_URL = f'http://127.0.0.1:{port}'


def new_page(ctx, errors, url='/index.html', init=None):
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    if init: pg.add_init_script(init)
    pg.goto(BASE_URL + url)
    pg.wait_for_timeout(500)
    return pg

with sync_playwright() as pw:
    b = pw.chromium.launch()
    errors = []

    # 基準1: 保存に失敗したら警告バナーが出て、成功すると消える
    ctx = b.new_context(viewport={'width': 420, 'height': 800})
    pg = new_page(ctx, errors)
    r1 = pg.evaluate("""() => {
        const R = window.__rogue; G.tutorial = { done: true };
        const orig = Storage.prototype.setItem; let fail = true;
        Storage.prototype.setItem = function (k, v) { if (fail) throw new DOMException('quota', 'QuotaExceededError'); return orig.call(this, k, v); };
        R.save();
        const shown = !!document.getElementById('save-warn');
        const hasExportBtn = shown && !!document.querySelector('#save-warn [data-act="exportSaveFile"]');
        fail = false; R.save();
        const gone = !document.getElementById('save-warn');
        Storage.prototype.setItem = orig;
        return { shown, hasExportBtn, gone };
    }""")
    check('基準1_保存失敗で警告バナー（書き出しボタン付き）→成功で消える', r1['shown'] and r1['hasExportBtn'] and r1['gone'], r1)
    ctx.close()

    # 基準2: 壊れたセーブは上書きされず退避され、復旧画面が出る。新しく始めるは2段階
    ctx = b.new_context(viewport={'width': 420, 'height': 800})
    BAD = '{"v":9,"p":{"lv":12,"gold":5'   # 途中で切れたJSON
    pg = new_page(ctx, errors, init="if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); localStorage.setItem('rogue_test_save_v1', '" + BAD + "'); localStorage.setItem('rogue_tut_done_v1', '1'); }")
    pg.wait_for_timeout(300)
    r2 = pg.evaluate("""() => {
        const R = window.__rogue, k = R.SAVE_KEY;
        const title = (document.querySelector('#m-title') || {}).innerText || '';
        const modalOpen = !document.querySelector('#modal').hidden;
        let stash = []; for (let i = 0; i < localStorage.length; i++) { const x = localStorage.key(i); if (x.startsWith(k + '_corrupt_')) stash.push(localStorage.getItem(x)); }
        R.save();   // 保護中は書き込まれない
        return { title, modalOpen, stashed: stash.length === 1 && stash[0] === '{"v":9,"p":{"lv":12,"gold":5', untouched: localStorage.getItem(k) === '{"v":9,"p":{"lv":12,"gold":5', blocked: !!G._saveBlocked, banner: !!document.getElementById('save-warn') };
    }""")
    check('基準2a_破損セーブで復旧画面が出て、原文は退避・保護される', r2['modalOpen'] and '読み込めません' in r2['title'] and r2['stashed'] and r2['untouched'] and r2['blocked'] and r2['banner'], r2)
    pg.click('[data-act="recoverNew"]'); pg.wait_for_timeout(150)
    still = pg.evaluate('() => !!G._saveBlocked && !document.querySelector("#modal").hidden')
    pg.click('[data-act="recoverNew"]'); pg.wait_for_timeout(250)
    after = pg.evaluate("""() => ({ blocked: !!G._saveBlocked, banner: !!document.getElementById('save-warn'), saved: (() => { try { return JSON.parse(localStorage.getItem(window.__rogue.SAVE_KEY)).p.lv === 1; } catch (e) { return false; } })() })""")
    check('基準2b_新しく始めるは2段階（1回目では実行されない）', still, still)
    check('基準2c_2回目で新規開始・保護解除・以降は保存される', (not after['blocked']) and (not after['banner']) and after['saved'], after)
    ctx.close()

    # 基準3: 自動バックアップは3世代で打ち切られ、選んだ世代から復元できる
    ctx = b.new_context(viewport={'width': 420, 'height': 800})
    pg = new_page(ctx, errors)
    r3 = pg.evaluate("""async () => {
        const R = window.__rogue; G.tutorial = { done: true };
        // 5世代ぶん、時刻を進めながら強制バックアップ
        const realNow = Date.now; let t = realNow.call(Date);
        Date.now = () => t;
        for (let i = 1; i <= 5; i++) { G.p.lv = 10 * i; G.p.gold = 100 * i; t += 30 * 60 * 1000; R.save(true); await new Promise(r => setTimeout(r, 250)); }
        Date.now = realNow;
        const list = await R.idbReadHistory();
        const lvs = list.map(x => JSON.parse(x.raw).p.lv);
        return { n: list.length, lvs };
    }""")
    check('基準3a_世代は最大3（＋最新）で、新しい順に残る', 3 <= r3['n'] <= 4 and r3['lvs'][0] == 50 and 30 in r3['lvs'] and 10 not in r3['lvs'], r3)
    pg.evaluate("() => { G.p.lv = 99; window.__rogue.save(); }")
    pg.evaluate("() => { document.querySelector('[data-act=\"nav\"][data-v=\"status\"]').click(); }")
    pg.evaluate("() => { G.statusTab = 'data'; window.__rogue.renderAll(); }")
    pg.click('[data-act="openRecovery"]'); pg.wait_for_timeout(500)
    rows = pg.evaluate('() => document.querySelectorAll(".rec-row").length')
    pg.locator('[data-act="recoverRestore"][data-idx="1"]').click(); pg.wait_for_timeout(150)
    armed = pg.evaluate('() => G.p.lv')   # 1回目では戻らない
    pg.locator('[data-act="recoverRestore"][data-idx="1"]').click(); pg.wait_for_timeout(400)
    r3b = pg.evaluate("""() => ({ lv: G.p.lv, bakRestore: !!localStorage.getItem(window.__rogue.SAVE_KEY + '_bak_restore') })""")
    check('基準3b_復元は2段階で、選んだ世代に戻り、直前の状態が退避される', rows >= 3 and armed == 99 and r3b['lv'] in (40, 30) and r3b['bakRestore'], {'rows': rows, 'armed': armed, 'r3b': r3b})
    ctx.close()

    # 基準4: 別タブでセーブが更新されたら、このタブは保存を止めて警告する
    ctx = b.new_context(viewport={'width': 420, 'height': 800})
    pg1 = new_page(ctx, errors)
    pg1.evaluate('() => { G.tutorial = { done: true }; G.p.lv = 7; window.__rogue.save(); }')
    pg2 = new_page(ctx, errors)
    pg2.evaluate('() => { G.tutorial = { done: true }; G.p.lv = 55; window.__rogue.save(); }')
    pg1.wait_for_timeout(500)
    r4 = pg1.evaluate("""() => { const k = window.__rogue.SAVE_KEY; const before = localStorage.getItem(k); G.p.lv = 8; window.__rogue.save(); return { stale: !!G._staleTab, banner: !!document.querySelector('#save-warn [data-act="reloadPage"]'), kept: localStorage.getItem(k) === before, lv: JSON.parse(localStorage.getItem(k)).p.lv }; }""")
    check('基準4_別タブの更新で警告が出て、このタブの保存は止まる', r4['stale'] and r4['banner'] and r4['kept'] and r4['lv'] == 55, r4)
    ctx.close()

    # 基準5: 旧セーブ・キー欠落セーブでも落ちずに読み込め、書き戻しても保たれる
    ctx = b.new_context(viewport={'width': 420, 'height': 800})
    legacy = json.dumps({'v': 9, 'p': {'lv': 33, 'gold': 4321, 'sp': 2, 'cleared': {'A': {'novice': True}}}})   # opts・chars 等が無い
    pg = new_page(ctx, errors, init="if (!localStorage.getItem('__seeded')) { localStorage.setItem('__seeded', '1'); localStorage.setItem('rogue_test_save_v1', " + json.dumps(legacy) + "); localStorage.setItem('rogue_tut_done_v1', '1'); }")
    pg.wait_for_timeout(300)
    r5 = pg.evaluate("""() => { const R = window.__rogue; R.save(); const d = JSON.parse(localStorage.getItem(R.SAVE_KEY)); return { lv: G.p.lv, gold: G.p.gold, v: d.v, savedLv: d.p.lv, noBlock: !G._saveBlocked, noModal: document.querySelector('#modal').hidden }; }""")
    check('基準5_キー欠落の旧セーブも読み込め、書き戻しで保たれる（破損扱いにならない）', r5['lv'] == 33 and r5['gold'] == 4321 and r5['savedLv'] == 33 and r5['noBlock'] and r5['noModal'], r5)
    ctx.close()

    # 基準6: 保存領域が使えない（localStorage 例外）でも起動でき、警告が出る
    ctx = b.new_context(viewport={'width': 420, 'height': 800})
    pg = new_page(ctx, errors, init="Storage.prototype.setItem = function () { throw new DOMException('denied', 'SecurityError'); };")
    r6 = pg.evaluate("() => ({ banner: !!document.getElementById('save-warn'), alive: !!G.p && G.p.lv >= 1 })")
    check('基準6_保存領域が使えなくても起動でき、警告が出る', r6['banner'] and r6['alive'], r6)
    ctx.close()

    b.close()

check('ページエラーなし', len(errors) == 0, errors)
print('RESULT:', 'OK' if FAILS == 0 else f'NG ({FAILS} fails)')
sys.exit(1 if FAILS else 0)
