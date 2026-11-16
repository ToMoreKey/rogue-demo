
const DIFFS = [
  { id: 'novice',  name: '初級', tag: '入口',   floors: 5,  stars: [[1, 70], [2, 30]],          rar: [70, 24, 5.5, 0.5], clearGold: 60,   clearSp: 2,  expMult: 1.60, reqDiff: null },
  { id: 'mid',     name: '中級', tag: '道中',   floors: 10, stars: [[2, 45], [3, 40], [4, 15]], rar: [55, 33, 10, 2],    clearGold: 260,  clearSp: 4,  expMult: 1.80, reqDiff: null },
  { id: 'high',    name: '上級', tag: '最深部', floors: 20, stars: [[3, 50], [4, 35], [5, 15]], rar: [40, 38, 17, 5],    clearGold: 650,  clearSp: 8,  expMult: 1.40, reqDiff: null },
  { id: 'super',   name: '超級', tag: '深層',   floors: 50, stars: [[4, 55], [5, 35], [6, 10]], rar: [28, 39, 23, 10],   clearGold: 1000, clearSp: 12, expMult: 0.37, reqDiff: 'high',  bossPrefix: '古の',         bossFilter: 'hue-rotate(38deg) saturate(1.35) contrast(1.08)' },
  { id: 'extreme', name: '極級', tag: '極致',   floors: 80, stars: [[5, 65], [6, 35]],          rar: [18, 37, 29, 16],   clearGold: 1800, clearSp: 16, expMult: 1.25, reqDiff: 'super', bossPrefix: '鬼気を帯びた', bossFilter: 'hue-rotate(-45deg) saturate(1.7) contrast(1.15) brightness(0.95)' }
];

const DUNGEON_REWARD = { A: 1, B: 1.35, C: 1.8, D: 2.3, E: 2.9, F: 3.6 };
const DUNGEONS = [
  { id: 'A', name: '苔むす地下墓地', blurb: '湿った石室に、眠れぬ者たちが巣くう。', pow: [0.54, 1.35, 2.9, 5.2, 8.8], a1: '#17261f', a2: '#0f1815', rec: [1, 9, 18, 30, 42], maxStar: 4, unlock: null,
    mobs: [
      { id: 'a_slime',  name: 'モスライム',   shape: 'slime', hp: 22, atk: 7,  def: 1, exp: 6, gold: 5 },
      { id: 'a_bat',    name: 'ホラーバット', shape: 'bat',   hp: 16, atk: 9,  def: 0, exp: 7, gold: 6 },
      { id: 'a_skel',   name: 'スケルトン',   shape: 'skull', hp: 30, atk: 8,  def: 3, exp: 9, gold: 8 },
      { id: 'a_zombie', name: '這い出る亡者', shape: 'skull', hp: 26, atk: 8,  def: 2, exp: 8, gold: 7 },
      { id: 'a_ghost',  name: '迷える亡霊',   shape: 'bat',   hp: 18, atk: 10, def: 1, exp: 8, gold: 7 }],
    boss: { id: 'a_boss', name: '墓守の王', shape: 'boss', hp: 90, atk: 11, def: 5, exp: 60, gold: 60 } },
  { id: 'B', name: '灼熱の火山窟', blurb: '溶岩の熱が壁を赤く照らす坑道。', pow: [0.75, 1.65, 3.1, 5.3, 8.5], a1: '#2a1713', a2: '#190e0b', rec: [6, 14, 25, 37, 48], maxStar: 4, unlock: null,
    mobs: [
      { id: 'b_imp',     name: 'ファイアインプ',   shape: 'slime', hp: 26, atk: 8,  def: 2, exp: 7,  gold: 6 },
      { id: 'b_sala',    name: 'サラマンダー',     shape: 'bat',   hp: 19, atk: 11, def: 1, exp: 8,  gold: 7 },
      { id: 'b_warrior', name: '炎の戦士',         shape: 'skull', hp: 36, atk: 10, def: 4, exp: 10, gold: 9 },
      { id: 'b_golem',   name: 'ラヴァゴーレム',   shape: 'skull', hp: 31, atk: 10, def: 3, exp: 9,  gold: 8 },
      { id: 'b_spirit',  name: 'フレイムスピリット', shape: 'bat', hp: 22, atk: 12, def: 1, exp: 9,  gold: 8 }],
    boss: { id: 'b_boss', name: '炎竜ヴォルカ', shape: 'boss', hp: 105, atk: 13, def: 6, exp: 70, gold: 70 } },
  { id: 'C', name: '凍てつく氷晶窟', blurb: '音まで凍る、青白い結晶の回廊。', pow: [0.85, 1.95, 3.5, 6.4, 9.8], a1: '#14243a', a2: '#0c1624', rec: [10, 20, 33, 45, 56], maxStar: 5, unlock: null,
    mobs: [
      { id: 'c_snowman', name: 'ユキダルマ',       shape: 'slime', hp: 36, atk: 11, def: 3, exp: 10, gold: 9 },
      { id: 'c_wolf',    name: 'フロストウルフ',   shape: 'bat',   hp: 26, atk: 16, def: 2, exp: 11, gold: 10 },
      { id: 'c_knight',  name: '氷結騎士',         shape: 'skull', hp: 52, atk: 15, def: 7, exp: 14, gold: 13 },
      { id: 'c_spider',  name: 'クリスタルスパイダー', shape: 'skull', hp: 44, atk: 14, def: 5, exp: 12, gold: 11 },
      { id: 'c_witch',   name: '吹雪の魔女',       shape: 'bat',   hp: 30, atk: 17, def: 2, exp: 12, gold: 11 }],
    boss: { id: 'c_boss', name: '氷帝グラシア', shape: 'boss', hp: 150, atk: 20, def: 10, exp: 105, gold: 105 } },
  { id: 'D', name: '古代樹の森', blurb: '巨木の根が絡み合い、濃い瘴気と精霊が息づく森。', pow: [2.2, 4.0, 7.0, 11.0, 16.5], a1: '#14281a', a2: '#0c1a10', rec: [24, 33, 44, 56, 68], maxStar: 5, bossMaxStar: 6, unlock: { d: 'C', df: 'high' },
    mobs: [
      { id: 'd_mushroom', name: 'マッドマッシュ', shape: 'slime', hp: 44, atk: 14, def: 4, exp: 13, gold: 12 },
      { id: 'd_moth',     name: '毒蛾の群れ',     shape: 'bat',   hp: 34, atk: 20, def: 3, exp: 14, gold: 13 },
      { id: 'd_treant',   name: '若木の番人',     shape: 'skull', hp: 62, atk: 18, def: 9, exp: 17, gold: 16 },
      { id: 'd_beetle',   name: '鎧甲虫',         shape: 'skull', hp: 54, atk: 17, def: 8, exp: 15, gold: 14 },
      { id: 'd_dryad',    name: '森の精霊',       shape: 'bat',   hp: 38, atk: 21, def: 4, exp: 15, gold: 14 }],
    boss: { id: 'd_boss', name: '古樹の王ユグ', shape: 'boss', hp: 185, atk: 25, def: 12, exp: 130, gold: 130 } },
  { id: 'E', name: '砂塵の遺跡', blurb: '砂嵐に埋もれた古代王朝の石造迷宮。', pow: [2.8, 5.0, 8.5, 13.5, 19.5], a1: '#33281a', a2: '#211a10', rec: [30, 39, 50, 62, 72], maxStar: 5, bossMaxStar: 6, unlock: { d: 'D', df: 'high' },
    mobs: [
      { id: 'e_scarab',  name: 'スカラベ',       shape: 'slime', hp: 52, atk: 17, def: 6,  exp: 16, gold: 15 },
      { id: 'e_vulture', name: '砂漠コンドル',   shape: 'bat',   hp: 40, atk: 24, def: 4,  exp: 17, gold: 16 },
      { id: 'e_mummy',   name: 'ミイラ兵',       shape: 'skull', hp: 74, atk: 22, def: 11, exp: 21, gold: 19 },
      { id: 'e_golem',   name: '砂岩のゴーレム', shape: 'skull', hp: 66, atk: 21, def: 10, exp: 19, gold: 17 },
      { id: 'e_djinn',   name: '砂塵の精霊',     shape: 'bat',   hp: 46, atk: 25, def: 5,  exp: 19, gold: 17 }],
    boss: { id: 'e_boss', name: '砂王ネフェル', shape: 'boss', hp: 220, atk: 30, def: 15, exp: 160, gold: 160 } },
  { id: 'F', name: '水没神殿', blurb: '蒼い深淵に沈んだ、太古の海神を祀る神殿。', pow: [3.5, 6.2, 10.5, 16.5, 23.0], a1: '#103038', a2: '#0a2028', rec: [36, 45, 55, 66, 76], maxStar: 5, bossMaxStar: 6, unlock: { d: 'E', df: 'high' },
    mobs: [
      { id: 'f_jelly',   name: 'ディープジェリー', shape: 'slime', hp: 62, atk: 20, def: 7,  exp: 20, gold: 18 },
      { id: 'f_piranha', name: '牙魚',             shape: 'bat',   hp: 48, atk: 28, def: 5,  exp: 21, gold: 19 },
      { id: 'f_priest',  name: '溺れた神官',       shape: 'skull', hp: 88, atk: 26, def: 13, exp: 25, gold: 23 },
      { id: 'f_crab',    name: '珊瑚蟹の戦士',     shape: 'skull', hp: 78, atk: 25, def: 12, exp: 23, gold: 21 },
      { id: 'f_siren',   name: 'セイレーン',       shape: 'bat',   hp: 54, atk: 30, def: 6,  exp: 23, gold: 21 }],
    boss: { id: 'f_boss', name: '深海王クラーケン', shape: 'boss', hp: 260, atk: 36, def: 18, exp: 200, gold: 200 } }
];
