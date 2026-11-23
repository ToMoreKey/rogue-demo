/* ================= data ================= */
const SAVE_KEY = 'rogue_test_save_v1';
// テスト版ビルドのみ true（tools/build.py の to_dev が置換）。本番では開発用の機能を出さない
const IS_DEV_BUILD = false;
const APP_VERSION = 'rogue-v34';
const BACKUP_META_KEY = 'rogue_backup_meta_v1';
const IDB_BACKUP_NAME = 'rogue_backup_db_v1';
const BAG_CAP = 60;
const MAX_BAG_CAP = 120;
const TICK_MS = 650;

const LV_CAP = 140;
const TUNE = { floorSpan: 0.8, atkExp: 0.92, hpScale: 1.35, atkScale: 1.02, defScale: 1, bossHp: 2.5, bossAtk: 1.4, bossDef: 1, expScale: 1, goldScale: 0.30, floorRegen: 0 };
const EARLY_EASE = {
  A: { novice: { hp: 0.62, atk: 0.72 } },
  B: { novice: { hp: 0.68, atk: 0.78 } },
  C: { novice: { hp: 0.74, atk: 0.84 } }
};
const earlyEase = (dId, dfId) => (EARLY_EASE[dId] && EARLY_EASE[dId][dfId]) || { hp: 1, atk: 1 };
