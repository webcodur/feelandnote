import type { ReactNode } from 'react'
import type { FigureBookContent, FigureBookEdition } from '@/actions/figure-books/getFigureBooks'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import type { AffiliateLink } from '@/constants/affiliatePlatforms'
import type { BookIntroductionReference, BookIntroductionAttribution } from '@/lib/utils/book-description'
import type { TitleBadge } from '@/lib/utils/content-locale'
import type { UserContentPublic } from '@/actions/contents/getUserContents'

/** 관계 유형과 무관하게 책장 안의 모든 책이 사용하는 표시 자료. */
export interface BookShelfBook {
  id: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  titleBadge?: TitleBadge | null
  editions: FigureBookEdition[]
  preferredEditionId?: number
  /** 판본 칩이 같은 작품의 다른 판본을 구분하는 재료. 작품 자체에는 두지 않는다. */
  translator?: string | null
  description?: string | null
  bookIntroduction?: BookIntroductionReference | null
  introductionAttribution?: BookIntroductionAttribution
  isbn?: string | null
  publisher?: string | null
  releaseDate?: string | null
  affiliateLinks?: AffiliateLink[]
  /** 판본과 소개를 이미 조회한 책은 선택할 때 다시 조회하지 않는다. */
  detailsLoaded?: boolean
  /** 직군 추천을 실제로 만든 감상자. 그 밖의 독자를 추천 근거로 섞지 않는다. */
  readerIds?: string[]
  /** 감상 분류는 인물 상세와 같은 리뷰 카드로 읽는다. */
  readingRecord?: UserContentPublic
  professionCategory?: 'become' | 'about'
  selectionReason?: string
  selectionSourceUrl?: string
}

export interface BookShelfContext {
  personId?: string
  personName?: string
  memberIds?: string[]
  /** 직군·소속 등은 전체 관계를 줄이지 않고 정렬 순서에 반영한다. */
  kind: 'appeared' | 'authored' | 'read' | 'profession' | 'theme' | 'affiliation'
  /** 도서 감상을 함께 담는 책장은 해당 인물의 감상배경도 본문에 표시한다. */
  showReading?: boolean
}

export interface BookShelfGroup {
  key: string
  label: string
  intro: string
  listSubtitle?: string
  books: BookShelfBook[]
  /** 직군을 고른 뒤 책 목록 위에서 선택하는 두 목적. */
  choices?: { key: string; label: string; intro: string; books: BookShelfBook[] }[]
  /** 소속 선택 등 책 목록 앞에 붙는 부가 기능. 책 표시는 항상 공통 모듈이 맡는다. */
  addon?: ReactNode
  /** 다음 책 묶음은 책 목록 안에서만 불러온다. */
  pagination?: {
    hasMore: boolean
    loading: boolean
    failed: boolean
    onLoadMore: () => void
  }
  /** 같은 탭 안에서 소속 등 목록의 맥락이 바뀌면 책 선택을 초기화한다. */
  selectionKey?: string
  context?: BookShelfContext
}

export function figureBookToShelfBook(book: FigureBookContent): BookShelfBook {
  return { ...book, detailsLoaded: true }
}

export function affiliateBookToShelfBook(book: AffiliateBook): BookShelfBook {
  return {
    id: book.contentId, title: book.title, creator: book.creator ?? null,
    thumbnailUrl: book.thumbnail ?? null, titleBadge: book.titleBadge,
    preferredEditionId: book.editionId, isbn: book.isbn,
    editions: [], description: book.description,
    readerIds: book.readerIds,
    professionCategory: book.professionCategory,
    selectionReason: book.selectionReason,
    selectionSourceUrl: book.selectionSourceUrl,
    affiliateLinks: book.url ? [{ platform: /(?:amazon\.|amzn\.to)/.test(book.url) ? 'amazon' : 'coupang', url: book.url }] : [],
  }
}
