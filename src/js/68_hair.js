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
  const H = Math.min(hh, cfg.y), N = w * hh;
  const L = new Float32Array(N), S = new Float32Array(N), HU = new Float32Array(N);
  const mask = new Uint8Array(N);   // 1=髪(判定) 2=髪(ハイライトの穴埋め)
  const op = i => data[i * 4 + 3] >= 128;
  let sumL = 0, cnt = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x; if (!op(k)) continue;
    const [h, s, l] = _rgb2hsl(data[k * 4], data[k * 4 + 1], data[k * 4 + 2]);
    HU[k] = h; S[k] = s; L[k] = l;
    if (s < cfg.s[0] || s > cfg.s[1] || l < cfg.l[0] || l > cfg.l[1]) continue;
    if (!cfg.h.some(([a, b]) => h >= a && h <= b)) continue;
    mask[k] = 1; sumL += l; cnt++;
  }
  if (!cnt) return 0;
  const nb = (k, m) => { // 周囲8マスのうち、髪と判定された数
    const x = k % w, y = (k / w) | 0; let c = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const xx = x + dx, yy = y + dy;
      if (xx >= 0 && xx < w && yy >= 0 && yy < H && mask[yy * w + xx]) c++;
    }
    return c;
  };
  // ① 孤立した画素（ほぼ髪に囲まれていない）は髪から外す → ティアラなど他の飾りのギザギザを防ぐ
  const iso = []; for (let k = 0; k < N; k++) if (mask[k] === 1 && nb(k) < 2) iso.push(k);
  for (const k of iso) { mask[k] = 0; sumL -= L[k]; cnt--; }
  if (cnt <= 0) return 0;
  // ② 髪に囲まれた「光の反射（ハイライト）」の画素を髪に含める（2回まで広げる）
  for (let pass = 0; pass < 2; pass++) {
    const add = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < w - 1; x++) {
      const k = y * w + x; if (mask[k] || !op(k)) continue;
      if (L[k] < 0.2) continue;                                              // 輪郭線は除く
      if (HU[k] >= 8 && HU[k] <= 45 && S[k] > 0.5 && L[k] > 0.7) continue;   // 肌は除く
      if (nb(k) >= 6) add.push(k);
    }
    for (const k of add) mask[k] = 2;
    if (!add.length) break;
  }
  // ③ 髪に囲まれた小さな光の塊（2〜3画素幅のハイライト）も髪に含める
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]], seen = new Uint8Array(N);
  const cand = k => !mask[k] && op(k) && L[k] >= 0.3 && !(HU[k] >= 8 && HU[k] <= 45 && S[k] > 0.5 && L[k] > 0.7) && (S[k] < 0.35 || L[k] > 0.8);
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    const k0 = y * w + x; if (seen[k0] || !cand(k0)) continue;
    const comp = [k0], st = [k0]; seen[k0] = 1; let hair = 0, other = 0, dark = 0, big = false;
    const bseen = new Set();
    while (st.length) {
      const k = st.pop(), cx = k % w, cy = (k / w) | 0;
      for (const [dx, dy] of dirs) {
        const xx = cx + dx, yy = cy + dy; if (xx < 0 || xx >= w || yy < 0 || yy >= H) { other++; continue; }
        const q = yy * w + xx;
        if (cand(q)) { if (!seen[q]) { seen[q] = 1; comp.push(q); st.push(q); if (comp.length > 30) big = true; } }
        else if (op(q) && !bseen.has(q)) { bseen.add(q); if (mask[q]) hair++; else { other++; if (L[q] < 0.25) dark++; } }
      }
      if (big) break;
    }
    if (!big && !dark && comp.length <= 30 && hair / Math.max(1, hair + other) >= 0.6) for (const k of comp) mask[k] = 2;
  }
  // ④ 髪の縁にある、髪と近い色味の画素（明るさが範囲外だった縁）を髪に含める
  const hc = (cfg.h[0][0] + cfg.h[0][1]) / 2, near = h => Math.min(Math.abs(h - hc), 360 - Math.abs(h - hc)) <= 35;
  const edge = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < w - 1; x++) {
    const k = y * w + x; if (mask[k] || !op(k) || L[k] < 0.2 || S[k] < 0.08) continue;
    if (HU[k] >= 8 && HU[k] <= 45 && S[k] > 0.5 && L[k] > 0.7) continue;
    if (near(HU[k]) && nb(k) >= 4) edge.push(k);
  }
  for (const k of edge) mask[k] = 2;
  const meanL = sumL / cnt;
  for (let k = 0; k < N; k++) {
    if (!mask[k]) continue;
    const nl = Math.max(0.04, Math.min(0.97, tg.l + (L[k] - meanL) * 0.95));
    const sat = mask[k] === 2 ? tg.s * 0.6 : tg.s;
    const [r, g, b] = _hsl2rgb(tg.h, sat, nl);
    data[k * 4] = r; data[k * 4 + 1] = g; data[k * 4 + 2] = b;
  }
  return cnt;
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
