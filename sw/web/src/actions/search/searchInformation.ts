'use server'

import { searchNews, type NewsSearchResult } from '@feelandnote/content-search/naver-news'
import { searchImages, type ImageSearchResult } from '@feelandnote/content-search/naver-image'
import { searchBlog, type BlogSearchResult } from '@feelandnote/content-search/naver-blog'

export type InfoSearchResult = 
  | { type: 'NEWS'; items: NewsSearchResult[]; error?: string }
  | { type: 'IMAGE'; items: ImageSearchResult[]; error?: string }
  | { error: string };

export async function searchInformation(query: string, type: 'NEWS' | 'IMAGE' = 'NEWS') {
  if (!query.trim()) return { error: '검색어를 입력해주세요.' };

  try {
    if (type === 'NEWS') {
      const result = await searchNews(query);
      return { type: 'NEWS' as const, items: result.items };
    } else {
      const result = await searchImages(query);
      return { type: 'IMAGE' as const, items: result.items };
    }
  } catch (error: any) {
    console.error('Information search error:', error);
    return { error: error.message || '검색 중 오류가 발생했습니다.' };
  }
}

// 블로그 검색 Server Action
export async function searchBlogAction(query: string) {
  if (!query.trim()) return { error: '검색어를 입력해주세요.', items: [] };

  try {
    const result = await searchBlog(query, 5);
    return { items: result.items };
  } catch (error: any) {
    console.error('Blog search error:', error);
    return { error: error.message || '검색 중 오류가 발생했습니다.', items: [] };
  }
}
