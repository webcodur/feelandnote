/**
 * 서재 탐방 1차 통합 — 본 서비스 콘텐츠 메타와 로컬 렌더 자산의 연결·표지 캐시.
 *
 * 원천:
 *   - 책/판본 식별·외부 표지 URL: PostgreSQL DB의 celeb_contents → contents → content_locales
 *   - 영상 원고·음성·이미지: sw/remotion/public/episodes
 *   - 렌더용 표지: DB 표지에서 재생성하는 로컬 캐시(public/covers/content)
 *
 * 이 모듈은 제목·저자·원고를 자동으로 덮어쓰지 않는다. 영상 형식의 표기는 서비스 판본
 * 표기와 다를 수 있기 때문이다. DB와 잇는 불변 ID, 표지 원본 스냅샷, 렌더 캐시만 다룬다.
 */

import path from 'path'
import {
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'fs/promises'
import sharp from 'sharp'
import { REMOTION_ROOT } from '@feelandnote/shared/bo/remotion-root'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchExternalImageFollowingRedirects,
  validateExternalImageUrl,
} from '@/lib/external-image'

export type BookResourceMatchKind =
  | 'linked'
  | 'exact'
  | 'candidate'
  | 'unresolved'
  | 'invalid-link'

export type BookCoverState =
  | 'synced'
  | 'stale'
  | 'legacy'
  | 'external'
  | 'missing'
  | 'missing-file'
  | 'source-missing'
  | 'unlinked'

export interface BookResourceCandidate {
  userContentId: string
  contentId: string
  title: string
  creator: string | null
  score: number
  koCover: string | null
  enCover: string | null
}

export interface BookCoverAudit {
  locale: 'ko' | 'en'
  fileExists: boolean
  current: string | null
  expected: string | null
  sourceUrl: string | null
  sourceSnapshot: string | null
  state: BookCoverState
}

export interface BookResourceRow {
  key: string
  episode: string
  status: string
  celebSlug: string | null
  celebNickname: string
  celebId: string | null
  bookFolder: string
  title: string
  creator: string
  currentContentId: string | null
  currentUserContentId: string | null
  matchKind: BookResourceMatchKind
  match: BookResourceCandidate | null
  candidates: BookResourceCandidate[]
  covers: BookCoverAudit[]
}

export interface BookResourceSummary {
  episodes: number
  books: number
  linked: number
  exact: number
  candidate: number
  unresolved: number
  invalidLink: number
  syncable: number
  syncedCovers: number
  staleCovers: number
  externalCovers: number
  legacyCovers: number
  missingCovers: number
}

export interface BookResourceAudit {
  generatedAt: string
  remotionRoot: string
  summary: BookResourceSummary
  rows: BookResourceRow[]
}

export interface SyncBookResourcesInput {
  /** 비우면 linked/exact 안전 항목 전부 */
  keys?: string[]
  /** 사람이 고른 celeb_contents.id. 서버가 해당 인물의 관계인지 다시 검증한다. */
  mappings?: Record<string, string>
}

export interface SyncBookResourceResult {
  key: string
  ok: boolean
  updatedFiles: string[]
  downloadedCovers: string[]
  warnings: string[]
  error?: string
}

export interface SyncBookResourcesResult {
  synced: number
  failed: number
  results: SyncBookResourceResult[]
}

interface LocalBookJson {
  title?: string
  creator?: string
  thumbnail_url?: string
  contentId?: string
  userContentId?: string
  thumbnailSourceUrl?: string
  thumbnailSourceLocale?: string
  [key: string]: unknown
}

interface LocalLocaleFile {
  locale: 'ko' | 'en'
  absPath: string
  data: LocalBookJson
}

interface LocalBook {
  key: string
  episode: string
  episodeDir: string
  status: string
  celebSlugHint: string
  celebNickname: string
  bookFolder: string
  title: string
  creator: string
  locales: LocalLocaleFile[]
}

interface DbEdition {
  locale: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
}

interface DbCelebContent {
  id: string
  celeb_id: string
  content_id: string
  editions: DbEdition[]
}

interface DbCeleb {
  id: string
  slug: string | null
  nickname: string | null
}

const EPISODES_DIR = path.join(REMOTION_ROOT, 'public', 'episodes')
const PUBLIC_DIR = path.join(REMOTION_ROOT, 'public')
const SKIP_DIRS = new Set(['excluded', 'not-using'])
const IMAGE_MAX_BYTES = 20 * 1024 * 1024

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

function safeSegment(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9._-]/g, '_')
  if (!safe || safe === '.' || safe === '..') throw new Error('안전하지 않은 ID입니다')
  return safe
}

function localAssetPath(contentId: string, locale: 'ko' | 'en'): string {
  return `covers/content/${safeSegment(contentId)}/${locale}.webp`
}

function isWithin(base: string, target: string): boolean {
  const rel = path.relative(base, target)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

function publicAssetAbs(rel: string): string | null {
  if (!rel || /^https?:\/\//i.test(rel)) return null
  const abs = path.resolve(PUBLIC_DIR, ...rel.replace(/\\/g, '/').split('/'))
  return isWithin(PUBLIC_DIR, abs) ? abs : null
}

async function exists(abs: string | null): Promise<boolean> {
  if (!abs) return false
  try {
    return (await stat(abs)).isFile()
  } catch {
    return false
  }
}

async function readJson<T>(abs: string): Promise<T> {
  return JSON.parse(await readFile(abs, 'utf8')) as T
}

async function readStatus(episodeDir: string): Promise<string> {
  try {
    const raw = await readJson<{ status?: string }>(path.join(episodeDir, '_status.json'))
    return raw.status ?? 'todo'
  } catch {
    try {
      return (await readFile(path.join(episodeDir, '_status'), 'utf8')).trim() || 'todo'
    } catch {
      return 'todo'
    }
  }
}

async function discoverLocalBooks(): Promise<LocalBook[]> {
  const koFiles: string[] = []

  async function walk(dir: string, rel: string[]): Promise<void> {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name.startsWith('_') || SKIP_DIRS.has(entry.name)) continue
        await walk(path.join(dir, entry.name), [...rel, entry.name])
        continue
      }
      if (entry.isFile() && entry.name === 'book.ko.json') {
        koFiles.push(path.join(dir, entry.name))
      }
    }
  }

  await walk(EPISODES_DIR, [])

  const episodeMeta = new Map<string, { nickname: string; status: string }>()
  const books: LocalBook[] = []

  for (const koPath of koFiles) {
    const rel = path.relative(EPISODES_DIR, koPath).split(path.sep)
    const booksIndex = rel.indexOf('books')
    if (booksIndex <= 0 || booksIndex + 2 !== rel.length - 1) continue

    const episodeSegments = rel.slice(0, booksIndex)
    const episode = episodeSegments.join('/')
    const episodeDir = path.join(EPISODES_DIR, ...episodeSegments)
    const bookFolder = rel[booksIndex + 1]

    let meta = episodeMeta.get(episode)
    if (!meta) {
      let nickname = episodeSegments.at(-1)?.replace(/-\d+$/, '') ?? episode
      try {
        const metaKo = await readJson<{ host?: { nickname?: string } }>(path.join(episodeDir, 'meta.ko.json'))
        nickname = metaKo.host?.nickname?.trim() || nickname
      } catch {
        // meta가 없는 작업 전 폴더는 slug 힌트를 쓴다.
      }
      meta = { nickname, status: await readStatus(episodeDir) }
      episodeMeta.set(episode, meta)
    }

    const ko = await readJson<LocalBookJson>(koPath)
    const locales: LocalLocaleFile[] = [{ locale: 'ko', absPath: koPath, data: ko }]
    const enPath = path.join(path.dirname(koPath), 'book.en.json')
    if (await exists(enPath)) {
      locales.push({ locale: 'en', absPath: enPath, data: await readJson<LocalBookJson>(enPath) })
    }

    books.push({
      key: `${episode}/books/${bookFolder}`,
      episode,
      episodeDir,
      status: meta.status,
      celebSlugHint: episodeSegments.at(-1)?.replace(/-\d+$/, '') ?? '',
      celebNickname: meta.nickname,
      bookFolder,
      title: String(ko.title ?? ''),
      creator: String(ko.creator ?? ''),
      locales,
    })
  }

  return books.sort((a, b) => a.key.localeCompare(b.key, 'ko'))
}

function asObject<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

async function loadCelebs(books: LocalBook[]): Promise<DbCeleb[]> {
  const admin = createAdminClient()
  const slugHints = [...new Set(books.map(b => b.celebSlugHint).filter(Boolean))]
  const nicknames = [...new Set(books.map(b => b.celebNickname).filter(Boolean))]

  const [bySlug, byNickname] = await Promise.all([
    slugHints.length
      ? admin.from('celebs').select('id, slug, nickname').in('slug', slugHints)
      : Promise.resolve({ data: [], error: null }),
    nicknames.length
      ? admin.from('celebs').select('id, slug, nickname').in('nickname', nicknames)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (bySlug.error) throw bySlug.error
  if (byNickname.error) throw byNickname.error

  const map = new Map<string, DbCeleb>()
  for (const celeb of [...(bySlug.data ?? []), ...(byNickname.data ?? [])]) {
    map.set(celeb.id, celeb as DbCeleb)
  }
  return [...map.values()]
}

async function loadCelebContents(celebIds: string[]): Promise<DbCelebContent[]> {
  if (!celebIds.length) return []
  const admin = createAdminClient()
  const rows: Array<{
    id: string
    celeb_id: string
    content_id: string
    contents: unknown
  }> = []

  // PostgREST의 기본 응답 상한은 1,000행이다. 모든 에피소드의 관계를 한 번에
  // 요청하면 뒤쪽 인물의 정상 연결까지 누락되므로 ID 묶음별로 끝까지 순회한다.
  for (let batchStart = 0; batchStart < celebIds.length; batchStart += 25) {
    const batch = celebIds.slice(batchStart, batchStart + 25)
    for (let pageStart = 0; ; pageStart += 1000) {
      const { data, error } = await admin
        .from('celeb_contents')
        .select(`
          id,
          celeb_id,
          content_id,
          contents!inner(
            id,
            type,
            content_locales(locale, title, creator, thumbnail_url)
          )
        `)
        .in('celeb_id', batch)
        .in('contents.type', ['BOOK', 'VIDEO', 'GAME', 'MUSIC'])
        .range(pageStart, pageStart + 999)

      if (error) throw error
      rows.push(...((data ?? []) as typeof rows))
      if ((data?.length ?? 0) < 1000) break
    }
  }

  return rows.map(row => {
    const content = asObject(row.contents as unknown as {
      content_locales?: DbEdition[] | null
    } | Array<{ content_locales?: DbEdition[] | null }> | null)
    return {
      id: row.id,
      celeb_id: row.celeb_id,
      content_id: row.content_id,
      editions: content?.content_locales ?? [],
    }
  })
}

function candidateLabel(uc: DbCelebContent): { title: string; creator: string | null } {
  const ko = uc.editions.find(e => e.locale === 'ko')
  const en = uc.editions.find(e => e.locale === 'en')
  return {
    title: ko?.title || en?.title || '(제목 없음)',
    creator: ko?.creator || en?.creator || null,
  }
}

function scoreCandidate(book: LocalBook, uc: DbCelebContent): number {
  const title = normalizeText(book.title)
  const creator = normalizeText(book.creator)
  let best = 0

  for (const edition of uc.editions) {
    const candidateTitle = normalizeText(edition.title)
    const candidateCreator = normalizeText(edition.creator)
    let score = 0
    if (title && candidateTitle === title) score += 100
    else if (title && candidateTitle && (candidateTitle.includes(title) || title.includes(candidateTitle))) score += 45
    if (creator && candidateCreator === creator) score += 30
    else if (creator && candidateCreator && (candidateCreator.includes(creator) || creator.includes(candidateCreator))) score += 10
    if (edition.locale === 'ko') score += 2
    best = Math.max(best, score)
  }
  return best
}

function toCandidate(uc: DbCelebContent, score: number): BookResourceCandidate {
  const label = candidateLabel(uc)
  return {
    userContentId: uc.id,
    contentId: uc.content_id,
    title: label.title,
    creator: label.creator,
    score,
    koCover: uc.editions.find(e => e.locale === 'ko')?.thumbnail_url ?? null,
    enCover: uc.editions.find(e => e.locale === 'en')?.thumbnail_url ?? null,
  }
}

function findCelebForBook(
  book: LocalBook,
  celebs: DbCeleb[],
): DbCeleb | null {
  const slugMatch = celebs.find(p => p.slug === book.celebSlugHint)
  if (slugMatch) return slugMatch

  const nicknameMatches = celebs.filter(p => p.nickname === book.celebNickname)
  return nicknameMatches.length === 1 ? nicknameMatches[0] : null
}

async function coverAudit(
  localeFile: LocalLocaleFile,
  match: BookResourceCandidate | null,
): Promise<BookCoverAudit> {
  if (!match) {
    return {
      locale: localeFile.locale,
      fileExists: false,
      current: String(localeFile.data.thumbnail_url ?? '') || null,
      expected: null,
      sourceUrl: null,
      sourceSnapshot: String(localeFile.data.thumbnailSourceUrl ?? '') || null,
      state: 'unlinked',
    }
  }

  const sourceUrl = localeFile.locale === 'ko' ? match.koCover : match.enCover
  const expected = localAssetPath(match.contentId, localeFile.locale)
  const current = String(localeFile.data.thumbnail_url ?? '') || null
  const sourceSnapshot = String(localeFile.data.thumbnailSourceUrl ?? '') || null
  const expectedExists = await exists(publicAssetAbs(expected))
  const currentExists = await exists(publicAssetAbs(current ?? ''))

  let state: BookCoverState
  if (!sourceUrl) state = 'source-missing'
  else if (current === expected && expectedExists && sourceSnapshot === sourceUrl) state = 'synced'
  else if (current === expected && expectedExists) state = 'stale'
  else if (current && /^https?:\/\//i.test(current)) state = 'external'
  else if (!current) state = 'missing'
  else if (currentExists) state = 'legacy'
  else state = 'missing-file'

  return {
    locale: localeFile.locale,
    fileExists: current === expected ? expectedExists : currentExists,
    current,
    expected,
    sourceUrl,
    sourceSnapshot,
    state,
  }
}

export async function auditBookRecommendResources(): Promise<BookResourceAudit> {
  const books = await discoverLocalBooks()
  const celebs = await loadCelebs(books)
  const celebContents = await loadCelebContents(celebs.map(p => p.id))
  const byCeleb = new Map<string, DbCelebContent[]>()
  for (const uc of celebContents) {
    const list = byCeleb.get(uc.celeb_id) ?? []
    list.push(uc)
    byCeleb.set(uc.celeb_id, list)
  }

  const rows: BookResourceRow[] = []

  for (const book of books) {
    const profile = findCelebForBook(book, celebs)
    const dbBooks = profile ? (byCeleb.get(profile.id) ?? []) : []
    const ko = book.locales.find(f => f.locale === 'ko')!
    const currentContentId = String(ko.data.contentId ?? '') || null
    const currentUserContentId = String(ko.data.userContentId ?? '') || null

    let matchKind: BookResourceMatchKind = 'unresolved'
    let matched: DbCelebContent | null = null

    if (currentUserContentId || currentContentId) {
      matched = dbBooks.find(uc =>
        (!currentUserContentId || uc.id === currentUserContentId)
        && (!currentContentId || uc.content_id === currentContentId)
      ) ?? null
      matchKind = matched ? 'linked' : 'invalid-link'
    } else {
      const exactTitle = dbBooks.filter(uc =>
        uc.editions.some(e => normalizeText(e.title) === normalizeText(book.title))
      )
      if (exactTitle.length === 1) {
        matched = exactTitle[0]
        matchKind = 'exact'
      } else if (exactTitle.length > 1) {
        const exactCreator = exactTitle.filter(uc =>
          uc.editions.some(e => normalizeText(e.creator) === normalizeText(book.creator))
        )
        if (exactCreator.length === 1) {
          matched = exactCreator[0]
          matchKind = 'exact'
        } else {
          matchKind = 'candidate'
        }
      } else if (dbBooks.length) {
        matchKind = 'candidate'
      }
    }

    const ranked = dbBooks
      .map(uc => ({ uc, score: scoreCandidate(book, uc) }))
      // KO locale 보너스(2점)만 받은 무관한 콘텐츠는 후보가 아니다.
      .filter(x => x.score > 2)
      .sort((a, b) => b.score - a.score)

    // 판본명 뒤의 "1"·"세트"·"Paperback" 같은 수식 때문에 완전 일치가 아니어도,
    // 제목 포함 + 저자 완전 일치(70점 이상)이고 차점과 20점 이상 벌어지면 같은 책으로
    // 안전하게 본다. 저자만 같은 다른 책(32점)이나 번역 제목만 있는 책은 자동 연결하지 않는다.
    if (
      matchKind === 'candidate'
      && ranked[0]?.score >= 70
      && ranked[0].score - (ranked[1]?.score ?? 0) >= 20
    ) {
      matched = ranked[0].uc
      matchKind = 'exact'
    }

    const candidates = ranked.slice(0, 8).map(x => toCandidate(x.uc, x.score))
    const match = matched ? toCandidate(matched, scoreCandidate(book, matched)) : null

    if (matchKind === 'candidate' && candidates.length === 0) {
      matchKind = 'unresolved'
    }

    rows.push({
      key: book.key,
      episode: book.episode,
      status: book.status,
      celebSlug: profile?.slug ?? null,
      celebNickname: book.celebNickname,
      celebId: profile?.id ?? null,
      bookFolder: book.bookFolder,
      title: book.title,
      creator: book.creator,
      currentContentId,
      currentUserContentId,
      matchKind,
      match,
      candidates,
      covers: await Promise.all(book.locales.map(file => coverAudit(file, match))),
    })
  }

  const covers = rows.flatMap(row => row.covers)
  const summary: BookResourceSummary = {
    episodes: new Set(rows.map(row => row.episode)).size,
    books: rows.length,
    linked: rows.filter(row => row.matchKind === 'linked').length,
    exact: rows.filter(row => row.matchKind === 'exact').length,
    candidate: rows.filter(row => row.matchKind === 'candidate').length,
    unresolved: rows.filter(row => row.matchKind === 'unresolved').length,
    invalidLink: rows.filter(row => row.matchKind === 'invalid-link').length,
    syncable: rows.filter(row => row.matchKind === 'linked' || row.matchKind === 'exact').length,
    syncedCovers: covers.filter(cover => cover.state === 'synced').length,
    staleCovers: covers.filter(cover => cover.state === 'stale').length,
    externalCovers: covers.filter(cover => cover.state === 'external').length,
    legacyCovers: covers.filter(cover => cover.state === 'legacy').length,
    missingCovers: covers.filter(cover =>
      cover.state === 'missing'
      || cover.state === 'missing-file'
      || cover.state === 'source-missing'
    ).length,
  }

  return {
    generatedAt: new Date().toISOString(),
    remotionRoot: REMOTION_ROOT,
    summary,
    rows,
  }
}

async function atomicWrite(abs: string, data: Buffer | string): Promise<void> {
  await mkdir(path.dirname(abs), { recursive: true })
  const temp = `${abs}.tmp-${process.pid}-${Date.now()}`
  await writeFile(temp, data)
  try {
    await rename(temp, abs)
  } catch {
    await rm(abs, { force: true })
    await rename(temp, abs)
  }
}

async function downloadCover(source: string, target: string): Promise<void> {
  const checked = validateExternalImageUrl(source)
  if ('error' in checked) throw new Error(checked.error)

  const response = await fetchExternalImageFollowingRedirects(checked.url)
  if (!response.ok) throw new Error(`표지 원본 응답 ${response.status}`)
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`이미지 응답이 아니다: ${contentType || 'content-type 없음'}`)
  }

  const declaredLength = Number(response.headers.get('content-length') ?? 0)
  if (declaredLength > IMAGE_MAX_BYTES) throw new Error('표지 파일이 20MB를 넘는다')

  const original = Buffer.from(await response.arrayBuffer())
  if (original.length > IMAGE_MAX_BYTES) throw new Error('표지 파일이 20MB를 넘는다')

  const webp = await sharp(original)
    .rotate()
    .resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer()

  await atomicWrite(target, webp)
}

async function syncOne(
  book: LocalBook,
  selected: BookResourceCandidate,
): Promise<SyncBookResourceResult> {
  const result: SyncBookResourceResult = {
    key: book.key,
    ok: true,
    updatedFiles: [],
    downloadedCovers: [],
    warnings: [],
  }

  for (const localeFile of book.locales) {
    const sourceUrl = localeFile.locale === 'ko' ? selected.koCover : selected.enCover
    let thumbnail = String(localeFile.data.thumbnail_url ?? '')

    if (sourceUrl) {
      const rel = localAssetPath(selected.contentId, localeFile.locale)
      const abs = publicAssetAbs(rel)
      if (!abs) throw new Error('표지 캐시 경로가 렌더 public 밖을 가리킨다')

      const snapshot = String(localeFile.data.thumbnailSourceUrl ?? '')
      if (!(await exists(abs)) || snapshot !== sourceUrl) {
        await downloadCover(sourceUrl, abs)
        result.downloadedCovers.push(rel)
      }
      thumbnail = rel
    } else {
      result.warnings.push(`${localeFile.locale.toUpperCase()} DB 표지가 없어 기존 표지를 유지했습니다`)
    }

    const next: LocalBookJson = {
      ...localeFile.data,
      contentId: selected.contentId,
      userContentId: selected.userContentId,
      thumbnail_url: thumbnail,
      ...(sourceUrl
        ? {
            thumbnailSourceUrl: sourceUrl,
            thumbnailSourceLocale: localeFile.locale,
          }
        : {}),
    }
    await atomicWrite(localeFile.absPath, `${JSON.stringify(next, null, 2)}\n`)
    result.updatedFiles.push(path.relative(REMOTION_ROOT, localeFile.absPath).replace(/\\/g, '/'))
  }

  return result
}

export async function syncBookRecommendResources(
  input: SyncBookResourcesInput = {},
): Promise<SyncBookResourcesResult> {
  const [audit, localBooks] = await Promise.all([
    auditBookRecommendResources(),
    discoverLocalBooks(),
  ])
  const localByKey = new Map(localBooks.map(book => [book.key, book]))
  const selectedKeys = input.keys?.length ? new Set(input.keys) : null
  const seenKeys = new Set<string>()
  const results: SyncBookResourceResult[] = []

  for (const row of audit.rows) {
    if (selectedKeys && !selectedKeys.has(row.key)) continue
    seenKeys.add(row.key)

    const manualId = input.mappings?.[row.key]
    const selected = manualId
      ? row.candidates.find(candidate => candidate.userContentId === manualId) ?? null
      : row.match

    if (!selected) {
      if (selectedKeys) {
        results.push({
          key: row.key,
          ok: false,
          updatedFiles: [],
          downloadedCovers: [],
          warnings: [],
          error: '안전하게 연결할 DB 콘텐츠가 없습니다',
        })
      }
      continue
    }
    if (!manualId && row.matchKind !== 'linked' && row.matchKind !== 'exact') continue

    const local = localByKey.get(row.key)
    if (!local) {
      results.push({
        key: row.key,
        ok: false,
        updatedFiles: [],
        downloadedCovers: [],
        warnings: [],
        error: '로컬 책 파일을 다시 찾지 못했습니다',
      })
      continue
    }

    try {
      results.push(await syncOne(local, selected))
    } catch (error) {
      results.push({
        key: row.key,
        ok: false,
        updatedFiles: [],
        downloadedCovers: [],
        warnings: [],
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (selectedKeys) {
    for (const key of selectedKeys) {
      if (seenKeys.has(key)) continue
      results.push({
        key,
        ok: false,
        updatedFiles: [],
        downloadedCovers: [],
        warnings: [],
        error: '콘텐츠 키를 찾지 못했습니다',
      })
    }
  }

  return {
    synced: results.filter(result => result.ok).length,
    failed: results.filter(result => !result.ok).length,
    results,
  }
}
