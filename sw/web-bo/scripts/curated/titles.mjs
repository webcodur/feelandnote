/**
 * 기관 선정 목록의 「한국어 정식 출간명」을 GPT(codex)로 알아낸다
 *
 * 왜 필요한가 — 지금까지는 목록 원문(영문 원제)을 그대로 한국 서점에 검색했다.
 * 번역서는 원제로 걸리지 않으므로 『파운데이션』도 『얼음과 불의 노래』도 못 찾고,
 * 찾더라도 영문 원서에 이어 붙어 한국어 서비스에 영문 표지가 떴다.
 * 한국어 제목을 먼저 알아내면 그 다음은 서점 검색이 해결한다.
 *
 * 두 가지를 함께 묻는다.
 *   1) 이 작품의 한국어 정식 출간명 (미출간이면 null)
 *   2) 지금 이어 붙인 우리 책이 정말 같은 작품인지 (오연결 색출)
 *
 * 사용법 (sw/web-bo 에서):
 *   node scripts/curated-korean-titles.mjs --dump            # 대상 추출만
 *   node scripts/curated-korean-titles.mjs --ask --limit 5   # 배치 5개만 물어보기
 *   node scripts/curated-korean-titles.mjs --ask             # 남은 전량
 *
 * 재실행 안전 — 이미 답을 받은 항목은 건너뛴다. rate limit에 막혀도 같은 명령으로 이어붙인다.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'
import { codexCall } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../../../..')
const WORK = join(ROOT, 'data/curated-lists/_korean-titles')

function loadEnv(p) {
  if (!existsSync(p)) return
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const m = raw.replace(/\r$/, '').match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
loadEnv(join(ROOT, '.env'))
loadEnv(join(ROOT, 'sw/web-bo/.env'))
loadEnv(join(ROOT, 'sw/web/.env'))

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

/** PostgREST는 1,000행에서 조용히 끊는다 — 정렬키를 고정해 페이지로 나눠 받는다 */
async function selectAll(table, columns, tune = (q) => q) {
  const out = []
  const SIZE = 1000
  for (let from = 0; ; from += SIZE) {
    const { data, error } = await tune(supabase.from(table).select(columns)).range(from, from + SIZE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    if (!data?.length) break
    out.push(...data)
    if (data.length < SIZE) break
  }
  return out
}

/** 한 번에 묻는 건수. 40건은 답을 다 쓰기 전에 시간이 끊겼다 */
const BATCH = 20
/** 동시 호출 수 */
const CONCURRENCY = 6
/**
 * 사고 깊이. 이 일은 「이 책의 한국어 제목이 뭐냐」를 아는지 묻는 것이라
 * 깊이 생각할수록 나아지지 않는다. medium으로 돌렸더니 10분에 40건(전량 5시간)이었다.
 */
const EFFORT = 'low'

/** 대상 추출 — 미연결이거나, 이어졌지만 한국어판이 없는 항목 */
async function dump() {
  const lists = await selectAll('curated_lists', 'id, slug, title, content_type')
  const listById = new Map(lists.map((l) => [l.id, l]))

  const items = await selectAll(
    'curated_list_items',
    'id, list_id, content_id, raw_title, raw_creator, sort_order',
    (q) => q.eq('hidden', false).order('id', { ascending: true })
  )

  // 이어 붙은 작품의 언어별 제목
  const locales = await selectAll('content_locales', 'content_id, locale, title, creator')
  const byContent = new Map()
  for (const l of locales) {
    const e = byContent.get(l.content_id) ?? {}
    e[l.locale] = { title: l.title, creator: l.creator }
    byContent.set(l.content_id, e)
  }

  const targets = []
  for (const it of items) {
    const list = listById.get(it.list_id)
    if (!list) continue
    const loc = it.content_id ? byContent.get(it.content_id) : null
    // 한국어 자리에 영문 제목이 들어 있는 책이 많다(「Mistborn Trilogy Set」).
    // 글자를 보지 않고 자리만 세면 번역본이 있는 줄 알고 그냥 넘어간다
    const hasKo = !!loc?.ko?.title && /[가-힣]/.test(loc.ko.title)
    const linkedKo = loc?.ko?.title ?? null
    const linkedEn = loc?.en?.title ?? null

    // 원문이 한국어면 이미 한국어 자료다 — 건드리지 않는다
    const rawIsKorean = /[가-힣]/.test(it.raw_title)

    if (rawIsKorean && hasKo) continue

    targets.push({
      id: it.id,
      listSlug: list.slug,
      listTitle: list.title,
      contentType: list.content_type,
      rawTitle: it.raw_title,
      rawCreator: it.raw_creator,
      contentId: it.content_id,
      linkedKo,
      linkedEn,
      state: !it.content_id ? 'unlinked' : hasKo ? 'linked-ko' : 'linked-en-only',
    })
  }

  // 급한 것부터 — 아예 안 이어진 것, 그다음 영문판만 붙은 것,
  // 이미 한국어판이 붙은 것은 오연결 점검이 목적이라 뒤로 미룬다
  const PRIORITY = { unlinked: 0, 'linked-en-only': 1, 'linked-ko': 2 }
  targets.sort((a, b) => PRIORITY[a.state] - PRIORITY[b.state])

  mkdirSync(WORK, { recursive: true })
  writeFileSync(join(WORK, 'targets.json'), JSON.stringify(targets, null, 1), 'utf-8')

  const byState = {}
  for (const t of targets) byState[t.state] = (byState[t.state] ?? 0) + 1
  console.log('대상', targets.length, byState)
  return targets
}

const SYSTEM = `너는 한국 출판 시장에 밝은 서지 전문가다. 아래 작품 목록 각각에 대해 답한다.

각 항목에 대해:
1. koTitle — 한국에 정식 번역 출간된 적이 있으면 그 **정확한 한국어 제목**. 여러 판이 있으면 가장 널리 쓰이는 제목 하나. 미출간이면 null.
   - 시리즈 전체를 가리키는 원문(예: "The Foundation Trilogy", "A Song Of Ice And Fire Series")이면 그 시리즈의 한국어 이름(예: "파운데이션", "얼음과 불의 노래")을 준다.
   - 원문이 이미 한국어면 그대로 둔다.
2. koCreator — 한국어판 표기 저자명(예: "아이작 아시모프"). 모르면 null.
3. linkedOk — "현재연결" 값이 주어진 경우, 그 책이 원문과 **같은 작품**이면 true, 다른 작품이면 false. 현재연결이 없으면 null.
   - 제목이 비슷해 보여도 저자가 다르면 false다. 예: 원문 "American Gods / Neil Gaiman" 에 "AI, 신들의 전쟁"이 붙어 있으면 false.

규칙:
- 확실하지 않으면 지어내지 말고 null을 쓴다. 없는 번역서를 만들어내면 안 된다.
- 부제·권수는 뺀다. "파운데이션 1"이 아니라 "파운데이션".
- 출력은 JSON 배열 하나만. 설명·인사·코드펜스 금지.

출력 형식:
[{"n":1,"koTitle":"파운데이션","koCreator":"아이작 아시모프","linkedOk":null}, ...]`

function buildPrompt(batch) {
  const lines = batch.map((t, i) => {
    const parts = [`${i + 1}. 원문: ${t.rawTitle}`]
    if (t.rawCreator) parts.push(`저자: ${t.rawCreator}`)
    parts.push(`갈래: ${t.contentType === 'VIDEO' ? '영화·영상' : '책'}`)
    if (t.linkedKo) parts.push(`현재연결: ${t.linkedKo}`)
    else if (t.linkedEn) parts.push(`현재연결(영문): ${t.linkedEn}`)
    return parts.join(' | ')
  })
  return `${SYSTEM}\n\n---\n${lines.join('\n')}`
}

function parseAnswer(text, batch) {
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) throw new Error('JSON 배열을 찾지 못함: ' + text.slice(0, 200))
  const arr = JSON.parse(m[0])
  const out = []
  for (const row of arr) {
    const t = batch[(row.n ?? 0) - 1]
    if (!t) continue
    out.push({
      id: t.id,
      rawTitle: t.rawTitle,
      koTitle: row.koTitle || null,
      koCreator: row.koCreator || null,
      linkedOk: typeof row.linkedOk === 'boolean' ? row.linkedOk : null,
    })
  }
  return out
}

async function ask(limitBatches) {
  const targetsPath = join(WORK, 'targets.json')
  if (!existsSync(targetsPath)) await dump()
  const targets = JSON.parse(readFileSync(targetsPath, 'utf-8'))

  const answersPath = join(WORK, 'answers.json')
  const answers = existsSync(answersPath) ? JSON.parse(readFileSync(answersPath, 'utf-8')) : {}

  const todo = targets.filter((t) => !answers[t.id])
  console.log(`전체 ${targets.length} / 남은 ${todo.length}`)
  if (todo.length === 0) return

  const batches = []
  for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH))
  const run = limitBatches ? batches.slice(0, limitBatches) : batches

  let ok = 0
  let fail = 0
  let done = 0

  // 동시에 셋씩 굴린다. 한 배치가 끝날 때마다 바로 저장해 중간에 끊겨도 잃지 않는다
  async function work(batch, label) {
    try {
      const text = await codexCall(buildPrompt(batch), { timeoutMs: 420000, effort: EFFORT })
      for (const row of parseAnswer(text, batch)) answers[row.id] = row
      writeFileSync(answersPath, JSON.stringify(answers, null, 1), 'utf-8')
      ok++
      console.log(`  ${label} ${batch.length}건 수신 (누적 ${Object.keys(answers).length})`)
    } catch (e) {
      fail++
      console.log(`  ${label} 실패: ${String(e).slice(0, 300)}`)
    }
    done++
  }

  for (let i = 0; i < run.length; i += CONCURRENCY) {
    const slice = run.slice(i, i + CONCURRENCY)
    await Promise.all(slice.map((b, j) => work(b, `[${i + j + 1}/${run.length}]`)))
  }
  console.log(`완료 — 배치 성공 ${ok} / 실패 ${fail} / 누적 답변 ${Object.keys(answers).length} / 처리 ${done}`)
}

const args = process.argv.slice(2)
const limitIdx = args.indexOf('--limit')
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 0

if (args.includes('--dump')) await dump()
else if (args.includes('--ask')) await ask(limit)
else console.log('사용법: --dump | --ask [--limit N]')
