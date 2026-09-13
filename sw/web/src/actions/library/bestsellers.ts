/*
  파일명: /actions/library/bestsellers.ts
  기능: 주간 수집한 인기 작품 조회 (KO & EN 지원)
  책임: 게시된 목록을 배포와 독립적으로 갱신하고, 조회 실패 시 기존 정상 목록을 제공한다.
*/ // ------------------------------

'use server'

import bestsellersData from '@/constants/library/bestsellers.json'
import { unstable_cache } from 'next/cache'
import { rawFetch } from '@/lib/rawFetch'
import { BESTSELLER_REVALIDATE_SECONDS, fetchBestsellerFeed, mergeBestsellerFeeds, selectBestsellers, type BestsellerFeed } from '@/lib/library/bestsellerFeed'
import type { LibraryContent } from './types'

// 갱신 실패는 던져서 Next가 직전 정상 캐시를 보존하게 한다.
const getPublishedFeed = unstable_cache(() => fetchBestsellerFeed(rawFetch), ['library-bestsellers-published-v1'], {
  revalidate: BESTSELLER_REVALIDATE_SECONDS,
})

export async function getBestsellers(categoryKey: string = 'ALL', locale: string = 'ko') {
  let data: BestsellerFeed
  try {
    data = mergeBestsellerFeeds(await getPublishedFeed(), bestsellersData as BestsellerFeed)
  } catch {
    // 캐시가 없는 첫 요청의 네트워크 실패에도 빌드에 포함한 정상본으로 읽을 수 있다.
    console.error('[library] Published bestseller feed unavailable; using bundled snapshot')
    data = bestsellersData as BestsellerFeed
  }
  const selection = selectBestsellers(data, categoryKey, locale)
  const { items } = selection
  
  const asLibraryContents: LibraryContent[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    creator: item.creator,
    thumbnail_url: item.thumbnail_url,
    type: item.type || 'BOOK',
    celeb_count: 0,
    user_count: 0,
    avg_rating: null,
    title_ko: item.title_ko || item.title,
    title_en: item.title_en || item.title,
    creator_en: item.creator_en || item.creator,
    thumbnail_en: item.thumbnail_en || item.thumbnail_url,
    has_en_edition: null,
  }))

  return {
    ...selection,
    asLibraryContents,
  }
}
