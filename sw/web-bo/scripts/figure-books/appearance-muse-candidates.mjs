/**
 * 작품 후보 조사(인물 기준). 등장 작품이 없는 실존 인물에게 모델로 등장 작품 후보를 조사하고 카카오로 책 정보를 검증한다.
 * DB는 읽기만 하며, 결과는 후속 사실 검수의 입력일 뿐 자동 연결하지 않는다.
 *
 * node --env-file=.env --import tsx scripts/figure-books/appearance-muse-candidates.mjs --limit 20
 * node --env-file=.env --import tsx scripts/figure-books/appearance-muse-candidates.mjs --out ../../data/celeb/figure-books/appearance-muse-2026-09-04.jsonl
 *
 * 중단되면 같은 --out으로 다시 실행한다. 이미 기록된 slug는 건너뛴다.
 */

import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { museCall } from '../../../../.agents/skills/opencode-muse/scripts/muse-call.mjs'
import { agyCall, AGY_TEXT_MODEL } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const DEFAULT_MODEL = 'opencode-go/glm-5.3-flash'

// PATH의 claude는 .cmd 래퍼다. 실체 .exe를 직접 부른다.
const CLAUDE_CLI = process.env.CLAUDE_BIN
  ?? 'C:/Program Files/nodejs/node_modules/@anthropic-ai/claude-code/bin/claude.exe'

function claudeCall(prompt, { model, timeoutMs }) {
  return new Promise((resolvePromise) => {
    // 저장소 안에서 돌리면 CLAUDE.md와 주변 파일을 읽어 문맥이 오염된다. 빈 임시 폴더를 준다.
    const dir = mkdtempSync(join(tmpdir(), 'cl-'))
    const args = ['-p', prompt, '--model', model, '--allowedTools', 'WebSearch', 'WebFetch']
    const child = spawn(CLAUDE_CLI, args, { cwd: dir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (chunk) => { out += chunk })
    child.stderr.on('data', (chunk) => { err += chunk })
    child.on('close', () => { clearTimeout(timer); resolvePromise({ text: out.trim(), err }) })
    child.on('error', (error) => { clearTimeout(timer); resolvePromise({ text: '', err: String(error) }) })
  })
}

// codex의 .cmd 래퍼는 경로 공백에서 깨진다('C:/Program' 오류). 실체 js를 node로 직접 돌린다.
const CODEX_CLI = process.env.CODEX_BIN
  ?? 'C:/Program Files/nodejs/node_modules/@openai/codex/bin/codex.js'
const CODEX_MODEL = process.env.CODEX_MODEL ?? 'gpt-6-astra'
const CODEX_EFFORT = process.env.CODEX_EFFORT ?? 'xhigh'

function codexCall(prompt, { model, timeoutMs }) {
  return new Promise((resolvePromise) => {
    // 저장소 밖 빈 폴더에서 돌린다. git 저장소가 아니므로 --skip-git-repo-check가 필요하다.
    const dir = mkdtempSync(join(tmpdir(), 'cx-'))
    const outFile = join(dir, 'out.txt')
    const args = ['exec', '-', '-m', model, '-c', `model_reasoning_effort=${CODEX_EFFORT}`,
      '--skip-git-repo-check', '--output-last-message', outFile, '--color', 'never']
    const child = spawn(process.execPath, [CODEX_CLI, ...args], { cwd: dir, windowsHide: true, stdio: ['pipe', 'ignore', 'ignore'] })
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.on('close', () => {
      clearTimeout(timer)
      let text = ''
      try { text = readFileSync(outFile, 'utf8').trim() } catch { /* 산출 파일이 없으면 빈 응답으로 본다 */ }
      resolvePromise(text)
    })
    child.on('error', () => { clearTimeout(timer); resolvePromise('') })
    child.stdin.write(prompt)
    child.stdin.end()
  })
}

// 조사 엔진은 갈아끼운다. opencode 라인이 막히면 agy로, agy 쿼터가 끝나면 claude·codex로 넘어간다.
async function research(prompt, { backend, model, timeoutMs }) {
  if (backend === 'codex') {
    const text = await codexCall(prompt, { model: model === DEFAULT_MODEL ? CODEX_MODEL : model, timeoutMs })
    return { text, attempts: 1 }
  }
  if (backend === 'agy') {
    const text = await agyCall(prompt, { model: model === DEFAULT_MODEL ? AGY_TEXT_MODEL : model, timeoutMs })
    return { text: String(text ?? '').trim(), attempts: 1 }
  }
  if (backend === 'claude') {
    const result = await claudeCall(prompt, { model: model === DEFAULT_MODEL ? 'sonnet' : model, timeoutMs })
    return { text: result.text, attempts: 1 }
  }
  const result = await museCall(prompt, { model, timeoutMs, retries: 2, minChars: 2 })
  return { text: result.text, attempts: result.attempts }
}
const PAGE_SIZE = 1000
const KAKAO_URL = 'https://dapi.kakao.com/v3/search/book'

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
const kakaoKey = process.env.KAKAO_REST_API_KEY
if (!dbUrl || !dbKey) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
if (!kakaoKey) throw new Error('KAKAO_REST_API_KEY가 필요합니다.')

const db = createClient(dbUrl, dbKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function allRows(label, page) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    const current = data ?? []
    rows.push(...current)
    if (current.length < PAGE_SIZE) return rows
  }
}

/**
 * scope='active'  공개된 실존 인물 중 등장 작품이 없는 사람(기본)
 * scope='new'     지정 시각 이후 등록된 신입 전원. 허구 인물과 비공개 인물을 포함한다
 *
 * 허구 인물도 같은 테이블로 연결한다. 실존 축은 대상 선정이 아니라 프롬프트를 가른다
 * (celeb-02-05-figure-books.md — 이 카탈로그는 어느 축과도 무관하게 모든 인물을 연결한다).
 */
async function loadTargets(scope, since) {
  const celebs = await allRows('celebs', (from, to) => {
    let query = db
      .from('celebs')
      .select('id,slug,nickname,nickname_en,profession,headline,bio,celeb_reality')
      .order('id')
      .range(from, to)
    if (scope === 'new') query = query.gte('created_at', since)
    else query = query.eq('publication_status', 'active').neq('celeb_reality', 'FICTION')
    return query
  })

  const relations = await allRows('figure_book_characters', (from, to) => db
    .from('figure_book_characters')
    .select('celeb_id,relation_type')
    .eq('relation_type', 'appearance')
    .order('celeb_id')
    .range(from, to))

  const influence = await allRows('celeb_influence', (from, to) => db
    .from('celeb_influence')
    .select('celeb_id,total_score')
    .order('celeb_id')
    .range(from, to))

  const hasAppearance = new Set(relations.map((row) => row.celeb_id))
  const scoreById = new Map(influence.map((row) => [row.celeb_id, row.total_score ?? 0]))

  return celebs
    .filter((celeb) => !hasAppearance.has(celeb.id))
    .map((celeb) => ({ ...celeb, score: scoreById.get(celeb.id) ?? 0 }))
    .sort((left, right) => right.score - left.score || left.slug.localeCompare(right.slug))
}

function buildPrompt(person) {
  const profile = [
    person.headline ? `소개 문구: ${person.headline}` : null,
    person.bio ? `약력: ${person.bio}` : null,
    person.nickname_en ? `영문 표기: ${person.nickname_en}` : null,
    person.profession ? `분류: ${person.profession}` : null,
  ].filter(Boolean).join('\n')

  // 허구·전승 인물은 전기가 아니라 그가 등장하는 원전을 찾는다. 자서전·회고록을 묻는 실존
  // 인물용 프롬프트를 그대로 주면 해설서와 어린이 축약본이 올라온다.
  if (person.celeb_reality === 'FICTION') {
    return `아래 인물이 등장하는 원전 작품의 한국어 출간본을 찾는다.

[인물]
이름: ${person.nickname}
${profile}

[반드시 지킨다]
- 위 소개와 일치하는 그 인물이어야 한다. 같은 이름의 다른 신화·다른 작품의 인물을 올리지 않는다.
- 쓰기 전에 웹을 검색해 실제로 한국어판이 출간됐는지, 그 작품에 이 인물이 나오는지 확인한다. 검색은 두 번까지만 한다.
- 기억에 의존하지 않는다. 존재하지 않는 책이나 확인하지 못한 책은 쓰지 않는다.
- **원전의 번역본을 우선한다.** 해설서·입문서·연구서·어린이 축약본·만화판은 제외한다.
- 원전이 여러 편이면 그 인물이 실제로 나오는 편만 쓴다. 나오지 않는 선행권을 올리지 않는다.
- 한국어판이 실제로 출간된 책만 쓴다. 원서만 있는 책은 제외한다.
- 글자 수를 세려고 스크립트를 실행하지 않는다.

[출력 형식]
확인된 책이 없으면 "없음" 한 단어만 쓴다.
있으면 최대 3권을 아래 형식의 한 줄씩으로만 쓴다. 머리말과 맺음말을 붙이지 않는다.
제목 | 저자 | 출판사 | 확인한 근거 URL | 이 작품에서 인물이 다뤄지는 범위 한 문장`
  }

  return `아래 인물이 본문에 실제로 등장하거나 책 전체의 중심 대상으로 다뤄지는 한국어 출간 도서를 찾는다.

[인물]
이름: ${person.nickname}
${profile}

[반드시 지킨다]
- 위 약력과 일치하는 그 사람이어야 한다. 동명이인의 책을 올리지 않는다.
- 쓰기 전에 웹을 검색해 실제로 출간된 책인지, 그 책이 이 인물을 다루는지 확인한다. 검색은 두 번까지만 한다.
- 기억에 의존하지 않는다. 존재하지 않는 책이나 확인하지 못한 책은 쓰지 않는다.
- 이 인물이 쓴 저작이라도 본인의 삶이 중심이 아니면(전문서·소설 등) 제외한다. 자서전·회고록은 포함한다.
- 한국어판이 실제로 출간된 책만 쓴다. 원서만 있는 책은 제외한다.
- 글자 수를 세려고 스크립트를 실행하지 않는다.

[출력 형식]
확인된 책이 없으면 "없음" 한 단어만 쓴다.
있으면 최대 4권을 아래 형식의 한 줄씩으로만 쓴다. 머리말과 맺음말을 붙이지 않는다.
제목 | 저자 | 출판사 | 확인한 근거 URL | 이 책에서 인물이 다뤄지는 범위 한 문장`
}

function parseBooks(text) {
  if (!text) return []
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('|'))
    .map((line) => line.replace(/^[-*\d.\s]+/, '').split('|').map((cell) => cell.trim()))
    // 모델이 형식 안내 줄을 그대로 되뱉는 일이 있다. 표 머리글은 책이 아니다.
    .filter((cells) => cells.length >= 4 && cells[0] && cells[1])
    .filter((cells) => !(cells[0] === '제목' && cells[1] === '저자'))
    .map((cells) => ({
      title: cells[0],
      creator: cells[1],
      publisher: cells[2] || null,
      evidenceUrl: cells[3] || null,
      scope: cells[4] || null,
    }))
}

function normalize(value) {
  return (value ?? '').replace(/[\s·:;,()[\]{}"'`~!?.·「」『』<>]/g, '').toLowerCase()
}

// 모델은 "리처드 닉슨 지음, 김기실 옮김"처럼 역할어를 붙여 쓴다. 카카오 저자 필드에는 없으므로 걷어낸다.
function creatorNames(value) {
  return (value ?? '')
    .replace(/\((.*?)\)/g, ' ')
    .split(/[,;/]|\s외\s/)
    .map((part) => part.replace(/(지음|옮김|엮음|편저|편역|역주|주해|해설|글|그림|편|저|역)\s*$/g, '').trim())
    .map(normalize)
    .filter((part) => part.length >= 2)
}

function isbn13(raw) {
  const parts = (raw ?? '').split(/\s+/).filter(Boolean)
  return parts.find((part) => part.length === 13) ?? parts.find((part) => part.length === 10) ?? null
}

async function kakaoLookup(book) {
  const params = new URLSearchParams({ query: book.title, size: '20', target: 'title' })
  const response = await fetch(`${KAKAO_URL}?${params}`, {
    headers: { Authorization: `KakaoAK ${kakaoKey}` },
  })
  if (!response.ok) return { matched: null, reason: `kakao_http_${response.status}` }

  const payload = await response.json()
  const documents = payload.documents ?? []
  if (documents.length === 0) return { matched: null, reason: 'title_not_found' }

  const wantedCreators = creatorNames(book.creator)
  const wantedPublisher = normalize(book.publisher)
  const scored = documents.map((document) => {
    const authors = normalize([...(document.authors ?? []), ...(document.translators ?? [])].join(''))
    const creatorHit = wantedCreators.some((name) => (
      authors.includes(name) || (name.includes(authors) && authors.length >= 2)
    ))
    const publisherHit = wantedPublisher.length >= 2 && normalize(document.publisher).includes(wantedPublisher)
    return { document, creatorHit, publisherHit }
  })

  const hit = scored.find((row) => row.creatorHit && row.publisherHit)
    ?? scored.find((row) => row.creatorHit)
  if (!hit) return { matched: null, reason: 'creator_mismatch', seen: documents.slice(0, 3).map((d) => `${d.title} / ${d.authors.join(',')}`) }

  return {
    matched: {
      title: hit.document.title,
      authors: hit.document.authors,
      translators: hit.document.translators,
      publisher: hit.document.publisher,
      isbn: isbn13(hit.document.isbn),
      thumbnail: hit.document.thumbnail || null,
      datetime: hit.document.datetime || null,
      url: hit.document.url || null,
      // 판매 신호. 쿠팡을 열기 전에 절판·미판매 후보를 먼저 걸러내는 데 쓴다.
      status: hit.document.status ?? null,
      price: typeof hit.document.price === 'number' ? hit.document.price : null,
      salePrice: typeof hit.document.sale_price === 'number' ? hit.document.sale_price : null,
    },
    reason: hit.publisherHit ? 'creator_and_publisher' : 'creator_only',
  }
}

async function main() {
  const outPath = resolve(process.cwd(), argumentValue('out', '../../data/celeb/figure-books/appearance-muse-2026-09-04.jsonl'))
  const limit = Number(argumentValue('limit', '0')) || 0
  const concurrency = Number(argumentValue('concurrency', '6'))
  const backend = argumentValue('backend', 'opencode')
  const model = argumentValue('model', DEFAULT_MODEL)
  const scope = argumentValue('scope', 'active')
  // 표본 검수처럼 특정 인물만 돌릴 때 쓴다. 점수순 정렬이라 지정하지 않으면 뒤쪽 인물은 오래 걸린다.
  const onlySlugs = (argumentValue('slugs', '') || '').split(',').map((v) => v.trim()).filter(Boolean)
  const since = argumentValue('since', '2026-09-04T22:00:00')

  mkdirSync(dirname(outPath), { recursive: true })
  const done = new Set()
  if (existsSync(outPath)) {
    for (const line of readFileSync(outPath, 'utf8').split('\n')) {
      if (!line.trim()) continue
      try { done.add(JSON.parse(line).person.slug) } catch { /* 깨진 줄은 무시하고 다시 처리한다 */ }
    }
  }

  const all = await loadTargets(scope, since)
  const scoped = onlySlugs.length ? all.filter((person) => onlySlugs.includes(person.slug)) : all
  const pending = scoped.filter((person) => !done.has(person.slug))
  const targets = limit > 0 ? pending.slice(0, limit) : pending
  console.log(`대상 ${all.length}명 / 완료 ${done.size}명 / 이번 실행 ${targets.length}명 (scope=${scope}, 동시 ${concurrency}, ${backend} / ${backend === 'agy' ? '기본 gemini' : model})`)

  let processed = 0
  let withBooks = 0
  let verified = 0
  let skipped = 0
  let cursor = 0

  // 인물 하나를 끝낼 때마다 바로 기록한다. 긴 배치가 중간에 끊겨도 앞선 결과를 잃지 않는다.
  async function handle(person) {
    const result = await research(buildPrompt(person), { backend, model, timeoutMs: 480000 })
    const checked = []
    for (const book of parseBooks(result.text)) {
      const lookup = await kakaoLookup(book)
      checked.push({ ...book, kakao: lookup.matched, kakaoReason: lookup.reason, kakaoSeen: lookup.seen ?? null })
      if (lookup.matched) verified += 1
    }
    // 후보가 없는데 "없음" 선언도 아니면 검색이 429로 막힌 회차다. 기록하지 않고 다음 실행에 넘긴다.
    // 모델이 본문 앞에 진행 보고를 흘리면 첫 글자 검사로는 "없음"을 놓치고 조사 실패로 샌다.
    // 어느 줄이든 단독으로 "없음"이면 조사를 마치고 후보가 없다고 판정한 것이다.
    const declaredNone = result.text.split('\n').some((line) => /^없음[.!]?$/.test(line.trim()))
    if (checked.length === 0 && !declaredNone) {
      skipped += 1
      console.log(`↻ ${person.nickname} — 조사 실패, 다음 실행으로 미룬다`)
      return
    }

    processed += 1
    if (checked.length > 0) withBooks += 1
    appendFileSync(outPath, `${JSON.stringify({
      person: { id: person.id, slug: person.slug, nickname: person.nickname, profession: person.profession, score: person.score },
      raw: result.text,
      attempts: result.attempts,
      books: checked,
    })}\n`, 'utf8')
    const flag = checked.some((book) => book.kakao) ? '✔' : (checked.length > 0 ? '△' : '·')
    console.log(`${flag} [${processed}/${targets.length}] ${person.nickname} — 후보 ${checked.length} / 검증 ${checked.filter((book) => book.kakao).length}`)
  }

  const worker = async () => {
    while (cursor < targets.length) {
      const person = targets[cursor]
      cursor += 1
      try {
        await handle(person)
      } catch (error) {
        console.log(`✖ ${person.nickname} — ${error instanceof Error ? error.message : error}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker))

  console.log(`\n처리 ${processed}명 / 후보 있음 ${withBooks}명 / 카카오 검증 통과 ${verified}건`)
  console.log(`WROTE ${outPath}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
