# 実装メモ: R1a（キャラごとのスキル・パッシブ分け：仕組み）

## 1. データモデル（セーブ形式 v9）と現キャラ同期
- **`SAVE_VERSION = 9` (`src/js/30_save.js`, `src/js/20_state.js`)**:
  - `p.chars[id] = { skillPts: {...}, equippedSkills: [null, null, null] }`（`id` は `'stella' | 'ruby' | 'silia' | 'chloe'`）を追加。
  - 現在選択中のキャラクターは既存の `p.skin`（`'stella' | 'ruby' | 'silia' | 'chloe'`）で表し、SPプール（`p.sp`）・レベル・装備・ゴールド・図鑑・実績・塔・深淵・極意は全キャラ共通。
- **既存計算ロジックとの互換性 (`syncActiveCharState(p)`)**:
  - `syncActiveCharState(p)` を呼び出すと、現キャラ `p.chars[p.skin]` の `skillPts` と `equippedSkills` を `p.skillPts`・`p.equippedSkills` に参照バインドし、`getCharTrees(p.skin)` の到達マイルストーンから `p.skills`（習得済みスキル辞書）と `p.passiveSkills`（有効パッシブ辞書）を都度再計算する。
  - これにより、既存の `passiveBonus(p)`、`skillMpCost(p, s)`、`playerAtk(p)`、`maxHp(p)`、`maxMp(p)`、戦闘ロジック（`40_game.js`）、塔・深淵の計算コードを一切変更せずにキャラ別スキル・パッシブが機能する。

## 2. マイグレーション（v8 → v9）
- `migrations[8]` にて、旧 `p.skillPts` の全ツリー（基本3枠＋進化4枠）に振られていたSPの合計を `p.sp` に全額加算して返却（1SPも失われない）。
- `p.chars` を4キャラ分の初期状態で生成し、`p.skills = {}`、`p.passiveSkills = {}`、`p.equippedSkills = [null, null, null]` にリセット。
- 移行前の生データは既存の仕組みにより `SAVE_KEY + '_bak_v8'`（本番は `rogue_test_save_v1_bak_v8`、テスト版は `rogue_dev_save_v1_bak_v8`）に1度だけ自動退避される。
- 移行時点で進行があったセーブ（返却SP > 0 または Lv > 1 または出撃数 > 0）には `p.v9ResetNoticePending = true` を立て、起動時に1回だけ「システムが変わりました。SPを全て返却したので、キャラごとに振り直してください」のモーダルを表示（閉じると `false` になり再表示されない）。

## 3. 同じスキルIDが複数キャラにある場合の扱い
- **方針**:
  - スキル定義（`SK`）およびエフェクト定義（`SKILL_FX_MAP`）は**共通のスキルID**（例: 非ヒーラー3人が持つ `firstAid`（応急手当）、暫定で複数キャラの奥義枠に置かれた `heroic`〜`genesisRay`、ステラと暫定クロエが持つ剣枠・戦士枠スキル）を参照する。
  - **習得状態とスロット装備はキャラごとに完全分離**する。各キャラのツリー進捗は `p.chars[charId].skillPts` に個別保持され、`syncActiveCharState(p)` が「現在選択中のキャラ（`p.skin`）のツリーで到達しているマイルストーンのみ」から `p.skills` と `p.passiveSkills` を生成する。
  - そのため、たとえばステラで `firstAid` や `hero10` を習得しても、ルビィに切り替えた時点でルビィ側の `p.chars.ruby.skillPts` に基づいて `p.skills`・`p.passiveSkills`・`p.equippedSkills` が再構築され、他キャラの習得状態が混ざることはない。また、後から `CHAR_TREES` のスキル割り当てを R1b で差し替えても、セーブデータの `skillPts` から自動的に新しいスキル集合へ再計算される。

## 4. 暫定箇所（`// TODO(R1b)`）の一覧
すべて `src/data/char_trees.js` 内に集約し、`// TODO(R1b)` コメントを付与している。
1. **ステラ（剣士）奥義枠「英雄枠」30SP**:
   - 現在は暫定で `genesisRay`（創世の光）。R1b で剣系専用の24倍級最終奥義（仮名「剣神の一閃」）に差し替え予定。
2. **ルビィ（魔法使い）奥義枠「英雄枠」**:
   - 現在は暫定で英雄枠のコピー（`heroic`, `hero10`, `heroAwaken`, `starSword`, `heroAdvent`, `skyStar`, `genesisRay`）。R1b で大魔導の専用魔法奥義ツリーに差し替え予定。
3. **シリア（聖職者）奥義枠「英雄枠」**:
   - 現在は暫定で英雄枠のコピー。R1b で聖属性攻撃スキル群および聖女奥義ツリーに差し替え予定。
4. **クロエ（盗賊）全3ツリー（盗技枠・怪盗枠・英雄枠）**:
   - 主ツリー「盗技枠」の3SP `doubleStab`（ダブルスタブ：2回×1.1倍、MP7、CT2）と12SP `firstAid`（応急手当：回復20%、MP12、CT5）のみ先行実装。
   - 盗技枠の残りマイルストーン（6SP〜30SP）、第2ツリー「怪盗枠」（戦士枠コピー）、奥義ツリー「英雄枠」（英雄枠コピー）はすべて暫定。R1b で専用スキル・新パッシブ（クリティカル率+、CT短縮など）に差し替え予定。
