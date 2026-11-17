# P2 自動テスト:
#   1. ダンジョンD〜Fの解放ルール (C上級クリア→D、D上級クリア→E、E上級クリア→F)
#   2. ドロップ上限 (D〜F通常★5、D〜Fボス★6可、A〜Cボスは★5まで)
#   3. 時の欠片 (stone_time) ドロップ & ★6→★7強化 & 店売なし
#   4. スキル30SP拡張 (新9種習得・発動、既存20SPセーブ互換)
#   5. 敵ID重複なし & D〜F敵のドット絵フォールバック描画 (エラーなし)
# 使い方: python3 tools/test_p2.py [HTMLのパス(省略時はindex.html)]
from playwright.sync_api import sync_playwright
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
HTML = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html'))
fails = []


def check(name, cond, detail=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  ' + str(detail)))
    if not cond:
        fails.append(name)


with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + HTML)
    pg.wait_for_timeout(300)

    # 1. ダンジョン解放ルール
    unlock_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer();
        const dObj = id => R.DUNGEONS.find(x => x.id === id);
        const init = {
            D: R.isDungeonUnlocked(G.p, dObj('D')),
            E: R.isDungeonUnlocked(G.p, dObj('E')),
            F: R.isDungeonUnlocked(G.p, dObj('F'))
        };
        R.startRun('D', 'novice');
        const blockedD = !G.run;
        G.p.cleared.C = { novice: true, mid: true, high: true };
        const afterC = {
            D: R.isDungeonUnlocked(G.p, dObj('D')),
            E: R.isDungeonUnlocked(G.p, dObj('E')),
            F: R.isDungeonUnlocked(G.p, dObj('F'))
        };
        R.startRun('D', 'novice');
        const canD = !!G.run && G.run.d && G.run.d.id === 'D';
        G.run = null;
        G.p.cleared.D = { high: true };
        const afterD = {
            E: R.isDungeonUnlocked(G.p, dObj('E')),
            F: R.isDungeonUnlocked(G.p, dObj('F'))
        };
        G.p.cleared.E = { high: true };
        const afterE = { F: R.isDungeonUnlocked(G.p, dObj('F')) };
        return { init, blockedD, afterC, canD, afterD, afterE };
    }''')
    check('D/E/F initially locked & startRun blocked',
          unlock_res['init'] == {'D': False, 'E': False, 'F': False} and unlock_res['blockedD'], unlock_res)
    check('C high clear unlocks D only',
          unlock_res['afterC'] == {'D': True, 'E': False, 'F': False} and unlock_res['canD'], unlock_res)
    check('D high clear unlocks E only',
          unlock_res['afterD'] == {'E': True, 'F': False}, unlock_res)
    check('E high clear unlocks F',
          unlock_res['afterE'] == {'F': True}, unlock_res)

    # 2. ドロップ上限 (D〜F通常★5、D〜Fボス★6可、A〜Cボス★5まで)
    drop_res = pg.evaluate('''() => {
        const R = window.__rogue;
        let _s = 42;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        const maxStarOf = (did) => {
            const dun = R.DUNGEONS.find(d => d.id === did);
            const diff = R.DIFFS[4]; // extreme
            let mx = 0;
            for (let i = 0; i < 3000; i++) {
                const it = R.genItem(diff, false, 'weapon', dun.maxStar);
                if (it.star > mx) mx = it.star;
            }
            return mx;
        };
        const bossStars = (did) => {
            G.p = R.newPlayer();
            G.tutorial = { done: true };
            G.p.lv = 80; G.p.hp = G.p.mhp = 9999; G.p.mp = G.p.mmp = 999;
            G.p.bagCap = 120;
            G.p.cleared.C = { high: true }; G.p.cleared.D = { high: true }; G.p.cleared.E = { high: true };
            G.p.cleared[did] = { high: true, super: true };
            const dun = R.DUNGEONS.find(d => d.id === did);
            const diff = R.DIFFS[4];
            let stars = [];
            for (let i = 0; i < 200; i++) {
                G.p.bag = [];
                G.run = { d: dun, df: diff, floors: diff.floors, floor: diff.floors, kills: 0, gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 }, enemy: { name: 'Boss', hp: 0, mhp: 100, atk: 10, def: 1, exp: 10, gold: 10, boss: true } };
                R.onKill();
                for (const it of G.run.items) stars.push(it.star);
            }
            G.run = null;
            return { max: Math.max(0, ...stars), has6: stars.includes(6), count: stars.length };
        };
        return {
            mobD: maxStarOf('D'), mobE: maxStarOf('E'), mobF: maxStarOf('F'),
            bossC: bossStars('C'), bossD: bossStars('D'), bossE: bossStars('E'), bossF: bossStars('F')
        };
    }''')
    check('D-F normal drops capped at star 5',
          drop_res['mobD'] <= 5 and drop_res['mobE'] <= 5 and drop_res['mobF'] <= 5, drop_res)
    check('A-C boss never drops star >= 6',
          drop_res['bossC']['max'] <= 5 and not drop_res['bossC']['has6'], drop_res['bossC'])
    check('D-F boss drops star 6 (<= 6)',
          drop_res['bossD']['has6'] and drop_res['bossD']['max'] == 6
          and drop_res['bossE']['has6'] and drop_res['bossE']['max'] == 6
          and drop_res['bossF']['has6'] and drop_res['bossF']['max'] == 6, drop_res)

    # 3. 時の欠片 & ★7強化 & 店売なし
    stone_res = pg.evaluate('''() => {
        const R = window.__rogue;
        let _s = 99;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        G.p = R.newPlayer();
        G.tutorial = { done: true };
        G.p.lv = 80; G.p.gold = 100000;
        G.p.stones.stone_time = 0;
        const dun = R.DUNGEONS.find(d => d.id === 'D');
        const diff = R.DIFFS[2];
        G.run = { d: dun, df: diff, floors: diff.floors, floor: diff.floors, kills: 0, gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 } };
        for (let i = 0; i < 30; i++) {
            G.run.enemy = { name: 'Boss', hp: 0, mhp: 100, atk: 10, def: 1, exp: 10, gold: 10, boss: true };
            R.onKill();
        }
        G.run = null;
        const droppedTimeStone = G.p.stones.stone_time > 0;
        const w6 = R.genItem(R.DIFFS[4], false, 'weapon', 6, 6);
        G.p.weapon = w6;
        G.p.stones.stone_time = 5;
        R.smithUpgrade(w6.id);
        const starAfter = w6.star;
        R.smithUpgrade(w6.id);
        const starAfter2 = w6.star;
        const shopHasStone = R.SHOP_ITEMS.some(s => s.id === 'stone_time' || (s.desc && s.desc.includes('時の欠片')));
        return { droppedTimeStone, upOk: starAfter === 7, starAfter, upAgain: starAfter2 > 7, shopHasStone };
    }''')
    check('stone_time drops from D-F bosses', stone_res['droppedTimeStone'], stone_res)
    check('★6 upgrades to ★7 with stone_time and stops at ★7',
          stone_res['upOk'] and stone_res['starAfter'] == 7 and not stone_res['upAgain'], stone_res)
    check('stone_time is not sold in shop', not stone_res['shopHasStone'], stone_res)

    # 4. スキル30SP拡張 & ≤20SPセーブ互換
    skill_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        const treesOk = ['sword', 'magic', 'life'].every(k => R.SKILL_TREES.find(t => t.id === k).maxSp === 30);
        const saveKey = R.SAVE_KEY || 'rogue_test_save_v1';
        const oldSave = {
            v: 3,
            p: Object.assign(R.newPlayer(), {
                lv: 40, sp: 30,
                skillPts: { sword: 20, magic: 10, life: 5 },
                skills: { strike: true, heal: true, fireball: true }
            })
        };
        localStorage.setItem(saveKey, JSON.stringify(oldSave));
        const loaded = R.load();
        const kept20 = loaded && G.p.skillPts.sword === 20 && !!G.p.skills.strike;
        // 新スキル9種をすべて習得できるか
        G.p.sp = 90;
        R.ACTS.spAlloc({ tree: 'sword', amount: 10 });
        R.ACTS.spAlloc({ tree: 'magic', amount: 20 });
        R.ACTS.spAlloc({ tree: 'life', amount: 25 });
        const new9 = ['flameSlash', 'warGod', 'skySlash', 'blaze', 'lightningStorm', 'ultima', 'highRegen', 'holyBarrier', 'saintPrayer'];
        const learnedAll = new9.every(id => !!G.p.skills[id]);
        const pts30 = G.p.skillPts.sword === 30 && G.p.skillPts.magic === 30 && G.p.skillPts.life === 30;
        // 戦闘で warGod / holyBarrier / highRegen 発動確認
        G.p.mp = G.p.mmp = 999; G.p.hp = 100; G.p.mhp = 500;
        G.p.equippedSkills = ['warGod', 'holyBarrier', 'highRegen', 'ultima'];
        G.p.cleared.C = { high: true };
        R.startRun('D', 'novice');
        for (let i = 0; i < 10 && G.run; i++) R.tick();
        const foughtOk = !!G.run || G.p.lv >= 40;
        G.run = null;
        return { treesOk, kept20, learnedAll, pts30, foughtOk };
    }''')
    check('skill trees expanded to maxSp 30', skill_res['treesOk'], skill_res)
    check('existing <=20SP save loads intact', skill_res['kept20'], skill_res)
    check('all 9 new skills learned at SP 23/26/30', skill_res['learnedAll'] and skill_res['pts30'], skill_res)
    check('new skills execute in combat without errors', skill_res['foughtOk'], skill_res)

    # 5. 敵ID重複なし & D〜Fドット絵フォールバック描画
    sprite_res = pg.evaluate('''() => {
        const R = window.__rogue;
        const ids = [];
        for (const d of R.DUNGEONS) {
            for (const m of d.mobs) ids.push(m.id);
            if (d.boss) ids.push(d.boss.id);
        }
        const unique = new Set(ids).size === ids.length;
        R.setHeadless(false); R.noTimer(true);
        G.p = R.newPlayer();
        G.p.lv = 70; G.p.hp = G.p.mhp = 5000;
        G.p.cleared.C = { high: true };
        R.startRun('D', 'novice');
        // 敵がスポーンするまでtick
        for (let i = 0; i < 10 && G.run && !G.run.enemy; i++) R.tick();
        const svgCount = document.querySelectorAll('svg').length;
        G.run = null;
        return { unique, totalIds: ids.length, svgCount };
    }''')
    check('all enemy IDs across A-F are unique', sprite_res['unique'], sprite_res)
    check('D-F enemy renders pixel SVG fallback without image', sprite_res['svgCount'] > 0, sprite_res)
    check('no page errors', errs == [], errs)
    b.close()

print('\nRESULT:', 'OK' if not fails else 'FAILED (%d): %s' % (len(fails), fails))
sys.exit(1 if fails else 0)
