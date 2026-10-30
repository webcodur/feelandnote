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
const validSlug=s=>/^[a-z0-9][a-z0-9.-]*$/.test(s);
const DEFAULT_BATCH_SIZE=20;
const ACCESS_RECHECK_MS=15*60*1000;
// 검색 도구 없이 답한 계정은 한동안 다시 배정하지 않는다. 한 인물은 이 횟수까지만 다른 계정으로 다시 받고, 넘으면 보류한다.
const RESEARCH_TOOLS_RECHECK_MS=60*60*1000,RESEARCH_RETRY_LIMIT=2;
const researchRetries=new Map();
// 응답 글자가 이 시간 동안 늘지 않으면 탭을 한 번 새로고침하고, 그 뒤에도 늘지 않거나 대화가 사라졌으면 멈춘 것으로 본다.
// 26.10.29: 「웹 검색 중」에서 대화 주소조차 저장되지 않은 채 60~90분 머문 응답을 정상 생성으로 보고 기다렸다.
const GENERATION_STALL_MS=8*60*1000,STALL_RETRY_LIMIT=2;
// 분량 상한을 넘은 원고는 같은 대화에서 이 횟수까지 줄여 달라고 다시 요청하고, 그래도 넘으면 저장하지 않고 미룬다.
const LENGTH_RETRY_LIMIT=2;
export function lengthNotice({chars,paragraphs}){
  return `한국어 본문이 ${chars}자·${paragraphs}문단으로 룰북의 분량 상한(공백 포함 ${READING_WAY_KO_MAX_CHARS}자·${READING_WAY_MAX_PARAGRAPHS}문단 이하)을 넘습니다. 무엇을 남길지는 직접 골라 상한 안으로 줄이고 영어 본문도 같은 내용으로 맞춰주세요. 사실을 새로 더하거나 바꾸지 말고, books·unresolved가 있으면 그대로 둔 채 같은 형식의 최종 JSON 코드 블록 하나로 주세요.`;
}
const stallRetries=new Map();

export function stallAction({pending,len,lastLen,lastAt,now,reloaded}){
  if(!pending)return 'none';
  if(len!==lastLen)return 'progress';
  if(now-lastAt<GENERATION_STALL_MS)return 'wait';
  return reloaded?'stalled':'reload';
}
const blockedUntil=new Map();
const assignableProfiles=(pool,lanes,current,now=Date.now())=>pool.filter(p=>(blockedUntil.get(p.key)??0)<=now&&!lanes.some(other=>other!==current&&other.person&&other.phase!=='waiting'&&other.profile.key===p.key));
const hasNewMessageReceipt=(before,after)=>after.matched&&after.count>before.count;
const hasPendingGeneration=(state,reply)=>state.tree.includes('대답 생성 중지')||reply.pendingSearch===true;
const ARGON_HIGH_SELECTION='현재 Argon 높음 모드 사용 중';
const isArgon=state=>/현재 Argon(?: (?:낮음|보통|높음))? 모드 사용 중/.test(state.tree);
const isRetryableResponseError=state=>state.tree.includes('오류가 발생했습니다.')&&state.tree.includes('button "다시 시도"')&&!state.tree.includes('대답 생성 중지');
const isProviderRefusal=state=>(state.tree.includes('would go against my guidelines')||/저는 언어 모델일 뿐이라 (?:그것을 이해하지 못해서|그것에 필요한 정보나 능력이 없어서) 도와드릴 수가 없습니다/.test(state.tree))&&!state.tree.includes('button "코드 다운로드"')&&!state.tree.includes('textbox "Canvas 편집기"');

function accessReason(state){
  const text=state.tree;
  if(/google\.com\/sorry\/|비정상적인 트래픽|unusual traffic/i.test(text))return 'network_verification';
  if(/accounts\.google\.com\/[^\n]*challenge\/recaptcha|(?:region|checkbox) "(?:reCAPTCHA|로봇이 아닙니다|보안문자 입력)/.test(text))return 'human_verification';
  if(/Pro 구독 기간이 종료|subscription.*expired/i.test(text))return 'subscription_ended';
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

function accessError(state,message='Argon unavailable'){
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
    else if(a==='--collect-only'){out.bookResearch=true;out.collectOnly=true;}
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

function validate(p,person){
  if(p.slug!==person.slug)throw Error('Wrong output person');
  if(typeof p.ko!=='string'||typeof p.en!=='string')throw Error('Missing KO/EN strings');
  if(p.ko.includes('\uFFFD')||p.en.includes('\uFFFD')||p.ko.includes('\0')||p.en.includes('\0'))throw Error('Invalid encoding');
  if((p.ko==='')!==(p.en===''))throw Error('Inconsistent insufficient result');
  if(p.ko!==''&&(!p.ko.trim()||!p.en.trim()))throw Error('Whitespace-only body');
  const reasons=JSON.stringify(p.unresolved??[]);
  // 빈 본문의 도구 부재 사유는 조사 미달이 아니다. 본문이 있어도 실행 환경 전체의 도구가 꺼졌다고 밝혔으면
  // Argon이 원문 없이 쓴 원고다(26.10.29 u0:3: 유누스·겔싱어는 기억으로 쓴 원고, 배리모어는 빈 원고).
  if((p.ko===''&&TOOLS_UNAVAILABLE.test(reasons))||ENVIRONMENT_TOOLS_OFF.test(reasons)){
    const error=new Error('Research tools unavailable; not a research-insufficient result');error.code='RESEARCH_UNAVAILABLE';throw error;
  }
}
const TOOLS_UNAVAILABLE=/(?:외부 웹페이지 열람 및 추가 검색 도구를 호출할 수 없어|(?:웹|검색|브라우징|열람)[^。\n]{0,45}도구[^。\n]{0,35}(?:(?:사용|호출)할 수 없|호출이 제한되어|사용이 제한되어|비활성)|(?:cannot|unable to|can't)[^。\n]{0,50}(?:browse|access (?:the )?(?:web|internet)|use (?:web |search |browsing )?tools)|tools? (?:are|is) (?:disabled|unavailable))/i;
const ENVIRONMENT_TOOLS_OFF=/(?:(?:현재|이) (?:실행 )?(?:환경|세션)[^。\n]{0,40}(?:도구|열람|검색)[^。\n]{0,40}(?:비활성|호출할 수 없|사용할 수 없|제한)|도구[^。\n]{0,20}(?:비활성화|호출 한도 0)|(?:in this|current) (?:environment|session)[^。\n]{0,60}(?:cannot|unable to|can't|no access))/i;

function validateBookResearch(p){
  if(!Array.isArray(p.books)||!Array.isArray(p.unresolved))throw Error('Missing book research arrays');
  const url=value=>{try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}};
  for(const b of p.books){
    if(!['title_ko','title_en','author_ko','author_en','evidence','review_ko','review_en'].every(k=>typeof b[k]==='string'&&b[k].trim()))throw Error('Incomplete book research');
    if(!url(b.source_url)||!Array.isArray(b.source_urls)||!b.source_urls.every(url))throw Error('Invalid book evidence URLs');
  }
}

function validateResponse(p,person,booksOnly=false){
  if(!booksOnly)return validate(p,person);
  if('ko' in p||'en' in p)throw Error('Book supplement must not contain reading-way bodies');
  validate({...p,ko:'',en:''},person);
  validateBookResearch(p);
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
  if(exact.length)return exact.map(a=>a.url);
  // Korean transliterations differ (e.g. Andrew/Albert). Use a uniquely
  // matching surname only when the stored display name contains spaces.
  const surname=normalize(String(person.name).trim().split(/\s+/).at(-1));
  if(String(person.name).includes(' ')&&surname.length>=2){
    const matches=articles.filter(a=>normalize(a.title).includes(surname));
    if(matches.length===1)return [matches[0].url];
  }
  return [];
}

async function blogRanks(){
  const dir='D:/blog-assets/naver-blog';
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

async function save(person,p,work){
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

export async function revalidateTags(tags,slug){
  for(const origin of [...new Set(['http://localhost:3000',new URL(process.env.NEXT_PUBLIC_WEB_URL).origin])]){
    if(!['localhost','127.0.0.1','feelandnote.com'].includes(new URL(origin).hostname))throw Error('Unexpected cache origin');
    let r;
    try{r=await fetch(origin+revalidationApiPathForTags(tags),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag:tags,secret:process.env.CRON_SECRET}),signal:AbortSignal.timeout(30000)});}
    catch(error){
      if(localServerAbsent(origin,error)){log('local_cache_not_running',{slug,origin});continue;}
      throw Error('Cache request failed: '+origin+' ('+(error.cause?.code??error.name)+')');
    }
    const value=await r.json();
    if(!r.ok||!isCompleteCacheRevalidationResponse(value,tags))throw Error('Cache revalidation incomplete');
    log('cache_origin_revalidated',{slug,origin});
  }
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
  const lines=s.tree.split('\n').filter(x=>x.includes(role+' "')&&name.test(x)&&!x.includes('[disabled]'));
  if(lines.length!==1)throw Error('Expected one observed '+role+' '+name+', got '+lines.length);
  return lines[0].match(/\[ref=([^\]]+)\]/)[1];
}
async function click(l,r){await repl(l,`await readingPage.locator(${quote(r)}).click();console.log('clicked');`);}

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
      l.confirmedPromptPrefix=prefix;log('message_confirmed',{slug,profile:l.profile.key});return;
    }
  }
  const error=new Error('Sent user message was not confirmed; previous response will not be collected');error.code='SEND_NOT_CONFIRMED';throw error;
}

export async function ensureArgonHigh(l){
  let state;
  for(let attempt=0;attempt<12;attempt++){
    state=await snap(l);if(isArgon(state))break;
    if(attempt<11)await sleep(800);
  }
  if(!isArgon(state))throw accessError(state,'Argon is not selected');
  if(!state.tree.includes(ARGON_HIGH_SELECTION)){
    await click(l,ref(state,'button',/모드 선택 도구 열기/));
    state=await snap(l);
    await click(l,ref(state,'menuitem',/menuitem "사고 수준"/));
    state=await snap(l);
    await click(l,ref(state,'menuitem',/menuitem "높음 매우 철저함"/));
    for(let attempt=0;attempt<8;attempt++){
      state=await snap(l);if(state.tree.includes(ARGON_HIGH_SELECTION))break;
      await sleep(500);
    }
  }
  if(!state.tree.includes(ARGON_HIGH_SELECTION))throw Error('Argon High thinking was not confirmed; request not sent');
  l.thinkingVerified=true;
  log('thinking_confirmed',{slug:l.person?.slug,profile:l.profile?.key,level:'high'});
  return state;
}

async function submit(l,person,articles,rules,resume,warnPronouns=false){
  if(l.owned)await repl(l,'await closeTab(readingPage);console.log("own previous tab closed");');
  if(resume){
    const tabs=JSON.parse(await repl(l,'console.log(JSON.stringify(await listBrowserTabs()));'));
    const own=tabs.find(t=>t.url===resume);
    await repl(l,own?`var readingPage=await attachBrowserTab(${quote(own.targetId)});console.log('resumed own tab');`:`var readingPage=await openTab(${quote(resume)});console.log('resumed own conversation');`);
    l.owned=true;l.person=person;l.started=Date.now();l.phase='generating';l.lengthRetries=0;l.noticePending=warnPronouns||!!person.revisionFile;l.incompleteResponse=false;l.confirmedPromptPrefix=null;l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;
    log('resumed',{slug:person.slug,url:resume,lane:l.index,profile:l.profile.key});return;
  }
  // Factual feedback is already included in the new conversation attachment.
  l.noticePending=false;
  const app=l.profile.authuser===0?'https://gemini.google.com/app?hl=ko':`https://gemini.google.com/u/${l.profile.authuser}/app?hl=ko`;
  await repl(l,`var readingPage=await openTab(${quote(app)});console.log('opened');`);l.owned=true;
  let s,modelSelectionAttempted=false;
  for(let i=0;i<8;i++){
    s=await snap(l);if(isArgon(s))break;
    if(i<2&&s.tree.includes('ERR_CONNECTION_CLOSED'))await click(l,ref(s,'button',/새로고침/));
    if(!modelSelectionAttempted&&s.tree.includes('모드 선택 도구 열기')){
      modelSelectionAttempted=true;
      await click(l,ref(s,'button',/모드 선택 도구 열기/));
      let argon;
      for(let attempt=0;attempt<6;attempt++){
        s=await snap(l);
        const line=s.tree.match(/[^\n]*menuitem "[^"\n]*Argon[^\n]*/)?.[0];
        if(line?.includes('[disabled]'))throw accessError(s);
        argon=line?.match(/\[ref=([^\]]+)\]/)?.[1];
        if(argon)break;
        await sleep(600);
      }
      if(!argon)throw accessError(s);
      await click(l,argon);
    }
    await sleep(800);
  }
  if(!isArgon(s)||!s.tree.includes('Pro'))throw accessError(s,'Pro Argon is not selected');
  s=await ensureArgonHigh(l);
  // A fresh conversation has no response headings or prior user messages.
  if(s.tree.includes('heading "Gemini의 응답"')||s.tree.includes('말씀하신 내용'))throw Error('Not a fresh conversation');
  const civic=matchingArticle(person,articles);
  const links=[...new Set([...civic,...person.sources.filter(u=>/^https?:\/\//.test(u))])].slice(0,l.bookResearch?8:5);
  rules=await argonText(rulebook);
  const identity={slug:person.slug,name:person.name,name_en:person.name_en,gender:person.gender===true?'남성':person.gender===false?'여성':'미상',birth_date:person.birth_date,death_date:person.death_date,profession:person.profession};
  const bookRequest=l.bookResearch?`\n${person.bookScope?`이번 책장 보완 대상은 ${JSON.stringify(person.bookScope)}입니다.`:"이번 독서 방식 조사에서 실제 감상 관계를 확인한 책을 함께 전달해주세요."} 이 책들의 관계 근거를 직접 조사하고 아래 조사·감상경위 규칙에 따라 책별 감상배경도 완성해주세요. 독서 방식 본문에 이 책들을 모두 등장시킬 필요는 없습니다. 확인한 자료를 그대로 나열하지 말고 룰북에 따라 글을 구성해주세요.\n${await argonText(path.join(root,'docs/project/celeb/celeb-02-01-content-research.md'))}\n${await argonText(path.join(root,'docs/project/celeb/celeb-02-03-content-review.md'))}\nbooks 배열에 {title_ko,title_en,author_ko,author_en,source_url,source_urls,evidence,review_ko,review_en}을 담아주세요. evidence는 관계를 확인할 조사 내용이며 본문이 아닙니다. source_urls는 추가 근거 URL 배열입니다. 관계를 확인하지 못한 책은 {title_en,unresolved_reason}으로 unresolved 배열에 담고 감상배경을 만들지 마세요.`:'';
  const contract=l.booksOnly?`{"slug":${quote(person.slug)},"books":[],"unresolved":[]}`:l.bookResearch?`{"slug":${quote(person.slug)},"ko":"완성 한국어 본문","en":"같은 내용의 영어 본문","books":[],"unresolved":[]}`:`{"slug":${quote(person.slug)},"ko":"완성 한국어 본문","en":"같은 내용의 영어 본문"}`;
  const revision=l.bookResearch&&person.revisionFile?'\n\n'+await fs.readFile(person.revisionFile,'utf8'):'';
  const task=l.booksOnly?'이번 작업은 기존 독서 방식 본문을 수정하지 않는 책장 보완입니다. 지정한 책의 원출처를 직접 읽고 관계 근거와 한영 감상배경만 완성해주세요.':'위 링크를 직접 읽고 필요한 추가 조사도 직접 해서 이 인물의 독서 방식 글을 완성해주세요. 한국어 본문과 같은 내용의 영어 본문을 작성해주세요.';
  // 분량 축약은 새 조사 없이 저장된 본문만 다시 고르게 한다. 남길 장면은 Argon이 정한다.
  const shortenPacket=l.shorten?`인물: ${JSON.stringify(identity)}\n\n${rules}\n\n현재 저장된 독서 방식 본문입니다.\n[한국어]\n${person.ko}\n\n[영어]\n${person.en}\n\n이 본문은 룰북의 분량 상한(공백 포함 ${READING_WAY_KO_MAX_CHARS}자·${READING_WAY_MAX_PARAGRAPHS}문단 이하)을 넘습니다. 새 조사 없이 이 본문 안에서 남길 장면을 직접 골라 상한 안으로 줄이고, 영어 본문도 같은 내용으로 맞춰주세요. 사실을 새로 더하거나 바꾸지 마세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요.\n응답은 다운로드할 수 있는 JSON 코드 블록 하나로 주세요: ${contract}. 설명·검수 보고·출처 표시는 본문 밖에도 덧붙이지 마세요.`:null;
  const packet=shortenPacket??`인물: ${JSON.stringify(identity)}\n참조 링크: ${JSON.stringify(links)}\n\n${rules}${bookRequest}${revision}\n\n${task} 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 문장과 구성, 분량은 분량 상한(한국어 본문 공백 포함 ${READING_WAY_KO_MAX_CHARS}자·${READING_WAY_MAX_PARAGRAPHS}문단 이하) 안에서 직접 결정하고 스스로 최종 점검해주세요.\n응답은 다운로드할 수 있는 JSON 코드 블록 하나로 주세요: ${contract}.${l.booksOnly?' ko와 en 필드는 만들지 마세요.':' 조사 결과 독립된 글을 쓸 수 없으면 두 본문을 모두 빈 문자열로 주세요.'} 설명·검수 보고·출처 표시는 본문 밖에도 덧붙이지 마세요.`;
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
  const instruction=l.shorten?'첨부한 룰북과 현재 본문으로 분량 상한에 맞게 줄인 독서 방식 원고를 완성해주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 지정한 JSON 코드 블록 하나로 주세요.':l.booksOnly?'첨부한 요청과 룰북, 참조 링크로 책장 보완 대상만 직접 조사하고 한영 감상배경을 완성해주세요. 독서 방식 본문은 작성하지 마세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 지정한 JSON 코드 블록 하나로 주세요.':'첨부한 룰북과 참조 링크로 직접 조사하고 독서 방식 원고를 완성해주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 지정한 JSON 코드 블록 하나로 주세요.';
  await repl(l,`await readingPage.locator(${quote(inputRef)}).fill(${quote(instruction)});await readingPage.locator(${quote(inputRef)}).press('Space');console.log('prepared');`);
  let present=false;
  for(let attempt=0;attempt<10&&!present;attempt++){
    present=JSON.parse(await repl(l,`console.log(JSON.stringify(await readingPage.evaluate(()=>document.body.innerText.includes(${quote(path.basename(l.input,'.txt'))}))));`));
    if(!present)await sleep(1000);
  }
  if(!present)throw Error('Current input attachment missing');
  await ensureArgonHigh(l);
  // This send selector and document file input were inspected in the Argon pilot.
  await sendConfirmed(l,instruction,person.slug);
  l.person=person;l.started=Date.now();l.phase='generating';l.inputHash=hash(packet);l.responseRetries=0;l.lengthRetries=0;l.incompleteResponse=false;l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;
  log('submitted',{slug:person.slug,civic:civic.length,links:links.length,lane:l.index,profile:l.profile.key});
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
  const currentReply=JSON.parse(await repl(l,`console.log(JSON.stringify(await readingPage.evaluate(()=>{const q=Array.from(document.querySelectorAll('user-query')).at(-1),r=Array.from(document.querySelectorAll('model-response')).at(-1);return {afterPrompt:!!q&&!!r&&!!(q.compareDocumentPosition(r)&Node.DOCUMENT_POSITION_FOLLOWING),matched:!${quote(l.confirmedPromptPrefix??'')}||(q?.innerText??'').includes(${quote(l.confirmedPromptPrefix??'')}),hasCode:!!r?.querySelector('pre'),pendingSearch:(r?.innerText??'').replace(/\\s/g,'')==='웹검색중Gemini의응답',len:(r?.innerText??'').length};})));`));
  const pending=hasPendingGeneration(s,currentReply);
  const stall=stallAction({pending,len:currentReply.len,lastLen:l.progressLen,lastAt:l.progressAt??l.started,now:Date.now(),reloaded:l.stallReloaded});
  if(stall==='progress'){l.progressLen=currentReply.len;l.progressAt=Date.now();}
  else if(stall==='reload'){
    await repl(l,'await readingPage.reload();console.log("stalled response tab reloaded");');await sleep(10000);
    const after=JSON.parse(await repl(l,'console.log(JSON.stringify(await readingPage.evaluate(()=>location.href)));'));
    l.stallReloaded=true;l.progressAt=Date.now();l.progressLen=undefined;
    log('generation_stall_reload',{slug:l.person.slug,url:after,profile:l.profile.key});
    if(!/\/app\/[a-f0-9]+/.test(after)){const error=new Error('Stalled response; conversation was not saved');error.code='GENERATION_STALLED';error.url=after;throw error;}
    return null;
  }
  else if(stall==='stalled'){const error=new Error('Response made no progress after reload');error.code='GENERATION_STALLED';error.url=currentUrl;throw error;}
  if(Date.now()-l.started>25*60*1000){
    if(pending){l.started=Date.now();log('generation_still_running',{slug:l.person.slug,url:currentUrl});}
    else if(l.incompleteResponse){const error=new Error('Response JSON remained incomplete; conversation retained');error.code='INCOMPLETE_RESPONSE';error.url=currentUrl;throw error;}
    else throw accessError(s,'Response finished without a downloadable result');
  }
  const response=s.tree.lastIndexOf('heading "Gemini의 응답"');
  if(pending||response<0||response<s.tree.lastIndexOf('말씀하신 내용'))return null;
  if(!isArgon(s))throw accessError(s,'Model changed');
  // High is verified immediately before sending. The account's current mode
  // button can reset when another chat opens; it is not the saved response's setting.
  if(isRetryableResponseError(s)){
    if((l.responseRetries??0)>=2)throw accessError(s,'Repeated Argon response error');
    s=await ensureArgonHigh(l);
    await click(l,ref(s,'button',/button "다시 시도"/));
    l.responseRetries=(l.responseRetries??0)+1;l.started=Date.now();l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;
    log('retry_response',{slug:l.person.slug,profile:l.profile.key,attempt:l.responseRetries});return null;
  }
  if(l.noticePending){
    s=await ensureArgonHigh(l);
    // Gemini renders pasted line breaks as separate paragraphs. Aside's fill
    // then rejects the doubled innerText breaks before the message is sent.
    const notice=(l.person.revisionFile?await fs.readFile(l.person.revisionFile,'utf8'):'대명사를 주의해주세요. 남성은 그, 여성은 그녀로 구분하며 그 인물이 아닌 다른 사람을 가리킬 때는 그 사람의 성별을 따릅니다. 영어 he/she도 구분해주세요. 방금 작성한 원고는 대명사 오류만 확인하고 필요한 곳만 고쳐주세요. 나머지 내용과 구성은 유지하고 같은 slug, ko, en을 담은 최종 JSON 코드 블록 하나로 주세요.').replace(/\r\n?|\n/g,' ').trim();
    const input=ref(s,'textbox',/Gemini 프롬프트 입력/);
    await repl(l,`await readingPage.locator(${quote(input)}).fill(${quote(notice)});await readingPage.locator(${quote(input)}).press('Space');console.log('pronoun notice prepared');`);
    await sendConfirmed(l,notice,l.person.slug);
    l.noticePending=false;l.started=Date.now();l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;log(l.person.revisionFile?'factual_feedback_sent':'pronoun_notice_sent',{slug:l.person.slug});return null;
  }
  if(isProviderRefusal(s)){
    const error=new Error('Provider declined this request; not a research-insufficient result');error.code='PROVIDER_REFUSAL';error.url=currentUrl;throw error;
  }
  const lines=s.tree.split('\n');
  if(!currentReply.afterPrompt||!currentReply.matched)return null;
  const code=lines.filter(x=>x.includes('generic "{')&&x.includes('[ref=')).at(-1);
  const dl=lines.filter(x=>x.includes('button "코드 다운로드"')).at(-1);
  const canvas=lines.find(x=>x.includes('textbox "Canvas 편집기"'));
  let sourceRef,downloadRef;
  if(canvas&&!currentReply.hasCode&&(!code||s.tree.indexOf(canvas)>s.tree.lastIndexOf(code))){
    sourceRef=canvas.match(/\[ref=([^\]]+)\]/)[1];
    l.uiOriginal=await repl(l,`console.log(JSON.stringify(await readingPage.locator(${quote(sourceRef)}).innerText()));`);
    await click(l,ref(s,'button',/내보내기/));
    downloadRef=ref(await snap(l),'menuitem',/\.(?:txt|md)/);
  }else if(dl){
    // Short JSON blocks have no interactive AX generic. PRE under this
    // download component was inspected in the live Argon DOM.
    l.uiOriginal=await repl(l,"console.log(JSON.stringify(await readingPage.locator('model-response').last().locator('.formatted-code-block-internal-container pre').last().innerText()));");
    downloadRef=dl.match(/\[ref=([^\]]+)\]/)[1];
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
  const output=path.join(l.dir,l.person.slug+'-argon-'+Date.now()+'.json');
  await repl(l,'await readingPage.bringToFront();console.log("focused own download");');
  const defaultDownloadPath=JSON.parse(await repl(l,`var ownDownloadPromise=readingPage.waitForEvent('download');await readingPage.locator(${quote(downloadRef)}).click();var ownDownload=await ownDownloadPromise;var ownDownloadPath=await ownDownload.path();await ownDownload.saveAs(${quote(output)});console.log(JSON.stringify(ownDownloadPath));`));
  const raw=await fs.readFile(output,'utf8');
  if(raw.replace(/\s+/g,' ').trim()!==body.replace(/\s+/g,' ').trim()){
    log('download_mismatch',{slug:l.person.slug,download_path:defaultDownloadPath});l.badDownloads??=[];l.badDownloads.push(output);return null;
  }
  await removeVerifiedDownloadCopy(defaultDownloadPath,output);
  const p=parseOriginal(raw);
  try{validateResponse(p,l.person,l.booksOnly);if(l.bookResearch)validateBookResearch(p);}
  catch(error){if(error.code==='RESEARCH_UNAVAILABLE'){l.badDownloads??=[];l.badDownloads.push(output);}throw error;}
  if(l.shorten&&!p.ko.trim())throw Error('Shortened body is empty');
  const excess=l.booksOnly?null:readingWayLengthExcess(p.ko);
  if(excess){
    // 상한을 넘은 원고는 저장하지 않는다. 같은 대화에서 줄여 달라고 하고, 횟수를 넘기면 마지막 원고를 남긴 채 미룬다.
    if((l.lengthRetries??0)>=LENGTH_RETRY_LIMIT){const error=new Error(`Body exceeds length cap after retries (${excess.chars} chars, ${excess.paragraphs} paragraphs)`);error.code='LENGTH_EXCEEDED';error.url=currentUrl;throw error;}
    l.badDownloads??=[];l.badDownloads.push(output);
    s=await ensureArgonHigh(l);
    const notice=lengthNotice(excess),input=ref(s,'textbox',/Gemini 프롬프트 입력/);
    await repl(l,`await readingPage.locator(${quote(input)}).fill(${quote(notice)});await readingPage.locator(${quote(input)}).press('Space');console.log('length notice prepared');`);
    await sendConfirmed(l,notice,l.person.slug);
    l.lengthRetries=(l.lengthRetries??0)+1;l.started=Date.now();l.progressLen=undefined;l.progressAt=undefined;l.stallReloaded=false;
    log('length_notice_sent',{slug:l.person.slug,chars:excess.chars,paragraphs:excess.paragraphs,attempt:l.lengthRetries});return null;
  }
  return {p,output,sha256:hash(raw),url:currentUrl};
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

async function selfTest(){
  const {strict:assert}=await import('node:assert');
  assert.deepEqual(parseOriginal('```json\n{"slug":"a","ko":"x\\ny","en":"z"}\n```[cite: 1]'),{slug:'a',ko:'x\ny',en:'z'});
  assert.throws(()=>parseOriginal('{"ko":"a"} arbitrary prose'));
  assert.throws(()=>validate({slug:'other',ko:'x',en:'y'},{slug:'a'}));
  assert.throws(()=>validate({slug:'a',ko:'',en:'y'},{slug:'a'}));
  assert.throws(()=>validate({slug:'a',ko:'\uFFFD',en:'y'},{slug:'a'}));
  validate({slug:'a',ko:'',en:''},{slug:'a'});
  assert.equal(sql("a'b"),"'a''b'");assert.equal(sql(null),'NULL');
  assert.deepEqual(matchingArticle({name:'A B',aliases:[]},[{title:'books A B',url:'https://example.com'}]),['https://example.com']);
  assert.deepEqual(matchingArticle({name:'앤드류 카네기',aliases:[]},[{title:'앤드루 카네기',url:'https://example.com'}]),['https://example.com']);
  assert.deepEqual(matchingArticle({name:'앨리스 스미스',aliases:[]},[{title:'존 스미스',url:'https://example.com/1'},{title:'메리 스미스',url:'https://example.com/2'}]),[]);
  assert.equal(localServerAbsent('http://localhost:3000',{cause:{code:'ECONNREFUSED'}}),true);
  assert.equal(localServerAbsent('https://feelandnote.com',{cause:{code:'ECONNREFUSED'}}),false);
  assert.equal(localServerAbsent('http://localhost:3000',{cause:{code:'ETIMEDOUT'}}),false);
  assert.equal(isArgon({tree:'현재 Argon 모드 사용 중'}),true);
  assert.equal(isArgon({tree:ARGON_HIGH_SELECTION}),true);
  assert.equal(isArgon({tree:'현재 Argon 낮음 모드 사용 중'}),true);
  assert.equal(isArgon({tree:'현재 Argon 보통 모드 사용 중'}),true);
  assert.equal(isArgon({tree:'현재 Flash-Lite 모드 사용 중'}),false);
  assert.equal(args(['--book-research']).bookResearch,true);
  assert.throws(()=>validateBookResearch({}));
  assert.equal(args(['--shorten']).shorten,true);assert.equal(args(['--shorten']).bookResearch,false);
  assert.throws(()=>args(['--shorten','--book-research']));
  assert.match(lengthNotice({chars:2100,paragraphs:5}),new RegExp(`2100자·5문단.*${READING_WAY_KO_MAX_CHARS}자·${READING_WAY_MAX_PARAGRAPHS}문단`));
  assert.throws(()=>validateBookResearch({books:[{title_en:'x'}],unresolved:[]}));
  validateBookResearch({books:[],unresolved:[]});
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
  assert.equal(accessError({tree:'Pro Argon is not selected'}).resetAt,undefined);
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
  assert.throws(()=>parseOriginal('{"slug":"x","ko":"incomplete'));
  assert.deepEqual(parseOriginal('{"slug":"x","ko":"완성","en":"complete"}'),{slug:'x',ko:'완성',en:'complete'});
  assert.equal(hasNewMessageReceipt({count:1,matched:false},{count:1,matched:true}),false);
  assert.equal(hasNewMessageReceipt({count:1,matched:false},{count:2,matched:false}),false);
  assert.equal(hasNewMessageReceipt({count:1,matched:false},{count:2,matched:true}),true);
  assert.equal(hasNewMessageReceipt({count:1,matched:true},{count:2,matched:true}),true);
  assert.equal(hasNewMessageReceipt({count:1,matched:true},{count:0,matched:false}),false);
  assert.equal(stallAction({pending:false,len:5,lastLen:5,lastAt:0,now:1e9,reloaded:false}),'none');
  assert.equal(stallAction({pending:true,len:30,lastLen:17,lastAt:0,now:1e9,reloaded:false}),'progress');
  assert.equal(stallAction({pending:true,len:17,lastLen:17,lastAt:0,now:GENERATION_STALL_MS-1,reloaded:false}),'wait');
  assert.equal(stallAction({pending:true,len:17,lastLen:17,lastAt:0,now:GENERATION_STALL_MS+1,reloaded:false}),'reload');
  assert.equal(stallAction({pending:true,len:17,lastLen:17,lastAt:0,now:GENERATION_STALL_MS+1,reloaded:true}),'stalled');
  assert.equal(hasPendingGeneration({tree:'button "대답 생성 중지"'},{}),true);
  assert.equal(hasPendingGeneration({tree:'heading "Gemini의 응답"'},{pendingSearch:true}),true);
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
  assert.equal(args(['--collect-only']).bookResearch,true);
  assert.equal(args(['--collect-only']).collectOnly,true);
  assert.throws(()=>args(['--collect-only','--continuous']));
  assert.throws(()=>args(['--collect-only','--books-only','--only','a']));
  validateResponse({slug:'a',books:[],unresolved:[]},{slug:'a'},true);
  assert.throws(()=>validateResponse({slug:'a',ko:'',en:'',books:[],unresolved:[]},{slug:'a'},true));
  assert.throws(()=>validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'I cannot browse the web in this environment.'}]},{slug:'a'},true),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validateResponse({slug:'a',books:[],unresolved:[{unresolved_reason:'현재 세션에서 외부 웹페이지 열람 및 검색 도구 호출이 제한되어 있어 원문을 확인할 수 없음.'}]},{slug:'a'},true),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validate({slug:'a',ko:'',en:'',unresolved:[{unresolved_reason:'웹 검색 도구 사용이 제한되어 있어 원문을 확인할 수 없음.'}]},{slug:'a'}),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validate({slug:'a',ko:'',en:'',unresolved:[{unresolved_reason:'외부 웹 검색 및 URL 열람 도구가 비활성화되어 참조 링크의 원문과 개별 도서의 감상 근거를 직접 확인할 수 없습니다.'}]},{slug:'a'}),{code:'RESEARCH_UNAVAILABLE'});
  assert.throws(()=>validate({slug:'a',ko:'원문',en:'Text',unresolved:[{unresolved_reason:'현재 실행 환경에서 외부 웹 열람 도구가 비활성화(호출 한도 0)되어 참조 링크의 원문을 대조할 수 없으므로 미해결로 분류함.'}]},{slug:'a'}),{code:'RESEARCH_UNAVAILABLE'});
  validate({slug:'a',ko:'원문',en:'Text',unresolved:[{unresolved_reason:'링크드인 아티클의 나머지 도서는 원문 열람 제한으로 개별 제목을 특정하지 못함.'}]},{slug:'a'});
  assert.equal(argonSections('운영\n<!-- argon -->\n규칙 1\n<!-- /argon -->\n실행자\n<!-- argon -->\n규칙 2\n<!-- /argon -->\n'),'규칙 1\n\n규칙 2');
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
  const rank=p=>options.feedback[p.slug]||options.retry.includes(p.slug)?-1:ranks.get(p.slug)===0?0:p.view_count>0?1:ranks.get(p.slug)===2?2:p.influence>0?3:4;
  people.sort((a,b)=>rank(a)-rank(b)||b.view_count-a.view_count||b.influence-a.influence||a.slug.localeCompare(b.slug));
  const queue=people.slice(0,options.limit);
  for(const person of queue)if(options.feedback[person.slug])person.revisionFile=options.feedback[person.slug];
  log('selected',{pid:process.pid,count:queue.length,civic_articles:articles.length,people:queue.map(p=>({slug:p.slug,priority:rank(p),civic:matchingArticle(p,articles).length}))});
  if(!options.apply){await cleanupFiles((await fs.readdir(work)).map(f=>path.join(work,f)));return;}
  const rules=await argonText(rulebook);
  const lanes=[];
  for(let index=0;index<Math.min(2,queue.length);index++){
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
    for(;;){
      if(!assignableProfiles([l.profile],lanes,l).length&&!await assignProfile(l,person))return;
      try{await submit(l,person,articles,rules,resume,warning);return;}
      catch(error){
        if(error.code==='SEND_NOT_CONFIRMED'){deferred.push(person.slug);log('person_deferred',{slug:person.slug,message:error.message,input:l.input});l.person=null;l.phase='idle';return;}
        if(error.code!=='ARGON_UNAVAILABLE')throw error;
        if(!await rotate(l,person,error))return;resume=undefined;warning=false;
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
          if(Date.now()>=l.retryAt){const person=l.person;if(await assignProfile(l,person))await start(l,person);}
          continue;
        }
        if(l.phase==='generating'){
          let artifact;
          try{artifact=await collect(l);}
          catch(error){
            if(error.code==='GOOGLE_VERIFICATION_REQUIRED')throw error;
            if(error.code==='RESEARCH_UNAVAILABLE'&&(researchRetries.get(l.person.slug)??0)<RESEARCH_RETRY_LIMIT){
              // 그 계정의 Gemini가 검색 도구 없이 답한 것이다. 같은 계정에 바로 다시 보내지 않고 계정을 잠시 쉬게 한 뒤 다른 계정의 새 대화로 다시 받는다.
              const person=l.person,attempt=(researchRetries.get(person.slug)??0)+1;researchRetries.set(person.slug,attempt);
              log('research_unavailable',{slug:person.slug,profile:l.profile.key,url:error.url??l.conversationUrl,attempt});
              await cleanupFiles([l.input,...(l.badDownloads??[])]);l.input=null;l.badDownloads=[];
              if(await rotate(l,person,{reason:'research_tools_unavailable',message:error.message,resetAt:Date.now()+RESEARCH_TOOLS_RECHECK_MS}))await start(l,person);continue;
            }
            if(error.code==='GENERATION_STALLED'&&(stallRetries.get(l.person.slug)??0)<STALL_RETRY_LIMIT){
              // 응답이 새로고침 뒤에도 늘지 않았다. 그 계정을 15분 쉬게 하고 다른 계정의 새 대화로 다시 보낸다.
              const person=l.person,attempt=(stallRetries.get(person.slug)??0)+1;stallRetries.set(person.slug,attempt);
              log('generation_stalled',{slug:person.slug,profile:l.profile.key,url:error.url??l.conversationUrl,attempt});
              await cleanupFiles([l.input,...(l.badDownloads??[])]);l.input=null;l.badDownloads=[];
              if(await rotate(l,person,{reason:'generation_stalled',message:error.message,resetAt:Date.now()+ACCESS_RECHECK_MS}))await start(l,person);continue;
            }
            if(error.code!=='ARGON_UNAVAILABLE'){
              deferred.push(l.person.slug);log('person_deferred',{slug:l.person.slug,url:error.url??l.conversationUrl,message:error.message,input:l.input});
              if(['PROVIDER_REFUSAL','RESEARCH_UNAVAILABLE'].includes(error.code))await cleanupFiles([l.input,...(l.badDownloads??[])]);
              l.person=null;l.phase='idle';l.input=null;l.badDownloads=[];continue;
            }
            log('rejected_model',{slug:l.person.slug,profile:l.profile.key});
            const person=l.person;
            if(await rotate(l,person,error))await start(l,person);continue;
          }
          if(!artifact)continue;
          if(hash(await fs.readFile(artifact.output,'utf8'))!==artifact.sha256)throw Error('Original changed');
          if(!l.booksOnly&&!options.collectOnly)await save(l.person,artifact.p,work);l.artifact=artifact;l.phase='saved';
        }
        if(l.phase==='saved'){
          for(let attempt=0;!l.booksOnly&&!options.collectOnly;attempt++){
            try{await revalidate(l.person);break;}
            catch(error){if(attempt===2)throw error;log('retry_cache',{slug:l.person.slug,attempt:attempt+1});await sleep(2000);}
          }
          if(options.collectOnly)log('draft_ready',{slug:l.person.slug,url:l.artifact.url,...(l.shorten?{output:l.artifact.output,sha256:l.artifact.sha256}:{}),completed:++completed,total:queue.length});
          else if(l.booksOnly)log('books_ready',{slug:l.person.slug,url:l.artifact.url,completed:++completed,total:queue.length});
          else log('published',{slug:l.person.slug,ko_chars:l.artifact.p.ko.length,en_chars:l.artifact.p.en.length,insufficient:l.artifact.p.ko==='',exact_readback:true,url:l.artifact.url,completed:++completed,total:queue.length});
          if(l.bookResearch){
            log('books_pending',{slug:l.person.slug,count:l.artifact.p.books.length,unresolved:l.artifact.p.unresolved.length,output:l.artifact.output,sha256:l.artifact.sha256,url:l.artifact.url});
          }
          await cleanupFiles([l.input,...(l.bookResearch||l.shorten?[]:[l.artifact.output]),...(l.badDownloads??[])]);
          l.person=null;l.phase='idle';l.badDownloads=[];l.input=null;
        }
      }
      if(stopping&&lanes.every(l=>!l.person))break;
      if(completed<queue.length)await sleep(12000);
    }
    log('finished',{completed,total:queue.length,stopped:stopping,deferred});
    await cleanupFiles((await fs.readdir(work)).map(f=>path.join(work,f)));
  }finally{
    for(const l of lanes){if(l.owned&&!l.person)await repl(l,'await closeTab(readingPage);console.log("own finished tab closed");').catch(()=>{});await l.client.close();}
    process.off('SIGINT',onInterrupt);
  }
  if(options.continuous&&!stopping&&queue.length&&completed===queue.length){
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
