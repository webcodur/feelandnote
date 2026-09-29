import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const bo=path.resolve('sw/web-bo');
const require=createRequire(path.join(bo,'package.json'));
const {createClient}=require('@supabase/supabase-js');
const env=Object.fromEntries(readFileSync(path.join(bo,'.env'),'utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')&&l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1).trim().replace(/^["']|["']$/g,'')]}));
const db=createClient(env.NEXT_PUBLIC_DB_API_URL,env.DB_SECRET_KEY);
const id='a036c5a5-850c-43ba-ae70-f5019a06ad80';
const next={
  plain_text:'아가스티야는 고대 인도의 베다 전통과 서사시에 전하는 현자다. 《리그베다》의 여러 찬가는 전통적으로 그의 이름에 묶인다. 《마하바라타》에서는 하늘로 치솟던 빈디야 산을 낮추고 바다를 들이마시며, 《라마야나》에서는 숲의 은거지에서 라마에게 신의 활과 화살을 건넨다. 남인도의 타밀 전승은 그가 첫 타밀 문법을 세우고 싯다 의학을 열었다고 전한다. 모두 후대 전승이지, 확인된 생애 기록은 아니다.',
  plain_text_en:'Agastya is a sage of India’s Vedic and epic traditions. A group of Rigvedic hymns traditionally names him as its seer. In the Mahabharata he stills the rising Vindhya mountains and drinks the ocean; in the Ramayana he gives Rama a divine bow and arrows at his forest hermitage. Later Tamil traditions credit him with the first Tamil grammar and the origins of Siddha medicine. These are traditional attributions, not documented events in a historical life.'
};
const {data:rows,error:readError}=await db.from('celeb_explanations').select('*').eq('profile_id',id);
if(readError)throw readError;
if(rows?.length!==1)throw new Error(`expected one guide, got ${rows?.length??0}`);
const before=rows[0];
if(before.published_at!==null)throw new Error('publication drift');
if(!process.argv.includes('--apply')){console.log(JSON.stringify({before:{plain_text:before.plain_text,plain_text_en:before.plain_text_en},after:next},null,2));process.exit(0)}
writeFileSync('data/celeb/founding-myth/agastya/guide-before.json',JSON.stringify(before,null,2));
const {data:updated,error:updateError}=await db.from('celeb_explanations').update(next).eq('profile_id',id).eq('updated_at',before.updated_at).select('*');
if(updateError)throw updateError;
if(updated?.length!==1)throw new Error(`update affected ${updated?.length??0} rows`);
const {data:readback,error:readbackError}=await db.from('celeb_explanations').select('*').eq('profile_id',id).single();
if(readbackError)throw readbackError;
for(const [key,value] of Object.entries(next))if(readback[key]!==value)throw new Error(`${key} mismatch`);
for(const key of ['published_at','interpretive_title','interpretive_text','interpretive_title_en','interpretive_text_en'])if(readback[key]!==before[key])throw new Error(`${key} drift`);
writeFileSync('data/celeb/founding-myth/agastya/guide-after.json',JSON.stringify(readback,null,2));
console.log(JSON.stringify({readback:'ok',published_at:readback.published_at,interpretive_preserved:true},null,2));
