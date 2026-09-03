/**
 * Speech 파이프라인 2단계 — 자료 회수와 인용 추출.
 *
 * 본문을 받아 와 "그 사람이 실제로 한 말" 후보만 뽑아 보여 준다.
 * 원문 전체를 표준출력으로 흘리지 않는다. 판단은 사람이 한다.
 *
 *   pnpm celeb:speech:2-collect probe   "Steven Bartlett"
 *   pnpm celeb:speech:2-collect extract "https://..."
 *   pnpm celeb:speech:2-collect extract --file .tmp-celeb-fill/dump.html --url "https://..."
 *   pnpm celeb:speech:2-collect verify  "https://..." "본문에 있는지 확인할 문장"
 *
 * probe   위키백과 신원 + 위키인용 후보 + 구텐베르크 본인 저서 첫 문장들
 * extract 기사 본문에서 따옴표 직접 인용문을 뽑는다. 0건이면 1인칭 평문을 대신 보여 준다
 * verify  그 문장이 본문에 실제로 있는지 대조한다
 *
 * WAF로 막힌 호스트는 `--file` 로 우회한다. 별도 회수기로 페이지를 파일에 저장한 뒤
 * 그 파일을 넘기면 같은 추출기를 그대로 태울 수 있다. 자세한 절차는
 * docs/project/celeb/celeb-04-02-speech-pipeline.md의 「자료 회수」가 쥔다.
 */

import { readFile } from 'node:fs/promises'

// ─────────────────────────────────────────────────────────────────────────────
// 0. 회수 계층
// ─────────────────────────────────────────────────────────────────────────────

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8,ja;q=0.7',
}

type Fetched = { status: number; body: string }

async function get(url: string, timeoutMs = 45_000): Promise<Fetched> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { headers: HEADERS, redirect: 'follow', signal: controller.signal })
    return { status: response.status, body: await response.text() }
  } catch (error) {
    return { status: 0, body: `__ERR__${(error as Error).name}` }
  } finally {
    clearTimeout(timer)
  }
}

function stripHtml(document: string): string {
  const withoutBlocks = document.replace(
    /<(script|style|noscript|svg|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi,
    ' ',
  )
  const withoutTags = withoutBlocks.replace(/<[^>]+>/g, ' ')
  return unescapeHtml(withoutTags).replace(/\s+/g, ' ').trim()
}

function unescapeHtml(value: string): string {
  const named: Record<string, string> = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    ldquo: '\u201C', rdquo: '\u201D', lsquo: '\u2018', rsquo: '\u2019',
    mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  }
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, digits) => String.fromCodePoint(Number(digits)))
    .replace(/&([a-z]+);/gi, (whole, name) => named[String(name).toLowerCase()] ?? whole)
}

/** URL 또는 로컬 파일에서 본문 텍스트를 얻는다. */
async function bodyText(source: { url?: string; file?: string }): Promise<{ text: string; label: string }> {
  if (source.file) {
    const raw = await readFile(source.file, 'utf8')
    return { text: stripHtml(raw), label: `FILE ${source.file}` }
  }
  if (!source.url) throw new Error('URL 또는 --file 이 필요하다')
  const { status, body } = await get(source.url)
  if (status !== 200) {
    throw new Error(
      `HTTP ${status} — 막힌 호스트다. 별도 회수기로 페이지를 파일에 저장한 뒤 --file 로 다시 넘겨라.`,
    )
  }
  return { text: stripHtml(body), label: `HTTP 200` }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. probe — 신원·인용 후보 훑기
// ─────────────────────────────────────────────────────────────────────────────

/** 인용 후보에서 걸러 낼 신호들. 타인 발언·작품 대사·노래 가사를 배제한다. */
const ABOUT_SECTION = /\b(about|criticism|quotes on|tribute|legacy|misattributed|disputed|dialogue)\b/i
const SONG_SOURCE = /\b(song|lyric|album|single|soundtrack)\b/i
const PAGE_SOURCE = /\bpp?\.\s?\d+|\bchapter\b|\bch\.\s?\d+/i
const CHARACTER_SOURCE = /^[A-Z][a-z]+\s+["\u201C][A-Z]|\bsaid by\b|\bspoken by\b/i
const BARE_WORK = /^[A-Z][\w:'\u2019\-\s,&!?]{2,70}\(\d{4}\)\.?$/
const OTHER_SPEAKER = /^[A-Z][a-z]+(?: [A-Z][a-zA-Z.'-]+){1,3}\s*(?:,|\bin\b|\bat\b)/
const GOOD_SOURCE = /\b(interview|podcast|speech|radio|tv|show|talk|conference|address|testimony|press|magazine|times|post|guardian|wired|verge)\b/i
const YEAR = /\b(1[89]\d\d|20[0-2]\d)\b/

async function wikiSummary(title: string): Promise<string | null> {
  const path = encodeURIComponent(title.replace(/ /g, '_'))
  const { status, body } = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${path}`)
  if (status !== 200) return null
  try {
    return (JSON.parse(body) as { extract?: string }).extract ?? null
  } catch {
    return null
  }
}

type QuoteCandidate = { quote: string; source: string; score: number }

type WikiquoteItem = { section: string; quote: string; source: string }

/**
 * 위키인용 문서를 훑어 최상위 목록 항목만 모은다.
 * 한 항목 안의 중첩 목록(`ul`·`dl`)은 인용이 아니라 출처 줄이므로 따로 담는다.
 */
function collectWikiquoteItems(html: string): WikiquoteItem[] {
  const items: WikiquoteItem[] = []
  const flat = (parts: string[]) => unescapeHtml(parts.join('')).replace(/\s+/g, ' ').trim()

  let section = ''
  let head: string[] = []
  let quote: string[] = []
  let source: string[] = []
  let inHeading = false
  let listDepth = 0
  let nestedDepth = 0

  for (const token of html.matchAll(/<\/?([a-zA-Z0-9]+)[^>]*>|([^<]+)/g)) {
    if (token[2] !== undefined) {
      if (inHeading) head.push(token[2])
      else if (listDepth > 0) (nestedDepth > 0 ? source : quote).push(token[2])
      continue
    }
    const tag = token[1].toLowerCase()
    const closing = token[0].startsWith('</')

    if (tag === 'h2' || tag === 'h3') {
      if (closing) { inHeading = false; section = flat(head) } else { inHeading = true; head = [] }
    } else if (tag === 'li') {
      if (closing) {
        listDepth -= 1
        if (listDepth === 0) {
          const text = flat(quote)
          if (text) items.push({ section, quote: text, source: flat(source) })
        }
      } else {
        if (listDepth === 0) { quote = []; source = [] }
        listDepth += 1
      }
    } else if ((tag === 'ul' || tag === 'dl') && listDepth > 0) {
      if (closing) nestedDepth = Math.max(0, nestedDepth - 1)
      else nestedDepth += 1
    }
  }
  return items
}

function parseWikiquote(html: string, title: string): QuoteCandidate[] {
  const names = title.split(/[\s_]+/).filter((word) => word.length > 3)
  const candidates: QuoteCandidate[] = []

  for (const item of collectWikiquoteItems(html)) {
    const { section, source } = item
    const quote = item.quote.replace(/^["“”]+|["“”]+$/g, '').trim()

    if (quote.length < 20 || quote.length > 160 || quote.split(/\s+/).length < 4) continue
    if (ABOUT_SECTION.test(section) || !source) continue
    if (SONG_SOURCE.test(source) || PAGE_SOURCE.test(source)) continue
    if (CHARACTER_SOURCE.test(source) || BARE_WORK.test(source)) continue
    if (OTHER_SPEAKER.test(source)) continue
    if (names.some((name) => quote.toLowerCase().includes(name.toLowerCase()))) continue

    candidates.push({
      quote,
      source: source.slice(0, 130),
      score: (GOOD_SOURCE.test(source) ? 2 : 0) + (YEAR.test(source) ? 1 : 0),
    })
  }

  return candidates.sort((a, b) => b.score - a.score || a.quote.length - b.quote.length).slice(0, 5)
}

async function wikiquote(title: string): Promise<{ url: string; candidates: QuoteCandidate[] } | null> {
  const url = `https://en.wikiquote.org/api/rest_v1/page/html/${encodeURIComponent(title.replace(/ /g, '_'))}`
  const { status, body } = await get(url)
  if (status !== 200) return null
  return { url, candidates: parseWikiquote(body, title) }
}

/** 본인 저서가 퍼블릭 도메인이면 1인칭 문장을 직접 인용으로 쓸 수 있다. */
async function gutenberg(name: string): Promise<{ url: string; sentences: string[] } | null> {
  const search = await get(`https://gutendex.com/books?search=${encodeURIComponent(name)}`)
  if (search.status !== 200) return null
  let results: Array<{ id: number; authors?: Array<{ name: string }> }>
  try {
    results = (JSON.parse(search.body) as { results?: typeof results }).results ?? []
  } catch {
    return null
  }
  const surname = name.split(' ').at(-1)?.toLowerCase() ?? ''

  for (const book of results) {
    if (!book.authors?.some((author) => author.name.toLowerCase().includes(surname))) continue
    const url = `https://www.gutenberg.org/cache/epub/${book.id}/pg${book.id}.txt`
    const { status, body } = await get(url, 60_000)
    if (status !== 200) continue
    const head = body.split('*** START').at(-1)!.replace(/\s+/g, ' ').slice(0, 80_000)
    const seen = new Set<string>()
    const sentences: string[] = []
    for (const raw of head.split(/(?<=[.!?])\s+/)) {
      const sentence = raw.trim()
      if (sentence.length < 28 || sentence.length > 110) continue
      if (!/^(I |My )/.test(sentence) || seen.has(sentence)) continue
      seen.add(sentence)
      sentences.push(sentence)
      if (sentences.length >= 10) break
    }
    return { url, sentences }
  }
  return null
}

async function probe(name: string): Promise<void> {
  console.log(`== ${name}`)
  const summary = await wikiSummary(name)
  console.log(`  WIKI: ${summary ? summary.slice(0, 300) : '없음'}`)

  const quotes = await wikiquote(name)
  if (!quotes) console.log('  WQ  : 문서 없음')
  else {
    console.log(`  WQ  : ${quotes.candidates.length}건`)
    for (const candidate of quotes.candidates) {
      console.log(`    s${candidate.score} ${String(candidate.quote.length).padStart(3)} | ${candidate.quote.slice(0, 100)}`)
      console.log(`          <- ${candidate.source.slice(0, 70)}`)
    }
  }

  const books = await gutenberg(name)
  if (books) {
    console.log(`  GUT : ${books.url}`)
    for (const sentence of books.sentences.slice(0, 5)) {
      console.log(`    ${String(sentence.length).padStart(3)} | ${sentence.slice(0, 100)}`)
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. extract — 본문에서 직접 인용문 뽑기
// ─────────────────────────────────────────────────────────────────────────────

/** 1인칭 표지. 여기 없는 언어의 자료를 다루면 표지를 먼저 추가한다. */
const FIRST_PERSON = new RegExp([
  '\\b(I|I\'m|I\'ve|my|we|me)\\b',
  '(저는|제가|내가|나는|우리|저희)',
  '(僕は|僕が|私は|私が|自分は)',
  '(yo |mi |mis |nosotros|creo que|quiero)',
  '(eu |meu |minha |nós |acho que)',
  '(ich |wir |mein |meine |mich |mir)',
  '(je |nous |mon |ma |mes )',
].join('|'), 'i')

const FIRST_PERSON_HEAD = /^(I |I'|My |We )|^(저는|제가|내가|나는|우리)|^(僕|私|自分)/

const QUOTE_PAIRS = /["\u201C\u300C\u201E]([^"\u201C\u201D\u300C\u300D\u201E]{20,220})["\u201D\u300D\u201C]/g

function extractQuotes(text: string): string[] {
  const seen = new Set<string>()
  for (const match of text.matchAll(QUOTE_PAIRS)) {
    const quote = match[1].trim()
    if (seen.has(quote) || !FIRST_PERSON.test(quote)) continue
    seen.add(quote)
  }
  return [...seen].sort((a, b) => a.length - b.length)
}

/** 문답 형식 기사는 답변에 따옴표가 없다. 인용이 0건일 때만 쓴다. */
function extractLooseSentences(text: string): string[] {
  const seen = new Set<string>()
  for (const raw of text.split(/(?<=[.!?])\s+/)) {
    const sentence = raw.trim()
    if (sentence.length < 30 || sentence.length > 150) continue
    if (!FIRST_PERSON_HEAD.test(sentence) || seen.has(sentence)) continue
    seen.add(sentence)
  }
  return [...seen]
}

async function extract(source: { url?: string; file?: string }): Promise<void> {
  const { text, label } = await bodyText(source)
  const quotes = extractQuotes(text)
  console.log(`OK ${label} | chars=${text.length} | quoted=${quotes.length}`)
  for (const quote of quotes.slice(0, 12)) {
    console.log(`  ${String(quote.length).padStart(3)} | ${quote}`)
  }
  if (quotes.length > 0) return

  const loose = extractLooseSentences(text)
  console.log(`  LOOSE(1인칭 평문) ${loose.length}건 - 문답 형식일 때만 사용`)
  for (const sentence of loose.slice(0, 12)) {
    console.log(`  ${String(sentence.length).padStart(3)} | ${sentence}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. verify — 문장 실재 대조
// ─────────────────────────────────────────────────────────────────────────────

async function verify(source: { url?: string; file?: string }, sentence: string): Promise<void> {
  const { text, label } = await bodyText(source)
  const normalize = (value: string) => value.replace(/[\s\u2018\u2019\u201C\u201D'"]+/g, ' ').trim().toLowerCase()
  const found = normalize(text).includes(normalize(sentence))
  console.log(`${found ? 'MATCH' : 'NOT FOUND'} | ${label} | chars=${text.length}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 진입점
// ─────────────────────────────────────────────────────────────────────────────

function optionOf(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

async function main(): Promise<void> {
  const command = process.argv[2]
  const positional = process.argv.slice(3).filter((value, index, all) => {
    if (value.startsWith('--')) return false
    return !all[index - 1]?.startsWith('--')
  })
  const source = { url: optionOf('url') ?? positional[0], file: optionOf('file') }

  if (command === 'probe') {
    for (const name of positional) {
      await probe(name)
      await new Promise((resolve) => setTimeout(resolve, 1100))
    }
    return
  }
  if (command === 'extract') return extract(source)
  if (command === 'verify') {
    const sentence = source.file ? positional[0] : positional[1]
    if (!sentence) throw new Error('대조할 문장이 필요하다')
    return verify(source, sentence)
  }
  throw new Error('probe | extract | verify 중 하나가 필요하다')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
