import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {db} from './myth-missing-20260922/prepare.mjs';
export const dir=path.join(os.tmpdir(),'feelandnote-myth-coherence-20260922');
fs.mkdirSync(dir,{recursive:true});
export const save=(name,data)=>fs.writeFileSync(path.join(dir,name),JSON.stringify(data,null,2));
export const read=name=>JSON.parse(fs.readFileSync(path.join(dir,name),'utf8'));
export async function chunks(table,select,key,ids){let out=[];for(let i=0;i<ids.length;i+=60){const r=await db.from(table).select(select).in(key,ids.slice(i,i+60));if(r.error)throw r.error;out.push(...r.data);}return out;}
if(process.argv.includes('--fetch')){
 const result=await db.from('celebs').select('id,slug,nickname,nickname_en,bio,celeb_tier,celeb_reality,created_at,publication_status').gte('created_at','2026-09-04T22:00:00Z').lt('created_at','2026-09-05T00:00:00Z');if(result.error)throw result.error;
 const extra=await db.from('celebs').select('id,slug,nickname,nickname_en,bio,celeb_tier,celeb_reality,created_at,publication_status').in('slug',['romulus','remus','ninsun','lugalbanda','onjo','biryu','utae','daeso','yuri-of-goguryeo']);if(extra.error)throw extra.error;
 const profiles=[...new Map([...result.data,...extra.data].map(p=>[p.id,p])).values()];
 const ids=profiles.map(p=>p.id);const [members,relations]=await Promise.all([chunks('faction_members','*','celeb_id',ids),chunks('figure_book_characters','*','celeb_id',ids)]);
 const bookIds=[...new Set(relations.map(r=>r.content_id))];
 const [contents,locales,editions,tags]=await Promise.all([chunks('contents','*','id',bookIds),chunks('content_locales','*','content_id',bookIds),chunks('figure_book_editions','*','content_id',bookIds),chunks('faction_lv2','*','id',[...new Set(members.map(m=>m.lv2_id))])]);
 save('before.json',{profiles,members,relations,contents,locales,editions,tags});console.log('profiles',profiles.length,'relations',relations.length,'works',contents.length,'groups',tags.length,'snapshot',dir);
 for(const t of tags){const ps=profiles.filter(p=>members.some(m=>m.celeb_id===p.id&&m.lv2_id===t.id));console.log(t.slug,t.name,ps.length);}
}
if(process.argv.includes('--books')){const s=read('before.json');for(const c of s.contents){const l=s.locales.filter(l=>l.content_id===c.id);console.log(JSON.stringify({id:c.id,meta:c.metadata?.figureBook,locales:l.map(l=>({locale:l.locale,title:l.title,creator:l.creator,isbn:l.isbn})),people:s.relations.filter(r=>r.content_id===c.id).map(r=>s.profiles.find(p=>p.id===r.celeb_id)?.slug)}));}}
