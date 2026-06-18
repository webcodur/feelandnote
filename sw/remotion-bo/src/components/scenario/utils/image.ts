import type { CinematicImage, ImageField } from '../types'
import { bookKey, bookFieldParts, partPhase } from './index'

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
  books: Array<{ images?: CinematicImage[]; summary?: string; summaryParts?: string[]; contextMain?: string; contextMainParts?: string[]; quotePairs?: Array<{ quote?: string; after?: string }> }>,
): string | null {
  // 토막 분할 필드 — 앵커 텍스트가 들어 있는 토막 행 키 반환 (못 찾으면 첫 토막)
  const partRowKey = (bi: number, letter: 'b' | 'c', suffix: 'summary' | 'context', full?: string, parts?: string[], text?: string) => {
    if (text) {
      const p = bookFieldParts(full, parts).findIndex(pt => pt.includes(text))
      if (p > 0) return bookKey(bi, partPhase(letter, suffix, p))
    }
    return bookKey(bi, partPhase(letter, suffix, 0))
  }
  for (let bi = 0; bi < books.length; bi++) {
    const book = books[bi]
    const img = (book.images ?? []).find(i => i.file === fileName)
    if (!img) continue
    if (img.field === 'summary' || !img.field) return partRowKey(bi, 'b', 'summary', book.summary, book.summaryParts, img.text)
    if (img.field === 'context') return partRowKey(bi, 'c', 'context', book.contextMain, book.contextMainParts, img.text)
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

/**
 * 이미지 파일이 풀에서 영구 삭제될 때 episode 안의 모든 사용처 참조를 비운다.
 *
 * 대상:
 *   - books[].images: { file } === target 항목 제거
 *   - shorts[].segments[].image: 일치 시 키 제거
 *   - shorts[].segments[].imageChangeAt: 일치 항목 제거(배열) 또는 키 제거(단일)
 *
 * 신구조 prefix 키(`<책>/basename`) 도 마지막 토막(basename) 으로 매칭한다.
 */
export function stripImageRefs<T extends Record<string, unknown>>(ep: T, target: string): T {
  const baseOf = (s: string) => (s.split('/').pop() ?? s)
  const tgts = new Set<string>([target, baseOf(target)])
  const hit = (v: unknown): boolean =>
    typeof v === 'string' && (tgts.has(v) || tgts.has(baseOf(v)))

  const next = JSON.parse(JSON.stringify(ep)) as Record<string, unknown>
  if (Array.isArray(next.books)) {
    for (const b of next.books as Array<Record<string, unknown>>) {
      if (Array.isArray(b?.images)) {
        b.images = (b.images as Array<Record<string, unknown>>).filter(
          img => !hit(img?.file),
        )
      }
    }
  }
  if (Array.isArray(next.shorts)) {
    for (const s of next.shorts as Array<Record<string, unknown>>) {
      const segs = (s as { segments?: Array<Record<string, unknown>> }).segments
      if (!Array.isArray(segs)) continue
      for (const seg of segs) {
        if (hit(seg.image)) delete seg.image
        const ch = seg.imageChangeAt
        if (Array.isArray(ch)) {
          const filtered = (ch as Array<Record<string, unknown>>).filter(c => !hit(c?.image))
          if (filtered.length === 0) delete seg.imageChangeAt
          else seg.imageChangeAt = filtered
        } else if (ch && typeof ch === 'object' && hit((ch as Record<string, unknown>).image)) {
          delete seg.imageChangeAt
        }
      }
    }
  }
  return next as T
}

/** 저장된 풀 경로(episodes/.../books/<책>/images/<rest>) → 풀의 파일 식별자 복원.
 *  파일 이름이 다른 책과 겹칠 때(dupNames)만 폴더 정보를 보존한 「<책>/<rest>」 상대경로를 돌려주고,
 *  겹치지 않으면 파일 이름(basename)을 그대로 돌려준다 — 서버 풀 키 규칙과 정확히 일치시킨다. */
export function imageKeyFromPath(p: string, dupNames?: Set<string>): string {
  if (!p) return ''
  const norm = p.replace(/\\/g, '/')
  const base = norm.split('/').pop() ?? norm
  if (!dupNames || !dupNames.has(base)) return base
  const mNew = norm.match(/\/books\/(.+?)\/images\/(.+)$/)
  if (mNew) return `${mNew[1]}/${mNew[2]}`
  const mOld = norm.match(/(?:^|\/)images\/(.+)$/)
  if (mOld) return mOld[1]
  return base
}

/** CinematicImage[] → seg 의 image · imageChangeAt 두 필드값으로 변환 (쇼츠·솔로 공용 쓰기 부품).
 *
 *  segToImages 의 역연산이다. 첫 칸(primary)은 seg.image 로, 나머지는 imageChangeAt 배열로 분산한다.
 *  - file 이 있으면 mediaPath 로 풀 경로(episodes/...)를 만들어 저장한다(BO 썸네일·렌더 공용 형식).
 *  - file 이 빈 문자열(자리표시)이면 '' 그대로 둬 슬롯을 보존한다(키를 지우면 라운드트립에서 슬롯이 사라진다).
 *  - imgs 가 비면 두 필드 모두 undefined(키 제거 의미).
 *
 *  반환 형태: { image?: string; imageChangeAt?: {...}[] }. undefined 인 필드는 호출부가 delete 처리한다. */
export function imagesToSeg(
  imgs: CinematicImage[],
  mediaPath: (fileName: string) => string,
): { image?: string; imageChangeAt?: Array<{ t: number; image: string; text?: string }> } {
  if (imgs.length === 0) return { image: undefined, imageChangeAt: undefined }
  const image = imgs[0].file ? mediaPath(imgs[0].file) : ''
  if (imgs.length === 1) return { image, imageChangeAt: undefined }
  const imageChangeAt = imgs.slice(1).map(img => ({
    t: typeof img.t === 'number' ? img.t : 0,
    image: img.file ? mediaPath(img.file) : '',
    ...(img.text ? { text: img.text } : {}),
  }))
  return { image, imageChangeAt }
}

/** seg.image + seg.imageChangeAt → CinematicImage[] 변환.
 *  primary(seg.image)는 file 만, 전환점(imageChangeAt)은 text + t 까지 함께 들고 와서 라운드트립 시 시각이 0 으로 깎이지 않게 한다.
 *  dupNames: 다른 책과 이름이 겹치는 파일 집합 — 겹치는 파일만 폴더 포함 식별자로 복원한다. */
export function segToImages(seg: any, dupNames?: Set<string>): CinematicImage[] {
  const imgs: CinematicImage[] = []
  // seg.image 키가 존재하면 빈 문자열(자리표시)이라도 primary 슬롯을 유지한다.
  // setImages 가 시작 이미지를 비울 때 ''로 저장하므로, 여기서 ''를 버리면 빈 시작 슬롯이
  // 라운드트립에서 사라지고 imageChangeAt 첫 앵커가 primary 자리로 올라가 text 가 깎인다.
  if (typeof seg?.image === 'string') imgs.push({ file: seg.image ? imageKeyFromPath(seg.image, dupNames) : '' })
  const changes = seg?.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
  for (const c of changes) {
    const file = typeof c?.image === 'string' ? imageKeyFromPath(c.image, dupNames) : ''
    imgs.push({
      file,
      ...(c?.text ? { text: c.text } : {}),
      ...(typeof c?.t === 'number' ? { t: c.t } : {}),
    })
  }
  return imgs
}
