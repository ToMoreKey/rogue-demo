/* 街の施設NPC：立ち絵（インライン SVG）とセリフ選択 */
const NPC_SVG = (() => {
  const mouth = '<path d="M28,40 Q32,43 36,40" stroke="#6a2a2a" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
  const eyes = (c = '#2a1a1a') => `<circle cx="26" cy="35" r="2.2" fill="${c}"/><circle cx="38" cy="35" r="2.2" fill="${c}"/><circle cx="26.7" cy="34.2" r=".7" fill="#fff"/><circle cx="38.7" cy="34.2" r=".7" fill="#fff"/>`;
  const cheek = '<ellipse cx="22" cy="39" rx="3" ry="1.8" fill="#ff9aa0" opacity=".45"/><ellipse cx="42" cy="39" rx="3" ry="1.8" fill="#ff9aa0" opacity=".45"/>';
  const wrap = body => `<svg viewBox="0 0 64 72" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">${body}</svg>`;
  return {
    // 女将ミレイ：栗色の髪をまとめ、エプロン
    inn: wrap(`<ellipse cx="32" cy="69" rx="22" ry="3" fill="#000" opacity=".25"/>
      <path d="M12,72 Q14,52 32,50 Q50,52 52,72 Z" fill="#c9645a"/><path d="M22,72 L24,54 Q32,58 40,54 L42,72 Z" fill="#f6efe0"/><rect x="29" y="50" width="6" height="6" fill="#efc6a4"/>
      <circle cx="32" cy="34" r="16" fill="#f4cfae"/><path d="M15,32 Q16,14 32,14 Q48,14 49,32 Q44,22 32,22 Q20,22 15,32Z" fill="#7a4a2a"/><circle cx="32" cy="11" r="7" fill="#7a4a2a"/><circle cx="32" cy="11" r="3" fill="#ffd27a"/>
      ${eyes()}${cheek}${mouth}`),
    // 商人トト：緑のハット、丸眼鏡、大きな荷物
    shop: wrap(`<ellipse cx="32" cy="69" rx="22" ry="3" fill="#000" opacity=".25"/>
      <rect x="40" y="44" width="20" height="26" rx="5" fill="#a8743a"/><rect x="44" y="40" width="12" height="8" rx="3" fill="#8a5a2a"/><circle cx="50" cy="58" r="4" fill="#ffd45a"/>
      <path d="M12,72 Q14,52 32,50 Q50,52 52,72 Z" fill="#3a9a6a"/><path d="M26,50 L32,60 L38,50Z" fill="#f6efe0"/>
      <circle cx="32" cy="35" r="15" fill="#f1c9a2"/><path d="M12,28 Q32,6 52,28 Q44,22 32,22 Q20,22 12,28Z" fill="#2f8a5a"/><rect x="14" y="26" width="36" height="5" rx="2.5" fill="#256f48"/><circle cx="46" cy="14" r="3.5" fill="#ffd45a"/>
      <circle cx="26" cy="36" r="5" fill="none" stroke="#5a3a1a" stroke-width="1.5"/><circle cx="38" cy="36" r="5" fill="none" stroke="#5a3a1a" stroke-width="1.5"/><line x1="31" y1="36" x2="33" y2="36" stroke="#5a3a1a" stroke-width="1.5"/>
      <circle cx="26" cy="36" r="2" fill="#2a1a1a"/><circle cx="38" cy="36" r="2" fill="#2a1a1a"/>${cheek}<path d="M27,42 Q32,47 37,42 Z" fill="#8a3a3a"/>`),
    // 鍛冶屋ガンド：筋骨隆々、赤ひげ、バンダナ、ハンマー
    smith: wrap(`<ellipse cx="32" cy="69" rx="24" ry="3" fill="#000" opacity=".25"/>
      <rect x="49" y="30" width="5" height="38" fill="#7a5a3a" transform="rotate(14 51 49)"/><rect x="43" y="24" width="18" height="12" rx="2" fill="#8d97a6" transform="rotate(14 52 30)"/>
      <path d="M8,72 Q8,50 32,48 Q56,50 56,72 Z" fill="#6a3a22"/><path d="M12,72 Q12,54 32,52 Q52,54 52,72 Z" fill="#3a2a22"/><rect x="26" y="48" width="12" height="7" fill="#e0a87c"/>
      <circle cx="32" cy="33" r="16" fill="#e8b48a"/><path d="M15,28 Q32,12 49,28 L49,24 Q32,6 15,24Z" fill="#c8453a"/><rect x="15" y="22" width="34" height="6" fill="#c8453a"/><path d="M47,24 L58,20 L52,29Z" fill="#c8453a"/>
      <path d="M17,38 Q18,56 32,56 Q46,56 47,38 Q44,48 32,48 Q20,48 17,38Z" fill="#b8501f"/><path d="M24,44 Q32,48 40,44" stroke="#8a3a14" stroke-width="2" fill="none"/>
      <rect x="21" y="32" width="9" height="2.6" rx="1.3" fill="#2a1a1a" transform="rotate(8 25 33)"/><rect x="34" y="32" width="9" height="2.6" rx="1.3" fill="#2a1a1a" transform="rotate(-8 39 33)"/><circle cx="26" cy="36" r="1.6" fill="#2a1a1a"/><circle cx="38" cy="36" r="1.6" fill="#2a1a1a"/>
      <circle cx="46" cy="40" r="2" fill="#2a1a1a" opacity=".2"/>`),
    // 銀行員ノア：青いベスト、片眼鏡、几帳面
    bank: wrap(`<ellipse cx="32" cy="69" rx="22" ry="3" fill="#000" opacity=".25"/>
      <path d="M12,72 Q14,52 32,50 Q50,52 52,72 Z" fill="#2a3a78"/><path d="M26,50 L32,64 L38,50Z" fill="#f6efe0"/><path d="M30,54 L32,66 L34,54 L32,52Z" fill="#c9b26a"/><path d="M28,50 L32,54 L36,50Z" fill="#c9645a"/>
      <circle cx="32" cy="35" r="15" fill="#f4d6b8"/><path d="M16,34 Q14,12 32,13 Q50,12 48,34 Q46,22 38,20 Q28,24 20,22 Q17,26 16,34Z" fill="#c9d4ee"/>
      <circle cx="26" cy="36" r="2" fill="#2a2a3a"/><circle cx="39" cy="36" r="2" fill="#2a2a3a"/><circle cx="39" cy="36" r="5.2" fill="none" stroke="#c9b26a" stroke-width="1.5"/><line x1="44" y1="38" x2="48" y2="48" stroke="#c9b26a" stroke-width="1"/>
      <path d="M22,31 L29,30" stroke="#8a93b4" stroke-width="1.6" stroke-linecap="round"/><path d="M30,42 L34,42" stroke="#6a2a2a" stroke-width="1.6" stroke-linecap="round"/>`)
  };
})();


/* 施設ごとに「いま言うセリフ」を決める。evt が null なら入店時（状況に応じた台詞を高確率で採用） */
function npcSay(fac, evt) {
  const n = NPCS[fac]; if (!n) return '';
  const p = G.p, c = n.cond || {};
  if (evt && n.act && n.act[evt]) return pick(n.act[evt]);
  const cands = [];
  if (fac === 'inn') {
    if (p.hp < maxHp(p) * 0.5) cands.push(...c.hpLow);
    if (p.mp >= maxMp(p)) cands.push(...c.mpFull); else if (p.mp < maxMp(p) * 0.4) cands.push(...c.mpLow);
  } else if (fac === 'shop') {
    const free = p.bag.filter(it => !it.locked).length;
    if (free >= 15) cands.push(...c.bagFull); else if (!free) cands.push(...c.bagEmpty);
    if (p.gold >= 3000) cands.push(...c.rich);
  } else if (fac === 'smith') {
    const need = Object.values(p.stones || {}).reduce((s, v) => s + (v || 0), 0);
    if (!need) cands.push(...c.noStone);
    if (p.weapon) cands.push(...(p.weapon.star >= SMITH_MAX_STAR ? c.weaponMax : c.weaponLow));
  } else if (fac === 'bank') {
    if (p.gold >= 5000) cands.push(...c.richPurse);
    if (p.bank > 0) cands.push(...c.hasDeposit); else cands.push(...c.noDeposit);
  }
  return cands.length && Math.random() < 0.6 ? pick(cands) : pick(n.greet);
}

function npcHtml(fac) {
  const n = NPCS[fac]; if (!n) return '';
  if (!G._npc || G._npc.fac !== fac) G._npc = { fac, line: npcSay(fac, G._npcEvt || null) };
  return `<div class="npc" style="--nc:${n.color}"><div class="npc-pt">${NPC_SVG[fac]}</div>
    <div class="npc-bub"><div class="npc-name">${n.name}<small>${n.role}</small></div><p>「${esc(G._npc.line)}」</p></div></div>`;
}

const NPC_ACTS = { inn: 1, sell: 1, buyShop: 1, smithUpgrade: 1, smithReforge: 1, dep: 1, wd: 1, depAll: 1, wdAll: 1 };
