# 自動プレイBOT: 全ステージをクリアするまでの周回数・所要時間(4倍速換算)・レベル推移を測る回帰テスト
# 使い方:
#   python3 tools/bot.py [HTMLのパス]                    # 周回モード (3シード)
#   python3 tools/bot.py --mode linear [HTMLのパス]      # 線形モード (15セル順番に1回ずつ、負けたら再戦)
from playwright.sync_api import sync_playwright
import argparse, json, os, sys

BOT = r"""
({seed, mode})=>{
 const R=window.__rogue; let s=seed; R.setRng(()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296});
 R.setHeadless(true); R.noTimer(true);
 const G=window.G; G.tutorial=null; G.p=R.newPlayer();
 const cells=[];
 for(const d of R.DUNGEONS) d.rec.forEach((r,i)=>cells.push({d:d.id,df:R.DIFFS[i].id,rec:r,idx:i,cleared:false,fail:0}));
 cells.sort((a,b)=>a.rec-b.rec);
 let ticks=0,runs=0,defeats=0,retreats=0; const log=[]; const steps=[];
 const spPlan=()=>{const p=G.p;
   const cap={sword:20,magic:20,life:20,warrior:10,mage:10,cleric:10,hero:10};
   const A=(t,n)=>{
     const tree=R.SKILL_TREES.find(x=>x.id===t);
     if(!tree||!tree.unlockWhen(p)) return;
     n=Math.min(n,p.sp,cap[t]-(p.skillPts[t]||0));
     if(n>0) R.ACTS.spAlloc({tree:t,amount:n});
   };
   A('life',3); A('sword',20); A('life',20); A('magic',20);
   A('hero',10); A('warrior',10); A('cleric',10); A('mage',10);
   const order=['heroic','ult','multi','strike','meteor','thunder','fireball','berserk','blizzard'];
   const heal=['fullheal','heal']; const slots=[null,null,null];
   const h=heal.find(x=>p.skills[x]); if(h) slots[0]=h;
   const atk=order.filter(x=>p.skills[x]).slice(0,2); atk.forEach((x,i)=>slots[i+1]=x);
   p.equippedSkills=slots;
 };
 const buyNeedStone=(stoneId)=>{
   const p=G.p, item=R.SHOP_ITEMS.find(x=>x.id===stoneId);
   if(item && p.gold>=item.price && (p.stones[stoneId]||0)<1) R.buyShopItem(stoneId);
 };
 const town=()=>{const p=G.p; R.equipBest();
   // 装備強化（★6まで、足りなければショップから強化石を買う）
   for(const it of [p.weapon,p.armor]){
     if(it&&it.star<R.SMITH_MAX_STAR){
       for(let k=0;k<4;k++){
         if(it.star>=R.SMITH_MAX_STAR) break;
         const req=R.STONE_REQ[it.star];
         if(req && (p.stones[req]||0)<1 && p.gold>=R.smithCost(it)+(R.SHOP_ITEMS.find(x=>x.id===req)?.price||0)) buyNeedStone(req);
         if(p.gold>=R.smithCost(it)&&(!req||(p.stones[req]||0)>0)) R.smithUpgrade(it.id);
         else break;
       }
     }
   }
   // 武器に特性がない/より良い特性を狙う再鍛造（ただし狂気は回避したいので不要ならそのまま、余裕があれば付与）
   if(p.weapon && !p.weapon.prop && p.gold>=R.reforgeCost(p.weapon)*2) R.smithReforge(p.weapon.id);
   // 薬の補充（HP/MP各8個まで）
   while(p.potions.hp<8 && p.gold>=180) R.buyShopItem('hp');
   while(p.potions.mp<8 && p.gold>=220) R.buyShopItem('mp');
   // バッグ拡張（120まで）
   while((p.bagCap||60)<R.MAX_BAG_CAP && p.gold>=R.bagExpandCost(p.bagCap||60)) R.expandBag();
   // 売却
   const t=p.bag.filter(it=>!it.locked&&it.rarity<=1); p.bag=p.bag.filter(it=>!t.includes(it)); p.gold+=t.reduce((a,b)=>a+R.sellValue(b),0);
   if(p.bag.length>50){p.bag.sort((a,b)=>a.star-b.star);p.bag=p.bag.slice(-40);}
   spPlan(); p.hp=R.maxHp(p); p.mp=R.maxMp(p);
 };

 const doRun=(target)=>{
   R.startRun(target.d,target.df); runs++;
   while(G.run){
     const hpR=G.p.hp/R.maxHp(G.p);
     if(hpR<0.3&&G.p.potions.hp>0) R.usePotion('hp');
     else if(G.p.mp<18&&G.p.potions.mp>0) R.usePotion('mp');
     else if(mode==='loop'&&hpR<0.2&&G.run.floor<G.run.floors-1&&G.run.phase!=='battle'){ R.ACTS.retreat(); retreats++; break; }
     R.tick(); ticks++; if(ticks>2000000) break;
   }
   return G.last;
 };

 if(mode==='linear'){
   for(const target of cells){
     town();
     const enterLv=G.p.lv;
     let cellFails=0;
     while(!target.cleared && cellFails<10){
       town();
       const L=doRun(target);
       if(L&&L.result==='clear'){ target.cleared=true; }
       else if(L&&L.result==='defeat'){ defeats++; cellFails++; }
       else break;
     }
     steps.push({cell:target.d+'_'+target.df, rec:target.rec, enterLv, diff:enterLv-target.rec, endLv:G.p.lv, fails:cellFails});
   }
   return {mode, done:!cells.some(c=>!c.cleared), runs, defeats, retreats, ticks, lv:G.p.lv, gold:G.p.gold,
     x4_min_game:Math.round(ticks*650/4/60000*10)/10, steps};
 }

 let guard=0;
 while(cells.some(c=>!c.cleared)&&guard++<4000){
   town(); const p=G.p;
   const unlocked=cells.filter(c=>R.isDiffUnlocked(p, R.DUNGEONS.find(x=>x.id===c.d), R.DIFFS.find(x=>x.id===c.df)));
   const pend=unlocked.filter(c=>!c.cleared); const t=pend[0];
   if(!t) break;
   let target;
   if(p.lv>=t.rec+t.fail*2-2) target=t;
   else { const ok=unlocked.filter(c=>c.rec<=p.lv+2); target=ok.length?ok[ok.length-1]:unlocked[0]; }
   const L=doRun(target);
   if(L&&L.result==='clear'){ target.cleared=true; }
   else if(L&&L.result==='defeat'){ defeats++; target.fail++; }
   if(runs%10===0) log.push([runs,p.lv,ticks]);
 }
 return {mode:'loop', done:!cells.some(c=>!c.cleared),runs,defeats,retreats,ticks,lv:G.p.lv,gold:G.p.gold,log:log.slice(-6),
   x4_min_game:Math.round(ticks*650/4/60000*10)/10, overhead_min:Math.round(runs*20/60*10)/10};
}
"""

ap = argparse.ArgumentParser()
ap.add_argument('--mode', choices=['loop', 'linear'], default='loop')
ap.add_argument('html', nargs='?', default=os.path.join(os.path.dirname(__file__), '..', 'index.html'))
args = ap.parse_args()
HTML = os.path.abspath(args.html)

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + HTML); pg.wait_for_timeout(400)
    seeds = (1,) if args.mode == 'linear' else (1, 2, 3)
    for seed in seeds:
        r = pg.evaluate(BOT, {'seed': seed, 'mode': args.mode})
        print(json.dumps(r, ensure_ascii=False))
    print(errs)
    b.close()
