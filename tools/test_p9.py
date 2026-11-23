#!/usr/bin/env python3
"""P9 ゲーム内の不具合報告（合格基準1〜7・420pxレイアウト・ヘルプ追記）テスト"""
import csv
import functools
import http.server
import os
import socketserver
import subprocess
import sys
import tempfile
import threading
import urllib.parse
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

    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE_URL + '/index.html')
    pg.wait_for_timeout(300)
    pg.evaluate('() => { G.tutorial = { done: true }; const o = document.getElementById("tut-overlay"); if (o) o.hidden = true; }')

    # 基準1 & 5: 入口2か所から開き、reportUrl空時は「準備中」、同意・5〜500文字制限が効く
    pg.click('#nav-help')
    pg.wait_for_timeout(150)
    help_txt = pg.evaluate('() => document.querySelector("#view-help").innerText')
    check('ヘルプに不具合報告項目追記', '不具合・ご意見の報告' in help_txt)
    pg.click('#view-help [data-act="openBugReport"]')
    pg.wait_for_timeout(150)
    m_help = pg.evaluate('''() => ({
        title: document.querySelector('#m-title').innerText,
        notice: document.querySelector('#br-notice') ? document.querySelector('#br-notice').innerText : '',
        disabled: document.querySelector('#br-send').disabled,
        ov: document.documentElement.scrollWidth - window.innerWidth
    })''')
    check('基準1_5_ヘルプから開き準備中で送信不可・420px溢れなし',
          '不具合・ご意見を送る' in m_help['title'] and '準備中' in m_help['notice'] and m_help['disabled'] and m_help['ov'] <= 0, m_help)
    pg.click('#m-sheet [data-act="closeTowerModal"]')
    pg.wait_for_timeout(100)

    pg.click('#nav-status')
    pg.wait_for_timeout(150)
    pg.click('#view-status [data-act="openBugReport"]')
    pg.wait_for_timeout(150)
    m_st = pg.evaluate('() => document.querySelector("#m-title").innerText')
    check('基準1_ステータス画面からも開ける', '不具合・ご意見を送る' in m_st, m_st)
    pg.click('#m-sheet [data-act="closeTowerModal"]')
    pg.wait_for_timeout(100)

    # 基準2: 診断情報のキー・ブラウザ名/OS名のみ・err最大3件120文字・個人情報なし
    diag_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p.lv = 45;
        G.p.tower = G.p.tower || {};
        G.p.tower.nick = 'SecretNick123';
        for (let i = 0; i < 5; i++) R.pushBugError('Err' + i + '_' + 'x'.repeat(150), 'http://example.com/a/b/70_tutorial.js', 10 + i);
        return R.buildBugDiag();
    }''')
    diag_parts = dict(p.split('=', 1) for p in diag_res.split('; ') if '=' in p)
    err_items = diag_parts.get('err', '').split(' | ')
    check('基準2_診断情報キー・UA短縮・err3件120文字・個人情報除外',
          all(k in diag_parts for k in ('build', 'ver', 'vp', 'ua', 'lv', 'dg', 'fl', 'view', 'err'))
          and diag_parts['build'] == 'prod'
          and diag_parts['ver'].startswith('rogue-v')
          and 'Mozilla' not in diag_parts['ua']
          and len(err_items) == 3
          and all(len(x) <= 120 for x in err_items)
          and 'SecretNick123' not in diag_res,
          diag_res)

    # 基準3 & 1(バリデーション): 通信傍受で formResponse POST の entry.* を確認・60秒制限
    intercepted = []
    def handle_route(route):
        req = route.request
        intercepted.append({'url': req.url, 'method': req.method, 'post': req.post_data})
        route.fulfill(status=200, body='ok')
    pg.route('https://example.invalid/formResponse*', handle_route)

    pg.evaluate('''() => {
        const R = window.__rogue;
        R.BUGREPORT_CFG.reportUrl = 'https://example.invalid/formResponse';
        R.BUGREPORT_CFG.entryKind = 'entry.111';
        R.BUGREPORT_CFG.entryText = 'entry.222';
        R.BUGREPORT_CFG.entryDiag = 'entry.333';
        R.openBugReportModal('', false);
    }''')
    pg.wait_for_timeout(150)

    # 同意なし & 4文字では送信ボタン disabled
    pg.fill('#br-text', 'あいうえ')
    pg.wait_for_timeout(50)
    dis_short = pg.evaluate('() => document.querySelector("#br-send").disabled')
    pg.fill('#br-text', 'あいうえお')
    dis_noagree = pg.evaluate('() => document.querySelector("#br-send").disabled')
    pg.check('#br-agree')
    pg.wait_for_timeout(50)
    en_ok = not pg.evaluate('() => document.querySelector("#br-send").disabled')
    check('基準1_同意必須と5文字制限', dis_short and dis_noagree and en_ok, (dis_short, dis_noagree, en_ok))

    pg.click('#br-send')
    pg.wait_for_timeout(300)
    check('基準3_formResponseへPOST傍受とentry一致',
          len(intercepted) == 1 and intercepted[0]['method'] == 'POST'
          and 'entry.111' in (intercepted[0]['post'] or '')
          and 'entry.222' in (intercepted[0]['post'] or '')
          and 'entry.333' in (intercepted[0]['post'] or ''),
          intercepted)

    # 60秒レート制限
    rate_res = pg.evaluate('''async () => {
        const R = window.__rogue;
        return await R.sendBugReport('不具合', '2回目のテスト送信です', R.buildBugDiag());
    }''')
    check('基準3_60秒レート制限が効く', (not rate_res['ok']) and rate_res.get('reason') == 'rate_limit', rate_res)

    # 基準4: オフライン時にキュー保存（最大5件）→ オンライン復帰で再送
    ctx.set_offline(True)
    q_res = pg.evaluate('''async () => {
        const R = window.__rogue;
        localStorage.removeItem(R.BUGREPORT_CFG.rateKey);
        localStorage.removeItem(R.BUGREPORT_CFG.queueKey);
        for (let i = 0; i < 7; i++) {
            localStorage.removeItem(R.BUGREPORT_CFG.rateKey);
            await R.sendBugReport('要望', 'オフライン報告テスト ' + i, R.buildBugDiag());
        }
        return R.readBugQueue().length;
    }''')
    check('基準4_オフラインキュー上限5件', q_res == 5, q_res)
    intercepted.clear()
    ctx.set_offline(False)
    pg.wait_for_timeout(400)
    remain = pg.evaluate('() => window.__rogue.readBugQueue().length')
    check('基準4_オンライン復帰で再送完了', len(intercepted) == 5 and remain == 0, (len(intercepted), remain))

    # 基準6: dev版では build=dev, ver=rogue-dev-v..., queueKey/rateKey 分離
    pd = ctx.new_page()
    pd.on('pageerror', lambda e: errors.append(str(e)))
    pd.goto(BASE_URL + '/dev/index.html')
    pd.wait_for_timeout(300)
    dev_diag = pd.evaluate('() => ({ diag: window.__rogue.buildBugDiag(), q: window.__rogue.BUGREPORT_CFG.queueKey })')
    check('基準6_テスト版diagとキューキー分離',
          'build=dev;' in dev_diag['diag'] and 'ver=rogue-dev-v' in dev_diag['diag'] and dev_diag['q'] == 'rogue_dev_bugreport_queue_v1',
          dev_diag)

    # 基準7: ゲームが出す診断情報を tools/make_bug_report.py に食わせて集計できる
    triage_path = ROOT / 'docs' / 'bug_triage.md'
    prev_triage = triage_path.read_text(encoding='utf-8') if triage_path.exists() else None
    csv_path = Path(tmp) / 'report.csv'
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['タイムスタンプ', '種類', '内容', '診断情報'])
        w.writerow(['2026-11-24 10:00:00', '不具合', '図鑑画面のテスト報告です', diag_res])
    try:
        subprocess.check_call([sys.executable, str(ROOT / 'tools' / 'make_bug_report.py'), str(csv_path), '--all'],
                              stdout=subprocess.DEVNULL)
        triage_txt = triage_path.read_text(encoding='utf-8')
        check('基準7_make_bug_report集計成功', '図鑑画面のテスト報告です' in triage_txt and diag_parts['ver'] in triage_txt, triage_txt)
    finally:
        if prev_triage is None:
            if triage_path.exists():
                triage_path.unlink()
        else:
            triage_path.write_text(prev_triage, encoding='utf-8')

    check('ページエラーなし', len(errors) == 0, errors)
    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
