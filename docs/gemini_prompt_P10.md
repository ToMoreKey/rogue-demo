# Gemini 向け指示書: P10（匿名の利用状況の送信）

## 【プロンプト本文（ここから貼り付け）】

あなたは、ブラウザで動くローグライクRPG「rogue-demo」の開発担当エンジニアです。リポジトリ `ToMoreKey/rogue-demo` の `dev` ブランチ（最新を取得してから）で、P10「匿名の利用状況の送信」を実装します。仕様と合格基準は `docs/change_P10_analytics.md`（運営者承認済み）。手本は P9 の不具合報告（`src/js/36_bugreport.js`、`src/data/bugreport.js`、`docs/change_P9_bugreport.md`、`tools/test_p9.py`）です。

### 0. 前提
- `src/` を編集し `python3 tools/build.py` で生成。`index.html` は直接編集しない。`sw.js` の `CACHE` を上げる（CRLFを保つ）。`src/assets/` は触らない。`window.__rogue`/`window.G` を残す。外部ライブラリは追加しない。
- 作業は `dev`。`main` には push しない。push は従来どおり（トークンは設定ファイルから読み、その場の変数で使い、画面・ログ・ファイル・コミット・報告に出さず、使い終わったら破棄）。既存コミットの書き換え・force push はしない。

### 1. やること
`docs/change_P10_analytics.md` の2〜5章をすべて実装する。要点:
1. `src/js/37_analytics.js` と `src/data/analytics.js` を新規作成（`ANALYTICS_CFG`。`reportUrl`/entry IDは空で出荷）。匿名IDは新キー `rogue_anon_id_v1`（セーブv8に含めない）。起動時に24時間間隔で1回、no-corsのFormData POSTで、`k=v; k=v` の1行文字列を送る。失敗はサイレント。
2. 「データ」タブにオプトアウトのスイッチと説明、ヘルプ「はじめに」タブの末尾に説明1行。
3. `tools/build.py` の `to_dev`: devでは送信しない（設定を空にし、新キー名もdev用に分離）。`sub_once` の置換は1箇所だけに一致する形で。prodビルドに dev 用の文字列が混ざらないこと。
4. `tools/make_stats.py`（標準ライブラリのみ）で、スプレッドシートCSVから `docs/stats_report.md` を作る（集計項目は5章）。
5. `tools/test_p10.py`（新規）で合格基準1〜6をテストし、`README.md` に実行方法を書く（送信はモックし、実際のフォームには送らない。テストでは設定を空・またはダミーURLにして、本物のURLを使わない）。

### 2. 守ること（厳守）
- 個人情報・セーブ内容・不具合報告本文は送らない。送る項目は仕様2章のものだけ。
- 数値・バランス・BOT結果・セーブ形式(v8)を変えない。起動回数など新しい保存が必要なら、セーブ本体ではなく専用キーにする。
- 仕様と矛盾する判断は勝手に決めず「要確認」と書く。
- 全テスト（test_p1〜最新、test_save_migration、test_variants、test_noskip、test_p8、test_p9、test_modal_close、test_layout、test_ui1、test_ui2）が `RESULT: OK`。ビルドが `cmp` で再現できる。本編BOT不変（ラン数490〜510、model_hours 20.8〜21.2、Lv124）。テストを通すために判定を弱めない。
- 実装メモを `docs/dev_notes_P10.md` に残す。

### 3. 報告の形式（短く）
1. 送信する項目と送信タイミングの実装内容
2. 合格基準1〜7の結果
3. テスト・ビルド・BOT結果
4. 要確認の点

### 4. 今回やらないこと
他画面の変更、数値調整、新機能、画像、APK化、実際のフォームの作成・設定（運営者が行う）。

## 【プロンプト本文（ここまで）】
