/*
  파일명: actions/home/factionBookHydrate.ts
  기능: 콘텐츠 id 묶음을 세력 선반 카드(FactionFigureBook)로 만든다 — 판본·구매 링크·구성원 매핑 공통부
  책임: 테마 작품 선반(getFactionFigureBooks)과 구성원 감상 선반(getFactionMemberShelf)이 같은 맞춤 규칙을 쓴다.
        서버 액션 파일이 아니므로 'use server'를 달지 않는다 — 액션 쪽에서 불러 쓴다.
*/
import { selectInChunks } from "@feelandnote/shared/lib/paginate";
import { loadFigureBookEditions } from "@/actions/figure-books/figureBookEditions";
import { resolveBookShelfBook } from "@/lib/books/bookShelf";
import { createStaticClient } from "@/lib/db/static";
import { CL_SELECT_LIST_WITH_AFFILIATE, type ContentLocaleRow } from "@/lib/utils/content-locale";
import type { ContentType } from "@/types/database";
import type { FactionFigureBook } from "./getFactionFigureBooks";

/** 책별 구성원 배정 — memberIds는 진영 고름 필터용 전원, appeared/authored는 「등장」「집필」 탭의 근거 */
export interface FactionBookRelations {
  memberIds: Map<string, string[]>;
  appearedIds: Map<string, string[]>;
  authoredIds: Map<string, string[]>;
}

interface ContentRow {
  id: string;
  type: ContentType;
  figureBook: { workTitle?: string; workCreator?: string } | null;
  content_locales: ContentLocaleRow[] | null;
}

export async function hydrateFactionBooks(
  contentIds: string[],
  relations: FactionBookRelations,
  locale: string,
  themeSlug?: string,
  themeBookIds?: string[],
): Promise<FactionFigureBook[]> {
  if (!contentIds.length) return [];
  const db = createStaticClient();

  const [contents, editionsByContent] = await Promise.all([
    selectInChunks<ContentRow>(contentIds, (ids) => db
      .from("contents")
      .select(`id,type,figureBook:metadata->figureBook,content_locales(${CL_SELECT_LIST_WITH_AFFILIATE},isbn)`)
      .in("id", ids)
      .overrideTypes<ContentRow[], { merge: false }>()),
    loadFigureBookEditions(db, contentIds, locale),
  ]);

  /* 카드 맞춤 규칙은 인물 모달 「이 인물 관련 책」과 같다 — 판본 제목·저자·표지를 우선하고
     한국어는 같은 판본의 쿠팡 상품을, 영어는 아마존 상품·검색 주소를 잇는다 */
  const books = contents.flatMap((content): FactionFigureBook[] => {
    const book = resolveBookShelfBook(content, editionsByContent.get(content.id) ?? [], locale, themeSlug);
    if (!book) return [];
    return [{
      ...book,
      isTheme: themeBookIds?.includes(content.id) ?? false,
      memberIds: relations.memberIds.get(content.id) ?? [],
      appearedIds: relations.appearedIds.get(content.id) ?? [],
      authoredIds: relations.authoredIds.get(content.id) ?? [],
    }];
  });

  // 많은 구성원이 걸린 책이 앞 — 같은 수면 제목순
  books.sort((a, b) => b.memberIds.length - a.memberIds.length || a.title.localeCompare(b.title, locale));
  return books;
}
