export type EleVoiceNoteStatus = 'good' | 'maybe' | 'blocked'

/** 보이스 음량의 허용 범위(dB) — 화면 슬라이더와 같은 폭 */
export const ELE_VOICE_GAIN_MIN = -12
export const ELE_VOICE_GAIN_MAX = 12

export type EleVoiceNote = {
  voiceId: string
  name?: string
  status?: EleVoiceNoteStatus
  note?: string
  /**
   * 이 보이스에 얹는 추가 음량(dB).
   *
   * 음량 특성은 **보이스 자체의 성질**이라 인물마다 다시 맞추지 않고 보이스 한 곳에 적어 둔다.
   * 국문·영문을 가르지 않는다 — 같은 보이스면 어느 언어 자리에 배정되든 같은 값이다.
   *
   * ⚠ 이 값은 **렌더에 직접 닿지 않는다.** 렌더는 대본 파일(faction-data.json)의 인물 음량만 읽고
   *   이 도감의 존재를 모른다. 그래서 보이스를 인물에 배정하는 순간 인물의 빈 음량 칸에 복사하고,
   *   도감 값을 고치면 「인물에 적용」으로 다시 내려보낸다. 내보내기가 도감을 참조해 몰래 끼워 넣는
   *   방식은 쓰지 않는다 — 파일에 없는 값이 생겨 DB↔파일 왕복 검증이 깨진다.
   */
  gainDb?: number
  category?: string | null
  labels?: Record<string, string> | null
  accountLabel?: string | null
  updatedAt: string
}

export type EleVoiceNotesFile = {
  version: 1
  voices: Record<string, EleVoiceNote>
}

export const EMPTY_ELE_VOICE_NOTES: EleVoiceNotesFile = {
  version: 1,
  voices: {},
}

export const ELE_VOICE_STATUS_LABEL: Record<EleVoiceNoteStatus, string> = {
  good: '좋음',
  maybe: '보류',
  blocked: '제외',
}

/** 음량 값 다듬기 — 숫자가 아니거나 0이면 없는 것으로 본다(0dB는 기본값이라 적어 둘 이유가 없다) */
export function cleanVoiceGainDb(v: unknown): number | undefined {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  if (!Number.isFinite(n) || n === 0) return undefined
  const clamped = Math.min(ELE_VOICE_GAIN_MAX, Math.max(ELE_VOICE_GAIN_MIN, n))
  return Math.round(clamped * 10) / 10
}

/** 도감에 적힌 이 보이스의 추가 음량 — 없으면 undefined(0dB로 취급) */
export function voiceGainDbOf(
  notes: Record<string, EleVoiceNote> | undefined, voiceId: string | undefined,
): number | undefined {
  if (!notes || !voiceId) return undefined
  return notes[voiceId]?.gainDb
}

export function cleanEleVoiceNote(input: Omit<Partial<EleVoiceNote>, 'status'> & { voiceId: string; status?: EleVoiceNoteStatus | null }): EleVoiceNote | null {
  const voiceId = input.voiceId.trim()
  if (!voiceId) return null

  const status = input.status === 'good' || input.status === 'maybe' || input.status === 'blocked'
    ? input.status
    : undefined
  const note = typeof input.note === 'string' ? input.note.trim() : undefined
  const name = typeof input.name === 'string' ? input.name.trim() : undefined
  const category = typeof input.category === 'string' ? input.category : input.category === null ? null : undefined
  const accountLabel = typeof input.accountLabel === 'string' ? input.accountLabel.trim() : input.accountLabel === null ? null : undefined
  const labels = input.labels && typeof input.labels === 'object' ? input.labels : undefined
  const gainDb = cleanVoiceGainDb(input.gainDb)

  // 음량만 적힌 보이스도 살아남아야 한다 — 판정·메모 없이 음량만 지정하는 것이 흔한 쓰임이다
  if (!status && !note && !name && !category && !labels && !accountLabel && gainDb === undefined) return null

  return {
    voiceId,
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
    ...(note ? { note } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(labels !== undefined ? { labels } : {}),
    ...(accountLabel !== undefined ? { accountLabel } : {}),
    ...(gainDb !== undefined ? { gainDb } : {}),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  }
}
