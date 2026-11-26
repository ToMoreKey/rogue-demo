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
const SKILL_FX_MAP = {
  // 斬撃（剣系 6種）
  strike:         { cat: 'slash', tier: 'T1', rank: 1, durMs: 360, nodes: 3,  span: 88,  sig: 'slash_t1_single_heavy',   color: 'gold' },
  doubleStab:     { cat: 'slash', tier: 'T1', rank: 1, durMs: 380, nodes: 3,  span: 90,  sig: 'slash_t1_double_stab',    color: 'gold' },
  multi:          { cat: 'slash', tier: 'T1', rank: 1, durMs: 420, nodes: 3,  span: 92,  sig: 'slash_t1_triple_rapid',   color: 'gold' },
  flameSlash:     { cat: 'slash', tier: 'T2', rank: 2, durMs: 480, nodes: 5,  span: 102, sig: 'slash_t2_flame_arc',      color: 'fire' },
  ult:            { cat: 'slash', tier: 'T3', rank: 3, durMs: 560, nodes: 6,  span: 116, sig: 'slash_t3_golden_cross',   color: 'gold' },
  skySlash:       { cat: 'slash', tier: 'T3', rank: 3, durMs: 600, nodes: 6,  span: 120, sig: 'slash_t3_ascending_wind', color: 'wind' },
  heroic:         { cat: 'slash', tier: 'T4', rank: 4, durMs: 700, nodes: 8,  span: 136, sig: 'slash_t4_holy_swords',    color: 'gold' },
  // 魔法（攻撃魔法 8種）
  fireball:       { cat: 'magic', tier: 'T1', rank: 1, durMs: 380, nodes: 4,  span: 84,  sig: 'magic_t1_fireball_shot',  elem: 'fire' },
  thunder:        { cat: 'magic', tier: 'T1', rank: 1, durMs: 400, nodes: 4,  span: 88,  sig: 'magic_t1_twin_bolts',     elem: 'thunder' },
  blaze:          { cat: 'magic', tier: 'T2', rank: 2, durMs: 480, nodes: 6,  span: 100, sig: 'magic_t2_flame_pillar',   elem: 'fire' },
  blizzard:       { cat: 'magic', tier: 'T3', rank: 3, durMs: 580, nodes: 7,  span: 114, sig: 'magic_t3_blizzard_gust',  elem: 'ice' },
  lightningStorm: { cat: 'magic', tier: 'T3', rank: 3, durMs: 600, nodes: 7,  span: 118, sig: 'magic_t3_storm_bolts',    elem: 'thunder' },
  meteor:         { cat: 'magic', tier: 'T3', rank: 3, durMs: 640, nodes: 7,  span: 124, sig: 'magic_t3_meteor_fall',    elem: 'fire' },
  iceAge:         { cat: 'magic', tier: 'T4', rank: 4, durMs: 740, nodes: 9,  span: 148, sig: 'magic_t4_glacier_spikes', elem: 'ice' },
  zeroAbs:        { cat: 'magic', tier: 'T5', rank: 5, durMs: 880, nodes: 11, span: 180, sig: 'magic_t5_zero_shatter',   elem: 'ice' },
  // 大技・奥義（8種）
  ultima:         { cat: 'ult',   tier: 'U1', rank: 1, durMs: 720, nodes: 7,  span: 140, sig: 'ult_u1_void_implode',     style: 'dark' },
  hagun:          { cat: 'ult',   tier: 'U1', rank: 1, durMs: 760, nodes: 7,  span: 150, sig: 'ult_u1_crimson_cleave',   style: 'slash' },
  cosmicNova:     { cat: 'ult',   tier: 'U2', rank: 2, durMs: 840, nodes: 9,  span: 164, sig: 'ult_u2_supernova_burst',  style: 'dark' },
  starSword:      { cat: 'ult',   tier: 'U2', rank: 2, durMs: 860, nodes: 9,  span: 168, sig: 'ult_u2_pentagram_slash',  style: 'slash' },
  tenma:          { cat: 'ult',   tier: 'U3', rank: 3, durMs: 940, nodes: 10, span: 184, sig: 'ult_u3_abyss_sigil_rend', style: 'slash' },
  meteorNova:     { cat: 'ult',   tier: 'U3', rank: 3, durMs: 980, nodes: 10, span: 196, sig: 'ult_u3_meteor_swarm',     style: 'fire' },
  skyStar:        { cat: 'ult',   tier: 'U4', rank: 4, durMs: 1080, nodes: 11, span: 210, sig: 'ult_u4_azure_starfall',  style: 'slash' },
  genesisRay:     { cat: 'ult',   tier: 'U4', rank: 4, durMs: 1180, nodes: 12, span: 240, sig: 'ult_u4_genesis_pillar',  style: 'holy' },
  // 回復（11種）
  firstAid:       { cat: 'heal',  tier: 'H1', rank: 1, durMs: 360, nodes: 4,  span: 66,  sig: 'heal_h1_first_aid' },
  regen:          { cat: 'heal',  tier: 'H1', rank: 1, durMs: 380, nodes: 4,  span: 68,  sig: 'heal_h1_gentle_motes' },
  heal:           { cat: 'heal',  tier: 'H1', rank: 1, durMs: 420, nodes: 5,  span: 78,  sig: 'heal_h1_emerald_ring' },
  highRegen:      { cat: 'heal',  tier: 'H2', rank: 2, durMs: 480, nodes: 6,  span: 90,  sig: 'heal_h2_leaf_spiral' },
  fullheal:       { cat: 'heal',  tier: 'H2', rank: 2, durMs: 520, nodes: 6,  span: 98,  sig: 'heal_h2_vital_column' },
  holyLight:      { cat: 'heal',  tier: 'H3', rank: 3, durMs: 600, nodes: 7,  span: 112, sig: 'heal_h3_platinum_ray' },
  resurrection:   { cat: 'heal',  tier: 'H3', rank: 3, durMs: 640, nodes: 8,  span: 118, sig: 'heal_h3_revive_cross' },
  saintPrayer:    { cat: 'heal',  tier: 'H3', rank: 3, durMs: 640, nodes: 8,  span: 118, sig: 'heal_h3_prayer_diamonds' },
  requiem:        { cat: 'heal',  tier: 'H4', rank: 4, durMs: 740, nodes: 9,  span: 134, sig: 'heal_h4_soul_butterflies' },
  goddess:        { cat: 'heal',  tier: 'H4', rank: 4, durMs: 780, nodes: 10, span: 144, sig: 'heal_h4_goddess_halo' },
  eternal:        { cat: 'heal',  tier: 'H5', rank: 5, durMs: 920, nodes: 12, span: 180, sig: 'heal_h5_eternal_helix' },
  // R1b: キャラ専用スキル（R1b-1は共通の手続き型演出。個別演出はR1b-2）
  rush: { cat: 'slash', tier: 'T1', rank: 1, durMs: 400, nodes: 3, span: 90, sig: 'slash_t1_rush', color: 'wind' },
  phantomSlash: { cat: 'slash', tier: 'T2', rank: 2, durMs: 480, nodes: 5, span: 102, sig: 'slash_t2_phantomSlash', color: 'dark' },
  shadowPierce: { cat: 'slash', tier: 'T3', rank: 3, durMs: 580, nodes: 6, span: 118, sig: 'slash_t3_shadowPierce', color: 'dark' },
  bladeDance: { cat: 'slash', tier: 'T3', rank: 3, durMs: 580, nodes: 6, span: 118, sig: 'slash_t3_bladeDance', color: 'wind' },
  grandHeist: { cat: 'slash', tier: 'T4', rank: 4, durMs: 700, nodes: 8, span: 136, sig: 'slash_t4_grandHeist', color: 'gold' },
  holyBolt: { cat: 'magic', tier: 'T1', rank: 1, durMs: 390, nodes: 4, span: 86, sig: 'magic_t1_holyBolt', elem: 'holy' },
  judgment: { cat: 'magic', tier: 'T2', rank: 2, durMs: 480, nodes: 6, span: 100, sig: 'magic_t2_judgment', elem: 'holy' },
  holyNova: { cat: 'magic', tier: 'T3', rank: 3, durMs: 600, nodes: 7, span: 118, sig: 'magic_t3_holyNova', elem: 'holy' },
  arcaneMiracle: { cat: 'magic', tier: 'T4', rank: 4, durMs: 740, nodes: 9, span: 148, sig: 'magic_t4_arcaneMiracle', elem: 'default' },
  angelMiracle: { cat: 'magic', tier: 'T4', rank: 4, durMs: 740, nodes: 9, span: 148, sig: 'magic_t4_angelMiracle', elem: 'holy' },
  divineWrath: { cat: 'magic', tier: 'T5', rank: 5, durMs: 880, nodes: 11, span: 180, sig: 'magic_t5_divineWrath', elem: 'holy' },
  thousandCuts: { cat: 'ult', tier: 'U1', rank: 1, durMs: 740, nodes: 7, span: 145, sig: 'ult_u1_thousandCuts', style: 'slash' },
  starDust: { cat: 'ult', tier: 'U2', rank: 2, durMs: 850, nodes: 9, span: 166, sig: 'ult_u2_starDust', style: 'dark' },
  celestialLance: { cat: 'ult', tier: 'U2', rank: 2, durMs: 850, nodes: 9, span: 166, sig: 'ult_u2_celestialLance', style: 'holy' },
  trumpCard: { cat: 'ult', tier: 'U2', rank: 2, durMs: 850, nodes: 9, span: 166, sig: 'ult_u2_trumpCard', style: 'slash' },
  nightParade: { cat: 'ult', tier: 'U3', rank: 3, durMs: 960, nodes: 10, span: 190, sig: 'ult_u3_nightParade', style: 'slash' },
  thousandMask: { cat: 'ult', tier: 'U4', rank: 4, durMs: 1100, nodes: 11, span: 215, sig: 'ult_u4_thousandMask', style: 'slash' },
  skyMeteorite: { cat: 'ult', tier: 'U4', rank: 4, durMs: 1100, nodes: 11, span: 215, sig: 'ult_u4_skyMeteorite', style: 'fire' },
  heavenStars: { cat: 'ult', tier: 'U4', rank: 4, durMs: 1100, nodes: 11, span: 215, sig: 'ult_u4_heavenStars', style: 'holy' },
  nightSky: { cat: 'ult', tier: 'U4', rank: 4, durMs: 1150, nodes: 12, span: 235, sig: 'ult_u4_nightSky', style: 'dark' },
  swordGod: { cat: 'ult', tier: 'U4', rank: 4, durMs: 1180, nodes: 12, span: 240, sig: 'ult_u4_swordGod', style: 'slash' },
  endMagic: { cat: 'ult', tier: 'U4', rank: 4, durMs: 1180, nodes: 12, span: 240, sig: 'ult_u4_endMagic', style: 'dark' },
  // 強化（バフ 10種：変更なし）
  guard:          { cat: 'buff',  tone: 'def' },
  magicshield:    { cat: 'buff',  tone: 'def' },
  barrier:        { cat: 'buff',  tone: 'def' },
  holyBarrier:    { cat: 'buff',  tone: 'def' },
  berserk:        { cat: 'buff',  tone: 'atk' },
  warGod:         { cat: 'buff',  tone: 'atk' },
  shura:          { cat: 'buff',  tone: 'atk' },
  kishin:         { cat: 'buff',  tone: 'atk' },
  heroAwaken:     { cat: 'buff',  tone: 'all' },
  heroAdvent:     { cat: 'buff',  tone: 'all' },
  shadowStep: { cat: 'buff', tone: 'def' },
  swiftStance: { cat: 'buff', tone: 'atk' },
  frenzyEdge: { cat: 'buff', tone: 'atk' },
  mirageStance: { cat: 'buff', tone: 'atk' },
  phantomAdvent: { cat: 'buff', tone: 'atk' }
};
const FX_MAX_NODES = 12;
const _battleFxCtx = { cleanupTimer: null, rageBurstTimer: null };
const _fxDbgState = { speed: 1, raged: false, buff: 'none', enemy: 'mob', cleanupTimer: null, rageBurstTimer: null };

function isFxEnabled() {
  return !(G && G.opts && G.opts.fx === false);
}
function isReducedMotion() {
  try {
    if (G && G._forceReducedMotion) return true;
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { return false; }
}
function getSkillFxSpec(id) {
  if (id && SKILL_FX_MAP[id]) return SKILL_FX_MAP[id];
  const s = id && SK[id];
  if (s) {
    if (s.type === 'heal') return { cat: 'heal' };
    if (s.type === 'buff') return { cat: 'buff', tone: (s.awaken || s.advent) ? 'all' : (s.barrier || id === 'guard' || id === 'magicshield') ? 'def' : 'atk' };
  }
  return { cat: 'generic' };
}
function resolveFxTarget(target) {
  if (target && target.isDebug) return target;
  return {
    isDebug: false,
    arena: $('#arena'),
    layer: $('#fx-layer'),
    fp: $('#f-player'),
    fe: $('#f-enemy'),
    nm: $('#b-ename'),
    timerHost: _battleFxCtx,
    speed: Math.max(1, (G.opts && G.opts.speed) || 1),
    forceFx: false
  };
}
function fxDebugTarget() {
  return {
    isDebug: true,
    arena: $('#fxd-arena'),
    layer: $('#fxd-layer'),
    fp: $('#fxd-player'),
    fe: $('#fxd-enemy'),
    nm: $('#fxd-ename'),
    timerHost: _fxDbgState,
    speed: Math.max(1, _fxDbgState.speed || 1),
    forceFx: true,
    buffTone: _fxDbgState.buff
  };
}
function clearSkillFxLayer(target) {
  try {
    const t = resolveFxTarget(target);
    if (t.timerHost && t.timerHost.cleanupTimer) { clearTimeout(t.timerHost.cleanupTimer); t.timerHost.cleanupTimer = null; }
    if (t.layer) t.layer.innerHTML = '';
    if (t.fe) t.fe.classList.remove('fx-hit-white', 'fx-shake-sm', 'fx-shake-big');
  } catch (e) {}
}
function clearRageFx(target) {
  try {
    const t = resolveFxTarget(target);
    if (t.timerHost && t.timerHost.rageBurstTimer) { clearTimeout(t.timerHost.rageBurstTimer); t.timerHost.rageBurstTimer = null; }
    if (t.arena) t.arena.classList.remove('rage-active', 'rage-burst', 'rage-reduced');
    if (t.fe) t.fe.classList.remove('rage-aura', 'rage-burst', 'rage-reduced');
    if (t.nm) t.nm.classList.remove('rage-name');
  } catch (e) {}
}
function clearAllBattleFx(target) {
  clearSkillFxLayer(target);
  clearRageFx(target);
  if (target && target.isDebug && target.fp) {
    target.fp.classList.remove('buff-aura-atk', 'buff-aura-def', 'buff-aura-all');
  }
}
function syncBuffAura(target) {
  try {
    const t = resolveFxTarget(target);
    const fp = t.fp;
    if (!fp) return;
    fp.classList.remove('buff-aura-atk', 'buff-aura-def', 'buff-aura-all');
    if (t.isDebug) {
      const tone = t.buffTone || _fxDbgState.buff;
      if (tone === 'atk' || tone === 'def' || tone === 'all') fp.classList.add('buff-aura-' + tone);
      return;
    }
    const run = G.run;
    if (!run || !isFxEnabled()) return;
    const gb = (run.gen && run.gen.turns > 0) ? run.gen : null;
    if ((run.awaken || 0) > 0 || (run.advent || 0) > 0 || (gb && gb.allMult > 1)) {
      fp.classList.add('buff-aura-all');
    } else if ((run.berserk || 0) > 0 || (run.warGod || 0) > 0 || (run.shura || 0) > 0 || (run.kishin || 0) > 0 || (gb && gb.atkMult > 1)) {
      fp.classList.add('buff-aura-atk');
    } else if ((run.guard || 0) > 0 || (run.magicShield || 0) > 0 || (run.barrier || 0) > 0 || (run.defBuff || 0) > 0 || (gb && gb.defMult > 1)) {
      fp.classList.add('buff-aura-def');
    }
  } catch (e) {}
}
function triggerRageFx(target) {
  try {
    if (G.headless) return;
    const t = resolveFxTarget(target);
    const arena = t.arena, fe = t.fe, nm = t.nm;
    if (nm) nm.classList.add('rage-name');
    if (!t.forceFx && !isFxEnabled()) return;
    const red = isReducedMotion();
    if (arena) arena.classList.add('rage-active');
    if (fe) fe.classList.add('rage-aura');
    if (red) {
      if (arena) arena.classList.add('rage-reduced');
      if (fe) fe.classList.add('rage-reduced');
      return;
    }
    if (arena) { arena.classList.remove('rage-burst'); void arena.offsetWidth; arena.classList.add('rage-burst'); }
    if (fe) { fe.classList.remove('rage-burst'); void fe.offsetWidth; fe.classList.add('rage-burst'); }
    if (t.timerHost && t.timerHost.rageBurstTimer) clearTimeout(t.timerHost.rageBurstTimer);
    if (t.timerHost) {
      t.timerHost.rageBurstTimer = setTimeout(() => {
        t.timerHost.rageBurstTimer = null;
        if (arena) arena.classList.remove('rage-burst');
        if (fe) fe.classList.remove('rage-burst');
      }, 340);
    }
  } catch (e) {}
}
function playSkillFx(id, hitCount, target) {
  try {
    const t = resolveFxTarget(target);
    if (G.headless || (!t.forceFx && !isFxEnabled())) return;
    const layer = t.layer;
    if (!layer) return;
    clearSkillFxLayer(t);
    const spec = getSkillFxSpec(id);
    const cat = spec.cat || 'generic';
    const sig = spec.sig || '';
    const spd = Math.max(1, t.speed || 1);
    const baseMs = spec.durMs || (cat === 'ult' ? 760 : cat === 'magic' ? 480 : cat === 'slash' ? 420 : cat === 'heal' ? 460 : cat === 'buff' ? 460 : 320);
    const maxCap = spec.durMs ? 1200 : (cat === 'ult' ? 900 : 600);
    const dur = clamp(Math.round(baseMs / spd), 150, maxCap);
    const red = isReducedMotion();
    layer.style.setProperty('--fx-dur', dur + 'ms');
    layer.dataset.sig = sig || cat;
    layer.dataset.tier = spec.tier || '';
    layer.dataset.span = String(spec.span || (cat === 'buff' ? 76 : 80));

    const addNode = (cls, html, styleStr) => {
      if (layer.children.length >= FX_MAX_NODES) return null;
      const el = document.createElement('div');
      el.className = 'fx-item ' + cls + (red ? ' fx-reduced' : '');
      if (styleStr) el.style.cssText = styleStr;
      if (html) el.innerHTML = html;
      layer.appendChild(el);
      return el;
    };
    const box = (sz, extra) => `width:${sz}px;height:${sz}px;${extra || ''}`;
    const hitEnemy = (mode) => {
      const fe = t.fe;
      if (!fe) return;
      fe.classList.remove('fx-hit-white', 'fx-shake-sm', 'fx-shake-big');
      void fe.offsetWidth;
      fe.classList.add('fx-hit-white');
      if (mode === 'sm') fe.classList.add('fx-shake-sm');
      else if (mode === 'big') fe.classList.add('fx-shake-big');
    };

    if (red) {
      // prefers-reduced-motion: 閃光・ぶれ・拡大を出さず、短いフェードの色表示のみ
      const side = (cat === 'heal' || cat === 'buff') ? 'fx-side-player' : 'fx-side-enemy';
      const toneCls = cat === 'magic' ? ('fx-elem-' + (spec.elem || 'default'))
                    : cat === 'buff' ? ('fx-tone-' + (spec.tone || 'all'))
                    : ('fx-cat-' + cat);
      addNode(`fx-fade-only ${side} ${toneCls}`, '');
    } else if (cat === 'buff') {
      // 強化（バフ）の演出は変えない
      const tone = spec.tone || 'all';
      addNode(`fx-buff-ring fx-side-player fx-tone-${tone}`, '');
      addNode(`fx-buff-ring fx-buff-ring2 fx-side-player fx-tone-${tone}`, '');
      if (t.isDebug) { _fxDbgState.buff = tone; renderFxDebugControls(); }
      syncBuffAura(t);
    } else if (sig === 'slash_t1_single_heavy') {
      // 強撃 (T1, 3 nodes, 88px): 1本の太い斜め斬撃（白金）と小さな火花2個
      addNode('fx-slash fx-side-enemy sig-strike', `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="12" y1="88" x2="88" y2="12" class="fx-slash-line heavy"/></svg>`, box(88, '--fx-rot:-22deg'));
      addNode('fx-magic-orb fx-side-enemy fx-elem-holy', '', '--dx:-26px;--dy:-18px');
      addNode('fx-magic-orb fx-side-enemy fx-elem-holy', '', '--dx:28px;--dy:16px');
      hitEnemy('');
    } else if (sig === 'slash_t1_double_stab') {
      // ダブルスタブ (T1, 3 nodes, 90px): 素早い2連の突き閃光＋火花1個
      addNode('fx-slash fx-side-enemy sig-doubleStab', `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="8" y1="62" x2="92" y2="38" class="fx-slash-line wind"/></svg>`, box(90, '--fx-rot:-8deg;--fx-off:-6px'));
      addNode('fx-slash fx-side-enemy sig-doubleStab', `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="8" y1="38" x2="92" y2="62" class="fx-slash-line wind"/></svg>`, box(90, `--fx-rot:8deg;--fx-off:6px;animation-delay:${Math.round(dur * 0.25)}ms`));
      addNode('fx-magic-orb fx-side-enemy fx-elem-ice', '', '--dx:26px;--dy:0px');
      hitEnemy('');
    } else if (sig === 'slash_t1_triple_rapid') {
      // 連続斬り (T1, 3 nodes, 92px): 角度の違う細い斬撃3本が時間差で連続
      const rots = [-34, 26, -6], offs = [-10, 10, 0];
      for (let i = 0; i < 3; i++) {
        const d = Math.round(dur * 0.22 * i);
        addNode('fx-slash fx-side-enemy sig-multi', `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="10" y1="90" x2="90" y2="10" class="fx-slash-line thin"/></svg>`, box(92, `--fx-rot:${rots[i]}deg;--fx-off:${offs[i]}px;animation-delay:${d}ms`));
      }
      hitEnemy('');
    } else if (sig === 'slash_t2_flame_arc') {
      // 烈火斬 (T2, 5 nodes, 102px): 炎をまとった円弧の斬撃2段＋火の粉3個
      addNode('fx-a-pop fx-side-enemy sig-flameSlash', `<svg viewBox="0 0 100 100" class="fx-svg"><path d="M12,76 Q50,12 88,32" fill="none" class="fx-slash-line fire"/></svg>`, box(102, '--rot:-10deg'));
      addNode('fx-a-pop fx-side-enemy sig-flameSlash', `<svg viewBox="0 0 100 100" class="fx-svg"><path d="M14,28 Q52,88 88,68" fill="none" class="fx-slash-line fire"/></svg>`, box(102, `--rot:12deg;animation-delay:${Math.round(dur * 0.22)}ms`));
      const sparks = [[-32, -24], [34, -18], [0, -36]];
      for (let i = 0; i < 3; i++) {
        addNode('fx-magic-orb fx-side-enemy fx-elem-fire', '', `--dx:${sparks[i][0]}px;--dy:${sparks[i][1]}px`);
      }
      hitEnemy('sm');
    } else if (sig === 'slash_t3_golden_cross') {
      // 必殺剣 (T3, 6 nodes, 116px): 大きな金の十字（×）斬り2本＋衝撃リング＋短い画面フラッシュ＋火花2＋敵のぶれ
      addNode('fx-ult-bg sig-ult-flash', '');
      addNode('fx-slash fx-side-enemy sig-ult', `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="8" y1="92" x2="92" y2="8" class="fx-slash-line heavy"/></svg>`, box(116, '--fx-rot:0deg'));
      addNode('fx-slash fx-side-enemy sig-ult', `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="8" y1="8" x2="92" y2="92" class="fx-slash-line heavy"/></svg>`, box(116, `--fx-rot:0deg;animation-delay:${Math.round(dur * 0.14)}ms`));
      addNode('fx-a-ring fx-side-enemy', '', box(116, 'border-radius:50%;border:3px solid #ffd45a;box-shadow:0 0 14px #ffd45a'));
      addNode('fx-ult-spark fx-side-enemy', '', '--dx:-42px;--dy:-28px');
      addNode('fx-ult-spark fx-side-enemy', '', '--dx:42px;--dy:28px');
      hitEnemy('sm');
    } else if (sig === 'slash_t3_ascending_wind') {
      // 天翔斬 (T3, 6 nodes, 120px): 下から上へ駆け上がる縦の青白い風刃＋羽根状の衝撃波が左右へ走る
      addNode('fx-a-rise fx-side-enemy sig-skySlash', `<svg viewBox="0 0 100 120" class="fx-svg"><path d="M50,114 Q36,58 50,6 Q64,58 50,114 Z" fill="#e6fbff" filter="drop-shadow(0 0 10px #5ce1ff)"/></svg>`, box(120, '--sx:0px;--sy:24px;--ex:0px;--ey:-26px'));
      addNode('fx-a-pop fx-side-enemy', `<svg viewBox="0 0 100 100" class="fx-svg"><path d="M48,50 Q18,26 6,10 Q24,48 44,64" fill="none" class="fx-slash-line wind"/></svg>`, box(116, '--ox:-18px;--oy:0px'));
      addNode('fx-a-pop fx-side-enemy', `<svg viewBox="0 0 100 100" class="fx-svg"><path d="M52,50 Q82,26 94,10 Q76,48 56,64" fill="none" class="fx-slash-line wind"/></svg>`, box(116, '--ox:18px;--oy:0px'));
      addNode('fx-a-ring fx-side-enemy fx-elem-ice', '', box(112, 'border-radius:50%;border:2.5px solid #88f0ff;box-shadow:0 0 12px #5ce1ff'));
      addNode('fx-magic-orb fx-side-enemy fx-elem-ice', '', '--dx:-44px;--dy:-22px');
      addNode('fx-magic-orb fx-side-enemy fx-elem-ice', '', '--dx:44px;--dy:-22px');
      hitEnemy('sm');
    } else if (sig === 'slash_t4_holy_swords') {
      // 英雄の奇跡 (T4, 8 nodes, 136px): 金色の聖剣3本が上から降り注ぎ敵を貫く＋金の光柱＋衝撃輪＋白金の粒3
      addNode('fx-a-pillar fx-side-enemy sig-heroic', '', 'width:68px;height:136px;background:linear-gradient(180deg,rgba(255,248,200,.15),rgba(255,220,110,.7),rgba(255,250,220,.15));border-radius:34px;filter:drop-shadow(0 0 14px #ffd45a)');
      const sxs = [-26, 0, 26], rots = [12, 0, -12];
      const swordSvg = `<svg viewBox="0 0 40 100" class="fx-svg"><polygon points="20,92 13,34 20,16 27,34" fill="#fffbe0" stroke="#ffd45a" stroke-width="2"/><rect x="8" y="28" width="24" height="5" rx="2" fill="#ffbf3d"/><rect x="17" y="10" width="6" height="18" fill="#ffd45a"/></svg>`;
      for (let i = 0; i < 3; i++) {
        const d = Math.round(dur * 0.14 * i);
        addNode('fx-a-drop fx-side-enemy', swordSvg, `width:44px;height:112px;--sx:${sxs[i]}px;--sy:-58px;--ex:${sxs[i]}px;--ey:6px;--rot:${rots[i]}deg;animation-delay:${d}ms`);
      }
      addNode('fx-a-ring fx-side-enemy', '', box(132, 'border-radius:50%;border:3px solid #fff3b8;box-shadow:0 0 16px #ffd45a'));
      const pts = [[-46, -24], [46, -24], [0, 38]];
      for (let i = 0; i < 3; i++) addNode('fx-ult-spark fx-side-enemy', '', `--dx:${pts[i][0]}px;--dy:${pts[i][1]}px`);
      hitEnemy('big');
    } else if (sig === 'magic_t1_fireball_shot') {
      // ファイアボール (T1, 4 nodes, 84px): 火球が飛んで着弾＋小爆発リング＋火の粉2
      addNode('fx-a-drop fx-side-enemy sig-fireball', '', 'width:26px;height:26px;border-radius:50%;background:radial-gradient(circle,#fff6c0,#ff7b2e 60%,#c82800);box-shadow:0 0 14px #ff6a1a;--sx:-72px;--sy:-18px;--ex:0px;--ey:0px');
      addNode('fx-magic-ring fx-side-enemy fx-elem-fire', '', box(84));
      addNode('fx-magic-orb fx-side-enemy fx-elem-fire', '', '--dx:-28px;--dy:-22px');
      addNode('fx-magic-orb fx-side-enemy fx-elem-fire', '', '--dx:30px;--dy:20px');
      hitEnemy('');
    } else if (sig === 'magic_t1_twin_bolts') {
      // サンダー (T1, 4 nodes, 88px): 稲妻が2本ジグザグに落ちる＋電撃スパーク2
      const boltSvg = `<svg viewBox="0 0 60 110" class="fx-svg"><polyline points="34,4 16,44 36,48 14,104" fill="none" stroke="#fffbe0" stroke-width="5" stroke-linejoin="round" filter="drop-shadow(0 0 8px #ffe14a)"/></svg>`;
      addNode('fx-a-pop fx-side-enemy sig-thunder', boltSvg, 'width:56px;height:96px;--ox:-14px;--oy:-6px');
      addNode('fx-a-pop fx-side-enemy sig-thunder', boltSvg, `width:56px;height:96px;--ox:16px;--oy:-4px;animation-delay:${Math.round(dur * 0.2)}ms`);
      addNode('fx-magic-orb fx-side-enemy fx-elem-thunder', '', '--dx:-28px;--dy:16px');
      addNode('fx-magic-orb fx-side-enemy fx-elem-thunder', '', '--dx:28px;--dy:-16px');
      hitEnemy('');
    } else if (sig === 'magic_t2_flame_pillar') {
      // ブレイズ (T2, 6 nodes, 100px): 敵の足元から炎柱が立ち上る＋熱波リング＋火の粉4
      addNode('fx-a-pillar fx-side-enemy sig-blaze', `<svg viewBox="0 0 70 120" class="fx-svg"><path d="M15,116 Q8,56 35,8 Q62,56 55,116 Z" fill="rgba(255,120,30,.85)" filter="drop-shadow(0 0 12px #ff4500)"/><path d="M25,116 Q22,68 35,26 Q48,68 45,116 Z" fill="#fff2b8"/></svg>`, 'width:68px;height:108px');
      addNode('fx-magic-ring fx-side-enemy fx-elem-fire', '', box(100));
      const emb = [[-32, -32], [32, -30], [-24, 14], [26, 16]];
      for (let i = 0; i < 4; i++) addNode('fx-magic-orb fx-side-enemy fx-elem-fire', '', `--dx:${emb[i][0]}px;--dy:${emb[i][1]}px`);
      hitEnemy('sm');
    } else if (sig === 'magic_t3_blizzard_gust') {
      // ブリザード (T3, 7 nodes, 114px): 氷の結晶・氷片が横殴りに降り注ぐ＋凍結リング
      addNode('fx-magic-ring fx-side-enemy fx-elem-ice sig-blizzard', '', box(114));
      const shardSvg = `<svg viewBox="0 0 40 40" class="fx-svg"><polygon points="20,4 32,20 20,36 8,20" fill="#e0faff" stroke="#5ce1ff" stroke-width="2" filter="drop-shadow(0 0 6px #5ce1ff)"/></svg>`;
      const coords = [[-44, -36, 16, 12], [-34, -18, 28, 22], [-50, 0, 10, 30], [-26, -42, 34, 4], [-38, 12, 22, 34], [-18, -28, 38, 16]];
      for (let i = 0; i < 6; i++) {
        const c = coords[i], d = Math.round(dur * 0.08 * i);
        addNode('fx-a-drop fx-side-enemy', shardSvg, `width:28px;height:28px;--sx:${c[0]}px;--sy:${c[1]}px;--ex:${c[2]}px;--ey:${c[3]}px;--rot:35deg;animation-delay:${d}ms`);
      }
      hitEnemy('sm');
    } else if (sig === 'magic_t3_storm_bolts') {
      // ライトニングストーム (T3, 7 nodes, 118px): 画面上部から4本の稲妻が連続落下＋帯電リング＋帯電スパーク2
      const boltSvg = `<svg viewBox="0 0 50 120" class="fx-svg"><polyline points="28,2 12,42 32,48 10,84 28,88 14,118" fill="none" stroke="#fffef0" stroke-width="5" stroke-linejoin="round" filter="drop-shadow(0 0 10px #ffe14a)"/></svg>`;
      const xs = [-32, -10, 12, 34];
      for (let i = 0; i < 4; i++) {
        const d = Math.round(dur * 0.13 * i);
        addNode('fx-a-pop fx-side-enemy sig-lightningStorm', boltSvg, `width:48px;height:118px;--ox:${xs[i]}px;--oy:-6px;animation-delay:${d}ms`);
      }
      addNode('fx-magic-ring fx-side-enemy fx-elem-thunder', '', box(118));
      addNode('fx-magic-orb fx-side-enemy fx-elem-thunder', '', '--dx:-44px;--dy:0px');
      addNode('fx-magic-orb fx-side-enemy fx-elem-thunder', '', '--dx:44px;--dy:0px');
      hitEnemy('sm');
    } else if (sig === 'magic_t3_meteor_fall') {
      // メテオ (T3, 7 nodes, 124px): 上空から巨大隕石が落下着弾＋爆発クレーターリング2重＋破片4
      const metSvg = `<svg viewBox="0 0 80 80" class="fx-svg"><circle cx="40" cy="44" r="22" fill="#ff551a" stroke="#fff0b8" stroke-width="3" filter="drop-shadow(0 0 12px #ff3300)"/><path d="M22,30 L8,6 L34,20 Z" fill="#ffae42"/></svg>`;
      addNode('fx-a-drop fx-side-enemy sig-meteor', metSvg, 'width:76px;height:76px;--sx:-42px;--sy:-64px;--ex:0px;--ey:4px');
      addNode('fx-magic-ring fx-side-enemy fx-elem-fire', '', box(124));
      addNode('fx-a-ring fx-side-enemy', '', `width:116px;height:44px;border-radius:50%;border:3px solid #ff9a2e;box-shadow:0 0 14px #ff5500;--oy:22px`);
      const frags = [[-44, -26], [44, -26], [-38, 24], [38, 24]];
      for (let i = 0; i < 4; i++) addNode('fx-magic-orb fx-side-enemy fx-elem-fire', '', `--dx:${frags[i][0]}px;--dy:${frags[i][1]}px`);
      hitEnemy('sm');
    } else if (sig === 'magic_t4_glacier_spikes') {
      // アイスエイジ (T4, 9 nodes, 148px): 画面全体が霜で青白く染まり、地面から大きな氷柱が5本生える＋冷気粒3
      addNode('fx-ult-bg fx-ult-ice sig-iceAge', '');
      const spikeSvg = `<svg viewBox="0 0 44 110" class="fx-svg"><polygon points="22,6 38,104 6,104" fill="rgba(190,248,255,.88)" stroke="#fff" stroke-width="2" filter="drop-shadow(0 0 10px #5ce1ff)"/></svg>`;
      const spx = [-44, -22, 0, 22, 44], sph = [86, 104, 122, 104, 86];
      for (let i = 0; i < 5; i++) {
        const d = Math.round(dur * 0.08 * Math.abs(i - 2));
        addNode('fx-a-pillar fx-side-enemy', spikeSvg, `width:38px;height:${sph[i]}px;--ox:${spx[i]}px;animation-delay:${d}ms`);
      }
      const frost = [[-52, -32], [52, -32], [0, -48]];
      for (let i = 0; i < 3; i++) addNode('fx-magic-orb fx-side-enemy fx-elem-ice', '', `--dx:${frost[i][0]}px;--dy:${frost[i][1]}px`);
      hitEnemy('big');
    } else if (sig === 'magic_t5_zero_shatter') {
      // 絶対零度 (T5, 11 nodes, 180px): 青白い閃光＋暗転→敵が巨大氷塊に閉じ込められ亀裂が入って粉砕（破片7＋衝撃波）
      addNode('fx-ult-bg fx-ult-ice sig-zeroAbs', '');
      const coffinSvg = `<svg viewBox="0 0 120 140" class="fx-svg"><polygon points="60,6 108,36 108,104 60,134 12,104 12,36" fill="rgba(165,242,255,.45)" stroke="#fff" stroke-width="3.5" filter="drop-shadow(0 0 16px #5ce1ff)"/><polyline points="60,14 48,64 74,78 52,126" fill="none" stroke="#fff" stroke-width="3"/><polyline points="22,52 60,66 98,48" fill="none" stroke="#fff" stroke-width="2.5"/></svg>`;
      addNode('fx-a-pop fx-side-enemy', coffinSvg, 'width:128px;height:142px');
      addNode('fx-a-ring fx-side-enemy', '', box(160, 'border-radius:50%;border:3.5px solid #e6fcff;box-shadow:0 0 20px #5ce1ff'));
      addNode('fx-a-ring fx-side-enemy', '', box(120, 'border-radius:50%;border:2px dashed #88f0ff'));
      const sh = [0, 52, 104, 156, 208, 260, 312];
      for (let i = 0; i < 7; i++) {
        const rad = sh[i] * Math.PI / 180;
        const dx = Math.round(Math.cos(rad) * 58), dy = Math.round(Math.sin(rad) * 58);
        addNode('fx-magic-orb fx-side-enemy fx-elem-ice', '', `--dx:${dx}px;--dy:${dy}px`);
      }
      hitEnemy('big');
    } else if (sig === 'ult_u1_void_implode') {
      // アルテマ (U1, 7 nodes, 140px): 暗い球体が収束→紫白の爆発（暗転＋重力球コア＋収束球4＋爆発リング）
      addNode('fx-ult-bg fx-ult-dark sig-ultima', '');
      addNode('fx-a-pop fx-side-enemy', '', box(96, 'border-radius:50%;background:radial-gradient(circle,#fff,#9b30ff 45%,#120024 75%);box-shadow:0 0 22px #b56bff'));
      addNode('fx-a-ring fx-side-enemy', '', box(140, 'border-radius:50%;border:3.5px solid #e2b8ff;box-shadow:0 0 18px #b56bff'));
      const conv = [[-54, -42], [54, -42], [-54, 42], [54, 42]];
      for (let i = 0; i < 4; i++) {
        addNode('fx-a-conv fx-side-enemy', '', `width:14px;height:14px;border-radius:50%;background:#e2b8ff;box-shadow:0 0 10px #b56bff;--sx:${conv[i][0]}px;--sy:${conv[i][1]}px`);
      }
      hitEnemy('big');
    } else if (sig === 'ult_u1_crimson_cleave') {
      // 破軍の剣 (U1, 7 nodes, 150px): 巨大な赤い一閃が画面を横断＋暗転＋衝撃リング＋紅閃スパーク4
      addNode('fx-ult-bg fx-ult-crimson sig-hagun', '');
      const cleaveSvg = `<svg viewBox="0 0 220 90" class="fx-svg"><path d="M6,68 Q110,24 214,32 Q110,48 6,68 Z" fill="#fff0f3" stroke="#ff1a4b" stroke-width="3" filter="drop-shadow(0 0 16px #ff1a4b)"/></svg>`;
      addNode('fx-a-sweep fx-full', cleaveSvg, 'top:18%;height:64%');
      addNode('fx-a-ring fx-side-enemy', '', box(136, 'border-radius:50%;border:3px solid #ff4d6d;box-shadow:0 0 16px #ff1a4b'));
      const sp = [[-52, -24], [52, -24], [-42, 28], [42, 28]];
      for (let i = 0; i < 4; i++) addNode('fx-ult-spark fx-side-enemy', '', `--dx:${sp[i][0]}px;--dy:${sp[i][1]}px`);
      hitEnemy('big');
    } else if (sig === 'ult_u2_supernova_burst') {
      // コズミックノヴァ (U2, 9 nodes, 164px): 小さな星々が敵に収束→超新星の爆発（白〜青紫）＋画面フラッシュ
      addNode('fx-ult-bg fx-ult-dark sig-cosmicNova', '');
      const starSvg = `<svg viewBox="0 0 120 120" class="fx-svg"><circle cx="60" cy="60" r="40" fill="none" stroke="#d8b8ff" stroke-width="3"/><polygon points="60,6 70,48 114,60 70,72 60,114 50,72 6,60 50,48" fill="#fff" filter="drop-shadow(0 0 14px #9b7aff)"/></svg>`;
      addNode('fx-ult-core fx-side-enemy', starSvg, box(132));
      addNode('fx-a-ring fx-side-enemy', '', box(164, 'border-radius:50%;border:3px solid #b8d8ff;box-shadow:0 0 20px #8a7aff'));
      for (let i = 0; i < 6; i++) {
        const rad = (i * 60) * Math.PI / 180;
        const sx = Math.round(Math.cos(rad) * 64), sy = Math.round(Math.sin(rad) * 64);
        addNode('fx-a-conv fx-side-enemy', '', `width:12px;height:12px;border-radius:50%;background:#fff;box-shadow:0 0 12px #7ad0ff;--sx:${sx}px;--sy:${sy}px`);
      }
      hitEnemy('big');
    } else if (sig === 'ult_u2_pentagram_slash') {
      // 星剣の極意 (U2, 9 nodes, 168px): 星形（五芒星）の軌跡を5連の斬撃でなぞる（金）＋外周リング＋頂点光2
      addNode('fx-ult-bg sig-starSword', '');
      const starLines = [
        [50, 8, 82, 90], [82, 90, 10, 38], [10, 38, 90, 38], [90, 38, 18, 90], [18, 90, 50, 8]
      ];
      for (let i = 0; i < 5; i++) {
        const L = starLines[i], d = Math.round(dur * 0.1 * i);
        addNode('fx-a-pop fx-side-enemy', `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="${L[0]}" y1="${L[1]}" x2="${L[2]}" y2="${L[3]}" class="fx-slash-line"/></svg>`, box(136, `animation-delay:${d}ms`));
      }
      addNode('fx-a-ring fx-side-enemy', '', box(168, 'border-radius:50%;border:3px solid #ffd45a;box-shadow:0 0 18px #ffbf3d'));
      addNode('fx-ult-spark fx-side-enemy', '', '--dx:0px;--dy:-58px');
      addNode('fx-ult-spark fx-side-enemy', '', '--dx:0px;--dy:58px');
      hitEnemy('big');
    } else if (sig === 'ult_u3_abyss_sigil_rend') {
      // 天魔滅殺斬 (U3, 10 nodes, 184px): 紫黒の回転魔法陣が足元に出て、4連の魔剣斬撃が連鎖＋衝撃波＋闇スパーク3
      addNode('fx-ult-bg fx-ult-dark sig-tenma', '');
      const sigilSvg = `<svg viewBox="0 0 120 120" class="fx-svg"><circle cx="60" cy="60" r="52" fill="none" stroke="#c56bff" stroke-width="3" stroke-dasharray="10 6"/><polygon points="60,12 102,84 18,84" fill="none" stroke="#ff66b2" stroke-width="2.5"/><polygon points="60,108 102,36 18,36" fill="none" stroke="#c56bff" stroke-width="2.5"/></svg>`;
      addNode('fx-a-spin fx-side-enemy', sigilSvg, box(148, '--rot:220deg'));
      const rots = [-40, 40, -15, 75];
      for (let i = 0; i < 4; i++) {
        const d = Math.round(dur * 0.11 * i);
        addNode('fx-slash fx-side-enemy', `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="6" y1="94" x2="94" y2="6" class="fx-slash-line dark heavy"/></svg>`, box(138, `--fx-rot:${rots[i]}deg;animation-delay:${d}ms`));
      }
      addNode('fx-a-ring fx-side-enemy', '', box(184, 'border-radius:50%;border:3.5px solid #c56bff;box-shadow:0 0 22px #9b30ff'));
      const dsp = [[-58, -36], [58, -36], [0, 56]];
      for (let i = 0; i < 3; i++) addNode('fx-magic-orb fx-side-enemy fx-elem-dark', '', `--dx:${dsp[i][0]}px;--dy:${dsp[i][1]}px`);
      hitEnemy('big');
    } else if (sig === 'ult_u3_meteor_swarm') {
      // メテオノヴァ (U3, 10 nodes, 196px): 複数の隕石(4個)が降り注ぎ、巨大な炎の爆発ドームが画面の半分を覆う
      addNode('fx-ult-bg fx-ult-fire sig-meteorNova', '');
      addNode('fx-a-pop fx-half-enemy', '', 'background:radial-gradient(circle at 55% 50%,rgba(255,235,150,.85),rgba(255,90,20,.65) 55%,transparent 78%)');
      const mSvg = `<svg viewBox="0 0 60 60" class="fx-svg"><circle cx="30" cy="34" r="16" fill="#ff4500" stroke="#fff2b8" stroke-width="2.5" filter="drop-shadow(0 0 10px #ff3300)"/><path d="M16,22 L4,4 L26,14 Z" fill="#ffae42"/></svg>`;
      const mCoords = [[-48, -68, -22, -10], [-18, -74, 8, 6], [12, -66, 28, -4], [-32, -56, -6, 18]];
      for (let i = 0; i < 4; i++) {
        const c = mCoords[i], d = Math.round(dur * 0.1 * i);
        addNode('fx-a-drop fx-side-enemy', mSvg, `width:58px;height:58px;--sx:${c[0]}px;--sy:${c[1]}px;--ex:${c[2]}px;--ey:${c[3]}px;animation-delay:${d}ms`);
      }
      addNode('fx-a-ring fx-side-enemy', '', box(196, 'border-radius:50%;border:4px solid #ffae42;box-shadow:0 0 24px #ff4500'));
      const fsp = [[-64, -34], [64, -34], [0, -64]];
      for (let i = 0; i < 3; i++) addNode('fx-ult-spark fx-side-enemy', '', `--dx:${fsp[i][0]}px;--dy:${fsp[i][1]}px`);
      hitEnemy('big');
    } else if (sig === 'ult_u4_azure_starfall') {
      // 蒼穹星剣 (U4, 11 nodes, 210px): 青い星剣6本が空から降り注ぎ、着弾ごとに星の輝き＋空色の閃光
      addNode('fx-ult-bg fx-ult-sky sig-skyStar', '');
      const azSword = `<svg viewBox="0 0 36 100" class="fx-svg"><polygon points="18,94 11,30 18,10 25,30" fill="#e6fcff" stroke="#4ad8ff" stroke-width="2" filter="drop-shadow(0 0 10px #38b6ff)"/><rect x="7" y="26" width="22" height="5" rx="2" fill="#88f0ff"/></svg>`;
      const xs = [-45, -27, -9, 9, 27, 45];
      for (let i = 0; i < 6; i++) {
        const d = Math.round(dur * 0.08 * i);
        addNode('fx-a-drop fx-side-enemy', azSword, `width:38px;height:112px;--sx:${xs[i]}px;--sy:-68px;--ex:${xs[i]}px;--ey:8px;animation-delay:${d}ms`);
      }
      addNode('fx-a-ring fx-side-enemy', '', box(210, 'border-radius:50%;border:4px solid #88f0ff;box-shadow:0 0 24px #38b6ff'));
      const bsp = [[-66, -24], [66, -24], [0, 62]];
      for (let i = 0; i < 3; i++) addNode('fx-magic-orb fx-side-enemy fx-elem-ice', '', `--dx:${bsp[i][0]}px;--dy:${bsp[i][1]}px`);
      hitEnemy('big');
    } else if (sig === 'ult_u4_genesis_pillar') {
      // 創世の光 (U4, 12 nodes, 240px): 天から巨大な白金の光柱＋全画面に広がる光の波紋3重＋創世の星紋＋白金光粒6（最上位）
      addNode('fx-ult-bg fx-ult-holy sig-genesisRay', '');
      addNode('fx-a-pillar fx-side-enemy', '', 'width:118px;height:220px;background:linear-gradient(180deg,#fff,rgba(255,248,200,.92) 50%,rgba(255,215,100,.3));border-radius:56px;box-shadow:0 0 32px 10px #fff6c8');
      const crestSvg = `<svg viewBox="0 0 140 140" class="fx-svg"><circle cx="70" cy="70" r="56" fill="none" stroke="#fff" stroke-width="3.5"/><polygon points="70,4 82,56 136,70 82,84 70,136 58,84 4,70 58,56" fill="#fffef2" filter="drop-shadow(0 0 16px #ffd45a)"/></svg>`;
      addNode('fx-a-spin fx-side-enemy', crestSvg, box(160, '--rot:180deg'));
      addNode('fx-a-ring fx-side-enemy', '', box(240, 'border-radius:50%;border:4px solid #fff;box-shadow:0 0 28px #ffd45a'));
      addNode('fx-a-ring fx-side-enemy', '', box(180, `border-radius:50%;border:3px solid #ffe699;animation-delay:${Math.round(dur * 0.12)}ms`));
      addNode('fx-a-ring fx-side-enemy', '', box(130, `border-radius:50%;border:2.5px solid #fff;animation-delay:${Math.round(dur * 0.24)}ms`));
      for (let i = 0; i < 6; i++) {
        const rad = (i * 60) * Math.PI / 180;
        const dx = Math.round(Math.cos(rad) * 76), dy = Math.round(Math.sin(rad) * 76);
        addNode('fx-ult-spark fx-side-enemy', '', `--dx:${dx}px;--dy:${dy}px`);
      }
      hitEnemy('big');
    } else if (sig === 'heal_h1_first_aid') {
      // 応急手当 (H1, 4 nodes, 66px): 小さな緑十字＋回復粒3個
      const crossSvg = `<svg viewBox="0 0 32 32" class="fx-svg"><rect x="13" y="5" width="6" height="22" rx="1.5" fill="#98ffd0"/><rect x="5" y="13" width="22" height="6" rx="1.5" fill="#98ffd0"/></svg>`;
      addNode('fx-a-pop fx-side-player sig-firstAid', crossSvg, box(44));
      const xs = [-14, 0, 14];
      for (let i = 0; i < 3; i++) addNode('fx-heal-mote fx-side-player', '', `--hx:${xs[i]}px;animation-delay:${i * 25}ms`);
    } else if (sig === 'heal_h1_gentle_motes') {
      // リジェネ (H1, 4 nodes, 68px): 小さな緑の光の粒4個がゆっくり上昇（控えめ）
      const xs = [-16, -5, 6, 17];
      for (let i = 0; i < 4; i++) {
        addNode('fx-heal-mote fx-side-player sig-regen', '', `--hx:${xs[i]}px;animation-delay:${i * 35}ms`);
      }
    } else if (sig === 'heal_h1_emerald_ring') {
      // ヒール (H1, 5 nodes, 78px): 緑の光輪＋粒4
      addNode('fx-heal-glow fx-side-player sig-heal', '', box(78));
      const xs = [-18, -6, 6, 18];
      for (let i = 0; i < 4; i++) {
        addNode('fx-heal-mote fx-side-player', '', `--hx:${xs[i]}px;animation-delay:${i * 25}ms`);
      }
    } else if (sig === 'heal_h2_leaf_spiral') {
      // ハイリジェネ (H2, 6 nodes, 90px): 若葉形の光4枚が昇り、リングが2重に脈動
      addNode('fx-a-ring fx-side-player sig-highRegen', '', box(90, 'border-radius:50%;border:2.5px solid #58c98a;box-shadow:0 0 12px #58c98a'));
      addNode('fx-a-ring fx-side-player', '', box(66, `border-radius:50%;border:2px solid #a8ffce;animation-delay:${Math.round(dur * 0.16)}ms`));
      const leafSvg = `<svg viewBox="0 0 24 24" class="fx-svg"><path d="M4,20 Q4,4 20,4 Q20,20 4,20 Z" fill="#88f5b6" filter="drop-shadow(0 0 6px #58c98a)"/></svg>`;
      const lxs = [-22, -8, 8, 22];
      for (let i = 0; i < 4; i++) {
        addNode('fx-a-rise fx-side-player', leafSvg, `width:18px;height:18px;--sx:${lxs[i]}px;--sy:20px;--ex:${-lxs[i]}px;--ey:-34px;animation-delay:${i * 30}ms`);
      }
    } else if (sig === 'heal_h2_vital_column') {
      // フルヒール (H2, 6 nodes, 98px): 縦の大きな緑の光柱が勇者を包む＋光輪＋粒4
      addNode('fx-a-pillar fx-side-player sig-fullheal', '', 'width:56px;height:112px;background:linear-gradient(180deg,rgba(120,255,180,.15),rgba(88,201,138,.72),rgba(180,255,210,.2));border-radius:28px;box-shadow:0 0 16px #58c98a');
      addNode('fx-heal-glow fx-side-player', '', box(98));
      const xs = [-24, -8, 8, 24];
      for (let i = 0; i < 4; i++) addNode('fx-heal-mote fx-side-player', '', `--hx:${xs[i]}px;animation-delay:${i * 22}ms`);
    } else if (sig === 'heal_h3_platinum_ray') {
      // ホーリーライト (H3, 7 nodes, 112px): 天から白金の光柱が差し込む＋聖光リング＋きらめき5
      addNode('fx-a-pillar fx-side-player sig-holyLight', '', 'width:66px;height:124px;background:linear-gradient(180deg,rgba(255,252,220,.9),rgba(255,230,150,.55),transparent);border-radius:32px;box-shadow:0 0 20px #fff3b8');
      addNode('fx-a-ring fx-side-player', '', box(112, 'border-radius:50%;border:3px solid #fff3b8;box-shadow:0 0 14px #ffd45a'));
      const sp = [[-28, -28], [28, -28], [-34, 6], [34, 6], [0, -42]];
      for (let i = 0; i < 5; i++) addNode('fx-ult-spark fx-side-player', '', `--dx:${sp[i][0]}px;--dy:${sp[i][1]}px`);
    } else if (sig === 'heal_h3_revive_cross') {
      // リザレクション (H3, 8 nodes, 118px): 足元に魔法陣＋黄金の十字架＋舞い上がる羽根6枚
      const crossSvg = `<svg viewBox="0 0 80 80" class="fx-svg"><rect x="33" y="10" width="14" height="60" rx="3" fill="#fffbe0" filter="drop-shadow(0 0 10px #ffd45a)"/><rect x="16" y="26" width="48" height="14" rx="3" fill="#fffbe0" filter="drop-shadow(0 0 10px #ffd45a)"/></svg>`;
      addNode('fx-a-pop fx-side-player sig-resurrection', crossSvg, box(84));
      addNode('fx-a-ring fx-side-player', '', 'width:118px;height:44px;border-radius:50%;border:3px solid #ffd45a;box-shadow:0 0 16px #ffd45a;--oy:24px');
      const featherSvg = `<svg viewBox="0 0 24 24" class="fx-svg"><path d="M4,18 Q10,4 22,6 Q14,16 4,18 Z" fill="#fff" filter="drop-shadow(0 0 5px #ffd45a)"/></svg>`;
      const fxs = [-32, -18, -6, 8, 20, 32];
      for (let i = 0; i < 6; i++) {
        addNode('fx-a-rise fx-side-player', featherSvg, `width:18px;height:18px;--sx:${fxs[i]}px;--sy:24px;--ex:${fxs[i]}px;--ey:-38px;animation-delay:${i * 22}ms`);
      }
    } else if (sig === 'heal_h3_prayer_diamonds') {
      // 聖女の祈り (H3, 8 nodes, 118px): 祈りの輪2重とひし形の光6個が周りを回りながら上昇
      addNode('fx-a-ring fx-side-player sig-saintPrayer', '', box(118, 'border-radius:50%;border:3px solid #98ffd0;box-shadow:0 0 16px #58c98a'));
      addNode('fx-a-ring fx-side-player', '', box(84, 'border-radius:50%;border:2px dashed #fff'));
      const diaSvg = `<svg viewBox="0 0 24 24" class="fx-svg"><polygon points="12,2 22,12 12,22 2,12" fill="#e0fff0" stroke="#58c98a" stroke-width="1.5"/></svg>`;
      const dxs = [-34, -20, -7, 7, 20, 34];
      for (let i = 0; i < 6; i++) {
        addNode('fx-a-rise fx-side-player', diaSvg, `width:20px;height:20px;--sx:${dxs[i]}px;--sy:22px;--ex:${-dxs[i]}px;--ey:-36px;animation-delay:${i * 24}ms`);
      }
    } else if (sig === 'heal_h4_soul_butterflies') {
      // レクイエム (H4, 9 nodes, 134px): 青白い鎮魂の光輪2重＋舞う蝶3頭＋花びら4枚
      addNode('fx-a-pop fx-side-player sig-requiem', '', box(134, 'border-radius:50%;background:radial-gradient(circle,rgba(140,235,255,.45),rgba(120,160,255,.2) 60%,transparent 75%)'));
      addNode('fx-a-ring fx-side-player', '', box(130, 'border-radius:50%;border:3px solid #88f0ff;box-shadow:0 0 18px #5ce1ff'));
      const bflySvg = `<svg viewBox="0 0 32 32" class="fx-svg"><path d="M16,16 Q4,4 4,14 Q4,24 16,18 Q28,24 28,14 Q28,4 16,16 Z" fill="#c8f8ff" filter="drop-shadow(0 0 6px #5ce1ff)"/></svg>`;
      const bxs = [-26, 0, 26];
      for (let i = 0; i < 3; i++) {
        addNode('fx-a-rise fx-side-player', bflySvg, `width:26px;height:26px;--sx:${bxs[i]}px;--sy:24px;--ex:${-bxs[i]}px;--ey:-42px;animation-delay:${i * 30}ms`);
      }
      const pxs = [[-38, -28], [38, -28], [-32, 18], [32, 18]];
      for (let i = 0; i < 4; i++) addNode('fx-magic-orb fx-side-player fx-elem-ice', '', `--dx:${pxs[i][0]}px;--dy:${pxs[i][1]}px`);
    } else if (sig === 'heal_h4_goddess_halo') {
      // 女神の奇跡 (H4, 10 nodes, 144px): 女神の光輪（ハロー）＋白金の光柱＋羽根6枚が舞い降りる＋聖光リング2
      const haloSvg = `<svg viewBox="0 0 100 50" class="fx-svg"><ellipse cx="50" cy="25" rx="42" ry="14" fill="none" stroke="#fff6c8" stroke-width="5" filter="drop-shadow(0 0 12px #ffd45a)"/></svg>`;
      addNode('fx-a-pop fx-side-player sig-goddess', haloSvg, 'width:104px;height:52px;--oy:-38px');
      addNode('fx-a-pillar fx-side-player', '', 'width:82px;height:144px;background:linear-gradient(180deg,rgba(255,250,210,.78),rgba(255,220,130,.35),transparent);border-radius:40px');
      addNode('fx-a-ring fx-side-player', '', box(144, 'border-radius:50%;border:3.5px solid #fff3b8;box-shadow:0 0 20px #ffd45a'));
      addNode('fx-a-ring fx-side-player', '', box(106, 'border-radius:50%;border:2px solid #ffd45a'));
      const featherSvg = `<svg viewBox="0 0 24 24" class="fx-svg"><path d="M4,18 Q10,4 22,6 Q14,16 4,18 Z" fill="#fffef2" filter="drop-shadow(0 0 6px #ffd45a)"/></svg>`;
      const fxs = [-36, -22, -8, 8, 22, 36];
      for (let i = 0; i < 6; i++) {
        addNode('fx-a-drop fx-side-player', featherSvg, `width:20px;height:20px;--sx:${fxs[i]}px;--sy:-46px;--ex:${-fxs[i] * 0.5}px;--ey:24px;animation-delay:${i * 22}ms`);
      }
    } else if (sig === 'heal_h5_eternal_helix') {
      // 永劫の祈り (H5, 12 nodes, 180px): 永遠の二重螺旋と巨大な光輪、勇者側の画面全体を包む（回復の最上位）
      addNode('fx-ult-bg fx-ult-heal sig-eternal', '');
      const helixSvg = `<svg viewBox="0 0 100 140" class="fx-svg"><path d="M22,132 C78,102 22,68 78,38 C40,18 28,8 50,4" fill="none" stroke="#98ffd0" stroke-width="4.5" filter="drop-shadow(0 0 10px #58c98a)"/><path d="M78,132 C22,102 78,68 22,38 C60,18 72,8 50,4" fill="none" stroke="#fff6c8" stroke-width="4.5" filter="drop-shadow(0 0 10px #ffd45a)"/></svg>`;
      addNode('fx-a-pop fx-side-player', helixSvg, 'width:116px;height:152px');
      const wheelSvg = `<svg viewBox="0 0 140 140" class="fx-svg"><circle cx="70" cy="70" r="60" fill="none" stroke="#fff6c8" stroke-width="3" stroke-dasharray="12 6"/><polygon points="70,8 84,56 132,70 84,84 70,132 56,84 8,70 56,56" fill="none" stroke="#98ffd0" stroke-width="2.5"/></svg>`;
      addNode('fx-a-spin fx-side-player', wheelSvg, box(164, '--rot:180deg'));
      addNode('fx-a-ring fx-side-player', '', box(180, 'border-radius:50%;border:4px solid #fff6c8;box-shadow:0 0 24px #58c98a'));
      addNode('fx-a-ring fx-side-player', '', box(136, `border-radius:50%;border:3px solid #98ffd0;animation-delay:${Math.round(dur * 0.12)}ms`));
      addNode('fx-a-ring fx-side-player', '', box(96, `border-radius:50%;border:2px solid #fff;animation-delay:${Math.round(dur * 0.24)}ms`));
      for (let i = 0; i < 6; i++) {
        const rad = (i * 60) * Math.PI / 180;
        const dx = Math.round(Math.cos(rad) * 64), dy = Math.round(Math.sin(rad) * 64);
        addNode('fx-ult-spark fx-side-player', '', `--dx:${dx}px;--dy:${dy}px`);
      }
    } else if (FX_CUSTOM[id] && (cat === 'slash' || cat === 'magic' || cat === 'ult')) {
      // R1b-2: キャラ専用スキルの個別演出（61_fx_custom.js）
      FX_CUSTOM[id]({ id, add: addNode, box, dur, spec });
      hitEnemy(cat === 'ult' || (spec.rank || 1) >= 4 ? 'big' : (spec.rank || 1) >= 2 ? 'sm' : '');
    } else if (spec.proc && (cat === 'slash' || cat === 'magic' || cat === 'ult')) {
      // R1b-1: 手続き型の共通演出（R1b-2で各スキルの個別演出に差し替える）。ノード数＝spec.nodes、DOMは sig-<id> クラスでスキルごとに異なる
      const n = spec.nodes, rank = spec.rank || 1, sc = 'sig-' + id;
      if (cat === 'slash') {
        const lc = spec.color === 'fire' ? 'fire' : spec.color === 'wind' ? 'wind' : spec.color === 'dark' ? 'dark' : 'heavy';
        for (let i = 0; i < n; i++) {
          const rot = ((i * 47) % 80) - 40, off = ((i * 13) % 24) - 12, d = Math.round(dur * 0.5 / n * i);
          addNode(`fx-slash fx-side-enemy ${sc}`, `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="12" y1="88" x2="88" y2="12" class="fx-slash-line ${lc}"/></svg>`, box(spec.span, `--fx-rot:${rot}deg;--fx-off:${off}px;animation-delay:${d}ms`));
        }
        hitEnemy(rank >= 3 ? 'big' : 'sm');
      } else if (cat === 'magic') {
        const el = spec.elem || 'default';
        addNode(`fx-a-ring fx-side-enemy fx-elem-${el} ${sc}`, '', box(spec.span, 'border-radius:50%;border:3px solid #fff;box-shadow:0 0 18px currentColor'));
        const r = Math.round(spec.span * 0.34);
        for (let i = 0; i < n - 1; i++) {
          const a = (i / Math.max(1, n - 1)) * Math.PI * 2;
          addNode(`fx-magic-orb fx-side-enemy fx-elem-${el}`, '', `--dx:${Math.round(Math.cos(a) * r)}px;--dy:${Math.round(Math.sin(a) * r)}px`);
        }
        hitEnemy(rank >= 4 ? 'big' : 'sm');
      } else {
        const st = spec.style === 'slash' ? 'crimson' : (spec.style || 'dark');
        addNode(`fx-ult-bg fx-ult-${st} ${sc}`, '');
        const r = Math.round(spec.span * 0.36);
        for (let i = 0; i < n - 1; i++) {
          const a = (i / Math.max(1, n - 1)) * Math.PI * 2;
          if (spec.style === 'slash' && i % 2 === 0) {
            addNode('fx-slash fx-side-enemy', `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="12" y1="88" x2="88" y2="12" class="fx-slash-line crimson"/></svg>`, box(Math.round(spec.span * 0.6), `--fx-rot:${((i * 53) % 90) - 45}deg;--fx-off:${((i * 17) % 30) - 15}px;animation-delay:${Math.round(dur * 0.05 * i)}ms`));
          } else {
            addNode('fx-ult-spark fx-side-enemy', '', `--dx:${Math.round(Math.cos(a) * r)}px;--dy:${Math.round(Math.sin(a) * r)}px`);
          }
        }
        hitEnemy('big');
      }
    } else if (cat === 'heal') {
      // 未登録healの汎用フォールバック
      addNode('fx-heal-glow fx-side-player', '');
      const xs = [-18, 0, 18];
      for (let i = 0; i < xs.length; i++) addNode('fx-heal-mote fx-side-player', '', `--hx:${xs[i]}px`);
    } else {
      // 未登録スキルの汎用フォールバック
      addNode('fx-generic-flash fx-side-enemy', '');
    }

    if (t.timerHost) {
      t.timerHost.cleanupTimer = setTimeout(() => {
        t.timerHost.cleanupTimer = null;
        clearSkillFxLayer(t);
      }, dur + 30);
    }
  } catch (e) {}
}

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
  const enNow = run.enemy;
  const isRaged = !!(enNow && enNow.raged && enNow.hp > 0);
  const fxOn = isFxEnabled();
  $('#arena').classList.toggle('rage-active', isRaged && fxOn);
  $('#f-enemy').classList.toggle('rage-aura', isRaged && fxOn);
  $('#b-ename').classList.toggle('rage-name', isRaged);
  syncBuffAura();
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
  const as = $('#btn-autoskill'); as.innerHTML = `スキル自動<small>${G.opts.autoSkill ? 'ON' : 'OFF'}</small>`; as.classList.toggle('on', G.opts.autoSkill);
  const bh = $('#btn-pot-hp'), bm = $('#btn-pot-mp');
  bh.textContent = `生命の薬 ×${p.potions.hp}`; bh.disabled = p.potions.hp <= 0;
  bm.textContent = `魔力の薬 ×${p.potions.mp}`; bm.disabled = p.potions.mp <= 0;
  const slots = p.equippedSkills || [null, null, null];
  const ctMap = run.skillCt || {};
  const key = slots.map(id => id + (id ? (ctMap[id] || 0) : 0) + (id && SK[id] && p.mp >= skillMpCost(p, SK[id]) ? 1 : 0)).join(',') + '|' + (p.passiveSkills && p.passiveSkills.mage10 ? 1 : 0);
  if (key !== run.skKey) {
    run.skKey = key;
    const hasAny = slots.some(id => !!id);
    if (!hasAny) {
      $('#skill-row').innerHTML = '<span class="empty">ステータス画面の「スキル」タブで、スロットにスキルを装備しましょう。</span>';
    } else {
      $('#skill-row').innerHTML = slots.map((id, i) => {
        if (!id || !SK[id]) return `<span class="skill" style="opacity:.35;cursor:default">─ S${i+1}<small>空き</small></span>`;
        const s = SK[id]; const ct = ctMap[id] || 0; const mpCost = skillMpCost(p, s);
        const usable = ct === 0 && p.mp >= mpCost;
        return `<span class="skill ${usable ? '' : 'disabled'}" style="opacity:${usable ? 1 : 0.5};cursor:default">
          ${s.name}<small>${ct > 0 ? `CT:${ct}` : `MP:${mpCost}`}</small>
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
          <span class="ms-desc">${ms.desc}${ms.id && SK[ms.id] ? ` <small>MP${skillMpCost(p, SK[ms.id])} CT${SK[ms.id].ct}T</small>` : ''}</span>
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

  const charTrees = getCharTrees(p && p.skin);
  const cMeta = CHAR_CLASS_META[(p && p.skin) || 'ruby'] || CHAR_CLASS_META.stella;
  const baseTrees = [charTrees[0]];
  const evoTrees = charTrees.slice(1);
  const unlockedEvo = evoTrees.filter(t => t.unlockWhen(p));
  const lockedEvo = evoTrees.filter(t => !t.unlockWhen(p));

  return `<div class="panel" id="skill-trees-panel">
    <h2>スキル枠（${esc(cMeta.name)}・${esc(cMeta.job)}）</h2>
    <p class="sub">SP（全キャラ共通プール）を現在のキャラの枠に割り振ると自動でスキルを習得します。<br>残りSP: <b style="color:var(--accent)">${p.sp}</b></p>
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
    if (!id || !SK[id]) return `<div class="sk-slot">
      <div class="sk-slot-num">スロット${i + 1}</div>
      <div class="sk-slot-empty">空き</div>
    </div>`;
    const s = SK[id];
    return `<div class="sk-slot filled">
      <div class="sk-slot-num">スロット${i + 1}</div>
      <div class="sk-slot-name">${s.name}</div>
      <div class="sk-slot-mp">MP ${skillMpCost(p, s)}</div>
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
          <div class="sk-list-meta"><span class="mp">MP ${skillMpCost(p, s)}</span><span class="ct">CT ${s.ct}T</span><span>${s.desc}</span></div>
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

function renderSubTabs(tabs, curTab, actName, ariaLabel) {
  return `<div class="st-tabs" role="tablist" aria-label="${esc(ariaLabel)}">${tabs.map(t => {
    const on = t.id === curTab;
    return `<button class="st-tab${on ? ' on' : ''}" role="tab" aria-selected="${on ? 'true' : 'false'}" data-act="${actName}" data-tab="${t.id}">${t.label}${t.dot ? '<i class="st-dot" aria-hidden="true"></i>' : ''}</button>`;
  }).join('')}</div>`;
}

function renderCharDescBox(charId) {
  const m = CHAR_CLASS_META[charId] || CHAR_CLASS_META.stella;
  const tutTgt = getCharTutorialTarget(m.id);
  return `<div class="rk-box" id="char-desc-box" style="margin-top:10px;text-align:left">
    <div style="font-weight:700;color:var(--accent)">${esc(m.name)}（${esc(m.job)}）― ${esc(m.role)}</div>
    <p style="margin:2px 0 4px;line-height:1.5">${esc(m.blurb)}</p>
    <div class="sub" style="margin:0;font-size:12px">・<b>得意</b>：${esc(m.strengths)}<br>・<b>弱み</b>：${esc(m.weakness)}<br>・<b>初期スキル（3SP）</b>：${esc(tutTgt.skillName)}</div>
  </div>`;
}

function renderStatus() {
  const p = G.p;
  const tab = ['hero', 'gear', 'skill', 'mastery', 'data'].includes(G.statusTab) ? G.statusTab : 'hero';
  G.statusTab = tab;
  const pSkin = CHAR_SKINS.find(x => x.id === (p.skin || 'ruby')) || CHAR_SKINS[0];
  const pTier = skinTier(pSkin), pKey = pSkin.id + ':' + pTier;
  let tierChanged = false;
  if (G._lastLook && G._lastLook.startsWith(pSkin.id + ':') && G._lastLook !== pKey) tierChanged = true;
  G._lastLook = pKey;
  const bag = [...p.bag].sort((a, b) => b.rarity - a.rarity || b.star - a.star || itemPower(b) - itemPower(a));
  const tabs = [
    { id: 'hero',    label: '勇者',   dot: false },
    { id: 'gear',    label: '装備',   dot: false },
    { id: 'skill',   label: 'スキル', dot: p.sp > 0 },
    { id: 'mastery', label: '極意',   dot: !!(p.ending && p.sp > 0) },
    { id: 'data',    label: 'データ', dot: false }
  ];
  const tabBarHtml = renderSubTabs(tabs, tab, 'statusTab', 'ステータス項目');
  const heroPanels = `
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
        <dt>防御力</dt><dd>${playerDef(p)}（基本 ${baseDef(p)} ＋ 防具 ${armorDef(p.armor)}）</dd>
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
    <div class="panel"><h2>外見変更（キャラ変更）</h2>
      <p class="sub" style="margin:0 0 12px">${G.run ? '⚠️ ダンジョン攻略中はキャラを変更できません。' : 'キャラを切り替えると、そのキャラのスキル・スロットに切り替わります（SPは共通）。'}</p>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
        ${CHAR_SKINS.map(sk => `<button class="skin-card ${(p.skin || 'ruby') === sk.id ? 'selected' : ''}" data-act="changeSkin" data-id="${sk.id}" ${G.run ? 'disabled' : ''}>
          <div style="width:64px;height:64px;margin:0 auto 6px;overflow:hidden">${skinArt(sk, 'width:64px;height:64px')}</div>
          <div style="font-size:13px;font-weight:bold">${sk.name}</div>
          <div style="font-size:11px;color:var(--muted)">${sk.job}</div>
        </button>`).join('')}
      </div>
      ${renderCharDescBox(p.skin || 'ruby')}
    </div>`;
  const gearPanels = `
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
    <div class="panel"><h2>薬</h2><p class="sub">ダンジョンの戦闘中にも使えます（探索画面のボタン）。</p>
      <div class="row">
        <button class="btn small" data-act="potion" data-k="hp" ${p.potions.hp > 0 ? '' : 'disabled'}>生命の薬 ×${p.potions.hp}（HP30%）</button>
        <button class="btn small" data-act="potion" data-k="mp" ${p.potions.mp > 0 ? '' : 'disabled'}>魔力の薬 ×${p.potions.mp}（MP50%）</button>
      </div></div>
    <div class="panel"><h2>強化石</h2><p class="sub">鍛冶屋での強化に使います。</p>
      <div class="row" style="flex-wrap:wrap;gap:8px">${STONES.map(st => `<span style="background:${st.color}22;border:1px solid ${st.color};border-radius:6px;padding:4px 10px;font-size:13px"><span style="color:${st.color}">●</span> ${st.name} <b>×${p.stones[st.id] || 0}</b></span>`).join('')}</div>
      <p class="sub" style="margin:8px 0 0">初級：A　中級：B　上級：C　時の欠片：D〜Fのボス・強敵</p></div>`;
  const skillPanels = `${renderSkillSlots(p)}${renderSkillTrees(p)}`;
  const masteryPanels = `
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
    </div>`;
  const dataPanels = `
    <div class="panel"><h2>データ</h2><p class="sub">進行状況はこのブラウザに自動保存されます。</p>
      ${IS_DEV_BUILD ? '<button class="btn small" data-act="debugAllGear">テスト用：全装備を入手</button> <button class="btn small" data-act="openFxDebug">🎬 エフェクト確認</button>' : ''}
      <button class="btn small danger" data-act="reset">${G.resetArm ? 'もう一度押すと初期化します' : 'セーブデータを初期化'}</button>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #2b3245">
        <div class="sub" style="margin-bottom:6px;font-size:12px">セーブの書き出し・読み込み（バックアップ／引き継ぎ）<br>最終書き出し：<b>${formatBackupDate(readBackupMeta().lastExportAt)}</b></div>
        <div class="row" style="flex-wrap:wrap;gap:6px">
          <button class="btn small" data-act="exportSaveFile">セーブを書き出す（ファイル）</button>
          <button class="btn small" data-act="exportSaveCode">セーブを書き出す（コード）</button>
          <button class="btn small" data-act="openImportModal">セーブを読み込む</button>
          <button class="btn small" data-act="openBugReport">不具合・ご意見を送る</button>
        </div>
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #2b3245">
        <div class="row" style="justify-content:space-between;align-items:center;gap:8px">
          <button class="btn small ${G.opts.fx !== false ? 'on' : ''}" data-act="fxToggle" aria-pressed="${G.opts.fx !== false}">戦闘エフェクト：${G.opts.fx !== false ? 'ON' : 'OFF'}</button>
        </div>
        <p class="sub" style="margin:6px 0 0;font-size:11px">スキル発動時のエフェクトやボス激昂時の閃光・オーラ表示を切り替えます（ダメージ数字やログは常に表示されます）。</p>
      </div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid #2b3245">
        <div class="row" style="justify-content:space-between;align-items:center;gap:8px">
          <button class="btn small ${!isAnalyticsOptOut() ? 'on' : ''}" data-act="toggleAnalyticsOptOut" aria-pressed="${!isAnalyticsOptOut()}">匿名の利用状況を送信する：${!isAnalyticsOptOut() ? 'ON' : 'OFF'}</button>
        </div>
        <p class="sub" style="margin:6px 0 0;font-size:11px">進行状況（Lv・到達ダンジョン・プレイ時間など）を1日1回匿名で送信します。名前やセーブデータ等の個人情報は送信しません。</p>
      </div></div>`;
  const bodyByTab = { hero: heroPanels, gear: gearPanels, skill: skillPanels, mastery: masteryPanels, data: dataPanels };
  $('#view-status').innerHTML = tabBarHtml + (bodyByTab[tab] || heroPanels);
}

/* ================= render: modal ================= */
function openBugReportModal(statusMsg, isErr) {
  const configured = isBugReportConfigured();
  const wait = bugReportWaitSec();
  const diag = buildBugDiag();
  const qLen = readBugQueue().length;
  const notice = !configured
    ? '<p id="br-notice" style="color:#ff7b72;font-size:12px;margin:6px 0">準備中です（送信先が未設定のため送信できません）</p>'
    : (wait > 0 ? `<p id="br-notice" style="color:#ff7b72;font-size:12px;margin:6px 0">連続送信は${BUGREPORT_CFG.rateLimitSec}秒に1回までです（あと${wait}秒）</p>` : '');
  const msgHtml = statusMsg ? `<p id="br-msg" style="color:${isErr ? '#ff7b72' : 'var(--good)'};font-size:12px;margin:6px 0">${esc(statusMsg)}</p>` : '';
  const qHtml = qLen > 0 ? `<p class="sub" style="font-size:11px;margin:4px 0">未送信キュー：${qLen}件（オンライン時に再送されます）</p>` : '';
  $('#m-sheet').innerHTML = `
    <h2 id="m-title">不具合・ご意見を送る</h2>
    ${notice}${msgHtml}${qHtml}
    <div style="margin:8px 0">
      <label for="br-kind" style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px">種類</label>
      <select id="br-kind" style="width:100%;padding:6px 8px;background:#0d111a;color:#e6edf3;border:1px solid #2b3245;border-radius:6px;font-size:13px">
        <option value="不具合">不具合</option>
        <option value="バランス">バランス</option>
        <option value="要望">要望</option>
        <option value="その他">その他</option>
      </select>
    </div>
    <div style="margin:8px 0">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:4px">
        <label for="br-text">内容（${BUGREPORT_CFG.textMin}〜${BUGREPORT_CFG.textMax}文字）</label>
        <span id="br-count">0 / ${BUGREPORT_CFG.textMax}</span>
      </div>
      <textarea id="br-text" maxlength="${BUGREPORT_CFG.textMax}" placeholder="不具合の状況やご意見をご記入ください" style="width:100%;box-sizing:border-box;height:96px;background:#0d111a;color:#e6edf3;border:1px solid #2b3245;border-radius:6px;padding:8px;font-size:12px"></textarea>
      <div class="sub" style="font-size:11px;margin-top:4px">どの画面で何を押したか、書いてもらえると助かります</div>
    </div>
    <div style="margin:8px 0">
      <label for="br-diag" style="display:block;font-size:12px;color:var(--muted);margin-bottom:4px">送信される診断情報（読み取り専用）</label>
      <textarea id="br-diag" readonly style="width:100%;box-sizing:border-box;height:58px;background:#0d111a;color:#8b949e;border:1px solid #2b3245;border-radius:6px;padding:6px;font-size:11px">${esc(diag)}</textarea>
    </div>
    <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;margin:8px 0;cursor:pointer">
      <input type="checkbox" id="br-agree" style="margin-top:2px">
      <span>内容と診断情報（セーブデータ・名前は含みません）を送信することに同意します</span>
    </label>
    <div class="act" style="gap:8px">
      <button class="btn primary" id="br-send" data-act="submitBugReport" disabled>送信する</button>
      <button class="btn" data-act="closeTowerModal">キャンセル</button>
    </div>`;
  $('#modal').hidden = false; G.modalOpen = true;
  const ta = $('#br-text'), cnt = $('#br-count'), agr = $('#br-agree'), btn = $('#br-send');
  const syncState = () => {
    const len = ta ? ta.value.trim().length : 0;
    if (cnt) cnt.textContent = `${ta ? ta.value.length : 0} / ${BUGREPORT_CFG.textMax}`;
    const okLen = len >= BUGREPORT_CFG.textMin && len <= BUGREPORT_CFG.textMax;
    const okAgree = !!(agr && agr.checked);
    if (btn) btn.disabled = !(configured && wait === 0 && okLen && okAgree);
  };
  if (ta) ta.addEventListener('input', syncState);
  if (agr) agr.addEventListener('change', syncState);
  syncState();
}
function openExportCodeModal(code) {
  $('#m-sheet').innerHTML = `
    <h2 id="m-title">セーブコード</h2>
    <p class="sub" style="margin:0 0 8px">以下のコードをコピーして安全な場所に保管してください。</p>
    <textarea id="exp-code" readonly style="width:100%;box-sizing:border-box;height:110px;background:#0d111a;color:#e6edf3;border:1px solid #2b3245;border-radius:6px;padding:8px;font-size:11px">${esc(code)}</textarea>
    <div class="act"><button class="btn primary" data-act="closeTowerModal">閉じる</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
  const ta = $('#exp-code');
  if (ta) { ta.focus(); ta.select(); }
}
function openImportSaveModal(preview, errorMsg) {
  const cur = summarizeSavePlayer(G.p);
  const prevHtml = preview ? `
    <div style="background:#111722;border:1px solid #2b3245;border-radius:8px;padding:10px;margin:10px 0;font-size:12px">
      <div style="font-weight:bold;margin-bottom:6px;color:var(--gold)">現在のセーブを置き換えますか？</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><div style="color:var(--muted)">現在</div><div>Lv ${cur.lv}</div><div>${fmt(cur.gold)} G</div><div>${esc(cur.progress)}</div></div>
        <div><div style="color:var(--accent)">書き出し側</div><div>Lv ${preview.summary.lv}</div><div>${fmt(preview.summary.gold)} G</div><div>${esc(preview.summary.progress)}</div></div>
      </div>
    </div>` : '';
  const errHtml = errorMsg ? `<p id="imp-err" style="color:#ff7b72;font-size:12px;margin:8px 0">${esc(errorMsg)}</p>` : '';
  $('#m-sheet').innerHTML = `
    <h2 id="m-title">セーブを読み込む</h2>
    <p class="sub" style="margin:0 0 8px">書き出した JSON ファイルを選ぶか、セーブコードを貼り付けてください。</p>
    <div style="margin-bottom:8px"><input id="imp-file" type="file" accept=".json,application/json,text/plain" style="max-width:100%;font-size:12px"></div>
    <textarea id="imp-code" placeholder="ここにセーブコード（RGS1:...）またはJSONを貼り付け" style="width:100%;box-sizing:border-box;height:90px;background:#0d111a;color:#e6edf3;border:1px solid #2b3245;border-radius:6px;padding:8px;font-size:11px">${preview ? esc($('#imp-code')?.value || '') : ''}</textarea>
    ${errHtml}
    ${prevHtml}
    <div class="act" style="gap:8px">
      ${preview ? '<button class="btn primary" data-act="confirmImportSave">読み込む</button>' : '<button class="btn primary" data-act="validateImportInput">確認する</button>'}
      <button class="btn" data-act="closeTowerModal">キャンセル</button>
    </div>`;
  $('#modal').hidden = false; G.modalOpen = true;
  const fi = $('#imp-file');
  if (fi) {
    fi.onchange = async () => {
      const f = fi.files && fi.files[0];
      if (!f) return;
      try {
        const text = await f.text();
        const ta = $('#imp-code');
        if (ta) ta.value = text;
        ACTS.validateImportInput();
      } catch (e) {
        openImportSaveModal(null, 'ファイルの読み込みに失敗しました。');
      }
    };
  }
}
function openIdbRestoreModal(rec) {
  let sum = { lv: 1, gold: 0, progress: '' };
  try {
    const parsed = JSON.parse(rec.raw);
    const mig = migrateSave(parsed);
    if (mig && mig.p) sum = summarizeSavePlayer(mig.p);
  } catch (e) {}
  G._pendingIdbRestore = rec;
  $('#m-sheet').innerHTML = `
    <h2 id="m-title">前回のデータが見つかりました</h2>
    <p class="sub" style="margin:0 0 10px">前回のセーブデータのバックアップが見つかりました。復元しますか？</p>
    <div style="background:#111722;border:1px solid #2b3245;border-radius:8px;padding:10px;margin:0 0 12px;font-size:12px">
      <div>Lv ${sum.lv} ／ ${fmt(sum.gold)} G ／ ${esc(sum.progress)}</div>
    </div>
    <div class="act" style="gap:8px">
      <button class="btn primary" data-act="restoreIdbSave">復元する</button>
      <button class="btn" data-act="dismissIdbRestore">新しく始める</button>
    </div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}
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
    { name: '✨ 極意（共通パッシブ）', desc: '全キャラ共通のパッシブ強化10種が解放されました。', to: 'status', tab: 'mastery' },
    { name: '⚔️ 進化枠 第3段階', desc: '各進化スキル枠の上限が30SPに拡張され、究極スキルを習得できます。', to: 'status', tab: 'skill' },
    { name: '📖 図鑑・🏆 実績・称号', desc: '魔物・装備の記録や実績達成で回廊コインと称号を獲得できます。', to: 'dex' }
  ];
  $('#m-sheet').innerHTML = `
    <h2 class="win" id="m-title">🎉 クリア後の新要素が解放！</h2>
    <p class="sub" style="margin:0">虚空の神殿・極級の踏破により、以下のエンドコンテンツが解放されました。</p>
    <div style="display:grid;gap:6px">${rows.map(r => `
      <div class="item" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="min-width:0"><div><b>${esc(r.name)}</b></div><div class="sub">${esc(r.desc)}</div></div>
        <button class="btn small primary" data-act="jumpNotice" data-to="${r.to}"${r.tab ? ` data-tab="${r.tab}"` : ''}>見る</button>
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
function renderFxDebugArena() {
  if (!IS_DEV_BUILD) return;
  const arena = $('#fxd-arena'), fe = $('#fxd-enemy'), nm = $('#fxd-ename'), sprE = $('#fxd-spr-enemy'), sprP = $('#fxd-spr-player');
  if (!arena || !fe || !nm || !sprE || !sprP) return;
  const isBoss = _fxDbgState.enemy === 'boss';
  const dId = isBoss ? 'O' : 'A';
  const dObj = dungeonOf(dId) || DUNGEONS[0];
  arena.style.setProperty('--a1', dObj.a1);
  arena.style.setProperty('--a2', dObj.a2);
  const raged = !!_fxDbgState.raged;
  const baseEn = isBoss ? dObj.boss : dObj.mobs[0];
  const fakeEn = {
    id: (isBoss && raged && baseEn.rageId) ? baseEn.rageId : baseEn.id,
    fallbackId: baseEn.id,
    name: (isBoss && raged && baseEn.rageName) ? baseEn.rageName : baseEn.name,
    shape: baseEn.shape,
    raged,
    bossFilter: raged ? 'hue-rotate(140deg) saturate(1.6)' : ''
  };
  sprE.innerHTML = enemyArt(fakeEn, dId);
  sprP.innerHTML = getPlayerSVG();
  nm.textContent = fakeEn.name;
  arena.classList.toggle('rage-active', raged);
  fe.classList.toggle('rage-aura', raged);
  nm.classList.toggle('rage-name', raged);
  syncBuffAura(fxDebugTarget());
}
function renderFxDebugControls() {
  if (!IS_DEV_BUILD) return;
  const box = $('#fxd-ctrl');
  if (!box) return;
  const spd = _fxDbgState.speed || 1;
  const raged = !!_fxDbgState.raged;
  const buff = _fxDbgState.buff || 'none';
  const en = _fxDbgState.enemy || 'mob';
  box.innerHTML = `
    <div class="fxd-row">
      <span class="fxd-lbl">速度</span>
      ${[1, 2, 4].map(v => `<button class="btn small ${spd === v ? 'on' : ''}" data-act="fxDbgSpeed" data-v="${v}">×${v}</button>`).join('')}
      <span class="fxd-lbl" style="margin-left:4px">敵</span>
      <button class="btn small ${en === 'mob' ? 'on' : ''}" data-act="fxDbgEnemy" data-v="mob">雑魚</button>
      <button class="btn small ${en === 'boss' ? 'on' : ''}" data-act="fxDbgEnemy" data-v="boss">ボス(O)</button>
    </div>
    <div class="fxd-row">
      <span class="fxd-lbl">激昂</span>
      <button class="btn small ${raged ? 'on' : ''}" data-act="fxDbgRageToggle">激昂表示：${raged ? 'ON' : 'OFF'}</button>
      <button class="btn small" data-act="fxDbgRageBurst">激昂の瞬間を再生</button>
      <button class="btn small danger" data-act="fxDbgStop">演出を止める</button>
    </div>
    <div class="fxd-row">
      <span class="fxd-lbl">バフ</span>
      ${[['none', 'なし'], ['atk', '攻撃'], ['def', '防御'], ['all', '全能力']].map(([k, lbl]) => `<button class="btn small ${buff === k ? 'on' : ''}" data-act="fxDbgBuff" data-v="${k}">${lbl}</button>`).join('')}
    </div>`;
}
function openFxDebugModal() {
  if (!IS_DEV_BUILD) return;
  _fxDbgState.speed = 1;
  _fxDbgState.raged = false;
  _fxDbgState.buff = 'none';
  _fxDbgState.enemy = 'mob';
  const cats = [
    { key: 'slash', label: '⚔️ 斬撃（剣系）' },
    { key: 'magic', label: '✨ 魔法（攻撃魔法）' },
    { key: 'ult',   label: '💥 大技・奥義' },
    { key: 'heal',  label: '💚 回復' },
    { key: 'buff',  label: '🛡️ 強化（バフ）' }
  ];
  const groupsHtml = cats.map(c => {
    const ids = SK_ORDER.filter(id => SK[id] && getSkillFxSpec(id).cat === c.key);
    return `<div class="fxd-grp">
      <div class="fxd-gh">${esc(c.label)}（${ids.length}）</div>
      <div class="fxd-grid">${ids.map(id => `<button class="btn small" data-act="fxDbgSkill" data-id="${id}">${esc(SK[id].name)}</button>`).join('')}</div>
    </div>`;
  }).join('');
  const rmNote = isReducedMotion() ? '<p class="sub" id="fxd-rm-note" style="margin:2px 0 0;color:var(--accent);font-size:11px">※ OSの「視差効果を減らす（prefers-reduced-motion）」が有効なため、簡易フェード表示になります。</p>' : '';
  $('#m-sheet').innerHTML = `
    <div class="fxd-sticky" id="fxd-sticky">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <h2 id="m-title" style="font-size:17px">🎬 エフェクト確認</h2>
        <span class="sub" style="margin:0;font-size:11px">※セーブ・戦闘に影響しません</span>
      </div>
      <div class="arena fxd-arena" id="fxd-arena">
        <div class="fx-layer" id="fxd-layer" aria-hidden="true"></div>
        <div class="arena-row">
          <div class="fighter" id="fxd-player">
            <div class="spr" id="fxd-spr-player"></div>
            <div class="fname">勇者</div>
          </div>
          <div class="fighter" id="fxd-enemy">
            <div class="spr" id="fxd-spr-enemy"></div>
            <div class="fname" id="fxd-ename">-</div>
          </div>
        </div>
      </div>
      ${rmNote}
    </div>
    <div class="fxd-ctrl" id="fxd-ctrl"></div>
    <div style="display:grid;gap:8px" id="fxd-skills">${groupsHtml}</div>
    <div class="act" style="grid-template-columns:1fr"><button class="btn primary" data-act="closeTowerModal">閉じる</button></div>`;
  $('#modal').hidden = false; G.modalOpen = true;
  renderFxDebugArena();
  renderFxDebugControls();
}
function openCharSelectModal(pickedId) {
  G._charSelectOpen = true;
  if (pickedId !== undefined) G._charSelectPick = pickedId;
  const cur = G._charSelectPick || null;
  const order = ['stella', 'ruby', 'silia', 'chloe'];
  const cards = order.map(cid => {
    const sk = CHAR_SKINS.find(x => x.id === cid) || CHAR_SKINS[0];
    const sel = cur === cid;
    return `<button class="skin-card ${sel ? 'selected' : ''}" data-act="selectStartChar" data-id="${sk.id}">
      <div style="width:64px;height:64px;margin:0 auto 6px;overflow:hidden">${skinArt(sk, 'width:64px;height:64px')}</div>
      <div style="font-size:13px;font-weight:bold">${esc(sk.name)}</div>
      <div style="font-size:11px;color:var(--muted)">${esc(sk.job)}</div>
    </button>`;
  }).join('');
  const descHtml = cur
    ? renderCharDescBox(cur)
    : '<div class="rk-box" id="char-desc-box" style="margin-top:10px;text-align:center;color:var(--muted)">上のカードを押すと、そのキャラクターの特徴が表示されます。</div>';
  $('#m-sheet').innerHTML = `
    <h2 class="win" id="m-title">キャラクターを選ぼう</h2>
    <p class="sub" style="margin:0">最初のキャラクターを選んでください。キャラは後から、ステータス画面でいつでも変えられます（ダンジョン攻略中を除く）。スキルはキャラごとに別々に育てます。</p>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px" id="char-select-grid">${cards}</div>
    ${descHtml}
    <div class="act" style="grid-template-columns:1fr">
      <button class="btn primary" id="btn-confirm-char" data-act="confirmStartChar" ${cur ? '' : 'disabled'}>このキャラで始める</button>
    </div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}
function openV9ResetNoticeModal() {
  if (!G.p || !G.p.v9ResetNoticePending) return;
  $('#m-sheet').innerHTML = `
    <h2 class="win" id="m-title">スキルシステム変更のお知らせ</h2>
    <p style="margin:6px 0;line-height:1.6">システムが変わりました。SPを全て返却したので、キャラごとに振り直してください。</p>
    <p class="sub" style="margin:0">・現在の所持SP：<b style="color:var(--accent)">${fmt(G.p.sp)} SP</b>（全キャラ共通プール）<br>・ステータス画面の「スキル」タブで、キャラクターごとにスキル枠へ割り振れます。</p>
    <div class="act" style="grid-template-columns:1fr">
      <button class="btn primary" id="btn-close-v9-notice" data-act="closeV9Notice">確認して閉じる</button>
    </div>`;
  $('#modal').hidden = false; G.modalOpen = true;
}
function closeModal() {
  if (G._charSelectOpen) return;
  if ($('#fxd-arena')) {
    _fxDbgState.raged = false;
    _fxDbgState.buff = 'none';
    clearAllBattleFx(fxDebugTarget());
  }
  $('#modal').hidden = true; G.modalOpen = false; ensureLoop();
}

/* ================= render: help ================= */
function renderHelp() {
  const tab = ['intro', 'world', 'skill', 'status', 'endgame'].includes(G.helpTab) ? G.helpTab : 'intro';
  G.helpTab = tab;
  const tabs = [
    { id: 'intro',   label: 'はじめに', dot: false },
    { id: 'world',   label: '街・迷宮', dot: false },
    { id: 'skill',   label: 'スキル',   dot: false },
    { id: 'status',  label: 'ステータス', dot: false },
    { id: 'endgame', label: '後編',     dot: false }
  ];
  const tabBarHtml = renderSubTabs(tabs, tab, 'helpTab', 'ヘルプ項目');
  const introPanels = `
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
    <h2>💡 その他のヒント</h2>
    <ul class="help-tips">
      <li><b>自動売却フィルター</b>：売却所でレア度を設定しておくと、ダンジョンで拾った不要装備を自動で売却できる</li>
      <li><b>強化石はダンジョンでドロップ</b>：ダンジョンA〜Cで対応した強化石が8%の確率で入手できる（上位素材は特定ダンジョンのボス等がドロップ）</li>
      <li><b>銀行は敗北前に使おう</b>：ゴールドが溜まったら銀行に預けておくとリスクヘッジになる</li>
      <li><b>推奨レベルを目安に</b>：ダンジョン選択画面の推奨レベルを参考に挑む難易度を選ぼう</li>
      <li><b>セーブのバックアップ・引き継ぎ</b>：ステータス画面の「データ」タブから、ファイルまたはコードでセーブを書き出し・読み込みできる</li>
      <li><b>不具合・ご意見の報告</b>：ヘルプ画面下部またはステータス画面の「データ」タブから、不具合やバランスのご意見を送信できる</li>
      <li><b>匿名の利用状況送信</b>：進行状況（Lv・到達ダンジョン・プレイ時間など、個人情報は含みません）を1日1回匿名で送信します（ステータス画面の「データ」タブでオフにできます）</li>
    </ul>
  </div>`;
  const worldPanels = `
  <div class="panel">
    <h2>🏘️ 街タブでできること</h2>
    <div class="help-table">
      <div class="help-row"><span class="help-facility">宿屋</span><span>HP・MP回復（無料）、セーブ</span></div>
      <div class="help-row"><span class="help-facility">道具屋</span><span>HP・MPポーションを購入</span></div>
      <div class="help-row"><span class="help-facility">武器屋/防具屋</span><span>武器・防具を購入</span></div>
      <div class="help-row"><span class="help-facility">売却所</span><span>不要な装備をゴールドに換金。自動売却フィルターも設定可</span></div>
      <div class="help-row"><span class="help-facility">鍛冶屋</span><span>ゴールドと強化石を使って装備を★強化（最大★9。★6以上は上位の強化素材が必要）</span></div>
      <div class="help-row"><span class="help-facility">銀行</span><span>ゴールドを預けて敗北時のロストを防ぐ</span></div>
    </div>
  </div>
  <div class="panel">
    <h2>⚔️ ダンジョンタブでできること</h2>
    <div class="help-table">
      <div class="help-row"><span class="help-facility">ダンジョン選択</span><span>A〜O の15種（前編A〜I、後編J〜O）。前のダンジョンをクリアすると次が開く</span></div>
      <div class="help-row"><span class="help-facility">難易度</span><span>初級・中級・上級・超級・極級の5段階（上の難易度は下をクリアすると開く）</span></div>
      <div class="help-row"><span class="help-facility">戦闘</span><span>自動進行。スキルを選んで戦略的に戦おう</span></div>
      <div class="help-row"><span class="help-facility help-retreat-cell">撤退ボタン</span><span>いつでも押せる。街に帰還してHP<b>全回復</b></span></div>
      <div class="help-row"><span class="help-facility">敗北</span><span>ゴールドが半分失われ、HP25%で帰還</span></div>
    </div>
  </div>`;
  const skillPanels = `
  <div class="panel">
    <h2>🎯 スキルシステムガイド</h2>

    <div class="help-skill-step">
      <div class="help-skill-num">1</div>
      <div>
        <b>SPを割り振ってスキルを取得しよう</b>
        <p class="sub" style="margin:4px 0 0">ダンジョンでレベルアップするとSP（スキルポイント）を獲得できます。ステータス画面の「スキル」タブ（スキル枠）でSPを好きな枠に割り振り、一定ポイントに達すると自動でスキルを習得します。</p>
      </div>
    </div>

    <div class="help-skill-step">
      <div class="help-skill-num">2</div>
      <div>
        <b>習得したスキルをスロットに装備しよう</b>
        <p class="sub" style="margin:4px 0 0">習得しただけでは使われません。ステータス画面の「スキル」タブ（スキルセット）でスロット（S1〜S3）に装備することで、戦闘で自動発動されるようになります。3つまで同時に装備できます。</p>
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
        <span class="sub">剣枠・魔法枠・生命枠の基本スキル枠にSPを振ると、より強力な「進化スキル枠」（戦士・魔法使い・僧侶・英雄の4種）が解放されます。戦士・魔法使い・僧侶は対応する基本枠10SP、英雄は3つの基本枠すべて20SPで解放され、それぞれ専用の強力スキルを習得できます。</span>
      </div>
    </div>

    <h3 style="font-size:13px;margin:14px 0 6px;color:var(--muted)">── 習得できるスキル一覧 ──</h3>
    <div class="help-table">
      ${SK_ORDER.map(id => { const s = SK[id]; return `<div class="help-row"><span class="help-facility">${s.name}</span><span>${s.desc} <small style="color:var(--accent)">MP${skillMpCost(G.p, s)} CT${s.ct}T</small></span></div>`; }).join('')}
    </div>
  </div>`;
  const statusPanels = `
  <div class="panel">
    <h2>📊 ステータスタブでできること</h2>
    <p class="sub" style="margin:0 0 8px">上部の5つのタブ（勇者／装備／スキル／極意／データ）で項目を切り替えられます。</p>
    <div class="help-table">
      <div class="help-row"><span class="help-facility">勇者</span><span>レベル・HP/MP・ATK/DEF・SPの確認、📖 図鑑・🏆 実績の閲覧、称号の装備、外見変更</span></div>
      <div class="help-row"><span class="help-facility">装備</span><span>装備中の武器・防具の確認、おまかせ装備・自動装備切替、バッグ（ロック・装備変更・拡張）、薬の使用、強化石の所持数確認</span></div>
      <div class="help-row"><span class="help-facility">スキル</span><span>スキルセット（S1〜S3に最大3つ装備）と、スキル枠（基本枠・進化枠へのSP割り振り・リセット）</span></div>
      <div class="help-row"><span class="help-facility">極意</span><span>本編クリア後に解放される全キャラ共通パッシブ（10項目・各最大Lv10）の強化とリセット</span></div>
      <div class="help-row"><span class="help-facility">データ</span><span>セーブデータの書き出し（ファイル／コード）・読み込み（バックアップ／引き継ぎ）、不具合・ご意見の送信、初期化</span></div>
    </div>
  </div>`;
  const endgamePanels = `
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
  const bodyByTab = { intro: introPanels, world: worldPanels, skill: skillPanels, status: statusPanels, endgame: endgamePanels };
  const footHtml = `<div class="help-foot" style="text-align:center;padding:4px 0"><button class="btn small" data-act="openBugReport">不具合・ご意見を送る</button></div>`;
  $('#view-help').innerHTML = tabBarHtml + (bodyByTab[tab] || introPanels) + footHtml;
}

/* ================= render: all ================= */
function renderAll() {
  if ((!G.tutorial || G.tutorial.done) && G._charSelectOpen) {
    G._charSelectOpen = false;
    closeModal();
  }
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
    if (G.run) { renderEnemy(true); renderBattle(); } else { if (typeof clearAllBattleFx === 'function') clearAllBattleFx(); renderDungeonSelect(); }
  }
  if (v === 'status') renderStatus();
  if (v === 'help') renderHelp();
}

