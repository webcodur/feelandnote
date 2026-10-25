// Resolve service introduction references into temporary source text. No DB writes or models.
import fs from 'node:fs';import path from 'node:path';
import {tsImport} from 'tsx/esm/api';
import {createClient} from '../../../../packages/db/src/index.mjs';
const args=process.argv.slice(2),materials=args.find(a=>a.startsWith('--materials='))?.slice(12),out=args.find(a=>a.startsWith('--out='))?.slice(6);
if(!materials||!out||![materials,out].every(path.isAbsolute)||path.resolve(materials)===path.resolve(out)||args.some(a=>!a.startsWith('--materials=')&&!a.startsWith('--out=')))throw Error('Separate --materials=<absolute directory> --out=<absolute directory> required');
const root=path.resolve(import.meta.dirname,'../../../..');for(const f of [path.join(root,'.env'),path.join(root,'sw/web-bo/.env')])if(fs.existsSync(f))for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim().replace(/^["']|["']$/g,'');}
const {fetchBookIntroduction}=await tsImport('../../../../packages/content-search/src/book-introduction.ts',import.meta.url);
const db=createClient(process.env.NEXT_PUBLIC_DB_API_URL,process.env.DB_SECRET_KEY),read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>{const tmp=f+'.tmp';fs.writeFileSync(tmp,JSON.stringify(v,null,2));fs.renameSync(tmp,f);},marker=b=>['DAUM','KAKAO','OPEN'].includes(b.description);
fs.mkdirSync(out,{recursive:true});const cacheFile=path.join(out,'resolved-introductions.json'),cache=fs.existsSync(cacheFile)?read(cacheFile):{},inputs=fs.readdirSync(materials).filter(f=>/^\d+-material.json$/.test(f)),books=new Map();for(const f of inputs)for(const b of read(path.join(materials,f)).books??[])if(marker(b))books.set(b.content_id,b);
const rows=[];for(let i=0;i<books.size;i+=100){const {data,error}=await db.from('content_locales').select('content_id,isbn,description,sources').eq('locale','ko').in('content_id',[...books.keys()].slice(i,i+100));if(error)throw Error(JSON.stringify(error));rows.push(...data);}
const state={requested:books.size,resolved:0,blocked:[],modelCalls:0};let failures=0,daumBlocked=false;
for(const [id,book]of books){const row=rows.find(r=>r.content_id===id),reference=row&&{isbn:row.isbn,locale:'ko',source:row.description,sourceUrl:typeof row.sources?.description==='string'?row.sources.description:null};
 try{if(!reference||row.isbn!==book.isbn||row.description!==book.description)throw Error('Book reference changed since collection');let result=cache[id];if(!result||JSON.stringify(result.reference)!==JSON.stringify(reference)){if(failures>=3)throw Error('Provider lookups stopped after three consecutive failures');await new Promise(r=>setTimeout(r,1000));let fetched;
   if(!(reference.source==='DAUM'&&daumBlocked))try{fetched=await fetchBookIntroduction(reference);}catch(error){if(reference.source!=='DAUM')throw error;if(/CAPTCHA/.test(String(error)))daumBlocked=true;}
   if(!fetched?.description?.trim()&&reference.source==='DAUM')fetched=await fetchBookIntroduction({isbn:reference.isbn,locale:'ko',source:'KAKAO'});
   if(!fetched?.description?.trim())throw Error('Referenced introduction is empty');result={reference,...fetched,resolvedAt:new Date().toISOString()};cache[id]=result;write(cacheFile,cache);}failures=0;state.resolved++;}
 catch(error){failures++;state.blocked.push({content_id:id,error:String(error)});}write(path.join(out,'source-state.json'),state);
}
// Read the latest reviewed selections after network work; keep the generator's originals untouched.
for(const f of inputs){const material=read(path.join(materials,f));for(const b of material.books??[]){const r=cache[b.content_id];if(marker(b)&&r?.reference.isbn===b.isbn&&r.reference.source===b.description){b.description=r.description;b.descriptionReference={marker:r.reference.source,url:r.sourceUrl,isbn:r.reference.isbn};}}write(path.join(out,f),material);}
console.log(JSON.stringify({requested:state.requested,resolved:state.resolved,blocked:state.blocked.length,materials:inputs.length,modelCalls:0}));
