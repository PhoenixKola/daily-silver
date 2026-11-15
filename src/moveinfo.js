// Human-readable move/item facts and damage estimates derived from the *implemented* rules.
// Only public information is used (the player's own data and the visible opponent); estimates carry
// explicit uncertainty and never reveal what the opponent will choose.
import {MOVES,SPECIAL,effectiveness} from './data.js';
import {estimateDamage} from './engine.js';

export const CATEGORY_LABEL={physical:'Physical',special:'Special',status:'Status'};
export const categoryOf=move=>!move||(!move.power&&!move.fixed&&move.special!=='fixedLevel')?'status':SPECIAL.has(move.type)?'special':'physical';

const STAT={atk:'Attack',def:'Defense',spa:'Sp. Atk',spd:'Sp. Def',spe:'Speed',accuracy:'Accuracy'};
const STATUS_NAME={par:'paralyze',brn:'burn',psn:'poison',tox:'badly poison',frz:'freeze',slp:'put to sleep',confused:'confuse',flinch:'make the target flinch',random:'paralyze, burn or freeze'};
const boostText=b=>Object.entries(b).map(([k,v])=>`${v>0?'+':''}${v} ${STAT[k]||k}`).join(', ');

export function moveFacts(name){
 const move=MOVES[name];if(!move)return null;
 const category=categoryOf(move),notes=[],warnings=[];
 if(move.priority>0)notes.push(`Priority +${move.priority}: moves before normal-speed moves.`);
 if(move.crit)notes.push('High critical-hit ratio.');
 if(move.status&&move.power)notes.push(`${move.chance??0}% chance to ${STATUS_NAME[move.status]}.`);
 if(move.status&&!move.power)notes.push(`Tries to ${STATUS_NAME[move.status]} the target.`);
 if(move.targetBoost)notes.push(`${move.power?`${move.chance??100}% chance to change`:'Changes'} the target's stats: ${boostText(move.targetBoost)}.`);
 if(move.boost)notes.push(`${move.power?`${move.chance??100}% chance to change`:'Changes'} the user's stats: ${boostText(move.boost)}.`);
 if(move.drain)notes.push(`Restores ${Math.round(move.drain*100)}% of the damage dealt.`);
 if(move.heal)notes.push(`Restores ${Math.round(move.heal*100)}% of the user's max HP.`);
 if(move.sleepSelf)warnings.push(`The user falls asleep for ${move.sleepSelf} turns.`);
 if(move.recoil)warnings.push(`Recoil: the user loses ${Math.round(move.recoil*100)}% of the damage dealt.`);
 if(move.recharge)warnings.push('The user must recharge next turn.');
 if(move.charge)warnings.push('Takes a turn to charge before it strikes.');
 if(move.missCrash)warnings.push('The user is hurt if it misses.');
 if(move.fixed)notes.push(`Always deals ${move.fixed} damage (ignores stats and barriers).`);
 switch(move.special){
  case 'fixedLevel':notes.push("Deals damage equal to the user's level.");break;
  case 'explosion':warnings.push('The user faints after using it.');break;
  case 'protect':notes.push('Blocks attacks this turn. Repeated use is likely to fail.');break;
  case 'spikes':notes.push('Hurts opposing Pokémon that switch in (not Flying types).');break;
  case 'reflect':notes.push('Halves physical damage for 5 turns.');break;
  case 'lightScreen':notes.push('Halves special damage for 5 turns.');break;
  case 'seed':notes.push('Drains 1/8 HP each turn and heals the user. Grass types resist it.');break;
  case 'trap':notes.push('The target can no longer switch out.');break;
  case 'substitute':notes.push('Spends 1/4 of max HP to make a decoy.');break;
  case 'painSplit':notes.push('Both sides share their remaining HP.');break;
  case 'curse':notes.push('Ghost users sacrifice half their HP to curse the target; others raise Attack and Defense but lower Speed.');break;
  case 'counter':notes.push('Returns double the physical damage taken this turn.');break;
  case 'mirrorCoat':notes.push('Returns double the special damage taken this turn.');break;
  case 'sleepTalk':notes.push('Uses one of the other attacks while asleep.');break;
  default:break;
 }
 const lead=category==='status'?`${move.type} status move.`:`${CATEGORY_LABEL[category]} ${move.type} attack.`;
 const text=[lead,move.power?`${move.power} power, ${move.accuracy}% accuracy.`:`${move.accuracy}% accuracy.`,...notes].join(' ');
 return {name,type:move.type,category,power:move.power||0,accuracy:move.accuracy,pp:move.pp,priority:move.priority||0,notes,warnings,text,move};
}

export const ITEM_EFFECTS={
 Leftovers:'Restores 1/16 of max HP at the end of every turn.',
 'Gold Berry':'Restores 30 HP once when HP drops below half.',
 'Miracle Berry':'Cures any status condition once.',
 'Focus Band':'10% chance to survive a knockout blow with 1 HP.',
 'Quick Claw':'About 24% chance to move first each turn.',
 'Scope Lens':'Raises the critical-hit chance from 1/16 to 1/8.',
 'Light Ball':'Doubles a Pikachu\'s Special Attack.',
 'Thick Club':"Doubles a Marowak's Attack.",
 '(used)':'Already consumed.'
};
const TYPE_ITEMS={'Mystic Water':'Water',Charcoal:'Fire',Magnet:'Electric','Soft Sand':'Ground',NeverMeltIce:'Ice','Spell Tag':'Ghost','Black Glasses':'Dark','Metal Coat':'Steel','Pink Bow':'Normal','Miracle Seed':'Grass','Poison Barb':'Poison','Twisted Spoon':'Psychic','Hard Stone':'Rock','Silver Powder':'Bug','Sharp Beak':'Flying'};
export function itemEffect(item){
 if(!item)return 'No held item.';
 if(ITEM_EFFECTS[item])return ITEM_EFFECTS[item];
 if(TYPE_ITEMS[item])return `Boosts ${TYPE_ITEMS[item]}-type moves by 10%.`;
 return 'No battle effect in this game.';
}

// Estimated damage of one attack against the *visible* opponent, as a share of the opponent's current HP.
// Includes type effectiveness, STAB, held-item boosts, stat stages, burn and visible barriers.
// Excludes the random damage roll (shown as a range), critical hits, and the opponent's hidden choices.
export function estimateAttack(slot,att,def,run,attSide='p'){
 const move=MOVES[slot?.name];if(!move||!att||!def)return null;
 const category=categoryOf(move),eff=effectiveness(move.type,def.types);
 const base={name:move.name,category,type:move.type,effectiveness:eff,accuracy:move.accuracy,fixed:false,known:true};
 if(category==='status')return {...base,known:false,reason:'Status moves do not deal direct damage.'};
 if(move.special==='counter'||move.special==='mirrorCoat')return {...base,known:false,reason:'Depends on the damage taken this turn.'};
 if(eff===0)return {...base,min:0,max:0,pctMin:0,pctMax:0,hitsToKo:null,reason:`${def.name} is immune.`};
 let max,min;
 if(move.fixed||move.special==='fixedLevel'||move.name==='Night Shade'){max=min=move.fixed||att.level;base.fixed=true}
 else{
  max=estimateDamage(move,att,def);
  const defSide=attSide==='p'?'e':'p',sc=run?.screens?.[defSide],key=category==='special'?'lightScreen':'reflect';
  const screened=typeof sc==='number'?sc>0:sc?.[key]>0;
  if(screened)max=Math.max(1,Math.floor(max*.5));
  min=Math.max(1,Math.floor(max*.85));
 }
 const hp=Math.max(1,def.hp);
 const pctMin=Math.min(100,Math.round(min/hp*100)),pctMax=Math.min(100,Math.round(max/hp*100));
 return {...base,min,max,pctMin,pctMax,hitsToKo:max>0?Math.ceil(hp/max):null,koPossible:max>=hp,koLikely:min>=hp};
}

export function describeEstimate(est){
 if(!est)return '';
 if(!est.known)return est.reason||'';
 if(est.max===0)return est.reason||'No effect.';
 const range=est.pctMin===est.pctMax?`${est.pctMax}%`:`${est.pctMin}–${est.pctMax}%`;
 const ko=est.koLikely?'Likely to knock out.':est.koPossible?'Could knock out.':est.hitsToKo?`About ${est.hitsToKo} hit${est.hitsToKo>1?'s':''} to knock out.`:'';
 return `≈${range} of its current HP. ${ko}`.trim();
}

export function typeAdvantageLabel(eff){
 return eff===0?'No effect (×0)':eff>=4?'Devastating (×4)':eff>1?`Super effective (×${eff})`:eff<1?`Not very effective (×${eff})`:'Neutral (×1)';
}
