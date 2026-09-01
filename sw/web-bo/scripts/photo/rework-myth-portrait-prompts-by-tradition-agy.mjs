/**
 * 신화 인물 개인 초상화 발주서를 전승별 물질문화 기준으로 재검수·개편한다.
 * 얼굴 신원은 보존하고 인상·헤어·수염·복식만 재설계한다. 이미지·DB·R2는 수정하지 않는다.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { agyCall } from '../../../../.agents/skills/agy-antigravity/scripts/agy-call.mjs'

const PROJECT_ROOT = path.resolve('C:\\project\\feelandnote')
const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates')
const PROMPT_ROOT = path.join(ROOT, '개인초상화-프롬프트')
const PROMPTS_PATH = path.join(PROMPT_ROOT, 'portrait-prompts.json')
const TARGETS_PATH = path.join(ROOT, 'avatar-null-targets.json')
const WORK = process.env.MYTH_PROMPT_REWORK_DIR
  ? path.resolve(process.env.MYTH_PROMPT_REWORK_DIR)
  : path.join(PROMPT_ROOT, '_agy-tradition-rework')
const BY_TRADITION = path.join(PROMPT_ROOT, '전승별')
const MODEL = 'gemini-3.7-flash-high'
const EVIDENCE_LEVELS = new Set([
  'archaeological',
  'iconographic',
  'literary',
  'mixed',
  'responsible_reconstruction',
])
const VERDICTS = new Set(['keep_core_and_complete', 'revise_for_accuracy'])
const MODERN_HAIR = /\b(fade|high-and-tight|undercut|pompadour|crew cut|buzz cut|pixie|bob|wolf cut|mullet|salon|streetwear|face-framing|modern side part|contemporary fringe)\b/iu
const FACIAL_HAIR_DECISION = /\b(beard|bearded|moustache|mustache|goatee|whiskers|clean-shaven|clean shaven|no facial hair|no human facial hair|facial plumage|muzzle fur|muzzle scales|beak feathers)\b/iu
const FACE_REWRITE = /\b(skin|complexion|face shape|facial structure|youthful|elderly)\b/iu
const DEGRADING_APPEARANCE = /\b(ugly|haggard|cadaveric|sickly|deformed|grotesque|decayed|corpse-like|emaciated|rotting|lesions?)\b/iu
const BROWSER_VERIFIED_URLS = new Set([
  'https://emuseum.nich.go.jp/detail?langId=en&content_base_id=100200',
  'https://emuseum.nich.go.jp/detail?langId=en&content_base_id=100564',
  'https://emuseum.nich.go.jp/detail?langId=en&content_base_id=100577',
  'https://emuseum.nich.go.jp/detail?langId=en&content_base_id=100578',
  'https://emuseum.nich.go.jp/detail?langId=en&content_base_id=100600',
  'https://emuseum.nich.go.jp/detail?langId=en&content_base_id=101410',
  'https://www.metmuseum.org/art/collection/search/443300',
  'https://www.metmuseum.org/art/collection/search/447844',
  'https://www.metmuseum.org/art/collection/search/547334',
])

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/gu, ' ').trim()
}

function hasUnnegatedModernHair(value) {
  const text = String(value ?? '')
  const match = MODERN_HAIR.exec(text)
  if (!match) return false
  const prefix = text.slice(Math.max(0, match.index - 70), match.index).toLowerCase()
  return !/\b(no|not|never|without|avoid|exclude|remove|replace|reject|free from)\b/u.test(prefix)
}

function extractJsonObject(text) {
  const cleaned = String(text ?? '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  const start = cleaned.indexOf('{')
  const end = cleaned.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('AGY 응답에서 JSON 객체를 찾지 못했다.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function buildRows() {
  const current = readJson(PROMPTS_PATH)
  const targets = readJson(TARGETS_PATH).targets
  const targetById = new Map(targets.map((target) => [target.id, target]))
  if (current.prompts.length !== 198) throw new Error(`현재 프롬프트 수량 오류: ${current.prompts.length}`)
  const rows = current.prompts.map((prompt) => {
    const target = targetById.get(prompt.target_id)
    if (!target) throw new Error(`${prompt.slug}: 원본 인물 정보 누락`)
    return {
      target_id: prompt.target_id,
      slug: prompt.slug,
      name_ko: prompt.name_ko,
      name_en: prompt.name_en,
      gender: target.gender_label,
      title_ko: prompt.title_ko,
      title_en: prompt.title_en,
      bio_ko: target.bio,
      bio_en: target.bio_en,
      tradition: prompt.tradition,
      tradition_name_ko: prompt.tradition_name_ko,
      reference_kind: prompt.reference_kind,
      reference_image: prompt.reference_image,
      iconography_reference_image: prompt.iconography_reference_image,
      iconography_reference_url: prompt.iconography_reference_url,
      iconography_reference_controls_en: prompt.iconography_reference_controls_en,
      direction_ko: prompt.direction_ko,
      quality_note_ko: prompt.quality_note_ko,
      current_art_direction: prompt.art_direction,
      current_prompt: prompt,
    }
  })
  return { current, rows }
}

function buildBatches(rows) {
  const byTradition = new Map()
  for (const row of rows) {
    const batch = byTradition.get(row.tradition) ?? {
      tradition: row.tradition,
      tradition_name_ko: row.tradition_name_ko,
      rows: [],
    }
    batch.rows.push(row)
    byTradition.set(row.tradition, batch)
  }
  return [...byTradition.values()]
}

function compactInput(row) {
  return {
    target_id: row.target_id,
    slug: row.slug,
    name_ko: row.name_ko,
    name_en: row.name_en,
    gender: row.gender,
    title_ko: row.title_ko,
    title_en: row.title_en,
    bio_ko: row.bio_ko,
    bio_en: row.bio_en,
    reference_kind: row.reference_kind,
    current_direction_ko: row.direction_ko,
    current_costume_en: row.current_art_direction.costume_en,
  }
}

function batchStem(index) {
  return `tradition-${String(index + 1).padStart(2, '0')}`
}

function inputFile(index) {
  return path.join(WORK, `${batchStem(index)}-input.json`)
}

function responseFile(index) {
  return path.join(WORK, `${batchStem(index)}-response.txt`)
}

function resultFile(index) {
  return path.join(WORK, `${batchStem(index)}-result.json`)
}

function buildPrompt(batch, index, total, inputPath) {
  return `
You are the senior historical costume researcher and portrait art director revising one mythology tradition as a coherent production set.
The required input JSON for batch ${index + 1}/${total} is in this absolute file: ${inputPath}
Read it now. Research the tradition's material culture and canonical visual reception ONCE, establish a defensible visual frame and source set, then apply it individually to every row. Do not perform the same generic web search again for each person.

Use Google Search and actually open the cited pages. Prefer direct museum object pages, museum collection essays, manuscript records, excavation or archaeological databases, university art-history resources, official cultural heritage databases and reliable editions of canonical texts. The figures are mythical, so never pretend that their personal clothing survives. Clearly separate attested period or iconographic comparators from responsible reconstruction.

Return ONLY one valid JSON object with exactly this structure. No markdown or commentary:
{
  "tradition": "exact input tradition slug",
  "visual_frame_ko": "2-4 Korean sentences naming the chosen visual period or canonical reception frame and why it is the responsible choice",
  "evidence_level": "archaeological, iconographic, literary, mixed, or responsible_reconstruction",
  "hair_beard_basis_ko": "2-4 Korean sentences describing the attested or reconstructed hair and facial-hair conventions used across this set",
  "costume_armor_basis_ko": "2-4 Korean sentences describing the attested or reconstructed clothing, headdress and armor conventions and important chronology limits",
  "canonical_source_urls": ["1-4 direct URLs for the tradition, canonical text or received iconography"],
  "appearance_source_urls": ["2-6 direct URLs for named objects, manuscripts, collection essays, excavations, official databases or focused academic discussions supporting the visual frame"],
  "reviews": [
    {
      "target_id": "exact input target_id",
      "slug": "exact input slug",
      "verdict": "keep_core_and_complete or revise_for_accuracy",
      "impression_en": "direct generation instruction preserving the approved facial identity while maintaining or improving the character-specific heroic, noble, sacred, charismatic, wise, beautiful or formidable ideal",
      "hair_en": "explicit premodern scalp-hair arrangement for this exact person, including what remains visible under any crown, veil or helmet",
      "facial_hair_en": "explicit culturally and personally appropriate beard, moustache or clean-shaven decision; women and children explicitly have no facial hair; nonhumans specify canonical muzzle fur, whiskers, feathers or scales without a human beard",
      "costume_en": "revised direct generation instruction for culturally responsible clothing, supported neckline or closure, headdress, rank materials and armor when genuinely appropriate",
      "evidence_level": "archaeological, iconographic, literary, mixed, or responsible_reconstruction",
      "historical_basis_ko": "1-3 concise Korean sentences explaining how the shared tradition evidence was applied to this individual's hair, facial hair, rank, role, clothing and armor",
      "change_note_ko": "one concise Korean sentence stating what was retained or corrected"
    }
  ]
}

Mandatory rules:
1. IMPRESSION: The face reference is already approved. Preserve facial structure, identity, apparent age and ethnicity. Never degrade it into an older, uglier, cadaveric, sickly, haggard, dirty, generic or comical version. Maintain or improve mythic presence through grooming, expression, clothing and photographic presentation without changing bone structure or applying a synthetic beauty filter. Villains remain visually compelling and intentional.
2. HAIR: Every row requires an explicit premodern arrangement. Scalp hair is NOT identity-locked to the reference. Replace every modern trace. Do not use modern haircut taxonomy such as fade, undercut, bob, crop, pixie, crew cut, buzz cut, face-framing layers, salon cut, product-styled slick-back or contemporary side part, even in a negative sentence. Describe actual arrangement: parting, waves, bound locks, braids, coils, rolls, topknot, ritual shaving, tonsure, veil, circlet, helmet exposure, and fall around the ears or nape. Make the silhouette unmistakably tied to the chosen visual frame. Preserve natural reference hair color unless canonical evidence requires another color.
3. FACIAL HAIR: Every row requires an explicit decision, and it overrides the reference. Specify clean-shaven, stubble-free, moustache, short beard, full beard, forked beard, ritual beard, or canonical nonhuman facial covering. Do not give every god, king, sage, warrior and youth the same beard. Do not use a beard merely to make someone older or rougher. facial_hair_en describes hair only: never skin, complexion, face, cheeks, facial structure, jawline, age or beauty. For a clean-shaven person, simply say clean-shaven with no beard, moustache or stubble.
4. CLOTHING AND ARMOR: Audit the current costume rather than polishing it blindly. Check culture, chronology, climate, gender, rank and role. Remove generic fantasy armor, cross-cultural mixing, Roman substitutions for Greek material, modern tailoring, stage cosplay, invented high-neck undergarments and armor parts from the wrong century. Verify every named armor component against the shared appearance sources. Choose garment density for the individual: one main garment or one partial drape is often enough for warm-climate ancient figures; light, fluid, rough, furred or feathered material may define a divine or nonhuman figure; armor, priestly regalia, cold-weather layers and culturally inherent robe layers remain only when they explain this exact role. Camera crop—not extra closures, mantles, pins, collars or armor—keeps collarbones and chest outside the image. Ordinary fastening remains below the crop, while a canonical ornament may appear when it identifies this exact person.
5. MYTH VERSUS HISTORY: If no fixed date exists, choose one coherent visual frame grounded in the culture's archaeology, period art, temple or manuscript iconography, or canonical reception history. Mark it honestly as reconstruction. Do not mix centuries merely because separate elements look impressive.
6. NONHUMANS AND CHILD: Do not adultify Astyanax. Do not humanize animal-headed gods, vanaras, demons, birds, deer or reptiles. Preserve species anatomy. Translate hair and facial-hair fields into canonical fur, mane, feathers, crest, whiskers or scales.
7. SOURCES: canonical_source_urls may use reliable text and iconography resources. appearance_source_urls must support the visual frame and may be shared by the whole tradition. Do not return Pinterest, Fandom, Reddit, Quora, Tumblr, DeviantArt, costume shops, AI articles, unsourced galleries or a website home page. Open every URL before returning it.
8. AVATAR LIMITS: One subject. No hands, held objects, weapons, tools, books, extra people, companion animals, narrative scenery or readable text. Hair, headdress and armor must not force the face to shrink.
9. DIRECT LANGUAGE: English fields are positive, concrete image-generation instructions. Never use alternatives or vague phrases such as "historically accurate" without visible detail.
10. SELF-CHECK: Before returning, verify exact input order and count, no missing hair or facial-hair decision, no modern hairstyle term, no facial rewriting in facial_hair_en, and no unattested armor or fake high collar.
`.trim()
}

function validateUrls(label, urls, min, max) {
  if (!Array.isArray(urls) || urls.length < min || urls.length > max) throw new Error(`${label}: URL 수량 오류`)
  for (const url of urls) {
    if (typeof url !== 'string' || !/^https?:\/\//iu.test(url)) throw new Error(`${label}: URL 오류 ${url}`)
    if (/pinterest|fandom|reddit|quora|tumblr|deviantart|costume|wikia/iu.test(url)) throw new Error(`${label}: 금지 출처 ${url}`)
    const parsed = new URL(url)
    if (parsed.pathname === '/') throw new Error(`${label}: 사이트 첫 화면은 근거가 아님 ${url}`)
  }
}

function validateResult(batch, result) {
  if (!result || result.tradition !== batch.tradition) throw new Error(`${batch.tradition}: 전승 신원 오류`)
  for (const field of ['visual_frame_ko', 'hair_beard_basis_ko', 'costume_armor_basis_ko']) {
    if (typeof result[field] !== 'string' || !result[field].trim()) throw new Error(`${batch.tradition}: 빈 필드 ${field}`)
  }
  if (!EVIDENCE_LEVELS.has(result.evidence_level)) throw new Error(`${batch.tradition}: evidence_level 오류`)
  validateUrls(`${batch.tradition} canonical_source_urls`, result.canonical_source_urls, 1, 4)
  validateUrls(`${batch.tradition} appearance_source_urls`, result.appearance_source_urls, 2, 6)
  if (!Array.isArray(result.reviews) || result.reviews.length !== batch.rows.length) {
    throw new Error(`${batch.tradition}: 재심사 수량 오류 ${result.reviews?.length}/${batch.rows.length}`)
  }
  for (const [index, review] of result.reviews.entries()) {
    const input = batch.rows[index]
    if (review.target_id !== input.target_id || review.slug !== input.slug) {
      throw new Error(`${batch.tradition}: 순서·신원 오류 ${index} ${input.slug} -> ${review.slug}`)
    }
    for (const field of ['impression_en', 'hair_en', 'facial_hair_en', 'costume_en', 'historical_basis_ko', 'change_note_ko']) {
      if (typeof review[field] !== 'string' || !review[field].trim()) throw new Error(`${review.slug}: 빈 필드 ${field}`)
    }
    if (!VERDICTS.has(review.verdict)) throw new Error(`${review.slug}: verdict 오류 ${review.verdict}`)
    if (!EVIDENCE_LEVELS.has(review.evidence_level)) throw new Error(`${review.slug}: evidence_level 오류`)
    if (hasUnnegatedModernHair(review.hair_en)) throw new Error(`${review.slug}: 현대 헤어 표현 ${review.hair_en}`)
    if (!FACIAL_HAIR_DECISION.test(review.facial_hair_en)) throw new Error(`${review.slug}: 수염·안면 피복 결정 누락`)
    if (FACE_REWRITE.test(review.facial_hair_en)) throw new Error(`${review.slug}: 수염 필드의 얼굴 재서술 ${review.facial_hair_en}`)
    if (DEGRADING_APPEARANCE.test(`${review.impression_en} ${review.hair_en} ${review.costume_en}`)) {
      throw new Error(`${review.slug}: 인상 저하 표현 잔존`)
    }
  }
}

async function runBatch(batch, index, total) {
  const inFile = inputFile(index)
  const rawFile = responseFile(index)
  const outFile = resultFile(index)
  writeJson(inFile, {
    tradition: batch.tradition,
    tradition_name_ko: batch.tradition_name_ko,
    rows: batch.rows.map(compactInput),
  })
  if (existsSync(outFile)) {
    const saved = readJson(outFile)
    validateResult(batch, saved.result)
    console.log(JSON.stringify({ event: 'tradition_resume', batch: index + 1, tradition: batch.tradition, rows: batch.rows.length }))
    return saved.result
  }
  if (existsSync(rawFile)) {
    const result = extractJsonObject(readFileSync(rawFile, 'utf8'))
    validateResult(batch, result)
    writeJson(outFile, {
      generated_at: new Date().toISOString(),
      provider: 'agy-antigravity',
      model: MODEL,
      result,
    })
    console.log(JSON.stringify({ event: 'tradition_recovered', batch: index + 1, tradition: batch.tradition, rows: batch.rows.length }))
    return result
  }
  console.log(JSON.stringify({ event: 'tradition_start', batch: index + 1, total, tradition: batch.tradition, rows: batch.rows.length }))
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
  writeJson(outFile, {
    generated_at: new Date().toISOString(),
    provider: 'agy-antigravity',
    model: MODEL,
    result,
  })
  console.log(JSON.stringify({ event: 'tradition_finish', batch: index + 1, tradition: batch.tradition, rows: batch.rows.length }))
  return result
}

function referenceBlock(row) {
  if (row.reference_kind === 'no_reference_human') {
    const originalCasting = `NO FACIAL IDENTITY REFERENCE — ORIGINAL CASTING REQUIRED\nNo facial model is approved for this character. Create a new, original face appropriate to the character's specified age, gender, cultural tradition and individual impression. Do not imitate a recognizable real person, actor, celebrity or a generic modern fashion model.`
    if (!row.iconography_reference_image) return originalCasting
    const iconography = `MYTH ICONOGRAPHY IMAGE — INDIVIDUAL DESIGN ONLY\nUse this exact attached image as the myth-iconography reference: ${row.iconography_reference_image}\nIt controls ${row.iconography_reference_controls_en}.\nIt does not control facial identity, crop, narrative composition, props, hands, extra figures, text, watermark, or background.`
    return `${originalCasting}\n\n${iconography}`
  }
  if (row.reference_kind === 'face_identity') {
    const face = `REFERENCE IMAGE — FACIAL IDENTITY ONLY\nUse this exact image as the sole facial-identity reference: ${row.reference_image}\nPreserve facial structure, identity, apparent age and ethnicity. Do not copy the reference crop, camera angle, expression, background, clothing, scalp hair, facial hair, eyewear, jewelry or headwear. The HAIR and FACIAL HAIR directions below override the reference. Maintain or improve the approved mythic impression through grooming, costume, expression and light without changing bone structure or applying a synthetic beauty filter.`
    if (!row.iconography_reference_image) return face
    const iconography = `MYTH ICONOGRAPHY IMAGE — INDIVIDUAL DESIGN ONLY\nUse this exact second image as the myth-iconography reference: ${row.iconography_reference_image}\nIt controls ${row.iconography_reference_controls_en}.\nThe facial-identity image still controls the face. This myth image does not control facial identity, crop, narrative composition, props, hands, extra figures, text, watermark, or background.`
    return `${face}\n\n${iconography}`
  }
  if (row.reference_kind === 'iconographic_child_reference') {
    return `REFERENCE IMAGE — CHILD IDENTITY AND AGE\nUse this exact iconographic reference: ${row.reference_image}\nPreserve the child's identity, age and Trojan royal context. Render a living child photographed by a modern camera. Ignore the source crop, pose, background and medium. Do not adultify the child.`
  }
  if (row.reference_kind === 'iconographic_nonhuman_reference') {
    return `REFERENCE IMAGE — CANONICAL NONHUMAN IDENTITY\nUse this exact iconographic reference: ${row.reference_image}\nPreserve the canonical species, head anatomy and identity. Ignore the source medium and create a living physical being photographed by a modern camera. The grooming directions refine canonical fur, feathers, crest, mane, whiskers or scales; never humanize the head or reduce it to a costume accessory.`
  }
  return 'NO REFERENCE IMAGE — CANONICAL NONHUMAN DESIGN\nDesign the canonical adult female vanara queen Tara from the Ramayana: a living female vanara with coherent primate anatomy, royal intelligence and dignity. She is not the Buddhist goddess Tara and not a human woman wearing animal accessories.'
}

function supportingArtDirection(row) {
  const lighting_background_en = row.current_art_direction.lighting_background_en
    .replace(/\bhigh collar\b/giu, 'face and shoulder line')
    .replace(/\bweathered[- ]stone\b/giu, 'ancient stone')
    .replace(/\bweathered[- ]limestone\b/giu, 'ancient limestone')
    .replace(/\brugged textures\b/giu, 'handworked textures')
    .replace(/\bcoarse fabric textures\b/giu, 'handwoven fabric textures')
    .replace(/\bthe neck armor\b/giu, 'the face and shoulder line')
    .replace(/\bthe bronze collar\b/giu, 'the woven shoulder drape')
    .replace(/\bthe craft of the bronze armor\b/giu, 'the woven shoulder folds and bronze fastenings')
    .replace(/\bthe collar and armor\b/giu, 'the face, headwear, and woven shoulder drape')
    .replace(/\bthe horn and armor\b/giu, 'the canonical horns and woven shoulder drape')
    .replace(/\bthe bronze armor plates\b/giu, 'the martial cap and woven shoulder folds')
    .replace(/\bthe collar and skullcap\b/giu, 'the skullcap and woven shoulder drape')
    .replace(/\bthe silk collar\b/giu, 'the silk shoulder drape')
    .replace(/\bthe silver collar\b/giu, 'the royal headwear and woven shoulder drape')
    .replace(/\bthe dark metallic collar\b/giu, 'the hair binding and woven shoulder drape')
    .replace(/\bthe collar\b/giu, 'the face and woven shoulder drape')
  const pose_expression_en = row.current_art_direction.pose_expression_en
    .replace(/\bbattle-hardened\b/giu, 'composed martial')
    .replace(/\brugged\b/giu, 'grounded')
    .replace(/\bweathered\b/giu, 'deeply experienced')
    .replace(/\bferal\b/giu, 'primal')
    .replace(/\buntamed\b/giu, 'commanding')
    .replace(/\bsorrowful\b/giu, 'solemn')
    .replace(/\bhaunting\b/giu, 'magnetic')
  return {
    lighting_background_en,
    pose_expression_en,
    mythic_treatment_en: `Use restrained, physically plausible atmospheric light to reinforce ${row.name_en}'s distinct mythic identity.`,
  }
}

function compilePrompt(row, review) {
  const framingStart = row.current_prompt.prompt.indexOf('FRAMING —')
  if (framingStart < 0) throw new Error(`${row.slug}: 기존 프레임 블록 누락`)
  const lowerEdgeDirection = '- At the lower edge, show only the character-specific material described above in broad, quiet shapes. A named canonical ornament may appear as a subordinate detail. An open neckline may continue below the crop. The face remains visually dominant.'
  const cropDirection = 'The tight camera crop places the collarbone and chest outside the image and keeps the visible torso short while preserving the natural level of the described neckline.'
  const fixedTail = row.current_prompt.prompt.slice(framingStart)
    .replace(
      '- Below the chin or lower jaw, a little neck, fur, feathers, a high collar, a robe, a helmet neck guard, pauldrons or long hair may fill the remaining space. Do NOT pull the camera back to fit the shoulders.',
      lowerEdgeDirection,
    )
    .replace(
      '- Below the chin or lower jaw, only a little neck, canonical fur or feathers, explicitly specified garment drape or armor edge, veil ties, or long hair may fill the remaining space. Do NOT pull the camera back to fit the shoulders.',
      lowerEdgeDirection,
    )
    .replace(
      '- At the lower edge, show the character-specific material described above in broad, quiet shapes. Ordinary garment fastening sits below the crop; only a named canonical ornament appears. An open neckline may continue below the crop. The face remains visually dominant.',
      lowerEdgeDirection,
    )
    .replace(
      'The collarbone and chest are NOT visible, and the torso is never long. The garment closes high around the neck where clothing is applicable.',
      cropDirection,
    )
    .replace(
      'The collarbone and chest are NOT visible, and the torso is never long. Follow the historically supported neckline, closure, mantle, veil, coif, torc, collar, gorget or armor specified above. Keep any exposed lower neckline below the tight crop instead of inventing a modern or unattested high collar.',
      cropDirection,
    )
    .replace(
      'The collarbone and chest are NOT visible, and the torso is never long. Follow only the neckline, closure, mantle, veil, headwear, jewelry, or armor explicitly specified above. Keep any exposed lower neckline below the tight crop instead of inventing a modern or unattested high collar.',
      cropDirection,
    )
    .replace(
      'The collarbone and chest stay outside the image because of the tight camera crop, and the torso is never long. Clothing does not rise or multiply merely to fill the lower frame.',
      cropDirection,
    )
  const supporting = supportingArtDirection(row)
  return [
    `CHARACTER — ${row.name_en} (${row.name_ko})\nTradition: ${row.tradition_name_ko} / ${row.tradition}\nRole: ${row.title_en ?? row.title_ko ?? ''}`,
    referenceBlock(row),
    `IMPRESSION AND GROOMING\nIMPRESSION: ${review.impression_en}\nHAIR: ${review.hair_en}\nFACIAL HAIR: ${review.facial_hair_en}`,
    `INDIVIDUAL ART DIRECTION\n${review.costume_en}\n${supporting.lighting_background_en}\n${supporting.pose_expression_en}\n${supporting.mythic_treatment_en}`,
    fixedTail,
  ].join('\n\n')
}

function validateGlobal(rows, results) {
  const reviews = results.flatMap((result) => result.reviews)
  if (reviews.length !== rows.length) throw new Error(`최종 재심사 수량 오류 ${reviews.length}/${rows.length}`)
  const ids = new Set(reviews.map((review) => review.target_id))
  const slugs = new Set(reviews.map((review) => review.slug))
  if (ids.size !== rows.length || slugs.size !== rows.length) throw new Error('최종 재심사 ID·slug 중복')
  for (const field of ['impression_en', 'hair_en', 'costume_en']) {
    const seen = new Map()
    const duplicates = []
    for (const review of reviews) {
      const value = normalize(review[field])
      const prior = seen.get(value)
      if (prior) duplicates.push([prior, review.slug])
      else seen.set(value, review.slug)
    }
    if (duplicates.length > 0) throw new Error(`${field} 완전 중복 ${JSON.stringify(duplicates)}`)
  }
}

async function auditSourceUrls(results) {
  const urls = [...new Set(results.flatMap((result) => [
    ...result.canonical_source_urls,
    ...result.appearance_source_urls,
  ]))]
  const checks = []
  let cursor = 0
  const workers = Array.from({ length: 8 }, async () => {
    while (cursor < urls.length) {
      const url = urls[cursor]
      cursor += 1
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'user-agent': 'Mozilla/5.0 FeelAndNote portrait-source-audit' },
          signal: AbortSignal.timeout(20_000),
        })
        checks.push({ url, status: response.status, reachable: response.status < 500 })
        try { await response.body?.cancel() } catch { /* 이미 닫힘 */ }
      } catch (error) {
        if (BROWSER_VERIFIED_URLS.has(url)) {
          checks.push({ url, status: null, reachable: true, verification: 'browser_verified_official_page', fetch_error: error.message })
        } else {
          checks.push({ url, status: null, reachable: false, error: error.message })
        }
      }
    }
  })
  await Promise.all(workers)
  checks.sort((a, b) => a.url.localeCompare(b.url))
  writeJson(path.join(WORK, 'source-url-audit.json'), {
    checked_at: new Date().toISOString(),
    total: checks.length,
    reachable: checks.filter((check) => check.reachable).length,
    failed: checks.filter((check) => !check.reachable).length,
    checks,
  })
  return checks
}

function markdownText(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ').trim()
}

function writeOutputs(base, rows, results) {
  const manuallyFinalized = path.basename(WORK) === '_agy-tradition-rework-final'
  const outputProvider = manuallyFinalized ? 'agy-antigravity+codex-manual-finalization' : 'agy-antigravity'
  const outputModel = manuallyFinalized ? `${MODEL} + gpt-5.6 manual finalization` : MODEL
  const resultByTradition = new Map(results.map((result) => [result.tradition, result]))
  const reviewByTarget = new Map(results.flatMap((result) => result.reviews).map((review) => [review.target_id, review]))
  const prompts = rows.map((row) => {
    const traditionReview = resultByTradition.get(row.tradition)
    const review = reviewByTarget.get(row.target_id)
    const supporting = supportingArtDirection(row)
    return {
      ...row.current_prompt,
      art_direction: {
        ...row.current_art_direction,
        costume_en: review.costume_en,
        ...supporting,
      },
      appearance_direction: {
        impression_en: review.impression_en,
        hair_en: review.hair_en,
        facial_hair_en: review.facial_hair_en,
      },
      historical_review: {
        verdict: review.verdict,
        evidence_level: review.evidence_level,
        historical_basis_ko: review.historical_basis_ko,
        change_note_ko: review.change_note_ko,
        tradition_visual_frame_ko: traditionReview.visual_frame_ko,
        hair_beard_basis_ko: traditionReview.hair_beard_basis_ko,
        costume_armor_basis_ko: traditionReview.costume_armor_basis_ko,
        canonical_source_urls: traditionReview.canonical_source_urls,
        appearance_source_urls: traditionReview.appearance_source_urls,
      },
      prompt: compilePrompt(row, review),
    }
  })
  writeJson(PROMPTS_PATH, {
    ...base,
    generated_at: new Date().toISOString(),
    provider: outputProvider,
    model: outputModel,
    appearance_revision: {
      completed: true,
      method: 'tradition_material_culture_review',
      criteria: ['impression_preservation_or_improvement', 'premodern_hair', 'explicit_facial_hair', 'costume_and_armor_chronology'],
    },
    prompts,
  })

  const traditions = [...new Set(prompts.map((prompt) => prompt.tradition))]
  const indexLines = [
    '# 신화 인물 개인 초상화 프롬프트',
    '',
    manuallyFinalized
      ? `AGY \`${MODEL}\` 초안을 바탕으로 ${prompts.length}명 전원을 인상·고대 헤어·수염·복식 및 갑주 고증 기준으로 검수했으며, 근거 과장이 남은 전승은 GPT가 수동 최종화한 이미지 생성 발주서다.`
      : `AGY \`${MODEL}\`이 ${prompts.length}명 전원을 인상·고대 헤어·수염·복식 및 갑주 고증 기준으로 개편한 이미지 생성 발주서다.`,
    '',
    '- 얼굴 REF는 얼굴 골격과 신원만 보존하며, 헤어와 수염은 인물별 개편 지시가 우선한다.',
    '- 전승별 시각 기준과 물질문화 출처를 먼저 확정하고 인물별로 적용했다.',
    '- 이미지 생성·DB·R2 반영은 하지 않았다.',
    '- 기계용 전체 데이터: `portrait-prompts.json`',
    '',
    '## 전승별 발주서',
    '',
  ]
  for (const tradition of traditions) {
    const traditionRows = prompts.filter((prompt) => prompt.tradition === tradition)
    const filename = `${tradition}.md`
    indexLines.push(`- [${traditionRows[0].tradition_name_ko ?? tradition} ${traditionRows.length}명](./전승별/${filename})`)
    const review = traditionRows[0].historical_review
    const lines = [
      `# ${traditionRows[0].tradition_name_ko ?? tradition} 개인 초상화 프롬프트`,
      '',
      `- 시각 기준: ${markdownText(review.tradition_visual_frame_ko)}`,
      `- 헤어·수염 기준: ${markdownText(review.hair_beard_basis_ko)}`,
      `- 복식·갑주 기준: ${markdownText(review.costume_armor_basis_ko)}`,
      '- 정본·도상 출처:',
      ...review.canonical_source_urls.map((url) => `  - ${url}`),
      '- 외형 고증 출처:',
      ...review.appearance_source_urls.map((url) => `  - ${url}`),
      '',
    ]
    for (const prompt of traditionRows) {
      lines.push(
        `## ${prompt.name_ko} · ${prompt.name_en}`,
        '',
        `- ID: \`${prompt.target_id}\``,
        `- REF: ${prompt.reference_image ? `\`${prompt.reference_image}\`` : '없음 — 정본에 맞춰 자율 설계'}`,
        `- 구상: ${markdownText(prompt.direction_ko)}`,
        `- 개편: ${markdownText(prompt.historical_review.change_note_ko)}`,
        `- 인물별 근거: ${markdownText(prompt.historical_review.historical_basis_ko)}`,
        '',
        '```text',
        prompt.prompt,
        '```',
        '',
      )
    }
    writeFileSync(path.join(BY_TRADITION, filename), `${lines.join('\n')}\n`, 'utf8')
  }
  writeFileSync(path.join(PROMPT_ROOT, 'README.md'), `${indexLines.join('\n')}\n`, 'utf8')
  return prompts
}

async function main() {
  mkdirSync(WORK, { recursive: true })
  mkdirSync(BY_TRADITION, { recursive: true })
  const { current, rows } = buildRows()
  const batches = buildBatches(rows)
  if (process.argv.includes('--validate-inputs')) {
    console.log(JSON.stringify({
      rows: rows.length,
      traditions: batches.length,
      batches: batches.map((batch, index) => ({ batch: index + 1, tradition: batch.tradition, rows: batch.rows.length })),
    }, null, 2))
    return
  }
  const results = []
  for (const [index, batch] of batches.entries()) results.push(await runBatch(batch, index, batches.length))
  validateGlobal(rows, results)
  const sourceChecks = await auditSourceUrls(results)
  const failed = sourceChecks.filter((check) => !check.reachable)
  if (failed.length > 0) throw new Error(`출처 URL 연결 실패 ${failed.length}건. ${path.join(WORK, 'source-url-audit.json')} 확인 필요`)
  const prompts = writeOutputs(current, rows, results)
  console.log(JSON.stringify({
    event: 'tradition_rework_complete',
    prompts: prompts.length,
    traditions: results.length,
    source_urls: sourceChecks.length,
    output: PROMPTS_PATH,
  }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
