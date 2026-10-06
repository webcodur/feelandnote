/*
  파일명: actions/home/getFactionMemberShelf.ts
  기능: 세력 선반의 「감상」「직군」 탭 자료 — 구성원들의 기록 + 최다 직군의 선정 도서
  책임: 「감상」은 celeb_contents를 구성원 id로 배치 조회해 테마 작품 선반과 같은 맞춤 규칙으로 카드화한다.
        「직군」은 구성원 최다 직군의 「되는 책」「관한 책」 선정 목록을 공유한다.
        책장 마운트 뒤 클라이언트가 부른다 — 테마 첫 렌더(ISR) 무게에 섞이지 않는다.
        조회 오류는 클라이언트의 재시도 안내로 넘긴다. 빈 목록으로 숨기지 않는다.
*/
"use server";

import { selectAllPages, selectInChunks } from "@feelandnote/shared/lib/paginate";
import { createStaticClient } from "@/lib/db/static";
import { hydrateFactionBooks, type FactionBookRelations } from "./factionBookHydrate";
import type { AffiliateBook } from "./getAffiliateBooks";
import { getProfessionBooks } from "@/actions/books/getProfessionBooks";
import type { FactionFigureBook } from "./getFactionFigureBooks";

export interface FactionMemberShelf {
  /** 구성원들이 남긴 기록 — 「감상」 탭 */
  read: FactionFigureBook[];
  /** 구성원 최다 직군 — 없으면 null이고 「직군」 탭이 서지 않는다 */
  profession: string | null;
  /** 최다 직군의 선정 도서 — 「직군」 탭 */
  professionBooks: AffiliateBook[];
}

const EMPTY: FactionMemberShelf = { read: [], profession: null, professionBooks: [] };

export async function getFactionMemberShelf(
  memberIds: string[],
  _excludeContentIds: string[],
  locale: string,
): Promise<FactionMemberShelf> {
  if (!memberIds.length) return EMPTY;
  const db = createStaticClient();
  const isEn = locale === "en";

  /* 감상 — 구성원 ID는 공통 묶음 크기로, 각 묶음의 기록은 끝까지 받는다 */
  const recordRows = await selectInChunks<{ content_id: string; celeb_id: string }>(memberIds, async (ids) => ({
    data: await selectAllPages<{ content_id: string; celeb_id: string }>((from, to) => db
      .from("celeb_contents")
      .select("content_id, celeb_id")
      .eq("visibility", "public")
      .in("celeb_id", ids)
      .order("id", { ascending: true })
      .range(from, to)
      .overrideTypes<{ content_id: string; celeb_id: string }[], { merge: false }>()),
    error: null,
  }));

  const readIdsByContent = new Map<string, string[]>();
  for (const row of recordRows) {
    readIdsByContent.set(row.content_id, [...(readIdsByContent.get(row.content_id) ?? []), row.celeb_id]);
  }
  // 감상 카드는 기록자가 곧 구성원 — 등장·집필 구분이 없으므로 memberIds만 채운다
  const readRelations: FactionBookRelations = { memberIds: readIdsByContent, appearedIds: new Map(), authoredIds: new Map() };
  const read = await hydrateFactionBooks([...readIdsByContent.keys()], readRelations, isEn ? "en" : "ko");

  /* 직군 — 구성원 사이 가장 많은 직군의 선정 목록을 읽는다. */
  const memberRows = await selectInChunks<{ id: string; profession: string | null }>(memberIds, (ids) => db
    .from("celebs")
    .select("id, profession")
    .in("id", ids)
    .overrideTypes<{ id: string; profession: string | null }[], { merge: false }>());

  const counts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    if (row.profession) counts.set(row.profession, (counts.get(row.profession) ?? 0) + 1);
  }
  const profession = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

  const professionBooks = profession
    ? await getProfessionBooks(profession, locale)
    : [];

  return { read, profession, professionBooks };
}
