import type { JsonLdContentRow } from "@/actions/celebs/getCelebJsonLdData";
import type { FictionSourceContent } from "@/actions/fiction/getFictionSources";
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { getCountryNameByLocale } from "@/lib/countries";
import { getAlternates, getCreativeWorkCreatorJsonLd, getSeoImageUrl } from "@/lib/seo";
import { flattenLocales } from "@/lib/utils/content-locale";

interface BuildCelebPageJsonLdInput {
  profile: CelebBySlugProfile;
  slug: string;
  locale: string;
  pageTitle: string;
  contents: readonly JsonLdContentRow[];
  fictionSources: readonly FictionSourceContent[];
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
  fictionSources,
}: BuildCelebPageJsonLdInput): object {
  const seoLocale = locale === "en" ? "en" : "ko";
  const canonicalUrl = getAlternates(`/celeb/${slug}`, seoLocale).canonical;
  const personId = `${canonicalUrl}#person`;
  const isFiction = profile.celeb_tier === "fiction";
  const image = getSeoImageUrl(
    "celeb",
    slug,
    seoLocale,
    profile.avatar_url ?? profile.photo_url,
  );
  const wikidataQid = profile.wikidata_qid?.match(/^Q\d+$/)?.[0] ?? null;
  const alternateNames = [profile.nickname_ko, profile.nickname_en]
    .filter((name): name is string => Boolean(name && name !== profile.nickname));

  const sourceNodes = fictionSources.map((source) => {
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
    ...(wikidataQid && {
      identifier: wikidataQid,
      sameAs: `https://www.wikidata.org/wiki/${wikidataQid}`,
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
