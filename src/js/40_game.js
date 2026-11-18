
/* ================= toast ================= */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
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
  if (it.slot === 'weapon' && rnd() < 0.3) it.prop = pick(Object.keys(PROPS));
  return it;
}
// returns a short outcome string for the log: 'equipped' | 'bag' | 'sold'
function receiveItem(it) {
  const p = G.p, slot = it.slot, cap = p.bagCap || BAG_CAP;
  if (G.opts.autoEquip && it.prop !== 'madness' && gearScore(it) > gearScore(p[slot])) {
    const old = p[slot];
    p[slot] = it;
    if (old) {
      if (p.bag.length < cap) p.bag.push(old); else p.gold += sellValue(old);
    }
    return 'equipped';
  }
  // 自動売却フィルター
  if (G.autoSellRarity >= 0 && it.rarity <= G.autoSellRarity && !it.locked) {
    const v = sellValue(it); p.gold += v; if (G.run) G.run.gold += v; return 'sold';
  }
  if (p.bag.length >= cap) { const v = sellValue(it); p.gold += v; if (G.run) G.run.gold += v; return 'sold'; }
  p.bag.push(it);
  return 'bag';
}
function equipBest() {
  const p = G.p; let n = 0;
  for (const slot of ['weapon', 'armor']) {
    const cur = p[slot];
    let best = cur && cur.prop !== 'madness' ? cur : null;
    for (const it of p.bag) if (it.slot === slot && it.prop !== 'madness' && gearScore(it) > gearScore(best)) best = it;
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
  G.view = 'dungeon';
  $('#log').innerHTML = '';
  addLog(`ダンジョン${d.id}「${d.name}」（${df.name}・全${df.floors}階層）に突入した！`, 'l-sys');
  renderAll(); ensureLoop();
}

const towerBand = floor => TOWER_CFG.bands.find(b => floor <= b.maxFloor) || TOWER_CFG.bands[TOWER_CFG.bands.length - 1];
function rollTowerBlessings(owned) {
  const pool = TOWER_BLESSINGS.filter(b => !owned.includes(b.id));
  const out = [];
  while (out.length < 3 && pool.length > 0) {
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
  G.view = 'dungeon';
  $('#log').innerHTML = '';
  addLog('無限回廊「天蓋の塔」に突入した！', 'l-sys');
  renderAll(); ensureLoop();
}

function nextFloor() {
  const run = G.run;
  run.floor++;
  if (run.tower) {
    const boss = run.floor % 10 === 0;
    const evCh = 0.16 + towerEff(run).eventBoost;
    if (!boss && run.floor >= 2 && rnd() < evCh) { runEvent(); run.phase = 'pause'; run.cleared++; }
    else spawnEnemy(boss, false);
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
  } else {
    base = boss ? d.boss : (miniboss ? d.mobs.reduce((a, b) => b.hp > a.hp ? b : a) : pick(d.mobs));
    name = (boss && run.df.bossPrefix ? run.df.bossPrefix : miniboss ? '強敵 ' : '') + base.name;
    bossFilter = boss && run.df.bossFilter ? run.df.bossFilter : (miniboss ? 'hue-rotate(155deg) saturate(1.45) contrast(1.12)' : '');
  }
  const S = scaleOf(run, run.floor);
  const Sa = Math.pow(S, TUNE.atkExp);
  const hp = Math.max(1, Math.round(base.hp * S * TUNE.hpScale * (boss ? TUNE.bossHp : miniboss ? 1.55 : 1)));
  run.enemy = {
    id: base.id, name, shape: base.shape, boss, miniboss, bossFilter, hp, maxHp: hp, firstHit: true,
    atk: Math.max(1, Math.round(base.atk * Sa * TUNE.atkScale * (boss ? TUNE.bossAtk : miniboss ? 1.15 : 1))),
    def: Math.round(base.def * Sa * TUNE.defScale * (boss ? TUNE.bossDef : miniboss ? 1.1 : 1)),
    exp: Math.max(1, Math.round(base.exp * S * TUNE.expScale * (run.df.expMult || 1) * (miniboss ? 1.5 : 1))),
    gold: Math.max(1, Math.round(base.gold * S * TUNE.goldScale * (0.8 + rnd() * 0.4) * (miniboss ? 1.5 : 1)))
  };
  run.phase = 'battle';
  addLog(`【${run.floor}F】${boss ? 'ボス ' : miniboss ? '節目の強敵 ' : ''}${name}が現れた！`, (boss || miniboss) ? 'l-gold' : 'l-sys');
  renderEnemy(true);
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
    p.hp = maxHp(p); p.mp = maxMp(p);
    addLog(`【${run.floor}F】回復の泉だ。HPとMPが全回復した！`, 'l-good');
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
  const stat = it.slot === 'weapon' ? `攻${itemPower(it)}` : `防${itemPower(it)}`;
  addLog(`入手：${itemName(it)} ★${it.star}${it.prop ? ' ［' + PROPS[it.prop].name + '］' : ''} ${stat}${tail}`, 'l-r' + it.rarity);
}

/* ---- battle ---- */
function calcDmg(atk, def) {
  return Math.max(1, Math.round(atk * (0.9 + rnd() * 0.2) * 40 / (40 + Math.max(0, def))));
}
function canUse(id) {
  const p = G.p, run = G.run;
  if (id === 'attack') return true;
  if (!p.skills[id]) return false;
  if (p.mp < SK[id].mp) return false;
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
function useSkillEffect(id) {
  const p = G.p, run = G.run, en = run.enemy;
  const s = SK[id], te = towerEff(run);
  p.mp -= s.mp;
  // CTをセット
  if (s.ct) run.skillCt[id] = Math.max(1, s.ct - te.ctRed);
  if (s.type === 'heal') {
    const h = Math.max(1, Math.round(maxHp(p) * s.pct * te.healMult)); const before = p.hp;
    p.hp = Math.min(maxHp(p), p.hp + h);
    addLog(`${s.name}！ HPが${p.hp - before}回復した。`, 'l-good'); popDamage('player', `+${p.hp - before}`, 'heal');
    if (s.mpFull) { const mb = p.mp; p.mp = maxMp(p); if (p.mp > mb) addLog(`MPが${p.mp - mb}回復した。`, 'l-good'); }
    if (s.defTurns) { run.defBuff = s.defTurns; addLog(`${s.defTurns}ターン防御力1.5倍！`, 'l-good'); }
    if (s.regen) { run.regenTurns = s.regen; run.regenPct = s.pct; }
    return true;
  }
  if (s.type === 'buff') {
    if (id === 'guard') { run.guard = s.turns; addLog('鉄壁の構え！ 防御力が2倍になった。', 'l-good'); }
    else if (id === 'magicshield') { run.magicShield = s.turns; addLog('マジックシールド！ 魔法防御力が上がった。', 'l-good'); }
    else if (id === 'berserk') { run.berserk = s.turns; addLog('バーサーク！ 攻撃力が3倍になった！', 'l-good'); }
    else if (id === 'warGod') { run.warGod = s.turns; addLog('鬼神の構え！ 攻撃力が1.8倍になった！', 'l-good'); }
    else if (s.shura) { run.shura = s.turns; addLog('修羅の構え！ 攻撃力が4倍になった！', 'l-good'); }
    else if (s.awaken) { run.awaken = s.turns; addLog('英雄の覚醒！ 全ステータスが2.5倍になった！', 'l-good'); }
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
    return;
  }
  // attack / atk系スキル
  const s = id === 'attack' ? { name: '攻撃', hits: 1, mult: 1 } : SK[id];
  const te = towerEff(run);
  if (id !== 'attack') {
    p.mp -= s.mp;
    if (s.ct) run.skillCt[id] = Math.max(1, s.ct - te.ctRed);
  }
  if (p.weapon && p.weapon.prop === 'madness') {
    const loss = Math.ceil(maxHp(p) * 0.1), before = p.hp;
    p.hp = Math.max(1, p.hp - loss);
    if (before - p.hp > 0) { addLog(`狂気の代償でHPが${before - p.hp}減った。`, 'l-dmg'); popDamage('player', `-${before - p.hp}`, 'bad'); }
  }
  const pa = playerAtk(p) * (run.warGod > 0 ? 1.8 : 1) * (run.shura > 0 ? 4 : 1) * (run.awaken > 0 ? 2.5 : 1);
  if (run.warGod > 0) run.warGod--;
  if (run.awaken > 0) run.awaken--;
  let dealt = 0, crits = 0, hits = 0;
  const bossMult = en.boss ? (1 + te.bossDmg) : 1;
  for (let i = 0; i < s.hits; i++) {
    if (en.hp <= 0) break;
    const crit = (te.firstCrit && en.firstHit) ? true : (rnd() < 0.1);
    en.firstHit = false;
    const dmg = calcDmg(pa * s.mult * (crit ? 1.5 : 1) * te.dmgMult * bossMult, en.def);
    en.hp = Math.max(0, en.hp - dmg); dealt += dmg; hits++; if (crit) crits++;
    popDamage('enemy', String(dmg), crit ? 'crit' : 'dmg');
  }
  hitFlash('enemy'); playAttackMotion();
  addLog(`${id === 'attack' ? '' : s.name + '！ '}${en.name}に${hits > 1 ? hits + '回で合計' : ''}${dealt}ダメージ${crits ? '（会心！）' : ''}`, 'l-hit');
  if (s.freeze && en.hp > 0) { run.frozen = 1; addLog(`${en.name}は凍りついた！`, 'l-good'); }
  const stealPct = (p.weapon && p.weapon.prop === 'vamp' ? 0.1 : 0) + te.lifeSteal;
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
  const def = playerDef(p) * (run.guard > 0 ? 2 : 1) * (run.defBuff > 0 ? 1.5 : 1) * (run.awaken > 0 ? 2.5 : 1);
  const dmg = Math.max(1, Math.round(calcDmg(en.atk, def) * (run.shura > 0 ? 1.2 : 1) * te.takenMult));
  if (run.shura > 0) run.shura--;
  if (run.defBuff > 0) run.defBuff--;
  p.hp = Math.max(0, p.hp - dmg);
  addLog(`${en.name}の${en.raged ? '終焉の一撃' : '攻撃'}！ ${dmg}ダメージを受けた。`, 'l-dmg');
  popDamage('player', String(dmg), 'bad'); hitFlash('player');
  if (run.guard > 0) { run.guard--; if (run.guard === 0) addLog('鉄壁の効果が切れた。', 'l-sys'); }
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
    en.atk = Math.round(en.atk * 1.35);
    addLog('ニヒルの仮面が砕け散った！ 終焉神ニヒル・真へと姿を変え、攻撃力が激増した！', 'l-dmg');
    renderEnemy(true);
  }
  enemyAct();
  if (en.hp <= 0) { onKill(); return; }
  if (p.hp <= 0 && run.tower && towerEff(run).reviveOnce && !run.tower.reviveUsed) {
    run.tower.reviveUsed = true;
    p.hp = Math.max(1, Math.round(maxHp(p) * 0.3));
    addLog('不死鳥の羽が輝き、HP30%で蘇った！', 'l-good');
  }
  if (p.hp <= 0) { finishRun('defeat'); return; }
  if (run.regenTurns > 0) {
    run.regenTurns--;
    const h = Math.max(1, Math.round(maxHp(p) * (run.regenPct || 0.15))), b = p.hp;
    p.hp = Math.min(maxHp(p), p.hp + h);
    if (p.hp > b) { addLog(`リジェネ効果でHPが${p.hp - b}回復した。`, 'l-good'); popDamage('player', `+${p.hp - b}`, 'heal'); }
  }
}

function onKill() {
  const p = G.p, run = G.run, en = run.enemy, te = towerEff(run);
  run.kills++; p.stats.kills++; run.cleared++;
  const expGain = Math.round(en.exp * te.expMult);
  const goldGain = Math.round(en.gold * te.goldMult);
  addLog(`${en.name}を倒した！ EXP+${expGain}　${goldGain}G`, 'l-gold');
  p.gold += goldGain; run.gold += goldGain;
  gainExp(expGain);
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
    const capStar = tBand ? tBand.maxDropStar : (run.d.maxStar || MAX_STAR);
    const bStar = tBand ? tBand.bossCapStar : run.d.bossMaxStar;
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
    if (en.boss) { drops.push(rollBossItem()); drops.push(rollBossItem()); }
    else if (en.miniboss) drops.push(rollBossItem());
    else if (rnd() < 0.3) drops.push(genItem(run.df, false, null, capStar));
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
  if (TUNE.floorRegen > 0 && !en.boss) {
    const h = Math.round(maxHp(p) * TUNE.floorRegen), b = p.hp;
    p.hp = Math.min(maxHp(p), p.hp + h);
    if (p.hp > b) addLog(`小休止でHPが${p.hp - b}回復した。`, 'l-sys');
  }
  if (run.tower && en.boss) {
    const choices = rollTowerBlessings(run.tower.blessings);
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
  p.exp += n;
  while (p.lv < LV_CAP && p.exp >= expNeed(p.lv)) {
    p.exp -= expNeed(p.lv);
    const oh = maxHp(p), om = maxMp(p);
    p.lv++; p.sp++; run.sp++;
    const dh = maxHp(p) - oh, dm = maxMp(p) - om;
    p.hp = Math.min(maxHp(p), p.hp + dh + Math.round(maxHp(p) * 0.2));
    p.mp = Math.min(maxMp(p), p.mp + dm);
    addLog(`レベルアップ！ Lv${p.lv} になった。SP+1`, 'l-gold');
  }
  if (p.lv >= LV_CAP) p.exp = 0;
}

function finishRun(result) {
  const run = G.run, p = G.p;
  if (!run) return;
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
  G.last = {
    result, d: run.d, df: run.df, floors: run.floors, floor: Math.min(run.floor, run.floors || run.floor), cleared: run.cleared,
    gold: run.gold + clearGold, clearGold, lost, sp: run.sp + clearSp, items: run.items, potions: run.potions,
    lvFrom: run.startLv, lvTo: p.lv, kills: run.kills, part1End, ending, tower: towerRes
  };
  G.run = null;
  G.townView = 'plaza';  // 街帰還時は広場に戻る
  save();
  renderAll();
  openModal();
  ensureLoop();
}

/* ================= loop ================= */
let loopTimer = null;
function tick() {
  const run = G.run; if (!run) return;
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
    const b = p.hp; p.hp = Math.min(maxHp(p), p.hp + Math.round(maxHp(p) * 0.3)); p.potions.hp--;
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
  save();
  toast(`${itemName(it)} を ★${it.star} に強化した！`);
  renderAll();
}
function smithReforge(id) {
  const p = G.p;
  const it = [p.weapon, p.armor, ...p.bag].find(x => x && x.id === Number(id));
  if (!it) { toast('アイテムが見つかりません'); return; }
  if (it.slot !== 'weapon') { toast('特性の付与は武器のみ行えます'); return; }
  const cost = reforgeCost(it);
  if (p.gold < cost) { toast(`所持金が足りません（${fmt(cost)}G必要）`); return; }
  p.gold -= cost;
  it.prop = rnd() < 0.72 ? pick(Object.keys(PROPS)) : null;
  save();
  toast(it.prop ? `再鍛造で［${PROPS[it.prop].name}］が付与された！` : '再鍛造の結果、特性は付かなかった…');
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
  save(); toast(`${item.name}を1個購入した`); renderAll();
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

