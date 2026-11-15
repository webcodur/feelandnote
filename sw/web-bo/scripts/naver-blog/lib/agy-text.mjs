// AGM 계정 순환으로 AGY 텍스트 모델을 부른다. 한도가 찬 계정은 건너뛰고, 응답이 없으면 한 번 확인 후 멈춘다.
// 책 소개 생성(prepare-book-summaries)과 책 소개 간결체 전환(convert-blurbs-plain)이 같이 쓴다. 한 번에 한 프로세스만 계정을 바꾼다.
// 기본 모델은 Hydrogen이며 Pro 이상 계정에서만 열린다. Hydrogen 계정이 모두 한도에 걸리면 비상으로 무료 계정의 3.8 Flash를 쓴다(26.11.13 사용자 지시).
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {agyCall,AGY_TEXT_MODEL,AGY_FALLBACK_MODEL} from '../../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs';

const agm='C:/Users/webco/go/bin/agm.exe',agyBin=process.env.AGY_BIN??'C:/Users/webco/AppData/Local/agy/bin/agy.exe';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
// AGY_EXCLUDE_ACCOUNTS(쉼표 구분, sw/web-bo/.env): 사용자가 쓰지 말라고 한 계정은 순환에서 처음부터 뺀다.
const exhausted=new Set((process.env.AGY_EXCLUDE_ACCOUNTS??'').split(',').map(s=>s.trim()).filter(Boolean));let switchLock=Promise.resolve(),model=AGY_TEXT_MODEL,ensured=false;

// 상태를 바꾸지 않는 읽기 전용 웹 검색 MCP는 생성 배치에 노출돼도 된다(agy-antigravity 스킬 「전역 MCP」). 그 밖의 활성 MCP가 있으면 멈춘다.
const READ_ONLY_MCP=new Set(['wigolo','firecrawl']);
function mcpSafe(){const f=path.join(process.env.USERPROFILE,'.gemini/config/mcp_config.json');if(!fs.existsSync(f))return;const c=read(f);if(Object.entries(c.mcpServers??{}).some(([name,s])=>s.disabled!==true&&!READ_ONLY_MCP.has(name)))throw Object.assign(Error('Active global MCP requires a separate generation profile before running'),{globalStop:true});}
function accounts(){const t=execFileSync(agm,['list'],{encoding:'utf8',windowsHide:true});return t.split(/\r?\n/).flatMap(l=>{const m=l.match(/^\s*(\S+@\S+)\s+(.*?)\s+(\d+)%\s+(\d+)%\s+(\d+)%\s*$/);return m?[{email:m[1],cli:/\bcli\b/.test(m[2]),pro:Number(m[3]),flash:Number(m[4])}]:[];});}

// 계정별 기본 모델 사용 가능 여부. `agy models`로 확인하고 OS 임시 폴더에 하루 둔다(계정 정보는 저장소에 두지 않는다).
const capFile=path.join(os.tmpdir(),'feelandnote-agy-capable.json');
const capMap=()=>{try{const c=read(capFile);return c.model===AGY_TEXT_MODEL&&Date.now()-c.at<864e5?c.map:{};}catch{return {};}};
const saveCap=(email,ok)=>{const map={...capMap(),[email]:ok};fs.writeFileSync(capFile,JSON.stringify({model:AGY_TEXT_MODEL,at:Date.now(),map}));};
const activeCapable=email=>{const known=capMap()[email];if(known!==undefined)return known;const ok=execFileSync(agyBin,['models'],{encoding:'utf8',windowsHide:true,timeout:60000}).includes(AGY_TEXT_MODEL);saveCap(email,ok);return ok;};
const switchTo=email=>{execFileSync(agm,['switch',email,'--target','agy'],{encoding:'utf8',windowsHide:true,input:'y\n',timeout:30000});if(accounts().find(r=>r.cli)?.email!==email)throw Object.assign(Error('AGM CLI account switch not confirmed'),{globalStop:true});};

async function ensureAccount(failed){const task=switchLock.then(()=>{
 if(failed)exhausted.add(failed);const rows=accounts(),active=rows.find(r=>r.cli),usable=r=>r&&!exhausted.has(r.email);
 if(model===AGY_TEXT_MODEL){
  // agm 표의 GEM-PRO %는 gemini-4(Hydrogen) 한도를 반영하지 않는다(26.11.14 Ultra 0% 표시인데 호출 정상). 한도는 실제 호출 실패로만 판정한다.
  if(usable(active)&&activeCapable(active.email))return;
  const known=capMap(),order=rows.filter(r=>usable(r)&&known[r.email]!==false).sort((a,b)=>(known[b.email]===true)-(known[a.email]===true)||b.pro-a.pro);
  for(const r of order){if(r.email!==active?.email)switchTo(r.email);if(activeCapable(r.email))return;}
  // 품질을 Hydrogen에 맞춘 대량 작업은 AGY_NO_FALLBACK=1로 Flash 전환 대신 멈춘다.
  if(process.env.AGY_NO_FALLBACK==='1')throw Object.assign(Error('No Hydrogen quota; fallback disabled'),{globalStop:true});
  model=AGY_FALLBACK_MODEL;console.error(JSON.stringify({event:'agy_emergency_fallback',model,reason:'no Pro account with quota for '+AGY_TEXT_MODEL}));
 }
 const current=accounts().find(r=>r.cli);if(usable(current)&&current.flash>=40)return;
 const next=rows.filter(r=>usable(r)&&r.flash>=40).sort((a,b)=>b.flash-a.flash)[0];if(!next)throw Object.assign(Error('AGM model pool exhausted'),{globalStop:true});switchTo(next.email);
});switchLock=task.catch(()=>{});await task;}

export {AGY_TEXT_MODEL};
// 서버 과부하(503)는 1·2·3…분 쉬고 최대 5번 다시 부른다. 계정 전환으로 풀리는 문제가 아니다.
export async function agyText(prompt){if(!ensured){await ensureAccount(null);ensured=true;}let busy=0;for(let attempt=0;attempt<25;attempt++){mcpSafe();const active=accounts().find(r=>r.cli);if(!active)throw Object.assign(Error('No AGM CLI account'),{globalStop:true});try{return await agyCall(prompt,{model,timeoutMs:600000,privateLog:true,disableSlashCommands:true});}catch(e){if(e.quotaExhausted||/Individual quota reached|Eligibility check failed|not eligible for Antigravity|model.*not (found|available|supported)/i.test(String(e))){await ensureAccount(active.email);continue;}if(/No capacity available|UNAVAILABLE \(code 503\)|high traffic/i.test(String(e))&&busy<5){busy++;await new Promise(r=>setTimeout(r,60000*busy));continue;}if(/시간 초과|timeout/i.test(String(e))){try{const probe=await agyCall('Reply with exactly: OK',{model,timeoutMs:60000,privateLog:true,disableSlashCommands:true});if(probe.trim()!=='OK')throw Error('Probe did not return OK');}catch(probe){if(probe.quotaExhausted){await ensureAccount(active.email);continue;}throw Object.assign(Error('AGY unresponsive after one probe'),{globalStop:true});}}throw e;}}throw Object.assign(Error('No remaining account can serve this job'),{globalStop:true});}
export function agyJson(text){return JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}
