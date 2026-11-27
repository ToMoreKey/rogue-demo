/* ================= 衣装（ガチャ景品）: 旧「防具★で自動で変わる見た目」 =================
   基本の装いは最初から着られる。★3・★4はSR、★5はSSR。 */
const OUTFITS = [];
for (const sk of CHAR_SKINS) for (const t of [3, 4, 5]) if (sk.tiers && sk.tiers[t]) {
  OUTFITS.push({ id: `o_${sk.id}_${t}`, skin: sk.id, tier: t, rar: t === 5 ? 3 : 2, name: `${sk.name}「${(TIER_NAMES[sk.id] || {})[t] || '★' + t + 'の装い'}」` });
}
OUTFITS.forEach(o => GACHA_POOL.outfit[o.rar].push({ type: 'outfit', id: o.id, name: o.name }));
const outfitById = id => OUTFITS.find(o => o.id === id) || null;
