/* ================= 課金（倍速・広告スキップ）とリワード広告 =================
   モード:
     'free'   … ウェブ版（PWA）。課金も広告もなし。倍速は全部使える（従来どおり）
     'native' … Capacitor 製アプリ。Play Billing（買い切り）と AdMob（リワード）を使う
     'mock'   … テスト版（dev）で URL に ?monet=mock を付けたとき。購入・広告を画面上で疑似的に再現する（本番ビルドでは無効）
   商品: speed4（4倍速）・adfree（広告スキップ）・bundle（上の2つのセット）。2倍速は無料。価格は表示時にストアから取る。 */
const MONET_PRODUCTS = [
  { id: 'speed4', name: '4倍速', icon: '⏭️', desc: '戦闘を4倍の速さで進められます（買い切り）' },
  { id: 'adfree', name: '広告スキップ', icon: '📺', desc: 'リワード広告を見ずに、報酬をすぐ受け取れます（買い切り）' },
  { id: 'bundle', name: 'お得セット', icon: '🎁', desc: '4倍速＋広告スキップのセット（買い切り）' }
];
const BUNDLE_INCLUDES = ['speed4', 'adfree'];
const AD_CFG = { dropsPerDay: 3, dropsReward: 1, dailyPerDay: 1 };
const monetProduct = id => MONET_PRODUCTS.find(x => x.id === id);
function monetMode() {
  try { if (IS_DEV_BUILD && /[?&]monet=mock\b/.test(location.search)) return 'mock'; } catch (e) {}   // テスト版のみ。本番ビルドでは無視する
  try { if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) return 'native'; } catch (e) {}
  return 'free';
}
function ensureIap(p) {
  if (!p.iap || typeof p.iap !== 'object') p.iap = {};
  for (const x of MONET_PRODUCTS) p.iap[x.id] = p.iap[x.id] === true;
  if (!p.ads || typeof p.ads !== 'object') p.ads = {};
  if (p.ads.date !== todayStr()) { p.ads.date = todayStr(); p.ads.drops = 0; p.ads.daily = 0; }
  p.ads.drops = Math.max(0, Math.floor(Number(p.ads.drops) || 0)); p.ads.daily = Math.max(0, Math.floor(Number(p.ads.daily) || 0));
  return p;
}
// 所有しているか（ウェブ版は常に所有扱い）
function ownsIap(id) { if (monetMode() === 'free') return true; const p = G.p; if (!(p && p.iap)) return false; return p.iap[id] === true || (BUNDLE_INCLUDES.includes(id) && p.iap.bundle === true); }
function speedLocked(v) { return v === 4 && !ownsIap('speed4'); }   // ×2は無料
function monetClampSpeed() { if (G.opts && speedLocked(G.opts.speed)) G.opts.speed = 2; }
function monetAdsOn() { return monetMode() !== 'free'; }

// ---------- 提供元（プロバイダ） ----------
const MonetMock = {
  price: id => '（テスト）',
  async buy(id) { return true; },
  async restore() { return []; },
  async rewarded() {
    return new Promise(res => {
      const el = document.createElement('div'); el.id = 'mock-ad';
      el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#000d;color:#fff;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;font-size:16px';
      el.innerHTML = '<div>📺 広告（テスト表示）</div><div id="mock-ad-n">2</div>'; document.body.appendChild(el);
      let n = 2; const t = setInterval(() => { n--; const e = document.getElementById('mock-ad-n'); if (e) e.textContent = String(Math.max(n, 0)); if (n <= 0) { clearInterval(t); el.remove(); res(true); } }, 500);
    });
  }
};
// Capacitor 版（端末上でのみ動く）。プラグイン: @capacitor-community/admob、cordova-plugin-purchase
const MonetNative = {
  _prices: {}, _ready: false, _admobReady: false,
  price(id) { return this._prices[id] || ''; },
  _store() { return window.CdvPurchase && window.CdvPurchase.store; },
  async init() {
    if (this._ready) return; this._ready = true;
    try {
      const S = this._store(), C = window.CdvPurchase; if (!S) return;
      for (const x of MONET_PRODUCTS) S.register({ id: x.id, type: C.ProductType.NON_CONSUMABLE, platform: C.Platform.GOOGLE_PLAY });
      S.when().approved(t => t.verify()).verified(r => r.finish());
      S.when().productUpdated(() => { for (const x of MONET_PRODUCTS) { const pr = S.get(x.id, C.Platform.GOOGLE_PLAY); if (pr && pr.pricing) this._prices[x.id] = pr.pricing.price; } });
      S.when().finished(t => { for (const pr of t.products) if (monetProduct(pr.id) && G.p) { ensureIap(G.p).iap[pr.id] = true; save(); try { renderAll(); } catch (e) {} } });
      await S.initialize([C.Platform.GOOGLE_PLAY]);
      for (const x of MONET_PRODUCTS) { const pr = S.get(x.id, C.Platform.GOOGLE_PLAY); if (pr && pr.owned && G.p) ensureIap(G.p).iap[x.id] = true; }
    } catch (e) { console.warn('billing init', e); }
  },
  async buy(id) {
    try { const S = this._store(), C = window.CdvPurchase, pr = S.get(id, C.Platform.GOOGLE_PLAY); if (!pr) return false; const off = pr.getOffer(); if (!off) return false; const err = await off.order(); return !err; } catch (e) { return false; }
  },
  async restore() { try { await this._store().restorePurchases(); } catch (e) {} const S = this._store(), C = window.CdvPurchase, got = []; try { for (const x of MONET_PRODUCTS) { const pr = S.get(x.id, C.Platform.GOOGLE_PLAY); if (pr && pr.owned) got.push(x.id); } } catch (e) {} return got; },
  async rewarded() {
    try {
      const C = window.Capacitor, A = (C.registerPlugin ? C.registerPlugin('AdMob') : C.Plugins.AdMob); if (!A) return false;
      if (!this._admobReady) { await A.initialize({}); this._admobReady = true; }
      let ok = false; const h = await A.addListener('onRewardedVideoAdReward', () => { ok = true; });
      await A.prepareRewardVideoAd({ adId: MONET_AD_UNIT_REWARDED, isTesting: MONET_AD_TESTING });
      const item = await A.showRewardVideoAd();
      if (item && typeof item.amount === 'number') ok = true;
      try { h && h.remove && h.remove(); } catch (e) {}
      return ok;
    } catch (e) { return false; }
  }
};
const MONET_AD_TESTING = true;   // 公開前に false にする
const MONET_AD_UNIT_REWARDED = 'ca-app-pub-3940256099942544/5224354917';   // Google の公開テスト用ID。本番IDに差し替える
function monetProvider() { return monetMode() === 'native' ? MonetNative : MonetMock; }
async function monetBoot() {
  if (monetMode() === 'native') { await MonetNative.init(); }
  if (G.p) ensureIap(G.p);
  monetClampSpeed();
}

// ---------- 購入 ----------
async function monetBuy(id) {
  if (!monetProduct(id) || ownsIap(id)) return;
  const ok = await monetProvider().buy(id);
  if (ok) { ensureIap(G.p).iap[id] = true; save(); toast(`「${monetProduct(id).name}」を購入しました`); renderAll(); if (G.modalOpen) openMonetShop(); }
  else toast('購入できませんでした');
}
async function monetRestore() {
  const got = await monetProvider().restore(); let n = 0;
  for (const id of got) if (monetProduct(id) && !G.p.iap[id]) { ensureIap(G.p).iap[id] = true; n++; }
  save(); renderAll(); toast(n ? `購入を${n}件復元しました` : '復元できる購入はありませんでした'); if (G.modalOpen) openMonetShop();
}
function monetShopHtml(inTown) {
  const showBundle = !BUNDLE_INCLUDES.some(id => ownsIap(id));   // どちらかを持っていたらセットは出さない（二重払い防止）
  return MONET_PRODUCTS.filter(x => x.id !== 'bundle' || showBundle).sort((a, b) => (b.id === 'bundle') - (a.id === 'bundle')).map(x => { const own = ownsIap(x.id), pr = monetProvider().price(x.id);
    return `<div class="smith-item"><div class="it-h"><span class="it-name">${x.icon} ${x.name}</span><span class="sub" style="margin-left:auto">${own ? '✔ 購入済み' : esc(pr || '')}</span></div>
      <div class="it-meta"><span>${x.desc}</span></div>
      <button class="btn small${own ? '' : ' primary'}" data-act="monetBuy" data-id="${x.id}" ${own ? 'disabled' : ''}>${own ? '購入済み' : '購入する'}</button></div>`; }).join('')
    + `<div class="act"><button class="btn small" data-act="monetRestore">購入を復元</button>${inTown ? '' : '<button class="btn" data-act="monetClose">閉じる</button>'}</div>`;
}
function openMonetShop() { $('#m-sheet').innerHTML = '<h2 id="m-title">💎 ショップ</h2><div class="stack" style="gap:8px">' + monetShopHtml() + '</div>'; $('#modal').hidden = false; G.modalOpen = true; }

// ---------- リワード広告 ----------
function adLeft(kind) { const a = ensureIap(G.p).ads; return Math.max(0, (kind === 'drops' ? AD_CFG.dropsPerDay : AD_CFG.dailyPerDay) - (a[kind] || 0)); }
async function monetReward(kind) {
  if (!monetAdsOn() || adLeft(kind) <= 0) return;
  if (G._adBusy) return; G._adBusy = true;
  try {
    const ok = ownsIap('adfree') ? true : await monetProvider().rewarded(kind);   // 広告スキップ購入済みなら、見ずに受け取れる
    if (!ok) { toast('広告を最後まで見られませんでした'); return; }
    const p = G.p, a = ensureIap(p).ads;
    if (kind === 'drops') { ensureGacha(p).drops += AD_CFG.dropsReward; a.drops++; toast(`💧 鐘のしずく +${AD_CFG.dropsReward}`); }
    else if (kind === 'daily') { const d = ensureDaily(p); d.used = Math.max(0, d.used - 1); a.daily++; toast('限定ダンジョンの挑戦回数 +1'); }
    save(); renderAll();
  } finally { G._adBusy = false; }
}
function adButtonHtml(kind) {
  if (!monetAdsOn()) return '';
  const left = adLeft(kind), skip = ownsIap('adfree');
  const label = kind === 'drops' ? `鐘のしずく +${AD_CFG.dropsReward}` : '挑戦回数 +1';
  return `<button class="btn small wide" data-act="monetReward" data-kind="${kind}" ${left > 0 ? '' : 'disabled'}>${skip ? '🎁' : '📺'} ${skip ? '受け取る' : '広告を見て'}：${label}（今日 あと${left}回）</button>`;
}
