/**
 * 승인된 신화 인물 생성 입력 198건을 AGY(Gemini)로 개별 아바타 발주서화한다.
 * AGY는 인물별 연출만 설계하고, 프레임·질감 규격은 현행 SSoT를 이 스크립트가 결합한다.
 * 이미지·DB·R2는 수정하지 않는다.
 *
 * 실행: node scripts/photo/generate-myth-portrait-prompts-agy.mjs
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
const TARGETS_PATH = path.join(ROOT, 'avatar-null-targets.json')
const PROPOSAL_PATH = path.join(ROOT, 'matching-proposal.json')
const FACE_CROPS = path.join(ROOT, 'matching-crops')
const OUT = path.join(ROOT, '개인초상화-프롬프트')
const WORK = path.join(OUT, '_agy-batches')
const BY_TRADITION = path.join(OUT, '전승별')
const MODEL = 'gemini-3.7-flash-high'

const BATCH_TRADITIONS = [
  ['argonauts', 'greek-roman-myth', 'heracles'],
  ['homer-iliad'],
  ['homer-odyssey'],
  ['house-of-atreus', 'arthur-round-table'],
  ['myth-china-fengshen', 'myth-china-xiyou', 'myth-egypt'],
  ['myth-hindu-mahabharata', 'myth-hindu-ramayana'],
  ['myth-japan', 'myth-korea'],
  ['myth-mesopotamia'],
  ['myth-norse', 'virgil-aeneid'],
]

const TRADITION_LABELS = {
  argonauts: '아르고 원정대',
  'arthur-round-table': '아서왕과 원탁의 기사들',
  'greek-roman-myth': '그리스·로마 신화',
  heracles: '헤라클레스',
  'homer-iliad': '일리아스',
  'homer-odyssey': '오디세이아',
  'house-of-atreus': '아트레우스 왕가',
  'myth-china-fengshen': '봉신연의',
  'myth-china-xiyou': '서유기',
  'myth-egypt': '이집트 신화',
  'myth-hindu-mahabharata': '마하바라타',
  'myth-hindu-ramayana': '라마야나',
  'myth-japan': '일본 신화',
  'myth-korea': '한국 신화',
  'myth-mesopotamia': '메소포타미아 신화',
  'myth-norse': '북유럽 신화',
  'virgil-aeneid': '아이네이스',
}

const ROTATIONS = new Set(['frontal 0 degrees', 'left 8 degrees', 'right 8 degrees', 'left 15 degrees', 'right 15 degrees'])
const CHIN_TARGETS = new Set([77, 81, 85])

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function markdownText(value) {
  return String(value ?? '').replaceAll('|', '\\|').replaceAll('\r', ' ').replaceAll('\n', ' ').trim()
}

function findWebReferenceRoot() {
  for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const indexPath = path.join(ROOT, entry.name, 'index.json')
    if (!existsSync(indexPath)) continue
    try {
      const index = readJson(indexPath)
      if (index.total === 9 && Array.isArray(index.results)) return { root: path.join(ROOT, entry.name), index }
    } catch {
      // 다른 용도의 index.json은 무시한다.
    }
  }
  throw new Error('특수형 웹 도상 index.json을 찾지 못했다.')
}

function primaryTradition(target) {
  return target.traditions?.[0]?.slug ?? 'unknown'
}

function buildInputs() {
  const targets = readJson(TARGETS_PATH).targets
  const proposal = readJson(PROPOSAL_PATH)
  const matchByTarget = new Map(proposal.matches.map((row) => [row.target_id, row]))
  const web = findWebReferenceRoot()
  const webBySlug = new Map(web.index.results.map((row) => [row.slug === 'tara-ramayana' ? 'tara' : row.slug, row]))

  const rows = targets.map((target) => {
    const match = matchByTarget.get(target.id)
    if (!match) throw new Error(`${target.slug}: matching-proposal 연결 누락`)
    const tradition = primaryTradition(target)
    if (match.status === 'no_reference_human') {
      return {
        target_id: target.id,
        slug: target.slug,
        name_ko: target.nickname,
        name_en: target.nickname_en,
        gender: target.gender_label,
        title_ko: target.title,
        title_en: target.title_en,
        bio_ko: target.bio,
        bio_en: target.bio_en,
        tradition,
        tradition_name_ko: target.traditions?.[0]?.name ?? TRADITION_LABELS[tradition],
        reference_kind: 'no_reference_human',
        reference_image: null,
        material_id: null,
        casting_reason: match.reason,
        existing_regeneration_direction: match.regeneration_direction,
        casting_risk: match.risk,
      }
    }
    if (match.status === 'matched') {
      const referenceImage = match.preview_path
        ? path.resolve(match.preview_path)
        : path.join(FACE_CROPS, `${match.material_id}_face.png`)
      if (!existsSync(referenceImage)) throw new Error(`${target.slug}: 얼굴 REF 누락 ${referenceImage}`)
      return {
        target_id: target.id,
        slug: target.slug,
        name_ko: target.nickname,
        name_en: target.nickname_en,
        gender: target.gender_label,
        title_ko: target.title,
        title_en: target.title_en,
        bio_ko: target.bio,
        bio_en: target.bio_en,
        tradition,
        tradition_name_ko: target.traditions?.[0]?.name ?? TRADITION_LABELS[tradition],
        reference_kind: 'face_identity',
        reference_image: referenceImage,
        material_id: match.material_id,
        casting_reason: match.reason,
        existing_regeneration_direction: match.regeneration_direction,
        casting_risk: match.risk,
      }
    }

    const webResult = webBySlug.get(target.slug)
    if (!webResult) throw new Error(`${target.slug}: 특수형 웹 검색 결과 누락`)
    const referenceImage = webResult.status === 'found'
      ? path.join(web.root, webResult.slug, webResult.selected_file)
      : null
    if (referenceImage && !existsSync(referenceImage)) throw new Error(`${target.slug}: 특수형 REF 누락 ${referenceImage}`)
    const child = target.slug === 'astyanax'
    return {
      target_id: target.id,
      slug: target.slug,
      name_ko: target.nickname,
      name_en: target.nickname_en,
      gender: target.gender_label,
      title_ko: target.title,
      title_en: target.title_en,
      bio_ko: target.bio,
      bio_en: target.bio_en,
      tradition,
      tradition_name_ko: target.traditions?.[0]?.name ?? TRADITION_LABELS[tradition],
      reference_kind: referenceImage
        ? child ? 'iconographic_child_reference' : 'iconographic_nonhuman_reference'
        : 'no_reference_nonhuman',
      reference_image: referenceImage,
      material_id: null,
      casting_reason: match.reason,
      existing_regeneration_direction: null,
      casting_risk: null,
      iconographic_source_page: webResult.source_page_url,
      iconographic_search_note: webResult.give_up_reason,
    }
  })

  if (rows.length !== 198) throw new Error(`입력 인물 수량 불일치: ${rows.length}`)
  return rows
}

function buildBatchPrompt(rows, batchIndex) {
  const payload = rows.map((row) => ({
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
    casting_reason: row.casting_reason,
    existing_regeneration_direction: row.existing_regeneration_direction,
    casting_risk: row.casting_risk,
    iconographic_source_page: row.iconographic_source_page,
    iconographic_search_note: row.iconographic_search_note,
  }))

  return `
You are the senior art director for a production batch of mythology character avatar portraits.
You are designing prompts only. Do not generate images and do not edit any files.

The supplied JSON contains batch ${batchIndex + 1}/${BATCH_TRADITIONS.length}. For factual accuracy, use web research when the supplied biographies do not establish the period, culture, rank, or canonical iconography. Do not invent a different identity or import motifs from unrelated traditions.

Return ONLY one valid JSON array. No markdown fence, preface, commentary, or trailing text. Preserve input order and return exactly one object per input row with exactly these fields:

{
  "target_id": "exact input target_id",
  "slug": "exact input slug",
  "direction_ko": "one concise Korean sentence explaining the unique portrait idea",
  "costume_en": "one or two concrete English sentences specifying historically and culturally fitting clothing, collar, headdress and materials",
  "lighting_background_en": "one or two concrete English sentences specifying a distinctive but simple light and clean softly blurred background",
  "pose_expression_en": "one concrete English sentence specifying direct camera gaze, the chosen rotation, and a calm-to-gentle-smile expression",
  "mythic_treatment_en": "one or two concrete English sentences expressing this character's canonical supernatural identity through clothing details, headdress, restrained atmospheric light and background color only",
  "chin_target": 77,
  "rotation": "frontal 0 degrees",
  "quality_note_ko": "one concise Korean sentence stating why this treatment is specific to this character rather than generic"
}

Mandatory constraints:
0. For reference_kind "no_reference_human", create an original face appropriate to the supplied age, gender, tradition and character. Do not imitate a recognizable real person, actor, celebrity or generic modern fashion model.
1. For reference_kind "face_identity", NEVER describe or reinvent the person's facial features, age, ethnicity, skin, body build, attractiveness, or facial hair. Those come entirely from reference_image. You may specify expression, hair arrangement, headdress and costume. Treat casting_reason only as role context, never as permission to rewrite the face.
2. For "iconographic_child_reference", preserve the child's identity and age from the reference while converting the source into a living full-color photograph. Do not adultify the child.
3. For "iconographic_nonhuman_reference", preserve the canonical species and head anatomy. Do not turn an animal-headed deity or vanara into a human wearing animal accessories. Ignore the source artwork's painting, carving or illustration style.
4. For "no_reference_nonhuman", design the canonical nonhuman identity from the biography. Tara is the adult female vanara queen of the Ramayana, not the Buddhist goddess Tara and not a human woman with cosmetic monkey ears.
5. This is an avatar portrait. No hands, handheld objects, weapons, tools, books, animals beside the subject, extra people, scenery narrative, or readable text. Preserve an open ancient neckline when individually appropriate; do not invent a high collar or extra wrapping.
6. Make costume historically and culturally specific. Avoid generic medieval fantasy, Roman substitutions in Greek portraits, East Asian costume mixing, modern fashion and theatrical cosplay.
7. Express divinity through one restrained, canonical visual signature. No glowing eyes unless the tradition explicitly requires them. No floating crowns, random runes, excessive particles, giant halos or decorative clutter.
8. Keep the background simple enough for clean separation. Do not place literal props behind the head. Ensure its value and hue separate hair, headdress and garment from the background.
9. Across this batch, vary lighting direction, color temperature, background hue, expression, rotation and chin_target. Do not reuse a studio formula. chin_target must be exactly 77, 81, or 85. rotation must be exactly one of: frontal 0 degrees, left 8 degrees, right 8 degrees, left 15 degrees, right 15 degrees.
10. Write all *_en fields as direct image-generation instructions, not analysis, alternatives, or poetic interpretation. Prefer positive concrete visual conditions.

INPUT JSON:
${JSON.stringify(payload, null, 2)}
`.trim()
}

function extractJsonArray(text) {
  const cleaned = String(text ?? '').trim().replace(/^```(?:json)?\s*/iu, '').replace(/\s*```$/u, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('AGY 응답에서 JSON 배열을 찾지 못했다.')
  return JSON.parse(cleaned.slice(start, end + 1))
}

function validateDesigns(inputs, designs) {
  if (!Array.isArray(designs) || designs.length !== inputs.length) {
    throw new Error(`AGY 설계 수량 불일치: input=${inputs.length}, output=${designs?.length}`)
  }
  const fields = [
    'target_id', 'slug', 'direction_ko', 'costume_en', 'lighting_background_en',
    'pose_expression_en', 'mythic_treatment_en', 'chin_target', 'rotation', 'quality_note_ko',
  ]
  for (const [index, design] of designs.entries()) {
    const input = inputs[index]
    if (design.target_id !== input.target_id || design.slug !== input.slug) {
      throw new Error(`AGY 순서·신원 불일치 ${index}: ${input.slug} -> ${design.slug}`)
    }
    for (const field of fields) {
      if (!(field in design)) throw new Error(`${input.slug}: AGY 필드 누락 ${field}`)
    }
    for (const field of fields.filter((field) => !['chin_target'].includes(field))) {
      if (typeof design[field] !== 'string' || !design[field].trim()) throw new Error(`${input.slug}: AGY 빈 필드 ${field}`)
    }
    if (!CHIN_TARGETS.has(design.chin_target)) throw new Error(`${input.slug}: chin_target 오류 ${design.chin_target}`)
    if (!ROTATIONS.has(design.rotation)) throw new Error(`${input.slug}: rotation 오류 ${design.rotation}`)
  }
}

function normalizedDesignText(value) {
  return String(value ?? '').toLowerCase().replace(/\s+/gu, ' ').trim()
}

function validateGlobalDesignUniqueness(designs) {
  const fields = [
    'direction_ko',
    'costume_en',
    'lighting_background_en',
    'mythic_treatment_en',
    'quality_note_ko',
  ]
  const duplicates = []
  for (const field of fields) {
    const seen = new Map()
    for (const design of designs) {
      const value = normalizedDesignText(design[field])
      const prior = seen.get(value)
      if (prior) duplicates.push({ field, slugs: [prior, design.slug] })
      else seen.set(value, design.slug)
    }
  }

  const signatureSeen = new Map()
  for (const design of designs) {
    const signature = [
      design.costume_en,
      design.lighting_background_en,
      design.pose_expression_en,
      design.mythic_treatment_en,
    ].map(normalizedDesignText).join('\n')
    const prior = signatureSeen.get(signature)
    if (prior) duplicates.push({ field: 'complete_art_direction', slugs: [prior, design.slug] })
    else signatureSeen.set(signature, design.slug)
  }

  if (duplicates.length > 0) {
    throw new Error(`AGY 반복 설계 ${duplicates.length}건: ${JSON.stringify(duplicates)}`)
  }
}

function referenceBlock(row) {
  if (row.reference_kind === 'no_reference_human') {
    return `NO FACIAL IDENTITY REFERENCE — ORIGINAL CASTING REQUIRED
No facial model is approved for this character. Create a new, original face appropriate to the character's specified age, gender, cultural tradition and individual impression. Do not imitate a recognizable real person, actor, celebrity or a generic modern fashion model.`
  }
  if (row.reference_kind === 'face_identity') {
    return `REFERENCE IMAGE — FACE IDENTITY ONLY\nUse this exact image as the sole facial identity reference: ${row.reference_image}\nTake ONLY the person's facial identity from the reference. Preserve that identity exactly. Re-pose the person and replace the reference crop, camera angle, gaze, background, scalp hair, facial hair, eyewear, jewelry, headwear and clothing with the directions below. Do not describe or invent a different face, age, build or ethnicity.`
  }
  if (row.reference_kind === 'iconographic_child_reference') {
    return `REFERENCE IMAGE — CHILD IDENTITY AND AGE\nUse this exact iconographic reference: ${row.reference_image}\nPreserve the child's identity, age and Trojan royal context, but render a living child photographed by a modern camera. Ignore the source artwork's crop, pose, background and medium. Do not make the child older.`
  }
  if (row.reference_kind === 'iconographic_nonhuman_reference') {
    return `REFERENCE IMAGE — CANONICAL NONHUMAN IDENTITY\nUse this exact iconographic reference: ${row.reference_image}\nPreserve the canonical species, head anatomy and identity shown by the reference. Ignore its painting, illustration, carving or game-art style and create a living physical being photographed by a modern camera. Do not humanize the head or reduce it to a costume accessory.`
  }
  if (row.reference_kind === 'no_reference_nonhuman') {
    return 'NO REFERENCE IMAGE — CANONICAL NONHUMAN DESIGN\nDesign the canonical adult female vanara queen Tara from the Ramayana: a living female vanara with coherent primate anatomy, royal intelligence and dignity. She is not the Buddhist goddess Tara and not a human woman wearing animal accessories.'
  }
  throw new Error(`Unsupported reference kind for ${row.slug}: ${row.reference_kind}`)
}

function framingBlock() {
  return `FRAMING — COMPLETE HEAD-AND-SHOULDERS AVATAR
Do NOT copy the reference image's crop, framing, camera angle, gaze direction or background. Everything below overrides the reference.

Square 1:1 frame. Read the frame as 100 units wide and 100 units tall, measured from the top-left corner.
- Keep the complete natural skull and hairstyle inside the square. The top of the scalp hair, including an ordinary bun, braid coil or practical topknot, never touches or crosses the top edge. Leave a clearly visible but modest background margin above the natural hair.
- Ordinary headbands, fillets, caps, diadems and compact crowns should normally fit inside that margin. Exceptionally tall canonical crowns, plumes, horns, helmet crests or oversized divine headdresses may extend beyond the top edge rather than making the face too small. This exception never permits cropping the natural scalp or hairline itself.
- Show the full head, both ears or their anatomical equivalents, the neck, and the natural tops of both shoulders. Both outer shoulder slopes enter the lower corners; do not crop the portrait above the shoulder line.
- Keep the face large enough to read clearly as an avatar while preserving the complete natural head and both shoulder tops. A bare or close-haired human head normally leaves about 6 to 10 units of background above the hair.
- The vertical centre line of the face or head sits at 50 units across, dead centre. The head is never pushed to one side.
- Preserve the individual neckline specified above. An open ancient neckline, bare upper chest edge or visible collarbone is allowed when historically and individually appropriate; do not invent a high collar or extra wrapping to fill the lower frame.
- Do not expand this into a half-body portrait. The crop ends across the upper shoulders or very upper chest, comparable to a formal avatar photograph.

This image is displayed inside a circular mask that removes the four corners and is sometimes cropped to a narrow vertical rectangle that removes the outer 12 percent of each side. Keep the face or head and both ears well inside those limits.

Head-on frontal view, or at most a fifteen degree three-quarter turn. The subject looks directly into the camera. Not a profile, not a high angle, not a low angle. Exactly one subject. No hands, no microphone, no headset, no book, no ball, no weapon, no handheld or freestanding props. No legible text, lettering or signage anywhere.`
}

const RENDERING_BLOCK = `RENDERING — THIS IS A PHOTOGRAPH, NOT A PAINTING, NOT A DRAWING, NOT A SCULPTURE
Ultra-photorealistic photograph shot on a modern 21st century full-frame camera.
Even if the reference is a painting, an ink drawing, a statue, a coin or an old low-resolution photo, the result is a real photograph of a living person or physically living canonical being.
No painterly brushwork, no ink lines, no illustration, no digital painting, no CGI render, no wax-figure look.
Full color photograph. Rich, natural, lifelike color — never black and white, never sepia, never monochrome or desaturated.
Natural skin, fur, feather, scale, hair and textile texture with believable small asymmetries. Do not polish the subject into a beauty-filtered or synthetic AI face.`

function compilePrompt(row, design) {
  return [
    `CHARACTER — ${row.name_en} (${row.name_ko})\nTradition: ${row.tradition_name_ko} / ${row.tradition}\nRole: ${row.title_en ?? row.title_ko ?? ''}`,
    referenceBlock(row),
    `INDIVIDUAL ART DIRECTION\n${design.costume_en}\n${design.lighting_background_en}\n${design.pose_expression_en}\n${design.mythic_treatment_en}`,
    framingBlock(),
    RENDERING_BLOCK,
    'OUTPUT\nOutput size: exactly 1024 x 1024 pixels, square 1:1.',
  ].join('\n\n')
}

function batchFile(index) {
  return path.join(WORK, `batch-${String(index + 1).padStart(2, '0')}.json`)
}

async function designBatch(inputs, index) {
  const file = batchFile(index)
  if (existsSync(file)) {
    const saved = readJson(file)
    validateDesigns(inputs, saved.designs)
    console.log(JSON.stringify({ event: 'batch_resume', batch: index + 1, rows: inputs.length }))
    return saved.designs
  }
  console.log(JSON.stringify({ event: 'batch_start', batch: index + 1, rows: inputs.length, traditions: BATCH_TRADITIONS[index] }))
  const prompt = buildBatchPrompt(inputs, index)
  const response = await agyCall(prompt, {
    repoRoot: PROJECT_ROOT,
    docs: [
      'docs/project/production/image-generation.md',
      'docs/project/celeb/celeb-avatar-spec.md',
    ],
    timeoutMs: 1_500_000,
  })
  const designs = extractJsonArray(response)
  validateDesigns(inputs, designs)
  writeJson(file, {
    generated_at: new Date().toISOString(),
    provider: 'agy-antigravity',
    model: MODEL,
    batch: index + 1,
    traditions: BATCH_TRADITIONS[index],
    designs,
  })
  console.log(JSON.stringify({ event: 'batch_finish', batch: index + 1, rows: designs.length }))
  return designs
}

function writeOutputs(rows, designs) {
  const designByTarget = new Map(designs.map((row) => [row.target_id, row]))
  const prompts = rows.map((row) => {
    const design = designByTarget.get(row.target_id)
    if (!design) throw new Error(`${row.slug}: 최종 AGY 설계 누락`)
    return {
      target_id: row.target_id,
      slug: row.slug,
      name_ko: row.name_ko,
      name_en: row.name_en,
      title_ko: row.title_ko,
      title_en: row.title_en,
      tradition: row.tradition,
      tradition_name_ko: row.tradition_name_ko,
      reference_kind: row.reference_kind,
      reference_image: row.reference_image,
      material_id: row.material_id,
      direction_ko: design.direction_ko,
      quality_note_ko: design.quality_note_ko,
      art_direction: {
        costume_en: design.costume_en,
        lighting_background_en: design.lighting_background_en,
        pose_expression_en: design.pose_expression_en,
        mythic_treatment_en: design.mythic_treatment_en,
        chin_target: design.chin_target,
        rotation: design.rotation,
      },
      prompt: compilePrompt(row, design),
    }
  })

  const ids = new Set(prompts.map((row) => row.target_id))
  const slugs = new Set(prompts.map((row) => row.slug))
  if (prompts.length !== 198 || ids.size !== 198 || slugs.size !== 198) {
    throw new Error(`최종 프롬프트 고유성 불일치: total=${prompts.length}, ids=${ids.size}, slugs=${slugs.size}`)
  }
  const referenceCounts = prompts.reduce((acc, row) => {
    acc[row.reference_kind] = (acc[row.reference_kind] ?? 0) + 1
    return acc
  }, {})
  const generatedAt = new Date().toISOString()
  writeJson(path.join(OUT, 'portrait-prompts.json'), {
    generated_at: generatedAt,
    provider: 'agy-antigravity',
    model: MODEL,
    applied_to_db_or_storage: false,
    images_generated: false,
    target_count: prompts.length,
    reference_counts: referenceCounts,
    prompts,
  })

  const traditions = [...new Set(rows.map((row) => row.tradition))]
  const indexLines = [
    '# 신화 인물 개인 초상화 프롬프트',
    '',
    `AGY \`${MODEL}\`이 인물별 연출을 설계하고 현행 아바타 프레임·실사 규격을 결합한 ${prompts.length}명 발주서다.`,
    '',
    '- 이미지 생성·DB·R2 반영은 하지 않았다.',
    `- 얼굴 REF ${referenceCounts.face_identity ?? 0}명, 아동 도상 REF ${referenceCounts.iconographic_child_reference ?? 0}명, 비인간 도상 REF ${referenceCounts.iconographic_nonhuman_reference ?? 0}명, 무참조 비인간 설계 ${referenceCounts.no_reference_nonhuman ?? 0}명.`,
    '- 기계용 전체 데이터: `portrait-prompts.json`',
    '',
    '## 전승별 발주서',
    '',
  ]
  for (const tradition of traditions) {
    const traditionRows = prompts.filter((row) => row.tradition === tradition)
    const filename = `${tradition}.md`
    indexLines.push(`- [${TRADITION_LABELS[tradition] ?? tradition} ${traditionRows.length}명](./전승별/${filename})`)
    const lines = [
      `# ${TRADITION_LABELS[tradition] ?? tradition} 개인 초상화 프롬프트`,
      '',
    ]
    for (const row of traditionRows) {
      lines.push(
        `## ${row.name_ko} · ${row.name_en}`,
        '',
        `- ID: \`${row.target_id}\``,
        `- REF: ${row.reference_image ? `\`${row.reference_image}\`` : '없음 — 정본에 맞춰 자율 설계'}`,
        `- 구상: ${markdownText(row.direction_ko)}`,
        `- 근거: ${markdownText(row.quality_note_ko)}`,
        '',
        '```text',
        row.prompt,
        '```',
        '',
      )
    }
    writeFileSync(path.join(BY_TRADITION, filename), `${lines.join('\n')}\n`, 'utf8')
  }
  writeFileSync(path.join(OUT, 'README.md'), `${indexLines.join('\n')}\n`, 'utf8')
  return { prompts, referenceCounts, traditions }
}

function auditOutput() {
  const outputPath = path.join(OUT, 'portrait-prompts.json')
  const output = readJson(outputPath)
  const prompts = output.prompts
  const fields = [
    'direction_ko',
    'costume_en',
    'lighting_background_en',
    'pose_expression_en',
    'mythic_treatment_en',
    'quality_note_ko',
  ]
  const designField = (prompt, field) => field in prompt ? prompt[field] : prompt.art_direction?.[field]
  const exactDuplicates = {}
  for (const field of fields) {
    const seen = new Map()
    for (const prompt of prompts) {
      const value = normalizedDesignText(designField(prompt, field))
      const slugs = seen.get(value) ?? []
      slugs.push(prompt.slug)
      seen.set(value, slugs)
    }
    exactDuplicates[field] = [...seen.values()].filter((slugs) => slugs.length > 1)
  }

  const coreTokens = (prompt) => new Set([
    designField(prompt, 'costume_en'),
    designField(prompt, 'lighting_background_en'),
    designField(prompt, 'mythic_treatment_en'),
  ].join(' ').toLowerCase().match(/[a-z]{4,}/gu) ?? [])
  const tokenRows = prompts.map((prompt) => ({ slug: prompt.slug, tokens: coreTokens(prompt) }))
  const similarPairs = []
  for (let left = 0; left < tokenRows.length; left += 1) {
    for (let right = left + 1; right < tokenRows.length; right += 1) {
      const a = tokenRows[left]
      const b = tokenRows[right]
      const intersection = [...a.tokens].filter((token) => b.tokens.has(token)).length
      const union = new Set([...a.tokens, ...b.tokens]).size
      const similarity = union === 0 ? 0 : intersection / union
      if (similarity >= 0.62) similarPairs.push({
        slugs: [a.slug, b.slug],
        similarity: Number(similarity.toFixed(3)),
      })
    }
  }
  similarPairs.sort((a, b) => b.similarity - a.similarity)

  const faceDescriptorPattern = /\b(beard|bearded|beautiful|complexion|elderly|ethnic|facial|handsome|mustache|moustache|skin|young|youthful)\b/iu
  const faceDescriptorFlags = prompts
    .filter((prompt) => prompt.reference_kind === 'face_identity')
    .map((prompt) => {
      const generatedText = fields.map((field) => designField(prompt, field)).join(' ')
      return faceDescriptorPattern.test(generatedText) ? {
        slug: prompt.slug,
        matches: [...new Set(generatedText.match(new RegExp(faceDescriptorPattern.source, 'giu')) ?? [])],
      } : null
    })
    .filter(Boolean)

  const requiredBlocks = ['CHARACTER', 'FRAMING', 'RENDERING', 'OUTPUT', '1024 x 1024']
  const batchFiles = readdirSync(WORK).filter((name) => /^batch-\d+\.json$/u.test(name)).sort()
  const batchRows = batchFiles.map((name) => ({ name, rows: readJson(path.join(WORK, name)).designs.length }))
  const specialPrompts = prompts
    .filter((prompt) => prompt.reference_kind !== 'face_identity')
    .map((prompt) => ({
      slug: prompt.slug,
      name_ko: prompt.name_ko,
      reference_kind: prompt.reference_kind,
      direction_ko: prompt.direction_ko,
      costume_en: designField(prompt, 'costume_en'),
      lighting_background_en: designField(prompt, 'lighting_background_en'),
      mythic_treatment_en: designField(prompt, 'mythic_treatment_en'),
      quality_note_ko: prompt.quality_note_ko,
    }))
  const representatives = [...new Set(prompts.map((prompt) => prompt.tradition))].map((tradition) => {
    const prompt = prompts.find((candidate) => candidate.tradition === tradition)
    return {
      tradition,
      slug: prompt.slug,
      direction_ko: prompt.direction_ko,
      quality_note_ko: prompt.quality_note_ko,
    }
  })

  console.log(JSON.stringify({
    prompts: prompts.length,
    unique_ids: new Set(prompts.map((prompt) => prompt.target_id)).size,
    unique_slugs: new Set(prompts.map((prompt) => prompt.slug)).size,
    unique_full_prompts: new Set(prompts.map((prompt) => prompt.prompt)).size,
    exact_field_duplicates: exactDuplicates,
    high_similarity_pairs: similarPairs.slice(0, 30),
    missing_references: prompts.filter((prompt) => prompt.reference_image && !existsSync(prompt.reference_image)).map((prompt) => prompt.slug),
    missing_required_blocks: Object.fromEntries(requiredBlocks.map((block) => [
      block,
      prompts.filter((prompt) => !prompt.prompt.includes(block)).map((prompt) => prompt.slug),
    ])),
    face_identity_descriptor_flags: faceDescriptorFlags,
    batch_rows: batchRows,
    batch_total: batchRows.reduce((total, batch) => total + batch.rows, 0),
    tradition_markdown_files: readdirSync(BY_TRADITION).filter((name) => name.endsWith('.md')).length,
    prompt_lengths: {
      min: Math.min(...prompts.map((prompt) => prompt.prompt.length)),
      max: Math.max(...prompts.map((prompt) => prompt.prompt.length)),
      average: Math.round(prompts.reduce((total, prompt) => total + prompt.prompt.length, 0) / prompts.length),
    },
    special_prompts: specialPrompts,
    tradition_representatives: representatives,
  }, null, 2))
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  mkdirSync(WORK, { recursive: true })
  mkdirSync(BY_TRADITION, { recursive: true })
  if (process.argv.includes('--audit-output')) {
    auditOutput()
    return
  }
  const rows = buildInputs()
  if (process.argv.includes('--validate-inputs')) {
    const referenceCounts = rows.reduce((acc, row) => {
      acc[row.reference_kind] = (acc[row.reference_kind] ?? 0) + 1
      return acc
    }, {})
    const batchCounts = BATCH_TRADITIONS.map((traditions, index) => ({
      batch: index + 1,
      traditions,
      rows: rows.filter((row) => traditions.includes(row.tradition)).length,
    }))
    console.log(JSON.stringify({
      event: 'input_validation',
      targets: rows.length,
      unique_ids: new Set(rows.map((row) => row.target_id)).size,
      unique_slugs: new Set(rows.map((row) => row.slug)).size,
      reference_counts: referenceCounts,
      batches: batchCounts,
    }, null, 2))
    return
  }
  const assigned = new Set()
  const allDesigns = []
  for (const [index, traditionSlugs] of BATCH_TRADITIONS.entries()) {
    const inputs = rows.filter((row) => traditionSlugs.includes(row.tradition))
    if (inputs.length === 0) throw new Error(`빈 AGY 배치 ${index + 1}`)
    for (const row of inputs) {
      if (assigned.has(row.target_id)) throw new Error(`${row.slug}: AGY 배치 중복`)
      assigned.add(row.target_id)
    }
    allDesigns.push(...await designBatch(inputs, index))
  }
  if (assigned.size !== rows.length) {
    const missing = rows.filter((row) => !assigned.has(row.target_id)).map((row) => row.slug)
    throw new Error(`AGY 배치 미배정 ${missing.length}명: ${missing.join(', ')}`)
  }
  validateGlobalDesignUniqueness(allDesigns)
  const result = writeOutputs(rows, allDesigns)
  console.log(JSON.stringify({
    event: 'finish',
    prompts: result.prompts.length,
    reference_counts: result.referenceCounts,
    traditions: result.traditions.length,
    output: OUT,
  }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
