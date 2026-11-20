# P4 自動テスト:
#   1. ダンジョンJ〜Oの解放ルール (I上級クリア→J、…、N上級クリア→O)
#   2. ドロップ上限 (J〜O通常★5、J〜Nボス★8まで、Oボス★9可)
#   3. 創世の欠片 (stone_genesis) ドロップ & ★8→★9強化 & 店売なし
#   4. 最終ボス怒り形態 (HP50%以下で o_boss_rage / 終焉神ニヒル・真 / ATK×1.35)
#   5. 「ゲームクリア」モーダル (O極級初回クリアで1回だけ、2回目・既クリアセーブでは非表示)
#   6. 神話レア (直接生成で装備/売却/自動売却/戦力値動作、ドロップ表には出ない)
#   7. ★9オーラ (.aura-9) & LV_CAP=140 (Lv120以上セーブ読込・Lv99超えレベルアップ)
#   8. 敵ID重複なし (全90体＋o_boss_rage = 91) & J〜Oドット絵フォールバック描画
# 使い方: python3 tools/test_p4.py [HTMLのパス(省略時はindex.html)]
from playwright.sync_api import sync_playwright
import os, sys

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

    # 1. ダンジョンJ〜O解放ルール
    unlock_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer();
        const dObj = id => R.DUNGEONS.find(x => x.id === id);
        const initLocked = ['J','K','L','M','N','O'].every(id => !R.isDungeonUnlocked(G.p, dObj(id)));
        R.startRun('J', 'novice');
        const blockedJ = !G.run;
        const seq = [['I','J'],['J','K'],['K','L'],['L','M'],['M','N'],['N','O']];
        let chainOk = true;
        for (const [prev, cur] of seq) {
            if (R.isDungeonUnlocked(G.p, dObj(cur))) chainOk = false;
            G.p.cleared[prev] = { high: true };
            if (!R.isDungeonUnlocked(G.p, dObj(cur))) chainOk = false;
        }
        R.startRun('O', 'novice');
        const canO = !!G.run && G.run.d && G.run.d.id === 'O';
        G.run = null;
        return { initLocked, blockedJ, chainOk, canO };
    }''')
    check('J-O initially locked & startRun blocked',
          unlock_res['initLocked'] and unlock_res['blockedJ'], unlock_res)
    check('I->J->K->L->M->N->O high clear unlock chain works',
          unlock_res['chainOk'] and unlock_res['canO'], unlock_res)

    # 2. ドロップ上限 (J〜O通常★5、J〜Nボス★8まで、Oボス★9可)
    drop_res = pg.evaluate('''() => {
        const R = window.__rogue;
        let _s = 12345;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        const maxStarOf = (did) => {
            const dun = R.DUNGEONS.find(d => d.id === did);
            const diff = R.DIFFS[4];
            let mx = 0, maxRar = 0;
            for (let i = 0; i < 3000; i++) {
                const it = R.genItem(diff, false, 'weapon', dun.maxStar);
                if (it.star > mx) mx = it.star;
                if (it.rarity > maxRar) maxRar = it.rarity;
            }
            return { mx, maxRar };
        };
        const bossStars = (did) => {
            G.p = R.newPlayer();
            G.tutorial = { done: true };
            G.p.lv = 126; G.p.hp = G.p.mhp = 9999; G.p.mp = G.p.mmp = 999;
            G.p.bagCap = 120;
            const dun = R.DUNGEONS.find(d => d.id === did);
            const diff = R.DIFFS[4];
            let stars = [], maxRar = 0;
            for (let i = 0; i < 300; i++) {
                G.p.bag = [];
                G.run = { d: dun, df: diff, floors: diff.floors, floor: diff.floors, kills: 0, gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 }, enemy: { name: 'Boss', hp: 0, maxHp: 100, atk: 10, def: 1, exp: 10, gold: 10, boss: true } };
                R.onKill();
                for (const it of G.run.items) { stars.push(it.star); if (it.rarity > maxRar) maxRar = it.rarity; }
            }
            G.run = null;
            return { max: Math.max(0, ...stars), has8: stars.includes(8), has9: stars.includes(9), maxRar };
        };
        return {
            mobJ: maxStarOf('J'), mobN: maxStarOf('N'), mobO: maxStarOf('O'),
            bossJ: bossStars('J'), bossN: bossStars('N'), bossO: bossStars('O')
        };
    }''')
    check('J-O normal drops capped at star 5 & rarity <= 3',
          drop_res['mobJ']['mx'] <= 5 and drop_res['mobN']['mx'] <= 5 and drop_res['mobO']['mx'] <= 5
          and drop_res['mobO']['maxRar'] <= 3, drop_res)
    check('J-N bosses never drop star >= 9 (up to star 8)',
          drop_res['bossJ']['max'] <= 8 and not drop_res['bossJ']['has9']
          and drop_res['bossN']['max'] <= 8 and not drop_res['bossN']['has9'], drop_res)
    check('O boss drops star 9 (<= 9) and never mythic rarity',
          drop_res['bossO']['has9'] and drop_res['bossO']['max'] == 9 and drop_res['bossO']['maxRar'] <= 3, drop_res['bossO'])

    # 3. 創世の欠片 (stone_genesis) & ★9強化 & 店売なし
    gen_res = pg.evaluate('''() => {
        const R = window.__rogue;
        let _s = 99;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        G.p = R.newPlayer();
        G.tutorial = { done: true };
        G.p.lv = 126; G.p.gold = 500000;
        G.p.stones.stone_genesis = 0;
        const dun = R.DUNGEONS.find(d => d.id === 'O');
        const diff = R.DIFFS[2];
        G.run = { d: dun, df: diff, floors: diff.floors, floor: diff.floors, kills: 0, gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 } };
        for (let i = 0; i < 30; i++) {
            G.run.enemy = { name: 'Boss', hp: 0, maxHp: 100, atk: 10, def: 1, exp: 10, gold: 10, boss: true };
            R.onKill();
        }
        G.run = null;
        const droppedGenesis = G.p.stones.stone_genesis > 0;
        const w8 = R.genItem(R.DIFFS[4], false, 'weapon', 8, 8);
        G.p.weapon = w8;
        G.p.stones.stone_genesis = 5;
        R.smithUpgrade(w8.id);
        const starAfter = w8.star;
        const name9 = R.itemName(w8);
        R.smithUpgrade(w8.id);
        const starAfter2 = w8.star;
        const shopHasGen = R.SHOP_ITEMS.some(s => s.id === 'stone_genesis' || (s.desc && s.desc.includes('創世の欠片')));
        return { droppedGenesis, starAfter, name9, upAgain: starAfter2 > 9, shopHasGen };
    }''')
    check('stone_genesis drops from O bosses', gen_res['droppedGenesis'], gen_res)
    check('★8 upgrades to ★9 (創世の剣) with stone_genesis and stops at ★9',
          gen_res['starAfter'] == 9 and '創世の剣' in gen_res['name9'] and not gen_res['upAgain'], gen_res)
    check('stone_genesis is not sold in shop', not gen_res['shopHasGen'], gen_res)

    # 4. 最終ボス怒り形態 (HP50%以下で o_boss_rage / ATK×1.35)
    rage_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer();
        G.p.lv = 130; G.p.hp = G.p.mhp = 99999; G.p.mp = G.p.mmp = 9999;
        G.p.cleared.N = { high: true };
        G.p.cleared.O = { high: true, super: true };
        R.startRun('O', 'extreme');
        G.run.floor = G.run.floors;
        R.spawnEnemy(true, false);
        const en = G.run.enemy;
        const initId = en.id;
        const initAtk = en.atk;
        // HPを50%以下まで減らす（ただし0にしない）
        en.hp = Math.floor(en.maxHp * 0.45);
        // playerActで倒さないよう攻撃力を極小にして1ラウンド実行
        G.p.weapon = null;
        R.battleRound();
        const afterId = G.run.enemy.id;
        const afterName = G.run.enemy.name;
        const afterAtk = G.run.enemy.atk;
        const raged = !!G.run.enemy.raged;
        G.run = null;
        return { initId, initAtk, afterId, afterName, afterAtk, raged };
    }''')
    check('final boss switches to o_boss_rage (ATK x1.35) at <=50% HP',
          rage_res['initId'] == 'o_boss' and rage_res['afterId'] == 'o_boss_rage'
          and '終焉神ニヒル・真' in rage_res['afterName']
          and rage_res['afterAtk'] == round(rage_res['initAtk'] * 1.35) and rage_res['raged'], rage_res)

    # 5. 「ゲームクリア」モーダル (O極級初回クリアで1回だけ、2回目・既クリアセーブでは非表示)
    end_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        G.p = R.newPlayer();
        G.p.lv = 126; G.p.hp = G.p.mhp = 9999; G.p.mp = G.p.mmp = 999;
        G.p.cleared.N = { high: true };
        G.p.cleared.O = { high: true, super: true };
        R.startRun('O', 'extreme');
        G.run.floor = G.run.floors;
        R.finishRun('clear');
        const firstEnding = !!(G.last && G.last.ending);
        const firstTitle = document.querySelector('#m-title')?.textContent || '';
        const hasBtn = (document.querySelector('#m-retry')?.textContent || '').includes('続ける');
        // 2回目 O極級クリア
        R.ACTS.mTown();
        R.startRun('O', 'extreme');
        R.finishRun('clear');
        const secondEnding = !!(G.last && G.last.ending);
        const secondTitle = document.querySelector('#m-title')?.textContent || '';
        // 既に cleared.O.extreme を持つセーブ
        R.ACTS.mTown();
        const saveKey = R.SAVE_KEY || 'rogue_test_save_v1';
        const existing = { v: 3, p: Object.assign(R.newPlayer(), { lv: 126, cleared: { O: { extreme: true } } }) };
        localStorage.setItem(saveKey, JSON.stringify(existing));
        R.load();
        const loadedEnding = !!G.p.ending;
        return { firstEnding, firstTitle, hasBtn, secondEnding, secondTitle, loadedEnding };
    }''')
    check('Game Clear modal appears once on first O-extreme clear',
          end_res['firstEnding'] and 'ゲームクリア' in end_res['firstTitle'] and end_res['hasBtn'], end_res)
    check('Game Clear modal does not appear on second O-extreme clear or already-cleared save',
          not end_res['secondEnding'] and 'ゲームクリア' not in end_res['secondTitle'] and end_res['loadedEnding'], end_res)

    # 6. 神話レア (直接生成で装備/売却/自動売却/戦力値動作)
    mythic_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p = R.newPlayer();
        G.p.lv = 126;
        const mItem = { id: 9999, slot: 'weapon', star: 9, rarity: 4, roll: 1.0, prop: null, locked: false };
        const pw = R.gearPower(mItem);
        const sc = R.gearScore(mItem);
        const nm = R.itemName(mItem);
        const sv = R.sellValue(mItem);
        // 装備
        G.autoSellRarity = 3; // レジェンドまで自動売却設定でも神話(4)は売却されない
        G.p.bag = [];
        const out = R.receiveItem(mItem);
        const equipped = G.p.weapon && G.p.weapon.rarity === 4;
        // バッグに入れて売却テスト
        G.p.weapon = null;
        G.p.bag = [mItem];
        const goldBefore = G.p.gold;
        G.shopSel[4] = true;
        R.ACTS.sell();
        G.shopSel[4] = false;
        const soldOk = G.p.gold === goldBefore + sv && G.p.bag.length === 0;
        return { pw, sc, nm, sv, out, equipped, soldOk };
    }''')
    check('Mythic rarity works for gearPower, gearScore, itemName, equip, autoSell guard, and sell',
          mythic_res['pw'] == 280 * 6 and mythic_res['sc'] == 280 * 6
          and '神話の' in mythic_res['nm'] and mythic_res['equipped'] and mythic_res['soldOk'], mythic_res)

    # 7. ★9オーラ (.aura-9) & LV_CAP=140
    cap_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        G.p = R.newPlayer();
        G.p.weapon = R.genItem(R.DIFFS[4], false, 'weapon', 9, 9);
        G.p.armor = R.genItem(R.DIFFS[4], false, 'armor', 1, 1);
        G.view = 'status';
        R.ACTS.changeSkin({ id: 'ruby' });
        const hasAura9 = !!document.querySelector('.aura-9');
        // LV_CAP=140 セーブ読込・レベルアップ
        const saveKey = R.SAVE_KEY || 'rogue_test_save_v1';
        const hiSave = { v: 3, p: Object.assign(R.newPlayer(), { lv: 125, exp: 0 }) };
        localStorage.setItem(saveKey, JSON.stringify(hiSave));
        R.load();
        const loadedLv125 = G.p.lv === 125;
        G.run = { sp: 0 };
        R.gainExp(10000000);
        G.run = null;
        const leveledPast125 = G.p.lv > 125 && G.p.lv <= 140;
        return { lvCap: R.LV_CAP, hasAura9, loadedLv125, leveledPast125, endLv: G.p.lv };
    }''')
    check('★9 aura .aura-9 applied', cap_res['hasAura9'], cap_res)
    check('LV_CAP is 140 and lv>=99 save loads & levels up cleanly',
          cap_res['lvCap'] == 140 and cap_res['loadedLv125'] and cap_res['leveledPast125'], cap_res)

    # 8. 敵ID重複なし (全90体＋o_boss_rage = 91) & J〜Oドット絵フォールバック描画
    sprite_res = pg.evaluate('''() => {
        const R = window.__rogue;
        const ids = [];
        for (const d of R.DUNGEONS) {
            for (const m of d.mobs) ids.push(m.id);
            if (d.boss) {
                ids.push(d.boss.id);
                if (d.boss.rageId) ids.push(d.boss.rageId);
            }
        }
        const unique = new Set(ids).size === ids.length;
        R.setHeadless(false); R.noTimer(true);
        G.p = R.newPlayer();
        G.p.lv = 100; G.p.hp = G.p.mhp = 9999;
        G.p.cleared.I = { high: true };
        R.startRun('J', 'novice');
        for (let i = 0; i < 10 && G.run && !G.run.enemy; i++) R.tick();
        const svgCount = document.querySelectorAll('svg').length;
        G.run = null;
        return { unique, totalIds: ids.length, svgCount };
    }''')
    check('all 91 enemy IDs (90 + o_boss_rage) across A-O are unique',
          sprite_res['unique'] and sprite_res['totalIds'] == 91, sprite_res)
    check('J-O enemy renders pixel SVG fallback without image', sprite_res['svgCount'] > 0, sprite_res)
    check('no page errors', errs == [], errs)
    b.close()

print('\nRESULT:', 'OK' if not fails else 'FAILED (%d): %s' % (len(fails), fails))
sys.exit(1 if fails else 0)
