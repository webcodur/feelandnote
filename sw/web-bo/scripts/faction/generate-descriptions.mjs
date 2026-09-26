/**
 * 일반 팩션 개요(ko) agy 생성 러너.
 *
 *   AGY_BIN=/Users/ysj/.local/bin/agy \
 *   node sw/web-bo/scripts/faction/generate-descriptions.mjs [--slug=<slug>] [--limit=N] [--concurrency=N] [--dry]
 *
 * 입력: data/faction/desc/listing/<slug>.md + source/<slug>.json + spec.md + exemplars.md
 * 출력: data/faction/desc/out/<slug>.json  { slug, name, grade, description, chars, warnings }
 *
 * DB는 쓰지 않는다. 생성 결과는 검수 후 별도 apply 단계에서 반영한다.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { agyCall, looksQuotaLimited, AGY_TEXT_MODEL } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = resolve(HERE, '../../../..')
const DESC = resolve(REPO, 'data/faction/desc')
const OUT_DIR = resolve(DESC, 'out')

const GRADE_RANGE = { L: [350, 550], M: [250, 400], S: [150, 250] }
const BANNED = ['벼리', '포개', '빚어내', '아로새기', '숨결', '울림', '여정', '서사의 지평',
  '말해 준다', '시사하는 바', '만나 보세요', '함께하는', '—', '–']

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.match(/^--([^=]+)(?:=(.*))?$/)
  return m ? [m[1], m[2] ?? true] : [a, true]
}))

const listSlugs = () => readdirSync(resolve(DESC, 'listing'))
  .filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)).sort()

function readListing(slug) {
  const text = readFileSync(resolve(DESC, 'listing', `${slug}.md`), 'utf8')
  const grade = (text.match(/분량 등급:\s*([LMS])/) || [])[1] || 'M'
  return { text, grade }
}

function rosterBlock(src) {
  if (!src.roster?.length) return '(등록된 인물 없음 — 실명을 쓰지 말 것)'
  const lines = src.roster.map((r) => `- ${r.name} (${r.title || ''}) — ${r.group || '미배정'}`)
  return lines.join('\n')
}

function buildPrompt(slug) {
  const src = JSON.parse(readFileSync(resolve(DESC, 'source', `${slug}.json`), 'utf8'))
  const { text: listing, grade } = readListing(slug)
  const [lo, hi] = GRADE_RANGE[grade]
  const prompt = `당신은 한국어를 모국어로 하는 백과 편집자다. Feel&Note 세력도감의 팩션 개요글 한 편을 쓴다.

## 출력 형식
아래 JSON만 출력한다. 코드 펜스·설명·주석 없이 순수 JSON 한 덩어리.
{"description": "개요 본문"}

## 분량
한국어 ${lo}~${hi}자 (공백 포함). ${grade === 'S' ? '1문단' : '2~3문단'}. 지정 분량을 넘기거나 모자라지 않는다.

## 글의 구조
1. 첫 문장은 이 묶음이 무엇인지를 팩트로 연다 (정의 또는 범위).
2. 그 세계의 핵심 흐름 — 기원·전개·전환점을 구체 이름과 사건으로.
3. 이 묶음이 던지는 시사점 — 아래 리스팅의 [시사점] 불릿을 팩트에 엮어 자연스럽게 푼다. 이 해석이 글의 마무리축이다.
4. 구성 논리·경계는 시사점을 받치는 선에서만 필요하면 짧게.

## 규칙
- 실명은 아래 [로스터] 안에서만 고른다. 로스터 밖 인물을 띄우지 않는다.
- 리스팅에 없는 팩트를 지어내지 않는다. 시사점도 리스팅의 [시사점]에서만 취한다 — 새 해석을 지어내지 않는다.
- "모았다/구성했다" 같은 큐레이션 설명은 한 번만, 필요하면 마지막에.
- 리스팅의 [경계·주의]에 적힌 금지 사항을 지킨다. 다른 팩션 경계 언급은 리스팅에 있을 때만.
- 사실이 갈리는 대목은 갈린다고 적고 한쪽으로 단정하지 않는다.
- 원전·판본·분류 잡도리는 본문이 아니다. 출처·구분 나열 대신 서사와 시사점이 주가 된다.

## 문체
- 한국인이 쓴 자연스러운 한국어. 번역투 금지(사물 주어, "~에 의해", "~을 가진다").
- 평서문. 감탄·설교·홍보 금지.
- 금지어: ${BANNED.join(', ')} — 이 어휘를 쓰면 불합격이다.

## [팩션]
${src.name} (${src.name_en || ''}) — 테마: ${src.theme}
기존 개요(참고만): ${src.current_ko || '(없음)'}

## [진영]
${src.groups?.length ? src.groups.map((g) => `- ${g.name}: ${g.desc || ''}`).join('\n') : '(진영 구분 없음)'}

## [로스터]
${rosterBlock(src)}

## [리스팅]
${listing}
`
  return { prompt, src, grade }
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('JSON 없음')
  return JSON.parse(raw.slice(start, end + 1))
}

function validate(slug, grade, description, src) {
  const warnings = []
  const chars = description.length
  const [lo, hi] = GRADE_RANGE[grade]
  if (chars < lo || chars > hi) warnings.push(`length ${chars} not in ${lo}-${hi}`)
  for (const b of BANNED) if (description.includes(b)) warnings.push(`banned word: ${b}`)
  const rosterNames = new Set((src.roster || []).map((r) => r.name))
  const mentioned = [...rosterNames].filter((n) => description.includes(n))
  if (rosterNames.size && mentioned.length === 0) warnings.push('no roster name mentioned')
  return { chars, warnings, mentioned }
}

async function generateOne(slug) {
  const { prompt, src, grade } = buildPrompt(slug)
  const text = await agyCall(prompt, {
    model: AGY_TEXT_MODEL,
    timeoutMs: 300_000,
  })
  const json = extractJson(text)
  if (typeof json.description !== 'string' || !json.description.trim()) throw new Error('description 비어 있음')
  const description = json.description.trim()
  const { chars, warnings } = validate(slug, grade, description, src)
  return { slug, name: src.name, grade, description, chars, warnings }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  let slugs = args.slug ? [args.slug] : listSlugs()
  slugs = slugs.filter((s) => existsSync(resolve(DESC, 'source', `${s}.json`)))
  if (args.limit) slugs = slugs.slice(0, Number(args.limit))
  const concurrency = Math.max(1, Number(args.concurrency) || 2)

  if (args.dry) {
    const { prompt, grade } = buildPrompt(slugs[0])
    console.log(`[dry] ${slugs[0]} grade=${grade} prompt ${prompt.length}자`)
    console.log(prompt)
    return
  }

  console.log(`${slugs.length}개 생성 시작 (concurrency=${concurrency}, model=${AGY_TEXT_MODEL})`)
  let done = 0, failed = 0
  const queue = [...slugs]
  const worker = async () => {
    while (queue.length) {
      const slug = queue.shift()
      const outPath = resolve(OUT_DIR, `${slug}.json`)
      if (existsSync(outPath) && !args.force) { console.log(`[skip] ${slug} — 이미 생성됨`); continue }
      try {
        const result = await generateOne(slug)
        writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n')
        done++
        const warn = result.warnings.length ? ` ⚠ ${result.warnings.join('; ')}` : ''
        console.log(`[${done + failed}/${slugs.length}] ${slug} ${result.chars}자${warn}`)
      } catch (error) {
        failed++
        console.log(`[${done + failed}/${slugs.length}] ${slug} 실패: ${error.message.slice(0, 200)}`)
        if (looksQuotaLimited(error.message)) { queue.length = 0; console.log('쿼터 소진 — 배치 중지') }
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  console.log(`완료 ${done}, 실패 ${failed}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
