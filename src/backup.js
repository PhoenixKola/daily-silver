// Local-only import validation. This module never performs storage writes itself.
const DATE=/^\d{4}-\d{2}-\d{2}$/;
const validDate=(date)=>typeof date==='string'&&DATE.test(date)&&!Number.isNaN(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
const validMon=(p)=>p&&typeof p==='object'&&typeof p.name==='string'&&p.name.length<=40&&Number.isInteger(p.hp)&&p.hp>=0&&Number.isFinite(p.maxHp)&&p.maxHp>0&&p.hp<=p.maxHp&&Array.isArray(p.moves)&&p.moves.length===4&&p.moves.every(m=>typeof m.name==='string'&&m.name.length<=40&&Number.isFinite(m.pp)&&m.pp>=0&&m.pp<=70);
const validRun=(b)=>b&&b.version===1&&['daily','practice'].includes(b.mode)&&validDate(b.date)&&['battle','won','lost'].includes(b.phase)&&Array.isArray(b.player)&&b.player.length===6&&b.player.every(validMon)&&Array.isArray(b.foe)&&b.foe.length===6&&b.foe.every(validMon)&&Number.isInteger(b.pActive)&&b.pActive>=0&&b.pActive<6&&Number.isInteger(b.eActive)&&b.eActive>=0&&b.eActive<6&&Number.isInteger(b.turn)&&b.turn>=1&&b.turn<=100000&&Array.isArray(b.log)&&b.log.length<=140&&b.log.every(l=>typeof l.text==='string'&&l.text.length<=400)&&Number.isInteger(b.rng)&&Number.isInteger(b.seed);
const validMoment=(m)=>m&&typeof m==='object'&&Number.isInteger(m.turn)&&m.turn>=1&&m.turn<=100000&&['finisher','final-faint'].includes(m.kind)&&['actor','target','move'].every(k=>typeof m[k]==='string'&&m[k].length<=40);
const validRecord=(r)=>r&&typeof r==='object'&&typeof r.id==='string'&&r.id.length<=100&&['daily','practice'].includes(r.mode)&&validDate(r.date)&&typeof r.won==='boolean'&&Number.isInteger(r.turns)&&r.turns>=1&&r.turns<=100000&&Number.isInteger(r.remaining)&&r.remaining>=0&&r.remaining<=6&&(r.moment===undefined||r.recordVersion===2&&validMoment(r.moment));
export function validateBackup(text){
 if(typeof text!=='string'||text.length>2_000_000)throw Error('Backup is too large (2 MB limit).');
 let data;try{data=JSON.parse(text)}catch{throw Error('This file is not valid JSON.')}
 if(!data||data.app!=='daily-silver'||data.exportVersion!==2||!data.entries||typeof data.entries!=='object'||Array.isArray(data.entries))throw Error('This is not a Daily Silver backup.');
 const entries=Object.entries(data.entries);
 if(!entries.length||entries.length>1000)throw Error('Backup contains no records or too many entries.');
 for(const [name,value] of entries){
   if(name==='records'){if(!Array.isArray(value)||value.length>200||!value.every(validRecord))throw Error('Invalid battle history.');}
   else if(name==='practice'){if(value!==null&&!validRun(value))throw Error('Invalid practice save.');}
   else if(name.startsWith('daily:')){if(!validDate(name.slice(6))||!validRun(value)||value.mode!=='daily'||value.date!==name.slice(6))throw Error('Invalid daily battle save.');}
   else if(name==='fx-rate'){if(![.5,1,1.5,2,3].includes(value))throw Error('Invalid animation speed.');}
   else if(name==='volume'){if(typeof value!=='number'||!Number.isFinite(value)||value<.05||value>1)throw Error('Invalid volume level.');}
   else if(name==='music-level'){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1)throw Error('Invalid music level.');}
   else if(name==='high-contrast'){if(typeof value!=='boolean')throw Error('Invalid contrast setting.');}
   else if(name==='sound-enabled'){if(typeof value!=='boolean')throw Error('Invalid sound setting.');}
   else throw Error('Backup includes an unsupported setting: '+name);
 }
 return Object.fromEntries(entries);
}
