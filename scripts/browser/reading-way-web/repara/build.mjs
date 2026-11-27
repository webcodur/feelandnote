// 400자 넘는 한국어 문단이 있는 독서방식 본문을 뽑아, 긴 문단만 문장 번호를 붙여 묶음 파일로 쓴다.
// 사용(저장소 루트): node <이 파일> [묶음당 인물 수=30] → 작업 폴더 paragraph/in/bNN.txt. 하위 에이전트에 PROMPT.md와 입력·출력 경로를 주고, 끝나면 apply.mjs로 검사·저장한다.
// 하이쿠는 "몇 번 문장 뒤에서 끊는다"만 답하므로 글자는 바뀌지 않는다. 원본은 src/<slug>.json에 둔다.
import fs from 'node:fs'
import { sents } from './seg.mjs'
process.loadEnvFile(R + '/sw/web-bo/.env')
import { R, W } from '../paths.mjs'
const D = W + '/paragraph/'
const u = process.env.NEXT_PUBLIC_DB_API_URL, k = process.env.DB_SECRET_KEY, H = { apikey: k, Authorization: 'Bearer ' + k }
const BATCH = Number(process.argv[2] || 30)
const rows = []
for (let off = 0; ; off += 1000) {
  const r = await (await fetch(`${u}/rest/v1/celebs?reading_way=neq.&select=slug,reading_way,reading_way_en&order=slug&offset=${off}&limit=1000`, { headers: H })).json()
  rows.push(...r); if (r.length < 1000) break
}
const paras = (s) => s.split(/\n\s*\n/)
for (const d of ['src', 'in', 'out']) fs.mkdirSync(D + d, { recursive: true })
const items = [], skip = []
for (const r of rows) {
  if (!r.reading_way_en) { skip.push(r.slug + ' no-en'); continue }
  const pk = paras(r.reading_way), pe = paras(r.reading_way_en)
  const long = pk.map((p, i) => [...p].length > 400 ? i : -1).filter((i) => i >= 0)
  if (!long.length) continue
  if (pk.length !== pe.length) { skip.push(r.slug + ' para-mismatch'); continue }
  fs.writeFileSync(D + `src/${r.slug.replace(/[^\w.-]/g, '_')}.json`, JSON.stringify(r))
  let t = `## ${r.slug}\n`
  for (const i of long) {
    t += `### P${i + 1} (KO ${[...pk[i]].length}자)\nKO\n` + sents(pk[i], 'ko').map((s, j) => `${j + 1}| ${s}`).join('\n') + '\nEN\n' + sents(pe[i], 'en').map((s, j) => `${j + 1}| ${s}`).join('\n') + '\n'
  }
  items.push(t)
}
let n = 0
for (let i = 0; i < items.length; i += BATCH) fs.writeFileSync(D + `in/b${String(++n).padStart(2, '0')}.txt`, items.slice(i, i + BATCH).join('\n'))
console.log('bodies', items.length, 'batches', n, 'skip', skip.length, skip.slice(0, 10).join(' | '))
