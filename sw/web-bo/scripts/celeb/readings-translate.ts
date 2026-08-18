/**
 * 인물 상세 "읽어보기" 영문 번역 파이프라인.
 *
 * 규칙 SSoT:
 *   docs/project/celeb/person-reading.md
 *   docs/project/platform/i18n.md
 *
 * 사용 예:
 *   pnpm exec tsx scripts/translate-celeb-readings.ts --stats
 *   pnpm exec tsx scripts/translate-celeb-readings.ts --slugs=peter-thiel --plan
 *   pnpm exec tsx scripts/translate-celeb-readings.ts --slugs=yi-sun-sin,achilles --generate
 *   pnpm exec tsx scripts/translate-celeb-readings.ts --slugs=yi-sun-sin,achilles --apply --resume
 *   pnpm exec tsx scripts/translate-celeb-readings.ts --all --generate --apply --resume
 */

import { createHash } from 'node:crypto'
import {
  appendFileSync,
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  codexCall,
  looksRateLimited,
} from '../../../../.claude/skills/codex-gpt/scripts/codex-call.mjs'

function loadEnv() {
  for (const filename of ['.env.local', '.env']) {
    const file = resolve(process.cwd(), filename)
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
      }
    }
  }
}

loadEnv()

const flagValue = (name: string): string | null => {
  const prefix = `${name}=`
  const inline = process.argv.find((value) => value.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

const numberFlag = (name: string, fallback: number) => {
  const raw = flagValue(name)
  if (raw === null) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive integer: ${raw}`)
  return value
}

const PLAN = process.argv.includes('--plan')
const GENERATE = process.argv.includes('--generate')
const APPLY = process.argv.includes('--apply')
const STATS = process.argv.includes('--stats')
const RESUME = process.argv.includes('--resume')
const VERBOSE = process.argv.includes('--verbose')
const ALL = process.argv.includes('--all')
const LIMIT = numberFlag('--limit', Number.POSITIVE_INFINITY)
const BATCH_SIZE = numberFlag('--batch-size', 8)
const CONCURRENCY = numberFlag('--conc', 24)
const MODEL = flagValue('--model') ?? 'gpt-5.6-sol'
const SLUGS = (() => {
  const raw = flagValue('--slugs')
  return raw ? new Set(raw.split(',').map((slug) => slug.trim()).filter(Boolean)) : null
})()

if (!PLAN && !GENERATE && !APPLY && !STATS) {
  throw new Error('Specify at least one of --plan, --generate, --apply, or --stats.')
}
if (!STATS && !ALL && !SLUGS && LIMIT === Number.POSITIVE_INFINITY) {
  throw new Error('Safety stop: specify --all, --slugs, or a finite --limit.')
}
if (APPLY && !GENERATE && !RESUME) {
  throw new Error('Use --apply --resume to apply saved translations without generating.')
}

const ROOT = resolve(process.cwd(), '.tmp-celeb-reading-en')
const DRAFT_DIR = join(ROOT, 'drafts')
const FINAL_DIR = join(ROOT, 'finals')
const FAILURE_LOG = join(ROOT, 'failures.jsonl')
const RUN_LOCK_FILE = join(ROOT, 'run.lock')
const PIPELINE_VERSION = '2026-08-04-faithful-reading-translation-v1'
for (const directory of [ROOT, DRAFT_DIR, FINAL_DIR]) {
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true })
}

function acquireRunLock() {
  const tryAcquire = () => {
    const fd = openSync(RUN_LOCK_FILE, 'wx')
    writeFileSync(fd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), 'utf8')
    closeSync(fd)
  }
  try {
    tryAcquire()
  } catch (error) {
    if (!existsSync(RUN_LOCK_FILE)) throw error
    const saved = JSON.parse(readFileSync(RUN_LOCK_FILE, 'utf8')) as { pid?: number }
    let alive = false
    if (saved.pid) {
      try {
        process.kill(saved.pid, 0)
        alive = true
      } catch {
        alive = false
      }
    }
    if (alive) throw new Error(`Another reading translation batch is running. pid=${saved.pid}`)
    unlinkSync(RUN_LOCK_FILE)
    tryAcquire()
  }
  const release = () => {
    if (!existsSync(RUN_LOCK_FILE)) return
    try {
      const saved = JSON.parse(readFileSync(RUN_LOCK_FILE, 'utf8')) as { pid?: number }
      if (saved.pid === process.pid) unlinkSync(RUN_LOCK_FILE)
    } catch {
      // A stale lock is checked and removed explicitly on the next run.
    }
  }
  process.once('exit', release)
  process.once('SIGINT', () => {
    release()
    process.exit(130)
  })
  process.once('SIGTERM', () => {
    release()
    process.exit(143)
  })
}

if (GENERATE || APPLY) acquireRunLock()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

type ProfileRow = {
  id: string
  slug: string
  nickname: string
  nickname_en: string | null
  publication_status: 'active' | 'inactive'
  celeb_tier: string | null
}

type ExplanationRow = {
  profile_id: string
  plain_text: string
  interpretive_title: string
  interpretive_text: string
  plain_text_en: string | null
  interpretive_title_en: string | null
  interpretive_text_en: string | null
  published_at: string | null
  updated_at: string
}

type Material = {
  profile: ProfileRow
  explanation: ExplanationRow
}

type Translation = {
  profile_id: string
  plain_text_en: string
  interpretive_title_en: string
  interpretive_text_en: string
}

type SavedTranslation = Translation & {
  slug: string
  stage: 'draft' | 'final'
  model: string
  generatedAt: string
  inputHash: string
  validationErrors: string[]
}

async function fetchAll<T>(
  table: string,
  select: string,
  // PostgREST builders have table-dependent generic types; this boundary only configures filters/order.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configure: (query: any) => any = (query) => query,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await configure(
      supabase.from(table).select(select).range(from, from + 999),
    )
    if (error) throw error
    rows.push(...((data ?? []) as T[]))
    if (!data || data.length < 1000) break
  }
  return rows
}

function hasValue(value: string | null | undefined): value is string {
  return Boolean(value?.trim())
}

function needsTranslation(row: ExplanationRow): boolean {
  return !hasValue(row.plain_text_en)
    || !hasValue(row.interpretive_title_en)
    || !hasValue(row.interpretive_text_en)
}

function modelInput(material: Material) {
  const { profile, explanation } = material
  return {
    profile_id: profile.id,
    slug: profile.slug,
    name_ko: profile.nickname,
    name_en: profile.nickname_en,
    guide_ko: explanation.plain_text,
    exploration_title_ko: explanation.interpretive_title,
    exploration_text_ko: explanation.interpretive_text,
    existing_english: {
      plain_text_en: explanation.plain_text_en,
      interpretive_title_en: explanation.interpretive_title_en,
      interpretive_text_en: explanation.interpretive_text_en,
    },
  }
}

function inputHash(material: Material): string {
  return createHash('sha256')
    .update(`${PIPELINE_VERSION}\n${JSON.stringify(modelInput(material))}`, 'utf8')
    .digest('hex')
}

function cleanText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim()
}

function buildDraftPrompt(materials: Material[]): string {
  return `Translate the following Korean "Read More" entries into polished, natural English.

This is translation, not research or rewriting. Preserve every factual claim, relationship, degree of certainty, date, number, work title, and tension in the Korean. Do not add background facts, motives, quotations, praise, criticism, or interpretation that is absent from the source. Do not omit inconvenient or repetitive-looking details.

The two sections have distinct jobs and must remain distinct:
- guide_ko is a neutral guide explaining who the person is, what they did, and why they are known.
- exploration_title_ko and exploration_text_ko present a concrete tension or relationship. Do not flatten them into another biography or intensify their judgment.

Use established English names and work titles only when you are certain. Otherwise translate conservatively or use a clear romanization. Preserve the exact number of paragraphs in each body field. Use plain English prose, not Korean word order. Do not use Korean, Chinese, Japanese, markdown, translator notes, brackets such as "[Translation]", or em/en dashes. Existing non-empty English fields are locked: reproduce them verbatim.

Return only one JSON array with every input profile_id exactly once, in this schema:
[{"profile_id":"uuid","plain_text_en":"...","interpretive_title_en":"...","interpretive_text_en":"..."}]

INPUT:
${JSON.stringify(materials.map(modelInput), null, 2)}`
}

function buildRevisionPrompt(materials: Material[], drafts: Translation[]): string {
  return `Act as a bilingual senior editor. Produce the final English translations for the Korean "Read More" entries below.

Compare every draft directly with its Korean source. Correct mistranslations, omissions, added facts, added motives, inflated certainty, awkward Korean sentence order, and name/title errors. Preserve all factual content and the source's exact degree of certainty. Do not research or supply outside context.

Keep the neutral guide separate from the interpretive exploration. The exploration may retain the source's tension, but it must not become stronger praise, condemnation, diagnosis, or speculation. Preserve the exact number of paragraphs in each body field. Use natural English. Do not use Korean, Chinese, Japanese, markdown, translator notes, or em/en dashes. Existing non-empty English fields are locked and must be reproduced verbatim.

Return only one JSON array with every input profile_id exactly once:
[{"profile_id":"uuid","plain_text_en":"...","interpretive_title_en":"...","interpretive_text_en":"..."}]

SOURCE AND DRAFT:
${JSON.stringify(materials.map((material) => ({
    source: modelInput(material),
    draft: drafts.find((draft) => draft.profile_id === material.profile.id),
  })), null, 2)}`
}

function buildRepairPrompt(
  materials: Material[],
  translations: Translation[],
  errorsById: Map<string, string[]>,
): string {
  return `Repair only the validation problems in these English translations while staying fully faithful to the Korean source.

Do not add, omit, soften, or intensify facts or interpretation. Preserve every source number and the exact paragraph count of each body field. Use no Korean, Chinese, Japanese, markdown, translator notes, or em/en dashes. Existing non-empty English fields are locked and must be reproduced verbatim.

Return only one JSON array with every input profile_id exactly once:
[{"profile_id":"uuid","plain_text_en":"...","interpretive_title_en":"...","interpretive_text_en":"..."}]

ITEMS:
${JSON.stringify(materials.map((material) => ({
    source: modelInput(material),
    current: translations.find((translation) => translation.profile_id === material.profile.id),
    validation_errors: errorsById.get(material.profile.id) ?? [],
  })), null, 2)}`
}

function parseTranslations(raw: string, expectedIds: string[]): Translation[] {
  const start = raw.indexOf('[')
  const end = raw.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('Could not find a JSON array in model output.')
  const parsed = JSON.parse(raw.slice(start, end + 1)) as unknown
  if (!Array.isArray(parsed)) throw new Error('Model output is not a JSON array.')
  const translations = parsed.map((value) => {
    if (!value || typeof value !== 'object') throw new Error('A translation item is not an object.')
    const row = value as Record<string, unknown>
    return {
      profile_id: cleanText(row.profile_id),
      plain_text_en: cleanText(row.plain_text_en),
      interpretive_title_en: cleanText(row.interpretive_title_en),
      interpretive_text_en: cleanText(row.interpretive_text_en),
    }
  })
  const actualIds = translations.map((row) => row.profile_id)
  const missing = expectedIds.filter((id) => !actualIds.includes(id))
  const unexpected = actualIds.filter((id) => !expectedIds.includes(id))
  const duplicates = actualIds.filter((id, index) => actualIds.indexOf(id) !== index)
  if (missing.length || unexpected.length || duplicates.length) {
    throw new Error(`profile_id mismatch missing=${missing.join(',')} unexpected=${unexpected.join(',')} duplicate=${duplicates.join(',')}`)
  }
  return translations
}

async function callTranslations(
  prompt: string,
  expectedIds: string[],
  effort: 'low' | 'medium',
): Promise<Translation[]> {
  let lastError: unknown
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const raw = await codexCall(prompt, { model: MODEL, effort, timeoutMs: 600_000 })
      return parseTranslations(raw, expectedIds)
    } catch (error) {
      lastError = error
      if (attempt === 3) break
      const message = error instanceof Error ? error.message : String(error)
      const waitMs = looksRateLimited(message) ? attempt * 15_000 : attempt * 2_000
      await new Promise((resolveDelay) => setTimeout(resolveDelay, waitMs))
    }
  }
  throw lastError
}

function paragraphCount(text: string): number {
  return text.trim().split(/\n\s*\n/).filter(Boolean).length
}

function numericTokens(text: string): string[] {
  return [...new Set(text.replace(/(?<=\d),(?=\d)/g, '').match(/\d+(?:\.\d+)?/g) ?? [])]
}

function validateField(
  source: string,
  translated: string,
  label: string,
  body: boolean,
): string[] {
  const errors: string[] = []
  if (!translated.trim()) return [`${label}: empty`]
  if (/[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(translated)) {
    errors.push(`${label}: CJK characters remain`)
  }
  if (/```|^#{1,6}\s|\[Translation\]|translator(?:'s)? note|\bas an ai\b/im.test(translated)) {
    errors.push(`${label}: markdown or translator meta text`)
  }
  if (/[—–]/.test(translated)) errors.push(`${label}: em/en dash`)
  if (body && paragraphCount(source) !== paragraphCount(translated)) {
    errors.push(`${label}: paragraph count ${paragraphCount(translated)} != ${paragraphCount(source)}`)
  }
  const missingNumbers = numericTokens(source).filter((number) => !numericTokens(translated).includes(number))
  if (missingNumbers.length) errors.push(`${label}: missing source numbers ${missingNumbers.join(',')}`)
  const ratio = translated.length / Math.max(source.length, 1)
  if (ratio < 0.65 || ratio > 6) errors.push(`${label}: suspicious length ratio ${ratio.toFixed(2)}`)
  return errors
}

function validateTranslation(translation: Translation, material: Material): string[] {
  const { explanation } = material
  const errors = [
    ...validateField(explanation.plain_text, translation.plain_text_en, 'plain_text_en', true),
    ...validateField(explanation.interpretive_title, translation.interpretive_title_en, 'interpretive_title_en', false),
    ...validateField(explanation.interpretive_text, translation.interpretive_text_en, 'interpretive_text_en', true),
  ]
  for (const field of [
    'plain_text_en',
    'interpretive_title_en',
    'interpretive_text_en',
  ] as const) {
    const existing = explanation[field]
    if (hasValue(existing) && translation[field] !== existing) {
      errors.push(`${field}: existing English value changed`)
    }
  }
  return errors
}

function safeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, '_')
}

function pathFor(directory: string, slug: string): string {
  return join(directory, `${safeSlug(slug)}.json`)
}

function readSaved(directory: string, slug: string): SavedTranslation | null {
  const file = pathFor(directory, slug)
  if (!existsSync(file)) return null
  return JSON.parse(readFileSync(file, 'utf8')) as SavedTranslation
}

function saveTranslation(
  directory: string,
  stage: 'draft' | 'final',
  translation: Translation,
  material: Material,
  validationErrors: string[] = [],
) {
  const saved: SavedTranslation = {
    ...translation,
    slug: material.profile.slug,
    stage,
    model: MODEL,
    generatedAt: new Date().toISOString(),
    inputHash: inputHash(material),
    validationErrors,
  }
  writeFileSync(pathFor(directory, material.profile.slug), `${JSON.stringify(saved, null, 2)}\n`, 'utf8')
}

function logFailure(materials: Material[], stage: string, error: unknown) {
  appendFileSync(FAILURE_LOG, `${JSON.stringify({
    at: new Date().toISOString(),
    profile_ids: materials.map((material) => material.profile.id),
    slugs: materials.map((material) => material.profile.slug),
    stage,
    error: error instanceof Error ? error.message : String(error),
  })}\n`, 'utf8')
}

async function generateBatch(materials: Material[]): Promise<Map<string, SavedTranslation>> {
  const drafts = new Map<string, SavedTranslation>()
  const missingDrafts: Material[] = []
  for (const material of materials) {
    const saved = RESUME ? readSaved(DRAFT_DIR, material.profile.slug) : null
    if (saved && saved.inputHash === inputHash(material)) drafts.set(material.profile.id, saved)
    else missingDrafts.push(material)
  }

  if (missingDrafts.length) {
    const generated = await callTranslations(
      buildDraftPrompt(missingDrafts),
      missingDrafts.map((material) => material.profile.id),
      'low',
    )
    for (const translation of generated) {
      const material = missingDrafts.find((item) => item.profile.id === translation.profile_id)!
      saveTranslation(DRAFT_DIR, 'draft', translation, material)
      drafts.set(translation.profile_id, readSaved(DRAFT_DIR, material.profile.slug)!)
    }
  }

  const finals = new Map<string, SavedTranslation>()
  const toRevise: Material[] = []
  for (const material of materials) {
    const saved = RESUME ? readSaved(FINAL_DIR, material.profile.slug) : null
    const reusable = saved
      && saved.inputHash === inputHash(material)
      && saved.validationErrors.length === 0
      && validateTranslation(saved, material).length === 0
    if (reusable) finals.set(material.profile.id, saved)
    else toRevise.push(material)
  }

  if (toRevise.length) {
    let revised = await callTranslations(
      buildRevisionPrompt(toRevise, toRevise.map((material) => drafts.get(material.profile.id)!)),
      toRevise.map((material) => material.profile.id),
      'medium',
    )

    for (let repairAttempt = 1; repairAttempt <= 2; repairAttempt += 1) {
      const errorsById = new Map<string, string[]>()
      for (const translation of revised) {
        const material = toRevise.find((item) => item.profile.id === translation.profile_id)!
        const errors = validateTranslation(translation, material)
        if (errors.length) errorsById.set(translation.profile_id, errors)
      }
      if (!errorsById.size) break
      const repairMaterials = toRevise.filter((material) => errorsById.has(material.profile.id))
      const repaired = await callTranslations(
        buildRepairPrompt(repairMaterials, revised, errorsById),
        repairMaterials.map((material) => material.profile.id),
        'medium',
      )
      const repairedById = new Map(repaired.map((translation) => [translation.profile_id, translation]))
      revised = revised.map((translation) => repairedById.get(translation.profile_id) ?? translation)
    }

    for (const translation of revised) {
      const material = toRevise.find((item) => item.profile.id === translation.profile_id)!
      const errors = validateTranslation(translation, material)
      saveTranslation(FINAL_DIR, 'final', translation, material, errors)
      finals.set(translation.profile_id, readSaved(FINAL_DIR, material.profile.slug)!)
    }
  }

  return finals
}

async function fetchExplanation(profileId: string): Promise<ExplanationRow> {
  const { data, error } = await supabase
    .from('celeb_explanations')
    .select('profile_id,plain_text,interpretive_title,interpretive_text,plain_text_en,interpretive_title_en,interpretive_text_en,published_at,updated_at')
    .eq('profile_id', profileId)
    .single()
  if (error) throw error
  return data as ExplanationRow
}

async function applyTranslation(saved: SavedTranslation, material: Material): Promise<'written' | 'complete' | 'held'> {
  if (saved.inputHash !== inputHash(material)) throw new Error('Saved translation input hash is stale.')
  const savedErrors = validateTranslation(saved, material)
  if (saved.validationErrors.length || savedErrors.length) return 'held'

  const current = await fetchExplanation(material.profile.id)
  const currentMaterial = { ...material, explanation: current }
  if (inputHash(currentMaterial) !== saved.inputHash) {
    throw new Error('DB source or existing English changed after translation; regenerate this row.')
  }
  if (!needsTranslation(current)) return 'complete'

  const payload: Partial<Pick<ExplanationRow,
    'plain_text_en' | 'interpretive_title_en' | 'interpretive_text_en'>> = {}
  for (const field of [
    'plain_text_en',
    'interpretive_title_en',
    'interpretive_text_en',
  ] as const) {
    if (!hasValue(current[field])) payload[field] = saved[field]
  }

  const { data: updated, error } = await supabase
    .from('celeb_explanations')
    .update(payload)
    .eq('profile_id', material.profile.id)
    .eq('updated_at', current.updated_at)
    .select('profile_id,plain_text,interpretive_title,interpretive_text,plain_text_en,interpretive_title_en,interpretive_text_en,published_at,updated_at')
    .maybeSingle()
  if (error) throw error
  if (!updated) throw new Error('Conditional update matched no row; the row changed concurrently.')

  const verified = await fetchExplanation(material.profile.id)
  if (
    verified.plain_text !== current.plain_text
    || verified.interpretive_title !== current.interpretive_title
    || verified.interpretive_text !== current.interpretive_text
    || verified.published_at !== current.published_at
  ) {
    throw new Error('Korean source or publication state changed during the English update.')
  }
  for (const field of [
    'plain_text_en',
    'interpretive_title_en',
    'interpretive_text_en',
  ] as const) {
    const expected = hasValue(current[field]) ? current[field] : saved[field]
    if (verified[field] !== expected) throw new Error(`DB verification mismatch: ${field}`)
  }
  return 'written'
}

function batchesOf<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size))
  return batches
}

function printStats(profiles: ProfileRow[], explanations: ExplanationRow[]) {
  const published = explanations.filter((row) => row.published_at)
  const complete = explanations.filter((row) => !needsTranslation(row))
  const partial = explanations.filter((row) => {
    const count = [row.plain_text_en, row.interpretive_title_en, row.interpretive_text_en]
      .filter(hasValue).length
    return count > 0 && count < 3
  })
  const allMissing = explanations.filter((row) =>
    !hasValue(row.plain_text_en)
    && !hasValue(row.interpretive_title_en)
    && !hasValue(row.interpretive_text_en))
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    profiles: profiles.length,
    explanations: explanations.length,
    published: published.length,
    complete: complete.length,
    missingAny: explanations.length - complete.length,
    partial: partial.length,
    allMissing: allMissing.length,
    publishedMissingAny: published.filter(needsTranslation).length,
    fields: {
      plain_text_en: explanations.filter((row) => hasValue(row.plain_text_en)).length,
      interpretive_title_en: explanations.filter((row) => hasValue(row.interpretive_title_en)).length,
      interpretive_text_en: explanations.filter((row) => hasValue(row.interpretive_text_en)).length,
    },
  }, null, 2))
}

async function main() {
  const [profiles, explanations] = await Promise.all([
    fetchAll<ProfileRow>(
      'celebs',
      'id,slug,nickname,nickname_en,publication_status,celeb_tier',
      (query) => query.not('slug', 'is', null).order('id'),
    ),
    fetchAll<ExplanationRow>(
      'celeb_explanations',
      'profile_id,plain_text,interpretive_title,interpretive_text,plain_text_en,interpretive_title_en,interpretive_text_en,published_at,updated_at',
      (query) => query.order('profile_id'),
    ),
  ])

  if (STATS) printStats(profiles, explanations)
  if (STATS && !PLAN && !GENERATE && !APPLY) return

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]))
  const explanationById = new Map(explanations.map((row) => [row.profile_id, row]))
  const statusRank = { active: 0, inactive: 1 }
  let materials = explanations
    .filter(needsTranslation)
    .map((explanation) => ({ profile: profileById.get(explanation.profile_id), explanation }))
    .filter((material): material is Material => Boolean(material.profile))
    .filter((material) => !SLUGS || SLUGS.has(material.profile.slug))
    .sort((a, b) => statusRank[a.profile.publication_status] - statusRank[b.profile.publication_status]
      || a.profile.slug.localeCompare(b.profile.slug))

  if (SLUGS) {
    const allSlugs = new Set(profiles.map((profile) => profile.slug))
    const missingProfiles = [...SLUGS].filter((slug) => !allSlugs.has(slug))
    if (missingProfiles.length) throw new Error(`Unknown CELEB slugs: ${missingProfiles.join(', ')}`)
    const profileIdBySlug = new Map(profiles.map((profile) => [profile.slug, profile.id]))
    const noExplanation = [...SLUGS].filter((slug) => !explanationById.has(profileIdBySlug.get(slug)!))
    if (noExplanation.length) throw new Error(`Slugs without celeb_explanations rows: ${noExplanation.join(', ')}`)
    const alreadyComplete = [...SLUGS].filter((slug) => {
      const explanation = explanationById.get(profileIdBySlug.get(slug)!)
      return explanation && !needsTranslation(explanation)
    })
    if (alreadyComplete.length) console.log(`Already complete: ${alreadyComplete.join(', ')}`)
  }
  if (LIMIT !== Number.POSITIVE_INFINITY) materials = materials.slice(0, LIMIT)

  console.log([
    `explanations ${explanations.length}`,
    `missing ${explanations.filter(needsTranslation).length}`,
    `selected ${materials.length}`,
    `batch ${BATCH_SIZE}`,
    `lanes ${CONCURRENCY}`,
    `model ${MODEL}`,
    APPLY ? 'conditional DB apply' : 'no DB writes',
  ].join(' | '))

  if (PLAN) {
    for (const material of materials) {
      const row = material.explanation
      console.log(`PLAN ${material.profile.publication_status.padEnd(9)} ${material.profile.celeb_tier ?? '-'} ${material.profile.slug} ${material.profile.nickname} | guide=${hasValue(row.plain_text_en) ? 'en' : '-'} title=${hasValue(row.interpretive_title_en) ? 'en' : '-'} text=${hasValue(row.interpretive_text_en) ? 'en' : '-'}`)
      if (VERBOSE) console.log(JSON.stringify(modelInput(material), null, 2))
    }
    return
  }

  const batches = batchesOf(materials, BATCH_SIZE)
  const lanes = Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => [] as Material[][])
  batches.forEach((batch, index) => lanes[index % lanes.length].push(batch))
  let processed = 0
  let written = 0
  let complete = 0
  let held = 0
  let failed = 0
  const startedAt = Date.now()

  async function runLane(laneIndex: number, laneBatches: Material[][]) {
    for (const batch of laneBatches) {
      const batchStartedAt = Date.now()
      const slugs = batch.map((material) => material.profile.slug)
      try {
        const finals = GENERATE
          ? await generateBatch(batch)
          : new Map(batch.map((material) => [
            material.profile.id,
            readSaved(FINAL_DIR, material.profile.slug),
          ]).filter((entry): entry is [string, SavedTranslation] => Boolean(entry[1])))

        for (const material of batch) {
          const final = finals.get(material.profile.id)
          if (!final) {
            failed += 1
            logFailure([material], 'missing-final', 'No saved final translation.')
            continue
          }
          if (final.validationErrors.length || validateTranslation(final, material).length) {
            held += 1
            continue
          }
          if (APPLY) {
            const result = await applyTranslation(final, material)
            if (result === 'written') written += 1
            else if (result === 'complete') complete += 1
            else held += 1
          }
        }
        processed += batch.length
        console.log(`OK lane ${laneIndex + 1} | ${slugs.join(',')} | ${Math.round((Date.now() - batchStartedAt) / 1000)}s | ${processed}/${materials.length}`)
      } catch (error) {
        failed += batch.length
        processed += batch.length
        logFailure(batch, 'batch', error)
        console.error(`FAIL lane ${laneIndex + 1} | ${slugs.join(',')} | ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }

  await Promise.all(lanes.map((lane, index) => runLane(index, lane)))
  console.log(`DONE | selected ${materials.length} | processed ${processed} | written ${written} | already complete ${complete} | held ${held} | failed ${failed} | ${Math.round((Date.now() - startedAt) / 1000)}s`)
  if (failed || held) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
