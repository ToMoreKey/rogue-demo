# rogue-demo

ブラウザで遊べるローグライクRPGのデモ版（PWA）。

- 起動: GitHub Pages で公開（`index.html`）
- Android(Chrome)で開き、メニューの「ホーム画面に追加」（または「アプリをインストール」）でアプリのように起動できます
- 初回表示のあとはオフラインでも遊べます。セーブはブラウザ内に保存されます

## 構成
- `index.html` … ゲーム本体（画像を埋め込んだ単一ファイル）
- `manifest.json` / `sw.js` … PWA設定・オフライン対応
- `icon-*.png` ほか … アイコン

## ドキュメント
- `docs/spec_volume_expansion.md` … ボリューム拡張・エンドコンテンツ仕様書（開発の正本。他のAI・メンバーもこれを参照）
- `docs/gemini_prompt_P0.md` … P0（基盤整備）をGeminiに依頼するための指示書
- `tools/bot.py` … 自動プレイBOT（回帰テスト）。`python3 tools/bot.py`
- 方針: 設計や仕様を作成したら `docs/` にMarkdownで保存してコミットする

## 更新するとき
`index.html` を差し替えたら、`sw.js` の `CACHE` のバージョン（`rogue-v1`→`rogue-v2`）を上げてください。
