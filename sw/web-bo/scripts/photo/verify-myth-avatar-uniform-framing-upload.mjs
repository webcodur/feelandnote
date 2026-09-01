/** Verify all Priam-scale mythology avatar replacements in DB and on the public CDN. */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import {
  CELEB_AVATAR_SMALL,
  celebAvatarSmallUrl,
} from '@feelandnote/shared/constants/celeb-avatar-small'

const ROOT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프리아모스-동일크기-재업로드본'
const MANIFEST_FILE = path.join(ROOT, 'manifest.json')
const REPORT_FILE = path.join(ROOT, '02-검수', '재업로드-검증.json')
const CONCURRENCY = 10

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
    ) value = value.slice(1, -1)
    values[key] = value
  }
  return values
}

const env = loadEnv(path.resolve('.env'))
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment')
}
const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
const rows = manifest.rows
if (!Array.isArray(rows) || rows.length !== 200) throw new Error(`Expected 200 rows, got ${rows?.length}`)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const profiles = []
for (let start = 0; start < rows.length; start += 100) {
  const { data, error } = await supabase
    .from('celebs')
    .select('id,slug,nickname,avatar_url')
    .in('id', rows.slice(start, start + 100).map((row) => row.target_id))
  if (error) throw new Error(`Verification query failed: ${error.message}`)
  profiles.push(...(data ?? []))
}
const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const results = new Array(rows.length)
let nextIndex = 0

async function worker() {
  while (true) {
    const index = nextIndex++
    if (index >= rows.length) return
    const row = rows[index]
    const profile = profileById.get(row.target_id)
    if (
      !profile ||
      profile.slug !== row.slug ||
      profile.nickname !== row.name_ko ||
      !profile.avatar_url
    ) {
      results[index] = { slug: row.slug, name_ko: row.name_ko, ok: false, error: 'DB mismatch' }
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
      const [mainMeta, mainStats, smallMeta] = await Promise.all([
        sharp(mainBytes).metadata(),
        sharp(mainBytes).stats(),
        sharp(smallBytes).metadata(),
      ])
      const byteMatch = sha256(readFileSync(row.corrected_file)) === sha256(mainBytes)
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
        remote_matches_local: byteMatch,
      }
    } catch (error) {
      results[index] = {
        slug: row.slug,
        name_ko: row.name_ko,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()))
const failed = results.filter((row) => !row.ok)
const report = {
  verified_at: new Date().toISOString(),
  target_count: rows.length,
  db_avatar_present_count: rows.filter((row) => profileById.get(row.target_id)?.avatar_url).length,
  remote_main_ok_count: results.filter((row) => row.main?.status === 200).length,
  remote_small_ok_count: results.filter((row) => row.small?.status === 200).length,
  remote_matches_local_count: results.filter((row) => row.remote_matches_local).length,
  passed_count: results.length - failed.length,
  failed_count: failed.length,
  failed,
  rows: results,
}
writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
manifest.upload_verified_at = report.verified_at
manifest.upload_verification_report = REPORT_FILE
manifest.applied_to_db_or_storage = failed.length === 0
writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(
  JSON.stringify(
    {
      target_count: report.target_count,
      db_avatar_present_count: report.db_avatar_present_count,
      remote_main_ok_count: report.remote_main_ok_count,
      remote_small_ok_count: report.remote_small_ok_count,
      remote_matches_local_count: report.remote_matches_local_count,
      passed_count: report.passed_count,
      failed_count: report.failed_count,
      report: REPORT_FILE,
    },
    null,
    2,
  ),
)
if (failed.length) process.exit(1)
