/* ================= 鐘のしずく・ガチャ「福音のくじ」データ =================
   景品は見た目のみ（ゲーム性に影響しない）。提供割合は画面にも表示する。 */
const GACHA_CFG = {
  costSingle: 3, costTen: 30,
  rates: [60, 28, 10, 2],         // N / R / SR / SSR (%)
  pity: 50,                        // SSRが出ないまま引いた回数がこの値に達すると次はSSR確定
  refund: [1, 1, 2, 3]             // ダブり時に還元されるしずく
};
const GACHA_RARITY = [
  { k: 'N',   name: 'N',   color: '#9aa7b4' },
  { k: 'R',   name: 'R',   color: '#5ad0e0' },
  { k: 'SR',  name: 'SR',  color: '#b48cff' },
  { k: 'SSR', name: 'SSR', color: '#ffd45a' }
];
const COS_SLOTS = [
  { k: 'tint',  name: '染め' },
  { k: 'back',  name: '背中' },
  { k: 'floor', name: '足元' },
  { k: 'aura',  name: 'オーラ' }
];
// おまけ装備。fx: tint=CSSフィルター / その他=オーバーレイの種類と色
const COSMETICS = [
  // N: 染め
  { id: 'c_tint_red',   rar: 0, slot: 'tint', name: '紅蓮の染め',   fx: 'hue-rotate(-40deg) saturate(1.35)' },
  { id: 'c_tint_sea',   rar: 0, slot: 'tint', name: '深海の染め',   fx: 'hue-rotate(170deg) saturate(1.2)' },
  { id: 'c_tint_leaf',  rar: 0, slot: 'tint', name: '若葉の染め',   fx: 'hue-rotate(80deg) saturate(1.2)' },
  { id: 'c_tint_vio',   rar: 0, slot: 'tint', name: '菫の染め',     fx: 'hue-rotate(250deg) saturate(1.1)' },
  { id: 'c_tint_pink',  rar: 0, slot: 'tint', name: '桃色の染め',   fx: 'hue-rotate(320deg) saturate(1.5) brightness(1.05)' },
  { id: 'c_tint_mono',  rar: 0, slot: 'tint', name: '月影のモノクロ', fx: 'grayscale(1) contrast(1.1)' },
  { id: 'c_tint_sepia', rar: 0, slot: 'tint', name: '古書のセピア', fx: 'sepia(.85) saturate(1.2)' },
  // R
  { id: 'c_floor_light', rar: 1, slot: 'floor', name: '光の輪',       fx: 'ring', col: '#fff2b0' },
  { id: 'c_floor_petal', rar: 1, slot: 'floor', name: '花の輪',       fx: 'ring', col: '#ffb3d1' },
  { id: 'c_floor_star',  rar: 1, slot: 'floor', name: '星の輪',       fx: 'ring', col: '#9fd4ff' },
  { id: 'c_back_wing',   rar: 1, slot: 'back',  name: '小さな白い羽', fx: 'wing', col: '#ffffff', size: 0.7 },
  { id: 'c_back_halo',   rar: 1, slot: 'back',  name: '天使の光輪',   fx: 'halo', col: '#ffe27a' },
  { id: 'c_aura_fly',    rar: 1, slot: 'aura',  name: '蛍の光',       fx: 'dots', col: '#d8ff8a' },
  // SR
  { id: 'c_back_angel',  rar: 2, slot: 'back',  name: '天使の翼',     fx: 'wing', col: '#fff6d8', size: 1 },
  { id: 'c_back_devil',  rar: 2, slot: 'back',  name: '悪魔の翼',     fx: 'wing', col: '#6a2a5a', size: 1, bat: 1 },
  { id: 'c_back_bell',   rar: 2, slot: 'back',  name: '鐘の光背',     fx: 'bell', col: '#ffd45a' },
  { id: 'c_floor_circle_r', rar: 2, slot: 'floor', name: '紅の魔法陣', fx: 'circle', col: '#ff6a7a' },
  { id: 'c_floor_circle_b', rar: 2, slot: 'floor', name: '蒼の魔法陣', fx: 'circle', col: '#6ac0ff' },
  { id: 'c_aura_fire',   rar: 2, slot: 'aura',  name: '炎のオーラ',   fx: 'glow', col: '#ff7a3a', dots: '#ffb36a' },
  { id: 'c_aura_ice',    rar: 2, slot: 'aura',  name: '氷のきらめき', fx: 'glow', col: '#7fd8ff', dots: '#e6f8ff' },
  // SSR
  { id: 'c_aura_rainbow', rar: 3, slot: 'aura', name: '七色のオーラ', fx: 'rainbow' },
  { id: 'c_aura_stardust', rar: 3, slot: 'aura', name: '星屑の嵐',    fx: 'glow', col: '#ffe27a', dots: '#ffffff', many: 1 },
  { id: 'c_back_star',   rar: 3, slot: 'back',  name: '星屑の翼',     fx: 'wing', col: '#9fe8ff', size: 1.15, glow: 1 },
  { id: 'c_back_gospel', rar: 3, slot: 'back',  name: '福音の大鐘',   fx: 'bell', col: '#ffe27a', big: 1 }
];
// ガチャ称号（既存の称号一覧に合流する）
const GACHA_TITLES = [
  { id: 'g_t1', rar: 0, name: 'しずくの拾い人' }, { id: 'g_t2', rar: 0, name: '鐘守の見習い' }, { id: 'g_t3', rar: 0, name: '里の常連' },
  { id: 'g_t4', rar: 1, name: '福音のくじ運' }, { id: 'g_t5', rar: 1, name: '鐘の音に導かれし者' },
  { id: 'g_t6', rar: 2, name: '百年目の冒険者' }, { id: 'g_t7', rar: 2, name: '星降る夜の旅人' },
  { id: 'g_t8', rar: 3, name: '終焉に抗う鐘' }
].map(t => ({ id: t.id, rar: t.rar, name: t.name, desc: 'ガチャ「福音のくじ」で獲得', gacha: true }));
// 図鑑の飾り枠（図鑑・実績画面の枠）
const DEX_FRAMES = [
  { id: 'f_wood',  rar: 0, name: '木目の額縁',   bd: '#8a5a2a', bg: 'rgba(138,90,42,.12)', glow: 'rgba(138,90,42,.35)' },
  { id: 'f_leaf',  rar: 1, name: '若葉の額縁',   bd: '#58c98a', bg: 'rgba(88,201,138,.10)', glow: 'rgba(88,201,138,.45)' },
  { id: 'f_sea',   rar: 1, name: '深海の額縁',   bd: '#4aa8e0', bg: 'rgba(74,168,224,.10)', glow: 'rgba(74,168,224,.45)' },
  { id: 'f_royal', rar: 2, name: '王家の金縁',   bd: '#e9b43c', bg: 'rgba(233,180,60,.12)', glow: 'rgba(233,180,60,.6)' },
  { id: 'f_sakura', rar: 3, name: '福音の花吹雪', bd: '#ffa3c9', bg: 'rgba(255,163,201,.12)', glow: 'rgba(255,163,201,.7)' }
];
// 称号をチュートリアル等の既存の一覧に合流（装備・表示は既存の称号UIがそのまま使える）
GACHA_TITLES.forEach(t => TOWER_TITLES.push(t));
// 抽選プール（景品を混ぜる＝闇鍋）
// ジャンル別のくじ（おまけ装備 / 図鑑の飾り / 称号）。ジャンルごとに専用の景品プールと天井カウントを持つ
const GACHA_GENRES = [
  { k: 'cos',   icon: '👗', name: 'おまけ装備', desc: '染め・背中・足元・オーラ。キャラの見た目が変わる' },
  { k: 'frame', icon: '🖼️', name: '図鑑の飾り', desc: '図鑑・実績画面を飾る額縁' },
  { k: 'title', icon: '🏷️', name: '称号',       desc: 'ステータスの名前の横に付けられる二つ名' }
];
const GACHA_POOL = {};      // GACHA_POOL[genre][rarity] = [景品...]
for (const gr of GACHA_GENRES) GACHA_POOL[gr.k] = [[], [], [], []];
COSMETICS.forEach(c => GACHA_POOL.cos[c.rar].push({ type: 'cos', id: c.id, name: c.name }));
GACHA_TITLES.forEach(t => GACHA_POOL.title[t.rar].push({ type: 'title', id: t.id, name: t.name }));
DEX_FRAMES.forEach(f => GACHA_POOL.frame[f.rar].push({ type: 'frame', id: f.id, name: f.name }));
// ログインボーナス（7日周期）
const LOGIN_REWARDS = [2, 2, 3, 2, 3, 3, 8];
// 初踏破でもらえるしずく（難易度ごと）
const FIRST_CLEAR_DROPS = { novice: 1, mid: 2, high: 3 };
