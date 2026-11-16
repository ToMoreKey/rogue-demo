const itemIcon = it => {
  const src = (ITEM_ICON[it.slot] || [])[it.star];
  return src ? `<span class="it-ico"><img src="${src}" alt="" draggable="false"></span>` : '';
};

// パッシブボーナス計算
function passiveBonus(p) {
  const pts = p.skillPts || {};
  const passives = p.passiveSkills || {};
  let atkMult = 1, hpMult = 1, mpMult = 1, mpCostMult = 1, healMult = 1;
  if (passives.sword15) atkMult *= 1.15;
  if (passives.warrior10) atkMult *= 1.30;
  if (passives.magic15) mpMult *= 1.20;
  if (passives.mage10) mpCostMult *= 0.80;
  if (passives.life15) hpMult *= 1.20;
  if (passives.cleric10) healMult *= 1.50;
  if (passives.hero10) { atkMult *= 1.25; hpMult *= 1.25; mpMult *= 1.25; }
  return { atkMult, hpMult, mpMult, mpCostMult, healMult };
}
function enemyArt(en, dId) {
  const im = ENEMY_IMG[en.id];
  const st = en.bossFilter ? ` style="filter:${en.bossFilter}"` : '';
  if (im) return `<img class="sprite sprite-img" src="${im.src}" alt="${en.name}" draggable="false"${st}>`;
  return spriteSVG(en.shape, PAL[dId][en.shape]);
}

// 防具の★に応じた見た目（★3以上で差分画像があれば切り替え。なければ基本絵）
function skinFrames(sk) {
  const st = (G.p && G.p.armor && G.p.armor.star) || 1;
  if (sk.tiers) for (const k of [5, 4, 3]) if (st >= k && sk.tiers[k]) return sk.tiers[k];
  return { img: sk.img, atk: sk.atk };
}
function skinArt(sk, extraStyle) {
  // 画像(img)があれば高品質PNGを、なければ従来のSVGを使う
  const fr = skinFrames(sk);
  if (fr.img) return `<img class="sprite sprite-img" src="${fr.img}" alt="${sk.name}" draggable="false" style="${extraStyle || ''}">`;
  return sk.svg.replace('<svg class="sprite"', `<svg class="sprite" style="width:100%;height:auto;${extraStyle || ''}"`);
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
