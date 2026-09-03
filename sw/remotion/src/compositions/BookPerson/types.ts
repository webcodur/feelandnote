export const FPS = 60
export const W = 1080
export const H = 1920
export const HEADER_H = 320
export const SAFE_BOTTOM = 460
export const MID_H = H - HEADER_H - SAFE_BOTTOM
export const CONTENT_PAD = 48
/** TTS 목표와 같은 글자/초. duration 없을 때 길이 추정 */
export const CHARS_PER_SEC = 6

export const CL = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
}

export type BookPersonBook = {
  title: string
  text: string
  duration?: number
  image?: string
  voice?: string
}

export type BookPersonScript = {
  person: string
  /** 인물 한 줄. 소개하는 동안 헤더 보조 */
  role?: string
  /** 가운데 문장 제목. 나레이터가 읽고 지나간다 */
  lead?: string
  leadDuration?: number
  leadVoice?: string
  intro: string
  books: BookPersonBook[]
  title?: string
  bg?: string
  locale?: 'ko' | 'en'
}

export type BookPersonBeat = {
  id: string
  kind: 'lead' | 'intro' | 'book'
  text: string
  duration?: number
  image?: string
  voice?: string
  bookTitle?: string
}

export function buildBeats(script: BookPersonScript): BookPersonBeat[] {
  const beats: BookPersonBeat[] = []
  if (script.lead?.trim()) {
    beats.push({ id: 'lead', kind: 'lead', text: script.lead.trim(), duration: script.leadDuration, voice: script.leadVoice })
  }
  if (script.intro.trim()) {
    beats.push({ id: 'intro', kind: 'intro', text: script.intro })
  }
  script.books.forEach((book, i) => {
    beats.push({
      id: `book-${i + 1}`,
      kind: 'book',
      text: book.text,
      duration: book.duration,
      image: book.image,
      voice: book.voice,
      bookTitle: book.title,
    })
  })
  return beats
}

export function beatSec(beat: BookPersonBeat): number {
  if (beat.duration && beat.duration > 0) return beat.duration
  const chars = beat.text.replace(/\s/g, '').length
  return Math.max(2, chars / CHARS_PER_SEC)
}

export function calcBookPersonFrames(script: BookPersonScript): number {
  const total = buildBeats(script).reduce((sum, beat) => sum + beatSec(beat), 0)
  return Math.max(1, Math.round(total * FPS))
}

/** Remotion 컴포지션 ID는 a-zA-Z0-9- 만 받는다. 'dwight-d.-eisenhower' 처럼 점 든 폴더는 점을 버린다 */
export function bookPersonLabel(name: string): string {
  return name.split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('').replace(/[^A-Za-z0-9-]/g, '')
}

export function bookPersonCompId(name: string): string {
  return `BookPerson-${bookPersonLabel(name)}-KO-S-VID`
}

/** 편집기·창구와 같은 규칙. 파일명만 있으면 images/ 아래 */
export function bookPersonImageRel(episodeName: string, image?: string | null): string | null {
  if (!image) return null
  if (/^https?:\/\//.test(image)) return image
  const rel = image.includes('/') ? image : `images/${image}`
  return `book-person/${episodeName}/${rel}`
}
