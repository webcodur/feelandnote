import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  agyCall,
  looksQuotaLimited,
} from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../../../')
const RAW_PATH = path.join(
  REPO_ROOT,
  'data',
  'celeb',
  'viewing-research',
  '2026-09-11-bill-gates-gatesnotes-legacy-book-reviews.json',
)
const OLD_PROGRESS_PATH = path.join(
  REPO_ROOT,
  'sw',
  'web-bo',
  '.tmp-bill-gates-ko-retranslation-20260910',
  'raw-translate',
  'progress.json',
)
const WORK_DIR = path.join(
  REPO_ROOT,
  'sw',
  'web-bo',
  '.tmp-bill-gates-ko-retranslation-20260910',
  'legacy-remaining-translate',
)
const PROGRESS_PATH = path.join(WORK_DIR, 'progress.json')

const BILL_GATES_ID = '1ab7e089-040f-4aa1-b0a1-81dc1dd510d7'
const LEGACY_COUNT = 156
const COMPLETED_RAW_COUNT = 128
const MODEL = 'gemini-3.8-flash-high'
const TIMEOUT_MS = 900_000
const DEFAULT_BATCH_SIZE = 10
const DEFAULT_CONCURRENCY = 10

const args = new Set(process.argv.slice(2))
const countArg = process.argv.find((arg) => arg.startsWith('--count='))
const concurrencyArg = process.argv.find((arg) => arg.startsWith('--concurrency='))
const batchSize = countArg ? Number(countArg.slice('--count='.length)) : DEFAULT_BATCH_SIZE
const concurrency = concurrencyArg
  ? Number(concurrencyArg.slice('--concurrency='.length))
  : DEFAULT_CONCURRENCY
const resume = args.has('--resume')

if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > LEGACY_COUNT) {
  throw new Error(`--count must be an integer from 1 to ${LEGACY_COUNT}`)
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 10) {
  throw new Error('--concurrency must be an integer from 1 to 10')
}

const hash = (value) => crypto.createHash('sha256').update(value ?? '', 'utf8').digest('hex')
const md5 = (value) => crypto.createHash('md5').update(value ?? '', 'utf8').digest('hex')
const asText = (value) => (typeof value === 'string' ? value : '')

function errorMessage(error) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object') {
    return [error.message, error.details, error.hint, error.code]
      .filter((part) => part !== undefined && part !== null && part !== '')
      .map(String)
      .join(' | ')
  }
  return String(error)
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function base64Literal(value) {
  return sqlLiteral(Buffer.from(value ?? '', 'utf8').toString('base64'))
}

function decodedTextSql(value) {
  return `convert_from(decode(${base64Literal(value)}, 'base64'), 'UTF8')`
}

function runPsql(sql) {
  const sshKeyPath = process.env.BILL_GATES_SSH_KEY
  if (!sshKeyPath) throw new Error('BILL_GATES_SSH_KEY is required')

  return new Promise((resolve, reject) => {
    const child = spawn(
      'ssh',
      [
        '-i',
        sshKeyPath,
        '-o',
        'BatchMode=yes',
        '-o',
        'ConnectTimeout=15',
        'ubuntu@152.67.198.197',
        'sudo',
        'docker',
        'exec',
        '-i',
        'supabase-db',
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-X',
        '-q',
        '-v',
        'ON_ERROR_STOP=1',
        '-At',
        '-P',
        'footer=off',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk) => { stderr += chunk.toString() })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`SSH psql exit ${code}: ${(stderr || stdout).slice(0, 2000)}`))
        return
      }
      resolve(stdout.trim())
    })
    child.stdin.end(sql)
  })
}

function loadTargets() {
  const raw = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'))
  if (raw.rows?.length !== LEGACY_COUNT || raw.validation?.fetchedCount !== LEGACY_COUNT) {
    throw new Error(`Legacy raw source count mismatch: ${raw.rows?.length ?? 0}`)
  }
  if (!fs.existsSync(OLD_PROGRESS_PATH)) {
    throw new Error(`Missing completed 128-item progress: ${OLD_PROGRESS_PATH}`)
  }
  const oldProgress = JSON.parse(fs.readFileSync(OLD_PROGRESS_PATH, 'utf8'))
  const completed = new Set(
    (oldProgress.results ?? [])
      .filter((result) => result.status === 'applied')
      .map((result) => result.relationId),
  )
  if (completed.size !== COMPLETED_RAW_COUNT) {
    throw new Error(`The first raw translation phase is not complete: ${completed.size}/${COMPLETED_RAW_COUNT}`)
  }

  const targets = raw.rows
    .filter((row) => !completed.has(row.relationId))
    .map((row, index) => ({
      index: index + 1,
      fullIndex: row.index,
      relationId: row.relationId,
      contentId: row.contentId,
      sourceUrl: asText(row.sourceUrl),
      titleEn: asText(row.titleEn) || asText(row.systemName) || asText(row.sourceUrl),
      reviewEn: asText(row.reviewEn),
      reviewEnHash: hash(asText(row.reviewEn)),
    }))

  if (targets.length !== LEGACY_COUNT - COMPLETED_RAW_COUNT) {
    throw new Error(`Remaining legacy target count mismatch: ${targets.length}`)
  }
  if (targets.some((target) => !target.relationId || !target.contentId || !target.sourceUrl || !target.reviewEn)) {
    throw new Error('Remaining legacy target has an incomplete source row')
  }
  return { raw, targets }
}

async function readCurrent(target) {
  const sql = [
    'SELECT COALESCE((',
    'SELECT row_to_json(item)::text FROM (',
    'SELECT id, celeb_id, content_id, review, review_en, source_url, status, visibility',
    'FROM public.celeb_contents',
    `WHERE id = ${sqlLiteral(target.relationId)}`,
    `AND celeb_id = ${sqlLiteral(BILL_GATES_ID)}`,
    `AND content_id = ${sqlLiteral(target.contentId)}`,
    'LIMIT 1',
    ') AS item',
    "), 'null');",
  ].join(' ')
  const output = await runPsql(sql)
  const current = JSON.parse(output || 'null')
  if (!current) throw new Error(`Relation disappeared: ${target.relationId}`)
  if ((current.source_url ?? null) !== target.sourceUrl) {
    throw new Error(`Source URL changed: ${target.relationId}`)
  }
  if (current.review === '') {
    throw new Error(`Legacy Korean review is unexpectedly blank: ${target.relationId}`)
  }
  return current
}

function makePrompt(target) {
  return [
    'Translate the following complete official Gates Notes review into natural Korean.',
    '',
    'The English text is Bill Gates speaking about a book. Preserve the source voice exactly: when he speaks in the first person, keep first person in Korean. Do not rewrite it as a third-person profile, and do not add "빌 게이츠는" or "그는" as an outside narrator.',
    '',
    'Translate faithfully and completely. Preserve every fact, name, date, book title, quotation, uncertainty, paragraph break, and meaning. Do not summarize, omit, invent, explain, add a heading, or leave English sentences. Keep the Korean readable and idiomatic while retaining Gates’s original tone.',
    '',
    'Return only this wrapper and the complete Korean translation inside it:',
    'BEGIN_REVIEW',
    '<complete Korean translation>',
    'END_REVIEW',
    '',
    `<ENGLISH_GATES_NOTES_REVIEW title="${target.titleEn}">`,
    target.reviewEn,
    '</ENGLISH_GATES_NOTES_REVIEW>',
  ].join('\n')
}

function parseReview(raw, target) {
  const output = asText(raw).replace(/\r\n?/g, '\n').trim()
  const begin = 'BEGIN_REVIEW'
  const end = 'END_REVIEW'
  const beginIndex = output.indexOf(begin)
  const endIndex = output.lastIndexOf(end)
  if (
    beginIndex !== 0 ||
    endIndex < begin.length ||
    output.slice(endIndex + end.length).trim()
  ) {
    throw new Error('agy output did not follow the required wrapper')
  }

  const review = output.slice(begin.length, endIndex).trim()
  if (!review || review.includes('```') || review.includes(begin) || review.includes(end)) {
    throw new Error('agy output is empty or contains formatting markers')
  }
  if (!/[가-힣]/.test(review)) throw new Error('agy output contains no Korean prose')

  const firstSentence = review.split(/[.!?。！？]/, 1)[0].trim()
  if (/^(빌\s*게이츠|그)(?:는|가|이|의|에게|를|로부터)/.test(firstSentence)) {
    throw new Error(`agy output starts in third-person voice: ${firstSentence.slice(0, 80)}`)
  }

  const hangulCount = (review.match(/[가-힣]/g) ?? []).length
  const latinCount = (review.match(/[A-Za-z]/g) ?? []).length
  const minimumHangul = Math.max(50, Math.floor(target.reviewEn.length * 0.05))
  if (hangulCount < minimumHangul) throw new Error('agy output is too short for the source')
  if (latinCount > hangulCount * 1.5) throw new Error('agy output appears mostly untranslated')
  return review
}

async function applyReview(target, current, review) {
  const currentReviewMd5 = md5(current.review)
  const currentEnglishMd5 = md5(current.review_en ?? '')
  const sql = [
    'WITH updated AS (',
    'UPDATE public.celeb_contents',
    `SET review = ${decodedTextSql(review)}, review_en = ${decodedTextSql(target.reviewEn)}`,
    `WHERE id = ${sqlLiteral(target.relationId)}`,
    `AND celeb_id = ${sqlLiteral(BILL_GATES_ID)}`,
    `AND content_id = ${sqlLiteral(target.contentId)}`,
    `AND source_url = ${sqlLiteral(target.sourceUrl)}`,
    `AND md5(convert_to(review, 'UTF8')) = ${sqlLiteral(currentReviewMd5)}`,
    `AND md5(convert_to(COALESCE(review_en, ''), 'UTF8')) = ${sqlLiteral(currentEnglishMd5)}`,
    'RETURNING id, content_id, review, review_en, source_url, status, visibility',
    ')',
    'SELECT COALESCE((',
    'SELECT row_to_json(item)::text FROM (SELECT * FROM updated) AS item',
    "), 'null');",
  ].join(' ')

  const output = await runPsql(sql)
  const updated = JSON.parse(output || 'null')
  if (!updated) throw new Error(`DB update guard did not match: ${target.relationId}`)
  if (updated.review !== review || updated.review_en !== target.reviewEn) {
    throw new Error(`DB update verification failed: ${target.relationId}`)
  }
  if ((updated.source_url ?? null) !== target.sourceUrl) {
    throw new Error(`Source URL changed during update: ${target.relationId}`)
  }
}

function progressScope(raw, targets) {
  return {
    phase: 'legacy-book-remaining-translate',
    celebId: BILL_GATES_ID,
    contentType: 'BOOK',
    targetCount: targets.length,
    model: MODEL,
    rawSnapshot: raw.collectedAt,
    rawSnapshotRowsHash: hash(raw.rows.map((row) => `${row.relationId}:${row.reviewEn}`).join('\n')),
  }
}

function createProgress(raw, targets) {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    scope: progressScope(raw, targets),
    targets: targets.map((target) => ({
      index: target.index,
      fullIndex: target.fullIndex,
      relationId: target.relationId,
      contentId: target.contentId,
      sourceUrl: target.sourceUrl,
      titleEn: target.titleEn,
      reviewEnHash: target.reviewEnHash,
    })),
    results: [],
  }
}

function loadProgress(raw, targets) {
  if (!fs.existsSync(PROGRESS_PATH)) {
    if (resume) throw new Error(`Cannot resume missing progress: ${PROGRESS_PATH}`)
    const progress = createProgress(raw, targets)
    writeJson(PROGRESS_PATH, progress)
    return progress
  }
  if (!resume) throw new Error(`Progress exists; use --resume: ${PROGRESS_PATH}`)
  const progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))
  const expectedScope = progressScope(raw, targets)
  if (JSON.stringify(progress.scope) !== JSON.stringify(expectedScope)) {
    throw new Error('Progress scope does not match the legacy raw source snapshot')
  }
  if (progress.targets?.length !== targets.length) throw new Error('Progress target count mismatch')
  for (const target of targets) {
    const saved = progress.targets[target.index - 1]
    if (
      saved?.relationId !== target.relationId ||
      saved.contentId !== target.contentId ||
      saved.reviewEnHash !== target.reviewEnHash
    ) {
      throw new Error(`Progress target mismatch at index ${target.index}`)
    }
  }
  return progress
}

function saveResult(progress, result) {
  progress.results = [
    ...(progress.results ?? []).filter((item) => item.relationId !== result.relationId),
    result,
  ].sort((a, b) => a.index - b.index)
  writeJson(PROGRESS_PATH, progress)
}

async function processOne(progress, target) {
  try {
    const current = await readCurrent(target)
    const agyOutput = await agyCall(makePrompt(target), {
      model: MODEL,
      timeoutMs: TIMEOUT_MS,
    })
    const review = parseReview(agyOutput, target)
    await applyReview(target, current, review)
    saveResult(progress, {
      index: target.index,
      fullIndex: target.fullIndex,
      relationId: target.relationId,
      contentId: target.contentId,
      titleEn: target.titleEn,
      status: 'applied',
      review,
      reviewHash: hash(review),
      reviewEnHash: target.reviewEnHash,
      finishedAt: new Date().toISOString(),
    })
    console.log(`[legacy-translate] applied ${target.index}/28: ${target.titleEn}`)
    return { status: 'applied' }
  } catch (error) {
    const message = errorMessage(error)
    saveResult(progress, {
      index: target.index,
      fullIndex: target.fullIndex,
      relationId: target.relationId,
      contentId: target.contentId,
      titleEn: target.titleEn,
      status: 'failed',
      reason: looksQuotaLimited(message) ? 'quota_or_rate_limit' : 'call_or_db_error',
      error: message,
      finishedAt: new Date().toISOString(),
    })
    console.error(`[legacy-translate] failed ${target.index}/28: ${target.titleEn}: ${message}`)
    return { status: 'failed' }
  }
}

async function runBatch(progress, pending) {
  let next = 0
  let applied = 0
  let failed = 0

  async function worker() {
    while (true) {
      const index = next
      next += 1
      if (index >= pending.length) return
      const result = await processOne(progress, pending[index])
      if (result.status === 'applied') applied += 1
      else failed += 1
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pending.length) }, () => worker()),
  )
  return { applied, failed }
}

const { raw, targets } = loadTargets()
const progress = loadProgress(raw, targets)
const completed = new Set(
  (progress.results ?? [])
    .filter((result) => result.status === 'applied')
    .map((result) => result.relationId),
)
const pending = targets.filter((target) => !completed.has(target.relationId)).slice(0, batchSize)

if (!pending.length) {
  const applied = targets.filter((target) => completed.has(target.relationId)).length
  console.log(`[legacy-translate] no pending item; progress ${applied}/${targets.length}`)
  if (applied === targets.length) console.log('[legacy-translate] COMPLETE')
  process.exit(0)
}

console.log(
  `[legacy-translate] starting batch ${pending[0].index}-${pending.at(-1).index}` +
    ` (${pending.length} item(s), concurrency ${Math.min(concurrency, pending.length)})`,
)
const batchResult = await runBatch(progress, pending)
const applied = targets.filter((target) => (
  (progress.results ?? []).some(
    (result) => result.relationId === target.relationId && result.status === 'applied',
  )
)).length
const failed = (progress.results ?? []).filter((result) => result.status === 'failed').length
console.log(JSON.stringify({ ...batchResult, progress: `${applied}/${targets.length}`, failedTotal: failed }))
if (applied === targets.length) console.log('[legacy-translate] COMPLETE')
