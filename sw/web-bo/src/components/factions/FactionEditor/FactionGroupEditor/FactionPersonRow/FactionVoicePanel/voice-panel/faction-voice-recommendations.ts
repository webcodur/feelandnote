'use client'

/**
 * 세력도감 인물 → 보이스 추천.
 *
 * 채점 규칙은 공용(`components/voice/ele-voice-picker/recommend`)이다. 여기서는 인물 데이터에서
 * 채점에 쓸 말을 긁어 넘기기만 한다 — 규칙을 복제하면 한쪽만 고쳐져 곧 갈라진다.
 */

import type { FactionPerson } from '@/lib/faction-types'
import type { EleVoiceNote } from '@/lib/ele-voice-notes'
import type { FactionVoiceHistoryEntry } from '@/lib/faction-voice-casting-history'
import type { EleVoiceLike } from '@feelandnote/shared/bo/voice-utils'
import {
  recommendEleVoices, joinSubjectText, type EleVoiceRecommendation,
} from '@/components/voice/ele-voice-picker'

export type FactionEleVoiceRecommendation = EleVoiceRecommendation

export function buildFactionEleVoiceRecommendations({
  person, voices, currentVoiceId, targetGender, style, emotions = [],
  voiceNotes = {}, voiceHistory = {}, blockedVoiceIds, limit = 5,
}: {
  person: FactionPerson
  voices: EleVoiceLike[]
  currentVoiceId?: string
  targetGender?: 'male' | 'female' | null
  style?: string
  emotions?: string[]
  voiceNotes?: Record<string, EleVoiceNote>
  voiceHistory?: Record<string, FactionVoiceHistoryEntry>
  blockedVoiceIds?: Set<string>
  limit?: number
}): FactionEleVoiceRecommendation[] {
  return recommendEleVoices({
    subjectText: joinSubjectText([
      person.name, person.nameEn, person.role, person.org,
      person.epithet, person.epithetEn, person.quoteSpeaker, person.quoteStyle,
      style,
      ...emotions,
      ...(person.lines ?? []),
      ...(person.linesEn ?? []),
      person.quote, person.quoteOrigin, person.quoteEn,
    ]),
    voices, currentVoiceId, targetGender, emotions,
    voiceNotes, voiceHistory, blockedVoiceIds, limit,
  })
}
