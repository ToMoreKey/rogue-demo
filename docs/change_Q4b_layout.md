# Q4-2B 小画面・横向きレイアウト
- 高さ640px以下: HUD・戦闘ヘッダ・ログを圧縮し、撤退ボタンがナビに隠れないように。
- 高さ480px以下の横向き: 戦闘画面を2列グリッド化（HUD非表示）。
- 新規 `tools/audit_layout.py`（8解像度×15画面の自動検査）/ `tools/test_q4_layout.py`。
- `docs/checklist_device.md` を追加。sw: rogue-v66。
