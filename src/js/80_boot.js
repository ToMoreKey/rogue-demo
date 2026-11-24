/* ================= boot ================= */
function boot() {
  let hadLocalSave = false;
  try { hadLocalSave = !!localStorage.getItem(SAVE_KEY); } catch (e) {}
  if (!load()) { G.p = newPlayer(); }
  // チュートリアル中: captureフェーズで全クリックを横取りし、許可ACTのみ実行
  document.addEventListener('click', e => {
    requestPersistOnce();
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
  setInterval(() => {
    const p = G.p;
    if (G.view === 'town' && !G.run && p.hp < maxHp(p)) { p.hp = Math.min(maxHp(p), p.hp + 2); renderHUD(); if (G.townView === 'plaza') renderTown(); }
  }, 1000);
  setInterval(() => { if (!document.hidden) flushAnalyticsPlayTime(); else _sessionLastTickAt = Date.now(); }, 30000);
  window.addEventListener('pagehide', () => { flushAnalyticsPlayTime(); save(); idbMirrorSave(true); });
  window.addEventListener('online', () => { flushBugQueue(); });
  flushBugQueue();
  recordAnalyticsLaunch();
  maybeSendAnalytics();
  renderAll();
  // 新規プレイヤーのみチュートリアルを開始
  tutInit();
  if (!hadLocalSave) {
    idbReadSave().then(rec => {
      let nowHas = false;
      try { nowHas = !!localStorage.getItem(SAVE_KEY); } catch (e) {}
      if (!nowHas && rec && typeof rec.raw === 'string' && !G.modalOpen) {
        openIdbRestoreModal(rec);
      }
    });
  } else {
    maybeShowBackupToast();
  }
}

window.G = G;
window.__rogue = {
  migrateSave, claimDexReward, ACH_CATS, ACHIEVEMENTS, checkAchievements, flushPendingAchCoins, SAVE_VERSION, SAVE_KEY, BACKUP_META_KEY, IDB_BACKUP_NAME, BUGREPORT_CFG, ANALYTICS_CFG, APP_VERSION, IS_DEV_BUILD, buildBugDiag, isBugReportConfigured, bugReportWaitSec, readBugQueue, sendBugReport, flushBugQueue, pushBugError, openBugReportModal, getOrCreateAnonId, recordAnalyticsLaunch, flushAnalyticsPlayTime, isAnalyticsOptOut, setAnalyticsOptOut, buildAnalyticsLine, maybeSendAnalytics, buildSavePayload, encodeSaveCode, decodeAndValidateSaveInput, applyImportedSave, idbMirrorSave, idbReadSave, readBackupMeta, maybeShowBackupToast, migrations, isDungeonUnlocked, isDiffUnlocked, MAX_BAG_CAP, MAX_STAR, SMITH_MAX_STAR, gearPower, gearScore, bestGearItem, itemProps, hasProp, ARMOR_PROPS, genMythic9, runEvent, nextFloor, onKill, gainExp, battleRound, spawnEnemy, calcDmg, itemName, PROPS, RARITY, BAG_CAP, LV_CAP,
  TUNE, EARLY_EASE, earlyEase, G, ACTS, tick, startRun, startTowerRun, startAbyssRun, isAbyssUnlocked, isAbyssDiffUnlocked, abyssEff, ABYSS_CFG, ABYSS_CURSES, ABYSS_BOSSES, RANKING_CFG, validateRankingData, calcRankPosition, fetchRanking, cleanRankNick, submitTowerRank, isRankingSubmitConfigured, DEX_ITEM_HINTS, DEX_STARS, DEX_MYTHICS, dexItemKey, dexEnemyGroups, recordDexEnemy, recordDexItem, pickBlessing, towerEff, TOWER_CFG, TOWER_BLESSINGS, TOWER_SHOP, TOWER_TITLES, finishRun, genItem, receiveItem, itemPower, weaponAtk, sellValue, spriteSVG, SHAPES, PAL, DUNGEONS, DIFFS, SK,
  SKILL_TREES, MASTERY_LIST, MASTERY_MAX, masteryCost, passiveBonus, masteryBonus, CHAR_SKINS,
  smithCost, smithUpgrade, reforgeCost, smithReforge, SHOP_ITEMS, buyShopItem, bagExpandCost, expandBag, skillResetCost, STONES, STONE_REQ,
  maxHp, maxMp, playerAtk, playerDef, armorDef, skillMpCost, expNeed, renderAll, renderBattle, renderEnemy, save, load, equipBest, newPlayer, usePotion, scaleOf,
  SKILL_FX_MAP, getSkillFxSpec, playSkillFx, triggerRageFx, clearRageFx, clearSkillFxLayer, clearAllBattleFx, syncBuffAura, isFxEnabled, isReducedMotion,
  setHeadless(v) { G.headless = !!v; },
  setRng(f) { rng = f || Math.random; },
  noTimer(v) { G.noTimer = !!v; ensureLoop(); },
  regen(n) { const p = G.p; p.hp = Math.min(maxHp(p), p.hp + n); renderAll(); }
};
boot();
})();
