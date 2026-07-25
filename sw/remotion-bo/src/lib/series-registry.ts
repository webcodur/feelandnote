/**
 * 시리즈 레지스트리 — 새 시리즈 = 여기에 정의 1개 추가
 *
 * 시리즈별 차이는 코드 분기가 아니라 이 정의의 필드로 표현한다.
 * `id === 'discourse'` 같은 하드코딩 비교는 두지 않는다 — 시리즈가 늘 때마다 분기가 번식한다.
 */

/**
 * 데이터 구조 계열 — 에피소드 저장 형식·IO·편집 화면이 이 값으로 갈린다.
 * - book:      episodes/<인물>/ 의 책 본문(meta·books·shorts). 서재 탐방
 * - discourse: discourses/<에피소드>/discourse-data.json. 뼈대가 발언 순서(turns)
 *
 * 세력도(faction)는 이 앱에서 폐기됐다 — 편집·출간 전부 web-bo 로 이관(faction-unification.md §9).
 */
export type SeriesDataModel = 'book' | 'discourse'

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
  /**
   * 편집 화면이 언어·탭 세부 경로(/[series]/[name]/[lang]/[tab])를 쓰는가.
   * false 면 episodeHome 단일 화면이고, 책 기반 래퍼(EpisodeProvider·TabNav)를 두른다.
   */
  langTabEditor: boolean
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
    langTabEditor: false,
    render: {
      codec: 'prores',
      proresProfile: '4444',
      shortsSuffix: 'Short',
    },
  },
  {
    id: 'discourse',
    label: '가상 담화',
    icon: '🗣️',
    composition: 'Discourse',
    episodeDir: 'discourses',
    dataModel: 'discourse',
    // 담화는 발언이 주인공이다 — 에피소드를 열면 대사부터 보여야 한다.
    // 팩션(ko/info)처럼 인물 설정으로 들어가면 첫 화면에 대사가 없어 "대사가 안 보인다"가 된다(실제 신고).
    episodeHome: 'ko/shorts',
    langTabEditor: true,
    render: {
      codec: 'h264',
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

/** 언어·탭 세부 경로(/[lang]/[tab])로 편집하는 시리즈인지 — 미등록 id 는 false */
export function usesLangTabEditor(id: string): boolean {
  return getSeriesById(id)?.langTabEditor ?? false
}

/**
 * 에피소드 진입 경로 — 미등록 시리즈면 undefined.
 * 담화가 'ko/shorts', 서재 탐방이 'scenario' 로 갈리던 것을 이 값 하나로 대신한다.
 */
export function episodeHomePath(seriesId: string, name: string): string | undefined {
  const def = getSeriesById(seriesId)
  return def && `/${seriesId}/${encodeURIComponent(name)}/${def.episodeHome}`
}
