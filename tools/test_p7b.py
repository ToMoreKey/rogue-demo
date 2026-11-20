#!/usr/bin/env python3
"""P7b 本編序盤の難易度緩和（倍率適用範囲・回廊/深淵/後編不変・序盤計測基準）テスト"""
import functools
import http.server
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

    # 1. earlyEase テーブルと未登録組み合わせが 1.0 であること & 敵生成の適用範囲確認
    res1 = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        const mkRng = (seed) => { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };

        // 未登録組み合わせは 1.0
        const eDef = R.earlyEase('A', 'super');
        const eJ = R.earlyEase('J', 'novice');
        const eUnknown = R.earlyEase('Z', 'novice');

        // A初級で実際にHP/ATKが緩和され、DEF/EXPは緩和前の式と一致すること
        const p = R.newPlayer();
        p.lv = 120; p.ending = true;
        for (const d of R.DUNGEONS) p.cleared[d.id] = { novice: true, mid: true, high: true, super: true, extreme: true };
        G.p = p;

        R.setRng(mkRng(1));
        R.startRun('A', 'novice');
        R.spawnEnemy();
        const enA = { ...G.run.enemy };
        const S1 = R.scaleOf(G.run, G.run.floor);
        R.finishRun('retreat');

        // 後編 J初級では 1.0（TUNE そのまま）
        R.setRng(mkRng(1));
        R.startRun('J', 'novice');
        R.spawnEnemy();
        const enJ = { ...G.run.enemy };
        R.finishRun('retreat');

        // 回廊・深淵でも 1.0
        R.setRng(mkRng(1));
        R.startTowerRun();
        R.spawnEnemy();
        const enT = { ...G.run.enemy };
        R.finishRun('retreat');

        R.setRng(mkRng(1));
        R.startAbyssRun(1);
        R.spawnEnemy();
        const enAb = { ...G.run.enemy };
        R.finishRun('retreat');

        // A初級の1F敵の期待値（倍率あり vs 倍率なし）
        const dA = R.DUNGEONS.find(x => x.id === 'A');
        const baseA = dA.mobs.find(m => m.id === enA.id);
        const easeA = R.earlyEase('A', 'novice');
        const expNoEaseHp = Math.max(1, Math.round(baseA.hp * S1 * R.TUNE.hpScale));
        const expEaseHp = Math.max(1, Math.round(baseA.hp * S1 * R.TUNE.hpScale * easeA.hp));
        const expDef = Math.round(baseA.def * Math.pow(S1, R.TUNE.atkExp) * R.TUNE.defScale);
        const expExp = Math.max(1, Math.round(baseA.exp * S1 * R.TUNE.expScale * R.DIFFS[0].expMult));

        return {
            eDef, eJ, eUnknown,
            enA, expNoEaseHp, expEaseHp, expDef, expExp,
            enJValid: enJ.hp > 0 && enJ.atk > 0,
            enTValid: enT.hp > 0 && enT.atk > 0,
            enAbValid: enAb.hp > 0 && enAb.atk > 0
        };
    }''')
    check('表にない組み合わせは1.0', res1['eDef']['hp'] == 1 and res1['eDef']['atk'] == 1 and res1['eJ']['hp'] == 1 and res1['eUnknown']['hp'] == 1, res1)
    check('A初級に序盤緩和が効きDEF/EXPは不変', res1['enA']['hp'] == res1['expEaseHp'] and res1['enA']['hp'] < res1['expNoEaseHp'] and res1['enA']['def'] == res1['expDef'] and res1['enA']['exp'] == res1['expExp'], res1)
    check('後編J・回廊・深淵で正常スポーン', res1['enJValid'] and res1['enTValid'] and res1['enAbValid'], res1)

    # 2. 序盤計測基準（スキル未習得 avg<=4回、初期3SP回復習得 5回中>=4回）
    res2 = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        const mkRng = (seed) => { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };
        function simA(withHeal, runs, seed) {
            R.setRng(mkRng(seed));
            G.p = R.newPlayer();
            if (withHeal) { R.ACTS.spAlloc({ tree: 'life', amount: 3 }); G.p.equippedSkills = ['heal', null, null]; }
            let firstClear = null, clears = 0;
            for (let i = 1; i <= runs; i++) {
                R.equipBest();
                G.p.hp = R.maxHp(G.p); G.p.mp = R.maxMp(G.p);
                R.startRun('A', 'novice');
                for (let t = 0; t < 200 && G.run; t++) R.tick();
                const ok = !!(G.p.cleared && G.p.cleared.A && G.p.cleared.A.novice);
                if (ok && firstClear === null) firstClear = i;
                if (G.last && G.last.result === 'clear') clears++;
            }
            return { seed, firstClear, clears };
        }
        return {
            noSkill: [1, 2, 3].map(s => simA(false, 10, s)),
            withHeal: [1, 2, 3].map(s => simA(true, 5, s))
        };
    }''')
    avg_first = sum(x['firstClear'] for x in res2['noSkill'] if x['firstClear']) / 3
    check('スキル未習得_A初級平均4回以内クリア', all(x['firstClear'] is not None for x in res2['noSkill']) and avg_first <= 4, res2['noSkill'])
    check('初期3SP回復習得_5回中4回以上クリア', all(x['clears'] >= 4 for x in res2['withHeal']), res2['withHeal'])
    check('ページエラーなし', len(errors) == 0, errors)

    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
