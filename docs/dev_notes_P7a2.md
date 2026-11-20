# P7a-2 パッシブ反映と再調整 実装メモ

## 1. 反映した5つのパッシブと計算式（変更前 → 変更後）

| 対象 | 箇所 | 変更前 | 変更後 |
|---|---|---|---|
| `sword15` (+15%) / `warrior10` (+30%) / `hero10` (+25%) | `src/js/20_state.js` (`playerAtk`) | `Math.round((baseAtk(p) + weaponAtk(p.weapon)) * (p.mastery ? masteryBonus(p).atkMult : 1) * (G.run && G.run.tower ? towerEff(G.run).atkMult : 1))` | `Math.round((baseAtk(p) + weaponAtk(p.weapon)) * (p.passiveSkills ? passiveBonus(p).atkMult : 1) * (p.mastery ? masteryBonus(p).atkMult : 1) * (G.run && G.run.tower ? towerEff(G.run).atkMult : 1))` |
| `mage10` (MP消費-20%) | `src/js/20_state.js` (`skillMpCost`) / `src/js/40_game.js` (`canUse`, `useSkillEffect`, `playerAct`) / `src/js/60_render.js` | `s.mp`（または `SK[id].mp`）を直接参照・減算・表示 | `skillMpCost(p, s) = Math.max(1, Math.round(s.mp * (p && p.passiveSkills ? passiveBonus(p).mpCostMult : 1)))` を判定・消費・全UI表示に使用 |
| `cleric10` (スキル回復+50%) | `src/js/40_game.js` (`useSkillEffect`) | `Math.max(1, Math.round(maxHp(p) * s.pct * te.healMult * pb.healMult * (ae ? ae.healMult : 1)))` | `Math.max(1, Math.round(maxHp(p) * s.pct * te.healMult * psb.healMult * pb.healMult * (ae ? ae.healMult : 1)))`（`psb = p.passiveSkills ? passiveBonus(p) : { healMult: 1 }`、ポーションは対象外） |
| `hero10` 説明文 | `src/data/skills.js` (`hero` 枠 SP10) | `desc: 'パッシブ：全ステータスが25%上昇'` | `desc: 'パッシブ：攻撃・最大HP・最大MPが25%上昇'`（防御力には効かせない） |

---

## 2. `TUNE` の変更前 → 変更後（`src/data/config.js`）

| キー | 変更前 | 変更後 | 備考 |
|---|---|---|---|
| `hpScale` | `1` | `1.35` | 敵HP一括倍率 |
| `atkScale` | `1` | `1.02` | 敵ATK一括倍率 |
| `bossHp` | `2.2` | `2.5` | ボスHP一括倍率 |
| `bossAtk` | `1.25` | `1.4` | ボスATK一括倍率 |
| その他 (`floorSpan`, `atkExp`, `defScale`, `bossDef`, `expScale`, `goldScale`, `floorRegen`) | 変更なし | 変更なし | — |

---

## 3. BOT のパッシブ取得状況（`tools/bot.py`）
- **本編周回BOT（`loop`）**: `A('life',3); A('sword',20); A('life',20); A('magic',20); A('hero',10); A('warrior',10); A('cleric',10); A('mage',10); ...` により7種すべてのパッシブを取得。
- **回廊BOT（`tower`）**: `sword/magic/life` 各30、`warrior/mage/cleric/hero` 各20（標準）/30（強化）を割り振り、7種すべてを取得。
- **深淵BOT（`abyss`）**: 同上、7種すべてを取得。

---

## 4. 要確認事項
- `TUNE` のみでの一括調整では、序盤（パッシブ取得前）と終盤（`sword15`+`warrior10`+`hero10` で攻撃力約1.87倍後）の双方に同じ倍率が掛かるため、本編周回BOTのラン数（基準 490〜493 に対し 492〜508）・`model_hours`（基準 20.85〜20.94 に対し 20.89〜21.15）・`ticksPerFloor`（基準 4.06〜4.13 に対し 3.82〜4.08）、および回廊BOTのランダムseed（基準 51/53/59 に対し 49/59/56）にわずかなズレが残る（深淵BOT・回廊最適seedは基準範囲内に収束）。
- `sw.js`: `CACHE` を `'rogue-v25'` → `'rogue-v26'` に更新。
