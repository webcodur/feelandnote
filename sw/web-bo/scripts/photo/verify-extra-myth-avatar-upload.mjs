/** Verify DB, R2 main/small objects, transparency, and local-preview identity for the extra mythology avatars. */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import {
  CELEB_AVATAR_SMALL,
  celebAvatarSmallUrl,
} from '@feelandnote/shared/constants/celeb-avatar-small'

const OUTPUT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-추가-3명-업로드본'
const MANIFEST_FILE = path.join(OUTPUT, 'manifest.json')
const PREVIEW_DIR = path.join(OUTPUT, '05-업로드-800-WebP')
const REPORT_FILE = path.join(OUTPUT, '04-검수', '업로드-검증.json')

function loadEnv(file) {
  const values = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator < 0) continue
    const key = trimmed.slice(0, separator).trim()
    let value = trimmed.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    values[key] = value
  }
  return values
}

const env = loadEnv(path.resolve('.env'))
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase environment')

const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
const rows = manifest.rows
if (!Array.isArray(rows) || rows.length !== 3) {
  throw new Error(`Expected 3 manifest rows, got ${rows?.length}`)
}

const supabase = createClient(supabaseUrl, serviceKey)
const { data: profiles, error } = await supabase
  .from('celebs')
  .select('id,slug,nickname,avatar_url')
  .in('id', rows.map((row) => row.target_id))
if (error) throw new Error(`Verification query failed: ${error.message}`)
const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')

const results = await Promise.all(
  rows.map(async (row) => {
    const profile = profileById.get(row.target_id)
    if (
      !profile ||
      profile.slug !== row.slug ||
      profile.nickname !== row.name_ko ||
      !profile.avatar_url
    ) {
      return {
        slug: row.slug,
        name_ko: row.name_ko,
        ok: false,
        error: 'DB identity or avatar URL mismatch',
      }
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
      const [mainMeta, mainStats, smallMeta] = await Promise.all([
        sharp(mainBytes).metadata(),
        sharp(mainBytes).stats(),
        sharp(smallBytes).metadata(),
      ])
      const previewFile = path.join(PREVIEW_DIR, `${row.name_ko}.webp`)
      const previewPresent = existsSync(previewFile)
      const byteMatch =
        previewPresent && sha256(readFileSync(previewFile)) === sha256(mainBytes)
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

      return {
        slug: row.slug,
        name_ko: row.name_ko,
        avatar_url: profile.avatar_url,
        ok: validMain && validSmall && byteMatch,
        main: {
          status: mainResponse.status,
          bytes: mainBytes.length,
          width: mainMeta.width,
          height: mainMeta.height,
          has_alpha: mainMeta.hasAlpha,
          is_opaque: mainStats.isOpaque,
        },
        small: {
          status: smallResponse.status,
          bytes: smallBytes.length,
          width: smallMeta.width,
          height: smallMeta.height,
        },
        local_preview_present: previewPresent,
        remote_matches_local_preview: byteMatch,
      }
    } catch (caught) {
      return {
        slug: row.slug,
        name_ko: row.name_ko,
        ok: false,
        error: caught instanceof Error ? caught.message : String(caught),
      }
    }
  }),
)

const failed = results.filter((row) => !row.ok)
const report = {
  verified_at: new Date().toISOString(),
  target_count: rows.length,
  db_avatar_present_count: rows.filter((row) => profileById.get(row.target_id)?.avatar_url).length,
  local_preview_count: readdirSync(PREVIEW_DIR).filter((name) => name.endsWith('.webp')).length,
  remote_main_ok_count: results.filter((row) => row.main?.status === 200).length,
  remote_small_ok_count: results.filter((row) => row.small?.status === 200).length,
  remote_matches_local_preview_count: results.filter((row) => row.remote_matches_local_preview).length,
  passed_count: results.length - failed.length,
  failed_count: failed.length,
  failed,
  rows: results,
}
writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')

manifest.applied_to_db_or_storage = failed.length === 0
manifest.upload_verified_at = report.verified_at
manifest.upload_verification_report = REPORT_FILE
writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

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
      report: REPORT_FILE,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
