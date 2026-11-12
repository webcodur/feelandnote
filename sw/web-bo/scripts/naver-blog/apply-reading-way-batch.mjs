// Sequential native-editor transactions over an explicitly inspected target file.
// --targets=<absolute JSON> --work=<absolute directory> [--limit=N] [--replace]
import fs from 'node:fs';import path from 'node:path';
import {getBrowser} from './lib/browser.mjs';
import {applyReadingWay} from './apply-reading-way.mjs';
import {isFutureReservation,openRegistryTarget} from './lib/open-registry-target.mjs';
import {readParagraphPresentation} from './lib/unified-typography.mjs';
import {formattedParagraphMatches} from './lib/formatted-text.mjs';
const args=process.argv.slice(2),arg=name=>args.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3),targets=arg('targets'),work=arg('work'),limit=arg('limit')?Number(arg('limit')):Infinity;
if(!targets||!work||![targets,work].every(path.isAbsolute)||!(limit>0)||args.some(a=>!/^--(targets|work|limit)=/.test(a)&&a!=='--replace'))throw Error('Explicit --targets and --work required');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const selected=read(targets).tasks;if(!Array.isArray(selected)||!selected.length||selected.some(t=>!/^\d+$/.test(t.logNo)||!t.slug)||new Set(selected.map(t=>t.logNo)).size!==selected.length)throw Error('Exact unique post numbers and person slugs required');
fs.mkdirSync(work,{recursive:true});const stateFile=path.join(work,'batch-state.json'),state=fs.existsSync(stateFile)?read(stateFile):{total:selected.length,completed:[],failed:[]};
if(state.total!==selected.length||state.completed.some(t=>!selected.some(s=>s.logNo===t.logNo)))throw Error('Target file differs from this batch');
state.failed=[];state.stage='running';state.startedAt??=new Date().toISOString();
const report=()=>{state.updatedAt=new Date().toISOString();const temp=stateFile+'.tmp';fs.writeFileSync(temp,JSON.stringify(state,null,2));fs.renameSync(temp,stateFile);};report();
const future=isFutureReservation,openTarget=openRegistryTarget;
const {browser,launched}=await getBrowser({background:true,protocolTimeout:60000});
async function verifyPublic(result,folder,capture){
 if(result.reserved)return'reserved';const page=await browser.newPage();try{
  await page.setViewport({width:390,height:1100});await page.setCacheEnabled(false);
  for(let attempt=0;attempt<3;attempt++){
   await page.goto(`https://m.blog.naver.com/dmx777/${result.post.logNo}`,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('.se-main-container',{timeout:20000});
   const actual=await page.evaluate(readParagraphPresentation,'.se-main-container .se-text-paragraph');
   if(!same(actual.map(p=>p.text),result.texts)){if(attempt<2){await sleep(1500);continue;}throw Error('Published complete text differs from verified native article');}
   if(result.removed){if(actual.some(p=>p.text==='독서 방식'))throw Error('Published removed section remains');return'public';}
   const heading=actual.filter(p=>p.text==='독서 방식')[1],rgb=hex=>'rgb('+hex.slice(1).match(/../g).map(v=>parseInt(v,16)).join(', ')+')';
   if(!heading||heading.colors.some(c=>c!==rgb(result.section[0].color))||heading.weights.some(w=>w<600))throw Error('Published reading-way heading differs');
   for(const op of result.section.slice(1)){const p=actual.find(p=>p.text===op.text);if(!p||p.align!=='left'||!formattedParagraphMatches(op,p))throw Error('Published reading-way body differs');}
   if(capture){const clip=await page.evaluate(()=>{const p=[...document.querySelectorAll('.se-main-container .se-text-paragraph')].filter(p=>p.textContent.replace(/\u200b/g,'').trim()==='독서 방식')[1];return{x:0,y:p.getBoundingClientRect().top+scrollY-20,width:390,height:900};});await page.screenshot({path:path.join(folder,'public-reading-way.png'),clip});}
   return'public';
  }
 }finally{await page.close();}
}
try{
 const done=new Set(state.completed.map(t=>t.logNo)),remaining=selected.filter(t=>!done.has(t.logNo)).sort((a,b)=>Number(future(a))-Number(future(b))||Number(!a.already)-Number(!b.already));let count=0;
 for(const target of remaining){
  if(count>=limit||fs.existsSync(path.join(work,'stop'))){state.stage='chunk-complete';break;}
  const started=Date.now(),folder=path.join(work,target.logNo),capture=state.completed.length<3||state.completed.length%20===0;state.current={...target,phase:'opening'};report();
  try{
   const result=await applyReadingWay([`--log=${target.logNo}`,`--work=${folder}`,'--apply',...(target.mode==='remove'?['--remove']:args.filter(a=>a==='--replace'))],{browser,openTarget,autoExisting:true,capture,viewportHeight:1700,onState:event=>{state.current={...target,phase:event.stage};report();}});
   state.current.phase='verifying-public';report();const visibility=await verifyPublic(result,folder,capture);
   state.completed.push({logNo:target.logNo,slug:target.slug,name:target.name,changed:result.changed,visibility,seconds:Math.round((Date.now()-started)/1000),sourceHash:result.sourceHash});state.current=null;count++;report();console.log(JSON.stringify({event:'completed',completed:state.completed.length,total:state.total,name:target.name,logNo:target.logNo,seconds:Math.round((Date.now()-started)/1000)}));
   // The live DB and the saved article are the sources; discard successful transaction copies.
   for(const name of fs.readdirSync(folder)){const file=path.join(folder,name);if(fs.statSync(file).isFile()&&!name.endsWith('.png'))fs.unlinkSync(file);}
  }catch(error){state.failed.push({...target,error:String(error)});state.stage='failed';report();throw error;}
 }
 if(state.completed.length===state.total)state.stage='complete';else if(state.stage==='running')state.stage='chunk-complete';state.current=null;report();
}finally{await browser.defaultBrowserContext().clearPermissionOverrides().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();}
