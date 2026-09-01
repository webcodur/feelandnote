/**
 * 누끼 후 전수 검수에서 확인한 심한 프레이밍/검정 배경 대비 실패분만 재생성한다.
 * 기존 생성본, 누끼 결과, DB, R2는 건드리지 않는다.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const SOURCE = 'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\portrait-prompts.json'
const OUTPUT = 'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\framing-severe-redo-prompts.json'

const REASONS = new Map([
  ['king-mark-of-cornwall', 'ordinary crown visibly cut by the top edge'],
  ['eros', 'natural curls visibly cut by the top edge'],
  ['antaeus', 'natural curls visibly cut by the top edge'],
  ['hylas', 'natural curls visibly cut by the top edge'],
  ['briseis', 'braided natural hairstyle visibly cut by the top edge'],
  ['glaucus', 'natural curls visibly cut by the top edge'],
  ['pandarus', 'natural hair visibly cut by the top edge'],
  ['teucer', 'natural hair visibly cut by the top edge'],
  ['ctesippus', 'natural curls visibly cut by the top edge'],
  ['laodamas', 'natural curls visibly cut by the top edge'],
  ['dolius', 'natural grey hair visibly cut by the top edge'],
  ['tisamenus', 'hair and ordinary headband visibly cut by the top edge'],
  ['orion', 'natural curls visibly cut by the top edge'],
  ['peisistratus', 'natural curls visibly cut by the top edge'],
  ['aletes', 'natural hair visibly cut by the top edge'],
  ['astyanax', 'child curls visibly cut by the top edge'],
  ['demodocus', 'natural grey hair visibly cut by the top edge'],
  ['chrysippus', 'natural curls visibly cut by the top edge'],
  ['black-bear-demon', 'black fur silhouette disappears against the service background'],
])

function correctionDirection(row) {
  if (row.slug === 'black-bear-demon') {
    return [
      'CORRECTION PASS — SERVICE-BACKGROUND LEGIBILITY',
      'Recreate the approved character while keeping the same identity and mythic design.',
      'The complete natural head silhouette must sit inside the square with clearly visible background above it.',
      'The black bear head, ears, shoulders, and garment silhouette must remain clearly readable after the background is removed and placed on #0a0a0a.',
      'Use physically plausible warm copper rim light on both outer fur edges, visible midtone detail in the black fur, and enough garment color separation to prevent the figure from becoming a floating face.',
      'Do not turn the fur grey, add an outline, or add a glowing fantasy aura.',
    ].join('\n')
  }
  const headwear = row.slug === 'king-mark-of-cornwall'
    ? 'The complete ordinary royal crown and the complete natural hair beneath it must both fit inside the square with visible background above the highest crown point.'
    : 'The complete natural scalp and every part of the natural hairstyle must fit inside the square with visible background above the highest hair.'
  return [
    'CORRECTION PASS — WIDER HEAD-AND-SHOULDERS FRAMING',
    'Recreate the approved character while preserving the approved facial identity, age, grooming, costume, and mythic impression.',
    'Move the camera back enough to show the full natural head, neck, both shoulder tops, and a modest upper-chest edge.',
    headwear,
    'Leave a clear background margin equal to about 8 to 10 percent of the square height above the highest required hair or ordinary crown point.',
    'Do not solve this by shrinking only the face inside the old crop, extending missing hair, or adding blank canvas around a finished portrait. Generate a genuinely wider photographic composition.',
  ].join('\n')
}

const source = JSON.parse(readFileSync(SOURCE, 'utf8'))
const prompts = source.prompts
  .filter((row) => REASONS.has(row.slug))
  .map((row) => ({
    ...row,
    prompt: `${correctionDirection(row)}\n\n${row.prompt}`,
    redo_reason: REASONS.get(row.slug),
  }))

if (prompts.length !== REASONS.size) {
  const found = new Set(prompts.map((row) => row.slug))
  const missing = [...REASONS.keys()].filter((slug) => !found.has(slug))
  throw new Error(`재생성 대상 누락: ${missing.join(', ')}`)
}

const output = {
  ...source,
  generated_at: new Date().toISOString(),
  target_count: prompts.length,
  applied_to_db_or_storage: false,
  prompts,
  framing_severe_redo: {
    method: 'full_resolution_review_after_nobg_on_service_and_light_backgrounds',
    original_images_preserved: true,
    output_replaces_nothing_until_reviewed: true,
    rows: prompts.map((row) => ({ slug: row.slug, name_ko: row.name_ko, reason: row.redo_reason })),
  },
}

writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ event: 'framing_redo_prompts_prepared', rows: prompts.length, output, slugs: prompts.map((row) => row.slug) }))
