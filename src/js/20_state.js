
/* ================= state ================= */
let _tutorialState = null;
const G = {
  p: null, view: 'town', run: null, last: null, modalOpen: false, noTimer: false, headless: false,
  opts: { speed: 1, autoSkill: true, autoEquip: false },
  sel: Object.fromEntries(DUNGEONS.map(d => [d.id, DIFFS[0].id])),
  shopSel: [true, true, true, false],
  autoSellRarity: 2,   // -1=売却しない 0=コモン以下 1=アンコモン以下 2=レア以下 3=全て
  resetArm: false,
  smithOpen: false,
  townView: 'plaza',  // 'plaza'|'inn'|'shop'|'smith'|'bank'
  statusTab: 'hero',  // 'hero'|'gear'|'skill'|'mastery'|'data' (memory only)
  helpTab: 'intro',   // 'intro'|'world'|'skill'|'status'|'endgame' (memory only)
  get tutorial() { return _tutorialState; },
  set tutorial(v) {
    _tutorialState = v;
    if ((!v || v.done) && this._charSelectOpen) {
      this._charSelectOpen = false;
      if (typeof closeModal === 'function') closeModal();
    }
  }
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

const isAbyssUnlocked = p => {
  if (!p || !p.cleared) return { ok: false, remaining: DUNGEONS.length };
  let rem = 0;
  for (const d of DUNGEONS) if (!(p.cleared[d.id] && p.cleared[d.id].extreme)) rem++;
  return { ok: rem === 0, remaining: rem };
};
const isAbyssDiffUnlocked = (p, lv) => {
  if (!isAbyssUnlocked(p).ok) return false;
  if (lv <= 1) return true;
  return !!(p.abyss && p.abyss.cleared && p.abyss.cleared[lv - 1]);
};
function abyssEff(run) {
  const lv = (run && run.abyss && run.abyss.lv) || 0;
  return {
    lv,
    healMult: lv >= 1 ? 0.5 : 1,
    ctAdd: lv >= 2 ? 1 : 0,
    enAtkMult: lv >= 3 ? 1.15 : 1,
    enHpMult: lv >= 4 ? 1.25 : 1,
    mpMult: lv >= 5 ? 0.75 : 1,
    noRest: lv >= 6,
    takenMult: lv >= 7 ? 1.2 : 1,
    preempt: lv >= 8 ? 0.3 : 0,
    dropMult: lv >= 9 ? 0.5 : 1,
    bossAtkMult: lv >= 10 ? 1.2 : 1
  };
}

const maxHp = p => Math.round((60 + p.lv * 12) * (p.passiveSkills ? passiveBonus(p).hpMult : 1) * (p.mastery ? masteryBonus(p).hpMult : 1) * (G.run && G.run.tower ? towerEff(G.run).hpMult : 1));
const maxMp = p => Math.round((16 + p.lv * 4) * (p.passiveSkills ? passiveBonus(p).mpMult : 1) * (p.mastery ? masteryBonus(p).mpMult : 1) * (G.run && G.run.tower ? towerEff(G.run).mpMult : 1) * (G.run && G.run.abyss ? abyssEff(G.run).mpMult : 1));
const baseAtk = p => 8 + p.lv * 2;
const baseDef = p => 2 + p.lv;
const expNeed = lv => Math.round(17.5 * Math.pow(lv, 1.55) * (lv >= 30 ? 1 + (lv - 29) * 0.015 : 1) * (lv >= 56 ? 1 + (lv - 55) * 0.022 : 1));

const itemProps = it => !it ? [] : (Array.isArray(it.props) && it.props.length ? it.props : (it.prop ? [it.prop] : []));
const hasProp = (it, k) => itemProps(it).includes(k);
const propMeta = (slot, k) => (slot === 'armor' ? ARMOR_PROPS[k] : PROPS[k]);
const itemPower = it => Math.max(1, Math.round((it.slot === 'weapon' ? WEAPON_BASE : ARMOR_BASE)[it.star] * RARITY[it.rarity].mult * it.roll));
const weaponAtk = it => it ? Math.round(itemPower(it) * itemProps(it).reduce((m, k) => m * ((PROPS[k] && PROPS[k].atkMult) || 1), 1)) : 0;
const armorDef = it => it ? Math.round(itemPower(it) * itemProps(it).reduce((m, k) => m * ((ARMOR_PROPS[k] && ARMOR_PROPS[k].defMult) || 1), 1)) : 0;
const itemName = (it, skinId) => {
  const sk = skinId || (G.p && G.p.skin) || 'ruby';
  const base = it.slot === 'weapon'
    ? WEAPON_NAMES[it.star]
    : (it.star === 5 && ARMOR_STAR5_NAMES[sk]) || ARMOR_NAMES[it.star];
  return PREFIX[it.rarity] + base;
};
const sellValue = it => Math.max(1, Math.round(RARITY[it.rarity].sell * 0.65 * (1 + (it.star - 1) * 0.5) * (0.6 + 0.4 * it.roll)));
// 戦力値（表示用）: 武器は実効攻撃力、防具は実効防御力
const gearPower = it => !it ? 0 : (it.slot === 'weapon' ? weaponAtk(it) : armorDef(it));
// 自動装備・おすすめ判定用スコア（P1前と同等: 狂気はHP消費リスクのため攻撃2倍を評価せず倍率1.0）
const gearScore = it => {
  if (!it) return 0;
  const pw = itemPower(it), ps = itemProps(it);
  if (it.slot === 'armor') return Math.round(armorDef(it) * (1 + ps.filter(k => k !== 'aegis').length * 0.08));
  return pw * ps.reduce((m, k) => m * (k === 'flame' ? 1.2 : k === 'vamp' ? 1.05 : 1), 1);
};
const bestGearItem = (p, slot) => {
  if (!p) return null;
  let best = p[slot] && p[slot].slot === slot && !hasProp(p[slot], 'madness') ? p[slot] : null;
  for (const it of (p.bag || [])) {
    if (it && it.slot === slot && !hasProp(it, 'madness') && gearScore(it) > gearScore(best)) best = it;
  }
  return best;
};
const skillMpCost = (p, s) => (!s || !s.mp) ? 0 : Math.max(1, Math.round(s.mp * (p && p.passiveSkills ? passiveBonus(p).mpCostMult : 1)));
const playerAtk = p => Math.round((baseAtk(p) + weaponAtk(p.weapon)) * (p.passiveSkills ? passiveBonus(p).atkMult : 1) * (p.mastery ? masteryBonus(p).atkMult : 1) * (G.run && G.run.tower ? towerEff(G.run).atkMult : 1));
const playerDef = p => Math.round((baseDef(p) + armorDef(p.armor)) * (p.mastery ? masteryBonus(p).defMult : 1) * (G.run && G.run.tower ? towerEff(G.run).defMult : 1));
// 総合戦力（UI表示用）: 攻撃力＋防御力＋最大HP/8＋最大MP/20。装備・Lv・スキル・極意の強化が一目でわかる指標（戦闘計算には使わない）
const playerPower = p => Math.round(playerAtk(p) + playerDef(p) + maxHp(p) / 8 + maxMp(p) / 20);
// ---- 戦闘力（総合戦力）のランクと、ダンジョン別の目安 ----
const POWER_RANKS = [
  { min: 0,    name: '見習い',   color: '#9aa7b4' }, { min: 100,  name: '駆け出し', color: '#7ec8a0' }, { min: 180,  name: '冒険者',   color: '#5ad0e0' },
  { min: 280,  name: '一人前',   color: '#6aa6ff' }, { min: 400,  name: '熟練者',   color: '#b48cff' }, { min: 550,  name: '精鋭',     color: '#ff8ad8' },
  { min: 800,  name: '英雄',     color: '#ffb347' }, { min: 1200, name: '伝説',     color: '#ff7a5a' }, { min: 2000, name: '神話',     color: '#ffe066' }
];
function powerRank(pw) {
  let i = 0; for (let k = 0; k < POWER_RANKS.length; k++) if (pw >= POWER_RANKS[k].min) i = k;
  const cur = POWER_RANKS[i], nxt = POWER_RANKS[i + 1] || null;
  return { idx: i, name: cur.name, color: cur.color, min: cur.min, next: nxt, pct: nxt ? Math.max(0, Math.min(1, (pw - cur.min) / (nxt.min - cur.min))) : 1 };
}
// 各ダンジョン×難易度の「目安戦闘力」：推奨Lv・そのダンジョンの装備★に見合った標準装備で計算（実際の式を使うので調整に追従する）
const _refPow = {};
function refPower(d, dfIdx) {
  const key = d.id + dfIdx; if (_refPow[key] != null) return _refPow[key];
  const p = newPlayer(); p.lv = d.rec[dfIdx];
  const st = Math.min(d.maxStar, Math.max(1, Math.round(d.maxStar * (0.55 + 0.1 * dfIdx))));
  for (const slot of ['weapon', 'armor']) p[slot] = { id: 0, slot, star: st, rarity: 1, roll: 0.7, props: [], prop: null };
  return (_refPow[key] = playerPower(p));
}
// 戦闘力(攻撃・防御中心)だけだと「装備は強いがLvが低くHPが少ない」状態が「余裕」と出てしまうため、推奨Lvとの比も加味して厳しい方を採用する
const VERDICTS = [{ k: 'easy', label: '余裕' }, { k: 'ok', label: '適正' }, { k: 'warn', label: 'やや危険' }, { k: 'bad', label: '危険' }];
function powerVerdict(mine, ref, lv, rec) {
  const r = mine / Math.max(1, ref);
  let i = r >= 1.3 ? 0 : r >= 0.9 ? 1 : r >= 0.65 ? 2 : 3, lvLow = false;
  if (lv != null && rec) {
    const lr = lv / rec, li = lr >= 1 ? 0 : lr >= 0.8 ? 1 : lr >= 0.6 ? 2 : 3;
    if (li > i) { i = li; }
    lvLow = lr < 1;
  }
  return { k: VERDICTS[i].k, label: VERDICTS[i].label, r, lvLow };
}
const gearSnap = it => it ? { id: it.id, name: itemName(it), pw: gearPower(it), score: gearScore(it) } : null;
const statSnap = p => ({ lv: p.lv, atk: playerAtk(p), def: playerDef(p), hp: maxHp(p), mp: maxMp(p), power: playerPower(p), weapon: gearSnap(p.weapon), armor: gearSnap(p.armor) });

function mkItem(p, o) {
  const ps = Array.isArray(o.props) ? [...new Set(o.props)] : (o.prop ? [o.prop] : []);
  return { id: p.nextId++, slot: o.slot, star: o.star, rarity: o.rarity, roll: o.roll, prop: ps[0] || null, props: ps, locked: false };
}
function isDungeonUnlocked(p, d) {
  if (!d) return false;
  if (IS_DEV_BUILD) return true;                 // TEST版: 全ダンジョンに入れる
  if (!d.unlock) return true;
  return !!(p && p.cleared && p.cleared[d.unlock.d] && p.cleared[d.unlock.d][d.unlock.df]);
}
function isDiffUnlocked(p, d, df) {
  if (!d || !df || !isDungeonUnlocked(p, d)) return false;
  if (IS_DEV_BUILD) return true;                 // TEST版: 全難易度も選べる
  if (!df.reqDiff) return true;
  return !!(p && p.cleared && p.cleared[d.id] && p.cleared[d.id][df.reqDiff]);
}
function makeDefaultChars() {
  const out = {};
  for (const cid of CHAR_IDS) {
    const trees = getCharTrees(cid);
    const sp = {};
    for (const t of trees) sp[t.id] = 0;
    const eq = [null, null, null];
    out[cid] = { skillPts: sp, equippedSkills: eq, activeBuild: 0, builds: [{ name: 'ビルド1', skillPts: sp, equippedSkills: eq }] };
  }
  return out;
}

const BUILD_MAX = 3;
const BUILD_BOOK_PRICES = [5000, 60000];   // 1冊目は安め・2冊目から高め（暫定）
function buildCount(p) { return 1 + Math.max(0, Math.min(BUILD_MAX - 1, (p && p.buildSlots) | 0)); }
function spentSp(pts) { let n = 0; for (const v of Object.values(pts || {})) n += Number(v) || 0; return n; }
function syncActiveCharState(p) {
  if (!p) return;
  const cid = (p.skin && CHAR_TREES[p.skin]) ? p.skin : 'ruby';
  p.skin = cid;
  if (!p.chars || typeof p.chars !== 'object') p.chars = makeDefaultChars();
  const def = makeDefaultChars();
  for (const k of CHAR_IDS) {
    if (!p.chars[k] || typeof p.chars[k] !== 'object') p.chars[k] = def[k];
    if (!p.chars[k].skillPts || typeof p.chars[k].skillPts !== 'object') p.chars[k].skillPts = def[k].skillPts;
    for (const t of getCharTrees(k)) {
      if (typeof p.chars[k].skillPts[t.id] !== 'number') p.chars[k].skillPts[t.id] = 0;
    }
    if (!Array.isArray(p.chars[k].equippedSkills) || p.chars[k].equippedSkills.length !== 3) {
      p.chars[k].equippedSkills = [null, null, null];
    }
  }
  p.buildSlots = Math.max(0, Math.min(BUILD_MAX - 1, Number(p.buildSlots) | 0));
  const nb = buildCount(p);
  for (const k of CHAR_IDS) {
    const c = p.chars[k];
    if (!Array.isArray(c.builds)) c.builds = [];
    c.builds.length = nb;
    c.activeBuild = Math.max(0, Math.min(nb - 1, Number(c.activeBuild) | 0));
    for (let i = 0; i < nb; i++) {
      let b = c.builds[i];
      if (!b || typeof b !== 'object') b = c.builds[i] = {};
      b.name = (typeof b.name === 'string' && b.name.trim()) ? b.name.slice(0, 8) : 'ビルド' + (i + 1);
      if (i === c.activeBuild) { b.skillPts = c.skillPts; b.equippedSkills = c.equippedSkills; continue; }
      const z = {}; for (const t of getCharTrees(k)) z[t.id] = Math.max(0, Math.min(t.maxSp || 30, Number(b.skillPts && b.skillPts[t.id]) || 0));
      b.skillPts = z;
      const eq = Array.isArray(b.equippedSkills) ? b.equippedSkills.slice(0, 3) : [];
      while (eq.length < 3) eq.push(null);
      b.equippedSkills = eq.map(x => (x && SK[x]) ? x : null);
    }
  }
  const active = p.chars[cid];
  p.skillPts = active.skillPts;
  p.equippedSkills = active.equippedSkills;
  const skills = {}, passives = {};
  for (const t of getCharTrees(cid)) {
    const pts = Number(active.skillPts[t.id]) || 0;
    for (const ms of t.milestones) {
      if (pts >= ms.sp) {
        if (ms.id && SK[ms.id]) skills[ms.id] = true;
        if (ms.passive) passives[ms.passive] = true;
      }
    }
  }
  p.skills = skills;
  p.passiveSkills = passives;
  for (let i = 0; i < 3; i++) {
    const sid = active.equippedSkills[i];
    if (sid && !skills[sid]) active.equippedSkills[i] = null;
  }
}

function newPlayer() {
  const stones = {}; for (const st of STONES) stones[st.id] = 0;
  const chars = makeDefaultChars();
  const p = { lv: 1, exp: 0, hp: 1, mp: 1, sp: 3, buildSlots: 0, gold: 50, bank: 0, skin: 'ruby', chars, v9ResetNoticePending: false, weapon: null, armor: null, bag: [], bagCap: BAG_CAP, cleared: {}, part1Cleared: false, ending: false, unlockNoticeShown: false, abyssNoticeShown: false, tower: { best: 0, coins: 0, totalCoins: 0, title: null, titles: [], nick: '', rankOptIn: false, sentBest: 0 }, abyss: { best: 0, cleared: {} }, mastery: {}, dex: { enemies: {}, items: { weapon_1: true, armor_1: true }, rewards: {} }, ach: {}, pendingAchCoins: 0, achStats: { totalGold: 0, blessings: 0, noDmgBoss: false }, skills: {}, skillPts: chars.ruby.skillPts, passiveSkills: {}, equippedSkills: chars.ruby.equippedSkills, potions: { hp: 0, mp: 0 }, stones, stats: { runs: 0, clears: 0, kills: 0 }, nextId: 1 };
  p.weapon = mkItem(p, { slot: 'weapon', star: 1, rarity: 0, roll: 0.8 });
  p.armor = mkItem(p, { slot: 'armor', star: 1, rarity: 0, roll: 0.8 });
  p.hp = maxHp(p); p.mp = maxMp(p);
  return p;
}
// 図鑑の「NEW」印。kind: e=敵 / i=装備 / a=実績。見た時点（図鑑を開いた時）で消える
function markDexNew(p, kind, id) {
  if (!p || !id) return;
  p.dexNew = p.dexNew || { e: {}, i: {}, a: {} };
  (p.dexNew[kind] = p.dexNew[kind] || {})[id] = true;
}
function dexNewCount(p) {
  const d = (p && p.dexNew) || {};
  return ['e', 'i', 'a'].reduce((n, k) => n + Object.keys(d[k] || {}).length, 0);
}
function recordDexEnemy(p, id, isKill = false) {
  if (!p || !id) return;
  p.dex = p.dex || { enemies: {}, items: {}, rewards: {} };
  p.dex.enemies = p.dex.enemies || {};
  const cur = p.dex.enemies[id] || { seen: true, kills: 0 };
  if (!p.dex.enemies[id] || !p.dex.enemies[id].seen) { markDexNew(p, 'e', id); if (!G.headless && G.run && G.run.enemy && G.run.enemy.id === id) toast(`📖 図鑑に登録：${G.run.enemy.name}`); }
  cur.seen = true;
  if (isKill) cur.kills = (cur.kills || 0) + 1;
  p.dex.enemies[id] = cur;
}
function recordDexItem(p, it) {
  if (!p || !it) return;
  p.dex = p.dex || { enemies: {}, items: {}, rewards: {} };
  p.dex.items = p.dex.items || {};
  const k = dexItemKey(it);
  if (k && !p.dex.items[k]) { markDexNew(p, 'i', k); if (!G.headless && G.p === p) toast(`📖 装備図鑑に登録：${itemName(it)}`); }
  if (k) p.dex.items[k] = true;
}
function flushPendingAchCoins(p, silent = false) {
  if (!p || !p.ending || !(p.pendingAchCoins > 0)) return 0;
  const c = p.pendingAchCoins;
  p.pendingAchCoins = 0;
  p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [], nick: '', rankOptIn: false, sentBest: 0 };
  p.tower.coins = (p.tower.coins || 0) + c;
  p.tower.totalCoins = (p.tower.totalCoins || 0) + c;
  if (!silent && !G.headless) toast(`保留していた実績報酬 コイン+${c}枚を受け取りました！`);
  return c;
}
function checkAchievements(ev = null, silent = false) {
  const p = G.p;
  if (!p) return [];
  p.ach = p.ach || {};
  p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [], nick: '', rankOptIn: false, sentBest: 0 };
  p.tower.titles = p.tower.titles || [];
  const unlocked = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const a of ACHIEVEMENTS) {
    if (ev && a.ev !== ev) continue;
    if (p.ach[a.id]) continue;
    if (!a.cond(p)) continue;
    p.ach[a.id] = today; markDexNew(p, 'a', a.id);
    if (a.titleId && !p.tower.titles.includes(a.titleId)) p.tower.titles.push(a.titleId);
    if (a.coins > 0) {
      if (p.ending) {
        p.tower.coins = (p.tower.coins || 0) + a.coins;
        p.tower.totalCoins = (p.tower.totalCoins || 0) + a.coins;
      } else {
        p.pendingAchCoins = (p.pendingAchCoins || 0) + a.coins;
      }
    }
    unlocked.push(a);
    if (!silent && !G.headless) {
      const tObj = a.titleId && TOWER_TITLES.find(t => t.id === a.titleId);
      const tail = p.ending ? `🪙+${a.coins}` : `🪙+${a.coins}(クリア後付与)`;
      achBanner(a, tail, tObj);
    }
  }
  return unlocked;
}
