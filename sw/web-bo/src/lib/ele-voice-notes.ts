export type EleVoiceNoteStatus = 'good' | 'maybe' | 'blocked'

export type EleVoiceNote = {
  voiceId: string
  name?: string
  status?: EleVoiceNoteStatus
  note?: string
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

  if (!status && !note && !name && !category && !labels && !accountLabel) return null

  return {
    voiceId,
    ...(name ? { name } : {}),
    ...(status ? { status } : {}),
    ...(note ? { note } : {}),
    ...(category !== undefined ? { category } : {}),
    ...(labels !== undefined ? { labels } : {}),
    ...(accountLabel !== undefined ? { accountLabel } : {}),
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  }
}
