export type CoverPalette = readonly [string, string, string]
export const COVER_PALETTE_VERSION = '2'

type Swatch = { r: number; g: number; b: number; count: number }
const hex = (rgb: number[]) => `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`
const saturation = (rgb: number[]) => (Math.max(...rgb) - Math.min(...rgb)) / Math.max(1, ...rgb)

/** 표지의 빈 여백보다 실제 유채색을 우선하며, 흑백 표지는 회색을 그대로 쓴다. */
export function extractCoverPalette(pixels: ArrayLike<number>): CoverPalette | null {
  const buckets = new Map<number, Swatch>()
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue
    const [r, g, b] = [pixels[i], pixels[i + 1], pixels[i + 2]]
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
    const swatch = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 }
    swatch.r += r; swatch.g += g; swatch.b += b; swatch.count++
    buckets.set(key, swatch)
  }
  const swatches = [...buckets.values()].map(({ r, g, b, count }) => ({ rgb: [r / count, g / count, b / count], count }))
  if (!swatches.length) return null
  const colored = swatches.filter(({ rgb, count }) => saturation(rgb) >= 0.1 && Math.max(...rgb) > 35 && count >= 3)
  const candidates = colored.length ? colored : swatches
  const weight = ({ rgb, count }: typeof swatches[number]) => count * (0.5 + saturation(rgb)) * Math.max(...rgb) / 255
  candidates.sort((a, b) => weight(b) - weight(a))
  const main = candidates[0].rgb
  const accent = candidates.find(({ rgb }) => rgb.reduce((sum, value, i) => sum + (value - main[i]) ** 2, 0) > 60 ** 2)?.rgb ?? main
  return [hex(main.map((value) => value * 0.4)), hex(main), hex(accent.map((value) => value * 0.8 + 255 * 0.2))]
}
