# P10 匿名の利用状況の送信 実装メモ

## 1. 構成ファイル
- `src/data/analytics.js`（`JS_ORDER` 登録）: `ANALYTICS_CFG`（`reportUrl: ''`, `entryStats: ''`, `intervalHours: 24`, `anonIdKey: 'rogue_anon_id_v1'`, `lastSentKey: 'rogue_stats_last_v1'`, `launchKey: 'rogue_stats_launch_v1'`, `playSecKey: 'rogue_stats_playsec_v1'`, `optOutKey: 'rogue_stats_optout_v1'`）。URLと entry ID は空のまま出荷。
- `src/js/37_analytics.js`（`JS_ORDER` 登録）: 匿名ID生成・保持、起動回数・プレイ時間計測、1行文字列生成、24時間間隔の起動時送信、オプトアウト管理。
- `tools/make_stats.py`: スプレッドシートのCSV（タイムスタンプ、記録）から `docs/stats_report.md` を生成する集計スクリプト（標準ライブラリのみ）。

## 2. 送信内容・タイミング・本番/テスト版分離
- **送信文字列**: `id=<16文字hex>; ver=<APP_VERSION>; lv=<Lv>; dg=<最高到達ダンジョンA〜O>; clear=<0|1>; tw=<塔最高階>; ab=<深淵最高難度>; hours=<累計時間・小数1桁>; launch=<累計起動回数>; vp=<幅x高さ>; new=<初回送信1|0>`
- **非送信情報**: 名前・ニックネーム・メールアドレス・セーブデータ本体・不具合報告本文などの個人情報は一切含まない。匿名IDは `rogue_anon_id_v1` に独立保存し、セーブデータ（v8）には含めない。
- **送信タイミング**: `boot()` 時に1回、本番ビルドかつ URL 設定済み・オプトアウトなし・オンライン・前回送信から24時間以上経過時のみ `fetch(reportUrl, { method: 'POST', mode: 'no-cors', body: FormData })` で送信（失敗・オフライン時はサイレントにスキップし、キューには溜めない）。
- **オプトアウトと説明**: ステータス画面「データ」タブに ON/OFF スイッチと説明文、ヘルプ画面「はじめに」タブの「その他のヒント」末尾に1行説明を追加。
- **`to_dev` 分離**: `tools/build.py` の `to_dev()` で `ANALYTICS_CFG` の `reportUrl` / `entryStats` を空にし、5つの保存キーを `rogue_dev_` 系に置換（さらに `IS_DEV_BUILD` 時も送信しない二重ガード）。
- `sw.js`: `CACHE` を `'rogue-v38'` → `'rogue-v39'` に更新（CRLF維持）。
