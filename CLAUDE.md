# 運用ルール（鐘鳴りのダンジョン）

- 返信は日本語で簡潔に。
- 役割: 仕様作成・実装・検証・テスト修正は Claude、実機確認と判断はユーザー。
- 変更は `dev` ブランチに push してユーザーが TEST 版で確認する。`main`（本番）へのマージは、ユーザーが「公開して」と言った後のみ。マージ前に全テスト（`tools/test_*.py`）を実行し、公開後は `gh api repos/ToMoreKey/rogue-demo/actions/runs` で Pages の成功を確認する。

## 確認依頼のときは必ず起動URLを添える
ユーザーに確認・動作チェックを依頼するメッセージには、毎回ゲームを起動するURLをそのまま本文に出力する（URLを省略しない）。

- TEST版（dev・確認用）: https://tomorekey.github.io/rogue-demo/dev/
- 本番（main・公開後の確認用）: https://tomorekey.github.io/rogue-demo/

確認対象に応じて該当するURLを書く。TEST版の確認依頼なら TEST版URL、公開完了報告なら本番URL（必要なら両方）。
