import {MOVES,effectiveness} from './data.js';

// A counter is an available damaging move with a type advantage against the
// currently visible opponent. Fixed-damage and status moves do not qualify.
export function moveMatchup(slot,target){
 const move=MOVES[slot?.name];
 if(!move||!target)return {kind:'unknown',multiplier:1,label:'MATCHUP UNKNOWN'};
 if(move.fixed||move.special==='fixedLevel'){
  const multiplier=effectiveness(move.type,target.types);
  return multiplier===0?{kind:'immune',multiplier:0,label:'NO EFFECT · ×0'}:{kind:'fixed',multiplier:1,label:'FIXED DAMAGE'};
 }
 if(!move.power)return {kind:'utility',multiplier:1,label:'STATUS / UTILITY'};
 const multiplier=effectiveness(move.type,target.types);
 const kind=multiplier===0?'immune':multiplier>1?'counter':multiplier<1?'resisted':'neutral';
 const label=kind==='immune'?'NO EFFECT · ×0':kind==='counter'?`SUPER EFFECTIVE · ×${multiplier}`:kind==='resisted'?`RESISTED · ×${multiplier}`:'NEUTRAL · ×1';
 return {kind,multiplier,label};
}

export function bestCounter(mon,target){
 if(!mon||mon.hp<=0||!target)return null;
 const choices=mon.moves.flatMap(slot=>{
  if(slot.pp<=0)return [];
  const matchup=moveMatchup(slot,target);
  if(matchup.kind!=='counter')return [];
  const move=MOVES[slot.name];
  return [{name:slot.name,multiplier:matchup.multiplier,rank:matchup.multiplier*move.power*move.accuracy/100}];
 });
 return choices.sort((a,b)=>b.rank-a.rank)[0]||null;
}
