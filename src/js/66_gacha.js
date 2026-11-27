/* ================= 鐘のしずく・ガチャ「福音のくじ」・ログインボーナス ================= */
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function ensureGacha(p) {
  if (!p.gacha || typeof p.gacha !== 'object') p.gacha = {};
  const g = p.gacha;
  g.drops = Math.max(0, Math.floor(Number(g.drops) || 0)); g.pity = Math.max(0, Math.floor(Number(g.pity) || 0)); g.total = Math.max(0, Math.floor(Number(g.total) || 0));
  if (!g.pities || typeof g.pities !== 'object') g.pities = {};
  for (const gr of GACHA_GENRES) g.pities[gr.k] = Math.max(0, Math.floor(Number(g.pities[gr.k]) || 0));
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
function gachaRollRarity(genre, forceMin) {
  const g = ensureGacha(G.p);
  if (g.pities[genre] + 1 >= GACHA_CFG.pity) return 3;
  let r = rng() * 100, k = 0;
  for (; k < 3; k++) { r -= GACHA_CFG.rates[k]; if (r < 0) break; }
  return Math.max(k, forceMin || 0);
}
function gachaPick(genre, rar) { const pool = GACHA_POOL[genre][rar]; return pool[Math.floor(rng() * pool.length) % pool.length]; }
function gachaPull(n, genre) {
  const p = G.p; if (!p || G.run) return null;
  if (!GACHA_GENRES.some(x => x.k === genre)) genre = 'cos';
  const g = ensureGacha(p), cost = n === 10 ? GACHA_CFG.costTen : GACHA_CFG.costSingle;
  if (g.drops < cost) { toast('鐘のしずくが足りません'); return null; }
  g.drops -= cost;
  const out = [];
  for (let i = 0; i < n; i++) {
    const rar = gachaRollRarity(genre, n === 10 && i === 9 ? 2 : 0), it = gachaPick(genre, rar);
    g.total++; g.pities[genre] = rar === 3 ? 0 : g.pities[genre] + 1;
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
    else if (floor.fx === 'circle') parts.push(`<i class="cos-circle${floor.big ? ' big' : ''}" style="--fc:${floor.col}"></i>`);
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
function gachaRatesHtml(genre) {
  const r = GACHA_CFG.rates;
  const rows = GACHA_RARITY.map((q, i) => `<tr><td style="color:${q.color};font-weight:700">${q.name}</td><td>${r[i]}%</td><td>${GACHA_POOL[genre][i].length}種</td><td>ダブり → しずく${GACHA_CFG.refund[i]}</td></tr>`).join('');
  return `<table class="gc-rates"><tr><th>ランク</th><th>提供割合</th><th>景品数</th><th>ダブり</th></tr>${rows}</table>
    <p class="sub" style="margin:6px 0 0">・10連の最後の1枠はSR以上が確定。<br>・SSRが出ないまま${GACHA_CFG.pity}回引くと、次の1回はSSR確定（天井）。天井の回数はくじのジャンルごとに数えます。<br>・景品はすべて見た目だけで、強さには影響しません。「鐘のしずく」はゲーム内で入手でき、お金では買えません。</p>`;
}

function renderGachaFacility(p) {
  const g = ensureGacha(p), sk = CHAR_SKINS.find(s => s.id === (p.skin || 'ruby'));
  const gk = GACHA_GENRES.some(x => x.k === G.gcGenre) ? G.gcGenre : 'cos', gr = GACHA_GENRES.find(x => x.k === gk);
  const left = GACHA_CFG.pity - g.pities[gk];
  const total = Object.keys(g.owned).length, all = COSMETICS.length + DEX_FRAMES.length + GACHA_TITLES.length;
  const poolN = GACHA_POOL[gk].reduce((s, l) => s + l.length, 0), ownN = Object.keys(g.owned).filter(k => k.startsWith(gk + ':')).length;
  const tabs = GACHA_GENRES.map(x => `<button class="seg-b ${x.k === gk ? 'on' : ''}" aria-pressed="${x.k === gk}" data-act="gachaGenre" data-g="${x.k}">${x.icon} ${x.name}<small>${Object.keys(g.owned).filter(k => k.startsWith(x.k + ':')).length}/${GACHA_POOL[x.k].reduce((s, l) => s + l.length, 0)}</small></button>`).join('');
  return `
    <h2>福音のくじ</h2>
    <p class="sub" style="margin:0 0 8px">ジャンルを選んで引く、見た目だけのくじ引き。ジャンルごとに景品と天井が別です。</p>
    <div class="seg gc-genres" role="tablist" aria-label="くじのジャンル">${tabs}</div>
    <div class="gc-top"><div class="gc-stage">${heroWithCos(sk, 'width:110px;height:110px')}</div>
      <div class="gc-bal"><div class="gc-drops">💧 <b>${fmt(g.drops)}</b><small> 鐘のしずく</small></div>
        <small class="sub"><b>${gr.name}くじ</b>（${ownN}/${poolN}種）<br>天井まであと ${left} 回／累計 ${g.total} 回</small></div></div>
    <p class="sub" style="margin:0 0 8px">${gr.desc}</p>
    <div class="act" style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn primary" style="flex:1;min-width:120px" data-act="gachaPull" data-n="1" ${g.drops >= GACHA_CFG.costSingle ? '' : 'disabled'}>1回（💧${GACHA_CFG.costSingle}）</button>
      <button class="btn primary" style="flex:1;min-width:120px" data-act="gachaPull" data-n="10" ${g.drops >= GACHA_CFG.costTen ? '' : 'disabled'}>10連（💧${GACHA_CFG.costTen}）</button></div>
    <button class="btn wide gc-coll" data-act="gachaCollection">📖 景品一覧・着せ替え<small>集めた景品 ${total} / ${all}</small></button>
    <details class="gc-det"><summary>${gr.name}くじの提供割合・天井</summary>${gachaRatesHtml(gk)}</details>
    <p class="sub" style="margin:10px 0 0"><b>しずくの集め方</b>：ログインボーナス／実績の初達成／ダンジョンの初踏破／はじめの目標／限定ダンジョン</p>`;
}

// ---------- 景品一覧・着せ替え（試着つき） ----------
function gcState() {
  const g = ensureGacha(G.p);
  if (!G._gc) G._gc = { tab: 'cos', eq: Object.assign({}, g.eq), frame: g.frame || null };
  return G._gc;
}
// 指定の装備で立ち絵を描く（実際の装備は書き換えない）
function heroPreviewHtml(sk, style, eq) {
  const g = ensureGacha(G.p), keep = g.eq;
  g.eq = eq;
  try { return heroWithCos(sk, style); } finally { g.eq = keep; }
}
function gcItemCard(kind, id, name, rar, owned, on, act, attrs) {
  const q = GACHA_RARITY[rar];
  return `<button class="gc-card${on ? ' on' : ''}${owned ? '' : ' lock'}" style="--qc:${q.color}" data-act="${act}" ${attrs}><i class="gc-q">${q.name}</i><span class="gc-n">${esc(name)}</span><small>${owned ? '✓ 入手済み' : '未入手'}</small></button>`;
}
function openGachaCollection(tab) {
  const p = G.p, g = ensureGacha(p), st = gcState(), sk = CHAR_SKINS.find(s => s.id === (p.skin || 'ruby'));
  if (tab) st.tab = tab;
  const n = (type, list) => Object.keys(g.owned).filter(k => k.startsWith(type + ':')).length + '/' + list.length;
  const tabs = [['cos', 'おまけ装備', n('cos', COSMETICS)], ['frame', '図鑑の飾り', n('frame', DEX_FRAMES)], ['title', '称号', n('title', GACHA_TITLES)]]
    .map(([k, l, c]) => `<button class="seg-b ${st.tab === k ? 'on' : ''}" aria-pressed="${st.tab === k}" data-act="gcTab" data-tab="${k}">${l}<small>${c}</small></button>`).join('');
  let body = '';
  if (st.tab === 'cos') {
    body = COS_SLOTS.map(s => {
      const cards = COSMETICS.filter(c => c.slot === s.k).map(c => gcItemCard('cos', c.id, c.name, c.rar, !!g.owned['cos:' + c.id], st.eq[s.k] === c.id, 'gcTry', `data-slot="${s.k}" data-id="${c.id}"`)).join('');
      return `<div class="gc-slot"><b>${s.name}</b><div class="gc-grid"><button class="gc-card none${!st.eq[s.k] ? ' on' : ''}" style="--qc:#9aa7b4" data-act="gcTry" data-slot="${s.k}" data-id=""><span class="gc-n">なし</span></button>${cards}</div></div>`;
    }).join('');
  } else if (st.tab === 'frame') {
    body = `<div class="gc-slot"><b>図鑑・実績の額縁</b><div class="gc-grid"><button class="gc-card none${!st.frame ? ' on' : ''}" style="--qc:#9aa7b4" data-act="gcFrame" data-id=""><span class="gc-n">なし</span></button>${DEX_FRAMES.map(f => gcItemCard('frame', f.id, f.name, f.rar, !!g.owned['frame:' + f.id], st.frame === f.id, 'gcFrame', `data-id="${f.id}"`)).join('')}</div></div>`;
  } else {
    const tw = (p.tower && p.tower.title) || null;
    body = `<div class="gc-slot"><b>称号（ステータスにも表示されます）</b><div class="gc-grid">${GACHA_TITLES.map(t => gcItemCard('title', t.id, t.name, t.rar, !!g.owned['title:' + t.id], tw === t.id, 'gcTitle', `data-id="${t.id}"`)).join('')}</div></div>`;
  }
  const fr = DEX_FRAMES.find(f => f.id === st.frame);
  const need = COS_SLOTS.filter(s => st.eq[s.k] && !g.owned['cos:' + st.eq[s.k]]).length + (st.frame && !g.owned['frame:' + st.frame] ? 1 : 0);
  const dirty = COS_SLOTS.some(s => (st.eq[s.k] || null) !== (g.eq[s.k] || null)) || (st.frame || null) !== (g.frame || null);
  const sample = fr ? `style="--dxb:${fr.bd};--dxg:${fr.glow};--dxbg:${fr.bg}"` : '';
  $('#m-sheet').innerHTML = `
    <h2 class="win" id="m-title">📖 景品一覧・着せ替え</h2>
    <div class="gc-prev"><div class="gc-stage big">${heroPreviewHtml(sk, 'width:130px;height:130px', st.eq)}</div>
      <div class="gc-prev-r"><div class="gc-frame-sample${fr ? ' on' : ''}" ${sample}>図鑑の額縁</div>
        <small class="sub">タップで試着。${need ? `<b style="color:#ffb347">未入手が ${need} 点含まれています（試着のみ）</b>` : '入手済みの景品は「着る」で反映できます。'}</small></div></div>
    <div class="seg gc-tabs" role="tablist">${tabs}</div>
    <div class="gc-body">${body}</div>
    <div class="act" style="grid-template-columns:1fr 1fr 1fr">
      <button class="btn primary" data-act="gcApply" ${dirty && !need ? '' : 'disabled'}>着る</button>
      <button class="btn" data-act="gcReset" ${dirty ? '' : 'disabled'}>元に戻す</button>
      <button class="btn" data-act="gcClose">閉じる</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}
function gcClose() { G._gc = null; closeModal(); renderTown(); }

// ---------- 引く演出 ----------
function gachaRevealSkip() {
  if (G.headless || isReducedMotion()) return true;
  if (/[?&]reveal=1\b/.test(location.search)) return false;
  try { if (navigator.webdriver) return true; } catch (e) {}
  return false;
}
function openGachaResult(res) {
  const best = res.reduce((m, r) => Math.max(m, r.rar), 0), q0 = GACHA_RARITY[best], reveal = !gachaRevealSkip();
  const rows = res.map((r, i) => {
    const q = GACHA_RARITY[r.rar], tp = r.it.type === 'cos' ? 'おまけ装備' : r.it.type === 'title' ? '称号' : '図鑑の飾り';
    return `<div class="gc-res r${r.rar}" style="border-color:${q.color};--i:${i}"><b style="color:${q.color}">${q.name}</b><span>${esc(r.it.name)}<small> ${tp}</small></span>${r.isNew ? '<em>NEW</em>' : `<small class="sub">ダブり +💧${r.refund}</small>`}</div>`;
  }).join('');
  const sparks = best >= 2 ? Array.from({ length: best === 3 ? 18 : 10 }, (_, i) => `<b style="--a:${i * (360 / (best === 3 ? 18 : 10))}deg;--d:${(i % 4) * 0.08}s"></b>`).join('') : '';
  const rv = reveal ? `<div class="gc-rv rb${best}" data-act="gcSkip" style="--qc:${q0.color}" role="button" aria-label="演出をスキップ"><div class="gc-rv-bell"><svg viewBox="0 0 100 70"><path d="${BELL_PATH}" fill="currentColor" stroke="rgba(60,30,0,.5)" stroke-width="1.5"/></svg></div><i class="gc-rv-ring"></i><div class="gc-rv-sp">${sparks}</div><p class="gc-rv-t">${best === 3 ? '✨ SSR ✨' : best === 2 ? 'SR' : '…'}</p><small>タップでスキップ</small></div>` : '';
  $('#m-sheet').innerHTML = `<div class="gc-wrap${reveal ? ' reveal' : ''}">${rv}<h2 class="win" id="m-title">🔔 くじの結果</h2><div class="gc-resl">${rows}</div><p class="sub" style="margin:6px 0">残り 💧${fmt(ensureGacha(G.p).drops)}</p><div class="act"><button class="btn primary" data-act="closeTowerModal">閉じる</button></div></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
  if (reveal) {
    try { Sound.play('bell'); } catch (e) {}
    const ms = best === 3 ? 2300 : best === 2 ? 1700 : 1300;
    G._gcRvT = setTimeout(gachaRevealEnd, ms);
    if (best >= 2) setTimeout(() => { try { Sound.play(best === 3 ? 'win' : 'levelup'); } catch (e) {} }, ms - 600);
  }
}
function gachaRevealEnd() {
  clearTimeout(G._gcRvT);
  const w = document.querySelector('.gc-wrap.reveal'); if (!w) return;
  w.classList.remove('reveal'); w.classList.add('shown');
  const el = w.querySelector('.gc-rv'); if (el) { el.classList.add('out'); setTimeout(() => el.remove(), 350); }
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
