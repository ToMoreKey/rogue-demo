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
  // ---- 簡易BGM（合成ループ）。scene: town / dungeon / boss / tower ----
  const SCENES = {
    town:    { bpm: 84,  wave: 'sine',     bass: [N.C4 / 2, N.G4 / 2, N.A4 / 2, N.G4 / 2], mel: [N.E5, 0, N.G5, 0, N.A5, 0, N.G5, 0, N.E5, 0, N.D5, 0, N.C5, 0, 0, 0] },
    dungeon: { bpm: 100, wave: 'triangle', bass: [N.A4 / 2, N.A4 / 2, N.G4 / 2, N.E4 / 2], mel: [N.A4, 0, N.C5, 0, N.E5, 0, N.C5, 0, N.D5, 0, N.B4, 0, N.G4, 0, 0, 0] },
    boss:    { bpm: 132, wave: 'sawtooth', bass: [N.D4 / 2, N.D4 / 2, N.C4 / 2, N.D4 / 2], mel: [N.D5, N.D5, 0, N.A4, N.C5, 0, N.D5, 0, N.E5, N.D5, 0, N.C5, N.A4, 0, 0, 0] },
    tower:   { bpm: 112, wave: 'triangle', bass: [N.E4 / 2, N.B4 / 2, N.C4 / 2, N.B4 / 2], mel: [N.E5, 0, N.B4, 0, N.G5, 0, N.E5, 0, N.D5, 0, N.B4, 0, N.A4, 0, 0, 0] }
  };
  let scene = null, timer = null, step = 0, nextT = 0;
  function bgmTick() {
    if (!ctx || !scene) return;
    if (document.hidden) { nextT = ctx.currentTime + 0.1; return; }
    const sc = SCENES[scene], dur = 60 / sc.bpm / 2;
    while (nextT < ctx.currentTime + 0.25) {
      const i = step % 16, m = sc.mel[i];
      if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.02;
      if (i % 4 === 0) toneAt(sc.bass[(i / 4) | 0], dur * 3.6, 'sine', 0.5, nextT);
      if (m) toneAt(m, dur * 1.6, sc.wave, 0.28, nextT);
      nextT += dur; step++;
    }
  }
  function toneAt(f, dur, type, vol, t0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bgmGain); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function bgmUpdate() {
    if (typeof G === 'undefined' || G.headless) return;
    const want = bgmOn() && unlocked && ensure() ? G._bgmScene : null;
    if (bgmGain) bgmGain.gain.value = bgmVol();
    if (!want) { if (timer) { clearInterval(timer); timer = null; } scene = null; return; }
    if (want !== scene) { scene = want; step = 0; nextT = ctx.currentTime + 0.05; }
    if (!timer) timer = setInterval(bgmTick, 60);
    try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
  }
  function setScene(s) { if (G) G._bgmScene = s; bgmUpdate(); }
  if (typeof document !== 'undefined') {
    const u = () => unlock();
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, u, { capture: true, passive: true }));
    document.addEventListener('visibilitychange', () => { if (ctx) { try { document.hidden ? ctx.suspend() : ctx.resume(); } catch (e) {} } });
  }
  return { play, setScene, bgmUpdate, unlock, calls, names: Object.keys(SE) };
})();
