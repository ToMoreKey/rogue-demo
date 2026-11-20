# 公開の仕組みと設定手順（本番とテスト版）

## 1. 仕組み
1つの GitHub Pages サイトに、本番とテスト版を並べて公開する（`.github/workflows/pages.yml`）。

| | URL | 元のブランチ | セーブ | ランキング送信 | 画面 |
|---|---|---|---|---|---|
| 本番 | https://tomorekey.github.io/rogue-demo/ | `main` | `rogue_test_save_v1` | する（同意した人のみ） | 通常 |
| テスト版 | https://tomorekey.github.io/rogue-demo/dev/ | `dev` | `rogue_dev_save_v1`（本番と別） | **しない** | 右上に「TEST版」 |

- `dev` に push すると、約1分でテスト版が更新される。`main` へのマージで本番が更新される。
- テスト版は、ホーム画面に本番と別アプリ（「Rogue TEST」）として入れられる。Service Worker のキャッシュ名も別。
- テスト版のビルドは `python3 tools/build.py <出力先> --variant dev`。置換は `tools/build.py` の `to_dev`。サイトの組み立ては `tools/make_site.py`。
- テスト: `python3 tools/test_variants.py`（分離の確認）。

## 2. 最初の設定（運営者が1回だけ。2026-11-20 に完了・動作確認済み）
順番を守ってください（本番が一時的に見えなくなるのを防ぐため）。

1. GitHub で `ToMoreKey/rogue-demo` を開く → **Settings** → 左メニュー **Environments** → **github-pages** をクリック（まだ無ければ手順3のあとに作られる。その場合は手順3→1の順でもよい）。
2. **Deployment branches and tags** で、`main` に加えて **`dev`** を追加する（Add deployment branch or tag rule → `dev`）。
3. **Settings** → 左メニュー **Pages** → **Build and deployment** の **Source** を、**Deploy from a branch** から **GitHub Actions** に変更する。
4. **Actions** タブ → 左の **Deploy Pages** → **Run workflow** → ブランチ `dev` を選んで実行する（初回のみ手動。以後は push で自動）。
5. 緑のチェックになったら、次の2つを開いて確認する。
   - 本番: https://tomorekey.github.io/rogue-demo/ が今までどおり動く。
   - テスト版: https://tomorekey.github.io/rogue-demo/dev/ が開き、右上に「TEST版」が出る。

## 3. うまくいかないとき
- 手順4が赤: Actions の実行ログを開き、失敗した手順の名前を教えてください。多いのは、手順2で `dev` を許可していない場合（「Branch "dev" is not allowed to deploy to github-pages」）。
- 本番が 404 のまま: 手順4の実行が成功するまで待つ。成功しない場合は、Pages の Source を **Deploy from a branch**（`main` / root）に戻せば、すぐ元に戻る。
- ワークフローの push が「workflow scope」で拒否される場合: Gemini 用トークンに `workflow` 権限が必要。または GitHub の画面で `.github/workflows/pages.yml` を `dev` ブランチに直接追加する。

## 4. 公開（リリース）時の注意
- 本番に出るのは `main` のファイルだけ。`dev` → `main` のマージで、`index.html`・`sw.js` などが本番に反映される。
- `main` の `index.html` は**本番ビルド**（`--variant` なし）のまま。テスト版の印（`rogue_dev_`、`dev-badge`、`[TEST]`）が入っていないことを、`test_variants.py` が確認する。
