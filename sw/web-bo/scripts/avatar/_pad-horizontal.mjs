// 중심축 백필 전용 — 입력 폴더의 webp를 좌우 투명 패딩해 출력 폴더에 쓴다.
// 실루엣이 원본 좌우 가장자리에 닿은 이미지는 재배치가 가로로 못 움직인다.
// 사용법: node scripts/avatar/_pad-horizontal.mjs <입력폴더> <출력폴더>
import sharp from 'sharp'
import { mkdirSync, readdirSync } from 'fs'
import { join, parse as parsePath } from 'path'

const [inDir, outDir] = process.argv.slice(2)
if (!inDir || !outDir) {
  console.error('사용법: node scripts/avatar/_pad-horizontal.mjs <입력폴더> <출력폴더>')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })
const files = readdirSync(inDir).filter((f) => /\.webp$/i.test(f))
let n = 0
for (const f of files) {
  const src = join(inDir, f)
  const m = await sharp(src).metadata()
  const pad = Math.round(m.width * 0.3)
  await sharp(src)
    .extend({ left: pad, right: pad, top: 0, bottom: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFormat('webp', { lossless: true })
    .toFile(join(outDir, f))
  n++
}
console.log(`패딩 ${n}장 → ${outDir} (좌우 +30%)`)
