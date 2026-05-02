import type { VoiceSection } from '../voice-utils'
import type { CinematicImage, ImageField, VoiceInfo } from './types'
import { isVideoFile } from '@/lib/media-exts'

export { isVideoFile }

/** imageBaseUrl(`/api/{series}/images/{ep}`) 기준 파일 src 생성. 영상은 videos 라우트로 스왑. */
export function mediaSrc(imageBaseUrl: string, fileName: string): string {
  if (isVideoFile(fileName)) {
    return `${imageBaseUrl.replace('/images/', '/videos/')}/${fileName}`
  }
  return `${imageBaseUrl}/${fileName}`
}

export function bookKey(i: number, phase: string) {
  return `D${String(i + 1).padStart(2, '0')}${phase}`
}

/**
 * 옵션 2: 쇼츠 파일 키. shortsIndex는 1-based(필수 접두사).
 * 예: shorts-1/S01-hook, shorts-2/S03-book-title
 */
export function shortsKey(i: number, segId: string, shortsIndex = 1) {
  const base = `S${String(i + 1).padStart(2, '0')}-${segId}`
  return `shorts-${shortsIndex}/${base}`
}

export function lookupVoice(sectionMap: Map<string, VoiceSection>, key: string, durationFromJson?: number): VoiceInfo {
  const sec = sectionMap.get(key)
  const exists = !!(sec?.gemini || sec?.elevenlabs || sec?.common)
  const fileDur = sec?.gemini?.duration ?? sec?.elevenlabs?.duration ?? sec?.common?.duration
  return { sectionKey: key, duration: durationFromJson ?? fileDur, exists }
}

export function matchImagesToField(
  images: CinematicImage[] | undefined,
  fieldName: ImageField,
  fieldText: string,
  isFirst: boolean,
): CinematicImage[] {
  if (!images?.length) return []
  return images.filter((img, i) => {
    if (i === 0) return img.field ? img.field === fieldName : isFirst
    if (img.field) return img.field === fieldName
    if (img.text) return fieldText.includes(img.text)
    return false
  })
}

export function unmatchedImages(
  images: CinematicImage[] | undefined,
  texts: string[],
): CinematicImage[] {
  if (!images?.length) return []
  return images.filter((img, i) => {
    if (i === 0) return false
    if (img.field) return false
    if (!img.text) return true
    return !texts.some(t => t.includes(img.text!))
  })
}

export function splitHighlights(text: string, anchors: string[]): { text: string; highlight: boolean }[] {
  if (!anchors.length) return [{ text, highlight: false }]
  const parts: { text: string; highlight: boolean }[] = []
  const sorted = anchors
    .map(a => ({ anchor: a, idx: text.indexOf(a) }))
    .filter(a => a.idx >= 0)
    .sort((a, b) => a.idx - b.idx)
  let cursor = 0
  for (const { anchor, idx } of sorted) {
    const pos = text.indexOf(anchor, cursor)
    if (pos < 0) continue
    if (pos > cursor) parts.push({ text: text.slice(cursor, pos), highlight: false })
    parts.push({ text: anchor, highlight: true })
    cursor = pos + anchor.length
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), highlight: false })
  return parts.length ? parts : [{ text, highlight: false }]
}

export const stripExt = (f: string) => f.replace(/\.[^.]+$/, '')

// --- Image prefix system ---

/** Image prefix format: {bookNum}-{fieldCode}-{baseName}.{ext} */
export type ImagePrefix = {
  bookNum: number    // 1-based book index
  fieldCode: number  // 1=summary, 2=context, 3=quote
  baseName: string   // original filename without prefix
}

const FIELD_CODES: Record<ImageField, number> = { summary: 1, context: 2, quote: 3 }
const FIELD_BY_CODE: Record<number, ImageField> = { 1: 'summary', 2: 'context', 3: 'quote' }

export function fieldFromCode(code: number): ImageField | null {
  return FIELD_BY_CODE[code] ?? null
}

/** Parse prefix from image filename. Returns null if no valid prefix. */
export function parseImagePrefix(filename: string): ImagePrefix | null {
  const match = filename.match(/^(\d+)-([123])-(.+)$/)
  if (!match) return null
  return {
    bookNum: parseInt(match[1], 10),
    fieldCode: parseInt(match[2], 10),
    baseName: match[3],
  }
}

/** Add prefix to image filename. bookIndex is 0-based. */
export function addImagePrefix(filename: string, bookIndex: number, field: ImageField): string {
  const base = stripImagePrefix(filename)
  const code = FIELD_CODES[field] ?? 2
  return `${bookIndex + 1}-${code}-${base}`
}

/** Strip prefix from image filename, returning the base name. */
export function stripImagePrefix(filename: string): string {
  const parsed = parseImagePrefix(filename)
  return parsed ? parsed.baseName : filename
}

/** Sort comparator for image filenames: prefixed first (by bookNum→fieldCode→baseName), unprefixed last */
export function compareImageNames(a: string, b: string): number {
  const pa = parseImagePrefix(a)
  const pb = parseImagePrefix(b)
  if (pa && pb) {
    if (pa.bookNum !== pb.bookNum) return pa.bookNum - pb.bookNum
    if (pa.fieldCode !== pb.fieldCode) return pa.fieldCode - pb.fieldCode
    return pa.baseName.localeCompare(pb.baseName)
  }
  if (pa && !pb) return -1  // prefixed first
  if (!pa && pb) return 1
  return a.localeCompare(b)  // both unprefixed: alphabetical
}

/** Distribute field='context'|'quote' images into sub-section buckets based on text anchor matching.
 *  field='quote': quote/after 슬롯으로 직접 분배 (앵커 없어도 OK — 매칭 실패 시 첫 pair quote)
 *  field='context': 기존 동작. main/quote/after 중 앵커 매칭된 슬롯 (레거시 호환 경로) */
export function distributeContextImages(
  allImgs: CinematicImage[],
  book: { contextMain?: string; quotePairs?: Array<{ quote?: string; after?: string }> },
): { main: CinematicImage[]; pairs: Array<{ quote: CinematicImage[]; after: CinematicImage[] }> } {
  const main: CinematicImage[] = []
  const pairs = (book.quotePairs ?? []).map(() => ({ quote: [] as CinematicImage[], after: [] as CinematicImage[] }))

  // Build text list: [main, quote0, after0, quote1, after1, ...]
  const sections: { text: string; bucket: CinematicImage[] }[] = [
    { text: book.contextMain ?? '', bucket: main },
  ]
  for (let pi = 0; pi < (book.quotePairs?.length ?? 0); pi++) {
    const p = book.quotePairs![pi]
    sections.push({ text: p.quote ?? '', bucket: pairs[pi].quote })
    sections.push({ text: p.after ?? '', bucket: pairs[pi].after })
  }
  // quote 전용 섹션 (quote/after만) — field='quote' 이미지의 매칭 대상
  const quoteOnlySections = sections.slice(1)

  for (const img of allImgs) {
    if (img.field === 'quote') {
      if (!img.text) {
        // 앵커 없는 quote 이미지 → 첫 pair의 quote 슬롯
        if (pairs[0]) pairs[0].quote.push(img)
        else main.push(img)
        continue
      }
      let placed = false
      for (const sec of quoteOnlySections) {
        if (sec.text && sec.text.includes(img.text)) { sec.bucket.push(img); placed = true; break }
      }
      if (!placed && pairs[0]) { pairs[0].quote.push(img); placed = true }
      if (!placed) main.push(img)
    } else if (img.field === 'context') {
      if (!img.text) { main.push(img); continue }
      let placed = false
      for (const sec of sections) {
        if (sec.text && sec.text.includes(img.text)) { sec.bucket.push(img); placed = true; break }
      }
      if (!placed) main.push(img)
    }
  }

  return { main, pairs }
}

/** 특정 이미지 파일이 배정된 ScenarioRow의 sectionKey를 반환. 없으면 null.
 *  quote 이미지의 경우 text 앵커로 quotePairs 세부 위치(quote/after)까지 식별. */
export function locateImageSectionKey(
  fileName: string,
  books: Array<{ images?: CinematicImage[]; quotePairs?: Array<{ quote?: string; after?: string }> }>,
): string | null {
  for (let bi = 0; bi < books.length; bi++) {
    const book = books[bi]
    const img = (book.images ?? []).find(i => i.file === fileName)
    if (!img) continue
    if (img.field === 'summary' || !img.field) return bookKey(bi, 'b-summary')
    if (img.field === 'context') return bookKey(bi, 'c-context')
    if (img.field === 'quote') {
      const pairs = book.quotePairs ?? []
      if (img.text) {
        for (let pi = 0; pi < pairs.length; pi++) {
          const p = pairs[pi]
          if (p.quote && p.quote.includes(img.text)) return bookKey(bi, `d${pi * 2 + 1}-quote`)
          if (p.after && p.after.includes(img.text)) return bookKey(bi, `d${pi * 2 + 2}-after`)
        }
      }
      return pairs.length > 0 ? bookKey(bi, 'd1-quote') : bookKey(bi, 'c-context')
    }
  }
  return null
}

/** seg.image + seg.imageChangeAt → CinematicImage[] 변환 */
export function segToImages(seg: any): CinematicImage[] {
  const imgs: CinematicImage[] = []
  if (seg?.image) imgs.push({ file: seg.image.split('/').pop() })
  const changes = seg?.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
  for (const c of changes) imgs.push({ file: c.image.split('/').pop(), text: c.text })
  return imgs
}

