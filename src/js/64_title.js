/* ================= タイトル画面 =================
   起動のたびに1回だけ表示。タップ/Enterで閉じる（その瞬間にサウンドも解禁）。
   自動テスト(navigator.webdriver)・BOTでは出さない。テストで見たい時は ?title=1 を付ける。
   表示中は戦闘ループを止める（G._titleUp）。 */
function titleSkip() {
  if (G.headless) return true;
  const force = /[?&]title=1\b/.test(location.search);
  if (force) return false;
  try { if (navigator.webdriver) return true; } catch (e) {}
  return /[?&]notitle\b/.test(location.search);
}
function showTitle() {
  if (titleSkip() || document.getElementById('title-screen')) return;
  const p = G.p;
  const hasSave = !!(p && (p.lv > 1 || (p.stats && p.stats.runs > 0) || (G.tutorial && G.tutorial.done)));
  const heroes = ['ruby', 'stella', 'silia', 'chloe'].map(id => CHAR_SKINS.find(s => s.id === id)).filter(Boolean);
  const bg = (typeof SCENE_IMG !== 'undefined' && SCENE_IMG.I) ? `url('${SCENE_IMG.I}')` : 'none';
  const el = document.createElement('div');
  el.id = 'title-screen'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'タイトル');
  el.innerHTML = `
    <div class="ttl-bg" style="background-image:${bg}"></div>
    <div class="ttl-shade"></div>
    <div class="ttl-motes" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--x:${(i * 73) % 100}%;--d:${5 + (i * 7) % 6}s;--w:${(i * 37) % 7}s"></i>`).join('')}</div>
    <div class="ttl-inner">
      <svg class="ttl-bell" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
        <defs><linearGradient id="ttlg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".6" stop-color="#e9b43c"/><stop offset="1" stop-color="#a8721a"/></linearGradient></defs>
        <path d="M32 6c-2 0-3 1-3 3v2C21 13 17 20 17 29v8c0 3-2 5-5 8h40c-3-3-5-5-5-8v-8c0-9-4-16-12-18V9c0-2-1-3-3-3z" fill="url(#ttlg)" stroke="#5a3a0a" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M26 49a6 6 0 0 0 12 0z" fill="#c98e26" stroke="#5a3a0a" stroke-width="2.5" stroke-linejoin="round"/>
      </svg>
      <div class="ttl-logo"><span class="ttl-l1">鐘鳴りの</span><span class="ttl-l2">ダンジョン</span></div>
      <div class="ttl-sub">BELL-TOLLING DUNGEON</div>
      <div class="ttl-heroes" aria-hidden="true">${heroes.map((s, i) => `<img src="${s.img}" alt="" draggable="false" style="--i:${i}">`).join('')}</div>
      <button class="ttl-start" id="ttl-start" type="button">${hasSave ? 'つづきから' : 'はじめる'}</button>
      <div class="ttl-hint">${hasSave ? `Lv${p.lv} ・ タップでもはじめられます` : 'タップでもはじめられます'}</div>
    </div>
    <div class="ttl-ver">ver ${typeof APP_VERSION === 'string' ? APP_VERSION.replace(/^rogue-/, '') : ''}</div>`;
  document.body.appendChild(el);
  G._titleUp = true;
  const close = () => {
    if (!G._titleUp) return;
    G._titleUp = false;
    Sound.play('bell');
    el.classList.add('out');
    setTimeout(() => { el.remove(); try { renderAll(); } catch (e) {} }, isReducedMotion() ? 0 : 450);
  };
  el.addEventListener('click', close);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } });
  const btn = el.querySelector('#ttl-start'); if (btn) btn.focus();
}
