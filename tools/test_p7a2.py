#!/usr/bin/env python3
"""P7a-2 パッシブ反映（攻撃・MP消費・スキル回復・hero10説明・表示一致・空オブジェクト不変・旧セーブ互換）テスト"""
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

    # 1. 空の passiveSkills で結果が変わらないこと & 各パッシブ効果・解除復元
    res1 = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        const p = R.newPlayer();
        p.lv = 30;
        p.passiveSkills = undefined;
        const atkUndef = R.playerAtk(p);
        const defUndef = R.playerDef(p);
        const mpCostUndef = R.skillMpCost(p, R.SK.strike);

        p.passiveSkills = {};
        const atkEmpty = R.playerAtk(p);
        const defEmpty = R.playerDef(p);
        const mpCostEmpty = R.skillMpCost(p, R.SK.strike);

        p.passiveSkills = { sword15: true };
        const atkS15 = R.playerAtk(p);
        p.passiveSkills = { sword15: true, warrior10: true };
        const atkW10 = R.playerAtk(p);
        p.passiveSkills = { sword15: true, warrior10: true, hero10: true };
        const atkAll = R.playerAtk(p);
        const defHero = R.playerDef(p);

        p.passiveSkills = {};
        const atkReset = R.playerAtk(p);

        // MPコスト下限1確認 & mage10
        p.passiveSkills = { mage10: true };
        const mpStrikeMage = R.skillMpCost(p, R.SK.strike);
        const mpMin1 = R.skillMpCost(p, { mp: 1 });
        p.passiveSkills = {};
        const mpStrikeReset = R.skillMpCost(p, R.SK.strike);

        return {
            atkUndef, atkEmpty, defUndef, defEmpty, mpCostUndef, mpCostEmpty,
            atkS15, atkW10, atkAll, defHero, atkReset,
            mpStrikeBase: R.SK.strike.mp, mpStrikeMage, mpMin1, mpStrikeReset
        };
    }''')
    check('passiveSkills空で不変', res1['atkUndef'] == res1['atkEmpty'] and res1['defUndef'] == res1['defEmpty'] and res1['mpCostUndef'] == res1['mpCostEmpty'], res1)
    check('sword15_warrior10_hero10攻撃力上昇と解除復元', res1['atkS15'] > res1['atkEmpty'] and res1['atkW10'] > res1['atkS15'] and res1['atkAll'] > res1['atkW10'] and res1['atkReset'] == res1['atkEmpty'], res1)
    check('hero10で防御力は変わらない', res1['defHero'] == res1['defEmpty'], res1)
    check('mage10でMP消費20%減・下限1・解除復元', res1['mpStrikeMage'] == max(1, round(res1['mpStrikeBase'] * 0.8)) and res1['mpMin1'] == 1 and res1['mpStrikeReset'] == res1['mpStrikeBase'], res1)

    # 2. 実戦闘での MP消費（攻撃スキル/補助スキル）と cleric10 スキル回復（ポーション対象外）
    res2 = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        const p = R.newPlayer();
        G.p = p; p.lv = 40;
        p.skills.heal = true; p.skills.strike = true;
        p.equippedSkills = ['heal', 'strike', null];

        // heal 比較（cleric10 なし vs あり）
        R.startRun('A', 'novice');
        R.tick(); // 敵スポーン
        p.passiveSkills = {};
        p.hp = 10; p.mp = 50;
        R.tick(); // chooseAction -> heal
        const healNoCleric = p.hp - 10;
        const mpSpentHealNoMage = 50 - p.mp;
        R.finishRun('retreat');

        R.startRun('A', 'novice');
        R.tick(); // 敵スポーン
        p.passiveSkills = { cleric10: true, mage10: true };
        const diffHealExpected = R.SK.heal.mp - R.skillMpCost(p, R.SK.heal);
        const diffAtkExpected = R.SK.strike.mp - R.skillMpCost(p, R.SK.strike);
        p.hp = 10; p.mp = 50;
        R.tick(); // heal 発動
        const healWithCleric = p.hp - 10;
        const mpSpentHealWithMage = 50 - p.mp;
        R.finishRun('retreat');

        // 攻撃スキル MP消費（mage10 なし vs あり）
        R.startRun('A', 'novice');
        R.tick(); // 敵スポーン
        p.passiveSkills = {};
        p.hp = R.maxHp(p); p.mp = 50;
        p.equippedSkills = ['strike', null, null];
        R.tick(); // strike 発動
        const mpSpentAtkNoMage = 50 - p.mp;
        R.finishRun('retreat');

        R.startRun('A', 'novice');
        R.tick(); // 敵スポーン
        p.passiveSkills = { mage10: true };
        p.hp = R.maxHp(p); p.mp = 50;
        p.equippedSkills = ['strike', null, null];
        R.tick(); // strike 発動
        const mpSpentAtkWithMage = 50 - p.mp;
        R.finishRun('retreat');

        // ポーションは cleric10 対象外
        p.passiveSkills = {}; p.potions.hp = 2;
        p.hp = 10; R.usePotion('hp');
        const potHealNoCleric = p.hp - 10;
        p.passiveSkills = { cleric10: true };
        p.hp = 10; R.usePotion('hp');
        const potHealWithCleric = p.hp - 10;

        return {
            healNoCleric, healWithCleric,
            mpSpentHealNoMage, mpSpentHealWithMage,
            diffHealExpected,
            mpSpentAtkNoMage, mpSpentAtkWithMage,
            diffAtkExpected,
            potHealNoCleric, potHealWithCleric
        };
    }''')
    check('cleric10でスキル回復+50%', res2['healNoCleric'] > 0 and abs(res2['healWithCleric'] - res2['healNoCleric'] * 1.5) <= 4, res2)
    check('ポーションはcleric10対象外', res2['potHealWithCleric'] == res2['potHealNoCleric'], res2)
    check('mage10実戦闘MP消費一致_healとatk', (res2['mpSpentHealNoMage'] - res2['mpSpentHealWithMage']) == res2['diffHealExpected'] and (res2['mpSpentAtkNoMage'] - res2['mpSpentAtkWithMage']) == res2['diffAtkExpected'], res2)

    # 3. hero10 説明文 & ステータス画面・スキル画面・戦闘画面のUI表示が計算と一致 & 420px溢れなし
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        G.tutorial = { done: true };
        const p = R.newPlayer();
        G.p = p; p.lv = 40;
        p.passiveSkills = { sword15: true, warrior10: true, hero10: true, mage10: true };
        p.skills.strike = true; p.equippedSkills = ['strike', null, null];
        R.startRun('A', 'novice');
        R.renderAll();
        document.querySelector('#modal').hidden = true; G.modalOpen = false;
    }''')
    pg.click('#nav-status')
    pg.wait_for_timeout(150)
    hero_txt = pg.evaluate('() => document.querySelector("#view-status").innerText')
    pg.click('[data-act="statusTab"][data-tab="skill"]')
    pg.wait_for_timeout(100)
    ui_res = pg.evaluate('''(heroTxt) => {
        const R = window.__rogue;
        const p = G.p;
        const stText = heroTxt + '\\n' + document.querySelector('#view-status').innerText;
        const heroTree = R.SKILL_TREES.find(t => t.id === 'hero');
        const heroMs = heroTree.milestones.find(m => m.passive === 'hero10');
        return {
            stText,
            calcAtk: R.playerAtk(p),
            calcStrikeMp: R.skillMpCost(p, R.SK.strike),
            heroDesc: heroMs ? heroMs.desc : '',
            ovStatus: document.documentElement.scrollWidth - window.innerWidth
        };
    }''', hero_txt)
    check('hero10説明文更新', ui_res['heroDesc'] == 'パッシブ：攻撃・最大HP・最大MPが25%上昇', ui_res['heroDesc'])
    check('ステータス表示ATKと計算一致', str(ui_res['calcAtk']) in ui_res['stText'], (ui_res['calcAtk'], ui_res['stText'][:200]))
    check('スキルUI表示MPと計算一致', f"MP {ui_res['calcStrikeMp']}" in ui_res['stText'], ui_res['calcStrikeMp'])
    check('420px横溢れなし', ui_res['ovStatus'] <= 0, ui_res['ovStatus'])

    # 4. 旧セーブ読み込み互換（v5 相当 → v9 移行でSP返却＆正常データ化）
    mig_ok = pg.evaluate('''() => {
        const R = window.__rogue;
        const p = R.newPlayer();
        const oldSave = { v: 5, p: { lv: 25, exp: 0, sp: 5, gold: 100, bank: 0, hp: 100, mp: 30, weapon: p.weapon, armor: p.armor, bag: [], cleared: {}, skills: { strike: true }, skillPts: { sword: 15, magic: 0, life: 0 }, passiveSkills: { sword15: true }, equippedSkills: ['strike', null, null], potions: { hp: 0, mp: 0 }, stones: {}, stats: { runs: 1, clears: 0, kills: 0 }, nextId: 10 } };
        const m = R.migrateSave(oldSave);
        return !!(m && m.v === R.SAVE_VERSION && m.p.sp === 20 && m.p.chars && m.p.chars.stella);
    }''')
    check('旧セーブ読み込み互換', mig_ok)
    check('ページエラーなし', len(errors) == 0, errors)

    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
