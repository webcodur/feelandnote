import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../../../')
const FULL_RAW_PATH = path.join(
  REPO_ROOT,
  'data',
  'celeb',
  'viewing-research',
  '2026-09-11-bill-gates-gatesnotes-legacy-book-reviews.json',
)
const RAW_128_PATH = path.join(
  REPO_ROOT,
  'data',
  'celeb',
  'viewing-research',
  '2026-09-11-bill-gates-gatesnotes-raw-book-reviews.json',
)
const RAW_PROGRESS_PATH = path.join(
  REPO_ROOT,
  'sw',
  'web-bo',
  '.tmp-bill-gates-ko-retranslation-20260910',
  'raw-translate',
  'progress.json',
)
const LEGACY_PROGRESS_PATH = path.join(
  REPO_ROOT,
  'sw',
  'web-bo',
  '.tmp-bill-gates-ko-retranslation-20260910',
  'legacy-remaining-translate',
  'progress.json',
)

const BILL_GATES_ID = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
const LEGACY_COUNT = 156
const RAW_COUNT = 128

const hash = (value) => crypto.createHash('sha256').update(value ?? '', 'utf8').digest('hex')

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function runPsql(sql) {
  const sshKeyPath = process.env.BILL_GATES_SSH_KEY
  if (!sshKeyPath) throw new Error('BILL_GATES_SSH_KEY is required')

  return new Promise((resolve, reject) => {
    const child = spawn(
      'ssh',
      [
        '-i', sshKeyPath,
        '-o', 'BatchMode=yes',
        '-o', 'ConnectTimeout=15',
        'ubuntu@152.67.198.197',
        'sudo', 'docker', 'exec', '-i', 'supabase-db',
        'psql', '-U', 'postgres', '-d', 'postgres',
        '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-At', '-P', 'footer=off',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )
    const stdoutChunks = []
    const stderrChunks = []
    child.stdout.on('data', (chunk) => { stdoutChunks.push(chunk) })
    child.stderr.on('data', (chunk) => { stderrChunks.push(chunk) })
    child.on('error', reject)
    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks).toString('utf8')
      const stderr = Buffer.concat(stderrChunks).toString('utf8')
      if (code !== 0) {
        reject(new Error(`SSH psql exit ${code}: ${(stderr || stdout).slice(0, 2000)}`))
        return
      }
      resolve(stdout.trim())
    })
    child.stdin.end(sql)
  })
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function loadExpected() {
  const fullRaw = loadJson(FULL_RAW_PATH)
  const raw128 = loadJson(RAW_128_PATH)
  const rawProgress = loadJson(RAW_PROGRESS_PATH)
  const legacyProgress = loadJson(LEGACY_PROGRESS_PATH)

  if (fullRaw.rows?.length !== LEGACY_COUNT || fullRaw.validation?.fetchedCount !== LEGACY_COUNT) {
    throw new Error('Full legacy raw dataset is not 156 rows')
  }
  if (raw128.rows?.length !== RAW_COUNT || raw128.validation?.fetchedCount !== RAW_COUNT) {
    throw new Error('First raw dataset is not 128 rows')
  }

  const raw128ById = new Map(raw128.rows.map((row) => [row.relationId, row]))
  const fullById = new Map(fullRaw.rows.map((row) => [row.relationId, row]))
  const results = [
    ...(rawProgress.results ?? []).filter((result) => result.status === 'applied'),
    ...(legacyProgress.results ?? []).filter((result) => result.status === 'applied'),
  ]
  const resultById = new Map(results.map((result) => [result.relationId, result]))
  if (rawProgress.results?.some((result) => result.status === 'failed')) {
    throw new Error('First translation progress contains failed results')
  }
  if (legacyProgress.results?.some((result) => result.status === 'failed')) {
    throw new Error('Legacy remaining progress contains failed results')
  }
  if (rawProgress.results?.filter((result) => result.status === 'applied').length !== RAW_COUNT) {
    throw new Error('First translation progress is not 128/128')
  }
  if (legacyProgress.results?.filter((result) => result.status === 'applied').length !== LEGACY_COUNT - RAW_COUNT) {
    throw new Error('Legacy remaining progress is not 28/28')
  }
  if (resultById.size !== LEGACY_COUNT) {
    throw new Error(`Combined applied result count is not 156: ${resultById.size}`)
  }

  const expected = new Map()
  for (const row of fullRaw.rows) {
    const firstPhaseRow = raw128ById.get(row.relationId)
    const result = resultById.get(row.relationId)
    if (!result) throw new Error(`Missing translation result: ${row.relationId}`)
    const english = firstPhaseRow?.reviewEn ?? row.reviewEn
    if (result.reviewEnHash !== hash(english)) {
      throw new Error(`Translation result English hash mismatch: ${row.relationId}`)
    }
    expected.set(row.relationId, {
      relationId: row.relationId,
      contentId: row.contentId,
      sourceUrl: row.sourceUrl,
      reviewEn: english,
      reviewEnHash: hash(english),
      review: result.review,
      reviewHash: hash(result.review),
    })
  }
  return { fullRaw, expected }
}

async function readDb(expected) {
  const ids = [...expected.keys()].map(sqlLiteral).join(', ')
  const sql = [
    'SELECT COALESCE(json_agg(row_to_json(item) ORDER BY item.id), \'[]\'::json)::text',
    'FROM (',
    'SELECT cc.id, cc.celeb_id, cc.content_id, cc.review, cc.review_en, cc.source_url, cc.status, cc.visibility, c.type',
    'FROM public.celeb_contents cc',
    'JOIN public.contents c ON c.id = cc.content_id',
    `WHERE cc.celeb_id = ${sqlLiteral(BILL_GATES_ID)}`,
    `AND cc.id IN (${ids})`,
    ') AS item;',
  ].join(' ')
  const rows = JSON.parse((await runPsql(sql)) || '[]')
  return new Map(rows.map((row) => [row.id, row]))
}

async function readNonTargetCounts(expected) {
  const ids = [...expected.keys()].map(sqlLiteral).join(', ')
  const sql = [
    'SELECT c.type, count(*)::int',
    'FROM public.celeb_contents cc',
    'JOIN public.contents c ON c.id = cc.content_id',
    `WHERE cc.celeb_id = ${sqlLiteral(BILL_GATES_ID)}`,
    `AND cc.id NOT IN (${ids})`,
    'GROUP BY c.type ORDER BY c.type;',
  ].join(' ')
  const output = await runPsql(sql)
  return output
    ? output.split('\n').filter(Boolean).map((line) => {
      const [type, count] = line.split('|')
      return { type, count: Number(count) }
    })
    : []
}

const { fullRaw, expected } = loadExpected()
const current = await readDb(expected)
const mismatches = []
const thirdPersonLeads = []
const emptyKorean = []
for (const [relationId, target] of expected) {
  const row = current.get(relationId)
  if (!row) {
    mismatches.push({ relationId, issue: 'missing_relation' })
    continue
  }
  if (row.celeb_id !== BILL_GATES_ID) mismatches.push({ relationId, issue: 'celeb_id' })
  if (row.content_id !== target.contentId) mismatches.push({ relationId, issue: 'content_id' })
  if (row.source_url !== target.sourceUrl) mismatches.push({ relationId, issue: 'source_url' })
  if (row.review_en !== target.reviewEn) mismatches.push({ relationId, issue: 'review_en' })
  if (!row.review) emptyKorean.push(relationId)
  if (row.review && /^(빌\s*게이츠|그)(?:는|가|이|의|에게|를|로부터)/.test(row.review.split(/[.!?。！？]/, 1)[0].trim())) {
    thirdPersonLeads.push(relationId)
  }
  if (row.review && hash(row.review) !== target.reviewHash) {
    mismatches.push({
      relationId,
      issue: 'review_vs_agy_result',
      expectedHash: target.reviewHash,
      actualHash: hash(row.review),
      expectedLength: target.review.length,
      actualLength: row.review.length,
    })
  }
}

const nonTargetCounts = await readNonTargetCounts(expected)
const result = {
  legacyRawRows: fullRaw.rows.length,
  dbRowsRead: current.size,
  reviewEnMatchesExpectedRaw: mismatches.filter((item) => item.issue === 'review_en').length === 0,
  koreanReviewNonempty: emptyKorean.length === 0,
  koreanReviewMatchesAppliedAgyResult: mismatches.filter((item) => item.issue === 'review_vs_agy_result').length === 0,
  sourceAndRelationMismatches: mismatches.filter((item) => ['missing_relation', 'celeb_id', 'content_id', 'source_url'].includes(item.issue)),
  reviewEnMismatches: mismatches.filter((item) => item.issue === 'review_en'),
  koreanReviewMismatches: mismatches.filter((item) => item.issue === 'review_vs_agy_result'),
  thirdPersonLeadCount: thirdPersonLeads.length,
  emptyKoreanCount: emptyKorean.length,
  nonTargetCounts,
}
console.log(JSON.stringify(result, null, 2))
if (
  current.size !== LEGACY_COUNT ||
  mismatches.length ||
  emptyKorean.length ||
  thirdPersonLeads.length ||
  JSON.stringify(nonTargetCounts) !== JSON.stringify([
    { type: 'BOOK', count: 21 },
    { type: 'GAME', count: 5 },
    { type: 'MUSIC', count: 73 },
    { type: 'VIDEO', count: 13 },
  ])
) {
  process.exitCode = 1
}
