// 이미 올라간 책 소개(정중체)를 간결체(~다)로 바꾼다. AGY가 바꾸고 다른 AGY 호출이 검수한다. 블로그는 고치지 않는다.
// --intros=<절대경로 JSON {posts:{logNo:{intros:[{book,paragraphs}]}}}> --out=<절대경로 작업 폴더> [--limit=N]
// 결과 conversions.json: {sha256(원문 문단 JSON): {original, paragraphs, review}} — 편집기 반영 도구가 원문 문단으로 찾아 쓴다.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {agyText,agyJson,AGY_TEXT_MODEL} from './lib/agy-text.mjs';

const read=f=>JSON.parse(fs.readFileSync(f,'utf8')),write=(f,v)=>{fs.writeFileSync(f+'.tmp',JSON.stringify(v,null,1));fs.renameSync(f+'.tmp',f);};
export const blurbKey=paragraphs=>crypto.createHash('sha256').update(JSON.stringify(paragraphs)).digest('hex');
import {POLITE_ENDING,firstSentence,contractedCopula} from './lib/plain-style.mjs';
export {POLITE_ENDING};
const QUOTED=/《[^》]+》|『[^』]+』|「[^」]+」|‘[^’]+’|“[^”]+”/g;

// 기계 대조: 문단 수·간결체 종결·인용 부호 안 표현 보존·분량.
export function conversionProblems(original,converted){
 if(!Array.isArray(converted)||converted.length!==original.length||converted.some(p=>typeof p!=='string'||!p.trim()||/[\r\n]/.test(p)))return['paragraph count or shape differs'];
 const problems=[];
 for(const p of converted)for(const sentence of p.split(/(?<=[.!?])\s+/))if(POLITE_ENDING.test(sentence.trim()))problems.push('polite ending: '+sentence.slice(-20));
 if(contractedCopula(firstSentence(converted[0])))problems.push('first sentence ends with a contracted copula: '+firstSentence(converted[0]).slice(-15));
 const quotes=t=>(t.join(' ').match(QUOTED)??[]).sort().join('|');if(quotes(original)!==quotes(converted))problems.push('quoted titles or phrases changed');
 const a=original.join('').length,b=converted.join('').length;if(b<a*0.7||b>a*1.15)problems.push('length changed '+a+'→'+b);
 return problems;
}

const RULES='한국인이 한국어로 쓴 글 답게 주의해서 작성한다. 블로그의 책 소개 문단을 정중체(~니다·~요)에서 간결체(~다·~한다)로 바꾼다. 종결어미만 갈지 말고 문장 전체의 호응·어순·연결을 간결체에 맞게 다시 다듬는다. 내용·사실·고유명사·숫자는 바꾸지 않고, 새 사실·평가·홍보 문구를 더하지 않는다. 《》『』「」‘’“” 안의 표현은 글자 하나 바꾸지 않는다. 문단 수와 문단 순서는 그대로 둔다. 번역투와 단골 문예 어휘는 피한다. 첫 문장은 「…철학서.」 같은 명사형이나 「…철학서이다.」 같은 이다형으로 맺고, 받침 없는 명사에 「다」만 붙인 「…철학서다.」 꼴은 쓰지 않는다.';

async function convert(batch,feedback={}){
 const input=batch.map(b=>({id:b.id,paragraphs:b.original,...(feedback[b.id]?{previousProblems:feedback[b.id]}:{})}));
 const answer=agyJson(await agyText(`${RULES}\nJSON만 반환: {"items":[{"id":"...","paragraphs":["..."]}]}\n입력:${JSON.stringify(input)}`));
 if(!Array.isArray(answer.items))throw Error('Conversion response shape differs');
 const pairs=batch.map(b=>({id:b.id,original:b.original,converted:answer.items.find(i=>i.id===b.id)?.paragraphs??null}));
 const critique=agyJson(await agyText(`한국인이 한국어로 쓴 글 답게 주의해서 작성한다. 책 소개 원문(정중체)과 간결체 전환본을 대조해 엄격히 검수한다. 뜻이 바뀌었거나, 없던 사실·평가가 생겼거나, 정보가 빠졌거나, 정중체 종결이 남았거나, 종결어미만 바꿔 문장이 어색하거나, 번역투가 생겼으면 pass=false. 새 조사는 하지 않는다. JSON만 반환: {"items":[{"id":"...","pass":true,"issues":[]}]}\n대조:${JSON.stringify(pairs)}`));
 const results={};
 for(const p of pairs){
  const review=critique.items?.find(i=>i.id===p.id),problems=conversionProblems(p.original,p.converted);
  if(review?.pass!==true||!Array.isArray(review.issues)||review.issues.length)problems.push(...(review?.issues?.length?review.issues.map(i=>'critic: '+i):['critic rejected']));
  results[p.id]={converted:p.converted,review,problems};
 }
 return results;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2),arg=n=>args.find(a=>a.startsWith('--'+n+'='))?.slice(n.length+3),introsFile=arg('intros'),out=arg('out'),limit=arg('limit')?Number(arg('limit')):Infinity;
 if(!introsFile||!out||![introsFile,out].every(path.isAbsolute)||!(limit>0)||args.some(a=>!/^--(intros|out|limit)=/.test(a)))throw Error('--intros=<absolute JSON> --out=<absolute directory> [--limit=N]');
 fs.mkdirSync(out,{recursive:true});
 const cacheFile=path.join(out,'conversions.json'),cache=fs.existsSync(cacheFile)?read(cacheFile):{},state={stage:'running',model:AGY_TEXT_MODEL,converted:0,blocked:[],startedAt:new Date().toISOString()};
 const report=()=>write(path.join(out,'state.json'),{...state,cached:Object.keys(cache).length,updatedAt:new Date().toISOString()});
 const unique=new Map();
 for(const p of Object.values(read(introsFile).posts))for(const intro of p.intros)if(intro.paragraphs.length&&intro.paragraphs.some(t=>POLITE_ENDING.test(t.trim()))){const id=blurbKey(intro.paragraphs);if(!cache[id])unique.set(id,{id,original:intro.paragraphs,book:intro.book});}
 const jobs=[...unique.values()].slice(0,limit),batches=[];for(let i=0;i<jobs.length;i+=10)batches.push(jobs.slice(i,i+10));
 state.total=jobs.length;report();console.log(JSON.stringify({pending:jobs.length,batches:batches.length,cached:Object.keys(cache).length}));
 let next=0,stopped=false;
 await Promise.all(Array.from({length:Math.min(3,batches.length)},async()=>{while(!stopped&&next<batches.length){const batch=batches[next++];
  try{
   let results=await convert(batch);const retry=batch.filter(b=>results[b.id].problems.length);
   if(retry.length)results={...results,...await convert(retry,Object.fromEntries(retry.map(b=>[b.id,results[b.id].problems])))};
   for(const b of batch){const r=results[b.id];if(r.problems.length){state.blocked.push({id:b.id,book:b.book,problems:r.problems});continue;}cache[b.id]={original:b.original,paragraphs:r.converted,review:r.review,model:AGY_TEXT_MODEL,convertedAt:new Date().toISOString()};state.converted++;}
   write(cacheFile,cache);
  }catch(e){state.blocked.push({batch:batch.map(b=>b.id),error:String(e).slice(0,300)});if(e.globalStop){stopped=true;state.stage='stopped';state.error=String(e);}}
  report();console.log(JSON.stringify({converted:state.converted,blocked:state.blocked.length,total:state.total}));
 }}));
 if(!stopped)state.stage=state.blocked.length?'finished-with-blocked':'complete';report();console.log(JSON.stringify({stage:state.stage,converted:state.converted,blocked:state.blocked.length}));
 if(stopped)process.exitCode=3;
}
