// Read-only: compare live published/reserved articles with current FINISHED book counts.
// node scripts/naver-blog/audit-book-counts.mjs [--ids=logNo,...] [--public-only] [--json]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {config} from 'dotenv';
import {createClient} from '../../../../packages/db/src/index.mjs';
import {ASSETS} from '../blog-assets.mjs';

const{load}=createRequire(new URL('../../../web/package.json',import.meta.url))('cheerio');

const BLOG_ID='dmx777', CONCURRENCY=4, TIMEOUT_MS=20000;
const RESERVED_INTERVAL_MS=2000;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const USER_AGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';
const clean=value=>String(value??'').replace(/\u200b/g,'').replace(/\s+/g,' ').trim();
const number=value=>Number(value.replaceAll(',',''));
const digits='([0-9][0-9,]*)';

export function countClaims(title,paragraphs){
 const totals=[],introduced=[];
 const titlePattern=new RegExp('(?:읽은|읽었던|추천한|선정한|독서\\s*기록\\s*[:：]?)\\s*(?:총\\s*)?'+digits+'\\s*권','gu');
 for(const match of clean(title).matchAll(titlePattern))totals.push({field:'title',count:number(match[1]),text:clean(title)});
 for(const paragraph of paragraphs){
  const text=clean(paragraph);let match;
  if((match=text.match(new RegExp('전체\\s*감상\\s*도서\\s*'+digits+'\\s*권','u'))))totals.push({field:'body-total',count:number(match[1]),text});
  else if((match=text.match(new RegExp('·\\s*'+digits+'\\s*권\\s*중\\s*'+digits+'\\s*권\\s*소개\\s*$','u')))){
   totals.push({field:'body-total',count:number(match[1]),text});introduced.push(number(match[2]));
  }else if((match=text.match(new RegExp('·\\s*도서\\s*기록\\s*'+digits+'\\s*권\\s*$','u'))))totals.push({field:'body-total',count:number(match[1]),text});
  else if((match=text.match(new RegExp('여기까지가\\s*'+digits+'\\s*권\\s*(?:가운데|중)','u'))))totals.push({field:'body-total',count:number(match[1]),text});
  if((match=text.match(new RegExp('이\\s*글에서\\s*소개한\\s*'+digits+'\\s*권\\s*외에\\s*'+digits+'\\s*권의?\\s*도서\\s*기록','u')))){
   totals.push({field:'body-total',count:number(match[1])+number(match[2]),text});introduced.push(number(match[1]));
  }
  if((match=text.match(new RegExp('이\\s*글에서\\s*'+digits+'\\s*권\\s*소개','u'))))introduced.push(number(match[1]));
 }
 return{totals,introduced:[...new Set(introduced)]};
}

export function parsePublicPost(html,logNo){
 const $=load(html),identity=$('meta[property="og:url"]').attr('content');
 let url;try{url=new URL(identity);}catch{throw Error('Public post identity missing');}
 const validHost=['blog.naver.com','m.blog.naver.com'].includes(url.hostname);
 const exactPath=url.pathname===`/${BLOG_ID}/${logNo}`;
 const exactQuery=url.pathname==='/PostView.naver'&&url.searchParams.get('blogId')===BLOG_ID&&url.searchParams.get('logNo')===String(logNo);
 if(!validHost||!(exactPath||exactQuery))throw Error('Public post identity differs');
 const body=$('.se-main-container').length?$('.se-main-container'):$('#postViewArea');
 if(body.length!==1)throw Error('Public body unavailable');
 const title=clean($('.se-documentTitle .se-text-paragraph').toArray().map(p=>$(p).text()).join(' '))||clean($('meta[property="og:title"]').attr('content'));
 if(!title)throw Error('Public title unavailable');
 const paragraphs=body.find('.se-text-paragraph').toArray().filter(p=>!$(p).closest('.se-documentTitle').length).map(p=>clean($(p).text())).filter(Boolean);
 if(!paragraphs.length)throw Error('Public body paragraphs unavailable');
 return{title,paragraphs,source:'public'};
}

export function parseReservedPost(payload,logNo,listTitle){
 if(payload?.isSuccess!==true)throw Error('Reserved post read failed');
 const meta=payload.result?.prePostFormView?.postFormMeta;
 const model=typeof payload.result?.documentModel==='string'?JSON.parse(payload.result.documentModel):payload.result?.documentModel;
 if(String(meta?.logNo)!==String(logNo)||String(model?.documentId)!==String(logNo))throw Error('Reserved post identity differs');
 const components=model.document?.components;
 if(!Array.isArray(components))throw Error('Reserved document components unavailable');
 const paragraphs=value=>{
  if(Array.isArray(value))return value.flatMap(paragraphs);
  if(!value||typeof value!=='object')return[];
  if(value['@ctype']==='paragraph')return[clean((value.nodes??[]).map(n=>n.value??'').join(''))].filter(Boolean);
  return Object.values(value).flatMap(paragraphs);
 };
 const headings=components.filter(c=>c['@ctype']==='documentTitle');
 if(headings.length!==1)throw Error('Reserved title unavailable');
 const title=clean(paragraphs(headings[0]).join(' '));
 if(!title||title!==clean(listTitle))throw Error('Reserved list and document title differ');
 const body=components.filter(c=>c['@ctype']!=='documentTitle').flatMap(paragraphs);
 if(!body.length)throw Error('Reserved body unavailable');
 return{title,paragraphs:body,source:'reserved'};
}

export function compareBookCounts(snapshot,expected,recordedTitle){
 if(!Number.isSafeInteger(expected)||expected<0)throw Error('Verified service count required');
 const claims=countClaims(snapshot.title,snapshot.paragraphs);
 const issues=claims.totals.filter(c=>c.count!==expected).map(c=>({...c,expected}));
 const missing=[];
 if(!claims.totals.some(c=>c.field==='title'))missing.push('title-total-not-found');
 if(!claims.totals.some(c=>c.field==='body-total'))missing.push('body-total-not-found');
 const recorded=countClaims(recordedTitle,[]).totals.filter(c=>c.count!==expected).map(c=>c.count);
 return{status:issues.length?'mismatch':missing.length?'unverified':'match',source:snapshot.source,
  actualTitle:snapshot.title,expected,claims:claims.totals,introduced:claims.introduced,issues,missing,
  recordedTitleCounts:[...new Set(recorded)]};
}

export function selectPersonPosts(posts,ids=null){
 const rows=posts.filter(p=>p.kind==='celeb'&&['ok','check'].includes(p.link)&&(!ids||ids.has(String(p.logNo))));
 const seen=new Set();
 return rows.map(p=>{
  const logNo=String(p.logNo);if(!/^\d+$/.test(logNo)||seen.has(logNo))throw Error('Invalid or duplicate post identity: '+logNo);seen.add(logNo);
  let urlSlug=null;
  if(p.url){const u=new URL(p.url);if(u.hostname!=='feelandnote.com')throw Error('Unexpected service host: '+logNo);urlSlug=u.pathname.match(/^\/(?:en\/)?celeb\/([^/]+)\/?$/)?.[1];}
  const slug=p.slug||urlSlug;
  if(!slug||(p.slug&&urlSlug&&p.slug!==urlSlug))throw Error('Exact service person identity required: '+logNo);
  return{...p,logNo,slug,blogUrl:`https://blog.naver.com/${BLOG_ID}/${logNo}`};
 });
}

async function mapLimit(rows,read){
 const results=new Array(rows.length);let next=0;
 await Promise.all(Array.from({length:Math.min(CONCURRENCY,rows.length)},async()=>{
  while(next<rows.length){const i=next++;results[i]=await read(rows[i],i);}
 }));return results;
}

async function publicSnapshot(post){
 for(let attempt=0;attempt<2;attempt++){
  try{
   const url=attempt===0?`https://blog.naver.com/PostView.naver?blogId=${BLOG_ID}&logNo=${post.logNo}`:`https://m.blog.naver.com/${BLOG_ID}/${post.logNo}`;
   const response=await fetch(url,{
    headers:{'user-agent':USER_AGENT,'cache-control':'no-cache'},signal:AbortSignal.timeout(TIMEOUT_MS)});
   if(!response.ok)throw Error('Public HTTP '+response.status);
   if(!['blog.naver.com','m.blog.naver.com'].includes(new URL(response.url).hostname))throw Error('Public request redirected outside the blog');
   return parsePublicPost(await response.text(),post.logNo);
  }catch(error){if(attempt===1||/^Public (?:HTTP 4|post identity|body|title)/.test(error.message))throw error;}
 }
}

export async function readReservedPayload(page,logNo,{sleep=pause}={}){
 for(let attempt=0;attempt<3;attempt++){
  const response=await page.evaluate(async({blogId,id})=>{
   const r=await fetch(`/RabbitPrePostRead.naver?blogId=${blogId}&logNo=${id}`,{signal:AbortSignal.timeout(20000)});
   return{status:r.status,retryAfter:r.headers.get('retry-after'),payload:r.ok?await r.json():null};
  },{blogId:BLOG_ID,id:logNo});
  if(response.status>=200&&response.status<300)return response.payload;
  if(response.status!==429||attempt===2)throw Error('Reserved read HTTP '+response.status);
  const after=response.retryAfter;
  const delay=after&&/^\d+$/.test(after)?Number(after)*1000:Date.parse(after)-Date.now();
  const wait=Math.max(30000,Number.isFinite(delay)?delay:0);
  console.error(`예약 글 ${logNo}: 요청 제한, ${Math.ceil(wait/1000)}초 후 재조회`);
  await sleep(wait);
 }
}

async function reservedReader(){
 const {getBrowser}=await import('./lib/browser.mjs');
 const originalLog=console.log;let connection;
 try{console.log=console.error;connection=await getBrowser({background:true,protocolTimeout:60000});}finally{console.log=originalLog;}
 const{browser,launched}=connection;let page;
 const close=async()=>{await page?.close().catch(()=>{});if(launched)await browser.close();else await browser.disconnect();};
 try{
  page=await browser.newPage();await page.goto(`https://blog.naver.com/${BLOG_ID}`,{waitUntil:'domcontentloaded',timeout:TIMEOUT_MS});
  const list=await page.evaluate(async blogId=>{
   const r=await fetch(`/PrePostList.naver?blogId=${blogId}&editorVersion=4&onlyCount=false`,{signal:AbortSignal.timeout(20000)});
   if(!r.ok)throw Error('Reserved list HTTP '+r.status);return await r.json();
  },BLOG_ID);
  if(list?.isSuccess!==true||!Array.isArray(list.result?.prePostList)||list.result.totalCount!==list.result.prePostList.length)throw Error('Complete authenticated reservation list unavailable');
  const byId=new Map(list.result.prePostList.map(p=>[String(p.logNo),p]));
  return{close,byId,read:async logNo=>{
   const row=byId.get(logNo);if(!row)throw Error('Not in the current reservation list');
   const payload=await readReservedPayload(page,logNo);
   return parseReservedPost(payload,logNo,row.title);
  }};
 }catch(error){await close();throw error;}
}

async function serviceCounts(posts){
 const root=path.resolve(import.meta.dirname,'../../../..');
 for(const file of ['sw/web-bo/.env','sw/web/.env'])config({path:path.join(root,file),quiet:true});
 if(!process.env.NEXT_PUBLIC_DB_API_URL||!process.env.DB_SECRET_KEY)throw Error('DB configuration required');
 const db=createClient(process.env.NEXT_PUBLIC_DB_API_URL,process.env.DB_SECRET_KEY);
 const slugs=[...new Set(posts.map(p=>p.slug))],people=new Map();
 for(let from=0;from<slugs.length;from+=80){
  const{data,error}=await db.from('celebs').select('id,slug,nickname,publication_status').in('slug',slugs.slice(from,from+80));
  if(error)throw Error('Person identity query failed');for(const person of data??[])people.set(person.slug,person);
 }
 const counts=new Map();
 await mapLimit(slugs,async slug=>{
  const person=people.get(slug);if(!person){counts.set(slug,{error:'Service person not found'});return;}
  try{
   const{data,error}=await db.rpc('get_celeb_type_counts',{p_celeb_id:person.id});
   if(error||!Array.isArray(data))throw Error('Service book count query failed');
   const total=Number(data.find(r=>r.content_type==='BOOK')?.total??0);
   if(!Number.isSafeInteger(total)||total<0)throw Error('Invalid service book count');
   counts.set(slug,{count:total,name:person.nickname,publicationStatus:person.publication_status});
  }catch(error){counts.set(slug,{error:error.message});}
 });return counts;
}

export async function main(args=process.argv.slice(2)){
 if(args.includes('--help')){console.log('node scripts/naver-blog/audit-book-counts.mjs [--ids=logNo,...] [--public-only] [--json]\n공개 글과 현재 예약 글의 제목·본문 총권수를 서비스의 감상함 도서 수와 대조합니다. 저장·발행하지 않습니다.\n종료 코드: 0 일치 / 1 불일치·미확인 / 2 실행 오류');return;}
 if(args.some(a=>!['--json','--public-only'].includes(a)&&!a.startsWith('--ids=')))throw Error('Unknown audit argument');
 const idsArg=args.find(a=>a.startsWith('--ids='))?.slice(6),ids=idsArg?new Set(idsArg.split(',')):null;
 const registry=JSON.parse(fs.readFileSync(path.join(ASSETS,'naver-blog/posts.json'),'utf8'));
 const posts=selectPersonPosts(registry,ids);if(!posts.length)throw Error('No person posts selected');
 if(ids&&posts.length!==ids.size)throw Error('Some requested post IDs are not active person posts');
 const counts=await serviceCounts(posts);let completed=0;
 const results=await mapLimit(posts,async post=>{
  const result={logNo:post.logNo,slug:post.slug,blogUrl:post.blogUrl,recordedTitle:post.title};
  const service=counts.get(post.slug);if(service.error)return{...result,status:'unverified',error:service.error};
  Object.assign(result,{expected:service.count,name:service.name,publicationStatus:service.publicationStatus});
  try{return{...result,...compareBookCounts(await publicSnapshot(post),service.count,post.title)};}
  catch(error){return{...result,status:'unverified',publicError:error.message};}
  finally{
   if(++completed%20===0)console.error(`공개 글 대조 ${completed}/${posts.length}`);
   await new Promise(resolve=>setTimeout(resolve,250));
  }
 });
 const fallback=results.filter(r=>r.publicError);
 if(fallback.length&&!args.includes('--public-only')){
  let reader;
  try{
   reader=await reservedReader();console.error(`예약 목록 ${reader.byId.size}편; 공개 미확인 ${fallback.length}편 대조`);
   let reservedCompleted=0;
   for(const result of fallback){
    if(!reader.byId.has(result.logNo)){result.error='Not publicly readable and absent from current reservations';continue;}
    try{Object.assign(result,compareBookCounts(await reader.read(result.logNo),result.expected,result.recordedTitle));delete result.publicError;}
    catch(error){result.error=error.message;}
    if(++reservedCompleted%10===0)console.error(`예약 글 대조 ${reservedCompleted}/${fallback.length}`);
    await pause(RESERVED_INTERVAL_MS);
   }
  }catch(error){for(const result of fallback)result.error=error.message;}
  finally{await reader?.close();}
 }
 const summary={total:results.length,published:results.filter(r=>r.source==='public').length,reserved:results.filter(r=>r.source==='reserved').length,
  match:results.filter(r=>r.status==='match').length,mismatch:results.filter(r=>r.status==='mismatch').length,
  unverified:results.filter(r=>r.status==='unverified').length,registryCountMismatch:results.filter(r=>r.recordedTitleCounts?.length).length};
 const report={checkedAt:new Date().toISOString(),basis:'get_celeb_type_counts / BOOK / FINISHED',summary,results};
 if(args.includes('--json'))console.log(JSON.stringify(report));
 else{
  console.log(JSON.stringify(summary));
  for(const row of results.filter(r=>r.status!=='match'||r.recordedTitleCounts?.length))console.log(JSON.stringify(row));
 }
 if(summary.mismatch||summary.unverified||summary.registryCountMismatch)process.exitCode=1;
 return report;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=2;});
