#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import {
  computeTimelineTargetPopulation,
} from './lib/timeline-target-population.mjs'

export const PAGE_SIZE = 1000
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const SAFE_MANIFEST_DIRECTORY = resolve(
  PROJECT_ROOT,
  'docs',
  'celeb-data',
  'timeline',
  'manifests',
)

export const HELP = Object.freeze({
  command: 'timeline-export-missing-manifest',
  purpose: 'Read all celebs and timeline event owners, then emit a missing-celeb JSON manifest.',
  usage: [
    'node --env-file=.env scripts/timeline-export-missing-manifest.mjs --check-only',
    'node --env-file=.env scripts/timeline-export-missing-manifest.mjs --output <manifest.json>',
  ],
  options: {
    '--check-only': 'Read and validate Supabase, print a JSON result, and create no file.',
    '--output <path>': 'Required outside check-only mode. The path must end in .json.',
    '--help': 'Print this help object as JSON.',
  },
  safety: {
    database: 'read-only',
    overwrite: false,
    recommendedOutputDirectory: relative(PROJECT_ROOT, SAFE_MANIFEST_DIRECTORY).replaceAll('\\', '/'),
  },
})

function jsonForStdout(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function valueAfter(argv, index, flag) {
  const value = argv[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`)
  return value
}

export function parseArgs(argv) {
  let output = null
  let checkOnly = false
  let help = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--help' || argument === '-h') {
      help = true
    } else if (argument === '--check-only') {
      checkOnly = true
    } else if (argument === '--output') {
      output = valueAfter(argv, index, '--output')
      index += 1
    } else if (argument.startsWith('--output=')) {
      output = argument.slice('--output='.length)
      if (!output) throw new Error('--output requires a value')
    } else {
      throw new Error(`unknown argument: ${argument}`)
    }
  }

  if (!help && checkOnly && output) throw new Error('--check-only cannot be combined with --output')
  if (!help && !checkOnly && !output) {
    throw new Error('--output is required unless --check-only is used')
  }

  const outputPath = output
    ? (isAbsolute(output) ? resolve(output) : resolve(process.cwd(), output))
    : null
  if (outputPath && extname(outputPath).toLowerCase() !== '.json') {
    throw new Error('--output must point to a .json file')
  }

  return { checkOnly, help, outputPath }
}

function assertPageRows(rows, { table, from, uniqueKey, seenKeys }) {
  if (!Array.isArray(rows)) throw new Error(`${table} ${from}: response data is not an array`)
  if (rows.length > PAGE_SIZE) throw new Error(`${table} ${from}: page exceeded ${PAGE_SIZE} rows`)

  for (const [offset, row] of rows.entries()) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`${table} ${from + offset}: row is not an object`)
    }
    const key = row[uniqueKey]
    if (typeof key !== 'string' || key.trim() === '') {
      throw new Error(`${table} ${from + offset}: ${uniqueKey} is null or empty`)
    }
    if (seenKeys.has(key)) throw new Error(`${table}: duplicate ${uniqueKey}: ${key}`)
    seenKeys.add(key)
  }
}

export async function fetchAllPages(db, {
  table,
  columns,
  orderColumn = 'id',
  uniqueKey = 'id',
}) {
  const rows = []
  const seenKeys = new Set()
  let expectedTotal = null

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error, count } = await db
      .from(table)
      .select(columns, { count: 'exact' })
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(`${table} ${from}: ${error.message ?? String(error)}`)
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`${table} ${from}: exact count is missing or invalid`)
    }
    if (expectedTotal == null) expectedTotal = count
    if (count !== expectedTotal) {
      throw new Error(`${table}: exact count changed during pagination (${expectedTotal} -> ${count})`)
    }

    const page = data ?? []
    assertPageRows(page, { table, from, uniqueKey, seenKeys })
    rows.push(...page)
    if (rows.length > expectedTotal) {
      throw new Error(`${table}: fetched ${rows.length} rows but exact count is ${expectedTotal}`)
    }
    if (page.length < PAGE_SIZE) break
  }

  if (rows.length !== expectedTotal) {
    throw new Error(`${table}: fetched ${rows.length} rows but exact count is ${expectedTotal}`)
  }
  return { rows, exactTotal: expectedTotal }
}

export function createManifest({ population, generatedAt }) {
  return {
    schemaVersion: 1,
    kind: 'celeb-timeline-missing-manifest',
    generatedAt,
    source: {
      database: 'Supabase',
      tables: ['public.celebs', 'public.celeb_timeline_events'],
      pageSize: PAGE_SIZE,
      readOnly: true,
    },
    rule: population.rule,
    counts: population.counts,
    hash: population.hash,
    missingCelebs: population.missingCelebs,
  }
}

export function writeManifestAtomically(outputPath, manifest) {
  if (existsSync(outputPath)) throw new Error(`refusing to overwrite existing file: ${outputPath}`)
  mkdirSync(dirname(outputPath), { recursive: true })
  const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    })
    renameSync(temporaryPath, outputPath)
  } catch (error) {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath)
    throw error
  }

  const persisted = JSON.parse(readFileSync(outputPath, 'utf8'))
  if (persisted.hash?.value !== manifest.hash.value) {
    throw new Error(`persisted manifest verification failed: ${outputPath}`)
  }
}

export async function exportMissingManifest({
  db,
  checkOnly,
  outputPath,
  generatedAt = new Date().toISOString(),
  writer = writeManifestAtomically,
}) {
  const celebsResult = await fetchAllPages(db, {
    table: 'celebs',
    columns: [
      'id',
      'slug',
      'nickname',
      'nickname_en',
      'celeb_tier',
      'publication_status',
      'birth_date',
      'death_date',
      'profession',
      'nationality',
      'wikidata_qid',
    ].join(','),
  })
  const eventsResult = await fetchAllPages(db, {
    table: 'celeb_timeline_events',
    columns: 'id,celeb_id',
  })

  const population = computeTimelineTargetPopulation({
    celebs: celebsResult.rows,
    eventOwnerIds: eventsResult.rows.map((row) => row.celeb_id),
    declaredCelebTotal: celebsResult.exactTotal,
    declaredEventTotal: eventsResult.exactTotal,
  })
  const manifest = createManifest({ population, generatedAt })

  if (!checkOnly) {
    if (!outputPath) throw new Error('outputPath is required outside check-only mode')
    writer(outputPath, manifest)
  }

  return {
    ok: true,
    mode: checkOnly ? 'check-only' : 'write',
    outputPath: checkOnly ? null : outputPath,
    counts: manifest.counts,
    hash: manifest.hash,
  }
}

function createDatabaseClient(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function main({
  argv = process.argv.slice(2),
  env = process.env,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) {
  try {
    const options = parseArgs(argv)
    if (options.help) {
      stdout.write(jsonForStdout({ ok: true, help: HELP }))
      return 0
    }

    const result = await exportMissingManifest({
      db: createDatabaseClient(env),
      checkOnly: options.checkOnly,
      outputPath: options.outputPath,
    })
    stdout.write(jsonForStdout(result))
    return 0
  } catch (error) {
    stderr.write(jsonForStdout({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }))
    return 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  process.exitCode = await main()
}
