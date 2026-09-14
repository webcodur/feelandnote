/**
 * 현재 VIDEO 감상 관계에서 영화 inventory에 들어간 관계를 뺀 원문 차집합을 저장한다.
 *
 * DB는 읽기만 한다. rows에는 review 본문이 실제로 있는 관계만 넣고, 빈 review 관계는
 * counts.emptyReviewExcludedCount로만 센다. 같은 관계를 다시 내보내지 않도록 rid를
 * `luna-cinema-full-inventory.json`과 --completed로 지정한 완료 결과의 rid와 비교한다.
 *
 * 실행 위치와 명령:
 *   cd sw/web-bo
 *   node --env-file=.env --import tsx scripts/tistory-cinema/luna-cinema-review-remainder.mts
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ASSETS } from '../blog-assets.mjs'

const PAGE_SIZE = 1000
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '../../../..')
const dataDir = path.join(repoRoot, 'data', 'celeb')
const excludedInventoryFile = path.join(ASSETS, 'tistory-cinema', 'luna-cinema-full-inventory.json')
const outputFile = path.join(dataDir, 'video-review-audit-remainder.json')
const completedFiles: string[] = []
if (fs.existsSync(outputFile)) {
  const previous = JSON.parse(fs.readFileSync(outputFile, 'utf8')) as { basis?: { completedFiles?: unknown } }
  const savedFiles = previous.basis?.completedFiles
  if (savedFiles !== undefined && (!Array.isArray(savedFiles) || savedFiles.some((file) => typeof file !== 'string'))) {
    throw new Error('기존 차집합의 completedFiles 형식 오류')
  }
  for (const file of (savedFiles ?? []) as string[]) completedFiles.push(path.resolve(file))
}
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] !== '--completed' || !process.argv[i + 1]) throw new Error('지원 인자: --completed <완료 결과.json> (여러 번 지정 가능)')
  const file = path.resolve(process.argv[++i])
  if (!completedFiles.includes(file)) completedFiles.push(file)
}

type Content = {
  id: string
  type: string | null
  external_id: string | null
}

type Locale = {
  content_id: string
  locale: string
  title: string | null
}

type Celeb = {
  id: string
  slug: string | null
  nickname: string | null
}

type Relation = {
  id: string
  celeb_id: string
  content_id: string
  review: string | null
  review_en: string | null
  source_url: string | null
}

type ExcludedRow = {
  id?: unknown
  rid?: unknown
}

type RemainderRow = {
  rid: string
  celeb_id: string
  content_id: string
  nickname: string | null
  slug: string | null
  work: string | null
  type: string | null
  external_id: string | null
  review: string
  review_en: string | null
  source_url: string | null
}

type QueryClient = SupabaseClient

async function readRows<T>(db: QueryClient, table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await db.from(table).select(columns).range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    rows.push(...(data as T[]))
    if ((data as T[]).length < PAGE_SIZE) return rows
  }
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function hasReview(value: string | null): value is string {
  return (value ?? '').trim().length > 0
}

function duplicateCount(values: string[]): number {
  return values.length - new Set(values).size
}

const excludedMaterial = JSON.parse(fs.readFileSync(excludedInventoryFile, 'utf8')) as { rows?: ExcludedRow[]; counts?: { uniqueCount?: number } }
const excludedRows = Array.isArray(excludedMaterial.rows) ? excludedMaterial.rows : []
const excludedIds = excludedRows.map((row) => nullableString(row.rid) ?? nullableString(row.id))
if (excludedIds.some((id): id is null => id === null)) throw new Error('full inventory에 rid가 없는 row가 있다')
const excludedRelationIds = new Set(excludedIds as string[])
if (duplicateCount(excludedIds as string[]) !== 0) throw new Error('full inventory rid 중복이 있다')
if (excludedMaterial.counts?.uniqueCount !== undefined && excludedMaterial.counts.uniqueCount !== excludedRelationIds.size) {
  throw new Error(`full inventory uniqueCount 불일치: ${excludedMaterial.counts.uniqueCount} != ${excludedRelationIds.size}`)
}
for (const file of completedFiles) {
  const material = JSON.parse(fs.readFileSync(file, 'utf8')) as { rows?: ExcludedRow[] }
  if (!Array.isArray(material.rows) || material.rows.length === 0) throw new Error(`완료 결과에 rows가 없다: ${file}`)
  const ids = material.rows.map((row) => nullableString(row.rid) ?? nullableString(row.id))
  if (ids.some((id) => id === null) || duplicateCount(ids as string[]) !== 0) throw new Error(`완료 결과의 rid 누락 또는 중복: ${file}`)
  for (const id of ids as string[]) excludedRelationIds.add(id)
}

const db = createClient(process.env.NEXT_PUBLIC_DB_API_URL!, process.env.DB_SECRET_KEY!)
const [contents, locales, celebs, relations] = await Promise.all([
  readRows<Content>(db, 'contents', 'id, type, external_id'),
  readRows<Locale>(db, 'content_locales', 'content_id, locale, title'),
  readRows<Celeb>(db, 'celebs', 'id, slug, nickname'),
  readRows<Relation>(db, 'celeb_contents', 'id, celeb_id, content_id, review, review_en, source_url'),
])

const contentById = new Map(contents.map((row) => [row.id, row]))
const koTitleByContent = new Map(
  locales
    .filter((row) => row.locale === 'ko')
    .map((row) => [row.content_id, row.title]),
)
const celebById = new Map(celebs.map((row) => [row.id, row]))
const videoRelations = relations.filter((row) => contentById.get(row.content_id)?.type === 'VIDEO')
const videoRelationIds = videoRelations.map((row) => row.id)
const videoRelationDuplicateCount = duplicateCount(videoRelationIds)
if (videoRelationDuplicateCount !== 0) throw new Error(`현재 VIDEO 관계 ID 중복: ${videoRelationDuplicateCount}`)

const isMovie = (relation: Relation) => (contentById.get(relation.content_id)?.external_id ?? '').startsWith('tmdb-movie-')
const movieRelations = videoRelations.filter(isMovie)
const remainingRelations = videoRelations.filter((row) => !excludedRelationIds.has(row.id))
const currentBatchRelations = videoRelations.filter((row) => excludedRelationIds.has(row.id))
const remainingRows: RemainderRow[] = remainingRelations
  .filter((row) => hasReview(row.review))
  .map((row) => {
    const content = contentById.get(row.content_id)
    const celeb = celebById.get(row.celeb_id)
    return {
      rid: row.id,
      celeb_id: row.celeb_id,
      content_id: row.content_id,
      nickname: celeb?.nickname ?? null,
      slug: celeb?.slug ?? null,
      work: koTitleByContent.get(row.content_id) ?? null,
      type: content?.type ?? null,
      external_id: content?.external_id ?? null,
      review: row.review!,
      review_en: row.review_en,
      source_url: row.source_url,
    }
  })
  .sort((a, b) => a.rid.localeCompare(b.rid))

const remainingMovieRows = remainingRows.filter((row) => (row.external_id ?? '').startsWith('tmdb-movie-'))
const remainingOtherVideoRows = remainingRows.filter((row) => !(row.external_id ?? '').startsWith('tmdb-movie-'))
const emptyReviewExcludedCount = remainingRelations.filter((row) => !hasReview(row.review)).length
const remainderInventoryIntersection = remainingRows.filter((row) => excludedRelationIds.has(row.rid)).length
const videoOutsideCount = remainingRows.filter((row) => row.type !== 'VIDEO').length
const rowSum = remainingMovieRows.length + remainingOtherVideoRows.length
const movieRowsOutsideExcluded = movieRelations.filter((row) => !excludedRelationIds.has(row.id))
const excludedMovieRelations = movieRelations.filter((row) => excludedRelationIds.has(row.id))
const missingExcludedVideoRelationCount = excludedRelationIds.size - currentBatchRelations.length

const checks = {
  globalIdDuplicateCount: duplicateCount(remainingRows.map((row) => row.rid)),
  remainderInventoryIntersection,
  videoOutsideCount,
  rowSumMatches: rowSum === remainingRows.length,
  relationSumMatches: videoRelations.length === currentBatchRelations.length + remainingRelations.length,
  movieRelationSumMatches: movieRelations.length === excludedMovieRelations.length + movieRowsOutsideExcluded.length,
  missingExcludedVideoRelationCount,
}
if (checks.globalIdDuplicateCount !== 0) throw new Error('차집합 rows rid 중복')
if (checks.remainderInventoryIntersection !== 0) throw new Error('차집합과 제외 inventory의 교집합이 있다')
if (checks.videoOutsideCount !== 0) throw new Error('VIDEO 밖의 row가 있다')
if (!checks.rowSumMatches || !checks.relationSumMatches || !checks.movieRelationSumMatches) throw new Error('행수 합계 검증 실패')

const result = {
  generatedAt: new Date().toISOString(),
  basis: {
    excludedInventoryFile,
    completedFiles,
    excludedRelationCount: excludedRelationIds.size,
    relationTable: 'celeb_contents',
    videoPredicate: "contents.type === 'VIDEO'",
    moviePredicate: "contents.external_id startsWith 'tmdb-movie-'",
    nonemptyReview: "(review ?? '').trim().length > 0",
    emptyReviewRowsOmitted: true,
    sourceUrlRequired: false,
  },
  counts: {
    videoRelationCount: videoRelations.length,
    videoNonemptyReviewCount: videoRelations.filter((row) => hasReview(row.review)).length,
    movieRelationCount: movieRelations.length,
    movieNonemptyReviewCount: movieRelations.filter((row) => hasReview(row.review)).length,
    currentBatchRelationCount: currentBatchRelations.length,
    remainingMovieReviewCount: remainingMovieRows.length,
    remainingOtherVideoReviewCount: remainingOtherVideoRows.length,
    remainingReviewCount: remainingRows.length,
    emptyReviewExcludedCount,
  },
  rows: remainingRows,
}

function backupAndWrite(file: string, serialized: string): string | null {
  let backup: string | null = null
  if (fs.existsSync(file)) {
    const backupDir = path.join(dataDir, '_backup')
    fs.mkdirSync(backupDir, { recursive: true })
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    backup = path.join(backupDir, `video-review-audit-remainder-${stamp}.json`)
    fs.copyFileSync(file, backup)
  }
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, serialized, 'utf8')
  return backup
}

const backup = backupAndWrite(outputFile, `${JSON.stringify(result, null, 2)}\n`)
console.log(JSON.stringify({
  output: outputFile,
  backup,
  articleInventoryRows: excludedRelationIds.size,
  videoRelationCount: result.counts.videoRelationCount,
  videoNonemptyReviewCount: result.counts.videoNonemptyReviewCount,
  movieRelationCount: result.counts.movieRelationCount,
  movieNonemptyReviewCount: result.counts.movieNonemptyReviewCount,
  currentBatchRelationCount: result.counts.currentBatchRelationCount,
  remainingMovieReviewCount: result.counts.remainingMovieReviewCount,
  remainingOtherVideoReviewCount: result.counts.remainingOtherVideoReviewCount,
  remainingReviewCount: result.counts.remainingReviewCount,
  emptyReviewExcludedCount: result.counts.emptyReviewExcludedCount,
  checks,
}, null, 2))
