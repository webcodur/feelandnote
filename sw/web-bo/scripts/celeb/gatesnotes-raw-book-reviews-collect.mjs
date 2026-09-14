import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(path.join(process.cwd(), 'sw', 'web', 'package.json'))
const { load } = require('cheerio')

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../../../')
const BACKUP_PATH = path.join(
  REPO_ROOT,
  'data',
  'celeb',
  '_backup',
  'bill-gates-korean-review-before-retranslation-20260910.json',
)
const DEFAULT_OUTPUT = path.join(
  REPO_ROOT,
  'data',
  'celeb',
  'viewing-research',
  '2026-09-11-bill-gates-gatesnotes-raw-book-reviews.json',
)

const PROJECT_ID = '12514eb8-7b51-008e-41a9-512542cf683b'
const CONTENT_API = `https://content.gatesnotes.com/${PROJECT_ID}`
const EXPECTED_COUNT = 128
const LEGACY_EXPECTED_COUNT = 156
const CONCURRENCY = 8
const MAX_ATTEMPTS = 4

const outputArg = process.argv.find((arg) => arg.startsWith('--output='))
const collectAllLegacy = process.argv.includes('--legacy-all')
const targetCount = collectAllLegacy ? LEGACY_EXPECTED_COUNT : EXPECTED_COUNT
const outputPath = outputArg
  ? path.resolve(outputArg.slice('--output='.length))
  : DEFAULT_OUTPUT

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex')
}

function normalizeSourceUrl(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function getTargetRows() {
  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'))
  const rows = backup.rows.filter((row) => {
    const content = Array.isArray(row.content) ? row.content[0] : row.content
    const locales = content?.content_locales ?? []
    return (
      (collectAllLegacy || locales.some((locale) => locale.locale === 'ko')) &&
      typeof row.review === 'string' &&
      row.review.trim() &&
      typeof row.review_en === 'string' &&
      row.review_en.trim() &&
      normalizeSourceUrl(row.source_url)
    )
  })

  if (rows.length !== targetCount) {
    throw new Error(`Target count mismatch: ${rows.length} (expected ${targetCount})`)
  }

  return rows.map((row, index) => {
    const content = Array.isArray(row.content) ? row.content[0] : row.content
    const locales = content?.content_locales ?? []
    const en = locales.find((locale) => locale.locale === 'en')
    const ko = locales.find((locale) => locale.locale === 'ko')
    return {
      index: index + 1,
      relationId: row.id,
      contentId: row.content_id,
      sourceUrl: normalizeSourceUrl(row.source_url),
      titleEn: en?.title ?? '',
      titleKo: ko?.title ?? '',
      creatorEn: en?.creator ?? '',
    }
  })
}

function sourceSlug(sourceUrl) {
  const pathname = new URL(sourceUrl).pathname.replace(/\/+$/, '')
  const slug = pathname.split('/').at(-1)
  if (!slug) throw new Error(`Source URL has no final slug: ${sourceUrl}`)
  return decodeURIComponent(slug).toLowerCase()
}

function codenameCandidates(sourceUrl) {
  const slug = sourceSlug(sourceUrl)
  const underscored = slug.replaceAll('-', '_')
  return [...new Set([underscored, slug, `n${underscored}`])]
}

async function fetchJson(url) {
  let lastError = null
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'FeelAndNote Gates Notes source collector/1.0',
        },
      })
      const text = await response.text()
      if (response.ok) return JSON.parse(text)

      lastError = new Error(`HTTP ${response.status} for ${url}: ${text.slice(0, 300)}`)
      if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) throw lastError
    } catch (error) {
      lastError = error
      if (attempt === MAX_ATTEMPTS) throw error
    }
    await sleep(attempt * 1500)
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`)
}

function inlineText($, node) {
  const clone = $(node).clone()
  clone.find('br').replaceWith('\n')
  return clone
    .text()
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim()
}

function extractPlainBody(bodyHtml) {
  if (typeof bodyHtml !== 'string' || !bodyHtml.trim()) {
    throw new Error('body_content is empty')
  }

  const $ = load(`<div id="gatesnotes-body">${bodyHtml}</div>`, null, false)
  const root = $('#gatesnotes-body')
  const blocks = []
  root.contents().each((_, node) => {
    if (node.type === 'text') {
      const text = String(node.data ?? '').trim()
      if (text) blocks.push(text)
      return
    }
    const text = inlineText($, node)
    if (text) blocks.push(text)
  })

  const body = blocks.join('\n\n').trim()
  if (!body) throw new Error('body_content produced empty plain text')
  return body
}

export async function collectOne(target) {
  const candidates = codenameCandidates(target.sourceUrl)
  const failures = []
  for (const codename of candidates) {
    const url = `${CONTENT_API}/items/${encodeURIComponent(codename)}`
    try {
      const json = await fetchJson(url)
      const item = json?.item
      const bodyHtml = item?.elements?.body_content?.value
      const body = extractPlainBody(bodyHtml)
      if (item.system?.type !== 'article') {
        throw new Error(`Expected article type, received ${item.system?.type ?? 'missing'}`)
      }
      const fetchedName = item.system?.name ?? ''
      return {
        ...target,
        apiUrl: url,
        codename,
        systemId: item.system?.id ?? null,
        systemName: fetchedName,
        systemLastModified: item.system?.last_modified ?? null,
        bodyHtml,
        reviewEn: body,
        reviewEnHash: sha256(body),
        firstPersonSignals: {
          firstPersonI: (body.match(/\bI\b/g) ?? []).length,
          firstPersonMy: (body.match(/\bmy\b/gi) ?? []).length,
          firstPersonMe: (body.match(/\bme\b/gi) ?? []).length,
        },
      }
    } catch (error) {
      failures.push(`${codename}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  throw new Error(`Could not resolve ${target.sourceUrl}; ${failures.join(' || ')}`)
}

async function mapWithConcurrency(items, workerCount, worker) {
  const results = new Array(items.length)
  let nextIndex = 0
  let firstError = null

  async function runWorker() {
    while (!firstError) {
      const index = nextIndex
      nextIndex += 1
      if (index >= items.length) return
      try {
        results[index] = await worker(items[index], index)
      } catch (error) {
        firstError = error
        return
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(workerCount, items.length) }, () => runWorker()),
  )
  if (firstError) throw firstError
  return results
}

function validateResults(targets, results) {
  if (results.length !== targetCount) {
    throw new Error(`Result count mismatch: ${results.length}`)
  }
  const seenRelations = new Set()
  const seenUrls = new Set()
  for (const row of results) {
    if (seenRelations.has(row.relationId)) throw new Error(`Duplicate relation: ${row.relationId}`)
    if (seenUrls.has(row.sourceUrl)) throw new Error(`Duplicate source URL: ${row.sourceUrl}`)
    seenRelations.add(row.relationId)
    seenUrls.add(row.sourceUrl)
    const target = targets.find((item) => item.relationId === row.relationId)
    if (!target || target.sourceUrl !== row.sourceUrl) {
      throw new Error(`Target/source mismatch: ${row.relationId}`)
    }
    if (!row.reviewEn || row.reviewEn.length < 20) {
      throw new Error(`Body is too short: ${row.sourceUrl}`)
    }
    if (!row.bodyHtml.includes('<p')) {
      throw new Error(`Body has no paragraph markup: ${row.sourceUrl}`)
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
const targets = getTargetRows()
console.log(`Collecting ${targets.length} official Gates Notes article bodies with concurrency ${CONCURRENCY}`)
const results = await mapWithConcurrency(targets, CONCURRENCY, async (target) => {
  const result = await collectOne(target)
  console.log(
    `[${result.index}/${targetCount}] ${result.codename} ${result.reviewEn.length} chars` +
      ` (I:${result.firstPersonSignals.firstPersonI}, my:${result.firstPersonSignals.firstPersonMy})`,
  )
  return result
})

validateResults(targets, results)
const noFirstPerson = results.filter(
  (row) => row.firstPersonSignals.firstPersonI + row.firstPersonSignals.firstPersonMy === 0,
)

const output = {
  schema: 'bill-gates-gatesnotes-raw-book-reviews',
  collectedAt: new Date().toISOString(),
  source: {
    officialBaseUrl: 'https://www.gatesnotes.com',
    contentApiBase: CONTENT_API,
    bodyElement: 'body_content',
    extraction: 'Official body_content rich text converted to plain text; paragraph breaks preserved; inline markup omitted while linked text is retained.',
  },
  selection: {
    celebSlug: 'bill-gates',
    contentType: 'BOOK',
    targetCount,
    targetRule: collectAllLegacy
      ? 'All legacy BOOK rows in the pre-task backup with nonempty pre-task Korean and English review values and direct Gates Notes source_url.'
      : 'Backup rows with Korean locale, nonempty pre-task Korean and English review values, and direct Gates Notes source_url.',
  },
  validation: {
    fetchedCount: results.length,
    uniqueRelations: new Set(results.map((row) => row.relationId)).size,
    uniqueSourceUrls: new Set(results.map((row) => row.sourceUrl)).size,
    noFirstPersonSignalCount: noFirstPerson.length,
  },
  rows: results,
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n', 'utf8')
console.log(`Wrote ${outputPath}`)
if (noFirstPerson.length) {
  console.warn('No first-person signal in:', noFirstPerson.map((row) => row.sourceUrl).join(', '))
}
}
