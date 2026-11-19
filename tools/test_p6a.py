#!/usr/bin/env python3
"""P6a 図鑑（敵94種・装備22種・記録・移行・UI・報酬・420pxレイアウト）テスト"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / 'index.html').as_uri()
FAILS = 0


def check(name, cond, detail=''):
    global FAILS
    if cond:
        print('PASS', name)
    else:
        FAILS += 1
        print('FAIL', name, detail)


with sync_playwright() as pw:
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': 420, 'height': 800})
    pg = ctx.new_page()
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(URL)

    # 1. 敵出現・撃破記録 (通常敵・ボス・o_boss_rage・深淵の主) + 装備記録 (通常・強化・★8/★9神話)
    rec = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer(); G.p.lv = 130; G.p.gold = 1000000; G.p.ending = true;
        for (const d of R.DUNGEONS) G.p.cleared[d.id] = { novice: true, mid: true, high: true, super: true, extreme: true };
        G.p.abyss = { best: 10, cleared: {1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true} };
        G.p.tower.coins = 2000; G.tutorial = { done: true };

        // A初級で1体倒す
        R.startRun('A', 'novice');
        R.nextFloor();
        const e1 = G.run.enemy.id;
        const seenOnSpawn = !!(G.p.dex.enemies[e1] && G.p.dex.enemies[e1].seen);
        G.run.enemy.hp = 0; R.onKill();
        const killsAfter = G.p.dex.enemies[e1].kills;
        G.run = null;

        // O極級ボス → 怒り形態
        R.startRun('O', 'extreme');
        G.run.floor = G.run.floors;
        R.spawnEnemy(true, false);
        G.run.enemy.hp = Math.floor(G.run.enemy.maxHp * 0.4);
        R.battleRound();
        const rageSeen = !!(G.p.dex.enemies.o_boss_rage && G.p.dex.enemies.o_boss_rage.seen);
        G.run = null;

        // 深淵の主
        G.p.hp = R.maxHp(G.p); G.p.mp = R.maxMp(G.p);
        R.startAbyssRun(1); G.run.floor = 50; R.spawnEnemy(true, false);
        const gulaSeen = !!(G.p.dex.enemies.abyss_gula && G.p.dex.enemies.abyss_gula.seen);
        G.run = null;

        // 装備記録: ★5ドロップ + ★6強化 + ★8交換神話 + ★9ドロップ神話
        G.p.stones.stone_hi = 5;
        const w5 = R.genItem(R.DIFFS[2], false, 'weapon', 5, 5);
        R.receiveItem(w5);
        R.smithUpgrade(w5.id);
        R.ACTS.buyTowerShop({ id: 'mythic_w8' });
        const a9 = R.genMythic9('armor');
        R.receiveItem(a9);

        return {
            seenOnSpawn, killsAfter, rageSeen, gulaSeen,
            items: G.p.dex.items
        };
    }''')
    check('enemy seen on spawn, kills incremented on kill, o_boss_rage & abyss boss recorded',
          rec['seenOnSpawn'] and rec['killsAfter'] == 1 and rec['rageSeen'] and rec['gulaSeen'], rec)
    check('items recorded separately for normal and mythic (weapon_5, weapon_6, weapon_m8, armor_m9)',
          rec['items'].get('weapon_5') and rec['items'].get('weapon_6')
          and rec['items'].get('weapon_m8') and rec['items'].get('armor_m9'), rec['items'])

    # 2. 既存セーブ(v5)からの移行でクリア済みダンジョンの敵・所持装備が反映される
    mig = pg.evaluate('''() => {
        const R = window.__rogue;
        const v5 = {
            v: 5,
            p: {
                lv: 40, bagCap: 60,
                cleared: { A: { novice: true }, B: { mid: true } },
                weapon: { id: 1, slot: 'weapon', star: 4, rarity: 1, roll: 0.8, props: [] },
                armor: { id: 2, slot: 'armor', star: 3, rarity: 0, roll: 0.8, props: [] },
                bag: []
            }
        };
        const out = R.migrateSave(v5);
        return {
            v: out.v,
            aBossSeen: !!(out.p.dex.enemies.a_boss && out.p.dex.enemies.a_boss.seen),
            aBossKills: out.p.dex.enemies.a_boss && out.p.dex.enemies.a_boss.kills,
            cBossSeen: !!(out.p.dex.enemies.c_boss && out.p.dex.enemies.c_boss.seen),
            w4: !!out.p.dex.items.weapon_4,
            a3: !!out.p.dex.items.armor_3
        };
    }''')
    check('v5 -> v6 migration populates dex enemies (seen=true, kills=0) and owned items',
          mig['v'] == 6 and mig['aBossSeen'] and mig['aBossKills'] == 0
          and not mig['cBossSeen'] and mig['w4'] and mig['a3'], mig)

    # 3. 図鑑モーダルUI・シルエット・「？？？」・ヒント・報酬制御・420pxレイアウト
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        document.querySelector('#modal').hidden = true; G.modalOpen = false;
        G.p = R.newPlayer(); G.p.lv = 30; G.p.ending = false;
        G.tutorial = { done: true };
        // Aの敵6体をすべて発見済みにする（本編クリア前なので報酬受け取り不可）
        const aGrp = R.dexEnemyGroups()[0];
        for (const e of aGrp.list) R.recordDexEnemy(G.p, e.id, true);
        R.renderAll();
    }''')
    pg.click('#nav-status')
    pg.click('[data-act="openDex"]')
    pg.wait_for_selector('.dex-grid')
    ui_en = pg.evaluate('''() => {
        const txt = document.querySelector('#m-sheet').innerText;
        const sils = document.querySelectorAll('.dex-sil').length;
        const ov = document.documentElement.scrollWidth - window.innerWidth;
        return { txt, sils, ov };
    }''')
    check('enemy dex shows 6/94, unseen silhouettes & ???, blocks reward before ending, 420px no overflow',
          '発見 6 / 94' in ui_en['txt'] and '？？？' in ui_en['txt']
          and '🔒 本編クリアで受け取り可能' in ui_en['txt']
          and ui_en['sils'] == 88 and ui_en['ov'] <= 0,
          {'sils': ui_en['sils'], 'ov': ui_en['ov']})

    # 装備タブ & ヒント表示 & 420px幅
    pg.click('[data-act="dexTab"][data-tab="items"]')
    pg.wait_for_selector('.dex-igrid')
    pg.click('.dex-icard[data-hkey="m9"]')
    ui_it = pg.evaluate('''() => {
        const txt = document.querySelector('#m-sheet').innerText;
        const hint = document.querySelector('#dex-hint-box').innerText;
        const ov = document.documentElement.scrollWidth - window.innerWidth;
        return { txt, hint, ov };
    }''')
    check('item dex shows 2/22, hint on tap without drop rate %, 420px no overflow',
          '入手 2 / 22' in ui_it['txt'] and '深淵ダンジョン' in ui_it['hint']
          and '%' not in ui_it['hint'] and ui_it['ov'] <= 0, ui_it)

    # 4. 本編クリア後の報酬受け取り（1回のみ・二重不可・深淵15枚・全コンプ100枚+称号）
    rew = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true);
        const pre = R.claimDexReward('grp_A');
        G.p.ending = true;
        const c0 = G.p.tower.coins;
        const r1 = R.claimDexReward('grp_A');
        const r2 = R.claimDexReward('grp_A');
        const c1 = G.p.tower.coins;

        // 全敵コンプ + 深淵
        const groups = R.dexEnemyGroups();
        for (const g of groups) for (const e of g.list) R.recordDexEnemy(G.p, e.id, true);
        const rAb = R.claimDexReward('grp_ABYSS');
        const rAllEn = R.claimDexReward('all_enemies');

        // 全装備コンプ
        for (const sl of ['weapon', 'armor']) {
            for (const st of R.DEX_STARS) G.p.dex.items[`${sl}_${st}`] = true;
            for (const st of R.DEX_MYTHICS) G.p.dex.items[`${sl}_m${st}`] = true;
        }
        const rAllIt = R.claimDexReward('all_items');
        return {
            preOk: pre.ok,
            r1Ok: r1.ok, r2Ok: r2.ok,
            cDiffA: c1 - c0,
            abCoins: rAb.coins,
            enCoins: rAllEn.coins, enTitle: rAllEn.title,
            itCoins: rAllIt.coins, itTitle: rAllIt.title,
            titles: G.p.tower.titles
        };
    }''')
    check('dex rewards enforce ending, grant once only (A=5, Abyss=15, allEn=100+図鑑博士, allIt=100+蒐集家)',
          not rew['preOk'] and rew['r1Ok'] and not rew['r2Ok'] and rew['cDiffA'] == 5
          and rew['abCoins'] == 15 and rew['enCoins'] == 100 and rew['enTitle'] == '図鑑博士'
          and rew['itCoins'] == 100 and rew['itTitle'] == '蒐集家'
          and 't_dex_en' in rew['titles'] and 't_dex_it' in rew['titles'], rew)

    check('no page errors', len(errors) == 0, errors)
    ctx.close()
    b.close()

print('\nRESULT:', 'OK' if FAILS == 0 else f'FAIL({FAILS})')
sys.exit(1 if FAILS else 0)
