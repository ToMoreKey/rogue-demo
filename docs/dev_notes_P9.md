# P9 ゲーム内の不具合報告 実装メモ

## 1. 構成ファイル
- `src/data/bugreport.js`（`JS_ORDER` 登録）: `BUGREPORT_CFG`（`reportUrl`, `entryKind`, `entryText`, `entryDiag`, `rateLimitSec: 60`, `textMin: 5`, `textMax: 500`, `queueKey`, `rateKey`）。`reportUrl` 等は空のまま保持。
- `src/js/36_bugreport.js`（`JS_ORDER` 登録）: エラー収集（`window.error` / `unhandledrejection`、直近3件・各120文字まで・URL除去）、ブラウザ/OS短縮UA、診断情報1行生成、送信・60秒レート制限・最大5件オフラインキュー＆再送。
- `src/data/config.js` + `tools/build.py`: `APP_VERSION` をビルド時に `sw.js` の `CACHE` から自動注入（本番 `rogue-vN`、テスト版 `rogue-dev-vN`）。`to_dev` で `queueKey` / `rateKey` も `rogue_dev_` 系へ分離。

## 2. 画面・仕様（3-1〜3-5）
- **入口（3-1）**: ステータス画面「データ」パネルとヘルプ画面最下部に「不具合・ご意見を送る」ボタンを配置。ヘルプの「その他のヒント」に案内1項目を追加。
- **報告モーダル（3-2）**: 種類（不具合/バランス/要望/その他）、内容（5〜500文字＋リアルタイム文字数カウンター＋「どの画面で何を押したか、書いてもらえると助かります」案内）、読み取り専用診断情報、同意チェック（必須）、下部固定ボタン（送信する/キャンセル）。`reportUrl` 未設定時は「準備中です」を表示して送信不可。
- **診断情報（3-3）**: `build=prod|dev; ver=...; vp=...; ua=...; lv=...; dg=...; fl=...; view=...; err=...`。セーブデータ・ニックネーム・ランキング同意・所持品・個人情報は一切含まない。
- **送信・キュー（3-4）**: `fetch(reportUrl, { method: 'POST', mode: 'no-cors', body: FormData })`。60秒に1回制限。オフライン・送信失敗時は `queueKey` に最大5件保存し、起動時・`online` 復帰時に `flushBugQueue()` で再送。
- `sw.js`: `CACHE` を `'rogue-v34'` → `'rogue-v35'` に更新。
