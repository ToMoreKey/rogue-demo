# P1（A〜C拡張）開発メモ・決定数値一覧

P1 で決定・調整した数値と計算式の記録。P2（D〜O 追加）以降はここを基準に延長する。

## 1. 難易度（`DIFFS`）
| ID | 名前 | tag | 階層 | `stars` | `rar` | `clearGold` | `clearSp` | `expMult` | 解放条件 (`reqDiff`) |
|---|---|---|---|---|---|---|---|---|---|
| `novice` | 初級 | 入口 | 5 | `[[1,70],[2,30]]` | `[70,24,5.5,0.5]` | 60 | 2 | 2.8 | なし |
| `mid` | 中級 | 道中 | 10 | `[[2,45],[3,40],[4,15]]` | `[55,33,10,2]` | 260 | 4 | 4.8 | なし |
| `high` | 上級 | 最深部 | 20 | `[[3,50],[4,35],[5,15]]` | `[40,38,17,5]` | 1100 | 8 | 5.8 | なし |
| `super` | 超級 | 深層 | 30 | `[[4,55],[5,35],[6,10]]` | `[28,39,23,10]` | 3200 | 12 | 5.2 | `high` |
| `extreme` | 極級 | 極致 | 40 | `[[5,65],[6,35]]` | `[18,37,29,16]` | 8000 | 16 | 6.2 | `super` |

- 超級ボス: 接頭辞「古の」、CSS `filter: hue-rotate(38deg) saturate(1.35) contrast(1.08)`
- 極級ボス: 接頭辞「鬼気を帯びた」、CSS `filter: hue-rotate(-45deg) saturate(1.7) contrast(1.15) brightness(0.95)`

## 2. ダンジョン（`DUNGEONS`）
| ID | 名前 | `rec`（初→極） | `pow`（初→極） | `maxStar` | `unlock` |
|---|---|---|---|---|---|
| A | 苔むす地下墓地 | `[1, 9, 18, 30, 42]` | `[0.54, 1.35, 3.05, 5.8, 9.8]` | 4 | `null` |
| B | 灼熱の火山窟 | `[6, 14, 25, 37, 48]` | `[0.8, 1.7, 3.3, 5.9, 9.8]` | 4 | `null` |
| C | 凍てつく氷晶窟 | `[10, 20, 33, 45, 56]` | `[1.0, 2.1, 3.8, 7.2, 11.4]` | 5 | `null` |

## 3. EXP カーブ（`expNeed`）
```js
const expNeed = lv => Math.round(14 * Math.pow(lv, 1.45) * (lv >= 30 ? 1 + (lv - 29) * 0.04 : 1));
```
- 1周ごとに次のセルの推奨Lv付近へ自然に上がる設計（線形モードで全15セルのレベル差が `-3〜+1`、敗北 `0`、終了時 `Lv58`）。
- Lv30以降は `1 + (lv - 29) * 0.04` で段階的に重くしている。

## 4. 戦力値（`gearPower`）
```js
const itemPower = it => Math.max(1, Math.round((it.slot === 'weapon' ? WEAPON_BASE : ARMOR_BASE)[it.star] * RARITY[it.rarity].mult * it.roll));
const weaponAtk = it => it ? Math.round(itemPower(it) * ((it.prop && PROPS[it.prop].atkMult) || 1)) : 0;
const gearPower = it => !it ? 0 : (it.slot === 'weapon' ? weaponAtk(it) : itemPower(it));
```
- `equipBest()`（`gearScore`）も `gearPower` をそのまま使用し、手持ち最大（おすすめマーク）と完全一致する。

## 5. ゴールド消費（経済バランス）
- **鍛冶強化（`smithCost`）**: `Math.floor(Math.pow(it.star, 3) * 18 * RARITY[it.rarity].mult)`
  - ★2→3: `144G`（現行120Gと同水準）、★5→6（レジェンド）: `7,875G`
- **再鍛造（`reforgeCost`）**: `Math.max(50, Math.floor(smithCost(it) * 0.8))`（武器の特性を振り直し。72%で付与、28%で特性なし）
- **ショップ（`SHOP_ITEMS`）**: 生命の薬 180G / 魔力の薬 220G / 初級石 800G / 中級石 2,400G / 上級石 7,500G
- **バッグ拡張（`BAG_EXPAND_COSTS`）**: 60→70: 2,000G / 70→80: 4,000G / 80→90: 8,000G / 90→100: 14,000G / 100→110: 22,000G / 110→120: 32,000G（最大120枠、合計82,000G）
- **スキルリセット（`skillResetCost`）**: `Math.max(50, p.lv * 50)`

## 6. ★5防具 キャラ別名称（`ARMOR_STAR5_NAMES`）
- `ruby`（星空の大魔導士）: **星詠みのローブ**
- `stella`（竜騎士）: **竜騎士の鎧**
- `silia`（聖女）: **聖女の法衣**
- `chloe`（影の暗殺者）: **影縫いの忍装束**
