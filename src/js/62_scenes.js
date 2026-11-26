// ===== UI-3: ダンジョン別の背景シーン（インラインSVG。戦闘アリーナとダンジョンカードで共用） =====
// viewBox 400x160、横長に cover で使う。文字の可読性のため、暗めの階調で描く。
const SCENES = (() => {
  const W = 400, H = 160;
  const g = (id, a, b, x2, y2) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2 || 0}" y2="${y2 || 1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
  const rg = (id, c, o) => `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${o || 0.9}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
  // なだらかな稜線
  const ridge = (col, y, amp, n, ph) => { let d = `M0,${H} L0,${y}`; for (let i = 0; i <= n; i++) { const x = Math.round(i * W / n); d += ` L${x},${Math.round(y - amp * Math.abs(Math.sin(i * 1.7 + (ph || 0))))}`; } return `<path d="${d} L${W},${H} Z" fill="${col}"/>`; };
  // ぎざぎざの岩・結晶
  const spikes = (col, y, h, n, ph) => { let d = `M0,${H} L0,${y}`; for (let i = 0; i < n; i++) { const x0 = i * W / n, hh = h * (0.5 + 0.5 * Math.abs(Math.sin(i * 2.3 + (ph || 0)))); d += ` L${Math.round(x0 + W / n * 0.5)},${Math.round(y - hh)} L${Math.round(x0 + W / n)},${y}`; } return `<path d="${d} L${W},${H} Z" fill="${col}"/>`; };
  const dots = (col, n, ymin, ymax, r, op, ph) => Array.from({ length: n }, (_, i) => `<circle cx="${Math.round(((i * 97 + (ph || 0) * 31) % 400))}" cy="${Math.round(ymin + ((i * 53 + (ph || 0) * 17) % 100) / 100 * (ymax - ymin))}" r="${r}" fill="${col}" opacity="${op}"/>`).join('');
  const rect = (x, y, w, h, c, o) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${o ? ` opacity="${o}"` : ''}/>`;
  const wrap = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs}</defs>${body}</svg>`;
  const S = {};
  S.A = wrap(g('s', '#22362c', '#0d1612') + rg('l', '#7cffb0', .5), // 地下墓地
    rect(0, 0, W, H, 'url(#s)') + [30, 130, 250, 350].map(x => rect(x, 0, 18, 120, '#17231d') + `<path d="M${x - 14},120 Q${x + 9},70 ${x + 32},120 Z" fill="#17231d"/>`).join('') +
    `<ellipse cx="200" cy="130" rx="190" ry="40" fill="url(#l)" opacity=".4"/>` + ridge('#0a110d', 138, 6, 20) +
    [60, 170, 290, 370].map((x, i) => `<path d="M${x},148 L${x},${118 - i % 2 * 8} Q${x + 11},${106 - i % 2 * 8} ${x + 22},${118 - i % 2 * 8} L${x + 22},148 Z" fill="#101a15"/>`).join('') + dots('#9dffc4', 14, 40, 130, 1.6, .7));
  S.B = wrap(g('s', '#3a1510', '#120605') + rg('l', '#ff6a1a', .85), // 火山窟
    rect(0, 0, W, H, 'url(#s)') + `<ellipse cx="200" cy="165" rx="260" ry="70" fill="url(#l)"/>` + spikes('#1a0b08', 118, 60, 12, 1) + spikes('#0b0403', 142, 40, 9, 4) +
    `<path d="M0,152 Q100,140 200,152 T400,150 L400,160 L0,160Z" fill="#ff7a22" opacity=".85"/>` + dots('#ffb060', 22, 20, 140, 1.6, .75));
  S.C = wrap(g('s', '#1b3a5c', '#0a1626') + rg('l', '#8ee8ff', .55), // 氷晶窟
    rect(0, 0, W, H, 'url(#s)') + `<ellipse cx="200" cy="150" rx="220" ry="60" fill="url(#l)" opacity=".6"/>` +
    [[40, 150, 28, 90], [110, 150, 22, 62], [210, 150, 34, 104], [300, 150, 26, 74], [370, 150, 24, 96]].map(([x, y, w, h]) => `<polygon points="${x - w},${y} ${x - w / 3},${y - h} ${x + w / 3},${y - h + 12} ${x + w},${y}" fill="#7fd8f5" opacity=".55"/><polygon points="${x - w / 3},${y - h} ${x},${y} ${x + w / 3},${y - h + 12}" fill="#e6fbff" opacity=".55"/>`).join('') + ridge('#0a1828', 146, 4, 18) + dots('#fff', 18, 10, 120, 1.3, .8));
  S.D = wrap(g('s', '#1f4a2a', '#0a1a10') + rg('l', '#e8ffb0', .55), // 古代樹の森
    rect(0, 0, W, H, 'url(#s)') + `<polygon points="150,0 230,0 330,160 120,160" fill="url(#l)" opacity=".35"/>` +
    [20, 105, 255, 345].map((x, i) => rect(x, 0, 30 + i % 2 * 10, H, '#0f2616') + `<circle cx="${x + 15}" cy="14" r="${38 + i * 3}" fill="#17381f"/>`).join('') + ridge('#081209', 146, 6, 16) + dots('#d8ff7a', 18, 50, 140, 1.8, .85, 2));
  S.E = wrap(g('s', '#6a4a22', '#241608') + rg('l', '#ffd27a', .8), // 砂塵の遺跡
    rect(0, 0, W, H, 'url(#s)') + `<circle cx="300" cy="46" r="30" fill="url(#l)"/><circle cx="300" cy="46" r="12" fill="#fff0c0"/>` + ridge('#3d2a12', 112, 18, 6, 1) +
    [70, 160, 250].map((x, i) => rect(x, 70 - i % 2 * 12, 16, 70 + i % 2 * 12, '#2b1d0c') + rect(x - 5, 66 - i % 2 * 12, 26, 7, '#2b1d0c')).join('') + `<polygon points="320,140 360,84 400,140" fill="#2b1d0c"/>` + ridge('#190f05', 142, 8, 8, 3) + dots('#ffd9a0', 20, 30, 140, 1.2, .35));
  S.F = wrap(g('s', '#0d5060', '#041a24') + rg('l', '#9ef2ff', .5), // 水没神殿
    rect(0, 0, W, H, 'url(#s)') + `<polygon points="90,0 130,0 190,160 60,160" fill="url(#l)" opacity=".28"/><polygon points="280,0 310,0 360,160 260,160" fill="url(#l)" opacity=".22"/>` +
    [40, 130, 220, 310, 380].map((x, i) => rect(x, 40 + i % 2 * 14, 20, 120, '#06303a') + rect(x - 5, 36 + i % 2 * 14, 30, 8, '#06303a')).join('') + `<path d="M0,40 Q50,30 100,40 T200,40 T300,40 T400,40" fill="none" stroke="#9ef2ff" stroke-width="2" opacity=".45"/>` + ridge('#03141b', 148, 5, 14) + dots('#c8fbff', 24, 20, 150, 2, .5, 1));
  S.G = wrap(g('s', '#2c2b66', '#0f0e2a') + rg('l', '#fff3a0', .85), // 空中庭園
    rect(0, 0, W, H, 'url(#s)') + `<polyline points="320,0 300,50 322,54 298,100" fill="none" stroke="#fff3a0" stroke-width="3" filter="none"/><ellipse cx="300" cy="60" rx="60" ry="40" fill="url(#l)" opacity=".3"/>` +
    `<ellipse cx="80" cy="120" rx="110" ry="18" fill="#403f86" opacity=".7"/><ellipse cx="320" cy="132" rx="130" ry="20" fill="#34336f" opacity=".8"/>` + [[70, 96], [160, 88], [250, 100]].map(([x, y]) => `<polygon points="${x - 36},${y} ${x + 36},${y} ${x + 18},${y + 22} ${x - 18},${y + 22}" fill="#1b1a40"/><rect x="${x - 6}" y="${y - 24}" width="12" height="24" fill="#1b1a40"/>`).join('') + dots('#c9c4ff', 16, 6, 70, 1.2, .7));
  S.H = wrap(g('s', '#363e44', '#12161a') + rg('l', '#ffb347', .6), // 地下都市
    rect(0, 0, W, H, 'url(#s)') + [[60, 50, 38], [170, 90, 28], [300, 56, 44], [370, 110, 22]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#1d2328" stroke-width="${r / 3}" stroke-dasharray="${r / 2} ${r / 3}"/><circle cx="${x}" cy="${y}" r="${r / 3}" fill="#1d2328"/>`).join('') +
    rect(0, 120, W, 8, '#0c0f12') + rect(0, 20, W, 6, '#0c0f12') + [40, 190, 340].map(x => `<circle cx="${x}" cy="${130}" r="40" fill="url(#l)" opacity=".5"/><circle cx="${x}" cy="130" r="4" fill="#ffd89a"/>`).join('') + ridge('#0a0c0e', 148, 5, 12) + `<rect x="0" y="100" width="400" height="30" fill="#7fffa0" opacity=".08"/>`);
  S.I = wrap(g('s', '#4a0e1c', '#13040a') + rg('l', '#ff4a5e', .7), // 魔王城
    rect(0, 0, W, H, 'url(#s)') + `<circle cx="300" cy="50" r="50" fill="url(#l)" opacity=".5"/><circle cx="300" cy="50" r="26" fill="#ff7a86"/>` +
    `<path d="M40,160 L40,86 L58,70 L76,86 L76,60 L94,40 L112,60 L112,100 L150,100 L150,76 L168,54 L186,76 L186,100 L230,100 L230,70 L246,50 L262,70 L262,110 L310,110 L310,90 L326,72 L342,90 L342,160 Z" fill="#0c0206"/>` + [[100, 60], [250, 80]].map(([x, y]) => `<rect x="${x}" y="${y}" width="5" height="9" fill="#ffb347"/>`).join('') + dots('#1a0508', 5, 20, 80, 5, .9));
  S.J = wrap(g('s', '#2a3f4a', '#0c1519') + rg('l', '#b9ff9a', .5), // 幻霧の湿原
    rect(0, 0, W, H, 'url(#s)') + `<rect x="0" y="86" width="400" height="26" fill="#9fc8b8" opacity=".14"/><rect x="0" y="116" width="400" height="22" fill="#9fc8b8" opacity=".12"/>` +
    [30, 120, 280, 360].map((x, i) => `<path d="M${x},148 Q${x - 4},110 ${x + 2},${70 - i * 6} M${x + 2},${100 - i * 4} L${x + 24},${88 - i * 4} M${x},120 L${x - 20},108" stroke="#0f1a1d" stroke-width="4" fill="none"/>`).join('') + ridge('#0a1214', 146, 5, 30, 2) + [[90, 100], [200, 82], [310, 110]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="url(#l)"/><circle cx="${x}" cy="${y}" r="3" fill="#eaffd8"/>`).join(''));
  S.K = wrap(g('s', '#1d2056', '#080a22') + rg('l', '#ff8be8', .6), // 水晶の大鉱脈
    rect(0, 0, W, H, 'url(#s)') + [[60, 150, 26, 100, '#5ad8ff'], [140, 150, 20, 70, '#ff8be8'], [230, 150, 32, 118, '#9a8bff'], [320, 150, 24, 84, '#5ad8ff'], [380, 150, 18, 60, '#ff8be8']].map(([x, y, w, h, c]) => `<polygon points="${x - w},${y} ${x - w / 3},${y - h} ${x + w / 3},${y - h + 10} ${x + w},${y}" fill="${c}" opacity=".6"/><polygon points="${x - w / 3},${y - h} ${x},${y} ${x + w / 3},${y - h + 10}" fill="#fff" opacity=".35"/>`).join('') + `<ellipse cx="200" cy="150" rx="200" ry="40" fill="url(#l)" opacity=".4"/>` + ridge('#070820', 150, 4, 16) + dots('#fff', 18, 10, 110, 1.4, .8, 3));
  S.L = wrap(g('s', '#2d1846', '#0e0618') + rg('l', '#ffb35a', .6), // 亡者の大聖堂
    rect(0, 0, W, H, 'url(#s)') + [40, 150, 250, 350].map((x, i) => `<path d="M${x - 24},150 L${x - 24},60 Q${x},12 ${x + 24},60 L${x + 24},150 Z" fill="#150a24"/><path d="M${x - 12},140 L${x - 12},66 Q${x},38 ${x + 12},66 L${x + 12},140 Z" fill="${['#b56bff', '#ff8be8', '#7fb6ff', '#ffb35a'][i]}" opacity=".35"/>`).join('') + rect(0, 140, W, 20, '#0a0412') + [[96, 138], [200, 138], [306, 138]].map(([x, y]) => `<rect x="${x}" y="${y - 12}" width="4" height="12" fill="#e8dcff"/><circle cx="${x + 2}" cy="${y - 16}" r="7" fill="url(#l)"/>`).join(''));
  S.M = wrap(g('s', '#0d1f4a', '#040916') + rg('l', '#cfe4ff', .6), // 天文台
    rect(0, 0, W, H, 'url(#s)') + dots('#fff', 40, 4, 110, 1.1, .85, 5) + `<path d="M40,28 L120,50" stroke="#fff" stroke-width="2" opacity=".9"/><path d="M110,160 L110,110 Q200,40 290,110 L290,160 Z" fill="#0a1022"/><path d="M196,64 L204,64 L212,112 L188,112 Z" fill="#101a3a"/><line x1="230" y1="96" x2="330" y2="40" stroke="#1a2650" stroke-width="7"/>` + ridge('#050a18', 150, 4, 14) + `<circle cx="340" cy="30" r="14" fill="url(#l)"/>`);
  S.N = wrap(g('s', '#5a3a2a', '#1b100a') + rg('l', '#ffcf9a', .5), // 竜骨の渓谷
    rect(0, 0, W, H, 'url(#s)') + `<circle cx="320" cy="44" r="22" fill="url(#l)"/>` + spikes('#2a1810', 60, 50, 6, 2) + `<path d="M120,150 Q160,30 260,60" stroke="#e8d8c0" stroke-width="7" fill="none" opacity=".7"/><path d="M140,150 Q180,50 270,78" stroke="#e8d8c0" stroke-width="6" fill="none" opacity=".6"/><path d="M160,150 Q200,70 280,96" stroke="#e8d8c0" stroke-width="5" fill="none" opacity=".5"/>` + ridge('#120906', 146, 8, 10, 1) + `<ellipse cx="70" cy="132" rx="22" ry="14" fill="#e8d8c0" opacity=".6"/><circle cx="62" cy="130" r="4" fill="#120906"/>`);
  S.O = wrap(g('s', '#120a2e', '#030108') + rg('l', '#b56bff', .8), // 虚空の神殿
    rect(0, 0, W, H, 'url(#s)') + dots('#fff', 34, 4, 150, 1.1, .7, 7) + `<circle cx="200" cy="74" r="58" fill="url(#l)"/><circle cx="200" cy="74" r="30" fill="#05020c" stroke="#d6a8ff" stroke-width="2.5"/>` + [[60, 40, 30], [330, 100, 26], [90, 120, 22], [310, 36, 18]].map(([x, y, w]) => `<polygon points="${x - w},${y + 10} ${x},${y - 12} ${x + w},${y + 10} ${x + w * .6},${y + 20} ${x - w * .6},${y + 20}" fill="#1c0f3c" stroke="#8a5fe0" stroke-width="1"/>`).join(''));
  S.T = wrap(g('s', '#2a2060', '#0b0820') + rg('l', '#c8b8ff', .5), // 天蓋の塔
    rect(0, 0, W, H, 'url(#s)') + dots('#e8e0ff', 22, 4, 110, 1.1, .7, 4) + `<ellipse cx="200" cy="140" rx="220" ry="30" fill="#4a3f9a" opacity=".5"/><path d="M178,160 L184,28 L196,6 L204,6 L216,28 L222,160 Z" fill="#0b0820"/><rect x="170" y="70" width="60" height="6" fill="#0b0820"/><rect x="166" y="112" width="68" height="7" fill="#0b0820"/><rect x="198" y="40" width="4" height="8" fill="#ffd45a"/>` + `<ellipse cx="200" cy="150" rx="260" ry="26" fill="#6a5cc8" opacity=".35"/>`);
  S.Y = wrap(g('s', '#240a38', '#06020c') + rg('l', '#ff4ad8', .6), // 深淵
    rect(0, 0, W, H, 'url(#s)') + `<ellipse cx="200" cy="80" rx="150" ry="62" fill="url(#l)" opacity=".5"/><path d="M60,80 Q200,10 340,80 Q200,150 60,80 Z" fill="#0a0212" stroke="#ff4ad8" stroke-width="2"/><circle cx="200" cy="80" r="26" fill="#ff4ad8" opacity=".8"/><ellipse cx="200" cy="80" rx="7" ry="22" fill="#06020c"/>` + dots('#d6a8ff', 16, 10, 150, 1.2, .5, 9));
  // ---- 街・ステータス・ヘルプ用 ----
  const win = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c || '#ffd27a'}" opacity=".9"/>`;
  const house = (x, w, h, roof, col) => `<rect x="${x}" y="${H - h - 14}" width="${w}" height="${h + 14}" fill="${col || '#150f26'}"/><polygon points="${x - 4},${H - h - 14} ${x + w / 2},${H - h - 14 - roof} ${x + w + 4},${H - h - 14}" fill="${col || '#150f26'}"/>`;
  S.town = wrap(g('s', '#3b2f62', '#171230') + rg('l', '#ffe9a8', .7) + rg('m', '#fff6d0', .9), // 福音の里（広場）
    rect(0, 0, W, H, 'url(#s)') + dots('#fff6d8', 26, 4, 70, 1.1, .8, 6) + `<circle cx="318" cy="38" r="34" fill="url(#l)"/><circle cx="318" cy="38" r="15" fill="#fff6d0"/>` +
    ridge('#241a44', 120, 14, 8, 2) + house(24, 54, 42, 22) + house(96, 44, 58, 26) + house(250, 60, 46, 24) + house(330, 50, 36, 20) +
    win(40, 106, 8, 10) + win(58, 106, 8, 10) + win(108, 92, 8, 10) + win(124, 92, 8, 10) + win(268, 108, 8, 10) + win(288, 108, 8, 10) + win(346, 116, 8, 10) +
    `<circle cx="190" cy="100" r="30" fill="url(#m)" opacity=".35"/><rect x="188" y="92" width="4" height="48" fill="#0c0818"/><circle cx="190" cy="92" r="5" fill="#ffe9a8"/>` + rect(0, 140, W, 20, '#0c0818'));
  S.inn = wrap(g('s', '#16264e', '#070d20') + rg('l', '#fff6d0', .9) + rg('m', '#ffb35a', .8), // 宿屋「満月亭」
    rect(0, 0, W, H, 'url(#s)') + dots('#fff', 22, 4, 80, 1.1, .75, 3) + `<circle cx="200" cy="52" r="54" fill="url(#l)" opacity=".55"/><circle cx="200" cy="52" r="30" fill="#fff6d0"/><circle cx="190" cy="46" r="4" fill="#e8dfae" opacity=".6"/><circle cx="210" cy="60" r="6" fill="#e8dfae" opacity=".5"/>` +
    `<rect x="96" y="84" width="208" height="76" fill="#0c1230"/><polygon points="86,86 200,56 314,86" fill="#0c1230"/>` + [112, 156, 228, 272].map(x => win(x, 102, 18, 18, '#ffc873')).join('') + `<rect x="184" y="118" width="32" height="42" rx="3" fill="#2a1a10"/><circle cx="200" cy="126" r="30" fill="url(#m)" opacity=".5"/>` + rect(0, 148, W, 12, '#060a1c'));
  S.shop = wrap(g('s', '#5a3a28', '#1c120c') + rg('l', '#ffd9a0', .7), // 売却ショップ（市場）
    rect(0, 0, W, H, 'url(#s)') + [30, 150, 270].map((x, i) => `<polygon points="${x},60 ${x + 100},60 ${x + 112},84 ${x - 12},84" fill="${['#c8453a', '#3a8bc8', '#c89a3a'][i]}"/>` + Array.from({ length: 5 }, (_, k) => `<polygon points="${x + k * 22},60 ${x + k * 22 + 11},60 ${x + k * 22 + 14},84 ${x + k * 22 - 3},84" fill="#f4ead2" opacity=".75"/>`).join('') + rect(x + 4, 84, 5, 66, '#1c120c') + rect(x + 91, 84, 5, 66, '#1c120c') + rect(x - 6, 120, 112, 30, '#2a190e')).join('') +
    [60, 190, 310].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="26" stroke="#1c120c" stroke-width="2"/><circle cx="${x}" cy="32" r="8" fill="url(#l)"/><circle cx="${x}" cy="32" r="4" fill="#fff0c0"/>`).join('') + rect(0, 148, W, 12, '#120a06') + dots('#ffe0a0', 14, 90, 140, 2.2, .7, 8));
  S.smith = wrap(g('s', '#321410', '#0e0504') + rg('l', '#ff7a22', .95) + rg('m', '#ffc060', .8), // 鍛冶屋（炉）
    rect(0, 0, W, H, 'url(#s)') + `<ellipse cx="200" cy="150" rx="190" ry="80" fill="url(#l)"/>` + `<path d="M130,160 L130,92 Q200,50 270,92 L270,160 Z" fill="#1a0a07"/><path d="M158,160 L158,104 Q200,74 242,104 L242,160 Z" fill="#ff8a2a"/><path d="M174,160 L174,116 Q200,96 226,116 L226,160 Z" fill="#ffe08a"/>` +
    `<polygon points="60,150 130,150 124,132 70,132" fill="#0a0403"/><rect x="82" y="120" width="40" height="12" fill="#0a0403"/><rect x="290" y="96" width="6" height="54" fill="#0a0403" transform="rotate(30 293 120)"/><rect x="278" y="92" width="26" height="10" fill="#0a0403" transform="rotate(30 293 97)"/>` + dots('#ffcf70', 26, 20, 140, 1.7, .85, 9) + rect(0, 150, W, 10, '#090302'));
  S.bank = wrap(g('s', '#2a3652', '#0c1020') + rg('l', '#ffe28a', .6), // 福音銀行
    rect(0, 0, W, H, 'url(#s)') + dots('#e8f0ff', 18, 4, 60, 1, .6, 2) + `<polygon points="90,64 200,22 310,64" fill="#1a2238" stroke="#c9b26a" stroke-width="2"/><rect x="90" y="64" width="220" height="10" fill="#1a2238"/>` +
    [110, 150, 190, 230, 270].map(x => rect(x, 74, 14, 70, '#222c48') + rect(x - 3, 70, 20, 6, '#2c3858')).join('') + rect(80, 144, 240, 16, '#141a30') + `<circle cx="200" cy="52" r="9" fill="url(#l)"/><circle cx="200" cy="52" r="5" fill="#ffd45a"/>` + dots('#ffd45a', 8, 90, 140, 2.2, .8, 4));
  S.st_hero = wrap(g('s', '#1d2858', '#080b1e') + rg('l', '#fff3b0', .8), // ステータス：勇者
    rect(0, 0, W, H, 'url(#s)') + dots('#fff', 40, 4, 100, 1.1, .85, 11) + `<circle cx="326" cy="36" r="22" fill="url(#l)"/><circle cx="326" cy="36" r="10" fill="#fff6d0"/>` + ridge('#0a0f26', 124, 22, 7, 4) +
    `<path d="M190,138 L190,100 Q190,92 196,92 L206,92 Q212,92 212,100 L212,138 Z" fill="#04060f"/><circle cx="201" cy="84" r="8" fill="#04060f"/><path d="M190,98 Q172,110 168,134 L196,126 Z" fill="#101a44"/><line x1="214" y1="100" x2="236" y2="56" stroke="#e8f0ff" stroke-width="3"/><polygon points="236,56 233,46 240,54" fill="#fff"/>` + rect(0, 138, W, 22, '#04060f'));
  S.st_gear = wrap(g('s', '#2a2420', '#0e0c0a') + rg('l', '#ffb060', .6), // ステータス：装備
    rect(0, 0, W, H, 'url(#s)') + `<ellipse cx="200" cy="80" rx="170" ry="70" fill="url(#l)" opacity=".5"/>` + `<circle cx="200" cy="84" r="44" fill="#2a3446" stroke="#c9b26a" stroke-width="4"/><circle cx="200" cy="84" r="30" fill="#34425a" stroke="#8d7a3a" stroke-width="2"/><polygon points="200,56 208,80 232,84 208,90 200,112 192,90 168,84 192,80" fill="#c9b26a" opacity=".85"/>` +
    `<line x1="108" y1="140" x2="170" y2="28" stroke="#d9e2f0" stroke-width="7"/><line x1="292" y1="140" x2="230" y2="28" stroke="#d9e2f0" stroke-width="7"/><rect x="96" y="126" width="26" height="6" fill="#8d7a3a" transform="rotate(-30 109 129)"/><rect x="278" y="126" width="26" height="6" fill="#8d7a3a" transform="rotate(30 291 129)"/>` + rect(0, 146, W, 14, '#0a0806'));
  S.st_skill = wrap(g('s', '#2a1456', '#0a0420') + rg('l', '#c9a0ff', .8), // ステータス：スキル
    rect(0, 0, W, H, 'url(#s)') + `<ellipse cx="200" cy="80" rx="190" ry="76" fill="url(#l)" opacity=".4"/>` + [64, 48, 30].map((r, i) => `<circle cx="200" cy="80" r="${r}" fill="none" stroke="${['#c9a0ff', '#e8dcff', '#8a5fe0'][i]}" stroke-width="${3 - i * .6}" ${i === 1 ? 'stroke-dasharray="8 5"' : ''}/>`).join('') +
    `<polygon points="200,18 255,112 145,112" fill="none" stroke="#e8dcff" stroke-width="2.2"/><polygon points="200,142 145,48 255,48" fill="none" stroke="#c9a0ff" stroke-width="2.2"/>` + dots('#f0e6ff', 30, 6, 154, 1.5, .8, 5));
  S.st_mastery = wrap(g('s', '#3a2c18', '#120c06') + rg('l', '#ffd27a', .85), // ステータス：極意
    rect(0, 0, W, H, 'url(#s)') + `<circle cx="200" cy="108" r="64" fill="url(#l)"/><circle cx="200" cy="108" r="26" fill="#ffe9a8"/>` + ridge('#1c1208', 116, 34, 5, 1) + ridge('#0c0804', 136, 14, 9, 3) +
    `<path d="M120,160 L120,96 L214,96 L214,160 M104,96 L230,96 M112,84 L222,84" stroke="#0c0804" stroke-width="7" fill="none"/>` + `<circle cx="300" cy="126" r="7" fill="#06030a"/><path d="M296,150 L300,134 L304,150 Z" fill="#06030a"/>` + dots('#ffe0a0', 12, 20, 100, 1.4, .6, 6));
  S.st_data = wrap(g('s', '#1c2a38', '#080e14') + rg('l', '#7fd8ff', .6), // ステータス：データ
    rect(0, 0, W, H, 'url(#s)') + [0, 1, 2, 3].map(r => rect(24, 20 + r * 34, 352, 6, '#0c141c') + Array.from({ length: 22 }, (_, k) => rect(30 + k * 15.6, 6 + r * 34 + (k % 3), 11, 14 + (k * 7 % 6), ['#3a7bc8', '#c8553a', '#c8a03a', '#3ac88a', '#8a5fe0'][(k + r) % 5], .75)).join('')).join('') + `<ellipse cx="200" cy="140" rx="160" ry="30" fill="url(#l)" opacity=".4"/>`);
  S.help = wrap(g('s', '#4a3220', '#150d08') + rg('l', '#ffd88a', .85), // ヘルプ（書庫）
    rect(0, 0, W, H, 'url(#s)') + [0, 300].map(x => rect(x, 0, 100, H, '#1a0f08') + [0, 1, 2, 3].map(r => rect(x + 4, 8 + r * 38, 92, 5, '#0c0603') + Array.from({ length: 8 }, (_, k) => rect(x + 8 + k * 11, 14 + r * 38 - (k % 3) * 2, 8, 30 + (k % 3) * 2, ['#8c3a2a', '#2a5a8c', '#8c7a2a', '#3a7a4a', '#6a3a8c'][(k + r) % 5], .85)).join('')).join('')).join('') +
    `<ellipse cx="200" cy="100" rx="90" ry="60" fill="url(#l)" opacity=".5"/><path d="M130,120 L200,104 L270,120 L270,142 L200,128 L130,142 Z" fill="#f4ead2"/><line x1="200" y1="104" x2="200" y2="128" stroke="#8c6a3a" stroke-width="2"/>` + Array.from({ length: 4 }, (_, k) => `<line x1="142" y1="${122 + k * 4}" x2="190" y2="${116 + k * 4}" stroke="#8c6a3a" stroke-width="1" opacity=".6"/><line x1="210" y1="${116 + k * 4}" x2="258" y2="${122 + k * 4}" stroke="#8c6a3a" stroke-width="1" opacity=".6"/>`).join('') + `<circle cx="200" cy="40" r="22" fill="url(#l)"/><circle cx="200" cy="40" r="8" fill="#fff0c0"/>`);
  return S;
})();
const _sceneCache = {};
function sceneUri(id) {
  const k = String(id || 'A');
  if (_sceneCache[k]) return _sceneCache[k];
  const svg = SCENES[k] || SCENES.A;
  // style属性（二重引用符）内でも使えるよう、URLは単一引用符で囲み、SVG内の ' は %27 にする
  return (_sceneCache[k] = "url('data:image/svg+xml;utf8," + encodeURIComponent(svg).replace(/'/g, '%27') + "')");
}

const SCENE_ACCENT = { A: '#4fd18a', B: '#ff7a3a', C: '#6fd8ff', D: '#8be05a', E: '#e0b050', F: '#3fc8d8', G: '#a89cff', H: '#9aa8b0', I: '#ff4a5e', J: '#7fc9a8', K: '#c08bff', L: '#b56bff', M: '#7fb6ff', N: '#d0a070', O: '#b56bff', T: '#9a8cff', Y: '#ff4ad8', town: '#f0c870', inn: '#ffd27a', shop: '#e8a060', smith: '#ff8a3a', bank: '#d8c070', st_hero: '#8fb0ff', st_gear: '#d8b070', st_skill: '#c9a0ff', st_mastery: '#ffd27a', st_data: '#7fd8ff', help: '#ffd88a' };
