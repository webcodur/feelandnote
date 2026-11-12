import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createHash, randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {AsideClient} from '../../.agents/skills/aside-browser/scripts/aside-client.mjs';
import {removeVerifiedDownloadCopy} from '../../.agents/skills/aside-browser/scripts/download-cleanup.mjs';
import {CACHE_TAGS, itemRevalidationTags, revalidationApiPathForTags, isCompleteCacheRevalidationResponse} from '../../packages/shared/src/constants/cache-tags.ts';
import {stripMarkdownEmphasis} from './reading-way-text.mjs';
import {READING_WAY_KO_MAX_CHARS, READING_WAY_MAX_PARAGRAPHS, readingWayLengthExcess} from '../../packages/shared/src/constants/celeb-reading-way.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const rulebook=path.join(root,'docs/project/celeb/celeb-05-02-reading-way.md');
const exec=promisify(execFile);
const host='ubuntu@152.67.198.197';
const sshOptions=['-i',path.join(os.homedir(),'.ssh/feelandnote_oracle'),'-o','BatchMode=yes','-o','ConnectTimeout=12','-o','ServerAliveInterval=10','-o','ServerAliveCountMax=2'];
const psql='docker exec -i feelandnote-db psql -X -q -v ON_ERROR_STOP=1 -U postgres -d postgres -At';
const hash=x=>createHash('sha256').update(x).digest('hex');
const quote=x=>JSON.stringify(x);
const sql=x=>x==null?'NULL':"'"+String(x).replaceAll("'","''")+"'";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=(event,data={})=>console.log(JSON.stringify({time:new Date().toISOString(),event,...data}));
const normalize=s=>String(s??'').normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
const validSlug=s=>/^[a-z0-9][a-z0-9.'-]*$/.test(s);
const DEFAULT_BATCH_SIZE=20;
const ACCESS_RECHECK_MS=15*60*1000;
// 검색 도구 없이 답한 계정은 한동안 다시 배정하지 않는다. 한 인물은 이 횟수까지만 다른 계정으로 다시 받고, 넘으면 보류한다.
const RESEARCH_TOOLS_RECHECK_MS=60*60*1000,RESEARCH_RETRY_LIMIT=2;
const researchRetries=new Map();
// 생성 표시가 남아 있으면 관찰 정체는 실패가 아니다. 일정 간격으로 기존 요청 대기를 기록한다.
const GENERATION_STALL_MS=8*60*1000;
// 분량 상한을 넘은 원고는 같은 대화에서 이 횟수까지 줄여 달라고 다시 요청하고, 그래도 넘으면 저장하지 않고 미룬다.
const LENGTH_RETRY_LIMIT=2;
export function lengthNotice({chars,paragraphs}){
  return `한국어 본문이 ${chars}자·${paragraphs}문단으로 분량 상한을 넘습니다. 무엇을 남길지는 직접 골라 공백 포함 ${READING_WAY_KO_MAX_CHARS}자·${READING_WAY_MAX_PARAGRAPHS}문단 이하로 줄인 최종 한국어 JSON 코드 블록 하나로 주세요.`;
}

export function stallAction({pending,len,lastLen,lastAt,now,reloaded}){
  if(!pending)return 'none';
  if(len!==lastLen)return 'progress';
  if(now-lastAt<GENERATION_STALL_MS)return 'wait';
  return 'pending';
}
const blockedUntil=new Map();
const assignableProfiles=(pool,lanes,current,now=Date.now())=>pool.filter(p=>(blockedUntil.get(p.key)??0)<=now&&!lanes.some(other=>other!==current&&other.person&&other.phase!=='waiting'&&other.profile.key===p.key));
function pendingStartArgs(l,person){
  const request=l.pendingStart;
  return request?.slug===person.slug&&request.profile===l.profile.key?[request.resume,request.warning]:[undefined,false];
}
async function restartWaiting(l,assignProfile,start){
  const person=l.person;
  if(await assignProfile(l,person))await start(l,person,...pendingStartArgs(l,person));
}
const hasNewMessageReceipt=(before,after)=>after.matched&&after.count>before.count;
const hasPendingGeneration=(state,reply)=>state.tree.includes('대답 생성 중지')||reply.pendingSearch===true||reply.busy===true;
// 심층 모델 계열. 26.11.11부터 메뉴에 Carbon이 있으면(Ultra 계정) Carbon 높음, 없으면(Pro 계정) Argon 높음을 쓴다.
const DEEP_FAMILIES=['Carbon','Argon'];
let requiredDeepModel=null;
const familyOf=m=>m?.family??DEEP_FAMILIES.find(f=>String(m?.mode??'').startsWith(f));
const ARGON_HIGH_SELECTION='현재 Argon 높음 모드 사용 중';
const isDeepHigh=m=>DEEP_FAMILIES.some(f=>m?.mode===f+'High');
const deepMenuPattern=()=>new RegExp(`menuitem(?:radio)? "[^"\\n]*\\b(${requiredDeepModel??DEEP_FAMILIES.join('|')})\\b`);
function deepMenuLine(tree){const lines=tree.split('\n').filter(line=>deepMenuPattern().test(line));return lines.find(line=>/\bCarbon\b/.test(line))??lines[0];}
// These are the current picker settings, never proof of a past response's model.
export function observedMode(state){
  const tree=state?.tree??'';
  const lines=tree.split('\n'),pickers=lines.filter(x=>/\bbutton\s+"/.test(x)&&/현재.*모드 사용 중|mode picker.*currently/i.test(x));
  const current=pickers.length?pickers.join('\n'):lines.length===1&&!/\b(?:generic|heading|textbox)\s+"/.test(tree)?tree:'';
  const labels=[...current.matchAll(/현재\s+(?:Carbon|Argon|(?:(?:Gemini\s+)?[\d.]+\s+)?Flash)[^"\n]*?모드 사용 중|\bcurrently\s+(?:Carbon|Argon|Flash|(?:Gemini\s+)?[\d.]+\s+Flash)[^"\n]*/gi)].map(m=>m[0]);
  const label=[...new Set(labels)].join('; ');
  const families=new Set(labels.map(x=>/\bCarbon\b/i.test(x)?'Carbon':/\bArgon\b/i.test(x)?'Argon':'Flash'));
  if(families.size!==1)return {mode:'unknown',family:'unknown',version:null,label};
  const family=[...families][0];
  if(family==='Flash'){
    const version=label.match(/(\d+(?:\.\d+)*)\s+Flash/i)?.[1]??label.match(/Flash\s+(\d+(?:\.\d+)*)/i)?.[1]??null;
    return {mode:'Flash',family,version,variant:/Flash[\s-]*Lite/i.test(label)?'Lite':null,label};
  }
  // An unselected Low/High menu option must not override the current setting.
  const selected=lines.filter(x=>/\bmenuitem(?:radio)?\b/.test(x)&&((/사고 수준|thinking level/i.test(x)&&/높음|낮음|\bHigh\b|\bLow\b/i.test(x))||/\[checked\]|\[selected\]|선택됨|aria-checked="true"/i.test(x))).join('; ');
  const levels=label+'; '+selected,high=/높음|\bHigh\b/i.test(levels),low=/낮음|\bLow\b/i.test(levels);
  return {mode:high&&!low?family+'High':low&&!high?family+'Low':'unknown',family,version:null,label:label+(selected?'; '+selected:'')};
}
const isDeepModel=state=>{const family=observedMode(state).family;return requiredDeepModel?family===requiredDeepModel:DEEP_FAMILIES.includes(family);};
function activeGoogleAccount(state){
  const links=(state.tree??'').split('\n').filter(line=>/^\s*- link "Google 계정:/.test(line));
  if(links.length!==1)return null;
  const identity=links[0].match(/link "Google 계정:\s*(.*?)\(([^()\s]+@[^()\s]+)\)"/);
  return identity?{name:identity[1].trim(),email:identity[2],line:links[0]}:null;
}
const accountMenuOpen=state=>state.tree.includes('dialog "계정 및 설정"');
function isProAccount(state,menuVisible=accountMenuOpen(state)){
  const account=activeGoogleAccount(state);if(!account)return false;
  // Ultra는 Pro의 상위 요금제라 Argon을 쓸 수 있다(26.11.09 webcodur.tk001 계정에서 확인).
  if(!menuVisible)return /: "[^"\n]*\b(?:Pro|Ultra)\b[^"\n]*"/.test(account.line);
  const expected=['Pro','Ultra'].map(plan=>`${account.name} ${account.email} AI ${plan} 계정 계정 목록 접기`);
  return accountMenuOpen(state)&&[...state.tree.matchAll(/^\s*- button "([^"\n]+)"[^\n]*$/gm)]
    .some(match=>!match[0].includes('[disabled]')&&expected.includes(match[1].replace(/\s+/g,' ').trim()));
}

export function assertCollectionMode(evidence){
  const generation=evidence?.generationModeObservations??[];
  // 같은 심층 계열(Carbon 또는 지난 Argon)의 높음만 인정한다.
  const family=familyOf(evidence?.preSendMode)??familyOf(evidence?.collectionStartMode),sameFamily=x=>!familyOf(x)||familyOf(x)===family;
  const generationHigh=generation.length>0&&generation.every(x=>isDeepHigh(x.mode)&&sameFamily(x.mode));
  const collection=[evidence?.collectionStartMode,evidence?.collectionMode];
  const allHigh=collection.every(x=>isDeepHigh(x)&&sameFamily(x));
  const levelHiddenAfterGeneration=isDeepHigh(evidence?.preSendMode)&&generationHigh&&collection.every(x=>isDeepHigh(x)&&sameFamily(x)||x?.mode==='unknown'&&x?.family===family);
  if(!DEEP_FAMILIES.includes(family)||(!allHigh&&!levelHiddenAfterGeneration)||evidence?.preSendMode&&!isDeepHigh(evidence.preSendMode)||generation.some(x=>!isDeepHigh(x.mode)||!sameFamily(x.mode))){
    const error=new Error('Deep model High selection is not sufficiently observed; original retained, no automatic retry');
    error.code='MODEL_VERIFICATION_PENDING';error.modelObservation=evidence;throw error;
  }
}

function modelObservation(l,state,startMode=observedMode(state)){
  return {preSendMode:l.preSendMode??null,preSendObservedAt:l.preSendObservedAt??null,generationModeObservations:l.generationModeObservations??[],collectionStartMode:startMode,collectionMode:observedMode(state),collectionObservedAt:new Date().toISOString(),actualModel:'unknown',responseModelEvidence:null};
}

function checkCollectionMode(l,evidence,details={}){
  try{assertCollectionMode(evidence);}
  catch(error){
    Object.assign(error,details);l.retainTab=true;
    log('model_verification_pending',{slug:l.person.slug,profile:l.profile.key,input:l.input,...details,...evidence});throw error;
  }
}
const isRetryableResponseError=state=>state.tree.includes('오류가 발생했습니다.')&&state.tree.includes('button "다시 시도"')&&!state.tree.includes('대답 생성 중지');
const isProviderRefusal=state=>(state.tree.includes('would go against my guidelines')||/저는 언어 모델일 뿐이라 (?:그것을 이해하지 못해서|그것에 필요한 정보나 능력이 없어서) 도와드릴 수가 없습니다/.test(state.tree))&&!state.tree.includes('button "코드 다운로드"')&&!state.tree.includes('textbox "Canvas 편집기"');
const explicitProviderRefusals=new Set([
  '저는 언어 모델입니다. 그것은 제가 할 수 있는 범위를 넘어서는 것이라 할 수 없어요.',
  '저는 텍스트 기반 AI입니다. 그것은 저의 능력을 벗어나는 것이에요.',
  '그것을 도와드릴 수는 없습니다. 저는 언어 모델일 뿐이에요.',
  '저는 언어 모델이라서 그것은 도와드릴 수가 없습니다.',
  '저는 언어 모델일 뿐이라 그것을 이해하지 못해서 도와드릴 수가 없습니다.',
  '저는 언어 모델일 뿐이라 그것에 필요한 정보나 능력이 없어서 도와드릴 수가 없습니다.'
]);
function isCurrentProviderRefusal(reply){
  if(!reply.afterPrompt||!reply.matched||reply.hasCode)return false;
  const text=String(reply.text??'').replace(/^\s*Gemini의 응답\s*|\s*Gemini의 응답\s*$/g,'').replace(/\s+/g,' ').trim();
  return explicitProviderRefusals.has(text);
}

function accessReason(state){
  const text=state.tree;
  if(/google\.com\/sorry\/|비정상적인 트래픽|unusual traffic/i.test(text))return 'network_verification';
  if(/accounts\.google\.com\/[^\n]*challenge\/recaptcha|(?:region|checkbox) "(?:reCAPTCHA|로봇이 아닙니다|보안문자 입력)/.test(text))return 'human_verification';
  if(/Pro 구독 기간이 종료|subscription.*expired/i.test(text))return 'subscription_ended';
  if(text.split('\n').some(line=>deepMenuPattern().test(line)&&line.includes('[disabled]')&&/한도|limit|reset/i.test(line)))return 'usage_limit';
  if(/한도에 도달|사용 한도를 모두|한도는[^\n]{0,40}초기화됩니다|usage limit reached|reached.*(?:usage|message).*limit/i.test(text))return 'usage_limit';
  if(/accounts\.google\.com\/(?:v\d+\/)?signin|비밀번호 입력|Email or phone/.test(text))return 'login_required';
  return 'access_unconfirmed';
}

function resetTimeFromNotice(tree,now=Date.now()){
  const match=tree.match(/(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)\s*(\d{1,2}):(\d{2})/);
  const today=new Date(now+9*60*60*1000);
  let at;
  if(match){
    const hour=Number(match[4])%12+(match[3]==='오후'?12:0);
    at=Date.UTC(today.getUTCFullYear(),Number(match[1])-1,Number(match[2]),hour-9,Number(match[5]));
  }else{
    const clock=tree.match(/한도는\s*(\d{1,2}):(\d{2})\s*(오전|오후)에 초기화됩니다/);
    if(clock){const hour=Number(clock[1])%12+(clock[3]==='오후'?12:0);at=Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate(),hour-9,Number(clock[2]));}
  }
  return at>now&&at<now+8*86400000?at:null;
}

function accessError(state,message='Carbon unavailable'){
  const e=new Error(message);e.code='ARGON_UNAVAILABLE';
  e.reason=accessReason(state);
  if(['network_verification','human_verification'].includes(e.reason)){
    e.code='GOOGLE_VERIFICATION_REQUIRED';e.message='Google verification required; automatic account retries stopped';
  }
  const resetAt=resetTimeFromNotice(state.tree);if(resetAt)e.resetAt=resetAt;
  return e;
}

function args(argv){
  const out={apply:false,continuous:false,bookResearch:false,booksOnly:false,collectOnly:false,shorten:false,limit:DEFAULT_BATCH_SIZE,account:'u0',pool:[],only:[],retry:[],resume:{},feedback:{},warnPronouns:false,summary:false,revalidateOnly:false,selfTest:false};
  for(let i=0;i<argv.length;i++){
    const a=argv[i];
    if(a==='--apply')out.apply=true;
    else if(a==='--continuous')out.continuous=true;
    else if(a==='--book-research')out.bookResearch=true;
    else if(a==='--books-only'){out.bookResearch=true;out.booksOnly=true;}
    else if(a==='--collect-only')out.collectOnly=true;
    else if(a==='--shorten'){out.shorten=true;out.collectOnly=true;}
    else if(a==='--warn-pronouns')out.warnPronouns=true;
    else if(a==='--summary')out.summary=true;
    else if(a==='--revalidate-only')out.revalidateOnly=true;
    else if(a==='--self-test')out.selfTest=true;
    else if(a==='--limit')out.limit=Number(argv[++i]);
    else if(a==='--account')out.account=argv[++i];
    else if(a==='--pool')out.pool=argv[++i].split(',').map(value=>{if(!/^u\d+:\d+$/.test(value))throw Error('Invalid Pro pool');const [account,authuser]=value.split(':');return {account,authuser:Number(authuser),key:value};});
    else if(a==='--only')out.only=argv[++i].split(',');
    else if(a==='--feedback'){
      const value=argv[++i],at=value.indexOf('='),slug=value.substring(0,at),filename=value.substring(at+1);
      if(!validSlug(slug)||!path.isAbsolute(filename))throw Error('Invalid factual feedback file');
      out.feedback[slug]=filename;
    }
    else if(a==='--retry-insufficient')out.retry=argv[++i].split(',');
    else if(a==='--resume'){
      const value=argv[++i],at=value.indexOf('=');
      const slug=value.substring(0,at),url=value.substring(at+1);
      if(!validSlug(slug)||!/^https:\/\/gemini\.google\.com(?:\/u\/\d+)?\/app\/[a-f0-9]+(?:\?hl=ko)?$/.test(url))throw Error('Invalid resume conversation');
      out.resume[slug]=url;
    }
    else if(a==='--help'){console.log('node scripts/browser/reading-way-argon.mjs [--apply | --summary | --revalidate-only] [--continuous] [--book-research | --books-only --only slug,slug | --collect-only | --shorten] [--limit 20] [--pool u0:0,u0:1] [--only slug,slug] [--retry-insufficient slug,slug] [--resume slug=https://gemini.google.com/app/ID]');process.exit(0);}
    else throw Error('Unknown argument: '+a);
  }
  if(!Number.isInteger(out.limit)||out.limit<1||out.limit>100)throw Error('Invalid limit');
  if(out.bookResearch&&!out.booksOnly)throw Error('Book research belongs to postprocessing; use --books-only separately');
  if(![...out.only,...out.retry].every(validSlug))throw Error('Invalid slug');
  if(out.revalidateOnly&&!out.only.length)throw Error('--revalidate-only requires --only');
  if(out.booksOnly&&(!out.only.length||out.continuous))throw Error('--books-only requires --only and cannot use --continuous');
  if(out.shorten&&(out.bookResearch||out.booksOnly))throw Error('--shorten cannot use book research');
  if(out.collectOnly&&(out.booksOnly||out.continuous))throw Error('--collect-only cannot use --books-only or --continuous');
  if(!/^u\d+$/.test(out.account))throw Error('Invalid Aside account');
  if(!out.pool.length)out.pool=[{account:out.account,authuser:0,key:out.account+':0'}];
  return out;
}

function parseOriginal(raw){
  const text=raw.replace(/^\uFEFF/,'').trim().replace(/^```(?:json)?\s*/,'');
  if(!text.startsWith('{'))throw Error('Output is not a JSON object');
  let depth=0,inside=false,escape=false,end=-1;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(inside){if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')inside=false;}
    else if(c==='"')inside=true;
    else if(c==='{')depth++;
    else if(c==='}'&&--depth===0){end=i+1;break;}
  }
  if(end<0||!/^\s*(?:```)?(?:\[cite:\s*\d+(?:,\s*\d+)*\])*\s*$/.test(text.substring(end)))throw Error('Unexpected output wrapper');
  return JSON.parse(text.substring(0,end));
}

function validate(p,person,{koreanOnly=false}={}){
  if(p.slug!==person.slug)throw Error('Wrong output person');
  if(typeof p.ko!=='string'||(!koreanOnly&&typeof p.en!=='string'))throw Error('Missing KO/EN strings');
  const bodies=koreanOnly?[p.ko]:[p.ko,p.en];
  if(bodies.some(text=>text.includes('\uFFFD')||text.includes('\0')))throw Error('Invalid encoding');
  if(!koreanOnly&&(p.ko==='')!==(p.en===''))throw Error('Inconsistent insufficient result');
  if(bodies.some(text=>text!==''&&!text.trim()))throw Error('Whitespace-only body');
  const reasons=JSON.stringify(p.unresolved??[]);
  // 빈 본문의 도구 부재 사유는 조사 미달이 아니다. 본문이 있어도 실행 환경 전체의 도구가 꺼졌다고 밝혔으면
  // Argon이 원문 없이 쓴 원고다(26.10.29 u0:3: 유누스·겔싱어는 기억으로 쓴 원고, 배리모어는 빈 원고).
  if((p.ko===''&&TOOLS_UNAVAILABLE.test(reasons))||ENVIRONMENT_TOOLS_OFF.test(reasons)){
    const error=new Error('Research tools unavailable; not a research-insufficient result');error.code='RESEARCH_UNAVAILABLE';throw error;
  }
}
const TOOLS_UNAVAILABLE=/(?:외부 웹페이지 열람 및 추가 검색 도구를 호출할 수 없어|(?:웹|검색|브라우징|열람)[^。\n]{0,45}도구[^。\n]{0,35}(?:(?:사용|호출)할 수 없|호출이 제한되어|사용이 제한되어|비활성)|(?:cannot|unable to|can't)[^。\n]{0,50}(?:browse|access (?:the )?(?:web|internet)|use (?:web |search |browsing )?tools)|tools? (?:are|is) (?:disabled|unavailable))/i;
const ENVIRONMENT_TOOLS_OFF=/(?:(?:열람|접근|확인)[^。\n]{0,15}수 없는 환경|본문이 (?:포함|첨부)되어 있지 않|(?:웹|검색|조회)[^。\n]{0,30}(?:환경|열람)이 제한|(?:현재|이) (?:실행 )?(?:환경|세션)[^。\n]{0,40}(?:도구|열람|검색)[^。\n]{0,40}(?:비활성|호출할 수 없|사용할 수 없|제한)|도구[^。\n]{0,20}(?:비활성화|호출 한도 0)|(?:in this|current) (?:environment|session)[^。\n]{0,60}(?:cannot|unable to|can't|no access))/i;

function validateBookResearch(p,{koreanOnly=false}={}){
  if(!Array.isArray(p.books)||!Array.isArray(p.unresolved))throw Error('Missing book research arrays');
  const url=value=>{try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}};
  for(const b of p.books){
    if(!['title_ko','title_en','author_ko','author_en','evidence','review_ko',...(koreanOnly?[]:['review_en'])].every(k=>typeof b[k]==='string'&&b[k].trim()))throw Error('Incomplete book research');
    if(!url(b.source_url)||!Array.isArray(b.source_urls)||!b.source_urls.every(url))throw Error('Invalid book evidence URLs');
  }
}

function validateResponse(p,person,booksOnly=false){
  if(!booksOnly)return validate(p,person,{koreanOnly:true});
  if('ko' in p||'en' in p)throw Error('Book supplement must not contain reading-way bodies');
  validate({...p,ko:'',en:''},person);
  validateBookResearch(p,{koreanOnly:true});
}

export function readingWayTranslationPrompt(p,person={}){
  if(!validSlug(p.slug))throw Error('Invalid translation person');
  validate(p,{slug:p.slug},{koreanOnly:true});
  if(!p.ko)throw Error('Empty Korean body needs no translation');
  const contract={slug:p.slug,source_sha256:hash(p.ko),en:'영어 번역문'};
  return `아래 한국어 본문을 같은 뜻의 자연스러운 영어로 번역해주세요. 설명 없이 지정한 JSON 하나로 주세요.\n인물 영문명: ${person.name_en??p.slug}\n출력 형식: ${JSON.stringify(contract)}\n\n${p.ko}`;
}

export function combineReadingWayTranslation(p,translation){
  if(!validSlug(p.slug)||translation.slug!==p.slug)throw Error('Translation person mismatch');
  if(translation.source_sha256!==hash(p.ko))throw Error('Translation Korean source mismatch');
  if('ko' in translation&&translation.ko!==p.ko)throw Error('Translation changed Korean source');
  const combined={...p,en:translation.en};
  validate(combined,{slug:p.slug});
  return combined;
}

function verifiedReviewOriginal(raw,person,expectedHash){
  if(hash(raw)!==expectedHash)throw Error('Review original hash mismatch');
  const p=parseOriginal(raw);
  validate(p,person,{koreanOnly:true});
  if(!p.ko||'en' in p)throw Error('Review requires a nonempty Korean-only original');
  return raw;
}

async function command(bin,argv){
  const retryable=bin==='scp'||(bin==='ssh'&&argv.at(-1).startsWith('rm -f -- /tmp/feelandnote-reading-'));
  for(let attempt=0;;attempt++){
    try{return (await exec(bin,argv,{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024,timeout:45000})).stdout;}
    catch(e){
      if(retryable&&attempt<2){await sleep(1500*(attempt+1));continue;}
      throw Error(`${path.basename(bin)} failed (${e.code??e.signal??'unknown'}): ${String(e.stderr??'').substring(0,600)}`);
    }
  }
}

// SQL travels as a UTF-8 file; no PowerShell text pipe or source prose in logs.
async function database(query,work){
  const token=randomUUID().replaceAll('-','');
  const local=path.join(work,token+'.sql'),remote='/tmp/feelandnote-reading-'+token+'.sql';
  await fs.writeFile(local,query+'\n',{encoding:'utf8',flag:'wx'});
  await command('scp',[...sshOptions,local,host+':'+remote]);
  const result=await command('ssh',[...sshOptions,host,psql+' < '+remote]);
  await command('ssh',[...sshOptions,host,'rm -f -- '+remote]);
  return {text:result,local};
}

async function targets(options,work){
  const eligible=(options.booksOnly?` OR c.slug IN (${options.only.map(sql).join(',')})`:'')+(options.retry.length?` OR (c.reading_way='' AND c.reading_way_en='' AND c.slug IN (${options.retry.map(sql).join(',')}))`:'')+(Object.keys(options.feedback).length?` OR c.slug IN (${Object.keys(options.feedback).map(sql).join(',')})`:'');
  const only=options.only.length?`AND c.slug IN (${[...new Set([...options.only,...options.retry])].map(sql).join(',')})`:'';
  const q=`SELECT COALESCE(json_agg(r),'[]'::json) FROM (SELECT c.id,c.slug,c.nickname AS name,c.nickname_en AS name_en,c.aliases,c.gender,c.birth_date,c.death_date,c.profession,c.reading_way AS ko,c.reading_way_en AS en,c.view_count,COALESCE(i.total_score,0) AS influence,ARRAY(SELECT DISTINCT cc.source_url FROM public.celeb_contents cc JOIN public.contents b ON b.id=cc.content_id WHERE cc.celeb_id=c.id AND b.type='BOOK' AND cc.source_url IS NOT NULL AND cc.source_url<>'' ORDER BY cc.source_url LIMIT 4) AS sources FROM public.celebs c LEFT JOIN public.celeb_influence i ON i.celeb_id=c.id WHERE c.celeb_reality IN ('REAL','BOTH') AND c.slug IS NOT NULL AND ${options.shorten?`coalesce(c.reading_way,'')<>'' AND (length(c.reading_way)>${READING_WAY_KO_MAX_CHARS} OR (SELECT count(*) FROM regexp_split_to_table(c.reading_way,E'\\n+') part WHERE btrim(part)<>'')>${READING_WAY_MAX_PARAGRAPHS})`:`(c.reading_way IS NULL${eligible})`} ${only}) r;`;
  return JSON.parse((await database(q,work)).text.trim());
}

async function civicArticles(){
  const links=new Map();
  for(const address of ['https://www.civicnews.com/news/articleList.html?sc_sub_section_code=S2N65&view_type=sm']){
    const u=new URL(address);
    const r=await fetch(u,{signal:AbortSignal.timeout(30000)});
    if(!r.ok)throw Error('Civic index HTTP '+r.status);
    const s=await r.text();
    for(const m of s.matchAll(/<div class="list-titles">\s*<a href="([^"]+)"[^>]*>\s*<strong>([\s\S]*?)<\/strong>/g)){
      const url=new URL(m[1].replaceAll('&amp;','&'),u).href;
      const title=m[2].replace(/<[^>]*>/g,'').replaceAll('&amp;','&');
      links.set(url,{url,title});
    }
  }
  if(links.size<20)throw Error('Civic series index was not returned');
  // The site's page=2 currently drops its subsection filter. Read only the
  // title metadata of the series' previously identified older article URLs.
  for(const id of [24274,24310,24410,24444,24838]){
    const url='https://www.civicnews.com/news/articleView.html?idxno='+id;
    const r=await fetch(url,{signal:AbortSignal.timeout(30000)});
    if(!r.ok)throw Error('Civic title HTTP '+r.status);
    const html=await r.text();
    const title=html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)?.[1]??html.match(/<title>([\s\S]*?)<\/title>/)?.[1];
    if(!title||!title.includes('책과 사람'))throw Error('Unexpected Civic article title');
    links.set(url,{url,title});
  }
  return [...links.values()];
}

function matchingArticle(person,articles){
  const names=[person.name,...(person.aliases??[])].map(normalize).filter(n=>n.length>1);
  const exact=articles.filter(a=>names.some(n=>normalize(a.title).includes(n)));
  return exact.map(a=>a.url);
}

async function blogRanks(){
  const dir='D:/feelandnote/blog-assets/naver-blog';
  const posts=JSON.parse(await fs.readFile(path.join(dir,'posts.json'),'utf8'));
  const drafts=JSON.parse(await fs.readFile(path.join(dir,'celeb-drafts.json'),'utf8'));
  const byLog=new Map(drafts.filter(d=>d.logNo).map(d=>[String(d.logNo),d]));
  const ranks=new Map();
  for(const p of posts){
    if(p.kind!=='celeb'||['deleted','private','replaced','skip'].includes(p.link))continue;
    const d=byLog.get(String(p.logNo));
    const value=p.slug||d?.slug||p.target||d?.target||'';
    const slug=value.includes('/')?value.match(/\/celeb\/([^/?#]+)/)?.[1]:value;
    if(!slug)continue;
    const scheduled=p.scheduledAt||d?.scheduledAt;
    const m=String(scheduled??'').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D+(\d{1,2}):(\d{2})/);
    const date=m?Date.parse(`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}T${m[4].padStart(2,'0')}:${m[5]}:00+09:00`):null;
    const rank=date&&date>Date.now()?2:0;
    ranks.set(slug,Math.min(ranks.get(slug)??Infinity,rank));
  }
  return ranks;
}

function candidateRank(p,options,ranks){
  return options.feedback[p.slug]||options.retry.includes(p.slug)?-1:ranks.get(p.slug)===0?0:ranks.get(p.slug)===2?1:p.view_count>0?2:p.influence>0?3:4;
}

function compareCandidates(a,b,options,ranks){
  return candidateRank(a,options,ranks)-candidateRank(b,options,ranks)||b.view_count-a.view_count||b.influence-a.influence||a.slug.localeCompare(b.slug);
}

async function save(person,p,work,modelObservation){
  assertCollectionMode(modelObservation);
  if(typeof p.en!=='string'){
    const error=new Error('A separately reviewed web-chat translation is required before saving');error.code='TRANSLATION_REQUIRED';throw error;
  }
  p.ko=stripMarkdownEmphasis(p.ko);p.en=stripMarkdownEmphasis(p.en);
  validate(p,person);
  const q=`BEGIN;SET LOCAL statement_timeout='15s';
DO $guard$ DECLARE b jsonb;a jsonb;n integer;BEGIN
SELECT to_jsonb(c) INTO STRICT b FROM public.celebs c WHERE id=${sql(person.id)}::uuid AND slug=${sql(person.slug)} AND celeb_reality IN ('REAL','BOTH') AND reading_way IS NOT DISTINCT FROM ${sql(person.ko)} AND reading_way_en IS NOT DISTINCT FROM ${sql(person.en)} FOR UPDATE;
UPDATE public.celebs SET reading_way=${sql(p.ko)},reading_way_en=${sql(p.en)} WHERE id=${sql(person.id)}::uuid;
GET DIAGNOSTICS n=ROW_COUNT;IF n<>1 THEN RAISE EXCEPTION 'Wrong count';END IF;
SELECT to_jsonb(c) INTO STRICT a FROM public.celebs c WHERE id=${sql(person.id)}::uuid;
IF (b-ARRAY['reading_way','reading_way_en','updated_at']) IS DISTINCT FROM (a-ARRAY['reading_way','reading_way_en','updated_at']) THEN RAISE EXCEPTION 'Unrelated field change';END IF;
END $guard$;COMMIT;
SELECT json_build_object('slug',slug,'ko',reading_way,'en',reading_way_en) FROM public.celebs WHERE id=${sql(person.id)}::uuid;`;
  let result;
  for(let attempt=0;attempt<3;attempt++){
    try{result=JSON.parse((await database(q,work)).text.trim());break;}
    catch(error){
      // A lost SSH response may follow a successful COMMIT. Compare the
      // exact original before deciding whether another guarded write is needed.
      const current=JSON.parse((await database(`SELECT json_build_object('slug',slug,'ko',reading_way,'en',reading_way_en) FROM public.celebs WHERE id=${sql(person.id)}::uuid;`,work)).text.trim());
      if(current.slug===p.slug&&current.ko===p.ko&&current.en===p.en){result=current;break;}
      if(current.ko!==person.ko||current.en!==person.en||attempt===2)throw error;
      log('retry_guarded_save',{slug:person.slug,attempt:attempt+1});await sleep(1500);
    }
  }
  if(result.slug!==p.slug||result.ko!==p.ko||result.en!==p.en)throw Error('DB readback differs');
}

function localServerAbsent(origin,error){
  return ['localhost','127.0.0.1'].includes(new URL(origin).hostname)&&error.cause?.code==='ECONNREFUSED';
}

async function revalidate(person){
  const tags=itemRevalidationTags([{domain:CACHE_TAGS.CELEBS,id:person.id},{domain:CACHE_TAGS.CELEBS,id:person.slug}]);
  return revalidateTags(tags,person.slug);
}

// 한 주소가 실패해도 나머지 주소는 끝까지 갱신하고, 실패는 모아서 마지막에 던진다.
// 응답 없는 로컬 서버(Timeout)가 운영 갱신까지 막던 문제(26.11.10) 때문이다.
export async function revalidateTags(tags,slug){
  const failures=[];
  for(const origin of [...new Set(['http://localhost:3000',new URL(process.env.NEXT_PUBLIC_WEB_URL).origin])]){
    if(!['localhost','127.0.0.1','feelandnote.com'].includes(new URL(origin).hostname))throw Error('Unexpected cache origin');
    let r;
    try{r=await fetch(origin+revalidationApiPathForTags(tags),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag:tags,secret:process.env.CRON_SECRET}),signal:AbortSignal.timeout(30000)});}
    catch(error){
      if(localServerAbsent(origin,error)){log('local_cache_not_running',{slug,origin});continue;}
      failures.push('Cache request failed: '+origin+' ('+(error.cause?.code??error.name)+')');continue;
    }
    const value=await r.json().catch(()=>null);
    if(!r.ok||!isCompleteCacheRevalidationResponse(value,tags)){failures.push('Cache revalidation incomplete: '+origin);continue;}
    log('cache_origin_revalidated',{slug,origin});
  }
  if(failures.length)throw Error(failures.join('; '));
}

// 룰북의 `<!-- argon -->`~`<!-- /argon -->` 구간만 Argon에 보낸다. 26.10.30까지는 세 문서를 통째로 붙여
// 한 사람 요청이 약 2만 7천 자였고, 그 절반 넘게가 러너 옵션·계정 운영·실행자의 검색 도구 요령이었다.
export function argonSections(text,name='document'){
  const parts=[...text.matchAll(/^<!-- argon -->\r?\n([\s\S]*?)^<!-- \/argon -->/gm)].map(m=>m[1].trim());
  if(!parts.length)throw Error(`No Argon sections in ${name}`);
  if(parts.some(p=>p.includes('<!-- argon -->')))throw Error(`Nested Argon marker in ${name}`);
  return parts.join('\n\n');
}
async function argonText(file){return argonSections(await fs.readFile(file,'utf8'),path.basename(file));}

const textOf=r=>r.content?.filter(x=>x.type==='text').map(x=>x.text).join('\n')??'';
async function repl(l,script){return textOf(await l.client.callRepl(script,'Argon reading-way automation'));}
async function snap(l){
  const state=JSON.parse(await repl(l,'console.log(JSON.stringify(await snapshot(readingPage,{interactive:true})));'));
  if(accessReason(state)==='subscription_ended')throw accessError(state,'Google AI Pro subscription ended; no request sent');
  if(['network_verification','human_verification'].includes(accessReason(state))){
    const error=accessError(state);log('access_blocked',{slug:l.person?.slug,profile:l.profile?.key,reason:error.reason,message:error.message});throw error;
  }
  return state;
}
function ref(s,role,name){
  const lines=s.tree.split('\n').filter(x=>(x.includes(role+' "')||role==='menuitem'&&x.includes('menuitemradio "'))&&name.test(x)&&!x.includes('[disabled]'));
  if(lines.length!==1)throw Error('Expected one observed '+role+' '+name+', got '+lines.length);
  return lines[0].match(/\[ref=([^\]]+)\]/)[1];
}
async function click(l,r){await repl(l,`await readingPage.locator(${quote(r)}).click();console.log('clicked');`);}

async function accountMenuVisible(l,state){
  if(!accountMenuOpen(state))return false;
  // Aside's AX tree can retain the account iframe after it becomes hidden.
  return JSON.parse(await repl(l,`console.log(JSON.stringify(await readingPage.evaluate(()=>{const f=document.querySelector('iframe[name="account"]');if(!f)return false;const s=getComputedStyle(f),r=f.getBoundingClientRect();return s.visibility==='visible'&&s.display!=='none'&&r.width>0&&r.height>0;})));`));
}

export async function verifyProAccount(l,state,{readState=snap,clickRef=click,pause=sleep,menuVisible=accountMenuVisible}={}){
  let visible=await menuVisible(l,state);
  if(isProAccount(state,visible)&&!visible)return {state,verified:true};
  const sidebar=state.tree.match(/[^\n]*button "사이드바 열기"[^\n]*\[ref=([^\]]+)\]/);
  if(sidebar)await clickRef(l,sidebar[1]);
  for(let attempt=0;attempt<8;attempt++){
    state=await readState(l);visible=await menuVisible(l,state);
    if(isProAccount(state,visible)&&!visible)return {state,verified:true};
    if(attempt<7)await pause(600);
  }
  const account=activeGoogleAccount(state);if(!account)return {state,verified:false};
  const url=state.tree.match(/\[url=([^\]]+)\]/)?.[1];
  let verified=false;
  try{
    if(!await menuVisible(l,state))await clickRef(l,ref(state,'link',/link "Google 계정:/));
    for(let attempt=0;attempt<8;attempt++){
      state=await readState(l);if(await menuVisible(l,state)){
        verified=isProAccount(state,true)&&activeGoogleAccount(state)?.email===account.email;break;
      }
      if(attempt<7)await pause(600);
    }
  }finally{
    state=await readState(l);
    if(await menuVisible(l,state)){
      // The account panel may also contain a separate recovery-tip close button.
      const close=state.tree.match(/dialog "계정 및 설정":[^\n]*\n[ \t]*- button "닫기"[^\n]*\[ref=([^\]]+)\]/)?.[1];
      if(!close)throw Error('Account menu close control not observed; request not sent');
      await clickRef(l,close);
      for(let attempt=0;attempt<8;attempt++){
        state=await readState(l);if(!await menuVisible(l,state))break;
        if(attempt<7)await pause(600);
      }
    }
    if(await menuVisible(l,state))throw Error('Account menu did not close; request not sent');
  }
  if(activeGoogleAccount(state)?.email!==account.email||state.tree.match(/\[url=([^\]]+)\]/)?.[1]!==url)
    throw Error('Account or chat changed during subscription check; request not sent');
  return {state,verified};
}

async function sendConfirmed(l,text,slug){
  const prefix=text.slice(0,80);
  const state=()=>repl(l,`console.log(JSON.stringify(await readingPage.evaluate(()=>{const q=Array.from(document.querySelectorAll('user-query'));return {count:q.length,matched:(q.at(-1)?.innerText??'').includes(${quote(prefix)})};})));`).then(JSON.parse);
  const before=await state();
  await repl(l,'await readingPage.locator(\'button[aria-label="메시지 보내기"]\').click();console.log("send clicked");');
  for(let attempt=0;attempt<16;attempt++){
    await sleep(750);const after=await state();
    if(hasNewMessageReceipt(before,after)){
      await sleep(1500);
      if(!hasNewMessageReceipt(before,await state()))continue;
      l.confirmedPromptPrefix=prefix;
      const sendingState=await snap(l);
      if(sendingState.tree.includes('대답 생성 중지')){
        const observation={observedAt:new Date().toISOString(),mode:observedMode(sendingState)};
        (l.generationModeObservations??=[]).push(observation);
        log('generation_mode_observed',{slug,profile:l.profile.key,...observation,actualModel:'unknown'});
      }
      log('message_confirmed',{slug,profile:l.profile.key,preSendMode:l.preSendMode,preSendObservedAt:l.preSendObservedAt,actualModel:'unknown'});return;
    }
  }
  const error=new Error('Sent user message was not confirmed; previous response will not be collected');error.code='SEND_NOT_CONFIRMED';throw error;
}

export async function ensureDeepHigh(l){
  let state;
  for(let attempt=0;attempt<12;attempt++){
    state=await snap(l);if(isDeepModel(state))break;
    if(attempt<11)await sleep(800);
  }
  if(!isDeepModel(state))throw accessError(state,'Carbon is not selected');
  if(accessReason(state)==='usage_limit')throw accessError(state,'Carbon High usage limit reached; no request sent');
  // A closed picker can still show High while its Argon menu item is quota-disabled.
  if(!deepMenuLine(state.tree)){
    await click(l,ref(state,'button',/모드 선택 도구 열기/));
    state=await snap(l);
  }
  const argonItem=deepMenuLine(state.tree);
  if(!argonItem||argonItem.includes('[disabled]'))throw accessError(state,'Carbon is not available in the mode menu; no request sent');
  if(accessReason(state)==='usage_limit')throw accessError(state,'Carbon High usage limit reached; no request sent');
  if(!isDeepHigh(observedMode(state))){
    await click(l,ref(state,'menuitem',/menuitem(?:radio)? "사고 수준"/));
    state=await snap(l);
    if(accessReason(state)==='usage_limit')throw accessError(state,'Carbon High usage limit reached; no request sent');
    // A level that is already checked cannot be clicked again; confirm it from the open submenu and close the menu.
    const checked=observedMode(state);
    if(isDeepHigh(checked)&&isDeepModel(state)){
      await repl(l,`await readingPage.keyboard.press('Escape');await sleep(200);await readingPage.keyboard.press('Escape');console.log('closed');`);
      await sleep(500);
      state=await snap(l);
      l.thinkingVerified=true;
      l.preSendMode=checked;l.preSendObservedAt=new Date().toISOString();l.generationModeObservations=[];
      log('thinking_confirmed',{slug:l.person?.slug,profile:l.profile?.key,level:'high',preSendMode:l.preSendMode,preSendObservedAt:l.preSendObservedAt,actualModel:'unknown'});
      return state;
    }
    const highRef=ref(state,'menuitem',/menuitem(?:radio)? "높음 매우 철저함"/);
    try{await click(l,highRef);}
    catch(error){
      // The menu can close before Aside's post-click check runs. Reopen it and read the selected level itself.
      if(!/Checkbox click did not change checked state/.test(String(error)))throw error;
      await sleep(800);
      state=await snap(l);
      if(!/menuitem(?:radio)? "사고 수준"/.test(state.tree)){await click(l,ref(state,'button',/모드 선택 도구 열기/));state=await snap(l);}
      await click(l,ref(state,'menuitem',/menuitem(?:radio)? "사고 수준"/));
      await sleep(500);
      const selected=await repl(l,`console.log(JSON.stringify(await readingPage.evaluate(()=>[...document.querySelectorAll('[role=menuitemradio]')].filter(e=>e.getAttribute('aria-checked')==='true').map(e=>e.innerText.replace(/\\s+/g,' ').trim()))));`);
      const checkedLevels=JSON.parse(selected);
      await repl(l,`await readingPage.keyboard.press('Escape');await sleep(200);await readingPage.keyboard.press('Escape');console.log('closed');`);
      if(!checkedLevels.some(x=>x.startsWith('높음')))throw error;
      const family=observedMode(state).family,confirmed={mode:family+'High',family,version:null,label:observedMode(state).label+'; '+checkedLevels.join(', ')};
      await sleep(500);
      state=await snap(l);
      l.thinkingVerified=true;
      l.preSendMode=confirmed;l.preSendObservedAt=new Date().toISOString();l.generationModeObservations=[];
      log('thinking_confirmed',{slug:l.person?.slug,profile:l.profile?.key,level:'high',preSendMode:l.preSendMode,preSendObservedAt:l.preSendObservedAt,actualModel:'unknown'});
      return state;
    }
    for(let attempt=0;attempt<8;attempt++){
      state=await snap(l);if(isDeepHigh(observedMode(state)))break;
      await sleep(500);
    }
  }else{
    await click(l,ref(state,'button',/모드 선택 도구 열기/));
    state=await snap(l);
  }
  if(accessReason(state)==='usage_limit')throw accessError(state,'Carbon High usage limit reached; no request sent');
  if(!isDeepHigh(observedMode(state))||!isDeepModel(state))throw Error('Deep model High thinking was not confirmed; request not sent');
  l.thinkingVerified=true;
  l.preSendMode=observedMode(state);l.preSendObservedAt=new Date().toISOString();l.generationModeObservations=[];
  log('thinking_confirmed',{slug:l.person?.slug,profile:l.profile?.key,level:'high',preSendMode:l.preSendMode,preSendObservedAt:l.preSendObservedAt,actualModel:'unknown'});
  return state;
}

async function submit(l,person,articles,rules,resume,warnPronouns=false){
  if(l.reviewOriginal&&(l.bookResearch||l.shorten||resume))throw Error('Whole-text review requires a fresh Korean writing conversation');
  if(l.bookResearch&&!l.booksOnly)throw Error('Book research belongs to postprocessing, not the Korean writing request');
  if(l.owned)await repl(l,'await closeTab(readingPage);console.log("own previous tab closed");');
  l.preSendMode=null;l.preSendObservedAt=null;l.retainTab=false;l.downloadRetries=0;
  if(resume){
    const tabs=JSON.parse(await repl(l,'console.log(JSON.stringify(await listBrowserTabs()));'));
    const own=tabs.find(t=>t.url===resume);
    await repl(l,own?`var readingPage=await attachBrowserTab(${quote(own.targetId)});console.log('resumed own tab');`:`var readingPage=await openTab(${quote(resume)});console.log('resumed own conversation');`);
    l.owned=true;l.person=person;l.started=Date.now();l.phase='generating';l.lengthRetries=0;l.noticePending=warnPronouns||!!person.revisionFile&&!person.retryInsufficient;l.incompleteResponse=false;l.confirmedPromptPrefix=null;l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;
    // A resumed page can expose its old code block before its mode picker loads.
    // Confirm the mode for pending feedback before collect can read that block.
    if(l.noticePending)await ensureDeepHigh(l);
    log('resumed',{slug:person.slug,url:resume,lane:l.index,profile:l.profile.key,preSendMode:l.preSendMode,preSendObservedAt:l.preSendObservedAt,actualModel:'unknown'});return;
  }
  // Factual feedback is already included in the new conversation attachment.
  l.noticePending=false;
  const app=l.profile.authuser===0?'https://gemini.google.com/app?hl=ko':`https://gemini.google.com/u/${l.profile.authuser}/app?hl=ko`;
  await repl(l,`var readingPage=await openTab(${quote(app)});console.log('opened');`);l.owned=true;
  let s,modelSelectionAttempted=false;
  for(let i=0;i<8;i++){
    // Argon이 이미 골라져 있어도 메뉴를 한 번 열어 Carbon(Ultra)이 있으면 옮긴다.
    s=await snap(l);if(isDeepModel(s)&&(observedMode(s).family==='Carbon'||modelSelectionAttempted))break;
    if(s.tree.includes('dialog "Gemini Feature Information"')&&s.tree.includes('콘텐츠 앱 없이 사용')){
      await click(l,ref(s,'button',/탐색 카드 확인하고 닫기/));
      continue;
    }
    if(i<2&&s.tree.includes('ERR_CONNECTION_CLOSED'))await click(l,ref(s,'button',/새로고침/));
    if(!modelSelectionAttempted&&s.tree.includes('모드 선택 도구 열기')){
      modelSelectionAttempted=true;
      await click(l,ref(s,'button',/모드 선택 도구 열기/));
      let argon,argonChecked=false;
      for(let attempt=0;attempt<6;attempt++){
        s=await snap(l);
        const line=deepMenuLine(s.tree);
        if(line?.includes('[disabled]'))throw accessError(s);
        argon=line?.match(/\[ref=([^\]]+)\]/)?.[1];
        argonChecked=!!line?.includes('[checked]');
        if(argon)break;
        await sleep(600);
      }
      if(!argon)throw accessError(s);
      // An already checked Argon item cannot be clicked again; close the menu and re-read the picker.
      if(argonChecked)await repl(l,`await readingPage.keyboard.press('Escape');console.log('closed');`);
      else {
        try{await click(l,argon);}
        catch(error){
          // Aside can lose the checked item when Gemini closes the picker on selection.
          if(!/Checkbox click did not change checked state/.test(String(error)))throw error;
          for(let attempt=0;attempt<4;attempt++){
            s=await snap(l);
            if(isDeepModel(s))break;
            await sleep(500);
          }
          if(!isDeepModel(s))throw error;
        }
      }
    }
    await sleep(800);
  }
  // A collapsed sidebar can omit Pro. Verify the active account's badge or
  // its own AI Pro account menu, then close the menu before checking the chat.
  if(!isDeepModel(s))throw accessError(s,'Ultra Carbon is not selected');
  const subscription=await verifyProAccount(l,s);s=subscription.state;
  if(!isDeepModel(s)||!subscription.verified)throw accessError(s,'Ultra Carbon is not selected');
  s=await ensureDeepHigh(l);
  // A fresh conversation has no response headings or prior user messages.
  if(s.tree.includes('heading "Gemini의 응답"')||s.tree.includes('말씀하신 내용'))throw Error('Not a fresh conversation');
  const civic=matchingArticle(person,articles);
  const links=[...new Set([...civic,...person.sources.filter(u=>/^https?:\/\//.test(u))])].slice(0,l.bookResearch?8:5);
  let originalSources='';
  if(!l.shorten)for(const source of person.sourceFiles??[]){
    if(!path.isAbsolute(source.file)||!links.includes(source.url))throw Error('Source document must match an attached reference URL');
    originalSources+='\n참조 원문: '+source.url+'\n'+await fs.readFile(source.file,'utf8')+'\n';
  }
  rules=await argonText(rulebook);
  const identity={slug:person.slug,name:person.name,name_en:person.name_en,gender:person.gender===true?'남성':person.gender===false?'여성':'미상',birth_date:person.birth_date,death_date:person.death_date,profession:person.profession};
  const bookRequest=l.bookResearch?`\n${person.bookScope?`이번 책장 보완 대상은 ${JSON.stringify(person.bookScope)}입니다.`:"이번 독서 방식 조사에서 실제 감상 관계를 확인한 책을 함께 전달해주세요."} 이 책들의 관계 근거를 직접 조사하고 아래 조사·감상경위 규칙에 따라 책별 감상배경도 완성해주세요. 독서 방식 본문이 조사 미달이어도 확인한 책 자료는 별도로 전달하고, 본문에 이 책들을 모두 등장시킬 필요는 없습니다. 확인한 자료를 그대로 나열하지 말고 룰북에 따라 글을 구성해주세요.\n${await argonText(path.join(root,'docs/project/celeb/celeb-02-01-content-research.md'))}\n${await argonText(path.join(root,'docs/project/celeb/celeb-02-03-content-review.md'))}\nbooks 배열에 {title_ko,title_en,author_ko,author_en,source_url,source_urls,evidence,review_ko}을 담아주세요. evidence는 관계를 확인할 조사 내용이며 본문이 아닙니다. source_urls는 추가 근거 URL 배열입니다. 관계를 확인하지 못한 책은 {title_en,unresolved_reason}으로 unresolved 배열에 담고 감상배경을 만들지 마세요.`:'';
  const contract=l.booksOnly?`{"slug":${quote(person.slug)},"books":[],"unresolved":[]}`:`{"slug":${quote(person.slug)},"ko":"완성 한국어 본문"}`;
  const hasRetryClues=person.retryInsufficient&&person.ko===''&&person.en==='';
  const revision=(l.bookResearch||hasRetryClues)&&person.revisionFile?'\n\n'+await fs.readFile(person.revisionFile,'utf8'):'';
  let reviewOriginal='';
  if(l.reviewOriginal){
    if(!path.isAbsolute(l.reviewOriginal.output))throw Error('Review original must use an absolute path');
    reviewOriginal='\n\n검수할 한국어 원고:\n'+verifiedReviewOriginal(await fs.readFile(l.reviewOriginal.output,'utf8'),person,l.reviewOriginal.sha256);
  }
  const task=l.reviewOriginal?'글 전체를 다시 검수하고 필요한 수정을 반영한 최종 한국어 JSON을 주세요.':l.booksOnly?'이번 작업은 기존 독서 방식 본문을 수정하지 않는 책장 보완입니다. 지정한 책의 원출처를 직접 읽고 관계 근거와 한국어 감상배경만 완성해주세요.':'위 링크를 직접 읽고 필요한 추가 조사도 직접 해서 이 인물의 한국어 독서 방식 글을 완성해주세요.';
  // 분량 축약은 새 조사 없이 저장된 본문만 다시 고르게 한다. 남길 장면은 Argon이 정한다.
  const shortenPacket=l.shorten?`인물: ${JSON.stringify(identity)}\n\n${rules}\n\n현재 저장된 한국어 독서 방식 본문입니다.\n${person.ko}\n\n새 조사 없이 이 본문에서 남길 장면을 골라 공백 포함 ${READING_WAY_KO_MAX_CHARS}자·${READING_WAY_MAX_PARAGRAPHS}문단 이하로 줄여주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요.\n응답은 JSON 코드 블록 하나로 주세요: ${contract}.`:null;
  const packet=shortenPacket??`인물: ${JSON.stringify(identity)}\n참조 링크: ${JSON.stringify(links)}\n${originalSources}\n${rules}${bookRequest}${revision}${reviewOriginal}\n\n${task}${l.booksOnly?'':`\n한국어 본문은 공백 포함 ${READING_WAY_KO_MAX_CHARS}자·${READING_WAY_MAX_PARAGRAPHS}문단 이하로 작성해주세요.`}\n응답은 JSON 코드 블록 하나로 주세요: ${contract}.${l.booksOnly?' ko와 en 필드는 만들지 마세요.':' 조사 결과 본문을 쓸 수 없으면 ko를 빈 문자열로 주세요.'}`;
  // Aside can replace an idle REPL session during a quota wait.
  l.dir=JSON.parse(await repl(l,'console.log(JSON.stringify(pwd));'));
  l.input=path.join(l.dir,person.slug+'-'+Date.now()+'.txt');
  await fs.writeFile(l.input,packet,{encoding:'utf8',flag:'wx'});
  await click(l,ref(s,'button',/업로드 및 도구/));
  let menuReady=false;
  for(let attempt=0;attempt<8&&!menuReady;attempt++){
    s=await snap(l);menuReady=s.tree.includes('menuitem "파일 업로드.');
    if(!menuReady&&attempt===3)await click(l,ref(s,'button',/업로드 및 도구/));
    if(!menuReady)await sleep(700);
  }
  if(!menuReady)throw Error('Document upload menu did not open');
  await repl(l,`await readingPage.locator('input[type="file"][accept^=".txt"]').first().setInputFiles(${quote(l.input)});console.log('attached');`);
  s=await snap(l);
  const inputRef=ref(s,'textbox',/Gemini 프롬프트 입력/);
  const instruction=l.reviewOriginal?'첨부한 원고의 글 전체를 다시 검수하고 필요한 수정을 반영한 최종 한국어 JSON을 주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요.':l.shorten?'첨부한 룰북과 현재 본문으로 분량 상한에 맞게 줄인 독서 방식 원고를 완성해주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 지정한 JSON 코드 블록 하나로 주세요.':l.booksOnly?'첨부한 요청과 룰북, 참조 링크로 책장 보완 대상만 직접 조사하고 한국어 감상배경을 완성해주세요. 독서 방식 본문은 작성하지 마세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 지정한 JSON 코드 블록 하나로 주세요.':'첨부한 룰북과 참조 링크로 직접 조사하고 독서 방식 원고를 완성해주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 지정한 JSON 코드 블록 하나로 주세요.';
  await repl(l,`await readingPage.locator(${quote(inputRef)}).fill(${quote(instruction)});await readingPage.locator(${quote(inputRef)}).press('Space');console.log('prepared');`);
  let present=false;
  for(let attempt=0;attempt<10&&!present;attempt++){
    present=JSON.parse(await repl(l,`console.log(JSON.stringify(await readingPage.evaluate(()=>document.body.innerText.includes(${quote(path.basename(l.input,'.txt'))}))));`));
    if(!present)await sleep(1000);
  }
  if(!present)throw Error('Current input attachment missing');
  await ensureDeepHigh(l);
  // This send selector and document file input were inspected in the Argon pilot.
  await sendConfirmed(l,instruction,person.slug);
  l.person=person;l.started=Date.now();l.phase='generating';l.inputHash=hash(packet);l.responseRetries=0;l.lengthRetries=0;l.incompleteResponse=false;l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;
  log('submitted',{slug:person.slug,civic:civic.length,links:links.length,lane:l.index,profile:l.profile.key,preSendMode:l.preSendMode,preSendObservedAt:l.preSendObservedAt,actualModel:'unknown'});
}

async function collect(l){
  if(!l.lastFocus||Date.now()-l.lastFocus>30000){
    await repl(l,'await readingPage.bringToFront();console.log("own response tab activated");');l.lastFocus=Date.now();
  }
  let s=await snap(l);
  const currentUrl=JSON.parse(await repl(l,'console.log(JSON.stringify(await readingPage.evaluate(()=>location.href)));'));
  if(currentUrl!==l.conversationUrl&&/\/app\/[a-f0-9]+/.test(currentUrl)){
    l.conversationUrl=currentUrl;log('conversation_located',{slug:l.person.slug,url:currentUrl,profile:l.profile.key});
  }
  // A request can be searching before Gemini assigns a permanent chat URL.
  // Keep the confirmed request alive; Page.url() may also lag history updates.
  if(new URL(currentUrl).origin!=='https://gemini.google.com')throw accessError(s,'Request tab navigated away from Gemini');
  const currentReply=JSON.parse(await repl(l,`console.log(JSON.stringify(await readingPage.evaluate(()=>{const q=Array.from(document.querySelectorAll('user-query')).at(-1),r=Array.from(document.querySelectorAll('model-response')).at(-1);return {afterPrompt:!!q&&!!r&&!!(q.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING),matched:!${quote(l.confirmedPromptPrefix??'')}||(q?.innerText??'').includes(${quote(l.confirmedPromptPrefix??'')}),busy:!!r?.querySelector('[aria-busy="true"]'),hasCode:!!r?.querySelector('pre'),hasCodeDownload:!!r?.querySelector('button[aria-label="코드 다운로드"]:not([aria-disabled="true"]):not([disabled])'),text:r?.innerText??'',pendingSearch:(r?.innerText??'').replace(/\\s/g,'')==='웹검색중Gemini의응답',len:(r?.innerText??'').length};})));`));
  // A completed refusal can retain aria-busy and omit reply actions. Inspect
  // only the reply to this prompt; older JSON controls must not hide it.
  if(isCurrentProviderRefusal(currentReply)){
    log('provider_refusal',{slug:l.person.slug,profile:l.profile.key,url:currentUrl,text:currentReply.text,...modelObservation(l,s)});
    const error=new Error('Provider declined this request; not a research-insufficient result');error.code='PROVIDER_REFUSAL';error.url=currentUrl;throw error;
  }
  // A finished response can retain aria-busy. Only bypass that stale flag
  // after the current reply has complete JSON and a stable download target.
  let stableBusyDownload=false;
  if(currentReply.busy&&currentReply.afterPrompt&&currentReply.matched&&currentReply.hasCode&&currentReply.hasCodeDownload&&!currentReply.pendingSearch&&!s.tree.includes('대답 생성 중지')){
    const candidate=JSON.parse(await repl(l,"console.log(JSON.stringify(await readingPage.locator('model-response').last().locator('pre').last().innerText()));"));
    let complete=false;try{parseOriginal(candidate);complete=true;}catch{}
    if(complete){
      await sleep(750);
      const stableState=await snap(l);
      const stable=JSON.parse(await repl(l,`console.log(JSON.stringify(await readingPage.evaluate(()=>{const q=Array.from(document.querySelectorAll('user-query')).at(-1),r=Array.from(document.querySelectorAll('model-response')).at(-1);return {stableBusyDownload:true,afterPrompt:!!q&&!!r&&!!(q.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING),matched:!${quote(l.confirmedPromptPrefix??'')}||(q?.innerText??'').includes(${quote(l.confirmedPromptPrefix??'')}),hasCodeDownload:!!r?.querySelector('button[aria-label="코드 다운로드"]:not([aria-disabled="true"]):not([disabled])'),body:Array.from(r?.querySelectorAll('pre')??[]).at(-1)?.innerText??null};})));`));
      if(!stableState.tree.includes('대답 생성 중지')&&stable.afterPrompt&&stable.matched&&stable.hasCodeDownload&&stable.body===candidate){stableBusyDownload=true;s=stableState;}
    }
  }
  const pending=hasPendingGeneration(s,currentReply)&&!stableBusyDownload;
  if(pending&&currentReply.afterPrompt&&currentReply.matched){
    const mode=observedMode(s),previous=l.generationModeObservations?.at(-1);
    if(!previous||previous.mode.mode!==mode.mode||previous.mode.label!==mode.label){
      const observation={observedAt:new Date().toISOString(),mode};
      (l.generationModeObservations??=[]).push(observation);
      log('generation_mode_observed',{slug:l.person.slug,profile:l.profile.key,url:currentUrl,...observation,actualModel:'unknown'});
    }
  }
  const stall=stallAction({pending,len:currentReply.len,lastLen:l.progressLen,lastAt:l.progressAt??l.started,now:Date.now(),reloaded:l.stallReloaded});
  if(stall==='progress'){l.progressLen=currentReply.len;l.progressAt=Date.now();}
  else if(stall==='pending'){
    l.progressAt=Date.now();
    log('generation_still_pending',{slug:l.person.slug,url:currentUrl,profile:l.profile.key});
  }
  if(!stableBusyDownload&&Date.now()-l.started>25*60*1000){
    if(pending){l.started=Date.now();log('generation_still_running',{slug:l.person.slug,url:currentUrl});}
    else if(l.incompleteResponse){const error=new Error('Response JSON remained incomplete; conversation retained');error.code='INCOMPLETE_RESPONSE';error.url=currentUrl;throw error;}
    else throw accessError(s,'Response finished without a downloadable result');
  }
  const response=s.tree.lastIndexOf('heading "Gemini의 응답"');
  if(pending||response<0||response<s.tree.lastIndexOf('말씀하신 내용'))return null;
  const collectionStartMode=observedMode(s),highAtCollection=isDeepHigh(collectionStartMode);
  if(l.noticePending&&!highAtCollection){
    await ensureDeepHigh(l);
    return null;
  }
  if(!highAtCollection&&(isRetryableResponseError(s)||isProviderRefusal(s)||!currentReply.hasCode&&!s.tree.includes('textbox "Canvas 편집기"'))){
    checkCollectionMode(l,modelObservation(l,s,collectionStartMode),{url:currentUrl});
  }
  if(highAtCollection&&isRetryableResponseError(s)){
    if((l.responseRetries??0)>=2)throw accessError(s,'Repeated Carbon response error');
    s=await ensureDeepHigh(l);
    await click(l,ref(s,'button',/button "다시 시도"/));
    l.responseRetries=(l.responseRetries??0)+1;l.started=Date.now();l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;
    log('retry_response',{slug:l.person.slug,profile:l.profile.key,attempt:l.responseRetries,preSendMode:l.preSendMode,preSendObservedAt:l.preSendObservedAt,actualModel:'unknown'});return null;
  }
  if(l.noticePending&&highAtCollection){
    s=await ensureDeepHigh(l);
    // Gemini renders pasted line breaks as separate paragraphs. Aside's fill
    // then rejects the doubled innerText breaks before the message is sent.
    const notice=(l.person.revisionFile?await fs.readFile(l.person.revisionFile,'utf8'):'글 전체를 다시 검수하고 필요한 수정을 반영한 최종 한국어 JSON을 주세요.').replace(/\r\n?|\n/g,' ').trim();
    const input=ref(s,'textbox',/Gemini 프롬프트 입력/);
    await repl(l,`await readingPage.locator(${quote(input)}).fill(${quote(notice)});await readingPage.locator(${quote(input)}).press('Space');console.log('pronoun notice prepared');`);
    await sendConfirmed(l,notice,l.person.slug);
    l.noticePending=false;l.started=Date.now();l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;log('review_request_sent',{slug:l.person.slug});return null;
  }
  if(isProviderRefusal(s)){
    const error=new Error('Provider declined this request; not a research-insufficient result');error.code='PROVIDER_REFUSAL';error.url=currentUrl;throw error;
  }
  const lines=s.tree.split('\n');
  if(!currentReply.afterPrompt||!currentReply.matched)return null;
  const code=lines.filter(x=>x.includes('generic "{')&&x.includes('[ref=')).at(-1);
  const canvas=lines.find(x=>x.includes('textbox "Canvas 편집기"'));
  let sourceRef,downloadRef,codeDownload=false;
  if(canvas&&!currentReply.hasCode&&(!code||s.tree.indexOf(canvas)>s.tree.lastIndexOf(code))){
    sourceRef=canvas.match(/\[ref=([^\]]+)\]/)[1];
    l.uiOriginal=await repl(l,`console.log(JSON.stringify(await readingPage.locator(${quote(sourceRef)}).innerText()));`);
    await click(l,ref(s,'button',/내보내기/));
    downloadRef=ref(await snap(l),'menuitem',/\.(?:txt|md)/);
  }else if(currentReply.hasCode&&currentReply.hasCodeDownload){
    // A completed busy response can expose its active download in DOM while
    // AX omits the code and button. Use the verified current-response control.
    codeDownload=true;
    l.uiOriginal=await repl(l,"console.log(JSON.stringify(await readingPage.locator('model-response').last().locator('pre').last().innerText()));");
  }else return null;
  const body=JSON.parse(l.uiOriginal);
  // The stop button can disappear briefly while the JSON block is still streaming.
  // Wait for a complete object before downloading; do not defer a live response.
  try{parseOriginal(body);}
  catch(error){
    if(!l.incompleteResponse)log('response_incomplete',{slug:l.person.slug,url:currentUrl,message:error.message});
    l.incompleteResponse=true;return null;
  }
  l.incompleteResponse=false;
  l.dir=JSON.parse(await repl(l,'console.log(JSON.stringify(pwd));'));
  const output=path.join(l.dir,l.person.slug+'-argon-'+Date.now()+'.json');
  await repl(l,'await readingPage.bringToFront();console.log("focused own download");');
  const downloadTarget=codeDownload? "readingPage.locator('model-response').last().locator('button[aria-label=\"코드 다운로드\"]').last()" : `readingPage.locator(${quote(downloadRef)})`;
  let defaultDownloadPath;
  try{
    defaultDownloadPath=JSON.parse(await repl(l,`var ownDownloadPromise=readingPage.waitForEvent('download');await ${downloadTarget}.click();var ownDownload=await ownDownloadPromise;var ownDownloadPath=await ownDownload.path();await ownDownload.saveAs(${quote(output)});console.log(JSON.stringify(ownDownloadPath));`));
  }catch(error){
    if(/ENOENT[^\n]*copyfile/.test(error.message)&&(l.downloadRetries??0)<2){
      l.downloadRetries=(l.downloadRetries??0)+1;
      log('download_retry',{slug:l.person.slug,url:currentUrl,attempt:l.downloadRetries,message:error.message});
      return null;
    }
    throw error;
  }
  const raw=await fs.readFile(output,'utf8');
  if(raw.replace(/\s+/g,' ').trim()!==body.replace(/\s+/g,' ').trim()){
    log('download_mismatch',{slug:l.person.slug,download_path:defaultDownloadPath});l.badDownloads??=[];l.badDownloads.push(output);return null;
  }
  l.downloadRetries=0;
  await removeVerifiedDownloadCopy(defaultDownloadPath,output);
  const observation=modelObservation(l,await snap(l),collectionStartMode);
  log('model_observed_at_collection',{slug:l.person.slug,profile:l.profile.key,url:currentUrl,output,sha256:hash(raw),...observation});
  checkCollectionMode(l,observation,{url:currentUrl,output,sha256:hash(raw)});
  const p=parseOriginal(raw);
  try{validateResponse(p,l.person,l.booksOnly);if(l.bookResearch)validateBookResearch(p,{koreanOnly:l.booksOnly});}
  catch(error){if(error.code==='RESEARCH_UNAVAILABLE'){l.badDownloads??=[];l.badDownloads.push(output);}throw error;}
  if(!l.booksOnly&&p.ko===''&&p.en===undefined)p.en='';
  if(l.shorten&&!p.ko.trim())throw Error('Shortened body is empty');
  const excess=l.booksOnly?null:readingWayLengthExcess(p.ko);
  if(excess){
    // 상한을 넘은 원고는 저장하지 않는다. 같은 대화에서 줄여 달라고 하고, 횟수를 넘기면 마지막 원고를 남긴 채 미룬다.
    if((l.lengthRetries??0)>=LENGTH_RETRY_LIMIT){const error=new Error(`Body exceeds length cap after retries (${excess.chars} chars, ${excess.paragraphs} paragraphs)`);error.code='LENGTH_EXCEEDED';error.url=currentUrl;throw error;}
    l.badDownloads??=[];l.badDownloads.push(output);
    s=await ensureDeepHigh(l);
    const notice=lengthNotice(excess),input=ref(s,'textbox',/Gemini 프롬프트 입력/);
    await repl(l,`await readingPage.locator(${quote(input)}).fill(${quote(notice)});await readingPage.locator(${quote(input)}).press('Space');console.log('length notice prepared');`);
    await sendConfirmed(l,notice,l.person.slug);
    l.lengthRetries=(l.lengthRetries??0)+1;l.started=Date.now();l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;
    log('length_notice_sent',{slug:l.person.slug,chars:excess.chars,paragraphs:excess.paragraphs,attempt:l.lengthRetries});return null;
  }
  return {p,output,sha256:hash(raw),url:currentUrl,modelObservation:observation};
}

async function cleanupFiles(files){
  const owned=[...new Set(files)].filter(Boolean);
  for(const f of owned){
    const absolute=path.resolve(f);
    const allowed=[path.join(os.tmpdir(),'feelandnote'),path.join(os.homedir(),'.aside')];
    if(!allowed.some(dir=>{const rel=path.relative(dir,absolute);return rel&&!rel.startsWith('..')&&!path.isAbsolute(rel);}))throw Error('Cleanup escaped task roots');
    const stat=await fs.lstat(absolute);if(!stat.isFile()||stat.isSymbolicLink())throw Error('Cleanup expects owned regular file');
  }
  // Native PowerShell deletion, literal paths only. No recursive deletion.
  if(owned.length){
    const encoded=Buffer.from(owned.map(f=>`Remove-Item -LiteralPath '${path.resolve(f).replaceAll("'","''")}' -ErrorAction Stop`).join('\n'),'utf16le').toString('base64');
    await command('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',encoded]);
  }
}

async function cleanupWork(work,retained=false){
  if(retained)return;
  await cleanupFiles((await fs.readdir(work)).map(f=>path.join(work,f)));
}

async function selfTest(){
  const {strict:assert}=await import('node:assert');
  // 메뉴 표기는 26.11.11 Ultra 계정 실측이다. Carbon이 있으면 Carbon을, 없으면 Argon을 고른다.
  assert.equal(observedMode({tree:'현재 Carbon 높음 모드 사용 중'}).mode,'CarbonHigh');
  assert.equal(isDeepModel({tree:'button "Open mode picker, currently Carbon"'}),true);
  assert.match(deepMenuLine('menuitemradio "Code & analysis 4 Argon" [ref=a]\nmenuitemradio "Most complex work 4 Carbon" [ref=c]'),/Carbon/);
  assert.match(deepMenuLine('menuitemradio "Code & analysis 4 Argon" [ref=a]'),/Argon/);
  assert.doesNotThrow(()=>assertCollectionMode({preSendMode:{mode:'CarbonHigh',family:'Carbon'},generationModeObservations:[{mode:{mode:'CarbonHigh',family:'Carbon'}}],collectionStartMode:{mode:'CarbonHigh',family:'Carbon'},collectionMode:{mode:'CarbonHigh',family:'Carbon'}}));
  assert.throws(()=>assertCollectionMode({preSendMode:{mode:'CarbonHigh',family:'Carbon'},generationModeObservations:[{mode:{mode:'ArgonHigh',family:'Argon'}}],collectionStartMode:{mode:'CarbonHigh',family:'Carbon'},collectionMode:{mode:'CarbonHigh',family:'Carbon'}}),{code:'MODEL_VERIFICATION_PENDING'});
  // Older response controls remain in AX while the latest code is streaming.
  function mockCodeDownloadLane(hasCode,hasCodeDownload,pendingSearch=false,busy=false,body='{"slug":"download-fixture","ko":"x","en":"y"}',stableBody=body,replyText='',matched=true){
    const calls=[],url='https://gemini.google.com/app/abc123';
    const state={tree:'- button "모드 선택 도구 열기, 현재 Argon 높음 모드 사용 중" [ref=mode]\n- heading "Gemini의 응답" [ref=response]\n- button "코드 다운로드" [ref=previous-download]'};
    const client={callRepl:async script=>{
      calls.push(script);let value;
      if(script.includes('snapshot(readingPage'))value=JSON.stringify(state);
      else if(script.includes('location.href'))value=JSON.stringify(url);
      else if(script.includes('stableBusyDownload'))value=JSON.stringify({afterPrompt:true,matched:true,hasCodeDownload,body:stableBody});
      else if(script.includes('compareDocumentPosition'))value=JSON.stringify({afterPrompt:true,matched,hasCode,hasCodeDownload,pendingSearch,busy,text:replyText,len:100});
      else if(script.includes("locator('pre')"))value=JSON.stringify(body);
      else if(script==='console.log(JSON.stringify(pwd));')value=JSON.stringify('/current-download-fixture');
      else if(script.includes('ownDownloadPromise'))throw Error('TEST_DOWNLOAD_BOUNDARY');
      else if(script.includes('bringToFront'))value='focused';
      else throw Error('Unexpected mocked browser call');
      return {content:[{type:'text',text:value}]};
    }};
    return {calls,state,lane:{client,dir:'/unused-download-fixture',person:{slug:'download-fixture'},profile:{key:'u0:0'},conversationUrl:url,lastFocus:Date.now(),started:Date.now()}};
  }
  for(const [code,button]of [[false,false],[true,false],[false,true]]){
    const fixture=mockCodeDownloadLane(code,button);
    assert.equal(await collect(fixture.lane),null);
    assert.equal(fixture.calls.some(s=>s.includes('ownDownloadPromise')),false,'older response download must remain untouched');
  }
  const readyDownload=mockCodeDownloadLane(true,true);
  await assert.rejects(collect(readyDownload.lane),/TEST_DOWNLOAD_BOUNDARY/);
  const unloadedFeedback=mockCodeDownloadLane(true,true);
  unloadedFeedback.state.tree='- heading "Gemini의 응답" [ref=response]\n- button "코드 다운로드" [ref=previous-download]';
  unloadedFeedback.lane.noticePending=true;
  await assert.rejects(collect(unloadedFeedback.lane),{code:'ARGON_UNAVAILABLE'});
  assert.equal(unloadedFeedback.calls.some(s=>s.includes('ownDownloadPromise')),false,'an old result must not be downloaded before pending feedback has been sent');
  const hiddenFeedback=mockCodeDownloadLane(true,true);
  hiddenFeedback.state.tree='button \"모드 선택 도구 열기, 현재 Argon 모드 사용 중\" [ref=mode]\n한도는 12:28 오후에 초기화됩니다.\nheading \"Gemini의 응답\"';
  Object.assign(hiddenFeedback.lane,{noticePending:true,preSendMode:observedMode({tree:ARGON_HIGH_SELECTION}),generationModeObservations:[{mode:observedMode({tree:ARGON_HIGH_SELECTION})}]});
  await assert.rejects(collect(hiddenFeedback.lane),{code:'ARGON_UNAVAILABLE',reason:'usage_limit'});
  assert.equal(hiddenFeedback.calls.some(s=>s.includes('ownDownloadPromise')),false,'generation evidence must not turn an unsent review into a collected revision');
  const clickedResponse=readyDownload.calls.find(s=>s.includes('ownDownloadPromise'));
  assert.ok(clickedResponse.includes("readingPage.locator('model-response').last().locator('button[aria-label=\"코드 다운로드\"]').last().click()"));
  assert.ok(!clickedResponse.includes('locator("previous-download")'));
  assert.equal(readyDownload.lane.dir,'/current-download-fixture');
  assert.ok(clickedResponse.includes('current-download-fixture')&&!clickedResponse.includes('unused-download-fixture'),'download storage must follow the current REPL session');
  const oldPending=mockCodeDownloadLane(true,true,true);
  Object.assign(oldPending.lane,{started:0,progressAt:0,progressLen:100});
  assert.equal(await collect(oldPending.lane),null);
  assert.equal(oldPending.calls.some(s=>s.includes('reload(')||s.includes('ownDownloadPromise')),false,'a pending request must not be restarted or collected after an observation timeout');
  const busyResponse=mockCodeDownloadLane(true,true,false,true);
  Object.assign(busyResponse.lane,{started:0,progressAt:0,progressLen:100});
  await assert.rejects(collect(busyResponse.lane),/TEST_DOWNLOAD_BOUNDARY/);
  assert.ok(busyResponse.calls.some(s=>s.includes('stableBusyDownload')),'complete JSON must be stable before bypassing stale aria-busy');
  for(const busy of [false,true]){
    const missingAxDownload=mockCodeDownloadLane(true,true,false,busy);
    missingAxDownload.state.tree=missingAxDownload.state.tree.replace(/\n- button "코드 다운로드"[^\n]*/,'');
    await assert.rejects(collect(missingAxDownload.lane),/TEST_DOWNLOAD_BOUNDARY/);
    const clicked=missingAxDownload.calls.find(s=>s.includes('ownDownloadPromise'));
    assert.ok(clicked.includes("readingPage.locator('model-response').last().locator('button[aria-label=\"코드 다운로드\"]').last().click()"),'a current active DOM download must not depend on an AX button');
    if(busy)assert.ok(missingAxDownload.calls.some(s=>s.includes('stableBusyDownload')));
  }
  for(const fixture of [
    mockCodeDownloadLane(true,true,false,true,'{"slug":"incomplete'),
    mockCodeDownloadLane(true,true,false,true,undefined,'changed JSON')
  ]){
    fixture.state.tree=fixture.state.tree.replace(/\n- button "코드 다운로드"[^\n]*/,'');
    Object.assign(fixture.lane,{started:0,progressAt:0,progressLen:100});
    assert.equal(await collect(fixture.lane),null);
    assert.equal(fixture.calls.some(s=>s.includes('ownDownloadPromise')),false,'partial or changing busy JSON must not be downloaded');
  }
  const stoppedBusy=mockCodeDownloadLane(true,true,false,true);
  stoppedBusy.state.tree+='\n- button "대답 생성 중지"';
  Object.assign(stoppedBusy.lane,{started:0,progressAt:0,progressLen:100});
  assert.equal(await collect(stoppedBusy.lane),null);
  assert.equal(stoppedBusy.calls.some(s=>s.includes('ownDownloadPromise')),false,'the actual stop control keeps a response pending');
  for(const text of explicitProviderRefusals){
    const refusal=mockCodeDownloadLane(false,false,false,true,undefined,undefined,'Gemini의 응답\n'+text);
    await assert.rejects(collect(refusal.lane),{code:'PROVIDER_REFUSAL'});
    assert.equal(refusal.calls.some(s=>s.includes('ownDownloadPromise')),false,'a refusal must terminate even when busy remains and older JSON download controls are visible');
  }
  const thinking=mockCodeDownloadLane(false,false,false,true,undefined,undefined,'Organizing book excerpt data\nGemini의 응답');
  assert.equal(await collect(thinking.lane),null,'a thinking overlay is still pending');
  const unrelatedRefusal=mockCodeDownloadLane(false,false,false,true,undefined,undefined,[...explicitProviderRefusals][0],false);
  assert.equal(await collect(unrelatedRefusal.lane),null,'a refusal from an unmatched prompt must not terminate this request');

  assert.deepEqual(parseOriginal('```json\n{"slug":"a","ko":"x\\ny","en":"z"}\n```[cite: 1]'),{slug:'a',ko:'x\ny',en:'z'});
  assert.throws(()=>parseOriginal('{"ko":"a"} arbitrary prose'));
  assert.throws(()=>validate({slug:'other',ko:'x',en:'y'},{slug:'a'}));
  assert.throws(()=>validate({slug:'a',ko:'',en:'y'},{slug:'a'}));
  assert.throws(()=>validate({slug:'a',ko:'\uFFFD',en:'y'},{slug:'a'}));
  validate({slug:'a',ko:'',en:''},{slug:'a'});
  assert.equal(sql("a'b"),"'a''b'");assert.equal(sql(null),'NULL');
  const rankingOptions={feedback:{feedback:'facts.txt'},retry:['retry']};
  const blog=new Map([['posted',0],['scheduled',2],['posted-more',0],['posted-influence',0]]);
  const candidate=(slug,view_count=0,influence=0)=>({slug,view_count,influence});
  const order=list=>list.sort((a,b)=>compareCandidates(a,b,rankingOptions,blog)).map(p=>p.slug);
  assert.equal(candidateRank(candidate('scheduled'),rankingOptions,blog),1);
  assert.deepEqual(order([candidate('popular',999999,999),candidate('scheduled')]),['scheduled','popular']);
  assert.deepEqual(order([candidate('scheduled',999999,999),candidate('posted')]),['posted','scheduled']);
  assert.deepEqual(order([candidate('posted',2,100),candidate('posted-more',3,1)]),['posted-more','posted']);
  assert.deepEqual(order([candidate('posted',2,1),candidate('posted-influence',2,3)]),['posted-influence','posted']);
  assert.deepEqual(order([candidate('influential',0,999),candidate('popular',1),candidate('other')]),['popular','influential','other']);
  assert.deepEqual(order([candidate('posted',999999,999),candidate('retry'),candidate('feedback',1)]),['feedback','retry','posted']);
  assert.equal(candidateRank(candidate('feedback'),rankingOptions,blog),-1);
  assert.equal(candidateRank(candidate('retry'),rankingOptions,blog),-1);
  assert.deepEqual(matchingArticle({name:'A B',aliases:[]},[{title:'books A B',url:'https://example.com'}]),['https://example.com']);
  assert.deepEqual(matchingArticle({name:'앤드류 카네기',aliases:['앤드루 카네기']},[{title:'앤드루 카네기',url:'https://example.com'}]),['https://example.com']);
  assert.deepEqual(matchingArticle({name:'앨리스 스미스',aliases:[]},[{title:'존 스미스',url:'https://example.com/1'},{title:'메리 스미스',url:'https://example.com/2'}]),[]);
  assert.equal(localServerAbsent('http://localhost:3000',{cause:{code:'ECONNREFUSED'}}),true);
  assert.equal(localServerAbsent('https://feelandnote.com',{cause:{code:'ECONNREFUSED'}}),false);
  assert.equal(localServerAbsent('http://localhost:3000',{cause:{code:'ETIMEDOUT'}}),false);
  assert.equal(isDeepModel({tree:'현재 Argon 모드 사용 중'}),true);
  assert.equal(isDeepModel({tree:ARGON_HIGH_SELECTION}),true);
  assert.equal(isDeepModel({tree:'현재 Argon 낮음 모드 사용 중'}),true);
  assert.equal(isDeepModel({tree:'현재 Argon 보통 모드 사용 중'}),true);
  assert.equal(isDeepModel({tree:'현재 Flash-Lite 모드 사용 중'}),false);
  assert.equal(isProAccount({tree:'- link "Google 계정: t2(t2@example.com)" [ref=e1]: "t2   Pro"'}),true);
  const accountState={tree:'- title: "Google Gemini" [url=https://gemini.google.com/u/6/app?hl=ko]\n- button "사이드바 열기" [ref=sidebar]\n- link "Google 계정: t4(t4@example.com)" [ref=account]\n- button "모드 선택 도구 열기, 현재 Argon 높음 모드 사용 중" [ref=mode]\n- textbox "Gemini 프롬프트 입력" [ref=input]'};
  const accountPanel=label=>({tree:accountState.tree+'\n- iframe:\n  - dialog "계정 및 설정":\n    - button "닫기" [ref=close]\n    - generic:\n      - button "'+label+'" [ref=active]\n      - link "other AI Pro 계정" [ref=other]\n      - button "닫기" [ref=recoveryTip]'});
  assert.equal(isProAccount(accountPanel('t4 t4@example.com AI Pro 계정 계정 목록 접기')),true);
  assert.equal(isProAccount(accountPanel('t4 t4@example.com Google One 계정 계정 목록 접기')),false);
  assert.equal(isProAccount(accountPanel('other other@example.com AI Pro 계정 계정 목록 접기')),false);
  assert.equal(isProAccount(accountPanel('other t4@example.com AI Pro 계정 계정 목록 접기')),false);
  assert.equal(isProAccount(accountPanel('t4 t4@example.com AI Pro 계정 계정 목록 접기'),false),false);
  assert.equal(isProAccount({tree:'- button "t4 t4@example.com AI Pro 계정 계정 목록 접기" [ref=e1]'}),false);
  assert.equal(isProAccount({tree:'- link "Google 계정: t2(t2@example.com)" [ref=e1]\n- menuitem "3.1 Pro 고급 추론"'}),false);
  assert.equal(isProAccount({tree:'- link "Pro 사용법 대화" [ref=e1]: "Pro"'}),false);
  const badgeState={tree:accountState.tree.replace('[ref=account]','[ref=account]: "t4 Pro"')};
  assert.deepEqual(await verifyProAccount({},badgeState,{readState:()=>assert.fail('Badge already verified'),clickRef:()=>assert.fail('Unexpected account popup')}),{state:badgeState,verified:true});
  for(const [label,verified]of [['t4 t4@example.com AI Pro 계정 계정 목록 접기',true],['t4 t4@example.com Google One 계정 계정 목록 접기',false],['other other@example.com AI Pro 계정 계정 목록 접기',false]]){
    let opened=false;const clicks=[];
    const checked=await verifyProAccount({},accountState,{menuVisible:async(_,s)=>accountMenuOpen(s),readState:async()=>opened?accountPanel(label):accountState,pause:async()=>{},clickRef:async(_,r)=>{clicks.push(r);if(r==='account')opened=true;else if(r==='close')opened=false;else assert.equal(r,'sidebar');}});
    assert.deepEqual(clicks,['sidebar','account','close']);assert.equal(checked.verified,verified);assert.equal(checked.state,accountState);assert.equal(opened,false);
  }
  let heldPanel=false;
  await assert.rejects(verifyProAccount({},accountState,{menuVisible:async(_,s)=>accountMenuOpen(s),readState:async()=>heldPanel?accountPanel('t4 t4@example.com AI Pro 계정 계정 목록 접기'):accountState,pause:async()=>{},clickRef:async(_,r)=>{if(r==='account')heldPanel=true;}}),/Account menu did not close/);
  let visiblePanel=false,seenPanel=false;const retainedPanel=accountPanel('t4 t4@example.com AI Pro 계정 계정 목록 접기');
  const hiddenAfterClose=await verifyProAccount({},accountState,{menuVisible:async()=>visiblePanel,readState:async()=>seenPanel?retainedPanel:accountState,pause:async()=>{},clickRef:async(_,r)=>{if(r==='account')visiblePanel=seenPanel=true;else if(r==='close')visiblePanel=false;}});
  assert.equal(hiddenAfterClose.verified,true);assert.equal(hiddenAfterClose.state,retainedPanel);assert.equal(visiblePanel,false);
  const high=observedMode({tree:ARGON_HIGH_SELECTION});
  assert.equal(high.mode,'ArgonHigh');
  assert.equal(observedMode({tree:'Open mode picker, currently Argon High'}).mode,'ArgonHigh');
  const modeCases=[
    ['현재 Argon 낮음 모드 사용 중','ArgonLow'],
    ['Open mode picker, currently Argon Low','ArgonLow'],
    ['Open mode picker, currently Flash-Lite','Flash'],
    ['현재 Flash 3.8 모드 사용 중','Flash'],
    ['현재 Argon 모드 사용 중','unknown'],
    ['현재 Argon 보통 모드 사용 중','unknown'],
    ['No observed mode picker','unknown'],
    ['button "Open mode picker, currently Argon"\nmenuitem "Low"\nmenuitem "High"','unknown'],
    ['button "Open mode picker, currently Argon"\nmenuitem "Low" [checked]','ArgonLow'],
    ['button "Open mode picker, currently Argon"\nmenuitem "Thinking level Low"','ArgonLow'],
    ['button "Open mode picker, currently Argon"\ngeneric "현재 Argon 높음 모드 사용 중"','unknown']
  ];
  assert.equal(observedMode({tree:'button "Open mode picker, currently Argon"\nmenuitemradio "High" [checked]'}).mode,'ArgonHigh');
  for(const [tree,mode]of modeCases){
    const evidence=modelObservation({preSendMode:high,preSendObservedAt:'before'}, {tree});
    assert.equal(evidence.collectionMode.mode,mode,tree);
    assert.equal(evidence.preSendMode,high);assert.equal(evidence.preSendObservedAt,'before');
    assert.equal(evidence.actualModel,'unknown');assert.equal(evidence.responseModelEvidence,null);
    assert.throws(()=>assertCollectionMode(evidence),{code:'MODEL_VERIFICATION_PENDING'});
  }
  assert.equal(observedMode({tree:'currently Flash-Lite'}).variant,'Lite');
  assert.equal(observedMode({tree:'currently Flash 3.8'}).version,'3.8');
  assert.equal(observedMode({tree:'현재 3.5 Flash-Lite 모드 사용 중'}).version,'3.5');
  const highEvidence=modelObservation({preSendMode:high}, {tree:ARGON_HIGH_SELECTION});
  assertCollectionMode(highEvidence);assert.equal(highEvidence.actualModel,'unknown');
  const hiddenLevel={...highEvidence,generationModeObservations:[{mode:high}],collectionStartMode:observedMode({tree:'현재 Argon 모드 사용 중'}),collectionMode:observedMode({tree:'현재 Argon 모드 사용 중'})};
  assertCollectionMode(hiddenLevel);
  assert.throws(()=>assertCollectionMode({...hiddenLevel,generationModeObservations:[]}),{code:'MODEL_VERIFICATION_PENDING'});
  assert.throws(()=>assertCollectionMode({...hiddenLevel,collectionMode:observedMode({tree:'현재 Argon 낮음 모드 사용 중'})}),{code:'MODEL_VERIFICATION_PENDING'});
  assert.throws(()=>assertCollectionMode({...highEvidence,generationModeObservations:[{mode:observedMode({tree:'currently Argon Low'})}]}),{code:'MODEL_VERIFICATION_PENDING'});
  assert.throws(()=>assertCollectionMode({...highEvidence,preSendMode:observedMode({tree:'currently Argon Low'})}),{code:'MODEL_VERIFICATION_PENDING'});
  assert.throws(()=>assertCollectionMode({...highEvidence,collectionStartMode:observedMode({tree:'currently Argon Low'})}),{code:'MODEL_VERIFICATION_PENDING'});
  assert.throws(()=>assertCollectionMode({...highEvidence,collectionMode:observedMode({tree:'currently Flash-Lite'}),actualModel:'ArgonHigh'}),{code:'MODEL_VERIFICATION_PENDING'});
  assert.throws(()=>assertCollectionMode(undefined),{code:'MODEL_VERIFICATION_PENDING'});
  // Rejection must precede prose normalization, SQL creation, and all DB access.
  await assert.rejects(save(null,null,null),{code:'MODEL_VERIFICATION_PENDING'});
  await assert.rejects(save(null,null,null,{...highEvidence,collectionMode:observedMode({tree:'currently Argon Low'})}),{code:'MODEL_VERIFICATION_PENDING'});
  await assert.rejects(save(null,null,null,{...highEvidence,collectionMode:observedMode({tree:'currently Flash-Lite'})}),{code:'MODEL_VERIFICATION_PENDING'});
  // A retained work folder is not even enumerated: originals may be inside it.
  await cleanupWork(path.join(os.tmpdir(),'feelandnote','missing-held-work-'+randomUUID()),true);
  const {stopForModelVerification}=await import('./reading-way-watch.mjs');
  const watchState={state:'running',pid:null},watchCalls=[],watchEvents=[{event:'model_verification_pending',slug:'a',output:'retained.json'},{event:'finished',completed:1,total:2,stopped:true}];
  let automaticStarts=0;
  if(!stopForModelVerification(watchState,watchEvents,{save:s=>watchCalls.push(s.state),record:(event,data)=>watchCalls.push([event,data.reason])}))automaticStarts++;
  assert.equal(automaticStarts,0);assert.equal(watchState.state,'alert');
  assert.deepEqual(watchCalls,['alert',['alert','model_verification_pending']]);
  assert.equal(stopForModelVerification({},[{event:'finished',completed:1}],{save:()=>assert.fail('Unexpected state write'),record:()=>assert.fail('Unexpected event')}),false);
  assert.throws(()=>args(['--book-research']),/postprocessing/);
  assert.throws(()=>validateBookResearch({}));
  assert.equal(args(['--shorten']).shorten,true);assert.equal(args(['--shorten']).bookResearch,false);
  assert.throws(()=>args(['--shorten','--book-research']));
  assert.match(lengthNotice({chars:2100,paragraphs:5}),new RegExp(`2100자·5문단.*${READING_WAY_KO_MAX_CHARS}자·${READING_WAY_MAX_PARAGRAPHS}문단`));
  assert.throws(()=>validateBookResearch({books:[{title_en:'x'}],unresolved:[]}));
  validateBookResearch({books:[],unresolved:[]});
  const koBook={title_ko:'책',title_en:'Book',author_ko:'저자',author_en:'Author',evidence:'근거',review_ko:'한국어 감상배경',source_url:'https://example.com',source_urls:[]};
  validateResponse({slug:'a',books:[koBook],unresolved:[]},{slug:'a'},true);
  assert.throws(()=>validateBookResearch({books:[koBook],unresolved:[]}));
  assert.equal(isRetryableResponseError({tree:'오류가 발생했습니다.\nbutton "다시 시도"'}),true);
  assert.equal(isRetryableResponseError({tree:'button "다시 시도"'}),false);
  assert.equal(isRetryableResponseError({tree:'오류가 발생했습니다.\nbutton "다시 시도"\n대답 생성 중지'}),false);
  assert.equal(args(['--feedback','a='+path.join(os.tmpdir(),'facts.txt')]).feedback.a,path.join(os.tmpdir(),'facts.txt'));
  assert.throws(()=>args(['--feedback','a=relative.txt']));
  assert.throws(()=>args(['--feedback','../a='+path.join(os.tmpdir(),'facts.txt')]));
  assert.equal(isProviderRefusal({tree:'I can help with many kinds of requests, but it appears this one would go against my guidelines.'}),true);
  assert.equal(isProviderRefusal({tree:'would go against my guidelines\nbutton "코드 다운로드"'}),false);
  assert.equal(isProviderRefusal({tree:'Gemini의 응답'}),false);
  assert.equal(accessReason({tree:'url=https://www.google.com/sorry/index'}),'network_verification');
  assert.equal(accessReason({tree:'region "reCAPTCHA"'}),'human_verification');
  assert.equal(accessReason({tree:'Google AI Pro 구독 기간이 종료되었습니다.'}),'subscription_ended');
  assert.equal(accessReason({tree:'사용 한도에 도달했습니다.'}),'usage_limit');
  assert.equal(accessReason({tree:'현재 Argon 모드 사용 중'}),'access_unconfirmed');
  assert.equal(accessReason({tree:'generic "본문에서 reCAPTCHA에 대해 설명한다"'}),'access_unconfirmed');
  assert.equal(accessError({tree:'비정상적인 트래픽을 감지했습니다.'}).code,'GOOGLE_VERIFICATION_REQUIRED');
  assert.equal(accessError({tree:'사용 한도에 도달했습니다.'}).code,'ARGON_UNAVAILABLE');
  let highQuotaSnapshots=0;
  const highQuotaLane={client:{callRepl:async script=>{
    assert.ok(script.includes('snapshot(readingPage'),'quota must be reported before attempting a disabled High selector');
    highQuotaSnapshots++;
    return {content:[{type:'text',text:JSON.stringify({tree:'button "모드 선택 도구 열기, 현재 Argon 모드 사용 중"\n한도는 12:28 오후에 초기화됩니다.'})}]};
  }}};
  await assert.rejects(ensureDeepHigh(highQuotaLane),{code:'ARGON_UNAVAILABLE',reason:'usage_limit'});
  assert.equal(highQuotaSnapshots,1);
  {
    const closed='button "모드 선택 도구 열기, 현재 Argon 모드 사용 중" [ref=eMode]';
    const available=closed+'\nmenuitem "4 Argon 복잡한 작업" [ref=eArgon]\nmenuitem "사고 수준" [ref=eThinking]';
    const states=[closed,available,available+'\n한도는 6:28 오후에 초기화됩니다.\nmenuitem "높음 한도가 11월 4일 오후 6:28에 초기화됩니다" [ref=eHigh] [disabled]'];
    const clicks=[];
    const lane={client:{callRepl:async script=>{
      if(script.includes('snapshot(readingPage'))return {content:[{type:'text',text:JSON.stringify({tree:states.shift()})}]};
      clicks.push(script);assert.ok(script.includes('locator("eMode")')||script.includes('locator("eThinking")'));
      return {content:[{type:'text',text:'clicked'}]};
    }}};
    await assert.rejects(ensureDeepHigh(lane),{code:'ARGON_UNAVAILABLE',reason:'usage_limit'});
    assert.equal(states.length,0);assert.equal(clicks.length,2);
  }
  const cappedArgon='menuitem "4 Argon 한도가 11월 4일 오전 8:47에 초기화됩니다" [ref=eArgon] [disabled]';
  assert.equal(accessReason({tree:cappedArgon}),'usage_limit');
  assert.equal(accessReason({tree:'menuitem "3.8 Flash 한도가 11월 4일 오전 8:47에 초기화됩니다" [disabled]\nmenuitem "4 Argon 복잡한 작업" [ref=eArgon]'}),'access_unconfirmed');
  for(const label of ['현재 Argon 높음 모드 사용 중','현재 Argon 모드 사용 중']){
    const closed=`button "모드 선택 도구 열기, ${label}" [ref=eMode]`;
    const states=[closed,closed+'\n'+cappedArgon+'\nmenuitem "사고 수준" [ref=eThinking]'];
    let clicks=0;
    const lane={client:{callRepl:async script=>{
      if(script.includes('snapshot(readingPage'))return {content:[{type:'text',text:JSON.stringify({tree:states.shift()})}]};
      assert.ok(script.includes('locator("eMode")'),'a capped account must not select a thinking level or send');clicks++;
      return {content:[{type:'text',text:'clicked'}]};
    }}};
    await assert.rejects(ensureDeepHigh(lane),{code:'ARGON_UNAVAILABLE',reason:'usage_limit'});
    assert.equal(states.length,0);assert.equal(clicks,1);
  }
  {
    const closed='button "모드 선택 도구 열기, 현재 Argon 높음 모드 사용 중" [ref=eMode]';
    const states=[closed,closed+'\nmenuitem "4 Argon 복잡한 작업" [ref=eArgon]',closed];
    let clicks=0;
    const lane={client:{callRepl:async script=>{
      if(script.includes('snapshot(readingPage'))return {content:[{type:'text',text:JSON.stringify({tree:states.shift()})}]};
      assert.ok(script.includes('locator("eMode")'));clicks++;return {content:[{type:'text',text:'clicked'}]};
    }}};
    await ensureDeepHigh(lane);assert.equal(lane.preSendMode.mode,'ArgonHigh');
    assert.equal(states.length,0);assert.equal(clicks,2);
  }
  assert.equal(accessError({tree:'Ultra Carbon is not selected'}).resetAt,undefined);
  assert.equal(resetTimeFromNotice('한도는 6:08 오후에 초기화됩니다.',Date.parse('2026-10-28T09:00:00Z')),Date.parse('2026-10-28T09:08:00Z'));
  assert.equal(resetTimeFromNotice('한도는 6:08 오후에 초기화됩니다.',Date.parse('2026-10-28T09:09:00Z')),null);
  assert.equal(resetTimeFromNotice('10월 29일 오전 12:08',Date.parse('2026-10-28T09:00:00Z')),Date.parse('2026-10-28T15:08:00Z'));
  assert.equal(resetTimeFromNotice('한도 초기화 시각 없음',Date.parse('2026-10-28T09:00:00Z')),null);
  assert.equal(accessReason({tree:'한도는 6:08 오후에 초기화됩니다.'}),'usage_limit');
  const profiles=[{key:'test-a'},{key:'test-b'}],first={profile:profiles[0],person:{slug:'a'},phase:'generating'},second={profile:profiles[1],person:{slug:'b'},phase:'idle'};
  assert.deepEqual(assignableProfiles(profiles,[first,second],second,100),[profiles[1]]);
  blockedUntil.set('test-b',200);
  assert.deepEqual(assignableProfiles(profiles,[first,second],second,100),[]);
  assert.deepEqual(assignableProfiles(profiles,[first,second],second,201),[profiles[1]]);
  first.phase='waiting';assert.deepEqual(assignableProfiles(profiles,[first,second],second,100),[profiles[0]]);
  blockedUntil.delete('test-b');
  const waitingPerson={slug:'mark-ruffalo',revisionFile:'facts.txt'},resumeUrl='https://gemini.google.com/app/bd18035cf5131052';
  const waitingLane={profile:{key:'u2:0'},person:waitingPerson,phase:'waiting',pendingStart:{slug:waitingPerson.slug,profile:'u2:0',resume:resumeUrl,warning:true}};
  const started=[];
  const recordStart=async(l,person,...rest)=>started.push([person.slug,...rest]);
  await restartWaiting(waitingLane,async()=>false,recordStart);
  assert.deepEqual(started,[]);
  assert.deepEqual(pendingStartArgs(waitingLane,waitingPerson),[resumeUrl,true]);
  await restartWaiting(waitingLane,async()=>true,recordStart);
  assert.deepEqual(started,[[waitingPerson.slug,resumeUrl,true]]);
  started.length=0;
  await restartWaiting(waitingLane,async l=>{l.profile={key:'u2:1'};return true;},recordStart);
  assert.deepEqual(started,[[waitingPerson.slug,undefined,false]]);
  assert.deepEqual(pendingStartArgs({...waitingLane,profile:{key:'u2:0'}},{slug:'next-person'}),[undefined,false]);
  assert.throws(()=>parseOriginal('{"slug":"x","ko":"incomplete'));
  assert.deepEqual(parseOriginal('{"slug":"x","ko":"완성","en":"complete"}'),{slug:'x',ko:'완성',en:'complete'});
  const koreanDraft={slug:'translation-fixture',ko:'그녀는 2005년에 이 책을 읽었다.\n\n그 뒤 다시 읽었다.'};
  const reviewRaw=JSON.stringify(koreanDraft,null,2)+'\n';
  assert.equal(verifiedReviewOriginal(reviewRaw,koreanDraft,hash(reviewRaw)),reviewRaw);
  assert.throws(()=>verifiedReviewOriginal(reviewRaw,koreanDraft,hash(reviewRaw+' ')),/hash mismatch/);
  assert.throws(()=>verifiedReviewOriginal(reviewRaw,{slug:'other'},hash(reviewRaw)),/slug|person|Wrong/);
  validateResponse(koreanDraft,{slug:koreanDraft.slug});
  assert.throws(()=>validate(koreanDraft,{slug:koreanDraft.slug}),/Missing KO\/EN/);
  const separateTranslation={slug:koreanDraft.slug,source_sha256:hash(koreanDraft.ko),en:'She read this book in 2005.\n\nShe later read it again.'};
  const bilingual=combineReadingWayTranslation(koreanDraft,separateTranslation);
  assert.equal(bilingual.ko,koreanDraft.ko);
  assert.equal(bilingual.en,separateTranslation.en);
  assert.equal('en' in koreanDraft,false);
  assert.match(readingWayTranslationPrompt(koreanDraft,{name_en:'Alice'}),/Alice/);
  assert.match(readingWayTranslationPrompt(koreanDraft),new RegExp(hash(koreanDraft.ko)));
  assert.throws(()=>combineReadingWayTranslation(koreanDraft,{...separateTranslation,slug:'other'}),/person mismatch/);
  assert.throws(()=>combineReadingWayTranslation({...koreanDraft,ko:koreanDraft.ko.replace('2005','2006')},separateTranslation),/source mismatch/);
  assert.throws(()=>combineReadingWayTranslation(koreanDraft,{...separateTranslation,ko:'바뀐 원문'}),/changed Korean/);
  assert.throws(()=>combineReadingWayTranslation(koreanDraft,{...separateTranslation,en:''}),/Inconsistent insufficient/);
  await assert.rejects(save(null,koreanDraft,null,highEvidence),{code:'TRANSLATION_REQUIRED'});
  assert.equal(hasNewMessageReceipt({count:1,matched:false},{count:1,matched:true}),false);
  assert.equal(hasNewMessageReceipt({count:1,matched:false},{count:2,matched:false}),false);
  assert.equal(hasNewMessageReceipt({count:1,matched:false},{count:2,matched:true}),true);
  assert.equal(hasNewMessageReceipt({count:1,matched:true},{count:2,matched:true}),true);
  assert.equal(hasNewMessageReceipt({count:1,matched:true},{count:0,matched:false}),false);
  assert.equal(stallAction({pending:false,len:5,lastLen:5,lastAt:0,now:1e9,reloaded:false}),'none');
  assert.equal(stallAction({pending:true,len:30,lastLen:17,lastAt:0,now:1e9,reloaded:false}),'progress');
  assert.equal(stallAction({pending:true,len:17,lastLen:17,lastAt:0,now:GENERATION_STALL_MS-1,reloaded:false}),'wait');
  assert.equal(stallAction({pending:true,len:17,lastLen:17,lastAt:0,now:GENERATION_STALL_MS+1,reloaded:false}),'pending');
  assert.equal(stallAction({pending:true,len:17,lastLen:17,lastAt:0,now:GENERATION_STALL_MS+1,reloaded:true}),'pending');
  assert.equal(hasPendingGeneration({tree:'button "대답 생성 중지"'},{}),true);
  assert.equal(hasPendingGeneration({tree:'heading "Gemini의 응답"'},{pendingSearch:true}),true);
  assert.equal(hasPendingGeneration({tree:'heading "Gemini의 응답"'},{busy:true}),true);
  assert.equal(hasPendingGeneration({tree:'button "코드 다운로드"'},{pendingSearch:false}),false);
  assert.equal(isProviderRefusal({tree:'Gemini의 응답\n저는 언어 모델일 뿐이라 그것을 이해하지 못해서 도와드릴 수가 없습니다.'}),true);
  assert.equal(isProviderRefusal({tree:'Gemini의 응답\n저는 언어 모델일 뿐이라 그것에 필요한 정보나 능력이 없어서 도와드릴 수가 없습니다.'}),true);
  assert.equal(isProviderRefusal({tree:'저는 언어 모델일 뿐이라 그것을 이해하지 못해서 도와드릴 수가 없습니다.\nbutton "코드 다운로드"'}),false);
  assert.throws(()=>validate({slug:'a',ko:'',en:'',unresolved:[{unresolved_reason:'현재 환경에서 외부 웹페이지 열람 및 추가 검색 도구를 호출할 수 없어 원문 확인이 불가능합니다.'}]},{slug:'a'}),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validate({slug:'a',ko:'',en:'',unresolved:[{unresolved_reason:'I cannot browse the web in this environment.'}]},{slug:'a'}),{code:'RESEARCH_UNAVAILABLE'});
  validate({slug:'a',ko:'',en:'',unresolved:[{unresolved_reason:'확인한 인터뷰에는 독서 방식에 관한 내용이 충분하지 않습니다.'}]},{slug:'a'});
  validate({slug:'a',ko:'원문',en:'Text',unresolved:[{unresolved_reason:'한 출처는 웹 검색 도구를 사용할 수 없어 확인하지 못했습니다.'}]},{slug:'a'});
  assert.equal(args(['--books-only','--only','a']).booksOnly,true);
  assert.equal(args(['--books-only','--only','a']).bookResearch,true);
  assert.throws(()=>args(['--books-only']));
  assert.throws(()=>args(['--books-only','--only','a','--continuous']));
  assert.equal(args(['--collect-only']).bookResearch,false);
  assert.equal(args(['--collect-only']).collectOnly,true);
  assert.throws(()=>args(['--collect-only','--continuous']));
  assert.throws(()=>args(['--collect-only','--books-only','--only','a']));
  validateResponse({slug:'a',books:[],unresolved:[]},{slug:'a'},true);
  assert.throws(()=>validateResponse({slug:'a',ko:'',en:'',books:[],unresolved:[]},{slug:'a'},true));
  assert.throws(()=>validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'I cannot browse the web in this environment.'}]},{slug:'a'},true),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'현재 세션에서 외부 웹페이지 열람 및 검색 도구 호출이 제한되어 있어 원문을 확인할 수 없음.'}]},{slug:'a'},true),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'참조 링크 및 원출처 본문을 직접 열람할 수 없는 환경이며, 근거를 확인할 수 없어 제외함.'}]},{slug:'a'},true),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'제공된 참조 링크의 원문 본문을 직접 열람할 수 있는 웹 조회 환경이 제한되어 보류합니다.'}]},{slug:'a'},true),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'외부 웹 검색 및 참조 링크 원문 열람이 제한되어 확인할 수 없음.'}]},{slug:'a'},true),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'첨부된 문서 내 참조 링크 원문을 직접 열람하여 확인할 수 없는 환경이며, 근거를 확인하지 못함.'}]},{slug:'a'},true),{code:'RESEARCH_UNAVAILABLE'});
  validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'참조 기사와 인터뷰를 확인했으나 해당 도서를 읽었다는 근거가 없음.'}]},{slug:'a'},true);
  // 26.11.08 한용운·구본무: 검색 없이 첨부 문서에 원문이 없다는 이유로 보류했다.
  assert.throws(()=>validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'첨부된 문서에는 기본 정보와 참조 링크 목록(URL)만 수록되어 있을 뿐 참조 링크의 실제 원문 본문이 포함되어 있지 않습니다.'}]},{slug:'a'},true),/Research tools unavailable/);
  validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'기사 본문에 해당 도서 언급이 포함되어 있지 않음.'}]},{slug:'a'},true);
  assert.throws(()=>validate({slug:'a',ko:'',en:'',unresolved:[{unresolved_reason:'웹 검색 도구 사용이 제한되어 있어 원문을 확인할 수 없음.'}]},{slug:'a'}),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validate({slug:'a',ko:'',en:'',unresolved:[{unresolved_reason:'외부 웹 검색 및 URL 열람 도구가 비활성화되어 참조 링크의 원문과 개별 도서의 감상 근거를 직접 확인할 수 없습니다.'}]},{slug:'a'}),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validate({slug:'a',ko:'원문',en:'Text',unresolved:[{unresolved_reason:'현재 실행 환경에서 외부 웹 열람 도구가 비활성화(호출 한도 0)되어 참조 링크의 원문을 대조할 수 없으므로 미해결로 분류함.'}]},{slug:'a'}),{code:'RESEARCH_UNAVAILABLE'});
  validate({slug:'a',ko:'원문',en:'Text',unresolved:[{unresolved_reason:'링크드인 아티클의 나머지 도서는 원문 열람 제한으로 개별 제목을 특정하지 못함.'}]},{slug:'a'});
  assert.equal(argonSections('운영\n<!-- argon -->\n규칙 1\n<!-- /argon -->\n실행자\n<!-- argon -->\n규칙 2\n<!-- /argon -->\n'),'규칙 1\n\n규칙 2');
  const kellerArticle={title:'헬렌 켈러의 책과 사람',url:'https://example.com/helen-keller'};
  assert.deepEqual(matchingArticle({name:'짐 켈러',aliases:[]},[kellerArticle]),[]);
  assert.deepEqual(matchingArticle({name:'헬렌 켈러',aliases:[]},[kellerArticle]),[kellerArticle.url]);
  assert.throws(()=>argonSections('표시 없음'),/No Argon sections/);
  for(const f of [rulebook,path.join(root,'docs/project/celeb/celeb-02-01-content-research.md'),path.join(root,'docs/project/celeb/celeb-02-03-content-review.md')]){
    const t=await argonText(f);
    assert.ok(!/--pool|--collect-only|--shorten|Aside|insane-search|웨이백 CDX|reading-way-books-apply/.test(t),`operator notes leaked from ${path.basename(f)}`);
  }
  log('self_test_passed');
}

// Read-only metadata for the local progress page. No manuscript text is selected.
export async function readingWayProgress({only=[],names=[]}={}){
  if(![...only,...names].every(validSlug))throw Error('Invalid progress slug');
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'feelandnote/reading-way-argon-run-'));
  const where=only.length?`AND slug IN (${only.map(sql).join(',')})`:'';
  const named=names.length?`, 'names', (SELECT COALESCE(json_object_agg(slug,nickname),'{}'::json) FROM public.celebs WHERE slug IN (${names.map(sql).join(',')}) OR reading_way='')`:'';
  try{
    const q=`SELECT json_build_object('total',count(*),'with_text',count(*) FILTER(WHERE reading_way IS NOT NULL AND reading_way<>''),'null',count(*) FILTER(WHERE reading_way IS NULL),'insufficient',COALESCE(json_agg(slug ORDER BY slug) FILTER(WHERE reading_way='' AND reading_way_en=''),'[]'::json)${named}) FROM public.celebs WHERE celeb_reality IN ('REAL','BOTH') ${where};`;
    return JSON.parse((await database(q,work)).text.trim());
  }finally{await cleanupFiles((await fs.readdir(work)).map(f=>path.join(work,f)));}
}

export {database, submit, collect, save, revalidate};

async function pendingBookSlugs(){
  const base=path.join(os.tmpdir(),'feelandnote'),events=[];
  for(const folder of await fs.readdir(base,{withFileTypes:true})){
    if(!folder.isDirectory()||!folder.name.startsWith('reading-way-argon-runner-'))continue;
    try{for(const line of (await fs.readFile(path.join(base,folder.name,'stdout.log'),'utf8')).split(/\r?\n/)){
      try{const e=JSON.parse(line);if(['books_pending','books_verified'].includes(e.event))events.push(e);}catch{}
    }}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  events.sort((a,b)=>Date.parse(a.time)-Date.parse(b.time));const pending=new Set();
  for(const e of events){if(e.event==='books_pending')pending.add(e.slug);else pending.delete(e.slug);}
  return [...pending];
}

async function main(options=args(process.argv.slice(2))){
  if(options.selfTest)return selfTest();
  // 한국어 원고는 먼저 회수하고, 별도 무료 웹채팅 번역을 검토한 뒤 실행자가 저장한다.
  if(!options.booksOnly)options.collectOnly=true;
  process.loadEnvFile(path.join(root,'sw/web-bo/.env'));
  if(!process.env.CRON_SECRET||!process.env.NEXT_PUBLIC_WEB_URL)throw Error('Missing cache configuration');
  if(options.summary){log('summary',await readingWayProgress({only:[...new Set([...options.only,...options.retry])]}));return;}
  const work=await fs.mkdtemp(path.join(os.tmpdir(),'feelandnote/reading-way-argon-run-'));
  if(options.revalidateOnly){
    const people=JSON.parse((await database(`SELECT COALESCE(json_agg(r),'[]'::json) FROM (SELECT id,slug FROM public.celebs WHERE slug IN (${options.only.map(sql).join(',')})) r;`,work)).text.trim());
    if(people.length!==new Set(options.only).size)throw Error('Cache target not found');
    for(const person of people){await revalidate(person);log('cache_revalidated',{slug:person.slug});}
    await cleanupFiles((await fs.readdir(work)).map(f=>path.join(work,f)));return;
  }
  const people=await targets(options,work);
  const articles=await civicArticles(),ranks=await blogRanks();
  const rank=p=>candidateRank(p,options,ranks);
  people.sort((a,b)=>compareCandidates(a,b,options,ranks));
  const queue=people.slice(0,options.limit);
  for(const person of queue){
    person.retryInsufficient=options.retry.includes(person.slug);
    if(options.feedback[person.slug])person.revisionFile=options.feedback[person.slug];
  }
  log('selected',{pid:process.pid,count:queue.length,civic_articles:articles.length,people:queue.map(p=>({slug:p.slug,priority:rank(p),civic:matchingArticle(p,articles).length}))});
  if(!options.apply){await cleanupFiles((await fs.readdir(work)).map(f=>path.join(work,f)));return;}
  const rules=await argonText(rulebook);
  const lanes=[];
  for(let index=0;index<Math.min(2,queue.length,options.pool.length);index++){
    const resumed=options.resume[queue[index].slug];
    const resumedUser=resumed?Number(resumed.match(/\/u\/(\d+)\//)?.[1]??0):null;
    const profile=(resumed?options.pool.find(p=>p.authuser===resumedUser):null)??options.pool[index%options.pool.length];
    const client=new AsideClient({account:profile.account});await client.ready;
    const dir=JSON.parse(textOf(await client.callRepl('console.log(JSON.stringify(pwd));','Locate own input folder')));
    lanes.push({client,dir,index,profile,bookResearch:options.bookResearch,booksOnly:options.booksOnly,shorten:options.shorten,owned:false,person:null,phase:'idle'});
  }
  let cursor=0,completed=0,stopping=false;const deferred=[];
  const onInterrupt=()=>{stopping=true;log('stop_requested');};
  process.on('SIGINT',onInterrupt);
  async function changeProfile(l,next){
    if(l.owned)await repl(l,'await closeTab(readingPage);console.log("own account tab closed");').catch(()=>{});
    await l.client.close();
    await cleanupFiles([l.input,...(l.badDownloads??[])]);
    l.client=new AsideClient({account:next.account});await l.client.ready;
    l.dir=JSON.parse(textOf(await l.client.callRepl('console.log(JSON.stringify(pwd));','Locate rotated account storage')));
    l.profile=next;l.owned=false;l.person=null;l.phase='idle';l.badDownloads=[];l.input=null;l.lastFocus=0;
  }
  async function start(l,person,resume,warning=false){
    l.pendingStart={slug:person.slug,profile:l.profile.key,resume,warning};
    for(;;){
      if(!assignableProfiles([l.profile],lanes,l).length&&!await assignProfile(l,person))return;
      try{await submit(l,person,articles,rules,...pendingStartArgs(l,person));l.pendingStart=null;return;}
      catch(error){
        if(error.code==='SEND_NOT_CONFIRMED'){deferred.push(person.slug);log('person_deferred',{slug:person.slug,message:error.message,input:l.input});l.person=null;l.phase='idle';return;}
        if(error.code!=='ARGON_UNAVAILABLE')throw error;
        l.pendingStart=null;
        if(!await rotate(l,person,error))return;
        if(stopping)return;
      }
    }
  }
  async function rotate(l,person,error){
    blockedUntil.set(l.profile.key,error.resetAt??Date.now()+ACCESS_RECHECK_MS);
    log('access_blocked',{slug:person.slug,profile:l.profile.key,reason:error.reason??'access_unconfirmed',message:error.message,reset_at:error.resetAt?new Date(error.resetAt).toISOString():null});
    return assignProfile(l,person);
  }
  async function assignProfile(l,person){
    if(stopping){l.person=null;l.phase='idle';return false;}
    const available=assignableProfiles(options.pool,lanes,l);
    if(!available.length){
      const now=Date.now(),busy=options.pool.some(p=>(blockedUntil.get(p.key)??0)<=now);
      const at=busy?now+12000:Math.min(...options.pool.map(p=>blockedUntil.get(p.key)??now+ACCESS_RECHECK_MS));
      if(l.phase!=='waiting'||(!busy&&l.retryAt!==at))log('waiting_for_argon',{resume_at:new Date(at).toISOString(),slug:person.slug,message:busy?'다른 계정의 진행 중 작업을 유지하며 배정 대기':'이 작업만 계정 접근 재확인 대기. 다른 탭의 응답 회수는 계속'});
      l.person=person;l.phase='waiting';l.retryAt=at;return false;
    }
    const next=available[0];
    log(next.key===l.profile.key?'retry_account':'rotate_account',{slug:person.slug,from:l.profile.key,to:next.key});
    await changeProfile(l,next);return true;
  }
  try{
    while(completed+deferred.length<queue.length){
      for(const l of lanes){
        if(!l.person){if(cursor<queue.length&&!stopping){const next=queue[cursor++];await start(l,next,options.resume[next.slug],options.warnPronouns);}continue;}
        if(l.phase==='waiting'){
          if(stopping){l.person=null;l.phase='idle';continue;}
          if(Date.now()>=l.retryAt)await restartWaiting(l,assignProfile,start);
          continue;
        }
        if(l.phase==='generating'){
          let artifact;
          try{artifact=await collect(l);}
          catch(error){
            if(error.code==='GOOGLE_VERIFICATION_REQUIRED')throw error;
            if(error.code==='MODEL_VERIFICATION_PENDING'){
              stopping=true;deferred.push(l.person.slug);
              log('person_deferred',{slug:l.person.slug,reason:'model_verification_pending',message:error.message,url:error.url??l.conversationUrl,input:l.input,output:error.output??null,sha256:error.sha256??null,...error.modelObservation});
              l.retainTab=true;l.person=null;l.phase='idle';l.input=null;l.badDownloads=[];continue;
            }
            if(error.code==='RESEARCH_UNAVAILABLE'&&(researchRetries.get(l.person.slug)??0)<RESEARCH_RETRY_LIMIT){
              // 그 계정의 Gemini가 검색 도구 없이 답한 것이다. 같은 계정에 바로 다시 보내지 않고 계정을 잠시 쉬게 한 뒤 다른 계정의 새 대화로 다시 받는다.
              const person=l.person,attempt=(researchRetries.get(person.slug)??0)+1;researchRetries.set(person.slug,attempt);
              log('research_unavailable',{slug:person.slug,profile:l.profile.key,url:error.url??l.conversationUrl,attempt});
              await cleanupFiles([l.input,...(l.badDownloads??[])]);l.input=null;l.badDownloads=[];
              if(await rotate(l,person,{reason:'research_tools_unavailable',message:error.message,resetAt:Date.now()+RESEARCH_TOOLS_RECHECK_MS}))await start(l,person);continue;
            }
            if(error.code!=='ARGON_UNAVAILABLE'){
              deferred.push(l.person.slug);log('person_deferred',{slug:l.person.slug,url:error.url??l.conversationUrl,message:error.message,input:l.input});
              if(error.code==='RESEARCH_UNAVAILABLE')await cleanupFiles([l.input,...(l.badDownloads??[])]);
              l.person=null;l.phase='idle';l.input=null;l.badDownloads=[];continue;
            }
            log('rejected_model',{slug:l.person.slug,profile:l.profile.key});
            const person=l.person;
            if(await rotate(l,person,error))await start(l,person);continue;
          }
          if(!artifact)continue;
          assertCollectionMode(artifact.modelObservation);
          if(hash(await fs.readFile(artifact.output,'utf8'))!==artifact.sha256)throw Error('Original changed');
          if(!l.booksOnly&&!options.collectOnly)await save(l.person,artifact.p,work,artifact.modelObservation);l.artifact=artifact;l.phase='saved';
        }
        if(l.phase==='saved'){
          for(let attempt=0;!l.booksOnly&&!options.collectOnly;attempt++){
            try{await revalidate(l.person);break;}
            catch(error){if(attempt===2)throw error;log('retry_cache',{slug:l.person.slug,attempt:attempt+1});await sleep(2000);}
          }
          if(options.collectOnly)log('draft_ready',{slug:l.person.slug,url:l.artifact.url,output:l.artifact.output,sha256:l.artifact.sha256,translationPending:l.artifact.p.ko!=='',modelObservation:l.artifact.modelObservation,completed:++completed,total:queue.length});
          else if(l.booksOnly)log('books_ready',{slug:l.person.slug,url:l.artifact.url,modelObservation:l.artifact.modelObservation,completed:++completed,total:queue.length});
          else log('published',{slug:l.person.slug,ko_chars:l.artifact.p.ko.length,en_chars:l.artifact.p.en.length,insufficient:l.artifact.p.ko==='',exact_readback:true,url:l.artifact.url,modelObservation:l.artifact.modelObservation,completed:++completed,total:queue.length});
          if(l.bookResearch){
            log('books_pending',{slug:l.person.slug,count:l.artifact.p.books.length,unresolved:l.artifact.p.unresolved.length,output:l.artifact.output,sha256:l.artifact.sha256,url:l.artifact.url});
          }
          await cleanupFiles([l.input,...(l.bookResearch||l.shorten||options.collectOnly?[]:[l.artifact.output]),...(l.badDownloads??[])]);
          if(l.owned){
            try{
              await repl(l,'await closeTab(readingPage);console.log("own finished tab closed");');
              l.owned=false;
            }catch(error){log('tab_close_pending',{slug:l.person.slug,message:error.message});}
          }
          l.person=null;l.phase='idle';l.badDownloads=[];l.input=null;
        }
      }
      if(stopping&&lanes.every(l=>!l.person))break;
      if(completed<queue.length)await sleep(12000);
    }
    const retainWork=options.collectOnly||lanes.some(l=>l.retainTab);
    log('finished',{completed,total:queue.length,stopped:stopping,deferred,...(retainWork?{preserved_work:work}:{})});
    await cleanupWork(work,retainWork);
  }finally{
    for(const l of lanes){if(l.owned&&!l.person&&!l.retainTab)await repl(l,'await closeTab(readingPage);console.log("own finished tab closed");').catch(()=>{});await l.client.close();}
    process.off('SIGINT',onInterrupt);
  }
  if(options.continuous&&!options.collectOnly&&!stopping&&queue.length&&completed===queue.length){
    if(options.bookResearch){
      let lastPending='';process.on('SIGINT',onInterrupt);
      try{for(;;){const pending=await pendingBookSlugs();if(!pending.length||stopping)break;
        const key=pending.join(',');if(key!==lastPending){log('waiting_for_books',{people:pending});lastPending=key;}
        await sleep(45000);
      }}finally{process.off('SIGINT',onInterrupt);}
    }
    if(!stopping)return main({...options,only:[],retry:[],resume:{},feedback:{},warnPronouns:false,limit:DEFAULT_BATCH_SIZE});
  }
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  main().catch(e=>{log('error',{message:e.message,code:e.code??null,reason:e.reason??null});process.exitCode=1;});
}
