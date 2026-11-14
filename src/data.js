import {EXTRA_SPECIES} from './extra-species.js';
// Daily Silver — curated Gen II battle dataset. Independent, fan-made gameplay; no Nintendo images or ROM data.
export const TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel'];
const e=(name,type,power,accuracy=100,pp=15,extra={})=>({name,type,power,accuracy,pp,priority:0,...extra});
export const MOVES = Object.fromEntries([
 e('Tackle','Normal',35,95,35),e('Quick Attack','Normal',40,100,30,{priority:1}),e('Body Slam','Normal',85,100,15,{status:'par',chance:30}),e('Return','Normal',102,100,20),e('Hyper Beam','Normal',150,90,5,{recharge:true}),e('Double-Edge','Normal',120,100,15,{recoil:.25}),e('Headbutt','Normal',70,100,15,{status:'flinch',chance:30}),e('Slash','Normal',70,100,20,{crit:true}),e('Tri Attack','Normal',80,100,10,{status:'random',chance:20}),e('Rest','Psychic',0,100,10,{heal:1,sleepSelf:2}),e('Sleep Talk','Normal',0,100,10,{special:'sleepTalk'}),e('Protect','Normal',0,100,10,{special:'protect',priority:3}),e('Swords Dance','Normal',0,100,30,{boost:{atk:2}}),e('Growl','Normal',0,100,40,{targetBoost:{atk:-1}}),e('Thunder Wave','Electric',0,90,20,{status:'par',chance:100}),e('Toxic','Poison',0,85,10,{status:'tox',chance:100}),e('Confuse Ray','Ghost',0,100,10,{status:'confused',chance:100}),e('Hypnosis','Psychic',0,60,20,{status:'slp',chance:100}),e('Reflect','Psychic',0,100,20,{special:'reflect'}),e('Light Screen','Psychic',0,100,30,{special:'lightScreen'}),e('Recover','Normal',0,100,20,{heal:.5}),e('Soft-Boiled','Normal',0,100,10,{heal:.5}),e('Morning Sun','Normal',0,100,5,{heal:.5}),e('Leech Seed','Grass',0,90,10,{special:'seed'}),e('Spikes','Ground',0,100,20,{special:'spikes'}),e('Curse','Ghost',0,100,10,{special:'curse'}),
 e('Flamethrower','Fire',95,100,15,{status:'brn',chance:10}),e('Fire Blast','Fire',120,85,5,{status:'brn',chance:10}),e('Fire Punch','Fire',75,100,15,{status:'brn',chance:10}),e('Ice Punch','Ice',75,100,15,{status:'frz',chance:10}),e('Flame Wheel','Fire',60,100,25,{status:'brn',chance:10}),e('Surf','Water',95,100,15),e('Hydro Pump','Water',120,80,5),e('Waterfall','Water',80,100,15),e('Bubble Beam','Water',65,100,20,{targetBoost:{spe:-1},chance:10}),e('Ice Beam','Ice',95,100,10,{status:'frz',chance:10}),e('Blizzard','Ice',120,70,5,{status:'frz',chance:10}),e('Icy Wind','Ice',55,95,15,{targetBoost:{spe:-1}}),e('Thunderbolt','Electric',95,100,15,{status:'par',chance:10}),e('Thunder','Electric',120,70,10,{status:'par',chance:30}),e('Thunder Punch','Electric',75,100,15,{status:'par',chance:10}),e('Spark','Electric',65,100,20,{status:'par',chance:30}),e('Giga Drain','Grass',60,100,5,{drain:.5}),e('Razor Leaf','Grass',55,95,25,{crit:true}),e('Solar Beam','Grass',120,100,10,{charge:true}),e('Petal Dance','Grass',90,100,20),e('Sludge Bomb','Poison',90,100,10,{status:'psn',chance:30}),e('Sludge','Poison',65,100,20,{status:'psn',chance:30}),e('Earthquake','Ground',100,100,10),e('Dig','Ground',60,100,10),e('Mud-Slap','Ground',20,100,10,{targetBoost:{accuracy:-1}}),e('Rock Slide','Rock',75,90,10,{status:'flinch',chance:30}),e('Ancient Power','Rock',60,100,5,{boost:{atk:1,def:1,spa:1,spd:1,spe:1},chance:10}),e('Rock Throw','Rock',50,90,15),e('Psychic','Psychic',90,100,10,{targetBoost:{spd:-1},chance:10}),e('Psybeam','Psychic',65,100,20,{status:'confused',chance:10}),e('Future Sight','Psychic',80,90,15),e('Shadow Ball','Ghost',80,100,15,{targetBoost:{spd:-1},chance:20}),e('Night Shade','Ghost',0,100,15,{fixed:100}),e('Lick','Ghost',20,100,30,{status:'par',chance:30}),e('Dragon Breath','Dragon',60,100,20,{status:'par',chance:30}),e('Dragon Rage','Dragon',0,100,10,{fixed:40}),e('Outrage','Dragon',90,100,15),e('Twister','Dragon',40,100,20),e('Crunch','Dark',80,100,15,{targetBoost:{spd:-1},chance:20}),e('Bite','Dark',60,100,25,{status:'flinch',chance:30}),e('Pursuit','Dark',40,100,20),e('Faint Attack','Dark',60,100,20),e('Iron Tail','Steel',100,75,15,{targetBoost:{def:-1},chance:30}),e('Steel Wing','Steel',70,90,25,{boost:{def:1},chance:10}),e('Metal Claw','Steel',50,95,35,{boost:{atk:1},chance:10}),e('Dynamic Punch','Fighting',100,50,5,{status:'confused',chance:100}),e('Cross Chop','Fighting',100,80,5,{crit:true}),e('Mach Punch','Fighting',40,100,30,{priority:1}),e('Submission','Fighting',80,80,25,{recoil:.25}),e('Brick Break','Fighting',75,100,15),e('Megahorn','Bug',120,85,10),e('X-Scissor','Bug',80,100,15),e('Fury Cutter','Bug',40,95,20),e('Wing Attack','Flying',60,100,35),e('Fly','Flying',70,95,15),e('Drill Peck','Flying',80,100,20),e('Aerial Ace','Flying',60,100,20)
].map(x=>[x.name,x]));
// Fairy and abilities did not exist in Generation II. Physical/special is type-based, not move-based.
export const SPECIAL = new Set(['Fire','Water','Electric','Grass','Ice','Psychic','Dragon','Dark']);
const T = {
Normal: {Rock:.5,Ghost:0,Steel:.5},Fire:{Fire:.5,Water:.5,Grass:2,Ice:2,Bug:2,Rock:.5,Dragon:.5,Steel:2},Water:{Fire:2,Water:.5,Grass:.5,Ground:2,Rock:2,Dragon:.5},Electric:{Water:2,Electric:.5,Grass:.5,Ground:0,Flying:2,Dragon:.5},Grass:{Fire:.5,Water:2,Grass:.5,Poison:.5,Ground:2,Flying:.5,Bug:.5,Rock:2,Dragon:.5,Steel:.5},Ice:{Fire:.5,Water:.5,Grass:2,Ice:.5,Ground:2,Flying:2,Dragon:2,Steel:.5},Fighting:{Normal:2,Ice:2,Poison:.5,Flying:.5,Psychic:.5,Bug:.5,Rock:2,Ghost:0,Dark:2,Steel:2},Poison:{Grass:2,Poison:.5,Ground:.5,Rock:.5,Ghost:.5,Steel:0},Ground:{Fire:2,Electric:2,Grass:.5,Poison:2,Flying:0,Bug:.5,Rock:2,Steel:2},Flying:{Electric:.5,Grass:2,Fighting:2,Bug:2,Rock:.5,Steel:.5},Psychic:{Fighting:2,Poison:2,Psychic:.5,Dark:0,Steel:.5},Bug:{Fire:.5,Grass:2,Fighting:.5,Poison:.5,Flying:.5,Psychic:2,Ghost:.5,Dark:2,Steel:.5},Rock:{Fire:2,Ice:2,Fighting:.5,Ground:.5,Flying:2,Bug:2,Steel:.5},Ghost:{Normal:0,Psychic:2,Dark:.5,Steel:.5},Dragon:{Dragon:2,Steel:.5},Dark:{Fighting:.5,Psychic:2,Ghost:2,Dark:.5,Steel:.5},Steel:{Fire:.5,Water:.5,Electric:.5,Ice:2,Rock:2,Steel:.5}
};
export function effectiveness(moveType, types){return types.reduce((r,t)=>r*(T[moveType]?.[t]??1),1)}
const parse=(rows)=>rows.trim().split('\n').map(row=>{const [name,types,stats,moves,item='Leftovers']=row.split('|');let [hp,atk,def,spa,spd,spe]=stats.split(',').map(Number);return {id:name.toLowerCase().replace(/[^a-z0-9]/g,''),name,types:types.split('/'),base:{hp,atk,def,spa,spd,spe},moves:moves.split(','),item};});
export const SPECIES = parse(`
Pikachu|Electric|35,55,30,50,40,90|Thunderbolt,Thunder Wave,Quick Attack,Iron Tail|Light Ball
Raichu|Electric|60,90,55,90,80,100|Thunderbolt,Thunder Wave,Quick Attack,Surf
Venusaur|Grass/Poison|80,82,83,100,100,80|Giga Drain,Sludge Bomb,Leech Seed,Sleep Talk
Charizard|Fire/Flying|78,84,78,109,85,100|Flamethrower,Fire Blast,Earthquake,Slash
Blastoise|Water|79,83,100,85,105,78|Surf,Ice Beam,Earthquake,Protect
Butterfree|Bug/Flying|60,45,50,80,80,70|Psybeam,Giga Drain,Confuse Ray,Wing Attack
Beedrill|Bug/Poison|65,90,40,45,80,75|Sludge Bomb,X-Scissor,Swords Dance,Quick Attack
Pidgeot|Normal/Flying|83,80,75,70,70,91|Wing Attack,Quick Attack,Return,Steel Wing
Fearow|Normal/Flying|65,90,65,61,61,100|Drill Peck,Return,Quick Attack,Pursuit
Arbok|Poison|60,85,69,65,79,80|Sludge Bomb,Earthquake,Bite,Glare
Sandslash|Ground|75,100,110,45,55,65|Earthquake,Rock Slide,Slash,Swords Dance
Nidoqueen|Poison/Ground|90,92,87,75,85,76|Earthquake,Sludge Bomb,Ice Beam,Thunderbolt
Nidoking|Poison/Ground|81,102,77,85,75,85|Earthquake,Sludge Bomb,Thunderbolt,Ice Beam
Clefable|Normal|95,70,73,85,90,60|Return,Thunderbolt,Ice Beam,Soft-Boiled
Ninetales|Fire|73,76,75,81,100,100|Flamethrower,Confuse Ray,Quick Attack,Fire Blast
Wigglytuff|Normal|140,70,45,75,50,45|Body Slam,Thunder Wave,Ice Beam,Rest
Golbat|Poison/Flying|75,80,70,65,75,90|Sludge Bomb,Wing Attack,Confuse Ray,Bite
Vileplume|Grass/Poison|75,80,85,100,90,50|Giga Drain,Sludge Bomb,Sleep Talk,Petal Dance
Parasect|Bug/Grass|60,95,80,60,80,30|Giga Drain,Slash,X-Scissor,Swords Dance
Venomoth|Bug/Poison|70,65,60,90,75,90|Psybeam,Sludge Bomb,Giga Drain,Confuse Ray
Dugtrio|Ground|35,80,50,50,70,120|Earthquake,Rock Slide,Slash,Substitute
Persian|Normal|65,70,60,65,65,115|Slash,Bite,Thunderbolt,Quick Attack
Golduck|Water|80,82,78,95,80,85|Surf,Ice Beam,Psychic,Confuse Ray
Primeape|Fighting|65,105,60,60,70,95|Cross Chop,Rock Slide,Earthquake,Quick Attack
Arcanine|Fire|90,110,80,100,80,95|Flamethrower,Extreme Speed,Crunch,Iron Tail
Poliwrath|Water/Fighting|90,85,95,70,90,70|Surf,Submission,Ice Beam,Hypnosis
Alakazam|Psychic|55,50,45,135,85,120|Psychic,Recover,Thunder Wave,Fire Punch
Machamp|Fighting|90,130,80,65,85,55|Cross Chop,Rock Slide,Earthquake,Rest
Victreebel|Grass/Poison|80,105,65,100,60,70|Giga Drain,Sludge Bomb,Swords Dance,Sleep Talk
Tentacruel|Water/Poison|80,70,65,80,120,100|Surf,Sludge Bomb,Ice Beam,Toxic
Golem|Rock/Ground|80,110,130,55,65,45|Earthquake,Rock Slide,Body Slam,Explosion
Rapidash|Fire|65,100,70,80,80,105|Flame Wheel,Iron Tail,Return,Fire Blast
Slowbro|Water/Psychic|95,75,110,100,80,30|Surf,Psychic,Ice Beam,Rest
Magneton|Electric/Steel|50,60,95,120,70,70|Thunderbolt,Thunder Wave,Tri Attack,Hidden Power
Dodrio|Normal/Flying|60,110,70,60,60,100|Drill Peck,Return,Quick Attack,Steel Wing
Dewgong|Water/Ice|90,70,80,70,95,70|Ice Beam,Surf,Rest,Body Slam
Muk|Poison|105,105,75,65,100,50|Sludge Bomb,Fire Punch,Curse,Rest
Cloyster|Water/Ice|50,95,180,85,45,70|Surf,Ice Beam,Spikes,Protect
Gengar|Ghost/Poison|60,65,60,130,75,110|Shadow Ball,Thunderbolt,Hypnosis,Ice Punch
Onix|Rock/Ground|35,45,160,30,45,70|Rock Slide,Earthquake,Iron Tail,Curse
Hypno|Psychic|85,73,70,73,115,67|Psychic,Hypnosis,Reflect,Rest
Kingler|Water|55,130,115,50,50,75|Crabhammer,Return,Rock Slide,Swords Dance
Electrode|Electric|60,50,70,80,80,140|Thunderbolt,Thunder Wave,Light Screen,Explosion
Exeggutor|Grass/Psychic|95,95,85,125,65,55|Psychic,Giga Drain,Leech Seed,Explosion
Marowak|Ground|60,80,110,50,80,45|Earthquake,Rock Slide,Swords Dance,Return|Thick Club
Hitmonlee|Fighting|50,120,53,35,110,87|High Jump Kick,Rock Slide,Earthquake,Mach Punch
Hitmonchan|Fighting|50,105,79,35,110,76|Mach Punch,Ice Punch,Thunder Punch,Fire Punch
Weezing|Poison|65,90,120,85,70,60|Sludge Bomb,Thunderbolt,Fire Blast,Explosion
Rhydon|Ground/Rock|105,130,120,45,45,40|Earthquake,Rock Slide,Body Slam,Curse
Chansey|Normal|250,5,5,35,105,50|Seismic Toss,Soft-Boiled,Thunder Wave,Ice Beam
Kangaskhan|Normal|105,95,80,40,80,90|Return,Earthquake,Shadow Ball,Rest
Starmie|Water/Psychic|60,75,85,100,85,115|Surf,Psychic,Thunderbolt,Recover
Scyther|Bug/Flying|70,110,80,55,80,105|Wing Attack,X-Scissor,Swords Dance,Quick Attack
Jynx|Ice/Psychic|65,50,35,115,95,95|Ice Beam,Psychic,Lovely Kiss,Shadow Ball
Electabuzz|Electric|65,83,57,95,85,105|Thunderbolt,Ice Punch,Fire Punch,Thunder Wave
Magmar|Fire|65,95,57,100,85,93|Flamethrower,Thunder Punch,Psychic,Fire Blast
Pinsir|Bug|65,125,100,55,70,85|Megahorn,Rock Slide,Swords Dance,Return
Tauros|Normal|75,100,95,40,70,110|Return,Earthquake,Rock Slide,Rest
Gyarados|Water/Flying|95,125,79,60,100,81|Surf,Return,Earthquake,Thunder Wave
Lapras|Water/Ice|130,85,80,85,95,60|Surf,Ice Beam,Thunderbolt,Body Slam
Ditto|Normal|48,48,48,48,48,48|Return,Quick Attack,Rest,Protect
Vaporeon|Water|130,65,60,110,95,65|Surf,Ice Beam,Rest,Toxic
Jolteon|Electric|65,65,60,110,95,130|Thunderbolt,Thunder Wave,Bite,Double-Edge
Flareon|Fire|65,130,60,95,110,65|Flamethrower,Shadow Ball,Return,Fire Blast
Omastar|Rock/Water|70,60,125,115,70,55|Surf,Ice Beam,Ancient Power,Spikes
Kabutops|Rock/Water|60,115,105,65,70,80|Rock Slide,Surf,Slash,Swords Dance
Aerodactyl|Rock/Flying|80,105,65,60,75,130|Rock Slide,Wing Attack,Earthquake,Return
Snorlax|Normal|160,110,65,65,110,30|Body Slam,Earthquake,Curse,Rest
Articuno|Ice/Flying|90,85,100,95,125,85|Ice Beam,Blizzard,Wing Attack,Reflect
Zapdos|Electric/Flying|90,90,85,125,90,100|Thunderbolt,Drill Peck,Thunder,Rest
Moltres|Fire/Flying|90,100,90,125,85,90|Flamethrower,Fire Blast,Wing Attack,Rest
Dragonite|Dragon/Flying|91,134,95,100,100,80|Outrage,Thunderbolt,Ice Beam,Earthquake
Mewtwo|Psychic|106,110,90,154,90,130|Psychic,Ice Beam,Recover,Thunderbolt
Mew|Psychic|100,100,100,100,100,100|Psychic,Earthquake,Soft-Boiled,Thunderbolt
Meganium|Grass|80,82,100,83,100,80|Giga Drain,Body Slam,Reflect,Synthesis
Typhlosion|Fire|78,84,78,109,85,100|Flamethrower,Thunder Punch,Earthquake,Fire Blast
Feraligatr|Water|85,105,100,79,83,78|Surf,Ice Punch,Earthquake,Slash
Furret|Normal|85,76,64,45,55,90|Return,Quick Attack,Shadow Ball,Dig
Noctowl|Normal/Flying|100,50,50,76,96,70|Wing Attack,Psychic,Reflect,Hypnosis
Ledian|Bug/Flying|55,35,50,55,110,85|Giga Drain,Wing Attack,Light Screen,Reflect
Ariados|Bug/Poison|70,90,70,60,60,40|Sludge Bomb,X-Scissor,Spider Web,Night Shade
Crobat|Poison/Flying|85,90,80,70,80,130|Sludge Bomb,Wing Attack,Confuse Ray,Quick Attack
Lanturn|Water/Electric|125,58,58,76,76,67|Surf,Thunderbolt,Ice Beam,Thunder Wave
Togetic|Normal/Flying|55,40,85,80,105,40|Return,Psychic,Thunder Wave,Rest
Xatu|Psychic/Flying|65,75,70,95,70,95|Psychic,Wing Attack,Confuse Ray,Future Sight
Ampharos|Electric|90,75,75,115,90,55|Thunderbolt,Thunder Wave,Fire Punch,Light Screen
Bellossom|Grass|75,80,85,90,100,50|Giga Drain,Petal Dance,Stun Spore,Moonlight
Azumarill|Water|100,50,80,50,80,50|Surf,Ice Beam,Body Slam,Rest
Sudowoodo|Rock|70,100,115,30,65,30|Rock Slide,Earthquake,Return,Curse
Politoed|Water|90,75,75,90,100,70|Surf,Ice Beam,Hypnosis,Rest
Jumpluff|Grass/Flying|75,55,70,55,85,110|Giga Drain,Leech Seed,Stun Spore,Reflect
Sunflora|Grass|75,75,55,105,85,30|Giga Drain,Petal Dance,Leech Seed,Synthesis
Quagsire|Water/Ground|95,85,85,65,65,35|Earthquake,Surf,Ice Beam,Rest
Espeon|Psychic|65,65,60,130,95,110|Psychic,Morning Sun,Reflect,Shadow Ball
Umbreon|Dark|95,65,110,60,130,65|Faint Attack,Toxic,Confuse Ray,Moonlight
Murkrow|Dark/Flying|60,85,42,85,42,91|Faint Attack,Wing Attack,Shadow Ball,Quick Attack
Slowking|Water/Psychic|95,75,80,100,110,30|Surf,Psychic,Thunder Wave,Rest
Misdreavus|Ghost|60,60,60,85,85,85|Shadow Ball,Thunderbolt,Confuse Ray,Pain Split
Unown|Psychic|48,72,48,72,48,48|Psychic,Psybeam,Future Sight,Protect
Wobbuffet|Psychic|190,33,58,33,58,33|Return,Mirror Coat,Counter,Rest
Girafarig|Normal/Psychic|70,80,65,90,65,85|Psychic,Return,Crunch,Thunderbolt
Forretress|Bug/Steel|75,90,140,60,60,40|Spikes,Earthquake,Explosion,Protect
Dunsparce|Normal|100,70,70,65,65,45|Body Slam,Headbutt,Earthquake,Rest
Gligar|Ground/Flying|65,75,105,35,65,85|Earthquake,Wing Attack,Rock Slide,Quick Attack
Steelix|Steel/Ground|75,85,200,55,65,30|Earthquake,Iron Tail,Rock Slide,Curse
Granbull|Normal|90,120,75,60,60,45|Return,Shadow Ball,Earthquake,Rest
Qwilfish|Water/Poison|65,95,75,55,55,85|Sludge Bomb,Surf,Spikes,Thunder Wave
Scizor|Bug/Steel|70,130,100,55,80,65|Steel Wing,X-Scissor,Swords Dance,Quick Attack
Shuckle|Bug/Rock|20,10,230,10,230,5|Toxic,Rock Slide,Rest,Protect
Heracross|Bug/Fighting|80,125,75,40,95,85|Megahorn,Cross Chop,Earthquake,Rock Slide
Sneasel|Dark/Ice|55,95,55,35,75,115|Slash,Ice Beam,Shadow Ball,Quick Attack
Ursaring|Normal|90,130,75,75,75,55|Return,Earthquake,Rest,Slash
Magcargo|Fire/Rock|50,50,120,80,80,30|Flamethrower,Rock Slide,Earthquake,Rest
Piloswine|Ice/Ground|100,100,80,60,60,50|Earthquake,Ice Beam,Rock Slide,Rest
Corsola|Water/Rock|55,55,85,65,85,35|Surf,Ancient Power,Recover,Toxic
Octillery|Water|75,105,75,105,75,45|Surf,Ice Beam,Fire Blast,Sludge Bomb
Delibird|Ice/Flying|45,55,45,65,45,75|Ice Beam,Fly,Quick Attack,Protect
Mantine|Water/Flying|65,40,70,80,140,70|Surf,Ice Beam,Confuse Ray,Rest
Skarmory|Steel/Flying|65,80,140,40,70,70|Drill Peck,Steel Wing,Spikes,Rest
Houndoom|Dark/Fire|75,90,50,110,80,95|Crunch,Flamethrower,Fire Blast,Shadow Ball
Kingdra|Water/Dragon|75,95,95,95,95,85|Surf,Dragon Breath,Ice Beam,Rest
Donphan|Ground|90,120,120,60,60,50|Earthquake,Rock Slide,Return,Rest
Porygon2|Normal|85,80,90,105,95,60|Tri Attack,Thunderbolt,Ice Beam,Recover
Stantler|Normal|73,95,62,85,65,85|Return,Psychic,Shadow Ball,Thunder Wave
Smeargle|Normal|55,20,35,20,45,75|Spore,Return,Leech Seed,Protect
Hitmontop|Fighting|50,95,95,35,110,70|Mach Punch,Rock Slide,Earthquake,Rest
Miltank|Normal|95,80,105,40,70,100|Body Slam,Earthquake,Milk Drink,Thunder Wave
Blissey|Normal|255,10,10,75,135,55|Seismic Toss,Soft-Boiled,Thunder Wave,Ice Beam
Raikou|Electric|90,85,75,115,100,115|Thunderbolt,Crunch,Reflect,Rest
Entei|Fire|115,115,85,90,75,100|Fire Blast,Flamethrower,Iron Tail,Return
Suicune|Water|100,75,115,90,115,85|Surf,Ice Beam,Rest,Reflect
Tyranitar|Rock/Dark|100,134,110,95,100,61|Rock Slide,Crunch,Earthquake,Fire Blast
Lugia|Psychic/Flying|106,90,130,90,154,110|Psychic,Aeroblast,Recover,Ice Beam
Ho-Oh|Fire/Flying|106,130,90,110,154,90|Sacred Fire,Earthquake,Recover,Thunderbolt
Celebi|Psychic/Grass|100,100,100,100,100,100|Psychic,Giga Drain,Recover,Leech Seed
`);
// Additional actual Generation II attacks. The earlier version silently remapped
// iconic moves such as Explosion and Extreme Speed to unrelated animations/rules.
Object.assign(MOVES,Object.fromEntries([
 e('Extreme Speed','Normal',80,100,5,{priority:1}),
 e('Explosion','Normal',250,100,5,{special:'explosion'}),
 e('Crabhammer','Water',90,85,10,{crit:true}),
 e('Seismic Toss','Fighting',0,100,20,{special:'fixedLevel'}),
 e('High Jump Kick','Fighting',85,90,20,{missCrash:true}),
 e('Lovely Kiss','Normal',0,75,10,{status:'slp'}),
 e('Spore','Grass',0,100,15,{status:'slp'}),
 e('Synthesis','Grass',0,100,5,{heal:.5}),
 e('Moonlight','Normal',0,100,5,{heal:.5}),
 e('Milk Drink','Normal',0,100,10,{heal:.5}),
 e('Aeroblast','Flying',100,95,5,{crit:true}),
 e('Sacred Fire','Fire',100,95,5,{status:'brn',chance:50}),
 e('Stun Spore','Grass',0,75,30,{status:'par'}),
 e('Glare','Normal',0,75,30,{status:'par'}),
 e('Hidden Power','Normal',70,100,15), // neutral preset; DV-based typing not implemented
 e('Counter','Fighting',0,100,20,{special:'counter',priority:-1}),
 e('Mirror Coat','Psychic',0,100,20,{special:'mirrorCoat',priority:-1}),
 e('Pain Split','Normal',0,100,20,{special:'painSplit'}),
 e('Spider Web','Bug',0,100,10,{special:'trap'}),
 e('Substitute','Normal',0,100,10,{special:'substitute'}),
 e('Pin Missile','Bug',42,95,20), // single-hit balancing approximation for multi-hit move
 e('Cross Chop','Fighting',100,80,5,{crit:true})
].map(m=>[m.name,m])));
// Named attacks absent in the curated engine are mapped to closest Generation II equivalents.
const MOVE_ALIASES={'X-Scissor':'Fury Cutter','Brick Break':'Submission','Aerial Ace':'Wing Attack'};
for(const s of SPECIES){s.moves=s.moves.map(n=>MOVE_ALIASES[n]||n);}
// Optional local PokeAPI data importer expands to all 251 without a runtime API.
for(const s of EXTRA_SPECIES){if(!SPECIES.some(p=>p.name===s.name))SPECIES.push(s);}
export const INDEX = Object.fromEntries(SPECIES.map(s=>[s.id,s]));
export const BOSS = ['Pikachu','Espeon','Snorlax','Venusaur','Charizard','Blastoise'];
export const BOSS_LEVELS = [81,73,75,77,77,77];
export const ITEMS = ['Leftovers','Gold Berry','Miracle Berry','Focus Band','Quick Claw','Scope Lens','Mystic Water','Charcoal','Magnet','Soft Sand','NeverMeltIce','Spell Tag','Black Glasses','Metal Coat','Pink Bow','Miracle Seed','Poison Barb','Twisted Spoon','Hard Stone','Silver Powder','Sharp Beak'];
