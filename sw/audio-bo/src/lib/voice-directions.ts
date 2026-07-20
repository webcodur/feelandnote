import type { VoiceDirection } from './types'

export const VOICE_DIRECTIONS = [
  { id: 'calm', label: '차분하게', detail: '속도를 낮추고 쉼을 조금 늘립니다.' },
  { id: 'firm', label: '단호하게', detail: '말의 윤곽과 강약을 분명하게 잡습니다.' },
  { id: 'energetic', label: '힘차게', detail: '조금 빠르고 앞으로 나오는 인상을 줍니다.' },
  { id: 'urgent', label: '긴박하게', detail: '속도를 높이고 문장 사이의 쉼을 줄입니다.' },
  { id: 'relaxed', label: '여유 있게', detail: '속도를 크게 낮추고 쉼을 길게 둡니다.' },
  { id: 'gentle', label: '부드럽게', detail: '날카로운 소리를 줄여 편안하게 정리합니다.' },
  { id: 'clear', label: '또렷하게', detail: '자음이 잘 들리도록 선명도를 높입니다.' },
  { id: 'weighty', label: '무게감 있게', detail: '속도를 낮추고 낮은 울림을 보탭니다.' },
] as const satisfies ReadonlyArray<{ id: VoiceDirection; label: string; detail: string }>

const DIRECTION_IDS = new Set<string>(VOICE_DIRECTIONS.map(({ id }) => id))

export function isVoiceDirection(value: unknown): value is VoiceDirection {
  return typeof value === 'string' && DIRECTION_IDS.has(value)
}

export function voiceDirectionLabels(values: VoiceDirection[] = []) {
  const selected = new Set(values)
  return VOICE_DIRECTIONS.filter(({ id }) => selected.has(id)).map(({ label }) => label)
}
