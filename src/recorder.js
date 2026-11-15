// Versioned battle recordings for real playback. A recording stores explicit presentation events and
// state snapshots (not engine internals), so it stays playable if the battle rules change later.
// Older records without a recording keep their text recap only.
import {compactEvent} from './pres/beats.js';

export const REPLAY_VERSION=2;
export const MAX_TURNS=160;
export const MAX_BYTES=110_000;
export const MAX_STORED=10;
const DATE=/^\d{4}-\d{2}-\d{2}$/;

export const replayId=run=>run.mode==='daily'?`daily:${run.date}`:'practice';
export const replayKey=id=>`replay:${id}`;

const monHead=m=>({id:m.id,dex:m.dex,name:m.name,types:[...m.types],level:m.level,maxHp:m.maxHp,hp:m.hp,item:m.item||''});
const fieldOfRun=(run,side)=>{const s=run.screens?.[side];const r=typeof s==='number'?s:s?.reflect||0,l=typeof s==='number'?s:s?.lightScreen||0;return [r,l,run.spikes?.[side]||0]};

export function startRecording(run){
 return {v:REPLAY_VERSION,id:replayId(run),mode:run.mode,date:run.date,seed:run.seed,created:Date.now(),
  player:run.player.map(monHead),foe:run.foe.map(monHead),pActive:run.pActive,eActive:run.eActive,
  turns:[],truncated:false,result:null};
}

// Call once per committed turn, after engine.turn() succeeded.
export function recordTurn(rec,after,action){
 if(!rec||rec.truncated)return rec;
 if(rec.turns.length>=MAX_TURNS){rec.truncated=true;return rec}
 const entry={n:after.turn-1,a:{kind:action.kind,index:action.index},ev:(after.visualEvents||[]).map(compactEvent),
  pa:after.pActive,ea:after.eActive,
  hp:{p:after.player.map(m=>m.hp),e:after.foe.map(m=>m.hp)},
  st:{p:after.player.map(m=>m.status||''),e:after.foe.map(m=>m.status||'')},
  fd:{p:fieldOfRun(after,'p'),e:fieldOfRun(after,'e')}};
 rec.turns.push(entry);
 if(JSON.stringify(rec).length>MAX_BYTES){rec.turns.pop();rec.truncated=true}
 return rec;
}
export function finishRecording(rec,run){
 if(!rec)return rec;
 rec.result={won:run.phase==='won',turns:run.turn-1,moment:run.moment||null,remaining:run.player.filter(m=>m.hp>0).length};
 return rec;
}

// Rebuild a displayable battle state (shape expected by the stage) after `turnIndex` recorded turns.
export function stateAt(rec,turnIndex){
 const t=Math.max(0,Math.min(rec.turns.length,turnIndex));
 const last=t>0?rec.turns[t-1]:null;
 const build=(team,side)=>team.map((m,i)=>({...m,hp:last?last.hp[side][i]:m.hp,status:last?last.st[side][i]:'',confused:0,seeded:false,cursed:false,trapped:false,substitute:0,boost:{atk:0,def:0,spa:0,spd:0,spe:0,accuracy:0},moves:[]}));
 const fd=last?.fd||{p:[0,0,0],e:[0,0,0]};
 return {player:build(rec.player,'p'),foe:build(rec.foe,'e'),pActive:last?last.pa:rec.pActive,eActive:last?last.ea:rec.eActive,
  screens:{p:{reflect:fd.p[0],lightScreen:fd.p[1]},e:{reflect:fd.e[0],lightScreen:fd.e[1]}},spikes:{p:fd.p[2],e:fd.e[2]},turn:t+1};
}

// Turns containing knockouts, for the timeline and jump buttons.
export function knockoutMarkers(rec){
 const marks=[];
 rec.turns.forEach((turn,i)=>{for(const ev of turn.ev)if(ev.kind==='faint')marks.push({turn:i,side:ev.side,index:ev.index,name:ev.name})});
 return marks;
}
export function decisiveTurnIndex(rec){
 for(let i=rec.turns.length-1;i>=0;i--)if(rec.turns[i].ev.some(ev=>ev.kind==='faint'))return i;
 return Math.max(0,rec.turns.length-1);
}

const isInt=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
export function validateReplay(rec){
 const fail=m=>{throw Error('Invalid replay: '+m)};
 if(!rec||typeof rec!=='object')fail('not an object');
 if(rec.v!==REPLAY_VERSION)fail('unsupported version');
 if(!['daily','practice'].includes(rec.mode)||!DATE.test(rec.date||''))fail('mode/date');
 for(const side of ['player','foe']){
  if(!Array.isArray(rec[side])||rec[side].length!==6)fail(side+' roster');
  for(const m of rec[side])if(!m||typeof m.name!=='string'||m.name.length>40||!isInt(m.maxHp,1,2000)||!isInt(m.hp,0,2000)||!Array.isArray(m.types)||m.types.length>2||!isInt(m.level,1,100))fail('mon');
 }
 if(!Array.isArray(rec.turns)||rec.turns.length>MAX_TURNS)fail('turns');
 for(const t of rec.turns){
  if(!t||!isInt(t.n,1,100000)||!Array.isArray(t.ev)||t.ev.length>80)fail('turn');
  if(!isInt(t.pa,0,5)||!isInt(t.ea,0,5))fail('active');
  for(const side of ['p','e'])if(!Array.isArray(t.hp?.[side])||t.hp[side].length!==6||!t.hp[side].every(v=>isInt(v,0,2000)))fail('hp');
  for(const ev of t.ev)if(!ev||typeof ev.kind!=='string'||ev.kind.length>20)fail('event');
 }
 if(JSON.stringify(rec).length>MAX_BYTES*1.2)fail('too large');
 return rec;
}
export function pruneIndex(index,newId,limit=MAX_STORED){
 const next=[newId,...index.filter(id=>id!==newId)];
 return {keep:next.slice(0,limit),drop:next.slice(limit)};
}
