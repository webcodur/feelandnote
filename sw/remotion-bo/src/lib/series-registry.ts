/**
 * 시리즈 레지스트리 — 새 시리즈 = 여기에 정의 1개 추가
 */

export interface SeriesDefinition {
  id: string
  label: string
  icon: string
  /** remotion Composition 이름 */
  composition: string
  /** episodes/ 하위 디렉토리명 */
  episodeDir: string
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
    render: {
      codec: 'prores',
      proresProfile: '4444',
      shortsSuffix: 'Short',
    },
  },
  {
    id: 'faction',
    label: '세력도',
    icon: '🏛️',
    composition: 'Faction',
    episodeDir: 'factions',
    render: {
      codec: 'h264',
    },
  },
  // 향후 추가:
  // { id: 'rival-talk', label: '라이벌 대담', icon: '🎭', ... },
  // { id: 'service-intro', label: '서비스 소개', icon: '📢', ... },
]

export const DEFAULT_SERIES = SERIES[0]

export function getSeriesById(id: string): SeriesDefinition | undefined {
  return SERIES.find(s => s.id === id)
}

export function isValidSeries(id: string): boolean {
  return SERIES.some(s => s.id === id)
}

/** 세력도 시리즈인지 — 데이터 모델·편집 UI가 BookRecommend와 완전히 다르다. */
export function isFactionSeries(id: string): boolean {
  return id === 'faction'
}
