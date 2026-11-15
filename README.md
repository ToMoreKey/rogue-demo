# rogue-demo

ブラウザで遊べるローグライクRPGのデモ版（PWA）。

- 起動: GitHub Pages で公開（`index.html`）
- Android(Chrome)で開き、メニューの「ホーム画面に追加」（または「アプリをインストール」）でアプリのように起動できます
- 初回表示のあとはオフラインでも遊べます。セーブはブラウザ内に保存されます

## 構成
- `index.html` … ゲーム本体（画像を埋め込んだ単一ファイル）
- `manifest.json` / `sw.js` … PWA設定・オフライン対応
- `icon-*.png` ほか … アイコン

## 更新するとき
`index.html` を差し替えたら、`sw.js` の `CACHE` のバージョン（`rogue-v1`→`rogue-v2`）を上げてください。
