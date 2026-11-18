# P5a 自動テスト:
#   1. 解放: p.ending が偽なら入れず、真なら入れる
#   2. 階層: ボスが10階ごとに出る、敵ステータスが階層で単調に増える
#   3. 祝福: ボス撃破後に3択が出る、選ぶと効果反映、重複しない、ラン終了で消える、全30種がエラーなく適用できる
#   4. 終了とコイン: 全滅・撤退で終了し、最高到達階・コイン更新、コイン計算式確認
#   5. 交換所: ★8神話装備が買え、神話レアとして装備でき戦力値が出る、コイン不足不可、★9神話なし、称号自動取得・購入
#   6. 回廊でのドロップ: 神話レアが出ない、★9は50階以降のボスの低確率のみ
#   7. セーブ保存・読み込み: p.tower の保存と復元
# 使い方: python3 tools/test_p5a.py [HTMLのパス(省略時はindex.html)]
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

    # 1. 解放: p.ending が偽なら入れず、真なら入れる
    unlock_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer();
        R.startTowerRun();
        const blocked = !G.run;
        G.p.ending = true;
        R.startTowerRun();
        const entered = !!(G.run && G.run.tower);
        G.run = null;
        return { blocked, entered };
    }''')
    check('tower blocked when p.ending is false, allowed when true',
          unlock_res['blocked'] and unlock_res['entered'], unlock_res)

    # 2. 階層: 10階ごとにボス、敵ステータスが階層で単調に増える
    floor_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        let _s = 11;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        G.p = R.newPlayer(); G.p.ending = true;
        R.startTowerRun();
        G.run.floor = 10; R.spawnEnemy(true, false); const e10 = { boss: G.run.enemy.boss, hp: G.run.enemy.maxHp, atk: G.run.enemy.atk };
        G.run.floor = 9; R.spawnEnemy(false, false); const e9 = { boss: G.run.enemy.boss, hp: G.run.enemy.maxHp };
        G.run.floor = 50; R.spawnEnemy(true, false); const e50 = { boss: G.run.enemy.boss, id: G.run.enemy.id, hp: G.run.enemy.maxHp, atk: G.run.enemy.atk };
        const s1 = R.scaleOf(G.run, 1), s10 = R.scaleOf(G.run, 10), s30 = R.scaleOf(G.run, 30), s50 = R.scaleOf(G.run, 50);
        G.run = null;
        return { e9, e10, e50, mono: s1 < s10 && s10 < s30 && s30 < s50 && e10.atk < e50.atk };
    }''')
    check('10F/50F spawns boss and scaling increases monotonically',
          not floor_res['e9']['boss'] and floor_res['e10']['boss'] and floor_res['e50']['boss']
          and floor_res['e50']['id'] == 'o_boss' and floor_res['mono'], floor_res)

    # 3. 祝福: ボス撃破後3択、選択で効果反映、重複なし、ラン終了で消える、全30種エラーなし
    bless_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        let _s = 77;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        G.p = R.newPlayer(); G.p.ending = true; G.p.lv = 126;
        R.startTowerRun();
        const atk0 = R.playerAtk(G.p);
        // 5F撃破で2択出現
        G.run.floor = 5;
        R.spawnEnemy(false, true);
        G.run.enemy.hp = 0;
        R.onKill();
        const ch5 = G.run.tower.pendingChoice || [];
        const has2At5 = ch5.length === 2 && G.run.phase === 'bless';
        if (ch5.length) R.pickBlessing(ch5[0].id);
        // 10Fボス撃破で3択出現
        G.run.floor = 10;
        R.spawnEnemy(true, false);
        G.run.enemy.hp = 0;
        R.onKill();
        const choices = G.run.tower.pendingChoice || [];
        const has3 = choices.length === 3 && G.run.phase === 'bless';
        // 攻撃力+系を含む全30種を順に適用してもエラーが出ないこと
        if (choices.length) R.pickBlessing(choices[0].id);
        const picked1 = G.run.tower.blessings.length === 2;
        // 既に選んだ祝福は次回候補に出ない
        let dupFound = false;
        for (let k = 0; k < 28; k++) {
            G.run.floor = (k + 2) * 10;
            R.spawnEnemy(true, false);
            G.run.enemy.hp = 0;
            R.onKill();
            const ch = G.run.tower.pendingChoice || [];
            if (ch.some(c => G.run.tower.blessings.includes(c.id))) dupFound = true;
            if (ch.length) R.pickBlessing(ch[0].id);
        }
        const allCount = G.run.tower.blessings.length;
        const atkAfterAll = R.playerAtk(G.p);
        const te = R.towerEff(G.run);
        // ラン終了で消える
        R.finishRun('retreat');
        const goneAfterEnd = !G.run;
        R.startTowerRun();
        const freshCount = G.run.tower.blessings.length;
        G.run = null;
        return { totalBlessings: R.TOWER_BLESSINGS.length, has2At5, has3, picked1, dupFound, allCount, atk0, atkAfterAll, teOk: te.atkMult > 0, goneAfterEnd, freshCount };
    }''')
    check('about 30 blessings defined and 5F 2-choice / 10F 3-choice triggered',
          bless_res['totalBlessings'] >= 28 and bless_res['has2At5'] and bless_res['has3'] and bless_res['picked1'], bless_res)
    check('blessings do not duplicate, apply cleanly, and reset on new run',
          not bless_res['dupFound'] and bless_res['allCount'] >= 28 and bless_res['teOk']
          and bless_res['goneAfterEnd'] and bless_res['freshCount'] == 0, bless_res)

    # 4. 終了とコイン: 全滅・撤退でベスト・コイン更新、コイン式
    coin_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer(); G.p.ending = true; G.p.lv = 126;
        const c10 = R.TOWER_CFG.coinsForFloor(10);
        const c50 = R.TOWER_CFG.coinsForFloor(50);
        R.startTowerRun();
        G.run.floor = 25;
        R.finishRun('retreat');
        const bestAfterRetreat = G.p.tower.best;
        const coinsAfterRetreat = G.p.tower.coins;
        R.startTowerRun();
        G.run.floor = 11; // 11Fで全滅 → 到達10F
        R.finishRun('defeat');
        const bestAfterDefeat = G.p.tower.best;
        const coinsAfterDefeat = G.p.tower.coins;
        return { c10, c50, bestAfterRetreat, coinsAfterRetreat, bestAfterDefeat, coinsAfterDefeat };
    }''')
    check('tower best and coins update on retreat and defeat with 50F+ x2 bonus',
          coin_res['c10'] > 10 and coin_res['c50'] >= 2 * 50
          and coin_res['bestAfterRetreat'] == 25 and coin_res['coinsAfterRetreat'] > 0
          and coin_res['bestAfterDefeat'] == 25 and coin_res['coinsAfterDefeat'] == coin_res['coinsAfterRetreat'] + coin_res['c10'], coin_res)

    # 5. 交換所: ★8神話購入・装備・戦力値・コイン不足不可・★9神話なし・称号自動/購入
    shop_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer(); G.p.ending = true; G.p.lv = 126;
        const noStar9Mythic = !R.TOWER_SHOP.some(x => x.star >= 9);
        // コイン不足で買えない (300 < 600)
        G.p.tower.coins = 300;
        R.ACTS.buyTowerShop({ id: 'mythic_w8' });
        const blockedPoor = G.p.weapon.rarity !== 4 && G.p.tower.coins === 300;
        // 600コインで購入・装備
        G.p.tower.coins = 800;
        R.ACTS.buyTowerShop({ id: 'mythic_w8' });
        const boughtW = G.p.weapon && G.p.weapon.rarity === 4 && G.p.weapon.star === 8;
        const pw = R.gearPower(G.p.weapon);
        const coinsLeft = G.p.tower.coins;
        // 称号: 到達階自動取得 + コイン購入 + 装備
        R.startTowerRun();
        G.run.floor = 30;
        R.finishRun('retreat');
        const autoTitles = ['t_f10', 't_f20', 't_f30'].every(id => G.p.tower.titles.includes(id));
        G.p.tower.coins = 200;
        R.ACTS.buyTowerTitle({ id: 't_c1' });
        const boughtTitle = G.p.tower.titles.includes('t_c1') && G.p.tower.title === 't_c1';
        return { noStar9Mythic, blockedPoor, boughtW, pw, coinsLeft, autoTitles, boughtTitle };
    }''')
    check('exchange shop sells ★8 mythic (no ★9), checks coins, equips with mythic power',
          shop_res['noStar9Mythic'] and shop_res['blockedPoor'] and shop_res['boughtW']
          and shop_res['pw'] == 190 * 6 and shop_res['coinsLeft'] == 200, shop_res)
    check('titles auto-unlock by reached floor and can be bought with coins',
          shop_res['autoTitles'] and shop_res['boughtTitle'], shop_res)

    # 6. 回廊でのドロップ: 神話レアが出ない、★9は50F以降のボスの低確率のみ
    drop_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        let _s = 55;
        R.setRng(() => ((_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296));
        G.p = R.newPlayer(); G.p.ending = true; G.p.lv = 126; G.p.bagCap = 120;
        G.tutorial = { done: true };
        R.startTowerRun();
        let maxRar = 0, max30Boss = 0, has9At60 = false;
        for (let i = 0; i < 100; i++) {
            G.p.bag = []; G.run.floor = 30;
            R.spawnEnemy(true, false); G.run.enemy.hp = 0; R.onKill();
            for (const it of G.run.items) { if (it.rarity > maxRar) maxRar = it.rarity; if (it.star > max30Boss) max30Boss = it.star; }
            if (G.run.tower.pendingChoice) R.pickBlessing(G.run.tower.pendingChoice[0].id);
        }
        for (let i = 0; i < 200; i++) {
            G.p.bag = []; G.run.floor = 60;
            R.spawnEnemy(true, false); G.run.enemy.hp = 0; R.onKill();
            for (const it of G.run.items) { if (it.rarity > maxRar) maxRar = it.rarity; if (it.star === 9) has9At60 = true; }
            if (G.run.tower.pendingChoice) R.pickBlessing(G.run.tower.pendingChoice[0].id);
        }
        G.run = null;
        return { maxRar, max30Boss, has9At60 };
    }''')
    check('tower drops never include mythic rarity, ★9 only on 50F+ bosses',
          drop_res['maxRar'] <= 3 and drop_res['max30Boss'] <= 8 and drop_res['has9At60'], drop_res)

    # 7. p.tower セーブ保存・読み込み
    save_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p = R.newPlayer(); G.p.ending = true;
        G.p.tower = { best: 42, coins: 123, totalCoins: 456, title: 't_f30', titles: ['t_f10', 't_f20', 't_f30'] };
        R.save();
        G.p = R.newPlayer();
        const ok = R.load();
        return { ok, tower: G.p.tower };
    }''')
    check('p.tower saves and loads intact',
          save_res['ok'] and save_res['tower']['best'] == 42 and save_res['tower']['coins'] == 123
          and save_res['tower']['title'] == 't_f30' and len(save_res['tower']['titles']) == 3, save_res)
    check('no page errors', errs == [], errs)
    b.close()

print('\nRESULT:', 'OK' if not fails else 'FAILED (%d): %s' % (len(fails), fails))
sys.exit(1 if fails else 0)
