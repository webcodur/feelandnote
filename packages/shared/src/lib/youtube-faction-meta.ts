/**
 * 세력도(Faction) YouTube 메타 생성 공통 모듈
 *
 * 서재 탐방(youtube-meta.ts)과 데이터 모델이 완전히 달라 별도 파일로 분리한다.
 * remotion(업로드 스크립트)과 remotion-bo(메타 동기화) 양쪽에서 쓰는 단일원천(SSoT)이다.
 * packages/shared는 remotion에 역의존할 수 없으므로 입력 타입을 경량으로 자체 정의한다.
 *
 * 영상 구성(한국어 세로): 세로 롱폼 1편 + 세로 쇼츠 N편(진영 part 의 실제 편 수만큼). 편이 없으면 전체를 담은 단일 쇼츠.
 * 컴포지션·출력 파일 접미사는 factionVariants(groups) 가 단일원천이다 (Root.tsx 등록과 일치).
 */

// ─── 타입 ──────────────────────────────────────────────

export type FactionUploadRecord = { videoId: string; uploadedAt: string }

export interface FactionPersonMeta {
  name: string
  nameEn?: string
  slug?: string
  /** 직함·이력 줄. [0] = 대표 직함(설명에 인물 옆 괄호로 노출). */
  lines?: string[]
  linesEn?: string[]
}

export interface FactionGroupMeta {
  name: string
  nameEn?: string
  tagline?: string
  taglineEn?: string
  /** 속한 쇼츠 편(1·2). 미지정/0 = 모든 편 공통. */
  part?: number
  /** 영상 제외(데이터만 보관) */
  disabled?: boolean
  /** true면 세로 영상에서 진영 전체 제외(가로 롱폼 전용). timing.ts 와 동일 규칙. */
  longformOnly?: boolean
  people?: FactionPersonMeta[]
  clusters?: Array<{ people?: FactionPersonMeta[]; longformOnly?: boolean }>
}

/** 팩션 메타 생성 입력 — data.json 의 상위 필드 일부만 추린 경량 형태 */
export interface FactionMetaInput {
  title: string
  titleEn?: string
  subtitle?: string
  subtitleEn?: string
  /** 쇼츠 편별 부제. JSON 키는 문자열('1','2'). */
  subtitleByPart?: Record<string, string>
  heroes?: string[]
  /** 쇼츠 편별 대표 인물(slug). JSON 키는 문자열. */
  heroesByPart?: Record<string, string[]>
  groups: FactionGroupMeta[]
}

/** 업로드 영상 종류(한국어 세로). part 가 있으면 그 편 쇼츠. */
export interface FactionVariantDef {
  key: string
  label: string
  isShorts: boolean
  /** 쇼츠 편 번호. 롱폼은 undefined. */
  part?: number
  /** 컴포지션 ID 접미사 = 출력 파일 접미사 (Root.tsx 등록과 일치) */
  fileSuffix: string
}

/**
 * 진영 part 값에서 쇼츠 편 번호 목록을 뽑는다 — 중복 제거·오름차순.
 * 편 미지정(part 없음/0)·disabled 진영은 제외. 편이 하나도 없으면 빈 배열.
 */
export function factionPartNumbers(
  groups: ReadonlyArray<{ part?: number; disabled?: boolean }>,
): number[] {
  const set = new Set<number>()
  for (const g of groups) {
    if (g.disabled) continue
    if (g.part != null && g.part > 0) set.add(g.part)
  }
  return [...set].sort((a, b) => a - b)
}

/**
 * 에피소드별 영상 종류 목록 — 세로 롱폼 1 + 세로 쇼츠 N(진영 part 의 실제 편 수만큼).
 * 편이 하나도 없으면 전체 진영을 담은 단일 쇼츠(part 미지정, 접미사 KO-S1).
 * 컴포지션 ID·출력 파일 접미사·업로드 키의 단일원천이다 (Root.tsx 등록 규칙과 일치).
 */
export function factionVariants(
  groups: ReadonlyArray<{ part?: number; disabled?: boolean }>,
): FactionVariantDef[] {
  const longform: FactionVariantDef = { key: 'ko-longform', label: '세로 롱폼', isShorts: false, part: undefined, fileSuffix: 'KO-LV' }
  const parts = factionPartNumbers(groups)
  if (parts.length === 0) {
    // 편 미지정 — 전체 진영을 담은 단일 쇼츠
    return [longform, { key: 'ko-shorts-1', label: '세로 쇼츠', isShorts: true, part: undefined, fileSuffix: 'KO-S1' }]
  }
  const multi = parts.length > 1
  return [
    longform,
    ...parts.map((p): FactionVariantDef => ({
      key: `ko-shorts-${p}`,
      label: multi ? `세로 쇼츠 ${p}편` : '세로 쇼츠',
      isShorts: true,
      part: p,
      fileSuffix: `KO-S${p}`,
    })),
  ]
}

export interface FactionYouTubeSnippet {
  title: string
  description: string
  tags: string[]
  categoryId: string
  defaultLanguage: string
  defaultAudioLanguage: string
}

// ─── 상수 ──────────────────────────────────────────────

const CATEGORY_EDUCATION = '27'
/** YouTube 태그 총량 제한은 500자. 쉼표·따옴표 오버헤드를 감안해 보수적으로 예산을 잡는다. */
const TAGS_BUDGET = 450

const SERIES_LABEL = { ko: '세력도', en: 'Faction Map' } as const

// ─── 내부 헬퍼 ─────────────────────────────────────────

/**
 * 그룹의 직속 people + cluster people 을 평탄화한다.
 * longformOnly 묶음은 세로 영상에 안 나오므로 제외한다(현재 전 variant 가 세로 — timing.ts 와 동일).
 */
function groupPeople(g: FactionGroupMeta): FactionPersonMeta[] {
  const direct = g.people ?? []
  const clustered = (g.clusters ?? [])
    .filter(c => !c.longformOnly)
    .flatMap(c => c.people ?? [])
  return [...direct, ...clustered]
}

/**
 * 노출 대상 진영.
 *  - disabled 제외
 *  - part 지정(쇼츠 편): 그 편 진영 + 공통(part 미지정/0)
 *  - part 미지정(롱폼): 전체
 */
function visibleGroups(input: FactionMetaInput, part?: number): FactionGroupMeta[] {
  return (input.groups ?? []).filter(g => {
    if (g.disabled) return false
    // longformOnly 진영은 세로 영상에서 빠진다(가로 롱폼 전용). 현재 전 variant 가 세로다.
    if (g.longformOnly) return false
    if (part == null) return true
    const gp = g.part ?? 0
    return gp === 0 || gp === part
  })
}

function allPeople(input: FactionMetaInput, part?: number): FactionPersonMeta[] {
  return visibleGroups(input, part).flatMap(groupPeople)
}

/** heroes(slug) 순서를 우선해 인물을 정렬한다. heroes에 없는 인물은 등장순으로 뒤에 붙는다. */
function peopleHeroesFirst(input: FactionMetaInput, part?: number): FactionPersonMeta[] {
  const people = allPeople(input, part)
  const heroes = (part != null ? input.heroesByPart?.[String(part)] : undefined) ?? input.heroes ?? []
  if (heroes.length === 0) return people
  const bySlug = new Map(people.filter(p => p.slug).map(p => [p.slug!, p] as const))
  const ordered: FactionPersonMeta[] = []
  const used = new Set<string>()
  for (const slug of heroes) {
    const p = bySlug.get(slug)
    if (p) { ordered.push(p); used.add(slug) }
  }
  for (const p of people) {
    if (p.slug && used.has(p.slug)) continue
    ordered.push(p)
  }
  return ordered
}

function localTitle(input: FactionMetaInput, lang: 'ko' | 'en'): string {
  return lang === 'en' ? (input.titleEn || input.title) : input.title
}

/** 쇼츠 편별 부제. 영문 부제 데이터가 없으면 공통 subtitle 로 폴백. */
function partSubtitle(input: FactionMetaInput, part?: number): string | undefined {
  if (part == null) return undefined
  return input.subtitleByPart?.[String(part)] || input.subtitle || undefined
}

function groupLabel(g: FactionGroupMeta, lang: 'ko' | 'en'): string {
  const name = lang === 'en' ? (g.nameEn || g.name) : g.name
  const tagline = lang === 'en' ? (g.taglineEn || g.tagline) : g.tagline
  if (!tagline || !tagline.trim()) return name
  // 한국어 설명문에는 em dash 대신 가운뎃점. 영문은 em dash 유지.
  const sep = lang === 'ko' ? ' · ' : ' — '
  return `${name}${sep}${tagline.trim()}`
}

/** 해시태그·태그용 안전 토큰 — 공백·기호 제거 */
function tagToken(s: string): string {
  return s.replace(/[\s#,]/g, '')
}

// ─── 제목 ──────────────────────────────────────────────

/**
 * 영상 제목.
 *   롱폼 KO: "[세력도] {title}"  EN: "[Faction Map] {titleEn}"  (시리즈 라벨 부착)
 *   쇼츠 KO: "{title}: {편 부제}"  (시리즈 라벨 없이, 부제 없으면 부제 생략)
 *   part 가 주어지면 그 편 부제(subtitleByPart)를 붙여 편끼리 제목이 겹치지 않게 한다.
 *   #Shorts 는 붙이지 않는다 — 세로 9:16·3분 이하면 YouTube 가 자동으로 쇼츠 분류.
 */
export function buildFactionTitle(
  input: FactionMetaInput,
  lang: 'ko' | 'en',
  isShorts: boolean,
  part?: number,
): string {
  const base = localTitle(input, lang)
  if (!base || !base.trim()) throw new Error('buildFactionTitle: title 누락 (조용한 폴백 금지)')
  const sub = partSubtitle(input, part)
  const body = sub ? `${base.trim()}: ${sub.trim()}` : base.trim()
  // 쇼츠는 시리즈 라벨 없이 본문만. 롱폼만 [세력도] 라벨을 붙인다.
  return isShorts ? body : `[${SERIES_LABEL[lang]}] ${body}`
}

// ─── 태그 ──────────────────────────────────────────────

/**
 * 영상 태그.
 *   - 시리즈/브랜드 고정 태그 + 에피소드 제목 + 진영명 + 인물명
 *   - 한국어 영상: 인물 국문명 + 영문명 모두 / 영문 영상: 영문명만
 *   - heroes 우선 배치 후 500자 예산까지 채운다.
 *   - part 지정 시 그 편 진영·인물만.
 */
export function buildFactionTags(
  input: FactionMetaInput,
  lang: 'ko' | 'en',
  isShorts: boolean,
  part?: number,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  let budget = TAGS_BUDGET

  const push = (raw?: string) => {
    if (!raw) return
    const t = raw.trim()
    if (!t) return
    const key = t.toLowerCase()
    if (seen.has(key)) return
    const cost = t.length + 1 + (/\s/.test(t) ? 2 : 0)
    if (budget - cost < 0) return
    budget -= cost
    seen.add(key)
    out.push(t)
  }

  // 1) 시리즈·브랜드 (쇼츠는 세로·3분 이하로 YouTube 가 자동 분류 — 'Shorts' 태그 불필요)
  void isShorts
  if (lang === 'ko') {
    ;['세력도', '인물관계도', 'AI', '테크', 'FeelAndNote', '필앤노트'].forEach(push)
  } else {
    ;['FactionMap', 'PowerMap', 'AI', 'Tech', 'FeelAndNote'].forEach(push)
  }

  // 2) 에피소드 제목
  const epTitle = localTitle(input, lang)
  push(epTitle)
  push(tagToken(epTitle))

  // 3) 진영명 (해당 편)
  for (const g of visibleGroups(input, part)) {
    const name = lang === 'en' ? (g.nameEn || g.name) : g.name
    push(name)
    push(tagToken(name))
    const tagline = lang === 'en' ? (g.taglineEn || g.tagline) : g.tagline
    if (tagline) push(tagToken(tagline))
  }

  // 4) 인물명 — heroes 우선. ko: 국문만(영문명까지 넣으면 500자 예산을 금방 소진해 뒤쪽 인물이 누락된다), en: 영문만
  for (const p of peopleHeroesFirst(input, part)) {
    if (lang === 'ko') {
      push(p.name)
    } else {
      push(p.nameEn || p.name)
    }
  }

  return out
}

// ─── 설명 ──────────────────────────────────────────────

/**
 * 영상 설명문.
 *   인트로 → 등장 진영 목록 → 링크 → 해시태그
 *   진영은 "이름 · 한 줄 소개(tagline)" 형태. 쇼츠는 해시태그에 #Shorts 추가.
 *   part 지정 시 그 편 진영·대표 인물만.
 */
export function buildFactionDescription(
  input: FactionMetaInput,
  lang: 'ko' | 'en',
  isShorts: boolean,
  part?: number,
): string {
  const title = localTitle(input, lang)
  const sub = partSubtitle(input, part)
  const heading = sub ? `${title}: ${sub}` : title
  // 진영마다 [● 진영명 · tagline] + [그 진영 인물 이름 줄]. 진영 사이는 빈 줄로 띄운다.
  // 인물이 없는 진영(AI의 시조 등)은 라벨만. 이름은 lang 에 맞춰 국문/영문.
  const groups = visibleGroups(input, part).flatMap((g, i) => {
    const label = groupLabel(g, lang)
    const names = groupPeople(g)
      .map(p => {
        const nm = lang === 'en' ? (p.nameEn || p.name) : p.name
        if (!nm || !nm.trim()) return null
        // 대표 직함(lines[0])을 이름 옆 괄호로. 직함이 없으면 이름만.
        const role = (lang === 'en' ? (p.linesEn ?? p.lines) : p.lines)?.[0]?.trim()
        return role ? `${nm.trim()}(${role})` : nm.trim()
      })
      .filter((n): n is string => !!n)
    // 인물은 한 명당 한 줄로 개행. 진영 사이는 빈 줄.
    const block = names.length ? [`● ${label}`, ...names] : [`● ${label}`]
    return i === 0 ? block : ['', ...block]
  })

  const heroNames = peopleHeroesFirst(input, part)
    .slice(0, 6)
    .map(p => (lang === 'en' ? (p.nameEn || p.name) : p.name))
    .map(tagToken)

  if (lang === 'ko') {
    const hashtags = ['#세력도', `#${tagToken(title)}`, ...heroNames.map(n => `#${n}`)]
    const lines = [
      `${heading}의 세력 지도.`,
      '',
      '🏛 등장 진영',
      ...groups,
      '',
      '🔗 링크',
      'Feelandnote — https://feelandnote.com',
      '',
      hashtags.join(' '),
    ]
    return lines.join('\n')
  }

  const hashtags = ['#FactionMap', `#${tagToken(title)}`, ...heroNames.map(n => `#${n}`)]
  const lines = [
    `A map of the factions behind ${heading}.`,
    '',
    '🏛 Factions',
    ...groups,
    '',
    '🔗 Links',
    'Feelandnote — https://feelandnote.com',
    '',
    hashtags.join(' '),
  ]
  return lines.join('\n')
}

// ─── 스니펫 조립 ────────────────────────────────────────

export function buildFactionSnippet(params: {
  title: string
  description: string
  tags: string[]
  lang: 'ko' | 'en'
}): FactionYouTubeSnippet {
  return {
    title: params.title,
    description: params.description,
    tags: params.tags,
    categoryId: CATEGORY_EDUCATION,
    defaultLanguage: params.lang,
    defaultAudioLanguage: params.lang,
  }
}
