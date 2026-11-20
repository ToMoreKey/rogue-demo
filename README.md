# rogue-demo

ブラウザで遊べるローグライクRPGのデモ版（PWA）。

- 起動: GitHub Pages で公開（`index.html`）
- Android(Chrome)で開き、メニューの「ホーム画面に追加」（または「アプリをインストール」）でアプリのように起動できます
- 初回表示のあとはオフラインでも遊べます。セーブはブラウザ内に保存されます

## 構成
- `index.html` … ゲーム本体（**ビルドで生成される単一ファイル**。画像を埋め込み済み。直接は編集しない）
- `src/` … `index.html` の元になるソース
  - `index.template.html` … HTMLの骨組み（`{{CSS}}` `{{JS}}` の位置に結合される）
  - `css/` … スタイル
  - `data/` … 数値・定義データ（ダンジョン `dungeons.js`、難易度、敵、装備の基礎値・レア度 `items.js`、スキル `skills.js`、`TUNE` などの `config.js`）。**ダンジョンや★・難易度の追加は、基本的にここへデータを足すだけ**
  - `assets/` … base64画像（敵・装備アイコン・キャラ）。中身は書き換えない
  - `js/` … ロジック（`30_save.js` がセーブとバージョン移行）
- `tools/build.py` … `src/` から `index.html` を生成
- `docs/gemini_prompt_P6a.md` / `P6b.md` / `P6c.md` … P6（図鑑／実績・称号／チュートリアル・ヘルプ・PWA）をGeminiに依頼するための指示書
- `docs/release_checklist.md` … 公開前チェックリスト（dev → main）
- `docs/gemini_prompt_P5b2.md` … P5b-2（ランキングの送信・表示）をGeminiに依頼するための指示書
- `docs/ranking_setup.md` … ランキング（Googleフォーム＋手動反映）の準備と更新の手順
- `tools/make_ranking.py` … フォーム回答のCSVから `data/ranking.json` を作る
- `docs/gemini_prompt_P5b1_fix.md` … P5b-1の修正（本編バランス変化の原因調査・深淵の難度8〜10）をGeminiに依頼するための指示書
- `docs/gemini_prompt_P5b1.md` … P5b-1（深淵ダンジョン・進化第3段階・極意・★9神話ドロップ）をGeminiに依頼するための指示書
- `docs/gemini_prompt_P5a_fix.md` … P5aの修正（回廊の壁・祝福の効き・神話装備の価格）をGeminiに依頼するための指示書
- `docs/gemini_prompt_P5a.md` … P5a（無限回廊「天蓋の塔」・回廊コイン・神話装備の交換）をGeminiに依頼するための指示書
- `docs/image_prompts_P5.md` … P5用の画像（装備アイコン★6〜9・深淵の主3体）の生成プロンプト
- `docs/gemini_prompt_P4.md` … P4（後編 J〜O・最終ボス・★9・神話レア）をGeminiに依頼するための指示書
- `docs/image_prompts_enemies_JKLMNO.md` … 後編の敵画像（J〜O＋最終ボス怒り形態）の生成プロンプト
- `docs/gemini_prompt_P3.md` … P3（前編の完成 G〜I）をGeminiに依頼するための指示書
- `docs/gemini_prompt_P2.md` … P2（新ダンジョンD〜F）をGeminiに依頼するための指示書
- `docs/gemini_prompt_P1c.md` … P1bの検証で見つかった修正（狂気武器の自動装備・金策の圧縮）をGeminiに依頼するための指示書
- `docs/gemini_prompt_P1b.md` … P1のペース再調整（時間の見積もりモデルに合わせる）をGeminiに依頼するための指示書
- `docs/gemini_prompt_P1.md` … P1（A〜C拡張）をGeminiに依頼するための指示書
- `tools/bot.py` … 自動プレイBOT（回帰テスト）
- `tools/test_save_migration.py` / `tools/fixtures/save_v1.json` / `save_v2.json` … セーブ移行テスト（v1/v2→v3）
- `tools/test_p1.py` … P1機能テスト（ドロップ上限・難易度解放・戦力値・ビルド再現性）
- `tools/test_p2.py` … P2機能テスト（D〜F解放・ドロップ上限・時の欠片/★7・30SPスキル・敵ID/ドット絵）
- `tools/test_p3.py` … P3機能テスト（G〜I解放・★8/機神の核・進化枠第2段階・前編完・オーラ・敵ID/ドット絵）
- `tools/test_p4.py` … P4機能テスト（J〜O解放・★9/創世の欠片・怒り形態・ゲームクリア・神話レア・Lv140）
- `tools/test_p5a.py` … P5a機能テスト（天蓋の塔・解放・祝福30種・コイン・交換所★8神話・称号・ドロップ）
- `tools/test_p5b1.py` … P5b-1機能テスト（深淵ダンジョン・呪い・★9神話・複数特性・極意・進化第3段階）
- `tools/test_p5b2.py` … P5b-2機能テスト（ランキング表示・検証・キャッシュ・自動/手動送信・セーブ）
- `tools/test_p6a.py` … P6a機能テスト（敵図鑑94種・装備図鑑22種・移行・報酬・420pxレイアウト）
- `tools/test_p6b.py` … P6b機能テスト（実績36種・保留コイン・隠し実績・称号装備・移行・420pxレイアウト）
- `tools/test_p6c.py` … P6c機能テスト（クリア後お知らせ・ヘルプ6項目・manifest・オフライン・420pxレイアウト）
- `tools/test_debug1.py` … デバッグ1回目総合監査＆再発防止テスト（1-1〜1-9・360px/420pxレイアウト・聖域DEF表示）
- `tools/test_p7a1.py` … P7a-1機能テスト（ヘルプ文言更新・旧表記削除・420pxレイアウト）
- `tools/test_p7a2.py` … P7a-2機能テスト（パッシブ5種反映・MP消費下限1・空オブジェクト不変・表示一致・旧セーブ互換）
- `tools/test_debug2.py` … デバッグ2回目総合監査＆再発防止テスト（0-1〜0-4・1-1〜1-9・未知スキルIDガード）
- `docs/dev_notes_P1.md` … P1 で決定したバランス数値・計算式メモ
- `docs/dev_notes_P2.md` … P2（D〜F追加）で決定したバランス数値・BOT検証結果メモ
- `docs/dev_notes_P3.md` … P3（G〜I前編完成）で決定したバランス数値・仕様・BOT検証結果メモ
- `docs/dev_notes_P4.md` … P4（J〜O後編完成）で決定したバランス数値・仕様・BOT検証結果メモ
- `docs/dev_notes_P5a.md` … P5a（無限回廊「天蓋の塔」）で決定した数値・仕様・BOT検証結果メモ
- `docs/dev_notes_P5b1.md` … P5b-1（深淵・進化第3段階・極意・★9神話）で決定した数値・仕様・BOT検証結果メモ
- `manifest.json` / `sw.js` … PWA設定・オフライン対応
- `icon-*.png` ほか … アイコン

## ビルド手順
Python 3 だけで動きます（標準ライブラリのみ）。

```
python3 tools/build.py      # src/ から index.html を生成
```

- ファイルを `src/` に足したら、`tools/build.py` の `JS_ORDER`（結合順）にも追記してください（未登録だとビルドが止まります）。
- ゲーム全体は1つの即時関数に結合されるため、各ファイルの定数・関数は互いに見えます。
- `index.html` を更新したら `sw.js` の `CACHE` のバージョンを上げてください（下記）。

## テスト手順
初回のみ: `pip install playwright` と `playwright install chromium`。

```
python3 tools/build.py
python3 tools/bot.py                    # 全75セル制覇BOT・周回モード（3シード）
python3 tools/bot.py --mode linear      # 線形モード（各セル1回ずつ、レベル差確認）
python3 tools/bot.py --mode tower       # 無限回廊「天蓋の塔」BOT（3シード）
python3 tools/bot.py --mode abyss       # 深淵ダンジョンBOT（難度1〜10、3シード）
python3 tools/test_save_migration.py    # v1/v2/v3/v4セーブ→v5移行
python3 tools/test_p1.py                # P1機能テスト（A〜Cドロップ上限・解放ルール・戦力値・ビルド再現性）
python3 tools/test_p2.py                # P2機能テスト（D〜F解放・ドロップ上限・時の欠片/★7・30SPスキル・ドット絵）
python3 tools/test_p3.py                # P3機能テスト（G〜I解放・★8/機神の核・進化第2段階・前編完・オーラ）
python3 tools/test_p4.py                # P4機能テスト（J〜O解放・★9/創世の欠片・怒り形態・ゲームクリア・神話レア・Lv140）
python3 tools/test_p5a.py               # P5a機能テスト（天蓋の塔・祝福30種・コイン・交換所・称号）
python3 tools/test_p5b1.py              # P5b-1機能テスト（深淵・呪い・★9神話・複数特性・極意・進化第3段階）
python3 tools/test_p5b2.py              # P5b-2機能テスト（ランキング表示・検証・キャッシュ・送信・セーブ）
python3 tools/test_p6a.py               # P6a機能テスト（敵図鑑・装備図鑑・移行・報酬・420pxレイアウト）
python3 tools/test_p6b.py               # P6b機能テスト（実績・保留コイン・称号装備・移行・420pxレイアウト）
python3 tools/test_p6c.py               # P6c機能テスト（クリア後お知らせ・ヘルプ・PWAオフライン・420pxレイアウト）
python3 tools/test_debug1.py            # デバッグ1回目総合監査＆再発防止テスト
python3 tools/test_p7a1.py              # P7a-1機能テスト（ヘルプ文言更新・旧表記削除・420pxレイアウト）
python3 tools/test_p7a2.py              # P7a-2機能テスト（パッシブ5種反映・MP消費下限1・表示一致・旧セーブ互換）
python3 tools/test_debug2.py            # デバッグ2回目総合監査＆再発防止テスト
```

- BOTの目安（P4・全75セル / P5a・無限回廊）:
  - 周回モード: 3シードとも `done: true`、`model_hours` 約19〜21時間（490〜580ラン）、終了時 `lv` 124〜130、余りゴールド 1万〜30万G、1階あたりティック 4.3以下、ページエラー配列は空。
  - 回廊モード: 標準ビルド（Lv126・★8装備）で 40〜60階に到達。
- 移行テスト・P1〜P5aテストは全項目 `PASS`、最後に `RESULT: OK` が出れば成功です。

## セーブ形式
- 保存先は `localStorage` の `rogue_test_save_v1`（キーは互換のため据え置き）。形式は `{ v: 3, p, opts, sel, shopSel, autoSellRarity }`（`p.cleared`, `p.bagCap` を保持）。
- 旧 `v: 1` / `v: 2`（`v`なしも含む）は、読み込み時に自動で `v: 3` へ連鎖変換して書き戻します。変換前の生データは `rogue_test_save_v1_bak_v1` / `_bak_v2` に1度だけ退避します。
- 将来 `v: 4` 以降を足すときは、`src/js/30_save.js` の `migrations` に `{3: fn}` のように「vN→vN+1」の関数を足します（順に連鎖して適用されます）。

## ドキュメント
- `docs/spec_volume_expansion.md` … ボリューム拡張・エンドコンテンツ仕様書（開発の正本。他のAI・メンバーもこれを参照）
- `docs/gemini_prompt_P0.md` … P0（基盤整備）をGeminiに依頼するための指示書
- 方針: 設計や仕様を作成したら `docs/` にMarkdownで保存してコミットする

## 更新するとき
`index.html` を差し替えたら、`sw.js` の `CACHE` のバージョン（`rogue-v1`→`rogue-v2`）を上げてください。
