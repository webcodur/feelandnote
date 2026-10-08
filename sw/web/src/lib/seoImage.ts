import 'server-only'

import sharp from 'sharp'
import { rawFetch } from '@/lib/rawFetch'
import { isAllowedSeoImageUrl } from '@/lib/seoImageOrigin'

export const SEO_IMAGE_SIZE = 800

type SeoImageVariant = 'person' | 'avatar' | 'content'

const MAX_SOURCE_BYTES = 12 * 1024 * 1024
const MAX_REDIRECTS = 3

async function fetchImageBuffer(sourceUrl: string): Promise<Buffer> {
  let currentUrl = new URL(sourceUrl)

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (!isAllowedSeoImageUrl(currentUrl)) {
      throw new Error(`허용되지 않은 이미지 호스트: ${currentUrl.hostname}`)
    }

    // 원본 fetch 를 쓴다 — Next 데이터 캐시(2MB 한도)에 이미지 본문이 들어가지도 않았고,
    // 패치된 fetch 의 중복제거 캐시가 응답 버퍼를 붙들어 heap 이 샜다(lib/rawFetch.ts 참조).
    // 결과물 자체가 라우트·Cloudflare 에서 30일 캐시되므로 원본 재수집은 재생성 때만 일어난다.
    const response = await rawFetch(currentUrl, {
      redirect: 'manual',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'FeelAndNoteImageBot/1.0 (+https://feelandnote.com)',
      },
      signal: AbortSignal.timeout(8_000),
    })

    if (response.status >= 300 && response.status < 400) {
      // 본문을 읽지 않는 응답은 명시적으로 닫아 연결·버퍼를 바로 놓는다
      await response.body?.cancel().catch(() => {})
      const location = response.headers.get('location')
      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error('이미지 리다이렉트를 완료하지 못했습니다.')
      }
      currentUrl = new URL(location, currentUrl)
      continue
    }

    if (!response.ok) {
      throw new Error(`이미지 응답 오류: ${response.status}`)
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
      throw new Error(`이미지가 아닌 응답: ${contentType}`)
    }

    const declaredLength = Number(response.headers.get('content-length') ?? 0)
    if (declaredLength > MAX_SOURCE_BYTES) {
      throw new Error('이미지 원본이 허용 용량을 넘습니다.')
    }

    const bytes = await response.arrayBuffer()
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_SOURCE_BYTES) {
      throw new Error('이미지 원본 크기가 올바르지 않습니다.')
    }

    return Buffer.from(bytes)
  }

  throw new Error('이미지 리다이렉트 횟수를 초과했습니다.')
}

async function createFallbackImage(variant: SeoImageVariant): Promise<Buffer> {
  const symbol = variant !== 'content'
    ? '<circle cx="400" cy="310" r="112"/><path d="M210 650c18-128 92-200 190-200s172 72 190 200z"/>'
    : '<path d="M260 185h250c28 0 50 22 50 50v390H310c-28 0-50-22-50-50V185zm50 0v390h250"/>'

  const svg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${SEO_IMAGE_SIZE}" height="${SEO_IMAGE_SIZE}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#211c16"/>
          <stop offset="1" stop-color="#070706"/>
        </linearGradient>
        <pattern id="grain" width="24" height="24" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1" fill="#d4af37" fill-opacity=".11"/>
          <circle cx="17" cy="13" r="1" fill="#ffffff" fill-opacity=".05"/>
        </pattern>
      </defs>
      <rect width="800" height="800" fill="url(#bg)"/>
      <rect width="800" height="800" fill="url(#grain)"/>
      <g fill="none" stroke="#d4af37" stroke-width="12" stroke-linejoin="round" opacity=".72">
        ${symbol}
      </g>
    </svg>
  `)

  return sharp(svg).flatten({ background: '#14110d' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
}

let avatarBackground: Promise<Buffer> | undefined

/** 황갈색 종이·회벽의 불규칙한 결. 고정 시드로 생성해 요청마다 모양이 바뀌지 않는다. */
function createAvatarBackground(): Promise<Buffer> {
  return avatarBackground ??= (async () => {
    const pixels = Buffer.alloc(SEO_IMAGE_SIZE * SEO_IMAGE_SIZE * 3)
    const noise = (x: number, y: number) => {
      let value = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263)
      value = Math.imul(value ^ (value >>> 13), 1274126177)
      return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff * 2 - 1
    }
    const surface = (x: number, y: number, scale: number) => {
      const gx = Math.floor(x / scale), gy = Math.floor(y / scale)
      const fx = x / scale - gx, fy = y / scale - gy
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy)
      const upper = noise(gx, gy) * (1 - sx) + noise(gx + 1, gy) * sx
      const lower = noise(gx, gy + 1) * (1 - sx) + noise(gx + 1, gy + 1) * sx
      return upper * (1 - sy) + lower * sy
    }
    for (let y = 0; y < SEO_IMAGE_SIZE; y++) {
      for (let x = 0; x < SEO_IMAGE_SIZE; x++) {
        const light = 24 * Math.exp(-(((x - 360) / 430) ** 2 + ((y - 190) / 560) ** 2))
        const grain = surface(x, y, 144) * 12 + surface(x, y, 24) * 5 + noise(x, y) * 4
        const tone = light + grain - y / SEO_IMAGE_SIZE * 9
        const index = (y * SEO_IMAGE_SIZE + x) * 3
        pixels[index] = Math.round(193 + tone)
        pixels[index + 1] = Math.round(151 + tone)
        pixels[index + 2] = Math.round(94 + tone)
      }
    }
    return sharp(pixels, { raw: { width: SEO_IMAGE_SIZE, height: SEO_IMAGE_SIZE, channels: 3 } }).png().toBuffer()
  })()
}

async function composeSquareImage(source: Buffer, variant: SeoImageVariant): Promise<Buffer> {
  const normalized = await sharp(source, { failOn: 'error' })
    .rotate()
    .png()
    .toBuffer()

  if (variant === 'avatar') {
    const [background, foreground] = await Promise.all([
      createAvatarBackground(),
      sharp(normalized).resize({ width: 736, height: 760, fit: 'inside' }).png().toBuffer({ resolveWithObject: true }),
    ])
    return sharp(background)
      .composite([{ input: foreground.data, left: Math.round((SEO_IMAGE_SIZE - foreground.info.width) / 2), top: SEO_IMAGE_SIZE - foreground.info.height }])
      .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer()
  }

  // 검색 썸네일에서도 환경 사진 전체를 보존한다. 누끼 아바타의 투명 영역은 밝게 채운다.
  if (variant === 'person') {
    return sharp(normalized)
      .resize(SEO_IMAGE_SIZE, SEO_IMAGE_SIZE, { fit: 'contain', background: '#f3efe7' })
      .flatten({ background: '#f3efe7' })
      .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer()
  }

  const foregroundSize = { width: 610, height: 680 }

  const [background, foreground] = await Promise.all([
    sharp(normalized)
      .resize(SEO_IMAGE_SIZE, SEO_IMAGE_SIZE, { fit: 'cover', position: 'centre' })
      .flatten({ background: '#14110d' })
      .blur(34)
      .modulate({ brightness: 0.42, saturation: 0.72 })
      .png()
      .toBuffer(),
    sharp(normalized)
      .resize({ ...foregroundSize, fit: 'inside' })
      .png()
      .toBuffer({ resolveWithObject: true }),
  ])

  const displayed = await sharp(foreground.data)
    .extend({ top: 10, right: 10, bottom: 10, left: 10, background: '#171512' })
    .png()
    .toBuffer({ resolveWithObject: true })

  const left = Math.round((SEO_IMAGE_SIZE - displayed.info.width) / 2)
  const top = Math.round((SEO_IMAGE_SIZE - displayed.info.height) / 2)
  const shadow = await sharp(displayed.data)
    .ensureAlpha()
    .tint('#000000')
    .blur(16)
    .png()
    .toBuffer()

  const scrim = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><rect width="800" height="800" fill="#050505" fill-opacity=".32"/></svg>`,
  )

  return sharp(background)
    .composite([
      { input: scrim, left: 0, top: 0 },
      { input: shadow, left: Math.min(left + 10, SEO_IMAGE_SIZE - displayed.info.width), top: Math.min(top + 14, SEO_IMAGE_SIZE - displayed.info.height) },
      { input: displayed.data, left, top },
    ])
    .flatten({ background: '#14110d' })
    .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer()
}

export async function createSquareSeoImage(
  sourceUrl: string | null | undefined,
  variant: SeoImageVariant,
): Promise<Buffer> {
  if (!sourceUrl) return createFallbackImage(variant)

  try {
    const source = await fetchImageBuffer(sourceUrl)
    return await composeSquareImage(source, variant)
  } catch (error) {
    const hostname = (() => {
      try {
        return new URL(sourceUrl).hostname
      } catch {
        return 'invalid-url'
      }
    })()
    console.warn(`[SEO 이미지] ${hostname} 원본 처리 실패, 기본 이미지로 대체합니다.`, error)
    return createFallbackImage(variant)
  }
}

export function createSeoImageResponse(image: Buffer): Response {
  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(image.byteLength),
      // 사진 계열은 PNG가 5~7배 크다(인물 668KB→JPEG ≈100KB). 크롤러가 ID마다 처음 여는 요청이 하루 2,700건이라
      // 이 바이트가 그대로 Fast Origin Transfer가 된다. CDN 보관도 30일로 늘린다(아바타 교체 시 태그로 무효화된다).
      'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000',
    },
  })
}
