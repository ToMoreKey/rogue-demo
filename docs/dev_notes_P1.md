# P1（A〜C拡張）・P1b（ペース再調整）開発メモ・決定数値一覧

P1 および P1b で決定・調整した数値と計算式の記録。P2（D〜O 追加）以降はここを基準に延長する。

## 0. 手応えの基準値（P1 前: コミット `1da3ff6`・9セル版）
`tools/bot.py` の時間モデル（`floorsTraversed * 2.5秒 + runs * 50秒`）による実測値:

| Seed | ラン数 (`runs`) | 通過階数 (`floorsTraversed`) | 1階あたりティック (`ticksPerFloor`) | 見積時間 (`model_hours`) | 初回クリア率 | 終了Lv | 余りG |
|---|---|---|---|---|---|---|---|
| 1 | 94 | 1,155 | 3.54 | 2.11h | 88.9% | 31 | 144,778G |
| 2 | 90 | 1,155 | 3.52 | 2.05h | 100.0% | 31 | 149,883G |
| 3 | 92 | 1,160 | 3.43 | 2.08h | 88.9% | 31 | 144,340G |
| **平均** | **92.0** | **1,156.7** | **3.50** | **2.08h** | **92.6%** | **31** | **146,334G** |

- 手応え（`ticksPerFloor`）の許容範囲（基準 `3.50` の ±25%）: **2.62 〜 4.37**

## 1. 難易度（`DIFFS`）
| ID | 名前 | tag | 階層 | `stars` | `rar` | `clearGold` | `clearSp` | `expMult` | 解放条件 (`reqDiff`) |
|---|---|---|---|---|---|---|---|---|---|
| `novice` | 初級 | 入口 | 5 | `[[1,70],[2,30]]` | `[70,24,5.5,0.5]` | 60 | 2 | 1.70 | なし |
| `mid` | 中級 | 道中 | 10 | `[[2,45],[3,40],[4,15]]` | `[55,33,10,2]` | 260 | 4 | 1.95 | なし |
| `high` | 上級 | 最深部 | 20 | `[[3,50],[4,35],[5,15]]` | `[40,38,17,5]` | 650 | 8 | 1.40 | なし |
| `super` | 超級 | 深層 | 50 | `[[4,55],[5,35],[6,10]]` | `[28,39,23,10]` | 1000 | 12 | 0.40 | `high` |
| `extreme` | 極級 | 極致 | 80 | `[[5,65],[6,35]]` | `[18,37,29,16]` | 1800 | 16 | 1.15 | `super` |

- 超級ボス: 接頭辞「古の」、CSS `filter: hue-rotate(38deg) saturate(1.35) contrast(1.08)`
- 極級ボス: 接頭辞「鬼気を帯びた」、CSS `filter: hue-rotate(-45deg) saturate(1.7) contrast(1.15) brightness(0.95)`
- 10階ごとの節目の強敵（最終階以外）: 接頭辞「強敵 」、`hue-rotate(155deg) saturate(1.45) contrast(1.12)`、HP×1.55 / ATK×1.15 / DEF×1.1 / EXP・Gold×1.5、装備1個確定ドロップ。

## 2. ダンジョン（`DUNGEONS`）
| ID | 名前 | `rec`（初→極） | `pow`（初→極） | `maxStar` | `unlock` |
|---|---|---|---|---|---|
| A | 苔むす地下墓地 | `[1, 9, 18, 30, 42]` | `[0.54, 1.35, 2.9, 5.2, 8.8]` | 4 | `null` |
| B | 灼熱の火山窟 | `[6, 14, 25, 37, 48]` | `[0.75, 1.65, 3.1, 5.3, 8.5]` | 4 | `null` |
| C | 凍てつく氷晶窟 | `[10, 20, 33, 45, 56]` | `[0.85, 1.95, 3.5, 6.4, 9.8]` | 5 | `null` |

## 3. EXP カーブ（`expNeed`）
```js
const expNeed = lv => Math.round(17.5 * Math.pow(lv, 1.55) * (lv >= 30 ? 1 + (lv - 29) * 0.015 : 1));
```
- 1セルあたり平均5〜6ランの周回で推奨Lvへ届き、極級制覇時に Lv55〜56 付近へ到達する設計。

## 4. 戦力値（`gearPower`）
```js
const itemPower = it => Math.max(1, Math.round((it.slot === 'weapon' ? WEAPON_BASE : ARMOR_BASE)[it.star] * RARITY[it.rarity].mult * it.roll));
const weaponAtk = it => it ? Math.round(itemPower(it) * ((it.prop && PROPS[it.prop].atkMult) || 1)) : 0;
const gearPower = it => !it ? 0 : (it.slot === 'weapon' ? weaponAtk(it) : itemPower(it));
```
- `equipBest()`（`gearScore`）も `gearPower` をそのまま使用し、手持ち最大（おすすめマーク）と完全一致する。

## 5. ゴールド消費・収入バランス
- **`TUNE.goldScale`**: `0.12`
- **`sellValue`**: `Math.max(1, Math.round(RARITY[it.rarity].sell * 0.36 * (1 + (it.star - 1) * 0.5) * (0.6 + 0.4 * it.roll)))`
- **鍛冶強化（`smithCost`）**: `Math.floor(Math.pow(it.star, 3) * 18 * RARITY[it.rarity].mult)`
- **再鍛造（`reforgeCost`）**: `Math.max(50, Math.floor(smithCost(it) * 0.8))`（武器の特性を振り直し。72%で付与、28%で特性なし）
- **ショップ（`SHOP_ITEMS`）**: 生命の薬 180G / 魔力の薬 220G / 初級石 800G / 中級石 2,400G / 上級石 7,500G
- **バッグ拡張（`BAG_EXPAND_COSTS`）**: 60→70: 2,000G / 70→80: 4,000G / 80→90: 8,000G / 90→100: 14,000G / 100→110: 22,000G / 110→120: 32,000G（最大120枠、合計82,000G）
- **スキルリセット（`skillResetCost`）**: `Math.max(50, p.lv * 50)`

## 6. ★5防具 キャラ別名称（`ARMOR_STAR5_NAMES`）
- `ruby`（星空の大魔導士）: **星詠みのローブ**
- `stella`（竜騎士）: **竜騎士の鎧**
- `silia`（聖女）: **聖女の法衣**
- `chloe`（影の暗殺者）: **影縫いの忍装束**
