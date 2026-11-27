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
  { id: 'c_tint_gold',  rar: 0, slot: 'tint', name: '黄金の染め',   fx: 'hue-rotate(-95deg) saturate(1.5) brightness(1.08)' },
  { id: 'c_tint_ember', rar: 0, slot: 'tint', name: '夕焼けの染め', fx: 'hue-rotate(-20deg) saturate(1.6) brightness(1.04)' },
  { id: 'c_tint_ink',   rar: 0, slot: 'tint', name: '墨染め',       fx: 'grayscale(.7) brightness(.78) contrast(1.25)' },
  { id: 'c_tint_snow',  rar: 0, slot: 'tint', name: '雪原の染め',   fx: 'hue-rotate(190deg) saturate(.7) brightness(1.15)' },
  { id: 'c_floor_dust', rar: 0, slot: 'floor', name: '土の輪',       fx: 'ring', col: '#c9a77a' },
  { id: 'c_aura_snow',  rar: 0, slot: 'aura',  name: '雪の粒',       fx: 'dots', col: '#e6f4ff' },
  // R
  { id: 'c_floor_light', rar: 1, slot: 'floor', name: '光の輪',       fx: 'ring', col: '#fff2b0' },
  { id: 'c_floor_petal', rar: 1, slot: 'floor', name: '花の輪',       fx: 'ring', col: '#ffb3d1' },
  { id: 'c_floor_star',  rar: 1, slot: 'floor', name: '星の輪',       fx: 'ring', col: '#9fd4ff' },
  { id: 'c_back_wing',   rar: 1, slot: 'back',  name: '小さな白い羽', fx: 'wing', col: '#ffffff', size: 0.7 },
  { id: 'c_back_halo',   rar: 1, slot: 'back',  name: '天使の光輪',   fx: 'halo', col: '#ffe27a' },
  { id: 'c_aura_fly',    rar: 1, slot: 'aura',  name: '蛍の光',       fx: 'dots', col: '#d8ff8a' },
  { id: 'c_floor_water', rar: 1, slot: 'floor', name: '水の輪',       fx: 'ring', col: '#7fd0ff' },
  { id: 'c_floor_leaf',  rar: 1, slot: 'floor', name: '若葉の輪',     fx: 'ring', col: '#8be05a' },
  { id: 'c_back_wing_p', rar: 1, slot: 'back',  name: '桜色の小羽',   fx: 'wing', col: '#ffc0d8', size: 0.7 },
  { id: 'c_back_halo_b', rar: 1, slot: 'back',  name: '蒼の光輪',     fx: 'halo', col: '#9fd4ff' },
  { id: 'c_aura_petal',  rar: 1, slot: 'aura',  name: '桜吹雪',       fx: 'dots', col: '#ffc0d8' },
  // SR
  { id: 'c_back_angel',  rar: 2, slot: 'back',  name: '天使の翼',     fx: 'wing', col: '#fff6d8', size: 1 },
  { id: 'c_back_devil',  rar: 2, slot: 'back',  name: '悪魔の翼',     fx: 'wing', col: '#6a2a5a', size: 1, bat: 1 },
  { id: 'c_back_bell',   rar: 2, slot: 'back',  name: '鐘の光背',     fx: 'bell', col: '#ffd45a' },
  { id: 'c_floor_circle_r', rar: 2, slot: 'floor', name: '紅の魔法陣', fx: 'circle', col: '#ff6a7a' },
  { id: 'c_floor_circle_b', rar: 2, slot: 'floor', name: '蒼の魔法陣', fx: 'circle', col: '#6ac0ff' },
  { id: 'c_aura_fire',   rar: 2, slot: 'aura',  name: '炎のオーラ',   fx: 'glow', col: '#ff7a3a', dots: '#ffb36a' },
  { id: 'c_aura_ice',    rar: 2, slot: 'aura',  name: '氷のきらめき', fx: 'glow', col: '#7fd8ff', dots: '#e6f8ff' },
  { id: 'c_back_fire',   rar: 2, slot: 'back',  name: '炎の翼',       fx: 'wing', col: '#ff8a3a', size: 1, glow: 1 },
  { id: 'c_back_bell_s', rar: 2, slot: 'back',  name: '銀の光背',     fx: 'bell', col: '#d8e4ff' },
  { id: 'c_floor_circle_g', rar: 2, slot: 'floor', name: '翠の魔法陣', fx: 'circle', col: '#6be585' },
  { id: 'c_floor_circle_y', rar: 2, slot: 'floor', name: '黄金の魔法陣', fx: 'circle', col: '#ffd45a' },
  { id: 'c_aura_thunder', rar: 2, slot: 'aura', name: '雷のオーラ',   fx: 'glow', col: '#c8b0ff', dots: '#fff56a' },
  { id: 'c_aura_wind',   rar: 2, slot: 'aura',  name: '風の葉',       fx: 'glow', col: '#8be05a', dots: '#d8ff8a' },
  // SSR
  { id: 'c_aura_rainbow', rar: 3, slot: 'aura', name: '七色のオーラ', fx: 'rainbow' },
  { id: 'c_aura_stardust', rar: 3, slot: 'aura', name: '星屑の嵐',    fx: 'glow', col: '#ffe27a', dots: '#ffffff', many: 1 },
  { id: 'c_back_star',   rar: 3, slot: 'back',  name: '星屑の翼',     fx: 'wing', col: '#9fe8ff', size: 1.15, glow: 1 },
  { id: 'c_back_gospel', rar: 3, slot: 'back',  name: '福音の大鐘',   fx: 'bell', col: '#ffe27a', big: 1 },
  { id: 'c_back_phoenix', rar: 3, slot: 'back', name: '不死鳥の翼',   fx: 'wing', col: '#ff6a3a', size: 1.2, glow: 1 },
  { id: 'c_floor_gospel', rar: 3, slot: 'floor', name: '福音の大魔法陣', fx: 'circle', col: '#ffe27a', big: 1 },
  { id: 'c_aura_moon',   rar: 3, slot: 'aura',  name: '月光の帳',     fx: 'glow', col: '#b8c8ff', dots: '#ffffff', many: 1 }
];
// ガチャ称号（既存の称号一覧に合流する）
const GACHA_TITLES = [
  { id: 'g_t1', rar: 0, name: 'しずくの拾い人' }, { id: 'g_t2', rar: 0, name: '鐘守の見習い' }, { id: 'g_t3', rar: 0, name: '里の常連' },
  { id: 'g_t4', rar: 1, name: '福音のくじ運' }, { id: 'g_t5', rar: 1, name: '鐘の音に導かれし者' },
  { id: 'g_t6', rar: 2, name: '百年目の冒険者' }, { id: 'g_t7', rar: 2, name: '星降る夜の旅人' },
  { id: 'g_t8', rar: 3, name: '終焉に抗う鐘' },
  { id: 'g_t9', rar: 0, name: 'しずくの数え人' }, { id: 'g_t10', rar: 0, name: '広場の見回り' }, { id: 'g_t11', rar: 0, name: '宿屋の常連客' }, { id: 'g_t12', rar: 0, name: '寝坊の冒険者' },
  { id: 'g_t13', rar: 1, name: '鐘守の弟子' }, { id: 'g_t14', rar: 1, name: 'ミレイのお気に入り' }, { id: 'g_t15', rar: 1, name: 'トトの上客' }, { id: 'g_t16', rar: 1, name: '里の人気者' },
  { id: 'g_t17', rar: 2, name: '鐘楼の守り手' }, { id: 'g_t18', rar: 2, name: '百の挑戦者' }, { id: 'g_t19', rar: 2, name: 'ガンドが認めた者' },
  { id: 'g_t20', rar: 3, name: '福音の継ぎ手' }
].map(t => ({ id: t.id, rar: t.rar, name: t.name, desc: 'ガチャ「福音のくじ」で獲得', gacha: true }));
// 図鑑の飾り枠（図鑑・実績画面の枠）
const DEX_FRAMES = [
  { id: 'f_wood',  rar: 0, name: '木目の額縁',   bd: '#8a5a2a', bg: 'rgba(138,90,42,.12)', glow: 'rgba(138,90,42,.35)' },
  { id: 'f_leaf',  rar: 1, name: '若葉の額縁',   bd: '#58c98a', bg: 'rgba(88,201,138,.10)', glow: 'rgba(88,201,138,.45)' },
  { id: 'f_sea',   rar: 1, name: '深海の額縁',   bd: '#4aa8e0', bg: 'rgba(74,168,224,.10)', glow: 'rgba(74,168,224,.45)' },
  { id: 'f_royal', rar: 2, name: '王家の金縁',   bd: '#e9b43c', bg: 'rgba(233,180,60,.12)', glow: 'rgba(233,180,60,.6)' },
  { id: 'f_sakura', rar: 3, name: '福音の花吹雪', bd: '#ffa3c9', bg: 'rgba(255,163,201,.12)', glow: 'rgba(255,163,201,.7)' },
  { id: 'f_stone', rar: 0, name: '石畳の額縁',   bd: '#8a93a6', bg: 'rgba(138,147,166,.12)', glow: 'rgba(138,147,166,.35)' },
  { id: 'f_ink',   rar: 0, name: '墨絵の額縁',   bd: '#6b7280', bg: 'rgba(30,30,40,.30)',    glow: 'rgba(107,114,128,.35)' },
  { id: 'f_sun',   rar: 1, name: '夕焼けの額縁', bd: '#ff9a5a', bg: 'rgba(255,154,90,.10)',  glow: 'rgba(255,154,90,.45)' },
  { id: 'f_vio',   rar: 1, name: '菫の額縁',     bd: '#a78bfa', bg: 'rgba(167,139,250,.10)', glow: 'rgba(167,139,250,.45)' },
  { id: 'f_ice',   rar: 2, name: '氷晶の額縁',   bd: '#7fd8ff', bg: 'rgba(127,216,255,.12)', glow: 'rgba(127,216,255,.65)' },
  { id: 'f_crim',  rar: 2, name: '紅蓮の額縁',   bd: '#ff5a6a', bg: 'rgba(255,90,106,.12)',  glow: 'rgba(255,90,106,.65)' },
  { id: 'f_moon',  rar: 3, name: '月光の額縁',   bd: '#c8d4ff', bg: 'rgba(40,50,110,.35)',   glow: 'rgba(200,212,255,.75)' }
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
