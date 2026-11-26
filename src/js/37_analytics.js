/* ================= analytics (P10) ================= */
let _sessionLastTickAt = Date.now();

function getOrCreateAnonId() {
  try {
    const cur = localStorage.getItem(ANALYTICS_CFG.anonIdKey);
    if (cur && /^[0-9a-f]{16}$/.test(cur)) return cur;
  } catch (e) {}
  let id = '';
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buf = new Uint8Array(8);
      crypto.getRandomValues(buf);
      for (let i = 0; i < buf.length; i++) id += buf[i].toString(16).padStart(2, '0');
    }
  } catch (e) {}
  while (id.length < 16) id += Math.floor(Math.random() * 16).toString(16);
  id = id.slice(0, 16);
  try { localStorage.setItem(ANALYTICS_CFG.anonIdKey, id); } catch (e) {}
  return id;
}
function recordAnalyticsLaunch() {
  _sessionLastTickAt = Date.now();
  try {
    const n = Math.max(0, Math.floor(Number(localStorage.getItem(ANALYTICS_CFG.launchKey) || 0))) + 1;
    localStorage.setItem(ANALYTICS_CFG.launchKey, String(n));
    return n;
  } catch (e) { return 1; }
}
function flushAnalyticsPlayTime() {
  const now = Date.now();
  const dt = Math.max(0, Math.min(60, (now - _sessionLastTickAt) / 1000));
  _sessionLastTickAt = now;
  try {
    const cur = Math.max(0, Number(localStorage.getItem(ANALYTICS_CFG.playSecKey) || 0));
    localStorage.setItem(ANALYTICS_CFG.playSecKey, String(Math.round(cur + dt)));
  } catch (e) {}
}
function getAnalyticsLaunchCount() {
  try {
    return Math.max(1, Math.floor(Number(localStorage.getItem(ANALYTICS_CFG.launchKey) || 1)));
  } catch (e) { return 1; }
}
function getAnalyticsPlayHours() {
  flushAnalyticsPlayTime();
  try {
    const sec = Math.max(0, Number(localStorage.getItem(ANALYTICS_CFG.playSecKey) || 0));
    return (sec / 3600).toFixed(1);
  } catch (e) { return '0.0'; }
}
function isAnalyticsOptOut() {
  try { return localStorage.getItem(ANALYTICS_CFG.optOutKey) === '1'; } catch (e) { return false; }
}
function setAnalyticsOptOut(optOut) {
  try {
    if (optOut) localStorage.setItem(ANALYTICS_CFG.optOutKey, '1');
    else localStorage.removeItem(ANALYTICS_CFG.optOutKey);
  } catch (e) {}
}
function highestReachedDungeon(p) {
  if (!p) return 'A';
  let highest = 'A';
  for (const d of DUNGEONS) {
    const cl = p.cleared && p.cleared[d.id];
    const hasCl = cl && DIFFS.some(df => !!cl[df.id]);
    if (hasCl || isDungeonUnlocked(p, d)) highest = d.id;
  }
  return highest;
}
function buildAnalyticsLine(isNew) {
  const p = G && G.p ? G.p : null;
  const id = getOrCreateAnonId();
  const ver = typeof APP_VERSION === 'string' ? APP_VERSION : 'unknown';
  const lv = p ? (Number(p.lv) || 1) : 1;
  const dg = highestReachedDungeon(p);
  const clear = (p && (p.ending || (p.cleared && p.cleared.O && p.cleared.O.extreme))) ? 1 : 0;
  const tw = (p && p.tower && Number(p.tower.best)) || 0;
  const ab = (p && p.abyss && Number(p.abyss.best)) || 0;
  const hours = getAnalyticsPlayHours();
  const launch = getAnalyticsLaunchCount();
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const nw = isNew ? 1 : 0;
  return `id=${id}; ver=${ver}; lv=${lv}; dg=${dg}; clear=${clear}; tw=${tw}; ab=${ab}; hours=${hours}; launch=${launch}; vp=${vw}x${vh}; new=${nw}`;
}
async function maybeSendAnalytics() {
  if (IS_DEV_BUILD) return { sent: false, reason: 'dev' };
  if (!ANALYTICS_CFG.reportUrl || !ANALYTICS_CFG.entryStats) return { sent: false, reason: 'unconfigured' };
  if (isAnalyticsOptOut()) return { sent: false, reason: 'optout' };
  // 自動テスト（Playwright等）が本番フォームへ送るのを防ぐ（実フォーム宛てのときのみ。テスト用ダミーURLは通す）
  if (typeof navigator !== 'undefined' && navigator.webdriver && /(^|\/\/)docs\.google\.com\//.test(ANALYTICS_CFG.reportUrl)) return { sent: false, reason: 'automation' };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { sent: false, reason: 'offline' };
  let last = 0;
  try { last = Number(localStorage.getItem(ANALYTICS_CFG.lastSentKey) || 0); } catch (e) {}
  const intervalMs = (Number(ANALYTICS_CFG.intervalHours) || 24) * 3600 * 1000;
  if (last > 0 && isFinite(last) && Date.now() - last < intervalMs) {
    return { sent: false, reason: 'interval' };
  }
  const isNew = !(last > 0);
  const line = buildAnalyticsLine(isNew);
  const fd = new FormData();
  fd.append(ANALYTICS_CFG.entryStats, line);
  try {
    await fetch(ANALYTICS_CFG.reportUrl, { method: 'POST', mode: 'no-cors', body: fd });
    try { localStorage.setItem(ANALYTICS_CFG.lastSentKey, String(Date.now())); } catch (e) {}
    return { sent: true, line };
  } catch (e) {
    return { sent: false, reason: 'error' };
  }
}
