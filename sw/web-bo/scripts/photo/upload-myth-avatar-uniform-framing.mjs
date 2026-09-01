/** Atomically overwrite the mythology avatars with the reviewed Priam-scale 800px cutouts. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프리아모스-동일크기-재업로드본'
const MANIFEST_FILE = path.join(ROOT, 'manifest.json')
const STATUS_FILE = path.join(ROOT, '재업로드-상태.json')
const EVIDENCE = `fiction:${MANIFEST_FILE}`
const SOURCE_NOTE = '신화 인물 초상화의 얼굴을 프리아모스 기준 눈 46퍼센트·턱 81퍼센트로 통일한 배경 제거 제작본'
const TSX = path.resolve('node_modules', 'tsx', 'dist', 'cli.mjs')
const UPLOADER = path.resolve('scripts', 'avatar', 'upload.ts')

function loadEnv(file) {
  const values = { ...process.env }
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

const argv = process.argv.slice(2)
const get = (flag) => {
  const index = argv.indexOf(flag)
  return index >= 0 ? argv[index + 1] : undefined
}
const concurrency = Number(get('--concurrency') ?? 3)
const retryFailedOnly = argv.includes('--retry-failed-only')
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 3) {
  throw new Error(`--concurrency must be 1..3: ${concurrency}`)
}

const env = loadEnv(path.resolve('.env'))
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment')
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const manifest = JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
const rows = manifest.rows
if (!Array.isArray(rows) || rows.length !== 200) {
  throw new Error(`Expected 200 rows, got ${rows?.length}`)
}

const profiles = []
for (let start = 0; start < rows.length; start += 100) {
  const { data, error } = await supabase
    .from('celebs')
    .select('id,slug,nickname,celeb_tier')
    .in('id', rows.slice(start, start + 100).map((row) => row.target_id))
  if (error) throw new Error(`Target query failed: ${error.message}`)
  profiles.push(...(data ?? []))
}
const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
for (const row of rows) {
  const profile = profileById.get(row.target_id)
  if (
    !profile ||
    profile.slug !== row.slug ||
    profile.nickname !== row.name_ko ||
    profile.celeb_tier !== 'fiction'
  ) throw new Error(`Unsafe target identity: ${row.slug}`)
  if (!existsSync(row.corrected_file)) throw new Error(`Missing corrected file: ${row.corrected_file}`)
}

let selected = rows
if (retryFailedOnly) {
  if (!existsSync(STATUS_FILE)) throw new Error('No prior status file for retry')
  const prior = JSON.parse(readFileSync(STATUS_FILE, 'utf8'))
  const failedIds = new Set(prior.results.filter((row) => row.status === 'failed').map((row) => row.target_id))
  selected = rows.filter((row) => failedIds.has(row.target_id))
}

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
        selected_count: selected.length,
        completed,
        succeeded: results.filter((row) => row.status === 'uploaded').length,
        failed: results.filter((row) => row.status === 'failed').length,
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
    const child = spawn(
      process.execPath,
      [
        TSX,
        UPLOADER,
        '--celeb-id', row.target_id,
        '--slug', row.slug,
        '--image-file', row.corrected_file,
        '--source-note', SOURCE_NOTE,
        '--identity-evidence', EVIDENCE,
        '--face-detect', 'false',
        '--crop-gravity', 'center',
        '--size', '800',
        '--quality', '95',
        '--preview-path', row.corrected_file,
      ],
      { cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', (error) => resolve({ status: 'failed', error: error.message }))
    child.on('close', (code) => {
      if (code === 0) resolve({ status: 'uploaded' })
      else resolve({ status: 'failed', exit_code: code, error: (stderr || stdout).slice(-4000) })
    })
  })
}

async function worker() {
  while (true) {
    const index = nextIndex++
    if (index >= selected.length) return
    const row = selected[index]
    const result = await uploadOne(row)
    results.push({ target_id: row.target_id, slug: row.slug, name_ko: row.name_ko, ...result })
    completed += 1
    saveStatus()
    console.log(
      `UPLOAD_PROGRESS ${completed}/${selected.length} ok=${results.filter((item) => item.status === 'uploaded').length} failed=${results.filter((item) => item.status === 'failed').length} slug=${row.slug}`,
    )
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, selected.length) }, () => worker()))
const failed = results.filter((row) => row.status === 'failed')
manifest.applied_to_db_or_storage = failed.length === 0 && selected.length === rows.length
manifest.uploaded_at = new Date().toISOString()
writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ selected: selected.length, uploaded: selected.length - failed.length, failed }, null, 2))
if (failed.length) process.exit(1)
