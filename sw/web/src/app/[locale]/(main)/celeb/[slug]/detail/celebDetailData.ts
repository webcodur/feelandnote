/* ─────────────────────────────────────────────
 * [celeb 상세] videos — 로케일별 영상 선별 유틸
 * - 목차 위치: media > videos
 * - 데이터: profile.youtube_videos, locale
 * - 함께 보기: detail/useCelebServiceModel.ts, VideosSection.tsx
 * ───────────────────────────────────────────── */
import type { CelebBySlugProfile } from "@/actions/user/getCelebBySlug";
import { formatCelebPeriod } from "@/lib/utils/celeb-period";
import type { Locale } from "@/types/locale";

import type { CelebVideoItem } from "../VideosSection";

// 생몰 표기는 이름 대조 후보 목록과 함께 쓰므로 공용 유틸에 둔다
export { formatCelebPeriod };

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
