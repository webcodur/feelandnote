/*
  파일명: actions/home/getFactionMemberShelf.ts
  기능: 세력 선반의 「감상」「직군」 탭 자료 — 구성원들이 남긴 기록 + 최다 직군 동료들의 기록
  책임: 「감상」은 celeb_contents를 구성원 id로 배치 조회해 테마 작품 선반과 같은 맞춤 규칙으로 카드화한다.
        「직군」은 구성원 최다 직군을 찾아 그 직군 동료들의 기록을 판매 풀에서 고른다 —
        개인 페이지 추천 층의 profession 소스를 세력 단위로 옮긴 것이다.
        탭이 실제로 열릴 때 클라이언트가 부른다 — 지연 로딩이라 테마 첫 렌더(ISR) 무게에 섞이지 않는다.
*/
"use server";

import { selectAllPages } from "@feelandnote/shared/lib/paginate";
import { throwOnQueryError, withQueryFallback } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { hydrateFactionBooks, type FactionBookRelations } from "./factionBookHydrate";
import { getProfessionPeerBooks, type AffiliateBook } from "./getAffiliateBooks";
import type { FactionFigureBook } from "./getFactionFigureBooks";

export interface FactionMemberShelf {
  /** 구성원들이 남긴 기록 — 「감상」 탭 */
  read: FactionFigureBook[];
  /** 구성원 최다 직군 — 없으면 null이고 「직군」 탭이 서지 않는다 */
  profession: string | null;
  /** 최다 직군 동료들이 남긴 기록 중 팔리는 책 — 「직군」 탭 */
  professionBooks: AffiliateBook[];
}

const EMPTY: FactionMemberShelf = { read: [], profession: null, professionBooks: [] };

export async function getFactionMemberShelf(
  memberIds: string[],
  excludeContentIds: string[],
  locale: string,
): Promise<FactionMemberShelf> {
  return withQueryFallback("getFactionMemberShelf", async () => {
    if (!memberIds.length) return EMPTY;
    const db = createStaticClient();
    const isEn = locale === "en";

    /* 감상 — 구성원들이 남긴 기록. 배정 조회처럼 인물 200명 묶음으로 나눠 끝까지 받는다 */
    const chunks = Array.from({ length: Math.ceil(memberIds.length / 200) }, (_, i) => memberIds.slice(i * 200, (i + 1) * 200));
    const recordRows = (await Promise.all(chunks.map((ids) => selectAllPages<{ content_id: string; celeb_id: string }>((from, to) => db
      .from("celeb_contents")
      .select("content_id, celeb_id")
      .in("celeb_id", ids)
      .order("id", { ascending: true })
      .range(from, to)
      .overrideTypes<{ content_id: string; celeb_id: string }[], { merge: false }>())))).flat();

    const readIdsByContent = new Map<string, string[]>();
    for (const row of recordRows) {
      readIdsByContent.set(row.content_id, [...(readIdsByContent.get(row.content_id) ?? []), row.celeb_id]);
    }
    // 감상 카드는 기록자가 곧 구성원 — 등장·집필 구분이 없으므로 memberIds만 채운다
    const readRelations: FactionBookRelations = { memberIds: readIdsByContent, appearedIds: new Map(), authoredIds: new Map() };
    const read = await hydrateFactionBooks([...readIdsByContent.keys()], readRelations, isEn ? "en" : "ko");

    /* 직군 — 구성원 사이 가장 많은 직군을 고르고, 그 직군 동료들의 기록을 판매 풀에서 고른다.
       다른 탭이 이미 보여 주는 책(테마 작품 + 구성원 기록)은 뺀다 */
    const { data: memberRows, error: memberError } = await db
      .from("celebs")
      .select("id, profession")
      .in("id", memberIds);
    throwOnQueryError("getFactionMemberShelf 구성원 직군", memberError);

    const counts = new Map<string, number>();
    for (const row of memberRows ?? []) {
      if (row.profession) counts.set(row.profession, (counts.get(row.profession) ?? 0) + 1);
    }
    const profession = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;

    const excludeIds = new Set<string>([...excludeContentIds, ...readIdsByContent.keys()]);
    const professionBooks = profession
      ? await getProfessionPeerBooks(profession, isEn ? "en" : "ko", memberIds, excludeIds)
      : [];

    return { read, profession, professionBooks };
  }, EMPTY);
}
