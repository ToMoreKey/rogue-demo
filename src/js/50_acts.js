const ACTS = {
  nav(d) {
    const v = d.v;
    if (v === 'town' && G.run) { toast('探索中は街に戻れません。先に撤退してください'); return; }
    // チュートリアル step 0: ダンジョンタブを押したら step 1 へ
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 0 && v === 'dungeon') {
      G.view = v; renderAll(); ensureLoop();
      tutStep(1);
      return;
    }
    // チュートリアル step 4: ステータスタブを押したら step 41(SP割り振り) へ
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 4 && v === 'status') {
      G.view = v; renderAll(); ensureLoop();
      setTimeout(() => {
        if (G.p.sp < 3) { G.p.sp = 3; renderHUD(); renderStatus(); }
        G.tutorial.step = 41; renderTutorial();
      }, 300);
      return;
    }
    G.view = v; renderAll(); ensureLoop();
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
    startRun(d.d, G.sel[d.d]);
  },
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
  equip(d) {
    const p = G.p, it = p.bag.find(x => x.id === Number(d.id)); if (!it) return;
    p.bag = p.bag.filter(x => x !== it);
    if (p[it.slot]) p.bag.push(p[it.slot]);
    p[it.slot] = it; save(); renderAll();
  },
  lock(d) { const it = G.p.bag.find(x => x.id === Number(d.id)); if (it) { it.locked = !it.locked; save(); renderStatus(); } },
  learn(d) {
    // 旧互換: data-act="learn" は廃止、spAlloc経由に統合
  },
  spAlloc(d) {
    // d.tree: ツリーID, d.amount: 割り振るSP数
    const p = G.p;
    const tree = SKILL_TREES.find(t => t.id === d.tree);
    if (!tree) return;
    if (!tree.unlockWhen(p)) { toast('このスキル枠はまだ解放されていません'); return; }
    const amount = Number(d.amount) || 1;
    if (p.sp < amount) { toast('SPが足りません'); return; }
    const curPts = p.skillPts[d.tree] || 0;
    if (curPts >= tree.maxSp) { toast('このスキル枠はすでに最大です'); return; }
    if (curPts + amount > tree.maxSp) { toast(`最大${tree.maxSp}SPまでしか割り振れません`); return; }
    const prevPts = curPts;
    p.sp -= amount;
    p.skillPts[d.tree] = curPts + amount;
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
    save(); renderHUD(); renderStatus();
    // チュートリアル step 41: ヒールを取得したら step 5 へ
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 41) {
      if (G.p.skills['heal']) {
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
    const tree = SKILL_TREES.find(t => t.id === d.tree);
    if (!tree) return;
    const cost = skillResetCost(p);
    if (p.gold < cost) { toast(`リセットには ${fmt(cost)}G 必要です`); return; }
    p.gold -= cost;
    const pts = p.skillPts[d.tree] || 0;
    // SPを返還
    p.sp += pts;
    p.skillPts[d.tree] = 0;
    // このツリーのスキル・パッシブを削除
    for (const ms of tree.milestones) {
      if (ms.id) delete p.skills[ms.id];
      if (ms.passive) delete p.passiveSkills[ms.passive];
    }
    // 進化枠が解放条件を満たさなくなった場合、その枠もリセット
    for (const evoTree of SKILL_TREES) {
      if (!evoTree.unlockWhen(p) && (p.skillPts[evoTree.id] || 0) > 0) {
        const evoPts = p.skillPts[evoTree.id];
        p.sp += evoPts;
        p.skillPts[evoTree.id] = 0;
        for (const ms of evoTree.milestones) {
          if (ms.id) delete p.skills[ms.id];
          if (ms.passive) delete p.passiveSkills[ms.passive];
        }
        toast(`「${evoTree.name}」の条件を満たさなくなりリセットされました`);
      }
    }
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
    p.equippedSkills = p.equippedSkills.map(s => s === id ? null : s);
    p.equippedSkills[slot] = id;
    save(); renderStatus();
    toast(`スロット${slot + 1}に「${SK[id].name}」をセットした`);
    // チュートリアル step 5: ヒールをスロットに装備したら完了
    if (G.tutorial && !G.tutorial.done && G.tutorial.step === 5 && id === 'heal') {
      setTimeout(() => tutStep(6), 400);
    }
  },
  unequipSkill(d) {
    const p = G.p;
    const slot = Number(d.slot);
    if (slot < 0 || slot > 2) return;
    const name = p.equippedSkills[slot] ? SK[p.equippedSkills[slot]]?.name : '';
    p.equippedSkills[slot] = null;
    save(); renderStatus();
    if (name) toast(`スロット${slot + 1}から「${name}」を外した`);
  },
  goLearnSkill() { G.view = 'status'; renderAll(); setTimeout(() => { const el = document.querySelector('#view-status .panel:nth-child(4)'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80); },
  changeSkin(d) {
    const id = d.id;
    if (!CHAR_SKINS.find(s => s.id === id)) return;
    G.p.skin = id;
    $('#spr-player').innerHTML = getPlayerSVG();
    save(); renderStatus();
    const skin = CHAR_SKINS.find(s => s.id === id);
    toast(`外見を「${skin.name}（${skin.job}）」に変更しました`);
  },
  autoEquipNow() { const n = equipBest(); save(); toast(n ? '装備を最適化しました' : 'これ以上強い装備はありません'); renderAll(); },
  autoEquipToggle() { G.opts.autoEquip = !G.opts.autoEquip; save(); renderStatus(); },
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
    if (G.run) { toast('探索中は使えません'); return; }
    const p = G.p; let n = 0;
    for (const slot of ['weapon', 'armor']) for (let star = 1; star <= SMITH_MAX_STAR; star++) for (let r = 0; r < 4; r++) {
      if (p.bag.length >= (p.bagCap || BAG_CAP)) break;
      p.bag.push(mkItem(p, { slot, star, rarity: r, roll: 1 })); n++;
    }
    save(); toast(`テスト用装備を${n}個追加しました`); renderAll();
  },
  smithUpgrade(d) { smithUpgrade(d.id); },
  smithReforge(d) { smithReforge(d.id); },
  buyShop(d) { buyShopItem(d.id); },
  expandBag() { expandBag(); },
  autoSellRaritySet(d) {
    const v = Number(d.v);
    if (v >= -1 && v <= 3) { G.autoSellRarity = v; save(); renderTown(); }
  },
  mRetry() {
    const l = G.last; closeModal();
    if (l) startRun(l.d.id, l.df.id);
  },
  mTown() { closeModal(); G.view = 'town'; renderAll(); ensureLoop(); }
};

