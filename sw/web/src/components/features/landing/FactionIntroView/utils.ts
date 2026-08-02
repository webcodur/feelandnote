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
// 격자샷 최대 규모(3×3)까지 채울 수 있게 9명을 담는다
const PREVIEW_PEOPLE_LIMIT = 9;

function localized(value: string | null, fallback: string, locale: Locale) {
  return locale === "en" ? value ?? fallback : fallback;
}

/* 카드 얼굴은 단체샷만 쓴다 — 없으면 개인 한 명 대신 구성원 격자샷을 띄운다 */
function themeCover(tag: FeaturedTag) {
  return toTeamImages(tag.team_images)[0]?.url ?? null;
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

const UPCOMING_SECTION_COLOR = "#8a8378";

export function buildFactionCollection(
  tags: FeaturedTag[],
  locale: Locale,
  labels?: { upcoming: string }
): FactionCollectionData {
  /*
    섹션(선택대)은 출간된 최상위 태그만 세운다 — 미출간 태그가 저마다 빈 섹션이 되면
    골라도 아무것도 없는 화면만 나온다.
    미출간 태그는 감추는 대신 「준비 중」으로 보여준다:
    - 그룹에 속한 것은 제 섹션 안에서 준비 중 카드로 (childTags가 전체 tags를 받아 포함)
    - 소속 없는 것은 맨 뒤 「준비 중」 섹션 하나에 모아서
  */
  const featuredTop = tags.filter((tag) => tag.is_featured);
  const split = splitByFiction(featuredTop);
  const toFullSection = (entry: IndexedTag) => toSection(entry, tags, locale);
  const real = split.real.map(toFullSection).filter((s) => s.themes.length > 0);
  const fiction = split.fiction.map(toFullSection).filter((s) => s.themes.length > 0);

  const upcomingTop = tags
    .map((tag, idx) => ({ tag, idx }))
    .filter(({ tag }) => !tag.is_featured && !tag.parentSlug);
  if (upcomingTop.length > 0 && labels?.upcoming) {
    const themes = upcomingTop.map((entry) => toTheme(entry, locale));
    fiction.push({
      /* 진짜 태그가 아닌 묶음용 껍데기 — id만 고유하면 된다 */
      tag: {
        ...upcomingTop[0].tag,
        id: "__upcoming__",
        slug: null,
        color: UPCOMING_SECTION_COLOR,
        is_fiction: true,
        isGroup: true,
      },
      name: labels.upcoming,
      description: null,
      color: UPCOMING_SECTION_COLOR,
      themes,
      people: [],
      coverImages: [],
      totalCelebs: 0,
    });
  }

  const sections = [...real, ...fiction];
  const themes = sections.flatMap((section) => section.themes);
  /* 대표 화보·통계는 열람 가능한(출간된) 테마만 센다 */
  const featuredThemes = themes.filter((theme) => theme.tag.is_featured);
  const heroThemes = [
    ...featuredThemes.filter((theme) => theme.coverImage),
    ...featuredThemes.filter((theme) => !theme.coverImage),
  ].slice(0, HERO_THEME_LIMIT);

  return {
    real,
    fiction,
    heroThemes,
    totalThemes: featuredThemes.length,
    totalCelebs: sections.reduce((sum, section) => sum + section.totalCelebs, 0),
  };
}

export function factionThemeHref(theme: CollectionTheme) {
  return theme.tag.slug
    ? `/explore/faction/${theme.tag.slug}`
    : `/explore/faction?tag=${theme.tag.id}`;
}
