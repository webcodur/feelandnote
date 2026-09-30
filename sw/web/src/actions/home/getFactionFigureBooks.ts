/*
  파일명: actions/home/getFactionFigureBooks.ts
  기능: 세력도감 태그 구성원 전원이 등장하는 인물 도서(figure books) 묶음 조회
  책임: 테마 화면의 작품 선반이 인물 모달 「이 인물 관련 책」과 같은 자료를 테마 단위로 보여 준다.
        책마다 등장 구성원 id를 함께 주어 화면이 진영(클러스터) 고름에 맞춰 선반을 걸러 쓰고,
        관계 유형(등장·연관/집필)을 나눠 주어 선반 탭이 갈래로 세운다.
*/
"use server";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { getFigureBookAssignmentsByCelebs } from "@/actions/figure-books/figureBookAssignments";
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import type { AffiliateBook } from "./getAffiliateBooks";
import { hydrateFactionBooks } from "./factionBookHydrate";

export interface FactionFigureBook extends AffiliateBook {
  /** 이 책에 배정된 테마 구성원 — 진영 고름에 맞춰 선반을 걸러 쓴다 */
  memberIds: string[];
  /** 등장·연관으로 배정된 구성원 — 「등장」 탭의 근거 */
  appearedIds: string[];
  /** 지은이로 배정된 구성원 — 「집필」 탭의 근거 */
  authoredIds: string[];
}

async function fetchFactionFigureBooks(factionId: string, locale: string): Promise<FactionFigureBook[]> {
  const db = createStaticClient();

  const { data: members, error: membersError } = await db
    .from("faction_member_rows")
    .select("celeb_id")
    .eq("lv2_id", factionId)
    .eq("hidden", false);
  throwOnQueryError("getFactionFigureBooks 편성 조회", membersError);
  if (!members?.length) return [];

  const assignments = await getFigureBookAssignmentsByCelebs(members.map((member) => member.celeb_id));
  if (assignments.length === 0) return [];

  const memberIdsByContent = new Map<string, string[]>();
  const appearedIdsByContent = new Map<string, string[]>();
  const authoredIdsByContent = new Map<string, string[]>();
  for (const assignment of assignments) {
    memberIdsByContent.set(assignment.content_id, [...(memberIdsByContent.get(assignment.content_id) ?? []), assignment.celeb_id]);
    const bucket = assignment.relation_type === "authored" ? authoredIdsByContent : appearedIdsByContent;
    bucket.set(assignment.content_id, [...(bucket.get(assignment.content_id) ?? []), assignment.celeb_id]);
  }

  return hydrateFactionBooks(
    [...memberIdsByContent.keys()],
    { memberIds: memberIdsByContent, appearedIds: appearedIdsByContent, authoredIds: authoredIdsByContent },
    locale,
  );
}

const getFactionFigureBooksCached = unstable_cache(
  fetchFactionFigureBooks,
  ["faction-figure-books-v4"],
  // faction_member_rows(편성) + figure_book_characters(배정) + contents + 판본·구매 상품
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.FACTIONS, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS] },
);

export async function getFactionFigureBooks(factionId: string, locale: string): Promise<FactionFigureBook[]> {
  return withQueryFallback("getFactionFigureBooks", () => getFactionFigureBooksCached(factionId, locale === "en" ? "en" : "ko"), []);
}
