#!/usr/bin/env python3
"""公開用サイトを組み立てる（GitHub Actions から使う）。標準ライブラリのみ。

  python3 tools/make_site.py --main <mainのチェックアウト> --dev <devのチェックアウト> --out <出力先>

  出力先/        … 本番（main の公開ファイルをそのまま）
  出力先/dev/    … テスト版（dev をテスト版ビルドしたもの。セーブ・キャッシュ名・ランキングを本番と分ける）
"""
import argparse, json, os, re, shutil, subprocess, sys

FILES = ['index.html', 'manifest.json', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
         'apple-touch-icon.png', 'favicon-32.png', '.nojekyll']


def copy_common(src, dst):
    for f in FILES:
        sp = os.path.join(src, f)
        if os.path.exists(sp):
            shutil.copy2(sp, os.path.join(dst, f))
    os.makedirs(os.path.join(dst, 'data'), exist_ok=True)
    rk = os.path.join(src, 'data', 'ranking.json')
    if os.path.exists(rk):
        shutil.copy2(rk, os.path.join(dst, 'data', 'ranking.json'))


def make_dev(dev_src, dst):
    os.makedirs(dst, exist_ok=True)
    copy_common(dev_src, dst)
    # テスト版ビルド（dev 側の build.py を使う）
    subprocess.check_call([sys.executable, os.path.join(dev_src, 'tools', 'build.py'),
                           os.path.join(dst, 'index.html'), '--variant', 'dev'])
    # Service Worker のキャッシュ名を本番と分ける
    p = os.path.join(dst, 'sw.js')
    s = open(p, encoding='utf-8').read()
    s, n = re.subn(r"const CACHE = 'rogue-(v\d+)';", r"const CACHE = 'rogue-dev-\1';", s)
    if n != 1:
        sys.exit('sw.js の CACHE が見つかりません')
    open(p, 'w', encoding='utf-8', newline='\n').write(s)
    # manifest を別アプリ扱いにする（ホーム画面に本番とテスト版を両方入れられる）
    p = os.path.join(dst, 'manifest.json')
    m = json.load(open(p, encoding='utf-8'))
    m['name'] = 'Rogue Demo (TEST)'
    m['short_name'] = 'Rogue TEST'
    m['description'] = '【テスト版】' + m.get('description', '')
    json.dump(m, open(p, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--main', required=True)
    ap.add_argument('--dev', required=True)
    ap.add_argument('--out', required=True)
    a = ap.parse_args()
    if os.path.exists(a.out):
        shutil.rmtree(a.out)
    os.makedirs(a.out)
    copy_common(a.main, a.out)
    make_dev(a.dev, os.path.join(a.out, 'dev'))
    print('site built:', a.out)


if __name__ == '__main__':
    main()
