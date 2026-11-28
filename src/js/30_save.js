
/* ================= save / load ================= */
// セーブ形式のバージョン。キー名は互換のため rogue_test_save_v1 のまま（中身の v で判別する）
const SAVE_VERSION = 10;
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
  },
  // v4 → v5: 深淵(abyss)・極意(mastery)・複数特性(props)を追加
  4: d => {
    const p = Object.assign({}, d.p);
    if (!p.abyss || typeof p.abyss !== 'object') p.abyss = { best: 0, cleared: {} };
    if (!p.mastery || typeof p.mastery !== 'object') p.mastery = {};
    const fixProps = it => {
      if (!it || typeof it !== 'object') return it;
      if (!Array.isArray(it.props)) it.props = it.prop ? [it.prop] : [];
      return it;
    };
    p.weapon = fixProps(p.weapon);
    p.armor = fixProps(p.armor);
    if (Array.isArray(p.bag)) p.bag = p.bag.map(fixProps);
    return Object.assign({}, d, { v: 5, p });
  },
  // v5 → v6: 図鑑(dex)を追加し、クリア済みダンジョンの敵・所持装備を引き継ぐ
  5: d => {
    const p = Object.assign({}, d.p);
    const dex = (p.dex && typeof p.dex === 'object') ? p.dex : { enemies: {}, items: {}, rewards: {} };
    dex.enemies = dex.enemies || {};
    dex.items = dex.items || { weapon_1: true, armor_1: true };
    dex.rewards = dex.rewards || {};
    if (p.cleared && typeof p.cleared === 'object') {
      for (const dg of DUNGEONS) {
        const sc = p.cleared[dg.id];
        if (sc && Object.values(sc).some(Boolean)) {
          for (const m of dg.mobs) dex.enemies[m.id] = dex.enemies[m.id] || { seen: true, kills: 0 };
          dex.enemies[dg.boss.id] = dex.enemies[dg.boss.id] || { seen: true, kills: 0 };
          if (dg.id === 'O' && sc.extreme && dg.boss.rageId) {
            dex.enemies[dg.boss.rageId] = dex.enemies[dg.boss.rageId] || { seen: true, kills: 0 };
          }
        }
      }
    }
    if (p.abyss && p.abyss.cleared) {
      if (p.abyss.cleared[1] || p.abyss.cleared[2] || p.abyss.cleared[3]) dex.enemies.abyss_gula = dex.enemies.abyss_gula || { seen: true, kills: 0 };
      if (p.abyss.cleared[4] || p.abyss.cleared[5] || p.abyss.cleared[6] || p.abyss.cleared[7]) dex.enemies.abyss_mirror = dex.enemies.abyss_mirror || { seen: true, kills: 0 };
      if (p.abyss.cleared[8] || p.abyss.cleared[9] || p.abyss.cleared[10]) dex.enemies.abyss_deep = dex.enemies.abyss_deep || { seen: true, kills: 0 };
    }
    for (const it of [p.weapon, p.armor, ...(Array.isArray(p.bag) ? p.bag : [])]) {
      if (it && typeof it === 'object' && it.slot && it.star) {
        dex.items[`${it.slot}_${it.rarity === 4 ? 'm' : ''}${it.star}`] = true;
      }
    }
    p.dex = dex;
    return Object.assign({}, d, { v: 6, p });
  },
  // v6 → v7: 実績(ach)・保留コイン(pendingAchCoins)・実績用統計(achStats)を追加
  6: d => {
    const p = Object.assign({}, d.p);
    if (!p.ach || typeof p.ach !== 'object') p.ach = {};
    if (typeof p.pendingAchCoins !== 'number') p.pendingAchCoins = 0;
    if (!p.achStats || typeof p.achStats !== 'object') p.achStats = { totalGold: 0, blessings: 0, noDmgBoss: false };
    return Object.assign({}, d, { v: 7, p });
  },
  // v7 → v8: 本編クリア後のお知らせ出し済みフラグを追加（既クリアは出し済み扱い）
  7: d => {
    const p = Object.assign({}, d.p);
    if (typeof p.unlockNoticeShown !== 'boolean') p.unlockNoticeShown = !!(p.ending || (p.cleared && p.cleared.O && p.cleared.O.extreme));
    if (typeof p.abyssNoticeShown !== 'boolean') p.abyssNoticeShown = isAbyssUnlocked(p).ok;
    return Object.assign({}, d, { v: 8, p });
  },
  // v8 → v9: キャラ別スキルツリー導入。旧 skillPts の消費SPをすべて p.sp に返却し、各キャラの空 chars を作成
  8: d => {
    const p = Object.assign({}, d.p);
    let refund = 0;
    if (p.skillPts && typeof p.skillPts === 'object') {
      for (const v of Object.values(p.skillPts)) {
        const n = Number(v);
        if (isFinite(n) && n > 0) refund += Math.floor(n);
      }
    }
    p.sp = Math.max(0, (Number(p.sp) || 0) + refund);
    p.chars = makeDefaultChars();
    const cid = (p.skin && CHAR_TREES[p.skin]) ? p.skin : 'ruby';
    p.skin = cid;
    p.skills = {};
    p.passiveSkills = {};
    p.skillPts = p.chars[cid].skillPts;
    p.equippedSkills = p.chars[cid].equippedSkills;
    const hadProgress = refund > 0 || (Number(p.lv) || 1) > 1 || (p.stats && (Number(p.stats.runs) || 0) > 0);
    p.v9ResetNoticePending = hadProgress;
    return Object.assign({}, d, { v: 9, p });
  },
  // v9 → v10: 複数ビルド。既存の状態を「ビルド1」にする（buildSlots=0）。構造は syncActiveCharState が補う
  9: d => {
    const p = Object.assign({}, d.p);
    p.buildSlots = 0;
    if (p.chars && typeof p.chars === 'object') {
      p.chars = Object.assign({}, p.chars);
      for (const k of Object.keys(p.chars)) if (p.chars[k] && typeof p.chars[k] === 'object') p.chars[k] = Object.assign({}, p.chars[k], { activeBuild: 0 });
    }
    return Object.assign({}, d, { v: 10, p });
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
function save(milestone) {
  if (G._saveBlocked || G._staleTab) return;   // 破損データ保護中／別タブが新しい間は書き込まない
  let raw = null;
  try {
    raw = JSON.stringify({ v: SAVE_VERSION, p: G.p, opts: G.opts, sel: G.sel, shopSel: G.shopSel, autoSellRarity: G.autoSellRarity });
    localStorage.setItem(SAVE_KEY, raw);
    if (G._saveErr) setSaveWarn(null);
  } catch (e) { setSaveWarn(e); }
  // localStorage が使えなくても、IndexedDB 側には残す
  if (raw && typeof idbMirrorSave === 'function') idbMirrorSave(!!milestone, raw);
}
function cleanItem(it) {
  if (!it || typeof it !== 'object') return null;
  const slot = it.slot === 'weapon' || it.slot === 'armor' ? it.slot : null;
  const star = Math.round(Number(it.star)), rarity = Math.round(Number(it.rarity)), roll = Number(it.roll);
  if (!slot || !(star >= 1 && star <= MAX_STAR) || !(rarity >= 0 && rarity <= MAX_RARITY) || !isFinite(roll)) return null;
  const dict = slot === 'armor' ? ARMOR_PROPS : PROPS;
  const rawPs = Array.isArray(it.props) && it.props.length ? it.props : (it.prop ? [it.prop] : []);
  const props = [...new Set(rawPs.filter(k => dict[k]))];
  return { id: Number(it.id) || 0, slot, star, rarity, roll: clamp(roll, 0.5, 1), prop: props[0] || null, props, locked: !!it.locked };
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
    p.unlockNoticeShown = typeof s.unlockNoticeShown === 'boolean' ? s.unlockNoticeShown : !!p.ending;
    p.abyssNoticeShown = typeof s.abyssNoticeShown === 'boolean' ? s.abyssNoticeShown : isAbyssUnlocked(p).ok;
    if (s.tower && typeof s.tower === 'object') {
      const validTitle = id => TOWER_TITLES.some(t => t.id === id);
      const ts = Array.isArray(s.tower.titles) ? [...new Set(s.tower.titles.filter(validTitle))] : [];
      p.tower = {
        best: num(s.tower.best, 0),
        coins: num(s.tower.coins, 0),
        totalCoins: num(s.tower.totalCoins, 0),
        title: s.tower.title && ts.includes(s.tower.title) ? s.tower.title : null,
        titles: ts,
        nick: typeof s.tower.nick === 'string' ? s.tower.nick.slice(0, RANKING_CFG.nameMax) : '',
        rankOptIn: !!s.tower.rankOptIn,
        sentBest: num(s.tower.sentBest, 0)
      };
    }
    p.mastery = {};
    if (s.mastery && typeof s.mastery === 'object') {
      for (const m of MASTERY_LIST) p.mastery[m.id] = num(s.mastery[m.id], 0, 0, MASTERY_MAX);
    }
    p.abyss = { best: 0, cleared: {} };
    if (s.abyss && typeof s.abyss === 'object') {
      p.abyss.best = num(s.abyss.best, 0, 0, 10);
      if (s.abyss.cleared && typeof s.abyss.cleared === 'object') {
        for (let lv = 1; lv <= 10; lv++) if (s.abyss.cleared[lv]) p.abyss.cleared[lv] = true;
      }
    }
    p.dexNew = { e: {}, i: {}, a: {} };
    if (s.dexNew && typeof s.dexNew === 'object') for (const k of ['e', 'i', 'a']) if (s.dexNew[k] && typeof s.dexNew[k] === 'object') for (const id of Object.keys(s.dexNew[k]).slice(0, 500)) if (s.dexNew[k][id]) p.dexNew[k][String(id).slice(0, 40)] = true;
    p.dex = { enemies: {}, items: { weapon_1: true, armor_1: true }, rewards: {} };
    if (s.dex && typeof s.dex === 'object') {
      if (s.dex.enemies && typeof s.dex.enemies === 'object') {
        for (const [k, v] of Object.entries(s.dex.enemies)) {
          if (v && typeof v === 'object' && v.seen) p.dex.enemies[k] = { seen: true, kills: num(v.kills, 0) };
        }
      }
      if (s.dex.items && typeof s.dex.items === 'object') {
        for (const [k, v] of Object.entries(s.dex.items)) if (v) p.dex.items[k] = true;
      }
      if (s.dex.rewards && typeof s.dex.rewards === 'object') {
        for (const [k, v] of Object.entries(s.dex.rewards)) if (v) p.dex.rewards[k] = true;
      }
    }
    for (const it of [p.weapon, p.armor, ...p.bag]) recordDexItem(p, it);
    p.ach = {};
    if (s.ach && typeof s.ach === 'object') {
      for (const [k, v] of Object.entries(s.ach)) if (typeof v === 'string' && v) p.ach[k] = v;
    }
    p.pendingAchCoins = num(s.pendingAchCoins, 0);
    p.achStats = { totalGold: 0, blessings: 0, noDmgBoss: false };
    if (s.achStats && typeof s.achStats === 'object') {
      p.achStats.totalGold = num(s.achStats.totalGold, 0);
      p.achStats.blessings = num(s.achStats.blessings, 0);
      p.achStats.noDmgBoss = !!s.achStats.noDmgBoss;
    }
    if (s.skin && CHAR_SKINS.some(sk => sk.id === s.skin)) p.skin = s.skin;
    p.chars = makeDefaultChars(); let routeRefund = 0;
    if (s.chars && typeof s.chars === 'object') {
      for (const cid of CHAR_IDS) {
        const sc = s.chars[cid];
        if (!sc || typeof sc !== 'object') continue;
        if (sc.skillPts && typeof sc.skillPts === 'object') {
          for (const t of getCharTrees(cid)) {
            const raw = num(sc.skillPts[t.id], 0, 0, 999), v = Math.min(raw, t.maxSp || 30);
            p.chars[cid].skillPts[t.id] = v;
            if (raw > v) { p.sp += raw - v; routeRefund += raw - v; }   // ルート式になる前の分（共通枠の上限を超えたSP）は返却
          }
        }
        if (Array.isArray(sc.equippedSkills)) {
          for (let i = 0; i < 3; i++) {
            const sid = sc.equippedSkills[i];
            if (sid && SK[sid]) p.chars[cid].equippedSkills[i] = sid;
          }
        }
      }
    }
    p.v9ResetNoticePending = !!s.v9ResetNoticePending;
    p.buildSlots = num(s.buildSlots, 0, 0, BUILD_MAX - 1);
    if (s.chars && typeof s.chars === 'object') {
      for (const cid of CHAR_IDS) {
        const sc = s.chars[cid];
        if (!sc || typeof sc !== 'object') continue;
        const nb = buildCount(p), ab = num(sc.activeBuild, 0, 0, nb - 1);
        p.chars[cid].activeBuild = ab;
        p.chars[cid].builds = [];
        if (Array.isArray(sc.builds)) for (let i = 0; i < nb; i++) {
          const sb = sc.builds[i]; if (!sb || typeof sb !== 'object') continue;
          const b = { name: typeof sb.name === 'string' ? sb.name : '', skillPts: {}, equippedSkills: [null, null, null] };
          for (const t of getCharTrees(cid)) b.skillPts[t.id] = num(sb.skillPts && sb.skillPts[t.id], 0, 0, t.maxSp || 30);
          if (Array.isArray(sb.equippedSkills)) for (let j = 0; j < 3; j++) { const sid = sb.equippedSkills[j]; if (sid && SK[sid]) b.equippedSkills[j] = sid; }
          p.chars[cid].builds[i] = b;
        }
        // アクティブビルドは従来の skillPts / equippedSkills を正とする（なければ builds[ab] から）
        if (!(sc.skillPts && typeof sc.skillPts === 'object') && p.chars[cid].builds[ab]) {
          p.chars[cid].skillPts = p.chars[cid].builds[ab].skillPts; p.chars[cid].equippedSkills = p.chars[cid].builds[ab].equippedSkills;
        }
      }
    }
    // ルート式: 条件を満たさなくなったツリー（例: ルート未選択のまま残った英雄枠）のSPを返却して0に戻す
    for (const cid of CHAR_IDS) {
      for (const t of getCharTrees(cid)) {
        const pts = p.chars[cid].skillPts[t.id] || 0;
        if (pts > 0 && t.unlockWhen && !t.unlockWhen(p)) { p.sp += pts; routeRefund += pts; p.chars[cid].skillPts[t.id] = 0; }
      }
    }
    p.routeNotice = routeRefund;
    syncActiveCharState(p);
    p.hints = {}; if (s.hints && typeof s.hints === 'object') for (const k of ['status', 'shop', 'drop', 'guide']) if (s.hints[k]) p.hints[k] = true;
    if ((Number(s.lv) || 1) > 1 || (s.stats && Number(s.stats.runs) > 0)) p.hints.guide = true;   // 進行済みのセーブはルルの初回紹介を済ませた扱い
    p.goalFlags = {}; if (s.goalFlags && typeof s.goalFlags === 'object') { if (s.goalFlags.equip) p.goalFlags.equip = true; if (s.goalFlags.tryB) p.goalFlags.tryB = true; }
    p.story = { seen: {} }; if (s.story && s.story.seen && typeof s.story.seen === 'object') for (const k of Object.keys(STORY)) if (s.story.seen[k]) p.story.seen[k] = true;
    p.gacha = { drops: num(s.gacha && s.gacha.drops, 0, 0, 999999), pity: 0, pities: {}, total: num(s.gacha && s.gacha.total, 0, 0, 999999), owned: {}, eq: {}, frame: null };
    for (const gr of GACHA_GENRES) p.gacha.pities[gr.k] = num(s.gacha && s.gacha.pities && s.gacha.pities[gr.k], num(s.gacha && s.gacha.pity, 0, 0, 999), 0, 999);   // 旧セーブの共通天井は各ジャンルに引き継ぐ
    if (s.gacha && typeof s.gacha === 'object') {
      if (s.gacha.owned && typeof s.gacha.owned === 'object') for (const k of Object.keys(s.gacha.owned)) { const n = Math.floor(Number(s.gacha.owned[k])); if (n > 0 && /^(cos|title|frame|outfit):/.test(k)) p.gacha.owned[k] = Math.min(n, 9999); }
      if (s.gacha.eq && typeof s.gacha.eq === 'object') for (const sl of COS_SLOTS) { const c = cosById(s.gacha.eq[sl.k]); p.gacha.eq[sl.k] = c && c.slot === sl.k && p.gacha.owned['cos:' + c.id] ? c.id : null; }
      p.gacha.frame = DEX_FRAMES.some(f => f.id === s.gacha.frame) && p.gacha.owned['frame:' + s.gacha.frame] ? s.gacha.frame : null;
    }
    p.gacha.outfit = {}; for (const sk of CHAR_SKINS) { let t = s.gacha && s.gacha.outfit && s.gacha.outfit[sk.id]; if (typeof t !== 'string') t = Number(t); const o = OUTFITS.find(x => x.skin === sk.id && x.tier === t); p.gacha.outfit[sk.id] = o && p.gacha.owned['outfit:' + o.id] ? t : 0; }
    p.login = { last: typeof (s.login && s.login.last) === 'string' ? s.login.last.slice(0, 10) : '', claims: num(s.login && s.login.claims, 0, 0, 99999) };
    p.iap = {}; for (const k of ['speed4', 'adfree', 'bundle']) p.iap[k] = !!(s.iap && s.iap[k] === true);
    p.ads = { date: typeof (s.ads && s.ads.date) === 'string' ? s.ads.date.slice(0, 10) : '', drops: num(s.ads && s.ads.drops, 0, 0, 99), daily: num(s.ads && s.ads.daily, 0, 0, 99) };
    p.daily = { date: typeof (s.daily && s.daily.date) === 'string' ? s.daily.date.slice(0, 10) : '', used: num(s.daily && s.daily.used, 0, 0, 99), clears: num(s.daily && s.daily.clears, 0, 0, 99999) };
    p.goalDrops = {}; if (s.goalDrops && typeof s.goalDrops === 'object') for (const k of Object.keys(s.goalDrops)) if (s.goalDrops[k]) p.goalDrops[String(k).slice(0, 30)] = true;
    p.goalsHidden = !!s.goalsHidden;
    p.potions = { hp: num(s.potions && s.potions.hp, 0, 0, 99), mp: num(s.potions && s.potions.mp, 0, 0, 99) };
    p.stats = { runs: num(s.stats && s.stats.runs, 0), clears: num(s.stats && s.stats.clears, 0), kills: num(s.stats && s.stats.kills, 0) };
    if (s.stones && typeof s.stones === 'object') {
      for (const st of STONES) p.stones[st.id] = num(s.stones[st.id], 0, 0, 999);
    }
    let id = 1; [p.weapon, p.armor, ...p.bag].forEach(it => { if (it) it.id = id++; }); p.nextId = id;
    p.hp = clamp(num(s.hp, maxHp(p)), 1, maxHp(p)); p.mp = clamp(num(s.mp, maxMp(p)), 0, maxMp(p));
    G.p = p;
    if (migrated || !s.ach) checkAchievements(null, true);
    if (p.ending && p.pendingAchCoins > 0) flushPendingAchCoins(p, true);
    if (d.opts) { G.opts.speed = [1, 2, 4].includes(d.opts.speed) ? d.opts.speed : 1; G.opts.autoSkill = d.opts.autoSkill !== false; G.opts.autoEquipV2 = d.opts.autoEquipV2 === true; G.opts.autoEquip = d.opts.autoEquipV2 === true && d.opts.autoEquip === true; /* 旧版は既定ONだったため、V2以前の保存値は手動装備(OFF)に移行 */ if (typeof d.opts.fx === 'boolean') G.opts.fx = d.opts.fx; else delete G.opts.fx; if (typeof d.opts.se === 'boolean') G.opts.se = d.opts.se; else delete G.opts.se; if (typeof d.opts.bgm === 'boolean') G.opts.bgm = d.opts.bgm; else delete G.opts.bgm; for (const k of ['seVol', 'bgmVol']) { if ([0, 1, 2].includes(d.opts[k])) G.opts[k] = d.opts[k]; else delete G.opts[k]; } }
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
