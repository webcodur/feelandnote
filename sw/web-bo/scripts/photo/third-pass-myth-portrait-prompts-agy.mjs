/**
 * 2차 눈검수에서 출처 과장·시대 혼합·현대 헤어·판타지 갑주가 확인된 전승만
 * 권위 있는 직접 출처와 인물별 근거 연결을 강제하여 3차 재발주한다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const PROJECT_ROOT = path.resolve('C:\\project\\feelandnote')
const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트')
const V2 = path.join(ROOT, '_agy-tradition-rework-v2')
const V3 = path.join(ROOT, '_agy-tradition-rework-v3')
const MODEL = 'gemini-3.7-flash-high'
const SELECTED = new Set([5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17])
const EVIDENCE_LEVELS = new Set(['archaeological', 'iconographic', 'literary', 'mixed', 'responsible_reconstruction'])
const VERDICTS = new Set(['keep_core_and_complete', 'revise_for_accuracy'])
const WEAK_SOURCE = /(?:^|\.)(?:wikipedia\.org|worldhistory\.org|theoi\.com|topostext\.org|pinterest\.[a-z.]+|fandom\.com|reddit\.com|quora\.com|tumblr\.com|deviantart\.com)$/iu
const MODERN_HAIR = /\b(fade|high-and-tight|undercut|pompadour|crew cut|buzz cut|pixie|bob|wolf cut|mullet|salon|streetwear|face-framing|modern side part|contemporary fringe|slick|sleek|ponytail|crown braid|chignon|jaw-level|cropped|crop cut|blowout)\b/iu
const DEGRADING = /\b(ugly|haggard|cadaveric|sickly|deformed|grotesque|decayed|corpse-like|emaciated|rotting|weathered|rugged|feral|untamed|grizzled|sorrow-stricken|battle-hardened|haunting)\b/iu
const BAD_COSTUME = /\b(gorget|pectoral|epaulets?|pauldrons?|neck[- ]guard|collar plate|chestplate|breastplate|chest protector|chest harness|upper chest|across the chest|over the chest|collarbones?|torso|high[- ]neck(?:ed)?|high collar|tailored|tailoring|leather jerkin|plate armor|fantasy armor)\b/iu
const FACIAL_HAIR_DECISION = /\b(beard|bearded|moustache|mustache|goatee|whiskers|clean-shaven|clean shaven|no facial hair|no human facial hair|facial plumage|muzzle fur|muzzle scales|beak feathers|beak plumage|rictal bristles)\b/iu
const NEGATIVE_DIRECTION = /\b(avoid|without|never|do not|don't|no modern|not modern|free of)\b/iu

const REJECTION_REASONS = {
  5: 'The Iliad pass mixed Late Bronze Age archaeology with later Greek reception and relied on a popular-history summary for clothing. Rebuild from one coherent frame and direct archaeological or museum evidence. Hecuba must retain approved age and natural hair color without grief-ravaged aging; Meriones needs a groomed, ideal warrior beard.',
  7: 'The House of Atreus pass relied entirely on popular-history summaries and overclaimed specific fresco details. Rebuild from direct museum, excavation, or academic object records. Myrtilus must remain compelling and must not be weathered or degraded.',
  8: 'The Fengshen pass falsely treated Shang-Zhou objects as evidence for later crossover robes and invented scale epaulets. Use one coherent Ming or other documented canonical reception frame for the novel and religious iconography; do not fake Western Zhou costume archaeology.',
  9: 'The Journey to the West pass retained pauldrons, generic metallic shoulder armor, later kingfisher crown details and modern tailoring language. Use one coherent documented Ming or early Qing canonical reception frame and direct iconographic sources.',
  11: 'The Mahabharata pass mixed Gupta, Kushan, Mughal and generic armour material, repeated neck collars, invented crowns and gave Shikhandi a sleek ponytail. Choose one coherent documented reception frame and remove unsupported armour and ornaments.',
  12: 'The Ramayana pass mixed Gupta sculpture with 17th-18th century Rajput/Pahari manuscripts and invented jeweled antlers and neck ornaments. Choose one coherent manuscript or sculptural reception frame and keep all nonhumans anatomically canonical.',
  13: 'The Japan pass relied on Wikipedia for armour, mixed Kofun reconstruction with modern miko language, and invented sakaki, cherry-gold, pearl, abalone and stone ornaments. Use one Kofun archaeological reconstruction frame with direct museum or heritage sources and plain evidence-limited clothing.',
  14: 'The Korea frame and AKS sources are sound. Retain the Joseon shaman-painting reception frame, but remove English modern-tailoring language, describe Korean hair by actual premodern arrangement rather than salon vocabulary, and replace Cheonjiwang’s unsupported gold sun-and-moon diadem with a documented iconographic crown.',
  15: 'The Mesopotamia pass used only Wikipedia, spanned almost two millennia, and repeated horned crowns, kaunakes and square beards for nearly everyone while inventing deity-specific metalwork. Choose one coherent documented period or one coherent canonical reception corpus and use direct museum object pages.',
  16: 'The Norse pass used popular-history pages, repeated center parts and modern fantasy braids, and degraded faces with weathered, rugged and feral language. Use direct museum, excavation, or academic sources from one Viking-period frame and keep every approved face ideal and compelling.',
  17: 'The Aeneid pass mixed Early Iron Age Latium with a c. 400 manuscript and overclaimed clothing from archaeological place pages. Choose either one Late Antique Virgil manuscript reception frame or one archaeological Roman/Italic frame, not both.',
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function fileFor(root, batch, kind) {
  return path.join(root, `tradition-${String(batch).padStart(2, '0')}-${kind}.${kind === 'response' ? 'txt' : 'json'}`)
}

function extractJsonObject(text) {
  const source = String(text ?? '').trim()
  const fenced = [...source.matchAll(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/giu)]
  if (fenced.length > 0) return JSON.parse(fenced.at(-1)[1])
  const cleaned = source.replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('AGY 응답에서 JSON 객체를 찾지 못했습니다.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function loadBatches() {
  return [...SELECTED].sort((a, b) => a - b).map((batch) => {
    const second = readJson(fileFor(V2, batch, 'result')).result
    const input = readJson(fileFor(V2, batch, 'input'))
    return { batch, second, input }
  })
}

function buildInput(item) {
  const inputRows = new Map(item.input.rows.map((row) => [row.target_id, row]))
  return {
    batch: item.batch,
    tradition: item.second.tradition,
    tradition_name_ko: item.input.tradition_name_ko,
    mandatory_rejection_reason: REJECTION_REASONS[item.batch],
    rejected_second_pass: item.second,
    rows: item.second.reviews.map((review) => ({
      ...inputRows.get(review.target_id),
      rejected_review: review,
    })),
  }
}

function buildPrompt(item, ordinal, total, inputFile) {
  return `
You are the final evidence editor for mythology portrait production orders. This is corrective call ${ordinal}/${total}.
Read the complete required input JSON at: ${inputFile}
The second pass was rejected for the explicit mandatory_rejection_reason in that file. Do not preserve its costume, hair, source frame, source list, or repeated template merely because it sounds plausible.

Research again with Google Search and OPEN every cited page. First choose ONE coherent archaeological period OR ONE coherent canonical visual-reception corpus for this tradition. Do not blend distant centuries. Mythical individuals have no excavated personal wardrobe: label archaeological analogy and canonical reception honestly.

Appearance sources must be direct object, manuscript, excavation, collection essay, official heritage database, or peer-reviewed academic pages. Wikipedia, World History Encyclopedia, Theoi, ToposText, general mythology sites, search pages and homepages are forbidden. A source page may support only features actually visible or explicitly documented on it. Absence is not evidence. Never cite a place page as proof of a garment.

Return ONLY one valid JSON object:
{
  "tradition": "exact tradition slug",
  "visual_frame_ko": "2-4 Korean sentences naming exactly one coherent period or reception corpus and its limits",
  "evidence_level": "archaeological, iconographic, literary, mixed, or responsible_reconstruction",
  "hair_beard_basis_ko": "2-4 concise Korean sentences",
  "costume_armor_basis_ko": "2-4 concise Korean sentences; state what was removed and do not overclaim",
  "canonical_source_urls": ["1-4 opened direct URLs"],
  "appearance_source_urls": ["2-6 opened authoritative direct URLs, all inside the chosen visual frame"],
  "source_ledger": [
    {
      "url": "exact URL also in appearance_source_urls",
      "object_or_page_title": "exact title",
      "culture_and_date": "specific culture and narrow date/date range",
      "visible_or_documented_features": ["only directly visible or explicitly documented features"]
    }
  ],
  "audit_summary_ko": "2-5 Korean sentences explaining the rejected errors and final correction",
  "reviews": [
    {
      "target_id": "exact input ID",
      "slug": "exact input slug",
      "verdict": "keep_core_and_complete or revise_for_accuracy",
      "impression_en": "positive direct instruction preserving or improving the approved mythic face",
      "hair_en": "explicit premodern arrangement or canonical nonhuman covering",
      "facial_hair_en": "explicit ideal person-specific beard, moustache, clean-shaven, or canonical nonhuman decision",
      "costume_en": "evidence-limited visible head, neck and shoulder direction",
      "evidence_level": "archaeological, iconographic, literary, mixed, or responsible_reconstruction",
      "appearance_source_urls": ["1-3 exact URLs from the shared appearance_source_urls that directly support this row"],
      "supported_features_ko": ["the exact hair, headdress, garment, textile, closure, helmet or ornament supported for this row"],
      "historical_basis_ko": "1-3 concise Korean sentences separating evidence from reconstruction",
      "change_note_ko": "one concise Korean sentence"
    }
  ]
}

Final rules:
1. FACE: Preserve exact approved facial identity, ethnicity, bone structure, apparent age and overall appeal. Improve or maintain the mythic impression through expression, grooming and presentation. Do not age, roughen, sicken, exhaust, deform or caricature. Villains and monsters remain intentional, magnetic and formidable.
2. IMPRESSION LANGUAGE: Use positive image-generation language. Do not use weathered, rugged, feral, untamed, grizzled, sorrow-stricken, battle-hardened, haunting, corpse-like, haggard or sickly. Do not use age words as shortcuts unless the input identity is canonically an elder.
3. HAIR: Scalp hair overrides the reference and must be unmistakably premodern within the chosen frame. Describe actual construction: part, bound length, wrapped or coiled knot, documented side loops, braids, ritual shaving, veil, crown or helmet exposure. Do not use modern haircut or salon vocabulary: fade, undercut, bob, crop, pixie, crew cut, slick/sleek, ponytail, crown braid, chignon, face-framing, jaw-level cut or product-styled hair. Preserve natural reference hair color unless canonical identity absolutely fixes another.
4. FACIAL HAIR: Decide separately for each person. Use an ideal groomed form appropriate to role and iconography. Do not add facial hair simply to age or brutalize a face. Women and children explicitly have no facial hair. Nonhumans use actual muzzle fur, whiskers, feathers, scales or bristles rather than human beards.
5. COSTUME: The crop shows face, complete hair/headgear, neck and shoulders only. Do not mention chest, collarbones, torso, pectorals, breastplates or chestplates. Do not invent a high collar to hide the crop. Put any open neckline below the crop.
6. NO FANTASY HARDWARE: No gorget, pauldron, epaulet, neck guard, collar plate, fantasy armor, leather jerkin, arbitrary metal shoulder guard, invented horned helmet, invented jeweled crown, arbitrary gemstones, animal crests or symbolic ornament. A named item is allowed only when a row-level source directly supports that visible item in the chosen frame.
7. NO MODERN TAILORING: Do not use tailored/tailoring, stand collar, fitted jacket, modern seam language or cosplay phrasing. Describe attested drape, weave, wrap, pin, brooch, robe, veil, tunic, mantle, cap or helmet.
8. ONE FRAME: Every appearance source and every row must remain within the one chosen period or reception corpus. Canonical text URLs may be older, but they cannot be used as material-culture evidence. If evidence is sparse, use a plain shared frame-common garment and mark responsible reconstruction instead of importing another century.
9. SOURCE-ROW LINK: Every row needs 1-3 appearance source URLs and a precise supported_features_ko list. Do not assign a source to a row if it lacks that feature. All appearance URLs must appear once in source_ledger.
10. NONHUMANS/CHILD: Preserve canonical species anatomy and child age. Horns, antlers, feathers, fur and scales are body anatomy when canonical, not detachable ornaments. Do not shrink the face to fit them.
11. DISTINCTNESS: Do not repeat a single beard, central-part braid, crown, robe or three-adjective impression template across the whole cast. Exact duplicate impression, hair, facial-hair or costume strings are forbidden.
12. SELF-CHECK: exact input order/count and IDs; one frame; authoritative opened URLs; no weak domain; no unsupported detail; no modern hair; no degrading wording; no crop conflict; no fantasy hardware.
`.trim()
}

function validateUrl(url, label) {
  if (typeof url !== 'string' || !/^https?:\/\//iu.test(url)) throw new Error(`${label}: URL 오류 ${url}`)
  const parsed = new URL(url)
  if (parsed.pathname === '/') throw new Error(`${label}: 홈페이지 금지 ${url}`)
  if (WEAK_SOURCE.test(parsed.hostname)) throw new Error(`${label}: 약한 출처 금지 ${url}`)
}

function validateResult(item, result) {
  if (result?.tradition !== item.second.tradition) throw new Error(`${item.second.tradition}: 전승 오류`)
  for (const field of ['visual_frame_ko', 'hair_beard_basis_ko', 'costume_armor_basis_ko', 'audit_summary_ko']) {
    if (typeof result[field] !== 'string' || !result[field].trim()) throw new Error(`${result.tradition}: 빈 필드 ${field}`)
  }
  if (!EVIDENCE_LEVELS.has(result.evidence_level)) throw new Error(`${result.tradition}: evidence_level 오류`)
  if (!Array.isArray(result.canonical_source_urls) || result.canonical_source_urls.length < 1 || result.canonical_source_urls.length > 4) throw new Error(`${result.tradition}: canonical URL 수량`)
  if (!Array.isArray(result.appearance_source_urls) || result.appearance_source_urls.length < 2 || result.appearance_source_urls.length > 6) throw new Error(`${result.tradition}: appearance URL 수량`)
  result.canonical_source_urls.forEach((url) => validateUrl(url, `${result.tradition} canonical`))
  result.appearance_source_urls.forEach((url) => validateUrl(url, `${result.tradition} appearance`))
  if (!Array.isArray(result.source_ledger) || result.source_ledger.length !== result.appearance_source_urls.length) throw new Error(`${result.tradition}: source ledger 수량`)
  const ledgerUrls = new Set(result.source_ledger.map((entry) => entry.url))
  if (ledgerUrls.size !== result.source_ledger.length) throw new Error(`${result.tradition}: source ledger URL 중복`)
  for (const url of result.appearance_source_urls) if (!ledgerUrls.has(url)) throw new Error(`${result.tradition}: source ledger 누락 ${url}`)
  for (const entry of result.source_ledger) {
    if (!entry.object_or_page_title || !entry.culture_and_date || !Array.isArray(entry.visible_or_documented_features) || entry.visible_or_documented_features.length < 1) throw new Error(`${result.tradition}: source ledger 불완전 ${entry.url}`)
  }
  if (!Array.isArray(result.reviews) || result.reviews.length !== item.second.reviews.length) throw new Error(`${result.tradition}: 인물 수량 ${result.reviews?.length}/${item.second.reviews.length}`)
  const seen = { impression_en: new Set(), hair_en: new Set(), costume_en: new Set() }
  for (const [index, review] of result.reviews.entries()) {
    const expected = item.second.reviews[index]
    if (review.target_id !== expected.target_id || review.slug !== expected.slug) throw new Error(`${result.tradition}: 순서·ID 오류 ${index} ${expected.slug} -> ${review.slug}`)
    for (const field of ['impression_en', 'hair_en', 'facial_hair_en', 'costume_en', 'historical_basis_ko', 'change_note_ko']) {
      if (typeof review[field] !== 'string' || !review[field].trim()) throw new Error(`${review.slug}: 빈 필드 ${field}`)
    }
    if (!VERDICTS.has(review.verdict) || !EVIDENCE_LEVELS.has(review.evidence_level)) throw new Error(`${review.slug}: 판정 필드 오류`)
    if (!Array.isArray(review.appearance_source_urls) || review.appearance_source_urls.length < 1 || review.appearance_source_urls.length > 3) throw new Error(`${review.slug}: 인물별 출처 수량`)
    for (const url of review.appearance_source_urls) if (!ledgerUrls.has(url)) throw new Error(`${review.slug}: 공유 출처 밖 URL ${url}`)
    if (!Array.isArray(review.supported_features_ko) || review.supported_features_ko.length < 1) throw new Error(`${review.slug}: supported_features 누락`)
    if (MODERN_HAIR.test(review.hair_en)) throw new Error(`${review.slug}: 현대 헤어 ${review.hair_en}`)
    if (DEGRADING.test(`${review.impression_en} ${review.hair_en} ${review.facial_hair_en} ${review.costume_en}`)) throw new Error(`${review.slug}: 인상 저하 표현`)
    if (BAD_COSTUME.test(review.costume_en)) throw new Error(`${review.slug}: 복식·크롭 금지 표현 ${review.costume_en}`)
    if (NEGATIVE_DIRECTION.test(`${review.impression_en} ${review.hair_en} ${review.costume_en}`)) throw new Error(`${review.slug}: 부정형 생성 지시`)
    if (!FACIAL_HAIR_DECISION.test(review.facial_hair_en)) throw new Error(`${review.slug}: 수염 결정 누락`)
    for (const field of Object.keys(seen)) {
      const normalized = review[field].toLowerCase().replace(/\s+/gu, ' ').trim()
      if (seen[field].has(normalized)) throw new Error(`${result.tradition}: ${field} 완전 중복 ${review.slug}`)
      seen[field].add(normalized)
    }
  }
}

async function runBatch(item, ordinal, total) {
  const inputFile = fileFor(V3, item.batch, 'input')
  const rawFile = fileFor(V3, item.batch, 'response')
  const resultFile = fileFor(V3, item.batch, 'result')
  writeJson(inputFile, buildInput(item))
  if (existsSync(resultFile)) {
    const saved = readJson(resultFile)
    validateResult(item, saved.result)
    console.log(JSON.stringify({ event: 'third_resume', batch: item.batch, tradition: item.second.tradition }))
    return saved.result
  }
  if (existsSync(rawFile)) {
    const result = extractJsonObject(readFileSync(rawFile, 'utf8'))
    validateResult(item, result)
    writeJson(resultFile, { generated_at: new Date().toISOString(), provider: 'agy-antigravity', model: MODEL, result })
    console.log(JSON.stringify({ event: 'third_recovered', batch: item.batch, tradition: item.second.tradition }))
    return result
  }
  console.log(JSON.stringify({ event: 'third_start', ordinal, total, batch: item.batch, tradition: item.second.tradition, rows: item.second.reviews.length }))
  const response = await agyCall(buildPrompt(item, ordinal, total, inputFile), {
    repoRoot: PROJECT_ROOT,
    docs: ['docs/project/production/image-generation.md', 'docs/project/celeb/celeb-avatar-spec.md', inputFile],
    timeoutMs: 1_500_000,
  })
  writeFileSync(rawFile, `${response}\n`, 'utf8')
  const result = extractJsonObject(response)
  validateResult(item, result)
  writeJson(resultFile, { generated_at: new Date().toISOString(), provider: 'agy-antigravity', model: MODEL, result })
  console.log(JSON.stringify({ event: 'third_finish', batch: item.batch, tradition: item.second.tradition, rows: result.reviews.length }))
  return result
}

async function main() {
  mkdirSync(V3, { recursive: true })
  const batches = loadBatches()
  if (process.argv.includes('--validate-inputs')) {
    console.log(JSON.stringify({ traditions: batches.length, rows: batches.reduce((sum, item) => sum + item.second.reviews.length, 0), batches: batches.map((item) => ({ batch: item.batch, tradition: item.second.tradition, rows: item.second.reviews.length })) }, null, 2))
    return
  }
  const results = []
  for (const [index, item] of batches.entries()) results.push(await runBatch(item, index + 1, batches.length))
  console.log(JSON.stringify({ event: 'third_pass_complete', traditions: results.length, rows: results.reduce((sum, result) => sum + result.reviews.length, 0), output: V3 }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
