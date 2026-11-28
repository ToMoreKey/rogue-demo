const ACTS = {
  nav(d) {
    const v = d.v;
    if (v === 'town' && G.run) { toast('探索中は街に戻れません。先に撤退してください'); return; }
    // 街タブを街の中で押したら、施設から広場に戻る
    if (v === 'town' && G.view === 'town' && G.townView && G.townView !== 'plaza') { G.townView = 'plaza'; G._npc = null; G._npcEvt = null; renderTown(); return; }
    // チュートリアル step 0: ダンジョンタブを押したら step 1 へ
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 0 && v === 'dungeon') {
      G.view = v; renderAll(); ensureLoop();
      tutStep(1);
      return;
    }
    // チュートリアル step 4: ステータスタブを押したら step 41(SP割り振り) へ
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 4 && v === 'status') {
      G.statusTab = 'skill';
      G.view = v; renderAll(); ensureLoop();
      setTimeout(() => {
        if (G.p.sp < 3) { G.p.sp = 3; renderHUD(); renderStatus(); }
        G.tutorial.step = 41; renderTutorial();
      }, 300);
      return;
    }
    G.view = v; renderAll(); ensureLoop();
  },
  statusTab(d) {
    const t = d && d.tab;
    if (!['hero', 'gear', 'skill', 'mastery', 'data'].includes(t)) return;
    G.statusTab = t;
    renderStatus();
    const app = document.getElementById('app');
    if (app) app.scrollTop = 0;
    window.scrollTo(0, 0);
  },
  helpTab(d) {
    const t = d && d.tab;
    if (!['intro', 'world', 'skill', 'status', 'endgame'].includes(t)) return;
    G.helpTab = t;
    renderHelp();
    const app = document.getElementById('app');
    if (app) app.scrollTop = 0;
    window.scrollTo(0, 0);
  },
  townEnter(d) { G.townView = d.v; renderTown(); },
  townBack() { G.townView = 'plaza'; renderTown(); },
  inn() { const p = G.p; if (p.mp >= maxMp(p)) { toast('MPはすでに満タンです'); return; } p.mp = maxMp(p); save(); toast('ぐっすり眠った。MPが全回復した！'); renderAll(); },
  sell: sellBag,
  shopToggle(d) { const i = Number(d.i); G.shopSel[i] = !G.shopSel[i]; save(); renderTown(); },
  dep() { bankMove('dep', false); }, wd() { bankMove('wd', false); },
  depAll() { bankMove('dep', true); }, wdAll() { bankMove('wd', true); },
  diff(d) {
    const dg = dungeonOf(d.d), df = diffOf(d.df);
    if (!dg || !df || !isDiffUnlocked(G.p, dg, df)) { toast('この難易度はまだ解放されていません'); return; }
    G.sel[d.d] = d.df; save(); renderDungeonSelect();
  },
  go(d) {
    if (d.d === 'B' && G.p) (G.p.goalFlags = G.p.goalFlags || {}).tryB = true;
    // チュートリアル step 1: ダンジョンA novice を選んだら step 2 へ
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 1) {
      if (d.d === 'A' && G.sel['A'] === 'novice') {
        // ヒール取得に必要なSPを保証（生命枠3SP必要）
        if (G.p.sp < 3) G.p.sp = 3;
        startRun(d.d, G.sel[d.d]);
        tutStep(2);
        return;
      }
    }
    startRunGuarded(d.d, G.sel[d.d]);
  },
  dangerCancel() { G._pendingRun = null; closeModal(); },
  dangerGo() { const r = G._pendingRun; G._pendingRun = null; closeModal(); if (r) startRun(r.d, r.df); },
  speed(d) { G.opts.speed = Number(d.v); save(); renderBattle(); ensureLoop(); },
  autoSkill() { G.opts.autoSkill = !G.opts.autoSkill; save(); renderBattle(); },
  skill(d) {
    const run = G.run; if (!run) return;
    run.queued = run.queued === d.id ? null : d.id; run.skKey = ''; renderBattle();
  },
  potion(d) { usePotion(d.k); },
  retreat() {
    if (!G.run) return;
    finishRun('retreat');
    // チュートリアル step 3: 撤退後はモーダルを自動で閉じて街に戻り、step 4 へ
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 3) {
      G.noTimer = false;
      setTimeout(() => {
        closeModal();
        G.view = 'town'; G.townView = 'plaza';
        renderAll();
        setTimeout(() => tutStep(4), 150);
      }, 600);
    }
  },
  gearSlot(d) { G.gearSlot = d.slot === 'armor' ? 'armor' : 'weapon'; renderStatus(); },
  equip(d) {
    const p = G.p, it = p.bag.find(x => x.id === Number(d.id)); if (!it) return;
    p.bag = p.bag.filter(x => x !== it);
    if (p[it.slot]) p.bag.push(p[it.slot]);
    p[it.slot] = it; (p.goalFlags = p.goalFlags || {}).equip = true; save(); renderAll();
  },
  mEquip(d) {
    // 結果画面から装備を変更し、比較表示を更新する（スクロール位置は維持）
    const sh = $('#m-sheet'), st = sh ? sh.scrollTop : 0;
    G._pwArm = Date.now();
    ACTS.equip(d);
    openModal();
    const sh2 = $('#m-sheet'); if (sh2) sh2.scrollTop = st;
  },
  lock(d) { const it = G.p.bag.find(x => x.id === Number(d.id)); if (it) { it.locked = !it.locked; save(); renderStatus(); } },
  learn(d) {
    // 旧互換: data-act="learn" は廃止、spAlloc経由に統合
  },
  spAlloc(d) {
    // d.tree: ツリーID, d.amount: 割り振るSP数
    const p = G.p;
    const trees = getCharTrees(p && p.skin);
    const tree = trees.find(t => t.id === d.tree) || SKILL_TREES.find(t => t.id === d.tree);
    if (!tree) return;
    if (!tree.unlockWhen(p)) { toast('このスキル枠はまだ解放されていません'); return; }
    const amount = Number(d.amount) || 1;
    if (p.sp < amount) { toast('SPが足りません'); return; }
    const curPts = p.skillPts[d.tree] || 0;
    let cap = tree.maxSp;
    if (tree.stage2When && !tree.stage2When(p)) cap = Math.min(cap, 10);
    else if (tree.stage3When && !tree.stage3When(p)) cap = Math.min(cap, 20);
    if (curPts >= cap) {
      const msg = (cap === 10 && tree.stage2Desc) || (cap === 20 && tree.stage3Desc) || 'このスキル枠はすでに最大です';
      toast(msg); return;
    }
    if (curPts + amount > cap) { toast(`最大${cap}SPまでしか割り振れません`); return; }
    const prevPts = curPts;
    p.sp -= amount;
    p.skillPts[d.tree] = curPts + amount;
    if (p.chars && p.chars[p.skin]) p.chars[p.skin].skillPts[d.tree] = p.skillPts[d.tree];
    // マイルストーンチェック：新たに到達したSP閾値のスキルを自動解放
    for (const ms of tree.milestones) {
      if (prevPts < ms.sp && p.skillPts[d.tree] >= ms.sp) {
        if (ms.id && SK[ms.id]) {
          p.skills[ms.id] = true;
          toast(`「${ms.name}」を習得した！`);
        } else if (ms.passive) {
          p.passiveSkills[ms.passive] = true;
          toast(`パッシブ「${ms.name}」を獲得した！`);
        }
      }
    }
    p.hp = Math.min(maxHp(p), p.hp);
    p.mp = Math.min(maxMp(p), p.mp);
    save(); checkAchievements('sp'); renderHUD(); renderStatus();
    // チュートリアル step 41: 現キャラの初期スキルを取得したら step 5 へ
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 41) {
      const tutTgt = getCharTutorialTarget(p.skin);
      if (G.p.skills[tutTgt.skillId]) {
        setTimeout(() => tutStep(5), 400);
      }
    }
  },
  spAllocReset(d) {
    // ツリーリセット（確認フラグ）
    const p = G.p;
    const key = 'resetTree_' + d.tree;
    if (!G[key]) {
      G[key] = true;
      renderStatus();
      setTimeout(() => { if (G[key]) { delete G[key]; if (G.view === 'status') renderStatus(); } }, 4000);
      return;
    }
    delete G[key];
    const trees = getCharTrees(p && p.skin);
    const tree = trees.find(t => t.id === d.tree) || SKILL_TREES.find(t => t.id === d.tree);
    if (!tree) return;
    const cost = skillResetCost(p);
    if (p.gold < cost) { toast(`リセットには ${fmt(cost)}G 必要です`); return; }
    p.gold -= cost;
    const pts = p.skillPts[d.tree] || 0;
    // SPを返還
    p.sp += pts;
    p.skillPts[d.tree] = 0;
    if (p.chars && p.chars[p.skin]) p.chars[p.skin].skillPts[d.tree] = 0;
    // このツリーのスキル・パッシブを削除
    for (const ms of tree.milestones) {
      if (ms.id) delete p.skills[ms.id];
      if (ms.passive) delete p.passiveSkills[ms.passive];
    }
    // 進化枠が解放条件を満たさなくなった場合、その枠もリセット
    const checkTrees = trees.some(t => t.id === d.tree) ? trees : SKILL_TREES;
    for (const evoTree of checkTrees) {
      if (evoTree.id === checkTrees[0].id) continue;
      if (!evoTree.unlockWhen(p) && (p.skillPts[evoTree.id] || 0) > 0) {
        const evoPts = p.skillPts[evoTree.id];
        p.sp += evoPts;
        p.skillPts[evoTree.id] = 0;
        if (p.chars && p.chars[p.skin]) p.chars[p.skin].skillPts[evoTree.id] = 0;
        for (const ms of evoTree.milestones) {
          if (ms.id) delete p.skills[ms.id];
          if (ms.passive) delete p.passiveSkills[ms.passive];
        }
        toast(`「${evoTree.name}」の条件を満たさなくなりリセットされました`);
      } else if (evoTree.stage2When && !evoTree.stage2When(p) && (p.skillPts[evoTree.id] || 0) > 10) {
        const excess = p.skillPts[evoTree.id] - 10;
        p.sp += excess;
        p.skillPts[evoTree.id] = 10;
        if (p.chars && p.chars[p.skin]) p.chars[p.skin].skillPts[evoTree.id] = 10;
        for (const ms of evoTree.milestones) if (ms.sp > 10) {
          if (ms.id) delete p.skills[ms.id];
          if (ms.passive) delete p.passiveSkills[ms.passive];
        }
        toast(`「${evoTree.name}」の第2段階が未解放となり10SPに戻りました`);
      }
    }
    // 未習得となった装備スキルをスロットから外す
    for (let i = 0; i < 3; i++) {
      const sid = p.equippedSkills[i];
      if (sid && !p.skills[sid]) p.equippedSkills[i] = null;
    }
    p.hp = Math.min(maxHp(p), p.hp);
    p.mp = Math.min(maxMp(p), p.mp);
    save();
    toast(`「${tree.name}」のSPをリセットしました`);
    renderHUD(); renderStatus();
  },
  equipSkill(d) {
    // d.id: skill id, d.slot: 0/1/2
    const p = G.p;
    const slot = Number(d.slot);
    if (slot < 0 || slot > 2) return;
    const id = d.id;
    if (!p.skills[id]) return;
    // 既に別スロットに装備中なら外す
    for (let i = 0; i < 3; i++) if (p.equippedSkills[i] === id) p.equippedSkills[i] = null;
    p.equippedSkills[slot] = id;
    if (p.chars && p.chars[p.skin]) p.chars[p.skin].equippedSkills = p.equippedSkills;
    save(); renderStatus();
    toast(`スロット${slot + 1}に「${SK[id].name}」をセットした`);
    // チュートリアル step 5: 現キャラの初期スキルをスロットに装備したら完了
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 5) {
      const tutTgt = getCharTutorialTarget(p.skin);
      if (id === tutTgt.skillId) {
        setTimeout(() => tutStep(6), 400);
      }
    }
  },
  unequipSkill(d) {
    const p = G.p;
    const slot = Number(d.slot);
    if (slot < 0 || slot > 2) return;
    const name = p.equippedSkills[slot] ? SK[p.equippedSkills[slot]]?.name : '';
    p.equippedSkills[slot] = null;
    if (p.chars && p.chars[p.skin]) p.chars[p.skin].equippedSkills = p.equippedSkills;
    save(); renderStatus();
    if (name) toast(`スロット${slot + 1}から「${name}」を外した`);
  },
  goLearnSkill() { G.view = 'status'; G.statusTab = 'skill'; renderAll(); },
  changeSkin(d) {
    if (G.run) { toast('ダンジョン攻略中はキャラを変更できません'); return; }
    const id = d && d.id;
    if (!CHAR_SKINS.find(s => s.id === id)) return;
    G.p.skin = id;
    syncActiveCharState(G.p);
    G.p.hp = Math.min(maxHp(G.p), G.p.hp);
    G.p.mp = Math.min(maxMp(G.p), G.p.mp);
    const spEl = $('#spr-player');
    if (spEl) spEl.innerHTML = getPlayerSVG();
    save(); renderHUD(); renderStatus();
    const skin = CHAR_SKINS.find(s => s.id === id);
    toast(`キャラクターを「${skin.name}（${skin.job}）」に変更しました`);
  },
  selectStartChar(d) {
    const id = d && d.id;
    if (!CHAR_SKINS.find(s => s.id === id)) return;
    G._charSelectPick = id;
    openCharSelectModal(id);
  },
  confirmStartChar() {
    const id = G._charSelectPick;
    if (!id || !CHAR_SKINS.find(s => s.id === id)) return;
    G.p.skin = id;
    syncActiveCharState(G.p);
    G.p.hp = maxHp(G.p);
    G.p.mp = maxMp(G.p);
    G._charSelectOpen = false;
    closeModal();
    save();
    renderAll();
    tutStartAfterCharSelect();
  },
  closeV9Notice() {
    if (G.p) { G.p.v9ResetNoticePending = false; save(); }
    closeModal();
  },
  autoEquipNow() { const n = equipBest(); if (n) (G.p.goalFlags = G.p.goalFlags || {}).equip = true; save(); toast(n ? '最強の装備に切り替えました' : 'すでに最強の装備です'); renderAll(); },
  autoEquipToggle() { G.opts.autoEquip = !G.opts.autoEquip; G.opts.autoEquipV2 = true; save(); renderStatus(); },
  seToggle() { G.opts.se = G.opts.se === false; save(); renderStatus(); Sound.play('click'); },
  bgmToggle() { G.opts.bgm = !G.opts.bgm; Sound.unlock(); Sound.bgmUpdate(); save(); renderStatus(); },
  seVolSet(d) { G.opts.seVol = Number(d.v); save(); renderStatus(); Sound.play('heal'); },
  bgmVolSet(d) { G.opts.bgmVol = Number(d.v); Sound.bgmUpdate(); save(); renderStatus(); },
  fxToggle() { G.opts.fx = G.opts.fx === false; if (!G.opts.fx && typeof clearAllBattleFx === 'function') clearAllBattleFx(); save(); renderStatus(); if (G.run) renderBattle(); },
  reset() {
    if (G.run) { toast('探索中は初期化できません'); return; }
    if (!G.resetArm) { G.resetArm = true; renderStatus(); setTimeout(() => { if (G.resetArm) { G.resetArm = false; if (G.view === 'status') renderStatus(); } }, 4000); return; }
    G.resetArm = false; G.p = newPlayer(); G.last = null;
    G.view = 'town'; G.townView = 'plaza';
    // チュートリアルフラグも削除
    try { localStorage.removeItem(TUT_SAVE_KEY); } catch (e) {}
    G.tutorial = null; tutHide();
    save();
    toast('セーブデータを初期化しました'); renderAll();
    // tutInitの遅延をなくし即座に開始（遅延中にユーザーが操作するのを防ぐ）
    tutInit();
  },
  // テスト用: 全種類の武器・防具（★1〜5 × レア度4種）をバッグに追加
  debugAllGear() {
    if (!IS_DEV_BUILD) return;
    if (G.run) { toast('探索中は使えません'); return; }
    const p = G.p; let n = 0;
    for (const slot of ['weapon', 'armor']) for (let star = 1; star <= SMITH_MAX_STAR; star++) for (let r = 0; r < 4; r++) {
      if (p.bag.length >= (p.bagCap || BAG_CAP)) break;
      p.bag.push(mkItem(p, { slot, star, rarity: r, roll: 1 })); n++;
    }
    save(); toast(`テスト用装備を${n}個追加しました`); renderAll();
  },
  openFxDebug() {
    if (!IS_DEV_BUILD) return;
    openFxDebugModal();
  },
  fxDbgSkill(d) {
    if (!IS_DEV_BUILD || !d || !d.id) return;
    const s = SK[d.id];
    playSkillFx(d.id, (s && s.hits) || 1, fxDebugTarget());
  },
  fxDbgSpeed(d) {
    if (!IS_DEV_BUILD) return;
    const v = Number(d && d.v);
    if ([1, 2, 4].includes(v)) { _fxDbgState.speed = v; renderFxDebugControls(); }
  },
  fxDbgRageToggle() {
    if (!IS_DEV_BUILD) return;
    _fxDbgState.raged = !_fxDbgState.raged;
    renderFxDebugArena();
    renderFxDebugControls();
  },
  fxDbgRageBurst() {
    if (!IS_DEV_BUILD) return;
    _fxDbgState.raged = true;
    renderFxDebugArena();
    renderFxDebugControls();
    triggerRageFx(fxDebugTarget());
  },
  fxDbgBuff(d) {
    if (!IS_DEV_BUILD) return;
    const b = (d && d.v) || 'none';
    if (['none', 'atk', 'def', 'all'].includes(b)) {
      _fxDbgState.buff = b;
      syncBuffAura(fxDebugTarget());
      renderFxDebugControls();
    }
  },
  fxDbgEnemy(d) {
    if (!IS_DEV_BUILD) return;
    const e = (d && d.v) === 'boss' ? 'boss' : 'mob';
    _fxDbgState.enemy = e;
    renderFxDebugArena();
    renderFxDebugControls();
  },
  fxDbgStop() {
    if (!IS_DEV_BUILD) return;
    _fxDbgState.raged = false;
    _fxDbgState.buff = 'none';
    clearAllBattleFx(fxDebugTarget());
    renderFxDebugArena();
    renderFxDebugControls();
  },
  smithUpgrade(d) { smithUpgrade(d.id); },
  smithReforge(d) { smithReforge(d.id); },
  buyShop(d) { buyShopItem(d.id); },
  buyBuildBook() { buyBuildBook(); },
  npcTalk(d) { npcTalk(d.f); },
  openCredits() { showCredits(); },
  gachaGenre(d) { if (GACHA_GENRES.some(x => x.k === d.g)) { G.gcGenre = d.g; renderTown(); } },
  gachaPull(d) { const res = gachaPull(Number(d.n) === 10 ? 10 : 1, G.gcGenre); if (res) { renderTown(); renderHUD && renderHUD(); openGachaResult(res); } },
  gachaEquip(d) { const g = ensureGacha(G.p); if (!COS_SLOTS.some(s => s.k === d.slot)) return; if (!d.id) g.eq[d.slot] = null; else if (g.owned['cos:' + d.id] && cosById(d.id) && cosById(d.id).slot === d.slot) g.eq[d.slot] = d.id; save(); renderTown(); },
  gachaCollection() { G._gc = null; openGachaCollection('cos'); },
  gcTab(d) { openGachaCollection(d.tab); },
  gcTry(d) { const st = gcState(); if (!COS_SLOTS.some(s => s.k === d.slot)) return; if (!d.id) st.eq[d.slot] = null; else if (cosById(d.id) && cosById(d.id).slot === d.slot) st.eq[d.slot] = d.id; openGachaCollection(null, true); },
  gcFrame(d) { const st = gcState(); st.frame = d.id && DEX_FRAMES.some(f => f.id === d.id) ? d.id : null; openGachaCollection(null, true); },
  gcOutfit(d) { const st = gcState(), t = /^\d+$/.test(String(d.tier)) ? Number(d.tier) : String(d.tier || ''); if (!CHAR_SKINS.some(h => h.id === d.skin) || (t && !outfitValid(d.skin, t))) return; st.outfit[d.skin] = t; st.view = d.skin; openGachaCollection(null, true); },
  gcTitle(d) { const p = G.p, g = ensureGacha(p); if (!g.owned['title:' + d.id]) { toast('未入手の称号です'); return; } p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] }; p.tower.title = p.tower.title === d.id ? null : d.id; save(); openGachaCollection(null, true); },
  gcApply() {
    const g = ensureGacha(G.p), st = gcState();
    for (const s of COS_SLOTS) { const id = st.eq[s.k]; if (id && !g.owned['cos:' + id]) { toast('未入手の景品は反映できません'); return; } }
    if (st.frame && !g.owned['frame:' + st.frame]) { toast('未入手の景品は反映できません'); return; }
    for (const h of CHAR_SKINS) { const t = st.outfit[h.id] || 0; if (t && !g.owned['outfit:o_' + h.id + '_' + t]) { toast('未入手の景品は反映できません'); return; } }
    for (const s of COS_SLOTS) g.eq[s.k] = st.eq[s.k] || null;
    for (const h of CHAR_SKINS) g.outfit[h.id] = st.outfit[h.id] || 0;
    g.frame = st.frame || null; save(); toast('見た目を変更した'); G._gc = null; openGachaCollection(); renderTown(); renderAll();
  },
  gcAtk() { const st = gcState(); st.atk = !st.atk; openGachaCollection(null, true); },
  gcReset() { G._gc = null; openGachaCollection(); },
  gcClose() { gcClose(); },
  gcSkip() { gachaRevealEnd(); },
  gachaFrame(d) { const g = ensureGacha(G.p); if (!d.id) g.frame = null; else if (g.owned['frame:' + d.id]) g.frame = d.id; save(); renderTown(); },
  loginClaim() { loginClaim(); },
  openStoryList() { openStoryList(); },
  storyPlay(d) { closeModal(); playStory(d.id); },
  hintOk(d) { const p = G.p; if (!p.hints) p.hints = {}; p.hints[d.k] = true; save(); renderAll(); },
  goalGo(d) {
    const t = d.g;
    if (t === 'dungeon') { G.view = 'dungeon'; }
    else { G.view = 'status'; G.statusTab = t; }
    renderAll();
  },
  hideGoals() { G.p.goalsHidden = true; save(); renderAll(); },
  showGoals() { G.p.goalsHidden = false; save(); renderAll(); },
  tutRestart() {
    if (G.run) { toast('ダンジョン攻略中はできません'); return; }
    G.tutorial = { step: 0 }; G._charSelectOpen = false; G.view = 'town'; G.townView = 'plaza';
    try { localStorage.removeItem(TUT_SAVE_KEY); } catch (e) {}
    renderAll(); tutIntro(() => tutStep(0));
  },
  switchBuild(d) { switchBuild(d.i); },
  resetAllTrees() { resetAllTrees(); },
  renameBuild() {
    const p = G.p, c = p.chars[p.skin], el = $('#build-name');
    if (!el) return;
    const nm = el.value.replace(/\s+/g, ' ').trim().slice(0, 8);
    if (!nm) { toast('名前を入力してください'); return; }
    c.builds[c.activeBuild].name = nm; save(); toast('ビルド名を変更した'); renderStatus();
  },
  expandBag() { expandBag(); },
  autoSellRaritySet(d) {
    const v = Number(d.v);
    if (v >= -1 && v <= 3) { G.autoSellRarity = v; save(); renderTown(); }
  },
  mRetry() {
    const l = G.last; closeModal();
    if (l && l.daily) startDailyRun(l.daily.df);
    else if (l && l.tower) startTowerRun();
    else if (l && l.abyss) startAbyssRun(l.abyss.lv);
    else if (l) startRunGuarded(l.d.id, l.df.id);
  },
  abyssSel(d) { G.abyssLv = Number(d.lv) || 1; renderTown(); },
  goAbyss() { startAbyssRun(G.abyssLv || 1); },
  goTower() { startTowerRun(); },
  goDaily() { startDailyRun(G.dailyDf); },
  dgTab(d) { G.dgTab = d.tab === 'daily' ? 'daily' : 'normal'; renderDungeonSelect(); },
  dailyDf(d) { if (DAILY_DIFFS.some(x => x.id === d.df)) { G.dailyDf = d.df; try { localStorage.setItem(DAILY_DF_KEY, d.df); } catch (e) {} renderDungeonSelect(); } },
  openDex() { openDexModal(G.dexTab || 'enemies'); },
  openAch() { openDexModal('ach'); },
  dexFilter(d) { G.dexFilter = d.v; openDexModal(G.dexTab || 'enemies'); },
  dexTab(d) { openDexModal(d.tab || 'enemies'); },
  equipStatusTitle(d) {
    const p = G.p;
    p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] };
    if (!(p.tower.titles || []).includes(d.id)) return;
    p.tower.title = p.tower.title === d.id ? null : d.id;
    save(); renderStatus();
  },
  dexHint(d) {
    const el = $('#dex-hint-box');
    if (!el) return;
    const h = DEX_ITEM_HINTS[d.hkey] || '';
    el.textContent = d.label ? `${d.label}: ${h}` : h;
  },
  claimDex(d) {
    const res = claimDexReward(d.key);
    if (res && res.ok) openDexModal(G.dexTab || 'enemies');
  },
  towerRanking() { G.rankMsg = ''; openRankingModal(); },
  saveRankOptIn() {
    if (!isRankingSubmitConfigured()) { toast('ランキング送信は準備中です'); return; }
    const p = G.p; p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [], nick: '', rankOptIn: false, sentBest: 0 };
    const inEl = $('#rk-nick'), chkEl = $('#rk-agree'), msgEl = $('#rk-form-msg');
    const nc = cleanRankNick(inEl ? inEl.value : '');
    if (!nc.ok) { if (msgEl) msgEl.textContent = nc.error; toast(nc.error); return; }
    if (!chkEl || !chkEl.checked) {
      const m = '同意のチェックを入れてください';
      if (msgEl) msgEl.textContent = m; toast(m); return;
    }
    p.tower.nick = nc.name;
    p.tower.rankOptIn = true;
    save();
    G.rankMsg = '送信設定を保存しました';
    toast(G.rankMsg);
    openRankingModal();
  },
  clearRankOptIn() {
    const p = G.p;
    if (p.tower) { p.tower.rankOptIn = false; save(); }
    G.rankMsg = 'ランキング送信を解除しました';
    toast(G.rankMsg);
    openRankingModal();
  },
  async manualRankSubmit() {
    const p = G.p;
    await submitTowerRank(p && p.tower ? p.tower.best : 0, { manual: true });
    if (G.modalOpen && $('#rk-submit-box')) openRankingModal();
  },
  pickBless(d) { pickBlessing(d.id); },
  towerBlessList() { openBlessListModal(); },
  closeTowerModal() { closeModal(); },
  openRecovery() { openRecoveryModal(G._saveBlocked ? 'セーブデータを読み込めませんでした。' : ''); },
  recoverRestore(d) { recoveryRestore(Number(d.idx)); },
  recoverNew() { recoveryNew(); },
  reloadPage() { try { location.reload(); } catch (e) {} },
  towerShop() { openTowerShopModal(); },
  buyTowerShop(d) {
    const p = G.p, item = TOWER_SHOP.find(x => x.id === d.id);
    if (!item || !p.ending) return;
    p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] };
    if (p.tower.coins < item.price) { toast('回廊コインが足りません'); return; }
    if (p.bag.length >= (p.bagCap || BAG_CAP)) { toast('バッグがいっぱいです'); return; }
    p.tower.coins -= item.price;
    const it = mkItem(p, { slot: item.slot, star: item.star, rarity: 4, roll: 1.0 });
    const out = receiveItem(it);
    save();
    toast(`${itemName(it)}を手に入れた！${out === 'equipped' ? '（装備）' : ''}`);
    openTowerShopModal(); renderTown();
  },
  buyTowerTitle(d) {
    const p = G.p, t = TOWER_TITLES.find(x => x.id === d.id && x.price);
    if (!t || !p.ending) return;
    p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] };
    if (p.tower.titles.includes(t.id)) return;
    if (p.tower.coins < t.price) { toast('回廊コインが足りません'); return; }
    p.tower.coins -= t.price;
    p.tower.titles.push(t.id);
    p.tower.title = t.id;
    save();
    toast(`称号「${t.name}」を獲得した！`);
    openTowerShopModal();
  },
  masteryUp(d) {
    const p = G.p, item = MASTERY_LIST.find(x => x.id === d.id);
    if (!item) return;
    if (!p.ending) { toast('本編クリア（虚空の神殿・極級）で解放されます'); return; }
    p.mastery = p.mastery || {};
    const cur = p.mastery[item.id] || 0;
    if (cur >= MASTERY_MAX) { toast('最大ランクです'); return; }
    const cost = masteryCost(cur + 1);
    if (p.sp < cost) { toast(`SPが足りません（必要: ${cost}SP）`); return; }
    p.sp -= cost;
    p.mastery[item.id] = cur + 1;
    p.hp = Math.min(maxHp(p), p.hp);
    p.mp = Math.min(maxMp(p), p.mp);
    save(); checkAchievements('sp'); renderHUD(); renderStatus();
  },
  masteryReset() {
    const p = G.p;
    if (!p.ending) return;
    const m = p.mastery || {};
    let refund = 0;
    for (const item of MASTERY_LIST) {
      const r = m[item.id] || 0;
      for (let k = 1; k <= r; k++) refund += masteryCost(k);
    }
    if (refund <= 0) { toast('リセットする極意がありません'); return; }
    const cost = skillResetCost(p);
    if (p.gold < cost) { toast(`リセットには ${fmt(cost)}G 必要です`); return; }
    p.gold -= cost;
    p.sp += refund;
    p.mastery = {};
    p.hp = Math.min(maxHp(p), p.hp);
    p.mp = Math.min(maxMp(p), p.mp);
    save(); toast(`極意をリセットし、${refund}SPが戻りました`);
    renderHUD(); renderStatus();
  },
  equipTowerTitle(d) {
    const p = G.p;
    p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] };
    if (!p.tower.titles.includes(d.id)) return;
    p.tower.title = (p.tower.title === d.id) ? null : d.id;
    save();
    openTowerShopModal();
    if (G.view === 'status') renderStatus();
  },
  mTown() {
    const wasEnding = !!(G.last && G.last.ending);
    closeModal();
    if (wasEnding && G.p && G.p.ending && !G.p.unlockNoticeShown) {
      G.p.unlockNoticeShown = true;
      save();
      openUnlockNoticeModal();
      return;
    }
    G.view = 'town'; renderAll(); ensureLoop();
  },
  jumpNotice(d) {
    closeModal();
    if (d.to === 'tower' || d.to === 'abyss') {
      G.view = 'dungeon'; renderAll(); ensureLoop();
    } else if (d.to === 'status') {
      if (d.tab && ['hero', 'gear', 'skill', 'mastery', 'data'].includes(d.tab)) G.statusTab = d.tab;
      G.view = 'status'; renderAll(); ensureLoop();
    } else if (d.to === 'dex') {
      G.view = 'status'; renderAll(); openDexModal('enemies');
    }
  },
  exportSaveFile() {
    const payload = buildSavePayload();
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const fname = `rogue-save-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    writeBackupMeta({ lastExportAt: Date.now() });
    toast('セーブファイルを書き出しました');
    if (G.view === 'status') renderStatus();
  },
  async exportSaveCode() {
    const payload = buildSavePayload();
    const code = await encodeSaveCode(payload);
    writeBackupMeta({ lastExportAt: Date.now() });
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
        copied = true;
      }
    } catch (e) {}
    if (copied) {
      toast('セーブコードをクリップボードにコピーしました');
      if (G.view === 'status') renderStatus();
    } else {
      openExportCodeModal(code);
      if (G.view === 'status') renderStatus();
    }
  },
  openImportModal() {
    if (G.run) { toast('探索中は読み込めません'); return; }
    G._pendingImport = null;
    openImportSaveModal(null, '');
  },
  async validateImportInput() {
    const el = $('#imp-code');
    const txt = el ? el.value : '';
    const res = await decodeAndValidateSaveInput(txt);
    if (!res.ok) {
      G._pendingImport = null;
      openImportSaveModal(null, res.error);
      return;
    }
    G._pendingImport = res;
    openImportSaveModal(res, '');
  },
  confirmImportSave() {
    if (G.run) { toast('探索中は読み込めません'); return; }
    const pend = G._pendingImport;
    if (!pend || !pend.payload) return;
    G._pendingImport = null;
    if (applyImportedSave(pend.payload)) {
      closeModal();
      toast('セーブデータを読み込みました');
    } else {
      openImportSaveModal(null, 'セーブデータの読み込みに失敗しました。');
    }
  },
  restoreIdbSave() {
    const pend = G._pendingIdbRestore;
    G._pendingIdbRestore = null;
    if (!pend || !pend.raw) { closeModal(); return; }
    try { localStorage.setItem(SAVE_KEY, pend.raw); } catch (e) {}
    if (load()) {
      G.tutorial = { done: true };
      try { localStorage.setItem(TUT_SAVE_KEY, '1'); } catch (e) {}
      if (typeof tutHide === 'function') tutHide();
      closeModal();
      renderAll();
      toast('前回のセーブデータを復元しました');
    } else {
      closeModal();
      toast('復元に失敗しました');
    }
  },
  dismissIdbRestore() {
    G._pendingIdbRestore = null;
    closeModal();
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 0) {
      openCharSelectModal(G._charSelectPick || null);
    }
  },
  openBugReport() {
    openBugReportModal('', false);
  },
  toggleAnalyticsOptOut() {
    const next = !isAnalyticsOptOut();
    setAnalyticsOptOut(next);
    if (G.view === 'status') renderStatus();
  },
  async submitBugReport() {
    const kind = ($('#br-kind') && $('#br-kind').value) || '不具合';
    const text = ($('#br-text') && $('#br-text').value) || '';
    const agree = !!($('#br-agree') && $('#br-agree').checked);
    const diag = ($('#br-diag') && $('#br-diag').value) || buildBugDiag();
    if (!isBugReportConfigured()) { openBugReportModal('準備中です', true); return; }
    if (!agree) { openBugReportModal('送信への同意チェックが必要です', true); return; }
    const wait = bugReportWaitSec();
    if (wait > 0) { openBugReportModal(`連続送信は${BUGREPORT_CFG.rateLimitSec}秒に1回までです（あと${wait}秒）`, true); return; }
    const res = await sendBugReport(kind, text, diag);
    if (res.ok) {
      closeModal();
      toast('送信しました。ありがとうございます');
    } else if (res.queued) {
      closeModal();
      toast('オフラインのため端末に保存しました（接続時に再送します）');
    } else if (res.reason === 'invalid_length') {
      openBugReportModal(`内容は${BUGREPORT_CFG.textMin}〜${BUGREPORT_CFG.textMax}文字で入力してください`, true);
    } else if (res.reason === 'rate_limit') {
      openBugReportModal(`連続送信は${BUGREPORT_CFG.rateLimitSec}秒に1回までです（あと${res.wait}秒）`, true);
    } else {
      openBugReportModal('送信できませんでした', true);
    }
  }
};

