/* ─────────────────────────────────────────────
 * [celeb 상세] 머리말 — 구조화 데이터(JSON-LD) 조립
 * - 목차 위치: 머리말
 * - 데이터: profile/contents/figureBooks/externalLinks props
 * - 함께 보기: celebPageMetadata.ts, page.tsx
 * ───────────────────────────────────────────── */
import type { JsonLdContentRow } from "@/actions/celebs/getCelebJsonLdData";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { getCountryNameByLocale } from "@/lib/countries";
import { getAlternates, getCreativeWorkCreatorJsonLd, getSeoImageUrl } from "@/lib/seo";
import { flattenLocales } from "@/lib/utils/content-locale";
import type { CelebExternalLink } from "@/types/celebExternalLinks";

interface BuildCelebPageJsonLdInput {
  profile: CelebBySlugProfile;
  slug: string;
  locale: string;
  pageTitle: string;
  contents: readonly JsonLdContentRow[];
  figureBooks: readonly FigureBookContent[];
  externalLinks: readonly CelebExternalLink[];
}

function schemaType(type: string): string {
  if (type === "BOOK") return "Book";
  if (type === "VIDEO") return "Movie";
  if (type === "MUSIC") return "MusicRecording";
  if (type === "GAME") return "VideoGame";
  return "CreativeWork";
}

export function buildCelebPageJsonLd({
  profile,
  slug,
  locale,
  pageTitle,
  contents,
  figureBooks,
  externalLinks,
}: BuildCelebPageJsonLdInput): object {
  const seoLocale = locale === "en" ? "en" : "ko";
  const canonicalUrl = getAlternates(`/celeb/${slug}`, seoLocale).canonical;
  const personId = `${canonicalUrl}#person`;
  // 순수 전승(FICTION)만 실존 사실 필드를 뺀다. BOTH는 실존 핵심이 있으니 그대로 싣는다.
  const isFiction = profile.celeb_reality === "FICTION";
  const image = getSeoImageUrl(
    "celeb",
    slug,
    seoLocale,
    profile.avatar_url ?? profile.photo_url,
  );
  const wikidataQid = profile.wikidata_qid?.match(/^Q\d+$/)?.[0] ?? null;
  const alternateNames = [profile.nickname_ko, profile.nickname_en]
    .filter((name): name is string => Boolean(name && name !== profile.nickname));

  // 넓은 분야 연관 도서는 이 인물의 저작·등장 작품이라는 구조화 주장을 하지 않는다.
  const sourceNodes = figureBooks
    .filter((source) => source.relationType === "appearance")
    .map((source) => {
      const workUrl = getAlternates(`/content/${source.id}`, seoLocale).canonical;
      return {
        "@type": schemaType(source.type),
        "@id": `${workUrl}#creative-work`,
        name: source.title,
        url: workUrl,
        ...getCreativeWorkCreatorJsonLd(source.type, source.creator),
        character: { "@id": personId },
      };
    });

  const person = {
    "@type": "Person",
    "@id": personId,
    name: profile.nickname,
    ...(alternateNames.length > 0 && { alternateName: alternateNames }),
    ...(profile.title && { disambiguatingDescription: profile.title }),
    ...(profile.bio && { description: profile.bio }),
    ...(!isFiction && profile.nationality && {
      nationality: getCountryNameByLocale(profile.nationality, locale),
    }),
    ...(!isFiction && profile.profession && {
      jobTitle: getCelebProfessionLabel(profile.profession, locale),
    }),
    ...(!isFiction && profile.birth_date && { birthDate: profile.birth_date }),
    ...(!isFiction && profile.death_date && { deathDate: profile.death_date }),
    ...(wikidataQid && { identifier: wikidataQid }),
    ...(externalLinks.length > 0 && {
      sameAs: externalLinks.map((link) => link.url),
    }),
    ...(sourceNodes.length > 0 && {
      subjectOf: sourceNodes.map((source) => ({ "@id": source["@id"] })),
    }),
    url: canonicalUrl,
    mainEntityOfPage: canonicalUrl,
    image,
  };

  const contentItems = contents.map((rawContent, index) => {
    const flat = flattenLocales(rawContent.content_locales, locale);
    return {
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": schemaType(rawContent.type),
        name: flat.title,
        url: getAlternates(`/content/${rawContent.id}`, seoLocale).canonical,
        ...getCreativeWorkCreatorJsonLd(rawContent.type, flat.creator),
      },
    };
  });

  const graph: object[] = [person, ...sourceNodes];
  if (contentItems.length > 0) {
    graph.push({
      "@type": "ItemList",
      name: pageTitle,
      numberOfItems: contentItems.length,
      about: { "@id": personId },
      itemListElement: contentItems,
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export function serializeJsonLd(value: object): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
