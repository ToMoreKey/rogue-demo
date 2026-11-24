#!/usr/bin/env python3
"""P10 匿名の利用状況送信（合格基準1〜6・オプトアウト・匿名ID分離・make_stats集計）テスト"""
import csv
import functools
import http.server
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
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    errors = []

    intercepted = []
    def handle_route(route):
        req = route.request
        intercepted.append({'url': req.url, 'method': req.method, 'post': req.post_data})
        route.fulfill(status=200, body='ok')

    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.route('https://example.invalid/statsResponse*', handle_route)
    pg.goto(BASE_URL + '/index.html')
    pg.wait_for_timeout(300)
    pg.evaluate('() => { G.tutorial = { done: true }; const o = document.getElementById("tut-overlay"); if (o) o.hidden = true; }')

    # 基準1: URLが空なら通信が一切起きない & devビルドでも通信しない
    unconf_res = pg.evaluate('async () => await window.__rogue.maybeSendAnalytics()')
    check('基準1_URL未設定時は通信しない', (not unconf_res['sent']) and unconf_res.get('reason') == 'unconfigured' and len(intercepted) == 0, unconf_res)

    pd = ctx.new_page()
    pd.on('pageerror', lambda e: errors.append(str(e)))
    pd.route('https://example.invalid/statsResponse*', handle_route)
    pd.goto(BASE_URL + '/dev/index.html')
    pd.wait_for_timeout(300)
    dev_res = pd.evaluate('''async () => {
        const R = window.__rogue;
        R.ANALYTICS_CFG.reportUrl = 'https://example.invalid/statsResponse';
        R.ANALYTICS_CFG.entryStats = 'entry.999';
        return await R.maybeSendAnalytics();
    }''')
    check('基準1_devビルドはURLを設定しても送信しない', (not dev_res['sent']) and dev_res.get('reason') == 'dev' and len(intercepted) == 0, dev_res)
    pd.close()

    # 基準2: 本番設定時、1回だけ送信・24時間以内は再送しない・個人情報/セーブ内容が含まれない
    send1 = pg.evaluate('''async () => {
        const R = window.__rogue;
        G.p.lv = 33; G.p.gold = 765432;
        G.p.tower = G.p.tower || {}; G.p.tower.nick = 'PrivateNick999'; G.p.tower.best = 45;
        G.p.abyss = G.p.abyss || {}; G.p.abyss.best = 3;
        G.p.cleared.C = { high: true };
        R.ANALYTICS_CFG.reportUrl = 'https://example.invalid/statsResponse';
        R.ANALYTICS_CFG.entryStats = 'entry.555';
        localStorage.removeItem(R.ANALYTICS_CFG.lastSentKey);
        const r1 = await R.maybeSendAnalytics();
        const r2 = await R.maybeSendAnalytics();
        return { r1, r2 };
    }''')
    line1 = send1['r1'].get('line', '')
    parts1 = dict(p.split('=', 1) for p in line1.split('; ') if '=' in p)
    expected_keys = {'id', 'ver', 'lv', 'dg', 'clear', 'tw', 'ab', 'hours', 'launch', 'vp', 'new'}
    check('基準2_初回送信1回・24時間以内スキップ・項目と個人情報除外',
          send1['r1']['sent'] and (not send1['r2']['sent']) and send1['r2'].get('reason') == 'interval'
          and len(intercepted) == 1
          and set(parts1.keys()) == expected_keys
          and parts1['new'] == '1' and parts1['lv'] == '33' and parts1['tw'] == '45' and parts1['ab'] == '3'
          and 'PrivateNick999' not in line1 and '765432' not in line1,
          (send1, parts1))

    # 基準3: オプトアウトで送信が止まり、「データ」タブのスイッチとヘルプ「はじめに」の説明が表示・保持される
    pg.click('#nav-status')
    pg.wait_for_timeout(100)
    pg.click('[data-act="statusTab"][data-tab="data"]')
    pg.wait_for_timeout(100)
    sw_before = pg.evaluate('() => document.querySelector("[data-act=toggleAnalyticsOptOut]").innerText')
    pg.click('[data-act="toggleAnalyticsOptOut"]')
    pg.wait_for_timeout(80)
    sw_after = pg.evaluate('() => document.querySelector("[data-act=toggleAnalyticsOptOut]").innerText')
    opt_res = pg.evaluate('''async () => {
        const R = window.__rogue;
        localStorage.removeItem(R.ANALYTICS_CFG.lastSentKey);
        return await R.maybeSendAnalytics();
    }''')
    pg.click('#nav-help')
    pg.wait_for_timeout(100)
    help_intro_txt = pg.evaluate('() => document.querySelector("#view-help").innerText')
    check('基準3_オプトアウトで送信停止・データタブスイッチ＆ヘルプ説明',
          'ON' in sw_before and 'OFF' in sw_after and (not opt_res['sent']) and opt_res.get('reason') == 'optout'
          and '匿名の利用状況送信' in help_intro_txt,
          (sw_before, sw_after, opt_res))
    # オンに戻す
    pg.click('#nav-status')
    pg.click('[data-act="statusTab"][data-tab="data"]')
    pg.click('[data-act="toggleAnalyticsOptOut"]')

    # 基準4: 匿名IDが端末内で固定、セーブ書き出し・読み込みでIDが変わらない・移らない
    id_res = pg.evaluate('''async () => {
        const R = window.__rogue;
        const id1 = R.getOrCreateAnonId();
        const id2 = R.getOrCreateAnonId();
        const payload = R.buildSavePayload();
        const hasIdInSave = payload.data.includes(id1);
        // 別セーブを読み込んでも匿名IDは変わらない
        await R.applyImportedSave(payload);
        const id3 = R.getOrCreateAnonId();
        return { id1, id2, id3, hasIdInSave };
    }''')
    check('基準4_匿名ID固定＆セーブデータ非含有',
          len(id_res['id1']) == 16 and id_res['id1'] == id_res['id2'] == id_res['id3'] and (not id_res['hasIdInSave']),
          id_res)

    # 基準5: 送信失敗・オフラインでゲームが止まらず、ページエラーが出ない
    ctx.set_offline(True)
    off_res = pg.evaluate('''async () => {
        const R = window.__rogue;
        localStorage.removeItem(R.ANALYTICS_CFG.lastSentKey);
        return await R.maybeSendAnalytics();
    }''')
    ctx.set_offline(False)
    check('基準5_オフライン時はサイレントにスキップしエラーなし',
          (not off_res['sent']) and off_res.get('reason') == 'offline' and len(errors) == 0,
          off_res)

    # 基準6: tools/make_stats.py がサンプルCSVから正しく集計する
    csv_path = Path(tmp) / 'stats.csv'
    out_md = Path(tmp) / 'stats_report.md'
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['タイムスタンプ', '記録'])
        w.writerow(['2026/11/10 10:00:00', 'id=0123456789abcdef; ver=rogue-v38; lv=5; dg=A; clear=0; tw=0; ab=0; hours=0.5; launch=1; vp=390x844; new=1'])
        w.writerow(['2026/11/24 12:00:00', 'id=0123456789abcdef; ver=rogue-v39; lv=130; dg=O; clear=1; tw=65; ab=4; hours=22.5; launch=15; vp=390x844; new=0'])
        w.writerow(['2026/11/12 09:00:00', 'id=fedcba9876543210; ver=rogue-v38; lv=18; dg=C; clear=0; tw=0; ab=0; hours=2.0; launch=3; vp=420x800; new=1'])
    subprocess.check_call([sys.executable, str(ROOT / 'tools' / 'make_stats.py'), str(csv_path), '--out', str(out_md)],
                          stdout=subprocess.DEVNULL)
    rep_txt = out_md.read_text(encoding='utf-8')
    check('基準6_make_stats集計レポート生成',
          '2人' in rep_txt and '1人（50.0%）' in rep_txt and 'rogue-v39' in rep_txt and 'Lv101〜140' in rep_txt,
          rep_txt)

    check('ページエラーなし', len(errors) == 0, errors)
    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
