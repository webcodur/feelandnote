import type { VoiceSection } from '../voice-utils'
import type { CinematicImage, ImageField, VoiceInfo } from './types'

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
  fieldCode: number  // 1=summary, 2=context
  baseName: string   // original filename without prefix
}

const FIELD_CODES: Record<string, number> = { summary: 1, context: 2 }

/** Parse prefix from image filename. Returns null if no valid prefix. */
export function parseImagePrefix(filename: string): ImagePrefix | null {
  const match = filename.match(/^(\d+)-([12])-(.+)$/)
  if (!match) return null
  return {
    bookNum: parseInt(match[1], 10),
    fieldCode: parseInt(match[2], 10),
    baseName: match[3],
  }
}

/** Add prefix to image filename. bookIndex is 0-based. */
export function addImagePrefix(filename: string, bookIndex: number, field: 'summary' | 'context'): string {
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

/** Distribute field='context' images into sub-section buckets based on text anchor matching */
export function distributeContextImages(
  allImgs: CinematicImage[],
  book: { contextMain?: string; quotePairs?: Array<{ quote?: string; after?: string }> },
): { main: CinematicImage[]; pairs: Array<{ quote: CinematicImage[]; after: CinematicImage[] }> } {
  const ctxImgs = allImgs.filter(img => img.field === 'context')
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

  for (const img of ctxImgs) {
    if (!img.text) { main.push(img); continue }
    let placed = false
    for (const sec of sections) {
      if (sec.text && sec.text.includes(img.text)) { sec.bucket.push(img); placed = true; break }
    }
    if (!placed) main.push(img)
  }

  return { main, pairs }
}

/** seg.image + seg.imageChangeAt → CinematicImage[] 변환 */
export function segToImages(seg: any): CinematicImage[] {
  const imgs: CinematicImage[] = []
  if (seg?.image) imgs.push({ file: seg.image.split('/').pop() })
  const changes = seg?.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
  for (const c of changes) imgs.push({ file: c.image.split('/').pop(), text: c.text })
  return imgs
}

