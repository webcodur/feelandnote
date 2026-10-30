// Sequential native writing from prepared data. This process never calls a model.
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';
import {ASSETS} from '../blog-assets.mjs';
import {assembleUnifiedArticles} from './assemble-unified-articles.mjs';
import {preflightUnifiedCovers} from './lib/unified-cover-preflight.mjs';
import {isDeferrableBeforeSave} from './lib/unified-writer-failures.mjs';
import {titleAndFunnelPatch} from './lib/unified-title-patch.mjs';
const args=process.argv.slice(2),options={};
if(!args.includes('--apply'))throw Error('Sequential native writing requires --apply');
for(const arg of args){if(arg==='--apply')continue;const m=arg.match(/^--(materials|summaries|out|summary-state|supplement|portraits|title-plan)=(.+)$/);if(!m)throw Error('--materials= --summaries= --out= --summary-state= --apply');options[m[1]]=m[2];}
if(!Object.values(options).every(path.isAbsolute)||!options['summary-state'])throw Error('Absolute inputs and summary state required');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>{const tmp=f+'.tmp';fs.writeFileSync(tmp,JSON.stringify(v,null,2));fs.renameSync(tmp,f);};
fs.mkdirSync(options.out,{recursive:true});
const lock=path.join(options.out,'writer.lock'),stateFile=path.join(options.out,'writer-state.json');
if(fs.existsSync(lock)){const pid=Number(fs.readFileSync(lock,'utf8'));let live=true;try{process.kill(pid,0);}catch{live=false;}if(live)throw Error('A sequential writer already owns this output');fs.unlinkSync(lock);}
fs.writeFileSync(lock,String(process.pid),{flag:'wx'});
const previous=fs.existsSync(stateFile)?read(stateFile):{};
const state={stage:'running',current:null,verified:[],pending:[],deferred:previous.deferred??[],completedThisRun:0,titleOnlyVerified:previous.titleOnlyVerified??[],titleOnlyThisRun:0,lastVerifiedAt:previous.lastVerifiedAt??null,modelCalls:0};
const record=()=>write(stateFile,{...state,updatedAt:new Date().toISOString()});
const receiptFor=id=>path.join(options.out,id+'-native-verified.json');
function verified(row){const file=receiptFor(row.logNo);if(!fs.existsSync(file))return false;const r=read(file);return r.saved===true&&r.verified===true&&r.articleHash===row.articleHash;}
function currentFailure(id,since){
 const dir=fs.readdirSync(options.out).filter(f=>f.startsWith(id+'-native-')&&/^\d+$/.test(f.slice((id+'-native-').length))&&Number(f.slice((id+'-native-').length))>=since).sort().at(-1);
 if(!dir)return null;const file=path.join(options.out,dir,'failure.json'),before=path.join(options.out,dir,'before.json');
 if(!fs.existsSync(file)||!fs.existsSync(before)||String(read(before).post.logNo)!==id)return null;
 return{...read(file),dir:path.join(options.out,dir)};
}
async function apply(file,revision=false){
 const log=fs.openSync(path.join(options.out,'native-worker.stdout.log'),'a');
 try{await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(import.meta.dirname,revision?'apply-unified-title-revision.mjs':'apply-unified-article.mjs'),'--article='+file,'--apply'],{cwd:path.resolve(import.meta.dirname,'../..'),windowsHide:true,stdio:['ignore',log,log]});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Native worker failed with exit '+code)));});}
 finally{fs.closeSync(log);}
}
async function restorePendingTitles(pending){
 if(!options['title-plan'])return true;
 const ids=new Set(pending.map(r=>r.logNo)),plan=read(options['title-plan']);
 for(const row of plan.rows.filter(r=>ids.has(r.logNo))){
  if(fs.existsSync(path.join(options.out,'pause-after-current'))){state.stage='paused-between-articles';state.current=null;record();return false;}
  const post=read(path.join(ASSETS,'naver-blog/posts.json')).find(p=>String(p.logNo)===row.logNo);if(post?.title===row.after)continue;
  state.current=row.logNo;state.currentMode='title-only';record();const started=Date.now(),log=fs.openSync(path.join(options.out,'native-worker.stdout.log'),'a');
  try{await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[path.join(import.meta.dirname,'apply-existing-title.mjs'),'--plan='+options['title-plan'],'--log-no='+row.logNo,'--out='+options.out,'--apply'],{cwd:path.resolve(import.meta.dirname,'../..'),windowsHide:true,stdio:['ignore',log,log]});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Title-only worker failed with exit '+code)));});}finally{fs.closeSync(log);}
  const result=read(path.join(options.out,'title-only-verified',row.logNo+'.json'));if(!result.saved||!result.verified||!result.bodyUnchanged||result.title!==row.after)throw Error('Title-only receipt differs');
  state.titleOnlyVerified=[...new Set([...state.titleOnlyVerified,row.logNo])];state.titleOnlyThisRun++;state.lastVerifiedAt=new Date().toISOString();state.lastArticleSeconds=Math.round((Date.now()-started)/1000);state.current=null;state.currentMode=null;record();
 }
 return true;
}
let consecutiveNativeFailures=0;
try{outer:for(;;){
 let assembly=assembleUnifiedArticles({...options});state.pending=assembly.pending;
 state.verified=assembly.ready.filter(verified).map(r=>r.logNo);
 state.deferred=state.deferred.filter(d=>assembly.ready.some(r=>r.logNo===d.logNo&&r.articleHash===d.articleHash)&&!state.verified.includes(d.logNo));record();
 const revisionPriority=new Map(assembly.ready.map(row=>{const f=path.join(options.out,'revision-base',row.logNo+'.json');return[row.logNo,!verified(row)&&fs.existsSync(f)&&!!titleAndFunnelPatch(read(f).article,read(path.join(options.out,row.logNo+'-article.json')))];}));
 const queue=[...assembly.ready].sort((a,b)=>Number(revisionPriority.get(b.logNo))-Number(revisionPriority.get(a.logNo)));
 let titlePhaseDone=false;
 for(let row of queue){
  if(fs.existsSync(path.join(options.out,'pause-after-current'))){state.stage='paused-between-articles';state.current=null;record();break outer;}
  if(verified(row)||state.deferred.some(d=>d.logNo===row.logNo&&d.articleHash===row.articleHash))continue;
  if(!revisionPriority.get(row.logNo)&&!titlePhaseDone){if(!await restorePendingTitles(assembly.pending))break outer;titlePhaseDone=true;}
  state.current=row.logNo;state.currentMode=revisionPriority.get(row.logNo)?'title-and-scope':'article';record();const started=Date.now();let nativeStarted=null;
  try{
   const baseFile=path.join(options.out,'revision-base',row.logNo+'.json'),currentArticle=read(path.join(options.out,row.logNo+'-article.json'));
   let revision=fs.existsSync(baseFile)&&!!titleAndFunnelPatch(read(baseFile).article,currentArticle);
   const changed=revision?false:await preflightUnifiedCovers(path.join(options.materials,row.logNo+'-material.json'),options.out);
   if(changed){assembly=assembleUnifiedArticles({...options});state.pending=assembly.pending;const next=assembly.ready.find(r=>r.logNo===row.logNo);if(!next)throw Error('Preflight material cannot be assembled');row=next;}
   nativeStarted=Date.now();await apply(path.join(options.out,row.logNo+'-article.json'),revision);
   if(!verified(row))throw Error('Saved native receipt differs');
   consecutiveNativeFailures=0;state.verified.push(row.logNo);state.completedThisRun++;state.lastVerifiedAt=new Date().toISOString();state.lastArticleSeconds=Math.round((Date.now()-started)/1000);state.current=null;record();
  }catch(error){
   const failure=nativeStarted?currentFailure(row.logNo,nativeStarted):null;
   if(error.deferrableBeforeSave===true||isDeferrableBeforeSave(failure)){
    state.deferred=state.deferred.filter(d=>d.logNo!==row.logNo);
    state.deferred.push({logNo:row.logNo,articleHash:row.articleHash,error:failure?.error??String(error),transaction:failure?.dir??null,saved:false,deferredAt:new Date().toISOString()});state.current=null;record();
    if(failure&&++consecutiveNativeFailures>=3)throw Error('Three consecutive native validation failures require investigation');
    continue;
   }
   throw error;
  }
 }
 if(!titlePhaseDone&&!await restorePendingTitles(assembly.pending))break;
 if(read(options['summary-state']).stage!=='preparing'){
  // Preparation can finish while this queue is being saved. Drain the newly
  // ready articles before declaring this one-off run finished.
  const final=assembleUnifiedArticles({...options});state.pending=final.pending;
  state.verified=final.ready.filter(verified).map(r=>r.logNo);
  state.deferred=state.deferred.filter(d=>final.ready.some(r=>r.logNo===d.logNo&&r.articleHash===d.articleHash)&&!state.verified.includes(d.logNo));
  if(final.ready.some(row=>!verified(row)&&!state.deferred.some(d=>d.logNo===row.logNo&&d.articleHash===row.articleHash))){state.current=null;record();continue;}
  state.stage=state.pending.length||state.deferred.length?'finished-with-pending':'complete';state.current=null;record();break;
 }
 state.current=null;record();await new Promise(r=>setTimeout(r,30000));
}}
catch(error){state.stage='stopped';state.error=String(error);record();process.exitCode=1;}
finally{if(fs.existsSync(lock)&&fs.readFileSync(lock,'utf8')===String(process.pid))fs.unlinkSync(lock);}
