/* ================= デイリーダンジョン「鐘の試練」 ================= */
const dailyTheme = (date = new Date()) => DAILY_THEMES[date.getDay()];

// プレイヤーの強さ → 敵の強さ係数S。戦闘力とLvの両方を見て、既存ダンジョンの実測テーブルから補間する
let _dailyTbl = null;
function dailyTable() {
  if (_dailyTbl) return _dailyTbl;
  const cells = [];
  for (const d of DUNGEONS) d.rec.forEach((rec, i) => cells.push({ rec, pw: refPower(d, i), pow: d.pow[i] }));
  const mono = (key) => {
    const a = [...cells].sort((x, y) => x[key] - y[key] || x.pow - y.pow), out = []; let mx = 0;
    for (const c of a) { mx = Math.max(mx, c.pow); if (out.length && out[out.length - 1].x === c[key]) out[out.length - 1].y = mx; else out.push({ x: c[key], y: mx }); }
    return out;
  };
  return (_dailyTbl = { pw: mono('pw'), lv: mono('rec') });
}
function dailyInterp(t, x) {
  if (x <= t[0].x) return Math.max(0.25, t[0].y * x / Math.max(1, t[0].x));
  for (let i = 1; i < t.length; i++) if (x <= t[i].x) { const a = t[i - 1], b = t[i]; return a.y + (b.y - a.y) * (x - a.x) / Math.max(1e-9, b.x - a.x); }
  return t[t.length - 1].y;
}
function dailyScale(p) {
  const T = dailyTable();
  const sPw = dailyInterp(T.pw, playerPower(p)), sLv = dailyInterp(T.lv, p.lv);
  return Math.min(sPw, sLv * 1.25) * DAILY_CFG.ease;
}

function ensureDaily(p) {
  if (!p.daily || typeof p.daily !== 'object') p.daily = {};
  const d = p.daily;
  if (typeof d.date !== 'string') d.date = '';
  d.used = Math.max(0, Math.floor(Number(d.used) || 0)); d.clears = Math.max(0, Math.floor(Number(d.clears) || 0));
  if (d.date !== todayStr()) { d.date = todayStr(); d.used = 0; }   // 日付が変わったら回数回復
  return d;
}
// 表示用（セーブ内容を書き換えない）。日付が変わっていれば使用回数0として扱う
const dailyUsed = p => (p.daily && p.daily.date === todayStr()) ? p.daily.used : 0;
const dailyLeft = p => Math.max(0, DAILY_CFG.perDay - dailyUsed(p));

function startDailyRun() {
  if (G.run) return;
  const p = G.p, st = ensureDaily(p);
  if (st.used >= DAILY_CFG.perDay) { toast('今日の挑戦回数は使い切りました。日付が変わると回復します'); return; }
  const th = dailyTheme(), src = dungeonOf(th.src);
  st.used++;
  const d = Object.assign({}, src, { name: '鐘の試練', maxStar: 4, bossMaxStar: undefined });
  G.run = {
    d, df: DIFFS[1], floors: DAILY_CFG.floors, floor: 0, cleared: 0, phase: 'next', enemy: null, queued: null, guard: 0,
    gold: 0, sp: 0, items: [], potions: { hp: 0, mp: 0 }, kills: 0, startLv: p.lv, skKey: '', skillCt: {},
    daily: { theme: th, S0: dailyScale(p), expM: (th.bonus.exp || 1), goldM: (th.bonus.gold || 1) }
  };
  G.run.snap = statSnap(p);
  G.view = 'dungeon';
  $('#log').innerHTML = '';
  addLog(`鐘の試練「${th.name}」（全${DAILY_CFG.floors}階層・今日あと${DAILY_CFG.perDay - st.used}回）に突入した！`, 'l-sys');
  save();
  renderAll(); ensureLoop();
}

// finishRun から呼ぶ。結果の補足 {drops, gold, sp, chest} を返す
function dailyFinish(run, result) {
  const p = G.p, th = run.daily.theme, st = ensureDaily(p), out = { drops: 0, clearGold: 0, sp: 0, chest: null, theme: th };
  if (result === 'clear') {
    st.clears++;
    out.drops = DAILY_CFG.clearDrops + (th.bonus.drops || 0);
    out.clearGold = Math.round(DAILY_CFG.clearGoldBase * run.daily.S0 * (th.bonus.gold || 1));
    out.sp = th.bonus.sp || 0;
    p.gold += out.clearGold; p.sp += out.sp; p.stats.clears++;
    addDrops(out.drops, '鐘の試練');
    if (th.bonus.chest) {
      const it = genItem(DIFFS[1], true, null, 4);
      receiveItem(it); run.items.push(it); out.chest = it;
    }
  }
  p.hp = result === 'defeat' ? Math.max(1, Math.round(maxHp(p) * 0.25)) : maxHp(p);
  return out;
}

function renderDailyCard(p) {
  const th = dailyTheme(), left = dailyLeft(p);
  const pips = Array.from({ length: DAILY_CFG.perDay }, (_, i) => `<i class="dl-pip${i < left ? ' on' : ''}"></i>`).join('');
  return `<article class="panel dcard dc-card dl-card" style="--a1:#2a2410;--a2:#14110a;--ac:#ffd45a">
    ${dgBanner(th.src, '鐘', `${th.icon} 鐘の試練`, `今日は「${esc(th.name)}」`, '')}
    <div class="dc-body">
    <p class="dc-blurb">敵の強さは今の自分に合わせて自動で調整されます。いつでも・何度でも日課にできるエンドコンテンツ。</p>
    <p class="dc-info">全 <b>${DAILY_CFG.floors}階層</b>　今日の曜日ボーナス <b>${esc(th.bonusTxt)}</b><br>踏破報酬 <b>💧${DAILY_CFG.clearDrops + (th.bonus.drops || 0)}</b> ＋ Gold<span class="dl-pips" aria-label="残り${left}回">${pips}</span> 残り <b>${left}</b> / ${DAILY_CFG.perDay} 回</p>
    <button class="btn primary wide" data-act="goDaily" ${left > 0 ? '' : 'disabled'}>${left > 0 ? '挑戦する' : '本日は終了（明日また）'}</button>
    </div></article>`;
}
