# 実装メモ: Q1（戦闘演出の品質アップ: ボス激昂の色味・スキル発動エフェクト）

## 1. ボス激昂（`o_boss_rage`）の演出（変更A）
- **色味フィルター (`src/js/10_art.js`)**:
  - `enemyArt(en, dId)` にて、`en.raged === true` のときは専用画像（`ENEMY_IMG[en.id]`）が未登録である場合に限り、図鑑と同じ色味フィルター `hue-rotate(140deg) saturate(1.6)` を適用（専用画像が登録された場合は二重変色を防ぐため重ねない）。
- **激昂した瞬間の1回演出 (`src/js/40_game.js`, `src/js/60_render.js`, `src/css/main.css`)**:
  - `battleRound()` で `o_boss`（極級）がHP50%以下になり `o_boss_rage` に変化した直後、`triggerRageFx()` を呼び出す。
  - `#arena.rage-burst` による赤い閃光オーバーレイ（約320ms）、`#f-enemy.rage-burst` による敵スプライトの拡大＋ぶれ（約320ms）、`#b-ename.rage-name` による敵名の紅紫ハイライトを表示。
- **激昂中の継続演出**:
  - `#arena.rage-active` でアリーナ内周に赤いビネット（`inset box-shadow` と境界色）、`#f-enemy.rage-aura` で敵スプライト周囲に赤〜紫の `drop-shadow` が2秒周期で脈動（`ragePulse`）。
- **終了・遷移時の完全消去**:
  - 敵撃破（`onKill`）、新規敵出現（`spawnEnemy`）、ラン終了・撤退・敗北（`finishRun`）、ダンジョン選択画面への復帰（`renderAll`）で `clearRageFx()` / `clearAllBattleFx()` を呼び、すべてのクラスとタイマーを確実に除去。

## 2. スキル発動エフェクトと全42スキル分類表（変更B）
- `#arena` 内に `<div class="fx-layer" id="fx-layer" aria-hidden="true"></div>`（`pointer-events: none; position: absolute; inset: 0`）を配置。
- `SKILL_FX_MAP` で全42スキルIDを明示的に分類し、未知のスキルIDが渡された場合も `getSkillFxSpec(id)` で `type` または `generic`（汎用）へ安全にフォールバック。
- 演出時間はゲーム速度 `G.opts.speed`（1x/2x/4x）に反比例して短縮（最短150ms、通常250〜600ms、大技は最大900ms）。
- 新しいスキル演出が始まる際は `clearSkillFxLayer()` で前の要素を即時クリアし、同時生成ノード数も `FX_MAX_NODES = 12` 以下に制限。すべての処理は `try / catch` で隔離し、`G.headless` 時は即 return する。

### スキル分類表（全42種＋汎用フォールバック）

| 分類 | 演出内容 | 対象スキルID（全42種） |
|---|---|---|
| **斬撃（剣系）** (`slash`, 6種) | 敵の上を斜めに走る白〜金の斬撃線（ヒット数に応じ最大5本、烈火斬は炎色）＋命中時に敵が一瞬白く発光（`.fx-hit-white`） | `strike`（強撃）, `multi`（連続斬り）, `ult`（必殺剣）, `flameSlash`（烈火斬）, `skySlash`（天翔斬）, `heroic`（英雄の奇跡） |
| **魔法（攻撃魔法）** (`magic`, 8種) | 敵の位置に広がる属性色の光の輪（`.fx-magic-ring`）＋6方向に飛び散る光の粒（`.fx-magic-orb`）。炎=橙 (`fire`)、氷=水色 (`ice`)、雷=黄 (`thunder`) | 炎: `fireball`（ファイアボール）, `meteor`（メテオ）, `blaze`（ブレイズ）<br>雷: `thunder`（サンダー）, `lightningStorm`（ライトニングストーム）<br>氷: `blizzard`（ブリザード）, `iceAge`（アイスエイジ）, `zeroAbs`（絶対零度） |
| **大技・奥義** (`ult`, 8種) | アリーナ全体の短い暗転→閃光（`.fx-ult-bg`）、大斬撃/星辰爆発コア（`.fx-ult-core`）＋放射スパーク6個、敵の大きなぶれ（`.fx-shake-big`） | 剣奥義: `hagun`（破軍の剣）, `tenma`（天魔滅殺斬）, `starSword`（星剣の極意）, `skyStar`（蒼穹星剣）<br>魔法奥義: `ultima`（アルテマ）, `cosmicNova`（コズミックノヴァ）, `meteorNova`（メテオノヴァ）<br>聖光奥義: `genesisRay`（創世の光） |
| **回復** (`heal`, 10種) | プレイヤー側に緑の柔らかい光輪（`.fx-heal-glow`）＋上昇する5つの緑光粒（`.fx-heal-mote`）、回復ポップ数字と同期 | `heal`（ヒール）, `regen`（リジェネ）, `fullheal`（フルヒール）, `highRegen`（ハイリジェネ）, `saintPrayer`（聖女の祈り）, `resurrection`（リザレクション）, `holyLight`（ホーリーライト）, `requiem`（レクイエム）, `goddess`（女神の奇跡）, `eternal`（永劫の祈り） |
| **強化（バフ）** (`buff`, 10種) | プレイヤー周囲に2重の色付きリング（攻撃系=赤橙 `atk`、防御/バリア系=青 `def`、全能力=金 `all`）が広がり、バフ持続中はプレイヤーに薄いオーラ（`.buff-aura-*`）が残る | 防御系(`def`): `guard`（鉄壁）, `magicshield`（マジックシールド）, `barrier`（バリア）, `holyBarrier`（ホーリーバリア）<br>攻撃系(`atk`): `berserk`（バーサーク）, `warGod`（鬼神の構え）, `shura`（修羅の構え）, `kishin`（鬼神降臨）<br>全能力(`all`): `heroAwaken`（英雄の覚醒）, `heroAdvent`（勇者の光臨） |
| **汎用** (`generic`) | 控えめな光のフラッシュ（`.fx-generic-flash`） | 未定義・将来の未知スキルIDが渡された場合のフォールバック |

## 3. 設定・アクセシビリティ対応
- ステータス画面「データ」タブに「戦闘エフェクト：ON / OFF」ボタン（`data-act="fxToggle"`）を追加。
- `G.opts.fx`（既定 `true`）として既存の `opts` オブジェクト内に保存。`fx` プロパティが無い旧セーブデータも `load()` 時に `d.opts.fx !== false` で `true`（ON）として扱うため、セーブ形式（`SAVE_VERSION = 8`）やマイグレーションは変更なし。
- `prefers-reduced-motion: reduce` 時は閃光・拡大・ぶれを出さず、短い単色フェード（`.fx-fade-only`）と静的な激昂枠表示のみに抑制。

## 4. 390×844（および 360px / 420px）での画面確認結果
- 390×844 のビューポートにて戦闘画面（通常時・スキル6分類発動時・`o_boss_rage` 激昂時）およびステータス画面「データ」タブを確認。
- `#fx-layer` は `#arena` 内（`overflow: hidden; position: relative`）に完全に収まり、戦闘中の4ボタン（スキル自動・生命の薬・魔力の薬・撤退）や下部固定ナビゲーションと重ならず、360px / 390px / 420px の全幅で横スクロール（`scrollWidth - clientWidth`）は 0px であることを確認。
