#!/usr/bin/env python3
"""P6c チュートリアル・ヘルプ・PWA（クリア後お知らせ・ヘルプ6項目・manifest・オフライン・420pxレイアウト）テスト"""
import functools
import http.server
import json
import socketserver
import sys
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

with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 420, 'height': 800})
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(HTTP_URL)

    # 1. クリア後お知らせ（1回のみ・各「見る」ボタン遷移・420px幅）
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        G.p = R.newPlayer(); G.p.lv = 130; G.tutorial = { done: true };
        for (const d of R.DUNGEONS) if (d.id !== 'O') G.p.cleared[d.id] = { high: true, extreme: true };
        G.p.cleared.O = { high: true, super: true };
        R.startRun('O', 'extreme');
        R.finishRun('clear');
    }''')
    # ゲームクリアモーダルが出ている → 続ける(mTown)を押すとお知らせモーダルが出る
    pg.click('#m-retry')
    pg.wait_for_selector('[data-act="jumpNotice"]')
    notice_txt = pg.evaluate('''() => ({
        txt: document.querySelector('#m-sheet').innerText,
        shown: G.p.unlockNoticeShown,
        abyssShown: G.p.abyssNoticeShown,
        ov: document.documentElement.scrollWidth - window.innerWidth
    })''')
    check('unlock notice appears after Game Clear modal, sets flags, 420px no overflow',
          'クリア後の新要素が解放' in notice_txt['txt'] and notice_txt['shown']
          and notice_txt['abyssShown'] and notice_txt['ov'] <= 0, notice_txt)

    # 各「見る」ボタンの遷移確認
    pg.click('[data-act="jumpNotice"][data-to="tower"]')
    v_tower = pg.evaluate('() => G.view')
    pg.evaluate('() => { window.__rogue.ACTS.openDex(); }')
    pg.evaluate('() => { document.querySelector("#modal").hidden = true; G.modalOpen = false; }')
    pg.evaluate('() => { window.__rogue.ACTS.jumpNotice({ to: "status" }); }')
    v_status = pg.evaluate('() => G.view')
    pg.evaluate('() => { window.__rogue.ACTS.jumpNotice({ to: "dex" }); }')
    dex_open = pg.evaluate('() => !document.querySelector("#modal").hidden && document.querySelector("#m-title").innerText.includes("図鑑")')
    check('jumpNotice buttons navigate to tower/status/dex',
          v_tower == 'dungeon' and v_status == 'status' and dex_open, (v_tower, v_status, dex_open))
    pg.evaluate('() => { document.querySelector("#modal").hidden = true; G.modalOpen = false; }')

    # 2. ヘルプ画面に6つの後編・クリア後項目がある + 420px幅
    pg.click('#nav-help')
    help_res = pg.evaluate('''() => {
        const txts = [];
        let maxOv = 0;
        for (const t of ['intro', 'world', 'skill', 'status', 'endgame']) {
            window.__rogue.ACTS.helpTab({ tab: t });
            txts.push(document.querySelector('#view-help').innerText);
            maxOv = Math.max(maxOv, document.documentElement.scrollWidth - window.innerWidth);
        }
        window.__rogue.ACTS.helpTab({ tab: 'intro' });
        return { txt: txts.join('\\n'), ov: maxOv };
    }''')
    check('help includes all 6 endgame sections and 420px no overflow',
          all(k in help_res['txt'] for k in ['天蓋の塔', '深淵ダンジョン', '極意と進化第3段階', '装備強化', '図鑑・🏆 実績・称号', 'ランキング'])
          and '「撤退」は負けではない' in help_res['txt'] and help_res['ov'] <= 0,
          {'ov': help_res['ov']})

    # 3. manifest.json の確認
    mf = json.loads((ROOT / 'manifest.json').read_text(encoding='utf-8'))
    check('manifest.json description updated and name/icons preserved',
          '全15ダンジョン' in mf['description'] and '天蓋の塔' in mf['description'] and '深淵' in mf['description']
          and mf['name'] == '鐘鳴りのダンジョン' and len(mf['icons']) == 3, mf)

    # 4. オフライン動作確認 (Service Worker登録後 set_offline(True))
    pg.evaluate('() => navigator.serviceWorker && navigator.serviceWorker.ready')
    pg.wait_for_timeout(300)
    pg.reload()
    pg.wait_for_timeout(300)
    ctx.set_offline(True)
    pg.reload()
    pg.wait_for_timeout(300)
    off_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer(); G.p.lv = 130; G.p.ending = true; G.tutorial = { done: true };
        for (const d of R.DUNGEONS) G.p.cleared[d.id] = { extreme: true };
        // 本編・回廊・深淵がオフラインで動く
        R.startRun('A', 'novice'); R.tick(); const okMain = !!G.run; R.finishRun('retreat');
        R.startTowerRun(); R.tick(); const okTower = !!G.run; R.finishRun('retreat');
        R.startAbyssRun(1); R.tick(); const okAbyss = !!G.run; R.finishRun('retreat');
        return { okMain, okTower, okAbyss };
    }''')
    # ランキングはオフライン表示になる
    pg.evaluate('() => { window.__rogue.setHeadless(false); G.view = "dungeon"; window.__rogue.renderAll(); }')
    pg.evaluate('() => { const m = document.getElementById("modal"); if (m) { m.classList.remove("show"); m.hidden = true; } }')
    pg.evaluate('() => document.querySelector(\'[data-act="towerRanking"]\').click()')
    pg.wait_for_timeout(300)
    rk_off = pg.evaluate('() => document.querySelector("#m-sheet").innerText')
    check('offline boots and runs main/tower/abyss, ranking shows offline error',
          off_res['okMain'] and off_res['okTower'] and off_res['okAbyss']
          and 'ランキングを取得できません' in rk_off, (off_res, rk_off))

    check('no page errors', len(errors) == 0, errors)
    ctx.close()
    b.close()

print('\nRESULT:', 'OK' if FAILS == 0 else f'FAIL({FAILS})')
sys.exit(1 if FAILS else 0)
