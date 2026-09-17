/*
  파일명: actions/home/getFactionSharedLibrary.ts
  기능: 세력도감 태그 내 셀럽들의 공유 콘텐츠 조회
  책임: 2명 이상이 공통으로 감상한 콘텐츠를 celebCount 내림차순으로 반환한다.
        도서에는 한국어 판본(YES24가 찾을 ISBN 판본 id, 같은 판본의 쿠팡 보조 링크)을 붙여 선반이 구매로 잇게 한다.
*/
"use server";

import { unstable_cache } from "next/cache"
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { selectAllPages } from "@feelandnote/shared/lib/paginate";
import { loadFigureBookEditions } from "@/actions/figure-books/figureBookEditions";
import { pickPurchaseEdition } from "@/actions/figure-books/figureBookLocale";
import { normalizePurchaseIsbn } from "@/lib/books/yes24Purchase";
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { CL_SELECT_LIST_WITH_AFFILIATE, flattenLocales, type ContentLocaleRow, type TitleBadge } from "@/lib/utils/content-locale";
import { findAffiliateLink } from "./affiliateLinks";

interface SharedContentCeleb {
  id: string;
  slug: string | null;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
}

export interface SharedContent {
  contentId: string;
  title: string;
  title_en: string | null;
  titleBadge: TitleBadge | null;
  titleBadgeEn: TitleBadge | null;
  creator: string | null;
  creator_en: string | null;
  thumbnailUrl: string | null;
  type: string;
  celebCount: number;
  celebs: SharedContentCeleb[];
  /** 한국어 도서의 쿠팡 상품 주소(YES24 옆 보조 단추) — 없으면 null */
  coupangUrl: string | null;
  /** 한국어 판본 id — YES24 연결이 같은 판본을 찾는 데 쓴다 */
  editionId?: number;
  /** YES24 상품으로 이을 한국어 ISBN이 있는가 — 같은 공유 수면 이런 책을 앞에 둔다 */
  hasKoreanIsbn?: boolean;
}

// DB 원형은 JSON 배열([{ url, platform }])이다 — 문자열로 가정하면 링크 달린 책 하나에 진영 전체 조회가 죽는다
type LocaleRowWithAffiliate = ContentLocaleRow & { affiliate_url?: unknown };

async function fetchFactionSharedLibrary(factionId: string): Promise<SharedContent[]> {
  const db = createStaticClient();

  // 1. 태그에 속한 셀럽 ID 조회 — 뷰가 편성(숨김 제외)을 쥔다
  const { data: assignments, error: assignmentsError } = await db
    .from("faction_member_rows")
    .select("celeb_id")
    .eq("lv2_id", factionId)
    .eq("hidden", false);

  // 조회 실패와 "배정된 인물이 없다"를 가른다 — 실패를 빈 목록으로 캐시하면 7일간 구역이 사라진다
  throwOnQueryError('getFactionSharedLibrary 편성 조회', assignmentsError);
  if (!assignments?.length) return [];

  const celebIds = assignments.map((a) => a.celeb_id);

  // 2. 셀럽 프로필 조회 (닉네임, 아바타, 주소)
  const { data: celebRows, error: celebsError } = await db
    .from("celebs")
    .select("id, slug, nickname, nickname_en, avatar_url")
    .in("id", celebIds);

  throwOnQueryError('getFactionSharedLibrary 인물 조회', celebsError);

  const profileMap = new Map<string, SharedContentCeleb>();
  (celebRows ?? []).forEach((p) =>
    profileMap.set(p.id, {
      id: p.id,
      slug: p.slug ?? null,
      nickname: p.nickname,
      nickname_en: p.nickname_en,
      avatar_url: p.avatar_url,
    })
  );

  // 3. celeb_contents + contents JOIN
  // 큰 진영(백 명대)이면 기록이 1,000행을 넘을 수 있다 — 나눠 받는다
  const data = await selectAllPages((from, to) => db
    .from("celeb_contents")
    .select(
      `celeb_id, content_id, contents!inner(id, type, content_locales(${CL_SELECT_LIST_WITH_AFFILIATE}, isbn))`
    )
    .in("celeb_id", celebIds)
    .eq("visibility", "public")
    .order("id", { ascending: true })
    .range(from, to));

  // 4. content_id 기준 그룹화
  const contentMap = new Map<
    string,
    Omit<SharedContent, "contentId" | "celebCount" | "celebs"> & { celebIds: Set<string> }
  >();

  for (const row of data) {
    const c = row.contents as unknown as {
      id: string; type: string | null;
      content_locales: LocaleRowWithAffiliate[] | null;
    };
    const ko = c.content_locales?.find(l => l.locale === 'ko');
    const en = c.content_locales?.find(l => l.locale === 'en');
    // 배지 판정만 중앙 함수에 맡긴다 — title·title_en 등 기존 표시값은 그대로 둔다
    const flatKo = flattenLocales(c.content_locales, 'ko')
    const flatEn = flattenLocales(c.content_locales, 'en')

    const existing = contentMap.get(c.id);
    if (existing) {
      existing.celebIds.add(row.celeb_id);
    } else {
      const coupangUrl = findAffiliateLink(ko?.affiliate_url, "coupang")?.url;
      contentMap.set(c.id, {
        title: ko?.title || en?.title || "",
        title_en: en?.title ?? null,
        titleBadge: flatKo.title_badge,
        titleBadgeEn: flatEn.title_badge,
        creator: ko?.creator || en?.creator || null,
        creator_en: en?.creator ?? null,
        thumbnailUrl: ko?.thumbnail_url || en?.thumbnail_url || null,
        type: c.type ?? "BOOK",
        coupangUrl: coupangUrl?.startsWith("https://") ? coupangUrl : null,
        hasKoreanIsbn: Boolean(normalizePurchaseIsbn(ko?.isbn)),
        celebIds: new Set([row.celeb_id]),
      });
    }
  }

  // 5. 2명 이상 공유 콘텐츠만 남긴다
  const shared = [...contentMap].filter(([, info]) => info.celebIds.size >= 2);

  // 6. 도서의 한국어 판본 — 판본이 있으면 작품 주소보다 앞선다(인물 도서·신화 선반과 같은 원천)
  const bookIds = shared.filter(([, info]) => info.type === "BOOK").map(([contentId]) => contentId);
  const editionsByContent = await loadFigureBookEditions(db, bookIds, "ko");

  const result: SharedContent[] = shared.map(([contentId, { celebIds: ids, ...info }]) => {
    const edition = pickPurchaseEdition(editionsByContent.get(contentId) ?? [], "ko");
    return {
      ...info,
      contentId,
      thumbnailUrl: info.thumbnailUrl ?? edition?.thumbnailUrl ?? null,
      coupangUrl: edition ? (edition.platform === "coupang" ? edition.purchaseUrl : null) : info.coupangUrl,
      editionId: edition?.id,
      hasKoreanIsbn: Boolean(normalizePurchaseIsbn(edition?.isbn)) || info.hasKoreanIsbn,
      celebCount: ids.size,
      celebs: [...ids].flatMap((id) => profileMap.get(id) ?? []),
    };
  });

  // 많이 함께 본 순, 같으면 YES24 상품으로 이을 수 있는 책을 앞에
  result.sort((a, b) => b.celebCount - a.celebCount || Number(Boolean(b.hasKoreanIsbn)) - Number(Boolean(a.hasKoreanIsbn)));

  return result;
}

const getFactionSharedLibraryCached = unstable_cache(
  fetchFactionSharedLibrary,
  ['faction-shared-library-v3-yes24-edition'],
  // faction_member_rows(편성) + celebs + celeb_contents + 한국어 판본
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.FACTIONS, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
);

export async function getFactionSharedLibrary(factionId: string): Promise<SharedContent[]> {
  return withQueryFallback('getFactionSharedLibrary', () => getFactionSharedLibraryCached(factionId), []);
}
