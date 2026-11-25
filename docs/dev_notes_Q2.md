# 実装メモ: Q2（テスト版のエフェクト確認パネル）

## 1. パネルの構成と本番/テスト版の分離
- **入口ボタンと本番ガード (`src/js/60_render.js`, `src/js/50_acts.js`)**:
  - ステータス画面「データ」タブの `IS_DEV_BUILD` 専用ボタン行に `<button class="btn small" data-act="openFxDebug">🎬 エフェクト確認</button>` を追加。
  - `ACTS.openFxDebug`、`openFxDebugModal`、`renderFxDebugArena`、`renderFxDebugControls` および `fxDbg*` 全アクションの先頭で `if (!IS_DEV_BUILD) return;` をチェックし、本番ビルド（`IS_DEV_BUILD === false`）ではボタンが描画されず、関数を直接呼んでもモーダルが開かない構造とした。
- **モーダル内の3要素**:
  1. **確認用ミニアリーナ（上部 sticky、`#fxd-sticky` / `#fxd-arena`）**:
     - `#fxd-arena` 内に `#fxd-layer`（`.fx-layer`）、勇者（`#fxd-player` / `#fxd-spr-player`）、敵（`#fxd-enemy` / `#fxd-spr-enemy` / `#fxd-ename`）を配置し、実戦闘のDOM ID（`#arena`, `#fx-layer`, `#f-player`, `#f-enemy`, `#b-ename`）と一切衝突しない。
     - `.fxd-sticky`（`position: sticky; top: -18px; z-index: 10`）により、下のスキルボタン一覧をスクロールしても常にモーダル上部にミニアリーナが見えたまま確認できる。
  2. **操作パネル（`#fxd-ctrl`）**:
     - **速度**: `×1` / `×2` / `×4`（`_fxDbgState.speed` のみを変更し、実戦闘の `G.opts.speed` は書き換えない）。
     - **敵の切替**: `雑魚`（モスライム） / `ボス(O)`（終焉神ニヒル、激昂ON時は終焉神ニヒル・真）。
     - **激昂**: `激昂表示：ON / OFF`（色味フィルター `hue-rotate(140deg) saturate(1.6)`・脈動オーラ `.rage-aura`・赤ビネット `.rage-active`・名前色 `.rage-name`）と、`激昂の瞬間を再生`（赤い閃光＋拡大・ぶれ `.rage-burst`）。
     - **演出を止める**: 再生中のスキルエフェクト、激昂表示、バフオーラを即座にリセット・消去。
     - **バフオーラ**: `なし` / `攻撃`（赤橙） / `防御`（青） / `全能力`（金）。
  3. **分類別スキルボタン一覧（`#fxd-skills`）**:
     - 5分類（`⚔️ 斬撃（剣系）` 6種、`✨ 魔法（攻撃魔法）` 8種、`💥 大技・奥義` 8種、`💚 回復` 10種、`🛡️ 強化（バフ）` 10種）の見出しの下に `SK_ORDER` の全42スキルを漏れ・重複なく配置。
     - ボタンを押すと本来のヒット数（`(SK[id] && SK[id].hits) || 1`）で `playSkillFx(id, hits, fxDebugTarget())` を呼び出す。

## 2. 演出関数の最小限リファクタ内容
- Q1 で作成した `playSkillFx(id, hitCount, target)`、`triggerRageFx(target)`、`syncBuffAura(target)`、`clearSkillFxLayer(target)`、`clearRageFx(target)`、`clearAllBattleFx(target)` に省略可能な第3引数（または第1引数）`target` を追加。
- `resolveFxTarget(target)` ヘルパーにより、`target` 省略時は従来どおり実戦闘の要素（`#arena`, `#fx-layer`, `#f-player`, `#f-enemy`, `#b-ename`, `_battleFxCtx`, `G.opts.speed`）を返し、`fxDebugTarget()` が渡されたときは確認用ミニアリーナの要素（`#fxd-arena`, `#fxd-layer`, `#fxd-player`, `#fxd-enemy`, `#fxd-ename`, `_fxDbgState`, `_fxDbgState.speed`, `forceFx: true`）を返す。
- これにより、実戦闘の演出コードと確認用アリーナの演出コードを100%共通化しつつ、実戦闘のタイマー・DOM・設定（`G.opts.fx` が OFF でも確認パネル内は `forceFx: true` で再生、`prefers-reduced-motion` は尊重して注記を表示）と完全に分離した。
- `closeModal()` 時に `#fxd-arena` が存在すれば `clearAllBattleFx(fxDebugTarget())` を実行し、タイマー・演出要素・クラスを完全に消去する。
