/**
 * 1권 모드(Solo) — 자유 서술 마디 배열 빌더
 *
 * 구조: [인사(고정)] → [책메타(동적고정)] → [자유섹션 × n] → [아웃트로(동적고정)]
 *
 * 인사·책메타·아웃트로는 책 데이터에서 자동 구성된다(작성 부담 0).
 * 자유섹션만 작성자가 books/{slug}/solo.{ko,en}.json에 직접 채운다(솔로의 본체).
 * 자유섹션이 없으면(파일 미작성) 정형부만으로 회차가 구성된다.
 *
 * 음성 wav는 아직 없으므로 텍스트 길이 기반 폴백 시간을 사용한다.
 */
import type { BookEntry, BookRecommendScript, CelebHost, NarratorLines, Speaker, VoiceTimingSegment } from './types'
import { resolveImageFile } from './script'
import { vnSolo, vnTimingKey } from './voice-names'

/** 마디 안 이미지 전환 한 칸 — 해당 text가 마디 본문에서 시작되는 지점부터 image로 갈아낀다. */
export interface SoloImageChange {
  /** 이미지 파일 — basename 또는 'episodes/...' */
  image: string
  /** 전환 시작 문장/절 — 마디 본문 내 위치(글자수 비율)로 전환 시각 산정 */
  text?: string
  /** 전환 시각(초, 마디 시작 기준) — 음성 정렬 시 우선 사용 (선택) */
  t?: number
}

/** 자유섹션 — 작성자가 직접 채우는 솔로 본체. books/{slug}/solo.{ko,en}.json에 저장된다.
 *  한 섹션 = 한 호흡에 표시되는 텍스트 한 덩어리(영상의 한 마디). */
export interface SoloFreeSection {
  /** 섹션 식별자 — 음성 파일명·키 안정성용 */
  id: string
  /** 본문 텍스트 */
  text: string
  /** 그 섹션에 깔 단일 이미지 — basename 또는 'episodes/...' 절대 (선택) */
  image?: string
  /** 마디 안에서 문장별로 이미지를 갈아끼우는 전환 배열 (있으면 image보다 우선) */
  imageChangeAt?: SoloImageChange[]
  /** 음성 화자 — 무료 TTS / 성우. 비용 통제용 (기본 tts) */
  voice?: 'tts' | 'actor'
  /** 마디 종류 — quote는 자막을 색·이탤릭으로 강조 (기본 narration) */
  kind?: 'narration' | 'quote'
  /** 인용 출처 — kind가 quote일 때 작게 표기 (선택) */
  quoteSource?: string
  /** 직접 발화자 — 'host' 또는 episode.speakers[].id. actor 마디의 음색 라우팅에 사용. */
  speaker?: string
}

/** Solo 마디 — buildSoloScript가 자유섹션·정형부에서 조립하는 내부 렌더 단위. */
export interface SoloSegment {
  id: string
  text: string
  image?: string
  /** 마디 안 이미지 전환 — 있으면 image보다 우선 */
  imageChangeAt?: SoloImageChange[]
  /** 음성 화자 — 후속 음성 파이프라인에서 사용 */
  voice?: 'tts' | 'actor'
  kind: 'brand' | 'greeting' | 'title' | 'free' | 'quote' | 'outro'
  duration: number
  quoteSource?: string
  /** 직접 발화자 — 'host' 또는 episode.speakers[].id. */
  speaker?: string
  /** 이 마디의 전체 인덱스 (마디 배열 순서, 0-based) — 음성 파일·키 생성용 */
  segIndex: number
  /** 음성 정렬 결과 — 있으면 정확한 타이밍, 없으면 글자수 추정 폴백 */
  voiceTimings?: VoiceTimingSegment[]
}

/** Solo 스크립트 — 한 권 한 인물 한 회차의 전체 정보 */
export interface SoloScript {
  /** 인물 정보 (짧게만 사용) */
  host: CelebHost
  /** 대상 책 한 권 */
  book: BookEntry
  /** 인사·아웃트로 등 회차 공통 텍스트 (기존 narrator에서 차용) */
  narrator: NarratorLines
  /** SOLO 직접 발화에 쓰는 에피소드 공통 화자 카드. */
  speakers?: Speaker[]
  /** 마디 배열 — 정형부 + 자유섹션 */
  segments: SoloSegment[]
  /** 회차 총 길이(초) */
  totalDuration: number
  /** 로케일 */
  locale: 'ko' | 'en'
  /** 책 식별자 — 빌드 타임 slug */
  slug: string
  /** 인물 epName (음성·이미지 경로 해석용) */
  epName: string
  /** 책 인덱스 (0-based) — 음성 파일 경로·타이밍 키 생성용 */
  bookIndex: number
}

/** 글자 수 기반 시간 추정 — 한국어 0.18초/글자, 영어 0.06초/글자, 최소 1.5초 */
function estimateDuration(text: string, locale: 'ko' | 'en'): number {
  const len = text.replace(/\s/g, '').length
  const perChar = locale === 'en' ? 0.06 : 0.18
  return Math.max(1.5, len * perChar)
}

/** 마디 길이 산정 — voiceTimings가 있으면 마지막 세그먼트 end + 여운(0.3초), 없으면 글자수 추정. */
function resolveDuration(
  text: string,
  locale: 'ko' | 'en',
  timings: VoiceTimingSegment[] | undefined,
  extra = 0,
): number {
  if (timings && timings.length > 0) {
    const maxEnd = timings.reduce((m, t) => Math.max(m, t.end), 0)
    if (maxEnd > 0) return maxEnd + 0.3
  }
  return estimateDuration(text, locale) + extra
}

/**
 * 정형부 + 자유섹션을 마디 배열로 조립.
 *
 * 흐름: 인사 → 책 표지·제목 → 자유섹션(작성자 작성) → 아웃트로.
 */
function buildSoloSegments(
  book: BookEntry,
  host: CelebHost,
  narrator: NarratorLines,
  locale: 'ko' | 'en',
  freeSections: SoloFreeSection[],
  bookIndex: number,
  voiceTimings?: Record<string, VoiceTimingSegment[]>,
): SoloSegment[] {
  const segs: SoloSegment[] = []

  /** 다음 마디의 전체 인덱스 = 현재까지 쌓인 마디 수. 그 인덱스로 음성 키를 만들어 timing을 조회한다. */
  const timingFor = (id: string): VoiceTimingSegment[] | undefined => {
    if (!voiceTimings) return undefined
    const key = vnTimingKey(vnSolo(bookIndex, segs.length, id))
    return voiceTimings[key]
  }

  // 1) 인사 (고정)
  if (narrator.serviceGreeting) {
    const t = timingFor('greeting')
    segs.push({
      id: 'greeting', kind: 'greeting', segIndex: segs.length,
      text: narrator.serviceGreeting,
      voiceTimings: t,
      duration: resolveDuration(narrator.serviceGreeting, locale, t),
    })
  }
  const introText = locale === 'en'
    ? `Today's book — ${book.title} by ${book.creator}, brought to you by ${host.nickname_en}.`
    : `오늘의 한 권은 ${host.nickname}의 서재에서 꺼낸 ${book.title}입니다.`
  {
    const t = timingFor('intro')
    segs.push({
      id: 'intro', kind: 'greeting', segIndex: segs.length,
      text: introText,
      voiceTimings: t,
      duration: resolveDuration(introText, locale, t),
    })
  }

  // 2) 책메타 (동적고정) — 표지 + 제목·저자
  {
    const t = timingFor('title')
    segs.push({
      id: 'title', kind: 'title', segIndex: segs.length,
      text: `${book.title}\n${book.creator}`,
      image: book.thumbnail_url,
      voiceTimings: t,
      duration: resolveDuration(`${book.title} ${book.creator}`, locale, t) || 3,
    })
  }

  // 3) 자유섹션 (작성자 작성) — 솔로의 본체
  for (const fs of freeSections) {
    if (!fs.text?.trim()) continue
    const t = timingFor(fs.id)
    segs.push({
      id: fs.id,
      kind: fs.kind === 'quote' ? 'quote' : 'free',
      segIndex: segs.length,
      text: fs.text,
      image: fs.image,
      imageChangeAt: fs.imageChangeAt,
      voice: fs.voice ?? 'tts',
      quoteSource: fs.quoteSource,
      speaker: fs.speaker,
      voiceTimings: t,
      duration: resolveDuration(fs.text, locale, t, fs.kind === 'quote' ? 1 : 0),
    })
  }

  // 4) 아웃트로 (고정)
  const outroText = locale === 'en'
    ? `That was ${book.title}, one book from ${host.nickname_en}'s shelf.`
    : `이상으로 ${host.nickname}의 한 권, ${book.title}이었습니다.`
  {
    const t = timingFor('outro')
    segs.push({
      id: 'outro', kind: 'outro', segIndex: segs.length,
      text: outroText,
      voiceTimings: t,
      duration: resolveDuration(outroText, locale, t),
    })
  }

  return segs
}

/**
 * 한 회차의 SoloScript 조립.
 *
 * 책메타·인사·아웃트로는 book/narrator/host에서 자동 구성하고,
 * 자유섹션(freeSections)은 books/{slug}/solo.{ko,en}.json에서 로드해 그대로 싣는다.
 * 자유섹션이 비어 있으면 정형부만으로 회차가 구성된다.
 */
export function buildSoloScript(
  source: BookRecommendScript,
  bookIndex: number,
  epName: string,
  slug: string,
  freeSections: SoloFreeSection[],
  voiceTimings?: Record<string, VoiceTimingSegment[]>,
): SoloScript | null {
  const book = source.books[bookIndex]
  if (!book) return null
  const locale = (source.locale ?? 'ko') as 'ko' | 'en'
  const segments = buildSoloSegments(book, source.host, source.narrator, locale, freeSections, bookIndex, voiceTimings)
  const totalDuration = segments.reduce((sum, s) => sum + s.duration, 0)
    + segments.length * 0.3 // 마디 간 갭 0.3초씩
    + 4                      // 브랜드·로고 여유
  return {
    host: source.host,
    book,
    narrator: source.narrator,
    speakers: source.speakers,
    segments,
    totalDuration,
    locale,
    slug,
    epName,
    bookIndex,
  }
}

/** 이미지 파일 → public 풀 경로 (basename 매핑 활용) */
export function resolveSoloImage(epName: string, file: string | undefined): string | undefined {
  if (!file) return undefined
  if (file.startsWith('http://') || file.startsWith('https://')) return file
  return resolveImageFile(epName, file)
}
