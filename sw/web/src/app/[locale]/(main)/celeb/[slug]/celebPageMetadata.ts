/* ─────────────────────────────────────────────
 * [celeb 상세] 머리말 — SEO 메타데이터 조립
 * - 목차 위치: 머리말
 * - 데이터: getCelebBySlug, headline 누락 시 getFigureBooksForCeleb
 * - 함께 보기: celebPageJsonLd.ts, page.tsx, lib/celeb/meta.ts(문구 규칙)
 * ───────────────────────────────────────────── */
import type { Metadata } from "next";

import { getFigureBooksForCeleb, type FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { getCelebRouteProfile } from "@/lib/profile-route";
import {
  buildCelebDescription,
  buildCelebTitle,
  rankSourceWork,
  type CelebMetaInput,
} from "@/lib/celeb/meta";
import { getAlternates, getSeoImageUrl, SITE_NAME } from "@/lib/seo";
import { getCelebProfileUrl } from "@/lib/url";
import { INDEXABLE_TIERS } from "@feelandnote/shared/constants/celeb-tiers";

interface CelebMetaExtras {
  sources?: readonly FigureBookContent[];
}

export function createCelebMetaInput(
  profile: CelebBySlugProfile,
  { sources = [] }: CelebMetaExtras = {},
): CelebMetaInput {
  // 영문 화면에서 한국어로 대체된 글은 설명문에 싣지 않는다.
  const fallbacks = new Set(profile.translationFallbacks ?? []);
  return {
    nickname: profile.nickname,
    title: profile.title,
    headline: profile.headline,
    headline_en: profile.headline_en,
    counts: profile.contentTypeCounts,
    guide: fallbacks.has("personGuide") ? null : profile.reading?.guide ?? null,
    bio: fallbacks.has("bio") ? null : profile.bio,
    sourceWorks: sources.map((source) => ({
      title: source.title,
      relationType: source.relationType,
      sourceRank: rankSourceWork(source),
    })),
  };
}

export async function buildCelebPageMetadata(
  locale: string,
  slug: string,
): Promise<Metadata> {
  const profile = await getCelebRouteProfile(slug, locale);
  const tier = profile.celeb_tier ?? "full";
  const hasRecords = Object.values(profile.contentTypeCounts).some((count) => count > 0);
  // 등장 작품은 감상으로 세지 않는다. headline이 없는 무감상 인물의 제목 보완에만 조회한다.
  const sources = !hasRecords && !profile.headline?.trim()
    ? await getFigureBooksForCeleb(profile.id, locale)
    : [];
  const metaInput = createCelebMetaInput(profile, { sources });
  const title = buildCelebTitle(metaInput, locale);
  const description = buildCelebDescription(metaInput, locale);
  const seoLocale = locale === "en" ? "en" : "ko";
  const alternates = getAlternates(getCelebProfileUrl({ slug }), seoLocale);
  const imageUrl = getSeoImageUrl(
    "celeb",
    slug,
    seoLocale,
    profile.photo_url ?? profile.avatar_url,
  );
  const imageAlt = locale === "en"
    ? `${profile.nickname} portrait`
    : `${profile.nickname} 인물 이미지`;
  const isIndexable = INDEXABLE_TIERS.includes(tier);

  return {
    // 브랜드 접미사를 붙이지 않는다. 사이트 이름은 Google이 홈페이지에서 정하고(ops-02-seo.md
    // 「인물 상세 메타데이터」), 접미사 폭은 누군지 알리는 수식어와 건수에 쓴다.
    title: { absolute: title },
    description,
    robots: { index: isIndexable, follow: true },
    alternates,
    // 자기 그림이 있어 openGraph를 통째로 선언한다 — 레이아웃 값을 덮으므로 사이트명도 함께 싣는다
    openGraph: {
      siteName: SITE_NAME,
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
