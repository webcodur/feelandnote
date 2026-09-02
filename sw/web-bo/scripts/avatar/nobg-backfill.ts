/**
 * 등록된 셀럽 아바타의 누끼 누락을 전수 검사하고, 원본 백업 뒤 일괄 교정한다.
 *
 *   pnpm avatar:nobg-backfill scan
 *   pnpm avatar:nobg-backfill apply --report <scan.json>
 *   pnpm avatar:nobg-backfill apply --report <scan.json> --slugs slug-a,slug-b
 *   pnpm avatar:nobg-backfill restore --state <apply.json> --slugs slug-a,slug-b
 *
 * scan은 읽기 전용이다. apply는 완전 불투명으로 확정된 대상만 기본 처리하며,
 * --slugs를 주면 scan의 검토 후보도 명시적으로 처리할 수 있다.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { celebAvatarSmallUrl } from '@feelandnote/shared/constants/celeb-avatar-small'
import { boPath } from '../lib/paths'

type ScanReason = 'no_alpha' | 'fully_opaque' | 'opaque_edge'
type ApplyStatus = 'success' | 'skipped_already_cutout' | 'restored_error' | 'manual_restored'

interface CelebRow {
  id: string
  slug: string
  nickname: string | null
  avatar_url: string
}

interface AlphaMetrics {
  width: number
  height: number
  hasAlpha: boolean
  nonOpaqueRatio: number
  transparentRatio: number
  subjectRatio: number
  edgeOpaqueRatio: number
}

interface ScanCandidate extends CelebRow {
  reason: ScanReason
  metrics: AlphaMetrics
  sourceFile: string
  sha256: string
}

interface ScanFailure {
  id: string
  slug: string
  error: string
}

interface ScanReport {
  version: 1
  createdAt: string
  runDir: string
  total: number
  checked: number
  alreadyCutout: number
  definite: ScanCandidate[]
  review: ScanCandidate[]
  failures: ScanFailure[]
}

interface BackupMeta extends CelebRow {
  backedUpAt: string
  avatarFile: string
  smallUrl: string | null
  smallFile: string | null
}

interface ApplyResult {
  id: string
  slug: string
  nickname: string | null
  status: ApplyStatus
  oldUrl: string
  newUrl?: string
  error?: string
  metrics?: AlphaMetrics
}

interface ApplyState {
  version: 1
  createdAt: string
  updatedAt: string
  scanReport: string
  runDir: string
  results: Record<string, ApplyResult>
  cacheRevalidatedAt?: string
  verificationErrors?: string[]
}

const args = process.argv.slice(2)
const command = args[0] ?? 'scan'
const value = (name: string): string | undefined => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const flag = (name: string): boolean => args.includes(name)
const clamp = (valueToClamp: number, min: number, max: number) =>
  Math.max(min, Math.min(max, valueToClamp))

const SCAN_WORKERS = clamp(Number(value('--workers') ?? 16), 1, 32)
const SCAN_LIMIT = value('--limit') ? Math.max(1, Number(value('--limit'))) : null
// 20장 묶음은 실측에서 Python 작업 세트가 약 13GB까지 올라 후반 3장이 메모리·디코더 오류로
// 빠졌다. 같은 세 장을 작은 묶음으로 돌리자 전부 성공했으므로 전수 작업 기본값은 10장으로 둔다.
const APPLY_BATCH_SIZE = clamp(Number(value('--batch-size') ?? 10), 1, 20)
const SHEET_COLUMNS = 5
const SHEET_ROWS = 4
const COMPARISON_ROWS = 6

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').replace('Z', '')
}

function loadEnv(): void {
  const loaded: Record<string, string> = {}
  // .env.local이 .env보다 우선한다.
  for (const filename of ['.env.local', '.env']) {
    const file = boPath(filename)
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const matched = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!matched || loaded[matched[1]] !== undefined) continue
      loaded[matched[1]] = matched[2].replace(/^['"]|['"]$/g, '')
    }
  }
  for (const [key, envValue] of Object.entries(loaded)) {
    if (process.env[key] === undefined) process.env[key] = envValue
  }

  const required = [
    'NEXT_PUBLIC_DB_API_URL',
    'DB_SECRET_KEY',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ]
  const missing = required.filter((key) => !process.env[key])
  if (missing.length > 0) throw new Error(`필수 환경변수가 없습니다: ${missing.join(', ')}`)
}

function adminClient(): DatabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_DB_API_URL!,
    process.env.DB_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function fetchBuffer(url: string, optional = false): Promise<Buffer | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(30_000),
      })
      if (optional && response.status === 404) return null
      if (response.status === 429 || response.status >= 500) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
        continue
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      if (attempt === 4) throw error
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)))
    }
  }
  throw new Error('이미지 다운로드 재시도 소진')
}

async function analyzeAlpha(input: Buffer, sampleSize = 64): Promise<AlphaMetrics> {
  const metadata = await sharp(input).metadata()
  if (!metadata.width || !metadata.height) throw new Error('이미지 크기를 읽지 못했습니다.')
  if (!metadata.hasAlpha) {
    return {
      width: metadata.width,
      height: metadata.height,
      hasAlpha: false,
      nonOpaqueRatio: 0,
      transparentRatio: 0,
      subjectRatio: 1,
      edgeOpaqueRatio: 1,
    }
  }

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .resize(sampleSize, sampleSize, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const pixels = info.width * info.height
  let nonOpaque = 0
  let transparent = 0
  let subject = 0
  let edge = 0
  let edgeOpaque = 0
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3]
      if (alpha < 250) nonOpaque++
      if (alpha < 32) transparent++
      if (alpha >= 32) subject++
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) {
        edge++
        if (alpha > 200) edgeOpaque++
      }
    }
  }
  return {
    width: metadata.width,
    height: metadata.height,
    hasAlpha: true,
    nonOpaqueRatio: nonOpaque / pixels,
    transparentRatio: transparent / pixels,
    subjectRatio: subject / pixels,
    edgeOpaqueRatio: edgeOpaque / edge,
  }
}

function classify(metrics: AlphaMetrics): ScanReason | null {
  if (!metrics.hasAlpha) return 'no_alpha'
  if (metrics.nonOpaqueRatio < 0.001) return 'fully_opaque'
  if (metrics.edgeOpaqueRatio > 0.5) return 'opaque_edge'
  return null
}

async function fetchCelebs(admin: DatabaseClient, ids?: string[]): Promise<CelebRow[]> {
  if (ids && ids.length > 0) {
    const rows: CelebRow[] = []
    for (let index = 0; index < ids.length; index += 100) {
      const chunk = ids.slice(index, index + 100)
      const { data, error } = await admin
        .from('celebs')
        .select('id, slug, nickname, avatar_url')
        .in('id', chunk)
      if (error) throw new Error(`셀럽 조회 실패: ${error.message}`)
      rows.push(...((data ?? []) as CelebRow[]).filter((row) => row.slug && row.avatar_url))
    }
    return rows
  }

  const rows: CelebRow[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await admin
      .from('celebs')
      .select('id, slug, nickname, avatar_url')
      .not('avatar_url', 'is', null)
      .order('slug', { ascending: true })
      .range(from, from + 499)
    if (error) throw new Error(`셀럽 조회 실패: ${error.message}`)
    const page = ((data ?? []) as CelebRow[]).filter((row) => row.slug && row.avatar_url)
    rows.push(...page)
    if ((data ?? []).length < 500) break
  }
  return SCAN_LIMIT ? rows.slice(0, SCAN_LIMIT) : rows
}

async function runPool<T>(items: T[], workers: number, task: (item: T, index: number) => Promise<void>) {
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      await task(items[index], index)
    }
  }))
}

function escapeXml(valueToEscape: string): string {
  return valueToEscape
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function labelSvg(width: number, height: number, lines: string[], background = '#111111'): Buffer {
  const text = lines.map((line, index) =>
    `<text x="10" y="${22 + index * 18}" fill="#f1f1f1" font-size="14" font-family="Segoe UI, Malgun Gothic, sans-serif">${escapeXml(line)}</text>`
  ).join('')
  return Buffer.from(`<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="${background}"/>${text}</svg>`)
}

async function createCandidateSheets(
  runDir: string,
  label: string,
  candidates: ScanCandidate[]
): Promise<void> {
  if (candidates.length === 0) return
  const outputDir = path.join(runDir, `${label}-sheets`)
  await mkdir(outputDir, { recursive: true })
  const tileWidth = 240
  const tileHeight = 278
  const pageSize = SHEET_COLUMNS * SHEET_ROWS

  for (let offset = 0; offset < candidates.length; offset += pageSize) {
    const page = candidates.slice(offset, offset + pageSize)
    const composites: sharp.OverlayOptions[] = []
    for (let index = 0; index < page.length; index++) {
      const candidate = page[index]
      const source = await readFile(path.join(runDir, candidate.sourceFile))
      const image = await sharp(source)
        .ensureAlpha()
        .resize(220, 220, { fit: 'cover' })
        .flatten({ background: '#0a0a0a' })
        .png()
        .toBuffer()
      const left = (index % SHEET_COLUMNS) * tileWidth
      const top = Math.floor(index / SHEET_COLUMNS) * tileHeight
      composites.push({ input: image, left: left + 10, top: top + 10 })
      composites.push({
        input: labelSvg(220, 48, [candidate.nickname ?? candidate.slug, `${candidate.reason} · edge ${Math.round(candidate.metrics.edgeOpaqueRatio * 100)}%`]),
        left: left + 10,
        top: top + 230,
      })
    }
    const output = path.join(outputDir, `${label}-${String(offset / pageSize + 1).padStart(3, '0')}.png`)
    await sharp({
      create: {
        width: tileWidth * SHEET_COLUMNS,
        height: tileHeight * SHEET_ROWS,
        channels: 3,
        background: '#111111',
      },
    }).composite(composites).png().toFile(output)
  }
}

async function scan(): Promise<void> {
  loadEnv()
  const runDir = boPath('.tmp', 'avatar-nobg', `scan-${stamp()}`)
  const originalsDir = path.join(runDir, 'candidate-originals')
  await mkdir(originalsDir, { recursive: true })
  const admin = adminClient()
  const celebs = await fetchCelebs(admin)
  const definite: ScanCandidate[] = []
  const review: ScanCandidate[] = []
  const failures: ScanFailure[] = []
  let alreadyCutout = 0
  let completed = 0

  console.log(`전수 스캔 시작: ${celebs.length}명 · 네트워크 작업자 ${SCAN_WORKERS}개`)
  await runPool(celebs, SCAN_WORKERS, async (celeb) => {
    try {
      const source = await fetchBuffer(celeb.avatar_url)
      if (!source) throw new Error('아바타 응답이 비어 있습니다.')
      const metrics = await analyzeAlpha(source)
      const reason = classify(metrics)
      if (!reason) {
        alreadyCutout++
      } else {
        const sourceFile = path.join('candidate-originals', `${celeb.id}.webp`)
        await writeFile(path.join(runDir, sourceFile), source)
        const candidate: ScanCandidate = {
          ...celeb,
          reason,
          metrics,
          sourceFile,
          sha256: createHash('sha256').update(source).digest('hex'),
        }
        if (reason === 'opaque_edge') review.push(candidate)
        else definite.push(candidate)
      }
    } catch (error) {
      failures.push({
        id: celeb.id,
        slug: celeb.slug,
        error: error instanceof Error ? error.message : '검사 실패',
      })
    } finally {
      completed++
      if (completed % 100 === 0 || completed === celebs.length) {
        console.log(`스캔 ${completed}/${celebs.length} · 확정 ${definite.length} · 검토 ${review.length} · 실패 ${failures.length}`)
      }
    }
  })

  definite.sort((a, b) => a.slug.localeCompare(b.slug))
  review.sort((a, b) => a.slug.localeCompare(b.slug))
  failures.sort((a, b) => a.slug.localeCompare(b.slug))
  const report: ScanReport = {
    version: 1,
    createdAt: new Date().toISOString(),
    runDir,
    total: celebs.length,
    checked: celebs.length - failures.length,
    alreadyCutout,
    definite,
    review,
    failures,
  }
  const reportPath = path.join(runDir, 'scan.json')
  await writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8')
  await createCandidateSheets(runDir, 'definite', definite)
  await createCandidateSheets(runDir, 'review', review)
  console.log(`SCAN_REPORT=${reportPath}`)
  console.log(`완료: 전체 ${report.total} · 이미 누끼 ${alreadyCutout} · 미처리 확정 ${definite.length} · 검토 ${review.length} · 실패 ${failures.length}`)
}

async function backupTarget(runDir: string, celeb: CelebRow, currentSource: Buffer): Promise<BackupMeta> {
  const dir = path.join(runDir, '_backup', celeb.id)
  const metaPath = path.join(dir, 'meta.json')
  if (existsSync(metaPath)) return JSON.parse(await readFile(metaPath, 'utf8')) as BackupMeta
  await mkdir(dir, { recursive: true })
  await sharp(currentSource).metadata()
  const avatarFile = path.join(dir, 'avatar.webp')
  await writeFile(avatarFile, currentSource)

  const smallUrl = celebAvatarSmallUrl(celeb.avatar_url)
  const small = smallUrl && smallUrl !== celeb.avatar_url
    ? await fetchBuffer(smallUrl, true)
    : null
  let smallFile: string | null = null
  if (small) {
    await sharp(small).metadata()
    smallFile = path.join(dir, 'avatar-sm.webp')
    await writeFile(smallFile, small)
  }
  const meta: BackupMeta = {
    ...celeb,
    backedUpAt: new Date().toISOString(),
    avatarFile,
    smallUrl,
    smallFile,
  }
  await writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8')
  return meta
}

async function restoreBackup(
  meta: BackupMeta,
  dependencies: {
    uploadToR2: (key: string, body: Buffer, contentType: string) => Promise<void>
    deleteFromR2: (key: string) => Promise<void>
    admin: DatabaseClient
  }
): Promise<void> {
  const avatar = await readFile(meta.avatarFile)
  await dependencies.uploadToR2(`celebs/${meta.id}/avatar.webp`, avatar, 'image/webp')
  if (meta.smallFile) {
    await dependencies.uploadToR2(`celebs/${meta.id}/avatar-sm.webp`, await readFile(meta.smallFile), 'image/webp')
  } else {
    await dependencies.deleteFromR2(`celebs/${meta.id}/avatar-sm.webp`)
  }
  const { data, error } = await dependencies.admin
    .from('celebs')
    .update({ avatar_url: meta.avatar_url })
    .eq('id', meta.id)
    .select('id')
    .maybeSingle()
  if (error) throw new Error(`복원 DB 갱신 실패: ${error.message}`)
  if (!data) throw new Error('복원할 셀럽 DB 행을 찾지 못했습니다.')
}

async function validatePublished(url: string): Promise<{ buffer: Buffer; metrics: AlphaMetrics }> {
  const buffer = await fetchBuffer(url)
  if (!buffer) throw new Error('등록 결과를 다시 받지 못했습니다.')
  const metrics = await analyzeAlpha(buffer, 128)
  if (metrics.width !== 800 || metrics.height !== 800) {
    throw new Error(`등록 크기 불일치: ${metrics.width}x${metrics.height}`)
  }
  if (!metrics.hasAlpha || metrics.nonOpaqueRatio < 0.005) {
    throw new Error(`투명 영역 부족: ${(metrics.nonOpaqueRatio * 100).toFixed(2)}%`)
  }
  if (metrics.subjectRatio < 0.1) {
    throw new Error(`인물 잔존 영역 부족: ${(metrics.subjectRatio * 100).toFixed(2)}%`)
  }
  return { buffer, metrics }
}

async function createComparisonSheets(state: ApplyState): Promise<void> {
  const successes = Object.values(state.results)
    .filter((result) => result.status === 'success')
    .sort((a, b) => a.slug.localeCompare(b.slug))
  if (successes.length === 0) return
  const outputDir = path.join(state.runDir, 'comparison-sheets')
  await mkdir(outputDir, { recursive: true })
  const width = 600
  const rowHeight = 226

  for (let offset = 0; offset < successes.length; offset += COMPARISON_ROWS) {
    const page = successes.slice(offset, offset + COMPARISON_ROWS)
    const composites: sharp.OverlayOptions[] = []
    for (let index = 0; index < page.length; index++) {
      const result = page[index]
      const backup = JSON.parse(await readFile(path.join(state.runDir, '_backup', result.id, 'meta.json'), 'utf8')) as BackupMeta
      const before = await readFile(backup.avatarFile)
      const after = await readFile(path.join(state.runDir, 'results', `${result.id}.webp`))
      const [beforeDark, afterDark, afterLight] = await Promise.all([
        sharp(before).ensureAlpha().resize(180, 180, { fit: 'cover' }).flatten({ background: '#0a0a0a' }).png().toBuffer(),
        sharp(after).ensureAlpha().resize(180, 180, { fit: 'cover' }).flatten({ background: '#0a0a0a' }).png().toBuffer(),
        sharp(after).ensureAlpha().resize(180, 180, { fit: 'cover' }).flatten({ background: '#eeeeee' }).png().toBuffer(),
      ])
      const top = index * rowHeight
      composites.push({
        input: labelSvg(width, 36, [`${result.nickname ?? result.slug} (${result.slug}) · 원본 / 결과-서비스배경 / 결과-밝은배경`]),
        left: 0,
        top,
      })
      composites.push({ input: beforeDark, left: 10, top: top + 40 })
      composites.push({ input: afterDark, left: 205, top: top + 40 })
      composites.push({ input: afterLight, left: 400, top: top + 40 })
    }
    const output = path.join(outputDir, `comparison-${String(offset / COMPARISON_ROWS + 1).padStart(3, '0')}.png`)
    await sharp({
      create: {
        width,
        height: rowHeight * COMPARISON_ROWS,
        channels: 3,
        background: '#111111',
      },
    }).composite(composites).png().toFile(output)
  }
}

async function revalidateResults(results: ApplyResult[]): Promise<void> {
  if (results.length === 0) return
  const { revalidateWebItems, revalidateWebLists } = await import('../../src/lib/revalidate-web')
  await revalidateWebItems(results.flatMap((result) => [
    { domain: CACHE_TAGS.CELEBS, id: result.id },
    { domain: CACHE_TAGS.CELEBS, id: result.slug },
  ]))
  await revalidateWebLists(CACHE_TAGS.CELEBS)
}

async function apply(): Promise<void> {
  loadEnv()
  const reportPath = value('--report')
  if (!reportPath) throw new Error('apply에는 --report <scan.json>이 필요합니다.')
  const resolvedReport = path.resolve(reportPath)
  const report = JSON.parse(await readFile(resolvedReport, 'utf8')) as ScanReport
  const selectedSlugs = new Set((value('--slugs') ?? '').split(',').map((slug) => slug.trim()).filter(Boolean))
  const allCandidates = [...report.definite, ...report.review]
  const targets = selectedSlugs.size > 0
    ? allCandidates.filter((candidate) => selectedSlugs.has(candidate.slug))
    : report.definite
  if (selectedSlugs.size > 0 && targets.length !== selectedSlugs.size) {
    const found = new Set(targets.map((target) => target.slug))
    throw new Error(`scan 보고서에 없는 slug: ${[...selectedSlugs].filter((slug) => !found.has(slug)).join(', ')}`)
  }
  if (targets.length === 0) {
    console.log('처리할 미누끼 확정 대상이 없습니다.')
    return
  }

  const runDir = report.runDir
  const statePath = path.join(runDir, 'apply.json')
  const state: ApplyState = existsSync(statePath)
    ? JSON.parse(await readFile(statePath, 'utf8')) as ApplyState
    : {
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scanReport: resolvedReport,
      runDir,
      results: {},
    }
  const saveState = async () => {
    state.updatedAt = new Date().toISOString()
    await writeFile(statePath, JSON.stringify(state, null, 2), 'utf8')
  }

  const admin = adminClient()
  const currentRows = await fetchCelebs(admin, targets.map((target) => target.id))
  const currentById = new Map(currentRows.map((row) => [row.id, row]))
  const prepared: CelebRow[] = []
  console.log(`백업 시작: ${targets.length}명`)
  for (let index = 0; index < targets.length; index++) {
    const target = targets[index]
    const current = currentById.get(target.id)
    if (!current) throw new Error(`현재 DB에서 대상을 찾지 못했습니다: ${target.slug}`)
    const currentSource = await fetchBuffer(current.avatar_url)
    if (!currentSource) throw new Error(`현재 아바타를 받지 못했습니다: ${target.slug}`)
    const reasonNow = classify(await analyzeAlpha(currentSource))
    if (!reasonNow) {
      state.results[target.id] = {
        id: target.id,
        slug: target.slug,
        nickname: target.nickname,
        status: 'skipped_already_cutout',
        oldUrl: current.avatar_url,
      }
      continue
    }
    await backupTarget(runDir, current, currentSource)
    prepared.push(current)
    if ((index + 1) % 20 === 0 || index + 1 === targets.length) {
      console.log(`백업 ${index + 1}/${targets.length}`)
    }
  }
  await saveState()

  const [{ processNobgAvatars }, r2] = await Promise.all([
    import('../../src/lib/image-processing/nobg-avatar'),
    import('../../src/lib/r2'),
  ])
  await mkdir(path.join(runDir, 'results'), { recursive: true })
  const queue = prepared.filter((row) => {
    const previous = state.results[row.id]
    if (!previous) return true
    if (previous.status === 'success' || previous.status === 'skipped_already_cutout' || previous.status === 'manual_restored') return false
    return flag('--retry-errors')
  })
  console.log(`CPU 누끼 시작: ${queue.length}명 · ${APPLY_BATCH_SIZE}명씩 · 프로세스 1개`)

  for (let offset = 0; offset < queue.length; offset += APPLY_BATCH_SIZE) {
    const batch = queue.slice(offset, offset + APPLY_BATCH_SIZE)
    const results = await processNobgAvatars(batch.map((row) => row.id), undefined, { revalidate: false })
    for (const celeb of batch) {
      const backup = JSON.parse(await readFile(path.join(runDir, '_backup', celeb.id, 'meta.json'), 'utf8')) as BackupMeta
      const processed = results.get(celeb.id)
      try {
        if (!processed?.url) throw new Error(processed?.error || '누끼 처리 결과가 없습니다.')
        const verified = await validatePublished(processed.url)
        await writeFile(path.join(runDir, 'results', `${celeb.id}.webp`), verified.buffer)
        state.results[celeb.id] = {
          id: celeb.id,
          slug: celeb.slug,
          nickname: celeb.nickname,
          status: 'success',
          oldUrl: backup.avatar_url,
          newUrl: processed.url,
          metrics: verified.metrics,
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '누끼 처리 실패'
        try {
          await restoreBackup(backup, { ...r2, admin })
          state.results[celeb.id] = {
            id: celeb.id,
            slug: celeb.slug,
            nickname: celeb.nickname,
            status: 'restored_error',
            oldUrl: backup.avatar_url,
            error: message,
          }
        } catch (restoreError) {
          throw new Error(`${celeb.slug}: ${message}; 원본 복원도 실패: ${restoreError instanceof Error ? restoreError.message : '알 수 없음'}`)
        }
      }
    }
    await saveState()
    const done = Math.min(offset + batch.length, queue.length)
    const succeeded = Object.values(state.results).filter((result) => result.status === 'success').length
    const failed = Object.values(state.results).filter((result) => result.status === 'restored_error').length
    console.log(`누끼 ${done}/${queue.length} · 성공 ${succeeded} · 원본복원 ${failed}`)
  }

  const successes = Object.values(state.results).filter((result) => result.status === 'success')
  if (successes.length > 0) {
    await revalidateResults(successes)
    state.cacheRevalidatedAt = new Date().toISOString()
  }

  const verificationErrors: string[] = []
  const freshRows = await fetchCelebs(admin, successes.map((result) => result.id))
  const freshById = new Map(freshRows.map((row) => [row.id, row]))
  for (const result of successes) {
    if (freshById.get(result.id)?.avatar_url !== result.newUrl) {
      verificationErrors.push(`${result.slug}: DB URL 불일치`)
    }
  }
  state.verificationErrors = verificationErrors
  await createComparisonSheets(state)
  await saveState()
  console.log(`APPLY_STATE=${statePath}`)
  console.log(`완료: 성공 ${successes.length} · 원본 유지/복원 ${Object.values(state.results).filter((result) => result.status !== 'success').length} · 검증 오류 ${verificationErrors.length}`)
}

async function restore(): Promise<void> {
  loadEnv()
  const stateFile = value('--state')
  const slugs = new Set((value('--slugs') ?? '').split(',').map((slug) => slug.trim()).filter(Boolean))
  if (!stateFile || slugs.size === 0) throw new Error('restore에는 --state <apply.json> --slugs a,b가 필요합니다.')
  const statePath = path.resolve(stateFile)
  const state = JSON.parse(await readFile(statePath, 'utf8')) as ApplyState
  const selected = Object.values(state.results).filter((result) => slugs.has(result.slug))
  if (selected.length !== slugs.size) throw new Error('apply 상태에 없는 slug가 포함되어 있습니다.')
  const admin = adminClient()
  const r2 = await import('../../src/lib/r2')
  for (const result of selected) {
    const meta = JSON.parse(await readFile(path.join(state.runDir, '_backup', result.id, 'meta.json'), 'utf8')) as BackupMeta
    await restoreBackup(meta, { ...r2, admin })
    result.status = 'manual_restored'
    result.newUrl = undefined
    result.error = '눈 검수 후 수동 복원'
  }
  await revalidateResults(selected)
  state.updatedAt = new Date().toISOString()
  await writeFile(statePath, JSON.stringify(state, null, 2), 'utf8')
  console.log(`복원 완료: ${selected.map((result) => result.slug).join(', ')}`)
}

async function main(): Promise<void> {
  if (command === 'scan') return scan()
  if (command === 'apply') return apply()
  if (command === 'restore') return restore()
  console.log('사용법: avatar:nobg-backfill scan | apply --report <scan.json> | restore --state <apply.json> --slugs a,b')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
