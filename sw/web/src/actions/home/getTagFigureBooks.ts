/*
  파일명: actions/home/getTagFigureBooks.ts
  기능: 세력도감 태그 구성원 전원이 등장하는 인물 도서(figure books) 묶음 조회
  책임: 테마 화면의 작품 선반이 인물 모달 「이 인물 관련 책」과 같은 자료를 테마 단위로 보여 준다.
        책마다 등장 구성원 id를 함께 주어 화면이 진영(클러스터) 고름에 맞춰 선반을 걸러 쓴다.
*/
"use server";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { selectInChunks } from "@feelandnote/shared/lib/paginate";
import { getFigureBookAssignmentsByCelebs } from "@/actions/figure-books/figureBookAssignments";
import { loadFigureBookEditions } from "@/actions/figure-books/figureBookEditions";
import { getFigureBookPurchasePlatform, pickPurchaseEdition } from "@/actions/figure-books/figureBookLocale";
import { getEnglishBookAmazonUrl } from "@/lib/books/amazonBookSearch";
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from "@/lib/utils/content-locale";
import type { ContentType } from "@/types/database";
import type { AffiliateBook } from "./getAffiliateBooks";

export interface TagFigureBook extends AffiliateBook {
  /** 이 책에 배정된 테마 구성원 — 진영 고름에 맞춰 선반을 걸러 쓴다 */
  memberIds: string[];
}

interface ContentRow {
  id: string;
  type: ContentType;
  figureBook: { workTitle?: string; workCreator?: string } | null;
  content_locales: ContentLocaleRow[] | null;
}

const httpsUrl = (value: unknown) => (typeof value === "string" && value.startsWith("https://") ? value : "");

async function fetchTagFigureBooks(tagId: string, locale: string): Promise<TagFigureBook[]> {
  const db = createStaticClient();

  const { data: members, error: membersError } = await db
    .from("faction_atlas_members")
    .select("celeb_id")
    .eq("tag_id", tagId)
    .eq("hidden", false);
  throwOnQueryError("getTagFigureBooks 편성 조회", membersError);
  if (!members?.length) return [];

  const assignments = await getFigureBookAssignmentsByCelebs(members.map((member) => member.celeb_id));
  if (assignments.length === 0) return [];

  const contentIds = [...new Set(assignments.map((assignment) => assignment.content_id))];
  const [contents, editionsByContent] = await Promise.all([
    selectInChunks<ContentRow>(contentIds, (ids) => db
      .from("contents")
      .select(`id,type,figureBook:metadata->figureBook,content_locales(${CL_SELECT_LIST})`)
      .in("id", ids)
      .overrideTypes<ContentRow[], { merge: false }>()),
    loadFigureBookEditions(db, contentIds, locale),
  ]);

  const memberIdsByContent = new Map<string, string[]>();
  for (const assignment of assignments) {
    memberIdsByContent.set(assignment.content_id, [...(memberIdsByContent.get(assignment.content_id) ?? []), assignment.celeb_id]);
  }

  /* 카드 맞춤 규칙은 인물 모달 「이 인물 관련 책」과 같다 — 판본 제목·저자·표지를 우선하고
     한국어는 같은 판본의 쿠팡 상품을, 영어는 아마존 상품·검색 주소를 잇는다 */
  const isEn = locale === "en";
  const productPlatform = getFigureBookPurchasePlatform(locale) ?? "coupang";
  const books = contents.flatMap((content): TagFigureBook[] => {
    if (content.type !== "BOOK") return [];
    const flat = flattenLocales(content.content_locales, locale);
    const edition = pickPurchaseEdition(editionsByContent.get(content.id) ?? [], locale);
    const title = edition?.title || flat.title || content.figureBook?.workTitle || "";
    if (!title) return [];
    const creator = edition?.creator ?? flat.creator ?? content.figureBook?.workCreator ?? undefined;
    const product = edition?.platform === productPlatform ? httpsUrl(edition.purchaseUrl) : "";
    return [{
      contentId: content.id,
      editionId: edition?.id,
      title,
      creator,
      thumbnail: (edition?.thumbnailUrl ?? flat.thumbnail_url) || undefined,
      url: isEn ? getEnglishBookAmazonUrl({ title, creator, url: product || null }) : product,
      // 고른 판본에 제목이 있으면 그 언어판이 확인된 것이라 「번역본 없음」만 거둔다 — 절판은 판본이 있어도 남긴다
      titleBadge: flat.title_badge === "out-of-print" || !edition?.title ? flat.title_badge : null,
      memberIds: memberIdsByContent.get(content.id) ?? [],
    }];
  });

  // 많은 구성원이 나오는 작품이 앞 — 같은 수면 제목순
  books.sort((a, b) => b.memberIds.length - a.memberIds.length || a.title.localeCompare(b.title, locale));
  return books;
}

const getTagFigureBooksCached = unstable_cache(
  fetchTagFigureBooks,
  ["tag-figure-books-v1"],
  // faction_atlas_members(편성) + figure_book_characters(배정) + contents + 판본·구매 상품
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS] },
);

export async function getTagFigureBooks(tagId: string, locale: string): Promise<TagFigureBook[]> {
  return withQueryFallback("getTagFigureBooks", () => getTagFigureBooksCached(tagId, locale === "en" ? "en" : "ko"), []);
}
