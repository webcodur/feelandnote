/** Read-only audit of the 198 mythology avatar targets immediately before upload. */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SET =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-업로드본-한국이름'
const MANIFEST_FILE = path.join(SET, 'manifest.json')
const REPORT_FILE = path.join(SET, '업로드-직전-DB-감사.json')

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
    .select('id,slug,nickname,celeb_tier,publication_status,avatar_url')
    .in('id', ids)
  if (error) throw new Error(`Target audit query failed: ${error.message}`)
  profiles.push(...(data ?? []))
}

const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
const audited = rows.map((row) => {
  const profile = profileById.get(row.target_id)
  return {
    target_id: row.target_id,
    slug: row.slug,
    name_ko: row.name_ko,
    db_found: Boolean(profile),
    identity_match: Boolean(profile && profile.slug === row.slug && profile.nickname === row.name_ko),
    celeb_tier: profile?.celeb_tier ?? null,
    publication_status: profile?.publication_status ?? null,
    current_avatar_url: profile?.avatar_url ?? null,
  }
})

const report = {
  audited_at: new Date().toISOString(),
  read_only: true,
  target_count: rows.length,
  db_found_count: audited.filter((row) => row.db_found).length,
  identity_match_count: audited.filter((row) => row.identity_match).length,
  fiction_count: audited.filter((row) => row.celeb_tier === 'fiction').length,
  avatar_null_count: audited.filter((row) => row.db_found && !row.current_avatar_url).length,
  avatar_present_count: audited.filter((row) => Boolean(row.current_avatar_url)).length,
  missing: audited.filter((row) => !row.db_found),
  identity_mismatches: audited.filter((row) => row.db_found && !row.identity_match),
  non_fiction: audited.filter((row) => row.db_found && row.celeb_tier !== 'fiction'),
  avatar_present: audited.filter((row) => Boolean(row.current_avatar_url)),
  rows: audited,
}

writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
console.log(
  JSON.stringify(
    {
      target_count: report.target_count,
      db_found_count: report.db_found_count,
      identity_match_count: report.identity_match_count,
      fiction_count: report.fiction_count,
      avatar_null_count: report.avatar_null_count,
      avatar_present_count: report.avatar_present_count,
      missing_count: report.missing.length,
      mismatch_count: report.identity_mismatches.length,
      non_fiction_count: report.non_fiction.length,
      avatar_present: report.avatar_present.map((row) => ({ slug: row.slug, name_ko: row.name_ko })),
      report: REPORT_FILE,
    },
    null,
    2,
  ),
)
