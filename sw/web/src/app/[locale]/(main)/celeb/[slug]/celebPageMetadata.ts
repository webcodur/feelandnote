/* ─────────────────────────────────────────────
 * [celeb 상세] 머리말 — SEO 메타데이터 조립
 * - 목차 위치: 머리말
 * - 데이터: getCelebBySlug, getFigureBooksForCeleb, getCelebSignatureWorks, getCelebSidePresence
 * - 함께 보기: celebPageJsonLd.ts, page.tsx, lib/celeb/meta.ts(문구 규칙)
 * ───────────────────────────────────────────── */
import type { Metadata } from "next";

import { getCelebSidePresence, type CelebSidePresence } from "@/actions/celebs/getCelebSidePresence";
import { getCelebSignatureWorks } from "@/actions/celebs/getCelebSignatureWorks";
import { getFigureBooksForCeleb, type FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { getCelebRouteProfile } from "@/lib/profile-route";
import {
  buildCelebDescription,
  buildCelebTitle,
  rankRecordTypes,
  type CelebMetaInput,
} from "@/lib/celeb/meta";
import { getAlternates, getSeoImageUrl } from "@/lib/seo";
import { getCelebProfileUrl } from "@/lib/url";
import { INDEXABLE_TIERS } from "@feelandnote/shared/constants/celeb-tiers";

interface CelebMetaExtras {
  sources?: readonly FigureBookContent[];
  signatureWorks?: readonly string[];
  sidePresence?: CelebSidePresence;
}

export function createCelebMetaInput(
  profile: CelebBySlugProfile,
  { sources = [], signatureWorks = [], sidePresence }: CelebMetaExtras = {},
): CelebMetaInput {
  // 영문 화면에서 한국어로 대체된 글은 설명문에 싣지 않는다.
  const fallbacks = new Set(profile.translationFallbacks ?? []);
  return {
    nickname: profile.nickname,
    title: profile.title,
    headline: profile.headline,
    headline_en: profile.headline_en,
    counts: profile.contentTypeCounts,
    tier: profile.celeb_tier ?? "full",
    reality: profile.celeb_reality ?? "REAL",
    guide: fallbacks.has("personGuide") ? null : profile.reading?.guide ?? null,
    bio: fallbacks.has("bio") ? null : profile.bio,
    hasConnections: profile.relations.length > 0 || profile.factions.length > 0,
    hasInfluence: sidePresence?.influence ?? false,
    hasSpectrum: sidePresence?.spectrum ?? false,
    sourceWorks: sources.map((source) => ({
      title: source.title,
      relationType: source.relationType,
    })),
    signatureWorks,
  };
}

export async function buildCelebPageMetadata(
  locale: string,
  slug: string,
): Promise<Metadata> {
  const profile = await getCelebRouteProfile(slug, locale);
  const reality = profile.celeb_reality ?? "REAL";
  const tier = profile.celeb_tier ?? "full";
  const leadType = rankRecordTypes(profile.contentTypeCounts)[0];
  // 셋 다 본문 렌더가 같은 키로 읽거나(가용도·원전) 인물 태그로 묶인 캐시라 추가 DB 부담이 작다.
  const [sources, signatureWorks, sidePresence] = await Promise.all([
    // 원전·등장 작품은 celeb_tier와 무관하게 모든 인물이 가질 수 있다. REAL이 아니면
    // (BOTH·FICTION) 실제 감상 기록이 얇으므로 원전 정보로 제목·설명을 세운다.
    reality !== "REAL" ? getFigureBooksForCeleb(profile.id, locale) : Promise.resolve([]),
    // 감상 기록으로 설명을 세우는 인물만 대표작을 고른다.
    tier === "full" && reality === "REAL" && leadType
      ? getCelebSignatureWorks(profile.id, leadType, locale)
      : Promise.resolve([]),
    // 실존 light 설명문이 실제로 있는 분석만 말하게 한다.
    reality === "REAL" && tier === "light"
      ? getCelebSidePresence({ celebId: profile.id, reality })
      : Promise.resolve(undefined),
  ]);
  const metaInput = createCelebMetaInput(profile, { sources, signatureWorks, sidePresence });
  const title = buildCelebTitle(metaInput, locale);
  const description = buildCelebDescription(metaInput, locale);
  const seoLocale = locale === "en" ? "en" : "ko";
  const alternates = getAlternates(getCelebProfileUrl({ slug }), seoLocale);
  const imageUrl = getSeoImageUrl(
    "celeb",
    slug,
    seoLocale,
    profile.avatar_url ?? profile.photo_url,
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
