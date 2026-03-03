export interface BookEditions {
  ko?: { title: string; creator?: string | null; thumbnail?: string | null };
  en?: { title: string; creator?: string | null; thumbnail?: string | null };
}

/**
 * 비-BOOK 타입 콘텐츠의 title/creator를 locale에 맞게 반환한다.
 * BOOK은 에디션 토글이 처리하므로 원본 그대로 반환.
 */
export function getLocalizedContent(
  content: {
    type?: string;
    title: string;
    title_en?: string | null;
    creator?: string | null;
    creator_en?: string | null;
  },
  locale: string
): { title: string; creator: string | null } {
  if (content.type === "BOOK" || locale !== "en") {
    return { title: content.title, creator: content.creator ?? null };
  }
  return {
    title: content.title_en as string,
    creator: content.creator_en as string | null,
  };
}

/**
 * Content 객체에서 BOOK 타입일 때 BookEditions를 생성한다.
 * title_ko/title_en 중 하나라도 있으면 editions 객체를 반환, 둘 다 없으면 undefined.
 */
export function getBookEditions(content: {
  type: string;
  title?: string | null;
  title_ko?: string | null;
  title_en?: string | null;
  creator?: string | null;
  creator_en?: string | null;
  thumbnail_url?: string | null;
  thumbnail_en?: string | null;
}): BookEditions | undefined {
  if (content.type !== "BOOK") return undefined;

  const hasKo = !!content.title_ko;
  const hasEn = !!content.title_en;

  if (!hasKo && !hasEn) return undefined;

  const editions: BookEditions = {};

  if (hasKo) {
    editions.ko = {
      title: content.title_ko!,
      creator: content.creator ?? null,
      thumbnail: content.thumbnail_url ?? null,
    };
  }

  if (hasEn) {
    editions.en = {
      title: content.title_en!,
      creator: content.creator_en ?? content.creator ?? null,
      thumbnail: content.thumbnail_en ?? null,
    };
  }

  return editions;
}
