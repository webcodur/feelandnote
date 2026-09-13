/**
 * 인물 주소는 항상 인물 전용 경로를 쓴다.
 * slug가 없는 옛 기록은 서버가 ID를 정본 slug로 해석한다.
 */
export function getCelebProfileUrl(target:
  | { id: string; slug?: string | null }
  | { id?: string; slug: string }
): string {
  const identifier = target.slug || target.id;
  if (!identifier) throw new Error('인물 주소에 slug 또는 ID가 필요합니다.');
  return `/celeb/${encodeURIComponent(identifier)}`;
}

export function isProfileId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
