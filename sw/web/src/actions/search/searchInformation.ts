'use server'

import { searchBlog } from '@feelandnote/content-search/naver-blog'

// 블로그 검색 Server Action
export async function searchBlogAction(query: string) {
  if (!query.trim()) return { error: '검색어를 입력해주세요.', items: [] };

  try {
    const result = await searchBlog(query, 5);
    return { items: result.items };
  } catch (error) {
    console.error('Blog search error:', error);
    const message = error instanceof Error ? error.message : '';
    return { error: message || '검색 중 오류가 발생했습니다.', items: [] };
  }
}
