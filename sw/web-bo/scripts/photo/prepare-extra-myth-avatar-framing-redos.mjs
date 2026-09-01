/** Build a second-pass prompt set that preserves the approved three faces but matches Priam avatar scale. */
import { readFileSync, writeFileSync } from 'node:fs'

const INPUT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\추가-3명-초상화-프롬프트.json'
const OUTPUT =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-프롬프트\\추가-3명-프리아모스-구도-재생성.json'
const REFERENCE_DIR =
  'D:\\remotion-assets\\celeb-mythology-face-candidates\\개인초상화-생성본\\추가-3명-후보'

const document = JSON.parse(readFileSync(INPUT, 'utf8'))
const correction = `PRIAM-SCALE COMPOSITION PASS
Recreate the approved character with the same distinctive facial identity, apparent age, ethnicity, expression family, hairstyle, facial hair, character-specific anatomy, headwear, garment, palette, lighting and mythic impression shown in the attached approved portrait.

The approved portrait places the head too high and shows too much torso for the service avatar. Generate a new photographic composition with a substantially larger head while retaining the complete required hair, compact headwear or anatomical ears. Place the eyes at 45 to 47 percent of square height and the chin at 79 to 82 percent. Keep the face center at 50 percent across. Leave a real background band of 6 to 8 percent above the highest hair, cap or ear. Show the neck and natural tops of both shoulders, then end the crop across the collarbones or very upper chest. The lower chest and long garment area stay outside the square.

This is a freshly photographed closer head-and-shoulders composition, with correct perspective and full living anatomy. The head, hair, cap, ears and shoulders are generated complete inside the closer camera frame.

`

const prompts = document.prompts.map((row) => ({
  ...row,
  reference_image: `${REFERENCE_DIR}\\${row.slug}.png`,
  prompt: `${correction}${row.prompt}`,
}))

writeFileSync(
  OUTPUT,
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      applied_to_db_or_storage: false,
      reason: 'match_priam_eye_46_chin_81_while_preserving_complete_hair_and_shoulders',
      prompts,
    },
    null,
    2,
  )}\n`,
  'utf8',
)
console.log(JSON.stringify({ prompts: prompts.length, output: OUTPUT }, null, 2))
