/* ================= boot ================= */
function boot() {
  let hadLocalSave = false;
  try { hadLocalSave = !!localStorage.getItem(SAVE_KEY); } catch (e) {}
  let corrupt = false;
  if (!load()) {
    G.p = newPlayer();
    if (hadLocalSave) {   // セーブはあるのに読めない＝壊れている。上書きせずに退避して保護する
      let raw = null; try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
      if (raw) { stashCorruptSave(raw); corrupt = true; G._saveBlocked = true; }
    }
  }
  const storageOk = probeStorage();
  if (!storageOk) G._saveErr = 'storage unavailable';
  watchOtherTabs();
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
    Sound.play('click');

    // ACT を実行してバブリングもキャンセル（二重実行防止）
    e.stopPropagation();
    const fn = ACTS[b.dataset.act];
    if (POWER_ACTS[b.dataset.act]) G._pwArm = Date.now();
    if (b.dataset.act === 'townEnter' || b.dataset.act === 'townBack') { G._npc = null; G._npcEvt = null; }
    else if (NPC_ACTS[b.dataset.act]) { G._npc = null; G._npcEvt = b.dataset.act; }
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
  renderSaveWarn();
  if (hadLocalSave && !corrupt) setTimeout(() => idbMirrorSave(true), 1500);   // 起動時にも1世代
  // 新規プレイヤーのみチュートリアルを開始
  tutInit();
  if (corrupt) {
    G._charSelectOpen = false; G.tutorial = G.tutorial && !G.tutorial.done ? G.tutorial : { done: true };
    openRecoveryModal('セーブデータを読み込めませんでした。');
  } else if (!hadLocalSave) {
    idbReadSave().then(rec => {
      let nowHas = false;
      try { nowHas = !!localStorage.getItem(SAVE_KEY); } catch (e) {}
      if (!nowHas && rec && typeof rec.raw === 'string' && (!G.modalOpen || G._charSelectOpen)) {
        G._charSelectOpen = false;
        openIdbRestoreModal(rec);
      }
    });
  } else {
    maybeShowBackupToast();
  }
}

window.G = G;
window.__rogue = {
  idbReadHistory, openRecoveryModal, renderSaveWarn, saveSummaryOf, probeStorage, migrateSave, claimDexReward, ACH_CATS, ACHIEVEMENTS, checkAchievements, flushPendingAchCoins, SAVE_VERSION, SAVE_KEY, BACKUP_META_KEY, IDB_BACKUP_NAME, BUGREPORT_CFG, ANALYTICS_CFG, APP_VERSION, IS_DEV_BUILD, buildBugDiag, isBugReportConfigured, bugReportWaitSec, readBugQueue, sendBugReport, flushBugQueue, pushBugError, openBugReportModal, getOrCreateAnonId, recordAnalyticsLaunch, flushAnalyticsPlayTime, isAnalyticsOptOut, setAnalyticsOptOut, buildAnalyticsLine, maybeSendAnalytics, buildSavePayload, encodeSaveCode, decodeAndValidateSaveInput, applyImportedSave, idbMirrorSave, idbReadSave, readBackupMeta, maybeShowBackupToast, migrations, isDungeonUnlocked, isDiffUnlocked, MAX_BAG_CAP, MAX_STAR, SMITH_MAX_STAR, gearPower, gearScore, bestGearItem, itemProps, hasProp, ARMOR_PROPS, genMythic9, runEvent, nextFloor, onKill, gainExp, battleRound, spawnEnemy, calcDmg, itemName, PROPS, RARITY, BAG_CAP, LV_CAP,
  TUNE, EARLY_EASE, earlyEase, G, ACTS, tick, startRun, startTowerRun, startAbyssRun, isAbyssUnlocked, isAbyssDiffUnlocked, abyssEff, ABYSS_CFG, ABYSS_CURSES, ABYSS_BOSSES, RANKING_CFG, validateRankingData, calcRankPosition, fetchRanking, cleanRankNick, submitTowerRank, isRankingSubmitConfigured, DEX_ITEM_HINTS, DEX_STARS, DEX_MYTHICS, dexItemKey, dexEnemyGroups, recordDexEnemy, recordDexItem, pickBlessing, towerEff, TOWER_CFG, TOWER_BLESSINGS, TOWER_SHOP, TOWER_TITLES, finishRun, genItem, receiveItem, itemPower, weaponAtk, sellValue, spriteSVG, SHAPES, PAL, DUNGEONS, DIFFS, SK,
  SKILL_TREES, CHAR_IDS, CHAR_CLASS_META, CHAR_TREES, getCharTrees, getCharSkillPts, getCharTutorialTarget, makeDefaultChars, syncActiveCharState, openCharSelectModal, openV9ResetNoticeModal, MASTERY_LIST, MASTERY_MAX, masteryCost, passiveBonus, masteryBonus, CHAR_SKINS,
  smithCost, smithUpgrade, reforgeCost, smithReforge, SHOP_ITEMS, buyShopItem, bagExpandCost, expandBag, skillResetCost, NPCS, NPC_EXTRA, GUIDE_LINES, npcSay, npcTalk, npcStage, npcTalkPool, Sound, popDamage, battleImpact, bossBanner, levelBand, killFx, lowHpWarn, buyBuildBook, switchBuild, FIRST_GOALS, goalState, checkGoals, goalsVisible, resetAllTrees, allResetInfo, buildCount, BUILD_BOOK_PRICES, syncActiveCharState, STONES, STONE_REQ,
  maxHp, maxMp, playerAtk, playerDef, armorDef, skillMpCost, expNeed, renderAll, renderBattle, renderEnemy, save, load, equipBest, newPlayer, usePotion, scaleOf,
  SKILL_FX_MAP, getSkillFxSpec, playSkillFx, triggerRageFx, clearRageFx, clearSkillFxLayer, clearAllBattleFx, syncBuffAura, isFxEnabled, isReducedMotion, openFxDebugModal, fxDebugTarget,
  playerAct, enemyAct, useSkillEffect, genBuffMult, statSnap, playerPower, powerRank, powerVerdict, refPower, powerAfterimage, POWER_RANKS, openModal, dropsHtml, growthHtml, sceneUri, SCENE_ACCENT, weaponAtk,
  setHeadless(v) { G.headless = !!v; },
  setRng(f) { rng = f || Math.random; },
  noTimer(v) { G.noTimer = !!v; ensureLoop(); },
  regen(n) { const p = G.p; p.hp = Math.min(maxHp(p), p.hp + n); renderAll(); }
};
boot();
})();
