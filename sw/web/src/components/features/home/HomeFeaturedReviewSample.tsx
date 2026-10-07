import { getLocale, getTranslations } from "next-intl/server";
import { createStaticClient } from "@/lib/db/static";
import { cachedDetail, cachedList, throwOnQueryError } from "@/lib/cache";
import { flattenLocales, CL_SELECT_LIST_WITH_AFFILIATE } from "@/lib/utils/content-locale";
import type { ContentType } from "@/types/database";
import HomeFeaturedReview from "./HomeFeaturedReview";
import { CACHE_TAGS } from "@feelandnote/shared/constants/cache-tags";
import { selectAllPages } from "@feelandnote/shared/lib/paginate";
import { FEATURED_REVIEW_MIN_TEXT_LENGTH, featuredReviewDay, featuredReviewHasEnoughText, orderFeaturedReviews } from "@/lib/reviews/featuredReviewLength";
import { availableFeaturedReviews, featuredReviewEdition, type FeaturedReviewBookCandidate } from "@/lib/reviews/featuredReviewAvailability";
import { getCachedYes24BookDetail } from "@/lib/books/yes24DetailCache";
import { yes24PurchaseEnabled } from "@/lib/books/yes24Purchase";

const SALE_CHECK_BATCH_SIZE = 4;

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
    .eq("contents.type", "BOOK")
    .eq("visibility", "public")
    .eq("status", "FINISHED")
    .or("is_spoiler.is.null,is_spoiler.eq.false")
    .eq("user.publication_status", "active");
  const selected = await cachedList(CACHE_TAGS.CELEBS, ["home-review-length-selection-v1", day], async () => {
    if (!yes24PurchaseEnabled(process.env)) return null;
    // DB에서 짧은 본문을 먼저 제외하고, 공백·서식을 뺀 실제 분량은 코드에서 확인한다.
    const candidates = await selectAllPages<FeaturedReviewBookCandidate>((from, to) => buildQuery(
      "id,celeb_id,content_id,review,review_en,user:celebs!inner(publication_status),contents!inner(type,content_locales(locale,title,isbn,sources))"
    ).like("review", "_".repeat(FEATURED_REVIEW_MIN_TEXT_LENGTH.ko) + "%")
      .like("review_en", "_".repeat(FEATURED_REVIEW_MIN_TEXT_LENGTH.en) + "%").order("id").range(from, to));
    const ordered = orderFeaturedReviews(candidates.filter(row => featuredReviewHasEnoughText(row)
      && featuredReviewEdition(row.contents.content_locales, "ko") && featuredReviewEdition(row.contents.content_locales, "en")), day);
    // 날짜 순서대로 필요한 후보만 판매 확인한다. 전체 후보의 ISBN을 매번 외부 API로 조회하지 않는다.
    for (let index = 0; index < ordered.length; index += SALE_CHECK_BATCH_SIZE) {
      let failures = 0;
      const available = await availableFeaturedReviews(ordered.slice(index, index + SALE_CHECK_BATCH_SIZE), async isbn => {
        try { return await getCachedYes24BookDetail(isbn); }
        catch (error) { failures++; throw error; }
      });
      if (available[0]) return { id: available[0].id, celebId: available[0].celeb_id };
      if (failures) throw new Error("홈 감상 도서의 판매 여부를 확인하지 못했습니다.");
    }
    return null;
  }, { extraTags: [CACHE_TAGS.CONTENTS] });
  const row = selected ? await cachedDetail(CACHE_TAGS.CELEBS, selected.celebId!, ["home-review-length-body-v1", selected.id], async () => {
    const { data, error } = await buildQuery(
      "id,review,review_en,source_url,user:celebs!inner(id,slug,nickname,nickname_en,avatar_url,profession,nationality,birth_date,death_date),contents!inner(id,type,content_locales(" + CL_SELECT_LIST_WITH_AFFILIATE + ",isbn))"
    ).eq("id", selected.id).maybeSingle();
    throwOnQueryError("홈 감상 본문 조회", error);
    return data as unknown as SampleRow | null;
  }, { extraTags: [CACHE_TAGS.CONTENTS] }) : null;
  const review = (locale === "en" ? row?.review_en : row?.review)?.trim();
  if (!row || !review || !featuredReviewHasEnoughText(row)) {
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
