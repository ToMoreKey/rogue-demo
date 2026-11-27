/* ================= セーブの安全性（Q4-1） =================
   ・保存失敗の警告バナー　・壊れたセーブの退避と復旧画面
   ・IndexedDB の自動バックアップ3世代　・別タブでの上書き防止 */
const SAVE_HIST_MAX = 3;                       // 自動バックアップの保持世代
const SAVE_HIST_GAP_MS = 20 * 60 * 1000;       // 世代を増やす最小間隔
const CORRUPT_KEEP = 2;                        // 退避した壊れたセーブの保持数

/* ---- 警告バナー（保存失敗／破損データ保護中／別タブ更新） ---- */
function renderSaveWarn() {
  if (typeof document === 'undefined' || G.headless) return;
  let msg = '', btn = '';
  if (G._staleTab) { msg = '⚠ 別のタブでセーブが更新されました。このタブでは保存を止めています。'; btn = '<button class="btn small" data-act="reloadPage">再読み込み</button>'; }
  else if (G._saveBlocked) { msg = '⚠ 破損したセーブを保護中のため、いまは保存していません。'; btn = '<button class="btn small" data-act="openRecovery">復旧画面を開く</button>'; }
  else if (G._saveErr) { msg = '⚠ セーブできていません（保存領域がいっぱいか、保存が許可されていません）。'; btn = '<button class="btn small" data-act="exportSaveFile">いまの内容をファイルに書き出す</button>'; }
  let el = document.getElementById('save-warn');
  if (!msg) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'save-warn'; el.setAttribute('role', 'alert'); document.body.appendChild(el); }
  el.innerHTML = `<span>${msg}</span>${btn}`;
}
function setSaveWarn(err) { const had = !!G._saveErr; G._saveErr = err ? String(err && err.message || err) : null; if (had !== !!err) renderSaveWarn(); }

/* ---- 起動時: 保存領域が使えるか ---- */
function probeStorage() {
  try { const k = SAVE_KEY + '_probe'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; }
}

/* ---- 壊れたセーブの退避 ---- */
function stashCorruptSave(raw) {
  try {
    const key = SAVE_KEY + '_corrupt_' + Date.now();
    localStorage.setItem(key, raw);
    const keys = []; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(SAVE_KEY + '_corrupt_')) keys.push(k); }
    keys.sort().slice(0, Math.max(0, keys.length - CORRUPT_KEEP)).forEach(k => localStorage.removeItem(k));
    return key;
  } catch (e) { return null; }
}
function listCorruptSaves() {
  const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith(SAVE_KEY + '_corrupt_')) out.push(k); } } catch (e) {}
  return out.sort();
}

/* ---- 自動バックアップ（IndexedDB・直近3世代） ---- */
function saveSummaryOf(raw) {
  try { const mig = migrateSave(JSON.parse(raw)); if (mig && mig.p) return summarizeSavePlayer(mig.p); } catch (e) {}
  return null;
}
async function idbHistoryPush(db, raw, now, force) {
  if (!saveSummaryOf(raw)) return;      // 壊れた内容は世代に入れない
  const rec = await new Promise((res, rej) => { const rq = db.transaction('saves', 'readonly').objectStore('saves').get('history'); rq.onsuccess = () => res(rq.result || { id: 'history', items: [] }); rq.onerror = () => rej(rq.error); });
  const items = Array.isArray(rec.items) ? rec.items : [];
  if (items.length && items[0].raw === raw) return;
  if (items.length && now - items[0].at < SAVE_HIST_GAP_MS && !force) return;
  items.unshift({ raw, at: now });
  rec.items = items.slice(0, SAVE_HIST_MAX);
  await new Promise((res, rej) => { const tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(rec); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
async function idbReadHistory() {
  try {
    const db = await openBackupDb();
    const recs = await new Promise((res, rej) => { const st = db.transaction('saves', 'readonly').objectStore('saves'); const a = st.get('history'), b = st.get('latest'); let h, l, n = 0; const done = () => { if (++n === 2) res({ h: h && h.items || [], l }); }; a.onsuccess = () => { h = a.result; done(); }; b.onsuccess = () => { l = b.result; done(); }; a.onerror = b.onerror = () => rej(a.error || b.error); });
    db.close();
    const list = recs.h.slice();
    if (recs.l && recs.l.raw && !list.some(x => x.raw === recs.l.raw)) list.unshift({ raw: recs.l.raw, at: recs.l.updatedAt || 0 });
    return list.filter(x => x && typeof x.raw === 'string').sort((x, y) => (y.at || 0) - (x.at || 0)).slice(0, SAVE_HIST_MAX + 1);
  } catch (e) { return []; }
}

/* ---- 別タブでの更新検知 ---- */
function watchOtherTabs() {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', e => {
    if (e.key !== SAVE_KEY || G._staleTab) return;
    G._staleTab = true; renderSaveWarn();
  });
}

/* ---- 復旧画面（破損時／ステータス>データから） ---- */
async function openRecoveryModal(reason) {
  const list = await idbReadHistory();
  G._recList = list; G._recArm = null; G._recReason = reason || '';
  renderRecoveryModal();
}
function renderRecoveryModal() {
  const list = G._recList || [], blocked = !!G._saveBlocked, reason = G._recReason || '';
  const rows = list.map((r, i) => {
    const s = saveSummaryOf(r.raw) || { lv: '?', gold: 0, progress: '' };
    const armed = G._recArm === i;
    return `<div class="rec-row"><div class="rec-info"><b>${esc(formatBackupDate(r.at))}</b><span>Lv ${s.lv} ／ ${fmt(s.gold)} G ／ ${esc(s.progress)}</span></div>
      <button class="btn small ${armed ? 'danger' : 'primary'}" data-act="recoverRestore" data-idx="${i}">${armed ? 'もう一度押すと復元' : blocked ? '復元する' : 'この時点に戻す'}</button></div>`;
  }).join('');
  $('#m-sheet').innerHTML = `
    <h2 id="m-title">${blocked ? 'セーブデータを読み込めません' : 'バックアップから復元'}</h2>
    ${blocked ? `<p class="sub" style="margin:0 0 8px">${esc(reason || 'セーブデータが壊れているようです。')}<br>壊れたデータは消さずにこの端末へ退避してあります（上書きしません）。</p>` : '<p class="sub" style="margin:0 0 8px">このブラウザに自動で残している直近のバックアップです。戻すと<b>いまのデータは置き換わります</b>（直前の状態は退避されます）。</p>'}
    ${rows ? `<div class="rec-list">${rows}</div>` : '<p class="empty">自動バックアップはまだありません。</p>'}
    <div class="act" style="gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="btn" data-act="openImportModal">ファイル／コードから読み込む</button>
      ${blocked ? `<button class="btn ${G._recNewArm ? 'danger' : ''}" data-act="recoverNew">${G._recNewArm ? 'もう一度押すと新しく始めます' : '新しく始める'}</button>` : '<button class="btn" data-act="closeTowerModal">閉じる</button>'}
    </div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}
function recoveryRestore(idx) {
  const r = (G._recList || [])[idx]; if (!r) return;
  if (G._recArm !== idx && !G._saveBlocked) { G._recArm = idx; renderRecoveryModal(); return; }
  let prev = null; try { prev = localStorage.getItem(SAVE_KEY); if (prev && !G._saveBlocked) localStorage.setItem(SAVE_KEY + '_bak_restore', prev); localStorage.setItem(SAVE_KEY, r.raw); } catch (e) { setSaveWarn(e); }
  if (load()) {
    G._saveBlocked = false; G._recArm = null; G.tutorial = { done: true };
    try { localStorage.setItem(TUT_SAVE_KEY, '1'); } catch (e) {}
    if (typeof tutHide === 'function') tutHide();
    save(); renderSaveWarn(); closeModal(); renderAll(); toast('バックアップから復元しました');
  } else {
    try { if (prev !== null) localStorage.setItem(SAVE_KEY, prev); } catch (e) {}
    toast('このバックアップは読み込めませんでした');
  }
}
function recoveryNew() {
  if (!G._recNewArm) { G._recNewArm = true; renderRecoveryModal(); return; }
  G._recNewArm = false; G._saveBlocked = false; G._recArm = null;
  save(); renderSaveWarn(); closeModal();
  if (G.tutorial && !G.tutorial.done && G.tutorial.step === 0) openCharSelectModal(G._charSelectPick || null);
}
