/**
 * 기관 선정 기관 상세의 검색 제목.
 * 기관명만 내던 제목(「CNN | 필앤노트」)은 무엇이 있는 페이지인지 알리지 못했다. 사람들이 실제로
 * 찾는 말은 목록 이름(「서울대 권장도서 100선」「올해의 앨범」)이라 기관명 뒤에 목록 이름을 싣는다.
 */
import { estimateTitleWidth } from '../celeb/meta'

/** 사이트명 접미사(「 | 필앤노트」)를 뺀 제목 본문 폭. 인물 제목 예산 30에서 접미사 몫을 덜었다. */
const CURATOR_TITLE_WIDTH_BUDGET = 24

/**
 * 기관명을 떼면 이름이 아니라 토막만 남는 목록 이름(「여성문학상 수상작」 → 「수상작」,
 * 「타임 선정 100대 소설」 → 「선정 100대 소설」, 「Women's Prize for Fiction」 → 「for Fiction」).
 * 이런 목록은 떼지 않고 원래 이름을 통째로 쓴다(26.09.29 전수 점검).
 */
const FRAGMENT_KO = /^(수상작|추천도서|권장도서|필독서|논픽션|선정|추천|권장)(\s|$)/
const isFragment = (rest: string) => /^[a-z]/.test(rest) || FRAGMENT_KO.test(rest)

/** 괄호 속 부연을 뗀 짧은 기관명(「Sight and Sound (British Film Institute)」 → 「Sight and Sound」) */
const shortCuratorName = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '').trim()

/**
 * 목록 이름이 기관명으로 시작하면 떼어 낸다(「칸 영화제: 칸 영화제 황금종려상」 → 「칸 영화제: 황금종려상」).
 * 떼면 토막만 남는 이름은 null — 원래 이름이 이미 기관명을 담고 있다.
 */
function stripCuratorPrefix(curatorName: string, listTitle: string): string | null {
  const names = [...new Set([curatorName, shortCuratorName(curatorName)])]
  // 영문 소유격(「CNN's 10 Most …」)과 쌍점(「Time Out: The 100 Best …」)도 뗀다
  const prefix = names.flatMap((name) => [`${name}: `, `${name}'s `, `${name}’s `, `${name} `])
    .find((p) => listTitle.startsWith(p))
  if (!prefix) return listTitle
  const rest = listTitle.slice(prefix.length).trim()
  if (rest.length < 2) return listTitle
  return isFragment(rest) ? null : rest
}

/**
 * 목록 문장의 주어 — 기관명과 목록 이름을 겹치지 않게 나눈다.
 * 목록 이름이 기관명을 담으면 curator는 null이다(「여성문학상 수상작」).
 */
export function curatedListSubject(curatorName: string, listTitle: string): { curator: string | null; title: string } {
  const title = listTitle.trim()
  const stripped = stripCuratorPrefix(curatorName, title)
  if (stripped === null) return { curator: null, title }
  return { curator: curatorName, title: stripped }
}

/**
 * 「기관명: 목록1, 목록2 외 N개」. 목록은 진열 순서대로 폭 안에 드는 만큼 싣고 첫 목록은 넘쳐도 싣는다.
 * 첫 목록 이름이 기관명을 담고 있으면(떼면 토막만 남는 이름) 기관명 머리를 두지 않는다
 * — 「여성문학상: 수상작」이 아니라 「여성문학상 수상작」이다.
 * @param moreLabel 남은 목록 수를 받아 「외 2개」「and 2 more」를 돌려준다
 */
export function buildCuratorMetaTitle(
  curatorName: string,
  listTitles: readonly string[],
  moreLabel: (count: number) => string,
): string {
  const subjects = listTitles.filter((title) => title.trim()).map((title) => curatedListSubject(curatorName, title))
  if (subjects.length === 0) return curatorName
  const titles = subjects.map((subject) => subject.title)
  const lead = subjects[0].curator === null ? '' : `${curatorName}: `

  const build = (shown: number) => {
    const rest = titles.length - shown
    const body = `${lead}${titles.slice(0, shown).join(', ')}`
    return rest > 0 ? `${body} ${moreLabel(rest)}` : body
  }

  let fitted = build(1)
  for (let shown = 2; shown <= titles.length; shown++) {
    const candidate = build(shown)
    if (estimateTitleWidth(candidate) > CURATOR_TITLE_WIDTH_BUDGET) break
    fitted = candidate
  }
  return fitted
}

/* ── 기관 선정 검색 설명문 ── */

/** 검색 설명 한 칸 — 사이트 전역 요약 길이(lib/seo의 toSeoSummary 기본값)와 같다 */
const CURATED_DESCRIPTION_MAX = 160
/** 설명문 머리에 나열하는 목록 이름의 폭. 넘치면 「외 N개」로 줄인다 */
const LEAD_LIST_BUDGET = 60
/** 남은 자리가 이보다 좁으면 본문을 잇지 않는다 — 잘린 토막만 남는다 */
const MIN_BODY_ROOM = 24

/** 목록 이름을 폭 안에 드는 만큼 쉼표로 잇고 나머지는 「외 N개」로 줄인다. 첫 이름은 넘쳐도 싣는다 */
export function fitListNames(titles: readonly string[], moreLabel: (count: number) => string, budget = LEAD_LIST_BUDGET): string {
  const names = titles.map((title) => title.trim()).filter(Boolean)
  let shown = 1
  while (shown < names.length && names.slice(0, shown + 1).join(', ').length <= budget) shown++
  const rest = names.length - shown
  const body = names.slice(0, shown).join(', ')
  return rest > 0 ? `${body} ${moreLabel(rest)}` : body
}

/**
 * 머리 문장(무엇이 몇 편 있는 페이지인지) 뒤에 소개문 요약을 잇는다.
 * 소개문은 화면에 보이는 글이라 고치지 않는다 — 검색 설명에만 머리를 붙인다(26.09.29).
 * 게임·음악 수상 목록의 소개문은 「2014–2025년 수상작을 …」처럼 상 이름 없이 시작해,
 * 소개문만 싣던 설명은 무슨 상인지 알리지 못했다.
 * @param summarize 남은 폭을 받아 소개문을 문장 단위로 줄인다(lib/seo의 toSeoSummary)
 */
export function leadDescription(
  lead: string,
  body: string | null | undefined,
  summarize: (value: string, maxLength: number) => string,
  max = CURATED_DESCRIPTION_MAX,
): string {
  const head = lead.trim()
  const text = body?.trim()
  const room = max - head.length - 1
  if (!text || room < MIN_BODY_ROOM) return head
  // 요약은 끝난 문장만 돌려주고, 첫 문장부터 넘치면 빈 값이다 — 그때는 머리 문장만 둔다
  const summary = summarize(text, room).trim()
  return summary ? `${head} ${summary}` : head
}

/* ── 해마다 발표하는 수상 목록 ── */

/** 목록 이름 끝의 「수상작」「Winners」 — 제목 틀(「역대 … 수상작」「…: Every Winner」)이 다시 붙인다 */
export function stripWinnersSuffix(title: string, locale: string): string {
  const stripped = locale === 'en' ? title.replace(/\s+winners?$/i, '') : title.replace(/\s*수상작$/, '')
  return stripped.trim() || title.trim()
}

/** 기관명을 붙인 제목이 폭 안에 들면 그것을, 아니면 기관명 없는 제목을 쓴다 */
export function fitAwardTitle(withCurator: string | null, plain: string): string {
  return withCurator && estimateTitleWidth(withCurator) <= CURATOR_TITLE_WIDTH_BUDGET ? withCurator : plain
}

/** 역대 수상작을 모은 목록인가 — 시상 기관·영화제가 해마다 발표하는 목록. 순위표·권장도서는 아니다 */
export function isAwardHistoryList(list: { isAnnual: boolean; curator: { kind: string } }): boolean {
  return list.isAnnual && (list.curator.kind === 'award' || list.curator.kind === 'festival')
}

/**
 * 최근 수상작 이름 — 연도가 큰 순서로, 같은 해의 공동 수상은 목록 차례대로 싣는다.
 * 연도 기준은 목록마다 다르다(시상식 해·개봉 해) — 검색 설명에는 연도를 쓰지 않고 이름만 쓴다.
 */
export function recentWinners(items: readonly { year: number | null; title: string }[], count = 2): string[] {
  return items
    .map((item, index) => ({ ...item, index }))
    .filter((item) => item.year !== null && item.title.trim())
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.index - b.index)
    .slice(0, count)
    .map((item) => item.title.trim())
}

/* ── 기관 선정 허브(/explore/works/curated)의 정본 주소 ── */

export const CURATED_HUB_PATH = '/explore/works/curated'
/** 매체 칩의 첫 값 — 주소에 싣지 않는 기본 매체(useCuratedBrowse의 MEDIA_ORDER 첫 값) */
export const CURATED_DEFAULT_MEDIA = 'BOOK'
/** 같은 목록을 거르기만 하는 조건 — 정본은 그 매체의 첫 쪽이다 */
export const CURATED_FILTER_KEYS = ['search', 'country', 'topic', 'kind'] as const

export interface CuratedHubMetaState {
  /** 주소에 실을 매체. 기본 매체(도서)면 null */
  media: string | null
  page: number
  /** locale 접두어 없는 정본 경로 */
  path: string
}

/**
 * 기관 선정 허브 주소의 정본을 정한다.
 * 매체(도서 밖)와 쪽은 서로 다른 목록 카드를 싣는 화면이라 자기 주소를 정본으로 둔다. 쪽 나눔 화면을 1쪽으로
 * 모으면 2쪽부터의 목록·기관 링크가 정본이 아닌 화면에만 남는다(Google은 쪽마다 자기 정본을 두라고 안내한다).
 * 검색·국가·주제·기관 조건은 같은 목록을 거른 화면이라 그 매체의 첫 쪽으로 모은다.
 * 쿼리 순서는 화면의 쪽 링크(CuratedHubView의 queryFor)와 같게 media → page다.
 * @param listCountByMedia 매체별 선정 목록 수 — 없는 매체는 기본 매체로, 넘친 쪽은 마지막 쪽으로 돌린다
 */
export function resolveCuratedHubMeta(
  params: Record<string, string | string[] | undefined>,
  listCountByMedia: ReadonlyMap<string, number>,
  pageSize: number,
): CuratedHubMetaState {
  const one = (key: string) => {
    const value = params[key]
    return typeof value === 'string' ? value : undefined
  }
  const rawMedia = one('media')
  const media = rawMedia && rawMedia !== CURATED_DEFAULT_MEDIA && listCountByMedia.has(rawMedia) ? rawMedia : null
  const filtered = CURATED_FILTER_KEYS.some((key) => Boolean(one(key)?.trim()))
  const totalPages = Math.max(1, Math.ceil((listCountByMedia.get(media ?? CURATED_DEFAULT_MEDIA) ?? 0) / pageSize))
  const requested = Number(one('page'))
  const page = filtered || !Number.isSafeInteger(requested) || requested < 1 ? 1 : Math.min(requested, totalPages)

  const query = new URLSearchParams()
  if (media) query.set('media', media)
  if (page > 1) query.set('page', String(page))
  return { media, page, path: query.size ? `${CURATED_HUB_PATH}?${query}` : CURATED_HUB_PATH }
}
