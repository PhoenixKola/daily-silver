import {pkmnColor} from '../engine.js';
export const $=id=>document.getElementById(id);
export const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const icon=name=>`<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const typeChip=type=>`<span class="type-chip" style="--mc:${pkmnColor(type)}"><i aria-hidden="true"></i>${esc(String(type).toUpperCase())}</span>`;
export const catIcon=category=>category==='physical'?'fist':category==='special'?'swirl':'dot';
export const catLabel=category=>category==='physical'?'Physical':category==='special'?'Special':'Status';
export const catChip=category=>`<span class="cat">${icon(catIcon(category))}${catLabel(category)}</span>`;
export const pct=(hp,max)=>Math.max(0,Math.min(100,Math.round(hp/Math.max(1,max)*100)));
export const hpClass=p=>p<24?'danger':p<51?'warn':'';
let toastTimer=0;
export function toast(text,ms=2400){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),ms)}
export const prefersReducedMotion=()=>document.documentElement.dataset.motion==='reduced';
// View Transitions with a plain fallback; never blocks the update when unsupported or reduced.
export function transition(change){
 if(document.startViewTransition&&!prefersReducedMotion()){try{const t=document.startViewTransition(()=>{change()});t.ready?.catch(()=>{});t.updateCallbackDone?.catch(()=>{});return t.finished.catch(()=>{})}catch{}}
 change();return Promise.resolve();
}
