import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {database,revalidateTags} from './reading-way-argon.mjs';
import {stripMarkdownEmphasis} from './reading-way-text.mjs';
import {CACHE_TAGS,itemRevalidationTags} from '../../packages/shared/src/constants/cache-tags.ts';
import {toIsbn13} from '../../packages/content-search/src/book-isbn.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const s=x=>x==null?'NULL':"'"+String(x).replaceAll("'","''")+"'";
const j=x=>s(JSON.stringify(x))+'::jsonb';
const required=(value,label)=>{if(typeof value!=='string'||!value.trim())throw Error('Missing '+label);};
const http=value=>{try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}};
const fields=['locale','title','creator','isbn','publisher','thumbnail_url','description','sources'];

export function validatePlan(p){
  if(!/^[a-z0-9][a-z0-9.-]*$/.test(p.slug??''))throw Error('Invalid slug');
  if(!Array.isArray(p.originals)||!p.originals.length||!Array.isArray(p.relations)||!p.relations.length)throw Error('Missing originals/relations');
  for(const o of p.originals)if(!path.isAbsolute(o.path)||!/^[a-f0-9]{64}$/.test(o.sha256??''))throw Error('Invalid original reference');
  const works=p.newWorks??[],extra=p.newLocales??[],ids=new Set();
  for(const r of p.relations){required(r.content_id,'content ID');if(ids.has(r.content_id))throw Error('Duplicate relation');ids.add(r.content_id);if(!Number.isInteger(r.original_index)||!p.originals[r.original_index]||!Number.isInteger(r.book_index)||r.book_index<0)throw Error('Invalid book reference');}
  const newIds=new Set();
  for(const w of works){
    required(w.id,'new work ID');if(newIds.has(w.id)||!ids.has(w.id))throw Error('Duplicate/unlinked new work');newIds.add(w.id);if(!Array.isArray(w.locales)||w.locales.length!==2||new Set(w.locales.map(l=>l.locale)).size!==2)throw Error('New work needs KO/EN');
    // celeb-02-02 「절판」: 한영 판본을 찾지 못한 작품은 공급처 없이 만들고, 두 표시용 행에 절판 표식을 둔다.
    // celeb-02-02 「출판사 판본」: 카카오·OpenLibrary에 아직 없는 신간은 영어 출판사 판본 행과 한국어 표시용 행으로 만든다.
    if(w.external_source===null&&w.external_id===null){
      const publisherWork=w.locales.some(l=>l.sources?.primary==='publisher')&&w.locales.every(l=>l.sources?.availability!=='out_of_print');
      if(!publisherWork&&!w.locales.every(l=>l.isbn===null&&l.sources?.availability==='out_of_print'))throw Error('No-edition work needs out-of-print display rows');
      continue;
    }
    if(!['kakao_book','openlibrary'].includes(w.external_source)||toIsbn13(w.external_id)!==w.external_id||!w.locales.some(l=>l.isbn===w.external_id))throw Error('Invalid new work ISBN/source');
  }
  const rows=[...works.flatMap(w=>w.locales.map(l=>({...l,content_id:w.id}))),...extra],localeIds=new Set();
  for(const l of rows){
    if(!['ko','en'].includes(l.locale)||!ids.has(l.content_id))throw Error('Invalid locale target');
    const key=l.content_id+':'+l.locale;if(localeIds.has(key))throw Error('Duplicate locale');localeIds.add(key);
    for(const k of fields)if(!Object.hasOwn(l,k))throw Error('Missing locale field '+k);
    required(l.title,'title');required(l.creator,'creator');
    if(!l.sources||typeof l.sources!=='object'||Array.isArray(l.sources))throw Error('Missing locale sources');
    if(l.isbn==null){if(l.publisher!=null||l.thumbnail_url!=null||l.sources.primary!=='none'||!['translated','romanized','original'].includes(l.sources.title))throw Error('Invalid display title');}
    else{
      const publisherEdition=l.sources.primary==='publisher'&&l.locale==='en'&&http(l.sources.isbn)&&!(p.newLocales??[]).includes(l);
      if(toIsbn13(l.isbn)!==l.isbn||!['kakao_book','openlibrary'].includes(l.sources.primary)&&!publisherEdition)throw Error('Invalid edition');required(l.publisher,'publisher');if(l.thumbnail_url!=null&&!http(l.thumbnail_url))throw Error('Invalid cover URL');if(l.thumbnail_url==null&&l.sources.thumbnail!=='confirmed_unavailable')throw Error('Missing cover investigation');}
    if(l.description!=null){required(l.description,'description');if(!http(l.sources.description))throw Error('Missing introduction source');}
  }
  return p;
}

export function resolveBook(r,originals){
  const b=originals[r.original_index]?.books?.[r.book_index];if(!b)throw Error('Original book missing');
  const result={review:b.review_ko,review_en:b.review_en,source_url:b.source_url};
  for(const e of r.factual_edits??[]){
    if(!['review','review_en','source_url'].includes(e.field)||typeof e.from!=='string'||!e.from||typeof e.to!=='string')throw Error('Invalid factual edit');
    const t=result[e.field],quoted=JSON.stringify(e.from.slice(0,60));
    // 원본의 문단 구분은 빈 줄(\n\n)인 경우가 많다. 찾지 못함과 여러 번 나옴을 구별해 어느 수정인지 알려 준다.
    if(typeof t!=='string'||t.indexOf(e.from)<0)throw Error(`Factual edit not found in ${e.field} (book ${r.book_index}): ${quoted}`);
    if(t.indexOf(e.from)!==t.lastIndexOf(e.from))throw Error(`Factual edit is not unique in ${e.field} (book ${r.book_index}): ${quoted}`);
    result[e.field]=t.replace(e.from,e.to);
  }
  result.review=stripMarkdownEmphasis(result.review);result.review_en=stripMarkdownEmphasis(result.review_en);
  required(result.review,'Korean review');required(result.review_en,'English review');if(!http(result.source_url))throw Error('Invalid relationship source');return {...r,...result};
}

export function checkReadback(before,after,p,relations){
  if(after.person.reading_way!==before.person.reading_way||after.person.reading_way_en!==before.person.reading_way_en)throw Error('Reading-way body changed');
  if(after.relations.length!==before.relations.length+relations.length)throw Error('Unexpected shelf count');
  if(after.book_count!==before.book_count+relations.length)throw Error('Unexpected BOOK count');
  for(const r of before.relations)if(!isDeepStrictEqual(r,after.relations.find(a=>a.id===r.id)))throw Error('Existing relationship changed');
  for(const r of relations){const a=after.relations.find(a=>a.content_id===r.content_id);if(!a||a.review!==r.review||a.review_en!==r.review_en||a.source_url!==r.source_url||a.status!=='FINISHED'||a.visibility!=='public')throw Error('New relationship mismatch');}
  for(const b of before.works){const a=after.works.find(a=>a.id===b.id);if(!a)throw Error('Existing work missing');for(const k of Object.keys(b).filter(k=>!['locales','celeb_count','record_count'].includes(k)))if(!isDeepStrictEqual(b[k],a[k]))throw Error('Existing work field changed: '+k);if(a.celeb_count!==b.celeb_count+1||a.record_count!==b.record_count+1)throw Error('Existing work count mismatch');for(const l of b.locales)if(!isDeepStrictEqual(l,a.locales.find(a=>a.locale===l.locale)))throw Error('Existing locale changed');}
  for(const w of p.newWorks??[]){const a=after.works.find(a=>a.id===w.id);if(!a||a.type!=='BOOK'||a.external_id!==w.external_id||a.external_source!==w.external_source)throw Error('New work mismatch');}
  for(const l of [...(p.newWorks??[]).flatMap(w=>w.locales.map(l=>({...l,content_id:w.id}))),...p.newLocales??[]]){const a=after.works.find(a=>a.id===l.content_id)?.locales.find(a=>a.locale===l.locale);if(!a)throw Error('New locale missing');for(const k of fields)if(!isDeepStrictEqual(l[k],a[k]))throw Error('New locale mismatch: '+k);}
}

export async function applyPlan(filename,apply=false){
  if(!path.isAbsolute(filename))throw Error('Use an absolute plan path');
  const p=validatePlan(JSON.parse(await fs.readFile(filename,'utf8'))),work=path.dirname(filename),originals=[];
  for(const o of p.originals){const raw=await fs.readFile(o.path);if(createHash('sha256').update(raw).digest('hex')!==o.sha256)throw Error('Original hash changed');const d=JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));if(d.slug!==p.slug)throw Error('Wrong original person');originals.push(d);}
  const relations=p.relations.map(r=>resolveBook(r,originals)),ids=relations.map(r=>r.content_id),sqlFiles=[];
  const db=async q=>{const r=await database(q,work);sqlFiles.push(r.local);return r.text.trim();};
  const snapshot=async()=>JSON.parse(await db(`SELECT json_build_object('person',(SELECT to_jsonb(c) FROM public.celebs c WHERE slug=${s(p.slug)}),'book_count',(SELECT count(*) FROM public.celeb_contents cc JOIN public.celebs c ON c.id=cc.celeb_id JOIN public.contents b ON b.id=cc.content_id WHERE c.slug=${s(p.slug)} AND b.type='BOOK'),'relations',(SELECT COALESCE(json_agg(to_jsonb(cc)),'[]') FROM public.celeb_contents cc JOIN public.celebs c ON c.id=cc.celeb_id WHERE c.slug=${s(p.slug)}),'works',(SELECT COALESCE(json_agg(to_jsonb(b)||jsonb_build_object('locales',(SELECT COALESCE(jsonb_agg(to_jsonb(l)),'[]') FROM public.content_locales l WHERE l.content_id=b.id))),'[]') FROM public.contents b WHERE b.id IN (${ids.map(s).join(',')})));`));
  const before=await snapshot();if(!before.person||!['REAL','BOTH'].includes(before.person.celeb_reality))throw Error('Person is not REAL/BOTH');
  if(before.relations.some(r=>ids.includes(r.content_id)))throw Error('Relationship already exists; inspect current DB instead of retrying');
  const newIds=new Set((p.newWorks??[]).map(w=>w.id));
  for(const id of ids){const b=before.works.find(b=>b.id===id);if(newIds.has(id)?Boolean(b):!b||b.type!=='BOOK')throw Error('Work identity changed');if(b){const locales=new Set([...b.locales,...(p.newLocales??[]).filter(l=>l.content_id===id)].map(l=>l.locale));if(!locales.has('ko')||!locales.has('en'))throw Error(`Existing work ${id} needs KO/EN; add the missing ${locales.has('ko')?'en':'ko'} row in newLocales`);}}
  for(const l of p.newLocales??[])if(newIds.has(l.content_id)||before.works.find(b=>b.id===l.content_id)?.locales.some(a=>a.locale===l.locale))throw Error('Locale insert would overwrite an existing row');
  const isbns=[...(p.newWorks??[]).flatMap(w=>w.locales.map(l=>l.isbn)),...(p.newLocales??[]).map(l=>l.isbn)].filter(Boolean);
  if(isbns.length){const duplicates=JSON.parse(await db(`SELECT COALESCE(json_agg(row_to_json(x)),'[]') FROM (SELECT content_id,locale,isbn FROM public.content_locales WHERE isbn IN (${isbns.map(s).join(',')})) x;`));if(duplicates.length)throw Error('ISBN already exists; match the work first');}
  if(!apply){for(const f of sqlFiles)await fs.unlink(f);return {ready:true,slug:p.slug,newWorks:newIds.size,newRelations:relations.length,newLocales:(p.newLocales??[]).length};}
  let q=`BEGIN;SELECT id FROM public.celebs WHERE id=${s(before.person.id)} FOR UPDATE;`;
  const guard=(query,value,message)=>`DO $guard$ BEGIN IF (${query}) IS DISTINCT FROM ${j(value)} THEN RAISE EXCEPTION ${s(message)};END IF;END $guard$;`;
  q+=guard(`SELECT to_jsonb(c) FROM public.celebs c WHERE id=${s(before.person.id)}`,before.person,'Person changed');
  q+=`DO $guard$ BEGIN IF (SELECT count(*) FROM public.celeb_contents WHERE celeb_id=${s(before.person.id)})<>${before.relations.length} THEN RAISE EXCEPTION 'Shelf changed';END IF;END $guard$;`;
  for(const r of before.relations)q+=guard(`SELECT to_jsonb(cc) FROM public.celeb_contents cc WHERE id=${s(r.id)}`,r,'Existing relationship changed');
  for(const b of before.works){const{locales,...row}=b;q+=`SELECT id FROM public.contents WHERE id=${s(b.id)} FOR UPDATE;`+guard(`SELECT to_jsonb(b) FROM public.contents b WHERE id=${s(b.id)}`,row,'Existing work changed');for(const l of locales)q+=guard(`SELECT to_jsonb(l) FROM public.content_locales l WHERE content_id=${s(b.id)} AND locale=${s(l.locale)}`,l,'Existing locale changed');}
  if(isbns.length)q+=`DO $guard$ BEGIN IF EXISTS(SELECT 1 FROM public.content_locales WHERE isbn IN (${isbns.map(s).join(',')})) THEN RAISE EXCEPTION 'ISBN appeared during review';END IF;END $guard$;`;
  const insertLocale=(id,l)=>`INSERT INTO public.content_locales(content_id,locale,title,creator,isbn,publisher,thumbnail_url,description,sources) VALUES(${[id,l.locale,l.title,l.creator,l.isbn,l.publisher,l.thumbnail_url,l.description].map(s).join(',')},${j(l.sources)});`;
  for(const b of p.newWorks??[]){q+=`INSERT INTO public.contents(id,type,external_id,external_source) VALUES(${s(b.id)},'BOOK',${s(b.external_id)},${s(b.external_source)});`;for(const l of b.locales)q+=insertLocale(b.id,l);}
  for(const l of p.newLocales??[])q+=insertLocale(l.content_id,l);
  for(const r of relations)q+=`INSERT INTO public.celeb_contents(celeb_id,content_id,review,review_en,source_url,status,visibility) VALUES(${s(before.person.id)},${s(r.content_id)},${s(r.review)},${s(r.review_en)},${s(r.source_url)},'FINISHED','public');`;
  q+='COMMIT;';await db(q);
  const after=await snapshot();checkReadback(before,after,p,relations);
  await revalidateTags(itemRevalidationTags([{domain:CACHE_TAGS.CELEBS,id:before.person.id},{domain:CACHE_TAGS.CELEBS,id:p.slug},...ids.map(id=>({domain:CACHE_TAGS.CONTENTS,id}))],[CACHE_TAGS.CELEBS,CACHE_TAGS.CONTENTS]),p.slug);
  for(const f of sqlFiles)await fs.unlink(f);
  return {applied:true,slug:p.slug,newWorks:newIds.size,newRelations:relations.length,booksBefore:before.book_count,booksAfter:after.book_count,mainUnchanged:true,oldRelationshipsPreserved:true,exactReadback:true,cacheVerified:true};
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
  const argv=process.argv.slice(2),at=argv.indexOf('--plan');
  if(at<0||!argv[at+1]||argv.some((a,i)=>i!==at&&i!==at+1&&a!=='--apply'))throw Error('Use --plan ABSOLUTE_FILE [--apply]');
  process.loadEnvFile(path.join(root,'sw/web-bo/.env'));
  console.log(JSON.stringify(await applyPlan(argv[at+1],argv.includes('--apply'))));
}
