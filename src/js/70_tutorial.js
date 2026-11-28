/* ================= tutorial ================= */
const TUT_SAVE_KEY = 'rogue_tut_done_v1';

// スキルツリーがルート式になったとき、旧セーブで戻したSPがあれば一度だけ知らせる
function routeNoticeShow() {
  const p = G.p; if (!p || !p.routeNotice || G.headless) return;
  const n = p.routeNotice; p.routeNotice = 0;
  setTimeout(() => toast(`スキルツリーがルート式になりました。上限を超えた分のSP ${n} を返却しました。振り直してください`), 1500);
}
function tutInit() {
  // 初回のみ（localStorageに完了フラグがなければ）
  try {
    if (localStorage.getItem(TUT_SAVE_KEY)) {
      tutHide();
      if (G.p && G.p.v9ResetNoticePending && !G.headless) openV9ResetNoticeModal();
      routeNoticeShow();
      return;
    }
  } catch (e) {}
  // 既存セーブで進行済みならチュートリアル済み扱いにして非表示にする
  if (G.p && (G.p.lv > 1 || (G.p.stats && G.p.stats.runs > 0))) {
    tutDone();
    if (G.p.v9ResetNoticePending && !G.headless) openV9ResetNoticeModal();
    routeNoticeShow();
    return;
  }
  G.tutorial = { step: 0, done: false };
  // 新規ゲームの最初にキャラクター選択モーダルを出す（選ぶまで閉じられない）
  openCharSelectModal(null);
}

// 最初のルルとの会話（自動テストでは飛ばす）。終わったら cb を呼ぶ
function tutIntro(cb) {
  if (storySkip() || !STORY.TUT) { cb(); return; }
  playStory('TUT', { onEnd: cb });
}
function tutStartAfterCharSelect() {
  G.tutorial = { step: 0, done: false };
  requestAnimationFrame(() => requestAnimationFrame(() => tutIntro(() => tutStep(0))));
}

function tutDone() {
  G.tutorial = { step: 6, done: true };
  try { localStorage.setItem(TUT_SAVE_KEY, '1'); } catch (e) {}
  if (G._charSelectOpen) { G._charSelectOpen = false; closeModal(); }
  tutHide();
  setTimeout(() => { try { loginBonusPrompt(); } catch (e) {} }, 1500);
}

// step 0: ダンジョンタブを押す
// step 1: ダンジョンA novice の「挑戦」ボタンを押す
// step 2: 戦闘中 (HP監視中、オーバーレイなし)
// step 3: HP<50% → 撤退ボタンだけ押せる
// step 4: ステータス画面で生命枠のヒールにSPを振る
// step 5: スキルセットでヒールを装備する
// step 6: 完了メッセージ
// place: 'above' = 吹き出しをターゲットの上（矢印↓）, 'below' = 下（矢印↑）, 'center' = 中央
const TUT_MSGS = {
  0:  { ex: 'normal',   body: 'まずは、下の <b>ダンジョン</b> タブを押してください！ 冒険のはじまりです！', place: 'above' },
  1:  { ex: 'normal',   body: '最初は <b>苔むす地下墓地（初級）</b> がおすすめです。「挑戦」を押して、潜ってみましょう！', place: 'below' },
  2:  { ex: 'normal',   body: '戦闘は自動で進みますよ。HPが減りすぎないか、私も見てますね！', place: 'below' },
  3:  { ex: 'surprise', body: 'あっ、HPが半分を切りました！ 無理は禁物です。<b>撤退</b> を押して、街へ帰りましょう！', place: 'above' },
  4:  { ex: 'joy',      body: 'ナイス判断です！ 次は下の <b>ステータス</b> タブで、スキルを覚えましょう。', place: 'above' },
  41: { ex: 'normal',   body: '<b>生命枠</b> の「+1 SP」を3回押して、<b>ヒール</b> を覚えましょう！', place: 'below' },
  5:  { ex: 'normal',   body: '覚えた <b>ヒール</b> のS1〜S3を押して、スロットにセットしましょう！', place: 'below' },
  6:  { ex: 'joy',      body: 'これで準備OKです！ スキルは戦闘で自動発動しますよ。困ったら <b>ヘルプ</b> を見てくださいね。いってらっしゃい！', place: 'above' },
};

function getTutMsg(step) {
  const tgt = getCharTutorialTarget(G.p && G.p.skin);
  if (step === 41) {
    return {
      ex: 'normal',
      body: `<b>${esc(tgt.treeName)}</b> の「+1 SP」を3回押して、<b>${esc(tgt.skillName)}</b> を覚えましょう！<br><span class="sub">${esc(tgt.hint)}</span>`,
      place: 'below'
    };
  }
  if (step === 5) {
    return {
      ex: 'normal',
      body: `覚えた <b>${esc(tgt.skillName)}</b> のS1〜S3を押して、スロットにセットしましょう！`,
      place: 'below'
    };
  }
  return TUT_MSGS[step] || null;
}

function tutAllowClick(step, b) {
  const act = b.dataset.act, v = b.dataset.v, tree = b.dataset.tree, id = b.dataset.id;
  if (act === 'restoreIdbSave' || act === 'dismissIdbRestore' || act === 'closeV9Notice') return true;
  if (act === 'openRecovery' || act === 'recoverRestore' || act === 'recoverNew' || act === 'reloadPage' || act === 'closeTowerModal' || act === 'openImportModal' || act === 'validateImportInput' || act === 'confirmImportSave' || act === 'exportSaveFile') return true;   // セーブ復旧系は常に許可
  if (G._charSelectOpen) return act === 'selectStartChar' || act === 'confirmStartChar';
  const tgt = getCharTutorialTarget(G.p && G.p.skin);
  switch (step) {
    case 0:  return act === 'nav' && v === 'dungeon';
    case 1:  return act === 'go' && b.dataset.d === 'A';
    case 3:  return act === 'retreat';
    case 4:  return act === 'nav' && v === 'status';
    case 41: return (act === 'spAlloc' && tree === tgt.treeId) || (act === 'statusTab' && b.dataset.tab === 'skill');
    case 5:  return (act === 'equipSkill' && id === tgt.skillId) || (act === 'nav' && v === 'status') || (act === 'statusTab' && b.dataset.tab === 'skill');
    case 6:  return act === 'nav' && v === 'help';
    default: return false;
  }
}

function tutStep(step) {
  if (!G.tutorial || G.tutorial.done) return;
  G.tutorial.step = step;
  if (step === 41 || step === 5) {
    G.statusTab = 'skill';
    if (G.view === 'status') renderStatus();
  }
  if (step === 5) {
    // ヒール装備ボタンはステータス画面にある → 必ず表示させてからrender
    if (G.view !== 'status') { G.view = 'status'; renderAll(); }
    setTimeout(() => renderTutorial(), 200);
    return;
  }
  if (step === 6) {
    renderTutorial();
    setTimeout(tutDone, 3200);
    return;
  }
  renderTutorial();
}

function tutGetTarget(step) {
  const tgt = getCharTutorialTarget(G.p && G.p.skin);
  switch (step) {
    case 0:  return document.getElementById('nav-dungeon');
    case 1:  return document.querySelector('[data-act="go"][data-d="A"]');
    case 3:  return document.querySelector('[data-act="retreat"]');
    case 4:  return document.getElementById('nav-status');
    case 41: return document.querySelector(`[data-act="spAlloc"][data-tree="${tgt.treeId}"][data-amount="1"]`);
    case 5:  return document.querySelector(`[data-act="equipSkill"][data-id="${tgt.skillId}"]:not([disabled])`);
    case 6:  return document.getElementById('nav-help');
    default: return null;
  }
}

function tutRectOf(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function tutRenderHole(el) {
  const hole = document.getElementById('tut-hole');
  if (!el) { hole.style.display = 'none'; return; }
  const r = el.getBoundingClientRect();
  const pad = 6;
  hole.style.display = 'block';
  hole.style.top    = (r.top - pad) + 'px';
  hole.style.left   = (r.left - pad) + 'px';
  hole.style.width  = (r.width + pad * 2) + 'px';
  hole.style.height = (r.height + pad * 2) + 'px';
}

function tutRenderBubble(el, msg) {
  const bubble = document.getElementById('tut-bubble');
  const ex = (msg.ex && NPC_PNG.guide[msg.ex]) ? msg.ex : 'normal';
  bubble.className = 'tut-bubble lulu';
  bubble.innerHTML = `<img class="tut-lulu-img" src="${NPC_PNG.guide[ex]}" alt="" draggable="false"><div class="tut-say"><span class="tut-name">ルル</span><div class="tut-text">${msg.body}</div></div>`;
  // 対象が画面の下半分にあれば上に、上半分なら下（ナビバーの上）に会話枠を出して、対象を隠さない
  let top = true;
  if (el) { const r = el.getBoundingClientRect(); top = (r.top + r.height / 2) > window.innerHeight * 0.5; }
  bubble.style.left = ''; bubble.style.width = ''; bubble.style.transform = '';
  bubble.classList.toggle('at-top', top); bubble.classList.toggle('at-bottom', !top);
  bubble.style.display = 'flex';
}

function tutSetTarget(el, blockAll) {
  // 前のターゲットのクラスを外す
  document.querySelectorAll('.tut-target').forEach(e => e.classList.remove('tut-target'));
  if (el && blockAll) el.classList.add('tut-target');
}

function renderTutorial() {
  const tut = G.tutorial;
  if (!tut || tut.done) { tutHide(); return; }
  const overlay = document.getElementById('tut-overlay');
  const step = tut.step;
  if ((step === 41 || step === 5) && G.view === 'status' && G.statusTab !== 'skill') {
    G.statusTab = 'skill';
    renderStatus();
  }

  // step 2: 戦闘中は何も表示しない（HP監視だけ）。キャラ選択モーダル表示中もオーバーレイは出さない
  if (G._charSelectOpen) { tutHide(); return; }
  if (step === 2) {   // 戦闘中: ルルのひとことだけ（操作は妨げない）
    if (G._tutBanner2) return;   // 表示中は再描画で消さない
    if (tut.bannerShown) { tutHide(); return; }   // 1回だけ
    const m2 = getTutMsg(2); if (!m2) { tutHide(); return; }
    tut.bannerShown = true;
    G._tutBanner2 = true;
    overlay.style.display = 'block'; document.getElementById('tut-hole').style.display = 'none'; tutRenderBubble(null, m2);
    setTimeout(() => { G._tutBanner2 = false; if (G.tutorial && G.tutorial.step === 2) tutHide(); }, 4500);
    return;
  }

  const msg = getTutMsg(step);
  if (!msg) { tutHide(); return; }

  const el = tutGetTarget(step);

  // ターゲットが見つからない場合は少し待って再試行（DOMがまだ描画されていない可能性）
  if (!el) {
    setTimeout(() => renderTutorial(), 150);
    return;
  }

  // ナビバー要素（fixed配置）はスクロール不要 → 直接描画
  const rect = el.getBoundingClientRect();
  // 非表示タブ内などでサイズ0のときは左上(0,0)に穴を開けない
  if (rect.width === 0 && rect.height === 0) { tutHide(); return; }
  const isFixed = getComputedStyle(el.closest('[style*="position:fixed"]') || el).position === 'fixed'
    || el.closest('nav, #nav-bar') !== null;
  if (!isFixed) {
    // スクロールが必要な要素（ステータス画面内のボタンなど）
    const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (!inView) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
      setTimeout(() => renderTutorial(), 80);
      return;
    }
  }

  overlay.style.display = 'block';
  tutSetTarget(el, true);
  tutRenderHole(el);
  tutRenderBubble(el, msg);
}

function tutHide() {
  const overlay = document.getElementById('tut-overlay');
  overlay.classList.remove('active');
  overlay.style.display = 'none';
  document.getElementById('tut-hole').style.display = 'none';
  document.getElementById('tut-bubble').style.display = 'none';
  document.querySelectorAll('.tut-target').forEach(e => e.classList.remove('tut-target'));
}

