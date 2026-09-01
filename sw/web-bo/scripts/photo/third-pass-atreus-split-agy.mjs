/** Split fallback for the 17-row House of Atreus third-pass call. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const PROJECT_ROOT = path.resolve('C:\\project\\feelandnote')
const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트')
const V3 = path.join(ROOT, '_agy-tradition-rework-v3')
const INPUT = path.join(V3, 'tradition-07-input.json')
const PART1_INPUT = path.join(V3, 'tradition-07-part1-input.json')
const PART1_RAW = path.join(V3, 'tradition-07-part1-response.txt')
const PART1_RESULT = path.join(V3, 'tradition-07-part1-result.json')
const PART2_INPUT = path.join(V3, 'tradition-07-part2-input.json')
const PART2_RAW = path.join(V3, 'tradition-07-part2-response.txt')
const PART2_RESULT = path.join(V3, 'tradition-07-part2-result.json')
const FINAL = path.join(V3, 'tradition-07-result.json')
const MODEL = 'gemini-3.7-flash-high'

function readJson(file) { return JSON.parse(readFileSync(file, 'utf8')) }
function writeJson(file, value) { writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8') }
function extractJson(text) {
  const cleaned = String(text ?? '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  return JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1))
}

const strictRules = `
Use ONE Late Helladic IIIA-B Mycenaean archaeological frame only. Use 2-6 opened direct museum object, excavation, or peer-reviewed academic pages; Wikipedia, World History Encyclopedia, Theoi, ToposText, general mythology pages, homepages and search pages are forbidden. A source supports only what its object page visibly shows or explicitly documents. Do not use absence as evidence and do not infer a crown, pin, garment, color or hairstyle from an unrelated site overview.

Preserve every approved facial identity, ethnicity, bone structure, apparent age and appeal. Use only positive, compelling mythic impression language. Do not use weathered, rugged, feral, untamed, grizzled, sorrow-stricken, battle-hardened, haunting, haggard or sickly. Myrtilus must remain an intense, skilled charioteer without deliberate facial degradation.

Hair must be explicitly premodern and source-grounded. Do not use fade, undercut, bob, crop, pixie, slick/sleek, ponytail, crown braid, chignon, face-framing or jaw-level cut. Describe actual parted, bound, rolled, plaited, coiled, veiled or filleted construction.

Every row needs an ideal person-specific facial-hair decision. Do not roughen or age a face merely with beard. Women explicitly have no facial hair.

The crop shows head, neck and shoulders only. Do not mention chest, collarbones, torso, pectoral, breastplate, chestplate, gorget, pauldron, epaulet, neck guard, high collar, tailored garment, leather jerkin or unsupported armor. Plain evidence-limited woven linen/wool, shoulder drape, veil, headband, pin or helmet is preferable to invented elite ornament.

Do not repeat identical impression_en, hair_en or costume_en strings. Every review must preserve exact input order, target_id and slug and include 1-3 source URLs from the shared appearance source list plus a precise supported_features_ko list. No hands, objects, weapons or narrative props.`

function part1Prompt(file) {
  return `
You are correcting part 1 of 2 of a House of Atreus mythology portrait order. Read: ${file}
This half must establish the single shared visual frame and authoritative source set that part 2 will reuse.
${strictRules}

Return ONLY JSON:
{
  "tradition":"house-of-atreus",
  "visual_frame_ko":"2-4 Korean sentences",
  "evidence_level":"archaeological or responsible_reconstruction",
  "hair_beard_basis_ko":"2-4 Korean sentences",
  "costume_armor_basis_ko":"2-4 Korean sentences",
  "canonical_source_urls":["1-4 direct URLs"],
  "appearance_source_urls":["2-6 direct authoritative URLs"],
  "source_ledger":[{"url":"same appearance URL","object_or_page_title":"exact title","culture_and_date":"narrow culture/date","visible_or_documented_features":["exact features"]}],
  "audit_summary_ko":"2-5 Korean sentences",
  "reviews":[{"target_id":"exact","slug":"exact","verdict":"revise_for_accuracy","impression_en":"positive direct instruction","hair_en":"premodern arrangement","facial_hair_en":"explicit decision","costume_en":"visible evidence-limited direction","evidence_level":"archaeological or responsible_reconstruction","appearance_source_urls":["1-3 shared URLs"],"supported_features_ko":["exact supported features"],"historical_basis_ko":"1-3 Korean sentences","change_note_ko":"one Korean sentence"}]
}
`.trim()
}

function part2Prompt(file) {
  return `
You are correcting part 2 of 2 of a House of Atreus mythology portrait order. Read: ${file}
Use EXACTLY the shared visual frame, evidence level, source URLs and source ledger supplied in shared_part1_result. Do not add or replace sources and do not change period. Apply that evidence honestly to the remaining rows.
${strictRules}

Return ONLY JSON:
{"tradition":"house-of-atreus","reviews":[{"target_id":"exact","slug":"exact","verdict":"revise_for_accuracy","impression_en":"positive direct instruction","hair_en":"premodern arrangement","facial_hair_en":"explicit decision","costume_en":"visible evidence-limited direction","evidence_level":"archaeological or responsible_reconstruction","appearance_source_urls":["1-3 exact shared URLs"],"supported_features_ko":["exact supported features"],"historical_basis_ko":"1-3 Korean sentences","change_note_ko":"one Korean sentence"}]}
`.trim()
}

async function callOrRecover(inputFile, rawFile, resultFile, prompt) {
  if (existsSync(resultFile)) return readJson(resultFile).result
  let response
  if (existsSync(rawFile)) response = readFileSync(rawFile, 'utf8')
  else {
    response = await agyCall(prompt, {
      repoRoot: PROJECT_ROOT,
      docs: ['docs/project/production/image-generation.md', 'docs/project/celeb/celeb-avatar-spec.md', inputFile],
      timeoutMs: 1_500_000,
    })
    writeFileSync(rawFile, `${response}\n`, 'utf8')
  }
  const result = extractJson(response)
  writeJson(resultFile, { generated_at: new Date().toISOString(), provider: 'agy-antigravity', model: MODEL, result })
  return result
}

async function main() {
  mkdirSync(V3, { recursive: true })
  const input = readJson(INPUT)
  const part1Input = { ...input, split: '1/2', rows: input.rows.slice(0, 9) }
  writeJson(PART1_INPUT, part1Input)
  console.log(JSON.stringify({ event: 'atreus_part_start', part: 1, rows: part1Input.rows.length }))
  const part1 = await callOrRecover(PART1_INPUT, PART1_RAW, PART1_RESULT, part1Prompt(PART1_INPUT))
  if (!Array.isArray(part1.reviews) || part1.reviews.length !== 9) throw new Error(`part1 review 수량 ${part1.reviews?.length}/9`)
  console.log(JSON.stringify({ event: 'atreus_part_finish', part: 1, rows: part1.reviews.length }))

  const part2Input = {
    tradition: input.tradition,
    tradition_name_ko: input.tradition_name_ko,
    mandatory_rejection_reason: input.mandatory_rejection_reason,
    shared_part1_result: {
      visual_frame_ko: part1.visual_frame_ko,
      evidence_level: part1.evidence_level,
      hair_beard_basis_ko: part1.hair_beard_basis_ko,
      costume_armor_basis_ko: part1.costume_armor_basis_ko,
      canonical_source_urls: part1.canonical_source_urls,
      appearance_source_urls: part1.appearance_source_urls,
      source_ledger: part1.source_ledger,
    },
    split: '2/2',
    rows: input.rows.slice(9),
  }
  writeJson(PART2_INPUT, part2Input)
  console.log(JSON.stringify({ event: 'atreus_part_start', part: 2, rows: part2Input.rows.length }))
  const part2 = await callOrRecover(PART2_INPUT, PART2_RAW, PART2_RESULT, part2Prompt(PART2_INPUT))
  if (!Array.isArray(part2.reviews) || part2.reviews.length !== 8) throw new Error(`part2 review 수량 ${part2.reviews?.length}/8`)
  console.log(JSON.stringify({ event: 'atreus_part_finish', part: 2, rows: part2.reviews.length }))

  const combined = { ...part1, reviews: [...part1.reviews, ...part2.reviews] }
  writeJson(FINAL, { generated_at: new Date().toISOString(), provider: 'agy-antigravity', model: MODEL, split_calls: 2, result: combined })
  console.log(JSON.stringify({ event: 'atreus_split_complete', rows: combined.reviews.length, output: FINAL }))
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
