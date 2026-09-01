/**
 * Register human-reviewed mythology portraits and awakened images without blind overwrites.
 *
 * Reviewed manifest (JSON array, or { "images": [...] }):
 * [
 *   {
 *     "celeb_id": "00000000-0000-0000-0000-000000000000",
 *     "slug": "example",
 *     "slot": "portrait",
 *     "approved_source_path": "D:\\remotion-assets\\...\\example.png",
 *     "expected_prior_db_url": null
 *   }
 * ]
 *
 * Dry-run (default):
 *   node --env-file=.env scripts/photo/myth-image-register.mjs <reviewed-manifest.json>
 * Apply only after the dry-run succeeds:
 *   node --env-file=.env scripts/photo/myth-image-register.mjs <reviewed-manifest.json> --apply
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { createClient } from '@supabase/supabase-js'
import { createHash, randomUUID } from 'node:crypto'
import {
  appendFile,
  mkdir,
  readFile,
  realpath,
  stat,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SAFE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const SLOT_SPEC = Object.freeze({
  portrait: Object.freeze({
    column: 'portrait_url',
    filename: 'photo.webp',
    width: 1080,
    height: 1350,
  }),
  awakened: Object.freeze({
    column: 'awakened_image_url',
    filename: 'awakened.webp',
    width: 1080,
    height: 1080,
  }),
})
const WEBP_QUALITY = 88
const CACHE_CONTROL = 'public, max-age=31536000, immutable'
const DB_PAGE_SIZE = 100

export function slotSpec(slot) {
  const spec = SLOT_SPEC[slot]
  if (!spec) throw new Error(`지원하지 않는 이미지 슬롯입니다: ${String(slot)}`)
  return spec
}

export function fixedKeyFor(row) {
  return `celebs/${row.celeb_id}/${slotSpec(row.slot).filename}`
}

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

export function buildCasFilter(column, expectedValue) {
  if (!['portrait_url', 'awakened_image_url'].includes(column)) {
    throw new Error(`CAS를 허용하지 않는 DB 컬럼입니다: ${column}`)
  }
  return expectedValue === null
    ? Object.freeze({ method: 'is', column, value: null })
    : Object.freeze({ method: 'eq', column, value: expectedValue })
}

export function applyCasFilter(query, filter) {
  return query[filter.method](filter.column, filter.value)
}

export function formatJournalLine(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new Error('journal entry는 객체여야 합니다.')
  }
  return `${JSON.stringify(entry)}\n`
}

export function withCacheBuster(sourceUrl, token) {
  if (sourceUrl === null) return null
  const url = new URL(sourceUrl)
  url.searchParams.set('v', token)
  return url.toString()
}

function manifestRows(raw) {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && Array.isArray(raw.images)) return raw.images
  throw new Error('manifest는 JSON 배열 또는 { "images": [...] }여야 합니다.')
}

export function validateManifestRows(raw, { pathApi = path } = {}) {
  const rows = manifestRows(raw)
  if (rows.length === 0) throw new Error('manifest에 등록할 이미지가 없습니다.')

  const seen = new Set()
  return rows.map((input, index) => {
    const label = `manifest[${index}]`
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      throw new Error(`${label}은 객체여야 합니다.`)
    }
    const { celeb_id: celebId, slug, slot, approved_source_path: sourcePath } = input
    if (typeof celebId !== 'string' || !UUID_RE.test(celebId)) {
      throw new Error(`${label}.celeb_id가 canonical UUID가 아닙니다.`)
    }
    if (typeof slug !== 'string' || slug.length > 200 || !SAFE_SLUG_RE.test(slug)) {
      throw new Error(`${label}.slug가 비어 있거나 안전하지 않습니다.`)
    }
    slotSpec(slot)
    if (typeof sourcePath !== 'string' || !pathApi.isAbsolute(sourcePath)) {
      throw new Error(`${label}.approved_source_path는 절대 경로여야 합니다.`)
    }
    if (!Object.hasOwn(input, 'expected_prior_db_url')) {
      throw new Error(`${label}.expected_prior_db_url이 필요합니다. 기존 값이 없으면 null을 명시하세요.`)
    }
    const expectedUrl = input.expected_prior_db_url
    if (expectedUrl !== null) {
      if (typeof expectedUrl !== 'string' || expectedUrl.length === 0) {
        throw new Error(`${label}.expected_prior_db_url은 URL 문자열 또는 null이어야 합니다.`)
      }
      let parsed
      try {
        parsed = new URL(expectedUrl)
      } catch {
        throw new Error(`${label}.expected_prior_db_url이 유효한 절대 URL이 아닙니다.`)
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error(`${label}.expected_prior_db_url은 HTTP(S) URL이어야 합니다.`)
      }
    }

    const dedupeKey = `${celebId}:${slot}`
    if (seen.has(dedupeKey)) throw new Error(`${label}이 같은 인물·슬롯을 중복 등록합니다: ${dedupeKey}`)
    seen.add(dedupeKey)

    return Object.freeze({
      celeb_id: celebId,
      slug,
      slot,
      approved_source_path: pathApi.normalize(sourcePath),
      expected_prior_db_url: expectedUrl,
    })
  })
}

export async function transformReviewedImage(sourceBytes, slot) {
  const spec = slotSpec(slot)
  return sharp(sourceBytes, { failOn: 'error' })
    .rotate()
    .resize(spec.width, spec.height, {
      fit: 'cover',
      position: 'centre',
      withoutEnlargement: false,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

export async function verifyTransformedImage(bytes, slot) {
  const spec = slotSpec(slot)
  const metadata = await sharp(bytes, { failOn: 'error' }).metadata()
  if (metadata.format !== 'webp') throw new Error(`변환 결과가 WebP가 아닙니다: ${metadata.format ?? 'unknown'}`)
  if (metadata.width !== spec.width || metadata.height !== spec.height) {
    throw new Error(
      `변환 결과 크기가 ${spec.width}x${spec.height}가 아닙니다: ${metadata.width}x${metadata.height}`,
    )
  }
  const decoded = await sharp(bytes, { failOn: 'error' }).raw().toBuffer({ resolveWithObject: true })
  if (decoded.info.width !== spec.width || decoded.info.height !== spec.height || decoded.data.length === 0) {
    throw new Error('변환 결과를 완전히 디코딩하지 못했습니다.')
  }
  return Object.freeze({
    format: metadata.format,
    width: metadata.width,
    height: metadata.height,
    bytes: bytes.length,
    sha256: sha256(bytes),
  })
}

export function parseCliArgs(argv) {
  const args = [...argv]
  let manifestPath = null
  let apply = false
  let backupRoot = null
  let journalPath = null
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--apply') {
      apply = true
    } else if (arg === '--dry-run') {
      apply = false
    } else if (arg === '--backup-root' || arg === '--journal') {
      const value = args[index + 1]
      if (!value || value.startsWith('--')) throw new Error(`${arg} 뒤에 경로가 필요합니다.`)
      if (arg === '--backup-root') backupRoot = value
      else journalPath = value
      index += 1
    } else if (arg.startsWith('--')) {
      throw new Error(`알 수 없는 옵션입니다: ${arg}`)
    } else if (manifestPath === null) {
      manifestPath = arg
    } else {
      throw new Error(`manifest 경로는 하나만 지정할 수 있습니다: ${arg}`)
    }
  }
  if (!manifestPath) throw new Error('reviewed manifest JSON 경로가 필요합니다.')
  return Object.freeze({ manifestPath, apply, backupRoot, journalPath })
}

async function readReviewedManifest(manifestPath) {
  const absolutePath = path.resolve(manifestPath)
  const raw = JSON.parse(await readFile(absolutePath, 'utf8'))
  return { absolutePath, rows: validateManifestRows(raw) }
}

async function prepareLocalRows(rows) {
  const prepared = []
  // Avoid decoding every large reviewed source concurrently. All rows are still fully
  // prepared before apply starts, so a bad source cannot create a partial batch.
  for (const row of rows) {
    const resolvedPath = await realpath(row.approved_source_path)
    const sourceStat = await stat(resolvedPath)
    if (!sourceStat.isFile()) throw new Error(`${row.slug}/${row.slot}: 승인 소스가 일반 파일이 아닙니다.`)
    const sourceBytes = await readFile(resolvedPath)
    if (sourceBytes.length === 0) throw new Error(`${row.slug}/${row.slot}: 승인 소스가 빈 파일입니다.`)
    const transformedBytes = await transformReviewedImage(sourceBytes, row.slot)
    const verified = await verifyTransformedImage(transformedBytes, row.slot)
    prepared.push(Object.freeze({ ...row, approved_source_path: resolvedPath, transformedBytes, verified }))
  }
  return prepared
}

function requireEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`환경변수 ${name}이 필요합니다.`)
  return value
}

function adminClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function r2Context() {
  const accountId = requireEnv('R2_ACCOUNT_ID')
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID')
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY')
  return {
    bucket: requireEnv('R2_BUCKET_NAME'),
    publicBaseUrl: requireEnv('R2_PUBLIC_URL').replace(/\/+$/, ''),
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  }
}

async function fetchCurrentCelebs(db, ids) {
  const found = []
  for (let offset = 0; offset < ids.length; offset += DB_PAGE_SIZE) {
    const chunk = ids.slice(offset, offset + DB_PAGE_SIZE)
    const { data, error } = await db
      .from('celebs')
      .select('id,slug,portrait_url,awakened_image_url')
      .in('id', chunk)
    if (error) throw new Error(`celeb 사전 조회 실패: ${error.message}`)
    found.push(...(data ?? []))
  }
  return found
}

async function verifyDbPreconditions(db, rows) {
  const ids = [...new Set(rows.map((row) => row.celeb_id))]
  const currentRows = await fetchCurrentCelebs(db, ids)
  const currentById = new Map(currentRows.map((row) => [row.id, row]))
  const failures = []
  for (const row of rows) {
    const current = currentById.get(row.celeb_id)
    const column = slotSpec(row.slot).column
    if (!current) {
      failures.push(`${row.slug}/${row.slot}: DB에서 celeb_id를 찾지 못했습니다.`)
      continue
    }
    if (current.slug !== row.slug) {
      failures.push(`${row.slug}/${row.slot}: id/slug 불일치(DB slug=${current.slug}).`)
    }
    if (current[column] !== row.expected_prior_db_url) {
      failures.push(
        `${row.slug}/${row.slot}: 현재 ${column}이 manifest expected_prior_db_url과 다릅니다.`,
      )
    }
  }
  if (failures.length > 0) {
    throw new Error(`DB 사전조건 검증 실패(아무것도 변경하지 않음):\n- ${failures.join('\n- ')}`)
  }
}

async function objectBodyToBuffer(body) {
  if (!body) throw new Error('R2 GetObject 응답에 Body가 없습니다.')
  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray())
  }
  const chunks = []
  for await (const chunk of body) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}

function isMissingObject(error) {
  return error?.name === 'NoSuchKey'
    || error?.name === 'NotFound'
    || error?.$metadata?.httpStatusCode === 404
}

async function getR2Object(r2, key) {
  try {
    const output = await r2.client.send(new GetObjectCommand({ Bucket: r2.bucket, Key: key }))
    return {
      bytes: await objectBodyToBuffer(output.Body),
      putOptions: {
        ContentType: output.ContentType,
        CacheControl: output.CacheControl,
        ContentDisposition: output.ContentDisposition,
        ContentEncoding: output.ContentEncoding,
        ContentLanguage: output.ContentLanguage,
        Expires: output.Expires,
        Metadata: output.Metadata,
      },
    }
  } catch (error) {
    if (isMissingObject(error)) return null
    throw error
  }
}

async function putR2Object(r2, key, bytes, options = {}) {
  await r2.client.send(new PutObjectCommand({
    Bucket: r2.bucket,
    Key: key,
    Body: bytes,
    ContentType: options.ContentType ?? 'image/webp',
    CacheControl: options.CacheControl ?? CACHE_CONTROL,
    ...(options.ContentDisposition ? { ContentDisposition: options.ContentDisposition } : {}),
    ...(options.ContentEncoding ? { ContentEncoding: options.ContentEncoding } : {}),
    ...(options.ContentLanguage ? { ContentLanguage: options.ContentLanguage } : {}),
    ...(options.Expires ? { Expires: options.Expires } : {}),
    ...(options.Metadata ? { Metadata: options.Metadata } : {}),
  }))
}

async function deleteR2Object(r2, key) {
  await r2.client.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: key }))
}

function publicUrlFor(r2, key, token) {
  const url = new URL(`${r2.publicBaseUrl}/${key}`)
  url.searchParams.set('v', token)
  return url.toString()
}

async function casUpdateUrl(db, row, expectedValue, newValue) {
  const column = slotSpec(row.slot).column
  const filter = buildCasFilter(column, expectedValue)
  let query = db
    .from('celebs')
    .update({ [column]: newValue })
    .eq('id', row.celeb_id)
    .eq('slug', row.slug)
  query = applyCasFilter(query, filter)
  const { data, error } = await query.select(`id,slug,${column}`).maybeSingle()
  if (error) throw new Error(`${row.slug}/${row.slot}: DB CAS 갱신 실패: ${error.message}`)
  if (!data) throw new Error(`${row.slug}/${row.slot}: DB CAS 조건이 더 이상 일치하지 않습니다.`)
  if (data[column] !== newValue) throw new Error(`${row.slug}/${row.slot}: DB CAS 반환값 검증 실패.`)
  return data
}

async function verifyDbReadback(db, row, expectedValue) {
  const column = slotSpec(row.slot).column
  const { data, error } = await db
    .from('celebs')
    .select(`id,slug,${column}`)
    .eq('id', row.celeb_id)
    .single()
  if (error || !data) throw new Error(`${row.slug}/${row.slot}: DB readback 실패: ${error?.message ?? 'no row'}`)
  if (data.slug !== row.slug || data[column] !== expectedValue) {
    throw new Error(`${row.slug}/${row.slot}: DB readback 값이 방금 기록한 값과 다릅니다.`)
  }
}

async function verifyPublicCdn(url, row, expectedHash, attempts = 6) {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' },
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const bytes = Buffer.from(await response.arrayBuffer())
      const actualHash = sha256(bytes)
      if (actualHash !== expectedHash) throw new Error(`SHA-256 불일치(${actualHash})`)
      await verifyTransformedImage(bytes, row.slot)
      return
    } catch (error) {
      lastError = error
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt))
    }
  }
  throw new Error(
    `${row.slug}/${row.slot}: public CDN 검증 실패: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  )
}

async function appendJournal(journalPath, base, event) {
  await appendFile(journalPath, formatJournalLine({
    at: new Date().toISOString(),
    ...base,
    ...event,
  }), 'utf8')
}

async function rollBackRow({ db, r2, row, oldObject, fixedKey, newUrl, dbUpdateAttempted, fixedChanged, journal }) {
  const errors = []
  let dbState = 'not_attempted'
  if (dbUpdateAttempted) {
    try {
      const column = slotSpec(row.slot).column
      const { data: current, error } = await db
        .from('celebs')
        .select(`id,slug,${column}`)
        .eq('id', row.celeb_id)
        .single()
      if (error || !current) throw new Error(error?.message ?? 'rollback DB readback에 행이 없습니다.')
      if (current.slug !== row.slug) throw new Error(`rollback id/slug 불일치(DB slug=${current.slug}).`)
      if (current[column] === newUrl) dbState = 'new_value'
      else if (current[column] === row.expected_prior_db_url) dbState = 'prior_value'
      else dbState = 'concurrent_value'
    } catch (error) {
      dbState = 'unknown'
      errors.push(`DB rollback preflight: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // A third DB value means another writer won the race. Do not overwrite that writer's
  // fixed object or URL during rollback; the journal preserves the manual recovery state.
  if (dbState === 'concurrent_value') {
    errors.push('DB rollback: 동시 변경값을 발견해 R2와 DB를 덮어쓰지 않았습니다.')
  }

  let r2Restored = !fixedChanged
  if (fixedChanged && !['concurrent_value', 'unknown'].includes(dbState)) {
    try {
      const currentObject = await getR2Object(r2, fixedKey)
      const currentHash = currentObject ? sha256(currentObject.bytes) : null
      const oldHash = oldObject ? sha256(oldObject.bytes) : null
      const newHash = row.verified.sha256

      if (currentHash === oldHash) {
        r2Restored = true
        await appendJournal(journal.path, journal.base, {
          event: 'rollback_r2_was_unchanged',
          fixed_key: fixedKey,
          restored_sha256: oldHash,
        })
      } else if (currentHash !== newHash) {
        throw new Error('fixed key가 새 이미지도 백업 이미지도 아닙니다. 동시 변경을 덮어쓰지 않았습니다.')
      } else if (oldObject) {
        await putR2Object(r2, fixedKey, oldObject.bytes, oldObject.putOptions)
        const restored = await getR2Object(r2, fixedKey)
        if (!restored || sha256(restored.bytes) !== oldHash) {
          throw new Error('복원한 R2 객체의 SHA-256이 백업과 다릅니다.')
        }
        r2Restored = true
        await appendJournal(journal.path, journal.base, {
          event: 'rollback_r2_restored',
          fixed_key: fixedKey,
          restored_sha256: oldHash,
        })
      } else {
        await deleteR2Object(r2, fixedKey)
        if (await getR2Object(r2, fixedKey)) throw new Error('기존 객체가 없던 fixed key 삭제 검증 실패.')
        r2Restored = true
        await appendJournal(journal.path, journal.base, {
          event: 'rollback_r2_removed',
          fixed_key: fixedKey,
          restored_sha256: null,
        })
      }
    } catch (error) {
      errors.push(`R2 rollback: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (dbUpdateAttempted && !['concurrent_value', 'unknown'].includes(dbState)) {
    try {
      if (!r2Restored) throw new Error('R2 원본 복원을 확인하지 못해 DB를 이전 URL로 돌리지 않았습니다.')
      if (dbState === 'new_value') {
        const rollbackToken = `rollback-${Date.now()}-${randomUUID()}`
        const rollbackUrl = withCacheBuster(row.expected_prior_db_url, rollbackToken)
        await casUpdateUrl(db, row, newUrl, rollbackUrl)
        await verifyDbReadback(db, row, rollbackUrl)
        await appendJournal(journal.path, journal.base, {
          event: 'rollback_db_restored',
          restored_db_url: rollbackUrl,
        })
      } else if (dbState === 'prior_value') {
        await appendJournal(journal.path, journal.base, {
          event: 'rollback_db_was_unchanged',
          restored_db_url: row.expected_prior_db_url,
        })
      } else {
        throw new Error('DB rollback 상태를 확인하지 못했습니다.')
      }
    } catch (error) {
      errors.push(`DB rollback: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  if (errors.length > 0) throw new Error(errors.join('; '))
}

async function applyRow({ db, r2, row, runDir, journalPath, runId, index }) {
  const fixedKey = fixedKeyFor(row)
  const tempKey = `celebs/${row.celeb_id}/_tmp/myth-image-register-${runId}-${index}-${randomUUID()}.webp`
  const journal = {
    path: journalPath,
    base: { run_id: runId, celeb_id: row.celeb_id, slug: row.slug, slot: row.slot },
  }
  let oldObject = null
  let fixedChanged = false
  let dbUpdateAttempted = false
  let newUrl = null
  let tempUploaded = false

  try {
    oldObject = await getR2Object(r2, fixedKey)
    let backupPath = null
    if (oldObject) {
      const backupDir = path.join(runDir, '_backup')
      await mkdir(backupDir, { recursive: true })
      backupPath = path.join(
        backupDir,
        `${row.slug}-${row.slot}-${row.celeb_id}-${sha256(oldObject.bytes).slice(0, 16)}.webp`,
      )
      await writeFile(backupPath, oldObject.bytes, { flag: 'wx' })
    }
    await appendJournal(journalPath, journal.base, {
      event: 'r2_backup_complete',
      fixed_key: fixedKey,
      previous_object_existed: Boolean(oldObject),
      backup_path: backupPath,
      previous_r2_sha256: oldObject ? sha256(oldObject.bytes) : null,
      expected_prior_db_url: row.expected_prior_db_url,
    })

    tempUploaded = true
    await putR2Object(r2, tempKey, row.transformedBytes)
    const tempReadback = await getR2Object(r2, tempKey)
    if (!tempReadback) throw new Error(`${row.slug}/${row.slot}: temp R2 객체 readback이 없습니다.`)
    const tempVerified = await verifyTransformedImage(tempReadback.bytes, row.slot)
    if (tempVerified.sha256 !== row.verified.sha256) {
      throw new Error(`${row.slug}/${row.slot}: temp R2 SHA-256 검증 실패.`)
    }
    await appendJournal(journalPath, journal.base, {
      event: 'temp_r2_verified',
      temp_key: tempKey,
      sha256: tempVerified.sha256,
    })

    fixedChanged = true
    await putR2Object(r2, fixedKey, tempReadback.bytes)
    const fixedReadback = await getR2Object(r2, fixedKey)
    if (!fixedReadback) throw new Error(`${row.slug}/${row.slot}: fixed R2 객체 readback이 없습니다.`)
    const fixedVerified = await verifyTransformedImage(fixedReadback.bytes, row.slot)
    if (fixedVerified.sha256 !== row.verified.sha256) {
      throw new Error(`${row.slug}/${row.slot}: fixed R2 SHA-256 검증 실패.`)
    }
    await appendJournal(journalPath, journal.base, {
      event: 'fixed_r2_verified',
      fixed_key: fixedKey,
      sha256: fixedVerified.sha256,
    })

    newUrl = publicUrlFor(r2, fixedKey, `${Date.now()}-${randomUUID()}`)
    dbUpdateAttempted = true
    await casUpdateUrl(db, row, row.expected_prior_db_url, newUrl)
    await verifyDbReadback(db, row, newUrl)
    await appendJournal(journalPath, journal.base, { event: 'db_cas_verified', db_url: newUrl })

    await verifyPublicCdn(newUrl, row, row.verified.sha256)
    await appendJournal(journalPath, journal.base, {
      event: 'success',
      db_url: newUrl,
      fixed_key: fixedKey,
      source_path: row.approved_source_path,
      ...row.verified,
    })
    return { ...journal.base, url: newUrl, ...row.verified }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    try {
      await appendJournal(journalPath, journal.base, { event: 'failure', error: message })
    } catch (journalError) {
      console.error(
        `${row.slug}/${row.slot}: failure journal 기록 실패(rollback은 계속 진행):`,
        journalError instanceof Error ? journalError.message : journalError,
      )
    }
    try {
      await rollBackRow({
        db,
        r2,
        row,
        oldObject,
        fixedKey,
        newUrl,
        dbUpdateAttempted,
        fixedChanged,
        journal,
      })
      await appendJournal(journalPath, journal.base, { event: 'rollback_complete' })
    } catch (rollbackError) {
      const rollbackMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError)
      try {
        await appendJournal(journalPath, journal.base, {
          event: 'rollback_failed_manual_intervention_required',
          error: rollbackMessage,
        })
      } catch (journalError) {
        console.error(
          `${row.slug}/${row.slot}: rollback 실패를 journal에도 기록하지 못했습니다:`,
          journalError instanceof Error ? journalError.message : journalError,
        )
      }
      throw new Error(`${message}; rollback도 실패했습니다: ${rollbackMessage}`)
    }
    throw new Error(`${message}; 해당 행은 원상복구했습니다.`)
  } finally {
    if (tempUploaded) {
      let cleanupError = null
      try {
        await deleteR2Object(r2, tempKey)
      } catch (error) {
        cleanupError = error
      }
      try {
        await appendJournal(journalPath, journal.base, cleanupError
          ? {
              event: 'temp_r2_cleanup_failed',
              temp_key: tempKey,
              error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
            }
          : { event: 'temp_r2_removed', temp_key: tempKey })
      } catch (journalError) {
        console.error(
          `${row.slug}/${row.slot}: temp 정리 결과를 journal에 기록하지 못했습니다:`,
          journalError instanceof Error ? journalError.message : journalError,
        )
      }
    }
  }
}

export async function main(argv = process.argv.slice(2)) {
  const cli = parseCliArgs(argv)
  const { absolutePath: manifestPath, rows } = await readReviewedManifest(cli.manifestPath)
  const prepared = await prepareLocalRows(rows)
  const db = adminClient()

  // Every source, identity, slug and expected URL is checked before the first R2/DB mutation.
  await verifyDbPreconditions(db, prepared)
  console.log(`사전검사 통과: ${prepared.length}개 이미지`)
  for (const row of prepared) {
    console.log(
      `  ${row.slug}/${row.slot} ${row.verified.width}x${row.verified.height} `
      + `${Math.round(row.verified.bytes / 1024)}KB ${row.verified.sha256.slice(0, 12)}`,
    )
  }

  if (!cli.apply) {
    console.log('DRY-RUN 완료: R2와 DB를 변경하지 않았습니다. 적용하려면 --apply를 명시하세요.')
    return { mode: 'dry-run', count: prepared.length }
  }

  const r2 = r2Context()
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`
  const manifestDir = path.dirname(manifestPath)
  const runDir = path.resolve(
    cli.backupRoot ?? path.join(manifestDir, '_backup', 'myth-image-register'),
    runId,
  )
  const journalPath = cli.journalPath
    ? path.resolve(cli.journalPath)
    : path.join(runDir, 'journal.jsonl')
  await mkdir(path.dirname(journalPath), { recursive: true })
  await mkdir(runDir, { recursive: true })
  await appendJournal(journalPath, { run_id: runId }, {
    event: 'run_started',
    manifest_path: manifestPath,
    run_dir: runDir,
    image_count: prepared.length,
  })

  const completed = []
  for (let index = 0; index < prepared.length; index += 1) {
    const result = await applyRow({
      db,
      r2,
      row: prepared[index],
      runDir,
      journalPath,
      runId,
      index,
    })
    completed.push(result)
    console.log(`적용·검증 완료 ${index + 1}/${prepared.length}: ${result.slug}/${result.slot}`)
  }
  await appendJournal(journalPath, { run_id: runId }, {
    event: 'run_complete',
    completed_count: completed.length,
  })
  console.log(`백업: ${runDir}`)
  console.log(`journal: ${journalPath}`)
  return { mode: 'apply', count: completed.length, runDir, journalPath }
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
if (isDirectRun) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
