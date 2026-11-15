// Plays a planned cue timeline against a set of handlers.
// Guarantees: cues fire in order on one clock; skip() and cancel() resolve every pending wait
// immediately; handler errors never leave the caller hanging; nothing is queued after the end.
const defaultTimers={set:(fn,ms)=>setTimeout(fn,ms),clear:id=>clearTimeout(id),now:()=>(globalThis.performance?.now?.()??Date.now())};

export function createDirector(timers=defaultTimers){
 let session=0,current=null;
 const api={
  get active(){return !!current},
  skip(){if(current){current.skipped=true;current.wake()}},
  cancel(){if(current){current.cancelled=true;current.wake()}},
  async play(cues,handlers,{rate=1}={}){
   if(current)api.cancel();
   const id=++session;
   const run={skipped:false,cancelled:false,wake:()=>{}};
   current=run;
   const speed=Math.max(.25,Math.min(8,rate));
   const start=timers.now();
   const ordered=cues.map((cue,i)=>({cue,i})).sort((a,b)=>a.cue.t-b.cue.t||a.i-b.i);
   let fired=0;
   try{
    for(const {cue} of ordered){
     const due=start+cue.t/speed;
     while(!run.skipped&&!run.cancelled){
      const wait=due-timers.now();
      if(wait<=1)break;
      await new Promise(resolve=>{
       let timer=null;
       run.wake=()=>{if(timer!==null)timers.clear(timer);timer=null;resolve()};
       timer=timers.set(()=>{timer=null;resolve()},wait);
      });
     }
     if(run.skipped||run.cancelled||id!==session)break;
     try{handlers[cue.kind]?.(cue)}catch(error){console.error('presentation cue failed',cue.kind,error)}
     fired++;
    }
   }finally{
    if(current===run)current=null;
   }
   return {completed:!run.skipped&&!run.cancelled&&fired===ordered.length,skipped:run.skipped,cancelled:run.cancelled,fired,total:ordered.length};
  }
 };
 return api;
}
