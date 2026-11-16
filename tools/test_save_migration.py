# セーブ移行テスト: v1 のセーブを注入して読み込み → v2 になり、内容が保たれることを確認する
# 使い方: python3 tools/test_save_migration.py [HTMLのパス(省略時はindex.html)]
# 前提: pip install playwright && playwright install chromium
from playwright.sync_api import sync_playwright
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'index.html'))
FIXTURE = os.path.join(HERE, 'fixtures', 'save_v1.json')   # 旧版(v1)を実際に遊んで作ったセーブ
KEY = 'rogue_test_save_v1'
fails = []


def check(name, cond, detail=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  ' + str(detail)))
    if not cond:
        fails.append(name)


def strip_ids(o):
    """読み込み時に装備IDは振り直されるので、比較では無視する"""
    if isinstance(o, dict):
        return {k: strip_ids(v) for k, v in o.items() if k != 'id'}
    if isinstance(o, list):
        return [strip_ids(x) for x in o]
    return o


def fresh_page(b, raw=None):
    """raw があれば、ページのスクリプトが走る前に localStorage へ入れて起動する
    （起動後に入れて reload すると、pagehide の自動保存で上書きされるため）。初回の1回だけ注入する"""
    ctx = b.new_context(); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    if raw is not None:
        ctx.add_init_script(
            'if(!localStorage.getItem("__injected")){localStorage.setItem(%s,%s);localStorage.setItem("__injected","1");}'
            % (json.dumps(KEY), json.dumps(raw)))
    pg.goto('file://' + HTML); pg.wait_for_timeout(300)
    return ctx, pg, errs


v1 = json.load(open(FIXTURE, encoding='utf-8'))
raw_v1 = json.dumps(v1, ensure_ascii=False)
assert v1['v'] == 1

with sync_playwright() as pw:
    b = pw.chromium.launch()

    # 1. v1 → v2 変換と内容の保持
    ctx, pg, errs = fresh_page(b, raw_v1)
    stored = json.loads(pg.evaluate('k=>localStorage.getItem(k)', KEY))
    check('v1 save is rewritten as v2', stored.get('v') == 2, stored.get('v'))
    check('SAVE_VERSION is 2', pg.evaluate('()=>window.__rogue.SAVE_VERSION') == 2)
    sp, op = stored['p'], v1['p']
    for k in ['lv', 'exp', 'sp', 'gold', 'bank', 'hp', 'mp', 'skills', 'skillPts', 'passiveSkills',
              'equippedSkills', 'potions', 'stats', 'stones', 'weapon', 'armor', 'bag']:
        check('p.%s kept' % k, strip_ids(sp.get(k)) == strip_ids(op.get(k)), (sp.get(k), op.get(k)))
    for k in ['opts', 'sel', 'shopSel', 'autoSellRarity']:
        check('%s kept' % k, stored.get(k) == v1.get(k), (stored.get(k), v1.get(k)))
    live = pg.evaluate('()=>({lv:G.p.lv,gold:G.p.gold,bag:G.p.bag.length,speed:G.opts.speed})')
    check('in-game state matches v1', live == {'lv': op['lv'], 'gold': op['gold'], 'bag': len(op['bag']), 'speed': v1['opts']['speed']}, live)
    bak = pg.evaluate('k=>localStorage.getItem(k)', KEY + '_bak_v1')
    check('original v1 data is backed up untouched', bak is not None and json.loads(bak) == v1)
    check('no page errors (migration)', errs == [], errs)
    # 再読込しても v2 のまま・内容が変わらない（二重変換や損失がない）
    before = pg.evaluate('k=>localStorage.getItem(k)', KEY)
    pg.reload(); pg.wait_for_timeout(300)
    after = pg.evaluate('k=>localStorage.getItem(k)', KEY)
    check('v2 save is stable across reload', before == after)
    # ゲーム内で進めて保存しても v2 のまま
    pg.evaluate('()=>{G.p.gold+=100; window.__rogue.save();}')
    s2 = json.loads(pg.evaluate('k=>localStorage.getItem(k)', KEY))
    check('later saves are v2', s2['v'] == 2 and s2['p']['gold'] == op['gold'] + 100)
    ctx.close()

    # 2. v が無いセーブは v1 扱い
    nov = dict(v1); nov.pop('v')
    ctx, pg, errs = fresh_page(b, json.dumps(nov))
    check('save without v is treated as v1', json.loads(pg.evaluate('k=>localStorage.getItem(k)', KEY))['v'] == 2)
    ctx.close()

    # 3. migrateSave 単体
    ctx, pg, errs = fresh_page(b)
    r = pg.evaluate('''(v1)=>{const m=window.__rogue.migrateSave;
      const a=m(JSON.parse(JSON.stringify(v1)));
      return {null1:m(null), noP:m({v:1}), v1v:a&&a.v, same:m(a)===a, future:m({v:99,p:{}}).v, str:m('x')};}''', v1)
    check('migrateSave(null/garbage) -> null', r['null1'] is None and r['noP'] is None and r['str'] is None, r)
    check('migrateSave v1 -> v2, v2 unchanged', r['v1v'] == 2 and r['same'])
    check('migrateSave leaves future versions alone', r['future'] == 99)
    ctx.close()

    # 4. 壊れたセーブでも落ちず、新規開始になる
    for label, junk in [('broken json', '{oops'), ('no p', '{"v":1}')]:
        ctx, pg, errs = fresh_page(b, junk)
        ok = pg.evaluate('()=>G.p&&G.p.lv===1&&G.p.gold===50')
        check('%s -> new game, no crash' % label, ok and errs == [], errs)
        ctx.close()

    # 5. セーブなしの新規 → 保存すると v2
    ctx, pg, errs = fresh_page(b)
    pg.evaluate('()=>window.__rogue.save()')
    check('new game saves as v2', json.loads(pg.evaluate('k=>localStorage.getItem(k)', KEY))['v'] == 2)
    ctx.close()
    b.close()

print('\nRESULT:', 'OK' if not fails else 'FAILED (%d): %s' % (len(fails), fails))
sys.exit(1 if fails else 0)
