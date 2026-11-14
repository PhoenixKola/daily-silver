import {createRun,DAY_KEY,dailySeed,turn,active,alive,pkmnColor,battleScore,runSummary,estimateDamage,APP_ID} from './engine.js';
import {MOVES,effectiveness} from './data.js';import {setScene,setHomeFocus,playSceneEvent,clearSceneEffects,startBattleIntro,clearBattleIntro} from './scene.js';
import {bestCounter,moveMatchup} from './matchups.js';
import {replayMoments} from './replay.js';
import {BOSS_ENTRANCES} from './entrances.js';
import {validateBackup} from './backup.js';import {spriteHTML,installSpriteImageFallback,localSprite,clearWhiteBackdrop} from './sprites.js';import {sfx,setSound,isSoundOn,isSoundReady,resumeSound,setMusicMode,setMasterVolume,getMasterVolume,setMusicLevel,getMusicLevel} from './sound.js';
const $=id=>document.getElementById(id);
const updateSoundLabel=on=>{const label=$('sound-button').querySelector('.nav-label');if(label)label.textContent='AUDIO '+(on?'ON':'OFF');else $('sound-button').textContent='AUDIO '+(on?'ON':'OFF')};
const scene=$('scene-container'),sceneHome=scene.parentElement,sceneBattle=$('battle-scene-slot');
let run=null,previewRun=null,view='home',partyOpen=false,recorded=false,animating=false,animationToken=0;
const fxCaption=document.createElement('div');fxCaption.id='battle-fx-caption';fxCaption.setAttribute('aria-live','polite');fxCaption.className='battle-fx-caption hidden';scene.append(fxCaption);
const rivalReveal=document.createElement('div');rivalReveal.id='rival-reveal';rivalReveal.className='rival-reveal hidden';scene.append(rivalReveal);
const foeEntrance=document.createElement('div');foeEntrance.id='foe-entrance';foeEntrance.className='foe-entrance hidden';foeEntrance.setAttribute('aria-live','polite');scene.append(foeEntrance);
rivalReveal.addEventListener('click',event=>{if(event.target.closest('[data-skip-intro]'))skipRequested=true});
const skipFx=document.createElement('button');skipFx.id='skip-fx';skipFx.className='toggle-party skip-fx hidden';skipFx.textContent='» SKIP FX';skipFx.type='button';$('party-toggle').before(skipFx);let skipRequested=false;skipFx.addEventListener('click',()=>{skipRequested=true;skipFx.textContent='» SKIPPING';});
const store={get(k){try{return JSON.parse(localStorage.getItem(APP_ID+':'+k))}catch{return null}},set(k,v){try{localStorage.setItem(APP_ID+':'+k,JSON.stringify(v))}catch(e){console.warn('Local storage unavailable',e)}}};
let highContrast=store.get('high-contrast')===true;
function setContrast(on){highContrast=!!on;document.body.classList.toggle('high-contrast',highContrast);store.set('high-contrast',highContrast)}
document.body.classList.toggle('high-contrast',highContrast);
let fxRate=Math.max(.5,Math.min(3,Number(store.get('fx-rate'))||1));
let today=DAY_KEY();
function refreshUtcDay(){
 const current=DAY_KEY(),changed=current!==today;today=current;
 const serial=Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse('2026-01-01T00:00:00Z'))/864e5)+1;
 $('daily-number').textContent='DAILY '+String(Math.max(1,serial)).padStart(4,'0');
 $('issue-number').textContent='ISSUE '+String(Math.max(1,serial)).padStart(3,'0');
 $('today-label').textContent=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(today+'T12:00:00Z')).toUpperCase();
 $('home-date-label').textContent=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(today+'T12:00:00Z')).toUpperCase();
 if(changed&&view==='home')updateHome();
 if(changed&&view==='game'&&run?.mode==='daily')$('scene-caption').textContent='A NEW DAILY CHALLENGE IS AVAILABLE AFTER THIS BATTLE.';
 return changed;
}
refreshUtcDay();
function loadRun(key){const a=store.get(key);return a&&a.version===1&&Array.isArray(a.player)&&a.player.length===6&&Array.isArray(a.foe)&&a.foe.length===6?a:null}
function dailyKey(date=today){return 'daily:'+date}
function save(){if(run)store.set(run.mode==='daily'?dailyKey(run.date):'practice',run)}
function dateDelta(d){const dt=new Date(d+'T00:00:00Z');if(!Number.isFinite(dt.valueOf()))return '';dt.setUTCDate(dt.getUTCDate()-1);return dt.toISOString().slice(0,10)}
function records(){const saved=store.get('records');return Array.isArray(saved)?saved.filter(x=>x&&typeof x==='object'):[]}
function stats(){const rs=records().filter(r=>r.mode==='daily');let wins=rs.filter(r=>r.won).length;
 const winDates=new Set(rs.filter(r=>r.won).map(r=>r.date));let current=winDates.has(today)?today:dateDelta(today),streak=0;
 while(winDates.has(current)&&streak<9000){streak++;current=dateDelta(current)}
 let best=0;for(const d of [...winDates].sort()){let cursor=d,count=0;while(winDates.has(cursor)&&count<9000){count++;cursor=dateDelta(cursor)}best=Math.max(best,count)}
 return {wins,played:rs.length,streak,best};
}
function updateHome(){refreshUtcDay();const ex=loadRun(dailyKey());const b=$('daily-button');if(ex){b.innerHTML=ex.phase==='battle'?'<span class="play-icon">▶</span> RESUME DAILY BATTLE <span class="button-arrow">↗</span>':'<span class="play-icon">✦</span> VIEW TODAY\'S RESULT <span class="button-arrow">↗</span>'; $('daily-note').textContent=ex.phase==='battle'?`Your save is safe on this browser — turn ${ex.turn}.`:'Today’s official attempt is complete. A new save file arrives tomorrow at 00:00 UTC.';}else{b.innerHTML='<span class="play-icon">▶</span> BEGIN TODAY\'S BATTLE <span class="button-arrow">↗</span>';$('daily-note').textContent='A new randomized team arrives every day at 00:00 UTC.'}
 const s=stats();$('stat-wins').textContent=String(s.wins).padStart(2,'0');$('stat-streak').textContent=String(s.best).padStart(2,'0');$('stat-played').textContent=String(s.played).padStart(2,'0');
 let preview=createRun({mode:'daily',date:today});$('preview-party').innerHTML=preview.player.map((p,i)=>`<div class="mini-mon" title="${p.name} • Level ${p.level}">${spriteHTML(p)}</div>`).join('');
 previewRun=preview;setHomeFocus(0);setScene(preview,'home');
 $('home-spotlight-name').textContent=preview.player[0].name.toUpperCase();
 $('hero-preview-party').innerHTML=preview.player.map((p,i)=>`<button type="button" class="squad-mon ${i===0?'is-selected':''}" data-preview="${i}" aria-label="Preview ${htmlSafe(p.name)}, ${htmlSafe(p.types.join(' and '))} type" aria-pressed="${i===0}"><span class="squad-sprite">${spriteHTML(p)}</span><b>${htmlSafe(p.name.toUpperCase())}</b><small style="--squad-type:${pkmnColor(p.types[0])}">${htmlSafe(p.types[0].toUpperCase())}</small></button>`).join('');
}
function navigate(change){if(document.startViewTransition&&!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)document.startViewTransition(change);else change()}
function viewHome(){hideFoeEntrance();animationToken++;animating=false;clearSceneEffects();clearBattleIntro();fxCaption.classList.add('hidden');rivalReveal.classList.add('hidden');skipFx.classList.add('hidden');$('game-view').classList.remove('is-animating');view='home';partyOpen=false;run=null;sceneHome.append(scene);$('home-scene-label').classList.remove('hidden');$('battle-hud').classList.add('hidden');$('home-view').classList.remove('hidden');$('game-view').classList.add('hidden');$('result-view').classList.add('hidden');setScene(null,'home');setMusicMode('home');updateHome();window.scrollTo({top:0,behavior:'instant'})}
function previewAlly(index){
 if(view!=='home'||!previewRun||!Number.isInteger(index)||index<0||index>=previewRun.player.length)return;
 setHomeFocus(index);$('home-spotlight-name').textContent=previewRun.player[index].name.toUpperCase();
 $('hero-preview-party').querySelectorAll('[data-preview]').forEach((button,i)=>{button.classList.toggle('is-selected',i===index);button.setAttribute('aria-pressed',String(i===index))});
}
function battleView({intro=false}={}){hideFoeEntrance();view='game';rivalReveal.classList.add('hidden');sceneBattle.append(scene);$('home-scene-label').classList.add('hidden');$('battle-hud').classList.remove('hidden');$('home-view').classList.add('hidden');$('game-view').classList.remove('hidden');$('result-view').classList.add('hidden');partyOpen=false;setMusicMode(active(run,'p').hp/active(run,'p').maxHp<.24?'critical':'battle');renderBattle();window.scrollTo({top:0,behavior:'instant'});if(intro)showIntro();}
function launch(mode){refreshUtcDay();let fresh=false;if(mode==='daily'){const saved=loadRun(dailyKey());run=saved||createRun({mode:'daily',date:today});fresh=!saved;if(!saved)save();}else{const saved=loadRun('practice');fresh=!(saved&&saved.phase==='battle');run=fresh?createRun({mode:'practice'}):saved;save();}sfx('select');navigate(()=>{if(run.phase==='battle')battleView({intro:fresh});else resultsView()})}
function itemInfo(p){return p.item==='(used)'?'CONSUMED':String(p.item||'NONE').toUpperCase()}
function statusText(p){const arr=[];if(p.status)arr.push(`<span>${htmlSafe(String(p.status).toUpperCase())}</span>`);if(p.confused)arr.push('<span>CONFUSED</span>');if(p.seeded)arr.push('<span>SEEDED</span>');return arr.join('')}
function setHealth(side,p,b=run){const el=$(side+'-hp'),pct=100*p.hp/p.maxHp;el.style.width=pct+'%';el.className='life-fill'+(pct<24?' danger':pct<51?' warning':'');$(side+'-name').textContent=p.name.toUpperCase();$(side+'-level').textContent='LV.'+p.level;$(side+'-count').textContent=`${p.hp}/${p.maxHp}`;$(side+'-status').innerHTML=statusText(p)}
const tactics=document.createElement('div');tactics.id='battle-tactics';tactics.className='battle-tactics';tactics.setAttribute('aria-live','off');
// The battle help strip uses a CSS class, not an ID. Older layouts may omit it.
const tacticsAnchor=document.querySelector('.battle-help')||$('party-toggle');
tacticsAnchor.after(tactics);
const fieldButton=document.createElement('button');fieldButton.type='button';fieldButton.className='field-button';fieldButton.textContent='FIELD STATUS';fieldButton.setAttribute('aria-expanded','false');tactics.after(fieldButton);
fieldButton.addEventListener('click',()=>{const open=tactics.classList.toggle('is-open');fieldButton.setAttribute('aria-expanded',String(open))});
const journalButton=document.createElement('button');journalButton.type='button';journalButton.className='journal-button';journalButton.textContent='FULL JOURNAL →';$('round-label').after(journalButton);
journalButton.addEventListener('click',()=>showTurnRecap());
const htmlSafe=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function showFoeEntrance(mon,index){const card=BOSS_ENTRANCES[mon.name];if(!card)return;foeEntrance.dataset.motif=card.motif;foeEntrance.style.cssText=`--entrance-accent:${pkmnColor(mon.types[0])}`;foeEntrance.innerHTML=`<span class="entrance-seal" aria-hidden="true">0${index+1}</span><span class="entrance-portrait">${spriteHTML(mon)}</span><span class="entrance-copy"><small>RED'S TEAM / 0${index+1} OF 06</small><strong>${htmlSafe(mon.name.toUpperCase())}</strong><b>${htmlSafe(card.title)}</b><em>${htmlSafe(card.line)}</em><span>SIGNATURE / ${htmlSafe(card.move.toUpperCase())}</span></span>`;foeEntrance.classList.remove('hidden')}
function hideFoeEntrance(){foeEntrance.classList.add('hidden')}
function renderAscent(b){
 const track=$('ascent-track');
 const signature=b.foe.map((mon,i)=>`${mon.name}:${mon.hp<=0?'out':i===b.eActive?'active':'waiting'}`).join('|');
 $('ascent-count').textContent=`${b.foe.filter(mon=>mon.hp<=0).length} OF 6 CLEARED`;
 const fallen=b.foe.filter(mon=>mon.hp<=0).length;
 const stage=fallen<2?0:fallen<4?1:fallen<6?2:3;
 $('ascent-stage').textContent=['I / STILLNESS','II / RISING WIND','III / WHITEOUT','IV / LAST LIGHT'][stage];
 $('game-view').dataset.weatherStage=stage;
 if(track.dataset.signature===signature)return;
 track.dataset.signature=signature;
 track.innerHTML=b.foe.map((mon,i)=>{
  const state=mon.hp<=0?'is-cleared':i===b.eActive?'is-current':'is-waiting';
  return `<li class="ascent-stop ${state}" aria-current="${i===b.eActive&&mon.hp>0?'step':'false'}" aria-label="Stage ${i+1}: ${htmlSafe(mon.name)}, ${mon.hp<=0?'cleared':i===b.eActive?'current opponent':'awaiting'}"><span class="ascent-index">0${i+1}</span>${spriteHTML(mon)}<small>${htmlSafe(mon.name.toUpperCase())}</small></li>`;
 }).join('');
}
function recapMarkup(log,limit=32,decisiveTurn=0){
 const groups=new Map();
 for(const entry of log.slice(-limit)){
  const turn=Number.isInteger(entry.turn)?entry.turn:0;
  if(!groups.has(turn))groups.set(turn,[]);
  groups.get(turn).push(entry);
 }
 const icons={move:'&#9876;',faint:'&#10005;',heal:'&#10010;',status:'&#9670;',switch:'&#8644;',effect:'&#10022;',critical:'!',miss:'&#8709;'};
 return [...groups].map(([turn,entries])=>`<section class="recap-turn ${turn===decisiveTurn?'is-decisive':''}" data-turn="${turn}"><div class="recap-turn-head"><span>TURN ${String(turn).padStart(2,'0')}${turn===decisiveTurn?' / DECISIVE':''}</span><small>${entries.length} FIELD NOTES</small></div><div class="recap-events">${entries.map(entry=>`<div class="recap-event ${htmlSafe(entry.kind||'note')}"><span class="recap-icon" aria-hidden="true">${icons[entry.kind]||'&#9671;'}</span><span>${htmlSafe(entry.text)}</span></div>`).join('')}</div></section>`).join('');
}
function screenTurns(b,side){const fields=b.screens?.[side];const reflect=typeof fields==='number'?fields:fields?.reflect||0;const special=typeof fields==='number'?fields:fields?.lightScreen||0;return `${reflect?`REFLECT ${reflect}T`:''} ${special?`LIGHT SCREEN ${special}T`:''}`.trim()||'NO BARRIERS';}
function boostSummary(p){const boosts=Object.entries(p.boost||{}).filter(([key,value])=>value!==0);return boosts.length?boosts.map(([k,v])=>`${k.toUpperCase()} ${v>0?'+':''}${v}`).join(' · '):'NO STAT MODIFIERS';}
function updateBattleTactics(b,p,e){tactics.innerHTML=`<div><strong>YOUR FIELD</strong><span>${htmlSafe(screenTurns(b,'p'))} · SPIKES ${b.spikes?.p||0}</span><small>${htmlSafe(boostSummary(p))}</small></div><div><strong>RED'S FIELD</strong><span>${htmlSafe(screenTurns(b,'e'))} · SPIKES ${b.spikes?.e||0}</span><small>${htmlSafe(boostSummary(e))}</small></div>`;}
function showIntro(){
 const token=++animationToken;animating=true;skipRequested=false;
 $('game-view').classList.add('is-animating');skipFx.textContent='» SKIP INTRO';skipFx.classList.remove('hidden');
 fxCaption.classList.add('hidden');
 rivalReveal.innerHTML=`<div class="reveal-heading"><span>FINAL ENCOUNTER / MT. SILVER</span><button type="button" data-skip-intro aria-label="Skip rival introduction">SKIP ↗</button></div><div class="reveal-center"><span class="reveal-emblem" aria-hidden="true">R</span><div><span class="reveal-overline">THE CHALLENGER STEPS FORWARD</span><strong>TRAINER <em>RED.</em></strong><small>ONE SUMMIT. SIX FINAL OBSTACLES.</small></div></div><div class="reveal-team" aria-label="Red's six Pokémon">${run.foe.map(mon=>`<span title="${htmlSafe(mon.name)}">${spriteHTML(mon)}<small>${htmlSafe(mon.name.toUpperCase())}</small></span>`).join('')}</div>`;
 rivalReveal.classList.remove('hidden');
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 startBattleIntro(reduced?160:1400);
 const started=performance.now();
 const finish=()=>{
  clearBattleIntro();rivalReveal.classList.add('hidden');
  if(skipRequested){hideFoeEntrance();animating=false;skipFx.classList.add('hidden');$('game-view').classList.remove('is-animating');renderBattle();return}
  showFoeEntrance(run.foe[run.eActive],run.eActive);skipFx.classList.add('hidden');
  setTimeout(()=>{if(token!==animationToken||view!=='game')return;hideFoeEntrance();animating=false;$('game-view').classList.remove('is-animating');renderBattle()},reduced?1000:1700);
 };
 const check=()=>{
  if(token!==animationToken||view!=='game')return;
  if(skipRequested||performance.now()-started>=(reduced?420:2150))finish();
  else setTimeout(check,50);
 };setTimeout(check,50);
}
function toggleParty(force){if(view!=='game'||animating)return;partyOpen=typeof force==='boolean'?force:!partyOpen;renderBattle();sfx('select')}
function moveChoiceMarkup(p,e){
 const depleted=p.moves.every(slot=>slot.pp<=0);
 return p.moves.map((slot,i)=>{
  const move=MOVES[slot.name],struggle=slot.pp===0&&depleted,match=moveMatchup(slot,e);
  const label=struggle?'LAST RESORT / RECOIL':slot.pp===0?'OUT OF PP':match.label;
  const kind=struggle?'struggle':slot.pp===0?'empty':match.kind;
  const type=struggle?'Normal':move.type;
  const detail=move.power?`${move.power} PWR · ${move.accuracy}% ACC`:move.accuracy<100?`UTILITY · ${move.accuracy}% ACC`:'UTILITY';
  const glyph=move.power?'<path d="M13 2 5 13h5l-1 9 9-12h-5z"/>':'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="3.5" r="1.5"/><circle cx="19.4" cy="16.2" r="1.5"/><circle cx="4.6" cy="16.2" r="1.5"/>';
  const ppPercent=Math.max(0,Math.min(100,slot.pp/slot.maxPp*100));
  return `<button class="move-button matchup-${kind}" style="--move-accent:${pkmnColor(type)};--pp:${ppPercent}%" data-move="${i}" ${slot.pp===0&&!depleted?'disabled':''} aria-label="${htmlSafe(struggle?'Struggle':slot.name)}, ${slot.pp} of ${slot.maxPp} PP, ${htmlSafe(label)}, ${htmlSafe(detail)}"><span class="move-emblem" aria-hidden="true"><svg viewBox="0 0 24 24">${glyph}</svg></span><span class="move-content"><span class="move-top"><span class="move-name">${htmlSafe(struggle?'STRUGGLE':slot.name.toUpperCase())}</span><span class="move-num"><kbd>${i+1}</kbd></span></span><span class="move-meta"><span class="type-chip"><i class="type-dot" style="--type-color:${pkmnColor(type)}"></i>${htmlSafe(type.toUpperCase())}</span><span class="move-detail">${htmlSafe(detail)}</span></span><span class="move-footer"><span class="move-matchup">${htmlSafe(label)}</span><span class="move-pp"><i></i><b>${slot.pp}<small>/${slot.maxPp} PP</small></b></span></span></span></button>`;
 }).join('');
}
function partyChoiceMarkup(b,counters){
 return b.player.map((mon,i)=>{const counter=counters[i];return `<button class="party-btn ${i===b.pActive?'selected':''} ${counter?'has-counter':''}" data-switch="${i}" ${(mon.hp===0||i===b.pActive)?'disabled':''} aria-label="Switch to ${htmlSafe(mon.name)}, ${mon.hp} HP${counter?`, super-effective ${htmlSafe(counter.name)} times ${counter.multiplier}`:''}"><span class="party-avatar" style="--tcolor:${pkmnColor(mon.types[0])}">${spriteHTML(mon)}</span><span class="party-desc"><b>${htmlSafe(mon.name.toUpperCase())}</b><small>LV.${mon.level} &middot; ${mon.hp}/${mon.maxHp} HP</small><span class="party-life"><span style="width:${mon.hp/mon.maxHp*100}%"></span></span>${counter?`<span class="party-counter">COUNTER / ${htmlSafe(counter.name.toUpperCase())} &times;${counter.multiplier}</span>`:''}</span></button>`}).join('');
}
function renderBattle(b=run,{controls=true}={}){if(!b)return;setScene(b,'game');let p=active(b,'p'),e=active(b,'e');setHealth('player',p,b);setHealth('enemy',e,b);
 $('turn-number').textContent=String(b.turn).padStart(2,'0');$('team-number').textContent=String(alive(b.player)).padStart(2,'0')+' / 06';$('run-kicker').textContent=(b.mode==='daily'?'DAILY CHALLENGE':'PRACTICE SESSION')+' / '+b.date;$('scene-caption').textContent=b.pendingSwitch?'CHOOSE YOUR NEXT ALLY.':'SIX ALLIES. ONE FINAL BATTLE.';
 const counters=b.player.map(mon=>bestCounter(mon,e));
 for(const [side,party,index] of [['ally',b.player,b.pActive],['rival',b.foe,b.eActive]]){
  $(side+'-roster').innerHTML=party.map((mon,i)=>{
   const counter=side==='ally'?counters[i]:null;
   const detail=counter?`, counter move ${counter.name} times ${counter.multiplier}`:'';
   return `<span class="roster-pip ${mon.hp<=0?'is-out':i===index?'is-active':''} ${counter?'has-counter':''}" title="${htmlSafe(mon.name)}: ${mon.hp<=0?'fainted':`${mon.hp}/${mon.maxHp} HP`}${htmlSafe(detail)}" aria-label="${htmlSafe(mon.name)} ${mon.hp<=0?'fainted':i===index?'active':'ready'}${htmlSafe(detail)}"></span>`;
  }).join('');
 }
 renderAscent(b);
 const commandCard=$('active-command-card'),cardSignature=`${p.name}:${p.hp}:${p.status}:${b.pActive}`;
 if(commandCard.dataset.signature!==cardSignature){const arriving=commandCard.dataset.mon!==p.name;commandCard.dataset.signature=cardSignature;commandCard.dataset.mon=p.name;commandCard.style.cssText=`--active-color:${pkmnColor(p.types[0])}`;commandCard.innerHTML=`<span class="command-portrait">${spriteHTML(p)}</span><span class="command-identity"><small>NOW BATTLING / LV.${p.level}</small><strong>${htmlSafe(p.name.toUpperCase())}</strong><span class="command-types">${p.types.map(type=>`<b style="--type-color:${pkmnColor(type)}">${htmlSafe(type.toUpperCase())}</b>`).join('')}${p.status?`<b class="command-status">${htmlSafe(p.status.toUpperCase())}</b>`:''}</span></span><span class="command-vitals"><b>${p.hp}<small> / ${p.maxHp} HP</small></b><span class="command-life"><i style="width:${Math.max(0,Math.min(100,p.hp/p.maxHp*100))}%"></i></span></span>`;if(arriving){commandCard.classList.remove('is-arriving');void commandCard.offsetWidth;commandCard.classList.add('is-arriving')}}
 $('active-item').textContent='HELD ITEM — '+itemInfo(p);$('fx-speed-indicator').textContent='FX ×'+fxRate;scene.classList.toggle('danger-zone',p.hp/p.maxHp<.24);if(b===run&&view==='game')setMusicMode(p.hp/p.maxHp<.24?'critical':'battle');$('command-kicker').textContent=b.pendingSwitch?'YOUR ACTIVE ALLY HAS FAINTED':partyOpen?'CHOOSE A POKÉMON TO SWITCH':'CHOOSE YOUR NEXT MOVE';$('party-toggle').textContent=partyOpen?'← BACK TO MOVES':'⇄ VIEW PARTY';$('party-toggle').disabled=b.pendingSwitch; if(b.pendingSwitch)partyOpen=true;
 $('moves-panel').classList.toggle('hidden',partyOpen);$('party-panel').classList.toggle('hidden',!partyOpen);
 if(controls)$('moves-panel').innerHTML=moveChoiceMarkup(p,e);
 if(controls)$('party-panel').innerHTML=partyChoiceMarkup(b,counters);
 updateBattleTactics(b,p,e);
 $('round-label').textContent='LOG_'+String(b.turn).padStart(3,'0');$('battle-log').innerHTML=recapMarkup(b.log);$('battle-log').scrollTop=$('battle-log').scrollHeight;
}
async function action(a){
 if(view!=='game'||!run||animating)return;
 const before=structuredClone(run);
 if(!turn(run,a))return;
 const switched=a.kind==='switch';
 const finishedRun=run;
 save(); // the actual battle is committed immediately, safe across reloads
 const events=run.visualEvents||[];
 if(!events.length){if(switched)partyOpen=false;if(run.phase==='battle')renderBattle();else resultsView();return;}
 animating=true;skipRequested=false;
 const token=++animationToken;
 const displayed=before;
 const game=$('game-view');game.classList.add('is-animating');
 skipFx.textContent='» SKIP FX';skipFx.classList.remove('hidden');fxCaption.classList.remove('hidden');
 renderBattle(displayed);
 try{
  for(const ev of events){
   if(token!==animationToken||view!=='game')return;
   if(skipRequested)break;
   if(ev.kind==='switch'){
    // Switch arrives at the start of the cue so the incoming sprite gets its entrance effect.
    if(ev.side==='p')displayed.pActive=ev.index;else displayed.eActive=ev.index;
   }
   renderBattle(displayed,{controls:false});
   if(ev.kind==='switch'&&ev.side==='e')showFoeEntrance(displayed.foe[ev.index],ev.index);
   fxCaption.textContent=eventCaption(ev,displayed);
   if(ev.kind==='move')sfx('cast',ev.type);
   else if(ev.kind==='damage')sfx('impact',ev.amount);
   else if(ev.kind==='faint')sfx('faint');
   else if(ev.kind==='heal')sfx('heal');
   else if(ev.kind==='switch')sfx('select');
   else if(ev.kind==='critical')sfx('critical');
   else if(['miss','blocked','immune'].includes(ev.kind))sfx(ev.kind);
   const durations={move:650,damage:440,heal:390,status:380,buff:370,switch:540,faint:740,miss:270,blocked:270,immune:320,critical:310,effectiveness:290};
   await playSceneEvent(ev,Math.round((ev.kind==='switch'&&ev.side==='e'?1550:durations[ev.kind]||260)/fxRate));
   if(ev.kind==='switch'&&ev.side==='e'){
     if(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)await new Promise(resolve=>setTimeout(resolve,850));
     hideFoeEntrance();
   }
   if(ev.kind==='damage'||ev.kind==='heal'){
     // Apply the visual HP change only when the impact/recovery animation completes.
     const mon=(ev.side==='p'?displayed.player:displayed.foe)[ev.index];
     if(mon)mon.hp=ev.hp;
     renderBattle(displayed,{controls:false});
   }
  }
 }finally{
  if(token===animationToken){
   animating=false;clearSceneEffects();hideFoeEntrance();game.classList.remove('is-animating');skipFx.classList.add('hidden');fxCaption.classList.add('hidden');
   if(switched)partyOpen=false;
   if(view==='game'&&run===finishedRun){if(run.phase!=='battle'){recordResult();resultsView()}else renderBattle()}
  }
 }
}
function eventCaption(ev,displayed){
 const team=ev.side==='p'?displayed.player:displayed.foe;
 const mon=team?.[ev.index??(ev.side==='p'?displayed.pActive:displayed.eActive)];
 const name=mon?.name?.toUpperCase()||'POKÉMON';
 if(ev.kind==='miss')return `${name} DODGED THE ATTACK!`;
 if(ev.kind==='immune')return `NO EFFECT ON ${name}!`;
 if(ev.kind==='blocked')return `${name} WAS PROTECTED!`;
 if(ev.kind==='effectiveness')return ev.effectiveness>=2?'IT’S SUPER EFFECTIVE!':'IT’S NOT VERY EFFECTIVE…';
 if(ev.kind==='move')return `${ev.side==='p'?'YOUR':'RED’S'} ${name} · ${ev.move.toUpperCase()}`;
 if(ev.kind==='damage')return `${name} TOOK ${ev.amount} DAMAGE!`;
 if(ev.kind==='heal')return `${name} RECOVERED ${ev.amount} HP`;
 if(ev.kind==='faint')return `${ev.name.toUpperCase()} FAINTED!`;
 if(ev.kind==='critical')return 'A CRITICAL HIT!';
 if(ev.kind==='switch')return `${ev.side==='p'?'YOU':'RED'} SENT OUT ${ev.name.toUpperCase()}!`;
 if(ev.kind==='status')return `${name} · STATUS CHANGED`;
 return `${name} · STATS CHANGED`;
}
function recordResult(){if(!run||run.phase==='battle')return;const id=run.mode+':'+run.date+':'+run.seed;let all=records();if(!all.some(r=>r.id===id)){const r={id,...runSummary(run),score:battleScore(run)};all.unshift(r);store.set('records',all.slice(0,200))}}
function momentMarkup(moment,won){const label=moment?.kind==='finisher'?'THE DECISIVE STRIKE':'THE FINAL MOMENT';const detail=moment?.kind==='finisher'?`${moment.actor} used ${moment.move} against ${moment.target}.`:moment?.target?`${moment.target} fell as the ${won?'summit was claimed':'last ally was lost'}.`:'This record predates the decisive moment field.';return `<span class="moment-kicker">TURN ${Number.isInteger(moment?.turn)?moment.turn:'—'} / ${label}</span><strong>${htmlSafe(detail)}</strong>`}
function resultsView(){if(!run)return;hideFoeEntrance();recordResult();view='results';$('home-view').classList.add('hidden');$('game-view').classList.add('hidden');$('result-view').classList.remove('hidden');$('result-view').classList.toggle('is-victory',run.phase==='won');$('result-view').classList.toggle('is-defeat',run.phase!=='won');$('result-view').classList.remove('result-entrance');void $('result-view').offsetWidth;$('result-view').classList.add('result-entrance');$('result-sigil').textContent=run.phase==='won'?'✦':'✳';$('result-tag').textContent=(run.mode==='daily'?'DAILY / ':'PRACTICE / ')+(run.phase==='won'?'VICTORY':'DEFEAT');$('result-title').textContent=run.phase==='won'?'THE SUMMIT IS YOURS.':'THE SNOW FALLS AGAIN.';$('result-description').textContent=run.phase==='won'?'The challenger is finally silent. Your save file has a different ending.':'The mountain keeps its secret. Tomorrow, another team will try.';
 setMusicMode('results');$('result-turns').textContent=String(Math.max(0,run.turn-1)).padStart(2,'0');$('result-left').textContent=String(alive(run.player)).padStart(2,'0');$('result-score').textContent=Math.max(0,battleScore(run)).toLocaleString('en-US');$('result-moment').innerHTML=momentMarkup(run.moment,run.phase==='won');$('result-party').innerHTML=run.player.map(x=>`<span class="${x.hp===0?'out':''}">${spriteHTML(x)}${htmlSafe(String(x.name).toUpperCase())}</span>`).join('');$('result-note').textContent=run.mode==='daily'?'Your official daily run is locked on this device until tomorrow.':'Practice results never affect your daily streak.';sfx(run.phase==='won'?'success':'loss');window.scrollTo({top:0,behavior:'instant'})}
function loadCardSprite(mon){
 return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>{
   try{
    const cleaned=document.createElement('canvas');cleaned.width=image.naturalWidth;cleaned.height=image.naturalHeight;
    const context=cleaned.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
    const pixels=context.getImageData(0,0,cleaned.width,cleaned.height);
    clearWhiteBackdrop(pixels.data,pixels.width,pixels.height);context.putImageData(pixels,0,0);resolve(cleaned);
   }catch{resolve(image)}
  };
  image.onerror=()=>resolve(null);
  image.src=localSprite(mon); // Export uses only same-origin installed art.
 });
}
function loadCardBackdrop(){return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src='./assets/art/summit-night.png'})}
async function downloadResultCard(){
 if(!run)return;
 const result=run,button=$('result-card');button.disabled=true;button.textContent='PREPARING CARD...';
 try{
  const [sprites,backdrop]=await Promise.all([Promise.all(result.player.map(loadCardSprite)),loadCardBackdrop()]);
  const c=document.createElement('canvas');c.width=1200;c.height=630;const g=c.getContext('2d');
  const won=result.phase==='won';g.fillStyle='#10162d';g.fillRect(0,0,1200,630);
  if(backdrop){g.imageSmoothingEnabled=false;g.drawImage(backdrop,0,0,1200,630);g.fillStyle='#101827aa';g.fillRect(0,0,1200,630)}
  else{
   for(let i=0;i<42;i++){const x=(i*129+47)%1200,y=(i*71+57)%630;g.fillStyle=i%3?'#2b3757':'#657b93';g.fillRect(x,y,3,3)}
   g.fillStyle='#2b395a';g.beginPath();g.moveTo(0,430);g.lineTo(180,235);g.lineTo(320,377);g.lineTo(560,172);g.lineTo(890,400);g.lineTo(1080,218);g.lineTo(1200,325);g.lineTo(1200,630);g.lineTo(0,630);g.fill();
   g.fillStyle='#91b3c7';g.beginPath();g.moveTo(0,490);g.lineTo(235,340);g.lineTo(460,430);g.lineTo(770,315);g.lineTo(1200,463);g.lineTo(1200,630);g.lineTo(0,630);g.fill();
  }
  g.fillStyle='#f6d79d';g.font='bold 30px monospace';g.fillText('DAILY SILVER / SUMMIT REPORT',56,77);
  g.font='bold 74px Impact, sans-serif';g.fillText(won?'VICTORY RECORDED':'THE SUMMIT ENDURES',55,167);
  g.fillStyle='#e5edf0';g.font='bold 23px monospace';g.fillText((result.mode==='daily'?'DAILY CHALLENGE / ':'PRACTICE / ')+result.date,58,217);
  g.fillStyle='#f7d59d';g.font='bold 16px monospace';g.fillText('THE SIX WHO CLIMBED',58,251);
  sprites.forEach((sprite,i)=>{
   const mon=result.player[i],x=54+i*183,y=270;
   g.fillStyle='#17243c';g.fillRect(x,y,172,172);g.strokeStyle=mon.hp>0?'#a8c5c7':'#63758b';g.lineWidth=2;g.strokeRect(x+1,y+1,170,170);
   if(sprite){
    const sw=sprite.naturalWidth||sprite.width,sh=sprite.naturalHeight||sprite.height,scale=Math.min(116/sw,111/sh);
    const dw=Math.round(sw*scale),dh=Math.round(sh*scale);
    g.save();g.globalAlpha=mon.hp>0?1:.45;g.imageSmoothingEnabled=false;
    g.drawImage(sprite,Math.round(x+(172-dw)/2),Math.round(y+8+(114-dh)/2),dw,dh);g.restore();
   }
   g.fillStyle=mon.hp>0?'#f1f3e8':'#a8b2c0';g.font='bold 16px monospace';g.textAlign='center';g.fillText(mon.name.toUpperCase(),x+86,y+143,156);
   g.font='bold 11px monospace';g.fillStyle=mon.hp>0?'#a6dec4':'#efacb0';g.fillText(mon.hp>0?'SURVIVED':'FAINTED',x+86,y+161);g.textAlign='left';
  });
  g.fillStyle='#131c37';g.fillRect(46,463,1108,125);g.strokeStyle='#d5c39a';g.lineWidth=3;g.strokeRect(46,463,1108,125);
  g.fillStyle='#f6d79d';g.font='bold 32px monospace';g.fillText('SCORE '+battleScore(result),67,506);g.fillText('SURVIVORS '+alive(result.player)+'/6',68,555);g.fillText('TURNS '+(result.turn-1),720,506);
  g.fillStyle='#d0e0e7';g.font='18px monospace';g.fillText('RED: '+alive(result.foe)+'/6 REMAINING',720,553);
  const a=document.createElement('a');a.download='daily-silver-'+(result.mode==='daily'?result.date:'practice')+'.png';a.href=c.toDataURL('image/png');document.body.append(a);a.click();a.remove();sfx('select');
 }catch(error){console.error('Could not export result card',error);button.textContent='CARD EXPORT FAILED';setTimeout(()=>button.textContent='SAVE RESULT CARD',2500);return}
 finally{button.disabled=false;if(button.textContent==='PREPARING CARD...')button.textContent='SAVE RESULT CARD'}
}
function shareText(){let marks=run.foe.map(x=>x.hp===0?'■':'□').join('');return `DAILY SILVER — ${run.mode==='daily'?run.date:'PRACTICE'}\n${run.phase==='won'?'✦ THE SUMMIT IS YOURS':'✳ THE SUMMIT REMEMBERS'}\nRed: ${marks}\nSurvivors: ${alive(run.player)}/6 · Turns: ${run.turn-1} · Score: ${Math.max(0,battleScore(run))}\n#DailySilver`}
function openModal(kicker,html){$('modal').classList.toggle('modal-settings',kicker==='PERSONALIZE / SYSTEM');$('modal').classList.toggle('modal-archive',kicker==='SAVE FILES / ARCHIVE');$('modal').classList.toggle('modal-recap',kicker==='BATTLE / TURN RECAP');$('modal-kicker').textContent=kicker;$('modal-body').innerHTML=html;if(!$('modal').open)$('modal').showModal()}
function showTurnRecap(){
 if(!run)return;
 const lineup=(party,label)=>`<div class="recap-lineup"><span>${label}</span><div>${party.map(mon=>spriteHTML(mon)).join('')}</div></div>`;
 const {knockouts,decisive}=replayMoments(run);
 const cards=knockouts.map((note,i)=>{
  const mon=(note.side==='e'?run.foe:run.player)?.[note.index];
  const cause=note.move?`${note.actor} used ${note.move}.`:'The field record did not capture the finishing move.';
  return `<button type="button" class="replay-highlight ${note.side==='e'?'foe-down':'ally-down'}" data-recap-turn="${Number(note.turn)||0}" aria-label="Turn ${note.turn}: ${htmlSafe(note.name)} fainted"><span class="replay-index">${String(i+1).padStart(2,'0')} / TURN ${String(note.turn).padStart(2,'0')}</span>${mon?spriteHTML(mon):''}<span><strong>${htmlSafe(note.name.toUpperCase())} FAINTED</strong><small>${note.side==='e'?"RED'S TEAM":'YOUR TEAM'} / ${htmlSafe(cause)}</small></span></button>`;
 }).join('');
 const decisiveCard=decisive?`<div class="replay-decisive"><span>DECISIVE TURN / ${String(decisive.turn).padStart(2,'0')}</span><strong>${decisive.kind==='finisher'?`${htmlSafe(decisive.actor)} used ${htmlSafe(decisive.move)} against ${htmlSafe(decisive.target)}.`:decisive.kind==='final-faint'?`${htmlSafe(decisive.target)} fell. The battle ended on turn ${decisive.turn}.`:'The final turn was recorded before detailed highlights were added.'}</strong></div>`:'';
 openModal('BATTLE / TURN RECAP',`<div class="recap-cover"><span class="archive-kicker">SUMMIT FIELD RECORD / ${htmlSafe(run.date)}</span><h2>${run.phase==='won'?'THE SUMMIT WAS YOURS.':run.phase==='lost'?'THE SUMMIT ENDURED.':'THE BATTLE CONTINUES.'}</h2><p>${Math.max(0,run.turn-1)} TURNS &middot; ${alive(run.player)} ALLIES STANDING</p></div><div class="recap-lineups">${lineup(run.player,'YOUR TEAM')}${lineup(run.foe,"RED'S TEAM")}</div>${decisiveCard}<div class="archive-section-head"><span>KNOCKOUT HIGHLIGHTS</span><small>${knockouts.length} MOMENTS</small></div><div class="replay-moments">${cards||'<p class="replay-empty">No knockouts recorded yet.</p>'}</div><div class="archive-section-head"><span>TURN BY TURN</span><small>${run.log.length} FIELD NOTES</small></div><div class="recap-timeline">${recapMarkup(run.log,run.log.length,decisive?.turn)}</div>`);
}
function showHow(){openModal('FIELD GUIDE / 001',`<h2>ONE SUMMIT. ONE SAVE.</h2><p>Daily Silver is a standalone, <strong>unofficial fan-made Generation II-inspired</strong> battle challenge. Each UTC day gives every player the same six randomized Pokémon, with predefined moves and held items.</p><ul><li><strong>1. Make your move:</strong> Pick one of four attacks, or switch to another ally. The other trainer responds automatically.</li><li><strong>2. Outlast six:</strong> Defeat Red's six familiar Pokémon before your last ally falls.</li><li><strong>3. One daily result:</strong> Your daily result is locked after a win or loss. You can resume a battle if you close the browser.</li><li><strong>4. Practice forever:</strong> Practice creates new teams and never changes your daily result.</li><li><strong>5. Know the era:</strong> No Fairy type or abilities; physical and special damage depend on the move's <em>type</em>, just like Gen II. This is a curated simulation, not a ROM or pixel-perfect Crystal emulator.</li><li><strong>6. Controls:</strong> Click / tap moves, press <strong>1–4</strong> to attack, <strong>P</strong> for party, and <strong>Esc</strong> to dismiss dialogs.</li></ul><p><strong>Privacy:</strong> Runs and scores live only in your browser's localStorage. Clearing browser data removes them. The daily limit isn't tamper-proof.</p>`)}
function validArchiveDate(date){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&date<today&&Date.parse(date+'T00:00:00Z')>=Date.parse('2026-01-01T00:00:00Z')}
function replayArchive(date){if(!validArchiveDate(date))return;run=createRun({mode:'practice',date,seed:dailySeed(date)});store.set('practice',run);$('modal').close();sfx('select');battleView({intro:true})}
function recordTeamMarkup(entry){
 if(!Array.isArray(entry.party)||!entry.party.length)return '<span class="record-team-empty">TEAM DETAILS UNAVAILABLE FOR THIS RECORD</span>';
 return entry.party.slice(0,6).map(name=>{
  const label=htmlSafe(String(name).slice(0,40));let art='';
  try{art=spriteHTML(String(name))}catch{} // Older or expanded records may have names outside the local sprite map.
  return `<span class="record-mon">${art}<small>${label}</small></span>`;
 }).join('');
}
function showRecords(){
 const s=stats(),r=records().filter(x=>x&&x.mode==='daily'&&typeof x.date==='string');
 const wins=s.played?Math.round(s.wins/s.played*100):0;
 const lastDays=Array.from({length:21},(_,i)=>{const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-i-1);return d.toISOString().slice(0,10)});
 const dateRecords=new Map(r.map(x=>[x.date,x]));
 const cards=r.length?r.slice(0,30).map((x,i)=>{
  const score=Number.isFinite(x.score)?Math.max(0,x.score).toLocaleString('en-US'):'--';
  const survivors=Number.isInteger(x.remaining)?Math.max(0,Math.min(6,x.remaining)):'--';
  const turns=Number.isInteger(x.turns)?Math.max(0,x.turns-1):'--';
  return `<article class="record-card ${x.won?'win':'loss'}"><header><span>FILE ${String(i+1).padStart(3,'0')} / ${htmlSafe(x.date)}</span><strong>${x.won?'VICTORY':'DEFEAT'}</strong></header><div class="record-card-title">${x.won?'THE SUMMIT WAS YOURS.':'THE SUMMIT ENDURED.'}</div><div class="record-team" aria-label="Team fielded">${recordTeamMarkup(x)}</div><div class="record-moment">${momentMarkup(x.moment,x.won)}</div><footer><span><b>${survivors}/6</b><small>SURVIVORS</small></span><span><b>${turns}</b><small>TURNS</small></span><span><b>${score}</b><small>SCORE</small></span></footer></article>`;
 }).join(''):'<div class="archive-empty"><span aria-hidden="true">&#10022;</span><strong>YOUR STORY BEGINS HERE.</strong><p>Finish an official daily challenge to add its team and result to the archive.</p></div>';
 openModal('SAVE FILES / ARCHIVE',`<div class="archive-cover"><span class="archive-kicker">THE SILVER ARCHIVES / PERSONAL RECORD</span><span class="archive-emblem" aria-hidden="true">&#10022;</span><h2>HALL OF <em>FAME.</em></h2><p>Every official run leaves a record on this device.</p></div><div class="record-stats"><div><b>${s.wins}</b><small>VICTORIES</small></div><div><b>${wins}%</b><small>WIN RATE</small></div><div><b>${s.best}</b><small>BEST STREAK</small></div></div><div class="archive-section-head"><span>01 / COMPLETED CHALLENGES</span><small>${s.played} RECORDED</small></div><div class="record-list">${cards}</div><details class="archive-replays"><summary><span>02 / REPLAY PAST DAYS</span><small>21 SEEDS &middot; PRACTICE ONLY</small></summary><p>Archive replays cannot rewrite your original daily results.</p><div class="archive-list">${lastDays.map(d=>`<button type="button" data-archive="${d}">${d}<small>${dateRecords.has(d)?dateRecords.get(d).won?'WON':'LOST':'UNPLAYED'} &middot; PRACTICE REPLAY &rarr;</small></button>`).join('')}</div></details><div class="archive-data"><div class="settings-row"><label>Backup your save history</label><button data-export="1" type="button">EXPORT JSON &darr;</button></div><div class="settings-row"><label>Restore a saved backup</label><button data-import="1" type="button">IMPORT JSON &uarr;</button></div></div>`);
}
function showSettings(){
 const speeds=[['.5','CINEMATIC','Take it all in'],['1','CLASSIC','The intended rhythm'],['1.5','SWIFT','A little quicker'],['2','RAPID','Skip the pauses'],['3','TURBO','Straight to the action']];
 const speedCards=speeds.map(([value,title,description])=>`<label class="speed-option"><input type="radio" name="fx-rate" value="${value}" ${Number(value)===fxRate?'checked':''}><span class="speed-option-surface"><strong>${value}&times;</strong><b>${title}</b><small>${description}</small></span></label>`).join('');
 openModal('PERSONALIZE / SYSTEM',`<div class="settings-panel">
  <div class="settings-intro"><span class="settings-overline">YOUR JOURNEY, YOUR PACE</span><h2>TUNE THE <em>EXPERIENCE.</em></h2><p>Make the summit feel right. Your preferences stay on this device.</p></div>
  <fieldset class="settings-section settings-speed"><legend><span>01 / BATTLE PACING</span><small>Choose an animation rhythm</small></legend><div class="speed-choices">${speedCards}</div></fieldset>
  <div class="settings-section settings-sound"><div class="settings-sound-head"><span class="settings-section-title">02 / SOUND & ATMOSPHERE<small>An original synthesized soundtrack</small></span><label class="sound-switch"><input id="sound-enabled" type="checkbox" ${isSoundOn()?'checked':''}><span class="sound-switch-track" aria-hidden="true"><span></span></span><span class="switch-caption">SOUND <b id="sound-state">${isSoundOn()?'ON':'OFF'}</b></span></label></div>
   <div class="volume-row"><label for="volume-level">OUTPUT LEVEL</label><input id="volume-level" aria-label="Audio volume" type="range" min="5" max="100" value="${Math.round(getMasterVolume()*100)}"><output id="volume-output" for="volume-level">${Math.round(getMasterVolume()*100)}%</output></div>
   <div class="volume-row"><label for="music-level">MUSIC MIX</label><input id="music-level" aria-label="Music balance against battle effects" type="range" min="0" max="100" value="${Math.round(getMusicLevel()*100)}"><output id="music-output" for="music-level">${Math.round(getMusicLevel()*100)}%</output></div>
   <p class="mix-note">Battle effects briefly lower the soundtrack so every action stays clear.</p></div>
  <div class="settings-section settings-mix-display"><span class="settings-section-title">03 / DISPLAY<small>Read the battle at a glance</small></span><label class="contrast-toggle"><input id="contrast-enabled" type="checkbox" ${highContrast?'checked':''}><span class="contrast-check" aria-hidden="true"></span><span><strong>HIGH CONTRAST</strong><small>Clearer battle text, cards and HP bars</small></span></label></div>
  <div class="settings-section settings-data"><div><span class="settings-section-title">04 / YOUR SAVE FILES<small>Archive, import and continue</small></span></div><div class="settings-data-actions"><button type="button" data-show-records="1"><span aria-hidden="true">&#9638;</span> VIEW ARCHIVE <span aria-hidden="true">&rarr;</span></button><button type="button" data-import="1"><span aria-hidden="true">&#8679;</span> RESTORE BACKUP <span aria-hidden="true">&rarr;</span></button></div></div>
  <p class="settings-note">Reduced-motion settings are respected. Combat animation can also be skipped. Back up your saves before clearing your browser data.</p></div>`)
}

function exportSave(){const entries={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(APP_ID+':'))continue;const name=key.slice((APP_ID+':').length);const value=store.get(name);if(value!==null)entries[name]=value}entries.volume=getMasterVolume();const data={app:'daily-silver',exportVersion:2,exportedAt:new Date().toISOString(),entries};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='daily-silver-backup-'+today+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('daily-button').addEventListener('click',()=>launch('daily'));
$('practice-button').addEventListener('click',()=>launch('practice'));
$('brand').addEventListener('click',e=>{e.preventDefault();navigate(viewHome)});
$('leave-button').addEventListener('click',()=>navigate(viewHome));
$('how-button').addEventListener('click',showHow);$('settings-button').addEventListener('click',showSettings);$('records-button').addEventListener('click',showRecords);
$('modal-close').addEventListener('click',()=>$('modal').close());
// Native <dialog> keeps ESC/focus trapping. Only taps truly outside its bounds dismiss it.
$('modal').addEventListener('click',event=>{
 if(event.target!==$('modal'))return;
 const rect=$('modal').getBoundingClientRect();
 const outside=event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;
 if(outside)$('modal').close();
});
const backupPicker=document.createElement('input');backupPicker.type='file';backupPicker.accept='.json,application/json';backupPicker.hidden=true;document.body.append(backupPicker);
backupPicker.addEventListener('change',async()=>{
 const file=backupPicker.files?.[0];backupPicker.value='';if(!file)return;
 try{
  if(file.size>2_000_000)throw Error('File exceeds the 2 MB backup limit.');
  const values=validateBackup(await file.text());
  if(!confirm(`Restore ${Object.keys(values).length} save entries? Existing entries with the same keys will be replaced. Make a backup first if needed.`))return;
  for(const [key,value] of Object.entries(values))store.set(key,value);
  fxRate=Math.max(.5,Math.min(3,Number(store.get('fx-rate'))||1));
  if(Object.hasOwn(values,'volume'))setMasterVolume(values.volume);
  if(Object.hasOwn(values,'music-level'))setMusicLevel(values['music-level']);
  if(Object.hasOwn(values,'high-contrast'))setContrast(values['high-contrast']);
  if(Object.hasOwn(values,'sound-enabled'))setSound(values['sound-enabled']);
  $('modal').close();viewHome();
  alert('Save restoration completed.');
 }catch(error){alert('Could not restore backup: '+error.message)}
});
$('modal-body').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.archive)replayArchive(b.dataset.archive);else if(b.dataset.export)exportSave();else if(b.dataset.import)backupPicker.click();else if(b.dataset.showRecords)showRecords();else if(b.dataset.recapTurn){const turn=Number(b.dataset.recapTurn),dialog=$('modal'),section=$('modal-body').querySelector(`.recap-turn[data-turn="${turn}"]`);if(Number.isInteger(turn)&&section){const offset=section.getBoundingClientRect().top-dialog.getBoundingClientRect().top-108;dialog.scrollTo({top:dialog.scrollTop+offset,behavior:'smooth'});section.classList.remove('recap-jump-focus');requestAnimationFrame(()=>section.classList.add('recap-jump-focus'));setTimeout(()=>section.classList.remove('recap-jump-focus'),1400)}}});
$('modal-body').addEventListener('change',e=>{if(e.target.name==='fx-rate'){fxRate=Math.max(.5,Math.min(3,Number(e.target.value)||1));store.set('fx-rate',fxRate);}if(e.target.id==='sound-enabled'){setSound(e.target.checked);const state=$('sound-state');if(state)state.textContent=e.target.checked?'ON':'OFF';updateSoundLabel(e.target.checked);$('sound-button').setAttribute('aria-pressed',String(e.target.checked));}if(e.target.id==='volume-level')setMasterVolume(Number(e.target.value)/100)});
$('modal-body').addEventListener('input',e=>{if(e.target.id==='volume-level'){const out=$('volume-output');if(out)out.textContent=e.target.value+'%';setMasterVolume(Number(e.target.value)/100)}});
$('modal-body').addEventListener('input',e=>{if(e.target.id==='music-level'){const out=$('music-output');if(out)out.textContent=e.target.value+'%';setMusicLevel(Number(e.target.value)/100)}});
$('modal-body').addEventListener('change',e=>{if(e.target.id==='contrast-enabled')setContrast(e.target.checked)});
$('sound-button').addEventListener('click',()=>{if(isSoundOn()&&!isSoundReady())resumeSound();else setSound(!isSoundOn());updateSoundLabel(isSoundOn());$('sound-button').setAttribute('aria-pressed',isSoundOn())});
$('party-toggle').addEventListener('click',()=>toggleParty());
for(const eventName of ['click','focusin','pointerover'])$('hero-preview-party').addEventListener(eventName,e=>{const button=e.target.closest('[data-preview]');if(button)previewAlly(Number(button.dataset.preview))});
$('moves-panel').addEventListener('click',e=>{const b=e.target.closest('[data-move]');if(b)action({kind:'move',index:Number(b.dataset.move)})});
$('party-panel').addEventListener('click',e=>{const b=e.target.closest('[data-switch]');if(b)action({kind:'switch',index:Number(b.dataset.switch)})});
$('result-card').addEventListener('click',downloadResultCard);$('result-home').addEventListener('click',()=>navigate(viewHome));$('result-practice').addEventListener('click',()=>{store.set('practice',null);launch('practice')});
$('result-recap').addEventListener('click',showTurnRecap);
$('share-button').addEventListener('click',async()=>{const t=shareText();try{await navigator.clipboard.writeText(t);$('share-button').textContent='RESULT COPIED ✓'}catch{openModal('COPY RESULT',`<h2>YOUR RESULT.</h2><textarea readonly style="width:100%;min-height:190px;background:#11172f;color:#fff;padding:10px">${t}</textarea>`)}setTimeout(()=>$('share-button').textContent='COPY BATTLE RESULT ↗',1800)});
document.addEventListener('keydown',e=>{if($('modal').open||view!=='game'||e.target?.closest?.('input, textarea, select, [contenteditable="true"]'))return;if(/^[1-4]$/.test(e.key)&&!partyOpen&&!run.pendingSwitch){e.preventDefault();action({kind:'move',index:Number(e.key)-1})}if(e.key.toLowerCase()==='p'){e.preventDefault();if(!run.pendingSwitch)toggleParty()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else refreshUtcDay()});
window.addEventListener('focus',refreshUtcDay);
setInterval(refreshUtcDay,30000);
window.addEventListener('beforeunload',save);
installSpriteImageFallback();setScene(null,'home');updateHome();updateSoundLabel(isSoundOn());$('sound-button').setAttribute('aria-pressed',String(isSoundOn()));
// Browser service worker, optional for offline reload after the first visit.
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
