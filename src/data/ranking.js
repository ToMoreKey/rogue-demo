// ランキング設定（Googleフォームの送信先・質問ID。docs/ranking_setup.md の D を参照。空にすると送信のみ無効）
const RANKING_CFG = {
  formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSf07yvFY41jFlZud8H2KHnM9aZCk2dUNPDsOsF9dtmsQNeFYA/formResponse',
  entryName: 'entry.1313231289',
  entryFloor: 'entry.201299640',
  rankingUrl: 'data/ranking.json',
  top: 20,
  nameMax: 12,
  maxFloor: 500,
  cacheKey: 'rogue_ranking_cache_v1'
};
