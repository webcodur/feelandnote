import sharp from 'sharp'
import { extractCoverPalette } from './coverPalette'

const MAX_COVER_BYTES = 8 * 1024 * 1024

/** 주소는 등록된 작품의 판본에서만 받는다. 외부 표지를 서버에서 읽어 CORS에 의존하지 않는다. */
export async function readBookCoverPalette(source: string) {
  const url = new URL(source)
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid cover protocol')
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) })
  if (!response.ok || Number(response.headers.get('content-length')) > MAX_COVER_BYTES) throw new Error('Cover unavailable')
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > MAX_COVER_BYTES) throw new Error('Cover too large')
  const { data } = await sharp(buffer, { limitInputPixels: 20_000_000 })
    .rotate().resize(32, 48, { fit: 'inside' }).toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const palette = extractCoverPalette(data)
  if (!palette) throw new Error('Cover has no visible pixels')
  return palette
}
