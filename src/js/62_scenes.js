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

const SCENE_ACCENT = { A: '#4fd18a', B: '#ff7a3a', C: '#6fd8ff', D: '#8be05a', E: '#e0b050', F: '#3fc8d8', G: '#a89cff', H: '#9aa8b0', I: '#ff4a5e', J: '#7fc9a8', K: '#c08bff', L: '#b56bff', M: '#7fb6ff', N: '#d0a070', O: '#b56bff', T: '#9a8cff', Y: '#ff4ad8' };
