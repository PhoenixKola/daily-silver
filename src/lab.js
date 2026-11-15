// Practice Laboratory logic. Laboratory help (undo, compare, explanations) exists only for practice
// runs and is flagged on the run (run.lab). It works by snapshotting the whole run, including the RNG
// state, so repeating or comparing a decision can never silently change random outcomes.
import {createRun,turn,active} from './engine.js';
import {buildBeats} from './pres/beats.js';
import {MOVES,effectiveness} from './data.js';

export const LAB_UNDO_LIMIT=24;

export const clone=value=>structuredClone(value);
export const isLab=run=>!!(run&&run.mode==='practice'&&run.lab);

export function startLab(options={}){
 const {seed,date,focus}=options;
 let run=createRun({mode:'practice',date,seed});
 run.lab={v:1,undos:0,retries:0,focus:null};
 if(Number.isInteger(focus)&&focus>0&&focus<run.foe.length)run=focusOpponent(run,focus);
 return run;
}

// Re-deal the opponent so the chosen one fights first; the rest follow in their usual order.
export function focusOpponent(run,index){
 const next=clone(run);
 if(!Number.isInteger(index)||index<0||index>=next.foe.length)return next;
 const [chosen]=next.foe.splice(index,1);next.foe.unshift(chosen);
 next.eActive=0;next.lab={...(next.lab||{v:1,undos:0,retries:0}),focus:chosen.name};
 next.log=[{turn:1,text:`Practice lab: RED opens with ${chosen.name}.`,kind:''}];
 return next;
}

export function createLabSession(){return {stack:[],redo:[]}}

// Take a snapshot immediately before a decision is applied.
export function remember(session,run){
 session.stack.push(clone(run));
 if(session.stack.length>LAB_UNDO_LIMIT)session.stack.shift();
 session.redo.length=0;
}
export const canUndo=session=>session.stack.length>0;
export function undo(session,current){
 const previous=session.stack.pop();
 if(!previous)return null;
 session.redo.push(clone(current));
 previous.lab={...(previous.lab||{v:1,retries:0}),undos:(current.lab?.undos||0)+1};
 return previous;
}
export function redo(session,current){
 const next=session.redo.pop();if(!next)return null;
 session.stack.push(clone(current));return next;
}

// Same initial team and seed. Every random outcome repeats exactly when the same choices are made.
export function retry(run){
 const fresh=createRun({mode:'practice',date:run.date,seed:run.seed});
 fresh.lab={v:1,undos:0,retries:(run.lab?.retries||0)+1,focus:null};
 return run.lab?.focus?focusOpponent(fresh,fresh.foe.findIndex(m=>m.name===run.lab.focus)):fresh;
}

const names={p:run=>run.player,e:run=>run.foe};
export function snapshotLine(run){
 const p=active(run,'p'),e=active(run,'e');
 return {turn:run.turn,player:{name:p.name,hp:p.hp,max:p.maxHp,status:p.status||''},foe:{name:e.name,hp:e.hp,max:e.maxHp,status:e.status||''},phase:run.phase,alive:{p:run.player.filter(m=>m.hp>0).length,e:run.foe.filter(m=>m.hp>0).length}};
}

// Evaluate alternatives from the same state *and the same RNG state*. The original run is untouched.
export function compare(run,actions){
 return actions.map(action=>{
  const trial=clone(run);
  const before=snapshotLine(trial),startTurn=trial.turn;
  const ok=turn(trial,action);
  if(!ok)return {action,ok:false};
  const after=snapshotLine(trial);
  const notes=trial.log.filter(l=>l.turn===startTurn).map(l=>l.text);
  return {action,ok:true,before,after,
   dealt:Math.max(0,before.foe.hp-after.foe.hp)+(trial.foe.filter(m=>m.hp<=0).length>run.foe.filter(m=>m.hp<=0).length?0:0),
   taken:Math.max(0,before.player.hp-after.player.hp),
   foeFainted:trial.foe.filter(m=>m.hp<=0).length-run.foe.filter(m=>m.hp<=0).length,
   allyFainted:trial.player.filter(m=>m.hp<=0).length-run.player.filter(m=>m.hp<=0).length,
   first:trial.order?.first||'',notes,phase:trial.phase};
 });
}

const REASONS={priority:p=>`it used a higher-priority move (priority ${p})`,quickclaw:()=>'Quick Claw activated',speed:()=>'it is faster',tie:()=>'speeds were tied and the order was random'};
// Plain-language reasons for what happened in the last turn (immunity, order, barriers, failures).
export function explainTurn(before,after){
 const out=[];
 const nm=(side,index)=>(side==='p'?before.player:before.foe)[index]?.name||(side==='p'?'Your Pokémon':'Red\'s Pokémon');
 const o=after.order;
 if(o&&after.visualEvents?.some(e=>e.kind==='move')){
  const firstName=o.first==='p'?nm('p',before.pActive):nm('e',before.eActive);
  const reason=o.reason==='priority'?REASONS.priority(o.first==='p'?o.pPriority:o.ePriority):o.reason==='speed'?`${REASONS.speed()} (${o.first==='p'?o.pSpeed:o.eSpeed} vs ${o.first==='p'?o.eSpeed:o.pSpeed})`:REASONS[o.reason]();
  out.push({tone:'order',text:`${firstName} moved first: ${reason}.`});
 }
 for(const beat of buildBeats(after.visualEvents||[])){
  if(beat.type==='denied')out.push({tone:'fail',text:`${nm(beat.side,beat.index)} could not act: ${{frz:'frozen solid',slp:'asleep',par:'fully paralyzed',flinch:'it flinched',recharge:'recharging after a powerful move'}[beat.why]||'unable to move'}.`});
  if(beat.type!=='exchange')continue;
  const target=(beat.targetSide==='p'?after.player[after.pActive]:after.foe[after.eActive]);
  if(beat.outcome==='immune'){
   const move=MOVES[beat.move];
   out.push({tone:'immune',text:`${beat.move} (${beat.moveType}) cannot affect ${target.name}: ${target.types.join('/')} is immune to ${beat.moveType} (×${effectiveness(beat.moveType,target.types)}).`});
  }
  if(beat.outcome==='blocked')out.push({tone:'barrier',text:`${beat.move} was stopped by ${target.substitute>0?'a substitute':'Protect'}.`});
  if(beat.outcome==='miss')out.push({tone:'fail',text:`${beat.move} missed: accuracy ${MOVES[beat.move]?.accuracy??'?'}% with the current accuracy stages.`});
  if(beat.outcome==='failed')out.push({tone:'fail',text:`${beat.move} failed: its condition was not met (already active, full HP, or a repeated Protect).`});
  if(beat.screened)out.push({tone:'barrier',text:`${beat.screened==='reflect'?'Reflect':'Light Screen'} halved the damage from ${beat.move}.`});
  if(beat.effectiveness>=2)out.push({tone:'type',text:`${beat.moveType} is super effective against ${target.types.join('/')} (×${beat.effectiveness}).`});
  else if(beat.effectiveness>0&&beat.effectiveness<1)out.push({tone:'type',text:`${beat.moveType} is resisted by ${target.types.join('/')} (×${beat.effectiveness}).`});
 }
 return out;
}
