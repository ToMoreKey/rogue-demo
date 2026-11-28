#!/usr/bin/env python3
"""cap add android で生成された Android プロジェクトに、AdMob アプリID・課金権限・バージョン・署名を入れる。
  python3 tools/patch_android.py <androidフォルダ>   （環境変数は .github/workflows/android.yml 参照）"""
import base64, os, re, sys
d = sys.argv[1]
man = os.path.join(d, 'app/src/main/AndroidManifest.xml')
s = open(man, encoding='utf-8').read()
admob = os.environ.get('ADMOB_APP_ID') or 'ca-app-pub-3940256099942544~3347511713'   # 未設定ならGoogleのテスト用アプリID
if 'com.google.android.gms.ads.APPLICATION_ID' not in s:
    s = s.replace('</application>', f'    <meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="{admob}"/>\n    </application>')
if 'com.android.vending.BILLING' not in s:
    s = s.replace('</manifest>', '    <uses-permission android:name="com.android.vending.BILLING"/>\n</manifest>')
open(man, 'w', encoding='utf-8').write(s)
ks = os.environ.get('KS_B64')
if ks:
    open(os.path.join(d, 'app/release.keystore'), 'wb').write(base64.b64decode(ks))
g = os.path.join(d, 'app/build.gradle')
t = open(g, encoding='utf-8').read()
t = re.sub(r'versionCode \d+', f"versionCode {os.environ.get('VCODE', '1')}", t)
t = re.sub(r'versionName "[^"]*"', f"versionName \"{os.environ.get('VNAME', '1.0.0')}\"", t)
if ks and 'signingConfigs' not in t:
    sign = ('    signingConfigs {\n        release {\n            storeFile file("release.keystore")\n'
            f'            storePassword "{os.environ["KS_PASS"]}"\n            keyAlias "{os.environ["KEY_ALIAS"]}"\n            keyPassword "{os.environ["KEY_PASS"]}"\n        }}\n    }}\n')
    t = t.replace('    buildTypes {', sign + '    buildTypes {', 1)
    t = t.replace('        release {\n            minifyEnabled', '        release {\n            signingConfig signingConfigs.release\n            minifyEnabled', 1)
open(g, 'w', encoding='utf-8').write(t)
print('patched', d)
