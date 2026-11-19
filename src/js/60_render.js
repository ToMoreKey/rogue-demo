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
    const shopPills = RARITY.slice(0, 4).map((r, i) => {
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
    const shopBuyHtml = SHOP_ITEMS.map(it => {
      const owned = it.kind === 'potion' ? (p.potions[it.key] || 0) : (p.stones[it.key] || 0);
      const maxOwned = it.kind === 'potion' ? 99 : 999;
      const canBuy = p.gold >= it.price && owned < maxOwned;
      return `<div class="smith-item">
        <div class="it-h"><span class="it-name">${esc(it.name)}</span><span class="sub" style="margin-left:auto">所持: <b>${owned}</b></span></div>
        <div class="it-meta"><span>${esc(it.desc)}</span><span>価格 <b>${fmt(it.price)}G</b></span></div>
        <button class="btn small${canBuy ? ' primary' : ''}" data-act="buyShop" data-id="${it.id}" ${canBuy ? '' : 'disabled'}>購入 (${fmt(it.price)}G)</button>
      </div>`;
    }).join('');
    content = `
      <h2>ショップ</h2>
      <h3 style="font-size:14px;margin:4px 0">購入（薬・強化石）</h3>
      <p class="sub" style="margin:0 0 8px">ダンジョン攻略に使う薬や、鍛冶屋で使う強化石を購入できます。</p>
      <div class="stack" style="gap:8px;margin-bottom:14px">${shopBuyHtml}</div>
      <hr style="margin:14px 0;border:none;border-top:1px solid var(--bd)">
      <h3 style="font-size:14px;margin:0 0 4px">装備の一括売却</h3>
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
      const maxed = it.star >= SMITH_MAX_STAR;
      const cost = smithCost(it);
      const stoneId = STONE_REQ[it.star];
      const stReq = stoneId ? STONES.find(s => s.id === stoneId) : null;
      const hasStone = stReq ? (p.stones[stReq.id] || 0) >= 1 : true;
      const canAfford = p.gold >= cost;
      const canUpgrade = !maxed && canAfford && hasStone;
      const rfCost = reforgeCost(it);
      const canReforge = it.slot === 'weapon' && p.gold >= rfCost;
      const loc = it === p.weapon ? '【装備中・武器】' : it === p.armor ? '【装備中・防具】' : '【バッグ】';
      return `<div class="smith-item">
        <div class="it-h"><span class="it-id">${itemIcon(it)}<span class="it-name">${esc(itemName(it))}</span></span><span class="it-star">${'★'.repeat(it.star)}${maxed ? '' : '☆'.repeat(SMITH_MAX_STAR - it.star)}</span><span class="sub" style="margin-left:4px">${loc}</span></div>
        <div class="it-meta"><span class="rc r${it.rarity}">${RARITY[it.rarity].name}</span><span>戦力 <b>${fmt(gearPower(it))}</b></span>${itemProps(it).map(k => `<span class="badge ${k}">${propMeta(it.slot, k)?.name || k}</span>`).join('')}<span>${maxed ? '<b>MAX強化済み</b>' : `強化費用 <b>${fmt(cost)}G</b>${stReq ? ` ＋ <span style="color:${stReq.color}">${stReq.name} ×1</span>（所持:${p.stones[stReq.id] || 0}）` : ''}`}</span></div>
        <div class="row">${maxed ? '' : `<button class="btn small${canUpgrade ? ' primary' : ''}" data-act="smithUpgrade" data-id="${it.id}" ${canUpgrade ? '' : 'disabled'}>★${it.star + 1}に強化</button>`}${it.slot === 'weapon' ? `<button class="btn small" data-act="smithReforge" data-id="${it.id}" ${canReforge ? '' : 'disabled'}>再鍛造 (${fmt(rfCost)}G)</button>` : ''}</div>
      </div>`;
    }).join('') : '<p class="empty">強化できる装備がありません。</p>';
    content = `
      <h2>鍛冶屋「鉄の大地」</h2>
      <p class="sub">Gold と強化石を使って、武器・防具を強化します。★3→4初級石、★4→5中級石、★5→6上級石、★6→7時の欠片が必要です。</p>
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
    const dgUnlocked = isDungeonUnlocked(p0, d);
    let sel = diffOf(G.sel[d.id]) || DIFFS[0];
    if (!isDiffUnlocked(p0, d, sel)) { sel = DIFFS[0]; G.sel[d.id] = sel.id; }
    const stars = sel.stars.filter(([s]) => !d.maxStar || s <= d.maxStar);
    const lo = stars.length ? stars[0][0] : (d.maxStar || 1);
    const hi = stars.length ? stars[stars.length - 1][0] : (d.maxStar || 1);
    const rec = d.rec[DIFFS.indexOf(sel)];
    const clearedMap = (p0.cleared && p0.cleared[d.id]) || {};
    const unlockReqDf = d.unlock ? (diffOf(d.unlock.df)?.name || d.unlock.df) : '';
    return `<article class="panel dcard" style="--a1:${d.a1}${dgUnlocked ? '' : ';opacity:.72'}">
      <div class="dc-top"><div class="dc-spr">${enemyArt(d.mobs[0], d.id)}</div>
        <div><h2>ダンジョン${d.id}　${esc(d.name)}</h2><p class="sub" style="margin:0">${dgUnlocked ? esc(d.blurb) : `🔒 未解放（${d.unlock.d}の${unlockReqDf}クリアで解放）`}</p></div></div>
      <div class="seg" role="group" aria-label="難易度">${DIFFS.map(df => {
        const ok = isDiffUnlocked(p0, d, df);
        const done = !!clearedMap[df.id];
        return `<button class="seg-b ${ok && df.id === sel.id ? 'on' : ''}" aria-pressed="${ok && df.id === sel.id}" data-act="diff" data-d="${d.id}" data-df="${df.id}" ${ok ? '' : 'disabled'}>${ok ? (done ? '✓' : '') + df.name : '🔒' + df.name}<small>${ok ? `${df.floors}階` : '未解放'}</small></button>`;
      }).join('')}</div>
      <p class="dc-info">${dgUnlocked
        ? `全 <b>${sel.floors}階層</b>　ドロップ <b>★${lo}〜★${hi}${d.bossMaxStar && d.bossMaxStar > hi ? `（ボス★${d.bossMaxStar}）` : ''}</b>　推奨 <b>Lv${rec}</b>〜<br>踏破報酬 <b>${fmt(Math.round(sel.clearGold * DUNGEON_REWARD[d.id]))}G</b> ＋ <b>SP${sel.clearSp}</b>`
        : `解放条件：ダンジョン${d.unlock.d}（${unlockReqDf}）をクリア`}</p>
      <button class="btn primary wide" data-act="go" data-d="${d.id}" ${dgUnlocked ? '' : 'disabled'}>${dgUnlocked ? '挑戦する' : '🔒 未解放'}</button></article>`;
  }).join('') + (() => {
    const twUnlocked = !!(p0 && p0.ending);
    const tw = (p0 && p0.tower) || { best: 0, coins: 0 };
    return `<article class="dcard${twUnlocked ? '' : ' locked'}" style="--a1:#1a1433;--a2:#0c091a">
      <div class="dc-head"><span class="dc-id">塔</span><h3>${twUnlocked ? '' : '🔒 '}天蓋の塔</h3></div>
      <p class="dc-blurb">階層は無限。10階ごとのボスを倒して祝福を選び、限界に挑むエンドレス回廊。</p>
      <p class="dc-info">${twUnlocked
        ? `最高到達階 <b>${tw.best || 0}F</b>　所持コイン <b>🪙 ${fmt(tw.coins || 0)}枚</b>`
        : '解放条件：魔王城以降の最終ボス（虚空の神殿・極級）をクリア'}</p>
      <div class="act" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn primary" style="flex:1;min-width:120px" data-act="goTower" ${twUnlocked ? '' : 'disabled'}>${twUnlocked ? '挑戦する' : '🔒 未解放'}</button>
        ${twUnlocked ? '<button class="btn" data-act="towerShop">🪙 交換所</button>' : ''}
        <button class="btn" data-act="towerRanking">🏆 ランキング</button>
      </div></article>`;
  })() + (() => {
    const abSt = isAbyssUnlocked(p0);
    const abLv = clamp(G.abyssLv || 1, 1, 10);
    const abDiff = ABYSS_CFG.diffs[abLv];
    const abOk = isAbyssDiffUnlocked(p0, abLv);
    const best = (p0 && p0.abyss && p0.abyss.best) || 0;
    const pills = Array.from({ length: 10 }, (_, i) => i + 1).map(lv => {
      const ok = isAbyssDiffUnlocked(p0, lv);
      const cl = p0 && p0.abyss && p0.abyss.cleared && p0.abyss.cleared[lv];
      return `<button class="pill ${abLv === lv ? 'on' : ''}${cl ? ' clr' : ''}" data-act="abyssSel" data-lv="${lv}" ${ok ? '' : 'disabled'}>${ok ? lv : '🔒' + lv}</button>`;
    }).join('');
    const curses = ABYSS_CURSES.slice(0, abLv).map(c => `<span class="badge">${esc(c.name)}</span>`).join(' ');
    return `<article class="dcard${abSt.ok ? '' : ' locked'}" style="--a1:#15081e;--a2:#07020c">
      <div class="dc-head"><span class="dc-id">深</span><h3>${abSt.ok ? '' : '🔒 '}深淵ダンジョン</h3></div>
      <p class="dc-blurb">全50階固定。難度ごとに呪いが累積し、最奥の深淵の主から★9神話装備が狙えるエンドダンジョン。</p>
      ${abSt.ok ? `<div class="diffs">${pills}</div>
        <p class="dc-info">難度 <b>${abLv}</b>（最高クリア: <b>${best || 'なし'}</b>）　報酬: <b>${fmt(abDiff.clearGold)}G ＋ 🪙${abDiff.coins}枚</b><br>有効な呪い（${abLv}個）: ${curses}</p>
        <button class="btn primary wide" data-act="goAbyss" ${abOk ? '' : 'disabled'}>${abOk ? `難度${abLv}に挑戦` : '🔒 未解放'}</button>`
        : `<p class="dc-info">🔒 深淵（全ダンジョンの極級をクリアで解放・残り ${abSt.remaining}個）</p><button class="btn primary wide" disabled>🔒 未解放</button>`}
    </article>`;
  })();
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
  if (run.tower) {
    $('#b-title').textContent = `天蓋の塔　${Math.max(run.floor, 1)}F`;
    let pips = '';
    const f10 = ((Math.max(run.floor, 1) - 1) % 10) + 1;
    for (let k = 1; k <= 10; k++) {
      const isDone = k < f10 || (k === f10 && run.phase !== 'battle');
      const isCur = !isDone && k === f10;
      pips += `<i class="pip ${isDone ? 'done' : isCur ? 'cur' : ''} ${k === 10 ? 'boss' : ''}"></i>`;
    }
    $('#b-pips').innerHTML = pips;
  } else {
    $('#b-title').textContent = `${run.d.id} ${run.d.name}（${run.df.name}）　${Math.min(Math.max(run.floor, 1), run.floors)} / ${run.floors}F`;
    let pips = '';
    const pipCount = Math.min(run.floors, 20);
    for (let k = 1; k <= pipCount; k++) {
      const fEnd = Math.round(k * run.floors / pipCount);
      const fStart = Math.round((k - 1) * run.floors / pipCount) + 1;
      const isDone = run.cleared >= fEnd;
      const isCur = !isDone && run.floor >= fStart && run.floor <= fEnd;
      pips += `<i class="pip ${isDone ? 'done' : isCur ? 'cur' : ''} ${k === pipCount ? 'boss' : ''}"></i>`;
    }
    $('#b-pips').innerHTML = pips;
  }
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
  const stTxt = run.guard > 0 ? `鉄壁 あと${run.guard}回` : (run.queued ? `予約：${SK[run.queued].name}` : '');
  $('#b-status').innerHTML = run.tower
    ? `${esc(stTxt)} <button class="btn small" data-act="towerBlessList">✨祝福(${run.tower.blessings.length})</button>`
    : stTxt;
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
  const gp = gearPower(it);
  const better = o.compare && gp > gearPower(G.p[it.slot]);
  const isRec = o.showRec !== false && bestGearItem(G.p, it.slot) === it;
  const ps = itemProps(it);
  return `<div class="item r${it.rarity}">
    <div class="it-h"><span class="it-id">${itemIcon(it)}<span class="it-name">${esc(itemName(it))}</span></span><span class="it-star">${'★'.repeat(it.star)}</span></div>
    <div class="it-stat">${isW ? '攻撃力' : '防御力'} +${pw}${gp !== pw ? `<span class="it-desc">（実効 +${gp}）</span>` : ''}　<span class="it-desc">戦力 ${fmt(gp)}</span></div>
    <div class="it-meta"><span class="rc">${RARITY[it.rarity].name}</span><span>品質 ${Math.round(it.roll * 100)}%</span>${o.sell === false ? '' : `<span>売値 ${fmt(sellValue(it))}G</span>`}${isRec ? '<span class="badge rec">おすすめ</span>' : ''}${better ? '<span class="badge up">今の装備より強い</span>' : ''}</div>
    ${ps.length ? `<div>${ps.map(k => { const pm = propMeta(it.slot, k); return pm ? `<div><span class="badge ${k}">${pm.name}</span> <span class="it-desc">${pm.desc}</span></div>` : ''; }).join('')}${ps.includes('madness') ? '<div class="it-desc">※自動装備の対象外（手動で装備）</div>' : ''}</div>` : ''}
    ${o.actions ? `<div class="it-act"><button class="btn small" data-act="equip" data-id="${it.id}">装備する</button><button class="btn small ${it.locked ? 'on' : ''}" data-act="lock" data-id="${it.id}" aria-pressed="${it.locked}">${it.locked ? 'ロック中' : 'ロック'}</button></div>` : ''}
  </div>`;
}
function renderSkillTrees(p) {
  const pts = p.skillPts || {};
  const passives = p.passiveSkills || {};

  const treeCard = (tree) => {
    const cur = pts[tree.id] || 0;
    const isUnlocked = tree.unlockWhen(p);
    let cap = tree.maxSp;
    if (tree.stage2When && !tree.stage2When(p)) cap = Math.min(cap, 10);
    else if (tree.stage3When && !tree.stage3When(p)) cap = Math.min(cap, 20);
    const isFull = cur >= cap;
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
    const canAdd5 = !isFull && spLeft >= 5 && cur + 5 <= cap;
    const canAddAll = !isFull && spLeft >= 1;
    const remaining = Math.min(spLeft, cap - cur);

    return `<div class="skill-tree" style="--tc:${tree.color}">
      <div class="st-header">
        <span class="st-icon">${tree.icon}</span>
        <div class="st-info">
          <span class="st-name">${tree.name}</span>
          <span class="st-desc">${tree.desc}${tree.stage2When && !tree.stage2When(p) ? `<br><span class="sub">🔒 ${tree.stage2Desc}</span>` : (tree.stage3When && !tree.stage3When(p) ? `<br><span class="sub">🔒 ${tree.stage3Desc}</span>` : '')}</span>
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
        ${cur > 0 ? `<button class="btn small danger" data-act="spAllocReset" data-tree="${tree.id}">${resetArming ? `⚠️ もう一度押すとリセット (${fmt(skillResetCost(p))}G)` : `リセット (${fmt(skillResetCost(p))}G)`}</button>` : ''}
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
          <div class="pt-name">${esc(pSkin.name)} <span class="sub">${esc(pSkin.job)}</span>${(() => { const tid = p.tower && p.tower.title; const tt = tid && TOWER_TITLES.find(x => x.id === tid); return tt ? ` <span class="badge">${esc(tt.name)}</span>` : ''; })()}</div>
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
      </dl>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn primary" data-act="openDex">📖 図鑑</button>
        <button class="btn" data-act="openAch">🏆 実績</button>
      </div></div>
    <div class="panel"><h2>称号（獲得済: ${(p.tower && p.tower.titles ? p.tower.titles.length : 0)} / ${TOWER_TITLES.length}）</h2>
      ${!(p.tower && p.tower.titles && p.tower.titles.length)
        ? '<p class="empty">まだ称号を獲得していません（回廊・図鑑・実績で獲得できます）。</p>'
        : `<div style="display:flex;flex-wrap:wrap;gap:6px">${p.tower.titles.map(tid => {
            const tt = TOWER_TITLES.find(x => x.id === tid);
            if (!tt) return '';
            const eq = p.tower.title === tid;
            return `<button class="pill ${eq ? 'on' : ''}" data-act="equipStatusTitle" data-id="${tid}" title="${esc(tt.desc)}">${eq ? '✓ ' : ''}${esc(tt.name)}</button>`;
          }).join('')}</div>`}
    </div>
    <div class="panel"><h2>極意（共通パッシブ）${p.ending ? ` <span class="sub">残りSP: ${p.sp}</span>` : ''}</h2>
      ${!p.ending
        ? '<p class="empty">🔒 本編クリア（虚空の神殿・極級）で解放されます。</p>'
        : `<div style="display:grid;gap:6px">${MASTERY_LIST.map(it => {
            const r = (p.mastery && p.mastery[it.id]) || 0;
            const cost = r < MASTERY_MAX ? masteryCost(r + 1) : 0;
            return `<div class="item" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div><div><b>${esc(it.name)}</b> <span class="sub">Lv ${r} / ${MASTERY_MAX}</span></div><div class="sub">${esc(it.desc)}</div></div>
              <button class="btn small primary" data-act="masteryUp" data-id="${it.id}" ${r < MASTERY_MAX && p.sp >= cost ? '' : 'disabled'}>${r >= MASTERY_MAX ? 'MAX' : `+1 (${cost}SP)`}</button>
            </div>`;
          }).join('')}</div>
          <div style="margin-top:8px"><button class="btn small danger" data-act="masteryReset">極意リセット (${fmt(skillResetCost(p))}G)</button></div>`}
    </div>
    <div class="panel"><h2>装備</h2>
      <div class="items">
        <div><p class="slot-t">手（武器）</p>${p.weapon ? itemCard(p.weapon) : '<p class="empty">装備なし</p>'}</div>
        <div><p class="slot-t">体（防具）</p>${p.armor ? itemCard(p.armor) : '<p class="empty">装備なし</p>'}</div>
      </div>
      <div class="row" style="margin-top:10px">
        <button class="btn small" data-act="autoEquipNow">おまかせ装備</button>
        <button class="btn small ${G.opts.autoEquip ? 'on' : ''}" data-act="autoEquipToggle" aria-pressed="${G.opts.autoEquip}">拾った装備を自動で装備：${G.opts.autoEquip ? 'ON' : 'OFF'}</button>
      </div></div>
    <div class="panel"><h2>バッグ <span class="sub" style="font-size:13px">${p.bag.length} / ${p.bagCap || BAG_CAP}</span></h2>
      <p class="sub" style="margin:0 0 10px">各アイテムの「ロック」ボタンを押すと売却・自動売却から除外できます。</p>
      ${(p.bagCap || BAG_CAP) < MAX_BAG_CAP ? `<div class="row" style="margin-bottom:10px"><button class="btn small" data-act="expandBag" ${p.gold >= bagExpandCost(p.bagCap || BAG_CAP) ? '' : 'disabled'}>バッグ拡張 +10枠（${fmt(bagExpandCost(p.bagCap || BAG_CAP))}G）</button></div>` : ''}
      ${bag.length ? `<div class="items">${bag.map(it => itemCard(it, { actions: true, compare: true })).join('')}</div>` : '<p class="empty">バッグは空です。ダンジョンで装備を入手しましょう。</p>'}</div>
    ${renderSkillSlots(p)}
    ${renderSkillTrees(p)}
    <div class="panel"><h2>薬</h2><p class="sub">ダンジョンの戦闘中にも使えます（探索画面のボタン）。</p>
      <div class="row">
        <button class="btn small" data-act="potion" data-k="hp" ${p.potions.hp > 0 ? '' : 'disabled'}>生命の薬 ×${p.potions.hp}（HP30%）</button>
        <button class="btn small" data-act="potion" data-k="mp" ${p.potions.mp > 0 ? '' : 'disabled'}>魔力の薬 ×${p.potions.mp}（MP50%）</button>
      </div></div>
    <div class="panel"><h2>強化石</h2><p class="sub">鍛冶屋での強化に使います。</p>
      <div class="row" style="flex-wrap:wrap;gap:8px">${STONES.map(st => `<span style="background:${st.color}22;border:1px solid ${st.color};border-radius:6px;padding:4px 10px;font-size:13px"><span style="color:${st.color}">●</span> ${st.name} <b>×${p.stones[st.id] || 0}</b></span>`).join('')}</div>
      <p class="sub" style="margin:8px 0 0">初級：A　中級：B　上級：C　時の欠片：D〜Fのボス・強敵</p></div>
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
function openBlessModal() {
  const run = G.run;
  if (!run || !run.tower || !run.tower.pendingChoice) return;
  const list = run.tower.pendingChoice;
  $('#m-sheet').innerHTML = `
    <h2 class="win" id="m-title">✨ 祝福を1つ選ぼう</h2>
    <p class="sub" style="margin:0 0 10px">第${run.floor}層の${run.floor % 10 === 0 ? 'ボス' : '節目の強敵'}を撃破！（ラン中のみ有効）</p>
    <div style="display:grid;gap:8px">${list.map(b => `
      <button class="btn" style="text-align:left;padding:10px 12px;display:grid;gap:3px" data-act="pickBless" data-id="${b.id}">
        <div><span class="badge">${esc(b.cat)}</span> <b>${esc(b.name)}</b></div>
        <div class="sub">${esc(b.desc)}</div>
      </button>`).join('')}</div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}
function openBlessListModal() {
  const run = G.run;
  if (!run || !run.tower) return;
  const bs = run.tower.blessings.map(id => TOWER_BLESSINGS.find(x => x.id === id)).filter(Boolean);
  $('#m-sheet').innerHTML = `
    <h2 id="m-title">✨ 取得済みの祝福（${bs.length}個）</h2>
    ${bs.length
      ? `<div style="display:grid;gap:6px;max-height:55vh;overflow:auto">${bs.map(b => `<div class="item"><div><span class="badge">${esc(b.cat)}</span> <b>${esc(b.name)}</b></div><div class="sub">${esc(b.desc)}</div></div>`).join('')}</div>`
      : '<p class="empty">まだ祝福を持っていません（10階ごとに獲得）。</p>'}
    <div class="act"><button class="btn primary" data-act="closeTowerModal">閉じる</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}
function openTowerShopModal() {
  const p = G.p, tw = p.tower || { best: 0, coins: 0, titles: [], title: null };
  $('#m-sheet').innerHTML = `
    <h2 id="m-title">🪙 回廊コイン交換所</h2>
    <p class="sub" style="margin:0 0 10px">所持コイン：<b>🪙 ${fmt(tw.coins || 0)}枚</b>　／　最高到達階：<b>${tw.best || 0}F</b></p>
    <p class="slot-t">★8 神話装備（倍率 6.0）</p>
    <div style="display:grid;gap:8px;margin-bottom:12px">${TOWER_SHOP.map(it => `
      <div class="item r4" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div><div><b class="rc">${esc(it.name)}</b></div><div class="sub">${esc(it.desc)}</div></div>
        <button class="btn primary small" data-act="buyTowerShop" data-id="${it.id}" ${(tw.coins || 0) >= it.price ? '' : 'disabled'}>🪙 ${it.price}</button>
      </div>`).join('')}</div>
    <p class="slot-t">称号（ステータス画面に表示）</p>
    <div style="display:grid;gap:6px;max-height:36vh;overflow:auto;margin-bottom:10px">${TOWER_TITLES.map(t => {
      const owned = (tw.titles || []).includes(t.id);
      const eq = tw.title === t.id;
      return `<div class="item" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div><div><b>${esc(t.name)}</b>${eq ? ' <span class="badge rec">装備中</span>' : ''}</div><div class="sub">${esc(t.desc)}</div></div>
        ${owned
          ? `<button class="btn small ${eq ? 'primary' : ''}" data-act="equipTowerTitle" data-id="${t.id}">${eq ? '外す' : '装備'}</button>`
          : (t.price
            ? `<button class="btn small" data-act="buyTowerTitle" data-id="${t.id}" ${(tw.coins || 0) >= t.price ? '' : 'disabled'}>🪙 ${t.price}</button>`
            : `<span class="sub">🔒 ${t.floor}F</span>`)}
      </div>`;
    }).join('')}</div>
    <div class="act"><button class="btn primary" data-act="closeTowerModal">閉じる</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}

function renderRankingModal(res) {
  const p = G.p, best = (p && p.tower && p.tower.best) || 0;
  const upd = res && res.data && res.data.updated ? res.data.updated : '準備中';
  const sheet = $('#m-sheet');
  sheet.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.className = 'win'; h2.id = 'm-title';
  h2.textContent = `天蓋の塔 ランキング（更新: ${upd}）`;
  sheet.appendChild(h2);

  if (res && res.offline) {
    const note = document.createElement('p');
    note.className = 'sub'; note.style.margin = '0';
    note.textContent = res.ok ? 'オフライン（前回取得分を表示）' : 'ランキングを取得できません';
    sheet.appendChild(note);
  }

  const entries = (res && res.data && res.data.entries) || [];
  const pos = calcRankPosition(best, entries);
  const myP = document.createElement('p');
  myP.className = 'sub'; myP.style.margin = '0';
  myP.textContent = `あなたの最高到達階: ${best}階（ランキング換算: ${pos.text}）`;
  sheet.appendChild(myP);

  const wrap = document.createElement('div');
  wrap.className = 'rk-wrap';
  if (!entries.length) {
    const emp = document.createElement('p');
    emp.className = 'empty'; emp.style.margin = '12px';
    emp.textContent = res && !res.ok ? 'ランキングを取得できません。' : '掲載されている記録はまだありません。';
    wrap.appendChild(emp);
  } else {
    const tbl = document.createElement('table');
    tbl.className = 'rk-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th style="width:54px;text-align:center">順位</th><th>ニックネーム</th><th style="width:76px;text-align:right">到達階</th></tr>';
    tbl.appendChild(thead);
    const tbody = document.createElement('tbody');
    entries.forEach((e, idx) => {
      const rank = idx + 1;
      const tr = document.createElement('tr');
      if (rank <= 3) tr.className = `rk-${rank}`;
      const tdPos = document.createElement('td');
      tdPos.className = 'rk-pos';
      tdPos.textContent = rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : String(rank);
      const tdName = document.createElement('td');
      tdName.textContent = e.name;
      const tdFl = document.createElement('td');
      tdFl.className = 'rk-fl';
      tdFl.textContent = `${e.floor}F`;
      tr.append(tdPos, tdName, tdFl);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    wrap.appendChild(tbl);
  }
  sheet.appendChild(wrap);

  const box = document.createElement('div');
  box.className = 'rk-box';
  box.id = 'rk-submit-box';
  const tw = (p && p.tower) || {};
  const st = document.createElement('p');
  st.className = 'sub'; st.style.margin = '0';
  st.textContent = `設定: ${tw.rankOptIn ? '送信する' : '送信しない'} / 名前: ${tw.nick || '未設定'} / 送信済最高: ${tw.sentBest ? tw.sentBest + 'F' : 'なし'}`;
  box.appendChild(st);
  if (!isRankingSubmitConfigured()) {
    const msg = document.createElement('p');
    msg.className = 'sub'; msg.style.margin = '0';
    msg.textContent = 'ランキング送信は準備中です';
    box.appendChild(msg);
  } else {
    const row1 = document.createElement('div');
    row1.className = 'rk-row';
    const inp = document.createElement('input');
    inp.type = 'text'; inp.id = 'rk-nick'; inp.className = 'rk-in';
    inp.maxLength = 20; inp.placeholder = 'ニックネーム（1〜12文字）';
    inp.value = tw.nick || '';
    const btnSave = document.createElement('button');
    btnSave.className = 'btn primary small'; btnSave.dataset.act = 'saveRankOptIn';
    btnSave.textContent = '保存して有効にする';
    row1.append(inp, btnSave);
    box.appendChild(row1);

    const lbl = document.createElement('label');
    lbl.className = 'rk-chk';
    const chk = document.createElement('input');
    chk.type = 'checkbox'; chk.id = 'rk-agree'; chk.checked = !!tw.rankOptIn;
    const span = document.createElement('span');
    span.textContent = 'ニックネームと最高到達階が、ランキング用に送信されます（個人情報は送信しません）。送信した内容は運営者の確認後にランキングへ掲載されます。';
    lbl.append(chk, span);
    box.appendChild(lbl);

    const row2 = document.createElement('div');
    row2.className = 'rk-row';
    const canManual = !!(tw.rankOptIn && tw.nick && (tw.best || 0) >= 1 && (tw.best || 0) > (tw.sentBest || 0));
    const btnSend = document.createElement('button');
    btnSend.className = 'btn small'; btnSend.dataset.act = 'manualRankSubmit';
    btnSend.textContent = '今の最高記録を送信';
    if (!canManual) btnSend.disabled = true;
    const btnClear = document.createElement('button');
    btnClear.className = 'btn small'; btnClear.dataset.act = 'clearRankOptIn';
    btnClear.textContent = '設定を解除';
    row2.append(btnSend, btnClear);
    box.appendChild(row2);

    const fmsg = document.createElement('p');
    fmsg.id = 'rk-form-msg'; fmsg.className = 'sub'; fmsg.style.margin = '0';
    fmsg.textContent = G.rankMsg || '';
    box.appendChild(fmsg);
  }
  sheet.appendChild(box);

  const act = document.createElement('div');
  act.className = 'act';
  act.style.gridTemplateColumns = '1fr';
  const btnClose = document.createElement('button');
  btnClose.className = 'btn primary';
  btnClose.dataset.act = 'closeTowerModal';
  btnClose.textContent = '閉じる';
  act.appendChild(btnClose);
  sheet.appendChild(act);
}

function openRankingModal() {
  const sheet = $('#m-sheet');
  sheet.innerHTML = '<h2 class="win" id="m-title">天蓋の塔 ランキング</h2><p class="sub" style="margin:0">読み込み中…</p><div class="act" style="grid-template-columns:1fr"><button class="btn primary" data-act="closeTowerModal">閉じる</button></div>';
  $('#modal').hidden = false; G.modalOpen = true;
  fetchRanking().then(res => { if (G.modalOpen) renderRankingModal(res); });
}

function openDexModal(tab = 'enemies') {
  G.dexTab = tab === 'items' ? 'items' : tab === 'ach' ? 'ach' : 'enemies';
  const p = G.p, dex = (p && p.dex) || { enemies: {}, items: {}, rewards: {} };
  const enMap = dex.enemies || {}, itMap = dex.items || {}, achMap = (p && p.ach) || {};
  const groups = dexEnemyGroups();
  const allEnemies = groups.flatMap(g => g.list);
  const seenTotal = allEnemies.filter(e => enMap[e.id] && enMap[e.id].seen).length;
  const achTotal = ACHIEVEMENTS.filter(a => achMap[a.id]).length;
  const itemKeys = [];
  for (const sl of ['weapon', 'armor']) {
    for (const st of DEX_STARS) itemKeys.push({ key: `${sl}_${st}`, slot: sl, star: st, mythic: false, hkey: String(st) });
    for (const st of DEX_MYTHICS) itemKeys.push({ key: `${sl}_m${st}`, slot: sl, star: st, mythic: true, hkey: `m${st}` });
  }
  const gotTotal = itemKeys.filter(x => itMap[x.key]).length;

  const rewardBtn = (key, ready, label) => {
    const claimed = !!(dex.rewards && dex.rewards[key]);
    if (claimed) return `<span class="badge rec">✓ 受取済</span>`;
    if (!ready) return `<span class="sub">${esc(label)}</span>`;
    if (!p.ending) return `<span class="sub">🔒 本編クリアで受け取り可能</span>`;
    return `<button class="btn small primary" data-act="claimDex" data-key="${key}">🎁 受け取る（${esc(label)}）</button>`;
  };

  let body = '';
  if (G.dexTab === 'enemies') {
    const allEnReady = seenTotal === allEnemies.length;
    body = `<div class="dex-gh"><span class="sub">発見 <b>${seenTotal} / ${allEnemies.length}</b></span>${rewardBtn('all_enemies', allEnReady, '🪙100＋称号「図鑑博士」')}</div>
      <div class="dex-scroll">${groups.map(g => {
        const gSeen = g.list.filter(e => enMap[e.id] && enMap[e.id].seen).length;
        const reqList = g.id === 'O' ? g.list.slice(0, 6) : g.list;
        const gReady = reqList.every(e => enMap[e.id] && enMap[e.id].seen);
        return `<div class="dex-grp">
          <div class="dex-gh"><b>${esc(g.title)}</b><span class="sub">発見 ${gSeen}/${g.list.length}</span>${rewardBtn('grp_' + g.id, gReady, `🪙${g.rewardCoins}`)}</div>
          <div class="dex-grid">${g.list.map(e => {
            const rec = enMap[e.id], seen = !!(rec && rec.seen);
            return `<div class="dex-card">
              <div class="dex-spr${seen ? '' : ' dex-sil'}">${enemyArt(e, e.dId)}</div>
              <div class="dex-nm">${seen ? esc(e.name) : '？？？'}</div>
              <div class="dex-sub">${seen ? `撃破 ${rec.kills || 0}` : '未発見'}</div>
            </div>`;
          }).join('')}</div>
        </div>`;
      }).join('')}</div>`;
  } else if (G.dexTab === 'ach') {
    const pend = (!p.ending && p.pendingAchCoins > 0) ? ` <span class="sub">（保留コイン: 🪙${fmt(p.pendingAchCoins)}枚 / クリア後付与）</span>` : '';
    body = `<div class="dex-gh"><span class="sub">達成 <b>${achTotal} / ${ACHIEVEMENTS.length}</b>${pend}</span></div>
      <div class="dex-scroll">${ACH_CATS.map(cat => {
        const list = ACHIEVEMENTS.filter(a => a.cat === cat);
        const done = list.filter(a => achMap[a.id]).length;
        return `<div class="dex-grp">
          <div class="dex-gh"><b>${esc(cat)}</b><span class="sub">${done}/${list.length}</span></div>
          <div style="display:grid;gap:5px">${list.map(a => {
            const dt = achMap[a.id];
            const hid = !dt && a.hidden;
            const tObj = a.titleId && TOWER_TITLES.find(t => t.id === a.titleId);
            const rewTxt = `🪙${a.coins}${tObj ? ` ＋ 称号「${tObj.name}」` : ''}`;
            const pgTxt = !dt && !hid && a.prog ? ` <span class="sub">(${esc(a.prog(p))})</span>` : '';
            return `<div class="item" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
              <div style="min-width:0"><div><b>${dt ? '🏆 ' : '🔒 '}${hid ? '？？？' : esc(a.name)}</b>${pgTxt}</div>
                <div class="sub">${hid ? '隠し実績' : esc(a.desc)}</div></div>
              <div style="text-align:right;white-space:nowrap;font-size:11px">${dt ? `<div class="l-good">${esc(dt)}</div>` : ''}<div class="sub">${hid ? '？？？' : esc(rewTxt)}</div></div>
            </div>`;
          }).join('')}</div>
        </div>`;
      }).join('')}</div>`;
  } else {
    const renderSlotGrid = (sl, label, mythic) => {
      const stars = mythic ? DEX_MYTHICS : DEX_STARS;
      return `<div class="dex-grp"><div class="dex-gh"><b>${label}</b></div>
        <div class="dex-igrid">${stars.map(st => {
          const key = `${sl}_${mythic ? 'm' : ''}${st}`;
          const got = !!itMap[key];
          const fake = { slot: sl, star: st, rarity: mythic ? 4 : (st >= 8 ? 3 : 0) };
          const nm = itemName(fake);
          const lbl = `${mythic ? '神話 ' : ''}★${st} ${sl === 'weapon' ? '武器' : '防具'}`;
          return `<div class="dex-icard${mythic ? ' r4' : ''}" data-act="dexHint" data-hkey="${mythic ? 'm' + st : st}" data-label="${esc(lbl)}">
            <div class="${got ? '' : 'dex-sil'}">${itemIcon(fake)}</div>
            <div class="dex-nm">${got ? esc(nm) : `★${st} 未入手`}</div>
            <div class="dex-sub">${got ? `★${st}` : 'タップでヒント'}</div>
          </div>`;
        }).join('')}</div></div>`;
    };
    const allItReady = gotTotal === itemKeys.length;
    body = `<div class="dex-gh"><span class="sub">入手 <b>${gotTotal} / ${itemKeys.length}</b></span>${rewardBtn('all_items', allItReady, '🪙100＋称号「蒐集家」')}</div>
      <div class="dex-hint" id="dex-hint-box">未入手の装備をタップすると入手条件のヒントが表示されます。</div>
      <div class="dex-scroll">
        ${renderSlotGrid('weapon', '武器（★1〜★9）', false)}
        ${renderSlotGrid('armor', '防具（★1〜★9）', false)}
        ${renderSlotGrid('weapon', '神話レア武器（★8〜★9）', true)}
        ${renderSlotGrid('armor', '神話レア防具（★8〜★9）', true)}
      </div>`;
  }

  $('#m-sheet').innerHTML = `
    <h2 class="win" id="m-title">📖 図鑑・実績</h2>
    <div class="dex-tabs">
      <button class="btn small ${G.dexTab === 'enemies' ? 'primary' : ''}" data-act="dexTab" data-tab="enemies">敵図鑑（${seenTotal}/${allEnemies.length}）</button>
      <button class="btn small ${G.dexTab === 'items' ? 'primary' : ''}" data-act="dexTab" data-tab="items">装備図鑑（${gotTotal}/${itemKeys.length}）</button>
      <button class="btn small ${G.dexTab === 'ach' ? 'primary' : ''}" data-act="dexTab" data-tab="ach">実績（${achTotal}/${ACHIEVEMENTS.length}）</button>
    </div>
    ${body}
    <div class="act" style="grid-template-columns:1fr"><button class="btn primary" data-act="closeTowerModal">閉じる</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}

function openUnlockNoticeModal() {
  const rows = [
    { name: '🏰 天蓋の塔（無限回廊）', desc: '階層は無限。10階ごとの祝福と回廊コイン交換所でさらなる高みへ！', to: 'tower' },
    { name: '🕳️ 深淵ダンジョン', desc: '全15ダンジョンの極級クリアで解放。累積する呪いと★9神話ドロップに挑もう。', to: 'abyss' },
    { name: '✨ 極意（共通パッシブ）', desc: '全キャラ共通のパッシブ強化10種が解放されました。', to: 'status' },
    { name: '⚔️ 進化枠 第3段階', desc: '各進化スキル枠の上限が30SPに拡張され、究極スキルを習得できます。', to: 'status' },
    { name: '📖 図鑑・🏆 実績・称号', desc: '魔物・装備の記録や実績達成で回廊コインと称号を獲得できます。', to: 'dex' }
  ];
  $('#m-sheet').innerHTML = `
    <h2 class="win" id="m-title">🎉 クリア後の新要素が解放！</h2>
    <p class="sub" style="margin:0">虚空の神殿・極級の踏破により、以下のエンドコンテンツが解放されました。</p>
    <div style="display:grid;gap:6px">${rows.map(r => `
      <div class="item" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="min-width:0"><div><b>${esc(r.name)}</b></div><div class="sub">${esc(r.desc)}</div></div>
        <button class="btn small primary" data-act="jumpNotice" data-to="${r.to}">見る</button>
      </div>`).join('')}</div>
    <div class="act" style="grid-template-columns:1fr"><button class="btn primary" data-act="mTown">街へ戻る</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}

function openModal() {
  const l = G.last; if (!l) return;
  const p = G.p;
  if (l.tower) {
    const tw = l.tower;
    const bs = tw.blessings.map(id => TOWER_BLESSINGS.find(x => x.id === id)).filter(Boolean);
    const items = [...l.items].sort((a, b) => b.rarity - a.rarity || b.star - a.star);
    $('#m-sheet').innerHTML = `
      <h2 class="${l.result === 'defeat' ? 'lose' : 'win'}" id="m-title">天蓋の塔 探索終了</h2>
      <p class="sub" style="margin:0">到達階：<b>${tw.reached}F</b>${tw.isNewBest ? ' <span class="badge rec">自己ベスト更新！</span>' : ''}　撃破 ${l.kills}体</p>
      <p class="sub" id="rk-res-status" style="margin:0"></p>
      <div class="res">
        <div><small>獲得コイン</small><b>🪙 +${fmt(tw.coins)}枚</b></div>
        <div><small>獲得Gold</small><b>+${fmt(l.gold)}G</b>${l.lost ? `<span class="neg">敗北半減（−${fmt(l.lost)}G）</span>` : ''}</div>
        <div><small>レベル</small><b>${l.lvTo > l.lvFrom ? `Lv${l.lvFrom} → Lv${l.lvTo}` : `Lv${l.lvTo}`}</b></div>
        <div><small>取得した祝福</small><b>${bs.length}個</b></div>
      </div>
      ${tw.newTitles.length ? `<p class="l-good" style="margin:6px 0">称号獲得：${tw.newTitles.map(esc).join(' / ')}</p>` : ''}
      ${bs.length ? `<div style="margin:6px 0"><p class="slot-t">取得した祝福</p><div style="display:flex;flex-wrap:wrap;gap:4px">${bs.map(b => `<span class="badge">${esc(b.name)}</span>`).join('')}</div></div>` : ''}
      <div><p class="slot-t">獲得した装備（${items.length}個）</p>
        ${items.length ? `<div class="drops">${items.map(it => itemCard(it, { sell: true })).join('')}</div>` : '<p class="empty">装備は手に入らなかった。</p>'}</div>
      <div class="act"><button class="btn primary" data-act="mRetry" id="m-retry">再挑戦</button><button class="btn" data-act="mTown">街へ戻る</button></div>`;
    $('#modal').hidden = false; G.modalOpen = true;
    setTimeout(() => { const b = $('#m-retry'); if (b) b.focus(); }, 0);
    return;
  }
  if (l.ending) {
    $('#m-sheet').innerHTML = `
      <h2 class="win" id="m-title">ゲームクリア！</h2>
      <p style="margin:8px 0;line-height:1.6">終焉神ニヒルを倒した！ 世界は救われた！<br>しかし旅はまだ続く——エンドコンテンツは準備中。</p>
      <div class="res">
        <div><small>総ラン数</small><b>${fmt(p.stats.runs)}回</b></div>
        <div><small>総撃破数</small><b>${fmt(p.stats.kills)}体</b></div>
        <div><small>到達レベル</small><b>Lv${p.lv}</b></div>
        <div><small>獲得Gold</small><b>+${fmt(l.gold)}G</b></div>
      </div>
      <div class="act"><button class="btn primary" data-act="mTown" id="m-retry">続ける</button></div>`;
    $('#modal').hidden = false; G.modalOpen = true;
    setTimeout(() => { const b = $('#m-retry'); if (b) b.focus(); }, 0);
    return;
  }
  if (l.part1End) {
    $('#m-sheet').innerHTML = `
      <h2 class="win" id="m-title">前編 完</h2>
      <p style="margin:8px 0;line-height:1.6">魔王ガルゼを倒した！<br>しかし真の黒幕との戦いはまだ続く——後編へ進む！</p>
      <div class="res">
        <div><small>総ラン数</small><b>${fmt(p.stats.runs)}回</b></div>
        <div><small>総撃破数</small><b>${fmt(p.stats.kills)}体</b></div>
        <div><small>到達レベル</small><b>Lv${p.lv}</b></div>
        <div><small>獲得Gold</small><b>+${fmt(l.gold)}G</b></div>
      </div>
      <div class="act"><button class="btn primary" data-act="mTown" id="m-retry">続ける</button></div>`;
    $('#modal').hidden = false; G.modalOpen = true;
    setTimeout(() => { const b = $('#m-retry'); if (b) b.focus(); }, 0);
    return;
  }
  const title = l.result === 'clear' ? 'ダンジョン踏破！' : l.result === 'defeat' ? '力尽きた…' : '撤退した';
  const cls = l.result === 'clear' ? 'win' : l.result === 'defeat' ? 'lose' : '';
  const items = [...l.items].sort((a, b) => b.rarity - a.rarity || b.star - a.star);
  $('#m-sheet').innerHTML = `
    <h2 class="${cls}" id="m-title">${title}</h2>
    <p class="sub" style="margin:0">${l.abyss ? `深淵（難度${l.abyss.lv}）` : `ダンジョン${l.d.id}「${esc(l.d.name)}」（${l.df.name}）`}　到達 ${l.floor} / ${l.floors}F　撃破 ${l.kills}体</p>
    ${l.abyss && l.abyss.mythicDrops && l.abyss.mythicDrops.length ? `<p class="l-r4" style="margin:6px 0;font-weight:700">★ 深淵の主から神話レア装備を獲得！（${l.abyss.mythicDrops.map(it => esc(itemName(it))).join(', ')}）</p>` : ''}
    ${l.abyss && l.abyss.coins ? `<p class="l-good" style="margin:4px 0">回廊コイン 🪙 +${l.abyss.coins}枚 獲得！</p>` : ''}
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
  </div>

  <div class="panel" id="help-endgame">
    <h2>🌌 後編・クリア後の要素ガイド</h2>
    <p class="sub" style="margin:0 0 10px">中盤〜本編クリア後に解放されるやり込み要素の説明（タップで開閉）</p>
    <details class="help-det">
      <summary>🏰 天蓋の塔（無限回廊）</summary>
      <p>本編クリア（虚空の神殿・極級）で解放されるエンドレスダンジョンです。<br>
      5階ごとの節目の強敵で「2択」、10階ごとのボスで「3択」の祝福を獲得でき、同じラン中ずっと効果が累積します。<br>
      獲得した回廊コインは交換所で★8神話装備や称号と交換できます（50階以降は獲得コイン2倍）。</p>
    </details>
    <details class="help-det">
      <summary>🕳️ 深淵ダンジョン</summary>
      <p>全15ダンジョン（A〜O）の極級をすべてクリアすると解放されます。<br>
      全50階固定・難度1〜10の段階挑戦で、難度が上がるごとに「呪い」が累積します（回復半減・詠唱遅延など）。<br>
      50階の「深淵の主」を倒すと、極めて低い確率で★9神話レア装備がドロップすることがあります。</p>
    </details>
    <details class="help-det">
      <summary>✨ 極意と進化第3段階</summary>
      <p>本編クリア後、進化スキル枠（戦士・魔法使い・僧侶・英雄）の上限が30SPに解放され、第3段階スキルを習得できます。<br>
      同時にステータス画面に全キャラ共通パッシブ「極意」（10項目・各最大Lv10）が解放されます。<br>
      スキル枠と極意はそれぞれ街・ステータス画面からゴールドでリセットしてSPを振り直せます。</p>
    </details>
    <details class="help-det">
      <summary>⚔️ 装備強化（★6〜★9）・神話レア・複数特性</summary>
      <p>★5→★6は上級石、★6→★7は時の欠片（D〜Fのボス）、★7→★8は機神の核（H・Iのボス）、★8→★9は創世の欠片（Oのボス）で強化できます。<br>
      神話レアは通常より高い基礎倍率を持ち、★9神話ドロップ品は武器0〜3個・防具0〜2個の複数特性が付くことがあります。<br>
      ★9神話装備は鍛冶屋の再鍛造で特性数と内容を一括で振り直せます。</p>
    </details>
    <details class="help-det">
      <summary>📖 図鑑・🏆 実績・称号</summary>
      <p>ステータス画面の「📖 図鑑」「🏆 実績」から、遭遇・撃破した敵（全94種）と入手した装備（全22種）、実績（全36種）を確認できます。<br>
      コンプリートや実績達成の報酬は回廊コインと称号のみで、本編クリア前のコインはクリア後にまとめて付与されます。<br>
      獲得した称号はステータス画面で1つ選んで装備でき、キャラ名の横に表示されます。</p>
    </details>
    <details class="help-det">
      <summary>🏆 天蓋の塔 ランキング</summary>
      <p>天蓋の塔カードの「🏆 ランキング」から上位20位と自分の順位換算を確認できます。<br>
      送信設定でニックネーム（1〜12文字）と同意を保存したプレイヤーのみ、自己ベスト更新時に自動で記録が送信されます。<br>
      送信した記録は運営者の確認後に掲載されるため、ランキングへの反映には時間がかかります。</p>
    </details>
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

