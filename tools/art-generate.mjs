// Runs ImageGen jobs through the project-local codex bridge, N at a time.
// Usage: node tools/art-generate.mjs <jobs.json> [--parallel 4]
// jobs.json: [{ "prompt": "art-src/prompts/x.txt", "out": ".scratch/x.png", "ref": "optional reference.png" }]
// Needs CODEX_BIN (or --codex) pointing at the signed-in Codex CLI. Generation spends Codex allowance.
import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';
const [,, jobsFile, ...rest]=process.argv;
const opt=(n,d)=>{const i=rest.indexOf('--'+n);return i>=0?rest[i+1]:d};
const codex=opt('codex',process.env.CODEX_BIN);
const model=opt('model','gpt-6.1-sol');
const parallel=Number(opt('parallel',4));
if(!jobsFile||!codex){console.error('usage: CODEX_BIN=... node tools/art-generate.mjs jobs.json [--parallel 4]');process.exit(1)}
const jobs=JSON.parse(readFileSync(jobsFile,'utf8'));
const run=j=>new Promise(res=>{
 const a=['tools/codex-imagegen/imagegen.mjs','--codex',codex,'--model',model,'--prompt-file',j.prompt,'--out',j.out,'--log','art-src/GENERATION-LOG.md','--timeout-sec','540'];
 if(j.ref)a.push('--image',j.ref);
 const c=spawn(process.execPath,a,{stdio:['ignore','pipe','pipe']});let o='';
 c.stdout.on('data',d=>o+=d);
 c.on('close',code=>{console.log(j.out,'exit',code,o.slice(0,160));res()});
});
const queue=[...jobs];
await Promise.all(Array.from({length:parallel},async()=>{while(queue.length)await run(queue.shift())}));
console.log('ALLDONE');
