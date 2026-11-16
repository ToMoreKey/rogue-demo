
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

const maxHp = p => Math.round((60 + p.lv * 12) * (p.passiveSkills ? passiveBonus(p).hpMult : 1));
const maxMp = p => Math.round((16 + p.lv * 4) * (p.passiveSkills ? passiveBonus(p).mpMult : 1));
const baseAtk = p => 8 + p.lv * 2;
const baseDef = p => 2 + p.lv;
const expNeed = lv => Math.round(20 * Math.pow(lv, 1.6));

const itemPower = it => Math.max(1, Math.round((it.slot === 'weapon' ? WEAPON_BASE : ARMOR_BASE)[it.star] * RARITY[it.rarity].mult * it.roll));
const weaponAtk = it => it ? Math.round(itemPower(it) * ((it.prop && PROPS[it.prop].atkMult) || 1)) : 0;
const itemName = it => PREFIX[it.rarity] + (it.slot === 'weapon' ? WEAPON_NAMES : ARMOR_NAMES)[it.star];
const sellValue = it => Math.max(1, Math.round(RARITY[it.rarity].sell * (1 + (it.star - 1) * 0.5) * (0.6 + 0.4 * it.roll)));
const gearScore = it => {
  if (!it) return 0;
  const pw = itemPower(it);
  if (it.slot === 'armor') return pw;
  return pw * (it.prop === 'flame' ? 1.2 : it.prop === 'vamp' ? 1.05 : 1);
};
const playerAtk = p => baseAtk(p) + weaponAtk(p.weapon);
const playerDef = p => baseDef(p) + (p.armor ? itemPower(p.armor) : 0);

function mkItem(p, o) {
  return { id: p.nextId++, slot: o.slot, star: o.star, rarity: o.rarity, roll: o.roll, prop: o.prop || null, locked: false };
}
function newPlayer() {
  const stones = {}; for (const st of STONES) stones[st.id] = 0;
  const p = { lv: 1, exp: 0, hp: 1, mp: 1, sp: 3, gold: 50, bank: 0, weapon: null, armor: null, bag: [], skills: {}, skillPts: { sword: 0, magic: 0, life: 0, warrior: 0, mage: 0, cleric: 0, hero: 0 }, passiveSkills: {}, equippedSkills: [null, null, null], potions: { hp: 0, mp: 0 }, stones, stats: { runs: 0, clears: 0, kills: 0 }, nextId: 1 };
  p.weapon = mkItem(p, { slot: 'weapon', star: 1, rarity: 0, roll: 0.8 });
  p.armor = mkItem(p, { slot: 'armor', star: 1, rarity: 0, roll: 0.8 });
  p.hp = maxHp(p); p.mp = maxMp(p);
  return p;
}
