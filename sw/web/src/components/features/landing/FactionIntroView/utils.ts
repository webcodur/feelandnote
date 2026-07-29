import { toTeamImages } from "@feelandnote/shared/lib/faction-team-image";
import type { FeaturedCeleb, FeaturedTag } from "@/actions/home";
import type { Locale } from "@/types/locale";
import { childTags, splitByFiction, type IndexedTag } from "../factionGrouping";
import type {
  CollectionSection,
  CollectionTheme,
  FactionCollectionData,
} from "./types";

const HERO_THEME_LIMIT = 3;
const PREVIEW_PEOPLE_LIMIT = 8;

function localized(value: string | null, fallback: string, locale: Locale) {
  return locale === "en" ? value ?? fallback : fallback;
}

function themeCover(tag: FeaturedTag) {
  const teamImage = toTeamImages(tag.team_images)[0]?.url;
  const spotlight = tag.celebs.find((celeb) => celeb.spotlight_image_url)?.spotlight_image_url;
  const avatar = tag.celebs.find((celeb) => celeb.avatar_url)?.avatar_url;
  return teamImage ?? spotlight ?? avatar ?? null;
}

function toTheme(entry: IndexedTag, locale: Locale): CollectionTheme {
  const { tag, idx } = entry;
  return {
    tag,
    index: idx,
    name: localized(tag.name_en, tag.name, locale),
    description: localized(tag.description_en, tag.description ?? "", locale) || null,
    coverImage: themeCover(tag),
    people: tag.celebs.slice(0, PREVIEW_PEOPLE_LIMIT),
  };
}

function uniquePeople(themes: CollectionTheme[]) {
  const seen = new Set<string>();
  const people: FeaturedCeleb[] = [];
  for (const theme of themes) {
    for (const celeb of theme.tag.celebs) {
      if (seen.has(celeb.id)) continue;
      seen.add(celeb.id);
      people.push(celeb);
      if (people.length >= PREVIEW_PEOPLE_LIMIT) return people;
    }
  }
  return people;
}

function toSection(entry: IndexedTag, tags: FeaturedTag[], locale: Locale): CollectionSection {
  const { tag } = entry;
  const entries = tag.isGroup ? childTags(tags, tag.slug ?? "") : [entry];
  const themes = entries.map((item) => toTheme(item, locale));
  const coverImages = [...new Set(themes.map((theme) => theme.coverImage).filter(Boolean))]
    .slice(0, HERO_THEME_LIMIT) as string[];

  return {
    tag,
    name: localized(tag.name_en, tag.name, locale),
    description: localized(tag.description_en, tag.description ?? "", locale) || null,
    color: tag.color,
    themes,
    people: uniquePeople(themes),
    coverImages,
    totalCelebs: themes.reduce((sum, theme) => sum + theme.tag.celebs.length, 0),
  };
}

export function buildFactionCollection(
  tags: FeaturedTag[],
  locale: Locale
): FactionCollectionData {
  const split = splitByFiction(tags);
  const real = split.real.map((entry) => toSection(entry, tags, locale));
  const fiction = split.fiction.map((entry) => toSection(entry, tags, locale));
  const sections = [...real, ...fiction];
  const themes = sections.flatMap((section) => section.themes);
  const heroThemes = [
    ...themes.filter((theme) => theme.coverImage),
    ...themes.filter((theme) => !theme.coverImage),
  ].slice(0, HERO_THEME_LIMIT);

  return {
    real,
    fiction,
    heroThemes,
    totalThemes: themes.length,
    totalCelebs: sections.reduce((sum, section) => sum + section.totalCelebs, 0),
  };
}

export function factionThemeHref(theme: CollectionTheme) {
  return theme.tag.slug
    ? `/explore/faction/${theme.tag.slug}`
    : `/explore/faction?tag=${theme.tag.id}`;
}
