#!/usr/bin/env python3
"""Googleフォームの不具合報告（スプレッドシートをCSVで書き出したもの）から、対策リスト docs/bug_triage.md を作る。

使い方:
  python3 tools/make_bug_report.py 回答.csv            # docs/bug_triage.md を作る（前回までの分は除く）
  python3 tools/make_bug_report.py 回答.csv --all      # 前回までの分も含める
  python3 tools/make_bug_report.py 回答.csv --dev      # テスト版（build=dev）の報告も同じ表に含める

CSVの列順: 1列目=タイムスタンプ、2列目=種類、3列目=内容、4列目=診断情報（フォームの質問順）。
- 診断情報は `キー=値` を `;` で区切った1行（例: build=prod; ver=rogue-v34; vp=390x844; ua=Chrome/130 Android; lv=12; dg=C; fl=3; view=dungeon; err=TypeError: x is undefined@70_tutorial.js:42）
- 内容が空・短すぎるもの、URL・禁止語を含むもの、500文字を超えるものは除く
- 同じ内容（空白と記号を除いて一致）は1件にまとめ、件数を数える
- 種類（不具合/バランス/要望/その他）と、画面エラーの有無から、優先度の目安（高・中・低）を付ける
標準ライブラリだけで動く。
"""
import csv, json, os, re, sys, hashlib, datetime, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KINDS = ['不具合', 'バランス', '要望', 'その他']
MAX_LEN = 500
MIN_LEN = 5


def load_block():
    p = os.path.join(ROOT, 'tools', 'ranking_blocklist.txt')
    if not os.path.exists(p):
        return []
    return [w.strip().lower() for w in open(p, encoding='utf-8') if w.strip() and not w.startswith('#')]


def parse_diag(s):
    d = {}
    for part in (s or '').split(';'):
        if '=' in part:
            k, v = part.split('=', 1)
            d[k.strip()] = v.strip()
    return d


def norm(s):
    return re.sub(r'[\s\W_]+', '', (s or '').lower())


def clean_kind(s):
    s = (s or '').strip()
    for k in KINDS:
        if k in s:
            return k
    return 'その他'


def ok_text(s, block):
    s = re.sub(r'[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]', '', (s or '')).strip()
    if len(s) < MIN_LEN or len(s) > MAX_LEN:
        return None
    low = s.lower()
    if re.search(r'https?:|www\.', low):
        return None
    if any(w in low for w in block):
        return None
    return s


def priority(kind, diag, count):
    if kind == '不具合' and (diag.get('err') or count >= 2):
        return '高'
    if kind == '不具合' or count >= 2:
        return '中'
    return '低'


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    include_all = '--all' in sys.argv
    include_dev = '--dev' in sys.argv
    seen_path = os.path.join(ROOT, 'data', 'bug_seen.json')
    seen = set(json.load(open(seen_path, encoding='utf-8'))) if os.path.exists(seen_path) and not include_all else set()
    block = load_block()
    rows = list(csv.reader(open(args[0], encoding='utf-8-sig', newline='')))[1:]
    groups = collections.OrderedDict()
    dropped = 0
    new_ids = []
    for r in rows:
        if len(r) < 3:
            dropped += 1
            continue
        ts, kind, text = r[0], clean_kind(r[1]), ok_text(r[2], block)
        diag = parse_diag(r[3] if len(r) > 3 else '')
        rid = hashlib.sha1(('|'.join(r[:4])).encode('utf-8')).hexdigest()[:12]
        if rid in seen:
            continue
        new_ids.append(rid)
        if text is None:
            dropped += 1
            continue
        if diag.get('build') == 'dev' and not include_dev:
            continue
        key = norm(text)
        g = groups.setdefault(key, {'kind': kind, 'text': text, 'items': []})
        g['items'].append({'ts': ts, 'diag': diag})
    out = ['# 不具合報告 対策リスト', '', '作成: ' + datetime.date.today().isoformat() + '（`tools/make_bug_report.py`）。',
           '採用する項目を決めて、まとめて修正する。', '']
    items = []
    for g in groups.values():
        n = len(g['items'])
        diag = next((i['diag'] for i in g['items'] if i['diag'].get('err')), g['items'][0]['diag'])
        items.append((priority(g['kind'], diag, n), n, g, diag))
    order = {'高': 0, '中': 1, '低': 2}
    items.sort(key=lambda x: (order[x[0]], -x[1]))
    out += ['| # | 優先度 | 種類 | 件数 | 内容 | 版 | 画面・場所 | 画面エラー | 採用 |', '|---|---|---|---|---|---|---|---|---|']
    for i, (p, n, g, d) in enumerate(items, 1):
        where = ' '.join(x for x in (d.get('view', ''), d.get('dg', ''), ('F' + d['fl']) if d.get('fl') else '', ('Lv' + d['lv']) if d.get('lv') else '') if x)
        text = g['text'].replace('|', '／').replace('\n', ' ')
        out.append(f"| {i} | {p} | {g['kind']} | {n} | {text} | {d.get('ver', '')} | {where} | {d.get('err', '')} | |")
    out += ['', f'集計: {len(items)}件（同じ内容は1件にまとめ済み）、除外 {dropped}件（短すぎる・長すぎる・URL・禁止語・列不足）。']
    open(os.path.join(ROOT, 'docs', 'bug_triage.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    if not include_all:
        os.makedirs(os.path.dirname(seen_path), exist_ok=True)
        json.dump(sorted(seen | set(new_ids)), open(seen_path, 'w', encoding='utf-8'), indent=0)
    print(f'docs/bug_triage.md を作りました: {len(items)}件（除外 {dropped}件）')


if __name__ == '__main__':
    main()
