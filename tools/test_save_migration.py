# セーブ移行テスト: v1 / v2 のセーブを注入して読み込み → v3 になり、内容が保たれることを確認する
# 使い方: python3 tools/test_save_migration.py [HTMLのパス(省略時はindex.html)]
# 前提: pip install playwright && playwright install chromium
from playwright.sync_api import sync_playwright
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '..', 'index.html'))
FIXTURE_V1 = os.path.join(HERE, 'fixtures', 'save_v1.json')   # 旧版(v1)を実際に遊んで作ったセーブ
FIXTURE_V2 = os.path.join(HERE, 'fixtures', 'save_v2.json')   # v2 サンプル(Lv22)
KEY = 'rogue_test_save_v1'
fails = []


def check(name, cond, detail=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  ' + str(detail)))
    if not cond:
        fails.append(name)


def strip_ids(o):
    """読み込み時に装備IDは振り直されるので、比較では無視する"""
    if isinstance(o, dict):
        return {k: strip_ids(v) for k, v in o.items() if k not in ('id', 'props')}
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


v1 = json.load(open(FIXTURE_V1, encoding='utf-8'))
v2 = json.load(open(FIXTURE_V2, encoding='utf-8'))
raw_v1 = json.dumps(v1, ensure_ascii=False)
raw_v2 = json.dumps(v2, ensure_ascii=False)
assert v1['v'] == 1 and v2['v'] == 2

with sync_playwright() as pw:
    b = pw.chromium.launch()

    # 1. v1 → v3 連鎖変換と内容の保持
    ctx, pg, errs = fresh_page(b, raw_v1)
    stored = json.loads(pg.evaluate('k=>localStorage.getItem(k)', KEY))
    check('v1 save is rewritten as v6', stored.get('v') == 6, stored.get('v'))
    check('SAVE_VERSION is 6', pg.evaluate('()=>window.__rogue.SAVE_VERSION') == 6)
    sp, op = stored['p'], v1['p']
    for k in ['lv', 'exp', 'sp', 'gold', 'bank', 'hp', 'mp', 'skills', 'skillPts', 'passiveSkills',
              'equippedSkills', 'potions', 'stats', 'weapon', 'armor', 'bag']:
        check('v1 p.%s kept' % k, strip_ids(sp.get(k)) == strip_ids(op.get(k)), (sp.get(k), op.get(k)))
    check('v1 p.stones kept (+stone_time,+stone_core,+stone_genesis)',
          sp.get('stones', {}).get('stone_time') == 0 and sp.get('stones', {}).get('stone_core') == 0 and sp.get('stones', {}).get('stone_genesis') == 0 and all(sp['stones'].get(sk) == v for sk, v in op['stones'].items()),
          (sp.get('stones'), op.get('stones')))
    for k in ['opts', 'shopSel', 'autoSellRarity']:
        check('v1 %s kept' % k, stored.get(k) == v1.get(k), (stored.get(k), v1.get(k)))
    check('v1 sel kept (+D/E/F)',
          all(stored['sel'].get(dk) == dv for dk, dv in v1['sel'].items())
          and all(stored['sel'].get(dk) == 'novice' for dk in ['D', 'E', 'F']),
          (stored.get('sel'), v1.get('sel')))
    check('v1->v3 bagCap is 60', sp.get('bagCap') == 60, sp.get('bagCap'))
    # Lv6 なので A.novice(1), B.novice(6) がクリア済み、A.mid(9) は未クリア
    check('v1->v3 cleared inferred from lv', sp.get('cleared', {}).get('A', {}).get('novice') is True
          and sp.get('cleared', {}).get('B', {}).get('novice') is True
          and not sp.get('cleared', {}).get('A', {}).get('mid'), sp.get('cleared'))
    live = pg.evaluate('()=>({lv:G.p.lv,gold:G.p.gold,bag:G.p.bag.length,speed:G.opts.speed})')
    check('in-game state matches v1', live == {'lv': op['lv'], 'gold': op['gold'], 'bag': len(op['bag']), 'speed': v1['opts']['speed']}, live)
    bak = pg.evaluate('k=>localStorage.getItem(k)', KEY + '_bak_v1')
    check('original v1 data is backed up untouched', bak is not None and json.loads(bak) == v1)
    check('no page errors (v1 migration)', errs == [], errs)
    # 再読込しても v3 のまま安定
    before = pg.evaluate('k=>localStorage.getItem(k)', KEY)
    pg.reload(); pg.wait_for_timeout(300)
    after = pg.evaluate('k=>localStorage.getItem(k)', KEY)
    check('v3 save is stable across reload', before == after)
    pg.evaluate('()=>{G.p.gold+=100; window.__rogue.save();}')
    s3 = json.loads(pg.evaluate('k=>localStorage.getItem(k)', KEY))
    check('later saves are v6', s3['v'] == 6 and s3['p']['gold'] == op['gold'] + 100)
    ctx.close()

    # 2. v2 → v5 変換 (Lv22: A上級 rec18 がクリア済みとなり A超級が解放される)
    ctx, pg, errs = fresh_page(b, raw_v2)
    stored2 = json.loads(pg.evaluate('k=>localStorage.getItem(k)', KEY))
    check('v2 save is rewritten as v6', stored2.get('v') == 6, stored2.get('v'))
    check('v2->v3 A.high cleared & super unlocked',
          pg.evaluate('()=>window.__rogue.isDiffUnlocked(G.p, window.__rogue.DUNGEONS[0], window.__rogue.DIFFS[3])') is True)
    check('v2->v3 C.high (rec33) not cleared & C.super locked',
          pg.evaluate('()=>window.__rogue.isDiffUnlocked(G.p, window.__rogue.DUNGEONS[2], window.__rogue.DIFFS[3])') is False)
    bak2 = pg.evaluate('k=>localStorage.getItem(k)', KEY + '_bak_v2')
    check('original v2 data is backed up untouched', bak2 is not None and json.loads(bak2) == v2)
    check('no page errors (v2 migration)', errs == [], errs)
    ctx.close()

    # 3. v が無いセーブは v1 扱い → v5 になる
    nov = dict(v1); nov.pop('v')
    ctx, pg, errs = fresh_page(b, json.dumps(nov))
    check('save without v is treated as v1 -> v6', json.loads(pg.evaluate('k=>localStorage.getItem(k)', KEY))['v'] == 6)
    ctx.close()

    # 4. migrateSave 単体 (v1->v6, v3->v6, v4->v6, v5->v6)
    ctx, pg, errs = fresh_page(b)
    r = pg.evaluate('''(v1)=>{const m=window.__rogue.migrateSave;
      const a=m(JSON.parse(JSON.stringify(v1)));
      const v3=m({v:3,p:{lv:50,cleared:{},bagCap:60}});
      const v4=m({v:4,p:{lv:80,cleared:{},bagCap:60,tower:{best:10,coins:5,totalCoins:5,title:null,titles:[]},weapon:{id:1,slot:'weapon',star:5,rarity:1,roll:0.9,prop:'flame'}}});
      const v5=m({v:5,p:{lv:90,cleared:{A:{novice:true}},bagCap:60,weapon:{id:1,slot:'weapon',star:5,rarity:1,roll:0.9,props:[]}}});
      return {null1:m(null), noP:m({v:1}), v1v:a&&a.v, same:m(a)===a, v3v:v3&&v3.v, hasTower:!!(v3&&v3.p&&v3.p.tower), v4v:v4&&v4.v, hasAbyss:!!(v4&&v4.p&&v4.p.abyss), hasMastery:!!(v4&&v4.p&&v4.p.mastery), propsOk:Array.isArray(v4&&v4.p&&v4.p.weapon&&v4.p.weapon.props)&&v4.p.weapon.props[0]==='flame', v5v:v5&&v5.v, hasDex:!!(v5&&v5.p&&v5.p.dex&&v5.p.dex.enemies&&v5.p.dex.enemies.a_boss&&v5.p.dex.items&&v5.p.dex.items.weapon_5), future:m({v:99,p:{}}).v, str:m('x')};}''', v1)
    check('migrateSave(null/garbage) -> null', r['null1'] is None and r['noP'] is None and r['str'] is None, r)
    check('migrateSave v1 -> v6, v3 -> v6 (+tower), v4 -> v6 (+abyss/+mastery/+props), v5 -> v6 (+dex), v6 unchanged',
          r['v1v'] == 6 and r['same'] and r['v3v'] == 6 and r['hasTower'] and r['v4v'] == 6 and r['hasAbyss'] and r['hasMastery'] and r['propsOk'] and r['v5v'] == 6 and r['hasDex'], r)
    check('migrateSave leaves future versions alone', r['future'] == 99)
    ctx.close()

    # 5. 壊れたセーブでも落ちず、新規開始になる
    for label, junk in [('broken json', '{oops'), ('no p', '{"v":1}')]:
        ctx, pg, errs = fresh_page(b, junk)
        ok = pg.evaluate('()=>G.p&&G.p.lv===1&&G.p.gold===50')
        check('%s -> new game, no crash' % label, ok and errs == [], errs)
        ctx.close()

    # 6. セーブなしの新規 → 保存すると v5
    ctx, pg, errs = fresh_page(b)
    pg.evaluate('()=>window.__rogue.save()')
    check('new game saves as v6', json.loads(pg.evaluate('k=>localStorage.getItem(k)', KEY))['v'] == 6)
    ctx.close()
    b.close()

print('\nRESULT:', 'OK' if not fails else 'FAILED (%d): %s' % (len(fails), fails))
sys.exit(1 if fails else 0)
