# デバッグ（2回目）調査メモ

## 1. 調査項目と結果（0-1〜0-4、1-1〜1-9）

| 項目 | 対象 | 結果 | 備考 |
|---|---|---|---|
| 0-1 パッシブ5種 | `sword15`/`warrior10`/`hero10`・`mage10`・`cleric10` の計算/UI一致・境界MP発動・SPリセット復元・欠損耐性 | **不具合1件（防御ガード不足）** | 未知スキルIDが `equippedSkills` に残った場合、`renderBattle` / `renderSkillSlots` / `skillMpCost` が `TypeError` で落ちる点を修正 |
| 0-2 組み合わせ | パッシブ×極意最大×回廊祝福全種×深淵10呪い | 問題なし | `NaN` / `Infinity` / 負値 0件、MP消費下限 `>= 1` |
| 0-3 ヘルプ画面 | ★9・A〜O・5段階・進化枠・ドロップ・`hero10`説明・図鑑/実績件数（94/22/36） | 問題なし | `test_p7a1.py`・`test_p7a2.py`・`test_debug2.py` で一致確認 |
| 0-4 序盤疎通 (`TUNE`後) | 新規Lv1・A初級（8ラン） | 問題なし（バランス気づきあり） | 初期3SPで `heal` 習得＋`equipBest()` で8ラン以内にクリア到達を確認（装備更新なし・乱数次第では5連敗し得る） |
| 1-1 進行不能 | A〜O全難度解放・クリア→回廊・深淵解放 | 問題なし | `test_debug1.py` で継続確認 |
| 1-2 例外 | 全画面・モーダル巡回 | 問題なし | `pageerror` / `console.error` 0件 |
| 1-3 数値の異常 | 戦闘・ステータス・極限組み合わせ | 問題なし | `NaN` / `undefined` / `Infinity` / 負値 0件 |
| 1-4 セーブ | 保存→再読込、v1〜v7→v8移行、壊れたJSON | 問題なし | `test_save_migration.py`・`test_p7a2.py` で確認 |
| 1-5 装備・強化・特性 | ★1〜9、ロック保護、非★9再鍛造ブロック | 問題なし | `test_debug1.py` で継続確認 |
| 1-6 回廊・深淵 | 祝福選択、コイン、称号、深淵難度・呪い | 問題なし | `test_p5a.py`・`test_p5b1.py`・`test_debug1.py` で確認 |
| 1-7 図鑑・実績・お知らせ | 記録・報酬・クリア後お知らせ | 問題なし | `test_p6a.py`・`test_p6b.py`・`test_p6c.py` で確認 |
| 1-8 画面（420px / 360px） | 街・ダンジョン・ステータス・ヘルプ・図鑑・実績・交換所・ランキング | 問題なし | 横スクロール 0px |
| 1-9 オフライン | Service Worker 登録後のオフライン動作 | 問題なし | `test_p6c.py` で確認 |

---

## 2. 修正した不具合

1. **`equippedSkills` に存在しないスキルIDがある場合に `skillMpCost` / `renderBattle` / `renderSkillSlots` が `TypeError` で落ちる**
   - **原因**: `src/js/60_render.js` の `renderBattle`（290行目）・`renderSkillSlots`（446行目）が `if (!id)` のみ判定して `!SK[id]` を弾いておらず、`src/js/20_state.js` の `skillMpCost(p, s)` も `s` が `undefined` の場合に `s.mp` を参照していた。
   - **修正**: `skillMpCost` に `(!s || !s.mp) ? 0` ガードを追加し、`renderBattle`・`renderSkillSlots` に `if (!id || !SK[id])` ガードを追加。`sw.js` の `CACHE` を `rogue-v27` に更新し、`tools/test_debug2.py` に再発防止テストを追加。

---

## 3. 修正しなかった項目・要確認・バランス面の気づき
- **修正しなかった不具合・要確認**: なし（仕様・数値・セーブ形式に関わる変更は実施せず）。
- **バランス面の気づき（P7用・修正なし）**:
  - `TUNE`（`hpScale: 1.35`, `atkScale: 1.02`, `bossHp: 2.5`, `bossAtk: 1.4`）変更後、新規 Lv1 プレイヤーが初期 3SP を振らずに A 初級へ挑むと 5ラン連続敗北（Lv3 止まり）になる。初期 3SP で `life`（ヒール）を習得・装備すれば 5ラン中 3回クリア（Lv5）でき進行不能ではないが、序盤のスキル未習得プレイヤーにはやや厳しい可能性がある。
