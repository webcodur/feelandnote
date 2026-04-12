/**
 * YouTube 메타 생성 공통 모듈
 *
 * remotion (업로드 스크립트)과 remotion-bo (메타 동기화) 양쪽에서 사용.
 * 단일원천(SSoT)으로, 이 파일 외에 YouTube 메타 생성 로직을 두지 않는다.
 */

// ─── 타입 ──────────────────────────────────────────────

export type UploadRecord = { videoId: string; uploadedAt: string }

export type EpisodeMeta = {
  /**
   * 레거시 필드. 신규 롱폼 타이틀 포맷("{셀럽}이 읽은 N권의 책")은 hook을 사용하지 않는다.
   * 쇼츠 타이틀의 최종 폴백(책 제목조차 없는 경우)으로만 사용된다 — 거의 트리거되지 않음.
   * 신규 lineup 등록 시 작성하지 않아도 된다.
   */
  hook?: { ko: string; en: string }
  shortsRelation?: { ko: string; en: string }
  /**
   * 쇼츠 인덱스별 전용 hook (레거시).
   * 키는 1-based 문자열("1", "2", "3", ...). 특정 인덱스에 항목이 없으면 최상위 hook으로 폴백한다.
   */
  shortsHooks?: Record<string, { ko: string; en: string }>
  uploads?: Record<string, UploadRecord>
}

export type YouTubeLink = { label: string; url: string }

export type YouTubeMeta = Record<string, { title?: string; description?: string; links?: YouTubeLink[] }>

export type BookForDesc = {
  title: string
  creator: string
  stats?: { publishYear?: string }
  titleDuration: number
  summaryDuration: number
  contextDuration: number
  quotePairs?: Array<{ quote: string; quoteSource?: string; quoteDuration?: number; after?: string; afterDuration?: number }>
}

export type EpisodeForChapters = {
  narrator: {
    serviceGreetingDuration: number
    serviceIntroDuration: number
    celebIntroDuration: number
    bridgeDuration: number
    labelSummaryDuration?: number
    labelContextDuration?: number
  }
  host: {
    voiceDuration: number
    featuredQuoteDuration: number
  }
  books: BookForDesc[]
}

// ─── 상수 ──────────────────────────────────────────────

const CATEGORY_EDUCATION = '27'

// ─── 타이틀 ────────────────────────────────────────────

/**
 * shortsIndex에 대응하는 hook을 선택한다.
 *
 * - shortsHooks 키는 1-based 문자열('1', '2', '3', ...).
 * - shortsIndex 자체가 1부터 시작하는 1-based 값이다(1 = 첫 번째 쇼츠).
 * - shortsIndex가 주어지면 meta.shortsHooks[shortsIndex.toString()]을 우선 조회한다.
 * - 해당 키가 없거나 shortsIndex가 undefined면 최상위 meta.hook[lang]으로 폴백한다.
 *   (기존 에피소드 대부분은 shortsHooks를 갖지 않으므로 이 폴백이 기본 경로다.)
 */
function resolveHook(
  meta: EpisodeMeta,
  lang: 'ko' | 'en',
  shortsIndex?: number,
): string {
  if (typeof shortsIndex === 'number' && shortsIndex >= 1) {
    const altHook = meta.shortsHooks?.[shortsIndex.toString()]
    if (altHook) return altHook[lang]
  }
  return meta.hook?.[lang] ?? ''
}

/**
 * 영상 타이틀 조립.
 *
 * 롱폼 신규 포맷:
 *   KO: "[서재탐방] {셀럽}{이/가} 읽은 {N}권의 책[ {part}부]"
 *   EN: "[Library Tour] {N} Books {celeb} Read[ - Part {part}]"
 *   - bookCount: 단일 부면 books.length, 다부면 series.totalBooks
 *   - partNumber: series.totalParts > 1 일 때만 부착
 *   - bookCount 누락 시 throw (조용한 폴백 금지)
 *
 * 쇼츠 포맷은 변경 없음 — meta.shortsRelation / shortsBookTitle 우선순위 유지.
 */
export function buildTitle(
  meta: EpisodeMeta,
  celebName: string,
  lang: 'ko' | 'en',
  isShorts: boolean,
  shortsIndex?: number,
  shortsBookTitle?: string,
  bookCount?: number,
  partNumber?: number,
): string {
  if (isShorts) {
    const relation = meta.shortsRelation?.[lang]
    // 1순위: 수식어 오버라이드 — "{인물}의 {수식어}, {책제목}"
    if (relation && shortsBookTitle) {
      return lang === 'ko'
        ? `${celebName}의 ${relation}, ${shortsBookTitle}`
        : `${celebName}'s ${relation}, ${shortsBookTitle}`
    }
    // 2순위: 자동 폴백 — "{인물}의 한 권, {책제목}"
    if (shortsBookTitle) {
      return lang === 'ko'
        ? `${celebName}의 한 권, ${shortsBookTitle}`
        : `${celebName}'s One Book, ${shortsBookTitle}`
    }
    // 3순위: 최종 폴백(책 제목조차 없을 때) — 레거시 hook 재활용 (거의 트리거되지 않음)
    const hook = resolveHook(meta, lang, shortsIndex)
    return hook ? `${celebName} - ${hook}` : celebName
  }

  // 롱폼 신규 포맷
  if (bookCount === undefined) {
    throw new Error('buildTitle: longform 타이틀에는 bookCount 가 필수다')
  }
  if (lang === 'ko') {
    const marker = subjectMarker(celebName)
    const partSuffix = partNumber && partNumber > 0 ? ` ${partNumber}부` : ''
    return `[서재탐방] ${celebName}${marker} 읽은 ${bookCount}권의 책${partSuffix}`
  }
  const partSuffix = partNumber && partNumber > 0 ? ` - Part ${partNumber}` : ''
  return `[Library Tour] ${bookCount} Books ${celebName} Read${partSuffix}`
}

// ─── 태그 ──────────────────────────────────────────────

export function buildTags(
  celebName: string,
  lang: 'ko' | 'en',
  isShorts: boolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _shortsIndex?: number,
): string[] {
  // 현재 태그 로직은 shortsIndex와 무관하다. 향후 인덱스별 태그 분기를 위한 자리표시.
  const name = celebName.replace(/\s/g, '')
  if (lang === 'ko') {
    const tags = [
      '서재탐방', name, celebName,
      '독서', '책추천', '도서추천', '인생책',
      '북튜브', '책소개', '인문학', '고전',
      '교양', '위인', '명언',
      'FeelAndNote', '필앤노트',
    ]
    if (isShorts) tags.push('Shorts')
    return tags
  }
  const tags = [
    'LibraryTour', name, celebName,
    'BookRecommendation', 'Books', 'Reading',
    'MustRead', 'BookTube', 'Classics',
    'Literature', 'Education', 'History',
    'GreatMinds', 'FeelAndNote',
  ]
  if (isShorts) tags.push('Shorts')
  return tags
}

// ─── 한글 조사 ─────────────────────────────────────────

function hasBatchim(name: string): boolean {
  const last = name.charCodeAt(name.length - 1)
  if (last < 0xAC00 || last > 0xD7A3) return false
  return (last - 0xAC00) % 28 !== 0
}

function subjectMarker(name: string): string {
  return hasBatchim(name) ? '이' : '가'
}

// ─── 설명 ──────────────────────────────────────────────

/**
 * 영상 설명문 조립.
 *
 * - 롱폼: 인트로 → 타임라인 → 링크 → 해시태그. 트랙리스트(수록 도서)는 타임라인과 중복되므로 제외.
 * - 쇼츠: 인트로 → 수록 도서(featured 한 권만) → 링크 → 해시태그.
 *   featuredBookIndex 가 주어지면 해당 책, 없으면 books[0].
 */
export function buildDescription(
  celebName: string,
  books: BookForDesc[],
  lang: 'ko' | 'en',
  isShorts: boolean,
  chapters?: { time: string; label: string }[],
  links?: YouTubeLink[],
  celebSlug?: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _shortsIndex?: number,
  featuredBookIndex?: number,
): string {
  // _shortsIndex는 현재 설명 본문에 영향을 주지 않는다.
  // 쇼츠별 hook을 본문에 노출하는 향후 커스터마이즈를 대비해 시그니처만 확보.
  const linkLines = (links && links.length > 0)
    ? links.map(l => `${l.label} — ${l.url}`)
    : []

  const celebProfileLine = celebSlug
    ? lang === 'ko'
      ? `${celebName} 프로필 — https://feelandnote.com/ko/celeb/${celebSlug}`
      : `${celebName} Profile — https://feelandnote.com/en/celeb/${celebSlug}`
    : undefined

  if (isShorts) {
    // 쇼츠: featured 책 한 권만 표시 (전체 책 목록은 롱폼 영상에서 다룸)
    const idx = featuredBookIndex ?? 0
    const featured = books[idx]
    const featuredLine = featured
      ? (() => {
          const year = featured.stats?.publishYear ? ` (${featured.stats.publishYear})` : ''
          return `${featured.title} — ${featured.creator}${year}`
        })()
      : ''

    const base = lang === 'ko'
      ? [`${celebName}의 서재를 탐방합니다.`, '', '📌 수록 도서', featuredLine]
      : [`Explore the library of ${celebName}.`, '', '📌 Featured Book', featuredLine]
    if (linkLines.length) base.push('', ...linkLines)
    base.push(
      '',
      lang === 'ko'
        ? `#Shorts #서재탐방 #${celebName.replace(/\s/g, '')} #독서 #책추천`
        : `#Shorts #LibraryTour #${celebName.replace(/\s/g, '')} #BookRecommendation`,
      '',
    )
    if (celebProfileLine) base.push(celebProfileLine)
    base.push('Feelandnote — https://feelandnote.com')
    return base.join('\n')
  }

  // 롱폼: 트랙리스트 제거 — 타임라인에 이미 책 정보가 노출되어 있다.
  if (lang === 'ko') {
    const lines = [`${celebName}${subjectMarker(celebName)} 읽은 ${books.length}권의 책을 소개합니다.`, '']
    if (chapters?.length) {
      lines.push('📚 타임라인', ...chapters.map(c => `${c.time} ${c.label}`), '')
    }
    lines.push('🔗 링크')
    if (celebProfileLine) lines.push(celebProfileLine)
    lines.push('Feelandnote — https://feelandnote.com')
    if (linkLines.length) lines.push(...linkLines)
    lines.push('', `#서재탐방 #${celebName.replace(/\s/g, '')} #독서 #책추천`)
    return lines.join('\n')
  }

  const lines = [`Discover the ${books.length} books that ${celebName} read.`, '']
  if (chapters?.length) {
    lines.push('📚 Timeline', ...chapters.map(c => `${c.time} ${c.label}`), '')
  }
  lines.push('🔗 Links')
  if (celebProfileLine) lines.push(celebProfileLine)
  lines.push('Feelandnote — https://feelandnote.com')
  if (linkLines.length) lines.push(...linkLines)
  lines.push('', `#LibraryTour #${celebName.replace(/\s/g, '')} #BookRecommendation`)
  return lines.join('\n')
}

// ─── 타임스탬프 계산 ───────────────────────────────────

const FPS = 60
const fr = (sec: number) => Math.round(sec * FPS)
const toF = (sec: number) => Math.ceil(sec * FPS) + fr(1.5)
const toAF = (sec: number) => Math.ceil(sec * FPS)

const PRE_LABEL_GAP = fr(0.4)
const POST_LABEL_GAP = fr(0.4)
const labelSF = (dur?: number) => dur ? toAF(dur) + fr(0.33) : fr(1.33)
const labelCF = (dur?: number) => dur ? toAF(dur) + fr(0.33) : fr(1.83)
const titleSummaryGap = (ld?: number) => PRE_LABEL_GAP + labelSF(ld) + POST_LABEL_GAP
const summaryContextGap = (ld?: number) => PRE_LABEL_GAP + labelCF(ld) + POST_LABEL_GAP

const CONTEXT_QUOTE_GAP = fr(1.5)
const QUOTE_CONTEXTAFTER_GAP = fr(0.4)
const BOOK_GAP = fr(3)

function bookTotalF(b: BookForDesc, lsd?: number, lcd?: number): number {
  let total = toF(b.titleDuration) + titleSummaryGap(lsd) + toF(b.summaryDuration) + summaryContextGap(lcd) + toF(b.contextDuration)
  // Sum all quote pair durations
  let pairDur = 0
  for (const p of b.quotePairs ?? []) {
    if (p.quoteDuration) pairDur += p.quoteDuration
    if (p.afterDuration) pairDur += p.afterDuration
  }
  if (pairDur > 0) {
    total += CONTEXT_QUOTE_GAP + toF(pairDur)
  }
  return total + labelSF(lsd) + labelCF(lcd)
}

function fmtTime(frames: number): string {
  const totalSec = Math.round(frames / FPS)
  const m = Math.floor(totalSec / 60)
  const ss = totalSec % 60
  return `${m}:${ss.toString().padStart(2, '0')}`
}

export function calcChapterTimestamps(
  ep: EpisodeForChapters,
  lang: 'ko' | 'en' = 'ko',
): { time: string; label: string }[] {
  const { narrator: n, host: h, books } = ep
  const intro = lang === 'ko' ? '인트로' : 'Intro'
  const chapters: { time: string; label: string }[] = [{ time: '0:00', label: intro }]

  const BRAND = fr(2.5)
  const svcG = toF(n.serviceGreetingDuration)
  const svcI = toF(n.serviceIntroDuration)
  const fqRaw = h.featuredQuoteDuration > 0 ? toF(h.featuredQuoteDuration) : 0
  const fq = fqRaw > 0 ? fqRaw + fr(1.5) : 0
  const CELEB_DELAY = fr(2.5)
  const celebIntro = CELEB_DELAY + (n.celebIntroDuration > 0 ? toF(n.celebIntroDuration) : fr(5))
  const philo = toF(h.voiceDuration)
  const hostIntro = celebIntro + fr(1) + philo
  const bridge = n.bridgeDuration > 0 ? toF(n.bridgeDuration) : fr(3.5)

  let cursor = BRAND + svcG + svcI + fq + hostIntro + bridge

  const lsd = n.labelSummaryDuration
  const lcd = n.labelContextDuration
  const mid = books.length > 10 ? Math.ceil(books.length / 2) : -1

  for (let i = 0; i < books.length; i++) {
    if (i > 0) cursor += BOOK_GAP
    if (i === mid) cursor += fr(9) + fr(4) // RECAP + INTERLUDE
    chapters.push({ time: fmtTime(cursor), label: `${books[i].title} — ${books[i].creator}` })
    cursor += bookTotalF(books[i], lsd, lcd)
  }

  cursor += fr(9) // RECAP_FRAMES
  chapters.push({ time: fmtTime(cursor), label: lang === 'ko' ? '수록 도서' : 'Featured Books' })

  return chapters
}

// ─── YouTube Snippet 조립 ──────────────────────────────

export type YouTubeSnippet = {
  title: string
  description: string
  tags: string[]
  categoryId: string
  defaultLanguage: string
  defaultAudioLanguage: string
}

/**
 * snippet 객체 조립. 업로드·메타 업데이트 양쪽에서 공유.
 *
 * shortsIndex는 현재 snippet 본문 자체에 영향을 주지 않는다(title/description은
 * 호출자 측에서 buildTitle/buildDescription에 shortsIndex를 전달해 이미 만들어진다).
 * 향후 인덱스별 snippet 분기를 위한 자리표시로만 받아둔다.
 */
export function buildYouTubeSnippet(params: {
  title: string
  description: string
  tags: string[]
  lang: 'ko' | 'en'
  shortsIndex?: number
}): YouTubeSnippet {
  const langCode = params.lang === 'ko' ? 'ko' : 'en'
  void params.shortsIndex
  return {
    title: params.title,
    description: params.description,
    tags: params.tags,
    categoryId: CATEGORY_EDUCATION,
    defaultLanguage: langCode,
    defaultAudioLanguage: langCode,
  }
}
