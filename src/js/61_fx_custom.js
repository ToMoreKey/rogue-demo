// ===== R1b-2: キャラ専用スキル22個の個別エフェクト（Q3方式：スキルごとに固有モチーフ） =====
// 各関数は spec.nodes ちょうどのノードを追加する（ティア単調性テストが要素数を使う）。バフ系は既存の強化リングのまま。
const FX_CUSTOM = (() => {
  const SW = (x1, y1, x2, y2, cls) => `<svg viewBox="0 0 100 100" class="fx-svg"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="fx-slash-line ${cls}"/></svg>`;
  const SP = (path, cls) => `<svg viewBox="0 0 100 100" class="fx-svg"><path d="${path}" fill="none" class="fx-slash-line ${cls}"/></svg>`;
  // c = { id, add, box, dur, spec, hit }
  const slash = (c, svg, sz, rot, off, dl) => c.add(`fx-slash fx-side-enemy sig-${c.id}`, svg, c.box(sz, `--fx-rot:${rot}deg;--fx-off:${off}px;animation-delay:${Math.round(c.dur * dl)}ms`));
  const orb = (c, el, dx, dy) => c.add(`fx-magic-orb fx-side-enemy fx-elem-${el}`, '', `--dx:${dx}px;--dy:${dy}px`);
  const spark = (c, dx, dy, col) => c.add('fx-ult-spark fx-side-enemy', '', `--dx:${dx}px;--dy:${dy}px` + (col ? `;background:${col[0]};box-shadow:0 0 12px 3px ${col[1]}` : ''));
  const ring = (c, sz, col, dl, bw) => c.add(`fx-a-ring fx-side-enemy`, '', c.box(sz, `border-radius:50%;border:${bw || 3}px solid ${col};box-shadow:0 0 14px ${col};animation-delay:${Math.round(c.dur * (dl || 0))}ms`));
  const bg = (c, st) => c.add(`fx-ult-bg fx-ult-${st} sig-${c.id}`, '');
  const pillar = (c, w, h, grad, glow, ox, dl) => c.add('fx-a-pillar fx-side-enemy', '', `width:${w}px;height:${h}px;--ox:${ox || 0}px;background:${grad};border-radius:${Math.round(w / 2)}px;filter:drop-shadow(0 0 12px ${glow});animation-delay:${Math.round(c.dur * (dl || 0))}ms`);
  const drop = (c, svg, w, h, sx, sy, ex, ey, rot, dl) => c.add('fx-a-drop fx-side-enemy', svg, `width:${w}px;height:${h}px;--sx:${sx}px;--sy:${sy}px;--ex:${ex}px;--ey:${ey}px;--rot:${rot || 0}deg;animation-delay:${Math.round(c.dur * (dl || 0))}ms`);
  const pop = (c, svg, w, h, ox, oy, rot, dl, side) => c.add(`fx-a-pop fx-side-${side || 'enemy'}`, svg, `width:${w}px;height:${h}px;--ox:${ox || 0}px;--oy:${oy || 0}px;--rot:${rot || 0}deg;animation-delay:${Math.round(c.dur * (dl || 0))}ms`);
  const star = (col, glow) => `<svg viewBox="0 0 40 40" class="fx-svg"><polygon points="20,2 25,15 38,15 28,24 32,38 20,29 8,38 12,24 2,15 15,15" fill="${col}" filter="drop-shadow(0 0 6px ${glow})"/></svg>`;
  const sword = (a, b) => `<svg viewBox="0 0 40 100" class="fx-svg"><polygon points="20,96 12,32 20,10 28,32" fill="${a}" stroke="${b}" stroke-width="2"/><rect x="6" y="28" width="28" height="5" rx="2" fill="${b}"/><rect x="17" y="6" width="6" height="22" fill="${b}"/></svg>`;
  const lance = `<svg viewBox="0 0 30 120" class="fx-svg"><polygon points="15,118 8,30 15,2 22,30" fill="#fffef0" stroke="#ffe27a" stroke-width="2" filter="drop-shadow(0 0 8px #ffe27a)"/><rect x="11" y="26" width="8" height="6" fill="#ffd45a"/></svg>`;
  const wing = (flip) => `<svg viewBox="0 0 80 100" class="fx-svg" style="${flip ? 'transform:scaleX(-1)' : ''}"><path d="M76,50 Q40,0 4,18 Q30,30 14,44 Q38,46 24,62 Q50,60 40,80 Q70,76 76,50 Z" fill="#fffef2" stroke="#ffe27a" stroke-width="2" filter="drop-shadow(0 0 10px #fff3b8)"/></svg>`;
  const mask = `<svg viewBox="0 0 40 50" class="fx-svg"><path d="M4,8 Q20,0 36,8 Q38,34 20,48 Q2,34 4,8 Z" fill="#f4f0ff" stroke="#b56bff" stroke-width="2" filter="drop-shadow(0 0 6px #b56bff)"/><ellipse cx="13" cy="20" rx="4" ry="2.5" fill="#2a1a44"/><ellipse cx="27" cy="20" rx="4" ry="2.5" fill="#2a1a44"/><path d="M12,34 Q20,40 28,34" stroke="#2a1a44" stroke-width="2" fill="none"/></svg>`;
  const card = `<svg viewBox="0 0 40 56" class="fx-svg"><rect x="3" y="3" width="34" height="50" rx="5" fill="#fffdf4" stroke="#e8c23a" stroke-width="2" filter="drop-shadow(0 0 6px #ffd45a)"/><path d="M20,36 L12,24 Q12,16 20,22 Q28,16 28,24 Z" fill="#e0334a"/></svg>`;
  const coin = `<svg viewBox="0 0 30 30" class="fx-svg"><circle cx="15" cy="15" r="12" fill="#ffd45a" stroke="#c98a00" stroke-width="2" filter="drop-shadow(0 0 6px #ffbf3d)"/><circle cx="15" cy="15" r="7" fill="none" stroke="#fff2b0" stroke-width="2"/></svg>`;
  const ember = (c, dx, dy) => orb(c, 'fire', dx, dy);
  const FIRE = 'radial-gradient(circle at 35% 35%,#fff6c0,#ff7b2e 55%,#c82800)';

  return {
    // ---- クロエ（怪盗）----
    rush: (c) => { // 疾走：横一直線の風の疾走線3本（残像）
      for (let i = 0; i < 3; i++) slash(c, SW(0, 50, 100, 50, i ? 'thin' : 'wind'), 100, 0, (i - 1) * 16, 0.16 * i);
    },
    phantomSlash: (c) => { // 幻影斬：闇色の斬撃と、ずれて遅れる幻影
      slash(c, SW(14, 84, 86, 16, 'dark'), c.spec.span, -26, -6, 0);
      slash(c, SW(14, 84, 86, 16, 'thin'), c.spec.span, -26, 14, 0.18);
      slash(c, SW(14, 16, 86, 84, 'dark'), c.spec.span, 26, 6, 0.3);
      slash(c, SW(14, 16, 86, 84, 'thin'), c.spec.span, 26, -14, 0.46);
      orb(c, 'dark', 0, -30);
    },
    shadowPierce: (c) => { // 影穿ち：一直線の黒い刺突と収束する影
      c.add('fx-a-pop fx-side-enemy sig-shadowPierce', SW(0, 50, 100, 50, 'dark'), c.box(c.spec.span + 28, '--ox:-10px;--oy:0px'));
      slash(c, SW(6, 20, 94, 50, 'thin'), c.spec.span, 0, 0, 0.1);
      slash(c, SW(6, 80, 94, 50, 'thin'), c.spec.span, 0, 0, 0.18);
      ring(c, 96, '#b56bff', 0.2, 2.5);
      orb(c, 'dark', -44, -10); orb(c, 'dark', -44, 12);
    },
    bladeDance: (c) => { // 剣舞：回転する風の円弧4つ＋旋風リング
      for (let i = 0; i < 4; i++) c.add('fx-a-spin fx-side-enemy sig-bladeDance', SP('M50,8 A42,42 0 0 1 92,50', 'wind'), c.box(c.spec.span, `--rot:${(i % 2 ? -1 : 1) * 200}deg;animation-delay:${Math.round(c.dur * 0.12 * i)}ms;transform-origin:50% 50%`));
      ring(c, 120, '#8fe8c8', 0.1);
      orb(c, 'ice', 0, -50);
    },
    grandHeist: (c) => { // 大強奪：金の斬撃と降り注ぐ金貨
      slash(c, SW(10, 90, 90, 10, 'heavy'), c.spec.span, 0, 0, 0);
      const xs = [-34, -12, 14, 36];
      for (let i = 0; i < 4; i++) drop(c, coin, 30, 30, xs[i], -62, xs[i] * 0.6, 24, 0, 0.1 * i + 0.1);
      ring(c, 120, '#ffd45a', 0.2);
      spark(c, -50, -30); spark(c, 50, 24);
    },
    thousandCuts: (c) => { // 千の斬撃：赤い背景＋無数の細い斬撃が連打
      bg(c, 'crimson');
      for (let i = 0; i < 5; i++) slash(c, SW(8, 92, 92, 8, 'thin'), 150, ((i * 41) % 120) - 60, ((i * 23) % 40) - 20, 0.07 * i);
      spark(c, 0, -40, ['#fff', '#ff3a55']);
    },
    trumpCard: (c) => { // 切り札：4枚のカードが扇状に降り注ぐ
      bg(c, 'heal');
      const xs = [-54, -18, 18, 54], rs = [-24, -8, 8, 24];
      for (let i = 0; i < 4; i++) drop(c, card, 40, 56, xs[i], -80, xs[i] * 0.45, 4, rs[i], 0.12 * i);
      ring(c, 130, '#e0334a', 0.5, 4);
      spark(c, -56, -30); spark(c, 56, -30); spark(c, 0, 50);
    },
    nightParade: (c) => { // 夜行：影の行列が駆け抜け、月と斬撃
      bg(c, 'dark');
      const sil = `<svg viewBox="0 0 30 70" class="fx-svg"><ellipse cx="15" cy="12" rx="9" ry="10" fill="#1a0c2c"/><path d="M4,68 Q6,28 15,24 Q24,28 26,68 Z" fill="#1a0c2c" stroke="#b56bff" stroke-width="1.5"/></svg>`;
      for (let i = 0; i < 5; i++) pop(c, sil, 34, 76, -78 + i * 38, (i % 2) * 8, 0, 0.1 * i);
      slash(c, SW(6, 94, 94, 6, 'dark'), 170, -20, 0, 0.5);
      slash(c, SW(6, 6, 94, 94, 'dark'), 170, 20, 0, 0.6);
      slash(c, SW(0, 50, 100, 50, 'thin'), 190, 0, 0, 0.7);
      ring(c, 110, '#e8dcff', 0.3, 4);
    },
    thousandMask: (c) => { // 千の仮面：仮面が円状に現れ、赤い斬撃で砕ける
      bg(c, 'dark');
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; pop(c, mask, 40, 50, Math.round(Math.cos(a) * 64), Math.round(Math.sin(a) * 52), 0, 0.06 * i); }
      slash(c, SW(8, 92, 92, 8, 'crimson'), 200, -30, 0, 0.45);
      slash(c, SW(8, 8, 92, 92, 'crimson'), 200, 30, 0, 0.55);
      ring(c, 190, '#b56bff', 0.4, 4);
      spark(c, 0, 0, ['#fff', '#b56bff']);
    },
    nightSky: (c) => { // 夜空：月と流星群と交差する流れ星の斬撃
      bg(c, 'dark');
      c.add('fx-a-pop fx-side-enemy', `<svg viewBox="0 0 60 60" class="fx-svg"><circle cx="30" cy="30" r="22" fill="#fff6d0" filter="drop-shadow(0 0 14px #fff6d0)"/><circle cx="38" cy="26" r="20" fill="#120a24"/></svg>`, 'width:70px;height:70px;--ox:36px;--oy:-60px');
      for (let i = 0; i < 6; i++) drop(c, star('#fff3b8', '#ffd45a'), 22, 22, -80 + i * 32, -90, -60 + i * 28, 30, 30, 0.08 * i);
      slash(c, SW(6, 20, 94, 80, 'wind'), 230, 0, 0, 0.5);
      slash(c, SW(94, 20, 6, 80, 'wind'), 230, 0, 0, 0.58);
      ring(c, 200, '#b56bff', 0.45, 4);
      spark(c, 0, -60); spark(c, 0, 60);
    },
    // ---- ステラ（剣）----
    swordGod: (c) => { // 剣神の一閃：巨大な聖剣が天から落ち、無数の剣が降る
      bg(c, 'crimson');
      drop(c, sword('#fffbe0', '#ffd45a'), 84, 210, 0, -150, 0, 0, 0, 0.05);
      const xs = [-80, -48, 48, 80, 0];
      for (let i = 0; i < 5; i++) drop(c, sword('#fffbe0', '#ffd45a'), 30, 76, xs[i], -90, xs[i] * 0.7, 8, (i - 2) * 6, 0.25 + 0.06 * i);
      ring(c, 150, '#fff3b8', 0.55, 4); ring(c, 210, '#ffd45a', 0.65, 3);
      spark(c, -70, -34); spark(c, 70, -34); spark(c, 0, 66);
    },
    // ---- ルビィ（魔法）----
    arcaneMiracle: (c) => { // 大魔導の奇跡：魔法陣が回転し、光柱が立ち上る
      const circle = `<svg viewBox="0 0 140 140" class="fx-svg"><circle cx="70" cy="70" r="62" fill="none" stroke="#c9b8ff" stroke-width="3"/><polygon points="70,10 122,100 18,100" fill="none" stroke="#9b7aff" stroke-width="2.5"/><polygon points="70,130 18,40 122,40" fill="none" stroke="#9b7aff" stroke-width="2.5"/></svg>`;
      c.add('fx-a-spin fx-side-enemy sig-arcaneMiracle', circle, c.box(c.spec.span, '--rot:240deg'));
      pillar(c, 54, 150, 'linear-gradient(180deg,rgba(220,200,255,.1),rgba(170,130,255,.85),rgba(240,230,255,.2))', '#9b7aff', 0, 0.12);
      ring(c, 150, '#c9b8ff', 0.2); ring(c, 100, '#fff', 0.3, 2);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; orb(c, 'default', Math.round(Math.cos(a) * 52), Math.round(Math.sin(a) * 52)); }
    },
    starDust: (c) => { // 星屑：降り注ぐ星の粒
      bg(c, 'dark');
      for (let i = 0; i < 6; i++) drop(c, star('#e9dcff', '#b56bff'), 20, 20, -70 + i * 28, -96, -50 + i * 20, 20 + (i % 2) * 8, 0, 0.07 * i);
      pop(c, star('#fff6d0', '#ffd45a'), 70, 70, 0, 0, 0, 0.45);
      ring(c, 150, '#b56bff', 0.4);
    },
    skyMeteorite: (c) => { // 蒼穹の流星群：斜めに落ちる燃える隕石3つと衝突の輪
      bg(c, 'fire');
      const sx = [-110, -90, -70], sy = [-100, -110, -90], ex = [-18, 22, 0];
      for (let i = 0; i < 3; i++) c.add('fx-a-drop fx-side-enemy', '', `width:${40 - i * 4}px;height:${40 - i * 4}px;border-radius:50%;background:${FIRE};box-shadow:0 0 18px 4px #ff6a1a;--sx:${sx[i]}px;--sy:${sy[i]}px;--ex:${ex[i]}px;--ey:${i * 10 - 10}px;animation-delay:${Math.round(c.dur * 0.14 * i)}ms`);
      pillar(c, 60, 120, 'linear-gradient(180deg,rgba(255,200,80,.1),rgba(255,110,30,.85),rgba(255,230,160,.2))', '#ff4500', 0, 0.45);
      ring(c, 140, '#ff9a2e', 0.4, 4); ring(c, 200, '#ff5a1a', 0.55, 3);
      ember(c, -56, -34); ember(c, 58, -30); ember(c, -50, 40); ember(c, 52, 42);
    },
    endMagic: (c) => { // 終焉の大魔法：黒い球体が全てを吸い込み、収束後に爆ぜる
      bg(c, 'dark');
      c.add('fx-a-conv fx-side-enemy sig-endMagic', '', 'width:90px;height:90px;border-radius:50%;background:radial-gradient(circle,#000 35%,#6a2bd8 70%,transparent);--sx:0px;--sy:0px');
      ring(c, 220, '#b56bff', 0.05, 3); ring(c, 160, '#7a3bd8', 0.2, 3);
      const pts = [[-90, -40], [90, -40], [-70, 50], [70, 50]];
      for (let i = 0; i < 4; i++) c.add('fx-a-conv fx-side-enemy', '', `width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 0 12px 3px #b56bff;--sx:${pts[i][0]}px;--sy:${pts[i][1]}px`);
      ring(c, 250, '#fff', 0.6, 4);
      spark(c, -80, 0); spark(c, 80, 0); spark(c, 0, -60);
    },
    // ---- シリア（聖）----
    holyBolt: (c) => { // 聖光弾：細い光の筋が真上から敵を撃つ
      pillar(c, 22, 100, 'linear-gradient(180deg,rgba(255,255,230,.1),rgba(255,248,180,.95),rgba(255,255,255,.2))', '#fff3b8', 0, 0);
      ring(c, 70, '#fff3b8', 0.15, 2.5);
      orb(c, 'holy', -26, -20); orb(c, 'holy', 26, 20);
    },
    judgment: (c) => { // 聖裁：光柱と、浮かぶ十字
      pillar(c, 50, 120, 'linear-gradient(180deg,rgba(255,255,230,.1),rgba(255,240,150,.9),rgba(255,255,255,.2))', '#ffd45a', 0, 0);
      pop(c, `<svg viewBox="0 0 60 80" class="fx-svg"><rect x="24" y="4" width="12" height="72" rx="3" fill="#fffef0" stroke="#ffe27a" stroke-width="2"/><rect x="6" y="22" width="48" height="12" rx="3" fill="#fffef0" stroke="#ffe27a" stroke-width="2"/></svg>`, 60, 80, 0, -6, 0, 0.1);
      ring(c, 100, '#fff3b8', 0.25);
      orb(c, 'holy', -34, -20); orb(c, 'holy', 34, -20); orb(c, 'holy', 0, 38);
    },
    holyNova: (c) => { // 聖なる爆光：三重の光輪が広がる
      c.add('fx-a-pop fx-side-enemy sig-holyNova', '', c.box(64, 'border-radius:50%;background:radial-gradient(circle,#fff,rgba(255,240,170,.6) 55%,transparent 72%);--ox:0px;--oy:0px'));
      ring(c, 70, '#fffef0', 0, 3); ring(c, 100, '#fff3b8', 0.1, 3); ring(c, 130, '#ffe27a', 0.2, 2.5);
      orb(c, 'holy', -50, -30); orb(c, 'holy', 50, -30); orb(c, 'holy', 0, 56);
    },
    angelMiracle: (c) => { // 天使の奇跡：光輪と大きな翼、舞い落ちる羽根
      pop(c, wing(true), 84, 104, -50, -4, 0, 0.05); pop(c, wing(false), 84, 104, 50, -4, 0, 0.05);
      ring(c, 70, '#fff3b8', 0.1, 4);
      pillar(c, 46, 140, 'linear-gradient(180deg,rgba(255,255,240,.1),rgba(255,248,190,.85),rgba(255,255,255,.2))', '#fff3b8', 0, 0.15);
      for (let i = 0; i < 3; i++) drop(c, `<svg viewBox="0 0 20 40" class="fx-svg"><path d="M10,2 Q18,20 10,38 Q2,20 10,2 Z" fill="#fff" stroke="#ffe27a"/></svg>`, 12, 26, -40 + i * 40, -70, -50 + i * 50, 30, 20 - i * 20, 0.1 * i + 0.2);
      orb(c, 'holy', -60, -34); orb(c, 'holy', 60, -34);
    },
    divineWrath: (c) => { // 神罰：三本の裁きの雷と神々しい閃光
      bg(c, 'holy');
      const bolt = `<svg viewBox="0 0 60 120" class="fx-svg"><polyline points="34,2 14,52 38,56 12,116" fill="none" stroke="#fffef0" stroke-width="6" stroke-linejoin="round" filter="drop-shadow(0 0 10px #ffd45a)"/></svg>`;
      const xs = [-34, 0, 34];
      for (let i = 0; i < 3; i++) pop(c, bolt, 60, 130, xs[i], -6, 0, 0.1 * i);
      pop(c, `<svg viewBox="0 0 80 80" class="fx-svg"><polygon points="40,2 48,32 78,40 48,48 40,78 32,48 2,40 32,32" fill="#fffef0" filter="drop-shadow(0 0 12px #ffd45a)"/></svg>`, 110, 110, 0, 0, 45, 0.3);
      ring(c, 150, '#ffd45a', 0.3, 4); ring(c, 190, '#fff3b8', 0.45, 3);
      orb(c, 'holy', -60, -40); orb(c, 'holy', 60, -40); orb(c, 'holy', -60, 40); orb(c, 'holy', 60, 40);
    },
    celestialLance: (c) => { // 蒼穹の聖槍：巨大な聖槍が天から貫く
      bg(c, 'holy');
      drop(c, lance, 44, 220, 0, -170, 0, 0, 0, 0.05);
      drop(c, lance, 26, 130, -52, -120, -42, 4, -8, 0.22); drop(c, lance, 26, 130, 52, -120, 42, 4, 8, 0.3);
      ring(c, 160, '#ffe27a', 0.5, 4);
      spark(c, -60, -30); spark(c, 60, -30); spark(c, -40, 50); spark(c, 40, 50);
    },
    heavenStars: (c) => { // 天の星々：聖なる星が一面に降る
      bg(c, 'holy');
      for (let i = 0; i < 7; i++) drop(c, star('#fffef0', '#ffd45a'), 26, 26, -90 + i * 30, -100, -80 + i * 26, 24 - (i % 3) * 14, 0, 0.07 * i);
      ring(c, 200, '#ffe27a', 0.5, 4);
      spark(c, -70, 0); spark(c, 70, 0);
    },
  };
})();
