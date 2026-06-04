// 솔로 이미지 경로 정규화 — 비표준 prefix(book/·musk/·_ref/ 등)를 쇼츠와 동일한
// episodes/.../books/<책>/images/<sub>/<basename> 풀 경로로 변환한다.
//
// 변환 규칙:
//   1) 이미 'episodes/' 또는 'http'로 시작하면 그대로 둔다(멱등).
//   2) 그 외에는 마지막 토막(basename)으로 실제 파일 위치를 디스크에서 찾아 풀 경로로 바꾼다.
//   3) basename이 디스크에 없으면 변환하지 않고 경고만 남긴다(데이터 손실 0 — 사람이 확인).
//
// 사용: node scripts/migrate-solo-image-paths.mjs <solo.json 절대경로> [--write]
//   --write 없으면 dry-run(변경 미적용, 변경 미리보기만 출력).

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import path from 'path'

const soloPath = process.argv[2]
const doWrite = process.argv.includes('--write')
if (!soloPath) {
  console.error('사용법: node migrate-solo-image-paths.mjs <solo.json> [--write]')
  process.exit(1)
}

// solo.json 위치: episodes/<...>/<인물>/books/<책>/solo.ko.json
// 풀 경로 prefix는 episodes/ 이후 전체. epRoot = 인물 폴더, bookFolder = 책 폴더명.
const bookDir = path.dirname(soloPath)
const bookFolder = path.basename(bookDir)
const personDir = path.dirname(path.dirname(bookDir)) // books/.. 의 부모
const imagesDir = path.join(bookDir, 'images')

// episodes/ 이후 인물 상대경로 — mediaPath 가 만드는 'episodes/<status?>/<name>' 의 name 부분.
const episodesIdx = personDir.replace(/\\/g, '/').lastIndexOf('/episodes/')
if (episodesIdx < 0) {
  console.error('경로에 /episodes/ 가 없다:', personDir)
  process.exit(1)
}
const personRel = personDir.replace(/\\/g, '/').slice(episodesIdx + '/episodes/'.length)

// 디스크 스캔 — basename → images 루트 기준 상대경로(sub/basename 또는 basename)
const basenameToRel = new Map()
const dupBasenames = new Set()
function walk(dir, rel) {
  for (const ent of readdirSync(dir)) {
    const abs = path.join(dir, ent)
    const st = statSync(abs)
    if (st.isDirectory()) walk(abs, rel ? `${rel}/${ent}` : ent)
    else {
      if (basenameToRel.has(ent)) dupBasenames.add(ent)
      basenameToRel.set(ent, rel ? `${rel}/${ent}` : ent)
    }
  }
}
if (existsSync(imagesDir)) walk(imagesDir, '')

// 풀 경로 합성 — 신구조: episodes/<person>/books/<책>/images/<rel>
function toPoolPath(rel) {
  return `episodes/${personRel}/books/${bookFolder}/images/${rel}`
}

function normalize(image) {
  if (!image) return image
  if (image.startsWith('episodes/') || image.startsWith('http://') || image.startsWith('https://')) return image
  const basename = image.split('/').pop()
  const rel = basenameToRel.get(basename)
  if (!rel) {
    console.warn(`[미발견] ${image} (basename=${basename}) — 변환 보류`)
    return image
  }
  if (dupBasenames.has(basename)) {
    console.warn(`[중복] ${basename} 가 여러 폴더에 존재 — ${rel} 로 매핑(확인 필요)`)
  }
  return toPoolPath(rel)
}

const data = JSON.parse(readFileSync(soloPath, 'utf-8'))
let changed = 0
const preview = []
for (const s of data.sections ?? []) {
  if (typeof s.image === 'string') {
    const next = normalize(s.image)
    if (next !== s.image) { preview.push([s.image, next]); s.image = next; changed++ }
  }
  for (const c of s.imageChangeAt ?? []) {
    if (typeof c.image === 'string') {
      const next = normalize(c.image)
      if (next !== c.image) { preview.push([c.image, next]); c.image = next; changed++ }
    }
  }
}

console.log(`\n변환 대상 ${changed}건 / 섹션 ${data.sections?.length ?? 0}개`)
for (const [a, b] of preview.slice(0, 8)) console.log(`  ${a}\n    → ${b}`)
if (preview.length > 8) console.log(`  ... 외 ${preview.length - 8}건`)

if (doWrite) {
  writeFileSync(soloPath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
  console.log(`\n저장 완료: ${soloPath}`)
} else {
  console.log('\n(dry-run — 적용하려면 --write 추가)')
}
