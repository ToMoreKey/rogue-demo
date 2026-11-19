// 図鑑データ（敵図鑑94種・装備図鑑22種）
const DEX_STARS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const DEX_MYTHICS = [8, 9];
const DEX_ITEM_HINTS = {
  1: '初期装備または序盤ダンジョンのドロップで入手',
  2: 'ダンジョンA〜Cのドロップで入手',
  3: 'ダンジョンA以降のドロップで入手',
  4: 'ダンジョンB以降のドロップで入手',
  5: 'ダンジョンC以降のドロップで入手',
  6: '★5を鍛冶屋で強化（またはD〜Fのボスドロップ）',
  7: '★6を時の欠片（D〜Fのボス）で強化（またはG・Hのボスドロップ）',
  8: '★7を機神の核（H・Iのボス）で強化（またはI〜Nのボスドロップ）',
  9: '★8を創世の欠片（Oのボス）で強化（またはOのボスドロップ）',
  m8: '天蓋の塔の回廊コイン交換所で交換（600枚）',
  m9: '深淵ダンジョンの主を撃破すると低確率でドロップ'
};

const dexItemKey = it => it ? `${it.slot}_${it.rarity === 4 ? 'm' : ''}${it.star}` : '';

function dexEnemyGroups() {
  const groups = DUNGEONS.map(d => {
    const list = [
      ...d.mobs.map(m => ({ id: m.id, name: m.name, shape: m.shape, dId: d.id, boss: false })),
      { id: d.boss.id, name: d.boss.name, shape: d.boss.shape, dId: d.id, boss: true }
    ];
    if (d.id === 'O' && d.boss && d.boss.rageId) {
      list.push({ id: d.boss.rageId, name: d.boss.rageName || '終焉神ニヒル・真', shape: d.boss.shape, dId: 'O', boss: true, bossFilter: 'hue-rotate(140deg) saturate(1.6)' });
    }
    return { id: d.id, title: `${d.id} ${d.name}`, rewardCoins: 5, list };
  });
  groups.push({
    id: 'ABYSS',
    title: '深淵の主',
    rewardCoins: 15,
    list: ['gula', 'mirror', 'deep'].map(k => {
      const b = ABYSS_BOSSES[k];
      return { id: b.id, name: b.name, shape: b.shape, dId: 'Z', boss: true };
    })
  });
  return groups;
}
