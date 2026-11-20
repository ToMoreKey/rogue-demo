# 公開前チェックリスト（dev → main）

`dev` を `main` にマージして公開する前に、すべて確認する。公開はすべて完成後に一括（仕様書8章）。マージはあなた（運営者）が行う。

| # | 項目 | 確認方法 | Gemini確認 | Claude確認 | 人間確認 |
|---|---|---|---|---|---|
| 1 | `python3 tools/build.py` で `index.html` が再現できる（差分なし） | ビルド後に `git status` | OK（再現・差分なし確認） | OK（P6c時点で独立検証） | |
| 2 | 全テストが `RESULT: OK`（`test_p1`〜最新、`test_save_migration`） | 各テストを実行 | OK（全11種 `RESULT: OK`） | OK（test_p6cはモーダル遮蔽で途中終了していたためClaudeが修正し全OK） | |
| 3 | 本編周回BOT: 3シード `done: true`、ラン数490〜510、`model_hours` 20.8〜21.2、Lv124、敗北は1シードあたり30回以下（P7a-2で基準を更新） | `python3 tools/bot.py` | | | |
| 4 | 回廊BOT: 最適 59/64/69 付近（±5階）、ランダム 51/53/59 付近（±6階） | `python3 tools/bot.py --mode tower` | | | |
| 5 | 深淵BOT: 標準で難度6〜10が0%・難度1〜3が100%、強化で難度10が0〜20% | `python3 tools/bot.py --mode abyss` | | | |
| 6 | 旧セーブ（v1・v2・v3・v4・v5）が壊れずに最新へ移行する | `test_save_migration.py` ほか | OK（v1〜v7→v8移行確認） | OK（P6c時点で独立検証） | |
| 7 | `sw.js` の `CACHE` が `index.html` 更新ごとに上がっている | `sw.js` を確認 | OK（`rogue-v23`） | OK（P6c時点で独立検証） | |
| 8 | `data/ranking.json` が空の雛形（`entries: []`）か、確認済みの内容 | ファイルを確認 | OK（空の雛形 `entries: []`） | OK（P6c時点で独立検証） | |
| 9 | ランキングの送信先（フォームURL・質問ID）が `docs/ranking_setup.md` の D と一致 | `src/data/ranking.js` を確認 | OK（`ranking_setup.md` D と一致） | OK（P6c時点で独立検証） | |
| 10 | 秘密情報（トークン・鍵）がリポジトリ・`index.html` に含まれていない | `git grep -i -E "token|secret| OK（P6c時点で独立検証） |github_pat"` | OK（機密情報なし） | | |
| 11 | 420px幅で、主要画面（街・ダンジョン・戦闘・ステータス・図鑑・実績・ヘルプ・ランキング）が崩れない | スクリーンショット | OK（各画面横スクロール0px確認） | | |
| 12 | オフラインで起動・戦闘できる（ランキングのみオフライン表示） | `test_p6c.py` | OK（`set_offline(True)` で確認） | OK（P6c時点で独立検証） | |
| 13 | 実機（Android Chrome）で、ホーム画面に追加でき、起動・戦闘できる | 実機で確認 | 要人間確認 | | 要 |
| 14 | 実機で、ランキング送信（フォーム）が届き、スプレッドシートに行が増える | 実機で確認 | 要人間確認 | | 要 |
| 15 | デバッグ部隊の通しプレイで、大きな不満・進行不能の不具合がない | デバッグ依頼書で依頼 | 要人間確認 | | 要 |

## マージの手順（運営者）
1. 上の表がすべて埋まり、NGがないことを確認する。
2. GitHub で `dev` → `main` のプルリクエストを作り、内容を確認してマージする。
3. GitHub Pages の公開（数分）を待ち、公開URLを開いて、起動・戦闘・ランキング表示を確認する。
4. 問題があれば、`main` を前の状態に戻し（Revert）、`dev` で直す。
