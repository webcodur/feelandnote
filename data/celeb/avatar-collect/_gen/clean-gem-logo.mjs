// 로컬 워터마크 제거 — 우하단 고정 위치 다이아몬드(~0.882, 0.885) 제거
// 매끄러운 배경(테두리 std 낮음) → 테두리 평균색 플랫 채움
// 텍스처 배경 → 테두리 톤이 가장 비슷한 인접 패치 복제 + 평균색 보정
// 사용법: node clean-gem-logo.mjs [--only slug1,slug2] [--dry]
import { existsSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { createRequire } from 'module'

const require = createRequire('C:\\Users\\webco\\OneDrive\\바탕 화면\\YSJ\\PRJ\\feelnnote\\sw\\web-bo\\package.json')
const sharp = require('sharp')

const ROOT = resolve(process.cwd())
const OUT = join(ROOT, 'out')

const args = process.argv.slice(2)
const flag = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null }
const only = flag('only')?.split(',').filter(Boolean)
const dry = args.includes('--dry')

let queue = readdirSync(OUT).filter(f => f.endsWith('-gem.jpg') && !existsSync(join(OUT, f.replace('-gem.jpg', '-clean.png')))).map(f => f.replace('-gem.jpg', ''))
if (only?.length) queue = queue.filter(s => only.includes(s))
console.log(`로컬 정리 대상 ${queue.length}장${dry ? ' (dry)' : ''}`)
if (!queue.length) process.exit(0)

// rect 바깥/안쪽 t px 띠의 평균·표준편차
function ringStats(d, W, H, ch, x, y, w, h, t, outside) {
  let r = 0, g = 0, b = 0, n = 0
  const px2 = []
  for (let py = y - (outside ? t : 0); py < y + h + (outside ? t : 0); py++) {
    for (let px = x - (outside ? t : 0); px < x + w + (outside ? t : 0); px++) {
      if (px < 0 || py < 0 || px >= W || py >= H) continue
      const inX = px >= x && px < x + w, inY = py >= y && py < y + h
      const keep = outside ? !(inX && inY) : ((px < x + t || px >= x + w - t) || (py < y + t || py >= y + h - t)) && inX && inY
      if (!keep) continue
      const i = (py * W + px) * ch
      const lum = (d[i] + d[i + 1] + d[i + 2]) / 3
      px2.push(lum)
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++
    }
  }
  if (!n) return null
  const mean = [r / n, g / n, b / n]
  const m = px2.reduce((a, v) => a + v, 0) / n
  const std = Math.sqrt(px2.reduce((a, v) => a + (v - m) * (v - m), 0) / n)
  return { mean, std }
}

async function cleanOne(slug) {
  const src = join(OUT, `${slug}-gem.jpg`)
  const meta = await sharp(src).metadata()
  const W = meta.width, H = meta.height
  const k = W / 1024
  const rw = Math.round(120 * k), rh = Math.round(120 * k)
  const rx = Math.round(W * 0.882) - Math.round(rw / 2)
  const ry = Math.round(H * 0.885) - Math.round(rh / 2)
  const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true })
  const ch = info.channels
  const outer = ringStats(data, W, H, ch, rx, ry, rw, rh, 8, true)
  if (!outer) { console.log(`  ${slug} 테두리 산출 실패`); return 'fail' }

  let patch
  if (outer.std < 14) {
    // 매끄러운 배경 — 좌우·상하 테두리색을 양방향 보간한 그라데이션 채움
    const pd = Buffer.alloc(rw * rh * 3)
    const col = (px, py, s, e) => { // 세로 s..e 평균 RGB
      let r = 0, g = 0, b = 0, n = 0
      for (let y = s; y <= e; y++) {
        if (px < 0 || px >= W || y < 0 || y >= H) continue
        const i = (y * W + px) * ch; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
      }
      return n ? [r / n, g / n, b / n] : null
    }
    const row = (px, py, s, e) => {
      let r = 0, g = 0, b = 0, n = 0
      for (let x = s; x <= e; x++) {
        if (x < 0 || x >= W || py < 0 || py >= H) continue
        const i = (py * W + x) * ch; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
      }
      return n ? [r / n, g / n, b / n] : null
    }
    for (let y = 0; y < rh; y++) {
      const L = col(rx - 5, ry + y, ry + y, ry + y) || outer.mean
      const R = col(rx + rw + 4, ry + y, ry + y, ry + y) || L
      for (let x = 0; x < rw; x++) {
        const T = row(rx + x, ry - 5, rx + x, rx + x) || L
        const B = row(rx + x, ry + rh + 4, rx + x, rx + x) || T
        const tx = x / rw, ty = y / rh
        const o = (y * rw + x) * 3
        for (let c = 0; c < 3; c++) {
          const h = L[c] * (1 - tx) + R[c] * tx
          const v = T[c] * (1 - ty) + B[c] * ty
          const val = (h + v) / 2
          pd[o + c] = val < 0 ? 0 : val > 255 ? 255 : Math.round(val)
        }
      }
    }
    patch = await sharp(pd, { raw: { width: rw, height: rh, channels: 3 } }).png().toBuffer()
  } else {
    // 텍스처 — 테두리 톤이 가장 비슷한 인접 패치 복제 + 평균색 보정
    const offs = [[-150, 0], [-150, -80], [-80, -140], [0, -150], [-220, 0], [-60, -60]]
    let best = null
    for (const [dx, dy] of offs) {
      const sx = rx + Math.round(dx * k), sy = ry + Math.round(dy * k)
      if (sx < 0 || sy < 0 || sx + rw > W || sy + rh > H) continue
      const cand = ringStats(data, W, H, ch, sx, sy, rw, rh, 8, false)
      if (!cand) continue
      const d = Math.abs(cand.mean[0] - outer.mean[0]) + Math.abs(cand.mean[1] - outer.mean[1]) + Math.abs(cand.mean[2] - outer.mean[2])
      if (!best || d < best.d) best = { sx, sy, d, cand }
    }
    if (!best) { console.log(`  ${slug} 패치 후보 없음`); return 'fail' }
    const { data: pd, info: pi } = await sharp(src).extract({ left: best.sx, top: best.sy, width: rw, height: rh }).raw().toBuffer({ resolveWithObject: true })
    for (let i = 0; i < pd.length; i += pi.channels) {
      for (let c = 0; c < 3; c++) {
        const v = pd[i + c] + Math.round(outer.mean[c] - best.cand.mean[c])
        pd[i + c] = v < 0 ? 0 : v > 255 ? 255 : v
      }
    }
    patch = await sharp(pd, { raw: { width: pi.width, height: pi.height, channels: pi.channels } }).png().toBuffer()
  }
  const maskSvg = Buffer.from(`<svg width="${rw}" height="${rh}"><ellipse cx="${rw / 2}" cy="${rh / 2}" rx="${rw / 2 - 4}" ry="${rh / 2 - 4}" fill="white"/></svg>`)
  const mask = await sharp(maskSvg).blur(8).toBuffer()
  const patchA = await sharp(patch).ensureAlpha().joinChannel(mask).png().toBuffer()
  const outBuf = await sharp(src).composite([{ input: patchA, left: rx, top: ry }]).png().toBuffer()
  if (dry) {
    await sharp(outBuf).toFile(join(ROOT, `debug-local-${slug}.png`))
    console.log(`  ${slug} dry (std=${outer.std.toFixed(0)})`)
    return 'dry'
  }
  await sharp(outBuf).toFile(join(OUT, `${slug}-clean.png`))
  console.log(`  ${slug} 정리 완료 (std=${outer.std.toFixed(0)})`)
  return 'ok'
}

let ok = 0, fail = 0
for (const slug of queue) {
  try {
    const r = await cleanOne(slug)
    if (r === 'ok' || r === 'dry') ok++
  } catch (e) { console.log(`  ${slug} 예외: ${e.message.slice(0, 80)}`); fail++ }
}
console.log(`완료 ok=${ok} 실패=${fail}`)
process.exit(0)
