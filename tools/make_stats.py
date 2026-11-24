#!/usr/bin/env python3
"""Googleフォームの利用状況CSV（1列目=タイムスタンプ、2列目=記録）から docs/stats_report.md を生成する。

使い方:
  python3 tools/make_stats.py 回答.csv [--out docs/stats_report.md]
標準ライブラリのみ。
"""
import collections
import csv
import datetime
import os
import re
import statistics
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DUNGEON_IDS = list('ABCDEFGHIJKLMNO')
LV_BANDS = [
    ('Lv1〜10', 1, 10),
    ('Lv11〜30', 11, 30),
    ('Lv31〜60', 31, 60),
    ('Lv61〜100', 61, 100),
    ('Lv101〜140', 101, 140),
]


def parse_line(s):
    d = {}
    for part in (s or '').split(';'):
        if '=' in part:
            k, v = part.split('=', 1)
            d[k.strip()] = v.strip()
    return d


def parse_date(ts):
    ts = (ts or '').strip()
    m = re.search(r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', ts)
    if not m:
        return None
    try:
        return datetime.date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None


def to_int(v, default=0):
    try:
        return int(float(v))
    except (ValueError, TypeError):
        return default


def to_float(v, default=0.0):
    try:
        return float(v)
    except (ValueError, TypeError):
        return default


def main():
    args = sys.argv[1:]
    out_path = os.path.join(ROOT, 'docs', 'stats_report.md')
    if '--out' in args:
        i = args.index('--out')
        out_path = args[i + 1]
        del args[i:i + 2]
    if not args:
        sys.exit('使い方: python3 tools/make_stats.py 回答.csv [--out docs/stats_report.md]')
    csv_path = args[0]

    users = {}  # id -> {'first_date': date, 'last_date': date, 'last_ts': str, 'rec': dict}
    dau = collections.defaultdict(set)
    new_by_day = collections.Counter()
    total_rows = 0

    with open(csv_path, encoding='utf-8-sig', newline='') as f:
        for row_idx, row in enumerate(csv.reader(f)):
            if not row or len(row) < 2:
                continue
            ts_str, rec_str = row[0].strip(), row[1].strip()
            if row_idx == 0 and ('id=' not in rec_str):
                continue
            rec = parse_line(rec_str)
            uid = rec.get('id', '').strip()
            if not uid or not re.match(r'^[0-9a-fA-F]{8,32}$', uid):
                continue
            total_rows += 1
            dt = parse_date(ts_str) or datetime.date.today()
            dau[dt].add(uid)
            if uid not in users:
                users[uid] = {'first_date': dt, 'last_date': dt, 'last_ts': ts_str, 'rec': rec}
            else:
                if dt < users[uid]['first_date']:
                    users[uid]['first_date'] = dt
                if dt >= users[uid]['last_date']:
                    users[uid]['last_date'] = dt
                    users[uid]['last_ts'] = ts_str
                    users[uid]['rec'] = rec

    for u in users.values():
        new_by_day[u['first_date']] += 1

    total_users = len(users)
    latest_date = max(dau.keys()) if dau else datetime.date.today()

    ver_counts = collections.Counter()
    lv_counts = collections.Counter()
    dg_counts = collections.Counter()
    clears = 0
    hours_list = []
    launch_list = []
    inactive_7d = 0

    for u in users.values():
        r = u['rec']
        ver_counts[r.get('ver', 'unknown')] += 1
        lv = to_int(r.get('lv'), 1)
        for label, lo, hi in LV_BANDS:
            if lo <= lv <= hi:
                lv_counts[label] += 1
                break
        else:
            lv_counts['その他'] += 1
        dg = r.get('dg', '-')
        dg_counts[dg if dg in DUNGEON_IDS else '-'] += 1
        if to_int(r.get('clear'), 0) == 1:
            clears += 1
        hours_list.append(to_float(r.get('hours'), 0.0))
        launch_list.append(to_int(r.get('launch'), 1))
        if (latest_date - u['last_date']).days >= 7:
            inactive_7d += 1

    clear_rate = (clears / total_users * 100.0) if total_users else 0.0
    inactive_rate = (inactive_7d / total_users * 100.0) if total_users else 0.0
    avg_hours = statistics.mean(hours_list) if hours_list else 0.0
    med_hours = statistics.median(hours_list) if hours_list else 0.0
    avg_launch = statistics.mean(launch_list) if launch_list else 0.0
    med_launch = statistics.median(launch_list) if launch_list else 0.0

    lines = [
        '# 利用状況レポート（P10）',
        '',
        f'- 集計日: {datetime.date.today().isoformat()}（対象行数: {total_rows}行）',
        f'- **総ユーザー数（ユニーク匿名ID）**: **{total_users}人**',
        f'- **本編クリア済み**: **{clears}人（{clear_rate:.1f}%）**',
        f'- **累計プレイ時間（1人あたり）**: 中央値 **{med_hours:.1f}時間** ／ 平均 **{avg_hours:.1f}時間**',
        f'- **累計起動回数（1人あたり）**: 中央値 **{med_launch:.1f}回** ／ 平均 **{avg_launch:.1f}回**',
        f'- **離脱の目安（最終送信が7日以上前）**: **{inactive_7d}人（{inactive_rate:.1f}%）**（基準日: {latest_date.isoformat()}）',
        '',
        '## 日別アクティブ数・新規ユーザー数（直近30日）',
        '| 日付 | アクティブ数 (DAU) | 新規ユーザー数 |',
        '|---|---:|---:|',
    ]
    for dt in sorted(dau.keys())[-30:]:
        lines.append(f'| {dt.isoformat()} | {len(dau[dt])} | {new_by_day[dt]} |')

    lines += [
        '',
        '## バージョン別ユーザー数',
        '| バージョン | 人数 |',
        '|---|---:|',
    ]
    for ver, cnt in ver_counts.most_common():
        lines.append(f'| {ver} | {cnt} |')

    lines += [
        '',
        '## レベル帯別分布',
        '| レベル帯 | 人数 |',
        '|---|---:|',
    ]
    for label, _, _ in LV_BANDS:
        lines.append(f'| {label} | {lv_counts[label]} |')

    lines += [
        '',
        '## 最高到達ダンジョン別人数',
        '| ダンジョン | 人数 |',
        '|---|---:|',
    ]
    for d_id in DUNGEON_IDS:
        if dg_counts[d_id]:
            lines.append(f'| {d_id} | {dg_counts[d_id]} |')

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'{out_path} を作成しました: 総ユーザー {total_users}人（{total_rows}行）')


if __name__ == '__main__':
    main()
