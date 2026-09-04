/* ─────────────────────────────────────────────
 * [celeb 상세] 머리말 — SEO 메타데이터 조립
 * - 목차 위치: 머리말
 * - 데이터: getCelebBySlug, getFigureBooksForCeleb 서버액션
 * - 함께 보기: celebPageJsonLd.ts, page.tsx
 * ───────────────────────────────────────────── */
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getFigureBooksForCeleb, type FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import { getCelebBySlug, type CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { buildCelebDescription, buildCelebTitle, type CelebMetaInput } from "@/lib/celeb/meta";
import { getAlternates, getSeoImageUrl } from "@/lib/seo";
import { INDEXABLE_TIERS } from "@feelandnote/shared/constants/celeb-tiers";

export function createCelebMetaInput(
  profile: CelebBySlugProfile,
  sources: readonly FigureBookContent[] = [],
): CelebMetaInput {
  return {
    nickname: profile.nickname,
    title: profile.title,
    headline: profile.headline,
    headline_en: profile.headline_en,
    counts: profile.contentTypeCounts,
    tier: profile.celeb_tier ?? "full",
    reality: profile.celeb_reality ?? "REAL",
    quote: profile.quotes,
    bio: profile.bio,
    hasReading: Boolean(profile.reading),
    hasConnections: profile.relations.length > 0 || profile.factionTags.length > 0,
    sourceWorks: sources.map((source) => ({
      title: source.title,
      relationType: source.relationType,
    })),
  };
}

export async function buildCelebPageMetadata(
  locale: string,
  slug: string,
): Promise<Metadata> {
  const result = await getCelebBySlug(slug, locale);
  if (!result.success || !result.data) {
    const t = await getTranslations("celebPage");
    return { title: t("notFound") };
  }

  const profile = result.data;
  // 원전·등장 작품은 celeb_tier와 무관하게 모든 인물이 가질 수 있다. REAL이 아니면
  // (BOTH·FICTION) 실제 감상 기록이 얇으므로 원전 정보로 메타 설명을 보강한다.
  const sources = (profile.celeb_reality ?? "REAL") !== "REAL"
    ? await getFigureBooksForCeleb(profile.id, locale)
    : [];
  const metaInput = createCelebMetaInput(profile, sources);
  const title = buildCelebTitle(metaInput, locale);
  const description = buildCelebDescription(metaInput, locale);
  const seoLocale = locale === "en" ? "en" : "ko";
  const alternates = getAlternates(`/celeb/${slug}`, seoLocale);
  const imageUrl = getSeoImageUrl(
    "celeb",
    slug,
    seoLocale,
    profile.avatar_url ?? profile.photo_url,
  );
  const imageAlt = locale === "en"
    ? `${profile.nickname} portrait`
    : `${profile.nickname} 인물 이미지`;
  const isIndexable = INDEXABLE_TIERS.includes(profile.celeb_tier ?? "full");

  return {
    title,
    description,
    robots: { index: isIndexable, follow: true },
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      // 순수 전승(FICTION)만 website로 낮춘다. BOTH는 실존 핵심이 있으니 profile을 유지한다.
      type: profile.celeb_reality === "FICTION" ? "website" : "profile",
      images: [{
        url: imageUrl,
        width: 800,
        height: 800,
        type: "image/jpeg",
        alt: imageAlt,
      }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: [{ url: imageUrl, alt: imageAlt }],
    },
  };
}
