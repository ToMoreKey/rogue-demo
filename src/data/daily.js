/* ================= デイリーダンジョン「鐘の試練」 ================= */
const DAILY_CFG = {
  perDay: 3,            // 1日の挑戦回数
  floors: 10,           // 階層数（最後がボス）
  ease: 0.6,            // 敵の強さの係数（Lv・戦闘力に合わせた「適正よりやや易しめ」）
  floorSpan: 0.35,      // 最上階で最下階の何倍まで強くなるか（1+この値）
  clearDrops: 2,        // 踏破で貰える鐘のしずく（基本）
  clearGoldBase: 160    // 踏破ボーナスGold = これ × 強さ係数 × 曜日倍率
};
// 難易度（挑戦者が選ぶ）: mul=敵の強さの係数（ease に掛ける）、drops=踏破しずくの基本値、gold=踏破Goldの倍率
const DAILY_DIFFS = [
  { id: 'easy',   name: 'やさしい', tag: '気軽に',   mul: 0.75, drops: 1, gold: 0.7 },
  { id: 'normal', name: 'ふつう',   tag: '標準',     mul: 1.0,  drops: 2, gold: 1 },
  { id: 'hard',   name: 'むずかしい', tag: '歯ごたえ', mul: 1.5,  drops: 3, gold: 1.6 }
];
const DAILY_DF_KEY = 'rogue_' + (IS_DEV_BUILD ? 'dev_' : '') + 'daily_df';
// 曜日（0=日〜6=土）で変わる試練。src=敵とボスを借りるダンジョン、bonus=踏破の曜日ボーナス
const DAILY_THEMES = [
  { wd: 0, src: 'I', name: '魔王城の試練',   icon: '🏰', bonus: { drops: 2 }, bonusTxt: 'しずく +2' },
  { wd: 1, src: 'B', name: '炎の試練',       icon: '🔥', bonus: { exp: 1.6 }, bonusTxt: '獲得EXP ×1.6' },
  { wd: 2, src: 'C', name: '氷の試練',       icon: '❄️', bonus: { gold: 2.5 }, bonusTxt: '獲得Gold ×2.5' },
  { wd: 3, src: 'D', name: '森の試練',       icon: '🌲', bonus: { chest: 1 }, bonusTxt: '踏破で装備宝箱 1個' },
  { wd: 4, src: 'H', name: '機巧の試練',     icon: '⚙️', bonus: { sp: 1 }, bonusTxt: '踏破で SP +1' },
  { wd: 5, src: 'L', name: '聖堂の試練',     icon: '⛪', bonus: { drops: 1 }, bonusTxt: 'しずく +1' },
  { wd: 6, src: 'G', name: '雷鳴の試練',     icon: '⚡', bonus: { exp: 1.3, gold: 1.5 }, bonusTxt: 'EXP ×1.3・Gold ×1.5' }
];
