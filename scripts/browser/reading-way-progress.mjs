import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readingWayProgress} from './reading-way-argon.mjs';

const exec=promisify(execFile);
const directory=path.dirname(fileURLToPath(import.meta.url));
const logsRoot=path.join(os.tmpdir(),'feelandnote');
const PORT=4317, DB_INTERVAL=60000, PROCESS_INTERVAL=10000;
let database=null,databaseAt=null,databaseError=null,inflight=null,processes=[],processAt=0,processError=null;

async function logs(){
  const folders=(await fs.readdir(logsRoot,{withFileTypes:true})).filter(x=>x.isDirectory()&&x.name.startsWith('reading-way-argon-runner-'));
  const runs=[];
  for(const folder of folders){
    const filename=path.join(logsRoot,folder.name,'stdout.log');
    try{
      const raw=await fs.readFile(filename,'utf8');
      const events=raw.split(/\r?\n/).flatMap(line=>{try{const e=JSON.parse(line);return typeof e.event==='string'&&Number.isFinite(Date.parse(e.time))?[e]:[];}catch{return [];}});
      if(events.length)runs.push({id:folder.name,events,last:events.at(-1).time});
    }catch(error){if(error.code!=='ENOENT')throw error;}
  }
  return runs.sort((a,b)=>Date.parse(a.last)-Date.parse(b.last));
}

async function running(){
  if(Date.now()-processAt<PROCESS_INTERVAL)return;
  try{
    const command="@(Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and ($_.CommandLine -like '*reading-way-argon.mjs --apply*' -or $_.CommandLine -like '*bill-clinton-pilot-*run.mjs*') } | Select-Object ProcessId,CreationDate) | ConvertTo-Json -Compress";
    const {stdout}=await exec('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{windowsHide:true,timeout:12000});
    const result=stdout.trim()?JSON.parse(stdout):[];
    processes=Array.isArray(result)?result:[result];processError=null;
  }catch{processError='실행 프로세스를 확인하지 못했습니다.';}
  processAt=Date.now();
}

async function status(){
  const runs=await logs();
  const events=runs.flatMap(r=>r.events).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));
  // Book verification can append to an older run after a newer batch starts.
  const current=runs.filter(r=>r.events.some(e=>e.event==='selected')).sort((a,b)=>Date.parse(a.events.findLast(e=>e.event==='selected').time)-Date.parse(b.events.findLast(e=>e.event==='selected').time)).at(-1);
  const selected=current?.events.findLast(e=>e.event==='selected');
  const names=[...new Set([...events.slice(-200).map(e=>e.slug),...(selected?.people??[]).map(p=>p.slug)].filter(Boolean))];
  if(!inflight&&(!databaseAt||Date.now()-Date.parse(databaseAt)>=DB_INTERVAL)){
    inflight=readingWayProgress({names}).then(value=>{database=value;databaseAt=new Date().toISOString();databaseError=null;}).catch(()=>{databaseError='DB 집계를 갱신하지 못했습니다. 마지막 성공 값을 표시합니다.';}).finally(()=>{inflight=null;});
  }
  if(!database&&inflight)await inflight;
  await running();
  const selectedSlugs=new Set(selected?.people.map(p=>p.slug)??[]);
  const runEvents=new Set(selected?current.events.slice(current.events.indexOf(selected)):[]);
  const currentEvents=selected?events.filter(e=>Date.parse(e.time)>=Date.parse(selected.time)&&(runEvents.has(e)||selectedSlugs.has(e.slug))):[];
  const done=new Map(),active=new Map(),bookChecks={},bookPending={};
  for(const e of events){
    if(e.event==='books_pending')bookPending[e.slug]={time:e.time,count:e.count};
    if(e.event==='books_partial'&&Number.isInteger(e.remaining)&&e.remaining>0)bookPending[e.slug]={time:e.time,count:e.remaining};
    if(e.event==='books_verified'){bookChecks[e.slug]={time:e.time,count:e.count};delete bookPending[e.slug];}
  }
  const waits=new Map();let waitBooks=null;
  for(const e of currentEvents){
    if(e.event==='submitted'||e.event==='resumed')active.set(e.slug,{slug:e.slug,since:e.time,profile:e.profile??null,phase:'응답 대기'});
    if(e.event==='retry_cache'&&active.has(e.slug))active.get(e.slug).phase='캐시 갱신 재시도';
    if(e.event==='draft_ready'){done.set(e.slug,e);active.delete(e.slug);waits.delete(e.slug);}
    if(e.event==='published'||e.event==='books_ready'){done.set(e.slug,e);active.delete(e.slug);waits.delete(e.slug);}
    if(e.event==='fact_check_pending'){done.delete(e.slug);active.set(e.slug,{slug:e.slug,since:e.time,profile:null,phase:'사실 오류 재작성 대기'});}
    if(e.event==='waiting_for_argon'){waits.set(e.slug,e);active.set(e.slug,{slug:e.slug,since:e.time,profile:e.profile??null,phase:'계정 접근 대기'});}
    if(e.event==='waiting_for_books')waitBooks=e;
    if(e.event==='submitted'||e.event==='resumed')waits.delete(e.slug);
    if(e.event==='person_deferred'){waits.delete(e.slug);active.delete(e.slug);}
  }
  // Separate book supplements and manuscript corrections can run together.
  // Only show another run's live slots when its recorded process still exists.
  const livePids=new Set(processes.map(p=>p.ProcessId));
  for(const run of runs){
    if(run===current)continue;
    const assignment=run.events.findLast(e=>e.event==='selected');
    if(!assignment||!livePids.has(assignment.pid))continue;
    const slots=new Map(),slotWaits=new Map();
    for(const e of run.events.slice(run.events.indexOf(assignment))){
      if(e.event==='submitted'||e.event==='resumed'){slots.set(e.slug,{slug:e.slug,since:e.time,profile:e.profile??null,phase:'응답 대기'});slotWaits.delete(e.slug);}
      if(e.event==='waiting_for_argon'){slots.set(e.slug,{slug:e.slug,since:e.time,profile:e.profile??null,phase:'계정 접근 대기'});slotWaits.set(e.slug,e);}
      if(['published','books_ready','draft_ready','person_deferred'].includes(e.event)){slots.delete(e.slug);slotWaits.delete(e.slug);}
      if(e.event==='finished'){slots.clear();slotWaits.clear();}
    }
    for(const [slug,slot] of slots)if(!active.has(slug))active.set(slug,slot);
    for(const [slug,wait] of slotWaits)if(!waits.has(slug))waits.set(slug,wait);
  }
  const latest=currentEvents.at(-1);
  const wait=[...waits.values()].sort((a,b)=>Date.parse(a.resume_at)-Date.parse(b.resume_at))[0];
  const hasActiveResponse=[...active.values()].some(p=>!['계정 접근 대기','사실 오류 재작성 대기'].includes(p.phase));
  const isRunning=processError?null:processes.length>0;
  const terminal=current?.events.findLast(e=>e.event==='finished');
  const finished=terminal?.completed===terminal?.total&&!terminal?.stopped&&done.size===selected?.count&&active.size===0;
  const state=isRunning===null?'unknown':!isRunning?(finished?'finished':'stopped'):waitBooks?'waiting_books':wait&&!hasActiveResponse?'waiting':'running';
  return {
    fetchedAt:new Date().toISOString(),databaseAt,databaseError,processError,stats:database,
    runner:{state,pids:processes.map(p=>p.ProcessId),lastEventAt:events.at(-1)?.time??null,lastError:currentEvents.findLast(e=>e.event==='error')?.message??null,waitUntil:state==='waiting'?wait?.resume_at??null:null,active:[...active.values()],bookChecks,bookPending,batchTotal:selected?.count??0,batchDone:done.size,queue:(selected?.people??[]).map(p=>({...p,status:done.has(p.slug)?(done.get(p.slug).event==='draft_ready'?'원고 수신 · 사실확인 대기':done.get(p.slug).event==='books_ready'?(bookPending[p.slug]?'책 자료 수신':'책장 보완 완료'):done.get(p.slug).insufficient?'미달':'저장 완료'):active.has(p.slug)?active.get(p.slug).phase:'차례 대기'}))},
    events:events.filter(e=>!['selected','local_cache_not_running','cache_origin_revalidated'].includes(e.event)).slice(-80).reverse().map(e=>({time:e.time,event:e.event,slug:e.slug??null,profile:e.profile??e.to??null,insufficient:e.insufficient??false,message:e.message??null,url:e.url??null,resume_at:e.resume_at??null}))
  };
}

const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const requestUrl=new URL(req.url,'http://127.0.0.1:'+PORT);
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  try{
    if(requestUrl.pathname==='/api/status'){
      res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(await status()));
    }else if(requestUrl.pathname==='/'||requestUrl.pathname==='/reading-way-progress.html'){
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await fs.readFile(path.join(directory,'reading-way-progress.html')));
    }else res.writeHead(404).end('Not found');
  }catch{res.writeHead(503,{'Content-Type':'application/json; charset=utf-8'}).end(JSON.stringify({error:'진행 정보를 읽지 못했습니다.'}));}
});
server.listen(PORT,'127.0.0.1',()=>console.log(JSON.stringify({url:'http://127.0.0.1:'+PORT,time:new Date().toISOString()})));
