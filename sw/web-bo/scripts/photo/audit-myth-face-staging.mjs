/**
 * Review locally qualified mythology face material in labeled contact sheets.
 * Watermarks are allowed; famous identities, synthetic faces, damaged skin,
 * grotesque traits, and creepy or unreadable faces are rejected.
 */
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { codexCall, looksRateLimited } from '../../../../.agents/skills/codex-gpt/scripts/codex-call.mjs'

const OUTPUT_ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const MANIFEST_PATH = path.join(OUTPUT_ROOT, 'manifest.json')
const SHEET_ROOT = path.join(OUTPUT_ROOT, '_audit-sheets')
const MAX_IMAGES_PER_SHEET = 20
const MAX_ACCEPTED_PER_PERSON = 4
const CELL_WIDTH = 480
const CELL_HEIGHT = 640
const LABEL_HEIGHT = 56

function argValue(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function parsePositiveInt(value, fallback) {
  if (value == null) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`Invalid integer argument: ${value}`)
  return parsed
}

function parseJson(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('No JSON object found in visual review response')
  return JSON.parse(trimmed.slice(start, end + 1))
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function loadStagedPeople() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
  const people = []
  for (const person of manifest) {
    const sourcePath = path.join(person.candidate_dir, 'sources.json')
    if (!existsSync(sourcePath)) continue
    const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
    if (source.status !== 'staged_unreviewed') continue
    const rawPath = path.join(person.candidate_dir, '_staging', 'raw-sources.json')
    if (!existsSync(rawPath)) continue
    const rawSource = JSON.parse(readFileSync(rawPath, 'utf8'))
    const candidates = (rawSource.raw ?? []).map((candidate, index) => ({
      ...candidate,
      id: `${person.slug}#${String(index + 1).padStart(2, '0')}`,
      person,
      sourcePath,
    }))
    if (candidates.length) people.push({ person, sourcePath, candidates })
  }
  return people
}

function packBatches(people) {
  const batches = []
  let current = []
  let count = 0
  for (const entry of people) {
    if (current.length && count + entry.candidates.length > MAX_IMAGES_PER_SHEET) {
      batches.push(current)
      current = []
      count = 0
    }
    current.push(entry)
    count += entry.candidates.length
  }
  if (current.length) batches.push(current)
  return batches
}

async function createSheet(entries, sheetPath) {
  const candidates = entries.flatMap((entry) => entry.candidates)
  const columns = Math.min(5, candidates.length)
  const rows = Math.ceil(candidates.length / columns)
  const composites = []
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index]
    const image = await sharp(candidate.file_path)
      .rotate()
      .resize(CELL_WIDTH, CELL_HEIGHT - LABEL_HEIGHT, {
        fit: 'contain',
        background: '#181818',
        withoutEnlargement: false,
      })
      .jpeg({ quality: 91 })
      .toBuffer()
    const label = Buffer.from(`<svg width="${CELL_WIDTH}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#050505"/>
      <text x="18" y="38" fill="#ffffff" font-size="28" font-family="Arial, sans-serif" font-weight="700">${xmlEscape(candidate.id)}</text>
    </svg>`)
    const left = (index % columns) * CELL_WIDTH
    const top = Math.floor(index / columns) * CELL_HEIGHT
    composites.push({ input: image, left, top })
    composites.push({ input: label, left, top: top + CELL_HEIGHT - LABEL_HEIGHT })
  }
  await sharp({
    create: {
      width: columns * CELL_WIDTH,
      height: rows * CELL_HEIGHT,
      channels: 3,
      background: '#101010',
    },
  })
    .composite(composites)
    .webp({ quality: 92, effort: 4 })
    .toFile(sheetPath)
}

function reviewPrompt(entries) {
  const candidates = entries.flatMap((entry) => entry.candidates)
  const context = candidates.map((candidate) => ({
    id: candidate.id,
    name: `${candidate.person.nickname} / ${candidate.person.nickname_en ?? ''}`,
    gender: candidate.person.gender_label,
    tradition: candidate.person.primary_tradition,
    role: `${candidate.person.title ?? ''} / ${candidate.person.short_desc ?? ''}`,
    pin_url: candidate.pin_url,
    pin_title: candidate.pin_title,
    description: candidate.description,
    alt: candidate.alt,
  }))
  return `Review EVERY labeled cell in the attached contact sheet one by one as UNAPPROVED face material for mythological image regeneration.

This is candidate collection, not final casting. Do not choose one winner per person and do not generate or edit an image.

Reject a cell if any of these is present:
- illustration, sculpture, cosplay, fantasy prosthetics or makeup, or likely AI/synthetic portrait;
- recognizable actor, singer, influencer, celebrity, public figure, or genuinely famous fashion model. Named but non-famous working models are allowed; do not infer fame merely from professional photography;
- waxy or plastic skin, extreme beauty filter, unnatural iris/catchlight, inconsistent hair, teeth, ears, jewelry, clothing edges, or background geometry;
- damaged or deformed skin, wounds, scars added for effect, grotesque source-faithful traits, or creepy presentation;
- side/profile view, either eye obscured, mask, sunglasses, hand across face, multiple prominent people, unreadable bone structure, severe blur or darkness;
- ordinary snapshot quality materially below usable beauty/editorial face material.

Watermarks, logos, mastheads, signatures, and text are ALLOWED when they do not cover or deform the face because the material will be regenerated or composited.

Pass a real color photograph with intact natural skin, harmonious and distinctive beauty, both eyes and facial structure clear, and direct or near-direct gaze. Separately rate divine presence:
- strong: the face itself already feels sovereign, luminous, serene, formidable, uncanny-beautiful, or transcendent without looking creepy;
- moderate: clear elevated or mythic potential after regeneration;
- weak: usable and beautiful but ordinary. Weak presence alone is not a rejection reason.

The labeled cells and character context are in this exact list:
${JSON.stringify(context, null, 2)}

Return ONLY JSON, no markdown. Every id must appear exactly once:
{"reviews":[{"id":"slug#01","decision":"pass|reject","reason":"specific visible reason","divine_presence":"strong|moderate|weak","public_identity_risk":"low|recognized"}]}
If an exact famous identity is not actually recognized or named in the context, use public_identity_risk=low. If visual authenticity is uncertain, reject.`
}

function applyReviews(entries, reviews, sheetPath) {
  const reviewById = new Map(reviews.map((review) => [review.id, review]))
  const presenceRank = { strong: 3, moderate: 2, weak: 1 }
  const results = []
  for (const entry of entries) {
    const source = JSON.parse(readFileSync(entry.sourcePath, 'utf8'))
    const ranked = entry.candidates
      .map((candidate, index) => ({ candidate, index, review: reviewById.get(candidate.id) }))
      .sort((left, right) => {
        const leftPass = left.review?.decision === 'pass' && left.review?.public_identity_risk === 'low' ? 1 : 0
        const rightPass = right.review?.decision === 'pass' && right.review?.public_identity_risk === 'low' ? 1 : 0
        return rightPass - leftPass
          || (presenceRank[right.review?.divine_presence] ?? 0) - (presenceRank[left.review?.divine_presence] ?? 0)
          || left.index - right.index
      })
    const accepted = []
    const sheetRejected = []
    for (const { candidate, review } of ranked) {
      const passes = review?.decision === 'pass' && review?.public_identity_risk === 'low'
      if (!passes || accepted.length >= MAX_ACCEPTED_PER_PERSON) {
        sheetRejected.push({
          id: candidate.id,
          filename: candidate.filename,
          pin_url: candidate.pin_url,
          reason: review?.reason ?? 'contact_sheet_review_missing_or_candidate_limit',
          divine_presence: review?.divine_presence ?? 'weak',
          public_identity_risk: review?.public_identity_risk ?? 'recognized',
        })
        continue
      }
      const filename = `candidate-${String(accepted.length + 1).padStart(2, '0')}${path.extname(candidate.filename)}`
      copyFileSync(candidate.file_path, path.join(entry.person.candidate_dir, filename))
      accepted.push({
        filename,
        pin_url: candidate.pin_url,
        pin_title: candidate.pin_title,
        identity_check: 'Non-famous model allowed; no exact famous identity recognized in metadata or visual audit.',
        identity_risk: 'low',
        quality_note: review.reason,
        divine_presence: review.divine_presence,
        image_url: candidate.image_url,
        width: candidate.width,
        height: candidate.height,
        sha256: candidate.sha256,
        query: candidate.query,
        face_audit: candidate.face,
        contact_sheet_id: candidate.id,
      })
    }
    source.status = accepted.length ? 'collected_unapproved' : 'no_qualified_candidates'
    source.accepted = accepted
    source.rejected = [...(source.rejected ?? []), ...sheetRejected]
    source.visual_reviews = entry.candidates.map((candidate) => reviewById.get(candidate.id)).filter(Boolean)
    source.contact_sheet = sheetPath
    source.reviewed_at = new Date().toISOString()
    writeFileSync(entry.sourcePath, `${JSON.stringify(source, null, 2)}\n`, 'utf8')
    results.push({ slug: entry.person.slug, status: source.status, accepted: accepted.length })
  }
  return results
}

async function mapConcurrent(items, concurrency, worker) {
  const results = new Array(items.length)
  let cursor = 0
  async function run() {
    while (true) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run))
  return results
}

async function main() {
  mkdirSync(SHEET_ROOT, { recursive: true })
  const concurrency = parsePositiveInt(argValue('concurrency'), 3)
  const offset = parsePositiveInt(argValue('offset'), 0)
  const limit = parsePositiveInt(argValue('limit'), Number.POSITIVE_INFINITY)
  if (concurrency < 1 || concurrency > 3) throw new Error('--concurrency must be between 1 and 3')
  const people = loadStagedPeople()
  const allBatches = packBatches(people)
  const batches = allBatches.slice(offset, Number.isFinite(limit) ? offset + limit : undefined)
  console.log(`START people=${people.length} images=${people.reduce((sum, entry) => sum + entry.candidates.length, 0)} batches=${batches.length} concurrency=${concurrency}`)
  let completed = 0
  const batchResults = await mapConcurrent(batches, concurrency, async (entries) => {
    const candidates = entries.flatMap((entry) => entry.candidates)
    const hash = createHash('sha1').update(candidates.map((candidate) => candidate.id).join('|')).digest('hex').slice(0, 12)
    const sheetPath = path.join(SHEET_ROOT, `sheet-${hash}.webp`)
    const reviewPath = path.join(SHEET_ROOT, `sheet-${hash}.json`)
    try {
      if (!existsSync(sheetPath)) await createSheet(entries, sheetPath)
      let response
      if (existsSync(reviewPath)) {
        response = JSON.parse(readFileSync(reviewPath, 'utf8'))
      } else {
        const responseText = await codexCall(reviewPrompt(entries), {
          model: 'gpt-5.6-sol',
          effort: 'medium',
          images: [sheetPath],
          sandbox: 'read-only',
          timeoutMs: 300_000,
        })
        response = parseJson(responseText)
        writeFileSync(reviewPath, `${JSON.stringify(response, null, 2)}\n`, 'utf8')
      }
      const reviews = Array.isArray(response.reviews) ? response.reviews : []
      const expectedIds = new Set(candidates.map((candidate) => candidate.id))
      const returnedIds = new Set(reviews.map((review) => review.id))
      if (returnedIds.size !== expectedIds.size || [...expectedIds].some((id) => !returnedIds.has(id))) {
        throw new Error(`Review coverage mismatch expected=${expectedIds.size} returned=${returnedIds.size}`)
      }
      const results = applyReviews(entries, reviews, sheetPath)
      completed += 1
      console.log(`[${completed}/${batches.length}] ${entries.map((entry) => entry.person.slug).join(',')} accepted=${results.reduce((sum, row) => sum + row.accepted, 0)}`)
      return { status: 'reviewed', sheetPath, results }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      completed += 1
      console.log(`[${completed}/${batches.length}] ${entries.map((entry) => entry.person.slug).join(',')} failed=${message}`)
      return { status: looksRateLimited(message) ? 'rate_limited' : 'failed', error: message, sheetPath }
    }
  })
  const personResults = batchResults.flatMap((row) => row.results ?? [])
  const summary = {
    finished_at: new Date().toISOString(),
    batches: batches.length,
    batch_status: Object.fromEntries([...Map.groupBy(batchResults, (row) => row.status).entries()].map(([key, rows]) => [key, rows.length])),
    people_reviewed: personResults.length,
    people_with_candidates: personResults.filter((row) => row.accepted > 0).length,
    accepted_images: personResults.reduce((sum, row) => sum + row.accepted, 0),
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  writeFileSync(path.join(SHEET_ROOT, `run-${stamp}.json`), `${JSON.stringify({ summary, batchResults }, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
