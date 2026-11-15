// 책장 보완 요청문을 고정부(localStorage)와 가변부로 나눠 크롬 발송 JS를 만든다. 합쳐진 요청문은 러너 submit()의 books-only 요청문과 같다. Carbon 높음 선택 확인 후 전송(Ultra 계정 전용).
// 사용(저장소 루트): node --import tsx <이 파일> init  |  node --import tsx <이 파일> <slug> [추가 참조 URL...]
import { R, W } from './paths.mjs'
import fs from 'node:fs/promises'
import { PICK, SEND } from './mode.mjs'
process.loadEnvFile(R+'/sw/web-bo/.env')
// 웹 1차 조사용 축약 규칙(26.11.15). 예전에는 독서 방식 본문 룰북과 조사·감상경위 룰북 전문(약 1만 2천 자)을 붙였으나
// 생성 오류와 무관하게 금지 규칙(지어낸 장면·해석 문장·저자 혼동)을 지키지 못했고, 품질은 뒤 단계의 책별 출처 대조 검수가 만들었다.
// 웹에는 사실 확인과 출력 형식만 주고, 문체·영문·검수 규칙은 검수 단계(celeb-02-03)가 쥔다.
const A='[작업] 아래 인물의 책장 보완이다. 지정한 책마다 독서 근거를 조사하고 감상배경을 쓴다.'
const B=`
[책장 보완 규칙]
0. 웹 검색 도구를 반드시 쓴다. 참조 링크를 직접 열어 읽고, 열리지 않거나 근거가 없으면 Google 검색으로 같은 기사나 다른 원출처(인터뷰·칼럼·방송 녹취)를 찾아 읽는다. 원문을 붙여 달라고 되묻지 않는다.
1. 위 목록의 책만 다룬다. 인물이 그 책을 실제로 읽었다는 사실(읽었다, 읽고 있다, 다시 읽었다, 읽은 경험을 들어 추천했다)이 원출처로 확인될 때만 books에 넣는다. 소장·선물·구입·출연·낭독·제작·판권만 확인되는 책, 인물 본인이 쓴 책은 넣지 않는다.
2. 원출처는 인물 본인의 인터뷰·글·방송 발언이다. 위키·요약 블로그·서점 소개처럼 남이 다시 정리한 글만 있으면 unresolved로 둔다.
3. source_url에는 독서 사실이 실제로 적힌 주소 하나를 넣는다. 그 주소를 열어 책 제목이 나오는지 확인한 것만 넣는다.
4. 제목이 같은 다른 책과 헷갈리지 않게 저자와 원제를 확인한다. title_ko는 국내 번역판 제목을 쓴다.
5. review_ko(감상배경)에는 출처에 있는 사실만 쓴다: 언제, 어떤 계기로 읽었고, 무엇을 말했는지. 출처에 없는 장면·동기·횟수·시점을 덧붙이지 않는다. 책의 사상과 인물의 삶을 잇는 해석('맞닿아 있다', '겹친다', '밑바탕이 되었다' 같은 말)은 쓰지 않는다. 본인의 말이 남아 있으면 핵심 한두 대목을 따옴표로 직접 인용한다. 책 소개는 한 문장 이내로 한다. 두 문단 안팎으로 쓴다.
6. 한국인이 한국어로 쓴 글답게 쓴다. 번역투와 미사여구를 피한다.
7. 확인되지 않으면 지어내지 말고 unresolved에 이유를 한 줄로 적는다.

[출력 형식]
books의 각 항목: {"title_ko":"","title_en":"","author_ko":"","author_en":"","source_url":"","source_urls":[],"evidence":"출처에서 확인한 독서 사실 한두 문장","review_ko":"감상배경(문단은 \\n\\n)"}
unresolved의 각 항목: {"title_ko":"","title_en":"","unresolved_reason":""}`
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
