// Browser-independent DOM wiring smoke test. This does not replace Chromium visual QA.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pageHTML=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const definedIds=new Set([...pageHTML.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
const definedClasses=new Set([...pageHTML.matchAll(/\bclass="([^"]+)"/g)].flatMap(m=>m[1].split(/\s+/)));
assert.ok(definedClasses.has('battle-help'),'The actual HTML must contain a battle-help anchor');
const nodes=new Map();
class FakeClassList{
 constructor(){this.values=new Set()}
 add(c){this.values.add(c)}remove(c){this.values.delete(c)}toggle(c,force){const should=force===undefined?!this.values.has(c):force;should?this.add(c):this.remove(c)}contains(c){return this.values.has(c)}
}
class Element{
 constructor(id=''){this.id=id;this.innerHTML='';this.textContent='';this.listeners={};this.classList=new FakeClassList();this.dataset={};this.style={};this.parentElement=this;this.open=false;this.scrollHeight=0;this.scrollTop=0;this.children=[];this.files=null;this.hidden=false;this.value='';}
 append(child){this.children.push(child);child.parentElement=this;}after(c){this.append(c)}before(c){this.append(c)}addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 dispatch(type,payload={}){for(const fn of this.listeners[type]||[])fn({target:this,...payload})}
 getBoundingClientRect(){return {left:100,top:100,right:600,bottom:500}}setAttribute(){}querySelector(){return null}closest(){return this}showModal(){this.open=true}close(){this.open=false}click(){this.dispatch('click')}remove(){}
}
const get=id=>{if(!definedIds.has(id))return null;if(!nodes.has(id))nodes.set(id,new Element(id));return nodes.get(id)};
const battleHelp=definedClasses.has('battle-help')?new Element('battle-help'):null;
const canvas=get('battle-canvas');canvas.getContext=()=>new Proxy({imageSmoothingEnabled:false},{get(t,k){if(k in t)return t[k];return ()=>{}},set(t,k,v){t[k]=v;return true}});
globalThis.document={getElementById:get,querySelector:q=>q==='#battle-canvas'?canvas:q==='.battle-help'?battleHelp:q.startsWith('#')?get(q.slice(1)):null,createElement:t=>new Element(t),body:new Element('body'),listeners:{},addEventListener(type,fn){this.listeners[type]=fn},hidden:false};
globalThis.window={scrollTo(){},matchMedia:()=>({matches:false}),addEventListener(){}};
globalThis.location={protocol:'file:'};Object.defineProperty(globalThis,'navigator',{value:{},configurable:true});let nextFrame;globalThis.requestAnimationFrame=cb=>{nextFrame=cb;return 1};
const values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),key:n=>[...values.keys()][n],get length(){return values.size}};
globalThis.Image=class Image{set src(value){this._src=value}get src(){return this._src}};await import('../src/app.js');
nextFrame(performance.now());
assert.match(get('daily-button').innerHTML,/BEGIN TODAY/);
assert.equal((get('hero-preview-party').innerHTML.match(/class="squad-mon/g)||[]).length,6);
assert.match(get('hero-preview-party').innerHTML,/aria-pressed="true"/);
const tactics=battleHelp.children.find(c=>c.id==='battle-tactics');assert.equal(tactics.className,'battle-tactics');
get('practice-button').click();nextFrame(performance.now());
assert.equal(get('game-view').classList.contains('hidden'),false);
assert.match(tactics.innerHTML,/YOUR FIELD/);
assert.match(get('moves-panel').innerHTML,/data-move/);
assert.match(get('active-command-card').innerHTML,/NOW BATTLING/);
assert.match(get('moves-panel').innerHTML,/--move-accent:#[0-9a-fA-F]{6}/);
assert.match(get('moves-panel').innerHTML,/move-matchup/);
assert.ok(get('scene-container').children.some(c=>c.id==='foe-entrance'));
assert.equal((get('ally-roster').innerHTML.match(/roster-pip/g)||[]).length,6);
assert.equal((get('rival-roster').innerHTML.match(/roster-pip/g)||[]).length,6);
assert.equal((get('ascent-track').innerHTML.match(/ascent-stop/g)||[]).length,6);
assert.match(get('battle-log').innerHTML,/recap-turn/);
assert.match(get('scene-container').children.find(c=>c.id==='rival-reveal').innerHTML,/TRAINER/);
const activePractice=JSON.parse(values.get('daily-silver-v1:practice'));
assert.equal(get('enemy-count').textContent,`${activePractice.foe[activePractice.eActive].hp}/${activePractice.foe[activePractice.eActive].maxHp}`);
values.set('daily-silver-v1:records',JSON.stringify({damaged:true}));
get('records-button').click();
assert.match(get('modal-body').innerHTML,/YOUR STORY BEGINS HERE/);
get('modal-close').click();
values.set('daily-silver-v1:records',JSON.stringify([{id:'daily:2026-10-10:1',mode:'daily',date:'2026-10-10',won:true,turns:12,remaining:3,score:2040,party:['Pikachu','Tauros','Unown']}]))
get('records-button').click();
assert.match(get('modal-body').innerHTML,/record-card win/);
assert.match(get('modal-body').innerHTML,/assets\/sprites\/crystal\/front\/25\.png/);
assert.match(get('modal-body').innerHTML,/archive-replays/);
get('modal-close').click();
values.set('daily-silver-v1:records',JSON.stringify([{id:'daily:2026-10-10:2',mode:'daily',date:'2026-10-10',won:false,turns:9,remaining:0}]));
get('records-button').click();
assert.match(get('modal-body').innerHTML,/TEAM DETAILS UNAVAILABLE/);
get('modal-close').click();
get('settings-button').click();
assert.equal(get('modal').open,true);
assert.match(get('modal-body').innerHTML,/RESTORE BACKUP/);
assert.match(get('modal-body').innerHTML,/type=\"radio\" name=\"fx-rate\"/);
assert.match(get('modal-body').innerHTML,/speed-choices/);
assert.equal(get('modal').classList.contains('modal-settings'),true);
get('modal-body').dispatch('change',{target:{name:'fx-rate',value:'2'}});
assert.equal(JSON.parse(values.get('daily-silver-v1:fx-rate')),2);
get('modal').dispatch('click',{clientX:200,clientY:150});
assert.equal(get('modal').open,true,'modal interior must not dismiss');
get('modal').dispatch('click',{clientX:50,clientY:50});
assert.equal(get('modal').open,false,'outside click dismisses modal');
get('settings-button').click();
assert.match(get('modal-body').innerHTML,/sound-enabled/);
assert.match(get('modal-body').innerHTML,/music-level/);
assert.match(get('modal-body').innerHTML,/contrast-enabled/);
get('modal-body').dispatch('input',{target:{id:'music-level',value:'30'}});
assert.equal(values.get('daily-silver-v1:music-level'),'0.3');
get('modal-body').dispatch('change',{target:{id:'contrast-enabled',checked:true}});
assert.equal(document.body.classList.contains('high-contrast'),true);
get('modal-close').click();
assert.equal(get('modal').open,false);
get('leave-button').click();
assert.equal(get('home-view').classList.contains('hidden'),false);
console.log('UI DOM wiring smoke passed');
process.exit(0);
