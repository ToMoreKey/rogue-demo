const RARITY = [
  { id: 'common', name: 'コモン',     mult: 1.0, sell: 10 },
  { id: 'rare',   name: 'レア',       mult: 1.4, sell: 30 },
  { id: 'unique', name: 'ユニーク',   mult: 2.0, sell: 80 },
  { id: 'legend', name: 'レジェンド', mult: 3.5, sell: 250 }
];
// 強化石: 各ダンジョンでドロップ。★3→4に初級石、★4→5に中級石が必要
const STONES = [
  { id: 'stone_nov', name: '初級の強化石', dId: 'A', color: '#8fd1a8' },
  { id: 'stone_mid', name: '中級の強化石', dId: 'B', color: '#ffb06e' },
  { id: 'stone_hi',  name: '上級の強化石', dId: 'C', color: '#9dd0ff' }
];
// ★3→4: stone_nov, ★4→5: stone_mid, ★5→6: stone_hi
const STONE_REQ = { 3: 'stone_nov', 4: 'stone_mid', 5: 'stone_hi' };
const PROPS = {
  madness: { name: '狂気', desc: '攻撃するたびHPが1割減る代わりに、武器攻撃力が2倍', atkMult: 2 },
  flame:   { name: '炎上', desc: '武器攻撃力が1.2倍', atkMult: 1.2 },
  vamp:    { name: '吸血', desc: '与えたダメージの10%分HPを回復', atkMult: 1 }
};
const WEAPON_BASE = [0, 6, 12, 20, 32, 50, 80, 125];
const ARMOR_BASE  = [0, 3, 6, 10, 16, 25, 40, 62];
const WEAPON_NAMES = ['', '見習いの剣', '鉄の剣', '鋼の長剣', '魔銀の大剣', '星砕きの聖剣', '竜殺しの大剣', '時渡りの剣'];
const ARMOR_NAMES  = ['', '布の服', '革の鎧', '鎖かたびら', '魔銀の鎧', '竜鱗の鎧', '古竜の鎧', '雷霆の鎧'];
// ★5防具はキャラごとに別名（見た目のテーマに合わせる）
const ARMOR_STAR5_NAMES = {
  ruby:   '星詠みのローブ',
  stella: '竜騎士の鎧',
  silia:  '聖女の法衣',
  chloe:  '影縫いの忍装束'
};
// 装備の最大★（データ定義上限） / 鍛冶屋での強化上限（★7強化はP2で解放）
const MAX_STAR = WEAPON_BASE.length - 1;
const SMITH_MAX_STAR = 6;
const MAX_RARITY = RARITY.length - 1;
const PREFIX = ['', '上質な', '名工の', '伝説の'];
