/* ================= tutorial ================= */
const TUT_SAVE_KEY = 'rogue_tut_done_v1';

function tutInit() {
  // 初回のみ（localStorageに完了フラグがなければ）
  try {
    if (localStorage.getItem(TUT_SAVE_KEY)) {
      tutHide();
      if (G.p && G.p.v9ResetNoticePending && !G.headless) openV9ResetNoticeModal();
      return;
    }
  } catch (e) {}
  // 既存セーブで進行済みならチュートリアル済み扱いにして非表示にする
  if (G.p && (G.p.lv > 1 || (G.p.stats && G.p.stats.runs > 0))) {
    tutDone();
    if (G.p.v9ResetNoticePending && !G.headless) openV9ResetNoticeModal();
    return;
  }
  G.tutorial = { step: 0, done: false };
  // 新規ゲームの最初にキャラクター選択モーダルを出す（選ぶまで閉じられない）
  openCharSelectModal(null);
}

function tutStartAfterCharSelect() {
  G.tutorial = { step: 0, done: false };
  requestAnimationFrame(() => requestAnimationFrame(() => tutStep(0)));
}

function tutDone() {
  G.tutorial = { step: 6, done: true };
  try { localStorage.setItem(TUT_SAVE_KEY, '1'); } catch (e) {}
  if (G._charSelectOpen) { G._charSelectOpen = false; closeModal(); }
  tutHide();
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
  0:  { title: 'はじめよう！', body: '下の <b>ダンジョン</b> タブを押してみよう。', place: 'above' },
  1:  { title: 'ダンジョンに挑む', body: '<b>苔むす地下墓地 (ノービス)</b> の「挑戦」ボタンを押そう。', place: 'below' },
  3:  { title: '撤退しよう！', body: 'HPが半分を切った！<br>今すぐ <b>撤退</b> ボタンを押して街に帰ろう。', place: 'above' },
  4:  { title: 'ステータスを開こう', body: '下の <b>ステータス</b> タブを押してみよう。', place: 'above' },
  41: { title: 'スキルを取得しよう', body: '<b>生命枠</b> の「+1 SP」ボタンを3回押して<b>ヒール</b>を習得しよう。', place: 'below' },
  5:  { title: 'スキルを装備しよう', body: '習得した <b>ヒール</b> のS1〜S3ボタンを押してスロットにセットしよう。', place: 'below' },
  6:  { title: 'チュートリアル完了！🎉', body: '装備したスキルは戦闘で自動発動されるよ。<br>詳しくは <b>ヘルプ</b> を見てね！', place: 'above' },
};

function getTutMsg(step) {
  const tgt = getCharTutorialTarget(G.p && G.p.skin);
  if (step === 41) {
    return {
      title: 'スキルを取得しよう',
      body: `<b>${esc(tgt.treeName)}</b> の「+1 SP」ボタンを3回押して<b>${esc(tgt.skillName)}</b>を習得しよう。<br><span class="sub">${esc(tgt.hint)}</span>`,
      place: 'below'
    };
  }
  if (step === 5) {
    return {
      title: 'スキルを装備しよう',
      body: `習得した <b>${esc(tgt.skillName)}</b> のS1〜S3ボタンを押してスロットにセットしよう。`,
      place: 'below'
    };
  }
  return TUT_MSGS[step] || null;
}

function tutAllowClick(step, b) {
  const act = b.dataset.act, v = b.dataset.v, tree = b.dataset.tree, id = b.dataset.id;
  if (act === 'restoreIdbSave' || act === 'dismissIdbRestore' || act === 'closeV9Notice') return true;
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
  bubble.innerHTML = `<b>${msg.title}</b>${msg.body}`;
  // place: 'above' → 吹き出しはターゲットの上、矢印は下向き
  //        'below' → 吹き出しはターゲットの下、矢印は上向き
  const above = !msg.place || msg.place === 'above';
  bubble.className = 'tut-bubble ' + (above ? 'arrow-down' : 'arrow-up');
  const vw = window.innerWidth;
  if (el) {
    const r = el.getBoundingClientRect();
    const bw = Math.min(280, vw - 32);
    let left = r.left + r.width / 2 - bw / 2;
    left = Math.max(16, Math.min(left, vw - bw - 16));
    bubble.style.left = left + 'px';
    bubble.style.width = bw + 'px';
    if (above) {
      // 吹き出しをターゲットの上に配置（translateY(-100%) でtopから上へ）
      bubble.style.top = (r.top - 16) + 'px';
      bubble.style.transform = 'translateY(-100%)';
    } else {
      // 吹き出しをターゲットの下に配置
      bubble.style.top = (r.bottom + 16) + 'px';
      bubble.style.transform = '';
    }
  } else {
    // 中央配置
    bubble.style.top = '40%';
    bubble.style.left = '50%';
    bubble.style.transform = 'translate(-50%, -50%)';
    bubble.style.width = Math.min(280, vw - 32) + 'px';
  }
  bubble.style.display = 'block';
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
  if (step === 2 || G._charSelectOpen) { tutHide(); return; }

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

