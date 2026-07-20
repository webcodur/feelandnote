#!/usr/bin/env node
/**
 * 에피소드 JSON에서 검토용 Markdown 원고를 추출한다.
 *
 * 기본: 롱폼 + 쇼츠
 * --solo: SOLO 전체
 * --solo=N: SOLO N번째 책만
 *
 * Markdown은 편집용 원고다. 제작 SSoT는 JSON이며 SOLO 원고 반영은
 * sync-solo-story.mjs가 section marker 안의 본문만 안전하게 되돌린다.
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function findEpisodeDir(person) {
  const episodesRoot = join(ROOT, 'public', 'episodes')
  const ignored = new Set(['excluded', 'pre-todo', 'todo-easy', 'todo-normal', 'todo-hard'])

  function walk(dir, depth = 0) {
    let entries
    try { entries = readdirSync(dir, { withFileTypes: true }) } catch { return null }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue
      if (depth === 0 && ignored.has(entry.name)) continue
      const sub = join(dir, entry.name)
      if (entry.name === person && existsSync(join(sub, '_status.json'))) return sub
      const found = walk(sub, depth + 1)
      if (found) return found
    }
    return null
  }

  const found = walk(episodesRoot)
  if (!found) throw new Error(`Episode not found: ${person}`)
  return found
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function bookFolders(dir) {
  const root = join(dir, 'books')
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && /^\d+-/.test(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, 'ko', { numeric: true }))
}

function loadEpisode(dir, locale) {
  const legacy = join(dir, `${locale}.json`)
  if (existsSync(legacy)) return { data: readJson(legacy), folders: [] }

  const metaFile = join(dir, `meta.${locale}.json`)
  if (!existsSync(metaFile)) throw new Error(`Missing episode data: ${metaFile}`)
  const folders = bookFolders(dir)
  const books = folders.map(folder => {
    const file = join(dir, 'books', folder, `book.${locale}.json`)
    if (!existsSync(file)) throw new Error(`Missing book data: ${file}`)
    return readJson(file)
  })
  return { data: { ...readJson(metaFile), books }, folders }
}

function parseArgs(argv) {
  if (!argv[0]) throw new Error('Usage: extract-story.mjs <person> [--no-shorts] [--solo|--solo=N]')
  const raw = argv[0]
  const locale = raw.endsWith('-en') ? 'en' : 'ko'
  const person = raw.endsWith('-en') || raw.endsWith('-ko') ? raw.slice(0, -3) : raw
  const soloArg = argv.find(arg => arg === '--solo' || arg.startsWith('--solo='))
  const solo = soloArg ? (soloArg.includes('=') ? Number(soloArg.split('=')[1]) : 'all') : null
  if (typeof solo === 'number' && (!Number.isInteger(solo) || solo < 1)) {
    throw new Error('--solo=N의 N은 1 이상의 정수여야 한다.')
  }
  return { person, locale, solo, includeShorts: !argv.includes('--no-shorts') }
}

function displayKind(section) {
  if (section.kind === 'quote') return '인용'
  if (section.kind === 'actor') return '인물 대사'
  return '해설'
}

function extractSolo({ dir, person, locale, solo, episode, folders }) {
  if (folders.length === 0) throw new Error('SOLO 추출은 books/ 신구조 에피소드에서만 지원한다.')
  const selected = typeof solo === 'number' ? [solo - 1] : folders.map((_, index) => index)
  const lines = [
    `<!-- SOLO_STORY person="${person}" locale="${locale}" -->`,
    `# ${episode.host?.nickname || person} — SOLO 편집 원고`,
    '',
    '> 이 파일에서는 SOLO_SECTION 표식 사이의 본문만 고친다. 장면 번호·화자·출처·음성·이미지는 JSON에서 관리한다.',
    '',
  ]

  for (const index of selected) {
    const folder = folders[index]
    if (!folder) throw new Error(`Book ${index + 1} not found`)
    const soloFile = join(dir, 'books', folder, `solo.${locale}.json`)
    if (!existsSync(soloFile)) continue
    const doc = readJson(soloFile)
    const sections = Array.isArray(doc) ? doc : doc.sections
    if (!Array.isArray(sections)) throw new Error(`Invalid SOLO sections: ${soloFile}`)
    const book = episode.books[index]
    lines.push('---', '', `## B${String(index + 1).padStart(2, '0')}. ${book?.title || folder}`, `<!-- SOLO_BOOK folder="${folder}" -->`, '')

    for (const section of sections) {
      const details = [displayKind(section)]
      if (section.speaker) details.push(`화자: ${section.speaker}`)
      details.push(section.voice === 'actor' ? '배우 음성' : '기본 음성')
      lines.push(`### ${section.id} · ${details.join(' · ')}`)
      lines.push(`<!-- SOLO_SECTION folder="${folder}" id="${section.id}" -->`)
      lines.push(section.text || '')
      lines.push('<!-- /SOLO_SECTION -->')
      if (section.quoteSource) lines.push(`> 출처: ${section.quoteSource}`)
      lines.push('')
    }
  }
  return lines.join('\n') + '\n'
}

function extractLongform({ dir, locale, includeShorts, episode, folders, person }) {
  const lines = []
  const push = (...values) => lines.push(...(values.length ? values : ['']))
  push(`# ${episode.host?.nickname || person}`)
  if (episode.host?.title) push(`*${episode.host.title}*`)
  push('', '## 도입', '')
  if (episode.narrator?.serviceGreeting) push(`- 인사: ${episode.narrator.serviceGreeting}`)
  if (episode.narrator?.serviceIntro) push(`- 안내: ${episode.narrator.serviceIntro}`)
  if (episode.narrator?.celebIntro) push('', '**셀럽 소개**', '', episode.narrator.celebIntro)
  if (episode.host?.featuredQuote) push('', '**대표 명언**', '', `> ${episode.host.featuredQuote}`)
  if (episode.narrator?.bridge) push('', `- 브릿지: ${episode.narrator.bridge}`)
  push()
  if (episode.host?.philosophy) push('## 감상철학 (호스트 1인칭 독백)', '', episode.host.philosophy, '')

  ;(episode.books || []).forEach((book, index) => {
    push('---', '', `## 책 ${index + 1}. ${book.title}`)
    if (book.creator) push(`**저자**: ${book.creator}`)
    if (book.stats?.publishYear) push(`**출간**: ${book.stats.publishYear}`)
    if (book.source) push(`**source**: ${book.source}`)
    push()
    if (book.summary) push('### 책 소개 (summary)', '', book.summary, '')
    if (book.contextMain) push('### 감상 경위 (contextMain)', '', book.contextMain, '')
    ;(book.quotePairs || []).forEach((pair, pairIndex) => {
      push(`### 인용 ${pairIndex + 1}`)
      if (pair.quoteSource) push(`*출처: ${pair.quoteSource}*`)
      push()
      if (pair.quote) push(...pair.quote.split('\n').map(line => `> ${line}`), '')
      if (pair.after) push('#### 후속 (after)', '', pair.after, '')
    })
  })

  if (episode.narrator?.outro) push('---', '', '## 마무리 (outro)', '', episode.narrator.outro, '')
  if (includeShorts) {
    const modularShorts = folders.flatMap((folder, index) => {
      const file = join(dir, 'books', folder, `shorts.${locale}.json`)
      return existsSync(file) ? [{ file, label: folder, bookIndex: index }] : []
    })
    const legacyDir = join(dir, 'shorts')
    const legacyShorts = existsSync(legacyDir)
      ? readdirSync(legacyDir).filter(file => new RegExp(`^${locale}-\\d+\\.json$`).test(file)).sort().map(file => ({ file: join(legacyDir, file), label: file }))
      : []
    ;[...modularShorts, ...legacyShorts].forEach((item, index) => {
      const short = readJson(item.file)
      push('═══════════════════════════════════════════', '', `# 쇼츠 ${index + 1} (${item.label})`, '')
      ;(short.segments || []).forEach((segment, segmentIndex) => push(`## [${segmentIndex}] ${segment.id} (${segment.role || 'unknown'})`, '', segment.text || '*(텍스트 없음)*', ''))
    })
  }
  return lines.join('\n') + '\n'
}

try {
  const options = parseArgs(process.argv.slice(2))
  const dir = findEpisodeDir(options.person)
  const loaded = loadEpisode(dir, options.locale)
  const context = { ...options, dir, episode: loaded.data, folders: loaded.folders }
  process.stdout.write(options.solo ? extractSolo(context) : extractLongform(context))
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
