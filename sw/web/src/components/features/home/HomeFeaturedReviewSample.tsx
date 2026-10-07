import { getLocale, getTranslations } from "next-intl/server";
import { createStaticClient } from "@/lib/db/static";
import { throwOnQueryError } from "@/lib/cache";
import { flattenLocales, CL_SELECT_LIST_WITH_AFFILIATE } from "@/lib/utils/content-locale";
import type { ContentType } from "@/types/database";
import HomeFeaturedReview from "./HomeFeaturedReview";
import { cachedDetail } from "@/lib/cache";
import { CACHE_TAGS, FEATURED_REVIEWS_CACHE_ID } from "@feelandnote/shared/constants/cache-tags";
import { featuredReviewDay, featuredReviewCutoff, selectFeaturedReview, type FeaturedReviewCandidate } from "@/lib/reviews/featuredReview";
import { selectAllPages } from "@feelandnote/shared/lib/paginate";

// 검수 완료 감상을 하루 한 편만 보여 준다. 선정은 한영 공통이며 반년 동안 같은 리뷰를 제외한다.

interface SampleRow {
  id: string;
  review: string;
  review_en: string | null;
  source_url: string | null;
  user: { id: string; slug: string | null; nickname: string; nickname_en: string | null; avatar_url: string | null; profession: string | null; nationality: string | null; birth_date: string | null; death_date: string | null };
  contents: { id: string; type: ContentType; content_locales: Parameters<typeof flattenLocales>[0] };
}

export default async function HomeFeaturedReviewSample() {
  const locale = await getLocale();
  const day = featuredReviewDay();
  const buildQuery = (selection: string) => createStaticClient()
    .from("celeb_contents")
    .select(selection)
    .not("review_approved_at", "is", null)
    .eq("contents.type", "BOOK")
    .eq("visibility", "public")
    .eq("status", "FINISHED")
    .or("is_spoiler.is.null,is_spoiler.eq.false")
    .eq("user.publication_status", "active")
    .not("review", "is", null).neq("review", "")
    .not("review_en", "is", null).neq("review_en", "");
  const candidates = await cachedDetail(CACHE_TAGS.CELEBS, FEATURED_REVIEWS_CACHE_ID, ["home-approved-review-index-v4-single-cooldown", day], async () => {
    const selection = "id, celeb_id, content_id, review_approved_at, user:celebs!inner(publication_status), contents!inner(type)";
    const candidates = await selectAllPages<FeaturedReviewCandidate>((from, to) => buildQuery(selection)
      .lte("review_approved_at", featuredReviewCutoff(day)).order("id").range(from, to));
    if (candidates.length) return candidates;
    // 정오 이전 후보가 없는 첫날은 현재 검수 완료된 후보로 같은 날짜 순환을 시작한다.
    const firstDayCandidates = await selectAllPages<FeaturedReviewCandidate>((from, to) => buildQuery(selection)
      .order("review_approved_at").order("id").range(from, to));
    return firstDayCandidates;
  }, { extraTags: [CACHE_TAGS.CONTENTS] });
  const selected = selectFeaturedReview(candidates, day);
  const row = selected ? await cachedDetail(
    CACHE_TAGS.CELEBS, FEATURED_REVIEWS_CACHE_ID, ["home-approved-review-body-profile", day, selected.id], async () => {
      const { data, error } = await buildQuery("id, review, review_en, source_url, user:celebs!inner(id, slug, nickname, nickname_en, avatar_url, profession, nationality, birth_date, death_date), contents!inner(id, type, content_locales(" + CL_SELECT_LIST_WITH_AFFILIATE + ", isbn))")
        .eq("id", selected.id).maybeSingle();
      throwOnQueryError("홈 검수 감상 본문 조회", error);
      return data as unknown as SampleRow | null;
    }, { extraTags: [CACHE_TAGS.CONTENTS] },
  ) : null;
  const review = (locale === "en" ? row?.review_en : row?.review)?.trim();
  if (!row || !review) {
    const t = await getTranslations("home.featuredReview");
    return <p className="text-center text-sm text-text-secondary">{t("unavailable")}</p>;
  }
  const content = flattenLocales(row.contents.content_locales, locale, row.contents.type);
  return <HomeFeaturedReview key={day + ":" + row.id} item={{
    id: row.id,
    review,
    sourceUrl: row.source_url,
    figure: { id: row.user.id, slug: row.user.slug, name: locale === "en" ? row.user.nickname_en || row.user.nickname : row.user.nickname, avatarUrl: row.user.avatar_url, profession: row.user.profession, nationality: row.user.nationality, birthDate: row.user.birth_date, deathDate: row.user.death_date },
    content: { id: row.contents.id, type: row.contents.type, title: content.title, creator: content.creator, thumbnailUrl: content.thumbnail_url, isbn: content.isbn, affiliateUrl: content.affiliate_url },
  }} />;
}
