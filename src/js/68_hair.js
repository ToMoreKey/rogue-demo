/* ================= おまけ装備「髪染め」: 立ち絵の髪の色だけを変える =================
   立ち絵PNG（ドット絵）のうち、キャラごとの髪色に近い画素だけをHSLで塗り替える（影の濃淡は保つ）。
   画像処理は非同期のため、できあがるまでは元の絵を出し、完成したら再描画する。 */
const HAIR_CFG = {
  // h: 色相の範囲(度) / s: 彩度の範囲 / l: 明度の範囲 / y: この高さ(px)より上だけを対象にする
  ruby:   { h: [[330, 360], [0, 6]], s: [0.40, 1], l: [0.30, 0.86], y: 160 },
  stella: { h: [[28, 58]],           s: [0.45, 1], l: [0.40, 0.86], y: 132 },
  silia:  { h: [[200, 290]],         s: [0.05, 0.38], l: [0.50, 0.93], y: 150 },
  chloe:  { h: [[0, 22]],            s: [0.18, 0.46], l: [0.15, 0.56], y: 118 }
};
const _hairCache = new Map(), _hairBusy = new Set();
let _hairTimer = null;
function cosHair(p) { const c = p && p.gacha && p.gacha.eq && cosById(p.gacha.eq.tint); return c && c.hair ? c : null; }
function _rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function _hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = t => { t = (t + 1) % 1; return Math.round(255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p)); };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
}
function hairRecolorData(data, w, hh, cfg, tg) {
  const hit = [];
  let sumL = 0;
  for (let y = 0; y < Math.min(hh, cfg.y); y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (data[i + 3] < 128) continue;
    const [h, s, l] = _rgb2hsl(data[i], data[i + 1], data[i + 2]);
    if (s < cfg.s[0] || s > cfg.s[1] || l < cfg.l[0] || l > cfg.l[1]) continue;
    if (!cfg.h.some(([a, b]) => h >= a && h <= b)) continue;
    hit.push(i, l); sumL += l;
  }
  if (!hit.length) return 0;
  const meanL = sumL / (hit.length / 2);
  for (let k = 0; k < hit.length; k += 2) {
    const i = hit[k], l = hit[k + 1];
    const nl = Math.max(0.04, Math.min(0.97, tg.l + (l - meanL) * 0.95));
    const [r, g, b] = _hsl2rgb(tg.h, tg.s, nl);
    data[i] = r; data[i + 1] = g; data[i + 2] = b;
  }
  return hit.length / 2;
}
function hairSrc(src, skinId, c) {
  if (!c || !HAIR_CFG[skinId]) return src;
  const key = c.id + '|' + skinId + '|' + src;
  const got = _hairCache.get(key);
  if (got) return got;
  if (!_hairBusy.has(key)) {
    _hairBusy.add(key);
    const im = new Image();
    im.onload = () => {
      try {
        const cv = document.createElement('canvas'); cv.width = im.naturalWidth; cv.height = im.naturalHeight;
        const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(im, 0, 0);
        const d = cx.getImageData(0, 0, cv.width, cv.height);
        hairRecolorData(d.data, cv.width, cv.height, HAIR_CFG[skinId], c.hair);
        cx.putImageData(d, 0, 0);
        _hairCache.set(key, cv.toDataURL('image/png'));
      } catch (e) { _hairCache.set(key, src); }
      _hairBusy.delete(key);
      clearTimeout(_hairTimer); _hairTimer = setTimeout(hairReady, 30);
    };
    im.onerror = () => { _hairCache.set(key, src); _hairBusy.delete(key); };
    im.src = src;
  }
  return src;
}
// 髪染めの画像ができたら、表示中の画面を描き直す
function hairReady() {
  try {
    if (G.headless) return;
    if (G._gc && G.modalOpen && typeof openGachaCollection === 'function') openGachaCollection(null, true);
    else if (typeof renderAll === 'function') renderAll();
  } catch (e) {}
}
