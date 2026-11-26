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

## E. 2026-11 調査メモ（同一ユーザーの重複送信疑いについて）
- フォーム回答シート（200行）を確認。**ユニークID 199 / 200行**、同一IDの重複はほぼなし。ほぼ全行が `launch=1, new=1, hours=0.0` で、v41〜v44の開発作業時間帯（11/25 8:30・9:04・13:23）に数十行ずつ連続して入っていた＝**自動テスト（Playwright/BOT）が本番ページを開き、実フォームへ送信していた汚染**。実ユーザーらしい行は11/26の2行程度。
- 対策: `maybeSendAnalytics` は `navigator.webdriver` かつ送信先が `docs.google.com` のとき送信しない（`reason: 'automation'`）。`test_p10` 基準1b。
- 集計時は、汚染行（〜11/25）を除くか、シートから削除してから `tools/make_stats.py` を使う。
