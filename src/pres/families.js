// Maps every move to an animation family. Pure data/logic: no DOM, no battle RNG.
import {MOVES} from '../data.js';

export const SIGNATURE={Thunderbolt:'thunderbolt',Psychic:'psychic','Body Slam':'bodyslam','Giga Drain':'gigadrain','Fire Blast':'fireblast',Surf:'surf'};
const LEGACY={'Shadow Ball':'shadowball','Sacred Fire':'sacredfire',Aeroblast:'aeroblast','Extreme Speed':'extremespeed',Explosion:'explosion',Selfdestruct:'explosion'};
const SLASH=new Set(['Slash','Fury Cutter','X-Scissor','Metal Claw','Wing Attack','Aerial Ace','Steel Wing','Cross Chop']);
const PROJECTILE=new Set(['Razor Leaf','Rock Throw','Sludge','Sludge Bomb','Ancient Power','Mud-Slap','Pin Missile','Hidden Power','Tri Attack','Spark','Shadow Ball']);
const BEAM=new Set(['Hyper Beam','Ice Beam','Psybeam','Solar Beam','Flamethrower','Hydro Pump','Dragon Breath','Bubble Beam','Dragon Rage']);
const AREA=new Set(['Earthquake','Rock Slide','Thunder','Blizzard','Icy Wind','Twister','Petal Dance','Outrage','Future Sight','Night Shade','Mirror Coat']);
const BARRIER=new Set(['Reflect','Light Screen','Protect','Substitute']);

export function familyOf(name,move=MOVES[name]){
 if(SIGNATURE[name])return SIGNATURE[name];
 if(LEGACY[name])return LEGACY[name];
 if(!move)return 'contact';
 if(BARRIER.has(name))return 'barrier';
 if(move.heal||name==='Pain Split')return 'recovery';
 if(!move.power&&!move.fixed&&!['fixedLevel','counter','mirrorCoat'].includes(move.special)){
  if(move.boost||move.targetBoost||name==='Curse')return 'stat';
  return 'inflict';
 }
 if(move.drain)return 'drain';
 if(SLASH.has(name))return 'slash';
 if(BEAM.has(name))return 'beam';
 if(AREA.has(name))return 'area';
 if(PROJECTILE.has(name))return 'projectile';
 return 'contact';
}

export const FAMILY_TIMING={
 contact:{anticipate:240,flight:140,settle:240},
 slash:{anticipate:220,flight:110,settle:220},
 projectile:{anticipate:300,flight:340,settle:220},
 beam:{anticipate:380,flight:300,settle:240},
 area:{anticipate:340,flight:280,settle:260},
 drain:{anticipate:260,flight:520,settle:260},
 recovery:{anticipate:200,flight:360,settle:200},
 barrier:{anticipate:160,flight:360,settle:180},
 stat:{anticipate:160,flight:380,settle:160},
 inflict:{anticipate:220,flight:320,settle:200},
 thunderbolt:{anticipate:420,flight:240,settle:260},
 psychic:{anticipate:460,flight:360,settle:280},
 bodyslam:{anticipate:380,flight:280,settle:300},
 gigadrain:{anticipate:260,flight:560,settle:280},
 fireblast:{anticipate:420,flight:380,settle:280},
 surf:{anticipate:300,flight:520,settle:300},
 shadowball:{anticipate:300,flight:380,settle:240},
 sacredfire:{anticipate:360,flight:420,settle:260},
 aeroblast:{anticipate:340,flight:320,settle:260},
 extremespeed:{anticipate:140,flight:200,settle:220},
 explosion:{anticipate:420,flight:360,settle:340}
};
export const timingOf=family=>FAMILY_TIMING[family]||FAMILY_TIMING.contact;
export const isMelee=family=>['contact','slash','bodyslam','extremespeed'].includes(family);
