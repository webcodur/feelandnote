/*
  파일명: /actions/library/bestsellers.ts
  기능: 실시간 베스트셀러 및 전 매체(도서·영상·게임·음악) 트렌딩 조회 (KO & EN 지원)
  책임: 접속자의 locale(ko/en)에 따라 한국 내수 차트(알라딘/TMDB-KO/Steam-KO/Apple-KR) 또는 글로벌 차트(OpenLibrary/TMDB-EN/Steam-Global/Apple-US)를 0ms 지연으로 분기 제공한다.
*/ // ------------------------------

'use server'

import bestsellersData from '@/constants/library/bestsellers.json'
import type { BestsellerItem, LibraryContent } from './types'

interface BestsellerLocaleDataset {
  categories: Record<string, BestsellerItem[]>
}

interface BestsellerDataFile {
  updated_at: string
  ko?: BestsellerLocaleDataset
  en?: BestsellerLocaleDataset
  categories?: Record<string, BestsellerItem[]>
}

export async function getBestsellers(categoryKey: string = 'ALL', locale: string = 'ko'): Promise<{
  updatedAt: string
  items: BestsellerItem[]
  asLibraryContents: LibraryContent[]
}> {
  const data = bestsellersData as BestsellerDataFile
  const langKey = locale.toLowerCase().startsWith('en') ? 'en' : 'ko'
  const dataset = data[langKey] || { categories: data.categories || {} }
  const categories = dataset.categories || {}

  let items: BestsellerItem[] = []

  if (categoryKey === 'MEDIA_ALL') {
    const b = (categories['ALL'] || []).slice(0, 6)
    const v = (categories['VIDEO'] || []).slice(0, 6)
    const g = (categories['GAME'] || []).slice(0, 6)
    const m = (categories['MUSIC'] || []).slice(0, 6)
    items = [...b, ...v, ...g, ...m]
  } else {
    items = categories[categoryKey] || categories['ALL'] || []
  }
  
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
    updatedAt: data.updated_at,
    items,
    asLibraryContents,
  }
}
