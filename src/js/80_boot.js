/* ================= boot ================= */
function boot() {
  if (!load()) { G.p = newPlayer(); }
  // チュートリアル中: captureフェーズで全クリックを横取りし、許可ACTのみ実行
  document.addEventListener('click', e => {
    if (e.target.closest('#tut-skip')) return; // スキップは通常フローで処理

    const b = e.target.closest('[data-act]');
    if (!b) return;

    // チュートリアル中は許可チェック → 不許可ならブロックして終了
    if (G.tutorial && !G.tutorial.done && G.tutorial.step !== 2) {
      const allow = tutAllowClick(G.tutorial.step, b);
      if (!allow) {
        e.stopPropagation();
        e.preventDefault();
        return; // 以降のリスナーにも届かせない
      }
    }

    // disabled ならスキップ
    if (b.disabled) { e.stopPropagation(); e.preventDefault(); return; }

    // ACT を実行してバブリングもキャンセル（二重実行防止）
    e.stopPropagation();
    const fn = ACTS[b.dataset.act];
    if (fn) fn(b.dataset, b);
  }, true); // capture: true
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target && e.target.id === 'bank-amt') { e.preventDefault(); bankMove('dep', false); }
  });
  document.getElementById('tut-skip').addEventListener('click', () => tutSkip());
  setInterval(() => {
    const p = G.p;
    if (G.view === 'town' && !G.run && p.hp < maxHp(p)) { p.hp = Math.min(maxHp(p), p.hp + 2); renderHUD(); if (G.townView === 'plaza') renderTown(); }
  }, 1000);
  window.addEventListener('pagehide', save);
  renderAll();
  // 新規プレイヤーのみチュートリアルを開始
  tutInit();
}

window.G = G;
window.__rogue = {
  runEvent, nextFloor, onKill, gainExp, battleRound, spawnEnemy, calcDmg, itemName, PROPS, RARITY, BAG_CAP, LV_CAP,
  TUNE, G, ACTS, tick, startRun, finishRun, genItem, receiveItem, itemPower, weaponAtk, sellValue, spriteSVG, SHAPES, PAL, DUNGEONS, DIFFS, SK,
  SKILL_TREES, passiveBonus, CHAR_SKINS,
  smithCost, smithUpgrade, STONES, STONE_REQ,
  maxHp, maxMp, playerAtk, playerDef, expNeed, renderAll, save, load, equipBest, newPlayer, usePotion, scaleOf,
  setHeadless(v) { G.headless = !!v; },
  setRng(f) { rng = f || Math.random; },
  noTimer(v) { G.noTimer = !!v; ensureLoop(); },
  regen(n) { const p = G.p; p.hp = Math.min(maxHp(p), p.hp + n); renderAll(); }
};
boot();
})();
