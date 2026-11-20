# P2 開発メモ（新ダンジョン D〜F・時の欠片・★7・スキル30SP拡張）

## 1. ダンジョン D〜F 設計・解放条件・推奨Lv・倍率

| ID | 名前 | 解放条件 | maxStar | bossMaxStar | rec (初/中/上/超/極) | pow (初/中/上/超/極) |
|---|---|---|---|---|---|---|
| D | 古代樹の森 | C 上級クリア | 5 | 6 | `24, 33, 44, 56, 68` | `1.35, 2.35, 3.8, 5.8, 7.8` |
| E | 砂塵の遺跡 | D 上級クリア | 5 | 6 | `30, 39, 50, 62, 72` | `1.6, 2.7, 4.2, 6.2, 8.3` |
| F | 水没神殿 | E 上級クリア | 5 | 6 | `36, 45, 55, 66, 76` | `1.85, 3.05, 4.6, 6.6, 8.7` |

- 敵構成: 各ダンジョン雑魚5体＋ボス1体（計18体、全36体でID重複なし）。`ENEMY_IMG` 未登録時は `SHAPES`＋`PAL.D/E/F` によるドット絵SVGフォールバック描画。

## 2. 経済・経験値・ドロップ・強化（★7）

- `DUNGEON_REWARD`: `{ A: 1, B: 1.35, C: 1.8, D: 0.45, E: 0.45, F: 0.45 }`（A〜Cの序盤・中盤ペースを維持しつつ、D〜Fでの余りゴールド過剰を抑制）
- `clearSp`: `[1, 1, 2, 2, 3]`（初回クリア時のみ付与）
- `expNeed(lv)`:
  ```js
  Math.round(17.5 * Math.pow(lv, 1.55) * (lv >= 30 ? 1 + (lv - 29) * 0.015 : 1) * (lv >= 56 ? 1 + (lv - 55) * 0.022 : 1))
  ```
- ドロップ上限と★6/★7:
  - D〜Fの通常ドロップ（雑魚・宝箱）は `maxStar: 5` まで。
  - D〜Fのボス・強敵ドロップは `bossMaxStar: 6` により 8% の確率で ★6 を直接ドロップ（A〜Cは ★5 まで）。
  - **時の欠片 (`stone_time`)**: D〜Fのボスから 80%、強敵から 40% でドロップ（ショップ非売品）。
  - **鍛冶★7**: `SMITH_MAX_STAR = 7`、`STONE_REQ[6] = 'stone_time'`。★6→★7強化に使用。

## 3. スキル枠拡張（20SP → 30SP）

- `sword` / `magic` / `life` の `maxSp` を 30 に拡張（既存 20SP 以下のセーブ互換を維持）。
- 追加スキル 9種（SP 23 / 26 / 30）:
  - 剣枠: `flameSlash` (23), `warGod` (26, 3ターン攻撃1.35倍), `skySlash` (30)
  - 魔法枠: `blaze` (23), `lightningStorm` (26), `ultima` (30)
  - 生命枠: `highRegen` (23, 5ターン毎ターン20%回復), `holyBarrier` (26, 3ターン被ダメ半減), `saintPrayer` (30)

## 4. 検証結果（P2・全30セル）

`python3 tools/build.py` 後の `python3 tools/bot.py --mode loop`（3シード）:

| Seed | done | runs | defeats | lv | sp | gold | ticksPerFloor | model_hours | firstClearRate | defeatRate |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | true | 177 | 0 | 75 | 4 | 73,413G | 3.91 | 7.25h | 100% | 0% |
| 2 | true | 176 | 1 | 75 | 4 | 61,174G | 4.04 | 7.23h | 100% | 0.6% |
| 3 | true | 178 | 2 | 75 | 4 | 75,687G | 3.97 | 7.25h | 93.3% | 1.1% |

- `tools/test_p1.py` / `tools/test_p2.py` / `tools/test_save_migration.py`: 全項目 PASS（`RESULT: OK`）。
