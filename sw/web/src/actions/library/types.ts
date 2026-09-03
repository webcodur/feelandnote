import { createStaticClient } from '@/lib/db/static'
import type { ContentLocaleRow } from '@/lib/utils/content-locale'

export interface LibraryContent {
  id: string
  title: string
  creator: string | null
  thumbnail_url: string | null
  type: string
  celeb_count: number
  user_count: number
  /** 개별 회원의 member_contents.rating 평균. 셀럽 감상경위의 값이 아니다. */
  avg_rating: number | null
  review?: string | null
  review_en?: string | null
  is_spoiler?: boolean
  source_url?: string | null
  user_content_id?: string
  title_ko?: string | null
  title_en?: string | null
  creator_en?: string | null
  isbn_en?: string | null
  thumbnail_en?: string | null
  has_en_edition?: boolean | null
}

export interface LibraryResult {
  contents: LibraryContent[]
  total: number
  totalPages: number
  currentPage: number
}

export interface TopCeleb {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  title: string | null
  title_en: string | null
  influence: number | null
  count: number
}

export interface LibraryByProfession {
  profession: string
  label: string
  contents: LibraryContent[]
  total: number
  topCelebs: TopCeleb[]
}

// contents(content_locales) 임베드 조회 행 — select 문자열과 1:1 대응
export interface ContentJoinRow {
  id: string
  type: string
  content_locales: ContentLocaleRow[] | null
}

// celeb_contents → contents 조인 조회 행
export interface CelebContentJoinRow {
  celeb_id: string
  content_id: string
  contents: ContentJoinRow | ContentJoinRow[] | null
}

export type StaticDatabaseClient = ReturnType<typeof createStaticClient>

// ────────────────────────────────────────────────────
// 실시간 베스트셀러
export interface BestsellerItem {
  id: string
  rank: number
  title: string
  creator: string
  publisher: string | null
  thumbnail_url: string | null
  published_date: string | null
  isbn: string | null
  description: string | null
  type: string
  category_key: string
  title_ko?: string | null
  title_en?: string | null
  creator_en?: string | null
  thumbnail_en?: string | null
}

// ────────────────────────────────────────────────────
// 기관 선정 — 대학·언론·시상 기관 등이 발표한 작품 목록
export interface CuratorSummary {
  slug: string
  name: string
  /** university | media | award | organization | community | bookstore | library | festival */
  kind: string
  country: string | null
  foundedYear: number | null
  description: string | null
  logoUrl: string | null
  homepageUrl: string | null
  listCount: number
}

export interface CuratedListSummary {
  slug: string
  curatorSlug: string
  /** 기관명 — 카드가 목록만으로 설 때 기관의 얼굴을 함께 세운다 */
  curatorName?: string
  /** 기관 로고·엠블럼 */
  curatorLogoUrl?: string | null
  /** 기관 갈래 (university, media, award 등) */
  curatorKind?: string
  /** 기관 소재 국가 */
  curatorCountry?: string | null
  title: string
  description: string | null
  publishedYear: number | null
  /** 판·회차 표기. 같은 계열의 해마다 다른 판을 구분한다 */
  edition: string | null
  /** 같은 계열 목록을 묶는 열쇠. 없으면 단발 목록 */
  seriesKey: string | null
  isRanked: boolean
  isAnnual: boolean
  contentType: string
  topics: string[]
  coverImageUrl: string | null
  itemCount: number
  /** 목록 앞머리 작품의 표지 몇 장. 목록이 무엇을 담았는지 글자보다 빨리 보여준다 */
  covers: string[]
}

export interface CuratedListItem {
  id: string
  rank: number | null
  year: number | null
  note: string | null
  /** 목록 원문의 표기. 우리가 가지지 않은 작품도 이 값으로 진열된다 */
  rawTitle: string
  rawCreator: string | null
  /** 우리 콘텐츠와 이어졌을 때만 채워진다 */
  contentId: string | null
  title: string
  creator: string | null
  thumbnailUrl: string | null
  contentType: string | null
  /** 한국어판·영문판 전환에 쓰는 짝. 서비스 공통 작품 카드가 이 값으로 판을 갈아 끼운다 */
  titleKo: string | null
  titleEn: string | null
  creatorEn: string | null
  thumbnailEn: string | null
  hasEnEdition: boolean
}

export interface CuratedListSibling {
  slug: string
  title: string
  edition: string | null
  publishedYear: number | null
  isCurrent: boolean
}

export interface CuratedListDetail extends CuratedListSummary {
  method: string | null
  sourceUrl: string
  curator: CuratorSummary
  items: CuratedListItem[]
  /** 아직 내려보내지 않은 작품 수. 0보다 크면 「더 보기」가 뜬다 */
  remainingCount: number
  /** 우리 콘텐츠와 이어진 항목 수 */
  linkedCount: number
  /** 같은 계열의 다른 해 */
  siblings: CuratedListSibling[]
}

export interface CuratorDetail extends CuratorSummary {
  lists: CuratedListSummary[]
}

export interface CuratedHub {
  curators: (CuratorSummary & { lists: CuratedListSummary[] })[]
}

/** 작품 상세의 선정 이력 한 줄 */
export interface ContentCuratedEntry {
  listSlug: string
  listTitle: string
  edition: string | null
  publishedYear: number | null
  curatorSlug: string
  curatorName: string
  curatorKind: string
  curatorLogoUrl: string | null
  rank: number | null
  year: number | null
}
