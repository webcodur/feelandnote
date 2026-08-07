'use client'

/**
 * 인물 상세 → 보이스 추천.
 *
 * 채점 규칙은 세력도감과 공용이다. 여기서는 인물 정보에서 채점에 쓸 말만 긁어 넘긴다.
 * 성별은 목록을 거르는 데 쓰이므로 따로 넘긴다(DB의 gender 는 참=남).
 */

import type { EleVoiceLike } from '@feelandnote/shared/bo/voice-utils'
import type { EleVoiceNote } from '@/lib/ele-voice-notes'
import {
  recommendEleVoices, joinSubjectText, type EleVoiceRecommendation,
} from '@/components/voice/ele-voice-picker'
import type { VoiceGenCeleb } from '@/actions/admin/voice-gen'
import { TONE_LABELS } from '../constants'

export function buildCelebVoiceRecommendations({
  celeb, voices, currentVoiceId, emotions = [], dialogueTexts = [],
  voiceNotes = {}, blockedVoiceIds, limit = 5,
}: {
  celeb: VoiceGenCeleb
  voices: EleVoiceLike[]
  currentVoiceId?: string
  emotions?: string[]
  /** 지금 편집 중인 대사 — 말투를 가늠할 재료다 */
  dialogueTexts?: string[]
  voiceNotes?: Record<string, EleVoiceNote>
  blockedVoiceIds?: Set<string>
  limit?: number
}): EleVoiceRecommendation[] {
  return recommendEleVoices({
    subjectText: joinSubjectText([
      celeb.nickname,
      celeb.title,
      celeb.profession,
      celeb.nationality,
      celeb.speech_tone,
      celeb.speech_tone ? TONE_LABELS[celeb.speech_tone] : null,
      ...emotions,
      ...dialogueTexts,
    ]),
    voices,
    currentVoiceId,
    targetGender: celeb.gender === true ? 'male' : celeb.gender === false ? 'female' : null,
    emotions,
    voiceNotes,
    blockedVoiceIds,
    limit,
  })
}
