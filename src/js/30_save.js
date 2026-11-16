
/* ================= save / load ================= */
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, p: G.p, opts: G.opts, sel: G.sel, shopSel: G.shopSel, autoSellRarity: G.autoSellRarity })); } catch (e) { /* storage unavailable */ }
}
function cleanItem(it) {
  if (!it || typeof it !== 'object') return null;
  const slot = it.slot === 'weapon' || it.slot === 'armor' ? it.slot : null;
  const star = Math.round(Number(it.star)), rarity = Math.round(Number(it.rarity)), roll = Number(it.roll);
  if (!slot || !(star >= 1 && star <= MAX_STAR) || !(rarity >= 0 && rarity <= MAX_RARITY) || !isFinite(roll)) return null;
  return { id: Number(it.id) || 0, slot, star, rarity, roll: clamp(roll, 0.5, 1), prop: slot === 'weapon' && PROPS[it.prop] ? it.prop : null, locked: !!it.locked };
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
    const d = JSON.parse(raw); if (!d || !d.p) return false;
    const base = newPlayer(), s = d.p;
    const num = (v, def, lo = 0, hi = 1e12) => { v = Number(v); return isFinite(v) ? clamp(Math.floor(v), lo, hi) : def; };
    const p = base;
    p.lv = num(s.lv, 1, 1, LV_CAP); p.exp = num(s.exp, 0); p.sp = num(s.sp, 0); p.gold = num(s.gold, 50); p.bank = num(s.bank, 0);
    p.weapon = cleanItem(s.weapon); p.armor = cleanItem(s.armor);
    p.bag = Array.isArray(s.bag) ? s.bag.map(cleanItem).filter(Boolean).slice(0, BAG_CAP) : [];
    p.skills = {}; if (s.skills) for (const k of SK_ORDER) if (s.skills[k]) p.skills[k] = true;
    p.skillPts = { sword: 0, magic: 0, life: 0, warrior: 0, mage: 0, cleric: 0, hero: 0 };
    if (s.skillPts && typeof s.skillPts === 'object') {
      for (const k of ['sword','magic','life','warrior','mage','cleric','hero']) {
        p.skillPts[k] = num(s.skillPts[k], 0, 0, 20);
      }
    }
    p.passiveSkills = {};
    if (s.passiveSkills && typeof s.passiveSkills === 'object') {
      const validPassives = ['sword15','magic15','life15','warrior10','mage10','cleric10','hero10'];
      for (const k of validPassives) if (s.passiveSkills[k]) p.passiveSkills[k] = true;
    }
    p.equippedSkills = [null, null, null];
    if (Array.isArray(s.equippedSkills)) {
      for (let i = 0; i < 3; i++) {
        const id = s.equippedSkills[i];
        if (id && SK[id]) p.equippedSkills[i] = id;
      }
    }
    p.potions = { hp: num(s.potions && s.potions.hp, 0, 0, 99), mp: num(s.potions && s.potions.mp, 0, 0, 99) };
    p.stats = { runs: num(s.stats && s.stats.runs, 0), clears: num(s.stats && s.stats.clears, 0), kills: num(s.stats && s.stats.kills, 0) };
    if (s.stones && typeof s.stones === 'object') {
      for (const st of STONES) p.stones[st.id] = num(s.stones[st.id], 0, 0, 999);
    }
    let id = 1; [p.weapon, p.armor, ...p.bag].forEach(it => { if (it) it.id = id++; }); p.nextId = id;
    p.hp = clamp(num(s.hp, maxHp(p)), 1, maxHp(p)); p.mp = clamp(num(s.mp, maxMp(p)), 0, maxMp(p));
    G.p = p;
    if (d.opts) { G.opts.speed = [1, 2, 4].includes(d.opts.speed) ? d.opts.speed : 1; G.opts.autoSkill = d.opts.autoSkill !== false; G.opts.autoEquip = d.opts.autoEquip !== false; }
    if (d.sel) for (const { id: k } of DUNGEONS) if (DIFFS.some(x => x.id === d.sel[k])) G.sel[k] = d.sel[k];
    if (Array.isArray(d.shopSel) && d.shopSel.length === 4) G.shopSel = d.shopSel.map(Boolean);
    if (typeof d.autoSellRarity === 'number' && d.autoSellRarity >= -1 && d.autoSellRarity <= 3) G.autoSellRarity = d.autoSellRarity;
    return true;
  } catch (e) { return false; }
}
