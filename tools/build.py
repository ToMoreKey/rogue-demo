#!/usr/bin/env python3
"""src/ から単一の index.html を生成する。標準ライブラリのみ。

使い方: python3 tools/build.py [出力先(省略時 index.html)]

結合順は下の JS_ORDER が正本。ファイルを足したらここへ追記する。
  data/    … 数値・定義データ（ダンジョン、敵、装備、スキル、TUNE など）
  assets/  … base64画像などの埋め込みデータ（中身は書き換えない）
  js/      … ロジック
"""
import os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'src')

# ゲーム全体は 1 つの IIFE。00_util.js が開き、80_boot.js が閉じる。
JS_ORDER = [
    'js/00_util.js',
    'data/config.js',
    'data/items.js',
    'assets/item_icons.js',
    'data/skills.js',
    'data/dungeons.js',
    'data/tower.js',
    'data/abyss.js',
    'data/ranking.js',
    'data/dex.js',
    'data/achievements.js',
    'assets/enemy_images.js',
    'assets/char_skins.js',
    'data/skins.js',
    'data/sprites.js',
    'js/10_art.js',
    'js/20_state.js',
    'js/30_save.js',
    'js/40_game.js',
    'js/50_acts.js',
    'js/60_render.js',
    'js/70_tutorial.js',
    'js/80_boot.js',
]
CSS_ORDER = ['css/main.css']


def read(rel):
    with open(os.path.join(SRC, rel), encoding='utf-8', newline='') as f:
        return f.read().replace('\r\n', '\n')


def build():
    tpl = read('index.template.html')
    for ph in ('{{CSS}}', '{{JS}}'):
        if tpl.count(ph) != 1:
            sys.exit('template に %s が1つだけ必要です' % ph)
    # 未登録ファイルの検出（足し忘れ防止）
    listed = set(JS_ORDER + CSS_ORDER + ['index.template.html'])
    for dp, _, fs in os.walk(SRC):
        for fn in fs:
            rel = os.path.relpath(os.path.join(dp, fn), SRC).replace(os.sep, '/')
            if rel not in listed:
                sys.exit('src/%s が build.py の JS_ORDER/CSS_ORDER に未登録です' % rel)
    css = ''.join(read(p) for p in CSS_ORDER)
    js = ''.join(read(p) for p in JS_ORDER)
    # str.replace は置換文字列を解釈しないので、base64やバックスラッシュも安全
    return tpl.replace('{{CSS}}', css.rstrip('\n')).replace('{{JS}}', js.rstrip('\n'))


def main():
    out = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html')
    html = build()
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print('built %s (%d bytes)' % (out, len(html.encode('utf-8'))))


if __name__ == '__main__':
    main()
