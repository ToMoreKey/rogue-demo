# 利用状況フォームの設定手順（P10）

不具合報告と同じ方式です（`docs/bugreport_setup.md` も参照）。

## A. フォームを作る
1. Googleフォームを新規作成。タイトル「rogue 利用状況（自動送信）」。
2. 質問を1つだけ作る: 質問名「記録」、形式「記述式（段落）」、必須にしない。
3. 設定で「回答を1回に制限」はオフ、メールアドレスの収集はオフ。
4. 回答タブで「スプレッドシートにリンク」を押す。

## B. URLとentry IDを調べる
1. 右上「︙」→「事前入力したURLを取得」。「記録」に `AAA` と入力して「リンクを取得」。
2. 得られたURLをコピーして私に貼る（形: `.../viewform?usp=pp_url&entry.NNNNNNNNN=AAA`）。公開情報なので貼ってOK。
3. 私が `src/data/analytics.js` の `reportUrl`（`/formResponse` に直したもの）と `entryStats` に入れます。

## C. 集計する
1. スプレッドシートを「ファイル→ダウンロード→CSV」で保存。
2. 私にCSVを渡す → `python3 tools/make_stats.py 回答.csv` で `docs/stats_report.md`（人数・日別アクティブ・到達状況・プレイ時間など）を作ります。

## D. 設定値（運営者が作成済み・公開情報）
- フォームURL（formResponse）: `https://docs.google.com/forms/d/e/1FAIpQLSfQa7ARhtacX4mo8JLnMsfOr8CSjnRgCHWjXkqkm8ipZU8jzA/formResponse`
- entry ID（記録）: `entry.1234051955`
- 反映: P10 の Gemini 実装完了後に、私が `src/data/analytics.js` の `reportUrl` / `entryStats` へ入れる（Geminiは空のまま出荷）。
