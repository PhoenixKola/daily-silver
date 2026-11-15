// Local persistence. Keeps the daily-silver-v1 namespace and save shapes so old saves keep working.
import {APP_ID,DAY_KEY,runSummary,battleScore} from './engine.js';
import {replayKey,pruneIndex,validateReplay} from './recorder.js';

export const store={
 get(k){try{return JSON.parse(localStorage.getItem(APP_ID+':'+k))}catch{return null}},
 set(k,v){try{localStorage.setItem(APP_ID+':'+k,JSON.stringify(v));return true}catch(e){console.warn('Local storage unavailable',e);return false}},
 remove(k){try{localStorage.removeItem(APP_ID+':'+k)}catch{}}
};
export const loadRun=key=>{const a=store.get(key);return a&&a.version===1&&Array.isArray(a.player)&&a.player.length===6&&Array.isArray(a.foe)&&a.foe.length===6?a:null};
export const dailyKey=date=>'daily:'+date;
export function saveRun(run){if(run)store.set(run.mode==='daily'?dailyKey(run.date):'practice',run)}
export const records=()=>{const saved=store.get('records');return Array.isArray(saved)?saved.filter(x=>x&&typeof x==='object'):[]};
export function recordResult(run){
 if(!run||run.phase==='battle')return;
 const id=run.mode+':'+run.date+':'+run.seed,all=records();
 if(!all.some(r=>r.id===id)){all.unshift({id,...runSummary(run),score:battleScore(run)});store.set('records',all.slice(0,200))}
}
const dateBefore=d=>{const dt=new Date(d+'T00:00:00Z');if(!Number.isFinite(dt.valueOf()))return '';dt.setUTCDate(dt.getUTCDate()-1);return dt.toISOString().slice(0,10)};
export function stats(today=DAY_KEY()){
 const rs=records().filter(r=>r.mode==='daily'),wins=rs.filter(r=>r.won).length,winDates=new Set(rs.filter(r=>r.won).map(r=>r.date));
 let cur=winDates.has(today)?today:dateBefore(today),streak=0;while(winDates.has(cur)&&streak<9000){streak++;cur=dateBefore(cur)}
 let best=0;for(const d of [...winDates].sort()){let c=d,n=0;while(winDates.has(c)&&n<9000){n++;c=dateBefore(c)}best=Math.max(best,n)}
 return {wins,played:rs.length,streak,best};
}
// Replays live under their own keys so run saves stay small. At most MAX_STORED are kept.
export function saveReplay(rec){
 if(!rec)return false;
 const ok=store.set(replayKey(rec.id),rec);
 if(!ok)return false;
 const index=Array.isArray(store.get('replay-index'))?store.get('replay-index'):[];
 const {keep,drop}=pruneIndex(index,rec.id);
 for(const id of drop)store.remove(replayKey(id));
 store.set('replay-index',keep);return true;
}
export function loadReplay(id){
 const rec=store.get(replayKey(id));
 if(!rec)return null;
 try{return validateReplay(rec)}catch{return null}
}
export const hasReplay=id=>!!loadReplay(id);
