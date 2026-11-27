/* ================= サウンド（WebAudio 合成・外部音源なし） =================
   - SE は既定ON（小音量）、BGM は既定OFF。opts.se / seVol(0..2) / bgm / bgmVol(0..2)
   - 最初のユーザー操作後にだけ AudioContext を作成・resume（自動再生ポリシー対応）
   - G.headless（BOT）では完全に無音。同種SEは50ms以内に重ねない。
   - テスト用に Sound.calls へ再生要求（SE名）を記録する（直近200件）。 */
const Sound = (() => {
  let ctx = null, master = null, bgmGain = null, unlocked = false;
  const last = {}, calls = [];
  const VOLS = [0.12, 0.25, 0.45];
  const seOn = () => !(G && G.opts && G.opts.se === false);
  const seVol = () => VOLS[Math.max(0, Math.min(2, (G && G.opts && G.opts.seVol) | 0))];
  const bgmOn = () => !!(G && G.opts && G.opts.bgm === true);
  const bgmVol = () => VOLS[Math.max(0, Math.min(2, (G && G.opts && G.opts.bgmVol) | 0))] * 0.5;
  function ensure() {
    if (ctx) return ctx;
    const AC = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
    if (!AC) return null;
    try { ctx = new AC(); master = ctx.createGain(); master.connect(ctx.destination); bgmGain = ctx.createGain(); bgmGain.connect(ctx.destination); } catch (e) { ctx = null; }
    return ctx;
  }
  function unlock() {
    if (unlocked) return; unlocked = true;
    if (!ensure()) return;
    try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
    bgmUpdate();
  }
  // 1音: freq(Hz)→slide, 長さ(秒), 波形, 音量(0..1), 開始遅延(秒)
  function tone(f, dur, type, vol, slide, delay, out) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(out || master); o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(dur, vol, hp, delay) {
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t0 = ctx.currentTime + (delay || 0);
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp || 800; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t0);
  }
  const N = { C4: 261.6, D4: 293.7, E4: 329.6, G4: 392, A4: 440, B4: 493.9, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880, C6: 1046.5 };
  const SE = {
    click:    () => tone(900, 0.04, 'square', 0.18, 700),
    atk:      () => { noise(0.07, 0.5, 1500); tone(300, 0.08, 'triangle', 0.5, 120); },
    crit:     () => { noise(0.1, 0.7, 1200); tone(520, 0.14, 'sawtooth', 0.45, 160); tone(1040, 0.1, 'square', 0.25, 520, 0.02); },
    hit:      () => { tone(160, 0.14, 'sawtooth', 0.55, 60); noise(0.08, 0.35, 300); },
    heal:     () => { tone(N.C5, 0.12, 'sine', 0.4); tone(N.E5, 0.12, 'sine', 0.4, 0, 0.08); tone(N.G5, 0.2, 'sine', 0.4, 0, 0.16); },
    buff:     () => { tone(N.G4, 0.1, 'triangle', 0.4, N.C5); tone(N.C5, 0.18, 'triangle', 0.4, N.G5, 0.08); },
    kill:     () => { tone(420, 0.2, 'square', 0.35, 90); noise(0.15, 0.3, 500, 0.02); },
    bell:     () => { tone(784, 0.9, 'sine', 0.5, 0); tone(1176, 0.7, 'sine', 0.25, 0, 0.02); tone(1568, 0.5, 'sine', 0.12, 0, 0.04); },
    warn:     () => { tone(880, 0.26, 'square', 0.4, 700); tone(660, 0.26, 'square', 0.4, 520, 0.28); },
    rumble:   () => { tone(58, 1.1, 'sawtooth', 0.55, 36); noise(1.0, 0.35, 60); },
    bossKill: () => { tone(300, 0.5, 'sawtooth', 0.5, 50); noise(0.45, 0.5, 300); [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, 0.25, 'triangle', 0.4, 0, 0.35 + i * 0.1)); },
    levelup:  () => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, 0.18, 'triangle', 0.45, 0, i * 0.09)),
    drop0:    () => tone(N.E5, 0.1, 'sine', 0.35),
    drop1:    () => { tone(N.E5, 0.1, 'sine', 0.4); tone(N.A5, 0.12, 'sine', 0.4, 0, 0.07); },
    drop2:    () => { tone(N.G4 * 2, 0.1, 'triangle', 0.4); tone(N.B4 * 2, 0.1, 'triangle', 0.4, 0, 0.07); tone(N.D5 * 2, 0.16, 'triangle', 0.4, 0, 0.14); },
    drop3:    () => [N.C5, N.E5, N.G5, N.C6, N.E5 * 2].forEach((f, i) => tone(f, 0.16, 'triangle', 0.42, 0, i * 0.07)),
    drop4:    () => [N.C5, N.G5, N.C6, N.E5 * 2, N.G5 * 2, N.C6 * 2].forEach((f, i) => tone(f, 0.2, 'sine', 0.42, 0, i * 0.075)),
    equipUp:  () => { tone(440, 0.1, 'triangle', 0.4, 660); tone(660, 0.16, 'triangle', 0.4, 990, 0.09); },
    equipDown:() => { tone(660, 0.1, 'triangle', 0.35, 440); tone(440, 0.16, 'triangle', 0.35, 280, 0.09); },
    sell:     () => { tone(1320, 0.05, 'square', 0.25); tone(1760, 0.08, 'square', 0.25, 0, 0.05); },
    buy:      () => { tone(880, 0.05, 'square', 0.25); tone(660, 0.08, 'square', 0.25, 0, 0.05); },
    win:      () => [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6].forEach((f, i) => tone(f, 0.22, 'triangle', 0.45, 0, i * 0.11)),
    lose:     () => [N.G4, N.E4, N.D4, N.C4].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.35, f * 0.9, i * 0.18)),
    retreat:  () => { tone(500, 0.12, 'triangle', 0.35, 300); tone(300, 0.2, 'triangle', 0.35, 200, 0.1); },
    error:    () => { tone(200, 0.1, 'square', 0.3); tone(150, 0.14, 'square', 0.3, 0, 0.1); }
  };
  function play(name) {
    if (typeof G === 'undefined' || G.headless || !seOn() || !SE[name]) return;
    const now = Date.now();
    if (last[name] && now - last[name] < 50) return;   // 同種SEの間引き
    last[name] = now;
    calls.push(name); if (calls.length > 200) calls.shift();
    if (!unlocked || !ensure()) return;
    try { if (ctx.state === 'suspended') ctx.resume(); master.gain.value = seVol(); SE[name](); } catch (e) {}
  }
  // ---- BGM（合成ループ）。scene: title / town / dungeon / boss / tower ----
  // 8小節(A A' B A'')。prog=各小節の和音(音階度数)、mel=2小節(16step)のフレーズ3種(音階度数, null=休符, 7で1オクターブ上)
  // drum: 1小節8stepの文字列(k=キック h=ハット s=スネア)。arp: 1小節8stepのコード音番号(0..2, -1=休)
  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10];
  const _ = null;
  const SCENES = {
    title: { bpm: 70, key: 62, sc: MIN, wave: 'sine', mvol: 0.20, pad: 0.10, bass: 'half', arp: [0, -1, 1, -1, 2, -1, 1, -1], drum: '........', bell: true,
      prog: [0, 5, 2, 6, 0, 5, 3, 4],
      mel: [[7, _, _, _, 9, _, 8, _, 7, _, _, _, 4, _, _, _], [8, _, _, _, 9, _, 11, _, 9, _, _, _, 8, _, _, _], [7, _, 8, _, 9, _, _, _, 11, _, 9, _, 7, _, _, _]] },
    town: { bpm: 88, key: 60, sc: MAJ, wave: 'triangle', mvol: 0.22, pad: 0.07, bass: 'half', arp: [0, 1, 2, 1, 0, 1, 2, 1], drum: '..h...h.',
      prog: [0, 4, 5, 2, 3, 0, 1, 4],
      mel: [[7, _, 9, _, 11, _, 9, _, 7, _, 4, _, 5, _, _, _], [11, _, 9, _, 7, _, 9, _, 8, _, 7, _, 4, _, _, _], [9, _, 11, _, 12, _, 11, _, 9, _, 7, _, 7, _, _, _]] },
    dungeon: { bpm: 104, key: 57, sc: MIN, wave: 'triangle', mvol: 0.22, pad: 0.07, bass: 'eighth', arp: [0, 2, 1, 2, 0, 2, 1, 2], drum: 'k..hk.h.',
      prog: [0, 5, 2, 6, 0, 5, 3, 4],
      mel: [[7, _, 9, _, 11, _, 9, _, 8, _, 7, _, 4, _, _, _], [9, _, 11, _, 14, _, 11, _, 9, _, 8, _, 7, _, _, _], [7, _, 7, 9, 8, _, 7, _, 11, _, 9, _, 8, _, _, _]] },
    boss: { bpm: 140, key: 50, sc: MIN, wave: 'sawtooth', mvol: 0.15, pad: 0.06, bass: 'eighth', arp: [0, 1, 2, 1, 0, 1, 2, 1], drum: 'k.hkk.hs',
      prog: [0, 0, 5, 6, 0, 0, 3, 4],
      mel: [[7, 7, _, 4, 6, _, 7, _, 9, 7, _, 6, 4, _, _, _], [9, 9, _, 11, 9, _, 8, _, 7, 8, _, 9, 7, _, _, _], [11, _, 11, 9, 8, _, 7, _, 14, 11, _, 9, 8, _, _, _]] },
    tower: { bpm: 112, key: 52, sc: MIN, wave: 'triangle', mvol: 0.22, pad: 0.07, bass: 'eighth', arp: [0, 1, 2, 1, 2, 1, 2, 1], drum: 'k...k.h.',
      prog: [0, 2, 5, 6, 0, 3, 5, 4],
      mel: [[7, _, 4, _, 9, _, 7, _, 6, _, 4, _, 2, _, _, _], [9, _, 7, _, 11, _, 9, _, 8, _, 7, _, 4, _, _, _], [11, _, 9, _, 14, _, 11, _, 9, _, 8, _, 7, _, _, _]] }
  };
  let scene = null, timer = null, step = 0, nextT = 0, sceneGain = null, bgmBus = null, noiseBuf = null, swapTo = null, swapWant = undefined;
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const deg = (sc, d) => { const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7; return sc[i] + 12 * o; };
  function bgmGraph() {          // voices → sceneGain → lowpass → bgmGain、＋ほんのりディレイ
    if (bgmBus || !ctx) return;
    sceneGain = ctx.createGain(); sceneGain.gain.value = 1;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200; lp.Q.value = 0.4;
    const dl = ctx.createDelay(1); dl.delayTime.value = 0.27; const fb = ctx.createGain(); fb.gain.value = 0.28; const wet = ctx.createGain(); wet.gain.value = 0.22;
    sceneGain.connect(lp); lp.connect(bgmGain); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(bgmGain);
    bgmBus = sceneGain;
    const n = ctx.sampleRate * 0.5 | 0; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  }
  function toneAt(f, dur, type, vol, t0, atk) {
    const o = ctx.createOscillator(), g = ctx.createGain(), a = atk || 0.015;
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(vol, 0.0002), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bgmBus); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function drumAt(c, t0, boss) {
    if (c === 'k') {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(130, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.12);
      g.gain.setValueAtTime(boss ? 0.5 : 0.38, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g); g.connect(bgmBus); o.start(t0); o.stop(t0 + 0.2);
    } else if (c === 'h' || c === 's') {
      const sn = ctx.createBufferSource(); sn.buffer = noiseBuf; const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = c === 's' ? 'bandpass' : 'highpass'; f.frequency.value = c === 's' ? 1800 : 7000;
      const dur = c === 's' ? 0.14 : 0.04, v = c === 's' ? 0.22 : 0.07;
      g.gain.setValueAtTime(v, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      sn.connect(f); f.connect(g); g.connect(bgmBus); sn.start(t0); sn.stop(t0 + dur + 0.02);
    }
  }
  function bgmTick() {
    if (!ctx || !scene || !bgmBus) return;
    if (document.hidden) { nextT = ctx.currentTime + 0.1; return; }
    const sc = SCENES[scene], dur = 60 / sc.bpm / 2;
    while (nextT < ctx.currentTime + 0.25) {
      if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.02;
      const i = step % 64, bar = (i / 8) | 0, pos = i % 8, root = sc.prog[bar], t = nextT;
      const tri = [0, 2, 4].map(k => sc.key + deg(sc.sc, root + k));
      if (pos === 0) tri.forEach((m, k) => toneAt(hz(m - 12 + (k === 2 ? 0 : 0)), dur * 7.6, 'sine', sc.pad, t, 0.25));   // パッド(1小節)
      const bm = sc.key + deg(sc.sc, root) - 24;
      if (sc.bass === 'eighth') { if (pos % 2 === 0 || scene === 'boss') toneAt(hz(bm + (pos === 4 ? 12 : 0)), dur * 1.5, 'triangle', 0.34, t); }
      else if (pos === 0 || pos === 4) toneAt(hz(bm), dur * 3.8, 'sine', 0.42, t);
      const ai = sc.arp[pos]; if (ai >= 0) toneAt(hz(tri[ai] + 12), dur * 1.2, 'square', 0.035, t);
      const ph = [0, 1, 0, 2][(bar / 2) | 0], md = sc.mel[ph][(bar % 2) * 8 + pos];
      if (md != null) {
        const m = sc.key + deg(sc.sc, md) + 12;
        toneAt(hz(m), dur * (sc.bell ? 4 : 1.7), sc.wave, sc.mvol, t, sc.bell ? 0.005 : 0.02);
        if (sc.bell) toneAt(hz(m + 12), dur * 2.4, 'sine', sc.mvol * 0.35, t, 0.005);
      }
      const dc = sc.drum[pos]; if (dc && dc !== '.') drumAt(dc, t, scene === 'boss');
      nextT += dur; step++;
    }
  }
  function startScene(want) { scene = want; step = 0; nextT = ctx.currentTime + 0.08; if (sceneGain) sceneGain.gain.setTargetAtTime(1, ctx.currentTime, 0.18); }
  function bgmUpdate() {
    if (typeof G === 'undefined' || G.headless) return;
    const want = bgmOn() && unlocked && ensure() ? G._bgmScene : null;
    if (bgmGain) bgmGain.gain.value = bgmVol();
    if (swapTo && swapWant === want) return;                       // 同じ転換待ちは再スケジュールしない(頻繁な描画で遅れないように)
    if (swapTo) { clearTimeout(swapTo); swapTo = null; }
    if (!want) {
      if (timer && ctx) {
        if (sceneGain) sceneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        swapWant = null; swapTo = setTimeout(() => { swapTo = null; swapWant = undefined; if (!(bgmOn() && G._bgmScene)) { clearInterval(timer); timer = null; scene = null; } else bgmUpdate(); }, 450);
      } else scene = null;
      return;
    }
    bgmGraph();
    if (want !== scene) {
      if (!scene || !timer) startScene(want);
      else {                                                       // 場面転換: フェードアウト→新しい曲をフェードイン
        sceneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        swapWant = want; swapTo = setTimeout(() => { swapTo = null; swapWant = undefined; if (ctx && bgmOn() && G._bgmScene) startScene(G._bgmScene); }, 400);
      }
    } else if (sceneGain) sceneGain.gain.setTargetAtTime(1, ctx.currentTime, 0.1);
    if (!timer) timer = setInterval(bgmTick, 60);
    try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
  }
  function setScene(s) { if (G) G._bgmScene = s; bgmUpdate(); }
  if (typeof document !== 'undefined') {
    const u = () => unlock();
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, u, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => { if (ctx) { try { document.hidden ? ctx.suspend() : ctx.resume(); } catch (e) {} } });
  }
  return { play, setScene, bgmUpdate, unlock, calls, names: Object.keys(SE), scenes: Object.keys(SCENES), bgmState: () => ({ scene, playing: !!timer }) };
})();
