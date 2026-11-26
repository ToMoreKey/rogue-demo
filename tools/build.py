#!/usr/bin/env python3
"""src/ から単一の index.html を生成する。標準ライブラリのみ。

使い方: python3 tools/build.py [出力先(省略時 index.html)] [--variant prod|dev]
  prod(既定): 本番ビルド。リポジトリの index.html はこれ。
  dev: テスト版ビルド。セーブ等のキーを本番と分け、ランキング送信を無効にし、画面に「TEST版」を出す。

結合順は下の JS_ORDER が正本。ファイルを足したらここへ追記する。
  data/    … 数値・定義データ（ダンジョン、敵、装備、スキル、TUNE など）
  assets/  … base64画像などの埋め込みデータ（中身は書き換えない）
  js/      … ロジック
"""
import os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SRC = os.path.join(ROOT, 'src')

# ゲーム全体は 1 つの IIFE。00_util.js が開き、80_boot.js が閉じる。
JS_ORDER = [
    'js/00_util.js',
    'data/config.js',
    'data/items.js',
    'assets/item_icons.js',
    'data/skills.js',
    'data/char_trees.js',
    'data/dungeons.js',
    'data/tower.js',
    'data/abyss.js',
    'data/ranking.js',
    'data/bugreport.js',
    'data/analytics.js',
    'data/dex.js',
    'data/achievements.js',
    'assets/enemy_images.js',
    'assets/char_skins.js',
    'data/skins.js',
    'data/sprites.js',
    'js/10_art.js',
    'js/20_state.js',
    'js/30_save.js',
    'js/35_backup.js',
    'js/36_bugreport.js',
    'js/37_analytics.js',
    'js/40_game.js',
    'js/50_acts.js',
    'js/60_render.js',
    'js/61_fx_custom.js',
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
    sw_txt = open(os.path.join(ROOT, 'sw.js'), encoding='utf-8').read()
    m_cache = re.search(r"const CACHE = '([^']+)';", sw_txt)
    if not m_cache:
        sys.exit('sw.js の CACHE が見つかりません')
    js, n_ver = re.subn(r"const APP_VERSION = '[^']*';", f"const APP_VERSION = '{m_cache.group(1)}';", js)
    if n_ver != 1:
        sys.exit('APP_VERSION の置換が1箇所ではありません（%d）' % n_ver)
    # str.replace は置換文字列を解釈しないので、base64やバックスラッシュも安全
    return tpl.replace('{{CSS}}', css.rstrip('\n')).replace('{{JS}}', js.rstrip('\n'))


def sub_once(html, old, new):
    if html.count(old) != 1:
        sys.exit('dev ビルド: %r が1つだけ見つかる必要があります（%d 個）' % (old, html.count(old)))
    return html.replace(old, new)


DEV_CSS = ('#dev-badge{position:fixed;top:env(safe-area-inset-top,0px);right:env(safe-area-inset-right,0px);'
           'z-index:99999;padding:0 8px;background:#ff8a00;color:#000;font:700 10px/1.45 sans-serif;'
           'letter-spacing:.08em;border-radius:0 0 0 8px;pointer-events:none;opacity:.92}')


def to_dev(html):
    """本番ビルドの文字列から、テスト版ビルドを作る。置換は各1箇所を必須にする。"""
    html = sub_once(html, "const SAVE_KEY = 'rogue_test_save_v1';", "const SAVE_KEY = 'rogue_dev_save_v1';")
    html = sub_once(html, "const BACKUP_META_KEY = 'rogue_backup_meta_v1';", "const BACKUP_META_KEY = 'rogue_dev_backup_meta_v1';")
    html = sub_once(html, "const IDB_BACKUP_NAME = 'rogue_backup_db_v1';", "const IDB_BACKUP_NAME = 'rogue_dev_backup_db_v1';")
    html = sub_once(html, "const IS_DEV_BUILD = false;", "const IS_DEV_BUILD = true;")
    html, n_av = re.subn(r"const APP_VERSION = 'rogue-(v\d+)';", r"const APP_VERSION = 'rogue-dev-\1';", html)
    if n_av != 1:
        sys.exit('dev ビルド: APP_VERSION の置換が1箇所ではありません（%d）' % n_av)
    html = sub_once(html, "queueKey: 'rogue_bugreport_queue_v1'", "queueKey: 'rogue_dev_bugreport_queue_v1'")
    html = sub_once(html, "rateKey: 'rogue_bugreport_last_v1'", "rateKey: 'rogue_dev_bugreport_last_v1'")
    html, n_an_u = re.subn(r"(const ANALYTICS_CFG = \{\s*reportUrl:\s*)'[^']*'", r"\1''", html)
    html, n_an_e = re.subn(r"(entryStats:\s*)'[^']*'", r"\1''", html)
    if n_an_u != 1 or n_an_e != 1:
        sys.exit('dev ビルド: ANALYTICS_CFG の置換が1箇所ではありません（%d, %d）' % (n_an_u, n_an_e))
    html = sub_once(html, "anonIdKey: 'rogue_anon_id_v1'", "anonIdKey: 'rogue_dev_anon_id_v1'")
    html = sub_once(html, "lastSentKey: 'rogue_stats_last_v1'", "lastSentKey: 'rogue_dev_stats_last_v1'")
    html = sub_once(html, "launchKey: 'rogue_stats_launch_v1'", "launchKey: 'rogue_dev_stats_launch_v1'")
    html = sub_once(html, "playSecKey: 'rogue_stats_playsec_v1'", "playSecKey: 'rogue_dev_stats_playsec_v1'")
    html = sub_once(html, "optOutKey: 'rogue_stats_optout_v1'", "optOutKey: 'rogue_dev_stats_optout_v1'")
    html = sub_once(html, "const TUT_SAVE_KEY = 'rogue_tut_done_v1';", "const TUT_SAVE_KEY = 'rogue_dev_tut_done_v1';")
    html = sub_once(html, "cacheKey: 'rogue_ranking_cache_v1'", "cacheKey: 'rogue_dev_ranking_cache_v1'")
    # ランキング送信を無効化（フォームURLを空にする。表示は data/ranking.json の読み取りのみ）
    html, n = re.subn(r"formUrl: '[^']*'", "formUrl: ''", html)
    if n != 1:
        sys.exit('dev ビルド: formUrl の置換が1箇所ではありません（%d）' % n)
    html = sub_once(html, '<title>rogue_test</title>', '<title>[TEST] rogue_test</title>')
    html = sub_once(html, '</style>\n\n<div id="app"', DEV_CSS + '</style>\n\n<div id="dev-badge" aria-hidden="true">TEST版</div>\n<div id="app"')
    return html


def main():
    args = sys.argv[1:]
    variant = 'prod'
    if '--variant' in args:
        i = args.index('--variant')
        variant = args[i + 1] if i + 1 < len(args) else ''
        del args[i:i + 2]
    if variant not in ('prod', 'dev'):
        sys.exit('--variant は prod か dev')
    out = os.path.abspath(args[0]) if args else os.path.join(ROOT, 'index.html')
    html = build()
    if variant == 'dev':
        html = to_dev(html)
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print('built %s (%d bytes)' % (out, len(html.encode('utf-8'))))


if __name__ == '__main__':
    main()
