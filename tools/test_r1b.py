#!/usr/bin/env python3
"""R1b-1 キャラ専用スキル（全ツリーの参照整合・新スキル27個の定義・新パッシブcrit20/swift10・汎用バフgen・既存バフ不変・4キャラ装備）テスト"""
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
subprocess.check_call([sys.executable, os.path.join(ROOT, 'tools', 'make_site.py'), '--main', ROOT, '--dev', ROOT, '--out', site],
                      stdout=subprocess.DEVNULL)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=site))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'

NEW_IDS = ['shadowStep', 'rush', 'bladeDance', 'phantomSlash', 'swiftStance', 'shadowPierce', 'frenzyEdge', 'mirageStance',
           'thousandCuts', 'nightParade', 'phantomAdvent', 'grandHeist', 'trumpCard', 'thousandMask', 'nightSky',
           'swordGod', 'arcaneMiracle', 'starDust', 'skyMeteorite', 'endMagic',
           'holyBolt', 'judgment', 'holyNova', 'divineWrath', 'angelMiracle', 'celestialLance', 'heavenStars']

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + '/dev/index.html')
    pg.wait_for_timeout(300)
    pg.evaluate('() => { G.tutorial = { done: true }; const o = document.getElementById("tut-overlay"); if (o) o.hidden = true; window.__rogue.noTimer(true); G._charSelectOpen = false; }')

    # 基準1: 全ツリーの全マイルストーンの参照整合
    r1 = pg.evaluate('''(newIds) => {
        const R = window.__rogue; const bad = [], used = new Set(); const passives = new Set();
        for (const cid of R.CHAR_IDS) {
            const trees = R.getCharTrees(cid);
            if (trees.length !== 7) bad.push(cid + ':trees=' + trees.length);
            for (const t of trees) {
                let last = 0;
                for (const m of t.milestones) {
                    if (m.sp < last) bad.push(cid + ':' + t.id + ':order');
                    last = m.sp;
                    if (m.id) { used.add(m.id); if (!R.SK[m.id]) bad.push(cid + ':' + t.id + ':' + m.id); }
                    else if (m.passive) passives.add(m.passive);
                    else bad.push(cid + ':' + t.id + ':nothing@' + m.sp);
                    if (!m.desc) bad.push(cid + ':' + t.id + ':nodesc@' + m.sp);
                }
                if (t.milestones[t.milestones.length - 1].sp > 30) bad.push(cid + ':' + t.id + ':over30');
            }
        }
        return { bad, missingNew: newIds.filter(i => !used.has(i)), passives: [...passives] };
    }''', NEW_IDS)
    check('基準1_全4キャラ×3ツリーの参照整合（暫定コピーなし・新スキル27個がツリーに配置）',
          not r1['bad'] and not r1['missingNew'] and 'crit20' in r1['passives'] and 'swift10' in r1['passives'], r1)

    # 基準2: 新スキルの定義（初期案どおり）
    exp = {'rush': ('atk', 4, 0.7, 15, 3), 'bladeDance': ('atk', 6, 0.7, 28, 5), 'shadowPierce': ('atk', 1, 7.0, 40, 7),
           'nightParade': ('atk', 12, 1.5, 80, 8), 'nightSky': ('atk', 12, 2.0, 95, 9), 'swordGod': ('atk', 1, 24.0, 95, 9),
           'endMagic': ('atk', 1, 24.0, 95, 9), 'holyBolt': ('atk', 1, 1.8, 10, 3), 'divineWrath': ('atk', 1, 9.0, 55, 7),
           'heavenStars': ('atk', 6, 4.0, 85, 8), 'swiftStance': ('buff', 0, 0, 22, 6)}
    r2 = pg.evaluate('''(args) => {
        const R = window.__rogue; const [ids, exp] = args; const bad = [];
        for (const id of ids) { const s = R.SK[id]; if (!s) { bad.push(id + ':missing'); continue; } if (!s.desc || !s.name) bad.push(id + ':desc'); if (!R.SKILL_FX_MAP[id]) bad.push(id + ':fx'); }
        for (const [id, e] of Object.entries(exp)) { const s = R.SK[id];
          if (s.type !== e[0] || (e[1] && s.hits !== e[1]) || (e[2] && s.mult !== e[2]) || s.mp !== e[3] || s.ct !== e[4]) bad.push(id + ':value'); }
        return { n: ids.filter(i => R.SK[i]).length, bad };
    }''', [NEW_IDS, exp])
    check('基準2_新スキル27個が定義され、初期案の数値どおり（FX登録あり）', r2['n'] == 27 and not r2['bad'], r2)

    # 基準3: crit20 / swift10
    r3 = pg.evaluate('''() => {
        const R = window.__rogue; const p = R.newPlayer();
        const a = R.passiveBonus(p);
        p.passiveSkills = { crit20: true, swift10: true };
        const b = R.passiveBonus(p);
        return { a: [a.critAdd, a.ctRed], b: [b.critAdd, b.ctRed] };
    }''')
    check('基準3a_passiveBonus: crit20=+0.20 / swift10=ctRed+1（素のとき0）',
          r3['a'] == [0, 0] and abs(r3['b'][0] - 0.2) < 1e-9 and r3['b'][1] == 1, r3)
    r3b = pg.evaluate('''() => {
        const R = window.__rogue; R.setHeadless(true); R.noTimer(true);
        const out = {};
        for (const withSwift of [false, true]) {
            G.p = R.newPlayer(); const p = G.p; p.lv = 60; p.skills.strike = true; p.skills.heal = true;
            p.passiveSkills = withSwift ? { swift10: true } : {};
            R.startRun('A', 'novice'); R.nextFloor && R.nextFloor();
            const run = G.run; p.mp = 9999; p.hp = R.maxHp(p); run.enemy.hp = 9e9; run.enemy.maxHp = 9e9;
            run.skillCt = {};
            p.equippedSkills = ['strike', null, null]; run.queued = 'strike';
            R.playerAct();
            out[withSwift ? 'swift' : 'base'] = run.skillCt.strike;
            // 最低1の保証: ct=2のdoubleStabでもswiftで1以上
            p.skills.doubleStab = true; run.skillCt = {}; run.queued = 'doubleStab'; p.equippedSkills = ['doubleStab', null, null];
            R.playerAct(); out[(withSwift ? 'swift' : 'base') + '_ds'] = run.skillCt.doubleStab;
        }
        return out;
    }''')
    check('基準3b_swift10で強撃CT 2→1、最低1を下回らない', r3b['base'] == 2 and r3b['swift'] == 1 and r3b['swift_ds'] >= 1, r3b)
    r3c = pg.evaluate('''() => {
        const R = window.__rogue; R.setHeadless(true); const res = {};
        for (const pas of [false, true]) {
            let seed = 12345; R.setRng(() => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; });
            G.p = R.newPlayer(); const p = G.p; p.lv = 60; p.skills.strike = true;
            p.passiveSkills = pas ? { crit20: true } : {};
            R.startRun('A', 'novice'); R.nextFloor && R.nextFloor();
            const run = G.run; const dmgs = [];
            for (let i = 0; i < 500; i++) {
                p.mp = 9999; p.hp = R.maxHp(p); run.enemy.hp = 9e9; run.enemy.maxHp = 9e9; run.skillCt = {};
                run.queued = 'strike'; p.equippedSkills = ['strike', null, null];
                R.playerAct(); dmgs.push(9e9 - run.enemy.hp);
            }
            const sorted = [...dmgs].sort((x, y) => x - y); const med = sorted[Math.floor(sorted.length / 2)];
            res[pas ? 'crit20' : 'base'] = dmgs.filter(d => d > med * 1.25).length / dmgs.length;
        }
        R.setRng(null);
        return res;
    }''')
    check('基準3c_クリティカル率: 素≈10%、crit20≈30%（統計）',
          0.05 < r3c['base'] < 0.16 and 0.23 < r3c['crit20'] < 0.37, r3c)

    # 基準4: 汎用バフ gen（攻撃・防御・被ダメ・ターン切れ）と既存バフ不変
    r4 = pg.evaluate('''() => {
        const R = window.__rogue; R.setHeadless(true);
        G.p = R.newPlayer(); const p = G.p; p.lv = 60; R.startRun('A', 'novice'); R.nextFloor && R.nextFloor();
        const run = G.run; p.mp = 9999;
        const m0 = [R.genBuffMult(run, 'atk'), R.genBuffMult(run, 'def'), R.genBuffMult(run, 'taken')];
        run.skillCt = {}; R.useSkillEffect('mirageStance');
        const m1 = [R.genBuffMult(run, 'atk'), R.genBuffMult(run, 'def'), R.genBuffMult(run, 'taken')];
        const turns1 = run.gen.turns;
        run.skillCt = {}; R.useSkillEffect('frenzyEdge');
        const m2 = [R.genBuffMult(run, 'atk'), R.genBuffMult(run, 'def'), R.genBuffMult(run, 'taken')];
        // 既存バフは従来どおり
        run.skillCt = {}; R.useSkillEffect('guard'); const guard = run.guard;
        run.skillCt = {}; R.useSkillEffect('warGod'); const warGod = run.warGod;
        // ターン経過: 敵の攻撃ごとに減る
        run.skillCt = {}; R.useSkillEffect('shadowStep'); let t0 = run.gen.turns; let seq = [];
        for (let i = 0; i < 4; i++) { p.hp = R.maxHp(p); R.enemyAct(); seq.push(run.gen ? run.gen.turns : 0); }
        return { m0, m1, turns1, m2, guard, warGod, t0, seq, after: R.genBuffMult(run, 'def') };
    }''')
    check('基準4a_汎用バフ: 倍率が反映（幻惑=攻4/被1.2、狂乱=攻3/防0.5）、素は1',
          r4['m0'] == [1, 1, 1] and r4['m1'] == [4, 1, 1.2] and r4['m2'] == [3, 0.5, 1], r4)
    check('基準4b_既存バフ不変（鉄壁3回・鬼神の構え4ターン）と、gen のターン経過で切れる',
          r4['guard'] == 3 and r4['warGod'] == 4 and r4['t0'] == 3 and r4['seq'] == [2, 1, 0, 0] and r4['after'] == 1, r4)

    # バーサーク（攻撃3倍・防御半減・4ターン）と英雄の奇跡（全ステータス2倍）の実効果
    r6 = pg.evaluate('''() => {
        const R = window.__rogue; R.setHeadless(true); R.noTimer(true);
        R.setRng(() => 0.99);  // 会心なし・決定的にする
        const setup = () => {
            G.run = null; G.p = R.newPlayer(); const p = G.p; p.lv = 60; p.skills.heroic = true; p.skills.berserk = true;
            R.startRun('A', 'novice'); R.nextFloor && R.nextFloor();
            const run = G.run; p.mp = 9999; p.hp = R.maxHp(p); run.enemy.hp = 9e9; run.enemy.maxHp = 9e9; run.enemy.firstHit = false; run.enemy.atk = 250;
            run.skillCt = {}; run.queued = null; p.equippedSkills = [null, null, null];
            return { p, run };
        };
        const atkDmg = (run) => { const b = run.enemy.hp; R.playerAct(); return b - run.enemy.hp; };
        const takeDmg = (p, run) => { const b = p.hp; R.enemyAct(); return b - p.hp; };
        const out = {};
        let { p, run } = setup();
        const a0 = atkDmg(run); const d0 = takeDmg(p, run);
        ({ p, run } = setup());
        R.useSkillEffect('berserk');
        const a1 = atkDmg(run); const d1 = takeDmg(p, run);
        out.berserk = { a0, a1, d0, d1, turns: run.berserk };
        for (let i = 0; i < 3; i++) takeDmg(p, run);
        out.berserkAfter = run.berserk;
        ({ p, run } = setup());
        p.equippedSkills = ['heroic', null, null]; run.queued = 'heroic';
        const h = atkDmg(run); out.heroDef = run.heroDef;
        const dh = takeDmg(p, run);
        out.hero = { h, dh, after: run.heroDef };
        out.base = { a0, d0 };
        return out;
    }''')
    b6 = r6['berserk']
    check('基準6a_バーサーク: 攻撃約3倍（会心ぶれ込みで2〜4.6倍）・被ダメ増・4ターンで切れる',
          1.9 < b6['a1'] / max(1, b6['a0']) < 4.6 and b6['d1'] > b6['d0'] * 1.3 and b6['turns'] == 3 and r6['berserkAfter'] == 0, r6)
    check('基準6b_英雄の奇跡: 全ステータス2倍フラグ（防御2倍は次の被弾まで）',
          r6['heroDef'] == 1 and r6['hero']['after'] == 0 and r6['hero']['dh'] < r6['base']['d0'] * 0.8, r6)

    # 4キャラとも全ツリーを最大に振ると全スキルが習得でき、装備スロットに入る
    r5 = pg.evaluate('''() => {
        const R = window.__rogue; const out = {};
        for (const cid of R.CHAR_IDS) {
            G.p = R.newPlayer(); const p = G.p; p.skin = cid; R.syncActiveCharState(p); p.ending = true; p.sp = 999; p.lv = 100;
            const trees = R.getCharTrees(cid);
            for (let r = 0; r < 4; r++) for (const t of trees) { const tr = trees.find(x => x.id === t.id); if (!tr.unlockWhen || tr.unlockWhen(p)) R.ACTS.spAlloc({ tree: t.id, amount: t.maxSp - (p.skillPts[t.id] || 0) }); }
            const learned = Object.keys(p.skills).filter(k => p.skills[k]).length;
            const want = new Set(); trees.filter(t => !t.id.endsWith('_b')).forEach(t => t.milestones.forEach(m => m.id && want.add(m.id)));
            out[cid] = { learned, want: want.size, passives: Object.keys(p.passiveSkills || {}).filter(k => p.passiveSkills[k]) };
        }
        return out;
    }''')
    check('基準5_4キャラとも全ツリー最大でツリー内の全スキル習得・パッシブ発動',
          all(v['learned'] == v['want'] for v in r5.values()) and 'crit20' in r5['chloe']['passives'] and 'swift10' in r5['chloe']['passives'], r5)

    check('ページエラーなし', len(errors) == 0, errors)
    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
