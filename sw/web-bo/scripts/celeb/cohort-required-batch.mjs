// Oct 8 Korean cohort, user-authorized background batch. Final data: DB/R2.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {freemem} from 'node:os';
import {config} from 'dotenv';
import {createClient} from '@feelandnote/db';
import {codexCall,looksRateLimited} from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs';
import * as speechModule from '../lib/celeb-speech-research.ts';
import * as revalidationModule from '../../src/lib/revalidate-web.ts';
import {HEADLINE_BAN} from './headline-rewrite/rules.mjs';
const {validateSpeechResearch,speechLinesSha256,NO_VERIFIED_QUOTE_KO,NO_VERIFIED_QUOTE_EN}=speechModule.default??speechModule;
const {revalidateWebItems}=revalidationModule.default??revalidationModule;
config({path:'.env',quiet:true});
const db=createClient(process.env.NEXT_PUBLIC_DB_API_URL,process.env.DB_SECRET_KEY,{auth:{persistSession:false}});
const start='2026-10-07T15:00:00Z',end='2026-10-08T15:00:00Z';
const pilot=process.argv.includes('--pilot'),preflight=process.argv.includes('--preflight'),filled=x=>typeof x==='string'&&x.trim().length>0;
const hash=x=>createHash('sha256').update(JSON.stringify(x)??'undefined').digest('hex');
const parse=text=>{const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a<0||b<a)throw Error('no JSON');return JSON.parse(text.slice(a,b+1));};
const len=x=>Array.from(x).length;
const intro=readFileSync('../../docs/project/celeb/celeb-01-02-profile-intro.md','utf8');
const guide=intro.slice(intro.indexOf('## 한 줄 정의(headline) 작성 가이드'));
const contract=readFileSync('scripts/lib/celeb-speech-research.ts','utf8');
const generation=[
'Research only assigned real Korean entrepreneurs/scholars. 한국인이 한국어로 쓴 글 답게 주의해서 작성.',
'Use real public web searches and open actual primary sources. For headline-only work, confirm identity and representative facts with the minimum sufficient primary evidence; do not conduct speech research for already-filled quotes. For needsQuote=true, perform at least 3 genuine searches and read 2 actual sources on 2 hosts; unavailable quotes require 3 opened sources on 2 hosts. Never invent findings or claim inaccessible pages were read.',
'Do not run commands, read/write files, call paid APIs, invoke agents, or modify DB. Output one JSON object, no Markdown.',
'Only when needsHeadline=true create ten DISTINCT Korean headline ideas (12–28 characters) and four independently written English ideas (<=90); otherwise return empty pools. Ten ideas do not require ten achievements: confirm a few representative concrete facts, then develop genuinely different actions, scenes, stages or combinations from those facts. Do not reject a person merely because fewer than ten achievements exist. Every fact must have a verified source. Do not choose a winner. No inflated slogans or mere synonym swaps. Hold if evidence is insufficient.',
guide,
'When needsQuote=true, select one meaningful complete actual utterance <=50 Korean characters. Preserve all original words and endings/punctuation, remove only outer quotation marks. Do not invent, abridge clauses, quote the interviewer, or use weak dated sales forecasts just to fill a field. Translate faithfully to English.',
'The speech rulebook explicitly accepts the person\'s own books and letters, as well as interviews, speeches and official accounts. An authenticated first-person statement in their own writing is admissible; do not reject it solely because it was written rather than spoken. For historical scholars, distinguish the author\'s own words from quotations of someone else, and check the original/established translation and exact location. If a source is inaccessible, try another legitimate primary archive or an accessible scholarly transcription; do not keep retrying the same unavailable URL or claim it was read.',
'If a quote remains unresolved or only inaccessible/too-long quotations exist, use null quoteKo/quoteEn with hold reason. Do not mark unavailable unless a careful completed source search genuinely found no attributable utterance.',
'Unavailable standard values: '+JSON.stringify({ko:NO_VERIFIED_QUOTE_KO,en:NO_VERIFIED_QUOTE_EN}),
'Each result must include slug, ideaPool[10], englishPool[4], quoteKo, quoteEn, hold, research. For headline-only people research needs identity {summary,sourceUrl}, representativeFacts[{fact,sourceUrl}] at least 2 and inspectedSources[{sourceUrl,finding}] of actual primary evidence; leave quoteKo and quoteEn null. Only needsQuote people need the full speech research: schemaVersion=1; identity; representativeFacts; voiceSamples[{original,originalLanguage,quoteKo,quoteEn,sourceUrl}]; dialogueAnchors[3]; searchedChannels[2]; searchQueries[3]; inspectedSources; quoteOutcome verified/unavailable; unavailableReason only when unavailable; dialogueDecision KEEP; dialogueAssessment stating other data preserved; expectedLinesSha256 filled by writer.',
'Return {"people":[...]} exactly one per supplied slug. Existing headlines are not shown. No reading-guide, virtual-monologue, image, new-dialogue, score, or publication work.',
'Validator contract:\n'+contract
].join('\n');
let halt=null;
const stats={headline:0,quote:0,held:0,failed:0,supplemental:0};
async function getPerson(slug){const r=await db.from('celebs').select('*').eq('slug',slug).single();if(r.error)throw r.error;if(!(r.data.created_at>=start&&r.data.created_at<end))throw Error('cohort changed');return r.data;}
async function getDialogue(id){const r=await db.from('celeb_dialogues').select('*').eq('celeb_id',id).maybeSingle();if(r.error)throw r.error;return r.data;}
const protectedPerson=(p,allowed=[])=>Object.fromEntries(Object.entries(p).filter(([k])=>k!=='updated_at'&&!allowed.includes(k)));
async function quote(item){
 if(!filled(item.quoteKo)||!filled(item.quoteEn))return;
 const p=await getPerson(item.slug),old=await getDialogue(p.id);
 if(filled(old?.lines?.quote)||filled(old?.lines_en?.quote))return;
 const research=item.research;research.expectedLinesSha256=speechLinesSha256(old?.lines);
 validateSpeechResearch({research,currentLines:old?.lines,currentLinesEn:old?.lines_en,proposedQuoteKo:item.quoteKo,proposedQuoteEn:item.quoteEn,hasKoDialoguePatch:false});
 if(hash(await getDialogue(p.id))!==hash(old))throw Error('concurrent quote');
 const w=await db.rpc('set_celeb_quote',{p_celeb_id:p.id,p_quote_ko:item.quoteKo,p_quote_en:item.quoteEn});if(w.error)throw w.error;
 const a=await getDialogue(p.id),omit=x=>{const o={...(x??{})};delete o.quote;return o;};
 if(a.lines.quote!==item.quoteKo||a.lines_en.quote!==item.quoteEn||speechLinesSha256(omit(a.lines))!==speechLinesSha256(omit(old?.lines))||speechLinesSha256(omit(a.lines_en))!==speechLinesSha256(omit(old?.lines_en)))throw Error('quote readback');
 if(hash(protectedPerson(await getPerson(item.slug)))!==hash(protectedPerson(p)))throw Error('quote profile protection');
 await revalidateWebItems([{domain:'celebs',id:p.id},{domain:'celebs',id:p.slug},{domain:'dialogues',id:p.id}],[]);
 stats.quote++;console.log('QUOTE '+item.slug);
}
const shuffle=values=>values.map(text=>({text,k:Math.random()})).sort((a,b)=>a.k-b.k).map(({text},i)=>({number:i+1,text}));
function pools(item,trusted=false){
 if(!trusted){
  if(!filled(item.research?.identity?.summary)||!Array.isArray(item.research?.representativeFacts)||item.research.representativeFacts.length<2||!Array.isArray(item.research?.inspectedSources)||item.research.inspectedSources.length<1)throw Error('headline identity/fact/source evidence required');
  for(const evidence of [...item.research.representativeFacts,...item.research.inspectedSources])if(!/^https?:\/\//.test(evidence.sourceUrl)||!filled(evidence.fact??evidence.finding))throw Error('headline source evidence format');
 }
 if(!Array.isArray(item.ideaPool)||item.ideaPool.length!==10||new Set(item.ideaPool).size!==10)throw Error('ten distinct Korean candidates required');
 if(!Array.isArray(item.englishPool)||item.englishPool.length!==4||new Set(item.englishPool).size!==4)throw Error('four distinct English candidates required');
 for(const s of item.ideaPool)if(!filled(s)||len(s)<12||len(s)>28||HEADLINE_BAN.test(s)||/[\n—–]/.test(s))throw Error('Korean candidate format');
 for(const s of item.englishPool)if(!filled(s)||len(s)>90||/\n/.test(s))throw Error('English candidate format');
}
async function headline(item,pick,blind,cacheTargets=null){
 const p=await getPerson(item.slug);if(filled(p.headline)&&filled(p.headline_en))return;
 const choose=lang=>pick[lang]?.winner===0?pick[lang]?.combined:blind[lang].find(x=>x.number===pick[lang]?.winner)?.text;
 const ko=choose('ko'),en=choose('en');
 if(!filled(ko)||!filled(en)||len(ko)<12||len(ko)>28||len(en)>90||HEADLINE_BAN.test(ko)||/[\n—–]/.test(ko)||/\n/.test(en))throw Error('headline verdict format');
 let q=db.from('celebs').update({headline:ko,headline_en:en}).eq('id',p.id);
 q=p.headline===null?q.is('headline',null):q.eq('headline',p.headline);
 q=p.headline_en===null?q.is('headline_en',null):q.eq('headline_en',p.headline_en);
 if(p.updated_at)q=q.eq('updated_at',p.updated_at);
 const w=await q.select('*');if(w.error)throw w.error;if(w.data.length!==1)throw Error('headline concurrent update');
 const a=await getPerson(item.slug);
 if(a.headline!==ko||a.headline_en!==en||hash(protectedPerson(a,['headline','headline_en']))!==hash(protectedPerson(p,['headline','headline_en'])))throw Error('headline readback');
 const changedTargets=[{domain:'celebs',id:p.id},{domain:'celebs',id:p.slug}];
 if(cacheTargets)cacheTargets.push(...changedTargets);else await revalidateWebItems(changedTargets,[]);
 stats.headline++;console.log('HEADLINE '+item.slug+' '+ko);
}
async function primary(batch){
 const inputs=[];for(const p of batch){const a=await getPerson(p.slug),d=await getDialogue(p.id);inputs.push({slug:a.slug,name:a.nickname,name_en:a.nickname_en,birth_date:a.birth_date,bio:a.bio,title:a.title,needsQuote:!filled(d?.lines?.quote)&&!filled(d?.lines_en?.quote),needsHeadline:!filled(a.headline)||!filled(a.headline_en)});}
 const generated=parse(await codexCall(generation+'\nAssigned people:\n'+JSON.stringify(inputs),{effort:'medium',search:true,sandbox:'read-only',timeoutMs:12*60_000}));
 if(!Array.isArray(generated.people)||generated.people.length!==inputs.length||new Set(generated.people.map(x=>x.slug)).size!==inputs.length||generated.people.some(x=>!inputs.some(p=>p.slug===x.slug)))throw Error('generation identity mismatch');
 const entries=[],ballots=[];
 for(const item of generated.people){
  try{await quote(item);if(inputs.find(p=>p.slug===item.slug).needsQuote&&(!filled(item.quoteKo)||!filled(item.quoteEn))){stats.held++;console.error('QUOTE HOLD '+item.slug+' '+String(item.hold??'unresolved source').slice(0,200));}}catch(e){stats.held++;console.error('QUOTE HOLD '+item.slug+' '+String(e.message).slice(0,250));}
  if(!inputs.find(p=>p.slug===item.slug).needsHeadline)continue;
  try{pools(item);const p=await getPerson(item.slug),ko=[...item.ideaPool],en=[...item.englishPool];if(filled(p.headline))ko.push(p.headline);if(filled(p.headline_en))en.push(p.headline_en);
   const blind={ko:shuffle(ko),en:shuffle(en)};entries.push({item,blind});ballots.push({slug:item.slug,name:p.nickname,birth_date:p.birth_date,facts:item.research?.representativeFacts??[],ko:blind.ko,en:blind.en});
  }catch(e){stats.held++;console.error('HEADLINE HOLD '+item.slug+' '+String(e.message).slice(0,200));}
 }
 if(!ballots.length)return;
 const prompt='Independent blind headline judge. You did not create these candidates, and their origins are hidden. 한국인이 한국어로 쓴 글 답게 주의해서 작성.\n'+guide+'\nJudge facts first, then name-attached catchphrase quality, person-specific identity, natural modern Korean, and brevity. No inflated, false, vague, merely title-like candidates. Korean 12–28, English <=90. Select each language independently by number. Combine only if no unchanged candidate is usable. Verify uncertain facts with public web sources. No shell, files, agents or DB. Return {"people":[{"slug":"...","ko":{"winner":1,"combined":null,"reason":"..."},"en":{"winner":1,"combined":null,"reason":"..."},"hold":null}]} exactly one per ballot. Hold rather than guess unresolved facts.\n'+JSON.stringify(ballots);
 const result=parse(await codexCall(prompt,{effort:'medium',search:true,sandbox:'read-only',timeoutMs:8*60_000}));
 if(!Array.isArray(result.people)||result.people.length!==ballots.length||new Set(result.people.map(x=>x.slug)).size!==ballots.length||result.people.some(x=>!ballots.some(b=>b.slug===x.slug)))throw Error('review identity mismatch');
 for(const {item,blind}of entries){const pick=result.people.find(x=>x.slug===item.slug);if(pick.hold){stats.held++;continue;}try{await headline(item,pick,blind);}catch(e){stats.held++;console.error('HEADLINE HOLD '+item.slug+' '+String(e.message).slice(0,250));}}
}
async function fastHeadlines(batch){
 const began=Date.now(),inputs=[];
 const ids=batch.map(p=>p.id),filter='from_id.in.('+ids.join(',')+'),to_id.in.('+ids.join(',')+')';
 const materials=await Promise.all([db.from('celeb_dialogues').select('celeb_id,lines').in('celeb_id',ids),db.from('figure_book_characters').select('celeb_id,content_id,relation_type').eq('relation_type','authored').in('celeb_id',ids),db.from('celeb_relations').select('from_id,to_id,rel_type,note').or(filter).not('note','is',null)]);for(const r of materials)if(r.error)throw r.error;
 const bookIds=[...new Set(materials[1].data.map(x=>x.content_id))];
 const localeRows=bookIds.length?await db.from('content_locales').select('content_id,title').eq('locale','ko').in('content_id',bookIds):{data:[]};if(localeRows.error)throw localeRows.error;
 const titles=new Map(localeRows.data.map(x=>[x.content_id,x.title])),quotes=new Map(materials[0].data.map(x=>[x.celeb_id,x.lines?.quote]));
 for(const p of batch){const a=await getPerson(p.slug);if(!filled(a.headline)||!filled(a.headline_en)){const confirmedQuote=quotes.get(a.id);inputs.push({id:a.id,slug:a.slug,name:a.nickname,name_en:a.nickname_en,bio:a.bio,bio_en:a.bio_en,title:a.title,confirmedQuote:filled(confirmedQuote)&&confirmedQuote!==NO_VERIFIED_QUOTE_KO?confirmedQuote:null,authoredBooks:materials[1].data.filter(x=>x.celeb_id===a.id).map(x=>titles.get(x.content_id)).filter(filled).slice(0,6),relationshipNotes:materials[2].data.filter(x=>x.from_id===a.id||x.to_id===a.id).slice(0,4).map(x=>({from_id:x.from_id,to_id:x.to_id,type:x.rel_type,note:x.note.slice(0,600)}))});}}
 if(!inputs.length)return;
 const prompt=[
  'Write headline candidates from the already researched and confirmed DB facts below. This is wording work, not a new research assignment. 한국인이 한국어로 쓴 글 답게 주의해서 작성.',
  'Use ONLY the supplied confirmed DB facts: bio, title, actual utterance, authored books and explicitly described relationship notes. An utterance establishes what the person said or advocated, not proof of an action. A relationship note may describe someone else; attribute only statements explicitly about this person. Do not add dates, numbers, works, achievements, motives, first/only/best claims, current positions or any outside fact. Hold only when no concrete fact supports a useful headline.',
  'No tools, web searches, commands, files or DB writes. Existing headline values are hidden.',
  guide,
  'For each person produce twelve Korean candidates, 12–28 characters including spaces, and six separately written English candidates <=90 characters. Extra candidates allow invalid-length/duplicate candidates to be excluded while retaining ten Korean and four English. Ten alternatives do NOT require ten separate achievements: use the confirmed few facts in genuinely different concrete viewpoints, actions, stages, scenes or combinations. Do not invent facts, merely swap synonyms, rank or choose a winner.',
  'Return JSON only {"people":[{"slug":"...","ideaPool":["..."],"englishPool":["..."],"hold":null}]}, exactly one result per assigned slug. If you cannot produce ten valid, fact-supported candidates, return empty pools and a precise hold reason.',
  JSON.stringify(inputs)
 ].join('\n');
 const generated=parse(await codexCall(prompt,{effort:'low',search:false,sandbox:'read-only',timeoutMs:5*60_000}));
 if(!Array.isArray(generated.people)||generated.people.length!==inputs.length||new Set(generated.people.map(x=>x.slug)).size!==inputs.length||generated.people.some(x=>!inputs.some(p=>p.slug===x.slug)))throw Error('fast generation identity mismatch');
 const entries=[],ballots=[];
 for(const item of generated.people){try{
  if(item.hold)throw Error(item.hold);
  item.ideaPool=[...new Set((item.ideaPool??[]).filter(s=>filled(s)&&len(s)>=12&&len(s)<=28&&!HEADLINE_BAN.test(s)&&!/[\n—–]/.test(s)))].slice(0,10);
  item.englishPool=[...new Set((item.englishPool??[]).filter(s=>filled(s)&&len(s)<=90&&!/\n/.test(s)))].slice(0,4);
  pools(item,true);
  const p=await getPerson(item.slug),ko=[...item.ideaPool],en=[...item.englishPool];if(filled(p.headline))ko.push(p.headline);if(filled(p.headline_en))en.push(p.headline_en);
  const blind={ko:shuffle(ko),en:shuffle(en)};entries.push({item,blind});ballots.push({...inputs.find(x=>x.slug===item.slug),ko:blind.ko,en:blind.en});
 }catch(e){stats.held++;console.error('FAST HOLD '+item.slug+' '+String(e.message).slice(0,180));}}
 if(!ballots.length)return;
 const judgePrompt=[
  'Independent blind headline judge. You did not generate these candidates, and their origins are hidden. 한국인이 한국어로 쓴 글 답게 주의해서 작성.',
  guide,
  'Judge ONLY against the supplied confirmed DB facts. Reject any extra fact, unsupported first/only/best claim, praise, motive, outdated current position or merely title-like wording. Select Korean and English independently. No tools, web, commands, files or DB writes. If all candidates are unsupported, hold rather than research or invent.',
  'Return JSON only {"people":[{"slug":"...","ko":{"winner":1,"combined":null,"reason":"one sentence"},"en":{"winner":1,"combined":null,"reason":"one sentence"},"hold":null}]}, exactly one per ballot. Combine only if no unchanged option is usable; same factual/length rules apply.',
  JSON.stringify(ballots)
 ].join('\n');
 const judged=parse(await codexCall(judgePrompt,{effort:'low',search:false,sandbox:'read-only',timeoutMs:4*60_000}));
 if(!Array.isArray(judged.people)||judged.people.length!==ballots.length||new Set(judged.people.map(x=>x.slug)).size!==ballots.length||judged.people.some(x=>!ballots.some(b=>b.slug===x.slug)))throw Error('fast review identity mismatch');
 const cacheTargets=[],before=stats.headline;
 for(const {item,blind}of entries){const pick=judged.people.find(x=>x.slug===item.slug);if(pick.hold){stats.held++;continue;}try{await headline(item,pick,blind,cacheTargets);}catch(e){stats.held++;console.error('FAST HOLD '+item.slug+' '+String(e.message).slice(0,180));}}
 if(cacheTargets.length)await revalidateWebItems(cacheTargets,[]);
 console.log('FAST_TIMING '+JSON.stringify({people:inputs.length,written:stats.headline-before,seconds:(Date.now()-began)/1000}));
}
function researchWindow(people,args=process.argv){
 const options=['--after-slug','--start-index','--only-slugs'].filter(flag=>args.includes(flag));
 if(options.length!==1)throw Error('research requires exactly one explicit cursor: --after-slug, --start-index or --only-slugs; empty DB connections are not research progress');
 const option=options[0],at=args.indexOf(option),value=args[at+1];
 if(!value||value.startsWith('--'))throw Error('missing research cursor value');
 if(option==='--only-slugs'){
  const requested=new Set(value.split(',').filter(Boolean));
  if(!requested.size||[...requested].some(slug=>!people.some(p=>p.slug===slug)))throw Error('unknown assigned research slug');
  return people.filter(p=>requested.has(p.slug));
 }
 let passed;
 if(option==='--after-slug'){
  const index=people.findIndex(p=>p.slug===value);if(index<0)throw Error('unknown research cursor slug');passed=index+1;
 }else{
  passed=Number(value);if(!/^\d+$/.test(value)||!Number.isInteger(passed)||passed<0||passed>people.length)throw Error('invalid passed research index');
 }
 // Use the DB's exact ordering, not JavaScript slug comparisons. Zero-result
 // research before this cursor has already been processed and stays excluded.
 return people.slice(passed);
}
function relayCursor(tasks,settled){
 let passed=0;while(passed<tasks.length&&settled.has(passed))passed++;
 const slugs=task=>(Array.isArray(task)?task:[task]).map(p=>p.slug);
 const last=passed?(Array.isArray(tasks[passed-1])?tasks[passed-1].at(-1):tasks[passed-1]):null;
 return {afterSlug:last?.slug??null,passedIndex:last?.cohortIndex??null,
  processedAhead:[...settled].filter(i=>i>=passed).sort((a,b)=>a-b).flatMap(i=>slugs(tasks[i]))};
}
function callFailureReason(error){
 const message=String(error.message??error),lines=message.split(/\r?\n/).filter(line=>/^ERROR:/.test(line));
 return lines.length?lines.join('\n'):message;
}
async function pool(tasks,fn,count=4){
 let next=0;const settled=new Set(),exceptions=[];
 const serial=process.argv.includes('--serial');if(serial)count=1;
 const safeCount=Math.min(count,tasks.length,Math.max(1,Math.floor((freemem()-3*1024**3)/(2*1024**3))));
 console.log('WORKERS '+safeCount+' / maximum '+count);
 await Promise.all(Array.from({length:safeCount},async()=>{while(next<tasks.length&&!halt){
  const reserveGiB=serial?2:(process.argv.includes('--primary-only')||process.argv.includes('--gender-only'))?5:3;
  let waiting=false;
  while(freemem()<reserveGiB*1024**3&&!halt){if(!waiting){console.log('MEMORY_WAIT '+JSON.stringify({reserveGiB,freeGiB:Number((freemem()/1024**3).toFixed(2)),serial}));waiting=true;}await new Promise(r=>setTimeout(r,15000));}
  if(waiting&&!halt)console.log('MEMORY_RESUMED '+JSON.stringify({reserveGiB,freeGiB:Number((freemem()/1024**3).toFixed(2))}));
  if(halt)return;
  const taskIndex=next++,task=tasks[taskIndex];
  try{
   let result,attemptTask=task;
   for(let attempt=0;attempt<3;attempt++){
    try{result=await fn(attemptTask);break;}catch(e){
     const reason=callFailureReason(e);
     if(halt||attempt===2||!/Selected model is at capacity|server_overloaded/i.test(reason))throw e;
     const waitMs=(attempt+1)*30000;
     console.log('SERVER_RETRY '+JSON.stringify({slug:task.slug??task.map(p=>p.slug),attempt:attempt+1,waitMs}));
     await new Promise(resolve=>setTimeout(resolve,waitMs));
     if(halt)throw e;
     // A failed researcher may have saved valid partial results. Refresh only
     // its original assigned domains; never reopen completed positive domains.
     if(task.supplementPlan){
      const [fresh]=await supplementPlans([await getPerson(task.slug)]);
      fresh.cohortIndex=task.cohortIndex;
      fresh.supplementPlan.pending=fresh.supplementPlan.pending.filter(domain=>task.supplementPlan.pending.includes(domain));
      attemptTask=fresh;
     }
    }
   }
   if(result?.status==='FAILED')exceptions.push({slugs:result.slug,issue:result.issue??'researcher reported failure'});
  }catch(e){
   stats.failed++;const m=String(e.message),assigned=Array.isArray(task)?task.map(p=>p.slug).join(','):task.slug;
   // CLI stderr also echoes rulebooks and commands. Classify its actual ERROR
   // lines rather than mistaking an echoed mention of quota for exhaustion.
   const reason=callFailureReason(e);
   exceptions.push({slugs:assigned,issue:reason.slice(-1800)});console.error('FAILED '+assigned+' '+reason.slice(-1800));
   if(/Selected model is at capacity|server_overloaded/i.test(reason))halt='SERVER_CAPACITY: '+reason.slice(-1800);
   else if(looksRateLimited(reason))halt='SUBSCRIPTION_LIMIT: '+reason.slice(-1800);
  }
  // Both a completed zero-result search and a reported failure advance the
  // traversal. Failures remain separate; missing DB rows never rewind it.
  settled.add(taskIndex);console.log('RELAY_CURSOR '+JSON.stringify(relayCursor(tasks,settled)));
 }}));
 if(exceptions.length)console.log('RELAY_EXCEPTIONS '+JSON.stringify(exceptions));
}
async function genderFact(p){
 const before=await getPerson(p.slug);if(typeof before.gender==='boolean')return;
 const prompt=['Confirm only the missing gender fact of this real person. 한국인이 한국어로 쓴 글 답게 주의해서 작성.',
 'Use public primary institutional profiles, company disclosures, attributable interviews or Wikidata P21 with independently matching identity. Match name, era/birth and career; never choose a namesake. The provided profile is identity context, not gender evidence.',
 'Do not infer gender from name, photo, job or statistical likelihood. A primary source explicit male/female field or an unambiguous attributable gendered description is needed. If not established, return gender=null and a hold reason.',
 'No shell/files/DB writes, agents, images, consumption research or other profile work. Return JSON only {slug,gender:true|false|null,evidence:[{sourceUrl,original,identityMatch}],hold:null}. true means male, false means female. At least one actually opened source must support both the identity and the gender; do not claim a snippet or inaccessible page was read.',
 JSON.stringify({slug:p.slug,name:before.nickname,name_en:before.nickname_en,birth_date:before.birth_date,bio:before.bio,title:before.title,wikidata_qid:before.wikidata_qid})].join('\n');
 const r=parse(await codexCall(prompt,{effort:'medium',search:true,sandbox:'read-only',timeoutMs:5*60_000}));
 if(r.slug!==p.slug)throw Error('gender identity mismatch');
 if(typeof r.gender!=='boolean'){stats.held++;console.log('GENDER HOLD '+p.slug+' '+String(r.hold??'source not established'));return;}
 if(!Array.isArray(r.evidence)||!r.evidence.length||r.evidence.some(e=>!/^https?:\/\//.test(e.sourceUrl)||!filled(e.original)||!filled(e.identityMatch)))throw Error('gender evidence required');
 let update=db.from('celebs').update({gender:r.gender}).eq('id',p.id).is('gender',null);if(before.updated_at)update=update.eq('updated_at',before.updated_at);
 const w=await update.select('*');if(w.error)throw w.error;if(w.data.length!==1)throw Error('concurrent gender update');
 const after=await getPerson(p.slug);if(after.gender!==r.gender||hash(protectedPerson(after,['gender']))!==hash(protectedPerson(before,['gender'])))throw Error('gender readback protection');
 await revalidateWebItems([{domain:'celebs',id:p.id},{domain:'celebs',id:p.slug}],[]);
 stats.supplemental++;console.log('GENDER '+p.slug+' '+JSON.stringify({gender:r.gender,evidence:r.evidence}));
}
async function supplementPlans(people){
 const books=[],relations=new Map(),factions=[];
 for(let i=0;i<people.length;i+=80){
  const ids=people.slice(i,i+80).map(p=>p.id),filter='from_id.in.('+ids.join(',')+'),to_id.in.('+ids.join(',')+')';
  const rows=await Promise.all([
   db.from('figure_book_characters').select('celeb_id,relation_type').in('celeb_id',ids),
   db.from('celeb_relations').select('id,from_id,to_id').or(filter),
   db.from('faction_members').select('celeb_id').in('celeb_id',ids)
  ]);for(const r of rows)if(r.error)throw r.error;
  books.push(...rows[0].data);for(const r of rows[1].data)relations.set(r.id,r);factions.push(...rows[2].data);
 }
 return people.map(p=>{
  const existing={authored:books.filter(r=>r.celeb_id===p.id&&r.relation_type==='authored').length,appearance:books.filter(r=>r.celeb_id===p.id&&r.relation_type==='appearance').length,relations:[...relations.values()].filter(r=>r.from_id===p.id||r.to_id===p.id).length,factions:factions.filter(r=>r.celeb_id===p.id).length};
  const pending=Object.entries(existing).filter(([,count])=>count===0).map(([domain])=>domain);
  if(typeof p.gender!=='boolean'||!filled(p.birth_date))pending.unshift('basic');
  return {...p,supplementPlan:{pending,existing}};
 });
}
async function supplement(p){
 const began=Date.now();
 const before=await getPerson(p.slug),oldDialogue=await getDialogue(p.id);
 const oldReading=await db.from('celeb_explanations').select('profile_id,plain_text,plain_text_en').eq('profile_id',p.id).maybeSingle();if(oldReading.error)throw oldReading.error;
 const plan=p.supplementPlan??{pending:['basic','authored','appearance','relations','factions'],existing:{}};
 const rules=['RESEARCH_RELAY_ALGORITHM.md','docs/project/celeb/celeb-00-01-pipeline.md'];
 if(plan.pending.includes('basic'))rules.push('docs/project/celeb/celeb-01-01-profile-facts.md');
 if(plan.pending.some(d=>['authored','appearance'].includes(d)))rules.push('docs/project/celeb/celeb-02-05-figure-books.md','docs/project/celeb/celeb-02-02-content-registration.md');
 if(plan.pending.includes('relations'))rules.push('docs/project/celeb/celeb-07-01-relations.md');
 if(plan.pending.includes('factions'))rules.push('docs/project/apps/apps-01-web-bo.md (only faction membership sections)');
 const prompt=[
'You own ONE person: '+p.slug+' ('+p.nickname+', '+(p.birth_date??'birth unknown')+'), Oct 8 KST cohort. User authorized this background DB batch. 한국인이 한국어로 쓴 글 답게 주의해서 작성.',
'You are not alone. Never revert others or alter unrelated data. Work in C:/project/feelandnote. Follow loaded AGENTS.md and read only these applicable rules: '+rules.join(', ')+'. Do not load excluded-domain rulebooks or unrelated code.',
'Assigned unresolved domains only: '+JSON.stringify(plan)+'. Domains with existing positive registrations are preserved and excluded from this assignment. Do not re-survey or re-approve them. Query live values before writes because another session may have completed a domain since this snapshot.',
'Identity context: '+JSON.stringify({name:before.nickname,name_en:before.nickname_en,birth:before.birth_date,bio:before.bio,title:before.title,gender:before.gender,qid:before.wikidata_qid})+'.',
plan.pending.includes('basic')?'For assigned missing basic facts, use actual source evidence only: no invented birth and no gender inference from name/photo. Do not change nonmissing facts.':'Basic profile facts are outside this assignment; preserve them.',
'Consumption-content research is excluded from this batch. Do not investigate what this person read, watched, played or heard. Do not create or change celeb_contents, consumption reviews, content_research_confirmed_empty_at, or consumption-count markers. Preserve existing consumption data. Authored/appearance book research remains assigned: KO BOOK new metadata Kakao ONLY; EN edition OpenLibrary ONLY.',
'For assigned book domains, register verified correct relations, reuse matching books without overwriting metadata, exclude excerpt/abridged editions, correctly scope volumes. For assigned relationship/faction domains, register only evidenced connections. Connections are optional; do not invent to give everyone one.',
'New social relationship rows accept only influence, influenced, colleague and rival, with canonical direction from the rulebook. Register verified family relationships with the family types from shared/constants/celeb-relations.ts and rel_group=family. The four-axis restriction applies only to social relationships. Confirmed family pairs are excluded from new social axes; do not disguise kinship as influence or collaboration. A genuinely private/noncommercial authored book with no permitted edition metadata remains unlinked; do not fabricate a catalog row merely to create a connection.',
'Use existing scripts/contracts. Protect other fields and valid existing values, requery after registration and self-correct your own changes. Preserve current active/inactive status, reading guide, virtual monologue, portraits, avatars, headlines, quote, unrelated records and user files. Do not force active: excluded reading/monologue remain activation requirements.',
'No new tables/columns, queues/status files, TODO/research/completion documents, source ledgers, commit/push/build/dev server, automation, image/voice, paid API, purchases, other external CLI or subagents. Secrets only from existing .env; never print. Final SSOT DB/R2. Delete your temporary inputs after verified registration.',
'Finish research -> DB/R2 registration -> same researcher self-verification. Do not dump candidates. If blocked, return FAILED and a precise issue, not fictional completion.',
'Keep the research focused on the assigned missing domains and finish within 6 minutes, reserving the final minute for registration and self-verification. Use the minimum sufficient primary evidence, reuse existing registration scripts, and do not write a new per-person research framework. If genuine evidence remains inaccessible, preserve the values and report the precise unresolved domain; do not claim a completed search or invent a relation.',
'When the web reader fails on an ordinary public URL, try one direct Node fetch of that exact URL before declaring it inaccessible, and read the actual returned article text. For example, https://www.beopbo.com/news/articleView.html?idxno=60669 returns a readable public article through Node fetch even when the web reader fails. Do not bypass logins or claim a challenge/error page was evidence.',
'An adequately completed search with no qualified connection is DONE with zero additions. Missing permitted metadata for an otherwise evidenced book, or an unregistered external person without a verified QID/photo, leaves that optional connection unlinked; report it in issue and do not fabricate it or invalidate completed research. Use FAILED for genuinely insufficient research, unread evidence, identity conflicts or unverified writes.',
'Return JSON only {"slug":'+JSON.stringify(p.slug)+',"status":"DONE or FAILED","counts":{"basic":0,"contents":0,"authored":0,"appearance":0,"relations":0,"factions":0},"issue":null}.'
 ].join('\n');
 const r=parse(await codexCall(prompt,{effort:'medium',search:true,sandbox:'danger-full-access',timeoutMs:8*60_000}));
 if(r.slug!==p.slug||!['DONE','FAILED'].includes(r.status))throw Error('supplement identity mismatch');
 const after=await getPerson(p.slug),newDialogue=await getDialogue(p.id);
 const newReading=await db.from('celeb_explanations').select('profile_id,plain_text,plain_text_en').eq('profile_id',p.id).maybeSingle();if(newReading.error)throw newReading.error;
 for(const key of ['publication_status','virtual_monologue','virtual_monologue_en','avatar_url','portrait_url','headline','headline_en','content_research_confirmed_empty_at'])if(after[key]!==before[key])throw Error('protected field changed during supplement: '+p.slug+' '+key);
 if(hash(oldReading.data)!==hash(newReading.data)||hash(oldDialogue?.lines)!==hash(newDialogue?.lines)||hash(oldDialogue?.lines_en)!==hash(newDialogue?.lines_en))throw Error('protected reading/dialogue changed during supplement: '+p.slug);
 if(r.status==='DONE')stats.supplemental++;else stats.held++;
 console.log('SUPPLEMENT '+p.slug+' '+r.status+' '+JSON.stringify(r.counts??{})+' '+(r.issue??''));
 console.log('SUPPLEMENT_TIMING '+JSON.stringify({slug:p.slug,seconds:Math.round((Date.now()-began)/1000),domains:plan.pending}));
 return r;
}
async function main(){
 const waitAt=process.argv.indexOf('--wait-pilot');
 if(waitAt>=0){
  const pid=Number(process.argv[waitAt+1]);if(!Number.isInteger(pid)||pid<=0)throw Error('invalid pilot PID');
  console.log('WAIT_PILOT '+pid);
  const command='$ownedPilot = Get-CimInstance Win32_Process -Filter "ProcessId='+pid+'"; if ($ownedPilot -and $ownedPilot.CommandLine -match "cohort-required-batch\\.mjs --pilot") { Wait-Process -Id '+pid+' -Timeout 1800 -ErrorAction Stop }';
  execFileSync('powershell.exe',['-NoProfile','-Command',command],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:1810000});
  const tested=await db.from('celebs').select('slug,headline,headline_en').in('slug',['song-sang-yong','park-seong-rae']);if(tested.error)throw tested.error;
  if(!tested.data.some(p=>filled(p.headline)&&filled(p.headline_en)))throw Error('pilot produced no verified bilingual headline; full batch not started');
 }
 const q=await db.from('celebs').select('id,slug,nickname,nickname_en,birth_date,gender,bio,title,headline,headline_en,publication_status').gte('created_at',start).lt('created_at',end).neq('publication_status','deleted').order('slug').limit(1000);if(q.error)throw q.error;if(q.data.length!==628)throw Error('cohort count changed: inspect');
 q.data=q.data.map((p,index)=>({...p,cohortIndex:index+1}));
 let ds=[];for(let i=0;i<q.data.length;i+=80){const r=await db.from('celeb_dialogues').select('celeb_id,lines,lines_en').in('celeb_id',q.data.slice(i,i+80).map(x=>x.id));if(r.error)throw r.error;ds.push(...r.data);}
 const dm=new Map(ds.map(x=>[x.celeb_id,x]));
 let targets=q.data.filter(p=>!filled(p.headline)||!filled(p.headline_en)||!filled(dm.get(p.id)?.lines?.quote)||!filled(dm.get(p.id)?.lines_en?.quote));
 if(pilot)targets=targets.filter(p=>['song-sang-yong','park-seong-rae'].includes(p.slug));
 console.log('START '+JSON.stringify({pid:process.pid,people:targets.length,pilot,concurrency:pilot?1:4}));
 if(preflight){console.log('PREFLIGHT '+JSON.stringify({total:q.data.length,missingHeadline:q.data.filter(p=>!filled(p.headline)||!filled(p.headline_en)).length,missingQuote:q.data.filter(p=>!filled(dm.get(p.id)?.lines?.quote)||!filled(dm.get(p.id)?.lines_en?.quote)).length,protected:['publication_status','plain_text','plain_text_en','virtual_monologue','virtual_monologue_en','avatar_url','portrait_url'],externalCalls:0,dbWrites:0}));return;}
 const scope=pilot?targets:process.argv.includes('--headline-only')?q.data:researchWindow(q.data);
 const scopedIds=new Set(scope.map(p=>p.id));targets=targets.filter(p=>scopedIds.has(p.id));
 if(process.argv.includes('--gender-only')){
  const skippedAt=process.argv.indexOf('--skip-slugs'),skipped=new Set(skippedAt<0?[]:(process.argv[skippedAt+1]??'').split(','));
  const onlyAt=process.argv.indexOf('--only-slugs'),requested=onlyAt<0?null:new Set((process.argv[onlyAt+1]??'').split(',').filter(Boolean));
  if(requested&&(!requested.size||[...requested].some(slug=>!q.data.some(p=>p.slug===slug))))throw Error('unknown or empty assigned gender slugs');
  const missing=scope.filter(p=>(!requested||requested.has(p.slug))&&!skipped.has(p.slug)&&typeof p.gender!=='boolean');
  console.log('GENDER_TARGETS '+JSON.stringify(missing.map(p=>p.slug)));await pool(missing,genderFact,1);
  console.log('END '+JSON.stringify({stats,halt}));if(halt||stats.failed)process.exitCode=1;return;
 }
 if(process.argv.includes('--primary-only')){
  const minAt=process.argv.indexOf('--min-slug'),minSlug=minAt<0?'':process.argv[minAt+1];
  const workersAt=process.argv.indexOf('--workers'),workers=workersAt<0?2:Number(process.argv[workersAt+1]);
  if(!Number.isInteger(workers)||workers<1||workers>2||typeof minSlug!=='string')throw Error('invalid additional worker bounds');
  targets=targets.filter(p=>p.slug>=minSlug);
  const onlyAt=process.argv.indexOf('--only-slugs');
  if(onlyAt>=0){const requested=new Set((process.argv[onlyAt+1]??'').split(',').filter(Boolean));if(!requested.size||[...requested].some(slug=>!q.data.some(p=>p.slug===slug)))throw Error('unknown or empty assigned slugs');targets=targets.filter(p=>requested.has(p.slug));}
  console.log('ADDITIONAL_PRIMARY '+JSON.stringify({people:targets.length,slugs:targets.map(p=>p.slug),workers,reserveGiB:5}));
  const chunks=[];for(let i=0;i<targets.length;i+=4)chunks.push(targets.slice(i,i+4));
  await pool(chunks,primary,workers);
  console.log('END '+JSON.stringify({stats,halt}));if(halt||stats.failed)process.exitCode=1;return;
 }
 if(process.argv.includes('--supplement-only')){
  const skipAt=process.argv.indexOf('--skip-supplement'),skip=skipAt<0?new Set():new Set((process.argv[skipAt+1]??'').split(',').filter(Boolean));
  if([...skip].some(slug=>!q.data.some(p=>p.slug===slug)))throw Error('unknown completed supplement slug');
  const workersAt=process.argv.indexOf('--workers'),workers=workersAt<0?4:Number(process.argv[workersAt+1]);
  if(!Number.isInteger(workers)||workers<1||workers>4)throw Error('invalid supplement worker bounds');
  const planned=await supplementPlans(scope.filter(p=>!skip.has(p.slug))),remaining=planned.filter(p=>p.supplementPlan.pending.length);
  console.log('SUPPLEMENT_WINDOW '+JSON.stringify({firstIndex:scope[0]?.cohortIndex??null,firstSlug:scope[0]?.slug??null,lastIndex:scope.at(-1)?.cohortIndex??null,selected:scope.length,alreadyProcessed:skip.size}));
  console.log('SUPPLEMENT_PLAN '+JSON.stringify({assigned:remaining.length,skippedExisting:planned.length-remaining.length,domains:Object.fromEntries(['basic','authored','appearance','relations','factions'].map(d=>[d,remaining.filter(p=>p.supplementPlan.pending.includes(d)).length]))}));
  if(process.argv.includes('--plan-only'))return;
  await pool(planned,async p=>{if(p.supplementPlan.pending.length)return supplement(p);},workers);
  console.log('END '+JSON.stringify({stats,halt}));if(halt||stats.failed)process.exitCode=1;return;
 }
 const fastTargets=scope.filter(p=>(!pilot||['song-sang-yong','park-seong-rae'].includes(p.slug))&&(!filled(p.headline)||!filled(p.headline_en)));
 const limitAt=process.argv.indexOf('--limit'),limit=limitAt<0?Infinity:Number(process.argv[limitAt+1]);if(!(limit>0))throw Error('invalid limit');
 const headBatches=[];for(let i=0;i<Math.min(fastTargets.length,limit);i+=12)headBatches.push(fastTargets.slice(i,Math.min(i+12,limit)));
 await pool(headBatches,fastHeadlines,process.argv.includes('--headline-only')?1:2);
 if(process.argv.includes('--headline-only')){console.log('END '+JSON.stringify({stats,halt}));if(halt||stats.failed)process.exitCode=1;return;}
 const latest=await db.from('celebs').select('id,slug,headline,headline_en').gte('created_at',start).lt('created_at',end).neq('publication_status','deleted').limit(1000);if(latest.error)throw latest.error;
 const freshDialogues=[];for(let i=0;i<latest.data.length;i+=80){const r=await db.from('celeb_dialogues').select('celeb_id,lines,lines_en').in('celeb_id',latest.data.slice(i,i+80).map(p=>p.id));if(r.error)throw r.error;freshDialogues.push(...r.data);}
 const freshQuotes=new Map(freshDialogues.map(d=>[d.celeb_id,d]));
 const unresolved=new Set(latest.data.filter(p=>!filled(p.headline)||!filled(p.headline_en)||!filled(freshQuotes.get(p.id)?.lines?.quote)||!filled(freshQuotes.get(p.id)?.lines_en?.quote)).map(p=>p.id));targets=scope.filter(p=>unresolved.has(p.id));
 const batches=[];for(let i=0;i<targets.length;i+=4)batches.push(targets.slice(i,i+4));
 await pool(batches,primary,pilot?1:4);
 if(!pilot&&!halt)await pool(await supplementPlans(scope),async p=>{if(p.supplementPlan.pending.length)return supplement(p);},4);
 console.log('END '+JSON.stringify({stats,halt}));
 if(halt||stats.failed)process.exitCode=1;
}
main().catch(e=>{console.error(String(e.message));process.exitCode=1;});
