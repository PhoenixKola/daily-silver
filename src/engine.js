import {SPECIES, INDEX, MOVES, BOSS, BOSS_LEVELS, SPECIAL, effectiveness, ITEMS} from './data.js';
export const APP_ID='daily-silver-v1';
export const DAY_KEY=()=>new Date().toISOString().slice(0,10);
export const hash=(str)=>{let h=2166136261;for(const c of str){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};
export function rand(b){b.rng=(Math.imul(b.rng,1664525)+1013904223)>>>0;return b.rng/4294967296;}
const pick=(b,arr)=>arr[Math.floor(rand(b)*arr.length)];
const freshBoost=()=>({atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0});
export function specimen(name,level=81,item='Leftovers'){
 const d=SPECIES.find(s=>s.name===name)||INDEX[name?.toLowerCase()];if(!d)throw Error('Unknown species: '+name);
 // Classic two-stat categories with stable 15 DVs, intentionally simplified stat experience.
 const stats={};for(const [k,v] of Object.entries(d.base)) stats[k]=k==='hp'?Math.floor((2*v+15)*level/100)+level+10:Math.floor((2*v+15)*level/100)+5;
 return {id:d.id,dex:d.dex,name:d.name,types:d.types,level,item,maxHp:stats.hp,hp:stats.hp,stats,status:'',sleep:0,toxic:0,confused:0,flinch:false,protect:false,charge:'',recharge:false,boost:freshBoost(), lastDamage:null, lastMove:'', substitute:0, protectStreak:0, trapped:false, moves:d.moves.map(name=>({name,pp:MOVES[name].pp,maxPp:MOVES[name].pp}))};
}
export function dailySeed(date=DAY_KEY()){return hash('DAILY-SILVER/2/'+date)}
const excluded=new Set([...BOSS,'Mewtwo','Lugia','Ho-Oh','Mew','Celebi','Raikou','Entei','Suicune','Zapdos','Articuno','Moltres','Dragonite']);
const candidates=SPECIES.filter(s=>!excluded.has(s.name));
export function createRun({mode='daily',date=DAY_KEY(),seed}={}){
 const rng=seed===undefined?(mode==='daily'?dailySeed(date):((Date.now()^Math.floor(Math.random()*2147483647))>>>0)):seed>>>0;
 const b={version:1,mode,date,seed:rng,rng,phase:'battle',turn:1,startedAt:Date.now(),elapsedMs:0, lastAt:Date.now(), player:[],foe:[],pActive:0,eActive:0,log:[],history:[],highlights:[],winner:'',screens:{p:{reflect:0,lightScreen:0},e:{reflect:0,lightScreen:0}},spikes:{p:0,e:0},pendingSwitch:false,shake:'',visualEvents:[],startRng:rng};
 let remaining=[...candidates];
 for(let i=0;i<6;i++){
  let pool=remaining.filter(s=>{const total=Object.values(s.base).reduce((x,y)=>x+y,0);return i===0?total>450:i===5?total<475:true});if(!pool.length)pool=remaining;
  const s=pick(b,pool);remaining=remaining.filter(x=>x.id!==s.id);
  const level=79+Math.floor(rand(b)*8);const item=pick(b,ITEMS);b.player.push(specimen(s.name,level,item));
 }
 BOSS.forEach((n,i)=>{const a=specimen(n,BOSS_LEVELS[i],i===0?'Light Ball':'Leftovers'); b.foe.push(a)});
 log(b,'A new save file appears on the frozen summit.');
 log(b,`${b.player[0].name} was sent out! RED sent out PIKACHU!`);
 return b;
}
let causeCtx='';const sideOf=(b,p)=>b.player.includes(p)?'p':'e';const indexOf=(b,p)=>b.player.includes(p)?b.player.indexOf(p):b.foe.indexOf(p);
export function visual(b,kind,details={}){const cue={kind,...details};if(causeCtx&&cue.cause===undefined)cue.cause=causeCtx;(b.visualEvents??=[]).push(cue);return cue;}
export function log(b,text,kind=''){b.log.push({turn:b.turn,text,kind});if(b.log.length>140)b.log.splice(0,b.log.length-140);}
export function active(b,side){return side==='p'?b.player[b.pActive]:b.foe[b.eActive]}
export const alive=(team)=>team.filter(x=>x.hp>0).length;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function speed(p){let v=p.stats.spe*stage(p.boost.spe);if(p.status==='par')v=Math.floor(v/4);return Math.max(1,v)}
const stage=(v)=>v>=0?(2+v)/2:2/(2-v);

function hitStatus(b,target,status){
 if(status==='confused'){target.confused=2+Math.floor(rand(b)*3);log(b,`${target.name} became confused!`,'status');visual(b,'status',{side:sideOf(b,target),index:indexOf(b,target),status});return true}
 if(target.status||status==='flinch'&&target.hp===0)return false;
 // In Gen II Electric types are not inherently immune to paralysis.
 if(status==='brn'&&target.types.includes('Fire'))return false;
 if((status==='psn'||status==='tox')&&(target.types.includes('Poison')||target.types.includes('Steel')))return false;
 if(status==='frz'&&target.types.includes('Ice'))return false;
 if(status==='slp'){target.status='slp';target.sleep=2+Math.floor(rand(b)*2)}else target.status=status;
 log(b,`${target.name} is ${ {par:'paralyzed',brn:'burned',psn:'poisoned',tox:'badly poisoned',frz:'frozen',slp:'asleep'}[status]||status}!`,'status');visual(b,'status',{side:sideOf(b,target),index:indexOf(b,target),status});return true;
}
function effectText(e){return e===0?'It had no effect.':e>=4?'It was devastatingly effective!':e>=2?"It's super effective!":e<1?"It's not very effective…":''}
export function estimateDamage(m,att,def){
 if(!m.power)return 0;
 const atkStat=SPECIAL.has(m.type)?'spa':'atk';const defStat=SPECIAL.has(m.type)?'spd':'def';
 let atk=att.stats[atkStat]*stage(att.boost[atkStat]);if(att.status==='brn'&&atkStat==='atk')atk*=.5;
 if(att.item==='Light Ball'&&att.name==='Pikachu'&&atkStat==='spa')atk*=2;
 if(att.item==='Thick Club'&&att.name==='Marowak'&&atkStat==='atk')atk*=2;
 const den=def.stats[defStat]*stage(def.boost[defStat]);
 let mult=effectiveness(m.type,def.types)*(att.types.includes(m.type)?1.5:1);
 const itemTypes={'Mystic Water':'Water','Charcoal':'Fire',Magnet:'Electric','Soft Sand':'Ground','NeverMeltIce':'Ice','Spell Tag':'Ghost','Black Glasses':'Dark','Metal Coat':'Steel','Pink Bow':'Normal','Miracle Seed':'Grass','Poison Barb':'Poison','Twisted Spoon':'Psychic','Hard Stone':'Rock','Silver Powder':'Bug','Sharp Beak':'Flying'};
 if(itemTypes[att.item]===m.type)mult*=1.1;
 return Math.max(1,Math.floor(((2*att.level/5+2)*m.power*Math.max(1,atk)/Math.max(1,den)/50+2)*mult*.925));
}
function boostStats(b,target,boosts){visual(b,'buff',{side:sideOf(b,target),index:indexOf(b,target),boosts:{...boosts}});for(const [k,v] of Object.entries(boosts)){target.boost[k]=clamp(target.boost[k]+v,-6,6)}log(b,`${target.name}'s stats shifted!`,'status')}
const DAMAGE_CAUSES=[[/recoil/,'recoil'],[/spikes/,'spikes'],[/condition/,'status'],[/toxic/,'status'],[/curse/,'curse'],[/seeds/,'seed'],[/confusion/,'confusion'],[/crashed/,'crash'],[/exploded/,'explode'],[/substitute/,'cost'],[/sacrificed/,'cost']];
const causeOfReason=r=>r?(DAMAGE_CAUSES.find(([re])=>re.test(r))?.[1]||'other'):undefined;
function takeDamage(b,p,damage,reason){let old=p.hp;const d=Math.max(1,Math.floor(damage));if(p.substitute>0&&!reason){p.substitute=Math.max(0,p.substitute-d);log(b,`${p.name}'s substitute absorbed the damage!`,'effect');return 0;}let next=clamp(p.hp-d,0,p.maxHp);if(!reason&&p.item==='Focus Band'&&next===0&&old>1&&rand(b)<.1){next=1;log(b,`${p.name} held on with its Focus Band!`,'effect')}p.hp=next;if(old!==p.hp)visual(b,'damage',{side:sideOf(b,p),index:indexOf(b,p),hp:p.hp,amount:old-p.hp,...(reason?{cause:causeOfReason(reason)}:{})});if(reason)log(b,`${p.name} ${reason} (${old-p.hp} HP).`,'damage');return old-p.hp}
const HEAL_CAUSES=[[/drained/,'drain'],[/absorbed/,'seed'],[/Gold Berry/,'item'],[/recovered/,'recover']];
function heal(b,p,value,reason){let before=p.hp;p.hp=clamp(p.hp+Math.max(1,Math.floor(value)),0,p.maxHp);visual(b,'heal',{side:sideOf(b,p),index:indexOf(b,p),hp:p.hp,amount:p.hp-before,cause:HEAL_CAUSES.find(([re])=>re.test(reason))?.[1]||'recover'});log(b,`${p.name} ${reason} ${p.hp-before} HP.`,'heal')}
function chooseFoe(b){const a=active(b,'e'),t=active(b,'p');const valid=a.moves.map((m,i)=>({...MOVES[m.name],i})).filter(m=>a.moves[m.i].pp>0);if(!valid.length)return 0;
 const scores=valid.map(m=>{
 let score=m.power?estimateDamage(m,a,t)*(m.accuracy/100):0; if(m.fixed||m.special==='fixedLevel')score=a.level; if(m.special==='explosion')score=estimateDamage(m,a,t)*(alive(b.foe)===1?1.3:.48);if(m.special==='counter'||m.special==='mirrorCoat')score=a.hp<a.maxHp*.6?20:9;
 if(m.heal)score=(a.hp/a.maxHp<.46?110:-20);
 if(m.status&&!m.power)score=t.status?0:60;
 if(m.boost&&!m.power)score=b.turn<5?44:12;
 if(m.special==='protect')score=8;
 if(m.power&&score>=t.hp)score+=90; if(m.power&&effectiveness(m.type,t.types)===0)score=-100;
 return score+rand(b)*22;});return valid[scores.indexOf(Math.max(...scores))].i;
}
// Lightweight deterministic rival AI: prefer finishing blows, utility at low HP,
// and occasional defensive switches into a significantly better matchup.
function chooseFoeAction(b){
 const index=chooseFoe(b),mon=active(b,'e'),target=active(b,'p');
 const now=mon.moves.map(x=>MOVES[x.name]).filter(m=>m&&m.power).reduce((max,m)=>Math.max(max,estimateDamage(m,mon,target)),0);
 if(b.turn>=3&&b.turn-(b.aiLastSwitch??-99)>=4&&alive(b.foe)>1&&now<target.hp*.37&&mon.hp/mon.maxHp<.72){
  let winner=-1,best=now;
  for(let i=0;i<b.foe.length;i++){
   const candidate=b.foe[i];if(i===b.eActive||candidate.hp<=0)continue;
   const power=candidate.moves.map(x=>MOVES[x.name]).filter(m=>m?.power).reduce((max,m)=>Math.max(max,estimateDamage(m,candidate,target)),0);
   // Resist incoming attacks to reward strategic switches rather than mere damage.
   const danger=target.moves.map(x=>MOVES[x.name]).filter(m=>m?.power).reduce((max,m)=>Math.max(max,estimateDamage(m,target,candidate)),0);
   const value=power-(danger*.23);
   if(value>best*1.45){best=value;winner=i;}
  }
  if(winner>=0&&rand(b)<.62){b.aiLastSwitch=b.turn;log(b,'RED considers the matchup...','prompt');return {kind:'switch',index:winner}}
 }
 return {kind:'move',index};
}
function canAct(b,a){
 if(a.recharge){a.recharge=false;visual(b,'denied',{side:sideOf(b,a),index:indexOf(b,a),why:'recharge'});log(b,`${a.name} must recharge!`);return false}
 if(a.status==='frz'){if(rand(b)<.15){a.status='';visual(b,'cure',{side:sideOf(b,a),index:indexOf(b,a),status:'frz'});log(b,`${a.name} thawed out!`,'heal')}else{visual(b,'denied',{side:sideOf(b,a),index:indexOf(b,a),why:'frz'});log(b,`${a.name} is frozen solid!`);return false}}
 if(a.status==='slp'){a.sleep--;if(a.sleep<=0){a.status='';visual(b,'cure',{side:sideOf(b,a),index:indexOf(b,a),status:'slp'});log(b,`${a.name} woke up!`)}else{visual(b,'denied',{side:sideOf(b,a),index:indexOf(b,a),why:'slp'});log(b,`${a.name} is fast asleep.`);return false}}
 if(a.status==='par'&&rand(b)<.25){visual(b,'denied',{side:sideOf(b,a),index:indexOf(b,a),why:'par'});log(b,`${a.name} is fully paralyzed!`);return false}
 if(a.flinch){a.flinch=false;visual(b,'denied',{side:sideOf(b,a),index:indexOf(b,a),why:'flinch'});log(b,`${a.name} flinched!`);return false}
 if(a.confused>0){a.confused--;if(a.confused===0)log(b,`${a.name} snapped out of confusion.`);else if(rand(b)<.5){takeDamage(b,a,Math.floor(a.maxHp/9),'hurt itself in confusion!');return false}}
 return true;
}
function execute(b,side,action,otherAlready=false){
 causeCtx='';try{return executeInner(b,side,action,otherAlready)}finally{causeCtx=''}}
function executeInner(b,side,action,otherAlready=false){
 const a=active(b,side),t=active(b,side==='p'?'e':'p');
 if(action.kind==='switch'){const team=side==='p'?b.player:b.foe;const i=action.index;if(!Number.isInteger(i)||i<0||i>=team.length||team[i].hp<=0)return; const prevIndex=side==='p'?b.pActive:b.eActive;if(a){a.seeded=false;a.trapped=false;a.cursed=false;a.boost=freshBoost();a.substitute=0;a.charge='';}if(side==='p')b.pActive=i;else b.eActive=i;visual(b,'switch',{side,index:i,from:prevIndex,name:team[i].name,voluntary:true});causeCtx='entry';log(b,`${side==='p'?'You':'RED'} sent out ${team[i].name}!`,'switch');const incoming=team[i],ss=side;if(b.spikes[ss]>0&&!incoming.types.includes('Flying'))takeDamage(b,incoming,incoming.maxHp/8,'was hurt by spikes');incoming.boost=freshBoost();causeCtx='';return}
 if(!a||a.hp<=0)return;
 const slot=a.moves[action.index];if(!slot)return;let move=MOVES[slot.name];let releasedCharge=false;if(a.charge){move=MOVES[a.charge];a.charge='';releasedCharge=true;}else if(slot.pp<=0){move={name:'Struggle',type:'Normal',power:50,accuracy:100,pp:1,recoil:.25}}else slot.pp--;
 if(move.special!=='sleepTalk'&&!canAct(b,a))return;
 if(move.special==='sleepTalk'){if(a.status!=='slp'){log(b,`${a.name} isn't sleeping.`);return}const other=a.moves.map((v,i)=>({...v,i})).filter(v=>v.name!=='Sleep Talk'&&v.name!=='Rest'&&MOVES[v.name].power>0);if(!other.length){log(b,'But nothing happened!');return}const called=pick(b,other);move=MOVES[called.name];log(b,`${a.name} called ${called.name} in its sleep!`,'move')}
 causeCtx='move';log(b,`${a.name} used ${move.name.toUpperCase()}!`,'move');const moveCue=visual(b,'move',{side,index:side==='p'?b.pActive:b.eActive,move:move.name,type:move.type,power:move.power||0,offensive:!!(move.power||move.fixed||move.special==='fixedLevel'||move.special==='explosion'),outcome:'utility',targetSide:side==='p'?'e':'p'});
 if(move.special==='protect'){a.protectStreak=Number.isFinite(a.protectStreak)?a.protectStreak:0;const chance=1/Math.pow(2,a.protectStreak);a.protectStreak++;if(rand(b)<chance){a.protect=true;visual(b,'field',{side,what:'protect'});log(b,`${a.name} protected itself!`)}else {moveCue.outcome='failed';log(b,'PROTECT failed!')}return}a.protectStreak=0;
 if(move.special==='spikes'){b.spikes[side==='p'?'e':'p']=1;visual(b,'field',{side:side==='p'?'e':'p',what:'spikes'});log(b,'Spikes scattered across the opposing field!');return}
 if(move.special==='reflect'||move.special==='lightScreen'){if(typeof b.screens[side]==='number')b.screens[side]={reflect:b.screens[side],lightScreen:b.screens[side]};b.screens[side][move.special]=5;visual(b,'field',{side,what:move.special});log(b,`${a.name} raised a ${move.special==='reflect'?'physical':'special'} barrier!`);return}
 if(move.special==='seed'){if(t.types.includes('Grass')){log(b,'Grass types resist the seeds!');return}if(!t.seeded){t.seeded=true;visual(b,'field',{side:side==='p'?'e':'p',what:'seed'});log(b,`${t.name} was seeded!`,'status')}else log(b,'The target is already seeded.');return}
 if(move.special==='trap'){t.trapped=true;visual(b,'field',{side:side==='p'?'e':'p',what:'trap'});log(b,`${t.name} can no longer escape!`);return}
 if(move.special==='substitute'){if(a.substitute>0||a.hp<=a.maxHp/4){log(b,'But it failed!');return}const price=Math.max(1,Math.floor(a.maxHp/4));takeDamage(b,a,price,'created a substitute');a.substitute=price;visual(b,'field',{side,what:'substitute'});return}
 if(move.special==='painSplit'){const average=Math.floor((a.hp+t.hp)/2);a.hp=Math.min(a.maxHp,average);t.hp=Math.min(t.maxHp,average);visual(b,'status',{side});log(b,'The battlers shared their pain!');return}
 if(move.special==='curse'&&a.types.includes('Ghost')){takeDamage(b,a,Math.floor(a.maxHp/2),'sacrificed health');t.cursed=true;visual(b,'field',{side:side==='p'?'e':'p',what:'curse'});log(b,`${t.name} was cursed!`,'status');return}
 if(move.special==='curse'){boostStats(b,a,{atk:1,def:1,spe:-1});return}
 if(move.charge&&!releasedCharge){a.charge=move.name;moveCue.outcome='charge';log(b,`${a.name} began charging!`);return}
 if(move.heal){if(a.hp===a.maxHp&&!a.status){log(b,'But its HP is already full.');return}moveCue.outcome='heal';heal(b,a,move.heal*a.maxHp,'recovered');if(move.sleepSelf){a.status='slp';a.sleep=move.sleepSelf;a.toxic=0}return}
 if(move.boost&&!move.power){moveCue.outcome='buff';boostStats(b,a,move.boost);return}
 if(move.targetBoost&&!move.power){moveCue.outcome='debuff';boostStats(b,t,move.targetBoost);return}
 if(move.status&&!move.power){if(t.substitute>0){moveCue.outcome='blocked';log(b,`${t.name}'s substitute blocked the status move!`);return}if(rand(b)*100<Math.min(100,move.accuracy*stage(a.boost.accuracy??0))){moveCue.outcome=hitStatus(b,t,move.status)?'utility':'failed';}else{moveCue.outcome='miss';visual(b,'miss',{side:moveCue.targetSide});log(b,'The move missed!')}return}
 if(move.special==='counter'||move.special==='mirrorCoat'){const hit=a.lastDamage;const category=move.special==='counter'?'physical':'special';if(hit&&hit.turn===b.turn&&hit.category===category){moveCue.outcome='hit';moveCue.offensive=true;const dealt=takeDamage(b,t,hit.amount*2);if(dealt>0&&t.hp===0)b.lastKnockout={turn:b.turn,side,actor:a.name,target:t.name,move:move.name,cue:moveCue};log(b,`${a.name} struck back for double damage!`)}else log(b,`${move.name} failed!`);return}
 if(!move.power&&!move.fixed&&move.special!=='fixedLevel'){log(b,'The move had no effect.');return}
 if(t.protect){moveCue.outcome='blocked';visual(b,'blocked',{side:moveCue.targetSide});log(b,`${t.name} protected itself!`);return}
 if(rand(b)*100>Math.min(100,move.accuracy*stage(a.boost.accuracy??0))){moveCue.outcome='miss';visual(b,'miss',{side:moveCue.targetSide});log(b,`${a.name}'s attack missed!`);if(move.missCrash)takeDamage(b,a,Math.max(1,Math.floor(a.maxHp/8)),'crashed after missing');return}
 const eff=effectiveness(move.type,t.types);
 if(eff===0){moveCue.outcome='immune';visual(b,'immune',{side:moveCue.targetSide});log(b,effectText(0));if(move.special==='explosion')takeDamage(b,a,a.hp,'exploded');return}
 const isFixed=move.special==='fixedLevel'||move.name==='Night Shade'||!!move.fixed;
 const crit=!isFixed&&rand(b)<(move.crit?.125:(a.item==='Scope Lens'?.125:.0625));
 let damage=(move.special==='fixedLevel'||move.name==='Night Shade')?a.level:move.fixed||estimateDamage(move,a,t);
 if(crit)damage=Math.floor(damage*2); // Gen II critical multiplier is 2x
 if(!isFixed)damage=Math.max(1,Math.floor(damage*(.85+rand(b)*.15)));
 const targetSide=side==='p'?'e':'p';const shield=b.screens[targetSide];const category=SPECIAL.has(move.type)?'special':'physical';if(!isFixed&&(typeof shield==='number'&&shield>0||typeof shield==='object'&&shield?.[category==='special'?'lightScreen':'reflect']>0)){damage=Math.max(1,Math.floor(damage*.5));moveCue.screened=category==='special'?'lightScreen':'reflect'}
 moveCue.outcome='hit';moveCue.effectiveness=eff;moveCue.critical=crit;if(crit)visual(b,'critical',{side:targetSide});const dealt=takeDamage(b,t,damage);if(dealt>0&&t.hp===0)b.lastKnockout={turn:b.turn,side,actor:a.name,target:t.name,move:move.name,cue:moveCue};if(dealt>0&&eff!==1)visual(b,'effectiveness',{side:targetSide,effectiveness:eff});t.lastDamage={turn:b.turn,amount:dealt,category,from:side};
 if(crit)log(b,'A critical hit!','critical');if(eff!==1)log(b,effectText(eff),'effect');
 if(move.status&&move.status!=='flinch'&&t.hp>0&&rand(b)*100<(move.chance??0)){
   hitStatus(b,t,move.status==='random'?pick(b,['par','brn','frz']):move.status);
 }
 if(move.targetBoost&&rand(b)*100<(move.chance??100))boostStats(b,t,move.targetBoost);
 if(move.boost&&rand(b)*100<(move.chance??100))boostStats(b,a,move.boost);
 if(move.drain)heal(b,a,Math.floor(dealt*move.drain),'drained');
 if(move.recoil)takeDamage(b,a,Math.max(1,dealt*move.recoil),'took recoil damage');
 if(move.special==='explosion'){takeDamage(b,a,a.hp,'exploded');}
 if(move.recharge)a.recharge=true;
 if(move.status==='flinch'&&t.hp>0&&rand(b)*100<(move.chance||0)&&!otherAlready)t.flinch=true;
 b.shake=side==='p'?'e':'p';
}
function residual(b,side){causeCtx='residual';try{residualInner(b,side)}finally{causeCtx=''}}
function residualInner(b,side){const a=active(b,side);if(!a||a.hp<=0)return;
 if(a.status==='brn'||a.status==='psn')takeDamage(b,a,a.maxHp/8,'was hurt by its condition');
 if(a.status==='tox'){a.toxic++;takeDamage(b,a,a.maxHp*Math.min(15,a.toxic)/16,'was hurt by toxic poison')}
 if(a.cursed)takeDamage(b,a,a.maxHp/4,'was hurt by the curse');
 if(a.seeded){const n=takeDamage(b,a,a.maxHp/8,'was sapped by seeds');const opp=active(b,side==='p'?'e':'p');if(opp&&opp.hp>0)heal(b,opp,n,'absorbed')}
 if(a.hp<=0)return;
 if(a.item==='Leftovers')healSilent(b,a,Math.floor(a.maxHp/16));
 if(a.item==='Gold Berry'&&a.hp/a.maxHp<.5){heal(b,a,30,'ate its Gold Berry and restored');a.item='(used)'}
 if(a.item==='Miracle Berry'&&a.status){a.status='';a.sleep=0;a.toxic=0;a.item='(used)';visual(b,'cure',{side:sideOf(b,a),index:indexOf(b,a),status:'berry'});log(b,`${a.name}'s Miracle Berry cured its condition!`,'heal')}
}
function healSilent(b,a,n){if(a.hp<a.maxHp){const old=a.hp;a.hp=Math.min(a.maxHp,a.hp+Math.max(1,n));visual(b,'heal',{side:sideOf(b,a),index:indexOf(b,a),hp:a.hp,amount:a.hp-old,cause:'leftovers'});log(b,`${a.name}'s Leftovers restored HP.`,'heal')}}
function decisiveMoment(b,side){const target=active(b,side==='p'?'e':'p');const hit=b.lastKnockout;const direct=hit&&hit.turn===b.turn&&hit.side===side&&hit.target===target?.name;
 if(direct)hit.cue.finisher=true;
 b.moment={turn:b.turn,kind:direct?'finisher':'final-faint',actor:direct?hit.actor:'',target:target?.name||'',move:direct?hit.move:''};
}
function faintCheck(b){for(const side of ['p','e']){const a=active(b,side);if(a&&a.hp<=0&&!a.announced){a.announced=true;visual(b,'faint',{side,index:side==='p'?b.pActive:b.eActive,name:a.name});log(b,`${a.name} fainted!`,'faint');const hit=b.lastKnockout;const direct=hit?.turn===b.turn&&hit.target===a.name;(b.highlights??=[]).push({turn:b.turn,side,index:side==='p'?b.pActive:b.eActive,name:a.name,actor:direct?hit.actor:'',move:direct?hit.move:''})}}
 if(alive(b.foe)===0){b.phase='won';b.winner='player';decisiveMoment(b,'p');log(b,'RED was defeated! The summit is yours.','win');return true}
 if(alive(b.player)===0){b.phase='lost';b.winner='red';decisiveMoment(b,'e');log(b,'Your party has fallen. The save file fades away.','loss');return true}
 return false;
}
function swapFoe(b){if(active(b,'e')?.hp>0)return;const next=b.foe.findIndex(x=>x.hp>0);if(next===-1)return;b.eActive=next;const n=active(b,'e');visual(b,'switch',{side:'e',index:next,name:n.name,voluntary:false});causeCtx='entry';log(b,`RED sent out ${n.name}!`,'switch');if(b.spikes.e>0&&!n.types.includes('Flying'))takeDamage(b,n,n.maxHp/8,'was hurt by spikes');causeCtx=''}
export function turn(b,action){
 if(b.phase!=='battle')return false;
 b.visualEvents=[];b.lastKnockout=null;
 if(b.pendingSwitch){if(action.kind!=='switch')return false;const i=action.index;
 if(i===b.pActive||!Number.isInteger(i)||!b.player[i]||b.player[i].hp<=0)return false;
 execute(b,'p',action);b.pendingSwitch=false;b.turn++;return true;
 }
 const p=active(b,'p');if(action.kind==='move'&&(!Number.isInteger(action.index)||action.index<0||action.index>=4||p.moves[action.index].pp<=0&&p.moves.some(x=>x.pp>0)))return false;
 if(action.kind==='switch'&&(action.index===b.pActive||!b.player[action.index]||b.player[action.index].hp<=0||p.trapped))return false;
 const foeAction=chooseFoeAction(b);const foeMoveIndex=foeAction.kind==='move'?foeAction.index:0;
 const foe=active(b,'e');const playerPriority=action.kind==='switch'?6:MOVES[p.moves[action.index].name]?.priority||0;
 const foePriority=foeAction.kind==='switch'?6:(MOVES[foe.moves[foeMoveIndex].name]?.priority||0);
 const quickP=p.item==='Quick Claw'&&rand(b)<.237,quickE=foe.item==='Quick Claw'&&rand(b)<.237;
 const first=playerPriority!==foePriority?(playerPriority>foePriority?'p':'e'):(quickP!==quickE?(quickP?'p':'e'):(speed(p)===speed(foe)?(rand(b)<.5?'p':'e'):(speed(p)>speed(foe)?'p':'e')));
 const second=first==='p'?'e':'p';
 b.order={first,reason:playerPriority!==foePriority?'priority':(quickP!==quickE?'quickclaw':(speed(p)===speed(foe)?'tie':'speed')),pSpeed:speed(p),eSpeed:speed(foe),pPriority:playerPriority,ePriority:foePriority};
 execute(b,first,first==='p'?action:foeAction);
 if(!faintCheck(b))execute(b,second,second==='p'?action:foeAction,true);
 faintCheck(b);
 if(b.phase==='battle'){
  for(const s of ['p','e'])residual(b,s);
  faintCheck(b);
  if(b.phase==='battle'){
    swapFoe(b);faintCheck(b);
    if(active(b,'p').hp<=0){b.pendingSwitch=true;log(b,'Choose a surviving partner to continue.','prompt')}
  }
 }
 for(const s of ['p','e']){if(typeof b.screens[s]==='number'){if(b.screens[s]>0)b.screens[s]--;}else{for(const k of ['reflect','lightScreen'])if(b.screens[s]?.[k]>0)b.screens[s][k]--;}const mon=active(b,s);if(mon){mon.protect=false;mon.flinch=false}}
 b.lastKnockout=null;b.turn++;b.history.push({turn:b.turn,p:alive(b.player),e:alive(b.foe)});
 return true;
}
export function pkmnColor(t){return {Normal:'#cbc5ab',Fire:'#ff7658',Water:'#66a8df',Electric:'#f5c851',Grass:'#80c77b',Ice:'#95d8e8',Fighting:'#d96f68',Poison:'#ae83cc',Ground:'#cfaf74',Flying:'#9ebce6',Psychic:'#e59ab8',Bug:'#b7ce6c',Rock:'#c5b08c',Ghost:'#8e89ce',Dragon:'#889de4',Dark:'#796f86',Steel:'#9bc1ce'}[t]||'#aac'}
export function runSummary(b){return {mode:b.mode,date:b.date,seed:b.seed,won:b.phase==='won',turns:b.turn,remaining:alive(b.player),remainingHP:b.player.reduce((s,p)=>s+p.hp,0),party:b.player.map(x=>x.name),timestamp:Date.now(),...(b.moment?{recordVersion:2,moment:b.moment}:{})}}
export function battleScore(b){return Math.max(0,(b.phase==='won'?1000:0)+alive(b.player)*175+Math.round(b.player.reduce((s,x)=>s+x.hp/x.maxHp,0)*120)-b.turn*8)}
