/* ================= 無限回廊「天蓋の塔」データ ================= */
const TOWER_CFG = {
  // 階層ごとの出現敵帯（DUNGEONS のインデックス範囲）
  bands: [
    { maxFloor: 10, dIds: ['A', 'B', 'C'], maxDropStar: 4, bossCapStar: 5 },
    { maxFloor: 20, dIds: ['D', 'E', 'F'], maxDropStar: 5, bossCapStar: 6 },
    { maxFloor: 35, dIds: ['G', 'H', 'I'], maxDropStar: 5, bossCapStar: 8 },
    { maxFloor: 50, dIds: ['J', 'K', 'L'], maxDropStar: 5, bossCapStar: 8 },
    { maxFloor: 999999, dIds: ['M', 'N', 'O'], maxDropStar: 5, bossCapStar: 9 }
  ],
  // 基礎倍率と指数成長率（1階ごとに growth 倍）
  basePow: 3.10,
  growth: 1.072,
  // 獲得コイン計算: 到達階 + 10階ごとのボーナス（50階以降は2倍）
  coinsForFloor(floor) {
    if (floor <= 0) return 0;
    const tens = Math.floor(floor / 10);
    let bonus = 0;
    for (let k = 1; k <= tens; k++) bonus += 4 + k * 2;
    const raw = floor + bonus;
    return floor >= 50 ? raw * 2 : raw;
  }
};

// 祝福（10階ごとのボス撃破で3択・5階ごとの節目の敵で2択を提示・ラン中のみ有効）
const TOWER_BLESSINGS = [
  // 純粋な強化（12種）
  { id: 'b_atk15',  cat: '強化', name: '戦神の加護',     desc: '攻撃力 +25%',               eff: { atkPct: 0.25 } },
  { id: 'b_atk25',  cat: '強化', name: '覇王の気迫',     desc: '攻撃力 +35%',               eff: { atkPct: 0.35 } },
  { id: 'b_def20',  cat: '強化', name: '金剛の守り',     desc: '防御力 +30%',               eff: { defPct: 0.30 } },
  { id: 'b_def35',  cat: '強化', name: '聖盾の加護',     desc: '防御力 +45%',               eff: { defPct: 0.45 } },
  { id: 'b_hp25',   cat: '強化', name: '巨人の活力',     desc: '最大HP +35%',               eff: { hpPct: 0.35 } },
  { id: 'b_mp30',   cat: '強化', name: '魔力の泉',       desc: '最大MP +40%',               eff: { mpPct: 0.40 } },
  { id: 'b_dmg20',  cat: '強化', name: '必殺の極意',     desc: '与えるダメージ +30%',       eff: { dmgPct: 0.30 } },
  { id: 'b_taken15',cat: '強化', name: '守護の結界',     desc: '受けるダメージ -25%',       eff: { takenPct: -0.25 } },
  { id: 'b_ct1',    cat: '強化', name: '迅速の詠唱',     desc: '全スキルのCT -1ターン',     eff: { ctRed: 1 } },
  { id: 'b_heal30', cat: '強化', name: '慈愛の祈り',     desc: '回復スキル効果 +45%',       eff: { healPct: 0.45 } },
  { id: 'b_exp30',  cat: '強化', name: '叡智の光',       desc: '獲得EXP +35%',              eff: { expPct: 0.35 } },
  { id: 'b_gold40', cat: '強化', name: '黄金の風',       desc: '獲得ゴールド +50%',         eff: { goldPct: 0.50 } },
  // 取引型（6種）
  { id: 'b_glass',  cat: '取引', name: '背水の刃',       desc: '被ダメ+20%の代わりに攻撃力+65%',      eff: { atkPct: 0.65, takenPct: 0.20 } },
  { id: 'b_blood',  cat: '取引', name: '血の契約',       desc: '最大HP-25%の代わりに与ダメ+55%',      eff: { hpPct: -0.25, dmgPct: 0.55 } },
  { id: 'b_nomp',   cat: '取引', name: '無心の境地',     desc: '最大MP-40%の代わりに攻撃力+50%',      eff: { mpPct: -0.40, atkPct: 0.50 } },
  { id: 'b_greed',  cat: '取引', name: '強欲の代償',     desc: '最大HP-20%の代わりに獲得コイン+35%',  eff: { hpPct: -0.20, coinPct: 0.35 } },
  { id: 'b_berserk',cat: '取引', name: '修羅の契約',     desc: '防御力-25%の代わりに与ダメ+50%',      eff: { defPct: -0.25, dmgPct: 0.50 } },
  { id: 'b_frail',  cat: '取引', name: '魔力変換',       desc: '攻撃力-15%の代わりに最大MP+70%',      eff: { atkPct: -0.15, mpPct: 0.70 } },
  // 成長型（6種・50階時点で純粋強化を上回る）
  { id: 'b_g_atk',  cat: '成長', name: '積層の力',       desc: '10階ごとに攻撃力 +12%',               eff: { floorAtk10: 0.12 } },
  { id: 'b_g_def',  cat: '成長', name: '不屈の積み重ね', desc: '10階ごとに防御力 +14%',               eff: { floorDef10: 0.14 } },
  { id: 'b_g_hp',   cat: '成長', name: '深層の生命',     desc: '10階ごとに最大HP +12%',               eff: { floorHp10: 0.12 } },
  { id: 'b_kill_hp',cat: '成長', name: '魂の吸収',       desc: '敵を倒すたびHP 8%回復',               eff: { killHeal: 0.08 } },
  { id: 'b_kill_mp',cat: '成長', name: '魔力回収',       desc: '敵を倒すたびMP 10%回復',              eff: { killMp: 0.10 } },
  { id: 'b_g_dmg',  cat: '成長', name: '天蓋の蓄積',     desc: '10階ごとに与ダメージ +10%',           eff: { floorDmg10: 0.10 } },
  // 特殊（6種）
  { id: 'b_firstcrit', cat: '特殊', name: '先制の一閃',  desc: '各戦闘の初撃が必ず会心になる',        eff: { firstCrit: true } },
  { id: 'b_revive',    cat: '特殊', name: '不死鳥の羽',  desc: '1ランに1度だけ致死ダメージをHP50%で耐える', eff: { reviveOnce: true } },
  { id: 'b_bossdmg',   cat: '特殊', name: '巨獣殺し',    desc: 'ボスへの与ダメージ +50%',             eff: { bossDmg: 0.50 } },
  { id: 'b_events',    cat: '特殊', name: '幸運の導き',  desc: '宝箱・回復の泉の出現率アップ',        eff: { eventBoost: 0.10 } },
  { id: 'b_vamp',      cat: '特殊', name: '深紅の祝福',  desc: '与えたダメージの10%分HPを回復',       eff: { lifeSteal: 0.10 } },
  { id: 'b_thorns',    cat: '特殊', name: '反撃の鎧',    desc: '被弾時、敵に防御力の80%ダメージ',     eff: { thorns: 0.80 } }
];

// 交換所アイテム（★8神話装備のみ。★9神話は交換不可）
const TOWER_SHOP = [
  { id: 'mythic_w8', kind: 'mythic', slot: 'weapon', star: 8, name: '神話の魔王殺しの神剣', desc: '★8 神話レア武器（基礎ATK190 × 6.0）', price: 600 },
  { id: 'mythic_a8', kind: 'mythic', slot: 'armor',  star: 8, name: '神話の機神の鎧',       desc: '★8 神話レア防具（基礎DEF95 × 6.0）',  price: 600 }
];

// 称号（到達階自動取得 + コイン交換）
const TOWER_TITLES = [
  { id: 't_f10',  name: '塔の挑戦者',     desc: '天蓋の塔 10階到達で獲得',  floor: 10 },
  { id: 't_f20',  name: '雲上の探索者',   desc: '天蓋の塔 20階到達で獲得',  floor: 20 },
  { id: 't_f30',  name: '塔の踏破者',     desc: '天蓋の塔 30階到達で獲得',  floor: 30 },
  { id: 't_f50',  name: '天蓋の覇者',     desc: '天蓋の塔 50階到達で獲得',  floor: 50 },
  { id: 't_f75',  name: '星界の征服者',   desc: '天蓋の塔 75階到達で獲得',  floor: 75 },
  { id: 't_f100', name: '天を衝く者',     desc: '天蓋の塔 100階到達で獲得', floor: 100 },
  { id: 't_c1',   name: '黄金の収集家',   desc: '交換所で獲得',             price: 200 },
  { id: 't_c2',   name: '神話の担い手',   desc: '交換所で獲得',             price: 400 },
  { id: 't_c3',   name: '祝福を纏う者',   desc: '交換所で獲得',             price: 700 },
  { id: 't_c4',   name: '無限の求道者',   desc: '交換所で獲得',             price: 1100 },
  { id: 't_c5',   name: '終焉を超えし者', desc: '交換所で獲得',             price: 1600 },
  { id: 't_c6',   name: '天蓋の守護神',   desc: '交換所で獲得',             price: 2400 }
];
