/* ================= 物語（会話シーン） =================
   各ダンジョンの「上級」を初めてクリアすると、リザルトを閉じた後に会話シーンが始まる。
   タップ/Enter/スペースで次へ、スキップボタンまたはEscで終了。見終えたシーンはデータ画面の「物語を見返す」で何度でも見られる。
   自動テスト(navigator.webdriver)では自動再生しない（?story=1 で有効）。表示中は戦闘ループを止める（G._storyUp）。 */
function storySkip() {
  if (G.headless) return true;
  if (/[?&]story=1\b/.test(location.search)) return false;
  try { if (navigator.webdriver) return true; } catch (e) {}
  return false;
}
function storySeen(p, id) { return !!(p && p.story && p.story.seen && p.story.seen[id]); }
// リザルトを閉じた後に再生する場面を、初回クリア時に予約する
function queueStory(p, dId, dfId, firstClear) {
  if (!firstClear || dfId !== 'high' || !STORY[dId] || storySeen(p, dId) || storySkip()) return;
  (G._storyQueue = G._storyQueue || []).push(dId);
}
function storyLineText(line, heroId) {
  const t = line.t;
  return typeof t === 'string' ? t : (t[heroId] || t.ruby || '');
}
const STORY_NAMES = { guide: 'ルル', inn: 'ミレイ', shop: 'トト', smith: 'ガンド', bank: 'ノア' };
function playStory(id, opts) {
  const sc = STORY[id]; if (!sc || document.querySelector('#story-screen:not(.out)')) return;
  const p = G.p, heroId = (p && p.skin && CHAR_META_OK(p.skin)) ? p.skin : 'ruby';
  const heroMeta = CHAR_CLASS_META[heroId] || { name: '主人公' };
  const heroSkin = CHAR_SKINS.find(s => s.id === heroId);
  const el = document.createElement('div');
  el.id = 'story-screen'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', '物語：' + sc.title);
  el.innerHTML = `<div class="stv-bg" style="${sc.bg === 'none' ? 'background:radial-gradient(ellipse at 50% 40%,#1c2a3c,#07080d 75%)' : 'background-image:' + sceneUri(sc.bg || id)}"></div><div class="stv-shade"></div>
    <div class="stv-title">${esc(sc.title)}</div>
    <button class="stv-skip" type="button" id="stv-skip">スキップ ▶▶</button>
    <div class="stv-chara" id="stv-chara" aria-hidden="true"></div>
    <div class="stv-box" id="stv-box"><div class="stv-name" id="stv-name"></div><div class="stv-text" id="stv-text" aria-live="polite"></div><div class="stv-next" id="stv-next" aria-hidden="true">▼</div></div>`;
  const prevFocus = document.activeElement;
  G._storyUp = true;
  document.body.appendChild(el);
  let i = -1, typing = null, full = '', done = false;
  const instant = () => isReducedMotion() || !isFxEnabled() || G.headless;
  const $s = s => el.querySelector(s);
  function show(line) {
    const sp = line.sp, name = sp === 'hero' ? heroMeta.name : (sp === 'narr' ? '' : STORY_NAMES[sp] || '');
    $s('#stv-name').textContent = name; $s('#stv-name').style.visibility = name ? 'visible' : 'hidden';
    el.dataset.sp = sp;
    let img = '';
    if (sp === 'hero' && heroSkin) img = `<img class="stv-hero" src="${heroSkin.img}" alt="" draggable="false">`;
    else if (NPC_PNG[sp]) img = `<img class="stv-npc" src="${NPC_PNG[sp][line.ex && NPC_PNG[sp][line.ex] ? line.ex : 'normal']}" alt="" draggable="false">`;
    $s('#stv-chara').innerHTML = img; $s('#stv-chara').className = 'stv-chara ' + (sp === 'hero' ? 'left' : 'right');
    full = storyLineText(line, heroId);
    $s('#stv-box').classList.toggle('narr', sp === 'narr');
    $s('#stv-next').style.visibility = 'hidden';
    const tx = $s('#stv-text'); tx.textContent = '';
    if (instant()) { tx.textContent = full; $s('#stv-next').style.visibility = 'visible'; return; }
    let n = 0; typing = setInterval(() => { n++; tx.textContent = full.slice(0, n); if (n >= full.length) { clearInterval(typing); typing = null; $s('#stv-next').style.visibility = 'visible'; } }, 32);
  }
  function finish() {
    if (done) return; done = true;
    if (typing) { clearInterval(typing); typing = null; }
    document.removeEventListener('keydown', onKey, true);
    if (p) { p.story = p.story || { seen: {} }; p.story.seen[id] = true; try { save(); } catch (e) {} }
    G._storyUp = false;
    el.classList.add('out'); setTimeout(() => { try { el.remove(); } catch (e) {} }, 300);
    try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) {}
    if (opts && opts.onEnd) opts.onEnd();
    if (G._storyQueue && G._storyQueue.length) { const nx = G._storyQueue.shift(); setTimeout(() => playStory(nx), 350); }
    else if (typeof renderAll === 'function') renderAll();
  }
  function next() {
    if (done) return;
    if (typing) { clearInterval(typing); typing = null; $s('#stv-text').textContent = full; $s('#stv-next').style.visibility = 'visible'; return; }
    i++; if (i >= sc.lines.length) { finish(); return; }
    show(sc.lines[i]);
  }
  const onKey = e => {
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); finish(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); next(); }
  };
  document.addEventListener('keydown', onKey, true);
  el.addEventListener('click', e => { e.stopPropagation(); if (e.target.closest('#stv-skip')) finish(); else next(); });
  next();
  $s('#stv-skip').focus({ preventScroll: true });
}
function CHAR_META_OK(id) { return !!CHAR_CLASS_META[id]; }
// データ画面の「物語を見返す」
function openStoryList() {
  const p = G.p;
  const rows = DUNGEONS.filter(d => STORY[d.id]).map(d => {
    const ok = storySeen(p, d.id) || (p.cleared && p.cleared[d.id] && p.cleared[d.id].high);
    return `<button class="btn small" style="display:block;width:100%;text-align:left;margin:4px 0" data-act="storyPlay" data-id="${d.id}" ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${d.id}　${ok ? esc(STORY[d.id].title) : '？？？'}<small style="opacity:.7">　${esc(d.name)}</small></button>`;
  }).join('');
  $('#m-sheet').innerHTML = `<h2 id="m-title">物語を見返す</h2><p class="sub" style="margin:0 0 6px">各ダンジョンの上級をクリアすると解放されます。</p><div style="max-height:56vh;overflow:auto">${rows}</div><div class="act"><button class="btn primary" data-act="closeTowerModal">閉じる</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}
