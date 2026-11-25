#!/usr/bin/env python3
"""P8 セーブのバックアップ・引き継ぎ（合格基準1〜5・420pxレイアウト・ヘルプ・案内）テスト"""
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

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 420, 'height': 800})
    errors = []

    # 基準4前半: 初回プレイヤーには IndexedDB 復元モーダル（前回のデータが見つかりました）が出ないこと
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE_URL + '/index.html')
    pg.wait_for_timeout(400)
    first_modal_is_restore = pg.evaluate('() => !document.querySelector("#modal").hidden && (document.querySelector("#m-title")?.innerText || "").includes("前回のデータが見つかりました")')
    check('初回プレイヤーに復元確認が出ない', first_modal_is_restore is False, first_modal_is_restore)

    # 基準1: ファイル(JSON) & コード(RGS1/RGS0) 書き出し → 読み込みで完全一致 & _bak_import 退避
    roundtrip = pg.evaluate('''async () => {
        const R = window.__rogue;
        G.tutorial = { done: true };
        G.p.lv = 42; G.p.gold = 98765; G.p.cleared.A = { novice: true, high: true };
        R.save();
        const origRaw = localStorage.getItem(R.SAVE_KEY);
        const payload = R.buildSavePayload();
        const code = await R.encodeSaveCode(payload);

        // 現在のセーブを別データに変更してからコードで復元
        G.p.lv = 2; G.p.gold = 11;
        R.save();
        const decCode = await R.decodeAndValidateSaveInput(code);
        const okCode = decCode.ok && R.applyImportedSave(decCode.payload);
        const afterCodeRaw = localStorage.getItem(R.SAVE_KEY);
        const bakImport = localStorage.getItem(R.SAVE_KEY + '_bak_import');

        // ファイル(JSON)文字列でも復元
        G.p.lv = 3; G.p.gold = 22;
        R.save();
        const decJson = await R.decodeAndValidateSaveInput(JSON.stringify(payload));
        const okJson = decJson.ok && R.applyImportedSave(decJson.payload);
        const afterJsonRaw = localStorage.getItem(R.SAVE_KEY);

        return {
            codePrefix: code.slice(0, 5),
            origLv: JSON.parse(origRaw).p.lv,
            afterCodeLv: JSON.parse(afterCodeRaw).p.lv,
            afterCodeGold: JSON.parse(afterCodeRaw).p.gold,
            afterJsonLv: JSON.parse(afterJsonRaw).p.lv,
            afterJsonGold: JSON.parse(afterJsonRaw).p.gold,
            bakImportLv: bakImport ? JSON.parse(bakImport).p.lv : null,
            okCode, okJson
        };
    }''')
    check('基準1_コード往復一致と_bak_import退避',
          roundtrip['okCode'] and roundtrip['afterCodeLv'] == 42 and roundtrip['afterCodeGold'] == 98765 and roundtrip['bakImportLv'] == 2,
          roundtrip)
    check('基準1_JSONファイル往復一致',
          roundtrip['okJson'] and roundtrip['afterJsonLv'] == 42 and roundtrip['afterJsonGold'] == 98765,
          roundtrip)

    # 基準2: 旧バージョン（v1〜v7）のセーブを書き出した形式も読み込めて最新へ移行する
    old_mig = pg.evaluate('''async () => {
        const R = window.__rogue;
        const p = R.newPlayer();
        const results = [];
        for (const v of [1, 3, 5, 7, 8]) {
            const inner = { v, p: { lv: 20 + v, exp: 0, sp: 3, gold: 500 + v, bank: 0, hp: 100, mp: 20, weapon: p.weapon, armor: p.armor, bag: [], cleared: {}, skills: {}, skillPts: { sword: 0, magic: 0, life: 0 }, equippedSkills: [null, null, null], potions: { hp: 0, mp: 0 }, stones: {}, stats: { runs: 1, clears: 0, kills: 0 }, nextId: 5 } };
            const wrap = { app: 'rogue-demo', kind: 'save', saveVersion: v, exportedAt: '2026-01-01T00:00:00Z', data: JSON.stringify(inner) };
            const res = await R.decodeAndValidateSaveInput(JSON.stringify(wrap));
            const applied = res.ok && R.applyImportedSave(res.payload);
            results.push({ v, ok: res.ok, applied, curV: JSON.parse(localStorage.getItem(R.SAVE_KEY)).v, lv: G.p.lv });
        }
        return results;
    }''')
    check('基準2_旧版v1〜v8書き出しの読み込みと最新v移行',
          all(x['ok'] and x['applied'] and x['curV'] == 9 and x['lv'] == 20 + x['v'] for x in old_mig),
          old_mig)

    # 基準3: 不正入力（壊れたコード・別アプリJSON・途切れコード・未来のsaveVersion）で何も変わらずエラー
    bad_res = pg.evaluate('''async () => {
        const R = window.__rogue;
        G.p.lv = 55; G.p.gold = 55555; R.save();
        const beforeRaw = localStorage.getItem(R.SAVE_KEY);
        const validCode = await R.encodeSaveCode(R.buildSavePayload());

        const cases = {
            brokenCode: await R.decodeAndValidateSaveInput('RGS1:not_valid_base64!.12345678'),
            otherApp: await R.decodeAndValidateSaveInput(JSON.stringify({ app: 'other-game', kind: 'save', saveVersion: 1, data: '{}' })),
            truncated: await R.decodeAndValidateSaveInput(validCode.slice(0, -3)),
            futureVer: await R.decodeAndValidateSaveInput(JSON.stringify({ app: 'rogue-demo', kind: 'save', saveVersion: R.SAVE_VERSION + 1, data: beforeRaw }))
        };
        const afterRaw = localStorage.getItem(R.SAVE_KEY);
        return { cases, unchanged: beforeRaw === afterRaw };
    }''')
    check('基準3_不正入力4種すべてエラー＆セーブ不変',
          bad_res['unchanged'] and all((not v['ok']) and len(v.get('error', '')) > 0 for v in bad_res['cases'].values()),
          bad_res)

    # 基準4後半: IndexedDB に複製後、localStorage が空の状態で別タブ/再起動 → 復元確認が出て押すと復元
    pg.evaluate('''async () => {
        const R = window.__rogue;
        G.p.lv = 77; G.p.gold = 77777; R.save();
        await R.idbMirrorSave(true);
    }''')
    pg2 = ctx.new_page()
    pg2.on('pageerror', lambda e: errors.append(str(e)))
    pg2.add_init_script("if (!sessionStorage.getItem('_p8_clr')) { sessionStorage.setItem('_p8_clr', '1'); localStorage.removeItem('rogue_test_save_v1'); }")
    pg2.goto(BASE_URL + '/index.html')
    pg2.wait_for_selector('#m-title', timeout=5000)
    idb_modal_title = pg2.evaluate('() => document.querySelector("#m-title").innerText')
    check('基準4_localStorage消失時にIndexedDB復元確認が出る', '前回のデータが見つかりました' in idb_modal_title, idb_modal_title)
    pg2.click('[data-act="restoreIdbSave"]')
    pg2.wait_for_timeout(300)
    restored = pg2.evaluate('() => ({ lv: G.p.lv, gold: G.p.gold, modalHidden: document.querySelector("#modal").hidden })')
    check('基準4_復元ボタン押下でセーブ復元', restored['lv'] == 77 and restored['gold'] == 77777 and restored['modalHidden'], restored)
    pg2.close()

    # 基準5: 本番とテスト版で localStorage & IndexedDB 名が別 & 420px横溢れなし & ヘルプ追記
    pg.click('#nav-status')
    pg.wait_for_timeout(150)
    pg.click('[data-act="statusTab"][data-tab="data"]')
    pg.wait_for_timeout(100)
    ui_prod = pg.evaluate('''() => ({
        ov: document.documentElement.scrollWidth - window.innerWidth,
        statusTxt: document.querySelector('#view-status').innerText,
        idbName: window.__rogue.IDB_BACKUP_NAME,
        metaKey: window.__rogue.BACKUP_META_KEY
    })''')
    pg.click('#nav-help')
    pg.wait_for_timeout(150)
    help_txt = pg.evaluate('() => document.querySelector("#view-help").innerText')
    check('ステータス420px横溢れなし・UI表示', ui_prod['ov'] <= 0 and 'セーブを書き出す' in ui_prod['statusTxt'] and 'セーブを読み込む' in ui_prod['statusTxt'], ui_prod['ov'])
    check('ヘルプにバックアップ項目追記', 'セーブのバックアップ・引き継ぎ' in help_txt)

    pd = ctx.new_page()
    pd.on('pageerror', lambda e: errors.append(str(e)))
    pd.goto(BASE_URL + '/dev/index.html')
    pd.wait_for_timeout(400)
    dev_info = pd.evaluate('''() => ({
        idbName: window.__rogue.IDB_BACKUP_NAME,
        metaKey: window.__rogue.BACKUP_META_KEY,
        gold: G.p.gold
    })''')
    check('基準5_テスト版と本番でIDB名・メタキーが分離',
          dev_info['idbName'] != ui_prod['idbName'] and dev_info['metaKey'] != ui_prod['metaKey'] and dev_info['gold'] != 77777,
          (ui_prod, dev_info))
    check('ページエラーなし', len(errors) == 0, errors)

    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
