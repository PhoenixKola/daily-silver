// Turns the flat list of engine visual events into semantic "beats": one continuous action
// (a full exchange, a switch, a residual tick...) instead of unrelated timed notifications.
// Pure and deterministic. Never imports or consumes battle RNG.
const SELF_DAMAGE=new Set(['recoil','crash','explode','cost','confusion']);

const blankExchange=cue=>({
 type:'exchange',side:cue.side,index:cue.index,move:cue.move,moveType:cue.type,power:cue.power||0,
 offensive:!!cue.offensive,outcome:cue.outcome||'utility',targetSide:cue.targetSide||(cue.side==='p'?'e':'p'),
 critical:!!cue.critical,effectiveness:cue.effectiveness??1,screened:cue.screened||'',finisher:!!cue.finisher,
 hits:[],selfDamage:[],selfHeal:[],statuses:[],buffs:[],fields:[],cures:[],faints:[],extra:[]
});

export function buildBeats(events=[]){
 const beats=[];let open=null;
 const last=()=>beats[beats.length-1];
 const flush=()=>{open=null};
 for(const ev of events){
  if(!ev||typeof ev!=='object')continue;
  switch(ev.kind){
   case 'move':{open=blankExchange(ev);beats.push(open);break}
   case 'critical':if(open)open.critical=true;break;
   case 'effectiveness':if(open)open.effectiveness=ev.effectiveness;break;
   case 'miss':case 'immune':case 'blocked':if(open&&open.outcome==='utility')open.outcome=ev.kind;break;
   case 'damage':{
    const cause=ev.cause;
    if(open&&cause==='move'&&ev.side===open.targetSide)open.hits.push(ev);
    else if(open&&SELF_DAMAGE.has(cause)&&ev.side===open.side)open.selfDamage.push(ev);
    else if(cause==='spikes'||cause==='entry'){const sw=[...beats].reverse().find(b=>b.type==='switch');if(sw)sw.entryDamage.push(ev);else beats.push({type:'residual',side:ev.side,index:ev.index,cause:'spikes',damage:ev,faints:[]})}
    else if(open&&cause==='move')open.hits.push(ev);
    else{flush();beats.push({type:'residual',side:ev.side,index:ev.index,cause:cause||'status',damage:ev,faints:[]})}
    break}
   case 'heal':{
    if(open&&ev.side===open.side&&(ev.cause==='drain'||ev.cause==='recover'||open.outcome==='heal'))open.selfHeal.push(ev);
    else{flush();beats.push({type:'residual',side:ev.side,index:ev.index,cause:ev.cause||'heal',heal:ev,faints:[]})}
    break}
   case 'status':if(open)open.statuses.push(ev);else beats.push({type:'residual',side:ev.side,index:ev.index,cause:'status-apply',status:ev,faints:[]});break;
   case 'buff':if(open)open.buffs.push(ev);else beats.push({type:'residual',side:ev.side,index:ev.index,cause:'buff',buff:ev,faints:[]});break;
   case 'field':if(open)open.fields.push(ev);else beats.push({type:'residual',side:ev.side,cause:'field',field:ev,faints:[]});break;
   case 'cure':flush();beats.push({type:'residual',side:ev.side,index:ev.index,cause:'cure',cure:ev,faints:[]});break;
   case 'denied':flush();beats.push({type:'denied',side:ev.side,index:ev.index,why:ev.why});break;
   case 'switch':flush();beats.push({type:'switch',side:ev.side,index:ev.index,from:ev.from,name:ev.name,voluntary:ev.voluntary!==false,entryDamage:[],faints:[]});break;
   case 'faint':{const b=last();if(b){(b.faints??=[]).push(ev)}else beats.push({type:'residual',side:ev.side,index:ev.index,cause:'faint',faints:[ev]});break}
   default:break;
  }
 }
 return beats;
}

export function isDecisive(beat){return !!(beat?.finisher||beat?.faints?.length)}

// Compact, rule-independent presentation record of an event (used by replays).
const KEEP=['kind','side','index','from','name','hp','amount','move','type','power','outcome','offensive','effectiveness','critical','finisher','screened','status','boosts','cause','what','why','targetSide','voluntary'];
export function compactEvent(ev){
 const out={};for(const key of KEEP)if(ev[key]!==undefined)out[key]=ev[key];return out;
}
