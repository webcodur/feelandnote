// 인물별 조사 후보의 카카오 판본·근거 본문·기존 작품을 확인한다. DB 쓰기와 모델 호출은 없다.
// node --env-file=sw/web-bo/.env --import tsx sw/web-bo/scripts/figure-books/coverage-prepare.mjs --input <인물.json 또는 폴더>
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, dirname, basename, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { dbClient, slug } from './lib/figure-work.mjs'
const require = createRequire(import.meta.url)
const { getKakaoBookByIsbn, toIsbn13, normalizeKakaoBookTitle } = require('@feelandnote/content-search/kakao-books')
const { fetchBookIntroduction } = require('@feelandnote/content-search/book-introduction')
const { selectAllPages } = require('@feelandnote/shared/lib/paginate')
const { normalizeIdentityText, parseFigureBookManifest, buildResolvedSourceBookRegistration } = require('./source-book-batch-contract.ts')

const OUTPUT_ROOT = resolve(import.meta.dirname, '../../../../data/celeb/figure-books/coverage-2026-09-14')
const EVIDENCE_MAX_BYTES = 1_000_000
const flat = (value) => normalizeIdentityText(String(value ?? ''))
const isbnOf = (value) => typeof value === 'string' ? toIsbn13(value) : null
const koreanIsbn = (isbn) => /^(97889|97911)/.test(isbn ?? '')
const titleKey = (title, creator) => flat(normalizeKakaoBookTitle(String(title ?? ''), String(creator ?? '')))
const sameBookTitle = (first, second) => flat(first) === flat(second)
  || flat(String(first).split(/[:\uff1a]/)[0]) === flat(second) || flat(first) === flat(String(second).split(/[:\uff1a]/)[0])

function candidateIdentity(candidate, isbn) {
  if (/^Q\d+$/i.test(candidate.workQid ?? '')) return `wikidata:${candidate.workQid.toLowerCase()}`
  if (candidate.originalTitle && candidate.originalCreator && slug(candidate.originalTitle) && slug(candidate.originalCreator)) return `${slug(candidate.originalCreator)}/${slug(candidate.originalTitle)}`
  return candidate.domesticOriginal === true && candidate.domesticOriginalConfirmed === true && /^https:\/\//.test(candidate.identityEvidenceUrl ?? '') ? `book/${isbn}` : null
}

function evidenceExcerpt(text, quote) {
  const needle = flat(quote)
  if (needle.length < 12) return ''
  let normalized = ''; const positions = []
  for (let index = 0; index < text.length; index++) {
    const token = flat(text[index]); normalized += token
    for (let offset = 0; offset < token.length; offset++) positions.push(index)
  }
  const index = normalized.indexOf(needle)
  if (index < 0) return ''
  return text.slice(Math.max(0, positions[index] - 180), Math.min(text.length, positions[index + needle.length - 1] + 360))
}

function privateAddress(address) {
  if (address.includes(':')) return /^(::|fc|fd|fe[89ab])/i.test(address)
  const [a, b] = address.split('.').map(Number)
  return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
}

async function publicUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || isIP(url.hostname)
    || !url.hostname.includes('.') || /\.(local|internal|localhost)$/i.test(url.hostname)) throw new Error('non_public_url')
  const addresses = await lookup(url.hostname, { all: true })
  if (!addresses.length || addresses.some(({ address }) => privateAddress(address))) throw new Error('non_public_url')
  return url
}

function pageText(html) {
  return html.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(?:!DOCTYPE\b[^>]*|\/?[a-z][^>]*)>/gi, ' ').replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code) => {
      const value = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)
      return value <= 0x10ffff ? String.fromCodePoint(value) : ' '
    }).replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g, (entity) => ({ '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' })[entity])
    .replace(/\s+/g, ' ').trim()
}

export async function fetchEvidence(value) {
  try {
    let url = await publicUrl(value)
    for (let redirect = 0; redirect <= 3; redirect++) {
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Feelandnote book evidence review' } })
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel()
        url = await publicUrl(new URL(response.headers.get('location'), url).href)
        continue
      }
      if (!response.ok || !/text\/(html|plain)/i.test(response.headers.get('content-type') ?? '')) {
        await response.body?.cancel()
        return { url: url.href, status: response.status, text: '', error: 'source_not_readable' }
      }
      const chunks = []; let size = 0
      for await (const chunk of response.body ?? []) {
        size += chunk.length
        if (size > EVIDENCE_MAX_BYTES) throw new Error('source_too_large')
        chunks.push(chunk)
      }
      return { url: url.href, status: response.status, text: pageText(Buffer.concat(chunks).toString('utf8')) }
    }
    return { url: value, text: '', error: 'too_many_redirects' }
  } catch { return { url: value, text: '', error: 'source_unconfirmed' } }
}

export function matchExistingBook(candidate, kakao, stock) {
  const isbn = isbnOf(candidate.isbn)
  if (!isbn) return []
  const titles = new Set([titleKey(kakao.title, kakao.creator), flat(candidate.originalTitle)].filter(Boolean))
  const creators = new Set([flat(kakao.creator), flat(candidate.originalCreator)].filter(Boolean))
  const matches = new Map()
  const add = (id, reason) => matches.set(id, [...(matches.get(id) ?? []), reason])
  const books = new Map(stock.contents.map((row) => [row.id, row]))
  for (const row of stock.contents) {
    if (isbnOf(row.external_id) === isbn || isbnOf(row.metadata?.isbn) === isbn) add(row.id, 'stored_isbn')
    if (candidate.workQid && row.metadata?.figureBook?.wikidataQid?.toLowerCase() === candidate.workQid.toLowerCase()) add(row.id, 'work_qid')
    if (candidateIdentity(candidate, isbn) && row.metadata?.figureBook?.workIdentity === candidateIdentity(candidate, isbn)) add(row.id, 'work_identity')
  }
  for (const row of [...stock.locales, ...stock.editions]) {
    if (!books.has(row.content_id)) continue
    if (isbnOf(row.isbn) === isbn) add(row.content_id, `${row.locale}.isbn`)
    if (titles.has(titleKey(row.title, row.creator)) && creators.has(flat(row.creator))) add(row.content_id, `${row.locale}.title_creator`)
  }
  return [...matches].map(([contentId, reasons]) => ({ contentId, reasons: [...new Set(reasons)] }))
}

export function prepareCandidate(person, candidate, kakao, source, stock, preferredContentId = null) {
  const isbn = isbnOf(candidate.isbn)
  const held = []
  if (!isbn || !koreanIsbn(isbn)) held.push('invalid_korean_isbn')
  if (!['appearance', 'related'].includes(candidate.relation_type)) held.push('invalid_relation')
  if (!kakao || isbnOf(kakao.metadata?.isbn) !== isbn) held.push('kakao_not_matched')
  const creatorAliases = new Set([candidate.creator, candidate.originalCreator].filter(Boolean).map(flat))
  if (kakao && (!sameBookTitle(normalizeKakaoBookTitle(candidate.title, candidate.creator), normalizeKakaoBookTitle(kakao.title, kakao.creator))
    || !creatorAliases.has(flat(kakao.creator)))) held.push('title_creator_mismatch')
  if (kakao && (!/[가-힣]/u.test(kakao.title) || /mooi\s*boek|문학일독|영어원서|영문판|원서읽기/i.test(`${kakao.metadata.publisher} ${kakao.title}`))) held.push('korean_language_needs_review')
  const quote = String(candidate.evidenceQuote ?? '').trim()
  const quoteMatched = flat(quote).length >= 12 && flat(source.text).includes(flat(quote))
  if (!source.text) held.push('evidence_unreadable')
  else if (!quoteMatched) held.push('evidence_quote_unconfirmed')
  if (kakao && kakao.metadata.salesStatus !== '정상판매') held.push('edition_sales_needs_store_check')
  const matches = kakao && isbn ? matchExistingBook(candidate, kakao, stock) : []
  const reviewedMatch = preferredContentId && matches.find((match) => match.contentId === preferredContentId)
  if (preferredContentId && !reviewedMatch) held.push('reuse_override_not_matched')
  if (matches.length > 1 && !reviewedMatch) held.push('ambiguous_existing_work')
  const contentId = reviewedMatch?.contentId ?? (matches.length === 1 ? matches[0].contentId : null)
  if (candidate.contentId && candidate.contentId !== contentId) held.push('claimed_content_id_mismatch')
  // 같은 ISBN이 잘못된 작품에 붙어 있는 경우도 제목·저자를 다시 대조한다.
  if (contentId && kakao && ![...stock.locales, ...stock.editions].some((row) => row.content_id === contentId
    && sameBookTitle(normalizeKakaoBookTitle(row.title, row.creator), normalizeKakaoBookTitle(kakao.title, kakao.creator))
    && (flat(row.creator) === flat(kakao.creator) || creatorAliases.has(flat(row.creator))))) held.push('existing_work_metadata_needs_review')
  const storedEdition = stock.editions.find((row) => row.content_id === contentId && row.locale === 'ko' && isbnOf(row.isbn) === isbn)
  const edition = candidate.editionKind && candidate.textScope ? { kind: candidate.editionKind, scope: candidate.textScope }
    : storedEdition?.edition_kind && storedEdition?.text_scope ? { kind: storedEdition.edition_kind, scope: storedEdition.text_scope } : null
  let manifest = null
  if (kakao && isbn && (matches.length <= 1 || reviewedMatch)) {
    const identity = stock.contents.find((row) => row.id === contentId)?.metadata?.figureBook?.workIdentity ?? candidateIdentity(candidate, isbn)
    if (!identity) held.push('work_identity_unconfirmed')
    else if (!edition) held.push('edition_scope_unconfirmed')
    else {
      try { manifest = parseFigureBookManifest({ work: { identity, title: kakao.title, creator: kakao.creator,
        titleAliases: candidate.originalTitle ? [candidate.originalTitle] : [], creatorAliases: candidate.originalCreator ? [candidate.originalCreator] : [] },
        edition, ...(contentId ? { reuseContentId: contentId } : {}), ko: { translationStatus: 'published', isbn } }) }
      catch { held.push('invalid_registration_manifest') }
      if (!contentId) held.push('new_work_identity_requires_review')
    }
  }
  const hasEdition = contentId && stock.editions.some((row) => row.content_id === contentId && row.locale === 'ko' && isbnOf(row.isbn) === isbn)
  if (contentId && !hasEdition && !edition) held.push('edition_scope_unconfirmed')
  return { person, research: candidate, isbn, kakao, checkedAt: new Date().toISOString(),
    evidence: { url: source.url, status: source.status ?? null, quote, quoteMatched, error: source.error ?? null, excerpt: evidenceExcerpt(source.text, quote) },
    matches, contentId, reuseOverride: preferredContentId, hasExactStoredEdition: Boolean(hasEdition), held: [...new Set(held)], manifest,
    edition: contentId && !hasEdition && edition ? { contentId, locale: 'ko', isbn, editionKind: edition.kind, textScope: edition.scope, sortOrder: 0 } : null,
    relation: contentId ? { contentId, relationType: candidate.relation_type, description: null, description_en: null,
      rationale: `${candidate.evidence ?? candidate.scope ?? ''} (${candidate.evidenceUrl ?? ''})` } : null }
}

export function toApplyCandidate(row) {
  const { person, research, kakao, manifest, isbn } = row
  if (!manifest || !kakao || !['appearance', 'related'].includes(research.relation_type)) return null
  if (row.held.some((reason) => reason !== 'new_work_identity_requires_review')) return null
  const identityEvidence = research.identityEvidenceUrl ? [research.identityEvidenceUrl] : []
  const originalWork = research.domesticOriginal === true && research.domesticOriginalConfirmed === true && identityEvidence.length
    ? { kind: 'domestic', evidenceUrls: identityEvidence }
    : research.originalTitle && research.originalCreator && identityEvidence.length
      ? { kind: 'translated', title: research.originalTitle, creator: research.originalCreator, evidenceUrls: identityEvidence } : null
  const explicitExistingEdition = row.reuseOverride === row.contentId && row.hasExactStoredEdition === true
  if (!originalWork || (originalWork.kind === 'translated' && manifest.work.identity.startsWith('book/') && !explicitExistingEdition)) return null
  const ko = { source: 'kakao_book', isbn, title: kakao.title, creator: kakao.creator,
    thumbnailUrl: kakao.coverImageUrl ?? '', publisher: kakao.metadata.publisher, description: row.introduction?.source ?? null,
    sourceUrl: kakao.metadata.link, descriptionSourceUrl: row.introduction?.sourceUrl ?? null, releaseDate: kakao.metadata.publishDate || null,
    sourceMetadata: { isbn, publisher: kakao.metadata.publisher, publishDate: kakao.metadata.publishDate,
      link: kakao.metadata.link, salesStatus: kakao.metadata.salesStatus } }
  try { buildResolvedSourceBookRegistration(manifest, { ko }) } catch { return null }
  return { candidateId: `${person.id}:${isbn}`, celebId: person.id, slug: person.slug,
    relationType: research.relation_type, evidenceUrls: [research.evidenceUrl], rationale: row.relation?.rationale ?? `${research.evidence ?? research.scope ?? ''} (${research.evidenceUrl})`,
    manifest, editions: { ko }, originalWork }
}

async function main() {
  const inputAt = process.argv.indexOf('--input')
  if (inputAt < 0 || !process.argv[inputAt + 1]) throw new Error('--input <person.json or folder> required')
  const inputs = process.argv.flatMap((value, index) => value === '--input' ? [resolve(process.argv[index + 1] ?? '')] : [])
  const reuse = new Map()
  for (let index = 2; index < process.argv.length; index++) {
    if (process.argv[index] !== '--reuse') continue
    const [isbn, contentId] = String(process.argv[++index] ?? '').split('=')
    if (!isbnOf(isbn) || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(contentId ?? '') || reuse.has(isbnOf(isbn))) throw new Error('Invalid or repeated --reuse ISBN=contentId')
    reuse.set(isbnOf(isbn), contentId)
  }
  const applyAt = process.argv.indexOf('--apply-input')
  const applyOutput = applyAt >= 0 ? resolve(process.argv[applyAt + 1] ?? '') : null
  const outputAt = process.argv.indexOf('--output')
  const output = outputAt >= 0 ? resolve(process.argv[outputAt + 1] ?? '') : resolve(OUTPUT_ROOT, 'verified.json')
  for (const destination of [output, applyOutput].filter(Boolean)) {
    const local = relative(OUTPUT_ROOT, destination)
    const parts = local.split(/[\\/]/)
    if ((!parts[0].startsWith('verified') && parts[0] !== 'lanes') || parts.includes('..') || !basename(destination).startsWith('verified') || !destination.endsWith('.json')) throw new Error('Output must be a verified JSON path in the coverage directory')
    mkdirSync(dirname(destination), { recursive: true })
  }
  const files = [...new Set(inputs.flatMap((input) => input.endsWith('.json') ? [input] : readdirSync(input).filter((name) => name.endsWith('.json')).sort().map((name) => resolve(input, name))))]
  if (!files.length) throw new Error('No research files')
  const db = dbClient()
  const [contents, locales, editions] = await Promise.all([
    selectAllPages((from, to) => db.from('contents').select('id,type,external_id,metadata').eq('type', 'BOOK').order('id').range(from, to)),
    selectAllPages((from, to) => db.from('content_locales').select('content_id,locale,title,creator,isbn').order('content_id').order('locale').range(from, to)),
    selectAllPages((from, to) => db.from('figure_book_editions').select('id,content_id,locale,title,creator,isbn,edition_kind,text_scope').order('id').range(from, to)),
  ])
  const stock = { contents, locales, editions }; const books = new Map(); const sources = new Map(); const introductions = new Map(); const rows = []
  for (const file of files) {
    const research = JSON.parse(readFileSync(file, 'utf8'))
    if (!research.person?.id || !research.person?.slug || !Array.isArray(research.books)) throw new Error(`Invalid research: ${basename(file)}`)
    if (research.researchSha256) {
      const original = readFileSync(resolve(dirname(file), '../results', `${research.person.id}.json`))
      if (createHash('sha256').update(original).digest('hex') !== research.researchSha256) throw new Error('Review refers to different research bytes')
    }
    for (const candidate of research.books) {
      const isbn = isbnOf(candidate.isbn)
      if (isbn && koreanIsbn(isbn) && !books.has(isbn)) {
        books.set(isbn, await getKakaoBookByIsbn(isbn))
        await new Promise((resolveWait) => setTimeout(resolveWait, 200))
      }
      if (!sources.has(candidate.evidenceUrl)) sources.set(candidate.evidenceUrl, await fetchEvidence(candidate.evidenceUrl))
      const row = prepareCandidate(research.person, candidate, books.get(isbn) ?? null, sources.get(candidate.evidenceUrl), stock, reuse.get(isbn) ?? null)
      if (applyOutput && !row.contentId && toApplyCandidate(row)) {
        if (!introductions.has(isbn)) introductions.set(isbn, await fetchBookIntroduction({ isbn, locale: 'ko' }))
        const introduction = introductions.get(isbn)
        row.introduction = { source: introduction?.source ?? null, sourceUrl: introduction?.sourceUrl ?? null }
      }
      rows.push(row)
    }
    writeFileSync(output, JSON.stringify({ rows }, null, 2) + '\n', 'utf8')
    if (applyOutput) writeFileSync(applyOutput, JSON.stringify({ version: 1, items: [...new Map(rows.map(toApplyCandidate).filter(Boolean).map((item) => [item.candidateId, item])).values()] }, null, 2) + '\n', 'utf8')
    console.log(JSON.stringify({ file: basename(file), people: new Set(rows.map((row) => row.person.id)).size, candidates: rows.length, metadataAndEvidenceMatched: rows.filter((row) => !row.held.length).length }))
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => { console.error('Coverage preparation failed; no DB changes were made.'); process.exitCode = 1 })
}
