/*
  파일명: actions/home/getTagSharedLibrary.ts
  기능: 세력도감 태그 내 셀럽들의 공유 콘텐츠 조회
  책임: 2명 이상이 공통으로 감상한 콘텐츠를 celebCount 내림차순으로 반환한다.
        도서에는 한국어 판매 판본(쿠팡 링크·판본 id)을 붙여 선반이 구매로 잇게 한다.
*/
"use server";

import { unstable_cache } from "next/cache"
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { selectAllPages, selectInChunks } from "@feelandnote/shared/lib/paginate";
import {
  mapFigureBookPurchaseOptions,
  type FigureBookPurchaseOptionRow,
} from "@/actions/figure-books/figureBookLocale";
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from "@/lib/cache";
import { createStaticClient } from "@/lib/db/static";
import { CL_SELECT_LIST_WITH_AFFILIATE, flattenLocales, type ContentLocaleRow, type TitleBadge } from "@/lib/utils/content-locale";

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
  /** 한국어 도서의 쿠팡 상품 주소 — 없으면 null */
  coupangUrl: string | null;
  /** 판매 판본 id — YES24 연결이 같은 판본을 찾는 데 쓴다 */
  editionId?: number;
}

type LocaleRowWithAffiliate = ContentLocaleRow & { affiliate_url?: string | null };

async function fetchTagSharedLibrary(tagId: string): Promise<SharedContent[]> {
  const db = createStaticClient();

  // 1. 태그에 속한 셀럽 ID 조회 — 뷰가 편성(숨김 제외)을 쥔다
  const { data: assignments, error: assignmentsError } = await db
    .from("faction_atlas_members")
    .select("celeb_id")
    .eq("tag_id", tagId)
    .eq("hidden", false);

  // 조회 실패와 "배정된 인물이 없다"를 가른다 — 실패를 빈 목록으로 캐시하면 7일간 구역이 사라진다
  throwOnQueryError('getTagSharedLibrary 편성 조회', assignmentsError);
  if (!assignments?.length) return [];

  const celebIds = assignments.map((a) => a.celeb_id);

  // 2. 셀럽 프로필 조회 (닉네임, 아바타, 주소)
  const { data: celebRows, error: celebsError } = await db
    .from("celebs")
    .select("id, slug, nickname, nickname_en, avatar_url")
    .in("id", celebIds);

  throwOnQueryError('getTagSharedLibrary 인물 조회', celebsError);

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
      `celeb_id, content_id, contents!inner(id, type, content_locales(${CL_SELECT_LIST_WITH_AFFILIATE}))`
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
      contentMap.set(c.id, {
        title: ko?.title || en?.title || "",
        title_en: en?.title ?? null,
        titleBadge: flatKo.title_badge,
        titleBadgeEn: flatEn.title_badge,
        creator: ko?.creator || en?.creator || null,
        creator_en: en?.creator ?? null,
        thumbnailUrl: ko?.thumbnail_url || en?.thumbnail_url || null,
        type: c.type ?? "BOOK",
        coupangUrl: ko?.affiliate_url?.startsWith("https://") ? ko.affiliate_url : null,
        celebIds: new Set([row.celeb_id]),
      });
    }
  }

  // 5. 2명 이상 공유 콘텐츠만 남긴다
  const shared = [...contentMap].filter(([, info]) => info.celebIds.size >= 2);

  // 6. 도서의 한국어 판매 판본 — 판본이 있으면 작품 주소보다 앞선다(인물 도서·신화 선반과 같은 원천)
  const bookIds = shared.filter(([, info]) => info.type === "BOOK").map(([contentId]) => contentId);
  const purchaseOptions = await selectInChunks<FigureBookPurchaseOptionRow>(bookIds, (ids) => db
    .from("figure_book_purchase_options")
    .select("edition_id,content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order,platform,affiliate_url")
    .in("content_id", ids)
    .eq("locale", "ko")
    .eq("platform", "coupang")
    .overrideTypes<FigureBookPurchaseOptionRow[], { merge: false }>());
  const optionsByContent = new Map<string, FigureBookPurchaseOptionRow[]>();
  for (const option of purchaseOptions) {
    optionsByContent.set(option.content_id, [...(optionsByContent.get(option.content_id) ?? []), option]);
  }

  const result: SharedContent[] = shared.map(([contentId, { celebIds: ids, ...info }]) => {
    const edition = mapFigureBookPurchaseOptions(optionsByContent.get(contentId) ?? [], "ko")[0];
    return {
      ...info,
      contentId,
      thumbnailUrl: info.thumbnailUrl ?? edition?.thumbnailUrl ?? null,
      coupangUrl: edition?.purchaseUrl ?? info.coupangUrl,
      editionId: edition?.id,
      celebCount: ids.size,
      celebs: [...ids].flatMap((id) => profileMap.get(id) ?? []),
    };
  });

  // 많이 함께 본 순, 같으면 살 수 있는 책을 앞에
  result.sort((a, b) => b.celebCount - a.celebCount || Number(Boolean(b.coupangUrl)) - Number(Boolean(a.coupangUrl)));

  return result;
}

const getTagSharedLibraryCached = unstable_cache(
  fetchTagSharedLibrary,
  ['tag-shared-library-v2'],
  // faction_atlas_members(편성) + celebs + celeb_contents + 판매 판본
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
);

export async function getTagSharedLibrary(tagId: string): Promise<SharedContent[]> {
  return withQueryFallback('getTagSharedLibrary', () => getTagSharedLibraryCached(tagId), []);
}
