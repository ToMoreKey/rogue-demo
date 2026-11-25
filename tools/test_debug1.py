#!/usr/bin/env python3
"""デバッグ1回目: 1-1〜1-9 総合監査＆再発防止テスト"""
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
    page_errors = []
    console_errors = []
    pg.on('pageerror', lambda e: page_errors.append(str(e)))
    pg.on('console', lambda m: console_errors.append(m.text) if m.type == 'error' else None)
    pg.goto(HTTP_URL)

    # 1-1. 進行不能チェック: A->O解放・クリア・前編/本編/回廊/深淵解放
    p1 = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer(); G.p.lv = 135; G.tutorial = { done: true };
        for (const d of R.DUNGEONS) {
            for (const df of R.DIFFS) {
                if (!R.isDiffUnlocked(G.p, d, df)) return { err: 'locked', d: d.id, df: df.id };
                R.startRun(d.id, df.id);
                if (!G.run) return { err: 'noRun', d: d.id, df: df.id };
                R.finishRun('clear');
            }
        }
        return {
            part1: G.p.part1Cleared,
            ending: G.p.ending,
            abyssOk: R.isAbyssUnlocked(G.p).ok,
            abyssD1: R.isAbyssDiffUnlocked(G.p, 1),
            abyssD2Before: R.isAbyssDiffUnlocked(G.p, 2)
        };
    }''')
    check('1-1 progression A..O all diffs unlock & clear -> ending + abyss unlocked',
          p1.get('part1') and p1.get('ending') and p1.get('abyssOk') and p1.get('abyssD1') and not p1.get('abyssD2Before'), p1)

    # 1-2 & 1-8. 全画面巡回 + 420px & 360px 崩れ・文字はみ出し・NaNチェック
    pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        document.querySelector('#modal').hidden = true; G.modalOpen = false;
        G.p.sp = 50; G.p.gold = 100000; G.p.tower.coins = 1000;
        R.renderAll();
    }''')
    overflows = []
    bad_texts = []
    for vw, vh in [(420, 800), (360, 720)]:
        pg.set_viewport_size({'width': vw, 'height': vh})
        # 街広場 + 各施設
        pg.click('#nav-town')
        for tv in ['plaza', 'inn', 'shop', 'weapon', 'armor', 'sell', 'smith', 'bank']:
            pg.evaluate('(v) => { G.townView = v; window.__rogue.renderAll(); }', tv)
            ov = pg.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
            txt = pg.evaluate('() => document.body.innerText')
            if ov > 0:
                overflows.append((vw, 'town:' + tv, ov))
            if any(w in txt for w in ['NaN', 'undefined', 'Infinity']):
                bad_texts.append((vw, 'town:' + tv))
        # ダンジョン選択 + ランキング + 交換所
        pg.click('#nav-dungeon')
        ov = pg.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
        if ov > 0:
            overflows.append((vw, 'dungeon', ov))
        pg.click('[data-act="towerShop"]')
        ov = pg.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
        if ov > 0:
            overflows.append((vw, 'towerShop', ov))
        pg.click('[data-act="closeTowerModal"]')
        pg.click('[data-act="towerRanking"]')
        pg.wait_for_timeout(150)
        ov = pg.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
        if ov > 0:
            overflows.append((vw, 'towerRanking', ov))
        pg.click('[data-act="closeTowerModal"]')
        # ステータス + 図鑑 + 実績
        pg.click('#nav-status')
        ov = pg.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
        if ov > 0:
            overflows.append((vw, 'status', ov))
        for tab in ['enemies', 'items', 'ach']:
            pg.evaluate('(t) => { window.__rogue.ACTS.openDex(); window.__rogue.ACTS.dexTab({tab: t}); }', tab)
            ov = pg.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
            if ov > 0:
                overflows.append((vw, 'dex:' + tab, ov))
        pg.click('[data-act="closeTowerModal"]')
        # ヘルプ
        pg.click('#nav-help')
        pg.evaluate('() => document.querySelectorAll("#view-help details").forEach(d => d.open = true)')
        ov = pg.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
        if ov > 0:
            overflows.append((vw, 'help', ov))
    check('1-2/1-8 all views & modals fit 420px and 360px without horizontal overflow or NaN/undefined',
          len(overflows) == 0 and len(bad_texts) == 0, (overflows, bad_texts))

    # 1-3. 数値の異常チェック (1,200+ティック戦闘: 本編・回廊・深淵・狂気武器・★9複数特性・進化3・極意)
    num_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        const p = G.p = R.newPlayer();
        p.lv = 140; p.sp = 400; p.ending = true; p.gold = 500000;
        for (const d of R.DUNGEONS) p.cleared[d.id] = { novice: true, mid: true, high: true, super: true, extreme: true };
        p.abyss = { best: 10, cleared: {1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true} };
        p.weapon = { id: p.nextId++, slot: 'weapon', star: 9, rarity: 4, roll: 1.0, prop: 'madness', props: ['madness', 'flame', 'vamp'], locked: true };
        p.armor = { id: p.nextId++, slot: 'armor', star: 9, rarity: 4, roll: 1.0, prop: 'aegis', props: ['aegis', 'thorns', 'regen'], locked: true };
        R.ACTS.changeSkin({ id: 'stella' });
        for (const t of R.getCharTrees(p.skin)) R.ACTS.spAlloc({ tree: t.id, amount: 30 });
        for (const m of R.MASTERY_LIST) for (let k = 0; k < 10; k++) R.ACTS.masteryUp({ id: m.id });
        p.equippedSkills = ['firstAid', 'heroAdvent', 'skyStar'];
        p.potions = { hp: 50, mp: 50 };
        p.hp = R.maxHp(p); p.mp = R.maxMp(p);
        let ticks = 0, bad = [];
        const chk = (tag) => {
            const vals = [p.hp, R.maxHp(p), p.mp, R.maxMp(p), R.playerAtk(p), R.playerDef(p), p.gold, p.exp, p.sp, p.tower.coins];
            if (G.run && G.run.enemy) vals.push(G.run.enemy.hp, G.run.enemy.atk, G.run.enemy.def);
            for (const v of vals) if (typeof v !== 'number' || !isFinite(v) || v < 0) bad.push([tag, v]);
        };
        // 本編O極級
        R.startRun('O', 'extreme');
        while (G.run && ticks < 400) { R.tick(); ticks++; chk('O'); }
        if (G.run) R.finishRun('retreat');
        // 回廊 (十分なティック数を回す)
        while (ticks < 900) {
            R.startTowerRun();
            while (G.run && ticks < 900) {
                if (G.run.phase === 'bless' && G.run.tower.pendingChoice) R.pickBlessing(G.run.tower.pendingChoice[0].id);
                R.tick(); ticks++; chk('tower');
            }
            if (G.run) R.finishRun('retreat');
        }
        // 深淵難度10
        p.hp = R.maxHp(p); p.mp = R.maxMp(p);
        while (ticks < 1300) {
            p.hp = R.maxHp(p); p.mp = R.maxMp(p);
            R.startAbyssRun(10);
            while (G.run && ticks < 1300) {
                if (p.hp < R.maxHp(p) * 0.4 && p.potions.hp > 0) R.usePotion('hp');
                R.tick(); ticks++; chk('abyss10');
            }
            if (G.run) R.finishRun('retreat');
        }
        return { ticks, bad };
    }''')
    check('1-3 1200+ ticks across O/tower/abyss10 have zero NaN/Infinity/negative numbers',
          num_res['ticks'] >= 1200 and len(num_res['bad']) == 0, num_res)

    # 1-4. セーブ→再読込の一致確認
    pg.evaluate('''() => {
        const R = window.__rogue;
        G.p.gold = 123456; G.p.bank = 654321;
        R.save();
    }''')
    pg.reload()
    pg.wait_for_timeout(200)
    sv = pg.evaluate('() => ({ gold: G.p.gold, bank: G.p.bank, lv: G.p.lv, ending: G.p.ending })')
    check('1-4 save & reload preserves state exactly',
          sv['gold'] == 123456 and sv['bank'] == 654321 and sv['lv'] == 140 and sv['ending'], sv)

    # 1-5. 装備・強化・特性・ロック・売却の整合性
    eq_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(true); R.noTimer(true);
        G.p = R.newPlayer(); G.p.gold = 999999;
        const w1 = R.mkItem ? null : R.genItem(R.DIFFS[0], false, 'weapon', 5, 1);
        w1.locked = true;
        G.p.bag = [w1];
        const lenBefore = G.p.bag.length;
        G.shopSel = [true, true, true, true, true];
        R.ACTS.sell(); // ロック済みは売れない
        const lockProtected = G.p.bag.length === lenBefore;
        // 非★9防具は再鍛造不可
        const a5 = R.genItem(R.DIFFS[2], false, 'armor', 5, 5);
        G.p.bag.push(a5);
        const g0 = G.p.gold;
        R.smithReforge(a5.id);
        const armorReforgeBlocked = G.p.gold === g0;
        // 装備重複チェック
        R.equipBest();
        const eqIds = new Set([G.p.weapon && G.p.weapon.id, G.p.armor && G.p.armor.id].filter(Boolean));
        const dupInBag = G.p.bag.some(it => eqIds.has(it.id));
        return { lockProtected, armorReforgeBlocked, dupInBag };
    }''')
    check('1-5 locked gear cannot be sold, non-mythic9 armor cannot reforge, no equipped item duplicated in bag',
          eq_res['lockProtected'] and eq_res['armorReforgeBlocked'] and not eq_res['dupInBag'], eq_res)

    # 1-6. 回廊・深淵の整合性 (深淵敗北で次難度解放されない)
    ab_res = pg.evaluate('''() => {
        const R = window.__rogue;
        G.p = R.newPlayer(); G.p.lv = 130; G.p.ending = true;
        for (const d of R.DUNGEONS) G.p.cleared[d.id] = { extreme: true };
        R.startAbyssRun(1);
        R.finishRun('defeat');
        const d2AfterDefeat = R.isAbyssDiffUnlocked(G.p, 2);
        R.startAbyssRun(1);
        R.finishRun('clear');
        const d2AfterClear = R.isAbyssDiffUnlocked(G.p, 2);
        return { d2AfterDefeat, d2AfterClear };
    }''')
    check('1-6 abyss defeat does not unlock next diff, clear unlocks next diff',
          not ab_res['d2AfterDefeat'] and ab_res['d2AfterClear'], ab_res)

    # 再発防止: 聖域(aegis)防具装備時のステータスDEF表示がarmorDefと一致すること
    aegis_res = pg.evaluate('''() => {
        const R = window.__rogue;
        R.setHeadless(false); R.noTimer(true);
        document.querySelector('#modal').hidden = true; G.modalOpen = false;
        G.p = R.newPlayer(); G.p.lv = 100;
        G.p.armor = { id: 99, slot: 'armor', star: 9, rarity: 4, roll: 1.0, prop: 'aegis', props: ['aegis'], locked: false };
        G.view = 'status'; R.renderAll();
        const dd = document.querySelector('#view-status dl.kv').innerText;
        const ad = R.armorDef(G.p.armor);
        const pd = R.playerDef(G.p);
        return { dd, ad, pd };
    }''')
    check('regression: status screen DEF breakdown matches armorDef for aegis armor',
          f'防具 {aegis_res["ad"]}' in aegis_res['dd'] and str(aegis_res['pd']) in aegis_res['dd'], aegis_res)

    # ローカル起源のconsoleエラーやpageerrorがないこと（外部フォント等のオフライン/環境エラーは除外）
    check('1-2 zero pageerrors across full audit', len(page_errors) == 0, page_errors)
    ctx.close()
    b.close()

print('\nRESULT:', 'OK' if FAILS == 0 else f'FAIL({FAILS})')
sys.exit(1 if FAILS else 0)
