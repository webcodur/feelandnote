/**
 * AGY 1차 전승별 초상화 발주서를 다시 감사하고, 근거 없는 판타지 갑주·현대 헤어·
 * 얼굴 노화·타이트 크롭 충돌을 제거한 2차 결과를 별도 폴더에 저장한다.
 * 이미지·DB·R2는 건드리지 않는다.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const PROJECT_ROOT = path.resolve('C:\\project\\feelandnote')
const PROMPT_ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트')
const V1 = path.join(PROMPT_ROOT, '_agy-tradition-rework')
const V2 = path.join(PROMPT_ROOT, '_agy-tradition-rework-v2')
const MODEL = 'gemini-3.7-flash-high'
const EVIDENCE_LEVELS = new Set([
  'archaeological',
  'iconographic',
  'literary',
  'mixed',
  'responsible_reconstruction',
])
const VERDICTS = new Set(['keep_core_and_complete', 'revise_for_accuracy'])
const MODERN_HAIR = /\b(fade|high-and-tight|undercut|pompadour|crew cut|buzz cut|pixie|bob|wolf cut|mullet|salon|streetwear|face-framing|modern side part|contemporary fringe|slick-back|slicked-back)\b/iu
const FACIAL_HAIR_DECISION = /\b(beard|bearded|moustache|mustache|goatee|whiskers|clean-shaven|clean shaven|no facial hair|no human facial hair|facial plumage|muzzle fur|muzzle scales|beak feathers|beak plumage)\b/iu
const DEGRADING_APPEARANCE = /\b(ugly|haggard|cadaveric|sickly|deformed|grotesque|decayed|corpse-like|emaciated|rotting|lesions?)\b/iu
const CROP_CONFLICT = /\b(upper chest|across the chest|over the chest|chest visible|exposed chest|collarbones?|torso|pectoral|chestplate|breastplate|chest protector|chest harness)\b/iu
const INVENTED_NECK_ARMOR = /\b(gorget|neck[- ]guard|collar plate|flared neck|articulated neck|high[- ]neck(?:ed)?|high collar|covers the throat|snugly around the throat|wraps snugly around the neck|protective neck closure)\b/iu

const CHARACTER_CORRECTIONS = {
  rhea: 'Warm, protective, serene maternal presence. Do not make her sharp, formidable, severe, intimidating, or cold.',
  persephone: 'She must look unmistakably alive and healthy, with living spring vitality joined to underworld sovereignty. No corpse-like, cadaverous, ashen, sickly, or excessively somber treatment.',
  alcmene: 'Preserve the approved apparent age. Do not age her with mature, elderly, silver-haired, or heavily weathered language.',
  hecuba: 'Preserve the approved apparent age and natural reference hair color. No forced silver or grey hair and no exaggerated aged or grief-ravaged treatment; retain dignified queen-mother gravity.',
  anticlea: 'Preserve the approved apparent age and natural reference hair color. Do not force silver or grey hair merely because she is a mother or shade.',
  'bors-the-younger': 'Preserve the approved younger apparent age and natural reference hair color. Do not make him grizzled, grey, or elderly.',
  gaia: 'Preserve the approved age and natural reference hair color. Maternal primordial vitality, not an elderly crone.',
  hestia: 'Preserve the approved age and natural reference hair color. Quiet sacred warmth, not an elderly matron.',
  uranus: 'Use serene, expansive celestial calm and primordial dignity rather than aggression or harshness.',
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function extractJsonObject(text) {
  const cleaned = String(text ?? '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('AGY 응답에서 JSON 객체를 찾지 못했습니다.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function hasUnnegatedModernHair(value) {
  const text = String(value ?? '')
  const match = MODERN_HAIR.exec(text)
  if (!match) return false
  const prefix = text.slice(Math.max(0, match.index - 70), match.index).toLowerCase()
  return !/\b(no|not|never|without|avoid|exclude|remove|replace|reject|free from)\b/u.test(prefix)
}

function resultPath(root, index) {
  return path.join(root, `tradition-${String(index + 1).padStart(2, '0')}-result.json`)
}

function inputPath(root, index) {
  return path.join(root, `tradition-${String(index + 1).padStart(2, '0')}-input.json`)
}

function responsePath(root, index) {
  return path.join(root, `tradition-${String(index + 1).padStart(2, '0')}-response.txt`)
}

function loadBatches() {
  const batches = []
  for (let index = 0; ; index += 1) {
    const resultFile = resultPath(V1, index)
    const inputFile = inputPath(V1, index)
    if (!existsSync(resultFile) && !existsSync(inputFile)) break
    if (!existsSync(resultFile)) throw new Error(`1차 결과가 아직 없습니다: ${resultFile}`)
    if (!existsSync(inputFile)) throw new Error(`1차 입력이 없습니다: ${inputFile}`)
    const first = readJson(resultFile).result
    const original = readJson(inputFile)
    batches.push({ index, first, original })
  }
  if (batches.length !== 17) throw new Error(`1차 전승 결과 수량 오류: ${batches.length}/17`)
  return batches
}

function buildInput(batch) {
  const rowById = new Map(batch.original.rows.map((row) => [row.target_id, row]))
  return {
    tradition: batch.first.tradition,
    tradition_name_ko: batch.original.tradition_name_ko,
    first_pass_shared_review: {
      visual_frame_ko: batch.first.visual_frame_ko,
      evidence_level: batch.first.evidence_level,
      hair_beard_basis_ko: batch.first.hair_beard_basis_ko,
      costume_armor_basis_ko: batch.first.costume_armor_basis_ko,
      canonical_source_urls: batch.first.canonical_source_urls,
      appearance_source_urls: batch.first.appearance_source_urls,
    },
    rows: batch.first.reviews.map((review) => ({
      ...rowById.get(review.target_id),
      first_pass_review: review,
      mandatory_character_correction: CHARACTER_CORRECTIONS[review.slug] ?? null,
    })),
  }
}

function buildPrompt(batch, index, total, file) {
  return `
You are the final archaeological and iconographic audit editor for a mythology portrait production order.
Batch ${index + 1}/${total} is in this absolute JSON file: ${file}
Read it completely. The first-pass text is NOT trusted. It repeatedly invented impressive-sounding chestplates, pectorals, gorgets, neck guards, collar plates, high throat closures and cross-period court costume. Audit and rewrite it rather than defending it.

Use Google Search and OPEN the pages you rely on. Establish one coherent and honest visual frame for this tradition: archaeology when the material culture is attested, canonical temple/manuscript/print reception when the story is later or culturally received that way, and responsible reconstruction when neither fixes personal costume. Never describe a mythical person's clothes as directly attested.

For every appearance URL, identify the actual page or object title, culture/date, and exactly which visible feature it supports. If a source cannot support a named armor part, remove that armor part. A plain robe, mantle, veil, headdress, helmet or lower-crop hint is better than fabricated armor.

Return ONLY one valid JSON object, no markdown:
{
  "tradition": "exact input tradition",
  "visual_frame_ko": "2-4 concise Korean sentences",
  "evidence_level": "archaeological, iconographic, literary, mixed, or responsible_reconstruction",
  "hair_beard_basis_ko": "2-4 concise Korean sentences",
  "costume_armor_basis_ko": "2-4 concise Korean sentences that state chronology limits and do not overclaim",
  "canonical_source_urls": ["1-4 opened direct URLs"],
  "appearance_source_urls": ["2-6 opened direct object, manuscript, collection essay, excavation, heritage database, or academic URLs"],
  "source_ledger": [
    {
      "url": "an exact URL also present in appearance_source_urls",
      "object_or_page_title": "specific object or page title",
      "culture_and_date": "specific culture/reception frame and date or date range",
      "supports": ["only the visible hair, headdress, garment construction, textile, helmet, or armor features this page really supports"]
    }
  ],
  "audit_summary_ko": "2-5 Korean sentences naming the first-pass errors removed",
  "reviews": [
    {
      "target_id": "exact input ID",
      "slug": "exact input slug",
      "verdict": "keep_core_and_complete or revise_for_accuracy",
      "impression_en": "direct positive generation direction",
      "hair_en": "explicit premodern scalp-hair or canonical nonhuman covering direction",
      "facial_hair_en": "explicit beard, moustache, clean-shaven, or canonical nonhuman decision",
      "costume_en": "direct visible head-and-shoulders clothing, headdress and genuinely supported armor direction",
      "evidence_level": "archaeological, iconographic, literary, mixed, or responsible_reconstruction",
      "historical_basis_ko": "1-3 concise Korean sentences",
      "change_note_ko": "one concise Korean sentence"
    }
  ]
}

Non-negotiable audit rules:
1. FACE AND IMPRESSION: The approved facial reference wins. Preserve exact facial identity, ethnicity, bone structure, apparent age and natural hair color. Maintain or improve the approved mythic presence; never make the person older, uglier, generic, sickly, corpse-like, dirty or comical. Villains remain visually compelling. Obey every mandatory_character_correction literally.
2. PREMODERN HAIR: Replace every modern trace with a culture/frame-specific arrangement. Do not use modern haircut labels, even negatively. Describe parting, bound length, rolls, braids, topknot, ritual shaving, veil, crown or helmet exposure and the fall at ears/nape. Do not force silver, grey or white hair merely to signal wisdom, motherhood, kingship, tragedy or divinity.
3. FACIAL HAIR: Make a person-specific decision that overrides the reference. Do not add beard to age or roughen a face. Women and children explicitly have no facial hair. Nonhumans retain actual muzzle fur, whiskers, feathers, scales or beak plumage instead of a human beard. This field describes hair only, not skin, face, cheeks, jaw or age.
4. TIGHT CROP: The portrait shows face, full hair/headgear, neck and shoulders only. Costume text must not ask to show chest, collarbones, torso, pectorals, chestplates, breastplates, chest protectors or chest harnesses. Put any historically open neckline below the crop. Do not invent high collars or throat closures just to fill the lower frame.
5. ARMOR: Remove generic fantasy armor and every armor component not demonstrated by the source ledger for the selected culture and date. In this crop prefer a supported helmet, shoulder textile, mail/coif edge, scale/lamellar upper edge, shieldless ceremonial robe, or no armor. Never substitute Roman gear for Greek/Bronze-Age gear. Never import European gorgets or articulated neck armor into China, India, Mesopotamia, Greece or fiction-derived celestial armor.
6. CLOTHING: No modern tailoring, leather jerkin, cosplay, synthetic ornament language, invented neck guard, fake protective collar or arbitrary mixture of centuries. Name only visible materials, weave/drape/closure, mantle/veil/headgear and ornament supported by the chosen frame.
7. CHILD/NONHUMAN: Astyanax stays a living child. Animal-headed gods, vanaras, demons, birds, deer and reptiles keep canonical species anatomy. A horn or animal identity is not a detachable costume accessory.
8. SOURCES: Open every URL. No homepages, search pages, Pinterest, Fandom, Reddit, Quora, Tumblr, DeviantArt, costume shops, AI articles or unsourced galleries. appearance_source_urls and source_ledger must match exactly. Do not cite a museum object for features absent from that object.
9. INDIVIDUALITY: Do not repeat the same impression, hair or costume sentence across people. Respect role, gender and rank without using age as a shortcut.
10. FINAL SELF-CHECK: exact input order/count; every hair and facial-hair field filled; no modern hairstyle term; no crop-conflict term; no invented neck armor; no unsupported armor; no face aging; no source overclaim.
`.trim()
}

function validateUrls(label, urls, min, max) {
  if (!Array.isArray(urls) || urls.length < min || urls.length > max) throw new Error(`${label}: URL 수량 오류`)
  for (const url of urls) {
    if (typeof url !== 'string' || !/^https?:\/\//iu.test(url)) throw new Error(`${label}: URL 오류 ${url}`)
    if (/pinterest|fandom|reddit|quora|tumblr|deviantart|costume|wikia/iu.test(url)) throw new Error(`${label}: 금지 출처 ${url}`)
    const parsed = new URL(url)
    if (parsed.pathname === '/') throw new Error(`${label}: 홈페이지는 근거가 아님 ${url}`)
  }
}

function validateResult(batch, result) {
  if (result?.tradition !== batch.first.tradition) throw new Error(`${batch.first.tradition}: 전승 오류`)
  for (const field of ['visual_frame_ko', 'hair_beard_basis_ko', 'costume_armor_basis_ko', 'audit_summary_ko']) {
    if (typeof result[field] !== 'string' || !result[field].trim()) throw new Error(`${result.tradition}: 빈 필드 ${field}`)
  }
  if (!EVIDENCE_LEVELS.has(result.evidence_level)) throw new Error(`${result.tradition}: evidence_level 오류`)
  validateUrls(`${result.tradition} canonical_source_urls`, result.canonical_source_urls, 1, 4)
  validateUrls(`${result.tradition} appearance_source_urls`, result.appearance_source_urls, 2, 6)
  if (!Array.isArray(result.source_ledger) || result.source_ledger.length !== result.appearance_source_urls.length) {
    throw new Error(`${result.tradition}: appearance source ledger 수량 오류`)
  }
  const ledgerUrls = new Set(result.source_ledger.map((entry) => entry.url))
  for (const url of result.appearance_source_urls) {
    if (!ledgerUrls.has(url)) throw new Error(`${result.tradition}: ledger 누락 ${url}`)
  }
  for (const entry of result.source_ledger) {
    if (!entry.object_or_page_title || !entry.culture_and_date || !Array.isArray(entry.supports) || entry.supports.length < 1) {
      throw new Error(`${result.tradition}: 불완전 source ledger ${entry.url}`)
    }
  }
  if (!Array.isArray(result.reviews) || result.reviews.length !== batch.first.reviews.length) {
    throw new Error(`${result.tradition}: 인물 수량 오류 ${result.reviews?.length}/${batch.first.reviews.length}`)
  }
  for (const [index, review] of result.reviews.entries()) {
    const expected = batch.first.reviews[index]
    if (review.target_id !== expected.target_id || review.slug !== expected.slug) {
      throw new Error(`${result.tradition}: 순서·인물 오류 ${index} ${expected.slug} -> ${review.slug}`)
    }
    for (const field of ['impression_en', 'hair_en', 'facial_hair_en', 'costume_en', 'historical_basis_ko', 'change_note_ko']) {
      if (typeof review[field] !== 'string' || !review[field].trim()) throw new Error(`${review.slug}: 빈 필드 ${field}`)
    }
    if (!VERDICTS.has(review.verdict)) throw new Error(`${review.slug}: verdict 오류`)
    if (!EVIDENCE_LEVELS.has(review.evidence_level)) throw new Error(`${review.slug}: evidence_level 오류`)
    if (hasUnnegatedModernHair(review.hair_en)) throw new Error(`${review.slug}: 현대 헤어 표현 ${review.hair_en}`)
    if (!FACIAL_HAIR_DECISION.test(review.facial_hair_en)) throw new Error(`${review.slug}: 수염·안면 피복 결정 누락`)
    if (DEGRADING_APPEARANCE.test(`${review.impression_en} ${review.hair_en} ${review.costume_en}`)) {
      throw new Error(`${review.slug}: 인상 저하 표현`)
    }
    if (CROP_CONFLICT.test(`${review.hair_en} ${review.facial_hair_en} ${review.costume_en}`)) {
      throw new Error(`${review.slug}: 타이트 크롭 충돌 ${review.costume_en}`)
    }
    if (INVENTED_NECK_ARMOR.test(review.costume_en)) {
      throw new Error(`${review.slug}: 목 갑주·가짜 하이넥 표현 ${review.costume_en}`)
    }
  }
}

async function runBatch(batch, total) {
  const index = batch.index
  const inFile = inputPath(V2, index)
  const rawFile = responsePath(V2, index)
  const outFile = resultPath(V2, index)
  writeJson(inFile, buildInput(batch))
  if (existsSync(outFile)) {
    const saved = readJson(outFile)
    validateResult(batch, saved.result)
    console.log(JSON.stringify({ event: 'audit_resume', batch: index + 1, tradition: batch.first.tradition }))
    return saved.result
  }
  if (existsSync(rawFile)) {
    const result = extractJsonObject(readFileSync(rawFile, 'utf8'))
    validateResult(batch, result)
    writeJson(outFile, { generated_at: new Date().toISOString(), provider: 'agy-antigravity', model: MODEL, result })
    console.log(JSON.stringify({ event: 'audit_recovered', batch: index + 1, tradition: batch.first.tradition }))
    return result
  }
  console.log(JSON.stringify({ event: 'audit_start', batch: index + 1, total, tradition: batch.first.tradition, rows: batch.first.reviews.length }))
  const response = await agyCall(buildPrompt(batch, index, total, inFile), {
    repoRoot: PROJECT_ROOT,
    docs: [
      'docs/project/production/image-generation.md',
      'docs/project/celeb/celeb-avatar-spec.md',
      inFile,
    ],
    timeoutMs: 1_500_000,
  })
  writeFileSync(rawFile, `${response}\n`, 'utf8')
  const result = extractJsonObject(response)
  validateResult(batch, result)
  writeJson(outFile, { generated_at: new Date().toISOString(), provider: 'agy-antigravity', model: MODEL, result })
  console.log(JSON.stringify({ event: 'audit_finish', batch: index + 1, tradition: batch.first.tradition, rows: result.reviews.length }))
  return result
}

async function main() {
  mkdirSync(V2, { recursive: true })
  const batches = loadBatches()
  if (process.argv.includes('--validate-inputs')) {
    console.log(JSON.stringify({ batches: batches.length, rows: batches.reduce((sum, batch) => sum + batch.first.reviews.length, 0) }, null, 2))
    return
  }
  const results = []
  for (const batch of batches) results.push(await runBatch(batch, batches.length))
  console.log(JSON.stringify({ event: 'audit_repair_complete', traditions: results.length, rows: results.reduce((sum, result) => sum + result.reviews.length, 0), output: V2 }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
