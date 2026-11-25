#!/usr/bin/env python3
"""Q3 スキルエフェクトの個別化・格上げ（32スキル固有signature/DOM一意性・同分類内ティア昇順・規定時間終了・高速連打・Q2パネル連動・reduced-motion・360/390/420px）テスト"""
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
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE_URL + '/dev/index.html')
    pg.wait_for_timeout(300)
    pg.evaluate('() => { G.tutorial = { done: true }; const o = document.getElementById("tut-overlay"); if (o) o.hidden = true; window.__rogue.noTimer(true); }')

    # 基準1 & 基準2 & 基準3:
    # - 対象32スキル（斬撃6・魔法8・大技8・回復10）がそれぞれ固有の signature を持ち、生成されるDOM構造も32通りすべて一意である
    # - ティアが上のスキルほど、演出時間(durMs)・要素数(actualNodes)・覆う範囲(span)のいずれも下位以上で、最上位が最も豪華
    # - 全スキルで同時要素数 <= 12、最大演出時間 <= 1200ms
    q3_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.startRun('A', 'novice');
        R.noTimer(true);
        R.nextFloor();
        R.renderBattle();
        G.opts.fx = true;
        G.opts.speed = 1;

        const targetCats = ['slash', 'magic', 'ult', 'heal'];
        const allIds = Object.keys(R.SK);
        const targetIds = allIds.filter(id => targetCats.includes(R.getSkillFxSpec(id).cat));
        const buffIds = allIds.filter(id => R.getSkillFxSpec(id).cat === 'buff');

        const records = {};
        const sigs = [];
        const domFingerprints = [];
        const layer = document.getElementById('fx-layer');

        for (const id of targetIds) {
            const spec = R.getSkillFxSpec(id);
            const s = R.SK[id];
            R.playSkillFx(id, s.hits || 1);
            const durStr = layer.style.getPropertyValue('--fx-dur');
            const durVal = parseInt(durStr, 10) || 0;
            const spanVal = parseInt(layer.dataset.span, 10) || 0;
            const nodeCount = layer.children.length;
            const fp = layer.innerHTML;
            sigs.push(spec.sig);
            domFingerprints.push(fp);
            records[id] = {
                id,
                cat: spec.cat,
                tier: spec.tier,
                rank: spec.rank,
                sig: spec.sig,
                dur: durVal,
                nodes: nodeCount,
                specNodes: spec.nodes,
                span: spanVal
            };
        }

        // バフ10種が変わっていないことも確認
        const buffChecks = buffIds.map(id => {
            R.playSkillFx(id, 1);
            return layer.children.length === 2;
        });

        // 同分類内のティア順序チェック: rank_a < rank_b なら dur_a <= dur_b, nodes_a <= nodes_b, span_a <= span_b
        // かつ最上位ランクは最下位ランクより dur, nodes, span すべて厳密に大きい（>）
        const tierOrderViolations = [];
        const topStrictlyGreater = {};
        for (const cat of targetCats) {
            const list = Object.values(records).filter(r => r.cat === cat);
            for (const a of list) {
                for (const b of list) {
                    if (a.rank < b.rank) {
                        if (!(a.dur <= b.dur && a.nodes <= b.nodes && a.span <= b.span)) {
                            tierOrderViolations.push({ cat, lower: a, higher: b });
                        }
                    }
                }
            }
            const minRank = Math.min(...list.map(r => r.rank));
            const maxRank = Math.max(...list.map(r => r.rank));
            const lowItems = list.filter(r => r.rank === minRank);
            const highItems = list.filter(r => r.rank === maxRank);
            topStrictlyGreater[cat] = highItems.every(hi =>
                lowItems.every(lo => hi.dur > lo.dur && hi.nodes > lo.nodes && hi.span > lo.span)
            );
        }

        return {
            targetCount: targetIds.length,
            buffCount: buffIds.length,
            uniqueSigCount: new Set(sigs).size,
            uniqueDomCount: new Set(domFingerprints).size,
            allHasSig: sigs.every(s => typeof s === 'string' && s.length > 3),
            allNodesMatchSpec: Object.values(records).every(r => r.nodes === r.specNodes && r.nodes > 0 && r.nodes <= 12),
            allDurWithinCap: Object.values(records).every(r => r.dur >= 150 && r.dur <= 1200),
            tierOrderViolations,
            topStrictlyGreater,
            buffUnchanged: buffChecks.every(Boolean),
            records
        };
    }''')
    check('基準1_対象スキルすべてが固有のsignatureと一意のDOM構造を持ち重複がない',
          q3_res['targetCount'] >= 32
          and q3_res['uniqueSigCount'] == q3_res['targetCount']
          and q3_res['uniqueDomCount'] == q3_res['targetCount']
          and q3_res['allHasSig']
          and q3_res['buffCount'] >= 10  # R1b: 汎用バフの新スキルが加わるため以上
          and q3_res['buffUnchanged'],
          (q3_res['targetCount'], q3_res['uniqueSigCount'], q3_res['uniqueDomCount']))
    check('基準2_同分類内でティア昇順に演出時間・要素数・範囲がすべて単調非減少かつ最上位が最も豪華',
          len(q3_res['tierOrderViolations']) == 0
          and all(q3_res['topStrictlyGreater'].values()),
          (q3_res['tierOrderViolations'], q3_res['topStrictlyGreater']))
    check('基準3_全32スキルが同時要素数<=12・演出時間<=1200msの上限内',
          q3_res['allNodesMatchSpec'] and q3_res['allDurWithinCap'],
          q3_res['records'])

    # 基準3（続き）: 高速連打＆規定時間終了テスト
    rapid_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.opts.speed = 4;
        const ids = Object.keys(R.SK);
        let maxNodes = 0;
        for (let i = 0; i < 150; i++) {
            const id = ids[i % ids.length];
            R.playSkillFx(id, R.SK[id].hits || 1);
            const n = document.getElementById('fx-layer').children.length;
            if (n > maxNodes) maxNodes = n;
        }
        return { maxNodes, afterLoopNodes: document.getElementById('fx-layer').children.length };
    }''')
    pg.wait_for_timeout(400)
    after_wait_nodes = pg.evaluate('() => document.getElementById("fx-layer").children.length')
    check('基準3_高速連打150回でも要素数<=12かつ規定時間内に0個へ完全消去',
          0 < rapid_res['maxNodes'] <= 12 and after_wait_nodes == 0,
          (rapid_res, after_wait_nodes))

    # 基準4: 演出ON/OFFで同一乱数の戦闘結果が完全一致
    det_res = pg.evaluate('''() => {
        const R = window.__rogue;
        function makeRng(seed) {
            let s = seed >>> 0;
            return function() {
                s = (s * 1664525 + 1013904223) >>> 0;
                return s / 4294967296;
            };
        }
        function sim(fxOn) {
            R.setRng(makeRng(987654321));
            if (G.run) { R.finishRun('retreat'); R.ACTS.closeTowerModal(); }
            const p = R.newPlayer();
            p.lv = 60;
            p.skills = { zeroAbs: true, genesisRay: true, eternal: true };
            p.equippedSkills = ['eternal', 'zeroAbs', 'genesisRay'];
            p.hp = R.maxHp(p); p.mp = R.maxMp(p);
            G.p = p; G.opts.fx = fxOn; G.opts.speed = 4;
            R.startRun('E', 'high');
            R.noTimer(true);
            let rounds = 0;
            while (G.run && rounds < 400) {
                const run = G.run;
                if (run.phase === 'next') R.nextFloor();
                else if (run.phase === 'pause') run.phase = 'next';
                else if (run.phase === 'battle') R.battleRound();
                rounds++;
            }
            const res = {
                result: G.last ? G.last.result : null,
                rounds, hp: G.p.hp, mp: G.p.mp, gold: G.p.gold, kills: G.p.stats.kills
            };
            R.ACTS.closeTowerModal();
            R.setRng(Math.random);
            return res;
        }
        const rOn = sim(true);
        const rOff = sim(false);
        return { rOn, rOff, eq: JSON.stringify(rOn) === JSON.stringify(rOff) };
    }''')
    check('基準4_最上位スキル群でも演出ON/OFFで戦闘結果が完全一致', det_res['eq'], det_res)

    # 基準5: Q2のエフェクト確認パネルで全32スキルが固有signatureで再生できる
    q2_panel_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.ACTS.nav({ v: 'status' });
        R.ACTS.statusTab({ tab: 'data' });
        R.ACTS.openFxDebug();
        R.ACTS.fxDbgSpeed({ v: '4' });
        const targetCats = ['slash', 'magic', 'ult', 'heal'];
        const targetIds = Object.keys(R.SK).filter(id => targetCats.includes(R.getSkillFxSpec(id).cat));
        const playedSigs = [];
        const layer = document.getElementById('fxd-layer');
        for (const id of targetIds) {
            const btn = document.querySelector(`#fxd-skills [data-act="fxDbgSkill"][data-id="${id}"]`);
            if (!btn) continue;
            btn.click();
            if (layer.children.length > 0 && layer.dataset.sig) {
                playedSigs.push(layer.dataset.sig);
            }
        }
        R.ACTS.closeTowerModal();
        return {
            playedCount: playedSigs.length,
            uniquePlayedSigs: new Set(playedSigs).size
        };
    }''')
    check('基準5_Q2エフェクト確認パネルで全対象スキルがそれぞれの固有signatureで再生可能',
          q2_panel_res['playedCount'] >= 32 and q2_panel_res['uniquePlayedSigs'] == q2_panel_res['playedCount'],
          q2_panel_res)

    # 基準6: reduced-motion で激しい演出が出ない & 360/390/420px で崩れない
    rm_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.startRun('A', 'novice');
        R.noTimer(true);
        R.nextFloor();
        G.opts.fx = true;
        G._forceReducedMotion = true;
        const topSkills = ['heroic', 'zeroAbs', 'genesisRay', 'eternal'];
        const checks = topSkills.map(id => {
            R.playSkillFx(id, 6);
            const layer = document.getElementById('fx-layer');
            const fe = document.getElementById('f-enemy');
            return layer.children.length === 1
                && layer.children[0].classList.contains('fx-fade-only')
                && !fe.classList.contains('fx-shake-big')
                && !fe.classList.contains('fx-shake-sm');
        });
        G._forceReducedMotion = false;
        R.clearAllBattleFx();
        return checks.every(Boolean);
    }''')
    check('基準6_prefers-reduced-motionで最上位スキルも閃光・ぶれ無しの単一フェードのみ', rm_res)

    for w in (360, 390, 420):
        pg.set_viewport_size({'width': w, 'height': 844})
        lay_res = pg.evaluate('''() => {
            const R = window.__rogue;
            if (!G.run) { R.startRun('A', 'novice'); R.noTimer(true); R.nextFloor(); }
            R.renderAll();
            for (const id of ['heroic', 'zeroAbs', 'meteorNova', 'genesisRay', 'eternal']) {
                R.playSkillFx(id, 6);
            }
            const ovBattle = document.documentElement.scrollWidth - document.documentElement.clientWidth;
            const btns = [...document.querySelectorAll('.controls .row .btn')];
            const rects = btns.map(b => b.getBoundingClientRect());
            const navTop = document.querySelector('.nav').getBoundingClientRect().top;
            const btnsOk = rects.length === 4 && rects.every(r => r.width > 40 && r.right <= window.innerWidth && r.bottom <= navTop);
            return { ovBattle, btnsOk };
        }''')
        check(f'基準6_{w}px_最上位エフェクト表示中も横スクロールなし・4ボタン表示維持',
              lay_res['ovBattle'] <= 0 and lay_res['btnsOk'],
              lay_res)

    check('ページエラーなし', len(errors) == 0, errors)
    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
