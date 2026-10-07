import { resolveCelebWorld, type CelebWorldInput } from "@/lib/celeb/world";
import { getHostedContentBannerImages } from "@/lib/contentBannerAssets";

export const BOOK_BANNER_THEMES = [
  "ancient-archive", "chinese-classics", "western-classics",
  "early-modern", "contemporary", "library",
] as const;
export type BookBannerTheme = typeof BOOK_BANNER_THEMES[number];

const CHINESE_CLASSICS = new Set(["warring-states-china", "han-china", "tang-song", "ming-qing"]);
const WESTERN_CLASSICS = new Set([
  "ancient-greece", "rome", "medieval-europe", "renaissance", "age-of-sail",
  "medieval-rus", "imperial-russia", "colonial-america",
]);
const HISTORICAL_READER_CUTOFF = 1750;
const CONTEMPORARY_BOOK_START = 1950;
const EARLY_MODERN_READER_CUTOFF = 1900;

function yearOf(value?: string | null): number | null {
  const match = value?.trim().match(/^-?\d{1,4}/);
  return match ? Number(match[0]) : null;
}

/** Reprints do not turn a book read by historical people into a contemporary work. */
export function resolveBookBannerTheme(readers: readonly CelebWorldInput[], releaseDate?: string | null): BookBannerTheme {
  const dated = readers.filter(reader => reader.reality !== "FICTION").flatMap(reader => {
    const year = yearOf(reader.birthDate) ?? yearOf(reader.deathDate);
    return year === null ? [] : [{ reader, year }];
  });
  const historical = dated.filter(({ year }) => year < HISTORICAL_READER_CUTOFF);
  if (historical.length) {
    const votes = { "chinese-classics": 0, "western-classics": 0, "ancient-archive": 0 };
    for (const { reader } of historical) {
      // BOTH can have a documented real life; FICTION was excluded above.
      const world = resolveCelebWorld({ ...reader, reality: "REAL" });
      if (CHINESE_CLASSICS.has(world)) votes["chinese-classics"]++;
      else if (WESTERN_CLASSICS.has(world)) votes["western-classics"]++;
      else votes["ancient-archive"]++;
    }
    const ranked = Object.entries(votes).sort((a, b) => b[1] - a[1]);
    return ranked[0][1] === ranked[1][1] ? "ancient-archive" : ranked[0][0] as BookBannerTheme;
  }
  const releaseYear = yearOf(releaseDate);
  if (releaseYear !== null && releaseYear < HISTORICAL_READER_CUTOFF) return "ancient-archive";
  if (releaseYear !== null && releaseYear >= CONTEMPORARY_BOOK_START) return "contemporary";
  if (releaseYear !== null || dated.some(({ year }) => year < EARLY_MODERN_READER_CUTOFF)) return "early-modern";
  return "library";
}

export function getBookBannerImages(theme: BookBannerTheme) {
  return getHostedContentBannerImages(theme);
}
