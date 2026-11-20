# P8 セーブのバックアップ・引き継ぎ 実装メモ

## 1. 実装概要
- **新規モジュール**: `src/js/35_backup.js`（`tools/build.py` の `JS_ORDER` に登録）
- **セーブ構造・バージョン（v8）**: 変更なし。書き出し日時と案内日時は別キー（`BACKUP_META_KEY`）で管理。

### 2-1. 書き出し（ステータス画面「データ」パネル、「初期化」ボタンの下・控えめ配置）
- **ファイル**: `rogue-save-YYYYMMDD-HHMM.json` をダウンロード。
- **コード**: `CompressionStream('deflate-raw')` 対応時は `RGS1:<base64url>.<fnv1a8>`、非対応時は `RGS0:<base64url>.<fnv1a8>`。クリップボードへコピー（非対応時は選択済みテキストエリアのモーダルを表示）。
- 書き出し日時を `BACKUP_META_KEY` に保存し、画面に表示（未実施時は「まだ書き出していません」）。

### 2-2. 読み込み
- ファイル選択またはコード/JSON貼り付け → `decodeAndValidateSaveInput` で形式（`app: 'rogue-demo'`, `kind: 'save'`）、`saveVersion`（`1..SAVE_VERSION`）、JSON構文、8桁FNV-1aチェックサムを検証。
- 不正な入力は何も変更せず理由を表示。
- 有効な場合は現在側・書き出し側の Lv / ゴールド / 進行度を並べた確認画面を表示し、「読み込む」押下時のみ現在セーブを `<SAVE_KEY>_bak_import` へ退避してから置き換え、`load()`（`migrations` 含む）→ `save()` → `idbMirrorSave(true)` → `renderAll()` を実行。
- 本番の書き出しをテスト版へ読み込む（および逆）ことも可能。

### 2-3. 消えにくくする仕組み
- 初回ユーザー操作時に `navigator.storage.persist()` を1回要求（失敗・非対応は無視）。
- `save()` 時に最短10秒間隔（`pagehide` 時は即時）で IndexedDB（`IDB_BACKUP_NAME`）へ複製。
- 起動時に `localStorage` のセーブが無く IndexedDB に複製がある場合のみ、「前回のデータが見つかりました」確認モーダルを表示（勝手には復元しない、初回プレイヤーには出ない）。

### 2-4. 控えめな案内・ヘルプ追記
- 1つ以上ダンジョンをクリア済み、かつ最後の書き出し・前回の案内から7日以上経過（または未実施）の場合、起動時にトーストで1回だけ「セーブの書き出しをおすすめします（設定）」を表示。
- `renderHelp()` の「その他のヒント」にバックアップ・引き継ぎの1項目を追記（既存文章は未変更）。

### 本番／テスト版分離（`tools/build.py` `to_dev`）
- `BACKUP_META_KEY`: `rogue_backup_meta_v1` → `rogue_dev_backup_meta_v1`
- `IDB_BACKUP_NAME`: `rogue_backup_db_v1` → `rogue_dev_backup_db_v1`
- `sw.js`: `CACHE` を `'rogue-v30'` → `'rogue-v31'` に更新。
