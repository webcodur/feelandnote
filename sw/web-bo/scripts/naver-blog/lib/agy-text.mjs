// AGM 계정 순환으로 AGY 텍스트 모델을 부른다. 한도가 찬 계정은 건너뛰고, 응답이 없으면 한 번 확인 후 멈춘다.
// 책 소개 생성(prepare-book-summaries)과 책 소개 간결체 전환(convert-blurbs-plain)이 같이 쓴다. 한 번에 한 프로세스만 계정을 바꾼다.
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {agyCall,AGY_TEXT_MODEL} from '../../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs';

const agm='C:/Users/webco/go/bin/agm.exe';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const exhausted=new Set();let switchLock=Promise.resolve();

// 상태를 바꾸지 않는 읽기 전용 웹 검색 MCP는 생성 배치에 노출돼도 된다(agy-antigravity 스킬 「전역 MCP」). 그 밖의 활성 MCP가 있으면 멈춘다.
const READ_ONLY_MCP=new Set(['wigolo','firecrawl']);
function mcpSafe(){const f=path.join(process.env.USERPROFILE,'.gemini/config/mcp_config.json');if(!fs.existsSync(f))return;const c=read(f);if(Object.entries(c.mcpServers??{}).some(([name,s])=>s.disabled!==true&&!READ_ONLY_MCP.has(name)))throw Object.assign(Error('Active global MCP requires a separate generation profile before running'),{globalStop:true});}
function accounts(){const t=execFileSync(agm,['list'],{encoding:'utf8',windowsHide:true});return t.split(/\r?\n/).flatMap(l=>{const m=l.match(/^\s*(\S+@\S+)\s+(.*?)\s+(\d+)%\s+(\d+)%\s+(\d+)%\s*$/);return m?[{email:m[1],cli:/\bcli\b/.test(m[2]),flash:Number(m[4])}]:[];});}
async function switchAccount(failed){const task=switchLock.then(()=>{exhausted.add(failed);const rows=accounts(),active=rows.find(r=>r.cli);if(active&&active.email!==failed&&!exhausted.has(active.email)&&active.flash>=40)return;const next=rows.filter(r=>!exhausted.has(r.email)&&r.flash>=40).sort((a,b)=>b.flash-a.flash)[0];if(!next)throw Object.assign(Error('AGM model pool exhausted'),{globalStop:true});execFileSync(agm,['switch',next.email,'--target','agy'],{encoding:'utf8',windowsHide:true,input:'y\n',timeout:30000});if(accounts().find(r=>r.cli)?.email!==next.email)throw Object.assign(Error('AGM CLI account switch not confirmed'),{globalStop:true});});switchLock=task.catch(()=>{});await task;}

export {AGY_TEXT_MODEL};
// 서버 과부하(503)는 1·2·3…분 쉬고 최대 5번 다시 부른다. 계정 전환으로 풀리는 문제가 아니다.
export async function agyText(prompt){let busy=0;for(let attempt=0;attempt<25;attempt++){mcpSafe();const active=accounts().find(r=>r.cli);if(!active)throw Object.assign(Error('No AGM CLI account'),{globalStop:true});try{return await agyCall(prompt,{model:AGY_TEXT_MODEL,timeoutMs:600000,privateLog:true,disableSlashCommands:true});}catch(e){if(e.quotaExhausted||/Individual quota reached|Eligibility check failed|not eligible for Antigravity/i.test(String(e))){await switchAccount(active.email);continue;}if(/No capacity available|UNAVAILABLE \(code 503\)|high traffic/i.test(String(e))&&busy<5){busy++;await new Promise(r=>setTimeout(r,60000*busy));continue;}if(/시간 초과|timeout/i.test(String(e))){try{const probe=await agyCall('Reply with exactly: OK',{model:AGY_TEXT_MODEL,timeoutMs:60000,privateLog:true,disableSlashCommands:true});if(probe.trim()!=='OK')throw Error('Probe did not return OK');}catch(probe){if(probe.quotaExhausted){await switchAccount(active.email);continue;}throw Object.assign(Error('AGY unresponsive after one probe'),{globalStop:true});}}throw e;}}throw Object.assign(Error('No remaining account can serve this job'),{globalStop:true});}
export function agyJson(text){return JSON.parse(text.trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}
