import { getLocale, getTranslations } from "next-intl/server";
import { createStaticClient } from "@/lib/db/static";
import { throwOnQueryError } from "@/lib/cache";
import { flattenLocales, CL_SELECT_LIST_WITH_AFFILIATE } from "@/lib/utils/content-locale";
import type { ContentType } from "@/types/database";
import HomeFeaturedReview from "./HomeFeaturedReview";

// UI 확인용 고정 공개 감상. 실제 후보 선정은 이 조회부를 교체해 연결한다.
const SAMPLE_REVIEW_ID = "c3ce3641-ad0d-49ba-bdfb-1e9ad388ecd3";
const SAMPLE_MIN_REVIEW_LENGTH = 400;

interface SampleRow {
  id: string;
  review: string;
  review_en: string | null;
  source_url: string | null;
  user: { id: string; slug: string | null; nickname: string; nickname_en: string | null; avatar_url: string | null };
  contents: { id: string; type: ContentType; content_locales: Parameters<typeof flattenLocales>[0] };
}

export default async function HomeFeaturedReviewSample() {
  const locale = await getLocale();
  const { data, error } = await createStaticClient()
    .from("celeb_contents")
    .select(
      "id, review, review_en, source_url, user:celebs!inner(id, slug, nickname, nickname_en, avatar_url), contents!inner(id, type, content_locales(" + CL_SELECT_LIST_WITH_AFFILIATE + ", isbn))"
    )
    .eq("id", SAMPLE_REVIEW_ID)
    .eq("visibility", "public")
    .eq("status", "FINISHED")
    .eq("is_spoiler", false)
    .eq("user.publication_status", "active")
    .maybeSingle();
  throwOnQueryError("홈 감상 샘플 조회", error);
  const row = data as unknown as SampleRow | null;
  const review = (locale === "en" ? row?.review_en : row?.review)?.trim();
  if (!row || !review || review.replace(/\s/g, "").length < SAMPLE_MIN_REVIEW_LENGTH) {
    const t = await getTranslations("home.featuredReview");
    return <p className="text-center text-sm text-text-secondary">{t("unavailable")}</p>;
  }
  const content = flattenLocales(row.contents.content_locales, locale, row.contents.type);
  return <HomeFeaturedReview key={row.id} item={{
    id: row.id,
    review,
    sourceUrl: row.source_url,
    figure: { id: row.user.id, slug: row.user.slug, name: locale === "en" ? row.user.nickname_en || row.user.nickname : row.user.nickname, avatarUrl: row.user.avatar_url },
    content: { id: row.contents.id, type: row.contents.type, title: content.title, creator: content.creator, thumbnailUrl: content.thumbnail_url, isbn: content.isbn, affiliateUrl: content.affiliate_url },
  }} />;
}
