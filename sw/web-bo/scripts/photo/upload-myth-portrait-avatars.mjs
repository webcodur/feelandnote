/** Upload only currently empty mythology avatars from the approved Korean cutout set. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const SET =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-업로드본-한국이름'
const MANIFEST_FILE = path.join(SET, 'manifest.json')
const INPUT_DIR = path.join(SET, '03-누끼-WebP')
const PREVIEW_DIR = path.join(SET, '05-업로드-800-WebP')
const STATUS_FILE = path.join(SET, '업로드-상태.json')
const EVIDENCE =
  'fiction:D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\portrait-prompts.json'
const SOURCE_NOTE = '신화 인물별 승인 초상화를 배경 제거 후 중앙 정사각형으로 보존한 제작본'
const TSX = path.resolve('node_modules', 'tsx', 'dist', 'cli.mjs')
const UPLOADER = path.resolve('scripts', 'avatar', 'upload.ts')

const argv = process.argv.slice(2)
const get = (flag) => {
  const index = argv.indexOf(flag)
  return index >= 0 ? argv[index + 1] : undefined
}
const concurrency = Number(get('--concurrency') ?? 3)
const dryRun = argv.includes('--dry-run')
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3) {
  throw new Error(`--concurrency must be an integer from 1 to 3: ${concurrency}`)
}
if (!existsSync(TSX) || !existsSync(UPLOADER)) throw new Error('Missing local tsx or avatar uploader')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Missing Supabase environment')
const supabase = createClient(url, key)

const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
const rows = manifest.rows
if (!Array.isArray(rows) || rows.length !== 198) throw new Error(`Expected 198 manifest rows, got ${rows?.length}`)
mkdirSync(PREVIEW_DIR, { recursive: true })

async function fetchProfiles() {
  const profiles = []
  for (let start = 0; start < rows.length; start += 100) {
    const ids = rows.slice(start, start + 100).map((row) => row.target_id)
    const { data, error } = await supabase
      .from('celebs')
      .select('id,slug,nickname,celeb_tier,avatar_url')
      .in('id', ids)
    if (error) throw new Error(`Target query failed: ${error.message}`)
    profiles.push(...(data ?? []))
  }
  return profiles
}

const profiles = await fetchProfiles()
const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
for (const row of rows) {
  const profile = profileById.get(row.target_id)
  if (!profile || profile.slug !== row.slug || profile.nickname !== row.name_ko || profile.celeb_tier !== 'fiction') {
    throw new Error(`Unsafe target identity: ${row.slug}`)
  }
  const input = path.join(INPUT_DIR, `${row.name_ko}.webp`)
  if (!existsSync(input)) throw new Error(`Missing approved cutout: ${input}`)
}

const pending = rows.filter((row) => !profileById.get(row.target_id)?.avatar_url)
const skipped = rows.filter((row) => Boolean(profileById.get(row.target_id)?.avatar_url))
console.log(
  JSON.stringify(
    {
      target_count: rows.length,
      pending_count: pending.length,
      existing_avatar_skipped: skipped.map((row) => row.slug),
      concurrency,
      dry_run: dryRun,
      input: INPUT_DIR,
      preview: PREVIEW_DIR,
    },
    null,
    2,
  ),
)
if (dryRun) process.exit(0)

const results = []
let nextIndex = 0
let completed = 0

function saveStatus() {
  writeFileSync(
    STATUS_FILE,
    `${JSON.stringify(
      {
        updated_at: new Date().toISOString(),
        target_count: rows.length,
        selected_count: pending.length,
        completed,
        succeeded: results.filter((row) => row.status === 'uploaded').length,
        failed: results.filter((row) => row.status === 'failed').length,
        skipped_existing: skipped.map((row) => row.slug),
        results,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
}

function uploadOne(row) {
  return new Promise((resolve) => {
    const input = path.join(INPUT_DIR, `${row.name_ko}.webp`)
    const preview = path.join(PREVIEW_DIR, `${row.name_ko}.webp`)
    const child = spawn(
      process.execPath,
      [
        TSX,
        UPLOADER,
        '--celeb-id',
        row.target_id,
        '--slug',
        row.slug,
        '--image-file',
        input,
        '--source-note',
        SOURCE_NOTE,
        '--identity-evidence',
        EVIDENCE,
        '--face-detect',
        'false',
        '--crop-gravity',
        'center',
        '--size',
        '800',
        '--quality',
        '95',
        '--preview-path',
        preview,
      ],
      { cwd: process.cwd(), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', (error) => resolve({ status: 'failed', error: error.message }))
    child.on('close', (code) => {
      if (code === 0) resolve({ status: 'uploaded', preview })
      else resolve({ status: 'failed', exit_code: code, error: (stderr || stdout).slice(-4000) })
    })
  })
}

async function worker() {
  while (true) {
    const index = nextIndex
    nextIndex += 1
    if (index >= pending.length) return
    const row = pending[index]
    const result = await uploadOne(row)
    results.push({ target_id: row.target_id, slug: row.slug, name_ko: row.name_ko, ...result })
    completed += 1
    saveStatus()
    console.log(
      `UPLOAD_PROGRESS ${completed}/${pending.length} ok=${results.filter((item) => item.status === 'uploaded').length} failed=${results.filter((item) => item.status === 'failed').length} slug=${row.slug} status=${result.status}`,
    )
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()))

const freshProfiles = await fetchProfiles()
const freshById = new Map(freshProfiles.map((profile) => [profile.id, profile]))
const remainingNull = rows.filter((row) => !freshById.get(row.target_id)?.avatar_url)
const failed = results.filter((row) => row.status === 'failed')
console.log(
  JSON.stringify(
    {
      selected: pending.length,
      uploaded: results.length - failed.length,
      failed: failed.length,
      failed_slugs: failed.map((row) => row.slug),
      remaining_null: remainingNull.map((row) => row.slug),
      status_file: STATUS_FILE,
    },
    null,
    2,
  ),
)
if (failed.length > 0 || remainingNull.length > 0) process.exit(1)
