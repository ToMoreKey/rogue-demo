const SK = {
  strike: { id: 'strike', name: '強撃',     mp: 6,  ct: 2, type: 'atk',  hits: 1, mult: 2.0, desc: '2倍のダメージを与える' },
  heal:   { id: 'heal',   name: 'ヒール',   mp: 10, ct: 3, type: 'heal', pct: 0.35,           desc: '最大HPの35%を回復する' },
  guard:  { id: 'guard',  name: '鉄壁',     mp: 8,  ct: 4, type: 'buff', turns: 3,            desc: '3回の被攻撃のあいだ防御力2倍' },
  multi:  { id: 'multi',  name: '連続斬り', mp: 14, ct: 3, type: 'atk',  hits: 3, mult: 0.8, desc: '0.8倍の斬撃を3回放つ' },
  ult:    { id: 'ult',    name: '必殺剣',   mp: 26, ct: 5, type: 'atk',  hits: 1, mult: 4.0, desc: '4倍の渾身の一撃' },
  // 魔法枠スキル
  fireball:  { id: 'fireball',  name: 'ファイアボール', mp: 8, ct: 2, type: 'atk',  hits: 1, mult: 2.0, desc: '炎の魔力で2倍のダメージ' },
  magicshield: { id: 'magicshield', name: 'マジックシールド', mp: 10, ct: 5, type: 'buff', turns: 5, desc: '5ターン防御力1.5倍' },
  thunder:   { id: 'thunder',   name: 'サンダー',       mp: 14, ct: 3, type: 'atk',  hits: 2, mult: 1.2, desc: '雷撃を2回放つ（各1.2倍）' },
  meteor:    { id: 'meteor',    name: 'メテオ',          mp: 30, ct: 6, type: 'atk',  hits: 1, mult: 5.0, desc: '5倍の超高威力魔法攻撃' },
  // 生命枠スキル
  regen:     { id: 'regen',     name: 'リジェネ',       mp: 8,  ct: 4, type: 'heal', pct: 0.15, desc: '毎ターン最大HPの15%を回復（3ターン）', regen: 3 },
  barrier:   { id: 'barrier',   name: 'バリア',         mp: 12, ct: 5, type: 'buff', turns: 3, desc: 'ダメージを3回無効化するバリアを張る', barrier: 3 },
  fullheal:  { id: 'fullheal',  name: 'フルヒール',     mp: 24, ct: 6, type: 'heal', pct: 0.7,  desc: '最大HPの70%を回復する' },
  // 進化枠（戦士）スキル
  berserk:   { id: 'berserk',   name: 'バーサーク',     mp: 20, ct: 6, type: 'buff', turns: 4, desc: '4ターン攻撃力3倍・防御力半減', berserk: true },
  // 進化枠（魔術師）スキル
  blizzard:  { id: 'blizzard',  name: 'ブリザード',     mp: 22, ct: 5, type: 'atk',  hits: 1, mult: 4.5, desc: '4.5倍の氷結魔法で敵を凍らせる' },
  // 進化枠（詠唱）スキル
  resurrection: { id: 'resurrection', name: 'リザレクション', mp: 40, ct: 8, type: 'heal', pct: 1.0, desc: '全回復＋次の致死ダメージを1で耐える', revive: true },
  // 進化枠（英雄）スキル
  heroic:    { id: 'heroic',    name: '英雄の奇跡',     mp: 50, ct: 7, type: 'atk',  hits: 3, mult: 3.0, allMult: 2, desc: '全ステータス2倍で3回攻撃（各3倍）' },
  // 進化枠 第2段階（SP15〜20）スキル
  shura:      { id: 'shura',      name: '修羅の構え',     mp: 32, ct: 7, type: 'buff', turns: 4, shura: true,  desc: '4ターン攻撃力4倍・被ダメ1.2倍' },
  hagun:      { id: 'hagun',      name: '破軍の剣',       mp: 60, ct: 8, type: 'atk',  hits: 1, mult: 12.0,  desc: '12倍の渾身の一撃' },
  iceAge:     { id: 'iceAge',     name: 'アイスエイジ',   mp: 36, ct: 6, type: 'atk',  hits: 1, mult: 6.0, freeze: true, desc: '6倍の氷結魔法で敵を凍らせる' },
  cosmicNova: { id: 'cosmicNova', name: 'コズミックノヴァ', mp: 65, ct: 9, type: 'atk', hits: 1, mult: 14.0, desc: '14倍の星辰爆発魔法' },
  holyLight:  { id: 'holyLight',  name: 'ホーリーライト', mp: 35, ct: 6, type: 'heal', pct: 1.0, defTurns: 3, desc: '最大HP全回復＋3ターン防御1.5倍' },
  requiem:    { id: 'requiem',    name: 'レクイエム',     mp: 50, ct: 9, type: 'heal', pct: 1.0, mpFull: true, desc: 'HP・MPを全回復する' },
  heroAwaken: { id: 'heroAwaken', name: '英雄の覚醒',     mp: 45, ct: 8, type: 'buff', turns: 5, awaken: true, desc: '5ターン全ステータス2.5倍' },
  starSword:  { id: 'starSword',  name: '星剣の極意',     mp: 70, ct: 9, type: 'atk',  hits: 5, mult: 3.0,   desc: '5回攻撃（各3倍）' },
  // 拡張（SP23〜30）スキル
  flameSlash:     { id: 'flameSlash',     name: '烈火斬',               mp: 20, ct: 4, type: 'atk',  hits: 2, mult: 1.6, desc: '炎の斬撃を2回放つ（各1.6倍）' },
  warGod:         { id: 'warGod',         name: '鬼神の構え',           mp: 22, ct: 6, type: 'buff', turns: 4,            desc: '4ターン攻撃力1.8倍（防御は下がらない）' },
  skySlash:       { id: 'skySlash',       name: '天翔斬',               mp: 40, ct: 7, type: 'atk',  hits: 1, mult: 7.0, desc: '7倍の秘剣の一撃' },
  blaze:          { id: 'blaze',          name: 'ブレイズ',             mp: 18, ct: 3, type: 'atk',  hits: 1, mult: 2.6, desc: '業火で2.6倍のダメージ' },
  lightningStorm: { id: 'lightningStorm', name: 'ライトニングストーム', mp: 34, ct: 5, type: 'atk',  hits: 4, mult: 1.0, desc: '雷撃を4回放つ（各1.0倍）' },
  ultima:         { id: 'ultima',         name: 'アルテマ',             mp: 55, ct: 8, type: 'atk',  hits: 1, mult: 9.0, desc: '9倍の究極魔法攻撃' },
  highRegen:      { id: 'highRegen',      name: 'ハイリジェネ',         mp: 14, ct: 4, type: 'heal', pct: 0.25,           desc: '毎ターン最大HPの25%回復（3ターン）', regen: 3 },
  holyBarrier:    { id: 'holyBarrier',    name: 'ホーリーバリア',       mp: 18, ct: 6, type: 'buff', turns: 5,            desc: 'ダメージを5回無効化するバリアを張る', barrier: 5 },
  saintPrayer:    { id: 'saintPrayer',    name: '聖女の祈り',           mp: 45, ct: 8, type: 'heal', pct: 1.0,            desc: '最大HPを全回復する' },
  // 進化枠 第3段階（本編クリア後解放）
  tenma:          { id: 'tenma',          name: '天魔滅殺斬',           mp: 80, ct: 8, type: 'atk',  hits: 1, mult: 18.0, desc: '18倍の極限の一撃' },
  kishin:         { id: 'kishin',         name: '鬼神降臨',             mp: 65, ct: 8, type: 'buff', turns: 5, kishin: true, desc: '5ターン攻撃力5倍・被ダメ1.1倍' },
  zeroAbs:        { id: 'zeroAbs',        name: '絶対零度',             mp: 70, ct: 7, type: 'atk',  hits: 1, mult: 9.0, freeze: 2, desc: '9倍の氷結魔法で敵を2ターン凍らせる' },
  meteorNova:     { id: 'meteorNova',     name: 'メテオノヴァ',         mp: 90, ct: 9, type: 'atk',  hits: 1, mult: 22.0, desc: '22倍の究極星辰魔法' },
  goddess:        { id: 'goddess',        name: '女神の奇跡',           mp: 65, ct: 7, type: 'heal', pct: 1.0, mpFull: true, defTurns: 4, defMult: 2.0, desc: 'HP・MP全回復＋4ターン防御2倍' },
  eternal:        { id: 'eternal',        name: '永劫の祈り',           mp: 75, ct: 9, type: 'heal', pct: 1.0, regen: 5, regenPct: 0.35, barrier: 3, desc: 'HP全回復＋5ターン35%再生＋3回バリア' },
  heroAdvent:     { id: 'heroAdvent',     name: '勇者の光臨',           mp: 70, ct: 8, type: 'buff', turns: 6, advent: true, desc: '6ターン全ステータス3.5倍' },
  skyStar:        { id: 'skyStar',        name: '蒼穹星剣',             mp: 85, ct: 8, type: 'atk',  hits: 6, mult: 4.0, desc: '6回攻撃（各4倍）' },
  genesisRay:     { id: 'genesisRay',     name: '創世の光',             mp: 95, ct: 9, type: 'atk',  hits: 1, mult: 24.0, desc: '24倍の創世の一閃' },
  // R1a 追加スキル（非ヒーラー自己回復・クロエ初期スキル）
  firstAid:       { id: 'firstAid',       name: '応急手当',             mp: 12, ct: 5, type: 'heal', pct: 0.20, desc: '最大HPの20%を回復する' },
  doubleStab:     { id: 'doubleStab',     name: 'ダブルスタブ',         mp: 7,  ct: 2, type: 'atk',  hits: 2, mult: 1.1, desc: '1.1倍の素早い2回攻撃' },
  // R1b 追加スキル（キャラ専用: クロエ15・ステラ1・ルビィ4・シリア7）
  shadowStep: { id: 'shadowStep', name: '影走り', mp: 8, ct: 4, type: 'buff', turns: 3, gen: { turns: 3, defMult: 2 }, desc: '3ターン防御力2倍' },
  rush: { id: 'rush', name: 'ラッシュ', mp: 15, ct: 3, type: 'atk', hits: 4, mult: 0.7, desc: '0.7倍の連撃を4回放つ' },
  bladeDance: { id: 'bladeDance', name: '連刃乱舞', mp: 28, ct: 5, type: 'atk', hits: 6, mult: 0.7, desc: '0.7倍の連撃を6回放つ' },
  phantomSlash: { id: 'phantomSlash', name: '幻影斬', mp: 20, ct: 4, type: 'atk', hits: 3, mult: 1.2, desc: '幻影の斬撃を3回放つ（各1.2倍）' },
  swiftStance: { id: 'swiftStance', name: '疾風の構え', mp: 22, ct: 6, type: 'buff', turns: 4, gen: { turns: 4, atkMult: 1.8 }, desc: '4ターン攻撃力1.8倍' },
  shadowPierce: { id: 'shadowPierce', name: '影縫い', mp: 40, ct: 7, type: 'atk', hits: 1, mult: 7.0, desc: '7倍の影縫いの一撃' },
  frenzyEdge: { id: 'frenzyEdge', name: '狂乱の刃', mp: 20, ct: 6, type: 'buff', turns: 4, gen: { turns: 4, atkMult: 3, defMult: 0.5 }, desc: '4ターン攻撃力3倍・防御力半減' },
  mirageStance: { id: 'mirageStance', name: '幻惑の構え', mp: 32, ct: 7, type: 'buff', turns: 4, gen: { turns: 4, atkMult: 4, takenMult: 1.2 }, desc: '4ターン攻撃力4倍・被ダメ1.2倍' },
  thousandCuts: { id: 'thousandCuts', name: '千刃', mp: 60, ct: 8, type: 'atk', hits: 8, mult: 1.5, desc: '1.5倍の千の刃を8回放つ' },
  nightParade: { id: 'nightParade', name: '百鬼夜行', mp: 80, ct: 8, type: 'atk', hits: 12, mult: 1.5, desc: '1.5倍の百鬼夜行を12回放つ' },
  phantomAdvent: { id: 'phantomAdvent', name: '怪盗降臨', mp: 65, ct: 8, type: 'buff', turns: 5, gen: { turns: 5, atkMult: 5, takenMult: 1.1 }, desc: '5ターン攻撃力5倍・被ダメ1.1倍' },
  grandHeist: { id: 'grandHeist', name: '大怪盗の妙技', mp: 50, ct: 7, type: 'atk', hits: 6, mult: 1.5, desc: '1.5倍の妙技を6回放つ' },
  trumpCard: { id: 'trumpCard', name: '切り札', mp: 70, ct: 9, type: 'atk', hits: 10, mult: 1.5, desc: '1.5倍の切り札を10回放つ' },
  thousandMask: { id: 'thousandMask', name: '千変万化', mp: 85, ct: 8, type: 'atk', hits: 8, mult: 3.0, desc: '8回攻撃（各3倍）' },
  nightSky: { id: 'nightSky', name: '夜天の大強盗', mp: 95, ct: 9, type: 'atk', hits: 12, mult: 2.0, desc: '12回攻撃（各2倍）' },
  swordGod: { id: 'swordGod', name: '剣神の一閃', mp: 95, ct: 9, type: 'atk', hits: 1, mult: 24.0, desc: '24倍の剣神の一閃' },
  arcaneMiracle: { id: 'arcaneMiracle', name: '大魔導の奇跡', mp: 50, ct: 7, type: 'atk', hits: 3, mult: 3.0, desc: '3回攻撃（各3倍）の大魔法' },
  starDust: { id: 'starDust', name: '星屑の極意', mp: 70, ct: 9, type: 'atk', hits: 5, mult: 3.0, desc: '5回攻撃（各3倍）の星屑魔法' },
  skyMeteorite: { id: 'skyMeteorite', name: '蒼穹の流星群', mp: 85, ct: 8, type: 'atk', hits: 6, mult: 4.0, desc: '6回攻撃（各4倍）の流星魔法' },
  endMagic: { id: 'endMagic', name: '終焉の大魔法', mp: 95, ct: 9, type: 'atk', hits: 1, mult: 24.0, desc: '24倍の終焉の大魔法' },
  holyBolt: { id: 'holyBolt', name: '聖光弾', mp: 10, ct: 3, type: 'atk', hits: 1, mult: 1.8, desc: '聖なる光弾で1.8倍のダメージ' },
  judgment: { id: 'judgment', name: '聖裁', mp: 18, ct: 3, type: 'atk', hits: 2, mult: 1.5, desc: '聖なる裁きを2回放つ（各1.5倍）' },
  holyNova: { id: 'holyNova', name: '聖なる爆光', mp: 30, ct: 5, type: 'atk', hits: 1, mult: 5.0, desc: '5倍の聖なる爆光' },
  divineWrath: { id: 'divineWrath', name: '神罰', mp: 55, ct: 7, type: 'atk', hits: 1, mult: 9.0, desc: '9倍の神罰の一撃' },
  angelMiracle: { id: 'angelMiracle', name: '天使の奇跡', mp: 50, ct: 7, type: 'atk', hits: 3, mult: 3.0, desc: '3回攻撃（各3倍）の聖なる光' },
  celestialLance: { id: 'celestialLance', name: '聖槍の極意', mp: 70, ct: 9, type: 'atk', hits: 5, mult: 3.0, desc: '5回攻撃（各3倍）の聖槍' },
  heavenStars: { id: 'heavenStars', name: '蒼穹の聖星', mp: 85, ct: 8, type: 'atk', hits: 6, mult: 4.0, desc: '6回攻撃（各4倍）の聖星' },
  // ルート式で追加（各ツリーの分岐先「もう一方のルート」専用）
  shuraSlash: { id: 'shuraSlash', name: '修羅連斬', mp: 55, ct: 7, type: 'atk', hits: 4, mult: 3.0, desc: '修羅の連斬を4回放つ（各3倍）' },
  thunderGod: { id: 'thunderGod', name: '雷神の怒り', mp: 50, ct: 8, type: 'atk', hits: 5, mult: 1.8, desc: '雷神の怒りを5回放つ（各1.8倍）' },
  holyBarrage: { id: 'holyBarrage', name: '聖光連弾', mp: 36, ct: 5, type: 'atk', hits: 4, mult: 1.6, desc: '聖なる光弾を4回放つ（各1.6倍）' },
  heavenLight: { id: 'heavenLight', name: '天光の裁き', mp: 60, ct: 8, type: 'atk', hits: 1, mult: 10.0, desc: '10倍の天光の一撃' },
  smite: { id: 'smite', name: '断罪', mp: 70, ct: 8, type: 'atk', hits: 3, mult: 4.0, desc: '断罪の光を3回放つ（各4倍）' },
  assassinate: { id: 'assassinate', name: '急所突き', mp: 32, ct: 6, type: 'atk', hits: 2, mult: 4.5, desc: '急所を突く一撃を2回放つ（各4.5倍）' },
  nightFall: { id: 'nightFall', name: '宵闇の一撃', mp: 60, ct: 8, type: 'atk', hits: 1, mult: 11.0, desc: '11倍の宵闇の一撃' },
  counterBlade: { id: 'counterBlade', name: '返し刃', mp: 40, ct: 6, type: 'atk', hits: 3, mult: 2.5, desc: '返し刃を3回放つ（各2.5倍）' },
  mirageBlade: { id: 'mirageBlade', name: '幻惑の連刃', mp: 55, ct: 7, type: 'atk', hits: 5, mult: 3.0, desc: '幻惑の刃を5回放つ（各3倍）' }
};
const SK_ORDER = ['strike', 'doubleStab', 'heal', 'firstAid', 'guard', 'multi', 'ult', 'flameSlash', 'warGod', 'skySlash', 'fireball', 'magicshield', 'thunder', 'meteor', 'blaze', 'lightningStorm', 'ultima', 'regen', 'barrier', 'fullheal', 'highRegen', 'holyBarrier', 'saintPrayer', 'berserk', 'shura', 'hagun', 'tenma', 'kishin', 'blizzard', 'iceAge', 'cosmicNova', 'zeroAbs', 'meteorNova', 'resurrection', 'holyLight', 'requiem', 'goddess', 'eternal', 'heroic', 'heroAwaken', 'starSword', 'heroAdvent', 'skyStar', 'genesisRay',
  // R1b 追加（キャラ専用）
  'shadowStep', 'rush', 'bladeDance', 'phantomSlash', 'swiftStance', 'shadowPierce', 'frenzyEdge', 'mirageStance', 'thousandCuts', 'nightParade', 'phantomAdvent', 'grandHeist', 'trumpCard', 'thousandMask', 'nightSky', 'swordGod', 'arcaneMiracle', 'starDust', 'skyMeteorite', 'endMagic', 'holyBolt', 'judgment', 'holyNova', 'divineWrath', 'angelMiracle', 'celestialLance', 'heavenStars', 'shuraSlash', 'thunderGod', 'holyBarrage', 'heavenLight', 'smite', 'assassinate', 'nightFall', 'mirageBlade', 'counterBlade'];

// ============ DQ8スタイル スキルツリー定義 ============
const SKILL_TREES = [
  {
    id: 'sword',
    name: '剣枠',
    icon: '⚔️',
    maxSp: 30,
    color: '#e88b5a',
    desc: '剣技を極める。攻撃特化スキルを習得。',
    unlockWhen: () => true,  // 常に解放
    milestones: [
      { sp: 3,  id: 'strike',     name: '強撃',       desc: '2倍のダメージを与える' },
      { sp: 6,  id: 'guard',      name: '鉄壁',       desc: '3回の被攻撃のあいだ防御力2倍' },
      { sp: 10, id: 'multi',      name: '連続斬り',   desc: '0.8倍の斬撃を3回放つ' },
      { sp: 15, id: null,         name: '攻撃力+15%', desc: 'パッシブ：攻撃力が15%上昇する', passive: 'sword15' },
      { sp: 20, id: 'ult',        name: '必殺剣',     desc: '4倍の渾身の一撃' },
      { sp: 23, id: 'flameSlash', name: '烈火斬',     desc: '炎の斬撃を2回放つ（各1.6倍）' },
      { sp: 26, id: 'warGod',     name: '鬼神の構え', desc: '4ターン攻撃力1.8倍（防御は下がらない）' },
      { sp: 30, id: 'skySlash',   name: '天翔斬',     desc: '7倍の秘剣の一撃' }
    ]
  },
  {
    id: 'magic',
    name: '魔法枠',
    icon: '✨',
    maxSp: 30,
    color: '#7a9ff5',
    desc: '魔法を極める。高威力の魔法スキルを習得。',
    unlockWhen: () => true,
    milestones: [
      { sp: 3,  id: 'fireball',       name: 'ファイアボール',       desc: '炎の魔力で2倍のダメージ' },
      { sp: 6,  id: 'magicshield',    name: 'マジックシールド',     desc: '5ターン防御力1.5倍' },
      { sp: 10, id: 'thunder',        name: 'サンダー',             desc: '雷撃を2回放つ（各1.2倍）' },
      { sp: 15, id: null,             name: 'MP最大値+20%',       desc: 'パッシブ：最大MPが20%上昇する', passive: 'magic15' },
      { sp: 20, id: 'meteor',         name: 'メテオ',               desc: '5倍の超高威力魔法攻撃' },
      { sp: 23, id: 'blaze',          name: 'ブレイズ',             desc: '業火で2.6倍のダメージ' },
      { sp: 26, id: 'lightningStorm', name: 'ライトニングストーム', desc: '雷撃を4回放つ（各1.0倍）' },
      { sp: 30, id: 'ultima',         name: 'アルテマ',             desc: '9倍の究極魔法攻撃' }
    ]
  },
  {
    id: 'life',
    name: '生命枠',
    icon: '💚',
    maxSp: 30,
    color: '#58c98a',
    desc: '生命力を極める。回復・防御スキルを習得。',
    unlockWhen: () => true,
    milestones: [
      { sp: 3,  id: 'heal',        name: 'ヒール',         desc: '最大HPの35%を回復する' },
      { sp: 6,  id: 'regen',       name: 'リジェネ',       desc: '3ターン間毎ターン最大HPの15%回復' },
      { sp: 10, id: 'barrier',     name: 'バリア',         desc: 'ダメージを3回無効化するバリアを張る' },
      { sp: 15, id: null,          name: 'HP最大値+20%',   desc: 'パッシブ：最大HPが20%上昇する', passive: 'life15' },
      { sp: 20, id: 'fullheal',    name: 'フルヒール',     desc: '最大HPの70%を回復する' },
      { sp: 23, id: 'highRegen',   name: 'ハイリジェネ',   desc: '3ターン間毎ターン最大HPの25%回復' },
      { sp: 26, id: 'holyBarrier', name: 'ホーリーバリア', desc: 'ダメージを5回無効化するバリアを張る' },
      { sp: 30, id: 'saintPrayer', name: '聖女の祈り',     desc: '最大HPを全回復する' }
    ]
  },
  // 進化枠（解放条件あり）
  {
    id: 'warrior',
    name: '戦士枠',
    icon: '🗡️',
    maxSp: 30,
    color: '#e85a5a',
    desc: '剣枠10以上で解放。超攻撃特化の戦士スキル。',
    unlockWhen: (p) => (p.skillPts && p.skillPts.sword >= 10),
    stage2When: (p) => (p.skillPts && p.skillPts.sword >= 30),
    stage2Desc: '剣枠30で第2段階（SP11〜20）解放',
    stage3When: (p) => !!(p && p.ending),
    stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
    milestones: [
      { sp: 5,  id: 'berserk', name: 'バーサーク', desc: '4ターン攻撃力3倍・防御力半減' },
      { sp: 10, id: null,      name: '攻撃力+30%', desc: 'パッシブ：攻撃力がさらに30%上昇', passive: 'warrior10' },
      { sp: 15, id: 'shura',   name: '修羅の構え', desc: '4ターン攻撃力4倍・被ダメ1.2倍' },
      { sp: 20, id: 'hagun',   name: '破軍の剣',   desc: '12倍の渾身の一撃' },
      { sp: 25, id: 'tenma',   name: '天魔滅殺斬', desc: '18倍の極限の一撃' },
      { sp: 30, id: 'kishin',  name: '鬼神降臨',   desc: '5ターン攻撃力5倍・被ダメ1.1倍' }
    ]
  },
  {
    id: 'mage',
    name: '魔術師枠',
    icon: '🔮',
    maxSp: 30,
    color: '#a07af5',
    desc: '魔法枠10以上で解放。超強力な魔術師スキル。',
    unlockWhen: (p) => (p.skillPts && p.skillPts.magic >= 10),
    stage2When: (p) => (p.skillPts && p.skillPts.magic >= 30),
    stage2Desc: '魔法枠30で第2段階（SP11〜20）解放',
    stage3When: (p) => !!(p && p.ending),
    stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
    milestones: [
      { sp: 5,  id: 'blizzard',   name: 'ブリザード',       desc: '4.5倍の氷結魔法で敵を凍らせる' },
      { sp: 10, id: null,         name: 'MP消費-20%・攻撃+15%', desc: 'パッシブ：全スキルのMP消費が20%減少し、攻撃力が15%上昇する', passive: 'mage10' },
      { sp: 15, id: 'iceAge',     name: 'アイスエイジ',     desc: '6倍の氷結魔法で敵を凍らせる' },
      { sp: 20, id: 'cosmicNova', name: 'コズミックノヴァ', desc: '14倍の星辰爆発魔法' },
      { sp: 25, id: 'zeroAbs',    name: '絶対零度',         desc: '9倍の氷結魔法で敵を2ターン凍らせる' },
      { sp: 30, id: 'meteorNova', name: 'メテオノヴァ',     desc: '22倍の究極星辰魔法' }
    ]
  },
  {
    id: 'cleric',
    name: '詠唱枠',
    icon: '🌿',
    maxSp: 30,
    color: '#5ac9a0',
    desc: '生命枠10以上で解放。究極の回復術士スキル。',
    unlockWhen: (p) => (p.skillPts && p.skillPts.life >= 10),
    stage2When: (p) => (p.skillPts && p.skillPts.life >= 30),
    stage2Desc: '生命枠30で第2段階（SP11〜20）解放',
    stage3When: (p) => !!(p && p.ending),
    stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
    milestones: [
      { sp: 5,  id: 'resurrection', name: 'リザレクション', desc: '全回復＋次の致死ダメージを1で耐える' },
      { sp: 10, id: null,           name: 'HP/MP回復+50%', desc: 'パッシブ：全回復系の効果が50%上昇', passive: 'cleric10' },
      { sp: 15, id: 'holyLight',    name: 'ホーリーライト', desc: '最大HP全回復＋3ターン防御1.5倍' },
      { sp: 20, id: 'requiem',      name: 'レクイエム',     desc: 'HP・MPを全回復する' },
      { sp: 25, id: 'goddess',      name: '女神の奇跡',     desc: 'HP・MP全回復＋4ターン防御2倍' },
      { sp: 30, id: 'eternal',      name: '永劫の祈り',     desc: 'HP全回復＋5ターン35%再生＋3回バリア' }
    ]
  },
  {
    id: 'hero',
    name: '英雄枠',
    icon: '👑',
    maxSp: 30,
    color: '#e8dc9b',
    desc: '剣・魔法・生命すべて20以上で解放。唯一無二の英雄スキル。',
    unlockWhen: (p) => (p.skillPts && p.skillPts.sword >= 20 && p.skillPts.magic >= 20 && p.skillPts.life >= 20),
    stage2When: (p) => (p.skillPts && p.skillPts.sword >= 30 && p.skillPts.magic >= 30 && p.skillPts.life >= 30),
    stage2Desc: '剣・魔法・生命すべて30で第2段階（SP11〜20）解放',
    stage3When: (p) => !!(p && p.ending),
    stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
    milestones: [
      { sp: 5,  id: 'heroic',     name: '英雄の奇跡', desc: '全ステータス2倍で3回攻撃（各3倍）' },
      { sp: 10, id: null,         name: '全能力+25%', desc: 'パッシブ：攻撃・最大HP・最大MPが25%上昇', passive: 'hero10' },
      { sp: 15, id: 'heroAwaken', name: '英雄の覚醒', desc: '5ターン全ステータス2.5倍' },
      { sp: 20, id: 'starSword',  name: '星剣の極意', desc: '5回攻撃（各3倍）' },
      { sp: 22, id: 'heroAdvent', name: '勇者の光臨', desc: '6ターン全ステータス3.5倍' },
      { sp: 26, id: 'skyStar',    name: '蒼穹星剣',   desc: '6回攻撃（各4倍）' },
      { sp: 30, id: 'genesisRay', name: '創世の光',   desc: '24倍の創世の一閃' }
    ]
  }
];

// 全キャラ共通パッシブ「極意」（本編クリア後解放・各最大ランク10）
const MASTERY_MAX = 10;
const masteryCost = rank => (rank >= 10 ? 2 : 1); // ランク1〜9=1SP、10=2SP（計11SP/項目 × 10項目 = 110SP）
const MASTERY_LIST = [
  { id: 'm_atk',   name: '攻撃の極意', desc: '攻撃力 +1.5% / ランク',     key: 'atkPct',   per: 0.015 },
  { id: 'm_def',   name: '防御の極意', desc: '防御力 +1.5% / ランク',     key: 'defPct',   per: 0.015 },
  { id: 'm_hp',    name: '生命の極意', desc: '最大HP +2.0% / ランク',     key: 'hpPct',    per: 0.020 },
  { id: 'm_mp',    name: '魔力の極意', desc: '最大MP +2.0% / ランク',     key: 'mpPct',    per: 0.020 },
  { id: 'm_crit',  name: '会心の極意', desc: '会心率 +0.8% / ランク',     key: 'critAdd',  per: 0.008 },
  { id: 'm_dmg',   name: '破壊の極意', desc: '与ダメージ +1.5% / ランク', key: 'dmgPct',   per: 0.015 },
  { id: 'm_taken', name: '守護の極意', desc: '被ダメージ -1.0% / ランク', key: 'takenPct', per: -0.010 },
  { id: 'm_heal',  name: '慈愛の極意', desc: '回復効果 +2.0% / ランク',   key: 'healPct',  per: 0.020 },
  { id: 'm_exp',   name: '叡智の極意', desc: '獲得EXP +2.0% / ランク',    key: 'expPct',   per: 0.020 },
  { id: 'm_gold',  name: '黄金の極意', desc: '獲得Gold +2.0% / ランク',   key: 'goldPct',  per: 0.020 }
];

