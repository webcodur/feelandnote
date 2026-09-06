/**
 * 작품 후보 조사(작품 기준). 여러 인물이 나올 수 있는 작품을 골라 그 책에 등장하는 등록 인물을 찾는다.
 * 인물 축(appearance-muse-candidates.mjs)이 놓치는 연결을 줍는 보완 경로다.
 * DB는 읽기만 하며, 결과는 검수 입력일 뿐 자동 연결하지 않는다.
 *
 * node --env-file=.env scripts/figure-books/appearance-by-work.mjs --backend claude --limit 10
 *
 * 중단되면 같은 --out으로 다시 실행한다. 이미 기록된 작품은 건너뛴다.
 */

import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { museCall } from '../../../../.agents/skills/opencode-muse/scripts/muse-call.mjs'
import { agyCall, AGY_TEXT_MODEL } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const PAGE_SIZE = 1000
const DEFAULT_MODEL = 'opencode-go/glm-5.3-flash'
const CLAUDE_CLI = process.env.CLAUDE_BIN
  ?? 'C:/Program Files/nodejs/node_modules/@anthropic-ai/claude-code/bin/claude.exe'

// 한 권에 여러 인물이 실릴 만한 책만 연다. 개인 단독 전기는 인물 축에서 이미 끝났다.
const MULTI_PERSON_TITLE = /(열전|전집|영웅전|평전\s*(모음|집)|인물|위인|사기|사서|실록|왕조|황제|장군|명장|재상|철학자|과학자|예술가|작가|시인|화가|음악가|수학자|발명가|탐험가|혁명가|리더|거장|천재|세계사|역사|신화|전설|서사시|이야기|100인|인물전|군상|가문|형제|가족|세대|학파|사단|조직|제국|왕국|왕가)/

function argumentValue(name, fallback = null) {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1]
  const inline = process.argv.find((argument) => argument.startsWith(`--${name}=`))
  return inline ? inline.slice(name.length + 3) : fallback
}

const dbUrl = process.env.NEXT_PUBLIC_DB_API_URL
const dbKey = process.env.DB_SECRET_KEY
if (!dbUrl || !dbKey) throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
const db = createClient(dbUrl, dbKey, { auth: { autoRefreshToken: false, persistSession: false } })

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

function claudeCall(prompt, { model, timeoutMs }) {
  return new Promise((resolvePromise) => {
    const dir = mkdtempSync(join(tmpdir(), 'cl-'))
    const args = ['-p', prompt, '--model', model, '--allowedTools', 'WebSearch', 'WebFetch']
    const child = spawn(CLAUDE_CLI, args, { cwd: dir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs)
    child.stdout.on('data', (chunk) => { out += chunk })
    child.on('close', () => { clearTimeout(timer); resolvePromise(out.trim()) })
    child.on('error', () => { clearTimeout(timer); resolvePromise('') })
  })
}

async function research(prompt, { backend, model, timeoutMs }) {
  if (backend === 'agy') return String(await agyCall(prompt, { model: AGY_TEXT_MODEL, timeoutMs }) ?? '').trim()
  if (backend === 'claude') return claudeCall(prompt, { model: 'sonnet', timeoutMs })
  const result = await museCall(prompt, { model, timeoutMs, retries: 2, minChars: 2 })
  return result.text
}

function squash(value) {
  return String(value ?? '').replace(/[\s·:;,()[\]{}"'`~!?.「」『』<>-]/g, '').toLowerCase()
}

async function loadWorks() {
  const relations = await allRows('figure_book_characters', (from, to) => db
    .from('figure_book_characters')
    .select('content_id,celeb_id,relation_type')
    .eq('relation_type', 'appearance')
    .order('content_id')
    .range(from, to))

  const contentIds = [...new Set(relations.map((row) => row.content_id))]
  const locales = []
  for (let index = 0; index < contentIds.length; index += 200) {
    const { data, error } = await db
      .from('content_locales')
      .select('content_id,title,creator')
      .eq('locale', 'ko')
      .in('content_id', contentIds.slice(index, index + 200))
    if (error) throw new Error(`content_locales 조회 실패: ${error.message}`)
    locales.push(...(data ?? []))
  }

  const linkedByContent = new Map()
  for (const row of relations) {
    linkedByContent.set(row.content_id, [...(linkedByContent.get(row.content_id) ?? []), row.celeb_id])
  }

  return locales
    .map((row) => ({
      contentId: row.content_id,
      title: row.title ?? '',
      creator: row.creator ?? '',
      linked: linkedByContent.get(row.content_id) ?? [],
    }))
    // 이미 여러 인물이 붙은 책이거나, 제목이 여러 인물을 담는 형태인 책만 연다.
    .filter((row) => row.linked.length >= 2 || MULTI_PERSON_TITLE.test(row.title))
    .sort((left, right) => right.linked.length - left.linked.length)
}

async function loadCelebs() {
  return allRows('celebs', (from, to) => db
    .from('celebs')
    .select('id,slug,nickname,nickname_en,celeb_reality')
    .eq('publication_status', 'active')
    .order('id')
    .range(from, to))
}

function buildPrompt(work) {
  return `아래 책의 본문에 실제로 등장하거나 독립된 장·편으로 다뤄지는 실존 인물을 찾는다.

[책]
제목: ${work.title}
저자: ${work.creator}

[반드시 지킨다]
- 쓰기 전에 웹에서 이 책의 목차와 수록 인물을 확인한다. 검색은 두 번까지만 한다.
- 기억으로 인물을 채우지 않는다. 목차나 소개에서 확인된 인물만 쓴다.
- 지나가듯 이름만 언급되는 인물은 뺀다. 한 장 이상 다뤄지거나 주요 등장인물인 경우만 쓴다.
- 실존 인물과 신화·전설 속 인물을 모두 쓴다. 어느 쪽인지 가리지 않는다.
- 한국어에서 통용되는 표기를 쓴다. 이명이 있으면 가장 널리 쓰이는 쪽을 쓴다.

[출력 형식]
확인된 인물이 없으면 "없음" 한 단어만 쓴다.
있으면 최대 15명을 아래 형식의 한 줄씩으로만 쓴다. 머리말과 맺음말을 붙이지 않는다.
인물명 | 이 책에서 그 인물이 다뤄지는 범위 한 문장`
}

function parsePeople(text) {
  if (!text) return []
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('|'))
    .map((line) => line.replace(/^[-*\d.\s]+/, '').split('|').map((cell) => cell.trim()))
    .filter((cells) => cells.length >= 2 && cells[0] && cells[1])
    .filter((cells) => !(cells[0] === '인물명'))
    .map((cells) => ({ name: cells[0], scope: cells[1] }))
}

async function main() {
  const outPath = resolve(process.cwd(), argumentValue('out', '../../data/celeb/figure-books/appearance-by-work-2026-09-05.jsonl'))
  const limit = Number(argumentValue('limit', '0')) || 0
  const concurrency = Number(argumentValue('concurrency', '3'))
  const backend = argumentValue('backend', 'claude')
  const model = argumentValue('model', DEFAULT_MODEL)

  mkdirSync(dirname(outPath), { recursive: true })
  const done = new Set()
  if (existsSync(outPath)) {
    for (const line of readFileSync(outPath, 'utf8').split('\n')) {
      if (!line.trim()) continue
      try { done.add(JSON.parse(line).work.contentId) } catch { /* 깨진 줄은 다시 처리한다 */ }
    }
  }

  const celebs = await loadCelebs()
  // 이름과 영문 표기를 모두 색인한다. 동명이인이 있으면 후보에서 제외한다.
  const byName = new Map()
  for (const celeb of celebs) {
    for (const key of [squash(celeb.nickname), squash(celeb.nickname_en)]) {
      if (!key || key.length < 2) continue
      byName.set(key, byName.has(key) ? 'AMBIGUOUS' : celeb)
    }
  }

  const works = await loadWorks()
  const pending = works.filter((work) => !done.has(work.contentId))
  const targets = limit > 0 ? pending.slice(0, limit) : pending
  console.log(`작품 축 대상 ${works.length}권 / 완료 ${done.size}권 / 이번 실행 ${targets.length}권 (동시 ${concurrency}, ${backend})`)

  let cursor = 0
  let processed = 0
  let matchedTotal = 0
  let newTotal = 0

  async function handle(work) {
    const text = await research(buildPrompt(work), { backend, model, timeoutMs: 360000 })
    const people = parsePeople(text)
    const declaredNone = /^없음/.test(text.trim())
    if (people.length === 0 && !declaredNone) {
      console.log(`↻ ${work.title.slice(0, 34)} — 조사 실패, 다음 실행으로 미룬다`)
      return
    }

    const linked = new Set(work.linked)
    const matched = []
    for (const person of people) {
      const hit = byName.get(squash(person.name))
      if (!hit) continue
      if (hit === 'AMBIGUOUS') {
        matched.push({ ...person, celebId: null, slug: null, reason: 'ambiguous_name' })
        continue
      }
      matched.push({
        ...person,
        celebId: hit.id,
        slug: hit.slug,
        nickname: hit.nickname,
        reality: hit.celeb_reality,
        alreadyLinked: linked.has(hit.id),
      })
    }
    const fresh = matched.filter((row) => row.celebId && !row.alreadyLinked)
    matchedTotal += matched.filter((row) => row.celebId).length
    newTotal += fresh.length
    processed += 1

    appendFileSync(outPath, `${JSON.stringify({
      work: { contentId: work.contentId, title: work.title, creator: work.creator, linkedCount: work.linked.length },
      raw: text,
      people,
      matched,
    })}\n`, 'utf8')
    console.log(`${fresh.length > 0 ? '✔' : '·'} [${processed}/${targets.length}] ${work.title.slice(0, 34)} — 응답 ${people.length} / 등록인물 ${matched.filter((r) => r.celebId).length} / 신규 ${fresh.length}`)
  }

  const worker = async () => {
    while (cursor < targets.length) {
      const work = targets[cursor]
      cursor += 1
      try {
        await handle(work)
      } catch (error) {
        console.log(`✖ ${work.title.slice(0, 34)} — ${error instanceof Error ? error.message.slice(0, 90) : error}`)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, worker))

  console.log(`\n작품 ${processed}권 / 등록 인물 매칭 ${matchedTotal}건 / 새로 붙일 후보 ${newTotal}건`)
  console.log(`WROTE ${outPath}`)
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
