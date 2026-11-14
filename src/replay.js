// Structured knockouts survive the 140-line combat log cap. Older saves can
// still show a partial replay from their retained text log.
export function replayMoments(run){
 const recorded=Array.isArray(run?.highlights)?run.highlights.filter(note=>note&&Number.isInteger(note.turn)&&note.turn>0&&['p','e'].includes(note.side)&&Number.isInteger(note.index)&&note.index>=0&&note.index<6&&typeof note.name==='string'&&typeof note.actor==='string'&&typeof note.move==='string').slice(0,12):[];
 const knockouts=recorded.length?recorded:((run?.log||[]).filter(entry=>entry.kind==='faint').flatMap(entry=>{
  const name=/^(.+) fainted!$/.exec(entry.text)?.[1];
  if(!name)return [];
  const foeIndex=run.foe?.findIndex(mon=>mon.name===name)??-1;
  const allyIndex=run.player?.findIndex(mon=>mon.name===name)??-1;
  if(foeIndex<0&&allyIndex<0)return [];
  return [{turn:entry.turn,side:foeIndex>=0?'e':'p',index:foeIndex>=0?foeIndex:allyIndex,name,actor:'',move:''}];
 }));
 const decisive=run?.phase==='battle'?null:run?.moment||{turn:(run?.log||[]).findLast(entry=>entry.kind==='win'||entry.kind==='loss')?.turn??Math.max(1,(run?.turn||1)-1),kind:'legacy',actor:'',target:'',move:''};
 return {knockouts,decisive};
}
