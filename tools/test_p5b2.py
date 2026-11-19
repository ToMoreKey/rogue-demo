#!/usr/bin/env python3
"""P5b-2 ランキング（表示・検証・キャッシュ・自動/手動送信・セーブ・420pxレイアウト）テスト"""
import functools
import http.server
import json
import socketserver
import sys
import threading
from pathlib import Path
from urllib.parse import parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FAILS = 0


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


handler = functools.partial(QuietHandler, directory=str(ROOT))
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{port}/index.html'


def check(name, cond, detail=''):
    global FAILS
    if cond:
        print('PASS', name)
    else:
        FAILS += 1
        print('FAIL', name, detail)


with sync_playwright() as pw:
    browser = pw.chromium.launch()

    # 1. 表示・上位20件・順位換算・検証・XSS・キャッシュ・オフライン
    ctx = browser.new_context(viewport={'width': 420, 'height': 800}, service_workers='block')
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))

    mock_entries = [{'name': f'Player{i}', 'floor': 100 - i * 2} for i in range(25)]
    # 不正要素 + 12文字以内のHTMLタグニックネーム
    mock_entries.insert(0, {'name': '<img src=x>', 'floor': 120})
    mock_entries.insert(1, {'name': 'TooLongName12345', 'floor': 400})
    mock_entries.insert(2, {'name': 'OutRange', 'floor': 999})
    mock_entries.insert(3, {'name': 'BadFloor', 'floor': '100'})
    mode = {'fail': False, 'bad_json': False}

    def handle_ranking(route):
        if mode['fail']:
            route.abort()
            return
        if mode['bad_json']:
            route.fulfill(status=200, content_type='application/json', body='{not json')
            return
        route.fulfill(
            status=200,
            content_type='application/json',
            body=json.dumps({'updated': '2026-11-19', 'entries': mock_entries}, ensure_ascii=False),
        )

    pg.route('**/data/ranking.json*', handle_ranking)
    pg.goto(URL)
    # 本番設定（実フォームのURL）に依存しないよう、テストでは最初に未設定へ戻す（送信テストの箇所で改めてダミーを設定する）
    pg.evaluate("() => { const c = window.__rogue.RANKING_CFG; c.formUrl = ''; c.entryName = ''; c.entryFloor = ''; }")
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        G.p = R.newPlayer(); G.p.lv = 126; G.p.ending = true; G.p.tower.best = 96;
        G.tutorial = { done: true }; G.view = 'dungeon';
        R.renderAll();
    }''')

    # 1a. モーダル表示・20件制限・XSS不発・順位換算・420pxレイアウト
    pg.click('[data-act="towerRanking"]')
    pg.wait_for_selector('.rk-table tbody tr')
    res1 = pg.evaluate('''() => {
        const rows = [...document.querySelectorAll('.rk-table tbody tr')];
        const names = rows.map(r => r.children[1].textContent);
        const modalTxt = document.querySelector('#m-sheet').innerText;
        const ov = document.documentElement.scrollWidth - window.innerWidth;
        return {
            count: rows.length,
            first: names[0],
            hasLong: names.includes('TooLongName12345'),
            hasOutRange: names.includes('OutRange'),
            hasBadFloor: names.includes('BadFloor'),
            xss: !!window.__xss,
            titleOk: modalTxt.includes('2026-11-19'),
            tieRankOk: modalTxt.includes('96階（ランキング換算: 4位相当）'),
            unconfOk: modalTxt.includes('ランキング送信は準備中です'),
            ov
        };
    }''')
    check('top 20 shown, invalid entries ignored, XSS safe, tie rank correct, unconfigured msg shown, 420px no overflow',
          res1['count'] == 20 and res1['first'] == '<img src=x>'
          and not res1['hasLong'] and not res1['hasOutRange'] and not res1['hasBadFloor']
          and not res1['xss'] and res1['titleOk'] and res1['tieRankOk'] and res1['unconfOk'] and res1['ov'] <= 0, res1)

    # 1b. 圏外換算チェック
    out_txt = pg.evaluate('''() => {
        const p = window.__rogue.calcRankPosition(10, window.__rogue.validateRankingData({
            updated: '2026-11-19',
            entries: Array.from({length: 20}, (_, i) => ({name: 'P' + i, floor: 100 - i}))
        }).entries);
        return p.text;
    }''')
    check('out-of-rank calculates as 圏外', out_txt == '圏外', out_txt)

    # 1c. オフライン時はキャッシュを表示
    pg.click('[data-act="closeTowerModal"]')
    mode['fail'] = True
    pg.click('[data-act="towerRanking"]')
    pg.wait_for_selector('.rk-table tbody tr')
    off_cached = pg.evaluate('''() => document.querySelector('#m-sheet').innerText''')
    check('offline shows cached ranking with offline notice',
          'オフライン（前回取得分を表示）' in off_cached and '<img src=x>' in off_cached, off_cached)

    # 1d. キャッシュ無し＋不正JSON時はエラーメッセージ
    pg.click('[data-act="closeTowerModal"]')
    pg.evaluate('() => localStorage.removeItem(window.__rogue.RANKING_CFG.cacheKey)')
    mode['fail'] = False
    mode['bad_json'] = True
    pg.click('[data-act="towerRanking"]')
    pg.wait_for_timeout(150)
    off_empty = pg.evaluate('''() => document.querySelector('#m-sheet').innerText''')
    check('invalid JSON without cache shows error message',
          'ランキングを取得できません' in off_empty, off_empty)

    # 2. 送信フロー（設定あり、同意・検証・1回だけPOST・未更新は非送信・解除後非送信・失敗時sentBest不変）
    pg.click('[data-act="closeTowerModal"]')
    posts = []
    post_abort = {'abort': False}

    def handle_form(route):
        if post_abort['abort']:
            route.abort()
            return
        posts.append(parse_qs(route.request.post_data or ''))
        route.fulfill(status=200, body='ok')

    pg.route('https://example.invalid/formResponse', handle_form)
    pg.evaluate('''() => {
        const cfg = window.__rogue.RANKING_CFG;
        cfg.formUrl = 'https://example.invalid/formResponse';
        cfg.entryName = 'entry.111';
        cfg.entryFloor = 'entry.222';
    }''')

    # 2a. 不正ニックネーム拒否
    nick_checks = pg.evaluate('''() => {
        const c = window.__rogue.cleanRankNick;
        return {
            empty: c('').ok,
            long: c('1234567890123').ok,
            http: c('http://x.jp').ok,
            www: c('www.test').ok,
            at: c('foo@bar').ok,
            ok: c('  勇者A  ')
        };
    }''')
    check('nickname validation rejects empty/13+/URL/@ and trims valid name',
          not nick_checks['empty'] and not nick_checks['long']
          and not nick_checks['http'] and not nick_checks['www'] and not nick_checks['at']
          and nick_checks['ok']['ok'] and nick_checks['ok']['name'] == '勇者A', nick_checks)

    # 2b. 同意なしではラン終了しても送信されない
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p.tower.best = 10; G.p.tower.sentBest = 0; G.p.tower.rankOptIn = false; G.p.tower.nick = '勇者A';
        R.startTowerRun(); G.run.floor = 25; R.finishRun('retreat');
    }''')
    pg.wait_for_timeout(150)
    check('no POST when rankOptIn is false', len(posts) == 0, posts)

    # 2c. 同意＋ニックネーム設定後に自己ベスト更新で1回だけPOST
    pg.evaluate('''() => {
        const R = window.__rogue;
        G.p.tower.rankOptIn = true; G.p.tower.nick = 'テスト勇者';
        R.startTowerRun(); G.run.floor = 42; R.finishRun('retreat');
    }''')
    pg.wait_for_timeout(150)
    check('exactly 1 POST on new best when opted in with valid body',
          len(posts) == 1 and posts[0].get('entry.111') == ['テスト勇者'] and posts[0].get('entry.222') == ['42'], posts)

    # 2d. 記録未更新なら送信されない
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.startTowerRun(); G.run.floor = 30; R.finishRun('retreat');
    }''')
    pg.wait_for_timeout(150)
    check('no POST when floor does not beat best', len(posts) == 1, posts)

    # 2e. 解除後は新記録でも送信されない
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.ACTS.clearRankOptIn();
        R.startTowerRun(); G.run.floor = 55; R.finishRun('retreat');
    }''')
    pg.wait_for_timeout(150)
    check('no POST after opt-out even on new best', len(posts) == 1, posts)

    # 2f. 送信失敗時は sentBest を更新しない
    pg.evaluate('''() => {
        const R = window.__rogue;
        G.p.tower.rankOptIn = true;
    }''')
    post_abort['abort'] = True
    fail_res = pg.evaluate('''async () => {
        const R = window.__rogue;
        const r = await R.submitTowerRank(60, { manual: true });
        return { r, sentBest: G.p.tower.sentBest };
    }''')
    check('failed POST does not update sentBest',
          not fail_res['r']['ok'] and fail_res['sentBest'] == 42, fail_res)

    # 3. 既存v5セーブ（nick/rankOptIn/sentBest無し）の読み込みで既定値が補われる
    v5_load = pg.evaluate('''() => {
        const R = window.__rogue;
        const raw = localStorage.getItem(R.SAVE_KEY);
        const obj = JSON.parse(raw);
        delete obj.p.tower.nick;
        delete obj.p.tower.rankOptIn;
        delete obj.p.tower.sentBest;
        localStorage.setItem(R.SAVE_KEY, JSON.stringify(obj));
        R.load();
        return {
            nick: G.p.tower.nick,
            rankOptIn: G.p.tower.rankOptIn,
            sentBest: G.p.tower.sentBest
        };
    }''')
    check('v5 save without ranking fields loads cleanly with defaults',
          v5_load['nick'] == '' and v5_load['rankOptIn'] is False and v5_load['sentBest'] == 0, v5_load)

    check('no page errors', len(errors) == 0, errors)
    ctx.close()
    browser.close()

print('\nRESULT:', 'OK' if FAILS == 0 else f'FAIL({FAILS})')
sys.exit(1 if FAILS else 0)
