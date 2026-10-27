import sharp from 'sharp'
import { join } from 'node:path'

export interface Row {
  name: string
  faceCount?: number
  error?: string
  crop?: { left: number; top: number; size: number }
  spanRatio?: number
  eyeLine?: number
  centerLine?: number
  visualShiftRatio?: number
  headroom?: number
  /** 부각량. 양수면 왼쪽 부각, 음수면 오른쪽 부각. 가로 이동 기준은 아니다. */
  emphasis?: number
  decidedBy?: string
  upscale?: number
  warnings?: string[]
}

export async function makeSheet(rows: Row[], sources: Map<string, string>, dstDir: string) {
  const cell = 200
  const gap = 6
  const pairsPerRow = 5
  const perSheet = 30
  const label = 22
  const done = rows.filter((r) => r.crop)
  for (let s = 0; s * perSheet < done.length; s++) {
    const chunk = done.slice(s * perSheet, (s + 1) * perSheet)
    const nRows = Math.ceil(chunk.length / pairsPerRow)
    const width = pairsPerRow * (cell * 2 + gap * 3)
    const height = nRows * (cell + label + gap)
    const composites: sharp.OverlayOptions[] = []
    const svgLabels: string[] = []
    for (let i = 0; i < chunk.length; i++) {
      const r = chunk[i]
      const col = i % pairsPerRow
      const rowI = Math.floor(i / pairsPerRow)
      const x0 = col * (cell * 2 + gap * 3) + gap
      const y0 = rowI * (cell + label + gap) + label
      const before = await sharp(sources.get(r.name)!)
        .resize(cell, cell, { fit: 'contain', background: '#5a6270' })
        .png().toBuffer()
      const after = await sharp(join(dstDir, r.name + '.webp')).resize(cell, cell).png().toBuffer()
      composites.push({ input: before, left: x0, top: y0 }, { input: after, left: x0 + cell + gap, top: y0 })
      const tag = `${r.name}  ${((r.spanRatio ?? 0) * 100).toFixed(0)}% ${r.decidedBy}${r.warnings?.length ? ' !' : ''}`
      const escapedTag = tag.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      svgLabels.push(`<text x="${x0}" y="${y0 - 6}" font-size="13" fill="#fff" font-family="sans-serif">${escapedTag}</text>`)
    }
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgLabels.join('')}</svg>`
    await sharp({ create: { width, height, channels: 4, background: '#5a6270' } })
      .composite([...composites, { input: Buffer.from(svg), left: 0, top: 0 }])
      .png()
      .toFile(join(dstDir, `_sheet-${String(s + 1).padStart(3, '0')}.png`))
  }
  console.log(`대조 격자 ${Math.ceil(done.length / perSheet)}장 → ${dstDir}/_sheet-*.png (왼쪽 전 · 오른쪽 후)`)
}
