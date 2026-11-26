#!/usr/bin/env python3
"""UI-3 テスト: ダンジョン背景シーン・ダンジョンタブの区切り・戦利品の装備比較・出撃前後の成長表示・戦力表示"""
import functools, http.server, os, subprocess, sys, tempfile, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FAILS = 0


def check(name, cond, detail=''):
    global FAILS
    if cond:
        print('PASS', name)
    else:
        FAILS += 1
        print('FAIL', name, detail)


tmp = tempfile.mkdtemp()
site = os.path.join(tmp, 'site')
subprocess.check_call([sys.executable, os.path.join(ROOT, 'tools', 'make_site.py'), '--main', ROOT, '--dev', ROOT, '--out', site], stdout=subprocess.DEVNULL)


class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=site))
threading.Thread(target=srv.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{srv.server_address[1]}'

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page(viewport={'width': 360, 'height': 740})
    errors = []
    pg.on('pageerror', lambda e: errors.append(str(e)))
    pg.goto(BASE + '/dev/index.html')
    pg.wait_for_timeout(300)
    pg.evaluate('() => { G.tutorial = { done: true }; const o = document.getElementById("tut-overlay"); if (o) o.hidden = true; window.__rogue.noTimer(true); G._charSelectOpen = false; }')

    # 基準1: 全ダンジョン＋塔＋深淵のシーンがあり、すべて異なる
    r1 = pg.evaluate('''() => {
        const R = window.__rogue; const ids = R.DUNGEONS.map(d => d.id).concat(['T', 'Y']);
        const uris = ids.map(id => sceneUriProbe(id));
        function sceneUriProbe(id) { return R.sceneUri(id); }
        return { n: ids.length, uniq: new Set(uris).size, bad: ids.filter((id, i) => !uris[i] || uris[i].indexOf('data:image/svg') < 0), noAccent: ids.filter(id => !R.SCENE_ACCENT[id]) };
    }''')
    check('基準1_15ダンジョン＋塔＋深淵の背景シーンがすべて固有', r1['n'] == 17 and r1['uniq'] == 17 and not r1['bad'] and not r1['noAccent'], r1)

    # 基準2: ダンジョンタブ（区切り・バナー・背景画像が実際に描画される）
    pg.evaluate('() => { const R = window.__rogue; G.p.ending = true; G.p.part1Cleared = true; G.p.lv = 60; const c = {}; for (const d of R.DUNGEONS) { c[d.id] = { novice: true, mid: true, high: true, super: true, extreme: true }; } G.p.cleared = c; R.ACTS.nav({ v: "dungeon" }); }')
    pg.wait_for_timeout(200)
    r2 = pg.evaluate('''() => {
        const secs = Array.from(document.querySelectorAll('#dg-list .dg-sec')).map(e => e.textContent.replace(/\\s+/g, ''));
        const banners = Array.from(document.querySelectorAll('#dg-list .dc-banner'));
        const bgOk = banners.filter(e => getComputedStyle(e).backgroundImage.indexOf('data:image/svg') >= 0).length;
        const cards = document.querySelectorAll('#dg-list .dc-card').length;
        const letters = Array.from(document.querySelectorAll('#dg-list .dc-letter')).map(e => e.textContent);
        return { secs, banners: banners.length, bgOk, cards, letters, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    }''')
    check('基準2a_前編・後編・エンドコンテンツの区切り見出しがある', r2['secs'] == ['前編魔王城への道', '後編真の黒幕との戦い', 'エンドコンテンツ塔・深淵'], r2)
    check('基準2b_17枚のカードすべてにバナー背景画像が実描画される', r2['cards'] == 17 and r2['banners'] == 17 and r2['bgOk'] == 17, r2)
    check('基準2c_360px幅で横スクロールなし', r2['sw'] <= r2['cw'], r2)

    # 基準3: 戦闘アリーナに背景シーンが設定される
    r3 = pg.evaluate('''() => {
        const R = window.__rogue; G.run = null; R.startRun('E', 'novice'); R.nextFloor && R.nextFloor();
        const bg = getComputedStyle(document.getElementById('arena')).backgroundImage;
        const v = document.getElementById('arena').style.getPropertyValue('--scene');
        const out = { bgHasSvg: bg.indexOf('data:image/svg') >= 0, v: v.indexOf('data:image/svg') >= 0, hasSnap: !!(G.run && G.run.snap && G.run.snap.power > 0) };
        G.run = null; return out;
    }''')
    check('基準3_戦闘アリーナに背景シーンが描画され、出撃時にスナップショットを持つ', r3['bgHasSvg'] and r3['v'] and r3['hasSnap'], r3)

    # 基準4: 戦利品の比較（強い／弱い／同等）と、自動装備時は出撃前の装備と比べる
    r4 = pg.evaluate('''() => {
        const R = window.__rogue; R.setHeadless(false);
        G.run = null; G.p = R.newPlayer(); const p = G.p; p.lv = 30;
        const mk = (slot, star, roll) => { const it = R.genItem(R.DIFFS[0], false, slot, star); it.star = star; it.roll = roll; it.rarity = 1; it.props = []; it.prop = null; return it; };
        const w0 = mk('weapon', 2, 0.6); p.weapon = w0; p.bag = [];
        const snap = R.statSnap(p);
        const strong = mk('weapon', 4, 0.9), weak = mk('weapon', 1, 0.5), same = mk('weapon', 2, 0.6);
        p.bag.push(strong, weak, same);
        G.last = { snap, after: snap, result: 'clear', d: R.DUNGEONS[0], df: R.DIFFS[0], floors: 5, floor: 5, cleared: 5, gold: 0, clearGold: 0, lost: 0, sp: 0, items: [strong, weak, same], potions: { hp: 0, mp: 0 }, lvFrom: 30, lvTo: 30, kills: 1, part1End: false, ending: false, tower: null, abyss: null };
        R.openModal();
        const cmps = Array.from(document.querySelectorAll('#m-sheet .cmp')).map(e => e.className.replace('cmp', '').trim());
        const verdicts = Array.from(document.querySelectorAll('#m-sheet .cmp-v')).map(e => e.textContent.replace(/\\s+/g, ' '));
        const order = Array.from(document.querySelectorAll('#m-sheet .drops .item .it-name')).length;
        const btns = document.querySelectorAll('#m-sheet [data-act="mEquip"]').length;
        const growth = !!document.querySelector('#m-sheet .growth');
        // 強い方を装備 → 自動装備扱い：出撃前の装備と比較して「装備中」
        document.querySelector('#m-sheet [data-act="mEquip"][data-id="' + strong.id + '"]').click();
        const afterEquip = { weaponId: p.weapon && p.weapon.id === strong.id, equippedTag: Array.from(document.querySelectorAll('#m-sheet .cmp-v')).some(e => e.textContent.indexOf('装備中') >= 0), labelBefore: Array.from(document.querySelectorAll('#m-sheet .cmp-l')).some(e => e.textContent.indexOf('出撃前') >= 0) };
        return { cmps, verdicts, order, btns, growth, afterEquip, strongPw: R.weaponAtk(strong), w0pw: R.weaponAtk(w0) };
    }''')
    check('基準4a_強い▲・弱い▼・同等＝の判定が出る（強い順に並ぶ）', r4['cmps'] == ['up', 'same', 'down'] or (set(r4['cmps']) == {'up', 'down', 'same'} and r4['cmps'][0] == 'up'), r4)
    check('基準4b_現在装備と値の比較・ボタン・成長表示がある', r4['order'] == 3 and r4['btns'] == 3 and r4['growth'], r4)
    check('基準4c_結果画面から装備変更でき、装備中の戦利品は出撃前と比較して「装備中」と出る', r4['afterEquip']['weaponId'] and r4['afterEquip']['equippedTag'] and r4['afterEquip']['labelBefore'], r4)

    # 基準5: 戦力表示（HUD）と、装備変更時の「戦力 A → B ▲」通知
    r5 = pg.evaluate('''() => {
        const R = window.__rogue; G.run = null; G.p = R.newPlayer(); const p = G.p; p.lv = 20; R.renderAll();
        const hud0 = document.getElementById('h-pwv').textContent;
        const mk = (slot, star, roll) => { const it = R.genItem(R.DIFFS[0], false, slot, star); it.star = star; it.roll = roll; it.rarity = 2; it.props = []; it.prop = null; return it; };
        const strong = mk('weapon', 4, 1.0); p.bag.push(strong);
        const before = R.playerPower(p);
        const toasts = []; const ob = document.getElementById('toast');
        document.body.insertAdjacentHTML('beforeend', '<button id="t-eq" data-act="equip" data-id="' + strong.id + '">x</button>');
        document.getElementById('t-eq').click();
        const after = R.playerPower(p);
        const txt = document.getElementById('toast').textContent || '';
        const chipCls = document.getElementById('h-pw').className;
        document.getElementById('t-eq').remove();
        return { hud0, hud1: document.getElementById('h-pwv').textContent, before, after, txt, chipCls, pwv: R.playerPower(p) };
    }''')
    check('基準5a_HUDに戦力が表示され、装備変更で増える', r5['after'] > r5['before'] and r5['hud1'].replace(',', '') == str(r5['after']), r5)
    check('基準5b_装備変更直後に「戦力 A → B ▲」の通知とチップのアニメーションが出る', '戦力' in r5['txt'] and '▲' in r5['txt'] and 'pw-up' in r5['chipCls'], r5)

    # 基準6: 街・ステータス・ヘルプのバナー背景
    r6 = pg.evaluate('''() => {
        const R = window.__rogue; G.run = null; G.p = R.newPlayer(); const out = {};
        const chk = (view, sel) => { G.view = view; R.renderAll(); const el = document.querySelector(sel + ' .view-hero'); const bg = el ? getComputedStyle(el).backgroundImage : ''; return { has: !!el, bg: bg.includes('data:image/svg') || bg.includes('url('), title: el ? el.querySelector('h2').textContent : '' }; };
        out.town = chk('town', '#view-town');
        out.help = chk('help', '#view-help');
        out.status = {};
        for (const t of ['hero','gear','skill','mastery','data']) { G.statusTab = t; out.status[t] = chk('status', '#view-status'); }
        G.view = 'town'; G.townFac = 'smith'; try { R.renderAll(); } catch (e) {}
        out.hscroll = document.documentElement.scrollWidth <= window.innerWidth + 1;
        return out;
    }''')
    check('基準6a_街・ヘルプにバナー背景がある', r6['town']['has'] and r6['town']['bg'] and r6['help']['has'] and r6['help']['bg'], r6)
    check('基準6b_ステータス5タブすべてにバナー背景がある', all(v['has'] and v['bg'] for v in r6['status'].values()), r6)
    check('基準6c_横スクロールが発生しない', r6['hscroll'], r6)

    # 基準7: 施設NPC
    r7 = pg.evaluate('''() => {
        const R = window.__rogue; G.run = null; G.p = R.newPlayer(); const out = {};
        for (const f of ['inn','shop','smith','bank']) {
            G.view = 'town'; G._npc = null; G._npcEvt = null; G.townView = f; R.renderAll();
            const el = document.querySelector('#view-town .npc');
            out[f] = { has: !!el, svg: !!(el && el.querySelector('svg')), line: el ? el.querySelector('p').textContent : '' };
        }
        // 再描画しても台詞が変わらない
        const l1 = document.querySelector('#view-town .npc p').textContent; R.renderAll();
        out.stable = l1 === document.querySelector('#view-town .npc p').textContent;
        // 操作後の反応
        G.townView = 'bank'; G.p.gold = 500; G._npc = null; G._npcEvt = 'dep'; R.renderAll();
        out.react = ['確かにお預かりしました。','お預け入れ、承りました。'].some(t => document.querySelector('#view-town .npc p').textContent.includes(t));
        return out;
    }''')
    check('基準7a_4施設すべてにNPCの立ち絵とセリフがある', all(r7[f]['has'] and r7[f]['svg'] and len(r7[f]['line']) > 4 for f in ['inn','shop','smith','bank']), r7)
    check('基準7b_再描画でセリフが変わらない・操作後は反応セリフになる', r7['stable'] and r7['react'], r7)

    # 基準8: 拾った装備は自動装備されない／最強装備ボタンで最強になる
    r8 = pg.evaluate('''() => {
        const R = window.__rogue; G.run = null; G.p = R.newPlayer(); const p = G.p; G.opts.autoEquip = false; G.autoSellRarity = -1;
        const mk = (slot, star, roll) => { const it = R.genItem(R.DIFFS[0], false, slot, star); it.star = star; it.roll = roll; it.rarity = 2; it.props = []; it.prop = null; return it; };
        const w0 = mk('weapon', 1, 0.5); p.weapon = w0; p.bag = [];
        const strong = mk('weapon', 5, 1.0), mid = mk('weapon', 3, 0.8);
        const rs = [R.receiveItem(mid), R.receiveItem(strong)];
        const keptWeapon = p.weapon === w0, inBag = p.bag.includes(strong) && p.bag.includes(mid);
        const defaultOff = R.newPlayer && true;
        G.view = 'status'; G.statusTab = 'gear'; R.renderAll();
        const btn = [...document.querySelectorAll('#view-status [data-act="autoEquipNow"]')][0];
        const label = btn ? btn.textContent : '';
        btn && btn.click();
        return { rs, keptWeapon, inBag, label, best: p.weapon === strong, oldInBag: p.bag.includes(w0), optOff: G.opts.autoEquip === false };
    }''')
    check('基準8a_拾った装備は自動装備されずバッグに入る', r8['rs'] == ['bag', 'bag'] and r8['keptWeapon'] and r8['inBag'], r8)
    check('基準8b_「最強装備」ボタンでその時いちばん強い装備になる', '最強装備' in r8['label'] and r8['best'] and r8['oldInBag'], r8)

    # 基準9: 施設内で「街」タブを押すと広場に戻る
    r9 = pg.evaluate('''() => {
        const R = window.__rogue; G.run = null; G.p = R.newPlayer(); G.view = 'town'; G.townView = 'smith'; R.renderAll();
        document.getElementById('nav-town').click();
        const back = G.townView, plaza = !!document.querySelector('#view-town .plaza-grid');
        document.getElementById('nav-town').click();
        return { back, plaza, still: G.view };
    }''')
    check('基準9_施設内で街タブを押すと広場に戻る（広場では何も起きない）', r9['back'] == 'plaza' and r9['plaza'] and r9['still'] == 'town', r9)

    check('ページエラーなし', len(errors) == 0, errors)
    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
