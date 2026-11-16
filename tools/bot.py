# 自動プレイBOT: 全ステージをクリアするまでの周回数・所要時間(4倍速換算)を測る回帰テスト
# 使い方: python3 tools/bot.py [HTMLのパス(省略時はindex.html)]
from playwright.sync_api import sync_playwright
import json,sys,os
HTML=os.path.abspath(sys.argv[1] if len(sys.argv)>1 else os.path.join(os.path.dirname(__file__),'..','index.html'))
BOT = r"""
(seed)=>{
 const R=window.__rogue; let s=seed; R.setRng(()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296});
 R.setHeadless(true); R.noTimer(true);
 const G=window.G; G.tutorial=null; G.p=R.newPlayer();
 const cells=[]; for(const d of R.DUNGEONS) d.rec.forEach((r,i)=>cells.push({d:d.id,df:R.DIFFS[i].id,rec:r,idx:i,cleared:false,fail:0}));
 cells.sort((a,b)=>a.rec-b.rec);
 let ticks=0,runs=0,defeats=0,retreats=0; const log=[];
 const spPlan=()=>{const p=G.p; const A=(t,n)=>{n=Math.min(n,p.sp,({sword:20,magic:20,life:20})[t]-(p.skillPts[t]||0)); if(n>0) R.ACTS.spAlloc({tree:t,amount:n});};
   A('life',3); A('sword',20); A('life',20); A('magic',20);
   const order=['ult','multi','strike','meteor','thunder','fireball','berserk','blizzard'];
   const heal=['fullheal','heal']; const slots=[null,null,null];
   const h=heal.find(x=>p.skills[x]); if(h) slots[0]=h;
   const atk=order.filter(x=>p.skills[x]).slice(0,2); atk.forEach((x,i)=>slots[i+1]=x);
   p.equippedSkills=slots; };
 const town=()=>{const p=G.p; R.equipBest(); 
   for(const it of [p.weapon,p.armor]){ if(it&&it.star<5){ for(let k=0;k<3;k++){ if(p.gold>=R.smithCost(it)&&(!R.STONE_REQ[it.star]||(p.stones[R.STONE_REQ[it.star]]||0)>0)) R.smithUpgrade(it.id);} } }
   for(const it of p.bag.slice()){ if(it.star<5){ } }
   // 売却
   const t=p.bag.filter(it=>!it.locked&&it.rarity<=1); p.bag=p.bag.filter(it=>!t.includes(it)); p.gold+=t.reduce((a,b)=>a+R.sellValue(b),0);
   if(p.bag.length>50){p.bag.sort((a,b)=>a.star-b.star);p.bag=p.bag.slice(-40);}
   spPlan(); p.hp=R.maxHp(p); p.mp=R.maxMp(p); };
 let guard=0;
 while(cells.some(c=>!c.cleared)&&guard++<4000){
   town(); const p=G.p;
   const pend=cells.filter(c=>!c.cleared); const t=pend[0];
   let target; if(p.lv>=t.rec+t.fail*2-2) target=t; else { const ok=cells.filter(c=>c.rec<=p.lv+2); target=ok.length?ok[ok.length-1]:cells[0]; }
   const lv0=p.lv; R.startRun(target.d,target.df); runs++;
   while(G.run){ const hpR=G.p.hp/R.maxHp(G.p);
     if(hpR<0.3&&G.p.potions.hp>0) R.usePotion('hp');
     else if(hpR<0.2&&G.run.floor<G.run.floors-1&&G.run.phase!=='battle'){ R.ACTS.retreat(); retreats++; break; }
     R.tick(); ticks++; if(ticks>2000000) break; }
   const L=G.last; 
   if(L&&L.result==='clear'){ target.cleared=true; }
   else if(L&&L.result==='defeat'){ defeats++; target.fail++; }
   if(runs%10===0) log.push([runs,p.lv,ticks]);
 }
 return {done:!cells.some(c=>!c.cleared),runs,defeats,retreats,ticks,lv:G.p.lv,gold:G.p.gold,log:log.slice(-6),
   x4_min_game:Math.round(ticks*650/4/60000*10)/10, overhead_min:Math.round(runs*20/60*10)/10};
}
"""
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+HTML); pg.wait_for_timeout(400)
    for seed in (1,2,3):
        r=pg.evaluate(BOT,seed); print(json.dumps(r,ensure_ascii=False)); 
    print(errs); b.close()
