/** 독서 방식은 REAL·BOTH의 최초 1회 조사 요건이며, 본문 보유 요건이 아니다. */
export function hasCompletedReadingWayResearch(profile: {
  celeb_reality?: unknown
  reading_way?: unknown
  reading_way_en?: unknown
}): boolean {
  if (profile.celeb_reality === 'FICTION') return true
  if (profile.celeb_reality !== 'REAL' && profile.celeb_reality !== 'BOTH') return false
  if (profile.reading_way === '' && profile.reading_way_en === '') return true
  return typeof profile.reading_way === 'string' && profile.reading_way.trim().length > 0
}
