/** Headline drafts use agy first. --apply writes a complete, validated set to headlines.json. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { agyCall, looksQuotaLimited } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'
import { ASSETS } from '../blog-assets.mjs'
import { renderWork, TITLE_MAX, type Material } from './render.mts'

type Input = { name: string; title: string; year: string; maxLength: number; overview: string; context: { person: string; text: string }[] }
type Draft = { name: string; headline: string; candidates: string[]; reason: string; backend: string; writtenAt: string }
const DIR = path.join(ASSETS, 'tistory-cinema')
const WORK = path.join(DIR, '_headline-work')
const INPUT = path.join(WORK, 'input.json')
const RESULTS = path.join(WORK, 'results.json')
const HEADLINES = path.join(DIR, 'headlines.json')
const MODEL = 'gemini-3.8-flash-high'
const read = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'))
const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')
function write(file: string, value: unknown) {
  const temp = `${file}.${process.pid}.tmp`
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', 'utf8')
  fs.renameSync(temp, file)
}
function materials() {
  return new Map<string, Material>(fs.readdirSync(DIR)
    .filter(f => f.endsWith('.json') && !f.startsWith('_'))
    .flatMap(f => { const m = read(path.join(DIR, f)); return m.work ? [[f.slice(0, -5), m] as [string, Material]] : [] }))
}
function maxLength(m: Material) {
  let max = 0
  for (let n = 1; n <= Math.min(18, TITLE_MAX); n++) {
    const headline = '가'.repeat(n)
    if (renderWork({ ...m, headline }).title.startsWith(`${headline},`)) max = n
  }
  return max
}
function prepare() {
  fs.mkdirSync(WORK, { recursive: true })
  if (fs.existsSync(INPUT)) return read(INPUT) as { existing: Record<string, string>; rows: Input[] }
  const existing = read(HEADLINES) as Record<string, string>
  const rows: Input[] = [...materials()].filter(([name]) => !existing[name]).map(([name, m]) => ({
    name, title: m.work.title, year: (m.work.release ?? m.tmdb.release ?? '').slice(0, 4),
    maxLength: maxLength(m), overview: m.tmdb.overview ?? '',
    context: m.picked.map(p => ({ person: p.nickname, text: p.review })),
  })).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  for (const row of rows) if (!row.overview || row.maxLength < 5) throw new Error(`Insufficient headline input: ${row.name}`)
  const input = { preparedAt: new Date().toISOString(), existing, rows }
  write(INPUT, input)
  return input
}
function prompt(rows: Input[], feedback = '') {
  const notePath = path.join(WORK, 'sample-feedback.json')
  const notes = fs.existsSync(notePath) ? read(notePath) : { rows: [] }
  const targeted = (notes.rows ?? []).filter((r: { name: string }) => rows.some(input => input.name === r.name))
  return `한국어 영화 블로그의 제목 앞에 붙일 헤드라인을 집필한다. 아래 각 작품을 독립적으로 처리한다.
목적: 이 영화를 모르는 독자가 어떤 이야기인지 알고 읽어보고 싶게 하는 짧은 한 줄.
기존 기준: 대부 → '가족을 지키려다 두목이 된 남자', 2001 스페이스 오디세이 → '말없이 그린 진화'.
공통 영화 소개처럼 모호하게 쓰지 말고, 그 영화의 주인공이 겪는 특이한 상황·선택·갈등 가운데 하나를 잡는다.
인물이나 사건의 목록을 나열하는 데서 끝내지 않는다. '살해된 남편과 심문받는 아내와 산적'처럼 등장인물 셋을 열거한 문장은 제목으로 약하다. 어떤 사건의 의문이나 충돌인지가 드러나게 구성하라.
흥미는 구체적인 이야기에서 만든다. 의미·철학·운명·본질·시대를 관통한다는 추상 평론, 명작이라는 찬사, 충격적인 결말/꼭 봐야 할 같은 낚시, 억지 감동은 덧붙이지 않는다.
한 가지 장식 어휘를 일괄 치환하거나 모든 작품을 같은 문장 틀로 만들지 않는다. 자연스러운 한국어를 쓴다.
교정 견본: '사람이 사람을 소유하는 제도를 두고 형제끼리 총을 겨눈 전쟁'보다 '같은 땅의 형제들은 노예제를 두고 서로 총을 겨누고 있었다'가 직접적이다. 개념은 이름으로, 사람의 행동은 동사로 적는다.
영화명·배우·감독 이름·감상 인원은 뒤에 붙으므로 한 줄에 반복하지 않는다. 결말을 단정하거나 제공 자료에 없는 사건·동기를 창작하지 않는다.
중요한 결말, 범인 정체, 누가 누구를 죽이는지부터 제목에 드러내지 않는다. 영화가 시작되는 곤경이나 중심 갈등을 소개한다.
행위자와 인과를 정확히 유지한다. 누군가에게 명령한 일을 그 사람이 직접 행동한 것처럼 쓰거나, 원인과 결과를 임의로 붙이지 않는다. '조직을 키우려 배신한 형을 쐈다'처럼 결말·행위자·동기를 한꺼번에 압축한 제목은 쓰지 않는다.
'정의를 비웃는 광기와의 전면전'처럼 추상 명사끼리 싸우게 하지 않는다. 형용사로 세게 부풀리기보다 누가 어떤 일을 겪는지 알게 한다.
재료는 overview와 context다. context의 인물 평가는 평가로 읽고 작품의 새 사실로 단정하지 않는다. 외부 출처 조사, DB·파일 수정, 다른 도구 호출은 하지 않는다. 이 지시를 전달한 임시 파일을 읽는 것은 허용한다.
가급적 10~16자로 쓰되 각 maxLength(공백·문장부호 포함)를 반드시 지킨다. 중간이 잘린 문장이나 억지로 붙인 합성어를 만들지 않는다.
각 작품에서 방향이 다른 후보 3개를 만들고, 가장 구체적이고 자연스럽게 읽히는 하나를 headline으로 고른다. reason에는 독자가 그 한 줄로 영화의 무엇을 알게 되는지 한 문장으로 적는다.
JSON 객체 하나만 출력한다. 코드펜스·설명문 없이 {"rows":[{"name":"입력과 동일","headline":"선택한 한 줄","candidates":["후보1","후보2","후보3"],"reason":"선택 이유"}]} 형식이다.
${feedback ? `이전 응답의 수정 사항: ${feedback}` : ''}
${targeted.length ? `이 작품의 표본 피드백을 반영하라: ${JSON.stringify(targeted)}` : ''}
입력:
${JSON.stringify(rows)}`
}
function parse(text: string) {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  return JSON.parse(clean)
}
function validate(rows: Draft[], inputs: Input[], ms: Map<string, Material>) {
  const expected = new Map(inputs.map(r => [r.name, r]))
  const ids = new Set<string>()
  const errors: string[] = []
  for (const row of rows) {
    const input = expected.get(row.name)
    if (!input || ids.has(row.name)) { errors.push(`Unexpected/duplicate name: ${row.name}`); continue }
    ids.add(row.name)
    if (typeof row.headline !== 'string' || !row.headline.trim() || row.headline !== row.headline.trim() || /[\r\n]/.test(row.headline)) { errors.push(`${row.name}: empty or malformed headline`); continue }
    if (row.headline.length > input.maxLength) errors.push(`${row.name}: ${row.headline.length} chars exceeds ${input.maxLength}`)
    if (!Array.isArray(row.candidates) || !row.candidates.includes(row.headline)) errors.push(`${row.name}: headline not among candidates`)
    if (typeof row.reason !== 'string' || !row.reason.trim()) errors.push(`${row.name}: missing reason`)
    const title = renderWork({ ...ms.get(row.name)!, headline: row.headline }).title
    if (!title.startsWith(`${row.headline},`) || title.length > TITLE_MAX) errors.push(`${row.name}: headline is lost or title is too long`)
  }
  for (const name of expected.keys()) if (!ids.has(name)) errors.push(`Missing: ${name}`)
  return errors
}
async function main() {
  const args = process.argv.slice(2)
  const getArg = (flag: string, fallback: string) => { const i = args.indexOf(flag); return i < 0 ? fallback : args[i + 1] }
  const input = prepare()
  const ms = materials()
  const result: { rows: Draft[]; status?: string; error?: string } = fs.existsSync(RESULTS) ? read(RESULTS) : { rows: [] }
  const done = new Set(result.rows.map(r => r.name))
  if (done.size !== result.rows.length) throw new Error('Duplicate draft names')
  const completedInputs = input.rows.filter(r => done.has(r.name))
  const errors = validate(result.rows, completedInputs, ms)
  if (errors.length) throw new Error(errors.join('\n'))

  if (args.includes('--apply')) {
    const allErrors = validate(result.rows, input.rows, ms)
    if (allErrors.length) throw new Error(allErrors.join('\n'))
    const current = read(HEADLINES) as Record<string, string>
    for (const [name, value] of Object.entries(input.existing)) if (current[name] !== value) throw new Error(`Existing headline changed: ${name}`)
    const merged = { ...current }
    for (const row of result.rows) {
      if (current[row.name] && current[row.name] !== row.headline) throw new Error(`Conflicting headline: ${row.name}`)
      merged[row.name] = row.headline
    }
    for (const name of ms.keys()) if (!merged[name]) throw new Error(`No headline: ${name}`)
    const backup = path.join(DIR, '_backup', `headlines-before-${stamp()}.json`)
    fs.copyFileSync(HEADLINES, backup, fs.constants.COPYFILE_EXCL)
    write(HEADLINES, merged)
    console.log(JSON.stringify({ applied: result.rows.length, total: Object.keys(merged).length, backup }, null, 2))
    return
  }
  const names = getArg('--names', '').split(',').filter(Boolean)
  const revise = args.includes('--revise')
  if (revise && !names.length) throw new Error('--revise requires explicit --names')
  const limit = Number(getArg('--limit', '6'))
  const batchSize = Number(getArg('--batch-size', '6'))
  const concurrency = Number(getArg('--concurrency', '1'))
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 8) throw new Error('Invalid limit/batch size')
  if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 2) throw new Error('Concurrency must be 1 or 2')
  const pending = input.rows.filter(r => (revise ? done.has(r.name) : !done.has(r.name)) && (!names.length || names.includes(r.name))).slice(0, limit)
  if (!args.includes('--run')) { console.log(JSON.stringify({ total: input.rows.length, completed: done.size, next: pending.map(r => ({ name: r.name, maxLength: r.maxLength })) }, null, 2)); return }
  let next = 0
  let stopReason = ''
  let failure = ''
  async function runBatch(batch: Input[], index: number) {
    let feedback = ''
    let succeeded = false
    for (let attempt = 0; attempt < 2; attempt++) {
      if (stopReason) return
      const runId = `${stamp()}-${index}-${attempt}`
      try {
        const text = await agyCall(prompt(batch, feedback), { model: MODEL, timeoutMs: 300000 })
        fs.writeFileSync(path.join(WORK, `response-${runId}.txt`), text + '\n', 'utf8')
        if (looksQuotaLimited(text)) throw new Error(text)
        const parsed = parse(text)
        if (!Array.isArray(parsed.rows)) throw new Error('Response rows must be an array')
        const checks = validate(parsed.rows, batch, ms)
        if (checks.length) throw new Error(checks.join('; '))
        for (const row of parsed.rows as Draft[]) {
          const draft = { ...row, backend: `agy:${MODEL}`, writtenAt: new Date().toISOString() }
          const existing = result.rows.findIndex(r => r.name === row.name)
          if (existing >= 0) result.rows[existing] = draft
          else result.rows.push(draft)
        }
        result.status = stopReason || (result.rows.length === input.rows.length ? 'complete' : 'running')
        if (!stopReason) delete result.error
        write(RESULTS, result)
        console.log(JSON.stringify({ completed: result.rows.length, total: input.rows.length, works: parsed.rows.map((r: Draft) => r.name) }))
        succeeded = true
        break
      } catch (error) {
        feedback = error instanceof Error ? error.message : String(error)
        fs.writeFileSync(path.join(WORK, `error-${runId}.txt`), feedback + '\n', 'utf8')
        if (looksQuotaLimited(feedback)) {
          stopReason = 'agy_quota'; result.status = stopReason; result.error = feedback; write(RESULTS, result)
          console.error(`agy quota: ${feedback}`); process.exitCode = 2; return
        }
      }
    }
    if (!succeeded) { stopReason = 'error'; failure = feedback; result.status = stopReason; result.error = feedback; write(RESULTS, result) }
  }
  async function worker() {
    while (!stopReason && next < pending.length) {
      const index = next
      next += batchSize
      await runBatch(pending.slice(index, index + batchSize), index)
    }
  }
  const workers = await Promise.allSettled(Array.from({ length: concurrency }, worker))
  for (const outcome of workers) if (outcome.status === 'rejected') throw outcome.reason
  if (failure) throw new Error(failure)
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch(error => { console.error(error.message); process.exitCode = 1 })
}
