
/* ================= toast ================= */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  if (/足りません|できません|不可|最大です|持てません/.test(msg)) Sound.play('error');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ================= item generation ================= */
function rollRarity(diff, boost) {
  const w = diff.rar.map((x, i) => [i, x * (boost ? (i === 0 ? 0.35 : 1 + 0.5 * i) : 1)]);
  return weighted(w);
}
function genItem(diff, boost = false, slot = null, maxStar = MAX_STAR, forceStar = null) {
  const p = G.p;
  const pairs = diff.stars.filter(([s]) => s <= maxStar);
  const star = forceStar || weighted(pairs.length ? pairs : [[maxStar, 100]]);
  const it = mkItem(p, {
    slot: slot || (rnd() < 0.5 ? 'weapon' : 'armor'),
    star,
    rarity: rollRarity(diff, boost),
    roll: Math.round((0.5 + rnd() * 0.5) * 100) / 100,
    prop: null
  });
  if (it.slot === 'weapon' && rnd() < 0.3) { const pk = pick(Object.keys(PROPS)); it.prop = pk; it.props = [pk]; }
  return it;
}
function rollUniqueProps(slot, count) {
  const pool = Object.keys(slot === 'armor' ? ARMOR_PROPS : PROPS);
  const out = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  return out;
}
function genMythic9(slot) {
  const s = slot || (rnd() < 0.5 ? 'weapon' : 'armor');
  const cnt = s === 'weapon'
    ? weighted([[0, 15], [1, 40], [2, 30], [3, 15]])
    : weighted([[0, 30], [1, 45], [2, 25]]);
  const ps = rollUniqueProps(s, cnt);
  return mkItem(G.p, { slot: s, star: 9, rarity: 4, roll: Math.round((0.75 + rnd() * 0.25) * 100) / 100, props: ps });
}
// returns a short outcome string for the log: 'equipped' | 'bag' | 'sold'
function receiveItem(it) {
  const p = G.p, slot = it.slot, cap = p.bagCap || BAG_CAP;
  if (it.rarity >= 1) Sound.play('drop' + Math.min(4, it.rarity));
  recordDexItem(p, it);
  checkAchievements('item');
  if (G.opts.autoEquip && !hasProp(it, 'madness') && gearScore(it) > gearScore(p[slot])) {
    const old = p[slot];
    p[slot] = it;
    if (old) {
      if (p.bag.length < cap) p.bag.push(old); else p.gold += sellValue(old);
    }
    return 'equipped';
  }
  // 自動売却フィルター
  // 今の装備より強い装備は、自分で装備を選べるよう自動売却しない（手動装備が既定のため）
  const betterThanNow = gearScore(it) > gearScore(p[slot]);
  if (G.autoSellRarity >= 0 && it.rarity <= G.autoSellRarity && !it.locked && !betterThanNow) {
    const v = sellValue(it); p.gold += v; if (G.run) G.run.gold += v; it.soldFor = v; return 'sold';
  }
  if (p.bag.length >= cap) { const v = sellValue(it); p.gold += v; if (G.run) G.run.gold += v; it.soldFor = v; return 'sold'; }
  p.bag.push(it);
  return 'bag';
}
function equipBest() {
  const p = G.p; let n = 0;
  for (const slot of ['weapon', 'armor']) {
    const cur = p[slot];
    let best = cur && !hasProp(cur, 'madness') ? cur : null;
    for (const it of p.bag) if (it.slot === slot && !hasProp(it, 'madness') && gearScore(it) > gearScore(best)) best = it;
    if (best && best !== cur) {
      p.bag = p.bag.filter(x => x !== best);
      if (cur) p.bag.push(cur);
      p[slot] = best; n++;
    }
  }
  return n;
}

/* ================= dungeon run ================= */
const dungeonOf = id => DUNGEONS.find(d => d.id === id);
const diffOf = id => DIFFS.find(d => d.id === id);

function startRun(dId, dfId) {
  if (G.run) return;
  const d = dungeonOf(dId), df = diffOf(dfId);
  if (!d || !df) return;
  if (!isDiffUnlocked(G.p, d, df)) { toast('この難易度はまだ解放されていません'); return; }
  G.run = {
    d, df, floors: df.floors, floor: 0, cleared: 0, phase: 'next', enemy: null, queued: null, guard: 0,
    gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 }, kills: 0, startLv: G.p.lv, skKey: '',
    skillCt: {}  // スキルクールタイム管理 { skillId: remaining_turns }
  };
  G.run.snap = statSnap(G.p);
  G.view = 'dungeon';
  $('#log').innerHTML = '';
  addLog(`ダンジョン${d.id}「${d.name}」（${df.name}・全${df.floors}階層）に突入した！`, 'l-sys');
  renderAll(); ensureLoop();
}

const towerBand = floor => TOWER_CFG.bands.find(b => floor <= b.maxFloor) || TOWER_CFG.bands[TOWER_CFG.bands.length - 1];
function rollTowerBlessings(owned, count = 3) {
  const pool = TOWER_BLESSINGS.filter(b => !owned.includes(b.id));
  const out = [];
  while (out.length < count && pool.length > 0) {
    const idx = Math.floor(rnd() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}
function pickBlessing(id) {
  const run = G.run;
  if (!run || !run.tower || !run.tower.pendingChoice) return false;
  const b = run.tower.pendingChoice.find(x => x.id === id);
  if (!b) return false;
  run.tower.blessings.push(b.id);
  run.tower.pendingChoice = null;
  run.phase = 'next';
  const p = G.p;
  p.achStats = p.achStats || { totalGold: 0, blessings: 0, noDmgBoss: false };
  p.achStats.blessings = (p.achStats.blessings || 0) + 1;
  checkAchievements('bless');
  p.hp = Math.min(maxHp(p), p.hp);
  p.mp = Math.min(maxMp(p), p.mp);
  addLog(`祝福「${b.name}」を獲得！（${b.desc}）`, 'l-gold');
  if (!G.headless) { closeModal(); renderAll(); }
  ensureLoop();
  return true;
}
function startTowerRun() {
  if (G.run) return;
  if (!G.p || !G.p.ending) { toast('最終ボスを倒すと解放されます'); return; }
  G.run = {
    d: { id: 'T', name: '天蓋の塔', a1: '#1a1433', a2: '#0c091a', maxStar: 5 },
    df: DIFFS[4], floors: 0, floor: 0, cleared: 0, phase: 'next', enemy: null, queued: null, guard: 0,
    gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 }, kills: 0, startLv: G.p.lv, skKey: '',
    skillCt: {},
    tower: { blessings: [], reviveUsed: false, pendingChoice: null }
  };
  G.run.snap = statSnap(G.p);
  G.view = 'dungeon';
  $('#log').innerHTML = '';
  addLog('無限回廊「天蓋の塔」に突入した！', 'l-sys');
  renderAll(); ensureLoop();
}

function startAbyssRun(lv) {
  if (G.run) return;
  const n = Number(lv) || 1;
  const dfA = ABYSS_CFG.diffs[n];
  if (!dfA) return;
  if (!isAbyssDiffUnlocked(G.p, n)) { toast('この深淵難度はまだ解放されていません'); return; }
  G.run = {
    d: { id: 'Z', name: `深淵（難度${n}）`, a1: '#15081e', a2: '#07020c', maxStar: 5 },
    df: DIFFS[4], floors: ABYSS_CFG.floors, floor: 0, cleared: 0, phase: 'next', enemy: null, queued: null, guard: 0,
    gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 }, kills: 0, startLv: G.p.lv, skKey: '',
    skillCt: {},
    abyss: { lv: n, dfA, mythicDrops: [] }
  };
  G.run.snap = statSnap(G.p);
  G.view = 'dungeon';
  $('#log').innerHTML = '';
  addLog(`深淵（難度${n}・全${ABYSS_CFG.floors}階層）に突入した！（有効な呪い: ${n}個）`, 'l-sys');
  renderAll(); ensureLoop();
}

function nextFloor() {
  const run = G.run;
  run.floor++;
  if (run.tower) {
    const boss = run.floor % 10 === 0;
    const mini5 = !boss && run.floor % 10 === 5;
    const evCh = 0.16 + towerEff(run).eventBoost;
    if (!boss && !mini5 && run.floor >= 2 && rnd() < evCh) { runEvent(); run.phase = 'pause'; run.cleared++; }
    else spawnEnemy(boss, mini5);
    return;
  }
  if (run.floor > run.floors) { finishRun('clear'); return; }
  const boss = run.floor === run.floors;
  const miniboss = !boss && run.floor >= 10 && run.floor % 10 === 0;
  if (!boss && !miniboss && run.floor >= 2 && rnd() < 0.16) { runEvent(); run.phase = 'pause'; run.cleared++; }
  else spawnEnemy(boss, miniboss);
}

const cellPow = run => run.d.pow[DIFFS.indexOf(run.df)];
function scaleOf(run, floor) {
  if (run.tower) return TOWER_CFG.basePow * Math.pow(TOWER_CFG.growth, Math.max(0, floor - 1));
  if (run.abyss) return run.abyss.dfA.pow * (1 + TUNE.floorSpan * (floor - 1) / Math.max(1, run.floors - 1));
  return cellPow(run) * (1 + TUNE.floorSpan * (floor - 1) / Math.max(1, run.floors - 1));
}
function spawnEnemy(boss, miniboss = false) {
  const run = G.run, d = run.d;
  let base, name, bossFilter;
  if (run.tower) {
    const band = towerBand(run.floor);
    const dSrc = (boss && run.floor % 50 === 0) ? dungeonOf('O') : dungeonOf(pick(band.dIds));
    base = boss ? dSrc.boss : pick(dSrc.mobs);
    name = (boss ? `第${run.floor}層の` : '') + base.name;
    bossFilter = boss && run.floor % 50 === 0 ? 'hue-rotate(-45deg) saturate(1.7) contrast(1.15)' : (boss ? 'hue-rotate(38deg) saturate(1.35)' : '');
  } else if (run.abyss) {
    const ab = run.abyss.dfA;
    if (boss) {
      const b0 = ABYSS_BOSSES[ab.bossKey];
      base = b0;
      name = b0.name + (ab.bossSuffix || '');
      bossFilter = ab.bossSuffix ? 'hue-rotate(-35deg) saturate(1.5) contrast(1.12)' : '';
    } else {
      const band = ABYSS_CFG.bands.find(b => run.floor <= b.maxFloor) || ABYSS_CFG.bands[ABYSS_CFG.bands.length - 1];
      const dSrc = dungeonOf(pick(band.dIds));
      base = miniboss ? dSrc.mobs.reduce((a, b) => b.hp > a.hp ? b : a) : pick(dSrc.mobs);
      name = (miniboss ? '強敵 ' : '') + base.name;
      bossFilter = miniboss ? 'hue-rotate(155deg) saturate(1.45) contrast(1.12)' : '';
    }
  } else {
    base = boss ? d.boss : (miniboss ? d.mobs.reduce((a, b) => b.hp > a.hp ? b : a) : pick(d.mobs));
    name = (boss && run.df.bossPrefix ? run.df.bossPrefix : miniboss ? '強敵 ' : '') + base.name;
    bossFilter = boss && run.df.bossFilter ? run.df.bossFilter : (miniboss ? 'hue-rotate(155deg) saturate(1.45) contrast(1.12)' : '');
  }
  const S = scaleOf(run, run.floor);
  const ae = run.abyss ? abyssEff(run) : null;
  const ease = (!run.tower && !run.abyss && run.d && run.df) ? earlyEase(run.d.id, run.df.id) : { hp: 1, atk: 1 };
  const Shp = run.tower ? Math.pow(S, 0.45) : S;
  const Sa = run.tower ? Math.pow(S, 0.98) : Math.pow(S, TUNE.atkExp);
  const hpMult = run.tower ? (boss ? 1.85 : miniboss ? 1.3 : 1) : (boss ? (run.abyss ? run.abyss.dfA.bossMult * TUNE.bossHp : TUNE.bossHp) : miniboss ? 1.55 : 1) * (run.abyss && run.abyss.dfA.hpMult ? run.abyss.dfA.hpMult : 1);
  const atkMult = run.tower ? (boss ? 0.90 : miniboss ? 1.02 : 1) : (boss ? (run.abyss ? run.abyss.dfA.bossMult * TUNE.bossAtk * ae.bossAtkMult : TUNE.bossAtk) : miniboss ? 1.15 : 1) * (run.abyss && run.abyss.dfA.atkMult ? run.abyss.dfA.atkMult : 1);
  const defMult = run.tower ? (boss ? 1.0 : 1) : (boss ? TUNE.bossDef : miniboss ? 1.1 : 1);
  const hp = Math.max(1, Math.round(base.hp * Shp * TUNE.hpScale * hpMult * (ae ? ae.enHpMult : 1) * ease.hp));
  run.enemy = {
    id: base.id, name, shape: base.shape, boss, miniboss, bossFilter, hp, maxHp: hp, firstHit: true,
    atk: Math.max(1, Math.round(base.atk * Sa * TUNE.atkScale * atkMult * (ae ? ae.enAtkMult : 1) * ease.atk)),
    def: Math.round(base.def * Sa * TUNE.defScale * defMult),
    exp: Math.max(1, Math.round(base.exp * S * TUNE.expScale * (run.df.expMult || 1) * (miniboss ? 1.5 : 1))),
    gold: Math.max(1, Math.round(base.gold * S * TUNE.goldScale * (0.8 + rnd() * 0.4) * (miniboss ? 1.5 : 1)))
  };
  run.phase = 'battle';
  Sound.setScene(run.tower ? 'tower' : (boss ? 'boss' : 'dungeon'));
  if (boss) { const ms = bossBanner(name); run.introUntil = ms ? Date.now() + ms : 0; }
  if (boss) run.bossHitTaken = false;
  recordDexEnemy(G.p, run.enemy.id, false);
  addLog(`【${run.floor}F】${boss ? 'ボス ' : miniboss ? '節目の強敵 ' : ''}${name}が現れた！`, (boss || miniboss) ? 'l-gold' : 'l-sys');
  if (typeof clearRageFx === 'function') clearRageFx();
  renderEnemy(true);
  if (ae && ae.preempt > 0 && rnd() < ae.preempt) {
    addLog(`奇襲の霧！ ${name}の先制攻撃！`, 'l-dmg');
    enemyAct();
    if (G.p.hp <= 0) { finishRun('defeat'); return; }
  }
}

function runEvent() {
  const run = G.run, p = G.p;
  const type = weighted([['chest', 40], ['spring', 30], ['bless', 30]]);
  if (type === 'chest') {
    const it = genItem(run.df, true, null, run.d.maxStar || MAX_STAR);
    const out = receiveItem(it); run.items.push(it);
    addLog(`【${run.floor}F】宝箱を見つけた！`, 'l-good');
    logDrop(it, out);
  } else if (type === 'spring') {
    const ae = run.abyss ? abyssEff(run) : null;
    if (ae && ae.healMult < 1) {
      const h = Math.round(maxHp(p) * 0.5), m = Math.round(maxMp(p) * 0.5);
      p.hp = Math.min(maxHp(p), p.hp + h); p.mp = Math.min(maxMp(p), p.mp + m);
      addLog(`【${run.floor}F】回復の泉だ。（呪いで回復半減：HP+${h} MP+${m}）`, 'l-good');
    } else {
      p.hp = maxHp(p); p.mp = maxMp(p);
      addLog(`【${run.floor}F】回復の泉だ。HPとMPが全回復した！`, 'l-good');
    }
  } else {
    const pool = [p.weapon, p.armor, ...p.bag].filter(Boolean);
    addLog(`【${run.floor}F】鍛冶屋の祝福を受けた。`, 'l-good');
    if (!pool.length) addLog('強化できる装備がなかった。', 'l-sys');
    else {
      const it = pick(pool);
      if (it.rarity >= 3) addLog(`${itemName(it)}はすでにレジェンド。祝福は不発に終わった…`, 'l-sys');
      else {
        const before = itemName(it);
        it.rarity++;
        addLog(`${before}が${RARITY[it.rarity].name}に進化した！（→ ${itemName(it)}）`, 'l-r' + it.rarity);
      }
    }
  }
}

function logDrop(it, out) {
  const tail = out === 'equipped' ? '（装備した）' : out === 'sold' ? '（バッグがいっぱいで売却）' : '';
  const stat = it.slot === 'weapon' ? `攻${gearPower(it)}` : `防${gearPower(it)}`;
  const ps = itemProps(it).map(k => propMeta(it.slot, k)?.name).filter(Boolean);
  addLog(`入手：${itemName(it)} ★${it.star}${ps.length ? ' ［' + ps.join('・') + '］' : ''} ${stat}${tail}`, 'l-r' + it.rarity);
}

/* ---- battle ---- */
function calcDmg(atk, def) {
  return Math.max(1, Math.round(atk * (0.9 + rnd() * 0.2) * 40 / (40 + Math.max(0, def))));
}
function canUse(id) {
  const p = G.p, run = G.run;
  if (id === 'attack') return true;
  if (!p.skills[id]) return false;
  if (p.mp < skillMpCost(p, SK[id])) return false;
  if (run && (run.skillCt[id] || 0) > 0) return false;
  return true;
}
function chooseAction() {
  const p = G.p, run = G.run, en = run.enemy;
  const slots = p.equippedSkills || [null, null, null];
  const hpRatio = p.hp / maxHp(p);
  // 優先度1: heal系 - HPが80%未満なら発動
  for (const id of slots) {
    if (!id || !canUse(id)) continue;
    if (SK[id].type === 'heal' && hpRatio < 0.8) return id;
  }
  // 優先度2: buff系 - CTが切れたら発動
  for (const id of slots) {
    if (!id || !canUse(id)) continue;
    if (SK[id].type === 'buff') return id;
  }
  // 優先度3: atk系 - CTが切れたら発動
  for (const id of slots) {
    if (!id || !canUse(id)) continue;
    if (SK[id].type === 'atk') return id;
  }
  return 'attack';
}

function tickSkillCt() {
  // 毎ターン全スキルのCTを1減らす
  const run = G.run; if (!run) return;
  for (const k of Object.keys(run.skillCt)) {
    run.skillCt[k] = Math.max(0, (run.skillCt[k] || 0) - 1);
  }
}
// R1b: 汎用バフ（SK.gen）の倍率。kind: 'atk' | 'def' | 'taken'
function genBuffMult(run, kind) {
  const g = run && run.gen;
  if (!g || !(g.turns > 0)) return 1;
  if (kind === 'atk') return (g.atkMult || 1) * (g.allMult || 1);
  if (kind === 'def') return (g.defMult || 1) * (g.allMult || 1);
  return g.takenMult || 1;
}
function useSkillEffect(id) {
  const p = G.p, run = G.run, en = run.enemy;
  const s = SK[id], te = towerEff(run), psb = p.passiveSkills ? passiveBonus(p) : { healMult: 1 }, pb = masteryBonus(p), ae = run.abyss ? abyssEff(run) : null;
  p.mp -= skillMpCost(p, s);
  // CTをセット
  if (s.ct) run.skillCt[id] = Math.max(1, s.ct - te.ctRed + (ae ? ae.ctAdd : 0) - (psb.ctRed || 0));
  if (s.type === 'heal') {
    const h = Math.max(1, Math.round(maxHp(p) * s.pct * te.healMult * psb.healMult * pb.healMult * (ae ? ae.healMult : 1))); const before = p.hp;
    p.hp = Math.min(maxHp(p), p.hp + h);
    addLog(`${s.name}！ HPが${p.hp - before}回復した。`, 'l-good'); popDamage('player', `+${p.hp - before}`, 'heal');
    if (s.mpFull) { const mb = p.mp; p.mp = maxMp(p); if (p.mp > mb) addLog(`MPが${p.mp - mb}回復した。`, 'l-good'); }
    if (s.defTurns) { run.defBuff = s.defTurns; run.defBuffMult = s.defMult || 1.5; addLog(`${s.defTurns}ターン防御力${run.defBuffMult}倍！`, 'l-good'); }
    if (s.regen) { run.regenTurns = s.regen; run.regenPct = s.regenPct || s.pct; }
    if (s.barrier) { run.barrier = (run.barrier || 0) + s.barrier; addLog(`バリアを${s.barrier}回張った！`, 'l-good'); }
    return true;
  }
  if (s.type === 'buff') {
    Sound.play('buff');
    if (s.gen) {
      run.gen = Object.assign({}, s.gen);
      const parts = [];
      const g = s.gen;
      if (g.atkMult) parts.push(`攻撃力が${g.atkMult}倍`);
      if (g.defMult) parts.push(`防御力が${g.defMult}倍`);
      if (g.allMult) parts.push(`全ステータスが${g.allMult}倍`);
      if (g.takenMult) parts.push(`被ダメージが${g.takenMult}倍`);
      addLog(`${s.name}！ ${parts.join('・')}になった！`, 'l-good');
    }
    else if (id === 'guard') { run.guard = s.turns; addLog('鉄壁の構え！ 防御力が2倍になった。', 'l-good'); }
    else if (id === 'magicshield') { run.magicShield = s.turns; addLog('マジックシールド！ 防御力が1.5倍になった。', 'l-good'); }
    else if (id === 'berserk') { run.berserk = s.turns; addLog('バーサーク！ 攻撃力が3倍・防御力が半減した！', 'l-good'); }
    else if (id === 'warGod') { run.warGod = s.turns; addLog('鬼神の構え！ 攻撃力が1.8倍になった！', 'l-good'); }
    else if (s.shura) { run.shura = s.turns; addLog('修羅の構え！ 攻撃力が4倍になった！', 'l-good'); }
    else if (s.kishin) { run.kishin = s.turns; addLog('鬼神降臨！ 攻撃力が5倍になった！', 'l-good'); }
    else if (s.awaken) { run.awaken = s.turns; addLog('英雄の覚醒！ 全ステータスが2.5倍になった！', 'l-good'); }
    else if (s.advent) { run.advent = s.turns; addLog('勇者の光臨！ 全ステータスが3.5倍になった！', 'l-good'); }
    else if (s.barrier) { run.barrier = s.barrier; addLog(`${s.name}！ ダメージを${s.barrier}回無効化する。`, 'l-good'); }
    else addLog(`${s.name}を発動した！`, 'l-good');
    return true;
  }
  return false; // atk系は呼び出し元で処理
}
function playerAct() {
  const p = G.p, run = G.run, en = run.enemy;
  tickSkillCt();
  const id = chooseAction();
  // heal/buff 系は useSkillEffect で完結
  if (id !== 'attack' && SK[id] && SK[id].type !== 'atk') {
    useSkillEffect(id);
    if (typeof playSkillFx === 'function') playSkillFx(id, 1);
    return;
  }
  // attack / atk系スキル
  const s = id === 'attack' ? { name: '攻撃', hits: 1, mult: 1 } : SK[id];
  const te = towerEff(run), ae = run.abyss ? abyssEff(run) : null;
  const pcb = p.passiveSkills ? passiveBonus(p) : { critAdd: 0, ctRed: 0 };
  if (id !== 'attack') {
    p.mp -= skillMpCost(p, s);
    if (s.ct) run.skillCt[id] = Math.max(1, s.ct - te.ctRed + (ae ? ae.ctAdd : 0) - (pcb.ctRed || 0));
  }
  if (hasProp(p.weapon, 'madness')) {
    const loss = Math.ceil(maxHp(p) * 0.1), before = p.hp;
    p.hp = Math.max(1, p.hp - loss);
    if (before - p.hp > 0) { addLog(`狂気の代償でHPが${before - p.hp}減った。`, 'l-dmg'); popDamage('player', `-${before - p.hp}`, 'bad'); }
  }
  const pa = playerAtk(p) * (run.warGod > 0 ? 1.8 : 1) * (run.berserk > 0 ? 3 : 1) * (run.shura > 0 ? 4 : 1) * (run.kishin > 0 ? 5 : 1) * (run.awaken > 0 ? 2.5 : 1) * (run.advent > 0 ? 3.5 : 1) * (s.allMult || 1) * genBuffMult(run, 'atk');
  const pb = masteryBonus(p);
  if (run.warGod > 0) run.warGod--;
  if (run.awaken > 0) run.awaken--;
  if (run.advent > 0) run.advent--;
  if (s.allMult) { run.heroDef = 1; addLog(`${s.name}！ 全ステータスが${s.allMult}倍になった！`, 'l-good'); }
  let dealt = 0, crits = 0, hits = 0;
  const bossMult = en.boss ? (1 + te.bossDmg) : 1;
  for (let i = 0; i < s.hits; i++) {
    if (en.hp <= 0) break;
    const crit = (te.firstCrit && en.firstHit) ? true : (rnd() < (0.1 + pb.critAdd + (pcb.critAdd || 0)));
    en.firstHit = false;
    const dmg = calcDmg(pa * s.mult * (crit ? 1.5 : 1) * te.dmgMult * pb.dmgMult * bossMult, en.def);
    en.hp = Math.max(0, en.hp - dmg); dealt += dmg; hits++; if (crit) crits++;
    popDamage('enemy', String(dmg), crit ? 'crit' : 'dmg');
  }
  hitFlash('enemy'); playAttackMotion();
  if (id !== 'attack' && typeof playSkillFx === 'function') playSkillFx(id, Math.max(1, hits || s.hits || 1));
  addLog(`${id === 'attack' ? '' : s.name + '！ '}${en.name}に${hits > 1 ? hits + '回で合計' : ''}${dealt}ダメージ${crits ? '（会心！）' : ''}`, 'l-hit');
  if (s.freeze && en.hp > 0) { run.frozen = typeof s.freeze === 'number' ? s.freeze : 1; addLog(`${en.name}は凍りついた！`, 'l-good'); }
  const stealPct = (hasProp(p.weapon, 'vamp') ? 0.1 : 0) + te.lifeSteal;
  if (stealPct > 0 && dealt > 0) {
    const h = Math.max(1, Math.round(dealt * stealPct)), before = p.hp;
    p.hp = Math.min(maxHp(p), p.hp + h);
    if (p.hp > before) { addLog(`吸収でHPが${p.hp - before}回復した。`, 'l-good'); popDamage('player', `+${p.hp - before}`, 'heal'); }
  }
}

function enemyAct() {
  const p = G.p, run = G.run, en = run.enemy, te = towerEff(run);
  if (run.frozen > 0) {
    run.frozen--;
    addLog(`${en.name}は凍って動けない！`, 'l-good');
    return;
  }
  if (run.barrier > 0) {
    run.barrier--;
    addLog(`バリアが${en.name}の攻撃を防いだ！（残り${run.barrier}回）`, 'l-good');
    popDamage('player', 'BLOCK', 'heal');
    return;
  }
  const pb = masteryBonus(p), ae = run.abyss ? abyssEff(run) : null;
  const def = playerDef(p) * (run.guard > 0 ? 2 : 1) * (run.defBuff > 0 ? (run.defBuffMult || 1.5) : 1) * (run.berserk > 0 ? 0.5 : 1) * (run.magicShield > 0 ? 1.5 : 1) * (run.heroDef > 0 ? 2 : 1) * (run.awaken > 0 ? 2.5 : 1) * (run.advent > 0 ? 3.5 : 1) * genBuffMult(run, 'def');
  const dmg = Math.max(1, Math.round(calcDmg(en.atk, def) * (run.shura > 0 ? 1.2 : 1) * (run.kishin > 0 ? 1.1 : 1) * genBuffMult(run, 'taken') * (hasProp(p.armor, 'ward') ? 0.9 : 1) * te.takenMult * pb.takenMult * (ae ? ae.takenMult : 1)));
  if (run.berserk > 0) run.berserk--;
  if (run.magicShield > 0) run.magicShield--;
  if (run.heroDef > 0) run.heroDef--;
  if (run.shura > 0) run.shura--;
  if (run.kishin > 0) run.kishin--;
  if (run.gen && run.gen.turns > 0) { run.gen.turns--; if (run.gen.turns === 0) run.gen = null; }
  if (run.defBuff > 0) run.defBuff--;
  p.hp = Math.max(0, p.hp - dmg);
  if (run.enemy && run.enemy.boss && dmg > 0) run.bossHitTaken = true;
  addLog(`${en.name}の${en.raged ? '終焉の一撃' : '攻撃'}！ ${dmg}ダメージを受けた。`, 'l-dmg');
  popDamage('player', String(dmg), 'bad'); hitFlash('player');
  if (run.guard > 0) { run.guard--; if (run.guard === 0) addLog('鉄壁の効果が切れた。', 'l-sys'); }
  if (hasProp(p.armor, 'thorns') && en.hp > 0 && p.hp > 0) {
    const ar = Math.max(1, Math.round(dmg * 0.15));
    en.hp = Math.max(0, en.hp - ar);
    addLog(`棘の鎧！ ${en.name}に${ar}ダメージ反射！`, 'l-hit');
  }
  if (te.thorns > 0 && en.hp > 0 && p.hp > 0) {
    const refl = Math.max(1, Math.round(playerDef(p) * te.thorns));
    en.hp = Math.max(0, en.hp - refl);
    addLog(`反撃の鎧！ ${en.name}に${refl}ダメージ！`, 'l-hit');
  }
}

function battleRound() {
  const p = G.p, run = G.run, en = run.enemy;
  playerAct();
  if (en.hp <= 0) { onKill(); return; }
  if (en.id === 'o_boss' && run.df.id === 'extreme' && !en.raged && en.hp <= en.maxHp * 0.5) {
    en.raged = true;
    en.fallbackId = en.id;
    en.id = (run.d.boss && run.d.boss.rageId) || 'o_boss_rage';
    en.name = (run.d.boss && run.d.boss.rageName) || '終焉神ニヒル・真';
    en.bossFilter = 'hue-rotate(140deg) saturate(1.6)';
    en.atk = Math.round(en.atk * 1.35);
    recordDexEnemy(p, en.id, false);
    addLog('ニヒルの仮面が砕け散った！ 終焉神ニヒル・真へと姿を変え、攻撃力が激増した！', 'l-dmg');
    renderEnemy(true);
    if (typeof triggerRageFx === 'function') triggerRageFx();
  }
  enemyAct();
  if (en.hp <= 0) { onKill(); return; }
  if (p.hp <= 0 && run.tower && towerEff(run).reviveOnce && !run.tower.reviveUsed) {
    run.tower.reviveUsed = true;
    p.hp = Math.max(1, Math.round(maxHp(p) * 0.5));
    addLog('不死鳥の羽が輝き、HP50%で蘇った！', 'l-good');
  }
  if (p.hp <= 0) { finishRun('defeat'); return; }
  if (hasProp(p.armor, 'regen') && p.hp > 0 && p.hp < maxHp(p)) {
    const h = Math.max(1, Math.round(maxHp(p) * 0.03)), b = p.hp;
    p.hp = Math.min(maxHp(p), p.hp + h);
    if (p.hp > b) addLog(`防具の再生でHPが${p.hp - b}回復した。`, 'l-good');
  }
  if (run.regenTurns > 0) {
    run.regenTurns--;
    const h = Math.max(1, Math.round(maxHp(p) * (run.regenPct || 0.15))), b = p.hp;
    p.hp = Math.min(maxHp(p), p.hp + h);
    if (p.hp > b) { addLog(`リジェネ効果でHPが${p.hp - b}回復した。`, 'l-good'); popDamage('player', `+${p.hp - b}`, 'heal'); }
  }
}

function onKill() {
  const p = G.p, run = G.run, en = run.enemy, te = towerEff(run), pb = masteryBonus(p);
  run.kills++; p.stats.kills++; run.cleared++;
  Sound.play(en.boss ? 'bossKill' : 'kill'); killFx(en.boss);
  recordDexEnemy(p, en.id, true);
  const expGain = Math.round(en.exp * te.expMult * pb.expMult);
  const goldGain = Math.round(en.gold * te.goldMult * pb.goldMult);
  addLog(`${en.name}を倒した！ EXP+${expGain}　${goldGain}G`, 'l-gold');
  p.gold += goldGain; run.gold += goldGain;
  p.achStats = p.achStats || { totalGold: 0, blessings: 0, noDmgBoss: false };
  p.achStats.totalGold = (p.achStats.totalGold || 0) + goldGain;
  if (en.boss && !run.bossHitTaken) p.achStats.noDmgBoss = true;
  gainExp(expGain);
  checkAchievements('kill');
  checkAchievements('gold');
  if (run.tower) {
    if (te.killHeal > 0) {
      const h = Math.max(1, Math.round(maxHp(p) * te.killHeal)), b = p.hp;
      p.hp = Math.min(maxHp(p), p.hp + h);
      if (p.hp > b) addLog(`魂の吸収でHP+${p.hp - b}`, 'l-good');
    }
    if (te.killMp > 0) {
      const m = Math.max(1, Math.round(maxMp(p) * te.killMp)), b = p.mp;
      p.mp = Math.min(maxMp(p), p.mp + m);
      if (p.mp > b) addLog(`魔力回収でMP+${p.mp - b}`, 'l-good');
    }
  }
  // drops (チュートリアル中はドロップなし)
  const drops = [];
  if (!G.tutorial || G.tutorial.done) {
    const tBand = run.tower ? towerBand(run.floor) : null;
    const capStar = tBand ? tBand.maxDropStar : (run.abyss ? 5 : (run.d.maxStar || MAX_STAR));
    const bStar = tBand ? tBand.bossCapStar : (run.abyss ? 8 : run.d.bossMaxStar);
    const ae = run.abyss ? abyssEff(run) : null;
    const rollBossItem = () => {
      let fs = null;
      if (bStar && bStar > capStar) {
        for (let s = bStar; s > capStar; s--) {
          const ch = s >= 9 ? (run.tower ? 0.04 : (run.df.id === 'extreme' ? 0.06 : 0.04)) : s === 8 ? 0.06 : 0.08;
          if (rnd() < ch) { fs = s; break; }
        }
      }
      return genItem(run.df, true, null, capStar, fs);
    };
    if (en.boss) {
      drops.push(rollBossItem()); drops.push(rollBossItem());
      if (run.abyss && rnd() < run.abyss.dfA.mythicRate) {
        const m9 = genMythic9();
        const out = receiveItem(m9);
        run.items.push(m9);
        run.abyss.mythicDrops.push(m9);
        addLog(`★ 深淵の主から ${itemName(m9)} が落ちた！！`, 'l-r4');
        logDrop(m9, out);
      }
    } else if (en.miniboss) drops.push(rollBossItem());
    else if (rnd() < 0.3 * (ae ? ae.dropMult : 1)) drops.push(genItem(run.df, false, null, capStar));
    for (const it of drops) { const out = receiveItem(it); run.items.push(it); logDrop(it, out); }
    const r = rnd();
    if (r < 0.05) { p.potions.hp = Math.min(99, p.potions.hp + 1); run.potions.hp++; addLog('生命の薬を手に入れた！', 'l-good'); }
    else if (r < 0.10) { p.potions.mp = Math.min(99, p.potions.mp + 1); run.potions.mp++; addLog('魔力の薬を手に入れた！', 'l-good'); }
    // 強化石ドロップ（ダンジョンA→初級、B→中級、C→上級 8% ／ D〜Fボス80%・強敵40%→時の欠片 ／ H〜Iボス80%・強敵40%→機神の核）
    if ((en.boss || en.miniboss) && ['D', 'E', 'F'].includes(run.d.id)) {
      if (rnd() < (en.boss ? 0.8 : 0.4)) {
        p.stones.stone_time = Math.min(999, (p.stones.stone_time || 0) + 1);
        addLog('時の欠片を手に入れた！', 'l-good');
      }
    } else if ((en.boss || en.miniboss) && ['H', 'I'].includes(run.d.id)) {
      if (rnd() < (en.boss ? 0.8 : 0.4)) {
        p.stones.stone_core = Math.min(999, (p.stones.stone_core || 0) + 1);
        addLog('機神の核を手に入れた！', 'l-good');
      }
    } else if ((en.boss || en.miniboss) && run.d.id === 'O') {
      if (rnd() < (en.boss ? 0.8 : 0.4)) {
        p.stones.stone_genesis = Math.min(999, (p.stones.stone_genesis || 0) + 1);
        addLog('創世の欠片を手に入れた！', 'l-good');
      }
    } else if (rnd() < 0.08) {
      const st = STONES.find(s => s.dId === run.d.id);
      if (st) { p.stones[st.id] = Math.min(999, (p.stones[st.id] || 0) + 1); addLog(`${st.name}を手に入れた！`, 'l-good'); }
    }
  }
  run.guard = 0;
  if (typeof clearRageFx === 'function') clearRageFx();
  if (!(run.abyss && abyssEff(run).noRest) && TUNE.floorRegen > 0 && !en.boss) {
    const h = Math.round(maxHp(p) * TUNE.floorRegen), b = p.hp;
    p.hp = Math.min(maxHp(p), p.hp + h);
    if (p.hp > b) addLog(`小休止でHPが${p.hp - b}回復した。`, 'l-sys');
  }
  if (run.tower && (en.boss || (run.floor % 10 === 5))) {
    const choices = rollTowerBlessings(run.tower.blessings, en.boss ? 3 : 2);
    if (choices.length) {
      run.tower.pendingChoice = choices;
      run.phase = 'bless';
      renderEnemy(false);
      if (!G.headless) openBlessModal();
      ensureLoop();
      return;
    }
  }
  run.phase = 'pause';
  renderEnemy(false);
}

function gainExp(n) {
  const p = G.p, run = G.run;
  if (p.lv >= LV_CAP) return;
  const lv0 = p.lv;
  p.exp += n;
  while (p.lv < LV_CAP && p.exp >= expNeed(p.lv)) {
    p.exp -= expNeed(p.lv);
    const oh = maxHp(p), om = maxMp(p);
    p.lv++; p.sp++; run.sp++;
    const dh = maxHp(p) - oh, dm = maxMp(p) - om;
    p.hp = Math.min(maxHp(p), p.hp + dh + Math.round(maxHp(p) * 0.2));
    p.mp = Math.min(maxMp(p), p.mp + dm);
    addLog(`レベルアップ！ Lv${p.lv} になった。SP+1`, 'l-gold'); Sound.play('levelup'); levelBand(p.lv);
  }
  if (p.lv >= LV_CAP) p.exp = 0;
  if (p.lv > lv0) checkAchievements('lv');
}

function finishRun(result) {
  const run = G.run, p = G.p;
  if (!run) return;
  Sound.play(result === 'clear' ? 'win' : result === 'defeat' ? 'lose' : 'retreat'); Sound.setScene('town');
  let clearGold = 0, clearSp = 0, lost = 0, part1End = false, ending = false, towerRes = null;
  if (run.tower) {
    const reached = Math.max(0, result === 'defeat' ? run.floor - 1 : run.floor);
    const coins = Math.round(TOWER_CFG.coinsForFloor(reached) * towerEff(run).coinMult);
    p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] };
    const isNewBest = reached > (p.tower.best || 0);
    if (isNewBest) p.tower.best = reached;
    p.tower.coins += coins;
    p.tower.totalCoins += coins;
    const newTitles = [];
    for (const t of TOWER_TITLES) {
      if (t.floor && p.tower.best >= t.floor && !p.tower.titles.includes(t.id)) {
        p.tower.titles.push(t.id);
        newTitles.push(t.name);
      }
    }
    if (result === 'defeat') {
      const before = p.gold; p.gold = Math.floor(p.gold / 2); lost = before - p.gold;
      p.hp = Math.max(1, Math.round(maxHp(p) * 0.25));
    } else {
      p.hp = maxHp(p);
    }
    towerRes = { reached, coins, isNewBest, blessings: [...run.tower.blessings], newTitles };
  } else if (run.abyss && result === 'clear') {
    const lv = run.abyss.lv, dfA = run.abyss.dfA;
    p.abyss = p.abyss || { best: 0, cleared: {} };
    p.abyss.cleared = p.abyss.cleared || {};
    p.abyss.cleared[lv] = true;
    p.abyss.best = Math.max(p.abyss.best || 0, lv);
    clearGold = dfA.clearGold;
    p.gold += clearGold;
    p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] };
    p.tower.coins += dfA.coins;
    p.tower.totalCoins += dfA.coins;
    p.stats.clears++;
    p.hp = maxHp(p);
  } else if (result === 'clear') {
    p.cleared = p.cleared || {};
    p.cleared[run.d.id] = p.cleared[run.d.id] || {};
    const firstClear = !p.cleared[run.d.id][run.df.id];
    if (run.d.id === 'I' && run.df.id === 'high' && firstClear && !p.part1Cleared) {
      p.part1Cleared = true;
      part1End = true;
    }
    if (run.d.id === 'O' && run.df.id === 'extreme' && firstClear && !p.ending) {
      p.ending = true;
      ending = true;
      flushPendingAchCoins(p);
    }
    clearGold = Math.round(run.df.clearGold * DUNGEON_REWARD[run.d.id]);
    clearSp = firstClear ? run.df.clearSp : 0;
    p.gold += clearGold; p.sp += clearSp; p.stats.clears++;
    p.cleared[run.d.id][run.df.id] = true;
    p.hp = maxHp(p);  // 街帰還: HP全回復
  } else if (result === 'retreat') {
    p.hp = maxHp(p);  // 街帰還: HP全回復
  } else if (result === 'defeat') {
    const before = p.gold; p.gold = Math.floor(p.gold / 2); lost = before - p.gold;
    p.hp = Math.max(1, Math.round(maxHp(p) * 0.25));
  }
  p.stats.runs++;
  if (clearGold > 0) {
    p.achStats = p.achStats || { totalGold: 0, blessings: 0, noDmgBoss: false };
    p.achStats.totalGold = (p.achStats.totalGold || 0) + clearGold;
  }
  checkAchievements('run');
  if (clearGold > 0) checkAchievements('gold');
  if (!p.abyssNoticeShown && isAbyssUnlocked(p).ok) {
    p.abyssNoticeShown = true;
    if (!G.headless) toast('🕳️ 深淵ダンジョンが解放されました！');
  }
  G.last = {
    result, d: run.d, df: run.df, floors: run.floors, floor: Math.min(run.floor, run.floors || run.floor), cleared: run.cleared,
    gold: run.gold + clearGold, clearGold, lost, sp: run.sp + clearSp, items: run.items, potions: run.potions,
    lvFrom: run.startLv, lvTo: p.lv, snap: run.snap || null, after: statSnap(p), kills: run.kills, part1End, ending, tower: towerRes,
    abyss: run.abyss ? { lv: run.abyss.lv, coins: result === 'clear' ? run.abyss.dfA.coins : 0, mythicDrops: run.abyss.mythicDrops } : null
  };
  G.run = null;
  if (typeof clearAllBattleFx === 'function') clearAllBattleFx();
  G.townView = 'plaza';  // 街帰還時は広場に戻る
  save(true);   // ダンジョン帰還は自動バックアップの区切り
  renderAll();
  openModal();
  if (towerRes && towerRes.isNewBest && p.tower.rankOptIn && p.tower.best > (p.tower.sentBest || 0) && isRankingSubmitConfigured()) {
    submitTowerRank(p.tower.best);
  }
  ensureLoop();
}

/* ================= loop ================= */
let loopTimer = null;
function tick() {
  const run = G.run; if (!run) return;
  if (run.introUntil && Date.now() < run.introUntil) return; // ボス登場演出中は戦闘を止める
  try {
    if (run.phase === 'next') nextFloor();
    else if (run.phase === 'pause') run.phase = 'next';
    else if (run.phase === 'battle') battleRound();
  } catch (e) { console.error(e); toast('エラーが発生しました: ' + e.message); }
  // チュートリアル step 2: HP50%以下になったら一時停止して撤退を促す
  if (G.tutorial && !G.tutorial.done && G.tutorial.step === 2 && G.run) {
    const p = G.p;
    if (p.hp / maxHp(p) < 0.5) {
      G.noTimer = true;
      tutStep(3);
    }
  }
  if (!G.headless) { if (G.run) renderBattle(); renderHUD(); }
}
function ensureLoop() {
  clearTimeout(loopTimer); loopTimer = null;
  if (G.noTimer) return;
  if (G.run && G.view === 'dungeon' && !G.modalOpen && G.run.phase !== 'bless') {
    loopTimer = setTimeout(() => { loopTimer = null; tick(); ensureLoop(); }, Math.round(TICK_MS / G.opts.speed));
  }
}

/* ================= actions ================= */
function usePotion(k) {
  const p = G.p;
  if (p.potions[k] <= 0) { toast('薬がありません'); return; }
  if (k === 'hp') {
    if (p.hp >= maxHp(p)) { toast('HPはすでに満タンです'); return; }
    const ae = G.run && G.run.abyss ? abyssEff(G.run) : null;
    const b = p.hp; p.hp = Math.min(maxHp(p), p.hp + Math.round(maxHp(p) * 0.3 * (ae ? ae.healMult : 1))); p.potions.hp--;
    if (G.run) { addLog(`生命の薬を使った。HP+${p.hp - b}`, 'l-good'); popDamage('player', `+${p.hp - b}`, 'heal'); } else toast(`HPが${p.hp - b}回復しました`);
  } else {
    if (p.mp >= maxMp(p)) { toast('MPはすでに満タンです'); return; }
    const b = p.mp; p.mp = Math.min(maxMp(p), p.mp + Math.round(maxMp(p) * 0.5)); p.potions.mp--;
    if (G.run) addLog(`魔力の薬を使った。MP+${p.mp - b}`, 'l-good'); else toast(`MPが${p.mp - b}回復しました`);
  }
  if (!G.run) save();
  renderAll();
}

function sellBag() {
  const p = G.p;
  const targets = p.bag.filter(it => !it.locked && G.shopSel[it.rarity]);
  if (!targets.length) { toast('売却できる装備がありません'); return; }
  const total = targets.reduce((s, it) => s + sellValue(it), 0);
  p.bag = p.bag.filter(it => !targets.includes(it));
  p.gold += total; save();
  if (targets.some(it => it.rarity >= 4)) npcReact('shop', 'surprise');
  Sound.play('sell');
  toast(`${targets.length}個を売却して ${fmt(total)}G を手に入れた`);
  renderAll();
}
/* --- 鍛冶屋・ショップ・バッグ拡張・スキルリセット費用 --- */
function smithCost(it) {
  // star³ × 28 × rarityMult
  return Math.floor(Math.pow(it.star, 3) * 28 * RARITY[it.rarity].mult);
}
function reforgeCost(it) {
  return Math.max(80, Math.floor(smithCost(it) * 0.9));
}
function bagExpandCost(cap) {
  return BAG_EXPAND_COSTS[cap] || 0;
}
function skillResetCost(p) {
  return Math.max(50, (p ? p.lv : 1) * 50);
}
/* ---- はじめの目標 / 初回ヒント ---- */
const FIRST_GOALS = [
  { id: 'clearA', text: 'ダンジョンAを踏破する', go: 'dungeon', done: p => !!(p.cleared && p.cleared.A && Object.values(p.cleared.A).some(Boolean)) },
  { id: 'equip', text: '装備を切り替える（ステータス＞装備）', go: 'gear', done: p => !!(p.goalFlags && p.goalFlags.equip) || (p.stats && p.stats.clears >= 3) },
  { id: 'skill', text: 'SPでスキルを1つ習得する', go: 'skill', done: p => Object.keys(p.skills || {}).length > 0 },
  { id: 'rank', text: '戦闘力ランク「駆け出し」に到達', go: 'hero', done: p => playerPower(p) >= POWER_RANKS[1].min },
  { id: 'tryB', text: 'ダンジョンBに挑戦する', go: 'dungeon', done: p => !!(p.goalFlags && p.goalFlags.tryB) || !!(p.cleared && p.cleared.B && Object.values(p.cleared.B).some(Boolean)) }
];
function goalState(p) { return FIRST_GOALS.map(g => ({ g, ok: !!g.done(p) })); }
function checkGoals(silent) {
  const p = G.p; if (!p) return;
  if (!G._goalDone) { G._goalDone = {}; silent = true; }
  for (const { g, ok } of goalState(p)) {
    if (ok && !G._goalDone[g.id]) {
      G._goalDone[g.id] = true;
      if (!silent && !(G.tutorial && !G.tutorial.done)) setTimeout(() => toast(`🎯 目標達成！「${g.text}」`), 2200);
    }
  }
}
function goalsVisible(p) {
  if (G.tutorial && !G.tutorial.done) return false;
  return goalState(p).some(x => !x.ok);
}
function hintBox(key, text) {
  const p = G.p; if (!p || (p.hints && p.hints[key]) || (G.tutorial && !G.tutorial.done)) return '';
  return `<div class="hint-bubble"><span>💡 ${text}</span><button class="btn small" data-act="hintOk" data-k="${key}">わかった</button></div>`;
}
function buildBookPrice(p) { return BUILD_BOOK_PRICES[Math.min(p.buildSlots | 0, BUILD_BOOK_PRICES.length - 1)]; }
function buyBuildBook() {
  const p = G.p;
  if ((p.buildSlots | 0) >= BUILD_MAX - 1) { toast('ビルドは最大3つです'); return; }
  const price = buildBookPrice(p);
  if (p.gold < price) { toast(`所持金が足りません（${fmt(price)}G必要）`); return; }
  p.gold -= price; p.buildSlots = (p.buildSlots | 0) + 1;
  syncActiveCharState(p);
  save(); toast(`ビルドの書を使った！ビルド枠が ${buildCount(p)} つになった`); renderAll();
}
function switchBuild(idx) {
  const p = G.p, c = p.chars[p.skin];
  idx = Number(idx);
  if (G.run) { toast('ダンジョン攻略中はビルドを切り替えられません'); return false; }
  if (!(idx >= 0 && idx < buildCount(p)) || idx === c.activeBuild) return false;
  const tgt = c.builds[idx], need = spentSp(tgt.skillPts) - spentSp(c.skillPts);
  if (need > p.sp) { toast(`SPが足りません（このビルドを再現するには あと${need - p.sp}SP 必要）`); return false; }
  p.sp -= need;
  c.activeBuild = idx; c.skillPts = tgt.skillPts; c.equippedSkills = tgt.equippedSkills;
  syncActiveCharState(p);
  p.hp = Math.min(maxHp(p), p.hp); p.mp = Math.min(maxMp(p), p.mp);
  save(); toast(`「${tgt.name}」に切り替えた`); renderHUD(); renderStatus();
  return true;
}
function allResetInfo(p) {
  const pts = p.skillPts || {};
  const n = Object.values(pts).filter(v => v > 0).length;
  return { trees: n, sp: spentSp(pts), cost: n * skillResetCost(p) };
}
function resetAllTrees() {
  const p = G.p, info = allResetInfo(p);
  if (!info.trees) { toast('振り直すSPがありません'); return; }
  if (!G.resetAllArm) {
    G.resetAllArm = true; renderStatus();
    setTimeout(() => { if (G.resetAllArm) { G.resetAllArm = false; if (G.view === 'status') renderStatus(); } }, 5000);
    return;
  }
  G.resetAllArm = false;
  if (p.gold < info.cost) { toast(`リセットには ${fmt(info.cost)}G 必要です`); renderStatus(); return; }
  p.gold -= info.cost; p.sp += info.sp;
  for (const k of Object.keys(p.skillPts)) p.skillPts[k] = 0;
  for (let i = 0; i < 3; i++) p.equippedSkills[i] = null;
  syncActiveCharState(p);
  p.hp = Math.min(maxHp(p), p.hp); p.mp = Math.min(maxMp(p), p.mp);
  save(); toast(`全ツリーをリセットした（SP +${info.sp} 返還）`); renderHUD(); renderStatus();
}
function smithUpgrade(id) {
  const p = G.p;
  const it = [p.weapon, p.armor, ...p.bag].find(x => x && x.id === Number(id));
  if (!it) { toast('アイテムが見つかりません'); return; }
  if (it.star >= SMITH_MAX_STAR) { toast('これ以上強化できません'); return; }
  const cost = smithCost(it);
  if (p.gold < cost) { toast(`所持金が足りません（${fmt(cost)}G必要）`); return; }
  const stoneId = STONE_REQ[it.star];
  if (stoneId) {
    if ((p.stones[stoneId] || 0) < 1) {
      const st = STONES.find(s => s.id === stoneId);
      toast(`${st.name}が足りません`); return;
    }
    p.stones[stoneId]--;
  }
  p.gold -= cost;
  it.star++;
  if (it.star >= 9) npcReact('smith', 'surprise');
  recordDexItem(p, it);
  checkAchievements('item');
  save();
  toast(`${itemName(it)} を ★${it.star} に強化した！`);
  renderAll();
}
function smithReforge(id) {
  const p = G.p;
  const it = [p.weapon, p.armor, ...p.bag].find(x => x && x.id === Number(id));
  if (!it) { toast('アイテムが見つかりません'); return; }
  const isMythic9 = it.rarity === 4 && it.star === 9;
  if (it.slot !== 'weapon' && !isMythic9) { toast('特性の付与は武器のみ行えます'); return; }
  const cost = reforgeCost(it);
  if (p.gold < cost) { toast(`所持金が足りません（${fmt(cost)}G必要）`); return; }
  p.gold -= cost;
  if (isMythic9) {
    const cnt = it.slot === 'weapon'
      ? weighted([[0, 15], [1, 40], [2, 30], [3, 15]])
      : weighted([[0, 30], [1, 45], [2, 25]]);
    it.props = rollUniqueProps(it.slot, cnt);
    it.prop = it.props[0] || null;
    const names = it.props.map(k => propMeta(it.slot, k)?.name).filter(Boolean);
    toast(names.length ? `再鍛造で［${names.join('・')}］が付与された！` : '再鍛造の結果、特性は付かなかった…');
  } else {
    it.prop = rnd() < 0.72 ? pick(Object.keys(PROPS)) : null;
    it.props = it.prop ? [it.prop] : [];
    toast(it.prop ? `再鍛造で［${PROPS[it.prop].name}］が付与された！` : '再鍛造の結果、特性は付かなかった…');
  }
  save();
  renderAll();
}
function buyShopItem(id) {
  const p = G.p, item = SHOP_ITEMS.find(x => x.id === id);
  if (!item) return;
  if (p.gold < item.price) { toast(`所持金が足りません（${fmt(item.price)}G必要）`); return; }
  if (item.kind === 'potion') {
    if ((p.potions[item.key] || 0) >= 99) { toast('これ以上持てません'); return; }
    p.gold -= item.price; p.potions[item.key] = (p.potions[item.key] || 0) + 1;
  } else if (item.kind === 'stone') {
    if ((p.stones[item.key] || 0) >= 999) { toast('これ以上持てません'); return; }
    p.gold -= item.price; p.stones[item.key] = (p.stones[item.key] || 0) + 1;
  }
  Sound.play('buy'); save(); toast(`${item.name}を1個購入した`); renderAll();
}
function expandBag() {
  const p = G.p, cap = p.bagCap || BAG_CAP;
  if (cap >= MAX_BAG_CAP) { toast('バッグは最大サイズです'); return; }
  const cost = bagExpandCost(cap);
  if (p.gold < cost) { toast(`所持金が足りません（${fmt(cost)}G必要）`); return; }
  p.gold -= cost;
  p.bagCap = cap + 10;
  save(); toast(`バッグ容量が ${p.bagCap} 枠に拡張された！`); renderAll();
}

function bankMove(dir, all) {
  const p = G.p;
  let amt = all ? (dir === 'dep' ? p.gold : p.bank) : Math.floor(Number($('#bank-amt').value));
  if (!isFinite(amt) || amt <= 0) { toast(all ? '対象のお金がありません' : '1以上の金額を入力してください'); return; }
  if (dir === 'dep') { if (amt > p.gold) { toast('所持金が足りません'); return; } p.gold -= amt; p.bank += amt; toast(`${fmt(amt)}G を預けました`); }
  else { if (amt > p.bank) { toast('預金が足りません'); return; } p.bank -= amt; p.gold += amt; toast(`${fmt(amt)}G を引き出しました`); }
  save(); renderAll();
}

/* ================= ranking ================= */
const isRankingSubmitConfigured = () => !!(RANKING_CFG.formUrl && RANKING_CFG.entryName && RANKING_CFG.entryFloor);

function validateRankingData(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.entries)) return null;
  const entries = [];
  for (const e of raw.entries) {
    if (!e || typeof e !== 'object' || typeof e.name !== 'string') continue;
    const nm = e.name.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    if (!nm || nm.length > RANKING_CFG.nameMax) continue;
    const fl = e.floor;
    if (typeof fl !== 'number' || !Number.isInteger(fl) || fl < 1 || fl > RANKING_CFG.maxFloor) continue;
    entries.push({ name: nm, floor: fl, date: typeof e.date === 'string' ? e.date : '' });
  }
  entries.sort((a, b) => b.floor - a.floor);
  return {
    updated: typeof raw.updated === 'string' ? raw.updated : '',
    entries: entries.slice(0, RANKING_CFG.top)
  };
}

function calcRankPosition(best, entries) {
  const b = Math.floor(Number(best) || 0);
  if (b < 1 || !Array.isArray(entries) || !entries.length) return { rank: null, text: '圏外' };
  const higher = entries.filter(e => e.floor > b).length;
  const rank = higher + 1;
  return rank <= RANKING_CFG.top ? { rank, text: `${rank}位相当` } : { rank: null, text: '圏外' };
}

function loadRankingCache() {
  try {
    const s = localStorage.getItem(RANKING_CFG.cacheKey);
    return s ? validateRankingData(JSON.parse(s)) : null;
  } catch { return null; }
}

function saveRankingCache(data) {
  try { localStorage.setItem(RANKING_CFG.cacheKey, JSON.stringify(data)); } catch {}
}

async function fetchRanking() {
  try {
    const res = await fetch(RANKING_CFG.rankingUrl, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.json();
    const data = validateRankingData(raw);
    if (!data) throw new Error('invalid ranking');
    saveRankingCache(data);
    return { ok: true, offline: false, data };
  } catch {
    const cached = loadRankingCache();
    if (cached) return { ok: true, offline: true, data: cached };
    return { ok: false, offline: true, data: null };
  }
}

function cleanRankNick(s) {
  const nm = String(s || '').replace(/[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060\ufeff]/g, '').trim();
  if (!nm) return { ok: false, error: 'ニックネームを入力してください（1〜12文字）' };
  if (nm.length > RANKING_CFG.nameMax) return { ok: false, error: `ニックネームは${RANKING_CFG.nameMax}文字以内で入力してください` };
  if (/https?:|www\.|@/i.test(nm)) return { ok: false, error: 'URLや@を含むニックネームは使用できません' };
  return { ok: true, name: nm };
}

let rankSending = false;
async function submitTowerRank(best, opts = {}) {
  const p = G.p, tw = p && p.tower;
  if (!isRankingSubmitConfigured()) {
    if (opts.manual) toast('ランキング送信は準備中です');
    return { ok: false, reason: 'unconfigured' };
  }
  if (!tw || !tw.rankOptIn) return { ok: false, reason: 'optout' };
  const nc = cleanRankNick(tw.nick);
  if (!nc.ok) {
    if (opts.manual) toast(nc.error);
    return { ok: false, reason: 'invalid_nick', error: nc.error };
  }
  const fl = Math.floor(Number(best) || 0);
  if (!Number.isInteger(fl) || fl < 1 || fl > RANKING_CFG.maxFloor) return { ok: false, reason: 'invalid_floor' };
  if (fl <= (tw.sentBest || 0)) return { ok: false, reason: 'already_sent' };
  if (rankSending) return { ok: false, reason: 'busy' };
  rankSending = true;
  try {
    const body = new URLSearchParams({ [RANKING_CFG.entryName]: nc.name, [RANKING_CFG.entryFloor]: String(fl) });
    await fetch(RANKING_CFG.formUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    tw.sentBest = fl;
    save();
    G.rankMsg = '記録を送信しました（ランキングへの反映には時間がかかります）';
    const el = $('#rk-res-status') || $('#rk-form-msg');
    if (el) el.textContent = G.rankMsg;
    if (opts.manual) toast(G.rankMsg);
    return { ok: true, floor: fl };
  } catch {
    G.rankMsg = '送信できませんでした';
    const el = $('#rk-res-status') || $('#rk-form-msg');
    if (el) el.textContent = G.rankMsg;
    if (opts.manual) toast(G.rankMsg);
    return { ok: false, reason: 'network' };
  } finally {
    rankSending = false;
  }
}

function claimDexReward(key) {
  const p = G.p;
  if (!p || !p.ending) { toast('本編クリアで受け取り可能になります'); return { ok: false, reason: 'locked' }; }
  p.dex = p.dex || { enemies: {}, items: {}, rewards: {} };
  p.dex.rewards = p.dex.rewards || {};
  if (p.dex.rewards[key]) { toast('すでに受け取り済みです'); return { ok: false, reason: 'claimed' }; }
  const enMap = p.dex.enemies || {}, itMap = p.dex.items || {};
  const groups = dexEnemyGroups();
  let coins = 0, titleId = null;
  if (key === 'all_enemies') {
    const all = groups.flatMap(g => g.list);
    if (!all.every(e => enMap[e.id] && enMap[e.id].seen)) return { ok: false, reason: 'incomplete' };
    coins = 100; titleId = 't_dex_en';
  } else if (key === 'all_items') {
    const req = [];
    for (const sl of ['weapon', 'armor']) {
      for (const st of DEX_STARS) req.push(`${sl}_${st}`);
      for (const st of DEX_MYTHICS) req.push(`${sl}_m${st}`);
    }
    if (!req.every(k => itMap[k])) return { ok: false, reason: 'incomplete' };
    coins = 100; titleId = 't_dex_it';
  } else if (key && key.startsWith('grp_')) {
    const gid = key.slice(4);
    const g = groups.find(x => x.id === gid);
    if (!g) return { ok: false, reason: 'invalid' };
    const reqList = gid === 'O' ? g.list.slice(0, 6) : g.list; // 通常敵5＋ボス1（深淵は主3体）
    if (!reqList.every(e => enMap[e.id] && enMap[e.id].seen)) return { ok: false, reason: 'incomplete' };
    coins = g.rewardCoins;
  } else {
    return { ok: false, reason: 'invalid' };
  }
  p.dex.rewards[key] = true;
  p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [], nick: '', rankOptIn: false, sentBest: 0 };
  p.tower.coins = (p.tower.coins || 0) + coins;
  p.tower.totalCoins = (p.tower.totalCoins || 0) + coins;
  let titleName = '';
  if (titleId) {
    p.tower.titles = p.tower.titles || [];
    if (!p.tower.titles.includes(titleId)) p.tower.titles.push(titleId);
    const tObj = TOWER_TITLES.find(t => t.id === titleId);
    titleName = tObj ? tObj.name : '';
  }
  save();
  checkAchievements('dex');
  toast(titleName ? `回廊コイン ${coins}枚と称号「${titleName}」を獲得！` : `回廊コイン ${coins}枚を獲得！`);
  return { ok: true, coins, title: titleName };
}

