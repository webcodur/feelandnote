// 원본 경계 검수판 — 출력 이미지 위에 원본 이미지가 차지한 영역(좌우상하 모서리)을 그린다.
// 패딩+크롭으로 원본 가장자리가 프레임 안에 들어온 곳이 어디인지 확인하기 위한 도구.
// 사용법: node scripts/avatar/_draw-bounds.mjs <출력png> <src이미지> <out이미지> <cropJson left,top,size,srcW,srcH>
import sharp from 'sharp'

const CELL = 360
const [out, srcFile, outFile, left, top, size, srcW, srcH, pad] = process.argv.slice(2)
const L = +left, T = +top, S = +size, W0 = +srcW, H0 = +srcH, P = +pad

// 원본 이미지는 패딩 캔버스에서 x∈[P, P+W0], y∈[0, H0] 를 차지한다.
// 출력 좌표 = (캔버스좌표 - crop.left/top) / crop.size * CELL
const ox = (x) => (x - L) / S * CELL
const oy = (y) => (y - T) / S * CELL
const rect = {
  x: Math.max(0, ox(P)),
  y: Math.max(0, oy(0)),
  r: Math.min(CELL, ox(P + W0)),
  b: Math.min(CELL, oy(H0)),
}
const border = `<rect x="${rect.x}" y="${rect.y}" width="${rect.r - rect.x}" height="${rect.b - rect.y}" fill="none" stroke="#ff40ff" stroke-width="3"/>`
const center = `<line x1="${CELL / 2}" y1="0" x2="${CELL / 2}" y2="${CELL}" stroke="#ffe600" stroke-width="2"/><line x1="0" y1="${CELL / 2}" x2="${CELL}" y2="${CELL / 2}" stroke="#ffe600" stroke-width="1"/>`

async function tile(file, draw) {
  const buf = await sharp(file).resize(CELL, CELL).png().toBuffer()
  return sharp(buf).composite([{ input: Buffer.from(`<svg width="${CELL}" height="${CELL}">${draw}</svg>`), top: 0, left: 0 }]).png().toBuffer()
}
const a = await tile(srcFile, `<rect x="2" y="2" width="${CELL - 4}" height="${CELL - 4}" fill="none" stroke="#ff40ff" stroke-width="3"/>${center}`)
const b = await tile(outFile, border + center)
const W = CELL * 2 + 24
await sharp({ create: { width: W, height: CELL + 16, channels: 4, background: '#3a3f4a' } })
  .composite([{ input: a, left: 8, top: 8 }, { input: b, left: CELL + 16, top: 8 }])
  .png().toFile(out)
console.log('→', out, `원본영역 x:${rect.x.toFixed(0)}~${rect.r.toFixed(0)} y:${rect.y.toFixed(0)}~${rect.b.toFixed(0)}`)
