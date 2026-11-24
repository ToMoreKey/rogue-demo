#!/usr/bin/env python3
"""Q1 戦闘演出の品質アップ（ボス激昂の色味・スキル発動エフェクト）テスト"""
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
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(HTTP_URL)
    pg.wait_for_timeout(300)
    pg.evaluate('() => { G.tutorial = { done: true }; const o = document.getElementById("tut-overlay"); if (o) o.hidden = true; window.__rogue.noTimer(true); }')

    # 基準1: 激昂の瞬間と激昂中の演出が出る。戦闘終了後・次の戦闘で完全に消える（DOMとクラスが残らない）
    rage_res = pg.evaluate('''() => {
        const R = window.__rogue;
        const p = R.newPlayer();
        p.lv = 120;
        for (const d of R.DUNGEONS) {
            p.cleared[d.id] = { novice: true, mid: true, high: true, super: true, extreme: true };
        }
        p.hp = R.maxHp(p); p.mp = R.maxMp(p);
        G.p = p; G.opts.fx = true;
        R.startRun('O', 'extreme');
        R.noTimer(true);
        G.run.floor = G.run.floors;
        R.spawnEnemy(true, false);
        R.renderBattle();
        const en = G.run.enemy;
        // 激昂前
        const beforeRage = {
            arenaRage: document.getElementById('arena').classList.contains('rage-active'),
            enemyAura: document.getElementById('f-enemy').classList.contains('rage-aura'),
            nameRage: document.getElementById('b-ename').classList.contains('rage-name')
        };
        // HP50%以下にして battleRound 相当の激昂を発火
        en.hp = Math.floor(en.maxHp * 0.45);
        en.raged = true;
        en.fallbackId = en.id;
        en.id = (G.run.d.boss && G.run.d.boss.rageId) || 'o_boss_rage';
        en.name = (G.run.d.boss && G.run.d.boss.rageName) || '終焉神ニヒル・真';
        R.renderEnemy(true);
        R.triggerRageFx();
        R.renderBattle();
        const sprImg = document.querySelector('#spr-enemy img, #spr-enemy div');
        const duringRage = {
            arenaRage: document.getElementById('arena').classList.contains('rage-active'),
            arenaBurst: document.getElementById('arena').classList.contains('rage-burst'),
            enemyAura: document.getElementById('f-enemy').classList.contains('rage-aura'),
            enemyBurst: document.getElementById('f-enemy').classList.contains('rage-burst'),
            nameRage: document.getElementById('b-ename').classList.contains('rage-name'),
            filterStyle: sprImg ? (sprImg.getAttribute('style') || '') : ''
        };
        // 敵撃破（onKill）で消えるか
        en.hp = 0;
        R.onKill();
        R.renderBattle();
        const afterKill = {
            arenaRage: document.getElementById('arena').classList.contains('rage-active'),
            arenaBurst: document.getElementById('arena').classList.contains('rage-burst'),
            enemyAura: document.getElementById('f-enemy').classList.contains('rage-aura'),
            nameRage: document.getElementById('b-ename').classList.contains('rage-name')
        };
        // 再度激昂状態にしてから finishRun('retreat') で戦闘終了したとき完全に消えるか
        R.spawnEnemy(true, false);
        G.run.enemy.raged = true;
        R.triggerRageFx();
        R.finishRun('retreat');
        R.ACTS.closeTowerModal();
        const afterFinish = {
            arenaRage: document.getElementById('arena').classList.contains('rage-active'),
            arenaBurst: document.getElementById('arena').classList.contains('rage-burst'),
            enemyAura: document.getElementById('f-enemy').classList.contains('rage-aura'),
            nameRage: document.getElementById('b-ename').classList.contains('rage-name'),
            fxNodes: document.getElementById('fx-layer').children.length
        };
        return { beforeRage, duringRage, afterKill, afterFinish };
    }''')
    check('基準1_激昂の瞬間と激昂中の演出（色味・閃光・オーラ・ビネット）',
          (not rage_res['beforeRage']['arenaRage'])
          and rage_res['duringRage']['arenaRage']
          and rage_res['duringRage']['arenaBurst']
          and rage_res['duringRage']['enemyAura']
          and rage_res['duringRage']['enemyBurst']
          and rage_res['duringRage']['nameRage']
          and ('hue-rotate(140deg)' in rage_res['duringRage']['filterStyle']),
          rage_res)
    check('基準1_撃破後・戦闘終了後に激昂演出とDOMが完全に消える',
          (not rage_res['afterKill']['arenaRage'])
          and (not rage_res['afterKill']['enemyAura'])
          and (not rage_res['afterKill']['nameRage'])
          and (not rage_res['afterFinish']['arenaRage'])
          and (not rage_res['afterFinish']['enemyAura'])
          and (not rage_res['afterFinish']['nameRage'])
          and rage_res['afterFinish']['fxNodes'] == 0,
          rage_res)

    # 基準2: 全スキルIDがいずれかの分類（または汎用）になり、代表スキルで要素が出て規定時間内に消える
    sk_res = pg.evaluate('''() => {
        const R = window.__rogue;
        const validCats = ['slash', 'magic', 'ult', 'heal', 'buff', 'generic'];
        const allIds = Object.keys(R.SK);
        const mapped = {};
        for (const id of allIds) {
            const spec = R.getSkillFxSpec(id);
            mapped[id] = spec ? spec.cat : null;
        }
        const unknownSpec = R.getSkillFxSpec('__unknown_skill_id__');
        // 戦闘画面を開いて各分類の代表スキルを発火
        R.startRun('A', 'novice');
        R.noTimer(true);
        R.nextFloor();
        R.renderBattle();
        G.opts.fx = true;
        G.opts.speed = 1;
        const reps = {
            slash: ['multi', 3],
            magic: ['fireball', 1],
            ult: ['cosmicNova', 1],
            heal: ['heal', 1],
            buff: ['guard', 1],
            generic: ['__unknown__', 1]
        };
        const repCounts = {};
        for (const [cat, [sid, hits]] of Object.entries(reps)) {
            R.playSkillFx(sid, hits);
            repCounts[cat] = document.getElementById('fx-layer').children.length;
        }
        // 最後に speed=4 で発動して時間経過で消えることを確認
        G.opts.speed = 4;
        R.playSkillFx('strike', 1);
        const immediateCount = document.getElementById('fx-layer').children.length;
        return {
            totalSkills: allIds.length,
            allValid: allIds.every(id => validCats.includes(mapped[id])),
            allExplicitlyMapped: allIds.every(id => !!R.SKILL_FX_MAP[id]),
            unknownFallback: unknownSpec.cat,
            repCounts,
            immediateCount
        };
    }''')
    pg.wait_for_timeout(300)
    after_wait_count = pg.evaluate('() => document.getElementById("fx-layer").children.length')
    check('基準2_全42スキルIDの分類網羅と未分類の汎用フォールバック',
          sk_res['totalSkills'] == 42 and sk_res['allValid'] and sk_res['allExplicitlyMapped']
          and sk_res['unknownFallback'] == 'generic',
          sk_res)
    check('基準2_分類ごとの代表スキルで演出要素が出現し規定時間内に消える',
          all(c > 0 and c <= 12 for c in sk_res['repCounts'].values())
          and sk_res['immediateCount'] > 0 and after_wait_count == 0,
          (sk_res['repCounts'], after_wait_count))

    # 基準3: 演出ON/OFFで同じ乱数シードの戦闘結果（勝敗・ターン数・最終HP・MP・敵HP）が完全一致
    det_res = pg.evaluate('''() => {
        const R = window.__rogue;
        function makeRng(seed) {
            let s = seed >>> 0;
            return function() {
                s = (s * 1664525 + 1013904223) >>> 0;
                return s / 4294967296;
            };
        }
        function simBattle(fxOn) {
            R.setRng(makeRng(123456789));
            if (G.run) { R.finishRun('retreat'); R.ACTS.closeTowerModal(); }
            const p = R.newPlayer();
            p.lv = 35;
            p.skills = { strike: true, multi: true, fireball: true, heal: true, guard: true, cosmicNova: true };
            p.equippedSkills = ['heal', 'guard', 'multi'];
            p.hp = R.maxHp(p); p.mp = R.maxMp(p);
            G.p = p;
            G.opts.fx = fxOn;
            G.opts.speed = 4;
            R.startRun('C', 'high');
            R.noTimer(true);
            let rounds = 0;
            while (G.run && rounds < 500) {
                const run = G.run;
                if (run.phase === 'next') R.nextFloor();
                else if (run.phase === 'pause') run.phase = 'next';
                else if (run.phase === 'battle') R.battleRound();
                rounds++;
            }
            const res = {
                lastResult: G.last ? G.last.result : null,
                rounds,
                hp: G.p.hp,
                mp: G.p.mp,
                exp: G.p.exp,
                gold: G.p.gold,
                kills: G.p.stats.kills
            };
            R.ACTS.closeTowerModal();
            R.setRng(Math.random);
            return res;
        }
        const onRes = simBattle(true);
        const offRes = simBattle(false);
        return { onRes, offRes, eq: JSON.stringify(onRes) === JSON.stringify(offRes) };
    }''')
    check('基準3_演出ON/OFFで同一乱数の戦闘結果・ターン数・最終HPが完全一致',
          det_res['eq'], det_res)

    # 基準4: 高速（最大速度）で連続発動しても演出要素が12個を超えない・溜まらない
    stress_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.opts.fx = true;
        G.opts.speed = 4;
        R.startRun('A', 'novice');
        R.noTimer(true);
        R.nextFloor();
        const ids = Object.keys(R.SK);
        let maxChildren = 0;
        for (let i = 0; i < 120; i++) {
            const id = ids[i % ids.length];
            R.playSkillFx(id, 6);
            const n = document.getElementById('fx-layer').children.length;
            if (n > maxChildren) maxChildren = n;
        }
        return { maxChildren, curChildren: document.getElementById('fx-layer').children.length };
    }''')
    pg.wait_for_timeout(300)
    after_stress = pg.evaluate('() => document.getElementById("fx-layer").children.length')
    check('基準4_高速連続120回発動でも同時要素数<=12かつ終了後0個',
          0 < stress_res['maxChildren'] <= 12 and after_stress == 0,
          (stress_res, after_stress))

    # 基準5: prefers-reduced-motion で激しい演出が出ない。OFF設定で出ない。設定が保持される
    rm_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.opts.fx = true;
        G._forceReducedMotion = true;
        R.playSkillFx('cosmicNova', 1);
        const layer = document.getElementById('fx-layer');
        const rmCount = layer.children.length;
        const rmOnlyFade = [...layer.children].every(el => el.classList.contains('fx-fade-only') && el.classList.contains('fx-reduced'));
        const enemyShaking = document.getElementById('f-enemy').classList.contains('fx-shake-big');
        R.triggerRageFx();
        const rageBurstOnRm = document.getElementById('arena').classList.contains('rage-burst');
        G._forceReducedMotion = false;
        R.clearAllBattleFx();

        // OFF設定で出ない & 設定保持
        R.finishRun('retreat');
        R.ACTS.closeTowerModal();
        R.ACTS.nav({ v: 'status' });
        R.ACTS.statusTab({ tab: 'data' });
        const btnBefore = document.querySelector('[data-act="fxToggle"]').innerText;
        R.ACTS.fxToggle();
        const btnAfter = document.querySelector('[data-act="fxToggle"]').innerText;
        const savedFx = JSON.parse(localStorage.getItem(R.SAVE_KEY)).opts.fx;
        // リロード相当の load() で保持されるか
        G.opts.fx = true;
        R.load();
        const loadedFx = G.opts.fx;
        // OFF時に playSkillFx しても要素が0個か
        R.startRun('A', 'novice');
        R.noTimer(true);
        R.nextFloor();
        R.playSkillFx('meteorNova', 1);
        const offNodes = document.getElementById('fx-layer').children.length;
        // ONに戻す
        R.ACTS.fxToggle();
        return { rmCount, rmOnlyFade, enemyShaking, rageBurstOnRm, btnBefore, btnAfter, savedFx, loadedFx, offNodes };
    }''')
    check('基準5_prefers-reduced-motionで閃光・ぶれを出さず短いフェードのみ',
          rm_res['rmCount'] == 1 and rm_res['rmOnlyFade'] and (not rm_res['enemyShaking']) and (not rm_res['rageBurstOnRm']),
          rm_res)
    check('基準5_エフェクトOFF設定で演出抑止＆セーブ保持',
          'ON' in rm_res['btnBefore'] and 'OFF' in rm_res['btnAfter']
          and rm_res['savedFx'] is False and rm_res['loadedFx'] is False and rm_res['offNodes'] == 0,
          rm_res)

    # 基準6: 360/390/420px で崩れない（横スクロールなし、操作ボタンが隠れない）
    for w in (360, 390, 420):
        pg.set_viewport_size({'width': w, 'height': 844})
        layout_res = pg.evaluate('''() => {
            const R = window.__rogue;
            if (!G.run) { R.startRun('A', 'novice'); R.noTimer(true); R.nextFloor(); }
            R.renderAll();
            R.playSkillFx('cosmicNova', 1);
            const ovBattle = document.documentElement.scrollWidth - document.documentElement.clientWidth;
            const btns = [...document.querySelectorAll('.controls .row .btn')];
            const rects = btns.map(b => b.getBoundingClientRect());
            const navTop = document.querySelector('.nav').getBoundingClientRect().top;
            const btnsVisible = rects.length === 4 && rects.every(r => r.width > 40 && r.right <= window.innerWidth && r.bottom <= navTop);
            // データタブも確認
            const viewBk = G.view;
            G.view = 'status'; G.statusTab = 'data'; R.renderAll();
            const ovStatus = document.documentElement.scrollWidth - document.documentElement.clientWidth;
            G.view = viewBk; R.renderAll();
            return { ovBattle, ovStatus, btnsVisible };
        }''')
        check(f'基準6_{w}px_戦闘演出中＆データタブで横スクロールなし・4ボタン表示',
              layout_res['ovBattle'] <= 0 and layout_res['ovStatus'] <= 0 and layout_res['btnsVisible'],
              layout_res)

    check('ページエラーなし', len(errors) == 0, errors)
    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
