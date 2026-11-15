// Dialog sheets: help, settings, archive, dossier/party, move details, lab. One <dialog>, focus restored on close.
import {pkmnColor,alive,active,DAY_KEY} from '../engine.js';
import {MOVES,effectiveness} from '../data.js';
import {spriteHTML} from '../sprites.js';
import {moveFacts,itemEffect,estimateAttack,describeEstimate,typeAdvantageLabel,categoryOf} from '../moveinfo.js';
import {conditionsOf,STATUS_LABEL,boostsOf} from '../pres/conditions.js';
import {isSoundOn,getMasterVolume,getMusicLevel,getEffectsLevel} from '../sound.js';
import {settings} from '../settings.js';
import {records,stats,hasReplay,loadRun,dailyKey,store} from '../store.js';
import {$,esc,icon,typeChip,catChip,pct,hpClass,transition} from './dom.js';

let opener=null,onCloseCb=null,lockedOpen=false;
const sheet=()=>$('sheet');
export function openSheet(title,html,{onClose,locked=false,wide=false}={}){
 const el=sheet();
 $('sheet-title').textContent=title;$('sheet-body').innerHTML=html;
 onCloseCb=onClose||null;lockedOpen=locked;
 $('sheet-close').hidden=locked;
 if(!el.open){opener=document.activeElement;transition(()=>el.showModal())}
 $('sheet-body').scrollTop=0;
 requestAnimationFrame(()=>{const target=$('sheet-body').querySelector('[data-autofocus]')||(locked?$('sheet-body').querySelector('button:not([disabled])'):$('sheet-close'));target?.focus?.()});
}
export function closeSheet(){if(sheet().open&&!lockedOpen)sheet().close()}
export function forceClose(){lockedOpen=false;if(sheet().open)sheet().close()}
export const isSheetOpen=()=>sheet().open;
export function initSheet(){
 $('sheet-close').addEventListener('click',closeSheet);
 sheet().addEventListener('cancel',e=>{if(lockedOpen)e.preventDefault()});
 sheet().addEventListener('close',()=>{
  const cb=onCloseCb;onCloseCb=null;lockedOpen=false;
  if(opener&&document.contains(opener)&&!opener.disabled&&!opener.hidden)opener.focus();opener=null;cb?.();
 });
 sheet().addEventListener('click',e=>{
  if(e.target!==sheet()||lockedOpen)return;
  const r=sheet().getBoundingClientRect();
  if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeSheet();
 });
}

// ---------- help ----------
export function helpSheet(){
 openSheet('How to play',`
 <p>Six allies face Trainer Red's six on a moonlit summit. Everyone gets the same team each UTC day. Win or lose, that official attempt is then locked until the next reset.</p>
 <h3>On your turn</h3>
 <ul class="plain"><li>Pick one of four moves (keys <b>1–4</b>), or open the <b>Party</b> (key <b>P</b>) to switch. Red answers automatically.</li>
 <li>Each move card shows its type, Physical/Special/Status category, power, accuracy, PP and how it matches up. Tap the <b>i</b> for the full description.</li>
 <li>Type advantage is not the same as damage. Power, stats, same-type bonus, held items and barriers all matter, so estimates are shown as ranges.</li></ul>
 <h3>Rules of the era</h3>
 <p>Generation II rules: no abilities or Fairy type, and a move's type decides whether it is Physical or Special. This is a curated simulation, not a cartridge emulator.</p>
 <h3>Practice lab</h3>
 <p>Practice never changes your daily result. In the lab you can undo, retry the same seed, compare moves from the same position and read plain-language explanations. Those tools never exist in official daily play.</p>
 <p>Everything is stored only in this browser. Clearing site data removes it, so export a backup from the archive first.</p>`);
}

// ---------- settings ----------
const seg=(name,options,current)=>`<div class="seg" role="radiogroup">${options.map(([v,l])=>`<label><input type="radio" name="${name}" value="${esc(v)}" ${String(current)===String(v)?'checked':''}><span>${esc(l)}</span></label>`).join('')}</div>`;
export function settingsSheet(){
 const speeds=[['0.5','0.5×'],['1','1×'],['1.5','1.5×'],['2','2×'],['3','3×']];
 openSheet('Settings',`
 <h3>Motion and effects</h3>
 <div class="row"><span id="l-motion">Reduced motion</span>${seg('motion',[['auto','Auto'],['on','On'],['off','Off']],settings.motion)}</div>
 <div class="row"><span>Visual intensity</span>${seg('intensity',[['full','Full'],['reduced','Reduced'],['minimal','Minimal']],settings.intensity)}</div>
 <div class="row"><span>Battle speed</span>${seg('speed',speeds,settings.speed)}</div>
 <p class="note" style="color:var(--muted);font-size:13px">Reduced motion removes camera shake, parallax and idle movement. Speed only changes pacing. Both apply immediately.</p>
 <h3>Sound</h3>
 <div class="row"><label for="s-sound">Sound</label><span class="switch"><input id="s-sound" type="checkbox" ${isSoundOn()?'checked':''}><i></i></span></div>
 <div class="row"><label for="s-volume">Master volume</label><span class="range"><input id="s-volume" type="range" min="5" max="100" value="${Math.round(getMasterVolume()*100)}"><output id="o-volume">${Math.round(getMasterVolume()*100)}%</output></span></div>
 <div class="row"><label for="s-music">Music</label><span class="range"><input id="s-music" type="range" min="0" max="100" value="${Math.round(getMusicLevel()*100)}"><output id="o-music">${Math.round(getMusicLevel()*100)}%</output></span></div>
 <div class="row"><label for="s-fx">Effects</label><span class="range"><input id="s-fx" type="range" min="0" max="100" value="${Math.round(getEffectsLevel()*100)}"><output id="o-fx">${Math.round(getEffectsLevel()*100)}%</output></span></div>
 <h3>Display</h3>
 <div class="row"><label for="s-contrast">High contrast</label><span class="switch"><input id="s-contrast" type="checkbox" ${settings.contrast?'checked':''}><i></i></span></div>
 <h3>Your data</h3>
 <div class="actions" style="justify-content:flex-start"><button class="chip-btn" data-act="export" type="button">${icon('down')}Export backup</button><button class="chip-btn" data-act="import" type="button">Import backup</button><button class="chip-btn" data-act="archive" type="button">${icon('book')}Archive</button></div>`);
}

// ---------- dossier / party ----------
function moveRow(slot,mon,foe,run,side,top){
 const f=moveFacts(slot.name),m=f.move,est=foe?estimateAttack(slot,mon,foe,run,side):null;
 const eff=foe&&m.power?effectiveness(m.type,foe.types):null;
 let estLine='';
 if(foe&&f.category!=='status'){
  estLine=`${eff!==null?`Type: ${typeAdvantageLabel(eff)}. `:''}${describeEstimate(est)}`;
 }
 return `<li class="mini-move" style="--mc:${pkmnColor(m.type)}">
  <b>${esc(slot.name)}${top?' <span class="tag t-good">Most damage (est.)</span>':''}</b><span class="move-pp ${slot.pp<=2?'low':''}">${slot.pp}/${slot.maxPp} PP</span>
  <span class="move-meta">${typeChip(m.type)}${catChip(f.category)}<span>${f.power?`${f.power} power`:'—'} · ${f.accuracy}% acc</span></span>
  <span class="est">${esc(f.text)}</span>
  ${estLine?`<span class="est">${esc(estLine)}</span>`:''}
  ${f.warnings.map(w=>`<span class="warn">⚠ ${esc(w)}</span>`).join('')}
 </li>`;
}
export function monCardHTML(mon,index,{run,foe,open=false,side='p',party=false,isActive=false,mustSwitch=false}={}){
 const p=pct(mon.hp,mon.maxHp),dead=mon.hp<=0,conds=conditionsOf(mon);
 const est=foe&&mon.hp>0?mon.moves.map(s=>({s,e:estimateAttack(s,mon,foe,run,side)})):[];
 const top=est.filter(x=>x.e&&x.e.known&&x.e.max>0&&x.s.name!=='Explosion'&&x.s.name!=='Selfdestruct').sort((a,b)=>b.e.max-a.e.max)[0]?.s;
 const boosts=boostsOf(mon).map(b=>`${b.stat.toUpperCase()} ${b.stage>0?'+':''}${b.stage}`);
 const id=`mon-${side}-${index}`;
 return `<li class="mon-card" data-index="${index}" data-open="${open}">
  <button class="mon-head" type="button" aria-expanded="${open}" aria-controls="${id}-body" data-toggle="${index}">
   ${spriteHTML(mon,false)}
   <span class="mon-id"><b>${esc(mon.name.toUpperCase())}</b><small>Lv.${mon.level} · ${mon.types.map(esc).join(' / ')}${isActive?' · In battle':''}${dead?' · Fainted':''}</small></span>
   <span class="mon-hp">${mon.hp}/${mon.maxHp}<span class="hp-track"><span class="hp-fill ${hpClass(p)}" style="width:${p}%;display:block"></span></span></span>
  </button>
  <div class="mon-body" id="${id}-body" ${open?'':'hidden'}>
   <div class="fact"><b>Held item</b><span>${esc(mon.item==='(used)'?'Consumed':mon.item||'None')} — ${esc(itemEffect(mon.item))}</span></div>
   ${conds.length||boosts.length?`<div class="fact"><b>Condition</b><span>${[...conds.map(c=>STATUS_LABEL[c]||({seed:'Seeded',curse:'Cursed',trap:'Trapped',substitute:'Substitute'}[c]||c)),...boosts].map(esc).join(' · ')}</span></div>`:''}
   <ul class="mini-moves">${mon.moves.map(s=>moveRow(s,mon,foe,run,side,s===top)).join('')}</ul>
   ${party?`<div class="mon-actions"><button class="btn btn-primary" style="min-height:48px;max-width:none" type="button" data-switch="${index}" ${dead||isActive?'disabled':''}>${dead?'Fainted':isActive?'Already in battle':`Send out ${esc(mon.name)}`}</button></div>`:''}
  </div>
 </li>`;
}
export function dossierBody(run,{foe,side='p',party=false,openIndex=-1,mustSwitch=false}={}){
 return `<p class="explain">Type advantage is not damage. Estimates add power, stats, same-type bonus, held items and visible barriers, but not critical hits or what the opponent does next.${foe?` Compared against <b>${esc(foe.name)}</b>${foe.hp<foe.maxHp?` at ${foe.hp}/${foe.maxHp} HP`:''}.`:''}</p>
 ${mustSwitch?'<p><b>Your ally fainted.</b> Choose who fights next.</p>':''}
 <ul class="dossier">${run.player.map((m,i)=>monCardHTML(m,i,{run,foe,open:i===openIndex,side,party,isActive:party&&i===run.pActive,mustSwitch})).join('')}</ul>`;
}
export function dossierSheet(run,{openIndex=0,party=false,foe,mustSwitch=false,title,onSwitch}={}){
 const opponent=foe||(run.phase==='battle'?run.foe[run.eActive]:run.foe[0]);
 openSheet(title||(party?'Party':'Team dossier'),dossierBody(run,{foe:opponent,party,openIndex,mustSwitch}),{locked:mustSwitch});
 const body=$('sheet-body');
 body.onclick=e=>{
  const sw=e.target.closest('[data-switch]');
  if(sw){onSwitch?.(Number(sw.dataset.switch));return}
  const t=e.target.closest('[data-toggle]');if(!t)return;
  const card=t.closest('.mon-card'),open=card.dataset.open!=='true';
  body.querySelectorAll('.mon-card').forEach(c=>{c.dataset.open='false';c.querySelector('.mon-body').hidden=true;c.querySelector('[data-toggle]').setAttribute('aria-expanded','false')});
  if(open){card.dataset.open='true';card.querySelector('.mon-body').hidden=false;t.setAttribute('aria-expanded','true');card.scrollIntoView({block:'nearest'})}
 };
 body.onkeydown=e=>{
  if(!['ArrowDown','ArrowUp'].includes(e.key))return;
  const heads=[...body.querySelectorAll('[data-toggle]')],i=heads.indexOf(document.activeElement);
  if(i<0)return;e.preventDefault();heads[(i+(e.key==='ArrowDown'?1:-1)+heads.length)%heads.length].focus();
 };
 if(openIndex>=0)requestAnimationFrame(()=>body.querySelector(`.mon-card[data-index="${openIndex}"] [data-toggle]`)?.focus());
}

// ---------- single move details ----------
export function moveSheet(slot,mon,foe,run){
 const f=moveFacts(slot.name),est=foe?estimateAttack(slot,mon,foe,run,'p'):null;
 const eff=foe&&f.move.power?effectiveness(f.move.type,foe.types):null;
 openSheet(slot.name,`
  <div class="move-meta">${typeChip(f.type)}${catChip(f.category)}<span>${f.power?`${f.power} power`:'No direct damage'} · ${f.accuracy}% accuracy · ${slot.pp}/${slot.maxPp} PP</span></div>
  <p>${esc(f.text)}</p>
  ${f.warnings.length?`<h3>Watch out</h3><ul class="plain">${f.warnings.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}
  ${foe?`<h3>Against ${esc(foe.name)}</h3><p>${eff!==null?`<b>${esc(typeAdvantageLabel(eff))}</b>. `:''}${esc(describeEstimate(est))}</p><p class="explain">Type multiplier and damage are different things. This range excludes critical hits and the opponent's hidden choice. It does include same-type bonus, held items, stat stages and visible barriers.</p>`:''}`);
}

// ---------- archive ----------
export function archiveSheet({today}){
 const s=stats(today),recs=records().filter(x=>x.mode==='daily'&&typeof x.date==='string');
 const winPct=s.played?Math.round(s.wins/s.played*100):0;
 const days=Array.from({length:14},(_,i)=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-i-1);return d.toISOString().slice(0,10)});
 const cards=recs.length?recs.slice(0,30).map(r=>{
  const id=`daily:${r.date}`,rec=hasReplay(id),save=loadRun(dailyKey(r.date));
  const team=Array.isArray(r.party)?r.party.slice(0,6).map(n=>{try{return spriteHTML(String(n))}catch{return ''}}).join(''):'';
  return `<li class="record"><header><b>${esc(r.date)}</b><span class="${r.won?'win':'loss'}">${r.won?'Victory':'Defeat'}</span></header>
  <div class="mini-team">${team||'<small style="color:var(--muted)">Team details unavailable for this record</small>'}</div>
  <small style="color:var(--muted)">${Number.isInteger(r.remaining)?r.remaining:'–'}/6 survivors · ${Number.isInteger(r.turns)?r.turns-1:'–'} turns · score ${Number.isFinite(r.score)?r.score:'–'}</small>
  <footer>${save?`<button class="chip-btn" type="button" data-act="result" data-date="${esc(r.date)}">View result</button>`:''}
  ${rec?`<button class="chip-btn" type="button" data-act="replay" data-id="${esc(id)}">${icon('play')}Watch recorded battle</button>`:'<small style="color:var(--muted);align-self:center">Text recap only (recorded before replays existed)</small>'}
  <button class="chip-btn" type="button" data-act="archive-play" data-date="${esc(r.date)}">Play this day again</button></footer></li>`;
 }).join(''):'<p style="color:var(--muted)">Finish an official daily battle to start your archive.</p>';
 openSheet('Archive',`
  <div class="stat-row"><div><b>${s.wins}</b><small>Victories</small></div><div><b>${winPct}%</b><small>Win rate</small></div><div><b>${s.best}</b><small>Best streak</small></div></div>
  <h3>Completed daily battles</h3><ul class="records">${cards}</ul>
  <h3>Replay a past day (practice)</h3><p style="color:var(--muted);font-size:14px">Watching a recording and playing a day again are different: a replay shows your battle, replaying the day starts a fresh practice run with that day's team.</p>
  <div class="actions" style="justify-content:flex-start">${days.map(d=>`<button class="chip-btn" type="button" data-act="archive-play" data-date="${d}">${d}</button>`).join('')}</div>
  <h3>Backup</h3><div class="actions" style="justify-content:flex-start"><button class="chip-btn" data-act="export" type="button">${icon('down')}Export JSON</button><button class="chip-btn" data-act="import" type="button">Import JSON</button></div>`);
}

// ---------- practice lab ----------
export function labSheet({practice,foeNames}){
 const resume=practice&&practice.phase==='battle';
 openSheet('Practice lab',`
  <p>Practice never touches your daily result. <b>Laboratory assist</b> adds undo, retry, move comparison and plain-language explanations. Official daily play never has them.</p>
  ${resume?`<h3>Saved practice</h3><p>Turn ${practice.turn}, ${alive(practice.player)}/6 allies, Red ${alive(practice.foe)}/6.${practice.lab?' (Laboratory)':''}</p><div class="actions" style="justify-content:flex-start"><button class="btn btn-primary" data-act="lab-resume" data-autofocus type="button" style="max-width:none">Resume practice</button></div>`:''}
  <h3>${resume?'Or start new (replaces the saved practice)':'Start practice'}</h3>
  <div class="row"><label for="lab-focus">Opponent</label><span class="select-wrap"><select id="lab-focus"><option value="0">Full battle</option>${foeNames.map((n,i)=>i?`<option value="${i}">Start vs ${esc(n)}</option>`:'').join('')}</select></span></div>
  <div class="row"><label for="lab-assist">Laboratory assist (undo, compare, explain)</label><span class="switch"><input id="lab-assist" type="checkbox" checked><i></i></span></div>
  <div class="actions" style="justify-content:flex-start;margin-top:12px"><button class="btn ${resume?'btn-secondary':'btn-primary'}" data-act="lab-new" ${resume?'':'data-autofocus'} type="button" style="max-width:none">${resume?'Replace and start new':'Start practice'}</button>
  ${practice?`<button class="btn btn-secondary" data-act="lab-retry-last" type="button">Retry the same team and seed</button>`:''}</div>`);
}

export function compareSheet(results,names){
 const rows=results.map((r,i)=>r.ok?`<li class="record"><header><b>${esc(names[i]||'Option '+(i+1))}</b><span>${r.first==='p'?'You move first':r.first==='e'?'Red moves first':''}</span></header>
  <small>Deals ${r.dealt} to ${esc(r.before.foe.name)}${r.foeFainted>0?' (knockout)':''} · takes ${r.taken}${r.allyFainted>0?' (your ally faints)':''}</small>
  <small style="color:var(--muted)">${r.notes.slice(0,5).map(esc).join(' · ')}</small></li>`:`<li class="record"><b>${esc(names[i]||'Option '+(i+1))}</b><small>Not available</small></li>`).join('');
 openSheet('Compare from this position',`<p class="explain">Every option below starts from the same position and the same random state, so differences come from your choice alone. Nothing here changes your battle.</p><ul class="records">${rows}</ul>`);
}
