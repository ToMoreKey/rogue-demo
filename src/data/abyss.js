/* ================= 深淵ダンジョンデータ ================= */
const ABYSS_CURSES = [
  { lv: 1,  id: 'healHalf',  name: '回復半減',     desc: '回復量 -50%（薬・回復スキル・泉）' },
  { lv: 2,  id: 'ctPlus',    name: '詠唱遅延',     desc: '全スキルの CT +1ターン' },
  { lv: 3,  id: 'enAtk15',   name: '深淵の牙',     desc: '敵の攻撃力 +15%' },
  { lv: 4,  id: 'enHp25',    name: '深淵の殻',     desc: '敵の最大HP +25%' },
  { lv: 5,  id: 'mpDown',    name: '魔力枯渇',     desc: '最大MP -25%' },
  { lv: 6,  id: 'noRest',    name: '休息禁止',     desc: '毎階の小休止回復が無効' },
  { lv: 7,  id: 'taken20',   name: '深淵の重圧',   desc: '受けるダメージ +20%' },
  { lv: 8,  id: 'preempt',   name: '奇襲の霧',     desc: '戦闘開始時 30%で敵が先制攻撃' },
  { lv: 9,  id: 'dropHalf',  name: '収奪の呪い',   desc: '通常敵の装備ドロップ率 -50%' },
  { lv: 10, id: 'bossAtk20', name: '主の威圧',     desc: '深淵の主の攻撃力さらに +20%' }
];

const ABYSS_BOSSES = {
  gula:   { id: 'abyss_gula',   name: '喰らう深淵グラトス', shape: 'boss', hp: 620, atk: 92,  def: 38, exp: 900,  gold: 25 },
  mirror: { id: 'abyss_mirror', name: '映す深淵ミラージュ', shape: 'boss', hp: 720, atk: 104, def: 44, exp: 1100, gold: 30 },
  deep:   { id: 'abyss_deep',   name: '沈める深淵アビサル', shape: 'boss', hp: 850, atk: 118, def: 52, exp: 1400, gold: 40 }
};

const ABYSS_CFG = {
  floors: 50,
  bands: [
    { maxFloor: 10, dIds: ['A', 'B', 'C'] },
    { maxFloor: 20, dIds: ['D', 'E', 'F'] },
    { maxFloor: 30, dIds: ['G', 'H', 'I'] },
    { maxFloor: 40, dIds: ['J', 'K', 'L'] },
    { maxFloor: 50, dIds: ['M', 'N', 'O'] }
  ],
  // 難度1〜10の定義（powはBOTで調整）
  diffs: [
    null,
    { lv: 1,  pow: 5.0,  bossKey: 'gula',   bossSuffix: '',    bossMult: 1.0,  coins: 10,  clearGold: 200,  mythicRate: 0.005 },
    { lv: 2,  pow: 6.5,  bossKey: 'gula',   bossSuffix: '',    bossMult: 1.0,  coins: 20,  clearGold: 400,  mythicRate: 0.005 },
    { lv: 3,  pow: 8.0,  bossKey: 'gula',   bossSuffix: '・極', bossMult: 1.15, coins: 30,  clearGold: 600,  mythicRate: 0.005 },
    { lv: 4,  pow: 12.3, bossKey: 'mirror', bossSuffix: '',    bossMult: 1.0,  coins: 40,  clearGold: 800,  mythicRate: 0.008 },
    { lv: 5,  pow: 12.5, bossKey: 'mirror', bossSuffix: '',    bossMult: 1.0,  coins: 50,  clearGold: 1000, mythicRate: 0.008 },
    { lv: 6,  pow: 16.0, bossKey: 'mirror', bossSuffix: '・極', bossMult: 1.15, coins: 60,  clearGold: 1200, mythicRate: 0.010 },
    { lv: 7,  pow: 26.0, bossKey: 'mirror', bossSuffix: '',    bossMult: 1.0,  coins: 70,  clearGold: 1400, mythicRate: 0.015 },
    { lv: 8,  pow: 58.0, bossKey: 'deep',   bossSuffix: '',    bossMult: 1.0,  coins: 80,  clearGold: 1600, mythicRate: 0.015 },
    { lv: 9,  pow: 70.0, bossKey: 'deep',   bossSuffix: '',    bossMult: 1.0,  coins: 90,  clearGold: 1800, mythicRate: 0.015 },
    { lv: 10, pow: 80.0, bossKey: 'deep',   bossSuffix: '・極', bossMult: 1.20, coins: 100, clearGold: 2000, mythicRate: 0.020 }
  ]
};
