#!/usr/bin/env python3
"""Googleフォームの回答（スプレッドシートをCSVで書き出したもの）から data/ranking.json を作る。

使い方:
  python3 tools/make_ranking.py 回答.csv            # data/ranking.json を上書き
  python3 tools/make_ranking.py 回答.csv --top 50   # 保存する件数（既定50。ゲームは上位20を表示）

CSVの列順: 1列目=タイムスタンプ、2列目=ニックネーム、3列目=到達階（フォームの質問順）。
- 到達階は 1〜500 の整数だけを採用（それ以外は捨てる）
- ニックネームは前後の空白を除き、12文字まで。制御文字・URLを含むもの、禁止語（tools/ranking_blocklist.txt）を含むものは捨てる
- 同じニックネームは最高記録の1件だけ残す（同じ階なら先に送られたほう）
標準ライブラリだけで動く。
"""
import csv, json, re, sys, os, datetime

MAX_FLOOR = 500
NAME_MAX = 12
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_blocklist():
    p = os.path.join(ROOT, 'tools', 'ranking_blocklist.txt')
    if not os.path.exists(p):
        return []
    return [w.strip().lower() for w in open(p, encoding='utf-8') if w.strip() and not w.startswith('#')]


def clean_name(s, block):
    s = re.sub(r'[\u0000-\u001f\u007f​-‏‪-‮⁠﻿]', '', (s or '')).strip()
    if not s or len(s) > NAME_MAX:
        return None
    low = s.lower()
    if re.search(r'https?:|www\.|\.com|\.jp|@', low):
        return None
    if any(w in low for w in block):
        return None
    return s


def parse_date(ts):
    m = re.match(r'(\d{4})[/-](\d{1,2})[/-](\d{1,2})', (ts or '').strip())
    return f'{int(m[1]):04d}-{int(m[2]):02d}-{int(m[3]):02d}' if m else ''


def main(argv):
    if not argv or argv[0].startswith('-'):
        print(__doc__); return 1
    src = argv[0]
    top = 50
    if '--top' in argv:
        top = int(argv[argv.index('--top') + 1])
    out = os.path.join(ROOT, 'data', 'ranking.json')
    if '--out' in argv:
        out = argv[argv.index('--out') + 1]
    block = load_blocklist()
    best = {}
    seen = dropped = 0
    with open(src, encoding='utf-8-sig', newline='') as f:
        rows = list(csv.reader(f))
    for i, r in enumerate(rows):
        if len(r) < 3:
            continue
        ts, name, fl = r[0], r[1], r[2].strip()
        if i == 0 and not re.fullmatch(r'\d+', fl):
            continue  # ヘッダー行
        seen += 1
        name = clean_name(name, block)
        try:
            floor = int(re.sub(r'[^\d]', '', fl) or 0) if re.fullmatch(r'[\d\s,階Ff]+', fl) else 0
        except ValueError:
            floor = 0
        if not name or not (1 <= floor <= MAX_FLOOR):
            dropped += 1
            continue
        key = name.lower()
        cur = best.get(key)
        if cur is None or floor > cur['floor']:
            best[key] = {'name': name, 'floor': floor, 'date': parse_date(ts), '_i': i}
    entries = sorted(best.values(), key=lambda e: (-e['floor'], e['_i']))[:top]
    for e in entries:
        e.pop('_i')
    data = {'updated': datetime.date.today().isoformat(), 'entries': entries}
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write('\n')
    print(f'読み込み {seen}件 / 除外 {dropped}件 / 掲載 {len(entries)}件 -> {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
