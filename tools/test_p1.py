# P1 自動テスト:
#   1. ドロップ上限 (A/Bは★4まで、Cは★5まで)
#   2. 難易度の解放ルール (上級未クリア→超級不可、クリア後→超級可、極級も同様)
#   3. 戦力値 (gearPower) と equipBest() の判定一致
#   4. tools/build.py の再現性 (同一入力→同一出力バイト列)
# 使い方: python3 tools/test_p1.py [HTMLのパス(省略時はindex.html)]
from playwright.sync_api import sync_playwright
import hashlib, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
HTML = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'index.html'))
fails = []


def check(name, cond, detail=''):
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  ' + str(detail)))
    if not cond:
        fails.append(name)


# 4. ビルド再現性チェック
with tempfile.TemporaryDirectory() as td:
    o1 = os.path.join(td, 'a.html')
    o2 = os.path.join(td, 'b.html')
    subprocess.check_call([sys.executable, os.path.join(HERE, 'build.py'), o1], stdout=subprocess.DEVNULL)
    subprocess.check_call([sys.executable, os.path.join(HERE, 'build.py'), o2], stdout=subprocess.DEVNULL)
    h1 = hashlib.sha256(open(o1, 'rb').read()).hexdigest()
    h2 = hashlib.sha256(open(o2, 'rb').read()).hexdigest()
    check('build.py is deterministic', h1 == h2, (h1, h2))

with sync_playwright() as pw:
    b = pw.chromium.launch()
    pg = b.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + HTML)
    pg.wait_for_timeout(300)

    # 1. ドロップ上限: A・Bで各3000回生成しても★5以上が出ない、Cでは★5が出る
    drop_res = pg.evaluate('''()=>{
      const R = window.__rogue, G = window.G; G.tutorial = null; G.p = R.newPlayer();
      const testD = (dIdx, n) => {
        const d = R.DUNGEONS[dIdx];
        let maxS = 0, c5 = 0;
        for (const df of R.DIFFS) {
          for (let i = 0; i < n; i++) {
            const it = R.genItem(df, true, null, d.maxStar);
            if (it.star > maxS) maxS = it.star;
            if (it.star === 5) c5++;
          }
        }
        return { maxS, c5 };
      };
      return { A: testD(0, 600), B: testD(1, 600), C: testD(2, 600) };
    }''')
    check('Dungeon A never drops star >= 5 (3000 rolls)', drop_res['A']['maxS'] <= 4, drop_res['A'])
    check('Dungeon B never drops star >= 5 (3000 rolls)', drop_res['B']['maxS'] <= 4, drop_res['B'])
    check('Dungeon C drops star 5 (<= 5)', drop_res['C']['maxS'] == 5 and drop_res['C']['c5'] > 0, drop_res['C'])

    # 2. 難易度の解放ルール
    unlock_res = pg.evaluate('''()=>{
      const R = window.__rogue, G = window.G; G.tutorial = null; G.p = R.newPlayer();
      const d = R.DUNGEONS[0];
      const s0 = R.isDiffUnlocked(G.p, d, R.DIFFS[3]); // super before high
      R.startRun('A', 'super');
      const blockedSuper = G.run === null;
      G.p.cleared = { A: { novice: true, mid: true, high: true } };
      const s1 = R.isDiffUnlocked(G.p, d, R.DIFFS[3]); // super after high
      const e0 = R.isDiffUnlocked(G.p, d, R.DIFFS[4]); // extreme before super
      R.startRun('A', 'extreme');
      const blockedExtreme = G.run === null;
      G.p.cleared.A.super = true;
      const e1 = R.isDiffUnlocked(G.p, d, R.DIFFS[4]); // extreme after super
      R.startRun('A', 'extreme');
      const startedExtreme = G.run !== null && G.run.floors === 80;
      return { s0, blockedSuper, s1, e0, blockedExtreme, e1, startedExtreme };
    }''')
    check('super locked & blocked before high clear', not unlock_res['s0'] and unlock_res['blockedSuper'], unlock_res)
    check('super unlocked after high clear', unlock_res['s1'], unlock_res)
    check('extreme locked & blocked before super clear', not unlock_res['e0'] and unlock_res['blockedExtreme'], unlock_res)
    check('extreme unlocked & startable after super clear', unlock_res['e1'] and unlock_res['startedExtreme'], unlock_res)

    # 3. 戦力値 (gearPower) と equipBest() の判定一致
    gear_res = pg.evaluate('''()=>{
      const R = window.__rogue, G = window.G; G.tutorial = null; G.p = R.newPlayer();
      const p = G.p;
      p.bag = [];
      let id = 100;
      const mk = (slot, star, rarity, roll, prop) => ({ id: id++, slot, star, rarity, roll, prop, locked: false });
      const ws = [
        mk('weapon', 3, 1, 0.8, null),
        mk('weapon', 3, 2, 0.9, 'flame'),
        mk('weapon', 4, 1, 0.85, 'vamp'),
        mk('weapon', 3, 3, 0.95, 'madness'),
      ];
      const as = [
        mk('armor', 2, 2, 0.9, null),
        mk('armor', 5, 1, 0.7, null),
        mk('armor', 4, 3, 0.8, null),
      ];
      p.weapon = ws[0]; p.armor = as[0];
      p.bag = [...ws.slice(1), ...as.slice(1)];
      const maxW = ws.reduce((a, b) => R.gearPower(b) > R.gearPower(a) ? b : a);
      const maxA = as.reduce((a, b) => R.gearPower(b) > R.gearPower(a) ? b : a);
      R.equipBest();
      return {
        wMatch: p.weapon.id === maxW.id && R.bestGearItem(p, 'weapon').id === p.weapon.id,
        aMatch: p.armor.id === maxA.id && R.bestGearItem(p, 'armor').id === p.armor.id,
        wPow: R.gearPower(p.weapon), aPow: R.gearPower(p.armor)
      };
    }''')
    check('gearPower matches equipBest() & bestGearItem() for weapon', gear_res['wMatch'], gear_res)
    check('gearPower matches equipBest() & bestGearItem() for armor', gear_res['aMatch'], gear_res)
    check('no page errors', errs == [], errs)
    b.close()

print('\nRESULT:', 'OK' if not fails else 'FAILED (%d): %s' % (len(fails), fails))
sys.exit(1 if fails else 0)
