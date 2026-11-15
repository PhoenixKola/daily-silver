// Converts one semantic beat into a timeline of cues with explicit phases:
// anticipation -> release -> contact -> resolution. Times are milliseconds at 1x speed.
// Pure: it never reads or writes battle state and never touches RNG.
import {familyOf,timingOf,isMelee} from './families.js';

const STATUS_TEXT={par:'was paralyzed',brn:'was burned',psn:'was poisoned',tox:'was badly poisoned',frz:'was frozen solid',slp:'fell asleep',confused:'became confused',flinch:'flinched'};
const DENIED_TEXT={frz:'is frozen solid',slp:'is fast asleep',par:'is fully paralyzed',flinch:'flinched',recharge:'must recharge'};
const RESIDUAL_TEXT={status:'was hurt by its condition',curse:'was hurt by the curse',seed:'was sapped by Leech Seed',spikes:'was hurt by the Spikes',confusion:'hurt itself in confusion',leftovers:'restored a little HP',item:'ate its berry',seed_heal:'absorbed the seeds'};
const STAT_NAMES={atk:'Attack',def:'Defense',spa:'Sp. Atk',spd:'Sp. Def',spe:'Speed',accuracy:'Accuracy'};
const FIELD_TEXT={reflect:'raised Reflect',lightScreen:'raised Light Screen',spikes:'scattered Spikes',seed:'was seeded',curse:'was cursed',trap:'was trapped',protect:'protected itself',substitute:'made a substitute'};

const up=s=>String(s||'').toUpperCase();
export const HITSTOP={normal:40,critical:90,finisher:150};

export function planBeat(beat,{names=()=>'',reduced=false,first=false}={}){
 const cues=[];let t=0;
 const add=(dt,kind,data={})=>{cues.push({t:dt,kind,...data});return dt};
 const name=(side,index)=>up(names(side,index));
 const scale=reduced?.25:1;

 if(beat.type==='exchange'){
  const family=familyOf(beat.move);
  const timing=timingOf(family);
  const A=Math.round(timing.anticipate*scale),F=Math.round(timing.flight*scale),S=Math.round(timing.settle*scale);
  const actor=name(beat.side,beat.index),target=name(beat.targetSide);
  const strong=beat.critical||beat.finisher;
  add(0,'caption',{side:beat.side,text:`${actor} used ${up(beat.move)}!`,tone:'move'});
  add(0,'anticipate',{side:beat.side,targetSide:beat.targetSide,family,move:beat.move,type:beat.moveType,ms:A,strong});
  t=A;
  const offensive=beat.offensive||beat.outcome==='hit'||beat.outcome==='miss'||beat.outcome==='immune'||beat.outcome==='blocked';
  if(beat.outcome==='charge'){
   add(t,'release',{side:beat.side,targetSide:beat.side,family:'stat',move:beat.move,type:beat.moveType,ms:F,outcome:'charge'});
   t+=F;add(t,'caption',{side:beat.side,text:`${actor} is gathering power!`,tone:'info'});
  }else if(offensive&&beat.outcome!=='utility'&&beat.outcome!=='failed'){
   add(t,'release',{side:beat.side,targetSide:beat.targetSide,family,move:beat.move,type:beat.moveType,ms:F,outcome:beat.outcome,finisher:beat.finisher});
   t+=F;
   if(beat.outcome==='hit'){
    const hit=beat.hits[beat.hits.length-1];
    const stop=reduced?0:(beat.finisher?HITSTOP.finisher:beat.critical?HITSTOP.critical:HITSTOP.normal);
    const parts=[];if(hit)parts.push(`-${hit.amount} HP`);
    if(beat.critical)parts.push('Critical hit');
    if(beat.effectiveness>=2)parts.push('Super effective');else if(beat.effectiveness>0&&beat.effectiveness<1)parts.push('Not very effective');
    if(beat.screened)parts.push(beat.screened==='reflect'?'Reflect halved it':'Light Screen halved it');
    add(t,'contact',{side:beat.side,targetSide:beat.targetSide,family,move:beat.move,type:beat.moveType,amount:hit?.amount??0,critical:beat.critical,effectiveness:beat.effectiveness,finisher:beat.finisher,hitstop:stop,screened:beat.screened});
    if(hit)add(t,'hp',{side:hit.side,index:hit.index,hp:hit.hp,mode:'damage'});
    add(t,'caption',{side:beat.targetSide,text:parts.join(' · ')||`${target} was hit.`,tone:strong?'strong':'result'});
    t+=stop;
   }else{
    const text=beat.outcome==='miss'?`${actor}'s attack missed.`:beat.outcome==='immune'?`It doesn't affect ${target}.`:`${target} protected itself.`;
    add(t,'deflect',{side:beat.side,targetSide:beat.targetSide,outcome:beat.outcome,family,type:beat.moveType});
    add(t,'caption',{side:beat.targetSide,text,tone:'deflect'});
   }
  }else{
   // utility: recovery, barrier, stat change, status infliction
   add(t,'release',{side:beat.side,targetSide:beat.targetSide,family,move:beat.move,type:beat.moveType,ms:F,outcome:beat.outcome});
   t+=F;
   if(beat.outcome==='failed')add(t,'caption',{side:beat.side,text:'But it failed!',tone:'deflect'});
   if(beat.outcome==='blocked'){add(t,'deflect',{side:beat.side,targetSide:beat.targetSide,outcome:'blocked',family,type:beat.moveType});add(t,'caption',{side:beat.targetSide,text:`${target}'s substitute blocked it.`,tone:'deflect'})}
   if(beat.outcome==='miss')add(t,'deflect',{side:beat.side,targetSide:beat.targetSide,outcome:'miss',family,type:beat.moveType});
  }
  // consequences
  let c=t+Math.round(120*scale);
  for(const s of beat.statuses){add(c,'status',{side:s.side,index:s.index,status:s.status});add(c,'caption',{side:s.side,text:`${name(s.side,s.index)} ${STATUS_TEXT[s.status]||'was affected'}!`,tone:'status'});c+=Math.round(260*scale)}
  for(const b of beat.buffs){const rising=Object.values(b.boosts||{}).reduce((x,y)=>x+y,0)>=0;const stat=Object.keys(b.boosts||{}).map(k=>STAT_NAMES[k]||k).join(' & ');add(c,'buff',{side:b.side,index:b.index,boosts:b.boosts,rising});add(c,'caption',{side:b.side,text:`${name(b.side,b.index)}'s ${stat||'stats'} ${rising?'rose':'fell'}!`,tone:'status'});c+=Math.round(260*scale)}
  for(const f of beat.fields){add(c,'field',{side:f.side,what:f.what});add(c,'caption',{side:f.side,text:`${f.what==='protect'||f.what==='substitute'||f.what==='reflect'||f.what==='lightScreen'||f.what==='spikes'?actor:name(f.side)} ${FIELD_TEXT[f.what]||'changed the field'}.`,tone:'status'});c+=Math.round(260*scale)}
  for(const h of beat.selfHeal){add(c,'selfHeal',{side:h.side,index:h.index,amount:h.amount,cause:h.cause,from:beat.targetSide,family});add(c,'hp',{side:h.side,index:h.index,hp:h.hp,mode:'heal'});add(c,'caption',{side:h.side,text:h.cause==='drain'?`${name(h.side,h.index)} drained ${h.amount} HP.`:`${name(h.side,h.index)} recovered ${h.amount} HP.`,tone:'heal'});c+=Math.round(300*scale)}
  for(const d of beat.selfDamage){add(c,'selfHit',{side:d.side,index:d.index,amount:d.amount,cause:d.cause});add(c,'hp',{side:d.side,index:d.index,hp:d.hp,mode:'damage'});add(c,'caption',{side:d.side,text:d.cause==='recoil'?`${name(d.side,d.index)} took recoil damage.`:d.cause==='explode'?`${name(d.side,d.index)} exploded!`:d.cause==='crash'?`${name(d.side,d.index)} crashed.`:d.cause==='confusion'?`${name(d.side,d.index)} hurt itself in confusion.`:`${name(d.side,d.index)} paid HP for it.`,tone:'recoil'});c+=Math.round(300*scale)}
  t=Math.max(t,c);
  for(const f of beat.faints||[]){t+=Math.round(120*scale);add(t,'faint',{side:f.side,index:f.index,name:f.name,finisher:beat.finisher});add(t,'caption',{side:f.side,text:`${up(f.name)} fainted!`,tone:'faint'});t+=Math.round((reduced?220:620));}
  add(t,'settle',{side:beat.side,targetSide:beat.targetSide});
  t+=S;
  return {cues,duration:t,family};
 }

 if(beat.type==='switch'){
  const incoming=up(beat.name);
  const R=Math.round(260*scale),I=Math.round(320*scale);
  if(beat.from!==undefined&&beat.from!==null&&beat.from!==beat.index)add(0,'switchOut',{side:beat.side,index:beat.from,ms:R});
  t=beat.from!==undefined&&beat.from!==null?R:0;
  add(t,'caption',{side:beat.side,text:beat.side==='p'?`Go, ${incoming}!`:`RED sent out ${incoming}!`,tone:'switch'});
  if(beat.side==='e'&&first&&!reduced){add(t,'intro',{side:beat.side,index:beat.index,name:beat.name});t+=900}
  add(t,'switchIn',{side:beat.side,index:beat.index,name:beat.name,first,ms:I,forced:beat.voluntary===false});
  t+=I;
  for(const d of beat.entryDamage||[]){add(t,'hazard',{side:d.side,index:d.index,amount:d.amount,cause:d.cause});add(t,'hp',{side:d.side,index:d.index,hp:d.hp,mode:'damage'});add(t,'caption',{side:d.side,text:`${name(d.side,d.index)} was hurt by the Spikes.`,tone:'recoil'});t+=Math.round(320*scale)}
  for(const f of beat.faints||[]){add(t,'faint',{side:f.side,index:f.index,name:f.name});add(t,'caption',{side:f.side,text:`${up(f.name)} fainted!`,tone:'faint'});t+=Math.round(620*scale)}
  add(t,'settle',{side:beat.side});t+=Math.round(180*scale);
  return {cues,duration:t,family:'switch'};
 }

 if(beat.type==='denied'){
  add(0,'denied',{side:beat.side,index:beat.index,why:beat.why});
  add(0,'caption',{side:beat.side,text:`${name(beat.side,beat.index)} ${DENIED_TEXT[beat.why]||'cannot act'}.`,tone:'deflect'});
  t=Math.round(560*scale);add(t,'settle',{side:beat.side});
  return {cues,duration:t+Math.round(120*scale),family:'denied'};
 }

 // residual: poison/burn/curse/seed/leftovers/status apply/cure/field
 const who=name(beat.side,beat.index);
 if(beat.damage){
  add(0,'tick',{side:beat.side,index:beat.index,cause:beat.cause});
  t=Math.round(260*scale);
  add(t,'selfHit',{side:beat.side,index:beat.index,amount:beat.damage.amount,cause:beat.cause});
  add(t,'hp',{side:beat.damage.side,index:beat.damage.index,hp:beat.damage.hp,mode:'damage'});
  add(t,'caption',{side:beat.side,text:`${who} ${RESIDUAL_TEXT[beat.cause]||'took damage'} (-${beat.damage.amount} HP).`,tone:'recoil'});
  t+=Math.round(300*scale);
 }else if(beat.heal){
  add(0,'tick',{side:beat.side,index:beat.index,cause:beat.cause});
  t=Math.round(200*scale);
  add(t,'selfHeal',{side:beat.side,index:beat.index,amount:beat.heal.amount,cause:beat.cause});
  add(t,'hp',{side:beat.heal.side,index:beat.heal.index,hp:beat.heal.hp,mode:'heal'});
  add(t,'caption',{side:beat.side,text:`${who} ${beat.cause==='seed'?'absorbed the seeds':beat.cause==='leftovers'?'restored a little HP':'recovered HP'} (+${beat.heal.amount}).`,tone:'heal'});
  t+=Math.round(260*scale);
 }else if(beat.cure){
  add(0,'cure',{side:beat.side,index:beat.index,status:beat.cure.status});
  add(0,'caption',{side:beat.side,text:`${who} ${beat.cure.status==='slp'?'woke up':beat.cure.status==='frz'?'thawed out':'was cured'}!`,tone:'heal'});
  t=Math.round(420*scale);
 }else if(beat.status){
  add(0,'status',{side:beat.side,index:beat.index,status:beat.status.status});
  add(0,'caption',{side:beat.side,text:`${who} ${STATUS_TEXT[beat.status.status]||'was affected'}!`,tone:'status'});
  t=Math.round(420*scale);
 }else if(beat.buff){
  add(0,'buff',{side:beat.side,index:beat.index,boosts:beat.buff.boosts,rising:Object.values(beat.buff.boosts||{}).reduce((x,y)=>x+y,0)>=0});
  t=Math.round(320*scale);
 }else if(beat.field){
  add(0,'field',{side:beat.field.side,what:beat.field.what});t=Math.round(320*scale);
 }
 for(const f of beat.faints||[]){add(t,'faint',{side:f.side,index:f.index,name:f.name});add(t,'caption',{side:f.side,text:`${up(f.name)} fainted!`,tone:'faint'});t+=Math.round(620*scale)}
 add(t,'settle',{side:beat.side});
 return {cues,duration:t+Math.round(120*scale),family:'residual'};
}

export function planSequence(beats,opts={}){
 const out=[];let offset=0;const seen=new Set(opts.seenFoes||[]);
 for(const beat of beats){
  const first=beat.type==='switch'&&beat.side==='e'&&!seen.has(beat.index);
  if(beat.type==='switch'&&beat.side==='e')seen.add(beat.index);
  const plan=planBeat(beat,{...opts,first});
  for(const cue of plan.cues)out.push({...cue,t:cue.t+offset});
  offset+=plan.duration+(opts.reduced?0:70);
  opts.advance?.(beat);
 }
 return {cues:out,duration:offset,summary:summarize(beats,opts)};
}

export function summarize(beats,{names=()=>''}={}){
 const last=[...beats].reverse().find(b=>b.type==='exchange');
 if(!last)return '';
 const actor=up(names(last.side,last.index));
 return last.outcome==='hit'?`${actor} used ${up(last.move)}.`:`${actor} used ${up(last.move)}. ${last.outcome==='miss'?'It missed.':last.outcome==='immune'?'It had no effect.':last.outcome==='blocked'?'It was blocked.':''}`.trim();
}

export {isMelee};
