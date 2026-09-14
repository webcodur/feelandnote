import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../../../')
const progressPath = path.join(
  REPO_ROOT,
  'sw',
  'web-bo',
  '.tmp-bill-gates-ko-retranslation-20260910',
  'raw-translate',
  'progress.json',
)
const rawPath = path.join(
  REPO_ROOT,
  'data',
  'celeb',
  'viewing-research',
  '2026-09-11-bill-gates-gatesnotes-raw-book-reviews.json',
)

const progress = JSON.parse(fs.readFileSync(progressPath, 'utf8'))
const raw = JSON.parse(fs.readFileSync(rawPath, 'utf8'))
const rawByRelation = new Map(raw.rows.map((row) => [row.relationId, row]))
const applied = (progress.results ?? []).filter((result) => result.status === 'applied')

console.log(JSON.stringify({
  applied: applied.length,
  failed: (progress.results ?? []).filter((result) => result.status === 'failed').length,
  thirdPersonLead: applied.filter((result) => /^(빌\s*게이츠|그)(?:는|가|이|의|에게|를|로부터)/.test(result.review)).length,
  withBillGatesThirdPerson: applied.filter((result) => /빌\s*게이츠(?:는|가|이|의|에게|를)/.test(result.review)).length,
  withFirstPersonMarkers: applied.filter((result) => /\b나는\b|\b내가\b|\b내\b/.test(result.review)).length,
}, null, 2))

for (const result of applied.sort((a, b) => a.index - b.index)) {
  const source = rawByRelation.get(result.relationId)
  const firstSentence = result.review.split(/[.!?。！？]/, 1)[0].trim()
  const hangul = (result.review.match(/[가-힣]/g) ?? []).length
  const latin = (result.review.match(/[A-Za-z]/g) ?? []).length
  console.log(`\n[${result.index}] ${result.titleEn}`)
  console.log(`source: ${source.reviewEn.split(/[.!?]/, 1)[0].trim()}`)
  console.log(`ko: ${firstSentence}`)
  console.log(`chars=${result.review.length} hangul=${hangul} latin=${latin} thirdPersonLead=${/^(빌\s*게이츠|그)(?:는|가|이|의|에게|를|로부터)/.test(firstSentence)}`)
  console.log(result.review.slice(0, 360))
}
