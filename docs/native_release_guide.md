# Android アプリ化ガイド（Capacitor・広告と課金あり）

`docs/play_release_guide.md` の TWA（PWABuilder）方式は**やめて**、この方式にする（広告 AdMob は TWA で使えないため）。
ドメイン検証（assetlinks.json）も不要になる。申告・ストア文面・画像は play_release_guide.md の §4〜§5 を使う（広告あり・アプリ内課金ありに読み替え。後述）。

## 仕組み
- ゲーム本体は今のまま（`index.html`）。`native/` が Android 用の包み（Capacitor）。
- 課金: `cordova-plugin-purchase`（Google Play Billing・買い切り）。広告: `@capacitor-community/admob`（リワード）。
- コード側の窓口は `src/js/69_monet.js`。ウェブ版は課金も広告もなし（倍速は従来どおり全部使える）。アプリ版だけ ×4 に鍵がつく（×2は無料）。購入画面は街の施設「💎プレミアム売店」（×4の鍵つきボタンからも開く）。
- ビルドは GitHub Actions（`.github/workflows/android.yml`）が AAB を作る。**未検証**（この環境では実行不可）。初回は失敗する可能性が高いので、ログを見せてほしい。直す。
- **ブラウザ版（本番）は課金・広告が一切出ない**（×4も無料）。課金・広告はネイティブアプリ（Capacitor）だけ。
- テスト版（/dev/）だけ、URL に `?monet=mock` を付けるとアプリ版相当（×4の鍵・購入・広告の疑似表示）を試せる（本番ビルドでは無効）。例: https://tomorekey.github.io/rogue-demo/dev/?monet=mock

## あなたがやること（順番）
1. **Play デベロッパー登録**（$25）と本人確認。
2. **AdMob に登録** → アプリを追加（Android）→ **アプリID**（`ca-app-pub-…~…`）と、**リワード広告ユニットID**（`ca-app-pub-…/…`）を控える。
3. **署名キーを作る**（紛失厳禁。2か所に保管）:
   ```
   keytool -genkeypair -v -keystore release.keystore -alias kanenari -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 release.keystore   # ← これを GitHub のシークレットに入れる
   ```
4. **GitHub のシークレット登録**（リポジトリ Settings → Secrets and variables → Actions）:
   `ANDROID_KEYSTORE_BASE64` / `ANDROID_KEYSTORE_PASSWORD` / `ANDROID_KEY_ALIAS`（kanenari）/ `ANDROID_KEY_PASSWORD` / `ADMOB_APP_ID`
5. **Play Console でアプリを作成**（パッケージ名 `io.github.tomorekey.kanenari`。変える場合は `native/capacitor.config.json` も）。
6. **アプリ内アイテムを作成**（収益化 → 商品 → アプリ内アイテム。**ID はこのとおり**、種類は「管理対象（買い切り）」、状態は有効）:
   | 商品ID | 名前 | 説明 |
   |---|---|---|
   | `speed4` | 4倍速 | 戦闘を4倍の速さで進められます（**500円**） |
   | `adfree` | 広告スキップ | リワード広告を見ずに報酬を受け取れます（**300円**） |
   | `bundle` | お得セット | 4倍速と広告スキップのセット（**700円**） |
   `speed4` は **500円**（2倍速は無料）。`bundle`（セット）は **700円**。`adfree`（広告スキップ単体）は **300円**。Play Console で円建てに設定。
7. **広告ユニットIDをコードに入れる**（Claude に ID を渡す）: `src/js/69_monet.js` の `MONET_AD_UNIT_REWARDED` を本番IDに、`MONET_AD_TESTING` を `false` にする。**テスト中は Google のテストIDのまま**でよい（自分の広告を自分で押すとAdMobの規約違反になるため）。
8. 本番（main）へ公開してから、Actions → **Build Android** → Run workflow（ref=main、versionCode=1）。成果物 `kanenari-aab` をダウンロード。
9. Play Console の**内部テスト**にアップロード → テスターに自分のGoogleアカウントを追加 →「ライセンステスト」に同じアカウントを登録（テスト購入が無料になる）。
10. 実機で確認: 起動 / 倍速の鍵と購入（テスト購入）/ 購入復元 / リワード広告（テスト広告）/ しずく+1 / セーブ。
11. データセーフティ等を申告 → クローズドテスト → 製品版。versionCode は申請のたびに +1。

## Play Console の申告（TWA版から変更点）
- **広告を含む**: はい（AdMob・リワード）。
- **アプリ内購入**: あり（買い切り3点（4倍速・広告スキップ・セット））。ガチャは**現金購入なし**（しずくは広告・プレイのみ）。
- **データセーフティ**: 追加で「端末またはその他のID（広告ID）」「購入履歴」を、広告・不正対策の目的で第三者（Google）と共有、と申告。匿名の利用状況・ニックネーム（ランキング）は従来どおり。
- **ターゲット年齢**: 13歳以上（広告を出すため）。13歳未満を含めるなら、ファミリー向け認定の広告設定が必要になるので避ける。
- **同意（EEA/UK 等）**: 欧州向け配信をするなら、AdMob の同意フォーム（UMP）が必要。まずは**日本のみ配信**にして後回しにできる。
- プライバシーポリシー（`privacy.html`）は広告・購入に対応済み。**連絡先メールの記入が必要**。

## 既知の注意
- セットを買うと4倍速と広告スキップの両方が有効になる。どちらかを既に持っている人にはセットを出さない（二重払い防止）。
- 購入状況は端末内のセーブにも保存し、起動時に Google Play の所有状況で補う。端末を変えたら「購入を復元」。
- 4倍速の課金は、アプリ版だけの機能。ウェブ版（ブラウザ/PWA）は無料のまま。気にするなら、ウェブ版でも鍵をつける案もある（要相談）。
- 広告ボタンはくじ画面（しずく+1、1日3回）と限定ダンジョン（回数+1、1日1回）にある。回数は `AD_CFG`（`src/js/69_monet.js`）。
