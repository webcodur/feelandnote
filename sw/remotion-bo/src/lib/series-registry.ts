/**
 * 시리즈 레지스트리 — 새 시리즈 = 여기에 정의 1개 추가
 *
 * 시리즈별 차이는 코드 분기가 아니라 이 정의의 필드로 표현한다.
 * `id === '...'` 같은 하드코딩 비교는 두지 않는다 — 시리즈가 늘 때마다 분기가 번식한다.
 *
 * ⚠ **지금 이 앱에 남은 시리즈는 서재 탐방 하나뿐이다**(26.07.26).
 *   세력도는 26.07.25, 가상 담화는 26.07.26 에 각각 web-bo 로 이관됐다.
 *   그래서 아래 「계열별 등록표」 얼개(SERIES_HOMES·EDITORS·EPISODE_LISTS 등)는 지금
 *   **한 명뿐인 표**가 됐다. 새 시리즈를 여기 얹을 계획이 없다면 얼개 자체를 걷어내고
 *   서재 탐방을 web-bo 로 마저 옮기는 쪽이 낫다 — 설계 문서
 *   `docs/project/remotion/discourse-unification.md` §8·§9(7) 참조.
 */

/**
 * 데이터 구조 계열 — 에피소드 저장 형식·IO·편집 화면이 이 값으로 갈린다.
 * - book: episodes/<인물>/ 의 책 본문(meta·books·shorts). 서재 탐방
 *
 * 세력도(faction)·가상 담화(discourse)는 이 앱에서 폐기됐다 — 편집·출간 전부 web-bo 로 이관
 * (`faction-unification.md` §9 · `discourse-unification.md` §8).
 */
export type SeriesDataModel = 'book'

export interface SeriesDefinition {
  id: string
  label: string
  icon: string
  /** remotion Composition 이름 */
  composition: string
  /** episodes/ 하위 디렉토리명 */
  episodeDir: string
  /** 데이터 구조 계열 — 에피소드 IO·목록·편집 화면 선택의 단일 기준 */
  dataModel: SeriesDataModel
  /** 에피소드 진입 기본 경로 — /[series]/[name] 아래 상대 경로 */
  episodeHome: string
  /** 렌더 설정 */
  render: {
    codec: string
    proresProfile?: string
    /** 쇼츠 Composition 접미사 (e.g. 'Short') */
    shortsSuffix?: string
  }
}

export const SERIES: SeriesDefinition[] = [
  {
    id: 'book-recommend',
    label: '서재 탐방',
    icon: '📚',
    composition: 'BookRecommend',
    episodeDir: 'book-recommend',
    dataModel: 'book',
    episodeHome: 'scenario',
    render: {
      codec: 'prores',
      proresProfile: '4444',
      shortsSuffix: 'Short',
    },
  },
]

export const DEFAULT_SERIES = SERIES[0]

export function getSeriesById(id: string): SeriesDefinition | undefined {
  return SERIES.find(s => s.id === id)
}

export function isValidSeries(id: string): boolean {
  return SERIES.some(s => s.id === id)
}

/** 시리즈의 데이터 구조 계열 — 미등록 id 면 undefined */
export function seriesDataModel(id: string): SeriesDataModel | undefined {
  return getSeriesById(id)?.dataModel
}

/** 지정한 데이터 구조 계열인지 — 미등록 id 는 false. 시리즈 전용 API 라우트의 진입 가드용 */
export function isSeriesModel(id: string, model: SeriesDataModel): boolean {
  return seriesDataModel(id) === model
}

/**
 * 에피소드 진입 경로 — 미등록 시리즈면 undefined.
 * 시리즈마다 첫 화면이 갈리던 것을 이 값 하나로 대신한다.
 */
export function episodeHomePath(seriesId: string, name: string): string | undefined {
  const def = getSeriesById(seriesId)
  return def && `/${seriesId}/${encodeURIComponent(name)}/${def.episodeHome}`
}
