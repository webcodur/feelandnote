/**
 * 기관 선정 기관 상세의 검색 제목.
 * 기관명만 내던 제목(「CNN | 필앤노트」)은 무엇이 있는 페이지인지 알리지 못했다. 사람들이 실제로
 * 찾는 말은 목록 이름(「서울대 권장도서 100선」「올해의 앨범」)이라 기관명 뒤에 목록 이름을 싣는다.
 */
import { estimateTitleWidth } from '../celeb/meta'

/** 사이트명 접미사(「 | 필앤노트」)를 뺀 제목 본문 폭. 인물 제목 예산 30에서 접미사 몫을 덜었다. */
const CURATOR_TITLE_WIDTH_BUDGET = 24

/** 목록 이름이 기관명으로 시작하면 떼어 낸다(「칸 영화제: 칸 영화제 황금종려상」 → 「칸 영화제: 황금종려상」). */
function stripCuratorPrefix(curatorName: string, listTitle: string): string {
  // 영문 소유격도 뗀다(「CNN: CNN's 10 Most …」 → 「CNN: 10 Most …」)
  const prefix = [`${curatorName} `, `${curatorName}'s `, `${curatorName}’s `].find((p) => listTitle.startsWith(p))
  if (!prefix) return listTitle
  const rest = listTitle.slice(prefix.length).trim()
  return rest.length >= 2 ? rest : listTitle
}

/**
 * 「기관명: 목록1, 목록2 외 N개」. 목록은 진열 순서대로 폭 안에 드는 만큼 싣고 첫 목록은 넘쳐도 싣는다.
 * @param moreLabel 남은 목록 수를 받아 「외 2개」「and 2 more」를 돌려준다
 */
export function buildCuratorMetaTitle(
  curatorName: string,
  listTitles: readonly string[],
  moreLabel: (count: number) => string,
): string {
  const titles = listTitles.map((title) => stripCuratorPrefix(curatorName, title.trim())).filter(Boolean)
  if (titles.length === 0) return curatorName

  const build = (shown: number) => {
    const rest = titles.length - shown
    const body = `${curatorName}: ${titles.slice(0, shown).join(', ')}`
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

/* ── 기관 선정 허브(/explore/works/curated)의 정본 주소 ── */

export const CURATED_HUB_PATH = '/explore/works/curated'
/** 매체 칩의 첫 값 — 주소에 싣지 않는 기본 매체(useCuratedBrowse의 MEDIA_ORDER 첫 값) */
export const CURATED_DEFAULT_MEDIA = 'BOOK'
/** 같은 목록을 거르기만 하는 조건 — 정본은 그 매체의 첫 쪽이다 */
const CURATED_FILTER_KEYS = ['search', 'country', 'topic', 'kind'] as const

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
