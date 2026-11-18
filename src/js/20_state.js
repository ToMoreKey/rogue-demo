
/* ================= state ================= */
const G = {
  p: null, view: 'town', run: null, last: null, modalOpen: false, noTimer: false, headless: false,
  opts: { speed: 1, autoSkill: true, autoEquip: true },
  sel: Object.fromEntries(DUNGEONS.map(d => [d.id, DIFFS[0].id])),
  shopSel: [true, true, true, false],
  autoSellRarity: 2,   // -1=売却しない 0=コモン以下 1=アンコモン以下 2=レア以下 3=全て
  resetArm: false,
  smithOpen: false,
  townView: 'plaza',  // 'plaza'|'inn'|'shop'|'smith'|'bank'
  tutorial: null  // { step: 0-6, done: false } or null
};

function towerEff(run) {
  const r = { atkMult: 1, defMult: 1, hpMult: 1, mpMult: 1, dmgMult: 1, takenMult: 1, ctRed: 0, healMult: 1, expMult: 1, goldMult: 1, coinMult: 1, killHeal: 0, killMp: 0, firstCrit: false, reviveOnce: false, bossDmg: 0, eventBoost: 0, lifeSteal: 0, thorns: 0 };
  if (!run || !run.tower || !run.tower.blessings) return r;
  const tens = Math.floor((run.floor || 1) / 10);
  let atkP = 0, defP = 0, hpP = 0, mpP = 0, dmgP = 0, takenP = 0;
  for (const id of run.tower.blessings) {
    const b = TOWER_BLESSINGS.find(x => x.id === id);
    if (!b || !b.eff) continue;
    const e = b.eff;
    if (e.atkPct) atkP += e.atkPct;
    if (e.defPct) defP += e.defPct;
    if (e.hpPct) hpP += e.hpPct;
    if (e.mpPct) mpP += e.mpPct;
    if (e.dmgPct) dmgP += e.dmgPct;
    if (e.takenPct) takenP += e.takenPct;
    if (e.ctRed) r.ctRed += e.ctRed;
    if (e.healPct) r.healMult += e.healPct;
    if (e.expPct) r.expMult += e.expPct;
    if (e.goldPct) r.goldMult += e.goldPct;
    if (e.coinPct) r.coinMult += e.coinPct;
    if (e.floorAtk10) atkP += e.floorAtk10 * tens;
    if (e.floorDef10) defP += e.floorDef10 * tens;
    if (e.floorHp10) hpP += e.floorHp10 * tens;
    if (e.floorDmg10) dmgP += e.floorDmg10 * tens;
    if (e.killHeal) r.killHeal += e.killHeal;
    if (e.killMp) r.killMp += e.killMp;
    if (e.firstCrit) r.firstCrit = true;
    if (e.reviveOnce) r.reviveOnce = true;
    if (e.bossDmg) r.bossDmg += e.bossDmg;
    if (e.eventBoost) r.eventBoost += e.eventBoost;
    if (e.lifeSteal) r.lifeSteal += e.lifeSteal;
    if (e.thorns) r.thorns += e.thorns;
  }
  r.atkMult = Math.max(0.2, 1 + atkP);
  r.defMult = Math.max(0.2, 1 + defP);
  r.hpMult = Math.max(0.2, 1 + hpP);
  r.mpMult = Math.max(0.2, 1 + mpP);
  r.dmgMult = Math.max(0.2, 1 + dmgP);
  r.takenMult = Math.max(0.2, 1 + takenP);
  return r;
}

const maxHp = p => Math.round((60 + p.lv * 12) * (p.passiveSkills ? passiveBonus(p).hpMult : 1) * (G.run && G.run.tower ? towerEff(G.run).hpMult : 1));
const maxMp = p => Math.round((16 + p.lv * 4) * (p.passiveSkills ? passiveBonus(p).mpMult : 1) * (G.run && G.run.tower ? towerEff(G.run).mpMult : 1));
const baseAtk = p => 8 + p.lv * 2;
const baseDef = p => 2 + p.lv;
const expNeed = lv => Math.round(17.5 * Math.pow(lv, 1.55) * (lv >= 30 ? 1 + (lv - 29) * 0.015 : 1) * (lv >= 56 ? 1 + (lv - 55) * 0.022 : 1));

const itemPower = it => Math.max(1, Math.round((it.slot === 'weapon' ? WEAPON_BASE : ARMOR_BASE)[it.star] * RARITY[it.rarity].mult * it.roll));
const weaponAtk = it => it ? Math.round(itemPower(it) * ((it.prop && PROPS[it.prop].atkMult) || 1)) : 0;
const itemName = (it, skinId) => {
  const sk = skinId || (G.p && G.p.skin) || 'ruby';
  const base = it.slot === 'weapon'
    ? WEAPON_NAMES[it.star]
    : (it.star === 5 && ARMOR_STAR5_NAMES[sk]) || ARMOR_NAMES[it.star];
  return PREFIX[it.rarity] + base;
};
const sellValue = it => Math.max(1, Math.round(RARITY[it.rarity].sell * 0.65 * (1 + (it.star - 1) * 0.5) * (0.6 + 0.4 * it.roll)));
// 戦力値（表示用）: 武器は実効攻撃力、防具は実効防御力
const gearPower = it => !it ? 0 : (it.slot === 'weapon' ? weaponAtk(it) : itemPower(it));
// 自動装備・おすすめ判定用スコア（P1前と同等: 狂気はHP消費リスクのため攻撃2倍を評価せず倍率1.0）
const gearScore = it => {
  if (!it) return 0;
  const pw = itemPower(it);
  if (it.slot === 'armor') return pw;
  return pw * (it.prop === 'flame' ? 1.2 : it.prop === 'vamp' ? 1.05 : 1);
};
const bestGearItem = (p, slot) => {
  if (!p) return null;
  let best = p[slot] && p[slot].slot === slot && p[slot].prop !== 'madness' ? p[slot] : null;
  for (const it of (p.bag || [])) {
    if (it && it.slot === slot && it.prop !== 'madness' && gearScore(it) > gearScore(best)) best = it;
  }
  return best;
};
const playerAtk = p => Math.round((baseAtk(p) + weaponAtk(p.weapon)) * (G.run && G.run.tower ? towerEff(G.run).atkMult : 1));
const playerDef = p => Math.round((baseDef(p) + (p.armor ? itemPower(p.armor) : 0)) * (G.run && G.run.tower ? towerEff(G.run).defMult : 1));

function mkItem(p, o) {
  return { id: p.nextId++, slot: o.slot, star: o.star, rarity: o.rarity, roll: o.roll, prop: o.prop || null, locked: false };
}
function isDungeonUnlocked(p, d) {
  if (!d) return false;
  if (!d.unlock) return true;
  return !!(p && p.cleared && p.cleared[d.unlock.d] && p.cleared[d.unlock.d][d.unlock.df]);
}
function isDiffUnlocked(p, d, df) {
  if (!d || !df || !isDungeonUnlocked(p, d)) return false;
  if (!df.reqDiff) return true;
  return !!(p && p.cleared && p.cleared[d.id] && p.cleared[d.id][df.reqDiff]);
}
function newPlayer() {
  const stones = {}; for (const st of STONES) stones[st.id] = 0;
  const p = { lv: 1, exp: 0, hp: 1, mp: 1, sp: 3, gold: 50, bank: 0, weapon: null, armor: null, bag: [], bagCap: BAG_CAP, cleared: {}, part1Cleared: false, ending: false, tower: { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] }, skills: {}, skillPts: { sword: 0, magic: 0, life: 0, warrior: 0, mage: 0, cleric: 0, hero: 0 }, passiveSkills: {}, equippedSkills: [null, null, null], potions: { hp: 0, mp: 0 }, stones, stats: { runs: 0, clears: 0, kills: 0 }, nextId: 1 };
  p.weapon = mkItem(p, { slot: 'weapon', star: 1, rarity: 0, roll: 0.8 });
  p.armor = mkItem(p, { slot: 'armor', star: 1, rarity: 0, roll: 0.8 });
  p.hp = maxHp(p); p.mp = maxMp(p);
  return p;
}
