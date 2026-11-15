// 독서 방식 신규 조사(agy Ultra Carbon High, 웹 검색). 인물당 1프로세스 동시. 결과: relist/<slug>.research.json {slug,ko,sources}
import fs from 'node:fs'; import { pathToFileURL } from 'node:url'
import { R, W } from './paths.mjs'
import { idents } from './ident.mjs'
const { agyCall } = await import(new URL('./agy-slot.mjs', import.meta.url).href)
const D=W + '/relist', rules=fs.readFileSync(R + '/docs/project/celeb/celeb-05-02-reading-way.md','utf8')
const ident=await idents(process.argv[2].split(','))
await Promise.all(process.argv[2].split(',').map(async s=>{const t0=Date.now()
 const prompt=`아래 룰북에 따라 이 인물의 독서 방식 원고를 새로 조사해 완성해주세요. 한국인이 한국어로 쓴 글답게 주의해서 작성해주세요.\n- 웹 검색 도구로 인터뷰·기사·본인 SNS·저서 등 1차에 가까운 출처를 직접 찾아 읽고, 출처에서 확인한 사실만 쓰세요. 출처에 없는 장면·횟수·시점·동기를 지어내지 마세요.\n- 직접 인용은 출처 원문을 충실히 옮긴 번역만 쓰세요.\n- 책 제목을 늘어놓지 말고, 그 사람의 삶에서 독서가 맡은 역할 한 줄을 정한 뒤 그 줄기를 보여 주는 일화만 쓰세요.\n- 근거가 적으면 짧게 쓰세요. 근거가 거의 없으면 ko를 빈 문자열로 두세요.\n\n[룰북]\n${rules}\n\n[인물]\n${JSON.stringify(ident[s])}\n\n[출력]\n설명 없이 JSON 코드 블록 하나만: {"slug":"${s}","ko":"문단은 \n\n로 구분","sources":["본문의 각 사실을 확인한 URL 목록"]}`
 try{const out=await agyCall(prompt,{model:'gemini-4-carbon-high',timeoutMs:40*60e3});const j=JSON.parse(out.match(/\{[\s\S]*\}/)[0]);fs.writeFileSync(`${D}/${s}.research.json`,JSON.stringify(j,null,1));console.log(s,'OK',[...(j.ko||'')].length,'출처',(j.sources||[]).length,Math.round((Date.now()-t0)/1000)+'s')}
 catch(e){console.log(s,'FAIL',String(e.message).slice(0,200))}}))
console.log('RESEARCH-DONE')
