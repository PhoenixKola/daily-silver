// User preferences. Reduced motion and playback speed are independent settings.
import {store} from './store.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const settings={
 get speed(){return clamp(Number(store.get('fx-rate'))||1,.5,3)},
 set speed(v){store.set('fx-rate',clamp(Number(v)||1,.5,3))},
 get motion(){const v=store.get('reduced-motion');return ['auto','on','off'].includes(v)?v:'auto'},
 set motion(v){store.set('reduced-motion',v)},
 get intensity(){const v=store.get('visual-intensity');return ['full','reduced','minimal'].includes(v)?v:'full'},
 set intensity(v){store.set('visual-intensity',v)},
 get contrast(){return store.get('high-contrast')===true},
 set contrast(v){store.set('high-contrast',!!v)}
};
export const systemReducedMotion=()=>!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
export const reducedMotion=()=>settings.motion==='on'||(settings.motion==='auto'&&systemReducedMotion());
export const intensityValue=()=>({full:1,reduced:.55,minimal:.25})[settings.intensity];
export function applySettings(stage){
 const root=document.documentElement;
 root.dataset.motion=reducedMotion()?'reduced':'full';
 root.dataset.contrast=settings.contrast?'high':'normal';
 stage?.setSettings?.({reduced:reducedMotion(),intensity:intensityValue()});
}
