'use server'

/**
 * 보이스 음량 내려보내기 — 보이스 도감의 추가 음량을 그 보이스를 쓰는 인물들에게 복사한다.
 *
 * 음량은 보이스 자체의 성질이라 도감(보이스 단위)에 한 번만 적어 두지만, **렌더는 도감을 모르고
 * 대본 파일의 인물 값만 읽는다.** 내보내기가 도감을 참조해 파일에 끼워 넣으면 DB에 없는 값이 생겨
 * 왕복 검증이 깨지므로, 값을 인물 데이터에 명시적으로 복사하는 이 경로를 쓴다.
 *
 * 이 파일은 **사람 확인과 자동 내보내기 연결만** 한다. 절차는 `lib/faction-voice-gain` 소유다.
 */

import { factionAdminClient, requireFactionAdmin } from '@/lib/faction-db'
import { FACTION_LOCAL } from '@/lib/faction-local'
import { applyVoiceGainToPeople, type FactionVoiceGainResult } from '@/lib/faction-voice-gain'
import { exportFactionEpisode, type FactionExportResult } from './export'

export interface ApplyVoiceGainResult extends FactionVoiceGainResult {
  /** 손댄 편마다의 자동 내보내기 결과 — 렌더 저장소가 연결되지 않았으면 없음 */
  exported?: FactionExportResult[]
}

/**
 * @param voiceId        ElevenLabs 보이스 ID
 * @param gainDb         내려보낼 도감 음량. 비우면 대상 인물의 음량 칸을 지운다
 * @param previousGainDb 고치기 직전의 도감 값 — 이 값을 그대로 쓰던 인물도 함께 바꾼다
 * @param dryRun         켜면 아무것도 쓰지 않고 명단만 돌려준다
 */
export async function applyFactionVoiceGain(
  voiceId: string,
  gainDb?: number,
  previousGainDb?: number,
  dryRun = false,
): Promise<ApplyVoiceGainResult> {
  await requireFactionAdmin()
  if (!voiceId) throw new Error('보이스를 지정해야 합니다')

  const r = await applyVoiceGainToPeople(factionAdminClient(), { voiceId, gainDb, previousGainDb, dryRun })

  // 렌더·음성·자막·유튜브는 전부 faction-data.json 을 읽는다 — 손댄 편은 파일도 맞춘다
  const result: ApplyVoiceGainResult = { ...r }
  if (!dryRun && r.applied && FACTION_LOCAL) {
    result.exported = []
    for (const folder of r.folders) {
      result.exported.push(await exportFactionEpisode(folder))
    }
  }
  return result
}
