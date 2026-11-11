// 책장 보완 요청문을 고정부(localStorage)와 가변부로 나눠 크롬 발송 JS를 만든다. 합쳐진 요청문은 러너 submit()의 books-only 요청문과 같다. Carbon 높음 선택 확인 후 전송(Ultra 계정 전용).
// 사용(저장소 루트): node --import tsx <이 파일> init  |  node --import tsx <이 파일> <slug> [추가 참조 URL...]
import { R, W } from './paths.mjs'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { PICK, SEND } from './mode.mjs'
const m=await import(pathToFileURL(R+'/scripts/browser/reading-way-argon.mjs').href)
process.loadEnvFile(R+'/sw/web-bo/.env')
const sec=async f=>m.argonSections(await fs.readFile(`${R}/docs/project/celeb/${f}`,'utf8'),f)
const A=await sec('celeb-05-02-reading-way.md')
const B=` 이 책들의 관계 근거를 직접 조사하고 아래 조사·감상경위 규칙에 따라 책별 감상배경도 완성해주세요. 독서 방식 본문이 조사 미달이어도 확인한 책 자료는 별도로 전달하고, 본문에 이 책들을 모두 등장시킬 필요는 없습니다. 확인한 자료를 그대로 나열하지 말고 룰북에 따라 글을 구성해주세요.\n${await sec('celeb-02-01-content-research.md')}\n${await sec('celeb-02-03-content-review.md')}\nbooks 배열에 {title_ko,title_en,author_ko,author_en,source_url,source_urls,evidence,review_ko}을 담아주세요. evidence는 관계를 확인할 조사 내용이며 본문이 아닙니다. source_urls는 추가 근거 URL 배열입니다. 관계를 확인하지 못한 책은 {title_en,unresolved_reason}으로 unresolved 배열에 담고 감상배경을 만들지 마세요.`
const arg=process.argv[2]
if(arg==='init'){await fs.writeFile(`${W}/scoped/init-books.js`,`localStorage.setItem('rwBookA',${JSON.stringify(A)});localStorage.setItem('rwBookB',${JSON.stringify(B)});[localStorage.getItem('rwBookA').length,localStorage.getItem('rwBookB').length]`);console.log('init',A.length,B.length);process.exit()}
const url=process.env.NEXT_PUBLIC_DB_API_URL,key=process.env.DB_SECRET_KEY,H={apikey:key,Authorization:`Bearer ${key}`}
const get=async p=>(await fetch(`${url}/rest/v1/${p}`,{headers:H})).json()
const slug=arg,extra=process.argv.slice(3)
const scope=JSON.parse(await fs.readFile(`${W}/scoped/${slug}.scope.json`,'utf8')).bookScope
const [c]=await get(`celebs?slug=eq.${slug}&select=id,slug,nickname,nickname_en,gender,birth_date,death_date,profession`)
const rows=await get(`celeb_contents?celeb_id=eq.${c.id}&source_url=not.is.null&select=source_url,contents!inner(type)&contents.type=eq.BOOK`)
const shelf=[...new Set(rows.map(r=>r.source_url).filter(u=>/^https?:\/\//.test(u??'')))].sort().slice(0,4)
const links=[...new Set([...extra,...shelf])].slice(0,8)
const identity={slug,name:c.nickname,name_en:c.nickname_en,gender:c.gender===true?'남성':c.gender===false?'여성':'미상',birth_date:c.birth_date,death_date:c.death_date,profession:c.profession}
const head=`인물: ${JSON.stringify(identity)}\n참조 링크: ${JSON.stringify(links)}\n\n`
const mid=`\n이번 책장 보완 대상은 ${JSON.stringify(scope)}입니다.`
const tail=`\n\n이번 작업은 기존 독서 방식 본문을 수정하지 않는 책장 보완입니다. 지정한 책의 원출처를 직접 읽고 관계 근거와 한국어 감상배경만 완성해주세요.\n응답은 JSON 코드 블록 하나로 주세요: {"slug":${JSON.stringify(slug)},"books":[],"unresolved":[]}. ko와 en 필드는 만들지 마세요.`
const instruction='아래 요청과 룰북, 참조 링크로 책장 보완 대상만 직접 조사하고 한국어 감상배경을 완성해주세요. 독서 방식 본문은 작성하지 마세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요. 지정한 JSON 코드 블록 하나로 주세요.'
await fs.writeFile(`${W}/scoped/${slug}.packet.txt`,head+A+mid+B+tail,'utf8')
const js=`await (async()=>{${PICK}if(location.href.includes('google.com/sorry'))return {sent:false,why:'captcha'};const A=localStorage.getItem('rwBookA'),B=localStorage.getItem('rwBookB');if(!A||!B)return {sent:false,why:'no rules'};const p=await pick();if(!p.ok)return {sent:false,...p};if(document.querySelector('model-response'))return {sent:false,why:'not fresh'};const text=${JSON.stringify(instruction+'\n\n'+head)}+A+${JSON.stringify(mid)}+B+${JSON.stringify(tail)};const box=document.querySelector('rich-textarea div[contenteditable="true"]');box.focus();document.execCommand('insertText',false,text);await w(2000);const preMode=btn().getAttribute('aria-label');const preAt=new Date().toISOString();const b=document.querySelector(${JSON.stringify(SEND)});if(!b||b.disabled)return {sent:false,why:'no send'};b.click();await w(2500);return {sent:true,preMode,preAt,len:text.length,left:document.querySelector('rich-textarea div[contenteditable="true"]').innerText.trim().length}})()`
await fs.writeFile(`${W}/scoped/send-books-${slug}.js`,js,'utf8')
console.log(slug,'js',js.length,'links',links.length)
