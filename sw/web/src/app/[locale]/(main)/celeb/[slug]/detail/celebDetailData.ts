import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import type { Locale } from "@/types/locale";

import type { CelebVideoItem } from "../VideosSection";

function formatYear(year: string | null | undefined) {
  if (!year) return "";

  const numericYear = Number.parseInt(year, 10);
  if (Number.isNaN(numericYear)) return year;
  return numericYear < 0 ? `BC ${Math.abs(numericYear)}` : `${numericYear}`;
}

export function formatCelebPeriod(
  birthDate: string | null | undefined,
  deathDate: string | null | undefined,
) {
  const birthYear = formatYear(birthDate);
  if (!birthYear) return "";

  // 살아 있는 사람에게 줄표만 매달아 두면 뒤가 잘린 것처럼 보인다.
  // 생존 여부는 옆의 나이 표시가 이미 알려 준다
  const deathYear = deathDate ? formatYear(deathDate) : "";
  return deathYear ? `${birthYear} — ${deathYear}` : birthYear;
}

export function getLocalizedCelebVideos(
  videos: CelebBySlugProfile["youtube_videos"],
  locale: Locale,
) {
  const youtubeVideos = videos ?? {};
  const longformKey = `${locale}-longform`;
  const longform: CelebVideoItem[] = youtubeVideos[longformKey]
    ? [{ videoId: youtubeVideos[longformKey].videoId }]
    : [];

  const shortsPrefix = `${locale}-shorts-`;
  const shorts: CelebVideoItem[] = Object.entries(youtubeVideos)
    .filter(([key]) => key.startsWith(shortsPrefix))
    .sort(([left], [right]) => {
      const leftIndex = Number.parseInt(left.slice(shortsPrefix.length), 10) || 0;
      const rightIndex = Number.parseInt(right.slice(shortsPrefix.length), 10) || 0;
      return leftIndex - rightIndex;
    })
    .map(([, value]) => ({ videoId: value.videoId }));

  return { longform, shorts };
}
