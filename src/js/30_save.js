
/* ================= save / load ================= */
// セーブ形式のバージョン。キー名は互換のため rogue_test_save_v1 のまま（中身の v で判別する）
const SAVE_VERSION = 4;
// migrations[n] は「vn のセーブ → v(n+1) のセーブ」へ変換する関数。将来は {4: fn, ...} を足すだけで連鎖する。
const migrations = {
  // v1 → v2: 構造は同一。版番号を付け替えるだけ（所持品・装備・Lv・スキル・ゴールド・設定はそのまま）
  1: d => Object.assign({}, d, { v: 2 }),
  // v2 → v3: クリア記録 cleared（セルの rec 以下の Lv ならクリア済み扱い）と bagCap（既定60）を追加
  2: d => {
    const p = Object.assign({}, d.p);
    if (!p.cleared || typeof p.cleared !== 'object') {
      const cleared = {};
      const lv = Number(p.lv) || 1;
      const hasClears = p.stats && Number(p.stats.clears) > 0;
      for (const dg of DUNGEONS) {
        cleared[dg.id] = {};
        dg.rec.forEach((r, i) => {
          const df = DIFFS[i];
          if (df && lv >= r && (lv > 1 || hasClears)) cleared[dg.id][df.id] = true;
        });
      }
      p.cleared = cleared;
    }
    if (!p.bagCap) p.bagCap = BAG_CAP;
    return Object.assign({}, d, { v: 3, p });
  },
  // v3 → v4: 無限回廊「天蓋の塔」用の記録 p.tower を追加
  3: d => {
    const p = Object.assign({}, d.p);
    if (!p.tower || typeof p.tower !== 'object') {
      p.tower = { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] };
    }
    return Object.assign({}, d, { v: 4, p });
  }
};
// 生のセーブ(JSONをparseしたもの)を最新版へ変換して返す。移行不要なら同じオブジェクトを返す。変換できなければ null。
function migrateSave(raw) {
  if (!raw || typeof raw !== 'object' || !raw.p) return null;
  let d = raw, v = Number(d.v) || 1;   // v が無いものは v1 扱い
  while (v < SAVE_VERSION) {
    const fn = migrations[v];
    if (!fn) return null;
    d = fn(d);
    if (!d || Number(d.v) !== v + 1) return null;   // 変換関数が版を進めなかったら中断
    v = d.v;
  }
  return d;   // v が最新、または未来の版ならそのまま（読み込み側の検証に任せる）
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, p: G.p, opts: G.opts, sel: G.sel, shopSel: G.shopSel, autoSellRarity: G.autoSellRarity })); } catch (e) { /* storage unavailable */ }
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
    const d0 = JSON.parse(raw), d = migrateSave(d0); if (!d || !d.p) return false;
    const migrated = d !== d0;
    // 旧セーブは消さない: 移行前の生データを一度だけ別キーへ退避する（例: rogue_test_save_v1_bak_v1）
    if (migrated) { try { const bk = SAVE_KEY + '_bak_v' + (Number(d0.v) || 1); if (!localStorage.getItem(bk)) localStorage.setItem(bk, raw); } catch (e) { /* storage unavailable */ } }
    const base = newPlayer(), s = d.p;
    const num = (v, def, lo = 0, hi = 1e12) => { v = Number(v); return isFinite(v) ? clamp(Math.floor(v), lo, hi) : def; };
    const p = base;
    p.lv = num(s.lv, 1, 1, LV_CAP); p.exp = num(s.exp, 0); p.sp = num(s.sp, 0); p.gold = num(s.gold, 50); p.bank = num(s.bank, 0);
    p.bagCap = num(s.bagCap, BAG_CAP, BAG_CAP, MAX_BAG_CAP);
    p.weapon = cleanItem(s.weapon); p.armor = cleanItem(s.armor);
    p.bag = Array.isArray(s.bag) ? s.bag.map(cleanItem).filter(Boolean).slice(0, p.bagCap) : [];
    p.cleared = {};
    if (s.cleared && typeof s.cleared === 'object') {
      for (const dg of DUNGEONS) {
        const sc = s.cleared[dg.id];
        if (sc && typeof sc === 'object') {
          p.cleared[dg.id] = {};
          for (const df of DIFFS) if (sc[df.id]) p.cleared[dg.id][df.id] = true;
        }
      }
    }
    p.part1Cleared = !!s.part1Cleared || !!(p.cleared && p.cleared.I && p.cleared.I.high);
    p.ending = !!s.ending || !!(p.cleared && p.cleared.O && p.cleared.O.extreme);
    if (s.tower && typeof s.tower === 'object') {
      const validTitle = id => TOWER_TITLES.some(t => t.id === id);
      const ts = Array.isArray(s.tower.titles) ? [...new Set(s.tower.titles.filter(validTitle))] : [];
      p.tower = {
        best: num(s.tower.best, 0),
        coins: num(s.tower.coins, 0),
        totalCoins: num(s.tower.totalCoins, 0),
        title: s.tower.title && ts.includes(s.tower.title) ? s.tower.title : null,
        titles: ts
      };
    }
    p.skills = {}; if (s.skills) for (const k of SK_ORDER) if (s.skills[k]) p.skills[k] = true;
    p.skillPts = { sword: 0, magic: 0, life: 0, warrior: 0, mage: 0, cleric: 0, hero: 0 };
    if (s.skillPts && typeof s.skillPts === 'object') {
      for (const k of ['sword','magic','life','warrior','mage','cleric','hero']) {
        const tree = SKILL_TREES.find(t => t.id === k);
        p.skillPts[k] = num(s.skillPts[k], 0, 0, tree ? tree.maxSp : 30);
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
    if (s.skin && CHAR_SKINS.some(sk => sk.id === s.skin)) p.skin = s.skin;
    p.hp = clamp(num(s.hp, maxHp(p)), 1, maxHp(p)); p.mp = clamp(num(s.mp, maxMp(p)), 0, maxMp(p));
    G.p = p;
    if (d.opts) { G.opts.speed = [1, 2, 4].includes(d.opts.speed) ? d.opts.speed : 1; G.opts.autoSkill = d.opts.autoSkill !== false; G.opts.autoEquip = d.opts.autoEquip !== false; }
    if (d.sel) for (const dg of DUNGEONS) {
      const df = diffOf(d.sel[dg.id]);
      if (df && isDiffUnlocked(p, dg, df)) G.sel[dg.id] = df.id;
    }
    if (Array.isArray(d.shopSel) && d.shopSel.length === 4) G.shopSel = d.shopSel.map(Boolean);
    if (typeof d.autoSellRarity === 'number' && d.autoSellRarity >= -1 && d.autoSellRarity <= 3) G.autoSellRarity = d.autoSellRarity;
    if (migrated) save();   // 移行できたらすぐ新しい形式で書き戻す
    return true;
  } catch (e) { return false; }
}
