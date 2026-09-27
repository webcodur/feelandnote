// 베스트셀러의 분야·제공 상태·원본 주소. 공개 Apple 피드는 수익 제휴와 별개다.
export const CHART_CATEGORIES = ['BOOK', 'VIDEO', 'GAME', 'MUSIC'] as const
export type ChartCategory = typeof CHART_CATEGORIES[number]
export type ChartLanguage = 'ko' | 'en'
export type ChartSourceId = 'yes24' | 'apple-books' | 'apple-movies' | 'steam' | 'playstation' | 'xbox' | 'igdb' | 'apple-music'

export interface ChartSource {
  id: ChartSourceId
  available: boolean
  /** 이 출처의 작품 링크에 판매 수수료를 추적하는 제휴 경로를 쓰는지. */
  affiliateLinks: boolean
  url: string
}

export function chartCategory(value?: string): ChartCategory {
  return CHART_CATEGORIES.find(category => category === value) ?? 'BOOK'
}

export function chartSources(category: ChartCategory, language: ChartLanguage): readonly ChartSource[] {
  const korean = language === 'ko'
  return ({
    BOOK: [{
      id: korean ? 'yes24' : 'apple-books',
      available: true,
      affiliateLinks: korean,
      url: korean ? 'https://www.yes24.com/product/category/daybestseller?categoryNumber=001' : 'https://books.apple.com/us/charts/top-paid',
    }],
    VIDEO: [{
      id: 'apple-movies',
      available: true,
      affiliateLinks: false,
      // 스토어 첫 화면이 아니라 실제 순위 페이지 — tv.apple.com의 「Most Popular Now/인기 콘텐츠 Top 10」 컬렉션
      url: `https://tv.apple.com/${korean ? 'kr' : 'us'}/collection/most-popular-now/uts.col.ChartsMovies.tvs.sbd.4000`,
    }],
    GAME: [{
      id: 'steam',
      available: true,
      affiliateLinks: false,
      url: 'https://store.steampowered.com/charts/mostplayed',
    },
    // 실제 목록 연동 전까지 출처 선택에서 숨긴다.
    /* {
      id: 'playstation',
      available: false,
      affiliateLinks: false,
      url: 'https://blog.playstation.com/tag/top-downloads/',
    }, {
      id: 'xbox',
      available: false,
      affiliateLinks: false,
      url: 'https://www.xbox.com/en-US/games/browse/Popular',
    }, {
      id: 'igdb',
      available: false,
      affiliateLinks: false,
      url: 'https://www.igdb.com/',
      terms: 'https://api-docs.igdb.com/#partnership',
    }, */
    ],
    MUSIC: [{
      id: 'apple-music',
      available: true,
      affiliateLinks: false,
      url: `https://music.apple.com/${korean ? 'kr' : 'us'}/new/top-charts/songs`,
    }],
  } satisfies Record<ChartCategory, ChartSource[]>)[category]
}

// URL에 다른 분야·언어의 출처가 남아 있어도 해당 분야의 기본 출처로 돌아간다.
export function chartSource(category: ChartCategory, language: ChartLanguage, value?: string): ChartSource {
  const sources = chartSources(category, language).filter(source => source.available)
  return sources.find(source => source.id === value) ?? sources[0]
}
