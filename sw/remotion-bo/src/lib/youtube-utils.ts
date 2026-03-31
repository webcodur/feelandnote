export type UploadRecord = { videoId: string; uploadedAt: string }

export type EpisodeMeta = {
  hook: { ko: string; en: string }
  privacyStatus: 'private' | 'unlisted' | 'public'
  uploads?: Record<string, UploadRecord>
}

export type YouTubeLink = { label: string; url: string }

export type YouTubeMeta = Record<string, { title?: string; description?: string; links?: YouTubeLink[] }>

/** 타이틀 생성 */
export function buildTitle(
  meta: EpisodeMeta,
  celebName: string,
  lang: 'ko' | 'en',
  isShorts: boolean,
): string {
  const hook = meta.hook[lang]
  const series = lang === 'ko' ? '서재탐방' : 'Library Tour'
  if (isShorts) return `${celebName} - ${hook}`
  return `[${series}] ${celebName} - ${hook}`
}

// --- 타임스탬프 계산 (timing.ts 근사값, FPS=60) ---

export type BookForDesc = {
  title: string
  creator: string
  stats?: { publishYear?: string }
  titleDuration: number
  summaryDuration: number
  contextDuration: number
  quoteDuration?: number
  contextAfterDuration?: number
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

// --- 프레임 기반 타이밍 (timing.ts 단일원천과 동일) ---

const FPS = 60
const fr = (sec: number) => Math.round(sec * FPS)
/** 섹션 프레임: 오디오 + 1.5초 버퍼 */
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
  if (b.quoteDuration) {
    total += CONTEXT_QUOTE_GAP + toF(b.quoteDuration)
    if (b.contextAfterDuration) total += QUOTE_CONTEXTAFTER_GAP + toF(b.contextAfterDuration)
  }
  return total + labelSF(lsd) + labelCF(lcd)
}

function fmtTime(frames: number): string {
  const sec = frames / FPS
  const m = Math.floor(sec / 60)
  const ss = Math.round(sec % 60)
  return `${m}:${ss.toString().padStart(2, '0')}`
}

/** 에피소드 데이터에서 챕터 타임스탬프 계산 (프레임 기반, render-all.ts와 동일) */
export function calcChapterTimestamps(
  ep: EpisodeForChapters,
  lang: 'ko' | 'en' = 'ko',
): { time: string; label: string }[] {
  const { narrator: n, host: h, books } = ep
  const intro = lang === 'ko' ? '인트로' : 'Intro'
  const chapters: { time: string; label: string }[] = [{ time: '0:00', label: intro }]

  // 인트로: Brand + SvcGreeting + SvcIntro + FeaturedQuote + HostIntro(CelebVisualDelay+CelebIntro+gap+Philosophy) + Bridge
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
    chapters.push({ time: fmtTime(cursor), label: `${i + 1}. ${books[i].title} — ${books[i].creator}` })
    cursor += bookTotalF(books[i], lsd, lcd)
  }

  cursor += fr(9) // RECAP_FRAMES
  chapters.push({ time: fmtTime(cursor), label: lang === 'ko' ? '수록 도서' : 'Featured Books' })

  return chapters
}

// --- 태그 생성 ---

/** YouTube 태그 생성 (인물명 + 시리즈 + 콘텐츠 키워드) */
export function buildTags(celebName: string, lang: 'ko' | 'en', isShorts: boolean): string[] {
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

// --- 한글 조사 ---

/** 마지막 글자 받침 유무 판별 (한글 외 문자는 받침 없음 처리) */
function hasBatchim(name: string): boolean {
  const last = name.charCodeAt(name.length - 1)
  if (last < 0xAC00 || last > 0xD7A3) return false
  return (last - 0xAC00) % 28 !== 0
}

/** 이/가 조사 */
function subjectMarker(name: string): string {
  return hasBatchim(name) ? '이' : '가'
}

// --- 설명 생성 v2 ---

/** 설명 생성 (롱폼: 타임스탬프+트랙 포함, 쇼츠: 간결) */
export function buildDescriptionV2(
  celebName: string,
  books: BookForDesc[],
  lang: 'ko' | 'en',
  isShorts: boolean,
  chapters?: { time: string; label: string }[],
  links?: YouTubeLink[],
  celebSlug?: string,
): string {
  const linkLines = (links && links.length > 0)
    ? links.map(l => `${l.label} — ${l.url}`)
    : []

  const celebProfileLine = celebSlug
    ? lang === 'ko'
      ? `${celebName} 프로필 — https://feelandnote.com/ko/celeb/${celebSlug}`
      : `${celebName} Profile — https://feelandnote.com/en/celeb/${celebSlug}`
    : undefined

  if (isShorts) {
    const trackList = books
      .map((b, i) => {
        const year = b.stats?.publishYear ? ` (${b.stats.publishYear})` : ''
        return `${i + 1}. ${b.title} — ${b.creator}${year}`
      })
      .join('\n')

    const base = lang === 'ko'
      ? [`${celebName}의 서재를 탐방합니다.`, '', '📌 수록 도서', trackList]
      : [`Explore the library of ${celebName}.`, '', '📌 Featured Books', trackList]
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

  const trackList = books
    .map((b, i) => {
      const year = b.stats?.publishYear ? ` (${b.stats.publishYear})` : ''
      return `${i + 1}. ${b.title} — ${b.creator}${year}`
    })
    .join('\n')

  if (lang === 'ko') {
    const lines = [`${celebName}${subjectMarker(celebName)} 읽은 ${books.length}권의 책을 소개합니다.`, '']
    if (chapters?.length) {
      lines.push('📚 타임라인', ...chapters.map(c => `${c.time} ${c.label}`), '')
    }
    lines.push('📌 수록 도서', trackList, '')
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
  lines.push('📌 Featured Books', trackList, '')
  lines.push('🔗 Links')
  if (celebProfileLine) lines.push(celebProfileLine)
  lines.push('Feelandnote — https://feelandnote.com')
  if (linkLines.length) lines.push(...linkLines)
  lines.push('', `#LibraryTour #${celebName.replace(/\s/g, '')} #BookRecommendation`)
  return lines.join('\n')
}

/** @deprecated — buildDescriptionV2 사용 */
export function buildDescription(
  celebName: string,
  books: { title: string; creator: string }[],
  lang: 'ko' | 'en',
  isShorts: boolean,
  celebSlug?: string,
): string {
  return buildDescriptionV2(celebName, books as BookForDesc[], lang, isShorts, undefined, undefined, celebSlug)
}
