/* ================= backup / import / IndexedDB ================= */
const BACKUP_REMIND_MS = 7 * 24 * 60 * 60 * 1000;
const IDB_SYNC_INTERVAL_MS = 10000;
let _lastIdbSyncAt = 0;
let _persistRequested = false;

function readBackupMeta() {
  try {
    const raw = localStorage.getItem(BACKUP_META_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return (o && typeof o === 'object') ? o : {};
  } catch (e) { return {}; }
}
function writeBackupMeta(patch) {
  try {
    const cur = readBackupMeta();
    localStorage.setItem(BACKUP_META_KEY, JSON.stringify({ ...cur, ...patch }));
  } catch (e) { /* storage unavailable */ }
}
function formatBackupDate(ms) {
  if (!ms || !isFinite(ms)) return 'まだ書き出していません';
  const d = new Date(ms);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fnv1aHex(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
function bytesToBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlToBytes(b64u) {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64u.length + 3) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
async function streamTransform(bytes, ctor) {
  const cs = new ctor('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const ab = await new Response(cs.readable).arrayBuffer();
  return new Uint8Array(ab);
}
function buildSavePayload() {
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  if (!raw) {
    raw = JSON.stringify({ v: SAVE_VERSION, p: G.p, opts: G.opts, sel: G.sel, shopSel: G.shopSel, autoSellRarity: G.autoSellRarity });
  }
  let sv = SAVE_VERSION;
  try {
    const parsed = JSON.parse(raw);
    sv = Number(parsed && parsed.v) || 1;
  } catch (e) {}
  return {
    app: 'rogue-demo',
    kind: 'save',
    saveVersion: sv,
    exportedAt: new Date().toISOString(),
    data: raw
  };
}
async function encodeSaveCode(payload) {
  const json = JSON.stringify(payload || buildSavePayload());
  const rawBytes = new TextEncoder().encode(json);
  let prefix = 'RGS0:';
  let bodyBytes = rawBytes;
  if (typeof CompressionStream === 'function') {
    try {
      bodyBytes = await streamTransform(rawBytes, CompressionStream);
      prefix = 'RGS1:';
    } catch (e) {
      prefix = 'RGS0:';
      bodyBytes = rawBytes;
    }
  }
  const headAndBody = prefix + bytesToBase64Url(bodyBytes);
  return `${headAndBody}.${fnv1aHex(headAndBody)}`;
}
function summarizeSavePlayer(p) {
  if (!p || typeof p !== 'object') return { lv: 1, gold: 0, progress: '初期状態' };
  const cl = p.cleared || {};
  let cells = 0;
  for (const dg of DUNGEONS) {
    if (cl[dg.id]) for (const df of DIFFS) if (cl[dg.id][df.id]) cells++;
  }
  let prog = `クリア ${cells}セル`;
  if (p.ending || (cl.O && cl.O.extreme)) prog = '本編極級クリア済';
  else if (p.part1Cleared || (cl.I && cl.I.high)) prog = '前編クリア済';
  return { lv: Number(p.lv) || 1, gold: Number(p.gold) || 0, progress: prog };
}
async function decodeAndValidateSaveInput(inputStr) {
  const s = typeof inputStr === 'string' ? inputStr.trim() : '';
  if (!s) return { ok: false, error: '入力が空です。' };
  let jsonStr = s;
  if (s.startsWith('RGS1:') || s.startsWith('RGS0:')) {
    const dot = s.lastIndexOf('.');
    if (dot < 5 || s.length - dot - 1 !== 8) {
      return { ok: false, error: 'コードが途中で切れているか、形式が不正です。' };
    }
    const headAndBody = s.slice(0, dot);
    const sum = s.slice(dot + 1).toLowerCase();
    if (!/^[0-9a-f]{8}$/.test(sum) || fnv1aHex(headAndBody) !== sum) {
      return { ok: false, error: 'コードが壊れているか、途中で切れています（チェックサム不一致）。' };
    }
    const prefix = s.slice(0, 5);
    const b64u = headAndBody.slice(5);
    let bytes;
    try { bytes = base64UrlToBytes(b64u); } catch (e) {
      return { ok: false, error: 'コードのデコードに失敗しました。' };
    }
    if (prefix === 'RGS1:') {
      if (typeof DecompressionStream !== 'function') {
        return { ok: false, error: 'このブラウザは圧縮コード（RGS1）の展開に対応していません。' };
      }
      try { bytes = await streamTransform(bytes, DecompressionStream); } catch (e) {
        return { ok: false, error: '圧縮コードが壊れているため展開できませんでした。' };
      }
    }
    try { jsonStr = new TextDecoder().decode(bytes); } catch (e) {
      return { ok: false, error: 'コードの文字列変換に失敗しました。' };
    }
  }
  let obj;
  try { obj = JSON.parse(jsonStr); } catch (e) {
    return { ok: false, error: 'JSON として読み込めませんでした。' };
  }
  if (!obj || typeof obj !== 'object' || obj.app !== 'rogue-demo' || obj.kind !== 'save') {
    return { ok: false, error: 'このアプリ（rogue-demo）のセーブデータではありません。' };
  }
  const sv = Number(obj.saveVersion);
  if (!Number.isInteger(sv) || sv < 1) {
    return { ok: false, error: 'セーブバージョンが不正です。' };
  }
  if (sv > SAVE_VERSION) {
    return { ok: false, error: `セーブバージョン（v${sv}）が現在の対応版（v${SAVE_VERSION}）より新しいため読み込めません。` };
  }
  if (typeof obj.data !== 'string' || !obj.data) {
    return { ok: false, error: 'セーブ本体が含まれていません。' };
  }
  let inner;
  try { inner = JSON.parse(obj.data); } catch (e) {
    return { ok: false, error: 'セーブ本体の JSON が壊れています。' };
  }
  const migrated = migrateSave(inner);
  if (!migrated || !migrated.p) {
    return { ok: false, error: 'セーブ本体の構造が不正です。' };
  }
  return { ok: true, payload: obj, migrated, summary: summarizeSavePlayer(migrated.p) };
}
function applyImportedSave(payload) {
  if (!payload || typeof payload.data !== 'string') return false;
  let prevRaw = null;
  try {
    prevRaw = localStorage.getItem(SAVE_KEY);
    if (prevRaw) localStorage.setItem(SAVE_KEY + '_bak_import', prevRaw);
    localStorage.setItem(SAVE_KEY, payload.data);
  } catch (e) { return false; }
  if (!load()) {
    try {
      if (prevRaw !== null) localStorage.setItem(SAVE_KEY, prevRaw);
      else localStorage.removeItem(SAVE_KEY);
    } catch (e) {}
    return false;
  }
  save();
  idbMirrorSave(true);
  renderAll();
  return true;
}

/* ================= IndexedDB 複製 & 永続化 ================= */
function openBackupDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
    const req = indexedDB.open(IDB_BACKUP_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('idb open error'));
  });
}
async function idbMirrorSave(force = false) {
  const now = Date.now();
  if (!force && now - _lastIdbSyncAt < IDB_SYNC_INTERVAL_MS) return false;
  let raw = null;
  try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
  if (!raw) return false;
  _lastIdbSyncAt = now;
  try {
    const db = await openBackupDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('saves', 'readwrite');
      tx.objectStore('saves').put({ id: 'latest', raw, updatedAt: now });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch (e) { return false; }
}
async function idbReadSave() {
  try {
    const db = await openBackupDb();
    const rec = await new Promise((resolve, reject) => {
      const tx = db.transaction('saves', 'readonly');
      const req = tx.objectStore('saves').get('latest');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return rec;
  } catch (e) { return null; }
}
function requestPersistOnce() {
  if (_persistRequested) return;
  _persistRequested = true;
  try {
    if (navigator.storage && typeof navigator.storage.persist === 'function') {
      navigator.storage.persist().catch(() => {});
    }
  } catch (e) {}
}
function hasAnyDungeonClear(p) {
  if (!p || !p.cleared) return false;
  for (const dg of DUNGEONS) {
    const sc = p.cleared[dg.id];
    if (sc && DIFFS.some(df => !!sc[df.id])) return true;
  }
  return false;
}
function maybeShowBackupToast() {
  if (!hasAnyDungeonClear(G.p)) return;
  const meta = readBackupMeta();
  const now = Date.now();
  const dueExport = !meta.lastExportAt || (now - meta.lastExportAt >= BACKUP_REMIND_MS);
  const duePrompt = !meta.lastPromptAt || (now - meta.lastPromptAt >= BACKUP_REMIND_MS);
  if (dueExport && duePrompt) {
    writeBackupMeta({ lastPromptAt: now });
    toast('セーブの書き出しをおすすめします（設定）');
  }
}
