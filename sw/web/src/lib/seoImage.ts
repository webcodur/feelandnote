import 'server-only'

import sharp from 'sharp'

export const SEO_IMAGE_SIZE = 800

type SeoImageVariant = 'person' | 'content'

const MAX_SOURCE_BYTES = 12 * 1024 * 1024
const MAX_REDIRECTS = 3
const SOURCE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7

const ALLOWED_IMAGE_HOSTS = new Set([
  't1.daumcdn.net',
  'image.tmdb.org',
  'covers.openlibrary.org',
  'i.scdn.co',
  'i.gr-assets.com',
  'images.igdb.com',
  'books.google.com',
  'image.aladin.co.kr',
  'image.yes24.com',
  'upload.wikimedia.org',
  'contents.kyobobook.co.kr',
])

const ALLOWED_IMAGE_HOST_SUFFIXES = [
  '.r2.dev',
  '.supabase.co',
  '.spotifycdn.com',
  '.mzstatic.com',
  '.imgix.net',
  '.bigcommerce.com',
]

function isAllowedImageUrl(url: URL): boolean {
  if (url.protocol !== 'https:') return false

  const hostname = url.hostname.toLowerCase()
  return ALLOWED_IMAGE_HOSTS.has(hostname)
    || ALLOWED_IMAGE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
}

async function fetchImageBuffer(sourceUrl: string): Promise<Buffer> {
  let currentUrl = new URL(sourceUrl)

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
    if (!isAllowedImageUrl(currentUrl)) {
      throw new Error(`허용되지 않은 이미지 호스트: ${currentUrl.hostname}`)
    }

    const response = await fetch(currentUrl, {
      redirect: 'manual',
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': 'FeelAndNoteImageBot/1.0 (+https://feelandnote.com)',
      },
      next: { revalidate: SOURCE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8_000),
    })

    if (response.status >= 300 && response.status < 400) {
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
  const symbol = variant === 'person'
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
      <text x="400" y="735" text-anchor="middle" fill="#d4af37" font-family="Arial, sans-serif" font-size="30" letter-spacing="8">FEEL &amp; NOTE</text>
    </svg>
  `)

  return sharp(svg).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
}

async function composeSquareImage(source: Buffer, variant: SeoImageVariant): Promise<Buffer> {
  const normalized = await sharp(source, { failOn: 'error' })
    .rotate()
    .png()
    .toBuffer()

  const foregroundSize = variant === 'person'
    ? { width: 748, height: 748 }
    : { width: 610, height: 680 }

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

  const displayed = variant === 'content'
    ? await sharp(foreground.data)
        .extend({ top: 10, right: 10, bottom: 10, left: 10, background: '#171512' })
        .png()
        .toBuffer({ resolveWithObject: true })
    : foreground

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
    .png({ compressionLevel: 9, adaptiveFiltering: true })
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
      'Content-Type': 'image/png',
      'Content-Length': String(image.byteLength),
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000',
    },
  })
}
