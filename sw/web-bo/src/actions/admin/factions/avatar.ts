'use server'

/**
 * 팩션 개인샷 → 셀럽 얼굴 사진(아바타) 승격.
 *
 * 문서 §4 의 경계는 「`celebs` 불가침」이다. 그 예외는 **사람이 버튼으로 한 명씩 명시 실행할 때만**이라,
 * 이 액션은 인물 하나만 받는다(일괄 경로 없음). 출간 패널의 「얼굴 사진 없음」 인물 행에서 부른다.
 *
 * 재료가 렌더 저장소(sw/remotion/public/factions/)의 로컬 사진이라 `FACTION_LOCAL=1` 이 필요하다.
 * 이 파일은 **사람 확인·환경 점검·캐시 비우기만** 한다. 절차는 `lib/faction-avatar-promote` 소유다.
 */

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { factionAdminClient, requireFactionAdmin } from '@/lib/faction-db'
import { assertFactionLocal } from '@/lib/faction-local'
import { promoteSoloShotToAvatar, type FactionAvatarPromoteResult } from '@/lib/faction-avatar-promote'
import { revalidateWebCache } from '@/lib/revalidate-web'

/**
 * @param folder   에피소드 폴더명
 * @param personId faction_people.id
 * @param force    이미 얼굴 사진이 있어도 갈아치운다
 */
export async function promoteFactionAvatar(
  folder: string, personId: string, force = false,
): Promise<FactionAvatarPromoteResult> {
  await requireFactionAdmin()
  assertFactionLocal()

  const r = await promoteSoloShotToAvatar(factionAdminClient(), { folder, personId, force })

  // 얼굴 사진은 셀럽 화면·도감 목록이 함께 쓴다
  await revalidateWebCache([CACHE_TAGS.CELEBS])
  return r
}
