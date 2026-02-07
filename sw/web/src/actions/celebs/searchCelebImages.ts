"use server";

import { searchImages, type ImageSearchResult } from "@feelandnote/content-search/naver-image";

export async function searchCelebImages(
  nickname: string
): Promise<ImageSearchResult[]> {
  try {
    const { items } = await searchImages(nickname, 12);
    return items;
  } catch {
    return [];
  }
}
