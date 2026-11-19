// 신규 조사 원고의 사실·직접 인용을 출처 원문과 대조한다(agy Ultra Carbon, 웹 열람). 결과: relist/<slug>.verify.json
import fs from 'node:fs'; import { pathToFileURL } from 'node:url'
import { R, W } from './paths.mjs'
const { agyCall, jsonOf } = await import(new URL('./agy-slot.mjs', import.meta.url).href)
const D=W + '/relist'
await Promise.all(process.argv[2].split(',').filter(s=>fs.existsSync(`${D}/${s}.research.json`)||console.log(s,'SKIP 조사 없음')).map(async s=>{const j=JSON.parse(fs.readFileSync(`${D}/${s}.research.json`,'utf8'))
 const prompt=`아래 한국어 원고의 문장을 출처 원문과 대조해 검증해주세요. 출처 URL을 직접 열어 읽고(열리지 않으면 같은 기사를 웹 검색으로 찾아 읽고) 판정하세요.\n- 각 문단의 사실(누가·무엇을·언제·어떤 작품)과 직접 인용(“…”)이 출처에 있는지 확인합니다.\n- 출처에 없거나 출처와 다른 내용, 과장·추측으로 덧붙인 동기·장면만 골라냅니다. 맞는 문장은 적지 마세요.\n출력은 설명 없이 JSON 코드 블록 하나: {"slug":"${s}","problems":[{"text":"문제 문장(원고 그대로 일부)","issue":"무엇이 출처와 다른지","fix":"출처대로 고친 문장 또는 삭제"}],"checked_sources":["실제로 읽은 URL"]}\n\n[원고]\n${j.ko}\n\n[출처]\n${j.sources.join('\n')}`
 try{const out=await agyCall(prompt,{model:'gemini-4-carbon-high',timeoutMs:60*60e3});const v=jsonOf(out);fs.writeFileSync(`${D}/${s}.verify.json`,JSON.stringify(v,null,1));console.log(s,'검증',v.problems.length,'건, 읽은 출처',v.checked_sources?.length)}catch(e){console.log(s,'FAIL',String(e.message).slice(0,150))}}))
console.log('VERIFY-DONE')
