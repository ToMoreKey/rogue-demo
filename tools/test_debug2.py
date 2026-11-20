#!/usr/bin/env python3
"""デバッグ2回目（0-1〜0-4 P7a重点監査 ＋ 1-1〜1-9 回帰監査）"""
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
    console_errs = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.on('console', lambda m: console_errs.append(m.text) if m.type == 'error' else None)
    pg.goto(HTTP_URL)

    # 0-1: パッシブ5種の一致・MP境界判定・SPリセット復元・欠損耐性
    res01 = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        const p = R.newPlayer();
        G.p = p; p.lv = 40; p.sp = 100; p.gold = 999999;
        const baseAtk = R.playerAtk(p);
        const baseMp = R.SK.fireball.mp;

        // magic 20 で mage10 取得し、p.mp === skillMpCost の境界で発動できるか
        R.ACTS.spAlloc({ tree: 'magic', amount: 20 });
        R.ACTS.spAlloc({ tree: 'mage', amount: 10 });
        const reducedMp = R.skillMpCost(p, R.SK.fireball);
        p.equippedSkills = ['fireball', null, null];
        R.startRun('A', 'novice');
        R.tick(); // 敵スポーン
        p.hp = R.maxHp(p);
        p.mp = reducedMp; // 元の s.mp より少ないが reducedMp ちょうど
        R.tick(); // fireball が発動すれば MP が消費される
        const usedWithReducedMp = p.mp < reducedMp;
        R.finishRun('retreat');

        // SPリセットでパッシブ解除＆元に戻るか
        R.ACTS.spAlloc({ tree: 'sword', amount: 20 });
        const atkWithSword15 = R.playerAtk(p);
        R.ACTS.spAllocReset({ tree: 'sword' }); R.ACTS.spAllocReset({ tree: 'sword' });
        const atkAfterReset = R.playerAtk(p);
        R.ACTS.spAllocReset({ tree: 'mage' }); R.ACTS.spAllocReset({ tree: 'mage' });
        const mpAfterReset = R.skillMpCost(p, R.SK.fireball);

        // passiveSkills 欠損耐性
        delete p.passiveSkills;
        const atkMissing = R.playerAtk(p);
        const mpMissing = R.skillMpCost(p, R.SK.fireball);

        return {
            baseAtk, atkWithSword15, atkAfterReset, atkMissing,
            baseMp, reducedMp, usedWithReducedMp, mpAfterReset, mpMissing
        };
    }''')
    check('0-1 mage10境界MPでスキル発動', res01['reducedMp'] < res01['baseMp'] and res01['usedWithReducedMp'], res01)
    check('0-1 SPリセットでパッシブ効果復元', res01['atkWithSword15'] > res01['baseAtk'] and res01['atkAfterReset'] == res01['baseAtk'] and res01['mpAfterReset'] == res01['baseMp'], res01)
    check('0-1 passiveSkills欠損でもクラッシュせず不変', res01['atkMissing'] == res01['baseAtk'] and res01['mpMissing'] == res01['baseMp'], res01)

    # 0-2: パッシブ × 極意 × 回廊祝福 × 深淵呪い 同時適用の極限状態
    res02 = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        const p = R.newPlayer();
        G.p = p; p.lv = 140; p.ending = true;
        for (const d of R.DUNGEONS) G.p.cleared[d.id] = { novice: true, mid: true, high: true, super: true, extreme: true };
        p.passiveSkills = { sword15: true, magic15: true, life15: true, warrior10: true, mage10: true, cleric10: true, hero10: true };
        for (const m of R.MASTERY_LIST) p.mastery[m.id] = R.MASTERY_MAX;
        p.skills.heal = true; p.skills.heroAwaken = true; p.skills.genesisRay = true;
        p.equippedSkills = ['heroAwaken', 'genesisRay', 'heal'];

        // 回廊 100F 相当＋祝福全種
        R.startTowerRun();
        G.run.floor = 100;
        G.run.tower.blessings = R.TOWER_BLESSINGS.map(x => x.id);
        let bad = [];
        for (let i = 0; i < 120; i++) {
            R.tick();
            if (!Number.isFinite(p.hp) || !Number.isFinite(p.mp) || !Number.isFinite(R.playerAtk(p)) || p.hp < 0 || p.mp < 0) {
                bad.push({ mode: 'tower', i, hp: p.hp, mp: p.mp, atk: R.playerAtk(p) });
                break;
            }
            if (!G.run) break;
        }
        const towerMpMin = Math.min(...Object.values(R.SK).map(s => R.skillMpCost(p, s)));
        if (G.run) R.finishRun('retreat');

        // 深淵10 同時適用
        R.startAbyssRun(10);
        for (let i = 0; i < 120; i++) {
            R.tick();
            if (!Number.isFinite(p.hp) || !Number.isFinite(p.mp) || !Number.isFinite(R.playerAtk(p)) || p.hp < 0 || p.mp < 0) {
                bad.push({ mode: 'abyss10', i, hp: p.hp, mp: p.mp, atk: R.playerAtk(p) });
                break;
            }
            if (!G.run) break;
        }
        if (G.run) R.finishRun('retreat');
        return { bad, towerMpMin, atk: R.playerAtk(p), hp: R.maxHp(p), mp: R.maxMp(p) };
    }''')
    check('0-2 極限組み合わせでNaN/Infinity/負値なし・MP下限>=1', len(res02['bad']) == 0 and res02['towerMpMin'] >= 1, res02)

    # 0-3: ヘルプ画面の数値・件数と実装の一致確認
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        G.tutorial = { done: true };
        G.p = R.newPlayer();
        R.renderAll();
        document.querySelector('#modal').hidden = true; G.modalOpen = false;
    }''')
    pg.click('#nav-help')
    pg.wait_for_timeout(150)
    res03 = pg.evaluate('''() => {
        const R = window.__rogue;
        const txt = document.querySelector('#view-help').innerHTML;
        const enTotal = R.dexEnemyGroups().reduce((s, g) => s + (g.list ? g.list.length : 0), 0);
        const itTotal = R.DEX_STARS.length * 2 + R.DEX_MYTHICS.length * 2;
        const achTotal = R.ACHIEVEMENTS.length;
        return { txt, enTotal, itTotal, achTotal };
    }''')
    check('0-3 ヘルプ記載の図鑑・実績件数一致', f"全{res03['enTotal']}種" in res03['txt'] and f"全{res03['itTotal']}種" in res03['txt'] and f"全{res03['achTotal']}種" in res03['txt'], {k: res03[k] for k in ('enTotal', 'itTotal', 'achTotal')})

    # 0-4: TUNE変更後の序盤（Lv1〜、A初級）新規プレイヤー疎通確認（初期3SPでheal習得＋ドロップ自動装備、最大8ラン）
    res04 = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        let clears = 0, defeats = 0, lvEnd = 1;
        G.p = R.newPlayer();
        R.ACTS.spAlloc({ tree: 'life', amount: 3 });
        G.p.equippedSkills = ['heal', null, null];
        for (let runIdx = 0; runIdx < 8; runIdx++) {
            const p = G.p;
            R.equipBest();
            p.hp = R.maxHp(p); p.mp = R.maxMp(p);
            R.startRun('A', 'novice');
            for (let t = 0; t < 200 && G.run; t++) R.tick();
            if (p.cleared && p.cleared.A && p.cleared.A.novice) clears++;
            if (p.hp < R.maxHp(p)) defeats++;
            lvEnd = p.lv;
        }
        return { clears, defeats, lvEnd };
    }''')
    print('INFO 0-4 新規Lv1(初期3SP->heal+equipBest) A初級8ラン:', res04)
    check('0-4 新規Lv1が8ラン以内にA初級クリア可能', res04['clears'] >= 1, res04)

    # 1-2 / 1-8: 420px & 360px 全主要画面・モーダル巡回（横溢れ0・エラー0）
    ov_results = {}
    for w in (420, 360):
        pg.set_viewport_size({'width': w, 'height': 800})
        pg.evaluate('''() => {
            const R = window.__rogue;
            R.setHeadless(false); R.noTimer(true);
            G.tutorial = { done: true };
            const p = R.newPlayer();
            p.lv = 130; p.ending = true; p.part1Cleared = true;
            for (const d of R.DUNGEONS) p.cleared[d.id] = { novice: true, mid: true, high: true, super: true, extreme: true };
            G.p = p;
            R.renderAll();
            document.querySelector('#modal').hidden = true; G.modalOpen = false;
        }''')
        for nav in ('#nav-town', '#nav-dungeon', '#nav-status', '#nav-help'):
            pg.click(nav)
            pg.wait_for_timeout(100)
            ov = pg.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
            ov_results[f'{w}_{nav}'] = ov
        for fn in ('openDex', 'openAch', 'towerShop', 'towerRanking'):
            pg.evaluate(f'() => window.__rogue.ACTS.{fn}()')
            pg.wait_for_timeout(100)
            ov = pg.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
            ov_results[f'{w}_{fn}'] = ov
            pg.evaluate('() => { document.querySelector("#modal").hidden = true; G.modalOpen = false; }')

    # 再発防止: equippedSkills に未知スキルIDがあってもクラッシュしないこと
    unknown_ok = pg.evaluate('''() => {
        const R = window.__rogue;
        const p = R.newPlayer();
        G.p = p;
        p.equippedSkills = ['unknown_skill_id', null, null];
        R.startRun('A', 'novice');
        R.renderAll();
        document.querySelector('#modal').hidden = true; G.modalOpen = false;
        const mp0 = R.skillMpCost(p, R.SK['unknown_skill_id']);
        R.finishRun('retreat');
        document.querySelector('#modal').hidden = true; G.modalOpen = false;
        return mp0 === 0;
    }''')
    check('再発防止: 未知スキルIDでもrenderBattle/renderSkillSlots/skillMpCostが落ちない', unknown_ok)

    check('1-8 420px/360px全画面・モーダル横溢れなし', all(v <= 0 for v in ov_results.values()), ov_results)
    check('1-2 pageerror・console.error 0件', len(errors) == 0 and len([c for c in console_errs if 'Failed to load resource' not in c]) == 0, {'errors': errors, 'console_errs': console_errs})

    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
