/**
 * 팩션 음성 제공자 판정의 단일 원천.
 *
 * 제공자는 영속하지 않는다. ElevenLabs 보이스 ID가 있으면 ELE, 없으면 Gemini다.
 * 팩션별 배정이 비어 있으면 연결된 셀럽 프로필의 언어별 보이스를 따른다.
 * Gemini 모델 선택은 생성 순간의 UI/CLI 옵션이며 제작 데이터가 아니다.
 */
export type FactionVoiceProvider = 'gemini' | 'elevenlabs'

function trimmed(value: string | null | undefined): string | undefined {
  const result = value?.trim()
  return result || undefined
}

export function effectiveElevenLabsVoiceId(
  episodeVoiceId: string | null | undefined,
  profileVoiceId?: string | null,
): string | undefined {
  return trimmed(episodeVoiceId) ?? trimmed(profileVoiceId)
}

export function factionVoiceProvider(
  elevenLabsVoiceId: string | null | undefined,
): FactionVoiceProvider {
  return trimmed(elevenLabsVoiceId) ? 'elevenlabs' : 'gemini'
}
