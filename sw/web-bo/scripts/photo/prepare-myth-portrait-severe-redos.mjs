/**
 * Record the visually confirmed severe redo set and strengthen only the prompts
 * whose generated result ignored approved grooming/iconography directions.
 * Generated portraits are deliberately left untouched; redos go to a separate
 * output directory for side-by-side review.
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
const BACKUP_ROOT = path.join(ROOT, '_backup', '20260901-before-severe-redo-rebrief')

const SEVERE_REDOS = {
  igraine: 'generated with a user-discarded facial model',
  'boyi-kao': 'generated with a user-discarded facial model',
  'huang-feihu': 'generated with a user-discarded facial model',
  'shen-gongbao': 'generated with a user-discarded facial model',
  hoori: 'original casting drifted into a contemporary salon-model appearance',
  futodama: 'modern eyeglasses copied from the facial reference',
  ugayafukiaezu: 'approved face was combined with a contemporary salon haircut',
  ningishzida: 'modern eyeglasses copied from the facial reference',
}

const REBRIEFS = {
  hoori: {
    impression_en: 'An early Yamato hunter-prince in his physical prime, solemn and outdoors-bred, carrying serene divine authority through natural skin texture and an unpolished living presence.',
    hair_en: 'Thick shoulder-length black hair grows in an uneven archaic one-length mass, brushed back from a broad forehead and breaking into heavy rounded locks beside the ears and at the nape, following the attached Japanese icon.',
    facial_hair_en: 'A sparse short moustache and a small natural chin tuft, lightly grown rather than sharply groomed.',
  },
  futodama: {
    face_presentation_en: 'The eyes, eyebrows, temples and bridge of the nose are completely bare and unobstructed; the living face carries only the specified archaic hair and beard.',
  },
  ugayafukiaezu: {
    hair_en: 'All dark hair is drawn straight back from the entire forehead and both temples into a low, loosely bound nape bundle secured by one narrow unbleached cord; two thick uneven shoulder-length locks descend behind the ears, with the brow and cheeks fully clear.',
  },
  ningishzida: {
    face_presentation_en: 'The eyes, eyebrows, temples and bridge of the nose are completely bare and unobstructed; the living face carries only the specified Mesopotamian hair, beard and horned cap.',
    pose_expression_en: 'Facing straight forward at frontal 0 degrees, with an enigmatic, watchful, composed direct gaze into the camera.',
    rotation: 'frontal 0 degrees',
  },
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function replaceLine(prompt, label, value) {
  const pattern = new RegExp(`^${label}:.*$`, 'mu')
  if (!pattern.test(prompt)) throw new Error(`${label} line not found`)
  return prompt.replace(pattern, `${label}: ${value}`)
}

function applyRebrief(row, rebrief) {
  row.appearance_direction ??= {}
  if (rebrief.impression_en) {
    row.appearance_direction.impression_en = rebrief.impression_en
    row.prompt = replaceLine(row.prompt, 'IMPRESSION', rebrief.impression_en)
  }
  if (rebrief.hair_en) {
    row.appearance_direction.hair_en = rebrief.hair_en
    row.prompt = replaceLine(row.prompt, 'HAIR', rebrief.hair_en)
  }
  if (rebrief.facial_hair_en) {
    row.appearance_direction.facial_hair_en = rebrief.facial_hair_en
    row.prompt = replaceLine(row.prompt, 'FACIAL HAIR', rebrief.facial_hair_en)
  }
  if (rebrief.face_presentation_en) {
    row.appearance_direction.face_presentation_en = rebrief.face_presentation_en
    const line = `FACE PRESENTATION: ${rebrief.face_presentation_en}`
    if (/^FACE PRESENTATION:.*$/mu.test(row.prompt)) {
      row.prompt = row.prompt.replace(/^FACE PRESENTATION:.*$/mu, line)
    } else {
      row.prompt = row.prompt.replace(/^(FACIAL HAIR:.*)$/mu, `$1\n${line}`)
    }
  }
  if (rebrief.pose_expression_en) {
    const previousPose = row.art_direction?.pose_expression_en
    if (!previousPose || !row.prompt.includes(previousPose)) {
      throw new Error(`${row.slug}: pose-expression line not found`)
    }
    row.prompt = row.prompt.replace(previousPose, rebrief.pose_expression_en)
    row.art_direction.pose_expression_en = rebrief.pose_expression_en
  }
  if (rebrief.rotation) row.art_direction.rotation = rebrief.rotation
}

mkdirSync(BACKUP_ROOT, { recursive: true })
const backup = path.join(BACKUP_ROOT, path.basename(PROMPTS_PATH))
if (!existsSync(backup)) copyFileSync(PROMPTS_PATH, backup)

const document = JSON.parse(readFileSync(PROMPTS_PATH, 'utf8'))
const rowsBySlug = new Map(document.prompts.map((row) => [row.slug, row]))

for (const slug of Object.keys(SEVERE_REDOS)) {
  if (!rowsBySlug.has(slug)) throw new Error(`Missing severe-redo row: ${slug}`)
}
for (const [slug, rebrief] of Object.entries(REBRIEFS)) {
  applyRebrief(rowsBySlug.get(slug), rebrief)
}

document.generated_at = new Date().toISOString()
document.severe_redo_revision = {
  completed: true,
  method: 'visual_contact_sheet_review_then_individual_high_resolution_confirmation',
  original_images_preserved: true,
  slugs: Object.keys(SEVERE_REDOS),
  reasons: SEVERE_REDOS,
  prompt_rebrief_slugs: Object.keys(REBRIEFS),
}

writeJson(PROMPTS_PATH, document)
console.log(JSON.stringify({
  severe_redos: Object.keys(SEVERE_REDOS),
  prompt_rebriefs: Object.keys(REBRIEFS),
  backup,
}, null, 2))
