// 에이전트 검수용 이미지 미리보기. 모델 요청의 이미지 한도(base64 5 MB ≈ 원본 3.9 MB)를 넘는 파일을
// 원본 그대로 열면 세션 전체가 복구 불가로 터진다(대화 기록에 남아 재개할 때마다 같은 오류).
// 이미지가 여러 장 쌓인 대화는 장당 긴 변 2000px 한도도 걸린다. 크기와 픽셀 양쪽을 막는다.
//
// usage:
//   node.exe scripts/image-preview.mjs <img...>                 → .artifacts/preview/<이름>.jpg (긴 변 1600, 원본은 그대로)
//   node.exe scripts/image-preview.mjs --compare <a> <b> [...]  → 한 장에 나란히 붙인 비교본 1개
//   node.exe scripts/image-preview.mjs --hook                   → Kiro PreToolUse(read_file) 가드. 3 MB 이상이거나 긴 변이 MAX_EDGE를 넘으면 미리보기를 만들고 exit 2
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, '.artifacts', 'preview')
// 한도 5,242,880(base64) × 3/4 = 3,932,160. 여유를 두고 3 MB에서 막는다.
const LIMIT_BYTES = 3 * 1024 * 1024
// 다중 이미지 요청 한도 2000px에 여유를 둔 값. 비교본·확대 시트도 이 값을 넘기지 않는다.
const MAX_EDGE = 1600
const IMG_EXT = /\.(png|jpe?g|webp|gif)$/i

const sharp = createRequire(path.join(ROOT, 'sw', 'web-bo', 'package.json'))('sharp')

async function toJpeg(pipeline, maxEdge) {
  // 크기가 한도 밑으로 내려갈 때까지 화질·변 길이를 줄인다
  for (const [edge, q] of [[maxEdge, 85], [maxEdge, 72], [1200, 72], [900, 65]]) {
    const buf = await pipeline.clone().resize(edge, edge, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: q }).toBuffer()
    if (buf.length < LIMIT_BYTES) return buf
  }
  throw new Error('preview still too large')
}

function previewPath(src) {
  // 같은 이름의 다른 폴더 파일이 덮어쓰지 않게 상위 폴더 이름을 붙인다
  const parent = path.basename(path.dirname(src))
  return path.join(OUT, `${parent}__${path.parse(src).name}.jpg`)
}

async function preview(src) {
  fs.mkdirSync(OUT, { recursive: true })
  const dst = previewPath(src)
  const meta = await sharp(src).metadata()
  fs.writeFileSync(dst, await toJpeg(sharp(src), MAX_EDGE))
  return { src, dst, w: meta.width, h: meta.height, bytes: fs.statSync(src).size, previewBytes: fs.statSync(dst).size }
}

async function compare(files) {
  fs.mkdirSync(OUT, { recursive: true })
  const cellH = 900, gap = 12, labelH = 34
  const cells = []
  for (const f of files) {
    const buf = await sharp(f).resize({ height: cellH, withoutEnlargement: false }).toBuffer({ resolveWithObject: true })
    cells.push({ f, buf: buf.data, w: buf.info.width })
  }
  const W = cells.reduce((s, c) => s + c.w, 0) + gap * (cells.length - 1)
  const comps = []
  let x = 0
  for (const c of cells) {
    const label = path.basename(path.dirname(c.f)) + '/' + path.basename(c.f)
    const esc = label.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    comps.push({ input: c.buf, left: x, top: labelH })
    comps.push({ input: Buffer.from(`<svg width="${c.w}" height="${labelH}"><rect width="100%" height="100%" fill="#000"/><text x="8" y="24" font-size="20" fill="#ff0" font-family="Malgun Gothic, Arial">${esc}</text></svg>`), left: x, top: 0 })
    x += c.w + gap
  }
  const canvas = sharp({ create: { width: W, height: cellH + labelH, channels: 3, background: '#222' } }).composite(comps)
  const png = await canvas.png().toBuffer()
  const dst = path.join(OUT, `compare__${files.map(f => path.parse(f).name).join('__').slice(0, 120)}.jpg`)
  fs.writeFileSync(dst, await toJpeg(sharp(png), MAX_EDGE))
  return dst
}

function findPath(o) {
  if (!o || typeof o !== 'object') return null
  for (const k of ['path', 'file_path', 'filePath']) if (typeof o[k] === 'string') return o[k]
  for (const v of Object.values(o)) { const p = findPath(v); if (p) return p }
  return null
}

async function hook() {
  const raw = fs.readFileSync(0, 'utf8')
  let input = {}
  try { input = JSON.parse(raw) } catch { process.exit(0) }
  const p = findPath(input.tool_input ?? input.toolInput ?? input.input ?? input)
  if (!p || !IMG_EXT.test(p)) process.exit(0)
  const abs = path.isAbsolute(p) ? p : path.resolve(input.cwd || ROOT, p)
  if (!fs.existsSync(abs)) process.exit(0)
  let edge = 0
  try { const m = await sharp(abs).metadata(); edge = Math.max(m.width || 0, m.height || 0) } catch {}
  if (fs.statSync(abs).size < LIMIT_BYTES && edge <= MAX_EDGE) process.exit(0)
  try {
    const r = await preview(abs)
    process.stderr.write(`BLOCKED: ${abs} is ${r.bytes} bytes, ${r.w}x${r.h}; images over ${LIMIT_BYTES} bytes or longer than ${MAX_EDGE}px break the session (5 MB base64 / 2000px many-image limits). ` +
      `Read the preview instead: ${r.dst} (${r.w}x${r.h} source, preview ${r.previewBytes} bytes). ` +
      `For side-by-side checks use: node.exe scripts/image-preview.mjs --compare <a> <b>\n`)
  } catch (e) {
    process.stderr.write(`BLOCKED: ${abs} is over ${LIMIT_BYTES} bytes or ${MAX_EDGE}px and preview failed (${e.message}). Make a smaller copy before reading.\n`)
  }
  process.exit(2)
}

const args = process.argv.slice(2)
if (args[0] === '--hook') await hook()
else if (args[0] === '--compare') console.log(await compare(args.slice(1)))
else if (args.length) for (const f of args) { const r = await preview(f); console.log(`${r.dst}  (${r.w}x${r.h}, ${r.bytes} → ${r.previewBytes} bytes)`) }
else { console.error('usage: node.exe scripts/image-preview.mjs [--compare] <img...> | --hook'); process.exit(1) }
