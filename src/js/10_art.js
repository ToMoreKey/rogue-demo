const itemIcon = it => {
  const arr = ITEM_ICON[it.slot] || [];
  const src = arr[it.star] || arr[Math.min(it.star, 5)];
  const badge = it.star >= 6 && !arr[it.star] ? `<i class="it-sb">★${it.star}</i>` : '';
  return src ? `<span class="it-ico"><img src="${src}" alt="" draggable="false">${badge}</span>` : '';
};

// パッシブボーナス計算
function passiveBonus(p) {
  const passives = (p && p.passiveSkills) || {};
  let atkMult = 1, hpMult = 1, mpMult = 1, mpCostMult = 1, healMult = 1, critAdd = 0, ctRed = 0;
  if (passives.sword15) atkMult *= 1.15;
  if (passives.warrior10) atkMult *= 1.30;
  if (passives.magic15) mpMult *= 1.20;
  if (passives.mage10) { mpCostMult *= 0.80; atkMult *= 1.15; }
  if (passives.life15) hpMult *= 1.20;
  if (passives.cleric10) healMult *= 1.50;
  if (passives.hero10) { atkMult *= 1.25; hpMult *= 1.25; mpMult *= 1.25; }
  if (passives.crit20) critAdd += 0.20;   // R1b: クロエ「急所狙い」
  if (passives.swift10) ctRed += 1;       // R1b: クロエ「疾風」全スキルCT-1（最低1は呼び出し側で保証）
  return { atkMult, hpMult, mpMult, mpCostMult, healMult, critAdd, ctRed };
}
// 極意ボーナス計算（極意を振ったときの増分のみ）
function masteryBonus(p) {
  const m = (p && p.mastery) || {};
  let atkMult = 1, defMult = 1, hpMult = 1, mpMult = 1, healMult = 1;
  let critAdd = 0, dmgMult = 1, takenMult = 1, expMult = 1, goldMult = 1;
  for (const item of MASTERY_LIST) {
    const r = Number(m[item.id]) || 0;
    if (!r) continue;
    const v = item.per * r;
    if (item.key === 'atkPct') atkMult *= (1 + v);
    else if (item.key === 'defPct') defMult *= (1 + v);
    else if (item.key === 'hpPct') hpMult *= (1 + v);
    else if (item.key === 'mpPct') mpMult *= (1 + v);
    else if (item.key === 'critAdd') critAdd += v;
    else if (item.key === 'dmgPct') dmgMult *= (1 + v);
    else if (item.key === 'takenPct') takenMult *= Math.max(0.2, 1 + v);
    else if (item.key === 'healPct') healMult *= (1 + v);
    else if (item.key === 'expPct') expMult *= (1 + v);
    else if (item.key === 'goldPct') goldMult *= (1 + v);
  }
  return { atkMult, defMult, hpMult, mpMult, healMult, critAdd, dmgMult, takenMult, expMult, goldMult };
}
/* 元絵が右向きの敵: プレイヤー（左側）に向くよう左右反転して表示する */
const ENEMY_FLIP = new Set([
  'd_beetle', 'j_lizard', 'h_turret', 'j_hag',
  'a_skel', 'c_witch', 'd_mushroom', 'e_golem', 'f_jelly', 'f_siren', 'g_valkyrie', 'h_android', 'h_drone',
  'h_gear', 'j_banshee', 'j_bog', 'j_wisp', 'k_golem', 'm_moon', 'n_egg', 'n_slayer', 'o_void']);
function enemyArt(en, dId) {
  const im = (en && ENEMY_IMG[en.id]) || (en && en.fallbackId && ENEMY_IMG[en.fallbackId]);
  const filterVal = (en && en.raged) ? 'hue-rotate(140deg) saturate(1.6)' : ((en && en.bossFilter) || '');
  const st = filterVal ? ` style="filter:${filterVal}"` : '';
  const flip = en && (ENEMY_FLIP.has(en.id) || ENEMY_FLIP.has(en.fallbackId)) ? ' flip' : '';
  if (im) return `<img class="sprite sprite-img${flip}" src="${im.src}" alt="${en.name}" draggable="false"${st}>`;
  return `<div${st}>${spriteSVG(en.shape, PAL[dId][en.shape])}</div>`;
}

// 防具の★に応じた見た目（★3以上で差分画像があれば切り替え。なければ基本絵）
function skinFrames(sk) {
  const st = (G.p && G.p.armor && G.p.armor.star) || 1;
  if (sk.tiers) for (const k of [5, 4, 3]) if (st >= k && sk.tiers[k]) return sk.tiers[k];
  return { img: sk.img, atk: sk.atk };
}
function auraClass(p) {
  const s = Math.max((p && p.weapon && p.weapon.star) || 0, (p && p.armor && p.armor.star) || 0);
  return s >= 9 ? ' aura-9' : s === 8 ? ' aura-8' : s === 7 ? ' aura-7' : s === 6 ? ' aura-6' : '';
}
function skinArt(sk, extraStyle) {
  // 画像(img)があれば高品質PNGを、なければ従来のSVGを使う
  const fr = skinFrames(sk), au = auraClass(G.p);
  if (fr.img) return `<img class="sprite sprite-img${au}" src="${fr.img}" alt="${sk.name}" draggable="false" style="${extraStyle || ''}">`;
  return sk.svg.replace('<svg class="sprite"', `<svg class="sprite${au}" style="width:100%;height:auto;${extraStyle || ''}"`);
}
// 防具の★に応じた「見た目の段階」(0=基本 / 3 / 4 / 5) と、その呼び名
function skinTier(sk) {
  const st = (G.p && G.p.armor && G.p.armor.star) || 1;
  if (sk.tiers) for (const k of [5, 4, 3]) if (st >= k && sk.tiers[k]) return k;
  return 0;
}
const tierName = (sk, t) => ((TIER_NAMES[sk.id] || {})[t]) || (t ? '★' + t + 'の装い' : '基本の装い');
function getPlayerSVG() {
  const skin = CHAR_SKINS.find(s => s.id === ((G.p && G.p.skin) || 'ruby'));
  if (skin) return skinArt(skin);
  return spriteSVG('hero', PAL.hero);
}

function spriteSVG(shape, pal) {
  const map = SHAPES[shape]; const H = map.length, W = map[0].length;
  let out = '';
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const ch = map[y][x];
      if (ch === '.' || !pal[ch]) { x++; continue; }
      let e = x; while (e < W && map[y][e] === ch) e++;
      out += `<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${pal[ch]}"/>`;
      x = e;
    }
  }
  return `<svg class="sprite" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${out}</svg>`;
}
