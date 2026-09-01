/**
 * 승인된 신화 인물 초상화 프롬프트를 인상·헤어·수염·복식 고증 기준으로 AGY 재심사한다.
 * 이미지·DB·R2는 수정하지 않는다.
 *
 * 실행: node scripts/photo/revise-myth-portrait-prompts-agy.mjs
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
const WORK = path.join(PROMPT_ROOT, '_agy-appearance-revision')
const BY_TRADITION = path.join(PROMPT_ROOT, '전승별')
const MODEL = 'gemini-3.7-flash-high'
const MAX_BATCH_SIZE = 15
const CHIN_TARGETS = new Set([77, 81, 85])
const ROTATIONS = new Set([
  'frontal 0 degrees',
  'left 8 degrees',
  'right 8 degrees',
  'left 15 degrees',
  'right 15 degrees',
])
const EVIDENCE_LEVELS = new Set([
  'archaeological',
  'iconographic',
  'literary',
  'mixed',
  'responsible_reconstruction',
])
const VERDICTS = new Set(['keep_core_and_complete', 'revise_for_accuracy'])
const MODERN_HAIR = /\b(fade|high-and-tight|undercut|pompadour|crew cut|buzz cut|pixie|bob|wolf cut|mullet|modern|contemporary|salon|streetwear|face-framing)\b/iu
const FACIAL_HAIR_DECISION = /\b(beard|bearded|moustache|mustache|goatee|whiskers|clean-shaven|clean shaven|no facial hair|no human facial hair|facial plumage|muzzle fur)\b/iu

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function extractJsonArray(text) {
  const cleaned = String(text ?? '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('AGY 응답에서 JSON 배열을 찾지 못했다.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function buildRows() {
  const current = readJson(PROMPTS_PATH)
  const targets = readJson(TARGETS_PATH).targets
  const targetById = new Map(targets.map((target) => [target.id, target]))
  if (current.prompts.length !== 198) throw new Error(`현재 프롬프트 수량 오류: ${current.prompts.length}`)
  return current.prompts.map((prompt) => {
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
      direction_ko: prompt.direction_ko,
      quality_note_ko: prompt.quality_note_ko,
      current_art_direction: prompt.art_direction,
      current_prompt: prompt,
    }
  })
}

function buildBatches(rows) {
  const byTradition = new Map()
  for (const row of rows) {
    const list = byTradition.get(row.tradition) ?? []
    list.push(row)
    byTradition.set(row.tradition, list)
  }
  const batches = []
  for (const [tradition, traditionRows] of byTradition) {
    for (let start = 0; start < traditionRows.length; start += MAX_BATCH_SIZE) {
      batches.push({ tradition, rows: traditionRows.slice(start, start + MAX_BATCH_SIZE) })
    }
  }
  return batches
}

function batchStem(index) {
  return `batch-${String(index + 1).padStart(2, '0')}`
}

function inputFile(index) {
  return path.join(WORK, `${batchStem(index)}-input.json`)
}

function resultFile(index) {
  return path.join(WORK, `${batchStem(index)}-v3-result.json`)
}

function responseFile(index) {
  return path.join(WORK, `${batchStem(index)}-v3-response.txt`)
}

function hasUnnegatedModernHair(value) {
  const text = String(value ?? '')
  const match = MODERN_HAIR.exec(text)
  if (!match) return false
  const prefix = text.slice(Math.max(0, match.index - 60), match.index).toLowerCase()
  return !/\b(no|not|never|without|avoid|exclude|remove|replace|reject|free from)\b/u.test(prefix)
}

function poseMatchesRotation(pose, rotation) {
  const text = String(pose ?? '').toLowerCase()
  if (rotation === 'frontal 0 degrees') return /\b(frontal|front-facing|zero degrees|0 degrees)\b/u.test(text)
  const [direction, degrees] = rotation.split(' ')
  const degreePattern = degrees === '8' ? /\b(8|eight)\b/u : /\b(15|fifteen)\b/u
  return text.includes(direction) && degreePattern.test(text)
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
    tradition: row.tradition,
    reference_kind: row.reference_kind,
    reference_image: row.reference_image,
    current_direction_ko: row.direction_ko,
    current_quality_note_ko: row.quality_note_ko,
    current_art_direction: row.current_art_direction,
  }
}

function buildReviewPrompt(index, total, inputPath) {
  return `
You are the senior historical costume researcher and portrait art director reviewing mythology avatar prompts.
The input JSON for review batch ${index + 1}/${total} is in this absolute file and has already been provided as a required document:
${inputPath}

Research every character separately with Google Search before deciding. Do not rely only on the supplied draft. Prefer museum collections, archaeological or art-historical institutions, university resources, official cultural encyclopedias, and reliable primary-text or specialist sources. Open the cited pages and make sure each URL supports the stated cultural, period, iconographic, clothing, hair, beard, armor, or rank decision. Do not use Pinterest, Fandom, Reddit, Quora, Tumblr, DeviantArt, generic costume shops, AI-generated articles, or unsourced image galleries.

This is a corrective pass. The facial identity reference remains approved, but scalp hair and facial hair are NOT identity-locked and must be redesigned. Return ONLY one valid JSON array, preserving input order and returning exactly one object for every input row. No markdown, preface, commentary, or trailing text.

Return exactly these fields per row:
{
  "target_id": "exact input target_id",
  "slug": "exact input slug",
  "verdict": "keep_core_and_complete or revise_for_accuracy",
  "impression_en": "direct generation instruction that preserves the approved facial identity while maintaining or improving its heroic, noble, sacred, charismatic, wise, beautiful, or formidable ideal appropriate to this individual",
  "hair_en": "explicit culturally and chronologically suitable scalp-hair arrangement; replace any modern reference hairstyle; describe visible hair even under a crown, veil or helmet",
  "facial_hair_en": "explicit beard/moustache/clean-shaven decision suited to this exact person and culture; women and children explicitly have no facial hair; nonhuman beings explicitly preserve canonical muzzle fur, whiskers, feathers or scales without an invented human beard",
  "costume_en": "revised direct generation instruction for culturally and chronologically responsible clothing, supported neckline or closure, headdress, armor and materials; keep collarbones outside the tight crop without inventing a high collar",
  "lighting_background_en": "revised or retained direct lighting and simple separable background instruction",
  "pose_expression_en": "revised or retained direct gaze, rotation and expression instruction",
  "mythic_treatment_en": "one restrained canonical supernatural signature expressed without props or visual clutter",
  "chin_target": 77,
  "rotation": "frontal 0 degrees",
  "evidence_level": "archaeological, iconographic, literary, mixed, or responsible_reconstruction",
  "historical_basis_ko": "2-4 concise Korean sentences distinguishing attested evidence from responsible reconstruction and explaining the hair, beard and costume decision",
  "character_source_urls": ["1-2 direct authoritative URLs for the character, canonical text, or received iconography"],
  "appearance_source_urls": ["1-3 direct museum, archaeology, art-history, university, or official heritage URLs supporting the selected hair, facial-hair, dress, armor, and visual-period frame"],
  "change_note_ko": "one concise Korean sentence stating what was retained or corrected"
}

Non-negotiable review criteria:
1. IMPRESSION: Never degrade the approved face into an older, uglier, cadaveric, sickly, haggard, dirty, generic or comical version. Preserve facial structure, identity, apparent age and ethnicity. Maintain or improve the subject's ideal mythic presence through grooming, expression, light and styling, without changing bone structure or applying a plastic beauty filter. A villain may be dangerous or severe, but must remain visually compelling and deliberate rather than accidentally unattractive.
2. HAIR: Every row needs an explicit hair decision. No trace of a modern fade, undercut, salon cut, contemporary side part, modern bob, modern fringe, buzz cut, pompadour, product-styled slick-back, or present-day fashion silhouette. Do not use present-day haircut taxonomy such as bob, crop, pixie, crew cut, face-framing layers, medium-length haircut, or short haircut even when negating it. Describe the actual period arrangement visible in the cited artifact or image: parting, braids, bound locks, rolls, coils, topknot, veil, circlet, helmet exposure, tonsure, ritual shaving, natural waves, and exact fall around ears or nape. Make the silhouette unmistakably premodern. If exact evidence does not survive, use the most responsible period reconstruction and admit that in historical_basis_ko. Preserve the reference's natural hair color unless canonical evidence specifically requires another color.
3. FACIAL HAIR: Every row needs an explicit decision. Do not preserve or omit a beard merely because of the face reference. Direct clean-shaven, stubble-free, moustache, short beard, full beard, forked beard, ritual beard, or canonical nonhuman facial covering as appropriate. Do not use facial hair to make the subject needlessly older or rougher. A deity, king, sage, warrior and youth should not all receive the same beard formula. State only the hair decision and grooming. For a clean-shaven person, write only that the subject is clean-shaven with no beard, moustache or stubble. Never mention skin, complexion, face, cheeks, facial structure, jawline, apparent age or beauty in facial_hair_en.
4. CLOTHING AND ARMOR: Check culture, chronology, sex, rank and role. Distinguish historically attested dress from later canonical iconography and from responsible reconstruction. Remove anachronistic fantasy armor, cross-cultural mixing, generic medieval clothing, Roman substitutions for Greek material, modern tailoring and stage-cosplay construction. Armor is used only when appropriate to the portrayed role and period. Verify the date and construction of every named armor component; for example, do not move a later mail standard, gorget, plate collar, doublet or cotehardie into an earlier visual frame. The avatar crop must hide collarbones and chest, but NEVER invent an unattested high-necked undergarment merely to satisfy that crop. Use attested closures, layering, cloaks, veils, mantles, coifs, collars or armor when appropriate; otherwise place the historically supported open neckline below the tight crop.
5. MYTHIC FIGURES WITHOUT A FIXED HISTORICAL DATE: Do not pretend certainty. Choose an explicit visual frame grounded in the relevant culture's surviving archaeology, period art, canonical temple/illustration tradition, or the text's reception history, and label the evidence level honestly.
6. FACE REFERENCES: For reference_kind face_identity, do not describe new facial features, complexion, age, ethnicity, body build or attractiveness traits. impression_en may direct presence, grooming, expression and photographic treatment. Hair and facial_hair directions override the reference image.
7. CHILD AND NONHUMAN REFERENCES: Do not adultify the child or humanize animal-headed gods, vanaras, demons, birds, deer, reptiles or other canonical beings. Their species anatomy is identity-locked. Adapt hair/facial_hair fields to canonical fur, feathers, mane, crest, whiskers or scales.
8. AVATAR LIMITS: One subject, direct camera gaze, frontal to 15 degrees only, no hands, no held objects, weapons, tools, books, animals beside the subject, extra people, narrative scenery or readable text. Headdresses and armor must not shrink the face in the frame.
9. VARIATION: Preserve useful variation in rotation, expression, lighting, background hue and chin target. chin_target is exactly 77, 81 or 85. rotation is exactly frontal 0 degrees, left 8 degrees, right 8 degrees, left 15 degrees or right 15 degrees. pose_expression_en must state the same rotation value.
10. EVIDENCE: character_source_urls establish the person's text or canonical iconography. appearance_source_urls separately establish the chosen period's material culture, hair, facial hair, clothing, armor, headdress or visual convention. A literary source alone is not appearance evidence. Each appearance URL must be a direct page for a named artifact, manuscript, collection essay, excavation, object database record or focused academic discussion. Do not return a website home page, a search page, Wikipedia, Britannica, World History Encyclopedia, Theoi, ToposText or another general overview as appearance evidence. If direct evidence for the mythical individual does not exist, cite a period comparator from a museum, archaeological, art-historical, university or official heritage source and explicitly label the design as reconstruction. Open every URL before returning it.
11. DIRECT LANGUAGE: All *_en fields are concrete positive generation instructions, never analysis, alternatives, or vague phrases such as "historically accurate" without visual detail.

Read the input file now, research every row, self-check all source URLs and constraints, then emit the JSON array only.
`.trim()
}

function validateReview(inputs, reviews) {
  if (!Array.isArray(reviews) || reviews.length !== inputs.length) {
    throw new Error(`AGY 재심사 수량 오류: input=${inputs.length}, output=${reviews?.length}`)
  }
  const stringFields = [
    'target_id',
    'slug',
    'verdict',
    'impression_en',
    'hair_en',
    'facial_hair_en',
    'costume_en',
    'lighting_background_en',
    'pose_expression_en',
    'mythic_treatment_en',
    'rotation',
    'evidence_level',
    'historical_basis_ko',
    'change_note_ko',
  ]
  for (const [index, review] of reviews.entries()) {
    const input = inputs[index]
    if (review.target_id !== input.target_id || review.slug !== input.slug) {
      throw new Error(`AGY 재심사 순서·신원 오류 ${index}: ${input.slug} -> ${review.slug}`)
    }
    for (const field of stringFields) {
      if (typeof review[field] !== 'string' || !review[field].trim()) {
        throw new Error(`${input.slug}: AGY 재심사 빈 필드 ${field}`)
      }
    }
    if (!VERDICTS.has(review.verdict)) throw new Error(`${input.slug}: verdict 오류 ${review.verdict}`)
    if (!EVIDENCE_LEVELS.has(review.evidence_level)) throw new Error(`${input.slug}: evidence_level 오류 ${review.evidence_level}`)
    if (!CHIN_TARGETS.has(review.chin_target)) throw new Error(`${input.slug}: chin_target 오류 ${review.chin_target}`)
    if (!ROTATIONS.has(review.rotation)) throw new Error(`${input.slug}: rotation 오류 ${review.rotation}`)
    if (!poseMatchesRotation(review.pose_expression_en, review.rotation)) {
      throw new Error(`${input.slug}: pose_expression_en과 rotation 불일치`)
    }
    if (hasUnnegatedModernHair(review.hair_en)) throw new Error(`${input.slug}: 현대 헤어 표현 잔존 ${review.hair_en}`)
    if (!FACIAL_HAIR_DECISION.test(review.facial_hair_en)) {
      throw new Error(`${input.slug}: 수염·비인간 안면 피복 결정 불명확 ${review.facial_hair_en}`)
    }
    if (/\b(skin|complexion|face|cheek|cheeks|face shape|facial structure|jawline|youthful|elderly)\b/iu.test(review.facial_hair_en)) {
      throw new Error(`${input.slug}: 수염 필드가 얼굴·나이를 재묘사함 ${review.facial_hair_en}`)
    }
    if (!Array.isArray(review.character_source_urls) || review.character_source_urls.length < 1 || review.character_source_urls.length > 2) {
      throw new Error(`${input.slug}: character_source_urls 수량 오류`)
    }
    if (!Array.isArray(review.appearance_source_urls) || review.appearance_source_urls.length < 1 || review.appearance_source_urls.length > 3) {
      throw new Error(`${input.slug}: appearance_source_urls 수량 오류`)
    }
    for (const url of [...review.character_source_urls, ...review.appearance_source_urls]) {
      if (typeof url !== 'string' || !/^https?:\/\//iu.test(url)) throw new Error(`${input.slug}: URL 오류 ${url}`)
      if (/pinterest|fandom|reddit|quora|tumblr|deviantart|costume|wikia/iu.test(url)) {
        throw new Error(`${input.slug}: 금지 출처 ${url}`)
      }
    }
    for (const url of review.appearance_source_urls) {
      const parsed = new URL(url)
      if (parsed.pathname === '/' || /worldhistory\.org|britannica\.com|wikipedia\.org|theoi\.com|topostext\.org/iu.test(parsed.hostname)) {
        throw new Error(`${input.slug}: 외형 고증용 직접 자료가 아님 ${url}`)
      }
    }
  }
}

async function reviewBatch(batch, index, total) {
  const inFile = inputFile(index)
  const outFile = resultFile(index)
  const rawFile = responseFile(index)
  writeJson(inFile, {
    batch: index + 1,
    total_batches: total,
    tradition: batch.tradition,
    rows: batch.rows.map(compactInput),
  })
  if (existsSync(outFile)) {
    const saved = readJson(outFile)
    validateReview(batch.rows, saved.reviews)
    console.log(JSON.stringify({ event: 'revision_resume', batch: index + 1, rows: batch.rows.length }))
    return saved.reviews
  }
  if (existsSync(rawFile)) {
    const reviews = extractJsonArray(readFileSync(rawFile, 'utf8'))
    validateReview(batch.rows, reviews)
    writeJson(outFile, {
      generated_at: new Date().toISOString(),
      provider: 'agy-antigravity',
      model: MODEL,
      batch: index + 1,
      tradition: batch.tradition,
      reviews,
    })
    console.log(JSON.stringify({ event: 'revision_recovered', batch: index + 1, rows: reviews.length }))
    return reviews
  }
  console.log(JSON.stringify({
    event: 'revision_start',
    batch: index + 1,
    total,
    tradition: batch.tradition,
    rows: batch.rows.length,
  }))
  const response = await agyCall(buildReviewPrompt(index, total, inFile), {
    repoRoot: PROJECT_ROOT,
    docs: [
      'docs/project/production/image-generation.md',
      'docs/project/celeb/celeb-avatar-spec.md',
      inFile,
    ],
    timeoutMs: 1_500_000,
  })
  writeFileSync(rawFile, `${response}\n`, 'utf8')
  const reviews = extractJsonArray(response)
  validateReview(batch.rows, reviews)
  writeJson(outFile, {
    generated_at: new Date().toISOString(),
    provider: 'agy-antigravity',
    model: MODEL,
    batch: index + 1,
    tradition: batch.tradition,
    reviews,
  })
  console.log(JSON.stringify({ event: 'revision_finish', batch: index + 1, rows: reviews.length }))
  return reviews
}

function referenceBlock(row) {
  if (row.reference_kind === 'face_identity') {
    return `REFERENCE IMAGE — FACIAL IDENTITY ONLY\nUse this exact image as the sole facial-identity reference: ${row.reference_image}\nPreserve the person's facial structure, identity, apparent age and ethnicity. Do not copy the reference crop, camera angle, expression, background, clothing, scalp hair or facial hair. The HAIR and FACIAL HAIR directions below explicitly override the reference image. Improve presentation through grooming, expression, costume and light without changing bone structure or applying a synthetic beauty filter.`
  }
  if (row.reference_kind === 'iconographic_child_reference') {
    return `REFERENCE IMAGE — CHILD IDENTITY AND AGE\nUse this exact iconographic reference: ${row.reference_image}\nPreserve the child's identity, age and Trojan royal context, but render a living child photographed by a modern camera. Ignore the source artwork's crop, pose, background and medium. The grooming directions below override incidental source styling. Do not make the child older.`
  }
  if (row.reference_kind === 'iconographic_nonhuman_reference') {
    return `REFERENCE IMAGE — CANONICAL NONHUMAN IDENTITY\nUse this exact iconographic reference: ${row.reference_image}\nPreserve the canonical species, head anatomy and identity shown by the reference. Ignore its painting, illustration, carving or game-art style and create a living physical being photographed by a modern camera. The grooming directions below refine canonical fur, feathers, crest, mane, whiskers or scales; they never humanize the head or reduce it to a costume accessory.`
  }
  return 'NO REFERENCE IMAGE — CANONICAL NONHUMAN DESIGN\nDesign the canonical adult female vanara queen Tara from the Ramayana: a living female vanara with coherent primate anatomy, royal intelligence and dignity. She is not the Buddhist goddess Tara and not a human woman wearing animal accessories.'
}

function compilePrompt(row, review) {
  const framingStart = row.current_prompt.prompt.indexOf('FRAMING —')
  if (framingStart < 0) throw new Error(`${row.slug}: 기존 프레임 블록 누락`)
  const fixedTail = row.current_prompt.prompt.slice(framingStart).replace(
    'The collarbone and chest are NOT visible, and the torso is never long. The garment closes high around the neck where clothing is applicable.',
    'The collarbone and chest are NOT visible, and the torso is never long. Follow the historically supported neckline, closure, cloak, veil, gorget, collar or armor specified above. Keep any exposed lower neckline below the tight crop instead of inventing a modern or unattested high collar.',
  )
  return [
    `CHARACTER — ${row.name_en} (${row.name_ko})\nTradition: ${row.tradition_name_ko} / ${row.tradition}\nRole: ${row.title_en ?? row.title_ko ?? ''}`,
    referenceBlock(row),
    `IMPRESSION AND GROOMING\nIMPRESSION: ${review.impression_en}\nHAIR: ${review.hair_en}\nFACIAL HAIR: ${review.facial_hair_en}`,
    `INDIVIDUAL ART DIRECTION\n${review.costume_en}\n${review.lighting_background_en}\n${review.pose_expression_en}\n${review.mythic_treatment_en}`,
    fixedTail,
  ].join('\n\n')
}

function normalize(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/gu, ' ').trim()
}

function validateAll(rows, reviews) {
  if (reviews.length !== rows.length) throw new Error(`최종 재심사 수량 오류 ${reviews.length}/${rows.length}`)
  const fields = ['impression_en', 'hair_en', 'facial_hair_en', 'costume_en', 'historical_basis_ko', 'change_note_ko']
  const duplicates = []
  for (const field of fields) {
    const seen = new Map()
    for (const review of reviews) {
      const value = normalize(review[field])
      const prior = seen.get(value)
      if (prior) duplicates.push({ field, slugs: [prior, review.slug] })
      else seen.set(value, review.slug)
    }
  }
  if (duplicates.length > 0) throw new Error(`AGY 재심사 반복 설계: ${JSON.stringify(duplicates)}`)
}

function markdownText(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ').trim()
}

function writeOutputs(base, rows, reviews) {
  const reviewByTarget = new Map(reviews.map((review) => [review.target_id, review]))
  const prompts = rows.map((row) => {
    const review = reviewByTarget.get(row.target_id)
    if (!review) throw new Error(`${row.slug}: 최종 재심사 결과 누락`)
    return {
      ...row.current_prompt,
      art_direction: {
        costume_en: review.costume_en,
        lighting_background_en: review.lighting_background_en,
        pose_expression_en: review.pose_expression_en,
        mythic_treatment_en: review.mythic_treatment_en,
        chin_target: review.chin_target,
        rotation: review.rotation,
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
        character_source_urls: review.character_source_urls,
        appearance_source_urls: review.appearance_source_urls,
        source_urls: [...new Set([...review.character_source_urls, ...review.appearance_source_urls])],
        change_note_ko: review.change_note_ko,
      },
      prompt: compilePrompt(row, review),
    }
  })

  writeJson(PROMPTS_PATH, {
    ...base,
    generated_at: new Date().toISOString(),
    provider: 'agy-antigravity',
    model: MODEL,
    appearance_revision: {
      completed: true,
      criteria: ['impression', 'period_hair', 'facial_hair', 'costume_and_armor_research'],
      source_reviewed: true,
    },
    prompts,
  })

  const traditions = [...new Set(prompts.map((prompt) => prompt.tradition))]
  const indexLines = [
    '# 신화 인물 개인 초상화 프롬프트',
    '',
    `AGY \`${MODEL}\`이 ${prompts.length}명 전원을 인상·고대 헤어·수염·복식 고증 기준으로 재심사한 이미지 생성 발주서다.`,
    '',
    '- 얼굴 REF는 얼굴 골격과 신원만 보존하며, 헤어와 수염은 인물별 지시가 우선한다.',
    '- 각 인물 문서에 고증 수준, 판단 근거와 조사 출처를 함께 기록했다.',
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
    const lines = [`# ${traditionRows[0].tradition_name_ko ?? tradition} 개인 초상화 프롬프트`, '']
    for (const prompt of traditionRows) {
      lines.push(
        `## ${prompt.name_ko} · ${prompt.name_en}`,
        '',
        `- ID: \`${prompt.target_id}\``,
        `- REF: ${prompt.reference_image ? `\`${prompt.reference_image}\`` : '없음 — 정본에 맞춰 자율 설계'}`,
        `- 구상: ${markdownText(prompt.direction_ko)}`,
        `- 개편: ${markdownText(prompt.historical_review.change_note_ko)}`,
        `- 고증 수준: \`${prompt.historical_review.evidence_level}\``,
        `- 고증 근거: ${markdownText(prompt.historical_review.historical_basis_ko)}`,
        '- 인물·정본 출처:',
        ...prompt.historical_review.character_source_urls.map((url) => `  - ${url}`),
        '- 헤어·수염·복식 고증 출처:',
        ...prompt.historical_review.appearance_source_urls.map((url) => `  - ${url}`),
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

async function auditSources(reviews) {
  const uniqueUrls = [...new Set(reviews.flatMap((review) => [
    ...review.character_source_urls,
    ...review.appearance_source_urls,
  ]))]
  const results = []
  let cursor = 0
  const workers = Array.from({ length: 8 }, async () => {
    while (cursor < uniqueUrls.length) {
      const url = uniqueUrls[cursor]
      cursor += 1
      try {
        const response = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'user-agent': 'Mozilla/5.0 FeelAndNote portrait-source-audit' },
          signal: AbortSignal.timeout(20_000),
        })
        results.push({ url, status: response.status, ok: response.status < 500 })
        try { await response.body?.cancel() } catch { /* 이미 닫힌 본문 */ }
      } catch (error) {
        results.push({ url, status: null, ok: false, error: error.message })
      }
    }
  })
  await Promise.all(workers)
  results.sort((a, b) => a.url.localeCompare(b.url))
  writeJson(path.join(WORK, 'source-url-audit.json'), {
    checked_at: new Date().toISOString(),
    total: results.length,
    reachable: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results,
  })
  return results
}

async function main() {
  mkdirSync(WORK, { recursive: true })
  mkdirSync(BY_TRADITION, { recursive: true })
  const base = readJson(PROMPTS_PATH)
  const rows = buildRows()
  const batches = buildBatches(rows)
  if (process.argv.includes('--validate-inputs')) {
    console.log(JSON.stringify({
      rows: rows.length,
      traditions: new Set(rows.map((row) => row.tradition)).size,
      batches: batches.map((batch, index) => ({
        batch: index + 1,
        tradition: batch.tradition,
        rows: batch.rows.length,
      })),
    }, null, 2))
    return
  }

  const allReviews = []
  for (const [index, batch] of batches.entries()) {
    allReviews.push(...await reviewBatch(batch, index, batches.length))
  }
  validateAll(rows, allReviews)
  const sourceResults = await auditSources(allReviews)
  const failedSources = sourceResults.filter((result) => !result.ok)
  if (failedSources.length > 0) {
    throw new Error(`출처 URL 연결 실패 ${failedSources.length}건. ${path.join(WORK, 'source-url-audit.json')} 확인 필요`)
  }
  const prompts = writeOutputs(base, rows, allReviews)
  console.log(JSON.stringify({
    event: 'appearance_revision_complete',
    prompts: prompts.length,
    batches: batches.length,
    source_urls: sourceResults.length,
    output: PROMPTS_PATH,
  }))
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
