# 自動プレイBOT: 全ステージをクリアするまでの周回数・所要時間(4倍速換算)・レベル推移を測る回帰テスト
# 使い方:
#   python3 tools/bot.py [HTMLのパス]                    # 周回モード (3シード)
#   python3 tools/bot.py --mode linear [HTMLのパス]      # 線形モード (各セル1回ずつ、負けたら再戦)
from playwright.sync_api import sync_playwright
import argparse, json, os

BOT = r"""
({seed, mode, blessMode, charId})=>{
 const R=window.__rogue; let s=seed; R.setRng(()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296});
 R.setHeadless(true); R.noTimer(true);
 const G=window.G; G.tutorial=null; G._charSelectOpen=false; G.p=R.newPlayer();
 const cid=(charId&&R.CHAR_TREES&&R.CHAR_TREES[charId])?charId:'stella';
 G.p.skin=cid; if(R.syncActiveCharState) R.syncActiveCharState(G.p);
 const cells=[];
 for(const d of R.DUNGEONS) d.rec.forEach((r,i)=>cells.push({d:d.id,df:R.DIFFS[i].id,rec:r,idx:i,cleared:false,fail:0,tried:false,firstClear:false}));
 cells.sort((a,b)=>a.rec-b.rec);
 let ticks=0,runs=0,defeats=0,retreats=0,floorsTraversed=0; const log=[]; const steps=[];
 const maxSmith=R.SMITH_MAX_STAR||5;
 const spPlan=()=>{const p=G.p;
   const trees=R.getCharTrees?R.getCharTrees(p.skin):R.SKILL_TREES;
   const t0=trees[0]&&trees[0].id, t1=trees[1]&&trees[1].id, t2=trees[2]&&trees[2].id;
   const cap={}; trees.forEach((t,i)=>{cap[t.id]=p.ending?30:(i===0?30:20);});
   const A=(t,n)=>{
     if(!t) return;
     const tree=trees.find(x=>x.id===t);
     if(!tree||(tree.unlockWhen&&!tree.unlockWhen(p))) return;
     const mx=(tree.stage2When&&!tree.stage2When(p))?10:cap[t];
     n=Math.min(n,p.sp,mx-(p.skillPts[t]||0));
     if(n>0) R.ACTS.spAlloc({tree:t,amount:n});
   };
   A(t0,20); A(t1,20); A(t2,10);
   A(t0,10); A(t1,10); A(t2,20);
   const order=['genesisRay','swordGod','endMagic','nightSky','skyStar','skyMeteorite','heavenStars','thousandMask','meteorNova','tenma','nightParade','starSword','starDust','celestialLance','trumpCard','cosmicNova','hagun','thousandCuts','zeroAbs','divineWrath','ultima','skySlash','shadowPierce','heroic','arcaneMiracle','angelMiracle','grandHeist','iceAge','meteor','holyNova','blizzard','bladeDance','lightningStorm','ult','phantomSlash','flameSlash','judgment','blaze','thunder','rush','multi','doubleStab','strike','fireball','holyBolt','berserk'];
   const heal=['eternal','goddess','requiem','holyLight','saintPrayer','resurrection','fullheal','highRegen','heal','regen','firstAid'];
   const buff=['heroAdvent','heroAwaken','phantomAdvent','kishin','mirageStance','shura','swiftStance','warGod','frenzyEdge','holyBarrier','barrier','guard','shadowStep','magicshield'];
   const slots=[null,null,null];
   const h=heal.find(x=>p.skills[x])||buff.find(x=>p.skills[x]); if(h) slots[0]=h;
   const atk=order.filter(x=>p.skills[x]&&x!==slots[0]).slice(0,2);
   atk.forEach((x,i)=>slots[i+1]=x);
   for(let i=0;i<3;i++){
     if(!slots[i]){
       const b=buff.find(x=>p.skills[x]&&!slots.includes(x))||heal.find(x=>p.skills[x]&&!slots.includes(x));
       if(b) slots[i]=b;
     }
   }
   p.equippedSkills=slots;
   if(p.chars&&p.chars[p.skin]) p.chars[p.skin].equippedSkills=slots;
 };
 const buyNeedStone=(stoneId)=>{
   if(!R.SHOP_ITEMS||!R.buyShopItem) return;
   const p=G.p, item=R.SHOP_ITEMS.find(x=>x.id===stoneId);
   if(item && p.gold>=item.price && (p.stones[stoneId]||0)<1) R.buyShopItem(stoneId);
 };
 const town=()=>{const p=G.p; R.equipBest();
   for(const it of [p.weapon,p.armor]){
     if(it&&it.star<maxSmith){
       for(let k=0;k<4;k++){
         if(it.star>=maxSmith) break;
         const req=R.STONE_REQ[it.star];
         if(req && (p.stones[req]||0)<1 && R.SHOP_ITEMS && p.gold>=R.smithCost(it)+(R.SHOP_ITEMS.find(x=>x.id===req)?.price||0)) buyNeedStone(req);
         if(p.gold>=R.smithCost(it)&&(!req||(p.stones[req]||0)>0)) R.smithUpgrade(it.id);
         else break;
       }
     }
   }
   // 特性がない武器に再鍛造（余りゴールドが多ければ炎上・吸血を狙う）
   if(R.smithReforge && p.weapon){
     if(!p.weapon.prop && p.gold>=R.reforgeCost(p.weapon)*2) R.smithReforge(p.weapon.id);
     else if(p.weapon.prop!=='flame' && p.gold>=60000) R.smithReforge(p.weapon.id);
   }
   if(R.buyShopItem){
     const pCap = p.lv >= 90 ? 25 : 8;
     while(p.potions.hp<pCap && p.gold>=200) R.buyShopItem('hp');
     while(p.potions.mp<pCap && p.gold>=250) R.buyShopItem('mp');
   }
   if(R.expandBag){
     while((p.bagCap||60)<(R.MAX_BAG_CAP||60) && p.gold>=R.bagExpandCost(p.bagCap||60)) R.expandBag();
   }
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
   if(G.last) floorsTraversed += (G.last.floor || 0);
   return G.last;
 };

 const metrics=()=>{
   const sec=floorsTraversed*2.5 + runs*50;
   const firstClears=cells.filter(c=>c.firstClear).length;
   return {
     floorsTraversed,
     ticksPerFloor: Math.round(ticks/Math.max(1,floorsTraversed)*100)/100,
     model_minutes: Math.round(sec/60*10)/10,
     model_hours: Math.round(sec/3600*100)/100,
     firstClearRate: Math.round(firstClears/cells.length*1000)/10,
     defeatRate: Math.round(defeats/Math.max(1,runs)*1000)/10
   };
 };

 if(mode==='abyss'){
   const results=[];
   for(const bld of ['std','enh']){
     const perDiff=[];
     for(let lv=1; lv<=10; lv++){
       let clears=0, totalTicks=0, trials=5;
       for(let tr=0; tr<trials; tr++){
         const p=G.p=R.newPlayer();
         p.skin=cid; if(R.syncActiveCharState) R.syncActiveCharState(p);
         p.lv=bld==='std'?126:132; p.sp=bld==='std'?170:320; p.ending=true; p.gold=200000;
         for(const d of R.DUNGEONS){ p.cleared[d.id]={novice:true,mid:true,high:true,super:true,extreme:true}; }
         p.abyss={best:10,cleared:{1:true,2:true,3:true,4:true,5:true,6:true,7:true,8:true,9:true,10:true}};
         p.potions={hp:25,mp:25};
         const trees=R.getCharTrees?R.getCharTrees(p.skin):[];
         if(bld==='std'){
           p.weapon=R.genItem(R.DIFFS[4],false,'weapon',8,8); p.weapon.rarity=3; p.weapon.roll=0.9; p.weapon.prop='flame'; p.weapon.props=['flame'];
           p.armor=R.genItem(R.DIFFS[4],false,'armor',8,8); p.armor.rarity=3; p.armor.roll=0.9;
           if(trees[0]) R.ACTS.spAlloc({tree:trees[0].id,amount:30});
           if(trees[1]) R.ACTS.spAlloc({tree:trees[1].id,amount:20});
           if(trees[2]) R.ACTS.spAlloc({tree:trees[2].id,amount:20});
           spPlan();
         }else{
           p.weapon=R.genItem(R.DIFFS[4],false,'weapon',8,8); p.weapon.rarity=4; p.weapon.roll=1.0; p.weapon.prop='flame'; p.weapon.props=['flame'];
           p.armor=R.genItem(R.DIFFS[4],false,'armor',8,8); p.armor.rarity=4; p.armor.roll=1.0;
           for(const t of trees) R.ACTS.spAlloc({tree:t.id,amount:30});
           for(const m of R.MASTERY_LIST) for(let k=0;k<8;k++) R.ACTS.masteryUp({id:m.id});
           spPlan();
         }
         p.hp=R.maxHp(p); p.mp=R.maxMp(p);
         let t=0;
         R.startAbyssRun(lv);
         while(G.run && t<10000){
           const hpR=G.p.hp/R.maxHp(G.p);
           if(hpR<0.35&&G.p.potions.hp>0) R.usePotion('hp');
           else if(G.p.mp<(bld==='enh'?85:40)&&G.p.potions.mp>0) R.usePotion('mp');
           R.tick(); t++;
         }
         totalTicks+=t;
         if(G.last && G.last.result==='clear') clears++;
       }
       perDiff.push({lv, clearRate:Math.round(clears/trials*100), avgTicks:Math.round(totalTicks/trials)});
     }
     results.push({build:bld, seed, perDiff});
   }
   return {mode:'abyss', seed, results};
 }

 if(mode==='tower'){
   const p=G.p;
   p.lv=126; p.sp=200; p.ending=true; p.gold=100000;
   p.potions={hp:25,mp:25};
   p.weapon=R.genItem(R.DIFFS[4],false,'weapon',8,8); p.weapon.rarity=3; p.weapon.roll=0.9; p.weapon.prop='flame'; p.weapon.props=['flame'];
   p.armor=R.genItem(R.DIFFS[4],false,'armor',8,8); p.armor.rarity=3; p.armor.roll=0.9;
   spPlan(); p.hp=R.maxHp(p); p.mp=R.maxMp(p);
   const scoreBless=(b)=>{
     const e=b.eff||{}; let sc=0;
     if(e.atkPct) sc+=e.atkPct*90;
     if(e.dmgPct) sc+=e.dmgPct*100;
     if(e.defPct) sc+=e.defPct*(e.defPct>0?110:180);
     if(e.hpPct) sc+=e.hpPct*(e.hpPct>0?110:200);
     if(e.takenPct) sc+=(-e.takenPct)*(e.takenPct<0?160:220);
     if(e.floorAtk10) sc+=70;
     if(e.floorDef10) sc+=90;
     if(e.floorDmg10) sc+=75;
     if(e.floorHp10) sc+=85;
     if(e.reviveOnce) sc+=110;
     if(e.lifeSteal) sc+=95;
     if(e.bossDmg) sc+=60;
     if(e.ctRed) sc+=65;
     if(e.firstCrit) sc+=40;
     if(e.killHeal) sc+=55;
     return sc;
   };
   R.startTowerRun();
   while(G.run && ticks<200000){
     if(G.run.phase==='bless' && G.run.tower && G.run.tower.pendingChoice){
       const ch=G.run.tower.pendingChoice;
       let pick=ch[0];
       if(blessMode==='opt') pick=[...ch].sort((a,b)=>scoreBless(b)-scoreBless(a))[0];
       else pick=ch[Math.floor((s=(s*1664525+1013904223)%4294967296)/4294967296*ch.length)];
       R.pickBlessing(pick.id);
       continue;
     }
     const hpR=G.p.hp/R.maxHp(G.p);
     if(hpR<0.35&&G.p.potions.hp>0) R.usePotion('hp');
     else if(G.p.mp<30&&G.p.potions.mp>0) R.usePotion('mp');
     R.tick(); ticks++;
   }
   const tw=G.last && G.last.tower;
   return {mode:'tower', blessMode:blessMode||'opt', seed, reached:tw?tw.reached:0, coins:tw?tw.coins:0, ticks, ticksPerFloor:Math.round(ticks/Math.max(1,(tw?tw.reached:1))*100)/100, blessings:tw?tw.blessings.length:0};
 }

 if(mode==='linear'){
   for(const target of cells){
     town();
     const enterLv=G.p.lv;
     let cellFails=0;
     while(!target.cleared && cellFails<10){
       town();
       const wasTried=target.tried; target.tried=true;
       const L=doRun(target);
       if(L&&L.result==='clear'){ target.cleared=true; if(!wasTried) target.firstClear=true; }
       else if(L&&L.result==='defeat'){ defeats++; cellFails++; }
       else break;
     }
     steps.push({cell:target.d+'_'+target.df, rec:target.rec, enterLv, diff:enterLv-target.rec, endLv:G.p.lv, fails:cellFails});
   }
   return Object.assign({mode, done:!cells.some(c=>!c.cleared), runs, defeats, retreats, ticks, lv:G.p.lv, gold:G.p.gold,
     x4_min_game:Math.round(ticks*650/4/60000*10)/10, steps}, metrics());
 }

 let guard=0; const dfl=[];
 while(cells.some(c=>!c.cleared)&&guard++<4000){
   town(); const p=G.p;
   const unlocked=R.isDiffUnlocked
     ? cells.filter(c=>R.isDiffUnlocked(p, R.DUNGEONS.find(x=>x.id===c.d), R.DIFFS.find(x=>x.id===c.df)))
     : cells;
   const pend=unlocked.filter(c=>!c.cleared); const t=pend[0];
   if(!t) break;
   let target;
   if(p.lv>=t.rec+t.fail*2-2) target=t;
   else { const ok=unlocked.filter(c=>c.rec<=p.lv+2); target=ok.length?ok[ok.length-1]:unlocked[0]; }
   const wasTried=target.tried; target.tried=true;
   const L=doRun(target);
   if(L&&L.result==='clear'){ target.cleared=true; if(!wasTried) target.firstClear=true; }
   else if(L&&L.result==='defeat'){ defeats++; target.fail++; dfl.push(target.d+target.df+'@Lv'+p.lv); }
   if(runs%10===0) log.push([runs,p.lv,ticks]);
 }
 return Object.assign({mode:'loop', char:cid, done:!cells.some(c=>!c.cleared),runs,defeats,retreats,ticks,lv:G.p.lv,sp:G.p.sp,gold:G.p.gold,log:log.slice(-6), defeatList:dfl.reduce((a,x)=>{a[x]=(a[x]||0)+1;return a;},{}),
   x4_min_game:Math.round(ticks*650/4/60000*10)/10, overhead_min:Math.round(runs*20/60*10)/10}, metrics());
}
"""

ap = argparse.ArgumentParser()
ap.add_argument('--mode', choices=['loop', 'linear', 'tower', 'abyss'], default='loop')
ap.add_argument('--bless', choices=['opt', 'rand'], default='opt')
ap.add_argument('--char', choices=['stella', 'ruby', 'silia', 'chloe'], default='stella')
ap.add_argument('--seeds', type=int, default=3, help='loop/tower/abyss のシード数（1..N）')
ap.add_argument('html', nargs='?', default=os.path.join(os.path.dirname(__file__), '..', 'index.html'))
args = ap.parse_args()
HTML = os.path.abspath(args.html)

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + HTML); pg.wait_for_timeout(400)
    seeds = (1,) if args.mode == 'linear' else tuple(range(1, args.seeds + 1))
    for seed in seeds:
        r = pg.evaluate(BOT, {'seed': seed, 'mode': args.mode, 'blessMode': args.bless, 'charId': args.char})
        print(json.dumps(r, ensure_ascii=False))
    print(errs)
    b.close()
