import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

// 이 파일은 sw/remotion/scripts/book-person/ 에 있다. 저장소 루트는 네 단계 위다.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const env = fs.readFileSync(path.join(ROOT,'sw/web/.env'),'utf8');
const get = (k)=> (env.match(new RegExp('^'+k+'=(.*)','m'))||[])[1]?.trim();
const url=get('NEXT_PUBLIC_SUPABASE_URL');
const key=get('SUPABASE_SERVICE_ROLE_KEY');
import {createClient} from '../../../web/node_modules/@supabase/supabase-js/dist/index.mjs';
const sup=createClient(url,key);

const slugs = [
  'reed-hastings','wright-brothers','daniel-ek','andrew-carnegie','bill-gates','george-soros','larry-page','demis-hassabis','mira-murati','edward-snowden',
  'alexander-the-great','emperor-wu-of-han','napoleon-bonaparte','george-washington','li-shimin','peter-the-great','kangxi-emperor','dwight-d.-eisenhower','zhu-yuanzhang','tokugawa-ieyasu',
  'julius-caesar','constantine-i','sejong-the-great','mao-zedong','deng-xiaoping','abraham-lincoln','franklin-d.-roosevelt','adolf-hitler','benjamin-franklin','vladimir-lenin',
  'alan-turing','albert-einstein','charles-darwin','isaac-newton','michael-faraday','yoshua-bengio','geoffrey-hinton','john-von-neumann','leonardo-da-vinci','tim-berners-lee',
  'peter-thiel'
];

function humanizeReview(name, title, review){
  if(!review) return `${name}은 『${title}』을 가까이 뒀다.`;
  let t = review.trim().replace(/\s+/g,' ');
  const parts = t.split(/(?<=[.!?])\s+/);
  let s = parts.slice(0,3).join(' ');
  if(s.length > 360) s = s.slice(0,360).trim();
  if(!s.startsWith(name) && !s.includes(name) && s.startsWith('그는')) s = s.replace(/^그는/, name+'은');
  if(!/[.!]$/.test(s)) s += '.';
  return s;
}

function makeLead(name){
  const templates = [
    `${name}은 책에서 길을 찾았다.`,
    `한 권의 책이 ${name}을 움직였다.`,
    `${name}이 붙잡은 책은 따로 있었다.`,
    `책이 ${name}을 만들었다.`,
  ];
  let idx=0;
  for(let c of name) idx=(idx+c.charCodeAt(0))%templates.length;
  return templates[idx];
}

for(let slug of slugs){
  const {data: celeb} = await sup.from('celebs').select('id,nickname,headline,title,bio').eq('slug', slug).maybeSingle();
  if(!celeb){ console.log(slug,'missing'); continue; }
  const name=celeb.nickname;
  const role=(celeb.headline||celeb.title||'').trim();
  const {data: expl} = await sup.from('celeb_explanations').select('plain_text').eq('profile_id', celeb.id).maybeSingle();
  const {data: cc} = await sup.from('celeb_contents').select('content_id, review').eq('celeb_id', celeb.id);
  if(!cc || cc.length===0){ console.log(slug,'no cc'); continue; }
  const ids=cc.map(r=>r.content_id);
  const {data: locales} = await sup.from('content_locales').select('content_id,title').in('content_id', ids).eq('locale','ko');
  const locMap=new Map((locales||[]).map(l=>[l.content_id,l.title]));
  // build books with length score
  let booksAll = cc.map(r=>{
    const title = locMap.get(r.content_id) || r.content_id.slice(0,8);
    const review = (r.review||'').trim();
    const text = humanizeReview(name, title, review);
    return {title, text, len: review.length, raw: review};
  }).filter(b=>b.title);
  // pick up to 5 for 3-min length (avg 1000-1200 chars)
  booksAll.sort((a,b)=> b.len - a.len);
  const bookCount = Math.min(5, Math.max(3, booksAll.length));
  let books = booksAll.slice(0,bookCount).map(({title,text})=>({title,text}));
  // restore order by original cc order for narrative flow? keep sorted by len desc for now, but keep as is
  // intro
  let introBase = (expl?.plain_text||'').trim() || celeb.bio || '';
  // take up to 350 chars, 3 sentences
  let sentences = introBase.split(/(?<=[.!?])\s+/);
  let intro = sentences.slice(0,3).join(' ');
  if(intro.length < 80) intro = `${name}은 ${role}다. ${intro}`;
  if(intro.length > 420) intro = intro.slice(0,420);
  intro = intro.trim();
  if(!/[.!]$/.test(intro)) intro += '.';
  // remove generic filler if exists from previous run
  intro = intro.replace(/\s*그는 책에서 배운 것을 그대로 실행에 옮겼다\.\s*$/,'');

  const lead = makeLead(name);
  // fix grammar: "을" after name ending with 받침? keep simple but fix "을" -> "를" if name ends with vowel? quick fix for 리드 헤이스팅스 case: replace "을 움직였다" -> "를 움직였다" if name ends with ㅅ etc? simple string replace for that template
  let leadFixed = lead;
  if(leadFixed.includes(`${name}을 움직였다`)) leadFixed = leadFixed.replace(`${name}을`, `${name}를`);

  const script = {person:name, role, lead: leadFixed, intro, books};
  const dir = path.join(ROOT,'sw/remotion/public/book-person', slug);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'ko.json'), JSON.stringify(script,null,2)+'\n','utf8');
  const totalLen = intro.length + books.reduce((s,b)=> s+b.text.length,0) + lead.length;
  const mins = (totalLen/6.5/60).toFixed(1);
  console.log(`${slug} total ${totalLen} chars ~${mins}min books:${books.map(b=>b.title).join(', ')}`);
}
