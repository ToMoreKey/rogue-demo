# P5b-2 開発メモ（天蓋の塔 ランキング表示・送信）

## 1. 全体構成（Googleフォーム送信 ＋ 手動反映）

- **設定ファイル**: `src/data/ranking.js`（`RANKING_CFG`）
  - `formUrl` / `entryName` / `entryFloor` は未設定（空文字）のまま実装し、送信機能のみ無効化（「ランキング送信は準備中です」表示）。
  - 設定値を埋めるだけでコード変更なしに自動・手動送信が有効化される。
- **表示対象**: `data/ranking.json`（`rankingUrl: 'data/ranking.json'`）の上位20位（`floor` 降順）。

## 2. 取得・検証・オフラインキャッシュ

- `fetch(RANKING_CFG.rankingUrl, { cache: 'no-cache' })` で取得。
- **検証 (`validateRankingData`)**: `entries` が配列、各要素の `name` が文字列（1〜12文字）、`floor` が `1〜500` の整数のみを採用し、不正な要素は無視。
- **HTML注入対策**: ニックネーム・更新日等は `textContent` で描画し、HTMLエスケープを徹底。
- **キャッシュ**: 取得成功時に `localStorage`（`rogue_ranking_cache_v1`、`try/catch` 保護）へ保存。取得失敗時はキャッシュを表示（「オフライン（前回取得分を表示）」）、キャッシュも無ければ「ランキングを取得できません」を表示。
- **Service Worker (`sw.js`)**: `data/ranking.json` のみ**ネットワーク優先**（失敗時のみキャッシュ）に変更し、更新が古いキャッシュに固定されないようにした（`CACHE = 'rogue-v19'`）。

## 3. 同意・検証・送信仕様

- **セーブ項目 (`p.tower`)**: 既存の `SAVE_VERSION = 5` のまま、`nick`（文字列、既定 `''`）、`rankOptIn`（真偽、既定 `false`）、`sentBest`（数値、既定 `0`）を追加。旧セーブ読み込み時に既定値を補完。
- **ニックネーム検証 (`cleanRankNick`)**: 制御文字除去＋前後空白除去後、1〜12文字・空文字不可・`http` / `www.` / `@` を含む名前を拒否。
- **自動送信タイミング**: 同意済み（`rankOptIn === true`）かつ `formUrl` 等が設定済みのとき、回廊ラン終了時に `p.tower.best` が更新され、かつ `best > sentBest` の場合のみ結果画面表示と同時に `POST`（`mode: 'no-cors'`, `application/x-www-form-urlencoded`）を1ラン最大1回送信。
- **手動送信**: モーダル内「今の最高記録を送信」ボタン（`best <= sentBest` または未同意時は無効）。
- **成功/失敗時の `sentBest`**: `fetch` が解決したときのみ `sentBest = best` を更新して保存し、「記録を送信しました（ランキングへの反映には時間がかかります）」を表示。例外・オフライン時は `sentBest` を更新せず「送信できませんでした」を表示（次回更新時に再送可能）。
