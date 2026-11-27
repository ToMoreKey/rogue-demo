# Q4-3 1-C サウンド
- `src/js/38_audio.js`: WebAudio 合成（外部音源なし）。SE約20種（クリック/攻撃/クリティカル/被弾/回復/バフ/撃破/ボス撃破/レベルアップ/ドロップ(レア度で音階)/装備↑↓/売却/購入/勝利/敗北/撤退/エラー）。
- 簡易BGM（街/ダンジョン/ボス/塔のループ）。**BGM既定OFF・SE既定ON(小音量)**。
- 設定: ステータス>データ「効果音/BGM」ON/OFF＋音量(小/中/大)。opts(se, seVol, bgm, bgmVol)に保存。
- 配慮: 最初の操作まで AudioContext を作らない／非表示時は停止／同種SEは50ms間引き／G.headless(BOT)は無音。
- テスト: tools/test_q4_sound.py（Sound.calls の履歴とAudioContext生成数で検証）。sw: rogue-v73。
