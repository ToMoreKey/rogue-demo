#!/usr/bin/env python3
"""本番ビルドとテスト版ビルドの分離テスト。
  python3 tools/test_variants.py
"""
import http.server, os, subprocess, sys, tempfile, threading, functools
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FAILS = 0


def check(name, ok, info=''):
    global FAILS
    print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else ' ' + str(info)))
    if not ok:
        FAILS += 1


tmp = tempfile.mkdtemp()
site = os.path.join(tmp, 'site')
subprocess.check_call([sys.executable, os.path.join(ROOT, 'tools', 'make_site.py'), '--main', ROOT, '--dev', ROOT, '--out', site],
                      stdout=subprocess.DEVNULL)
prod = open(os.path.join(site, 'index.html'), encoding='utf-8').read()
dev = open(os.path.join(site, 'dev', 'index.html'), encoding='utf-8').read()
committed = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

check('本番ビルドが、コミット済み index.html と一致', prod == committed)
check('本番ビルドにテスト版の印が無い', all(x not in prod for x in ('rogue_dev_', 'dev-badge', '[TEST]')))
check('本番ビルドはランキング送信先が入っている', "formUrl: 'https://docs.google.com/forms/" in prod)
check('テスト版: セーブ・チュートリアル・ランキングキャッシュ・バックアップ・不具合報告のキーとIDB名・APP_VERSIONが別', all(x in dev for x in (
    "SAVE_KEY = 'rogue_dev_save_v1'", "rogue_dev_tut_done_v1", "rogue_dev_ranking_cache_v1",
    "BACKUP_META_KEY = 'rogue_dev_backup_meta_v1'", "IDB_BACKUP_NAME = 'rogue_dev_backup_db_v1'",
    "rogue_dev_bugreport_queue_v1", "rogue_dev_bugreport_last_v1", "APP_VERSION = 'rogue-dev-v"))
    and "SAVE_KEY = 'rogue_test_save_v1'" not in dev
    and "BACKUP_META_KEY = 'rogue_backup_meta_v1'" not in dev
    and "IDB_BACKUP_NAME = 'rogue_backup_db_v1'" not in dev
    and "rogue_bugreport_queue_v1" not in dev
    and "rogue_bugreport_last_v1" not in dev)
check('テスト用の全装備ボタン: 本番は出さず、テスト版だけ出す', 'const IS_DEV_BUILD = false;' in prod and 'const IS_DEV_BUILD = true;' in dev)
check('テスト版: ランキング送信先が空', "formUrl: ''" in dev and '1FAIpQLSf07yvFY41jFlZud8H2KHnM9aZCk2dUNPDsOsF9dtmsQNeFYA' not in dev)
check('不具合報告の送信先: 本番・テスト版の両方に入っている（ランキングとは別）', "reportUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSd8nq" in prod and "reportUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSd8nq" in dev)
check('テスト版: TEST表示とタイトル', 'id="dev-badge"' in dev and '<title>[TEST] rogue_test</title>' in dev)
sw_main = open(os.path.join(site, 'sw.js'), encoding='utf-8').read()
sw_dev = open(os.path.join(site, 'dev', 'sw.js'), encoding='utf-8').read()
check('Service Worker のキャッシュ名が別', "'rogue-dev-v" in sw_dev and "'rogue-dev-v" not in sw_main)
check('テスト版 manifest が別アプリ名', 'TEST' in open(os.path.join(site, 'dev', 'manifest.json'), encoding='utf-8').read()
      and 'TEST' not in open(os.path.join(site, 'manifest.json'), encoding='utf-8').read())

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass


handler = functools.partial(Quiet, directory=site)
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{port}'

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 420, 'height': 900})
    errors = []
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(base + '/index.html')
    pg.wait_for_timeout(500)
    # 本番にセーブを作る
    pg.evaluate('() => { G.tutorial = { done: true }; G.p.gold = 12345; window.__rogue.save(); }')
    prod_keys = pg.evaluate('() => Object.keys(localStorage)')
    check('本番: 本番キーに保存され、テスト版キーは作られない',
          'rogue_test_save_v1' in prod_keys and not any(k.startswith('rogue_dev_') for k in prod_keys), prod_keys)
    check('本番: TEST表示なし', pg.evaluate('() => !document.getElementById("dev-badge")'))
    check('本番: ランキング送信は設定済み', pg.evaluate('() => window.__rogue.isRankingSubmitConfigured()'))

    pd = ctx.new_page()  # 同じオリジン（同じ localStorage）でテスト版を開く
    pd.on('pageerror', lambda e: errors.append(str(e)))
    pd.goto(base + '/dev/index.html')
    pd.wait_for_timeout(500)
    check('テスト版: TEST表示あり', pd.evaluate('() => { const e = document.getElementById("dev-badge"); return !!e && getComputedStyle(e).display !== "none" && e.textContent.includes("TEST"); }'))
    check('テスト版: 本番のセーブを引き継がない（金は初期値）', pd.evaluate('() => G.p.gold') != 12345, pd.evaluate('() => G.p.gold'))
    check('テスト版: ランキング送信は無効', pd.evaluate('() => !window.__rogue.isRankingSubmitConfigured()'))
    pd.evaluate('() => { G.p.gold = 777; window.__rogue.save(); }')
    keys = pd.evaluate('() => Object.keys(localStorage)')
    check('テスト版: テスト版キーに保存される', 'rogue_dev_save_v1' in keys, keys)
    check('テスト版の保存で、本番のセーブが変わらない', pg.evaluate('() => JSON.parse(localStorage.getItem("rogue_test_save_v1")).p.gold') == 12345)
    pg.evaluate('() => { document.getElementById("nav-status").click(); document.querySelector("[data-act=statusTab][data-tab=data]").click(); }')
    pd.evaluate('() => { G.tutorial = { done: true }; document.getElementById("nav-status").click(); document.querySelector("[data-act=statusTab][data-tab=data]").click(); }')
    pg.wait_for_timeout(300); pd.wait_for_timeout(300)
    check('画面: 本番に「全装備を入手」ボタンが無い', pg.evaluate('() => !document.querySelector("[data-act=debugAllGear]")'))
    check('画面: テスト版には「全装備を入手」ボタンがある', pd.evaluate('() => !!document.querySelector("[data-act=debugAllGear]")'))
    check('本番: 直接呼んでも全装備は入らない', pg.evaluate('() => { const n = G.p.bag.length; window.__rogue.ACTS.debugAllGear(); return G.p.bag.length === n; }'))
    check('テスト版: 420pxで横スクロールなし', pd.evaluate('() => document.documentElement.scrollWidth <= document.documentElement.clientWidth'))
    check('ページエラーなし', len(errors) == 0, errors)
    b.close()
srv.shutdown()

print('\nRESULT:', 'OK' if FAILS == 0 else f'FAIL({FAILS})')
sys.exit(1 if FAILS else 0)
