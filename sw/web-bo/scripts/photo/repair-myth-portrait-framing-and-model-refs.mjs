/**
 * Apply the user's final facial-model removals and correct the portrait framing
 * without touching any generated image.
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'

const ROOT = 'D:\\remotion-assets\\celeb-mythology-face-candidates'
const PROMPTS_PATH = path.join(ROOT, '개인초상화-프롬프트', 'portrait-prompts.json')
const PROPOSAL_PATH = path.join(ROOT, 'matching-proposal.json')
const BACKUP_ROOT = path.join(ROOT, '_backup', '20260901-before-headroom-and-model-ref-repair')
const DISCARDED_FACE_MODELS = new Set([
  'boyi-kao',
  'huang-feihu',
  'shen-gongbao',
  'hoori',
  'igraine',
])

const ORIGINAL_CASTING_BLOCK = `NO FACIAL IDENTITY REFERENCE — ORIGINAL CASTING REQUIRED
No facial model is approved for this character. Create a new, original face appropriate to the character's specified age, gender, cultural tradition and individual impression. Do not imitate a recognizable real person, actor, celebrity or a generic modern fashion model.`

const FRAMING_BLOCK = `FRAMING — HEAD-AND-SHOULDERS AVATAR WITH NATURAL HEADROOM
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

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function backup(file) {
  mkdirSync(BACKUP_ROOT, { recursive: true })
  const destination = path.join(BACKUP_ROOT, path.basename(file))
  if (!existsSync(destination)) copyFileSync(file, destination)
}

function iconographyBlock(row) {
  if (!row.iconography_reference_image) return ''
  return `

MYTH ICONOGRAPHY IMAGE — INDIVIDUAL DESIGN ONLY
Use this exact attached image as the myth-iconography reference: ${row.iconography_reference_image}
It controls ${row.iconography_reference_controls_en}.
It does not control facial identity, crop, narrative composition, props, hands, extra figures, text, watermark, or background.`
}

function repairPromptDocument() {
  backup(PROMPTS_PATH)
  const document = readJson(PROMPTS_PATH)
  let framingRepairs = 0
  let modelRemovals = 0

  for (const row of document.prompts) {
    const repairedFraming = row.prompt.replace(/FRAMING —[\s\S]*?(?=\n\nRENDERING —)/u, FRAMING_BLOCK)
    if (repairedFraming === row.prompt) throw new Error(`${row.slug}: framing block not found`)
    row.prompt = repairedFraming
    framingRepairs += 1

    if (!DISCARDED_FACE_MODELS.has(row.slug)) continue
    const impressionAt = row.prompt.indexOf('IMPRESSION AND GROOMING')
    if (impressionAt < 0) throw new Error(`${row.slug}: impression block not found`)
    const characterBlock = row.prompt.slice(0, row.prompt.indexOf('\n\n', row.prompt.indexOf('Role:')))
    row.prompt = `${characterBlock}\n\n${ORIGINAL_CASTING_BLOCK}${iconographyBlock(row)}\n\n${row.prompt.slice(impressionAt)}`
    row.discarded_reference_image = row.reference_image
    row.reference_kind = 'no_reference_human'
    row.reference_image = null
    row.material_id = null
    modelRemovals += 1
  }

  document.generated_at = new Date().toISOString()
  document.reference_counts = {
    face_identity: document.prompts.filter((row) => row.reference_kind === 'face_identity').length,
    no_reference_human: document.prompts.filter((row) => row.reference_kind === 'no_reference_human').length,
    iconographic_child_reference: document.prompts.filter((row) => row.reference_kind === 'iconographic_child_reference').length,
    iconographic_nonhuman_reference: document.prompts.filter((row) => row.reference_kind === 'iconographic_nonhuman_reference').length,
    no_reference_nonhuman: document.prompts.filter((row) => row.reference_kind === 'no_reference_nonhuman').length,
  }
  document.framing_revision = {
    completed: true,
    method: 'natural_hair_headroom_and_visible_shoulder_tops',
    repaired_count: framingRepairs,
    tall_canonical_headwear_may_crop: true,
  }
  document.face_model_revision = {
    completed: true,
    method: 'user_discarded_face_models_removed',
    slugs: [...DISCARDED_FACE_MODELS],
  }
  writeJson(PROMPTS_PATH, document)
  return { framingRepairs, modelRemovals }
}

function repairProposal() {
  backup(PROPOSAL_PATH)
  const proposal = readJson(PROPOSAL_PATH)
  let modelRemovals = 0
  for (const row of proposal.matches) {
    if (!DISCARDED_FACE_MODELS.has(row.target_slug)) continue
    row.discarded_material_id = row.material_id
    row.status = 'no_reference_human'
    row.material_id = null
    row.fit_score = null
    row.revision = 'user_face_model_discard_2026-09-01'
    row.selection_method = 'original_face_generation_without_identity_reference'
    modelRemovals += 1
  }
  proposal.generated_at = new Date().toISOString()
  proposal.revision = 'user_face_model_discard_2026-09-01'
  writeJson(PROPOSAL_PATH, proposal)
  return { modelRemovals }
}

const promptResult = repairPromptDocument()
const proposalResult = repairProposal()
console.log(JSON.stringify({ promptResult, proposalResult, backup: BACKUP_ROOT }, null, 2))
