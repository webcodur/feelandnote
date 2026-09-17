/**
 * 세력도감 테마의 인물 카드 자료 — 탐색 목록과 같은 카드 자료(CelebProfile)를 쓴다.
 *
 * 목록 조회의 테마 조건은 웹 배정 표를 보고 숨김 여부를 모른다(26.09.15 실측: 현직 K-pop 보이그룹은
 * 배정 165명 중 명단 1명, 홍길동전은 5명 중 1명). 그래서 받은 뒤 세력도감 명단(숨김 제외)에 든 사람만 남긴다.
 */
import { getCelebs } from '@/actions/home'
import { CELEB_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import type { CelebProfile } from '@/types/home'

/** 한 테마 배정을 숨긴 사람까지 한 번에 받는 천장 — 여기서 잘리면 명단 인물이 조용히 빠진다 */
const FACTION_ASSIGNMENT_LIMIT = 300

export async function getFactionCelebs(factionId: string, memberIds: readonly string[]): Promise<CelebProfile[]> {
  const { celebs } = await getCelebs({
    factionId,
    limit: FACTION_ASSIGNMENT_LIMIT,
    sortBy: 'influence',
    // 이야기 속 인물 테마(역사창작 등)도 싣는다 — 탐색 기본값은 실존 인물만 보여 준다
    realities: CELEB_REALITIES,
    includeTotal: false,
    includeViewerState: false,
  })
  const visible = new Set(memberIds)
  return celebs.filter((celeb) => visible.has(celeb.id))
}
