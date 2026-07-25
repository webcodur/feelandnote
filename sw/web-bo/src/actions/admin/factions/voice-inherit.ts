'use server'

/**
 * 대사 목소리 일괄 상속 — 셀럽 프로필의 국문 목소리를 인물 대사 설정으로 내려 채운다.
 *
 * 방향은 셀럽 → 제작 **한 방향, 빈 칸만**이다. 이미 목소리가 지정된 인물은 손대지 않는다 —
 * 편에 맞춰 사람이 고른 배역을 프로필 기본값으로 되돌리면 안 된다.
 * (한 명씩 덮어쓰는 자리는 인물 음성 화면의 「DB에서 가져오기」다.)
 *
 * 이 파일은 **사람 확인과 자동 내보내기 연결만** 한다. 실제 절차는 `lib/faction-voice-inherit` 소유다 —
 * 액션 안에 로직을 두면 Next 밖에서 부를 수 없어 검증이 불가능하다.
 */

import { factionAdminClient, requireFactionAdmin } from '@/lib/faction-db'
import { FACTION_LOCAL } from '@/lib/faction-local'
import {
  inheritVoicesFromProfiles, type FactionVoiceInheritResult,
} from '@/lib/faction-voice-inherit'
import { exportFactionEpisode, type FactionExportResult } from './export'

export interface InheritFactionVoicesResult extends FactionVoiceInheritResult {
  /** 자동 내보내기 결과 — 렌더 저장소가 연결되지 않았거나 채운 게 없으면 없음 */
  exported?: FactionExportResult
}

/**
 * @param folder 에피소드 폴더명
 * @param dryRun 켜면 쓰기 직전까지 똑같이 계산하고 명단만 돌려준다
 */
export async function inheritFactionVoices(
  folder: string, dryRun = false,
): Promise<InheritFactionVoicesResult> {
  await requireFactionAdmin()
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')

  const r = await inheritVoicesFromProfiles(factionAdminClient(), folder, { dryRun })

  // 렌더·음성·자막·유튜브는 전부 faction-data.json 을 읽는다(문서 §6) — 채웠으면 파일도 맞춘다
  const result: InheritFactionVoicesResult = { ...r }
  if (!dryRun && r.filled && FACTION_LOCAL) {
    result.exported = await exportFactionEpisode(folder)
  }
  return result
}
