import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getFictionSourcesForCeleb, type FictionSourceContent } from "@/actions/fiction/getFictionSources";
import { getCelebBySlug, type CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { buildCelebDescription, buildCelebTitle, type CelebMetaInput } from "@/lib/celeb/meta";
import { getAlternates, getSeoImageUrl } from "@/lib/seo";
import { INDEXABLE_TIERS } from "@feelandnote/shared/constants/celeb-tiers";

export function createCelebMetaInput(
  profile: CelebBySlugProfile,
  sources: readonly FictionSourceContent[] = [],
): CelebMetaInput {
  return {
    nickname: profile.nickname,
    title: profile.title,
    headline: profile.headline,
    headline_en: profile.headline_en,
    counts: profile.contentTypeCounts,
    tier: profile.celeb_tier ?? "full",
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
  const sources = profile.celeb_tier === "fiction"
    ? await getFictionSourcesForCeleb(profile.id, locale)
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
      type: profile.celeb_tier === "fiction" ? "website" : "profile",
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
