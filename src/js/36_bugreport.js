/* ================= bugreport ================= */
const _bugErrors = [];

function sanitizeErrPart(s, maxLen = 120) {
  return String(s || '')
    .replace(/https?:\/\/\S+/gi, '[url]')
    .replace(/file:\/\/\S+/gi, '[file]')
    .replace(/[;|]/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, maxLen);
}
function pushBugError(msg, file, line) {
  const m = sanitizeErrPart(msg || 'Error', 120);
  const f = file ? sanitizeErrPart(String(file).split(/[\\/]/).pop().split('?')[0], 40) : '';
  const loc = f ? `@${f}${line ? ':' + line : ''}` : '';
  const entry = (m + loc).slice(0, 120);
  if (!entry) return;
  _bugErrors.push(entry);
  while (_bugErrors.length > 3) _bugErrors.shift();
}
if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('error', e => {
    pushBugError(e && e.message ? e.message : 'ScriptError', e && e.filename, e && e.lineno);
  });
  window.addEventListener('unhandledrejection', e => {
    const r = e && e.reason;
    const msg = r && r.message ? r.message : String(r || 'UnhandledRejection');
    pushBugError(msg, '', 0);
  });
}
function parseUaShort() {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
  let br = 'Other';
  if (/Edg\//i.test(ua)) br = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) br = 'Chrome';
  else if (/Firefox\//i.test(ua)) br = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) br = 'Safari';
  let os = 'Other';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';
  return `${br} ${os}`;
}
function buildBugDiag() {
  const p = G && G.p ? G.p : null;
  const run = G && G.run ? G.run : null;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0;
  const b = IS_DEV_BUILD ? 'dev' : 'prod';
  const ver = typeof APP_VERSION === 'string' ? APP_VERSION : 'unknown';
  const lv = p ? (Number(p.lv) || 1) : 1;
  const dg = run && run.d ? run.d.id : '-';
  const fl = run ? (Number(run.floor) || 1) : '-';
  const view = G && G.view ? G.view : '-';
  const err = _bugErrors.length ? _bugErrors.join(' | ') : '-';
  return `build=${b}; ver=${ver}; vp=${vw}x${vh}; ua=${parseUaShort()}; lv=${lv}; dg=${dg}; fl=${fl}; view=${view}; err=${err}`;
}
function isBugReportConfigured() {
  return !!(BUGREPORT_CFG.reportUrl && BUGREPORT_CFG.entryKind && BUGREPORT_CFG.entryText && BUGREPORT_CFG.entryDiag);
}
function bugReportWaitSec() {
  try {
    const last = Number(localStorage.getItem(BUGREPORT_CFG.rateKey) || 0);
    if (!last || !isFinite(last)) return 0;
    const rem = Math.ceil((last + BUGREPORT_CFG.rateLimitSec * 1000 - Date.now()) / 1000);
    return rem > 0 ? rem : 0;
  } catch (e) { return 0; }
}
function readBugQueue() {
  try {
    const raw = localStorage.getItem(BUGREPORT_CFG.queueKey);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-5) : [];
  } catch (e) { return []; }
}
function writeBugQueue(arr) {
  try {
    localStorage.setItem(BUGREPORT_CFG.queueKey, JSON.stringify((arr || []).slice(-5)));
  } catch (e) {}
}
function buildBugFormData(kind, text, diag) {
  const fd = new FormData();
  fd.append(BUGREPORT_CFG.entryKind, kind);
  fd.append(BUGREPORT_CFG.entryText, text);
  fd.append(BUGREPORT_CFG.entryDiag, diag);
  return fd;
}
async function sendBugReport(kind, text, diag) {
  if (!isBugReportConfigured()) return { ok: false, reason: 'not_configured' };
  const cleanText = String(text || '').trim();
  if (cleanText.length < BUGREPORT_CFG.textMin || cleanText.length > BUGREPORT_CFG.textMax) {
    return { ok: false, reason: 'invalid_length' };
  }
  const wait = bugReportWaitSec();
  if (wait > 0) return { ok: false, reason: 'rate_limit', wait };
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline) {
    const q = readBugQueue();
    q.push({ kind, text: cleanText, diag, ts: Date.now() });
    writeBugQueue(q);
    return { ok: false, queued: true };
  }
  try {
    await fetch(BUGREPORT_CFG.reportUrl, { method: 'POST', mode: 'no-cors', body: buildBugFormData(kind, cleanText, diag) });
    try { localStorage.setItem(BUGREPORT_CFG.rateKey, String(Date.now())); } catch (e) {}
    return { ok: true };
  } catch (e) {
    const q = readBugQueue();
    q.push({ kind, text: cleanText, diag, ts: Date.now() });
    writeBugQueue(q);
    return { ok: false, queued: true };
  }
}
let _flushingQueue = false;
async function flushBugQueue() {
  if (_flushingQueue || !isBugReportConfigured()) return 0;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
  const q = readBugQueue();
  if (!q.length) return 0;
  _flushingQueue = true;
  let sent = 0;
  const remain = [];
  try {
    for (let i = 0; i < q.length; i++) {
      const it = q[i];
      if (!it || !it.text) continue;
      try {
        await fetch(BUGREPORT_CFG.reportUrl, { method: 'POST', mode: 'no-cors', body: buildBugFormData(it.kind || 'その他', it.text, it.diag || '') });
        sent++;
      } catch (e) {
        for (let j = i; j < q.length; j++) remain.push(q[j]);
        break;
      }
    }
    writeBugQueue(remain);
  } finally {
    _flushingQueue = false;
  }
  return sent;
}
