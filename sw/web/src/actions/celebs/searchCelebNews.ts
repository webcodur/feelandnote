"use server";

import { searchNews, type NewsSearchResult } from "@feelandnote/content-search/naver-news";

export async function searchCelebNews(
  nickname: string
): Promise<NewsSearchResult[]> {
  try {
    const { items } = await searchNews(nickname, 30);
    return items.filter((item) => item.title.includes(nickname)).slice(0, 10);
  } catch {
    return [];
  }
}
