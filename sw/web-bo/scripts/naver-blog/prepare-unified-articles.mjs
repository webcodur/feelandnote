// Read-only service extraction + deterministic composition. No model/browser calls.
// node scripts/naver-blog/prepare-unified-articles.mjs --out=<OS temp dir> --ids=<logNo,...>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient} from '../../../../packages/db/src/index.mjs';
import {ASSETS} from '../blog-assets.mjs';
import {parseRevisionBody} from './apply-institution-revisions.mjs';
import {compileUnifiedArticle,renderUnifiedArticle,UNIFIED_ARTICLE} from './lib/unified-article.mjs';
const root=path.resolve(import.meta.dirname,'../../../..'),assets=path.join(ASSETS,'naver-blog');
for(const f of [path.join(root,'.env'),path.join(root,'sw/web-bo/.env')])if(fs.existsSync(f))for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}
const db=createClient(process.env.NEXT_PUBLIC_DB_API_URL,process.env.DB_SECRET_KEY),read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const yes24Requests=new Map();
async function resolveYes24(book){
 if(!yes24Requests.has(book.content_id))yes24Requests.set(book.content_id,(async()=>{
  try{const response=await fetch('https://feelandnote.com/api/books/purchase/'+encodeURIComponent(book.content_id)+'?locale=ko&seller=yes24',{redirect:'manual',signal:AbortSignal.timeout(15000)}),location=response.headers.get('location');if(!location)return null;const target=new URL(location,response.url);if(target.protocol!=='https:'||!(target.hostname==='yes24.com'||target.hostname.endsWith('.yes24.com')))return null;
   if(/^\/Product\/Goods\/\d+\/?$/i.test(target.pathname))return{url:target.href,kind:'product',resolver:'service-purchase',resolvedAt:new Date().toISOString()};
   if(/^\/Product\/Search\/?$/i.test(target.pathname))return{url:target.href,kind:'search',resolver:'service-purchase',resolvedAt:new Date().toISOString()};
  }catch{}return null;
 })());return yes24Requests.get(book.content_id);
}
async function query(q){const {data,error}=await q;if(error)throw Error(JSON.stringify(error));return data;}
async function chunks(table,fields,key,values,filter=q=>q){const rows=[];for(let i=0;i<values.length;i+=100)rows.push(...await query(filter(db.from(table).select(fields).in(key,values.slice(i,i+100)))));return rows;}
function prepared(post){return ['celeb-revisions','revisions','remaining-institution-revisions','legacy-celeb-revisions'].flatMap(d=>{const f=path.join(assets,d,post.logNo+'.json');return fs.existsSync(f)?[{file:f,revision:read(f)}]:[];}).sort((a,b)=>Number(b.revision.editorial===true)-Number(a.revision.editorial===true))[0];}
function preparedBlurbs(source){const result=new Map();if(!source)return result;try{const p=parseRevisionBody(source.revision);for(const [i,review]of source.revision.dbReviews.entries()){const cover=p.covers[i],quote=p.quotes[i];if(!cover||!quote)continue;const text=p.operations.filter(op=>op.kind==='text'&&op.lineIndex>cover.line&&op.lineIndex<quote.line).map(op=>op.line.trim()).filter(t=>t&&!t.startsWith('[')&&t!=='책 소개').join('\n\n');if(text)result.set(review.content_id,{text,source:source.file});}}catch{}return result;}
async function personMaterial(post,source,selection){
 const pathSlug=post.url?new URL(post.url).pathname.match(/^\/celeb\/([a-z0-9.-]+)\/?$/)?.[1]:null,slug=post.slug||pathSlug||source?.revision.target?.split('/').at(-1);if(!slug||(post.slug&&pathSlug&&post.slug!==pathSlug))throw Error('Exact person service identity required');const c=await query(db.from('celebs').select('id,slug,nickname,title,profession,portrait_url').eq('slug',slug).single());
 const results=await Promise.allSettled([query(db.from('celeb_contents').select('id,celeb_id,content_id,review,source_url').eq('celeb_id',c.id).eq('visibility','public')),query(db.from('celeb_dialogues').select('lines').eq('celeb_id',c.id).maybeSingle()),query(db.from('celeb_explanations').select('plain_text').eq('profile_id',c.id).maybeSingle())]);
 for(const result of results)if(result.status==='rejected')throw result.reason;
 const guide=results[2].value?.plain_text?.trim();if(!guide)throw Error('Existing service person guide required; BIO fallback is disabled');
 const relations=results[0].value,types=await chunks('contents','id,type','id',relations.map(r=>r.content_id)),bookIds=types.filter(t=>t.type==='BOOK').map(t=>t.id),locales=await chunks('content_locales','content_id,title,creator,description,thumbnail_url,isbn','content_id',bookIds,q=>q.eq('locale','ko'));
 const blurbs=preparedBlurbs(source),preferred=[...new Set((source?.revision.dbReviews??[]).map(r=>r.content_id))],candidates=relations.filter(r=>bookIds.includes(r.content_id)&&r.review?.trim()&&r.source_url).map(r=>({...r,...locales.find(l=>l.content_id===r.content_id)})).filter(b=>b.thumbnail_url&&b.title&&b.creator).sort((a,b)=>{const ai=preferred.indexOf(a.content_id),bi=preferred.indexOf(b.content_id);return (ai<0?1e6:ai)-(bi<0?1e6:bi)||String(a.content_id).localeCompare(String(b.content_id));});
 const reusable=preferred.length===Math.min(UNIFIED_ARTICLE.maxBooks,candidates.length)&&preferred.every(id=>candidates.some(b=>b.content_id===id)),selectionPending=!selection&&!reusable&&candidates.length>UNIFIED_ARTICLE.maxBooks;const chosenIds=selection??(reusable?preferred:candidates.map(b=>b.content_id));

 if(chosenIds.some(id=>!candidates.some(b=>b.content_id===id)))throw Error('Reviewed book selection no longer matches current public service records');
 const books=chosenIds.map(id=>candidates.find(b=>b.content_id===id)).map(b=>({...b,coverUrl:b.thumbnail_url,introduction:blurbs.get(b.content_id)?.text,introductionSource:blurbs.get(b.content_id)?.source}));
 await Promise.allSettled(books.slice(0,UNIFIED_ARTICLE.maxBooks).map(async b=>{b.yes24=await resolveYes24(b);}));
 const quote=results[1].value?.lines?.quote;
 return {logNo:post.logNo,kind:'celeb',title:post.title,serviceUrl:'https://feelandnote.com/celeb/'+c.slug,subject:{id:c.id,name:c.nickname,imageUrl:c.portrait_url,profession:c.title||'',introduction:guide,introductionSource:'celeb_explanations:'+c.id+':plain_text'},books,...(typeof quote==='string'&&quote.trim()?{closingLine:{kind:'service_line',text:quote.trim()}}:{}),selection:{totalServiceBooks:bookIds.length,eligibleBooks:candidates.length,selected:books.map(b=>b.content_id),method:selectionPending?'pending':reusable?'existing-reviewed-selection':'all-service-books'}};
}
async function institutionMaterial(post,source){
 const revision=source?.revision,pathname=new URL(post.url).pathname,match=pathname.match(/^\/library\/curated\/([^/]+)\/([^/]+)$/);if(!match)throw Error('Exact curator/list service identity required');
 const curator=await query(db.from('curators').select('id,slug,name,description,logo_url').eq('slug',match[1]).single()),list=await query(db.from('curated_lists').select('id,curator_id,slug,title,description,source_url').eq('curator_id',curator.id).eq('slug',match[2]).single());
 const items=[];for(let offset=0;;offset+=1000){const page=await query(db.from('curated_list_items').select('id,content_id,raw_title,raw_creator,year,sort_order').eq('list_id',list.id).eq('hidden',false).order('sort_order',{ascending:true}).order('id',{ascending:true}).range(offset,offset+999));items.push(...page);if(page.length<1000)break;}
 const contentIds=[...new Set(items.map(i=>i.content_id).filter(Boolean))],locales=await chunks('content_locales','content_id,title,creator,description,thumbnail_url,isbn','content_id',contentIds,q=>q.eq('locale','ko')),relations=await chunks('celeb_contents','id,celeb_id,content_id,review,source_url,visibility','content_id',contentIds,q=>q.eq('visibility','public'));
 const people=await chunks('celebs','id,nickname,avatar_url,publication_status','id',[...new Set(relations.map(r=>r.celeb_id))]),blurbs=preparedBlurbs(source),preferred=[...new Set((revision?.dbReviews??[]).map(r=>r.content_id))];
 const books=contentIds.flatMap(id=>{const b=locales.find(l=>l.content_id===id),notes=relations.filter(r=>r.content_id===id&&r.review?.trim()&&r.source_url).flatMap(r=>{const p=people.find(p=>p.id===r.celeb_id&&p.publication_status==='active'&&p.avatar_url);return p?[{...r,person:{name:p.nickname,avatar_url:p.avatar_url}}]:[];});if(!b?.thumbnail_url||!notes.length)return[];const prior=(revision?.dbReviews??[]).map(r=>r.review_id??r.id);notes.sort((a,b)=>(prior.includes(a.id)?0:1)-(prior.includes(b.id)?0:1)||a.id.localeCompare(b.id));return [{...b,coverUrl:b.thumbnail_url,introduction:blurbs.get(id)?.text,introductionSource:blurbs.get(id)?.source,reviews:notes.slice(0,2)}];});
 const usablePreferred=preferred.filter(id=>books.some(b=>b.content_id===id)),reusable=usablePreferred.length===Math.min(UNIFIED_ARTICLE.maxBooks,books.length),selectionPending=!reusable&&books.length>UNIFIED_ARTICLE.maxBooks,chosen=reusable?usablePreferred.map(id=>books.find(b=>b.content_id===id)):books;
 const withYear=items.some(i=>i.year!=null),columns=withYear?['연도','작품','저자']:['작품','저자'],rows=items.map(i=>{const b=locales.find(l=>l.content_id===i.content_id),values=[b?.title||i.raw_title,b?.creator||i.raw_creator||''];return withYear?[String(i.year??''),...values]:values;});
 await Promise.allSettled(chosen.slice(0,UNIFIED_ARTICLE.maxBooks).map(async b=>{b.yes24=await resolveYes24(b);}));
 return {logNo:post.logNo,kind:'curated',title:curator.name+' · '+list.title,serviceUrl:post.url,subject:{name:curator.name,imageUrl:revision?.target===pathname&&revision?.logoAsset?.original_url||curator.logo_url,introduction:list.description||curator.description},books:chosen,fullList:{columns,rows,source:'curated_lists:'+list.id},selection:{eligibleBooks:books.length,selected:selectionPending?[]:chosen.map(b=>b.content_id),method:selectionPending?'pending':reusable?'existing-reviewed-selection':'all-eligible-books'}};
}
export async function prepareUnifiedArticles({out,ids,selections={}}){
 if(!path.isAbsolute(out))throw Error('Absolute output directory required');fs.mkdirSync(out,{recursive:true});
 const all=read(path.join(assets,'posts.json')).filter(p=>['celeb','curated'].includes(p.kind)&&['ok','check'].includes(p.link)),posts=ids?all.filter(p=>ids.includes(String(p.logNo))):all;
 if(ids&&(posts.length!==ids.length||new Set(ids).size!==ids.length))throw Error('Active post IDs differ');
 const status={version:UNIFIED_ARTICLE.version,total:posts.length,ready:[],blocked:[],modelCalls:0};
 for(let start=0;start<posts.length;start+=4){const results=await Promise.allSettled(posts.slice(start,start+4).map(async post=>{const source=prepared(post),material=post.kind==='celeb'?await personMaterial(post,source,selections[post.logNo]):await institutionMaterial(post,source);fs.writeFileSync(path.join(out,post.logNo+'-material.json'),JSON.stringify(material,null,2));const article=compileUnifiedArticle(material);fs.writeFileSync(path.join(out,post.logNo+'-article.json'),JSON.stringify(article,null,2));fs.writeFileSync(path.join(out,post.logNo+'.html'),renderUnifiedArticle(article));return{logNo:post.logNo,articleHash:article.articleHash,books:material.books.length};}));
 for(const [index,result]of results.entries())if(result.status==='fulfilled')status.ready.push(result.value);else status.blocked.push({logNo:posts[start+index].logNo,error:String(result.reason)});
 fs.writeFileSync(path.join(out,'prepare-state.json'),JSON.stringify(status,null,2));console.log(JSON.stringify({processed:status.ready.length+status.blocked.length,total:status.total,ready:status.ready.length,blocked:status.blocked.length,modelCalls:0}));
 }return status;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2),out=args.find(a=>a.startsWith('--out='))?.slice(6),ids=args.find(a=>a.startsWith('--ids='))?.slice(6).split(','),selectionFile=args.find(a=>a.startsWith('--selections='))?.slice(13);if(!out||args.some(a=>!a.startsWith('--out=')&&!a.startsWith('--ids=')&&!a.startsWith('--selections=')))throw Error('--out=<absolute OS temp dir> [--ids=id,...] [--selections=file]');await prepareUnifiedArticles({out:path.resolve(out),ids,selections:selectionFile?read(selectionFile):{}});}
