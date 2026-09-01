/**
 * materials.json과 Kiro-Sol appearances.json을 합쳐 사람이 읽는 외형 카탈로그를 만든다.
 * 분류 508건이 모두 있을 때만 쓴다.
 *
 * 실행: node scripts/photo/build-myth-face-appearance-catalog.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve('D:\\remotion-assets\\celeb-mythology-face-candidates')
const MATERIALS_PATH = path.join(ROOT, 'materials.json')
const APPEARANCES_PATH = path.join(ROOT, 'appearances.json')
const COMBINED_PATH = path.join(ROOT, 'materials-with-appearance.json')
const MARKDOWN_PATH = path.join(ROOT, 'MATERIALS.md')
const EXPECTED = 508

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'))
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function markdownText(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replaceAll('\r', ' ')
    .replaceAll('\n', ' ')
    .trim()
}

function main() {
  const materialRoot = readJson(MATERIALS_PATH)
  const appearanceRoot = readJson(APPEARANCES_PATH)
  const materials = materialRoot.materials ?? materialRoot
  const appearances = appearanceRoot.appearances ?? appearanceRoot
  if (materials.length !== EXPECTED || appearances.length !== EXPECTED) {
    throw new Error(`508건 완성 전에는 카탈로그를 만들지 않습니다: 재료 ${materials.length}, 외형 ${appearances.length}`)
  }
  const appearanceById = new Map(appearances.map((row) => [row.material_id, row]))
  if (appearanceById.size !== EXPECTED) throw new Error('appearance material_id가 중복됐습니다.')
  const combined = materials.map((material) => {
    const appearance = appearanceById.get(material.material_id)
    if (!appearance) throw new Error(`외형 누락: ${material.material_id}`)
    if (appearance.file.toLowerCase() !== material.material_path.toLowerCase()) {
      throw new Error(`파일 연결 불일치: ${material.material_id}`)
    }
    return { ...material, appearance }
  })

  writeJson(COMBINED_PATH, {
    generated_at: new Date().toISOString(),
    material_count: combined.length,
    assignment_status: 'unassigned',
    materials: combined,
  })

  const lines = [
    '# 얼굴 재료 외형 카탈로그',
    '',
    `미배정 얼굴 재료 ${combined.length}장이다. 수집 당시 인물명은 출처 provenance일 뿐 배정을 뜻하지 않는다.`,
    '',
    '| ID | 이미지 | 외형 | 머리·수염 | 얼굴 에너지 | 신화 잠재력 | 잘 맞는 유형 |',
    '|---|---|---|---|---|---:|---|',
  ]
  for (const material of combined) {
    const a = material.appearance
    const appearance = [a.apparent_age_band, a.presentation, a.visible_skin_tone, a.face_shape]
      .map(markdownText)
      .filter(Boolean)
      .join(' · ')
    const hair = [a.hair, a.facial_hair].map(markdownText).filter(Boolean).join(' / ')
    const imageLink = `./재료/${encodeURIComponent(material.filename)}`
    lines.push(
      `| \`${material.material_id}\` | [보기](${imageLink}) | ${appearance} | ${hair} | ` +
      `${markdownText(a.expression_energy)} | ${a.mythic_face_potential_score}/5 | ` +
      `${a.best_archetypes.map(markdownText).join(', ')} |`,
    )
  }
  lines.push('')
  writeFileSync(MARKDOWN_PATH, `${lines.join('\n')}\n`, 'utf8')

  console.log(JSON.stringify({
    materials: combined.length,
    markdown: MARKDOWN_PATH,
    combined_json: COMBINED_PATH,
  }, null, 2))
}

main()
