// ============ R1a: キャラごとのスキルツリー＆説明データ ============
// 各キャラは 主ツリー(30SP)・第2ツリー(30SP, 主10で解放)・奥義ツリー(30SP, 主20かつ第2が20で解放) の3つを持つ。
// R1b: 各キャラ専用の新規スキル・奥義・クロエ専用ツリーに本設計済み（数値は初期案。R1cでBOT調整）。

const CHAR_IDS = ['stella', 'ruby', 'silia', 'chloe'];

const CHAR_CLASS_META = {
  stella: {
    id: 'stella',
    name: 'ステラ',
    job: '剣士',
    role: '物理アタッカー',
    blurb: '攻撃力が自慢の物理アタッカー。自己強化で一撃を重くしていく。初めてでも扱いやすい。回復は少ないので、HPの管理に注意。',
    strengths: '自己強化バフ・高倍率の単発/多段剣技、攻撃力パッシブ',
    weakness: '回復が最小限（応急手当・薬・撤退の判断が大事）',
    tutHint: '強撃を習得。敵を早く倒せるよ'
  },
  ruby: {
    id: 'ruby',
    name: 'ルビィ',
    job: '魔法使い',
    role: '魔法アタッカー',
    blurb: '高威力の魔法で敵を一掃するアタッカー。MPを使い切る戦い方が得意。HPは低めなので、バリアや撤退の判断が大事。',
    strengths: '高倍率魔法・多段/凍結魔法、MP最大値＆MP消費軽減パッシブ',
    weakness: 'HPが低め（マジックシールドや撤退の判断が大事）',
    tutHint: 'ファイアボールを習得。魔法で大ダメージ'
  },
  silia: {
    id: 'silia',
    name: 'シリア',
    job: '聖職者',
    role: '回復・耐久',
    blurb: '回復とバリアで長く戦える耐久型。聖なる光で攻撃もできる。じっくり進めたい人向け。',
    strengths: '高い回復量、リジェネ、ダメージ無効バリア、回復効果強化パッシブ',
    weakness: '序盤〜中盤の火力は控えめ',
    tutHint: 'ヒールを習得。戦闘中にHPを回復できるよ'
  },
  chloe: {
    id: 'chloe',
    name: 'クロエ',
    job: '盗賊',
    role: '手数・技巧型',
    blurb: '手数とクリティカルで攻める技巧型。低コストの連続攻撃が得意。1発は軽いので、数で押そう。',
    strengths: '低CT・低MPの素早い連続攻撃、手数で押す戦闘スタイル',
    weakness: '1発あたりの倍率が低め',
    tutHint: 'ダブルスタブで2回攻撃'
  }
};

function getCharSkillPts(p, charId) {
  const cid = charId || (p && p.skin) || 'ruby';
  if (p && p.chars && p.chars[cid] && p.chars[cid].skillPts) return p.chars[cid].skillPts;
  return (p && p.skillPts) || {};
}

const CHAR_TREES = {
  // -------- ステラ（剣士）: 剣枠・戦士枠・英雄枠 --------
  stella: [
    {
      id: 'sword',
      name: '剣枠',
      icon: '⚔️',
      maxSp: 30,
      color: '#e88b5a',
      desc: '剣技を極める。攻撃特化スキルと応急手当を習得。',
      unlockWhen: () => true,
      milestones: [
        { sp: 3,  id: 'strike',     name: '強撃',       desc: '2倍のダメージを与える' },
        { sp: 6,  id: 'guard',      name: '鉄壁',       desc: '3回の被攻撃のあいだ防御力2倍' },
        { sp: 10, id: 'multi',      name: '連続斬り',   desc: '0.8倍の斬撃を3回放つ' },
        { sp: 12, id: 'firstAid',   name: '応急手当',   desc: '最大HPの20%を回復する' },
        { sp: 15, id: null,         name: '攻撃力+15%', desc: 'パッシブ：攻撃力が15%上昇する', passive: 'sword15' },
        { sp: 20, id: 'ult',        name: '必殺剣',     desc: '4倍の渾身の一撃' },
        { sp: 23, id: 'flameSlash', name: '烈火斬',     desc: '炎の斬撃を2回放つ（各1.6倍）' },
        { sp: 26, id: 'warGod',     name: '鬼神の構え', desc: '4ターン攻撃力1.8倍（防御は下がらない）' },
        { sp: 30, id: 'skySlash',   name: '天翔斬',     desc: '7倍の秘剣の一撃' }
      ]
    },
    {
      id: 'warrior',
      name: '戦士枠',
      icon: '🗡️',
      maxSp: 30,
      color: '#e85a5a',
      desc: '剣枠10以上で解放。超攻撃特化の戦士スキル。',
      unlockWhen: (p) => (getCharSkillPts(p, 'stella').sword || 0) >= 10,
      stage2When: (p) => (getCharSkillPts(p, 'stella').sword || 0) >= 30,
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
      id: 'hero',
      name: '英雄枠',
      icon: '👑',
      maxSp: 30,
      color: '#e8dc9b',
      desc: '剣枠20かつ戦士枠20以上で解放。唯一無二の英雄スキル。',
      unlockWhen: (p) => { const s = getCharSkillPts(p, 'stella'); return (s.sword || 0) >= 20 && (s.warrior || 0) >= 20; },
      stage2When: (p) => { const s = getCharSkillPts(p, 'stella'); return (s.sword || 0) >= 30 && (s.warrior || 0) >= 20; },
      stage2Desc: '剣枠30かつ戦士枠20で第2段階（SP11〜20）解放',
      stage3When: (p) => !!(p && p.ending),
      stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
      milestones: [
        { sp: 5,  id: 'heroic',     name: '英雄の奇跡', desc: '3回攻撃（各3倍）' },
        { sp: 10, id: null,         name: '全能力+25%', desc: 'パッシブ：攻撃・最大HP・最大MPが25%上昇', passive: 'hero10' },
        { sp: 15, id: 'heroAwaken', name: '英雄の覚醒', desc: '5ターン全ステータス2.5倍' },
        { sp: 20, id: 'starSword',  name: '星剣の極意', desc: '5回攻撃（各3倍）' },
        { sp: 22, id: 'heroAdvent', name: '勇者の光臨', desc: '6ターン全ステータス3.5倍' },
        { sp: 26, id: 'skyStar',    name: '蒼穹星剣',   desc: '6回攻撃（各4倍）' },
        { sp: 30, id: 'swordGod',   name: '剣神の一閃', desc: '24倍の剣神の一閃' }
      ]
    }
  ],

  // -------- ルビィ（魔法使い）: 魔法枠・魔術師枠・大魔導枠 --------
  ruby: [
    {
      id: 'magic',
      name: '魔法枠',
      icon: '✨',
      maxSp: 30,
      color: '#7a9ff5',
      desc: '魔法を極める。高威力の魔法スキルと応急手当を習得。',
      unlockWhen: () => true,
      milestones: [
        { sp: 3,  id: 'fireball',       name: 'ファイアボール',       desc: '炎の魔力で1.8倍のダメージ' },
        { sp: 6,  id: 'magicshield',    name: 'マジックシールド',     desc: '5ターン魔法防御力1.5倍' },
        { sp: 10, id: 'thunder',        name: 'サンダー',             desc: '雷撃を2回放つ（各1.2倍）' },
        { sp: 12, id: 'firstAid',       name: '応急手当',             desc: '最大HPの20%を回復する' },
        { sp: 15, id: null,             name: 'MP最大値+20%',         desc: 'パッシブ：最大MPが20%上昇する', passive: 'magic15' },
        { sp: 20, id: 'meteor',         name: 'メテオ',               desc: '5倍の超高威力魔法攻撃' },
        { sp: 23, id: 'blaze',          name: 'ブレイズ',             desc: '業火で2.6倍のダメージ' },
        { sp: 26, id: 'lightningStorm', name: 'ライトニングストーム', desc: '雷撃を4回放つ（各1.0倍）' },
        { sp: 30, id: 'ultima',         name: 'アルテマ',             desc: '9倍の究極魔法攻撃' }
      ]
    },
    {
      id: 'mage',
      name: '魔術師枠',
      icon: '🔮',
      maxSp: 30,
      color: '#a07af5',
      desc: '魔法枠10以上で解放。超強力な魔術師スキル。',
      unlockWhen: (p) => (getCharSkillPts(p, 'ruby').magic || 0) >= 10,
      stage2When: (p) => (getCharSkillPts(p, 'ruby').magic || 0) >= 30,
      stage2Desc: '魔法枠30で第2段階（SP11〜20）解放',
      stage3When: (p) => !!(p && p.ending),
      stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
      milestones: [
        { sp: 5,  id: 'blizzard',   name: 'ブリザード',       desc: '4.5倍の氷結魔法で敵を凍らせる' },
        { sp: 10, id: null,         name: 'MP消費-20%',       desc: 'パッシブ：全スキルのMP消費が20%減少', passive: 'mage10' },
        { sp: 15, id: 'iceAge',     name: 'アイスエイジ',     desc: '6倍の氷結魔法で敵を凍らせる' },
        { sp: 20, id: 'cosmicNova', name: 'コズミックノヴァ', desc: '14倍の星辰爆発魔法' },
        { sp: 25, id: 'zeroAbs',    name: '絶対零度',         desc: '9倍の氷結魔法で敵を2ターン凍らせる' },
        { sp: 30, id: 'meteorNova', name: 'メテオノヴァ',     desc: '22倍の究極星辰魔法' }
      ]
    },
    {
      id: 'hero',
      name: '英雄枠',
      icon: '👑',
      maxSp: 30,
      color: '#e8dc9b',
      desc: '魔法枠20かつ魔術師枠20以上で解放。大魔導の奥義スキル。',
      unlockWhen: (p) => { const s = getCharSkillPts(p, 'ruby'); return (s.magic || 0) >= 20 && (s.mage || 0) >= 20; },
      stage2When: (p) => { const s = getCharSkillPts(p, 'ruby'); return (s.magic || 0) >= 30 && (s.mage || 0) >= 20; },
      stage2Desc: '魔法枠30かつ魔術師枠20で第2段階（SP11〜20）解放',
      stage3When: (p) => !!(p && p.ending),
      stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
      milestones: [
        { sp: 5,  id: 'arcaneMiracle', name: '大魔導の奇跡', desc: '3回攻撃（各3倍）の大魔法' },
        { sp: 10, id: null,         name: '全能力+25%', desc: 'パッシブ：攻撃・最大HP・最大MPが25%上昇', passive: 'hero10' },
        { sp: 15, id: 'heroAwaken', name: '英雄の覚醒', desc: '5ターン全ステータス2.5倍' },
        { sp: 20, id: 'starDust',   name: '星屑の極意', desc: '5回攻撃（各3倍）の星屑魔法' },
        { sp: 22, id: 'heroAdvent', name: '勇者の光臨', desc: '6ターン全ステータス3.5倍' },
        { sp: 26, id: 'skyMeteorite', name: '蒼穹の流星群', desc: '6回攻撃（各4倍）の流星魔法' },
        { sp: 30, id: 'endMagic',   name: '終焉の大魔法', desc: '24倍の終焉の大魔法' }
      ]
    }
  ],

  // -------- シリア（聖職者）: 生命枠・詠唱枠・聖女枠 --------
  silia: [
    {
      id: 'life',
      name: '生命枠',
      icon: '💚',
      maxSp: 30,
      color: '#58c98a',
      desc: '生命力を極める。本格的な回復・バリアスキルを習得。',
      unlockWhen: () => true,
      milestones: [
        { sp: 3,  id: 'heal',        name: 'ヒール',         desc: '最大HPの35%を回復する' },
        { sp: 5,  id: 'holyBolt',    name: '聖光弾',         desc: '聖なる光弾で1.8倍のダメージ' },
        { sp: 6,  id: 'regen',       name: 'リジェネ',       desc: '3ターン間毎ターン最大HPの15%回復' },
        { sp: 10, id: 'barrier',     name: 'バリア',         desc: 'ダメージを3回無効化するバリアを張る' },
        { sp: 13, id: 'judgment',    name: '聖裁',           desc: '聖なる裁きを2回放つ（各1.5倍）' },
        { sp: 15, id: null,          name: 'HP最大値+20%',   desc: 'パッシブ：最大HPが20%上昇する', passive: 'life15' },
        { sp: 20, id: 'fullheal',    name: 'フルヒール',     desc: '最大HPの70%を回復する' },
        { sp: 23, id: 'highRegen',   name: 'ハイリジェネ',   desc: '3ターン間毎ターン最大HPの25%回復' },
        { sp: 26, id: 'holyBarrier', name: 'ホーリーバリア', desc: 'ダメージを5回無効化するバリアを張る' },
        { sp: 28, id: 'holyNova',    name: '聖なる爆光',     desc: '5倍の聖なる爆光' },
        { sp: 30, id: 'saintPrayer', name: '聖女の祈り',     desc: '最大HPを全回復する' }
      ]
    },
    {
      id: 'cleric',
      name: '詠唱枠',
      icon: '🌿',
      maxSp: 30,
      color: '#5ac9a0',
      desc: '生命枠10以上で解放。究極の回復術士スキル。',
      unlockWhen: (p) => (getCharSkillPts(p, 'silia').life || 0) >= 10,
      stage2When: (p) => (getCharSkillPts(p, 'silia').life || 0) >= 30,
      stage2Desc: '生命枠30で第2段階（SP11〜20）解放',
      stage3When: (p) => !!(p && p.ending),
      stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
      milestones: [
        { sp: 5,  id: 'resurrection', name: 'リザレクション', desc: '全回復＋次の致死ダメージを1で耐える' },
        { sp: 10, id: null,           name: 'HP/MP回復+50%', desc: 'パッシブ：全回復系の効果が50%上昇', passive: 'cleric10' },
        { sp: 15, id: 'holyLight',    name: 'ホーリーライト', desc: '最大HP全回復＋3ターン防御1.5倍' },
        { sp: 20, id: 'requiem',      name: 'レクイエム',     desc: 'HP・MPを全回復する' },
        { sp: 22, id: 'divineWrath',  name: '神罰',           desc: '9倍の神罰の一撃' },
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
      desc: '生命枠20かつ詠唱枠20以上で解放。聖女の奥義スキル。',
      unlockWhen: (p) => { const s = getCharSkillPts(p, 'silia'); return (s.life || 0) >= 20 && (s.cleric || 0) >= 20; },
      stage2When: (p) => { const s = getCharSkillPts(p, 'silia'); return (s.life || 0) >= 30 && (s.cleric || 0) >= 20; },
      stage2Desc: '生命枠30かつ詠唱枠20で第2段階（SP11〜20）解放',
      stage3When: (p) => !!(p && p.ending),
      stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
      milestones: [
        { sp: 5,  id: 'angelMiracle', name: '天使の奇跡', desc: '3回攻撃（各3倍）の聖なる光' },
        { sp: 10, id: null,         name: '全能力+25%', desc: 'パッシブ：攻撃・最大HP・最大MPが25%上昇', passive: 'hero10' },
        { sp: 15, id: 'heroAwaken', name: '英雄の覚醒', desc: '5ターン全ステータス2.5倍' },
        { sp: 20, id: 'celestialLance', name: '聖槍の極意', desc: '5回攻撃（各3倍）の聖槍' },
        { sp: 22, id: 'heroAdvent', name: '勇者の光臨', desc: '6ターン全ステータス3.5倍' },
        { sp: 26, id: 'heavenStars', name: '蒼穹の聖星', desc: '6回攻撃（各4倍）の聖星' },
        { sp: 30, id: 'genesisRay', name: '創世の光',   desc: '24倍の創世の一閃' }
      ]
    }
  ],

  // -------- クロエ（盗賊）: 盗技枠・怪盗枠・大怪盗枠（全て新規） --------
  chloe: [
    {
      id: 'sword',
      name: '盗技枠',
      icon: '🗡️',
      maxSp: 30,
      color: '#57d5ee',
      desc: '盗賊の技を極める。手数と連撃のスキルと応急手当を習得。',
      unlockWhen: () => true,
      milestones: [
        { sp: 3,  id: 'doubleStab',   name: 'ダブルスタブ', desc: '1.1倍の素早い2回攻撃' },
        { sp: 6,  id: 'shadowStep',   name: '影走り',       desc: '3ターン防御力2倍' },
        { sp: 10, id: 'rush',         name: 'ラッシュ',     desc: '0.7倍の連撃を4回放つ' },
        { sp: 12, id: 'firstAid',     name: '応急手当',     desc: '最大HPの20%を回復する' },
        { sp: 15, id: null,           name: 'クリティカル率+20%', desc: 'パッシブ：クリティカル率が20%上昇する（急所狙い）', passive: 'crit20' },
        { sp: 20, id: 'bladeDance',   name: '連刃乱舞',     desc: '0.7倍の連撃を6回放つ' },
        { sp: 23, id: 'phantomSlash', name: '幻影斬',       desc: '幻影の斬撃を3回放つ（各1.2倍）' },
        { sp: 26, id: 'swiftStance',  name: '疾風の構え',   desc: '4ターン攻撃力1.8倍' },
        { sp: 30, id: 'shadowPierce', name: '影縫い',       desc: '7倍の影縫いの一撃' }
      ]
    },
    {
      id: 'warrior',
      name: '怪盗枠',
      icon: '🌙',
      maxSp: 30,
      color: '#b98af7',
      desc: '盗技枠10以上で解放。怪盗の奥の手スキル。',
      unlockWhen: (p) => (getCharSkillPts(p, 'chloe').sword || 0) >= 10,
      stage2When: (p) => (getCharSkillPts(p, 'chloe').sword || 0) >= 30,
      stage2Desc: '盗技枠30で第2段階（SP11〜20）解放',
      stage3When: (p) => !!(p && p.ending),
      stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
      milestones: [
        { sp: 5,  id: 'frenzyEdge',    name: '狂乱の刃',   desc: '4ターン攻撃力3倍・防御力半減' },
        { sp: 10, id: null,            name: '全スキルCT-1', desc: 'パッシブ：全スキルのCTが1短縮（最低1）（疾風）', passive: 'swift10' },
        { sp: 15, id: 'mirageStance',  name: '幻惑の構え', desc: '4ターン攻撃力4倍・被ダメ1.2倍' },
        { sp: 20, id: 'thousandCuts',  name: '千刃',       desc: '1.5倍の千の刃を8回放つ' },
        { sp: 25, id: 'nightParade',   name: '百鬼夜行',   desc: '1.5倍の百鬼夜行を12回放つ' },
        { sp: 30, id: 'phantomAdvent', name: '怪盗降臨',   desc: '5ターン攻撃力5倍・被ダメ1.1倍' }
      ]
    },
    {
      id: 'hero',
      name: '英雄枠',
      icon: '👑',
      maxSp: 30,
      color: '#e8dc9b',
      desc: '盗技枠20かつ怪盗枠20以上で解放。大怪盗の奥義スキル。',
      unlockWhen: (p) => { const s = getCharSkillPts(p, 'chloe'); return (s.sword || 0) >= 20 && (s.warrior || 0) >= 20; },
      stage2When: (p) => { const s = getCharSkillPts(p, 'chloe'); return (s.sword || 0) >= 30 && (s.warrior || 0) >= 20; },
      stage2Desc: '盗技枠30かつ怪盗枠20で第2段階（SP11〜20）解放',
      stage3When: (p) => !!(p && p.ending),
      stage3Desc: '本編クリアで第3段階（SP21〜30）解放',
      milestones: [
        { sp: 5,  id: 'grandHeist',   name: '大怪盗の妙技', desc: '1.5倍の妙技を6回放つ' },
        { sp: 10, id: null,           name: '全能力+25%',   desc: 'パッシブ：攻撃・最大HP・最大MPが25%上昇', passive: 'hero10' },
        { sp: 15, id: 'heroAwaken',   name: '英雄の覚醒',   desc: '5ターン全ステータス2.5倍' },
        { sp: 20, id: 'trumpCard',    name: '切り札',       desc: '1.5倍の切り札を10回放つ' },
        { sp: 22, id: 'heroAdvent',   name: '勇者の光臨',   desc: '6ターン全ステータス3.5倍' },
        { sp: 26, id: 'thousandMask', name: '千変万化',     desc: '8回攻撃（各3倍）' },
        { sp: 30, id: 'nightSky',     name: '夜天の大強盗', desc: '12回攻撃（各2倍）' }
      ]
    }
  ]
};

function getCharTrees(charId) {
  const cid = (charId && CHAR_TREES[charId]) ? charId : 'stella';
  return CHAR_TREES[cid];
}

// チュートリアル（step 41 / step 5）で習得・装備する対象（現キャラの主ツリーの最初の3SPスキル）をデータから引く
function getCharTutorialTarget(charId) {
  const cid = (charId && CHAR_TREES[charId]) ? charId : 'ruby';
  const mainTree = CHAR_TREES[cid][0];
  const ms = mainTree.milestones.find(m => m.id && m.sp <= 3) || mainTree.milestones.find(m => m.id);
  const sk = ms && SK[ms.id];
  const meta = CHAR_CLASS_META[cid] || CHAR_CLASS_META.stella;
  return {
    charId: cid,
    treeId: mainTree.id,
    treeName: mainTree.name,
    skillId: ms ? ms.id : 'strike',
    skillName: sk ? sk.name : (ms ? ms.name : '強撃'),
    spReq: ms ? ms.sp : 3,
    hint: meta.tutHint || ''
  };
}
