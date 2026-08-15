/**
 * 팩션 음성 제공자 판정의 단일 원천.
 *
 * 제공자는 영속하지 않는다. ElevenLabs 보이스 ID가 있으면 ELE, 없으면 Gemini다.
 * 팩션별 배정이 비어 있으면 연결된 셀럽 프로필의 언어별 보이스를 따른다.
 * Gemini 모델 선택은 생성 순간의 UI/CLI 옵션이며 제작 데이터가 아니다.
 */
export type FactionVoiceProvider = 'gemini' | 'elevenlabs'

/**
 * 세력도감 전체의 시작문구에 고정한 ElevenLabs 배역.
 *
 * `myth-Greek`에서 확정한 전문 성우를 모든 팩션의 시작문구에 공통 적용한다.
 * 편집 데이터가 비거나 다른 값으로 바뀌어도 백오피스 미리듣기와 음원 생성이
 * 같은 성우를 사용한다. 인물 대사·수식어·챕터 음성은 이 고정값의 대상이 아니다.
 */
export const FIXED_FACTION_OPENING_VOICE_ID = 'kqVT88a5QfII1HNAEPTJ'

export type FactionNarrationVoice = {
  quoteElevenlabsVoiceId?: string
}

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

export function fixedFactionOpeningVoiceId(
  episodeName: string | null | undefined,
): string | undefined {
  return episodeName?.trim() ? FIXED_FACTION_OPENING_VOICE_ID : undefined
}

/** 지정 편의 고정 배역을 마지막에 덮어써 편집 데이터보다 우선시한다. */
export function withFixedFactionOpeningVoice<T extends FactionNarrationVoice>(
  episodeName: string | null | undefined,
  voice: T,
): T {
  const voiceId = fixedFactionOpeningVoiceId(episodeName)
  return voiceId ? { ...voice, quoteElevenlabsVoiceId: voiceId } : voice
}
