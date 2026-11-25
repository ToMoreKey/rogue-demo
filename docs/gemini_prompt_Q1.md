# Gemini 向け指示書: Q1（戦闘演出の品質アップ）

## 【プロンプト本文（ここから貼り付け）】

あなたは、ブラウザで動くローグライクRPG「rogue-demo」の開発担当エンジニアです。リポジトリ `ToMoreKey/rogue-demo` の `dev` ブランチ（最新を取得してから）で、Q1「戦闘演出の品質アップ（ボス激昂の色味・スキル発動エフェクト）」を実装します。仕様と合格基準は `docs/change_Q1_battle_fx.md`（運営者承認済み）。

### 0. 前提
- `src/` を編集し `python3 tools/build.py` で生成。`index.html` は直接編集しない。`sw.js` の `CACHE` を上げる（CRLFを保つ）。`src/assets/` は触らない。`window.__rogue`/`window.G` を残す。外部ライブラリ・画像は追加しない（CSS・DOM・インラインSVGのみ）。
- 作業は `dev`。`main` には push しない。push は従来どおり（トークンは設定ファイルから読み、その場の変数で使い、画面・ログ・ファイル・コミット・報告に出さず、使い終わったら破棄）。既存コミットの書き換え・force push はしない。
- 戦闘画面のレイアウト（4ボタン、アリーナ、ログ、下部ナビ固定）を壊さない。関連コード: `src/js/40_game.js`（`useSkillEffect`、`playerAct`、激昂処理）、`src/js/60_render.js`（`renderBattle`、`popDamage`）、`src/css/main.css`（`.fighter`/`.pop`/`@keyframes`、`prefers-reduced-motion`）、`src/data/skills.js`。

### 1. やること
`docs/change_Q1_battle_fx.md` の2〜4章をすべて実装する。要点:
1. **激昂演出（変更A）**: 激昂中の色味フィルター（図鑑の `bossFilter` と同系統）、激昂の瞬間の閃光＋拡大・ぶれ、激昂中のオーラとビネット。終了時に完全に消える。
2. **スキル演出（変更B）**: アリーナ上の `pointer-events:none` の演出レイヤー。分類（斬撃／魔法／大技／回復／強化／汎用）で演出。全スキルIDを分類に割り当て、未分類は汎用。速度に応じて短縮、前の演出を即終了して溜めない（同時最大12要素）。例外は try/catch で隔離。
3. **設定**: 「データ」タブに戦闘エフェクト ON/OFF（`G.opts.fx`、既定ON。無い古いセーブはONとして扱う。セーブ形式・マイグレーションは変えない）。`prefers-reduced-motion` 対応。
4. 演出は**表示だけ**。`battleRound`・ダメージ計算・乱数・ログ・タイミングに影響させない。BOT（`window.__rogue` 経由）は演出なしで動くので、BOT側で演出関数が呼ばれても副作用がないこと（ヘッドレス・高速実行で重くならないこと）。

### 2. 守ること（厳守）
- 数値・バランス・BOT結果・セーブ形式(v8)・`to_dev` の分離・チュートリアルを変えない。
- 仕様と矛盾する判断は勝手に決めず「要確認」と書く。
- `tools/test_q1.py`（新規）を追加し、`README.md` に実行方法を書く。合格基準1〜6をテストする（全スキルIDの分類網羅、演出ON/OFFで戦闘結果が一致、高速連続発動で要素数が12以下、reduced-motion、設定保持、360/390/420px）。
- 全テスト（test_p1〜最新、test_save_migration、test_variants、test_noskip、test_p8、test_p9、test_p10、test_modal_close、test_layout、test_ui1、test_ui2）が `RESULT: OK`。ビルドが `cmp` で再現できる。本編・塔・深淵のBOT結果が不変（本編: ラン数490〜510、model_hours 20.8〜21.2、Lv124。塔・深淵はP7b完了時点と同じ）。テストを通すために判定を弱めない。
- 実装メモを `docs/dev_notes_Q1.md` に残す（分類表＝どのスキルIDがどの分類か、390×844で確認した結果も文章で）。

### 3. 報告の形式（短く）
1. 激昂演出の内容
2. スキル分類表（分類ごとのスキルID）と演出の概要
3. 合格基準1〜7の結果
4. テスト・ビルド・BOT結果
5. 要確認の点

### 4. 今回やらないこと
他画面の変更、数値調整、新スキル、画像の生成・差し替え、音の追加、APK化。

## 【プロンプト本文（ここまで）】
