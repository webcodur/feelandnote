/** Verify the uploaded mythology avatar body and small files against DB and local previews. */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { CELEB_AVATAR_SMALL, celebAvatarSmallUrl } from '@feelandnote/shared/constants/celeb-avatar-small'

const SET =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-업로드본-한국이름'
const MANIFEST_FILE = path.join(SET, 'manifest.json')
const PREVIEW_DIR = path.join(SET, '05-업로드-800-WebP')
const REPORT_FILE = path.join(SET, '업로드-검증.json')
const CONCURRENCY = 10

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
const rows = manifest.rows
if (!Array.isArray(rows) || rows.length !== 198) throw new Error(`Expected 198 manifest rows, got ${rows?.length}`)

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing Supabase environment')
const supabase = createClient(url, key)

const profiles = []
for (let start = 0; start < rows.length; start += 100) {
  const ids = rows.slice(start, start + 100).map((row) => row.target_id)
  const { data, error } = await supabase
    .from('celebs')
    .select('id,slug,nickname,avatar_url')
    .in('id', ids)
  if (error) throw new Error(`Verification query failed: ${error.message}`)
  profiles.push(...(data ?? []))
}
const profileById = new Map(profiles.map((profile) => [profile.id, profile]))

const results = new Array(rows.length)
let nextIndex = 0
async function worker() {
  while (true) {
    const index = nextIndex
    nextIndex += 1
    if (index >= rows.length) return
    const row = rows[index]
    const profile = profileById.get(row.target_id)
    if (!profile || profile.slug !== row.slug || profile.nickname !== row.name_ko || !profile.avatar_url) {
      results[index] = { slug: row.slug, ok: false, error: 'DB identity or avatar URL mismatch' }
      continue
    }

    try {
      const [mainResponse, smallResponse] = await Promise.all([
        fetch(profile.avatar_url, { cache: 'no-store' }),
        fetch(celebAvatarSmallUrl(profile.avatar_url), { cache: 'no-store' }),
      ])
      if (!mainResponse.ok || !smallResponse.ok) {
        throw new Error(`HTTP main=${mainResponse.status} small=${smallResponse.status}`)
      }
      const [mainBytes, smallBytes] = await Promise.all([
        Buffer.from(await mainResponse.arrayBuffer()),
        Buffer.from(await smallResponse.arrayBuffer()),
      ])
      const [mainMeta, smallMeta, mainStats] = await Promise.all([
        sharp(mainBytes).metadata(),
        sharp(smallBytes).metadata(),
        sharp(mainBytes).stats(),
      ])

      const preview = path.join(PREVIEW_DIR, `${row.name_ko}.webp`)
      const hasPreview = existsSync(preview)
      const byteMatch = hasPreview ? sha256(readFileSync(preview)) === sha256(mainBytes) : row.slug === 'prometheus'
      const validMain =
        mainMeta.format === 'webp' &&
        mainMeta.width === 800 &&
        mainMeta.height === 800 &&
        mainMeta.hasAlpha === true &&
        mainStats.isOpaque === false
      const validSmall =
        smallMeta.format === 'webp' &&
        smallMeta.width === CELEB_AVATAR_SMALL.sizePx &&
        smallMeta.height === CELEB_AVATAR_SMALL.sizePx

      results[index] = {
        slug: row.slug,
        name_ko: row.name_ko,
        ok: validMain && validSmall && byteMatch,
        main: {
          status: mainResponse.status,
          content_type: mainResponse.headers.get('content-type'),
          bytes: mainBytes.length,
          width: mainMeta.width,
          height: mainMeta.height,
          has_alpha: mainMeta.hasAlpha,
          is_opaque: mainStats.isOpaque,
        },
        small: {
          status: smallResponse.status,
          content_type: smallResponse.headers.get('content-type'),
          bytes: smallBytes.length,
          width: smallMeta.width,
          height: smallMeta.height,
        },
        local_preview_present: hasPreview,
        remote_matches_local_preview: byteMatch,
      }
    } catch (error) {
      results[index] = { slug: row.slug, name_ko: row.name_ko, ok: false, error: error.message }
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
const previewCount = readdirSync(PREVIEW_DIR).filter((name) => name.toLowerCase().endsWith('.webp')).length
const failed = results.filter((row) => !row.ok)
const report = {
  verified_at: new Date().toISOString(),
  target_count: rows.length,
  db_avatar_present_count: rows.filter((row) => Boolean(profileById.get(row.target_id)?.avatar_url)).length,
  local_preview_count: previewCount,
  remote_main_ok_count: results.filter((row) => row.main?.status === 200).length,
  remote_small_ok_count: results.filter((row) => row.small?.status === 200).length,
  remote_matches_local_preview_count: results.filter((row) => row.remote_matches_local_preview).length,
  passed_count: results.length - failed.length,
  failed_count: failed.length,
  failed,
  rows: results,
}
writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(
  JSON.stringify(
    {
      target_count: report.target_count,
      db_avatar_present_count: report.db_avatar_present_count,
      local_preview_count: report.local_preview_count,
      remote_main_ok_count: report.remote_main_ok_count,
      remote_small_ok_count: report.remote_small_ok_count,
      remote_matches_local_preview_count: report.remote_matches_local_preview_count,
      passed_count: report.passed_count,
      failed_count: report.failed_count,
      failed_slugs: failed.map((row) => row.slug),
      report: REPORT_FILE,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
