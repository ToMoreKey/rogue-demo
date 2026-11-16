# rogue-demo

ブラウザで遊べるローグライクRPGのデモ版（PWA）。

- 起動: GitHub Pages で公開（`index.html`）
- Android(Chrome)で開き、メニューの「ホーム画面に追加」（または「アプリをインストール」）でアプリのように起動できます
- 初回表示のあとはオフラインでも遊べます。セーブはブラウザ内に保存されます

## 構成
- `index.html` … ゲーム本体（**ビルドで生成される単一ファイル**。画像を埋め込み済み。直接は編集しない）
- `src/` … `index.html` の元になるソース
  - `index.template.html` … HTMLの骨組み（`{{CSS}}` `{{JS}}` の位置に結合される）
  - `css/` … スタイル
  - `data/` … 数値・定義データ（ダンジョン `dungeons.js`、難易度、敵、装備の基礎値・レア度 `items.js`、スキル `skills.js`、`TUNE` などの `config.js`）。**ダンジョンや★・難易度の追加は、基本的にここへデータを足すだけ**
  - `assets/` … base64画像（敵・装備アイコン・キャラ）。中身は書き換えない
  - `js/` … ロジック（`30_save.js` がセーブとバージョン移行）
- `tools/build.py` … `src/` から `index.html` を生成
- `docs/gemini_prompt_P1.md` … P1（A〜C拡張）をGeminiに依頼するための指示書
- `tools/bot.py` … 自動プレイBOT（回帰テスト）
- `tools/test_save_migration.py` / `tools/fixtures/save_v1.json` … セーブ移行テストと、旧版で作った実セーブ
- `manifest.json` / `sw.js` … PWA設定・オフライン対応
- `icon-*.png` ほか … アイコン

## ビルド手順
Python 3 だけで動きます（標準ライブラリのみ）。

```
python3 tools/build.py      # src/ から index.html を生成
```

- ファイルを `src/` に足したら、`tools/build.py` の `JS_ORDER`（結合順）にも追記してください（未登録だとビルドが止まります）。
- ゲーム全体は1つの即時関数に結合されるため、各ファイルの定数・関数は互いに見えます。
- `index.html` を更新したら `sw.js` の `CACHE` のバージョンを上げてください（下記）。

## テスト手順
初回のみ: `pip install playwright` と `playwright install chromium`。

```
python3 tools/build.py
python3 tools/bot.py                    # 全ステージ制覇BOT（3シード）
python3 tools/test_save_migration.py    # v1セーブ→v2移行
```

- BOTの目安: 3回とも `done: true`、`runs` 91〜95、`lv` 31、`gold` 約14.4万〜14.8万G、ページエラー配列は空。乱数は固定なので、値を変えない作業では結果が**完全に同じ**になります（シード1〜3で 95/91/91戦、gold 147705/147543/143909）。
- 移行テストは全項目 `PASS`、最後に `RESULT: OK` が出れば成功です。

## セーブ形式
- 保存先は `localStorage` の `rogue_test_save_v1`（キーは互換のため据え置き）。形式は `{ v: 2, p, opts, sel, shopSel, autoSellRarity }`。
- 旧 `v: 1`（`v`なしも含む）は、読み込み時に自動で `v: 2` へ変換して書き戻します。変換前の生データは `rogue_test_save_v1_bak_v1` に1度だけ退避します。
- 将来 `v: 3` 以降を足すときは、`src/js/30_save.js` の `migrations` に `{2: fn}` のように「vN→vN+1」の関数を足します（順に連鎖して適用されます）。

## ドキュメント
- `docs/spec_volume_expansion.md` … ボリューム拡張・エンドコンテンツ仕様書（開発の正本。他のAI・メンバーもこれを参照）
- `docs/gemini_prompt_P0.md` … P0（基盤整備）をGeminiに依頼するための指示書
- 方針: 設計や仕様を作成したら `docs/` にMarkdownで保存してコミットする

## 更新するとき
`index.html` を差し替えたら、`sw.js` の `CACHE` のバージョン（`rogue-v1`→`rogue-v2`）を上げてください。
