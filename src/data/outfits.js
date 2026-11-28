/* ================= 衣装（ガチャ景品） =================
   基本の装いは最初から着られる。
   ① 旧「防具★で自動で変わる見た目」: ★3・★4はSR、★5はSSR（キャラごとの tiers）
   ② 特別衣装（水着・制服など）: 立ち絵が OUTFIT_IMG に入っているものだけが景品に並ぶ */
const OUTFIT_SPECIAL = [
  { key: 'sailor', name: 'セーラー服',   rar: 2 },
  { key: 'blazer', name: 'ブレザー',     rar: 2 },
  { key: 'nurse',  name: 'ナース服',     rar: 2 },
  { key: 'swim',   name: '水着',         rar: 3 },
  { key: 'towel',  name: '湯上がり',     rar: 3 }
];
const OUTFITS = [];
for (const sk of CHAR_SKINS) {
  for (const t of [3, 4, 5]) if (sk.tiers && sk.tiers[t]) {
    OUTFITS.push({ id: `o_${sk.id}_${t}`, skin: sk.id, tier: t, rar: t === 5 ? 3 : 2, name: `${sk.name}「${(TIER_NAMES[sk.id] || {})[t] || '★' + t + 'の装い'}」`, label: `${'★'.repeat(t)} ${(TIER_NAMES[sk.id] || {})[t] || ''}` });
  }
  for (const sp of OUTFIT_SPECIAL) if (OUTFIT_IMG[sp.key + '_' + sk.id]) {
    OUTFITS.push({ id: `o_${sk.id}_${sp.key}`, skin: sk.id, tier: sp.key, rar: sp.rar, name: `${sk.name}「${sp.name}」`, label: sp.name, special: true });
  }
}
OUTFITS.forEach(o => GACHA_POOL.outfit[o.rar].push({ type: 'outfit', id: o.id, name: o.name }));
const outfitById = id => OUTFITS.find(o => o.id === id) || null;
const outfitValid = (skinId, v) => !!v && OUTFITS.some(o => o.skin === skinId && o.tier === v);
