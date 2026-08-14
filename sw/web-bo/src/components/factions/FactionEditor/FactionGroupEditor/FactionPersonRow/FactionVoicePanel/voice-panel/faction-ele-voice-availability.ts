export type FactionEleVoiceAvailability = 'loading' | 'missing' | 'available' | 'unavailable'

/**
 * 이미 받아 둔 ElevenLabs 보이스 목록으로 현재 배정값의 경고 상태를 판별한다.
 * 목록 로드 전에는 오래된 ID라고 단정하지 않아 화면 진입 순간의 오경고를 막는다.
 * 생성 허용 여부는 서버가 연결 계정 전체를 조회해 최종 판정한다.
 */
export function factionEleVoiceAvailability(
  voiceId: string,
  catalogLoaded: boolean,
  availableVoiceIds: readonly string[],
): FactionEleVoiceAvailability {
  if (!voiceId.trim()) return 'missing'
  if (!catalogLoaded) return 'loading'
  return availableVoiceIds.includes(voiceId) ? 'available' : 'unavailable'
}
