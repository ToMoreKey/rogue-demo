#!/usr/bin/env python3
"""R1a キャラごとのスキル・パッシブ分け（仕組み：v8->v9移行SP全返却＆案内1回・キャラ別3ツリー・ラン中切替不可・キャラ別スロット・新規ゲーム時のキャラ選択モーダル・4キャラ別チュートリアル初期スキル・非ヒーラー応急手当・クロエダブルスタブ）テスト"""
import functools
import http.server
import json
import os
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

    # 1. v8 -> v9 マイグレーション: 全SP返却（失われない）、_bak_v8 バックアップ、1回限りの案内モーダル表示
    v8_save = {
        'v': 8,
        'p': {
            'lv': 75, 'exp': 100, 'sp': 15, 'gold': 50000, 'bank': 10000,
            'hp': 800, 'mp': 200, 'skin': 'stella',
            'skillPts': {'sword': 30, 'magic': 20, 'life': 15, 'warrior': 20, 'mage': 10, 'cleric': 5, 'hero': 10},
            'skills': {'strike': True, 'fireball': True, 'heal': True, 'hagun': True},
            'passiveSkills': {'sword15': True, 'warrior10': True, 'hero10': True},
            'equippedSkills': ['heal', 'hagun', 'strike'],
            'cleared': {'A': {'novice': True, 'high': True}},
            'bagCap': 60, 'potions': {'hp': 5, 'mp': 5}, 'stones': {},
            'stats': {'runs': 20, 'clears': 10, 'kills': 150}, 'nextId': 10
        }
    }
    expected_total_sp = 15 + (30 + 20 + 15 + 20 + 10 + 5 + 10)  # 15 + 110 = 125

    ctx1 = b.new_context(viewport={'width': 390, 'height': 844})
    pg1 = ctx1.new_page()
    errors = []
    pg1.on('pageerror', lambda e: errors.append(str(e)))
    ctx1.add_init_script(
        f'if (!sessionStorage.getItem("_r1a_v8")) {{ sessionStorage.setItem("_r1a_v8", "1"); localStorage.setItem("rogue_test_save_v1", {json.dumps(json.dumps(v8_save))}); }}'
    )
    pg1.goto(HTTP_URL)
    pg1.wait_for_timeout(300)
    mig_res = pg1.evaluate('''() => {
        const R = window.__rogue;
        const stored = JSON.parse(localStorage.getItem(R.SAVE_KEY));
        const bak8 = localStorage.getItem(R.SAVE_KEY + '_bak_v8');
        const modalOpen = G.modalOpen && !document.getElementById('modal').hidden;
        const modalTxt = document.getElementById('m-sheet') ? document.getElementById('m-sheet').innerText : '';
        // 案内を閉じる
        if (document.getElementById('btn-close-v9-notice')) document.getElementById('btn-close-v9-notice').click();
        const afterClosePending = G.p.v9ResetNoticePending;
        const afterCloseModal = G.modalOpen;
        return {
            v: stored.v,
            sp: G.p.sp,
            hasBak8: !!bak8 && JSON.parse(bak8).v === 8,
            skillsEmpty: Object.keys(G.p.skills).length === 0,
            passivesEmpty: Object.keys(G.p.passiveSkills).length === 0,
            eqEmpty: G.p.equippedSkills.every(x => x === null),
            charsOk: ['stella', 'ruby', 'silia', 'chloe'].every(c => !!G.p.chars[c]),
            modalOpen,
            hasNoticeText: modalTxt.includes('システムが変わりました') && modalTxt.includes('SPを全て返却'),
            afterClosePending,
            afterCloseModal
        };
    }''')
    # リロードしても2回目は案内が出ないことを確認
    pg1.reload()
    pg1.wait_for_timeout(300)
    second_load_modal = pg1.evaluate('() => G.modalOpen || !document.getElementById("modal").hidden')
    check('1_v8->v9移行で全SPが欠損なく返却（15+110=125）されスキル・スロット・パッシブがリセット＆_bak_v8保持',
          mig_res['v'] == 10 and mig_res['sp'] == expected_total_sp and mig_res['hasBak8']
          and mig_res['skillsEmpty'] and mig_res['passivesEmpty'] and mig_res['eqEmpty'] and mig_res['charsOk'],
          mig_res)
    check('1_v8->v9移行案内が初回のみ1回表示され閉じると再表示されない',
          mig_res['modalOpen'] and mig_res['hasNoticeText']
          and (not mig_res['afterClosePending']) and (not mig_res['afterCloseModal']) and (not second_load_modal),
          (mig_res, second_load_modal))

    # 2. キャラ別ツリー定義・非ヒーラー「応急手当」・シリア専用ヒール/リジェネ/フルヒール・クロエ3SP「ダブルスタブ」
    tree_def_res = pg1.evaluate('''() => {
        const R = window.__rogue;
        const summary = {};
        for (const cid of ['stella', 'ruby', 'silia', 'chloe']) {
            const trees = R.getCharTrees(cid);
            const allSkillIds = trees.flatMap(t => t.milestones.map(m => m.id).filter(Boolean));
            const mainSkillIds = trees[0].milestones.map(m => m.id).filter(Boolean);
            const first3 = trees[0].milestones.find(m => m.sp === 3);
            summary[cid] = {
                treeCount: trees.length,
                all30: trees.every(t => t.maxSp === 30),
                first3Id: first3 ? first3.id : null,
                hasFirstAidInMain: mainSkillIds.includes('firstAid'),
                hasStrongHeal: allSkillIds.some(id => ['heal', 'regen', 'fullheal'].includes(id))
            };
        }
        return {
            summary,
            firstAidSpec: R.SK.firstAid,
            doubleStabSpec: R.SK.doubleStab
        };
    }''')
    s_map = tree_def_res['summary']
    check('2_4キャラすべて3ツリー×30SP構成・クロエ初期3SPがダブルスタブ(2回×1.1倍,MP7,CT2)',
          all(s_map[c]['treeCount'] == 3 and s_map[c]['all30'] for c in ('stella', 'ruby', 'silia', 'chloe'))
          and s_map['stella']['first3Id'] == 'strike'
          and s_map['ruby']['first3Id'] == 'fireball'
          and s_map['silia']['first3Id'] == 'heal'
          and s_map['chloe']['first3Id'] == 'doubleStab'
          and tree_def_res['doubleStabSpec']['hits'] == 2
          and tree_def_res['doubleStabSpec']['mult'] == 1.1
          and tree_def_res['doubleStabSpec']['mp'] == 7
          and tree_def_res['doubleStabSpec']['ct'] == 2,
          tree_def_res)
    check('2_非ヒーラー3人の主ツリーに応急手当(回復20%,MP12,CT5)があり、ヒール・リジェネ・フルヒールはシリアのみ',
          s_map['stella']['hasFirstAidInMain'] and s_map['ruby']['hasFirstAidInMain'] and s_map['chloe']['hasFirstAidInMain']
          and (not s_map['silia']['hasFirstAidInMain'])
          and s_map['silia']['hasStrongHeal']
          and (not s_map['stella']['hasStrongHeal'])
          and (not s_map['ruby']['hasStrongHeal'])
          and (not s_map['chloe']['hasStrongHeal'])
          and tree_def_res['firstAidSpec']['type'] == 'heal'
          and tree_def_res['firstAidSpec']['pct'] == 0.2
          and tree_def_res['firstAidSpec']['mp'] == 12
          and tree_def_res['firstAidSpec']['ct'] == 5,
          tree_def_res)

    # 3. キャラ別独立育成・スロット切替・パッシブ切替・ステータス「スキル」タブの現キャラツリーのみ表示・ラン中の切替不可
    char_switch_res = pg1.evaluate('''() => {
        const R = window.__rogue;
        G.p = R.newPlayer();
        G.p.lv = 50; G.p.sp = 100;
        // ステラで剣枠15SP -> strike, guard, multi, firstAid, sword15 習得 & strike をスロット1に装備
        R.ACTS.changeSkin({ id: 'stella' });
        const baseAtkNoPassive = R.playerAtk(G.p);
        R.ACTS.spAlloc({ tree: 'sword', amount: 15 });
        R.ACTS.equipSkill({ id: 'strike', slot: 0 });
        const stellaState = {
            spLeft: G.p.sp,
            hasSword15: !!G.p.passiveSkills.sword15,
            atk: R.playerAtk(G.p),
            eq0: G.p.equippedSkills[0],
            hasStrike: !!G.p.skills.strike
        };
        G.view = 'status'; G.statusTab = 'skill'; R.renderAll();
        const stellaTreeNames = [...document.querySelectorAll('#skill-trees-panel .st-name')].map(e => e.innerText.trim());

        // ルビィに切り替え -> ステラの sword15 や strike が外れ、SP残り(85)は共通で引き継がれる
        R.ACTS.changeSkin({ id: 'ruby' });
        const rubyBeforeAlloc = {
            spLeft: G.p.sp,
            hasSword15: !!G.p.passiveSkills.sword15,
            atk: R.playerAtk(G.p),
            eq0: G.p.equippedSkills[0],
            hasStrike: !!G.p.skills.strike
        };
        // ルビィで魔法枠15SP -> fireball, magicshield, thunder, firstAid, magic15 習得 & fireball をスロット1に装備
        const mpBeforeMagic15 = R.maxMp(G.p);
        R.ACTS.spAlloc({ tree: 'magic', amount: 15 });
        R.ACTS.equipSkill({ id: 'fireball', slot: 0 });
        const mpAfterMagic15 = R.maxMp(G.p);
        R.renderAll();
        const rubyTreeNames = [...document.querySelectorAll('#skill-trees-panel .st-name')].map(e => e.innerText.trim());

        // ステラに戻すと、ステラの sword=15, strike装備, sword15パッシブが復元される
        R.ACTS.changeSkin({ id: 'stella' });
        const stellaRestored = {
            spLeft: G.p.sp,
            swordPts: G.p.skillPts.sword,
            hasSword15: !!G.p.passiveSkills.sword15,
            hasMagic15: !!G.p.passiveSkills.magic15,
            eq0: G.p.equippedSkills[0]
        };

        // ダンジョン攻略中（G.run 中）は changeSkin が拒否される
        R.startRun('A', 'novice');
        R.noTimer(true);
        R.ACTS.changeSkin({ id: 'silia' });
        const skinDuringRun = G.p.skin;
        G.view = 'status'; G.statusTab = 'hero'; R.renderAll();
        const heroCardsDisabled = [...document.querySelectorAll('[data-act="changeSkin"]')].every(b => b.disabled);
        R.finishRun('retreat');
        R.ACTS.closeTowerModal();

        return {
            baseAtkNoPassive,
            stellaState,
            stellaTreeNames,
            rubyBeforeAlloc,
            mpBeforeMagic15,
            mpAfterMagic15,
            rubyTreeNames,
            stellaRestored,
            skinDuringRun,
            heroCardsDisabled
        };
    }''')
    check('3_キャラ別にツリー・習得スキル・パッシブ・スロットが独立しSPプールは共通',
          char_switch_res['stellaState']['spLeft'] == 85
          and char_switch_res['stellaState']['hasSword15']
          and char_switch_res['stellaState']['atk'] > char_switch_res['baseAtkNoPassive']
          and char_switch_res['stellaState']['eq0'] == 'strike'
          and char_switch_res['rubyBeforeAlloc']['spLeft'] == 85
          and (not char_switch_res['rubyBeforeAlloc']['hasSword15'])
          and char_switch_res['rubyBeforeAlloc']['atk'] == char_switch_res['baseAtkNoPassive']
          and char_switch_res['rubyBeforeAlloc']['eq0'] is None
          and char_switch_res['mpAfterMagic15'] > char_switch_res['mpBeforeMagic15']
          and char_switch_res['stellaRestored']['spLeft'] == 70
          and char_switch_res['stellaRestored']['swordPts'] == 15
          and char_switch_res['stellaRestored']['hasSword15']
          and (not char_switch_res['stellaRestored']['hasMagic15'])
          and char_switch_res['stellaRestored']['eq0'] == 'strike',
          char_switch_res)
    check('3_スキルタブに現キャラの3ツリーのみ表示＆ラン中はキャラ変更不可',
          char_switch_res['stellaTreeNames'] == ['剣枠', '戦士枠', '英雄枠']
          and char_switch_res['rubyTreeNames'] == ['魔法枠', '魔術師枠', '英雄枠']
          and char_switch_res['skinDuringRun'] == 'stella'
          and char_switch_res['heroCardsDisabled'],
          char_switch_res)
    ctx1.close()

    # 4. 新規ゲームのキャラ選択モーダル（選ぶまで閉じられない・カード押下で説明表示・確定で開始）＆ 4キャラそれぞれのチュートリアル初期スキル習得・装備
    expected_tut = {
        'stella': ('sword', 'strike', '強撃'),
        'ruby':   ('magic', 'fireball', 'ファイアボール'),
        'silia':  ('life',  'heal', 'ヒール'),
        'chloe':  ('sword', 'doubleStab', 'ダブルスタブ')
    }
    for cid, (exp_tree, exp_sk, exp_name) in expected_tut.items():
        ctx_c = b.new_context(viewport={'width': 390, 'height': 844})
        pg_c = ctx_c.new_page()
        pg_c.on('pageerror', lambda e: errors.append(f'{cid}:{e}'))
        pg_c.goto(HTTP_URL)
        pg_c.wait_for_timeout(250)
        res_c = pg_c.evaluate('''(cid) => {
            const R = window.__rogue;
            // 初期状態: キャラ選択モーダルが開いており、確定ボタンは disabled、closeModal() を呼んでも閉じない
            const initialOpen = G.modalOpen && G._charSelectOpen && !document.getElementById('modal').hidden;
            const confirmBtn0 = document.getElementById('btn-confirm-char');
            const initialDisabled = confirmBtn0 ? confirmBtn0.disabled : false;
            R.ACTS.closeTowerModal();
            const stillOpenAfterClose = G.modalOpen && !document.getElementById('modal').hidden;

            // カードを選択
            const card = document.querySelector(`[data-act="selectStartChar"][data-id="${cid}"]`);
            if (card) card.click();
            const descTxt = document.getElementById('char-desc-box') ? document.getElementById('char-desc-box').innerText : '';
            const confirmBtn1 = document.getElementById('btn-confirm-char');
            const enabledAfterPick = confirmBtn1 ? !confirmBtn1.disabled : false;

            // 確定ボタンを押す
            if (confirmBtn1) confirmBtn1.click();
            const closedAfterConfirm = !G.modalOpen && document.getElementById('modal').hidden;
            const skinSet = G.p.skin === cid;
            const step0 = G.tutorial && G.tutorial.step === 0;

            // step 41 まで進めてチュートリアルの対象ツリー・スキルを確認
            G.view = 'status'; G.statusTab = 'skill'; R.renderAll();
            G.tutorial.step = 41;
            R.renderAll();
            const tgt = R.getCharTutorialTarget(cid);
            const allowWrongTree = document.querySelector('[data-act="spAlloc"]');
            // 3回 +1 SP を押す
            for (let i = 0; i < 3; i++) {
                const b = document.querySelector(`[data-act="spAlloc"][data-tree="${tgt.treeId}"][data-amount="1"]`);
                if (b) b.click();
            }
            const learned = !!G.p.skills[tgt.skillId];
            // step 5 に進めて装備ボタンを押す
            G.tutorial.step = 5;
            R.renderAll();
            const eqBtn = document.querySelector(`[data-act="equipSkill"][data-id="${tgt.skillId}"]:not([disabled])`);
            if (eqBtn) eqBtn.click();
            const equipped = G.p.equippedSkills.includes(tgt.skillId);

            return {
                initialOpen, initialDisabled, stillOpenAfterClose,
                hasDesc: descTxt.length > 20, enabledAfterPick,
                closedAfterConfirm, skinSet, step0,
                tgt, learned, equipped
            };
        }''', cid)
        check(f'4_キャラ選択モーダル＆チュートリアル初期スキル({cid}->{exp_name})',
              res_c['initialOpen'] and res_c['initialDisabled'] and res_c['stillOpenAfterClose']
              and res_c['hasDesc'] and res_c['enabledAfterPick'] and res_c['closedAfterConfirm']
              and res_c['skinSet'] and res_c['step0']
              and res_c['tgt']['treeId'] == exp_tree and res_c['tgt']['skillId'] == exp_sk
              and res_c['tgt']['skillName'] == exp_name
              and res_c['learned'] and res_c['equipped'],
              res_c)
        ctx_c.close()

    check('ページエラーなし', len(errors) == 0, errors)
    b.close()

srv.shutdown()
print(f'RESULT: {"OK" if FAILS == 0 else f"NG ({FAILS} fails)"}')
sys.exit(1 if FAILS else 0)
