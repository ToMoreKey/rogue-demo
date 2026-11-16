/* ================= render: HUD ================= */
function renderHUD() {
  const p = G.p, mh = maxHp(p), mm = maxMp(p), need = expNeed(p.lv);
  $('#h-lv').textContent = p.lv;
  $('#h-exp').textContent = p.lv >= LV_CAP ? 'MAX' : `${fmt(p.exp)} / ${fmt(need)}`;
  $('#h-expbar').style.width = (p.lv >= LV_CAP ? 100 : clamp(p.exp / need * 100, 0, 100)) + '%';
  $('#h-hp').textContent = `${fmt(p.hp)} / ${fmt(mh)}`;
  $('#h-hpbar').style.width = clamp(p.hp / mh * 100, 0, 100) + '%';
  $('#h-hpg').classList.toggle('low', p.hp / mh < 0.3);
  $('#h-mp').textContent = `${fmt(p.mp)} / ${fmt(mm)}`;
  $('#h-mpbar').style.width = clamp(p.mp / mm * 100, 0, 100) + '%';
  $('#h-gold').textContent = fmt(p.gold); $('#h-bank').textContent = fmt(p.bank); $('#h-sp').textContent = fmt(p.sp);
}

/* ================= render: town ================= */
function renderTown() {
  if (G.townView === 'plaza') {
    renderPlaza();
  } else {
    renderFacility(G.townView);
  }
}

function renderPlaza() {
  const p = G.p;
  const hpFull = p.hp >= maxHp(p);
  const hpNote = hpFull
    ? 'HPは満タンです。（ダンジョンから帰還すると全回復します）'
    : `HP ${fmt(p.hp)} / ${fmt(maxHp(p))}　全快まであと約${Math.ceil((maxHp(p) - p.hp) / 2)}秒`;

  const FACILITIES = [
    { v: 'inn',   icon: '🏨', name: '宿屋「満月亭」',       desc: 'アイテム購入・MP回復' },
    { v: 'shop',  icon: '💰', name: '売却専門ショップ',       desc: 'アイテム売却・自動売却設定' },
    { v: 'smith', icon: '🔨', name: '鍛冶屋「鉄の大地」',     desc: '武器・防具の強化' },
    { v: 'bank',  icon: '🏦', name: '福音銀行',               desc: 'ゴールドの預け入れ・引き出し' },
  ];

  $('#view-town').innerHTML = `
    <div class="panel">
      <div class="town-hero"><div><h2>福音の里　広場</h2><p class="sub" style="margin:0">ここにいる間、HPが1秒ごとに <b style="color:var(--fg)">+2</b> 回復します。</p></div></div>
      <p class="sub" style="margin:8px 0 0">${esc(hpNote)}</p>
    </div>
    <div class="panel">
      <h2 style="margin:0 0 12px">施設</h2>
      <div class="plaza-grid">
        ${FACILITIES.map(f => `
          <button class="plaza-btn" data-act="townEnter" data-v="${f.v}">
            <span class="plaza-icon">${f.icon}</span>
            <span class="plaza-name">${f.name}</span>
            <span class="plaza-desc">${f.desc}</span>
          </button>`).join('')}
      </div>
    </div>`;
}

function renderFacility(fac) {
  const p = G.p;
  let content = '';

  if (fac === 'inn') {
    content = `
      <h2>宿屋「満月亭」</h2>
      <p class="sub">MPを無料で全回復します。</p>
      <button class="btn primary" id="btn-inn" data-act="inn" ${p.mp >= maxMp(p) ? 'disabled' : ''}>泊まる（無料）</button>`;
  } else if (fac === 'shop') {
    const shopPills = RARITY.map((r, i) => {
      const n = p.bag.filter(it => it.rarity === i && !it.locked).length;
      return `<button class="pill r${i} ${G.shopSel[i] ? 'on' : ''}" aria-pressed="${G.shopSel[i]}" data-act="shopToggle" data-i="${i}">${r.name} ${n}個</button>`;
    }).join('');
    const t = p.bag.filter(it => !it.locked && G.shopSel[it.rarity]);
    const total = t.reduce((s, it) => s + sellValue(it), 0);
    const shopSum = t.length ? `売却対象 ${t.length}個　合計 ${fmt(total)}G` : '売却対象はありません（上のボタンで対象のレアリティを切り替えられます）';
    const autoLabels = ['OFF', 'コモン以下', 'レア以下', 'ユニーク以下', '全て'];
    const autoPills = autoLabels.map((lbl, i) => {
      const v = i - 1;
      return `<button class="pill ${G.autoSellRarity === v ? 'on' : ''}" aria-pressed="${G.autoSellRarity === v}" data-act="autoSellRaritySet" data-v="${v}">${lbl}</button>`;
    }).join('');
    const autoNote = G.autoSellRarity === -1
      ? '自動売却は無効です。'
      : `ダンジョンで入手した装備のうち、${autoLabels[G.autoSellRarity + 1]}を自動売却します。`;
    content = `
      <h2>売却専門ショップ</h2>
      <p class="sub">バッグの装備を一括で売却します。装備中とロック中の品は売りません。</p>
      <div class="pill-row" id="shop-pills">${shopPills}</div>
      <p class="sub" id="shop-sum" style="margin:0 0 10px">${shopSum}</p>
      <button class="btn primary" id="btn-sell" data-act="sell" ${!t.length ? 'disabled' : ''}>一括売却</button>
      <hr style="margin:14px 0;border:none;border-top:1px solid var(--bd)">
      <h3 style="font-size:14px;margin:0 0 4px">自動売却フィルター</h3>
      <p class="sub" style="margin:0 0 8px">ダンジョンで拾った装備を自動で売却します。ロック中の品は売りません。</p>
      <div class="pill-row" id="auto-sell-pills">${autoPills}</div>
      <p class="sub" id="auto-sell-note" style="margin:6px 0 0">${autoNote}</p>`;
  } else if (fac === 'smith') {
    const smithItems = [p.weapon, p.armor, ...p.bag].filter(Boolean);
    const smithHTML = smithItems.length ? smithItems.map(it => {
      const MAX_STAR = 5;
      const maxed = it.star >= MAX_STAR;
      const cost = smithCost(it);
      const stoneId = STONE_REQ[it.star];
      const stReq = stoneId ? STONES.find(s => s.id === stoneId) : null;
      const hasStone = stReq ? (p.stones[stReq.id] || 0) >= 1 : true;
      const canAfford = p.gold >= cost;
      const canUpgrade = !maxed && canAfford && hasStone;
      const loc = it === p.weapon ? '【装備中・武器】' : it === p.armor ? '【装備中・防具】' : '【バッグ】';
      return `<div class="smith-item">
        <div class="it-h"><span class="it-id">${itemIcon(it)}<span class="it-name">${esc(itemName(it))}</span></span><span class="it-star">${'★'.repeat(it.star)}${maxed ? '' : '☆'.repeat(MAX_STAR - it.star)}</span><span class="sub" style="margin-left:4px">${loc}</span></div>
        <div class="it-meta"><span class="rc r${it.rarity}">${RARITY[it.rarity].name}</span><span>${maxed ? '<b>MAX強化済み</b>' : `強化費用 <b>${fmt(cost)}G</b>${stReq ? ` ＋ <span style="color:${stReq.color}">${stReq.name} ×1</span>（所持:${p.stones[stReq.id] || 0}）` : ''}`}</span></div>
        ${maxed ? '' : `<button class="btn small${canUpgrade ? ' primary' : ''}" data-act="smithUpgrade" data-id="${it.id}" ${canUpgrade ? '' : 'disabled'}>★${it.star + 1}に強化</button>`}
      </div>`;
    }).join('') : '<p class="empty">強化できる装備がありません。</p>';
    content = `
      <h2>鍛冶屋「鉄の大地」</h2>
      <p class="sub">Gold と強化石を使って、武器・防具を強化します。★3→★4には初級の強化石、★4→★5には中級の強化石が必要です。</p>
      <div id="smith-items" class="stack" style="gap:8px;margin-top:8px">${smithHTML}</div>`;
  } else if (fac === 'bank') {
    content = `
      <h2>福音銀行</h2>
      <p class="sub">預けたお金は、探索に失敗しても半減されません。</p>
      <div class="bank-grid">
        <div class="span"><label for="bank-amt" class="sub" style="display:block;margin-bottom:4px">金額（G）</label><input id="bank-amt" type="number" inputmode="numeric" min="1" step="1" value="100"></div>
        <button class="btn" data-act="dep">預ける</button>
        <button class="btn" data-act="wd">引き出す</button>
        <button class="btn small" data-act="depAll">所持金を全額預ける</button>
        <button class="btn small" data-act="wdAll">預金を全額引き出す</button>
      </div>`;
  }

  const FAC_NAMES = { inn: '宿屋「満月亭」', shop: '売却専門ショップ', smith: '鍛冶屋「鉄の大地」', bank: '福音銀行' };
  $('#view-town').innerHTML = `
    <div class="facility-back-bar">
      <button class="btn small" data-act="townBack">← 広場に戻る</button>
      <span class="facility-title">${FAC_NAMES[fac] || ''}</span>
    </div>
    <div class="panel">${content}</div>`;
}

/* ================= render: dungeon select ================= */
function renderDungeonSelect() {
  const p0 = G.p;
  const learnable = SK_ORDER.filter(id => !p0.skills[id] && p0.sp >= SK[id].sp);
  const hint = learnable.length ? `<button class="panel hint hint-btn" data-act="goLearnSkill" style="width:100%;text-align:left;cursor:pointer"><b>✨ スキルを習得できます！</b><span class="sub" style="margin:0;display:block">SPが${p0.sp}あります。「${SK[learnable[0]].name}」などを覚えると戦闘がぐっと楽に。<b style="color:var(--accent)"> → スキル習得画面へ</b></span></button>` : '';
  $('#dg-list').innerHTML = hint + DUNGEONS.map(d => {
    const sel = diffOf(G.sel[d.id]);
    const lo = sel.stars[0][0], hi = sel.stars[sel.stars.length - 1][0];
    const rec = d.rec[DIFFS.indexOf(sel)];
    return `<article class="panel dcard" style="--a1:${d.a1}">
      <div class="dc-top"><div class="dc-spr">${enemyArt(d.mobs[0], d.id)}</div>
        <div><h2>ダンジョン${d.id}　${esc(d.name)}</h2><p class="sub" style="margin:0">${esc(d.blurb)}</p></div></div>
      <div class="seg" role="group" aria-label="難易度">${DIFFS.map(df => `<button class="seg-b ${df.id === sel.id ? 'on' : ''}" aria-pressed="${df.id === sel.id}" data-act="diff" data-d="${d.id}" data-df="${df.id}">${df.name}<small>${df.tag}・${df.floors}階</small></button>`).join('')}</div>
      <p class="dc-info">全 <b>${sel.floors}階層</b>　ドロップ <b>★${lo}〜★${hi}</b>　推奨 <b>Lv${rec}</b>〜<br>踏破報酬 <b>${fmt(Math.round(sel.clearGold * DUNGEON_REWARD[d.id]))}G</b> ＋ <b>SP${sel.clearSp}</b></p>
      <button class="btn primary wide" data-act="go" data-d="${d.id}">挑戦する</button></article>`;
  }).join('');
}

/* ================= render: battle ================= */
let lastEnemyShape = '';
function renderEnemy(fresh) {
  const run = G.run; if (G.headless || !run || !run.enemy) return;
  const en = run.enemy;
  if (fresh || lastEnemyShape !== en.id) {
    $('#spr-enemy').innerHTML = enemyArt(en, run.d.id);
    const eim = ENEMY_IMG[en.id]; $('#spr-enemy').style.width = eim ? `min(100%, ${Math.round(112 * eim.sz)}px)` : '';
    lastEnemyShape = en.id;
  }
  $('#f-enemy').classList.remove('dead');
}
function renderBattle() {
  const run = G.run, p = G.p;
  if (!run) return;
  $('#arena').style.setProperty('--a1', run.d.a1); $('#arena').style.setProperty('--a2', run.d.a2);
  $('#b-title').textContent = `${run.d.id} ${run.d.name}（${run.df.name}）　${Math.min(Math.max(run.floor, 1), run.floors)} / ${run.floors}F`;
  let pips = '';
  for (let i = 1; i <= run.floors; i++) pips += `<i class="pip ${i <= run.cleared ? 'done' : i === run.floor ? 'cur' : ''} ${i === run.floors ? 'boss' : ''}"></i>`;
  $('#b-pips').innerHTML = pips;
  $('#b-lv').textContent = p.lv;
  $('#b-php').style.width = clamp(p.hp / maxHp(p) * 100, 0, 100) + '%';
  $('#b-pg').classList.toggle('low', p.hp / maxHp(p) < 0.3);
  $('#b-phpn').textContent = `HP ${fmt(p.hp)} / ${fmt(maxHp(p))}`;
  const en = run.enemy;
  if (en) {
    $('#b-ename').textContent = en.name;
    $('#b-ehp').style.width = clamp(en.hp / en.maxHp * 100, 0, 100) + '%';
    $('#b-ehpn').textContent = `HP ${fmt(en.hp)} / ${fmt(en.maxHp)}`;
    $('#f-enemy').classList.toggle('dead', en.hp <= 0);
  } else {
    $('#b-ename').textContent = '探索中…'; $('#b-ehp').style.width = '0%'; $('#b-ehpn').textContent = '';
    $('#spr-enemy').innerHTML = ''; lastEnemyShape = '';
  }
  { const box = $('#spr-player'), k = ((G.p && G.p.skin) || 'ruby') + ':' + ((G.p && G.p.armor && G.p.armor.star) || 1);
    if (!box.innerHTML || box.dataset.k !== k) { box.innerHTML = getPlayerSVG(); box.dataset.k = k; } }
  $('#b-status').textContent = run.guard > 0 ? `鉄壁 あと${run.guard}回` : (run.queued ? `予約：${SK[run.queued].name}` : '');
  document.querySelectorAll('.speed .btn').forEach(b => b.classList.toggle('on', Number(b.dataset.v) === G.opts.speed));
  const as = $('#btn-autoskill'); as.textContent = `スキル自動：${G.opts.autoSkill ? 'ON' : 'OFF'}`; as.classList.toggle('on', G.opts.autoSkill);
  const bh = $('#btn-pot-hp'), bm = $('#btn-pot-mp');
  bh.textContent = `生命の薬 ×${p.potions.hp}`; bh.disabled = p.potions.hp <= 0;
  bm.textContent = `魔力の薬 ×${p.potions.mp}`; bm.disabled = p.potions.mp <= 0;
  const slots = p.equippedSkills || [null, null, null];
  const ctMap = run.skillCt || {};
  const key = slots.map(id => id + (id ? (ctMap[id] || 0) : 0) + (id && p.mp >= SK[id]?.mp ? 1 : 0)).join(',');
  if (key !== run.skKey) {
    run.skKey = key;
    const hasAny = slots.some(id => !!id);
    if (!hasAny) {
      $('#skill-row').innerHTML = '<span class="empty">ステータス画面のスキルセットで、スロットにスキルを装備しましょう。</span>';
    } else {
      $('#skill-row').innerHTML = slots.map((id, i) => {
        if (!id) return `<span class="skill" style="opacity:.35;cursor:default">─ S${i+1}<small>空き</small></span>`;
        const s = SK[id]; const ct = ctMap[id] || 0;
        const usable = ct === 0 && p.mp >= s.mp;
        return `<span class="skill ${usable ? '' : 'disabled'}" style="opacity:${usable ? 1 : 0.5};cursor:default">
          ${s.name}<small>${ct > 0 ? `CT:${ct}` : `MP:${s.mp}`}</small>
        </span>`;
      }).join('');
    }
  }
}
function addLog(msg, cls = 'l-hit') {
  if (G.headless) return;
  const el = $('#log'); if (!el) return;
  const d = document.createElement('div'); d.className = cls; d.textContent = msg; el.appendChild(d);
  while (el.childNodes.length > 80) el.removeChild(el.firstChild);
  el.scrollTop = el.scrollHeight;
}
function popDamage(who, text, cls) {
  if (G.headless) return;
  const f = $(who === 'player' ? '#f-player' : '#f-enemy'); if (!f) return;
  const s = document.createElement('span'); s.className = 'pop ' + cls; s.textContent = text; f.appendChild(s);
  setTimeout(() => s.remove(), 900);
  const pops = f.querySelectorAll('.pop'); if (pops.length > 6) pops[0].remove();
}
function playAttackMotion() {
  // ①立ち絵 → ②攻撃絵(skin.atk があれば) → ③立ち絵に戻る
  if (G.headless) return;
  const f = $('#f-player'), box = $('#spr-player'); if (!f || !box) return;
  const ms = clamp(Math.round(TICK_MS / G.opts.speed * 0.45), 90, 320);
  f.style.setProperty('--atk-ms', ms + 'ms');
  f.classList.remove('atk'); void f.offsetWidth; f.classList.add('atk');
  setTimeout(() => f.classList.remove('atk'), ms + 40);
  const skin = CHAR_SKINS.find(s => s.id === ((G.p && G.p.skin) || 'ruby'));
  const img = box.querySelector('img.sprite-img');
  const fr = skin && skinFrames(skin);
  if (fr && fr.atk && img) {
    img.src = fr.atk;
    clearTimeout(img._atkT);
    img._atkT = setTimeout(() => { img.src = fr.img; }, ms);
  }
}
function hitFlash(who) {
  if (G.headless) return;
  const f = $(who === 'player' ? '#f-player' : '#f-enemy'); if (!f) return;
  f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit');
}

/* ================= render: status ================= */
function itemCard(it, o = {}) {
  const pw = itemPower(it), isW = it.slot === 'weapon';
  const eff = isW ? weaponAtk(it) : pw;
  const better = o.compare && gearScore(it) > gearScore(G.p[it.slot]);
  return `<div class="item r${it.rarity}">
    <div class="it-h"><span class="it-id">${itemIcon(it)}<span class="it-name">${esc(itemName(it))}</span></span><span class="it-star">${'★'.repeat(it.star)}</span></div>
    <div class="it-stat">${isW ? '攻撃力' : '防御力'} +${pw}${it.prop && PROPS[it.prop].atkMult !== 1 ? `<span class="it-desc">（実効 +${eff}）</span>` : ''}</div>
    <div class="it-meta"><span class="rc">${RARITY[it.rarity].name}</span><span>品質 ${Math.round(it.roll * 100)}%</span>${o.sell === false ? '' : `<span>売値 ${fmt(sellValue(it))}G</span>`}${better ? '<span class="badge up">今の装備より強い</span>' : ''}</div>
    ${it.prop ? `<div><span class="badge ${it.prop}">${PROPS[it.prop].name}</span> <span class="it-desc">${PROPS[it.prop].desc}</span></div>` : ''}
    ${o.actions ? `<div class="it-act"><button class="btn small" data-act="equip" data-id="${it.id}">装備する</button><button class="btn small ${it.locked ? 'on' : ''}" data-act="lock" data-id="${it.id}" aria-pressed="${it.locked}">${it.locked ? 'ロック中' : 'ロック'}</button></div>` : ''}
  </div>`;
}
function renderSkillTrees(p) {
  const pts = p.skillPts || {};
  const passives = p.passiveSkills || {};

  const treeCard = (tree) => {
    const cur = pts[tree.id] || 0;
    const isUnlocked = tree.unlockWhen(p);
    const isFull = cur >= tree.maxSp;
    const resetKey = 'resetTree_' + tree.id;
    const resetArming = !!G[resetKey];

    if (!isUnlocked) {
      return `<div class="skill-tree locked-tree">
        <div class="st-header">
          <span class="st-icon">${tree.icon}</span>
          <div class="st-info">
            <span class="st-name">${tree.name}</span>
            <span class="st-lock-note">🔒 ${tree.desc}</span>
          </div>
        </div>
      </div>`;
    }

    // プログレスバー
    const pct = Math.min(100, Math.round(cur / tree.maxSp * 100));
    const spLeft = p.sp;

    // マイルストーン表示
    const msHtml = tree.milestones.map(ms => {
      const reached = cur >= ms.sp;
      const learned = ms.id ? !!p.skills[ms.id] : (ms.passive ? !!passives[ms.passive] : false);
      const cls = reached ? 'ms-reached' : 'ms-pending';
      const icon = ms.id ? (learned ? '✅' : '📖') : (learned ? '✅' : '💡');
      return `<div class="ms-item ${cls}">
        <span class="ms-sp">SP${ms.sp}</span>
        <span class="ms-icon">${icon}</span>
        <div class="ms-detail">
          <b class="ms-name">${ms.name}</b>
          <span class="ms-desc">${ms.desc}${ms.id && SK[ms.id] ? ` <small>MP${SK[ms.id].mp} CT${SK[ms.id].ct}T</small>` : ''}</span>
        </div>
      </div>`;
    }).join('');

    // SP割り振りボタン
    const canAdd1 = !isFull && spLeft >= 1;
    const canAdd5 = !isFull && spLeft >= 5 && cur + 5 <= tree.maxSp;
    const canAddAll = !isFull && spLeft >= 1;
    const remaining = Math.min(spLeft, tree.maxSp - cur);

    return `<div class="skill-tree" style="--tc:${tree.color}">
      <div class="st-header">
        <span class="st-icon">${tree.icon}</span>
        <div class="st-info">
          <span class="st-name">${tree.name}</span>
          <span class="st-desc">${tree.desc}</span>
        </div>
        <div class="st-pts">${cur}<span>/${tree.maxSp}</span></div>
      </div>
      <div class="st-bar-wrap">
        <div class="st-bar" style="width:${pct}%"></div>
      </div>
      <div class="ms-list">${msHtml}</div>
      <div class="st-actions">
        <button class="btn small" data-act="spAlloc" data-tree="${tree.id}" data-amount="1" ${canAdd1 ? '' : 'disabled'}>+1 SP</button>
        <button class="btn small" data-act="spAlloc" data-tree="${tree.id}" data-amount="5" ${canAdd5 ? '' : 'disabled'}>+5 SP</button>
        <button class="btn small" data-act="spAlloc" data-tree="${tree.id}" data-amount="${remaining}" ${canAddAll && remaining > 1 ? '' : 'disabled'}>全て割り振る (+${remaining})</button>
        ${cur > 0 ? `<button class="btn small danger" data-act="spAllocReset" data-tree="${tree.id}">${resetArming ? '⚠️ もう一度押すとリセット' : 'リセット'}</button>` : ''}
      </div>
    </div>`;
  };

  const baseTrees = SKILL_TREES.filter(t => ['sword','magic','life'].includes(t.id));
  const evoTrees = SKILL_TREES.filter(t => !['sword','magic','life'].includes(t.id));
  const unlockedEvo = evoTrees.filter(t => t.unlockWhen(p));
  const lockedEvo = evoTrees.filter(t => !t.unlockWhen(p));

  return `<div class="panel" id="skill-trees-panel">
    <h2>スキル枠</h2>
    <p class="sub">SPを枠に割り振るとスキルポイントに到達したとき自動でスキルを習得します。<br>残りSP: <b style="color:var(--accent)">${p.sp}</b></p>
    <div class="st-grid">${baseTrees.map(treeCard).join('')}</div>
    ${unlockedEvo.length ? `<div style="margin-top:12px"><p class="sub" style="margin:0 0 8px">── 進化枠（解放済み）──</p><div class="st-grid">${unlockedEvo.map(treeCard).join('')}</div></div>` : ''}
    ${lockedEvo.length ? `<div style="margin-top:12px"><p class="sub" style="margin:0 0 8px">── 進化枠（未解放）──</p><div class="st-grid locked-trees">${lockedEvo.map(treeCard).join('')}</div></div>` : ''}
  </div>`;
}

function renderSkillSlots(p) {
  const slots = p.equippedSkills || [null, null, null];
  const learnedIds = SK_ORDER.filter(id => p.skills[id]);

  // スロット表示
  const slotHtml = slots.map((id, i) => {
    if (!id) return `<div class="sk-slot">
      <div class="sk-slot-num">スロット${i + 1}</div>
      <div class="sk-slot-empty">空き</div>
    </div>`;
    const s = SK[id];
    return `<div class="sk-slot filled">
      <div class="sk-slot-num">スロット${i + 1}</div>
      <div class="sk-slot-name">${s.name}</div>
      <div class="sk-slot-mp">MP ${s.mp}</div>
      <div class="sk-slot-ct">CT ${s.ct}T</div>
      <button class="btn small" style="font-size:10px;padding:2px 6px;margin-top:4px" data-act="unequipSkill" data-slot="${i}">外す</button>
    </div>`;
  }).join('');

  // 習得済みスキル一覧
  const listHtml = learnedIds.length === 0
    ? '<p class="empty">スキルをまだ習得していません。スキル枠にSPを割り振りましょう。</p>'
    : learnedIds.map(id => {
      const s = SK[id];
      const eqSlot = slots.indexOf(id);
      const isEquipped = eqSlot >= 0;
      const equipBtns = [0, 1, 2].map(i =>
        `<button class="btn small" style="font-size:10px;padding:2px 8px" data-act="equipSkill" data-id="${id}" data-slot="${i}" ${slots[i] === id ? 'disabled' : ''}>${isEquipped && eqSlot === i ? '装備中' : `S${i + 1}`}</button>`
      ).join('');
      return `<div class="sk-list-item ${isEquipped ? 'equipped' : ''}">
        <div style="flex:1;min-width:0">
          <div class="sk-list-name">${s.name}${isEquipped ? ` <span style="font-size:10px;color:var(--accent)">▶ S${eqSlot + 1}</span>` : ''}</div>
          <div class="sk-list-meta"><span class="mp">MP ${s.mp}</span><span class="ct">CT ${s.ct}T</span><span>${s.desc}</span></div>
        </div>
        <div class="sk-equip-btns">${equipBtns}</div>
      </div>`;
    }).join('');

  return `<div class="panel skill-slots-panel">
    <h2>スキルセット</h2>
    <p class="sub">戦闘中は装備したスキルが自動発動します。クールタイム（CT）経過後に再発動します。</p>
    <div class="slot-grid">${slotHtml}</div>
    <h3 style="font-size:13px;color:var(--muted);margin:8px 0 6px">習得済みスキル</h3>
    <div class="sk-list">${listHtml}</div>
  </div>`;
}

function renderStatus() {
  const p = G.p;
  const pSkin = CHAR_SKINS.find(x => x.id === (p.skin || 'ruby')) || CHAR_SKINS[0];
  const pTier = skinTier(pSkin), pKey = pSkin.id + ':' + pTier;
  let tierChanged = false;
  if (G._lastLook && G._lastLook.startsWith(pSkin.id + ':') && G._lastLook !== pKey) tierChanged = true;
  G._lastLook = pKey;
  const bag = [...p.bag].sort((a, b) => b.rarity - a.rarity || b.star - a.star || itemPower(b) - itemPower(a));
  $('#view-status').innerHTML = `
    <div class="panel"><h2>勇者</h2>
      <div class="portrait${tierChanged ? ' changed' : ''}" id="st-portrait">
        <div class="pt-img">${skinArt(pSkin, 'width:96px;height:96px')}</div>
        <div class="pt-info">
          <div class="pt-name">${esc(pSkin.name)} <span class="sub">${esc(pSkin.job)}</span></div>
          <div class="pt-tier">${pTier ? '<span class="pt-star">' + '★'.repeat(pTier) + '</span> ' : ''}${esc(tierName(pSkin, pTier))}</div>
          <div class="pt-hint">${pTier ? '防具の見た目が反映されています' : '防具★3以上で見た目が変わります'}</div>
          ${tierChanged ? '<div class="pt-new">見た目が変わった！</div>' : ''}
        </div>
      </div>
      <dl class="kv">
        <dt>レベル</dt><dd>${p.lv}</dd>
        <dt>攻撃力</dt><dd>${playerAtk(p)}（基本 ${baseAtk(p)} ＋ 武器 ${weaponAtk(p.weapon)}）</dd>
        <dt>防御力</dt><dd>${playerDef(p)}（基本 ${baseDef(p)} ＋ 防具 ${p.armor ? itemPower(p.armor) : 0}）</dd>
        <dt>最大HP / MP</dt><dd>${maxHp(p)} / ${maxMp(p)}</dd>
        <dt>スキルポイント</dt><dd>${p.sp}</dd>
        <dt>探索 / 踏破 / 撃破</dt><dd>${p.stats.runs} / ${p.stats.clears} / ${p.stats.kills}</dd>
      </dl></div>
    <div class="panel"><h2>装備</h2>
      <div class="items">
        <div><p class="slot-t">手（武器）</p>${p.weapon ? itemCard(p.weapon) : '<p class="empty">装備なし</p>'}</div>
        <div><p class="slot-t">体（防具）</p>${p.armor ? itemCard(p.armor) : '<p class="empty">装備なし</p>'}</div>
      </div>
      <div class="row" style="margin-top:10px">
        <button class="btn small" data-act="autoEquipNow">おまかせ装備</button>
        <button class="btn small ${G.opts.autoEquip ? 'on' : ''}" data-act="autoEquipToggle" aria-pressed="${G.opts.autoEquip}">拾った装備を自動で装備：${G.opts.autoEquip ? 'ON' : 'OFF'}</button>
      </div></div>
    <div class="panel"><h2>バッグ <span class="sub" style="font-size:13px">${p.bag.length} / ${BAG_CAP}</span></h2>
      <p class="sub" style="margin:0 0 10px">各アイテムの「ロック」ボタンを押すと売却・自動売却から除外できます。</p>
      ${bag.length ? `<div class="items">${bag.map(it => itemCard(it, { actions: true, compare: true })).join('')}</div>` : '<p class="empty">バッグは空です。ダンジョンで装備を入手しましょう。</p>'}</div>
    ${renderSkillSlots(p)}
    ${renderSkillTrees(p)}
    <div class="panel"><h2>薬</h2><p class="sub">ダンジョンの戦闘中にも使えます（探索画面のボタン）。</p>
      <div class="row">
        <button class="btn small" data-act="potion" data-k="hp" ${p.potions.hp > 0 ? '' : 'disabled'}>生命の薬 ×${p.potions.hp}（HP30%）</button>
        <button class="btn small" data-act="potion" data-k="mp" ${p.potions.mp > 0 ? '' : 'disabled'}>魔力の薬 ×${p.potions.mp}（MP50%）</button>
      </div></div>
    <div class="panel"><h2>強化石</h2><p class="sub">ダンジョンで8%の確率でドロップします。鍛冶屋での強化に使います。</p>
      <div class="row" style="flex-wrap:wrap;gap:8px">${STONES.map(st => `<span style="background:${st.color}22;border:1px solid ${st.color};border-radius:6px;padding:4px 10px;font-size:13px"><span style="color:${st.color}">●</span> ${st.name} <b>×${p.stones[st.id] || 0}</b></span>`).join('')}</div>
      <p class="sub" style="margin:8px 0 0">初級：ダンジョンA　中級：ダンジョンB　上級：ダンジョンC</p></div>
    <div class="panel"><h2>外見変更</h2>
      <p class="sub" style="margin:0 0 12px">主人公の外見を選択できます。</p>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        ${CHAR_SKINS.map(sk => `<button class="skin-card ${(p.skin || 'ruby') === sk.id ? 'selected' : ''}" data-act="changeSkin" data-id="${sk.id}">
          <div style="width:64px;height:64px;margin:0 auto 6px;overflow:hidden">${skinArt(sk, 'width:64px;height:64px')}</div>
          <div style="font-size:13px;font-weight:bold">${sk.name}</div>
          <div style="font-size:11px;color:var(--muted)">${sk.job}</div>
        </button>`).join('')}
      </div></div>
    <div class="panel"><h2>データ</h2><p class="sub">進行状況はこのブラウザに自動保存されます。</p>
      <button class="btn small" data-act="debugAllGear">テスト用：全装備を入手</button>
      <button class="btn small danger" data-act="reset">${G.resetArm ? 'もう一度押すと初期化します' : 'セーブデータを初期化'}</button></div>`;
}

/* ================= render: modal ================= */
function openModal() {
  const l = G.last; if (!l) return;
  const title = l.result === 'clear' ? 'ダンジョン踏破！' : l.result === 'defeat' ? '力尽きた…' : '撤退した';
  const cls = l.result === 'clear' ? 'win' : l.result === 'defeat' ? 'lose' : '';
  const items = [...l.items].sort((a, b) => b.rarity - a.rarity || b.star - a.star);
  const p = G.p;
  $('#m-sheet').innerHTML = `
    <h2 class="${cls}" id="m-title">${title}</h2>
    <p class="sub" style="margin:0">ダンジョン${l.d.id}「${esc(l.d.name)}」（${l.df.name}）　到達 ${l.floor} / ${l.floors}F　撃破 ${l.kills}体</p>
    <div class="res">
      <div><small>獲得Gold</small><b>+${fmt(l.gold)}G</b>${l.lost ? `<span class="neg">敗北で所持金が半減（−${fmt(l.lost)}G）</span>` : ''}${l.clearGold ? `<small>うち踏破ボーナス ${fmt(l.clearGold)}G</small>` : ''}</div>
      <div><small>獲得SP</small><b>+${l.sp}</b></div>
      <div><small>レベル</small><b>${l.lvTo > l.lvFrom ? `Lv${l.lvFrom} → Lv${l.lvTo}` : `Lv${l.lvTo}（変化なし）`}</b></div>
      <div><small>薬</small><b>${l.potions.hp + l.potions.mp ? `生命+${l.potions.hp} 魔力+${l.potions.mp}` : 'なし'}</b></div>
    </div>
    <div><p class="slot-t">獲得した装備（${items.length}個）</p>
      ${items.length ? `<div class="drops">${items.map(it => itemCard(it, { sell: true })).join('')}</div>` : '<p class="empty">装備は手に入らなかった。</p>'}</div>
    <div class="act"><button class="btn primary" data-act="mRetry" id="m-retry">再挑戦</button><button class="btn" data-act="mTown">街へ戻る</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
  setTimeout(() => { const b = $('#m-retry'); if (b) b.focus(); }, 0);
}
function closeModal() { $('#modal').hidden = true; G.modalOpen = false; ensureLoop(); }

/* ================= render: help ================= */
function renderHelp() {
  $('#view-help').innerHTML = `
  <div class="panel help-guide">
    <div class="help-badge">⚠️ まずここを読もう</div>
    <h2 style="margin:8px 0 4px;font-size:18px">初心者ガイド</h2>
    <p class="sub" style="margin:0 0 12px">このゲームの遊び方と大切なルール</p>

    <div class="help-retreat">
      <div class="help-retreat-icon">🏃</div>
      <div>
        <div class="help-retreat-title">「撤退」は負けではない！</div>
        <div class="help-retreat-body">負けそうになったら<b>迷わず撤退ボタンを押すこと！</b><br>
        撤退すると街に帰還してHPが<b>全回復</b>する。<br>
        無理に戦い続けて敗北するとゴールドが<b>半分失われる</b>。</div>
      </div>
    </div>

    <div class="help-steps">
      <div class="help-step"><span class="help-step-n">1</span><div><b>ダンジョンに挑む</b><br><span class="sub">ダンジョンタブからダンジョンと難易度を選んでスタート</span></div></div>
      <div class="help-arrow">↓</div>
      <div class="help-step"><span class="help-step-n">2</span><div><b>HPが減ったら撤退 or クリア</b><br><span class="sub">撤退しても街に戻ればHPが全回復。何度でも挑める</span></div></div>
      <div class="help-arrow">↓</div>
      <div class="help-step"><span class="help-step-n">3</span><div><b>街で準備を整える</b><br><span class="sub">装備を強化・売却し、スキルを習得してレベルを上げる</span></div></div>
      <div class="help-arrow">↓</div>
      <div class="help-step"><span class="help-step-n">4</span><div><b>繰り返してボスを倒す</b><br><span class="sub">まずはダンジョンAの初級クリアを目標に！</span></div></div>
    </div>
  </div>

  <div class="panel">
    <h2>🏘️ 街タブでできること</h2>
    <div class="help-table">
      <div class="help-row"><span class="help-facility">宿屋</span><span>HP・MP回復（無料）、セーブ</span></div>
      <div class="help-row"><span class="help-facility">道具屋</span><span>HP・MPポーションを購入</span></div>
      <div class="help-row"><span class="help-facility">武器屋/防具屋</span><span>武器・防具を購入</span></div>
      <div class="help-row"><span class="help-facility">売却所</span><span>不要な装備をゴールドに換金。自動売却フィルターも設定可</span></div>
      <div class="help-row"><span class="help-facility">鍛冶屋</span><span>ゴールドと強化石を使って装備を★強化（最大★5）</span></div>
      <div class="help-row"><span class="help-facility">銀行</span><span>ゴールドを預けて敗北時のロストを防ぐ</span></div>
    </div>
  </div>

  <div class="panel">
    <h2>⚔️ ダンジョンタブでできること</h2>
    <div class="help-table">
      <div class="help-row"><span class="help-facility">ダンジョン選択</span><span>A（初級向け）→ B → C（上級向け）の3種</span></div>
      <div class="help-row"><span class="help-facility">難易度</span><span>各ダンジョンにノービス・中級・上級の3段階</span></div>
      <div class="help-row"><span class="help-facility">戦闘</span><span>自動進行。スキルを選んで戦略的に戦おう</span></div>
      <div class="help-row"><span class="help-facility help-retreat-cell">撤退ボタン</span><span>いつでも押せる。街に帰還してHP<b>全回復</b></span></div>
      <div class="help-row"><span class="help-facility">敗北</span><span>ゴールドが半分失われ、HP25%で帰還</span></div>
    </div>
  </div>

  <div class="panel">
    <h2>🎯 スキルシステムガイド</h2>

    <div class="help-skill-step">
      <div class="help-skill-num">1</div>
      <div>
        <b>SPを割り振ってスキルを取得しよう</b>
        <p class="sub" style="margin:4px 0 0">ダンジョンでレベルアップするとSP（スキルポイント）を獲得できます。ステータス画面の「スキル枠」でSPを好きな枠に割り振り、一定ポイントに達すると自動でスキルを習得します。</p>
      </div>
    </div>

    <div class="help-skill-step">
      <div class="help-skill-num">2</div>
      <div>
        <b>習得したスキルをスロットに装備しよう</b>
        <p class="sub" style="margin:4px 0 0">習得しただけでは使われません。ステータス画面の「スキルセット」でスロット（S1〜S3）に装備することで、戦闘で自動発動されるようになります。3つまで同時に装備できます。</p>
      </div>
    </div>

    <div class="help-skill-step">
      <div class="help-skill-num">3</div>
      <div>
        <b>装備したスキルは戦闘中に自動で発動する</b>
        <p class="sub" style="margin:4px 0 0">戦闘中は操作不要。「回復 → バフ → 攻撃」の優先順位で自動発動します。ダンジョン画面のスキル行でCTの残りターン数を確認できます。</p>
      </div>
    </div>

    <div class="help-callout">
      <span style="font-size:16px">⏱️</span>
      <div>
        <b>クールタイム（CT）とは？</b><br>
        <span class="sub">スキルを使うと一定ターン数の間は再使用できません。強力なスキルほどCTが長くなります。CTが0になると次の戦闘ターンで自動再発動します。</span>
      </div>
    </div>

    <div class="help-callout" style="--hc-color: #c084fc">
      <span style="font-size:16px">✨</span>
      <div>
        <b>進化スキル枠について</b><br>
        <span class="sub">剣枠・魔法枠・生命枠の3つの基本スキル枠をすべて上限（各20SP）まで振り切ると、より強力な「進化スキル枠」が解放されます。戦士・魔法使い・僧侶・英雄の4種があり、それぞれ専用の強力スキルを習得できます。</span>
      </div>
    </div>

    <h3 style="font-size:13px;margin:14px 0 6px;color:var(--muted)">── 習得できるスキル一覧 ──</h3>
    <div class="help-table">
      ${SK_ORDER.map(id => { const s = SK[id]; return `<div class="help-row"><span class="help-facility">${s.name}</span><span>${s.desc} <small style="color:var(--accent)">MP${s.mp} CT${s.ct}T</small></span></div>`; }).join('')}
    </div>
  </div>

  <div class="panel">
    <h2>📊 ステータスタブでできること</h2>
    <div class="help-table">
      <div class="help-row"><span class="help-facility">HP / MP</span><span>現在値と最大値を確認</span></div>
      <div class="help-row"><span class="help-facility">ATK / DEF</span><span>攻撃力・防御力を確認</span></div>
      <div class="help-row"><span class="help-facility">装備中の武器・防具</span><span>現在の装備と★ランクを確認・変更</span></div>
      <div class="help-row"><span class="help-facility">スキルポイント（SP）</span><span>Lvアップで獲得。スキル習得に使用</span></div>
      <div class="help-row"><span class="help-facility">強化石の所持数</span><span>鍛冶屋での★強化に必要な素材</span></div>
      <div class="help-row"><span class="help-facility">バッグ</span><span>拾った装備の一覧。ロック・装備変更が可能</span></div>
    </div>
  </div>

  <div class="panel">
    <h2>💡 その他のヒント</h2>
    <ul class="help-tips">
      <li><b>自動売却フィルター</b>：売却所でレア度を設定しておくと、ダンジョンで拾った不要装備を自動で売却できる</li>
      <li><b>強化石はダンジョンでドロップ</b>：各ダンジョンで対応した強化石が8%の確率で入手できる</li>
      <li><b>銀行は敗北前に使おう</b>：ゴールドが溜まったら銀行に預けておくとリスクヘッジになる</li>
      <li><b>推奨レベルを目安に</b>：ダンジョン選択画面の推奨レベルを参考に挑む難易度を選ぼう</li>
    </ul>
  </div>`;
}

/* ================= render: all ================= */
function renderAll() {
  const v = G.view;
  for (const id of ['town', 'dungeon', 'status', 'help']) {
    $('#view-' + id).hidden = id !== v;
    const nb = $('#nav-' + id); if (nb) nb.classList.toggle('on', id === v);
    $('#nav-' + id).setAttribute('aria-current', id === v ? 'page' : 'false');
  }
  // チュートリアル: 画面遷移後にオーバーレイを再配置
  if (G.tutorial && !G.tutorial.done) {
    setTimeout(() => renderTutorial(), 50);
  }
  $('#nav-town').classList.toggle('locked', !!G.run);
  renderHUD();
  if (v === 'town') renderTown();
  if (v === 'dungeon') {
    $('#dg-select').hidden = !!G.run; $('#dg-battle').hidden = !G.run;
    if (G.run) { renderEnemy(true); renderBattle(); } else renderDungeonSelect();
  }
  if (v === 'status') renderStatus();
  if (v === 'help') renderHelp();
}

