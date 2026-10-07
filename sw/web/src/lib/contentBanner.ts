import type { ContentType } from "@/types/database";
import type { ContentMetadata } from "@/types/content";
import { getBookBannerImages, type BookBannerTheme } from "@/lib/books/bookBanner";
import { getHostedContentBannerImages } from "@/lib/contentBannerAssets";

const MEDIA_BANNER_THEMES = { VIDEO: "cinema", GAME: "game", MUSIC: "music" } as const;
export const GENRE_BANNER_THEMES = [
  "fantasy", "science-fiction", "suspense", "horror", "historical", "documentary",
  "animation", "romance", "strategy", "racing", "sports",
  "classical", "jazz", "live", "electronic", "acoustic",
] as const;
export type MediaBannerTheme = typeof MEDIA_BANNER_THEMES[keyof typeof MEDIA_BANNER_THEMES] | typeof GENRE_BANNER_THEMES[number];

// 먼저 나온 규칙이 이긴다. 판타지+드라마가 드라마 기본 배너에 묻히지 않게 구체적인 장르부터 둔다.
const GENRE_RULES: Record<Exclude<ContentType, "BOOK">, readonly (readonly [MediaBannerTheme, RegExp])[]> = {
  VIDEO: [
    ["animation", /animation|애니메이션|키즈|\bkids\b/],
    ["science-fiction", /sci[ -]?fi|science fiction|\bsf\b|공상과학/],
    ["fantasy", /fantasy|판타지/],
    ["horror", /horror|공포/],
    ["historical", /history|historical|war|western|역사|시대극|전쟁|서부/],
    ["suspense", /thriller|mystery|crime|action|스릴러|미스터리|범죄|액션/],
    ["documentary", /documentary|다큐멘터리/],
    ["romance", /romance|romantic|drama|comedy|로맨스|멜로|드라마|코미디/],
  ],
  GAME: [
    ["racing", /racing|레이싱|경주/],
    ["sports", /\bsports?\b|스포츠/],
    ["strategy", /strategy|tactical|moba|전략|전술/],
    ["animation", /puzzle|platform|card & board|quiz|퍼즐|플랫포머|보드|퀴즈/],
    ["science-fiction", /sci[ -]?fi|science fiction|\bsf\b/],
    ["horror", /horror|공포/],
    ["suspense", /shooter|fighting|hack and slash|슈터|격투/],
    ["fantasy", /role.playing|\brpg\b|fantasy|adventure|롤플레잉|판타지|모험/],
    ["electronic", /music|rhythm|음악|리듬/],
    ["romance", /visual novel|비주얼 노벨/],
  ],
  MUSIC: [
    ["jazz", /jazz|재즈|bossa nova/],
    ["classical", /classical|klassik|클래식|opera|오페라/],
    ["acoustic", /folk|country|singer.songwriter|acoustic|포크|컨트리|싱어송라이터|어쿠스틱/],
    ["electronic", /electronic|dance|techno|house|\bedm\b|hip.hop|\brap\b|일렉트로닉|전자|댄스|힙합|랩/],
    ["live", /rock|metal|punk|alternative|\bpop\b|r&b|soul|funk|록|락|메탈|펑크|얼터너티브|팝|소울/],
  ],
};

/** 언어를 타는 표시용 장르가 제거되기 전에도 계산해 국문·영문 배너를 동일하게 유지한다. */
export function resolveMediaBannerTheme(type: ContentType, metadata?: ContentMetadata | null): MediaBannerTheme | undefined {
  if (type === "BOOK") return undefined;
  const genres = [...(Array.isArray(metadata?.genres) ? metadata.genres : []), metadata?.genre]
    .filter((genre): genre is string => typeof genre === "string").map(genre => genre.toLowerCase()).join(" | ");
  return GENRE_RULES[type].find(([, pattern]) => pattern.test(genres))?.[0] ?? MEDIA_BANNER_THEMES[type];
}

/** 배너에는 가로 배경만 사용한다. 포스터·음반 표지는 별도 표지 칸에 남긴다. */
export function getContentBannerImages(type: ContentType, bookTheme: BookBannerTheme = "library", mediaTheme?: MediaBannerTheme) {
  if (type === "BOOK") return { ...getBookBannerImages(bookTheme), theme: bookTheme };
  const theme = mediaTheme ?? MEDIA_BANNER_THEMES[type];
  return { ...getHostedContentBannerImages(theme), theme };
}

export function getContentBannerArtwork(type: ContentType, metadata?: ContentMetadata | null): string | null {
  const candidates = type === "VIDEO" ? [metadata?.backdropUrl]
    : type === "GAME" ? metadata?.screenshots ?? [] : [];
  return candidates.find(url => typeof url === "string" && url.trim())?.trim() ?? null;
}
