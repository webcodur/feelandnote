/**
 * 셀럽/유저 프로필 URL 생성 유틸
 * - 셀럽 + slug 있음 → /celeb/{slug}
 * - 그 외 → /{id}
 */
export function getCelebProfileUrl(target: {
  id: string;
  slug?: string | null;
}): string {
  if (target.slug) {
    return `/celeb/${target.slug}`;
  }
  return `/${target.id}`;
}
