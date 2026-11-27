/* ================= 鐘のしずく・ガチャ「福音のくじ」・ログインボーナス ================= */
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function ensureGacha(p) {
  if (!p.gacha || typeof p.gacha !== 'object') p.gacha = {};
  const g = p.gacha;
  g.drops = Math.max(0, Math.floor(Number(g.drops) || 0)); g.pity = Math.max(0, Math.floor(Number(g.pity) || 0)); g.total = Math.max(0, Math.floor(Number(g.total) || 0));
  if (!g.owned || typeof g.owned !== 'object') g.owned = {};
  if (!g.eq || typeof g.eq !== 'object') g.eq = {};
  for (const s of COS_SLOTS) if (typeof g.eq[s.k] !== 'string') g.eq[s.k] = null;
  if (typeof g.frame !== 'string') g.frame = null;
  if (!p.login || typeof p.login !== 'object') p.login = { last: '', claims: 0 };
  p.login.claims = Math.max(0, Math.floor(Number(p.login.claims) || 0)); if (typeof p.login.last !== 'string') p.login.last = '';
  return g;
}
function addDrops(n, why) {
  const p = G.p; if (!p || !(n > 0)) return;
  ensureGacha(p).drops += n;
  if (!G.headless) setTimeout(() => toast(`💧 鐘のしずく +${n}${why ? '（' + why + '）' : ''}`), 1800);
}
// 実績・初踏破・目標達成の報酬（初回のみ呼ばれる）
function rewardDropsAch(a) { addDrops(Math.max(2, Math.round((a.coins || 0) / 3)), '実績'); }
function cosById(id) { return COSMETICS.find(c => c.id === id) || null; }

// ---------- 抽選 ----------
function gachaRollRarity(forceMin) {
  const g = ensureGacha(G.p);
  if (g.pity + 1 >= GACHA_CFG.pity) return 3;
  let r = rng() * 100, k = 0;
  for (; k < 3; k++) { r -= GACHA_CFG.rates[k]; if (r < 0) break; }
  return Math.max(k, forceMin || 0);
}
function gachaPick(rar) { const pool = GACHA_POOL[rar]; return pool[Math.floor(rng() * pool.length) % pool.length]; }
function gachaPull(n) {
  const p = G.p; if (!p || G.run) return null;
  const g = ensureGacha(p), cost = n === 10 ? GACHA_CFG.costTen : GACHA_CFG.costSingle;
  if (g.drops < cost) { toast('鐘のしずくが足りません'); return null; }
  g.drops -= cost;
  const out = [];
  for (let i = 0; i < n; i++) {
    const rar = gachaRollRarity(n === 10 && i === 9 ? 2 : 0), it = gachaPick(rar);
    g.total++; g.pity = rar === 3 ? 0 : g.pity + 1;
    const key = it.type + ':' + it.id, had = !!g.owned[key];
    g.owned[key] = (g.owned[key] || 0) + 1;
    let refund = 0;
    if (had) { refund = GACHA_CFG.refund[rar]; g.drops += refund; }
    else if (it.type === 'title') { p.tower = p.tower || { best: 0, coins: 0, totalCoins: 0, title: null, titles: [] }; p.tower.titles = p.tower.titles || []; if (!p.tower.titles.includes(it.id)) p.tower.titles.push(it.id); }
    out.push({ rar, it, isNew: !had, refund });
  }
  try { save(); } catch (e) {}
  return out;
}

// ---------- 見た目への反映 ----------
function cosTint(p) { const c = p && p.gacha && p.gacha.eq && cosById(p.gacha.eq.tint); return c ? c.fx : ''; }
const WING_PATH = 'M50 34 C 34 2, 6 4, 0 26 C 10 22, 16 28, 13 38 C 23 33, 29 40, 25 50 C 37 44, 43 51, 50 42 Z';
const BAT_PATH = 'M50 34 L12 4 L20 22 L2 30 L16 38 L8 54 L30 44 L40 58 Z';
const BELL_PATH = 'M50 6 C 44 6 42 10 42 14 C 30 18 26 30 26 44 L 18 56 L 82 56 L 74 44 C 74 30 70 18 58 14 C 58 10 56 6 50 6 Z M 42 60 A 8 8 0 0 0 58 60 Z';
function cosOverlayHtml(p) {
  p = p || G.p; if (!p || !p.gacha) return '';
  const eq = p.gacha.eq || {}, parts = [];
  const back = cosById(eq.back), floor = cosById(eq.floor), aura = cosById(eq.aura);
  if (back) {
    const col = back.col;
    if (back.fx === 'wing') {
      const sz = back.size || 1, path = back.bat ? BAT_PATH : WING_PATH;
      const w = (side) => `<svg class="cos-wing ${side}${back.glow ? ' glow' : ''}" viewBox="0 0 100 62" style="--wc:${col};--ws:${sz}"><path d="${path}" fill="${col}" stroke="rgba(20,20,40,.55)" stroke-width="1.6"/></svg>`;
      parts.push(`<div class="cos-back">${w('l')}${w('r')}</div>`);
    } else if (back.fx === 'halo') parts.push(`<i class="cos-halo" style="--hc:${col}"></i>`);
    else if (back.fx === 'bell') parts.push(`<div class="cos-bell${back.big ? ' big' : ''}" style="--bc:${col}"><svg viewBox="0 0 100 70"><path d="${BELL_PATH}" fill="${col}" opacity=".85" stroke="rgba(60,30,0,.5)" stroke-width="1.5"/></svg></div>`);
  }
  if (floor) {
    if (floor.fx === 'ring') parts.push(`<i class="cos-ring" style="--fc:${floor.col}"></i>`);
    else if (floor.fx === 'circle') parts.push(`<i class="cos-circle" style="--fc:${floor.col}"></i>`);
  }
  if (aura) {
    const n = aura.many ? 16 : 9, cols = aura.fx === 'rainbow' ? ['#ff6a7a', '#ffb347', '#ffe27a', '#8be05a', '#6ac0ff', '#b48cff'] : [aura.dots || aura.col];
    if (aura.fx === 'glow') parts.push(`<i class="cos-glow" style="--gc:${aura.col}"></i>`);
    if (aura.fx === 'rainbow') parts.push('<i class="cos-glow rainbow"></i>');
    let dots = ''; for (let i = 0; i < n; i++) dots += `<b style="--x:${(8 + (i * 83) % 84)}%;--d:${(1.8 + (i * 7) % 5 / 2).toFixed(2)}s;--w:${(-(i * 0.43)).toFixed(2)}s;--c:${cols[i % cols.length]}"></b>`;
    parts.push(`<div class="cos-dots">${dots}</div>`);
  }
  return parts.length ? `<div class="cos-ov" aria-hidden="true">${parts.join('')}</div>` : '';
}
function cosKey(p) { const g = p && p.gacha; return g && g.eq ? COS_SLOTS.map(s => g.eq[s.k] || '').join('|') : ''; }
// 立ち絵 + おまけ装備の見た目（街・ステータス用）
function heroWithCos(sk, style) { return `<div class="cos-stage">${skinArt(sk, style)}${cosOverlayHtml()}</div>`; }

// ---------- 画面 ----------
function gachaRatesHtml() {
  const r = GACHA_CFG.rates;
  const rows = GACHA_RARITY.map((q, i) => `<tr><td style="color:${q.color};font-weight:700">${q.name}</td><td>${r[i]}%</td><td>${GACHA_POOL[i].length}種</td><td>ダブり → しずく${GACHA_CFG.refund[i]}</td></tr>`).join('');
  return `<table class="gc-rates"><tr><th>ランク</th><th>提供割合</th><th>景品数</th><th>ダブり</th></tr>${rows}</table>
    <p class="sub" style="margin:6px 0 0">・10連の最後の1枠はSR以上が確定。<br>・SSRが出ないまま${GACHA_CFG.pity}回引くと、次の1回はSSR確定（天井）。<br>・景品はすべて見た目だけで、強さには影響しません。「鐘のしずく」はゲーム内で入手でき、お金では買えません。</p>`;
}
function renderGachaFacility(p) {
  const g = ensureGacha(p), sk = CHAR_SKINS.find(s => s.id === (p.skin || 'ruby')), left = GACHA_CFG.pity - g.pity;
  const owned = type => Object.keys(g.owned).filter(k => k.startsWith(type + ':')).map(k => k.slice(type.length + 1));
  const slotRow = s => {
    const mine = COSMETICS.filter(c => c.slot === s.k && g.owned['cos:' + c.id]);
    return `<div class="gc-slot"><b>${s.name}</b><div class="gc-opts"><button class="pill ${!g.eq[s.k] ? 'on' : ''}" data-act="gachaEquip" data-slot="${s.k}" data-id="">なし</button>${mine.map(c => `<button class="pill ${g.eq[s.k] === c.id ? 'on' : ''}" style="border-color:${GACHA_RARITY[c.rar].color}" data-act="gachaEquip" data-slot="${s.k}" data-id="${c.id}">${esc(c.name)}</button>`).join('')}${mine.length ? '' : '<span class="sub">未入手</span>'}</div></div>`;
  };
  const frames = DEX_FRAMES.filter(f => g.owned['frame:' + f.id]);
  const cnt = (type, list) => owned(type).length + '/' + list.length;
  return `
    <h2>福音のくじ</h2>
    <p class="sub" style="margin:0 0 8px">鐘のしずくで回せる、見た目だけのくじ引き。称号・図鑑の飾り・おまけ装備が出ます。</p>
    <div class="gc-top"><div class="gc-stage">${heroWithCos(sk, 'width:110px;height:110px')}</div>
      <div class="gc-bal"><div class="gc-drops">💧 <b>${fmt(g.drops)}</b><small> 鐘のしずく</small></div>
        <small class="sub">天井まであと ${left} 回／累計 ${g.total} 回</small></div></div>
    <div class="act" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn primary" style="flex:1;min-width:120px" data-act="gachaPull" data-n="1" ${g.drops >= GACHA_CFG.costSingle ? '' : 'disabled'}>1回（💧${GACHA_CFG.costSingle}）</button>
      <button class="btn primary" style="flex:1;min-width:120px" data-act="gachaPull" data-n="10" ${g.drops >= GACHA_CFG.costTen ? '' : 'disabled'}>10連（💧${GACHA_CFG.costTen}）</button></div>
    <details class="gc-det" open><summary>提供割合・天井</summary>${gachaRatesHtml()}</details>
    <p class="sub" style="margin:10px 0 4px"><b>しずくの集め方</b>：ログインボーナス／実績の初達成／ダンジョンの初踏破／はじめの目標／デイリーダンジョン</p>
    <div class="panel" style="margin-top:10px"><h2 style="margin:0 0 6px">おまけ装備（${cnt('cos', COSMETICS)}）</h2>${COS_SLOTS.map(slotRow).join('')}</div>
    <div class="panel" style="margin-top:10px"><h2 style="margin:0 0 6px">図鑑の飾り（${cnt('frame', DEX_FRAMES)}）</h2>
      <div class="gc-opts"><button class="pill ${!g.frame ? 'on' : ''}" data-act="gachaFrame" data-id="">なし</button>${frames.map(f => `<button class="pill ${g.frame === f.id ? 'on' : ''}" style="border-color:${GACHA_RARITY[f.rar].color}" data-act="gachaFrame" data-id="${f.id}">${esc(f.name)}</button>`).join('')}${frames.length ? '' : '<span class="sub">未入手</span>'}</div></div>
    <p class="sub" style="margin:10px 0 0">称号（${cnt('title', GACHA_TITLES)}）は、ステータス＞称号の一覧から付け替えられます。</p>`;
}
function openGachaResult(res) {
  const rows = res.map(r => {
    const q = GACHA_RARITY[r.rar], tp = r.it.type === 'cos' ? 'おまけ装備' : r.it.type === 'title' ? '称号' : '図鑑の飾り';
    return `<div class="gc-res r${r.rar}" style="border-color:${q.color}"><b style="color:${q.color}">${q.name}</b><span>${esc(r.it.name)}<small> ${tp}</small></span>${r.isNew ? '<em>NEW</em>' : `<small class="sub">ダブり +💧${r.refund}</small>`}</div>`;
  }).join('');
  $('#m-sheet').innerHTML = `<h2 class="win" id="m-title">🔔 くじの結果</h2><div class="gc-resl">${rows}</div><p class="sub" style="margin:6px 0">残り 💧${fmt(ensureGacha(G.p).drops)}</p><div class="act"><button class="btn primary" data-act="closeTowerModal">閉じる</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}

// ---------- ログインボーナス ----------
function loginClaimed(p) { return ensureGacha(p) && p.login.last === todayStr(); }
function loginBonusSkip() {
  if (G.headless) return true;
  if (/[?&]login=1\b/.test(location.search)) return false;
  try { if (navigator.webdriver) return true; } catch (e) {}
  return false;
}
function loginBonusPrompt() {
  const p = G.p; if (!p || loginBonusSkip() || (G.tutorial && !G.tutorial.done) || G._titleUp || G._storyUp || G.run) return;
  if (loginClaimed(p) || G.modalOpen) return;
  const day = p.login.claims % 7;
  const cells = LOGIN_REWARDS.map((n, i) => `<div class="lg-cell${i === LOGIN_REWARDS.length - 1 ? ' last' : ''}${i < day ? ' got' : i === day ? ' today' : ''}"><small>${i === LOGIN_REWARDS.length - 1 ? '✨ 7日目・大当たり ✨' : (i + 1) + '日目'}</small><b>💧${n}</b>${i < day ? '<span>✓</span>' : ''}</div>`).join('');
  $('#m-sheet').innerHTML = `<h2 class="win" id="m-title">ログインボーナス</h2><p class="sub" style="margin:0 0 8px">毎日起動すると鐘のしずくがもらえます（休んでも途中から続けられます）。</p><div class="lg-grid">${cells}</div><p style="margin:10px 0 0">今日は <b>💧${LOGIN_REWARDS[day]}</b> をプレゼント！</p><div class="act"><button class="btn primary" data-act="loginClaim" id="m-login">受け取る</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
  setTimeout(() => { const b = $('#m-login'); if (b) b.focus(); }, 0);
}
function loginClaim() {
  const p = G.p; if (!p || loginClaimed(p)) { closeModal(); return; }
  const n = LOGIN_REWARDS[p.login.claims % 7];
  p.login.last = todayStr(); p.login.claims++; ensureGacha(p).drops += n;
  try { save(); } catch (e) {}
  closeModal(); toast(`💧 鐘のしずく +${n} を受け取りました`);
  if (G.view === 'town') renderTown();
}
