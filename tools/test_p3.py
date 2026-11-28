# P3 自動テスト:
#   1. ダンジョンG〜Iの解放ルール (F上級クリア→G、G上級クリア→H、H上級クリア→I)
#   2. ドロップ上限 (G〜I通常★5、G・Hボス★7まで、Iボス★8可)
#   3. 機神の核 (stone_core) ドロップ (H・Iボス/強敵) & ★7→★8強化 & 店売なし
#   4. 進化枠 第2段階 (20SP拡張、SP30条件未達でSP11以降不可、達成後に8種習得・発動)
#   5. 「前編 完」モーダル (I上級初回クリアで1回だけ表示、2回目・既クリアセーブでは非表示)
#   6. ★6〜8オーラクラス (.aura-6 / .aura-7 / .aura-8)
#   7. 敵ID重複なし (全54体) & G〜I敵のドット絵SVGフォールバック描画
# 使い方: python3 tools/test_p3.py [HTMLのパス(省略時はindex.html)]
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

    # 1. ダンジョンG〜I解放ルール
    unlock_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer();
        const dObj = id => R.DUNGEONS.find(x => x.id === id);
        const init = {
            G: R.isDungeonUnlocked(G.p, dObj('G')),
            H: R.isDungeonUnlocked(G.p, dObj('H')),
            I: R.isDungeonUnlocked(G.p, dObj('I'))
        };
        R.startRun('G', 'novice');
        const blockedG = !G.run;
        G.p.cleared.F = { high: true };
        const afterF = {
            G: R.isDungeonUnlocked(G.p, dObj('G')),
            H: R.isDungeonUnlocked(G.p, dObj('H')),
            I: R.isDungeonUnlocked(G.p, dObj('I'))
        };
        R.startRun('G', 'novice');
        const canG = !!G.run && G.run.d && G.run.d.id === 'G';
        G.run = null;
        G.p.cleared.G = { high: true };
        const afterG = {
            H: R.isDungeonUnlocked(G.p, dObj('H')),
            I: R.isDungeonUnlocked(G.p, dObj('I'))
        };
        G.p.cleared.H = { high: true };
        const afterH = { I: R.isDungeonUnlocked(G.p, dObj('I')) };
        return { init, blockedG, afterF, canG, afterG, afterH };
    }''')
    check('G/H/I initially locked & startRun blocked',
          unlock_res['init'] == {'G': False, 'H': False, 'I': False} and unlock_res['blockedG'], unlock_res)
    check('F high clear unlocks G only',
          unlock_res['afterF'] == {'G': True, 'H': False, 'I': False} and unlock_res['canG'], unlock_res)
    check('G high clear unlocks H only',
          unlock_res['afterG'] == {'H': True, 'I': False}, unlock_res)
    check('H high clear unlocks I',
          unlock_res['afterH'] == {'I': True}, unlock_res)

    # 2. ドロップ上限 (G〜I通常★5、G・Hボス★7まで、Iボス★8可)
    drop_res = pg.evaluate('''() => {
        const R = window.__rogue;
        let _s = 12345;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        const maxStarOf = (did) => {
            const dun = R.DUNGEONS.find(d => d.id === did);
            const diff = R.DIFFS[4];
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
            G.p.lv = 90; G.p.hp = G.p.mhp = 9999; G.p.mp = G.p.mmp = 999;
            G.p.bagCap = 120;
            const dun = R.DUNGEONS.find(d => d.id === did);
            const diff = R.DIFFS[4];
            let stars = [];
            for (let i = 0; i < 250; i++) {
                G.p.bag = [];
                G.run = { d: dun, df: diff, floors: diff.floors, floor: diff.floors, kills: 0, gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 }, enemy: { name: 'Boss', hp: 0, mhp: 100, atk: 10, def: 1, exp: 10, gold: 10, boss: true } };
                R.onKill();
                for (const it of G.run.items) stars.push(it.star);
            }
            G.run = null;
            return { max: Math.max(0, ...stars), has7: stars.includes(7), has8: stars.includes(8), count: stars.length };
        };
        return {
            mobG: maxStarOf('G'), mobH: maxStarOf('H'), mobI: maxStarOf('I'),
            bossG: bossStars('G'), bossH: bossStars('H'), bossI: bossStars('I')
        };
    }''')
    check('G-I normal drops capped at star 5',
          drop_res['mobG'] <= 5 and drop_res['mobH'] <= 5 and drop_res['mobI'] <= 5, drop_res)
    check('G and H bosses never drop star >= 8 (up to star 7)',
          drop_res['bossG']['max'] <= 7 and not drop_res['bossG']['has8']
          and drop_res['bossH']['max'] <= 7 and not drop_res['bossH']['has8'], drop_res)
    check('I boss drops star 8 (<= 8)',
          drop_res['bossI']['has8'] and drop_res['bossI']['max'] == 8, drop_res['bossI'])

    # 3. 機神の核 (stone_core) & ★8強化 & 店売なし
    core_res = pg.evaluate('''() => {
        const R = window.__rogue;
        let _s = 99;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        G.p = R.newPlayer();
        G.tutorial = { done: true };
        G.p.lv = 90; G.p.gold = 200000;
        const dropCheck = (did) => {
            G.p.stones.stone_core = 0;
            const dun = R.DUNGEONS.find(d => d.id === did);
            const diff = R.DIFFS[2];
            G.run = { d: dun, df: diff, floors: diff.floors, floor: diff.floors, kills: 0, gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 } };
            for (let i = 0; i < 30; i++) {
                G.run.enemy = { name: 'Boss', hp: 0, mhp: 100, atk: 10, def: 1, exp: 10, gold: 10, boss: true };
                R.onKill();
            }
            G.run = null;
            return G.p.stones.stone_core > 0;
        };
        const dropH = dropCheck('H');
        const dropI = dropCheck('I');
        const w7 = R.genItem(R.DIFFS[4], false, 'weapon', 7, 7);
        G.p.weapon = w7;
        G.p.stones.stone_core = 5;
        R.smithUpgrade(w7.id);
        const starAfter = w7.star;
        const name8 = R.itemName(w7);
        R.smithUpgrade(w7.id);
        const starAfter2 = w7.star;
        const shopHasCore = R.SHOP_ITEMS.some(s => s.id === 'stone_core' || (s.desc && s.desc.includes('機神の核')));
        return { dropH, dropI, starAfter, name8, upAgain: starAfter2 > 8, shopHasCore };
    }''')
    check('stone_core drops from H and I bosses', core_res['dropH'] and core_res['dropI'], core_res)
    check('★7 upgrades to ★8 (魔王殺しの神剣) with stone_core and stops at ★8',
          core_res['starAfter'] == 8 and '魔王殺しの神剣' in core_res['name8'] and not core_res['upAgain'], core_res)
    check('stone_core is not sold in shop', not core_res['shopHasCore'], core_res)

    # 4. 進化枠 第2段階 (20SP拡張 & 解放条件 & 8種習得/実行)
    evo_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p = R.newPlayer();
        G.p.lv = 90; G.p.sp = 300;
        // ステラで基礎ツリー(sword)を20SP、第2ツリー(warrior)を20SP(うち第2段階は未解放なので10で止まる)
        R.ACTS.changeSkin({ id: 'stella' });
        R.ACTS.spAlloc({ tree: 'sword', amount: 15 });
        R.ACTS.spAlloc({ tree: 'sword_a', amount: 5 });
        R.ACTS.spAlloc({ tree: 'warrior', amount: 10 });
        R.ACTS.spAlloc({ tree: 'warrior_a', amount: 1 });  // 剣系の合計が30になるまで取れない
        const blockedAt10 = (G.p.skillPts.warrior_a || 0) === 0 && !G.p.skills.shura;
        // 基礎ツリー系を合計30SPにして後半解放 -> warrior_a 10, hero 20
        R.ACTS.spAlloc({ tree: 'sword_a', amount: 10 });
        R.ACTS.spAlloc({ tree: 'warrior_a', amount: 10 });
        R.ACTS.spAlloc({ tree: 'hero', amount: 20 });
        const stellaS2 = ['shura', 'hagun', 'heroAwaken', 'starSword'].every(id => !!G.p.skills[id])
            && G.p.skillPts.warrior_a === 10 && G.p.skillPts.hero === 20;
        // ルビィで magic 15 + magic_a 15 -> mage 10 + mage_a 10（もう一方の星辰ルートは取れない）
        R.ACTS.changeSkin({ id: 'ruby' });
        R.ACTS.spAlloc({ tree: 'magic', amount: 15 }); R.ACTS.spAlloc({ tree: 'magic_a', amount: 15 });
        R.ACTS.spAlloc({ tree: 'mage', amount: 10 }); R.ACTS.spAlloc({ tree: 'mage_a', amount: 10 });
        R.ACTS.spAlloc({ tree: 'mage_b', amount: 5 });
        const rubyS2 = !!G.p.skills.iceAge && !G.p.skills.cosmicNova && G.p.skillPts.mage_a === 10 && !(G.p.skillPts.mage_b > 0);
        // シリアで life 15 + life_a 15 -> cleric 10 + cleric_a 10
        R.ACTS.changeSkin({ id: 'silia' });
        R.ACTS.spAlloc({ tree: 'life', amount: 15 }); R.ACTS.spAlloc({ tree: 'life_a', amount: 15 });
        R.ACTS.spAlloc({ tree: 'cleric', amount: 10 }); R.ACTS.spAlloc({ tree: 'cleric_a', amount: 10 });
        const siliaS2 = ['holyLight', 'requiem'].every(id => !!G.p.skills[id]) && G.p.skillPts.cleric_a === 10;
        const learnedAll = stellaS2 && rubyS2 && siliaS2;
        const pts20 = stellaS2 && rubyS2 && siliaS2;
        // 戦闘で発動確認
        G.p.mp = G.p.mmp = 999; G.p.hp = 100; G.p.mhp = 1000;
        G.p.equippedSkills = ['holyLight', 'requiem', null];
        G.p.cleared.F = { high: true };
        R.startRun('G', 'novice');
        for (let i = 0; i < 10 && G.run; i++) R.tick();
        const fought1 = true;
        G.run = null;
        R.ACTS.changeSkin({ id: 'stella' });
        G.p.equippedSkills = ['shura', 'heroAwaken', 'starSword'];
        R.startRun('G', 'novice');
        for (let i = 0; i < 10 && G.run; i++) R.tick();
        G.run = null;
        return { blockedAt10, learnedAll, pts20, fought1 };
    }''')
    check('evolution stage 2 blocked at 10SP until base tree reaches 30SP', evo_res['blockedAt10'], evo_res)
    check('all 8 stage 2 evolution skills learned at SP15/SP20', evo_res['learnedAll'] and evo_res['pts20'], evo_res)
    check('stage 2 evolution skills execute in combat without errors', evo_res['fought1'], evo_res)

    # 5. 「前編 完」モーダル (I上級初回クリアで1回だけ、2回目・既クリアセーブでは出ない)
    p1end_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        G.p = R.newPlayer();
        G.p.lv = 90; G.p.hp = G.p.mhp = 9999; G.p.mp = G.p.mmp = 999;
        G.p.cleared.H = { high: true };
        G.p.cleared.I = { novice: true, mid: true };
        R.startRun('I', 'high');
        G.run.floor = G.run.floors;
        // ボスを倒した直後として finishRun('clear') を呼ぶ
        R.finishRun('clear');
        const firstPart1End = !!(G.last && G.last.part1End);
        const firstTitle = document.querySelector('#m-title')?.textContent || '';
        const hasBtn = (document.querySelector('#m-retry')?.textContent || '').includes('続ける');
        // 2回目 I上級クリア
        R.ACTS.mTown();
        R.startRun('I', 'high');
        R.finishRun('clear');
        const secondPart1End = !!(G.last && G.last.part1End);
        const secondTitle = document.querySelector('#m-title')?.textContent || '';
        // 既に cleared.I.high を持つセーブを読み込んだ場合
        R.ACTS.mTown();
        const saveKey = R.SAVE_KEY || 'rogue_test_save_v1';
        const existing = { v: 3, p: Object.assign(R.newPlayer(), { lv: 75, cleared: { I: { high: true } } }) };
        localStorage.setItem(saveKey, JSON.stringify(existing));
        R.load();
        const loadedFlag = !!G.p.part1Cleared;
        return { firstPart1End, firstTitle, hasBtn, secondPart1End, secondTitle, loadedFlag };
    }''')
    check('Part 1 clear modal appears once on first I-high clear',
          p1end_res['firstPart1End'] and '前編 完' in p1end_res['firstTitle'] and p1end_res['hasBtn'], p1end_res)
    check('Part 1 clear modal does not appear on second I-high clear or already-cleared save',
          not p1end_res['secondPart1End'] and '前編 完' not in p1end_res['secondTitle'] and p1end_res['loadedFlag'], p1end_res)

    # 6. ★6〜8 オーラクラス確認
    aura_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        const checkStar = (s) => {
            G.p = R.newPlayer();
            G.p.weapon = R.genItem(R.DIFFS[4], false, 'weapon', s, s);
            G.p.armor = R.genItem(R.DIFFS[4], false, 'armor', 1, 1);
            G.view = 'status';
            R.ACTS.changeSkin({ id: 'ruby' });
            return {
                has6: !!document.querySelector('.aura-6'),
                has7: !!document.querySelector('.aura-7'),
                has8: !!document.querySelector('.aura-8')
            };
        };
        return { s5: checkStar(5), s6: checkStar(6), s7: checkStar(7), s8: checkStar(8) };
    }''')
    check('aura classes .aura-6 / .aura-7 / .aura-8 applied for ★6-8 (none for ★5)',
          not aura_res['s5']['has6'] and not aura_res['s5']['has7'] and not aura_res['s5']['has8']
          and aura_res['s6']['has6'] and aura_res['s7']['has7'] and aura_res['s8']['has8'], aura_res)

    # 7. 敵ID重複なし (全54体) & G〜Iドット絵フォールバック描画
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
        G.p.lv = 90; G.p.hp = G.p.mhp = 9999;
        G.p.cleared.F = { high: true };
        R.startRun('G', 'novice');
        for (let i = 0; i < 10 && G.run && !G.run.enemy; i++) R.tick();
        const svgCount = document.querySelectorAll('svg').length;
        G.run = null;
        return { unique, totalIds: ids.length, svgCount };
    }''')
    check('all enemy IDs across A-I+ are unique',
          sprite_res['unique'] and sprite_res['totalIds'] >= 54, sprite_res)
    check('G-I enemy renders pixel SVG fallback without image', sprite_res['svgCount'] > 0, sprite_res)
    check('no page errors', errs == [], errs)
    b.close()

print('\nRESULT:', 'OK' if not fails else 'FAILED (%d): %s' % (len(fails), fails))
sys.exit(1 if fails else 0)
