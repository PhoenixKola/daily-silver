import {createRun,turn,active,alive,DAY_KEY,dailySeed,pkmnColor,battleScore,APP_ID} from './engine.js';
import {MOVES,SPECIAL} from './data.js';
import {spriteHTML,installSpriteImageFallback,localSprite,clearWhiteBackdrop} from './sprites.js';
import {BOSS_ENTRANCES} from './entrances.js';
import {moveMatchup} from './matchups.js';
import {validateBackup} from './backup.js';
import {sfx,setSound,isSoundOn,isSoundReady,resumeSound,setMusicMode,setMasterVolume,setMusicLevel,setEffectsLevel,setEncounterState,setAmbience,playStinger} from './sound.js';
import {createStage} from './pres/stage.js';
import {preload} from './pres/assets.js';
import {buildBeats} from './pres/beats.js';
import {planSequence} from './pres/plan.js';
import {timingOf} from './pres/families.js';
import {createDirector} from './pres/director.js';
import {stageForFallen,STAGE_NAMES} from './pres/atmosphere.js';
import {conditionsOf,STATUS_SHORT,fieldOf,boostsOf} from './pres/conditions.js';
import {moveFacts,categoryOf} from './moveinfo.js';
import {startLab,createLabSession,remember,undo,canUndo,retry,compare,explainTurn,isLab,clone} from './lab.js';
import {startRecording,recordTurn,finishRecording,stateAt,knockoutMarkers,decisiveTurnIndex,replayId} from './recorder.js';
import {store,loadRun,dailyKey,saveRun,recordResult,stats,saveReplay,loadReplay} from './store.js';
import {settings,applySettings,reducedMotion} from './settings.js';
import {$,esc,icon,typeChip,catChip,pct,hpClass,toast,transition} from './ui/dom.js';
import {initSheet,openSheet,closeSheet,forceClose,isSheetOpen,helpSheet,settingsSheet,dossierSheet,moveSheet,archiveSheet,labSheet,compareSheet} from './ui/sheets.js';

let today=DAY_KEY(),view='home',run=null,preview=null,rec=null,busy=false,token=0,introduced=new Set(),lab=createLabSession(),lastBefore=null,replay=null,focusIndex=0;
const director=createDirector();
const live=document.createElement('div');live.className='sr-only';live.setAttribute('aria-live','polite');live.setAttribute('role','status');document.body.append(live);
const announce=text=>{live.textContent='';setTimeout(()=>{live.textContent=text},40)};

// ---------------------------------------------------------------- stage
const hooks={
 sfx:(type,detail,opts)=>{if(!replayMuted)sfx(type,detail,opts)},
 caption:c=>setOutcome(c.text,c.tone),
 hud:display=>renderHud(display),
 timing:timingOf,
 categoryOf:type=>SPECIAL.has(type)?'special':'physical',
 intro:c=>showIntro(c),
 settle:()=>{}
};
let replayMuted=false;
const stage=createStage($('stage-canvas'),hooks);
applySettings(stage);
matchMedia?.('(prefers-reduced-motion: reduce)')?.addEventListener?.('change',()=>applySettings(stage));

function setOutcome(text,tone=''){const el=$('outcome');el.textContent=text||'';el.dataset.tone=tone}
const rate=()=>settings.speed;
const names=(team,cur)=>(side,index)=>team[side][index??cur[side]]?.name||'';

// ---------------------------------------------------------------- day handling
function refreshDay(){
 const now=DAY_KEY(),changed=now!==today;today=now;
 const serial=Math.max(1,Math.floor((Date.parse(today+'T00:00:00Z')-Date.parse('2026-01-01T00:00:00Z'))/864e5)+1);
 $('home-kicker').textContent=`Daily ${String(serial).padStart(4,'0')} · ${new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',timeZone:'UTC'}).format(new Date(today+'T12:00:00Z')).toUpperCase()}`;
 if(changed&&view==='home')showHome();
 return changed;
}

// ---------------------------------------------------------------- views
function setView(next){
 view=next;$('app').dataset.view=next;
 $('panel-home').hidden=next!=='home';$('panel-battle').hidden=next!=='game';$('panel-replay').hidden=next!=='replay';$('panel-results').hidden=next!=='results';
 $('home-overlay').hidden=next!=='home';$('hud').hidden=!(next==='game'||next==='replay');
 $('journal-button').hidden=!(next==='game'||next==='results');
 $('bar-title').textContent='';
}
function leaveBattle(){director.cancel();token++;busy=false;hideIntro();skipUi(false);stage.clear()}
function showHome(){
 leaveBattle();run=null;rec=null;replay=null;
 transition(()=>{
  setView('home');stage.setMode('home');
  preview=createRun({mode:'daily',date:today});
  stage.setDisplay(preview,{mode:'home',snap:true});stage.setFocus(0);focusIndex=0;
  const saved=loadRun(dailyKey(today)),done=saved&&saved.phase!=='battle';
  $('daily-label').textContent=done?"View today's result":saved?'Resume daily battle':"Begin today's battle";
  $('daily-note').textContent=done?`Today's official attempt is complete. The next team arrives at 00:00 UTC.`:saved?`Saved safely on this browser, turn ${saved.turn}.`:'One official attempt per day. A new team arrives at 00:00 UTC.';
  $('team-list').innerHTML=preview.player.map((p,i)=>`<li><button type="button" class="team-mon" data-i="${i}" aria-pressed="${i===0}" aria-label="Inspect ${esc(p.name)}, ${esc(p.types.join(' and '))}">${spriteHTML(p)}<b>${esc(p.name.toUpperCase())}</b><small>${esc(p.types[0].toUpperCase())}</small></button></li>`).join('');
 });
 setMusicMode('home');setAmbience(0);refreshDay();
}
function setFocus(i){focusIndex=i;stage.setFocus(i);$('team-list').querySelectorAll('.team-mon').forEach((b,k)=>b.setAttribute('aria-pressed',String(k===i)))}

// ---------------------------------------------------------------- HUD + commands
function plateHTML(mon,team,activeIdx,field,label){
 if(!mon)return '';
 const p=pct(mon.hp,mon.maxHp),tags=[];
 for(const c of conditionsOf(mon)){const text={par:'PAR',brn:'BRN',psn:'PSN',tox:'TOX',slp:'SLP',frz:'FRZ',confused:'CONFUSED',seed:'SEEDED',curse:'CURSED',trap:'TRAPPED',substitute:'SUBSTITUTE'}[c]||c;tags.push(`<span class="tag t-bad">${text}</span>`)}
 for(const b of boostsOf(mon))tags.push(`<span class="tag ${b.stage>0?'t-good':'t-bad'}" title="${b.stat} ${b.stage}">${b.stage>0?'▲':'▼'} ${({atk:'ATK',def:'DEF',spa:'SPA',spd:'SPD',spe:'SPE',accuracy:'ACC'})[b.stat]||b.stat.toUpperCase()}${Math.abs(b.stage)>1?' ×'+Math.abs(b.stage):''}</span>`);
 if(field.reflect>0)tags.push(`<span class="tag t-field">REFLECT ${field.reflect}</span>`);
 if(field.lightScreen>0)tags.push(`<span class="tag t-field">LIGHT SCREEN ${field.lightScreen}</span>`);
 if(field.spikes>0)tags.push('<span class="tag t-field">SPIKES</span>');
 return `<div class="plate-top"><span class="plate-name">${esc(mon.name.toUpperCase())}</span><span class="plate-lv">Lv.${mon.level}</span><span class="plate-side" role="img" aria-label="${esc(label)}: ${team.filter(m=>m.hp>0).length} of 6 standing">${team.map((m,i)=>`<i class="pip ${m.hp<=0?'is-out':''} ${i===activeIdx?'is-active':''}"></i>`).join('')}</span></div>
 <div class="hp"><span class="hp-label">HP</span><span class="hp-track"><span class="hp-fill ${hpClass(p)}" style="width:${p}%"></span></span><span class="hp-num">${mon.hp}/${mon.maxHp}</span></div>
 <div class="tags">${tags.join('')}</div>`;
}
function renderHud(d){
 if(!d)return;
 const p=d.player[d.pActive],e=d.foe[d.eActive];
 $('plate-foe').innerHTML=plateHTML(e,d.foe,d.eActive,fieldOf(d,'e'),"Red's team");$('plate-foe').style.setProperty('--tc',pkmnColor(e?.types[0]));
 $('plate-ally').innerHTML=plateHTML(p,d.player,d.pActive,fieldOf(d,'p'),'Your team');$('plate-ally').style.setProperty('--tc',pkmnColor(p?.types[0]));
}
function tacticalTag(slot,foe){
 const move=MOVES[slot.name],facts=moveFacts(slot.name),match=moveMatchup(slot,foe);
 if(slot.pp<=0)return ['No PP left','bad'];
 if(match.kind==='immune')return ['No effect','bad'];
 if(facts.warnings.length&&match.kind!=='counter')return [`⚠ ${facts.warnings[0].replace(/^Recoil:.*/,'Recoil').replace(/^The user must recharge.*/,'Recharge turn').replace(/^Takes a turn.*/,'Charges first').replace(/^The user faints.*/,'User faints').replace(/^The user is hurt.*/,'Crash risk').replace(/^The user falls asleep.*/,'Sleeps after')}`,'warn'];
 if(match.kind==='counter')return [`Super effective ×${match.multiplier}`,'good'];
 if(match.kind==='resisted')return [`Resisted ×${match.multiplier}`,'bad'];
 if(match.kind==='fixed')return ['Fixed damage',''];
 if(match.kind==='utility'){
  if(move.heal)return ['Recovers HP','good'];if(move.boost)return ['Raises stats','good'];if(move.targetBoost)return ['Lowers target','warn'];
  if(move.status)return ['Inflicts status','warn'];if(['reflect','lightScreen','protect','substitute'].includes(move.special))return ['Defensive','good'];
  return ['Utility',''];
 }
 return ['Neutral ×1',''];
}
function renderMoves(b){
 const p=active(b,'p'),e=active(b,'e'),depleted=p.moves.every(s=>s.pp<=0);
 $('moves').innerHTML=p.moves.map((slot,i)=>{
  const m=MOVES[slot.name],f=moveFacts(slot.name),[tag,tone]=tacticalTag(slot,e),struggle=slot.pp===0&&depleted,type=struggle?'Normal':m.type;
  const detail=f.power?`${f.power} pwr · ${f.accuracy}%`:`${f.accuracy}% acc`;
  return `<div class="move" style="--mc:${pkmnColor(type)}">
   <button class="move-main" type="button" data-move="${i}" ${slot.pp===0&&!depleted?'disabled':''} aria-label="${esc(struggle?'Struggle':slot.name)}, ${esc(type)}, ${f.category}, ${detail}, ${slot.pp} of ${slot.maxPp} PP, ${esc(tag)}. Key ${i+1}.">
    <span class="move-name"><span>${esc(struggle?'STRUGGLE':slot.name.toUpperCase())}</span><kbd aria-hidden="true">${i+1}</kbd></span>
    <span class="move-meta">${typeChip(type)}${catChip(f.category)}<span>${esc(detail)}</span></span>
    <span class="move-foot"><span class="move-tag ${tone}">${esc(tag)}</span><span class="move-pp ${slot.pp<=2?'low':''}">${slot.pp}/${slot.maxPp} PP</span></span>
   </button>
   <button class="move-info" type="button" data-info="${i}" aria-label="Details for ${esc(slot.name)}">${icon('info')}</button>
  </div>`}).join('');
}
function renderCommand(){
 if(!run)return;
 const cmd=document.querySelector('.command');
 cmd.setAttribute('aria-busy',String(busy));
 $('command-state').textContent=busy?'Resolving…':run.pendingSwitch?'Your ally fainted. Choose who comes next.':'Choose a move';
 renderMoves(run);
 $('moves').querySelectorAll('button').forEach(b=>{if(busy)b.disabled=true});
 $('party-button').disabled=busy;
 const labOn=isLab(run);$('lab-tools').hidden=!labOn;
 if(labOn){$('lab-undo').disabled=busy||!canUndo(lab);$('lab-retry').disabled=busy;$('lab-compare').disabled=busy||run.pendingSwitch}
 const stg=stageForFallen(run.foe.filter(m=>m.hp<=0).length);
 $('bar-title').textContent=`Turn ${String(run.turn).padStart(2,'0')} · ${STAGE_NAMES[stg]}${run.mode==='practice'?(labOn?' · Lab':' · Practice'):''}`;
}
function syncAudio(){
 if(!run)return;
 const fallen=run.foe.filter(m=>m.hp<=0).length,p=active(run,'p');
 setEncounterState({stage:stageForFallen(fallen),foesDown:fallen,critical:p.hp/p.maxHp<.24&&p.hp>0});
 setAmbience(stageForFallen(fallen));
}
function renderAll(){renderHud(stage.display||run);renderCommand();syncAudio()}

// ---------------------------------------------------------------- intro card, skip control
function showIntro(c){
 const mon=stage.display?.foe?.[c.index],card=BOSS_ENTRANCES[c.name];if(!mon||!card)return;
 const el=$('intro-card');el.style.setProperty('--tc',pkmnColor(mon.types[0]));
 el.innerHTML=`<small>Red's team · ${c.index+1} of 6</small><strong>${esc(c.name.toUpperCase())}</strong><em>${esc(card.title)}</em><p>${esc(card.line)}</p>`;el.hidden=false;
 setTimeout(hideIntro,Math.round(1500/rate()));
}
function hideIntro(){$('intro-card').hidden=true}
function skipUi(on,label='Skip'){$('skip-fab').hidden=!on;$('skip-label').textContent=label}
function skip(){if(stage.cinematic)stage.skipCinematic();director.skip()}
$('skip-fab').addEventListener('click',skip);

// ---------------------------------------------------------------- starting battles
async function enterBattle({fresh,intro}){
 setView('game');
 stage.setDisplay(run,{mode:'battle',snap:true});
 setOutcome('');renderAll();
 setMusicMode('battle');
 if(fresh){
  busy=true;renderCommand();const my=++token;skipUi(true,'Skip intro');$('hud').hidden=true;
  setMusicMode('cinematic');
  await stage.playCinematic('opening');
  if(my!==token||view!=='game')return;
  $('hud').hidden=false;setMusicMode('battle');
  // first send-out: both sides arrive in one deliberate beat sequence
  stage.setDisplay(run,{mode:'battle',snap:true});stage.hide('p',true);stage.hide('e',true);
  const beats=buildBeats([{kind:'switch',side:'e',index:run.eActive,name:active(run,'e').name,voluntary:true},{kind:'switch',side:'p',index:run.pActive,name:active(run,'p').name,voluntary:true}]);
  const plan=planSequence(beats,{names:names({p:run.player,e:run.foe},{p:run.pActive,e:run.eActive}),reduced:reducedMotion(),seenFoes:[...introduced]});
  introduced.add(run.eActive);run.introduced=[...introduced];saveRun(run);
  await director.play(plan.cues,stage.cues,{rate:rate()});
  if(my!==token)return;
  stage.hide('p',false);stage.hide('e',false);stage.settleTo(run);
  busy=false;skipUi(false);hideIntro();setOutcome(`Your ${active(run,'p').name} faces ${active(run,'e').name}.`);renderAll();focusFirstMove();
 }else{
  busy=false;renderAll();
  if(run.pendingSwitch)openParty(true);
 }
}
function inferIntroduced(b){
 const s=new Set(Array.isArray(b.introduced)?b.introduced:[]);
 b.foe.forEach((m,i)=>{if(m.hp<m.maxHp||m.hp<=0||i===b.eActive)s.add(i)});return s;
}
function startRecordingFor(b,{resume}){
 if(resume){const r=loadReplay(replayId(b));if(r&&r.seed===b.seed&&r.turns.length===Math.max(0,b.turn-1))return r;return null}
 return startRecording(b);
}
function launchDaily(){
 refreshDay();
 const saved=loadRun(dailyKey(today));
 if(saved&&saved.phase!=='battle'){run=saved;rec=null;showResults({ending:false});return}
 sfx('select');
 run=saved||createRun({mode:'daily',date:today});
 const fresh=!saved;
 if(fresh){saveRun(run);introduced=new Set();rec=startRecordingFor(run,{resume:false})}
 else{introduced=inferIntroduced(run);rec=startRecordingFor(run,{resume:true})}
 lab=createLabSession();
 transition(()=>{enterBattle({fresh})});
}
function launchPractice(opts){
 sfx('select');
 const {resume,focus=0,assist=true,retryLast=false}=opts;
 const saved=loadRun('practice');
 if(resume&&saved&&saved.phase==='battle'){run=saved;introduced=inferIntroduced(run);rec=startRecordingFor(run,{resume:true});lab=createLabSession();transition(()=>enterBattle({fresh:false}));return}
 if(retryLast&&saved)run=retry(saved.lab?saved:{...saved,lab:{v:1,undos:0,retries:0,focus:null}});
 else run=startLab({focus});
 if(!assist)delete run.lab;
 saveRun(run);introduced=new Set();rec=startRecording(run);lab=createLabSession();
 transition(()=>{enterBattle({fresh:true})});
}

// ---------------------------------------------------------------- turn flow
function focusFirstMove(){if(isSheetOpen())return;const b=$('moves').querySelector('.move-main:not([disabled])');if(b&&!busy&&(document.activeElement===document.body||!document.activeElement))b.focus({preventScroll:true})}
async function act(action){
 if(busy||view!=='game'||!run||isSheetOpen()||stage.cinematic)return;
 if(run.pendingSwitch&&action.kind!=='switch')return;
 const before=clone(run);
 if(isLab(run))remember(lab,run);
 if(!turn(run,action)){if(isLab(run)&&lab.stack.length)lab.stack.pop();return}
 const my=++token;busy=true;lastBefore=before;
 saveRun(run);
 if(rec){recordTurn(rec,run,action);if(run.phase!=='battle')finishRecording(rec,run);saveReplay(rec)}
 const events=run.visualEvents||[];
 skipUi(true,'Skip');renderCommand();
 const cur={p:before.pActive,e:before.eActive};
 stage.setDisplay(before,{mode:'battle',snap:false});
 const beats=buildBeats(events);
 const plan=planSequence(beats,{names:names({p:before.player,e:before.foe},cur),reduced:reducedMotion(),seenFoes:[...introduced],advance:b=>{if(b.type==='switch')cur[b.side]=b.index}});
 for(const b of beats)if(b.type==='switch'&&b.side==='e')introduced.add(b.index);
 run.introduced=[...introduced];
 try{await director.play(plan.cues,stage.cues,{rate:rate()})}finally{
  if(my===token){
   busy=false;skipUi(false);hideIntro();stage.clear();
   if(view==='game'){
    stage.settleTo(run);renderAll();
    setOutcome(plan.summary||'');announce(turnSummary(before,run));
    if(isLab(run)){
     const notes=explainTurn(before,run);$('lab-notes').hidden=!notes.length;$('lab-notes').innerHTML=notes.map(n=>`<span><b>${esc(n.tone.toUpperCase())}</b> ${esc(n.text)}</span>`).join('');
    }
    if(run.phase!=='battle'){endBattle()}
    else if(run.pendingSwitch){openParty(true)}
    else focusFirstMove();
   }
  }
 }
}
function turnSummary(before,after){
 const lines=after.log.filter(l=>l.turn===before.turn).map(l=>l.text);
 return lines.slice(-4).join(' ');
}

// ---------------------------------------------------------------- party / dossier
function openParty(forced=false){
 if(!run||(busy&&!forced))return;
 dossierSheet(run,{party:true,openIndex:forced?run.player.findIndex((m,i)=>m.hp>0&&i!==run.pActive):-1,mustSwitch:forced||run.pendingSwitch,title:forced?'Choose your next ally':'Party',onSwitch:i=>{forceClose();act({kind:'switch',index:i})}});
}
function openMoveInfo(i){const p=active(run,'p');moveSheet(p.moves[i],p,active(run,'e'),run)}

// ---------------------------------------------------------------- ending + results
async function endBattle(){
 recordResult(run);
 const won=run.phase==='won';
 busy=true;renderCommand();
 await playEnding(won);
 busy=false;
 showResults({ending:false});
}
async function playEnding(won){
 const my=++token;
 skipUi(true,'Skip');$('hud').hidden=true;setOutcome('');
 const state={survivors:run.player.filter(m=>m.hp>0),fallen:run.player[run.pActive],victor:run.foe.find(m=>m.hp>0)||run.foe[run.eActive]};
 setAmbience(null);setMusicMode(won?'victory':'defeat');playStinger(won?'victory':'defeat');
 await stage.playCinematic(won?'victory':'defeat',{state,hold:true});
 if(my!==token)return;
 skipUi(false);
}
function showResults({ending}){
 hideIntro();stage.clear();
 const won=run.phase==='won';
 setView('results');
 $('hud').hidden=true;
 stage.showEnding(won?'victory':'defeat',{survivors:run.player.filter(m=>m.hp>0),fallen:run.player[run.pActive],victor:run.foe.find(m=>m.hp>0)||run.foe[run.eActive]});
 setMusicMode(won?'victory':'defeat');setAmbience(null);
 const turns=Math.max(0,run.turn-1),sur=alive(run.player),score=Math.max(0,battleScore(run));
 const moment=run.moment?(run.moment.kind==='finisher'?`${run.moment.actor} finished it with ${run.moment.move}.`:`${run.moment.target} fell on turn ${run.moment.turn}.`):'';
 const hasRec=!!(rec&&rec.turns?.length)||!!loadReplay(replayId(run));
 $('result-body').className='result '+(won?'is-victory':'is-defeat');
 $('result-body').innerHTML=`
  <p class="kicker" style="margin:0;color:var(--muted);letter-spacing:.14em;font-weight:700;font-size:13px">${run.mode==='daily'?'DAILY '+esc(run.date):'PRACTICE'}</p>
  <h2>${won?'The summit is yours.':'The mountain endures.'}</h2>
  <p class="lede">${won?'Dawn reaches the summit. Red\'s last light goes out.':'Wind and stillness return. Another team will climb tomorrow.'}</p>
  <div class="stats"><div><b>${turns}</b><small>Turns</small></div><div><b>${sur}/6</b><small>Survivors</small></div><div><b>${score.toLocaleString('en-US')}</b><small>Score</small></div></div>
  <ul class="party-row">${run.player.map(m=>`<li class="${m.hp<=0?'out':''}">${spriteHTML(m)}<span>${esc(m.name.toUpperCase())}</span></li>`).join('')}</ul>
  ${moment?`<p class="moment">${esc(moment)}</p>`:''}
  <div class="actions">
   ${won?`<button class="btn btn-primary" data-r="card" type="button">${icon('down')}<span>Save result card</span></button><button class="btn btn-secondary" data-r="practice" type="button">Practice again</button>`
        :`<button class="btn btn-primary" data-r="practice" type="button">${icon('flask')}<span>Rematch in the lab</span></button><button class="btn btn-secondary" data-r="card" type="button">Save result card</button>`}
   <button class="btn btn-secondary" data-r="share" type="button">Copy result</button>
   ${hasRec?`<button class="btn btn-secondary" data-r="replay" type="button">${icon('play')}<span>Watch the battle</span></button>`:''}
   <button class="btn btn-quiet" data-r="ending" type="button"><span>Replay ending</span></button>
   <button class="btn btn-quiet" data-r="home" type="button"><span>Back to summit</span></button>
  </div>
  <p class="note" style="text-align:center">${run.mode==='daily'?'Your official daily result is locked on this device until tomorrow.':'Practice results never affect your daily streak.'}${hasRec?'':' This battle has a text recap only.'}</p>`;
 $('bar-title').textContent=won?'Victory':'Defeat';
 window.scrollTo({top:0});
}
$('result-body').addEventListener('click',async e=>{
 const b=e.target.closest('[data-r]');if(!b||!run)return;
 switch(b.dataset.r){
  case 'home':showHome();break;
  case 'practice':labSheetOpen();break;
  case 'card':downloadCard(b);break;
  case 'share':try{await navigator.clipboard.writeText(shareText());toast('Result copied')}catch{openSheet('Copy result',`<textarea readonly style="width:100%;min-height:160px;background:#0d1736;color:inherit;border:0;border-radius:8px;padding:10px">${esc(shareText())}</textarea>`)}break;
  case 'replay':startReplay(replayId(run));break;
  case 'ending':{$('panel-results').hidden=true;await playEnding(run.phase==='won');$('panel-results').hidden=false;stage.showEnding(run.phase==='won'?'victory':'defeat',{survivors:run.player.filter(m=>m.hp>0),fallen:run.player[run.pActive],victor:run.foe.find(m=>m.hp>0)||run.foe[run.eActive]})}break;
 }
});
function shareText(){const marks=run.foe.map(x=>x.hp===0?'■':'□').join('');return `DAILY SILVER ${run.mode==='daily'?run.date:'PRACTICE'}\n${run.phase==='won'?'The summit is mine':'The summit endures'}\nRed: ${marks}\nSurvivors ${alive(run.player)}/6 · Turns ${run.turn-1} · Score ${Math.max(0,battleScore(run))}\n#DailySilver`}

// result card (same-origin sprites only)
function loadCardSprite(mon){return new Promise(resolve=>{const image=new Image();image.onload=()=>{try{const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0);const px=g.getImageData(0,0,c.width,c.height);clearWhiteBackdrop(px.data,px.width,px.height);g.putImageData(px,0,0);resolve(c)}catch{resolve(image)}};image.onerror=()=>resolve(null);image.src=localSprite(mon)})}
const loadArt=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});
async function downloadCard(button){
 const result=run,label=button.querySelector('span')?.textContent||button.textContent;button.disabled=true;
 try{
  const won=result.phase==='won';
  const [sprites,bg]=await Promise.all([Promise.all(result.player.map(loadCardSprite)),loadArt(`./assets/art/summit/${won?'dawn':'aftermath'}.png`)]);
  const c=document.createElement('canvas');c.width=1200;c.height=630;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  g.fillStyle='#0a1226';g.fillRect(0,0,1200,630);
  if(bg)g.drawImage(bg,0,0,768,398,0,0,1200,622);
  g.fillStyle='rgba(8,16,36,.62)';g.fillRect(0,0,1200,630);
  g.fillStyle='#f3d98c';g.font='700 24px "Segoe UI",system-ui,sans-serif';g.fillText('DAILY SILVER  ·  '+(result.mode==='daily'?result.date:'PRACTICE'),56,70);
  g.fillStyle='#eef4fb';g.font='800 78px "Segoe UI",system-ui,sans-serif';g.fillText(won?'The summit is mine.':'The mountain endures.',54,160);
  sprites.forEach((s,i)=>{const mon=result.player[i],x=56+i*184,y=214;g.fillStyle='rgba(17,29,58,.9)';g.fillRect(x,y,172,196);
   if(s){const sw=s.naturalWidth||s.width,sh=s.naturalHeight||s.height,k=Math.min(124/sw,124/sh),dw=Math.round(sw*k),dh=Math.round(sh*k);g.save();g.globalAlpha=mon.hp>0?1:.4;g.drawImage(s,Math.round(x+(172-dw)/2),Math.round(y+10+(124-dh)/2),dw,dh);g.restore()}
   g.textAlign='center';g.fillStyle=mon.hp>0?'#eef4fb':'#8393b3';g.font='700 17px "Segoe UI",system-ui,sans-serif';g.fillText(mon.name.toUpperCase(),x+86,y+158,160);g.fillStyle=mon.hp>0?'#94e3ba':'#f19590';g.font='700 13px "Segoe UI",system-ui,sans-serif';g.fillText(mon.hp>0?'SURVIVED':'FAINTED',x+86,y+180);g.textAlign='left'});
  g.fillStyle='rgba(17,29,58,.92)';g.fillRect(56,436,1088,140);
  g.fillStyle='#f3d98c';g.font='800 40px "Segoe UI",system-ui,sans-serif';g.fillText('SCORE '+Math.max(0,battleScore(result)).toLocaleString('en-US'),84,500);
  g.fillStyle='#eef4fb';g.font='700 28px "Segoe UI",system-ui,sans-serif';g.fillText(`SURVIVORS ${alive(result.player)}/6`,84,552);g.fillText(`TURNS ${result.turn-1}`,640,500);g.fillStyle='#a7bad4';g.fillText(`RED ${alive(result.foe)}/6 LEFT`,640,552);
  const a=document.createElement('a');a.download='daily-silver-'+(result.mode==='daily'?result.date:'practice')+'.png';a.href=c.toDataURL('image/png');document.body.append(a);a.click();a.remove();sfx('select');toast('Result card saved');
 }catch(err){console.error(err);toast('Could not save the card')}finally{button.disabled=false}
}

// ---------------------------------------------------------------- replay viewer
let rp={playing:false,index:0,speed:1,token:0,rec:null};
function startReplay(id){
 const r=typeof id==='string'?loadReplay(id):id;if(!r){toast('No recording for this battle');return}
 forceClose();director.cancel();token++;busy=false;stage.clear();
 rp={playing:false,index:0,speed:1,token:rp.token+1,rec:r};
 transition(()=>{
  setView('replay');$('hud').hidden=false;skipUi(false);
  stage.setMode('battle');
  const n=r.turns.length;
  $('rp-scrub').max=String(n);$('rp-scrub').value='0';
  $('rp-marks').innerHTML=knockoutMarkers(r).map(k=>`<i class="${k.side==='p'?'ally':''}" style="left:${(k.turn+1)/Math.max(1,n)*100}%"></i>`).join('');
  $('rp-kos').innerHTML=knockoutMarkers(r).map(k=>`<li><button type="button" class="${k.side==='p'?'ally':'foe'}" data-ko="${k.turn}">T${r.turns[k.turn].n} · ${esc(k.name)} ✕</button></li>`).join('');
  $('bar-title').textContent=`Replay · ${r.mode==='daily'?r.date:'Practice'}${r.truncated?' · truncated':''}`;
  seekReplay(0);
 });
 setMusicMode('battle');
}
function replayNames(r,cur){return names({p:r.player,e:r.foe},cur)}
function seekReplay(i){
 director.cancel();rp.token++;rp.playing=false;updatePlayButton();
 const r=rp.rec;i=Math.max(0,Math.min(r.turns.length,i));rp.index=i;
 const state=stateAt(r,i);stage.clear();stage.setDisplay(state,{mode:'battle',snap:true});renderHud(stage.display);
 $('rp-scrub').value=String(i);setOutcome(i===0?'Start of the battle':`After turn ${r.turns[i-1].n}`);
 $('rp-status').textContent=`Turn ${i}/${r.turns.length}`;
}
function updatePlayButton(){const b=$('rp-play');b.innerHTML=rp.playing?icon('pause'):icon('play');b.setAttribute('aria-label',rp.playing?'Pause':'Play')}
async function playReplayTurn(){
 const r=rp.rec,i=rp.index;if(i>=r.turns.length)return false;
 const my=rp.token,turnData=r.turns[i],prev=stateAt(r,i);
 const cur={p:prev.pActive,e:prev.eActive};
 const beats=buildBeats(turnData.ev);
 const plan=planSequence(beats,{names:replayNames(r,cur),reduced:reducedMotion(),seenFoes:[...Array(6).keys()].filter(k=>prev.foe[k].hp<r.foe[k].maxHp||k===prev.eActive),advance:b=>{if(b.type==='switch')cur[b.side]=b.index}});
 stage.setDisplay(prev,{mode:'battle',snap:false});
 await director.play(plan.cues,stage.cues,{rate:rp.speed});
 if(my!==rp.token)return false;
 rp.index=i+1;stage.clear();
 const next=stateAt(r,rp.index);stage.setDisplay(next,{mode:'battle',snap:false});renderHud(stage.display);
 $('rp-scrub').value=String(rp.index);$('rp-status').textContent=`Turn ${rp.index}/${r.turns.length}`;
 return true;
}
async function playReplay({single=false}={}){
 if(rp.playing)return;rp.playing=true;updatePlayButton();const my=rp.token;
 if(rp.index>=rp.rec.turns.length)seekReplay(0),rp.playing=true,updatePlayButton();
 while(rp.playing&&my===rp.token&&rp.index<rp.rec.turns.length){
  const ok=await playReplayTurn();if(!ok||single)break;
  await new Promise(r=>setTimeout(r,250/rp.speed));
 }
 if(my===rp.token){rp.playing=false;updatePlayButton()}
}
$('rp-play').addEventListener('click',()=>{if(rp.playing){rp.token++;director.cancel();rp.playing=false;updatePlayButton();const s=stateAt(rp.rec,rp.index);stage.clear();stage.setDisplay(s,{mode:'battle',snap:true});renderHud(stage.display)}else playReplay()});
$('rp-scrub').addEventListener('input',e=>seekReplay(Number(e.target.value)));
$('rp-speed').addEventListener('change',e=>{rp.speed=Number(e.target.value)});
$('rp-prev').addEventListener('click',()=>{const ks=knockoutMarkers(rp.rec).map(k=>k.turn+1).filter(t=>t<rp.index);seekReplay(ks.length?ks[ks.length-1]-1:0)});
$('rp-next').addEventListener('click',()=>{const ks=knockoutMarkers(rp.rec).map(k=>k.turn+1).filter(t=>t>rp.index);seekReplay(ks.length?ks[0]:rp.rec.turns.length)});
$('rp-decisive').addEventListener('click',()=>{seekReplay(decisiveTurnIndex(rp.rec));playReplay({single:true})});
$('rp-kos').addEventListener('click',e=>{const b=e.target.closest('[data-ko]');if(b){seekReplay(Number(b.dataset.ko));playReplay({single:true})}});
$('rp-exit').addEventListener('click',()=>{rp.token++;director.cancel();rp.playing=false;if(run&&run.phase!=='battle'&&run.mode&&replayId(run)===rp.rec.id){showResults({ending:false})}else showHome()});
$('rp-download').addEventListener('click',()=>{const blob=new Blob([JSON.stringify({app:'daily-silver',replayVersion:2,replay:rp.rec},null,1)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`daily-silver-replay-${rp.rec.mode==='daily'?rp.rec.date:'practice'}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)});

// ---------------------------------------------------------------- journal
function recapHTML(log,limit=60){
 const groups=new Map();for(const e of log.slice(-limit)){const t=Number.isInteger(e.turn)?e.turn:0;if(!groups.has(t))groups.set(t,[]);groups.get(t).push(e)}
 return [...groups].reverse().map(([t,es])=>`<h3>Turn ${String(t).padStart(2,'0')}</h3><ul class="plain" style="list-style:none;padding:0">${es.map(e=>`<li>${esc(e.text)}</li>`).join('')}</ul>`).join('');
}
function journalSheet(){
 if(!run)return;
 const id=replayId(run),has=!!(rec&&rec.turns.length)||!!loadReplay(id);
 openSheet('Battle journal',`
  <div class="actions" style="justify-content:flex-start">
   ${has?`<button class="chip-btn" data-j="replay" type="button">${icon('play')}Watch recorded battle</button>`:'<small style="color:var(--muted)">This battle has a text recap only.</small>'}
   ${run.phase==='battle'?`<button class="chip-btn" data-j="intro" type="button">${icon('retry')}Replay introduction</button>`:''}
  </div>
  ${recapHTML(run.log)}`);
 $('sheet-body').onclick=async e=>{
  const b=e.target.closest('[data-j]');if(!b)return;
  if(b.dataset.j==='replay'){if(rec&&rec.turns.length)saveReplay(rec);startReplay(id)}
  if(b.dataset.j==='intro'){forceClose();if(busy)return;busy=true;renderCommand();const my=++token;skipUi(true,'Skip');$('hud').hidden=true;await stage.playCinematic('opening');if(my!==token)return;$('hud').hidden=false;busy=false;skipUi(false);stage.settleTo(run);renderAll()}
 };
}

// ---------------------------------------------------------------- lab
function labSheetOpen(){
 const practice=loadRun('practice');
 labSheet({practice,foeNames:preview?.foe?.map(m=>m.name)||['Pikachu','Espeon','Snorlax','Venusaur','Charizard','Blastoise']});
 $('sheet-body').onclick=e=>{
  const b=e.target.closest('[data-act]');if(!b)return;
  const focus=Number($('lab-focus')?.value||0),assist=$('lab-assist')?.checked!==false;
  if(b.dataset.act==='lab-resume'){forceClose();launchPractice({resume:true})}
  if(b.dataset.act==='lab-new'){forceClose();launchPractice({focus,assist})}
  if(b.dataset.act==='lab-retry-last'){forceClose();launchPractice({retryLast:true,assist})}
 };
}
$('lab-undo').addEventListener('click',()=>{
 if(busy||!run)return;const prev=undo(lab,run);if(!prev)return;
 run=prev;saveRun(run);if(rec)rec.turns.splice(Math.max(0,run.turn-1));
 stage.clear();stage.setDisplay(run,{mode:'battle',snap:true});setOutcome('Undone. Same position, same random state.');$('lab-notes').hidden=true;renderAll();sfx('select');
});
$('lab-retry').addEventListener('click',()=>{
 if(busy||!run)return;run=retry(run);saveRun(run);introduced=new Set();rec=startRecording(run);lab=createLabSession();
 stage.clear();stage.setDisplay(run,{mode:'battle',snap:true});introduced.add(run.eActive);setOutcome('Retrying the same team and seed.');$('lab-notes').hidden=true;renderAll();sfx('select');
});
$('lab-compare').addEventListener('click',()=>{
 if(busy||!run)return;const p=active(run,'p');
 const options=p.moves.map((s,i)=>({s,i})).filter(({s})=>s.pp>0);
 const results=compare(run,options.map(({i})=>({kind:'move',index:i})));
 compareSheet(results,options.map(({s})=>s.name));
});

// ---------------------------------------------------------------- data import/export
function exportSave(){
 const entries={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(APP_ID+':'))continue;const name=key.slice(APP_ID.length+1);const v=store.get(name);if(v!==null)entries[name]=v}
 const data={app:'daily-silver',exportVersion:2,exportedAt:new Date().toISOString(),entries};
 const blob=new Blob([JSON.stringify(data)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='daily-silver-backup-'+today+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Backup exported');
}
const picker=document.createElement('input');picker.type='file';picker.accept='.json,application/json';picker.hidden=true;document.body.append(picker);
picker.addEventListener('change',async()=>{
 const file=picker.files?.[0];picker.value='';if(!file)return;
 try{
  if(file.size>2_500_000)throw Error('File exceeds the 2.5 MB limit.');
  const values=validateBackup(await file.text());
  if(!confirm(`Restore ${Object.keys(values).length} entries? Entries with the same names are replaced.`))return;
  for(const [k,v] of Object.entries(values))store.set(k,v);
  if(Object.hasOwn(values,'volume'))setMasterVolume(values.volume);if(Object.hasOwn(values,'music-level'))setMusicLevel(values['music-level']);if(Object.hasOwn(values,'effects-level'))setEffectsLevel(values['effects-level']);
  if(Object.hasOwn(values,'sound-enabled'))setSound(values['sound-enabled']);
  applySettings(stage);forceClose();showHome();toast('Backup restored');
 }catch(err){alert('Could not restore backup: '+err.message)}
});

// ---------------------------------------------------------------- sheets wiring
function wireSettings(){
 const body=$('sheet-body');
 body.onchange=e=>{
  const t=e.target;
  if(t.name==='motion'){settings.motion=t.value;applySettings(stage)}
  if(t.name==='intensity'){settings.intensity=t.value;applySettings(stage)}
  if(t.name==='speed'){settings.speed=Number(t.value)}
  if(t.id==='s-sound'){setSound(t.checked);syncSoundButton()}
  if(t.id==='s-contrast'){settings.contrast=t.checked;applySettings(stage)}
 };
 body.oninput=e=>{
  const t=e.target,v=Number(t.value)/100;
  if(t.id==='s-volume'){setMasterVolume(v);$('o-volume').textContent=t.value+'%'}
  if(t.id==='s-music'){setMusicLevel(v);$('o-music').textContent=t.value+'%'}
  if(t.id==='s-fx'){setEffectsLevel(v);$('o-fx').textContent=t.value+'%'}
 };
 body.onclick=e=>sheetAction(e);
}
function sheetAction(e){
 const b=e.target.closest('[data-act]');if(!b)return;
 const a=b.dataset.act;
 if(a==='export')exportSave();
 else if(a==='import')picker.click();
 else if(a==='archive'){archiveOpen()}
 else if(a==='result'){const saved=loadRun(dailyKey(b.dataset.date));if(saved){forceClose();run=saved;rec=null;showResults({ending:false})}}
 else if(a==='replay'){forceClose();startReplay(b.dataset.id)}
 else if(a==='archive-play'){
  const date=b.dataset.date;
  const existing=loadRun('practice');if(existing&&existing.phase==='battle'&&!confirm('Starting this day replaces your saved practice battle. Continue?'))return;
  forceClose();run=createRun({mode:'practice',date,seed:dailySeed(date)});run.lab={v:1,undos:0,retries:0,focus:null};saveRun(run);introduced=new Set();rec=startRecording(run);lab=createLabSession();transition(()=>enterBattle({fresh:true}));
 }
}
function archiveOpen(){archiveSheet({today});$('sheet-body').onclick=sheetAction}
function syncSoundButton(){const on=isSoundOn(),b=$('sound-button');b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Sound on':'Sound off');b.innerHTML=icon(on?'sound':'mute')}

$('settings-button').addEventListener('click',()=>{settingsSheet();wireSettings()});
$('help-button').addEventListener('click',helpSheet);
$('archive-button').addEventListener('click',archiveOpen);
$('journal-button').addEventListener('click',journalSheet);
$('sound-button').addEventListener('click',()=>{if(isSoundOn()&&!isSoundReady())resumeSound();else setSound(!isSoundOn());syncSoundButton()});
$('brand').addEventListener('click',()=>{if(view!=='home'&&!busy||view==='replay'||view==='results')showHome();else if(view==='game'&&busy){skip()}else if(view==='game'){if(confirm('Leave the battle? Your progress is saved.'))showHome()}});
$('daily-button').addEventListener('click',launchDaily);
$('practice-button').addEventListener('click',labSheetOpen);
$('team-list').addEventListener('click',e=>{const b=e.target.closest('.team-mon');if(!b)return;const i=Number(b.dataset.i);setFocus(i);dossierSheet(preview,{openIndex:i,foe:preview.foe[0],title:"Today's team"})});
for(const ev of ['pointerover','focusin'])$('team-list').addEventListener(ev,e=>{const b=e.target.closest('.team-mon');if(b&&view==='home'&&Number(b.dataset.i)!==focusIndex)setFocus(Number(b.dataset.i))});
$('moves').addEventListener('click',e=>{
 const info=e.target.closest('[data-info]');if(info){openMoveInfo(Number(info.dataset.info));return}
 const mv=e.target.closest('[data-move]');if(mv)act({kind:'move',index:Number(mv.dataset.move)});
});
$('party-button').addEventListener('click',()=>openParty(false));
document.addEventListener('keydown',e=>{
 if(e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
 if(busy&&['Escape',' ','Enter'].includes(e.key)&&!isSheetOpen()){if(view==='game'){e.preventDefault();skip()}return}
 if(isSheetOpen()||view!=='game'||busy)return;
 if(/^[1-4]$/.test(e.key)&&!run.pendingSwitch){e.preventDefault();const slot=active(run,'p').moves[Number(e.key)-1];if(slot){if(e.shiftKey)openMoveInfo(Number(e.key)-1);else act({kind:'move',index:Number(e.key)-1})}}
 if(e.key.toLowerCase()==='p'){e.preventDefault();openParty(false)}
 if(e.key.toLowerCase()==='j'){e.preventDefault();journalSheet()}
});
document.addEventListener('keydown',e=>{if(view==='replay'&&e.key===' '&&!e.target.closest('button,input,select')){e.preventDefault();$('rp-play').click()}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(run)saveRun(run)}else refreshDay()});
window.addEventListener('focus',refreshDay);setInterval(refreshDay,30000);
window.addEventListener('beforeunload',()=>{if(run)saveRun(run)});

// ---------------------------------------------------------------- boot
installSpriteImageFallback();initSheet();syncSoundButton();
preload().then(()=>{refreshDay()});
showHome();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./service-worker.js').then(reg=>{reg.addEventListener('updatefound',()=>{reg.installing?.addEventListener('statechange',function(){if(this.state==='installed'&&navigator.serviceWorker.controller)toast('Update ready. Reload for the new version.',6000)})})}).catch(()=>{});
// QA hook (only with ?qa in the URL): lets automated review drive effects directly.
if(new URLSearchParams(location.search).has('qa'))window.__qa={stage,hooks,createRun,startLab,buildBeats,planSequence,setView,renderHud,state:()=>({run,view,busy})};
