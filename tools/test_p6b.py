#!/usr/bin/env python3
"""P6b 実績・称号（36実績・イベント判定・保留コイン・隠し実績・称号装備・移行・420pxレイアウト）テスト"""
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

    # 1. 実績数(36)・本編クリア前のコイン保留とクリア時付与・二重解除なし
    r1 = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer(); G.p.lv = 49; G.p.ending = false;
        G.tutorial = { done: true };
        // Lv50に到達 → gr_lv50 (5枚) が保留される
        G.p.lv = 50;
        const u1 = R.checkAchievements('lv', true);
        const u2 = R.checkAchievements('lv', true); // 二重にならない
        const pend1 = G.p.pendingAchCoins;
        const coinsBefore = G.p.tower.coins;
        // 装備★5入手 → eq_s5 (5枚) がさらに保留
        R.receiveItem(R.genItem(R.DIFFS[2], false, 'weapon', 5, 5));
        const pend2 = G.p.pendingAchCoins;
        // 本編クリア(O極級) → 保留コイン10枚 + prog_ending(30枚) が付与
        G.p.ending = true;
        R.flushPendingAchCoins(G.p, true);
        R.checkAchievements('run', true);
        return {
            totalAch: R.ACHIEVEMENTS.length,
            u1Len: u1.length, u2Len: u2.length,
            pend1, coinsBefore, pend2,
            pendAfter: G.p.pendingAchCoins,
            coinsAfter: G.p.tower.coins,
            hasEndTitle: G.p.tower.titles.includes('a_ending')
        };
    }''')
    check('36 achievements defined, unlocked once, coins held before ending and flushed on ending',
          r1['totalAch'] == 36 and r1['u1Len'] == 1 and r1['u2Len'] == 0
          and r1['pend1'] == 5 and r1['coinsBefore'] == 0 and r1['pend2'] == 10
          and r1['pendAfter'] == 0 and r1['coinsAfter'] == 40 and r1['hasEndTitle'], r1)

    # 2. ノーダメージボス撃破 (隠し実績) & 深淵の主3体
    r2 = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p = R.newPlayer(); G.p.lv = 130; G.p.ending = true;
        R.startRun('A', 'novice');
        G.run.floor = G.run.floors;
        R.spawnEnemy(true, false);
        G.run.enemy.hp = 0;
        R.onKill();
        G.run = null;
        return { noDmg: !!G.p.ach.sp_nodmg_boss, title: G.p.tower.titles.includes('a_nodmg') };
    }''')
    check('hidden achievement sp_nodmg_boss unlocks on no-damage boss kill',
          r2['noDmg'] and r2['title'], r2)

    # 3. 既存セーブ(v6)の読み込み時に達成済み実績・保留コイン・称号が自動反映される
    r3 = pg.evaluate('''() => {
        const R = window.__rogue;
        const v6 = {
            v: 6,
            p: {
                lv: 100, exp: 0, hp: 100, mp: 50, sp: 0, gold: 100, bank: 0,
                bagCap: 60, cleared: { I: { high: true } }, part1Cleared: true, ending: false,
                tower: { best: 38, coins: 0, totalCoins: 0, title: null, titles: [], nick: '', rankOptIn: false, sentBest: 0 },
                dex: { enemies: {}, items: { weapon_1: true, armor_1: true }, rewards: {} },
                stats: { runs: 10, clears: 5, kills: 100 }, nextId: 1
            }
        };
        localStorage.setItem(R.SAVE_KEY, JSON.stringify(v6));
        R.load();
        return {
            lv50: !!G.p.ach.gr_lv50,
            lv100: !!G.p.ach.gr_lv100,
            tw30: !!G.p.ach.tw_30,
            part1: !!G.p.ach.prog_part1,
            pend: G.p.pendingAchCoins,
            coins: G.p.tower.coins,
            hasTitle: G.p.tower.titles.includes('a_lv100')
        };
    }''')
    check('v6 -> v7 load auto-grants earned achievements & holds coins before ending',
          r3['lv50'] and r3['lv100'] and r3['tw30'] and r3['part1']
          and r3['pend'] > 0 and r3['coins'] == 0 and r3['hasTitle'], r3)

    # 4. 実績モーダルUI (達成数・進捗・隠し実績？？？・420px) & ステータス画面の称号装備
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        document.querySelector('#modal').hidden = true; G.modalOpen = false;
        G.tutorial = { done: true };
        R.renderAll();
    }''')
    pg.click('#nav-status')
    pg.click('[data-act="equipStatusTitle"][data-id="a_lv100"]')
    eq_ok = pg.evaluate('''() => {
        const pt = document.querySelector('#st-portrait').innerText;
        return G.p.tower.title === 'a_lv100' && pt.includes('百戦錬磨');
    }''')
    check('title equip on status screen displays near character name', eq_ok)

    pg.click('[data-act="openAch"]')
    pg.wait_for_selector('.dex-scroll')
    ui = pg.evaluate('''() => {
        const txt = document.querySelector('#m-sheet').innerText;
        const ov = document.documentElement.scrollWidth - window.innerWidth;
        return { txt, ov };
    }''')
    check('achievement modal shows count, progress (38 / 50階), hidden ???, and 420px no overflow',
          '/ 36' in ui['txt'] and '最高 38 / 50階' in ui['txt']
          and '？？？' in ui['txt'] and '隠し実績' in ui['txt'] and ui['ov'] <= 0,
          {'ov': ui['ov']})

    check('no page errors', len(errors) == 0, errors)
    ctx.close()
    b.close()

print('\nRESULT:', 'OK' if FAILS == 0 else f'FAIL({FAILS})')
sys.exit(1 if FAILS else 0)
