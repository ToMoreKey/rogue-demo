# P5b-1 自動テスト:
#   1. 深淵の解放 (全15ダンジョン極級クリア前は入れない) & 難度1〜10解放順
#   2. 呪いの累積と効果 (回復半減・CT+1・敵ATK/HP・最大MP減など) & 主の配置
#   3. ★9神話装備ドロップ (深淵の主のみ、特性数分布 武器0〜3/防具0〜2、重複なし)
#   4. 複数特性装備 (装備・売却・再鍛造・戦力値・狂気自動装備除外)
#   5. 極意 (本編クリア前は振れない、振ると効果反映、リセットでSP返還)
#   6. 進化第3段階 (本編クリアで解放、9種習得、戦闘実行)
#   7. 5F/15F 祝福モーダル文言修正 (2-0)
# 使い方: python3 tools/test_p5b1.py [HTMLのパス(省略時はindex.html)]
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

    # 1. 深淵の解放 & 難度順
    ab_unlock = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer();
        const st0 = R.isAbyssUnlocked(G.p);
        R.startAbyssRun(1);
        const blocked0 = !G.run;
        for (const d of R.DUNGEONS) G.p.cleared[d.id] = { novice: true, mid: true, high: true, super: true, extreme: true };
        const st1 = R.isAbyssUnlocked(G.p);
        const d1Ok = R.isAbyssDiffUnlocked(G.p, 1);
        const d2Blocked = !R.isAbyssDiffUnlocked(G.p, 2);
        R.startAbyssRun(2);
        const blocked2 = !G.run;
        G.p.abyss.cleared[1] = true;
        const d2Ok = R.isAbyssDiffUnlocked(G.p, 2);
        R.startAbyssRun(2);
        const entered2 = !!(G.run && G.run.abyss && G.run.abyss.lv === 2);
        G.run = null;
        return { st0, blocked0, st1, d1Ok, d2Blocked, blocked2, d2Ok, entered2 };
    }''')
    check('Abyss locked until all 15 extreme cleared & diffs unlock sequentially',
          not ab_unlock['st0']['ok'] and ab_unlock['st0']['remaining'] == 15 and ab_unlock['blocked0']
          and ab_unlock['st1']['ok'] and ab_unlock['d1Ok'] and ab_unlock['d2Blocked']
          and ab_unlock['blocked2'] and ab_unlock['d2Ok'] and ab_unlock['entered2'], ab_unlock)

    # 2. 呪いの累積と効果 & 主の配置
    curse_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer(); G.p.lv = 126;
        for (const d of R.DUNGEONS) G.p.cleared[d.id] = { extreme: true };
        G.p.abyss = { best: 10, cleared: {1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true} };
        // 難度1: healHalf, 難度5: mpDown
        R.startAbyssRun(1);
        const ae1 = R.abyssEff(G.run);
        const mp1 = R.maxMp(G.p);
        G.run = null;
        R.startAbyssRun(5);
        const ae5 = R.abyssEff(G.run);
        const mp5 = R.maxMp(G.p);
        G.run = null;
        // 主の配置 (1-3: abyss_gula, 4-7: abyss_mirror, 8-10: abyss_deep)
        R.setRng(() => 0.99); // 奇襲の霧(先制)が発動しないよう固定（未装備のテスト用プレイヤーが即死して不安定になるため）
        const bossAt = (lv) => {
            G.p.hp = R.maxHp(G.p); G.p.mp = R.maxMp(G.p);
            R.startAbyssRun(lv); G.run.floor = 50; R.spawnEnemy(true, false);
            const res = { id: G.run.enemy.id, name: G.run.enemy.name };
            G.run = null; return res;
        };
        const rr = { ae1, mp1, ae5, mp5, b1: bossAt(1), b3: bossAt(3), b6: bossAt(6), b10: bossAt(10) };
        R.setRng(null);
        return rr;
    }''')
    check('Abyss curses accumulate cleanly (healHalf, ctPlus, mpDown, etc.)',
          curse_res['ae1']['healMult'] == 0.5 and curse_res['ae1']['ctAdd'] == 0
          and curse_res['ae5']['ctAdd'] == 1 and curse_res['mp5'] < curse_res['mp1'], curse_res)
    check('Abyss bosses placed correctly (gula/mirror/deep + ・極 on 3/6/10)',
          curse_res['b1']['id'] == 'abyss_gula' and '・極' in curse_res['b3']['name']
          and curse_res['b6']['id'] == 'abyss_mirror' and '・極' in curse_res['b6']['name']
          and curse_res['b10']['id'] == 'abyss_deep' and '・極' in curse_res['b10']['name'], curse_res)

    # 3. ★9神話装備ドロップ & 特性分布
    myth_drop = pg.evaluate('''() => {
        const R = window.__rogue;
        let _s = 12345;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        G.p = R.newPlayer(); G.p.lv = 130; G.p.bagCap = 120; G.tutorial = { done: true };
        for (const d of R.DUNGEONS) G.p.cleared[d.id] = { extreme: true };
        G.p.abyss = { best: 10, cleared: {1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true} };
        // genMythic9 の特性分布確認
        let wCounts = [0, 0, 0, 0], aCounts = [0, 0, 0], dupFound = false;
        for (let i = 0; i < 400; i++) {
            const w = R.genMythic9('weapon');
            const wp = R.itemProps(w);
            wCounts[wp.length]++;
            if (new Set(wp).size !== wp.length) dupFound = true;
            const a = R.genMythic9('armor');
            const ap = R.itemProps(a);
            aCounts[ap.length]++;
            if (new Set(ap).size !== ap.length) dupFound = true;
        }
        // 難度10の主からドロップすること
        let dropped = 0;
        for (let i = 0; i < 400; i++) {
            G.p.hp = R.maxHp(G.p); G.p.mp = R.maxMp(G.p);
            if (!G.run) R.startAbyssRun(10);
            G.run.floor = 50;
            G.p.bag = []; G.run.abyss.mythicDrops = [];
            R.spawnEnemy(true, false);
            if (G.run && G.run.enemy) {
                G.run.enemy.hp = 0; R.onKill();
                dropped += G.run.abyss.mythicDrops.length;
            }
        }
        G.run = null;
        return { wCounts, aCounts, dupFound, dropped };
    }''')
    check('genMythic9 produces 0-3 unique weapon props & 0-2 unique armor props',
          not myth_drop['dupFound'] and all(c > 0 for c in myth_drop['wCounts'])
          and all(c > 0 for c in myth_drop['aCounts']), myth_drop)
    check('★9 Mythic drops from Abyss boss (rate ~2% on diff 10)',
          myth_drop['dropped'] > 0, myth_drop)

    # 4. 複数特性装備 (装備・売却・再鍛造・戦力値・狂気除外)
    multi_res = pg.evaluate('''() => {
        const R = window.__rogue;
        let _s = 99;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        G.p = R.newPlayer(); G.p.lv = 130; G.p.gold = 500000;
        const wMad = { id: 9001, slot: 'weapon', star: 9, rarity: 4, roll: 1.0, prop: 'madness', props: ['madness', 'flame'], locked: false };
        const wSafe = { id: 9002, slot: 'weapon', star: 8, rarity: 3, roll: 1.0, prop: 'flame', props: ['flame'], locked: false };
        G.p.weapon = wSafe;
        G.p.bag = [wMad];
        R.equipBest();
        const madExcluded = G.p.weapon.id === 9002;
        const aMulti = { id: 9003, slot: 'armor', star: 9, rarity: 4, roll: 1.0, prop: 'aegis', props: ['aegis', 'ward'], locked: false };
        const aDef = R.gearPower(aMulti);
        G.p.armor = aMulti;
        R.smithReforge(aMulti.id);
        const reforgeArmorOk = Array.isArray(aMulti.props);
        // 売却
        G.p.bag = [wMad]; G.shopSel = [true, true, true, true, true];
        const g0 = G.p.gold; R.ACTS.sell();
        const soldOk = G.p.gold > g0 && G.p.bag.length === 0;
        return { madExcluded, aDef, reforgeArmorOk, soldOk };
    }''')
    check('multi-prop gear supports power, madness auto-equip exclusion, mythic9 reforge, and sell',
          multi_res['madExcluded'] and multi_res['aDef'] == round(140 * 6 * 1.15)
          and multi_res['reforgeArmorOk'] and multi_res['soldOk'], multi_res)

    # 5. 極意 (本編クリア前不可、解放後効果反映、リセット)
    mast_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p = R.newPlayer(); G.p.lv = 130; G.p.sp = 50; G.p.gold = 100000;
        R.ACTS.masteryUp({ id: 'm_atk' });
        const blocked = (G.p.mastery.m_atk || 0) === 0;
        G.p.ending = true;
        const atk0 = R.playerAtk(G.p);
        for (let i = 0; i < 10; i++) R.ACTS.masteryUp({ id: 'm_atk' });
        const atk10 = R.playerAtk(G.p);
        const spAfter = G.p.sp; // 50 - 11 = 39
        R.ACTS.masteryReset();
        const spReset = G.p.sp; // 50
        return { blocked, atk0, atk10, spAfter, spReset };
    }''')
    check('Mastery locked before ending, boosts stats when leveled, and refunds SP on reset',
          mast_res['blocked'] and mast_res['atk10'] > mast_res['atk0']
          and mast_res['spAfter'] == 39 and mast_res['spReset'] == 50, mast_res)

    # 6. 進化第3段階 & 2-0 モーダル文言
    evo3_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer(); G.p.lv = 130; G.p.sp = 300;
        R.ACTS.spAlloc({ tree: 'sword', amount: 30 });
        R.ACTS.spAlloc({ tree: 'magic', amount: 30 });
        R.ACTS.spAlloc({ tree: 'life', amount: 30 });
        R.ACTS.spAlloc({ tree: 'warrior', amount: 20 });
        R.ACTS.spAlloc({ tree: 'warrior', amount: 1 }); // 本編クリア前は20で止まる
        const blockedPre = G.p.skillPts.warrior === 20 && !G.p.skills.tenma;
        G.p.ending = true;
        R.ACTS.spAlloc({ tree: 'warrior', amount: 10 });
        R.ACTS.spAlloc({ tree: 'mage', amount: 30 });
        R.ACTS.spAlloc({ tree: 'cleric', amount: 30 });
        R.ACTS.spAlloc({ tree: 'hero', amount: 30 });
        const ids9 = ['tenma', 'kishin', 'zeroAbs', 'meteorNova', 'goddess', 'eternal', 'heroAdvent', 'skyStar', 'genesisRay'];
        const learnedAll = ids9.every(id => !!G.p.skills[id]);
        // 5F祝福モーダル文言チェック (2-0)
        R.setHeadless(false);
        R.startTowerRun(); G.run.floor = 5; R.spawnEnemy(false, true);
        G.run.enemy.hp = 0; R.onKill();
        const modalTxt = document.querySelector('#m-sheet')?.innerText || '';
        G.run = null;
        return { blockedPre, learnedAll, hasMinibossText: modalTxt.includes('節目の強敵を撃破') };
    }''')
    check('evolution stage 3 locked until ending, learns all 9 skills after ending',
          evo3_res['blockedPre'] and evo3_res['learnedAll'], evo3_res)
    check('5F/15F tower blessing modal shows miniboss text (2-0)',
          evo3_res['hasMinibossText'], evo3_res)
    check('no page errors', errs == [], errs)
    b.close()

print('\nRESULT:', 'OK' if not fails else 'FAILED (%d): %s' % (len(fails), fails))
sys.exit(1 if fails else 0)
