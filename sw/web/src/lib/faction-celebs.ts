/**
 * 세력도감 테마의 인물 카드 자료 — 탐색 목록과 같은 카드 자료(CelebProfile)를 쓴다.
 *
 * 목록 조회의 테마 조건은 웹 배정 표를 보고 숨김 여부를 모른다(26.09.15 실측: 현직 K-pop 보이그룹은
 * 배정 165명 중 명단 1명, 홍길동전은 5명 중 1명). 그래서 받은 뒤 세력도감 명단(숨김 제외)에 든 사람만 남긴다.
 */
import { getCelebs } from '@/actions/home'
import { CELEB_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import type { CelebProfile } from '@/types/home'

/** URL 길이를 제한하는 조회 단위이며 전체 명단 인원 상한이 아니다. */
const FACTION_PROFILE_CHUNK_SIZE = 75

export async function getFactionCelebs(factionId: string, memberIds: readonly string[]): Promise<CelebProfile[]> {
  const visible = new Set(memberIds)
  if (visible.size === 0) return []
  const ids = [...visible]
  const profiles = new Map<string, CelebProfile>()
  for (let offset = 0; offset < ids.length; offset += FACTION_PROFILE_CHUNK_SIZE) {
    const chunk = ids.slice(offset, offset + FACTION_PROFILE_CHUNK_SIZE)
    const { celebs, error } = await getCelebs({
      ids: chunk,
      factionId,
      page: 1,
      limit: chunk.length,
      sortBy: 'influence',
      // 이야기 속 인물도 포함하고 전역 공개 상태 대신 DB의 숨김 제외 배정 명단을 따른다.
      realities: CELEB_REALITIES,
      includeInactive: true,
      includeTotal: false,
      includeViewerState: false,
    })
    if (error) throw new Error(error)
    const wanted = new Set(chunk)
    for (const celeb of celebs) {
      if (wanted.has(celeb.id)) profiles.set(celeb.id, celeb)
    }
  }
  if (profiles.size !== visible.size) throw new Error(`세력 구성원 프로필 누락: ${visible.size - profiles.size}명`)
  return [...visible].flatMap((id) => profiles.get(id) ?? [])
}
