#!/usr/bin/env python3
"""P7a-1 ヘルプ文言更新（新表記・旧表記削除・420pxレイアウト）テスト"""
import functools
import http.server
import re
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

    pg.evaluate('() => { G.tutorial = { done: true }; const sk = document.querySelector("[data-act=tutSkip]"); if (sk) sk.click(); }')
    pg.click('#nav-help')
    pg.wait_for_timeout(150)

    help_all = pg.evaluate('''() => {
        const txts = [];
        let maxOv = 0, hasEnd = false;
        for (const t of ['intro', 'world', 'skill', 'status', 'endgame']) {
            window.__rogue.ACTS.helpTab({ tab: t });
            txts.push(document.querySelector('#view-help').innerText);
            maxOv = Math.max(maxOv, document.documentElement.scrollWidth - window.innerWidth);
            if (document.getElementById('help-endgame')) hasEnd = true;
        }
        window.__rogue.ACTS.helpTab({ tab: 'intro' });
        return { txt: txts.join('\\n'), ov: maxOv, hasEnd };
    }''')
    help_text = help_all['txt']
    overflow = help_all['ov']
    has_endgame = help_all['hasEnd']

    # 1. 新しい文言が表示されていること
    check('鍛冶屋最大★9表記', '最大★9。★6以上は上位の強化素材が必要' in help_text)
    check('ダンジョンA〜Oの15種表記', 'A〜O の15種（前編A〜I、後編J〜O）。前のダンジョンをクリアすると次が開く' in help_text)
    check('難易度5段階表記', '初級・中級・上級・超級・極級の5段階（上の難易度は下をクリアすると開く）' in help_text)
    check('進化スキル枠条件表記（ルート式）', '共通10SP' in help_text and '基本枠30SPかつ進化枠20SP' in help_text)
    check('初級目標文言維持', 'まずはダンジョンAの初級クリアを目標に！' in help_text)
    check('help-endgame維持', has_endgame)

    # 2. 古い文言が残っていないこと
    check('旧表記_最大★5なし', '最大★5' not in help_text)
    check('旧表記_A→B→Cなし', 'A（初級向け）→ B → C' not in help_text)
    check('旧表記_ノービス3段階なし', 'ノービス・中級・上級の3段階' not in help_text)
    check('旧表記_各20SP上限なし', '上限（各20SP）' not in help_text)

    # 3. 420px幅で横溢れしないこと & エラーなし
    check('420px横溢れなし', overflow <= 0, f'overflow={overflow}')
    check('ページエラーなし', len(errors) == 0, f'errors={errors}')

    # 4. sw.js キャッシュバージョン確認（v25以上）
    sw_text = (ROOT / 'sw.js').read_text(encoding='utf-8')
    m_sw = re.search(r"const CACHE = 'rogue-v(\d+)';", sw_text)
    check('sw_cache_v25_or_later', bool(m_sw and int(m_sw.group(1)) >= 25), m_sw.group(0) if m_sw else '')

    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
